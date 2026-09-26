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
