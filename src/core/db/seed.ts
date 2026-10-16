import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { MongoClient, ObjectId } from "mongodb";
import {
  productSchema,
  ensureIndexes,
  defaultHealth,
  chemicalSchema,
  type User,
} from "./collections";
import { dictionaryData, mergeDictionaryData } from "./dictionary-data";
import { presetProducts, presetIds } from "./presets";
import {
  analyzeProduct,
  scanCacheKey,
  normalizeIngredient,
} from "../scan-engine";
import { classifyNovaGroup } from "../algorithms/nova-classifier";
import { hashPassword } from "../security/session";
import { z } from "zod";
import { catalogueSchema } from "./catalogue";
/** Idempotent source-labelled seed with five precomputed default-profile analyses.
 * Unique upserts refresh source facts and clear derived caches. O(d+a+p*i+c) work for dictionary rows,
 * aliases, products/ingredients and old caches, plus five aggregation evaluations. Run one seed job.
 */
export async function seed() {
  const client = await new MongoClient(
    process.env.MONGODB_URI ?? "mongodb://localhost:27017",
  ).connect();
  try {
    const db = client.db(process.env.MONGODB_DB ?? "bongkar_label");
    await ensureIndexes(db);
    const catalogue = z
      .array(catalogueSchema)
      .parse(
        JSON.parse(
          await readFile(
            new URL("../../../data/catalogue.snapshot.json", import.meta.url),
            "utf8",
          ),
        ),
      );
    if (!catalogue.length) throw Error("Catalogue snapshot is empty");
    for (let offset = 0; offset < catalogue.length; offset += 500)
      await db.collection("product_catalogue").bulkWrite(
        catalogue
          .slice(offset, offset + 500)
          .map((row) => ({
            updateOne: {
              filter: { providerCode: row.providerCode },
              update: { $set: row },
              upsert: true,
            },
          })),
        { ordered: false },
      );
    await db
      .collection("product_catalogue")
      .deleteMany({
        providerCode: { $nin: catalogue.map((row) => row.providerCode) },
      });
    const provider = z
      .array(chemicalSchema)
      .parse(
        JSON.parse(
          await readFile(
            new URL("../../../data/dictionary.snapshot.json", import.meta.url),
            "utf8",
          ),
        ),
      );
    const dictionary = mergeDictionaryData(provider, dictionaryData());
    for (let offset = 0; offset < dictionary.length; offset += 500) {
      await db.collection("chemical_dictionary").bulkWrite(
        dictionary.slice(offset, offset + 500).map((chemical) => ({
          updateOne: {
            filter: { canonicalName: chemical.canonicalName },
            update: { $set: chemical },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }
    const products = z
      .array(productSchema)
      .parse(
        JSON.parse(
          await readFile(
            new URL("../../../data/products.snapshot.json", import.meta.url),
            "utf8",
          ),
        ),
      );
    const chemicalIndex = new Map(
      dictionary.flatMap((chemical) =>
        [chemical.canonicalName, ...chemical.aliases].map(
          (alias) => [normalizeIngredient(alias), chemical] as const,
        ),
      ),
    );
    for (const product of products) {
      const orderedIngredients = product.orderedIngredients.map(
        (ingredient) => {
          const chemical = chemicalIndex.get(
            normalizeIngredient(ingredient.rawName),
          );
          return {
            ...ingredient,
            canonicalChemicalName:
              chemical?.canonicalName ?? ingredient.canonicalChemicalName,
            functionalCategory:
              chemical?.functionalCategory ?? ("UNKNOWN" as const),
          };
        },
      );
      const enriched = {
        ...product,
        orderedIngredients,
        novaGroup: classifyNovaGroup(orderedIngredients),
        source: {
          ...product.source,
          note: `${product.source.note} NOVA merupakan hasil heuristik kamus, bukan verifikasi proses pabrik.`,
        },
      };
      await db
        .collection("products")
        .updateOne(
          { barcode: product.barcode },
          { $set: enriched },
          { upsert: true },
        );
    }
    for (const product of presetProducts())
      await db
        .collection("products")
        .updateOne(
          { barcode: product.barcode },
          { $set: product },
          { upsert: true },
        );
    if (process.env.INITIAL_USER_EMAIL && process.env.INITIAL_USER_PASSWORD) {
      if (process.env.INITIAL_USER_PASSWORD.length < 12)
        throw new Error("Initial password must contain at least 12 characters");
      await db.collection<User>("users").updateOne(
        { email: process.env.INITIAL_USER_EMAIL.toLowerCase() },
        {
          $setOnInsert: {
            _id: new ObjectId(),
            email: process.env.INITIAL_USER_EMAIL.toLowerCase(),
            name: "Pengguna BongkarLabel",
            passwordHash: hashPassword(process.env.INITIAL_USER_PASSWORD),
            role: "USER",
            healthProfile: defaultHealth,
            createdAt: new Date(),
            profileVersion: 1,
          },
        },
        { upsert: true },
      );
    }
    await db.collection("scan_caches").deleteMany({});
    for (const [index, product] of presetProducts().entries()) {
      const result = await analyzeProduct(db, product, defaultHealth, false);
      const payloadSha256 = scanCacheKey(
        `preset:${presetIds[index]}`,
        defaultHealth,
      );
      await db.collection("scan_caches").updateOne(
        { payloadSha256 },
        {
          $set: {
            payloadSha256,
            result,
            extractedProductData: result.extractedProductData,
            splittingAnalysis: result.splittingAnalysis,
            paretoSwaps: result.paretoSwaps,
            aiVerdict: result.aiVerdict,
            executionTimeMs: result.executionTimeMs,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    }
    console.log(
      JSON.stringify({
        chemicals: await db.collection("chemical_dictionary").countDocuments(),
        products: await db.collection("products").countDocuments(),
        catalogue: await db.collection("product_catalogue").countDocuments(),
        cachedCases: 5,
        priceBasis: "explicitly labelled estimates, not retailer quotes",
      }),
    );
  } finally {
    await client.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  seed().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
