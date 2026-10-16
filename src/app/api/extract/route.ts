import { NextResponse } from "next/server";
import { requireUser } from "@/core/security/session";
import {
  assertOrigin,
  apiError,
  HttpError,
  readBytes,
} from "@/core/security/http";
import { enforceRateLimit } from "@/core/security/rate-limiter";
import { extractPhotoForReview } from "@/core/ai/photo-extraction";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    enforceRateLimit(`extract:${user._id}`, 8);
    const type = request.headers.get("content-type") ?? "";
    if (!type.startsWith("multipart/form-data"))
      throw new HttpError(415, "Unggah foto sebagai form-data.");
    const bytes = await readBytes(request, 10 * 1024 * 1024 + 65536);
    const form = await new Request(request.url, {
      method: "POST",
      headers: { "content-type": type },
      body: Buffer.from(bytes),
    }).formData();
    const files = form.getAll("image");
    if (
      files.length < 1 ||
      files.length > 2 ||
      files.some((file) => !(file instanceof File))
    )
      throw new HttpError(
        400,
        "Pilih satu atau dua foto dari produk yang sama: komposisi dan informasi gizi.",
      );
    try {
      const review = await extractPhotoForReview(
        await Promise.all(
          (files as File[]).map(
            async (file) => new Uint8Array(await file.arrayBuffer()),
          ),
        ),
      );
      return NextResponse.json(review, {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(
        422,
        "Foto belum berhasil dibaca. Coba foto yang lebih tajam atau salin label sendiri; tidak ada angka yang disimpan atau dianalisis.",
      );
    }
  } catch (error) {
    return apiError(error);
  }
}
