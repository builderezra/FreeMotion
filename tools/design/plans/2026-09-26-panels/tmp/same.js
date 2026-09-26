var window = this; var FM;
/* tilefit.js — ONE way for the PC Add menu and the layer inspector to shrink (queue 963).
 *
 * Ezra, 26 Sep, in full in REQUESTS.md #963: *"When you shrink the add layer or like the layer inspect layer inspector on
 * PC, it should just lose the text when it gets too small. Because it just looks really bunched up when it gets really
 * small. Or just make or just figure out a way for it to shrink and still look good when it's small. … the dynamics of the
 * add layer and the inspector layer are both very different. from each other and honestly they both are shit in their own
 * ways and they're also both good in their own ways so just maybe have a big look through that"*
 *
 * WHAT WAS THERE (measured, see tools/design/plans/2026-09-26-panels/plan.md):
 *   · the Add menu had a real solver (planGrid, queue 50) that sized tiles from the panel's own box — its good half — but it
 *     only knew ONE tile shape (icon over a two-line label, 54px minimum), so below that it gave up and dropped to a fixed
 *     layout that did not fit: a 16px sliver that scrolled at a 150px band;
 *   · the inspector sized its cards from `--tl-h` minus a hand-counted 88px of chrome, always three rows, and the icon took
 *     what the label left: 12px icons under 11.5px text at the band every laptop opens at.
 * Both halves now come from here. The tile has THREE SHAPES — a RUNG — and the panel picks the first one, most words first,
 * that shows every item on one page:
 *     stack  icon over its name (the look both panels have when there is room)
 *     row    a chip: icon on the left, the name beside it — the short-band shape, spends the panel's spare WIDTH on words
 *     icon   the picture alone; the name is the tooltip (it was always the tile's title) — the last resort
 * Same thresholds, same sizes, same CSS (`[data-rung]` in styles.css) for both panels, so at the same box they look the same.
 *
 * `stack` IS THE ADD MENU'S OLD `FIT_CFG.lbl`, NUMBER FOR NUMBER, and `ico` is its old `FIT_CFG.ico` (the Shape tab). Moved,
 * not re-tuned: wherever the old solver already found a one-page stacked grid, this finds the same grid.
 *
 * Nothing here touches the phone: both callers gate on (min-width: 701px) before planning.
 */
