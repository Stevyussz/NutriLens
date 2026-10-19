import { ObjectId, type Db } from "mongodb";
import { photoReviewSchema } from "./ai/vision-contract";
import { reconcilePhotoReading } from "./ai/vision-policy";
import { healthSchema } from "./db/collections";
import { HttpError } from "./security/http";
export async function ownedPhoto(db: Db, userId: ObjectId, historyId: string) {
  const row = await db
    .collection("scan_history")
    .findOne({ _id: new ObjectId(historyId), userId });
  if (!row?.photoResult)
    throw new HttpError(
      404,
      "Bacaan foto tidak ditemukan. Buka hasil scan Anda kembali.",
    );
  return {
    review: reconcilePhotoReading(photoReviewSchema.parse(row.photoResult)),
    health: healthSchema.parse(row.healthProfile),
  };
}
