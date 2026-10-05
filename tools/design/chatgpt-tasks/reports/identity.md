# FreeMotion visual identity review — Alight Motion resemblance

Reviewed committed baseline `28104a3e` on branch `chatgpt/identity`. I read `BEFORE-PUBLISHING.md` first, then checked the current Home, phone editor, Add menu, settings panel, Camera Options, theme values, and related menu-building code. I compared candidates with `REQUESTS.md` and `audits/*.json` and omitted overlaps: the effect-name/category-order pass is already tracked by #484; the Template-tab glyph is documented as redrawn; and the parenting-button placement is already covered by #232. The old desktop editor composition was replaced, and the Add menu's former quick-add side rail is gone, so neither is reported as current.

The confirmed resemblance findings below are ranked by how recognizable they are in a screenshot. “Severity” describes the product-identity concern, not a legal conclusion. The source note itself says these interfaces were modelled from Alight Motion screenshots (`BEFORE-PUBLISHING.md`, “What is currently modelled on Alight Motion”).

## Confirmed findings

### 1. Phone Home: thumbnail-left project rows, metadata chips, pill tabs, and duration badge

**Severity:** High · **Confidence:** High

**Where and code:** `styles.css:5084-5086` — `.hm-grid { display: flex; flex-direction: column; ... }` and `.hm-card { ... display: flex; align-items: center; ... }`; `styles.css:5306-5309` — `.hm-thumb { ... width: 86px; height: 86px; ... }` and `.hm-dur { position: absolute; bottom: 5px; left: 5px; ... }`. The card builder places the thumbnail, duration badge, title and metadata in that order: `js/home.js:1361-1378`, including `th.appendChild(el('span', 'hm-dur', fmtDur(p.duration)))` and `const meta = el('div', 'hm-meta')`. The tab strip is `index.html:696-703` (`Projects`, `Templates`, `Elements`, `Tutorials`); `styles.css:5064` gives each tab a rounded rectangle and `styles.css:5082` fills the active tab with the accent.

**Why it reads as Alight Motion:** This is the most distinctive retained composition: a vertical project list with a square preview at left, stacked name/details, duration over the preview, and a row of rounded category pills above it. The old centered new-project control remains at `index.html:710`. The internal publishing note explicitly records this exact Home arrangement as AM-modelled.

**How to see it:** Open the app on a phone (700px wide or less) and view Home with at least one project that has a thumbnail and duration.

**Two original directions:** (1) Make Home a poster gallery: larger variable-aspect previews, title and status over a bottom gradient, with filters in a separate compact toolbar. (2) Use a “recent work” feed: wide cinematic preview strips with the project name and last-edited date beneath; put project categories in a side-scroll or filter sheet rather than matching the card width.

### 2. Phone editor chrome: back, project name, settings, and export across the top

**Severity:** High · **Confidence:** High

**Where and code:** `index.html:337-340` begins `<header id="topbar-m">` with the back control and project-name field. `index.html:394-395` places the settings cog and export button in that same header. The editor also keeps a centered transport area and timeline: `index.html:528` begins `<div id="transport">`; `index.html:591` begins `<div id="timeline">`. These are visible together in the normal phone editor.

**Why it reads as Alight Motion:** The narrow-screen composition retains the recognizable editor stack: project/navigation controls in a top bar, playback controls, then a layered timeline. `BEFORE-PUBLISHING.md` records the top-bar composition, transport row, and clip look as AM-derived. The report is limited to phones: the committed note says the desktop Studio layout was redesigned, and I did not find evidence to call that desktop arrangement a remaining match. The current export accent is cyan/mint rather than the old “green export button” description, so the color is not part of this finding.

**How to see it:** Open a project on a phone and look at the full editor before selecting a layer.

**Two original directions:** (1) Put project identity and navigation in a collapsible vertical rail, reserve the canvas top edge for canvas-specific controls, and make export a named command in a project menu. (2) Keep the canvas unobstructed and place playback plus project actions in one bottom dock, with the project title shown as a small floating canvas label.

### 3. Add menu: category tabs directly above a tile grid

