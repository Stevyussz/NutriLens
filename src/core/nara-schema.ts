import { z } from "zod";
export const naraTopics = [
  "sugar",
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
    historyId: z.string().regex(/^[a-f0-9]{24}$/),
    question: z.string().trim().min(3).max(500),
    previousTopics: z.array(naraTopicSchema).max(3).default([]),
  })
  .strict();
export const naraAnswerSchema = z.object({
  mode: z.enum(["AI_GUIDED", "LABEL_FACTS", "LIMITED"]),
  paragraphs: z.array(z.string().min(1).max(1500)).min(1).max(3),
  topics: z.array(naraTopicSchema).max(3),
  productName: z.string().max(500),
});
export type NaraAnswer = z.infer<typeof naraAnswerSchema>;
