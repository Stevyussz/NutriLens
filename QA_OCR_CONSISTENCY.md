# QA konsistensi gula dan layout Nara

17 Oktober 2026, Asia/Jakarta. Scope: regresi nyata pengguna pada pembacaan gula dan penyempurnaan percakapan Nara. Penilaian SHIP tahap sebelumnya tidak dipakai sebagai bukti bahwa regresi baru ini sudah tertangani.

## Penyebab

Riwayat yang ditunjukkan pengguna menyimpan transkripsi vision `19g`, namun nilai akhir gula null. Teks lokalnya memuat `Gula 199 "7 g`. Parser lama mencari jumlah bersatuan di sembarang posisi baris, sehingga mengambil 7 g dan menganggapnya konflik dengan 19 g. Ini kegagalan parser pembanding, bukan bukti bahwa gula tidak terlihat pada foto.

Parser baru hanya menerima jumlah bersatuan tepat sesudah nama nutrien. Baris rusak tidak menjadi bukti yang sah. Konflik yang benar-benar eksplisit tetap memblokir nilai terkait; tidak ada aturan untuk selalu memenangkan vision. Bukti asli dipertahankan dan diberi penjelasan sebagai transkripsi awal, terpisah dari nilai akhir yang lolos pemeriksaan.

## Konsistensi data

Kebijakan bacaan versi 2 dipakai pada ekstraksi baru. Hasil cross-check lama dihitung ulang dari evidence dan rawText tersimpan pada daftar riwayat, detail, penyimpanan foto dan jawaban Nara. Bacaan yang ditandai dikoreksi pengguna tidak dihitung ulang. Pembacaan ulang tidak menulis ulang transkripsi, memakai tebakan merek, atau mengambil gizi dari internet.

Fixture teks kegagalan nyata dan dua foto baru pengguna disertakan dalam tests/fixtures. Tidak ada kunci, profil kesehatan atau identitas akun di fixture. Uji unit memverifikasi pemulihan 19 g, penolakan beberapa bentuk baris rusak, perlindungan koreksi pengguna dan pembatasan konflik 19 g versus 29 g.

Pemeriksa OCR pendamping memiliki satu anggaran total 8 detik lintas gambar, termasuk proses orientasi. Proses dibatalkan saat anggaran habis; hasil halaman pertama yang sudah selesai tetap dapat dipakai. Jika OCR lokal adalah satu-satunya pembaca, anggarannya 30 detik. Nilai vision yang valid tetap diberi catatan bila pemeriksa lokal tidak tersedia. Ini batas pemeriksa pendamping, bukan janji waktu total model atau jaringan.

## Layout Nara

Percakapan tetap opsional. Transkrip menggulir di area maksimal 440 px atau 45svh, terpisah dari composer. Fokus jawaban mengarah ke jawaban baru; pending/error menggulir area percakapan ke status terbaru. Pertanyaan porsi langsung memakai satu paragraf, saran sesudah jawaban beralih ke setengah kemasan dan alergen, dan detail pemrosesan/privasi dapat dibuka. Tidak ada navigasi baru atau pergantian identitas.

## Verifikasi akhir

39 uji unit lulus, 0 gagal, termasuk deadline OCR dan pelepasan kapasitas setelah abort. Log lokal: /tmp/golda-budget-unit.log. Pemeriksaan tipe terpisah lulus. Seluruh 20 kasus browser produksi final lulus, 0 gagal (1,7 menit), termasuk regresi konsistensi dan layout Nara. Log: /tmp/golda-final-browser.log. Image produksi selesai dikompilasi dan diekspor; penulisan metadata sempat kehabisan ruang, lalu pengulangan dari cache yang sama berhasil pada /tmp/golda-budget-build-retry.log setelah ruang dilepas. Tidak ada volume atau database dihapus.

Dua panggilan nyata memakai foto baru pengguna: tabel gizi saja, kemudian tabel dengan foto depan. Keduanya menghasilkan gula19g, natrium80mg, energi180kkal, protein2g, lemak jenuh5g, seratnull dan1sajian per kemasan. Foto depan dikenali sebagai COFFEE DOLCE LATTE; foto tabel saja tidak mengarang nama produk. Hasil final berstatus ROUTER_VISION karena pemeriksa lokal tidak menyelesaikan bacaan dalam anggaran; batas pemeriksaan tersebut tetap dijelaskan di hasil. Durasi sampel final19,825 dan17,912 detik; ini bukan jaminan latensi atau pembandingan performa terkontrol. Log: /tmp/golda-final-live.log dan .impeccable/review/reading-fix/live.json.

Pengujian satu row QA yang sengaja dikembalikan ke format lama di database mengonfirmasi daftar riwayat, detail dan Nara semuanya19g. Row QA itu kemudian dihapus; riwayat pengguna asli tidak diubah. Replay bukti kegagalan pengguna juga menghasilkan19g. Bukti: /tmp/golda-legacy-roundtrip.json. Rekonsiliasi saat baca mempertahankan transkripsi asli.

Capture akhir di .impeccable/review/reading-fix/: live-summary-390.png, nara-empty-390.png, nara-{320,390,768,1440}.png memakai ekstraksi foto nyata. real-conflict-controlled-390.png menguji konflik eksplisit melalui data terkontrol. .impeccable/review/nara/error-390.png memakai kegagalan API terkontrol. Respons terkontrol bukan pengukuran akurasi OCR. Pada ukuran yang diuji tidak ada overflow horizontal; percakapan terbatas dan composer terpisah. Detector dijalankan sekali: nol temuan utama,94 advisori CSS incumbent/ukuran lokal, tanpa perubahan identitas.

Review akhir independen: **SHIP**, lima bagian kontrak lengkap dan tanpa perbaikan material tersisa pada scope ini. Review membuka ulang seluruh delapan capture final setelah bukti pengguna menggugurkan penilaian tahap sebelumnya. Penilaian berdasarkan source, capture dan log, bukan browser independen reviewer. Dokumentasi reusable Nara diperbarui setelah review, tanpa penggantian token atau identitas.

Akun terdaftar sementara suite final dan sesinya sudah dihapus. Tidak ada akun pengguna asli dihapus.

## Batas

Perbaikan ini menutup bentuk kegagalan yang direproduksi, bukan membuktikan OCR selalu benar. Baris rusak lain, pantulan, blur, foto produk berbeda dan ketidaktersediaan model masih dapat memerlukan foto ulang. Teks awal yang terlihat tetap bukan jaminan nilai akhir lolos pemeriksaan porsi, satuan dan konflik. Tidak ada klaim seluruh label Indonesia telah dievaluasi.
