import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { normalizePhotoTranscription } from "../../src/core/ai/vision-contract";
test.setTimeout(120000);
test.use({
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  },
});
test("live camera captures real JPEG frames, retains photos, stops tracks and opens the photo decision", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: /^(?:Mulai )?[Ss]can label$/, exact: true })
    .first()
    .click();
  await page.waitForURL("**/scanner");
  await expect(
    page.getByRole("heading", { name: "Foto langsung dari kamera." }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Foto komposisi dan informasi gizi"),
  ).not.toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Nyalakan kamera", exact: true })
    .click();
  await expect(page.getByLabel("Pratinjau kamera langsung")).toBeVisible();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v) => (v as HTMLVideoElement).videoWidth),
    )
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    (window as unknown as { cameraTrack: MediaStreamTrack }).cameraTrack = (
      document.querySelector("video")!.srcObject as MediaStream
    ).getVideoTracks()[0];
  });
  await page
    .getByRole("button", { name: "Ambil foto label", exact: true })
    .click();
  await expect(page.getByRole("img", { name: "Foto pilihan 1" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Baca foto label", exact: true }),
  ).toBeInViewport();
  for (let count = 2; count <= 6; count++) {
    await page
      .getByRole("button", { name: "Ambil foto label", exact: true })
      .click();
    await expect(page.getByRole("img", { name: /Foto pilihan/ })).toHaveCount(
      count,
    );
  }
  await expect(
    page.getByRole("button", { name: "Ambil foto label", exact: true }),
  ).toBeDisabled();
  await mkdir(".impeccable/review/multi-photo", { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `.impeccable/review/multi-photo/camera-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/camera-live-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Periksa foto 1", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Foto label 1" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { cameraTrack: MediaStreamTrack }).cameraTrack
            .readyState,
      ),
    )
    .toBe("ended");
  await page.setViewportSize({ width: 320, height: 780 });
  await page
    .getByRole("button", { name: "Perbesar foto", exact: true })
    .click();
  await expect(page.locator(".photo-inspector-image")).toHaveClass(/is-zoomed/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".photo-inspector-image").focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() =>
      page.locator(".photo-inspector-image").evaluate((el) => el.scrollLeft),
    )
    .toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Periksa foto 1", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Teks label", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { cameraTrack: MediaStreamTrack }).cameraTrack
            .readyState,
      ),
    )
    .toBe("ended");
  await page.getByRole("button", { name: "Foto kemasan", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Nyalakan kamera", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /Foto pilihan/ })).toHaveCount(6);
  await page.getByRole("button", { name: "Buang foto 2", exact: true }).click();
  await page
    .getByLabel("Foto komposisi dan informasi gizi")
    .setInputFiles("tests/fixtures/per-serving.png");
  await expect(page.getByRole("img", { name: /Foto pilihan/ })).toHaveCount(6);
  const review = normalizePhotoTranscription(
    {
      productName: "Label kamera uji",
      brand: "",
      category: "CAMILAN_BISKUIT",
      servingText: "30 g",
      basis: "PER_SERVING",
      basisText: "Per sajian",
      nutritionText: {
        caloriesKcal: "140 kkal",
        sugarGrams: "12 g",
        proteinGrams: "3 g",
        sodiumMg: "90 mg",
        saturatedFatGrams: "2 g",
        fiberGrams: "1 g",
      },
      ingredientsText: "tepung gandum, gula, kakao",
      unreadableFields: [],
    },
    Array.from({ length: 6 }, () => ({ width: 1920, height: 1440 })),
  );
  let jpeg = false;
  let imageParts = 0;
  await page.route("**/api/extract", (route) => {
    imageParts = (
      route
        .request()
        .postDataBuffer()
        ?.toString("latin1")
        .match(/name="image";/g) ?? []
    ).length;
    jpeg = Boolean(
      route
        .request()
        .postDataBuffer()
        ?.includes(Buffer.from([0xff, 0xd8, 0xff])),
    );
    return route.fulfill({ json: review });
  });
  await page
    .getByRole("button", { name: "Baca foto label", exact: true })
    .click();
  await expect(page.locator("#photo-decision-title")).toBeVisible();
  expect(jpeg).toBe(true);
  expect(imageParts).toBe(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("gallery adds to captured selection and rejects excess or oversized files without losing photos", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /^(?:Mulai )?[Ss]can label$/, exact: true })
    .first()
    .click();
  await page.waitForURL("**/scanner");
  const input = page.getByLabel("Foto komposisi dan informasi gizi");
  await input.setInputFiles("tests/fixtures/per-serving.png");
  await expect(page.getByRole("img", { name: /Foto pilihan/ })).toHaveCount(1);
  await input.setInputFiles([
    "tests/fixtures/per-serving.png",
    "tests/fixtures/per-100-comma.png",
  ]);
  await expect(page.getByRole("img", { name: /Foto pilihan/ })).toHaveCount(3);
  await input.setInputFiles(
    Array.from({ length: 4 }, () => "tests/fixtures/per-serving.png"),
  );
  await expect(
    page.getByRole("alert").filter({ hasText: "Maksimal 6 foto" }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /Foto pilihan/ })).toHaveCount(3);
  await mkdir(".impeccable/review/multi-photo", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".impeccable/review/multi-photo/gallery-limit-390.png",
    fullPage: true,
  });
  await page
    .getByRole("alert")
    .filter({ hasText: "Maksimal 6 foto" })
    .evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }),
    );
  await page.screenshot({
    path: ".impeccable/review/multi-photo/gallery-limit-detail-390.png",
  });
  await input.setInputFiles({
    name: "besar.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "maksimal 5 MB" }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /Foto pilihan/ })).toHaveCount(3);
  await input.setInputFiles(
    Array.from({ length: 3 }, () => "tests/fixtures/per-100-comma.png"),
  );
  await expect(page.getByRole("img", { name: /Foto pilihan/ })).toHaveCount(6);
  await page.getByRole("button", { name: "Buang foto 4", exact: true }).click();
  await input.setInputFiles("tests/fixtures/per-serving.png");
  await expect(page.getByRole("img", { name: /Foto pilihan/ })).toHaveCount(6);
  await expect(
    page.locator('.scanner-entry .error-text[role="alert"]'),
  ).toHaveCount(0);
});
test("denied camera permission has a useful gallery fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        throw new DOMException("Denied for test", "NotAllowedError");
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: /^(?:Mulai )?[Ss]can label$/, exact: true })
    .first()
    .click();
  await page.waitForURL("**/scanner");
  await page
    .getByRole("button", { name: "Nyalakan kamera", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Kamera belum diizinkan" }),
  ).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Pilih foto dari galeri", exact: true })
    .click();
  await (await chooser).setFiles("tests/fixtures/per-serving.png");
  await expect(page.getByRole("img", { name: "Foto pilihan 1" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Baca foto label", exact: true }),
  ).toBeEnabled();
});
