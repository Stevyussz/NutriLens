import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requestViaSocket } from "../src/core/ai/router-transport";
test("private socket preserves authentication and body, and bounds stalled provider requests", async () => {
  const dir = await mkdtemp(join(tmpdir(), "bongkar-socket-test-"));
  const socket = join(dir, "router.sock");
  let received = "";
  const server = http.createServer((req, res) => {
    if (req.url === "/slow") return;
    assert.equal(req.headers.authorization, "Bearer fixture-only");
    req.on("data", (chunk) => (received += chunk));
    req.on("end", () =>
      res
        .writeHead(200, { "content-type": "application/json" })
        .end('{"ok":true}'),
    );
  });
  await new Promise<void>((resolve) => server.listen(socket, resolve));
  try {
    const response = await requestViaSocket(
      socket,
      "/v1/chat/completions",
      {
        Authorization: "Bearer fixture-only",
        "Content-Type": "application/json",
      },
      '{"model":"fixture"}',
      1000,
    );
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(received, '{"model":"fixture"}');
    await assert.rejects(requestViaSocket(socket, "/slow", {}, "{}", 30));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  }
});
