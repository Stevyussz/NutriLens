import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/core/db/client";
import type { User } from "@/core/db/collections";
import {
  createSession,
  verifyPassword,
  hashPassword,
} from "@/core/security/session";
import {
  apiError,
  assertOrigin,
  readJson,
  HttpError,
} from "@/core/security/http";
import { enforceRequestLimit } from "@/core/security/shared-rate-limiter";
import { requestIp } from "@/core/security/rate-limiter";
const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(250)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(8).max(128),
  })
  .strict();
const dummyHash = hashPassword("account-does-not-exist");
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await enforceRequestLimit(`login:${requestIp(request)}`, 5);
    const input = loginSchema.parse(await readJson(request));
    const db = await getDb();
    const user = await db
      .collection<User>("users")
      .findOne({ email: input.email });
    const valid = verifyPassword(
      input.password,
      user?.passwordHash || dummyHash,
    );
    if (!user || !user.passwordHash || !valid)
      throw new HttpError(401, "Email atau kata sandi tidak cocok.");
    await createSession(user._id, request);
    return NextResponse.json({ success: true, redirect: "/scanner" });
  } catch (e) {
    return apiError(e);
  }
}
