import { chemicalSchema, type Chemical } from "./collections";
const additivesSource =
  "https://www.efsa.europa.eu/en/topics/topic/food-additives";
const dietSource =
  "https://www.who.int/news-room/fact-sheets/detail/healthy-diet";
const refluxSource =
  "https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/eating-diet-nutrition";
type Entry = [string, string, string];
const groups: {
  category: Chemical["functionalCategory"];
  entries: Entry[];
  explanation: string;
  triggers: string[];
  source: string;
}[] = [
  {
    category: "HIDDEN_SUGAR",
    entries: [
      ["sukrosa", "", "gula|sugar|sucrose|gula pasir"],
      ["dekstrosa", "", "dextrose|glukosa|glucose"],
      ["fruktosa", "", "fructose"],
      ["sirup glukosa", "", "glucose syrup|sirup gula"],
      [
        "sirup jagung tinggi fruktosa",
        "",
        "high fructose corn syrup|hfcs|sirup fruktosa",
      ],
      ["maltosa", "", "maltose"],
      ["gula invert", "", "invert sugar"],
      ["gula aren", "", "palm sugar|gula kelapa"],
      ["gula tebu", "", "cane sugar"],
      ["madu", "", "honey"],
      ["molase", "", "molasses|tetes tebu"],
      ["sirup beras", "", "rice syrup"],
      ["sirup malt", "", "malt syrup"],
      ["konsentrat jus buah", "", "fruit juice concentrate"],
      ["gula merah", "", "brown sugar"],
      ["sirup agave", "", "agave syrup"],
      ["sirup maple", "", "maple syrup"],
      ["gula batu", "", "rock sugar"],
    ],
    explanation:
      "Sumber gula. Nama yang berbeda dapat menyumbang gula pada produk yang sama. Besaran kontribusi mengikuti jumlah pada label, bukan sekadar keberadaan bahan.",
    triggers: ["DIABETES"],
    source: dietSource,
  },
  {
    category: "SODIUM_ADDITIVE",
    entries: [
      ["garam", "", "salt|natrium klorida|sodium chloride"],
      [
        "mononatrium glutamat",
        "INS 621",
        "msg|monosodium glutamate|mononatrium glutamat ins 621|e621|penyedap rasa",
      ],
      ["dinatrium inosinat", "INS 631", "disodium inosinate|e631"],
      ["dinatrium guanilat", "INS 627", "disodium guanylate|e627"],
      [
        "dinatrium ribonukleotida",
        "INS 635",
        "disodium ribonucleotides|e635|penguat rasa ins 635",
      ],
      ["natrium bikarbonat", "INS 500", "sodium bicarbonate|e500|soda kue"],
      ["natrium sitrat", "INS 331", "sodium citrate|e331"],
      ["natrium fosfat", "INS 339", "sodium phosphate|e339"],
    ],
    explanation:
      "Bahan yang mengandung natrium. Untuk pembatasan natrium, periksa total mg natrium per sajian dan jumlah sajian; keberadaan kode INS sendiri tidak membuktikan bahaya.",
    triggers: ["HIPERTENSI"],
    source: dietSource,
  },
  {
    category: "ARTIFICIAL_SWEETENER",
    entries: [
      ["aspartam", "E951", "aspartame|aspartam e951|ins 951"],
      ["asesulfam kalium", "E950", "acesulfame potassium|acesulfame k|ins 950"],
      ["sukralosa", "E955", "sucralose|ins 955"],
      ["sakarin", "E954", "saccharin|ins 954"],
      ["siklamat", "E952", "cyclamate|natrium siklamat|ins 952"],
      ["neotam", "E961", "neotame|ins 961"],
    ],
    explanation:
      "Pemanis intensitas tinggi. Ini bukan gula, dan keberadaannya tidak cukup untuk memutuskan keamanan tanpa kadar, pola konsumsi, dan aturan penggunaan. Aspartam memerlukan perhatian khusus bagi fenilketonuria.",
    triggers: [],
    source: additivesSource,
  },
  {
    category: "PRESERVATIVE",
    entries: [
      [
        "natrium benzoat",
        "INS 211",
        "sodium benzoate|e211|natrium benzoat ins 211",
      ],
      ["kalium sorbat", "INS 202", "potassium sorbate|e202"],
      ["asam sorbat", "INS 200", "sorbic acid|e200"],
      ["kalsium propionat", "INS 282", "calcium propionate|e282"],
      ["natrium nitrit", "INS 250", "sodium nitrite|e250"],
      ["natrium metabisulfit", "INS 223", "sodium metabisulfite|e223"],
    ],
    explanation:
      "Pengawet yang membantu mengendalikan kerusakan pangan. Batas dan kondisi pemakaian ditentukan per bahan serta kategori pangan. Tidak dianggap berbahaya hanya karena merupakan aditif.",
    triggers: [],
    source: additivesSource,
  },
  {
    category: "COLORANT",
    entries: [
      ["tartrazin", "INS 102", "tartrazine|tartrazin ci 19140|ci 19140|e102"],
      ["kuning senja", "INS 110", "sunset yellow|e110"],
      ["merah allura", "INS 129", "allura red|e129"],
      ["biru berlian", "INS 133", "brilliant blue|e133"],
      ["karamel kelas iv", "INS 150d", "caramel iv|karamel iv|e150d"],
      ["beta karoten", "INS 160a", "beta carotene|e160a"],
      ["kurkumin", "INS 100", "curcumin|e100"],
    ],
    explanation:
      "Pewarna untuk tampilan pangan. Kode warna mengidentifikasi bahan, bukan tingkat bahaya. Jika mempunyai riwayat reaksi terhadap pewarna tertentu, cocokkan dengan label dan saran tenaga kesehatan.",
    triggers: [],
    source: additivesSource,
  },
  {
    category: "EMULSIFIER",
    entries: [
      ["lesitin", "INS 322", "lecithin|lesitin kedelai|soy lecithin|e322"],
      ["mono dan digliserida", "INS 471", "mono- and diglycerides|e471"],
      ["polisorbat 80", "INS 433", "polysorbate 80|e433"],
      ["karagenan", "INS 407", "carrageenan|e407"],
      ["gom xanthan", "INS 415", "xanthan gum|e415"],
      ["karboksimetil selulosa", "INS 466", "carboxymethyl cellulose|cmc|e466"],
      ["pektin", "INS 440", "pectin|e440"],
    ],
    explanation:
      "Membantu kestabilan atau tekstur campuran pangan. Pemakaian dinilai berdasarkan kondisi dan kadar. Kategori ini digunakan sebagai penanda formulasi dalam heuristik NOVA, bukan vonis medis.",
    triggers: [],
    source: additivesSource,
  },
  {
    category: "WHOLE_FOOD",
    entries: [
      ["gandum utuh", "", "whole wheat|gandum|whole grain wheat"],
      ["oat", "", "oats|rolled oats|havermut"],
      ["susu sapi", "", "fresh milk|susu segar|susu sapi segar|milk|susu"],
      ["air", "", "water"],
      ["tepung terigu", "", "wheat flour|terigu"],
      ["beras", "", "rice"],
      ["jagung", "", "corn|maize"],
      ["kentang", "", "potato|potatoes"],
      ["kedelai", "", "soy|soybean|soya"],
      ["kacang tanah", "", "peanut|peanuts"],
      ["kakao", "", "cocoa|cokelat bubuk|cocoa powder"],
      ["minyak sawit", "", "palm oil|minyak nabati"],
      ["telur", "", "egg|eggs"],
    ],
    explanation:
      "Bahan pangan dasar. Kategori kamus ini bukan jaminan keamanan atau klasifikasi NOVA final. Alergi, proses pengolahan, dan keseluruhan resep tetap perlu dipertimbangkan.",
    triggers: [],
    source: dietSource,
  },
  {
    category: "WHOLE_FOOD",
    entries: [
      ["kopi", "", "coffee|kopi bubuk|kafein|caffeine"],
      ["cabai", "", "cabe|chili|chilli|cabai bubuk"],
    ],
    explanation:
      "Kopi/kafein atau makanan pedas dapat memicu gejala pada sebagian orang dengan GERD. Respons berbeda per orang; perhatikan pemicu pribadi.",
    triggers: ["GERD"],
    source: refluxSource,
  },
  {
    category: "UNKNOWN",
    entries: [
      ["maltodekstrin", "", "maltodextrin"],
      ["laktosa", "", "lactose"],
    ],
    explanation:
      "Maltodekstrin adalah karbohidrat olahan dan laktosa merupakan gula susu. Keduanya tidak otomatis dihitung sebagai gula tambahan dalam model ini. Nilai GI tidak disimpulkan dari nama saja.",
    triggers: [],
    source: dietSource,
  },
];
/** Builds normalized, source-attributed dictionary entries. O(e+a) entries and aliases. */
export function dictionaryData(): Chemical[] {
  const gi: Record<string, number> = {
    sukrosa: 65,
    dekstrosa: 100,
    fruktosa: 19,
  };
  return groups.flatMap((g) =>
    g.entries.map(([canonicalName, insOrECode, aliases]) =>
      chemicalSchema.parse({
        canonicalName,
        insOrECode,
        aliases: [
          ...new Set([
            ...aliases.split("|"),
            canonicalName,
            ...(insOrECode ? [insOrECode.toLowerCase()] : []),
          ]),
        ],
        functionalCategory: g.category,
        glycemicIndex: gi[canonicalName] ?? null,
        riskLevel: g.triggers.length ? "MODERATE" : "LOW",
        triggersConditions: g.triggers,
        plainExplanation: `${g.explanation}${gi[canonicalName] !== undefined ? " GI referensi bahan murni; sukrosa bervariasi sekitar 60–65. Nilai produk campuran tidak dapat disimpulkan langsung." : ""}`,
        sourceUrl:
          gi[canonicalName] !== undefined
            ? "https://glycemicindex.com/2013/07/gi-update-with-prof-jennie-brand-miller-5/"
            : g.source,
      }),
    ),
  );
}

