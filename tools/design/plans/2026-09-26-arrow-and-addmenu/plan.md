# Plan — #957 clause 1 (the Home arrow ends inside the +) · #958 (the PC Add menu will not drag up to the top)

For the builder. Both are measured, both fixes are written and were **run end to end on a scratch copy of the app**
(HEAD acae12a5 v17.05 + the hunks below, served on my own port): the two new tests fail on HEAD for the right reason and
pass with the fix, and every #244 / #512 / #807 / #804 / #478 / #511 add-menu test is green with it. Nothing in the repo
was edited. Line numbers are from v17.05 (acae12a5) plus the uncommitted edits in the tree at 23:45; every reference also
quotes its anchor text — search for the anchor, not the number.

Scratch folder (this folder): `probeA.js`, `probeA_frames.js`, `probeB.js`, `probeB2.js` (the measurements, run through
`tools/shot.py`), `test_A.js` / `test_B.js` (paste-ready tests), `hunk_A1.js` / `hunk_B1.js` (paste-ready code),
`apply_patch.py` (applies exactly these hunks to a COPY and refuses if an anchor is not found once), images below.

Not in this plan: his clauses 2–4 of #957 (the clapperboard — planned in `../clapper/plan.md`) and #963 (Add menu /
inspector shrinking — the request that triggered this planning run; planned in `../panels/plan.md`, which already knows
#958 only changes how TALL the floated panel may get).
**Ticking:** this closes #957 clause 1 ONLY. Tick that clause with its version and leave #957 open until the clapper plan's
clauses 2–4 ship (or ship both together). #958 closes whole.

---

# (A) #957 clause 1 — the drawn arrow's tip lands INSIDE the + (empty Projects tab)

## A.1 His words and clauses (verbatim, INBOX 26 Sep ~17:26 → REQUESTS #957)

**His words (verbatim; dictated, so transcription fixes are in [brackets]):** "The hour [arrow] is inside of the plus button also when you have an empty project and it's telling you to press the plus button to add a photo a video that's actually outdated that text instead get rid of the text and just make it make a little animation for like the film real [reel, meaning the clapperboard] thing where it's like open and then it slams down with like a little effect with like some lines coming out of it to show that it's like slap down and like clapped because it's like you know one of those film things that they click down when it's like and go and cut so it's like you know that would be cool if you had little animation on it"

His clauses (this plan is clause 1 only):
1. The arrow (the #936 drawn arrow on the empty Projects tab, shipped v17.01) ends INSIDE the + button. It should not.
2. In an empty project, the text telling you to press + to add a photo or video is outdated. Get rid of it.
3. Replace it with a little animation of the clapperboard: it starts open, then slams down.
4. The slam has a small effect: lines coming out of it, to show it was slapped down and clapped, like a film clapper on "and go" / "cut".

His screenshot: `tools/design/2026-09-26-arrow-inside-plus.png` (light Home, 440-wide phone, v17.02).

## A.2 What exists now

`js/home-arrow.js` — the tip is aimed from the +'s rect at the instant draw() runs:
```
19    var t = title.getBoundingClientRect(), p = plus.getBoundingClientRect();
23    var vw = document.documentElement.clientWidth, pr = p.width / 2, pcx = p.left + pr, pcy = p.top + pr;
28    var E = [pcx + u[0] * (pr + 12), pcy + u[1] * (pr + 12)];
107  function clear() { const o = document.getElementById('hm-arrow936'); if (o) o.remove(); }
```
`js/home.js` — when it runs:
```
1640  function arrowSoon() {
1646      const go = () => { if (done) return; done = true; if (root && !root.classList.contains('hidden') && tab === 'projects') FM.homeArrow.draw(); };
1647      requestAnimationFrame(() => requestAnimationFrame(go));
1650    if (!root.classList.contains('hm-preintro')) { draw(); return; }
1651    const mo = new MutationObserver(() => { if (!root.classList.contains('hm-preintro')) { mo.disconnect(); setTimeout(draw, 260); } });
2423    if (FM.homeArrow) FM.homeArrow.clear();   // queue 936: …           ← top of every render()
2538    if (introPending) { introPending = false; stampIntro(); }            ← END of render(), after arrowSoon() was called
2623      fab.classList.add('hm-in-fab');
2624      fab.style.animationDelay = (0.05 + Math.min(seq.length, cap + 1) * step).toFixed(3) + 's';
```
`styles.css` — the +'s own entrance:
```
6699 @keyframes hm-rise-fab {
       from { opacity: 0; transform: translateX(-50%) translateY(18px) scale(.86); }
       to   { opacity: 1; transform: translateX(-50%); }
6719 #home-screen.hm-intro .hm-in-fab { animation: hm-rise-fab .55s cubic-bezier(.22, .9, .32, 1) backwards; }
```
Outside the intro `#hm-new` runs `animation: fm-home-plus-drift 26s ease-in-out infinite alternate` (its hue drift — infinite).

## A.3 Findings — measured

(The table below was measured at v17.03 — the image labels say so. `git diff a741b71c acae12a5 -- js/home.js
js/home-arrow.js` is empty and the `hm-rise-fab` rules are unchanged, so the numbers hold for v17.05; the tests in A.6 were
run on v17.05.)
How: `python3 tools/shot.py --fresh --width 440 --height 956 --home light --js-file probeA.js` (and `--width 380 --height
760 --home dark`). The probe clears `fm.splashed` / `fm.session` and boots a second app in a full-screen same-origin
iframe, so it takes the REAL first-launch road (splash → `fm:splash-dismiss` → `.hm-intro` → `arrowSoon` → draw). It wraps
`FM.homeArrow.draw` from outside to record the +'s rect and animations at the instant of each draw, then reads the tip (the
last point of the first `#hm-arrow936 mask path`) against the settled + 11 s later.

