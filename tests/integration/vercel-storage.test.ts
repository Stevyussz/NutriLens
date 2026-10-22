import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ObjectId, type MongoClient } from "mongodb";
import {
  put as clientPut,
  generateClientTokenFromReadWriteToken,
} from "@vercel/blob/client";
import { getDb } from "../../src/core/db/client";
import { consumeSharedLimit } from "../../src/core/security/shared-rate-limiter";
import {
  readUploadedPhotos,
  cleanupExpiredUploads,
  type ScanUpload,
} from "../../src/core/scan-uploads";

test(
  "Vercel private storage: six photos including a 5 MiB image, ownership, one-time reads, cleanup and distributed limits",
  { skip: !process.env.BLOB_READ_WRITE_TOKEN },
  async () => {
    process.env.MONGODB_DB = `bongkar_vercel_qa_${new ObjectId().toHexString()}`;
    const db = await getDb();
    const owner = new ObjectId().toHexString();
    const paths: string[] = [];
    try {
      const attempts = await Promise.allSettled(
        Array.from({ length: 12 }, () =>
          consumeSharedLimit(db, "concurrent-test", 5, 60000),
        ),
      );
      assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 5);
      assert.equal(attempts.filter((r) => r.status === "rejected").length, 7);
      const fixture = await readFile("tests/fixtures/golda-nutrition-user.png");
      const large = Buffer.concat([
        fixture,
        Buffer.alloc(5 * 1024 * 1024 - fixture.length),
      ]);
      for (let i = 0; i < 6; i++) {
        const pathname = `scans/${owner}/${crypto.randomUUID()}.png`;
        paths.push(pathname);
        const validUntil = Date.now() + 300000;
        const token = await generateClientTokenFromReadWriteToken({
          pathname,
          maximumSizeInBytes: 5 * 1024 * 1024,
          allowedContentTypes: ["image/png"],
          validUntil,
          addRandomSuffix: false,
          allowOverwrite: false,
        });
        await db
          .collection<ScanUpload>("scan_uploads")
          .insertOne({
            _id: pathname,
            owner,
            expiresAt: new Date(validUntil + 60000),
            state: "issued",
          });
        await clientPut(pathname, i === 0 ? large : fixture, {
          access: "private",
          token,
          contentType: "image/png",
        });
      }
      await assert.rejects(
        readUploadedPhotos(paths, new ObjectId().toHexString()),
        /akun ini/,
      );
      const images = await readUploadedPhotos(paths, owner);
      assert.equal(images.length, 6);
      assert.equal(images[0].length, large.length);
      assert.deepEqual(Buffer.from(images[5]), fixture);
      await assert.rejects(readUploadedPhotos(paths, owner), /sudah diproses/);
      await db
        .collection<ScanUpload>("scan_uploads")
        .updateMany({}, { $set: { expiresAt: new Date(0) } });
      assert.equal(await cleanupExpiredUploads(), 6);
      assert.equal(await db.collection("scan_uploads").countDocuments(), 0);
    } finally {
      const { del } = await import("@vercel/blob");
      if (paths.length) await del(paths);
      await db.dropDatabase();
      await (
        globalThis as typeof globalThis & {
          mongoConnection?: Promise<MongoClient>;
        }
      ).mongoConnection?.then((client) => client.close());
    }
  },
);
