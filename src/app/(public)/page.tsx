import Link from "next/link";
import Image from "next/image";
import { Camera, FileText, FileCheck2, ScanLine } from "lucide-react";
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
    <div className="landing-page">
      <div className="landing-opening">
        <header className="landing-header landing-width">
          <Link href="/" className="wordmark">
            BongkarLabel
          </Link>
          <nav aria-label="Navigasi beranda">
            <a href="#cara-baca">Cara membaca label</a>
            <Link
              href={registered ? "/security-profile" : "/login"}
              className="landing-login"
            >
              {registered ? "Profil saya" : "Masuk"}
            </Link>
          </nav>
        </header>
        <main id="main">
          <section
            className="landing-hero landing-width"
            aria-labelledby="home-title"
          >
            <h1 id="home-title">
              Foto labelnya.
              <br />
              Kenali isinya.
            </h1>
            <p className="landing-intro">
              Foto komposisi dan tabel gizinya. Periksa hasil baca,
              <br className="landing-desktop-break" /> lalu lihat ringkasan
              sesuai kebutuhan Anda.
            </p>
            <div className="landing-actions">
              <div className="landing-scan-action">
                <ScanLine size={42} aria-hidden />
                <StartAnalysis label="Mulai scan label" />
              </div>
              <a href="#cara-baca" className="landing-how-action">
                Cara kerjanya
              </a>
            </div>
            <p className="landing-account-note">Tanpa membuat akun</p>
          </section>
          <section
            className="landing-example"
            aria-labelledby="label-example-title"
          >
            <div className="landing-width">
              <h2 id="label-example-title">
                Satu label. Beberapa nama untuk gula.
              </h2>
              <p className="ingredient-index-intro">
                Gula, dekstrosa, dan madu sama-sama sumber gula. Banyaknya nama
                bukan ukuran gram gula.
              </p>
              <div className="ingredient-index">
                {[
                  ["/assets/plates/wheat.png", "Gandum utuh"],
                  ["/assets/plates/sugar.png", "Gula"],
                  ["/assets/plates/dextrose.png", "Dekstrosa"],
                  ["/assets/plates/honey.png", "Madu"],
                ].map(([id, label]) => (
                  <div className="ingredient-index-item" key={id}>
                    <Image
                      src={id}
                      alt=""
                      width={230}
                      height={110}
                      sizes="(max-width: 520px) 22vw, (max-width: 900px) 18vw, 230px"
                    />
                    <strong>{label}</strong>
                  </div>
                ))}
                <p className="ingredient-index-note">
                  Contoh ilustratif,
                  <br /> bukan hasil scan.
                </p>
              </div>
              <section
                id="cara-baca"
                className="landing-steps"
                aria-labelledby="steps-title"
              >
                <h2 id="steps-title">Dari foto, jadi lebih paham.</h2>
                <ol>
                  <li>
                    <Camera aria-hidden />
                    <div>
                      <h3>1. Foto</h3>
                      <p>
                        Ambil foto komposisi dan tabel gizi pada kemasan produk.
                      </p>
                    </div>
                  </li>
                  <li>
                    <FileText aria-hidden />
                    <div>
                      <h3>2. Periksa</h3>
                      <p>
                        Lihat hasil baca bahan dan informasi gizi dari label
                        Anda.
                      </p>
                    </div>
                  </li>
                  <li>
                    <FileCheck2 aria-hidden />
                    <div>
                      <h3>3. Pahami</h3>
                      <p>
                        Dapatkan ringkasan sesuai kebutuhan Anda sebelum
                        membeli.
                      </p>
                    </div>
                  </li>
                </ol>
              </section>
            </div>
          </section>
          <div className="landing-continuation">
            <section
              className="landing-details landing-width"
              aria-labelledby="beyond-title"
            >
              <h2 id="beyond-title">
                Ringkas saat memilih.
                <br />
                Rinci saat diperlukan.
              </h2>
              <div className="landing-detail-list">
                <details>
                  <summary>Kenali bahan dan nama lainnya</summary>
                  <p>
                    Cari nama lain gula, kode INS dan E-number. Kamus bahan
                    memakai taksonomi Open Food Facts dengan tautan sumber. Nama
                    atau kode bahan saja bukan bukti bahwa bahan tersebut
                    berbahaya.
                  </p>
                </details>
                <details>
                  <summary>Sesuaikan dengan kebutuhan Anda</summary>
                  <p>
                    Atur batas gula, natrium, alergi dan kondisi yang ingin Anda
                    perhatikan. Profil dimulai tanpa asumsi kondisi medis. Hasil
                    tersimpan di riwayat untuk dibaca kembali, dengan profil
                    saat analisis dilakukan.
                  </p>
                </details>
                <details>
                  <summary>Bandingkan pilihan yang tersedia</summary>
                  <p>
                    Kandidat pembanding berasal dari kategori dan rasa yang
                    mirip. Periksa gizi, ukuran sajian dan biayanya; harga yang
                    belum terverifikasi ditandai sebagai estimasi. Data
                    komunitas tetap perlu dicocokkan dengan label kemasan.
                  </p>
                </details>
              </div>
            </section>
            <section className="landing-final landing-width">
              <div>
                <h2>
                  Label yang ada di tangan Anda,
                  <br />
                  mulai dari situ.
                </h2>
                <p>Siapkan bagian komposisi dan tabel gizinya.</p>
              </div>
              <StartAnalysis />
            </section>
          </div>
        </main>
      </div>
      <footer className="landing-footer landing-width">
        <div>
          <strong>BongkarLabel</strong>
          <p>Baca komposisi. Putuskan sendiri.</p>
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
            <p>
              Foto dan teks label diproses oleh layanan pembacaan yang
              terhubung. Jika AI diaktifkan, kiriman dapat diteruskan ke
              penyedia yang dikonfigurasi melalui 9Router atau Gemini. Gambar
              asli tidak disimpan dalam riwayat. Database menyimpan hasil label,
              profil, hash input dan sesi; cache analisis berlaku 24 jam.
            </p>
            <p>
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
