# Verification record

15 October 2026, Asia/Jakarta.

## Running release

- Public preview: http://localhost:3001. Port 3000 belongs to an existing unrelated service and was preserved.
- Docker Compose app and MongoDB services are healthy. The seeder exits successfully before application startup.
- The deployed interface is light, starts without creating an account, contains no judge login, and begins with no assumed health conditions.
- Provider snapshot: 55 community food labels across five categories. Five illustrative examples are separate from source-backed reference labels.
- Dictionary source: 764 additive nodes plus 6,654 ingredient nodes, yielding 7,351 imported canonical rows and 7,279 dictionary entries after interpretation-rule merging.
- Refreshing seed data updates provider facts, enriches ingredients and derives NOVA with the deterministic classifier. It preserves user profiles and rebuilds example caches after clearing older derived results.

## Completed checks

| Check                      | Result                                                 | Evidence                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict TypeScript          | Passed                                                 | Host type check and Docker production build                                                                                                                                                                     |
| Unit/provider tests        | Passed (algorithm/provider and price validation files) | `tests/algorithms.test.ts`, including the full provider snapshot                                                                                                                                                |
| Real MongoDB integration   | Passed                                                 | Disposable database, native Jaccard/dominance/facet pipelines, empty/tie behavior, unique product upsert, session TTL and single-round-trip session resolution with immediate expiry/revocation/profile updates |
| HTTP integration           | Passed                                                 | Origin, authentication, bounded body, magic bytes, cache/profile isolation, explicit expiry, and forged provenance cannot overwrite a provider record                                                           |
| Production browser flows   | 5 passed                                               | `artifacts/browser-results.json`, final Docker deployment                                                                                                                                                       |
| Docker build               | Passed                                                 | Next.js standalone app and automatic seeder targets built successfully                                                                                                                                          |
| Compose validation/startup | Passed                                                 | Config validation, successful seed exit, app/MongoDB healthy                                                                                                                                                    |
| Runtime dependency audit   | 0 reported vulnerabilities                             | `npm audit --omit=dev` during this session                                                                                                                                                                      |

The database/API suites were executed against the temporary development database and running development app before the database was stopped. Browser suites were then executed against the actual production Docker app. Live provider attempts are recorded below; no successful Gemini output is claimed.

## Cache measurements

Eight sequential warm cache hits were measured on the latest Docker release after the browser suite completed. All eight returned `cacheHit: true`; one explicitly recorded warmup request is excluded.

- Median application processing time: **10.54 ms**.
- Maximum application processing time: **13.63 ms**.
- Recorded application samples: 12.58, 13.63, 12.04, 10.29, 10.39, 10.17, 10.69 and 9.62 ms.
- End-to-end round trips: **20.10–27.66 ms**. Full samples are in `artifacts/cache-benchmark.json`; reproduce with `node --import tsx scripts/benchmark-cache.ts`.

All measured application samples were below 15 ms. This finite warm, sequential sample does not establish the blueprint's absolute latency guarantee under cold startup, concurrent load or a different host. Session and user resolution now use a single indexed MongoDB aggregation round trip while still checking expiry and current profile/revocation state on every request. Cache keys include payload, complete health profile, selected model and engine version. Provider refreshes invalidate derived caches through the seeder; uncertainty-tagged manual/AI entries are excluded from the reference pool.

## Data and provider boundaries

Food-label values are community contributions with source URLs, not manufacturer/laboratory verification. The snapshot has complete declared serving data and six numeric nutrients for every admitted reference record. Missing nutrient fields were rejected, not replaced with invented zeroes.

**Current accurate prices for 40+ Indonesian minimarket products have not been obtained.** Bundled prices are explicitly labelled simulation assumptions per serving. The bulk importer fetched all IDR pages and returned 25 records; 23 passed proof/date/barcode validation, with one barcode overlap among 55 catalogue products. The snapshot and checksum/coverage manifest are in `data/prices.*.json`, without complete serving-price coverage. These observations were not relabelled as current verified catalogue prices. See data/README.md for provenance and licensing.

**Live Gemini 3.8 Flash extraction and reranking passed on 16 October 2026 (Asia/Jakarta).** The opt-in check used an explicit synthetic text label, matched all six nutrient values, preserved ingredient order, retained deterministic allergy avoidance, and accepted no invented candidate IDs. The complete-label two-call check passed again with the stricter completeness contract in 24.6 seconds. An expanded negative-case run then encountered HTTP 503, and a separate incomplete-label probe encountered HTTP 429. `artifacts/gemini-live.json` and `artifacts/gemini-incomplete.json` retain those later failures; the negative remote case is not claimed verified. This is text/provider validation, not photo OCR or clinical validation. Gemini 2.5 Flash previously returned HTTP 404 for new users; the owner explicitly approved the 3.8 replacement. Provider availability and quota can vary; the app preserves local analysis and refuses text without numeric nutrition data before making a remote request.

