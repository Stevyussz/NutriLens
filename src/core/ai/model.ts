/** Uses the blueprint model by default; an operator may explicitly select an available replacement. */
export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}
