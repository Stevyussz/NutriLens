import { test } from "node:test";
import assert from "node:assert/strict";
import { quickSummary } from "../src/core/quick-summary";
import { defaultHealth } from "../src/core/db/collections";
import { presetProducts } from "../src/core/db/presets";
import { scoreNutrition } from "../src/core/algorithms/nutrition-scorer";
import type { Analysis } from "../src/core/analysis-schema";
import { jsonContract } from "../src/core/ai/provider";
import { Type } from "@google/genai";
test("brief prioritizes explicit allergy, separates servings from packages, and keeps missing price unknown", () => {
  const product = { ...presetProducts()[0], priceIdr: null };
  const result = {
    extractedProductData: product,
    aiVerdict: { medicalStatus: "HINDARI" },
    splittingAnalysis: { isSugarSplittingDetected: false },
  } as Analysis;
  const health = {
    ...defaultHealth,
    allergies: [product.orderedIngredients[0].rawName],
  };
  const summary = quickSummary(result, health);
  assert.match(summary.title, /alergi/);
  assert.match(summary.action, /produk lain/);
  assert.equal(
    summary.sugarPercent,
    Math.round(
      (product.nutrition.sugarGrams / health.dailySugarLimitGrams) * 100,
    ),
  );
  assert.equal(scoreNutrition(product, []).costPerGramProteinIdr, null);
});
test("router JSON contract preserves nullable quantities rather than coercing them to zero", () => {
  const schema = jsonContract({
    type: Type.OBJECT,
    required: ["amount"],
    properties: { amount: { type: Type.NUMBER, nullable: true } },
  });
  assert.deepEqual(schema, {
    type: "object",
    required: ["amount"],
    properties: { amount: { type: ["number", "null"] } },
    additionalProperties: false,
  });
});
