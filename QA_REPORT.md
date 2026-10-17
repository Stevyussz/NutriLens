# Hasil QA BongkarLabel

Pembaruan 17 Oktober 2026: regresi gula yang hilang akibat OCR rusak diperbaiki, ringkasan/riwayat/Nara diselaraskan, dan layout percakapan dibatasi. Sebanyak 39 uji unit serta seluruh 20 uji browser produksi final lulus. Lihat [QA konsistensi OCR dan Nara](QA_OCR_CONSISTENCY.md). Laporan [Nara awal](QA_NARA.md), [hasil foto dan sumber produk](QA_FAST_SCAN.md), [redesign UI/UX](QA_UI_REDESIGN.md) dan arsip berikut mencatat tahap sebelumnya.

## Arsip QA alur 16 Oktober 2026

16 Oktober 2026, Asia/Jakarta. Target: aplikasi produksi Docker di localhost:3001, Chromium dengan viewport desktop dan mobile. Alur, langkah dan hasil yang diharapkan tercatat di [QA_FLOW.md](QA_FLOW.md).

**Hasil akhir: lulus pada cakupan pengujian ini.** Tiga masalah alur ditemukan, diperbaiki dan diuji ulang. Tidak ada kegagalan tersisa pada 17 uji browser final. Ini bukan pernyataan bahwa seluruh perangkat atau seluruh foto pasti akurat.

## Alur utama

Beranda → tamu/akun → kamera atau galeri → periksa foto → OCR → koreksi dan konfirmasi → ringkasan → detail opsional → riwayat pribadi.

Jika pembacaan gagal, pesan mendapat fokus dan terlihat di layar. Foto tetap ada, sehingga pengguna dapat mengulang pembacaan. Analisis hanya berjalan setelah hasil bacaan diperiksa dan dikonfirmasi.

## Temuan dan koreksi

| Temuan                                              | Prioritas            | Sebelum                                                                                                    | Koreksi dan hasil ulang                                                                                                                          |
| --------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| QA-B01: Back tidak menyelaraskan tab hasil          | P2                   | URL kembali dari Komposisi, tetapi tab bisa tetap menampilkan Komposisi.                                   | Hash dan tab diselaraskan. Back membuka Ringkasan; Forward mengembalikan Komposisi. Analisis baru kembali ke hash ringkasan. Lulus.              |
| QA-B02: tautan detail riwayat diabaikan saat dimuat | P2                   | Membuka `?history=…#sumber-gula` atau reload justru menampilkan Ringkasan.                                 | Pemulihan riwayat membaca hash awal. Sumber gula tetap dipilih setelah reload. Analisis label lain melepas pengenal riwayat lama. Lulus.         |
| QA-B03: pesan OCR gagal berada di luar layar mobile | P2                   | Pada viewport 320 × 780, bagian atas pesan berada di y=892 px, sehingga kegagalan tidak langsung terlihat. | Pesan mendapat fokus dan digulir ke area terlihat; tombol baca tetap tersedia dan foto tetap ada. Uji posisi di viewport, fokus dan retry lulus. |
| QA-T01: gambar uji bergantung pada artefak lokal    | P3, infrastruktur QA | Beberapa uji browser membaca PNG dari folder artifacts yang diabaikan Git.                                 | Kedua fixture yang sama kini disertakan di tests/fixtures. Hash cocok dengan gambar sebelumnya; uji final menggunakan berkas tersebut. Lulus.    |

Bukti awal disimpan lokal di artifacts/qa-before-fix-browser.json, qa-before-back.png, qa-before-deep-link.png dan qa-before-ocr-error.json/png. Bukti setelah koreksi: qa-history-sugar-mobile.png dan qa-ocr-error-mobile.png. Nama berkas mengacu pada folder artifacts.

## Status tiap skenario

