import { z } from "zod";
import { analysisSchema } from "./analysis-schema";
import { healthSchema } from "./db/collections";
export const historyItemSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{24}$/),
    name: z.string(),
    createdAt: z.string().datetime(),
    status: z.enum(["AMAN", "WASPADA", "HINDARI"]),
    sugarGrams: z.number(),
    sodiumMg: z.number(),
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
    result: analysisSchema,
  })
  .strict();