**Severity:** High · **Confidence:** High

**Where and code:** `js/addmenu.js:993-995` creates the main area, `.addmenu-tabs`, and `.addmenu-body`; `js/addmenu.js:1468` appends the tabs before the pinned row and body. `styles.css:1395` makes the tabs a horizontal flex row; `styles.css:1515` makes the choices a grid. Tabs include `Elements`, `Shape`, `Media`, `Audio`, and `Template` (`js/addmenu.js:238`, `326`, `377`, `464`, `517`).

**Why it reads as Alight Motion:** The combination of a top category strip that switches the content below it and a grid of addable items preserves the old Add-menu interaction pattern. The former vertical quick-add rail is not present in the current design; the primary actions have moved into Elements, so that older detail is intentionally not alleged here. The publishing note identifies the tab-row-plus-subgrid structure as AM-modelled.

**How to see it:** Open a project, deselect all layers if needed to show the Add menu, then switch between Shape, Media, and Audio.

**Two original directions:** (1) Replace the tab strip with a searchable “insert palette” grouped into collapsible sections in one continuous list, with recent/favourite actions at the top. (2) Use a two-stage chooser: first a set of large task verbs (Add visual, Add sound, Build rig, Reuse), then a distinct picker tailored to that task, instead of repeating one tab-and-grid pattern.

### 4. Settings: left slide-in drawer with rounded groups of divided rows

**Severity:** Medium · **Confidence:** High

**Where and code:** `styles.css:6352-6361` defines the scrim and left-to-right slide-in (`transform: translateX(-100%)` to `translateX(0)`). `styles.css:6368-6370` defines rounded groups and divided setting rows: `.set-group { ... border-radius: 14px; ... }` and `.set-row + .set-row { border-top: 1px solid var(--line); }`. The current row set includes `Project sorting`, `Demo mode`, `Show touches`, `Show system fonts`, and `Default layer duration` (`js/settings.js:578-595`).

**Why it reads as Alight Motion:** It combines a left-side settings drawer with grouped rounded cards and a familiar sequence of app-wide preference rows. The publishing note says both the drawer treatment and this row set came from an AM settings screenshot.

**How to see it:** On Home, open the settings cog and scroll through the preferences.

**Two original directions:** (1) Make Settings a full-page index with distinct sections such as Workspace, Playback, and Accessibility, each opening a focused detail page. (2) Use a compact two-column preference hub on larger screens and full-width labelled sections on phones, with no drawer or nested rounded cards.

### 5. Camera Options: icon rail switching among Camera View, Focus Blur, and Fog

**Severity:** Medium · **Confidence:** High

**Where and code:** `js/inspector.js:5764-5770` names the Camera Options sub-screens and defines the icon rail; the labels include `Camera View`, `Focus Blur`, and `Fog`. `js/inspector.js:5824-5830` builds the Field of view and Distance controls; `js/inspector.js:5849-5867` builds Focus Blur controls; `js/inspector.js:5871-5874` builds Fog controls. The current code has a fourth Motion Blur tab as well.

**Why it reads as Alight Motion:** The nested icon-rail navigation and the grouping of camera view, focus, and fog controls reproduce the specific three-screen structure recorded in the publishing note. The optical model may be FreeMotion’s own; the resemblance is in the presentation and labels.

**How to see it:** Add/select a Camera layer, open Camera Options in the inspector, and tap through its icon rail.

**Two original directions:** (1) Present a single camera-control page with labelled sections and small live diagrams for lens, focus plane, and atmosphere. (2) Use three named cards—Lens, Depth of Field, Atmosphere—in a camera dashboard, with each card expanding inline rather than replacing the inspector sub-screen.

### 6. Terms: “Elements” and “Template(s)” as library categories

**Severity:** Low · **Confidence:** High

**Where and code:** Home exposes `Templates` and `Elements` at `index.html:697-699`; the Add menu uses `Elements` and `Template` at `js/addmenu.js:238` and `js/addmenu.js:517`. The obsolete `Object / Element` wording has already been replaced, so this finding concerns only the labels still visible.

