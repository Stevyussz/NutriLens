import { test } from "node:test";
import assert from "node:assert/strict";
import { assertOrigin } from "../src/core/security/http";
import { isOwnedUploadPath, uploadPathsSchema } from "../src/core/scan-uploads";

test("private photo references reject other owners, URLs, traversal, duplicates and excessive counts", () => {
  const owner = "0123456789abcdef01234567";
  const path = `scans/${owner}/12345678-abcd-abcd-abcd-123456789abc.png`;
  assert.ok(isOwnedUploadPath(path, owner));
  assert.ok(!isOwnedUploadPath(path, "aaaaaaaaaaaaaaaaaaaaaaaa"));
  for (const value of [
    `https://host/${path}`,
    `${path}/../x`,
    `${path}?x=y`,
    `scans/${owner}/evil.svg`,
  ]) {
    assert.ok(!isOwnedUploadPath(value, owner));
  }
  assert.ok(!uploadPathsSchema.safeParse({ uploads: [path, path] }).success);
  assert.ok(!uploadPathsSchema.safeParse({ uploads: [] }).success);
  assert.ok(
    !uploadPathsSchema.safeParse({
      uploads: Array.from({ length: 7 }, (_, i) => `${path}${i}`),
    }).success,
  );
});

test("Vercel origins come only from configured exact platform hosts, never request headers", () => {
  const names = [
    "VERCEL",
    "VERCEL_URL",
    "VERCEL_BRANCH_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "APP_ORIGIN",
  ];
  const saved = names.map((name) => process.env[name]);
  try {
    process.env.VERCEL = "1";
    process.env.VERCEL_URL = "bongkar-check.vercel.app";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "bongkarlabel.vercel.app";
    process.env.VERCEL_BRANCH_URL = "bad.invalid/path";
    delete process.env.APP_ORIGIN;
    const request = (origin: string) =>
      new Request("https://bongkar-check.vercel.app/api/scan", {
        headers: { origin, "x-forwarded-host": "attacker.invalid" },
      });
    assert.doesNotThrow(() =>
      assertOrigin(request("https://bongkar-check.vercel.app")),
    );
    assert.doesNotThrow(() =>
      assertOrigin(request("https://bongkarlabel.vercel.app")),
    );
    for (const origin of [
      "http://bongkar-check.vercel.app",
      "https://attacker.invalid",
      "https://bongkarlabel.vercel.app.evil.invalid",
      "https://bad.invalid",
      "http://localhost:3000",
    ])
      assert.throws(() => assertOrigin(request(origin)));
    delete process.env.VERCEL;
    assert.throws(() =>
      assertOrigin(request("https://bongkar-check.vercel.app")),
    );
  } finally {
    names.forEach((name, i) => {
      if (saved[i] === undefined) delete process.env[name];
      else process.env[name] = saved[i];
    });
  }
});
