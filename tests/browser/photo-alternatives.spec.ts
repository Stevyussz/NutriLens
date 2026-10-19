import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { priceReview } from "../fixtures/price-review";
test("owned scans yield a relevant equal-volume alternative, with sources, education and price provenance", async ({
  page,
  browser,
  baseURL,
}) => {
  const origin = baseURL!;
  await page.request.post("/api/auth/guest", { headers: { origin } });
  const original = await (
    await page.request.post("/api/photo-summary", {
      headers: { origin },
      data: priceReview,
    })
  ).json();
  const other = {
    ...structuredClone(priceReview),
    brand: "Contoh QA",
    name: "Kopi pembanding uji 200 ml",
    ingredientsText: "Air, isolat protein kedelai, kopi",
    nutrition: {
      ...priceReview.nutrition,
      sugarGrams: 0,
      sodiumMg: 0,
      saturatedFatGrams: 0,
    },
  };
  const savedOther = await (
    await page.request.post("/api/photo-summary", {
      headers: { origin },
      data: other,
    })
  ).json();
  const r = await page.request.post("/api/photo-alternatives", {
    headers: { origin },
    data: { historyId: original.historyId },
  });
  expect(r.ok()).toBe(true);
  expect(r.headers()["cache-control"]).toContain("no-store");
  const data = await r.json();
  expect(data.status).toBe("FOUND");
  const candidate = data.candidates.find(
    (p: any) => p.id === "scan-" + savedOther.historyId,
  );
  expect(candidate).toMatchObject({
    sourceKind: "OWN_SCAN",
    sugarGrams: 0,
    originalSugarGrams: 19,
    comparisonSize: 200,
    unit: "ml",
    packageQuantity: 200,
  });
  const outsider = await browser.newContext();
  await outsider.request.post(origin + "/api/auth/guest", {
    headers: { origin },
  });
  const forbidden = await outsider.request.post(
    origin + "/api/photo-alternatives",
    { headers: { origin }, data: { historyId: original.historyId } },
  );
  expect(forbidden.status()).toBe(404);
  const no = await page.request.post("/api/photo-alternatives", {
    headers: { origin: "https://foreign.invalid" },
    data: { historyId: original.historyId },
  });
  expect(no.status()).toBe(403);
  const invalid = await page.request.post("/api/photo-alternatives/price", {
    headers: { origin },
    data: { historyId: original.historyId, candidateId: "8999999999999" },
  });
  expect(invalid.status()).toBe(404);
  await outsider.close();
  await page.route("**/api/ask-nara", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Controlled unavailable brief" },
    }),
  );
  await page.route("**/api/product-research", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Controlled unavailable research" },
    }),
  );
  await page.route("**/api/price-estimate", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Controlled unavailable original price" },
    }),
  );
  await page.route("**/api/photo-alternatives/price", (route) =>
    route.fulfill({
      json: {
        mode: "AI_ESTIMATE",
        lowIdr: 3500,
        highIdr: 5500,
        packageText: "200 ml / kemasan",
        checkedAt: new Date().toISOString(),
        internetStatus: "UNAVAILABLE",
        sources: [],
        note: "Kisaran ilustratif untuk QA tampilan, bukan harga produk nyata.",
      },
    }),
  );
  await page.goto("/scanner?history=" + original.historyId);
  await page
    .getByRole("link", { name: "Pilihan pengganti", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Pilihan produk pembanding" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: other.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Perkiraan AI: Rp\s*3[.]500/).first(),
  ).toBeVisible();
  await mkdir(".impeccable/review/alternatives", { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
    // A readable sodium quantity keeps its value and unit on one line.
    const sodiumLines = await page.locator(".alternative-numbers dd").nth(1).evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))).size;
    });
    expect(sodiumLines).toBe(1);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.impeccable/review/alternatives/choices-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByText("Kekurangan & sumber data", { exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("link", { name: /Foto di riwayatmu/ }).first(),
  ).toHaveAttribute("href", `/scanner?history=${savedOther.historyId}`);
  await page.getByText("Bekal memilih saat belanja", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Samakan ukurannya dulu" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: ".impeccable/review/alternatives/education-390.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Ringkasan", exact: true }).click();
  await expect(
    page.getByText(
      "Untuk gula lebih sedikit, pertimbangkan " + other.name + ".",
    ),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: ".impeccable/review/alternatives/summary-390.png",
    fullPage: true,
  });
  await writeFile(
    ".impeccable/review/alternatives/api.json",
    JSON.stringify(
      {
        provenance:
          "Controlled saved-photo fixtures and displayed price, NOT vision extraction or real product price; actual recommendation API and owner checks.",
        data,
      },
      null,
      2,
    ),
  );
  for (const id of [original.historyId, savedOther.historyId])
    await page.request.delete("/api/history/" + id, { headers: { origin } });
});
test("recommendation loading, retry and no-match remain honest and usable", async ({
  page,
  baseURL,
}) => {
  const origin = baseURL!;
  await page.request.post("/api/auth/guest", { headers: { origin } });
  const saved = await (
    await page.request.post("/api/photo-summary", {
      headers: { origin },
      data: priceReview,
    })
  ).json();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let attempt = 0;
  await page.route("**/api/ask-nara", (r) =>
    r.fulfill({ status: 503, json: { error: "Controlled brief outage" } }),
  );
  await page.route("**/api/photo-alternatives", async (route) => {
    if (++attempt === 1) {
      await gate;
      await route.fulfill({
        status: 503,
        json: { error: "Controlled outage" },
      });
    } else
      await route.fulfill({
        json: {
          status: "NO_MATCH",
          title: "Belum ada pengganti yang cukup terbukti.",
          action: "Scan produk sejenis untuk membandingkan.",
          checkedAt: new Date().toISOString(),
          comparison: { size: 200, unit: "ml" },
          candidates: [],
          warnings: ["Sumber internet belum tersedia."],
          lessons: [
            { title: "Samakan ukuran", text: "Gunakan porsi yang sama." },
          ],
        },
      });
  });
  await page.goto("/scanner?history=" + saved.historyId);
  await page
    .getByRole("link", { name: "Pilihan pengganti", exact: true })
    .click();
  await expect(
    page.getByText("Mencari pembanding yang sesuai", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await mkdir(".impeccable/review/alternatives", { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: ".impeccable/review/alternatives/loading-390.png",
    fullPage: true,
  });
  release();
  await expect(
    page.getByText("Pembanding belum berhasil dimuat.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: ".impeccable/review/alternatives/error-390.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Cari pembanding lagi", exact: true })
    .click();
  await expect(
    page.getByText("Belum ada pengganti yang cukup terbukti.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".alternative-row")).toHaveCount(0);
  await page.screenshot({
    path: ".impeccable/review/alternatives/no-match-390.png",
    fullPage: true,
  });
  await page.request.delete("/api/history/" + saved.historyId, {
    headers: { origin },
  });
});