(function () {
  'use strict';
  const FM = window.FM = window.FM || {};

  const GAP = 8;          // the grid gap; the CSS reads it back from --tf-gap, so this is the one copy
  const FS_MIN = 9.6;     // the stacked label's smallest font — the stacked height floors are derived from it

  const CFG = {
    /* labelled, icon over name — the add menu's FIT_CFG.lbl, unchanged (see the long note that used to sit on it in
       js/addmenu.js, kept there in git history: every number is a measured floor, not taste). */
    stack: { minW: 44, maxW: 118, minH: 40, maxH: 118, padV: 7, padH: 4, padVMin: 2, padHMin: 2, aspect: 1.45, icoGap: 5, icoMin: 19, icoMax: 46, lines: 2 },
    /* the Shape tab's icon-only art tiles — FIT_CFG.ico, unchanged (queue 760: 46px tiles, 40px art). */
    ico: { minW: 46, maxW: 110, minH: 44, maxH: 110, padV: 8, padH: 6, padVMin: 0, padHMin: 0, aspect: 1.25, icoGap: 0, icoMin: 40, icoMax: 58, lines: 0 },
    /* THE CHIP. minW 84 is measured, not chosen: the widest single word on either panel is "Adjustment", 51px at 10px
       Arial (the font a <button> gets), and a chip is 5 + a 16–18px icon + 5 + that word + 5 ≈ 84. Below it a word breaks.
       minH 30 is TWO lines at 10px (23px) plus 3.5px each side — so a chip always has room for its whole name: at 84px
       wide every name on either panel breaks into two lines that fit ("Outline &" / "Shadows"), and none is ever cut to
       "Outline & Sh…". Shorter than that and the name goes altogether (the icon rung), never halfway. maxH 48: past it a
       chip is a tall button with a small icon in its corner — the bunched look again — so the grid centres the rows in
       the slack instead. */
    row: { minW: 84, maxW: 190, minH: 30, maxH: 48, padV: 3.5, padH: 5, icoGap: 5, icoMin: 16, icoMax: 22, fsMin: 10, fsMax: 11.5, lines: 2 },
    /* THE LAST RESORT. 32 x 28 is the smallest tile it may draw: wider than the 24px page arrows this panel already
       ships, and 28 tall is what lets the Add menu keep one row of icons AND its pager inside a 150px band. */
    icon: { minW: 32, maxW: 72, minH: 28, maxH: 72, pad: 6, aspect: 1.1, icoMin: 18, icoMax: 34, lines: 0 },
  };
  // the stacked label's reserved band (gap + two lines at the smallest font), a CONSTANT so the plan stays monotonic
  CFG.stack.band = CFG.stack.icoGap + Math.ceil(FS_MIN * 1.2 * CFG.stack.lines) + 2;   // 31
  CFG.ico.band = 0;

  /* THE OPTION EZRA PICKED (plan.md §4) is these two lines and nothing else.
     LADDER — the tile shapes allowed, most words first.  GATE — the smallest ICON a rung may draw and still count as
     comfortable: a stacked tile whose picture would come out under 22px (the size of the Add menu's own tab icons) is the
     bunched look — HEAD drew 12px icons under 11.5px names — so below it the next rung gets its turn. A plan that misses
     its gate is still used when nothing further down the ladder fits either: a preference, never a way to show nothing. */
  const LADDER = ['stack', 'row', 'icon'];
  const GATE = { stack: 22 };
  const ORDER = { stack: 0, ico: 0, row: 1, icon: 2 };

  const r1 = (x) => Math.round(x * 10) / 10;
  const clamp = (lo, v, hi) => Math.max(lo, Math.min(hi, v));

  /* STACK / ICO — js/addmenu.js's fitArt, moved verbatim: the icon is sized against the CONSTANT band first, then the font
     takes what the icon left. Padding is decoration and gives way before the icon does. */
  function artStack(c, w, h) {
    const availH = h - c.band;
    let ico = Math.min(c.icoMax, availH - c.padV * 2, w - c.padH * 2);
    let padV = c.padV, padH = c.padH;
    if (ico < c.icoMin) {
      ico = Math.min(c.icoMax, c.icoMin, availH - c.padVMin * 2, w - c.padHMin * 2);
      padV = c.padVMin; padH = c.padHMin;
    }
    ico = Math.max(0, ico);
    padV = Math.max(c.padVMin, Math.min(padV, (availH - ico) / 2));
    padH = Math.max(c.padHMin, Math.min(padH, (w - ico) / 2));
    const slack = c.lines ? Math.max(c.band - c.icoGap, h - padV * 2 - ico - c.icoGap) : 0;
    let fs = 0, lblH = 0;
    if (c.lines) {
      const t = clamp(0, (w - c.minW) / Math.max(1, c.maxW - c.minW), 1);
      fs = Math.round((FS_MIN + t * 2.4) * 10) / 10;
      fs = Math.max(FS_MIN, Math.min(fs, (slack - 2) / (1.2 * c.lines)));
      fs = Math.round(fs * 10) / 10;
      lblH = Math.max(Math.ceil(fs * 1.2 * c.lines) + 2, slack);
    }
    return { ico, padV, padH, fs, lh: r1(fs * 1.2), lines: c.lines, lblH };
  }
  /* ROW — icon left, name right. The icon follows the chip's height; the font follows its WIDTH, because width is what
     the words need. Two lines where two whole lines fit, otherwise one (the CSS clamps with an ellipsis). */
  function artRow(c, w, h) {
    const ico = clamp(c.icoMin, h - 2 * c.padV - 6, c.icoMax);
    // the words grow with the chip's width, but never past two-thirds of the picture beside them — a name bigger than
    // its icon is the bunched look turned sideways
    const fs = r1(clamp(c.fsMin, Math.min(c.fsMin + (w - c.minW) * 0.03, ico / 1.5), c.fsMax));
    const lh = r1(fs * 1.15);
    const lines = c.lines;
    return { ico, padV: c.padV, padH: c.padH, fs, lh, lines, lblH: lines * lh };
  }
  // ICON — the picture alone, centred; the name stays the tile's title and aria-label.
  function artIcon(c, w, h) {
    const ico = clamp(c.icoMin, Math.min(w, h) - 2 * c.pad, c.icoMax);
    return { ico, padV: Math.max(0, (h - ico) / 2), padH: Math.max(0, (w - ico) / 2), fs: 0, lh: 0, lines: 0, lblH: 0 };
  }
  const ART = { stack: artStack, ico: artStack, row: artRow, icon: artIcon };

  /* The best grid for ONE rung: fewest pages, then the biggest icon, then the biggest tile — js/addmenu.js's planGrid,
     moved verbatim apart from the per-rung art and the row's height cap. Monotonic for the same reasons it always was
     (clamped, never rejected; constant floors), so more room can never buy a smaller icon inside a rung. */
  function planRung(kind, count, W, H, fill) {
    const c = CFG[kind], g = GAP;
    if (!c || !(count > 0) || !(W > 0) || !(H > 0)) return null;
    const hMin = kind === 'stack' || kind === 'ico' ? Math.max(c.minH, c.padVMin * 2 + c.icoMin + c.band) : c.minH;
    const rowsMax = Math.floor((H + g) / (hMin + g));
    if (rowsMax < 1) return null;
    const cMax = Math.max(1, Math.min(count, Math.floor((W + g) / (c.minW + g))));
    let best = null;
    for (let cols = 1; cols <= cMax; cols++) {
      const w = Math.min(c.maxW, (W - g * (cols - 1)) / cols);
      if (w < c.minW - 0.5) continue;
      const hMax = kind === 'row' ? c.maxH : Math.max(hMin, Math.min(c.maxH, w * c.aspect));
      const rTop = Math.min(rowsMax, Math.max(1, Math.ceil(count / cols)));
      for (let rows = 1; rows <= rTop; rows++) {
        const h = Math.min(hMax, (H - g * (rows - 1)) / rows);
        if (h < hMin - 0.5) continue;
        const art = ART[kind](c, w, h);
        const pages = Math.max(1, Math.ceil(count / (rows * cols)));
        let better = !best || pages < best.pages;
        if (!better && pages === best.pages) {
          if (art.ico > best.ico + 1e-6) better = true;
          else if (art.ico > best.ico - 1e-6) {
            /* `fill` (the inspector): on an icon tie, the grid that spans more of the panel's width wins before the bigger
               tile does — so a tall inspector keeps three columns (the look in his 26 Sep screenshot) instead of two
               118px columns with a strip of nothing either side. The Add menu does not pass it: its tie-break is the
               one queue 50 shipped, unchanged. */
            const used = cols * w + g * (cols - 1), bUsed = best.cols * best.w + g * (best.cols - 1);
            if (fill && used > bUsed + 1) better = true;
            else if ((!fill || used > bUsed - 1) && w * h > best.w * best.h + 1e-6) better = true;
          }
        }
        if (better) best = Object.assign({ kind, cols, rows, w, h, perPage: rows * cols, pages, icoGap: c.icoGap || 0 }, art);
      }
    }
    return best;
  }

  /* THE LADDER: the first rung (most words first) that shows everything on ONE page wins; if none can, the plan with the
     fewest pages, and on a tie the wordier rung. Because every rung's candidates only grow with the box, a bigger panel
     can only move UP the ladder — never flip back down to fewer words. */
  /* o (all optional): { ladder, gate, fill } — the defaults are the option Ezra picked; the Shape tab passes its own ladder
     (['ico']), a tab of pictures passes ['stack'], and the inspector passes fill: true. */
  function plan(count, W, H, o) {
    o = o || {};
    const gate = o.gate || GATE;
    let fallback = null;
    for (const kind of (o.ladder || LADDER)) {
      const p = planRung(kind, count, W, H, !!o.fill);
      if (!p) continue;
      p.comfy = p.ico >= (gate[kind] || 0) - 1e-6;
      if (p.pages === 1 && p.comfy) return p;
      if (!fallback || p.pages < fallback.pages || (p.pages === fallback.pages && p.comfy && !fallback.comfy)) fallback = p;
    }
    return fallback;
  }
  // is plan a an improvement on plan b? fewer pages, then a comfortable one, then wordier, then a bigger icon
  function better(a, b) {
    if (!a) return false;
    if (!b) return true;
    if (a.pages !== b.pages) return a.pages < b.pages;
    if (!!a.comfy !== !!b.comfy) return !!a.comfy;
    if (ORDER[a.kind] !== ORDER[b.kind]) return ORDER[a.kind] < ORDER[b.kind];
    return a.ico > b.ico + 0.5;
  }
  // does this plan leave nothing to gain by giving the tabs' words up? (one page, stacked, comfortable)
  function settled(p) { return !!p && p.pages === 1 && (p.kind === 'stack' || p.kind === 'ico') && p.comfy; }

  const VARS = ['--tf-cols', '--tf-cw', '--tf-row', '--tf-gap', '--tf-ico', '--tf-fs', '--tf-lh', '--tf-lines', '--tf-lblh', '--tf-pad', '--tf-icogap', '--tf-box'];
  /* Write a plan onto the element that holds the grid: `data-rung` picks the tile shape in styles.css, the variables size
     it. `box` is the measured box it was planned in; the grid centres itself inside it. null clears everything, and the
     old layout comes back untouched. */
  function apply(el, p, box) {
    if (!el) return;
    if (!p) { VARS.forEach(v => el.style.removeProperty(v)); delete el.dataset.rung; delete el.dataset.tf; return; }
    const s = el.style;
    el.dataset.rung = p.kind;
    // what was measured and what was chosen, for a probe or a bug report: "272x131 row 3c3r"
    el.dataset.tf = (box ? Math.round(box.w) + 'x' + Math.round(box.h) + ' ' : '') + p.kind + ' ' + p.cols + 'c' + p.rows + 'r';
    s.setProperty('--tf-cols', String(p.cols));
    s.setProperty('--tf-cw', p.w.toFixed(2) + 'px');
    s.setProperty('--tf-row', p.h.toFixed(2) + 'px');
    s.setProperty('--tf-gap', GAP + 'px');
    s.setProperty('--tf-ico', p.ico.toFixed(2) + 'px');
    s.setProperty('--tf-fs', (p.fs || 10.5) + 'px');
    s.setProperty('--tf-lh', (p.lh || 12) + 'px');
    s.setProperty('--tf-lines', String(p.lines || 1));
    s.setProperty('--tf-lblh', (p.lblH || 0).toFixed(2) + 'px');
    s.setProperty('--tf-pad', p.padV.toFixed(2) + 'px ' + p.padH.toFixed(2) + 'px');
    s.setProperty('--tf-icogap', (p.kind === 'row' ? CFG.row.icoGap : p.icoGap) + 'px');
    s.setProperty('--tf-box', (box ? box.h : p.rows * p.h + (p.rows - 1) * GAP).toFixed(2) + 'px');
  }

  FM.tileFit = { CFG, LADDER, GATE, GAP, ORDER, plan, planRung, better, settled, apply };
})();
var OLD = (function(){
  var FIT_GAP = 8;        // must match the grid `gap` the fit CSS sets
  /* The pager strip's own height, which the fit hands back before it plans the grid. The phone
   * sheet's row is 15 (a 6px dot on a 9px margin, decoration only); the PC panel's carries the real
   * ‹ › buttons, so it is a 24px row on a 2px margin — 26, and this constant is PC-only because
   * only the fit reads it. Those 11 extra pixels are the whole price of the pager being usable
   * with a mouse, and they are taken out of the grid, so keep the CSS and this number in step. */
  var FIT_DOTS = 26;
  /* One library tile plus its gap, in the PC panel. MEASURED off the rendered grid (63px tile, 8px
     gap) rather than assumed — and CSS still owns the truth, so a test asserts the rendered pitch
     matches these. If that test goes red the numbers here are stale, not the layout. */
  var LIB_ROW_H = 63, LIB_GAP = 8, LIB_PITCH = LIB_ROW_H + LIB_GAP;
  var FS_MIN = 9.6;       // the label font at the smallest tile; the height floors are derived from it
  var FIT_CFG = {
    /* The minimums are not taste — each is the geometric floor of the tile it describes, and this
     * got written twice before it was right, in the same way both times: a floor was set from what
     * looked comfortable, and it quietly FORBADE grids the app had been shipping for versions. A
     * floor that outlaws the shipped layout is not a floor, it is a regression with a justification.
     * Measured on pristine HEAD at 1024x640 classic (panel 285x358, tile box 257x161):
     *   labelled tabs drew 5 columns of 45.0 x 62.5 tiles, 19px icons, ONE page, nothing clipped;
     *   the Shape tab drew 6 columns of 36.2 x 60 tiles holding 34px icons — i.e. 1.1px of side
     *   padding. HEAD is DENSER than anything below; none of these numbers invent a new tightness.
     *
     * What a floor is allowed to protect is the CONTROL, not the decoration around it. So padding
     * is now a RANGE (padV/padH preferred, padVMin/padHMin hard) and every floor is derived from
     * the hard end of it:
     *   ico.minW/minH = icoMin 30 + 2*2 = 34. The previous 42 was derived from the PREFERRED
     *        padding (30 + 6*2) and its stated justification — "w >= minW guarantees w - padH*2 >=
     *        30" — is true only if padH can never move. Measured, 42 makes 6 columns arithmetically
     *        unreachable in a 257px box (floor(265/50) = 5) at the very sizes HEAD ships 36.2px
     *        tiles, and that cost real page turns: classic 800x600 Shape 6 pages -> 7, 1280x720 3 -> 4.
     *   lbl.minW = 44 stays a genuine constant, and is the one floor NOT derived from the icon:
     *        a labelled tile has to fit two lines of text, and the label runs out of room long
     *        before the 18px icon does. 44 sits a hair under HEAD's proven 45.0.
     *   lbl.minH = 40 is only a backstop; the real floor is derived per-plan from the label band
     *        (2*2 + 18 + 5 + lblH, so 53 at the 9.6px font a 45px tile draws). The old 58 was 5px
     *        too tall to allow the SECOND ROW that HEAD draws at classic 800x600, which is why
     *        Elements — nine items — turned one page into two and left 59px of panel empty.
     *   aspect caps how letterbox-tall a sparse tab may grow its tiles. 1.25 for icon-only art;
     *        1.45 for labelled, because HEAD ships 62.5/45 = 1.39 and a cap under what ships is
     *        the same mistake again — at 1.25 the 1024x640 Elements tile shrank 63 -> 56 for
     *        nothing.
     *   maxW / maxH 118 are LEFT WHERE THEY WERE, and that is a measured decision rather than an
     *        oversight — the sparse tabs (Media / Audio / Template, one to three entries) do leave
     *        up to 124px below their row at the widest PC panels. Raising the cap does not spend
     *        that space on anything you can see: at a 118px tile the icon is ALREADY at icoMax 46
     *        (min(46, 118-8, 118-14-31) = 46), so every extra pixel of tile becomes padding around
     *        an icon that has stopped growing. A 3-entry tab cannot fill a 380x313 panel with tiles
     *        without drawing absurd ones; what it can do is stop dumping the slack in one block at
     *        the bottom, which is what `align-content: center` in the fit CSS now does. */
    /* icoMin IS THE SHIPPED ICON, EXACTLY. 19px for a labelled card and 34px for a shape tile are
     * not chosen numbers — they are what styles.css draws in the un-measured layout
     * (`.addmenu--panel:not(.addmenu--fit) … .addmenu-ic svg { width: 19px }` and
     * `.addmenu-card--ico .addmenu-ic svg { width: 34px }`), so a panel the fit has taken over can
     * never hand back smaller art than the same panel without it. The floors that sit under them —
     * minW / minH and padHMin / padVMin — are then arithmetic, not taste: a tile has to be at least
     * icoMin + twice the hard padding on each axis, or the icon it is supposed to protect gets
     * clipped by its own card. The PREFERRED padding (padV / padH) is unchanged; it is spent first
     * and only compressed when the tile is tight, and the label band then takes whatever room is
     * left.
     * ico's HARD padding is 0 on both axes, and that is the number that looks wrong until you price
     * it. Every pixel of hard padding raises the smallest legal shape tile, and a 2px floor on each
     * axis is a whole ROW or COLUMN in a tight box. Measured, at the real panel boxes: padHMin 1
     * (tile floor 36) costs the tenth column at Studio 2560x1440 and turns "all 67 shapes on one
     * page" into two, and the ninth column at Studio 1440x900, 4 pages into 5; padVMin 2 (tile floor
     * 38) turns Studio 1280x720 from two rows of 43.5px tiles, 5 pages, into one row of 79px ones,
     * 10 pages. With both at 0 the 34px floor is FREE: identical page counts to the 30px floor it
     * replaces at all seven measured boxes (31) and over a 3,780-box sweep (11,767), with 4px more
     * art everywhere it used to bottom out. At the floor the art meets the card edge, which is what
     * HEAD already does horizontally — its densest tile is 36.2px around 34px of art. */
    // labelled cards (Elements / Media / Audio / Template)
    lbl: { minW: 44, maxW: 118, minH: 40, maxH: 118, padV: 7, padH: 4, padVMin: 2, padHMin: 2, aspect: 1.45, icoGap: 5, icoMin: 19, icoMax: 46, lines: 2 },
    // icon-only cards (Shape) — the name lives in the tooltip, so all the height goes to the art
    /* BIGGER ON PC (queue 760 clause 1, his words: "on pc make the shape buttons bigger"). The 3 Sep sheet drew the grid at 40px as
       shipped (seven across), 48px (six across, recommended) and 56px; decided under rule 16 as 48. minW/minH lift the floor the
       solver may not go under, icoMin the art inside it; measured at 1280 before: 39.7x35 tiles, 34px art. Say 40 or 56 to change. */
    ico: { minW: 46, maxW: 110, minH: 44, maxH: 110, padV: 8, padH: 6, padVMin: 0, padHMin: 0, aspect: 1.25, icoGap: 0, icoMin: 40, icoMax: 58, lines: 0 },
  };
  /* The label's RESERVED band, in px, and the one number that makes the fit monotonic.
   * It is a CONSTANT per card kind — the gap plus two lines at the smallest font — not a function
   * of the tile width. It used to be the latter, and that alone accounted for every remaining
   * icon inversion in the sweep: a 1px wider panel pushed the font 10.0 -> 10.1, which pushed the
   * two-line band 26 -> 27, which took a pixel off an icon whose tile had not grown (its height was
   * already at the aspect cap). Measured, classic + studio, 1px steps across the whole real panel
   * range: 15 icon inversions with the band derived from the font, 0 with it fixed here.
   * The font still scales with the tile — it is just chosen AFTER the icon, out of the slack the
   * icon left behind (see fitArt), so it can never take room the icon was already using. */
  Object.keys(FIT_CFG).forEach(function (k) {
    var c = FIT_CFG[k];
    c.band = c.lines ? c.icoGap + Math.ceil(FS_MIN * 1.2 * c.lines) + 2 : 0;   // lbl 31, ico 0
  });
  /* Size the art inside one tile of w x h, and say what padding and label band are left over.
   * The rule is the whole point of the height floors above: PADDING IS DECORATION, THE ICON IS THE
   * CONTROL. So the icon is first sized inside the PREFERRED padding, and only if that would push it
   * under icoMin does the padding compress (never past padVMin/padHMin) to protect the icon. At a
   * roomy panel nothing compresses and the tiles are exactly what they were; at a cramped one the
   * gutter gives way instead of the artwork — which is what lets a second row exist at all in a 90px
   * box, where the old fixed 8px padding made the choice "one row, or an icon below its own floor".
   *
   * ORDER MATTERS, and it is the reverse of what it was. The icon is measured against cfg.band, a
   * CONSTANT; the FONT is then chosen out of whatever the icon did not take. Sizing the font first
   * and the icon from the remainder is what made a wider panel able to hand back a SMALLER icon.
   * ico(w, h) is now non-decreasing in both w and h — both terms of the min() grow, cfg.band never
   * moves — and that is the property the whole monotonicity proof rests on. */
  function fitArt(cfg, w, h) {
    var availH = h - cfg.band;
    var ico = Math.min(cfg.icoMax, availH - cfg.padV * 2, w - cfg.padH * 2);
    var padV = cfg.padV, padH = cfg.padH;
    if (ico < cfg.icoMin) {   // preferred padding starves the art → spend the padding, not the icon
      ico = Math.min(cfg.icoMax, cfg.icoMin, availH - cfg.padVMin * 2, w - cfg.padHMin * 2);
      padV = cfg.padVMin; padH = cfg.padHMin;
    }
    ico = Math.max(0, ico);
    padV = Math.max(cfg.padVMin, Math.min(padV, (availH - ico) / 2));
    padH = Math.max(cfg.padHMin, Math.min(padH, (w - ico) / 2));
    // whatever the icon and its padding did not use is the label's; cfg.band is its guaranteed floor
    var slack = cfg.lines ? Math.max(cfg.band - cfg.icoGap, h - padV * 2 - ico - cfg.icoGap) : 0;
    var fs = 0, lblH = 0;
    if (cfg.lines) {
      var t = Math.max(0, Math.min(1, (w - cfg.minW) / Math.max(1, cfg.maxW - cfg.minW)));
      fs = Math.round((FS_MIN + t * 2.4) * 10) / 10;                       // scale the text with the tile…
      fs = Math.max(FS_MIN, Math.min(fs, (slack - 2) / (1.2 * cfg.lines)));  // …but never past its own band
      fs = Math.round(fs * 10) / 10;
      lblH = Math.max(Math.ceil(fs * 1.2 * cfg.lines) + 2, slack);
    }
    return { ico: ico, padV: padV, padH: padH, fs: fs, lblH: lblH };
  }
  /* Pick the column count / row count / row height / icon size that uses `availW x availH` best for
   * `count` items. Every (columns x rows) pair is costed, and the ranking answers Ezra's sentence in
   * the order he said it — "so they all fit … and I don't have to scroll to see them all", then
   * "make the icons get smaller or bigger depending on how zoomed in you have that area":
   *   1. FEWEST PAGES wins (showing everything is simply "one page", so this subsumes it);
   *   2. then the BIGGEST ICON — the control Ezra named, and the thing that has to track the panel;
   *   3. then the biggest card, so a tie on the icon still spends the leftover on the tile.
   *
   * THIS IS WHY IT IS MONOTONIC, which the shipped version was not. For a fixed (c, rows):
   *   · w and h are non-decreasing in availW / availH (both are clamped maxima, never rejections),
   *   · so ico(w, h) is non-decreasing (see fitArt), and so is w*h;
   *   · pages = ceil(count / (c*rows)) does not depend on the box at all.
   * And the candidate SET only ever grows as the box grows: hMin is a constant now, a column whose
   * share exceeds maxW is CLAMPED to maxW instead of being struck out, and cMax/rowsMax are floors
   * of the box. A maximum, taken over a growing set of individually non-decreasing values, is
   * non-decreasing — so more room can no longer buy a smaller icon.
   * Two things in the old loop broke each half of that:
   *   · `cMin = ceil((availW+g)/(maxW+g))` DELETED the wide-tile candidates as the panel grew. A
   *     3-entry tab went from 3 columns of 117.7px to 4 columns of 86.8px across a 2px panel step
   *     (measured, classic, panel 397 -> 399), because 3 columns had become "too wide to be legal".
   *   · rows was DERIVED (min(rowsNeed, rowsMax)) rather than costed, so the only 6-column layout
   *     ever considered at a given height was the densest one. Shape at box 257x202 was drawn 6c4r
   *     (44.4px tiles) and at 257x206 — a 4px BIGGER box — 5c5r (34.8px tiles), on the same 3 pages,
   *     because 6c4r was not a candidate there at all. */
  function planGrid(count, availW, availH, cfg) {
    var g = FIT_GAP, best = null;
    // the floor is the HARD padding and the CONSTANT band, so it does not move with the tile width
    var hMin = Math.max(cfg.minH, cfg.padVMin * 2 + cfg.icoMin + cfg.band);
    var rowsMax = Math.floor((availH + g) / (hMin + g));
    if (rowsMax < 1) return null;
    var cMax = Math.max(1, Math.min(count, Math.floor((availW + g) / (cfg.minW + g))));
    for (var c = 1; c <= cMax; c++) {
      // CLAMP, don't reject: a column wider than maxW keeps its tile at maxW and leaves the slack
      // to the grid, which centres it. (Rejecting is what made the tile shrink as the panel grew.)
      var w = Math.min(cfg.maxW, (availW - g * (c - 1)) / c);
      if (w < cfg.minW - 0.5) continue;
      var hMax = Math.max(hMin, Math.min(cfg.maxH, w * cfg.aspect));
      var rowsNeed = Math.max(1, Math.ceil(count / c));
      var rTop = Math.min(rowsMax, rowsNeed);   // more rows than the tab needs is only empty cells
      for (var rows = 1; rows <= rTop; rows++) {
        var h = Math.min(hMax, (availH - g * (rows - 1)) / rows);
        if (h < hMin - 0.5) continue;
        var art = fitArt(cfg, w, h);
        var shown = rows * c;
        var pages = Math.max(1, Math.ceil(count / shown));
        var better = !best || pages < best.pages;
        if (!better && pages === best.pages) {
          if (art.ico > best.ico + 1e-6) better = true;
          else if (art.ico > best.ico - 1e-6 && w * h > best.w * best.h + 1e-6) better = true;
        }
        if (better) {
          best = { cols: c, rows: rows, w: w, h: h, fs: art.fs, lblH: art.lblH, ico: art.ico,
                   padV: art.padV, padH: art.padH, perPage: shown, pages: pages, cfg: cfg };
        }
      }
    }
    return best;
  }
return { planGrid: planGrid, FIT_CFG: FIT_CFG }; })();
var T = window.FM.tileFit, diff = 0, n0 = 0, ex = [];
[1,2,3,4,5,6,8,9,12,18,40,67].forEach(function (n) {
  for (var W = 150; W <= 420; W += 4) for (var H = 30; H <= 600; H += 3) {
    ['lbl', 'ico'].forEach(function (k) {
      var a = OLD.planGrid(n, W, H, OLD.FIT_CFG[k]);
      var b = T.planRung(k === 'lbl' ? 'stack' : 'ico', n, W, H, false);
      n0++;
      var same = (!a && !b) || (a && b && a.cols === b.cols && a.rows === b.rows && Math.abs(a.w - b.w) < 1e-9 && Math.abs(a.h - b.h) < 1e-9 && Math.abs(a.ico - b.ico) < 1e-9 && a.fs === b.fs && Math.abs(a.lblH - b.lblH) < 1e-9 && Math.abs(a.padV - b.padV) < 1e-9 && Math.abs(a.padH - b.padH) < 1e-9 && a.pages === b.pages);
      if (!same) { diff++; if (ex.length < 3) ex.push(k + ' n' + n + ' ' + W + 'x' + H + ' old=' + (a && a.cols + 'x' + a.rows + ' ' + a.ico) + ' new=' + (b && b.cols + 'x' + b.rows + ' ' + b.ico)); }
    });
  }
});
'compared ' + n0 + ' plans, differ ' + diff + ' ' + ex.join(' | ');
