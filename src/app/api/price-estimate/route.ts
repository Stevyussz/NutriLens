import { NextResponse } from "next/server";
import { photoReviewSchema } from "@/core/ai/vision-contract";
import { estimatePhotoPrice } from "@/core/price-estimate";
import { requireUser } from "@/core/security/session";
import { apiError, assertOrigin, readJson } from "@/core/security/http";
import { enforceRequestLimit } from "@/core/security/shared-rate-limiter";
export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    await enforceRequestLimit(`price:${user._id}`, 10);
    return NextResponse.json(
      await estimatePhotoPrice(
        photoReviewSchema.parse(await readJson(request)),
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
