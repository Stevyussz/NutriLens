# Estimasi harga otomatis

18 Oktober 2026, Asia/Jakarta. Extension of Indeks Belanja; personal budgets remain retired.

## Kontrak

Hasil foto memuat panel estimasi satu kemasan sebelum Nara, tanpa menahan ringkasan gizi. Server membaca API publik Open Prices IDR (maksimal100observasi, timeout7detik, cache10menit). Nama/varian, ukuran dan satuan kemasan harus cocok; proof ID, mata uang, tanggal <=hari UTC pemeriksaan dan umur <=180hari diperiksa. Nama dus/multipack/isi lebih dari satu ditolak agar harga paket tidak dianggap harga satu botol. Barcode foto belum diklaim cocok.

Jika tidak ada observasi cocok, model 9Router/Gemini boleh memberi kisaran harga berdasarkan nama, merek, kategori dan ukuran satu kemasan. Tidak ada profil kesehatan, foto atau kunci API pada input estimasi. Sumber model tidak disebut pencarian toko yang berhasil; tidak ada URL rekaan. Model dapat menolak bila tidak yakin. Kisaran wajib positif, terurut dan dibatasi. Input instruksi dianggap data tidak tepercaya. Pengetahuan model bukan harga toko terbaru.

Mode terpisah SOURCED_ESTIMATE, AI_ESTIMATE dan UNAVAILABLE. Rincian memperlihatkan tanggal/sumber observasi atau penjelasan belum didukung bukti toko. Harga tidak mengubah gizi, catatan foto, peringkat kandidat berharga terverifikasi, atau perhitungan penghematan. Budget pribadi tidak kembali. Nara memakai helper/server cache yang sama untuk pertanyaan harga; hasil lama memeriksa harga saat dibuka, bukan harga saat foto diambil. Data provider dibaca dari origin tetap, tanpa URL pengguna/AI, redirect, pengunduhan tak terbatas atau evaluasi script.

## Bukti awal

50/50 unit lulus (/tmp/price-all-unit.log). Tiga uji baru mencakup varian, ukuran, mata uang, proof, tanggal, multipack, interval model dan konsistensi Nara. Typecheck lulus (/tmp/price-types-final.log). Detector sekali0primary97advisory (/tmp/price-detect.json), mayoritas incumbent. Tidak ada raster baru.

Pembacaan langsung halaman retailer Blibli menghasilkan403 pada lingkungan aplikasi; tidak dicatat sebagai verifikasi toko berhasil. Feed Open Prices IDR dapat dibaca langsung. UI/AI smoke dan deployment final dicatat setelah build.

Docker menggunakan tmpfs hanya untuk cache kompilasi .next/cache, mengurangi penulisan cache sementara saat disk host terbatas. Artefak standalone dan runtime tetap di image; tidak ada volume/database pengguna yang dihapus.

## Verifikasi layanan nyata dan asal angka

Uji awal lewat API aktif berhasil: estimasi modelRp3.000–Rp4.500 untukGolda200ml, public feed CHECKED tanpa observasi yang cocok; Nara memakai interval yang sama. Ini sampel keluaran model, bukan bukti harga toko. Durasi4,380detik satu sampel, bukan benchmark. Endpoint memeriksa sesi dan origin (401/403). Bacaan foto dipasok fixture tersimpan; tidak ada klaim uji vision baru.

Uji ini menemukan penanda jawaban lama yang masih menyebut angka dari label. Mode PRICE_ESTIMATE dan penanda khusus kini ditambahkan;8uji Nara/estimasi terkait lulus (/tmp/price-provenance-unit.log). Lima browser case estimasi/loading/detail/sumber/error/retry serta Nara/foto/research lulus (/tmp/price-browser.log). Capture ada di .impeccable/review/price-estimate; angka pada capture controlled adalah fixture, bukan observasi pasar.

Build awal selesai kompilasi/ekspor tetapi Compose gagal menulis metadata saat disk penuh; image diekspor sempat dipakai untuk smoke. Cache proyek yang tidak aktif dilepas. Binary optional SWC musl lokal137MB dibuang karena host terbukti memakaiglibc dan paket GNU tetap ada; dependency ini dapat dipasang ulang oleh npm. Build Docker memasang dependensinya sendiri dan tidak memakai node_modules host. Source, database dan volume pengguna tidak dihapus. Hasil build/deployment final dicatat setelah penanda Nara selesai diverifikasi.

## Final

Image penanda PRICE_ESTIMATE selesai dikompilasi/diekspor dan terpasang running/healthy. Compose kembali gagal pada penulisan metadata akhir ENOSPC; ini tetap keterbatasan lingkungan yang dicatat, bukan exit sukses palsu. Cache build proyek yang terverifikasi reclaimable dilepas, tanpa menghapus volume/database.

Smoke final (/tmp/price-final-live.log) mengonfirmasi mode AI_ESTIMATE, kisaranRp3.000–Rp4.500 untuk200ml, source API CHECKED tanpa observasi cocok, dan Nara PRICE_ESTIMATE dengan interval sama. Sampel fresh API3,475detik; bukan benchmark/validasi harga pasar. Recapture (/tmp/price-final-recapture.log) memakai endpoint produksi dan boleh memakai cache server15menit. Capture live-nara-price-390.png memperlihatkan penanda harga seluruhnya di atas navigasi ponsel.

Satu browser case pengambilan ulang seluruh state panel final lulus (/tmp/price-final-browser.log). Reviewer fresh memeriksa seluruh11capture, disposition ship tanpa material fixes. Capture model/source/loading/error/unavailable adalah response fixtures; live-ai dan live-nara-price memakai layanan harga/Nara nyata pada identitas/bacaan foto tersimpan yang disiapkan untuk QA. Tidak ada klaim ekstraksi vision baru atau kepastian harga toko/termurah seluruh pasar.

Documenter menambahkan panduan lokal price readout dan memperbarui timestamp sidecar saja. Frontmatter token dan seluruh10specimen tetap identik;8bagian kanonis/schema2 valid. Tidak ada perubahan UI setelah reviewer ship. Pemeriksaan berkas staged mengecualikan .env, artefak review, file .codex dan arsip lokal; tidak ada nilai kredensial yang ikut commit.
