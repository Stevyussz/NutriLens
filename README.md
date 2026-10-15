# BongkarLabel

Aplikasi Next.js 15 / React 19 untuk membedah komposisi pangan, mendeteksi pola pemisahan sumber gula, dan membandingkan pilihan berdasarkan harga, protein, gula, profil, serta rasa. **Seluruh web memakai tema terang**, sesuai instruksi pemilik terbaru yang menggantikan arahan dark mode dalam blueprint.

## Jalankan

```sh
docker compose up --build
```

Buka [http://localhost:3000](http://localhost:3000), pilih **Periksa label**, lalu isi kemasan atau pilih salah satu contoh analisis. Tidak perlu membuat akun. MongoDB 8 diperiksa kesehatannya; service seeder mengisi data secara idempoten sebelum aplikasi menerima koneksi. Database tidak mengekspos port ke host. Pengunduhan image dan dependensi pertama kali memerlukan internet; snapshot label dan kamus sudah disertakan.

Gemini opsional. Tanpa kunci, preset, formulir label lengkap, parser teks terstruktur, algoritma, pencarian MongoDB, grafik, profil dan sesi tetap berfungsi. Ekstraksi foto memerlukan Gemini; aplikasi menjelaskan keterbatasan tanpa membuat hasil fiktif.

Untuk mengaktifkan Gemini, salin `.env.example` ke `.env`, isi `GEMINI_API_KEY` dan pilih `GEMINI_MODEL` yang tersedia untuk akun Anda, kemudian jalankan ulang Compose. Gambar/teks dikirim ke Google saat layanan aktif. Jangan unggah foto yang memuat data pribadi. Berkas gambar mentah tidak disimpan oleh aplikasi.

Port host dapat diubah dengan `APP_PORT`; sesuaikan juga `APP_ORIGIN` dengan alamat yang dibuka browser. `APP_ORIGIN` harus sama persis dengan origin pengguna, termasuk port. Workspace pengujian ini memakai port 3001 karena port 3000 sudah digunakan layanan lain.

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

1. Pilih Periksa label. Profil pribadi dimulai tanpa kondisi medis, dengan batas awal gula 50 g, natrium 2.000 mg dan anggaran Rp10.000 yang dapat disesuaikan.
2. Pilih FitGandum, buka detail bahan dan urutan setelah sumber gula digabung.
3. Uji cokelat malt, mi pedas, kopi aren, dan keripik keju untuk melihat gizi, konteks profil serta kode aditif.
4. Cari `INS 621` atau `E951` di Kamus bahan. Pencarian dan pagination membaca MongoDB.
5. Ubah batas konsumsi/anggaran pada Profil saya, simpan, lalu pindai ulang. Cache mencakup seluruh profil.
6. Periksa indeks dan cabut sesi. Mencabut sesi saat ini langsung mengeluarkan pengguna.

Lima preset adalah **skenario ilustratif** dari brief, bukan klaim tentang merek riil. Persentil natrium ke-96 tidak dipaksakan: hasil dihitung dari populasi kategori yang tersedia.

## Arsitektur

```text
Browser (tema terang)
  | HttpOnly cookie, Origin check, bounded request body
  v
Next.js Route Handlers
  | SHA-256(payload + profile + model mode + engine version)
  +--> MongoDB scan_caches --> validated personalized response
  |
  +--> Configured Gemini extraction (responseSchema + Zod)
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
- Price at most source price and user budget, sugar at most 75% of source, protein at least source.
- Jaccard `|intersection| / |union| >= 0.35` via `$setIntersection`, `$setUnion`, `$size`, guarded `$divide`.
- Similarity and protein per Rp1.000 descending, maximum six candidates.
- `$lookup` evaluates strict dominance on price, sugar and protein against all qualifying candidates. Only nondominated, profile-compatible candidate IDs can be recommended.
- `$facet` computes inclusive empirical CDF percentiles. Ties count as `<=`; no population yields null.

Comparisons use the declared serving, whose size can differ. They are not standardized per-100-g clinical comparisons; serving size and limitations appear in the UI.

Unique email, barcode, dictionary name, token hash and cache hash indexes protect identity. Products have category/price/sugar compound and flavor multikey indexes. Dictionary aliases have a multikey index. Sessions have `expiresAt` TTL (`expireAfterSeconds: 0`), plus explicit expiry checks because TTL cleanup is asynchronous. Analysis cache TTL: 24 hours.

### AI boundary and fallback

The official `@google/genai` SDK uses `GEMINI_MODEL` (default `gemini-2.5-flash`), JSON MIME, response schemas and Zod. The owner approved `gemini-3.8-flash` for this deployment after Google rejected 2.5 Flash for new users (HTTP 404). Model identity is included in the cache key. Label contents are untrusted data. Reranking IDs must exist among supplied candidates. Gemini cannot downgrade the deterministic safety envelope. Outside-catalogue suggestions are separate estimates with no verified stock claims; they are suppressed for profiles with declared allergies.

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

Snapshot: **55 source-linked community food labels** across five categories, plus a bulk glossary derived from **764 additive nodes and 6,654 ingredient nodes** supplied by Open Food Facts. The importer deduplicates multilingual aliases and the seeder overlays 69 local interpretation rules. Raw source counts/checksums and the import timestamp live in `data/dictionary.manifest.json`; per-record provider IDs and URLs are retained. Five illustrative presets remain separate from real product labels. See [data/README.md](data/README.md).

Run `npm run data:dictionary` to refresh the full provider taxonomy, then `npm run db:seed` to import it into MongoDB in batches. `npm run data:import` refreshes product labels. No one-at-a-time lookup is needed. Startup uses the bundled snapshots and works without internet after image/dependency downloads.

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

Default Compose settings bind to localhost. Public deployment requires HTTPS, exact `APP_ORIGIN`, `SESSION_SECURE=true`, and a strong URL-safe MongoDB bootstrap password configured before initializing the production volume. Public users start with private temporary sessions. Use a TLS reverse proxy. Enable `TRUST_PROXY` only when it overwrites forwarded-IP headers; otherwise pre-auth rate limiting deliberately uses a shared bucket instead of trusting spoofed addresses.

The bounded exact sliding-window limiter is process-local: deploy **one app replica**. A distributed limiter is needed before horizontal scaling. Back up the persistent MongoDB volume; normal Compose shutdown preserves it.

The app runs non-root with dropped capabilities. Session secrets contain 256 random bits; only SHA-256 hashes are stored. Passwords use salted scrypt. Cookies are HttpOnly/SameSite=Lax and Secure when configured for HTTPS. Mutations validate Origin; request bodies are capped before parsing. JPEG/PNG/WEBP uploads undergo signature and structural checks, are not served and never executed. These checks are not an antivirus scanner or a security certification.

## References

[MongoDB aggregation](https://www.mongodb.com/docs/manual/reference/operator/aggregation/), [Google structured JSON](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html), [WHO diet guidance](https://www.who.int/news-room/fact-sheets/detail/healthy-diet), [NIDDK GERD diet](https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/eating-diet-nutrition), [EFSA additives](https://www.efsa.europa.eu/en/topics/topic/food-additives), [University of Sydney GI explanation](https://glycemicindex.com/2013/07/gi-update-with-prof-jennie-brand-miller-5/).

Impor harga massal: `npm run data:prices`. Snapshot observasi, bukti, tanggal dan laporan cakupan disimpan terpisah di `data/prices.*.json`; satuan harga yang belum pasti tidak mengganti estimasi per sajian.

## Akun dan navigasi ponsel

`/login` dan `/register` menyediakan akun umum yang opsional. Daftar memakai nama, email dan kata sandi minimal 12 karakter; profil tamu aktif dipertahankan ketika diubah menjadi akun. Login memakai sesi acak dengan hash di database, kedaluwarsa eksplisit, dan cookie HttpOnly. Email unik, validasi Zod, pemeriksaan Origin dan pembatasan percobaan berlaku pada pendaftaran dan login. Profil tersimpan tersedia kembali sesudah login dari perangkat lain. Profil saya dapat mencabut akses perangkat lain atau perangkat saat ini.

Di ponsel, Periksa label, Kamus bahan dan Profil saya berada di navigasi bawah dengan ruang aman untuk indikator perangkat. Halaman masuk/daftar memiliki tombol kembali dan pilihan tetap memeriksa tanpa akun. Pengalihan setelah autentikasi hanya menerima halaman aplikasi yang diizinkan.

Setelah daftar dari scanner atau kamus, `/welcome` menawarkan pengaturan profil yang dapat dilewati. Menyimpan atau melewati langkah ini mengembalikan pengguna ke tujuan awal. Pendaftaran untuk menyimpan profil tamu langsung kembali ke profil tersebut. Login langsung kembali ke halaman yang dituju. Formulir ponsel tampil tanpa pengantar panjang; hasil scanner mendapat fokus setelah selesai dan menyediakan tautan kembali ke input.
