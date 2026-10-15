/* FreeMotion — FM.editorMorph: the switch morph (Simple mode Phase 3, DESIGN.md §6.3; D11 B, his pick).
 *
 * HIS PICK, 1 Oct: "D11 B", then "Just do the one clip on the far left, morph i think it was" — the far-left one of the three
 * switch animations the V10 sheet drew side by side (morph, fold, slide). Only the morph is built (§6.3: no pool, no variant).
 *
 * WHAT IT IS (§6.3): a FLIP keyed by layer id. Both editors draw time with one pxPerSec and one centre line, so every box keeps
 * its x and width and the flight is almost purely vertical: each box flies from its place in the editor he left to its place in
 * the one he lands in (cubic-bezier(.2,.8,.2,1), 320 ms), wearing its old look and then its new one; the old editor's heads,
 * labels and rows fade out first and the new one's fade in as the boxes land; the Simple tools rise. On a phone Simple's stage is
 * taller than Full's 40svh, so the timeline panel's top glides with the boxes on the same curve (the stage is uncovered or covered
 * as it goes) instead of jumping. "First" is measured by capture(), called by FM.editor.apply BEFORE the class flips; "Last" by
 * play(), when the cog closes (the switch is made under the cog, which covers the timeline, §6.3) or straight after a hop.
 *
 * HOW IT TOUCHES FULL (§0.4: Full must be unchanged): never by markup. All it does to Full's own elements is Web Animations
 * effects, every one cancelled when the morph ends — #timeline-panel's transform (only when its top moved), #timeline's opacity
 * (and its visibility for the 150 ms its old look fades out under Simple), and opacity 0 on the Full clip boxes whose clones are
 * flying. No attribute, class, inline style or child of a Full element is written. The clones fly in #ed-morph, a body-level
 * layer of its own that takes no pointer events and is removed at the end; on the way back to Full, Simple's own #sm-timeline
 * wears `edm-out` (shown, inert) while it fades.
 *
 * NEVER STUCK, NEVER IN THE WAY: the layer takes no pointer events, and the morph LANDS AT ONCE (every effect cancelled, the
 * layer gone) on a second switch, a resize or turn, the app going to the background, any tap or key, any timeline rebuild, and
 * on a guard timer if the browser never finishes it (a hidden tab pauses animations). Reduced motion, a playing project or a
 * hidden page skip it; the caller then plays the plain crossfade, which reduced motion turns off (T15).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const MS = 320;                          // §6.3: each box flies for 320 ms
  const EASE = 'cubic-bezier(.2,.8,.2,1)'; // §6.3, the curve V1 played for him
  const OLD_MS = 150;                      // the editor he leaves fades out (§6.3 0-120 ms; V1 drew 150, ease-in)
  const NEW_AT = 140, NEW_MS = 180;        // the editor he lands in fades in, ending with the flight (V1: 140 + 180)
  const XF_AT = 50, XF_MS = 200;           // a box's old look crossfades to its new one in flight (V1)
  const EDGE_MS = 120;                     // §6.3 (b)/(c): a box from or to a row scrolled away fades over 120 ms at that end
  const GONE_MS = 200;                     // §6.3: a box with no place in the new editor fades out where it is, 0-200 ms
  const RISE_AT = 120, RISE_MS = 200;      // §6.3: the Simple tools rise (his hinge, #612), done as the boxes land
  const FRESH_MS = 1500;                   // a held switch older than this when the cog closes plays the crossfade instead (D23 A: the cog stayed open)
  const MAX_FLY = 120;                     // §6.3 (d): at most this many boxes fly, nearest the line first; the rest arrive with their editor
  const PAD_X = 16, PAD_Y = 6;             // a selected box's ring and grip caps sit outside it: an unclipped side is opened this far
  const GUARD_MS = MS + 400;               // the timer that lands it if the browser never does (a hidden tab pauses animations)

  let snap = null;      // what capture() measured, waiting for play()
  let live = null;      // the morph on screen
  let gen = 0, hooked = false;

  const $ = id => document.getElementById(id);
  const now = () => (window.performance && performance.now) ? performance.now() : Date.now();
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const canPlay = () => !!(window.Element && Element.prototype.animate) && !reduced() && !document.hidden && !FM.playing;
  const box = (l, t, r, b) => ({ left: l, top: t, right: r, bottom: b, width: Math.max(0, r - l), height: Math.max(0, b - t) });
  const rectOf = el => { const r = el.getBoundingClientRect(); return box(r.left, r.top, r.right, r.bottom); };
  const isect = (a, b) => box(Math.max(a.left, b.left), Math.max(a.top, b.top), Math.min(a.right, b.right), Math.min(a.bottom, b.bottom));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const dist = (r, mid) => Math.max(0, r.left - mid, mid - r.right);   // 0 for a box under the line

  /* WHERE EACH EDITOR'S BOXES CAN BE SEEN. Full: #timeline, below its sticky ruler row and right of its sticky heads (a box under
     them is hidden there, so its clone is clipped the same way). Simple: #sm-scroll, and a section item inside #sm-sections. */
  function region(ed) {
    if (ed === 'full') {
      const sc = $('timeline'), root = $('tl-tracks');
      if (!sc || !root) return null;
      const v = rectOf(sc), hs = document.querySelector('#tl-rulerrow .tl-headspace'), ru = $('tl-rulerrow');
      const l = hs ? Math.max(v.left, hs.getBoundingClientRect().right) : v.left;
      const t = ru ? Math.max(v.top, ru.getBoundingClientRect().bottom) : v.top;
      return { root: root, sel: '.clip[data-id]', clip: box(l, t, v.right, v.bottom), view: v, sec: null };
    }
    const sc = $('sm-scroll'), root = $('sm-timeline');
    if (!sc || !root) return null;
    const v = rectOf(sc);
    return { root: root, sel: '.sm-item[data-id]', clip: v, view: v, sec: $('sm-sections') };
  }
  /* How much of a box its region hides, per side (px) */
  function insets(r, c) {
    return { t: clamp(c.top - r.top, 0, r.height), b: clamp(r.bottom - c.bottom, 0, r.height),
             l: clamp(c.left - r.left, 0, r.width), r: clamp(r.right - c.right, 0, r.width) };
  }
  /* Every box an editor draws, by layer id: its rect, whether it is drawn at all, whether any of it can be seen, how it is clipped. */
  function boxesOf(ed) {
    const g = region(ed);
    if (!g) return null;
    const secR = g.sec ? rectOf(g.sec) : null, v = g.view, items = new Map();
    g.root.querySelectorAll(g.sel).forEach(el => {
      const id = el.dataset.id;
      if (!id || items.has(id)) return;
      const r = rectOf(el), shown = r.width > 0 && r.height > 0;
      if (shown && (r.right < v.left - v.width || r.left > v.right + v.width)) return;   // §6.3 (d): more than a screen away
      const cl = (secR && g.sec.contains(el)) ? isect(g.clip, secR) : g.clip;
      const ins = shown ? insets(r, cl) : null;
      const vis = !!ins && r.width - ins.l - ins.r > 0.5 && r.height - ins.t - ins.b > 0.5;
      items.set(id, { el: el, r: r, shown: shown, vis: vis, ins: ins, cl: cl });
    });
    return { items: items };
  }

  /* A box's look, to fly: a deep copy with nothing a query, a screen reader or a tap could mistake for the real one (no id,
     data-id, role, label or tab stop), and its canvases' pixels (a filmstrip, a waveform) copied — cloneNode leaves them blank. */
  const STRIP = ['id', 'data-id', 'tabindex', 'role', 'aria-label', 'title'];
  function cloneBox(n) {
    const c = n.cloneNode(true);
    [c].concat(Array.prototype.slice.call(c.querySelectorAll('[id],[data-id],[tabindex],[role],[aria-label],[title]')))
      .forEach(e => STRIP.forEach(k => e.removeAttribute(k)));
    c.classList.add('edm-clone');
    const src = n.querySelectorAll('canvas'), dst = c.querySelectorAll('canvas');
    Array.prototype.forEach.call(src, (cv, i) => {
      const d = dst[i];
      if (!d || !cv.width || !cv.height) return;
      try { d.width = cv.width; d.height = cv.height; d.getContext('2d').drawImage(cv, 0, 0); } catch (e) {}
    });
    return c;
  }

  /* FIRST (§6.3): called by FM.editor.apply BEFORE the class flips, for a switch he will watch. A morph still on screen lands
     first, so a second switch mid-morph measures the real layout, never a box in flight. */
  function capture(from, to) {
    stop();
    snap = null;
    if (!canPlay()) return false;
    let B = null;
    try { B = boxesOf(from); } catch (e) { B = null; }
    if (!B) return false;
    const mid = window.innerWidth / 2;
    Array.from(B.items.values()).filter(it => it.vis)
      .sort((a, b) => dist(a.r, mid) - dist(b.r, mid)).slice(0, MAX_FLY * 2)
      .forEach(it => { try { it.clone = cloneBox(it.el); } catch (e) {} });
    const panel = $('timeline-panel'), sc = $('sm-scroll'), sec = $('sm-sections');
    snap = { from: from, to: to, at: now(), items: B.items, panelTop: panel ? panel.getBoundingClientRect().top : 0,
             scroll: from === 'simple' ? { x: sc ? sc.scrollLeft : 0, y: sec ? sec.scrollTop : 0 } : null };
    return true;
  }

  /* LAST, and the flight: called as the cog closes (FM.editor.afterCogClose) or straight after a hop. False when there is
     nothing fresh to play — the caller then plays the crossfade. */
  function play() {
    const s = snap;
    snap = null;
    if (!s || !canPlay() || now() - s.at > FRESH_MS) return false;
    /* the editor changed again since: that switch measured its own */
    const on = document.body.classList.contains('ed-simple') ? 'simple' : 'full';
    if (on !== s.to) return false;
    stop();
    hook();
    const L = live = { gen: ++gen, from: s.from, to: s.to, anims: [], flights: [], layer: null, ghost: null, timer: 0, held: false };
    try { build(s, L); } catch (e) { try { console.warn('[editor-morph] landed early:', e); } catch (_) {} stop(); return false; }
    if (live !== L || !L.flights.length) { stop(); return false; }
    L.timer = setTimeout(() => { if (live === L && !L.held) stop(); }, GUARD_MS);
    Promise.all(L.anims.map(a => a.finished.catch(() => null))).then(() => { if (live === L && !L.held) stop(); });
    return true;
  }

  function build(s, L) {
    /* Last, measured before any effect below moves a thing */
    const B = boxesOf(s.to);
    if (!B) throw new Error('no timeline to land in');
    const anim = (el, kf, o, tag) => {
      if (!el || !el.animate || !el.isConnected) return null;
      const a = el.animate(kf, o);
      a.id = 'edm-' + tag;
      L.anims.push(a);
      return a;
    };
    /* 1. THE PANEL'S TOP GLIDES (§6.3 "the stage height moves with it"): on a phone Simple's stage is taller than Full's 40svh, so
          the timeline panel starts where it was and slides to its new top on the boxes' curve. A transform only: the stage is
          laid out at its new height at once, so nothing is laid out again frame by frame. */
    const panel = $('timeline-panel');
    if (panel) {
      const dy = s.panelTop - panel.getBoundingClientRect().top;
      if (Math.abs(dy) >= 1) anim(panel, [{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: MS, easing: EASE }, 'panel');
    }
    /* 2. THE EDITORS CROSSFADE around the flight: the one he leaves (row heads, ruler, keyframe dots, the Add row — or Simple's
          labels, the +, the tray and the tools) fades out over 0-150 ms; the one he lands in fades in over 140-320 ms. */
    const full = $('timeline'), simple = $('sm-timeline');
    if (s.from === 'full') {
      /* Full stays laid out under Simple (visibility: hidden), and unchanged since the switch: shown for its fade, by the
         animation alone (its effect ends at 150 ms, so the stylesheet hides it again even before the cancel) */
      anim(full, [{ visibility: 'visible', opacity: 1 }, { visibility: 'visible', opacity: 0 }], { duration: OLD_MS, easing: 'ease-in' }, 'old');
      anim(simple, [{ opacity: 0 }, { opacity: 1 }], { duration: NEW_MS, delay: NEW_AT, easing: 'ease-out', fill: 'backwards' }, 'new');
      anim($('sm-tools'), [{ transform: 'translateY(100%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: RISE_MS, delay: RISE_AT, easing: EASE, fill: 'backwards' }, 'rise');
    } else {
      ghost(s, L, anim);
      anim(full, [{ opacity: 0 }, { opacity: 1 }], { duration: NEW_MS, delay: NEW_AT, easing: 'ease-out', fill: 'backwards' }, 'new');
    }
    /* 3. THE BOXES (§6.3): one flight per layer id, nearest the line first, at most MAX_FLY */
    const layer = L.layer = document.createElement('div');
    layer.id = 'ed-morph';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    document.body.appendChild(layer);
    const mid = window.innerWidth / 2, plans = [];
    /* fly: seen both times. out (c): seen before, its new place scrolled away — it flies to that edge and fades. gone: seen before,
       no place at all in the new editor (Full's phone solo view draws one row) — it fades where it is. in (b): its old row was
       scrolled away — it comes in from that edge. Seen neither time (d), or drawn nowhere before: no flight; it arrives with its
       editor's fade. */
    new Set(Array.from(s.items.keys()).concat(Array.from(B.items.keys()))).forEach(id => {
      const a = s.items.get(id), b = B.items.get(id);
      const av = !!(a && a.vis && a.clone), bv = !!(b && b.vis);
      if (!av && !bv) return;
      if (av && bv) plans.push({ id: id, k: 'fly', a: a, b: b, d: dist(b.r, mid) });
      else if (av) plans.push({ id: id, k: (b && b.shown) ? 'out' : 'gone', a: a, b: b, d: dist(a.r, mid) });
      else if (a && a.shown) plans.push({ id: id, k: 'in', a: a, b: b, d: dist(b.r, mid) });
    });
    plans.sort((p, q) => p.d - q.d).slice(0, MAX_FLY).forEach(p => fly(p, L, anim));
  }

  /* On the way back to Full, Simple's timeline (display: none in Full, its DOM as he last saw it) is shown inert for its fade.
     A scroller hidden with display: none may come back scrolled to 0; its content is put back where it was by a transform, never
     by a scroll write (that would scrub the playhead). */
  function ghost(s, L, anim) {
    const g = $('sm-timeline');
    if (!g) return;
    L.ghost = g;
    L.ghostAria = g.getAttribute('aria-hidden');
    L.ghostCls = g.hasAttribute('class');
    g.classList.add('edm-out');
    g.setAttribute('aria-hidden', 'true');
    const sc = $('sm-scroll'), inner = $('sm-inner'), sec = $('sm-sections'), stack = sec && sec.querySelector('.sm-secstack');
    if (s.scroll && sc && inner) {
      const dx = s.scroll.x - sc.scrollLeft;
      if (Math.abs(dx) >= 0.5) anim(inner, [{ transform: 'translateX(' + (-dx) + 'px)' }, { transform: 'translateX(' + (-dx) + 'px)' }], { duration: MS, fill: 'both' }, 'ghostx');
    }
    if (s.scroll && sec && stack) {
      const dy = s.scroll.y - sec.scrollTop;
      if (Math.abs(dy) >= 0.5) anim(stack, [{ transform: 'translateY(' + (-dy) + 'px)' }, { transform: 'translateY(' + (-dy) + 'px)' }], { duration: MS, fill: 'both' }, 'ghosty');
    }
    anim(g, [{ opacity: 1 }, { opacity: 0 }], { duration: OLD_MS, easing: 'ease-in', fill: 'forwards' }, 'old');
  }

  const px = v => (Math.round(v * 100) / 100) + 'px';
  const geo = r => ({ left: px(r.left), top: px(r.top), width: px(r.width), height: px(r.height) });
  const side = (v, pad) => v > 0.25 ? px(v) : px(-pad);
  const clipOf = ins => 'inset(' + side(ins.t, PAD_Y) + ' ' + side(ins.r, PAD_X) + ' ' + side(ins.b, PAD_Y) + ' ' + side(ins.l, PAD_X) + ')';
  /* (b)/(c): a row scrolled away is reached at the nearest edge of its region, x unchanged */
  function edge(r, cl) {
    const top = (r.top + r.height / 2 < (cl.top + cl.bottom) / 2) ? cl.top : cl.bottom - r.height;
    return box(r.left, top, r.right, top + r.height);
  }
  const sideIns = ins => ({ t: 0, b: 0, l: ins ? ins.l : 0, r: ins ? ins.r : 0 });

  /* ONE FLIGHT. The wrapper's own style is where it ENDS (the effects carry no fill past their end), so a morph finished by
     anyone — the browser, a test, a probe — already shows the landed layout before stop() tidies up. */
  function fly(p, L, anim) {
    const a = p.a, b = p.b, k = p.k;
    let from, fi, to, ti;
    if (k === 'fly') { from = a.r; fi = a.ins; to = b.r; ti = b.ins; }
    else if (k === 'out') { from = a.r; fi = a.ins; to = edge(b.r, b.cl); ti = sideIns(a.ins); }
    else if (k === 'gone') { from = a.r; fi = a.ins; to = a.r; ti = a.ins; }
    else { from = edge(a.r, a.cl); fi = sideIns(b.ins); to = b.r; ti = b.ins; }
    const w = document.createElement('div');
    w.className = 'edm-fly';
    w.dataset.edmId = p.id;
    w.dataset.edmK = k;
    Object.assign(w.style, geo(to));
    w.style.clipPath = clipOf(ti);
    const oc = k !== 'in' ? a.clone : null;
    let nc = null;
    if (k === 'fly' || k === 'in') { try { nc = cloneBox(b.el); } catch (e) { nc = null; } }
    if (oc) w.appendChild(oc);
    if (nc) w.appendChild(nc);
    if (oc && nc) oc.style.opacity = '0';
    if (k === 'out' || k === 'gone') w.style.opacity = '0';
    L.layer.appendChild(w);
    if (k !== 'gone') {
      anim(w, [Object.assign(geo(from), { clipPath: clipOf(fi) }), Object.assign(geo(to), { clipPath: clipOf(ti) })], { duration: MS, easing: EASE }, 'fly');
    }
    if (oc && nc) {
      anim(oc, [{ opacity: 1 }, { opacity: 0 }], { duration: XF_MS, delay: XF_AT, fill: 'backwards' }, 'xf');
      anim(nc, [{ opacity: 0 }, { opacity: 1 }], { duration: XF_MS, delay: XF_AT, fill: 'backwards' }, 'xf');
    }
    if (k === 'in') anim(w, [{ opacity: 0, offset: 0 }, { opacity: 1, offset: EDGE_MS / MS }, { opacity: 1, offset: 1 }], { duration: MS }, 'edge');
    if (k === 'out') anim(w, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: 1 - EDGE_MS / MS }, { opacity: 0, offset: 1 }], { duration: MS }, 'edge');
    if (k === 'gone') anim(w, [{ opacity: 1 }, { opacity: 0 }], { duration: GONE_MS, easing: 'ease-in' }, 'gone');
    /* the real boxes stay exactly where they are, unseen while their clones fly */
    if (a && a.el) anim(a.el, [{ opacity: 0 }, { opacity: 0 }], { duration: MS }, 'hide');
    if ((k === 'fly' || k === 'in') && b && b.el) anim(b.el, [{ opacity: 0 }, { opacity: 0 }], { duration: MS }, 'hide');
    L.flights.push({ id: p.id, k: k, from: { x: from.left, y: from.top, w: from.width, h: from.height }, to: { x: to.left, y: to.top, w: to.width, h: to.height } });
  }

  /* LAND IT: every effect cancelled, the layer gone, Simple's timeline back as it was. Safe to call any time, any number of times. */
  function stop() {
    const L = live;
    if (!L) return;
    live = null;
    clearTimeout(L.timer);
    L.anims.forEach(a => { try { a.cancel(); } catch (e) {} });
    if (L.layer && L.layer.parentNode) L.layer.parentNode.removeChild(L.layer);
    const g = L.ghost;
    if (g) {
      g.classList.remove('edm-out');
      if (!L.ghostCls && !g.className) g.removeAttribute('class');
      if (L.ghostAria == null) g.removeAttribute('aria-hidden'); else g.setAttribute('aria-hidden', L.ghostAria);
    }
  }
  /* …and forget a held one too (a quiet apply: a project opening puts its editor on screen with nothing to watch) */
  function forget() { snap = null; stop(); }

  /* Everything that lands a morph at once. Listened for once, for good (cheap: each is a no-op with no morph on screen), so a
     rebuild listener is never removed from inside the rebuild that calls it. */
  function hook() {
    if (hooked) return;
    hooked = true;
    const land = () => { if (live) stop(); };
    window.addEventListener('resize', land);
    window.addEventListener('pagehide', land);
    document.addEventListener('visibilitychange', () => { if (document.hidden) land(); });
    document.addEventListener('pointerdown', land, true);
    document.addEventListener('keydown', land, true);
    if (FM.timeline && FM.timeline.onRebuilt) FM.timeline.onRebuilt(land);
  }

  FM.editorMorph = {
    MS: MS,
    capture: capture,
    play: play,
    stop: stop,
    forget: forget,
    live: () => !!live,
    /* suite seam: the morph on screen — its number, its direction and every flight (id, kind fly / in / out / gone, from, to) */
    _state: () => live ? { gen: live.gen, from: live.from, to: live.to, flights: live.flights.slice(), anims: live.anims.length } : null,
    /* the render probe's seam (tools/design/plans/sm3-morph/render-probe.js): hold the morph where it is, paused, with no guard
       timer, until stop() (a tap, a key or a rebuild still lands it); returns its animations, to seek */
    _hold() { if (!live) return null; clearTimeout(live.timer); live.held = true; live.anims.forEach(a => { try { a.pause(); } catch (e) {} }); return live.anims.slice(); }
  };
})(window.FM);
