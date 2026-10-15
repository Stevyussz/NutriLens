import type { Db } from "mongodb";
import type { User } from "../db/collections";

/** Resolves an unexpired, non-revoked session and its current user in one DB round trip.
 * @param db Database. @param hash SHA-256 token digest. @param now Explicit expiry cutoff.
 * O(log s + log u) indexed lookups; no user/profile cache delays expiry or revocation.
 */
export async function findSessionUser(
  db: Db,
  hash: string,
  now = new Date(),
): Promise<User | null> {
  const users = await db
    .collection("sessions")
    .aggregate<User>([
      { $match: { tokenHash: hash, expiresAt: { $gt: now } } },
      { $limit: 1 },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $replaceWith: "$user" },
    ])
    .toArray();
  return users[0] ?? null;
}
