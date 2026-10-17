"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { requestApi } from "@/core/browser-api";
import { profileOutputSchema } from "@/core/api-schemas";
import { decimal } from "@/core/utils";

export function ProfileContext() {
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => requestApi("/api/profile", profileOutputSchema),
  });
  return (
    <details className="scanner-context">
      <summary>
        <UserRound size={16} aria-hidden /> Mengikuti profil Anda
      </summary>
      <div>
        {profile.data ? (
          <p className="muted text-sm mb-0">
            Gula {decimal(profile.data.healthProfile.dailySugarLimitGrams)}{" "}
            g/hari · Natrium{" "}
            {decimal(profile.data.healthProfile.dailySodiumLimitMg)} mg/hari.
            Pilihan pengganti tanpa batas anggaran.
          </p>
        ) : (
          <p className="muted text-sm mb-0">
            {profile.isPending
              ? "Memuat batas konsumsi Anda…"
              : "Buka profil untuk memeriksa batas dan alergi yang digunakan."}
          </p>
        )}
      </div>
      <Link href="/security-profile" className="text-link">
        Ubah profil
      </Link>
    </details>
  );
}
