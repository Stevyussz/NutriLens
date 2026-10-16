import { access, cp, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { MongoClient } from "mongodb";
import { loadDataBundle } from "../src/core/db/data-quality";
import { seed } from "../src/core/db/seed";
const execute = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const storage = process.env.DATA_RUNTIME_DIRECTORY || "/var/lib/bongkar-data";
const daily = 24 * 3600000;

export async function refreshOnce(force = false) {
  const client = await new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017",
    { serverSelectionTimeoutMS: 5000 },
  ).connect();
  const db = client.db(process.env.MONGODB_DB || "bongkar_label");
  const state = db.collection("dataset_state");
  let stage: string | undefined;
  const owner = crypto.randomUUID();
  try {
    const previous = await state.findOne({ key: "refresh" });
    if (
      !force &&
      previous?.nextAttemptAt instanceof Date &&
      previous.nextAttemptAt.getTime() > Date.now()
    )
      return;
    const lock = await state
      .updateOne(
        {
          key: "refresh-lock",
          $or: [{ expiresAt: { $lt: new Date() } }, { owner }],
        },
        { $set: { owner, expiresAt: new Date(Date.now() + 45 * 60000) } },
        { upsert: true },
      )
      .catch(() => null);
    if (!lock) return;
    await state.updateOne(
      { key: "refresh" },
      { $set: { status: "RUNNING", lastAttemptAt: new Date() } },
      { upsert: true },
    );
    await mkdir(storage, { recursive: true });
    stage = await mkdtemp(join(storage, "pending-"));
    const work = join(stage, "work");
    await mkdir(work);
    const current = join(storage, "current");
    const initial = await access(current)
      .then(() => current)
      .catch(() => join(root, "data"));
    await cp(initial, join(work, "data"), { recursive: true });
    const original = await loadDataBundle(join(work, "data"));
    const run = async (name: string) => {
      try {
        await execute(
          process.execPath,
          [
            "--import",
            join(root, "node_modules/tsx/dist/loader.mjs"),
            join(root, "scripts", name),
          ],
          { cwd: work, timeout: 600000, maxBuffer: 64000 },
        );
      } catch {
        throw Error(`${name}: provider download or validation failed`);
      }
    };
    const downloads = await Promise.allSettled([
      run("import-catalogue.ts"),
      run("import-dictionary.ts"),
    ]);
    const failed = downloads.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    await run("import-prices.ts");
    const next = await loadDataBundle(join(work, "data"));
    if (
      new URL(next.manifests.catalogue.sourceUrl).hostname !==
      "world.openfoodfacts.org"
    )
      throw Error("Production source required");
    if (
      next.catalogue.length < original.catalogue.length * 0.8 ||
      next.dictionary.length < original.dictionary.length * 0.8 ||
      next.products.length < original.products.length * 0.8
    )
      throw Error("Unexpected coverage decrease; operator review required");
    await seed(join(work, "data"));
    const previousDirectory = join(storage, "previous");
    await rm(previousDirectory, { recursive: true, force: true });
    await rename(current, previousDirectory).catch(() => {});
    await rename(join(work, "data"), current);
    await rm(previousDirectory, { recursive: true, force: true });
    await state.updateOne(
      { key: "refresh" },
      {
        $set: {
          status: "SUCCESS",
          lastSuccessAt: new Date(),
          nextAttemptAt: new Date(Date.now() + daily),
          error: null,
        },
      },
      { upsert: true },
    );
    console.log(
      JSON.stringify({
        event: "data-refresh",
        status: "SUCCESS",
        catalogue: next.catalogue.length,
        references: next.products.length,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 200)
        : "Provider refresh failed";
    await state.updateOne(
      { key: "refresh" },
      {
        $set: {
          status: "FAILED",
          error: message,
          nextAttemptAt: new Date(Date.now() + 3600000),
        },
      },
      { upsert: true },
    );
    console.log(
      JSON.stringify({
        event: "data-refresh",
        status: "FAILED",
        reason: message,
      }),
    );
    if (process.argv.includes("--once")) process.exitCode = 1;
  } finally {
    if (stage) await rm(stage, { recursive: true, force: true });
    await state.deleteOne({ key: "refresh-lock", owner });
    await client.close();
  }
}
async function main() {
  do {
    try {
      await refreshOnce(process.argv.includes("--force"));
    } catch {
      console.log(
        JSON.stringify({
          event: "data-refresh",
          status: "DATABASE_UNAVAILABLE",
        }),
      );
      if (process.argv.includes("--once")) process.exitCode = 1;
    }
    if (process.argv.includes("--once")) break;
    await new Promise((resolve) => setTimeout(resolve, 60000));
  } while (true);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  void main();