| | 440×956 light | 380×760 dark |
|---|---|---|
| `.hm-intro` stamped (ms after the frame opened) | 1910 | 1836 |
| items before the + → its `animation-delay` | 9 → **0.545 s** | 9 → 0.545 s |
| `draw()` ran | **+278 ms** after `.hm-intro` | +288 ms |
| the +'s `hm-rise-fab` at that instant | **currentTime 250 ms of its 545 ms delay** (held at `from`: opacity 0) | 283 ms of 545 |
| + as read by draw() | 49.9 × 49.9, centre y 921 | 49.9 × 49.9, centre y 725 |
| + at rest | 58 × 58, centre y **903**, r **29** | 58 × 58, centre y 707, r 29 |
| tip → centre of the settled + | **25.3 px — inside the 29 px disc** (rel +22.7, −11.1) | 25.3 px, inside |
| CONTROL: redrawn with the + at rest | **41.0 px** (= 29 + 12), rel +25.2, −32.3, error 0 | 41.0, error 0 |

The + only starts moving at +566 ms and lands ≈ +1095 ms after `.hm-intro` (tracked frame by frame).

**Cause (the first suspect, confirmed):** draw() measures the + while the + is still inside its own entrance — 18 px low
and 14 % small — and the + then rises into the tip. The second suspect (glow/ring outside the rect) is not it: aimed at
rest, the tip is 41 px from the centre, 9.5 px clear of the light ring's outer edge (29 + 2.5 px spread).
His phone shows the same thing with a slightly later draw: in his screenshot the tip is ≈ (+25, −17.7) CSS px from the
centre (≈31 px, on the ring) — what the maths gives for a draw ≈30 % (eased) into the rise; a slower phone's 260 ms timer
firing late. **Both launch roads hit it:** with the splash (measured above), and without one (a reload in the same
session), where render() calls arrowSoon() BEFORE its own stampIntro() (line 2538) and the draw lands two frames later,
inside the same delay. Light and dark behave identically (the look does not change the timing or the geometry).

Side note, no change needed: draw() ran 3× in 4 ms (most likely three renders under `.hm-preintro`, each arrowSoon()
queuing its own observer — inferred from the three calls, not traced). Each call replaces the last SVG, so only one arrow is ever on screen.

**After the fix (A1 below, run on the patched copy, 440×956 light):** the three calls at +276 ms all deferred; the arrow
appeared at **+1126 ms** (the + had landed); settled tip **41.0 px** from the centre, error 0, outside the ring.

Images:
- `A-closeup-now-vs-fixed.png` — his condition reproduced (left) vs the fixed end state (right); big, with a red box at actual size.
- `A-options-frames-440.png` — real first-launch frames at 440×956 light, each labelled with ms after `.hm-intro`, for NOW / A1 / A2.

## A.4 Options — the finished picture is identical; only WHEN the arrow starts differs

- **A1 — Recommended. Wait for the + to land, then draw.** draw() looks at the + for a running FINITE animation (its
  entrance, or any transition) and, if there is one, draws when it finishes (plus a timer for pages that are not being
  painted — see A.5). The arrow starts ≈1.1 s into the intro (≈0.84 s later than now) and draws on to a + that is already
  standing there. Why: it measures a + that is not moving, so it cannot be wrong on any phone speed or engine, and it uses
  only `getAnimations()` / `finished` (Safari 13.1+); where `getAnimations` is missing it behaves exactly as today.
  The approved stroke, curl, colours and 1.27 s draw-on are untouched.
- **A2 — draw at the same moment as now, aimed at where the + will land.** draw() seeks the +'s entrance to its end
  (`anim.currentTime = endTime`), reads the rect, and puts `currentTime` back, all before a paint. Keeps today's timing.
  Not recommended: it relies on the engine re-styling synchronously after a `currentTime` write — true in Chrome (the
  suite), unprovable here for iOS WebKit, which is where he sees it. (Its frame row was captured while the machine was
  busy, so its frames came late; its timing is NOW's by construction.)

## A.5 The exact change (A1)

`js/home-arrow.js` — replace lines 12–19, i.e. from `  'use strict';` down to and including
`    var t = title.getBoundingClientRect(), p = plus.getBoundingClientRect();`, with (also in `hunk_A1.js`):
```js
  'use strict';
  /* queue 957 — AIM AT WHERE THE + STANDS, NOT WHERE IT IS MID-ENTRANCE. Ezra, 26 Sep, on his phone at v17.02: *"The hour
     [arrow] is inside of the plus button"*. The tip is aimed from the +'s getBoundingClientRect(), and on the first open this
     ran ~280 ms into Home's intro — while the + was still held in its own entrance (hm-rise-fab, delay 0.545 s: opacity 0,
     translateY(18px) scale(.86)). Measured on a real first launch at 440x956: the + read 49.9 px wide with its centre 18 px
     low, so the tip landed 25.3 px from the centre of a 29 px-radius + — inside it; aimed at rest it is 41.0 (29 + 12).
     So while the + has a FINITE animation running (its entrance, or any transition) this waits for it and draws then. Its
     hue drift is infinite and is not waited for. `gen` voids a wait that Home has re-rendered past — render() calls clear()
     first — so a tab change can never receive a late arrow.
     ⚠️ AND A TIMER AS WELL AS `finished`, for the reason arrowSoon() keeps one: a page the browser is not painting (hidden,
     or an off-screen frame) need not advance its animations. Measured: waiting on `finished` alone, the suite's off-screen
     fresh-boot #936 instance never drew its arrow at all. The timer fires when the entrance should have ended; the second
     pass (`landed`) draws without waiting again. */
  var gen = 0;
  function settling(el) {
    if (!el.getAnimations) return [];
    return el.getAnimations().filter(function (an) {
      var ct = an.effect && an.effect.getComputedTiming ? an.effect.getComputedTiming() : null;
      return !!ct && isFinite(ct.endTime) && an.playState !== 'finished' && an.playState !== 'idle';
    });
  }
  function draw(opts) {
    var NS = 'http://www.w3.org/2000/svg', ID = 'hm-arrow936';
    var old = document.getElementById(ID); if (old) old.remove();
    var home = document.getElementById('home-screen'), plus = document.getElementById('hm-new');
    var title = document.querySelector('#home-screen .hm-grid .hm-empty-title');
    if (!home || !plus || !title) return null;
    var moving = opts && opts.landed ? [] : settling(plus);
    if (moving.length) {
      var mine = ++gen, left = 0;
      moving.forEach(function (an) { left = Math.max(left, an.effect.getComputedTiming().endTime - (an.currentTime || 0)); });
      var go = function () { if (mine !== gen) return; gen++; draw({ still: !!(opts && opts.still), landed: true }); };
      Promise.all(moving.map(function (an) { return an.finished.catch(function () {}); })).then(go);
      setTimeout(go, Math.min(3000, left + 150));
      return null;
    }
    var t = title.getBoundingClientRect(), p = plus.getBoundingClientRect();
```
…and replace line 107
`  function clear() { const o = document.getElementById('hm-arrow936'); if (o) o.remove(); }` with:
```js
  function clear() { gen++; const o = document.getElementById('hm-arrow936'); if (o) o.remove(); }   // queue 957: also voids a draw still waiting for the + to land
```
Why the timer is there (measured, not theory): the first version waited on `finished` alone, and on the patched copy the
existing **`936 a fresh start opens no project …`** test then went red — *"timed out waiting for the arrow to the + to be
drawn on the empty Projects screen"* — its fresh-boot instance is an off-screen frame, and (most likely, not traced) an
unpainted frame does not advance the +'s entrance, so `finished` never came. Same filtered run on HEAD: green. With the timer: green (both measured through the real
runner). The timer is `endTime − currentTime + 150 ms`, capped at 3 s; on a visible page `finished` wins.
Notes:
- `an.finished` REJECTS when the animation is cancelled (stripIntro removing `.hm-in-fab`); `.catch` turns that into
  "draw now", which is right — the + is at rest once its class is gone.
