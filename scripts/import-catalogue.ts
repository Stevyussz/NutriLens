import { readFile, writeFile, rename, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  catalogueSchema,
  parseDelimited,
  type CatalogueProduct,
} from "../src/core/db/catalogue";
import { productSchema, type Product } from "../src/core/db/collections";
import { parseIngredients } from "../src/core/ai/local-parser";
const url =
  "https://world.openfoodfacts.net/cgi/search.pl?action=process&tagtype_0=countries&tag_contains_0=contains&tag_0=indonesia&download=on";
const tags = (s: string | undefined) =>
  (s ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const number = (s: string | undefined) =>
  s && /^\d+(?:\.\d+)?$/.test(s) && Number.isFinite(Number(s))
    ? Number(s)
    : null;
function language(row: Record<string, string>, prefix: string) {
  return (
    row[prefix + "_id"] ||
    row[prefix + "_in"] ||
    row[prefix + "_" + row.lc] ||
    row[prefix + "_en"] ||
    Object.entries(row).find(
      ([k, v]) => k.startsWith(prefix + "_") && v,
    )?.[1] ||
    ""
  );
}
function category(text: string): Product["category"] {
  if (/instant.nood|mie?.?instan|indomie|mi sedaap/.test(text))
    return "MI_INSTAN";
  if (/cereal|rolled.oat|corn.flake|koko.krunch|sarapan/.test(text))
    return "SEREAL_SARAPAN";
  if (/en:(milks|dairies|yogurts|cheeses)|id:(susu|yogurt|keju)/.test(text))
    return "SUSU_OLAHAN";
  if (
    /biscuit|cracker|crisp|wafer|keripik|snack|chocolate|cok[el]*at|candy|confection/.test(
      text,
    )
  )
    return "CAMILAN_BISKUIT";
  if (/milk|dair|susu|yog[hu]*urt|keju|cheese/.test(text)) return "SUSU_OLAHAN";
  if (/beverage|coffee|tea\b|drink|teh\b|kopi|juice|jus\b|minuman/.test(text))
    return "MINUMAN_KEMASAN";
  if (/sauce|condiment|spice|bumbu|saus|kecap|seasoning|paste/.test(text))
    return "BUMBU_SAUS";
  if (/bread|bakery|cake|roti|kue/.test(text)) return "ROTI_KUE";
  if (/meat|fish|seafood|daging|ikan|ayam|chicken|sausage/.test(text))
    return "DAGING_IKAN";
  if (/rice|flour|grain|sugar|oil|beras|tepung|minyak|gula/.test(text))
    return "BAHAN_POKOK";
  if (/meal|prepared.food|frozen.food|pizza|siap.saji/.test(text))
    return "MAKANAN_SIAP_SAJI";
  return "LAINNYA";
}
function normalize(
  row: Record<string, string>,
  retrievedAt: string,
): CatalogueProduct | null {
  const name = language(row, "product_name").trim();
  if (!name || row.obsolete === "1" || !/^\d{6,24}$/.test(row.code ?? ""))
    return null;
  const servingMatches = [
    ...(row.serving_size ?? "").matchAll(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/gi),
  ];
  const explicitServing =
    servingMatches.length === 1
      ? {
          value: Number(servingMatches[0][1].replace(",", ".")),
          unit: servingMatches[0][2].toLowerCase(),
        }
      : null;
  const servingPrefix = "nutrition.input_sets.packaging.as_sold.serving.";
  const tableServing = number(row[servingPrefix + "per_quantity"]);
  const tableUnit = row[servingPrefix + "per_unit"];
  const serving =
    explicitServing ??
    (tableServing && ["g", "ml"].includes(tableUnit)
      ? { value: tableServing, unit: tableUnit }
      : null);
  const fields = {
    caloriesKcal: "energy-kcal",
    sugarGrams: "sugars",
    proteinGrams: "proteins",
    sodiumMg: "sodium",
    saturatedFatGrams: "saturated-fat",
    fiberGrams: "fiber",
  };
  const choices = [
    { name: "serving", basis: "PER_SERVING" },
    {
      name: serving?.unit === "ml" ? "100ml" : "100g",
      basis: serving?.unit === "ml" ? "PER_100_ML" : "PER_100_G",
    },
  ] as const;
  const options = choices
    .map((choice) => {
      const pre = `nutrition.input_sets.packaging.as_sold.${choice.name}.nutrients.`;
      const factor =
        choice.name === "serving" ? 1 : serving ? serving.value / 100 : null;
      const nutrition = Object.fromEntries(
        Object.entries(fields).map(([key, providerKey]) => {
          let value = number(row[pre + providerKey + ".value"]);
          const unit = row[pre + providerKey + ".unit"];
          if (value === null || factor === null || !unit) return [key, null];
          if (key === "caloriesKcal") {
            if (!["kcal", "kkal"].includes(unit)) return [key, null];
          } else if (unit === "mg") value *= key === "sodiumMg" ? 1 : 0.001;
          else if (unit === "g") value *= key === "sodiumMg" ? 1000 : 1;
          else return [key, null];
          value = Math.round(value * factor * 1e6) / 1e6;
          return [key, value];
        }),
      );
      return {
        ...choice,
        nutrition,
        known: Object.values(nutrition).filter((v) => v !== null).length,
      };
    })
    .sort((a, b) => b.known - a.known);
  const best = options[0];
  const ingredientsText = language(row, "ingredients_text");
  const cat = category(`${row.categories_tags} ${name}`.toLowerCase());
  const missingFields = [
    ...(cat === "LAINNYA" ? ["category"] : []),
    ...(!serving ? ["servingSizeGrams"] : []),
    ...(!ingredientsText ? ["ingredientsText"] : []),
    ...Object.entries(best.nutrition)
      .filter(([, v]) => v === null)
      .map(([k]) => k),
  ];
  const result = catalogueSchema.safeParse({
    providerCode: row.code,
    name: name.slice(0, 250),
    brand: (row.brands ?? "").slice(0, 150),
    category: cat,
    servingSizeGrams: serving?.value ?? null,
    servingUnit: serving?.unit ?? null,
    ingredientsText,
    nutrition: best.nutrition,
    nutritionBasis: best.known ? best.basis : "UNKNOWN",
    countries: tags(row.countries_tags),
    origins: tags(row.origins_tags),
    manufacturingPlaces: tags(row.manufacturing_places_tags),
    allergens: tags(row.allergens_tags),
    labels: tags(row.labels_tags),
    additives: tags(row.additives_tags),
    missingFields,
    referenceEligible: !missingFields.length && cat !== "LAINNYA",
    sourceUrl: `https://world.openfoodfacts.org/product/${row.code}`,
    retrievedAt,
  });
  return result.success ? result.data : null;
}
async function main() {
  const retrievedAt = process.argv[2]
    ? (await stat(process.argv[2])).mtime.toISOString()
    : new Date().toISOString();
  let text: string;
  if (process.argv[2]) text = await readFile(process.argv[2], "utf8");
  else {
    const r = await fetch(url, {
      headers: { "User-Agent": "BongkarLabel/1.0 bulk country export" },
      signal: AbortSignal.timeout(90000),
    });
    if (!r.ok) throw Error(`Provider HTTP ${r.status}`);
    text = await r.text();
  }
  const raw = parseDelimited(text);
  if (raw.length < 100)
    throw Error(
      "Country export unexpectedly small; retaining previous snapshots",
    );
  const entries = [
    ...new Map(
      raw
        .map((row) => normalize(row, retrievedAt))
        .filter((row): row is CatalogueProduct => row !== null)
        .map((row) => [row.providerCode, row]),
    ).values(),
  ];
  const existing = JSON.parse(
    await readFile("data/products.snapshot.json", "utf8"),
  ) as Product[];
  const references = new Map(existing.map((p) => [p.barcode, p]));
  let freshReferences = 0;
  for (const row of entries.filter((p) => p.referenceEligible)) {
    try {
      const ingredients = parseIngredients(row.ingredientsText);
      const product = productSchema.parse({
        barcode: row.providerCode,
        name: row.name,
        brand: row.brand,
        category: row.category,
        priceIdr:
          row.category === "MI_INSTAN"
            ? 4000
            : row.category === "SEREAL_SARAPAN"
              ? 10000
              : 6000,
        servingSizeGrams: row.servingSizeGrams,
        flavorTags: [
          ...new Set([
            ...(row.name.toLowerCase().match(/cokelat|chocolate|cocoa/)
              ? ["cokelat"]
              : []),
            ...(row.name.toLowerCase().match(/milk|susu|creamy/)
              ? ["susu", "creamy"]
              : []),
            ...(row.name.toLowerCase().match(/coffee|kopi/) ? ["kopi"] : []),
            ...(row.category === "MI_INSTAN" ? ["mi", "gurih"] : []),
            ...(row.category === "SEREAL_SARAPAN" ? ["sereal"] : []),
            ...(row.name.toLowerCase().match(/cheese|keju/) ? ["keju"] : []),
            ...(row.name.toLowerCase().match(/tea|teh/) ? ["teh"] : []),
            ...(row.nutrition.sugarGrams !== null &&
            row.nutrition.sugarGrams > 5
              ? ["manis"]
              : []),
          ]),
        ],
        nutrition: row.nutrition,
        novaGroup: 1,
        marketingClaims: [],
        orderedIngredients: ingredients,
        source: {
          kind: "OPEN_FOOD_FACTS",
          url: row.sourceUrl,
          retrievedAt,
          note: "Ekspor TSV massal pasar Indonesia dari Open Food Facts. Kolom packaging/as_sold saja; bukan estimasi nutrien. Kontribusi komunitas belum diverifikasi produsen. Harga per sajian tetap asumsi berlabel ESTIMATE. ODbL/Database Contents License.",
        },
        priceSource: "ESTIMATE",
        priceSourceUrl: null,
      });
      references.set(row.providerCode, product);
      freshReferences++;
    } catch {
      row.referenceEligible = false;
      row.missingFields.push("validAnalysisContract");
    }
  }
  if (!entries.length || !freshReferences)
    throw Error("No valid catalogue/reference records; snapshots retained");
  const manifest = {
    provider: "Open Food Facts",
    sourceUrl: url,
    retrievedAt,
    sha256: createHash("sha256").update(text).digest("hex"),
    exportRows: raw.length,
    catalogueRecords: entries.length,
    completeFreshReferences: freshReferences,
    totalReferences: references.size,
    retainedEarlierReferences: [...references.values()].filter(
      (p) => p.source.retrievedAt !== retrievedAt,
    ).length,
    excludedNamelessObsoleteOrInvalid: raw.length - entries.length,
    notes:
      "All named valid exported records retained, including incomplete labels. Missing nutrients remain null. Only complete supported-category labels enter reference analysis. Earlier source-attributed references retain their original dates; no silent field merging across label versions.",
  };
  for (const [path, data] of [
    ["data/catalogue.snapshot.json", entries],
    ["data/catalogue.manifest.json", manifest],
    ["data/products.snapshot.json", [...references.values()]],
  ] as const) {
    await writeFile(path + ".tmp", JSON.stringify(data, null, 2) + "\n");
  }
  for (const path of [
    "data/catalogue.snapshot.json",
    "data/catalogue.manifest.json",
    "data/products.snapshot.json",
  ])
    await rename(path + ".tmp", path);
  console.log(JSON.stringify(manifest));
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Import failed");
  process.exitCode = 1;
});
