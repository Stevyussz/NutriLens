import { NextResponse } from "next/server";
import { getDb } from "@/core/db/client";
import { healthSchema } from "@/core/db/collections";
import { profileOutputSchema } from "@/core/api-schemas";
import { requireUser } from "@/core/security/session";
import { apiError, assertOrigin, readJson } from "@/core/security/http";
export async function GET() {
  try {
    const u = await requireUser();
    return NextResponse.json(
      profileOutputSchema.parse({
        name: u.name,
        role: u.role,
        healthProfile: u.healthProfile,
        profileVersion: u.profileVersion,
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const health = healthSchema.parse(await readJson(request));
    await (
      await getDb()
    )
      .collection("users")
      .updateOne(
        { _id: user._id },
        { $set: { healthProfile: health }, $inc: { profileVersion: 1 } },
      );
    return NextResponse.json(
      profileOutputSchema.parse({
        name: user.name,
        role: user.role,
        healthProfile: health,
        profileVersion: user.profileVersion + 1,
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