- Nothing else calls `FM.homeArrow.draw` (grep: only home.js:1646). The resize / `data-home` redraw calls the inner
  `draw({ still: true })` and gets the same guard.
- While there: the header's last line says clear() runs "on every other render"; it runs on every render.
- **Cache-buster:** `index.html` line 1096 `<script src="js/home-arrow.js?v=1">` → `?v=2` (or one more than whatever it is
  by then; ship.sh refuses otherwise).
  No change to `home.js` or `styles.css`.

## A.6 The proving test (in `test_A.js`, identical)

Paste into `tests/tests.js` right after the `936 a fresh start opens no project …` test (line 94158; i.e. just before
`  /* ═══ HUNT-a (queue 690, fourth hunt)` at 94218).

Why it fails on HEAD: it recreates the state both launch roads reach — `.hm-intro` on `#home-screen`, `.hm-in-fab` with the
measured 0.545 s delay on `#hm-new` — then Home renders its EMPTY Projects tab (`FM.projects.list` stubbed to `[]` for the
test only), which calls `arrowSoon()` → `draw()` two frames later, inside the +'s delay. **Run on HEAD through the real
runner: FAIL — `440 light: the arrow's tip is 25.3px from the centre of a 29.0px-radius + — INSIDE it`.** With A1: PASS
(runner, window 1280 and window 380). Controls: (1) drawn at rest first, the tip must be `r + 12` ± 1 px — proves the tip is
read right; (2) the +'s entrance must really be running after the stamp — proves the case is his; (3) an arrow must exist
at the end — a "fix" that draws nothing cannot pass. It forces 440 and 380 itself (`atPhoneWidth`), light and dark.

