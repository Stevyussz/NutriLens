# QA Nara, sumber gula, dan keputusan cepat

Pembaruan ini mempertahankan identitas Indeks Belanja. Fokusnya adalah ketepatan dasar hitung, penjelasan yang berguna, dan percakapan yang memahami konteks.

## Aturan data

Gula total pada tabel sudah mencakup gula alami dan tambahan. Nama gula dalam komposisi tidak dijumlahkan lagi ke gram tabel. Prinsip ini mengikuti [penjelasan FDA tentang gula total dan tambahan](https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label).

- Angka per sajian dan jumlah sajian yang terbaca menentukan total kemasan. Jumlah sajian yang belum diketahui tidak diasumsikan satu.
- Pertanyaan “kalau setengah?” mengikuti kemasan aktif. “Setengah sajian” tetap memakai dasar sajian. Jika jumlah sajian per kemasan belum diketahui, sistem memberi klarifikasi; AI tidak boleh menggantinya menjadi setengah sajian.
- Pencocokan nama memakai alias utuh terpanjang dan menghapus duplikasi. Laktosa dikenali sebagai gula susu, tetapi namanya tidak membuktikan apakah alami dalam produk atau ditambahkan. Maltodekstrin tidak otomatis dikategorikan sebagai gula.
- Urutan bahan tidak menjadi gram, kadar gula bebas, GI produk, atau bukti manipulasi. Nilai setiap bahan memerlukan informasi formulasi yang tidak tersedia dari daftar nama saja.
- Membagi botol menjadi dua kesempatan minum tidak mengurangi total gula jika seluruhnya tetap diminum.

