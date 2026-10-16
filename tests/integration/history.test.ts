import { test } from "node:test";
import assert from "node:assert/strict";
import { MongoClient, ObjectId } from "mongodb";
import { ensureIndexes, defaultHealth } from "../../src/core/db/collections";
import { presetProducts } from "../../src/core/db/presets";
import { analyzeProduct } from "../../src/core/scan-engine";
import { saveScanHistory } from "../../src/core/db/history";
import { findSmartCandidateSwapsMongo } from "../../src/core/db/pareto-aggregation";
test("history snapshots survive cache deletion, deduplicate per owner and retain at most 100 results", async () => {
  const client = await new MongoClient(
    process.env.MONGODB_URI ?? "mongodb://localhost:27017",
  ).connect();
  const db = client.db(`bongkar_history_test_${Date.now()}`);
  try {
    await ensureIndexes(db);
    const owner = new ObjectId(),
      other = new ObjectId();
    const product = { ...presetProducts()[0], priceIdr: null };
    const result = await analyzeProduct(db, product, defaultHealth, false);
    assert.equal(result.nutritionScore.costPerGramProteinIdr, null);
    assert.deepEqual(
      await findSmartCandidateSwapsMongo(db, product, 10000),
      [],
    );
    await saveScanHistory(db, other, "shared", result, defaultHealth);
    for (let i = 0; i < 102; i++)
      await saveScanHistory(db, owner, `entry-${i}`, result, defaultHealth);
    assert.equal(
      await db.collection("scan_history").countDocuments({ userId: owner }),
      100,
    );
    assert.equal(
      await db.collection("scan_history").countDocuments({ userId: other }),
      1,
    );
    await saveScanHistory(db, owner, "entry-101", result, defaultHealth);
    assert.equal(
      await db.collection("scan_history").countDocuments({ userId: owner }),
      100,
    );
    await db.collection("scan_caches").deleteMany({});
    const saved = await db
      .collection("scan_history")
      .findOne({ userId: owner, cacheKey: "entry-101" });
    assert.equal(saved?.healthProfile.dailySugarLimitGrams, 50);
    assert.equal(saved?.result.extractedProductData.priceIdr, null);
    assert.equal("photos" in saved!, false);
  } finally {
    await db.dropDatabase();
    await client.close();
  }
});
