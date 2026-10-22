import { HttpError } from "./http";
const windows = new Map<string, number[]>();
let lastSweep = 0;
/** Exact sliding window per process; bounded key count prevents unbounded attacker memory.
 * @param key Route + IP or authenticated ID. @param limit Allowed hits per window.
 * O(h+k) on sweep, O(h) otherwise, h<=limit and k<=10000. Deploy a single app replica.
 */
export function enforceRateLimit(
  key: string,
  limit = 20,
  windowMs = 60000,
): void {
  const now = Date.now();
  if (now - lastSweep > 60000) {
    for (const [k, hits] of windows)
      if ((hits.at(-1) ?? 0) < now - 3600000) windows.delete(k);
    lastSweep = now;
  }
  const recent = (windows.get(key) ?? []).filter((t) => t > now - windowMs);
  if (recent.length >= limit || (!windows.has(key) && windows.size >= 10000))
    throw new HttpError(
      429,
      "Terlalu banyak permintaan. Tunggu satu menit lalu coba lagi.",
    );
  recent.push(now);
  windows.set(key, recent);
}
export function requestIp(request: Request): string {
  return process.env.TRUST_PROXY === "true" || process.env.VERCEL === "1"
    ? (request.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim()
        .slice(0, 80) ?? "unknown")
    : "direct";
}