| ID    | Status                       | Bukti pengujian                                                                                                                  |
| ----- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| QA-01 | LULUS                        | Entry publik, penggunaan ulang sesi dan kondisi medis awal kosong: resilience.spec.ts.                                           |
| QA-02 | LULUS                        | Daftar, profil opsional, login kembali ke tujuan dan pencabutan sesi lain: accounts.spec.ts.                                     |
| QA-03 | LULUS                        | JPEG, pembesaran foto, ArrowRight, Escape, fokus kembali dan track berhenti: camera.spec.ts.                                     |
| QA-04 | LULUS                        | Izin kamera ditolak, galeri tetap bisa digunakan: camera.spec.ts.                                                                |
| QA-05 | LULUS                        | Jumlah/ukuran berlebih, file palsu, dekode dan resolusi rendah: camera.spec.ts, photo-api.spec.ts dan resilience.spec.ts.        |
| QA-06 | LULUS                        | Error terlihat dalam viewport 320 px, mendapat fokus, lalu retry dengan foto yang sama: qa-flow.spec.ts.                         |
| QA-07 | LULUS                        | Field hilang, perubahan membatalkan konfirmasi, harga kosong tetap null: photo-review.spec.ts.                                   |
| QA-08 | LULUS, fixture terkontrol    | Kamera virtual → OCR produksi → konfirmasi → analisis AI baru → riwayat; tidak memakai respons tiruan atau hasil analisis cache. |
| QA-09 | LULUS                        | Ringkasan, komposisi, sumber gula, alternatif, dialog dan disclosure: flows.spec.ts dan journey.spec.ts.                         |
| QA-10 | LULUS setelah koreksi        | Back/Forward dan analisis label berikutnya: qa-flow.spec.ts.                                                                     |
| QA-11 | LULUS setelah koreksi        | Hash detail, reload dan pelepasan history lama: qa-flow.spec.ts. Profil asli tetap dipakai: history.spec.ts.                     |
| QA-12 | LULUS                        | Pencarian nama, literal `.*`, tanpa hasil, reset, konfirmasi hapus dan kosong: history.spec.ts.                                  |
| QA-13 | LULUS                        | Pengguna lain tidak dapat mencari, membaca atau menghapus hasil pemilik: history.spec.ts.                                        |
| QA-14 | LULUS                        | Kamus/profil gagal dan retry: resilience.spec.ts. Riwayat loading/error/retry: rekaman photo-history-refinement.                 |
| QA-15 | LULUS pada ukuran yang diuji | Kamera/dialog 320 px, flow mobile 390 px, flow desktop 1440 px; riwayat 320/390/768/1440 px tanpa overflow.                      |
| QA-16 | LULUS                        | Akhiri sesi dan akses ulang halaman pribadi: flows.spec.ts. Login dan pencabutan perangkat: accounts.spec.ts.                    |

## Angka dan bukti akhir

- Browser produksi: **17 lulus, 0 gagal, 1,1 menit**. Laporan lokal: artifacts/browser-results.json.
- Unit: **28 lulus, 0 gagal**. Cakupan meliputi algoritma, validasi data dan transport AI; bukan pengukuran akurasi populasi.
- Docker build produksi dan strict TypeScript: lulus. App, MongoDB dan helper router privat sehat saat diperiksa.
- Flow AI baru: `ROUTER_CROSSCHECKED` dan `ROUTER_AI`, `cacheHit: false`, harga tetap null, keenam nutrien cocok. Satu pengukuran: OCR 7,17 detik dan tahap analisis 3,86 detik; ini sampel tunggal, bukan jaminan latensi.
- Rekaman AI: artifacts/qa-live-camera-flow.webm; laporan terstruktur: artifacts/qa-live-ai-flow.json. Sampel frame dan screenshot hasil ditinjau secara visual; tidak ada page error pada rekaman ini.
- Layout dan riwayat loading/error/retry: artifacts/photo-history-refinement.json; tidak ada page error atau overflow pada ukuran yang dicatat. Empat sampel teks dialog berkontras 5,35:1 sampai 14,24:1.
- Akun terdaftar sementara yang dibuat uji browser telah dihapus beserta sesinya. Pengujian tidak menghapus akun pengguna.

## Batas hasil

Kamera diuji menggunakan kamera virtual Chromium pada Linux. Kamera fisik Android/iOS, Safari, pencahayaan buruk, pantulan, blur, lipatan dan label dengan huruf sangat kecil masih memerlukan pengujian perangkat serta dataset beranotasi manusia. Fixture sintetis bukan pengganti kemasan nyata Indonesia. Keberhasilan panggilan AI ini tidak menjamin kuota atau ketersediaan penyedia pada waktu lain. Pemeriksaan sumber/data pada UI tidak berarti seluruh katalog atau data kimia sudah lengkap.

Respons gagal yang disimulasikan hanya menguji pemulihan UI; pengujian AI nyata dicatat terpisah. Hasil foto tetap memerlukan pemeriksaan manusia. Tidak ada audit keamanan menyeluruh atau sertifikasi aksesibilitas yang diklaim.

## Gate antislop untuk perubahan QA

Mode during, pilihan sesi sebelumnya. Design Read dan alasan koreksi ada di DESIGN.md. ENERGY 3 / RHYTHM 3 / MOTION 1 dipertahankan. Scope gate ini adalah koreksi navigasi dan keterlihatan pesan gagal; gaya visual lain tidak diubah.

