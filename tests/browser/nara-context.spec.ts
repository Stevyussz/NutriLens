import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { priceReview } from "../fixtures/price-review";

test("Nara explains the scan immediately and carries recent conversation on mobile", async ({
  page,
  baseURL,
}) => {
  await page.request.post("/api/auth/guest", { headers: { origin: baseURL! } });
  const photo = structuredClone(priceReview);
  photo.ingredientsText = "Air, gula aren, sirup glukosa, susu, maltodekstrin";
  const response = await page.request.post("/api/photo-summary", {
    headers: { origin: baseURL! },
    data: photo,
  });
  expect(response.ok()).toBeTruthy();
  const saved = await response.json();
  const requests: Record<string, any>[] = [];
  await page.route("**/api/ask-nara", async (route) => {
    const input = route.request().postDataJSON();
    requests.push(input);
    await route.fulfill({
      json: {
        mode: "AI_GUIDED",
        productName: photo.name,
        topics: ["sugar", "ingredients"],
        paragraphs:
          input.purpose === "brief"
            ? [
                "Gula aren dan sirup glukosa menyumbang ke gula total yang sama. Ada juga 5 g lemak jenuh per kemasan; rasa kopi atau susu saja tidak menggambarkan seluruh isinya.",
              ]
            : /setengah/.test(input.question)
              ? [
                  "Setengah kemasan memberi 9,5 g gula. Itu mengurangi jumlah yang kamu minum hanya jika sisa porsinya tidak ikut kamu habiskan.",
                ]
              : [
                  "Gula aren tetap gula. Di label ini sumber-sumber gula sudah termasuk dalam total 19 g gula per kemasan, bukan tambahan di luar tabel.",
                ],
        followUps: [
          "Kenapa gula aren tetap dihitung?",
          "Bagaimana memilih kopi untuk sehari-hari?",
        ],
      },
    });
  });
  await page.route("**/api/product-research", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Controlled unavailable source" },
    }),
  );
  await page.route("**/api/price-estimate", (r) =>
    r.fulfill({ status: 503, json: { error: "Controlled unavailable price" } }),
  );
  await page.goto(`/scanner?history=${saved.historyId}`);
  await expect(
    page.getByText("Kenapa pilihan ini?", { exact: true }),
  ).toBeVisible();
  await page.getByText("Gulanya berasal dari apa?", { exact: true }).click();
  await expect(
    page.getByText(/Sumber gula yang dikenali: gula aren, sirup glukosa/),
  ).toBeVisible();
  await mkdir(".impeccable/review/nara-context", { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
    await page.locator(".quick-verdict").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const action = await page
      .locator(".photo-result .quick-action")
      .boundingBox();
    expect(action).not.toBeNull();
    expect(action!.y + action!.height).toBeLessThan(
      (width > 800 ? 1000 : 844) - 70,
    );
    await page.screenshot({
      path: `.impeccable/review/nara-context/summary-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
  await page.getByRole("button", { name: "Tanya Nara", exact: true }).click();
  await page
    .getByLabel("Apa yang ingin kamu pahami?")
    .fill("Kenapa gula aren tetap dihitung?");
  await page.getByRole("button", { name: "Kirim pertanyaan ke Nara" }).click();
  await expect(page.locator(".nara-answer")).toHaveCount(1);
  await page
    .getByLabel("Apa yang ingin kamu pahami?")
    .fill("Kalau yang tadi diminum setengah bagaimana?");
  await page.getByRole("button", { name: "Kirim pertanyaan ke Nara" }).click();
  await expect(page.locator(".nara-answer")).toHaveCount(2);
  expect(requests.at(-1)?.conversation).toHaveLength(1);
  expect(requests.at(-1)?.conversation[0].question).toBe(
    "Kenapa gula aren tetap dihitung?",
  );
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
    await page.locator(".nara-answer").last().scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `.impeccable/review/nara-context/chat-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.unroute("**/api/ask-nara");
  let releaseBrief!: () => void;
  const pendingBrief = new Promise<void>((resolve) => {
    releaseBrief = resolve;
  });
  let healthy = false;
  await page.route("**/api/ask-nara", async (route) => {
    await pendingBrief;
    await route.fulfill(
      healthy
        ? {
            json: {
              mode: "AI_GUIDED",
              productName: photo.name,
              topics: ["fat"],
              followUps: [],
              paragraphs: [
                "Ada juga 5 g lemak jenuh per kemasan. Gula bukan satu-satunya zat gizi yang perlu kamu perhatikan.",
              ],
            },
          }
        : { status: 503, json: { error: "Controlled brief interruption" } },
    );
  });
  await page.reload();
  await expect(page.locator(".nara-brief .nara-thinking")).toBeVisible();
  await expect(page.locator(".photo-result .quick-action")).toContainText(
    "9,5 g gula",
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: ".impeccable/review/nara-context/brief-loading-390.png",
    fullPage: true,
  });
  releaseBrief();
  await expect(
    page.getByRole("button", { name: "Coba penjelasan lagi", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: ".impeccable/review/nara-context/brief-error-390.png",
    fullPage: true,
  });
  healthy = true;
  await page
    .getByRole("button", { name: "Coba penjelasan lagi", exact: true })
    .click();
  await expect(
    page.getByText("Kenapa pilihan ini?", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".nara-brief")).toContainText(
    "5 g lemak jenuh per kemasan",
  );
});

test("explicit lactose appears consistently as milk sugar without increasing table total", async ({
  page,
  baseURL,
}) => {
  await page.request.post("/api/auth/guest", { headers: { origin: baseURL! } });
  const photo = structuredClone(priceReview);
  photo.ingredientsText =
    "Laktosa (lactose), sukrosa, sirup glukosa, maltodekstrin";
  const response = await page.request.post("/api/photo-summary", {
    headers: { origin: baseURL! },
    data: photo,
  });
  expect(response.ok()).toBeTruthy();
  const saved = await response.json();
  await page.route("**/api/ask-nara", (r) =>
    r.fulfill({
      json: {
        mode: "AI_GUIDED",
        productName: photo.name,
        topics: ["ingredients"],
        followUps: [],
        paragraphs: [
          "Laktosa adalah gula susu. Namanya tidak memastikan apakah gula itu alami di produk atau ditambahkan. Sumber-sumber gula tetap termasuk dalam total tabel yang sama.",
        ],
      },
    }),
  );
  await page.route("**/api/price-estimate", (r) =>
    r.fulfill({ status: 503, json: { error: "Controlled unavailable price" } }),
  );
  await page.route("**/api/product-research", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Controlled unavailable source" },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/scanner?history=${saved.historyId}`);
  await page.getByText("Gulanya berasal dari apa?", { exact: true }).click();
  const origins = page
    .locator(".photo-profile-context")
    .filter({
      has: page.getByText("Gulanya berasal dari apa?", { exact: true }),
    });
  await expect(origins).toContainText(
    "laktosa (gula susu), sukrosa, sirup glukosa",
  );
  await expect(origins).toContainText("tidak memastikan");
  await expect(page.locator("#photo-decision-title")).toContainText(
    "19 g gula",
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: ".impeccable/review/nara-context/lactose-summary-390.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Sumber gula", exact: true }).click();
  await expect(page.locator(".photo-detail")).toContainText(
    "laktosa (gula susu)",
  );
  await page.getByRole("link", { name: "Komposisi", exact: true }).click();
  await expect(
    page.locator(".photo-detail li").filter({ hasText: "laktosa" }),
  ).toContainText("Gula susu");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: ".impeccable/review/nara-context/lactose-composition-390.png",
    fullPage: true,
  });
});
