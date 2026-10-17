import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  normalizePhotoTranscription,
  nutrientKeys,
  photoFieldLabel,
  type PhotoReview,
  type PhotoTranscription,
} from "./vision-contract";
const labels: Record<(typeof nutrientKeys)[number], RegExp> = {
  caloriesKcal: /^(energi|energy)(?!.*(?:dari lemak|from fat))/i,
  sugarGrams: /^(gula|total\s*sugars?|sugars?)\b/i,
  proteinGrams: /^protein\b/i,
  sodiumMg: /^(natrium|sodium)\b|^garam\s*\(\s*(natrium|sodium)\s*\)/i,
  saturatedFatGrams: /^(lemak\s*jenuh|saturated\s*fat)\b/i,
  fiberGrams: /^(serat|dietary\s*fib(?:er|re)|fib(?:er|re))\b/i,
};

const execute = promisify(execFile);
let active = 0;
export async function transcribeLocally(
  images: { bytes: Uint8Array }[],
  timeoutMs = 8000,
): Promise<string> {
  if (active >= 2) throw Error("Local OCR busy");
  active++;
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(tmpdir(), "bongkar-ocr-"));
    const output: string[] = [];
    const signal = AbortSignal.timeout(timeoutMs);
    for (let index = 0; index < images.length; index++) {
      const path = join(directory, `label-${index}.png`);
      await writeFile(path, images[index].bytes, { mode: 0o600 });
      try {
        const orientation = await execute(
          process.env.TESSERACT_BIN || "tesseract",
          [path, "stdout", "-l", "osd", "--psm", "0"],
          { timeout: 1500, maxBuffer: 16000, signal },
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
      try {
        const { stdout } = await execute(
          process.env.TESSERACT_BIN || "tesseract",
          [path, "stdout", "-l", "ind+eng", "--psm", "6"],
          { timeout: timeoutMs, maxBuffer: 128000, windowsHide: true, signal },
        );
        output.push(stdout);
      } catch (error) {
        // Keep a completed first page when the optional second page exceeds
        // the shared budget. Partial evidence still cannot contradict by absence.
        if (!output.length) throw error;
        break;
      }
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
  const nutritionText = Object.fromEntries(
    nutrientKeys.map((key) => {
      const matches = lines
        .filter(
          (line) => labels[key].test(line) && !/[<>≤≥]|[-−]\s*\d/.test(line),
        )
        .flatMap((line) => {
          // A quantity must immediately follow its label. Never fish a later number
          // out of a corrupt row such as `Gula 199 "7 g`.
          const rest = line
            .replace(labels[key], "")
            .replace(/^\s*(?:total)?\s*:?\s*/i, "");
          const match = rest.match(
            /^(\d+(?:[.,]\d+)?\s*(?:kkal|kcal|kj|mg|gram|g))\b(.*)$/i,
          );
          if (!match || /\d/.test(match[2].replace(/\d+(?:[.,]\d+)?\s*%/g, "")))
            return [];
          return [match[1]];
        });
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
      servingsPerContainerText:
        lines.find((line) =>
          /(?:sajian\s*per\s*kemasan|servings?\s*per\s*container)/i.test(line),
        ) ?? null,
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
/** Missing local evidence is not a contradiction. Only two explicit, conflicting readings block a value. */
export function crossCheckPhoto(
  review: PhotoReview,
  rawText: string,
): PhotoReview {
  const local = reviewFromLocalText(rawText, review.images);
  const nutrition = { ...review.nutrition };
  const issues = [...review.issues];
  for (const key of nutrientKeys) {
    const censored = rawText
      .split(/\r?\n/)
      .some(
        (line) =>
          labels[key].test(line.trim()) && /[<>≤≥]|[-−]\s*\d/.test(line),
      );
    if (
      nutrition[key] !== null &&
      (censored ||
        (local.nutrition[key] !== null &&
          Math.abs(nutrition[key]! - local.nutrition[key]!) > 0.000001))
    ) {
      nutrition[key] = null;
      issues.push(
        `${photoFieldLabel(key)}: dua pembaca belum sepakat; cocokkan angka langsung dengan foto.`,
      );
    }
  }
  const servingConflict =
    local.servingSizeGrams !== null &&
    review.servingSizeGrams !== null &&
    local.servingSizeGrams !== review.servingSizeGrams;
  if (servingConflict && review.evidence.basis !== "PER_SERVING")
    for (const key of nutrientKeys) nutrition[key] = null;
  return {
    ...review,
    nutrition,
    servingSizeGrams:
      local.servingSizeGrams === null ||
      local.servingSizeGrams === review.servingSizeGrams
        ? review.servingSizeGrams
        : null,
    issues:
      local.servingSizeGrams === null ||
      local.servingSizeGrams === review.servingSizeGrams
        ? issues
        : [
            ...issues,
            "Ukuran sajian dua pembaca belum sepakat; cocokkan dengan foto.",
          ],
    engine:
      review.engine === "ROUTER_VISION"
        ? "ROUTER_CROSSCHECKED"
        : "GEMINI_CROSSCHECKED",
    rawText,
  };
}

/** Re-evaluate old cross-checks from their original evidence, never a catalogue or product-name guess. */
export function reconcilePhotoReading(review: PhotoReview): PhotoReview {
  if (
    review.readingVersion === 2 ||
    review.userCorrected ||
    !["ROUTER_CROSSCHECKED", "GEMINI_CROSSCHECKED"].includes(review.engine)
  )
    return review;
  const fresh = normalizePhotoTranscription(review.evidence, review.images);
  const checked = crossCheckPhoto(
    {
      ...fresh,
      engine:
        review.engine === "ROUTER_CROSSCHECKED" ? "ROUTER_VISION" : "GEMINI",
    },
    review.rawText,
  );
  return {
    ...review,
    nutrition: checked.nutrition,
    servingSizeGrams: checked.servingSizeGrams,
    servingsPerContainer: checked.servingsPerContainer,
    issues: checked.issues,
    conversions: checked.conversions,
    readingVersion: 2,
  };
}
