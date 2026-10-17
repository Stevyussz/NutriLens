import { NextResponse } from "next/server";
import { requireUser } from "@/core/security/session";
import { assertOrigin, readJson, apiError } from "@/core/security/http";
import { enforceRateLimit } from "@/core/security/rate-limiter";
import { getDb } from "@/core/db/client";
import { photoReviewSchema } from "@/core/ai/vision-contract";
import { researchProduct } from "@/core/product-research";
export const maxDuration = 40;
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    enforceRateLimit(`research:${user._id}`, 10);
    const review = photoReviewSchema.parse(await readJson(request));
    return NextResponse.json(await researchProduct(await getDb(), review), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
