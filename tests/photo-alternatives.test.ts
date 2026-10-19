import { test } from "node:test";
import assert from "node:assert/strict";
import { priceReview } from "./fixtures/price-review";
import { defaultHealth } from "../src/core/db/collections";
import {
  catalogueSchema,
  type CatalogueProduct,
} from "../src/core/db/catalogue";
import {
  rankAlternatives,
  liveCatalogueProduct,
  scannedAlternative,
  alternativePriceProduct,
} from "../src/core/photo-alternatives";
import { allergyConflict } from "../src/core/food-allergy-match";
import { askNara, renderNaraParagraphs } from "../src/core/nara";
const now = new Date().toISOString();
function row(overrides: Partial<CatalogueProduct> = {}): CatalogueProduct {
  return {
    providerCode: "8991234567890",
    name: "Kopi susu pembanding 250 ml",
    brand: "Contoh uji",
    category: "MINUMAN_KEMASAN",
    servingSizeGrams: 250,
    servingUnit: "ml",
    ingredientsText: "Air, susu, kopi",
    nutrition: {
      caloriesKcal: 50,
      sugarGrams: 4,
      sodiumMg: 20,
      saturatedFatGrams: 1,
      proteinGrams: 1,
      fiberGrams: null,
    },
    nutritionBasis: "PER_100_ML",
    countries: ["en:indonesia"],
    origins: [],
    manufacturingPlaces: [],
    allergens: ["en:milk"],
    labels: [],
    additives: [],
    missingFields: [],
    referenceEligible: false,
    sourceUrl: `https://world.openfoodfacts.org/product/${overrides.providerCode ?? "8991234567890"}`,
    retrievedAt: now,
    normalizationVersion: 2,
    ...overrides,
  };
}
test("recommendations compare equal liquid quantities, show named evidence and keep unknowns nullable", () => {
  const result = rankAlternatives(priceReview, defaultHealth, [row()]);
  assert.equal(result.status, "FOUND");
  const p = result.candidates[0];
  assert.equal(p.sugarGrams, 8);
  assert.equal(p.originalSugarGrams, 19);
  assert.equal(p.comparisonSize, 200);
  assert.equal(p.packageQuantity, 250);
  assert.equal(p.sodiumMg, 40);
  assert.match(p.sourceUrl, /899123/);
  assert.equal(result.lessons.length, 3);
});
test("legacy imported values are already per serving; migration is idempotent and v2 per100 values remain per100", () => {
  const legacy = {
    ...row(),
    normalizationVersion: undefined,
    nutritionBasis: "PER_100_ML",
    servingSizeGrams: 240,
    nutrition: { ...row().nutrition, sugarGrams: 43.2 },
  };
  const parsed = catalogueSchema.parse(legacy);
  assert.equal(parsed.nutritionBasis, "PER_SERVING");
  assert.equal(parsed.nutrition.sugarGrams, 43.2);
  assert.deepEqual(catalogueSchema.parse(parsed), parsed);
  assert.equal(catalogueSchema.parse(row()).nutritionBasis, "PER_100_ML");
  assert.equal(
    rankAlternatives(priceReview, defaultHealth, [parsed]).candidates.length,
    0,
  );
});
test("powders, wrong unit, same variant, stale/foreign/unknown nutrition cannot become substitutes", () => {
  for (const p of [
    row({
      name: "Kopi bubuk 250 g",
      servingUnit: "g",
      nutritionBasis: "PER_100_G",
    }),
    row({ name: "Tea drink 250 ml" }),
    row({ name: "Coffee Dolce Latte", brand: "Golda" }),
    row({ countries: ["en:france"] }),
    row({ retrievedAt: "2020-01-01T00:00:00Z" }),
    row({ nutritionBasis: "UNKNOWN" }),
    row({ nutrition: { ...row().nutrition, sugarGrams: null } }),
  ])
    assert.equal(
      rankAlternatives(priceReview, defaultHealth, [p]).candidates.length,
      0,
    );
});
test("allergy synonyms and missing composition exclude candidates, never infer allergen-free", () => {
  assert.ok(allergyConflict("en:milk", ["susu"]));
  assert.ok(allergyConflict("en:eggs", ["telur"]));
  assert.ok(allergyConflict("en:soybeans", ["kedelai"]));
  assert.ok(allergyConflict("whey", ["susu sapi"]));
  assert.equal(allergyConflict("eggplant", ["egg"]), false);
  const health = { ...defaultHealth, allergies: ["susu"] };
  assert.equal(
    rankAlternatives({ ...priceReview, ingredientsText: "" }, health, [row()])
      .candidates.length,
    0,
  );
  assert.equal(
    rankAlternatives(
      { ...priceReview, ingredientsText: "milk, coffee" },
      health,
      [row()],
    ).status,
    "ALLERGY_ALERT",
  );
  assert.equal(
    rankAlternatives(priceReview, health, [
      row({ ingredientsText: "", allergens: [] }),
    ]).candidates.length,
    0,
  );
});
test("lower sugar does not hide higher sodium/saturated fat or lower protein", () => {
  const bad = row({
    providerCode: "8991234567891",
    nutrition: {
      ...row().nutrition,
      sugarGrams: 1,
      sodiumMg: 500,
      saturatedFatGrams: 5,
      proteinGrams: 0,
    },
  });
  const result = rankAlternatives(priceReview, defaultHealth, [bad, row()]);
  assert.equal(result.candidates[0].id, row().providerCode);
  assert.match(
    result.candidates[1].tradeoffs.join(" "),
    /Natrium lebih tinggi/,
  );
  assert.match(
    result.candidates[1].tradeoffs.join(" "),
    /Protein lebih rendah/,
  );
});
test("conflicting catalogue versions and physically impossible nutrient densities are excluded", () => {
  assert.equal(
    rankAlternatives(priceReview, defaultHealth, [
      row(),
      row({ nutrition: { ...row().nutrition, sugarGrams: 7 } }),
    ]).candidates.length,
    0,
  );
  assert.equal(
    rankAlternatives(priceReview, defaultHealth, [
      row({ nutrition: { ...row().nutrition, proteinGrams: 120 } }),
    ]).candidates.length,
    0,
  );
});
test("missing glucose/serving basis never produces a buy recommendation", () => {
  assert.equal(
    rankAlternatives(
      {
        ...priceReview,
        nutrition: { ...priceReview.nutrition, sugarGrams: null },
      },
      defaultHealth,
      [row()],
    ).status,
    "NEED_LABEL",
  );
  assert.equal(
    rankAlternatives(
      { ...priceReview, servingSizeGrams: null },
      defaultHealth,
      [row()],
    ).candidates.length,
    0,
  );
});
test("live records retain explicit unit and package dimensions without mixing serving and100ml nutrients", () => {
  const p = liveCatalogueProduct(
    {
      code: "8991234567890",
      product_name: "Kopi siap minum",
      brands: "Uji",
      serving_size: "200 ml",
      product_quantity: 250,
      product_quantity_unit: "ml",
      countries_tags: ["en:indonesia"],
      nutriments: { sugars_serving: 8, sugars_100g: 4, sodium_100g: 0.02 },
    },
    now,
  )!;
  assert.equal(p.nutritionBasis, "PER_SERVING");
  assert.equal(p.nutrition.sugarGrams, 8);
  assert.equal(p.nutrition.sodiumMg, null);
  assert.equal(p.packageQuantity, 250);
  assert.equal(
    liveCatalogueProduct(
      {
        code: "8991234567890",
        product_name: "Kopi",
        serving_size: "200 ml",
        product_quantity_unit: "g",
      },
      now,
    ),
    null,
  );
});
test("own photo comparisons preserve owner-scoped source, normalize serving sizes, and exclude legacy OCR", () => {
  const other = {
    ...structuredClone(priceReview),
    name: "Kopi lain",
    brand: "Foto uji",
    servingSizeGrams: 100,
    servingsPerContainer: 3,
    nutrition: {
      ...priceReview.nutrition,
      sugarGrams: 3,
      saturatedFatGrams: 1,
    },
  };
  const p = scannedAlternative(
    priceReview,
    other,
    defaultHealth,
    "0123456789abcdef01234567",
    now,
  )!;
  assert.equal(p.sugarGrams, 6);
  assert.equal(p.packageQuantity, 300);
  assert.equal(p.sourceKind, "OWN_SCAN");
  assert.equal(p.barcode, null);
  assert.match(p.sourceUrl, /history=012345/);
  assert.equal(
    alternativePriceProduct(p, priceReview.category).evidence.servingText,
    "300 ml",
  );
  assert.equal(
    scannedAlternative(
      priceReview,
      { ...other, engine: "LOCAL_OCR" },
      defaultHealth,
      "0123456789abcdef01234567",
      now,
    ),
    null,
  );
});
test("package pricing cannot silently turn a multipack or an unknown unit into a single bottle", () => {
  const bundle = rankAlternatives(priceReview, defaultHealth, [
    row({ name: "Kopi susu 2x250ml" }),
  ]).candidates[0];
  assert.equal(bundle.packageQuantity, null);
  const partial = rankAlternatives(priceReview, defaultHealth, [
    row({ packageQuantity: 500, packageUnit: null }),
  ]).candidates[0];
  assert.equal(partial.packageQuantity, null);
  assert.equal(partial.packageUnit, null);
  const noSize = rankAlternatives(priceReview, defaultHealth, [
    row({
      name: "Kopi susu pembanding",
      packageQuantity: null,
      packageUnit: null,
    }),
  ]).candidates[0];
  assert.equal(
    alternativePriceProduct(noSize, priceReview.category).servingsPerContainer,
    null,
  );
});
test("the sourced Indonesian snapshot can produce a real named coffee-style alternative without inventing data", async () => {
  const { readFile } = await import("node:fs/promises");
  const raw = JSON.parse(
    await readFile("data/catalogue.snapshot.json", "utf8"),
  ) as unknown[];
  const rows = raw.flatMap((p) => {
    const v = catalogueSchema.safeParse(p);
    return v.success ? [v.data] : [];
  });
  const result = rankAlternatives(priceReview, defaultHealth, rows);
  const oat = result.candidates.find((p) => p.id === "8997240601154");
  assert.ok(oat);
  assert.equal(oat.name, "Caramel Macchiato Oat Milk");
  assert.equal(oat.sugarGrams, 14);
  assert.equal(oat.originalSugarGrams, 19);
  assert.equal(oat.unit, "ml");
  assert.equal(oat.packageQuantity, null);
  assert.match(oat.tradeoffs.join(" "), /Komposisi belum tersedia/);
  const answer = await askNara(priceReview, defaultHealth, "Sebaiknya ganti produk apa?", [], undefined, [], "chat", result);
  assert.match(answer.paragraphs.join(" "), /14 g gula.*19 g.*200 ml/);
  assert.match(answer.paragraphs.join(" "), /Komposisi belum tersedia/);
  assert.deepEqual(renderNaraParagraphs(["Bandingkan {{alternative_first_sugar}}."], { alternative_first_sugar: "14 g gula pada 200 ml" }), ["Bandingkan 14 g gula pada 200 ml."]);
  assert.equal(
    rankAlternatives(
      priceReview,
      { ...defaultHealth, allergies: ["susu"] },
      rows,
    ).candidates.some((p) => p.id === oat.id),
    false,
  );
});
