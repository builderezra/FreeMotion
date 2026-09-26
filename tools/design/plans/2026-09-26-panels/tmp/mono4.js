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
var T = window.FM.tileFit, checked = 0, errs = [];
var ladders = [['stack','row','icon'], ['stack','icon'], ['stack'], ['ico']];
ladders.forEach(function (lad) {
[3, 9, 14, 30, 67].forEach(function (n) { for (var W = 200; W <= 420; W += 2) {
  var last = null;
  for (var H = 20; H <= 700; H++) {
    var p = T.plan(n, W, H, { ladder: lad });
    if (last && !p) { errs.push('vanish ' + lad + ' ' + n + ' ' + W + ' ' + H); break; }
    if (!p) continue;
    if (last) {
      if (p.pages > last.pages) { errs.push('pages ' + lad + ' ' + n + ' ' + W + ' ' + H); break; }
      if (p.pages === last.pages && (p.comfy || !last.comfy) && T.ORDER[p.kind] > T.ORDER[last.kind]) { errs.push('words ' + n + ' ' + W + ' ' + H); break; }
      if (p.kind === last.kind && p.pages === last.pages && p.ico < last.ico - 0.01) { errs.push('ico ' + lad + ' ' + n + ' ' + W + ' ' + H); break; }
    }
    last = p; checked++;
  }
} }); });
'ladders checked ' + checked + ' errs ' + errs.length + ' ' + errs.slice(0, 5).join(' | ');
