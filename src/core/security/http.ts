import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./errors";
export { HttpError } from "./errors";
/** Rejects cross-site state changes; forwarded hosts are never trusted implicitly. O(1). */
export function assertOrigin(request: Request): void {
  const allowed = (process.env.APP_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((entry) => {
      try {
        return new URL(entry.trim()).origin;
      } catch {
        return null;
      }
    })
    .filter((o): o is string => Boolean(o));

  const origin = request.headers.get("origin");
  if (!origin || !allowed.includes(origin))
    throw new HttpError(
      403,
      "Asal permintaan tidak diizinkan. Muat ulang dari alamat aplikasi.",
    );
}
/** Caps streaming body bytes before parsing JSON. O(b) time and memory, b<=limit. */
export async function readBytes(
  request: Request,
  limit: number,
): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > limit)
    throw new HttpError(413, "Ukuran kiriman terlalu besar.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new HttpError(413, "Ukuran kiriman terlalu besar.");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export async function readJson(request: Request): Promise<unknown> {
  try {
    return JSON.parse(
      new TextDecoder().decode(await readBytes(request, 64000)),
    ) as unknown;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "JSON tidak valid.");
  }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: "Data tidak sesuai format. Periksa isian dan satuan.",
        fields: error.issues.map((i) => i.path.join(".")),
      },
      { status: 400 },
    );
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    {
      error:
        "Layanan belum tersedia. Periksa koneksi database atau coba kembali.",
    },
    { status: 503 },
  );
}
