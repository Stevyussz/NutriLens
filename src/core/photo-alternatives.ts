import type { Db, ObjectId } from "mongodb";
import { catalogueSchema, type CatalogueProduct } from "./db/catalogue";
import type { HealthProfile } from "./db/collections";
import { photoReviewSchema, type PhotoReview } from "./ai/vision-contract";
import { photoDecision } from "./photo-decision";
import {
  photoAlternativesSchema,
  type PhotoAlternative,
  type PhotoAlternatives,
} from "./photo-alternatives-schema";
import { allergyConflict } from "./food-allergy-match";
import { reconcilePhotoReading } from "./ai/vision-policy";
import { candidateMatch } from "./product-research";
import { decimal } from "./utils";
import { enforceRequestLimit } from "./security/shared-rate-limiter";
const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const families = [
  ["coffee", /kopi|coffee|latte|cappuccino|espresso|macchiato/i, "coffees"],
  ["tea", /\bteh\b|\btea\b/i, "iced-teas"],
  ["yogurt", /yog[hu]*urt/i, "yogurts"],
  ["milk", /\bsusu\b|\bmilk\b/i, "milks"],
  ["juice", /\bjus\b|juice|nectar/i, "fruit-juices"],
  ["soda", /soda|cola|carbonat|bersoda/i, "sodas"],
  ["cereal", /oat|sereal|cereal|corn.?flake/i, "breakfast-cereals"],
  ["noodles", /\bmi\b|\bmie\b|noodle|indomie|sedaap/i, "instant-noodles"],
  ["biscuits", /biskuit|biscuit|cracker|wafer/i, "biscuits"],
  ["bread", /\broti\b|bread/i, "breads"],
] as const;
export function productFamily(name: string, unit: "g" | "ml") {
  if (
    /\b(?:beer|bir|wine|vodka|whiske?y|alkohol|alcohol|infant|formula|bayi)\b/i.test(
      name,
    )
  )
    return null;
  if (
    unit === "ml" &&
    /ice.?cream|es.?krim|monaka|waffle|biscuit|biskuit|wafer|permen|candy/i.test(
      name,
    )
  )
    return null;
  if (
    unit === "ml" &&
    /bubuk|powder|sachet|saset|konsentrat|concentrat|seduh|3\s*(?:in|dalam)\s*1/i.test(
      name,
    )
  )
    return null;
  const f = families.find(([, re]) => re.test(name));
  if (f && ["coffee", "tea", "milk"].includes(f[0]) && unit === "g") {
    if (!/bubuk|powder|sachet|saset|instan|tea.?bag|celup/i.test(name))
      return null;
    return {
      id: f[0] + "-dry",
      pattern: f[1],
      tag:
        f[0] === "coffee"
          ? "instant-coffees"
          : f[0] === "milk"
            ? "milk-powders"
            : "teas",
    };
  }
  return f ? { id: f[0], pattern: f[1], tag: f[2] } : null;
}
export function photoComparison(review: PhotoReview) {
  const unit = review.evidence.servingText
    ?.match(/\d[\d.,]*\s*(ml|gram|g)\b/i)?.[1]
    ?.toLowerCase();
  if (!unit || review.servingSizeGrams === null || review.servingSizeGrams <= 0)
    return null;
  return {
    unit: (unit === "ml" ? "ml" : "g") as "ml" | "g",
    size: review.servingSizeGrams * (review.servingsPerContainer ?? 1),
  };
}
function catalogueUnit(p: CatalogueProduct) {
  return p.nutritionBasis === "PER_100_ML"
    ? "ml"
    : p.nutritionBasis === "PER_100_G"
      ? "g"
      : p.servingUnit;
}
export function rankAlternatives(
  review: PhotoReview,
  health: HealthProfile,
  rows: CatalogueProduct[],
  now = new Date().toISOString(),
): PhotoAlternatives {
  const comparison = photoComparison(review);
  const d = photoDecision(review, health);
  const family = comparison
    ? productFamily(review.name, comparison.unit)
    : null;
  const lessons = [
    {
      title: "Samakan ukurannya dulu",
      text: comparison
        ? `Bandingkan pada ${decimal(comparison.size)} ${comparison.unit}. Botol kecil dan sajian kecil bisa terlihat lebih rendah gula hanya karena porsinya berbeda.`
        : "Cek takaran saji dan jumlah sajian. Angka per sajian belum tentu sama dengan isi satu kemasan.",
    },
    {
      title: "Lebih rendah gula belum berarti lebih baik dalam semua hal",
      text: "Periksa juga natrium, lemak jenuh, protein, dan bahan yang perlu kamu hindari. Angka yang belum tersedia bukan nol.",
    },
    {
      title: "Baca angka, bukan hanya klaim depan",
      text: "Less sugar membandingkan dengan produk acuan tertentu. Gula, madu, dan sirup dalam komposisi sudah termasuk gula total pada tabel; jangan dijumlahkan lagi.",
    },
  ];
  const base = {
    checkedAt: now,
    comparison,
    candidates: [] as PhotoAlternative[],
    warnings: [] as string[],
    lessons,
  };
  if (
    d.needsVision ||
    review.nutrition.sugarGrams === null ||
    !comparison ||
    !family
  )
    return photoAlternativesSchema.parse({
      ...base,
      status: "NEED_LABEL",
      title: "Dasar pembandingnya belum cukup.",
      action:
        "Tambahkan foto nama produk dan takaran saji. Angka gula serta satuan harus jelas agar produk lain dapat dibandingkan dengan adil.",
    });
  if (allergyConflict(review.ingredientsText, health.allergies))
    return photoAlternativesSchema.parse({
      ...base,
      status: "ALLERGY_ALERT",
      title: "Utamakan bahan pemicu alergimu.",
      action:
        "Ada kecocokan bahan dengan alergi di profil. Hindari jika itu pemicumu, lalu periksa label dan peringatan alergennya; gula rendah tidak menghapus risiko tersebut.",
    });
  const original =
    (review.nutrition.sugarGrams * comparison.size) / review.servingSizeGrams!;
  const originalPer100 =
    (review.nutrition.sugarGrams * 100) / review.servingSizeGrams!;
  const unique = new Map<string, PhotoAlternative>();
  const conflicts = new Set<string>();
  for (const raw of rows) {
    const parsed = catalogueSchema.safeParse(raw);
    if (!parsed.success) continue;
    const p = parsed.data;
    if (new URL(p.sourceUrl).pathname.split("/")[2] !== p.providerCode)
      continue;
    if (conflicts.has(p.providerCode)) continue;
    if (
      !p.countries.some((c) => /^(?:en:)?indonesia$/i.test(c)) ||
      catalogueUnit(p) !== comparison.unit ||
      productFamily(p.name, comparison.unit)?.id !== family.id
    )
      continue;
    if (
      !p.name.trim() ||
      !p.brand.trim() ||
      !/^https:\/\/world\.openfoodfacts\.org\/product\/\d{6,24}(?:\/|$)/.test(
        p.sourceUrl,
      )
    )
      continue;
    if (candidateMatch(review, p.name, p.brand) === "NAME_VARIANT") continue;
    if (
      fold(p.name.replace(/\s+/g, " ")) ===
        fold(review.name.replace(/\s+/g, " ")) &&
      fold(p.brand) === fold(review.brand)
    )
      continue;
    const age = Date.parse(now) - Date.parse(p.retrievedAt);
    if (age < 0 || age > 365 * 86400000) continue;
    if (
      health.allergies.length &&
      (!p.ingredientsText.trim() ||
        allergyConflict(
          p.ingredientsText + " " + p.allergens.join(" "),
          health.allergies,
        ))
    )
      continue;
    const divisor =
      p.nutritionBasis === "PER_SERVING"
        ? p.servingSizeGrams
        : p.nutritionBasis === "UNKNOWN"
          ? null
          : 100;
    if (!divisor || p.nutrition.sugarGrams === null) continue;
    const per100 = (p.nutrition.sugarGrams * 100) / divisor;
    if (per100 < 0 || per100 > 100 || originalPer100 - per100 < 0.1) continue;
    const amount = (key: keyof typeof p.nutrition) =>
      p.nutrition[key] === null
        ? null
        : Math.round(((p.nutrition[key]! * comparison.size) / divisor) * 100) /
          100;
    const sugar = amount("sugarGrams")!;
    if (
      ["proteinGrams", "saturatedFatGrams", "fiberGrams"].some((k) => {
        const v = amount(k as keyof typeof p.nutrition);
        return v !== null && (v * 100) / comparison.size > 100;
      }) ||
      (amount("sodiumMg") !== null &&
        (amount("sodiumMg")! * 100) / comparison.size > 100000)
    )
      continue;
    const previous = unique.get(p.providerCode);
    if (
      previous &&
      Math.abs(previous.sugarGrams - sugar) > comparison.size * 0.001
    ) {
      conflicts.add(p.providerCode);
      unique.delete(p.providerCode);
      continue;
    }

    const tradeoffs: string[] = [];
    for (const [key, label] of [
      ["sodiumMg", "natrium"],
      ["saturatedFatGrams", "lemak jenuh"],
      ["proteinGrams", "protein"],
    ] as const) {
      const v = amount(key),
        ref =
          review.nutrition[key] === null
            ? null
            : (review.nutrition[key]! * comparison.size) /
              review.servingSizeGrams!;
      if (v === null || ref === null)
        tradeoffs.push(
          `${label[0].toUpperCase() + label.slice(1)} belum cukup lengkap untuk dibandingkan.`,
        );
      else if (
        (key === "proteinGrams" && v < ref) ||
        (key !== "proteinGrams" && v > ref)
      )
        tradeoffs.push(
          `${label[0].toUpperCase() + label.slice(1)} ${key === "proteinGrams" ? "lebih rendah" : "lebih tinggi"}: ${decimal(v)} ${key === "sodiumMg" ? "mg" : "g"} dibanding ${decimal(ref)} ${key === "sodiumMg" ? "mg" : "g"} pada ukuran yang sama.`,
        );
    }
    if (!p.ingredientsText.trim())
      tradeoffs.push(
        "Komposisi belum tersedia; pemanis dan alergen perlu diperiksa langsung.",
      );
    else
      tradeoffs.push(
        "Cocokkan lagi komposisi dan peringatan alergen pada kemasan; formula bisa berubah.",
      );
    const packageName = [...p.name.matchAll(/(\d+(?:[.,]\d+)?)\s*(ml|g)\b/gi)];
    const packageFromName =
      packageName.length === 1 &&
      !/\d\s*[x×]\s*\d/i.test(p.name) &&
      !/\b(?:per|sajian|isi|dus|karton|multipack|bundle|x)\b/i.test(p.name)
        ? {
            amount: Number(packageName[0][1].replace(",", ".")),
            unit: packageName[0][2].toLowerCase() as "g" | "ml",
          }
        : null;
    const recordedPack =
      p.packageQuantity && p.packageUnit
        ? { amount: p.packageQuantity, unit: p.packageUnit }
        : null;
    const partialPack = Boolean(p.packageQuantity) !== Boolean(p.packageUnit);
    const conflictingPack =
      recordedPack &&
      packageFromName &&
      (recordedPack.amount !== packageFromName.amount ||
        recordedPack.unit !== packageFromName.unit);
    const pack =
      partialPack || conflictingPack ? null : (recordedPack ?? packageFromName);
    unique.set(p.providerCode, {
      id: p.providerCode,
      barcode: p.providerCode,
      name: p.name,
      brand: p.brand,
      family: family.id,
      unit: comparison.unit,
      comparisonSize: comparison.size,
      sugarGrams: sugar,
      originalSugarGrams: original,
      reductionPercent: Math.min(
        100,
        Math.round(((originalPer100 - per100) / originalPer100) * 1000) / 10,
      ),
      sodiumMg: amount("sodiumMg"),
      saturatedFatGrams: amount("saturatedFatGrams"),
      proteinGrams: amount("proteinGrams"),
      reasons: [
        `${decimal(sugar)} g gula dibanding ${decimal(original)} g pada ${decimal(comparison.size)} ${comparison.unit} yang sama.`,
      ],
      tradeoffs: tradeoffs.slice(0, 6),
      sourceKind: "CATALOGUE",
      sourceUrl: p.sourceUrl,
      sourceDate: p.retrievedAt,
      packageQuantity: pack?.amount ?? null,
      packageUnit: pack?.unit ?? null,
    });
  }
  // Lower sugar is the goal; material nutrient trade-offs stay visible, never hidden in a score.
  const candidates = [...unique.values()]
    .sort(
      (a, b) =>
        a.tradeoffs.filter((t) => /lebih tinggi|lebih rendah/.test(t)).length -
          b.tradeoffs.filter((t) => /lebih tinggi|lebih rendah/.test(t))
            .length ||
        a.sugarGrams - b.sugarGrams ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 3);
  return photoAlternativesSchema.parse({
    ...base,
    candidates,
    warnings: conflicts.size
      ? [
          "Ada versi katalog dengan angka gula berbeda; produk tersebut dikeluarkan dari rekomendasi.",
        ]
      : [],
    status: candidates.length ? "FOUND" : "NO_MATCH",
    title: candidates.length
      ? "Ada pilihan sejenis dengan gula lebih sedikit."
      : "Belum ada pengganti yang cukup terbukti.",
    action: candidates.length
      ? `${candidates[0].brand} ${candidates[0].name} bisa kamu bandingkan untuk mengurangi gula. Lihat juga kekurangannya sebelum membeli.`
      : `Kalau tetap memilih ini, tentukan porsi yang benar-benar diminum atau dimakan. Scan label produk sejenis untuk membandingkan; tidak ada merek yang diada-adakan.`,
  });
}
const failedSources = new Map<string, number>();
const liveCache = new Map<
  string,
  { until: number; rows: CatalogueProduct[] }
