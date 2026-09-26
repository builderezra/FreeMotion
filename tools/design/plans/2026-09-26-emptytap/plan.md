# Plan: the empty project's add area (outline + press animation)

**Source:** REQUESTS.md **#964** ("Empty project, phone: tapping the big add area is glitchy…", 26 Sep ~20:29 AWST,
drained from INBOX.md and marked PLAN PENDING). Every code comment, test name and `item: '964'` below already
carries that number (the review replaced the old `NNN` placeholder).

**Written by:** the planning chat, 26 Sep, against v17.04 (`6eeab60a`); line numbers re-checked, and the tests re-run, at v17.05 (`acae12a5`). Nothing in the repo was edited.
Every number below was measured with `tools/shot.py` unless it says **(unmeasured)**. The prototypes were injected at
runtime.

---

## 0. The short version (for the builder)

1. **Two root causes, both measured.**
   - **The missing top edge.** The outline is an *inset box-shadow on `#timeline`*. `#tl-rulerrow` sits inside
     `#timeline` (first child of `#tl-inner`): sticky, 22px tall, `z-index: 7`, opaque `rgb(10,20,26)`. A positioned
     descendant paints over its ancestor's background, and an inset shadow is part of that background. So the top 22px of the box, including its whole
     top line, sits under the ruler.
   - **It gets stuck.** The box is a *state* (`:hover` / `:focus-within`), not an event. The tap focuses the row
     (tabIndex 0), and focus stays on the row through `openAdd()` and `closeAdd()`. So after the menu closes, the
     box is still painted.
2. **The fix turns the outline into an event.** On pointerdown, two lights race from the bottom-centre up both sides
   and meet at the top-centre. A drawn trail follows each light and then fades. The whole thing is gone 1.1 s after
   the press.
   - It is an SVG in `#timeline-panel`, sized to the visible area (from the ruler's bottom to the bottom of
     `#timeline`), with `z-index: 8`, which is above the ruler.
   - The `:hover` / `:focus-within` box is deleted.
   - A real ring still shows for keyboard focus, but only on `:focus-visible`.
3. **A new whole-area colour press replaces #571's 104px burst.** It is drawn in the same layer. Three options were
   rendered; **A "Aurora" is recommended**. It is composited transform/opacity only, it fills the whole area by
   150 ms, and its colour depends on where you tapped.
4. **The #616 row-sized pulse is switched off on the empty screen only.** It was the *second* box, the one whose
   lines light all at once. The slim row keeps it.
5. **Optional: hold the menu for a beat (ASK 2).** Today the add sheet covers 59% of the area 50 ms after the
   finger lifts and 98% at 100 ms (measured), so any press animation is seen for roughly 150 ms. The recommendation is to open the menu 300 ms after the
   press. On a quick tap that adds about 200 ms.
   - ⚠️ **Review finding: the hold alone still hides the top of the lap.** With the 620 ms lap the lights reach the
     top corners at ~280 ms and meet at 620 ms, but the sheet (starting at 300 ms) covers the area's top line by
     ~400 ms. So he would see the lights run up the sides and part of the top, and never see them meet. That is
     very close to the "doesn't go around the top" he reported. ASK 2 now pairs the hold with a quicker **360 ms**
     lap, so the lights meet at the top just before the sheet reaches it (`sheet-6b-fastlap.png`, rendered by the
     review with the same harness).
6. **Tests.** Six new tests, all run here in a stand-in. All six fail on HEAD and pass against the planned code
   (§7). Two existing tests need retuning (§7.3).
7. **#545 applies.** Send him `sheet-1-now.png`, then `sheet-0-pick.png` with the three option strips, then
   `sheet-6-menu.png` and `sheet-6b-fastlap.png` for ASK 2, and wait for his picks before shipping the colour or the
   lap speed. The outline fix (clauses 1, 2, 5, 6) is not a taste call. It can be
   built first, while the pick is pending, if the builder wants to split the release.

---

## 1. His words, verbatim (dictated; transcription fixes in [brackets])

> "When tapping on this menu and stuff it's very glitchy like the blue bar that's supposed to go around. The edges
> doesn't fully go around the edges at the top and also it just stays there get safe stock [gets stuck] and it
> doesn't look very good and also the animation you made for like when you tap on the screen looks really shitty.
> Like you could do way better better than that like cops [cook up a] way better animation that like actually play
> in that hole [whole] like that little touch pad area in the bottom bottom when you tap on it something a lot more
> colourful and actually put a lot of work into it and I'm not just a small little touch thing like I actually cook
> up the whole area and then also make sure that like the blue lines in the outside actually look good and actually
> go away like they actually pulse when you type of it [tap on it] don't just say that [stay there] and they pulse
> all the way around it not just like all the lines appear at once"

His screenshot: `tools/design/2026-09-26-empty-timeline-tap.png`. It is phone class 440x956, v17.02, an empty
project, and it is the *resting* state: no outline is visible in it (sampled, x=0 is `rgb(19,36,40)`).

