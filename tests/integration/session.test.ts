import { test } from "node:test";
import assert from "node:assert/strict";
import { MongoClient, ObjectId } from "mongodb";
import { ensureIndexes, defaultHealth } from "../../src/core/db/collections";
import { findSessionUser } from "../../src/core/security/session-query";

test("session join immediately observes expiry, user deletion, profile changes and revocation", async () => {
  const client = await new MongoClient(
    process.env.MONGODB_URI ?? "mongodb://localhost:27017",
  ).connect();
  const db = client.db(`bongkar_session_test_${Date.now()}`);
  const now = new Date();
  const userId = new ObjectId();
  try {
    await ensureIndexes(db);
    await db.collection("users").insertOne({
      _id: userId,
      email: "session@test.invalid",
      name: "Test",
      role: "GUEST",
      passwordHash: "",
      healthProfile: defaultHealth,
      createdAt: now,
      profileVersion: 1,
    });
    await db.collection("sessions").insertMany([
      {
        tokenHash: "active",
        userId,
        expiresAt: new Date(now.getTime() + 60000),
      },
      { tokenHash: "expired", userId, expiresAt: now },
      {
        tokenHash: "orphan",
        userId: new ObjectId(),
        expiresAt: new Date(now.getTime() + 60000),
      },
    ]);
    assert.equal(
      (await findSessionUser(db, "active", now))?._id.toHexString(),
      userId.toHexString(),
    );
    assert.equal(await findSessionUser(db, "expired", now), null);
    assert.equal(await findSessionUser(db, "orphan", now), null);
    assert.equal(await findSessionUser(db, "unknown", now), null);
    await db
      .collection("users")
      .updateOne(
        { _id: userId },
        { $set: { "healthProfile.allergies": ["susu"] } },
      );
    assert.deepEqual(
      (await findSessionUser(db, "active", now))?.healthProfile.allergies,
      ["susu"],
    );
    await db.collection("sessions").deleteOne({ tokenHash: "active" });
    assert.equal(await findSessionUser(db, "active", now), null);
  } finally {
    await db.dropDatabase();
    await client.close();
  }
});
