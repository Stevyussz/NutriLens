---
version: 1
slug: "src-app-dashboard-scanner-page-tsx"
primary_target: "src/app/(dashboard)/scanner/page.tsx"
related_targets: ["src/components/navigation.tsx","src/components/scanner/scanner-console.tsx","src/components/history-explorer.tsx","src/components/dictionary-explorer.tsx","src/components/profile-editor.tsx","src/components/auth-screen.tsx"]
---

## Mode
Operate

## Scope
Replace the application identity across scanner, OCR review, results, history, dictionary, profile and authentication. Preserve working product behavior and private history.

## Direction contract

THESIS: Indeks Belanja makes photographing a label and reading a short decision the central work; decorative dashboards and stacked promotional panels are excluded.

OWN-WORLD: Mulberry navigation, pale rose canvas, white reading surfaces and citron primary actions; Work Sans typography, soft rectangular controls and compact aligned per-serving rows.

STORY: Photograph and read an immediate provisional decision from available label facts; correct only a doubtful field if needed. Full composition analysis remains optional and requires explicit review. History makes later reading easy.

FIRST VIEWPORT: Match .impeccable/mocks/decision/indeks-belanja.html: top navigation, concise task heading, camera left and short practical guidance right; on mobile camera and capture action lead above secondary methods. Result begins with decision and two key nutrients. Signature interaction is the camera-to-decision handoff, with a concise readout before optional corrections; state transitions use restrained 160ms fades, respecting reduced motion.

FORM: Indeks Belanja, grounded index 3, seed:f2b0cd503f8fe58c. User delegated choice on 17 October 2026; actual board response selected indeks-belanja. Code-led app; public landing separately comp-led.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Real-label flow correction

The user supplied two Golda photos and reported visible sugar/sodium being discarded plus an onerous mandatory form. A missing local OCR row is no longer treated as a conflicting value; explicit disagreements still block only the affected number. Missing fiber, price and ingredients cannot block the initial nutrient summary. Facts remain nullable, not fabricated. Private history stores photo readings separately from complete analyses. Preserve Indeks Belanja identity.

The next user instruction adds automatic product research. Run it after the initial photo decision; sources are attributed and dated, manufacturer-brand matches stay distinct from variant candidates, and web values cannot silently overwrite photo facts. Source lookup failures do not block the decision. AI selects bounded source identifiers; deterministic validation retains authority over nutrition and identity claims.

## Refinement Nara

Operate extension: Nara is the named label-reading assistant. The authored motion is an indeterminate scan-line over a small typographic label mark while extraction or analysis is pending. It stops offscreen/hidden and becomes a static reading mark under reduced motion. No timer-based invented progress. Optional inline conversation opens beneath the photo summary, never a blocking modal; three quick questions and a bounded free question connect to owned saved facts. Keep pending, retry, missing history, source uncertainty and medical limits legible, with the established mulberry/rose/citron identity.

## Koreksi konsistensi dan percakapan

User evidence outranks the previous ship verdict: readable 19 g was invalidated by a parser scavenging a trailing 7 g from corrupt local OCR. Keep final facts consistent across summary/history/Nara, distinguish actual disagreement from missing data, and preserve original evidence plus user corrections. Bound the opened Nara transcript to its own scroll region, keep the composer outside that region, shorten portion answers and move processing/privacy detail into a disclosure. Preserve the existing identity and optional opening.

## Active refinement: vision and understandable purchase context

User rejects OCR authority and vague threshold-driven purchase sentences. Preserve identity and camera-first flow. Vision reads photos; no automatic local OCR fallback. Headline states whole-package quantity only when count is known. Main readout uses the same package/serving basis for sugar and sodium. Show approximate sugar weight and concrete half-package quantity plus comparable product size. Move profile percentages and source/method detail into a disclosure. Distinguish total sugar from added/free sugar and preserve uncertainty. No new visual world or marketing assets.

## Price estimate extension
Operate refinement: a secondary, flat price section before Nara, no new palette/assets/motion. Quantity per known package, explicit AI-estimate vs dated public-observation evidence, native source disclosure, nonblocking loading, retry/error and unavailable states. Brand/variant/package uncertainty stays visible; price does not override nutrition. Scope of internet lookup is public IDR observations, not exhaustive merchant search.

## Active refinement: evidence-based purchase comparisons

Preserve the Operate identity and quick label/purchase context. Keep immediate label facts and portion action independent of recommendation loading. An async concise hint opens the existing Pilihan pengganti tab. Show one named candidate first, comparison on the same quantity, qualified sugar reduction and honest price provenance. Additional choices, nutrient trade-offs, original source/date and shopping lessons use existing native disclosures. Own-photo candidates remain private to their owner. Filtering uses the scan's saved profile; catalogue normalization never invents missing data or package dimensions. Source outages and no-match are useful recoverable states, not fabricated alternatives. Preserve tokens, flat reading surfaces and mobile navigation.

## Multi-view photo scan

One product can use 1–6 photos, up to 5 MB each, from camera and gallery together. Preserve existing camera-first controls and visual system. Counters, shutter limit, selection errors, API limit and saved evidence use the same shared limit. All views go to vision together; per-image decoding is sequential to bound peak memory. The thumbnail strip wraps on narrow screens so photos remain inspectable/removable. Extra views are optional; users can read a single photo immediately.
