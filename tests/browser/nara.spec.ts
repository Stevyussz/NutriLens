import { test, expect as baseExpect } from "@playwright/test";
import { normalizePhotoTranscription } from "../../src/core/ai/vision-contract";
import { mkdir } from "node:fs/promises";
const expect = baseExpect.configure({ timeout: 60000 });
const photo = normalizePhotoTranscription(
  {
    productName: "Coffee Cappuccino",
    brand: "Golda",
    category: "MINUMAN_KEMASAN",
    servingText: "200 ml",
    servingsPerContainerText: "1 Sajian Per Kemasan",
    basis: "PER_SERVING",
    basisText: "Per sajian",
    nutritionText: {
      caloriesKcal: "180 kkal",
      sugarGrams: "19 g",
      proteinGrams: "2 g",
      sodiumMg: "80 mg",
      saturatedFatGrams: "5 g",
      fiberGrams: null,
    },
    ingredientsText: "",
    unreadableFields: [],
  },
  [{ width: 398, height: 502 }],
);
test("Nara reads owned facts, answers without inventing values, recovers and respects reduced motion", async ({
  page,
  browser,
  baseURL,
}) => {
  const origin = baseURL!;
  await page.request.post("/api/auth/guest", { headers: { origin } });
  const saved = await page.request.post("/api/photo-summary", {
    headers: { origin },
    data: photo,
  });
  expect(saved.ok()).toBeTruthy();
  const review = await saved.json();
  await page.route("**/api/product-research", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Source unavailable in controlled UI test" },
    }),
  );
  let release!: () => void;
  const pending = new Promise<void>((r) => (release = r));
  await page.route("**/api/extract", async (r) => {
    await pending;
    await r.fulfill({ json: review });
  });
  await page.goto("/scanner");
  await page
    .getByLabel("Foto komposisi dan informasi gizi")
    .setInputFiles("tests/fixtures/golda-nutrition-user.png");
  await page
    .getByRole("button", { name: "Baca foto label", exact: true })
    .click();
  await expect(
    page.getByText("Nara sedang membaca label", { exact: true }),
  ).toBeVisible();
  await mkdir(".impeccable/review/nara", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".nara-thinking").scrollIntoViewIfNeeded();
  await page.screenshot({ path: ".impeccable/review/nara/thinking-390.png" });
  expect(
    await page
      .locator(".nara-reading-mark b")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("nara-read");
  const before = await page
    .locator(".nara-reading-mark b")
    .evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(350);
  const after = await page
    .locator(".nara-reading-mark b")
    .evaluate((el) => getComputedStyle(el).transform);
  expect(after).not.toBe(before);
  await page.setViewportSize({ width: 390, height: 500 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.locator(".nara-thinking")).toHaveAttribute(
    "data-paused",
    "true",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".nara-thinking").scrollIntoViewIfNeeded();
  await expect(page.locator(".nara-thinking")).not.toHaveAttribute(
    "data-paused",
    "true",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".nara-reading-mark b")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.screenshot({
    path: ".impeccable/review/nara/reduced-motion-390.png",
  });
  await page
    .locator(".nara-thinking")
    .evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }),
    );
  await page.screenshot({
    path: ".impeccable/review/nara/reduced-motion-390.png",
  });
  release();
  await expect(page.locator("#photo-decision-title")).toBeVisible();
  await page.getByRole("button", { name: "Tanya Nara", exact: true }).click();
  await page
    .getByRole("button", { name: "Kalau habis satu kemasan?", exact: true })
    .click();
  await expect(page.locator(".nara-answer").last()).toContainText("19 g");
  await expect(page.locator(".nara-answer").last()).not.toContainText("38 g");
  await expect(page.locator(".nara-answer").last()).toBeFocused();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `.impeccable/review/nara/answer-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
  await page.route("**/api/ask-nara", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Layanan terputus saat pengujian." },
    }),
  );
  await page
    .getByLabel("Apa yang ingin kamu pahami?")
    .fill("Apa arti natrium?");
  await page.getByRole("button", { name: "Kirim pertanyaan ke Nara" }).click();
  await expect(page.locator(".nara-question-error")).toContainText(
    "Pertanyaan Anda tetap tersedia",
  );
  await expect(page.getByLabel("Apa yang ingin kamu pahami?")).toHaveValue(
    "Apa arti natrium?",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: ".impeccable/review/nara/error-390.png",
    fullPage: true,
  });
  await page.unroute("**/api/ask-nara");
  await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
  await expect(page.locator(".nara-answer").last()).toContainText("80 mg");
  const bad = await page.request.post("/api/ask-nara", {
    headers: { origin: "https://foreign.invalid" },
    data: { historyId: review.historyId, question: "Berapa gula?" },
  });
  expect(bad.status()).toBe(403);
  const invalid = await page.request.post("/api/ask-nara", {
    headers: { origin },
    data: { historyId: review.historyId, question: "x".repeat(501) },
  });
  expect(invalid.status()).toBe(400);
  const other = await browser.newContext();
  await other.request.post(origin + "/api/auth/guest", { headers: { origin } });
  const forbidden = await other.request.post(origin + "/api/ask-nara", {
    headers: { origin },
    data: { historyId: review.historyId, question: "Berapa gula?" },
  });
  expect(forbidden.status()).toBe(404);
  await other.close();
  await page
    .getByLabel("Apa yang ingin kamu pahami?")
    .fill("Natrium " + "a".repeat(492));
  await page.getByRole("button", { name: "Kirim pertanyaan ke Nara" }).click();
  await expect(page.locator(".nara-answer")).toHaveCount(3);
  const transcript = page.getByRole("region", { name: "Percakapan Nara" });
  expect((await transcript.boundingBox())!.height).toBeLessThanOrEqual(440);
  await expect(page.getByLabel("Apa yang ingin kamu pahami?")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: ".impeccable/review/nara/long-question-320.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Tutup percakapan", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Tanya Nara", exact: true }),
  ).toBeFocused();
  await expect(page.locator("#nara-conversation")).toHaveCount(0);
  await page.request.delete(`/api/history/${review.historyId}`, {
    headers: { origin },
  });
});
