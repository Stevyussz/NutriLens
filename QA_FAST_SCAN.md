# QA hasil foto dan sumber produk

17 Oktober 2026, Asia/Jakarta. Target akhir: aplikasi produksi Docker di localhost:3001. Identitas Indeks Belanja dipertahankan. Perubahan ini merupakan refinement berbasis kode; gambar konsep beranda bukan spesifikasi piksel untuk alur scanner.

## Hasil dan alur

Kamera/galeri → baca foto → ringkasan awal → detail atau koreksi opsional → riwayat pribadi. Penelusuran sumber berjalan setelah bacaan tersedia dan tidak menghalangi keputusan awal.

Data yang tidak tercantum tetap null, bukan nol. Serat, harga dan komposisi yang tidak terbaca tidak memaksa pengguna mengisi seluruh formulir. Analisis komposisi lengkap tetap memerlukan data pendukung; ringkasan foto tidak mengklaim mengetahui alergen atau jenis gula tanpa komposisi.

## Regresi foto pengguna

Dua foto Golda Cappuccino dari pengguna disertakan sebagai fixture tanpa perubahan. Panggilan nyata produksi melalui 9Router dan pemeriksaan OCR lokal menghasilkan:

| Fakta label | Hasil produksi |
| --- | --- |
| Takaran saji | 200 ml |
| Sajian per kemasan | 1 |
| Gula total | 19 g per sajian dan per botol |
| Natrium | 80 mg |
| Energi | 180 kkal |
| Protein | 2 g |
| Lemak jenuh | 5 g |
| Serat | Tidak tersedia / null |

Ekstraksi terukur 9,693 detik pada satu panggilan, dengan status ROUTER_CROSSCHECKED. Ini bukti regresi satu produk, bukan tolok ukur akurasi populasi atau jaminan waktu respons. OCR lokal yang tidak menemukan nilai tidak lagi menghapus angka vision yang valid; pertentangan angka eksplisit tetap memerlukan pemeriksaan.

## Penelusuran dan keputusan

Aturan deterministik menghitung konteks gula/natrium dari fakta tersedia dan batas profil. Persentase memakai dasar profil yang terlihat. Gula total tidak disamakan dengan gula tambahan atau gula bebas. Tidak ada sertifikasi sehat atau aman secara medis.

Penyedia penelusuran saat ini: katalog lokal dengan atribusi, pencarian terstruktur Open Food Facts, dan indeks merek resmi WINGS. AI memilih ID dari kandidat yang benar-benar ditemukan. URL, angka dan kepastian identitas tidak diserahkan kepada teks buatan AI. Sumber internet tidak menimpa fakta foto dan tidak otomatis mengisi nilai yang hilang.

Uji produksi menemukan Golda Coffee pada indeks resmi WINGS serta kandidat katalog lokal. Pemilihan sumber melalui ROUTER_AI berhasil. Open Food Facts langsung mengembalikan 503 pada uji akhir, sehingga status PARTIAL dan batas penelusuran ditampilkan. Kecocokan merek resmi bukan bukti barcode, varian, formulasi atau kandungan gizi yang identik. Tidak ada pencarian web universal, verifikasi BPOM, stok atau harga terkini yang diklaim.

Pengambilan sumber dibatasi ke origin HTTPS tetap, timeout dan cache terbatas; tidak menjalankan skrip halaman. Pencarian memiliki batas frekuensi. Perbandingan nutrisi memerlukan kecocokan porsi dan satuan; tidak mengasumsikan gram sama dengan mililiter.

## Verifikasi

- 33 uji unit lulus, 0 gagal: kontrak vision, konflik OCR, keputusan foto, identitas sumber, konversi satuan dan pembatasan pilihan AI.
- 18 uji browser produksi lulus. Setelah perbaikan terakhir pembaca indeks resmi WINGS, tiga uji browser terdampak kembali lulus; pengambilan sumber nyata dan dua foto pengguna juga diuji ulang pada image produksi akhir.
- Build Docker produksi dan pemeriksaan tipe lulus; image akhir sudah dijalankan di localhost:3001.
- Koreksi satu angka, penyimpanan dan pemulihan riwayat, serta penolakan akses riwayat pengguna lain lulus. Koreksi diberi asal yang jelas, sementara teks foto asli tetap tersedia.
- Loading, kegagalan dan retry sumber tidak mengubah angka label atau memblokir ringkasan. Nilai hilang tetap terlihat sebagai belum tersedia.
- Capture produksi 320, 390, 768 dan 1440 px diperiksa. Review akhir independen: SHIP, tanpa perbaikan material tersisa pada cakupan ini. Pemeriksaan pola otomatis untuk refinement ini menghasilkan nol temuan.

Bukti lokal berada di `.impeccable/review/fast-photo/`: Golda empat ukuran dan sumber diperluas memakai pembacaan nyata. Capture `missing-sugar-controlled-*`, `optional-correction-390.png`, `corrected-source-failure-390.png`, `history-controlled-390.png` dan `restored-controlled-390.png` memakai respons OCR atau kegagalan sumber terkontrol untuk menguji keadaan UI, dengan penyimpanan aplikasi nyata. Respons terkontrol bukan bukti ketepatan OCR.

Log sesi lokal: `/tmp/bongkar-connected-unit.log`, `/tmp/bongkar-connected-browser.log`, `/tmp/bongkar-connected-final-browser.log`, `/tmp/bongkar-connected-final-build.log`, dan `/tmp/bongkar-connected-final-live.log`. Artefak lokal bukan dependensi aplikasi atau fixture pengujian yang harus diunduh.

## Batas yang masih berlaku

Belum ada evaluasi dataset beranotasi lintas produk, kamera fisik Android/iOS, Safari, pantulan, blur atau semua formulasi lokal. Foto baru dapat memerlukan pengambilan ulang. Sumber pihak ketiga dapat usang atau tidak tersedia; tanggal pemeriksaan dan batas kecocokan tetap terlihat. Riwayat menyimpan fakta dan profil pengguna, bukan foto, dan tidak menaikkan hasil OCR menjadi katalog rujukan tepercaya. Tidak ada klaim data seluruh bahan kimia/produk Indonesia telah lengkap atau AI selalu benar.
