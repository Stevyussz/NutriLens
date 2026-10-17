import { reconcilePhotoReading } from "@/core/ai/local-ocr";
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
import { askNara } from "@/core/nara";
export const maxDuration = 30;
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
    const answer = await askNara(
      reconcilePhotoReading(photoReviewSchema.parse(row.photoResult)),
      healthSchema.parse(row.healthProfile),
      input.question,
      input.previousTopics,
    );
    return NextResponse.json(answer, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
