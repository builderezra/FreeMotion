/* V1 — The switch (DESIGN §0.4, §6, §6.3, §6.4, D11, D23; cog/COG-DESIGN.md).
 *
 * Beach day in a phone frame and a PC frame. The switch lives in the ⚙ cog, as its third block (VIS.cog): one tap on it
 * flips Simple <-> Full and the cog closes; "What should you use?" opens the block big. Neither play bar has a switch, and
 * Full's is today's ⋯ · ⧉ · ◐ · |◀ (his rule, 1 Oct). Nothing in the project is written: the page measures that (the
 * document's JSON before and after), and it measures that every box kept its x and width, that the playhead line did not
 * move, that the pick is still picked, and that Full's play bar holds exactly today's buttons. "Leave a crop unapplied"
 * shows §6.4's warning: the one case where switching would lose something Undo cannot bring back.
 *
 * The animation is the morph only (D11 B, his pick, 1 Oct: "Just do the one clip on the far left, morph i think it was").
 * Fold and Slide are dropped everywhere (DESIGN §6.3), so this page has no picker and no random pool:
 *   morph  FLIP keyed by layer id: every box flies straight up or down to its new row (x kept), row heads fade,
 *          a box whose section is folded flies into that section's line, the Simple tools rise.
 * Reduced motion turns it into a 120 ms fade.
 *
 * x is kept because both editors draw with the same px per second and the same head width: the kit's Simple head is
 * 36 px and Full's 64, so this page widens Simple's to 64 and moves its ruler, playhead and x mapping with it (the app
 * gets the same result from the shared centre line, §6.3).
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.VIS) return;
  const VIS = window.VIS, E = VIS.engine, el = VIS.el, esc = VIS.esc;

  const NAMES = { morph: 'the morph', fade: 'a plain fade' };
  const ED = { quick: 'Simple', full: 'Full' };
  const ORDER = ['captions', 'text', 'overlay', 'effect', 'behind'];
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const HEAD = 64, QHEAD = 36;                       // Full's head width, and the kit's Simple head width

  /* Full's play bar, exactly as today (index.html #transport): what the "Full as today" check expects to find */
  const FULL_BAR = ['more', 'layermenu', 'addside', 'toStart'];
  const cssId = s => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');


  VIS.register('v1', {
    title: 'The switch',
    group: 'Try it',
    blurb: 'In the ⚙ cog, a third block beside Canvas settings and Friends. One tap flips the same project between Simple and Full; Full itself does not change.',
    mount: host => mountV1(host)
  });

  function mountV1(host) {
    const doc = VIS.sample('beach');
    const P = doc.project, D = P.duration, FPS = P.fps || 30;
    const R0 = E.classify(doc);                       // the switch never edits, so one read model serves every draw
    const SPAN = R0.trackEnd + 1;
    const byId = new Map(doc.layers.map(l => [l.id, l]));
    const PRESENT = ORDER.filter(s => R0.lanes[s] && R0.lanes[s].length);
    const mainCount = R0.main.filter(e => !e.slot).length;
    const S = { t: 4.6, sel: null, playing: false, hinted: false, crop: false, toldQuick: false };
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduced = () => !!(mq && mq.matches);
    const frames = [];
    let active = null;

    host.classList.add('v1');
    host.innerHTML =
      '<div class="v1-bar">' +
        '<p class="v1-desc"><span class="v1-lbl">How it moves</span> <b>The morph</b>, your pick (D11): every clip flies straight up or down to its new row, and nothing moves left or right. It plays as the cog closes. The first release uses a short fade; the morph comes in Phase 3.</p>' +
        '<p class="h-note v1-rm" hidden>This device asks for less motion, so every switch here is a short fade, as it will be in the app.</p>' +
      '</div>' +
      '<div class="v1-main">' +
        '<figure class="v1-fig v1-phonefig"><div class="v1-phone"></div>' +
          '<figcaption>Tap ' + VIS.icon('gear', 'v1-inl') + ' at the top. The cog opens with a small third block on top: tap its <b>Simple ⇄ Full</b> switch, and the cog closes on the other editor. <b>What should you use?</b> opens the explanation. Neither play bar has a switch: Full’s stays ⋯ ⧉ ◐ |◀, exactly as today.</figcaption></figure>' +
        '<aside class="h-card v1-read" aria-live="polite">' +
          '<h3 class="v1-h3">What stayed the same</h3>' +
          '<p class="v1-last">Tap the switch, and this checks it.</p>' +
          '<ul class="v1-checks">' +
            '<li data-k="x"><i aria-hidden="true"></i><div><b>Every clip kept its place</b><span>Not checked yet</span></div></li>' +
            '<li data-k="ph"><i aria-hidden="true"></i><div><b>The playhead</b><span>Not checked yet</span></div></li>' +
            '<li data-k="sel"><i aria-hidden="true"></i><div><b>What you picked</b><span>Not checked yet</span></div></li>' +
            '<li data-k="save"><i aria-hidden="true"></i><div><b>Saved to the project</b><span>Not checked yet</span></div></li>' +
            '<li data-k="full"><i aria-hidden="true"></i><div><b>Full looks as it does today</b><span>Not checked yet</span></div></li>' +
          '</ul>' +
          '<p class="h-note v1-try">Try it: tap <b>Waves</b>, tap the time to play, then tap ⚙ and the switch while it plays. Undo, zoom and a friend\'s live session are kept as well. There is no keyboard key for it: the cog is the one way to switch.</p>' +
          '<div class="v1-warn"><button type="button" class="h-btn v1-crop" aria-pressed="false">Leave a crop unapplied</button>' +
          '<p class="h-note">Then switch. A warning comes first, because closing the crop tool would throw the box away and Undo couldn\'t bring it back. Anything Undo can bring back never asks. On a phone the cog is hidden while the crop tool is open, so you would mostly meet this on a computer.</p></div>' +
        '</aside>' +
      '</div>' +
      '<section class="v1-sec v1-pcsec close" aria-labelledby="v1-pc-h">' +
        '<h3 class="v1-h2" id="v1-pc-h">On a computer</h3>' +
        '<p class="h-note">The switch is in the ⚙ cog, near the right end of the bar above the timeline: the cog\'s small Editor tile sits above the Friends tile. Neither editor\'s bar has a switch. In Simple, the area to the left of the timeline works like the phone, read from the bottom up: the tools along the bottom, the picked clip\'s tools just above them, and a tool\'s settings above those. In Full, that same area is the settings panel you have today.</p>' +
        '<div class="v1-pcz-row"><div class="h-seg v1-pcz" role="group" aria-label="How much of the computer screen to show">' +
          '<button type="button" data-z="close">Close up</button><button type="button" data-z="whole">Whole screen</button>' +
        '</div><p class="h-note v1-pchint"></p></div>' +
        '<div class="v1-pcview"><div class="v1-pc"></div></div>' +
      '</section>';
    const q = s => host.querySelector(s);

    /* ------------------------------------------------------------------ the controls */
    // On a phone the computer drawing is too small to read when it is shrunk to fit, so it opens close up on its
    // left corner (the switch and the Simple tools) and swipes sideways; "Whole screen" shrinks it to fit again.
    // Above 700 px wide the toggle is hidden and the drawing always fits (v1.css).
    const pcSec = q('.v1-pcsec'), pcView = q('.v1-pcview');
    const PC_HINT = { close: 'Close up on the left corner, where the tools are. Swipe the drawing sideways to reach ⚙, near the right end of the bar above the timeline.',
                      whole: 'The whole computer screen, shrunk to fit your phone.' };
    function syncZoom(z) {
      pcSec.classList.toggle('close', z === 'close');
      pcSec.querySelectorAll('.v1-pcz button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.z === z)));
      q('.v1-pchint').textContent = PC_HINT[z];
      pcView.scrollLeft = 0;
    }
    pcSec.querySelectorAll('.v1-pcz button').forEach(b => b.addEventListener('click', () => syncZoom(b.dataset.z)));
    syncZoom('close');
    const syncRM = () => { q('.v1-rm').hidden = !reduced(); };
    syncRM();
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', syncRM); else if (mq.addListener) mq.addListener(syncRM); }

    /* ------------------------------------------------------------------ shared pieces */
    let inertAt = 0;
    function inert(fr) {
      const now = Date.now(); if (now - inertAt < 600) return; inertAt = now;
      VIS.toast(fr.f.root, 'This page only shows the switch. The editing is on V3.', null, { ms: 2200 });
    }
    function kindName(l) {
      if (!l) return '';
      if (l.audioOnly) return 'Music';
      if (Array.isArray(l.captions)) return 'Captions';
      if (l.type === 'text') return 'Text';
      if (l.type === 'image') return 'Sticker';
      return R0.isMain(l.id) ? 'Clip' : 'Video';
    }
    function inspRows(l) {
      const row = (k, v, kf) => '<div class="v1-ir"><span>' + esc(k) + '</span><b>' + esc(v) + (kf ? '<i class="v1-kf" title="Animated"></i>' : '') + '</b></div>';
      if (!l) return row('Size', P.width + ' × ' + P.height) + row('Frame rate', FPS + ' fps') + row('Length', '0:' + String(Math.round(D)).padStart(2, '0')) + row('Layers', String(doc.layers.length));
      const tr = l.transform || {}, kf = l.kf || {};
      if (l.audioOnly) return row('Volume', '100%', kf.volume) + row('Fades out', 'last 2 s') + row('Starts at', VIS.tc(l.start, FPS));
      if (Array.isArray(l.captions)) return row('Lines', String(l.captions.length)) + row('Style', 'Box') + row('Place', 'Bottom');
      const x = Math.round((tr.x != null ? tr.x : 0.5) * P.width), y = Math.round((tr.y != null ? tr.y : 0.5) * P.height);
      return (l.type === 'text' ? row('Text', l.text || l.name) : '') + row('Position', x + ', ' + y) +
        row('Scale', Math.round((tr.scale || 1) * 100) + '%', kf.scale) + row('Opacity', '100%', kf.opacity) + row('Starts at', VIS.tc(l.start, FPS));
    }
    function inspHead(l) {
      const th = l ? (l.type === 'text' ? '#50398d' : l.audioOnly ? '#174f42' : VIS.thumb(l)) : 'linear-gradient(135deg,#5fd3e6,#6a3d7a)';
      return '<span class="v1-th" style="background:' + esc(th) + '"></span><b>' + esc(l ? l.name : P.name) + '</b><span class="v1-kind">' + esc(l ? kindName(l) : 'Project') + '</span>';
    }

    /* ------------------------------------------------------------------ popover menus (⋯ and a held switch) */
    let pop = null, popAnchor = null;
    function closePop() { if (pop) { pop.remove(); pop = null; popAnchor = null; } }
    function openPop(fr, anchor, items) {
      if (pop && popAnchor === anchor) { closePop(); return; }
      closePop();
      const root = fr.f.root, p = el('div', 'v1-pop'); p.setAttribute('role', 'menu');
      items.forEach(it => {
        if (it.note) { p.appendChild(el('p', 'v1-pop-note', esc(it.note))); return; }
        const b = el('button', 'v1-pop-i' + (it.on ? ' on' : ''), (it.icon || '') + '<span>' + it.html + '</span>');
        b.type = 'button'; b.setAttribute('role', 'menuitem');
        b.addEventListener('click', e => { e.stopPropagation(); closePop(); if (it.run) it.run(); });
        p.appendChild(b);
      });
      root.appendChild(p);
      const s = fr.f.scale || 1, rr = root.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
      const ax = (ar.left - rr.left) / s - root.clientLeft, ay = (ar.top - rr.top) / s - root.clientTop;
      const maxX = root.clientWidth - p.offsetWidth - 6;
      p.style.left = Math.max(6, Math.min(maxX, ax - 4)) + 'px';
      p.style.top = Math.max(6, ay - p.offsetHeight - 6) + 'px';
      pop = p; popAnchor = anchor;
      const first = p.querySelector('button'); if (first) first.focus({ preventScroll: true });
    }
    document.addEventListener('pointerdown', e => {
      if (pop && !pop.contains(e.target) && !(popAnchor && popAnchor.contains(e.target))) closePop();
    }, true);
    host.addEventListener('keydown', e => { if (e.key === 'Escape' && pop) { const a = popAnchor; closePop(); if (a) a.focus(); } });

    /* ------------------------------------------------------------------ one frame (phone or computer) */
    // The kit shrinks a drawing to fit the box around it, and watches that box for size changes. Left alone, the box's
    // height followed the drawing, so every fit changed the box it watches: Chrome logged "ResizeObserver loop" on
    // every resize, and the phones could ratchet up to full size and spill out of their cards (QA, 29 Sep). Giving
    // the box the drawing's own shape makes its height follow its width only, so a fit can never resize it.
    function lockShape(f, w, h) {
      Object.assign(f.outer.style, { aspectRatio: w + ' / ' + h, maxWidth: w + 'px', marginInline: 'auto' });
    }
    function makeFrame(kind, mountEl, opt) {
      const fr = { kind, opt, editor: 'quick', busy: false, pending: false, openSec: null, scrollTop: { quick: 0, full: 0 },
                   anims: [], told: { quick: false, full: false }, api: null, sheet: null };
      let f;
      if (kind === 'phone') {
        f = VIS.phoneFrame(mountEl, { name: P.name, editor: 'quick', stageH: opt.stageH, tlH: opt.tlH, onTool: () => inert(fr) });
        // the timeline, the tray and the tools become one block (the part that changes), under a fixed-height phone.
        // Measure first: once wrapped, the block's flex basis is 0 and an auto-height phone would collapse it.
        const H = f.root.offsetHeight;
        f.root.style.height = H + 'px';
        const bottom = el('div', 'v1-bottom');
        f.root.insertBefore(bottom, f.timeline);
        bottom.appendChild(f.timeline); bottom.appendChild(f.tray); bottom.appendChild(f.tools);
        f.timeline.style.height = '';
        f.root.classList.add('v1-phone-root');
        fr.region = bottom;
        lockShape(f, f.root.offsetWidth, H);
        f.fit();
      } else {
        // minScale this low means the drawing always shrinks to fit its box (so lockShape holds); on a phone it is
        // the close-up (v1.css) that makes it readable, not a floor on the scale.
        f = VIS.pcFrame(mountEl, { name: P.name, editor: 'quick', width: 1100, height: 700, band: 300, inspW: 360, minScale: 0.1, onTool: () => inert(fr) });
        lockShape(f, 1100, 700);
        f.fit();
        fr.region = f.root.querySelector('.fm-bandrow');
      }
      fr.f = f;
      fr.gear = f.root.querySelector(kind === 'phone' ? '.fm-topbar [data-act="settings"]' : '.fm-transport [data-act="gear"]');
      fr.gear.classList.add('v1-sw');
      f.root.querySelectorAll('[data-act="undo"], [data-act="redo"]').forEach(b => { b.disabled = true; b.title += ' (nothing to undo here)'; });
      f.root.addEventListener('pointerdown', () => { active = fr; }, true);

      fr.setTimeText = function () {
        f.time.innerHTML = VIS.icon(S.playing ? 'pause' : 'play', 'v1-ti') + '<span>' + VIS.tc(S.t, FPS) + '</span>';
        f.time.setAttribute('aria-label', S.playing ? 'Pause' : 'Play');
      };
      fr.stage = function () {
        VIS.stage(f.stage, doc, S.t, { selected: S.sel });
        if (S.crop && opt.main) { const cv = f.stage.querySelector('.fm-canvas') || f.stage; cv.appendChild(el('div', 'v1-cropbox', '<i></i><i></i><i></i><i></i>')); }
      };
      fr.tick = function () { if (fr.api && fr.api.setTime) fr.api.setTime(S.t); fr.setTimeText(); fr.stage(); };

      fr.syncChrome = function () {
        const quick = fr.editor === 'quick';
        f.setEditor(fr.editor);                                     // Full: today's ⋯ ⧉ ◐ |◀ (or ‹ ⧉ ◐ |◀ on PC); Simple: ⋯ ✂ · |◀
        f.root.querySelectorAll('[data-act="undo"], [data-act="redo"]').forEach(b => { b.disabled = true; });
        f.tray.style.display = quick ? '' : 'none';
        f.tools.style.display = quick ? '' : 'none';
      };
      function fillBand() {
        if (fr.editor === 'quick') {
          if (!S.sel) f.tray.innerHTML = '<div class="fm-say"><b>' + mainCount + ' clips</b> · 0:' + String(Math.round(D)).padStart(2, '0') + ' · tap a clip to pick it</div>';
          // the §8.5 tray for what is picked: the clip row's, or the item's own kind's (the same row V3 and V4 show)
          else VIS.toolbar(f.tray, R0.isMain(S.sel) ? VIS.CLIP_TRAY : VIS.itemTray(R0, S.sel), { onClick: () => inert(fr) });
          if (kind === 'pc') f.panel.innerHTML = '<div class="v1-panelhint">' + VIS.icon('look') + '<span>A tool\'s panel opens here, above its tools.</span></div>';
        } else if (kind === 'pc') {
          f.panel.innerHTML = '<div class="v1-insp"><div class="v1-insp-h">' + inspHead(S.sel && byId.get(S.sel)) + '</div>' + inspRows(S.sel && byId.get(S.sel)) + '</div>';
        }
      }
      function openFor() {
        if (fr.openSec && PRESENT.includes(fr.openSec)) return fr.openSec;
        const u = S.sel && R0.units[S.sel];
        if (u && ORDER.includes(u.section)) return u.section;
        return PRESENT[0] || null;
      }
      function widenQuick(api) {
        const dx = HEAD - QHEAD;
        const w = parseFloat(api.inner.style.width) + dx;
        api.inner.style.width = w + 'px'; api.ruler.style.width = w + 'px';
        api.ruler.querySelectorAll('.tick').forEach(k => { k.style.left = (parseFloat(k.style.left) + dx) + 'px'; });
        const x0 = api.xOf, t0 = api.tOf;
        api.xOf = t => x0(t) + dx;
        api.tOf = cx => Math.max(0, t0(cx) - dx / api.pps);
        api.head = HEAD;
        if (api.playhead) { api.playhead.style.left = api.xOf(S.t) + 'px'; api.setTime = t => { api.playhead.style.left = api.xOf(t) + 'px'; }; }
        const band = api.inner.querySelector('.fm-folded');
        if (band && band.children[1]) band.children[1].style.marginLeft = (HEAD - parseFloat(band.children[0].style.width)) + 'px';
      }
      function tagMarks(api, open) {
        const marks = api.inner.querySelectorAll('.fm-folded .fm-mark'); let i = 0;
        PRESENT.filter(s => s !== open).forEach(s => (R0.lanes[s] || []).forEach(ids => ids.forEach(id => { const m = marks[i++]; if (m) m.dataset.v1mark = id; })));
      }
      function solo(api) {       // Full on a phone shows only the picked row, with its settings docked below (§6.3)
        const bar = api.items.get(S.sel); if (!bar) return;
        const keep = bar.closest('.fm-row');
        api.inner.querySelectorAll('.fm-row').forEach(r => { if (r !== keep) r.style.display = 'none'; });
        Array.from(api.items.keys()).forEach(id => { if (api.items.get(id).closest('.fm-row') !== keep) api.items.delete(id); });
        const l = byId.get(S.sel);
        const sh = el('div', 'v1-sheet',
          '<div class="v1-insp-h">' + inspHead(l) + '<button type="button" class="fm-ibtn v1-done" aria-label="Done" title="Done">' + VIS.icon('close') + '</button></div>' +
          inspRows(l) + '<p class="v1-sheet-note">Full on a phone shows only the picked layer, as it does today. ✕ shows every row.</p>');
        sh.querySelector('.v1-done').addEventListener('click', e => { e.stopPropagation(); S.sel = null; redrawAll(); });
        f.timeline.appendChild(sh);
        fr.sheet = sh;
      }
      function ensureVisible(api, id) {
        const n = api.items.get(id); if (!n) return;
        const row = n.closest('.fm-row') || n, sc = api.scroller, top = row.offsetTop;
        if (top < sc.scrollTop + 18 || top + row.offsetHeight > sc.scrollTop + sc.clientHeight) sc.scrollTop = Math.max(0, top - 24);
      }
      function render(carry) {
        const ae = document.activeElement, focusId = ae && fr.region.contains(ae) && ae.dataset ? ae.dataset.v1id : null;
        fr.sheet = null;
        const pps = (f.timeline.clientWidth - HEAD - 72) / SPAN;   // the kit adds 64 px after the end: this fits with no sideways scroll
        const common = { pxPerSec: pps, minSpan: SPAN, time: S.t, selected: S.sel,
          onTap: id => pick(id), onScrub: t => scrub(t), onOpen: s => { fr.openSec = s; fr.draw(); }, onAdd: () => inert(fr) };
        let api;
        if (fr.editor === 'full') {
          api = VIS.drawFull(f.timeline, doc, common);
          if (kind === 'phone' && S.sel && api.items.get(S.sel)) solo(api);
        } else {
          const open = kind === 'pc' ? 'all' : openFor();
          api = VIS.drawQuick(f.timeline, doc, Object.assign({ open }, common));
          widenQuick(api);
          if (open !== 'all') tagMarks(api, open);
        }
        api.items.forEach((n, id) => { n.dataset.v1id = id; });
        if (api.playhead) api.playhead.dataset.v1id = '__ph';
        fr.api = api;
        api.scroller.scrollLeft = carry.left || 0;
        api.scroller.scrollTop = carry.top || 0;
        if (S.sel && fr.editor === 'full') ensureVisible(api, S.sel);
        fillBand(); fr.stage(); fr.setTimeText();
        if (focusId) { const n = api.items.get(focusId); if (n) n.focus({ preventScroll: true }); }
      }
      fr.draw = function () {
        if (fr.busy) { fr.pending = true; return; }
        const a = fr.api;
        render({ left: a ? a.scroller.scrollLeft : 0, top: a ? a.scroller.scrollTop : fr.scrollTop[fr.editor] });
      };

      /* ---------- the animations ---------- */
      function anim(node, kf, o) { if (!node || !node.animate) return null; const a = node.animate(kf, o); fr.anims.push(a); return a; }
      function overlayBox(cls) {
        const r = fr.region, d = cls === 'snap' ? r.cloneNode(true) : el('div');
        d.classList.add(cls === 'snap' ? 'v1-snap' : 'v1-flyl');
        Object.assign(d.style, { position: 'absolute', left: r.offsetLeft + 'px', top: r.offsetTop + 'px', width: r.offsetWidth + 'px', height: r.offsetHeight + 'px', margin: '0', transform: '', opacity: '' });
        d.setAttribute('aria-hidden', 'true'); d.inert = true;
        f.root.appendChild(d);
        if (cls === 'snap') {
          const a = r.querySelectorAll('.fm-tl-scroll'), b = d.querySelectorAll('.fm-tl-scroll');
          a.forEach((x, i) => { if (b[i]) { b[i].scrollLeft = x.scrollLeft; b[i].scrollTop = x.scrollTop; } });
        }
        return d;
      }
      function measure() {
        const rr = fr.region.getBoundingClientRect(), s = f.scale || 1;
        const loc = r => ({ x: (r.left - rr.left) / s, y: (r.top - rr.top) / s, w: r.width / s, h: r.height / s });
        const items = new Map(), marks = new Map();
        fr.api.items.forEach((n, id) => { if (!n.isConnected) return; const r = n.getBoundingClientRect(); if (r.width > 0 && r.height > 0) items.set(id, { el: n, r: loc(r) }); });
        const ph = fr.api.playhead;
        if (ph && ph.isConnected) { const r = ph.getBoundingClientRect(); if (r.height > 0) items.set('__ph', { el: ph, r: loc(r) }); }
        fr.api.inner.querySelectorAll('[data-v1mark]').forEach(m => marks.set(m.dataset.v1mark, loc(m.getBoundingClientRect())));
        const v = loc(fr.api.scroller.getBoundingClientRect()); v.y += 18; v.h -= 18;      // under the sticky ruler
        return { items, marks, view: v };
      }
      function cloneFill(n) {
        const c = n.cloneNode(true);
        c.removeAttribute('tabindex'); c.removeAttribute('data-v1id');
        Object.assign(c.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', margin: '0', visibility: 'visible', opacity: '' });
        return c;
      }
      function morph(A, B, snap, to) {
        const T = 320, layer = overlayBox('fly'), hidden = [];
        const inView = (r, v) => r.y + r.h > v.y + 1 && r.y < v.y + v.h - 1;
        const clampY = (r, v) => Object.assign({}, r, { y: r.y + r.h / 2 < v.y + v.h / 2 ? v.y : v.y + v.h - r.h });
        const box = r => ({ left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
        new Set([...A.items.keys(), ...B.items.keys()]).forEach(id => {
          const a = A.items.get(id), b = B.items.get(id);
          let from, dest, fin = false, fout = false;
          if (a && b) {
            from = a.r; dest = b.r;
            const va = inView(from, A.view), vb = inView(dest, B.view);
            if (!va && !vb) return;                                   // off screen both times: nothing to see (§6.3 d)
            if (!va) { from = clampY(from, A.view); fin = true; }     // (b) starts at the nearest edge and fades in
            if (!vb) { dest = clampY(dest, B.view); fout = true; }    // (c) flies to the edge and fades out
          } else if (a) {                                             // into a folded section: fly into its line
            const m = B.marks.get(id); if (!m || !inView(a.r, A.view)) return;
            from = a.r; dest = m; fout = true;
          } else {                                                    // out of a folded section: grow from its line
            const m = A.marks.get(id); if (!m || !inView(b.r, B.view)) return;
            from = m; dest = b.r; fin = true;
          }
          const fl = el('div', 'v1-fly'); Object.assign(fl.style, box(from));
          let oc = null, nc = null;
          if (a) {
            oc = cloneFill(a.el); fl.appendChild(oc);
            const o = snap.querySelector('[data-v1id="' + cssId(id) + '"]'); if (o) o.style.visibility = 'hidden';
          }
          if (b) { nc = cloneFill(b.el); if (a) nc.style.opacity = '0'; fl.appendChild(nc); b.el.style.visibility = 'hidden'; hidden.push(b.el); }
          layer.appendChild(fl);
          anim(fl, [box(from), box(dest)], { duration: T, easing: EASE, fill: 'both' });
          if (oc && nc) {
            anim(oc, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 50, fill: 'both' });
            anim(nc, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 50, fill: 'both' });
          }
          if (fin || fout) anim(fl, [{ opacity: fin ? 0 : 1, offset: 0 }, { opacity: 1, offset: 0.375 }, { opacity: 1, offset: 0.625 }, { opacity: fout ? 0 : 1, offset: 1 }], { duration: T, fill: 'both' });
        });
        anim(snap, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-in', fill: 'both' });           // heads, dots, the + row
        anim(fr.region, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, delay: 140, easing: 'ease-out', fill: 'both' }); // labels and + fade in
        if (to === 'quick') anim(f.tools, [{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 200, delay: 160, easing: EASE, fill: 'both' });
        return { ms: T + 20, layer, hidden };
      }
      function fade(snap) { anim(snap, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'both' }); return { ms: 130 }; }

      fr.switchTo = function (target) {
        if (fr.busy) return null;
        target = target || (fr.editor === 'quick' ? 'full' : 'quick');
        if (target === fr.editor || !fr.api) return null;
        closePop();
        const from = fr.editor;
        const played = reduced() || !Element.prototype.animate ? 'fade' : 'morph';     // D11 B: the morph only
        const before = { t: S.t, sel: S.sel, json: JSON.stringify(doc), playing: S.playing };
        const A = measure();
        const snap = overlayBox('snap');
        fr.scrollTop[from] = fr.api.scroller.scrollTop;
        const left = fr.api.scroller.scrollLeft;
        fr.editor = target;
        if (target === 'quick' && S.sel) { const u = R0.units[S.sel]; if (u && ORDER.includes(u.section)) fr.openSec = u.section; }
        fr.syncChrome();
        render({ left, top: fr.scrollTop[target] });
        const B = measure();
        const rep = compare(A, B, before, from, target, played);
        fr.busy = true;
        const sheet = fr.sheet, oldSheet = snap.querySelector('.v1-sheet');
        if (sheet) sheet.style.transform = 'translateY(105%)';        // the docked sheet waits for the morph to settle
        if (oldSheet && played !== 'fade') anim(oldSheet, [{ transform: 'none' }, { transform: 'translateY(105%)' }], { duration: 120, easing: 'ease-in', fill: 'both' });
        const run = played === 'morph' ? morph(A, B, snap, target) : fade(snap);
        // tidy up when every animation has ended (a timer only as a guard: a hidden tab pauses them)
        let ended = false, guard = 0;
        const finish = () => {
          if (ended) return; ended = true; clearTimeout(guard);
          fr.anims.forEach(a => { try { a.cancel(); } catch (e) { /* already gone */ } });
          fr.anims = [];
          snap.remove(); if (run.layer) run.layer.remove();
          (run.hidden || []).forEach(n => { n.style.visibility = ''; });
          fr.region.style.transformOrigin = '';
          fr.busy = false;
          if (sheet && sheet.isConnected) {
            sheet.style.transform = '';
            if (played !== 'fade' && sheet.animate) sheet.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }], { duration: 240, easing: EASE });
          }
          if (fr.pending) { fr.pending = false; fr.draw(); }
        };
        guard = setTimeout(finish, run.ms + 4000);
        if (fr.anims.length) Promise.all(fr.anims.map(a => a.finished.catch(() => null))).then(finish);
        else setTimeout(finish, run.ms);
        if (opt.main) {
          // §6.1: the first landing in Simple on this device says where the way back is, in Simple. Landing in Full shows nothing.
          if (target === 'quick' && !S.toldQuick) { S.toldQuick = true; VIS.toast(f.root, 'Simple editor. Switch back any time from the ⚙ cog.', null, { ms: 2600 }); }
          showReport(fr, rep);
        }
        if (opt.onSwitch) opt.onSwitch(fr);
        return rep;
      };
      function barOk(to) {                 // measured on the drawing: the left end of the bar, and no switch anywhere in the frame
        const left = Array.from(f.root.querySelectorAll(kind === 'phone' ? '.fm-playbar .fm-left [data-act]' : '.fm-transport .fm-pcleft [data-act]')).map(b => b.dataset.act);
        const want = to === 'full' ? (kind === 'phone' ? FULL_BAR : ['back', 'layermenu', 'addside', 'toStart']) : (kind === 'phone' ? ['more', 'split', 'toStart'] : ['back', 'split', 'toStart']);
        return left.join() === want.join() && !f.root.querySelector('.fm-playbar [data-act="switch"], .fm-transport [data-act="switch"]');
      }
      function compare(A, B, before, from, to, played) {
        let max = 0, n = 0;
        A.items.forEach((a, id) => {
          if (id === '__ph') return;
          const b = B.items.get(id); if (!b) return;
          n++; max = Math.max(max, Math.abs(a.r.x - b.r.x), Math.abs((a.r.x + a.r.w) - (b.r.x + b.r.w)));
        });
        const pa = A.items.get('__ph'), pb = B.items.get('__ph');
        const selEl = before.sel && fr.api.items.get(before.sel);
        return { frame: opt.label, from, to, played, moved: max, n, solo: kind === 'phone' && to === 'full' && !!before.sel,
                 ph: pa && pb ? Math.abs(pa.r.x - pb.r.x) : null, tBefore: before.t, tAfter: S.t, playing: before.playing && S.playing,
                 sel: before.sel, selKept: !before.sel || !!(selEl && selEl.classList.contains('sel') && S.sel === before.sel),
                 same: JSON.stringify(doc) === before.json, fullBar: barOk(to) };
      }

      /* ---------- wiring: the ⚙ cog is the one way to switch (his rule, 1 Oct) ---------- */
      if (opt.main) {
        fr.cog = VIS.cog(f, {
          editor: () => fr.editor,
          refuse: () => (fr.busy ? 'One moment…' : null),
          warn: to => S.crop ? { title: 'Switch to ' + ED[to] + '?', text: 'Your crop isn’t applied yet. Switching closes the crop tool, and Undo can’t bring the box back.', ok: 'Apply crop and switch' } : null,
          onWarnOk: () => { setCrop(false); },   // the crop's own Done, exactly as Full's: no toast (Full shows nothing new, DESIGN §21)
          onSwitch: to => fr.switchTo(to),
          onOpen: () => { if (kind === 'pc') requestAnimationFrame(() => { const b = f.root.querySelector('.fm-cog-box'); if (b && pcSec.classList.contains('close')) pcView.scrollLeft = Math.max(0, b.offsetLeft * (f.scale || 1) - 8); }); }
        });
      }
      f.on('play', () => setPlaying(!S.playing));
      f.on('toStart', () => scrub(0));
      f.on('toEnd', () => scrub(D - 1 / FPS));
      f.on('more', (e, b) => {
        openPop(fr, b, [{ html: 'Loop' }, { html: 'Preview speed' }].map(it => Object.assign(it, { run: () => inert(fr) }))
          .concat([{ note: fr.editor === 'full' ? '…and the rest of Full\'s ⋯ menu, exactly as today' : '…and Simple\'s own: Sort by date taken, Close all gaps' }]));
      });
      ['back', 'help', 'notes', 'export', 'fit', 'split', 'layermenu', 'addside'].concat(opt.main ? [] : ['settings', 'gear']).forEach(a => f.on(a, () => inert(fr)));
      f.timeline.addEventListener('click', e => {
        if (e.target.closest('.fm-ruler, .fm-opener, .fm-seam, .fm-addclip, .v1-sheet, button')) return;
        if (S.sel) { S.sel = null; redrawAll(); }
      });

      fr.syncChrome();
      render({ left: 0, top: 0 });
      frames.push(fr);
      return fr;
    }

    /* ------------------------------------------------------------------ shared state */
    function redrawAll() { frames.forEach(x => x.draw()); }
    function pick(id) {
      S.sel = S.sel === id ? null : id;
      const u = S.sel && R0.units[S.sel];
      if (u && ORDER.includes(u.section)) frames.forEach(x => { x.openSec = u.section; });
      redrawAll();
    }
    function scrub(t) { S.t = Math.max(0, Math.min(D - 1 / FPS, t)); frames.forEach(x => x.tick()); }
    let raf = 0, lastTs = 0;
    function setPlaying(on) {
      S.playing = !!on;
      cancelAnimationFrame(raf);
      if (S.playing) { if (S.t >= D - 0.05) S.t = 0; lastTs = performance.now(); raf = requestAnimationFrame(loop); }
      frames.forEach(x => x.setTimeText());
    }
    function loop(ts) {
      if (!S.playing) return;
      if (!host.isConnected) { setPlaying(false); return; }
      S.t += Math.max(0, ts - lastTs) / 1000; lastTs = ts;
      if (S.t >= D) S.t = 0;
      frames.forEach(x => x.tick());
      raf = requestAnimationFrame(loop);
    }

    /* ------------------------------------------------------------------ the readout */
    // The readout says it in words. The measured distance (screen pixels) stays on the row as data-moved, for anyone
    // checking the check; it is not shown, because "0 px" means nothing to the person reading the page.
    function setCheck(k, ok, text, moved) {
      const li = q('.v1-checks [data-k="' + k + '"]');
      li.classList.toggle('ok', ok); li.classList.toggle('bad', !ok);
      li.querySelector('i').innerHTML = ok ? VIS.icon('check') : '!';
      li.querySelector('span').innerHTML = text;
      if (moved != null) li.dataset.moved = moved.toFixed(2); else delete li.dataset.moved;
    }
    function placeText(r) {
      if (r.moved >= 0.5) return 'Something moved left or right. That would change when it plays, and it should never happen.';
      if (r.solo) return 'Full on a phone shows only the one you picked. It did not move left or right, so it still plays at the same moment.';
      if (r.n === 0) return 'No clip was on screen both times, so there was nothing to compare.';
      if (r.n === 1) return 'The one clip on screen did not move left or right, so it still plays at the same moment.';
      return 'All ' + r.n + ' clips and items on screen stayed put. None moved left or right, so each still plays at the same moment.';
    }
    function showReport(fr, r) {
      const name = r.sel && byId.get(r.sel) ? byId.get(r.sel).name : '';
      q('.v1-last').innerHTML = esc(r.frame) + ': ' + ED[r.from] + ' → ' + ED[r.to] + ', played as <b>' + esc(NAMES[r.played]) + '</b>' +
        (r.played === 'fade' ? ' (this device asks for less motion)' : '') + '.';
      setCheck('x', r.moved < 0.5, placeText(r), r.moved);
      const phOk = r.ph == null || r.ph < 0.5;
      setCheck('ph', phOk, VIS.tc(r.tBefore, FPS) + ' before, ' + VIS.tc(r.tAfter, FPS) + ' after. ' +
        (phOk ? 'The line did not move.' : 'The line moved. This should never happen.') + (r.playing ? ' Still playing.' : ''), r.ph == null ? 0 : r.ph);
      setCheck('sel', r.selKept, r.sel ? esc(name) + ', still picked.' : 'Nothing was picked. Tap a clip first to see this one.');
      setCheck('save', r.same, r.same ? 'Nothing. The project is exactly as it was.' : 'Something changed. This should never happen.');
      if (r.to === 'full') setCheck('full', r.fullBar, r.fullBar ? 'Its play bar is ⋯ ⧉ ◐ |◀, exactly as today, with no switch on it or anywhere else in Full.' : 'Full\'s play bar is not today\'s. This should never happen.');
      else setCheck('full', r.fullBar, r.fullBar ? 'Not in Full right now. Simple\'s own bar has no switch either: the cog is the only way.' : 'A switch turned up on a play bar. This should never happen.');
    }

    /* ------------------------------------------------------------------ build */
    const phone = makeFrame('phone', q('.v1-phone'), { label: 'Phone', stageH: 190, tlH: 214, main: true });
    phone.gear.classList.add('v1-hint');
    const pc = makeFrame('pc', q('.v1-pc'), { label: 'Computer', main: true });
    [phone, pc].forEach(fr => { fr.opt.onSwitch = () => { phone.gear.classList.remove('v1-hint'); }; });
    const cropBtn = q('.v1-crop');
    function setCrop(on) { S.crop = !!on; cropBtn.setAttribute('aria-pressed', String(S.crop)); cropBtn.textContent = S.crop ? 'A crop is open, not applied' : 'Leave a crop unapplied'; frames.forEach(x => x.stage()); }
    cropBtn.addEventListener('click', () => setCrop(!S.crop));
    active = phone;

    // No E key (DESIGN §0.4 B14): the cog is the one door, in both editors.
  }
})();
