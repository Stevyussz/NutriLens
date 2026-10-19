import { z } from "zod";
export const alternativeSchema = z
  .object({
    id: z.string().max(100),
    name: z.string().max(250),
    brand: z.string().max(150),
    family: z.string(),
    unit: z.enum(["g", "ml"]),
    comparisonSize: z.number().positive(),
    sugarGrams: z.number().nonnegative(),
    originalSugarGrams: z.number().nonnegative(),
    reductionPercent: z.number().min(0).max(100),
    sodiumMg: z.number().nonnegative().nullable(),
    saturatedFatGrams: z.number().nonnegative().nullable(),
    proteinGrams: z.number().nonnegative().nullable(),
    reasons: z.array(z.string()).max(4),
    tradeoffs: z.array(z.string()).max(6),
    sourceKind: z.enum(["CATALOGUE", "LIVE_CATALOGUE", "OWN_SCAN"]),
    sourceUrl: z.string(),
    sourceDate: z.string().datetime(),
    packageQuantity: z.number().positive().nullable(),
    packageUnit: z.enum(["g", "ml"]).nullable(),
    barcode: z.string().nullable(),
  })
  .strict();
export type PhotoAlternative = z.infer<typeof alternativeSchema>;
export const photoAlternativesSchema = z
  .object({
    status: z.enum(["FOUND", "NO_MATCH", "NEED_LABEL", "ALLERGY_ALERT"]),
    title: z.string(),
    action: z.string(),
    checkedAt: z.string().datetime(),
    comparison: z
      .object({ size: z.number().positive(), unit: z.enum(["g", "ml"]) })
      .nullable(),
    candidates: z.array(alternativeSchema).max(3),
    warnings: z.array(z.string()).max(6),
    lessons: z.array(z.object({ title: z.string(), text: z.string() })).max(3),
  })
  .strict();
export type PhotoAlternatives = z.infer<typeof photoAlternativesSchema>;
