/* FreeMotion — Text edit mode (Alight Motion style).
 * A focused, full-screen text-entry mode: a big text field docked above the mobile keyboard + a
 * compact top toolbar with exactly four controls — Align · Font · Size · Colour — and a ✓ Done.
 * Everything else (bold/italic, spacing, line-height, curve, outline, animation, captions) stays in
 * the inspector's "Edit Text" category, matching AM (it keeps those out of the focused text bar too).
 * Cloned from crop-tool.js's overlay lifecycle, with all on-canvas geometry stripped.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let active = null;                 // { layerId, prevText, cueIndex, createdCue }
  const MIN_PREVIEW = 120;           // px of canvas that must survive the keyboard lift
  let bar = null, dock = null, panel = null, input = null, pop = null, popKind = '', popBtn = null, popBuild = null;
  let unwatch = null;                // FM.screen.watch()'s one-call unsubscribe
  let stageRO = null;                // ResizeObserver on #stage (desktop card anchor)
  let cueNav = null;                 // the ‹ n/N › strip shown on a caption track

  /* ---- which editor am I? --------------------------------------------------
   * PHONE: a full-screen takeover — toolbar on the top edge, field docked above the keyboard, the
   * app grid collapsed to one cell. DESKTOP: one floating card at the bottom of the stage, with the
   * app left exactly as it was.
   *
   * This string must stay byte-identical to the @media in styles.css. Until v6.17 there was no branch
   * here at all — grep of this file for innerWidth|matchMedia returned nothing — so the phone sheet
   * WAS the desktop layout, and its two halves ended up 1114.8px apart on a 2000x1250 window. A gate
   * that disagrees with the stylesheet by one pixel is worse than no gate: you get a card positioned
   * by this code wearing the phone's CSS, or the reverse. */
  const DESKTOP_MQ = '(min-width: 701px)';
  function isDesktop() { return window.matchMedia(DESKTOP_MQ).matches; }
  // The card's width band, and the clearance it keeps from the stage's bottom edge and from the canvas.
  // Every px of CARD_GAP is a px off the picture you are typing into — the card is docked INSIDE the
  // stage, so the canvas has to shrink to clear it — hence 12 rather than a roomier-looking 16.
  const CARD_MIN = 320, CARD_MAX = 560, CARD_GAP = 12;

  function layer() { return active ? FM.scene.layers.find(l => l.id === active.layerId) : null; }

  /* ---- caption tracks ------------------------------------------------------
   * A caption track's visible string is the CUE at the playhead, not layer.text — so on one of those
   * this editor binds to a cue. Without this, typing on a caption layer wrote to layer.text, which
   * the compositor never reads once captions exist: the field worked, the picture never changed.
   * (That is the whole "captions are fake" experience.) */
  function isCapTrack(l) { return !!(FM.captions && FM.captions.isTrack(l)); }
  function cueList(l) { return (l && Array.isArray(l.captions)) ? l.captions : []; }
  function activeCue() {
    if (!active || active.cueIndex == null) return null;
    return cueList(layer())[active.cueIndex] || null;
  }
  /* Which cue should this session edit? The one live at the playhead; failing that a NEW one there,
   * so typing always has somewhere visible to land. An auto-created cue that is still empty at Done
   * is removed again, so opening the editor by accident leaves no litter. */
  function bindCue(l) {
    if (!isCapTrack(l)) return;
    let i = FM.captions.indexAt(l, FM.time);
    if (i < 0) {
      i = FM.captions.addCue(l, Math.max(0, FM.captions.localTime(l, FM.time)));
      active.createdCue = true;
    }
    active.cueIndex = i;
  }
  function gotoCue(i) {
    const l = layer(); if (!l) return;
    const cues = cueList(l);
    if (!cues.length) return;
    i = Math.max(0, Math.min(cues.length - 1, i));
    // Leaving a cue we invented and never typed into: drop it rather than stranding a blank cue.
    dropEmptyCreated();
    const cues2 = cueList(l);
    i = Math.max(0, Math.min(cues2.length - 1, i));
    active.cueIndex = i;
    const c = cues2[i];
    if (FM.scrubTime) FM.scrubTime((l.start || 0) + c.start + Math.min(0.05, (c.end - c.start) / 2));
    if (input) { input.value = c.text || ''; try { input.focus(); input.select(); } catch (_) {} }
    updateCueNav();
    FM.requestRender();
  }
  function dropEmptyCreated() {
    if (!active || !active.createdCue) return;
    const l = layer(), c = activeCue();
    if (l && c && !(c.text || '').trim()) {
      const cues = cueList(l), k = cues.indexOf(c);
      if (k >= 0) cues.splice(k, 1);
    }
    active.createdCue = false;
  }
  function updateCueNav() {
    if (!cueNav) return;
    const l = layer(), cues = cueList(l);
    const lbl = cueNav.querySelector('.te-cue-lbl');
    if (lbl) lbl.textContent = cues.length ? 'Cue ' + (active.cueIndex + 1) + ' / ' + cues.length : 'Cue —';
  }

  // Built-in families (mirrors inspector.js FONTS); imported fonts come from FM.fonts.list().
  const FONTS = ['Inter, sans-serif', 'Helvetica, Arial, sans-serif', 'Georgia, serif', 'Times New Roman, serif', 'Courier New, monospace', 'Impact, sans-serif', 'Verdana, sans-serif', 'Trebuchet MS, sans-serif', 'Palatino, serif', 'Comic Sans MS, cursive'];
  function fontLabel(css) {
    const mine = (FM.fonts ? FM.fonts.list() : []).find(f => f.css === css);
    if (mine) return mine.name;
    return String(css || 'Inter').split(',')[0].trim();
  }

  const ALIGN_ICON = {
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h10M4 18h13"/></svg>',
    center: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M6 18h12"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M10 12h10M7 18h13"/></svg>',
  };

  function elc(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  // ---- top toolbar buttons -------------------------------------------------
  function updateBarLabels() {
    const l = layer(); if (!l || !bar) return;
    const a = l.align || 'left';
    bar.querySelector('.te-align').innerHTML = ALIGN_ICON[a] || ALIGN_ICON.left;
    const fb = bar.querySelector('.te-font-lbl'); if (fb) fb.textContent = fontLabel(l.fontFamily);
    const sb = bar.querySelector('.te-size-lbl'); if (sb) sb.textContent = Math.round(l.fontSize || 96);
    const sw = bar.querySelector('.te-swatch'); if (sw && FM._fillGet) sw.style.background = FM._fillGet(l);
  }

  function cycleAlign() {
    const l = layer(); if (!l) return;
    const order = ['left', 'center', 'right'];
    l.align = order[(order.indexOf(l.align || 'left') + 1) % 3];
    FM.requestRender(); updateBarLabels();
  }

  // ---- transient sub-popover (font rail / size slider / colour) ------------
  function closePop() { if (pop && pop.parentElement) pop.parentElement.removeChild(pop); pop = null; popKind = ''; popBtn = null; popBuild = null; if (bar) bar.querySelectorAll('.te-btn.on').forEach(b => b.classList.remove('on')); }
  function positionPop() {
    if (!pop) return;
    if (isDesktop()) {
      // The card is docked at the BOTTOM of the stage, so a popover hung UNDER the toolbar the way the
      // phone hangs it would land on the text field it belongs to. Open upwards instead, width-matched
      // to the card — .te-pop's base left:8/right:8 is the phone's full-window inset, which on a 2000px
      // window measured a 1984px-wide rail holding cards that are 76-108px each.
      if (!panel) return;
      /* #147 — Ezra: "this pop up menu on pc is so shit, it literally covers up the text while you
       * edit it, get it off the canvas… you could just put it in the add menu, so it doesnt take up
       * real estate on the screen."
       * MEASURED (tests/_tecover.html) on a 1280x860 window: the editor CARD covers 0.0% of the
       * canvas — layoutDesktop already reserves a band for it and that works. The Aa popover covers
       * **100.0%**. It is the whole complaint, and the card is not.
       * So the popover goes where he said: the side column, which is off the canvas by construction
       * and is already the app's home for exactly this kind of vertical list of controls. Only the
       * popover moves — relocating the card as well would be re-architecture for a surface measured
       * at zero coverage.
       * Falls back to the old over-the-stage placement when that column is too small to hold it
       * (a narrow window, or Studio's short inspector band), so this can never make things worse than
       * they were. */
      const col = document.getElementById('inspector-panel');
      const cr = col && col.getBoundingClientRect();
      if (cr && cr.width >= 200 && cr.height >= 240) {
        /* …below the CARD when the card is in this column too (#147 second half). They used to be able
         * to share the column because only one of them was ever in it; now the popover has to start
         * where the card ends, or the Aa sheet opens straight over the toolbar that summoned it. */
        const cardBottom = panel.classList.contains('te-docked')
          ? Math.round(panel.getBoundingClientRect().bottom + 8) : Math.round(cr.top + 8);
        pop.style.bottom = 'auto';
        pop.style.left = Math.round(cr.left + 8) + 'px';
        pop.style.width = Math.round(cr.width - 16) + 'px';
        pop.style.top = cardBottom + 'px';
        // Only the Aa sheet gets a cap — same reasoning as the fallback below: it is the one popover
        // with overflow-y:auto, so it is the one a max-height can rescue rather than clip.
        if (popKind === 'extras') pop.style.maxHeight = Math.max(140, Math.round(cr.bottom - cardBottom - 8)) + 'px';
        return;
      }
      const r = panel.getBoundingClientRect();
      pop.style.left = Math.round(r.left) + 'px';
      pop.style.width = Math.round(r.width) + 'px';
      /* UP OR DOWN, whichever is not the canvas (queue 249). Opening upward used to be unconditional,
       * capped to "all the room above the card" — and above the card IS the canvas, so on a short
       * window the cap simply licensed covering it. Measured at 900x760: canvas 186x330 at y=14, the
       * popover 560x347 at y=16, i.e. 99.5% of the picture you are typing on, which is his original
       * report word for word.
       * That is a SHORT-WINDOW problem rather than a layout one — it bites whichever desktop layout
       * happens to put the canvas above the card — so the rule is about space, not about layouts:
       * measure the room above the card that is genuinely clear of the canvas, and if there is not
       * enough, open DOWNWARD instead. Below the card is the timeline, which is not the thing you are
       * looking at while you type — the same trade layoutDesktop already makes when the stage is too
       * short to host the card at all. */
      const cvEl = document.getElementById('preview');
      const cvr = cvEl && cvEl.getBoundingClientRect();
      const MIN_POP = 180;
      // Room above the card, stopping at the canvas rather than running over it.
      const clearAbove = Math.round((cvr && cvr.bottom > 0 ? Math.max(0, r.top - cvr.bottom) : r.top) - 2 * CARD_GAP);
      const roomBelow = Math.round(window.innerHeight - r.bottom - 2 * CARD_GAP);
      if (clearAbove < MIN_POP && roomBelow > clearAbove) {
        pop.style.bottom = 'auto';
        pop.style.top = Math.round(r.bottom + CARD_GAP) + 'px';
        if (popKind === 'extras') pop.style.maxHeight = Math.max(140, roomBelow) + 'px';
        return;
      }
      pop.style.top = 'auto';
      pop.style.bottom = Math.round(window.innerHeight - r.top + 8) + 'px';
      // The "Aa" sheet is the one popover that can be taller than the room above the card. It is the
      // only one with overflow-y:auto, so it is the only one a max-height can rescue; the others are
      // 50-89px tall and capping them would clip rather than scroll.
      if (popKind === 'extras') pop.style.maxHeight = Math.max(140, clearAbove) + 'px';
      return;
    }
    if (!bar) return;
    const r = bar.getBoundingClientRect();
    pop.style.top = (r.bottom + 6) + 'px';
  }
  function openPop(kind, build, btn) {
    if (popKind === kind) { closePop(); return; }
    closePop();
    pop = elc('div', 'te-pop te-pop-' + kind);
    build(pop);
    // Same focus guard as the bar, but it must NOT cover the native controls: preventing pointerdown
    // on a range input stops the thumb from dragging, and on a select stops the picker from opening.
    pop.addEventListener('pointerdown', e => {
      const t = e.target;
      if (t && t.closest && t.closest('input, select, textarea')) return;
      e.preventDefault();
    });
    document.body.appendChild(pop);
    popKind = kind; popBtn = btn || null; popBuild = build;
    if (btn) btn.classList.add('on');
    positionPop();
  }
  // Rebuild the open popover in place (a control inside it changed and its sub-rows need re-rendering).
  function rebuildPop() {
    if (!pop || !popBuild) return;
    if (pop.parentElement) pop.parentElement.removeChild(pop);
    pop = elc('div', 'te-pop te-pop-' + popKind);
    popBuild(pop);
    document.body.appendChild(pop);
    positionPop();
  }

  function buildFontRail(host) {
    const l = layer(); if (!l) return;
    const rail = elc('div', 'te-font-rail');
    const addCard = (css, name) => {
      const card = elc('button', 'te-font-card' + (css === l.fontFamily ? ' on' : ''));
      card.type = 'button';
      const abc = elc('span', 'te-font-abc'); abc.textContent = 'Abc'; abc.style.fontFamily = css;
      const nm = elc('span', 'te-font-name'); nm.textContent = name;
      card.append(abc, nm);
      card.addEventListener('click', () => { const ly = layer(); if (!ly) return; ly.fontFamily = css; FM.requestRender(); updateBarLabels(); rail.querySelectorAll('.te-font-card.on').forEach(c => c.classList.remove('on')); card.classList.add('on'); });
      rail.appendChild(card);
    };
    // Settings → Show system fonts. Off = only the fonts you imported, so the rail is your own set.
    const showSystem = !FM.settings || FM.settings.get('systemFonts') !== false;
    if (showSystem) FONTS.forEach(css => addCard(css, css.split(',')[0].trim()));
    (FM.fonts ? FM.fonts.list() : []).forEach(f => addCard(f.css, f.name));
    // Import (AM's "View All Fonts" → here it's the useful action: pull a font off the device)
    const imp = elc('button', 'te-font-card te-font-import', '<span class="te-font-abc">＋</span><span class="te-font-name">Import</span>');
    imp.type = 'button';
    imp.addEventListener('click', () => { if (!FM.fonts) return; FM.fonts.pick(rec => { const ly = layer(); if (!ly || !rec) return; ly.fontFamily = rec.css; FM.requestRender(); updateBarLabels(); if (popKind === 'font') openPop('font', buildFontRail); }); });
    rail.appendChild(imp);
    host.appendChild(rail);
    // scroll the selected card into view
    requestAnimationFrame(() => { const on = rail.querySelector('.te-font-card.on'); if (on && on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest' }); });
  }

  function buildSizePop(host) {
    const l = layer(); if (!l) return;
    const row = elc('div', 'te-size-row');
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '8'; slider.max = '400'; slider.step = '1'; slider.value = String(Math.round(l.fontSize || 96));
    slider.className = 'te-size-slider';
    const val = elc('span', 'te-size-val', String(Math.round(l.fontSize || 96)));
    slider.addEventListener('input', () => { const ly = layer(); if (!ly) return; ly.fontSize = parseInt(slider.value, 10) || 1; val.textContent = slider.value; FM.requestRender(); updateBarLabels(); });
    row.append(slider, val); host.appendChild(row);
  }

  function buildColorPop(host) {
    const l = layer(); if (!l) return;
    const wrap = elc('div', 'te-color-wrap');
    if (FM._colorField && FM._fillGet && FM._fillSet) {
      // Fetch the layer FRESH on each read/write — an undo/redo while the colour popover is open
      // swaps FM.scene.layers, so a captured `l` would write to a stale (detached) layer object.
      wrap.appendChild(FM._colorField(() => { const c = layer(); return c ? FM._fillGet(c) : '#ffffff'; }, v => { const c = layer(); if (c) FM._fillSet(c, v); }));
      wrap.addEventListener('input', updateBarLabels);
      wrap.addEventListener('click', () => setTimeout(updateBarLabels, 0));
    }
    host.appendChild(wrap);
  }

  // "Aa" sheet — the text options AM keeps out of the top bar (Style / Spacing / Line height / Curve /
  // Animate / Captions). Reuses the inspector's builder so there's one source of truth.
  function buildExtrasPop(host) {
    const l = layer(); if (!l) return;
    if (!FM._textExtras) { host.appendChild(elc('div', 'te-extras-empty', 'No extra options')); return; }
    const inner = elc('div', 'te-extras-inner');
    FM._textExtras(l, inner, rebuildPop);   // rebuildPop re-renders this sheet when a sub-control toggles
    host.appendChild(inner);
  }

  /* ---- DESKTOP: place the card, then give the canvas room for it -----------
   * The card is anchored to #stage, not to the window: that is what keeps it off the timeline and off
   * the inspector in BOTH desktop layouts without this file knowing either layout exists. (The old
   * code's answer — collapse the app grid so the stage is the whole window — is exactly what broke
   * Studio, where column 1 is the rail and not the stage.)
   *
   * Same invariant the phone path relies on and documents: #stage's height comes from its GRID TRACK,
   * so writing padding to it never moves the border box `s` this function measured, and the padding
   * cannot feed back on itself pass after pass. */
  /* Is the side column big enough to hold the whole editor? (#147, the second half.)
   * Same host and the same spirit as the Aa popover's move in v6.96 — Ezra asked for the text editing
   * UI to live where Add and the inspector live, "so it doesnt take up real estate on the screen". */
  function dockRect() {
    const col = document.getElementById('inspector-panel');
    const cr = col && col.getBoundingClientRect();
    // Wide enough for the wrapped toolbar, tall enough to leave the Aa sheet somewhere to open below.
    if (cr && cr.width >= 240 && cr.height >= 300) return cr;
    return null;
  }

  function layoutDesktop(m) {
    const stage = document.getElementById('stage');
    if (!panel || !stage) return;
    // The phone pins these two with inline top/bottom. Clear them: a window dragged across 700px
    // mid-edit would otherwise leave a stale offset fighting the card's flex column.
    if (bar) bar.style.top = '';
    if (dock) dock.style.bottom = '';
    /* DOCKED IN THE SIDE COLUMN — the answer to "makes it smaller" (#147).
     * v6.96 moved the Aa panel here and fixed the half he was looking at; the CARD was still costing
     * the canvas a band at the bottom of the stage. Measured at 1280x860: 169px of #stage padding out
     * of a 552px-tall stage, which is where the complaint came from.
     * The entry deferred this on "the column is 286px and the card's minimum is 320px", and that was
     * right as far as it went — measured, the toolbar overflows a 270px column by 45px. But the fix is
     * not a smaller card, it is that a COLUMN has the opposite budget to a bottom bar: width is scarce
     * and height is not (286x552 here). So the toolbar wraps, and the card stops charging the canvas
     * anything at all. Falls back to the floating card whenever the column is too small, so a narrow
     * window is never worse than it was. */
    const dr = dockRect();
    panel.classList.toggle('te-docked', !!dr);
    if (dr) {
      panel.style.bottom = 'auto';
      panel.style.left = Math.round(dr.left + 8) + 'px';
      panel.style.width = Math.round(dr.width - 16) + 'px';
      panel.style.top = Math.round(dr.top + 8) + 'px';
      stage.style.paddingTop = '';
      stage.style.paddingBottom = '';   // the canvas keeps every pixel it had before you started typing
      return;
    }
    panel.style.top = '';
    const s = stage.getBoundingClientRect();
    const w = Math.round(Math.min(CARD_MAX, Math.max(CARD_MIN, s.width - 2 * CARD_GAP)));
    panel.style.width = w + 'px';
    panel.style.left = Math.round(s.left + (s.width - w) / 2) + 'px';
    // MEASURE the card's height rather than adding up its parts: it changes with the field's line
    // count and with the cue strip a caption track adds.
    const h = Math.round(panel.getBoundingClientRect().height);
    // Normally the card sits CARD_GAP above the bottom of the STAGE, which is what keeps it off the
    // timeline and off the inspector in both desktop layouts. But a stage too short to host it — a
    // phone held sideways is 844x390, i.e. over the 701px gate with a 108px stage, and a very short
    // desktop window is the same shape — would get a 145px card laid over a 108px canvas. There, drop
    // to the bottom of the visible WINDOW instead and cover the timeline, which is not the thing you
    // are looking at while you type.
    // Never below the top of a software keyboard either (m.bottom), which sideways phones do have.
    const roomy = s.height >= h + 2 * CARD_GAP + MIN_PREVIEW;
    const floor = roomy ? Math.min(s.bottom, m.bottom) : m.bottom;
    const bottom = Math.max(CARD_GAP, Math.round(m.layoutH - floor + CARD_GAP));
    panel.style.bottom = bottom + 'px';
    // Give the canvas its own room instead of letting the card sit on the text being typed. The card's
    // top edge is layoutH - bottom - h; no second measurement, so no chance of chasing our own write.
    const cardTop = m.layoutH - bottom - h;
    const want = Math.max(0, Math.round(s.bottom - cardTop + CARD_GAP));
    stage.style.paddingTop = '';
    // CLAMPED, same reasoning as the phone path: a picture partly behind the card beats no picture.
    stage.style.paddingBottom = Math.min(want, Math.max(0, s.height - MIN_PREVIEW)) + 'px';
  }

  // ---- keyboard docking (the one thing crop-tool didn't need) --------------
  function onViewport() {
    // ONE source of truth for "where is the part of the page the user can actually see" —
    // js/screen.js, FM.screen. (NOT FM.viewport: that name is the canvas pan/zoom in canvas-edit.js.)
    // Every number here is in LAYOUT coordinates (what
    // getBoundingClientRect reports and what position:fixed resolves against); m.top / m.bottom say
    // where the VISIBLE window currently sits inside that space. On iOS with the keyboard up those
    // are 380 and 844 on a 390x844 phone, not 0 and 844 — see the file header.
    const m = FM.screen.metrics();
    if (isDesktop()) {
      layoutDesktop(m);
      positionPop();
      // Same reason as the phone path below: a padding change fires no resize, so nothing else would
      // tell the selection box the canvas just changed shape.
      if (FM.canvasEdit && FM.canvasEdit.update) FM.canvasEdit.update();
      return;
    }
    // iOS scrolls the whole page up when the keyboard opens, dragging position:fixed elements with it.
    // Re-pin the top toolbar to the top of the VISIBLE (visual) viewport, and the dock just above the
    // keyboard, so neither gets shoved off-screen.
    if (bar) bar.style.top = m.fixedTop + 'px';
    if (dock) dock.style.bottom = m.fixedBottom + 'px';
    // While editing, the whole layout is fixed-position and there is nothing to scroll to — but iOS
    // scrolls the DOCUMENT anyway to bring the focused field into view, which is what "pushes the
    // screen down" is. body{overflow:hidden} does not stop that on iOS; putting the scroll back does.
    FM.screen.unscroll();
    // Lift the canvas above the keyboard + docked field so the text you're typing stays visible.
    // MEASURE the toolbar and the dock instead of assuming their heights — both grow with the
    // safe-area inset, and the dock also grows with the field's own line count; a fixed guess either
    // crops the canvas or leaves a dead band.
    const stage = document.getElementById('stage');
    const barH = bar ? Math.round(bar.getBoundingClientRect().height) : 0;
    const dockH = dock ? Math.round(dock.getBoundingClientRect().height) : 0;
    if (stage) {
      // BOTH paddings, from the same measurement. Re-computing only the BOTTOM one was the v5.89
      // device bug: #stage is not fixed — it is a normal-flow box in the LAYOUT viewport — so when
      // iOS slides the visible window down by offsetTop, the stage's top edge stays where it was and
      // the CSS constant (56px) no longer clears the toolbar. The canvas is centred between a top
      // that did not move and a bottom that tracks the keyboard, so the picture — with the text you
      // are typing in the middle of it — is carried up by exactly offsetTop / 2. On the measured
      // iPhone case that is 190px, and 180pt text ended up entirely behind the toolbar.
      const r = stage.getBoundingClientRect();
      // CLAMPED. On a tall phone the keyboard and the dock leave plenty of room, but on a short one
      // (landscape, a small device, a split view) the toolbar + keyboard + dock can exceed the stage
      // outright and the preview collapses to 0x0 — no picture at all while you type, which is worse
      // than a preview partly hidden behind the keyboard. Neither padding can feed back on itself:
      // #stage's height is imposed by its GRID TRACK, so it does not grow with its own padding, and
      // both numbers are measured from the BORDER box (r), which the padding never moves. Measure
      // the canvas instead of the stage here and every pass chases the last one — a real 8.6px/pass
      // drift, which is what tests/_kbdevice.py --mutate padtop-feedback exists to catch.
      const topPad = Math.min(FM.screen.padTop(r, barH, m), Math.max(0, r.height - MIN_PREVIEW));
      const room = Math.max(0, r.height - topPad - MIN_PREVIEW);
      stage.style.paddingTop = topPad + 'px';
      stage.style.paddingBottom = Math.min(FM.screen.padBottom(r, dockH + 12, m), room) + 'px';
    }
    positionPop();
    // The selection box is positioned from the canvas's live bounding rect, and nothing tells it the
    // stage just changed shape — no window resize fires for a padding change. Without this the box
    // stays where the canvas USED to be the moment the keyboard opens, which is most of what "glitchy"
    // means here. Synchronous, not on the next frame: update() reads getBoundingClientRect(), which
    // flushes the padding written a line ago, so it already measures the new layout — and a rAF here
    // would silently never run wherever rAF is throttled.
    if (FM.canvasEdit && FM.canvasEdit.update) FM.canvasEdit.update();
  }

  // ---- lifecycle -----------------------------------------------------------
  function onInput() {
    const l = layer(); if (!l) return;
    const c = activeCue();
    if (c) c.text = input.value; else l.text = input.value;
    FM.requestRender();
  }

  function commit() {
    const l = layer();
    if (l && input) {
      const c = activeCue();
      if (c) c.text = input.value; else l.text = input.value;
    }
    dropEmptyCreated();
    if (l && FM.captions && Array.isArray(l.captions)) FM.captions.normalize(l);
    if (FM.timeline && FM.timeline.rebuild && l && Array.isArray(l.captions)) FM.timeline.rebuild();
    teardown();
    FM.requestRender();
    if (FM.inspector) FM.inspector.refresh();
    if (FM.history) FM.history.commit();
  }

  function onDocDown(e) {
    if (!active) return;
    if (FM.eyedropper && FM.eyedropper.isActive && FM.eyedropper.isActive()) return;   // the eyedropper owns canvas taps
    const t = e.target;
    if ((panel && panel.contains(t)) || (pop && pop.contains(t))) return;   // tap inside the editor UI
    if (isDesktop()) {
      /* DESKTOP: the card is a modeless panel, not a takeover, so a click on the canvas means "look at
       * my text" / "nudge it", not "I'm finished" — and the event is NOT swallowed, because selecting,
       * dragging and scrubbing all have to keep working while it is open.
       *
       * Committing on it was also a measured data-loss path with no phone equivalent: the editor
       * closed, focus fell to BODY, the physical keyboard was still live, and app.js's bare-key
       * shortcuts took over — one Backspace ran FM.deleteSelected() on the layer just typed into
       * (2 layers -> 1), 's' split it, Space started playback. A phone cannot reach it: there is no
       * physical Backspace outside the field, which is why three rounds of fixes never saw it.
       * Staying open is only HALF the fix, and the other half is not in this file: app.js's keydown
       * guard now skips the bare-key chain while FM.textEdit.isActive(). Do not assume
       * FM.overlayOwnsScreen() covers this — it asks whether a fixed element COVERS the screen, and
       * this card is 560x145. Measured: with that guard removed, blurring the field and pressing
       * Backspace still went 2 layers -> 1 with the editor open.
       *
       * The card FOLLOWS THE SELECTION instead: pick a different layer and the session is over.
       * Checked after the click has been handled, because the selection changes during it. */
      if (pop) closePop();
      setTimeout(() => { if (active && FM.scene.selectedId !== active.layerId) commit(); }, 0);
      return;
    }
    e.preventDefault(); e.stopPropagation();
    if (pop) { closePop(); return; }   // an open sub-popover closes first…
    commit();                          // …otherwise tapping off the editor commits + returns to the grid
  }

  function teardown() {
    active = null;
    closePop();
    if (panel && panel.parentElement) panel.parentElement.removeChild(panel);
    panel = null; bar = null; dock = null;
    input = null; cueNav = null;
    if (stageRO) { stageRO.disconnect(); stageRO = null; }
    // Drop the keyboard-lift — BOTH paddings. Leaving the inline padding-top behind would strand the
    // canvas hundreds of px down the stage for the rest of the session, long after the editor closed.
    const stage = document.getElementById('stage');
    if (stage) { stage.style.paddingTop = ''; stage.style.paddingBottom = ''; }
    document.body.classList.remove('text-editing');
    if (unwatch) { unwatch(); unwatch = null; }
    document.removeEventListener('pointerdown', onDocDown, true);
  }

  FM.textEdit = {
    isActive() { return !!active; },
    layerId() { return active ? active.layerId : null; },
    start(layerId, opts) {
      opts = opts || {};
      const l = FM.scene.layers.find(x => x.id === layerId);
      if (!l || l.type !== 'text') { if (FM.toast) FM.toast('Select a text layer'); return; }
      if (active) teardown();
      if (FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive()) FM.pointEdit.stop();
      if (FM.cropTool && FM.cropTool.isActive && FM.cropTool.isActive()) FM.cropTool.stop();
      if (FM.fillDrag && FM.fillDrag.isActive && FM.fillDrag.isActive()) FM.fillDrag.stop();
      // Close higher z-index overlays so the editor (z:80) isn't shadowed by them.
      if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
      if (FM.fxBrowser && FM.fxBrowser.close) FM.fxBrowser.close();
      if (FM.selectLayer) FM.selectLayer(l.id);
      active = { layerId: layerId, prevText: l.text, cueIndex: null, createdCue: false };
      bindCue(l);   // caption track → this session edits a CUE, not layer.text

      // ---- the editor's one wrapper ----
      // On the phone .te-panel is `display: contents`, so bar and dock behave exactly as they did when
      // both were direct children of <body> — two independent position:fixed elements on the top and
      // bottom edges. On desktop it is the card that holds them as two rows.
      panel = elc('div', 'te-panel');
      document.body.appendChild(panel);

      // ---- top toolbar: Colour · Align · Font · Size · Aa · Done ----
      bar = elc('div', 'te-bar');
      const alignBtn = elc('button', 'te-btn te-align'); alignBtn.type = 'button'; alignBtn.title = 'Alignment';
      const fontBtn = elc('button', 'te-btn te-font', '<span class="te-font-lbl"></span><span class="te-caret">▾</span>'); fontBtn.type = 'button';
      const sizeBtn = elc('button', 'te-btn te-size', '<span class="te-size-lbl"></span><span class="te-size-unit">pt</span><span class="te-caret">▾</span>'); sizeBtn.type = 'button';
      const colorBtn = elc('button', 'te-btn te-color', '<span class="te-swatch"></span>'); colorBtn.type = 'button'; colorBtn.title = 'Colour';
      const extrasBtn = elc('button', 'te-btn te-extras', 'Aa'); extrasBtn.type = 'button'; extrasBtn.title = 'Text options (style, spacing, animation…)';
      const doneBtn = elc('button', 'te-btn te-done', '✓'); doneBtn.type = 'button'; doneBtn.title = 'Done';
      /* COLOUR GOES FIRST (queue 440). Ezra sent the toolbar with an arrow drawn from the white swatch
         — which sat fourth of six, between the size box and Aa — round to the far LEFT of the bar:
         *"As per image, move the colouring button from there to there"*.
         ⚠️ His arrow starts under "Inter" and ends at the left edge, so it can be read as "put colour
         first" or as "swap colour and the font". The line ENDS at the edge, so it is built as colour
         first; if that is not what he meant it is one word here. Recorded in REQUESTS 440 either way.
         Nothing else moves: Done stays in the far corner, which is where every commit in this app is. */
      bar.append(colorBtn, alignBtn, fontBtn, sizeBtn, extrasBtn, doneBtn);
      panel.appendChild(bar);
      alignBtn.addEventListener('click', () => { closePop(); cycleAlign(); });
      fontBtn.addEventListener('click', () => openPop('font', buildFontRail, fontBtn));
      sizeBtn.addEventListener('click', () => openPop('size', buildSizePop, sizeBtn));
      colorBtn.addEventListener('click', () => openPop('color', buildColorPop, colorBtn));
      extrasBtn.addEventListener('click', () => openPop('extras', buildExtrasPop, extrasBtn));
      // Guard so tapping a bar button doesn't blur the field and dismiss the keyboard mid-edit.
      // POINTERDOWN as well as mousedown: on iOS the blur is already under way by the time a synthetic
      // mousedown arrives, so guarding only that let every tap on Align / Font / Size / Colour close
      // the keyboard and re-flow the screen — which is what made the toolbar feel unusable while typing.
      const keepFocus = e => { if (e.target !== input) e.preventDefault(); };
      bar.addEventListener('pointerdown', keepFocus);
      bar.addEventListener('mousedown', keepFocus);
      doneBtn.addEventListener('click', commit);

      // ---- bottom dock: the text field ----
      dock = elc('div', 'te-dock');
      // Caption track: a ‹ Cue n / N › strip above the field. Captioning is "type, next, type", and
      // making the user close the editor and re-seek between every cue is what makes it a chore.
      if (isCapTrack(l)) {
        cueNav = elc('div', 'te-cue-nav');
        const prev = elc('button', 'te-cue-btn', '‹'); prev.type = 'button'; prev.title = 'Previous cue';
        const lbl = elc('span', 'te-cue-lbl', '');
        const next = elc('button', 'te-cue-btn', '›'); next.type = 'button'; next.title = 'Next cue';
        const addB = elc('button', 'te-cue-btn te-cue-add', '+'); addB.type = 'button'; addB.title = 'New cue after this one';
        prev.addEventListener('click', () => gotoCue((active.cueIndex || 0) - 1));
        next.addEventListener('click', () => gotoCue((active.cueIndex || 0) + 1));
        addB.addEventListener('click', () => {
          const ly = layer(), cur = activeCue(); if (!ly || !cur) return;
          const at = Math.min(cur.end + 0.05, Math.max(0, (ly.duration || 0) - FM.captions.MIN_CUE));
          const i = FM.captions.addCue(ly, at);
          active.createdCue = false;   // deliberately created — keep it even if left blank
          gotoCue(i);
        });
        cueNav.append(prev, lbl, next, addB);
        // Guard the strip the same way the top bar is guarded, or tapping ‹ › dismisses the keyboard.
        const keep = e => { if (e.target !== input) e.preventDefault(); };
        cueNav.addEventListener('pointerdown', keep);
        cueNav.addEventListener('mousedown', keep);
        dock.appendChild(cueNav);
      }
      input = document.createElement('textarea');
      const boundCue = activeCue();
      input.id = 'te-input'; input.rows = 2; input.value = boundCue ? (boundCue.text || '') : (l.text || ''); input.spellcheck = false;
      input.setAttribute('placeholder', boundCue ? 'Type this caption…' : 'Type your text…');
      dock.appendChild(input);
      panel.appendChild(dock);
      input.addEventListener('input', onInput);
      input.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); commit(); }
        // Cmd/Ctrl+Enter also commits (plain Enter inserts a newline — text can be multi-line)
        else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
      });

      document.body.classList.add('text-editing');
      // resize + orientationchange + visualViewport resize/scroll, and one unsubscribe that cannot
      // miss — see FM.screen.watch.
      if (unwatch) unwatch();
      unwatch = FM.screen.watch(onViewport);
      // The desktop card is anchored to #stage's box, and #stage changes shape without a window
      // resize — dragging the timeline's height handle is the everyday one, and the inspector opening
      // is another.
      // BORDER-box on purpose: this callback writes #stage's PADDING, so observing the content box
      // would re-fire on our own write, forever.
      // DESKTOP-ONLY on purpose, checked when it FIRES rather than when it is installed, so a window
      // dragged across 700px mid-edit still gets it. On the phone #stage sits in an `auto` grid track
      // during the takeover, so its own padding-top does feed back into its height — one extra
      // settling pass measurably moved the stage's border box 5px (padTop 5px -> 0px, row 60.56 ->
      // 65.56) even though the canvas and every control landed in the same place. The phone path
      // is not asking for another caller.
      if (window.ResizeObserver) {
        const st = document.getElementById('stage');
        if (st) {
          stageRO = new ResizeObserver(() => { if (active && isDesktop()) onViewport(); });
          try { stageRO.observe(st, { box: 'border-box' }); } catch (_) { stageRO.observe(st); }
        }
      }
      document.addEventListener('pointerdown', onDocDown, true);

      updateBarLabels();
      updateCueNav();
      onViewport();
      input.focus();
      if (opts.selectAll) input.select();
      else { const n = input.value.length; try { input.setSelectionRange(n, n); } catch (_) {} }
    },
    // Esc / external close → commit-and-exit (the live value is already applied).
    stop() { if (active) commit(); },
  };
})(window.FM);
