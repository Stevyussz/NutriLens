import { z } from "zod";
export const verdictSchema = z
  .object({
    claimStatus: z.enum([
      "VALID",
      "GIMMICK_MARKETING",
      "OVERCLAIM_BAHAYA",
      "TIDAK_DAPAT_DIVERIFIKASI",
    ]),
    medicalStatus: z.enum(["AMAN", "WASPADA", "HINDARI"]),
    explanation: z.string().min(1).max(4000),
    selectedCandidateIds: z.array(z.string().max(120)).max(3),
    fallbackSuggestions: z
      .array(
        z
          .object({
            name: z.string().max(200),
            estimatedPriceIdr: z.number().positive(),
            estimatedSugarGrams: z.number().nonnegative(),
            estimatedProteinGrams: z.number().nonnegative(),
            note: z.string().max(1000),
          })
          .strict(),
      )
      .max(3),
  })
  .strict();
export type Verdict = z.infer<typeof verdictSchema>;
