import { test } from "node:test";
import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
import { presetProducts } from "../../src/core/db/presets";
import { buildSwapPipeline } from "../../src/core/db/pareto-aggregation";

// MongoDB executes the real pipeline against inline fixtures. No collection,
// index, persistent fixture or cleanup is created on the application database.
test("Mongo inline fixtures select lowest evidenced prices without a personal budget or source price", async () => {
  const client = await new MongoClient(
    process.env.MONGODB_URI ?? "mongodb://localhost:27017",
  ).connect();
  try {
    const original = presetProducts()[0];
    const candidate = {
      ...original,
      source: { ...original.source, kind: "LABEL" },
      priceSource: "RETAILER",
      priceSourceUrl: "https://example.com/retailer-fixture",
      nutrition: { ...original.nutrition, sugarGrams: 8, proteinGrams: 6 },
    };
    const rows = [
      { ...candidate, _id: "a", barcode: "a", priceIdr: 7000 },
      { ...candidate, _id: "b", barcode: "b", priceIdr: 6000 },
      { ...candidate, _id: "c", barcode: "c", priceIdr: 11000 },
      {
        ...candidate,
        _id: "estimate",
        barcode: "estimate",
        priceIdr: 1000,
        priceSource: "ESTIMATE",
      },
      {
        ...candidate,
        _id: "missing-source",
        barcode: "missing-source",
        priceIdr: 2000,
        priceSourceUrl: null,
      },
      {
        ...candidate,
        _id: "different-size",
        barcode: "different-size",
        priceIdr: 1000,
        servingSizeGrams: original.servingSizeGrams + 1,
      },
    ];
    const source = { ...original, priceIdr: null };
    const pipeline = buildSwapPipeline(source, 1).map((stage) =>
      stage.$lookup
        ? {
            $lookup: {
              let: stage.$lookup.let,
              as: stage.$lookup.as,
              pipeline: [{ $documents: rows }, ...stage.$lookup.pipeline],
            },
          }
        : stage,
    );
    const result = await client
      .db(process.env.MONGODB_DB ?? "bongkar_label")
      .aggregate([{ $documents: rows }, ...pipeline])
      .toArray();
    assert.deepEqual(
      result.map((r) => r.priceIdr),
      [6000, 7000, 11000],
    );
    assert.ok(result.every((r) => r.moneySavedIdr === null));
    assert.equal(result[0].dominated, false);
    assert.equal(result[1].dominated, true);
  } finally {
    await client.close();
  }
});
