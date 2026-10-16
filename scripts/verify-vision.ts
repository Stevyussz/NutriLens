import sharp from "sharp";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import {
  extractPhotoForReview,
  prepareLabelImage,
} from "../src/core/ai/photo-extraction";
import { geminiModel } from "../src/core/ai/model";
const baseline = {
  caloriesKcal: 140,
  sugarGrams: 12,
  proteinGrams: 3,
  sodiumMg: 90,
  saturatedFatGrams: 2,
  fiberGrams: 1,
};
const rows = [
  "Energi total       140 kkal",
  "Gula total          12 g",
  "Protein              3 g",
  "Natrium             90 mg",
  "Lemak jenuh          2 g",
  "Serat pangan         1 g",
];
const cases = [
  {
    id: "per-serving",
    serving: "30 g",
    heading: "JUMLAH PER SAJIAN",
    rows,
    expected: baseline,
  },
  {
    id: "per-100-comma",
    serving: "25 g",
    heading: "PER 100 g",
    rows: [
      "Energi total       400 kkal",
      "Gula total          25 g",
      "Protein             10 g",
      "Natrium            0,4 g",
      "Lemak jenuh          5 g",
      "Serat pangan         8 g",
    ],
    expected: {
      caloriesKcal: 100,
      sugarGrams: 6.25,
      proteinGrams: 2.5,
      sodiumMg: 100,
      saturatedFatGrams: 1.25,
      fiberGrams: 2,
    },
  },
  {
    id: "rotated",
    serving: "30 g",
    heading: "JUMLAH PER SAJIAN",
    rows,
    expected: baseline,
    rotate: true,
  },
  {
    id: "missing-fiber",
    serving: "30 g",
    heading: "JUMLAH PER SAJIAN",
    rows: rows.slice(0, -1),
    expected: { ...baseline, fiberGrams: null },
  },
];
async function main() {
  await mkdir("artifacts/vision-fixtures", { recursive: true });
  const results: Record<string, unknown>[] = [];
  for (const c of cases) {
    const lines = [
      "LABEL UJI OCR - BUKAN PRODUK RIIL",
      "Biskuit Uji Presisi",
      `Takaran saji ${c.serving}`,
      c.heading,
      ...c.rows,
      "Komposisi: tepung gandum, gula,",
      "dekstrosa, madu, kakao.",
    ];
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1100"><rect width="1400" height="1100" fill="white"/>' +
      lines
        .map(
          (line, i) =>
            `<text x="70" y="${80 + i * 80}" font-size="48" font-family="DejaVu Sans" fill="black">${line}</text>`,
        )
        .join("") +
      "</svg>";
    let image = await sharp(Buffer.from(svg)).png().toBuffer();
    if (c.rotate) image = await sharp(image).rotate(90).png().toBuffer();
    await writeFile(`artifacts/vision-fixtures/${c.id}.png`, image);
    const started = Date.now();
    try {
      const result = await extractPhotoForReview([image]);
      for (const [k, v] of Object.entries(c.expected))
        assert.equal(
          result.nutrition[k as keyof typeof baseline],
          v,
          `${c.id}:${k}`,
        );
      assert.equal(result.servingSizeGrams, Number.parseFloat(c.serving));
      assert.match(result.ingredientsText, /gandum/i);
      assert.equal(result.reviewRequired, true);
      results.push({
        id: c.id,
        passed: true,
        engine: result.engine,
        nutrition: result.nutrition,
        issues: result.issues,
        durationMs: Date.now() - started,
      });
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error
          ? error.status
          : null;
      results.push({
        id: c.id,
        passed: false,
        errorType: error instanceof Error ? error.name : "Unknown",
        httpStatus: status,
        durationMs: Date.now() - started,
      });
      if (status === 429 || status === 503) break;
    }
    console.log(JSON.stringify(results.at(-1)));
  }
  const tiny = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  let rejected = false;
  try {
    await prepareLabelImage(tiny);
  } catch {
    rejected = true;
  }
  results.push({
    id: "low-resolution-rejected-before-provider",
    passed: rejected,
  });
  const report = {
    checkedAt: new Date().toISOString(),
    model: geminiModel(),
    passed: results.length === 5 && results.every((r) => r.passed === true),
    cases: results,
    scope:
      "Controlled printed label images only. Exact nutrient agreement on these samples is not a guarantee for real packaging, blur, glare, all fonts or all products. All photo results require user review.",
  };
  await writeFile(
    process.env.PHOTO_OCR_ENGINE === "local"
      ? "artifacts/vision-local-benchmark.json"
      : "artifacts/vision-benchmark.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({ passed: report.passed, checked: results.length }),
  );
  if (!report.passed) process.exitCode = 1;
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      passed: false,
      errorType: error instanceof Error ? error.name : "Unknown",
    }),
  );
  process.exitCode = 1;
});
