## The hunks (paste in this order)

Line numbers are the tree at v17.03 plus the builder's uncommitted v17.04 work, read 26 Sep ~20:00. They WILL drift — find each
hunk by its anchor text, not its number. (Re-checked on v17.05 / acae12a5: every anchor still found exactly once; line numbers within ±2.)

**Or apply them all at once:** `python3 tools/design/plans/2026-09-26-panels/code/apply963.py . --option C` (A / B / C). It
reads the code blocks out of THIS file, requires every anchor exactly once, writes nothing unless all fifteen apply, and bumps
the three `?v=` busters by one from whatever the tree has. It was run on a copy of the tree (v17.03 + uncommitted v17.04,
26 Sep 20:20) — see plan.md §10 for what that copy then did in the suite. Read the diff before shipping (`git diff`).

### H1 — `index.html`: load the planner before the two panels that use it

Anchor (line ~1066):
```html
  <script src="js/addmenu.js?v=80"></script>
  <script src="js/inspector.js?v=392"></script>
```
Replace with (and bump `styles.css?v=` on line ~42 by one as well — styles.css changes too):
```html
  <script src="js/tilefit.js?v=1"></script>
  <script src="js/addmenu.js?v=81"></script>
  <script src="js/inspector.js?v=393"></script>
```
(`js/tilefit.js` is a new file, so ship.sh's buster gate exempts it; addmenu.js / inspector.js / styles.css are changed and
their `?v=` MUST move or ship.sh refuses. Use whatever the numbers are +1 at build time.)

### H2 — new file `js/tilefit.js`

The whole of `code/tilefit.js` in this folder, verbatim. With the option Ezra picks, set the three constants under
`THE OPTION EZRA PICKED` (§5 of plan.md gives the values for each option; `apply963.py --option X` sets them).

### H3 — `js/addmenu.js`: the solver moves out

a) Delete the line (~664):
```js
  var FIT_GAP = 8;        // must match the grid `gap` the fit CSS sets
```
b) Delete from the line (~675)
```js
  var FS_MIN = 9.6;       // the label font at the smallest tile; the height floors are derived from it
```
through the line (~848), inclusive:
```js
  var FIT_VARS = ['--am-cols', '--am-cw', '--am-row', '--am-ico', '--am-fs', '--am-lblh', '--am-pad', '--am-icogap', '--am-gap', '--am-pager'];
```
(that span is FS_MIN, FIT_CFG with its notes, the band loop, fitArt, planGrid and FIT_VARS). Put in its place:
```js
  /* THE SOLVER MOVED TO js/tilefit.js (queue 963). planGrid, fitArt and FIT_CFG lived here; FIT_CFG.lbl is now
   * FM.tileFit.CFG.stack and FIT_CFG.ico is CFG.ico, number for number. It moved because the layer inspector now plans its
   * cards with the same code — two copies of one solver is how the two panels came to shrink in two different ways,
   * which is what he reported. The notes on why every floor is what it is are in git history (v17.03, js/addmenu.js
   * 676–846) and summarised on CFG in tilefit.js. FIT_DOTS and the LIB_* pitch above stay: they are the add menu's own. */
```
Keep `var FIT_DOTS = 26;` and `var LIB_ROW_H = 63, LIB_GAP = 8, LIB_PITCH = LIB_ROW_H + LIB_GAP;` and `var _fitRO = null;`.

### H4 — `js/addmenu.js`: `applyPlan` writes through the shared planner

Replace the whole function (anchor `      function applyPlan(plan, box) {`, ~1163, through its closing `      }` just before
`      /* Deliberately built with textContent and appendChild rather than innerHTML:`) with:
```js
      function applyPlan(plan, box) {
        root.classList.toggle('addmenu--fit', !!plan);
        // the box the plan was made from and the grid it chose — `data-am-fit="338x90 7c2r"` — for a probe or a bug report
        if (plan && box) root.dataset.amFit = Math.round(box.w) + 'x' + Math.round(box.h) + ' ' + plan.cols + 'c' + plan.rows + 'r';
        else delete root.dataset.amFit;
        /* queue 963: the ONE writer both panels share — `data-rung` (the tile's shape) and the --tf-* sizes, including
           --tf-box, the whole measured box the pager takes and the grid centres itself in (what --am-pager was). */
        FM.tileFit.apply(root, plan, box);
      }
```

