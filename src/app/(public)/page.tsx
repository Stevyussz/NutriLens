import Link from "next/link";
import {
  ScanLine,
  Layers3,
  Scale,
  ShieldCheck,
  Check,
  ArrowRight,
} from "lucide-react";
import { StartAnalysis } from "@/components/start-analysis";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/core/security/session";
import { HttpError } from "@/core/security/http";
export default async function Home() {
  let registered = false;
  try {
    registered = (await requireUser()).role === "USER";
  } catch (error) {
    if (!(error instanceof HttpError && error.status === 401)) throw error;
  }
  return (
    <div className="shell">
      <header className="public-header">
        <Link href="/" className="wordmark">
          Bongkar<span>Label</span>
          <span className="wordmark-dot" />
        </Link>
        <nav className="public-nav" aria-label="Navigasi beranda">
          <Link
            className="public-account-link"
            href={registered ? "/security-profile" : "/login"}
          >
            {registered ? "Profil saya" : "Masuk"}
          </Link>
          <a href="#cara-baca" className="hidden md:inline-flex">
            Cara membaca label
          </a>
          <StartAnalysis compact />
        </nav>
      </header>
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <ScanLine size={18} aria-hidden />
              Baca di balik kemasan
            </p>
            <h1>
              Kenali isinya.
              <br />
              <span>Pilih yang sesuai.</span>
            </h1>
            <p className="intro">
              Gula dengan nama berbeda. Kode bahan yang asing. BongkarLabel
              membantu Anda memahami komposisi dan membandingkan pilihan untuk
              kebutuhan sehari-hari.
            </p>
            <div className="hero-actions">
              <StartAnalysis />
              <a className="button button-ghost" href="#cara-baca">
                Lihat cara kerjanya
              </a>
            </div>
            <p className="start-note">
              <Check size={16} aria-hidden />
              Langsung periksa, tanpa membuat akun.
            </p>
          </div>
        </section>
        <section
          className="label-example"
          aria-labelledby="label-example-title"
        >
          <div className="example-copy">
            <p className="eyebrow">Mengenali sumber gula</p>
            <h2 id="label-example-title">
              Satu label.
              <br />
              Beberapa nama untuk gula.
            </h2>
            <p className="muted mb-0">
              Nama berbeda bisa punya peran yang sama. Baca komposisinya
              bersama, bukan satu per satu.
            </p>
          </div>
          <div className="ingredient-example">
            <p className="example-caption">
              Contoh komposisi sereal ilustratif
            </p>
            <div
              className="example-ingredients"
              aria-label="Urutan bahan pada contoh"
            >
              <span className="example-grain">Gandum utuh</span>
              {["Sukrosa", "Sirup glukosa", "Dekstrosa", "Madu"].map((name) => (
                <span key={name} className="example-sugar">
                  {name}
                </span>
              ))}
            </div>
            <div className="example-conclusion">
              <ArrowRight size={18} aria-hidden />
              <p className="mb-0">Empat nama, sama-sama sumber gula.</p>
            </div>
            <p className="muted text-sm mb-0">
              Ilustrasi, bukan label produk riil. Model posisi memberi estimasi,
              bukan berat gula terukur.
            </p>
          </div>
        </section>
        <section id="cara-baca" className="section-divider explanation-grid">
          <div>
            <p className="eyebrow">Dari komposisi ke keputusan</p>
            <h2>
              Lebih paham.
              <br />
              Lebih punya pilihan.
            </h2>
            <p className="muted">
              Bukan menilai makanan dari tampilan kemasannya. Mulai dari apa
              yang benar-benar tertulis.
            </p>
          </div>
          <div className="explanation-list">
            <article>
              <Layers3 aria-hidden />
              <div>
                <h3>Apa sebenarnya bahan ini?</h3>
                <p className="muted mb-0">
                  Cari nama lain gula, kode INS dan E-number. Kamus bahan
                  memakai taksonomi Open Food Facts dengan tautan sumber, bukan
                  tebakan dari namanya.
                </p>
              </div>
            </article>
            <article>
              <ShieldCheck aria-hidden />
              <div>
                <h3>Apakah sesuai dengan kebutuhan saya?</h3>
                <p className="muted mb-0">
                  Atur batas gula, natrium, alergi dan kondisi yang ingin Anda
                  perhatikan. Profil dimulai tanpa asumsi kondisi medis.
                </p>
              </div>
            </article>
            <article>
              <Scale aria-hidden />
              <div>
                <h3>Ada pilihan yang lebih cocok?</h3>
                <p className="muted mb-0">
                  Bandingkan kandidat dari kategori dan rasa yang mirip, lalu
                  periksa gizi, ukuran sajian dan biayanya. Estimasi harga
                  selalu ditandai.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className="reading-note">
          <div>
            <h2>Mulai dari makanan yang ada di tangan Anda.</h2>
            <p className="muted mb-0">
              Isi label kemasan atau gunakan contoh analisis untuk mengenal cara
              kerjanya.
            </p>
          </div>
          <StartAnalysis />
        </section>
      </main>
      <footer className="public-footer">
        <div>
          <p className="font-semibold mb-1">BongkarLabel</p>
          <p className="mb-0">Baca komposisi, putuskan sendiri.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost">Data & privasi</Button>
          </DialogTrigger>
          <DialogContent
            title="Data & privasi"
            description="Apa yang diproses saat Anda memeriksa label."
          >
            <p>
              Anda dapat memeriksa label tanpa akun. Dalam mode ini, akses
              profil mengikuti sesi perangkat. Jika membuat akun, profil
              disimpan agar tersedia ketika Anda masuk kembali. Akses setiap
              perangkat berlaku maksimal 24 jam dan dapat diakhiri melalui
              Profil saya.
            </p>
            <p className="mt-4">
              Foto dan teks label dikirim ke Google Gemini ketika layanan
              diaktifkan. Gambar asli tidak disimpan. Database menyimpan hasil
              label, profil, hash input dan sesi; cache analisis berlaku 24 jam.
            </p>
            <p className="mt-4 muted">
              Kamus dan katalog memakai data komunitas Open Food Facts dengan
              tautan sumber. Periksa kembali label fisik. Harga tanpa bukti toko
              merupakan estimasi. Analisis membantu membaca label dan bukan
              diagnosis medis.
            </p>
          </DialogContent>
        </Dialog>
      </footer>
    </div>
  );
}
