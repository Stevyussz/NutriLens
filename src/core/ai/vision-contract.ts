import { z } from "zod";
import { categorySchema, nutritionSchema } from "../db/collections";

export const nutrientKeys = Object.keys(
  nutritionSchema.shape,
) as (keyof typeof nutritionSchema.shape)[];
const fieldLabels: Record<string, string> = {
  caloriesKcal: "Energi",
  proteinGrams: "Protein",
  sugarGrams: "Gula",
  fiberGrams: "Serat",
  saturatedFatGrams: "Lemak jenuh",
  sodiumMg: "Natrium",
  productName: "Nama produk",
  brand: "Merek",
  category: "Kategori produk",
  servingText: "Ukuran sajian",
  basis: "Dasar perhitungan gizi",
  basisText: "Judul kolom gizi",
  ingredientsText: "Komposisi",
};
export function photoFieldLabel(field: string): string {
  return (
    fieldLabels[field.replace(/^nutritionText\./, "")] ??
    "bagian label yang belum terbaca"
  );
}
export const photoTranscriptionSchema = z
  .object({
    productName: z.string().max(250),
    brand: z.string().max(150),
    category: categorySchema,
    servingText: z.string().max(100).nullable(),
    servingsPerContainerText: z.string().max(150).nullable().default(null),
    basis: z.enum(["PER_SERVING", "PER_100_G", "PER_100_ML", "UNKNOWN"]),
    basisText: z.string().max(150).nullable(),
    nutritionText: z
      .object(
        Object.fromEntries(
          nutrientKeys.map((key) => [key, z.string().max(100).nullable()]),
        ) as Record<
          keyof typeof nutritionSchema.shape,
          z.ZodNullable<z.ZodString>
        >,
      )
      .strict(),
    ingredientsText: z.string().max(15000),
    unreadableFields: z.array(z.string().max(100)).max(20),
  })
  .strict();
export const photoReviewSchema = z
  .object({
    engine: z
      .enum([
        "GEMINI",
        "GEMINI_CROSSCHECKED",
        "ROUTER_VISION",
        "ROUTER_CROSSCHECKED",
        "LOCAL_OCR",
      ])
      .default("GEMINI"),
    rawText: z.string().max(30000).default(""),
    providerNotice: z.string().nullable().optional(),
    reviewRequired: z.literal(true),
    readingVersion: z.literal(2).optional(),
    name: z.string().max(250),
    brand: z.string().max(150),
    category: categorySchema,
    servingSizeGrams: z.number().positive().max(10000).nullable(),
    servingsPerContainer: z
      .number()
      .positive()
      .max(1000)
      .nullable()
      .default(null),
    nutrition: z
      .object(
        Object.fromEntries(
          nutrientKeys.map((key) => [
            key,
            nutritionSchema.shape[key].nullable(),
          ]),
        ) as Record<
          keyof typeof nutritionSchema.shape,
          z.ZodNullable<z.ZodNumber>
        >,
      )
      .strict(),
    ingredientsText: z.string().max(15000),
    evidence: photoTranscriptionSchema,
    issues: z.array(z.string()).max(40),
    conversions: z.array(z.string()).max(20),
    images: z
      .array(z.object({ width: z.number(), height: z.number() }))
      .min(1)
      .max(2),
    userCorrected: z.boolean().optional(),
    historyId: z
      .string()
      .regex(/^[a-f0-9]{24}$/)
      .optional(),
  })
  .strict();
export type PhotoReview = z.infer<typeof photoReviewSchema>;
export type PhotoTranscription = z.infer<typeof photoTranscriptionSchema>;

function quantity(text: string | null): { value: number; unit: string } | null {
  if (!text) return null;
  const match = text
    .normalize("NFKC")
    .trim()
    .match(/^(\d+(?:[.,]\d+)?)\s*(kkal|kcal|kj|mg|gram|g|ml)$/i);
  if (!match || /^[1-9]\d*[.,]\d{3}$/.test(match[1])) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value)
    ? { value, unit: match[2].toLowerCase().replace("gram", "g") }
    : null;
}

