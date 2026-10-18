import { test, expect } from "@playwright/test";
import { normalizePhotoTranscription } from "../../src/core/ai/vision-contract";

test("photo opens a decision immediately without compulsory nutrition entry; optional correction and private history work", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Mulai scan label", exact: true })
    .click();
  await page.waitForURL("**/scanner");
  let scans = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/scan")) scans++;
  });
  const review = normalizePhotoTranscription(
    {
      productName: "Golda label uji browser",
      brand: "Golda",
      category: "MINUMAN_KEMASAN",
      servingText: "200 ml",
      servingsPerContainerText: "1 Sajian Per Kemasan",
      basis: "PER_SERVING",
      basisText: "JUMLAH PER SAJIAN",
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
  await page.route("**/api/ask-nara", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Controlled explanation outage" },
    }),
  );
  await page.route("**/api/extract", (r) => r.fulfill({ json: review }));
  await page
    .getByLabel("Foto komposisi dan informasi gizi")
    .setInputFiles("tests/fixtures/golda-nutrition-user.png");
  await page
    .getByRole("button", { name: "Baca foto label", exact: true })
    .click();
  await expect(page.locator("#photo-decision-title")).toHaveText(
    "Kalau dihabiskan: 19 g gula.",
  );
  await expect(page.locator(".photo-result .quick-numbers")).toContainText(
    "19 g",
  );
  await expect(page.locator(".photo-result .quick-numbers")).toContainText(
    "80 mg",
  );
  await expect(page.locator(".photo-result .quick-action")).toContainText(
    "9,5 g gula",
  );
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator(".photo-choice-title")).toHaveCSS(
      "font-size",
      "14px",
    );
    expect(
      await page
        .locator(".photo-result .quick-action")
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(14);
  }
  await page
    .getByText("Dasar penjelasan & acuan profil", { exact: true })
    .click();
  await expect(
    page
      .locator(".photo-profile-context")
      .filter({ hasText: "Dasar penjelasan & acuan profil" }),
  ).toContainText("38%");
  await expect(page.locator(".photo-correction")).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: /Saya sudah mencocokkan/ }),
  ).not.toBeVisible();
  expect(scans).toBe(0);
  await page.getByRole("link", { name: "Komposisi", exact: true }).click();
  await expect(page.locator(".photo-detail")).toContainText(
    "Daftar komposisi belum ada pada foto",
  );
  await page.getByRole("link", { name: "Ringkasan", exact: true }).click();
  await page.getByRole("button", { name: "Koreksi angka bila perlu" }).click();
  await expect(
    page.getByLabel("Serat (g), per sajian", { exact: true }).last(),
  ).toHaveValue("");
  await page.locator(".photo-correction input[name=sugarGrams]").fill("18");
  await page
    .getByRole("button", { name: "Simpan koreksi", exact: true })
    .click();
  await expect(page.locator(".photo-correction")).toHaveCount(0);
  await expect(page.locator(".photo-result-origin")).toContainText(
    "koreksi Anda",
  );
  const saved = await (await page.request.get("/api/history")).json();
  const row = saved.items.find(
    (i: any) => i.name === "Golda label uji browser",
  );
  expect(row.kind).toBe("PHOTO");
  expect(row.sugarGrams).toBe(18);
  const detail = await (
    await page.request.get(`/api/history/${row.id}`)
  ).json();
  expect(detail.photoResult.nutrition.fiberGrams).toBeNull();
  expect(detail.result).toBeUndefined();
  await page.goto(`/scanner?history=${row.id}`);
  await expect(page.locator(".photo-result .quick-numbers")).toContainText(
    "18 g",
  );
  const other = await browser.newContext();
  const outsider = await other.newPage();
  await outsider.request.post(`${baseURL}/api/auth/guest`, {
    headers: { origin: baseURL! },
  });
  expect(
    (await outsider.request.get(`${baseURL}/api/history/${row.id}`)).status(),
  ).toBe(404);
  expect(
    (
      await outsider.request.delete(`${baseURL}/api/history/${row.id}`, {
        headers: { origin: baseURL! },
      })
    ).status(),
  ).toBe(404);
  await other.close();
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(scans).toBe(0);
});

test("catalogue search provides real source labels without inventing a price", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /^(?:Mulai )?[Ss]can label$/, exact: true })
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
