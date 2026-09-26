# #960 — Import media and Import audio match (plan for the builder)

Planned 26 Sep 2026. Measured while HEAD moved from `a741b71c` (v17.03) to `acae12a5` (v17.05); `js/addmenu.js` did not
change across that range, and **every line number below was re-checked against `acae12a5`** (clean tree) at the end.
Nothing in the repo was edited.

## 1. His words and his clauses (verbatim, from REQUESTS.md #960)

> "The import media button and the import audio button both have some discrepancies. Like they both look
> different. I think you should make them both have like the shiny look that the import media button has. But
> also rename the import media button to import media because right now it's just called import just so then
> it feels a bit more thought out and less slack"

1. [ ] The Import media and Import audio buttons stop looking different from each other.
2. [ ] Both get the shiny look the Import media button has.
3. [ ] The Import media button, now just "Import", is renamed "Import media".

**Background that settles the approach:** #270 (v8.60) whitened ONLY the Media icon, and its DONE note says so on
purpose: *"Import audio on the Audio tab is the same grey button with the same grey arrow … Say if you want the
audio one to match and it is a one-line change."* (REQUESTS.md:2796–2799). This request is him saying it.

## 2. What exists now (HEAD `acae12a5`, v17.05 — lines quoted)

**The Media tile** — `js/addmenu.js:394–398`:
```js
        { label: 'Import', icon: icoMulti(
          '<defs><linearGradient id="fm-ic-imp" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">'
          + '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity=".55"/></linearGradient></defs>'
          + '<path d="M12 16V4M7 9l5-5 5 5" stroke="url(#fm-ic-imp)"/>'
          + '<path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="url(#fm-ic-imp)"/>'), add: fileImport },
```
(the #270 comment above it, `:384–393`, explains the gradient: `ico()` strokes with `currentColor`, and
`.addmenu-card > .addmenu-ic { color: rgb(var(--am-tint…)) }` at `styles.css:1310` paints that grey.)

**The Audio tile** — `js/addmenu.js:452`:
```js
        { label: 'Import audio', icon: ico('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'), add: audioImport },
```
Same two paths, but `ico()` (`js/addmenu.js:10–12`) puts `stroke="currentColor"` on the `<svg>`, so it paints in the
grey tint.

**The helpers** — `js/addmenu.js:10–21`: `ico(inner)` = svg with `stroke="currentColor"`; `icoMulti(inner)` = the same
svg WITHOUT a stroke, so each child carries its own.

