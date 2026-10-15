import { productSchema, type Product } from "./collections";
import { parseIngredients } from "../ai/local-parser";
export const presetIds = [
  "fitgandum",
  "cokelat-malt",
  "mi-pedas",
  "kopi-aren",
  "keripik-keju",
] as const;
/** Illustrative competition fixtures, explicitly separate from real retail catalogue. O(1), five fixed cases. */
export function presetProducts(): Product[] {
  const cases = [
    {
      id: "fitgandum",
      name: "FitGandum, sereal ilustratif",
      category: "SEREAL_SARAPAN",
      price: 10000,
      serving: 40,
      ingredients:
        "gandum utuh, sukrosa, sirup glukosa, dekstrosa, madu, kakao, garam, lesitin",
      tags: ["cokelat", "sereal", "manis"],
      claims: ["Mengandung gandum utuh"],
      nutrition: [160, 18, 3, 100, 1, 3],
    },
    {
      id: "cokelat-malt",
      name: "Minuman cokelat malt, studi kasus",
      category: "SUSU_OLAHAN",
      price: 9000,
      serving: 200,
      ingredients:
        "air, sukrosa, susu sapi, sirup glukosa, kakao, maltodekstrin, lesitin",
      tags: ["cokelat", "creamy", "susu"],
      claims: ["Sumber energi"],
      nutrition: [180, 24, 4, 130, 2, 1],
    },
    {
      id: "mi-pedas",
      name: "Mi goreng pedas maksimal, studi kasus",
      category: "MI_INSTAN",
      price: 7000,
      serving: 100,
      ingredients:
        "tepung terigu, minyak sawit, garam, cabai, mononatrium glutamat, dinatrium ribonukleotida, sukrosa, natrium bikarbonat",
      tags: ["gurih", "mi", "pedas"],
      claims: ["Rasa pedas maksimal"],
      nutrition: [470, 7, 8, 1800, 8, 2],
    },
    {
      id: "kopi-aren",
      name: "Kopi susu gula aren, studi kasus",
      category: "MINUMAN_KEMASAN",
      price: 10000,
      serving: 200,
      ingredients: "air, susu sapi, gula aren, sukrosa, kopi, karagenan",
      tags: ["kopi", "creamy", "manis"],
      claims: ["Dengan gula aren"],
      nutrition: [190, 26, 3, 100, 3, 0],
    },
    {
      id: "keripik-keju",
      name: "Keripik kentang keju, studi kasus",
      category: "CAMILAN_BISKUIT",
      price: 10000,
      serving: 50,
      ingredients:
        "kentang, minyak sawit, garam, sukrosa, INS 621, INS 635, Tartrazin CI 19140",
      tags: ["kentang", "gurih", "keju"],
      claims: ["Rasa keju"],
      nutrition: [260, 3, 3, 600, 5, 2],
    },
  ];
  return cases.map((c) =>
    productSchema.parse({
      barcode: `case-${c.id}`,
      name: c.name,
      brand: "Studi kasus BongkarLabel",
      category: c.category,
      priceIdr: c.price,
      servingSizeGrams: c.serving,
      orderedIngredients: parseIngredients(c.ingredients),
      flavorTags: c.tags,
      marketingClaims: c.claims,
      novaGroup: 4,
      nutrition: {
        caloriesKcal: c.nutrition[0],
        sugarGrams: c.nutrition[1],
        proteinGrams: c.nutrition[2],
        sodiumMg: c.nutrition[3],
        saturatedFatGrams: c.nutrition[4],
        fiberGrams: c.nutrition[5],
      },
      source: {
        kind: "ILLUSTRATIVE_CASE",
        url: null,
        retrievedAt: "2026-10-15T00:00:00.000Z",
          note: "Contoh ilustratif untuk mempelajari pembacaan label, bukan data merek/produk riil. Harga, resep dan gizi adalah data contoh.",
      },
      priceSource: "ESTIMATE",
      priceSourceUrl: null,
    }),
  );
}
