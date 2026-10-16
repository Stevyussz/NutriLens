# Pembaruan sumber dan batas pengetahuan AI

Layanan Docker `updater` memeriksa sumber setiap 24 jam setelah pembaruan berhasil. Jika gagal, percobaan berikutnya dijadwalkan satu jam kemudian. Selama komputer/server atau layanan berhenti, tidak ada pembaruan. Model Gemini tetap mengikuti konfigurasi pemilik; sistem tidak mengganti model atau mengklaim model melatih dirinya sendiri.

AI membaca label pengguna, fakta kamus dan kandidat dari MongoDB. Pembaruan sumber yang berhasil mengisi database tersebut dan membatalkan cache analisis lama. Pengetahuan bawaan model bukan feed berita, penelusuran web langsung, verifikasi BPOM, stok toko atau harga ritel terkini. Instruksi AI melarang klaim tersebut dan mewajibkan menyebut informasi yang belum diketahui. Aturan angka, batas profil dan pemilihan kandidat tetap dibatasi kode deterministik.

## Asal data saat ini

Katalog historis yang dibundel diambil dari `world.openfoodfacts.net`, yaitu lingkungan **staging/pengujian**, bukan produksi. Penjelasan sebelumnya yang menyebutnya mirror tanpa membedakan staging tidak memadai dan dikoreksi di sini. URL, checksum dan tanggal asal dipertahankan dalam manifest; tautan halaman produk canonical `.org` tidak membuktikan nilai staging sama dengan produksi.

Pembaruan otomatis hanya menerima ekspor katalog dari `world.openfoodfacts.org`. Dokumentasi resmi menjelaskan kedua lingkungan dan menganjurkan ekspor massal untuk pengambilan banyak produk: [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/). Jangan mengganti ke staging secara diam-diam ketika produksi ditolak. Snapshot yang ada tetap perlu dicocokkan dengan kemasan fisik. Sampai sinkronisasi produksi berhasil, status aplikasi menampilkan keterbatasan sumber tersebut.

## Gerbang kualitas dan kegagalan

- Unduh katalog, kamus dan observasi harga ke direktori sementara; tidak menulis snapshot bundel repository.
- Tunggu seluruh unduhan yang berjalan selesai, termasuk ketika satu gagal. Validasi semua skema, ID unik, jumlah manifest, tanggal sumber dan batas massa nutrien sebelum memulai seed.
- Nilai nutrien katalog yang tidak valid atau melebihi massa sajian yang jelas dikosongkan. Dua nilai parsial telah dikosongkan; satu record parsial yang sebelumnya tertolak karena angka di luar batas kini dipertahankan dengan field kosong. Katalog menjadi 7.899 record; referensi lengkap tetap 89.
- Tolak sumber katalog nonproduksi dan penurunan cakupan lebih dari 20% dibanding snapshot sebelumnya. Operator perlu meninjau perubahan sebesar itu, bukan mengaktifkannya otomatis.
- Jika unduhan/validasi gagal sebelum seed, database aktif tidak disentuh dan timestamp tidak diperbarui menjadi seolah-olah berhasil.
- Kunci pekerjaan di MongoDB mencegah dua updater memulai bersamaan. Lease maksimal 45 menit; setiap proses importer memiliki batas waktu.
- Seed menyimpan sumber/tanggal aktual ke `dataset_state`, menghapus cache turunan, dan mempertahankan akun/profil. Bootstrap tidak menimpa database dengan snapshot yang lebih tua. Snapshot runtime tersimpan di volume `dataset_snapshots`; maksimal current/previous saat promosi.
- MongoDB standalone ini tidak memakai transaksi lintas seluruh koleksi. Kegagalan database di tengah seed dapat meninggalkan perubahan parsial; status gagal harus ditinjau dan seed diulang. Tidak ada klaim promosi seluruh database bersifat atomik.

Status, tanggal pengambilan katalog/kamus/harga, sumber staging dan kegagalan ditampilkan di scanner dan kamus. Umur lebih dari 72 jam ditandai perlu diperbarui; ambang ini adalah kebijakan aplikasi, bukan jaminan resep/regulasi/harga benar selama 72 jam.

## Menjalankan

`docker compose up --build -d` menjalankan MongoDB, bootstrap seed, aplikasi dan updater. Jaringan keluar dibuka hanya untuk layanan yang perlu mengakses penyedia. Kredensial Gemini tidak diberikan ke updater karena tugasnya mengambil sumber, bukan menghasilkan data dengan AI.

Pemeriksaan lokal snapshot: `node --import tsx scripts/audit-data.ts`. Jalankan sekali dari Compose: `docker compose run --rm updater node --import tsx scripts/refresh-data.ts --once --force`. Jangan menjalankan importer langsung terhadap volume aktif. Pekerjaan normal berjalan otomatis, dengan catatan ringkas pada log updater dan metadata database; tidak ada notifikasi/email eksternal.
