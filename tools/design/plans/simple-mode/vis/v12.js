/* V12 — The switch in the cog (DESIGN §0.4, §6, §18 V12; cog/COG-DESIGN.md; decisions D18, D22, D23).
 *
 * 1 Oct, his rule: "i dont want the original editor changing in design and function" and "the option to switch between the
 * two editors should be in the settings cog, making a third section in there". This page used to be "Buttons on the video":
 * photos of a switch put INTO Full's play bar (choices A-D of the old D2). Those are withdrawn with D2 (settled: the cog), and
 * the page now shows the cog's third block instead.
 *
 * The pictures are cog/*.jpg, copied to img/v12-cog-*.jpg: real screenshots of the app (v17.21) taken with tools/shot.py at
 * 380x800, 380x667, 440x956 and 1280x800, with a throwaway prototype of the Editor block injected into the running page for
 * each (a DOM insert; no app file was edited). DESIGN §21 (1 Oct) adds 375×553, 320×568 and sideways sizes. Their numbers (same pixels for Canvas and Friends, the 33 px and 15 px costs on
 * short phones) are COG-DESIGN §6.4's, measured in those runs. The pictures say "Simple", D1's recommended name; the rest of
 * these pages still call the new editor Simple, its working name.
 *
 * The own-devices case (his phone and Mac in one session: "Your phone can edit · clips stay put" + Options ›) is DRAWN with the
 * kit, not photographed: the line lives in Simple's tray, and Simple is not in the app yet.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.VIS || !window.VIS.register) return;
  const VIS = window.VIS, el = VIS.el, esc = VIS.esc;

  const CSS = `
.v12 { display: grid; gap: 22px; grid-template-columns: minmax(0, 1fr); }
.v12 > * { min-width: 0; }
.v12 h3 { font-family: var(--h-display); font-size: 19px; line-height: 1.2; margin: 0 0 6px; }
.v12 p { margin: 0; }
.v12-intro p + p { margin-top: 8px; }
.v12-key { display: inline-block; width: 14px; height: 14px; border: 2.5px solid #ffc233; border-radius: 4px; vertical-align: -2px; margin-right: 2px; }
.v12-find { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.v12-find li { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 10px; align-items: start; font-size: 15px; }
.v12-find .n { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font: 700 13px/1 var(--h-body); background: var(--h-accent-soft); color: var(--h-accent); }
.v12-find .warn { background: rgba(255, 194, 51, .18); color: #b07c00; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .v12-find .warn { color: #ffc233; } }
:root[data-theme="dark"] .v12-find .warn { color: #ffc233; }
.v12-find b { color: var(--h-ink); }
.v12-bar { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; justify-content: space-between; }
.v12-gal { display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 760px) { .v12-gal { grid-template-columns: repeat(2, minmax(0, 1fr)); } .v12-fig.pc { grid-column: 1 / -1; } }
.v12-fig { margin: 0; display: grid; gap: 10px; align-content: start; background: var(--h-surface); border: 1px solid var(--h-rule); border-radius: 16px; padding: 12px; min-width: 0; }
.v12-fig[hidden] { display: none; }
.v12-shot { display: block; width: 100%; padding: 0; border: 0; border-radius: 10px; overflow: hidden; background: #090d12; cursor: zoom-in; }
.v12-fig.phone .v12-shot { max-width: 440px; justify-self: center; }
/* The PC pictures carry their own titles in big type: kept to about the phone pictures' size so the two read alike (QA 29 Sep). */
.v12-fig.pc .v12-shot { max-width: 540px; justify-self: center; }
@media (min-width: 1180px) {
  .v12-fig.pc { grid-template-columns: minmax(0, 540px) minmax(0, 1fr); column-gap: 20px; }
  .v12-fig.pc .v12-shot { justify-self: start; }
}
.v12-shot img { display: block; width: 100%; height: auto; }
.v12-fig figcaption { display: grid; gap: 6px; align-content: start; }
.v12-caphead { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.v12-fig figcaption .sz, .v12-own .sz { font-family: var(--h-mono); font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--h-muted); }
.v12-fig figcaption p { font-size: 14.5px; color: var(--h-muted); }
.v12-fig figcaption h3 { margin: 0; }
/* "Open big" lives beside the caption, never on the picture: on the picture it covered the play bar it was showing. */
.v12-open { font: 600 13.5px/1 var(--h-body); color: var(--h-accent); background: var(--h-accent-soft); border: 1px solid transparent; border-radius: 999px;
  padding: 0 14px; min-height: 40px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
.v12-open svg { width: 15px; height: 15px; }
@media (hover: hover) { .v12-open:hover { border-color: var(--h-accent); } }
.v12-miss { padding: 18px; font-size: 14px; color: var(--h-muted); border: 1px dashed var(--h-rule); border-radius: 10px; }
.v12-rows { list-style: none; margin: 0; padding: 0; display: grid; }
.v12-rows > li { display: grid; gap: 8px; padding: 10px 0; border-bottom: 1px solid var(--h-rule); }
.v12-rows > li:last-child { border-bottom: 0; }
@media (min-width: 760px) { .v12-rows > li { grid-template-columns: 240px minmax(0, 1fr); align-items: center; gap: 14px; } }
.v12-rows .nm b { font-size: 14.5px; }
.v12-rows .nm small { display: block; font-size: 12.5px; color: var(--h-muted); }
.v12-rows .chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.v12-slot { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 8px; background: var(--h-surface-2); border: 1px solid var(--h-rule); font-size: 13.5px; white-space: nowrap; }
.v12-slot i { font: 600 11px/1 var(--h-mono); font-style: normal; color: var(--h-muted); }
.v12-slot.new { background: rgba(255, 194, 51, .16); border-color: #ffc233; font-weight: 600; }
.v12-slot.gap { background: transparent; border-style: dashed; color: var(--h-muted); }
.v12-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.v12-rec { font: 600 11px/1 var(--h-body); color: var(--h-accent); margin-left: 4px; }
.v12 details summary { cursor: pointer; font-weight: 600; min-height: 32px; display: flex; align-items: center; }
.v12 details ul { margin: 8px 0 0; padding-left: 20px; font-size: 14.5px; color: var(--h-muted); display: grid; gap: 6px; }

/* your own phone and Mac (drawn) */
.v12-own > p + p { margin-top: 8px; }
.v12-own-grid { display: grid; gap: 18px; margin-top: 14px; grid-template-columns: minmax(0, 1fr); }
.v12-ofig { margin: 0; display: grid; gap: 10px; align-content: start; min-width: 0; }
.v12-ofig figcaption { display: grid; gap: 6px; align-content: start; }
.v12-ofig figcaption h3 { margin: 0; }
.v12-ofig figcaption p { font-size: 14.5px; color: var(--h-muted); }
.v12-oframe { min-width: 0; }
.v12-ofig.phone .v12-oframe { max-width: 394px; width: 100%; justify-self: center; }
@media (min-width: 1180px) {
  .v12-ofig.phone { grid-template-columns: 394px minmax(0, 1fr); column-gap: 20px; }
  .v12-ofig.phone .v12-oframe { justify-self: start; }
}
.v12-own .fm .v12-oc { position: absolute; left: 8px; top: 8px; z-index: 3; display: flex; align-items: center; gap: 6px; }
.v12-own .fm .v12-face { width: 26px; height: 26px; border-radius: 50%; background: var(--who); color: #0b1216; display: grid; place-items: center; font: 800 12.5px/1 -apple-system, sans-serif; position: relative; flex: none; }
.v12-own .fm .v12-face .g { position: absolute; right: -6px; bottom: -5px; width: 15px; height: 15px; border-radius: 4px; background: #0b1216; color: #fff; display: grid; place-items: center; }
.v12-own .fm .v12-face .g svg { width: 11px; height: 11px; }
.v12-own .fm .v12-bub { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: rgba(10, 20, 26, .8); border: 1px solid var(--glass-rim); color: var(--text); }
.v12-own .fm .v12-bub svg { width: 15px; height: 15px; }
.v12-own .fm .v12-line { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; padding: 0 4px 0 6px; }
.v12-own .fm .v12-line .t { flex: 1 1 auto; min-width: 0; font-size: 12.5px; line-height: 1.25; color: var(--text); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.v12-own .fm .v12-line .b { flex: none; height: 32px; padding: 0 11px; border-radius: 9px; display: inline-flex; align-items: center; font-weight: 700; font-size: 12px; white-space: nowrap;
  color: var(--accent); background: var(--accent-soft); border: 1px solid var(--accent); box-shadow: 0 0 0 2px rgba(90, 199, 237, .3); }
.v12-own .fm .v12-menu { position: absolute; z-index: 30; min-width: 180px; padding: 5px; border-radius: 12px; background: var(--panel-3); border: 1px solid var(--line); box-shadow: 0 14px 34px rgba(0, 0, 0, .6); }
.v12-own .fm .v12-menu .mi { display: flex; align-items: center; min-height: 42px; padding: 0 12px; border-radius: 8px; font-size: 13.5px; font-weight: 600; color: var(--text); }
.v12-own .fm .v12-menu .mi:first-child { color: var(--accent); background: var(--accent-soft); }
/* the PC drawing is small on a phone: the line and its menu again, at full size */
.v12-close { border-radius: 12px; border: 1px solid #22313a; background: var(--panel); padding: 10px; display: grid; gap: 8px; justify-items: end; max-width: 380px; width: 100%; justify-self: center; }
.v12-close .cap { justify-self: start; font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: .06em; }
.v12-own .v12-close .v12-menu { position: static; }
.v12-close .v12-line { height: 46px; border-top: 1px solid var(--line-soft); background: var(--panel-2); border-radius: 8px; }
@media (min-width: 1180px) { .v12-close { display: none; } }

/* the picture, big */
.v12-lb { position: fixed; inset: 0; z-index: 1000; background: #05080b; display: flex; flex-direction: column; }
.v12-lb[hidden] { display: none; }
/* solid, so nothing behind shows through the bar (QA 29 Sep) */
.v12-lb-top { position: relative; z-index: 2; flex: none; display: flex; gap: 8px; align-items: center; padding: 10px 12px; padding-top: max(10px, env(safe-area-inset-top));
  color: #fff; background: #0e151c; border-bottom: 1px solid rgba(255, 255, 255, .14); box-shadow: 0 6px 18px rgba(0, 0, 0, .45); }
.v12-lb-top .t { flex: 1; min-width: 0; font: 600 15px/1.25 var(--h-body); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v12-lb-top button { flex: none; font: 600 14px/1 var(--h-body); color: #fff; background: rgba(255, 255, 255, .1); border: 1px solid rgba(255, 255, 255, .22); border-radius: 10px; padding: 10px 14px; min-height: 44px; cursor: pointer; }
@media (hover: hover) { .v12-lb-top button:hover { background: rgba(255, 255, 255, .18); } }
.v12-lb-body { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 12px; display: flex; }
.v12-lb-body img { display: block; flex: none; margin: auto; max-width: none; cursor: zoom-in; border-radius: 6px; }
.v12-lb.big .v12-lb-body img { cursor: zoom-out; }
`;

  /* The pictures, all in img/, made from the real app (see the note at the top of this file). */
  const SHOTS = [
    { file: 'v12-cog-1-phone-380-small.jpg', w: 1200, h: 1431, kind: 'phone', size: 'Phone · 380×800',
      title: 'The cog with a third block, small',
      text: 'Left is today. Right adds the Editor block on top: the Simple ⇄ Full switch and “What should you use?”. Friends and Canvas settings sit on exactly the same pixels in both.' },
    { file: 'v12-cog-2-phone-380-open-and-switch.jpg', w: 1200, h: 1431, kind: 'phone', size: 'Phone · 380×800 · open, then a switch',
      title: '“What should you use?” and the switch',
      text: 'Left: the Editor block open, with the other two shrunk to bars, the way they shrink today. Right: just after tapping the switch, the knob slides to the other editor, then the cog closes so you see it. Nothing is written to the project and no Undo step is made.' },
    { file: 'v12-cog-3-phone-440.jpg', w: 1200, h: 1353, kind: 'phone', size: 'Phone · 440×956 · your phone',
      title: 'At your phone’s size',
      text: 'Editor small, with Canvas and Friends on today’s pixels; then the Editor block open. The explanation fits with no scrolling.' },
    { file: 'v12-cog-7-short-phones.jpg', w: 1200, h: 820, kind: 'phone', size: 'Small phones · 380×667 and 380×800',
      title: 'Where the extra bar does cost room',
      text: 'The honest cost, only on shorter screens. At 380×667 Canvas keeps its size and sits 15 px lower. At 380×800 with Friends open, the Friends block is 33 px shorter and scrolls. Shorter still (375×553, a phone in Safari; 320×568) Canvas sits 72 px lower and is 68 px shorter, so Background and Size scroll (Apply stays). On your phone held upright nothing moves. Turned sideways (956×440) Canvas and Friends stay put, but the Editor tile lands off the top of the screen: not solved yet (D24).' },
    { file: 'v12-cog-4-pc-1280-small.jpg', w: 1200, h: 690, kind: 'pc', size: 'PC · 1280×800',
      title: 'On a PC: the Editor tile',
      text: 'Hung off the cog as today. The Editor tile sits above the Friends tile, in the same narrow column, so no extra width is needed and Canvas settings stays where it is.' },
    { file: 'v12-cog-5-pc-1280-three-states.jpg', w: 1200, h: 722, kind: 'pc', size: 'PC · 1280×800 · one big, two small',
      title: 'On a PC: whichever you open is big',
      text: 'Left: the Editor block open, with Friends and Canvas as tiles. Right: Friends open, with the Editor and Canvas tiles beside it, Friends and Canvas exactly as today.' },
    { file: 'v12-cog-6-pc-1280-warning.jpg', w: 1200, h: 690, kind: 'pc', size: 'PC · 1280×800 · the warning',
      title: 'A warning only when something would be lost',
      text: 'Left: a crop drawn but not applied, then the switch. Closing the crop tool would throw the box away and Undo couldn’t bring it back, so it asks: Stay, or Apply crop and switch. Right: nothing to lose, so the switch just happens.' }
  ];
  const srcOf = s => 'img/' + s.file;

  /* What the pictures show, measured in the same runs (cog/COG-DESIGN.md §6.4, §7). */
  const FINDINGS = [
    { warn: false, html: '<b>Full does not change.</b> Its play bar, its ⋯ menu and the video keep exactly today’s buttons. The cog is the one place to switch, in both editors; Simple’s play bar has no switch either.' },
    { warn: false, html: '<b>Canvas settings and Friends do not move.</b> With the Editor block small they sit on the same pixels as today on your phone, at 380×800 with Canvas open, and on a PC.' },
    { warn: false, html: '<b>Two taps to switch:</b> ⚙, then the switch. The cog closes so you see the other editor. It stays open only when Canvas settings has picks you have not applied, so nothing is thrown away (D23).' },
    { warn: false, html: '<b>“What should you use?” opens the block big</b>, the same way Friends and Canvas settings open today. It stays small unless you want the explanation.' },
    { warn: true, html: '<b>The cost is on short screens only.</b> At 380×667 Canvas sits 15 px lower. At 380×800 with Friends open, the Friends block is 33 px shorter and scrolls. At 375×553 and 320×568 Canvas is 72 px lower and 68 px shorter (Background and Size scroll; Apply stays). Upright, nothing moves on your phone. Sideways (956×440) the Editor tile is off the top of the screen: D24 asks how to fix it.' },
    { warn: false, html: '<b>A warning only when Undo couldn’t bring something back:</b> a crop, touch-up, pen drawing or voice take not yet applied, or steps waiting on Redo. Anything else just switches.' }
  ];

  /* The play bars, slot by slot (DESIGN §6.1, §15.1, D18). `n` marks a button that differs from Full's; `g` an empty slot. */
  const PHONE_ROWS = [
    { name: 'Full', note: 'exactly as today, in every release', slots: [['Options'], ['Copy'], ['Add-row switch'], ['To start']] },
    { name: 'Simple · row A', rec: true, note: 'decision D18: To start stays where Full has it', slots: [['Options'], ['Split', 'n'], ['', 'g'], ['To start']] },
    { name: 'Simple · row B', note: 'decision D18: packed', slots: [['Options'], ['Split', 'n'], ['To start']] }
  ];
  const PC_ROWS = [
    { name: 'Full', note: 'exactly as today', slots: [['Back'], ['…', 'g'], ['Copy'], ['Add-row switch'], ['To start']] },
    { name: 'Simple', slots: [['Back'], ['Split', 'n'], ['…', 'g'], ['To start']] }
  ];

  function rowsList(rows, label, counted) {
    let h = '<ul class="v12-rows" aria-label="' + esc(label) + '">';
    rows.forEach(r => {
      h += '<li><div class="nm"><b>' + esc(r.name) + '</b>' + (r.rec ? '<span class="v12-rec">recommended</span>' : '') + (r.note ? '<small>' + esc(r.note) + '</small>' : '') + '</div><ol class="chips">';
      let n = 0;
      r.slots.forEach(sl => {
        const cls = sl[1] === 'n' ? ' new' : sl[1] === 'g' ? ' gap' : '';
        const num = sl[1] === 'g' && sl[0] === '…' ? '' : '<i>' + (++n) + '</i>';
        h += '<li class="v12-slot' + cls + '">' + (counted ? num : '') + (sl[0] ? esc(sl[0]) : '<span class="v12-sr">empty</span>') + (sl[1] === 'n' ? '<span class="v12-sr"> (only in Simple)</span>' : '') + '</li>';
      });
      h += '</ol></li>';
    });
    return h + '</ul>';
  }

  /* The picture, big. "See it all" fits the whole picture in the window (both ways); "Zoom in" shows it at its own
     size, or bigger when that would hardly be a zoom. Tapping the picture zooms in on the spot you tapped.
     QA 29 Sep: it used to open at its own size, twice the window's height, and both buttons changed nothing at 1280. */
  function lightbox() {
    let lb = document.getElementById('v12-lb');
    if (lb) return lb._api;
    lb = el('div', 'v12-lb');
    lb.id = 'v12-lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Picture');
    lb.innerHTML = '<div class="v12-lb-top"><span class="t"></span><button type="button" class="sz" aria-pressed="false">Zoom in</button><button type="button" class="x">Close</button></div><div class="v12-lb-body"><img alt=""></div>';
    document.body.appendChild(lb);
    const img = lb.querySelector('img'), body = lb.querySelector('.v12-lb-body'), t = lb.querySelector('.t'), sz = lb.querySelector('.sz'), x = lb.querySelector('.x');
    const PAD = 12;
    let shot = null, big = false, back = null, rq = 0;
    function scales() {
      const cw = Math.max(60, body.clientWidth - 2 * PAD), ch = Math.max(60, body.clientHeight - 2 * PAD);
      const fit = Math.min(cw / shot.w, ch / shot.h, 1);
      const zoom = fit * 1.6 > 1 ? Math.min(fit * 2.2, 3) : 1;      // its own pixels, unless that is barely bigger
      return { fit, zoom };
    }
    /* which part of the picture sits under a point on screen (as fractions), so a zoom can keep it there */
    function spotAt(cx, cy) {
      const r = img.getBoundingClientRect();
      if (!r.width || !r.height) return { fx: 0.5, fy: 0.5, cx, cy };
      return { fx: Math.min(1, Math.max(0, (cx - r.left) / r.width)), fy: Math.min(1, Math.max(0, (cy - r.top) / r.height)), cx, cy };
    }
    function middle() { const br = body.getBoundingClientRect(); return spotAt(br.left + br.width / 2, br.top + br.height / 2); }
    function apply(spot) {
      if (!shot) return;
      const s = scales(), k = big ? s.zoom : s.fit;
      const w = Math.round(shot.w * k), h = Math.round(shot.h * k);
      img.style.width = w + 'px'; img.style.height = h + 'px';
      lb.classList.toggle('big', big);
      sz.textContent = big ? 'See it all' : 'Zoom in';
      sz.setAttribute('aria-pressed', String(big));
      img.title = big ? 'Tap to see it all' : 'Tap to zoom in here';
      if (big && spot) {
        const br = body.getBoundingClientRect();
        const left = Math.max(PAD, (body.clientWidth - w) / 2), top = Math.max(PAD, (body.clientHeight - h) / 2);
        body.scrollLeft = Math.round(left + spot.fx * w - (spot.cx - br.left));
        body.scrollTop = Math.round(top + spot.fy * h - (spot.cy - br.top));
      } else if (!big) { body.scrollLeft = 0; body.scrollTop = 0; }
    }
    const setBig = (on, spot) => { big = on; apply(spot || null); };
    const onResize = () => { if (lb.hidden || rq) return; rq = requestAnimationFrame(() => { rq = 0; apply(big ? middle() : null); }); };
    const close = () => {
      lb.hidden = true; img.removeAttribute('src'); shot = null;
      document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize);
      if (back && back.focus) back.focus();
    };
    const onKey = e => {
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {                                         // keep the keyboard inside the picture's two buttons
        const first = sz, last = x;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!lb.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    };
    sz.addEventListener('click', () => setBig(!big, big ? null : middle()));
    img.addEventListener('click', e => { e.stopPropagation(); setBig(!big, big ? null : spotAt(e.clientX, e.clientY)); });
    x.addEventListener('click', close);
    body.addEventListener('click', e => { if (e.target === body) close(); });
    const api = {
      open(s, from) {
        back = from || null; shot = s; big = false;
        t.textContent = s.title;
        img.alt = s.alt;
        img.src = srcOf(s);
        lb.hidden = false;
        apply(null);
        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', onResize);
        x.focus();
      }
    };
    lb._api = api;
    return api;
  }

  /* ---- your own phone and Mac, drawn with the kit (DESIGN §3.11 whoWord, §10.7). The line names the OTHER device,
     and only the device that started sharing has Options ›. ---- */
  const GQ = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x=".6" y="3.4" width="3.3" height="5.2" rx=".9" fill="currentColor"/><rect x="4.35" y="3.4" width="3.3" height="5.2" rx=".9" fill="currentColor"/><rect x="8.1" y="3.4" width="3.3" height="5.2" rx=".9" fill="currentColor"/></svg>';
  const BUBBLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>';
  const EXPAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>';
  const lineHTML = who => '<div class="v12-line"><span class="t">' + esc(who + ' can edit · clips stay put') + '</span><span class="b">Options ›</span></div>';
  const MENU_HTML = '<div class="mi">Make it a Viewer</div><div class="mi">Open in Full</div>';
  function offIn(node, root) {
    let top = 0, left = 0, n = node;
    while (n && n !== root) { top += n.offsetTop; left += n.offsetLeft; n = n.offsetParent; }
    return { top, left };
  }
  function drawOwn(host, kind) {
    const pc = kind === 'pc', doc = VIS.sample('beach'), t = 8.2, sel = 'c3';
    const f = pc
      ? VIS.pcFrame(host, { name: 'Beach day', editor: 'quick', width: 1100, height: 640, band: 250, inspW: 330, minScale: 0.1 })
      : VIS.phoneFrame(host, { name: 'Beach day', editor: 'quick', stageH: 190, tlH: 176 });
    f.root.setAttribute('aria-hidden', 'true');                   // a picture: the words are in the caption beside it
    try { f.root.inert = true; } catch (e) {}
    VIS.stage(f.stage, doc, t, { selected: sel });
    VIS.drawQuick(f.timeline, doc, pc ? { time: t, selected: sel, open: 'all', addButton: false, showLink: false }
      : { time: t, selected: sel, addButton: false, showLink: false });
    f.setTime(t, 30);
    const oc = el('div', 'v12-oc');
    // the other device's face: your Mac (blue) on the phone, your phone (green) on the Mac, both in Simple; LIVE and the
    // comments bubble are phone things (the PC pictures above have neither)
    oc.innerHTML = '<span class="v12-face" style="--who:' + (pc ? '#6fd6a0' : '#93a9ff') + '">E<span class="g">' + GQ + '</span></span>';
    if (!pc) { oc.appendChild(VIS.chip('LIVE', 'live')); oc.appendChild(el('span', 'v12-bub', BUBBLE)); }
    f.stage.appendChild(oc);
    f.tray.innerHTML = lineHTML(pc ? 'Your phone' : 'Your computer');
    const m = el('div', 'v12-menu', MENU_HTML);
    f.root.appendChild(m);
    const place = () => {
      if (!f.root.isConnected) return;
      const o = offIn(f.tray, f.root);
      m.style.bottom = (f.root.clientHeight - o.top + 6) + 'px';
      m.style.right = Math.max(8, f.root.clientWidth - (o.left + f.tray.offsetWidth) + 8) + 'px';
    };
    place(); requestAnimationFrame(place);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(place).observe(f.root);
    return f;
  }

  VIS.register('v12', {
    title: 'The switch in the cog',
    blurb: 'Real pictures of the app with the cog’s third block, small and open, on a phone and a PC, and the warning.',
    mount(host) {
      if (!document.getElementById('v12-css')) { const st = el('style'); st.id = 'v12-css'; st.textContent = CSS; document.head.appendChild(st); }
      const root = el('div', 'v12');
      host.appendChild(root);

      const intro = el('section', 'h-card v12-intro');
      intro.innerHTML =
        '<h3>The switch lives in the ⚙ cog</h3>' +
        '<p>Your words: <q>the option to switch between the two editors should be in the settings cog, making a third section in there.</q> So the cog gets a third block, Editor, beside Canvas settings and Friends. It stays small: a switch and a <b>What should you use?</b> button that opens it big, the way the other two open. Nothing is added to Full anywhere else.</p>' +
        '<p>These are real screenshots of FreeMotion as it is today (v17.21). For each one a stand-in of the Editor block was slipped into the running app just for the photo. Nothing in the app was changed.</p>' +
        '<p class="h-note">The pictures say <b>Simple</b> and <b>Full</b>, the names you picked (D1). The block’s icon is a stand-in; the real one is drawn from your D16 pick and shown to you before it ships.</p>';
      root.appendChild(intro);

      const find = el('section', 'h-card');
      find.innerHTML = '<h3>What the pictures show</h3>';
      const ul = el('ol', 'v12-find');
      FINDINGS.forEach((f, i) => { const li = el('li'); li.innerHTML = '<span class="n' + (f.warn ? ' warn' : '') + '" aria-hidden="true">' + (i + 1) + '</span><span>' + f.html + '</span>'; ul.appendChild(li); });
      find.appendChild(ul);
      root.appendChild(find);

      /* the gallery */
      const galWrap = el('section');
      const bar = el('div', 'v12-bar');
      bar.innerHTML = '<h3 style="margin:0">The pictures</h3>';
      const seg = el('div', 'h-seg');
      seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Show pictures for');
      [['all', 'All'], ['phone', 'Phone'], ['pc', 'PC']].forEach(([k, label]) => { const b = el('button', '', esc(label)); b.type = 'button'; b.dataset.k = k; seg.appendChild(b); });
      bar.appendChild(seg);
      galWrap.appendChild(bar);
      const tip = el('p', 'h-note', 'Tap a picture to open it big. It opens whole; tap it again to zoom in on that spot.');
      tip.style.margin = '6px 0 12px';
      galWrap.appendChild(tip);
      const gal = el('div', 'v12-gal');
      galWrap.appendChild(gal);
      root.appendChild(galWrap);

      const lb = lightbox();
      const figs = SHOTS.map(s => {
        s.alt = s.title + '. ' + s.text;
        const fig = el('figure', 'v12-fig ' + s.kind);
        fig.dataset.kind = s.kind;
        const open = el('button', 'v12-open', EXPAND + '<span>Open big</span>');
        open.type = 'button';
        open.setAttribute('aria-label', 'Open big: ' + s.title);
        open.addEventListener('click', () => lb.open(s, open));
        const b = el('button', 'v12-shot');
        b.type = 'button';
        b.tabIndex = -1;                                           // the keyboard uses "Open big" beside the caption
        b.setAttribute('aria-label', 'Open big: ' + s.title);
        const img = el('img');
        img.alt = s.alt; img.width = s.w; img.height = s.h; img.loading = 'lazy'; img.decoding = 'async';
        img.addEventListener('error', () => { const m = el('div', 'v12-miss', 'This picture did not load (img/' + esc(s.file) + '). It has to be published next to this page.'); b.replaceWith(m); open.remove(); }, { once: true });
        img.src = srcOf(s);
        b.appendChild(img);
        b.addEventListener('click', () => lb.open(s, open));
        fig.appendChild(b);
        const cap = el('figcaption');
        cap.innerHTML = '<div class="v12-caphead"><span class="sz">' + esc(s.size) + '</span></div><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p>';
        cap.firstChild.appendChild(open);
        fig.appendChild(cap);
        gal.appendChild(fig);
        return fig;
      });
      let filter = 'all';
      try { const f = localStorage.getItem('vis.v12.filter'); if (f === 'phone' || f === 'pc') filter = f; } catch (e) {}
      function applyFilter() {
        seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === filter)));
        figs.forEach(f => { f.hidden = !(filter === 'all' || f.dataset.kind === filter); });
      }
      seg.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        filter = b.dataset.k; applyFilter();
        try { localStorage.setItem('vis.v12.filter', filter); } catch (err) {}
      });
      applyFilter();

      /* your own phone and Mac (DESIGN §18 V12: the own-devices case, with its Options menu, at 380 and 1280) */
      const own = el('section', 'h-card v12-own');
      own.innerHTML =
        '<h3>Your own phone and Mac</h3>' +
        '<p>When your phone and your Mac share one project, each counts as someone who can edit. So while both can edit, moving clips stops on both (D14b), and the tools say why. You tapped Delete on Sandcastle here. This is all in Simple: Full shows nothing new.</p>' +
        '<p class="h-note">Drawn, not photographed: this line is not in the app yet.</p>';
      const grid = el('div', 'v12-own-grid');
      const mk = (kind, size, title, text) => {
        const fig = el('figure', 'v12-ofig ' + kind);
        const frame = el('div', 'v12-oframe');
        fig.appendChild(frame);
        const cap = el('figcaption', '', '<span class="sz">' + esc(size) + '</span><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>');
        grid.appendChild(fig);
        return { fig, frame, cap };
      };
      const ph = mk('phone', 'Drawn · phone · 380', 'On your phone, when your phone started sharing',
        'The line names your Mac: “Your computer can edit · clips stay put”, with Options › beside it. Options opens upward over the clips: Make it a Viewer, or Open in Full. Your Mac’s face, LIVE and the comments bubble stay in the video’s corner, well away from it.');
      const pcf = mk('pc', 'Drawn · PC · 1280', 'On your Mac, when your Mac started sharing',
        'The same line names your phone: “Your phone can edit · clips stay put”. It sits with the tools on the left, under the video, and its menu opens upward inside that panel. Your phone’s face is at the top left of the picture, far from both.');
      own.appendChild(grid);
      const after = el('p', 'h-note', 'Only the device that started sharing gets Options. The other one reads “Clips stay put while you both edit”, with no menu. To watch it happen step by step, open <a href="#v6">V6, Two people, two editors</a> and pick “Your phone and Mac”.');
      after.style.marginTop = '14px';
      own.appendChild(after);
      root.appendChild(own);
      // drawn once the card is on the page, so the frames can measure their room
      drawOwn(ph.frame, 'phone');
      ph.fig.appendChild(ph.cap);
      drawOwn(pcf.frame, 'pc');
      const close = el('div', 'fm v12-close', '<span class="cap">Close up</span><div class="v12-menu" aria-hidden="true">' + MENU_HTML + '</div>' + lineHTML('Your phone'));
      close.setAttribute('aria-hidden', 'true');
      pcf.fig.appendChild(close);
      pcf.fig.appendChild(pcf.cap);

      /* slot by slot */
      const slots = el('section', 'h-card');
      slots.innerHTML =
        '<h3>The play bars, slot by slot</h3>' +
        '<p class="h-note" style="margin-bottom:10px">The buttons left of the time, counted from the left edge. Full’s row is today’s and never changes. Amber marks what only Simple has. Neither row has a switch.</p>' +
        rowsList(PHONE_ROWS, 'Phone play bar, slot by slot', true) +
        '<h3 style="margin-top:18px">On a PC</h3>' +
        '<p class="h-note" style="margin-bottom:10px">The left end of the play bar, from the left. The … is the gap before the time. The cog stays where it is today, near the right end.</p>' +
        rowsList(PC_ROWS, 'PC play bar, left end', false);
      root.appendChild(slots);

      /* how they were made */
      const how = el('details', 'h-card');
      how.innerHTML =
        '<summary>How these pictures were made</summary>' +
        '<ul>' +
        '<li>Taken automatically on this Mac, each in a fresh browser that starts empty: phones at 380×800, 380×667 and 440×956 (acting as a touch phone), and a 1280×800 window with a mouse.</li>' +
        '<li>A throwaway stand-in builds the Editor block and its styles inside the running app, then the cog is opened the real way, by tapping ⚙. No file in the app was edited.</li>' +
        '<li>“Same pixels” was measured: the same crops of the two screenshots, with and without the block, compared colour by colour (largest difference 3 of 255, from the blurred video behind).</li>' +
        '<li>The warning used a real crop box, drawn but not applied, on a picture made in memory. Your own projects were never opened.</li>' +
        '<li>Your own phone and Mac are drawn, not photographed, because that line is not in the app yet. V6 plays the same moment through, step by step.</li>' +
        '</ul>';
      root.appendChild(how);
    }
  });
})();
