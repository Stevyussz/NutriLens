import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { seed } from "../src/core/db/seed";
import { loadDataBundle, sourceFreshness } from "../src/core/db/data-quality";

test("source age does not become fresh through future or invalid timestamps", () => {
  const now = Date.parse("2026-10-16T12:00:00Z");
  assert.equal(sourceFreshness("2026-10-16T00:00:00Z", now), "RECENT");
  assert.equal(sourceFreshness("2026-10-12T00:00:00Z", now), "STALE");
  assert.equal(sourceFreshness("2026-10-17T00:00:00Z", now), "STALE");
  assert.equal(sourceFreshness("invalid", now), "STALE");
});
test("a full bundle is validated before seed writes; count mismatch and future dates reject", async () => {
  const stage = await mkdtemp(join(tmpdir(), "bongkar-quality-"));
  try {
    await cp(resolve("data"), stage, { recursive: true });
    const baseline = await loadDataBundle(stage);
    assert.ok(baseline.catalogue.length > 7000);
    const path = join(stage, "catalogue.manifest.json");
    const manifest = JSON.parse(await readFile(path, "utf8"));
    await writeFile(path, JSON.stringify({ ...manifest, catalogueRecords: 1 }));
    await assert.rejects(() => loadDataBundle(stage), /count mismatch/);
    await assert.rejects(() => seed(stage), /count mismatch/);
    await writeFile(
      path,
      JSON.stringify({
        ...manifest,
        retrievedAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    );
    await assert.rejects(() => loadDataBundle(stage), /Future source/);
    await writeFile(path, JSON.stringify(manifest));
    const catalogue = baseline.catalogue;
    const solid = catalogue.find(
      (p) => p.servingUnit === "g" && p.servingSizeGrams,
    )!;
    solid.nutrition.sugarGrams = solid.servingSizeGrams! * 2;
    await writeFile(
      join(stage, "catalogue.snapshot.json"),
      JSON.stringify(catalogue),
    );
    await assert.rejects(() => loadDataBundle(stage));
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
});
