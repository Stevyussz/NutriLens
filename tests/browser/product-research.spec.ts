import { test, expect } from "@playwright/test";
import { normalizePhotoTranscription } from "../../src/core/ai/vision-contract";
test("web lookup never blocks or overwrites label facts; a failed lookup retries into attributed sources", async ({
  page,
  baseURL,
}) => {
  await page.request.post("/api/auth/guest", { headers: { origin: baseURL! } });
  await page.goto("/scanner");
  const review = normalizePhotoTranscription(
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
  await page.route("**/api/extract", (r) => r.fulfill({ json: review }));
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const at = new Date().toISOString();
  await page.route("**/api/product-research", async (route) => {
    calls++;
    if (calls === 1) {
      await pending;
      await route.fulfill({
        status: 503,
        json: { error: "Source unavailable in test" },
      });
    } else
      await route.fulfill({
        json: {
          checkedAt: at,
          status: "PARTIAL",
          sources: [
            {
              id: "wings-golda-coffee",
              title: "Golda Coffee",
              url: "https://wingscorp.com/id/merek/golda-coffee",
              kind: "MANUFACTURER",
              match: "BRAND_ONLY",
              excerpt: "Sumber produsen untuk merek (fixture pengujian).",
              sourceDate: at,
              checkedAt: at,
              agreements: ["Merek ditemukan."],
              differences: [
                "Gula berbeda: foto 19, sumber 20. Angka foto tidak diganti.",
                "Barcode belum dicocokkan.",
              ],
            },
          ],
          warnings: ["Katalog langsung belum tersedia."],
          ai: { mode: "DETERMINISTIC", selectedSourceIds: [] },
        },
      });
  });
  await page
    .getByLabel("Foto komposisi dan informasi gizi")
    .setInputFiles("tests/fixtures/golda-nutrition-user.png");
  await page
    .getByRole("button", { name: "Baca foto label", exact: true })
    .click();
  await expect(page.locator("#photo-decision-title")).toBeVisible();
  await expect(page.locator(".photo-result .quick-numbers")).toContainText(
    "19 g",
  );
  await expect(page.locator(".product-research")).toContainText(
    "Mencari sumber produk di belakang layar",
  );
  release();
  await expect(
    page.getByRole("button", { name: "Coba cari sumber lagi" }),
  ).toBeVisible();
  await expect(page.locator(".photo-result .quick-numbers")).toContainText(
    "19 g",
  );
  await page.getByRole("button", { name: "Coba cari sumber lagi" }).click();
  await expect(page.locator(".product-research")).toContainText(
    "Merek ditemukan di situs produsen",
  );
  await page.locator(".product-research summary").click();
  await expect(page.locator(".product-research")).toContainText(
    "foto 19, sumber 20",
  );
  await expect(page.locator(".photo-result .quick-numbers")).toContainText(
    "19 g",
  );
  expect(calls).toBe(2);
  const bad = await page.request.post("/api/photo-summary", {
    headers: { origin: baseURL! },
    data: { ...review, nutrition: { ...review.nutrition, sugarGrams: 99999 } },
  });
  expect(bad.status()).toBe(400);
  const csrf = await page.request.post("/api/product-research", {
    headers: { origin: "https://invalid.example" },
    data: review,
  });
  expect(csrf.status()).toBe(403);
});
