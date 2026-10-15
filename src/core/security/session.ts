import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { getDb } from "../db/client";
import type { User, Session } from "../db/collections";
import { HttpError } from "./http";
import { findSessionUser } from "./session-query";
export const cookieName = "bongkar_session";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
/** Salted scrypt credential derivation, fixed work factor per call. O(N*r*p) time, O(N*r) memory. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || hash.length !== 128) return false;
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(hash, "hex"),
  );
}
/** Persists only SHA-256 of 256-bit random session secret; replaces the caller's previous session.
 * @param userId Account to authenticate. @param request Device metadata. O(log s) indexed writes.
 */
export async function createSession(
  userId: ObjectId,
  request: Request,
): Promise<void> {
  const db = await getDb();
  const jar = await cookies();
  const previous = jar.get(cookieName)?.value;
  if (previous)
    await db
      .collection("sessions")
      .deleteOne({ tokenHash: tokenHash(previous) });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 86400000);
  await db.collection<Session>("sessions").insertOne({
    _id: new ObjectId(),
    userId,
    tokenHash: tokenHash(token),
    userAgent: (request.headers.get("user-agent") ?? "unknown").slice(0, 300),
    ipAddress:
      process.env.TRUST_PROXY === "true"
        ? (
            request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
          ).slice(0, 80)
        : "direct",
    createdAt: new Date(),
    expiresAt,
  });
  jar.set(cookieName, token, {
    httpOnly: true,
    secure:
      process.env.SESSION_SECURE === "true" ||
      (process.env.NODE_ENV === "production" &&
        process.env.SESSION_SECURE !== "false"),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
/** Checks expiry explicitly because TTL cleanup is asynchronous. O(log s + log u). */
export async function requireUser(): Promise<User> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(401, "Mulai pemeriksaan dari beranda terlebih dahulu.");
  const db = await getDb();
  const user = await findSessionUser(db, tokenHash(token));
  if (!user)
    throw new HttpError(
      401,
      "Sesi pemeriksaan berakhir. Mulai kembali dari beranda.",
    );
  return {
    ...user,
    role:
      user.role === "USER" || user.role === "GUEST"
        ? user.role
        : user.passwordHash
          ? "USER"
          : "GUEST",
  };
}
