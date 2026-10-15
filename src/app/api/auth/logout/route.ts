import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/core/db/client";
import { cookieName, tokenHash } from "@/core/security/session";
import { apiError, assertOrigin } from "@/core/security/http";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const jar = await cookies();
    const token = jar.get(cookieName)?.value;
    if (token)
      await (
        await getDb()
      )
        .collection("sessions")
        .deleteOne({ tokenHash: tokenHash(token) });
    jar.delete(cookieName);
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
