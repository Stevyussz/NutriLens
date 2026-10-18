# PWA BongkarLabel

PWA membuka `/scanner` dalam mode standalone dengan identitas BongkarLabel. Manifest berada di `public/manifest.webmanifest`; tautan manifest dan metadata Apple ditulis langsung di head awal. Metadata manifest otomatis yang muncul setelah head pada respons streaming Next.js sempat tidak dikenali Chrome, meskipun endpoint dapat diakses. Pemeriksaan browser kini mewajibkan tautan di head dan manifest yang benar-benar berhasil diurai Chrome.

Ikon PNG 192/512, maskable 512, Apple 180 dan favicon 32 diekspor dari `public/icons/app.svg`. Bentuk geometris mengadaptasi bingkai scanner dan tanda bacaan Nara dengan palet yang sudah dipakai. Semua PNG memuat metadata asal. Tidak ada perubahan identitas atau token desain.

Service worker hanya aktif pada produksi dan secure context. Cache Storage hanya berisi halaman offline, font dan ikon publik. Halaman pribadi, respons API, gambar label dan hasil AI tidak dicache oleh worker. Navigasi penuh yang gagal tersambung menampilkan halaman offline; permintaan API tetap gagal sebagai permintaan jaringan, tidak diubah menjadi HTML sukses. Scan, AI dan riwayat tetap membutuhkan internet. Pembaruan worker menunggu sesi lama ditutup tanpa memuat ulang kamera/formulir secara paksa.

Android/Chrome menggunakan menu instal browser; iPhone/Safari memakai Bagikan → Tambahkan ke Layar Utama. HTTPS diperlukan pada domain publik; localhost mendapat pengecualian secure context, alamat IP LAN HTTP tidak. Menu dan dukungan pemasangan mengikuti perangkat/browser. Pemasangan fisik pada Android/iPhone tidak diotomasi oleh pengujian desktop.

## Verifikasi

- Pemeriksaan tipe awal: `artifacts/nara-final/pwa-types.log`.
- Pemeriksaan browser: `tests/browser/pwa.spec.ts`, profil Chrome persisten terisolasi. Mode incognito memang tidak bisa menginstal PWA, sehingga tidak dipakai untuk pemeriksaan installability.
- Tes memeriksa metadata, ikon, registrasi dan kontrol service worker, cache header worker, hasil parsing manifest dan installability Chrome, navigasi offline, API offline, batas cache publik, tampilan 320/390/1440, serta kembali ke scanner saat online.
- Satu detector pass menghasilkan peringatan pembacaan font shorthand dan dua saran ukuran huruf. Font diubah menjadi properti eksplisit dan ukuran 34/23/15 sesuai sistem; detector tidak diulang. Pemeriksaan dokumentasi mempertahankan DESIGN.md dan sidecar.

## Hasil akhir

- Build Docker terkoreksi berhasil: `artifacts/nara-final/pwa-build-head.log`; pemasangan `pwa-deploy-final.log`. Container healthy pada image `sha256:900c55b277f41eecc721902b98a9833b3330cfdd0c8c56caf83e04fd33df1200`.
- Tes browser PWA lulus (1 kasus lengkap), `artifacts/nara-final/pwa-browser.log`. Chrome benar-benar mengurai manifest dengan display standalone dan start URL scanner, tanpa installability errors; bukti `.impeccable/review/pwa/installability.json`.
- Empat regresi scanner/hasil/percakapan/koreksi/riwayat/katalog lulus: `pwa-scanner-regression.log`. Pemeriksaan tipe lulus: `pwa-types-final.log`.
- Capture offline 320/390/1440 diperiksa langsung. Reviewer terpisah menggunakan prosedur review cadangan read-only Impeccable dan memberi `disposition: ship` pada cakupan penambahan PWA. Tidak ada klaim pemasangan fisik Android/iOS.
- Documenter mengonfirmasi ekstensi tetap memakai sistem visual lama, termasuk setelah manifest dipindahkan menjadi statis. DESIGN.md dan sidecar dipertahankan.
