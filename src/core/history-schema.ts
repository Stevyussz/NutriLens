import { z } from "zod";
import { analysisSchema } from "./analysis-schema";
import { healthSchema } from "./db/collections";
import { photoReviewSchema } from "./ai/vision-contract";
export const historyItemSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{24}$/),
    name: z.string(),
    createdAt: z.string().datetime(),
    status: z.enum(["AMAN", "WASPADA", "HINDARI"]),
    sugarGrams: z.number().nullable(),
    sodiumMg: z.number().nullable(),
    kind: z.enum(["ANALYSIS", "PHOTO"]).default("ANALYSIS"),
    illustrative: z.boolean(),
  })
  .strict();
export const historyListSchema = z
  .object({
    items: z.array(historyItemSchema),
    page: z.number(),
    pages: z.number(),
    total: z.number(),
  })
  .strict();
export const historyDetailSchema = z
  .object({
    id: z.string(),
    createdAt: z.string().datetime(),
    healthProfile: healthSchema,
    result: analysisSchema.optional(),
    photoResult: photoReviewSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Boolean(value.result) !== Boolean(value.photoResult),
    "Riwayat harus memuat satu jenis hasil.",
  );
