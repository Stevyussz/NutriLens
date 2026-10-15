import { HttpError } from "./http";
/** Verifies signature, size and closing structure; image bytes remain untrusted, never executed.
 * @param bytes Uploaded bytes. O(1) signature and structure checks; size capped at 5 MiB.
 */
export function validateImage(
  bytes: Uint8Array,
): "image/jpeg" | "image/png" | "image/webp" {
  if (bytes.length < 24 || bytes.length > 5 * 1024 * 1024)
    throw new HttpError(400, "Gambar harus berukuran 24 byte sampai 5 MB.");
  const b = Buffer.from(bytes);
  if (
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    b
      .subarray(-12)
      .equals(Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]))
  )
    return "image/png";
  if (
    b[0] === 255 &&
    b[1] === 216 &&
    b[2] === 255 &&
    b.at(-2) === 255 &&
    b.at(-1) === 217
  )
    return "image/jpeg";
  if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP" &&
    b.readUInt32LE(4) + 8 === b.length &&
    ["VP8 ", "VP8L", "VP8X"].includes(b.toString("ascii", 12, 16))
  )
    return "image/webp";
  throw new HttpError(415, "Isi file bukan JPEG, PNG, atau WEBP yang valid.");
}
