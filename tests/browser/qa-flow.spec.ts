import { test, expect } from "@playwright/test";
import { normalizePhotoTranscription } from "../../src/core/ai/vision-contract";

test("browser Back and Forward follow the selected result detail", async ({
  page,
  baseURL,
}) => {
  await page.request.post("/api/auth/guest", { headers: { origin: baseURL! } });
  await page.goto("/scanner");
  await page
    .getByRole("button", { name: "Contoh analisis", exact: true })
    .click();
  await page
    .getByRole("button", { name: "FitGandum, sereal ilustratif" })
    .click();
  await expect(page.locator("#quick-title")).toBeVisible();
  await page.getByRole("link", { name: "Komposisi", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Komposisi", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(
    page.getByRole("link", { name: "Ringkasan", exact: true }),
  ).toHaveAttribute("aria-current", "page", { timeout: 5000 });
  await expect(page.locator("#quick-title")).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("link", { name: "Komposisi", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("button", { name: "Contoh analisis", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Kopi susu gula aren, studi kasus",
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Kopi susu gula aren, studi kasus",
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#hasil-ringkas$/);
  await expect(page.locator("#quick-title")).toBeVisible();
});

test("a saved result deep link and reload preserve the requested detail tab", async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.request.post("/api/auth/guest", { headers: { origin: baseURL! } });
  const scanned = await page.request.post("/api/scan", {
    headers: { origin: baseURL! },
    data: { presetId: "fitgandum" },
  });
  expect(scanned.ok()).toBe(true);
  const list = await (await page.request.get("/api/history")).json();
  await page.goto(`/scanner?history=${list.items[0].id}#sumber-gula`);
  const tab = page.getByRole("link", { name: "Sumber gula", exact: true });
  await expect(tab).toHaveAttribute("aria-current", "page", { timeout: 5000 });
  await expect(page.locator("#sumber-gula")).toBeVisible();
  await page.reload();
  await expect(tab).toHaveAttribute("aria-current", "page");
  await page.screenshot({
    path: "artifacts/qa-history-sugar-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Contoh analisis", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Kopi susu gula aren, studi kasus",
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Kopi susu gula aren, studi kasus",
      exact: true,
    }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.has("history")).toBe(false);
  await expect(page).toHaveURL(/#hasil-ringkas$/);
});

test("a failed photo request can be retried with the same selection before the immediate photo result", async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.request.post("/api/auth/guest", { headers: { origin: baseURL! } });
  await page.goto("/scanner");
  await page
    .getByLabel("Foto komposisi dan informasi gizi")
    .setInputFiles("tests/fixtures/per-serving.png");
  const review = normalizePhotoTranscription(
    {
      productName: "Label uji koneksi",
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
    [{ width: 1400, height: 1100 }],
  );
  let calls = 0;
  await page.route("**/api/extract", (route) =>
    ++calls === 1
      ? route.fulfill({
          status: 503,
          json: { error: "Koneksi uji terputus. Silakan ulangi pembacaan." },
        })
      : route.fulfill({ json: review }),
  );
  const read = page.getByRole("button", {
    name: "Baca foto label",
    exact: true,
  });
  await read.click();
  const failure = page
    .getByRole("alert")
    .filter({ hasText: "Koneksi uji terputus" });
  await expect(failure).toBeVisible();
  await expect(failure).toBeInViewport({ timeout: 5000 });
  await expect(failure).toBeFocused();
  await page.screenshot({ path: "artifacts/qa-ocr-error-mobile.png" });
  await expect(page.getByRole("img", { name: "Foto pilihan 1" })).toBeVisible();
  await expect(read).toBeEnabled();
  await read.click();
  await expect(page.locator("#photo-decision-title")).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /Saya sudah mencocokkan/ }),
  ).not.toBeVisible();
  expect(calls).toBe(2);
});
