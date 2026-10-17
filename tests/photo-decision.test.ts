import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhotoTranscription } from "../src/core/ai/vision-contract";
import { photoDecision } from "../src/core/photo-decision";
import { defaultHealth } from "../src/core/db/collections";
function review(
  sugar: string | null,
  portion: string | null = "1 Sajian Per Kemasan",
) {
  return normalizePhotoTranscription(
    {
      productName: "Coffee",
      brand: "Golda",
      category: "MINUMAN_KEMASAN",
      servingText: "200 ml",
      servingsPerContainerText: portion,
      basis: "PER_SERVING",
      basisText: "JUMLAH PER SAJIAN",
      nutritionText: {
        caloriesKcal: "180 kkal",
        sugarGrams: sugar,
        proteinGrams: "2 g",
        sodiumMg: "80 mg",
        saturatedFatGrams: "5 g",
        fiberGrams: null,
      },
      ingredientsText: "",
      unreadableFields: [],
    },
    [{ width: 398, height: 502 }],
  );
}
test("decision uses known per-serving sugar, distinguishes missing from zero, and does not invent package count", () => {
  const r = review("19 g");
  assert.equal(r.servingsPerContainer, 1);
  assert.equal(photoDecision(r, defaultHealth).sugarPercent, 38);
  assert.match(photoDecision(r, defaultHealth).title, /rendah gula/);
  assert.equal(r.nutrition.fiberGrams, null);
  assert.equal(photoDecision(review(null), defaultHealth).sugarPercent, null);
  assert.match(photoDecision(review(null), defaultHealth).title, /belum bisa/);
  assert.equal(photoDecision(review("0 g"), defaultHealth).sugarPercent, 0);
  assert.equal(review("19 g", null).servingsPerContainer, null);
});
