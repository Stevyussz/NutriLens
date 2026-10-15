import {
  productSchema,
  type Product,
  type Ingredient,
} from "../db/collections";
import { HttpError } from "../security/errors";

/** Splits only top-level separators and recursively expands sub-ingredients.
 * @param text Ordered composition, optionally nested in parentheses. O(n*d), depth d<=10.
 */
export function parseIngredients(text: string, depth = 0): Ingredient[] {
  if (depth > 10) throw new HttpError(400, "Subkomposisi terlalu dalam.");
  const pieces: string[] = [];
  let start = 0;
  let level = 0;
  for (let idx = 0; idx < text.length; idx++) {
    const c = text[idx];
    if (c === "(") level++;
    if (c === ")") level--;
    if (level < 0)
      throw new HttpError(400, "Tanda kurung komposisi tidak seimbang.");
    const decimalComma =
      c === "," &&
      /\d/.test(text[idx - 1] ?? "") &&
      /\d/.test(text[idx + 1] ?? "");
    if ((c === "," || c === ";") && level === 0 && !decimalComma) {
      pieces.push(text.slice(start, idx));
      start = idx + 1;
    }
  }
  if (level !== 0)
    throw new HttpError(400, "Tanda kurung komposisi tidak seimbang.");
  pieces.push(text.slice(start));
  const names = pieces.flatMap((piece) => {
    const match = piece.match(/^([^()]+)\((.*)\)\s*$/s);
    return match
      ? parseIngredients(match[2], depth + 1).map((i) => ({
          ...i,
          rawName: `${i.rawName} [${match[1].trim()}]`,
          explicitPercentage: null,
        }))
      : [
          {
            rawName: piece.trim(),
            explicitPercentage: piece.match(/(\d+(?:[.,]\d+)?)\s*%/)
              ? Number(
                  piece.match(/(\d+(?:[.,]\d+)?)\s*%/)?.[1].replace(",", "."),
                )
              : null,
          },
        ];
  });
  return names
    .filter((i) => i.rawName)
    .map((i, orderIndex) => ({
      orderIndex,
      rawName: i.rawName,
      explicitPercentage: i.explicitPercentage,
      canonicalChemicalName: i.rawName
        .replace(/\s*\[.*\]|\d+(?:[.,]\d+)?\s*%/g, "")
        .trim()
        .toLowerCase(),
      functionalCategory: "UNKNOWN" as const,
    }));
}
/** Local mode accepts fully declared label data rather than inventing missing nutrition. O(n). */
export function parseLocalProduct(input: unknown): Product {
  return productSchema.parse(input);
}

/** Parses explicit key:value label lines without guessing nutrients or prices.
 * @param text Indonesian labelled lines. @param barcode Stable content identity supplied by caller.
 * O(n) text parsing and ingredient expansion. Missing required facts produce an actionable 422.
 */
export function parseLocalLabelText(text: string, barcode: string): Product {
  const fields = new Map(
    text.split(/\r?\n/).flatMap((line) => {
      const colon = line.indexOf(":");
      return colon > 0
        ? [
            [
              line.slice(0, colon).trim().toLowerCase(),
              line.slice(colon + 1).trim(),
            ] as const,
          ]
        : [];
    }),
  );
  const required = [
    "nama",
    "kategori",
    "harga",
    "sajian",
    "energi",
    "gula",
    "protein",
    "natrium",
    "lemak jenuh",
    "serat",
    "komposisi",
  ];
  const missing = required.filter((key) => !fields.get(key));
  if (missing.length)
    throw new HttpError(
      422,
      `Mode lokal aktif. Gunakan formulir Label lengkap atau teks satu field per baris. Field belum tersedia: ${missing.join(", ")}.`,
    );
  const numeric = (key: string) => {
    const value = fields
      .get(key)
      ?.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:g|mg|ml|kkal|kcal|rp)?\s*$/i)?.[1];
    if (!value)
      throw new HttpError(
        422,
        `Angka ${key} tidak terbaca. Gunakan angka tanpa pemisah ribuan.`,
      );
    return Number(value.replace(",", "."));
  };
  return productSchema.parse({
    barcode,
    name: fields.get("nama"),
    brand: fields.get("merek") ?? "",
    category: fields.get("kategori")?.toUpperCase(),
    priceIdr: numeric("harga"),
    servingSizeGrams: numeric("sajian"),
    flavorTags: (fields.get("rasa") ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    nutrition: {
      caloriesKcal: numeric("energi"),
      sugarGrams: numeric("gula"),
      proteinGrams: numeric("protein"),
      sodiumMg: numeric("natrium"),
      saturatedFatGrams: numeric("lemak jenuh"),
      fiberGrams: numeric("serat"),
    },
    orderedIngredients: parseIngredients(fields.get("komposisi") ?? ""),
    novaGroup: 1,
    marketingClaims: (fields.get("klaim") ?? "").split(";").filter(Boolean),
    source: {
      kind: "USER_INPUT",
      url: null,
      retrievedAt: new Date().toISOString(),
      note: "Teks label terstruktur dibaca parser lokal tanpa estimasi nilai gizi. Verifikasi kembali satuan dan sajian pada kemasan.",
    },
    priceSource: "USER_INPUT",
    priceSourceUrl: null,
  });
}
