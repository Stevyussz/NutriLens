import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test("warm theme, public flow, all examples, ingredient dialog, dictionary, profile and session end", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mkdir("artifacts", { recursive: true });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Kenali isinya",
  );
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toContain("gradient");
  await expect(page.locator(".hero .label-example")).toHaveCount(0);
  const example = await page.locator(".label-example").boundingBox();
  const hero = await page.locator(".hero").boundingBox();
  expect(example?.y).toBeGreaterThanOrEqual(
    (hero?.y ?? 0) + (hero?.height ?? 0),
  );
  expect(example?.height).toBeLessThan(320);
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(242, 239, 232)");
  await page.getByRole("button", { name: "Data & privasi" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText(/juri|judge/i)).toHaveCount(0);
  await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await page
    .getByRole("button", { name: "Scan label", exact: true })
    .nth(1)
    .click();
  await page.waitForURL("**/scanner");
  await expect(
    page.getByRole("button", { name: "Foto kemasan", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const cookie = (await context.cookies()).find(
    (c) => c.name === "bongkar_session",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  await page
    .getByRole("button", { name: "Contoh analisis", exact: true })
    .click();
  await page
    .getByRole("button", { name: "FitGandum, sereal ilustratif" })
    .click();
  await expect(
    page.getByRole("heading", { name: "FitGandum, sereal ilustratif" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sumber gula", exact: true }).click();
  await expect(
    page.getByText("Pola sugar-splitting terdeteksi oleh model posisi."),
  ).toBeVisible();
  await expect(page).toHaveURL(/#sumber-gula$/);
  await page.getByText("Lihat urutan setelah penggabungan").click();
  await expect(
    page.getByRole("cell", { name: "Gabungan sumber gula", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Komposisi", exact: true }).click();
  await page.getByRole("button", { name: "1. gandum utuh" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("link", { name: "Pilihan pengganti", exact: true })
    .click();
  await page.getByText("Data kandidat dan Pareto frontier").click();
  await page.screenshot({
    path: "artifacts/scanner-desktop.png",
    fullPage: true,
  });
  for (const name of [
    "Minuman cokelat malt, studi kasus",
    "Mi goreng pedas maksimal, studi kasus",
    "Kopi susu gula aren, studi kasus",
    "Keripik kentang keju, studi kasus",
  ]) {
    await page
      .getByRole("button", { name: "Contoh analisis", exact: true })
      .click();
    await page.getByRole("button", { name }).click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Scan label", exact: true }).click();
  await page.getByRole("button", { name: "Teks label", exact: true }).click();
  await page
    .getByLabel("Salin nama, komposisi dan seluruh informasi gizi")
    .fill("air, sukrosa, susu sapi, kopi. Informasi pada label tidak lengkap.");
  await page
    .getByRole("button", { name: "Periksa label ini", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /informasi gizi|Mode lokal aktif/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Foto kemasan", exact: true }).click();
  await page.getByText("Galeri & format foto", { exact: true }).click();
  await expect(
    page.getByLabel("Foto komposisi dan informasi gizi"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Label lengkap", exact: true })
    .click();
  await page
    .getByLabel("Nama produk", { exact: true })
    .fill("Label uji input pengguna");
  await page
    .getByLabel("Komposisi sesuai urutan, pisahkan dengan koma")
    .fill("gandum utuh, sukrosa, madu, garam");
  await page.getByText("02 · Gizi per sajian & harga", { exact: true }).click();
  await page.getByLabel("Harga per sajian (Rp)").fill("8000");
  await page.getByLabel("Ukuran sajian (g/ml)").fill("40");
  for (const [label, value] of [
    ["Energi (kkal), per sajian", "160"],
    ["Gula (g), per sajian", "12"],
    ["Protein (g), per sajian", "4"],
    ["Natrium (mg), per sajian", "150"],
    ["Lemak jenuh (g), per sajian", "1"],
    ["Serat (g), per sajian", "2"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("button", { name: "Periksa label ini", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Label uji input pengguna",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Kamus bahan" }).click();
  await page.getByLabel("Cari nama, alias atau kode").fill("INS 621");
  await page.getByRole("button", { name: "Cari bahan", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "mononatrium glutamat", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Cari nama, alias atau kode")
    .fill("not-an-ingredient-xyz");
  await page.getByRole("button", { name: "Cari bahan", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tidak ada bahan yang cocok" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tampilkan seluruh kamus" }).click();
  await expect(page.getByLabel("Cari nama, alias atau kode")).toHaveValue("");
  await page
    .locator(".dictionary-entry")
    .first()
    .locator(":scope > summary")
    .click();
  const aliasDetails = page.locator(".alias-list details").first();
  await expect(aliasDetails).not.toHaveAttribute("open");
  await aliasDetails.locator("summary").click();
  await expect(aliasDetails.locator(".alias-overflow")).toBeVisible();
  await aliasDetails.locator("summary").click();
  await page.screenshot({
    path: "artifacts/dictionary-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Berikutnya" }).click();
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
  await page.getByRole("button", { name: "Sebelumnya" }).click();
  await page.getByRole("link", { name: "Profil saya" }).click();
  await page.getByLabel("Anggaran per camilan (Rp)").fill("9000");
  await page
    .getByRole("button", { name: "Simpan profil", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Profil tersimpan" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Perangkat & akses", exact: true })
    .click();
  await page.getByText("Informasi teknis aplikasi", { exact: true }).click();
  await page.getByText("Periksa indeks aktif").click();
  await expect(
    page.getByRole("cell", { name: "expiresAt_1", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Perbarui audit" }).click();
  await page.screenshot({
    path: "artifacts/profile-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cabut sesi", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Akhiri sesi", exact: true }).click();
  await page.waitForURL("/");
  await page.goto("/scanner");
  await page.waitForURL("/");
  expect(errors).toEqual([]);
});
test("mobile layout, keyboard focus, warm dialogs and session revocation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(242, 239, 232)");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Lewati navigasi" }),
  ).toBeFocused();
  await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });
  await page
    .getByRole("button", { name: "Scan label", exact: true })
    .first()
    .click();
  await page.waitForURL("**/scanner");
  await page
    .getByRole("button", { name: "Contoh analisis", exact: true })
    .click();
  await page
    .getByRole("button", { name: "FitGandum, sereal ilustratif" })
    .click();
  await expect(
    page.getByRole("heading", { name: "FitGandum, sereal ilustratif" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Komposisi", exact: true }).click();
  await page.getByRole("button", { name: "2. sukrosa" }).click();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(255, 253, 248)");
  await page.getByRole("button", { name: "Tutup rincian" }).click();
  await page.screenshot({
    path: "artifacts/scanner-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Kamus bahan", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kamus di balik komposisi." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/dictionary-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Profil saya" }).click();
  await expect(page.getByLabel("Anggaran per camilan (Rp)")).toBeVisible();
  await page.screenshot({
    path: "artifacts/profile-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Perangkat & akses", exact: true })
    .click();
  await page.getByRole("button", { name: "Cabut sesi", exact: true }).click();
  await page
    .getByRole("button", { name: "Ya, cabut sesi", exact: true })
    .click();
  await page.waitForURL("/");
});
