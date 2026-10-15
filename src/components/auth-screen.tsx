import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireUser } from "@/core/security/session";
import { HttpError } from "@/core/security/http";
import { LoginForm } from "./login-form";
import { StartAnalysis } from "./start-analysis";

export async function AuthScreen({
  mode,
  destination,
}: {
  mode: "login" | "register";
  destination: string;
}) {
  let user = null;
  try {
    user = await requireUser();
  } catch (error) {
    if (!(error instanceof HttpError && error.status === 401)) throw error;
  }
  if (user?.role === "USER") redirect(destination);
  const registering = mode === "register";
  return (
    <div className="auth-page">
      <div className="shell auth-shell">
        <header className="public-header">
          <Link href="/" className="wordmark">
            Bongkar<span>Label</span>
            <span className="wordmark-dot" />
          </Link>
          <Link className="button button-ghost" href={user ? destination : "/"}>
            <ArrowLeft size={18} aria-hidden />
            Kembali
          </Link>
        </header>
        <main id="main" className="auth-layout">
          <aside className="auth-intro" aria-label="Tentang akun Anda">
            <p className="eyebrow">Label yang sama. Kebutuhan yang berbeda.</p>
            <h2>
              {registering
                ? "Pilihan Anda, lebih personal."
                : "Lanjutkan dengan kebutuhan Anda."}
            </h2>
            <p className="muted">
              Simpan batas konsumsi, alergi dan anggaran di akun Anda. Profil
              tersedia kembali saat Anda masuk, termasuk dari perangkat lain.
            </p>
            {registering ? (
              <ol className="auth-journey">
                <li>
                  <span>01</span>
                  <div>
                    <strong>Buat akun</strong>
                    <p>Nama, email, dan kata sandi.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Sesuaikan profil</strong>
                    <p>Atur batas dan alergi, atau lewati dulu.</p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Periksa label</strong>
                    <p>Baca komposisi dengan konteks Anda.</p>
                  </div>
                </li>
              </ol>
            ) : (
              <div className="auth-return-note">
                <h3>Profil tetap bersama Anda.</h3>
                <p>
                  Batas konsumsi, alergi dan anggaran tersedia kembali setelah
                  Anda masuk. Anda akan kembali ke halaman yang ingin dibuka.
                </p>
              </div>
            )}
            <div className="auth-benefit">
              <ShieldCheck size={22} aria-hidden />
              <p>Anda bisa mengakhiri akses perangkat melalui Profil saya.</p>
            </div>
          </aside>
          <section className="panel auth-card" aria-labelledby="auth-title">
            <nav className="auth-mode" aria-label="Pilihan akun">
              <Link
                href={`/login?next=${encodeURIComponent(destination)}`}
                aria-current={!registering ? "page" : undefined}
              >
                Masuk
              </Link>
              <Link
                href={`/register?next=${encodeURIComponent(destination)}`}
                aria-current={registering ? "page" : undefined}
              >
                Daftar
              </Link>
            </nav>
            <p className="eyebrow">
              {registering
                ? "Langkah 1 · Akun Anda"
                : "Profil Anda sudah menunggu"}
            </p>
            <h1 id="auth-title">
              {registering ? "Buat akun Anda." : "Selamat datang kembali."}
            </h1>
            <p className="muted text-sm">
              {registering
                ? user
                  ? "Profil sesi Anda saat ini akan ikut disimpan ke akun ini."
                  : "Daftarkan email dan buat kata sandi untuk akun baru."
                : "Gunakan email dan kata sandi akun BongkarLabel Anda."}
            </p>
            <LoginForm mode={mode} destination={destination} />
            <div className="auth-guest">
              <StartAnalysis
                compact
                label="Lanjut tanpa akun"
                destination={destination}
              />
              <p className="muted text-sm mb-0">
                Akun bersifat opsional. Anda tetap bisa memeriksa label.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
