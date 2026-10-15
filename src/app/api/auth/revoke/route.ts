import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { cookies } from "next/headers";
import { getDb } from "@/core/db/client";
import { cookieName, requireUser, tokenHash } from "@/core/security/session";
import {
  apiError,
  assertOrigin,
  readJson,
  HttpError,
} from "@/core/security/http";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const input = z
      .object({ sessionId: z.string().regex(/^[a-f0-9]{24}$/) })
      .strict()
      .parse(await readJson(request));
    const db = await getDb();
    const jar = await cookies();
    const current = jar.get(cookieName)?.value;
    const session = await db.collection("sessions").findOneAndDelete({
      _id: new ObjectId(input.sessionId),
      userId: user._id,
    });
    if (!session) throw new HttpError(404, "Sesi tidak ditemukan.");
    const revokedCurrent = Boolean(
      current && session.tokenHash === tokenHash(current),
    );
    if (revokedCurrent) jar.delete(cookieName);
    return NextResponse.json({ success: true, revokedCurrent });
  } catch (e) {
    return apiError(e);
  }
}
