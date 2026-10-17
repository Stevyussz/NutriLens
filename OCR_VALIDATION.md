# Validasi pembacaan foto

Pembaruan 17 Oktober 2026. Pembacaan foto langsung membuka ringkasan awal dengan batas bukti yang jelas; koreksi opsional. Analisis komposisi lengkap tetap memerlukan pemeriksaan dan konfirmasi. Tidak ada klaim akurasi 100% untuk seluruh foto atau kemasan.

## Pembaruan 9Router dan kamera langsung

Kamera langsung menjadi jalur utama, dengan galeri sebagai cadangan. Foto hanya dikirim saat pengguna menekan Baca foto label. Provider 9Router menggunakan model vision yang tersedia pada router lokal; OCR Tesseract tetap menjadi pemeriksaan tambahan. Saat router dipilih, foto dikirim ke penyedia upstream yang dikonfigurasi di 9Router.

Pemeriksaan Docker melalui socket privat lulus 5/5: label per sajian, per 100 g dengan desimal, rotasi, nilai serat yang hilang tetap null, serta penolakan foto terlalu kecil. Empat ekstraksi yang diterima memakai ROUTER_CROSSCHECKED. Bukti lokal: `artifacts/vision-router-docker-benchmark.json`.

Alur kamera virtual yang memotret fixture label terkontrol kemudian menjalankan endpoint produksi OCR dan analisis AI nyata juga lulus, tanpa respons tiruan. Enam nutrien cocok, harga tetap null, dan hasil tampil dalam ringkasan. Bukti lokal: `artifacts/camera-ai-end-to-end.json`. Kamera virtual dan label sintetis tidak membuktikan akurasi seluruh kamera fisik, kemasan Indonesia atau kondisi pencahayaan.

## Alur yang diterapkan

1. Validasi signature, ukuran maksimal 5 MB per foto, dekode nyata, batas 24 megapiksel, penolakan animasi dan foto terlalu kecil. Terima satu atau dua foto dari produk yang sama.
2. Putar berdasarkan metadata, batasi sisi maksimal 3.000 piksel tanpa memperbesar gambar, lalu gunakan gambar hasil dekode.
3. Gemini menyalin teks dan satuan ke kontrak JSON ketat. OCR Tesseract Indonesia + Inggris berjalan sebagai pemeriksaan tambahan dan cadangan ketika Gemini gagal atau tidak dikonfigurasi. Deteksi orientasi Tesseract mencoba memperbaiki teks menyamping.
4. Konversi deterministik per 100 g/ml ke sajian, mg/g dan kJ/kkal. Jangan menukar garam dengan natrium, lemak total dengan jenuh, energi dari lemak dengan energi total, atau %AKG dengan jumlah nutrien. Kolom ambigu, satuan tidak pasti, ketaksamaan dan nilai hilang tidak berubah menjadi nol.
5. Ketidakmampuan OCR lokal mengenali baris bukan bukti bahwa angka vision salah. Angka dikosongkan hanya ketika ada dua jumlah eksplisit yang berbeda atau tanda angka tersensor/ambigu. Ukuran sajian yang bertentangan membatalkan konversi per 100 g/ml. Garam (Natrium) dikenali sebagai natrium; garam tanpa penamaan natrium tetap tidak dikonversi secara asumsi.
6. Tampilkan keputusan awal dan angka gizi utama lebih dahulu. Data yang tidak tercantum tetap null dan tidak mewajibkan pengisian ulang. Pengguna dapat memperbaiki satu kolom opsional; bacaan asli tetap tersedia terpisah. Foto/angka tidak dikenal tidak menghasilkan klaim sehat atau validasi alergen menyeluruh. Jalur analisis lengkap masih menerapkan validasi serta konfirmasi eksplisit.

