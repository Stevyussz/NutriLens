import { test, expect, chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("PWA is installable, opens the scanner and never caches private results", async ({
  baseURL,
}, testInfo) => {
  // Chrome deliberately disables installation in the default incognito test context.
  const context = await chromium.launchPersistentContext(
    testInfo.outputPath("profile"),
    {
      executablePath: process.env.PLAYWRIGHT_CHROME_PATH,
      headless: true,
      baseURL,
    },
  );
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator('head > link[rel="manifest"]')).toHaveCount(1);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest",
    );
    const response = await page.request.get("/manifest.webmanifest");
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest).toMatchObject({
      name: "BongkarLabel",
      start_url: "/scanner",
      display: "standalone",
      scope: "/",
    });
    for (const icon of manifest.icons)
      expect((await page.request.get(icon.src)).ok()).toBeTruthy();
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      )
      .toBe(true);
    const sw = await page.request.get("/sw.js");
    expect(sw.headers()["cache-control"]).toContain("no-store");
    const cdp = await context.newCDPSession(page);
    const appManifest = await cdp.send("Page.getAppManifest");
    expect(appManifest.errors).toEqual([]);
    expect(JSON.parse(appManifest.data!)).toMatchObject({
      display: "standalone",
      start_url: "/scanner",
    });
    await mkdir(".impeccable/review/pwa", { recursive: true });
    await writeFile(
      ".impeccable/review/pwa/manifest-diagnostic.json",
      JSON.stringify(
        {
          appManifest,
          dom: await page.locator('link[rel="manifest"]').evaluate((el) => ({
            html: el.outerHTML,
            parent: el.parentElement?.tagName,
            head: document.head.innerHTML,
          })),
          url: page.url(),
        },
        null,
        2,
      ),
    );
    await expect
      .poll(
        async () =>
          (await cdp.send("Page.getInstallabilityErrors")).installabilityErrors,
      )
      .toEqual([]);
    const installability = await cdp.send("Page.getInstallabilityErrors");
    await mkdir(".impeccable/review/pwa", { recursive: true });
    await writeFile(
      ".impeccable/review/pwa/installability.json",
      JSON.stringify({ appManifest, installability }, null, 2),
    );
    await page.request.post("/api/auth/guest", {
      headers: { origin: baseURL! },
    });
    await page.goto("/scanner");
    await context.setOffline(true);
    await page.goto("/scanner?history=000000000000000000000000");
    await expect(
      page.getByRole("heading", { name: "Koneksi sedang terputus." }),
    ).toBeVisible();
    expect(
      await page.evaluate(() =>
        fetch("/api/health").then(
          () => false,
          () => true,
        ),
      ),
    ).toBe(true);
    const cachedPaths = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        for (const request of await (await caches.open(name)).keys())
          urls.push(new URL(request.url).pathname);
      }
      return urls;
    });
    expect(cachedPaths).toContain("/offline.html");
    expect(
      cachedPaths.every(
        (path) =>
          path === "/offline.html" ||
          path.startsWith("/fonts/") ||
          path.startsWith("/icons/"),
      ),
    ).toBe(true);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `.impeccable/review/pwa/offline-${width}.png`,
        fullPage: true,
      });
    }
    await context.setOffline(false);
    await page.getByRole("link", { name: "Buka scanner" }).click();
    await expect(
      page.getByRole("heading", { name: "Koneksi sedang terputus." }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(/\/scanner$/);
  } finally {
    await context.close();
  }
});
