import type { PhotoReview } from "./ai/vision-contract";
import type { HealthProfile } from "./db/collections";
/** A cautious purchase aid from available label facts; never substitutes missing data with zero. */
export function photoDecision(review: PhotoReview, health?: HealthProfile) {
  const sugar = review.nutrition.sugarGrams;
  const sodium = review.nutrition.sodiumMg;
  const sugarPercent =
    sugar === null || !health
      ? null
      : Math.round((sugar / health.dailySugarLimitGrams) * 100);
  const sodiumPercent =
    sodium === null || !health
      ? null
      : Math.round((sodium / health.dailySodiumLimitMg) * 100);
  const ingredients = review.ingredientsText.toLowerCase();
  const allergyMatches = (health?.allergies ?? []).filter((a) =>
    ingredients.includes(a.toLowerCase()),
  );
  const title = allergyMatches.length
    ? "Pilih produk lain karena ada kecocokan alergi."
    : sugarPercent !== null && sugarPercent >= 25
      ? "Bandingkan dengan yang lebih rendah gula."
      : sodiumPercent !== null && sodiumPercent >= 25
        ? "Bandingkan dengan yang lebih rendah natrium."
        : sugar === null
          ? "Gulanya belum bisa dipastikan."
          : "Pertimbangkan porsi sebelum membeli.";
  const action = allergyMatches.length
    ? `Bahan yang cocok dengan profil: ${allergyMatches.join(", ")}.`
    : sugarPercent !== null && sugarPercent >= 25
      ? `Satu sajian memuat ${sugar} g gula, sekitar ${sugarPercent}% batas gula harian di profil Anda. Pilih porsi lebih kecil atau minuman tanpa tambahan gula bila ingin menguranginya.`
      : sodiumPercent !== null && sodiumPercent >= 25
        ? `Satu sajian memakai sekitar ${sodiumPercent}% batas natrium di profil Anda. Cari label dengan angka natrium lebih kecil pada porsi yang sebanding.`
        : sugar === null
          ? "Foto ulang baris gula agar angkanya dapat dibandingkan. Angka lain yang terbaca tetap bisa Anda lihat."
          : "Angka gula ini hanya satu bagian dari keputusan. Sesuaikan jumlah yang diminum dan konsumsi lain hari ini.";
  return { title, action, sugarPercent, sodiumPercent, allergyMatches };
}

export function photoDisplayName(review: PhotoReview) {
  const name = review.name.trim();
  const brand = review.brand.trim();
  return name
    ? brand && !name.toLowerCase().includes(brand.toLowerCase())
      ? `${brand} ${name}`
      : name
    : brand || "Label dari foto Anda";
}
