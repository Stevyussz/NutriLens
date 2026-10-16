import { test, expect } from "@playwright/test";
test("quick result is concise, history reloads the original profile, and entries remain private and removable", async ({
  page,
  browser,
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
  await expect(page.locator(".quick-action")).not.toBeEmpty();
  await expect(page.locator(".quick-numbers")).toContainText(
    "batas harian profil",
  );
  const list = await (await page.request.get("/api/history")).json();
  expect(list.items).toHaveLength(1);
  const id = list.items[0].id;
  const original = await (await page.request.get(`/api/history/${id}`)).json();
  expect(original).not.toHaveProperty("photos");
  const stranger = await browser.newContext();
  const other = await stranger.newPage();
  await other.goto(baseURL!);
  await other.request.post(`${baseURL}/api/auth/guest`, {
    headers: { origin: baseURL! },
  });
  expect(
    (await other.request.get(`${baseURL}/api/history/${id}`)).status(),
  ).toBe(404);
  expect(
    (
      await other.request.delete(`${baseURL}/api/history/${id}`, {
        headers: { origin: baseURL! },
      })
    ).status(),
  ).toBe(404);
  await stranger.close();
  await page.request.patch("/api/profile", {
    headers: { origin: baseURL! },
    data: { ...original.healthProfile, dailySugarLimitGrams: 100 },
  });
  await page.getByRole("link", { name: "Riwayat", exact: true }).click();
  await page.getByRole("link", { name: "Baca hasil", exact: true }).click();
  await expect(page.locator(".history-restored")).toBeVisible();
  await expect(page.locator(".quick-numbers")).toContainText(
    `${Math.round((original.result.extractedProductData.nutrition.sugarGrams / original.healthProfile.dailySugarLimitGrams) * 100)}%`,
  );
  await page.reload();
  await expect(page.locator("#quick-title")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Riwayat", exact: true }).click();
  await page.getByRole("button", { name: "Hapus", exact: true }).click();
  await page.getByRole("button", { name: "Ya, hapus", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Belum ada hasil tersimpan" }),
  ).toBeVisible();
  expect((await page.request.get(`/api/history/${id}`)).status()).toBe(404);
});
