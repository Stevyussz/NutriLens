import type { Db, ObjectId } from "mongodb";
import { analysisSchema, type Analysis } from "../analysis-schema";
import { healthSchema, type HealthProfile } from "./collections";
/** History is owned by a user, independent of expiring/shared calculation caches. Photos are never stored. */
export async function saveScanHistory(
  db: Db,
  userId: ObjectId,
  cacheKey: string,
  result: Analysis,
  health: HealthProfile,
) {
  await db
    .collection("scan_history")
    .updateOne(
      { userId, cacheKey },
      {
        $set: {
          result: analysisSchema.parse(result),
          healthProfile: healthSchema.parse(health),
          createdAt: new Date(),
        },
      },
      { upsert: true },
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
}
