# QA vision utama dan ringkasan belanja

17 Oktober2026, Asia/Jakarta. Scope: menjadikan vision pembaca foto produksi dan mengganti ringkasan berbasis persentase generik dengan jumlah kemasan serta pilihan konkret.

## Kontrak baru

Jalur ekstraksi tidak memanggil OCR lokal. Kegagalan vision menghasilkan error yang bisa dicoba ulang, tanpa angka OCR pengganti. Pembacaan awal tetap diperiksa untuk satuan, porsi dan angka valid. Gula, natrium, ukuran sajian atau jumlah sajian yang belum diketahui memicu paling banyak satu pembacaan visual ulang. Ini model vision yang sama, bukan dua alat independen. Hasil berbeda ditandai dan ditampilkan berdampingan; porsi atau kolom berbeda tidak digabungkan.

Riwayat vision/cross-check lama versi sebelumnya dinormalisasi dari transkripsi vision tersimpan, tanpa veto OCR. Foto lama tidak disimpan dan tidak dilihat ulang. Koreksi pengguna tidak diganti. Riwayat yang hanya berasal dari LOCAL_OCR tidak menjadi dasar rekomendasi pembelian baru.

## Ringkasan

Jika label menyebut satu sajian200ml dan19g gula, satu kemasan mengandung19g; setengahnya100ml dan9,5g. Jika satu kemasan berisi dua sajian, total gula/natrium dikalikan dua. Tanpa jumlah sajian, judul hanya menyatakan per sajian. Acuan profil tidak menjadi aturan otomatis 'tinggi/sehat' dan diletakkan di disclosure.

Perkiraan sendok menggambarkan berat gula total menggunakan perbandingan50g≈12sendok teh rata dari [WHO healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet). Ini bukan takaran gula tambahan atau bukti seluruh gula tersebut termasuk gula bebas. Saran membandingkan produk memakai ukuran kemasan/sajian yang sama, bukan merek alternatif atau data harga yang belum diverifikasi.

## Verifikasi

46 uji unit final lulus,0 gagal (/tmp/vision-final-unit-unrestricted.log). Seluruh20 kasus browser produksi final lulus,0 gagal,1,7menit (/tmp/vision-copy-final-browser.log). Pemeriksaan tipe lulus. Kompilasi/image export berhasil; metadata build sempat tertahan ruang disk, lalu retry dari cache/konteks yang sama berhasil (/tmp/vision-copy-final-build-retry.log). Cache build dan satu image uji OCR lama yang tidak dipakai dilepas; database/volume pengguna dipertahankan.

Dua pengujian foto nyata pada image akhir: tabel saja dan tabel bersama foto depan, keduanyaROUTER_VISION,readingVersion3,visionReviewINITIAL, tanpa rawText OCR. Hasil19g gula,80mg natrium,180kkal,2g protein,5g lemak jenuh,null serat,1sajian per kemasan. Foto depan dikenaliCOFFEE DOLCE LATTE; tabel tanpa nama tidak diisi nama produk rekaan. Durasi19,605 dan17,789detik merupakan dua sampel, bukan janji latensi. Bukti /tmp/vision-style-final-live.log dan .impeccable/review/vision-first/live.json.

Foto depan botol tanpa tabel gizi juga diuji melalui vision asli: pembacaan ulang dijalankan, seluruh nilai gizi tetapnull. Tidak ada angka dari pengetahuan merek atau OCR yang diisi sebagai pengganti. Capture front-only-unreadable-390.png memeriksa penjelasan tanpa data dan pemulihan. Ini uji negatif satu foto, bukan estimasi akurasi seluruh produk.

Capture produksi dalam .impeccable/review/vision-first/: live-summary-390.png, profile-detail-390.png, vision-evidence-390.png, nara-empty-390.png, nara-{320,390,768,1440}.png dan front-only-unreadable-390.png. Konflik visual dan kegagalan transport diuji dengan respons terkontrol pada .impeccable/review/reading-fix/real-conflict-controlled-390.png serta .impeccable/review/nara/error-390.png. Respons terkontrol tidak membuktikan akurasi model. Tidak ada overflow horizontal pada ukuran yang diuji.

Detector untuk refinement ini dijalankan sekali:0 temuan utama,96advisori pada CSS incumbent/ukuran lokal. Tidak ada perbaikan drift global atau raster baru.
 Uji unit mencakup satu/dua/unknown sajian, gagal vision tanpa fallback, recheck terbatas, konflik jumlah dan porsi, serta perlindungan koreksi pengguna. Uji OCR historis tidak menjadi klaim jalur OCR produksi.

## Batas

Vision dapat salah dan pembacaan ulang dari model sama dapat mengulangi kesalahan. Belum ada tolok ukur akurasi populasi. Kalimat ringkasan dihitung dari fakta dan kategori, tidak memakai teks kesehatan bebas yang bisa membuat angka baru. Tidak ada diagnosis, sertifikasi produk sehat, penentuan sisa konsumsi harian atau klaim semua produk lokal lengkap.

## Verifikasi setelah review hierarki

Perbaikan tunggal review: prioritas selector judul Pilihan porsi dan paragraf pilihan kini benar terhadap aturan dashboard. Build final berhasil, aplikasi Docker sehat. Empat pengujian browser terkait lulus (/tmp/vision-style-final-browser.log), termasuk computed style judul14px dan paragraf15px/450 pada390 serta1440px. Pembacaan foto asli dan capture diulang pada versi ini; paragraf15px/450 terkonfirmasi pada320,390,768,1440px. Foto depan saja tetap menghasilkan semua nilai gizi null. Uji unit sempat gagal di sandbox karena tes memerlukan socket lokal; rerun dengan izin socket lulus46/46. Tidak ada perubahan algoritma setelah pengujian penuh20kasus sebelumnya.

Reviewer menilai seluruh sebelas recapture valid dan perbaikan tunggal hierarki CSS resolved, disposition ship pada cakupan perbaikan tersebut. Ini bukan klaim akurasi model atau sertifikasi seluruh aplikasi.

Dokumentasi selesai diperiksa langsung setelah documenter terhenti karena batas penggunaan. DESIGN.md menjelaskan hierarki ringkasan lokal; frontmatter token tidak berubah. Sidecar hanya memperbarui waktu pencatatan, seluruh struktur dan specimen incumbent tetap identik.
