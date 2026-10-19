# Keputusan belanja, pembanding relevan, dan edukasi

Ekstensi ini mempertahankan identitas Indeks Belanja dan alur camera-first. Hasil gula/porsi tetap langsung tersedia; pencarian pembanding berjalan terpisah. Pilihan bernama muncul hanya bila ada angka gula yang dapat dibandingkan pada ukuran yang sama. Tidak ada skor medis baru atau jaminan bahwa satu produk lebih sehat dalam semua hal.

## Dasar rekomendasi

- Sumber: katalog Indonesia tersimpan, pencarian kategori pada API resmi Open Food Facts, dan maksimal 40 foto terbaru milik pengguna yang sama. Pencarian publik dibatasi host tetap, ukuran respons, tenggat dan laju permintaan; kegagalan diberi cache singkat agar tidak terus menunggu sumber yang sedang bermasalah.
- Jenis dan bentuk harus sesuai: kopi siap minum tidak dibandingkan dengan kopi bubuk; gram tidak dianggap mililiter. Produk alkohol, formula bayi, dan es krim dengan nama rasa kopi tidak otomatis menjadi pengganti minuman kopi.
- Gram gula dihitung pada volume/berat yang sama dengan hasil aktif. Basis per sajian dan per 100 g/ml tidak dicampur. Nama bahan tidak dijumlahkan lagi ke gula total.
- Kandidat memerlukan sumber dan tanggal yang valid, gula diketahui, relevansi Indonesia, serta bukan varian produk yang sama. Versi katalog dengan gula bertentangan, nilai gizi tak masuk akal, tanggal mendatang atau lebih dari setahun tidak dipakai.
- Penyaringan memakai profil yang tersimpan bersama scan, sama dengan konteks riwayat/Nara yang sudah ada. Kecocokan alergi umum Indonesia/Inggris termasuk tag plural mengeluarkan kandidat. Jika ada alergi pada profil, komposisi kosong tidak dianggap bebas alergen. Ini bukan pencocokan alergi klinis yang menyeluruh atau jaminan bebas kontaminasi silang.
- Prioritas: pertukaran zat gizi yang diketahui lebih sedikit, lalu gula lebih rendah. Natrium/lemak jenuh lebih tinggi, protein lebih rendah, dan data yang kosong tetap dijelaskan. Tidak ada klaim termurah seluruh pasar atau pengurangan risiko penyakit yang dihitung dari satu produk.

## Koreksi basis katalog lama

Importer v1 sudah mengalikan angka per 100 g/ml dengan ukuran sajian, tetapi mempertahankan tag basis aslinya. `catalogueSchema` memperbaiki tag pada pembacaan data lama tanpa mengubah angkanya dan secara idempotent. Importer baru menulis basis PER_SERVING beserta normalizationVersion 2. Record v2 yang memang per 100 g/ml tetap mempertahankan basis tersebut. Berkas snapshot dan hash sumber tidak diubah; tidak ada angka gizi rekaan untuk mengisi kolom kosong.

## Harga dan percakapan

Harga kandidat dimuat terpisah dan hanya dapat diminta untuk ID yang lolos penyaringan pada hasil milik pengguna. Harga bersumber harus sesuai barcode, ukuran, mata uang, tanggal dan satuan paket; estimasi AI tetap dilabeli estimasi. Ukuran kemasan dari judul harus tunggal dan bukan multipack; ukuran parsial/bertentangan tidak disatukan. Takaran saji tidak otomatis menjadi isi kemasan. Jika ukuran belum cukup pasti, aplikasi menjelaskan mengapa harga belum dapat ditaksir, bukan menulis harga palsu.

Nara mendapat kandidat, alasan, pertukaran gizi, sumber dan ukuran pembanding yang sama. Angka kandidat memakai referensi kuantitas milik server. Pertanyaan harga dapat membawa estimasi kandidat dan produk asal secara terpisah; keduanya tidak boleh tertukar. Kegagalan AI tetap dapat memakai keputusan deterministik yang menyebut kandidat berbasis bukti.

