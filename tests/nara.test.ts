import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhotoTranscription } from "../src/core/ai/vision-contract";
import { askNara, directNaraTopics, naraFacts } from "../src/core/nara";
import { naraRequestSchema } from "../src/core/nara-schema";
const review = normalizePhotoTranscription(
  {
    productName: "Cappuccino",
    brand: "Golda",
    category: "MINUMAN_KEMASAN",
    servingText: "200 ml",
    servingsPerContainerText: "1 Sajian Per Kemasan",
    basis: "PER_SERVING",
    basisText: "Per sajian",
    nutritionText: {
      caloriesKcal: "180 kkal",
      sugarGrams: "19 g",
      sodiumMg: "80 mg",
      proteinGrams: "2 g",
      saturatedFatGrams: "5 g",
      fiberGrams: null,
    },
    ingredientsText: "",
    unreadableFields: [],
  },
  [{ width: 398, height: 502 }],
);
const health = {
  conditions: [],
  allergies: [],
  dailySugarLimitGrams: 50,
  dailySodiumLimitMg: 2000,
  maxSnackBudgetIdr: 20000,
};
test("Nara calculates package facts and never turns unavailable fiber into zero", async () => {
  const a = await askNara(review, health, "Kalau habis satu botol?");
  assert.equal(a.mode, "LABEL_FACTS");
  assert.match(a.paragraphs[0], /19 g/);
  assert.match(a.paragraphs[0], /80 mg/);
  assert.match(naraFacts(review, health).fiber, /belum terbaca/);
  assert.doesNotMatch(naraFacts(review, health).fiber, /0 g/);
  const unknown = { ...review, servingsPerContainer: null };
  assert.match(naraFacts(unknown, health).portion, /belum dapat menghitung/);
});
test("Nara retains medical and allergy uncertainty and validates bounded input", () => {
  assert.deepEqual(
    directNaraTopics("Aman untuk diabetes dan apa dosis obatnya?"),
    ["limits", "decision"],
  );
  assert.match(naraFacts(review, health).allergy, /bukan bukti bebas alergen/);
  assert.match(
    naraFacts(review, health).profile,
    /gula alami, tambahan dan gula bebas/,
  );
  assert.equal(
    naraRequestSchema.safeParse({
      historyId: "a".repeat(24),
      question: "a".repeat(501),
    }).success,
    false,
  );
  assert.equal(
    naraRequestSchema.safeParse({ historyId: "other", question: "Gula?" })
      .success,
    false,
  );
});

test("Nara computes a requested half package from declared serving count", async () => {
  const a = await askNara(review, health, "Kalau setengah botol?");
  assert.match(a.paragraphs[0], /9,5 g/);
  assert.match(a.paragraphs[0], /40 mg/);
});

test("Nara distinguishes an explicit reader conflict from an absent sugar row", () => {
  const conflicted = {
    ...review,
    nutrition: { ...review.nutrition, sugarGrams: null },
    issues: [
      "Gula: dua pembaca belum sepakat; cocokkan angka langsung dengan foto.",
    ],
  };
  assert.match(naraFacts(conflicted, health).sugar, /Dua pembacaan visual/);
  assert.doesNotMatch(naraFacts(conflicted, health).sugar, /Gula totalnya 19/);
});

test("Nara answers mixed nutrient questions and explicit package quantities", async () => {
  const mixed = await askNara(review, health, "Gulanya dan natriumnya berapa?");
  assert.deepEqual(mixed.topics, ["sugar", "sodium"]);
  assert.match(mixed.paragraphs.join(" "), /19 g/);
  assert.match(mixed.paragraphs.join(" "), /80 mg/);
  const two = await askNara(review, health, "Kalau dua botol?");
  assert.match(two.paragraphs[0], /38 g/);
  assert.match(two.paragraphs[0], /160 mg/);
  const unknown = await askNara(
    { ...review, servingsPerContainer: null },
    health,
    "Kalau 2 botol?",
  );
  assert.match(unknown.paragraphs[0], /belum dapat menghitung/);
});
