# PLAN — PC layer-action group: two fading corner lines instead of a fill and an outline

Inbox entry: `INBOX.md` "26 Sep 2026, ~17:35 AWST — PC: the three layer-action buttons lose their background and outline…".
Queue number: **959** (the loop drained the inbox entry into `REQUESTS.md` as #959, "PC: the three layer-action buttons lose their
background and outline, for two fading corner lines"). Every `959` below was an `NNN` placeholder in the draft; the reviewer filled it in.

Everything here was measured on the working tree of 26 Sep ~18:10 (v17.03 in progress, `styles.css?v=725`),
through `tools/shot.py` with CSS injected at runtime. No repo file was edited.
**Tree drift (review, 26 Sep ~20:30):** HEAD is now v17.04 (`6eeab60a`) and the working tree carries `styles.css?v=727`.
The `#t-sel` rule, its comment block and every test snippet this plan replaces were re-read against that tree and are
byte-identical (each "Replace:" block below matches exactly once). Line numbers below are the current ones — anchor on
the quoted text, not the number, because another session is still editing. The pixel measurements were NOT re-run.

---

## 1. His words and his clauses

**His words (verbatim):** "This little menu with the three buttons in it that pops up when you select a layer, we've been
going back and forth on what it should look like for a while now, but I reckon what we should do is basically what it's
like in my image now, where it's like instead of it having like a background and a line all the way around it, it should
have two like corner lines on the bottom left and then the bottom right. I mean, the top right to the bottom left, top
right. that like fade out so it's like a solid line in the corner but then it slowly fades out and then like i thought
like that would look cool around it instead"

His screenshot, corners drawn in red: `tools/design/2026-09-26-layer-actions-corners.webp`.

Clauses (tick each one separately):
1. [ ] The little three-button menu that appears when a layer is selected (parent · delete · ⋯ in the PC transport row) looks like his drawing.
2. [ ] No background, and no line all the way around it.
3. [ ] Two corner lines instead: one at the **TOP-RIGHT** and one at the **BOTTOM-LEFT**. He corrected himself mid-sentence ("I mean, the top right to the bottom left"), so bottom-right is wrong.
4. [ ] Each line is solid at its corner and slowly fades out along both edges.
5. [ ] (his standing design rule, #545, carried as clause 5 in REQUESTS.md #959) rendered and shown to him before it ships — `corners-2-at-his-2x-screen.png`, see §10.

What his drawing shows, measured on his screenshot (the red strokes, `his-crop.png` in this folder): the top-right
line starts about halfway along the top edge, runs round the corner and about two-thirds of the way down the right side.
The bottom-left line starts about a third of the way down the left side, runs round the corner and about a third of the
way along the bottom. So the arms are long — about half the width and most of the height — not little brackets.

---

## 2. What exists now (verified against the current tree)

**The group is built in `js/app.js`:**
- `js/app.js:7597` — `const sel = document.createElement('span'); sel.id = 't-sel';`
- `js/app.js:7613` — `['btn-parent', 'btn-del-layer', 'btn-group', 'btn-maskgroup', 'btn-more-layer'].forEach(id => { const b = grab(id); if (b) sel.appendChild(b); });`
- `js/app.js:7614` — `if (sel.childNodes.length) right.appendChild(sel);`
- `js/app.js:7679-7680` — `const selWrap = document.getElementById('t-sel');` / `if (selWrap) selWrap.classList.toggle('has-sel', n >= 1);`
  (`.has-sel` is the only switch the look hangs off; it goes when nothing is selected. **No JS change is needed.**)

**Its look is `styles.css`, PC only:**
- `styles.css:7725` — `#t-sel { display: flex; align-items: center; gap: 6px; }`
- `styles.css:7921` — the history header `/* ---- The selection trio wears its own ground (v7.89, queue 242) ----`
- `styles.css:7934` — `@media (min-width: 701px) {` (so the phone is never touched)
- `styles.css:7935` — `/* DARKER THAN THE ROW, NOT LIGHTER (queue 251). …` (#251)
- `styles.css:7950` — `/* ⚠️ v12.46 — AN OUTLINE AND A BREATH, NOT A RECESS (queue 516). …` (#516, his 25 Aug pick from four rendered options)
- `styles.css:7961-7966`, the rule this item replaces:
  ```css
    #t-sel.has-sel {
      padding: 0 5px; margin: 0 3px;
      border-radius: 11px;
      background: rgba(255, 255, 255, .045);
      border: 1px solid rgba(255, 255, 255, .13);
    }
  }
  ```
- `index.html:42` — `<link rel="stylesheet" href="styles.css?v=727">` in the working tree at review time (726 at HEAD `6eeab60a` v17.04; the planner saw 725 during v17.03 — it moves with every release).

**`theme-glass.css`:** nothing touches `#t-sel`, `.has-sel` or `#transport` (`grep -n "t-sel\|transport" theme-glass.css` → only `.set-select`).
Glass is the shipped default (`index.html:15` `<html lang="en" data-theme="glass">`); glass `--accent` = `#5ac7ed`, Classic `--accent` = `#29d9bb`.
**There is no light editor theme** — `prefers-color-scheme` appears nowhere in styles.css / theme-glass.css, and `data-home="light"` is Home only. So "light and dark" for this row means Glass and Classic, both dark.

---

## 3. Findings and measurements

All numbers from `tools/shot.py --width 1280 --height 800 --js-file probe.js` (DPR 1) unless marked 2x. Probe: `probe.js` in this folder.

| what | measured | how |
|---|---|---|
| Row (`#transport`) | 972.8 × 40 at y 561 | `getBoundingClientRect` |
| Group now (`#t-sel.has-sel`) | **126 × 36** at (807.2, 563) — 2px above, 2px below the row | same |
| Group now, computed | background `rgba(255, 255, 255, 0.043)` (the `.045` quantised to 8-bit alpha), border `1px rgba(255, 255, 255, 0.13)`, padding `0px 5px`, radius `11px`, **no `::before`/`::after`** (`content: none`) | `getComputedStyle` |
| Group with the change (`padding: 1px 6px; border: 0`) | **126 × 36 at the same x/y** — byte-identical geometry, so nothing in the row moves | same |
| Two layers selected (group + mask-group appear) | 5 buttons, group **206 × 36**; `::before` and `::after` are both **206px** wide — the corners follow the group | same |
| Nothing selected | group 0 × 0, `has-sel` off, `::before` content `none` — no stray corners | same |
| 1.5px line at DPR 1 | computed `borderTopWidth` = **`1px`** (Chrome snaps borders to whole device pixels) | `getComputedStyle(sel,'::before')` |
| 1.5px line at 2x | computed **`1.5px`** (3 device px) | same, 2x run |
| Clicks | `elementFromPoint` at the bin's centre returns `#btn-del-layer` for the current look and all four variants (`pointer-events: none` on the corners) | probe |
| Mask as Chrome serialises it | `radial-gradient(60% 85% at 100% 0px, rgb(0, 0, 0) 25%, rgba(0, 0, 0, 0) 100%)` — note **`0px`, not `0%`**; the test regex allows both | probe |
| Phone, 440 × 956 and 380 × 800, layer selected | `#t-sel` **absent**, 0 elements with `.has-sel`, `(min-width: 701px)` false — the new rules cannot match anything. The phone's layer actions are the top bar's ⧉ 🗑 ⋯, untouched. Pixel diff before/after injecting A: the only changed box is the option cards' animated glow, and a control pair with NO CSS change shows the same box | `probe-phone.js`, PIL `ImageChops` |
| His screen | his screenshot is 2000 px wide and the 36px group is **50 px** tall in it → 1.389 px per CSS px; that fits a **1440 × 900 window at DPR 2, downscaled to 2000 px** (1440 × 1.389 = 2000). An estimate from one screenshot, not a measurement of his machine. | PIL on the webp |

**The fade, per option** (what the mask does to each arm, computed from the gradient stops — the group is 126 × 36):
- A / B (`60% 85%`, solid to 25%): top arm solid for 19px from the corner, gone by 76px (60% of the width). Side arm solid for 8px, gone by 31px (85% of 36); where the far corner's 11px curve starts (25px down) it is at about 24%, so the tail into that curve is faint — visible as a soft end in the 2x picture, not a hook.
- C (`30% 70%`, solid to 35%): top arm solid 13px, gone by 38px; side arm solid 9px, gone by 25px — a bracket.
- D (`95% 100%`, solid 15%) was also rendered and **dropped**: its arms nearly meet, and at size it reads as the full outline again — the thing clause 2 removes.

**The proving test's assertions, run in the page** (the synchronous core of §6, pasted into `probe.js` as `check()`):

| width | NOW (HEAD look) | A | B | C | D | A, two selected |
|---|---|---|---|---|---|---|
| 1280 × 800 | FAIL "the group still has a background (rgba(255, 255, 255, 0.043))" | PASS | PASS | PASS | PASS | PASS |
| 1440 × 900 | same FAIL | PASS | PASS | PASS | PASS | PASS |
| 900 × 800 | same FAIL | PASS | PASS | PASS | PASS | PASS |

(Not measured: the async half of the test — the resize through `atWideWidth` and the teardown — which only the real
runner can do. The builder's `prove.sh` run is the measurement for that.)

**How the pictures were made.** 1:1 frames: `tools/shot.py` at 1280 × 800 (DPR 1 — shot.py fixes DPR 1 for any width
≥ 768). 2x frames: the same, at 2880 × 1800 with `#timeline-panel { zoom: 2 }` injected, so the row is laid out at 1240
CSS px and drawn at twice the pixels — borders, mask and icons, like a DPR-2 screen. (Zooming the whole page instead was
tried and measured wrong: it lays out against the full 1800px viewport and the row lands at y 2682, off the shot.)

**⚠️ Found while prototyping, NOT part of this item — from 1160px (where #801's band stops) up to about 1386px wide, with two layers selected, the ⋯ button is
under the version chip and cannot be clicked.** With two selected the group grows to 206px (parent · delete · group ·
mask-group · ⋯). Measured at 1280: group 807.2 → 1013.2, far-right run starts at 960.1 → **53px overlap**, and
`elementFromPoint` at the ⋯'s centre returns **`.ver`** (the version chip), not the button. At 1440: group ends 1093.2,
far run starts 1120.1 → 27px clear, ⋯ is on top. Straight-line between those two widths, the overlap ends at about
**1386px** (an estimate from two measurements). At 900 the far run is in #801's band under the row, clear.
It is LAYOUT, not paint: the current look has the same 206px box (`finding-1280-two-selected-overlap.png`, top row, is
HEAD's look in the same state), so it is on HEAD today, and #801's test does not see it (it selects ONE layer, checks 900
and 760, and at 1280 only that the far run stayed on one row). If copy ever joins the group (#425) the one-layer group is
166px (4 × 34 + 3 × 6 + 12, computed) and its right edge would reach 973 at 1280 — 13px under the far run.
**Suggest the loop logs it as a `(hunt MEDIUM #n)` finding** (e.g. raise #801's band threshold from 1160 to ~1400, or
drop the band in whenever the group and the far run intersect) — do NOT fix it inside this item.

---

## 4. Options (rendered in the real transport row)

Images (all ≤ 1200 wide, ≤ 3× as tall as wide), in this folder:
- `corners-2-at-his-2x-screen.png` — **send him this one.** NOW, A, B, C at **2x**, what a DPR-2 screen like his shows.
- `corners-1-at-size-100pct-scaling.png` — NOW, A, B, C at **1:1 pixels on a 100%-scaling PC** (DPR 1), exactly what ships there.
- `corners-3-A-grows-with-group.png` — A with one layer, two selected (5 buttons), copy moved in (#425, 4 buttons), and the Classic appearance (2x).
- `check-900-band-layout.png` — NOW and A at 900 wide, where the far-right run hangs in the band under the row.
- `finding-1280-two-selected-overlap.png` — the pre-existing overlap in §3 (not this item).
- `his-crop.png` — his red drawing, cropped and enlarged from his webp.
- D (95% / 100% arms) was rendered in an earlier 1280 run (frames not kept) and dropped — see §3. The raw frames of the kept runs are in `raw/`.

| | look | line | arms | why |
|---|---|---|---|---|
| **A — white, as drawn (RECOMMENDED)** | top-right + bottom-left, white | 1.5px, `rgba(255,255,255,.6)` | long: 60% of the width, 85% of the height | Matches his drawing's proportions (half the width, most of the height). White leaves the row's colour where it already means something: Export is cyan on purpose (styles.css `#transport #btn-export` comment: "the one COLOURED mark in a row of white ones") and Notes is yellow. |
| B — accent cyan, as drawn | same shape, `var(--accent)` | 1.5px | same as A | Looks "cool" and ties to the playhead, but a cyan frame is the same colour as the Export arrow a few buttons along, and reads as a second thing to press. Follows the theme (cyan in Glass, teal in Classic). |
| C — short bold brackets | same corners, white | 2px, `rgba(255,255,255,.85)` | short: 30% / 70% | Crisper and more graphic, but shorter than he drew — reads as camera-viewfinder brackets rather than "a solid line in the corner that slowly fades out". |

**Recommended: A.** It is the one that is his drawing: long arms, solid at the corner, a slow fade; white like the icons
it frames, so the row's two coloured marks (Export cyan, Notes yellow) keep meaning something; and at 1.5px it is a
hairline on his 2x screen and a clean 1px line on a 100% PC (measured: Chrome snaps 1.5px to 1px at DPR 1).

---

## 5. The exact change

**Only `styles.css` changes** (plus the `?v=` bump). No JS, no HTML markup.

### 5.1 Option A (recommended) — replace `styles.css:7961-7966`

Anchor: inside the `@media (min-width: 701px) {` that starts at `styles.css:7934`, directly after the comment that ends
`…because it is the reason this was ever dark. */`. Replace this block:

```css
  #t-sel.has-sel {
    padding: 0 5px; margin: 0 3px;
    border-radius: 11px;
    background: rgba(255, 255, 255, .045);
    border: 1px solid rgba(255, 255, 255, .13);
  }
```

with:

```css
  /* ⚠️ v17.xx — TWO CORNERS THAT FADE, NOT A BOX (queue 959). He came back to it a fourth time, with a screenshot and the
     corners drawn on in red: "instead of it having like a background and a line all the way around it, it should have two
     like corner lines … I mean, the top right to the bottom left … that like fade out so it's like a solid line in the
     corner but then it slowly fades out".
     So: no fill, no outline, and two pseudo-elements, each the size of the whole group but with only the two borders that
     meet at ITS corner lit — ::before top-right, ::after bottom-left. One radial mask centred on that corner fades both arms
     at once: solid to a quarter of the way, gone at 60% of the width / 85% of the height, which is the length he drew.
     Percentages, so the corners stay at the group's corners and keep his proportions when it grows (two selected adds
     group + mask-group; #425 may move copy in) — measured: 126px and 206px groups, corners 126px and 206px.
     box-sizing: border-box on the corners is load-bearing: it makes each corner exactly the group's size (the test
     compares them), and without it the 1.5px borders would make the box 2-3px larger than the group.
     The old 1px outline's room is kept as PADDING (1px 6px instead of 0 5px + a 1px border), so the group is still
     126 x 36 at the same place and nothing else in the row moves.
     WHITE, not accent: Export is this row's cyan mark on purpose (see #btn-export above), and a cyan frame a few buttons
     from it reads as a second thing to press. 1.5px is a hairline on a 2x screen; on a 100% PC Chrome snaps it to 1px,
     measured.
     ⚠️ THIS REVERSES #516's OUTLINE, AND #516 REVERSED #251's RECESS. The newer pick outranks the older; the notes above
     are kept because they are the reason each earlier look existed. */
  #t-sel.has-sel {
    position: relative;                      /* the corners hang off this box */
    padding: 1px 6px; margin: 0 3px;         /* = the old 0 5px + 1px border: still 126 x 36 */
    border-radius: 11px;
    --sel-corner: rgba(255, 255, 255, .6);
  }
  #t-sel.has-sel::before,
  #t-sel.has-sel::after {
    content: ''; position: absolute; inset: 0; pointer-events: none; box-sizing: border-box;
    border: 1.5px solid transparent; border-radius: inherit;
  }
  #t-sel.has-sel::before {                   /* top-right */
    border-top-color: var(--sel-corner); border-right-color: var(--sel-corner);
    -webkit-mask-image: radial-gradient(60% 85% at 100% 0, #000 25%, transparent 100%);
            mask-image: radial-gradient(60% 85% at 100% 0, #000 25%, transparent 100%);
  }
  #t-sel.has-sel::after {                    /* bottom-left */
    border-bottom-color: var(--sel-corner); border-left-color: var(--sel-corner);
    -webkit-mask-image: radial-gradient(60% 85% at 0 100%, #000 25%, transparent 100%);
            mask-image: radial-gradient(60% 85% at 0 100%, #000 25%, transparent 100%);
  }
```

(The closing `}` of the `@media` block that followed the old rule stays where it is.)
`v17.xx` in the comment = the version this release ships as (index.html's label at build time + 0.01); `ship.sh` checks the label
against POLISH-LOG, so use the same number in both.

### 5.2 Option B — the same block as A with one line different

```css
    --sel-corner: var(--accent);
```
(and change the comment's "WHITE, not accent" paragraph to say accent was his pick).

### 5.3 Option C — the same block as A with these lines different

```css
    --sel-corner: rgba(255, 255, 255, .85);
  …
    border: 2px solid transparent; border-radius: inherit;
  …
    -webkit-mask-image: radial-gradient(30% 70% at 100% 0, #000 35%, transparent 100%);
            mask-image: radial-gradient(30% 70% at 100% 0, #000 35%, transparent 100%);
  …
    -webkit-mask-image: radial-gradient(30% 70% at 0 100%, #000 35%, transparent 100%);
            mask-image: radial-gradient(30% 70% at 0 100%, #000 35%, transparent 100%);
```

### 5.4 Cache-buster — required, ship.sh refuses without it

`index.html:42`: bump `styles.css?v=` by one from whatever is there when you build (**727 → 728** at review time; the
planner saw 725, so it has already moved twice — read it, do not type a number from this plan). No other `?v=` changes: no js/*.js is touched.

---

## 6. The proving test (new) — append at the end of `tests/tests.js`, just above the final `})();`

It fails on HEAD at clause 2 (measured through the same assertions in `probe.js`: `FAIL: the group still has a background
(rgba(255, 255, 255, 0.043))`), and passes with option A, B or C (measured through the same assertions at 1280, 1440 and 900 — the table in §3). The positive controls: the group must be
on screen (≥ 60 × 24) before any "has no …" assertion means anything, and it must actually GROW with two selected before
"the corners follow it" means anything.

```js
  test('959 on PC the layer-action group has no background and no outline — two corner lines, top-right and bottom-left, solid at the corner and fading out', { item: '959', budgetMs: 30000 }, async function () {
    /* Ezra, 26 Sep, with a PC screenshot and the corners drawn on in red (tools/design/2026-09-26-layer-actions-corners.webp):
       "This little menu with the three buttons in it that pops up when you select a layer, … instead of it having like a
        background and a line all the way around it, it should have two like corner lines on the bottom left and then the
        bottom right. I mean, the top right to the bottom left, top right. that like fade out so it's like a solid line in the
        corner but then it slowly fades out"
       One block per clause: no background; no line all the way round; a corner at TOP-RIGHT and one at BOTTOM-LEFT (he
       corrected himself, so bottom-right and top-left stay dark); each solid at its corner and fading along both arms. Then
       the buttons must still take the click, and the corners must follow the group when it grows (two selected adds group +
       mask-group; #425 may move copy in).
       Fails on HEAD at the background: the #516 look is rgba(255,255,255,.045) with a 1px rgba(255,255,255,.13) outline,
       and no ::before / ::after at all. The colour is NOT pinned (his pick among white / accent is the CSS's business);
       only "visible" is (alpha >= .3). Width is asserted >= 1, not 1.5: at DPR 1 Chrome snaps 1.5px to 1px (measured). */
    const aOf = c => { if (String(c).trim() === 'transparent') return 0; const n = (String(c).match(/[\d.]+/g) || []).map(Number); return n.length > 3 ? n[3] : (n.length === 3 ? 1 : 0); };
    const saved = FM.scene, savedSel = FM.scene.selectedId;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    try {
      if (hadHome) FM.home.close();
      const A = FM.makeLayer('shape', { name: 'k959a', shape: 'rect', x: 300, y: 300, shapeW: 200, shapeH: 200, fill: '#c05030', start: 0, duration: 3 });
      const B = FM.makeLayer('shape', { name: 'k959b', shape: 'ellipse', x: 700, y: 900, shapeW: 200, shapeH: 200, fill: '#3070c0', start: 0, duration: 3 });
      FM.scene = scene([A, B], { project: { width: 1080, height: 1920, fps: 30, duration: 4 } });
      await atWideWidth(async function () {
        FM.selectLayer(A.id); FM.refreshAll(); await sleep(250);
        const sel = document.getElementById('t-sel'), del = document.getElementById('btn-del-layer');
        if (!sel || !del) throw new Error('setup: the PC layer-action group is not built (t-sel ' + !!sel + ', delete ' + !!del + ') at ' + innerWidth + 'px');
        const r = sel.getBoundingClientRect();
        // CONTROL — every "has no …" below passes against a group that is not on screen
        if (!sel.classList.contains('has-sel') || r.width < 60 || r.height < 24) throw new Error('control: with a layer selected the group is ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' (has-sel ' + sel.classList.contains('has-sel') + ') — not on screen, so nothing below would mean anything');
        const cs = getComputedStyle(sel);
        // clause 2a — no background
        if (aOf(cs.backgroundColor) > 0.02 || cs.backgroundImage !== 'none') throw new Error('the group still has a background (' + cs.backgroundColor + (cs.backgroundImage !== 'none' ? ' / ' + cs.backgroundImage.slice(0, 60) : '') + ') — he asked for no background (queue 959)');
        // clause 2b — no line all the way around (as a border, an outline or a box-shadow)
        ['Top', 'Right', 'Bottom', 'Left'].forEach(function (s) {
          if ((parseFloat(cs['border' + s + 'Width']) || 0) > 0 && aOf(cs['border' + s + 'Color']) > 0.02) throw new Error('the group still has its outline (' + s.toLowerCase() + ' ' + cs['border' + s + 'Width'] + ' ' + cs['border' + s + 'Color'] + ') — "instead of … a line all the way around it" (queue 959)');
        });
        if (cs.outlineStyle !== 'none' && (parseFloat(cs.outlineWidth) || 0) > 0 && aOf(cs.outlineColor) > 0.02) throw new Error('the outline came back as a CSS outline (' + cs.outlineWidth + ' ' + cs.outlineColor + ')');
        if (cs.boxShadow && cs.boxShadow !== 'none') throw new Error('the outline came back as a box-shadow (' + cs.boxShadow + ')');
        // clauses 3 + 4 — the two corners
        const corner = function (pseudo, lit, dark, at, pos) {
          const p = getComputedStyle(sel, pseudo);
          if (p.content === 'none' || p.display === 'none') throw new Error(pseudo + ' is not drawn — there is no ' + at + ' corner line (queue 959)');
          if (p.position !== 'absolute' || p.pointerEvents !== 'none') throw new Error('the ' + at + ' corner is ' + p.position + ' / pointer-events ' + p.pointerEvents + ' — it must be absolute and click-through, or it moves the buttons or eats their clicks');
          lit.forEach(function (s) { if (!((parseFloat(p['border' + s + 'Width']) || 0) >= 1) || aOf(p['border' + s + 'Color']) < 0.3) throw new Error('the ' + at + ' corner has no visible ' + s.toLowerCase() + ' arm (' + p['border' + s + 'Width'] + ' ' + p['border' + s + 'Color'] + ')'); });
          dark.forEach(function (s) { if ((parseFloat(p['border' + s + 'Width']) || 0) > 0 && aOf(p['border' + s + 'Color']) > 0.02) throw new Error('the ' + at + ' corner also draws its ' + s.toLowerCase() + ' edge (' + p['border' + s + 'Color'] + ') — that is the line all the way round again'); });
          // the size of the whole group, so it sits exactly at the group's corner and follows it when the group grows
          if (Math.abs(parseFloat(p.width) - r.width) > 1.5 || Math.abs(parseFloat(p.height) - r.height) > 1.5) throw new Error('the ' + at + ' corner is ' + p.width + ' x ' + p.height + ' but the group is ' + r.width.toFixed(1) + ' x ' + r.height.toFixed(1) + ' — it is not sitting on the group\'s corner');
          if (!((parseFloat(p['border' + (at === 'top-right' ? 'TopRight' : 'BottomLeft') + 'Radius']) || 0) >= 6)) throw new Error('the ' + at + ' corner is square — it must keep the group\'s rounding');
          // clause 4 — solid at the corner, fading out: a radial mask centred on this corner, opaque first, transparent last
          const m = String(p.maskImage && p.maskImage !== 'none' ? p.maskImage : (p.webkitMaskImage || 'none'));
          if (!/radial-gradient\(/.test(m) || !pos.test(m)) throw new Error('the ' + at + ' corner does not fade from its corner (mask: ' + m.slice(0, 120) + ') — "a solid line in the corner but then it slowly fades out"');
          const cols = m.match(/rgba?\([^)]*\)|transparent/g) || [];
          if (cols.length < 2 || aOf(cols[0]) < 0.99 || aOf(cols[cols.length - 1]) > 0.01) throw new Error('the ' + at + ' fade is not solid-then-gone (' + m.slice(0, 120) + ')');
        };
        corner('::before', ['Top', 'Right'], ['Bottom', 'Left'], 'top-right', /at (100%|right) (0(px|%)?|top)[ ,)]/);
        corner('::after', ['Bottom', 'Left'], ['Top', 'Right'], 'bottom-left', /at (0(px|%)?|left) (100%|bottom)[ ,)]/);
        // the buttons still take the click
        const dr = del.getBoundingClientRect(), hit = document.elementFromPoint(dr.left + dr.width / 2, dr.top + dr.height / 2);
        if (!hit || !(hit === del || del.contains(hit))) throw new Error('the bin is covered by "' + (hit && (hit.id || hit.className)) + '" — the corners must not take its click');
        // the corners follow the group when it grows
        FM.toggleSelect(B.id); FM.refreshAll(); await sleep(250);
        const r2 = sel.getBoundingClientRect();
        if (!(r2.width > r.width + 20)) throw new Error('control: with two layers selected the group did not grow (' + Math.round(r.width) + ' → ' + Math.round(r2.width) + 'px) — the check below would measure nothing');
        const w2 = parseFloat(getComputedStyle(sel, '::before').width), w3 = parseFloat(getComputedStyle(sel, '::after').width);
        if (Math.abs(w2 - r2.width) > 1.5 || Math.abs(w3 - r2.width) > 1.5) throw new Error('the corners did not follow the group when it grew to ' + Math.round(r2.width) + 'px (top-right ' + w2 + ', bottom-left ' + w3 + ')');
        // …and leave with the selection
        FM.selectLayer(null); FM.refreshAll(); await sleep(200);
        if (getComputedStyle(sel, '::before').content !== 'none' || getComputedStyle(sel, '::after').content !== 'none') throw new Error('with nothing selected the corner lines are still drawn — an empty frame left hanging in the row');
      }, 1280);
    } finally {
      FM.scene = saved; FM.scene.selectedId = savedSel;
      try { FM.refreshAll(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
      await sleep(60);
    }
  });
```

Why it fails on HEAD: `#t-sel.has-sel` computes `background-color: rgba(255, 255, 255, 0.043)` → alpha 0.043 > 0.02 →
"the group still has a background". (Measured through the identical assertion in `probe.js`.)
Runs in both suite passes: `atWideWidth(…, 1280)` forces a desktop frame in the 380px pass too, like #801's test.

---

## 7. Existing tests — which break, and exactly how to retune them

`grep -n "t-sel" tests/tests.js` finds 20 lines: 18 in 7 tests, plus 2 false hits inside the word "paint-select" (`:64848`, `:83116`) (+ `has-sel` / `del.parentElement` in the #516 test).
**Four assert the old fill/outline and must be retuned. Three of them would NOT go red on their own if the builder had kept
a transparent 1px border** (by reading their assertions: `borderTopWidth` would still read 1px, so "has an outline" passes) — which is why §5 moves that pixel into padding: every
old "is there an outline" assertion goes honestly red, and each is retuned to assert the corners instead.

Each retune asserts the corners, so each one also FAILS on HEAD → `prove.sh` counts it as CAUGHT, not DEAD.

### 7.1 `'PC: the layer actions sit on the right of the transport row, in one pill you can see'` (item 425, `tests/tests.js:12095`) — BREAKS, RENAME

New name: `'PC: the layer actions sit on the right of the transport row, as one group you can see'`.
Replace the block from `    /* 3. The background is a REAL recess.` down to and including
`      throw new Error('the group has neither a strong fill (alpha ' + a + ') nor an outline - "too subtle" was the complaint, and it would be again');`
with:

```js
    /* 3. …and it READS AS ONE GROUP. "Too subtle" (queue 425) has outlived every way this group has been drawn: a white wash
          (v7.89), a black recess (#251 / #425), an outline (#516, v12.46), and since queue 959 two corner lines that fade —
          top-right and bottom-left, his drawing of 26 Sep: "instead of it having like a background and a line all the way
          around it, it should have two like corner lines". So the assertion is the one that survives all of them: the group
          paints something you can SEE, at its corners. The exact look is queue 959's own test. */
    sel.classList.add('has-sel');
    const aOf = c => { const n = (String(c).match(/[\d.]+/g) || []).map(Number); return n.length > 3 ? n[3] : (n.length === 3 ? 1 : 0); };
    const tr = getComputedStyle(sel, '::before'), bl = getComputedStyle(sel, '::after');
    if (tr.content === 'none' || aOf(tr.borderTopColor) < 0.3 || bl.content === 'none' || aOf(bl.borderBottomColor) < 0.3)
      throw new Error('the group has no visible corner lines (top-right ' + tr.content + ' ' + tr.borderTopColor + ', bottom-left ' + bl.content + ' ' + bl.borderBottomColor + ') — it no longer reads as one group, and "too subtle" was the complaint');
```
Clauses 1, 2 and 4 (right-hand side, copy stays left, teardown round trip) are untouched.

### 7.2 `'PC: a selected layer gets a three-dot menu, and it is the FULL clip menu'` (item pc-layer-more, `tests/tests.js:16988`) — BREAKS, name stays

Replace:
```js
      const bg = getComputedStyle(selW).backgroundColor;
      if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') throw new Error('the selection trio has no ground of its own — it reads the same as the project controls beside it');
```
with:
```js
      /* queue 959: the trio's "own ground" is two fading corner lines now, not a fill — his drawing, 26 Sep ("instead of it
         having like a background and a line all the way around it … two like corner lines"). What this protects is the same:
         the trio reads differently from the project controls beside it. */
      const trC = getComputedStyle(selW, '::before');
      if (trC.content === 'none' || !((parseFloat(trC.borderTopWidth) || 0) >= 1)) throw new Error('the selection trio has no mark of its own (no corner lines) — it reads the same as the project controls beside it');
```
The "empty pill with nothing selected" check above it (`selEmpty … width > 1`) still holds (measured 0 × 0) — leave it.

### 7.3 `'the selection button group is an outlined container, and the bin is calm at rest (queue 516)'` (item 516, `tests/tests.js:51071`) — BREAKS, RENAME

New name: `'the selection button group is no dark slab, and the bin is calm at rest (queue 516)'`.
Replace:
```js
      if (parseFloat(cs.borderTopWidth) < 0.5)
        throw new Error('the selection group has no outline (' + cs.borderTopWidth + ') — the outline IS the treatment he chose');
```
with:
```js
      /* ⚠️ queue 959 (26 Sep) — THE OUTLINE IS GONE, BY HIM: "instead of it having like a background and a line all the way
         around it, it should have two like corner lines … the top right to the bottom left … that like fade out". The half of
         #516 that survives is the one above — no dark slab. The corners do the outline's job now. */
      const trc = getComputedStyle(slab, '::before'), blc = getComputedStyle(slab, '::after');
      if (trc.content === 'none' || blc.content === 'none' || !((parseFloat(trc.borderTopWidth) || 0) >= 1) || !((parseFloat(blc.borderBottomWidth) || 0) >= 1))
        throw new Error('the selection group has no corner lines (top-right ' + trc.content + ' ' + trc.borderTopWidth + ', bottom-left ' + blc.content + ' ' + blc.borderBottomWidth + ') — the corners ARE the treatment he chose (queue 959)');
```
The bin half (calm at rest, red on hover) is untouched.

### 7.4 `'the selection cluster recesses rather than glowing, and its glyphs are centred'` (item sel-ground, `tests/tests.js:56278`) — BREAKS, RENAME

New name: `'the selection cluster reads as one group by its corner lines, and its glyphs are centred'`.
Replace:
```js
      const edge = parseFloat(getComputedStyle(sel).borderTopWidth) || 0;
      if (a <= 0.02 && edge < 0.5) {
        throw new Error('the cluster has neither a wash nor an outline — it no longer reads as one group, which is what "the background they have is too subtle" was about');
      }
```
with:
```js
      /* ⚠️ queue 959 (26 Sep) — NEITHER A WASH NOR AN OUTLINE, BY HIM: "instead of it having like a background and a line
         all the way around it, it should have two like corner lines … the top right to the bottom left". What this protects
         is unchanged — the cluster still reads as ONE group — and the corners carry that now. */
      const trc = getComputedStyle(sel, '::before'), blc = getComputedStyle(sel, '::after');
      const lit = c => { const n = (String(c).match(/[\d.]+/g) || []).map(Number); return (n.length > 3 ? n[3] : (n.length === 3 ? 1 : 0)) >= 0.3; };   // 'transparent' has no numbers → not lit
      if (trc.content === 'none' || blc.content === 'none' || !lit(trc.borderTopColor) || !lit(blc.borderBottomColor)) {
        throw new Error('the cluster has no corner lines (top-right ' + trc.content + ' ' + trc.borderTopColor + ', bottom-left ' + blc.content + ' ' + blc.borderBottomColor + ') — it no longer reads as one group, which is what "the background they have is too subtle" was about');
      }
```
The glyph-centring half and "the pill must not be taller than the buttons" (36 − 34 = 2, limit 2) are untouched and still hold.

### 7.5 Tests that mention `t-sel` and stay green (no edit)

- `'layout: Studio re-places the same panels, and never touches the phone'` (`:304`) — DOM order of the buttons only.
- `'801: in the PC layout the far-right run never covers the selected layer toolbar, at 900 and at 760, and stays one row at 1280'` (`:43684`) — one selected layer; `elementFromPoint` on the bin still hits the bin (measured, all variants); geometry unchanged.
- `'the darkened bin group is vertically centred on the transport row (queue 278)'` (`:55612`) — the box is still 126 × 36 with 2px above and 2px below (measured). (Its name says "darkened" and has been stale since v12.46; leave it — renaming a passing test is churn.)
- `'497: every element the suite reaches for actually exists'` (`:74815`) — only that `#t-sel` exists.
- `'transport row: nothing on it is bigger than the row, in EITHER desktop layout'` (`:16868`) — it measures the row's `button, .btn, .ver`, whose boxes do not change (34px); the group itself is 36 in a 40 row anyway.

### 7.6 Ship bookkeeping for the renames

Three names change, so `ship.sh`'s "no test may vanish" gate lists them as GONE. Put this in the ship.sh commit message
**and** the POLISH-LOG line:

> DROPS TEST: three tests are RENAMED, not removed — 'PC: the layer actions sit on the right of the transport row, in one pill you can see' → '…as one group you can see'; 'the selection button group is an outlined container, and the bin is calm at rest (queue 516)' → 'the selection button group is no dark slab, and the bin is calm at rest (queue 516)'; 'the selection cluster recesses rather than glowing, and its glyphs are centred' → 'the selection cluster reads as one group by its corner lines, and its glyphs are centred'. Each asserted the fill or outline he replaced; each now asserts the corners.

`tools/.test-floor`: **do not edit it.** `tools/_testfloor.sh` raises it by itself on every green run (it is 1980 today); a hand-raised
floor that the run then misses would refuse the ship. The suite gains one test; the renames do not change the count.
The POLISH-LOG line must say `queue 959` for this item (one proof owed; the new test and the four retunes all CATCH).
**Oldest-first gate:** `ship.sh` refuses to close #959 while a lower-numbered workable item is open (#958 and older were open at
review time). Take it when `tools/next.sh` hands it out, or write `JUMPED: <reason>` in each skipped entry — do not reorder silently.

---

## 8. Verification steps

Run the new test and the four retuned ones alone first (one Chrome, a minute):
```bash
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=959%20on%20PC%0Aas%20one%20group%20you%20can%20see%0AFULL%20clip%20menu%0Ano%20dark%20slab%0Areads%20as%20one%20group%20by%20its%20corner'
```
Then the same URL once more with `--width 380` (the new test forces 1280 through `atWideWidth`, so it must pass in the phone
pass too), then the usual `tools/ship.sh` (both passes).

By eye (tools/shot.py, a layer selected — the seeded project is EMPTY now, so make layers first, as `probe.js` does):
- **PC 1280 × 800 and 1440 × 900**: two corners, top-right and bottom-left, solid at the corner, fading; no fill; bin still red on hover; the group sits where it did.
- **PC 900 × 800** (the <1160 band layout, far run under the row): same look; nothing overlaps.
- **Two layers selected**: 5 buttons, corners still at the group's corners (see `corners-3-A-grows-with-group.png`).
- **Classic appearance** (Settings → Appearance → Classic): same white corners (both appearances are dark; there is no light editor theme).
- **Phone 380 × 800 and his 440 × 956**: nothing changes — measured on the prototype: `#t-sel` does not exist below 701px (`pcTransportTeardown`), no `.has-sel` anywhere, and every rule here is inside `@media (min-width: 701px)`. Re-confirm on the built code the same way (`document.getElementById('t-sel') === null` with a layer selected) and look at the phone top bar once.
- **Safari/iPad landscape** (≥ 701px is the PC layout): both `-webkit-mask-image` and `mask-image` are in the rule; `inset` needs Safari 14.1+.

---

## 9. Risks

- **Two coloured corners with 5 buttons** — at 206px the corners stay proportional (60% arms), measured and rendered; if he finds them long at 5 buttons, switch the mask radii from `%` to px (`76px 31px` = today's 3-button lengths).
- **A 1px line on a 100% PC is thinner than on his screen** (Chrome snaps 1.5px → 1px at DPR 1, measured). That is fine for A; if he says it is faint on a 100% PC, raise alpha, not width.
- **The pre-existing overlap at 1160–~1386 wide with 2+ selected** (§3) becomes no worse and no better; it is a separate finding.
- **Keep `box-sizing: border-box` on the corners** — the new test compares each corner's computed width to the group's, and
  a content-box corner is 2–3px off (1.5px borders; at DPR 1 they snap to 1px).
- **Safari's mask on a pseudo-element** is standard and prefixed here; not measured on a real Safari (no Safari in this sandbox) — the builder should look once on his iPad or Mac Safari if available.

---

## 10. Questions for Ezra

❓ASK: Corners — A (white, as you drew them), B (the app's blue), or C (short, bold brackets)? Picture: `corners-2-at-his-2x-screen.png`. **Recommended: A** — it is your drawing, and blue corners would look like a second Export button.

**What the builder does before he answers (decided, not left open):** send him `corners-2-at-his-2x-screen.png` with the
ASK first (SendUserFile; clause 5 / #545 is satisfied by him SEEING the options, not by an answer). Then build A — it is the
recommendation and it is his drawing — and record in #959 "built to the recommendation; B is one line (§5.2), C four (§5.3)".
If his answer arrives before the ship, apply §5.2 or §5.3; the tests pass for all three (measured, §3), so nothing else changes.
Do not hold the item on the answer (memory: never block on questions).

(No other question: which corners, the fade, and "no background, no outline" are all his words; the #425 copy-button
question is already asked elsewhere and this design works either way — measured with copy inside.)

---

## Review (skeptical pass, 26 Sep ~20:30, against HEAD `6eeab60a` v17.04 + the other session's uncommitted tree)

Checked and found sound: every quoted CSS / JS "Replace:" block matches the current files **exactly once**
(`styles.css` rule; the four test excerpts; the #425 start/end anchor lines); all eight JS snippets parse (JavaScriptCore);
the helpers the new test uses exist (`scene()` :25, `atWideWidth()` :70, `sleep()` :22585, `FM.toggleSelect` app.js:3499,
`FM.home.isOpen/open/close`); `?only=` takes several `%0A`-separated substrings (tests.js ~:59525) and every filter
substring hits only its intended test; no test name contains a `"`; the Export "one COLOURED mark" comment and the two
`--accent` values are real; `theme-glass.css` never touches `#t-sel`; every image exists, opens, shows what its caption
says, and is ≤1200 wide and ≤3× as tall as wide. Reasoned through: on HEAD the new test fails at the background (0.043 >
0.02) and each retune fails at `::before content: none`, so prove.sh should count all five CAUGHT; after the change all pass
for A, B or C (the planner's in-page measurements).

Changed in this file:
1. **`NNN` → `959`** everywhere — the item has been drained into REQUESTS.md as #959.
2. **Line numbers corrected** for the drift since the draft: app.js 7597 / 7613 / 7614 / 7679-7680; styles.css 7725 / 7921 /
   7934 / 7935 / 7950 / 7961-7966; tests.js 51071 / 56278 / 43684 / 55612 / 74815. Added a drift note: anchor on text.
3. **Cache-buster:** the tree is at `styles.css?v=727` now, not 725 → the plan now says bump whatever is there by one
   (727 → 728 today) instead of naming 726.
4. **`tools/.test-floor`: "+1" was wrong** — `_testfloor.sh` raises it itself on a green run; now says do not edit it.
5. **"19 lines in 7 tests" → 18 in 7 tests + 2 false hits** in the word "paint-select".
6. **Clause 5 added** (#545, rendered and shown before shipping), matching REQUESTS.md #959's own clause list.
7. **The ASK no longer leaves the builder to decide what to do meanwhile:** send the picture first, build A, swap on his answer.
8. **`v17.xx`** in the CSS comment is defined (the shipping version, same as POLISH-LOG).
9. **Oldest-first gate** noted: ship.sh will refuse #959 while #958 and older are workable unless JUMPED is written.
10. **§7.4 `lit()`** treated a literal `transparent` as lit (no numbers → alpha 1); fixed to read it as unlit.
11. §8: added a second filtered run with `--width 380`.

Still unmeasured (unchanged by this review): the async half of the new test and the four retunes in the real runner
(prove.sh is that measurement); real Safari/iPad mask rendering; his DPR-2 1440×900 screen (inferred from one screenshot);
the ~1386px end of the pre-existing overlap (two-point estimate). The pixel measurements were taken at v17.03 and not re-run
at v17.04; the rule they depend on is byte-identical.