```js
  /* ═══ QUEUE 957 — THE ARROW'S TIP LANDS INSIDE THE + ══════════════════════════════════════════════════════════════
     Ezra, 26 Sep, on his phone at v17.02 (dictated): *"The hour [arrow] is inside of the plus button"*.
     home-arrow.js aims the tip at the +'s centre + (radius + 12) px, reading the + from getBoundingClientRect() at the
     moment it draws — and on the first open that moment falls inside the +'s OWN ENTRANCE (hm-rise-fab: held at
     translateY(18px) scale(.86) through its animation-delay, then rising). So the arrow is aimed at a + that is 18px low
     and 14% small, and the + then rises up into the tip. Reproduced here the way both launch roads reach it: the + is
     stamped with the exact classes stampIntro() gives it, and Home re-renders its EMPTY Projects tab, which calls
     arrowSoon() -> FM.homeArrow.draw() two frames later, inside the +'s delay. Measured on HEAD (tools/shot.py, a real
     first launch in a 440x956 phone frame): see plan — the tip ends ~25px from the centre of a 29px-radius +.
     CONTROL first: the same arrow drawn with the + at rest must land exactly where the code aims it — proves the tip is
     read correctly, so a red below is the timing, not the measuring. */
  test('the arrow to the + ends outside the + even when Home opens with the + still rising in (queue 957)', { item: '957', budgetMs: 60000 }, async function () {
    if (!FM.homeArrow || !FM.home || !FM.projects) throw new Error('need FM.homeArrow, FM.home and FM.projects');
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const U = [Math.cos(-52 * Math.PI / 180), Math.sin(-52 * Math.PI / 180)];
    const tip = () => {            // the main stroke's centre-line is the FIRST mask path; its last point is the tip E
      const mp = document.querySelector('#hm-arrow936 mask path');
      if (!mp) return null;
      const n = mp.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      return [n[n.length - 2], n[n.length - 1]];
    };
    const plus = () => { const p = document.getElementById('hm-new').getBoundingClientRect(); return { cx: p.left + p.width / 2, cy: p.top + p.height / 2, r: p.width / 2 }; };
    const finiteAnims = el => el.getAnimations().filter(a => { const t = a.effect.getComputedTiming(); return isFinite(t.endTime) && a.playState !== 'finished' && a.playState !== 'idle'; });
    const home = document.getElementById('home-screen'), fab = document.getElementById('hm-new');
    if (!home || !fab) throw new Error('need #home-screen and #hm-new');
    const hadHome = FM.home.isOpen(), list0 = FM.projects.list, look0 = document.documentElement.getAttribute('data-home');
    const rows = [];
    const oneCase = async (label) => {
      FM.home.refresh(); await wait(700);             // the empty Projects tab, settled: no entrance on the +
      if (!document.querySelector('#home-screen .hm-grid .hm-empty-title')) throw new Error(label + ': the Projects tab is not showing its empty state');
      if (finiteAnims(fab).length) throw new Error(label + ': the + is still animating before the case starts');
      // CONTROL — drawn with the + at rest, the tip is exactly radius + 12 from the centre, up and to the right
      FM.homeArrow.draw({ still: true });
      const P0 = plus(), E0 = tip();
      if (!E0) throw new Error(label + ': control: no arrow was drawn at rest (is the frame tall enough for the swoop?)');
      const d0 = Math.hypot(E0[0] - P0.cx, E0[1] - P0.cy);
      if (Math.abs(d0 - (P0.r + 12)) > 1) throw new Error(label + ': control: at rest the tip is ' + d0.toFixed(1) + 'px from the +\'s centre, the code aims at ' + (P0.r + 12).toFixed(1) + ' — the tip is not being read right');
      // HIS CONDITION — the + stamped exactly as stampIntro() stamps it on a first open, then Home renders the empty tab
      home.classList.add('hm-intro');
      fab.classList.add('hm-in-fab');
      fab.style.animationDelay = '0.545s';           // 0.05 + 9 x 0.055: brand, search, Select, cog, 4 tabs, the empty state
      FM.home.refresh();
      if (!finiteAnims(fab).length) throw new Error(label + ': control: the +\'s entrance did not start, so this case is not his');
      for (let i = 0; i < 60 && (finiteAnims(fab).length || !tip()); i++) await wait(100);   // the + lands; the arrow is there
      await wait(1500);                              // …and the draw-on (1.27s) has finished
      const P = plus(), E = tip();
      if (!E) throw new Error(label + ': no arrow at all once the + had landed — the empty Projects tab must still point at the +');
      const d = Math.hypot(E[0] - P.cx, E[1] - P.cy);
      const want = [P.cx + U[0] * (P.r + 12), P.cy + U[1] * (P.r + 12)], off = Math.hypot(E[0] - want[0], E[1] - want[1]);
      rows.push(label + ' ' + d.toFixed(1) + '/' + (P.r + 12).toFixed(1));
      if (d < P.r + 4) throw new Error(label + ': the arrow\'s tip is ' + d.toFixed(1) + 'px from the centre of a ' + P.r.toFixed(1) + 'px-radius + — INSIDE it (his "the arrow is inside of the plus button"). It was aimed while the + was still rising in.');
      if (off > 2) throw new Error(label + ': the tip is ' + off.toFixed(1) + 'px from where it is aimed (radius + 12 at -52°) — ' + d.toFixed(1) + 'px from the centre, wanted ' + (P.r + 12).toFixed(1));
      home.classList.remove('hm-intro'); fab.classList.remove('hm-in-fab'); fab.style.animationDelay = '';
    };
    try {
      FM.projects.list = () => [];                   // an EMPTY Projects tab without touching the suite's own project
      if (!hadHome) FM.home.open();
      await wait(2200);                              // past stripIntro's 2 s timer, in case this open ran the first-open entrance itself
      const pt = home.querySelector('.hm-tab[data-tab="projects"]');
      if (pt && !pt.classList.contains('active')) { pt.click(); await wait(700); }
      for (const w of [440, 380]) {
        await atPhoneWidth(async () => {
          for (const look of ['light', 'dark']) {
            document.documentElement.setAttribute('data-home', look);
            await oneCase(w + ' ' + look);
          }
        }, w);
      }
    } finally {
      home.classList.remove('hm-intro'); fab.classList.remove('hm-in-fab'); fab.style.animationDelay = '';
      FM.projects.list = list0;
      if (look0 == null) document.documentElement.removeAttribute('data-home'); else document.documentElement.setAttribute('data-home', look0);
      FM.homeArrow.clear();
      FM.home.refresh();
      if (!hadHome) FM.home.close();
      await wait(100);
    }
  });
```

## A.7 Verification

1. `python3 tests/_cdp.py --url 'http://localhost:8777/tests/run.html?only=queue%20957%0A936%20a%20fresh%20start'` — both green
   (on HEAD, 957 is red with the message above; 936 is green on both).
2. `python3 tools/shot.py --fresh --width 440 --height 956 --home light --js-file <this folder>/probeA.js` — expect
   `frame.settled.tipToCentre: 41`, `tipInsideDisc: false`, `events.arrowSeen − events.intro ≈ 1100–1200`.
   Repeat `--home dark`, and `--width 380 --height 800` both looks.
3. Eye check on the PNG it writes: the head stops ~12 px off the ring, up-right, like the right half of `A-closeup-now-vs-fixed.png`.
4. Reduced motion: the entrance is `animation: none` there (styles.css 6720–6723), so draw() runs at once as today.
5. PC: nothing to check — the empty Projects arrow is the same code at any width; the 380/440 runs cover it.
6. On his phone (440×956): close the app fully, reopen with no projects — the + rises in, then the arrow draws to it and stops short of the ring.

## A.8 Risks, and tests that could move

- `grep -n "homeArrow\|hm-arrow936" tests/` → only `snap936()` in `tests/collab-agent.js` (`arrow: !!document.getElementById('hm-arrow936')`)
  and the `936 a fresh start …` test (waits ≤15 s for it). Measured green with A1 (it was the test that exposed the need for the timer).
- The new test stubs `FM.projects.list` for ~15 s and restores it in `finally`; Home's render writes nothing to storage.
  If the builder prefers no stub, the same assertion can go into the fresh-boot 936 test via a new collab-agent action
  (same `tip()` / `plus()` maths) — slower, but his literal road.
