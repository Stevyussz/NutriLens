import { saveScanHistory } from "@/core/db/history";
import { aiAvailable } from "@/core/ai/provider";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/core/db/client";
import { productSchema, type Product } from "@/core/db/collections";
import { presetIds } from "@/core/db/presets";
import { requireUser } from "@/core/security/session";
import { enforceRateLimit } from "@/core/security/rate-limiter";
import {
  assertOrigin,
  apiError,
  readBytes,
  readJson,
  HttpError,
} from "@/core/security/http";
import { validateImage } from "@/core/security/file-validator";
import { extractWithGemini } from "@/core/ai/gemini-vision";
import { parseLocalLabelText } from "@/core/ai/local-parser";
import { analyzeProduct, scanCacheKey } from "@/core/scan-engine";
import { analysisSchema } from "@/core/analysis-schema";
export const maxDuration = 120;
const inputSchema = z.union([
  z.object({ presetId: z.enum(presetIds) }).strict(),
  z.object({ product: productSchema }).strict(),
  z.object({ text: z.string().min(20).max(20000) }).strict(),
]);
export async function POST(request: Request) {
  const started = performance.now();
  try {
    assertOrigin(request);
    const user = await requireUser();
    enforceRateLimit(`scan:${user._id}`, 15);
    const db = await getDb();
    let payload: string | Uint8Array;
    let product: Product | undefined;
    let text: string | undefined;
    let image: { bytes: Uint8Array; mime: string } | undefined;
    if (
      request.headers.get("content-type")?.startsWith("multipart/form-data")
    ) {
      const bytes = await readBytes(request, 5 * 1024 * 1024 + 65536);
      const form = await new Request(request.url, {
        method: "POST",
        headers: { "content-type": request.headers.get("content-type") ?? "" },
        body: Buffer.from(bytes),
      }).formData();
      const file = form.get("image");
      if (!(file instanceof File))
        throw new HttpError(400, "Pilih file gambar label.");
      payload = new Uint8Array(await file.arrayBuffer());
      image = { bytes: payload, mime: validateImage(payload) };
      throw new HttpError(
        422,
        "Pembacaan foto memerlukan tahap tinjau hasil. Gunakan Foto kemasan, lalu cocokkan dan konfirmasi isian sebelum analisis.",
      );
    } else {
      const input = inputSchema.parse(await readJson(request));
      if ("presetId" in input) {
        payload = `preset:${input.presetId}`;
        const found = await db
          .collection("products")
          .findOne(
            { barcode: `case-${input.presetId}` },
            { projection: { _id: 0 } },
          );
        if (!found)
          throw new HttpError(
            503,
            "Contoh analisis belum tersedia. Coba lagi atau isi label kemasan Anda.",
          );
        product = productSchema.parse(found);
      } else if ("product" in input) {
        const {
          name,
          brand,
          category,
          priceIdr,
          servingSizeGrams,
          flavorTags,
          nutrition,
          marketingClaims,
          orderedIngredients,
        } = input.product;
        payload = JSON.stringify({
          name,
          brand,
          category,
          priceIdr,
          servingSizeGrams,
          flavorTags,
          nutrition,
          marketingClaims,
          orderedIngredients,
        });
        product = productSchema.parse({
          ...input.product,
          barcode: `manual-${createHash("sha256").update(payload).digest("hex").slice(0, 32)}`,
          source: {
            kind: "USER_INPUT",
            url: null,
            retrievedAt: new Date().toISOString(),
            note: "Data disalin oleh pengguna dari label, bukan data penyedia yang telah diperiksa. Verifikasi kembali angka dan satuan.",
          },
          priceSource: "USER_INPUT",
          priceSourceUrl: null,
        });
      } else {
        text = input.text
          .normalize("NFKC")
          .replace(/[ \t]+/g, " ")
          .trim();
        if (!/\d/.test(text))
          throw new HttpError(
            422,
            "Sertakan angka informasi gizi dan ukuran sajian. Daftar komposisi saja belum cukup untuk dianalisis.",
          );
        payload = text;
      }
    }
    const key = scanCacheKey(payload, user.healthProfile);
    const cached = await db.collection("scan_caches").findOne({
      payloadSha256: key,
      createdAt: { $gt: new Date(Date.now() - 86400000) },
    });
    if (cached) {
      const result = analysisSchema.parse(cached.result);
      result.cacheHit = true;
      result.executionTimeMs = performance.now() - started;
      await saveScanHistory(db, user._id, key, result, user.healthProfile);
      return NextResponse.json(result, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (!product) {
      if (!aiAvailable()) {
        if (text)
          product = parseLocalLabelText(text, `text-${key.slice(0, 32)}`);
        else
          throw new HttpError(
            422,
            "Pembacaan foto otomatis belum tersedia. Gunakan Label lengkap atau contoh analisis.",
          );
      } else {
        try {
          product = await extractWithGemini({ text, image });
        } catch {
          if (text)
            product = parseLocalLabelText(text, `text-${key.slice(0, 32)}`);
          else
            throw new HttpError(
              422,
              "Label tidak dapat diekstrak dengan yakin. Foto ulang label gizi/komposisi atau isi formulir label lengkap.",
            );
        }
      }
    }
    const result = await analyzeProduct(db, product, user.healthProfile);
    result.executionTimeMs = performance.now() - started;
    await db.collection("scan_caches").updateOne(
      { payloadSha256: key },
      {
        $set: {
          payloadSha256: key,
          extractedProductData: result.extractedProductData,
          splittingAnalysis: result.splittingAnalysis,
          paretoSwaps: result.paretoSwaps,
          aiVerdict: result.aiVerdict,
          executionTimeMs: result.executionTimeMs,
          result,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
    await saveScanHistory(db, user._id, key, result, user.healthProfile);
    return NextResponse.json(analysisSchema.parse(result), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
