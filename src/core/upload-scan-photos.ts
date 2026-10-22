import { upload } from "@vercel/blob/client";
import { z } from "zod";
import { requestApi } from "./browser-api";

/** Local Docker keeps multipart transport; Vercel uploads directly to private storage. */
export async function preparePhotoRequest(
  form: FormData,
): Promise<FormData | string> {
  const config = await requestApi(
    "/api/scan-uploads",
    z.object({ enabled: z.boolean(), owner: z.string() }),
  );
  if (!config.enabled) return form;
  const paths: string[] = [];
  try {
    for (const entry of form.getAll("image")) {
      if (!(entry instanceof File)) throw new Error("Foto tidak valid.");
      const extension =
        entry.type === "image/png"
          ? "png"
          : entry.type === "image/webp"
            ? "webp"
            : "jpg";
      const pathname = `scans/${config.owner}/${crypto.randomUUID()}.${extension}`;
      paths.push(pathname);
      await upload(pathname, entry, {
        access: "private",
        handleUploadUrl: "/api/scan-uploads",
        contentType: entry.type || "image/jpeg",
      });
    }
    return JSON.stringify({ uploads: paths });
  } catch (error) {
    if (paths.length)
      await fetch("/api/scan-uploads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploads: paths }),
      }).catch(() => {});
    throw error;
  }
}
