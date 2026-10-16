# Validasi pembacaan foto

16 Oktober 2026. Pembacaan foto menghasilkan draf yang wajib diperiksa pengguna sebelum analisis. Tidak ada klaim akurasi 100% untuk seluruh foto atau kemasan.

## Pembaruan 9Router dan kamera langsung

Kamera langsung menjadi jalur utama, dengan galeri sebagai cadangan. Foto hanya dikirim saat pengguna menekan Baca foto label. Provider 9Router menggunakan model vision yang tersedia pada router lokal; OCR Tesseract tetap menjadi pemeriksaan tambahan. Saat router dipilih, foto dikirim ke penyedia upstream yang dikonfigurasi di 9Router.

Pemeriksaan Docker melalui socket privat lulus 5/5: label per sajian, per 100 g dengan desimal, rotasi, nilai serat yang hilang tetap null, serta penolakan foto terlalu kecil. Empat ekstraksi yang diterima memakai ROUTER_CROSSCHECKED. Bukti lokal: `artifacts/vision-router-docker-benchmark.json`.

Alur kamera virtual yang memotret fixture label terkontrol kemudian menjalankan endpoint produksi OCR dan analisis AI nyata juga lulus, tanpa respons tiruan. Enam nutrien cocok, harga tetap null, dan hasil tampil dalam ringkasan. Bukti lokal: `artifacts/camera-ai-end-to-end.json`. Kamera virtual dan label sintetis tidak membuktikan akurasi seluruh kamera fisik, kemasan Indonesia atau kondisi pencahayaan.

## Alur yang diterapkan

1. Validasi signature, ukuran maksimal 5 MB per foto, dekode nyata, batas 24 megapiksel, penolakan animasi dan foto terlalu kecil. Terima satu atau dua foto dari produk yang sama.
2. Putar berdasarkan metadata, batasi sisi maksimal 3.000 piksel tanpa memperbesar gambar, lalu gunakan gambar hasil dekode.
3. Gemini menyalin teks dan satuan ke kontrak JSON ketat. OCR Tesseract Indonesia + Inggris berjalan sebagai pemeriksaan tambahan dan cadangan ketika Gemini gagal atau tidak dikonfigurasi. Deteksi orientasi Tesseract mencoba memperbaiki teks menyamping.
4. Konversi deterministik per 100 g/ml ke sajian, mg/g dan kJ/kkal. Jangan menukar garam dengan natrium, lemak total dengan jenuh, energi dari lemak dengan energi total, atau %AKG dengan jumlah nutrien. Kolom ambigu, satuan tidak pasti, ketaksamaan dan nilai hilang tidak berubah menjadi nol.
5. Jika dua pembaca tersedia tetapi nilai nutrien atau ukuran sajian tidak cocok, kosongkan field terkait. Ini gerbang penolakan, bukan persentase keyakinan atau bukti bahwa dua pembaca pasti benar.
6. Tampilkan foto asli, teks yang terbaca, konversi, bagian bermasalah dan formulir koreksi. Harga tidak ditebak. Nama yang tidak terbaca harus diisi. Semua enam nutrien wajib dilengkapi; centang pemeriksaan wajib sebelum analisis. Mengubah field membatalkan centang tersebut.

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