**The tint map** — `js/addmenu.js:898–903`:
```js
  var BY_LABEL = {
    // "a basic grey" / "basic grey" — the neutral, everyday action. Deliberately colourless so the
    // buttons that create something stand out against it.
    'Import': '150, 160, 176',
    'Import audio': '150, 160, 176',
    'Import media': '150, 160, 176',
```
`'Import media'` is already a key (no tile uses it yet); after the rename `'Import'` becomes a dead key. Precedent for
removing a dead key on a rename: the test at `tests/tests.js:64905` (*"the palette still carries an "Empty group" key — a
dead entry that will outlive everyone who remembers why"*).

**The PC fit that the pinned strip inherits** — `styles.css:5613–5659` (`@media (min-width: 701px)`; the rules quoted are `:5634–5636` and `:5655–5658`):
```css
  .addmenu--fit .addmenu-card { padding: var(--am-pad); gap: var(--am-icogap); height: 100%; box-sizing: border-box; }
  .addmenu--fit .addmenu-card .addmenu-ic,
  .addmenu--fit .addmenu-card .addmenu-ic svg { width: var(--am-ico); height: var(--am-ico); }
  …
  .addmenu--fit .addmenu-card .addmenu-lbl {
    font-size: var(--am-fs); line-height: 1.2; white-space: normal; max-width: none;
    max-height: var(--am-lblh); overflow: visible; text-overflow: clip;
  }
}
```
These are NOT scoped to `.addmenu-page`, so the pinned strip (`.addmenu-pinned`, `js/addmenu.js:1329–1335`, drawn BEFORE the
plan is measured) wears the vars `applyPlan()` (`js/addmenu.js:1163–1195`) computed for the LIBRARY grid under it. And
`fitBox()` (`js/addmenu.js:1154–1162`) measures the grid's room from where `.addmenu-body` starts, i.e. below that strip.

**Other places that say "Import":**
- `index.html:282` — `#btn-import` … `</svg>Import</button>`, inside `#topbar-extra` which is `style="display:none"`
  (`index.html:280`). Never visible; only `js/app.js:6851` binds it. **No ❓ASK needed** — renaming it changes nothing he
  can see. Rename it anyway for one name everywhere (decided, see §5).
- `index.html:423` — PC empty canvas: `Drag a video or image here<br>or click <b>Import media</b>` — already the new name.
- `js/timeline.js:3475` (`'No layers yet — Import media, …'`) and `:4738` (`'Import media…'`) — already the new name.
- Nothing in `js/` finds the tile by its label except `BY_LABEL` (grep `"'Import'"` over `js/*.js`: only `addmenu.js:394`
  and `:901`).
- Cache-busters at `acae12a5`: `index.html:1067` `js/addmenu.js?v=80`; `index.html:42` `styles.css?v=727` (it moved
  725 → 727 while this was planned — bump from whatever is there when you build).

## 3. Findings and measurements

All numbers were taken with `tools/shot.py` (its own headless Chrome per call) against the dev server on :8777, i.e. the
working tree of the moment (v17.03 → v17.05 while this ran; `js/addmenu.js` identical throughout). Every "after" was produced by
patching at runtime — `FM.addMenu._tabs()` returns the live TABS array, so the probes wrapped the Media/Audio
`options()` functions to rename the tile and swap the icon, and injected the CSS as a `<style>`. No app file was
edited. The library was seeded through `localStorage['fm.medialib']` (two visual items + one song) so the Media and
Audio tabs draw their pinned strip, which is what he sees once he has imported anything. Probe files are in this folder
(`probe_measure.js`, `probe_patch.js`, `probe_replica.js`, `probe_final.js`, `probe_shots*.js`).

### 3.1 What the "shiny look" is, and every difference between the two tiles (HEAD)

Computed styles of the two tiles side by side (`probe_measure.js`, PC 1280x900, glass theme, both in the pinned strip):

| property | Import (Media) | Import audio (Audio) |
|---|---|---|
| `--am-tint` / classes | `150, 160, 176` / `addmenu-card` | same |
| background | `linear-gradient(158deg, rgba(150,160,176,.26) 0%, rgba(150,160,176,.086) 55%, rgba(255,255,255,.024) 100%)` | same |
| border / radius / box-shadow | `1px solid rgba(150,160,176,.28)` / `7px` / `rgba(188,230,239,.08) 0 1px 0 inset` | same |
| icon filter | `drop-shadow(rgba(0,0,0,.85) 0 0 1px) drop-shadow(rgba(0,0,0,.6) 0 1px 0)` | same |
| label colour / weight | `rgb(147,174,185)` / 400 | same |
| **icon strokes** | **`url(#fm-ic-imp)` — white @1 → white @.55** | **`currentColor` = `rgb(150,160,176)` grey** |
| label | "Import" | "Import audio" |
| **tile size (PC only)** | **64x43, padding 2px, 19px arrow, 10.8px label** | **87x60, padding 7px 4px, 27px arrow, 10px label** |

So the "shiny look" is exactly the #270 white-gradient arrow; the plates are already identical. **On PC there is a
second difference nobody had logged:** the pinned strip wears the fit variables (`--am-pad/--am-ico/--am-fs`) that
`applyPlan()` computed for the LIBRARY grid under it, and each tab plans its own library — Media (2 clips) planned
`278x56 2c1r`, Audio (1 song) `278x72 1c1r`. So the Audio button is 17px taller with an arrow 8px bigger. Stable
over three visits 4 s apart (`probe_fit.js`: 64x42/19px vs 87x60/27px every time). Widths differ by design (4 tiles
vs 3 in the strip) on both phone and PC.

Phone (380x820, `probe_patch.js` mode `none`): both tiles 64px tall, 22px arrow, 10.5px label; widths 83 vs 113
(4 vs 3 tiles). Only the icon paint and the label differ.

### 3.2 The rename alone breaks the PC fit (measured, reproducible)

`probe_patch.js`, fresh page per mode, PC 1280x900, sequence Media → Audio → Media → Audio → Media:

| mode | Media tab | Audio tab |
|---|---|---|
| `none` (HEAD) | fit `278x56 2c1r`, tile 64x43, 19px arrow | fit `278x72 1c1r`, tile 87x60, 27px arrow |
| `icon` (gradient only) | identical to HEAD | identical to HEAD |
| `rename` (label only) | **fit none**, tile 64x64, 22px, library in the 5-col fallback | **fit none** |
| `rename` + `nowrap` on pinned labels | identical to HEAD; "Import media" 63.0px of text in a 64px tile — **0.3px spare** | identical to HEAD |

Mechanism: under `.addmenu--fit` a pinned label may wrap (`white-space: normal`), and "Import media" (≈63px at the
fitted 10.8px) is wider than the 58px content box, so it goes to two lines, the strip grows, and the grid loses the
box it was planned in. Picture: `960_builder_rename_breaks_fit.png` (left HEAD, right rename only).

**`nowrap` alone is not enough** — at 1024x640 (`raw_1024_bothFix.png`) the first visit planned a 12px label and
"Import media" spilled **4.1px outside the tile on each side**, and the strip then changed size on later visits
(fs 12 → 11 → 10.5px). Picture for the builder: `960_builder_pc_sizes.png` (middle column).

### 3.3 A fixed-size PC strip (what Option A ships) — measured stable

The pinned strip gets its own size under `.addmenu--fit`, the same on both tabs, growing with the panel width through
container units (`c3.css`). Measured with `probe_patch.js` mode `bothC3`, five visits each:

| window | panel strip | both tiles | arrow | label | "Import media" room each side | fit plan (Media / Audio) |
|---|---|---|---|---|---|---|
| 1024x640 | 271px | 50px tall | 22px | 10px | 1.7px inside the tile | `271x67 2c1r` / `271x67 1c1r` |
| 1280x900 | 278px | 50px tall | 22px | 10px | 2.6px | `278x65 2c1r` / `278x65 1c1r` |
| 1920x1080 | 371px | 58px tall | 28px | 11.87px | 8.7px | `371x143 2c1r` / `371x143 1c1r` |

Every visit returned the same numbers (with `nowrap` alone the 1024 strip moved between visits: 44 → 43px tall, label 12 → 11 → 10.5px). HEAD at 1024 is 62x59 (Media) vs 85x58 (Audio) with 19px arrows — close there; the big gap is at 1280. At 1920 HEAD
drew both strips at 81px with 46px arrows; Option A draws 58px / 28px there — see `960_pc1920_optA.png`.

### 3.4 Phone label room after the rename (`probe_patch.js` mode `both`)

| width | Media strip tile | "Import media" text | room each side | clipped? |
|---|---|---|---|---|
| 440x956 (his) | 98x64 | 61.3px | 18.1px | no |
| 380x820 | 83x64 | 61.3px | 10.6px | no |
| 320x700 | 68x64 | 61.3px | 4.0 / 2.2px | **yes — ellipsis ("Import me…")** |

320 is below his phone and the 380 target; see Risks §8 for the one-line guard.

### 3.5 Byte-identity of the shared helper

`importIcon('fm-ic-imp')` serialised by the browser is identical to HEAD's Media icon (`helperSameAsHeadMedia: true`
in every `probe_shots` run), so the Media tile does not change by a single byte.

### 3.6 `#btn-import` needs no question

It lives in `#topbar-extra`, which is `display:none` (`index.html:280`), and nothing un-hides it (grep of
`topbar-extra` over `js/` and the CSS: only a comment in `js/app.js:7665`). Renaming its text is invisible — done for
one name everywhere; not asked.

## 4. Options (send him the pictures — #545)

Both options contain all three of his clauses. The PC strip size is part of both, because the rename cannot ship on PC
without it (§3.2) and it is the half of "they both look different" that only shows on PC (§3.1).

- **Option A — Recommended.** Import audio gets the same white-gradient arrow as Import media; "Import" becomes
  "Import media"; on PC the two import rows are the same size on both tabs (22px arrow at 1024–1280, growing to 28px
  at 1920). Why recommended: it is exactly the look he pointed at ("the shiny look that the import media button has"),
  applied to both, and nothing else changes — #270 twice said "keep it all looking the same", and the grey plates are
  the #210 system.
