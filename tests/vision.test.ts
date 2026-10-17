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
    if (token !== null) {
      assert.ok(r.issues.length);
      assert.ok(r.issues.some((issue) => issue.startsWith("Gula:")));
    }
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

test("Golda label: missing local OCR rows do not erase explicit vision values; sodium alias is recognised", async () => {
  const { crossCheckPhoto, reviewFromLocalText } =
    await import("../src/core/ai/local-ocr");
  const evidence = {
    ...complete,
    productName: "Golda Coffee Cappuccino",
    category: "MINUMAN_KEMASAN",
    servingText: "200 ml",
    basis: "PER_SERVING",
    basisText: "JUMLAH PER SAJIAN",
    ingredientsText: "",
    nutritionText: {
      caloriesKcal: "180 kkal",
      sugarGrams: "19 g",
      proteinGrams: "2 g",
      sodiumMg: "80 mg",
      saturatedFatGrams: "5 g",
      fiberGrams: null,
    },
  };
  const review = normalizePhotoTranscription(evidence, [
    { width: 398, height: 502 },
  ]);
  const checked = crossCheckPhoto(
    review,
    "Takaran Saji 200 ml (1 Botol)\nJUMLAH PER SAJIAN\nEnergi Total 180kkal\nProtein 2g\nGaram (Natrium) 80mg 5%\nLemak Jenuh 5g 25%",
  );
  assert.equal(checked.nutrition.sugarGrams, 19);
  assert.equal(checked.nutrition.sodiumMg, 80);
  assert.equal(checked.nutrition.fiberGrams, null);
  assert.ok(!checked.issues.some((i) => i.startsWith("Serat:")));
  assert.equal(
    reviewFromLocalText(
      "Takaran Saji 200ml\nPer sajian\nGaram 80mg",
      review.images,
    ).nutrition.sodiumMg,
    null,
  );
  const conflict = crossCheckPhoto(
    review,
    "Takaran Saji 200ml\nPer sajian\nGula 29g",
  );
  assert.equal(conflict.nutrition.sugarGrams, null);
  assert.equal(conflict.nutrition.sodiumMg, 80);
});

test("corrupt Golda OCR cannot turn trailing 7 g into a conflict with 19 g", async () => {
  const { readFile } = await import("node:fs/promises");
  const { reviewFromLocalText, crossCheckPhoto, reconcilePhotoReading } =
    await import("../src/core/ai/local-ocr");
  const sample = JSON.parse(
    await readFile("tests/fixtures/golda-corrupt-local-ocr.json", "utf8"),
  );
  const review = normalizePhotoTranscription(sample.evidence, [
    { width: 1020, height: 1282 },
  ]);
  assert.equal(review.nutrition.sugarGrams, 19);
  assert.equal(
    reviewFromLocalText(sample.rawText, review.images).nutrition.sugarGrams,
    null,
  );
  const checked = crossCheckPhoto(review, sample.rawText);
  assert.equal(checked.nutrition.sugarGrams, 19);
  const { readingVersion, ...old } = review;
  const legacy = {
    ...old,
    engine: "ROUTER_CROSSCHECKED" as const,
    rawText: sample.rawText,
    nutrition: { ...old.nutrition, sugarGrams: null },
    issues: [
      ...old.issues,
      "Gula: dua pembaca belum sepakat; cocokkan angka langsung dengan foto.",
    ],
  };
  assert.equal(reconcilePhotoReading(legacy).nutrition.sugarGrams, 19);
  assert.equal(
    reconcilePhotoReading({ ...legacy, userCorrected: true }).nutrition
      .sugarGrams,
    null,
  );
  const conflict = crossCheckPhoto(review, "Per sajian\nGula 29 g");
  assert.equal(conflict.nutrition.sugarGrams, null);
  for (const row of [
    'Gula 199 "7 g',
    "Gula angka 7 g",
    "Gula 19 g 7 g",
    "Gula 19 7g",
  ]) {
    assert.equal(
      reviewFromLocalText("Per sajian\n" + row, review.images).nutrition
        .sugarGrams,
      null,
    );
    assert.equal(
      crossCheckPhoto(review, "Per sajian\n" + row).nutrition.sugarGrams,
      19,
    );
  }
  assert.equal(
    reviewFromLocalText("Per sajian\nGula: 19 g 4%", review.images).nutrition
      .sugarGrams,
    19,
  );
});

test("auxiliary OCR has a shared deadline and releases capacity after abort", async () => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { transcribeLocally } = await import("../src/core/ai/local-ocr");
  const dir = await mkdtemp(join(tmpdir(), "ocr-budget-test-"));
  const bin = join(dir, "slow-reader");
  const old = process.env.TESSERACT_BIN;
  try {
    await writeFile(
      bin,
      `#!${process.execPath}\nsetTimeout(()=>console.log('Per sajian\\nGula 19 g'),1000);\n`,
      { mode: 0o700 },
    );
    process.env.TESSERACT_BIN = bin;
    await assert.rejects(
      () => transcribeLocally([{ bytes: Buffer.from("test") }], 25),
      /abort/i,
    );
    await assert.rejects(
      () => transcribeLocally([{ bytes: Buffer.from("test") }], 25),
      /abort/i,
    );
  } finally {
    if (old === undefined) delete process.env.TESSERACT_BIN;
    else process.env.TESSERACT_BIN = old;
    await rm(dir, { recursive: true, force: true });
  }
});
