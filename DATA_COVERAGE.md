# Cakupan data BongkarLabel

Pembaruan 16 Oktober 2026. Angka berikut berasal dari snapshot yang dibundel; panel aplikasi menghitung jumlah aktual dari MongoDB. Cakupan diperluas lewat ekspor massal penyedia, bukan penambahan produk satu per satu.

| Bagian                   | Cakupan                                                                   | Batas                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Kamus bahan              | 7.279 entri setelah penggabungan, 730 berkode INS/E-number                | Taksonomi pangan global, bukan seluruh senyawa kimia atau SDS                                             |
| Datasheet penyedia       | 964 deskripsi, 684 daftar fungsi teknologis, 78 tautan evaluasi EFSA      | Hanya field yang tersedia dari penyedia; rujukan evaluasi bukan keputusan izin Indonesia                  |
| Kategori fungsi aplikasi | 6.465 UNKNOWN, berkurang dari 6.758                                       | Bahan biasa dan fungsi yang belum dipetakan tetap UNKNOWN                                                 |
| GI bersumber             | 3 entri                                                                   | Tidak menjadi GI terukur produk campuran                                                                  |
| Katalog pasar Indonesia  | 7.899 produk bernama dari 8.290 baris ekspor negara dari staging penyedia | Termasuk impor; tidak semuanya diproduksi di Indonesia atau memiliki label lengkap                        |
| Referensi pembanding     | 89 label lengkap, sebelumnya 55                                           | 52 label lengkap dari ekspor terbaru + 37 referensi terdahulu dengan tanggal sumber asli                  |
| Harga                    | 23 observasi IDR dengan ID bukti dari 25 record penyedia                  | Cocok dengan 11 produk katalog, tetapi hanya 1 dari 89 referensi; tidak otomatis menjadi harga per sajian |
| Contoh ilustratif        | 5 kasus                                                                   | Dikecualikan dari populasi referensi dan kandidat pembanding                                              |

Referensi lengkap terdiri atas 35 susu olahan, 23 minuman kemasan, 13 camilan/biskuit, 10 mi instan, 7 sereal, dan 1 bumbu/saus. Harga per sajian referensi tetap bertanda ESTIMATE; pengguna memasukkan harga pembeliannya sendiri. Bukti komunitas dan kelengkapan field tidak menjamin kebenaran angka, varian, resep terkini, atau harga ritel saat ini.

Ekspor katalog menyertakan nama, merek, barcode, komposisi, nilai gizi yang tersedia, alergen, kode aditif, label, asal dan tempat produksi yang dinyatakan penyedia. Nilai yang hilang tetap null. Hanya satu kolom gizi dengan basis dan satuan yang jelas dikonversi; tidak mencampur field dari versi label berbeda. Record tanpa nama, kode valid, atau berstatus usang tidak dipublikasikan. Checksum ekspor: `8be7df55ce52c8c6c818d83028ff9631e0be717d172ae47c81257064d1a29af1`.

Kamus berasal dari 764 node aditif dan 6.654 node bahan Open Food Facts, menghasilkan 7.351 record sebelum penggabungan aturan lokal. Deskripsi, fungsi, Wikidata, CIQUAL, USDA FDC dan evaluasi EFSA disalin hanya bila tersedia dan sesuai format. Tautan BPOM BTP dan Codex GSFA membantu penelusuran lanjutan; tautan itu bukan bukti bahwa dataset regulasinya sudah diimpor.

Belum tersedia integrasi menyeluruh untuk registrasi BPOM, batas pemakaian aditif per kategori Indonesia, SDS pemasok, sertifikasi halal, seluruh produk lokal Indonesia, atau feed harga ritel terkini. Tidak ada angka, status legal, sertifikasi maupun klaim klinis yang dibuat untuk menutup kekurangan tersebut. Pembacaan foto juga tidak mengisi angka yang hilang; lihat [OCR_VALIDATION.md](OCR_VALIDATION.md).

Provenans, tanggal dan checksum: `data/catalogue.manifest.json`, `data/dictionary.manifest.json`, `data/prices.manifest.json`. Lisensi dan cara pembaruan ada di [data/README.md](data/README.md).

Audit asal sumber: ekspor katalog bundel berasal dari server staging `.net`, bukan server produksi `.org`. Pembaruan otomatis kini hanya menerima produksi; snapshot staging tidak dilabeli terkini/terverifikasi. Dua nilai gizi parsial yang tidak sesuai massa sajian dikosongkan, dan satu record parsial tambahan dipertahankan setelah nilai di luar batas dikosongkan. Lihat [DATA_REFRESH.md](DATA_REFRESH.md) untuk jadwal, gerbang kualitas dan kondisi kegagalan.
