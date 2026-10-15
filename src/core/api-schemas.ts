import { z } from "zod";
import { chemicalSchema, healthSchema } from "./db/collections";
export const profileOutputSchema = z
  .object({
    name: z.string(),
    role: z.enum(["USER", "GUEST"]),
    healthProfile: healthSchema,
    profileVersion: z.number(),
  })
  .strict();
export const presetOutputSchema = z
  .object({
    presets: z.array(
      z
        .object({ id: z.string(), name: z.string(), description: z.string() })
        .strict(),
    ),
    aiAvailable: z.boolean(),
  })
  .strict();
export const dictionaryOutputSchema = z
  .object({
    entries: z.array(chemicalSchema),
    total: z.number(),
    page: z.number(),
    pages: z.number(),
  })
  .strict();
export const auditOutputSchema = z
  .object({
    sessions: z.array(
      z
        .object({
          id: z.string(),
          userAgent: z.string(),
          createdAt: z.string(),
          expiresAt: z.string(),
          current: z.boolean(),
        })
        .strict(),
    ),
    database: z
      .object({
        products: z.number(),
        chemicals: z.number(),
        cachedScans: z.number(),
        pingMs: z.number(),
        indexes: z.array(
          z
            .object({
              collection: z.string(),
              name: z.string(),
              ttl: z.number().nullable(),
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();
