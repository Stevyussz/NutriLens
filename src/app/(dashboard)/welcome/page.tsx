import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/profile-editor";
import { authDestination } from "@/core/security/auth-input";
import { requireUser } from "@/core/security/session";

export default async function Welcome({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const destination = authDestination((await searchParams).next);
  const user = await requireUser();
  if (user.role !== "USER") redirect(destination);
  return (
    <div className="onboarding-layout">
      <header className="page-header">
        <p className="eyebrow">Akun siap · Langkah 2 dari 2</p>
        <h1>Sesuaikan dengan Anda.</h1>
        <p className="muted">
          Profil membantu menandai bahan dan membandingkan pilihan. Isi yang
          relevan saja. Tidak ada kondisi medis yang dipilih otomatis.
        </p>
        <Link className="text-link" href={destination} replace>
          Lewati dulu, lanjutkan
        </Link>
        <p className="muted text-sm">Bisa diubah kapan saja di Profil saya.</p>
      </header>
      <ProfileEditor onboarding destination={destination} />
    </div>
  );
}
