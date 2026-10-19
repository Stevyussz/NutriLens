import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractPhotoForReview } from "../src/core/ai/photo-extraction";
import { photoReviewSchema } from "../src/core/ai/vision-contract";
import { priceReview } from "./fixtures/price-review";
import { MAX_SCAN_PHOTOS } from "../src/core/scan-photo-limits";

test("photo evidence accepts six views, rejects excess, and retains every view", async () => {
  const images = Array.from({ length: MAX_SCAN_PHOTOS }, (_, i) => ({
    width: 600 + i,
    height: 600,
  }));
  assert.deepEqual(
    photoReviewSchema.parse({ ...priceReview, images }).images,
    images,
  );
  assert.equal(
    photoReviewSchema.safeParse({
      ...priceReview,
      images: [...images, images[0]],
    }).success,
    false,
  );
  await assert.rejects(extractPhotoForReview([]), /1–6 foto/);
  await assert.rejects(
    extractPhotoForReview(Array.from({ length: 7 }, () => new Uint8Array())),
    /1–6 foto/,
  );
});
test("vision receives all six images in order in one request and keeps their evidence", async () => {
  const dir = await mkdtemp(join(tmpdir(), "bongkar-six-"));
  const socket = join(dir, "p.sock");
  const keys = [
    "NINE_ROUTER_BASE_URL",
    "NINE_ROUTER_API_KEY",
    "NINE_ROUTER_SOCKET_PATH",
    "NINE_ROUTER_MODEL",
  ] as const;
  const before = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  let widths: number[] = [];
  let calls = 0;
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      void (async () => {
        calls++;
        const input = JSON.parse(body);
        const images = input.messages[1].content.filter(
          (p: any) => p.type === "image_url",
        );
        widths = await Promise.all(
          images.map(
            async (p: any) =>
              (
                await sharp(
                  Buffer.from(p.image_url.url.split(",")[1], "base64"),
                ).metadata()
              ).width,
          ),
        );
        res
          .writeHead(200, { "content-type": "application/json" })
          .end(
            JSON.stringify({
              choices: [
                { message: { content: JSON.stringify(priceReview.evidence) } },
              ],
            }),
          );
      })().catch(() => res.writeHead(500).end());
    });
  });
  await new Promise<void>((resolve) => server.listen(socket, resolve));
  try {
    Object.assign(process.env, {
      NINE_ROUTER_BASE_URL: "http://localhost:12345/v1",
      NINE_ROUTER_API_KEY: "fixture-only",
      NINE_ROUTER_SOCKET_PATH: socket,
      NINE_ROUTER_MODEL: "fixture-vision",
    });
    const images = [];
    for (let i = 0; i < MAX_SCAN_PHOTOS; i++)
      images.push(
        await sharp({
          create: {
            width: 600 + i,
            height: 600,
            channels: 3,
            background: "white",
          },
        })
          .png()
          .toBuffer(),
      );
    const review = await extractPhotoForReview(images);
    assert.equal(calls, 1);
    assert.deepEqual(widths, [600, 601, 602, 603, 604, 605]);
    assert.deepEqual(
      review.images.map((p) => p.width),
      widths,
    );
    assert.equal(review.nutrition.sugarGrams, 19);
  } finally {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  }
});