| Item             | Status dan bukti                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| R-02             | PASS: pemindaian src tidak menemukan em dash; tidak ada copy baru dengan karakter tersebut.                                         |
| R-03             | PASS: uji viewport mobile dan layout yang disebutkan di QA-15 lulus.                                                                |
| R-17             | PASS: tidak ada statistik pemasaran baru; angka QA berasal dari hasil uji yang dicatat.                                             |
| R-18             | PASS: tidak ada testimonial atau identitas fiktif ditambahkan.                                                                      |
| R-23             | PASS: fixture yang sudah ada disalin tanpa perubahan; tidak ada logo, ilustrasi produk atau struktur navigasi baru.                 |
| R-24             | PASS: tujuan navigasi tetap sama dan dikunjungi oleh uji browser.                                                                   |
| R-25             | PASS dalam scope perubahan: warna teks tidak diubah; sampel dialog 5,35:1 sampai 14,24:1, warna error memakai token yang sudah ada. |
| R-26             | PASS: Back, Forward, tautan detail, reload, analisis berikutnya dan retry menjalankan aksi sebenarnya.                              |
| R-27             | PASS: kosong, loading, error, koreksi dan hasil diuji; kegagalan OCR mendapat fokus dan masuk viewport.                             |
| R-28             | PASS: tidak ada FAQ ditambahkan.                                                                                                    |
| R-32             | PASS: fokus error dan kontrol keyboard dialog diuji; fokus hasil dan skip link tetap lulus.                                         |
| R-33             | PASS: koreksi ditulis langsung di source; tidak ada helper yang menulis ulang source/CSS ditambahkan.                               |
| R-34             | PASS: tidak ada tema baru; pemeriksaan preferensi sistem gelap dengan palet aplikasi yang ada tetap lulus.                          |
| R-35             | PASS: build, 17 uji browser dan rekaman flow produksi selesai; daftar aksi ada di QA_FLOW.md dan tabel status di atas.              |
| R-36             | PASS: tidak ada klaim medis, keamanan, performa universal atau akurasi sempurna baru.                                               |
| R-37             | PASS: arah visual dibaca; alasan navigasi/fokus ditulis di DESIGN.md.                                                               |
| R-38             | PASS: fixture jelas bertanda label uji; respons tiruan dibedakan dari AI nyata.                                                     |
| R-01             | PASS: tidak ada gradasi baru; gradasi oat lama mempertahankan identitas ruang kerja.                                                |
| R-04             | PASS: tidak ada ikon baru; ikon yang ada tetap menunjuk tindakan kamera/navigasi.                                                   |
| R-06             | PASS: Manrope dan hierarki teks tetap; tidak ada gaya display baru.                                                                 |
| R-07             | PASS: tidak ada pola background baru.                                                                                               |
| R-08             | PASS: tidak ada panah dekoratif baru.                                                                                               |
| R-09             | PASS: tidak ada badge promosi baru.                                                                                                 |
| R-10             | PASS: tidak ada blur atau glass baru.                                                                                               |
| R-12             | PASS: tidak ada bayangan baru.                                                                                                      |
| R-13             | PASS: tidak ada glow baru.                                                                                                          |
| R-14             | PASS: tidak ada grid kartu fitur ditambahkan.                                                                                       |
| R-19             | PASS: scroll pesan mengarahkan perhatian ke kegagalan tugas; tidak ada animasi dekoratif.                                           |
| R-22             | PASS: tidak ada ilustrasi baru; foto tetap isi label yang diperiksa.                                                                |
| Dials            | PASS: ENERGY 3 / RHYTHM 3 / MOTION 1 eksplisit dan dipertahankan.                                                                   |
| Konsistensi dial | PASS: koreksi tidak mengubah komposisi atau gaya gerak.                                                                             |
| Focal point      | PASS: ringkasan menjadi awal hasil; pesan gagal menjadi fokus saat pembacaan gagal.                                                 |
| Whitespace       | PASS: struktur ruang lama dipertahankan, tidak ada bagian pengisi baru.                                                             |
| Accent           | PASS: aksen vermilion tetap untuk aksi utama.                                                                                       |
| Motif            | PASS: bidang kertas dan baris label tetap menjadi identitas.                                                                        |
| Design Read      | PASS: arah ruang baca label dan alasan koreksi tercatat sebelum penyerahan.                                                         |
| C-1              | PASS: sinkronisasi tab dan fokus gagal mempunyai alasan tugas yang tertulis.                                                        |
| C-2              | PASS: seluruh aksi yang berubah mempunyai bukti interaksi nyata.                                                                    |
| C-3              | PASS: tidak ada bagian template baru.                                                                                               |
| C-4              | PASS: navigasi, reload, kegagalan, retry, mobile dan keyboard diuji.                                                                |
| C-5              | PASS: angka laporan dapat ditelusuri ke hasil uji; keterbatasannya disebutkan.                                                      |
| R-05             | PASS: susunan aplikasi mengikuti tugas scan dan membaca label, tanpa template baru.                                                 |
| R-11             | PASS: bentuk kontrol/panel tidak berubah.                                                                                           |
| R-15             | PASS: tombol tetap menyebut tindakan produk, seperti Baca foto label dan Periksa label lain.                                        |
| R-16             | PASS: tidak ada buzzword pemasaran baru.                                                                                            |
| R-20             | PASS: identitas studio label dipertahankan.                                                                                         |
| R-21             | PASS: identitas charcoal/kertas yang disetujui dipertahankan; tidak ada tema baru yang dipaksakan atau ditunda.                     |
| R-29             | PASS: palet tidak bertambah.                                                                                                        |
| R-30             | PASS: tidak ada antarmuka produk lain yang disalin.                                                                                 |
| R-31             | PASS: alasan pemilihan hash, reset tautan riwayat dan fokus error tertulis di DESIGN.md.                                            |

**Gate: PASS untuk scope perubahan dan bukti web yang dicatat.**
