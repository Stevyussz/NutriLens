# QA Nara: gerak baca dan pertanyaan lanjutan

17 Oktober 2026, Asia/Jakarta. Perubahan memperluas scanner yang sudah ada, mempertahankan identitas Indeks Belanja dan hasil awal sebelum detail opsional.

## Perilaku

- Nara adalah nama pendamping baca label BongkarLabel. Indikatornya merupakan garis pemindai yang bergerak di atas tanda label selama permintaan berlangsung. Tidak ada persentase, tahapan waktu rekaan atau tampilan proses penalaran internal.
- Animasi berhenti ketika elemen keluar viewport atau dokumen tersembunyi. Pengaturan reduced motion menggantinya dengan tanda baca statis. Status teks tetap tersedia untuk pembaca layar.
- Percakapan dibuka dari hasil foto, memakai tiga pertanyaan cepat atau pertanyaan sendiri maksimal 500 karakter. Enam jawaban terbaru disimpan sementara dalam state halaman; tidak ada koleksi database chat. Pertanyaan bebas dan fakta kontekstual dapat dikirim ke penyedia AI yang dikonfigurasi, sebagaimana dinyatakan di panel.
- Endpoint menerima ID riwayat dan pertanyaan, bukan objek angka dari browser. Pencarian riwayat selalu memfilter pengguna pemilik. Profil memakai snapshot saat scan.
- Pertanyaan umum dipetakan langsung ke fakta. Pada pertanyaan lain, AI hanya memilih ID topik dari daftar terbatas; semua paragraf yang ditampilkan disusun server dari fakta dan aturan sistem. AI tidak membuat angka, URL atau klaim medis baru.
- Porsi satu, setengah dan seperempat kemasan mengikuti jumlah sajian eksplisit. Jumlah sajian yang belum diketahui tidak ditebak. Nilai tidak tersedia tetap null. Total gula tidak dianggap sama dengan gula tambahan/bebas.

## Bukti

36 uji unit akhir lulus, 0 gagal. Tiga kasus Nara mencakup total kemasan, setengah kemasan, input terbatas, ketidakpastian alergen/medis dan nilai serat yang tidak tersedia. Log lokal: `/tmp/nara-final-unit.log`.

Uji nyata pemilihan konteks melalui konfigurasi 9Router yang sudah ada berhasil dengan mode AI_GUIDED untuk pertanyaan “Kenapa minuman ini perlu dibandingkan?”. Konteks yang dipilih: decision dan sugar; angka tetap 19 g dan 38% dari bacaan Golda serta profil uji. Log lokal: `/tmp/nara-live.log` dan `/tmp/nara-live-answer.json`. Uji ini memakai bacaan foto nyata yang dihasilkan tahap sebelumnya, bukan mengulang pengukuran akurasi OCR.

Build Docker produksi akhir dan pemeriksaan tipe lulus; image akhir berjalan di localhost:3001. Sebanyak 18 kasus browser sebelumnya lulus dalam suite lengkap. Kasus Nara akhirnya lulus setelah penunjuk alert pengujian dipersempit dan viewport uji offscreen dibuat benar-benar tidak beririsan. Tidak ada perbaikan runtime yang diperlukan dari kegagalan penyiapan uji tersebut. Pengambilan capture akhir juga lulus (1 kasus, 7,7 detik): `/tmp/nara-browser-capture-final.log`.

Capture pada `.impeccable/review/nara/` menguji UI dengan respons ekstraksi terkontrol dan endpoint penyimpanan/jawaban aplikasi nyata: `thinking-390.png`, `reduced-motion-390.png`, `answer-{320,390,768,1440}.png`, `error-390.png` dan `long-question-320.png`. Respons 503 terkontrol hanya menguji pemulihan, bukan gangguan nyata penyedia. Gerak terukur berubah pada dua sampel transform, berhenti ketika benar-benar di luar viewport dan tidak memakai animasi saat reduced motion. Isolasi riwayat pengguna lain (404), origin asing (403), panjang input (400), pemulihan retry, fokus jawaban dan tombol tutup, serta tidak ada overflow horizontal pada empat ukuran berhasil diperiksa.

Pemindaian pola dijalankan sekali untuk refinement ini: nol temuan utama, 95 advisori pada CSS incumbent dan ukuran lokal. Tidak dilakukan penggantian token atau perbaikan drift lama di luar scope. Pemeriksaan tipe terpisah lulus.

Review akhir Impeccable independen: **SHIP**, lima bagian kontrak lengkap, tanpa perbaikan material pada scope extension ini. Semua delapan capture dibuka ulang setelah pengambilan final. Review berdasarkan source, capture dan log, tanpa menjalankan browser independen. Tidak ada kartu kualitas baru atau gate piksel beranda yang diterapkan pada refinement berbasis kode ini.

Akun terdaftar sementara dari suite browser beserta sesinya sudah dihapus; akun pengguna tidak disentuh.

## Batas

Nara adalah penjelas label kontekstual, bukan chat umum atau konsultasi medis. Pilihan topik dapat kurang sesuai untuk pertanyaan ambigu. Pertanyaan cepat tersedia jika pertanyaan bebas belum dapat diproses. Jaringan/provider tetap dapat gagal; tidak ada janji bebas kesalahan. Belum diuji kamera fisik atau semua perangkat dan pembaca layar. Nama Nara bukan klaim merek eksklusif. Tidak ada raster baru atau perubahan aset beranda.
