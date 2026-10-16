import { NextResponse } from "next/server";
import { getDb } from "@/core/db/client";
import { requireUser } from "@/core/security/session";
import { apiError, HttpError } from "@/core/security/http";
import { historyListSchema } from "@/core/history-schema";
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const db = await getDb();
    const raw = new URL(request.url).searchParams.get("page") || "1";
    const search = (new URL(request.url).searchParams.get("q") ?? "").trim();
    if (search.length > 120)
      throw new HttpError(400, "Pencarian riwayat maksimal 120 karakter.");
    const filter = {
      userId: user._id,
      ...(search && {
        "result.extractedProductData.name": {
          $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        },
      }),
    };
    if (!/^\d{1,3}$/.test(raw) || Number(raw) < 1)
      throw new HttpError(400, "Halaman riwayat tidak valid.");
    const total = await db.collection("scan_history").countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / 8));
    const page = Math.min(Number(raw), pages);
    const rows = await db
      .collection("scan_history")
      .find(filter, {
        projection: {
          createdAt: 1,
          "result.extractedProductData.name": 1,
          "result.extractedProductData.nutrition": 1,
          "result.extractedProductData.source.kind": 1,
          "result.aiVerdict.medicalStatus": 1,
        },
      })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * 8)
      .limit(8)
      .toArray();
    return NextResponse.json(
      historyListSchema.parse({
        items: rows.map((r) => ({
          id: r._id.toHexString(),
          createdAt: r.createdAt.toISOString(),
          name: r.result.extractedProductData.name,
          status: r.result.aiVerdict.medicalStatus,
          sugarGrams: r.result.extractedProductData.nutrition.sugarGrams,
          sodiumMg: r.result.extractedProductData.nutrition.sodiumMg,
          illustrative:
            r.result.extractedProductData.source.kind === "ILLUSTRATIVE_CASE",
        })),
        page,
        pages,
        total,
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
