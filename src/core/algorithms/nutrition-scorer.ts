import type { Chemical, Product } from "../db/collections";
/** Computes a sugar-only GL proxy, not full-meal GL; carbohydrate mass is unavailable.
 * @param product Nutrients per declared serving. @param chemicals Matched GI references.
 * O(k) time and O(k) extra space for k matched compounds.
 */
export function scoreNutrition(product: Product, chemicals: Chemical[]) {
  const known = chemicals.filter(
    (c) => c.functionalCategory === "HIDDEN_SUGAR" && c.glycemicIndex !== null,
  );
  const averageGi = known.length
    ? known.reduce((s, c) => s + (c.glycemicIndex ?? 0), 0) / known.length
    : null;
  return {
    sugarOnlyGlycemicLoadProxy:
      averageGi === null
        ? null
        : Math.round(averageGi * product.nutrition.sugarGrams) / 100,
    costPerGramProteinIdr:
      product.nutrition.proteinGrams > 0
        ? Math.round(product.priceIdr / product.nutrition.proteinGrams)
        : null,
    valueScore: Math.max(
      0,
      Math.min(
        100,
        Math.round(
          50 +
            product.nutrition.proteinGrams * 3 +
            product.nutrition.fiberGrams * 2 -
            product.nutrition.sugarGrams -
            product.nutrition.sodiumMg / 50,
        ),
      ),
    ),
    limitation:
      "GL hanya proksi dari gula dan GI referensi, bukan GL total atau prediksi respons tubuh. Skor gizi merupakan heuristik aplikasi.",
  };
}
