import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizePriceObservations } from "../src/core/db/price-observations";

const pageSchema = z.object({
  total: z.number().int().nonnegative(),
  pages: z.number().int().nonnegative(),
  items: z.array(z.unknown()),
});
const endpoint =
  "https://prices.openfoodfacts.org/api/v1/prices?currency=IDR&size=100";

/** Fetches every IDR page before publishing a validated snapshot and coverage report.
 * A failed/incomplete export aborts; existing snapshots stay intact. O(p+n+b) work for pages,
 * observations and catalogue barcodes. No model-generated or inferred serving prices are written.
 */
async function main() {
  const rows: unknown[] = [];
  const hashes: string[] = [];
  let pages = 1;
  let expected = 0;
  for (let page = 1; page <= pages; page++) {
    const text = process.argv[2]
      ? await readFile(process.argv[2], "utf8")
      : await (async () => {
          const response = await fetch(`${endpoint}&page=${page}`, {
            headers: {
              "User-Agent": "BongkarLabel/1.0 (price provenance import)",
            },
            signal: AbortSignal.timeout(30000),
          });
          if (!response.ok)
            throw new Error(`Open Prices HTTP ${response.status}`);
          return response.text();
        })();
    const data = pageSchema.parse(JSON.parse(text));
    if (page === 1) {
      pages = Math.max(1, data.pages);
      expected = data.total;
      if (pages > 1000)
        throw new Error("Export exceeds 1000-page safety limit");
      if (process.argv[2] && pages > 1)
        throw new Error("Offline input must be a complete one-page export");
    } else if (data.total !== expected || data.pages !== pages) {
      throw new Error(
        "Provider changed during export; retry for a consistent snapshot",
      );
    }
    rows.push(...data.items);
    hashes.push(createHash("sha256").update(text).digest("hex"));
  }
  if (rows.length !== expected) throw new Error("Incomplete provider export");
  const retrievedAt = new Date().toISOString();
  const observations = normalizePriceObservations(
    rows,
    retrievedAt.slice(0, 10),
  );
  const products = z
    .array(z.object({ barcode: z.string() }))
    .parse(JSON.parse(await readFile("data/products.snapshot.json", "utf8")));
  const barcodes = new Set(products.map((p) => p.barcode));
  const matched = new Set(
    observations.filter((p) => barcodes.has(p.barcode)).map((p) => p.barcode),
  );
  const manifest = {
    provider: "Open Prices / Open Food Facts",
    endpoint,
    retrievedAt,
    pageSha256: hashes,
    providerRecords: rows.length,
    acceptedObservations: observations.length,
    rejectedObservations: rows.length - observations.length,
    catalogueProducts: products.length,
    matchedCatalogueProducts: matched.size,
    unmatchedCatalogueProducts: products
      .filter((p) => !matched.has(p.barcode))
      .map((p) => p.barcode),
    appliedServingPrices: 0,
    note: "Observasi komunitas bertanggal dengan ID bukti, bukan harga toko terkini yang dijamin. Disimpan terpisah: satuan harga, ukuran kemasan dan jumlah sajian harus diverifikasi sebelum mengganti estimasi per sajian.",
  };
  await writeFile(
    "data/prices.snapshot.json",
    JSON.stringify(observations, null, 2) + "\n",
  );
  await writeFile(
    "data/prices.manifest.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      accepted: observations.length,
      matchedProducts: matched.size,
      appliedServingPrices: 0,
    }),
  );
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Price import failed");
  process.exitCode = 1;
});
