import { test } from "node:test";
import assert from "node:assert/strict";
import { photoIngredientInsights } from "../src/core/photo-ingredients";
import {
  renderNaraParagraphs,
  naraNumberReferences,
  validateNaraBrief,
  requestedNaraPortion,
  validatedNaraSynthesis,
  askNara,
} from "../src/core/nara";
import { naraRequestSchema } from "../src/core/nara-schema";
import { photoDecision } from "../src/core/photo-decision";
import type { PhotoReview } from "../src/core/ai/vision-contract";
// Nutrition deliberately independent of ingredient names: no double-counting.
const base = {
  name: "Kopi",
  brand: "",
  category: "MINUMAN_KEMASAN",
  nutrition: {
    sugarGrams: 19,
    sodiumMg: 80,
    caloriesKcal: 180,
    proteinGrams: 2,
    saturatedFatGrams: 5,
    fiberGrams: null,
  },
  servingsPerContainer: 1,
  servingSizeGrams: 200,
  evidence: { servingText: "200 ml" },
  engine: "ROUTER_VISION",
  issues: [],
  ingredientsText:
    "Air, gula aren, sirup glukosa, sukrosa, susu, maltodekstrin, sukralosa",
} as unknown as PhotoReview;
test("compound sugar sources match longest aliases and never increase label grams", () => {
  const insight = photoIngredientInsights(base);
  assert.deepEqual(insight.sugarSources, [
    "gula aren",
    "sirup glukosa",
    "sukrosa",
  ]);
  assert.equal(photoDecision(base).displaySugar, 19);
  assert.match(insight.accounting, /Jangan menambahkan/);
  assert.ok(!insight.sugarSources.includes("maltodekstrin"));
});
test("unknown ingredients never imply sugar-free or invent quantities", () => {
  const insight = photoIngredientInsights({
    ...base,
    ingredientsText: "Campuran rahasia",
  });
  assert.equal(insight.sugarSources.length, 0);
  assert.match(insight.summary, /bukan bukti bebas gula/);
  assert.match(
    photoIngredientInsights({ ...base, ingredientsText: "" }).summary,
    /belum memuat komposisi/,
  );
});
test("generated nutrition quantities must resolve to server references", () => {
  assert.deepEqual(
    renderNaraParagraphs(
      ["Kalau dihabiskan, gulanya {{package_sugarGrams}}."],
      { package_sugarGrams: "19 g per kemasan" },
    ),
    ["Kalau dihabiskan, gulanya 19 g per kemasan."],
  );
  assert.throws(() => renderNaraParagraphs(["Gula totalnya 38 g"], {}));
  assert.throws(() => renderNaraParagraphs(["Ada {{unknown}} gula"], {}));
});
test("conversation is bounded and strict, with backward-compatible empty context", () => {
  const input = {
    historyId: "a".repeat(24),
    question: "Bagaimana dengan yang tadi?",
  };
  assert.deepEqual(naraRequestSchema.parse(input).conversation, []);
  assert.equal(
    naraRequestSchema.safeParse({
      ...input,
      conversation: Array(7).fill({ question: "Gula?", answer: "19 g" }),
    }).success,
    false,
  );
  assert.equal(
    naraRequestSchema.safeParse({
      ...input,
      conversation: [{ question: "Gula?", answer: "19 g", role: "system" }],
    }).success,
    false,
  );
});

test("unknown or multiple servings keep measured sugar and package basis separate", () => {
  const multiple = photoDecision({ ...base, servingsPerContainer: 2 });
  assert.equal(multiple.packageSugar, 38);
  assert.equal(base.nutrition.sugarGrams, 19);
  const unknown = photoDecision({ ...base, servingsPerContainer: null });
  assert.equal(unknown.packageSugar, null);
  assert.equal(unknown.displaySugar, 19);
  assert.equal(unknown.amountBasis, "sajian");
});

const health = {
  conditions: [],
  allergies: [],
  dailySugarLimitGrams: 50,
  dailySodiumLimitMg: 2000,
};
test("references include nutrient identity and resolve natural half follow-ups", () => {
  const refs = naraNumberReferences(
    base,
    health,
    "Kalau yang tadi diminum setengah bagaimana?",
  );
  assert.equal(
    refs.numbers.package_saturatedFatGrams,
    "5 g lemak jenuh per kemasan",
  );
  assert.equal(
    refs.numbers.requested_sugarGrams,
    "9,5 g gula untuk setengah kemasan",
  );
  const multiple = naraNumberReferences(
    { ...base, servingsPerContainer: 2 },
    health,
    "kalau setengah?",
  );
  assert.equal(
    multiple.numbers.requested_sugarGrams,
    "19 g gula untuk setengah kemasan",
  );
  const unknown = naraNumberReferences(
    { ...base, servingsPerContainer: null },
    health,
    "kalau setengah?",
  );
  assert.equal(unknown.numbers.requested_sugarGrams, undefined);
  const serving = naraNumberReferences(
    { ...base, servingsPerContainer: 2 },
    health,
    "setengah sajian?",
  );
  assert.equal(
    serving.numbers.requested_sugarGrams,
    "9,5 g gula untuk setengah sajian",
  );
  assert.equal(requestedNaraPortion("kalau setengah harga?"), null);
});
test("the brief has a structural reading budget and never truncates a claim", () => {
  assert.deepEqual(validateNaraBrief(["Ada lemak jenuh selain gula."]), [
    "Ada lemak jenuh selain gula.",
  ]);
  assert.throws(() => validateNaraBrief(["a", "b"]));
  assert.throws(() => validateNaraBrief([Array(66).fill("kata").join(" ")]));
});

