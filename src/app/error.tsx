"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="shell narrow py-16">
      <h1 className="text-4xl">Layanan belum dapat dibuka</h1>
      <p className="muted my-6">
        Koneksi server terputus. Coba lagi setelah database tersedia.
      </p>
      <Button onClick={reset}>Muat ulang halaman</Button>
    </main>
  );
}