NOVA, positional weights, the nutrition value score and sugar-only GL proxy are heuristics with visible limits. No 96th-percentile result is hardcoded, no code number alone proves harm, and the application does not provide medical clearance.

## UI evidence

The full rule-by-rule UI gate and recorded control actions are in DELIVERY_GATE.md. Screenshots in `artifacts/` include desktop landing/scanner/profile, mobile landing/scanner, and the 320-pixel landing. The final browser suite checks dark-system preference while preserving a light page/dialog, normal and empty/error states, valid and invalid input, actual retries, navigation, all examples, session reuse, profile saving, ending a session and revocation.

The UI gate passes within its stated web scope. This record deliberately distinguishes that result from the unsuccessful external AI, price-coverage and universal-latency requirements above.

## Latest UI revision

The owner requested natural gradients and a shorter ingredient example outside the hero. The latest owner correction removes sage dominance. Warm stone is the background, apricot and blue-gray gradients are localized near the top, navigation is neutral, reading panels ivory, the example sidebar linen, secondary information blue-gray, and metric strips pale clay. Green is limited to actions, selection and semantic states. Dialogs, chart tooltips, dictionary entries, loading/empty states and results share these surface colors. The hero is centered around the title/action; a compact two-column example below it uses wrapped ingredient tags instead of a long ledger. `artifacts/ui-review.json` records responsive checks; current screenshots are in `artifacts/home-desktop.png`, `home-390.png` and `home-320.png`.

The latest colored-surface release passed all four production browser flows. Additional 390 px checks covered home, scanner, dictionary and profile, with gradients present, non-white foundations and no horizontal overflow (`artifacts/palette-review.json`). Viewport screenshots are `artifacts/palette-*-mobile.png`; desktop screenshots cover the landing, scanner, dictionary and profile. Text contrasts on the stronger palette were measured at 4.68:1 for muted text on apricot, 6.66:1 for green links on linen and 8.71:1 for primary button text.

## Account verification — 16 October 2026

The actual API/MongoDB account suite passed against an isolated seeded test database: guest profile preservation, normalized unique email, salted password verification, token rotation, old-session invalidation, duplicate registration, already-authenticated registration rejection, invalid-origin rejection, weak-password rejection, failed login, successful persistent login and the login-route guard. The existing security API suite also passed. The isolated test container and its data were removed afterward.

The final Docker release passed all five browser flows, including mobile registration/login, guest upgrade with preserved profile, wrong-password feedback, post-login route guards, cross-device revocation, result anchors, collapsed aliases and working search reset. Additional checks at 320, 390, 768 and 1440 px found no auth-page overflow; the 320 px scanner footer clears the fixed bottom navigation (`artifacts/auth-responsive.json`). The account flow was recorded to `artifacts/account-mobile-flow.webm`; screenshots cover login/registration and profile. These are web-browser checks, not native simulator/FPS certification. Generated persistent test accounts were removed by their exact random test email after each run.

# UI flow and palette revision — 16 October 2026

The final Docker image was built from the revised auth/profile/scanner flow and palette. Five production browser flows passed in 43.5 seconds with no failures. Optional setup save/skip returns to the intended destination; the upgraded guest retains allergies and budget. Nine additional responsive/destination checks passed across 320/390/768/1440 px. Six sampled contrast pairs pass 4.5:1. Typecheck and all three unit-test files pass. The generated test account and its sessions were removed; app and MongoDB are healthy. Screenshots, browser report and the 10.72-second account recording are retained under artifacts/. This revision does not claim a new live Gemini-provider verification or native performance measurement.

## Scanner and coverage follow-up

The following production revision passes six browser flows in 51.5 seconds and four scanner layout checks at 320/390/768/1440 px. Manual/text fields and selected files survive method switches; hidden inactive fieldsets do not participate in form submission. Results precede examples in both mobile layout and DOM order. Profile constraints are visible beside entry and the dictionary exposes source/coverage details. The failed-request test starts a fresh profile document to avoid the newly shared profile cache; actual error and retry behavior is still tested. Six sampled contrast pairs pass 4.5:1. Build/typecheck pass and Docker app/MongoDB are healthy. The generated test account was removed. Dataset audit confirms 7,279 dictionary entries (730 coded, 3 with GI, 6,758 with UNKNOWN app function), 55 community reference labels, and 23 snapshot price observations matching only one reference barcode; prices have not been silently promoted to per-serving retailer evidence. See DATA_COVERAGE.md. No expansion or completeness of the underlying dataset is claimed by this UI revision.