**Why it reads as Alight Motion:** The publishing note identifies Elements / Object-Element / Templates as borrowed category language. These labels are individually understandable and partly generic; the resemblance is strongest when they appear as a matching library taxonomy alongside the Add and Home layouts above.

**How to see it:** Compare the Home tabs with the Add-menu tabs.

**Two original directions:** (1) Call the reusable assets “Scene parts” and the project-based starting points “Project starters.” (2) Use “Building blocks” and “Recipes,” with short descriptions clarifying what each library contains.

### 7. Near-black ground with bright aqua/cyan accent

**Severity:** Low · **Confidence:** Medium

**Where and code:** The shipped glass theme uses `--bg: #060c0f` and `--accent: #5ac7ed` in `theme-glass.css:24-38`; its panels are dark blue-green at `theme-glass.css:29-34`. `theme-glass.css:40` also defines the mint `--am-green` used for add/export treatments.

**Why it reads as Alight Motion:** The publishing note flags a teal-on-near-black palette as close to AM and calls for a deliberate own palette. The current shipped values have shifted toward cyan and logo-mint, so this is a broad impression, not a claim of exact color copying. A screenshot pairing against the specific AM release that inspired the original palette would be needed to confirm how close it still looks.

**How to see it:** View the default dark Home and editor, especially active tabs, Add, and Export controls.

**Two original directions:** (1) Move to warm graphite with a coral/orange action color and a muted parchment highlight. (2) Use a light mineral background with deep indigo controls and a secondary lime accent, carrying the same palette through menus and motion.

## Unverified review leads (not confirmed findings)

### Effects-browser hold sheet and preset sheet

**Status:** UNVERIFIED · **Severity:** Low · **Confidence:** UNVERIFIED

`js/fx-browser.js:315-329` opens a preset sheet after a 420 ms press; `js/fx-browser.js:674` describes a full-cover sheet using the category-view chrome. `BEFORE-PUBLISHING.md` specifically says it could not tell whether either sheet was modelled on an AM screenshot. This source review cannot establish a visual match without comparing screenshots, so I am not counting these as confirmed copied UI.

**How to check:** Open the Effects browser, hold an effect to open its preset sheet, then compare both screens side by side with the AM screenshots used during development.

**Two original directions if the comparison shows a match:** (1) Put preset choices in a contextual popover anchored to the effect tile. (2) Use a distinct preset workspace with larger previews and a persistent “current effect” header rather than reusing the category browser chrome.

### Remaining Add-menu tab glyphs

**Status:** UNVERIFIED · **Severity:** Low · **Confidence:** UNVERIFIED

The source note confirms the Template glyph was redrawn and says the same likeness question applies to Elements, Shape, Media, and Audio. The current glyph implementations live in `js/addmenu.js:238-239`, `js/addmenu.js:326`, `js/addmenu.js:377`, and `js/addmenu.js:464`; the code establishes what ships but not whether any of these are recognizable copies. The Template glyph is excluded because its redraw is already recorded as complete.

**How to check:** Compare those four glyphs at their actual 22–24 px display size with the original AM reference screenshots. Until that visual comparison is made, this is UNVERIFIED.

**Two original directions if any glyph reads as a match:** (1) Draw a coherent set of FreeMotion-specific symbols from the app’s own “motion as layered space” visual language. (2) Replace the five category glyphs with distinct colored wordmarks or labelled chips, reserving icons for actions rather than library categories.

## Ranked order

1. Phone Home row cards and pill tabs
2. Phone editor top bar + transport + timeline composition
3. Add-menu top tabs + tile grid
4. Camera Options' nested icon rail and control groups
5. Settings drawer and grouped rows
6. Elements / Template(s) vocabulary
7. Dark ground and aqua/cyan accent impression
8. Effects-browser and preset-sheet chrome (**UNVERIFIED**)
9. Remaining Add-menu tab glyphs (**UNVERIFIED**)

The current source confirms the Home and mobile/editor similarities remain; the clearest original redesign priority is the phone Home, followed by the editor and Add-menu compositions. The effect names, parenting-button placement, and already-redrawn Template glyph are intentionally omitted as tracked/completed work.
