import { decimal } from "./utils";
import type { Analysis } from "./analysis-schema";
import type { HealthProfile } from "./db/collections";
/** Decision summary uses verified numbers/rules; no extra model call or invented health score. */
export function quickSummary(result: Analysis, health: HealthProfile) {
  const p = result.extractedProductData;
  const sugarPercent = Math.round(
    (p.nutrition.sugarGrams / health.dailySugarLimitGrams) * 100,
  );
  const sodiumPercent = Math.round(
    (p.nutrition.sodiumMg / health.dailySodiumLimitMg) * 100,
  );
  const text = p.orderedIngredients
    .map((i) => `${i.rawName} ${i.canonicalChemicalName}`)
    .join(" ")
    .toLowerCase();
  const allergies = health.allergies.filter((a) =>
    text.includes(a.toLowerCase()),
  );
  const unknown = p.orderedIngredients.filter(
    (i) => i.functionalCategory === "UNKNOWN",
  ).length;
  const status = result.aiVerdict.medicalStatus;
  const title = allergies.length
    ? "Ada kecocokan dengan alergi Anda."
    : status === "HINDARI"
      ? "Ada hal yang perlu diperiksa sebelum membeli."
      : `${decimal(p.nutrition.sugarGrams)} g gula per sajian.`;
  const action = allergies.length
    ? "Pilih produk lain dan periksa daftar alergennya."
    : status === "HINDARI"
      ? result.aiVerdict.explanation ||
        "Buka rincian komposisi dan kecocokan profil sebelum memilih."
      : `Jika mengambil dua sajian, total gulanya ${decimal(p.nutrition.sugarGrams * 2)} g dan natriumnya ${decimal(p.nutrition.sodiumMg * 2)} mg. Jumlah sajian per kemasan belum tersedia pada analisis ini; jangan menyamakan satu sajian dengan seluruh kemasan.`;
  const reason = allergies.length
    ? `Cocok dengan: ${allergies.join(", ")}.`
    : result.splittingAnalysis.isSugarSplittingDetected
      ? `${result.splittingAnalysis.sugarCount} sumber gula ditemukan; jumlah bahan bukan ukuran gram gula.`
      : unknown
        ? `${unknown} bahan belum dikenali. Detailnya ada di Komposisi.`
        : "Penilaian mengikuti batas dan alergi pada profil, bukan jaminan keamanan medis.";
  return { title, action, reason, sugarPercent, sodiumPercent };
}
