import { z } from "zod";
import {
  chemicalSchema,
  ingredientSchema,
  productSchema,
} from "./db/collections";
import { swapSchema } from "./db/pareto-aggregation";
import { verdictSchema } from "./verdict-schema";
export const splittingSchema = z
  .object({
    alpha: z.number(),
    denominator: z.number(),
    weightedIngredients: z.array(
      ingredientSchema.extend({
        estimatedWeight: z.number(),
        weightSource: z.enum(["POSITIONAL_ESTIMATE", "LABEL_PERCENTAGE"]),
      }),
    ),
    sugarCount: z.number(),
    totalEstimatedSugarWeight: z.number(),
    firstIngredientWeight: z.number(),
    isSugarSplittingDetected: z.boolean(),
    manipulationScore: z.number(),
    consolidatedRank: z.array(
      z.object({
        name: z.string(),
        weight: z.number(),
        isSugar: z.boolean(),
        rank: z.number(),
      }),
    ),
    estimatedTotalWeight: z.number(),
    limitation: z.string(),
  })
  .strict();
export const analysisSchema = z
  .object({
    extractedProductData: productSchema,
    splittingAnalysis: splittingSchema,
    chemicals: z.array(chemicalSchema),
    paretoSwaps: z.array(swapSchema),
    aiVerdict: verdictSchema,
    percentiles: z
      .object({
        population: z.number(),
        sugarPercentileRank: z.number().nullable(),
        sodiumPercentileRank: z.number().nullable(),
        basis: z.string(),
      })
      .strict(),
    nutritionScore: z
      .object({
        sugarOnlyGlycemicLoadProxy: z.number().nullable(),
        costPerGramProteinIdr: z.number().nullable(),
        valueScore: z.number(),
        limitation: z.string(),
      })
      .strict(),
    mode: z.enum(["GEMINI", "ROUTER_AI", "LOCAL_DETERMINISTIC"]),
    notice: z.string(),
    executionTimeMs: z.number(),
    cacheHit: z.boolean(),
  })
  .strict();
export type Analysis = z.infer<typeof analysisSchema>;