/** Applies local interpretation rules over provider identities without dropping multilingual aliases.
 * Exact alias/code matching merges duplicates; provider provenance is retained. O(v*a+r*a) average.
 */
export function mergeDictionaryData(
  provider: Chemical[],
  rules: Chemical[],
): Chemical[] {
  const rows = new Map(provider.map((row) => [row.canonicalName, row]));
  const aliases = new Map<string, Set<string>>();
  for (const row of provider)
    for (const alias of [row.canonicalName, row.insOrECode, ...row.aliases]) {
      const key = alias.toLowerCase().trim();
      if (!key) continue;
      const matches = aliases.get(key) ?? new Set<string>();
      matches.add(row.canonicalName);
      aliases.set(key, matches);
    }
  for (const rule of rules) {
    const matching = new Set(
      [rule.canonicalName, rule.insOrECode, ...rule.aliases].flatMap(
        (alias) => [...(aliases.get(alias.toLowerCase().trim()) ?? [])],
      ),
    );
    const previous = [...matching].flatMap((name) => {
      const row = rows.get(name);
      return row ? [row] : [];
    });
    for (const name of matching) rows.delete(name);
    rows.set(rule.canonicalName, {
      ...rule,
      aliases: [
        ...new Set([
          ...rule.aliases,
          ...previous.flatMap((p) => [p.canonicalName, ...p.aliases]),
        ]),
      ],
      ...(previous[0]?.provider ? { provider: previous[0].provider } : {}),
    });
  }
  return [...rows.values()];
}
