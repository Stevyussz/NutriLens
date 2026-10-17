import { createHash } from "node:crypto";
import type { Db, ObjectId } from "mongodb";
import { photoReviewSchema, type PhotoReview } from "../ai/vision-contract";
import { healthSchema, type HealthProfile } from "./collections";
/** Store label facts, not photos. A draft stays explicitly identified as an OCR reading. */
export async function savePhotoHistory(
  db: Db,
  userId: ObjectId,
  review: PhotoReview,
  health: HealthProfile,
) {
  const { historyId: _id, ...facts } = photoReviewSchema.parse(review);
  const cacheKey =
    "photo:" +
    createHash("sha256")
      .update(JSON.stringify({ facts, health }))
      .digest("hex");
  const row = await db
    .collection("scan_history")
    .findOneAndUpdate(
      { userId, cacheKey },
      {
        $set: {
          photoResult: facts,
          healthProfile: healthSchema.parse(health),
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after", projection: { _id: 1 } },
    );
  const overflow = await db
    .collection("scan_history")
    .find({ userId }, { projection: { _id: 1 } })
    .sort({ createdAt: -1, _id: -1 })
    .skip(100)
    .toArray();
  if (overflow.length)
    await db
      .collection("scan_history")
      .deleteMany({ userId, _id: { $in: overflow.map((r) => r._id) } });
  return row!._id.toHexString();
}
