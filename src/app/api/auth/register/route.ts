import { NextResponse } from "next/server";
import { MongoServerError, ObjectId } from "mongodb";
import { getDb } from "@/core/db/client";
import { defaultHealth, type User } from "@/core/db/collections";
import { registrationSchema } from "@/core/security/auth-input";
import {
  createSession,
  hashPassword,
  requireUser,
} from "@/core/security/session";
import {
  assertOrigin,
  apiError,
  HttpError,
  readJson,
} from "@/core/security/http";
import { enforceRequestLimit } from "@/core/security/shared-rate-limiter";
import { requestIp } from "@/core/security/rate-limiter";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await enforceRequestLimit(`register:${requestIp(request)}`, 5);
    const input = registrationSchema.parse(await readJson(request));
    let current: User | null = null;
    try {
      current = await requireUser();
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 401)) throw error;
    }
    if (current?.role === "USER")
      throw new HttpError(
        409,
        "Anda sudah masuk. Akhiri sesi sebelum membuat akun lain.",
      );
    const db = await getDb();
    const passwordHash = hashPassword(input.password);
    const id = current?._id ?? new ObjectId();
    if (current) {
      const result = await db
        .collection<User>("users")
        .updateOne(
          { _id: id, role: "GUEST" },
          {
            $set: {
              name: input.name,
              email: input.email,
              passwordHash,
              role: "USER",
            },
            $inc: { profileVersion: 1 },
          },
        );
      if (!result.matchedCount)
        throw new HttpError(409, "Sesi berubah. Muat ulang sebelum mendaftar.");
    } else {
      await db.collection<User>("users").insertOne({
        _id: id,
        name: input.name,
        email: input.email,
        passwordHash,
        role: "USER",
        healthProfile: structuredClone(defaultHealth),
        createdAt: new Date(),
        profileVersion: 1,
      });
    }
    await createSession(id, request);
    return NextResponse.json(
      { success: true, redirect: "/security-profile" },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000)
      return apiError(
        new HttpError(
          409,
          "Email sudah digunakan. Masuk dengan akun tersebut atau gunakan email lain.",
        ),
      );
    return apiError(error);
  }
}
