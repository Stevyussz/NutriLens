import { test } from "node:test";
import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
import { ensureIndexes, defaultHealth } from "../../src/core/db/collections";
import { presetProducts } from "../../src/core/db/presets";
import {
  buildSwapPipeline,
  calculatePercentiles,
  findSmartCandidateSwapsMongo,
} from "../../src/core/db/pareto-aggregation";
import { dictionaryData } from "../../src/core/db/dictionary-data";
import { analyzeProduct } from "../../src/core/scan-engine";

test("MongoDB 8 pipeline enforces constraints, handles ties, marks domination and exposes TTL", async () => {
  const client = await new MongoClient(
    process.env.MONGODB_URI ?? "mongodb://localhost:27017",
  ).connect();
  const db = client.db(`bongkar_test_${Date.now()}`);
  try {
    await ensureIndexes(db);
    const product = presetProducts()[0];
    const source = { ...product.source, kind: "LABEL" as const };
    const candidate = {
      ...product,
      source,
      barcode: "test-a",
      name: "test label A",
      priceIdr: 7000,
      nutrition: { ...product.nutrition, sugarGrams: 10, proteinGrams: 5 },
    };
    const better = {
      ...candidate,
      barcode: "test-b",
      name: "test label B",
      priceIdr: 6000,
      nutrition: { ...candidate.nutrition, sugarGrams: 8, proteinGrams: 6 },
    };
    const rejected = {
      ...candidate,
      barcode: "test-c",
      name: "rejected label",
      priceIdr: 11000,
    };
    const dissimilar = {
      ...candidate,
      barcode: "test-d",
      name: "dissimilar label",
      flavorTags: ["gurih", "mi"],
    };
    await db
      .collection("products")
      .insertMany(
        structuredClone([product, candidate, better, rejected, dissimilar]),
      );
    const swaps = await findSmartCandidateSwapsMongo(db, product, 10000);
    assert.equal(swaps.length, 2);
    assert.equal(swaps.find((s) => s.barcode === "test-a")?.dominated, true);
    assert.equal(swaps.find((s) => s.barcode === "test-b")?.dominated, false);
    assert.equal(
      (
        await findSmartCandidateSwapsMongo(
          db,
          { ...product, flavorTags: [] },
          10000,
        )
      ).length,
      0,
    );
    const ranks = await calculatePercentiles(db, product);
    assert.equal(ranks.population, 4);
    assert.equal(ranks.sugarPercentileRank, 100);
    const empty = await calculatePercentiles(db, {
      ...product,
      category: "MI_INSTAN",
    });
    assert.equal(empty.population, 0);
    assert.equal(empty.sugarPercentileRank, null);
    const indexes = await db.collection("sessions").listIndexes().toArray();
    assert.equal(
      indexes.find((i) => i.name === "expiresAt_1")?.expireAfterSeconds,
      0,
    );
    const plan = await db
      .collection("products")
      .aggregate(buildSwapPipeline(product, 10000))
      .explain("executionStats");
    assert.ok(plan);
    for (const c of dictionaryData())
      await db.collection("chemical_dictionary").insertOne(c);
    const analyzed = await analyzeProduct(db, product, defaultHealth, false);
    assert.equal(analyzed.splittingAnalysis.isSugarSplittingDetected, true);
    assert.equal(analyzed.splittingAnalysis.sugarCount, 4);
    assert.equal(analyzed.mode, "LOCAL_DETERMINISTIC");
    assert.equal(
      await db
        .collection("products")
        .countDocuments({ barcode: product.barcode }),
      1,
    );
  } finally {
    await db.dropDatabase();
    await client.close();
  }
});
