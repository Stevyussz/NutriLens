# Profil personal dan relevansi Nara

18 Oktober 2026, Asia/Jakarta. Ordinary extension of Indeks Belanja.

## Perubahan

Profil tidak lagi meminta anggaran. Alergi tetap terlihat; acuan gula/natrium berada dalam disclosure opsional. Kondisi dan perangkat tetap tersedia. Field anggaran lama diterima opsional untuk kompatibilitas, tetapi tidak dipakai untuk seleksi, prompt AI atau cache. Informasi akun/metadata tidak lagi menjanjikan penyimpanan anggaran.

MongoDB memilih kategori dan ukuran sajian sama, gula minimal 25% lebih rendah, protein minimal setara, serta kemiripan flavor yang sudah dipakai sistem. Hanya harga positif dengan priceSource RETAILER dan URL sumber yang masuk. Kandidat terurut harga naik, lalu relevansi. Harga produk asal tidak wajib. Selisih harga tidak dihitung bila harga asal bukan RETAILER. Pemeriksaan alergi/kondisi tetap berlaku. AI menjelaskan kandidat; ID rekomendasi berasal dari baseline deterministik dan tidak diganti oleh model. Fallback harga/produk rekaan dikosongkan. Cakupan hanya database yang tersedia, bukan termurah seluruh toko atau jaminan stok/harga terkini.

Nara menjawab maksimal tiga topik relevan dalam satu pertanyaan, menghitung setengah/seperempat/jumlah kemasan eksplisit hanya dari jumlah sajian diketahui, serta mempertahankan null/ketidakpastian. Angka berasal dari fakta tersimpan dan perhitungan server. AI memilih topik saat pola pertanyaan tidak dikenali; ini bukan percakapan bebas yang dapat mengetahui konsumsi, kondisi medis atau pasar terkini secara otomatis.

## Bukti

Uji unit: 47 lulus (/tmp/profile-unit.log), mencakup pertanyaan gabungan, dua kemasan dan jumlah sajian belum diketahui. Detector satu kali: 0 primary, 96 advisori pada file CSS incumbent (/tmp/profile-detect.json). Engine sempat perlu diunduh ulang setelah sesi restart. Tidak ada raster atau identitas baru.

Tes integrasi Mongo menggunakan database baru bongkar_test_<timestamp>, dengan guard eksplisit yang melarang cleanup nama database aplikasi. Percobaan pertama tidak memiliki autentikasi; percobaan terautentikasi ditolak batas ruang untuk membuat indeks. Hasil final dicatat setelah ruang cache proyek dipulihkan. Tidak ada database/volume aplikasi dihapus.

## Hasil final

Tes MongoDB dengan fixture inline collectionless lulus (/tmp/profile-mongo-inline-final.log). Tidak ada koleksi/indeks/data persisten yang dibuat untuk tes ini. Fixture memeriksa harga6000,7000,11000 tetap lolos meski argumen budget lama1 dan harga produk asalnull; harga estimasi, URL kosong, dan ukuran sajian berbeda ditolak; selisih harga asalnull tetapnull. Tes indeks database temporer penuh masih terhalang minimum ruang500MB; tidak ada kebijakan MongoDB yang dilonggarkan.

Tiga kasus browser awal lulus (/tmp/profile-browser.log), mencakup penyimpanan profil, acuan opsional, akun/sesi dan Nara. Enam capture produksi profil pada320/390/768/1440 serta reference390 dan devices390 telah dinilai valid oleh reviewer, disposition ship tanpa material fixes. Tidak ada perubahan sistem desain: documenter memeriksa reuse panel/field/disclosure dan mempertahankan8bagian, schema2,10specimen.

Image final dikompilasi, diekspor, dipasang dan sehat. Compose gagal mencatat metadata build pada akhir karena disk penuh; image yang selesai diekspor digunakan untuk deployment. Cache build proyek yang terverifikasi reclaimable dilepas, tanpa menghapus database atau volume aplikasi. Tidak ada klaim bahwa metadata command berhasil. Arsip zip lokal dikecualikan dari konteks Docker.

Regresi pada image final:47/47 unit lulus (/tmp/profile-release-unit.log),21/21 browser lulus dalam3,3menit (/tmp/profile-release-browser.log). Capture profil diproduksi ulang oleh suite final. Layanan app running/healthy setelah deployment. Berkas .env, arsip lokal, .codex, artifacts dan capture review tidak masuk commit.