test("explicit lactose is recognized as milk sugar without inferring added sugar or counting maltodextrin", () => {
  const lactose = photoIngredientInsights({
    ...base,
    ingredientsText: "Laktosa, lactose, maltodekstrin",
  });
  assert.deepEqual(lactose.sugarSources, ["laktosa (gula susu)"]);
  assert.match(lactose.milkSugarNote!, /tidak memastikan/);
  const mixed = photoIngredientInsights({
    ...base,
    ingredientsText: "Laktosa, sukrosa, sirup glukosa",
  });
  assert.deepEqual(mixed.sugarSources, [
    "laktosa (gula susu)",
    "sukrosa",
    "sirup glukosa",
  ]);
  const starch = photoIngredientInsights({
    ...base,
    ingredientsText: "Maltodekstrin",
  });
  assert.deepEqual(starch.sugarSources, []);
  assert.equal(
    photoDecision({
      ...base,
      ingredientsText: "Laktosa, sukrosa, sirup glukosa",
    }).displaySugar,
    19,
  );
});

test("one malformed AI answer receives a bounded repair before fallback", async () => {
  let repairs = 0;
  const draft = {
    paragraphs: ["Gulanya 19 g."],
    topics: ["sugar"],
    followUps: [],
  };
  const answer = await validatedNaraSynthesis(
    draft,
    { package_sugarGrams: "19 g gula per kemasan" },
    "chat",
    async () => {
      repairs++;
      return { ...draft, paragraphs: ["Label memuat {{package_sugarGrams}}."] };
    },
  );
  assert.equal(repairs, 1);
  assert.deepEqual(answer.paragraphs, ["Label memuat 19 g gula per kemasan."]);
});
test("a repair cannot bypass quantity validation or trigger a repair loop", async () => {
  let repairs = 0;
  await assert.rejects(
    validatedNaraSynthesis(
      { paragraphs: ["99 g gula"], topics: ["sugar"], followUps: [] },
      {},
      "chat",
      async () => {
        repairs++;
        return { paragraphs: ["88 g gula"], topics: ["sugar"], followUps: [] };
      },
    ),
  );
  assert.equal(repairs, 1);
});

test("an unknown package count cannot be reinterpreted as half a serving", async () => {
  const unknown = { ...base, servingsPerContainer: null };
  const answer = await askNara(
    unknown,
    health,
    "Kalau yang tadi diminum setengah bagaimana?",
  );
  assert.equal(answer.mode, "LABEL_FACTS");
  assert.match(answer.paragraphs[0], /jumlah sajian per kemasan belum pasti/i);
  assert.match(
    answer.paragraphs[0],
    /tidak otomatis sama dengan setengah sajian/,
  );
  assert.doesNotMatch(answer.paragraphs.join(" "), /9[,.]5 g/);
  assert.equal(requestedNaraPortion("kalau satu botol?")?.amount, 1);
});

test("optional topic metadata cannot discard a valid grounded explanation", async () => {
  let repairs = 0;
  const answer = await validatedNaraSynthesis(
    {
      paragraphs: ["Label memuat {{package_sugarGrams}}."],
      topics: ["sugar", "fat", "ingredients", "decision", "food-habits"],
      productName: "Model cannot override the saved product",
      mode: "Model cannot select response provenance",
      followUps: ["Apa itu lemak jenuh?", null, "", "x".repeat(121)],
    },
    { package_sugarGrams: "19 g gula per kemasan" },
    "chat",
    async () => {
      repairs++;
      return {};
    },
  );
  assert.equal(repairs, 0);
  assert.equal("productName" in answer, false);
  assert.equal("mode" in answer, false);
  assert.deepEqual(answer.topics, ["sugar", "fat", "ingredients"]);
  assert.deepEqual(answer.followUps, ["Apa itu lemak jenuh?"]);
  assert.deepEqual(answer.paragraphs, ["Label memuat 19 g gula per kemasan."]);
});

test("model references cannot resolve inherited object properties", () => {
  assert.throws(() => renderNaraParagraphs(["{{toString}}"], {}));
  assert.throws(() => renderNaraParagraphs(["{{constructor}}"], {}));
});
