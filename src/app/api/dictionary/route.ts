import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/core/db/client";
import { dictionaryOutputSchema } from "@/core/api-schemas";
import { requireUser } from "@/core/security/session";
import { apiError } from "@/core/security/http";
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
      .max(1000)
      .parse(url.searchParams.get("page") ?? 1);
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = q
      ? {
          $or: [
            { canonicalName: { $regex: escaped, $options: "i" } },
            { aliases: { $regex: escaped, $options: "i" } },
            { insOrECode: { $regex: escaped, $options: "i" } },
          ],
        }
      : {};
    const collection = (await getDb()).collection("chemical_dictionary");
    const [entries, total] = await Promise.all([
      collection
        .find(filter, { projection: { _id: 0 } })
        .sort({ canonicalName: 1 })
        .skip((page - 1) * 12)
        .limit(12)
        .toArray(),
      collection.countDocuments(filter),
    ]);
    return NextResponse.json(
      dictionaryOutputSchema.parse({
        entries,
        total,
        page,
        pages: Math.ceil(total / 12),
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
