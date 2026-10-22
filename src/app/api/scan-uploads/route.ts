import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/core/security/session";
import {
  assertOrigin,
  apiError,
  HttpError,
  readJson,
} from "@/core/security/http";
import { enforceRequestLimit } from "@/core/security/shared-rate-limiter";
import { getDb } from "@/core/db/client";
import {
  discardUploads,
  isOwnedUploadPath,
  uploadPathsSchema,
  type ScanUpload,
} from "@/core/scan-uploads";
import { MAX_SCAN_PHOTO_BYTES } from "@/core/scan-photo-limits";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(
      {
        enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
        owner: user._id.toHexString(),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    if (!process.env.BLOB_READ_WRITE_TOKEN)
      throw new HttpError(503, "Unggahan cloud belum tersedia.");
    const owner = user._id.toHexString();
    await enforceRequestLimit(`upload:${owner}`, 48);
    const body = (await readJson(request)) as HandleUploadBody;
    if (!body || body.type !== "blob.generate-client-token")
      throw new HttpError(400, "Permintaan unggahan tidak valid.");
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!isOwnedUploadPath(pathname, owner))
          throw new HttpError(403, "Lokasi unggahan tidak diizinkan.");
        const validUntil = Date.now() + 5 * 60000;
        await (
          await getDb()
        )
          .collection<ScanUpload>("scan_uploads")
          .insertOne({
            _id: pathname,
            owner,
            expiresAt: new Date(validUntil + 60000),
            state: "issued",
          });
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: MAX_SCAN_PHOTO_BYTES,
          validUntil,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    });
    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    await enforceRequestLimit(`upload-delete:${user._id}`, 20);
    const { uploads } = uploadPathsSchema.parse(await readJson(request));
    await discardUploads(uploads, user._id.toHexString());
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
