# BongkarLabel

Aplikasi Next.js 15 / React 19 untuk membedah komposisi pangan, mendeteksi pola pemisahan sumber gula, dan membandingkan pilihan berdasarkan harga, protein, gula, profil, serta rasa. Tema terbaru memakai charcoal hangat, gradasi oat, permukaan krem dan aksen vermilion, tanpa biru/navy. Scan foto menjadi pintu masuk utama.

## Jalankan

```sh
docker compose up --build
```

Buka [http://localhost:3000](http://localhost:3000), pilih **Scan label**, nyalakan kamera, lalu foto komposisi dan tabel gizi dari produk yang sama. Galeri tetap tersedia sebagai cadangan. Tidak perlu membuat akun. MongoDB 8 diperiksa kesehatannya; service seeder mengisi data secara idempoten sebelum aplikasi menerima koneksi. Database tidak mengekspos port ke host. Pengunduhan image dan dependensi pertama kali memerlukan internet; snapshot label dan kamus sudah disertakan.

AI opsional. Tanpa kunci, preset, formulir label lengkap, parser teks terstruktur, algoritma, pencarian MongoDB, grafik, profil dan sesi tetap berfungsi. Foto dapat dibaca OCR lokal Tesseract Indonesia/Inggris; Gemini opsional menambah pembacaan dengan pemeriksaan silang. Draf foto wajib diperiksa dan dikonfirmasi sebelum analisis. Lihat [validasi OCR](OCR_VALIDATION.md).

Provider 9Router dapat dipilih dengan `NINE_ROUTER_BASE_URL` (endpoint kompatibel OpenAI berakhiran `/v1`), `NINE_ROUTER_API_KEY`, dan `NINE_ROUTER_MODEL`. Model lokal yang diuji adalah `ag/gemini-3.8-flash-low`. Endpoint harus dapat diakses dari lingkungan aplikasi; alamat loopback host berbeda dari loopback container. Jika konfigurasi 9Router diisi, base URL dan kunci keduanya diperlukan. Konfigurasi yang belum lengkap memakai OCR/analisis lokal; kegagalan 9Router dilaporkan melalui fallback lokal/deterministik, tanpa berpindah diam-diam ke akun Gemini lain. Untuk 9Router pada host Linux (`127.0.0.1:20128`), gunakan `NINE_ROUTER_SOCKET_PATH=/run/router/9router.sock` dan `COMPOSE_PROFILES=local-router-socket`. Helper memakai volume Unix socket privat mode 0600 bersama aplikasi, tanpa listener TCP tambahan atau port router pada LAN/docker0. Untuk endpoint eksternal yang sudah bisa dijangkau Docker, kosongkan socket path dan profil tersebut.

Untuk mengaktifkan Gemini langsung, kosongkan base URL dan kunci 9Router, salin `.env.example` ke `.env`, isi `GEMINI_API_KEY` dan pilih `GEMINI_MODEL` yang tersedia untuk akun Anda, kemudian jalankan ulang Compose. Gambar/teks dikirim ke provider yang dikonfigurasi saat AI aktif. Jangan unggah foto yang memuat data pribadi. Berkas gambar tidak disimpan di database; file sementara OCR lokal dihapus setelah pekerjaan selesai.

Port host dapat diubah dengan `APP_PORT`; sesuaikan juga `APP_ORIGIN` dengan alamat yang dibuka browser. `APP_ORIGIN` harus sama persis dengan origin pengguna, termasuk port. Workspace pengujian ini memakai port 3001 karena port 3000 sudah digunakan layanan lain.

Katalog menyediakan 7.899 produk untuk pasar Indonesia, 89 referensi lengkap, dan 7.279 entri kamus. Data yang kurang tetap kosong; cakupan regulasi, datasheet dan harga dijelaskan di [DATA_COVERAGE.md](DATA_COVERAGE.md).

## Pengembangan

Node.js 20.19+ atau 22 dan MongoDB 8 diperlukan.

```sh
npm ci
cp .env.example .env
npm run db:seed
npm run dev
```

MongoDB lokal default: `mongodb://localhost:27017`. Compose menggunakan URI internal dengan autentikasi; URI lokal `.env` tidak menggantikan URI internal tersebut. Setiap perangkat memperoleh sesi pribadi sementara ketika memulai pemeriksaan. Membuka pemeriksaan kembali memakai sesi yang masih aktif. Profil dimulai tanpa asumsi kondisi medis. Untuk akun persisten yang dikelola operator, seeder dapat membuat `INITIAL_USER_EMAIL` dan `INITIAL_USER_PASSWORD` (minimal 12 karakter); akun lama tidak ditimpa. API login berkredensial tetap tersedia untuk integrasi akun, tanpa menambahkan penghalang login pada alur publik.

## Alur penggunaan

1. Pilih **Scan label**, nyalakan kamera, lalu ambil 1–6 foto bagian depan, komposisi, tabel gizi, atau sisi lain dari produk yang sama. Galeri tersedia sebagai cadangan dan menambahkan foto tanpa mengganti pilihan yang ada. Jumlah, format, dan ukuran diperiksa sebelum pengiriman. Tekan **Periksa foto** untuk memperbesar tulisan tanpa keluar dari halaman. Kamera memerlukan izin browser dan HTTPS atau localhost. Kamera dihentikan saat berganti metode/halaman, foto diperiksa, tab disembunyikan, atau foto mulai diproses.
2. Pilih **Baca foto label**. Ringkasan awal langsung menunjukkan angka yang terbaca, konteks batas profil dan saran pertimbangan. Harga, serat atau komposisi yang tidak tercantum tidak menghalangi ringkasan dan tidak dianggap nol. Koreksi satu angka hanya bila perlu. Analisis komposisi lengkap tetap tersedia sebagai jalur lanjutan dengan konfirmasi.
3. Pencarian sumber produk menyusul di belakang layar: katalog lokal, Open Food Facts langsung, dan indeks merek WINGS. AI memilih ID sumber dari kandidat yang tersedia; aturan merek, varian, porsi dan satuan tetap memeriksa kecocokan. Hasil penelusuran tidak menimpa angka foto atau menentukan barcode secara otomatis.
4. Bagian teratas hasil menampilkan ringkasan singkat, kontribusi gula/natrium terhadap batas profil, dan langkah berikutnya. Tidak ada aturan terpicu bukan jaminan keamanan medis.
5. Buka tab Komposisi, Sumber gula, atau Pilihan pengganti untuk detail. Perbandingan biaya ditunda jika harga belum diisi.
6. Buka **Riwayat** untuk membaca ulang hasil dengan profil saat analisis dilakukan, atau menghapus hasil. Hingga 100 kombinasi label/profil terbaru disimpan per pengguna; mengulang kombinasi yang sama memperbarui hasil sebelumnya. Foto tidak disimpan dalam riwayat. Akun mempertahankan riwayat setelah sesi sementara berakhir.
7. Kamus bahan dan Profil saya tetap dapat diakses langsung. Contoh analisis bersifat opsional untuk mengenal aplikasi.

Lima preset adalah **skenario ilustratif** dari brief, bukan klaim tentang merek riil. Persentil natrium ke-96 tidak dipaksakan: hasil dihitung dari populasi kategori yang tersedia.

## Arsitektur

```text
Browser (scan foto + ringkasan + riwayat)
  | HttpOnly cookie, Origin check, bounded request body
  v
Next.js Route Handlers
  | SHA-256(payload + profile + model mode + engine version)
  +--> MongoDB scan_caches --> validated personalized response
  |
  +--> Configured 9Router/Gemini extraction (JSON contract + Zod)
  |       or local explicit-label parser
  v
Dictionary $in lookup --> enriched ordered ingredients
  +--> Sugar-splitting / NOVA heuristic / nutrition value
  +--> Mongo: constraints -> Jaccard -> sort/limit -> dominance
  +--> Mongo $facet: empirical sugar/sodium percentiles
  v
Deterministic safety envelope + optional Gemini RAG reranker
  | supplied candidate IDs only; outside-DB suggestions labelled estimates
  v
Product upsert + full cache record --> charts and ingredient dialogs
```

Boundaries: `src/core/algorithms`, `src/core/db`, `src/core/ai`, `src/core/security`, `src/components`. TypeScript strict; Zod validates inputs, model outputs, DB aggregation results and analysis responses. Algorithm/database functions carry JSDoc and complexity descriptions.

### Sugar-splitting

For `n` ingredients and `alpha = 1.6`:

```text
D = sum((n - index)^alpha)
estimatedWeight[index] = ((n - index)^alpha / D) * 100
```

An explicit label percentage replaces that ingredient's estimate. All `HIDDEN_SUGAR` weights are combined. Detection requires at least two sugar ingredients and a combined weight greater than the first ingredient. A bounded 0–100 heuristic score uses relative excess and the split count. Consolidated rank sorts non-sugar ingredients plus the combined sugar row.

**This is not measured mass, evidence of fraud or a regulated nutrition score.** Mixed explicit percentages and independent positional estimates may not total 100%; the UI states that limitation. Nested ingredients expand in order without assigning a parent percentage to every child. Parent-to-child proportions remain unknown.

NOVA is a formulation heuristic, not authoritative knowledge of manufacturing processes. GL is a **sugar-only proxy** from available pure-ingredient GI references, not full-carbohydrate GL or an individual response prediction. Missing GI remains null. Protein cost is null when protein is zero.

### MongoDB

Replacement filtering runs entirely in the database:

- Same category, different barcode; illustrative cases excluded.
- Only source-backed `OPEN_FOOD_FACTS`/operator-imported `LABEL` records enter the candidate and reference-population pools. Manual and AI extractions remain stored with their original uncertainty, but cannot promote themselves to trusted sources. Manual submissions receive a server-derived barcode and forced `USER_INPUT` provenance, so a submitted barcode cannot overwrite a provider label.
- No personal budget or source-price cap. Retailer-sourced positive prices only, same category and serving size, sugar at most 75% of source, protein at least source. Candidates sort by recorded price, then relevance; this is not a live-market cheapest guarantee.
- Jaccard `|intersection| / |union| >= 0.35` via `$setIntersection`, `$setUnion`, `$size`, guarded `$divide`.
- Similarity and protein per Rp1.000 descending, maximum six candidates.
- `$lookup` evaluates strict dominance on price, sugar and protein against all qualifying candidates. Only nondominated, profile-compatible candidate IDs can be recommended.
- `$facet` computes inclusive empirical CDF percentiles. Ties count as `<=`; no population yields null.

Comparisons use the declared serving, whose size can differ. They are not standardized per-100-g clinical comparisons; serving size and limitations appear in the UI.

Unique email, barcode, dictionary name, token hash and cache hash indexes protect identity. Products have category/price/sugar compound and flavor multikey indexes. Dictionary aliases have a multikey index. Sessions have `expiresAt` TTL (`expireAfterSeconds: 0`), plus explicit expiry checks because TTL cleanup is asynchronous. Analysis cache TTL: 24 hours.

### AI boundary and fallback

9Router uses the server-only OpenAI-compatible chat endpoint, bounded timeouts and the same Zod output validation. The direct Gemini option uses the official `@google/genai` SDK and `GEMINI_MODEL` (default `gemini-2.5-flash`), JSON MIME, response schemas and Zod. The owner approved `gemini-3.8-flash` for this deployment after Google rejected 2.5 Flash for new users (HTTP 404). Model identity is included in the cache key. Label contents are untrusted data. Reranking IDs must exist among supplied candidates. Gemini cannot downgrade the deterministic safety envelope. Outside-catalogue suggestions are separate estimates with no verified stock claims; they are suppressed for profiles with declared allergies.

Timeouts/malformed JSON have explicit fallback behavior. Incomplete nutrition is never silently replaced with zeros. Local mode accepts the complete form, presets or one-field-per-line text:

```text
Nama: [salin nama produk]
Kategori: SEREAL_SARAPAN
Harga: [angka Rp per sajian, tanpa pemisah ribuan]
Sajian: [angka g/ml]
Energi: [angka kkal]
Gula: [angka g]
Protein: [angka g]
Natrium: [angka mg]
Lemak jenuh: [angka g]
Serat: [angka g]
Komposisi: [urutan bahan, pisahkan koma]
Rasa: [tag opsional, pisahkan koma]
```

Bracketed text describes required user input, not seeded data. All six nutrients are required; labelled zero is valid, a missing field is not.

## Data and limits

Audit cakupan aktual dan bagian yang belum tersedia dicatat di [DATA_COVERAGE.md](DATA_COVERAGE.md). Dataset belum mencakup seluruh bahan kimia, produk Indonesia atau harga ritel. Kamus bahan menyediakan panel sumber/cakupan yang membaca jumlah entri dan label referensi langsung dari MongoDB.

Snapshot: **55 source-linked community food labels** across five categories, plus a bulk glossary derived from **764 additive nodes and 6,654 ingredient nodes** supplied by Open Food Facts. The importer deduplicates multilingual aliases and the seeder overlays 69 local interpretation rules. Raw source counts/checksums and the import timestamp live in `data/dictionary.manifest.json`; per-record provider IDs and URLs are retained. Five illustrative presets remain separate from real product labels. See [data/README.md](data/README.md).

Run `npm run data:dictionary` to refresh the full provider taxonomy, then `npm run db:seed` to import it into MongoDB in batches. `npm run data:catalogue` refreshes product labels from the production export. No one-at-a-time lookup is needed. Startup uses the bundled snapshots and works without internet after image/dependency downloads.

Seeding refreshes provider product records, preserves user profiles, clears derived scan caches and rebuilds the five default-profile example results. This prevents results from an older dataset from surviving a data refresh. Treat retailer-price corrections as source data in the snapshot so subsequent seeds retain them.

**Bundled prices are labelled simulation assumptions per serving, not verified current minimarket/package prices.** The blueprint's accurate-retail-pricing requirement is not claimed fulfilled. Replace estimates with dated retailer evidence before presenting real shopping savings. Community labels also require verification against physical packaging.

Run `node --env-file-if-exists=.env --import tsx scripts/verify-gemini.ts` for an explicit live extraction/allergy-envelope check. It checks complete/incomplete synthetic labels and the allergy envelope through three provider calls without writing test products to the catalogue. Provider failures are recorded separately from passed assertions. Never publish success unless that check passes. A configured key was tested: 2.5 Flash returned 404 (unavailable to new users). After transient 503 errors, the approved 3.8 Flash passed the live text extraction and allergy-envelope check on 16 October 2026. The exact six nutrient values and ingredient order matched the synthetic test label; no photo or clinical validation is claimed. `AMAN` means no configured rule triggered on available data, not medical clearance. Text matching cannot guarantee every allergen derivative or cross-contamination warning is detected. Unknown ingredients remain identified as unknown.

Cache latency is measured, not guaranteed universally below 15 ms. Network, database placement, startup and parsing affect it. Profile/model/engine-version changes alter cache keys. Every supported provider refresh runs through the seeder, which clears derived results before rebuilding examples. Manual/AI scans are outside the reference pool and do not require re-reading corpus counts on each cache hit. Direct operator edits outside the seeder require clearing `scan_caches` or bumping the engine revision. TTL bounds results to one day.

## Verification

```sh
npm run typecheck
npm test
npm run test:integration
npm run build
npx playwright install chromium
npx playwright test
docker compose config --quiet
```

Integration tests use a uniquely named disposable database and drop only that database. Browser tests expect the running public app with automatic photo extraction disabled. Set `TEST_BASE_URL` when using another port. They cover desktop/mobile layout, preference-for-dark overrides, keyboard focus, all examples, dialogs, manual input, dictionary search/pagination, profile saving, ending a session, revocation and working retries after injected connection errors. API checks additionally verify that forged provenance cannot overwrite an imported label. Artifacts are written under `artifacts/` and `test-results/`.

Host-side database/API integration tests need a MongoDB URI reachable from the host and matching the app under test. Compose intentionally keeps its database private; the browser suites can test the Docker app directly without publishing MongoDB. The temporary development MongoDB container used during implementation is stopped, with its data preserved.

## Public deployment

Compose uses `APP_BIND` to control the listening interface (default `0.0.0.0`); set `APP_BIND=127.0.0.1` for host-local access. Public deployment requires HTTPS, exact `APP_ORIGIN`, `SESSION_SECURE=true`, and a strong URL-safe MongoDB bootstrap password configured before initializing the production volume. Public users start with private temporary sessions. Use a TLS reverse proxy. Enable `TRUST_PROXY` only when it overwrites forwarded-IP headers; otherwise pre-auth rate limiting deliberately uses a shared bucket instead of trusting spoofed addresses.

The bounded exact sliding-window limiter is process-local: deploy **one app replica**. A distributed limiter is needed before horizontal scaling. Back up the persistent MongoDB volume; normal Compose shutdown preserves it.

The app runs non-root with dropped capabilities. Session secrets contain 256 random bits; only SHA-256 hashes are stored. Passwords use salted scrypt. Cookies are HttpOnly/SameSite=Lax and Secure when configured for HTTPS. Mutations validate Origin; request bodies are capped before parsing. JPEG/PNG/WEBP uploads undergo signature and structural checks, are not served and never executed. These checks are not an antivirus scanner or a security certification.

## References

[MongoDB aggregation](https://www.mongodb.com/docs/manual/reference/operator/aggregation/), [Google structured JSON](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html), [WHO diet guidance](https://www.who.int/news-room/fact-sheets/detail/healthy-diet), [NIDDK GERD diet](https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/eating-diet-nutrition), [EFSA additives](https://www.efsa.europa.eu/en/topics/topic/food-additives), [University of Sydney GI explanation](https://glycemicindex.com/2013/07/gi-update-with-prof-jennie-brand-miller-5/).

Impor harga massal: `npm run data:prices`. Snapshot observasi, bukti, tanggal dan laporan cakupan disimpan terpisah di `data/prices.*.json`; satuan harga yang belum pasti tidak mengganti estimasi per sajian.

## Akun dan navigasi ponsel

`/login` dan `/register` menyediakan akun umum yang opsional. Daftar memakai nama, email dan kata sandi minimal 12 karakter; profil tamu aktif dipertahankan ketika diubah menjadi akun. Login memakai sesi acak dengan hash di database, kedaluwarsa eksplisit, dan cookie HttpOnly. Email unik, validasi Zod, pemeriksaan Origin dan pembatasan percobaan berlaku pada pendaftaran dan login. Profil tersimpan tersedia kembali sesudah login dari perangkat lain. Profil saya dapat mencabut akses perangkat lain atau perangkat saat ini.

Di ponsel, Scan label, Kamus bahan, Riwayat dan Profil saya berada di navigasi bawah dengan ruang aman untuk indikator perangkat. Halaman masuk/daftar memiliki tombol kembali dan pilihan tetap memeriksa tanpa akun. Pengalihan setelah autentikasi hanya menerima halaman aplikasi yang diizinkan.

Setelah daftar dari scanner atau kamus, `/welcome` menawarkan pengaturan profil yang dapat dilewati. Menyimpan atau melewati langkah ini mengembalikan pengguna ke tujuan awal. Pendaftaran untuk menyimpan profil tamu langsung kembali ke profil tersebut. Login langsung kembali ke halaman yang dituju. Formulir ponsel tampil tanpa pengantar panjang; hasil scanner mendapat fokus setelah selesai dan menyediakan tautan kembali ke input.

## Pembaruan sumber otomatis

Compose menyertakan layanan `updater`: pembaruan setiap 24 jam, percobaan ulang satu jam setelah kegagalan, validasi sebelum seed, serta status sumber/tanggal di scanner dan kamus. Sumber katalog bundel historis adalah staging penyedia; pembaruan otomatis hanya menerima produksi dan tidak menandai snapshot lama sebagai baru ketika akses gagal. Analisis lengkap memakai fakta database. Ringkasan foto kini disertai penelusuran sumber produk pada provider yang didukung; respons sukses dicache hingga enam jam, tanggal pengambilan/koleksi ditampilkan, dan kegagalan sumber tidak dianggap sebagai data terbaru. Penelusuran ini tidak menjangkau seluruh situs internet dan tidak menjamin formulasi identik tanpa barcode. Lihat [DATA_REFRESH.md](DATA_REFRESH.md).

## QA alur pengguna

[QA_FLOW.md](QA_FLOW.md) memetakan 16 skenario dari akses tamu/akun hingga kamera, OCR, tinjau, hasil, riwayat dan keluar. [QA_REPORT.md](QA_REPORT.md) mencatat temuan, koreksi, pengujian ulang dan batas bukti. Uji browser menggunakan fixture yang disertakan di tests/fixtures; respons gagal terkontrol dipisahkan dari pemeriksaan AI nyata.

### Tanya Nara

Hasil foto mendapat penjelasan Nara otomatis yang tidak menahan angka gizi, disertai chat opsional untuk pertanyaan lanjutan. AI menyusun jawaban dari pertanyaan, fakta label, profil saat scan dan hingga enam percakapan terakhir; bukan hanya memilih paragraf topik. Angka dalam jawaban harus merujuk nilai yang dihitung server. Keluaran yang tidak lolos pemeriksaan atau kegagalan provider memakai fakta cadangan berlabel. Edukasi gizi dan kebiasaan makan diperbolehkan; diagnosis, resep dan jaminan keamanan medis tidak dibuat.

Gula total tidak dijumlah ulang dengan nama gula dalam komposisi. Kamus mengenali sumber gula dan fungsi bahan langsung dari bacaan komposisi, tanpa mengubah urutan bahan menjadi gram terukur. Endpoint `POST /api/ask-nara` memerlukan sesi, origin yang diizinkan dan riwayat milik pengguna, dengan batas 15 permintaan per menit per pengguna per proses. Aplikasi tidak menyimpan database chat terpisah, tetapi pertanyaan, fakta dan enam percakapan terakhir dapat dikirim ke penyedia AI untuk konteks. Lihat [QA_NARA_CONTEXT.md](QA_NARA_CONTEXT.md) untuk bukti dan batas pengujian.


### Jalur foto vision versi 3

Pembacaan foto produksi kini hanya memakai vision. OCR lokal tidak dipanggil dan tidak menjadi fallback otomatis ketika penyedia AI gagal. Pemeriksaan satuan, porsi dan batas angka tetap berjalan deterministik. Gula, natrium, ukuran sajian atau jumlah sajian yang belum terbaca memicu maksimal satu pembacaan visual ulang. Dua kolom/porsi berbeda tidak digabungkan; konflik visual dicatat beserta dua transkripsinya. Riwayat cross-check lama memakai transkripsi vision tersimpan tanpa veto OCR, dengan pemberitahuan bahwa foto lama belum dilihat ulang. Koreksi pengguna tetap dipertahankan.

Ringkasan menampilkan total satu kemasan bila jumlah sajiannya diketahui; jika tidak, hanya per sajian. Perkiraan sendok memakai rasio berat WHO50g≈12sendok teh, bukan ukuran gula tambahan. Saran separuh dan pembanding memakai volume/porsi produk yang terbaca. Persentase profil dipindahkan ke detail, bukan menjadi label otomatis baik/buruk.

### Automatic package-price estimates

Photo results now fetch an independent package-price range. Public IDR observations are checked for variant, quantity, unit, proof and date; otherwise Nara may provide a clearly labelled AI estimate with no invented retailer citation. Price uncertainty does not overwrite nutrition or become a personal budget, savings claim or verified-price ranking. Source/model failures have a retry and never block the scan result. Nara price answers share the same estimator and explicitly identify their origin. See [QA_PRICE_ESTIMATE.md](QA_PRICE_ESTIMATE.md).

### Pasang ke layar utama (PWA)

BongkarLabel memiliki manifest, ikon biasa/maskable, ikon Apple, dan service worker produksi. Aplikasi yang dipasang membuka `/scanner` dalam mode mandiri. Android/Chrome: menu browser → **Instal aplikasi** atau **Tambahkan ke layar utama**. iPhone/Safari: **Bagikan → Tambahkan ke Layar Utama**. Nama/menu bergantung versi browser. Gunakan HTTPS pada domain publik; `localhost` dapat dipakai untuk pengujian lokal, sedangkan HTTP dari alamat IP LAN tidak memenuhi secure context untuk service worker.

Scan, Nara, login dan riwayat membutuhkan internet. Service worker hanya menyimpan halaman offline, font dan ikon publik; halaman pribadi, respons API dan hasil AI tidak disimpan dalam Cache Storage. Pembaruan worker menunggu sesi lama ditutup agar kamera atau pengisian formulir tidak terputus. Saat mengubah aset offline, naikkan versi cache di `public/sw.js`.

### Pembanding hasil foto

Tab Pilihan pengganti mencari produk sejenis dengan gula lebih sedikit pada volume/berat yang sama dari katalog Indonesia, sumber publik, atau foto pribadi. Hasil menyertakan pertukaran gizi, sumber/tanggal, harga bersumber atau estimasi AI yang dilabeli, serta bekal memilih makanan. Data kosong tidak menjadi nol; takaran saji tidak dianggap ukuran kemasan. Nara menggunakan daftar pembanding yang sama. Jika belum ada bukti yang memadai, aplikasi memberi langkah lanjut tanpa mengarang produk/harga. Lihat [QA_PHOTO_ALTERNATIVES.md](QA_PHOTO_ALTERNATIVES.md).

Scan foto mendukung hingga enam sisi dari satu produk, maksimal 5 MB per foto. Kamera dan galeri dapat digabung; seluruh foto yang dipilih ikut dibaca. Lihat [QA_MULTI_PHOTO.md](QA_MULTI_PHOTO.md) untuk batas dan bukti pengujian.
