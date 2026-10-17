import {
  normalizePhotoTranscription,
  nutrientKeys,
  photoFieldLabel,
  type PhotoReview,
} from "./vision-contract";
/** Old OCR disagreements cannot veto a valid saved vision transcription. This does not re-view an old photo. */
export function reconcilePhotoReading(review: PhotoReview): PhotoReview {
  if (
    review.readingVersion === 3 ||
    review.userCorrected ||
    ![
      "ROUTER_CROSSCHECKED",
      "GEMINI_CROSSCHECKED",
      "ROUTER_VISION",
      "GEMINI",
    ].includes(review.engine)
  )
    return review;
  const normalized = normalizePhotoTranscription(
    review.evidence,
    review.images,
  );
  return {
    ...review,
    nutrition: normalized.nutrition,
    servingSizeGrams: normalized.servingSizeGrams,
    servingsPerContainer: normalized.servingsPerContainer,
    issues: normalized.issues,
    conversions: normalized.conversions,
    readingVersion: 3,
    engine: review.engine.startsWith("ROUTER") ? "ROUTER_VISION" : "GEMINI",
    providerNotice:
      "Memakai transkripsi vision yang tersimpan. Foto lama tidak disimpan dan belum dilihat ulang; OCR lokal tidak menentukan angka akhir.",
  };
}
const unit = (r: PhotoReview) =>
  r.evidence.servingText
    ?.match(/(ml|gram|g)\s*$/i)?.[1]
    .toLowerCase()
    .replace("gram", "g");
export function compareVisionReadings(
  first: PhotoReview,
  second: PhotoReview,
): PhotoReview {
  const compatible =
    !(
      first.servingSizeGrams !== null &&
      second.servingSizeGrams !== null &&
      first.servingSizeGrams !== second.servingSizeGrams
    ) && !(unit(first) && unit(second) && unit(first) !== unit(second));
  if (!compatible)
    return {
      ...first,
      visionReview: {
        status: "CONFLICT",
        differences: [],
        notice:
          "Porsi pada dua pembacaan visual berbeda. Nilai yang belum pasti tidak digabungkan.",
      },
      issues: [
        ...first.issues,
        "Ukuran sajian berbeda pada pembacaan visual ulang; foto ulang tabel gizi.",
      ],
    };
  // If the initial column was unusable, accept a complete independently transcribed column as a unit.
  const initialEmpty = nutrientKeys.every((k) => first.nutrition[k] === null);
  if (initialEmpty)
    return {
      ...second,
      engine: first.engine,
      visionReview: {
        status: "RECHECKED",
        differences: [],
        notice: "Kolom gizi dibaca ulang langsung dari foto.",
      },
    };
  if (first.evidence.basis !== second.evidence.basis)
    return {
      ...first,
      visionReview: {
        status: "UNAVAILABLE",
        differences: [],
        notice:
          "Kolom pada pembacaan visual ulang berbeda; angka dari kolom berbeda tidak digabungkan.",
      },
    };
  const packConflict =
    first.servingsPerContainer !== null &&
    second.servingsPerContainer !== null &&
    first.servingsPerContainer !== second.servingsPerContainer;
  const nutrition = { ...first.nutrition };
  const nutritionText = { ...first.evidence.nutritionText };
  const differences: NonNullable<PhotoReview["visionReview"]>["differences"] =
    [];
  const issues = [...first.issues];
  for (const key of nutrientKeys) {
    const a = first.nutrition[key],
      b = second.nutrition[key];
    if (a !== null && b !== null && Math.abs(a - b) > 0.000001) {
      nutrition[key] = null;
      differences.push({
        field: key,
        first: first.evidence.nutritionText[key],
        second: second.evidence.nutritionText[key],
      });
      issues.push(
        `${photoFieldLabel(key)}: pembacaan visual ulang berbeda; angka akhir belum dipilih.`,
      );
    } else if (a === null && b !== null) {
      nutrition[key] = b;
      nutritionText[key] = second.evidence.nutritionText[key];
    }
  }
  const restored = nutrientKeys.filter(
    (k) => first.nutrition[k] === null && nutrition[k] !== null,
  );
  return {
    ...first,
    nutrition,
    servingSizeGrams: first.servingSizeGrams ?? second.servingSizeGrams,
    servingsPerContainer: packConflict
      ? null
      : (first.servingsPerContainer ?? second.servingsPerContainer),
    evidence: {
      ...first.evidence,
      nutritionText,
      servingText:
        first.servingSizeGrams === null
          ? second.evidence.servingText
          : first.evidence.servingText,
      servingsPerContainerText:
        first.servingsPerContainer === null
          ? second.evidence.servingsPerContainerText
          : first.evidence.servingsPerContainerText,
    },
    issues: issues.filter(
      (i) =>
        !(
          first.servingSizeGrams === null &&
          second.servingSizeGrams !== null &&
          i.startsWith("Ukuran sajian belum terbaca")
        ) && !restored.some((k) => i.startsWith(photoFieldLabel(k) + ":")),
    ),
    visionReview: {
      status: differences.length || packConflict ? "CONFLICT" : "RECHECKED",
      differences,
      notice: packConflict
        ? `Jumlah sajian per kemasan terbaca ${first.servingsPerContainer} dan ${second.servingsPerContainer}. Total kemasan belum dihitung.`
        : differences.length
          ? "Ada angka yang berbeda pada dua pembacaan visual. Lihat rinciannya; angka itu belum dipakai."
          : "Bagian yang belum jelas telah dibaca ulang dengan vision.",
    },
  };
}
/** At most one extra visual read. No OCR fallback or product-catalogue nutrition. */
export async function readVisionWithRetry(
  read: (pass: "initial" | "recheck") => Promise<PhotoReview>,
): Promise<PhotoReview> {
  const first = await read("initial");
  if (
    first.nutrition.sugarGrams !== null &&
    first.nutrition.sodiumMg !== null &&
    first.servingSizeGrams !== null &&
    first.servingsPerContainer !== null
  )
    return {
      ...first,
      visionReview: {
        status: "INITIAL",
        differences: [],
        notice:
          "Angka berasal dari foto dan lolos pemeriksaan satuan serta porsi. Vision tetap dapat salah.",
      },
    };
  if (
    first.evidence.unreadableFields.some((f) =>
      /konflik|conflict|berbeda/i.test(f),
    )
  )
    return {
      ...first,
      issues: [
        ...first.issues,
        "Ada indikasi foto produk berbeda. Ambil foto dari satu produk yang sama.",
      ],
    };
  try {
    return compareVisionReadings(first, await read("recheck"));
  } catch {
    return {
      ...first,
      visionReview: {
        status: "UNAVAILABLE",
        differences: [],
        notice:
          "Pembacaan visual ulang belum berhasil. Angka yang belum terbaca tetap kosong; OCR lokal tidak dipakai sebagai pengganti.",
      },
    };
  }
}
