import type { PhotoReview } from "./ai/vision-contract";
import type { HealthProfile } from "./db/collections";
import { photoIngredientInsights } from "./photo-ingredients";
import { allergyConflict } from "./food-allergy-match";
import { decimal } from "./utils";
/** Facts and explicit choices, with no health score or arbitrary 'high sugar' threshold. */
export function photoDecision(review: PhotoReview, health?: HealthProfile) {
  const n = review.nutrition;
  const count = review.servingsPerContainer;
  const hasNutrition = Object.values(n).some((v) => v !== null);
  const packageSugar =
    n.sugarGrams === null || count === null ? null : n.sugarGrams * count;
  const packageSodium =
    n.sodiumMg === null || count === null ? null : n.sodiumMg * count;
  const displaySugar = packageSugar ?? n.sugarGrams;
  const displaySodium = packageSodium ?? n.sodiumMg;
  const amountBasis = count === null ? "sajian" : "kemasan";
  // Retained as per-serving detail for existing callers, never the headline's decision rule.
  const sugarPercent =
    n.sugarGrams === null || !health
      ? null
      : Math.round((n.sugarGrams / health.dailySugarLimitGrams) * 100);
  const sodiumPercent =
    n.sodiumMg === null || !health
      ? null
      : Math.round((n.sodiumMg / health.dailySodiumLimitMg) * 100);
  const ingredients = review.ingredientsText.toLowerCase();
  const allergyMatches = (health?.allergies ?? []).filter((a) =>
    allergyConflict(ingredients, [a]),
  );
  const needsVision = review.engine === "LOCAL_OCR" && !review.userCorrected;
  const sugarConflict =
    n.sugarGrams === null &&
    (review.visionReview?.differences.some((d) => d.field === "sugarGrams") ||
      review.issues.some(
        (i) =>
          i.startsWith("Gula:") && /dua pembaca|visual ulang berbeda/.test(i),
      ));
  const drink =
    review.category === "MINUMAN_KEMASAN" ||
    /kopi|coffee|minuman|teh/.test(review.name.toLowerCase());
  const coffee = /kopi|coffee/.test(review.name.toLowerCase());
  const servingUnit = review.evidence.servingText
    ?.match(/(ml|gram|g)\s*$/i)?.[1]
    .toLowerCase()
    .replace("gram", "g");
  const packageSize =
    count !== null && review.servingSizeGrams !== null && servingUnit
      ? review.servingSizeGrams * count
      : null;
  const halfSize =
    packageSize !== null ? ` (${decimal(packageSize / 2)} ${servingUnit})` : "";
  const comparisonSize =
    packageSize !== null
      ? ` pada ukuran ${decimal(packageSize)} ${servingUnit} yang sama`
      : " pada ukuran kemasan yang sama";
  const title = needsVision
    ? "Bacaan ini perlu dipindai dengan vision."
    : allergyMatches.length
      ? "Ada bahan yang cocok dengan alergi Anda."
      : sugarConflict
        ? "Angka gula berbeda saat dibaca ulang."
        : displaySugar === null
          ? "Gula belum terkonfirmasi dari foto."
          : count === null
            ? `${decimal(displaySugar)} g gula per sajian.`
            : `Kalau dihabiskan: ${decimal(displaySugar)} g gula.`;
  const action = needsVision
    ? "Hasil ini berasal dari OCR lokal lama. Scan ulang kemasan agar Nara membaca fotonya langsung; angka lama belum menjadi dasar saran pembelian."
    : allergyMatches.length
      ? `Bahan yang cocok: ${allergyMatches.join(", ")}. Hindari produk ini jika bahan tersebut memang pemicu alergi Anda, lalu periksa peringatan pada kemasan.`
      : sugarConflict
        ? "Dua pembacaan visual memberi angka berbeda. Nara belum memilih salah satunya. Lihat rincian bacaan atau foto ulang baris gula."
        : displaySugar === null
          ? hasNutrition
            ? "Vision belum memastikan baris gula. Angka lain yang terbaca tetap tersedia; foto ulang bagian tabel gizi tanpa mengisi semua kolom."
            : "Nara belum bisa membaca tabel gizi dari foto ini. Ambil foto bagian Informasi Nilai Gizi pada kemasan; tidak perlu mengisi formulir gizi."
          : displaySugar === 0
            ? `Label menulis 0 g gula per ${amountBasis}. Ini belum menjelaskan pemanis, alergen, atau seluruh kualitas gizinya.`
            : drink
              ? coffee
                ? packageSugar === null
                  ? "Jumlah sajian per kemasan belum diketahui, jadi total gula jika dihabiskan belum dapat dihitung. Cek baris jumlah sajian sebelum membandingkan seluruh kemasan."
                  : `Setengah kemasan${halfSize} memberi ${decimal(packageSugar / 2)} g gula. Untuk satu kemasan dengan gula lebih sedikit, cari kopi di bawah ${decimal(displaySugar)} g${comparisonSize}.`
                : `Jika tujuan Anda sekadar melepas haus, air putih tidak menambah gula. ${packageSugar === null ? "Jumlah sajian per kemasan belum terbaca, jadi total gulanya belum bisa dihitung." : `Jika memilih minuman ini, setengah kemasan${halfSize} memberi ${decimal(packageSugar / 2)} g gula.`}`
              : packageSugar === null
                ? "Jumlah sajian dalam satu kemasan belum diketahui. Gunakan ukuran sajian yang tertulis sebelum memutuskan berapa banyak yang dimakan."
                : `Satu kemasan berisi ${decimal(count!)} sajian. Separuh kemasan memberi ${decimal(packageSugar / 2)} g gula; jumlah yang dimakan menentukan totalnya.`;
  // WHO's approximate mass comparison: 50 g ≈ 12 level teaspoons. It is not an added-sugar measurement.
  const spoons = displaySugar === null ? null : (displaySugar * 12) / 50;
  const meaning =
    needsVision || displaySugar === null
      ? null
      : displaySugar === 0
        ? "Nol adalah angka yang tercantum pada label, bukan jaminan produk sehat."
        : spoons! < 1
          ? "Berat gulanya kurang dari satu sendok teh."
          : `Berat gulanya kira-kira ${Math.floor(spoons!) === Math.ceil(spoons!) ? decimal(spoons!) : `${Math.floor(spoons!)}–${Math.ceil(spoons!)}`} sendok teh. Label belum memisahkan gula alami dan tambahan.`;
  const portionNote =
    count === null
      ? "Jumlah sajian per kemasan belum diketahui."
      : `${decimal(count)} sajian dalam satu kemasan${review.evidence.servingText ? ` · ${review.evidence.servingText} per sajian` : ""}.`;
  const ingredientInsights = photoIngredientInsights(review);
  const otherNutrition = [
    n.saturatedFatGrams === null
      ? null
      : `${decimal(n.saturatedFatGrams * (count ?? 1))} g lemak jenuh`,
    n.caloriesKcal === null
      ? null
      : `${decimal(n.caloriesKcal * (count ?? 1))} kkal`,
  ].filter(Boolean);
  const takeaway =
    displaySugar === null || needsVision
      ? null
      : `Kalau ingin mengurangi gula, ${
          displaySugar === 0
            ? "cek juga pemanis dan komposisinya sebelum memilih."
            : coffee
              ? "kopi tanpa gula tambahan bisa jadi pilihan. Rasa kopi atau susu tidak berarti minumannya rendah gula."
              : drink
                ? "air putih bisa jadi pilihan untuk haus; minuman ini tetap menyumbang gula meskipun rasanya tidak terlalu manis."
                : "lihat porsi yang benar-benar dimakan, bukan hanya ukuran sajian kecil pada tabel."
        } ${otherNutrition.length ? `Per ${amountBasis} juga ada ${otherNutrition.join(" dan ")}. Gula bukan satu-satunya hal yang perlu dilihat.` : ""}`;
  return {
    ingredientInsights,
    takeaway,
    title,
    action,
    meaning,
    portionNote,
    sugarPercent,
    sodiumPercent,
    allergyMatches,
    sugarConflict,
    needsVision,
    hasNutrition,
    packageSugar,
    packageSodium,
    displaySugar,
    displaySodium,
    amountBasis,
  };
}
export function photoDisplayName(review: PhotoReview) {
  const name = review.name.trim(),
    brand = review.brand.trim();
  return name
    ? brand && !name.toLowerCase().includes(brand.toLowerCase())
      ? `${brand} ${name}`
      : name
    : brand || "Label dari foto Anda";
}
