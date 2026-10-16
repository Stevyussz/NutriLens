import { z } from "zod";
import type { ObjectId, Db } from "mongodb";

export const categorySchema = z.enum([
  "MINUMAN_KEMASAN",
  "SEREAL_SARAPAN",
  "MI_INSTAN",
  "SUSU_OLAHAN",
  "CAMILAN_BISKUIT",
  "BAHAN_POKOK",
  "BUMBU_SAUS",
  "ROTI_KUE",
  "DAGING_IKAN",
  "MAKANAN_SIAP_SAJI",
  "LAINNYA",
]);
export const functionalSchema = z.enum([
  "HIDDEN_SUGAR",
  "SODIUM_ADDITIVE",
  "ARTIFICIAL_SWEETENER",
  "PRESERVATIVE",
  "COLORANT",
  "EMULSIFIER",
  "WHOLE_FOOD",
  "UNKNOWN",
]);
export const nutritionSchema = z
  .object({
    caloriesKcal: z.number().min(0).max(10000),
    sugarGrams: z.number().min(0).max(1000),
    proteinGrams: z.number().min(0).max(1000),
    sodiumMg: z.number().min(0).max(100000),
    saturatedFatGrams: z.number().min(0).max(1000),
    fiberGrams: z.number().min(0).max(1000),
  })
  .strict();
export const ingredientSchema = z
  .object({
    orderIndex: z.number().int().nonnegative(),
    rawName: z.string().min(1).max(300),
    canonicalChemicalName: z.string().max(300),
    explicitPercentage: z.number().min(0).max(100).nullable(),
    functionalCategory: functionalSchema,
  })
  .strict();
export const sourceSchema = z
  .object({
    kind: z.enum([
      "LABEL",
      "OPEN_FOOD_FACTS",
      "USER_INPUT",
      "AI_ESTIMATE",
      "ILLUSTRATIVE_CASE",
    ]),
    url: z.string().url().nullable(),
    retrievedAt: z.string().datetime(),
    note: z.string().max(3000),
  })
  .strict();
export const productSchema = z
  .object({
    barcode: z.string().min(1).max(120),
    name: z.string().min(1).max(250),
    brand: z.string().max(150),
    category: categorySchema,
    priceIdr: z.number().positive().max(10000000),
    servingSizeGrams: z.number().positive().max(10000),
    flavorTags: z.array(z.string().min(1).max(80)).max(30),
    nutrition: nutritionSchema,
    novaGroup: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    marketingClaims: z.array(z.string().max(300)).max(30),
    orderedIngredients: z.array(ingredientSchema).min(1).max(150),
    source: sourceSchema,
    priceSource: z.enum(["USER_INPUT", "RETAILER", "ESTIMATE"]),
    priceSourceUrl: z.string().url().nullable(),
  })
  .strict();
export const healthSchema = z
  .object({
    conditions: z.array(z.enum(["GERD", "HIPERTENSI", "DIABETES"])).max(3),
    allergies: z.array(z.string().min(1).max(80)).max(30),
    dailySugarLimitGrams: z.number().positive().max(500),
    dailySodiumLimitMg: z.number().positive().max(10000),
    maxSnackBudgetIdr: z.number().positive().max(1000000),
  })
  .strict();
export const chemicalSchema = z
  .object({
    canonicalName: z.string(),
    insOrECode: z.string(),
    aliases: z.array(z.string()),
    functionalCategory: functionalSchema,
    glycemicIndex: z.number().min(0).max(150).nullable(),
    riskLevel: z.enum(["LOW", "MODERATE", "HIGH"]),
    triggersConditions: z.array(z.string()),
    plainExplanation: z.string(),
    sourceUrl: z.string().url(),
    provider: z
      .object({
        id: z.string(),
        url: z.string().url(),
        retrievedAt: z.string().datetime(),
      })
      .strict()
      .optional(),
    providerDetails: z
      .object({
        description: z.string().max(5000).nullable(),
        functions: z.array(z.string().max(150)).max(40),
        wikidata: z
          .string()
          .regex(/^Q\d+$/)
          .nullable(),
        ciqualCode: z.string().max(50).nullable(),
        usdaFdcCode: z.string().max(50).nullable(),
        efsa: z
          .object({
            title: z.string().max(1000),
            url: z.string().url(),
            date: z.string().max(50).nullable(),
          })
          .strict()
          .nullable(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type Product = z.infer<typeof productSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type Chemical = z.infer<typeof chemicalSchema>;
export type HealthProfile = z.infer<typeof healthSchema>;
export type User = {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  role: "USER" | "GUEST";
  healthProfile: HealthProfile;
  createdAt: Date;
  profileVersion: number;
};
export type Session = {
  _id: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  userAgent: string;
  ipAddress: string;
  createdAt: Date;
  expiresAt: Date;
};
export const defaultHealth: HealthProfile = {
  conditions: [],
  allergies: [],
  dailySugarLimitGrams: 50,
  dailySodiumLimitMg: 2000,
  maxSnackBudgetIdr: 10000,
};

/** Creates five collection index sets, including token TTL. O(k) index commands, k is fixed. */
export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("dataset_state").createIndex({ key: 1 }, { unique: true }),
    db
      .collection("product_catalogue")
      .createIndex({ providerCode: 1 }, { unique: true }),
    db
      .collection("product_catalogue")
      .createIndex({ referenceEligible: -1, name: 1 }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ userId: 1 }),
    db
      .collection("sessions")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db
      .collection("chemical_dictionary")
      .createIndex({ canonicalName: 1 }, { unique: true }),
    db.collection("chemical_dictionary").createIndex({ aliases: 1 }),
    db.collection("products").createIndex({ barcode: 1 }, { unique: true }),
    db
      .collection("products")
      .createIndex({ category: 1, priceIdr: 1, "nutrition.sugarGrams": 1 }),
    db.collection("products").createIndex({ flavorTags: 1 }),
    db
      .collection("scan_caches")
      .createIndex({ payloadSha256: 1 }, { unique: true }),
    db
      .collection("scan_caches")
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 }),
  ]);
}
