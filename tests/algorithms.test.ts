import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { calculateDeceptionAndSplittingMetrics } from "../src/core/algorithms/sugar-splitting";
import { classifyNovaGroup } from "../src/core/algorithms/nova-classifier";
import { scoreNutrition } from "../src/core/algorithms/nutrition-scorer";
import {
  parseIngredients,
  parseLocalLabelText,
} from "../src/core/ai/local-parser";
import { presetProducts } from "../src/core/db/presets";
import {
  dictionaryData,
  mergeDictionaryData,
} from "../src/core/db/dictionary-data";
import { deterministicVerdict } from "../src/core/ai/contextual-reranker";
import { defaultHealth, chemicalSchema } from "../src/core/db/collections";
import { validateImage } from "../src/core/security/file-validator";
import { enforceRateLimit } from "../src/core/security/rate-limiter";
import { scanCacheKey } from "../src/core/scan-engine";

test("geometric weights sum to 100, consolidation conserves weight and detects splitting", () => {
  const ingredients = parseIngredients(
    "gandum, gula, dekstrosa, madu, sirup glukosa, kakao",
  ).map((i, idx) => ({
    ...i,
    functionalCategory:
      idx >= 1 && idx <= 4
        ? ("HIDDEN_SUGAR" as const)
        : ("WHOLE_FOOD" as const),
  }));
  const result = calculateDeceptionAndSplittingMetrics(ingredients);
  assert.ok(
    Math.abs(
      result.weightedIngredients.reduce((s, i) => s + i.estimatedWeight, 0) -
        100,
    ) < 1e-10,
  );
  assert.equal(result.isSugarSplittingDetected, true);
  assert.equal(result.consolidatedRank[0].isSugar, true);
  assert.ok(
    Math.abs(result.consolidatedRank.reduce((s, i) => s + i.weight, 0) - 100) <
      1e-10,
  );
  assert.ok(result.manipulationScore >= 0 && result.manipulationScore <= 100);
});
test("single sugar and empty ingredients never produce false splitting or NaN", () => {
  assert.equal(
    calculateDeceptionAndSplittingMetrics([]).totalEstimatedSugarWeight,
    0,
  );
  const single = [
    {
      ...parseIngredients("gula")[0],
      functionalCategory: "HIDDEN_SUGAR" as const,
    },
  ];
  assert.equal(
    calculateDeceptionAndSplittingMetrics(single).isSugarSplittingDetected,
    false,
  );
  assert.equal(classifyNovaGroup(single), 2);
});
test("explicit label percentages remain authoritative", () => {
  const ingredients = parseIngredients("gandum 80%, sukrosa 10%, madu 2%").map(
    (i, idx) => ({
      ...i,
      functionalCategory: idx
        ? ("HIDDEN_SUGAR" as const)
        : ("WHOLE_FOOD" as const),
    }),
  );
  const result = calculateDeceptionAndSplittingMetrics(ingredients);
  assert.equal(result.firstIngredientWeight, 80);
  assert.equal(result.totalEstimatedSugarWeight, 12);
  assert.equal(result.isSugarSplittingDetected, false);
});
test("nested composition expands in order without assigning parent mass to each child", () => {
  const parsed = parseIngredients(
    "gandum, cokelat (gula, kakao, krimer (susu, lesitin)), garam",
  );
  assert.deepEqual(
    parsed.map((i) => i.orderIndex),
    [0, 1, 2, 3, 4, 5],
  );
  assert.ok(parsed[1].rawName.includes("gula"));
  assert.equal(parsed[4].canonicalChemicalName, "lesitin");
  assert.throws(() => parseIngredients("gula, susu (kakao"));
  assert.throws(() => parseIngredients("gula)"));
  assert.equal(parseIngredients("gula 12,5%, air")[0].explicitPercentage, 12.5);
});
test("NOVA heuristic distinguishes whole foods and cosmetic additives", () => {
  assert.equal(classifyNovaGroup(parseIngredients("air")), 1);
  assert.equal(
    classifyNovaGroup([
      { ...parseIngredients("lesitin")[0], functionalCategory: "EMULSIFIER" },
    ]),
    4,
  );
});
test("zero protein produces null price ratio; missing GI never fabricates GL", () => {
  const p = presetProducts()[0];
  p.nutrition.proteinGrams = 0;
  const score = scoreNutrition(p, []);
  assert.equal(score.costPerGramProteinIdr, null);
  assert.equal(score.sugarOnlyGlycemicLoadProxy, null);
});
test("dictionary exceeds 60 real names and has normalized unique aliases per entry", () => {
  const data = dictionaryData();
  assert.ok(data.length >= 60);
  assert.equal(new Set(data.map((c) => c.canonicalName)).size, data.length);
  for (const c of data) assert.equal(c.aliases.length, new Set(c.aliases).size);
});
test("medical envelope avoids declared allergy and excessive daily serving", () => {
  const p = presetProducts()[0];
  assert.equal(
    deterministicVerdict(p, { ...defaultHealth, allergies: ["gandum"] }, [], [])
      .medicalStatus,
    "HINDARI",
  );
  p.nutrition.sodiumMg = 2100;
  assert.equal(
    deterministicVerdict(p, defaultHealth, [], []).medicalStatus,
    "HINDARI",
  );
});
test("image validation rejects renamed HTML, broken signatures and oversize payloads", () => {
  assert.throws(() =>
    validateImage(Buffer.from("<html><script>alert(1)</script></html>")),
  );
  assert.throws(() => validateImage(new Uint8Array(6 * 1024 * 1024)));
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1EAAAAASUVORK5CYII=",
    "base64",
  );
  assert.equal(validateImage(png), "image/png");
});
test("sliding window rejects the first request beyond the budget", () => {
  const key = `test-${crypto.randomUUID()}`;
  enforceRateLimit(key, 2);
  enforceRateLimit(key, 2);
  assert.throws(() => enforceRateLimit(key, 2), /Terlalu banyak/);
});
test("cache differs for allergies, budget, corpus revision and configured AI model", () => {
  const base = scanCacheKey("label", defaultHealth);
  assert.notEqual(
    base,
    scanCacheKey("label", { ...defaultHealth, allergies: ["susu"] }),
  );
  assert.notEqual(
    base,
    scanCacheKey("label", { ...defaultHealth, maxSnackBudgetIdr: 5000 }),
  );
  assert.notEqual(base, scanCacheKey("label", defaultHealth, "2"));
  const savedKey = process.env.GEMINI_API_KEY;
  const savedModel = process.env.GEMINI_MODEL;
  try {
    process.env.GEMINI_API_KEY = "test-key-no-network-call";
    process.env.GEMINI_MODEL = "gemini-2.5-flash";
    const olderModel = scanCacheKey("label", defaultHealth);
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    assert.notEqual(olderModel, scanCacheKey("label", defaultHealth));
  } finally {
    if (savedKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = savedKey;
    if (savedModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = savedModel;
  }
});
test("local text parsing requires every nutrient and accepts explicit numerical zero", () => {
  const text =
    "Nama: Label pengujian\nKategori: SEREAL_SARAPAN\nHarga: 8000\nSajian: 40\nEnergi: 160\nGula: 12\nProtein: 4\nNatrium: 100\nLemak jenuh: 1\nSerat: 0\nKomposisi: gandum, sukrosa";
  assert.equal(parseLocalLabelText(text, "test-text").nutrition.fiberGrams, 0);
  assert.throws(
    () => parseLocalLabelText(text.replace("Serat: 0", ""), "test-text"),
    /serat/,
  );
});

test("bulk provider dictionary retains provenance and local rules preserve multilingual aliases", async () => {
  const provider = z
    .array(chemicalSchema)
    .parse(
      JSON.parse(
        await readFile(
          new URL("../data/dictionary.snapshot.json", import.meta.url),
          "utf8",
        ),
      ),
    );
  assert.ok(provider.length >= 7000);
  assert.ok(
    provider.every((row) =>
      row.provider?.url.startsWith("https://static.openfoodfacts.org/"),
    ),
  );
  const merged = mergeDictionaryData(provider, dictionaryData());
  assert.ok(merged.length >= 7000);
  const msg = merged.find(
    (row) => row.canonicalName === "mononatrium glutamat",
  );
  assert.ok(msg?.aliases.includes("monosodium glutamate"));
  assert.ok(msg?.provider);
  assert.equal(msg?.functionalCategory, "SODIUM_ADDITIVE");
  const sugar = merged.find((row) => row.canonicalName === "sukrosa");
  assert.equal(sugar?.glycemicIndex, 65);
});
