import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  normalizePhotoTranscription,
  nutrientKeys,
  type PhotoReview,
  type PhotoTranscription,
} from "./vision-contract";
const execute = promisify(execFile);
let active = 0;
export async function transcribeLocally(
  images: { bytes: Uint8Array }[],
): Promise<string> {
  if (active >= 2) throw Error("Local OCR busy");
  active++;
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(tmpdir(), "bongkar-ocr-"));
    const output: string[] = [];
    for (let index = 0; index < images.length; index++) {
      const path = join(directory, `label-${index}.png`);
      await writeFile(path, images[index].bytes, { mode: 0o600 });
      try {
        const orientation = await execute(
          process.env.TESSERACT_BIN || "tesseract",
          [path, "stdout", "-l", "osd", "--psm", "0"],
          { timeout: 10000, maxBuffer: 16000 },
        );
        const degrees = Number(
          orientation.stdout.match(/Rotate:\s*(90|180|270)\b/)?.[1] ?? 0,
        );
        if (degrees)
          await writeFile(
            path,
            await sharp(images[index].bytes).rotate(degrees).png().toBuffer(),
            { mode: 0o600 },
          );
      } catch {
        /* Sparse labels may not contain enough text for orientation detection. */
      }
      const { stdout } = await execute(
        process.env.TESSERACT_BIN || "tesseract",
        [path, "stdout", "-l", "ind+eng", "--psm", "6"],
        { timeout: 25000, maxBuffer: 128000, windowsHide: true },
      );
      output.push(stdout);
    }
    return output.join("\n\n").slice(0, 30000);
  } finally {
    active--;
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}
export function reviewFromLocalText(
  rawText: string,
  images: { width: number; height: number }[],
): PhotoReview {
  const lines = rawText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const quantities = [
    ...new Set(
      [
        ...rawText.matchAll(
          /(?:takaran\s*saji|serving\s*size|sajian)\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*(g|ml)\b/gi,
        ),
      ].map((m) => `${m[1]} ${m[2].toLowerCase()}`),
    ),
  ];
  const per100 = lines.filter((line) => /per\s*100\s*(g|ml)\b/i.test(line));
  const perServing = lines.filter((line) =>
    /per\s*(sajian|serving|porsi)|amount\s+per\s+serving/i.test(line),
  );
  const basis: PhotoTranscription["basis"] =
    per100.length && perServing.length
      ? "UNKNOWN"
      : per100.length
        ? /100\s*ml/i.test(per100[0])
          ? "PER_100_ML"
          : "PER_100_G"
        : perServing.length
          ? "PER_SERVING"
          : "UNKNOWN";
  const labels: Record<(typeof nutrientKeys)[number], RegExp> = {
    caloriesKcal: /^(energi|energy)(?!.*(?:dari lemak|from fat))/i,
    sugarGrams: /^(gula|total\s*sugars?|sugars?)\b/i,
    proteinGrams: /^protein\b/i,
    sodiumMg: /^(natrium|sodium)\b/i,
    saturatedFatGrams: /^(lemak\s*jenuh|saturated\s*fat)\b/i,
    fiberGrams: /^(serat|dietary\s*fib(?:er|re)|fib(?:er|re))\b/i,
  };
  const nutritionText = Object.fromEntries(
    nutrientKeys.map((key) => {
      const matches = lines
        .filter(
          (line) => labels[key].test(line) && !/[<>≤≥]|[-−]\s*\d/.test(line),
        )
        .flatMap((line) =>
          [
            ...line.matchAll(
              /\d+(?:[.,]\d+)?\s*(?:kkal|kcal|kj|mg|gram|g)\b/gi,
            ),
          ].map((m) => m[0]),
        );
      return [key, matches.length === 1 ? matches[0] : null];
    }),
  );
  const ingredientStart = lines.findIndex((line) =>
    /^(komposisi|ingredients?)\s*:/i.test(line),
  );
  const ingredientsText =
    ingredientStart < 0
      ? ""
      : lines
          .slice(ingredientStart)
          .join(" ")
          .replace(/^(komposisi|ingredients?)\s*:\s*/i, "")
          .split(
            /\b(?:informasi nilai gizi|nutrition facts|simpan|diproduksi|distributed by)\b/i,
          )[0]
          .trim();
  const review = normalizePhotoTranscription(
    {
      productName: "",
      brand: "",
      category: "LAINNYA",
      servingText: quantities.length === 1 ? quantities[0] : null,
      basis,
      basisText:
        basis === "PER_SERVING"
          ? "Per sajian"
          : basis === "PER_100_G"
            ? "Per 100 g"
            : basis === "PER_100_ML"
              ? "Per 100 ml"
              : null,
      nutritionText,
      ingredientsText,
      unreadableFields: [],
    },
    images,
  );
  return {
    ...review,
    engine: "LOCAL_OCR",
    rawText,
    issues: [
      "Pembacaan OCR lokal perlu dicocokkan dengan foto. Nama produk, kategori, dan harga harus Anda periksa.",
      ...review.issues,
    ],
  };
}
/** Independent text agreement is a rejection gate, not a confidence percentage. */
export function crossCheckPhoto(
  review: PhotoReview,
  rawText: string,
): PhotoReview {
  const local = reviewFromLocalText(rawText, review.images);
  const nutrition = { ...review.nutrition };
  const issues = [...review.issues];
  for (const key of nutrientKeys) {
    if (
      nutrition[key] !== null &&
      (local.nutrition[key] === null ||
        Math.abs(nutrition[key]! - local.nutrition[key]!) > 0.000001)
    ) {
      nutrition[key] = null;
      issues.push(
        `${key}: dua pembaca belum sepakat; cocokkan angka langsung dengan foto.`,
      );
    }
  }
  return {
    ...review,
    nutrition,
    servingSizeGrams:
      local.servingSizeGrams === review.servingSizeGrams
        ? review.servingSizeGrams
        : null,
    issues:
      local.servingSizeGrams === review.servingSizeGrams
        ? issues
        : [
            ...issues,
            "Ukuran sajian dua pembaca belum sepakat; cocokkan dengan foto.",
          ],
    engine: "GEMINI_CROSSCHECKED",
    rawText,
  };
}
