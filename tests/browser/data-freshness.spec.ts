import { test, expect } from "@playwright/test";

test("source status exposes origin and collection dates without claiming live AI knowledge", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /^(?:Mulai )?[Ss]can label$/, exact: true })
    .first()
    .click();
  await page.waitForURL("**/scanner");
  await page
    .getByText("Status sumber: perlu diperiksa", { exact: true })
    .click();
  await expect(page.getByText(/salinan pengujian penyedia/)).toBeVisible();
  await expect(
    page.getByText(/Jawaban bukan penelusuran web langsung/),
  ).toBeVisible();
  await expect(
    page.getByText("Katalog diambil", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Kamus bahan", exact: true }).click();
  await page.getByText("Status pembaruan data", { exact: true }).click();
  await expect(page.getByText("Kamus diambil", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Observasi harga diambil", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".freshness-body")
    .screenshot({ path: "artifacts/data-freshness-mobile.png" });
});
