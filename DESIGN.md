---
name: BongkarLabel — Indeks Belanja
description: An Indonesian food-label index in mulberry, pale rose and citron.
colors:
  mulberry: "#571838"
  navigation: "#491d36"
  primary-hover: "#75334f"
  rose-canvas: "#f5edf2"
  rose-public: "#f6e8ed"
  rose-soft: "#f2e5ee"
  reading-white: "#fffefd"
  inverse-white: "#fff8fc"
  ink: "#352331"
  muted: "#705c6b"
  line: "#ddced8"
  field-line: "#bca5b4"
  focus: "#8e426a"
  citron: "#eff28f"
  citron-public: "#e9e98f"
  camera-dark: "#381428"
  safe-ink: "#216048"
  safe-surface: "#e9f3ed"
  caution-ink: "#775616"
  caution-surface: "#fbf1d7"
  danger-ink: "#9b2441"
  danger-surface: "#fbe7ed"
  notice-ink: "#625725"
  notice-surface: "#f5f2dc"
typography:
  display:
    fontFamily: "Work Sans, sans-serif"
    fontSize: "clamp(64px, 7.25vw, 96px)"
    fontWeight: 750
    lineHeight: 0.99
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Work Sans, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Work Sans, sans-serif"
    fontSize: "23px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Work Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Work Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.35
  nutrient:
    fontFamily: "Work Sans, sans-serif"
    fontSize: "30px"
    fontWeight: 650
    letterSpacing: "-0.03em"
rounded:
  tab: "8px"
  control: "10px"
  camera: "12px"
  panel: "14px"
  dialog: "16px"
spacing:
  tight: "4px"
  inline: "8px"
  compact: "12px"
  regular: "16px"
  group: "20px"
  panel: "24px"
  workspace: "28px"
components:
  button-primary:
    backgroundColor: "{colors.mulberry}"
    textColor: "#fffafd"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.reading-white}"
    textColor: "{colors.mulberry}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.mulberry}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-danger:
    backgroundColor: "#fff0f3"
    textColor: "#9d213e"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-camera:
    backgroundColor: "{colors.citron}"
    textColor: "{colors.navigation}"
    rounded: "{rounded.control}"
    padding: "11px 24px"
  field:
    backgroundColor: "{colors.reading-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  navigation-active:
    backgroundColor: "{colors.citron}"
    textColor: "{colors.navigation}"
    rounded: "{rounded.tab}"
    padding: "10px 13px"
  suggestion-chip:
    backgroundColor: "{colors.rose-soft}"
    textColor: "{colors.mulberry}"
    rounded: "{rounded.tab}"
    padding: "11px 18px"
  reading-panel:
    backgroundColor: "{colors.reading-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  quick-verdict:
    backgroundColor: "{colors.reading-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
---

# Design System: BongkarLabel — Indeks Belanja

## Overview

**Creative North Star: "Indeks Belanja"**

An approachable index for reading Indonesian food labels: confident mulberry fields, pale rose canvases, clear white reading surfaces and citron cues. Aligned rows and restrained rules connect the public ingredient index with the application’s nutrient comparisons. Rounded controls keep the working interface familiar.

The public introduction uses a larger voice; the application settles into compact, readable text and short groups of information. Work Sans provides continuity across both. Product language remains Indonesian. Blue and navy are excluded by the owner’s confirmed identity direction.

**Key Characteristics:**
- Mulberry orientation with rose and white reading layers.
- Citron for prominent scan actions and selected controls.
- One self-hosted variable font with tightly spaced headings.
- Aligned ingredient and nutrient rows with quiet dividers.
- Flat reading surfaces and restrained state motion.

## Colors

The palette combines berry-dark orientation with pale pink reading space and a yellow-green cue for action and selection. Frontmatter owns canonical values; the source also contains local inverse and hover variants.

### Primary
- **Mulberry:** application primary buttons, selected text, links and the public opening field.
- **Navigation Mulberry:** desktop navigation, public reading headings and camera-action text.
- **Primary Hover:** application primary-button hover feedback.

### Secondary
- **Citron:** camera activation, shutter accents, current scan step and desktop selected navigation.
- **Public Citron:** the slightly softer, larger public scan button; this variant belongs to that surface.

