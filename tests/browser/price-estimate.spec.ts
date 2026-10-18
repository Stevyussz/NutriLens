import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { priceReview } from "../fixtures/price-review";
// Fixtures exercise UI states; these amounts are not market observations.
test("price estimates stay separate from nutrition and show source/model/error provenance", async ({
  page,
  baseURL,
}) => {
  await page.request.post("/api/auth/guest", { headers: { origin: baseURL! } });
  await page.goto("/scanner");
  await page.route("**/api/extract", (r) => r.fulfill({ json: priceReview }));
  const base = {
    mode: "AI_ESTIMATE",
    lowIdr: 3000,
    highIdr: 5000,
    packageText: "200 ml / kemasan",
    checkedAt: "2026-10-18T00:00:00Z",
    internetStatus: "CHECKED",
    sources: [],
    note: "Perkiraan AI, belum didukung harga toko yang cocok.",
  };
  let current: any = base;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/price-estimate", async (route) => {
    await pending;
    if (current === null)
      await route.fulfill({
        status: 503,
        json: { error: "Temporary test failure" },
      });
    else await route.fulfill({ json: current });
  });
  await page
    .getByLabel("Foto komposisi dan informasi gizi")
    .setInputFiles("tests/fixtures/golda-nutrition-user-repeat.png");
  await page
    .getByRole("button", { name: "Baca foto label", exact: true })
    .click();
  await expect(page.locator("#photo-decision-title")).toContainText("19 g");
  await expect(page.locator(".price-estimate")).toContainText(
    "Nara sedang memeriksa",
  );
  await mkdir(".impeccable/review/price-estimate", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".price-estimate").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: ".impeccable/review/price-estimate/loading-390.png",
  });
  release();
  await expect(page.locator(".price-estimate")).toContainText("Perkiraan Nara");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
    await page.locator(".price-estimate").scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.impeccable/review/price-estimate/model-${width}.png`,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".price-estimate summary").click();
  await expect(page.locator(".price-estimate")).toContainText(
    "tanpa bukti harga produk yang cocok",
  );
  await page.screenshot({
    path: ".impeccable/review/price-estimate/model-detail-390.png",
  });
  // Reload creates a new query client; page routes remain.
  current = {
    ...base,
    mode: "SOURCED_ESTIMATE",
    lowIdr: 3500,
    highIdr: 3500,
    note: "Observasi komunitas, barcode belum dicocokkan.",
    sources: [
      {
        url: "https://prices.openfoodfacts.org/api/v1/prices/1",
        date: "2026-10-18",
        priceIdr: 3500,
        location: "Toko fixture pengujian",
      },
    ],
  };
  await page.reload();
  await page
    .getByLabel("Foto komposisi dan informasi gizi")
    .setInputFiles("tests/fixtures/golda-nutrition-user-repeat.png");
  await page
    .getByRole("button", { name: "Baca foto label", exact: true })
    .click();
  await expect(page.locator(".price-estimate")).toContainText(
    "Kisaran dari observasi",
  );
  await page.locator(".price-estimate summary").click();
  await expect(page.locator(".price-estimate a")).toHaveAttribute(
    "href",
    current.sources[0].url,
  );
  await page.locator(".price-estimate").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: ".impeccable/review/price-estimate/sourced-390.png",
  });
  current = null;
  await page.reload();
  await page
    .getByLabel("Foto komposisi dan informasi gizi")
    .setInputFiles("tests/fixtures/golda-nutrition-user-repeat.png");
  await page
    .getByRole("button", { name: "Baca foto label", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Coba estimasi harga lagi", exact: true }),
  ).toBeVisible();
  await page.locator(".price-estimate").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: ".impeccable/review/price-estimate/error-390.png",
  });
  current = {
    ...base,
    mode: "UNAVAILABLE",
    lowIdr: null,
    highIdr: null,
    note: "Kisaran belum tersedia.",
  };
  await page
    .getByRole("button", { name: "Coba estimasi harga lagi", exact: true })
    .click();
  await expect(page.locator(".price-estimate")).toContainText(
    "Kisaran harga belum tersedia",
  );
  await page.screenshot({
    path: ".impeccable/review/price-estimate/unavailable-390.png",
  });
  await expect(page.locator("#photo-decision-title")).toContainText("19 g");
});
