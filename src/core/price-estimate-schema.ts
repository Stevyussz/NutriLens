import { z } from "zod";
export const priceEstimateSchema = z
  .object({
    mode: z.enum(["SOURCED_ESTIMATE", "AI_ESTIMATE", "UNAVAILABLE"]),
    lowIdr: z.number().positive().max(10000000).nullable(),
    highIdr: z.number().positive().max(10000000).nullable(),
    packageText: z.string().max(100),
    checkedAt: z.string().datetime(),
    internetStatus: z.enum(["CHECKED", "UNAVAILABLE", "NOT_ATTEMPTED"]),
    sources: z
      .array(
        z
          .object({
            url: z.string().url(),
            date: z.string().date(),
            priceIdr: z.number().positive(),
            location: z.string().max(500),
          })
          .strict(),
      )
      .max(5),
    note: z.string().max(1000),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.mode === "UNAVAILABLE"
        ? v.lowIdr !== null || v.highIdr !== null
        : v.lowIdr === null || v.highIdr === null || v.highIdr < v.lowIdr
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid price interval",
      });
    if ((v.mode === "SOURCED_ESTIMATE") !== v.sources.length > 0)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid price provenance",
      });
  });
export type PriceEstimate = z.infer<typeof priceEstimateSchema>;
