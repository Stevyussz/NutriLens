import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/core/db/client";
import { requireUser } from "@/core/security/session";
import { apiError } from "@/core/security/http";
import { catalogueOutputSchema } from "@/core/db/catalogue";
export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const q = z
      .string()
      .max(100)
      .parse(url.searchParams.get("q") ?? "")
      .trim();
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .parse(url.searchParams.get("page") ?? 1);
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = q
      ? {
          $or: [
            { name: { $regex: escaped, $options: "i" } },
            { brand: { $regex: escaped, $options: "i" } },
            { providerCode: { $regex: escaped } },
          ],
        }
      : {};
    const collection = (await getDb()).collection("product_catalogue");
    const [entries, total] = await Promise.all([
      collection
        .find(filter, { projection: { _id: 0 } })
        .sort({ referenceEligible: -1, name: 1 })
        .skip((page - 1) * 4)
        .limit(4)
        .toArray(),
      collection.countDocuments(filter),
    ]);
    return NextResponse.json(
      catalogueOutputSchema.parse({
        entries,
        total,
        page,
        pages: Math.ceil(total / 4),
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