### H5 — `js/addmenu.js`: the tab row's words, decided once per panel size

a) In `fitBox` (~1161) lower the height guard from 40 to 20 — the icon rung's smallest tile is 28px tall, and at a 150px band
the box under the tabs minus the pager's row is ~29px: with the old guard that box was thrown away before the planner could
use it, and the panel fell back to the sliver. (The library fallback that also reads `fitBox` gives one row for any box
under 71px either way, so nothing else moves.)
```js
        return (w > 40 && h > 40) ? { w: w, h: h } : null;   // no room to plan with → leave the old layout alone
```
becomes
```js
        return (w > 40 && h > 20) ? { w: w, h: h } : null;   // no room to plan with → leave the old layout alone (20: queue 963's icon tiles are 28 tall)
```
Then add a measuring helper directly after `fitBox`'s closing `      }`:
```js
      /* QUEUE 963 — WHEN THE TABS GIVE UP THEIR WORDS. Once per panel size, the same for every tab: it asks whether the
       * ELEMENTS tab (the labelled grid that opens first) would get comfortable stacked tiles on one page with the words
       * kept on the tabs, in the box a tab with no pinned strip gets (measured from the tab row's bottom, not the body's
       * top — Media's pinned strip must not change the answer). Deciding it per tab would make the row jump 64 ↔ 32px as
       * you change tab, and "jumpy" is the word he used for exactly that in v5.46. Monotonic: shrinking the band takes the
       * words away at one height, growing it gives them back at the same height. */
      function tabsSettled() {
        if (!host || !host.clientHeight || !tabsEl.isConnected) return true;
        var pr = host.getBoundingClientRect(), tr = tabsEl.getBoundingClientRect();
        var gap = parseFloat(getComputedStyle(main).rowGap) || 0;
        var top = tr.bottom - pr.top - host.clientTop + host.scrollTop + gap;
        var padB = parseFloat(getComputedStyle(container).paddingBottom) || 0;
        var h = host.clientHeight - top - padB - 2, w = bodyEl.clientWidth;
        var el = TABS[0], n = (typeof el.options === 'function' ? el.options() : (el.options || [])).length;
        return FM.tileFit.settled((n && w > 40 && h > 20) ? FM.tileFit.plan(n, w, h) : null);
      }
```
b) At the top of `drawBody` (anchor, ~1214):
```js
        bodyEl.innerHTML = '';
        pinnedEl.innerHTML = '';
        pinnedEl.classList.remove('is-on');
```
add directly after those three lines:
```js
        // queue 963: measured with the words ON (so the answer cannot depend on the last answer), then set for this size
        var tabsIco0 = root.classList.contains('addmenu--tabs-ico');
        root.classList.remove('addmenu--tabs-ico');
        if (fitOn && FM.tileFit.TAB_WORDS_GO && !tabsSettled()) root.classList.add('addmenu--tabs-ico');
        if (tabsIco0 !== root.classList.contains('addmenu--tabs-ico')) placeGlint();   // the open tab's ring is fitted to its size
```
(`placeGlint` is a function declaration further down in `render`, so it is hoisted; `drawBody` only ever runs after the
mount, when the tabs and their ring exist.)

### H5b — `js/addmenu.js`: re-plan when the box under the title changes, not only the panel

Found by running the hunks on a copy of the tree (plan.md §10): select a layer, then deselect at a 150px band, and the Add
menu came up with NO plan. The render runs while the title line is still 40px tall (the clip keys were showing); the keys
go a tick later (js/timeline.js syncKeyRail, on a setTimeout), the title drops to 33px and the box under it grows 7px — but
the observer only watched the PANEL, whose size had not changed, so nothing re-planned and the menu kept the plan (none) it
had made in the 7px-shorter box. Watch the element the menu is drawn into as well.

