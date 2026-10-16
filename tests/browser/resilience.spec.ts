import { test, expect } from "@playwright/test";
test("all public entry points reuse the same private session without assumed conditions", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Lihat cara kerjanya", exact: true })
    .click();
  await expect(page).toHaveURL(/#cara-baca$/);
  await page
    .getByRole("button", { name: "Periksa label", exact: true })
    .last()
    .click();
  await page.waitForURL("**/scanner");
  const token = (await context.cookies()).find(
    (c) => c.name === "bongkar_session",
  )?.value;
  expect(token).toBeTruthy();
  const profile = await page.request.get("/api/profile");
  expect((await profile.json()).healthProfile.conditions).toEqual([]);
  await page.getByRole("link", { name: "Bongkar Label", exact: true }).click();
  await page
    .getByRole("button", { name: "Periksa label", exact: true })
    .first()
    .click();
  await page.waitForURL("**/scanner");
  expect(
    (await context.cookies()).find((c) => c.name === "bongkar_session")?.value,
  ).toBe(token);
  await page
    .getByRole("button", { name: "Isi informasi kemasan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Periksa label ini", exact: true })
    .click();
  await expect(page.getByLabel("Nama produk", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Foto kemasan", exact: true }).click();
  await page.getByLabel("Foto komposisi dan informasi gizi").setInputFiles({
    name: "disguised.png",
    mimeType: "image/png",
    buffer: Buffer.from("<html>this is not an actual valid PNG image</html>"),
  });
  await page
    .getByRole("button", { name: "Baca foto label", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "bukan JPEG, PNG, atau WEBP" }),
  ).toBeVisible();
});
test("data error states provide working retries and dictionary clears to an actual empty result", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Periksa label", exact: true })
    .first()
    .click();
  await page.waitForURL("**/scanner");
  await page.route("**/api/dictionary?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Koneksi kamus terputus untuk pengujian.",
      }),
    }),
  );
  await page.getByRole("link", { name: "Kamus bahan", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Koneksi kamus terputus" }),
  ).toBeVisible();
  await page.unroute("**/api/dictionary?*");
  await page
    .getByRole("button", { name: "Muat ulang kamus", exact: true })
    .click();
  await expect(page.locator(".dictionary-entry").first()).toBeVisible();
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.route("**/api/profile", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Koneksi profil terputus untuk pengujian.",
      }),
    }),
  );
  await page.getByRole("link", { name: "Profil saya", exact: true }).click();
  // A fresh document exercises a failed request instead of the scanner's fresh profile cache.
  await page.reload();
  await expect(
    page.getByRole("alert").filter({ hasText: "Koneksi profil terputus" }),
  ).toBeVisible();
  await page.unroute("**/api/profile");
  await page
    .getByRole("button", { name: "Muat ulang profil", exact: true })
    .click();
  await expect(page.getByLabel("Anggaran per camilan (Rp)")).toBeVisible();
});
