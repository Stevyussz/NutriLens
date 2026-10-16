import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import { chemicalSchema, type Chemical } from "../src/core/db/collections";
const nodeSchema = z
  .object({
    name: z.record(z.string()),
    parents: z.array(z.string()).optional(),
    children: z.array(z.string()).optional(),
    e_number: z.record(z.string()).optional(),
    additives_classes: z.record(z.string()).optional(),
    description: z.record(z.string()).optional(),
    wikidata: z.record(z.string()).optional(),
    ciqual_food_code: z.record(z.string()).optional(),
    usda_fdc_code: z.record(z.string()).optional(),
    efsa_evaluation: z.record(z.string()).optional(),
    efsa_evaluation_url: z.record(z.string()).optional(),
    efsa_evaluation_date: z.record(z.string()).optional(),
  })
  .passthrough();
const taxonomySchema = z.record(nodeSchema);
type Taxonomy = z.infer<typeof taxonomySchema>;
const urls = {
  additives: "https://static.openfoodfacts.org/data/taxonomies/additives.json",
  ingredients:
    "https://static.openfoodfacts.org/data/taxonomies/ingredients.json",
};
/** Traverses provider hierarchy once, with cycle protection. O(v+e) time and O(v) memory. */
function descendants(taxonomy: Taxonomy, roots: string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    stack.push(...(taxonomy[id]?.children ?? []));
  }
  return seen;
}
/** Maps declared provider additive roles only; unrepresented functions remain UNKNOWN. O(1) per node. */
function categoryFor(classes: string): Chemical["functionalCategory"] {
  if (/sweetener/.test(classes)) return "ARTIFICIAL_SWEETENER";
  if (/colour|color/.test(classes)) return "COLORANT";
  if (/preservative/.test(classes)) return "PRESERVATIVE";
  if (/emulsifier|stabiliser|thickener|gelling-agent/.test(classes))
    return "EMULSIFIER";
  return "UNKNOWN";
}
/** Downloads two complete provider datasets and materializes reproducible glossary records.
 * No names are sourced individually. O(v+e+a) for nodes, hierarchy edges and multilingual aliases.
 */
