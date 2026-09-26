const sleep = ms => new Promise(r => setTimeout(r, ms));
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(500);
try { const sp = document.getElementById("splash"); if (sp) sp.remove(); } catch (e) {}
FM.scene.layers.length = 0;
FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();
await sleep(400);
/* Stand-in for the real edit: the planned code, wired from outside the timeline IIFE. Differences from the real
   change, and why they do not matter to what is measured: the old #timeline pointerdown still makes a .tl-tapburst
   (hidden here); the empty row's #616 listener is still bound (its element is display:none here, and the real change
   also skips binding it); the click hold is applied by a capture listener instead of inside the two open handlers. */
(function () {
  for (const sh of document.styleSheets) {
    let rs; try { rs = sh.cssRules; } catch (e) { continue; }
    for (let i = rs.length - 1; i >= 0; i--) {
      const sel = rs[i].selectorText || '';
      if (/tl-empty-start/.test(sel) && /#timeline:(hover|focus-within)/.test(sel)) sh.deleteRule(i);
    }
  }
  const st = document.createElement('style');
  st.textContent = "/* ---- THE EMPTY AREA ANSWERS A PRESS (queue NNN) \u2014 drawn and removed by areaFx in js/timeline.js ----------------\n   Replaces #571's .tl-tapburst and #600's resting :hover/:focus-within box. These are EVENT layers: created on\n   pointerdown in #timeline-panel (outside the scroller, so no scroll offset can move them), sized to the area below\n   the ruler row, and removed on a timer. z-index 8 puts them over #tl-rulerrow (7), whose opaque background is what\n   hid the old box's top edge. pointer-events: none throughout \u2014 feedback must never eat the tap it answers. */\n.tl-areafx { position: absolute; pointer-events: none; z-index: 8; }\n.tl-areafx--pulse svg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; }\n/* screen: the colour ADDS light to the dark wash instead of greying it, and white stays white (the caption). */\n.tl-areafx--press { overflow: hidden; contain: layout paint; mix-blend-mode: screen; }\n.tl-areafx--press > div { position: absolute; left: 0; top: 0; border-radius: 50%; will-change: transform, opacity; }\n.tl-areafx--press > .fx-tint { border-radius: 0; will-change: opacity; }\n/* The JS picks the calm version itself; this is the second lock, as #571 had \u2014 either alone is one point of failure. */\n@media (prefers-reduced-motion: reduce) {\n  .tl-areafx--pulse, .tl-areafx--press { display: none; }\n}\n/* THE ROW-SIZED #616 PULSE IS OFF ON THE EMPTY SCREEN (clause 6). There the row is a 300px box mid-area, and its\n   band lights both sides and the whole top at once \u2014 the second, wrong-sized box. The area pulse replaces it; the\n   slim row (a project with layers) keeps #616 exactly as approved. timeline.js also stops arming it there. */\n#timeline-panel.tl-empty-start .tl-addrow-pulse { display: none; }\n/* KEYBOARD ONLY: a real ring while the row has :focus-visible \u2014 never on a tap (a finger focus does not match\n   :focus-visible). Same box as the pulse: --tl-area-top is the ruler row's bottom, published by applyEmptyStart. */\n#timeline-panel.tl-empty-start:has(.tl-addrow:focus-visible)::after {\n  content: \"\"; position: absolute; pointer-events: none; z-index: 8;\n  left: 4px; right: 4px; bottom: 4px; top: calc(var(--tl-area-top, 0px) + 4px);\n  border-radius: 14px;\n  box-shadow: 0 0 0 2px rgba(150, 232, 255, .9), 0 0 16px rgba(90, 199, 237, .45);\n}\n" + '\n.tl-tapburst { display: none !important; }';
  document.head.appendChild(st);
})();
(function () {
  /* ---- THE EMPTY AREA ANSWERS A PRESS (queue NNN — replaces #571's small burst and #600's resting box) ----
   * Ezra, 26 Sep, on the empty project: *"the blue bar that's supposed to go around. The edges doesn't fully go
   * around the edges at the top and also it just stays there [gets stuck]"* … *"the animation you made for like
   * when you tap on the screen looks really shitty"* … *"actually play in that whole … touch pad area … something
   * a lot more colourful"* … *"make sure that like the blue lines in the outside actually look good and actually go
   * away like they actually pulse when you tap on it … and they pulse all the way around it not just like all the
   * lines appear at once"*.
   * MEASURED at 380x800 and 440x956 before this was written (plan: tools/design/plans/…emptytap):
   *   - THE TOP WAS MISSING because the old box was an inset box-shadow on #timeline, and #tl-rulerrow (22px,
   *     sticky, z-index 7, opaque rgb(10,20,26)) is #timeline's own first child — a child paints over its
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

  const tl = document.getElementById('timeline'), tlPanel = document.getElementById('timeline-panel');
  tl.addEventListener('pointerdown', function (e) {
    if (!tlPanel.classList.contains('tl-empty-start')) return;
    fxPressAt = performance.now();
    areaFx(tl, e.clientX, e.clientY);
  });
  tl.addEventListener('click', function (e) {
    if (!tlPanel.classList.contains('tl-empty-start')) return;
    const onRow = e.target.closest && e.target.closest('.tl-addrow');
    if (!onRow && e.target.closest && e.target.closest('button, input, select, textarea, a, [role="button"], #tl-ruler, .tl-ruler')) return;
    e.stopPropagation(); e.preventDefault();
    afterPress(function () { if (FM.mobile && FM.mobile.openAdd) FM.mobile.openAdd(); });
  }, true);
  const ruler = document.getElementById('tl-rulerrow');
  tlPanel.style.setProperty('--tl-area-top', (tl.offsetTop + ruler.offsetHeight) + 'px');
  window.__emuInfo = { offsetParent: tl.offsetParent && tl.offsetParent.id, areaTop: tl.offsetTop + ruler.offsetHeight };
})();
const __T = []; function test(name, opts, fn) { if (typeof opts === 'function') { fn = opts; } __T.push({ name: name, fn: fn }); }
async function atPhoneWidth(fn) { if (!matchMedia('(max-width: 700px)').matches) throw new Error('not a phone width'); return await fn(); }
  /* NNN — the empty project's add area, from one dictated message (26 Sep). His clauses, numbered in REQUESTS.md:
     1 the blue outline does not reach the TOP; 2 it stays there (stuck); 3 the tap animation looks bad; 4 play it across
     the WHOLE area, much more colourful; 5 the lines must look good and GO AWAY; 6 they PULSE all the way round, not all
     lines at once. Shared setup: an empty project at phone width, then put everything back. */
  async function onEmptyAreaNNN(fn) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const layers0 = FM.scene.layers.slice();
    const homeWasOpen = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    try {
      if (homeWasOpen) FM.home.close();
      return await atPhoneWidth(async function () {
        FM.scene.layers.length = 0;
        FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();
        await sleep(260);
        const panel = document.getElementById('timeline-panel');
        const tl = document.getElementById('timeline');
        const row = document.querySelector('.tl-addrow');
        if (!panel || !panel.classList.contains('tl-empty-start') || !row || !row.classList.contains('tl-addrow--empty')) {
          throw new Error('not on the empty-project screen (.tl-empty-start + .tl-addrow--empty), so this would measure the wrong thing');
        }
        [].slice.call(panel.querySelectorAll('.tl-areafx')).forEach(function (n) { n.remove(); });
        const ruler = document.getElementById('tl-rulerrow').getBoundingClientRect();
        const tr = tl.getBoundingClientRect();
        // THE AREA, measured here rather than asked of the code under test: #timeline below the sticky ruler row.
        const area = { left: tr.left, right: tr.left + tl.clientWidth, top: ruler.bottom, bottom: tr.bottom };
        area.width = area.right - area.left; area.height = area.bottom - area.top;
        /* ⚠️ EVERY pointerdown IS CLOSED WITH A pointerup — the 571 lesson: an unfinished synthetic gesture left the
           timeline mid-gesture and turned three unrelated tests red. pointerup does not synthesise a click, so this
           cannot open the add sheet. */
        const press = function (x, y, on) {
          const t = on || tl;
          const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 9, pointerType: 'touch', isPrimary: true, button: 0 };
          t.dispatchEvent(new PointerEvent('pointerdown', Object.assign({}, o, { buttons: 1 })));
          t.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, o, { buttons: 0 })));
        };
        return await fn({ panel: panel, tl: tl, row: row, area: area, press: press, sleep: sleep });
      });
    } finally {
      const p = document.getElementById('timeline-panel');
      if (p) [].slice.call(p.querySelectorAll('.tl-areafx')).forEach(function (n) { n.remove(); });
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.selectLayer(null); FM.refreshAll(); if (FM.timeline) FM.timeline.rebuild();
      if (homeWasOpen && FM.home && FM.home.open) FM.home.open();
    }
  }

  test('NNN clause 2: after a tap the empty area keeps no outline - not on focus, not on hover', { item: 'NNN' }, async function () {
    /* MEASURED 26 Sep at 380x800 and 440x956: a tap focuses the row (tabIndex 0), focus SURVIVES openAdd() and
       closeAdd(), so `#timeline:focus-within` stayed true and the inset box stayed painted after the menu closed —
       "it just stays there". row.focus() is that state. Measured too: in this runner a script focus does NOT match
       :focus-visible, so it stands for a finger, not a keyboard (asserted below as a control). */
    return onEmptyAreaNNN(async function (c) {
      c.row.focus();
      if (!c.tl.matches(':focus-within')) throw new Error('CONTROL: focusing the row did not put #timeline in :focus-within, so the stuck state was never reproduced');
      if (c.row.matches(':focus-visible')) throw new Error('CONTROL: this focus reads as a KEYBOARD focus in this runner, so it cannot stand in for a tap');
      const cs = getComputedStyle(c.tl);
      if (cs.boxShadow !== 'none') throw new Error('the empty area still draws a box while the tapped row keeps focus (' + cs.boxShadow + ') - the outline that "just stays there" (queue NNN clause 2)');
      /* :hover CANNOT BE SYNTHESISED - script pointer events do not move the hover state, and iOS leaves :hover on the
         last thing tapped. So the RULES are what is checked: nothing may paint the empty timeline on :hover/:focus-within. */
      const bad = [];
      const walk = function (list) {
        for (const ru of list) {
          if (ru.cssRules && !ru.selectorText) { walk(ru.cssRules); continue; }
          const sel = ru.selectorText || '';
          if (!/tl-empty-start/.test(sel) || !/#timeline:(hover|focus-within)/.test(sel)) continue;
          const st = ru.style;
          if ((st.boxShadow && st.boxShadow !== 'none') || (st.outlineStyle && st.outlineStyle !== 'none') || (st.borderColor && !/transparent/.test(st.borderColor))) bad.push(sel);
        }
      };
      for (const sh of document.styleSheets) { let rs = null; try { rs = sh.cssRules; } catch (e) { continue; } walk(rs); }
      if (bad.length) throw new Error('a rule still paints the empty area on :hover/:focus-within, which iOS keeps on after a tap: ' + bad.join(' | '));
      // POSITIVE CONTROL: the same read DOES see a box when one is there - otherwise a broken read passes the check above.
      c.tl.style.boxShadow = 'inset 0 0 0 1px rgb(255, 0, 0)';
      const seen = getComputedStyle(c.tl).boxShadow;
      c.tl.style.boxShadow = '';
      if (seen === 'none') throw new Error('CONTROL: getComputedStyle did not see an inline box-shadow, so the check above proves nothing');
    });
  });

  test('NNN clauses 1 5 6: a press sends the outline all the way round incl. the top, one side after another, then it is gone', { item: 'NNN', budgetMs: 8000 }, async function () {
    return onEmptyAreaNNN(async function (c) {
      c.press(c.area.left + c.area.width / 2, c.area.top + c.area.height * 0.36);   // on the +
      const host = c.panel.querySelector('.tl-areafx--pulse');
      if (!host) throw new Error('pressing the empty area drew no travelling outline (queue NNN clause 6)');
      /* CLAUSE 1 - THE TOP. The old box was an inset shadow on #timeline, and #tl-rulerrow (its sticky, opaque first
         child, z-index 7) painted over its top 22px, so the top line never showed. The pulse must start at or below
         the ruler's bottom AND be stacked above it. */
      const hr = host.getBoundingClientRect();
      if (hr.top < c.area.top - 1) throw new Error('the pulse box starts ' + Math.round(c.area.top - hr.top) + 'px up under the ruler row, where its top line cannot be seen (clause 1)');
      if (Math.abs(hr.bottom - c.area.bottom) > 1 || Math.abs(hr.left - c.area.left) > 1 || Math.abs(hr.right - c.area.right) > 1) throw new Error('the pulse box ' + JSON.stringify([hr.left, hr.top, hr.right, hr.bottom]) + ' is not the area ' + JSON.stringify(c.area));
      const zr = +getComputedStyle(document.getElementById('tl-rulerrow')).zIndex, zp = +getComputedStyle(host).zIndex;
      if (!(zp > zr)) throw new Error('the pulse (z ' + zp + ') is not stacked above the ruler row (z ' + zr + ')');
      /* SEEK, DON'T WAIT. A paused Web Animation reports its style at any currentTime, with or without frames - the
         571/616 notes: this runner can fire 0 rAF when it is not fronted, so timing the real motion would be flaky. */
      const cores = [].slice.call(host.querySelectorAll('path.fx-core'));
      if (cores.length !== 2) throw new Error('expected two travelling lights (one per side), found ' + cores.length);
      const T = FM._areaFx.PULSE_TRAVEL;
      const at = function (p, t) {
        p.getAnimations().forEach(function (an) { an.pause(); an.currentTime = t; });
        const len = parseFloat(p.style.strokeDasharray);
        const off = parseFloat(getComputedStyle(p).strokeDashoffset);
        const L = p.getTotalLength();
        const pt = p.getPointAtLength(Math.max(0, Math.min(L, len - off)));
        return { x: hr.left + pt.x, y: hr.top + pt.y };
      };
      const seen = { left: 0, right: 0, top: 0, bottom: 0 };
      for (let k = 0; k <= 24; k++) {
        cores.forEach(function (p) {
          const q = at(p, T * k / 24);
          if (q.x <= hr.left + 8) seen.left++;
          if (q.x >= hr.right - 8) seen.right++;
          if (q.y <= hr.top + 8) seen.top++;
          if (q.y >= hr.bottom - 40) seen.bottom++;
        });
      }
      const miss = Object.keys(seen).filter(function (k) { return !seen[k]; });
      if (miss.length) throw new Error('the lights never reached the ' + miss.join(', ') + ' edge - "all the way around it" (queue NNN clauses 1 and 6): ' + JSON.stringify(seen));
      // CLAUSE 6 - ONE AFTER ANOTHER. A quarter of the way in, neither light may be in the top 40% yet ...
      const q1 = cores.map(function (p) { return at(p, T * 0.25); });
      if (q1.some(function (q) { return q.y < hr.top + hr.height * 0.4; })) throw new Error('a quarter of the way through, a light is already near the top ' + JSON.stringify(q1) + ' - the lines are appearing at once, not travelling (clause 6)');
      // ... and the drawn line is still growing then (the old #616 band lit a whole side and the top together).
      const tr = host.querySelector('path.fx-trail');
      tr.getAnimations().forEach(function (an) { an.pause(); an.currentTime = T * 0.25; });
      const drawn = 1 - parseFloat(getComputedStyle(tr).strokeDashoffset) / tr.getTotalLength();
      if (!(drawn > 0.05 && drawn < 0.6)) throw new Error('a quarter of the way in, the trail has drawn ' + Math.round(drawn * 100) + '% of its side - it must grow, not appear');
      // POSITIVE CONTROL for the two negatives above: the same read DOES report the top - both finish at the top-centre.
      const qe = cores.map(function (p) { return at(p, T); });
      if (qe.some(function (q) { return Math.abs(q.x - (hr.left + hr.width / 2)) > 6 || q.y > hr.top + 8; })) throw new Error('the two lights do not meet at the top-centre: ' + JSON.stringify(qe));
      // CLAUSE 5 - IT GOES AWAY. Real time, because the teardown is a setTimeout by design (it must not wait on frames).
      await c.sleep(FM._areaFx.PULSE_MS + 400);
      if (c.panel.querySelector('.tl-areafx--pulse')) throw new Error('the outline is still in the page ' + (FM._areaFx.PULSE_MS + 400) + 'ms after the press - it has to GO AWAY (clause 5)');
      if (getComputedStyle(c.tl).boxShadow !== 'none') throw new Error('after the pulse, #timeline still paints a box (' + getComputedStyle(c.tl).boxShadow + ')');
    });
  });

  test('NNN clauses 3 4: a press floods the WHOLE area with colour from the finger, coloured by the spot, and cleans up', { item: 'NNN', budgetMs: 8000 }, async function () {
    return onEmptyAreaNNN(async function (c) {
      const a = c.area;
      c.press(a.left + 40, a.top + 60);
      const host = c.panel.querySelector('.tl-areafx--press');
      if (!host) {
        const old = c.tl.querySelector('.tl-tapburst');
        throw new Error('pressing the empty area made no whole-area colour layer' + (old ? ' - only the old ' + Math.round(old.getBoundingClientRect().width || 104) + 'px .tl-tapburst, the "small little touch thing" he asked to replace' : '') + ' (queue NNN clause 4)');
      }
      // FROM THE FINGER (#571's first half): the layer records the press point, and its white-hot core is centred there.
      if (Math.abs(+host.dataset.x - 40) > 1.5 || Math.abs(+host.dataset.y - 60) > 1.5) throw new Error('the colour layer recorded the press at ' + host.dataset.x + ',' + host.dataset.y + ', not 40,60');
      const core = host.querySelector('.fx-core');
      core.getAnimations().forEach(function (an) { an.pause(); an.currentTime = 1; });
      const cr = core.getBoundingClientRect();
      if (Math.abs(cr.left + cr.width / 2 - (a.left + 40)) > 2 || Math.abs(cr.top + cr.height / 2 - (a.top + 60)) > 2) throw new Error('the flash does not start under the finger');
      /* THE WHOLE AREA (clause 4). Geometric, from the live boxes: a sample point is lit when it lies inside a colour
         curtain's visible ellipse (80% of its radial gradient's closest-side) while that curtain is at least 35%
         opaque. Best moment over the first half of the animation; >= 90% of a 12x12 grid. The old burst was one
         104px bloom - about 6% of the area at 380px. */
      const curtains = [].slice.call(host.querySelectorAll('.fx-curtain'));
      if (curtains.length < 3) throw new Error('the colour layer has ' + curtains.length + ' colour curtains - not enough to fill anything');
      let best = 0, bestT = 0;
      for (let t = 60; t <= FM._areaFx.PRESS_MS * 0.5; t += 30) {
        host.getAnimations({ subtree: true }).forEach(function (an) { an.pause(); an.currentTime = t; });
        const shapes = curtains.map(function (el) {
          const r = el.getBoundingClientRect();
          return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, rx: r.width / 2 * 0.8, ry: r.height / 2 * 0.8, op: +getComputedStyle(el).opacity };
        }).filter(function (s) { return s.op >= 0.35 && s.rx > 0 && s.ry > 0; });
        let lit = 0;
        for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
          const px = a.left + a.width * (i + 0.5) / 12, py = a.top + a.height * (j + 0.5) / 12;
          if (shapes.some(function (s) { const dx = (px - s.cx) / s.rx, dy = (py - s.cy) / s.ry; return dx * dx + dy * dy <= 1; })) lit++;
        }
        if (lit / 144 > best) { best = lit / 144; bestT = t; }
      }
      if (best < 0.9) throw new Error('at its fullest (' + bestT + 'ms) the colour reaches ' + Math.round(best * 100) + '% of the area - he asked for it to "cook up the whole area" (clause 4)');
      host.getAnimations({ subtree: true }).forEach(function (an) { an.play(); });
      // COLOUR BY THE SPOT (#571's keyboard): a press at the far corner answers in a different colour.
      c.press(a.right - 40, a.bottom - 40);
      const hosts = c.panel.querySelectorAll('.tl-areafx--press');
      const hB = +hosts[hosts.length - 1].dataset.h, hA = +host.dataset.h;
      const dh = Math.min(Math.abs(hA - hB), 360 - Math.abs(hA - hB));
      if (dh < 30) throw new Error('two presses at opposite corners came out hue ' + hA + ' and ' + hB + ' - the colour must follow the position (#571: "based on what button you press")');
      // CAPPED, and TORN DOWN - a drum-roll must not pile up nodes, and nothing may outlive the animation.
      for (let i = 0; i < 25; i++) c.press(a.left + 100 + i, a.top + 100 + i);
      const live = c.panel.querySelectorAll('.tl-areafx--press').length, laps = c.panel.querySelectorAll('.tl-areafx--pulse').length;
      if (live > FM._areaFx.MAX) throw new Error(live + ' colour layers live at once (cap ' + FM._areaFx.MAX + ')');
      if (laps > 1) throw new Error(laps + ' outline laps live at once - a second tap must not stack another');
      await c.sleep(Math.max(FM._areaFx.PRESS_MS, FM._areaFx.PULSE_MS) + 450);
      const left = c.panel.querySelectorAll('.tl-areafx').length;
      if (left) throw new Error(left + ' press layers survived their animation - they must be torn down on a timer');
      // CONTROL: with a layer in the project the same press does nothing (the empty screen only).
      const L = FM.makeLayer('shape', { name: 'X', shape: 'rect', x: 540, y: 960, shapeW: 200, shapeH: 200, fill: '#3a7bd5' });
      L.start = 0; L.duration = 3; FM.scene.layers.push(L);
      FM.refreshAll(); FM.timeline.rebuild();
      await c.sleep(260);
      c.press(a.left + 190, a.top + 200);
      await c.sleep(40);
      if (c.panel.querySelectorAll('.tl-areafx').length) throw new Error('CONTROL FAILED - a press on a timeline WITH layers also floods it with colour; this is for the empty screen only');
    });
  });

  test('NNN: asked for less motion, a press is acknowledged by one short still fade - nothing travels or grows', { item: 'NNN', budgetMs: 6000 }, async function () {
    return onEmptyAreaNNN(async function (c) {
      const realMM = window.matchMedia;
      window.matchMedia = function (q) {
        if (/prefers-reduced-motion:\s*reduce/.test(q)) return { matches: true, media: q, onchange: null, addListener: function () {}, removeListener: function () {}, addEventListener: function () {}, removeEventListener: function () {}, dispatchEvent: function () { return false; } };
        return realMM.call(window, q);
      };
      try {
        c.press(c.area.left + c.area.width / 2, c.area.top + c.area.height / 2);
      } finally { window.matchMedia = realMM; }
      if (c.panel.querySelector('.tl-areafx--pulse, .tl-areafx--press')) throw new Error('with reduced motion asked for, the press still sends the travelling outline or the colour flood');
      const calm = c.panel.querySelector('.tl-areafx--calm');
      if (!calm) throw new Error('with reduced motion asked for, the press shows nothing at all - it must still be acknowledged, just without motion');
      const anims = calm.getAnimations({ subtree: true });
      if (!anims.length) throw new Error('the reduced-motion acknowledgement never fades - it would stay on screen');
      anims.forEach(function (an) {
        const d = an.effect.getTiming().duration;
        if (d > 300) throw new Error('the reduced-motion fade runs ' + d + 'ms - keep it short');
        an.effect.getKeyframes().forEach(function (k) { if (k.transform && k.transform !== 'none') throw new Error('the reduced-motion fade moves or scales (' + k.transform + ')'); });
      });
      await c.sleep(FM._areaFx.CALM_MS + 300);
      if (c.panel.querySelector('.tl-areafx')) throw new Error('the reduced-motion fade is still in the page after it finished');
    });
  });

  test('NNN clause 6: on the empty screen the old row-sized pulse no longer fires - the area pulse replaces it; the slim row keeps #616', { item: 'NNN' }, async function () {
    /* The #616 pulse is a band that climbs the ROW's box and lights both sides and the whole top line at once. In
       the empty state the row is a 300px box in the middle of the area, so a tap there drew a SECOND outline, not
       the area's - one that does exactly "all the lines appear at once". */
    return onEmptyAreaNNN(async function (c) {
      const p = c.row.querySelector('.tl-addrow-pulse');
      c.press(c.area.left + c.area.width / 2, c.area.top + c.area.height * 0.36, c.row);
      const firing = p && p.classList.contains('is-pulsing') && getComputedStyle(p).display !== 'none';
      if (firing) throw new Error('pressing the empty area still fires the row-sized #616 pulse - a second box whose lines all light at once (clause 6)');
      if (!c.panel.querySelector('.tl-areafx--pulse')) throw new Error('CONTROL: the same press drew no area pulse either, so this is not testing the replacement');
      // CONTROL: the slim row (a project with layers) keeps #616 exactly as he approved it.
      FM.addShapeLayer('rect');
      FM.scene.layers.forEach(function (l) { l.start = 0; l.duration = 6; });
      FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();
      await c.sleep(300);
      const slim = document.querySelector('.tl-addrow');
      const sp = slim && slim.querySelector('.tl-addrow-pulse');
      if (!sp) throw new Error('CONTROL FAILED - the slim add row lost its #616 pulse');
      slim.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      slim.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      if (!sp.classList.contains('is-pulsing') || getComputedStyle(sp).display === 'none') throw new Error('CONTROL FAILED - pressing the slim add row no longer plays its #616 pulse');
      sp.classList.remove('is-pulsing');
    });
  });

  /* ONLY IF HE PICKS A HOLD (ASK 2). With SHEET_HOLD_MS = 0 this test is deleted, not skipped. */
  test('NNN: the add menu waits a beat after a press on the empty area, counted from the press - never after a bare click', { item: 'NNN', budgetMs: 6000 }, async function () {
    return onEmptyAreaNNN(async function (c) {
      if (!FM._areaFx || !(FM._areaFx.HOLD_MS >= 0)) throw new Error('FM._areaFx.HOLD_MS is missing - there is no hold, so the menu covers the press animation within ~100ms of the finger lifting (measured: 59% at 50ms, 98% at 100ms)');
      const real = FM.mobile.openAdd;
      const calls = [];
      FM.mobile.openAdd = function () { calls.push(performance.now()); };
      try {
        const HOLD = FM._areaFx.HOLD_MS;
        if (!(HOLD > 0)) throw new Error('HOLD_MS is ' + HOLD + ' - with no hold this test should have been removed');
        const t0 = performance.now();
        c.press(c.area.left + c.area.width / 2, c.area.top + c.area.height * 0.36, c.row);
        c.row.click();
        if (calls.length) throw new Error('the add menu opened ' + Math.round(calls[0] - t0) + 'ms after the press - the colour is covered before it is seen (measured: the sheet covers 59% of the area 50ms into its swing, 98% at 100ms)');
        await c.sleep(HOLD + 120);
        if (calls.length !== 1) throw new Error('after the hold the add menu opened ' + calls.length + ' times, not once');
        if (calls[0] - t0 < HOLD - 25) throw new Error('the menu opened ' + Math.round(calls[0] - t0) + 'ms after the press, short of the ' + HOLD + 'ms hold');
        // CONTROL: a click with no press before it (the keyboard's Enter path, and every older test) is NOT delayed.
        calls.length = 0;
        c.row.click();
        if (calls.length !== 1) throw new Error('CONTROL FAILED - a bare click (no press) was delayed too; the hold must count from a press');
      } finally { FM.mobile.openAdd = real; }
    });
  });
  test('571: the empty timeline draws no stray dashed bar, and a tap anywhere in it works', { item: '571' }, async function () {
    /* Queue 571, clauses 1 and 2, from one phone screenshot of an empty project.
     * CLAUSE 1 — "Weird glitch here with the blue line". MEASURED at 380px: a dashed, tinted box
     *   **124px wide** down the LEFT of a 380px row, with the + (x158) and the caption (x104) centred
     *   OUTSIDE it. `--ar-x1` is `headW + PAD + duration * pxPerSec()` — the project's END (queue 551) —
     *   and **an empty project has duration 0**, so that end collapses onto the head column.
     *   It showed at all because queue 356 had removed the outline here by zeroing the ROW's
     *   border-color, and queue 550/551 then moved the outline onto `::before` without carrying that
     *   instruction across. The row obeyed him; the pseudo-element that took over its job never heard.
     * CLAUSE 2 — "make it so when you tap anywhere on the timeline it works, currently the bottom of
     *   the screen has a cut off". Two gaps, not one: the row ends at y=744, #tl-tracks at 797 (it
     *   carries 52px of bottom padding), and the panel at 820. 76px that looks like timeline and is not
     *   the row. The listener moved to #timeline, which already runs to the panel bottom.
     * ⚠️ BOTH controls matter. Clause 1 could be "fixed" by deleting the decoration everywhere, and
     * clause 2 by opening the add sheet on every tap in the app. The controls below fail either. */
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const homeWasOpen = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    const layers0 = FM.scene.layers.slice();
    const realAdd = FM.mobile ? FM.mobile.openAdd : null;
    try {
      if (homeWasOpen) FM.home.close();
      await sleep(100);
      return await atPhoneWidth(async function () {
        FM.scene.layers.length = 0;
        FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();
        await sleep(260);
        const panel = document.getElementById('timeline-panel');
        if (!panel || !panel.classList.contains('tl-empty-start')) throw new Error('the empty-start state did not apply, so this test is measuring the wrong screen');
        const row = document.querySelector('.tl-addrow');
        if (!row) throw new Error('no .tl-addrow on an empty project');

        // --- clause 1: no stray bar ---
        const deco = getComputedStyle(row, '::before');
        if (deco.content !== 'none') {
          throw new Error('the empty timeline still draws its dashed decoration (' + deco.width + ' wide) — queue 356 asked for no lines here, and on an empty project --ar-x1 collapses to the head width so it lands as a stray bar down the left (queue 571 clause 1)');
        }

        // --- clause 2: a tap in the dead strip opens the add sheet ---
        let opened = 0;
        if (FM.mobile) FM.mobile.openAdd = function () { opened++; };
        const pb = panel.getBoundingClientRect();
        const deadY = Math.round(pb.bottom - 20);
        const rowBottom = Math.round(row.getBoundingClientRect().bottom);
        if (deadY <= rowBottom) throw new Error('the probe point (' + deadY + ') is not below the add row (' + rowBottom + '), so it cannot be testing the dead strip at all');
        const hit = document.elementFromPoint(190, deadY);
        if (hit) hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 190, clientY: deadY }));
        await sleep(90);
        if (opened !== 1) throw new Error('a tap ' + (deadY - rowBottom) + 'px below the add row, still inside the timeline panel, opened the add sheet ' + opened + ' times instead of once — that is the "cut off" at the bottom of the screen (queue 571 clause 2)');

        // --- CONTROL A: with a layer present, the SAME tap must do nothing ---
        const L = FM.makeLayer('shape', { name: 'X', shape: 'rect', x: 540, y: 960, shapeW: 200, shapeH: 200, fill: '#3a7bd5' });
        L.start = 0; L.duration = 3; FM.scene.layers.push(L);
        FM.refreshAll(); FM.timeline.rebuild();
        await sleep(260);
        opened = 0;
        const hit2 = document.elementFromPoint(190, deadY);
        if (hit2) hit2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 190, clientY: deadY }));
        await sleep(90);
        if (opened !== 0) throw new Error('CONTROL FAILED — the empty-state tap fires on a project that HAS layers, so it is not gated on the empty state and every tap in the timeline now opens the add sheet');

        // --- CONTROL B: the slim row must KEEP its decoration (queue 550/551 are still his) ---
        const slim = document.querySelector('.tl-addrow');
        const d2 = getComputedStyle(slim, '::before');
        if (d2.content === 'none' || d2.borderTopStyle !== 'dashed') {
          throw new Error('CONTROL FAILED — the NORMAL add row lost its dashed decoration too. Queue 571 clause 1 is about the empty state only; queue 550/551 built that bar and he kept it ("the right side being cut off is good")');
        }
      });
    } finally {
      if (FM.mobile && realAdd) FM.mobile.openAdd = realAdd;
      FM.scene.layers.length = 0;
      layers0.forEach(function (l) { FM.scene.layers.push(l); });
      FM.refreshAll(); if (FM.timeline) FM.timeline.rebuild();
      if (homeWasOpen && FM.home && FM.home.open) FM.home.open();
    }
  });
  test('timeline: an empty project is one surface to the bottom of the screen, with no line across it', { item: '424' }, async function () {
    /* Queue 424, from a phone screenshot with a line drawn across the bottom of the empty state:
       "get rid of that line and continue the pattern all the way down". Two separate things made it,
       both measured at 380px before anything was changed (see the note in styles.css):
         - the hairline was the big row's own background, repeated into its 1px transparent border ring
           because `background-origin` is the padding box while `background-clip` is the border box;
         - the different shade below it was simply where the row's box stopped, ~76px short.
       So the wash moved onto #timeline, which already reaches the bottom of the panel. This test is
       about that shape, not about which gradient is used: nothing that ENDS mid-screen may paint, and
       whatever does paint has to reach the bottom. */
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const layers0 = FM.scene.layers.slice();
    try {
      return await atPhoneWidth(async function () {
        FM.scene.layers.length = 0; FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();
        await sleep(90);
        const panel = document.getElementById('timeline-panel');
        const tl = document.getElementById('timeline');
        const row = document.querySelector('.tl-addrow');
        if (!panel || !tl || !row) throw new Error('missing the panel, the timeline or the add row');
        // Control first: without the big state this would be measuring the ordinary slim row.
        if (!row.classList.contains('tl-addrow--empty')) throw new Error('the add row is not in its big empty state (' + row.className + ')');
        if (!panel.classList.contains('tl-empty-start')) throw new Error('the panel is missing tl-empty-start, so the empty-state rules are not the ones being measured');

        const rs = getComputedStyle(row);
        if (rs.backgroundImage !== 'none') throw new Error('the big empty row still paints a background of its own (' + rs.backgroundImage.slice(0, 60) + ') — that is the surface whose bottom edge drew the line');
        if (rs.boxShadow !== 'none') throw new Error('the big empty row still casts a glow (' + rs.boxShadow + '), which draws the same edge a second time');

        const ts = getComputedStyle(tl);
        if (ts.backgroundImage === 'none') throw new Error('nothing paints the empty timeline at all now — the wash was removed rather than moved');
        const tr = tl.getBoundingClientRect(), pr = panel.getBoundingClientRect();
        if (tr.bottom < pr.bottom - 1) throw new Error('the painted surface stops ' + (pr.bottom - tr.bottom).toFixed(1) + 'px above the bottom of the panel, so a second shade shows below it');

        /* AND THE SLIM ROW IS UNTOUCHED (his clause 3: empty state only). Without this, deleting the
           row's background everywhere would pass everything above. */
        const L = FM.makeLayer('shape', { name: 'x', shape: 'rect', x: 540, y: 960, shapeW: 200, shapeH: 200, fill: '#fff' });
        L.start = 0; L.duration = 3; FM.scene.layers.push(L);
        FM.refreshAll(); FM.timeline.rebuild();
        await sleep(90);
        const slim = document.querySelector('.tl-addrow');
        if (!slim || slim.classList.contains('tl-addrow--empty')) throw new Error('the row did not go back to its slim state with a clip present');
        /* ⚠️ THE WASH MOVED TO ::before (queue 550/551), it did not go away — updated rather than deleted,
           because what this line is FOR is still exactly right: the empty-state change must not strip the
           slim row's colour. Ezra asked for the tint to stop at the head divider and end with the project,
           and a full-width background on the row itself cannot do either, so the paint is on a bounded
           pseudo-element now and the row's own background is deliberately `none`. Reading the row would
           report a loss that has not happened. */
        if (getComputedStyle(slim, '::before').backgroundImage === 'none') throw new Error('the slim add row lost its own wash — this was meant to change the empty state only');
      }, 380);
    } finally {
      FM.scene.layers = layers0;
      if (FM.refreshAll) FM.refreshAll();
      if (FM.timeline) FM.timeline.rebuild();
    }
  });
const __res = [];
for (const t of __T) {
  try { await t.fn(); __res.push('PASS ' + t.name.slice(0, 70)); }
  catch (e) { __res.push('FAIL ' + t.name.slice(0, 40) + ' :: ' + String((e && e.message) || e).slice(0, 230)); }
}
return { res: __res, emu: window.__emuInfo };
