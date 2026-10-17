# BongkarLabel

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Konsumen umum Indonesia yang ingin memahami label pangan. Situasi utama yang disebut pemilik adalah memotret produk di depan kulkas minimarket dan mendapatkan ringkasan yang membantu mengambil keputusan tanpa membaca penjelasan panjang terlebih dahulu.

## Product Purpose

Membaca komposisi dan informasi gizi dari foto, menunjukkan konteks sumber gula dan bahan, lalu menyajikan hasil berdasarkan profil pengguna. Rincian dapat dibaca kembali melalui riwayat pribadi.

## Operating Context

Kamera langsung adalah metode utama. Galeri menjadi cadangan, sedangkan teks dan formulir lengkap melayani input atau koreksi. OCR langsung membuka ringkasan awal dari angka yang tersedia. Koreksi bersifat opsional dan data yang tidak tercantum tetap kosong; analisis komposisi lengkap merupakan jalur lanjutan yang memerlukan pemeriksaan dan konfirmasi. Pengguna dapat melanjutkan sebagai tamu atau menggunakan akun umum yang opsional.

## Capabilities and Constraints

- Satu atau dua foto komposisi dan tabel gizi dari produk yang sama.
- Analisis deterministik sumber gula dan profil tetap menjadi dasar; AI vision dan penjelasan menggunakan penyedia yang dikonfigurasi, saat ini 9Router.
- Ringkasan hasil mendahului tab komposisi, sumber gula dan alternatif. Riwayat menyimpan hasil dan profil saat analisis, bukan foto.
- Kamus dan katalog memakai data komunitas bersumber, dengan tanggal dan batas cakupan yang dapat diperiksa.
- Setelah ringkasan foto muncul, pencarian produk berjalan di belakang layar melalui katalog lokal, Open Food Facts langsung, dan direktori produsen WINGS. AI memilih sumber yang relevan dari daftar yang ditemukan; aturan sistem memeriksa merek, nama varian dan kesesuaian satuan. Identitas merek tidak membuktikan barcode atau formulasi sama. Data internet tidak mengisi nilai kosong atau menimpa angka label secara otomatis. Sumber gagal dan tanggal salinan ditampilkan dengan jelas.
- Harga yang tidak diketahui tetap kosong; jangan mengarang biaya atau penghematan.
- Hasil OCR perlu dicocokkan dengan kemasan. Aplikasi bukan diagnosis atau jaminan keamanan medis.
- Navigasi mobile harus nyaman dan halaman aplikasi tidak memerlukan scroll panjang untuk menyelesaikan tugas utama.

## Brand Commitments

Nama produk: BongkarLabel. Bahasa utama: Indonesia. Tidak ditujukan khusus untuk juri. Pemilik meminta penggantian total identitas visual pada 17 Oktober 2026, menggunakan Impeccable saja. Warna biru dan navy dikecualikan. Palet, tipografi dan komposisi selain batas tersebut terbuka untuk pembaruan.

## Evidence on Hand

Fungsi dan alur yang ada: src/app dan src/components. Data dan batas cakupan: DATA_COVERAGE.md, OCR_VALIDATION.md dan DATA_REFRESH.md. Bukti QA sebelumnya: QA_FLOW.md dan QA_REPORT.md. Fixture sintetis yang jelas bertanda label uji: tests/fixtures. Dua foto Golda dari pengguna tersedia sebagai fixture regresi pembacaan, bukan aset promosi atau bukti akurasi populasi. Tidak ada testimoni atau angka pengguna untuk klaim promosi.

## Product Principles

- Foto label adalah titik awal yang paling mudah ditemukan.
- Ringkas terlebih dahulu, rincian tersedia saat diperlukan.
- Fakta, estimasi, nilai hilang dan keterbatasan sumber dibedakan secara terbuka.
- Profil dan riwayat bersifat pribadi; akun tidak menjadi penghalang membaca label.
- Tidak mengorbankan alur yang sudah berfungsi demi tampilan baru.

### Nara: penjelasan lanjutan

Nara adalah teman baca label BongkarLabel. Gerak garis pemindai menandai proses yang benar-benar berjalan, tanpa persentase atau tahapan rekaan. Di ringkasan foto, pengguna dapat membuka percakapan opsional, memilih pertanyaan cepat atau menulis pertanyaan hingga 500 karakter. Jawaban memakai hasil foto milik pengguna dan profil saat hasil disimpan. Fakta disusun server; AI dapat memilih konteks dari ID topik terbatas, tanpa menulis ulang angka, diagnosis atau klaim medis. Percakapan bersifat sementara di halaman, bukan riwayat chat permanen.
