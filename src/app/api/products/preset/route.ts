import { aiAvailable } from "@/core/ai/provider";
import { NextResponse } from "next/server";
import { getDb } from "@/core/db/client";
import { requireUser } from "@/core/security/session";
import { apiError } from "@/core/security/http";
import { presetIds } from "@/core/db/presets";
import { presetOutputSchema } from "@/core/api-schemas";
export async function GET() {
  try {
    await requireUser();
    const db = await getDb();
    const products = await db
      .collection("products")
      .find({ barcode: { $in: presetIds.map((id) => `case-${id}`) } })
      .toArray();
    return NextResponse.json(
      presetOutputSchema.parse({
        presets: presetIds.flatMap((id) => {
          const p = products.find((p) => p.barcode === `case-${id}`);
          return p ? [{ id, name: p.name, description: p.source.note }] : [];
        }),
        aiAvailable: aiAvailable(),
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