### Neutral
- **Rose Canvas / Rose Public:** application and public page backgrounds respectively.
- **Rose Soft:** secondary controls, OCR confirmation, selected groups and supporting information.
- **Reading White / Inverse White:** reading surfaces and text on dark fields.
- **Ink / Muted:** primary reading and secondary explanation.
- **Line / Field Line:** dividers and form boundaries.
- **Focus:** visible focus on light working surfaces; the public opening uses citron.
- **Camera Dark:** bounded live-camera and camera-idle surfaces.

### Semantic states
Safe, caution and danger retain explicit labels alongside green, amber and rose treatments. The notice pairs a pale yellow surface with dark olive text. Semantic colors do not replace the identity palette.

**The Reading Layers Rule.** Use pale rose for the page, white for bounded reading surfaces and thin rose-gray rules within them.

## Typography

**Display Font:** Work Sans, with sans-serif fallback.
**Body Font:** Work Sans, with sans-serif fallback.

The variable font is self-hosted at `/fonts/work-sans-variable.ttf`, with weights (100–900) and swap loading. Heavier headings establish hierarchy without introducing another family.

### Hierarchy
- **Display:** public headline uses the frontmatter role; at the public phone breakpoint it becomes `clamp(43px, 10vw, 64px)` with line-height (1.02). The intermediate breakpoint sets the headline to (72px). Public introductory copy uses `clamp(21px, 2.1vw, 32px)` and becomes (18px) on phones.
- **Headline:** application task headings use the headline role, reducing to (29px) on narrow phones. Result headings use (28px); authentication headings use (32px), reducing to (28px).
- **Title:** section headings use the title role. Dictionary/history headings use (20–21px). The public reading-section heading uses `clamp(30px, 2.8vw, 42px)`.
- **Body:** working text uses the body role. Supporting copy typically uses (12–14px). Public explanation uses (15–17px) with line-height (1.5–1.6). Longer explanations have observed limits around (67–75ch).
- **Label:** buttons use the label role; field and navigation weights use (550). Ordinary labels retain sentence case.
- **Nutrient:** comparison values use the nutrient role and tabular figures; phone values reduce to (28px).

**The One Family Rule.** Keep Work Sans across headings, controls and reading text; vary scale, weight and spacing within the family.

## Layout

Application content centers within a (1200px) maximum, using `min(1200px, calc(100% - 64px))` on desktop. Desktop navigation is a full-width horizontal band. Camera and practical guidance share a two-column workspace (1.85fr / 1fr, minimum guidance width 230px), separated by (28px). Frontmatter spacing records reused observed steps, not a rigid mathematical scale.

At (1000px), navigation and workspace spacing tighten. At (800px), a compact top header and fixed four-item bottom navigation replace the desktop band; guidance is hidden and the camera becomes one column. Main content reserves bottom space for navigation and safe-area insets. At (520px), side margins become (16px), panels generally use (18px) padding and scanner entry uses (14px). The method row retains three compact controls. Profile fields become two columns, with the final field spanning the row.

The public page uses an (88%) container capped at (1600px), becoming viewport width minus (40px) at (650px). Its ingredient index remains four aligned columns; three usage steps and the detail columns stack on phones. Public composition remains surface-specific rather than a template for every app page.

## Elevation & Depth

Reading panels are flat: white fill, a thin border and tonal separation provide depth. Nested panels and detailed result sections commonly shed enclosing borders and padding. Shadows identify floating task controls and modal interruption.

### Shadow Vocabulary
- **Ready-to-submit control:** `0 5px 18px #491d361a`, a small ambient lift for the floating camera submission action.
- **Dialog:** `0 20px 70px #28111d40`, paired with a translucent mulberry overlay (`#28111dc4`).

**The Flat Reading Rule.** Keep reading panels at rest without shadows; reserve elevation for floating controls and dialogs.

## Shapes

Soft rectangles provide the main silhouette: tabs and suggestions, controls, camera, panels and dialogs use their frontmatter corner roles. Thin straight dividers organize repeated rows. Step counters and the shutter are circular functional exceptions. Ingredient imagery sits inside aligned cells; the final public index is open and divided rather than enclosed as separate cards.

## Components

