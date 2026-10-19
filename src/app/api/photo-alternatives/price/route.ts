import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/core/db/client";
import { requireUser } from "@/core/security/session";
import {
  assertOrigin,
  readJson,
  apiError,
  HttpError,
} from "@/core/security/http";
import { enforceRateLimit } from "@/core/security/rate-limiter";
import { ownedPhoto } from "@/core/owned-photo";
import {
  findPhotoAlternatives,
  alternativePriceProduct,
} from "@/core/photo-alternatives";
import { estimatePhotoPrice } from "@/core/price-estimate";
export const maxDuration = 40;
const inputSchema = z
  .object({
    historyId: z.string().regex(/^[a-f0-9]{24}$/),
    candidateId: z.string().regex(/^(?:\d{6,24}|scan-[a-f0-9]{24})$/),
  })
  .strict();
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    enforceRateLimit(`alternative-price:${user._id}`, 12);
    const input = inputSchema.parse(await readJson(request));
    const db = await getDb();
    const { review, health } = await ownedPhoto(db, user._id, input.historyId);
    const result = await findPhotoAlternatives(db, review, health, user._id);
    const candidate = result.candidates.find((p) => p.id === input.candidateId);
    if (!candidate)
      throw new HttpError(
        404,
        "Produk ini tidak termasuk pembanding yang sesuai untuk scan tersebut.",
      );
    return NextResponse.json(
      await estimatePhotoPrice(
        alternativePriceProduct(candidate, review.category),
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