## Pengalaman pengguna

Ringkasan memberi petunjuk produk pembanding dan jalan langsung ke tab Pilihan pengganti. Kandidat pertama dibuka; pilihan tambahan, kekurangan/sumber, dasar harga dan bekal belanja dapat dibuka saat diperlukan. Saat tab dibuka, fokus berpindah ke bagian pembanding. Edukasi menjelaskan penyamaan porsi, pertukaran gizi, dan batas klaim less sugar. Loading, error/retry, data kurang dan tidak ada kandidat merupakan keadaan nyata, bukan kartu contoh.

## Bukti pengujian

Fixture UI dan foto tersimpan pada tes bukan hasil vision baru atau harga pasar nyata. Catatan katalog sumber yang digunakan dalam tes data nyata dapat ditelusuri lewat sourceUrl dan retrievedAt. Dalam pemeriksaan pengembangan, endpoint pencarian Open Food Facts sempat mengembalikan halaman pemeliharaan; layanan tidak mengarang hasil pencarian sebagai penggantinya.

## Verifikasi akhir 19 Oktober 2026

- 74/74 uji logika/regresi lulus (`artifacts/nara-final/alternatives-release-unit.log`); 11/11 kasus pembanding diuji kembali setelah penambahan pemeriksaan respons cadangan (`alternatives-release-specific.log`).
- Sepuluh skenario browser pada paket produksi lulus (`alternatives-release-browser.log`): Nara/konteks, konsistensi gula, foto tanpa formulir wajib, koreksi/riwayat pribadi, katalog, pembanding, harga, sumber, dan PWA. Ini bukan pengujian pemasangan pada perangkat Android/iOS fisik.
- Pemeriksaan nyata pada endpoint aplikasi menemukan Oatside Caramel Macchiato Oat Milk dari snapshot Indonesia: 14 g gula versus Golda 19 g pada 200 ml, dengan komposisi pembanding belum tersedia dan ukuran paket belum terbukti. Rekomendasi tidak mengarang harga paket untuk kasus ini. Pencarian katalog daring sedang tidak tersedia; sumber/tanggal snapshot tetap ditampilkan.
- Respons Nara nyata berstatus AI_GUIDED, menyebut kandidat, perbandingan 14 g/19 g pada 200 ml, dan pemeriksaan komposisi serta klaim kemasan (`alternatives-live.json`, `alternatives-live.log`). Inputnya fixture label tersimpan; bukan transkripsi vision baru atau validasi formula dari produsen.
- Satu detector pass menghasilkan 0 temuan utama dan 100 advisory pada stylesheet yang sudah ada (`alternatives-detector.json`). Review visual mengoreksi satu masalah keterbacaan satuan pada ponsel; bukti ulang dan verdict tersimpan dalam `artifacts/nara-final/alternatives-finish-*.md`. Identitas/token desain dipertahankan; documenter menyatakan tidak perlu perubahan DESIGN.md atau sidecar.
- Rute chat memberi tenggat 120 detik untuk pencarian pembanding, estimasi opsional, dan sintesis; ringkasan gizi tidak menunggu proses tersebut. Referensi angka kandidat memakai nama tanpa digit agar lolos pemeriksa kuantitas yang sama. Saat penyedia gagal, keputusan cadangan tetap menyebut perbandingan konkret dan kekurangan data.

Perbaikan visual akhir: dua kasus browser pembanding diulang dan lulus pada image akhir `sha256:c24315a0820dcfd3551fc701a759820a23dafecb0e7a1b2fc93fe78ff3a633a4` (`alternatives-visual-fix-browser.log`, `alternatives-visual-fix-build.log`). Pemeriksaan baris teks memastikan nilai natrium dan satuannya tetap satu baris pada 320/390/768/1440 px. Reviewer menilai satu temuan keterbacaan **resolved**, disposition **ship**, pada lima recapture; verdict ini mencakup perbaikan tersebut, bukan audit ulang seluruh aplikasi. Container akhir sehat. Recheck documenter mengonfirmasi selector final tetap mengikuti sistem desain yang ada.
