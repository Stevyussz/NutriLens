import { test, expect } from "@playwright/test";

test("input drafts survive method switches and mobile results precede examples", async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.request.post("/api/auth/guest", {
    headers: { origin: baseURL ?? "http://localhost:3000" },
  });
  await page.goto("/scanner");
  await page
    .getByRole("button", { name: "Isi informasi kemasan", exact: true })
    .click();
  await page
    .getByLabel("Nama produk", { exact: true })
    .fill("Catatan kemasan saya");
  await page.getByRole("button", { name: "Teks bebas", exact: true }).click();
  await page
    .getByLabel("Salin nama, komposisi dan seluruh informasi gizi")
    .fill("Komposisi kemasan yang sedang saya salin.");
  await page.getByRole("button", { name: "Foto kemasan", exact: true }).click();
  await page.getByLabel("Foto komposisi dan informasi gizi").setInputFiles({
    name: "label-check.png",
    mimeType: "image/png",
    buffer: Buffer.from("selection retained without uploading"),
  });
  await page
    .getByRole("button", { name: "Label lengkap", exact: true })
    .click();
  await expect(page.getByLabel("Nama produk", { exact: true })).toHaveValue(
    "Catatan kemasan saya",
  );
  await page.getByRole("button", { name: "Teks bebas", exact: true }).click();
  await expect(
    page.getByLabel("Salin nama, komposisi dan seluruh informasi gizi"),
  ).toHaveValue("Komposisi kemasan yang sedang saya salin.");
  await page.getByRole("button", { name: "Foto kemasan", exact: true }).click();
  expect(
    await page
      .getByLabel("Foto komposisi dan informasi gizi")
      .evaluate((el) => (el as HTMLInputElement).files?.[0]?.name),
  ).toBe("label-check.png");
  await page
    .getByRole("button", { name: "FitGandum, sereal ilustratif" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "FitGandum, sereal ilustratif",
      exact: true,
    }),
  ).toBeFocused();
  const result = await page.locator(".scan-results").boundingBox();
  const examples = await page.locator("#contoh-analisis").boundingBox();
  expect(examples!.y).toBeGreaterThanOrEqual(result!.y + result!.height);
  expect(
    await page.evaluate(() =>
      Boolean(
        document
          .querySelector(".scan-results")!
          .compareDocumentPosition(
            document.querySelector("#contoh-analisis")!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Contoh lainnya", exact: true }).click();
  await expect(page.locator("#contoh-analisis")).toBeInViewport();
  await page
    .getByRole("link", { name: "Periksa label lain", exact: true })
    .click();
  await expect(page.locator("#label-entry")).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Kamus bahan", exact: true }).click();
  await page.getByText("Sumber dan cakupan data", { exact: true }).click();
  await expect(
    page.locator(".coverage-body").filter({ hasText: "Produk dan harga" }),
  ).toContainText("Cakupan produk lokal masih terbatas");
  await expect(
    page.locator(".coverage-body").filter({ hasText: "Produk dan harga" }),
  ).toContainText("estimasi");
});
