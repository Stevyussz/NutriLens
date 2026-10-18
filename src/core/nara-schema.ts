import { z } from "zod";
export const naraTopics = [
  "sugar",
  "profile",
  "sodium",
  "portion",
  "energy",
  "fat",
  "protein",
  "fiber",
  "ingredients",
  "allergy",
  "decision",
  "sources",
  "limits",
] as const;
export const naraTopicSchema = z.enum(naraTopics);
export const naraRequestSchema = z
  .object({
    purpose: z.enum(["chat", "brief"]).default("chat"),
    historyId: z.string().regex(/^[a-f0-9]{24}$/),
    question: z.string().trim().min(3).max(500),
    conversation: z
      .array(
        z
          .object({
            question: z.string().trim().min(3).max(500),
            answer: z.string().max(4500),
          })
          .strict(),
      )
      .max(6)
      .default([]),
    previousTopics: z.array(naraTopicSchema).max(3).default([]),
  })
  .strict();
export const naraAnswerSchema = z.object({
  mode: z.enum(["AI_GUIDED", "LABEL_FACTS", "LIMITED", "PRICE_ESTIMATE"]),
  paragraphs: z.array(z.string().min(1).max(1500)).min(1).max(3),
  topics: z.array(naraTopicSchema).max(3),
  followUps: z.array(z.string().min(3).max(120)).max(3).default([]),
  productName: z.string().max(500),
});
export type NaraAnswer = z.infer<typeof naraAnswerSchema>;
