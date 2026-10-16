# Label uji terkontrol

Kedua PNG ini adalah fixture sintetis yang sebelumnya dibuat oleh scripts/verify-vision.ts. Tulisan pada gambar menyatakan bahwa label bukan produk riil. File disertakan agar uji browser dapat berjalan dari checkout baru tanpa artefak lokal atau panggilan AI untuk menyiapkan gambar.

- per-serving.png: sajian 30 g, energi 140 kkal, gula 12 g, protein 3 g, natrium 90 mg, lemak jenuh 2 g, serat 1 g.
- per-100-comma.png: sajian 25 g, tabel per 100 g; energi 400 kkal, gula 25 g, protein 10 g, natrium 0,4 g, lemak jenuh 5 g, serat 8 g. Konversi per sajian: 100 kkal, 6,25 g, 2,5 g, 100 mg, 1,25 g, dan 2 g.

Gambar menguji pemilihan file, retensi foto, tinjau hasil dan kontrak satuan. Uji UI yang menyimulasikan respons OCR tidak mengukur akurasi OCR. Benchmark AI dan OCR tetap dijalankan terpisah.
