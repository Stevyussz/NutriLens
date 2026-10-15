import type { Ingredient } from "../db/collections";
/** Conservative ingredient-based NOVA heuristic. @param ingredients Dictionary-enriched label. O(n) time, O(1) space. */
export function classifyNovaGroup(ingredients: Ingredient[]): 1 | 2 | 3 | 4 {
  if (
    ingredients.some(
      (i) =>
        ["ARTIFICIAL_SWEETENER", "COLORANT", "EMULSIFIER"].includes(
          i.functionalCategory,
        ) ||
        /maltodekstrin|isolat|perisa|sirup.*fruktosa|hidrogenasi|mononatrium glutamat|dinatrium (?:inosinat|guanilat|ribonukleotida)/i.test(
          `${i.rawName} ${i.canonicalChemicalName}`,
        ),
    )
  )
    return 4;
  if (
    ingredients.length === 1 &&
    (ingredients[0].functionalCategory === "HIDDEN_SUGAR" ||
      /^(?:garam|minyak|mentega)/i.test(ingredients[0].canonicalChemicalName))
  )
    return 2;
  if (
    ingredients.some((i) =>
      ["PRESERVATIVE", "SODIUM_ADDITIVE"].includes(i.functionalCategory),
    )
  )
    return 3;
  if (
    ingredients.some((i) => i.functionalCategory === "HIDDEN_SUGAR") &&
    ingredients.length > 1
  )
    return 3;
  return 1;
}
