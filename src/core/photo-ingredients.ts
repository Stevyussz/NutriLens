import type { PhotoReview } from "./ai/vision-contract";
import { dictionaryData } from "./db/dictionary-data";

const dictionary = dictionaryData();
/** Longest whole-name matches prevent 'gula' inside 'gula aren' being counted twice.
 * Name detection is evidence of presence only, never a measurement of ingredient mass.
 */
export function photoIngredientInsights(review: PhotoReview) {
  const text = review.ingredientsText.normalize("NFKC").toLowerCase();
  const matches = dictionary
    .flatMap((entry) =>
      entry.aliases.flatMap((alias) => {
        const escaped = alias
          .toLowerCase()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!escaped) return [];
        const regex = new RegExp(
          `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
          "gu",
        );
        return [...text.matchAll(regex)].map((m) => ({
          start: m.index!,
          end: m.index! + m[0].length,
          name: entry.canonicalName,
          category: entry.functionalCategory,
          source: entry.sourceUrl,
        }));
      }),
    )
    .sort((a, b) => b.end - b.start - (a.end - a.start));
  const accepted: typeof matches = [];
  for (const match of matches) {
    if (!accepted.some((a) => match.start < a.end && match.end > a.start))
      accepted.push(match);
  }
  accepted.sort((a, b) => a.start - b.start);
  const unique = [...new Map(accepted.map((m) => [m.name, m])).values()];
  const sugarSources = unique
    .filter((m) => m.category === "HIDDEN_SUGAR" || m.name === "laktosa")
    .map((m) => (m.name === "laktosa" ? "laktosa (gula susu)" : m.name));
  const sweeteners = unique
    .filter((m) => m.category === "ARTIFICIAL_SWEETENER")
    .map((m) => m.name);
  const summary = !text.trim()
    ? "Foto belum memuat komposisi. Asal gula, pemanis, dan bahan tambahan belum dapat diperiksa. Tambahkan foto daftar bahan; angka gizi yang sudah terbaca tetap berlaku."
    : sugarSources.length
      ? `Sumber gula yang dikenali: ${sugarSources.join(", ")}. ${sugarSources.length > 1 ? "Nama berbeda ini tetap menyumbang ke gula total yang sama, bukan gula ekstra di luar tabel." : "Bahan ini menyumbang ke gula total pada tabel."} Gram tiap bahan tidak tercantum, jadi tidak ditebak dari urutannya.`
      : "Belum ada nama sumber gula yang cocok dengan kamus dari komposisi terbaca. Ini bukan bukti bebas gula; bahan campuran dan nama yang belum dikenal bisa terlewat.";
  const milkSugarNote = unique.some((m) => m.name === "laktosa")
    ? "Laktosa adalah gula susu. Namanya saja tidak memastikan apakah gula itu berasal dari susu dalam produk atau ditambahkan sebagai bahan tersendiri."
    : null;
  return {
    sugarSources,
    milkSugarNote,
    sweeteners,
    recognized: unique,
    summary: milkSugarNote ? `${summary} ${milkSugarNote}` : summary,
    accounting:
      "Gula total mencakup gula alami dan tambahan. Jangan menambahkan perkiraan gula dari komposisi ke angka tabel. Tanpa kadar bahan, jumlah tiap sumber dan gula tambahan/bebas tidak dapat dihitung pasti.",
  };
}