- The runner frame is 900×760; at 440×760 and 380×760 the swoop has room (measured: drawn at 380×760), so the control's
  "no arrow drawn at rest" message should never fire; it says why if it does.
- The arrow now starts ≈0.84 s later on a first open (A1's whole point). A2 exists if he wants today's timing.

## A.9 Question

- ❓ASK: The arrow waits for the + to finish rising in before it draws (~0.8 s later than now), rather than drawing while the + is still rising — A1 or A2? **Recommended: A1** (can't miss on any phone). Build A1 now; don't block on this.

---

# (B) #958 — PC: the separately-draggable Add menu stops short of the top

## B.1 His words and clauses (verbatim, INBOX 26 Sep ~17:33 → REQUESTS #958)

**His words (verbatim):** "there's an issue with the draggable add menu on PC that goes up and down separate to the timeline layer. And basically, the issue is that it doesn't go as far up as it should be able to go up. unless you drag up the timeline. So it's like kind of still bound to how high the timeline is. You should be able to drag it like up to like the top of the screen, honestly. So it covers up the whole side of the screen. But you know, it, no matter where the timeline is."

His clauses:
1. On PC, the Add menu (the one that drags up and down separately from the timeline, #244) does not go as far up as it should.
2. It only gets higher if you drag the timeline up, so it is still bound to the timeline's height.
3. It should drag right up to the top of the screen, covering the whole side of the screen.
4. That must hold no matter where the timeline is.

## B.2 What exists now

`js/app.js` (the add-menu drag, queue 244):
```
6312    const clampH = (h) => {                                   ← the TIMELINE's clamp
6314      const ceil = vh >= 504 ? Math.round(vh * 0.72) : Math.max(150, Math.round(vh * 0.46));
6317    FM.clampTimelineH = clampH;
6456    const amRez = document.getElementById('am-resizer');
6459      const amFloor = () => bandH();
6460      const amClamp = (h) => {
6478        const ceil = Math.max(200, Math.round(vh * 0.62),
6479                              FM.clampTimelineH ? FM.clampTimelineH(vh) : 0);
6480        return Math.max(amFloor(), Math.min(ceil, h));
6482      FM.clampAddMenuH = amClamp;
6614      /* queue 807: … re-clamped to the same
6616         0.62·vh rule the drag obeys, and the sheet told to follow. */
6620        const h = amHeightNow(), c = amClamp(h);                 ← the window-resize re-clamp uses the same function
```
`styles.css` (PC block): `body.am-floating #inspector-panel { position: fixed; left: var(--am-left, 0); width: var(--am-width, 307px); … bottom: var(--am-bottom, 0); height: var(--am-h, 264px); z-index: 8; border-top: 1px solid var(--line); …}`
and `body #inspector-panel > #am-resizer { display: block; position: absolute; left: 0; right: 0; top: -9px; height: 9px; … }`
— the handle hangs 9 px ABOVE the panel's top edge. On PC `body #topbar { display: none; }` (styles.css, "The rail is
gone"): Back, ?, notes, settings, Export all live in the transport row (`#t-far`) inside the bottom band.

## B.3 Findings — measured

How: `python3 tools/shot.py --width W --height H --js-file probeB.js` at 1280×800, 1920×1080 and 900×800. The probe drives
the REAL handlers with PointerEvents dispatched on `#am-resizer` / `#tl-resizer` (the #244 tests' own way): (a) add menu
dragged to y=0 with the timeline at its default; (b) timeline dragged to y=0 (its max), then the menu; (c) timeline dragged
to the bottom (its min), then the menu. It also reads the panel's computed `max-height`, `--am-bottom`, the top bar, and
every control in the column above the band.

| window | timeline default | (a) menu alone | (b) timeline at max → menu | (c) timeline at min → menu |
|---|---|---|---|---|
| 1280×800 | 240 | **576** (top y=224) | tl 576 → menu **576** (y=224) | tl 150 → menu **576** (y=224) |
| 1920×1080 | 356 | **778** (y=302) | tl 778 → **778** (y=302) | tl 150 → **778** (y=302) |
| 900×800 | 280 | **576** (y=224) | tl 576 → **576** (y=224) | tl 150 → **576** (y=224) |

- The ceiling is **exactly the timeline's own ceiling** (0.72 × window height) whatever the timeline is at: `FM.clampAddMenuH(∞)`
  = `FM.clampTimelineH(∞)` = 576 / 778. That is #512's tie, and it is precisely his "still bound to how high the timeline
  is" — the menu can go as high as the timeline can and no higher. #512's old gap (alone lower than with the timeline) is
  gone; the height is the same in (a), (b) and (c).
- No other limiter: panel `max-height: none`; `--am-bottom` = 0 px in every case; no top bar (`#topbar` `display: none`,
  0 controls); nothing interactive in the column above the band — the only thing the raised menu covers is the stage
  background (`coveredByProto: ["stage"]`). The canvas itself starts right of the column at all three widths
  (preview x = 495 / 773 / 315 vs panel right edge 307 / 400 / 300).
- So the task's ❓ "may it cover the top bar?" does not arise on PC: there is no top bar to cover.

**After the fix (B1 below, run on the patched copy at 1280×800):** (a), (b) and (c) all end at **panel top y=9, height
791, handle y=1–10** (hit-test at y=4 lands on `am-resizer` — still grabbable); the timeline did not move in any case;
`FM.clampAddMenuH(∞)` = 791.

Images:
- `B-options-1280.png` — NOW vs B1 at 1280×800, and a close-up of the top-left corner for B1 vs B2.
- `B-options-1920-and-selected.png` — NOW vs B1 at 1920×1080, and B1 with a layer selected (the band stays raised, #804).

## B.4 Options

- **B1 — Recommended. Up to the top, handle still above the panel's edge.** The menu rises until its drag handle reaches
  the window's top: panel top at y=9 (1280×800: 791 px tall; 1920×1080: 1071). One number changes; the handle, the snap,
  the flash, the coupling and the float all work exactly as today.
- **B2 — Flush to y=0, handle tucked inside the panel's top edge while it is up there.** 9 px more menu; needs an extra CSS
  state for the handle (and its hover pill) when the panel is at the ceiling. Measured grabbable too (hit-test at y=4 →
  `am-resizer`, same as B1's geometry). Not recommended: 9 px is not worth a second handle position.
- (Not offered: stopping under a top bar — there is none on PC.)

## B.5 The exact change (B1)

`js/app.js` — replace the whole `amClamp` (lines 6460–6481: from `      const amClamp = (h) => {` down to the `      };`
just before `      FM.clampAddMenuH = amClamp;`) with (also in `hunk_B1.js`):
```js
      const amClamp = (h) => {
        const vh = window.innerHeight;
        /* queue 958 — UP TO THE TOP OF THE WINDOW, WHEREVER THE TIMELINE IS. Ezra, 26 Sep: *"You should be able to drag it
           like up to like the top of the screen, honestly. So it covers up the whole side of the screen. But you know, it, no
           matter where the timeline is."*
           The ceiling this replaces was max(0.62·vh, the TIMELINE's own ceiling): queue 512 tied the two together so the
           menu could never stop lower alone than it could with the timeline, and that tie is his "still bound to how high the
           timeline is" — measured with the real drag, the menu stopped at 576 of an 800px window (top at y=224) at 900 and
           1280 wide, and at 778 of 1080 (y=302) at 1920, identically with the timeline at its min, its default and its max.
           Nothing above it needs protecting on PC: #topbar is display:none there, and Back / ? / notes / settings / Export
           live in the transport row, inside the band the menu rises out of. So it may rise until its HANDLE — which hangs
           above the panel's top edge — reaches the window's top; any higher and the handle is off screen and the menu could
           never be pulled back down. --am-bottom is the gap the band leaves under it (0 in every PC layout measured; read so
           a band that ever sits higher still stops right). Queue 512's rule holds by construction: this is never below the
           timeline's own ceiling (0.72·vh at most). */
        const below = parseInt(root.style.getPropertyValue('--am-bottom'), 10) || 0;
        const ceil = Math.max(200, vh - below - (amRez.offsetHeight || 9));
        return Math.max(amFloor(), Math.min(ceil, h));
      };
```
…and in the window-resize re-clamp comment (lines 6614–6616) replace
```
         so the handle could end up above the screen with no way to reach it; re-clamped to the same
         0.62·vh rule the drag obeys, and the sheet told to follow. */
```
with
```
         so the handle could end up above the screen with no way to reach it; re-clamped by amClamp — the
         same rule the drag obeys (queue 958: up to the window's top, handle on screen) — and the sheet
         told to follow. */
```
Notes:
- `root` and `amRez` are already in scope there (`amPinSlot` writes `root.style.setProperty('--am-bottom', …)` in the same block;
  `const amRez` is line 6456). `--am-bottom` is written by `amPinSlot()` on every pointerdown and by `amRepin` on resize, both
  before `amClamp` runs; before any drag it is unset → 0.
- The timeline's own ceiling (0.72·vh) is unchanged — he asked about the Add menu.
- **Cache-buster:** `index.html` line 1109 `<script src="js/app.js?v=458">` → `?v=459` (or one more than whatever it is by then).
  No CSS change.

## B.6 The proving test (in `test_B.js`, identical)

Paste into `tests/tests.js` after the (A) test. Why it fails on HEAD: it drags the real handle to y=0 with the timeline at
its min and at its max, at the runner's PC width, 1280 and 1920; HEAD's ceiling is 0.72·vh. **Run on HEAD through the real
runner: FAIL — `at 900x760 with the timeline at its min (150px) the add menu stops with its top at y=213 (handle at
y=205)`.** With B1: PASS (window 1280 and window 380). Controls: the timeline drag must reach its asked-for end (else "min"
and "max" are not two cases), and the menu must have left the grid (else the gesture never engaged). It also re-asserts the
#244 promises this could break: the timeline does not move, and the raised menu's bottom stays on the band's line.

```js
  /* ═══ QUEUE 958 — THE ADD MENU DRAGS RIGHT UP TO THE TOP, WHEREVER THE TIMELINE IS ══════════════════════════════════
     Ezra, 26 Sep: *"there's an issue with the draggable add menu on PC that goes up and down separate to the timeline layer.
     And basically, the issue is that it doesn't go as far up as it should be able to go up. unless you drag up the timeline.
     So it's like kind of still bound to how high the timeline is. You should be able to drag it like up to like the top of
     the screen, honestly. So it covers up the whole side of the screen. But you know, it, no matter where the timeline is."*
     The ceiling was max(0.62·vh, the timeline's own 0.72·vh ceiling) — #512 tied it to the timeline's clamp. Measured with
     this same drag before the fix: 576 of an 800px window (top at y=224) at 900 and 1280 wide, 778 of 1080 (y=302) at 1920,
     identically with the timeline at its min, default and max; in the suite's 900x760 frame it stops at y=213.
     Driven through the REAL handlers with PointerEvents dispatched on both handles (the way the #244 tests drive them), with
     the timeline at its MIN and at its MAX, at three PC widths. "The top" = the handle (which hangs 9px above the panel's
     top edge) at y=0: any higher and it is off screen and the menu could never be pulled back down. Every #244 behaviour
     that this touches is re-asserted: the timeline does not move, and the menu's bottom stays on the band's line. */
  test('the add menu drags right up to the top of the window, wherever the timeline is (queue 958)', { item: '958', budgetMs: 60000 }, async function () {
    const frame = () => new Promise(r => setTimeout(r, 60));
    const root = document.documentElement, body = document.body;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    const tl0 = root.style.getPropertyValue('--tl-h');
    let ls0 = null; try { ls0 = localStorage.getItem('fm_tl_h'); } catch (e) {}
    const savedSel = FM.scene.selectedId;
    const run = async (w) => {
      const am = document.getElementById('am-resizer'), tlr = document.getElementById('tl-resizer');
      const panel = document.getElementById('inspector-panel'), tlp = document.getElementById('timeline-panel');
      if (!am || !tlr || !panel || !tlp) throw new Error('need #am-resizer, #tl-resizer, #inspector-panel and #timeline-panel');
      const drag = async (el, toY) => {
        const r = el.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y0 = Math.round(r.top + r.height / 2);
        const pe = (t, y) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: t === 'pointerup' ? 0 : 1 }));
        pe('pointerdown', y0);
        for (let i = 1; i <= 8; i++) { pe('pointermove', Math.round(y0 + (toY - y0) * i / 8)); await frame(); }
        pe('pointerup', toY); await frame();
      };
      for (const at of ['min', 'max']) {
        if (FM.dropAddMenuFloat) FM.dropAddMenuFloat();
        root.style.removeProperty('--tl-h'); await frame();
        FM.selectLayer(null); if (FM.inspector) FM.inspector.refresh(); await frame();
        await drag(tlr, at === 'max' ? 0 : window.innerHeight - 2);
        const tlH = FM._bandH(), wantTl = FM.clampTimelineH(at === 'max' ? 999999 : 0);
        // CONTROL: the timeline drag engaged and reached the end asked for, so "min" and "max" really are two cases
        if (Math.abs(tlH - wantTl) > 2) throw new Error('control: at ' + w + 'px wide the timeline drag did not reach its ' + at + ' (' + tlH + 'px, wanted ' + wantTl + ') — the gesture never engaged, so nothing below would mean anything');
        const tlBox = tlp.getBoundingClientRect();
        await drag(am, 0);
        const p = panel.getBoundingClientRect(), h = am.getBoundingClientRect(), t2 = tlp.getBoundingClientRect();
        // CONTROL: the add-menu drag engaged (it left the grid and grew)
        if (!body.classList.contains('am-floating')) throw new Error('control: at ' + w + 'px wide (timeline at its ' + at + ') the add-menu drag never raised the menu');
        if (h.top < -0.5) throw new Error('at ' + w + 'px wide the add menu\'s handle ended at y=' + Math.round(h.top) + ' — off the top of the window, so the menu could never be pulled back down');
        if (h.top > 3) throw new Error('at ' + w + 'x' + window.innerHeight + ' with the timeline at its ' + at + ' (' + tlH + 'px) the add menu stops with its top at y=' + Math.round(p.top) + ' (handle at y=' + Math.round(h.top) + ') — he wants it "up to like the top of the screen … no matter where the timeline is"');
        // #244 kept: it floats OVER the canvas, so the timeline has not moved, and its bottom is still the band's line
        if (Math.abs(t2.top - tlBox.top) > 1 || Math.abs(t2.height - tlBox.height) > 1) throw new Error('raising the add menu moved the timeline (' + Math.round(tlBox.top) + ' → ' + Math.round(t2.top) + ') — it must go over the canvas, not push');
        if (Math.abs(p.bottom - t2.bottom) > 2) throw new Error('the raised add menu\'s bottom left the band: ' + Math.round(p.bottom) + ' against the timeline\'s ' + Math.round(t2.bottom));
      }
    };
    try {
      if (hadHome) FM.home.close();
      await frame();
      if (matchMedia('(min-width: 701px)').matches) await run(window.innerWidth);
      else await atWideWidth(() => run(900), 900);   // the 380 pass: the gesture is PC-only, so force the runner's PC width
      await atWideWidth(() => run(1280), 1280);
      await atWideWidth(() => run(1920), 1920);
    } finally {
      if (FM.dropAddMenuFloat) FM.dropAddMenuFloat();
      body.classList.remove('am-floating', 'am-resizing', 'tl-resizing');
      if (tl0) root.style.setProperty('--tl-h', tl0); else root.style.removeProperty('--tl-h');
      try { if (ls0 == null) localStorage.removeItem('fm_tl_h'); else localStorage.setItem('fm_tl_h', ls0); } catch (e) {}   // the drags persisted a height
      FM.selectLayer(savedSel || null); if (FM.inspector) FM.inspector.refresh();
      if (hadHome && FM.home && FM.home.open) FM.home.open();
      await frame();
    }
  });
```

## B.7 The existing test that must be retuned (computed, not run in its old form against the fix)

`a window that shrinks under a raised inspector pulls it down to the clamp (queue 807)` — tests/tests.js 53834:
```
      const tall = Math.round(window.innerHeight * 0.95);
```
It assumed the ceiling sits below 0.95 of the window. In the 760-px runner frame B1's ceiling is 751 > 722, so the resize
would leave 722 alone and the test would throw "still 722px tall". Replace that line with:
```
      const tall = window.innerHeight + 100;   // queue 958: the drag may now reach the window's top, so "too tall" means taller than the window
```
(Measured: the retuned test is green with B1 at window 1280 and 380. prove.sh will list it as DEAD — it passes on HEAD too —
which is expected for a retune; say "retuned #807's height, not removed" in the POLISH-LOG line.)

## B.8 Tests re-run on the patched copy (all through the real runner, `?only=`), and one known filtered-run red

Green with B1 + A1 (window 1280): `the add menu drags up over the canvas without shrinking it` (56465),
`the add menu grows UPWARD only, and its handle rides its own top edge (queue 244 reopen)` (56515),
`dragging the TIMELINE up into a raised add menu snaps them back together (queue 244)` (56588),
`the add menu cannot be dragged below the timeline, and its clamp is real` (56645),
`the inspector drags as high on its own as it does with the timeline (queue 512)` (53850),
both `(queue 807)` tests (53790, 53825 retuned), `a raised band stays raised … (queue 804)` (51532),
`a raised add menu keeps its column when the window is resized (queue 478)` (71192),
both `(queue 511 …)` tests (51396 and the Director one), and the add-menu look tests matched by `add menu`.
Window 380: 957, 958, both 807, 512, `the add menu cannot be dragged below …` — 6/6 green.

⚠️ `the add-menu drag handle sits outside the panel, clear of the project name, and hides until hover (queue 302)` (56410)
is RED in a filtered run — **on HEAD as well** (paired: same red, same message *"the pointer at the handle's own centre lands
on hm-scroll"*). A filtered run boots onto Home (#942) and this test never closes it; in the full suite an earlier test has.
Not caused by either change — don't chase it; run it inside the full suite.

One command for the family:
`python3 tests/_cdp.py --url "http://localhost:8777/tests/run.html?only=queue%20957%0Aqueue%20958%0Aadd%20menu%0Aqueue%20512%0Aqueue%20807%0Aqueue%20804%0Aqueue%20478%0Aqueue%20511%0A936%20a%20fresh%20start"`

## B.9 Verification

1. The command above: green (the 302 test is not in it on purpose).
2. `python3 tools/shot.py --width 1280 --height 800 --js-file <this folder>/probeB.js --frames 800 --out b.png` — expect
   `a_amAloneDefaultTL`, `b_amAfterTlMax`, `c_amAfterTlMin` all `panel: [0, 9, 307, 791]`, `handle: [0, 1, 306, 9]`,
   `blocked: 0`. Repeat `--width 1920 --height 1080` (expect 1071) and `--width 900 --height 800` (expect 791).
3. Eye check (1280 and 1920 PNGs): the menu reaches the top; the handle pill appears on hover at the very top edge and
   drags it back down; pushing it down past the timeline's line still snaps, flashes blue, then drags the timeline.
4. With a layer selected at full height (the band stays raised, #804): the inspector sits at the top, reachable, handle there.
5. Phone (380 and 440×956): unaffected — the float does not exist there (`amRez` pointerdown returns on `isPhone()`); the
   test's 380 pass forces PC widths itself. Light/dark: no colour change in this item.

## B.10 Risks

- At full height the inspector's option cards (with a layer selected) stay at their #807 maximum (101 px) and the lower
  half of the panel is empty — visible in `B-options-1920-and-selected.png`. That is #963's subject ("shrink well / behave
  as one system"), not this item; `../panels/plan.md` (#963) owns it. If #963 is built first, re-run this plan's 958 test
  and the #807 pair after it — both plans touch the floated panel's height.
- On narrow PC windows (701–~800 px) the raised column can overlap the canvas — which #244 asked for ("just go over the
  canvas"). Unchanged in kind, just taller.
- The Effects browser sheet placed in the inspector (`placeSheet`) follows the panel's rect, so it opens full height too — intended.

## B.11 Question

- ❓ASK: The Add menu drags up to the top of the screen with its drag handle just above it (B1) — or flush to the very top with the handle tucked inside (B2)? **Recommended: B1** (same handle as everywhere, 9 px difference). Build B1 now; don't block on this.

---

## Review (skeptical pass, 26 Sep ~23:50, against the tree at acae12a5 v17.05 + uncommitted REQUESTS/INBOX edits)

Checked, no change needed:
- Every file:line and quoted anchor exists in the current tree: `js/home-arrow.js` 12–19 and 107, `js/home.js` 1640–1653 /
  2423 / 2538 / 2623–2624, `styles.css` 6699 / 6719 / 6720–6723 / 7123 / 7733 / 8829 / 8858, `js/app.js` 6312 / 6317 / 6456 /
  6459–6482 / 6614–6620, `index.html` 1096 / 1109, `tests/tests.js` 53825 / 53834 / 53850 / 56410–56645 / 71192 / 94158 / 94218.
  `root` (app.js 6276) and `amRez` (6456) are in scope for hunk B1. The plan's code blocks are byte-identical to `hunk_*.js`
  / `test_*.js`, and `apply_patch.py` applied every hunk to a fresh `git archive HEAD` copy with each anchor matched once.
- `?only=` takes newline-separated names (tests.js 59525), so the one-command filters work. The 302 handle test is not in the
  family command because its name says "add-menu" (hyphen), not "add menu".
- The four images open, are ≤1200 wide and <3× tall, and show what the captions say.
- His verbatim words for #957 and #958 match REQUESTS.md 33373 / 33417; every #958 clause is covered; #957 clause 1 is covered.

Re-measured by me (because `test_B.js` and `hunk_A1.js` were last edited AFTER the planner's last runs, and the planner's
1280 family run used the FIRST A1 version, the one that turned 936 red):
- HEAD + the two final tests only (port 8795): **957 FAIL** "440 light: … 25.3px … INSIDE it"; **958 FAIL** "at 900x760 with
  the timeline at its min (150px) … top at y=213 (handle at y=205)". Both fail for the stated reason.
- HEAD + every final hunk (port 8794), window 1280: 957, 958, `936 a fresh start …`, the retuned #807 — **4/4 green**; the
  family (`add menu`, 512, 807, 804, 478, 511) — **21/21 green**. Window 380: 957, 958, 936, both 807, 512 — **6/6 green**.
  Both servers stopped and both copies deleted afterwards.

Changed in this file:
- Said where #957 clauses 2–4 and #963 are planned (`../clapper/`, `../panels/`), and that this ships #957 clause 1 only —
  #957 must stay open (tick the clause, not the entry).
- Labelled the A table as measured at v17.03 and why it still holds at v17.05 (no diff in home.js / home-arrow.js).
- Cache-buster for home-arrow.js: "or one more than whatever it is by then", like app.js's.
- B.10: #963's plan owns the empty lower half of a full-height inspector; re-run 958 and #807 if #963 lands first.

Still unverified (unchanged from the planner's list): iOS WebKit / his phone for A1's `finished` + timer path; why an
off-screen frame did not finish the +'s entrance (inferred); A2 beyond the prototype.