Anchor (~1637):
```js
        var sig = host.clientHeight + 'x' + host.clientWidth;
        var ro = new ResizeObserver(function () {
          if (!root.isConnected) { ro.disconnect(); return; }     // a re-render replaced us
          var s = host.clientHeight + 'x' + host.clientWidth;
          if (s === sig) return;
          sig = s;
          drawBody();
        });
        ro.observe(host);
```
Replace with:
```js
        // queue 963: the container too — the title line above it changes height (the clip keys) without the panel moving
        var sig = host.clientHeight + 'x' + host.clientWidth + 'x' + container.clientHeight;
        var ro = new ResizeObserver(function () {
          if (!root.isConnected) { ro.disconnect(); return; }     // a re-render replaced us
          var s = host.clientHeight + 'x' + host.clientWidth + 'x' + container.clientHeight;
          if (s === sig) return;
          sig = s;
          drawBody();
        });
        ro.observe(host);
        if (container !== host) ro.observe(container);
```

### H6 — `js/addmenu.js`: plan with the ladder, one page first

Replace from `        var plan = null, box = null;` (~1336) through `        applyPlan(plan, box);` (~1352) inclusive with:
```js
        var plan = null, box = null;
        if (fitOn) {
          /* QUEUE 963 — the ladder (js/tilefit.js): the first tile shape, most words first, that shows the whole tab on one
             page. The Shape tab keeps its own art tiles; a tab of PICTURES (library frames, template thumbs) keeps stacked
             tiles and pages — a photograph never becomes a chip or loses its caption. */
          var pictures = opts.some(function (o) { return o.mid || o.thumb; });
          var ladder = iconOnly ? ['ico'] : pictures ? ['stack'] : FM.tileFit.LADDER;
          /* ONE PAGE FIRST, IN THE WHOLE BOX. The old order planned against the box minus the pager's row, and only tried
             the whole box if that had ALREADY fitted on one page — so a tab that needed those 26px to fit was drawn on two
             pages with a pager it did not need. Measured: at 1440x900 the nine Elements fit 5x2 in the whole box and were
             drawn five and four over two pages. */
          var box0 = fitBox(0), p0 = box0 && FM.tileFit.plan(opts.length, box0.w, box0.h, { ladder: ladder });
          if (p0 && p0.pages === 1) { plan = p0; box = box0; }
          else {
            var boxD = fitBox(FIT_DOTS), pD = boxD && FM.tileFit.plan(opts.length, boxD.w, boxD.h, { ladder: ladder });
            if (pD) { plan = pD; box = boxD; }
          }
        }
        applyPlan(plan, box);
```
Nothing below it changes: pages are still cut at `plan.perPage`, the library fallback still reads `fitBox`, the dots are still
built only when `pageCount > 1`. (The old "too short for a reserved grid, but maybe not for a bare one" branch is the
`p0` line now: the whole box is always tried, first.)

### H7 — `js/inspector.js`: each card carries its name (for the icon-only tile)

Anchor (in `categoryGrid`, ~3807):
```js
      card.innerHTML = (i < 9 ? '<span class="cat-num">' + (i + 1) + '</span>' : '') +
        '<span class="cat-ico">' + (gico ? icoMulti(gico) : svgIcon(cat.icon)) + '</span>' +
        '<span class="cat-label">' + label + '</span>';
```
Add directly after it:
```js
      /* queue 963: the name, on the card itself. When the band is too short for names the card shows its picture alone, and
         this is what hovering it says and what a screen reader reads (the label span is display:none then). setAttribute,
         so a name can never become markup. */
      card.title = label;
      card.setAttribute('aria-label', label);
```

### H8 — `js/inspector.js`: plan the cards (new function, directly after `categoryGrid`)

