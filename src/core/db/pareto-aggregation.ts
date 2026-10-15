import type { Db, Document } from "mongodb";
import { productSchema, type Product } from "./collections";
import { z } from "zod";
export const swapSchema = productSchema.extend({
  id: z.string(),
  jaccardFlavorSimilarity: z.number(),
  moneySavedIdr: z.number(),
  proteinPerThousandIdr: z.number(),
  dominated: z.boolean(),
});
export type Swap = z.infer<typeof swapSchema>;

/** Builds DB-only constrained retrieval, Jaccard scoring and nondominated frontier.
 * @param product Source label. @param budget User spending ceiling.
 * O(m log m + c*m) worst-case over m category rows and c<=6 shortlisted rows; indexes prune m.
 */
export function buildSwapPipeline(
  product: Product,
  budget: number,
): Document[] {
  const filters = {
    category: product.category,
    barcode: { $ne: product.barcode },
    "source.kind": { $in: ["OPEN_FOOD_FACTS", "LABEL"] },
    priceIdr: { $lte: Math.min(product.priceIdr, budget) },
    "nutrition.sugarGrams": { $lte: product.nutrition.sugarGrams * 0.75 },
    "nutrition.proteinGrams": { $gte: product.nutrition.proteinGrams },
  };
  return [
    { $match: filters },
    {
      $addFields: {
        flavorIntersection: {
          $size: {
            $setIntersection: ["$flavorTags", { $literal: product.flavorTags }],
          },
        },
        flavorUnion: {
          $size: {
            $setUnion: ["$flavorTags", { $literal: product.flavorTags }],
          },
        },
        moneySavedIdr: { $subtract: [product.priceIdr, "$priceIdr"] },
        proteinPerThousandIdr: {
          $cond: [
            { $gt: ["$priceIdr", 0] },
            {
              $multiply: [
                { $divide: ["$nutrition.proteinGrams", "$priceIdr"] },
                1000,
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $addFields: {
        jaccardFlavorSimilarity: {
          $cond: [
            { $gt: ["$flavorUnion", 0] },
            { $divide: ["$flavorIntersection", "$flavorUnion"] },
            0,
          ],
        },
      },
    },
    { $match: { jaccardFlavorSimilarity: { $gte: 0.35 } } },
    {
      $sort: {
        jaccardFlavorSimilarity: -1,
        proteinPerThousandIdr: -1,
        barcode: 1,
      },
    },
    { $limit: 6 },
    {
      $lookup: {
        from: "products",
        let: {
          price: "$priceIdr",
          sugar: "$nutrition.sugarGrams",
          protein: "$nutrition.proteinGrams",
          code: "$barcode",
        },
        pipeline: [
          { $match: filters },
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$barcode", "$$code"] },
                  { $lte: ["$priceIdr", "$$price"] },
                  { $lte: ["$nutrition.sugarGrams", "$$sugar"] },
                  { $gte: ["$nutrition.proteinGrams", "$$protein"] },
                  {
                    $or: [
                      { $lt: ["$priceIdr", "$$price"] },
                      { $lt: ["$nutrition.sugarGrams", "$$sugar"] },
                      { $gt: ["$nutrition.proteinGrams", "$$protein"] },
                    ],
                  },
                ],
              },
            },
          },
          {
            $addFields: {
              unionCount: {
                $size: {
                  $setUnion: ["$flavorTags", { $literal: product.flavorTags }],
                },
              },
              intersectionCount: {
                $size: {
                  $setIntersection: [
                    "$flavorTags",
                    { $literal: product.flavorTags },
                  ],
                },
              },
            },
          },
          {
            $match: {
              $expr: {
                $gte: [
                  {
                    $cond: [
                      { $gt: ["$unionCount", 0] },
                      { $divide: ["$intersectionCount", "$unionCount"] },
                      0,
                    ],
                  },
                  0.35,
                ],
              },
            },
          },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
        as: "dominators",
      },
    },
    {
      $set: {
        id: { $toString: "$_id" },
        dominated: { $gt: [{ $size: "$dominators" }, 0] },
      },
    },
    { $unset: ["_id", "dominators", "flavorIntersection", "flavorUnion"] },
  ];
}
/** Executes candidate selection entirely in MongoDB and validates its output. O(pipeline cost). */
export async function findSmartCandidateSwapsMongo(
  db: Db,
  product: Product,
  budget: number,
): Promise<Swap[]> {
  return z
    .array(swapSchema)
    .parse(
      await db
        .collection("products")
        .aggregate(buildSwapPipeline(product, budget))
        .toArray(),
    );
}
/** Computes empirical inclusive CDF against other labels in the category. O(m), fixed-size result.
 * Ties count as <=; a population of zero returns null instead of an invented rank.
 */
export async function calculatePercentiles(db: Db, product: Product) {
  const pipeline: Document[] = [
    {
      $match: {
        category: product.category,
        barcode: { $ne: product.barcode },
        "source.kind": { $in: ["OPEN_FOOD_FACTS", "LABEL"] },
      },
    },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              sugarBelow: {
                $sum: {
                  $cond: [
                    {
                      $lte: [
                        "$nutrition.sugarGrams",
                        product.nutrition.sugarGrams,
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              sodiumBelow: {
                $sum: {
                  $cond: [
                    {
                      $lte: ["$nutrition.sodiumMg", product.nutrition.sodiumMg],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 0,
        population: { $ifNull: [{ $arrayElemAt: ["$totals.count", 0] }, 0] },
        sugarBelow: {
          $ifNull: [{ $arrayElemAt: ["$totals.sugarBelow", 0] }, 0],
        },
        sodiumBelow: {
          $ifNull: [{ $arrayElemAt: ["$totals.sodiumBelow", 0] }, 0],
        },
      },
    },
  ];
  const row = z
    .object({
      population: z.number(),
      sugarBelow: z.number(),
      sodiumBelow: z.number(),
    })
    .parse((await db.collection("products").aggregate(pipeline).toArray())[0]);
  return {
    population: row.population,
    sugarPercentileRank: row.population
      ? Math.round((row.sugarBelow / row.population) * 100)
      : null,
    sodiumPercentileRank: row.population
      ? Math.round((row.sodiumBelow / row.population) * 100)
      : null,
    basis:
      "Per sajian yang dicantumkan, ukuran sajian dapat berbeda; bukan sampel representatif pasar.",
  };
}
