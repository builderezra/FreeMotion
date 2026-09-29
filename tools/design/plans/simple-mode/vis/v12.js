/* V12 — Buttons on the video (DESIGN §6.1, §18 V12; decisions D2 and D18). The hub's name for it; "chrome" read as
 * the Google browser (QA 29 Sep).
 *
 * Real screenshots of the app (v17.12), taken with tools/shot.py at 380x800, 380x667 and 440x956 (touch phone) and
 * 1280x800 (mouse). The proposed Quick/Full editor button was INJECTED into the running page for each photo
 * (a DOM insert, nothing on disk changed), and the amber boxes were drawn on the pictures afterwards.
 * "With a friend in" is the app's own sharing engine with a pretend friend joined through an in-page loopback
 * link — no socket and no peer connection was opened in any run (both counted, both 0).
 * The numbers behind FINDINGS were measured in those same runs (button rects, the options strip's scroll height,
 * the note's size); the words on the page leave the pixel maths out. The pictures live in img/ next to this file
 * (the 380x667 one is WebP, img/v12-phone-667.webp; it was embedded in this file until the V12 handoff moved it out).
 * Measured at 380x667: the options strip has 254 px of room for 278 px of buttons today (the last one is already
 * half cut off), and 324 px with D2-B's switch on top, so the last two are out of sight.
 *
 * The own-devices case (his phone and Mac in one session: "Your phone can edit · clips stay put" + Options ›) is
 * DRAWN with the kit, not photographed: the line lives in Quick's tray, and Quick is not in the app yet.
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
    { file: 'v12-phone-full-alone.jpg', w: 760, h: 1817, kind: 'phone', size: 'Phone · 380×800 · alone',
      title: 'Full on a phone, on your own',
      text: 'Top: choice A puts the switch third on the play bar, where your add-row switch is now (that moves into the options menu). Bottom: choice B leaves your play bar alone and puts the switch first in the options menu. The person+ door stays in the top-left corner of the video both times.' },
    { file: 'v12-phone-full-live.jpg', w: 760, h: 1780, kind: 'phone', size: 'Phone · 380×800 · with a friend',
      title: 'Full on a phone, with a friend in',
      text: 'Sam’s face, the red LIVE pill and the comments bubble sit in the top-left corner of the video. Neither choice goes near them: the switch lives on the play bar, a long way below. With the options menu open (bottom) the menu covers Sam’s face, but it already does that today.' },
    { file: 'v12-phone-667.webp', w: 760, h: 1632, kind: 'phone', size: 'Small phone · 380×667',
      title: 'On a small phone',
      text: 'The same two choices on a smaller screen, like an iPhone SE. The video shrinks, the play bar stays the same, so A looks just as it does above. B’s snag gets worse here: the options menu is too short even today, and with the switch on top, its last two buttons are out of sight until you scroll it.' },
    { file: 'v12-phone-quick.jpg', w: 760, h: 2228, kind: 'phone', size: 'Phone · 380×800 · Quick',
      title: 'Quick’s play bar',
      text: 'Row A (recommended): options, split, switch, to start. Split takes the spot where Full has copy, and the switch takes the add-row switch’s spot, so the switch is third in both editors. Row B swaps the two. Full’s row is at the bottom so you can see exactly what changes.' },
    { file: 'v12-phone-back.jpg', w: 760, h: 1633, kind: 'phone', size: 'Phone · 380×800 · the way back',
      title: 'Landing in Full from Quick',
      text: 'After a mis-tap, or “Open in Full” on something, choice B puts a back button third on the play bar until you go back, plus a short note that lets taps through. On a narrow phone the note wraps to three lines. Under choice A the switch is already there, so it just gets the arrow and the ring.' },
    { file: 'v12-phone-440.jpg', w: 880, h: 2512, kind: 'phone', size: 'Phone · 440×956 · your phone',
      title: 'At your phone’s width',
      text: 'Choice C only works on wide phones like yours: every play-bar button gets a little smaller so five fit on the left, and it only just fits before the time. Under choice B your row stays exactly as it is today. Then the back button and Quick’s row on your phone.' },
    { file: 'v12-pc-full.jpg', w: 1200, h: 1976, kind: 'pc', size: 'PC · 1280×800',
      title: 'Full on a PC',
      text: 'Lots of room: the switch sits right after the back arrow at the left end of the play bar. Sam’s face is at the top left of the picture and Share is beside Export on the right, both far from it. A PC has no LIVE pill or comments bubble on the picture; those two are phone things.' },
    { file: 'v12-pc-quick.jpg', w: 1200, h: 1572, kind: 'pc', size: 'PC · 1280×800 · Quick and the way back',
      title: 'Quick on a PC, and the way back',
      text: 'Quick’s left end reads back, split, switch, to start: split comes before the switch on the phone and the PC alike. After landing in Full from Quick, a PC has room for a worded “‹ Quick” button, and the note fits on one line.' }
  ];
  const srcOf = s => 'img/' + s.file;

  /* What the pictures showed, measured in the same runs (the numbers are in the note at the top of this file). */
  const FINDINGS = [
    { warn: false, html: '<b>Nothing on the video has to move.</b> The top-left corner holds the person+ door when you are on your own, and Sam’s face, LIVE and the comments bubble when a friend is in. Every choice keeps the switch on the play bar, well below them.' },
    { warn: false, html: '<b>A and Quick’s rows swap a button rather than add one</b>, so the play bar holds exactly as many buttons as today. On a narrow phone that row already runs right to the screen’s edges. That is true today, and nothing here changes it.' },
    { warn: true, html: '<b>B has a snag on the phone.</b> The options menu there is a tall strip of icons, not a list of words, and it is already full. Put the switch at the top and the last button (clear export marks) slides out of sight until you scroll the strip. On a small phone it is worse: the strip is too short even today, and with B two buttons are hidden. B needs a small fix: a shorter item, or a strip that is meant to scroll.' },
    { warn: false, html: '<b>C fits on your phone, just</b>, because every play-bar button gets a little smaller. On a phone only a bit narrower than yours it cannot fit, and falls back to B.' },
    { warn: true, html: '<b>The way-back note is long for a phone:</b> three lines on a narrow phone, two on yours, one on a PC. It sits over the clips but lets taps through. Something like “Full editor · ‹ takes you back” would fit on one line (a suggestion, not in the design yet).' },
    { warn: false, html: '<b>The open options menu covers the corner with Sam’s face.</b> That already happens today, and the switch does not make it worse under A, C or D.' },
    { warn: false, html: '<b>Your own phone and Mac are fine too.</b> The line “Your phone can edit · clips stay put” and its Options menu live in the tools, under the clips, so they never cover the video or the buttons on it (drawn below).' }
  ];

  /* The slot-by-slot table (DESIGN §6.1). `n` marks a button that is new or moved. */
  const PHONE_ROWS = [
    { name: 'Full today', note: 'what you have now', slots: [['Options'], ['Copy'], ['Add-row switch'], ['To start']] },
    { name: 'Full · A', note: 'the add-row switch moves into Options', slots: [['Options'], ['Copy'], ['Switch', 'n'], ['To start']] },
    { name: 'Full · B', rec: true, note: 'the switch is the first item inside Options', slots: [['Options'], ['Copy'], ['Add-row switch'], ['To start']] },
    { name: 'Full · B, after a visit from Quick', note: 'until you go back', slots: [['Options'], ['Copy'], ['Back to Quick', 'n'], ['To start']] },
    { name: 'Full · C', note: 'wide phones like yours only; every button a little smaller', slots: [['Options'], ['Copy'], ['Switch', 'n'], ['Add-row switch'], ['To start']] },
    { name: 'Full · D', note: 'no switch here; only in ⚙ and Home’s menu', slots: [['Options'], ['Copy'], ['Add-row switch'], ['To start']] },
    { name: 'Quick · row A', rec: true, note: 'decision D18', slots: [['Options'], ['Split', 'n'], ['Switch', 'n'], ['To start']] },
    { name: 'Quick · row B', note: 'decision D18', slots: [['Options'], ['Switch', 'n'], ['Split', 'n'], ['To start']] }
  ];
  const PC_ROWS = [
    { name: 'Full', slots: [['Back'], ['Switch', 'n'], ['…', 'g'], ['Copy'], ['Add-row switch'], ['To start']] },
    { name: 'Quick', slots: [['Back'], ['Split', 'n'], ['Switch', 'n'], ['…', 'g'], ['To start']] },
    { name: 'Full, after a visit from Quick', slots: [['Back'], ['‹ Quick', 'n'], ['…', 'g'], ['Copy'], ['Add-row switch'], ['To start']] }
  ];

  function rowsList(rows, label, counted) {
    let h = '<ul class="v12-rows" aria-label="' + esc(label) + '">';
    rows.forEach(r => {
      h += '<li><div class="nm"><b>' + esc(r.name) + '</b>' + (r.rec ? '<span class="v12-rec">recommended</span>' : '') + (r.note ? '<small>' + esc(r.note) + '</small>' : '') + '</div><ol class="chips">';
      let n = 0;
      r.slots.forEach(sl => {
        const cls = sl[1] === 'n' ? ' new' : sl[1] === 'g' ? ' gap' : '';
        const num = sl[1] === 'g' ? '' : '<i>' + (++n) + '</i>';
        h += '<li class="v12-slot' + cls + '">' + (counted ? num : '') + esc(sl[0]) + (sl[1] === 'n' ? '<span class="v12-sr"> (new)</span>' : '') + '</li>';
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
    // the other device's face: your Mac (blue) on the phone, your phone (green) on the Mac, both in Quick; LIVE and the
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
    title: 'Buttons on the video',
    blurb: 'The buttons that sit over the video, checked at phone and PC sizes, alone and with a friend.',
    mount(host) {
      if (!document.getElementById('v12-css')) { const st = el('style'); st.id = 'v12-css'; st.textContent = CSS; document.head.appendChild(st); }
      const root = el('div', 'v12');
      host.appendChild(root);

      const intro = el('section', 'h-card v12-intro');
      intro.innerHTML =
        '<h3>Where the switch would sit</h3>' +
        '<p>These are real screenshots of FreeMotion as it is today (v17.12). For each picture the new switch was slipped into the running app, just for the photo. Nothing in the app was changed. <span class="v12-key" aria-hidden="true"></span> An amber box marks the new button.</p>' +
        '<p>“With a friend in” means a pretend friend, Sam, joined inside the page. No internet was used.</p>' +
        '<p class="h-note">The switch icons are stand-ins: three clips in a row when you are in Quick, stacked bars when you are in Full. The real icons are your pick (D16).</p>';
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
        '<p>When your phone and your Mac share one project, each counts as someone who can edit. So until Phase 4, moving clips stops on both, and the tools say why. You tapped Delete on Sandcastle here.</p>' +
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
        '<h3>Slot by slot, on a phone</h3>' +
        '<p class="h-note" style="margin-bottom:10px">The buttons left of the time, counted from the left edge. Amber means new or moved.</p>' +
        rowsList(PHONE_ROWS, 'Phone play bar, slot by slot', true) +
        '<h3 style="margin-top:18px">On a PC</h3>' +
        '<p class="h-note" style="margin-bottom:10px">The left end of the play bar, from the left. The … is the gap before the time.</p>' +
        rowsList(PC_ROWS, 'PC play bar, left end', false);
      root.appendChild(slots);

      /* how they were made */
      const how = el('details', 'h-card');
      how.innerHTML =
        '<summary>How these pictures were made</summary>' +
        '<ul>' +
        '<li>Taken automatically on this Mac, each in a fresh browser that starts empty: phones at 380×800, 380×667 and 440×956 (acting as a touch phone), and a 1280×800 window with a mouse. Each picture shows just the video and the play bar.</li>' +
        '<li>The project is a small “Beach day” made of shapes and a title, made fresh for the pictures. Your own projects were never opened.</li>' +
        '<li>“With a friend in” uses the app’s real sharing, with Sam joined inside the page. The internet was blocked: nothing was sent anywhere in any of them.</li>' +
        '<li>The screen stays in Full underneath. Quick’s timeline does not exist yet, so the Quick pictures show only the video and the play bar, which are the same in both editors.</li>' +
        '<li>Your own phone and Mac are drawn, not photographed, because that line is not in the app yet. V6 plays the same moment through, step by step.</li>' +
        '</ul>';
      root.appendChild(how);
    }
  });
})();
