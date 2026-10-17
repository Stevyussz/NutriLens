import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhotoTranscription } from "../src/core/ai/vision-contract";
import {
  compareVisionReadings,
  readVisionWithRetry,
  reconcilePhotoReading,
} from "../src/core/ai/vision-policy";
import sample from "./fixtures/golda-corrupt-local-ocr.json";
const make = (sugar: string | null = "19g") => ({
  ...normalizePhotoTranscription(
    {
      ...sample.evidence,
      nutritionText: { ...sample.evidence.nutritionText, sugarGrams: sugar },
    },
    [{ width: 1020, height: 1282 }],
  ),
  engine: "ROUTER_VISION" as const,
});
test("complete vision needs one read; missing critical fact gets at most one visual retry", async () => {
  let calls = 0;
  const a = await readVisionWithRetry(async () => {
    calls++;
    return make();
  });
  assert.equal(calls, 1);
  assert.equal(a.nutrition.sugarGrams, 19);
  calls = 0;
  const b = await readVisionWithRetry(async () => {
    calls++;
    return make(calls === 1 ? null : "19g");
  });
  assert.equal(calls, 2);
  assert.equal(b.nutrition.sugarGrams, 19);
  assert.equal(b.visionReview?.status, "RECHECKED");
  calls = 0;
  const c = await readVisionWithRetry(async () => {
    calls++;
    return make(null);
  });
  assert.equal(calls, 2);
  assert.equal(c.nutrition.sugarGrams, null);
});
test("visual disagreement is explicit; different portions and table bases never combine", () => {
  const a = make();
  const disputed = compareVisionReadings(a, make("29g"));
  assert.equal(disputed.nutrition.sugarGrams, null);
  assert.equal(disputed.visionReview?.differences[0].first, "19g");
  assert.equal(disputed.visionReview?.differences[0].second, "29g");
  const changedPortion = {
    ...make(),
    servingSizeGrams: 100,
    evidence: { ...make().evidence, servingText: "100 ml" },
  };
  assert.equal(
    compareVisionReadings(make(null), changedPortion).nutrition.sugarGrams,
    null,
  );
  const changedColumn = {
    ...make(),
    evidence: { ...make().evidence, basis: "PER_100_ML" as const },
  };
  assert.equal(
    compareVisionReadings(make(null), changedColumn).nutrition.sugarGrams,
    null,
  );
});
test("failed vision never falls back to OCR; failed recheck preserves known facts", async () => {
  await assert.rejects(
    () =>
      readVisionWithRetry(async () => {
        throw Error("Vision unavailable");
      }),
    /Vision unavailable/,
  );
  let count = 0;
  const result = await readVisionWithRetry(async () => {
    if (++count === 2) throw Error("Retry unavailable");
    return make(null);
  });
  assert.equal(result.nutrition.sugarGrams, null);
  assert.equal(result.nutrition.sodiumMg, 80);
  assert.equal(result.visionReview?.status, "UNAVAILABLE");
});
test("old OCR veto is removed from saved vision, but user corrections stay authoritative", () => {
  const old = {
    ...make(),
    readingVersion: 2 as const,
    engine: "ROUTER_CROSSCHECKED" as const,
    nutrition: { ...make().nutrition, sugarGrams: null },
    rawText: "Per sajian\nGula 29g",
  };
  assert.equal(reconcilePhotoReading(old).nutrition.sugarGrams, 19);
  assert.equal(
    reconcilePhotoReading({ ...old, userCorrected: true }).nutrition.sugarGrams,
    null,
  );
});

test("unknown package count is re-read, while conflicting package counts never yield a whole-package total", async () => {
  const a = { ...make(), servingsPerContainer: null };
  let calls = 0;
  const checked = await readVisionWithRetry(async () =>
    ++calls === 1 ? a : make(),
  );
  assert.equal(calls, 2);
  assert.equal(checked.servingsPerContainer, 1);
  const conflict = compareVisionReadings(make(), {
    ...make(),
    servingsPerContainer: 2,
  });
  assert.equal(conflict.servingsPerContainer, null);
  assert.equal(conflict.nutrition.sugarGrams, 19);
});
