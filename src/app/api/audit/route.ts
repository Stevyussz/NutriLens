import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/core/db/client";
import { cookieName, requireUser, tokenHash } from "@/core/security/session";
import { apiError } from "@/core/security/http";
import { auditOutputSchema } from "@/core/api-schemas";
export async function GET() {
  try {
    const user = await requireUser();
    const db = await getDb();
    const current = (await cookies()).get(cookieName)?.value;
    const start = performance.now();
    await db.command({ ping: 1 });
    const pingMs = performance.now() - start;
    const [sessions, products, chemicals, cachedScans, indexes] =
      await Promise.all([
        db
          .collection("sessions")
          .find({ userId: user._id, expiresAt: { $gt: new Date() } })
          .sort({ createdAt: -1 })
          .limit(30)
          .toArray(),
        db.collection("products").countDocuments(),
        db.collection("chemical_dictionary").countDocuments(),
        db.collection("scan_caches").countDocuments(),
        Promise.all(
          [
            "users",
            "sessions",
            "products",
            "chemical_dictionary",
            "scan_caches",
          ].map(async (name) =>
            (await db.collection(name).listIndexes().toArray()).map((i) => ({
              collection: name,
              name: i.name,
              ttl: i.expireAfterSeconds ?? null,
            })),
          ),
        ),
      ]);
    return NextResponse.json(
      auditOutputSchema.parse({
        sessions: sessions.map((s) => ({
          id: s._id.toString(),
          userAgent: s.userAgent,
          createdAt: s.createdAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
          current: Boolean(current && s.tokenHash === tokenHash(current)),
        })),
        database: {
          products,
          chemicals,
          cachedScans,
          pingMs,
          indexes: indexes.flat(),
        },
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
