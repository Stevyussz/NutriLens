import { test } from "node:test";
import assert from "node:assert/strict";
import {
  candidateMatch,
  manufacturerRecords,
  compareCatalogue,
} from "../src/core/product-research";
import { normalizePhotoTranscription } from "../src/core/ai/vision-contract";
import type { CatalogueProduct } from "../src/core/db/catalogue";
test("identity matching tolerates spelling but distinguishes brand-only and unverified variants", () => {
  const input = { name: "Coffee Cappuccino", brand: "Golda" };
  assert.equal(
    candidateMatch(input, "Golda Coffee cappuchino", "wingsfood"),
    "NAME_VARIANT",
  );
  assert.equal(
    candidateMatch(input, "Golda Dolce Latte", "Wings"),
    "BRAND_ONLY",
  );
  assert.equal(
    candidateMatch(input, "Different Cappuccino", "Other"),
    "NAME_ONLY",
  );
  assert.equal(candidateMatch(input, "Different Latte", "Other"), null);
});
test("manufacturer parser reads public records without evaluating embedded scripts, including text frames", () => {
  const record = {
    slug: "golda-coffee",
    title: "Golda Coffee",
    description: "<p>Brand description</p>",
    updatedAt: "2026-07-29T03:01:36.988Z",
  };
  const wire = "1:T3,abc2:" + JSON.stringify({ data: [record] }) + "\n";
  const html =
    '<script>throw Error("must not execute")</script><script>self.__next_f.push([1,' +
    JSON.stringify(wire) +
    "])</script>";
  const found = manufacturerRecords(html);
  assert.equal(found.length, 1);
  assert.equal(found[0].title, "Golda Coffee");
  assert.equal(found[0].description, "Brand description");
});
test("research compares compatible servings, exposes disagreement and never fills missing label facts", () => {
  const review = normalizePhotoTranscription(
    {
      productName: "Coffee Cappuccino",
      brand: "Golda",
      category: "MINUMAN_KEMASAN",
      servingText: "200 ml",
      basis: "PER_SERVING",
      basisText: "Per sajian",
      nutritionText: {
        caloriesKcal: "180 kkal",
        sugarGrams: "19 g",
        proteinGrams: "2 g",
        sodiumMg: "80 mg",
        saturatedFatGrams: "5 g",
        fiberGrams: null,
      },
      ingredientsText: "",
      unreadableFields: [],
    },
    [{ width: 398, height: 502 }],
  );
  const product = {
    servingSizeGrams: 200,
    servingUnit: "ml",
    nutrition: { ...review.nutrition, sugarGrams: 20, fiberGrams: 5 },
  } as CatalogueProduct;
  const compared = compareCatalogue(review, product);
  assert.ok(compared.differences.some((s) => s.startsWith("Gula berbeda")));
  assert.ok(compared.agreements.some((s) => s.startsWith("Natrium sesuai")));
  assert.equal(review.nutrition.sugarGrams, 19);
  assert.equal(review.nutrition.fiberGrams, null);
  const mismatched = compareCatalogue(review, { ...product, servingUnit: "g" });
  assert.equal(mismatched.agreements.length, 0);
  assert.ok(mismatched.differences.some((s) => s.includes("belum sebanding")));
});
