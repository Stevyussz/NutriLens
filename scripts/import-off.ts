import { writeFile, readFile } from "node:fs/promises";
import { z } from "zod";
import { productSchema, type Product } from "../src/core/db/collections";
import { parseIngredients } from "../src/core/ai/local-parser";
const offSchema = z.object({
  products: z.array(
    z
      .object({
        code: z.string(),
        product_name: z.string().optional(),
        brands: z.string().optional(),
        categories_tags: z.array(z.string()).optional(),
        ingredients_text: z.string().optional(),
        serving_quantity: z.coerce.number().optional(),
        nutriments: z.record(z.unknown()).optional(),
      })
      .passthrough(),
  ),
});
/** Imports only records with all six numerical nutrients and a declared serving.
 * Missing fields are rejected, never filled with invented zeroes. O(p*i) product/ingredient parsing.
 */
async function main() {
  const products: Product[] = [];
  for (let page = 1; page <= 6; page++) {
    const file = process.argv[2] ? `${process.argv[2]}/off-${page}.json` : null;
    const raw: unknown = file
      ? JSON.parse(await readFile(file, "utf8"))
      : await (
          await fetch(
            `https://world.openfoodfacts.net/api/v2/search?countries_tags=en:indonesia&page_size=100&page=${page}&fields=code,product_name,brands,categories_tags,ingredients_text,nutriments,serving_quantity`,
            {
              headers: {
                "User-Agent": "BongkarLabel/1.0 (educational label analysis)",
              },
              signal: AbortSignal.timeout(30000),
            },
          )
        ).json();
    for (const item of offSchema.parse(raw).products) {
      if (
        !item.product_name ||
        !item.ingredients_text ||
        !item.serving_quantity ||
        !item.nutriments
      )
        continue;
      const tag =
        `${item.categories_tags?.join(" ")} ${item.product_name}`.toLowerCase();
      const category = /instant-noodle|indomie|mi sedaap|mie instan/.test(tag)
        ? "MI_INSTAN"
        : /breakfast-cereal|rolled-oat|froot loops|corn flakes|koko krunch/.test(
              tag,
            )
          ? "SEREAL_SARAPAN"
          : /milk|dairies|susu|yogurt/.test(tag)
            ? "SUSU_OLAHAN"
            : /biscuits|crackers|crisps|wafers|biscuit|keripik/.test(tag)
              ? "CAMILAN_BISKUIT"
              : /beverages|coffee|tea|drink|teh |kopi/.test(tag)
                ? "MINUMAN_KEMASAN"
                : null;
      if (!category) continue;
      const nutrient = (name: string) => {
        const value = item.nutriments?.[`${name}_100g`];
        return typeof value === "number" && Number.isFinite(value) && value >= 0
          ? (value * (item.serving_quantity ?? 0)) / 100
          : null;
      };
      const caloriesKcal = nutrient("energy-kcal"),
        sugarGrams = nutrient("sugars"),
        proteinGrams = nutrient("proteins"),
        sodiumGrams = nutrient("sodium"),
        saturatedFatGrams = nutrient("saturated-fat"),
        fiberGrams = nutrient("fiber");
      if (
        caloriesKcal === null ||
        sugarGrams === null ||
        proteinGrams === null ||
        sodiumGrams === null ||
        saturatedFatGrams === null ||
        fiberGrams === null
      )
        continue;
      const flavorTags = [
        ...new Set([
          ...(tag.match(/cokelat|chocolate|cocoa/) ? ["cokelat"] : []),
          ...(tag.match(/milk|susu|creamy/) ? ["creamy", "susu"] : []),
          ...(tag.match(/coffee|kopi/) ? ["kopi"] : []),
          ...(tag.match(/tea|teh/) ? ["teh"] : []),
          ...(tag.match(/noodle|indomie|mi /) ? ["mi", "gurih"] : []),
          ...(tag.match(/crisps|keripik|potato/) ? ["kentang", "gurih"] : []),
          ...(tag.match(/cereal|oat|gandum/) ? ["sereal"] : []),
          ...(tag.match(/cheese|keju/) ? ["keju"] : []),
          ...(tag.match(/strawberry|stroberi/) ? ["stroberi"] : []),
          ...(sugarGrams > 5 ? ["manis"] : []),
        ]),
      ];
      try {
        products.push(
          productSchema.parse({
            barcode: item.code,
            name: item.product_name,
            brand: item.brands ?? "",
            category,
            priceIdr:
              category === "MI_INSTAN"
                ? 4000
                : category === "SEREAL_SARAPAN"
                  ? 10000
                  : 6000,
            servingSizeGrams: item.serving_quantity,
            flavorTags,
            nutrition: {
              caloriesKcal,
              sugarGrams,
              proteinGrams,
              sodiumMg: sodiumGrams * 1000,
              saturatedFatGrams,
              fiberGrams,
            },
            novaGroup: 1,
            marketingClaims: [],
            orderedIngredients: parseIngredients(item.ingredients_text),
            source: {
              kind: "OPEN_FOOD_FACTS",
              url: `https://world.openfoodfacts.org/product/${item.code}`,
              retrievedAt: new Date().toISOString(),
              note: "Ekspor Open Food Facts melalui mirror .net. Kontribusi komunitas belum diverifikasi produsen; gizi dikonversi dari per 100 g/ml ke sajian deklarasi. Harga adalah asumsi simulasi anggaran per sajian, bukan harga toko/kemasan. Lisensi ODbL, Database Contents License.",
            },
            priceSource: "ESTIMATE",
            priceSourceUrl: null,
          }),
        );
      } catch {
        console.warn("Rejected invalid label:", item.code);
      }
    }
  }
  const unique = [...new Map(products.map((p) => [p.barcode, p])).values()];
  await writeFile(
    "data/products.snapshot.json",
    JSON.stringify(unique, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      imported: unique.length,
      categories: Object.fromEntries(
        [...new Set(unique.map((p) => p.category))].map((c) => [
          c,
          unique.filter((p) => p.category === c).length,
        ]),
      ),
    }),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
