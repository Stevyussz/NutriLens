import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { priceReview } from "../fixtures/price-review";

test("photo API checks auth, origin, actual image decoding and low-resolution input", async ({
  page,
  request,
  baseURL,
}) => {
  const origin = baseURL!;
  const unauthed = await request.post("/api/extract", {
    headers: { origin },
    data: {},
  });
  expect(unauthed.status()).toBe(401);
  await page.goto("/");
  await page
    .getByRole("button", { name: /^(?:Mulai )?[Ss]can label$/, exact: true })
    .first()
    .click();
  await page.waitForURL("**/scanner");
  const invalidOrigin = await page.request.post("/api/extract", {
    headers: { origin: "https://untrusted.invalid" },
    data: {},
  });
  expect(invalidOrigin.status()).toBe(403);
  const invalid = await page.request.post("/api/extract", {
    headers: { origin },
    multipart: {
      image: {
        name: "bad.png",
        mimeType: "image/png",
        buffer: Buffer.from("not a valid PNG despite its name and MIME type"),
      },
    },
  });
  expect(invalid.status()).toBe(415);
  const tiny = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const small = await page.request.post("/api/extract", {
    headers: { origin },
    multipart: {
      image: { name: "tiny.png", mimeType: "image/png", buffer: tiny },
    },
  });
  expect(small.status()).toBe(422);
  expect((await small.json()).error).toMatch(/terlalu kecil/);
  const valid = await sharp({
    create: { width: 600, height: 600, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  async function uploadMany(images: Buffer[]) {
    const boundary = "bongkar-six-photos-boundary";
    const body = Buffer.concat([
      ...images.flatMap((image, index) => [
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="view-${index}.png"\r\nContent-Type: image/png\r\n\r\n`,
        ),
        image,
        Buffer.from("\r\n"),
      ]),
      Buffer.from(`--${boundary}--\r\n`),
    ]);
    return page.request.post("/api/extract", {
      headers: {
        origin,
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      data: body,
    });
  }
  const tooMany = await uploadMany(Array.from({ length: 7 }, () => valid));
  expect(tooMany.status()).toBe(400);
  expect((await tooMany.json()).error).toContain("1–6 foto");
  // The sixth file must be validated too; no silent truncation at two or five.
  const sixthTiny = await uploadMany([
    ...Array.from({ length: 5 }, () => valid),
    tiny,
  ]);
  expect(sixthTiny.status()).toBe(422);
  expect((await sixthTiny.json()).error).toMatch(/terlalu kecil/);
  const saved = await page.request.post("/api/photo-summary", {
    headers: { origin },
    data: {
      ...priceReview,
      images: Array.from({ length: 6 }, (_, i) => ({
        width: 600 + i,
        height: 600,
      })),
    },
  });
  expect(saved.ok()).toBe(true);
  const { historyId } = await saved.json();
  const history = await page.request.get(`/api/history/${historyId}`);
  expect(history.ok()).toBe(true);
  expect(
    (await history.json()).photoResult.images.map(
      (p: { width: number }) => p.width,
    ),
  ).toEqual([600, 601, 602, 603, 604, 605]);
  await page.request.delete(`/api/history/${historyId}`, {
    headers: { origin },
  });
  const bypass = await page.request.post("/api/scan", {
    headers: { origin },
    multipart: {
      image: { name: "valid.png", mimeType: "image/png", buffer: valid },
    },
  });
  expect(bypass.status()).toBe(422);
  expect((await bypass.json()).error).toMatch(/tinjau hasil/);
});
