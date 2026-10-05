# Identity report — vetted (1 Oct 2026)

Source: `identity.md` (ChatGPT, snapshot 28104a3e / v17.21). Checked against the current tree. HEAD is still
28104a3e and `index.html`, `styles.css`, `theme-glass.css` and `js/` have no uncommitted changes, so ChatGPT's
line numbers still hold; the ones re-read are cited below. Compared line by line with `BEFORE-PUBLISHING.md`.

**HELD until launch** (his standing rule). Nothing here is queue work. When the identity pass starts, he
picks from options drawn for him. The alternatives below are starting points for those drawings, not decisions.

## Result: no new items

All 7 confirmed findings are still AM-like in the current UI, and **every one is already in
BEFORE-PUBLISHING.md**. The 2 "unverified leads" are already in it too, as questions for his eye. So there is
nothing new to log in REQUESTS.md and no new section to add to BEFORE-PUBLISHING.md.

What the report does add is **14 alternative directions** (two for each listed item) and **4 stale facts** in
BEFORE-PUBLISHING.md. Both are below, ready to paste in at launch.

| # | ChatGPT item | Verdict | Evidence (current tree) |
|---|---|---|---|
| 1 | Phone Home: rows with the thumbnail on the left, meta chips, pill tabs, duration badge | ALREADY LISTED (still AM-like) | `styles.css:5084-5085` list rows (the comment there says "AM-style project LIST rows"); `styles.css:5306,5309` 86px thumb and `.hm-dur`; `js/home.js:1365` (comment says "AM-style timecode badge"); `index.html:696-703` tabs; `styles.css:5603` centred `#hm-new` (comment says "centred like AM's +") |
| 2 | Phone editor top bar: back / name / cog / export, plus transport and timeline | ALREADY LISTED (still AM-like) | `index.html:336-340` (comment says "Mobile-only AM-style top bar"), `index.html:394-395` |
| 3 | Add menu: tabs across the top over a tile grid | ALREADY LISTED (still AM-like) | `js/addmenu.js:993-995,1468`; `styles.css:1395,1515`. The right-hand quick-add rail is gone (see stale facts) |
| 4 | Settings: drawer that slides in from the left, rounded groups, divided rows | ALREADY LISTED (still AM-like) | `styles.css:6352-6361,6368-6370`; the row set in `js/settings.js:575-597` still includes the AM rows |
| 5 | Camera Options: icon rail switching between View, Focus Blur and Fog | ALREADY LISTED (still AM-like) | `js/inspector.js:5764-5776`. There is now a 4th tab, Motion Blur (#31b), using the same rail |
| 6 | "Elements" / "Template(s)" as tab names | ALREADY LISTED; partly WEAK | `index.html:697-699`, `js/addmenu.js:238,517`. "Templates" is generic across editors. "Elements" next to "Templates" is the AM pairing |
| 7 | Near-black background with a cyan accent | ALREADY LISTED; WEAK as it stands | `theme-glass.css:24-41`. Now `--accent #5ac7ed` (logo cyan) and `--am-green #5ce0c8` (logo mint). Already drifted toward the logo; only an on-purpose palette (BP item 4) settles it |
| L1 | Effects browser hold sheet and preset sheet | ALREADY LISTED (as "worth Ezra's own eye") | `js/fx-browser.js:315-329,674`. Needs a screenshot comparison, not code |
| L2 | Add-tab glyphs: Elements / Shape / Media / Audio | ALREADY LISTED (last bullet of the icons section) | `js/addmenu.js:238,326,377,464`. Needs a 24px comparison |

No item was ALREADY CHANGED in full. The parts that changed are under the stale facts below.

## Stale facts in BEFORE-PUBLISHING.md (fix wording at launch, not now)

1. **Add menu**: "plus the vertical quick-add rail on the right (Text / Freehand / Vector)". That rail has
   been empty since v4.98, when its tools moved into the Elements tab, and `.addmenu-side:empty` collapses it
   (`styles.css:1522-1526`). Only the tabs-over-grid part is still true. The "What done looks like" item 2
   ("isn't tabs-across-the-top plus a right-hand rail") should now read "isn't tabs-across-the-top over a grid".
   The comment at `styles.css:1529` still says "quick-add rail on the right" and is stale too.
2. **Editor chrome / Home FAB**: "green export button" and "centred green + FAB". The colour is now the
   logo's mint, `--am-green: #5ce0c8` (`theme-glass.css:40`), with a cyan accent. The layout resemblance
   stands; the "green" wording does not. The variable is also still *named* `--am-green`, which item 7
   ("sweep for their marks") should catch.
3. **Camera Options**: "three-screen structure". It is four screens now; Motion Blur was added on the same
   rail (`js/inspector.js:5776`). Redraw all four together.
4. **Terminology**: "Object / Element" is no longer shown to the user (`js/addmenu.js:515` says it was
   renamed). It survives only in code comments (`js/app.js:5351`, `js/shortcuts.js:8`), which fall under
   item 7's comment sweep.

## Alternatives to carry into the identity pass (tidied from ChatGPT)

Paste each one under its existing BEFORE-PUBLISHING.md entry. These are for drawing options from, and he picks.

- **Home screen** (`styles.css:5084-5110,5306-5309`, `js/home.js:1361-1378`, `index.html:696-710`)
  - A. Poster gallery: large previews in each project's own aspect ratio, with title and status over a
    gradient at the bottom. Filters go in a separate compact toolbar, not a row of pills.
  - B. Recent-work feed: wide cinematic preview strips with the name and last-edited date beneath.
    Categories go in a side-scroller or a filter sheet.
- **Phone editor chrome** (`index.html:336-395`, transport `index.html:528`, timeline `index.html:591`)
  - A. Project name and navigation go in a collapsible vertical rail. The top edge of the canvas is kept for
    canvas controls. Export becomes a named command in a project menu.
  - B. Nothing over the canvas: playback and project actions share one bottom dock, and the project title
    is a small floating label on the canvas.
- **Add menu** (`js/addmenu.js:993-995,1468`, `styles.css:1395,1515`)
  - A. One searchable insert palette: collapsible sections in a single scrolling list, with recents and
    favourites at the top. No tab strip.
  - B. Two-stage chooser: first a few big task verbs (Add visual, Add sound, Build rig, Reuse), then a
    picker built for that task.
- **Settings panel** (`styles.css:6352-6370`, `js/settings.js:575-597`)
  - A. Full-page index of sections (Workspace, Playback, Accessibility…), each opening its own page.
  - B. A two-column preference hub on wide screens and full-width labelled sections on phones. No drawer,
    no nested rounded cards.
- **Camera Options** (`js/inspector.js:5764-5874`)
  - A. One camera page with labelled sections and small live diagrams for the lens, focus plane and
    atmosphere.
  - B. A camera dashboard of named cards (Lens, Depth of field, Atmosphere, Motion blur) that expand in
    place instead of swapping the inspector sub-screen.
- **Terminology** (`index.html:697-699`, `js/addmenu.js:238,517`)
  - A. "Scene parts" for reusable assets and "Project starters" for templates.
  - B. "Building blocks" and "Recipes", each with a one-line description.
  - (Renaming "Templates" alone is optional. It is the generic word. The pairing is what reads as AM.)
- **Colour** (`theme-glass.css:24-41`)
  - A. Warm graphite ground, a coral/orange action colour and a muted parchment highlight.
  - B. Light mineral ground, deep indigo controls and a secondary lime accent.
  - (Check either against the logo first. The current cyan/mint was taken from the logo on purpose, and
    the cursor-glow note says to build the identity around his own pieces.)
- **Effects hold / preset sheet**, if his comparison shows a match (`js/fx-browser.js:315-329,674`)
  - A. Presets in a popover anchored to the effect tile.
  - B. A separate preset workspace with larger previews and a fixed "current effect" header.
- **Add-tab glyphs**, if any read as AM at 24px (`js/addmenu.js:238,326,377,464`)
  - A. Redraw all five as one set in a "motion as layered space" language (same grid and stroke as the
    v10.24 Template redraw).
  - B. Use labelled chips for the categories and keep icons for actions only.
