import type { Db } from "mongodb";
import { z } from "zod";
import catalogue from "../../../data/catalogue.manifest.json";
import dictionary from "../../../data/dictionary.manifest.json";
import prices from "../../../data/prices.manifest.json";
import { sourceFreshness } from "./data-quality";
const source = z.object({ retrievedAt: z.string().datetime() }).passthrough();
const activeSchema = z.object({
  sources: z.object({
    catalogue: source.extend({ sourceUrl: z.string().url() }),
    dictionary: source,
    prices: source,
  }),
  priceBarcodes: z.array(z.string()),
  priceObservations: z.number().int().nonnegative(),
});
export async function getDataStatus(db: Db) {
  const [rawActive, refresh] = await Promise.all([
    db.collection("dataset_state").findOne({ key: "active" }),
    db.collection("dataset_state").findOne({ key: "refresh" }),
  ]);
  const active = activeSchema.safeParse(rawActive);
  const sources = active.success
    ? active.data.sources
    : { catalogue, dictionary, prices };
  return {
    sources,
    priceBarcodes: active.success ? active.data.priceBarcodes : null,
    priceObservations: active.success ? active.data.priceObservations : null,
    stale: Object.values(sources).some(
      (s) => sourceFreshness(s.retrievedAt) === "STALE",
    ),
    production:
      new URL(sources.catalogue.sourceUrl).hostname ===
      "world.openfoodfacts.org",
    refreshStatus: ["SUCCESS", "FAILED", "RUNNING"].includes(refresh?.status)
      ? String(refresh?.status)
      : "NOT_STARTED",
    lastAttemptAt:
      refresh?.lastAttemptAt instanceof Date ? refresh.lastAttemptAt : null,
    nextAttemptAt:
      refresh?.nextAttemptAt instanceof Date ? refresh.nextAttemptAt : null,
  };
}
