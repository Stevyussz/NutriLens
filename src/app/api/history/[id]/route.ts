import { reconcilePhotoReading } from "@/core/ai/vision-policy";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/core/db/client";
import { requireUser } from "@/core/security/session";
import { apiError, assertOrigin, HttpError } from "@/core/security/http";
import { photoReviewSchema } from "@/core/ai/vision-contract";
import { historyDetailSchema } from "@/core/history-schema";
type Context = { params: Promise<{ id: string }> };
function idFrom(value: string) {
  if (!/^[a-f0-9]{24}$/.test(value))
    throw new HttpError(404, "Riwayat tidak ditemukan.");
  return new ObjectId(value);
}
export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const id = idFrom((await context.params).id);
    const row = await (
      await getDb()
    )
      .collection("scan_history")
      .findOne({ _id: id, userId: user._id });
    if (!row) throw new HttpError(404, "Riwayat tidak ditemukan.");
    return NextResponse.json(
      historyDetailSchema.parse({
        id: row._id.toHexString(),
        createdAt: row.createdAt.toISOString(),
        healthProfile: row.healthProfile,
        result: row.result,
        ...(row.photoResult && {
          photoResult: {
            ...reconcilePhotoReading(photoReviewSchema.parse(row.photoResult)),
            historyId: row._id.toHexString(),
          },
        }),
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const id = idFrom((await context.params).id);
    const deleted = await (
      await getDb()
    )
      .collection("scan_history")
      .deleteOne({ _id: id, userId: user._id });
    if (!deleted.deletedCount)
      throw new HttpError(404, "Riwayat tidak ditemukan.");
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
