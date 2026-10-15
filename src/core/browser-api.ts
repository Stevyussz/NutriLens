import { z } from "zod";
export async function requestApi<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const err = z.object({ error: z.string() }).safeParse(data);
    throw new Error(
      err.success ? err.data.error : "Permintaan gagal. Silakan coba lagi.",
    );
  }
  return schema.parse(data);
}
export const successSchema = z.object({
  success: z.boolean(),
  redirect: z.string().optional(),
  revokedCurrent: z.boolean().optional(),
});
