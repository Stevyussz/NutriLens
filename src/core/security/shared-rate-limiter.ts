import { createHash } from "node:crypto";
import type { Db } from "mongodb";
import { getDb } from "../db/client";
import { HttpError } from "./http";
import { enforceRateLimit } from "./rate-limiter";

/** Atomic fixed windows shared by all Vercel instances; rejected hits do not extend the window. */
export async function consumeSharedLimit(
  db: Db,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
) {
  const start = Math.floor(now / windowMs) * windowMs;
  const id = createHash("sha256")
    .update(`${key}:${start}:${windowMs}`)
    .digest("hex");
  const collection = db.collection<{
    _id: string;
    hits: number;
    expiresAt: Date;
  }>("request_limits");
  const update = () =>
    collection.findOneAndUpdate(
      { _id: id },
      {
        $inc: { hits: 1 },
        $setOnInsert: { expiresAt: new Date(start + windowMs) },
      },
      { upsert: true, returnDocument: "after" },
    );
  const row = await update().catch((error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      return update();
    throw error;
  });
  if (!row || row.hits > limit)
    throw new HttpError(
      429,
      "Terlalu banyak permintaan. Tunggu satu menit lalu coba lagi.",
    );
}

export async function enforceRequestLimit(
  key: string,
  limit = 20,
  windowMs = 60000,
): Promise<void> {
  if (process.env.VERCEL !== "1") return enforceRateLimit(key, limit, windowMs);
  await consumeSharedLimit(await getDb(), key, limit, windowMs);
}
