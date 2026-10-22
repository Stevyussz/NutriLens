import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/core/db/client";
import { requireUser } from "@/core/security/session";
import { assertOrigin, readJson, apiError } from "@/core/security/http";
import { enforceRequestLimit } from "@/core/security/shared-rate-limiter";
import { ownedPhoto } from "@/core/owned-photo";
import { findPhotoAlternatives } from "@/core/photo-alternatives";
export const maxDuration = 25;
const inputSchema = z
  .object({ historyId: z.string().regex(/^[a-f0-9]{24}$/) })
  .strict();
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    await enforceRequestLimit(`alternatives:${user._id}`, 12);
    const input = inputSchema.parse(await readJson(request));
    const db = await getDb();
    const { review, health } = await ownedPhoto(db, user._id, input.historyId);
    return NextResponse.json(await findPhotoAlternatives(db, review, health, user._id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
