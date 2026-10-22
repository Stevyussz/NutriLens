import { del, get } from "@vercel/blob";
import { z } from "zod";
import { getDb } from "./db/client";
import { HttpError, readBytes } from "./security/http";
import { MAX_SCAN_PHOTOS, MAX_SCAN_PHOTO_BYTES } from "./scan-photo-limits";

export const uploadPathsSchema = z
  .object({
    uploads: z.array(z.string().max(160)).min(1).max(MAX_SCAN_PHOTOS),
  })
  .strict()
  .refine(({ uploads }) => new Set(uploads).size === uploads.length);

export function isOwnedUploadPath(path: string, owner: string): boolean {
  return (
    /^[a-f0-9]{24}$/.test(owner) &&
    new RegExp(
      `^scans/${owner}/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.(jpg|png|webp)$`,
    ).test(path)
  );
}

export type ScanUpload = {
  _id: string;
  owner: string;
  expiresAt: Date;
  state: "issued" | "reading" | "consumed";
};
export async function discardUploads(
  paths: string[],
  owner: string,
): Promise<void> {
  const db = await getDb();
  for (const path of paths) {
    if (!isOwnedUploadPath(path, owner)) continue;
    const row = await db
      .collection<ScanUpload>("scan_uploads")
      .findOne({ _id: path, owner });
    if (!row) continue;
    await db
      .collection<ScanUpload>("scan_uploads")
      .updateOne({ _id: path, owner }, { $set: { state: "consumed" } });
    // Keep the record until token expiry: a still-valid client token could upload again.
    await del(path).catch(() =>
      console.error("Temporary scan photo cleanup deferred"),
    );
  }
}

export async function readUploadedPhotos(
  paths: string[],
  owner: string,
): Promise<Uint8Array[]> {
  if (!paths.every((path) => isOwnedUploadPath(path, owner)))
    throw new HttpError(403, "Foto tidak tersedia untuk akun ini.");
  const db = await getDb();
  const images: Uint8Array[] = [];
  try {
    for (const path of paths) {
      const row = await db
        .collection<ScanUpload>("scan_uploads")
        .findOneAndUpdate(
          { _id: path, owner, state: "issued", expiresAt: { $gt: new Date() } },
          { $set: { state: "reading" } },
          { returnDocument: "after" },
        );
      if (!row)
        throw new HttpError(
          410,
          "Unggahan foto kedaluwarsa atau sudah diproses. Coba kirim ulang.",
        );
      const result = await get(path, { access: "private", useCache: false });
      if (!result || result.statusCode !== 200)
        throw new HttpError(
          410,
          "Unggahan foto tidak ditemukan. Coba kirim ulang.",
        );
      if (result.blob.size > MAX_SCAN_PHOTO_BYTES) {
        await result.stream.cancel();
        throw new HttpError(413, "Ukuran foto melebihi 5 MB.");
      }
      images.push(
        await readBytes(
          new Request("https://upload.invalid", {
            method: "POST",
            body: result.stream,
            duplex: "half",
          } as RequestInit),
          MAX_SCAN_PHOTO_BYTES,
        ),
      );
    }
    return images;
  } finally {
    await discardUploads(paths, owner);
  }
}

export async function cleanupExpiredUploads(): Promise<number> {
  const db = await getDb();
  const rows = await db
    .collection<ScanUpload>("scan_uploads")
    .find({ expiresAt: { $lt: new Date() } })
    .limit(500)
    .toArray();
  const paths = rows
    .filter((row) => isOwnedUploadPath(row._id, row.owner))
    .map((row) => row._id);
  let removed = 0;
  for (let offset = 0; offset < paths.length; offset += 100) {
    const batch = paths.slice(offset, offset + 100);
    await del(batch);
    await db
      .collection<ScanUpload>("scan_uploads")
      .deleteMany({ _id: { $in: batch }, expiresAt: { $lt: new Date() } });
    removed += batch.length;
  }
  return removed;
}
