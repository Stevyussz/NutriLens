import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePriceObservations } from "../src/core/db/price-observations";

test("price observations reject wrong currency, missing proof, duplicates, future dates and mismatched barcode", () => {
  const row = {
    id: 1,
    product_code: "8992775913000",
    price: 2500,
    currency: "IDR",
    date: "2026-10-06",
    proof_id: 10,
    duplicate_of: null,
    price_per: null,
    price_is_discounted: false,
    product: {
      code: "8992775913000",
      product_quantity: 27,
      product_quantity_unit: "g",
    },
    location: { osm_display_name: "Toko uji" },
    owner: "must not be retained",
  };
  const result = normalizePriceObservations(
    [
      row,
      row,
      { ...row, id: 2, currency: "USD" },
      { ...row, id: 3, proof_id: null },
      { ...row, id: 4, duplicate_of: 1 },
      { ...row, id: 5, date: "2026-10-16" },
      { ...row, id: 6, product: { ...row.product, code: "12345678" } },
      { ...row, id: 7, price: -1 },
    ],
    "2026-10-15",
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].priceIdr, 2500);
  assert.equal(result[0].packageQuantity, 27);
  assert.equal(result[0].pricePer, null);
  assert.equal("owner" in result[0], false);
  assert.equal("servingPriceIdr" in result[0], false);
});