Clauses. Tick them one at a time; the entry is not DONE until all six are ticked:
- [ ] **1.** The blue outline that should go around the area does not reach the TOP edge.
- [ ] **2.** It stays there (gets stuck) and does not look good.
- [ ] **3.** The tap animation (#571's colourful press) looks bad. Make a far better one.
- [ ] **4.** It should play across the WHOLE touch-pad area at the bottom: much more colourful, with real work put
  in, not a small touch effect.
- [ ] **5.** The blue lines around the outside must look good and GO AWAY.
- [ ] **6.** When tapped they PULSE, travelling all the way round the edge, not with all the lines appearing at once.

---

## 2. What exists today (v17.05; line numbers drift, so the quotes are the anchor)

| What | Where | Quoted |
|---|---|---|
| The stuck box (#600) | `styles.css` 8361–8364 | `#timeline-panel.tl-empty-start #timeline:focus-within, #timeline-panel.tl-empty-start #timeline:hover { box-shadow: inset 0 0 0 1px rgba(150, 232, 255, .8), inset 0 0 14px rgba(90, 199, 237, .30); }` |
| The row neutraliser (keep) | `styles.css` 8356–8360 | `#timeline-panel.tl-empty-start .tl-addrow:hover, … .tl-addrow:focus-visible { border-color: transparent; box-shadow: none; }` |
| The #571 burst CSS | `styles.css` 8239–8295 | the comment `⚠️ THE PRESS BURST (queue 571 clause 3)` through `@media (prefers-reduced-motion: reduce) { .tl-tapburst { display: none; } }` |
| The #571 burst JS | `js/timeline.js` 2905–2938 | from `/* ---- THE COLOURFUL PRESS (queue 571 clause 3)` to `FM._tapBurst = tapBurst;` (`BURST_MS = 620`, `BURST_MAX = 6`, a 0x0 `.tl-tapburst` in `#timeline`) |
| The pointerdown hook | `js/timeline.js` 2899–2902 | `tl.addEventListener('pointerdown', (e) => { if (!tlPanel.classList.contains('tl-empty-start')) return; tapBurst(tl, e.clientX, e.clientY); });` |
| The empty-area click | `js/timeline.js` 2883–2889 | `… if (FM.mobile && FM.mobile.openAdd) FM.mobile.openAdd(); });` |
| The row's open (phone) | `js/timeline.js` 3024–3030 | `if (phone) { if (FM.mobile && FM.mobile.openAdd) FM.mobile.openAdd(); }` |
| The row's #616 pulse | `js/timeline.js` 3017–3023; `styles.css` 9325–9379 | `row.addEventListener('pointerdown', firePulse);` / `.tl-addrow-pulse { position: absolute; inset: 0; … }` |
| The row takes focus | `js/timeline.js` ~2970 | `row.tabIndex = 0;` |
| The ruler row | `styles.css` 2774 | `#tl-rulerrow { display: flex; height: 22px; position: sticky; top: 0; z-index: 7; background: var(--panel); }` (it sits inside `#timeline > #tl-inner`, index.html 595–597) |
| The empty flag | `js/timeline.js` 2859–2864 | `function isEmptyStart() { return isPhoneNow() && !FM.scene.layers.length; }` / `applyEmptyStart()` |
| The add sheet swing | `styles.css` 9476 | `#add-sheet.open { animation: fm-hinge-up 360ms cubic-bezier(.18, .85, .28, 1.02) both; … }` |
| Cache-busters | `index.html` 42 / 1066 | `styles.css?v=727`, `js/timeline.js?v=257` at v17.05. Bump whatever is there when you build. |

---

## 3. Measurements (empty project, phone emulation: touch + `hover:none`, via `tools/shot.py`)

| | 380x800 | 440x956 (+ safe-top 47, safe-bottom 34) |
|---|---|---|
| `#timeline-panel` | y 372 → 800 | y 481.4 → 956 |
| `#timeline` | y 413 → 800 (387 tall, not scrolled: scrollH = clientH) | y 522.4 → 956 |
| `#tl-rulerrow` (inside `#timeline`) | y 413 → 435, z-index 7, bg `rgb(10,20,26)` | y 522.4 → 544.4 |
| **the visible area** (ruler bottom → `#timeline` bottom) | **380 x 365** | **440 x 411.6** |
| `.tl-addrow--empty` (the 300px row) | y 436 → 736 | y 545.4 → 845.4 |
| `.tl-addrow-pulse` (#616, row-sized) | 1 → 379, y 437 → 735 | same shape |
| the + orb | 158,538 → 222,602 | 188,647 → 252,711 |

**Clause 1: the top edge, measured.**
- With the box on (row focused), `elementFromPoint` 0.5px inside `#timeline`'s top edge returned `.tl-headspace`,
  `#tl-ruler` or `.tick` at 10/30/50/70/90% of the width. That is the ruler row, not `#timeline`.
- Pixels at x=0.5: the ruler colour `(10,20,26)` from y 413 to 434, then the outline colour `(125,197,217)` from
  y 435 down. The sides start at the ruler's bottom, and there is **no top line at all**.
- The result is the same at 440 (sides from y 544.5, bottom line present).
- Picture: `m380-topleft-zoom.png`, and `sheet-1-now.png` panel 3.

**Clause 2: stuck, measured.**
- `row.focus()`: `#timeline:focus-within` is true, and computed `box-shadow` is the inset box.
- `FM.mobile.openAdd()`, then 500 ms later `activeElement` is still the row and `:focus-within` is still true.
- `FM.mobile.closeAdd()`, then 700 ms later it is **still focused and still painted**.
- The same at 440.
- `row.matches(':focus-visible')` after a script focus is `false` in this Chrome. So a script focus behaves like a
  finger, which the tests rely on.
- iOS additionally keeps `:hover` on the last tapped element. That is known platform behaviour and **(unmeasured
  here)**: script events cannot move hover state.

**Clause 6: "all the lines appear at once".**
- Two boxes answer a tap today:
  - the `#timeline` inset box, which appears whole and at once;
  - the #616 `.tl-addrow-pulse` on the 300px row. That one is a horizontal band climbing the row's box, lighting
    both sides together and then the entire top line in one go (its own comment says so).
- Neither travels around.

**The add sheet covers the area almost at once.** Measured by seeking the sheet's own `fm-hinge-up` animation:
see `sheet-6-menu.png` and the table in §4.3. The click that opens it fires on finger-lift, about 100 ms after the
press on a quick tap **(typical, unmeasured on his phone)**.

**Cost of `openAdd()`** on this Mac: 1.7–3.9 ms including layout, 4 runs. A phone is slower **(unmeasured)**. The
press animation is composited anyway (see §4.4).

---

## 4. Design

### 4.1 The outline, redesigned (clauses 1, 2, 5, 6)

**Picture:** `sheet-2-pulse.png`, with frames at 0 / 120 / 250 / 400 / 560 / 700 / 900 / 1100 ms.

**Motion:**
- On pointerdown, two lights leave the **bottom-centre**, run along the bottom to the corners, race up both sides,
  and meet at the **top-centre** at 620 ms, where one soft flash blooms.
- Each light is a white core (2.4px, 40px long) inside two cyan glows (5px and 10px).
- A 1.6px trail with a 6px soft glow is drawn on behind each light, in a cyan → light-blue → lilac gradient from
  bottom to top. Once the lights meet, the trail fades out, and the whole layer is removed at 1250 ms.

**Why it looks like this:**
- It answers both of his briefs. #616 asked for *"pulse from the bottom to the top and actually go across the top
  line"*. Today he asked for *"all the way around … not all the lines appear at once"*.
- The top line is guaranteed because the layer sits **above** the ruler row and its box starts at the ruler's
  bottom edge.

**How it is built:** an SVG overlay with two `<path>`s, one per half. Each path runs bottom-centre → corner → side →
corner → top-centre. The motion is `stroke-dashoffset` driven by the Web Animations API, with lengths from
`getTotalLength()`. Why this and not a rotating conic-gradient border:
- **Constant speed on the real perimeter.** A conic maps *angle*, so on a 380x365 box it slows along the long sides
  and snaps across the corners. The #616 comment already rejected it for that reason.
- **No layout shift.** The overlay is absolutely positioned in `#timeline-panel` with `pointer-events: none`. It is
  outside the scroller, so the timeline's `scrollLeft` cannot move it (the 104px burst could be displaced that way).
- **Cost.** 10 thin paths for 1.1 s, then the layer is removed. iOS repaints only the overlay's layer. There is no
  permanent `will-change`, which #609 warns against.
- **Engine safety.** Px lengths from `getTotalLength()` are used instead of `pathLength`, which older WebKit ignored
  for dashes. The SVG is attached before it is measured.

**iPhone corners:**
- With a bottom safe area, the bottom edge is lifted by `0.6 x safe-bottom` (20px at 34) and uses 34px corner radii,
  so its corners clear the phone's rounded screen corners. The 34px radius is from geometry, not measured on a
  device.
- Without a safe area, all four radii are 14px and the edges are inset 4px.
- `sheet-7-440.png` shows the 440x956 / safe-bottom-34 render.

**Keyboard:** a static 2px ring with a soft glow, drawn only while the row has `:focus-visible`. A tap never
matches `:focus-visible`, so it never shows for a finger.

### 4.2 The press, three options (clauses 3, 4)

All three keep #571's two ideas:
- the colour **comes from the finger**;
- the **colour depends on where** (the hue formula is unchanged: `x·300 + y·60`).

All three also:
- fill the whole visible area;
- last 950–1000 ms;
- are capped at 3 live layers;
- are torn down by `setTimeout`;
- give way to a **short still fade under reduced motion** (260 ms tint plus still outline, no travel, no growth).

The pictures show a tap on the +, which is the common case, at 380px.

| | Option | What you see | Build | Pictures |
|---|---|---|---|---|
| **A** | **Aurora (recommended)** | Six soft colour curtains burst out of the finger and spread across the whole area over a wash of the same palette, with a white-hot flash at the fingertip. At its fullest by ~150 ms, gone by ~950. | 8 elements, **transform + opacity only**, `mix-blend-mode: screen` | `sheet-3-A.png`, `sheet-3b-A-corner.png` (tap lower-left) |
| B | Rings + sparks | A tinted flash, then three thick glowing colour rings chase each other out to the corners while ~30 sparks fly outward. | 34 elements, transform + opacity | `sheet-4-B.png` |
| C | Key ripple | The area becomes a keyboard. Rounded keys, each coloured by its own position (#571's analogy taken literally), light in a wave from the finger and fade behind it. | **one canvas** redrawn per frame (main thread), DPR capped at 2 | `sheet-5-C.png` |

**Why A:**
1. **It survives the menu.** A is at full colour by 150 ms, and the sheet covers 98% of the area 100 ms after lift (§4.3).
   B's rings reach the edges at ~300 ms and C's wave at ~450 ms, so both are mostly behind the menu unless it is held.
2. **It is fully composited.** Only transform/opacity change, so it keeps running while `openAdd()` builds the menu.
   C redraws a canvas on the main thread every frame.
3. **It reads as "the whole area"**, not as a thing in the middle of it (his clause 4). B still reads as rings
   around a point.
4. **The palette matches the + orb's conic sweep**, so the press looks like the orb's colour pouring out.

C is the honest runner-up if he wants his keyboard analogy made literal. B is the most conventional.

**Memory note:**
- A's curtains are about 146 x 548 CSS px at scale ≤ 1.15. At DPR 3 that is roughly 3 MB each, about 20 MB for the
  whole layer, for under a second.
- C's canvas is capped at DPR 2: 760 x 730 x 4 bytes, about 2.2 MB.
- These are arithmetic, **not measured on a device**.

### 4.3 The menu covers the press, so hold it a beat (ASK 2)

Measured by seeking `#add-sheet`'s `fm-hinge-up` animation at 380x800. `covered` is the share of the area under the
sheet's box; the sheet's opacity at that moment is listed beside it:

| ms after the sheet starts | 0 | 25 | 50 | 75 | 100 | 150 |
|---|---|---|---|---|---|---|
| sheet top (css px; the area is y 435–800) | 1072 | 764 | 585 | 492 | 443 | 399 |
| sheet opacity | 0 | .50 | .77 | .89 | .95 | 1 |
| **area covered** | 0% | 10% | **59%** | 84% | **98%** | 100% |

("Covered" is the sheet's projected bounding box over the area, so it slightly overstates coverage while the hinge is
still tilted. The opacity is shown beside it for that reason.)

**Consequences:**
- Today the menu starts on click (finger-lift). On a quick tap (about 100 ms) he sees about 150 ms of *any* press
  animation before the menu is over it. `sheet-6-menu.png`, top half, shows this.
- **Recommendation:** hold the menu until **300 ms after the press**, on the empty screen only.
  - It adds about 200 ms on a quick tap and nothing on a slow press.
  - A keyboard Enter or a script `.click()` (no press) is never delayed.
  - With the hold, the colour peaks and the lights reach the top corners before the menu swings up
    (`sheet-6-menu.png`, bottom half).
- Holding for the full 1.1 s lap would feel laggy, so it is not offered.
- **The lap has to finish before the menu covers the top (review).** The sheet's top edge reaches the area's top
  line (y ≈ 439 at 380x800) a little after 100 ms into its swing (the table above: sheet top 492 at 75 ms, 443 at
  100 ms). With a 300 ms hold that is ~400–410 ms after the press. The 620 ms lap meets at the top-centre at 620 ms, under the
  menu; its lights are about 60% of the way along the top when the menu covers it (worked from the easing curve:
  progress 0.91 of the half-path at 400 ms; `sheet-6-menu.png`, bottom row, 400 ms). A **360 ms** lap (same
  easing) reaches the top corners at ~165 ms and meets at 360 ms, while the sheet's top is still at about y 548,
  so the top pass and the meeting flash are both in view: `sheet-6b-fastlap.png` (rendered by the review:
  `rv/wQ300f.js`, which is `wQ300.js` with `TRAVEL = 360`, frames picked by stamp with `pick.py`).

### 4.4 Design details that are deliberate

- **Layer placement.** The layer lives in `#timeline-panel`, not `#timeline`. It is outside the scroller and not
  clipped by `overflow: auto`, and it stacks above the ruler row (8 > 7).
- **One lap at a time.** A second tap during a lap does not restart it, because a restart reads as a jump. Up to 3
  colour layers can overlap on quick taps.
- **The #616 row pulse is off in the empty state only.** Two changes do it: CSS `display: none`, and the row no
  longer arms it when `empty`. The slim row keeps it as approved.
- **The #600 principle still holds.** The picture and the listener are the same box by construction: both come from
  `#timeline`, and `emptyArea()` is the single source for the pulse, the colour and the keyboard ring.

---

## 5. ❓ ASKs for Ezra (send with the pictures; he answers with letters)

- ❓ASK 1 (the colour): **A (recommended)**, B or C? Pictures: `sheet-0-pick.png`, `sheet-3-A.png`,
  `sheet-4-B.png`, `sheet-5-C.png`.
- ❓ASK 2 (the menu and the lap). Pictures: `sheet-6-menu.png`, `sheet-6b-fastlap.png`.
  - **a (recommended):** the menu opens **300 ms after the press**, and the lights go round **faster (360 ms)**, so
    you see the colour AND the lights meet at the top before the menu comes up (`sheet-6b-fastlap.png`).
  - **b:** the menu opens 300 ms after the press, and the lights go round at the speed drawn in `sheet-2-pulse.png`
    (620 ms). You see the colour and the lights run up both sides, but the menu covers the top before they meet
    (`sheet-6-menu.png`, bottom half).
  - **c:** the menu opens instantly, as now. You see about 150 ms: a flash of colour, and the lights only along the
    bottom. The trip round the top (his clause 6) would then only show on taps that do not open the menu.
  - Builder: **a** → `SHEET_HOLD_MS = 300`, `FX_PULSE_TRAVEL = 360`. **b** → 300 and 620 (the code as written).
    **c** → `SHEET_HOLD_MS = 0`, 620, and delete T6. `FX_PULSE_MS` stays 1100 in all three. T2 reads
    `FM._areaFx.PULSE_TRAVEL`, so it needs no change.
- ❓ASK 3 (where the lights start): from the **bottom-middle (recommended, matches your #616 "from the bottom to the
  top")**, or from the edge nearest your finger? If he says "nearest", the change is small: start both halves at
  the perimeter point nearest the tap and split the loop there. Ask before building that variant.

Until he answers, the builder may build clauses 1, 2, 5 and 6 (the outline) with option A behind it. Per #545,
**do not ship the colour until he has picked**.

---

## 6. The exact change

### 6.1 `styles.css`

**Remove:**
1. The whole #571 burst block: from the comment `/* ⚠️ THE PRESS BURST (queue 571 clause 3).` through
   `@media (prefers-reduced-motion: reduce) { .tl-tapburst { display: none; } }`. That is 8239–8295 at v17.04 and still at v17.05 (re-checked by the review):
   `.tl-tapburst`, its `::before` / `::after`, `@keyframes tl-burst-bloom` / `tl-burst-ring`, and the reduced-motion
   rule.
   - Keep the `#timeline-panel.tl-empty-start #timeline { background: … }` rule that follows. It is the wash (#424).
2. The stuck box: the four lines
   `#timeline-panel.tl-empty-start #timeline:focus-within,` / `#timeline-panel.tl-empty-start #timeline:hover {` /
   `box-shadow: inset 0 0 0 1px rgba(150, 232, 255, .8), inset 0 0 14px rgba(90, 199, 237, .30);` / `}`.
   - **Keep** the row neutraliser just above it (`.tl-addrow:hover, .tl-addrow:focus-visible { border-color:
     transparent; box-shadow: none; }`).
   - Add one line to the #600 comment: *"964: the box is no longer a state. It is drawn on the press by `areaFx`
     (js/timeline.js) from the same `#timeline` box, so #600's 'picture = listener' still holds."*

**Add** (anywhere after the empty-state rules; next to where the burst was is natural). The file is
`prod.css` in this folder:

```css
/* ---- THE EMPTY AREA ANSWERS A PRESS (queue 964) — drawn and removed by areaFx in js/timeline.js ----------------
   Replaces #571's .tl-tapburst and #600's resting :hover/:focus-within box. These are EVENT layers: created on
   pointerdown in #timeline-panel (outside the scroller, so no scroll offset can move them), sized to the area below
   the ruler row, and removed on a timer. z-index 8 puts them over #tl-rulerrow (7), whose opaque background is what
   hid the old box's top edge. pointer-events: none throughout — feedback must never eat the tap it answers. */
.tl-areafx { position: absolute; pointer-events: none; z-index: 8; }
.tl-areafx--pulse svg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; }
/* screen: the colour ADDS light to the dark wash instead of greying it, and white stays white (the caption). */
.tl-areafx--press { overflow: hidden; contain: layout paint; mix-blend-mode: screen; }
.tl-areafx--press > div { position: absolute; left: 0; top: 0; border-radius: 50%; will-change: transform, opacity; }
.tl-areafx--press > .fx-tint { border-radius: 0; will-change: opacity; }
/* The JS picks the calm version itself; this is the second lock, as #571 had — either alone is one point of failure. */
@media (prefers-reduced-motion: reduce) {
  .tl-areafx--pulse, .tl-areafx--press { display: none; }
}
/* THE ROW-SIZED #616 PULSE IS OFF ON THE EMPTY SCREEN (clause 6). There the row is a 300px box mid-area, and its
   band lights both sides and the whole top at once — the second, wrong-sized box. The area pulse replaces it; the
   slim row (a project with layers) keeps #616 exactly as approved. timeline.js also stops arming it there. */
#timeline-panel.tl-empty-start .tl-addrow-pulse { display: none; }
/* KEYBOARD ONLY: a real ring while the row has :focus-visible — never on a tap (a finger focus does not match
   :focus-visible). Same box as the pulse: --tl-area-top is the ruler row's bottom, published by applyEmptyStart. */
#timeline-panel.tl-empty-start:has(.tl-addrow:focus-visible)::after {
  content: ""; position: absolute; pointer-events: none; z-index: 8;
  left: 4px; right: 4px; bottom: 4px; top: calc(var(--tl-area-top, 0px) + 4px);
  border-radius: 14px;
  box-shadow: 0 0 0 2px rgba(150, 232, 255, .9), 0 0 16px rgba(90, 199, 237, .45);
}
```

### 6.2 `js/timeline.js`

**(a) Replace** the whole #571 press block. It starts at `/* ---- THE COLOURFUL PRESS (queue 571 clause 3)` and
ends at `FM._tapBurst = tapBurst;` inclusive (2905–2938). **Keep** the next line,
`FM._isEmptyStart = isEmptyStart;`. The replacement is the file `prod-areafx.js`, verbatim:

```js
  /* ---- THE EMPTY AREA ANSWERS A PRESS (queue 964 — replaces #571's small burst and #600's resting box) ----
   * Ezra, 26 Sep, on the empty project: *"the blue bar that's supposed to go around. The edges doesn't fully go
   * around the edges at the top and also it just stays there [gets stuck]"* … *"the animation you made for like
   * when you tap on the screen looks really shitty"* … *"actually play in that whole … touch pad area … something
   * a lot more colourful"* … *"make sure that like the blue lines in the outside actually look good and actually go
   * away like they actually pulse when you tap on it … and they pulse all the way around it not just like all the
   * lines appear at once"*.
   * MEASURED at 380x800 and 440x956 before this was written (plan: tools/design/plans/2026-09-26-emptytap/plan.md):
   *   - THE TOP WAS MISSING because the old box was an inset box-shadow on #timeline, and #tl-rulerrow (22px,
   *     sticky, z-index 7, opaque rgb(10,20,26)) sits inside #timeline (first child of #tl-inner) — a descendant paints over its
   *     parent's background, and an inset shadow IS background. elementFromPoint along #timeline's top edge
   *     returned .tl-headspace / #tl-ruler at every sample; the sides started at the ruler's bottom (y 435).
   *   - IT STUCK because it was a STATE (:hover / :focus-within), not an event. The row is tabIndex 0, so a tap
   *     focuses it; measured: focus stays on the row through openAdd() AND closeAdd(), so :focus-within is still
   *     true and the box is still painted when the menu goes away. iOS keeps :hover after a tap as well.
   * So the outline is now an EVENT: drawn on pointerdown, travelling, and removed — nothing about it is a state
   * that can be left on. It lives in #timeline-panel, OUTSIDE the scroller, above the ruler row (z-index 8), and
   * its box is measured from the ruler's bottom to #timeline's bottom: the area you can actually see.
   * ⚠️ TEARDOWN IS A setTimeout, NOT animationend/finish — kept from #571: animations do not advance in a
   * backgrounded tab, and a node waiting for them would live for as long as the app does.
   * ⚠️ ONLY transform AND opacity ARE ANIMATED on the colour layer (plus stroke-dashoffset on a few SVG paths), so
   * the press keeps running on the compositor while openAdd() builds the menu on the main thread. */
  const FX_PULSE_TRAVEL = 620;   // bottom-centre → up both sides → meet at the top
  const FX_PULSE_MS = 1100;      // …then the trail fades out
  const FX_PRESS_MS = 950;
  const FX_CALM_MS = 260;        // reduced motion: one short fade, no travel, no growth
  const FX_MAX = 3;              // live colour layers; a drum-roll of taps cannot pile up nodes
  const SVGNS = 'http://www.w3.org/2000/svg';
  let fxSafeBottom = null;
  let fxSeq = 0;
  function fxReduced() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; }
  }
  /* env(safe-area-inset-bottom) as a number: the pulse's bottom corners must clear the iPhone's rounded screen
     corners, which a desktop never has. Read once — it does not change while the app runs in one orientation. */
  function fxSafeBottomPx() {
    if (fxSafeBottom !== null) return fxSafeBottom;
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)';
    document.body.appendChild(p);
    fxSafeBottom = parseFloat(getComputedStyle(p).paddingBottom) || 0;
    p.remove();
    return fxSafeBottom;
  }
  /* THE AREA — what he calls the touch pad: #timeline's box below the sticky ruler row. One function, used by the
     outline, the colour and the keyboard ring alike, so the three cannot disagree about where the edges are. */
  function emptyArea(tl) {
    const r = tl.getBoundingClientRect();
    const ruler = document.getElementById('tl-rulerrow');
    const top = ruler ? Math.min(r.bottom, Math.max(r.top, ruler.getBoundingClientRect().bottom)) : r.top;
    return { left: r.left, top: top, width: tl.clientWidth || r.width, height: r.bottom - top, bottom: r.bottom };
  }
  function fxHost(a, cls) {
    const panel = document.getElementById('timeline-panel');
    if (!panel) return null;
    const pr = panel.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'tl-areafx ' + cls;
    el.setAttribute('aria-hidden', 'true');
    el.style.left = (a.left - pr.left - panel.clientLeft) + 'px';
    el.style.top = (a.top - pr.top - panel.clientTop) + 'px';
    el.style.width = a.width + 'px';
    el.style.height = a.height + 'px';
    panel.appendChild(el);
    return el;
  }
  function fxTeardown(el, ms) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, ms); }
  // #571's keyboard, kept: every spot has its own colour and the same spot always answers the same way.
  function fxHue(a, x, y) { return Math.round(((x - a.left) / a.width) * 300 + ((y - a.top) / a.height) * 60) % 360; }

  /* ---- THE OUTLINE: two lights race from the bottom-centre up BOTH sides and meet at the top-centre ----
     His two briefs in one shape: #616 *"pulse from the bottom to the top and actually go across the top line"*, and
     now *"all the way around it not just like all the lines appear at once"*. Each half is its own <path> (bottom-
     centre → corner → side → corner → top-centre), so both lights cover the same distance and meet exactly at the
     top. A drawn-on trail follows each head and fades once they meet — the lines GO AWAY (his clause 5).
     SVG dashes, not a conic gradient: a conic maps ANGLE, and on a 380x365 box it would crawl and then snap across
     the corners (the #616 note makes the same argument for the slim row). A dash moves at constant speed along the
     real perimeter at any aspect ratio. Lengths come from getTotalLength() in px — not `pathLength`, which older
     WebKit ignored for dashes. */
  function areaPulse(a) {
    const host = fxHost(a, 'tl-areafx--pulse');
    if (!host) return null;
    const W = a.width, H = a.height, sb = fxSafeBottomPx();
    const IN = 4, x0 = IN, x1 = W - IN, T = IN, B = H - Math.max(IN, Math.round(sb * 0.6));
    const rt = 14, rb = sb > 0 ? 34 : 14, cx = W / 2;   // big bottom corners clear the phone's rounded screen
    const half = function (s) {   // s = -1 left, +1 right
      const xe = s < 0 ? x0 : x1, sw = s < 0 ? 1 : 0;
      return 'M' + cx + ',' + B + ' L' + (xe - s * rb) + ',' + B + ' A' + rb + ',' + rb + ' 0 0 ' + sw + ' ' + xe + ',' + (B - rb) +
        ' L' + xe + ',' + (T + rt) + ' A' + rt + ',' + rt + ' 0 0 ' + sw + ' ' + (xe - s * rt) + ',' + T + ' L' + cx + ',' + T;
    };
    const id = 'fxp' + (++fxSeq);
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    // numbers and constants only — nothing user-supplied reaches this markup
    svg.innerHTML = '<defs><linearGradient id="' + id + 't" x1="0" y1="' + B + '" x2="0" y2="' + T + '" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" stop-color="#5ac7ed"/><stop offset=".55" stop-color="#96e8ff"/><stop offset="1" stop-color="#c9b8ff"/></linearGradient>' +
      '<radialGradient id="' + id + 'm"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#b9f1ff" stop-opacity=".8"/>' +
      '<stop offset="1" stop-color="#96e8ff" stop-opacity="0"/></radialGradient></defs>';
    host.appendChild(svg);   // attached BEFORE getTotalLength — detached paths measure 0 in some engines
    const ease = 'cubic-bezier(.33,0,.2,1)';
    const travelEnd = FX_PULSE_TRAVEL / FX_PULSE_MS;
    [-1, 1].forEach(function (s) {
      const mk = function (cls, stroke, w, op) {
        const p = document.createElementNS(SVGNS, 'path');
        p.setAttribute('class', cls); p.setAttribute('d', half(s)); p.setAttribute('fill', 'none');
        p.setAttribute('stroke', stroke); p.setAttribute('stroke-width', w); p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('stroke-opacity', op);
        svg.appendChild(p);
        return p;
      };
      const trails = [mk('fx-trail', 'url(#' + id + 't)', 6, 0.22), mk('fx-trail', 'url(#' + id + 't)', 1.6, 1)];
      const heads = [[mk('fx-head', '#5ac7ed', 10, 0.22), 110], [mk('fx-head', '#96e8ff', 5, 0.45), 70], [mk('fx-head fx-core', '#f2fdff', 2.4, 1), 40]];
      const L = trails[1].getTotalLength();
      trails.forEach(function (tp) {
        tp.style.strokeDasharray = L + ' ' + L;
        tp.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: FX_PULSE_TRAVEL, easing: ease, fill: 'forwards' });
        tp.animate([{ opacity: 0.95 }, { opacity: 0.95, offset: travelEnd }, { opacity: 0 }], { duration: FX_PULSE_MS, fill: 'forwards' });
      });
      heads.forEach(function (hd) {
        const p = hd[0], len = hd[1];
        p.style.strokeDasharray = len + ' ' + (L * 2);
        p.animate([{ strokeDashoffset: len }, { strokeDashoffset: len - L }], { duration: FX_PULSE_TRAVEL, easing: ease, fill: 'forwards' });
        p.animate([{ opacity: 0 }, { opacity: 1, offset: 0.06 }, { opacity: 1, offset: (FX_PULSE_TRAVEL - 40) / FX_PULSE_MS },
          { opacity: 0, offset: (FX_PULSE_TRAVEL + 140) / FX_PULSE_MS }, { opacity: 0 }], { duration: FX_PULSE_MS, fill: 'forwards' });
      });
    });
    // where they meet: one soft flash at the top-centre, then nothing
    const meet = document.createElementNS(SVGNS, 'circle');
    meet.setAttribute('class', 'fx-meet'); meet.setAttribute('cx', cx); meet.setAttribute('cy', T); meet.setAttribute('r', 30);
    meet.setAttribute('fill', 'url(#' + id + 'm)');
    meet.style.transformBox = 'view-box'; meet.style.transformOrigin = cx + 'px ' + T + 'px';
    svg.appendChild(meet);
    meet.animate([{ opacity: 0, transform: 'scale(.2)' }, { opacity: 0, transform: 'scale(.2)', offset: (FX_PULSE_TRAVEL - 60) / FX_PULSE_MS },
      { opacity: 1, transform: 'scale(1)', offset: (FX_PULSE_TRAVEL + 60) / FX_PULSE_MS }, { opacity: 0, transform: 'scale(1.6)' }],
      { duration: FX_PULSE_MS, fill: 'forwards' });
    fxTeardown(host, FX_PULSE_MS + 150);
    return host;
  }

  /* ---- THE COLOUR — OPTION A, "AURORA" (his pick: ❓ see the plan; B and C are in its appendix) ----
     Six soft colour curtains leave the finger and spread to fill the WHOLE area (clause 4: *"not just a small little
     touch thing … cook up the whole area"*), over a tint of the same palette, with a white-hot flash where he
     touched. The palette starts at the hue of the spot he pressed (#571's keyboard). Everything is transform and
     opacity on eight elements; `mix-blend-mode: screen` on the layer makes colour ADD light to the dark wash
     instead of greying it, and leaves the white caption white. */
  function areaPress(a, x, y) {
    const host = fxHost(a, 'tl-areafx--press');
    if (!host) return null;
    const W = a.width, H = a.height, lx = x - a.left, ly = y - a.top, h = fxHue(a, x, y), N = 6;
    host.dataset.x = String(Math.round(lx)); host.dataset.y = String(Math.round(ly)); host.dataset.h = String(h);
    const add = function (cls, css) { const d = document.createElement('div'); d.className = cls; d.style.cssText = css; host.appendChild(d); return d; };
    const tint = add('fx-tint', 'width:' + W + 'px;height:' + H + 'px;background:linear-gradient(90deg,hsla(' + h + ',95%,55%,.20),hsla(' +
      (h + 80) + ',95%,55%,.16),hsla(' + (h + 160) + ',95%,55%,.20))');
    tint.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: FX_PRESS_MS, fill: 'both' });
    const CW = Math.round(W / 2.6), CH = Math.round(H * 1.5);
    for (let i = 0; i < N; i++) {
      const hh = (h + i * 42) % 360;
      const tx = W * (i + 0.5) / N, drift = (i % 2 ? 1 : -1) * 18;
      const c = add('fx-curtain', 'width:' + CW + 'px;height:' + CH + 'px;background:radial-gradient(closest-side,hsla(' + hh + ',100%,70%,.95),hsla(' +
        (hh + 18) + ',100%,60%,.55) 45%,hsla(' + (hh + 30) + ',100%,55%,0) 100%)');
      const y0 = ly - CH / 2, y1 = H / 2 - CH / 2;
      c.animate([
        { transform: 'translate(' + (lx - CW / 2) + 'px,' + y0 + 'px) scale(.12,.18)', opacity: 0 },
        { transform: 'translate(' + (tx - CW / 2) + 'px,' + y1 + 'px) scale(.85,.9)', opacity: 0.95, offset: 0.32 },
        { transform: 'translate(' + (tx - CW / 2 + drift) + 'px,' + y1 + 'px) scale(1.15,1.05) skewX(' + (drift / 3) + 'deg)', opacity: 0 }
      ], { duration: FX_PRESS_MS, delay: Math.abs(tx - lx) / W * 90, easing: 'cubic-bezier(.2,.75,.3,1)', fill: 'both' });
    }
    const core = add('fx-core', 'width:160px;height:160px;background:radial-gradient(closest-side,rgba(255,255,255,.95),hsla(' + h +
      ',100%,78%,.6) 38%,hsla(' + h + ',100%,70%,0))');
    core.animate([{ transform: 'translate(' + (lx - 80) + 'px,' + (ly - 80) + 'px) scale(.15)', opacity: 1 },
      { transform: 'translate(' + (lx - 80) + 'px,' + (ly - 80) + 'px) scale(1.4)', opacity: 0 }],
      { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
    fxTeardown(host, FX_PRESS_MS + 200);
    return host;
  }

  /* Asked the OS for less motion: the press is still ACKNOWLEDGED — a flat wash of the spot's colour and a still
     outline, faded in and out once. Nothing travels, nothing grows. (#571 showed nothing at all here.) */
  function areaCalm(a, x, y) {
    const host = fxHost(a, 'tl-areafx--calm');
    if (!host) return null;
    const h = fxHue(a, x, y);
    host.dataset.h = String(h);
    host.style.background = 'hsla(' + h + ',90%,60%,.16)';
    host.style.boxShadow = 'inset 0 0 0 1.5px rgba(150,232,255,.75)';
    host.style.borderRadius = '14px';
    host.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: FX_CALM_MS, easing: 'ease-out', fill: 'forwards' });
    fxTeardown(host, FX_CALM_MS + 120);
    return host;
  }

  /* THE ONE ENTRY POINT — the pointerdown listener in bindEmptyTap calls this, and so does the suite. */
  function areaFx(tl, clientX, clientY) {
    if (!tl) return;
    const a = emptyArea(tl);
    if (!(a.width > 0) || !(a.height > 0)) return;
    const panel = document.getElementById('timeline-panel');
    if (!panel) return;
    if (fxReduced()) {
      if (!panel.querySelector('.tl-areafx--calm')) areaCalm(a, clientX, clientY);
      return;
    }
    // one lap at a time: a second tap mid-lap does not restart it (a restart reads as a jump)
    if (!panel.querySelector('.tl-areafx--pulse')) areaPulse(a);
    if (panel.querySelectorAll('.tl-areafx--press').length < FX_MAX) areaPress(a, clientX, clientY);
  }

  /* ---- HOLD THE MENU A BEAT (❓ his pick — the plan's ASK 2; 0 restores today's timing) ----
     MEASURED at 380px (seeking the sheet's own fm-hinge-up): it covers 59% of this area 50 ms after it starts and
     98% at 100 ms, and it starts on click — the finger's LIFT, ~100 ms after the press on a quick tap. So without a
     hold he sees ~150 ms of any press animation, however good it is. The hold counts from the PRESS, not the click, so a slow press waits for
     nothing extra, a keyboard Enter (no press) is never delayed, and it applies to the EMPTY state only. */
  const SHEET_HOLD_MS = 300;
  let fxPressAt = 0;
  function afterPress(fn) {
    const wait = fxPressAt ? Math.max(0, fxPressAt + SHEET_HOLD_MS - performance.now()) : 0;
    fxPressAt = 0;   // one press buys one hold
    if (wait > 16) setTimeout(fn, wait); else fn();
  }
  FM._areaFx = { area: emptyArea, fire: areaFx, PULSE_MS: FX_PULSE_MS, PULSE_TRAVEL: FX_PULSE_TRAVEL, PRESS_MS: FX_PRESS_MS, CALM_MS: FX_CALM_MS, MAX: FX_MAX, HOLD_MS: SHEET_HOLD_MS };
```

If he picks **B** or **C**, swap `areaPress` for the one in Appendix A. Nothing else changes.

Set the two constants from his **ASK 2** answer (§5): **a** (recommended) → `SHEET_HOLD_MS = 300` and
`FX_PULSE_TRAVEL = 360`; **b** → the code as written (300 / 620); **c** → `SHEET_HOLD_MS = 0` (620) and delete the
hold test (§7.1 T6). Nothing else changes: every pulse keyframe offset is computed from these constants.

**(b) The pointerdown hook** (2899–2902). Change:
```js
    tl.addEventListener('pointerdown', (e) => {
      if (!tlPanel.classList.contains('tl-empty-start')) return;
      tapBurst(tl, e.clientX, e.clientY);
    });
```
to:
```js
    tl.addEventListener('pointerdown', (e) => {
      if (!tlPanel.classList.contains('tl-empty-start')) return;
      fxPressAt = performance.now();         // the menu hold counts from the PRESS (ASK 2)
      areaFx(tl, e.clientX, e.clientY);
    });
```
Also update the comment above it: "burst" becomes "the area's press (outline + colour)", and "queue 571 clause 3"
becomes "queue 964 (replacing #571 clause 3)".

**(c) The empty-area click** (2883–2889). Change the last line of the handler:
```js
      if (FM.mobile && FM.mobile.openAdd) FM.mobile.openAdd();
```
to:
```js
      afterPress(function () { if (FM.mobile && FM.mobile.openAdd) FM.mobile.openAdd(); });
```

**(d) The row's open** in `buildAddRow` (≈3024–3030). Change:
```js
      if (phone) { if (FM.mobile && FM.mobile.openAdd) FM.mobile.openAdd(); }
```
to:
```js
      if (phone) {
        const go = function () { if (FM.mobile && FM.mobile.openAdd) FM.mobile.openAdd(); };
        if (empty) afterPress(go); else go();   // queue 964: only the empty screen waits for its press animation
      }
```
The `empty` const is already in scope there. The keydown path calls the same `open`; with no press before it,
`afterPress` runs at once.

**(e) The #616 pulse on the empty screen** (≈3023). Change:
```js
    row.addEventListener('pointerdown', firePulse);
```
to:
```js
    // queue 964: on the empty screen the AREA pulse answers a press; this row-sized band would be a second box
    if (!empty) row.addEventListener('pointerdown', firePulse);
```
Keep creating the `pulse` element in both states. The CSS hides it in the empty state, and the 616 test still finds
it.

**(f) The keyboard ring's top.** In `applyEmptyStart()` (2860), after the `classList.toggle`:
```js
    // queue 964: the keyboard ring (styles.css, :has(.tl-addrow:focus-visible)) starts below the ruler row, like the pulse
    const tlEl = document.getElementById('timeline'), rulerEl = document.getElementById('tl-rulerrow');
    if (tlPanel && tlEl && rulerEl && isEmptyStart()) tlPanel.style.setProperty('--tl-area-top', (tlEl.offsetTop + rulerEl.offsetHeight) + 'px');
```
Measured in the stand-in: `#timeline`'s `offsetParent` is `#timeline-panel`, so `offsetTop` is in the panel's
coordinates (value in §7.2).

### 6.3 `index.html`

Bump both cache-busters by one from whatever they are when you build (ship.sh refuses otherwise):
`styles.css?v=727 → 728` and `js/timeline.js?v=257 → 258` (values at v17.05).

### 6.4 POLISH-LOG / REQUESTS

Use one line in the log, with `queue 964` for the item itself. When the older items are mentioned, write them as
`#571` / `#600` / `#616`, not as `queue …`. The ship.sh gate counts every `queue 964` in the line as a claim.

---

## 7. Tests

### 7.1 New tests

Paste `tests-proposed.js` into `tests/tests.js`. The helper `onEmptyArea964` goes above the tests; a good place is
next to the 571 tests (~5868). Every assertion carries his clause and a positive control where it asserts a negative.

| # | Name (abridged) | Fails on HEAD because | Stand-in for what a synthetic event cannot do |
|---|---|---|---|
| T1 | `964 clause 2: after a tap the empty area keeps no outline` | `#timeline` computes the inset box while the row is focused | `row.focus()` stands in for the tap's focus (control: not `:focus-visible`). iOS sticky `:hover` cannot be synthesised, so it scans every sheet for a rule that paints `.tl-empty-start … #timeline:hover/:focus-within`. Positive control: an inline box-shadow must be seen. |
| T2 | `964 clauses 1 5 6: … all the way round incl. the top, one side after another, then it is gone` | no `.tl-areafx--pulse` | Motion is **seeked**, not waited for. Paused WAAPI reports style at any `currentTime` with no rAF, which avoids the 571/616 "0 frames when not fronted" trap. It samples both lights' dash heads 25 times (edges left/right/top/bottom all reached), checks the top 40% is empty at 25% and the trail is still growing, then (positive control) that both lights meet at the top-centre. Real-time teardown check at 1.5 s. |
| T3 | `964 clauses 3 4: a press floods the WHOLE area …` | only the 104px `.tl-tapburst` exists | Coverage is geometric from live boxes: a 12x12 grid of points, each lit if inside a curtain's 80% ellipse while the curtain is ≥ 35% opaque. The best moment in the first half must reach ≥ 90%. It also checks: from the finger, hue by position, cap, teardown, and a layers-present control. |
| T4 | `964: asked for less motion …` | HEAD shows nothing under reduced motion | `window.matchMedia` is stubbed for the one press. |
| T5 | `964 clause 6: … the old row-sized pulse no longer fires …` | the #616 band arms on the empty row | Positive control: the slim row still arms #616. |
| T6 | `964: the add menu waits a beat …` (**only if ASK 2 = hold**) | the menu opens in the same tick as the click | `FM.mobile.openAdd` is stubbed. Control: a bare `.click()` is not delayed. |

**Measured here** in a stand-in (the planned CSS and JS injected at runtime; wiring differences are listed at the
top of `emulate-new.js`). Output of `verify-head.js` and `verify-new.js`:

Two runs of `tools/shot.py --width 380 --height 800` against v17.05 (`acae12a5`), 23:25 AWST. The mini-runner calls
each test body directly at the page's own 380px width, where `atPhoneWidth` is a pass-through. The real suite
narrows run.html's iframe instead.

| test | HEAD (`verify-head.js`) | planned code (`verify-new.js`) |
|---|---|---|
| T1 964 clause 2 (no resting outline) | **FAIL**: "the empty area still draws a box while the tapped row keeps focus (rgba(150, 232, 255, 0.8) 0px 0px 0px 1px inset, …)" | PASS |
| T2 964 clauses 1 5 6 (all the way round, then gone) | **FAIL**: "pressing the empty area drew no travelling outline" | PASS |
| T3 964 clauses 3 4 (whole area, from the finger) | **FAIL**: "…made no whole-area colour layer - only the old 104px .tl-tapburst…" | PASS (≥ 90% of the grid lit) |
| T4 reduced motion | **FAIL**: "…the press shows nothing at all…" | PASS |
| T5 964 clause 6 (#616 row pulse off when empty) | **FAIL**: "…still fires the row-sized #616 pulse…" | PASS |
| T6 menu hold | **FAIL**: "FM._areaFx.HOLD_MS is missing…" | PASS |
| existing `571: … a tap anywhere in it works` | PASS | PASS (the hold does not delay a click with no press) |
| existing `timeline: an empty project is one surface …` (#424) | PASS | PASS |

### 7.2 Stand-in facts used above

- `#timeline.offsetParent` is `#timeline-panel`, and `tl.offsetTop + ruler.offsetHeight` is **62** at 380x800.
  That is panel top 372 + border 1 + 62 = **435**, the area's top. So the keyboard ring's `--tl-area-top` lands on
  the same pixel as the pulse.
- `row.focus({ focusVisible: true })` does **not** produce `:focus-visible` in this Chrome (measured `false`). So
  the keyboard ring **cannot be driven by a script here**. Verify it by hand (§8 step 4). No test is written for
  it, because a test that cannot reach its state would pass against anything.
- `FM.mobile.openAdd()` costs 1.7–3.9 ms on this Mac (4 runs, including layout).
- **The planned code looks like the pictures.** `parity-compare.png` sets two frames side by side at 300 ms. On the
  left is the planned code (`prod-areafx.js` + `prod.css`), injected and driven by a real synthetic pointerdown on
  `#timeline`. On the right is the prototype frame from `sheet-3-A.png`. They match; only the + orb's own looping
  animation is at a different phase. Both layers came out at `left 0, top 62, 380 x 365` inside the panel.

### 7.3 Existing tests this breaks, and how to retune them

1. **`571 clause 3: pressing the empty timeline answers from the point you touched`** (tests.js ≈5868). It reads
   `FM._tapBurst` and `.tl-tapburst` inside `#timeline`, both of which are removed.
   - **Delete it.** Its five checks (from the finger, hue follows position, cap, teardown, a layers-present control)
     are all in T3, which says so in its name.
   - Leave a one-line comment where it was: `// 571 clause 3 moved to the 964 tests: the burst became the whole-area press`.
   - ⚠️ **ship.sh refuses a release that deletes a test unless the commit message says so** (the "NO TEST MAY VANISH"
     gate, tools/ship.sh ~565). Put this in the commit message:
     `DROPS TEST: '571 clause 3: pressing the empty timeline answers from the point you touched' — the 104px burst is gone; its five checks live in '964 clauses 3 4'.`
2. **`616: the add row has a press pulse, wired and full-width`** (≈78814). Its `check('empty')` asserts that
   pointerdown arms `.tl-addrow-pulse` on the empty row. It no longer does, by design (clause 6).
   - Retune it to call `check('slim')` only.
   - Replace the "BOTH states matter" comment with: *"The empty state's pulse is the AREA pulse now (queue 964,
     test '964 clause 6'); this holds the slim row."*
   - Keep its full-width and opacity-at-rest checks.
   - prove.sh will report it **DEAD** (it passes on HEAD too). That is expected for a narrowed test and does not
     block the release; the six 964 tests carry the proof.
3. **Checked and not affected:**
   - `571: the empty timeline draws no stray dashed bar, and a tap anywhere in it works` (≈6053). Its click has no
     press before it, so it is not held, and it waits 90 ms anyway.
   - `timeline: an empty project is one surface …` (#424, ≈12211). The wash and the row are untouched.
   - The slim-row click tests (≈45225, ≈45614). They are not the empty state.
   - `grep` for `focus-within`, `_tapBurst`, `tl-tapburst` and `tl-addrow-pulse` in tests.js found nothing else.

### 7.4 Proof (ship.sh / prove.sh)

- T1–T6 all fail against HEAD's source (measured, §7.1) and pass with the change. The POLISH-LOG line claims
  `queue 964` once.
- Mutation ideas the builder can run with `tools/mutate.sh`:
  - put the `#timeline:focus-within` rule back → T1 must catch it;
  - change the pulse's `T = IN` to `T = IN + 40`, which stops short of the top → T2 must catch it;
  - change `const CW = Math.round(W / 2.6)` to `W / 8` → T3 must catch it;
  - change `if (fxReduced())` to `if (false)` → T4 must catch it.

---

## 8. Verification (builder, after building)

1. Run `python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=964'`, then run it again
   with `--width 380`. Also run `?only=571` and `?only=616` for the retuned ones.
2. **Look at it at phone size.** Run `tools/shot.py --width 380 --height 800` and `--width 440 --height 956
   --safe-bottom 34` with the stamped-frame harness in this folder (`gen2.py` → `wP.js` etc., `pick.py` to pick the
   frames by stamp).
   - Check that the top line is visible at 250–560 ms.
   - Check that nothing is left at 1.2 s.
   - Check that the curtains cover the area at 150 ms.
   - ⚠️ `--frames` offsets drift, because each capture takes longer than the gap. **Read the stamp pixel, not the
     file name** (`pick.py`). This was measured here: unstamped frames came out one to two steps late.
3. **Stuck state.** Focus the row, open and close the sheet, then read `getComputedStyle(#timeline).boxShadow`. It
   must be `none`.
4. **Keyboard.** Tab to the row on a desktop browser at phone width (≤700px). The ring shows on `:focus-visible`,
   and not after a click.
5. **On his phone:** after the ship, confirm with `curl … | grep -o '>v[0-9.]*<'`. Nothing here can reproduce iOS
   sticky `:hover`, so the release note should ask him to tap, close the menu, and check that nothing is left.

---

## 9. Risks and notes

- **`:has()`** needs Safari 15.4+ and Chrome 105+. If it is missing, only the keyboard ring is lost; the pulse and
  the press are unaffected.
- **Safe-area read.** `fxSafeBottomPx()` reads the safe area once. After a rotation it could be stale, which only
  changes the bottom corners' radius. Acceptable.
- **Teardown.** It is `setTimeout`, not `finish` / `animationend`, as #571 explains. A backgrounded tab removes the
  layers on time.
- **`innerHTML` in `areaPulse`** carries only numbers and constants, never user data, and the comment says so.
- **Collab read-only viewers.** `openAdd()` already refuses them. The press animation still plays for them on the
  empty screen. That is harmless, and the same as #571 today.

---

## Appendix A: `areaPress` for option B or C (if he picks them)

Both have the same signature as A: `areaPress(a, x, y)` returns the host `.tl-areafx--press` with `dataset.x/y/h`
set. They are adapted from the prototypes in `fx.js` (`pressB`, `pressC`):
- replace `area()` / `host()` / `hueAt()` with `a`, `fxHost()` and `fxHue()`;
- replace `window.__fxHold` with plain `fxTeardown(host, …)`.

```js
  /* ---- OPTION B, "RINGS + SPARKS" — replaces areaPress if he picks B ---- */
  function areaPress(a, x, y) {
    const host = fxHost(a, 'tl-areafx--press');
    if (!host) return null;
    const W = a.width, H = a.height, lx = x - a.left, ly = y - a.top, h = fxHue(a, x, y);
    host.dataset.x = String(Math.round(lx)); host.dataset.y = String(Math.round(ly)); host.dataset.h = String(h);
    const far = Math.max(Math.hypot(lx, ly), Math.hypot(W - lx, ly), Math.hypot(lx, H - ly), Math.hypot(W - lx, H - ly));
    const add = function (cls, css) { const d = document.createElement('div'); d.className = cls; d.style.cssText = css; host.appendChild(d); return d; };
    const tint = add('fx-tint', 'width:' + W + 'px;height:' + H + 'px;background:radial-gradient(circle at ' + lx + 'px ' + ly + 'px,hsla(' + h +
      ',95%,62%,.30),hsla(' + (h + 60) + ',90%,58%,.14) 45%,hsla(' + (h + 120) + ',90%,58%,.06))');
    tint.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], { duration: FX_PRESS_MS, fill: 'both' });
    const R = 160;
    for (let i = 0; i < 3; i++) {
      const hh = (h + i * 55) % 360;
      const ring = add('fx-curtain fx-ring', 'width:' + (2 * R) + 'px;height:' + (2 * R) + 'px;background:radial-gradient(closest-side,hsla(' + hh +
        ',95%,62%,0) 70%,hsla(' + hh + ',95%,66%,.85) 88%,hsla(' + (hh + 20) + ',100%,85%,.95) 93%,hsla(' + hh + ',95%,62%,0) 100%)');
      ring.animate([{ transform: 'translate(' + (lx - R) + 'px,' + (ly - R) + 'px) scale(.04)', opacity: 1 }, { opacity: 0.85, offset: 0.55 },
        { transform: 'translate(' + (lx - R) + 'px,' + (ly - R) + 'px) scale(' + (far * (1 - i * 0.18) / R) + ')', opacity: 0 }],
        { duration: 720, delay: i * 110, easing: 'cubic-bezier(.2,.75,.3,1)', fill: 'both' });
    }
    const N = 30;
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2 + (i % 2) * 0.12, dist = far * (0.42 + ((i * 37) % 11) / 11 * 0.5);
      const hh = (h + i * 16) % 360, sz = 6 + (i % 4) * 3;
      const s = add('fx-spark', 'width:' + sz + 'px;height:' + sz + 'px;background:hsl(' + hh + ',100%,70%);box-shadow:0 0 ' + (sz * 1.6) + 'px hsla(' + hh + ',100%,65%,.9)');
      s.animate([{ transform: 'translate(' + (lx - sz / 2) + 'px,' + (ly - sz / 2) + 'px) scale(.4)', opacity: 1 }, { opacity: 1, offset: 0.6 },
        { transform: 'translate(' + (lx + Math.cos(ang) * dist - sz / 2) + 'px,' + (ly + Math.sin(ang) * dist - sz / 2) + 'px) scale(1)', opacity: 0 }],
        { duration: 820, delay: (i % 3) * 30, easing: 'cubic-bezier(.12,.8,.3,1)', fill: 'both' });
    }
    const core = add('fx-core', 'width:120px;height:120px;background:radial-gradient(closest-side,rgba(255,255,255,.95),hsla(' + h + ',100%,78%,.5) 40%,hsla(' + h + ',100%,70%,0))');
    core.animate([{ transform: 'translate(' + (lx - 60) + 'px,' + (ly - 60) + 'px) scale(.15)', opacity: 1 },
      { transform: 'translate(' + (lx - 60) + 'px,' + (ly - 60) + 'px) scale(1.3)', opacity: 0 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
    fxTeardown(host, FX_PRESS_MS + 200);
    return host;
  }
  /* ⚠️ T3's coverage check reads `.fx-curtain` boxes: for B the RINGS carry that class, and a ring is lit only on its
     band, not inside it — so for B, change T3's ellipse test to "inside the ring's outer 0.95 radius AND outside its
     0.65 radius" at the sampled time, OR count the tint (alpha .30 at the finger, .06 at the far edge) as lit.
     Decide by measuring, and write the chosen threshold into the test. */

  /* ---- OPTION C, "KEY RIPPLE" — replaces areaPress if he picks C. One canvas; rAF-driven. ---- */
  function areaPress(a, x, y) {
    const host = fxHost(a, 'tl-areafx--press');
    if (!host) return null;
    const W = a.width, H = a.height, lx = x - a.left, ly = y - a.top, h = fxHue(a, x, y);
    host.dataset.x = String(Math.round(lx)); host.dataset.y = String(Math.round(ly)); host.dataset.h = String(h);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas');
    cv.className = 'fx-keys'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;border-radius:0';
    host.appendChild(cv);
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const K = 34, GAP = 6, cols = Math.ceil(W / (K + GAP)) + 1, rows = Math.ceil(H / (K + GAP)) + 1;
    const ox = (W - cols * (K + GAP) + GAP) / 2, oy = (H - rows * (K + GAP) + GAP) / 2;
    const far = Math.max(Math.hypot(lx, ly), Math.hypot(W - lx, ly), Math.hypot(lx, H - ly), Math.hypot(W - lx, H - ly));
    const SPEED = far / 480;   // the wave reaches the farthest key at 480 ms
    const rr = function (x0, y0, w, hh, r) { if (g.roundRect) { g.beginPath(); g.roundRect(x0, y0, w, hh, r); } else { g.beginPath(); g.rect(x0, y0, w, hh); } };
    const draw = function (t) {
      g.clearRect(0, 0, W, H);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const kx = ox + c * (K + GAP), ky = oy + r * (K + GAP), mx = kx + K / 2, my = ky + K / 2;
        const dt = t - Math.hypot(mx - lx, my - ly) / SPEED;
        if (dt < 0) continue;
        const v = dt < 70 ? dt / 70 : Math.exp(-(dt - 70) / 170);
        if (v < 0.02) continue;
        const hue = Math.round((mx / W) * 300 + (my / H) * 60) % 360;   // each KEY has its own colour (#571)
        g.globalAlpha = v * 0.35; g.fillStyle = 'hsl(' + hue + ',100%,62%)'; rr(kx - 5, ky - 5, K + 10, K + 10, 12); g.fill();
        const kk = K * (0.82 + 0.18 * Math.min(1, dt / 90));
        g.globalAlpha = v * 0.9; g.fillStyle = 'hsl(' + hue + ',96%,' + (60 + v * 18) + '%)'; rr(mx - kk / 2, my - kk / 2, kk, kk, 8); g.fill();
      }
      const cv0 = Math.max(0, 1 - t / 260);
      if (cv0 > 0) {
        const cg = g.createRadialGradient(lx, ly, 0, lx, ly, 64);
        cg.addColorStop(0, 'rgba(255,255,255,' + (0.9 * cv0) + ')'); cg.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalAlpha = 1; g.fillStyle = cg; g.fillRect(0, 0, W, H);
      }
    };
    host._fxDraw = draw;   // seam: T3 draws a chosen moment and reads pixels (getImageData) instead of timing frames
    const t0 = performance.now();
    const tick = function () {
      if (!host.parentNode || host._fxSeeking) return;
      const t = performance.now() - t0; draw(t);
      if (t < FX_PRESS_MS) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    fxTeardown(host, FX_PRESS_MS + 200);
    return host;
  }
  /* ⚠️ For C, T3's geometry must become pixels: set host._fxSeeking = true, call host._fxDraw(t) for t in 60..480 step
     30, and count grid points whose canvas alpha (getImageData at the point x dpr) is > 40; best moment >= 90%. The
     canvas is not animated by WAAPI, so getAnimations() is empty for it — do not seek it that way. */
```

## Files in this folder

- `plan.md` (this file)
- `prod-press-BC.js`: `areaPress` for options B and C (Appendix A)
- `existing.js`: the two existing tests re-run in both stand-ins
- `parity-compare.png`: the planned code next to the prototype at 300 ms
- `prod-areafx.js`, `prod.css`: the exact code for §6
- `tests-proposed.js`: the tests for §7
- `fx.js`: the runtime prototype of the pulse and all three press options
- `gen2.py`, `pick.py`, `compose.py`: the stamped-frame harness
- `rv/wQ300f.js`, `rv/f-*.png` (review): the fast-lap render behind `sheet-6b-fastlap.png`
- `.orig/` (review): the plan, code and tests as the planner left them, before the review's edits
- `verify-head.js`, `verify-new.js`, `emulate-new.js`: the stand-in test runs
- `m1.js`, `setup.js`: the measurement probe
- Images, all ≤ 1200 px wide and ≤ 3x as tall as wide:
  - `sheet-0-pick.png`: the three options at their fullest, side by side
  - `sheet-1-now.png`: today: the box that sticks, the missing top, the small burst
  - `sheet-2-pulse.png`: the new outline, frame by frame
  - `sheet-3-A.png`, `sheet-3b-A-corner.png`, `sheet-4-B.png`, `sheet-5-C.png`: the options, frame by frame
  - `sheet-6-menu.png`: A with the menu as now, versus held to 300 ms
  - `sheet-6b-fastlap.png` (added by the review): A with the menu held to 300 ms AND a 360 ms lap, the ASK 2 recommendation
  - `sheet-7-440.png`: A plus the pulse at 440x956 with an iPhone safe area

---

## Review (26 Sep, second reader, against v17.05 `acae12a5`)

**Checked and true in the current tree** (anchored on text, not line numbers): every `styles.css` quote and line
(8239–8295 burst, 8356–8360 neutraliser, 8361–8364 stuck box, 2774 ruler, 9325–9379 #616, 9476 hinge), every
`js/timeline.js` quote and line (2859–2864, 2883–2889, 2899–2902, 2905–2939, 2970, 3017–3023, 3024–3030), the
`index.html` busters (`styles.css?v=727` line 42, `js/timeline.js?v=257` line 1066), the four tests.js anchors
(5868, 6053, 12211, 78814), and that nothing else in `js/`, `styles.css` or `index.html` references `tapBurst` /
`.tl-tapburst`, or already uses any of the new names. `prod-areafx.js` and `prod.css` are byte-identical to the
§6 blocks (still true after the edits below). Stacking was read from the CSS: `#timeline-panel`, `#timeline` and
`#tl-inner` are all `position: relative` with no z-index, transform, isolation or contain, so the ruler (7) and the
new layer (8) share one stacking context and 8 really is above. `#add-sheet` is z-index 63, so the menu still
covers the layer. `openAdd()` is safe to call twice (it does not replay the swing on an open sheet), so a double
tap under the hold cannot "open twice". All nine images open, are under 3x as tall as wide, and show what their
captions say.

**Reasoned through each test against HEAD and the plan's code:** T1 fails on the inset box and passes once the
rule is gone. T2 fails with no pulse. With the planned code the eased head is 0.32 of the way along its half-path
at a quarter of the lap, about 35 px up the side (so below the top 40%), and the trail has drawn 32% (inside
5–60%). All four edges are reached, both heads end at (W/2, 4), and the layer is removed at 1250 ms, before the
1500 ms check. T3's grid happens to sit 15.8 px from every curtain centre horizontally, so the check is lenient
across the width. The planner's `CW = W/8` mutation still drops it to about 17%, so it is caught. T4, T5 and T6
fail on HEAD for the reasons in §7.1. A caveat on T5: the CSS `display: none` alone, or the JS guard alone, makes
it pass. That is right, because each one stops the second box.

**Changed by the review:**
1. **`NNN` → `964` everywhere** (plan, `prod-areafx.js`, `prod.css`, `tests-proposed.js`). The item was already
   drained into REQUESTS.md as #964 (PLAN PENDING), so nothing is left to substitute. The header now says so.
2. **ASK 2 now pairs the hold with the lap speed** (§0 point 5, §4.3, §5, §6.2). With the plan's 300 ms hold and
   620 ms lap, the menu covers the area's top line at about 400 ms, before the lights meet at 620 ms. He would see
   them run up the sides and never meet at the top, which is nearly the complaint in clause 1 again. New
   recommendation: **a** = hold 300 plus a 360 ms lap. The review rendered it with the planner's own harness
   (`sheet-6b-fastlap.png`: the lights meet at the top at 360 ms, above the rising sheet). There is a
   constants table for a / b / c, and **c** now says plainly that clause 6 would barely be seen.
3. **Commit message must carry `DROPS TEST: …`** (§7.3). Deleting the 571 clause 3 test trips ship.sh's
   vanished-test gate otherwise. The retuned 616 test will read DEAD in prove.sh; that is expected and noted.
4. **T1 gives the frame focus first** (`window.focus()` plus a 60 ms wait before `row.focus()`). In run.html the app
   is an iframe, and Chrome matches `:focus-within` only in a focused document. Without this, T1's own control
   could fail on both sides and prove.sh would call it RED. The stand-in runs were top-level pages and did not
   exercise this. It is harmless there.
5. Wording: `#tl-rulerrow` is inside `#tl-inner`, not `#timeline`'s own first child (§0, the JS comment, and T2's
   comment). The paint-order argument is unchanged. The JS comment's plan path is now concrete
   (`tools/design/plans/2026-09-26-emptytap/plan.md`). The §6.1 line range was re-confirmed at v17.05.

**Left as it is, on purpose:**
- **Clause coverage.** 1 (top): the layer is above the ruler and starts at its bottom, tested by T2's edge and
  z checks. 2 (stuck): the state rule is deleted, and it is an event now (T1, T2 teardown). 3 and 4: option A over
  the whole area (T3, ≥ 90% of the grid). 5 (goes away): teardown, T2 and T3. 6 (travels round, including the
  top, not all at once): T2's quarter-lap check plus the meeting at the top-centre. That the top is actually
  *seen* in the tap → menu flow depends on ASK 2 (**a** or **b**), which is why ASK 2 changed.
- **A stale press.** A pointerdown that never becomes a click (a scroll, a tap on the ruler) leaves `fxPressAt`
  set. The only effect is that a click within 300 ms of it waits out the rest of those 300 ms. This is harmless,
  and it is not worth another listener.
- **The keyboard ring** is still untestable by script (§7.2) and is left to §8 step 4.
- **Still unmeasured, as the planner said:** tap-to-lift time on his phone, GPU memory, and the 34 px bottom
  radius on real hardware. The 360 ms lap was rendered in desktop Chrome with phone emulation only, like
  everything else here.
