import http from "node:http";
import { mkdir, unlink, chmod } from "node:fs/promises";
const directory = "/run/router";
const socketPath = `${directory}/9router.sock`;
await mkdir(directory, { recursive: true, mode: 0o700 });
await unlink(socketPath).catch((error) => {
  if (error.code !== "ENOENT") throw error;
});
const server = http.createServer((request, response) => {
  if (!(
    (request.method === "POST" && request.url === "/v1/chat/completions") ||
    (request.method === "GET" && request.url === "/v1/models")
  )) {
    response.writeHead(404).end();
    return;
  }
  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: 20128,
      path: request.url,
      method: request.method,
      headers: { ...request.headers, host: "127.0.0.1:20128" },
      timeout: 60000,
    },
    (remote) => {
      response.writeHead(remote.statusCode || 502, remote.headers);
      remote.pipe(response);
      remote.on("error", () => response.destroy());
    },
  );
  upstream.on("timeout", () => upstream.destroy());
  upstream.on("error", () => {
    if (!response.headersSent)
      response
        .writeHead(502, { "content-type": "application/json" })
        .end('{"error":{"message":"Local AI unavailable"}}');
    else response.destroy();
  });
  request.on("aborted", () => upstream.destroy());
  response.on("close", () => upstream.destroy());
  request.pipe(upstream);
});
server.requestTimeout = 65000;
server.headersTimeout = 10000;
server.listen(socketPath, async () => {
  await chmod(socketPath, 0o600);
  console.log("Private AI socket ready; no TCP port opened.");
});
process.on("SIGTERM", () => server.close(() => process.exit(0)));
