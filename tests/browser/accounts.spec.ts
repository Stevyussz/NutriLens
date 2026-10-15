import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

test.use({ viewport: { width: 390, height: 844 }, video: "on" });

test("mobile account upgrade preserves profile, login returns to the intended page, and other sessions can be revoked", async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  const origin = baseURL ?? "http://localhost:3000";
  const email = `browser-${randomBytes(10).toString("hex")}@test.invalid`;
  const password = randomBytes(20).toString("hex");
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/auth-test-account.json",
    JSON.stringify({ email }) + "\n",
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Periksa label", exact: true })
    .first()
    .click();
  await page.waitForURL("**/scanner");
  const nav = page.getByRole("navigation", { name: "Navigasi aplikasi" });
  const bounds = await nav.boundingBox();
  expect(bounds?.y).toBeGreaterThan(700);
  expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(845);
  await nav.getByRole("link", { name: "Profil saya" }).click();
  await page.getByLabel("Alergi, pisahkan dengan koma").fill("susu");
  await page.getByLabel("Anggaran per camilan (Rp)").fill("7800");
  await page
    .getByRole("button", { name: "Simpan profil", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Profil tersimpan" }),
  ).toBeVisible();
  const oldToken = (await context.cookies()).find(
    (cookie) => cookie.name === "bongkar_session",
  )?.value;
  await page.getByRole("link", { name: "Simpan profil ke akun" }).click();
  await expect(page).toHaveURL(/\/register\?next=/);
  await page.goto("/register?next=%2Fdictionary");
  await page.screenshot({
    path: "artifacts/register-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Tampilkan kata sandi" }).click();
  await expect(page.getByLabel("Kata sandi", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Sembunyikan kata sandi" }).click();
  await page.getByLabel("Nama", { exact: true }).fill("Pengguna Uji");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page
    .getByLabel("Ulangi kata sandi", { exact: true })
    .fill("different-password");
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "konfirmasi belum sama" }),
  ).toBeVisible();
  await page.getByLabel("Ulangi kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await page.waitForURL("**/welcome?next=*");
  await expect(
    page.getByRole("heading", { name: "Sesuaikan dengan Anda." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/onboarding-mobile.png",
    fullPage: true,
  });
  await expect(page.getByLabel("Alergi, pisahkan dengan koma")).toHaveValue(
    "susu",
  );
  await page.getByRole("button", { name: "Simpan dan lanjutkan" }).click();
  await page.waitForURL("**/dictionary");
  await page.goto("/welcome?next=%2Fscanner");
  await page.getByRole("link", { name: "Lewati dulu, lanjutkan" }).click();
  await page.waitForURL("**/scanner");
  await nav.getByRole("link", { name: "Profil saya" }).click();
  await expect(page.getByLabel("Anggaran per camilan (Rp)")).toHaveValue(
    "7800",
  );
  await expect(page.getByLabel("Alergi, pisahkan dengan koma")).toHaveValue(
    "susu",
  );
  await expect(
    page.getByRole("link", { name: "Simpan profil ke akun" }),
  ).toHaveCount(0);
  expect(
    (await context.cookies()).find(
      (cookie) => cookie.name === "bongkar_session",
    )?.value,
  ).not.toBe(oldToken);
  expect((await (await page.request.get("/api/profile")).json()).role).toBe(
    "USER",
  );
  await page.goto("/login");
  await page.waitForURL("**/scanner");
  await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Akhiri sesi", exact: true }).click();
  await page.waitForURL("/");
  await page.goto("/login?next=%2Fsecurity-profile");
  await page.screenshot({ path: "artifacts/login-mobile.png", fullPage: true });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("incorrect-password");
  await page
    .getByRole("button", { name: "Masuk ke akun", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "tidak cocok" }),
  ).toBeVisible();
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Masuk ke akun", exact: true })
    .click();
  await page.waitForURL("**/security-profile");
  await expect(page.getByLabel("Anggaran per camilan (Rp)")).toHaveValue(
    "7800",
  );
  const other = await browser.newContext({ baseURL: origin });
  try {
    expect(
      (
        await other.request.post("/api/auth/login", {
          headers: { origin },
          data: { email, password },
        })
      ).status(),
    ).toBe(200);
    await page.reload();
    const otherRow = page
      .locator(".session-row")
      .filter({ hasText: "Perangkat lain" });
    await expect(otherRow).toBeVisible();
    await otherRow.getByRole("button", { name: "Cabut sesi" }).click();
    await page
      .getByRole("button", { name: "Ya, cabut sesi", exact: true })
      .click();
    await expect(otherRow).toHaveCount(0);
    expect((await other.request.get("/api/profile")).status()).toBe(401);
  } finally {
    await other.close();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/account-profile-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Akhiri sesi", exact: true }).click();
  await page.waitForURL("/");
});
