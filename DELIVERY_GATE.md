# BongkarLabel UI delivery gate

## Latest scanner and data revision — 16 October 2026

This revision supersedes the earlier peach-dominant foundation. The canvas is mineral blue (#e4ebed), with a bounded blue/sand/apricot gradient, warm reading surfaces and terracotta actions. Six sampled text pairs pass 4.5:1 (minimum 5.29:1; primary action 6.85:1). Results use a distinct reading surface and the input methods have equal-width targets.

Six production browser flows passed in 51.5 seconds, with zero failures or flaky tests. The new flow verifies retained manual/text drafts and selected filenames across methods, result focus, visual and DOM order of results before examples on mobile, return-to-input/examples anchors, and a functioning data-coverage disclosure. The error-injection test explicitly reloads the profile document so the fresh scanner profile cache does not bypass its simulated failed request; its actual error and retry assertions remain intact.

Four additional production layout checks at 320/390/768/1440 px pass without horizontal overflow, including equal-width method controls under dark system preference. Final scanner and expanded data-coverage screenshots were inspected. The duplicate scanner empty panel is removed; inactive fieldsets are hidden and disabled, preserving browser-held inputs without hidden required-field validation. Labels/photos are not written to browser storage. Optional profile conditions use native disclosure. Snapshot observations are distinguished from live database counts and estimated serving prices.

The production build and typecheck pass, app and MongoDB are healthy, and the exact generated browser account/sessions were removed. Evidence: artifacts/browser-results.json, scanner-responsive-final.json, scanner-contrast.json, dataset-coverage.json, scanner-refined-_.png, coverage-refined-_.png, and scanner-journey.webm. Recording is retained and sampled frames inspected; native simulator/frame-rate measurements are not claimed. DATA_COVERAGE.md records known data gaps rather than claiming a complete datasheet. No new generated assets or catalogue-screen research are claimed.

## Current revision — 16 October 2026

This record supersedes earlier palette/auth-layout measurements below. Antislop DURING; responsive web scope. Direction and rationale are in the current section of DESIGN.md.

- Functional gate: five production browser flows passed, 0 failures, 43.5 seconds. The account flow now verifies guest profile retention through registration, optional setup saving back to the dictionary, skipping back to scanner, login return destination, password validation/visibility, and revocation of another device's session. Scanner examples/manual input, section links, dictionary search/disclosures/pagination, errors/retries, profile saving and logout remain exercised.
- Responsive gate: nine additional checks passed. Login/register were captured at 320, 390, 768 and 1440 px, with one main heading and no horizontal overflow. At widths up to 900 px the form appears without the marketing introduction; mobile form top is approximately 100 px. Continuing without an account preserves the requested dictionary destination. Dark system preference still yields the explicit light theme.
- Visual gate: final screenshots of auth desktop/mobile, optional setup, home and scanner were inspected. Auth route-switch links replace the duplicate lower switch. The full-height auth background no longer ends at a collapsed margin; the page gradient fades into its base rather than showing a hard edge. Terracotta identifies actions, peach frames account setup, mineral blue supports navigation/examples/data and quiet off-white supports reading. Semantic green/amber/rose remain labelled analysis states. No new image assets, promotional metrics, dark surfaces or inactive controls were introduced.
- Contrast gate: six sampled foreground/background pairs pass 4.5:1. Primary action is 6.85:1; panel-peach supporting text 5.31:1; blue supporting surface text 6.19:1; selected action text 5.33:1; muted peach text 4.86:1; reading text 11.94:1. Full measurements are in artifacts/refined-contrast.json. Focus rings, visible labels and 44 px minimum controls remain in place.
- Flow gate: results receive keyboard focus after completion and provide a working return-to-input anchor. Scan errors remain adjacent to the input task. Auth and completed setup use replace navigation; validated destinations remain restricted to existing application pages. Setup conditions start unchecked and users can skip. Session audit is not fetched during setup.
- Build gate: typecheck and all three unit-test files pass. Final Docker production build succeeded; app and MongoDB are healthy. The exact generated browser-test account and its sessions were removed after verification; user data was retained.
- Evidence: artifacts/browser-results.json, refined-responsive.json, refined-register-_.png, refined-login-_.png, onboarding-mobile.png, home-desktop.png and account-mobile-flow.webm. Web recording is retained and sampled frames were reviewed; no native simulator or frame-rate certification is claimed. Appllama MCP was unavailable, so no catalogue research is claimed. Existing provider availability, reference-price and clinical limits remain unchanged.

Earlier iteration records follow.

15 October 2026, Asia/Jakarta. Antislop mode: DURING, selected for this session. Scope: the Next.js public website, not a native mobile app. Direction and decision reasons are recorded in DESIGN.md.

The owner's latest direction overrides the original dark/judge presentation: fixed light theme, public entry without creating an account, neutral initial health profile, optional personal constraints, and technical details behind disclosure controls.

## Hard gate

- R-02 PASS: source scan found no em dash in authored application copy.
- R-03 PASS: 320 px and 390 px mobile checks found no document overflow; desktop and mobile screenshots were inspected. Long headings and ingredient buttons wrap within their containers.
- R-17 PASS: there are no marketing statistics. Displayed nutrients come from label inputs or attributed community records, model weights are explicitly estimates, and prices without evidence are labelled estimates.
- R-18 PASS: no testimonials, invented reviewers, avatars or customer identities exist.
- R-23 PASS: the wordmark is text; no logo/photo artwork was generated. The ingredient illustration uses the explicitly supplied, visibly illustrative cereal example.
- R-24 PASS: public anchors point to the existing reading section; application links resolve to scanner, dictionary and personal profile routes.
- R-25 PASS: measured examples include primary button text 8.71:1, warning text on ivory 7.77:1, muted text on the apricot endpoint 4.68:1, and green links on linen 6.66:1. Neutral text and chart labels use the same verified palette; input boundaries were darkened for visibility.
- R-26 PASS: production browser flows exercised entry buttons, inputs, submission, navigation, ingredient dialogs, disclosures, pagination, profile saving, retry actions, ending sessions and revocation.
- R-27 PASS: initial scanner and zero-search-result empty states work; requests show progress; malformed labels/uploads and injected connection failures show actionable errors and working retries.
- R-28 PASS: no speculative FAQ section is present.
- R-32 PASS: native buttons/inputs/links remain keyboard operable, the skip link receives Tab focus, focus rings are visible, and Radix dialogs close with Escape and their close button.
- R-33 PASS: features were implemented directly in source. No helper rewrites application source or CSS by string replacement; importer scripts write data artifacts only.
- R-34 PASS: a fixed light theme is shipped. Mobile testing explicitly requested a dark system preference and still verified a light gradient page and warm ivory dialog surfaces.
- R-35 PASS: the Docker production build and actual MongoDB startup succeeded; four browser flows passed against the production container, with no unexpected page errors in the main flow. Recorded controls are listed below.
- R-36 PASS: no compliance, certification, stock availability, laboratory accuracy, user-count or universal latency claims were invented. Model estimates and engineering limits are disclosed.
- R-37 PASS: the owner supplied the light/public direction before this revision; DESIGN.md records ENERGY 2 / RHYTHM 2 / MOTION 1 and the rationale for palette, typography and layout.
- R-38 PASS: the bundled reference dataset contains 55 attributed community label records, the five examples are explicitly illustrative, and dictionary provenance is retained per imported entry. Uncertain manual/AI records cannot masquerade as provider labels.

## Purpose gate

- R-01 PASS (explicit owner override): localized apricot/blue-gray gradients frame a warm stone background; the owner explicitly rejected sage dominance. No dark surfaces or animated glows. Emerald marks primary actions and active navigation, while amber/rose carry textual risk states.
- R-04 PASS: Lucide was explicitly requested in the blueprint; scan, camera, clipboard, book, ingredient layers and shield symbols correspond to actual functions.
- R-06 PASS: the offline system sans-serif stack supports familiar Indonesian reading; tabular numerical formatting supports comparisons. No decorative monospace headline is used.
- R-07 PASS: there is no background grid; rows and separators belong to actual ingredient inspection and data tables.
- R-08 PASS: action labels contain no decorative arrows.
- R-09 PASS: there are no promotional capsule badges. Status text reports computed outcomes rather than marketing labels.
- R-10 PASS: no glassmorphism or backdrop blur is used.
- R-12 PASS: panels use borders and whitespace rather than ornamental floating shadows.
- R-13 PASS: no glow treatment is used.
- R-14 PASS: the label-entry panel, compact ingredient example, ingredient inspection and quantitative charts have different compositions dictated by their content.
- R-19 PASS: reading data remains still, including disabled Recharts data animations. Press feedback and the reduced-motion-aware progress indicator communicate actual actions/loading.
- R-22 PASS: there are no stock characters, generated people, generic 3D assets or unsourced product images.

## Liveliness

- Dials PASS: ENERGY 2 / RHYTHM 2 / MOTION 1 are explicit in DESIGN.md.
- Consistency PASS: the large editorial opening, compact working console and quiet data presentation follow those dials.
- Focal point PASS: each page has one main heading and primary task; the manual form opens only when requested.
- Whitespace PASS: spacing separates the initial reading question, input task, results and optional detail sections.
- Accent PASS: emerald identifies actions and active location; semantic warnings are not decorative competing accents.
- Motif PASS: the compact named ingredient tags connect the landing example to the actual ingredient inspection.
- Design Read PASS: the public food-label companion interpretation was recorded before the public-facing revision.

## Craftsmanship and quality locks

- C-1 PASS: DESIGN.md explains major visual and copy decisions rather than relying on a default style.
- C-2 PASS: controls have actual API, navigation, disclosure or dialog behavior, verified in browser flows.
- C-3 PASS: sections explain label interpretation, entry, personal constraints and comparisons; no pricing, testimonial or generic feature filler exists.
- C-4 PASS: desktop/mobile, light under dark-system preference, initial/empty/loading/error states, keyboard entry and retry recovery were exercised.
- C-5 PASS: snapshots retain provider provenance; illustrations, estimates, missing GI and heuristic metrics are labelled honestly.
- R-05 PASS: the landing's reading example and editorial questions differ from the working console and data ledger; no template bento/pricing/trust section is present.
- R-11 PASS: controls use 8 px corners and panels/dialogs 16 px, with compact ingredient rectangles rather than pills everywhere.
- R-15 PASS: actions specify their purpose: Periksa label, Isi informasi kemasan, Cari bahan, Simpan profil, Cabut sesi and Akhiri sesi.
- R-16 PASS: no prohibited AI marketing buzzwords appear in interface copy.
- R-20 PASS: the ingredient-order motif, semantic reading states and budget/serving comparisons give the product a food-label-specific identity.
- R-21 PASS: the fixed light theme follows the owner's explicit instruction; no incomplete dark toggle is exposed.
- R-29 PASS: neutrals carry the layout; emerald is the action accent, with amber and rose used only as semantic states.
- R-30 PASS: the public site uses its own ingredient-reading composition; it does not reproduce a named product's interface.
- R-31 PASS: color, typography, spacing, layout, shape, symbols, motion and provenance decisions each have written reasons in DESIGN.md.

## Recorded control evidence

- Periksa label, header/hero/final section: opens scanner with a private session. Re-entering preserves the same active session; initial conditions are empty.
- Lihat cara kerjanya: navigates to the existing reading section.
- Data & privasi: opens the dialog; Escape and close controls dismiss dialogs.
- Isi informasi kemasan / Label lengkap: opens the form; empty submission focuses the required product name; a complete submission returns an actual analysis.
- Teks bebas: accepts input; incomplete local text reports required missing fields.
- Foto kemasan: accepts file selection; a disguised HTML file named PNG is rejected with visible feedback.
- All five example buttons: return their matching complete analysis, including the cereal splitting example.
- Ingredient buttons: open dictionary-backed detail; close button/Escape dismiss it.
- Consolidated-order and candidate disclosures: reveal actual tables or the honest no-candidate state.
- Dictionary search: INS 621 resolves to the glossary entry; a nonsense query gives the empty state; reset, next and previous work.
- Dictionary/profile retries: recover from injected 503 failures and then display actual server data.
- Profile fields: save the changed budget and display confirmation.
- Technical disclosure: reveals actual indexes, TTL and database counts; refresh updates the audit.
- Cabut sesi: opens a confirmation; Escape cancels; confirming on mobile revokes the current session and returns home.
- Akhiri sesi: removes the active session; attempting a protected route afterwards returns to the public page.

## Boundaries of this gate

This is a UI gate, not a claim that all data is clinically or commercially verified. Retail prices remain explicit estimates; the attempted Open Prices IDR query returned 25 observations with only one barcode overlap and no complete serving-price coverage. No live Gemini call was claimed tested without an API key. Cache observations are recorded separately and are not a universal network-latency guarantee. Native iOS/Android emulator and frame-rate measurements are not claimed for this web project.

Latest owner-directed revision: warm stone, ivory, linen and blue-gray supporting surfaces with limited apricot gradients; centered hero; horizontal ingredient example moved below hero (239 px at desktop). The final Docker browser run passed all four flows, including explicit gradient, below-hero placement, light-system override and compact desktop-height checks. Separate 390/320 px screenshots confirm no horizontal overflow.

## General accounts and mobile flow — 16 October 2026

Five final production-browser flows passed. Accounts are optional, with real registration/login and profile persistence; no judge or privileged demo route exists. Mobile navigation has three fixed peer destinations, 62 px touch targets and safe-area spacing. Auth routes replace on completion and redirect authenticated users away from finished forms. Validation, duplicate emails, failed login, password visibility, profile retention and cross-device session revocation are verified. Widths 320/390/768/1440 pass overflow checks, with the final scanner content clear of the bottom bar. Dictionary aliases expand only on request and search resets the actual input. Result anchors work with keyboard focus. A web flow recording is retained; native simulator/FPS claims remain out of scope.

## Catalogue and OCR follow-up — 16 October 2026

The existing light mineral-blue/cream/terracotta direction remains in place. New catalogue search uses a closed disclosure until requested, explicit source links, incomplete-field descriptions and a single-column mobile result list. A chosen catalogue record leaves price blank and requires checking. Photo reading opens a review with uploaded-image previews, missing-field feedback, optional raw text/conversion disclosures, and the existing editable label form. No invented confidence meter is shown. Corrections invalidate the confirmation checkbox. Datasheet disclosures identify provider content and separate official regulatory links from imported evidence. Remote quota failures fall back to local OCR with a visible explanation.

OCR population accuracy, comprehensive Indonesian regulatory coverage and native simulator/FPS measurements remain outside the verified scope. Test evidence for this revision is recorded in VERIFICATION.md and OCR_VALIDATION.md.

## Source freshness follow-up

Scanner has a compact source-status disclosure; dictionary shows origin, collection dates, attempt/retry times and a source failure warning. Historical staging data is clearly identified. The AI disclosure distinguishes database facts from live web knowledge. At 320 px the dates and warnings wrap without horizontal overflow. Native disclosures and the established light palette are retained. A failed download is visibly reported rather than relabelled as a fresh update. See DATA_REFRESH.md and VERIFICATION.md.
