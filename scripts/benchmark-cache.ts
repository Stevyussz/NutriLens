import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { analysisSchema } from "../src/core/analysis-schema";

/** Measures eight sequential warm cache requests through the real HTTP/session path.
 * Excludes the explicitly separate warmup, records every measured sample, then ends the session.
 * O(k) requests for fixed k=8; wall-clock latency includes network and JSON transfer.
 */
async function main() {
  const origin = process.env.TEST_BASE_URL ?? "http://localhost:3001";
  const guest = await fetch(`${origin}/api/auth/guest`, {
    method: "POST",
    headers: { origin },
  });
  assert.equal(guest.status, 200);
  const cookie = guest.headers.get("set-cookie")?.split(";")[0] ?? "";
  assert.ok(cookie);
  const samples: {
    applicationMs: number;
    roundTripMs: number;
    cacheHit: boolean;
  }[] = [];
  try {
    for (let index = 0; index < 9; index++) {
      const started = performance.now();
      const response = await fetch(`${origin}/api/scan`, {
        method: "POST",
        headers: { origin, cookie, "content-type": "application/json" },
        body: JSON.stringify({ presetId: "fitgandum" }),
      });
      assert.equal(response.status, 200);
      const result = analysisSchema.parse(await response.json());
      if (index > 0) {
        assert.equal(result.cacheHit, true);
        samples.push({
          applicationMs: result.executionTimeMs,
          roundTripMs: performance.now() - started,
          cacheHit: result.cacheHit,
        });
      }
    }
    const sorted = samples.map((s) => s.applicationMs).sort((a, b) => a - b);
    const report = {
      checkedAt: new Date().toISOString(),
      origin,
      warmupRequests: 1,
      samples,
      medianApplicationMs: (sorted[3] + sorted[4]) / 2,
      maxApplicationMs: sorted[7],
      allUnder15ms: sorted.every((n) => n < 15),
    };
    await mkdir("artifacts", { recursive: true });
    await writeFile(
      "artifacts/cache-benchmark.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report));
  } finally {
    await fetch(`${origin}/api/auth/logout`, {
      method: "POST",
      headers: { origin, cookie },
    });
  }
}
main().catch(() => {
  console.error("Cache benchmark failed");
  process.exitCode = 1;
});
