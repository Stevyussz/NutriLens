import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const rupiah = (value: number | null) =>
  value === null
    ? "Belum diisi"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(value);
export const decimal = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);
