import { request } from "node:http";
/** Private filesystem transport: no host TCP listener or published router port. */
export function requestViaSocket(
  socketPath: string,
  path: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number,
): Promise<Response> {
  if (!socketPath.startsWith("/"))
    throw new Error("Router socket must be absolute");
  return new Promise((resolve, reject) => {
    const req = request(
      {
        socketPath,
        path,
        method: "POST",
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2000000) {
            req.destroy(new Error("Router response too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve(
            new Response(Buffer.concat(chunks).toString("utf8"), {
              status: res.statusCode || 502,
            }),
          ),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}
