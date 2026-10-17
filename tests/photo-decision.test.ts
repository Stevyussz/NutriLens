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
  assert.equal(
    photoDecision(r, defaultHealth).title,
    "Kalau dihabiskan: 19 g gula.",
  );
  assert.match(photoDecision(r, defaultHealth).action, /9,5 g/);
  assert.equal(r.nutrition.fiberGrams, null);
  assert.equal(photoDecision(review(null), defaultHealth).sugarPercent, null);
  assert.match(
    photoDecision(review(null), defaultHealth).title,
    /belum terkonfirmasi/,
  );
  assert.equal(photoDecision(review("0 g"), defaultHealth).sugarPercent, 0);
  assert.equal(review("19 g", null).servingsPerContainer, null);
});

test("whole-package advice scales all numbers and never treats an arbitrary profile threshold as a verdict", () => {
  const two = review("19 g", "2 Sajian Per Kemasan");
  const d = photoDecision(two, defaultHealth);
  assert.equal(d.displaySugar, 38);
  assert.equal(d.displaySodium, 160);
  assert.match(d.title, /38 g/);
  assert.match(d.action, /19 g/);
  const noCount = photoDecision(review("19 g", null), defaultHealth);
  assert.match(noCount.title, /per sajian/);
  assert.equal(noCount.packageSugar, null);
  assert.doesNotMatch(noCount.action, /di bawah 19/);
  assert.equal(
    photoDecision(review("19 g"), {
      ...defaultHealth,
      dailySugarLimitGrams: 25,
    }).title,
    photoDecision(review("19 g"), defaultHealth).title,
  );
  assert.equal(
    photoDecision({ ...review("19 g"), engine: "LOCAL_OCR" }, defaultHealth)
      .needsVision,
    true,
  );
});

test("a photo without any nutrition never claims other numbers are available", () => {
  const r = review(null);
  for (const key of Object.keys(r.nutrition) as (keyof typeof r.nutrition)[])
    r.nutrition[key] = null;
  const d = photoDecision(r, defaultHealth);
  assert.equal(d.hasNutrition, false);
  assert.doesNotMatch(d.action, /Angka lain/);
  assert.match(d.action, /Informasi Nilai Gizi/);
});
