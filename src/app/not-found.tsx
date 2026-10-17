import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="shell narrow py-16 system-state">
      <h1 className="text-4xl">Halaman tidak ditemukan</h1>
      <p className="muted my-6">Alamat ini tidak tersedia di BongkarLabel.</p>
      <Link href="/" className="button button-primary">
        Kembali ke beranda
      </Link>
    </main>
  );
}
