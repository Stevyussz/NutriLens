import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { normalizePhotoTranscription } from "../src/core/ai/vision-contract";
import { prepareLabelImage } from "../src/core/ai/photo-extraction";
import { parseDelimited } from "../src/core/db/catalogue";
const complete = {
  productName: "Label uji",
  brand: "",
  category: "CAMILAN_BISKUIT",
  servingText: "25 g",
  basis: "PER_100_G",
  basisText: "Per 100 g",
  nutritionText: {
    caloriesKcal: "400 kkal",
    sugarGrams: "25 g",
    proteinGrams: "10 g",
    sodiumMg: "0,4 g",
    saturatedFatGrams: "5 g",
    fiberGrams: "8 g",
  },
  ingredientsText: "gandum, gula, madu",
  unreadableFields: [],
};
test("per-100 column, decimal comma and sodium grams normalize without model arithmetic", () => {
  const result = normalizePhotoTranscription(complete, [
    { width: 1400, height: 1100 },
  ]);
  assert.deepEqual(result.nutrition, {
    caloriesKcal: 100,
    sugarGrams: 6.25,
    proteinGrams: 2.5,
    sodiumMg: 100,
    saturatedFatGrams: 1.25,
    fiberGrams: 2,
  });
  assert.equal(result.reviewRequired, true);
  assert.equal(result.issues.length, 0);
});
test("missing, censored, percentage and ambiguous OCR quantities stay null", () => {
  for (const token of [null, "<0,5 g", "5%", "1.000 g", "-2 g", "tiga gram"]) {
    const r = normalizePhotoTranscription(
      {
        ...complete,
        nutritionText: { ...complete.nutritionText, sugarGrams: token },
      },
      [{ width: 1000, height: 1000 }],
    );
    assert.equal(r.nutrition.sugarGrams, null);
    assert.ok(r.issues.length);
    assert.ok(r.issues.some((issue) => issue.startsWith("Gula:")));
    assert.ok(r.issues.every((issue) => !issue.includes("sugarGrams")));
  }
  const zero = normalizePhotoTranscription(
    {
      ...complete,
      nutritionText: { ...complete.nutritionText, sugarGrams: "0 g" },
    },
    [{ width: 1000, height: 1000 }],
  );
  assert.equal(zero.nutrition.sugarGrams, 0);
});
test("unknown column or mass/volume mismatch cannot become per-serving nutrition", () => {
  for (const overrides of [
    { basis: "UNKNOWN", basisText: null },
    { servingText: "250 ml" },
    { basisText: "%AKG" },
  ]) {
    const r = normalizePhotoTranscription({ ...complete, ...overrides }, [
      { width: 1000, height: 1000 },
    ]);
    assert.ok(Object.values(r.nutrition).every((v) => v === null));
  }
});
test("milligrams, kJ, and sub-gram three-decimal tokens preserve explicit units", () => {
  const r = normalizePhotoTranscription(
    {
      ...complete,
      servingText: "100 ml",
      basis: "PER_100_ML",
      basisText: "Per 100 ml",
      nutritionText: {
        ...complete.nutritionText,
        caloriesKcal: "418,4 kJ",
        sodiumMg: "0,045 g",
        proteinGrams: "2500 mg",
      },
    },
    [{ width: 1000, height: 1000 }],
  );
  assert.equal(r.nutrition.caloriesKcal, 100);
  assert.equal(r.nutrition.sodiumMg, 45);
  assert.equal(r.nutrition.proteinGrams, 2.5);
});
test("image preparation rejects low resolution and undecodable signature-only files", async () => {
  const tiny = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await assert.rejects(() => prepareLabelImage(tiny), /terlalu kecil/);
  const fake = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Buffer.alloc(30),
    Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]),
  ]);
  await assert.rejects(() => prepareLabelImage(fake), /tidak dapat dibaca/);
});
test("country export parsing retains quoted multiline fields and leading-zero identifiers", () => {
  assert.deepEqual(
    parseDelimited(
      'code\tname\n0089686010947\t"baris satu\nbaris dua ""kutip"""\n',
    ),
    [{ code: "0089686010947", name: 'baris satu\nbaris dua "kutip"' }],
  );
  assert.throws(
    () => parseDelimited('code\tname\n123\t"unfinished'),
    /Unterminated/,
  );
  assert.throws(() => parseDelimited("code\tname\n123\n"), /column count/);
});

test("local OCR refuses censored values, multiple columns and salt-to-sodium substitution", async () => {
  const { reviewFromLocalText, crossCheckPhoto } =
    await import("../src/core/ai/local-ocr");
  const images = [{ width: 1400, height: 1100 }];
  const text =
    "Takaran saji 25 g\nPer 100 g\nEnergi total 400 kkal\nGula <0,5 g\nProtein 10 g 3 g\nGaram 0,4 g\nLemak jenuh -2 g\nDietary fiber 8 g\nKomposisi: gandum, gula";
  const local = reviewFromLocalText(text, images);
  assert.equal(local.nutrition.sugarGrams, null);
  assert.equal(local.nutrition.proteinGrams, null);
  assert.equal(local.nutrition.sodiumMg, null);
  assert.equal(local.nutrition.saturatedFatGrams, null);
  assert.equal(local.nutrition.fiberGrams, 2);
  const checked = crossCheckPhoto(
    normalizePhotoTranscription(complete, images),
    text,
  );
  assert.equal(checked.nutrition.sugarGrams, null);
  assert.equal(checked.nutrition.caloriesKcal, 100);
  assert.equal(checked.engine, "GEMINI_CROSSCHECKED");
  const dual = reviewFromLocalText(
    "Takaran saji 25 g\nPer sajian | Per 100 g\nGula 12 g",
    images,
  );
  assert.ok(Object.values(dual.nutrition).every((value) => value === null));
});
