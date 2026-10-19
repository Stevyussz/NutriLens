import { z } from "zod";
import { categorySchema, nutritionSchema } from "./collections";
export const catalogueSchema = z
  .object({
    providerCode: z.string().regex(/^\d{6,24}$/),
    name: z.string().min(1).max(250),
    brand: z.string().max(150),
    category: categorySchema,
    servingSizeGrams: z.number().positive().max(10000).nullable(),
    servingUnit: z.enum(["g", "ml"]).nullable(),
    ingredientsText: z.string().max(30000),
    nutrition: z
      .object({
        caloriesKcal: nutritionSchema.shape.caloriesKcal.nullable(),
        sugarGrams: nutritionSchema.shape.sugarGrams.nullable(),
        proteinGrams: nutritionSchema.shape.proteinGrams.nullable(),
        sodiumMg: nutritionSchema.shape.sodiumMg.nullable(),
        saturatedFatGrams: nutritionSchema.shape.saturatedFatGrams.nullable(),
        fiberGrams: nutritionSchema.shape.fiberGrams.nullable(),
      })
      .strict(),
    nutritionBasis: z.enum([
      "PER_SERVING",
      "PER_100_G",
      "PER_100_ML",
      "UNKNOWN",
    ]),
    countries: z.array(z.string()),
    origins: z.array(z.string()),
    manufacturingPlaces: z.array(z.string()),
    allergens: z.array(z.string()),
    labels: z.array(z.string()),
    additives: z.array(z.string()),
    missingFields: z.array(z.string()),
    referenceEligible: z.boolean(),
    sourceUrl: z.string().url(),
    retrievedAt: z.string().datetime(),
    normalizationVersion: z.literal(2).optional(),
    packageQuantity: z.number().positive().max(100000).nullable().optional(),
    packageUnit: z.enum(["g", "ml"]).nullable().optional(),
  })
  .strict()
  .transform((record) => ({
    ...record,
    // The repository's v1 importer scaled every known value to a serving,
    // but retained the original 100g/ml tag. Repair that tag once on read.
    nutritionBasis:
      record.normalizationVersion === undefined &&
      record.nutritionBasis !== "UNKNOWN"
        ? ("PER_SERVING" as const)
        : record.nutritionBasis,
  }));
export type CatalogueProduct = z.infer<typeof catalogueSchema>;
export const catalogueOutputSchema = z
  .object({
    entries: z.array(catalogueSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pages: z.number().int().nonnegative(),
  })
  .strict();

/** Parses quoted TSV/CSV including embedded separators, escaped quotes and multiline values. */
export function parseDelimited(
  text: string,
  separator = "\t",
): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted || cell.length === 0) quoted = !quoted;
      else cell += c;
    } else if (!quoted && (c === separator || c === "\n")) {
      row.push(cell.replace(/\r$/, ""));
      cell = "";
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else cell += c;
  }
  if (quoted) throw Error("Unterminated quoted export");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const header = rows.shift();
  if (!header?.includes("code")) throw Error("Export header missing code");
  return rows
    .filter((r) => r.some(Boolean))
    .map((r) => {
      if (r.length !== header.length)
        throw Error("Export column count mismatch");
      return Object.fromEntries(header.map((key, i) => [key, r[i]]));
    });
}
