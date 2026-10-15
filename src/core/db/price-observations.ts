import { z } from "zod";

export const priceObservationSchema = z
  .object({
    id: z.number().int().positive(),
    barcode: z.string().regex(/^\d{8,14}$/),
    priceIdr: z.number().positive().max(10000000),
    date: z.string().date(),
    proofId: z.number().int().positive(),
    sourceUrl: z.string().url(),
    location: z.string(),
    packageQuantity: z.number().positive().nullable(),
    packageUnit: z.enum(["g", "ml"]).nullable(),
    pricePer: z.string().nullable(),
    discounted: z.boolean(),
  })
  .strict();
export type PriceObservation = z.infer<typeof priceObservationSchema>;

const providerRow = z.object({
  id: z.number().int().positive(),
  product_code: z.string().regex(/^\d{8,14}$/),
  price: z.number().positive().max(10000000),
  currency: z.literal("IDR"),
  date: z.string().date(),
  proof_id: z.number().int().positive(),
  duplicate_of: z.null(),
  price_per: z.string().nullable(),
  price_is_discounted: z.boolean(),
  product: z
    .object({
      code: z.string(),
      product_quantity: z.number().positive().nullish(),
      product_quantity_unit: z.string().nullish(),
    })
    .nullable(),
  location: z.object({ osm_display_name: z.string().nullish() }).nullable(),
});

/** Retains proof-backed IDR observations without contributor identity or inferred units.
 * @param rows Untrusted provider records. @param today UTC cut-off; future dates are rejected.
 * O(n) validation and de-duplication. Package price is never silently used as a serving price.
 */
export function normalizePriceObservations(
  rows: unknown[],
  today: string,
): PriceObservation[] {
  const unique = new Map<number, PriceObservation>();
  for (const row of rows) {
    const parsed = providerRow.safeParse(row);
    if (!parsed.success) continue;
    const p = parsed.data;
    if (p.date > today || (p.product && p.product.code !== p.product_code))
      continue;
    const unit = p.product?.product_quantity_unit;
    unique.set(
      p.id,
      priceObservationSchema.parse({
        id: p.id,
        barcode: p.product_code,
        priceIdr: p.price,
        date: p.date,
        proofId: p.proof_id,
        sourceUrl: `https://prices.openfoodfacts.org/api/v1/prices/${p.id}`,
        location: p.location?.osm_display_name ?? "Lokasi tidak tersedia",
        packageQuantity: p.product?.product_quantity ?? null,
        packageUnit: unit === "g" || unit === "ml" ? unit : null,
        pricePer: p.price_per,
        discounted: p.price_is_discounted,
      }),
    );
  }
  return [...unique.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
  );
}
