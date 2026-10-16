import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { catalogueSchema } from "./catalogue";
import { chemicalSchema, productSchema } from "./collections";
import { priceObservationSchema } from "./price-observations";

const manifestSchema = z
  .object({ retrievedAt: z.string().datetime() })
  .passthrough();
export async function loadDataBundle(directory: string) {
  const json = async (file: string) =>
    JSON.parse(await readFile(join(directory, file), "utf8"));
  const [
    catalogue,
    dictionary,
    products,
    prices,
    catalogueManifest,
    dictionaryManifest,
    pricesManifest,
  ] = await Promise.all([
    json("catalogue.snapshot.json").then((v) =>
      z.array(catalogueSchema).min(1).parse(v),
    ),
    json("dictionary.snapshot.json").then((v) =>
      z.array(chemicalSchema).min(1).parse(v),
    ),
    json("products.snapshot.json").then((v) =>
      z.array(productSchema).min(1).parse(v),
    ),
    json("prices.snapshot.json").then((v) =>
      z.array(priceObservationSchema).parse(v),
    ),
    json("catalogue.manifest.json").then((v) =>
      manifestSchema
        .extend({
          catalogueRecords: z.number().int(),
          totalReferences: z.number().int(),
          sourceUrl: z.string().url(),
        })
        .parse(v),
    ),
    json("dictionary.manifest.json").then((v) =>
      manifestSchema.extend({ imported: z.number().int() }).parse(v),
    ),
    json("prices.manifest.json").then((v) =>
      manifestSchema
        .extend({ acceptedObservations: z.number().int() })
        .parse(v),
    ),
  ]);
  if (products.some((p) => p.priceIdr === null))
    throw Error("Reference product price missing");
  if (
    new Set(catalogue.map((p) => p.providerCode)).size !== catalogue.length ||
    new Set(products.map((p) => p.barcode)).size !== products.length ||
    new Set(dictionary.map((p) => p.canonicalName)).size !== dictionary.length
  )
    throw Error("Duplicate source identifiers");
  if (
    catalogue.length !== catalogueManifest.catalogueRecords ||
    products.length !== catalogueManifest.totalReferences ||
    dictionary.length !== dictionaryManifest.imported ||
    prices.length !== pricesManifest.acceptedObservations
  )
    throw Error("Snapshot/manifest count mismatch");
  for (const manifest of [
    catalogueManifest,
    dictionaryManifest,
    pricesManifest,
  ])
    if (Date.parse(manifest.retrievedAt) > Date.now() + 300000)
      throw Error("Future source timestamp");
  for (const p of catalogue) {
    if (p.servingUnit !== "g" || !p.servingSizeGrams) continue;
    for (const [key, value] of Object.entries(p.nutrition))
      if (
        value !== null &&
        key !== "caloriesKcal" &&
        value / (key === "sodiumMg" ? 1000 : 1) > p.servingSizeGrams * 1.05
      )
        throw Error("Nutrient mass exceeds serving mass");
  }
  return {
    catalogue,
    dictionary,
    products,
    prices,
    manifests: {
      catalogue: catalogueManifest,
      dictionary: dictionaryManifest,
      prices: pricesManifest,
    },
  };
}
export function sourceFreshness(retrievedAt: string, now = Date.now()) {
  const age = now - Date.parse(retrievedAt);
  return !Number.isFinite(age) || age < -300000 || age > 72 * 3600000
    ? "STALE"
    : "RECENT";
}
