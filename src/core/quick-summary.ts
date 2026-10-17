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
      ? "Ada batas profil yang terpicu."
      : status === "WASPADA"
        ? "Perhatikan sebelum memilih."
        : sugarPercent >= 25
          ? "Bandingkan dengan yang lebih rendah gula."
          : sodiumPercent >= 25
            ? "Bandingkan dengan yang lebih rendah natrium."
            : "Pertimbangkan porsi sebelum membeli.";
  const action = allergies.length
    ? "Pilih produk lain dan periksa daftar alergennya."
    : sugarPercent >= 25
      ? "Perhatikan porsi. Bandingkan dengan pilihan yang gulanya lebih rendah."
      : sodiumPercent >= 25
        ? "Perhatikan porsi. Bandingkan dengan pilihan yang natriumnya lebih rendah."
        : unknown
          ? "Periksa bahan yang belum dikenali sebelum memutuskan."
          : "Cocokkan porsi yang akan dikonsumsi dengan ukuran sajian label.";
  const reason = allergies.length
    ? `Cocok dengan: ${allergies.join(", ")}.`
    : result.splittingAnalysis.isSugarSplittingDetected
      ? `${result.splittingAnalysis.sugarCount} sumber gula ditemukan; jumlah bahan bukan ukuran gram gula.`
      : unknown
        ? `${unknown} bahan belum dikenali. Detailnya ada di Komposisi.`
        : "Penilaian mengikuti batas dan alergi pada profil, bukan jaminan keamanan medis.";
  return { title, action, reason, sugarPercent, sodiumPercent };
}
