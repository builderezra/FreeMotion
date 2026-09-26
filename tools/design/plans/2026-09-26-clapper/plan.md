# Plan — the empty project's clapperboard claps, and the phone's "Tap + below" line goes

For the BUILDER chat. Everything below was prototyped in the running app (injected at runtime through
`tools/shot.py`, no app file touched) and the proving tests were run against both the current app and the
prototype. Paste blocks are the literal text that was injected and measured (with the placeholder `NNN` where
they now say `957` — the review filled it in; nothing else in them changed).

**Queue number: #957** (already drained into REQUESTS.md — `grep -n '^- \[ \] \*\*957 ' REQUESTS.md`). ⚠️ #957 holds
TWO things: **(A)** the Home arrow's tip landing inside the + (clause 1) and **(B)** this clapper (clauses 2–4, plus
clause 5, his #545 rule that the options are shown before it ships). **This plan is (B) only.** Unless (A) ships in
the same release, the POLISH-LOG line must say **`queue 957 (partial)`** (ship.sh line ~299: a plain `queue 957`
claims the item is finished and the gate refuses while #957 is still open), and only clauses 2–4 get ticked.
The #957 entry says *"don't start building before its plan block lands (`tools/design/plans/2026-09-26-<name>/plan.md`)"*
and, if a step no longer fits the tree, *"say so here rather than improvising"* — so this file (and `img/`) should be
copied to `tools/design/plans/2026-09-26-clapper/` before building.

**Design gate (#545, his clause 5 — decided, not optional):** send him the six images in `img/` (all ≤1200 wide, none
taller than 3× width — phone-safe) with the three ❓ASKs in §9, and **do not ship until he has picked timing and line
colour**. §5 is written for the recommended pair (A + cyan) so it can be built and verified meanwhile; if he picks
differently, §5d and the end of §6 give the exact swaps. The PC-sentence ASK does not hold the build (keep it).

> **Note for the orchestrator (not the builder):** the relayed user request that triggered this workflow run
> is a different item — *"When you shrink the add layer or like the layer inspect layer inspector on PC, it
> should just lose the text when it gets too small…"*. This plan covers only the clapper item it was assigned.
> The shrink/inspector request needs its own plan.

---

## 1. His words and his clauses (verbatim, from INBOX.md, 26 Sep ~17:26 AWST)

**His words (dictated; transcription fixes in [brackets]):** "…also when you have an empty project and it's
telling you to press the plus button to add a photo a video that's actually outdated that text instead get rid
of the text and just make it make a little animation for like the film real [the clapperboard] thing where it's
like open and then it slams down with like a little effect with like some lines coming out of it to show that
it's like slap down and like clapped because it's like you know one of those film things that they click down
when it's like and go and cut so it's like you know that would be cool if you had little animation on it"

His clauses (numbering as in the inbox entry; clause 1 is the Home arrow, a separate item):

- [ ] **(2)** In an empty project the text telling you to press + is outdated — get rid of it.
- [ ] **(3)** Replace it with a little animation of the clapperboard: it starts open, then slams down.
- [ ] **(4)** The slam has a little effect — lines coming out of it — to show it was slapped down / clapped.

His screenshot: `tools/design/2026-09-26-empty-project-clapper.png` (1320×2868 = his 440×956 at 3×; the stage
shows the clapper over "Tap **+** below to add / a video or image", and the timeline's big + under it already
says "Tap here to start creating").

---

## 2. What exists now (tree at v17.03, re-checked 26 Sep ~19:30; re-checked again by the review against the working tree at v17.05 — every line number below still held except where the review corrected it; line numbers drift — anchor on the quoted text)

**`index.html:421–428` — the hint.** Three paths in one SVG, then two sentences:

```html
          <div id="drop-hint">
            <div class="dh-icon"><svg viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><!-- v5.92. … Declaration order is load-bearing, as it was for the Template icon: stripes first, bar over their ends, board last. --><path d="M7.55 7.5 7.28 5.53M12.0 6.9 11.73 4.93M16.44 6.3 16.18 4.33"/><path d="M3.2 8.9 21 6.5 20.52 2.93 2.72 5.33Z"/><path d="M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg></div>
            <div class="dh-pc">Drag a video or image here<br>or click <b>Import media</b></div>
            <!-- The phone has neither drag-and-drop nor an "Import media" button (queue 917 finding 14); what
                 it has is the big + filling the timeline right under the canvas. Swapped by styles.css at
                 the phone breakpoint — the same width everything else in the phone layout keys off. -->
            <div class="dh-phone">Tap <b>+</b> below to add<br>a video or image</div>
          </div>
```

Geometry that matters: the bar (path 2) is a closed parallelogram whose bottom edge runs (3.2, 8.9) → (21, 6.5),
so the drawn stick sits **7.68° open** (atan2(2.4, 17.8)); it is 17.96 long and 3.6 thick. The board (path 3)
spans x 3–21, y 9–20. So (3.2, 8.9) — the bar's bottom-left corner — is the natural hinge, 0.1 above the board's
top-left corner.

**`styles.css:674–689` — the layout and the phone swap:**

```css
#drop-hint {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; gap: 14px;
  align-items: center; justify-content: center;
  color: var(--text-dim); text-align: center; line-height: 1.5;
  pointer-events: none;
}
.dh-icon { font-size: 44px; opacity: .85; }
/* Two wordings, one per layout (queue 917 finding 14): a phone told to "drag" and to "click Import
   media" is being told about controls it does not have, and at 320 the PC sentence also wrapped with
   "here" alone on a line. */
#drop-hint .dh-phone { display: none; }
@media (max-width: 700px) {
  #drop-hint .dh-pc { display: none; }
  #drop-hint .dh-phone { display: block; }
}
```

**`styles.css:10544–10548` — collab read-only hides the phone line** (the element is going, so this selector goes):

```css
/* S7 review: #add-fab is display:none at EVERY width already (queue 294), so the rule above hid nothing. The
   phone's + is the timeline's add row, the ⋯ is a menu of edits (lock, flip, fit, reset, masks), the ≡ grips
   reorder layers, and the empty stage says "Tap + below" — none of it is a Viewer's or a Commenter's. */
body.collab-ro .tl-addrow, body.collab-ro .row-drag, body.collab-ro #m-more, body.collab-ro #btn-more-layer,
body.collab-ro #btn-split, body.collab-ro #vb-camera, body.collab-ro #drop-hint .dh-phone { display: none !important; }
```

**How the hint hides — `js/app.js:803–805`:**

```js
  function updateDropHint() {
    dropHint.classList.toggle('hidden', FM.scene.layers.length > 0);
  }
```

and **`styles.css:3320`**: `.hidden { display: none !important; }`. So with a layer the hint is `display:none`,
which **removes CSS animations outright** (measured: `getAnimations()` on it goes to 0 — see §3) and restarts
them from 0 when it is shown again. Nothing to add for that case.

**Home does NOT hide it.** The editor stays in the DOM under Home; `js/home.js:2967`
`document.body.classList.add('home-open');` / `:2979` `document.body.classList.remove('home-open');`. The
precedent for stopping an animation nobody can see is `styles.css:4984–4985`:
`body:not(.home-open) #hm-grain::before, body:not(.home-open) #hm-grain::after { animation-play-state: paused; }`.
This plan uses `animation: none` under `body.home-open` instead of pausing, so coming back into the empty
project replays the clap from the open pose.

**The push from Home into a project** is `const PUSH_MS = 380;` (`js/home.js:125`), hence the 400 ms delay
before the first clap.

**Why the phone text is outdated — `js/timeline.js:2789–2791`:**

```js
  function addRowLabel() {
    return FM.scene.layers.length ? 'Tap to add a layer' : 'Tap here to start creating';
  }
```

On the phone that row is the big + right under the canvas (his screenshot). The PC has only a thin add line,
so the PC sentence is still the only place that mentions drag-and-drop.

**The one existing test that reads the hint — `tests/tests.js:12355–12390`**, `917.14 the empty canvas hint
tells a phone what it can do, and the PC keeps drag and Import media`. Its phone half requires `/tap/` in the
text (and then measures the wrap of the first visible non-icon child, which will no longer exist), so it fails
the moment the line goes. **It must be retuned** (full replacement in §6).

---

## 3. Findings and measurements

All measured with `tools/shot.py` against the dev server on :8777 (current tree, v17.03 label), seeded empty
project (`fm.test.seedProject`, 0 layers), prototype injected by `--js-file` (the files are in this folder).

| What | How | Result |
|---|---|---|
| Hint shown, text, box at 380×800 | `--width 380 --height 800`, read `#drop-hint` | shown; text **"Tap + below to add a video or image"**; icon 54×54 at (163, 177); stage 380×320 at y 52 |
| Same at his 440×956 | `--width 440 --height 956` | icon 54×54 at (193, 208); stage 440×382 at y 52 |
| PC 1280×800 | `--width 1280 --height 800` | text **"Drag a video or image here or click Import media"** (kept); icon at (613, 219) |
| Icon colour / accent | `getComputedStyle` | `rgb(147, 174, 185)` (glass `--text-dim` #93aeb9, then `.dh-icon` opacity .85); `--accent` `#5ac7ed` |
| Animations after injecting | `d.getAnimations({subtree:true})` | 5 running: `dh-jolt`, `dh-clap`, 3× `dh-whack` |
| Stick angle when seeked | pause + `currentTime`, read `.dh-stick` transform | 0 ms: `rotate(-20.32deg)` = **28° open**; 425 ms: still **26.3° open** (the slam is ease-in, so it is still up half-way through); 470 ms: `rotate(7.68deg)` = **flat**; 500 ms: `rotate(~4.5deg)` = **~3.2° open** (rebound; the keyframe peak is 3.5° open at 530 ms — review: 4.5 is the rotate value, recomputed from the keyframe's cubic-bezier(.2,.7,.3,1) at t = 0.5 → 4.495deg); 600 ms+: flat |
| Body jolt | `.dh-body` transform | 470 ms: 0; 500 ms: **translateY(0.49)**; 600 ms: 0 |
| Hinge stays put | CTM-mapped hinge point, every 10 ms for 1.2 s | **≤ 0.3 units** of drift throughout (the test's threshold); with the translate wrappers removed (mutation M1) it is **3.34 units off** at 0 ms |
| Open stick overflow | computed from the geometry | top-right corner reaches y = −2.71 (open) / −3.44 (anticipation) → **6.1 / 7.7 px above** the 54 px box; lines reach x = 26.7 → **6 px past** its right edge. Hence `overflow: visible` on the svg |
| **Trap found:** `getBoundingClientRect` on the rotated bar | seeked to shut | reads **18.8 px = 8.36 units tall** though the bar is 3.6 thick — Chrome returns the box of the *rotated bounding box*, so boxes cannot tell shut from ajar. The test maps the bar's own hinge and tip through `getScreenCTM()` instead (which does include the live CSS rotation — measured: 28° at 0 ms) |
| Real-time play (not only seeks) | `--frames 150,2500` with no seeking | played live with no seeking at 440×956: **open** at the first frame (~150 ms after the SVG went in, inside the 400 ms delay) and **shut** at ~2.5 s (`live440-150.png`, `live440-2500.png`). Frame timing from shot.py is approximate (one 380 run landed its frames two poses late because the first capture was slow), which is why the option sheets use seeked frames |
| Idle cost between claps | — | **NOT measured** (shot.py gives no paint/style counters). The hold is an active infinite animation on 5 SVG elements, only while an empty project is on screen; `display:none` with a layer and `animation:none` behind Home are measured to remove it |
| WebKit / his iPhone | — | **NOT measured** (no Safari here). The hinge does not depend on `transform-origin`/`transform-box` resolution (two static `translate()` wrappers), which is the usual WebKit-vs-Chrome SVG trap; `pathLength` + `stroke-dashoffset` animation is long supported in Safari but was not run there |
| Light Home setting | `--home light`, same probe at 440 | hint colour unchanged, `rgb(147, 174, 185)` — the light look does not reach the stage |
| Reduced motion | stylesheet rule check | the `@media (prefers-reduced-motion: reduce)` rule is present and the test asserts it on every machine; **not run under an emulated OS setting** (shot.py cannot emulate it) |

**Proving tests, run in the app** (the suite's own test bodies, with `atPhoneWidth`/`atWideWidth` shimmed to
"run if this shot is that layout"; harness `mkverify.py`, outputs below):

- **Current app (380):** new test **FAIL** — "the clapper is still one still drawing: no hinged stick
  (.dh-stick)…"; retuned 917.14 **FAIL** — "at 320px the empty canvas still says "Tap + below to add a video or
  image" — he asked for the words to go…".
- **Prototype, the exact paste blocks (380 and 1280):** both **PASS**.
- **Mutations of the prototype (380), each must fail — all did:** 
  - M1 hinge by transform-origin only (both translate wrappers set to `translate(0 0)`) → *"at 0ms the stick's hinge has moved 3.34 units off the board's corner"*
  - M2 stick not animated (`.dh-stick { animation-name: none !important }`) → *"nothing animates the stick (running on the empty stage: dh-jolt, dh-whack ×3)"*
  - M3 lines not animated → *"no impact lines within 80ms of the slam at 470ms"*
  - M4 the `body.home-open … { animation: none; }` rule removed → *"the clapper keeps animating behind Home (5 animations)"*
  - M5 a gentle close instead of a slam (open → shut eased over ~460 ms) → *"the stick takes 290ms from open to shut — that is a close, not a slam"*
  - M6 the reduced-motion rule removed → *"no prefers-reduced-motion rule stops the clap"*

  Each mutation was checked to have changed the injected CSS/SVG before the test ran (a no-op would have been
  reported as such). Timings in that harness: new test **603 ms**, 917.14 **95 ms** (380 wide), well inside
  the 45 s per-test budget.

---

## 4. Options (rendered at 54 px, the size it ships, and big)

All frames are the real app's CSS/SVG, seeked and screenshotted in the app at 2× device pixels, on the stage's
black. Times are from the start of a clap cycle.

- **The clap, frame by frame** — `img/1-clap-frames.png`
- **Timing variants A / B / C** (8 moments over the first 9 s after the empty project opens) — `img/2-variants-ABC.png`
- **Line colour, grey vs accent** — `img/3-line-colour.png`
- **The recommended pair (A + accent) in the app at 440×956** — `img/6-recommended-in-app.png`
- **In the app, phone** 380×800 and his 440×956, open → slam → lines → shut — `img/4-in-app-phone.png`
- **PC** 1280×800, with its sentence kept — `img/5-pc.png`

**Timing (the ❓ASK):**

- **A — claps as the empty project opens, then every 6 s while it stays empty. Recommended.** It is what he
  described (open, slams), it plays when he lands in the project (after the 380 ms push), and it keeps
  reminding him the canvas is waiting without flapping constantly. One clap is ~1.3 s of motion in 6 s.
- **B — once, then stays shut.** Quietest. But opening an empty project and glancing at the timeline first
  means missing the only clap.
- **C — continuously, every 1.6 s.** Most lively; on a screen he sits on while choosing what to add it
  becomes a flapping distraction.

**Line colour:** **Cyan — the accent (`var(--accent)`, #5ac7ed). Recommended.** At 54 px the grey lines sit in the
drawing's own colour and read as part of the icon (look at 505/540 in the top row of `img/3-line-colour.png`);
the cyan reads as the hit, which is the "little effect" he asked for, and it is the app's own accent.
**Grey** (the icon's own colour) is the quieter choice. `img/6-recommended-in-app.png` is A + cyan in the app.

---

## 5. The exact change (variant A, accent lines — the recommended pair)

Files: `index.html` (the hint), `styles.css` (the hint rules + collab-ro rule), `tests/tests.js` (retune 917.14,
add the new test). No `js/*.js` change. **Bump the `styles.css?v=` buster in index.html** — anchor on
`<link rel="stylesheet" href="styles.css?v=` (`index.html:42`; it was `?v=725` at v17.03 and is already `?v=727` in
the v17.05 working tree, so bump whatever it is when you build, by one) — ship.sh refuses a changed styles.css
without it. Version label + POLISH-LOG as usual; the log line says `queue 957 (partial)` for this item (plain
`queue 957` only if (A), the arrow, ships in the same release — see the top) and refers to the retuned
917.14 as `#917` (a `queue 917` would claim it and ship.sh would demand a proof for it).

### 5a. `index.html` — replace the whole `#drop-hint` block (from `<div id="drop-hint">` to its closing
`</div>`, i.e. current lines 421–428, including the `.dh-phone` comment and div) with:

```html
          <div id="drop-hint">
            <div class="dh-icon"><svg viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><!-- v5.92. Ezra: "this shape looks a little shitty, fix it up so the lines aren't going through." The clapstick was an OPEN path forming a wedge 4.5 thick at the hinge and 1.5 at the tip, and the three stripes were fixed-length diagonals that fitted neither end of it: measured against the wedge, all three overshot its TOP edge by ~1.0, and two crossed BELOW y=9 into the board — the third started at y=9.6, i.e. entirely inside it. Now the clapstick is a CLOSED bar of constant 3.6 thickness and the stripes are inset 0.8 from both of its edges, so nothing can protrude at either end. Declaration order is load-bearing, as it was for the Template icon: stripes first, bar over their ends, board last. --><!-- queue 957. Ezra: "make it make a little animation for like the film real thing where it's like open and then it slams down with like a little effect with like some lines coming out of it". The v5.92 paths are untouched; they are only GROUPED. Stripes + bar are the stick (.dh-stick), hinged at the bar's bottom-left corner (3.2, 8.9), which is the board's top-left. The hinge is the two static translate() wrappers around the animated <g>, NOT transform-origin: the CSS rotation then turns about the local origin, whatever an engine does with transform-origin / transform-box on an SVG child. The drawn pose is 7.68° open; styles.css turns it +7.68° to shut it flat on the board. .dh-body jolts on the impact; .dh-whack is the three impact lines past the tip, invisible until the slam (pathLength="1" so the dash maths is in fractions of each line). --><g class="dh-body"><g transform="translate(3.2 8.9)"><g class="dh-stick"><g transform="translate(-3.2 -8.9)"><path d="M7.55 7.5 7.28 5.53M12.0 6.9 11.73 4.93M16.44 6.3 16.18 4.33"/><path d="M3.2 8.9 21 6.5 20.52 2.93 2.72 5.33Z"/></g></g></g><path d="M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></g><g class="dh-whack" stroke-width="1.4"><path pathLength="1" d="M22.2 6.47 24 3.35"/><path pathLength="1" d="M23.01 7.35 26.28 5.83"/><path pathLength="1" d="M23.17 8.55 26.71 9.17"/></g></svg></div>
            <div class="dh-pc">Drag a video or image here<br>or click <b>Import media</b></div>
          </div>
```

The v5.92 comment and all three v5.92 paths are byte-for-byte unchanged and still in their load-bearing order
(stripes, bar, board); they are only wrapped in groups.

### 5b. `styles.css` — replace lines 681–689 (from `.dh-icon { font-size: 44px; opacity: .85; }` through the
closing `}` of the `@media (max-width: 700px)` block) with:

```css
.dh-icon { font-size: 44px; opacity: .85; }
/* Only the PC has words now. The phone had its own (queue 917 finding 14: "Tap + below to add a video or image"),
   and queue 957 took them away at his word — "that's actually outdated that text instead get rid of the text":
   the timeline's big + right under the canvas already says "Tap here to start creating". The PC keeps its
   sentence; nothing else there tells you that you can drag files in. */
@media (max-width: 700px) {
  #drop-hint .dh-pc { display: none; }
}
/* ═══ THE CLAP (queue 957) ═════════════════════════════════════════════════════════════════════════════
   His words: *"it's like open and then it slams down with like a little effect with like some lines coming out of
   it to show that it's like slap down and like clapped"*. One 6 s cycle, starting OPEN so the first thing seen is
   an open clapper: hold, a 3° lift (anticipation), SLAM shut in 90 ms (ease-in all the way into the board), a 3.5°
   rebound, shut; the whole icon dips 0.5 units on the impact; three lines shoot out of the tip (drawn in 70 ms)
   and retract away, gone 230 ms after the hit. Then it sits shut until it lifts open again over the last 0.7 s,
   so 100% = 0% and the loop has no seam.
   It claps as the empty project opens (the 400 ms delay lets the 380 ms push from Home land first, js/home.js
   PUSH_MS) and every 6 s while the project stays empty.
   ⚠️ Rotations are RELATIVE TO THE DRAWN POSE, which is 7.68° open (atan2(2.4, 17.8)): 7.68deg = shut flat,
   -20.32deg = 28° open. The hinge is the translate() wrappers in index.html, so transform-origin stays 0 0.
   It costs nothing when it cannot be seen: #drop-hint is display:none (.hidden) as soon as there is a layer
   (js/app.js updateDropHint), which removes the animations outright, and body.home-open stops them behind Home
   — the same reasoning as #hm-grain's pause. Coming back to the empty project restarts them, so it claps again. */
.dh-icon svg { overflow: visible; }   /* the open stick rises ~8 px above the 54 px box; the lines reach ~6 px past its right edge */
.dh-stick { transform-box: view-box; transform-origin: 0 0; animation: dh-clap 6s .4s infinite both; }
.dh-body { animation: dh-jolt 6s .4s infinite both; }
.dh-whack path { opacity: 0; stroke-dasharray: 1 2; stroke-dashoffset: 1; animation: dh-whack 6s .4s infinite both; }
.dh-whack { stroke: var(--accent); }   /* the lines in the accent, not the icon's grey: at 54 px grey lines read as part of the drawing, cyan reads as the hit */
@keyframes dh-clap {
  0% { transform: rotate(-20.32deg); }
  5% { transform: rotate(-20.32deg); animation-timing-function: cubic-bezier(.45, 0, .25, 1); }
  6.333% { transform: rotate(-23.32deg); animation-timing-function: cubic-bezier(.6, 0, 1, .6); }
  7.833% { transform: rotate(7.68deg); animation-timing-function: cubic-bezier(.2, .7, .3, 1); }
  8.833% { transform: rotate(4.18deg); animation-timing-function: ease-in; }
  10% { transform: rotate(7.68deg); }
  88.333% { transform: rotate(7.68deg); animation-timing-function: cubic-bezier(.45, 0, .25, 1); }
  100% { transform: rotate(-20.32deg); }
}
@keyframes dh-jolt {
  0% { transform: translateY(0px); }
  7.833% { transform: translateY(0px); animation-timing-function: cubic-bezier(.2, .7, .3, 1); }
  8.5% { transform: translateY(.5px); animation-timing-function: ease-in; }
  10%, 100% { transform: translateY(0px); }
}
@keyframes dh-whack {   /* pathLength="1": offset 1 = not drawn, 0 = drawn in full, -1 = retracted off the far end */
  0%, 7.817% { opacity: 0; stroke-dashoffset: 1; }
  7.833% { opacity: 1; stroke-dashoffset: .7; animation-timing-function: cubic-bezier(.2, .7, .3, 1); }
  9% { opacity: 1; stroke-dashoffset: 0; animation-timing-function: ease-in; }
  11.667%, 100% { opacity: 0; stroke-dashoffset: -.95; }
}
body.home-open .dh-stick, body.home-open .dh-body, body.home-open .dh-whack path { animation: none; }
@media (prefers-reduced-motion: reduce) { .dh-stick, .dh-body, .dh-whack path { animation: none; } }
```

### 5c. `styles.css` ~10546–10548 — the collab read-only rule. Replace:

```css
   reorder layers, and the empty stage says "Tap + below" — none of it is a Viewer's or a Commenter's. */
body.collab-ro .tl-addrow, body.collab-ro .row-drag, body.collab-ro #m-more, body.collab-ro #btn-more-layer,
body.collab-ro #btn-split, body.collab-ro #vb-camera, body.collab-ro #drop-hint .dh-phone { display: none !important; }
```

with:

```css
   reorder layers — none of it is a Viewer's or a Commenter's. (The empty stage's "Tap + below" line that was
   hidden here is gone for everyone since queue 957.) */
body.collab-ro .tl-addrow, body.collab-ro .row-drag, body.collab-ro #m-more, body.collab-ro #btn-more-layer,
body.collab-ro #btn-split, body.collab-ro #vb-camera { display: none !important; }
```

(The clapper still claps for a Viewer — it adds nothing they could act on, and the empty stage should not look
different to them.)

### 5d. If he picks another option

These blocks are what `img/2-variants-ABC.png` was rendered from (seeked in the app); the proving test was run
on A only. For either, also rewrite the first two sentences of the THE CLAP comment to match.

- **B (once):** in 5b replace the `.dh-stick`, `.dh-body` and `.dh-whack path` rules and the three `@keyframes`
  blocks with:

  ```css
  .dh-stick { transform-box: view-box; transform-origin: 0 0; animation: dh-clap 1000ms 400ms 1 both; }
  .dh-body { animation: dh-jolt 1000ms 400ms 1 both; }
  .dh-whack path { opacity: 0; stroke-dasharray: 1 2; stroke-dashoffset: 1; animation: dh-whack 1000ms 400ms 1 both; }
  @keyframes dh-clap {
    0% { transform: rotate(-20.32deg); }
    30% { transform: rotate(-20.32deg); animation-timing-function: cubic-bezier(.45, 0, .25, 1); }
    38% { transform: rotate(-23.32deg); animation-timing-function: cubic-bezier(.6, 0, 1, .6); }
    47% { transform: rotate(7.68deg); animation-timing-function: cubic-bezier(.2, .7, .3, 1); }
    53% { transform: rotate(4.18deg); animation-timing-function: ease-in; }
    60% { transform: rotate(7.68deg); }
    100% { transform: rotate(7.68deg); }
  }
  @keyframes dh-jolt {
    0% { transform: translateY(0px); }
    47% { transform: translateY(0px); animation-timing-function: cubic-bezier(.2, .7, .3, 1); }
    51% { transform: translateY(0.5px); animation-timing-function: ease-in; }
    60% { transform: translateY(0px); }
    100% { transform: translateY(0px); }
  }
  @keyframes dh-whack {
    0% { opacity: 0; stroke-dashoffset: 1; }
    46.9% { opacity: 0; stroke-dashoffset: 1; }
    47% { opacity: 1; stroke-dashoffset: 0.7; animation-timing-function: cubic-bezier(.2, .7, .3, 1); }
    54% { opacity: 1; stroke-dashoffset: 0; animation-timing-function: ease-in; }
    70% { opacity: 0; stroke-dashoffset: -0.95; }
    100% { opacity: 0; stroke-dashoffset: -0.95; }
  }
  ```
- **C (continuous):** the same rules and blocks, with:

  ```css
  .dh-stick { transform-box: view-box; transform-origin: 0 0; animation: dh-clap 1600ms 400ms infinite both; }
  .dh-body { animation: dh-jolt 1600ms 400ms infinite both; }
  .dh-whack path { opacity: 0; stroke-dasharray: 1 2; stroke-dashoffset: 1; animation: dh-whack 1600ms 400ms infinite both; }
  @keyframes dh-clap {
    0% { transform: rotate(-20.32deg); }
    18.75% { transform: rotate(-20.32deg); animation-timing-function: cubic-bezier(.45, 0, .25, 1); }
    23.75% { transform: rotate(-23.32deg); animation-timing-function: cubic-bezier(.6, 0, 1, .6); }
    29.375% { transform: rotate(7.68deg); animation-timing-function: cubic-bezier(.2, .7, .3, 1); }
    33.125% { transform: rotate(4.18deg); animation-timing-function: ease-in; }
    37.5% { transform: rotate(7.68deg); }
    56.25% { transform: rotate(7.68deg); animation-timing-function: cubic-bezier(.45, 0, .25, 1); }
    100% { transform: rotate(-20.32deg); }
  }
  @keyframes dh-jolt {
    0% { transform: translateY(0px); }
    29.375% { transform: translateY(0px); animation-timing-function: cubic-bezier(.2, .7, .3, 1); }
    31.875% { transform: translateY(0.5px); animation-timing-function: ease-in; }
    37.5% { transform: translateY(0px); }
    100% { transform: translateY(0px); }
  }
  @keyframes dh-whack {
    0% { opacity: 0; stroke-dashoffset: 1; }
    29.313% { opacity: 0; stroke-dashoffset: 1; }
    29.375% { opacity: 1; stroke-dashoffset: 0.7; animation-timing-function: cubic-bezier(.2, .7, .3, 1); }
    33.75% { opacity: 1; stroke-dashoffset: 0; animation-timing-function: ease-in; }
    43.75% { opacity: 0; stroke-dashoffset: -0.95; }
    100% { opacity: 0; stroke-dashoffset: -0.95; }
  }
  ```
- **Grey lines instead of accent:** delete the one line `.dh-whack { stroke: var(--accent); }` from 5b — the
  lines then inherit the svg's `stroke="currentColor"`, the clapper's own grey.
- Test changes for B/C are in §6.

---

## 6. The proving tests

### 6a. Retune `917.14` — replace the whole test (`tests/tests.js:12355–12390`, from the comment
`/* 917.14 — the empty canvas told a PHONE…` through the test's closing `});`) with:

```js
  /* 917.14 — the empty canvas told a PHONE to "Drag a video or image here or click Import media": no drag, no such
     button. The phone got its own words ("Tap + below…"), and queue 957 took those away too. His words: "that's
     actually outdated that text instead get rid of the text" — the timeline's big + right under the canvas already
     says "Tap here to start creating" (js/timeline.js addRowLabel), so the stage was saying it twice. The phone shows
     the clapper alone; the PC keeps its sentence, the only place that tells you you can drag files in. */
  test('917.14 the empty canvas hint: a phone shows the clapper and no words, the PC keeps drag and Import media', { item: '917' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const homeWasOpen = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    const shown = () => {
      const d = document.getElementById('drop-hint');
      if (!d || d.classList.contains('hidden') || !(d.getBoundingClientRect().width > 0)) throw new Error('the empty-canvas hint is not on screen with no layers, so there is nothing to read');
      return d;
    };
    try {
      if (homeWasOpen) FM.home.close();
      FM.scene.layers.length = 0; FM.selectLayer(null); FM.refreshAll(); await sleep(80);
      for (const w of [320, 380, 440]) {
        await atPhoneWidth(async function () {
          const d = shown(), txt = d.innerText.replace(/\s+/g, ' ').trim();
          if (txt) throw new Error('at ' + w + 'px the empty canvas still says "' + txt + '" — he asked for the words to go; the big + under the canvas already says "Tap here to start creating"');
          const ic = d.querySelector('.dh-icon svg'), r = ic && ic.getBoundingClientRect();
          if (!r || !(r.width > 30 && r.height > 30)) throw new Error('at ' + w + 'px the clapper is not on screen either — the empty canvas shows nothing at all');
        }, w);
      }
      await atWideWidth(async function () {
        const txt = shown().innerText.replace(/\s+/g, ' ').trim();
        if (!/drag/i.test(txt) || !/import media/i.test(txt)) throw new Error('on PC the empty canvas lost its drag / Import media wording: "' + txt + '"');
      });
    } finally {
      FM.scene.layers = layers0;
      if (FM.selectLayer) FM.selectLayer(sel0 || null);
      if (FM.refreshAll) FM.refreshAll();
      if (homeWasOpen && FM.home && FM.home.open) { try { FM.home.open(); } catch (e) {} }
    }
  });
```

Fails on HEAD: *"at 320px the empty canvas still says "Tap + below to add a video or image" — he asked for the
words to go…"* (run in the app, §3). The PC half is unchanged and is the positive control that the hint (and
its reader) still work.

### 6b. New test — append at the end of the suite: paste it immediately before the file's last line, `})();`
(the closing of the registration IIFE; the test above it currently ends with the queue 965 typed-✕ sweep):

```js
  /* ═══ 957 — THE EMPTY PROJECT'S CLAPPER CLAPS ════════════════════════════════════════════════════════════
     His words, 26 Sep (dictated): "get rid of the text and just make it make a little animation for like the film
     real thing where it's like open and then it slams down with like a little effect with like some lines coming out
     of it to show that it's like slap down and like clapped".
     ⚠️ MEASURED ON THE DRAWING, NOT READ OFF THE CSS. The clap is paused and SEEKED through its first 1.2 s, and every
     10 ms the bar's hinge and tip are mapped through its live CTM into the board's coordinates: open at the start,
     hinge on the board's corner the whole way, shut flat on the board, and quick about it. A keyframe that exists but
     turns the stick about the wrong point — the transform-origin trap on SVG children — moves the hinge and fails
     here, where a check of the CSS text would pass.
     ⚠️ "IT STOPS" HAS ITS CONTROL: the same query that must find nothing behind Home and with a layer on the stage
     must first find the clap running on the empty stage, and must find it again when each of those goes away. */
  test('957 the empty project clapper opens, slams shut on the board with lines out of the tip, and stops when it cannot be seen', { item: '957' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const homeWasOpen = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const d = document.getElementById('drop-hint');
    const claps = () => d.getAnimations({ subtree: true }).filter(a => /^dh-/.test(a.animationName || ''));
    try {
      if (homeWasOpen) FM.home.close();
      FM.scene.layers.length = 0; FM.selectLayer(null); FM.refreshAll(); await sleep(80);
      if (d.classList.contains('hidden') || !(d.getBoundingClientRect().width > 0)) throw new Error('the empty-canvas hint is not on screen with no layers, so there is nothing to watch');
      const stick = d.querySelector('.dh-stick');
      const bar = stick && stick.querySelectorAll('path')[1], board = d.querySelector('.dh-body > path');
      const lines = [].slice.call(d.querySelectorAll('.dh-whack path'));
      if (!stick || !bar || !board) throw new Error('the clapper is still one still drawing: no hinged stick (.dh-stick) to open and slam onto a board (.dh-body > path)');
      if (lines.length < 3) throw new Error('the slam has ' + lines.length + ' impact lines; he asked for "some lines coming out of it"');

      // reduced motion: the still v5.92 drawing, no clap — asserted on the stylesheet so it holds on every machine,
      // not only on one with the OS setting on (the runner does not emulate it)
      const rmRules = [];
      [].slice.call(document.styleSheets).forEach(ss => {
        let rules; try { rules = ss.cssRules; } catch (e) { return; }
        [].slice.call(rules || []).forEach(r => {
          if (!r.media || !/prefers-reduced-motion:\s*reduce/.test(r.media.mediaText)) return;
          [].slice.call(r.cssRules).forEach(c => { if (c.selectorText && /\.dh-stick/.test(c.selectorText) && c.style.animationName === 'none') rmRules.push(c.selectorText); });
        });
      });
      if (!rmRules.length) throw new Error('no prefers-reduced-motion rule stops the clap (.dh-stick { animation: none }) — someone who has asked for less motion gets a slamming icon');
      if (reduced) {
        if (claps().length) throw new Error('under prefers-reduced-motion the clapper still runs ' + claps().map(a => a.animationName).join(', '));
        return;
      }

      const running = claps();
      const clap = running.filter(a => a.animationName === 'dh-clap')[0];
      if (!clap) throw new Error('nothing animates the stick (running on the empty stage: ' + (running.map(a => a.animationName).join(', ') || 'none') + ')');
      const tm = clap.effect.getComputedTiming();
      // his pick (variant A): it claps as the empty project opens and again every ~6 s while it stays empty
      if (tm.iterations !== Infinity) throw new Error('the clap plays ' + tm.iterations + ' time(s); it is meant to come back every few seconds while the project is empty');
      if (!(tm.duration >= 4000 && tm.duration <= 8000)) throw new Error('one clap cycle is ' + tm.duration + 'ms — meant to be a clap every ~6 s, not constant flapping nor a rare one');

      // ⚠️ Points, not boxes: getBoundingClientRect on a rotated SVG path is the box of its ROTATED BOUNDING BOX
      // (measured: the shut bar reads 8.4 units tall, not 3.6), which cannot tell shut from ajar. So the bar's own
      // hinge and tip are mapped through its live CTM into the BOARD's coordinates, where the board's top is y = 9.
      const inBoard = (el, x, y) => new DOMPoint(x, y).matrixTransform(el.getScreenCTM()).matrixTransform(board.getScreenCTM().inverse());
      const S = [];
      for (let ms = 0; ms <= 1200; ms += 10) {
        running.forEach(a => { a.pause(); a.currentTime = tm.delay + ms; });
        const H = inBoard(bar, 3.2, 8.9), R = inBoard(bar, 21, 6.5);          // the bar's bottom edge: hinge → tip
        S.push({ ms: ms, deg: Math.atan2(H.y - R.y, R.x - H.x) * 180 / Math.PI,  // how far OPEN, in degrees (0 = flat)
                 hinge: Math.hypot(H.x - 3.2, H.y - 8.9), tipY: R.y,
                 ink: Math.max.apply(null, lines.map(p => +getComputedStyle(p).opacity)),
                 out: Math.min.apply(null, lines.map(p => { const b = p.getBBox(); return inBoard(p, b.x, b.y).x - 21; })) });
      }
      running.forEach(a => a.play());
      const s0 = S[0];
      // 1. it starts OPEN — "it's like open and then it slams down"
      if (!(s0.deg > 20)) throw new Error('at the start the stick is ' + s0.deg.toFixed(1) + '° open — it does not start open');
      if (s0.ink > 0.05) throw new Error('the impact lines are showing before the slam (opacity ' + s0.ink + ')');
      // 2. the hinge stays on the board's top-left corner through the whole clap — a wrong rotation centre moves it
      const off = S.filter(s => s.hinge > 0.3)[0];
      if (off) throw new Error('at ' + off.ms + 'ms the stick\'s hinge has moved ' + off.hinge.toFixed(2) + ' units off the board\'s corner — it is swinging about the wrong point');
      // 3. it SHUTS: flat on the board, its tip down on the board's top edge
      const hit = S.filter(s => s.deg < 1)[0];
      if (!hit) throw new Error('the stick never shuts: it is never less than ' + Math.min.apply(null, S.map(s => s.deg)).toFixed(1) + '° open in the first 1.2 s');
      if (Math.abs(hit.tipY - 8.9) > 0.4) throw new Error('shut, the stick\'s tip is at y=' + hit.tipY.toFixed(2) + ' — not down on the board\'s top edge');
      // 4. it SLAMS: from mostly open to shut in a blink, not a gentle close
      const lastOpen = S.filter(s => s.ms < hit.ms && s.deg > 0.8 * s0.deg).pop();
      if (!lastOpen) throw new Error('the stick was never mostly open before it shut');
      if (hit.ms - lastOpen.ms > 150) throw new Error('the stick takes ' + (hit.ms - lastOpen.ms) + 'ms from open to shut — that is a close, not a slam');
      // 5. the lines burst AT the impact, out past the tip, and are gone again
      const burst = S.filter(s => s.ms >= hit.ms - 10 && s.ms <= hit.ms + 80 && s.ink > 0.5)[0];
      if (!burst) throw new Error('no impact lines within 80ms of the slam at ' + hit.ms + 'ms');
      if (burst.out < -0.5) throw new Error('the impact lines start ' + (-burst.out).toFixed(1) + ' units inside the board — they are meant to fly out of the tip');
      const late = S.filter(s => s.ms >= hit.ms + 400 && s.ink > 0.05)[0];
      if (late) throw new Error('the impact lines still show at ' + late.ms + 'ms, 400ms after the slam — a burst, not a decoration');

      // 6. nothing animates where it cannot be seen — and it comes back when it can (the "running" above is the control)
      FM.home.open(); await sleep(150);
      const behindHome = claps().length;
      FM.home.close(); await sleep(150);
      if (behindHome) throw new Error('the clapper keeps animating behind Home (' + behindHome + ' animations), repainting under a screen that covers it');
      if (!claps().length) throw new Error('back from Home the clap did not start again');
      FM.scene.layers.push(FM.makeLayer('shape', { shape: 'rect', name: '957', x: 100, y: 100, shapeW: 60, shapeH: 60, fill: '#f00' }));
      FM.refreshAll(); await sleep(80);
      if (!d.classList.contains('hidden')) throw new Error('with a layer on the stage the empty-canvas hint is still shown');
      if (claps().length) throw new Error('with a layer on the stage the hidden clapper still animates (' + claps().length + ')');
      FM.scene.layers.length = 0; FM.refreshAll(); await sleep(80);
      if (!claps().length) throw new Error('with the stage empty again the clap did not come back');
    } finally {
      FM.scene.layers = layers0;
      if (FM.selectLayer) FM.selectLayer(sel0 || null);
      if (FM.refreshAll) FM.refreshAll();
      if (homeWasOpen && FM.home && FM.home.open) { try { FM.home.open(); } catch (e) {} }
    }
  });
```

**Why it fails on HEAD:** there is no `.dh-stick`, so the first structural check throws
(*"the clapper is still one still drawing…"*). That is a structural failure, so the proof of the BEHAVIOUR is
the mutations, all run and all caught (§3): no translate wrappers (hinge moves 3.34 units), stick not animated,
lines not animated, no Home stop, a 600 ms "gentle" close (290 ms from open to shut > 150), no reduced-motion
rule. For the record in the ship log, the two worth repeating with `tools/mutate.sh` after building:

```bash
tools/mutate.sh styles.css "body.home-open .dh-stick, body.home-open .dh-body, body.home-open .dh-whack path { animation: none; }" "/* mutated */" "957 the empty project clapper"
tools/mutate.sh index.html '<g transform="translate(3.2 8.9)">' '<g transform="translate(0 0)">' "957 the empty project clapper"
```

(These two exact commands were NOT run — they are the mutate.sh form of M4 and a variant of M1, which were run
in the app harness. The second moves only the outer wrapper, so the stick hinges at the svg's (0, 0), 9.5 units
from the board's corner. Run them detached, never beside ship.sh.)

**If he picks B:** replace the two variant-A lines (`iterations !== Infinity` and the 4000–8000 duration) with
`if (tm.iterations !== 1) throw new Error('the clap is meant to play once, when the empty project opens');`
and, after the sampling loop, assert it stays shut: seek to `tm.delay + tm.duration + 2000` and require
`deg < 1` (with `fill: both` it holds the last frame).
**If he picks C:** `iterations === Infinity` and `tm.duration` between 1200 and 2000.

**Timing:** the new test seeks 121 times and opens/closes Home once: 603 ms in the app harness at 380 (917.14:
95 ms). Not yet timed inside the suite runner.

---

## 7. Verification (after building)

1. `python3 tests/_cdp.py --url 'http://localhost:8777/tests/run.html?only=917.14'` and `?only=957%20the%20empty`
   — at the default width and with `--width 380`.
2. Phone, 380×800 and 440×956 (his): `python3 tools/shot.py --width 440 --height 956 --setup '1' --frames 150,900,2500 --out <scratch>/clap.png`
   (the `--setup` form closes Home into the seeded empty project). Expect: no text on the stage; an open
   clapper in the first frame; shut after. The clap is at ~870 ms after landing (400 delay + 470), so a frame
   right on it is luck — the seeked frames in §4 are the reliable look.
3. PC 1280×800: the sentence "Drag a video or image here or click Import media" is still under the clapper,
   which also claps.
4. Add any layer → the hint goes (`display:none`), delete it → the clapper is back and claps.
5. Home and back into the empty project → it claps again (animations restart on `body.home-open` removal).
6. Light/dark: the editor has one look (`js/settings.js:122` always sets `data-theme="glass"`); only Home has a
   light mode (`data-home`), and with it on the hint's colour measured unchanged (§3). One light-Home shot at 440
   is enough to confirm after building.
7. On his iPhone (the one thing not verifiable here): the hinge stays on the board's corner through the swing.

---

## 8. Risks and tests likely to break

- **`917.14 the empty canvas hint tells a phone what it can do…`** (`tests/tests.js:12358`) — breaks for certain
  (throws on the missing phone line). Retuned in §6a.
- **`860: no icon on screen is missing its ink…`** (`tests/tests.js` ~74437, anchor `test('860: no icon on screen`) — reads every visible svg's
  children; the whack lines have opacity 0 but the stick and board are inked, so the icon passes. Checked by
  reading the audit's logic, not by running it.
- **`entranceDone(el)`** (`tests/tests.js` ~68316, anchor `async function entranceDone(el)`) waits for an element's finite animations; it filters out
  `iterations === Infinity`, so variant A/C never make it wait. **Variant B would** (a 1.4 s finite animation
  under `#app`), so if B is picked, check no caller passes an ancestor of `#drop-hint` in an empty project.
- **Anything that `finish()`es all animations under the stage**: `Animation.finish()` throws on an infinite
  animation. Grep (review, v17.05 tree) found only element-scoped calls: the dialog ones wrapped in `try` (`tests/tests.js:68488, 68506`),
  `land945` on `#canvas-dialog` (~100836, finite only), and bare `x.finish()` on a toast's / a pop-over's own animations
  (~68631, 68666, 68699) — none reaches `#drop-hint`. No test or app code calls `document.getAnimations()`, and no app
  code finishes broadly (`js/app.js:7255` cancels only `#view-bar`/`#opt-bar` children).
- **Collab frames** (`?fmtest=collab`) boot empty projects too; the clapper will animate there. No collab test
  reads `#drop-hint` (grep of `tests/` found only 917.14).
- **Idle cost** (unmeasured, see §3): an infinite CSS animation is "running" during its 4.7 s hold. It is 5 tiny
  SVG elements and only while an empty project is on screen; if it ever shows in a profile, the fallback is a
  one-shot class re-added by `updateDropHint` on a 6 s timer — not worth building up front.
- **WebKit** (unmeasured): if the stick swings about the wrong point on his phone, the hinge itself comes from
  the translate() wrappers, so the first thing to try is deleting `transform-box: view-box;` from the `.dh-stick`
  rule (with `transform-origin: 0 0` the rotation should then be about the local origin in any engine) —
  untested, since there is no Safari here.

---

## 9. Open questions for Ezra

❓ASK: Timing — A (claps when the empty project opens, then every 6 s), B (once), or C (non-stop)? **Recommended: A.**
❓ASK: The lines at the slam — grey (same as the clapper) or cyan (the accent)? **Recommended: cyan** — at 54 px grey lines read as part of the drawing; cyan reads as the hit.
❓ASK: On PC, keep the sentence under the clapper ("Drag a video or image here or click Import media")? Y/N. **Recommended: Y** — it is the only place that tells you files can be dragged in; he was on his phone when he asked. Build the phone half without waiting on this.

---

## Review (skeptical pass, 26 Sep ~20:30, against the v17.05 working tree; no repo file touched)

**Checked and holding:** every §2 anchor (`index.html:421–428`, `styles.css:674–689`, `:681`, `:3320`, `:4984–4985`,
`:10544–10548`, `js/app.js:803–805`, `js/home.js:125/2967/2979`, `js/timeline.js:2789–2791`, `tests/tests.js:12355–12390`,
`js/settings.js:122`) still matches. The §5a HTML is tag-balanced, keeps the v5.92 comment and all three paths
byte-for-byte, and has no `--` inside its new comment; it and the §5b CSS (30/30 braces) and the §6b test are identical
to the injected prototype files (`final-html.txt`, `final-css.txt`, `test-new.js`). No `@keyframes dh-*` exists yet,
so the test's `/^dh-/` filter cannot pick up anything else. `atPhoneWidth(fn, w)` / `atWideWidth(fn)` signatures,
`FM.makeLayer('shape', {...})`, `FM.refreshAll → updateDropHint`, `FM.home.open/close/isOpen` all exist as used.
Reasoned through the new test against the keyframes: open 28° at 0, shut exactly at the 470 ms sample, last "mostly
open" sample ~440 ms (≈30 ms < 150), lines at opacity 1 from 470 ms and gone by 700 ms (< 870 ms), hinge fixed by the
wrappers; it fails on HEAD at the structural check, and the retuned 917.14 fails on HEAD at 320 px with its clapper
check as the positive control. 860's audit was read: the stick/board paths carry ink, so the clapper passes. All six
images opened, show what their captions say, and are phone-safe (1200 wide; tallest 1714 = 1.43×).

**Changed:**
1. `NNN` → **957** everywhere (the inbox entry is already drained as REQUESTS.md #957).
2. Added at the top: #957 also holds **(A) the Home arrow** — this plan is (B) only, so the log line must be
   **`queue 957 (partial)`** unless (A) ships with it (ship.sh ~299 refuses a plain `queue 957` while #957 is open);
   copy the plan to `tools/design/plans/2026-09-26-clapper/` as the #957 entry expects.
3. Added the **design gate** as a decision: show him the six images + §9 ASKs and do not ship until he picks timing
   and colour (#545 / his clause 5); the PC-sentence ASK does not hold the build.
4. §5 buster: it is **`?v=727`** now, not 725 — anchored on the `<link rel="stylesheet" href="styles.css?v=` text.
5. §3 table: "500 ms: 4.5°" was the **rotate value**, not the opening — it is ~3.2° open (recomputed from the keyframe).
6. §6b: exact insertion point — immediately before the file's final `})();`.
7. §8: line numbers corrected (860 ~74437, `entranceDone` ~68316, dialog `finish()` 68488/68506, `js/app.js:7255`),
   and the "all wrapped in `try`" claim corrected — three bare `finish()` calls exist but are scoped to a toast and
   pop-overs, not the stage.

**Still unverified (unchanged, all already labelled in the plan):** WebKit / his iPhone; reduced motion under a real
emulated setting; idle paint cost; the two tests' timing inside the real runner; the two `mutate.sh` commands.
**Orchestrator note stands:** the relayed request (Add layer / Inspector panels shrinking on PC) is NOT this item
and has no plan here.