### Buttons
Familiar, confident controls. Application primary, secondary, ghost and danger variants share control corners, (46px) minimum height and frontmatter padding. Primary buttons are mulberry; secondary buttons use white fill and a muted rose stroke; ghost controls are transparent. Secondary and ghost hover fill is (`#ead9e4`). Disabled buttons use opacity (0.48); enabled pressed buttons scale to (0.98).

Camera activation uses citron on the dark camera field and a darker citron hover (`#dfe46d`). The public scan action is a larger surface-specific variant: (12px) corners, desktop (88px) minimum height and (32px) type, reducing to (60px) and (21px) on phones; hover fill is (`#f2f3aa`). Public secondary action is light outline on mulberry.

### Chips
Dictionary suggestions are rose-soft action buttons with mulberry text and tab corners. Selected scanner methods use citron and expose `aria-pressed`. Status treatments retain visible semantic wording instead of acting as filters.

### Cards / Containers
Reading panels and quick verdicts use white fill, thin line borders, panel corners and panel padding. Empty states use rose-soft fill. Dictionary entries are open ruled sections within one enclosing white list, rather than individual elevated cards.

### Inputs / Fields
White fields use muted rose strokes, control corners, (46px) minimum height and frontmatter padding. Labels sit above fields with a (7px) gap. Placeholders use muted rose (`#786271`). Application focus uses a (3px) focus outline offset by (3px); public controls on the opening field use citron offset by (5px). Errors use dark rose (`#a02041`) and visible text. Password controls share one field enclosure.

### Navigation
Desktop navigation combines a mulberry band, light labels and citron selection. Hover uses lighter mulberry (`#683a53`). Four destinations move to fixed bottom navigation at the application mobile breakpoint. Mobile selection uses rose-soft fill and mulberry text. Active destinations expose `aria-current`.

### Quick verdict and nutrient rows
A short heading, action and reason precede two aligned nutrient readings. Horizontal rules bound the row; a vertical rule separates its values. Figures are tabular, units stay visible and serving context accompanies the comparison. Reuse this hierarchy with actual analysis data.

The provisional photo-result variant reuses this flat verdict panel before optional details and corrections. Its local reading container caps at (980px). The product heading uses `clamp(24px, 3vw, 34px)`; the decision heading uses `clamp(23px, 3vw, 32px)`, line-height (1.2) and tracking (-0.025em). Nutrient readings use `clamp(23px, 4vw, 38px)`. The action paragraph uses (16px), line-height (1.65) and a (68ch) limit. These are local photo-result overrides, not replacements for the established type roles.

Unavailable readings stay in their labelled nutrient position as “Tidak tersedia”, with a short explanation; they do not appear as zero. Origin text distinguishes a photo reading from a user-corrected reading. Serving and package context remain visible. The primary action can request a clearer photo or start a comparison; optional correction uses a quieter ghost action. Actions wrap with a (10px) gap and stack into one column below (520px). Correction fields reuse the existing field pattern and leave blank facts blank.

### Evidence and source disclosures
Supporting facts and original readings use native disclosures separated by thin line-color rules, with (18px) vertical padding and (14px) text at line-height (1.65). Bold summaries (650) name the detail before expansion. Fact rows align labels and readings with space between them, a (20px) gap and (8px) vertical padding; this pattern also accommodates textual missing-value states.

Product-source research is another open ruled section, not an elevated card. It uses (20px) vertical padding, a (20px) heading, (14px) body copy at line-height (1.65), and paragraphs bounded at (68ch). Expanded source rows use (18px) vertical padding and bottom rules; linked source titles use (16px) type at line-height (1.5). Underlined links, source kind, degree of name/brand match, differences and dated checks make provenance readable. Partial validation warnings reuse caution ink.

Pending and failed research appear as plain status text while the photo readout remains available; failure adds a ghost retry action. A manufacturer-brand match remains distinct from a matching product formulation. Source details retain their own attribution and limits instead of silently replacing the photo facts. These are evidence-state patterns for result surfaces, not a prescribed composition for every page.

### Nara request indicator
Nara’s reading mark is a local request-state motif: four short typographic lines on rose-soft fill, with one mulberry scanning line. The bordered mark uses control corners and measures (62 × 72px); the compact conversation variant measures (42 × 52px). Status text remains the primary explanation, with an (18px) heading, (14px) supporting text and line-height (1.6). The standard ruled status row uses (24px) vertical padding and a (22px) gap; compact status removes the rules, uses (16px) vertical padding and a (14px) gap.

