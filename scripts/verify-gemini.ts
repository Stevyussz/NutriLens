import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { extractWithGemini } from "../src/core/ai/gemini-vision";
import { contextualRerank } from "../src/core/ai/contextual-reranker";
import { defaultHealth } from "../src/core/db/collections";
import { dictionaryData } from "../src/core/db/dictionary-data";
import { calculateDeceptionAndSplittingMetrics } from "../src/core/algorithms/sugar-splitting";
import { geminiModel } from "../src/core/ai/model";

const checks = {
  textExtraction: false,
  exactSixNutrients: false,
  orderedIngredients: false,
  allergyAvoidancePreserved: false,
  noInventedCandidateIds: false,
  incompleteNutritionRejected: false,
};

/** Opt-in live provider check against an explicit test label, without writing a product to DB.
 * Validates extraction fidelity and preservation of deterministic allergy avoidance. O(i+c)
 * local work plus three remote Gemini calls. Reports status only, never credentials or raw errors.
 */
async function main() {
  if (!process.env.GEMINI_API_KEY)
    throw new Error("GEMINI_API_KEY is not configured");
  const started = performance.now();
  const product = await extractWithGemini({
    text: `Label uji integrasi, bukan produk yang dijual.
Nama: Biskuit Uji Integrasi
Merek: BongkarLabel Test
Kategori: CAMILAN_BISKUIT
Harga estimasi per sajian: Rp6000
Sajian: 30 g
Gizi per sajian: energi 140 kkal; gula 12 g; protein 3 g; natrium 90 mg; lemak jenuh 2 g; serat 1 g.
Komposisi berurutan: tepung gandum, gula, dekstrosa, madu, kakao.
Klaim pemasaran: tidak ada.`,
  });
  assert.equal(product.servingSizeGrams, 30);
  assert.deepEqual(product.nutrition, {
    caloriesKcal: 140,
    sugarGrams: 12,
    proteinGrams: 3,
    sodiumMg: 90,
    saturatedFatGrams: 2,
    fiberGrams: 1,
  });
  assert.equal(product.orderedIngredients.length, 5);
  assert.match(product.orderedIngredients[0].rawName, /gandum/i);
  assert.equal(product.source.kind, "AI_ESTIMATE");
  checks.textExtraction = true;
  checks.exactSixNutrients = true;
  checks.orderedIngredients = true;
  const verdict = await contextualRerank(
    product,
    { ...defaultHealth, allergies: ["gandum"] },
    dictionaryData(),
    [],
    calculateDeceptionAndSplittingMetrics(product.orderedIngredients),
  );
  assert.equal(verdict.medicalStatus, "HINDARI");
  assert.deepEqual(verdict.selectedCandidateIds, []);
  assert.deepEqual(verdict.fallbackSuggestions, []);
  checks.allergyAvoidancePreserved = true;
  checks.noInventedCandidateIds = true;
  let incompleteRejected = false;
  try {
    await extractWithGemini({
      text: "Label uji tidak lengkap, bukan produk riil. Nama: Minuman Uji Data. Sajian: 250 ml. Komposisi: air, gula, kopi. Gizi yang tercantum hanya gula 5 g. Energi, protein, natrium, lemak jenuh dan serat tidak tersedia pada label.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Label nutrition or serving is incomplete"
    )
      incompleteRejected = true;
    else throw error;
  }
  assert.equal(
    incompleteRejected,
    true,
    "Incomplete label unexpectedly accepted",
  );
  checks.incompleteNutritionRejected = true;
  const report = {
    checkedAt: new Date().toISOString(),
    model: geminiModel(),
    passed: true,
    ...checks,
    durationMs: performance.now() - started,
    note: "Three live provider requests using explicit complete/incomplete synthetic test labels; not a photo/clinical validation.",
  };
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/gemini-live.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
}
main().catch(async (error: unknown) => {
  const status =
    error && typeof error === "object" && "status" in error
      ? error.status
      : null;
  const message = error instanceof Error ? error.message : "";
  const providerStatus =
    message.match(/"status"\s*:\s*"([A-Z_]+)"/)?.[1] ?? null;
  const report = {
    checkedAt: new Date().toISOString(),
    model: geminiModel(),
    passed: false,
    ...checks,
    errorType: error instanceof Error ? error.name : "UnknownError",
    httpStatus: typeof status === "number" ? status : null,
    providerStatus,
  };
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/gemini-live.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.error(JSON.stringify(report));
  process.exitCode = 1;
});