Anchor: the end of `categoryGrid`:
```js
    wrap.appendChild(top);
    if (bot.children.length) wrap.appendChild(bot);
    return wrap;
  }
```
Add after it:
```js
  /* QUEUE 963 — THE CARDS ARE PLANNED BY THE SAME CODE AS THE ADD MENU'S TILES (js/tilefit.js), from the box they really
     have: the height left in #inspector under whatever sits above the grid (the Text to Voice row on a text layer; the
     title line, which grows 7px when the clip keys come on) and its width. This replaces the --tl-h arithmetic in
     styles.css (queues 285 / 518 / 672 / 807 / 918.3), which counted 88px of chrome by hand, was 7px out once the keys
     moved onto the title line, and drew 12px icons under 11.5px names at every laptop's default band.
     `fill`: on an icon tie the grid that spans more of the panel wins, so a tall inspector keeps three columns (his 26 Sep
     screenshot) rather than two 118px ones with a strip of nothing either side.
     PC only. On the phone the property sheet keeps its own layout; a stale plan is cleared when the width drops. */
  function fitCards() {
    const wrap = root && root.querySelector(':scope > .cat-wrap');
    if (!wrap || !FM.tileFit) return;
    const pc = !window.matchMedia || window.matchMedia('(min-width: 701px)').matches;
    let plan = null, box = null;
    if (pc && root.clientHeight) {
      const sr = root.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      const top = wr.top - sr.top - root.clientTop + root.scrollTop;
      const padB = parseFloat(getComputedStyle(root).paddingBottom) || 0;
      box = { w: wrap.clientWidth, h: root.clientHeight - top - padB - 1 };
      const n = wrap.querySelectorAll('.cat-card').length;
      plan = (n && box.w > 40 && box.h > 20) ? FM.tileFit.plan(n, box.w, box.h, { fill: true }) : null;
      /* The inspector never pages. If even the smallest tile cannot show every card (a box squeezed by something that
         does not exist yet — a 150px band fits them all), keep the tile the plan chose and let #inspector scroll the rest. */
      if (plan && plan.pages > 1) {
        plan = Object.assign({}, plan, { rows: Math.ceil(n / plan.cols), pages: 1 });
        box = { w: box.w, h: plan.rows * plan.h + (plan.rows - 1) * FM.tileFit.GAP };
      }
    }
    FM.tileFit.apply(wrap, plan, plan ? box : null);
  }
```

### H9 — `js/inspector.js`: call it when the grid is built

Anchor (~6919):
```js
          root.appendChild(quickRow(layer)); root.appendChild(categoryGrid(layer));
```
Replace with:
```js
          root.appendChild(quickRow(layer)); root.appendChild(categoryGrid(layer));
          fitCards();   // queue 963: measured in place, so it has to run after the append
```

### H10 — `js/inspector.js`: and whenever its box changes

Anchor (`init()`, ~6758):
```js
    init() {
      root = document.getElementById('inspector');
```
Add directly after `root = document.getElementById('inspector');`:
```js
      /* queue 963: re-plan the cards whenever #inspector's box changes — the band dragged, the panel raised over the canvas
         (--am-h), the window resized, or the title line growing when the clip keys come on. Observing #inspector rather than
         the panel is what catches that last one: the panel keeps its size, the scroller under the title does not. The
         signature guard stops a re-plan (which never changes #inspector's own box) from looping. */
      if (root && window.ResizeObserver) {
        let sig = '';
        new ResizeObserver(() => {
          const s = root.clientWidth + 'x' + root.clientHeight;
          if (s === sig) return;
          sig = s;
          fitCards();
        }).observe(root);
      }
```

### H11 — `styles.css`: delete the inspector's band arithmetic

Delete the whole block that starts
```css
/* ---- The layer buttons shrink with the band (queue 285) ---------------------------------------
```
(~8614) and ends with the `}` that closes its `@media (min-width: 701px) {` — the line right before
```css
/* ---- The add menu drags independently, over the canvas (queue 244) ----------------------------
```
(~8735). It holds `--cat-h`, `--cat-pad`, `--cat-ico`, `--cat-inner-gap`, `--cat-gap`, the `body.am-floating` copy of the
formula, and the `.cat-card` / `.cat-label` / `.cat-ico svg` rules that used them. Replace it with one line of history:
```css
/* The layer buttons used to shrink by arithmetic on --tl-h here (queues 285 / 518 / 672 / 807 / 918.3). Since queue 963 they
   are planned from their real box by js/tilefit.js — the same planner as the Add menu — and drawn by the [data-rung] block
   after the add menu's fit rules. */
```
(`--insp-extra` is still written by js/timeline.js; nothing reads it any more. Leave the writer — the 803 test asserts its
value — and say so in POLISH-LOG.)