[WHO Healthy Diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet) dipakai untuk prinsip pola makan dan pembatasan gula bebas. Gula total label tidak diubah menjadi ukuran gula bebas. [Codex Standard for Sugars CXS 212](https://www.fao.org/fao-who-codexalimentarius/sh-proxy/en/?lnk=1&url=https%3A%2F%2Fworkspace.fao.org%2Fsites%2Fcodex%2FStandards%2FCXS+212-1999%2FCXS_212e.pdf) menjelaskan sirup glukosa sebagai larutan sakarida dari pati/inulin; bukan jaminan glukosa murni atau persentase tertentu.

## Alur hasil dan percakapan

Saran porsi/pembanding muncul tepat setelah judul dan tetap ada saat AI berhasil, sedang memproses, atau gagal. Penjelasan otomatis dibatasi satu paragraf, maksimal 65 kata dan 650 karakter setelah substitusi angka. Keluaran terlalu panjang ditolak utuh, bukan dipotong di tengah klaim. Analogi sendok berada dalam penjelasan metode. Komposisi, sumber gula, gizi dan bukti asli tetap dapat dibuka terpisah.

Nara menyusun jawaban dari pertanyaan, fakta tersimpan, profil saat scan, dan maksimal enam pasangan percakapan terakhir. AI tidak lagi hanya memilih paragraf topik. Edukasi kebiasaan makan dan kesehatan umum diperbolehkan; diagnosis, resep, dosis obat dan jaminan aman personal tidak dibuat. Sumber/otoritas tidak perlu diulang pada setiap jawaban.

Kuantitas dalam teks model harus memakai referensi server yang menyertakan nama zat, satuan, dan dasar konsumsi. Digit langsung dan nama referensi yang tidak tersedia ditolak. Properti bawaan objek tidak dapat menjadi referensi. Pemeriksaan ini bukan bukti bahwa setiap pernyataan kualitatif model pasti benar.

Metadata topik dan saran pertanyaan bersifat opsional: disaring, dideduplikasi dan dibatasi, sehingga tidak menggugurkan penjelasan yang valid. Model tidak dapat mengganti identitas produk atau penanda asal jawaban milik server. Isi paragraf, referensi angka, batas ringkasan, dan klarifikasi porsi tetap wajib lolos.

Ada maksimal satu permintaan perbaikan format, dengan pemeriksaan yang sama dan tanpa loop. Panggilan awal memakai batas 45 detik, perbaikan 10 detik, dan rute 90 detik untuk mencakup jalur estimasi harga opsional. Hasil gizi dan saran deterministik tidak menunggu penjelasan tersebut. Kegagalan provider tetap menampilkan fakta cadangan dengan penanda asal yang jelas.

Riwayat harus dimiliki pengguna yang meminta; sesi, origin, ukuran input dan laju permintaan tetap diperiksa. Chat direset saat ID riwayat berubah. Aplikasi tidak menyimpan database chat terpisah; konteks terbaru dapat diproses penyedia AI. Log server hanya memakai kategori kegagalan tetap, tanpa pertanyaan, profil, teks label atau kredensial.

## Bukti dan batas pengujian

- 63 uji unit/regresi lulus: `artifacts/nara-final/unit.log`; pemeriksaan tipe lulus: `artifacts/nara-final/types.log`.
- Kasus mencakup total gula yang tidak dihitung dua kali, alias bertumpang tindih, laktosa tunggal/campuran, maltodekstrin, satu/beberapa/jumlah sajian tidak diketahui, identitas zat pada referensi, batas ringkasan, satu perbaikan format, metadata opsional, dan referensi properti bawaan yang ditolak.
- Tujuh kasus browser berbeda telah lulus pada paket produksi: hasil/porsi/chat, koreksi/riwayat pribadi, katalog, harga, sumber, dan laktosa. Pengulangan pada lingkungan yang dipulihkan: tujuh kasus lulus di `artifacts/nara-final/browser.log`. Capture berada di `.impeccable/review/nara-context/` pada lebar 320/390/768/1440, serta loading/error/retry dan laktosa pada 390.
- Respons model nyata dan percakapan browser dicatat terpisah dalam `live.json`; capture terkontrol hanya membuktikan tampilan dan interaksi. Komposisi ilustratif dalam fixture bukan klaim transkripsi komposisi foto pengguna. Pengujian ini tidak mengukur akurasi vision populasi atau memastikan keamanan medis universal.
- Satu detector pass pada AskNara/PhotoResult mengembalikan tanpa temuan (log sementara hilang saat host dimulai ulang; detector tidak dijalankan kedua kali). NaraBrief yang diekstrak setelahnya dinilai secara manual dalam review.

## Kondisi lingkungan

Pemeriksaan pernah menemui beban host sekitar 29, penggunaan swap sekitar 9,2 GiB, dan kurang dari 1 GiB memori tersedia. Pengujian berat kemudian dijalankan bergiliran. Permintaan sederhana melalui koneksi Docker yang sama berhasil HTTP 200 dalam 2.198 ms, sedangkan sejumlah permintaan Nara yang panjang melewati batas lama 22 detik. Batas standar provider kini 45 detik; ini tidak berarti setiap jawaban AI instan.

Beberapa gambar Docker berhasil diekspor tetapi penulisan metadata Compose sempat gagal ketika disk penuh. Build berikutnya memakai metadata sementara di RAM dan cache build tugas ini dilepas secara terpilih. Database, volume aplikasi, file pengguna, dan pengaturan jaringan tidak dihapus atau diubah.

## Verifikasi rilis lanjutan

Pengujian AI nyata di `artifacts/nara-final/live.ts` selesai dengan sukses terhadap image produksi `88e09e42e077`: empat pertanyaan berbeda, dua variasi jumlah sajian, ringkasan otomatis dan dua tindak lanjut melalui browser. `live.json` sudah diperbarui setelah perbaikan guard jumlah sajian, dengan provenance data contoh. Jawaban setengah kemasan untuk satu sajian menyebut 9,5 g gula dan 2,5 g lemak jenuh; untuk dua sajian, setengah kemasan mengandung 19 g gula. Jumlah sajian tidak diketahui menghasilkan klarifikasi deterministik, bukan perubahan dasar hitung.

Reviewer akhir menilai kelima temuan material resolved dan memberi `disposition: ship` khusus untuk kelima perbaikan tersebut. Ini bukan sertifikasi ketepatan AI atau vision universal. Pemeriksaan dokumentasi mempertahankan DESIGN.md, sidecar dan token. Deskripsi lama tentang satu paragraf jawaban porsi dan saran pertanyaan tetap merupakan drift perilaku yang dicatat tanpa menulis ulang sistem visual.

Saat host dimulai ulang, proses, log sementara dan metadata Git di /tmp hilang. Bukti pengulangan kini berada di artifacts/nara-final. 9Router sempat mati lalu kembali aktif; uji nyata di atas dijalankan setelah koneksi pulih.

Build ulang awal untuk koreksi indikator sempat dibatalkan ketika disk kembali penuh. Cache COPY dan npm milik build yang dihentikan dilepas secara terpilih (sekitar 805 MB), tanpa menghapus database atau image aktif. Setelah pengguna menyediakan tambahan ruang, build akhir berhasil dan aplikasi dipasang ulang. NaraBrief kini memakai isFetching untuk mencegah indikator berpikir pada query OCR historis yang dinonaktifkan; koreksi ini sudah terpasang pada image aktif.

## Penyelesaian Docker

Setelah ruang bebas menjadi 6,4 GB, build Docker selesai dengan exit 0 (`artifacts/nara-final/build-final.log`). Container app dipasang ulang dan berstatus healthy pada image `sha256:ccbb6b9a9aceea3d49024817a63be785dc0350cfa1249dcc0f83f6e8fd40e12f`. Bukti pemasangan: `artifacts/nara-final/deploy-final.log`.

Pemeriksaan khusus OCR historis lulus: query AI yang dinonaktifkan tidak mengirim permintaan dan tidak menampilkan indikator berpikir; hasil tetap terbaca. Bukti: `artifacts/nara-final/ocr-idle.log`, capture `ocr-idle-390.png`. Respons riwayat dikontrol di browser, tanpa mengubah engine di database. Pemeriksaan sempat salah mengharuskan wrapper AI kosong tetap terlihat; asumsi pemeriksaan diperbaiki menjadi keberadaan wrapper dan ketiadaan indikator, tanpa perubahan kode aplikasi.

Pengulangan dua kasus browser Nara pada image akhir juga lulus (`artifacts/nara-final/browser-final.log`), mencakup hasil ringkas di lebar 320/390/768/1440, percakapan, loading/error/retry, dan konsistensi laktosa. Ini melengkapi 63 tes regresi, pemeriksaan tipe, tujuh alur browser dan pengujian AI nyata yang sudah dicatat sebelumnya.