## Data and photo review expansion — 16 October 2026

This section supersedes the earlier 55-reference coverage counts. Country-export import now retains 7,898 named market products and 89 strict references, preserving missing catalogue fields as null. Merged dictionary count remains 7,279; available provider descriptions (964), technological-function lists (684) and EFSA links (78) are exposed with provenance. There are 23 proof-backed community price observations, matching 11 market-catalogue products but one strict reference; none is promoted automatically to a serving price. Regulatory/SDS/halal completeness is not claimed. See DATA_COVERAGE.md.

Photo extraction uses a dedicated review endpoint, actual image decoding and deterministic unit conversions. Native Tesseract with Indonesian/English language data is included in Docker and provides a fallback plus conservative agreement checks when Gemini succeeds. Image analysis requires correction/completion and explicit review in the UI. The controlled local benchmark passes five checks, including rotation, decimal-comma per-100 conversion, missing-fiber preservation and low-resolution rejection. Gemini matched the baseline twice, but its extended benchmark was interrupted by HTTP 429. These samples do not establish perfect accuracy on real packaging. See OCR_VALIDATION.md for the exact boundaries. Source typecheck and all four unit-test files pass.

Deployed MongoDB audit confirms 7,279 dictionary entries, 7,898 catalogue products, 89 source-backed references, 964 descriptions, 684 function lists and 78 EFSA links. Both integration suites pass in the Compose environment against temporary test databases. The actual Docker photo endpoint returns HTTP 200 with all six expected nutrient values and mandatory review through LOCAL_OCR when Gemini fails (21.3 seconds for that request). The app and MongoDB health checks pass.

Final production browser suite: **9/9 pass in 48.6 seconds**. Coverage includes account upgrade/login, public examples, mobile navigation, retained drafts, photo-endpoint auth/origin/image validation, prevention of direct photo analysis, photo review/corrections/confirmation invalidation, source-photo binding after changing the selected file, live catalogue search and real error retries. Catalogue search and completed review have no horizontal overflow at 320 px. The initial run's single failed test used an incomplete accessible field name (`Gula (g)` instead of `Gula (g), per sajian`); correcting that locator and rerunning the full suite produced the clean result without an application change. The separate OCR benchmark and actual photo endpoint checks measure extraction; the browser extraction response is controlled to isolate UI behavior. Screenshots were visually inspected. Generated persistent test accounts were removed by exact random email. Final Docker build and app/MongoDB health checks pass.

## Source quality and scheduled refresh audit — 16 October 2026

This audit corrects the earlier description of `.net` as a mirror: the provider documents it as staging. The bundled catalogue's original staging URL, checksum and retrieval timestamp are retained; future automated imports require production `.org`. A direct production-export probe returned HTTP 503. No claim of a successful production synchronization or universal current accuracy is made.

Two impossible nutrient masses in incomplete catalogue records are now null, and one previously rejected partial record is retained after invalid quantities are cleared. The active catalogue has 7,899 products, with 89 strict references and the same 7,279 merged dictionary entries. All snapshots and manifests are validated before the seeder connects and writes. The quality audit rejects duplicates, mismatched counts, future manifest dates and impossible solid-serving nutrient mass. Startup refuses to overwrite newer source dates with older bundled data.

The Docker updater runs independently of this chat, checks every 24 hours after success and schedules a one-hour retry after failure. Its real first attempt failed in catalogue download/validation; a database audit verified that the original staging source date remained unchanged, 7,899 catalogue records remained active, the job lock was removed and the retry timestamp was recorded. The actual updater can load its importer runtime and validate a bundle from an isolated working directory. No complete successful production-import/promotion cycle is claimed while the production source is unavailable. The standalone MongoDB seed is not a multi-collection transaction; database failures during writes require inspection/retry as documented in DATA_REFRESH.md.

All five unit-test files and both MongoDB integration suites pass. The ten-flow browser suite includes source origin/date disclosure and a 320 px source-panel overflow check, in addition to accounts, photo review and catalogue flows. The initial browser failure was an old selector matching both coverage panels; scoping it to the product/price panel resolved the ambiguity. The source panel screenshot was visually inspected. See the final run below for the measured completion time.

Final deployed browser rerun: **10/10 pass in 48.1 seconds**. App and MongoDB are healthy; updater remains running after recording the source failure/retry. The generated persistent browser account was removed by exact random email. No secrets or generated browser artifacts are included in the commit.
