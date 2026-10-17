import { test, expect } from "@playwright/test";
import sharp from "sharp";

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
  const bypass = await page.request.post("/api/scan", {
    headers: { origin },
    multipart: {
      image: { name: "valid.png", mimeType: "image/png", buffer: valid },
    },
  });
  expect(bypass.status()).toBe(422);
  expect((await bypass.json()).error).toMatch(/tinjau hasil/);
});