/** Converts only explicit quantities in a declared table column. Unknowns remain null. */
export function normalizePhotoTranscription(
  input: unknown,
  images: { width: number; height: number }[],
): PhotoReview {
  const evidence = photoTranscriptionSchema.parse(input);
  const countMatch = evidence.servingsPerContainerText?.match(
    /^(\d+(?:[.,]\d+)?)\s*(?:sajian\s*per\s*kemasan|servings?\s*per\s*container)\b|^(?:sajian\s*per\s*kemasan|servings?\s*per\s*container)\s*:?\s*(\d+(?:[.,]\d+)?)/i,
  );
  const count = countMatch
    ? Number((countMatch[1] ?? countMatch[2]).replace(",", "."))
    : null;
  const servingsPerContainer =
    count !== null && count > 0 && count <= 1000 ? count : null;
  const issues: string[] = [],
    conversions: string[] = [];
  const serving = quantity(evidence.servingText);
  const servingSizeGrams =
    serving &&
    ["g", "ml"].includes(serving.unit) &&
    serving.value > 0 &&
    serving.value <= 10000
      ? serving.value
      : null;
  if (servingSizeGrams === null)
    issues.push(
      "Ukuran sajian belum terbaca dengan satuan g atau ml yang pasti.",
    );
  let validBasis = false;
  const heading = evidence.basisText?.toLowerCase() ?? "";
  if (evidence.basis === "PER_SERVING") {
    const headingQuantity = quantity(heading.replace(/^per\s+/i, ""));
    validBasis =
      /per\s*(sajian|porsi|serving)|amount\s+per\s+serving/.test(heading) ||
      Boolean(
        headingQuantity &&
        serving &&
        headingQuantity.unit === serving.unit &&
        headingQuantity.value === serving.value,
      );
  } else if (evidence.basis === "PER_100_G")
    validBasis = /100\s*(g|gram)\b/.test(heading) && serving?.unit === "g";
  else if (evidence.basis === "PER_100_ML")
    validBasis = /100\s*ml\b/.test(heading) && serving?.unit === "ml";
  if (!validBasis)
    issues.push(
      "Kolom gizi atau kesesuaian satuan belum pasti. Isi angka per sajian dari label; jangan gunakan kolom %AKG.",
    );
  const factor =
    evidence.basis === "PER_SERVING" ? 1 : (servingSizeGrams ?? 0) / 100;
  if (validBasis && evidence.basis !== "PER_SERVING")
    conversions.push(
      `Angka per 100 ${serving?.unit} dikalikan ${factor} untuk sajian ${evidence.servingText}.`,
    );
  const nutrition = Object.fromEntries(
    nutrientKeys.map((key) => {
      const raw = quantity(evidence.nutritionText[key]);
      let value: number | null = null;
      if (
        raw &&
        validBasis &&
        (evidence.basis === "PER_SERVING" || servingSizeGrams !== null)
      ) {
        if (key === "caloriesKcal") {
          if (["kkal", "kcal"].includes(raw.unit)) value = raw.value * factor;
          else if (raw.unit === "kj") {
            value = (raw.value / 4.184) * factor;
            conversions.push("Energi kJ dibagi 4,184 menjadi kkal.");
          }
        } else if (["g", "mg"].includes(raw.unit)) {
          value =
            raw.value *
            factor *
            (key === "sodiumMg"
              ? raw.unit === "g"
                ? 1000
                : 1
              : raw.unit === "mg"
                ? 0.001
                : 1);
          if (key === "sodiumMg" && raw.unit === "g")
            conversions.push(
              "Natrium dalam gram dikalikan 1.000 menjadi miligram.",
            );
        }
      }
      if (value !== null) {
        value = Math.round(value * 1e6) / 1e6;
        if (!nutritionSchema.shape[key].safeParse(value).success) value = null;
        if (serving?.unit === "g" && value !== null) {
          const mass = key === "sodiumMg" ? value / 1000 : value;
          if (key !== "caloriesKcal" && mass > serving.value * 1.05)
            value = null;
          if (
            key === "caloriesKcal" &&
            value !== null &&
            value > serving.value * 9 + 20
          )
            value = null;
        }
      }
      if (value === null && evidence.nutritionText[key] !== null)
        issues.push(
          `${photoFieldLabel(key)}: angka atau satuannya belum pasti; foto ulang bagian ini jika ingin memastikannya.`,
        );
      return [key, value];
    }),
  );
  if (!evidence.productName.trim()) issues.push("Nama produk belum terbaca.");
  if (!evidence.ingredientsText.trim())
    issues.push(
      "Komposisi belum terbaca. Tambahkan foto komposisi atau salin sendiri sesuai urutan.",
    );
  if (evidence.unreadableFields.length)
    issues.push(
      `Bagian yang ditandai sulit dibaca: ${evidence.unreadableFields.map(photoFieldLabel).join(", ")}.`,
    );
  return photoReviewSchema.parse({
    reviewRequired: true,
    readingVersion: 2,
    name: evidence.productName,
    brand: evidence.brand,
    category: evidence.category,
    servingSizeGrams,
    servingsPerContainer,
    nutrition,
    ingredientsText: evidence.ingredientsText,
    evidence,
    issues,
    conversions,
    images,
  });
}
