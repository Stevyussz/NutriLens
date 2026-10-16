import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  extractPhotoForReview,
  prepareLabelImage,
} from "../src/core/ai/photo-extraction";
import { aiIdentity } from "../src/core/ai/provider";
import sharp from "sharp";
async function main() {
  const baseline = {
    caloriesKcal: 140,
    sugarGrams: 12,
    proteinGrams: 3,
    sodiumMg: 90,
    saturatedFatGrams: 2,
    fiberGrams: 1,
  };
  const cases = [
    { id: "per-serving", serving: 30, expected: baseline },
    {
      id: "per-100-comma",
      serving: 25,
      expected: {
        caloriesKcal: 100,
        sugarGrams: 6.25,
        proteinGrams: 2.5,
        sodiumMg: 100,
        saturatedFatGrams: 1.25,
        fiberGrams: 2,
      },
    },
    { id: "rotated", serving: 30, expected: baseline },
    {
      id: "missing-fiber",
      serving: 30,
      expected: { ...baseline, fiberGrams: null },
    },
  ];
  const results = [];
  for (const c of cases) {
    const started = performance.now();
    try {
      const review = await extractPhotoForReview([
        await readFile(`artifacts/vision-fixtures/${c.id}.png`),
      ]);
      assert.ok(review.engine.startsWith("ROUTER"));
      assert.deepEqual(review.nutrition, c.expected);
      assert.equal(review.servingSizeGrams, c.serving);
      results.push({
        id: c.id,
        passed: true,
        engine: review.engine,
        latencyMs: Math.round(performance.now() - started),
        nutrition: review.nutrition,
      });
    } catch (error) {
      results.push({
        id: c.id,
        passed: false,
        errorType: error instanceof Error ? error.name : "Unknown",
        message:
          error instanceof Error ? error.message.slice(0, 350) : "Unknown",
      });
    }
  }
  let rejected = false;
  try {
    await prepareLabelImage(
      await sharp({
        create: { width: 100, height: 100, channels: 3, background: "white" },
      })
        .png()
        .toBuffer(),
    );
  } catch {
    rejected = true;
  }
  results.push({ id: "low-resolution-rejected", passed: rejected });
  const report = {
    model: aiIdentity(),
    checkedAt: new Date().toISOString(),
    passed: results.every((r) => r.passed),
    cases: results,
    scope:
      "Controlled printed fixtures only; not a guarantee for real packaging. Review remains mandatory.",
  };
  await writeFile(
    process.env.VISION_REPORT_PATH ||
      "artifacts/vision-router-docker-benchmark.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
  if (!report.passed) process.exitCode = 1;
}
main().catch((error) => {
  console.log(
    JSON.stringify({
      passed: false,
      errorType: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message.slice(0, 350) : "Unknown",
    }),
  );
  process.exitCode = 1;
});
