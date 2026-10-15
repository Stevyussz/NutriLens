import type { Ingredient } from "../db/collections";

/** Estimates relative label-position weights, never chemical mass or proven fraud.
 * @param ingredients Ordered label ingredients; explicit percentages override positional estimates.
 * @returns Consolidated sugar ranking and a transparent heuristic score. O(n log n) time, O(n) space.
 */
export function calculateDeceptionAndSplittingMetrics(
  ingredients: Ingredient[],
) {
  const n = ingredients.length;
  const denominator = ingredients.reduce(
    (sum, _, idx) => sum + Math.pow(n - idx, 1.6),
    0,
  );
  const weightedIngredients = ingredients.map((ingredient, idx) => ({
    ...ingredient,
    estimatedWeight:
      ingredient.explicitPercentage ??
      (Math.pow(n - idx, 1.6) / denominator) * 100,
    weightSource:
      ingredient.explicitPercentage === null
        ? ("POSITIONAL_ESTIMATE" as const)
        : ("LABEL_PERCENTAGE" as const),
  }));
  const sugars = weightedIngredients.filter(
    (i) => i.functionalCategory === "HIDDEN_SUGAR",
  );
  const totalEstimatedSugarWeight = sugars.reduce(
    (sum, i) => sum + i.estimatedWeight,
    0,
  );
  const firstIngredientWeight = weightedIngredients[0]?.estimatedWeight ?? 0;
  const isSugarSplittingDetected =
    sugars.length >= 2 && totalEstimatedSugarWeight > firstIngredientWeight;
  const manipulationScore = isSugarSplittingDetected
    ? Math.min(
        100,
        Math.round(
          (totalEstimatedSugarWeight / Math.max(firstIngredientWeight, 0.001) -
            1) *
            60 +
            Math.min(sugars.length, 4) * 10,
        ),
      )
    : 0;
  const consolidatedRank = [
    ...weightedIngredients
      .filter((i) => i.functionalCategory !== "HIDDEN_SUGAR")
      .map((i) => ({
        name: i.rawName,
        weight: i.estimatedWeight,
        isSugar: false,
      })),
    ...(sugars.length
      ? [
          {
            name: "Gabungan sumber gula",
            weight: totalEstimatedSugarWeight,
            isSugar: true,
          },
        ]
      : []),
  ]
    .sort((a, b) => b.weight - a.weight)
    .map((i, idx) => ({ ...i, rank: idx + 1 }));
  return {
    alpha: 1.6,
    denominator,
    weightedIngredients,
    sugarCount: sugars.length,
    totalEstimatedSugarWeight,
    firstIngredientWeight,
    isSugarSplittingDetected,
    manipulationScore,
    consolidatedRank,
    estimatedTotalWeight: weightedIngredients.reduce(
      (s, i) => s + i.estimatedWeight,
      0,
    ),
    limitation:
      "Model posisi, bukan persentase massa terukur atau bukti manipulasi. Persentase eksplisit dipertahankan; campuran nilai eksplisit dan estimasi tidak selalu berjumlah 100%.",
  };
}
