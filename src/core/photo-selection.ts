import { MAX_SCAN_PHOTOS, MAX_SCAN_PHOTO_BYTES } from "./scan-photo-limits";

export type PhotoSelection = { files: File[]; error: string };
type PhotoAction =
  | { type: "add"; files: File[] }
  | { type: "remove"; index: number }
  | { type: "reset" };

/** Camera and gallery additions are validated against the latest selection. */
export function photoSelectionReducer(
  state: PhotoSelection,
  action: PhotoAction,
): PhotoSelection {
  if (action.type === "reset") return { files: [], error: "" };
  if (action.type === "remove")
    return {
      files: state.files.filter((_, i) => i !== action.index),
      error: "",
    };
  if (!action.files.length) return state;
  const remaining = MAX_SCAN_PHOTOS - state.files.length;
  if (action.files.length > remaining)
    return {
      files: state.files,
      error: `Maksimal ${MAX_SCAN_PHOTOS} foto. ${remaining > 0 ? `Masih muat ${remaining} foto; pilih lebih sedikit untuk ditambahkan.` : "Pilihan sudah penuh. Buang foto yang ingin diganti."} Foto sebelumnya tetap tersimpan.`,
    };
  const unsupported = action.files.find(
    (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type),
  );
  const invalidSize = action.files.find(
    (file) => !file.size || file.size > MAX_SCAN_PHOTO_BYTES,
  );
  const invalid = unsupported ?? invalidSize;
  if (invalid)
    return {
      files: state.files,
      error: `${invalid.name.slice(0, 80)}: ${unsupported ? "gunakan JPEG, PNG, atau WEBP." : "ukuran harus lebih dari 0 dan maksimal 5 MB."} Foto sebelumnya tetap tersimpan.`,
    };
  return { files: [...state.files, ...action.files], error: "" };
}
