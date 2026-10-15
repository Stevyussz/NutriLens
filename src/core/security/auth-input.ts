import { z } from "zod";
export const registrationSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    email: z
      .string()
      .trim()
      .email()
      .max(250)
      .transform((value) => value.toLowerCase())
      .refine((value) => !value.endsWith("@session.invalid")),
    password: z.string().min(12).max(128),
  })
  .strict();

export function authDestination(value: unknown): string {
  return typeof value === "string" &&
    ["/scanner", "/dictionary", "/security-profile"].includes(value)
    ? value
    : "/scanner";
}
