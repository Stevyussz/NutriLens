import { NextResponse } from "next/server";
import { getDb } from "@/core/db/client";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await (await getDb()).command({ ping: 1 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
