import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/core/db/client";
import { defaultHealth, type User } from "@/core/db/collections";
import { createSession, requireUser } from "@/core/security/session";
import { apiError, assertOrigin, HttpError } from "@/core/security/http";
import { enforceRateLimit, requestIp } from "@/core/security/rate-limiter";
import { randomBytes } from "node:crypto";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    enforceRateLimit(`guest:${requestIp(request)}`, 20);
    try {
      await requireUser();
      return NextResponse.json({ success: true, redirect: "/scanner" });
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 401)) throw error;
    }
    const db = await getDb();
    const _id = new ObjectId();
    await db.collection<User>("users").insertOne({
      _id,
      email: `guest-${randomBytes(12).toString("hex")}@session.invalid`,
      name: "Pengguna BongkarLabel",
      passwordHash: "",
      role: "GUEST",
      healthProfile: { ...defaultHealth },
      createdAt: new Date(),
      profileVersion: 1,
    });
    await createSession(_id, request);
    return NextResponse.json({ success: true, redirect: "/scanner" });
  } catch (e) {
    return apiError(e);
  }
}
