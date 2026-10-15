import { test } from "node:test";
import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
import { randomBytes } from "node:crypto";
import { tokenHash, verifyPassword } from "../../src/core/security/session";
import { defaultHealth } from "../../src/core/db/collections";

test("guest registration preserves profile, rotates session and supports persistent login without raw credentials", async () => {
  const origin = process.env.TEST_BASE_URL ?? "http://localhost:3000";
  const client = await new MongoClient(
    process.env.MONGODB_URI ?? "mongodb://localhost:27017",
  ).connect();
  const db = client.db(process.env.MONGODB_DB ?? "bongkar_label");
  const email = `account-${randomBytes(10).toString("hex")}@test.invalid`;
  const password = randomBytes(20).toString("hex");
  let ownerId;
  const post = (
    path: string,
    body: unknown,
    cookie = "",
    requestOrigin = origin,
  ) =>
    fetch(origin + path, {
      method: "POST",
      headers: {
        origin: requestOrigin,
        cookie,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  try {
    assert.equal(
      (await post("/api/auth/register", {}, "", "https://foreign.invalid"))
        .status,
      403,
    );
    assert.equal(
      (
        await post("/api/auth/register", {
          name: "Test",
          email,
          password: "short",
        })
      ).status,
      400,
    );
    const guest = await post("/api/auth/guest", {});
    const previousCookie = guest.headers.get("set-cookie")?.split(";")[0] ?? "";
    const previousSession = await db
      .collection("sessions")
      .findOne({ tokenHash: tokenHash(previousCookie.split("=")[1]) });
    assert.ok(previousSession);
    ownerId = previousSession.userId;
    const health = {
      ...defaultHealth,
      allergies: ["susu"],
      maxSnackBudgetIdr: 7800,
    };
    assert.equal(
      (
        await fetch(origin + "/api/profile", {
          method: "PATCH",
          headers: {
            origin,
            cookie: previousCookie,
            "content-type": "application/json",
          },
          body: JSON.stringify(health),
        })
      ).status,
      200,
    );
    const registered = await post(
      "/api/auth/register",
      { name: "Test Account", email: email.toUpperCase(), password },
      previousCookie,
    );
    assert.equal(registered.status, 201);
    const cookie = registered.headers.get("set-cookie")?.split(";")[0] ?? "";
    assert.notEqual(cookie, previousCookie);
    assert.match(registered.headers.get("set-cookie") ?? "", /HttpOnly/i);
    const user = await db.collection("users").findOne({ email });
    assert.ok(user);
    assert.equal(user._id.toString(), String(ownerId));
    assert.equal(user.role, "USER");
    assert.notEqual(user.passwordHash, password);
    assert.equal(verifyPassword(password, user.passwordHash), true);
    assert.deepEqual(user.healthProfile, health);
    assert.equal(
      (
        await fetch(origin + "/api/profile", {
          headers: { cookie: previousCookie },
        })
      ).status,
      401,
    );
    assert.equal(
      (await post("/api/auth/register", { name: "Other", email, password }))
        .status,
      409,
    );
    assert.equal(
      (
        await post(
          "/api/auth/register",
          { name: "Other", email: `other-${email}`, password },
          cookie,
        )
      ).status,
      409,
    );
    assert.equal((await post("/api/auth/logout", {}, cookie)).status, 200);
    assert.equal(
      (await post("/api/auth/login", { email, password: "incorrect-password" }))
        .status,
      401,
    );
    const login = await post("/api/auth/login", { email, password });
    assert.equal(login.status, 200);
    const newCookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
    const profile = await (
      await fetch(origin + "/api/profile", { headers: { cookie: newCookie } })
    ).json();
    assert.deepEqual(profile.healthProfile, health);
    const guarded = await fetch(origin + "/login", {
      headers: { cookie: newCookie },
      redirect: "manual",
    });
    assert.equal(guarded.status, 307);
    assert.equal(guarded.headers.get("location"), "/scanner");
  } finally {
    if (ownerId) {
      await db.collection("sessions").deleteMany({ userId: ownerId });
      await db.collection("users").deleteOne({ _id: ownerId });
    }
    await client.close();
  }
});
