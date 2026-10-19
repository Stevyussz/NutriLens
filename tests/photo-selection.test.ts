import { test } from "node:test";
import assert from "node:assert/strict";
import {
  photoSelectionReducer,
  type PhotoSelection,
} from "../src/core/photo-selection";
const image = (name: string) =>
  new File(["image fixture"], name, { type: "image/jpeg" });
const empty = (): PhotoSelection => ({ files: [], error: "" });

test("queued camera and gallery additions retain the latest six files instead of truncating silently", () => {
  const first = Array.from({ length: 5 }, (_, i) => image(`side-${i}.jpg`));
  const camera = image("camera.jpg"),
    gallery = image("gallery.jpg");
  let state = photoSelectionReducer(empty(), { type: "add", files: first });
  state = photoSelectionReducer(state, { type: "add", files: [camera] });
  const rejected = photoSelectionReducer(state, {
    type: "add",
    files: [gallery],
  });
  assert.deepEqual(rejected.files, [...first, camera]);
  assert.strictEqual(rejected.files, state.files);
  assert.match(rejected.error, /Pilihan sudah penuh/);
  const removed = photoSelectionReducer(rejected, { type: "remove", index: 2 });
  const replaced = photoSelectionReducer(removed, {
    type: "add",
    files: [gallery],
  });
  assert.deepEqual(replaced.files, [
    first[0],
    first[1],
    first[3],
    first[4],
    camera,
    gallery,
  ]);
  assert.equal(replaced.error, "");
});
test("invalid gallery batches preserve earlier photos, identify the failing file and can be retried", () => {
  const state = photoSelectionReducer(empty(), {
    type: "add",
    files: [image("front.jpg")],
  });
  for (const invalid of [
    new File(["bad"], "unsupported.heic", { type: "image/heic" }),
    new File([], "empty.jpg", { type: "image/jpeg" }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
      type: "image/jpeg",
    }),
  ]) {
    const rejected = photoSelectionReducer(state, {
      type: "add",
      files: [image("valid.jpg"), invalid],
    });
    assert.strictEqual(rejected.files, state.files);
    assert.ok(rejected.error.includes(invalid.name));
    assert.match(rejected.error, /sebelumnya tetap tersimpan/);
    const retried = photoSelectionReducer(rejected, {
      type: "add",
      files: [image("replacement.jpg")],
    });
    assert.equal(retried.files.length, 2);
    assert.equal(retried.error, "");
  }
});
test("capacity guidance works for an empty selection and reset removes stale errors", () => {
  const start = empty();
  assert.strictEqual(
    photoSelectionReducer(start, { type: "add", files: [] }),
    start,
  );
  const rejected = photoSelectionReducer(start, {
    type: "add",
    files: Array.from({ length: 7 }, () => image("side.jpg")),
  });
  assert.match(rejected.error, /Masih muat 6 foto; pilih lebih sedikit/);
  assert.doesNotMatch(rejected.error, /Buang/);
  assert.deepEqual(photoSelectionReducer(rejected, { type: "reset" }), empty());
});