>();
const pending = new Map<string, Promise<CatalogueProduct[]>>();
export function liveCatalogueProduct(
  raw: unknown,
  now: string,
): CatalogueProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, any>;
  if (
    typeof p.code !== "string" ||
    typeof p.product_name !== "string" ||
    p.obsolete === 1 ||
    p.obsolete === true
  )
    return null;
  const serving =
    typeof p.serving_size === "string"
      ? p.serving_size.match(/^(\d+(?:[.,]\d+)?)\s*(ml|g)\b/i)
      : null;
  const quantity =
    typeof p.product_quantity === "number" && p.product_quantity > 0
      ? p.product_quantity
      : null;
  const unit = ["g", "ml"].includes(p.product_quantity_unit)
    ? p.product_quantity_unit
    : (serving?.[2].toLowerCase() ?? null);
  if (
    serving &&
    p.product_quantity_unit &&
    p.product_quantity_unit !== serving[2].toLowerCase()
  )
    return null;
  const n = p.nutriments ?? {};
  const servingSize = serving ? Number(serving[1].replace(",", ".")) : null;
  const useServing =
    servingSize !== null && typeof n.sugars_serving === "number";
  const names = {
    caloriesKcal: "energy-kcal",
    sugarGrams: "sugars",
    sodiumMg: "sodium",
    saturatedFatGrams: "saturated-fat",
    proteinGrams: "proteins",
    fiberGrams: "fiber",
  };
  const nutrition = Object.fromEntries(
    Object.entries(names).map(([key, name]) => {
      const v = n[name + (useServing ? "_serving" : "_100g")];
      return [
        key,
        typeof v === "number" && Number.isFinite(v)
          ? v * (key === "sodiumMg" ? 1000 : 1)
          : null,
      ];
    }),
  );
  const date =
    typeof p.last_modified_t === "number"
      ? new Date(p.last_modified_t * 1000)
      : null;
  const parsed = catalogueSchema.safeParse({
    providerCode: p.code,
    name: p.product_name,
    brand: typeof p.brands === "string" ? p.brands : "",
    category: "LAINNYA",
    servingSizeGrams: servingSize,
    servingUnit: unit,
    nutrition,
    nutritionBasis: useServing
      ? "PER_SERVING"
      : unit === "ml"
        ? "PER_100_ML"
        : unit === "g"
          ? "PER_100_G"
          : "UNKNOWN",
    ingredientsText:
      typeof p.ingredients_text === "string" ? p.ingredients_text : "",
    countries: Array.isArray(p.countries_tags) ? p.countries_tags : [],
    allergens: Array.isArray(p.allergens_tags) ? p.allergens_tags : [],
    origins: [],
    manufacturingPlaces: [],
    labels: [],
    additives: [],
    missingFields: [],
    referenceEligible: false,
    sourceUrl: `https://world.openfoodfacts.org/product/${p.code}`,
    retrievedAt:
      date && Number.isFinite(date.getTime()) ? date.toISOString() : now,
    normalizationVersion: 2,
    packageQuantity: quantity,
    packageUnit:
      quantity && ["g", "ml"].includes(p.product_quantity_unit)
        ? p.product_quantity_unit
        : null,
  });
  return parsed.success ? parsed.data : null;
}
async function discover(tag: string): Promise<CatalogueProduct[]> {
  if ((failedSources.get(tag) ?? 0) > Date.now())
    throw Error("Catalogue temporarily unavailable");
  const hit = liveCache.get(tag);
  if (hit && hit.until > Date.now()) return hit.rows;
  if (pending.has(tag)) return pending.get(tag)!;
  const task = (async () => {
    await enforceRequestLimit("alternatives-off-global", 6);
    const url = new URL("https://world.openfoodfacts.org/api/v2/search");
    url.search = new URLSearchParams({
      countries_tags_en: "indonesia",
      categories_tags_en: tag,
      page_size: "60",
      fields:
        "code,product_name,brands,serving_size,product_quantity,product_quantity_unit,nutrition_data_per,nutriments,ingredients_text,allergens_tags,countries_tags,last_modified_t,obsolete",
    }).toString();
    const r = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(7000),
      headers: {
        "User-Agent":
          "BongkarLabel/1.0 (https://github.com/Stevyussz/NutriLens)",
        Accept: "application/json",
      },
    });
    if (!r.ok) throw Error("Catalogue unavailable");
    const reader = r.body?.getReader();
    if (!reader) throw Error("Empty catalogue");
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const v = await reader.read();
      if (v.done) break;
      bytes += v.value.length;
      if (bytes > 1500000) {
        await reader.cancel();
        throw Error("Catalogue too large");
      }
      chunks.push(v.value);
    }
    const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!Array.isArray(json.products)) throw Error("Invalid catalogue");
    const rows = json.products.slice(0, 60).flatMap((p: unknown) => {
      const v = liveCatalogueProduct(p, new Date().toISOString());
      return v ? [v] : [];
    });
    if (liveCache.size >= 20) liveCache.delete(liveCache.keys().next().value!);
    liveCache.set(tag, { until: Date.now() + 900000, rows });
    return rows;
  })();
  pending.set(tag, task);
  try {
    return await task;
  } catch (error) {
    failedSources.set(tag, Date.now() + 30000);
    throw error;
  } finally {
    pending.delete(tag);
  }
}
export async function findPhotoAlternatives(
  db: Db,
  review: PhotoReview,
  health: HealthProfile,
  userId?: ObjectId,
): Promise<PhotoAlternatives> {
  const comp = photoComparison(review);
  const family = comp ? productFamily(review.name, comp.unit) : null;
  if (
    !family ||
    photoDecision(review, health).needsVision ||
    review.nutrition.sugarGrams === null ||
    allergyConflict(review.ingredientsText, health.allergies)
  )
    return rankAlternatives(review, health, []);
  const [local, live] = await Promise.allSettled([
    db
      .collection("product_catalogue")
      .find({ name: family.pattern }, { projection: { _id: 0 } })
      .limit(1500)
      .toArray(),
    discover(family.tag),
  ]);
  const rows: CatalogueProduct[] = [];
  if (local.status === "fulfilled")
    for (const p of local.value) {
      const v = catalogueSchema.safeParse(p);
      if (v.success) rows.push(v.data);
    }
  if (live.status === "fulfilled") rows.push(...live.value);
  const result = rankAlternatives(review, health, rows);
  if (userId && !["NEED_LABEL", "ALLERGY_ALERT"].includes(result.status)) {
    const history = await db
      .collection("scan_history")
      .find(
        { userId, photoResult: { $exists: true } },
        { projection: { _id: 1, photoResult: 1, createdAt: 1 } },
      )
      .sort({ createdAt: -1 })
      .limit(40)
      .toArray();
    const fromPhotos = history.flatMap((row) => {
      const parsed = photoReviewSchema.safeParse(row.photoResult);
      if (!parsed.success) return [];
      const date =
        row.createdAt instanceof Date ? row.createdAt.toISOString() : "";
      const value = scannedAlternative(
        review,
        reconcilePhotoReading(parsed.data),
        health,
        row._id.toString(),
        date,
      );
      return value ? [value] : [];
    });
    const merged = [...fromPhotos, ...result.candidates];
    const distinct = new Map<string, PhotoAlternative>();
    for (const p of merged) {
      const key = fold(p.brand + " " + p.name);
      if (!distinct.has(key)) distinct.set(key, p);
    }
    result.candidates = [...distinct.values()]
      .sort(
        (a, b) =>
          a.tradeoffs.filter((t) => /lebih tinggi|lebih rendah/.test(t))
            .length -
            b.tradeoffs.filter((t) => /lebih tinggi|lebih rendah/.test(t))
              .length || a.sugarGrams - b.sugarGrams,
      )
      .slice(0, 3);
    if (result.candidates.length) {
      result.status = "FOUND";
      result.title = "Ada pilihan sejenis dengan gula lebih sedikit.";
      result.action = `${result.candidates[0].brand} ${result.candidates[0].name} bisa kamu bandingkan untuk mengurangi gula. Lihat juga kekurangannya sebelum membeli.`;
    }
  }
  const liveCodes = new Set(
    live.status === "fulfilled" ? live.value.map((p) => p.providerCode) : [],
  );
  for (const p of result.candidates)
    if (liveCodes.has(p.id)) p.sourceKind = "LIVE_CATALOGUE";
  if (live.status === "rejected")
    result.warnings.push(
      "Katalog internet belum tersedia. Pembanding yang tampil memakai data tersimpan yang memenuhi syarat; periksa sumber dan tanggalnya.",
    );
  result.warnings.push(
    "Data katalog komunitas bukan verifikasi formula atau stok di toko. Cocokkan lagi label produk yang akan dibeli.",
  );
  return result;
}

