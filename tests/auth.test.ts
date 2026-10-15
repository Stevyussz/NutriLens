import { test } from "node:test";
import assert from "node:assert/strict";
import {
  registrationSchema,
  authDestination,
} from "../src/core/security/auth-input";

test("registration rejects privilege injection, reserved guest emails and weak passwords", () => {
  const valid = {
    name: " Pengguna ",
    email: "User@Example.com",
    password: "long-passphrase-2026",
  };
  assert.equal(registrationSchema.parse(valid).email, "user@example.com");
  assert.equal(registrationSchema.parse(valid).name, "Pengguna");
  for (const invalid of [
    { ...valid, role: "ADMIN" },
    { ...valid, email: "guest@session.invalid" },
    { ...valid, password: "short" },
  ])
    assert.equal(registrationSchema.safeParse(invalid).success, false);
});

test("authentication only redirects to internal allowlisted destinations", () => {
  for (const external of [
    "https://foreign.invalid",
    "//foreign.invalid",
    "/\\foreign.invalid",
    "/api/auth/logout",
    ["/scanner"],
    undefined,
  ])
    assert.equal(authDestination(external), "/scanner");
  assert.equal(authDestination("/security-profile"), "/security-profile");
});
