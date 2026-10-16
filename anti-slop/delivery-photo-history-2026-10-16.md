# Antislop delivery gate: photo inspection and history search

16 October 2026. Mode: during, retained session choice. Scope: the changes in photo inspection, gallery selection and private-history search. This is a responsive-web verification, not native-device or universal OCR certification.

Design Read: a focused food-label workspace for everyday Indonesian consumers, in the existing warm label-studio identity. ENERGY 3 / RHYTHM 3 / MOTION 1. Decision reasons are recorded in DESIGN.md.

## Evidence

Production Docker build and strict TypeScript passed. The final browser run passed 14/14 tests in 1.0 minute. Unit tests passed 28/28. A separate browser recording checked the new controls, loading/error/retry states, responsive widths and console. Local evidence: artifacts/browser-results.json, photo-history-refinement.json, photo-history-refinement.webm, photo-inspection-320.png, history-search-mobile.png and history-search-empty-mobile.png. Screenshots and sampled recording frames were visually inspected.

## Hard Gate

- R-02 PASS: source scan of the changed UI found no em dash in authored copy.
- R-03 PASS: enlarged photo at 320 px and history at 320/390/768/1440 px produce no document overflow; camera regression also checks 320 px.
- R-17 PASS: no marketing numbers added; history counts come from owner-filtered MongoDB queries. Test label values remain visibly illustrative.
- R-18 PASS: no testimonials or fictional identities added.
- R-23 PASS: existing user-selected photos and fixture photos are reused; no new logo, avatar, artwork or navigation destination created.
- R-24 PASS: existing Scan label, Kamus bahan, Riwayat and Profil saya destinations remain real and are exercised by the browser suite.
- R-25 PASS: four new dialog text samples measure 5.35:1 to 14.24:1; existing surface and action tokens are retained. This is a scoped contrast check, not an accessibility certification.
- R-26 PASS: photo open, enlarge, fit, close; history search, reset, retry and deletion all perform their stated actions. Details are listed below.
- R-27 PASS: no-photo state retains camera/gallery entry; excessive/oversized selection shows actionable errors without deleting photos; history loading, failed request, retry and no-match states are exercised.
- R-28 PASS: no FAQ added.
- R-32 PASS: ArrowRight scrolls the enlarged image region; Escape closes the dialog; focus returns to the photo trigger. Existing keyboard, skip-link and dialog tests pass.
- R-33 PASS: this revision was implemented directly in source using patches. No source-rewriting helper was added to the project.
- R-34 PASS: no theme toggle introduced; the current fixed palette and dark-system-preference browser checks pass.
- R-35 PASS: production app built, activated and clicked through; all 14 browser tests pass. The visual recording reports zero page errors.
- R-36 PASS: no accuracy, medical, security-certification or performance claims added.
- R-37 PASS: DESIGN.md was read before editing; the current direction and declared dials are retained.
- R-38 PASS: displayed photos are the selected files; search results are actual private snapshots. No fabricated product result or realistic placeholder introduced.

## Purpose-Gate

- R-01 PASS: existing oat gradient distinguishes the workspace canvas from reading surfaces; no new gradient or glow added.
- R-04 PASS: no new icon set or decorative glyph added; the existing camera and remove icons describe capture and removal.
- R-06 PASS: self-hosted Manrope and tabular numeric styling are retained for readable label content; no new display type or tracked uppercase label added.
- R-07 PASS: no grid, blueprint or dot-pattern background added.
- R-08 PASS: no decorative arrow added.
- R-09 PASS: no capsule, eyebrow badge or promotional status added.
- R-10 PASS: no blur or glass treatment added.
- R-12 PASS: the modal uses the existing dialog layer; no new floating-card shadows added.
- R-13 PASS: no glow added.
- R-14 PASS: saved labels remain compact content rows; no feature-card grid added.
- R-19 PASS: no decorative animation added. The deliberate static reading surface matches MOTION 1.
- R-22 PASS: the selected label photograph is the content being inspected, not a decorative illustration.

## Liveliness

- Dials PASS: ENERGY 3 / RHYTHM 3 / MOTION 1 retained from the established direction.
- Consistency PASS: the warm asymmetric public introduction and quieter scanner/history reading surfaces retain their distinct roles.
- Focal point PASS: the label image leads the inspection dialog; the name query leads history retrieval.
- Whitespace PASS: spacing separates search controls, result counts and saved rows, without adding filler sections.
- Accent PASS: vermilion marks the primary search/scan action; secondary inspection controls remain neutral.
- Motif PASS: paper surfaces and ruled label/history rows retain the packaging-reading identity.
- Design Read PASS: declared before generation in the work update and recorded above.

## Craftsmanship and Quality Locks

- C-1 PASS: each added control has a reason in DESIGN.md: inspect small print, preserve capture work or retrieve a saved label.
- C-2 PASS: each new interactive control is exercised below.
- C-3 PASS: no marketing or template section added.
- C-4 PASS: responsive widths, keyboard, permission error, selection error and history loading/error/retry checks pass.
- C-5 PASS: results and counts use actual saved data; evidence limits are explicit.
- R-05 PASS: a bounded photo dialog and a search-over-rows layout follow the content task; no template section structure added.
- R-11 PASS: existing control/panel corner tokens retained; no pill treatment added.
- R-15 PASS: actions specify Periksa foto, Perbesar foto, Tampilkan seluruh foto, Cari riwayat, Tampilkan semua and Coba lagi.
- R-16 PASS: source scan found no added marketing buzzwords.
- R-20 PASS: the existing printed-label identity remains; inspection displays the actual label rather than a generic product illustration.
- R-21 PASS: the established mixed charcoal/oat reading identity is retained; no forced new theme or deferred theme control introduced.
- R-29 PASS: the existing charcoal, oat/paper and vermilion palette is retained.
- R-30 PASS: no external product interface was cloned.
- R-31 PASS: the reason for dialog, zoom region, separate removal, gallery preservation and history search is written in DESIGN.md.

## Recorded control actions

- Nyalakan kamera -> real browser media stream; Ambil foto label -> JPEG selection.
- Periksa foto 1 -> named dialog opens and camera track ends.
- Perbesar foto -> image expands inside a bounded scroll region; ArrowRight moves the image without widening the document.
- Tampilkan seluruh foto -> image returns to its fitted view.
- Escape -> dialog closes and focus returns to Periksa foto 1.
- Buang foto 2 -> selected photo removed; method switches preserve the remaining selection and other form drafts.
- Gallery selection -> appends within the limit; excess/oversized input -> error and previous photos retained; subsequent valid input -> error cleared and photo appended.
- Baca foto label -> OCR review; missing nutrient correction and confirmation remain mandatory before analysis.
- Cari riwayat -> case-insensitive name match; literal `.*` -> no wildcard expansion and a real no-match state.
- Tampilkan semua -> clears the active query and restores saved rows.
- Delayed history response -> loading indicator; injected failure -> error; Coba lagi -> actual successful fetch and restored rows.
- Baca hasil -> stored result and original profile reopen; Hapus -> confirmation; Ya, hapus -> owner entry removed and empty state shown.
- Another user's history search and detail/delete requests -> no owner records exposed.

Result: PASS within this stated revision and web-testing scope.
