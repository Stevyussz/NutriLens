import { createHash } from "node:crypto";
import type { Db } from "mongodb";
import {
  chemicalSchema,
  productSchema,
  type HealthProfile,
  type Product,
} from "./db/collections";
import { calculateDeceptionAndSplittingMetrics } from "./algorithms/sugar-splitting";
import { classifyNovaGroup } from "./algorithms/nova-classifier";
import { scoreNutrition } from "./algorithms/nutrition-scorer";
import {
  calculatePercentiles,
  findSmartCandidateSwapsMongo,
} from "./db/pareto-aggregation";
import {
  contextualRerank,
  deterministicVerdict,
} from "./ai/contextual-reranker";
import { analysisSchema, type Analysis } from "./analysis-schema";
import { z } from "zod";
import {
  aiAvailable,
  aiIdentity,
  aiProviderLabel,
  usesRouter,
} from "./ai/provider";

/** Normalizes Indonesian spelling for exact indexed alias lookup. O(n) text length. */
export function normalizeIngredient(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s*\[.*\]/g, "")
    .replace(/\d+(?:[.,]\d+)?\s*%/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
/** Cache identity includes all personalized constraints and model mode; never crosses profiles. O(b). */
export function scanCacheKey(
  payload: string | Uint8Array,
  health: HealthProfile,
  revision = "1",
): string {
  return createHash("sha256")
    .update(payload)
    .update(JSON.stringify(health))
    .update(aiAvailable() ? aiIdentity() : "local")
    .update(`engine-v5:${revision}`)
    .digest("hex");
}
/** Executes the symbolic engine and validates its complete output. O(n + indexed DB pipeline costs).
 * @param db Live Mongo connection. @param input Validated product. @param health User constraints.
 */
export async function analyzeProduct(
  db: Db,
  input: Product,
  health: HealthProfile,
  useAi = true,
): Promise<Analysis> {
  const started = performance.now();
  const names = input.orderedIngredients.map((i) =>
    normalizeIngredient(i.canonicalChemicalName || i.rawName),
  );
  const chemicals = z.array(chemicalSchema).parse(
    await db
      .collection("chemical_dictionary")
      .find(
        {
          $or: [
            { canonicalName: { $in: names } },
            { aliases: { $in: names } },
            { insOrECode: { $in: names.map((n) => n.toUpperCase()) } },
          ],
        },
        { projection: { _id: 0 } },
      )
      .toArray(),
  );
  const lookup = new Map(
    chemicals.flatMap((c) =>
      [c.canonicalName, c.insOrECode, ...c.aliases].map(
        (a) => [normalizeIngredient(a), c] as const,
      ),
    ),
  );
  const orderedIngredients = input.orderedIngredients.map((i, idx) => {
    const chemical = lookup.get(names[idx]);
    return {
      ...i,
      orderIndex: idx,
      canonicalChemicalName: chemical?.canonicalName ?? names[idx],
      functionalCategory: chemical?.functionalCategory ?? ("UNKNOWN" as const),
    };
  });
  const product = productSchema.parse({
    ...input,
    orderedIngredients,
    novaGroup: classifyNovaGroup(orderedIngredients),
  });
  const splittingAnalysis =
    calculateDeceptionAndSplittingMetrics(orderedIngredients);
  const [paretoSwaps, percentiles] = await Promise.all([
    findSmartCandidateSwapsMongo(db, product, health.maxSnackBudgetIdr),
    calculatePercentiles(db, product),
  ]);
  let aiVerdict = deterministicVerdict(product, health, chemicals, paretoSwaps);
  let mode: Analysis["mode"] = "LOCAL_DETERMINISTIC";
  let notice =
    "Analisis label selesai. Klaim pemasaran yang memerlukan bukti tambahan ditandai belum terverifikasi. Periksa kembali komposisi dan ukuran sajian pada kemasan.";
  if (useAi && aiAvailable()) {
    try {
      aiVerdict = await contextualRerank(
        product,
        health,
        chemicals,
        paretoSwaps,
        { splittingAnalysis, percentiles },
      );
      mode = usesRouter() ? "ROUTER_AI" : "GEMINI";
      notice = `Penjelasan ${aiProviderLabel()} dipagari kalkulasi deterministik. Saran di luar database adalah estimasi, bukan data toko terverifikasi.`;
    } catch {
      notice = `${aiProviderLabel()} tidak merespons atau hasilnya tidak valid. Analisis deterministik tetap tersedia; penilaian klaim belum diverifikasi.`;
    }
  }
  const result = analysisSchema.parse({
    extractedProductData: product,
    splittingAnalysis,
    chemicals,
    paretoSwaps,
    percentiles,
    aiVerdict,
    nutritionScore: scoreNutrition(product, chemicals),
    mode,
    notice,
    executionTimeMs: performance.now() - started,
    cacheHit: false,
  });
  await db
    .collection("products")
    .updateOne(
      { barcode: product.barcode },
      { $set: product },
      { upsert: true },
    );
  return result;
}
