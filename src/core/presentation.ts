import type { Chemical } from "./db/collections";
import type { Verdict } from "./verdict-schema";

export const claimStatusLabels: Record<Verdict["claimStatus"], string> = {
  VALID: "Didukung data yang tersedia",
  GIMMICK_MARKETING: "Klaim pemasaran perlu dicermati",
  OVERCLAIM_BAHAYA: "Klaim berlebihan menurut analisis",
  TIDAK_DAPAT_DIVERIFIKASI: "Belum dapat diverifikasi",
};

export const profileStatusLabels: Record<Verdict["medicalStatus"], string> = {
  AMAN: "Tidak ada aturan profil yang terpicu",
  WASPADA: "Perlu dicermati untuk profil Anda",
  HINDARI: "Hindari sesuai batas profil Anda",
};

export const ingredientFunctionLabels: Record<
  Chemical["functionalCategory"],
  string
> = {
  HIDDEN_SUGAR: "Sumber gula",
  SODIUM_ADDITIVE: "Bahan penyumbang natrium",
  ARTIFICIAL_SWEETENER: "Pemanis buatan",
  PRESERVATIVE: "Pengawet",
  COLORANT: "Pewarna",
  EMULSIFIER: "Pengemulsi",
  WHOLE_FOOD: "Bahan pangan",
  UNKNOWN: "Fungsi belum dipetakan",
};

/** Gives a readable browser/platform hint from user-supplied metadata, never verified identity.
 * @param agent Stored user-agent string. O(n) matching against a fixed set of patterns.
 */
export function deviceDescription(agent: string): string {
  const browser = /Edg\//.test(agent)
    ? "Microsoft Edge"
    : /Firefox\//.test(agent)
      ? "Firefox"
      : /Chrome\/|CriOS\//.test(agent)
        ? "Chrome"
        : /Safari\//.test(agent)
          ? "Safari"
          : "Browser";
  const platform = /Android/i.test(agent)
    ? "Android"
    : /iPhone|iPad/i.test(agent)
      ? "iOS"
      : /Windows/i.test(agent)
        ? "Windows"
        : /Macintosh|Mac OS X/i.test(agent)
          ? "macOS"
          : /Linux/i.test(agent)
            ? "Linux"
            : "perangkat ini";
  return `${browser} di ${platform}`;
}