async function main() {
  const retrievedAt = new Date().toISOString();
  const raw = await Promise.all(
    (Object.keys(urls) as (keyof typeof urls)[]).map(async (key) => {
      const bytes = process.argv[2]
        ? await readFile(`${process.argv[2]}/bongkar-${key}.json`, "utf8")
        : await (
            await fetch(urls[key], {
              signal: AbortSignal.timeout(90000),
              headers: {
                "User-Agent": "BongkarLabel/1.0 educational taxonomy importer",
              },
            })
          ).text();
      return {
        key,
        taxonomy: taxonomySchema.parse(JSON.parse(bytes)),
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }),
  );
  const rows: Chemical[] = [];
  for (const { key, taxonomy } of raw) {
    const sugars =
      key === "ingredients"
        ? descendants(taxonomy, [
            "en:sugar",
            "en:glucose",
            "en:fructose",
            "en:honey",
            "en:glucose-fructose-syrup",
            "en:invert-sugar",
          ])
        : new Set<string>();
    for (const [id, value] of Object.entries(taxonomy)) {
      const name = (
        value.name.id ??
        value.name.en ??
        Object.values(value.name)[0]
      )
        .replace(/^E\d+[a-z]*(?:\([iv]+\))?\s*[-:]\s*/i, "")
        .trim()
        .toLowerCase();
      if (!name) continue;
      const code =
        key === "additives"
          ? `E${value.e_number?.en ?? id.replace(/^[^:]+:e/i, "")}`.toUpperCase()
          : "";
      const aliases = [
        ...new Set(
          [
            name,
            ...Object.values(value.name).flatMap((n) => [
              n.toLowerCase(),
              n
                .replace(/^E\d+[a-z]*(?:\([iv]+\))?\s*[-:]\s*/i, "")
                .toLowerCase(),
            ]),
            ...(code
              ? [code.toLowerCase(), `ins ${code.slice(1).toLowerCase()}`]
              : []),
          ]
            .map((n) => n.normalize("NFKC").replace(/\s+/g, " ").trim())
            .filter(Boolean),
        ),
      ];
      const functionalCategory = sugars.has(id)
        ? "HIDDEN_SUGAR"
        : categoryFor(value.additives_classes?.en ?? "");
      const efsaUrl = value.efsa_evaluation_url?.en;
      const efsaTitle = value.efsa_evaluation?.en;
      rows.push(
        chemicalSchema.parse({
          canonicalName: name,
          insOrECode: code,
          aliases,
          functionalCategory,
          glycemicIndex: null,
          riskLevel: functionalCategory === "HIDDEN_SUGAR" ? "MODERATE" : "LOW",
          triggersConditions:
            functionalCategory === "HIDDEN_SUGAR" ? ["DIABETES"] : [],
          plainExplanation:
            functionalCategory === "HIDDEN_SUGAR"
              ? "Nama ini berada dalam cabang gula/glukosa/fruktosa/madu pada taksonomi Open Food Facts. Model menggabungkannya sebagai sumber gula; kandungan sebenarnya tetap mengikuti label."
              : key === "additives"
                ? `Entri aditif dari Open Food Facts. Fungsi penyedia: ${(value.additives_classes?.en ?? "belum tersedia").replaceAll("en:", "")}. Identitas kode bukan penilaian keamanan; kadar dan aturan penggunaan perlu diperiksa.`
                : "Entri bahan dan alias multibahasa dari taksonomi Open Food Facts. Kategori fungsi, GI dan pemicu medis belum ditetapkan dalam aturan lokal. Kecocokan nama tidak membuktikan keamanan.",
          sourceUrl: urls[key],
          provider: { id, url: urls[key], retrievedAt },
          providerDetails: {
            description:
              (value.description?.id ?? value.description?.en)?.slice(
                0,
                5000,
              ) ?? null,
            functions: (value.additives_classes?.en ?? "")
              .split(",")
              .map((s) => s.trim().replace(/^en:/, "").replaceAll("-", " "))
              .filter(Boolean),
            wikidata:
              value.wikidata?.en && /^Q\d+$/.test(value.wikidata.en)
                ? value.wikidata.en
                : null,
            ciqualCode:
              value.ciqual_food_code?.en ?? value.ciqual_food_code?.fr ?? null,
            usdaFdcCode:
              value.usda_fdc_code?.en && /^\d+$/.test(value.usda_fdc_code.en)
                ? value.usda_fdc_code.en
                : null,
            efsa:
              efsaUrl &&
              efsaTitle &&
              /^https:\/\/(efsa\.onlinelibrary\.wiley\.com|www\.efsa\.europa\.eu)\//.test(
                efsaUrl,
              )
                ? {
                    title: efsaTitle.slice(0, 1000),
                    url: efsaUrl,
                    date: value.efsa_evaluation_date?.en ?? null,
                  }
                : null,
          },
        }),
      );
    }
  }
  const unique = new Map<string, Chemical>();
  for (const row of rows) {
    const previous = unique.get(row.canonicalName);
    unique.set(
      row.canonicalName,
      previous
        ? {
            ...previous,
            functionalCategory:
              previous.functionalCategory === "UNKNOWN"
                ? row.functionalCategory
                : previous.functionalCategory,
            aliases: [...new Set([...previous.aliases, ...row.aliases])],
            providerDetails: {
              description:
                previous.providerDetails?.description ??
                row.providerDetails?.description ??
                null,
              functions: [
                ...new Set([
                  ...(previous.providerDetails?.functions ?? []),
                  ...(row.providerDetails?.functions ?? []),
                ]),
              ],
              wikidata:
                previous.providerDetails?.wikidata ??
                row.providerDetails?.wikidata ??
                null,
              ciqualCode:
                previous.providerDetails?.ciqualCode ??
                row.providerDetails?.ciqualCode ??
                null,
              usdaFdcCode:
                previous.providerDetails?.usdaFdcCode ??
                row.providerDetails?.usdaFdcCode ??
                null,
              efsa:
                previous.providerDetails?.efsa ??
                row.providerDetails?.efsa ??
                null,
            },
          }
        : row,
    );
  }
  await writeFile(
    "data/dictionary.snapshot.json",
    JSON.stringify([...unique.values()], null, 2) + "\n",
  );
  await writeFile(
    "data/dictionary.manifest.json",
    JSON.stringify(
      {
        provider: "Open Food Facts",
        retrievedAt,
        sources: raw.map(({ key, taxonomy, sha256 }) => ({
          url: urls[key],
          records: Object.keys(taxonomy).length,
          sha256,
        })),
        imported: unique.size,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      imported: unique.size,
      sourceCounts: raw.map((r) => ({
        taxonomy: r.key,
        count: Object.keys(r.taxonomy).length,
      })),
    }),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
