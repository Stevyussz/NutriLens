import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import sample from "../fixtures/golda-corrupt-local-ocr.json";
import { normalizePhotoTranscription } from "../../src/core/ai/vision-contract";
import { compareVisionReadings } from "../../src/core/ai/vision-policy";
test("legacy OCR reconciliation stays consistent across summary, evidence, history and Nara", async ({
  page,
  baseURL,
}) => {
  const origin = baseURL!;
  await page.request.post("/api/auth/guest", { headers: { origin } });
  const current = normalizePhotoTranscription(sample.evidence, [
    { width: 1020, height: 1282 },
  ]);
  const { readingVersion, ...old } = current;
  const legacy = {
    ...old,
    engine: "ROUTER_CROSSCHECKED",
    rawText: sample.rawText,
    nutrition: { ...old.nutrition, sugarGrams: null },
    issues: [
      ...old.issues,
      "Gula: dua pembaca belum sepakat; cocokkan angka langsung dengan foto.",
    ],
  };
  const saved = await page.request.post("/api/photo-summary", {
    headers: { origin },
    data: legacy,
  });
  expect(saved.ok()).toBeTruthy();
  const review = await saved.json();
  expect(review.nutrition.sugarGrams).toBe(19);
  const detail = await (
    await page.request.get(`/api/history/${review.historyId}`)
  ).json();
  expect(detail.photoResult.nutrition.sugarGrams).toBe(19);
  const list = await (await page.request.get("/api/history")).json();
  expect(
    list.items.find((r: any) => r.id === review.historyId).sugarGrams,
  ).toBe(19);
  await page.route("**/api/product-research", (r) =>
    r.fulfill({ status: 503, json: { error: "Controlled source failure" } }),
  );
  await page.goto(`/scanner?history=${review.historyId}`);
  await expect(page.locator(".quick-numbers")).toContainText("19 g");
  await expect(page.locator("#photo-decision-title")).toContainText(
    "19 g gula",
  );
  await page.locator(".photo-evidence summary").click();
  await expect(page.locator(".photo-evidence")).toContainText("19g");
  await page.getByRole("button", { name: "Tanya Nara", exact: true }).click();
  await page
    .getByRole("button", { name: "Kalau habis satu kemasan?", exact: true })
    .click();
  await expect(page.locator(".nara-answer")).toContainText("19 g");
  const corrected = await page.request.post("/api/photo-summary", {
    headers: { origin },
    data: {
      ...legacy,
      userCorrected: true,
      nutrition: { ...legacy.nutrition, sugarGrams: 18 },
    },
  });
  expect((await corrected.json()).nutrition.sugarGrams).toBe(18);
  const conflict = compareVisionReadings(
    current,
    normalizePhotoTranscription(
      {
        ...sample.evidence,
        nutritionText: { ...sample.evidence.nutritionText, sugarGrams: "29g" },
      },
      current.images,
    ),
  );
  const storedConflict = await (
    await page.request.post("/api/photo-summary", {
      headers: { origin },
      data: conflict,
    })
  ).json();
  await page.goto(`/scanner?history=${storedConflict.historyId}`);
  await expect(page.locator("#photo-decision-title")).toHaveText(
    "Angka gula berbeda saat dibaca ulang.",
  );
  await page.getByRole("button", { name: "Tanya Nara", exact: true }).click();
  await page.getByLabel("Pertanyaan tentang label ini").fill("Berapa gula?");
  await page.getByRole("button", { name: "Kirim pertanyaan ke Nara" }).click();
  await expect(page.locator(".nara-answer")).toContainText(
    "Dua pembacaan visual",
  );
  await mkdir(".impeccable/review/reading-fix", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: ".impeccable/review/reading-fix/real-conflict-controlled-390.png",
    fullPage: true,
  });
});