### H12 — `styles.css`: the add menu's fit block hands its tile rules to the shared block

In the block that starts `/* ---- QUEUE 50 (v5.69): PC ONLY — the tile grid is MEASURED against the panel ----` (~5595), the
`@media (min-width: 701px) { … }` body currently holds `.addmenu--fit .addmenu-body`, `.addmenu--fit .addmenu-pager`, the grid
rule, the card/icon/emoji rules and the label rule, all on `--am-*`. Replace that `@media` block (from
`@media (min-width: 701px) {` through its closing `}`, keeping the long comment above it) with:
```css
@media (min-width: 701px) {
  .addmenu--fit .addmenu-body { flex: 0 0 auto; }
  /* the pager takes the whole measured box (see the note above). Kept HERE, at this weight, on purpose: the empty-tab rule
     near the end of the file (`.addmenu--fit .addmenu-pager:has(> .addmenu-page > .am-empty) { height: auto }`) must still
     outrank it, and an id-weighted copy in the shared block would silently beat that and cut "No templates yet" in half. */
  .addmenu--fit .addmenu-pager { height: var(--tf-box); }
  /* Everything else this block used to hold — the grid, the tile, icon and label sizes — is the shared
     [data-rung] block below (queue 963), on --tf-* instead of --am-*, so the Add menu and the inspector are drawn by one
     set of rules. The notes above still describe what those rules do and why. */
}
```
Also update the one comment that names the old variable (~9794, "pager height (`--am-pager`, …)") to say `--tf-box`. (`apply963.py` does this too since the review.)

### H13 — `styles.css`: the shared block

Paste `code/tilefit.css` (this folder) directly after the H12 block — i.e. right before
`/* ---- Freehand / Vector drawing overlay + toolbar (v2.39) ---- */`. Its selectors carry an id, so its place in the file is
not what makes it win; it is placed there so the add menu's history and its replacement read together.

### H14 — `tests/tests.js`: retune `672 — the layer-panel labels never collapse to nothing, at any band height`

Anchor (inside its card loop, ~80537):
```js
            const lab = c.querySelector('.cat-label');
            if (!lab || !(lab.textContent || '').trim()) continue;
            const lr = lab.getBoundingClientRect(), cr = c.getBoundingClientRect();
```
Insert between the second and third lines:
```js
            /* queue 963: on the icon-only rung the name is hidden ON PURPOSE and moves onto the card (aria-label / title) —
               that is not the collapse this test guards, so it is checked for its name instead of its height. */
            const wrap963 = c.closest('.cat-wrap');
            if (wrap963 && wrap963.dataset.rung === 'icon') {
              if ((c.getAttribute('aria-label') || '').trim() !== lab.textContent.trim()) throw new Error('at a band height of ' + h + 'px "' + lab.textContent.trim() + '" shows its icon alone and no aria-label names it');
              continue;
            }
```
(With option C this branch does not fire in this test's 180–420 sweep at 1100 wide — 165–205 is the chip rung — but it
keeps the test true for A, and for any future width where 180 reaches the icon rung.)

### H15 — `tests/tests.js`: retune `918.3 — a PC category label shows whole lines only, and both lines of a wrapping one`

Anchor (~80583):
```js
            const txt = lab && (lab.textContent || '').trim();
            if (!txt) continue;
```
Add after them:
```js
            const wrap963 = c.closest('.cat-wrap');
            if (wrap963 && wrap963.dataset.rung === 'icon') continue;   // queue 963: the icon-only rung hides the name on purpose; 963's own test checks the card's aria-label
```