Gambar sementara OCR lokal ditulis dengan izin terbatas dan dibersihkan dalam finally; tidak dimasukkan database atau riwayat gambar. Maksimal dua pekerjaan lokal bersamaan, dengan batas waktu dan output. Ketika Gemini aktif, foto dikirim ke Google. Isi label diperlakukan sebagai data tidak tepercaya.

## Hasil terukur

| Pemeriksaan                                        | Hasil                                                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Gemini langsung, label PNG terkontrol per sajian   | Dua pembacaan tepat untuk enam nutrien, sajian dan urutan komposisi                                        |
| Gemini rangkaian lanjutan                          | Berhenti karena HTTP 429 pada kasus kedua; orientasi dan nilai hilang belum diverifikasi pada model remote |
| OCR lokal per sajian                               | Enam nutrien tepat                                                                                         |
| OCR lokal per 100 g, koma desimal, natrium dalam g | Enam hasil konversi tepat                                                                                  |
| OCR lokal foto diputar 90°                         | Enam nutrien dan sajian tepat setelah koreksi orientasi                                                    |
| OCR lokal tanpa baris serat                        | Serat tetap null; lima nutrien lain tepat                                                                  |
| Endpoint Docker `/api/extract`, label terkontrol   | HTTP 200; enam nutrien tepat melalui LOCAL_OCR, reviewRequired true; Gemini gagal pada permintaan ini      |
| Foto 100 × 100                                     | Ditolak sebelum memanggil penyedia                                                                         |

Rangkaian lokal lulus 5/5 pemeriksaan; gambar sintetis dibuat untuk menguji satuan dan alur, bukan foto produk nyata. Laporan tersimpan lokal di `artifacts/vision-local-benchmark.json`; kegagalan kuota Gemini tetap dipertahankan terpisah di `artifacts/vision-benchmark.json`. Jalankan `PHOTO_OCR_ENGINE=local TESSERACT_BIN=tesseract node --env-file=.env --import tsx scripts/verify-vision.ts` di lingkungan pengembangan dengan Tesseract terpasang. Docker runner menyertakan Tesseract; paket bahasa dan biner juga diperlukan bila menjalankan server langsung di host.

Uji unit mencakup nilai tersensor/negatif/ambigu, kolom ganda, salah satuan, nilai nol eksplisit, sodium/garam, field hilang dan ketidaksepakatan pembaca. Uji browser dengan respons ekstraksi terkontrol memeriksa gerbang koreksi dan konfirmasi; uji tersebut tidak dihitung sebagai pengukuran akurasi OCR.

Belum ada benchmark representatif kemasan nyata Indonesia dengan anotasi manusia untuk blur, pantulan, huruf sangat kecil, tabel multi kolom, lipatan atau seluruh merek. Pengujian itu diperlukan sebelum mengumumkan angka akurasi populasi. Pengguna tetap harus membandingkan hasil dengan kemasan, terutama nama produk, kolom, desimal, ukuran sajian dan komposisi.

## Regresi foto produk nyata: Golda

Dua foto yang diberikan pengguna disertakan di tests/fixtures/golda-*-user.png sebagai bukti regresi, bukan materi promosi. Uji vision 9Router nyata dan pemeriksaan silang produksi berhasil membaca 180 kkal, gula 19 g, protein 2 g, natrium 80 mg dan lemak jenuh 5 g per 200 ml. Jumlah sajian per kemasan terbaca 1. Serat tidak tercantum dan tetap null. Foto komposisi belum tersedia sehingga sumber gula dan seluruh alergen tidak disimpulkan dari depan kemasan.

OCR lokal pada foto ini menghasilkan beberapa baris rusak, termasuk 200m! dan Gula 199. Ketidakberhasilan mengenali jumlah bersatuan kini tidak menghapus angka vision yang valid. Konflik eksplisit 19 g versus 29 g tetap mengosongkan hanya gula dalam pengujian unit. Bukti satu produk ini tidak mengukur akurasi populasi atau semua kondisi kamera.