export function scannedAlternative(
  review: PhotoReview,
  other: PhotoReview,
  health: HealthProfile,
  id: string,
  date: string,
): PhotoAlternative | null {
  const target = photoComparison(review),
    source = photoComparison(other);
  if (
    !target ||
    !source ||
    target.unit !== source.unit ||
    (other.engine === "LOCAL_OCR" && !other.userCorrected)
  )
    return null;
  const family = productFamily(review.name, target.unit);
  if (
    !family ||
    productFamily(other.name, source.unit)?.id !== family.id ||
    candidateMatch(review, other.name, other.brand) === "NAME_VARIANT"
  )
    return null;
  if (
    review.nutrition.sugarGrams === null ||
    other.nutrition.sugarGrams === null ||
    !other.servingSizeGrams ||
    !review.servingSizeGrams
  )
    return null;
  if (
    Date.now() - Date.parse(date) > 365 * 86400000 ||
    Date.parse(date) > Date.now() ||
    !Number.isFinite(Date.parse(date))
  )
    return null;
  if (
    health.allergies.length &&
    (!other.ingredientsText ||
      allergyConflict(other.ingredientsText, health.allergies))
  )
    return null;
  const factor = target.size / other.servingSizeGrams;
  const sugar = other.nutrition.sugarGrams * factor;
  const original =
    (review.nutrition.sugarGrams * target.size) / review.servingSizeGrams;
  if (
    original - sugar < target.size * 0.001 ||
    (sugar * 100) / target.size > 100
  )
    return null;
  const n = (key: keyof typeof other.nutrition) =>
    other.nutrition[key] === null
      ? null
      : Math.round(other.nutrition[key]! * factor * 100) / 100;
  const tradeoffs: string[] = [];
  for (const [key, label] of [
    ["sodiumMg", "Natrium"],
    ["saturatedFatGrams", "Lemak jenuh"],
    ["proteinGrams", "Protein"],
  ] as const) {
    const v = n(key),
      originalValue =
        review.nutrition[key] === null
          ? null
          : (review.nutrition[key]! * target.size) / review.servingSizeGrams;
    if (v === null || originalValue === null)
      tradeoffs.push(`${label} belum cukup lengkap untuk dibandingkan.`);
    else if (key === "proteinGrams" ? v < originalValue : v > originalValue)
      tradeoffs.push(
        `${label} ${key === "proteinGrams" ? "lebih rendah" : "lebih tinggi"}: ${decimal(v)} ${key === "sodiumMg" ? "mg" : "g"} dibanding ${decimal(originalValue)} ${key === "sodiumMg" ? "mg" : "g"}.`,
      );
  }
  tradeoffs.push(
    "Pembanding berasal dari foto milikmu; bacaan dan perubahan formula tetap perlu dicocokkan dengan kemasan.",
  );
  const pack =
    other.servingsPerContainer === null
      ? null
      : other.servingSizeGrams * other.servingsPerContainer;
  return {
    id: `scan-${id}`,
    barcode: null,
    name: other.name,
    brand: other.brand,
    family: family.id,
    unit: target.unit,
    comparisonSize: target.size,
    sugarGrams: Math.round(sugar * 100) / 100,
    originalSugarGrams: original,
    reductionPercent: Math.round(((original - sugar) / original) * 1000) / 10,
    sodiumMg: n("sodiumMg"),
    saturatedFatGrams: n("saturatedFatGrams"),
    proteinGrams: n("proteinGrams"),
    reasons: [
      `${decimal(sugar)} g gula dibanding ${decimal(original)} g pada ${decimal(target.size)} ${target.unit}.`,
    ],
    tradeoffs,
    sourceKind: "OWN_SCAN",
    sourceUrl: `/scanner?history=${id}`,
    sourceDate: date,
    packageQuantity: pack,
    packageUnit: pack === null ? null : source.unit,
  };
}

/** Price identity only: package dimensions never become invented nutrition values. */
export function alternativePriceProduct(
  candidate: PhotoAlternative,
  category: PhotoReview["category"],
) {
  return {
    name: candidate.name,
    brand: candidate.brand,
    category,
    providerCode: candidate.barcode ?? undefined,
    servingSizeGrams: candidate.packageQuantity,
    servingsPerContainer: candidate.packageQuantity ? 1 : null,
    evidence: {
      servingText:
        candidate.packageQuantity && candidate.packageUnit
          ? `${candidate.packageQuantity} ${candidate.packageUnit}`
          : null,
    },
  };
}
