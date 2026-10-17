import { z } from "zod";
export const researchSourceSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    url: z.string().url(),
    kind: z.enum(["MANUFACTURER", "CATALOGUE", "LIVE_CATALOGUE"]),
    match: z.enum(["BRAND_ONLY", "NAME_VARIANT", "NAME_ONLY"]),
    excerpt: z.string().max(1500),
    sourceDate: z.string().datetime().nullable(),
    checkedAt: z.string().datetime(),
    agreements: z.array(z.string()),
    differences: z.array(z.string()),
  })
  .strict();
export const productResearchSchema = z
  .object({
    checkedAt: z.string().datetime(),
    status: z.enum(["FOUND", "PARTIAL", "NOT_FOUND"]),
    sources: z.array(researchSourceSchema).max(6),
    warnings: z.array(z.string()).max(10),
    ai: z
      .object({
        mode: z.enum(["ROUTER_AI", "GEMINI", "DETERMINISTIC"]),
        selectedSourceIds: z.array(z.string()).max(6),
      })
      .strict(),
  })
  .strict();
export type ResearchSource = z.infer<typeof researchSourceSchema>;
