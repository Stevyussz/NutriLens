import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("personal profile saves meaningful preferences without budget and keeps optional references disclosed", async ({
  page,
  baseURL,
}) => {
  const origin = baseURL ?? "http://localhost:3000";
  await page.request.post("/api/auth/guest", { headers: { origin } });
  await page.goto("/security-profile");
  await expect(page.getByLabel("Alergi, pisahkan dengan koma")).toBeVisible();
  await expect(page.getByLabel("Anggaran per camilan (Rp)")).toHaveCount(0);
  await expect(page.getByLabel("Acuan gula harian (g)")).not.toBeVisible();
  await page.getByLabel("Alergi, pisahkan dengan koma").fill("susu, kedelai");
  const saved = page.waitForRequest(
    (r) => r.url().endsWith("/api/profile") && r.method() === "PATCH",
  );
  await page
    .getByRole("button", { name: "Simpan profil", exact: true })
    .click();
  expect((await saved).postDataJSON()).not.toHaveProperty("maxSnackBudgetIdr");
  await expect(
    page.getByRole("status").filter({ hasText: "Profil tersimpan" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Alergi, pisahkan dengan koma")).toHaveValue(
    "susu, kedelai",
  );
  await mkdir(".impeccable/review/profile-personal", { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.impeccable/review/profile-personal/profile-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".profile-reference summary").click();
  await expect(page.getByLabel("Acuan gula harian (g)")).toBeVisible();
  await page.getByLabel("Acuan gula harian (g)").fill("40");
  await page
    .getByRole("button", { name: "Simpan profil", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Profil tersimpan" }),
  ).toBeVisible();
  await page.locator(".profile-reference summary").click();
  await expect(page.getByLabel("Acuan gula harian (g)")).toHaveValue("40");
  await page.screenshot({
    path: ".impeccable/review/profile-personal/reference-390.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Perangkat & akses", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sesi perangkat" }),
  ).toBeVisible();
  await page.screenshot({
    path: ".impeccable/review/profile-personal/devices-390.png",
    fullPage: true,
  });
});
