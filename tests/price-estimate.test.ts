import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchingPriceObservations,
  modelPriceInterval,
  pricePackage,
  priceAnswer,
} from "../src/core/price-estimate";
import { priceEstimateSchema } from "../src/core/price-estimate-schema";
import { askNara } from "../src/core/nara";
import { defaultHealth } from "../src/core/db/collections";
import { priceReview } from "./fixtures/price-review";
const row = {
  id: 1,
  product_code: "8992775913000",
  price: 3500,
  currency: "IDR",
  date: "2026-10-18",
  proof_id: 1,
  duplicate_of: null,
  price_per: null,
  price_is_discounted: false,
  product: {
    code: "8992775913000",
    product_name: "Golda Coffee Dolce Latte",
    brands: "Golda",
    product_quantity: 200,
    product_quantity_unit: "ml",
  },
  location: { osm_display_name: "Toko fixture" },
};
test("price evidence requires matching variant, full package, currency, proof and recent date", () => {
  assert.equal(
    matchingPriceObservations(priceReview, [row], "2026-10-18").length,
    1,
  );
  for (const bad of [
    {
      ...row,
      product: {
        ...row.product,
        product_name: "Golda Coffee Dolce Latte 200 ml isi 12 botol",
      },
    },
    { ...row, currency: "EUR" },
    { ...row, date: "2024-01-01" },
    { ...row, proof_id: null },
    { ...row, price_per: "KILOGRAM" },
    { ...row, product: { ...row.product, product_name: "Golda Cappuccino" } },
    { ...row, product: { ...row.product, product_quantity: 2400 } },
    { ...row, product: { ...row.product, product_quantity_unit: "g" } },
  ])
    assert.equal(
      matchingPriceObservations(priceReview, [bad], "2026-10-18").length,
      0,
    );
  assert.equal(
    pricePackage({ ...priceReview, servingsPerContainer: null }),
    null,
  );
  assert.equal(
    matchingPriceObservations({ ...priceReview, name: "" }, [row], "2026-10-18")
      .length,
    0,
  );
});
test("model estimates reject zero, inverted, absent and implausibly broad intervals", () => {
  assert.deepEqual(
    modelPriceInterval({ available: true, lowIdr: 3000, highIdr: 5000 }),
    { lowIdr: 3000, highIdr: 5000 },
  );
  for (const bad of [
    { available: false, lowIdr: 3000, highIdr: 5000 },
    { available: true, lowIdr: 0, highIdr: 5000 },
    { available: true, lowIdr: 5000, highIdr: 3000 },
    { available: true, lowIdr: 100, highIdr: 1000000 },
    { available: true, lowIdr: null, highIdr: null },
  ])
    assert.equal(modelPriceInterval(bad), null);
});
test("Nara preserves estimate provenance instead of presenting a retailer or cheapest claim", async () => {
  const price = priceEstimateSchema.parse({
    mode: "AI_ESTIMATE",
    lowIdr: 3000,
    highIdr: 5000,
    packageText: "200 ml / kemasan",
    checkedAt: "2026-10-18T00:00:00Z",
    internetStatus: "CHECKED",
    sources: [],
    note: "Perkiraan AI, belum didukung harga toko yang cocok.",
  });
  const answer = await askNara(
    priceReview,
    defaultHealth,
    "Harga kira-kira berapa?",
    [],
    price,
  );
  assert.deepEqual(answer.topics, ["sources"]);
  assert.equal(answer.mode, "PRICE_ESTIMATE");
  assert.equal(answer.paragraphs[0], priceAnswer(price));
  assert.match(answer.paragraphs[0], /Perkiraan Nara/);
  assert.match(answer.paragraphs[0], /belum didukung/);
  assert.equal(
    priceEstimateSchema.safeParse({ ...price, mode: "SOURCED_ESTIMATE" })
      .success,
    false,
  );
  assert.equal(
    priceEstimateSchema.safeParse({ ...price, mode: "UNAVAILABLE" }).success,
    false,
  );
  assert.equal(priceReview.nutrition.sugarGrams, 19);
});
