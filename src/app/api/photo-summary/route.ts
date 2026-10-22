import { reconcilePhotoReading } from "@/core/ai/vision-policy";
import { NextResponse } from "next/server";
import { photoReviewSchema } from "@/core/ai/vision-contract";
import { requireUser } from "@/core/security/session";
import { assertOrigin, apiError, readJson } from "@/core/security/http";
import { enforceRequestLimit } from "@/core/security/shared-rate-limiter";
import { getDb } from "@/core/db/client";
import { savePhotoHistory } from "@/core/db/photo-history";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    await enforceRequestLimit(`photo-summary:${user._id}`, 30);
    const review = reconcilePhotoReading(
      photoReviewSchema.parse(await readJson(request)),
    );
    const historyId = await savePhotoHistory(
      await getDb(),
      user._id,
      review,
      user.healthProfile,
    );
    return NextResponse.json(
      { ...review, historyId },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