The single scanning line loops over (1.9s) with `cubic-bezier(0.45, 0, 0.2, 1)`, travelling (44px), or (30px) in the compact mark. It appears only while an actual photo, analysis or question request is pending. The component pauses animation when it is outside the viewport or the document is hidden. Reduced motion removes the animation and leaves a static line offset by (20px), or (14px) in the compact mark. The accompanying task-specific status uses polite live announcement. This is indeterminate request feedback, without a percentage, timed stage sequence or reasoning transcript.

### Optional inline conversation
Nara extends the result reading surface with a ruled inline section rather than a modal. The invitation uses (24px) vertical padding, a (22px) heading and a secondary disclosure button. It reuses the incumbent Work Sans family, rose layers, line-color dividers and existing button variants. On phones below (520px), the invitation stacks with a (14px) gap; it does not impose a new page-wide layout.

Within the opened conversation, user questions sit in right-aligned rose-soft shapes with local corners (12px 12px 2px 12px), padding (12px 16px), (15px) text and weight (550). Their width is content-driven and capped at (90%), increasing to (95%) for completed questions on phones; long text wraps. Answers remain open reading text bounded at (70ch), with (15px) paragraphs at line-height (1.75), a small named speaker and (12px) contextual attribution. Thin rules separate turns.

Pending questions remain visible with the compact reading indicator. Failed requests preserve the question and show a textual error with a ghost retry action. Existing answers remain available. Quick-question buttons use transparent fill, muted field strokes, tab corners and (44px) minimum height, wrapping on desktop and stacking on phones. The labelled composer uses the established white field, control corners and stroke, with (16px) text, (12px) padding, (70px) minimum textarea height and a (46px) send control. Its character count and scope note sit below in muted (12px) text.

The open/close control exposes its expanded state. A completed answer receives focus without forced scrolling; the lower close action restores focus to the invitation. Pending suggestions and composer controls are disabled. Without a saved result, the invitation is disabled with an explanation. These are reusable contextual-conversation states; they keep the saved label and profile context explicit and leave the main camera-to-decision hierarchy intact.

### Motion and overlays
The public introduction enters over (240ms); a new quick verdict enters over (180ms), using `cubic-bezier(0.16, 1, 0.3, 1)` with only small travel. These animations run only when reduced motion is not requested. Dialogs use the shared white, rounded, elevated treatment and retain visible control focus.

## Do's and Don'ts

### Do:
- Do use Work Sans and the established role hierarchy across public and application surfaces.
- Do preserve the distinction between rose canvas, white reading panels and mulberry orientation.
- Do pair semantic colors with visible status wording.
- Do retain tabular figures and aligned dividers for nutrient comparisons.
- Do preserve visible focus and reduced-motion behavior when extending controls.

### Don't:
- Don’t introduce blue or navy into this identity.
- Don’t carry the discarded charcoal, vermilion and Manrope identity into new surfaces.
- Don’t add a shadow to every reading panel or repeated row.
- Don’t treat illustrative ingredient imagery or specimen data as a measured product result.

<!-- Extraction evidence: src/app/globals.css; src/app/application.css; src/app/landing.css; src/components/navigation.tsx; src/components/scanner/quick-verdict.tsx; src/components/scanner/photo-result.tsx; src/components/scanner/product-research-panel.tsx; src/app/(public)/page.tsx; .impeccable/review/production/report.json. Authorized identity replacement and approved public revision are recorded in the surface contracts. Extension evidence: .impeccable/review/fast-photo/golda-{320,390,768,1440}.png; golda-sources-390.png; missing-sugar-controlled-{320,390,1440}.png; optional-correction-390.png; corrected-source-failure-390.png; history-controlled-390.png; restored-controlled-390.png. Photo-result and source-disclosure additions preserve the incumbent identity. Nara extension evidence: src/components/scanner/nara-thinking.tsx; src/components/scanner/ask-nara.tsx; Nara block in src/app/application.css; PRODUCT.md; scanner surface brief; QA_NARA.md; .impeccable/review/nara/thinking-390.png; reduced-motion-390.png; answer-{320,390,768,1440}.png; error-390.png; long-question-320.png. Controlled extraction/failure capture provenance remains in QA_NARA.md. No new raster assets or visual identity. -->
