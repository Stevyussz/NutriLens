# Deployment BongkarLabel ke Vercel

Status penyiapan 22 Oktober 2026: preview Next.js berhasil dibangun; deployment fungsional belum terverifikasi karena koneksi MongoDB cloud belum tersedia.
Preview: https://bongkarlabel-qqnnno4ew-bettersmpmcs-projects.vercel.app
(masih dilindungi autentikasi Vercel).
Pengaturan project sudah memakai preset Next.js dan Node.js 22.x.
Alur Docker lokal tidak bisa dipindahkan langsung sebagai satu layanan Vercel.

## Layanan yang dibutuhkan

- Vercel untuk aplikasi Next.js. Gunakan Node.js 22 agar sesuai runtime Docker yang telah diuji.
- MongoDB cloud, misalnya Atlas. URI `localhost` dan nama service Docker `mongodb` tidak dapat diakses dari Vercel.
- Penyedia AI dengan endpoint publik. Socket `/run/router/9router.sock` serta 9Router `127.0.0.1` hanya berlaku untuk konfigurasi lokal. Gemini langsung memakai kunci yang sama-sama tersedia di lingkungan server, bukan variabel `NEXT_PUBLIC_*`.
- Jalur unggah langsung ke penyimpanan privat untuk mendukung enam foto berukuran hingga 5 MiB masing-masing.

## Konfigurasi lingkungan

Simpan konfigurasi cloud lokal dalam `.env.vercel.local`, yang diabaikan Git.
Konfigurasi produksi perlu mencakup `MONGODB_URI`, `MONGODB_DB`, dan
`SESSION_SECURE=true`. Origin HTTPS deployment memakai host tepat dari
variabel sistem Vercel. Untuk domain tambahan, isi `APP_ORIGIN` dengan daftar
origin HTTPS yang dipisahkan koma. Header host dari permintaan tidak menambah izin.
Pilih satu penyedia AI: `GEMINI_API_KEY`/`GEMINI_MODEL`, atau endpoint HTTPS
9Router yang dapat diakses Vercel beserta konfigurasi autentikasinya.
Jangan menyalin socket path lokal ke konfigurasi cloud.

Vercel CLI sudah terhubung melalui alur resmi `vercel login` dan workspace
ditautkan ke project `bettersmpmcs-projects/bongkarlabel`.
Dashboard: https://vercel.com/bettersmpmcs-projects/bongkarlabel.
Koneksi MongoDB cloud belum tersedia pada saat penyiapan ini.
Penyimpanan Blob privat `bongkarlabel-scan-uploads` sudah dibuat di region
`sin1` dan ditautkan ke production serta preview. Adapter unggahan privat sudah
diimplementasikan, dengan token berbatas lima menit, maksimal 5 MiB per foto,
kepemilikan per akun, dan larangan penimpaan berkas. Server mengambil foto
melalui SDK privat; API tidak menerima URL sumber bebas.
`GEMINI_API_KEY` telah disimpan sebagai secret pada kedua lingkungan tersebut,
bersama `GEMINI_MODEL=gemini-3.5-flash`, `MONGODB_DB=bongkar_label`, dan
`SESSION_SECURE=true`. Pengujian langsung model publik pada satu foto label
Golda membaca gula 19 g, natrium 80 mg, energi 180 kkal, dan sajian 200 ml.
Hasil satu foto ini bukan tolok ukur akurasi menyeluruh.
`.vercelignore` mengecualikan berkas lingkungan, artefak pengujian, ekspor ZIP,
direktori agent, serta dependency/build lokal dari unggahan sumber.

## Penyesuaian sebelum publikasi fungsional

1. **Unggahan foto:** Vercel membatasi payload function hingga 4,5 MB.
   Browser mengirim foto langsung ke Blob privat lalu hanya mengirim referensi
   foto ke `/api/extract`. Docker tanpa token Blob mempertahankan multipart.
   Foto dihapus setelah dibaca, termasuk saat pembacaan gagal. Token yang masih
   berlaku tetap dilacak; cron terautentikasi `/api/cron/cleanup-uploads`
   membersihkan unggahan terbengkalai setiap hari pukul 03:00 UTC. Jadwal ini
   tidak menjamin penghapusan tepat waktu saat layanan cron/Blob bermasalah;
   kegagalan penghapusan menyisakan rekaman untuk percobaan berikutnya.
   `CRON_SECRET` sudah disimpan sebagai secret server. Angka/teks hasil baca
   tetap disimpan dalam riwayat; berkas foto tidak dimasukkan ke riwayat.
2. **Database:** jalankan seeder terhadap URI cloud setelah koneksinya berhasil.
   Seeder referensi dapat dijalankan dengan
   `node --env-file=.env.vercel.local --import tsx src/core/db/seed.ts`.
   Akun/sesi/riwayat lokal tidak dimigrasikan oleh langkah ini.
3. **Batas permintaan:** Vercel memakai penghitung window tetap atomik di MongoDB
   dengan index TTL agar konsisten antar-instance. Docker memakai sliding
   window lokal seperti sebelumnya. Pada batas window cloud, dua kelompok
   permintaan dapat terjadi berdekatan; ini bukan sliding window persis.
4. **Pembaruan data:** container `updater` tidak berjalan pada Vercel. Jadwal
   pembaruan referensi perlu dipindahkan ke pekerjaan terautentikasi di cloud.
5. **Validasi:** sesudah deploy, periksa health database, sesi/cookie HTTPS,
   kamera di ponsel, enam foto, penanganan kegagalan, Nara, riwayat privat,
   serta PWA. Build halaman beranda saja belum membuktikan aplikasi berfungsi.

## Bukti pengujian saat persiapan

- Pemeriksaan tipe TypeScript lulus.
- 81 pengujian unit lulus, termasuk batas origin dan referensi foto privat.
- Pengujian integrasi terhadap Blob privat sungguhan dan database QA lokal
  terpisah lulus: enam foto (satu berukuran 5 MiB), penolakan pemilik berbeda,
  penolakan pembacaan ulang, penghapusan foto/rekaman, dan 12 permintaan paralel
  yang hanya mengizinkan lima sesuai batas.
- Pengujian ini belum membuktikan koneksi Atlas atau alur browser di deployment.
- Smoke test melalui bypass resmi CLI pada preview: beranda HTTP 200 dengan
  konten BongkarLabel, endpoint unggahan tanpa sesi HTTP 401, health database
  HTTP 503 dengan `{ "ok": false }`. Status health ini merupakan penghalang
  rilis fungsional, bukan hasil lulus. Build pertama dengan preset Other
  menghasilkan 404 dan telah digantikan oleh preview dengan preset Next.js.

## Dokumentasi platform

- [Batas Vercel Functions](https://vercel.com/docs/functions/limitations)
- [Unggahan langsung Vercel Blob](https://vercel.com/docs/vercel-blob/client-upload)
- [Penyimpanan Blob privat](https://vercel.com/docs/vercel-blob/private-storage)
- [Versi Node.js pada Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