- **Option B.** A, plus a lit top edge on the two import plates (a 1px white inner highlight and a soft white sheen
  over the top half), for "shiny" read more literally. Costs: the two grey buttons stop matching the grey family
  (#210) and start competing with the coloured ones beside them.

Images (all ≤1200px wide, ≤3x tall; each labelled BEFORE/AFTER and with the option in its title):

| file | what |
|---|---|
| `960_phone440_optA.png` | his phone, 440x956: Media and Audio tabs, before / after A |
| `960_phone380_optA.png` | 380x820: before / after A |
| `960_phone380_optB.png` | 380x820: before / after B |
| `960_pc1280_optA.png` | PC 1280x900 (inspector bottom-left, 307x270), before / after A |
| `960_pc1280_optB.png` | PC 1280x900, before / after B |
| `960_pc1920_optA.png` | PC 1920x1080, before / after A — shows the strip getting smaller on a big window |
| `960_icons_zoom.png` | the two tiles side by side at ship size (2x device pixels) and big (≈3.8x), before / after A |
| `960_builder_pc_sizes.png` | FOR THE BUILDER, not him: why `nowrap` alone is not the PC fix |
| `960_builder_rename_breaks_fit.png` | FOR THE BUILDER: PC 1280, HEAD vs the rename alone (fit lost) |

(All in `/Users/ezrasmith/Claude/FreeMotion/tools/design/plans/2026-09-26-import/`.)

## 5. The exact change

Files: `js/addmenu.js`, `styles.css`, `index.html`, `tests/tests.js`. Option B adds a few lines to the first two.
Order: 5.1 → 5.2 → 5.3 → 5.4 (→ 5.5 only for B), then §6.

### 5.1 `js/addmenu.js` — one drawing for both import tiles (all options)

**Insert** directly after `icoMulti` (anchor: the three lines at `js/addmenu.js:19–21`):
```js
  function icoMulti(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
```
add, immediately below that closing `}`:
```js
  /* ONE DRAWING FOR BOTH IMPORT TILES (queue 960). Ezra: "The import media button and the import audio button both have
     some discrepancies. Like they both look different. I think you should make them both have like the shiny look that
     the import media button has."
     Measured before the change (1280x900 and 380x820, computed styles): the two tiles already shared everything else —
     one grey --am-tint (150, 160, 176), one class list, the same background, border, radius and inset shadow. The one
     difference in the tile was the arrow: Media's (#270) strokes with a white-to-55%-white gradient, Audio's with
     currentColor, i.e. the grey. #270 left Audio grey on purpose and said "say if you want the audio one to match".
     So the drawing lives here and both tiles call it — they cannot drift apart again. Each passes its OWN id: a
     duplicate gradient id silently steals the paint from whichever element asks for it second.
     importIcon('fm-ic-imp') is byte-identical to the markup the Media tile shipped with (checked in the browser by
     serialising both), so the Media tile does not change at all. */
  function importIcon(gid) {
    return icoMulti('<defs><linearGradient id="' + gid + '" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity=".55"/></linearGradient></defs>'
      + '<path d="M12 16V4M7 9l5-5 5 5" stroke="url(#' + gid + ')"/>'
      + '<path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="url(#' + gid + ')"/>');
  }
```

**Replace** the Media tile (`js/addmenu.js:394–398`, exactly these five lines):
```js
        { label: 'Import', icon: icoMulti(
          '<defs><linearGradient id="fm-ic-imp" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">'
          + '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity=".55"/></linearGradient></defs>'
          + '<path d="M12 16V4M7 9l5-5 5 5" stroke="url(#fm-ic-imp)"/>'
          + '<path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="url(#fm-ic-imp)"/>'), add: fileImport },
```
with:
```js
        /* "IMPORT MEDIA", NOT "IMPORT" (queue 960). His words: "rename the import media button to import media because
           right now it's just called import just so then it feels a bit more thought out and less slack". The PC empty
           canvas already said "click Import media" (index.html) about a button called "Import"; now they agree.
           BY_LABEL below is keyed by this exact text. The icon is importIcon() above — shared with Import audio. */
        { label: 'Import media', icon: importIcon('fm-ic-imp'), add: fileImport },
```
(Leave the #270 comment block above it as it is — it is history, and it is still true of the icon.)

**Replace** the Audio tile (`js/addmenu.js:452`, one line):
```js
        { label: 'Import audio', icon: ico('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'), add: audioImport },
```
with:
```js
        // The same white-gradient arrow as Import media, under its own id (queue 960 — "make them both have like the shiny look")
        { label: 'Import audio', icon: importIcon('fm-ic-impau'), add: audioImport },
```

**Replace** in `BY_LABEL` (`js/addmenu.js:899–903`):
```js
    // "a basic grey" / "basic grey" — the neutral, everyday action. Deliberately colourless so the
    // buttons that create something stand out against it.
    'Import': '150, 160, 176',
    'Import audio': '150, 160, 176',
    'Import media': '150, 160, 176',
```
with:
```js
    // "a basic grey" / "basic grey" — the neutral, everyday action. Deliberately colourless so the
    // buttons that create something stand out against it. ('Import' left with its tile — queue 960 renamed it
    // "Import media", which already had a key; a dead key outlives everyone who remembers why.)
    'Import audio': '150, 160, 176',
    'Import media': '150, 160, 176',
```


### 5.2 `styles.css` — the PC strip gets its own size (all options)

Anchor: the `.addmenu--fit` block inside `@media (min-width: 701px)` — `styles.css:5655–5659` at `acae12a5`. It ends:
```css
  .addmenu--fit .addmenu-card .addmenu-lbl {
    font-size: var(--am-fs); line-height: 1.2; white-space: normal; max-width: none;
    max-height: var(--am-lblh); overflow: visible; text-overflow: clip;
  }
}
```
Insert **between that rule's `}` and the media block's closing `}`**:
```css
  /* THE PINNED STRIP HAS ITS OWN SIZE, THE SAME ON BOTH TABS (queue 960). Two faults, one cause — the rules above are
     not scoped to .addmenu-page, so Media's and Audio's pinned buttons wore the fit variables planned for the LIBRARY
     grid under them, and each tab plans its own library:
       · "they both look different" was true in SIZE on PC, not only in colour — measured at 1280x900, Import was
         64x43 with a 19px arrow and Import audio 87x60 with a 27px arrow (Media planned 2c1r, Audio 1c1r);
       · renaming "Import" to "Import media" made the label ~63px in a 58px tile at the fitted 10.8px; it wrapped,
         the strip grew, and the Media tab dropped out of the fit altogether (tiles 43→64px, library in the fallback).
         `nowrap` alone was measured too: at 1024x640 it spilled the label 4.1px outside the tile.
     So the strip is sized from the PANEL'S WIDTH (container units), never from a tab's library: 22px arrow and a 10px
     label at 1024–1280 (50px tiles), 28px and 11.9px at 1920 (58px), one line always. Measured stable over five
     visits at all three sizes, with "Import media" 1.7–8.7px inside its tile. The paged grid below is untouched,
     and the phone never reaches this (.addmenu--fit is PC-only, and so is this media block). */
  .addmenu--fit .addmenu-pinned { container-type: inline-size; }
  .addmenu--fit .addmenu-pinned .addmenu-card { padding: 5px 3px; gap: 4px; height: auto; }
  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-ic,
  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-ic svg { width: clamp(22px, 7.5cqi, 34px); height: clamp(22px, 7.5cqi, 34px); }
  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-lbl { font-size: clamp(10px, 3.2cqi, 12px); line-height: 1.2; white-space: nowrap; max-height: none; }
```
Specificity check (why placement inside styles.css behaves like the injected probe): these are (0,3,0)/(0,4,1) against
the (0,2,0)/(0,3,1) fit rules above; the only ID rules on these cards (`#inspector-panel .addmenu-card`,
`styles.css:8596`) set `background` only, and the measured padding/size/font came out as written.

### 5.3 `index.html`

- `#btn-import` (`index.html:282`): replace the button's text node `</svg>Import</button>` with
  `</svg>Import media</button>` (the whole line otherwise unchanged). Hidden; one name everywhere.
- **Cache-busters (ship.sh refuses without them):** `js/addmenu.js?v=80` → `?v=81` (`index.html:1067`) and
  `styles.css?v=727` → `?v=728` (`index.html:42`) — or +1 from whatever the tree holds when you build (styles.css moved
  twice while this was being planned).

### 5.4 `styles.css` — keep "Import media" whole on 320px phones (all options)

The one-line phone guard written out in §8 ("320px phones"), with its measurements. Paste it where §8 says.

### 5.5 Option B only (skip for A)

`js/addmenu.js` — add `shine: true` to BOTH import items from 5.1:
```js
        { label: 'Import media', icon: importIcon('fm-ic-imp'), add: fileImport, shine: true },
        { label: 'Import audio', icon: importIcon('fm-ic-impau'), add: audioImport, shine: true },
```
and in `card()` (`js/addmenu.js:1062`, right after `if (tint) b.style.setProperty('--am-tint', tint);`):
```js
    if (item.shine) b.classList.add('addmenu-card--shine');   // queue 960 option B: the lit top edge on the import pair
```
`styles.css` — append after the `#inspector-panel .addmenu-card.has-thumb` rule's media block (`styles.css:8611–8612`):
```css
/* Option B of queue 960 — a lit top edge on the two import buttons. Specificity is deliberate: (0,3,1) beats the glass
   theme's `html[data-theme="glass"] .addmenu-card` (0,2,1, theme-glass.css:115/186); the PC rule needs the id to beat
   #inspector-panel's ramp. The :hover pair exists because theme-glass.css's `.addmenu-card:hover` (0,3,1, loaded AFTER
   styles.css) would otherwise wipe the shine on hover, and on PC the shine rule would otherwise freeze the hover ramp. */
html[data-theme] .addmenu-card.addmenu-card--shine {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .34), inset 0 0 0 1px rgba(255, 255, 255, .06);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, .16) 0%, rgba(255, 255, 255, 0) 46%),
                    linear-gradient(158deg, rgba(150, 160, 176, .30) 0%, rgba(150, 160, 176, .10) 55%, rgba(255, 255, 255, .03) 100%);
}
html[data-theme] .addmenu-card.addmenu-card--shine:hover {
  background-image: linear-gradient(180deg, rgba(255, 255, 255, .20) 0%, rgba(255, 255, 255, 0) 46%),
                    linear-gradient(158deg, rgba(150, 160, 176, .42) 0%, rgba(150, 160, 176, .17) 55%, rgba(255, 255, 255, .05) 100%);
}
@media (min-width: 701px) {
  #inspector-panel .addmenu-card.addmenu-card--shine {
    background-image: linear-gradient(180deg, rgba(255, 255, 255, .16) 0%, rgba(255, 255, 255, 0) 46%),
                      linear-gradient(158deg, rgba(150, 160, 176, .30) 0%, rgba(150, 160, 176, .10) 55%, rgba(255, 255, 255, .03) 100%);
  }
  #inspector-panel .addmenu-card.addmenu-card--shine:hover {
    background-image: linear-gradient(180deg, rgba(255, 255, 255, .20) 0%, rgba(255, 255, 255, 0) 46%),
                      linear-gradient(158deg, rgba(150, 160, 176, .42) 0%, rgba(150, 160, 176, .17) 55%, rgba(255, 255, 255, .05) 100%);
  }
}
```
(The two `:hover` rules were added in review and are **unmeasured** — their values are the base shine lifted the
same way #inspector-panel's own hover ramp lifts its base, .26→.40 / .085→.16.)
⚠️ B's images were rendered with these values injected as `!important` on a label-matched class; the class plumbing
above is new. If he picks B, re-shoot 380 and 1280 after building and compare with `960_*_optB.png`.

## 6. The proving tests

### 6.1 Two new tests

Paste both **immediately before** this anchor in `tests/tests.js` (it opens the test after the queue-270 one, so the
two import tests sit together):
```js
  /* ---------------- queue 271: the Elements colours were random and too alike ----------------
```
(`tests/tests.js:44940` at `acae12a5`.)

```js
  /* ---------------- queue 960: Import media and Import audio match ----------------
   * His words: "The import media button and the import audio button both have some discrepancies. Like they both look
   * different. I think you should make them both have like the shiny look that the import media button has. But also
   * rename the import media button to import media because right now it's just called import just so then it feels a
   * bit more thought out and less slack"
   * MEASURED FIRST (v17.03, 1280x900 and 380x820, computed styles of both tiles): the plates were already the same —
   * one --am-tint (150, 160, 176), one class list, the same background, border, radius and inset shadow. The only
   * difference in the tile itself was the ICON PAINT: Media's arrow strokes url(#fm-ic-imp), a white → 55%-white
   * gradient (#270); Import audio's strokes currentColor, i.e. the grey tint. #270 left it grey on purpose and said so.
   * The SAME checker runs on the Media tile first — the look he pointed at is the positive control: if paint() could
   * not see a gradient, the Media tile would fail it too and this test could never pass vacuously. */
  test('960 Import media and Import audio wear the same white-gradient arrow, and the Media tile says Import media', { item: '960' }, async function () {
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-10000px;top:0;width:420px;height:600px';
    document.body.appendChild(host);
    try {
      FM.addMenu.render(host, { variant: 'panel' });
      const openTab = async function (name) {
        const tab = [...host.querySelectorAll('.addmenu-tab')].find(e => e.textContent.trim() === name);
        if (!tab) throw new Error('no ' + name + ' tab');
        tab.click(); await sleep(180);
      };
      const labelOf = c => ((c.querySelector('.addmenu-lbl') || {}).textContent || '').trim();
      const cardNamed = label => [...host.querySelectorAll('.addmenu-card')].find(c => labelOf(c) === label);
      // What a tile's icon is painted with. Every stroke must name ONE gradient, and it must live inside this card.
      function paint(card, what) {
        const paths = [...card.querySelectorAll('.addmenu-ic svg path')];
        if (!paths.length) throw new Error(what + ': the icon has no strokes to check');
        const ids = new Set();
        paths.forEach(p => {
          const st = p.getAttribute('stroke') || '';
          const m = /^url\(#([^)]+)\)$/.exec(st);
          if (!m) throw new Error(what + ': a stroke is "' + (st || 'currentColor, inherited from the svg') + '" — it takes the card\'s grey tint, not the white gradient');
          ids.add(m[1]);
        });
        if (ids.size !== 1) throw new Error(what + ': the arrow and the tray use ' + ids.size + ' different paints');
        const id = [...ids][0];
        const grad = [...card.querySelectorAll('linearGradient')].find(g => g.id === id);
        if (!grad) throw new Error(what + ': the icon points at #' + id + ', which is not inside this card — it would borrow (or lose) another icon\'s paint');
        const stops = [...grad.querySelectorAll('stop')].map(s => (s.getAttribute('stop-color') || '').toLowerCase() + '@' + (s.getAttribute('stop-opacity') || '1')).join(' > ');
        return { id, stops, tint: card.style.getPropertyValue('--am-tint').trim(), cls: card.className };
      }

      await openTab('Media');
      if (cardNamed('Import')) throw new Error('the Media tile is still called just "Import" — he asked for "Import media"');
      const media = cardNamed('Import media');
      if (!media) throw new Error('no "Import media" tile on the Media tab (tiles: ' + [...host.querySelectorAll('.addmenu-card')].map(labelOf).join(', ') + ')');
      if (media.title !== 'Import media') throw new Error('the Import media tile\'s tooltip says "' + media.title + '"');
      const m = paint(media, 'Import media');     // the positive control: the look he pointed at passes
      if (m.stops !== '#ffffff@1 > #ffffff@.55') throw new Error('the Import media gradient is ' + m.stops + ' — it is the reference look and was not meant to change');

      await openTab('Audio');
      const audio = cardNamed('Import audio');
      if (!audio) throw new Error('no "Import audio" tile on the Audio tab');
      const a = paint(audio, 'Import audio');

      if (a.stops !== m.stops) throw new Error('the two arrows are painted differently — Import media ' + m.stops + ', Import audio ' + a.stops);
      if (a.id === m.id) throw new Error('both icons use the id #' + a.id + ' — a duplicate id silently steals the paint from whichever element asks second');
      if (a.tint !== m.tint) throw new Error('the plates differ: Import media --am-tint ' + m.tint + ', Import audio ' + a.tint);
      if (a.cls !== m.cls) throw new Error('the tiles carry different classes: "' + m.cls + '" vs "' + a.cls + '"');

      // the tint map is keyed by the visible label, so the rename has to reach it — and leave no dead key behind
      const hue = FM.addMenu._tileHue('Import media');
      if (!hue) throw new Error('"Import media" has no tile colour — BY_LABEL is keyed by the label');
      const rgb = hue.split(',').map(n => parseInt(n, 10));
      if (Math.max.apply(null, rgb) - Math.min.apply(null, rgb) > 40) throw new Error('"Import media" is no longer the basic grey (#210): ' + hue);
      if (FM.addMenu._tileHue('Import')) throw new Error('the tile-colour map still carries an "Import" key that no tile has any more');
    } finally { host.remove(); }
  });

  /* 960, the PC half. MEASURED on the plan (v17.03 + the change applied at runtime, a library of two clips and a song):
   * 1. THE RENAME ALONE BROKE THE PC FIT. At 1280x900 (inspector 307x270) it knocked the Media tab out of its
   *    fitted layout — pinned tiles 43→64px tall, icons 19→22px, the library squeezed into the fixed five-column
   *    fallback — and Audio with it. Under .addmenu--fit a pinned label may wrap, "Import media" is wider than its
   *    fitted tile, it went to two lines, the strip grew, and the grid lost the room it had been planned in.
   * 2. THE TWO BUTTONS WERE NEVER THE SAME SIZE ON PC. The strip wore the fit variables planned for the LIBRARY under
   *    it, per tab: at 1280x900 Import was 64x43 with a 19px arrow and Import audio 87x60 with a 27px arrow.
   * The strip now has its own size (styles.css, queue 960), the same on both tabs. This drives the real fit (a .panel
   * host at a desktop width, the render the inspector does) and asserts the three facts: still fitted, one line,
   * same height and same arrow on both tabs. 285x358 is a panel the fit comments record measuring (classic 1024x640);
   * measured on the plan, it is a size where the un-fixed rename wraps to 2.0 lines at 12px. */
  test('960 on PC Import media and Import audio are the same size, on one line, and the tabs keep their fitted layout', { item: '960' }, async function () {
    const KEY = 'fm.medialib', saved = localStorage.getItem(KEY);
    const panel = document.createElement('aside'); panel.className = 'panel';
    panel.style.cssText = 'position:fixed;left:-10000px;top:0;width:285px;height:358px;overflow:auto';
    const box = document.createElement('div'); panel.appendChild(box); document.body.appendChild(panel);
    try {
      localStorage.setItem(KEY, JSON.stringify([
        { mid: 't960v', key: 'k960v', name: 'Clip.mp4', kind: 'video', audio: false, w: 1080, h: 1920, dur: 4, added: 3 },
        { mid: 't960p', key: 'k960p', name: 'Shot.jpg', kind: 'image', audio: false, w: 1080, h: 1350, dur: 0, added: 2 },
        { mid: 't960a', key: 'k960a', name: 'Song.mp3', kind: 'video', audio: true, w: 0, h: 0, dur: 95, added: 1 }
      ]));
      return await atWideWidth(async function () {
        FM.addMenu.render(box, { variant: 'panel' });
        await sleep(120);
        const root = box.querySelector('.addmenu');
        if (!root) throw new Error('the Add menu did not render into the test panel');
        const visit = async function (name, label) {
          const tab = [...root.querySelectorAll('.addmenu-tab')].find(e => e.textContent.trim() === name);
          if (!tab) throw new Error('no ' + name + ' tab');
          tab.click(); await sleep(250);
          const pinned = [...root.querySelectorAll('.addmenu-pinned .addmenu-card')];
          const card = pinned.find(c => ((c.querySelector('.addmenu-lbl') || {}).textContent || '').trim() === label);
          if (!card) throw new Error('no "' + label + '" tile in the PC ' + name + ' strip (strip: ' + pinned.map(c => c.textContent.trim()).join(', ') + ')');
          // THE CONTROL: this is the fitted PC layout, not the fixed fallback — otherwise nothing below is about the fit
          if (!root.classList.contains('addmenu--fit')) throw new Error('the PC ' + name + ' tab dropped out of its fitted layout (data-am-fit ' + (root.dataset.amFit || 'none') + ', strip ' + Math.round(root.querySelector('.addmenu-pinned').getBoundingClientRect().height) + 'px) — the strip took the room the grid was planned in');
          const lb = card.querySelector('.addmenu-lbl'), fs = parseFloat(getComputedStyle(lb).fontSize);
          return { h: card.getBoundingClientRect().height, ico: card.querySelector('.addmenu-ic svg').getBoundingClientRect().width, fs: fs, lines: lb.getBoundingClientRect().height / (fs * 1.2) };
        };
        const m = await visit('Media', 'Import media');
        const a = await visit('Audio', 'Import audio');
        if (m.lines > 1.4) throw new Error('"Import media" wraps to ' + m.lines.toFixed(1) + ' lines in the PC strip (' + m.fs + 'px) — a two-line label makes the strip taller than the box the fit planned against');
        if (Math.abs(m.h - a.h) > 0.5) throw new Error('on PC Import media is ' + m.h.toFixed(1) + 'px tall and Import audio ' + a.h.toFixed(1) + 'px — "they both look different"');
        if (Math.abs(m.ico - a.ico) > 0.5) throw new Error('on PC the Import media arrow is ' + m.ico.toFixed(1) + 'px and the Import audio arrow ' + a.ico.toFixed(1) + 'px');
      }, 1280);
    } finally {
      panel.remove();
      if (saved == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, saved);
    }
  });
```

⚠️ **Test names carry NO double quote** (review fix): the suite's own gate `suite: no test name can truncate its own
failure report` (`tests/tests.js:146`) fails on any `"` in a name, because ship.sh and mutate.sh cut the FAIL line at
the first `"`. The first draft named test 1 `…says "Import media"` — that would have turned the whole suite red. The
quotes inside error MESSAGES are fine (the gate reads names only, and existing tests do the same).

**Why each fails on HEAD, and was checked to:** both test bodies were run verbatim (with `atWideWidth` stubbed, since
shot.py is already a desktop window) in `probe_final.js`, in three simulated trees:

| simulated tree (900x760, desktop) | test 1 (`960 Import media and Import audio wear…`) | test 2 (`960 on PC Import media and Import audio are the same size…`) |
|---|---|---|
| `none` = HEAD | **FAIL** — the Media tile is still called just "Import" — he asked for "Import media" | **FAIL** — no "Import media" tile in the PC Media strip (strip: Import, Sample clip, AI Scene, Assistant) |
| `renameIcon` = §5.1 only, no CSS | PASS | **FAIL** — "Import media" wraps to 2.0 lines in the PC strip (12px) |
| `full` = §5.1 + §5.2 | PASS | PASS |

(`probe_final.js` → `pf_none.js` / `pf_renameIcon.js` / `pf_full.js`; results in `chain5.log`.)

- Test 1 fails on HEAD at its first assertion (the tile is still "Import"). With the rename but the OLD Audio icon it
  fails at `paint(audio)` ("a stroke is currentColor…"); with a copied id it fails at the id check. The Media tile runs
  through the same `paint()` first, so the checker cannot pass vacuously.
- Test 2 fails on HEAD (no "Import media" tile), and — the case that matters for the CSS — fails on the JS-only tree,
  i.e. the rename without the strip CSS (see the `renameIcon` row). Its fit check is the positive control: a panel
  that never reached `.addmenu--fit` fails loudly instead of measuring the fallback.

Mutations worth running after it is green (`tools/mutate.sh`, one at a time, never beside ship.sh):
```bash
tools/mutate.sh js/addmenu.js "importIcon('fm-ic-impau')" "importIcon('fm-ic-imp')" "960 Import media and Import audio wear"
tools/mutate.sh styles.css "  .addmenu--fit .addmenu-pinned .addmenu-card { padding: 5px 3px; gap: 4px; height: auto; }" "" "960 on PC Import media and Import audio are the same size"
tools/mutate.sh styles.css ".addmenu--fit .addmenu-pinned .addmenu-card .addmenu-lbl { font-size: clamp(10px, 3.2cqi, 12px); line-height: 1.2; white-space: nowrap; max-height: none; }" ".addmenu--fit .addmenu-pinned .addmenu-card .addmenu-lbl { }" "960 on PC Import media and Import audio are the same size"
```
Expected: CAUGHT, CAUGHT, CAUGHT. Only the first is certain from the dry-run (the id check). The two CSS ones are
predictions from §3.2/§3.3 (without the padding rule the strip takes each tab's plan again → heights differ; without
the label rule it wraps at the 12px planned for 285x358) — **not run by the planner**.

### 6.2 Existing tests that must follow the rename

1. **`the Media Import icon is a white gradient on a still-grey plate (queue 270)`** — `tests/tests.js:44912–44913`:
   ```js
      const card = [...host.querySelectorAll('.addmenu-card')].find(c => c.textContent.trim() === 'Import');
      if (!card) throw new Error('no Import card on the Media tab');
   ```
   becomes
   ```js
      const card = [...host.querySelectorAll('.addmenu-card')].find(c => c.textContent.trim() === 'Import media');   // renamed by queue 960
      if (!card) throw new Error('no Import media card on the Media tab');
   ```
   Otherwise it goes RED after the change ("no Import card on the Media tab").
2. **`the add menu gives each tab its own palette and the named buttons their named colour`** — `tests/tests.js:42510–42512`:
   ```js
        ['Import', 'Import audio'].forEach(function (l) {
          if (byLabel[l] && !grey(tintOf(l))) throw new Error(l + ' should be a basic grey, got rgb(' + tintOf(l).join(',') + ')');
        });
   ```
   becomes (the `byLabel[l] &&` guard would have let the renamed tile skip silently — that is exactly the half-rename
   BY_LABEL's own comment warns about, so the pair is now required):
   ```js
        // queue 960 renamed "Import" to "Import media"; the pair is REQUIRED here, not skipped when missing —
        // a rename that missed BY_LABEL would otherwise drop the grey silently and this line would stay green.
        ['Import media', 'Import audio'].forEach(function (l) {
          if (!grey(tintOf(l))) throw new Error(l + ' should be a basic grey, got rgb(' + tintOf(l).join(',') + ')');
        });
   ```
   (`tintOf` already throws `no card labelled "…"` when the tile is missing.) It runs at phone width through the real
   sheet and visits every tab, so the Media tile is always collected.

Both edits count as "changed tests" for `prove.sh`; both fail on HEAD's source (no "Import media" tile), so they read
CAUGHT, not DEAD.

## 7. Verification (builder)

1. Suite slices, both widths (the 380 pass matters for 6.2 #2):
   ```bash
   python3 tests/_cdp.py --url 'http://localhost:8777/tests/run.html?only=960'
   python3 tests/_cdp.py --width 380 --url 'http://localhost:8777/tests/run.html?only=960'
   python3 tests/_cdp.py --url 'http://localhost:8777/tests/run.html?only=queue%20270'
   python3 tests/_cdp.py --width 380 --url 'http://localhost:8777/tests/run.html?only=named%20buttons%20their%20named%20colour'
   python3 tests/_cdp.py --url 'http://localhost:8777/tests/run.html?only=queue%20542'
   python3 tests/_cdp.py --url 'http://localhost:8777/tests/run.html?only=no%20element%20id%20appears%20twice'
   ```
   Then the full suite through `tools/ship.sh` as usual (`timeout: 600000`).
2. Pictures, through the app (`tools/shot.py`), Media tab then Audio tab, with a seeded library so the pinned strip
   shows — `s2_before.js` / `s2_A.js` in this folder already do it (drop the runtime patch lines once the code is in):
   - phone **440x956** (his) and **380x820**: "Import media" whole on one line, both arrows white-to-soft-white,
     plates unchanged grey, no console errors; and **320x700** for the §5.4 guard (no "Import me…");
   - PC **1280x900**, **1024x640**, **1920x1080**: both tabs' import buttons the same height and arrow size
     (50/22px, 50/22px, 58/28px), "Import media" inside its tile, the library grid below still fitted (data-am-fit set
     on `#inspector-panel .addmenu`).
   Compare against `960_phone440_optA.png`, `960_pc1280_optA.png`, `960_pc1920_optA.png`.
3. Light/dark: **not applicable.** The editor has one theme (glass — `js/settings.js:122` sets it unconditionally;
   classic was removed in #178); the light/dark switch is Home-only (`data-home`), and the Add menu never shows on
   Home.
4. Demo mode: unaffected — it only relabels library tiles (`item.mid`).

## 8. Risks, and tests likely to break

- **Tests that go red unless edited (§6.2):** `the Media Import icon is a white gradient on a still-grey plate (queue
  270)`. **Would silently pass** (and so is edited too): `the add menu gives each tab its own palette and the named
  buttons their named colour`.
- **Checked and unaffected** (grep of `tests/tests.js` for `Import`, `addmenu-pinned`, `addmenu--fit`, `_tileHue`,
  `_tileTints`):
  `Media and Audio pin their own buttons above the scrolling library (queue 269, 276)` (offscreen panel with no `.panel`
  ancestor → never fitted → the new CSS does not apply); `add panel: a bigger panel never draws a smaller icon…` and
  `add panel: pages can be turned…` (sweep Elements and Shape only); `917.11 at 320px no tab or card label…` (sweeps
  Elements/Shape cards only); `917.14 the empty canvas hint…` (already says "Import media"); `no element id appears
  twice in the page (queue 458)` (the new `fm-ic-impau` appears once per rendered menu, panel + sheet, with identical
  defs — the case that test allows); the `_tileHue`/`_tileTints` tests at `:62279`, `:64904`, `:65262` (other labels).
- **`on PC the Add menu stays inside the inspector panel on every tab (queue 542)`** — not expected to break, but it is
  the test that owns "the strip took the room": at 1280 the Media strip grows 7px (tiles 43 → 50) while Audio's shrinks
  10px (60 → 50). Run it (§7.1).
- **320px phones (below his 440 and the 380 target):** "Import media" ellipsizes to "Import me…" at 320x700 (tile
  68px, text 61.3px, measured `CLIPPED`). The old "Import" fitted. Guard, one line, phone-only:
  after the existing `@media (max-width: 360px) { … }` block at `styles.css:1282–1284`, add
  ```css
  /* "Import media" (queue 960) is 61.3px at 10.5px; under ~326px the Media strip's tile leaves 60px of label room even
     with the 3px padding above, so it cut to "Import me…" at 320 (measured). At 10px it is 58.4px — measured whole at
     320 (4.6px spare each side) and at 340 (7.1px). Only the pinned strip's own words; library names keep their size. */
  @media (max-width: 340px) {
    .addmenu--sheet .addmenu-pinned .addmenu-card .addmenu-lbl { font-size: 10px; }
  }
  ```
  Measured with it injected (`probe_patch_320fix.js`, `chain6.log`): 320 → 58.4px text, 4.6px spare, not clipped;
  340 → 7.1px spare. Between 326 and 360 the 3px-padding tile already fits 61.3px; above 360 the tile is ≥79px. No
  test is added for this line (917.11 deliberately skips Media/Audio cards); it is covered by the 320 screenshot in §7.
- **Non-fitted PC fallback** (a panel too short for any plan): the new CSS is scoped to `.addmenu--fit`, so there the
  strip keeps HEAD's 64px tiles and "Import media" at 10.5px sits in a 64px tile edge to edge (seen in
  `960_builder_rename_breaks_fit.png`, right). Not reached at the DEFAULT band of 1024x640, 1280x900 or 1920x1080 (fitted
  at all three, §3.3) — **but it IS reached when he drags the band down**, which is exactly #963's "shrink the add layer".
  Measured in review (`probe_band_rev.js` → `rv3_none.js` / `rv3_bothC3.js`, 1280x900, `--tl-h` stepped down from the
  default 270): HEAD and the §5.2 tree both stay fitted at 262 and both drop to the fallback at 254, so §5.2 does not make
  the fit give up any sooner. In the fallback both tabs' import tiles are 64px tall with 22px arrows on both trees (the same
  size, so clause 1 still holds), and "Import media" has **1.1px** each side at 10.5px — whole, not clipped, but tight.
  That tightness belongs to #963's plan, not this one. (Also seen: the fit has hysteresis on HEAD — stepping UP from a
  fallback state, 270 stayed unfitted and only 280 re-fitted, because the fallback strip is 74px tall versus about 53–60
  fitted. It is the same on both trees; noted for #963.)
- **`container-type: inline-size`** needs Safari 16 / Chrome 105. It is PC-only here (inside `@media (min-width:
  701px)` and `.addmenu--fit`), and the strip measured its full width (271/278/371px) — it did not collapse.
- **The 1920 look changes:** HEAD drew both import rows at 81px with 46px arrows; A draws 58px / 28px. That is in the
  A picture he approves (`960_pc1920_optA.png`), not a surprise.
- **Scope:** only the Media/Audio pinned strip changes size on PC; the paged grids and every other tab are untouched
  (the rules are all `.addmenu-pinned`-scoped).

## 9. Open questions for Ezra

❓ASK: Import buttons — A (same white-shine arrow on both, "Import" renamed "Import media", same size on PC) or B (A plus
a lit top edge on both buttons)? **Recommended: A** — it is exactly the look you pointed at, on both, and nothing else
moves.

(Nothing else needs him: the hidden `#btn-import` is renamed as a matter of course — it is never on screen.)


## Review (skeptical pass, 26 Sep, against HEAD `acae12a5`, clean except INBOX.md)

**Changed in this file:**
1. **Test 1's name had double quotes in it** (`…says "Import media"`). The suite's own gate `suite: no test name can
   truncate its own failure report` (`tests/tests.js:146–150`) fails on any `"` in a test name, so the first full run
   would have gone red and ship.sh would have refused. Renamed to `…and the Media tile says Import media`, with a ⚠️ note
   in §6.1 saying why. The `?only=960` slice and the mutate substring `960 Import media and Import audio wear` still match.
2. `REQUESTS.md:2797–2800` → `2796–2799` (the #270 "say if you want the audio one to match" lines).
3. **Option B CSS:** its comment now names where the glass rule lives (theme-glass.css:115/186), and it gains two
   `:hover` rules. Without them theme-glass.css's `html[data-theme="glass"] .addmenu-card:hover` (0,3,1, loaded after
   styles.css) wiped the shine on hover on the phone sheet, and on PC the shine rule (1,2,0, later than the
   `#inspector-panel .addmenu-card:hover` at styles.css:8603) froze the hover ramp. The hover values are **unmeasured**
   and labelled so.
4. **§8 "Non-fitted PC fallback" was wrong in the case that matters.** It said the fallback is "not reached" at 1280x900.
   That is true at the default band only. Measured in review at 1280x900 (`probe_band_rev.js`, `rv3_*.js`,
   `rv3_none.png` / `rv3_bothC3.png`): dragging the band down drops HEAD and the §5.2 tree out of the fit at the same
   point (both fitted at 262, both in the fallback at 254). So §5.2 does not make shrinking any worse. In the fallback
   both import tiles are 64px with 22px arrows, and "Import media" has 1.1px spare each side. The fit also has hysteresis
   (stepping back up re-fits only at about 280), and that is the same on both trees. The bullet now says all of this.

**Checked and correct as written:** every `js/addmenu.js` line (10–12, 19–21, 384–398, 452, 898–903, 1049–1065 incl.
1062, 1108/1115/1119, 1154–1195, 1329–1335), `styles.css` 1282–1284, 1310, 5613–5659 (5634–5636, 5655–5658), 8596,
8603, 8611–8612, `index.html` 42 (`styles.css?v=727`), 280/282/423, 1067 (`addmenu.js?v=80`), `js/app.js` 6851/7665,
`js/timeline.js` 3475/4738, `js/settings.js:122`, `tests/tests.js` 42510–42512, 44902–44913, 44940, 47874 (the duplicate
gradient ids are allowed only when identical, as §8 says), 54061 (queue 542), 64905. `'Import'` appears in `js/` only at
addmenu.js:394 and :901. No test looks up `'Import'` other than the two §6.2 edits. `FM.mediaLib.list()` re-reads
`localStorage['fm.medialib']` on every call (`js/medialib.js:33–34, 74`), so test 2's seeding really does reach the menu.
The cache-buster bump for both changed files is in §5.3.
**Re-run in the browser (tools/shot.py, :8777, with nothing else heavy running):** both new test bodies parse, and
`importIcon('fm-ic-imp')` is byte-identical to HEAD's Media icon (481 = 481 chars, `identical: true`, `rv_syntax.js`).
All 9 images open, are ≤1200 wide and under 3x tall, and show what their captions say.
**Proof logic:** test 1 fails on HEAD at "still called just Import", and its Media-tile `paint()` is a real positive
control. Test 2 fails on HEAD and on the JS-only tree (the wrap), and its `.addmenu--fit` check is its control. Both
§6.2 edits fail on HEAD's source ("no card labelled Import media" / "no Import media card"), so prove.sh reads them as
CAUGHT. The two CSS mutations in §6.1 are still predictions, not runs, and are labelled so.

**Not this plan's job, but the builder should know:** the user message that set off this review run is **#963**
(REQUESTS.md, "PC: the Add menu and the layer inspector shrink well — drop the text when too small…"), not #960. This
plan is #960 only. It does not cover #963, and #963 needs its own plan. The two touch the same place: §5.2 gives the PC
pinned strip its own size, and #963 will rework how the Add menu shrinks. Oldest first, #960 is built before #963.
#963's planner should start from the fallback numbers in §8: a 1.1px-spare "Import media" and the 254/262 fit edge at
1280x900.
