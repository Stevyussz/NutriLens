import { reconcilePhotoReading } from "@/core/ai/vision-policy";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/core/db/client";
import { healthSchema } from "@/core/db/collections";
import { photoReviewSchema } from "@/core/ai/vision-contract";
import { requireUser } from "@/core/security/session";
import {
  assertOrigin,
  readJson,
  apiError,
  HttpError,
} from "@/core/security/http";
import { enforceRateLimit } from "@/core/security/rate-limiter";
import { naraRequestSchema } from "@/core/nara-schema";
import { estimatePhotoPrice } from "@/core/price-estimate";
import { askNara } from "@/core/nara";
import {
  findPhotoAlternatives,
  alternativePriceProduct,
} from "@/core/photo-alternatives";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    enforceRateLimit(`nara:${user._id}`, 15);
    const input = naraRequestSchema.parse(await readJson(request));
    const row = await (
      await getDb()
    )
      .collection("scan_history")
      .findOne({ _id: new ObjectId(input.historyId), userId: user._id });
    if (!row?.photoResult)
      throw new HttpError(
        404,
        "Bacaan foto tidak ditemukan. Buka hasil scan Anda kembali.",
      );
    const review = reconcilePhotoReading(
      photoReviewSchema.parse(row.photoResult),
    );
    const health = healthSchema.parse(row.healthProfile);
    const wantsAlternatives =
      input.purpose === "chat" &&
      /alternatif|pengganti|rekomend|produk lain|lebih baik|pilih|ganti|dibeli|beli/i.test(
        [input.question, ...input.conversation.map((t) => t.question)].join(
          " ",
        ),
      );
    const wantsPrice = /harga|murah|hemat|biaya|rupiah/i.test(input.question);
    const [price, context] = await Promise.all([
      wantsPrice ? estimatePhotoPrice(review) : undefined,
      wantsAlternatives
        ? (async () => {
            const alternatives = await findPhotoAlternatives(
              await getDb(),
              review,
              health,
              user._id,
            );
            const prices = wantsPrice
              ? await Promise.all(
                  alternatives.candidates.map(async (candidate) => ({
                    id: candidate.id,
                    price: await estimatePhotoPrice(
                      alternativePriceProduct(candidate, review.category),
                    ),
                  })),
                )
              : [];
            return { alternatives, prices };
          })()
        : undefined,
    ]);
    const answer = await askNara(
      review,
      health,
      input.question,
      input.previousTopics,
      price,
      input.conversation,
      input.purpose,
      context?.alternatives,
      context?.prices,
    );
    return NextResponse.json(answer, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
