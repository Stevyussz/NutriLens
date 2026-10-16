import { test, expect } from "@playwright/test";
import { normalizePhotoTranscription } from "../../src/core/ai/vision-contract";

test("photo transcription requires corrections and confirmation before analysis", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Scan label", exact: true })
    .first()
    .click();
  await page.waitForURL("**/scanner");
  let scans = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/scan")) scans++;
  });
  // A controlled response tests the review UI; OCR accuracy is measured separately.
  const review = normalizePhotoTranscription(
    {
      productName: "Biskuit uji browser",
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
        fiberGrams: null,
      },
      ingredientsText: "tepung gandum, gula, dekstrosa, madu, kakao",
      unreadableFields: ["serat"],
    },
    [{ width: 1400, height: 1100 }],
  );
  await page.route("**/api/extract", (route) =>
    route.fulfill({ json: review }),
  );
  await page.getByRole("button", { name: "Foto kemasan", exact: true }).click();
  await page
    .getByLabel("Foto komposisi dan informasi gizi")
    .setInputFiles("artifacts/vision-fixtures/per-serving.png");
  await page
    .getByRole("button", { name: "Baca foto label", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cocokkan dengan foto Anda" }),
  ).toBeVisible();
  expect(scans).toBe(0);
  const originalPhoto = await page
    .locator(".photo-previews img")
    .getAttribute("src");
  await page.getByRole("button", { name: "Foto kemasan", exact: true }).click();
  await page
    .getByLabel("Foto komposisi dan informasi gizi")
    .setInputFiles("artifacts/vision-fixtures/per-100-comma.png");
  await page
    .getByRole("button", { name: "Label lengkap", exact: true })
    .click();
  await expect(page.locator(".photo-previews img")).toHaveAttribute(
    "src",
    originalPhoto!,
  );

  await expect(
    page.getByLabel("Gula (g), per sajian", { exact: true }),
  ).toHaveValue("12");
  await expect(
    page.getByLabel("Serat (g), per sajian", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("Harga per sajian (Rp)", { exact: true }),
  ).toHaveValue("");
  await page.getByLabel("Serat (g), per sajian", { exact: true }).fill("1");
  const confirmation = page.getByRole("checkbox", {
    name: /Saya sudah mencocokkan/,
  });
  await expect(confirmation).not.toBeChecked();
  await confirmation.check();
  await page.getByLabel("Gula (g), per sajian", { exact: true }).fill("11");
  await expect(confirmation).not.toBeChecked();
  expect(scans).toBe(0);
  await confirmation.check();
  await page
    .locator(".ocr-review")
    .screenshot({ path: "artifacts/photo-review-desktop.png" });
  await page
    .getByRole("button", {
      name: "Analisis label yang sudah diperiksa",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Biskuit uji browser", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  expect(scans).toBe(1);
  const saved = await (await page.request.get("/api/history")).json();
  const detail = await (
    await page.request.get(`/api/history/${saved.items[0].id}`)
  ).json();
  expect(detail.result.extractedProductData.priceIdr).toBeNull();
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("catalogue search provides real source labels without inventing a price", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Scan label", exact: true })
    .first()
    .click();
  await page.waitForURL("**/scanner");
  await page
    .getByText("Cari produk atau barcode dari katalog", { exact: true })
    .click();
  await page.getByLabel("Nama produk, merek, atau barcode").fill("Indomie");
  await page.getByRole("button", { name: "Cari produk", exact: true }).click();
  await expect(
    page.locator(".catalogue-results article").first(),
  ).toBeVisible();
  await expect(
    page.locator(".catalogue-results article").first(),
  ).toContainText(/indomie/i);
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".catalogue-search")
    .screenshot({ path: "artifacts/catalogue-mobile.png" });
  await page
    .getByRole("button", { name: "Gunakan data label", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Nama produk", { exact: true })).toHaveValue(
    /indomie/i,
  );
  await expect(
    page.getByLabel("Harga per sajian (Rp)", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("checkbox", { name: /Saya sudah mencocokkan/ }),
  ).not.toBeChecked();
});
