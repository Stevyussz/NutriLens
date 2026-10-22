import { MongoClient, type Db } from "mongodb";
import { ensureIndexes } from "./collections";
const globalDb = globalThis as typeof globalThis & {
  mongoConnection?: Promise<MongoClient>;
  mongoIndexes?: Promise<void>;
};
/** Reuses a bounded connection pool and resets failed connection promises. O(1) after startup. */
export async function getDb(): Promise<Db> {
  if (!globalDb.mongoConnection) {
    globalDb.mongoConnection = new MongoClient(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017",
      {
        maxPoolSize: process.env.VERCEL === "1" ? 5 : 20,
        maxIdleTimeMS: 60000,
        serverSelectionTimeoutMS: 5000,
      },
    )
      .connect()
      .catch((error: unknown) => {
        globalDb.mongoConnection = undefined;
        throw error;
      });
  }
  const client = await globalDb.mongoConnection;
  const db = client.db(process.env.MONGODB_DB ?? "bongkar_label");
  globalDb.mongoIndexes ??= ensureIndexes(db).catch((error: unknown) => {
    globalDb.mongoIndexes = undefined;
    throw error;
  });
  await globalDb.mongoIndexes;
  return db;
}
