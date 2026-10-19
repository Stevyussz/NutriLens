# Scan satu produk dengan hingga enam foto

Batas kamera dan galeri dinaikkan menjadi 1–6 foto untuk satu produk, maksimal 5 MB per foto. Pengguna tetap dapat membaca satu foto langsung; menambah foto tidak wajib. Bagian depan, komposisi, tabel gizi, dan teks yang terpotong dapat dikirim bersama.

`src/core/scan-photo-limits.ts` menjadi acuan bersama untuk jumlah gambar, ukuran file, dan batas kiriman. API membaca maksimal 30 MiB file ditambah 64 KiB pembungkus multipart. Validasi signature, ukuran dan resolusi tetap berlaku untuk setiap gambar, termasuk gambar keenam. Foto ketujuh ditolak sebelum pemrosesan vision. Pilihan sebelumnya tidak dibuang ketika penambahan lewat galeri ditolak.

Setiap gambar disiapkan secara berurutan untuk mengurangi puncak memori decoding; semua gambar yang lolos tetap dikirim bersama dalam satu permintaan vision. Pengulangan pembacaan kritis tetap mengikuti kebijakan vision yang ada. Prompt meminta identitas satu produk, seluruh foto dibaca bersama, dan angka dari produk/varian berbeda tidak digabungkan. Ini tidak menjamin akurasi vision sempurna atau bahwa komposisi yang tidak terlihat dapat ditebak.

Schema hasil dan riwayat menerima hingga enam metadata gambar. Aplikasi menyimpan hasil/metadata, bukan berkas foto dalam riwayat. Thumbnail dapat membungkus ke baris berikutnya pada layar sempit, tetap bisa diperiksa atau dibuang.

## Verifikasi

- 76/76 uji logika/regresi lulus (`artifacts/nara-final/six-photo-all-unit.log`). Pengujian khusus memeriksa penerimaan enam metadata, penolakan tujuh foto, serta satu permintaan ke penyedia vision uji yang menerima keenam gambar dengan urutan dan dimensi utuh. Respons penyedia pada pengujian tersebut terkontrol, bukan bukti akurasi model nyata pada enam foto produk.
- Pemeriksaan tipe lulus (`six-photo-types.log`). Satu detector pass: 0 temuan utama, 100 advisory yang berasal dari stylesheet yang sudah ada (`six-photo-detector.json`).
- Paket produksi dibangun dan dijalankan (`six-photo-build-final.log`, `six-photo-deploy.log`). Tiga kasus API/hasil/riwayat lulus dalam `six-photo-browser.log`; tiga kasus kamera awal gagal pada penyiapan browser yang tidak terpasang. Setelah test kamera memakai executable browser sistem yang sama dengan konfigurasi utama, ketiganya lulus (`six-photo-camera.log`). Keenam skenario berbeda tersebut mencakup pengambilan enam frame JPEG, pencampuran kamera-galeri, hapus/ganti, izin kamera ditolak, file berlebih/besar, pemeriksaan gambar keenam, hasil langsung tanpa formulir wajib, dan riwayat enam metadata.
- Capture `.impeccable/review/multi-photo/` mencakup 320/390/768/1440 px serta pesan batas pada 390 px. Frame kamera berwarna hijau berasal dari perangkat kamera uji Chrome; bukan aset aplikasi atau bukti transkripsi produk nyata. Capture detail pesan batas ditambahkan agar navigasi tetap tidak menutupi bukti saat screenshot full-page (`six-photo-gallery-detail.log`, satu pengulangan lulus).
- Finish reviewer: **ship**, tanpa temuan material pada ekstensi enam foto; seluruh enam capture valid (`six-photo-finish-review.md`). Documenter mengonfirmasi tidak ada perubahan sistem desain yang memerlukan DESIGN.md/sidecar. Image akhir `sha256:43e8131862bfa0512f895e261a54da5eae1ee6b230262827c1ff66e4fd1d0e97` berstatus sehat (`six-photo-health.log`).
