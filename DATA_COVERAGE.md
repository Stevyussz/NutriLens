# Cakupan data BongkarLabel

Audit 16 Oktober 2026 terhadap database aktif dan snapshot yang disertakan. Dataset belum lengkap untuk seluruh bahan pangan, produk Indonesia, informasi klinis, atau harga toko.

| Bagian | Cakupan saat audit | Batas cakupan |
| --- | --- | --- |
| Kamus bahan | 7.279 entri unik setelah penggabungan | Nama dan alias taksonomi global, bukan seluruh senyawa kimia atau SDS bahan kimia |
| INS/E-number | 730 entri memiliki kode | Identitas kode tidak menetapkan izin penggunaan, batas kadar, atau keamanan sebuah produk |
| Kategori fungsi aplikasi | 6.758 entri berstatus UNKNOWN | Kategori aplikasi belum dipetakan untuk semua bahan; bahan pangan biasa juga termasuk dalam taksonomi |
| Indeks glikemik | 3 entri memiliki nilai bersumber | Nilai bahan tunggal tidak menjadi GI terukur untuk produk campuran; nilai lain tetap null |
| Produk referensi | 55 label komunitas | Produk untuk pasar Indonesia mencakup produk lokal dan impor; asal produksi belum diklasifikasikan terpisah |
| Kategori produk | Susu olahan 23, minuman kemasan 17, mi instan 6, camilan/biskuit 5, sereal 4 | Belum mencakup seluruh kategori pangan atau seluruh varian merek |
| Harga | 23 observasi IDR berbukti, cocok dengan 1 dari 55 barcode referensi | Belum ada observasi yang otomatis diterapkan sebagai harga per sajian; 55 harga snapshot referensi tetap bertanda ESTIMATE |
| Contoh | 5 kasus ilustratif | Dikecualikan dari populasi referensi dan kandidat pembanding |

Kamus diimpor massal dari 764 node aditif dan 6.654 node bahan Open Food Facts. Hasil impor 7.351 record kemudian digabungkan dengan aturan lokal menjadi 7.279 entri database. Perbedaan jumlah disebabkan penggabungan, bukan jumlah senyawa tambahan yang terverifikasi. Sebanyak 69 aturan lokal memberi konteks interpretasi; jumlah ini tidak berarti seluruh kamus memiliki penjelasan klinis yang mendalam.

Katalog mencakup antara lain Indomie, Ultra, Cimory, Chitato, Indomilk dan merek lain. Penamaan merek/varian merupakan kontribusi komunitas dan belum dinormalisasi sebagai daftar produsen Indonesia. Setiap label referensi memiliki komposisi, ukuran sajian dan enam nilai gizi yang diwajibkan aplikasi. Kelengkapan field tidak membuktikan kebenaran angka atau kesesuaian dengan resep terbaru.

Importer produk saat ini memeriksa maksimal enam halaman hasil Open Food Facts dengan filter pasar Indonesia, lalu menolak record tanpa komposisi, sajian atau enam nutrien lengkap. Ini belum merupakan penarikan seluruh database penyedia. Impor kamus dan observasi harga juga memakai snapshot bertanggal, bukan sinkronisasi langsung pada setiap pembukaan aplikasi.

Belum ada integrasi dataset registrasi BPOM, batas pemakaian aditif per kategori, lembar SDS pemasok, sertifikasi halal, atau feed harga ritel yang menyeluruh. Aplikasi tidak mengklaim data tersebut tersedia. Penambahan cakupan memerlukan sumber yang dapat digunakan dan diverifikasi, normalisasi satuan/varian, serta bukti harga. Field yang belum tersedia tidak diisi dengan angka atau klaim rekaan.

Manifest, timestamp dan atribusi penyedia tersedia di `data/README.md`, `data/dictionary.manifest.json` dan `data/prices.manifest.json`. Panel “Sumber dan cakupan data” pada Kamus bahan membaca jumlah entri dan label langsung dari database; jumlah observasi harga mengikuti snapshot yang dibundel.
