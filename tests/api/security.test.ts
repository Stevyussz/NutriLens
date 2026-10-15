import { test } from "node:test";
import assert from "node:assert/strict";
import { MongoClient, ObjectId } from "mongodb";
import { randomBytes } from "node:crypto";
import { hashPassword, tokenHash } from "../../src/core/security/session";
import { defaultHealth } from "../../src/core/db/collections";
import { analysisSchema } from "../../src/core/analysis-schema";
import { presetProducts } from "../../src/core/db/presets";
const origin = process.env.TEST_BASE_URL ?? "http://localhost:3000";
test("HTTP auth, origin, limits, file signatures, cache personalization and explicit session expiry", async () => {
  const client = await new MongoClient(
    process.env.MONGODB_URI ?? "mongodb://localhost:27017",
  ).connect();
  const db = client.db(process.env.MONGODB_DB ?? "bongkar_label");
  const id = new ObjectId();
  const email = `api-test-${id}@test.invalid`;
  const password = randomBytes(20).toString("hex");
  const post = (
    path: string,
    body: unknown,
    cookie = "",
    customOrigin = origin,
  ) =>
    fetch(`${origin}${path}`, {
      method: "POST",
      headers: {
        origin: customOrigin,
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify(body),
    });
  try {
    assert.equal(
      (await post("/api/scan", { presetId: "fitgandum" })).status,
      401,
    );
    assert.equal(
      (await post("/api/auth/guest", {}, "", "https://untrusted.invalid"))
        .status,
      403,
    );
    await db.collection("users").insertOne({
      _id: id,
      email,
      name: "Automated API verification",
      passwordHash: hashPassword(password),
      role: "USER",
      healthProfile: defaultHealth,
      createdAt: new Date(),
      profileVersion: 1,
    });
    const login = await post("/api/auth/login", { email, password });
    assert.equal(login.status, 200);
    const setCookie = login.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    const cookie = setCookie.split(";")[0];
    const rawToken = cookie.split("=")[1];
    const session = await db.collection("sessions").findOne({ userId: id });
    assert.ok(session);
    assert.equal(session.tokenHash, tokenHash(rawToken));
    assert.notEqual(session.tokenHash, rawToken);
    assert.equal(
      (await post("/api/scan", { extra: "unknown" }, cookie)).status,
      400,
    );
    assert.equal(
      (await post("/api/scan", { text: "x".repeat(65000) }, cookie)).status,
      413,
    );
    const form = new FormData();
    form.set(
      "image",
      new Blob(["<html>this is not an actual PNG image</html>"], {
        type: "image/png",
      }),
      "renamed.png",
    );
    assert.equal(
      (
        await fetch(`${origin}/api/scan`, {
          method: "POST",
          headers: { origin, cookie },
          body: form,
        })
      ).status,
      415,
    );
    const original = await db
      .collection("products")
      .findOne({ barcode: "8998009010613" });
    const attempted = await post(
      "/api/scan",
      {
        product: {
          ...presetProducts()[0],
          barcode: "8998009010613",
          source: {
            kind: "OPEN_FOOD_FACTS",
            url: "https://world.openfoodfacts.org/product/8998009010613",
            retrievedAt: new Date().toISOString(),
            note: "forged provenance used only by security test",
          },
        },
      },
      cookie,
    );
    assert.equal(attempted.status, 200);
    const isolated = analysisSchema.parse(await attempted.json());
    assert.equal(isolated.extractedProductData.source.kind, "USER_INPUT");
    assert.notEqual(isolated.extractedProductData.barcode, "8998009010613");
    assert.equal(
      (await db.collection("products").findOne({ barcode: "8998009010613" }))
        ?.priceIdr,
      original?.priceIdr,
    );
    const first = await post("/api/scan", { presetId: "fitgandum" }, cookie);
    assert.equal(first.status, 200);
    analysisSchema.parse(await first.json());
    const cached = analysisSchema.parse(
      await (await post("/api/scan", { presetId: "fitgandum" }, cookie)).json(),
    );
    assert.equal(cached.cacheHit, true);
    const changed = await fetch(`${origin}/api/profile`, {
      method: "PATCH",
      headers: { origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ ...defaultHealth, allergies: ["gandum"] }),
    });
    assert.equal(changed.status, 200);
    const personalized = analysisSchema.parse(
      await (await post("/api/scan", { presetId: "fitgandum" }, cookie)).json(),
    );
    assert.equal(personalized.aiVerdict.medicalStatus, "HINDARI");
    assert.equal(personalized.cacheHit, false);
    assert.equal(
      (
        await post(
          "/api/auth/revoke",
          { sessionId: new ObjectId().toHexString() },
          cookie,
        )
      ).status,
      404,
    );
    await db
      .collection("sessions")
      .updateOne(
        { _id: session._id },
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );
    assert.equal(
      (await fetch(`${origin}/api/profile`, { headers: { cookie } })).status,
      401,
    );
    console.log(
      JSON.stringify({
        cacheHitExecutionMs: cached.executionTimeMs,
        expiryCheckedBeforeTTL: true,
        rawTokenStored: false,
      }),
    );
  } finally {
    await db.collection("sessions").deleteMany({ userId: id });
    await db.collection("users").deleteOne({ _id: id });
    await client.close();
  }
});
