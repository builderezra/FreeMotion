/* V4 · Phone and PC, side by side (DESIGN §8.2, §8.3, §17 D20, §18 V4).
 *
 * Beach day drawn twice, a phone frame and a computer frame, both driven by ONE VIS.engine editor, so an edit made on
 * either shows on both. Every button has a twin: tap one and its twin lights up on the other, with a plain line saying
 * where each one sits. A close-up shows the computer's twin at (nearly) its real size and presses the real button when
 * clicked or tapped (a mouse resting on the small computer moves it there), and the two tool rows are compared by
 * reading the labels off both drawings every time they change (a check, not a claim).
 * Under the computer: D20, a window size (900×700, 1280×800, 1920×1080, a phone sideways) and where a tool's panel
 * opens: A in the band is HIS PICK (1 Oct, "D20 A", not the one recommended then) and the page opens on it; B over the
 * picture and C over the timeline stay as "not chosen" for comparison. The room, picture and timeline are MEASURED on the
 * drawing. Styles are injected once (#v4-style), so index.html is untouched. Design only: nothing here touches FreeMotion.
 */
(function () {
  'use strict';
  const V = window.VIS;
  if (!V || typeof V.register !== 'function' || typeof document === 'undefined') return;

  const FPS = 30;
  const esc = s => V.esc(s);
  const icon = (n, c) => V.icon(n, c);
  const nameOf = l => (l && (l.name || l.text || l.id)) || 'clip';
  const ord = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
  const mmss = t => { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* §8.3's PC band budget. Simple raises the band's width floor so the phone's 8 tools keep their words:
     --insp-w: clamp(372px, 26vw, 420px). The band height is --tl-h (272 / 240 / 300 / 150-179). */
  const SIZES = [
    { id: '900', label: '900×700', W: 900, H: 700, insW: 372, tlH: 272 },
    { id: '1280', label: '1280×800', W: 1280, H: 800, insW: 372, tlH: 240 },
    { id: '1920', label: '1920×1080', W: 1920, H: 1080, insW: 420, tlH: 300 },
    { id: 'side', label: 'Phone sideways', W: 844, H: 390, insW: 372, tlH: 165, sideways: true }
  ];
  const D20 = [
    { id: 'A', label: 'A · In the left panel', rec: true, note: 'A, your pick: the panel opens inside the left panel, above the tools, and scrolls when it is taller than the room. The picture and the timeline are never covered.' },
    { id: 'B', label: 'B · Over the picture', note: 'B, not chosen: the panel rises over the bottom left of the picture. It gets its own height, but it can cover part of the picture you are judging.' },
    { id: 'C', label: 'C · Over the timeline', note: 'C, not chosen: the panel rises over the timeline, exactly as on the phone. About twice A\'s room, but the timeline is covered while it is open.' }
  ];
  const SIDE_NOTE = 'A phone held sideways is the one exception: there is almost no room in the left panel, so a tool opens over the timeline there. Your pick, A, is for computers.';

  const FILTERS = { none: '', warm: 'sepia(.3) saturate(1.3) brightness(1.03)', cool: 'hue-rotate(-16deg) saturate(1.15) brightness(1.02)',
    film: 'contrast(1.12) sepia(.2) saturate(.9)', fade: 'contrast(.8) brightness(1.1) saturate(.8)', mono: 'grayscale(1) contrast(1.08)' };
  const LOOKS = [['none', 'None'], ['warm', 'Warm'], ['cool', 'Cool'], ['film', 'Film'], ['fade', 'Fade'], ['mono', 'B&W']];
  const POOL = [
    { name: 'Pier', duration: 2.6, srcDur: 7.5, look: ['#a8d8ea', '#3d6f8e'] },
    { name: 'Ice cream', duration: 2.2, srcDur: 6, look: ['#ffd1dc', '#d9607f'] },
    { name: 'Dog run', duration: 3.0, srcDur: 9, look: ['#e8cf9c', '#8a6a3a'] },
    { name: 'Boat', duration: 2.4, srcDur: 8, look: ['#9ed0c9', '#2f6d73'] }
  ];
  const OVERLAYS = [['Shell', '#ffd9a8', '#ff9a8b'], ['Sun', '#ffe29a', '#ffa94d'], ['Palm', '#b8f2c9', '#3f8f5f'], ['Photo', '#cfd9ff', '#6b7bd6']];
  const FX = [['Blur', '#8fb7d9', '#3c5a78'], ['Glow', '#ffe08a', '#e0864b'], ['Shake', '#c9b3ff', '#5b4499'], ['Vignette', '#6b7a86', '#141a1f'], ['Grain', '#cdbfa6', '#6d604c'], ['Zoom in', '#9fe0d2', '#2c7a6c']];

  const TOOL_WHAT = {
    clips: 'Add clips, your recent videos, and extras', text: 'Adds words at the playhead and starts typing',
    captions: 'Type captions, find speech, pick a style', sound: 'Music, sound effects, or record your voice',
    overlay: 'A video or picture on top, at the playhead', look: 'One look for every clip at once',
    effects: 'An effect that starts at the playhead', ask: 'Ask for a change in your own words'
  };
  /* what each tray tool does, for the "where is it" box. The clip's row is VIS.CLIP_TRAY; a picked item shows its own kind's
     row, VIS.itemTray (DESIGN §8.5), so a tapped title shows the same row here as on V1 and V3. */
  const TRAY_WHAT = {
    speed: 'How fast this clip plays', volume: 'How loud it is', lift: 'Takes the clip off the row and puts it on top. The rest close up.',
    look: 'A look for just this one', crop: 'Crop, turn or flip it', delete: 'Deletes it. The clips after it close up.',
    length: 'Set the exact length', earlier: 'Moves it one place earlier', later: 'Moves it one place later',
    effects: 'An effect on just this one', replace: 'Swap the footage, keep its place', duplicateClip: 'A copy right after it',
    reverse: 'Plays it backwards', soundout: 'Puts its sound in the sound row',
    editwords: 'Change the words', style: 'The font, colour and size', animate: 'How it comes in and goes out',
    copy: 'Makes a copy right after it', stay: 'Stops it following its clip',
    into: 'Puts it in the clip row', blend: 'How it mixes with what is under it', ovspeed: 'How fast this video plays',
    removecolour: 'Takes one colour out, like a green screen', forward: 'Puts it in front of the others', backward: 'Puts it behind the others',
    editlines: 'Change the caption lines', capstyle: 'How every caption looks', findspeech: 'Listens to the clips and writes the captions',
    capfollow: 'The captions move with the clips', capstay: 'The captions stay with the sound they were timed from',
    fade: 'Fade in and fade out', sndspeed: 'How fast this sound plays', voice: 'Changes how the voice sounds',
    change: 'Pick a different effect', strength: 'How strong the effect is'
  };
  // any tray tool by id: the picked thing's own row first (Volume, Look, Crop, Stay put and 🗑 are in more than one row)
  const trayTool = (id, list) => (list || []).concat(V.CLIP_TRAY, ...Object.values(V.ITEM_TRAYS || {})).find(x => x.id === id);
  /* every button around the picture: [name, what it does, icon]. Phone "settings" and PC "gear" are the same button. */
  const ACT = {
    back: ['Projects', 'Back to all your projects', 'back'], help: ['Help', 'Help for this screen', 'help'],
    notes: ['Notes', 'Your notes for this project', 'notes'], gear: ['Settings', 'Canvas size, Friends, and the switch between Simple and Full (the cog’s third block)', 'gear'],
    export: ['Export', 'Saves the finished video', 'export'], more: ['More', 'Close all gaps, loop a part, and the rest', 'more'],
    split: ['Split', 'Cuts the clip in two at the playhead', 'split'],
    toStart: ['To start', 'Jumps to the start', 'toStart'], play: ['Play', 'Plays and pauses', 'play'], toEnd: ['To end', 'Jumps to the end', 'toEnd'],
    undo: ['Undo', 'Takes back the last change', 'undo'], redo: ['Redo', 'Puts it back again', 'redo'], fit: ['Full screen', 'Shows the picture full screen', 'fit']
  };
  const normAct = a => (a === 'settings' ? 'gear' : a);
  const NOTE = {
    type: 'Type captions opens the caption editor', speech: 'Find speech listens to your clips and writes the captions for you',
    style: 'Style changes how every caption looks', music: 'Music from your files lands whole in the sound row; a long song runs on in black past the clips',
    sfx: 'Sound effects land at the playhead', voice: 'Record voice records over the video from the playhead',
    saved: 'Saved elements you made before', shapes: 'Shapes: boxes, circles and lines', templates: 'Templates: a whole look in one tap',
    turn: 'Turned it a quarter turn', flip: 'Flipped it left to right', ask: 'Ask makes the change as normal edits you can undo',
    fx: 'An effect from the playhead lands in its own row above the clips', overlay: 'It goes on top, at the playhead', pickfile: 'Opens your photos and videos'
  };

  /* ------------------------------------------------------------------ styles (injected once) */
  const CSS = `
.v4 { container-type: inline-size; display: grid; gap: 18px; }
.v4-where .ico, .v4-cmp .ico, .v4-d20 .ico { width: 18px; height: 18px; flex: none; }
.v4-lede { margin: 0; max-width: 64ch; color: var(--h-muted); font-size: 16px; }
.v4-lede b { color: var(--h-ink); }
.v4-pair { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr); grid-template-areas: "phone" "where" "pc" "loupe" "d20"; align-items: start; }
.v4-phone { grid-area: phone; min-width: 0; } .v4-where { grid-area: where; min-width: 0; } .v4-pcc { grid-area: pc; min-width: 0; }
.v4-d20 { grid-area: d20; min-width: 0; } .v4-loupe-wrap { grid-area: loupe; min-width: 0; }
.v4-ph-host { max-width: 394px; margin: 0 auto; }
@container (min-width: 720px) {
  .v4-pair { grid-template-columns: minmax(240px, 330px) minmax(0, 1fr); grid-template-areas: "phone where" "phone pc" "phone loupe" "d20 d20"; column-gap: 22px; row-gap: 14px; }
}
.v4-cap { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: baseline; margin: 0 0 8px; font-family: var(--h-mono); font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--h-muted); }
.v4-cap .v4-dev { color: var(--h-ink); font-weight: 600; }
.v4-where { display: grid; gap: 10px; padding: 14px 16px; align-content: start; }
.v4-w-top { display: flex; gap: 12px; align-items: center; min-width: 0; }
.v4-w-ico { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: var(--h-accent-soft); color: var(--h-accent); flex: none; }
.v4-w-ico .ico { width: 22px; height: 22px; }
.v4-w-name { display: block; font-family: var(--h-display); font-weight: 700; font-size: 20px; line-height: 1.15; }
.v4-w-what { display: block; color: var(--h-muted); font-size: 14.5px; line-height: 1.35; }
.v4-w-map { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 12px; margin: 0; font-size: 15px; line-height: 1.35; }
.v4-w-map dt { font-family: var(--h-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--h-faint); padding-top: 3px; }
.v4-w-map dd { margin: 0; }
.v4-w-same { margin: 0; color: var(--h-good); font-weight: 700; font-size: 14.5px; display: flex; gap: 6px; align-items: center; }
.v4-w-same .ico { width: 17px; height: 17px; }
.v4-w-edit { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--h-rule); font-size: 14.5px; line-height: 1.35; }
.v4-w-edit.bad { color: var(--h-warn); }
.v4-w-edit .h-btn { min-height: 40px; padding: 8px 14px; }
.v4-loupe { position: relative; height: 158px; overflow: hidden; overflow: clip; border-radius: 14px; border: 1px solid var(--h-rule); background: #060c0f; transition: height .3s;
  touch-action: pan-y; user-select: none; -webkit-user-select: none; }
.v4-loupe .v4-pan * { touch-action: pan-y; }            /* the copy has scroll boxes of its own; each would claim a sideways drag */
.v4-loupe.cut-l, .v4-loupe.cut-r { cursor: grab; }
.v4-loupe.dragging { cursor: grabbing; }
.v4-loupe.dragging .v4-pan { transition: none; }
.v4-loupe-wrap:not(.cut) .v4-more { display: none; }
.v4-pan { position: absolute; left: 0; top: 0; transform-origin: 0 0; transition: transform .45s cubic-bezier(.2, .8, .2, 1); }
.v4-loupe button, .v4-loupe .fm-tile, .v4-loupe .fm-item, .v4-loupe .fm-seam, .v4-loupe .fm-addclip, .v4-loupe .fm-opener { cursor: pointer; }
.v4-loupe .fm-ruler { cursor: ew-resize; }
@media (hover: hover) { .v4-loupe button:hover, .v4-loupe .fm-tile:hover, .v4-loupe .fm-item:hover { outline: 2px solid rgba(90, 199, 237, .9); outline-offset: 1px; } }
.v4-fade { position: absolute; top: 0; bottom: 0; z-index: 6; pointer-events: none; opacity: 0; transition: opacity .2s; }
.v4-fade.l { left: 0; width: 16px; background: linear-gradient(90deg, #060c0f, rgba(6, 12, 15, 0)); }
.v4-fade.r { right: 0; width: 56px; background: linear-gradient(270deg, #060c0f 12%, rgba(6, 12, 15, 0)); }
.v4-loupe.cut-l .v4-fade.l, .v4-loupe.cut-r .v4-fade.r { opacity: 1; }
.v4-loupe-hint { margin: 7px 0 0; font-size: 13.5px; line-height: 1.35; color: var(--h-muted); }
.v4-loupe-hint .m { display: none; }
@media (hover: hover) and (pointer: fine) { .v4-loupe-hint .m { display: inline; } .v4-loupe-hint .t { display: none; } }
.v4-pan > .fm-pc { transform: none !important; box-shadow: none; }
.v4-still, .v4-still * { animation: none !important; transition: none !important; }
.v4-lens { position: absolute; border: 2px solid var(--h-accent); border-radius: 5px; pointer-events: none; z-index: 5; box-shadow: 0 0 0 1px rgba(255, 255, 255, .55); transition: left .45s, top .45s, width .45s, height .45s; }
.v4-d20 { display: grid; gap: 12px; padding: 14px; grid-template-columns: minmax(0, 1fr); grid-template-areas: "h" "p" "map" "l" "r"; align-content: start; }
.v4-d20 > h3 { grid-area: h; } .v4-d20 > .v4-d20-intro { grid-area: p; } .v4-d20-map { grid-area: map; } .v4-d20-l { grid-area: l; } .v4-d20-r { grid-area: r; }
.v4-d20-l, .v4-d20-r { display: grid; gap: 10px; min-width: 0; align-content: start; }
.v4-d20-map { display: grid; gap: 6px; min-width: 0; }
.v4-map { display: flex; justify-content: center; min-width: 0; }
.v4-map-win { position: relative; flex: none; width: 100%; height: 190px; border-radius: 8px; background: #0b1419; border: 1px solid #22313a; box-shadow: 0 8px 22px rgba(0, 0, 0, .28); overflow: hidden; transition: width .35s, height .35s; }
.v4-map-win > i { position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; font: normal 700 11.5px/1.1 var(--h-body); color: rgba(227, 240, 244, .82); overflow: hidden; transition: left .35s, top .35s, width .35s, height .35s, opacity .25s; }
.v4-map-win > i.nolbl > span { visibility: hidden; }
.v4-map-win > i.dim > span { opacity: .3; }
.v4-map-win .m-stage { background: #060c0f; }
.v4-map-win .m-pic { background: linear-gradient(180deg, #86e3f0, #2a7fb0); color: #04212b; align-items: flex-start; padding-top: 4px; border-radius: 2px; }
.v4-map-win .m-band, .v4-map-win .m-tl { background: #10232c; border: 1px solid rgba(255, 255, 255, .08); }
.v4-map-win .m-band { align-items: flex-end; padding-bottom: 5px; }
.v4-map-win .m-tl { justify-content: flex-end; padding-right: 8px; }
.v4-map-win .m-sheet { z-index: 2; background: rgba(90, 199, 237, .24); border: 2px solid #5ac7ed; border-radius: 6px; color: #fff; font-size: 12.5px; text-shadow: 0 1px 2px rgba(0, 0, 0, .8); box-shadow: 0 6px 16px rgba(0, 0, 0, .45); opacity: 0; }
.v4-map-win .m-sheet.on { opacity: 1; }
.v4-d20 .v4-map-cap { font-size: 13px; text-align: center; }
.v4-d20 .v4-d20-why { color: var(--h-ink); border-left: 3px solid var(--h-accent); padding: 2px 0 2px 10px; }
.v4-d20 .v4-d20-why[hidden], .v4-d20 .v4-d20-note[hidden] { display: none; }
@container (min-width: 720px) {
  .v4-d20 { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: "h h" "p p" "l map" "l r"; column-gap: 22px; align-items: start; }
}
.v4-d20 h3, .v4-cmp h3 { margin: 0; font-family: var(--h-display); font-size: 18px; line-height: 1.2; }
.v4-d20 p { margin: 0; font-size: 14px; color: var(--h-muted); }
.v4-lbl { font-family: var(--h-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--h-faint); margin: 2px 0 -4px; }
.v4-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.v4-seg button, .v4-try button { font: 600 13.5px/1.15 var(--h-body); border: 1px solid var(--h-rule); background: var(--h-surface); color: var(--h-ink); border-radius: 999px; padding: 8px 12px; min-height: 38px; cursor: pointer; }
.v4-seg button:hover, .v4-try button:hover { border-color: var(--h-accent); }
.v4-seg button[aria-pressed="true"] { background: var(--h-accent); border-color: var(--h-accent); color: var(--h-accent-ink); }
.v4-seg button:disabled, .v4-seg button:disabled:hover { opacity: .42; cursor: not-allowed; border-style: dashed; border-color: var(--h-rule); }
.v4-seg .rec { font-weight: 400; opacity: .85; }
.v4-seg .not { font-weight: 400; opacity: .6; }
.v4-try { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 14px; color: var(--h-muted); }
.v4-stats { display: grid; gap: 6px; }
.v4-stat { border: 1px solid var(--h-rule); border-radius: 12px; padding: 8px 12px; background: var(--h-bg); display: grid; grid-template-columns: minmax(88px, 34%) minmax(0, 1fr); column-gap: 12px; row-gap: 2px; align-items: baseline; }
.v4-stat span { grid-row: 1 / span 2; font-size: 13px; line-height: 1.3; color: var(--h-muted); }
.v4-stat b { grid-column: 2; font-size: 15px; line-height: 1.25; }
.v4-stat small { grid-column: 2; font-size: 13px; line-height: 1.3; color: var(--h-muted); }
.v4-stat.good b { color: var(--h-good); } .v4-stat.warn b { color: var(--h-warn); }
.v4-hint { font-size: 14px; color: var(--h-muted); margin: 0; }
.v4-cmp { display: grid; gap: 12px; }
.v4-cmp > p { margin: 0; }
.v4-cmp-row { display: grid; gap: 8px; padding-top: 12px; border-top: 1px solid var(--h-rule); }
.v4-cmp-name { font-weight: 700; }
.v4-chiprow { display: flex; flex-wrap: wrap; gap: 6px; }
.v4-tchip { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; min-width: 40px; justify-content: center; padding: 6px 10px; border-radius: 10px; border: 1px solid var(--h-rule); background: var(--h-bg); color: var(--h-ink); font: 14px/1.1 var(--h-body); cursor: pointer; }
.v4-tchip:hover { border-color: var(--h-accent); }
.v4-tchip.lit { border-color: var(--h-accent); background: var(--h-accent-soft); color: var(--h-accent); box-shadow: 0 0 0 1px var(--h-accent); }
.v4-ok { color: var(--h-good); font-weight: 700; font-size: 14.5px; display: flex; gap: 6px; align-items: flex-start; }
.v4-ok .ico { width: 17px; height: 17px; margin-top: 1px; }
.v4-ok.bad { color: var(--h-warn); }
.v4-sub { font-size: 14px; color: var(--h-muted); }
.v4-cmp .h-btn { justify-self: start; }

/* ---- the mock side (always FreeMotion's dark glass) ---- */
.fm .v4-lit { box-shadow: 0 0 0 2px var(--accent), 0 0 16px rgba(90, 199, 237, .55); }
.fm .v4-lit:not(.fm-tile):not(.fm-item) { color: var(--accent) !important; background: var(--accent-soft) !important; }
.fm .fm-tool.v4-lit .ico, .fm .fm-ibtn.v4-lit .ico { color: var(--accent); }
.fm .v4-lit.v4-pulse { animation: v4-pulse .8s ease-out 2; }
@keyframes v4-pulse { 0% { box-shadow: 0 0 0 2px var(--accent), 0 0 0 0 rgba(90, 199, 237, .75); } 100% { box-shadow: 0 0 0 2px var(--accent), 0 0 0 16px rgba(90, 199, 237, 0); } }
.fm .fm-tile.v4-lit, .fm .fm-item.v4-lit { box-shadow: 0 0 0 2px #fff, 0 0 0 5px var(--accent); z-index: 4; }
.fm .fm-tile.v4-lit.v4-pulse, .fm .fm-item.v4-lit.v4-pulse { animation: v4-tpulse .8s ease-out 2; }
@keyframes v4-tpulse { 0% { box-shadow: 0 0 0 2px #fff, 0 0 0 5px var(--accent), 0 0 0 5px rgba(90, 199, 237, .7); } 100% { box-shadow: 0 0 0 2px #fff, 0 0 0 5px var(--accent), 0 0 0 18px rgba(90, 199, 237, 0); } }
.fm .v4-peek:not(.v4-lit) { box-shadow: 0 0 0 1.5px rgba(90, 199, 237, .8); }
.fm .fm-time { display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
.fm .fm-time .v4-tico { width: 10px; height: 10px; }
.fm .v4-sheet { position: absolute; z-index: 30; display: flex; flex-direction: column; background: #0d1d25; border: 1px solid var(--glass-rim); border-radius: 14px; box-shadow: 0 -10px 34px rgba(0, 0, 0, .55); color: var(--text); text-align: left; }
.fm .v4-sheet.ph { left: 6px; right: 6px; top: 4px; bottom: 3px; }
.fm .v4-sheet.pcC { left: 6px; top: 4px; bottom: 6px; width: min(560px, calc(100% - 12px)); }
.fm .v4-sheet.pcB { left: 8px; width: min(560px, 45%); }
.fm .v4-sheet.pcA { position: relative; height: 100%; border-radius: 10px; box-shadow: none; }
.fm .v4-sh-head { flex: none; height: 38px; display: flex; align-items: center; gap: 8px; padding: 0 4px 0 12px; border-bottom: 1px solid var(--line-soft); font-size: 13px; }
.fm .v4-sh-head .ico { width: 17px; height: 17px; color: var(--accent); }
.fm .v4-sh-head b { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fm .v4-x { width: 34px; height: 34px; flex: none; border: 0; background: transparent; border-radius: 9px; display: grid; place-items: center; cursor: pointer; color: var(--text-dim); }
.fm .v4-x:hover { background: rgba(255, 255, 255, .07); }
.fm .v4-sh-body { flex: 1; min-height: 0; overflow: auto; padding: 10px 12px 12px; display: grid; gap: 9px; align-content: start; }
.fm .v4-tail { position: absolute; width: 14px; height: 14px; background: #0d1d25; border-right: 1px solid var(--glass-rim); border-bottom: 1px solid var(--glass-rim); transform: rotate(45deg); bottom: -8px; left: var(--tx, 50%); margin-left: -7px; }
.fm .v4-tail.left { left: -8px; bottom: 16px; margin-left: 0; transform: rotate(135deg); }
.fm .v4-rows { display: grid; gap: 6px; }
.fm .v4-pb { display: flex; align-items: center; gap: 9px; min-height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel-3); color: var(--text); font-weight: 600; font-size: 12.5px; cursor: pointer; text-align: left; }
.fm .v4-pb:hover { border-color: rgba(90, 199, 237, .5); }
.fm .v4-pb.primary { background: linear-gradient(180deg, rgba(90, 199, 237, .3), rgba(90, 199, 237, .14)); border-color: rgba(90, 199, 237, .55); justify-content: center; }
.fm .v4-pb .ico { width: 17px; height: 17px; color: var(--accent); }
.fm .v4-plabel { font-size: 10.5px; color: var(--text-faint); text-transform: uppercase; letter-spacing: .06em; }
.fm .v4-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.fm .v4-chip { min-height: 32px; min-width: 44px; padding: 0 11px; border-radius: 16px; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); font-weight: 600; font-size: 12px; cursor: pointer; }
.fm .v4-chip.on { background: var(--accent-soft); border-color: rgba(90, 199, 237, .6); color: var(--accent); }
.fm .v4-thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 6px; }
.fm .v4-thumb { position: relative; height: 54px; border-radius: 9px; border: 1px solid rgba(255, 255, 255, .18); cursor: pointer; overflow: hidden; padding: 0; }
.fm .v4-thumb span { position: absolute; left: 5px; right: 4px; bottom: 4px; font-size: 10px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px #000; text-align: left; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.fm .v4-thumb.on { box-shadow: 0 0 0 2px var(--accent); border-color: var(--accent); }
.fm .v4-field { min-height: 40px; border-radius: 10px; border: 1px solid rgba(90, 199, 237, .5); background: #08141a; display: flex; align-items: center; padding: 0 12px; font-size: 14px; font-weight: 600; }
.fm .v4-caret { width: 2px; height: 18px; background: var(--accent); margin-left: 2px; animation: v4-blink 1s steps(1) infinite; }
@keyframes v4-blink { 50% { opacity: 0; } }
.fm .v4-slider { display: grid; grid-template-columns: 74px minmax(0, 1fr) 42px; align-items: center; gap: 10px; font-size: 11.5px; color: var(--text-dim); min-height: 26px; }
.fm .v4-slider i { height: 4px; border-radius: 2px; background: var(--line); position: relative; display: block; }
.fm .v4-slider i b { position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent); border-radius: 2px; }
.fm .v4-slider i b::after { content: ""; position: absolute; right: -7px; top: -5px; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, .5); }
.fm .v4-slider em { font-style: normal; color: var(--text); text-align: right; font-variant-numeric: tabular-nums; }
.fm .v4-switchrow { display: flex; align-items: center; justify-content: space-between; min-height: 34px; font-weight: 600; font-size: 12.5px; }
.fm .v4-switchrow i { width: 36px; height: 21px; border-radius: 11px; background: var(--accent); position: relative; flex: none; }
.fm .v4-switchrow i::after { content: ""; position: absolute; right: 2px; top: 2px; width: 17px; height: 17px; border-radius: 50%; background: #fff; }
.fm .v4-bubble { background: var(--panel-3); border-radius: 12px 12px 12px 4px; padding: 8px 10px; font-size: 12.5px; max-width: 92%; }
.fm .v4-small { font-size: 11.5px; color: var(--text-dim); line-height: 1.35; }
.fm .v4-cue { display: flex; gap: 8px; font-size: 12px; padding: 6px 8px; border-radius: 8px; background: var(--panel-2); }
.fm .v4-cue em { font-style: normal; color: var(--text-faint); font-variant-numeric: tabular-nums; }
.fm .v4-bandinfo { display: grid; gap: 3px; color: var(--text-dim); font-size: 12px; padding: 2px 2px 0; }
.fm .v4-bandinfo b { color: var(--text); font-size: 14px; }
@keyframes v4-hinge { from { opacity: 0; transform: perspective(800px) rotateX(-22deg) translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
.fm .v4-sheet.v4-rise { animation: v4-hinge .34s cubic-bezier(.2, .9, .3, 1.1) both; transform-origin: 50% 100%; }
.fm .v4-sheet.v4-rise.from-left { transform-origin: 0 100%; }
@media (prefers-reduced-motion: reduce) {
  .fm .v4-sheet.v4-rise, .fm .v4-lit.v4-pulse, .fm .v4-caret { animation: none !important; }
  .v4-pan, .v4-lens, .v4-loupe, .v4-map-win, .v4-map-win > i { transition: none !important; }
}
`;
  function injectCSS() {
    if (document.getElementById('v4-style')) return;
    const s = document.createElement('style'); s.id = 'v4-style'; s.textContent = CSS; document.head.appendChild(s);
  }

  /* layout box of el inside root, from offsets (ignores transforms, so a sheet mid-animation measures as it lands) */
  function boxIn(elm, root) {
    let x = 0, y = 0, n = elm;
    while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y, w: elm.offsetWidth, h: elm.offsetHeight };
  }
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

  /* ================================================================== mount */
  function mount(host) {
    injectCSS();
    const E = V.engine;
    const ed = E.editor(V.sample('beach'));
    const S = { sel: null, t: 4.6, tool: null, lit: null, pulse: false, openSec: null, playing: false, size: '1280', d20: 'A',
                look: { all: 'none', clip: {} }, vol: {}, crop: {}, last: null, rise: false, poolI: 0, end: 14.2, aim: null, nudge: 0, litName: '' };
    let ph, pc, phTL, pcTL, phTray = null, pcTray = null, peekKey = null;

    host.classList.add('v4');
    host.innerHTML =
      '<p class="v4-lede"><b>Tap any button on either one.</b> Its twin lights up on the other. Edit on one and both change, because it is one project.</p>' +
      '<div class="v4-pair">' +
        '<div class="v4-phone"><p class="v4-cap"><span class="v4-dev">Phone</span><span>380 wide</span></p><div class="v4-ph-host"></div></div>' +
        '<div class="v4-where h-card" aria-live="polite"></div>' +
        '<div class="v4-pcc"><p class="v4-cap"><span class="v4-dev">Computer</span><span class="v4-pcsize"></span></p><div class="v4-pc-host"></div></div>' +
        '<div class="v4-loupe-wrap"><p class="v4-cap"><span class="v4-dev">Close up</span><span class="v4-loupe-cap">on the computer, at its real size</span></p>' +
          '<div class="v4-loupe" aria-hidden="true"><div class="v4-pan"></div><i class="v4-fade l"></i><i class="v4-fade r"></i></div>' +
          '<p class="v4-loupe-hint"><span class="m">Point at any part of the small computer above and it shows here, big enough to click.</span>' +
          '<span class="t">The buttons in the close up work too. Tap one.</span><span class="v4-more"> Drag it sideways to see the rest.</span></p></div>' +
        '<div class="v4-d20 h-card"></div>' +
      '</div>' +
      '<div class="v4-cmp h-card"></div>';
    const q = s => host.querySelector(s);
    const phHost = q('.v4-ph-host'), pcHost = q('.v4-pc-host'), where = q('.v4-where'), d20 = q('.v4-d20'), cmp = q('.v4-cmp');
    const loupe = q('.v4-loupe'), pan = q('.v4-pan'), loupeCap = q('.v4-loupe-cap'), pcSize = q('.v4-pcsize');
    const size = () => SIZES.find(s => s.id === S.size) || SIZES[1];

    /* ---------------- the two frames ---------------- */
    ph = V.phoneFrame(phHost, { name: 'Beach day', editor: 'quick', stageH: 160, tlH: 196, onTool: id => onTool(id) });
    wireFrame(ph);
    function buildPC() {
      const sz = size();
      pcHost.innerHTML = '';
      pc = V.pcFrame(pcHost, { name: 'Beach day', editor: 'quick', width: sz.W, height: sz.H, band: sz.tlH, inspW: sz.insW, minScale: 0.1, onTool: id => onTool(id) });
      pc.lens = V.el('div', 'v4-lens');
      pc.root.parentNode.appendChild(pc.lens);
      S.aim = null; S.nudge = 0;
      wireFrame(pc);
      wireAim(pc);
      pcSize.textContent = sz.sideways ? 'a phone held sideways, 844×390' : 'a ' + sz.label + ' window';
    }
    buildPC();

    function wireFrame(fr) {
      fr.root.addEventListener('click', e => {
        const p = e.target.closest('[data-v4]');
        if (p && fr.root.contains(p)) { e.stopPropagation(); onPanel(p.dataset.v4, p.dataset.arg); return; }
        const b = e.target.closest('[data-act]');
        if (b && fr.root.contains(b) && !b.closest('.v4-sheet')) onAct(b.dataset.act);
      });
      const peek = e => { if (e.pointerType && e.pointerType !== 'mouse') return; setPeek(keyOf(e.target, fr)); };
      fr.root.addEventListener('pointerover', peek);
      fr.root.addEventListener('pointerleave', () => setPeek(null));
      fr.root.addEventListener('focusin', e => setPeek(keyOf(e.target, fr)));
      fr.root.addEventListener('focusout', () => setPeek(null));
    }
    function keyOf(t, fr) {
      if (!t || !t.closest) return null;
      if (t.closest('.v4-sheet')) return null;
      const tool = t.closest('.fm-tool');
      if (tool && fr.root.contains(tool)) {
        if (tool.parentNode === fr.tools) return 'tool:' + tool.dataset.tool;
        if (tool.parentNode === fr.tray) return 'tray:' + tool.dataset.tool;
      }
      const a = t.closest('[data-act]');
      if (a && fr.root.contains(a) && ACT[normAct(a.dataset.act)]) return 'act:' + normAct(a.dataset.act);
      if (t.closest('.fm-addclip')) return 'add';
      const it = t.closest('.fm-tile, .fm-item');
      const tl = fr === ph ? phTL : pcTL;
      if (it && tl) for (const [id, node] of tl.items) if (node === it) return 'item:' + id;
      return null;
    }
    function setPeek(k) {
      if (k === peekKey) return;
      peekKey = k;
      [ph.root, pc.root].forEach(r => r.querySelectorAll('.v4-peek').forEach(n => n.classList.remove('v4-peek')));
      if (k) twins(k).forEach(n => n && n.classList.add('v4-peek'));
    }

    /* the pair of elements that are "the same button" on the phone and on the computer */
    function twins(k) {
      if (!k) return [null, null];
      const i = k.indexOf(':'), kind = i < 0 ? k : k.slice(0, i), id = i < 0 ? '' : k.slice(i + 1);
      if (kind === 'tool') return [ph.toolbar.buttons[id] || null, pc.toolbar.buttons[id] || null];
      if (kind === 'tray') return [(phTray && phTray.buttons[id]) || null, (pcTray && pcTray.buttons[id]) || null];
      if (kind === 'act') {
        if (!ACT[id]) return [null, null];
        const pa = id === 'gear' ? 'settings' : id;
        return [ph.root.querySelector('.fm-topbar [data-act="' + pa + '"], .fm-playbar [data-act="' + pa + '"]'), pc.transport.querySelector('[data-act="' + id + '"]')];
      }
      if (kind === 'item') return [(phTL && phTL.items.get(id)) || null, (pcTL && pcTL.items.get(id)) || null];
      if (kind === 'add') return [ph.timeline.querySelector('.fm-addclip'), pc.timeline.querySelector('.fm-addclip')];
      return [null, null];
    }

    /* ---------------- drawing ---------------- */
    function draw() {
      const doc = ed.doc, R = E.classify(doc);
      if (S.sel && !R.units[S.sel]) S.sel = null;
      if (!S.sel && S.tool && S.tool.indexOf('tray:') === 0) S.tool = null;
      if (S.openSec && !(R.lanes[S.openSec] && R.lanes[S.openSec].length)) S.openSec = null;
      S.end = Math.max(0.1, R.trackEnd || doc.project.duration || 0);
      S.t = Math.max(0, Math.min(S.t, S.end - 1 / FPS));
      const common = { pxPerSec: 'fit', time: S.t, selected: S.sel, onTap, onScrub, onSeam, onAdd };
      phTL = V.drawQuick(ph.timeline, doc, Object.assign({ open: S.openSec, maxLanes: 3, onOpen: s => { stopTour(); S.openSec = s; draw(); } }, common));
      pcTL = V.drawQuick(pc.timeline, doc, Object.assign({ open: 'all' }, common));
      [phTL, pcTL].forEach(wireInner);
      drawStages();
      phTray = drawTray(ph, R); pcTray = drawTray(pc, R);
      V.QUICK_TOOLS.forEach(t => { const on = S.tool === 'tool:' + t.id; ph.toolbar.set(t.id, { on }); pc.toolbar.set(t.id, { on }); });
      [ph.root, pc.root].forEach(r => {
        const u = r.querySelector('.fm-topbar [data-act="undo"], .fm-playbar [data-act="undo"], .fm-transport [data-act="undo"]');
        const d = r.querySelector('.fm-playbar [data-act="redo"], .fm-transport [data-act="redo"]');
        if (u) u.classList.toggle('dim', !ed.canUndo());
        if (d) d.classList.toggle('dim', !ed.canRedo());
      });
      setTimes();
      placeSheets(R);
      applyLit();
      renderWhere(); renderCompare(); renderD20();
      schedule();
    }
    function wireInner(api) {
      api.inner.addEventListener('click', e => {
        if (e.target.closest('.fm-tile, .fm-item, .fm-seam, .fm-addclip, .fm-opener, .fm-ruler')) return;
        const cue = e.target.closest('.fm-cue');
        const R = ed.read();
        if (cue) { const cap = Object.values(R.units).find(u => u.kind === 'captions'); if (cap) { onTap(cap.id); return; } }
        if (S.sel) { stopTour(); S.sel = null; S.lit = null; S.last = null; draw(); }
      });
    }
    function drawStages() {
      V.stage(ph.stage, ed.doc, S.t, { selected: S.sel });
      V.stage(pc.stage, ed.doc, S.t, { selected: S.sel });
      applyLook();
    }
    function applyLook() {
      const R = ed.read(), e = R.mainAt(S.t);
      const f = FILTERS[(e && S.look.clip[e.id]) || S.look.all] || '';
      [ph.stage, pc.stage].forEach(st => { const cv = st.querySelector('.fm-canvas'); if (cv) cv.style.filter = f; });
    }
    function setTimes() {
      const html = icon(S.playing ? 'pause' : 'play', 'v4-tico') + '<span>' + V.tc(S.t, FPS) + '</span>';
      ph.time.innerHTML = html; pc.time.innerHTML = html;
      ph.time.setAttribute('aria-label', S.playing ? 'Pause' : 'Play'); pc.time.setAttribute('aria-label', S.playing ? 'Pause' : 'Play');
    }
    // the §8.5 row for the pick: the clip row's, or the item's own kind's (Stay put and the captions' pair show pressed)
    const trayOf = (R, id) => R.isMain(id) ? V.CLIP_TRAY : V.itemTray(R, id);
    function drawTray(fr, R) {
      const u = S.sel && R.units[S.sel];
      if (!u) {
        const n = R.main.filter(e => !e.slot).length;
        fr.tray.innerHTML = '<div class="fm-say"><b>' + n + (n === 1 ? ' clip' : ' clips') + '</b> · ' + mmss(R.trackEnd) + ' · tap a clip to pick it</div>';
        return null;
      }
      const list = trayOf(R, S.sel);
      return V.toolbar(fr.tray, list.map(x => Object.assign({}, x, { on: x.on || S.tool === 'tray:' + x.id })), { onClick: id => onTray(id) });
    }

    /* ---------------- tool panels: the same sheet, the same words, on both ---------------- */
    function panelTitle(k) {
      const R = ed.read(), u = S.sel && R.units[S.sel];
      const i = k.indexOf(':'), kind = k.slice(0, i), id = k.slice(i + 1);
      if (kind === 'tool') { const t = V.QUICK_TOOLS.find(x => x.id === id); return { icon: t.icon, text: id === 'look' ? 'Look · every clip' : t.label }; }
      const t = trayTool(id, u && trayOf(R, S.sel)) || { icon: 'more', label: id };
      return { icon: t.icon, text: t.label + (u ? ' · ' + nameOf(u.lead) : '') };
    }
    const pb = (act, arg, ic, text, cls) => '<button type="button" class="v4-pb' + (cls ? ' ' + cls : '') + '" data-v4="' + act + '" data-arg="' + esc(arg) + '">' + icon(ic) + '<span>' + esc(text) + '</span></button>';
    const chips = (act, list) => '<div class="v4-chips">' + list.map(c => '<button type="button" class="v4-chip' + (c[2] ? ' on' : '') + '" data-v4="' + act + '" data-arg="' + esc(c[0]) + '">' + esc(c[1]) + '</button>').join('') + '</div>';
    const plabel = t => '<div class="v4-plabel">' + esc(t) + '</div>';
    const thumbs = (act, list) => '<div class="v4-thumbs">' + list.map(c => '<button type="button" class="v4-thumb' + (c.on ? ' on' : '') + '" data-v4="' + act + '" data-arg="' + esc(c.arg) + '" aria-label="' + esc(c.name) + '" style="background:' + c.bg + (c.filter ? ';filter:' + c.filter : '') + '"><span>' + esc(c.name) + '</span></button>').join('') + '</div>';
    const slider = (label, frac, val) => '<div class="v4-slider"><span>' + esc(label) + '</span><i><b style="width:' + Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%"></b></i><em>' + esc(val) + '</em></div>';
    const grad = (a, b) => 'linear-gradient(135deg, ' + a + ', ' + b + ')';
    function lookStrip(current, base) {
      return thumbs('look', LOOKS.map(([id, nm]) => ({ arg: id, name: nm, bg: base, filter: FILTERS[id] || 'none', on: current === id })));
    }
    function panelBody(k) {
      const R = ed.read(), u = S.sel && R.units[S.sel], L = u && u.lead;
      const e = R.mainAt(S.t), under = e && !e.slot ? R.layer(e.id) : null;
      switch (k) {
        case 'tool:clips':
          return pb('addclip', '', 'add', 'Add clips', 'primary') + plabel('Recent') +
            thumbs('addclip', POOL.map((c, i) => ({ arg: i, name: c.name, bg: grad(c.look[0], c.look[1]) }))) +
            plabel('Extras') + chips('note', [['saved', 'Saved'], ['shapes', 'Shapes'], ['templates', 'Templates']]);
        case 'tool:text':
          return '<div class="v4-field">Your text<i class="v4-caret"></i></div>' + plabel('Style') +
            chips('note', [['style', 'Classic', true], ['style', 'Bold'], ['style', 'Outline'], ['style', 'Neon']]) +
            pb('addtext', '', 'check', 'Add it at ' + V.fmt(S.t), 'primary');
        case 'tool:captions':
          return '<div class="v4-rows">' + pb('note', 'type', 'captions', 'Type captions') + pb('note', 'speech', 'sound', 'Find speech') + pb('note', 'style', 'look', 'Style') + '</div>';
        case 'tool:sound':
          return '<div class="v4-rows">' + pb('note', 'music', 'music', 'Music from your files') + pb('note', 'sfx', 'effects', 'Sound effects') + pb('note', 'voice', 'sound', 'Record voice') + '</div>';
        case 'tool:overlay':
          return '<div class="v4-small">On top of the picture, from ' + esc(V.fmt(S.t)) + '</div>' +
            thumbs('note', OVERLAYS.map(o => ({ arg: 'overlay', name: o[0], bg: grad(o[1], o[2]) }))) + pb('note', 'pickfile', 'overlay', 'Pick from your files');
        case 'tool:look':
          return '<div class="v4-switchrow"><span>Use on every clip</span><i aria-hidden="true"></i></div>' +
            lookStrip(S.look.all, under ? V.thumb(under) : grad('#5fd3e6', '#1f6fa3')) +
            slider('Brightness', 0.5, '0') + slider('Contrast', 0.5, '0');
        case 'tool:effects':
          return '<div class="v4-small">Starts at ' + esc(V.fmt(S.t)) + ' and covers the whole picture</div>' +
            thumbs('fx', FX.map(f => ({ arg: f[0], name: f[0], bg: grad(f[1], f[2]) })));
        case 'tool:ask':
          return '<div class="v4-bubble">What should I change?</div><div class="v4-field" style="color:var(--text-faint);font-weight:400">Ask for a change…<i class="v4-caret"></i></div>' +
            chips('ask', [['ask', 'Make it 10 seconds'], ['ask', 'Captions for the talking'], ['ask', 'Warmer colours']]);
        case 'tray:speed': {
          const sp = (L && L.speed) || 1;
          const pos = (Math.log(sp) - Math.log(0.25)) / (Math.log(4) - Math.log(0.25));
          return chips('speed', [0.5, 1, 1.5, 2, 3].map(v => [v, v + '×', Math.abs(v - sp) < 1e-6])) + slider('0.25× – 4×', pos, sp + '×') +
            '<div class="v4-small">The clips after it move up or along. Titles on it keep their length.</div>';
        }
        case 'tray:volume': {
          const v = S.vol[S.sel] != null ? S.vol[S.sel] : 100;
          return slider('Volume', v / 200, v + '%') + chips('vol', [0, 50, 100, 150].map(x => [x, x + '%', x === v])) + chips('note', [['fade', 'Fade in'], ['fade', 'Fade out']]);
        }
        case 'tray:look':
          return lookStrip(S.look.clip[S.sel] || 'none', L ? V.thumb(L) : grad('#888', '#333')) + '<div class="v4-small">Just this one. Look in the bottom row does every clip.</div>';
        case 'tray:crop': {
          const c = S.crop[S.sel] || 'free';
          return chips('crop', [['free', 'Free', c === 'free'], ['9:16', '9:16', c === '9:16'], ['1:1', '1:1', c === '1:1'], ['16:9', '16:9', c === '16:9']]) +
            chips('note', [['turn', 'Turn'], ['flip', 'Flip']]);
        }
        case 'tray:editwords':
        case 'tray:editlines':
          if (u && u.kind === 'captions') return (L.captions || []).slice(0, 4).map(c => '<div class="v4-cue"><em>' + esc(V.fmt(L.start + c.start)) + '</em><span>' + esc(c.text) + '</span></div>').join('');
          return '<div class="v4-field">' + esc(L ? (L.text || L.name) : '') + '<i class="v4-caret"></i></div>' + chips('note', [['style', 'Style'], ['style', 'Animate']]);
        default: return '';
      }
    }
    function makeSheet(k, where) {
      const t = panelTitle(k);
      const fromLeft = where === 'pcC' || where === 'pcS';
      const d = V.el('div', 'v4-sheet ' + where + (S.rise ? ' v4-rise' + (fromLeft ? ' from-left' : '') : ''));
      d.setAttribute('role', 'group'); d.setAttribute('aria-label', t.text);
      d.innerHTML = '<div class="v4-sh-head">' + icon(t.icon) + '<b>' + esc(t.text) + '</b><button type="button" class="v4-x" data-v4="close" aria-label="Close">' + icon('close') + '</button></div>' +
        '<div class="v4-sh-body">' + panelBody(k) + '</div>' + (where === 'pcA' ? '' : '<i class="v4-tail' + (fromLeft ? ' left' : '') + '"></i>');
      return d;
    }
    function bandInfo(R) {
      const P = ed.doc.project, n = R.main.filter(e => !e.slot).length;
      return '<div class="v4-bandinfo"><b>' + esc(P.name) + '</b><span>' + P.width + ' × ' + P.height + ' · ' + (P.fps || 30) + ' fps · ' + n + ' clips · ' + mmss(R.trackEnd) + '</span></div>';
    }
    function placeSheets(R) {
      [ph.root, pc.root].forEach(r => r.querySelectorAll('.v4-sheet').forEach(n => n.remove()));
      const sz = size(), mode = sz.sideways ? 'S' : S.d20, k = S.tool;
      pc.panel.innerHTML = (!k || mode !== 'A') ? bandInfo(R) : '';
      if (!k) { S.rise = false; return; }
      ph.timeline.appendChild(makeSheet(k, 'ph'));
      const sh = makeSheet(k, 'pc' + mode);
      if (mode === 'A') pc.panel.appendChild(sh);
      else if (mode === 'C') pc.timeline.appendChild(sh);
      else if (mode === 'B') {
        const sb = boxIn(pc.stage, pc.root), h = Math.max(120, Math.min(240, sb.h - 16));
        sh.style.height = h + 'px'; sh.style.top = (sb.y + sb.h - h - 8) + 'px';
        pc.root.appendChild(sh);
      } else {                                     // sideways: over the timeline panel, up into the bottom of the stage
        const tb = boxIn(pc.timeline.parentNode, pc.root), sb = boxIn(pc.stage, pc.root);
        const h = Math.round(sz.tlH + sb.h * 0.3);
        sh.style.left = (tb.x + 6) + 'px'; sh.style.width = (tb.w - 12) + 'px'; sh.style.height = (h - 6) + 'px'; sh.style.bottom = '6px';
        pc.root.appendChild(sh);
      }
      S.rise = false;
    }
    function aimTails() {
      if (!S.tool) return;
      const [pbtn, cbtn] = twins(S.tool);
      [[ph, pbtn], [pc, cbtn]].forEach(([fr, btn]) => {
        const sh = fr.root.querySelector('.v4-sheet'); if (!sh || !btn) return;
        const tail = sh.querySelector('.v4-tail'); if (!tail || tail.classList.contains('left')) return;
        const b = boxIn(btn, fr.root), s = boxIn(sh, fr.root);
        const x = Math.max(18, Math.min(s.w - 18, b.x + b.w / 2 - s.x));
        tail.style.setProperty('--tx', x + 'px');
      });
    }

    /* ---------------- lighting a twin ---------------- */
    function applyLit() {
      [ph.root, pc.root].forEach(r => r.querySelectorAll('.v4-lit').forEach(n => n.classList.remove('v4-lit', 'v4-pulse')));
      const pulse = S.pulse; S.pulse = false;
      if (!S.lit) return;
      twins(S.lit).forEach(n => {
        if (!n) return;
        n.classList.add('v4-lit');
        if (pulse && !reduced()) { void n.offsetWidth; n.classList.add('v4-pulse'); }
      });
    }
    function light(k) { S.lit = k; S.pulse = true; S.aim = null; S.nudge = 0; }
    function renderLit() { applyLit(); renderWhere(); markChips(); schedule(); }

    function posIn(btn) { const sib = Array.from(btn.parentNode.children).filter(c => c.classList.contains('fm-tool')); return { i: sib.indexOf(btn) + 1, n: sib.length }; }
    function kindWord(u) {
      if (!u) return '';
      if (u.section === 'main') return 'A clip in the clip row';
      if (u.kind === 'captions') return 'The captions';
      if (u.kind === 'text') return 'A title';
      if (u.kind === 'audio') return 'The music';
      if (u.lead.type === 'image') return 'A sticker';
      return 'An overlay';
    }
    function rowWord(u) {
      if (u.section === 'main') return 'The clip row';
      if (u.section === 'audio') return 'The sound row, under the clips';
      return 'The ' + (V.SECTION_NAME[u.section] || 'item') + ' row, above the clips';
    }
    function describe(k) {
      const i = k.indexOf(':'), kind = i < 0 ? k : k.slice(0, i), id = i < 0 ? '' : k.slice(i + 1);
      const [a, b] = twins(k);
      if (kind === 'tool' && a && b) {
        const t = V.QUICK_TOOLS.find(x => x.id === id), pa = posIn(a), pbp = posIn(b);
        const same = pa.i === pbp.i && a.getAttribute('aria-label') === b.getAttribute('aria-label');
        return { icon: t.icon, name: t.label, what: TOOL_WHAT[id] || '', phone: 'The bottom row, ' + ord(pa.i) + ' of ' + pa.n,
                 pc: 'The bottom row of the left panel, ' + ord(pbp.i) + ' of ' + pbp.n, same: same ? 'Same name, same place in the row' : '' };
      }
      if (kind === 'tray' && a && b) {
        const R = ed.read(), main = S.sel && R.isMain(S.sel), t = trayTool(id, S.sel && R.units[S.sel] && trayOf(R, S.sel)) || { icon: 'more', label: id };
        const pa = posIn(a), pbp = posIn(b);
        const same = pa.i === pbp.i && a.getAttribute('aria-label') === b.getAttribute('aria-label');
        return { icon: t.icon, name: t.label, what: id === 'delete' && !main ? 'Deletes it' : (TRAY_WHAT[id] || ''),
                 phone: 'The row just above the tools, ' + ord(pa.i) + ' of ' + pa.n, pc: 'The row just above the tools, in the left panel, ' + ord(pbp.i) + ' of ' + pbp.n,
                 same: same ? 'Same name, same place in the row' : '' };
      }
      if (kind === 'act' && a && b && ACT[id]) {
        const A = ACT[id];
        const bar = a.closest('.fm-topbar, .fm-playbar');
        const la = Array.from(bar.querySelectorAll('[data-act]')), lb = Array.from(pc.transport.querySelectorAll('[data-act]'));
        const iL = la.indexOf(a) + 1, jL = lb.indexOf(b) + 1, iR = la.length - iL + 1, jR = lb.length - jL + 1;
        const same = iL === jL ? 'Same button, ' + ord(iL) + ' from the left on both'
          : iR === jR ? 'Same button, ' + (iR === 1 ? 'last' : ord(iR) + ' from the right') + ' on both'
          : 'Same button. The computer puts the phone\'s two bars into this one';
        return { icon: A[2], name: A[0], what: A[1], phone: bar.classList.contains('fm-topbar') ? 'The top bar' : 'The bar under the picture',
                 pc: 'The bar above the timeline', same };
      }
      if (kind === 'item') {
        const R = ed.read(), u = R.units[id];
        if (u) return { icon: u.section === 'main' ? 'clips' : u.kind === 'audio' ? 'music' : u.kind === 'captions' ? 'captions' : u.kind === 'text' ? 'text' : 'overlay',
                        name: nameOf(u.lead), what: kindWord(u) + (S.sel === id ? ', picked on both' : ''), phone: rowWord(u) + (u.section !== 'main' && u.section !== 'audio' ? ' (it opens by itself when picked)' : ''),
                        pc: rowWord(u), same: S.sel === id ? 'One project, so one pick shows on both' : '' };
      }
      if (kind === 'add' && a && b) return { icon: 'add', name: 'Add clips', what: 'Adds clips at the end of the row', phone: 'The end of the clip row', pc: 'The end of the clip row', same: 'Same place on both' };
      return null;
    }
    function renderWhere() {
      const d = S.lit ? describe(S.lit) : null;
      let h;
      if (!d) h = '<div class="v4-w-top"><span class="v4-w-ico">' + icon('editor') + '</span><div><span class="v4-w-name">Tap any button</span><span class="v4-w-what">on either one. Its twin lights up on the other, and this box says where both of them are.</span></div></div>';
      else h = '<div class="v4-w-top"><span class="v4-w-ico">' + icon(d.icon) + '</span><div><span class="v4-w-name">' + esc(d.name) + '</span><span class="v4-w-what">' + esc(d.what) + '</span></div></div>' +
        '<dl class="v4-w-map"><dt>Phone</dt><dd>' + esc(d.phone) + '</dd><dt>Computer</dt><dd>' + esc(d.pc) + '</dd></dl>' +
        (d.same ? '<p class="v4-w-same">' + icon('check') + '<span>' + esc(d.same) + '</span></p>' : '');
      if (S.last) {
        const k = S.last.kind, both = k === 'edit' || k === 'mock' || k === 'undo';
        h += '<div class="v4-w-edit' + (k === 'bad' ? ' bad' : '') + '"><span>' + esc(S.last.say) + (both ? '. One project, so the phone and the computer both show it.' : '') + '</span>' +
          (k === 'edit' && ed.canUndo() ? '<button type="button" class="h-btn" data-undo>Undo</button>' : '') + '</div>';
      }
      where.innerHTML = h;
      S.litName = d ? d.name : '';
    }
    where.addEventListener('click', e => { if (e.target.closest('[data-undo]')) doUndo(); });

    /* ---------------- the check: read both drawings, compare ---------------- */
    const labelsOf = box => box ? Array.from(box.querySelectorAll(':scope > .fm-tool')).map(b => ({ id: b.dataset.tool, label: b.getAttribute('aria-label') || '' })) : [];
    const actsOf = (root, sel) => Array.from(root.querySelectorAll(sel)).map(b => normAct(b.dataset.act)).filter(a => ACT[a]);
    const curTray = () => { const R = ed.read(); return S.sel && R.units[S.sel] ? trayOf(R, S.sel) : []; };
    function chipRow(prefix, list) {
      return '<div class="v4-chiprow">' + list.map(x => {
        const t = (prefix === 'tool:' ? V.QUICK_TOOLS.find(y => y.id === x.id) : trayTool(x.id, curTray())) || { icon: 'more' };
        return '<button type="button" class="v4-tchip" data-key="' + esc(prefix + x.id) + '">' + icon(t.icon) + '<span>' + esc(x.label) + '</span></button>';
      }).join('') + '</div>';
    }
    function verdict(a, b, what) {
      const n = Math.max(a.length, b.length);
      const good = a.filter((x, i) => b[i] && b[i].id === x.id && b[i].label === x.label).length;
      return '<p class="v4-ok' + (good === n ? '' : ' bad') + '">' + icon(good === n ? 'check' : 'close') + '<span>' +
        (good === n ? n + ' of ' + n + ' ' + what + ' match: same names, same order' : good + ' of ' + n + ' match') + '</span></p>';
    }
    function renderCompare() {
      const R = ed.read(), u = S.sel && R.units[S.sel];
      const t1 = labelsOf(ph.tools), t2 = labelsOf(pc.tools);
      const r1 = phTray ? labelsOf(ph.tray) : [], r2 = pcTray ? labelsOf(pc.tray) : [];
      const a1 = actsOf(ph.root, '.fm-topbar [data-act], .fm-playbar [data-act]'), a2 = actsOf(pc.root, '.fm-transport [data-act]');
      const set2 = new Set(a2), all = new Set(a1.concat(a2)), both = a1.filter(a => set2.has(a)).length;
      let h = '<h3>You only learn it once</h3><p class="v4-sub">The phone and the computer have the same buttons, with the same names, in the same order. This box checks both drawings again after every change you make.</p>';
      h += '<div class="v4-cmp-row"><div class="v4-cmp-name">The bottom row, always there</div>' + chipRow('tool:', t1) + verdict(t1, t2, 'tools') + '</div>';
      h += '<div class="v4-cmp-row"><div class="v4-cmp-name">The row above it' + (u ? ' (' + esc(nameOf(u.lead)) + ' picked)' : '') + '</div>';
      if (r1.length) h += chipRow('tray:', r1) + verdict(r1, r2, 'tools');
      else h += '<p class="v4-sub">It shows the tools for whatever you pick. Pick a clip and they line up here too.</p><button type="button" class="h-btn" data-pick="c2">Pick Waves</button>';
      h += '</div>';
      h += '<div class="v4-cmp-row"><div class="v4-cmp-name">The buttons around the picture</div><div class="v4-chiprow">' +
        a1.map(a => '<button type="button" class="v4-tchip" data-key="act:' + a + '" aria-label="' + esc(ACT[a][0]) + '" title="' + esc(ACT[a][0]) + '">' + icon(ACT[a][2]) + '</button>').join('') + '</div>' +
        '<p class="v4-ok' + (both === all.size ? '' : ' bad') + '">' + icon(both === all.size ? 'check' : 'close') + '<span>' + both + ' of ' + all.size + ' on both, same icons</span></p>' +
        '<p class="v4-sub">The phone splits them between the top bar and the bar under the picture. The computer has room for one bar, above the timeline.</p></div>';
      cmp.innerHTML = h;
      markChips();
    }
    function markChips() { cmp.querySelectorAll('.v4-tchip').forEach(c => c.classList.toggle('lit', c.dataset.key === S.lit)); }
    cmp.addEventListener('click', e => {
      const p = e.target.closest('[data-pick]');
      if (p) { const R = ed.read(); const id = R.units[p.dataset.pick] ? p.dataset.pick : (R.main.find(x => !x.slot) || {}).id; if (id) { S.sel = null; onTap(id); } return; }
      const c = e.target.closest('.v4-tchip'); if (!c) return;
      stopTour(); light(c.dataset.key); renderLit();
    });

    /* ---------------- D20: size and where the panel opens, measured on the drawing ----------------
       QA 29 Sep: on a phone the big computer drawing sits ~700 px above these buttons, so only the numbers visibly changed.
       The card now carries its own small drawing of the computer (blocks measured off the big one), right beside the
       buttons, and the numbers are in rows of options instead of pixels. Sideways has no choice, so A, B and C lock. */
    d20.innerHTML =
      '<h3>On a computer, where does a tool open?</h3>' +
      '<p class="v4-d20-intro"><b>Decided: A, your pick (D20).</b> A tool\'s panel opens inside the left panel and scrolls; the picture and the timeline stay in full view. Pick a window size to see how much room it gets. B and C are kept here only to compare, and the big computer drawing above follows whichever you tap.</p>' +
      '<div class="v4-d20-map"><div class="v4-map" role="img"><div class="v4-map-win">' +
        '<i class="m-stage"></i><i class="m-pic"><span>Picture</span></i><i class="m-band"><span>Left panel</span></i><i class="m-tl"><span>Timeline</span></i><i class="m-sheet"><span></span></i>' +
      '</div></div><p class="v4-map-cap">The computer, drawn simply. The blue box is the tool panel.</p></div>' +
      '<div class="v4-d20-l"><p class="v4-lbl">Window</p><div class="v4-seg" role="group" aria-label="Window size">' + SIZES.map(s => '<button type="button" data-size="' + s.id + '">' + esc(s.label) + '</button>').join('') + '</div>' +
      '<p class="v4-lbl">Where it opens</p><div class="v4-seg" role="group" aria-label="Where a tool opens">' + D20.map(o => '<button type="button" data-d20="' + o.id + '">' + esc(o.label) + (o.rec ? ' <span class="rec">· your pick</span>' : ' <span class="not">· not chosen</span>') + '</button>').join('') + '</div>' +
      '<p class="v4-d20-why" hidden></p>' +
      '<div class="v4-try"><span>Open</span><button type="button" data-try="look">Look</button><button type="button" data-try="speed">Speed</button><button type="button" data-try="captions">Captions</button></div></div>' +
      '<div class="v4-d20-r"><div class="v4-stats"></div><p class="v4-d20-note"></p></div>';
    const stats = d20.querySelector('.v4-stats'), d20note = d20.querySelector('.v4-d20-note'), d20why = d20.querySelector('.v4-d20-why');
    const mapBox = d20.querySelector('.v4-map'), mapWin = d20.querySelector('.v4-map-win');
    const mStage = mapWin.querySelector('.m-stage'), mPic = mapWin.querySelector('.m-pic'), mBand = mapWin.querySelector('.m-band'),
          mTl = mapWin.querySelector('.m-tl'), mSheet = mapWin.querySelector('.m-sheet');
    /* picking a size or an option with nothing open opens Look, so the pick always shows something */
    function ensureTool() { if (!S.tool) { S.tool = 'tool:look'; light(S.tool); S.last = null; } }
    d20.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      stopTour(); S.aim = null; S.nudge = 0;
      if (b.dataset.size) { if (b.dataset.size !== S.size) { S.size = b.dataset.size; ensureTool(); S.rise = true; buildPC(); draw(); } return; }
      if (b.dataset.d20) { S.d20 = b.dataset.d20; ensureTool(); S.rise = true; draw(); return; }
      if (b.dataset.try) {
        const R = ed.read();
        if (b.dataset.try === 'speed') {
          if (!(S.sel && R.isMain(S.sel))) { const e2 = R.main.find(x => x.id === 'c2') || R.main.find(x => !x.slot); if (!e2) return; S.sel = e2.id; }
          S.tool = 'tray:speed';
        } else S.tool = 'tool:' + b.dataset.try;
        light(S.tool); S.rise = true; S.last = null; draw();
      }
    });
    function renderD20() {
      const sz = size();
      d20.querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === S.size)));
      d20.querySelectorAll('[data-d20]').forEach(b => {
        b.disabled = !!sz.sideways;
        b.setAttribute('aria-pressed', String(!sz.sideways && b.dataset.d20 === S.d20));
      });
      d20why.hidden = !sz.sideways; d20why.textContent = sz.sideways ? SIDE_NOTE : '';
      d20note.hidden = !!sz.sideways;
      d20note.textContent = sz.sideways ? '' : (D20.find(o => o.id === S.d20) || D20[0]).note;
    }
    /* rows of 40 px option buttons (with a 6 px gap) that fit under a panel's 38 px title and 10 px top padding */
    const rowsFit = h => Math.max(0, Math.floor((h - 38 - 10 + 6) / 46));
    const rowsSay = n => n === 0 ? 'Not even one row of options' : 'Fits ' + n + (n === 1 ? ' row' : ' rows') + ' of options';
    const widthSay = f => f < 0.2 ? 'a small part of' : f < 0.3 ? 'about a quarter of' : f < 0.4 ? 'about a third of' : f < 0.6 ? 'about half' : f < 0.8 ? 'about two thirds of' : 'nearly all of';
    function renderStats() {
      const sheet = pc.root.querySelector('.v4-sheet'), phs = ph.root.querySelector('.v4-sheet');
      renderMap(sheet);
      if (!sheet) { stats.innerHTML = '<p class="v4-hint">Nothing is open yet. Tap Look, Speed or Captions to see where a tool opens and how much room it gets.</p>'; return; }
      const sb = boxIn(sheet, pc.root), cv = pc.stage.querySelector('.fm-canvas'), cb = cv ? boxIn(cv, pc.root) : null, tl = boxIn(pc.timeline, pc.root);
      const cover = cb && cb.w * cb.h ? overlap(sb, cb) / (cb.w * cb.h) : 0;
      const tlc = tl.w * tl.h ? overlap(sb, tl) / (tl.w * tl.h) : 0;
      const pct = Math.round(cover * 100);
      const n = rowsFit(sb.h), np = phs ? rowsFit(phs.offsetHeight) : null, wf = sb.w / (pc.root.clientWidth || sb.w);
      stats.innerHTML =
        '<div class="v4-stat ' + (np != null && n < np ? 'warn' : '') + '"><span>Room for the panel</span><b>' + rowsSay(n) + '</b><small>' +
          (np != null ? 'The phone fits ' + np + '. ' : '') + 'It takes ' + widthSay(wf) + ' the window\'s width.</small></div>' +
        '<div class="v4-stat ' + (pct ? 'warn' : 'good') + '"><span>Picture covered</span><b>' + (pct ? pct + '% of it' : (cover > 0 ? 'A sliver' : 'None')) + '</b><small>' + (pct || cover > 0 ? 'while the panel is open' : 'the whole picture shows') + '</small></div>' +
        '<div class="v4-stat"><span>Timeline</span><b>' + (tlc > 0.4 ? 'Covered' : tlc > 0 ? 'Partly covered' : 'Stays in view') + '</b><small>' + (tlc > 0.4 ? 'while it is open, as on the phone' : tlc > 0 ? 'while it is open' : 'the panel sits beside it') + '</small></div>';
    }
    /* the little drawing: the big computer's picture, left panel, timeline and tool panel, measured and scaled down */
    const MAP_H = 230;
    function renderMap(sheet) {
      const cw = pc.root.clientWidth, ch = pc.root.clientHeight, avail = mapBox.clientWidth;
      if (!cw || !ch || !avail) return;
      const mw = Math.min(avail, Math.round(MAP_H * cw / ch)), m = mw / cw;
      mapWin.style.width = mw + 'px'; mapWin.style.height = Math.round(ch * m) + 'px';
      const put = (n, b) => {
        n.style.left = (b.x * m).toFixed(1) + 'px'; n.style.top = (b.y * m).toFixed(1) + 'px';
        n.style.width = (b.w * m).toFixed(1) + 'px'; n.style.height = (b.h * m).toFixed(1) + 'px';
        n.classList.toggle('nolbl', b.w * m < 50 || b.h * m < 17);
      };
      put(mStage, boxIn(pc.stage, pc.root));
      const cv = pc.stage.querySelector('.fm-canvas'), pb = cv ? boxIn(cv, pc.root) : null, bb = boxIn(pc.band, pc.root), tb = boxIn(pc.timeline.parentNode, pc.root);
      if (pb) put(mPic, pb);
      put(mBand, bb); put(mTl, tb);
      const shb = sheet && S.tool ? boxIn(sheet, pc.root) : null;          // a block mostly under the panel keeps a faint label
      [[mPic, pb], [mBand, bb], [mTl, tb]].forEach(([n, b]) => n.classList.toggle('dim', !!(shb && b && overlap(shb, b) > 0.45 * b.w * b.h)));
      let say = 'A drawing of the computer in a ' + size().label + ' window. ';
      if (sheet && S.tool) {
        const nm = panelTitle(S.tool).text.split(' · ')[0];
        put(mSheet, boxIn(sheet, pc.root)); mSheet.firstChild.textContent = nm; mSheet.classList.add('on');
        say += 'The ' + nm + ' panel is open. ' + (size().sideways ? SIDE_NOTE : (D20.find(o => o.id === S.d20) || D20[0]).note);
      } else { mSheet.classList.remove('on'); say += 'No tool panel is open.'; }
      mapBox.setAttribute('aria-label', say);
    }

    /* ---------------- the close-up: the computer at (nearly) its real size, and it works ----------------
       QA 29 Sep: it was an inert copy, so a mouse click on it did nothing, while the small drawing it magnifies has ~5 px
       text. Now a click (or tap) on the close-up presses the real button on the computer drawing, hovering it lights the
       twin on the phone, and pointing at the small computer with a mouse moves the close-up there. It frames a whole
       part of the screen (the left panel, an open tool panel) and shrinks it a little if that is what it takes to show
       it whole; anything wider is cropped on a whole button, never through a word, with a fade where more follows. */
    const KMIN = 0.85;
    const ATOMS = 'button, .fm-tile, .fm-item, .fm-say, .fm-seam, .fm-ruler .tick, .v4-field, .v4-slider, .v4-cue, .v4-switchrow, .v4-small, .v4-bubble, .v4-bandinfo, .v4-thumbs, .v4-chips';
    let cloneOf = new WeakMap();
    const origOf = n => { while (n && n !== loupe) { const o = cloneOf.get(n); if (o) return o; n = n.parentNode; } return null; };
    function snapshot() {
      const c = pc.root.cloneNode(true), map = new WeakMap(), a = [pc.root], b = [c];
      while (a.length) {
        const x = a.pop(), y = b.pop(); if (!y) continue;
        map.set(y, x);
        for (let i = 0; i < x.children.length; i++) { a.push(x.children[i]); b.push(y.children[i]); }
      }
      cloneOf = map;
      c.classList.add('v4-still'); c.style.transform = 'none'; c.removeAttribute('role');
      c.querySelectorAll('.fm-toast').forEach(n => n.remove());
      c.querySelectorAll('button, [tabindex]').forEach(n => n.setAttribute('tabindex', '-1'));
      c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      pan.replaceChildren(c);
      return c;
    }
    function loupeTarget() {
      if (S.aim) return { box: { x: S.aim.x - 1, y: S.aim.y - 1, w: 2, h: 2 }, aim: true };
      const sheet = pc.root.querySelector('.v4-sheet');
      if (sheet && S.tool && S.lit === S.tool) return { box: boxIn(sheet, pc.root) };      // just opened: show the panel itself
      const tw = S.lit ? twins(S.lit)[1] : null;
      return { box: boxIn((tw && tw.isConnected) ? tw : (sheet || pc.tools), pc.root) };
    }
    function regionOf(T) {
      const cx = T.x + T.w / 2, cy = T.y + T.h / 2, sheet = pc.root.querySelector('.v4-sheet'), list = [];
      if (sheet && !pc.panel.contains(sheet)) list.push(boxIn(sheet, pc.root));
      list.push(boxIn(pc.band, pc.root), boxIn(pc.timeline.parentNode, pc.root), boxIn(pc.stage, pc.root));
      return list.find(G => cx >= G.x && cx <= G.x + G.w && cy >= G.y && cy <= G.y + G.h) || { x: 0, y: 0, w: pc.root.clientWidth, h: pc.root.clientHeight };
    }
    /* where to put the left edge: of every edge that keeps the target in view, the one that cuts the fewest buttons and
       lines of words (a cut on the left counts far more: the right edge has a fade), then the one nearest the centre */
    function snapLeft(L, T0, vw, vh, T, G) {
      if (T.w > vw - 16) return L;
      const lo = Math.max(G.x, T.x + T.w + 6 - vw), hi = Math.min(G.x + G.w - vw, T.x - 6);
      if (hi < lo) return L;
      const sheet = pc.root.querySelector('.v4-sheet'), shB = sheet && !pc.panel.contains(sheet) ? boxIn(sheet, pc.root) : null;
      const boxes = [];
      pc.root.querySelectorAll(ATOMS).forEach(n => {
        if (n.closest('.fm-toast')) return;
        const b = boxIn(n, pc.root);
        if (!b.w || b.w > vw * 0.8 || b.y + b.h <= T0 || b.y >= T0 + vh) return;
        if (b.x < G.x - 0.5 || b.x + b.w > G.x + G.w + 0.5) return;
        if (shB && !sheet.contains(n) && overlap(b, shB) > 0.9 * b.w * b.h) return;          // hidden under the open panel
        boxes.push(b);
      });
      const cuts = x => boxes.reduce((s, b) => s + (b.x < x - 0.5 && b.x + b.w > x + 0.5 ? 1 : 0), 0);
      const score = x => cuts(x) * 100 + cuts(x + vw) * 25 + Math.abs(x - L) / 4;
      const cand = [L];
      boxes.forEach(b => { cand.push(b.x - 6, b.x + b.w + 4, b.x + b.w + 6 - vw, b.x - 4 - vw); });
      let best = Math.max(lo, Math.min(hi, L)), bs = score(best);
      cand.forEach(x => { if (x < lo || x > hi) return; const sc = score(x); if (sc < bs) { bs = sc; best = x; } });
      return best;
    }
    function drawLoupe(fresh) {
      if (!pc || !host.isConnected) return;
      const LW = loupe.clientWidth; if (!LW || !pc.root.clientWidth) return;
      const bl = pc.root.clientLeft, bt = pc.root.clientTop, OW = pc.root.offsetWidth, OH = pc.root.offsetHeight;
      /* the close-up is as tall as the band (the left panel and timeline), so a row of tools is never cut top or bottom */
      const kOf = b => { const k0 = Math.min(1, LW / b.w); return k0 >= KMIN ? k0 : 1; };
      const band = boxIn(pc.band, pc.root), open = pc.root.querySelector('.v4-sheet'), ob = open && !pc.panel.contains(open) ? boxIn(open, pc.root) : null;
      const LH = Math.min(340, Math.max(120, Math.round(band.h * kOf(band)), ob ? Math.round(ob.h * kOf(ob)) + 4 : 0));
      if (loupe._h !== LH) { loupe._h = LH; loupe.style.height = (LH + 2) + 'px'; }
      const tg = loupeTarget(), T = tg.box, G = regionOf(T);
      let k = Math.min(1, LW / G.w, LH / G.h), L, T0, vw, vh;
      if (k >= KMIN) {                                  // the whole region fits: centre it, show nothing else
        vw = LW / k; vh = LH / k; L = G.x + G.w / 2 - vw / 2; T0 = G.y + G.h / 2 - vh / 2;
      } else {                                          // too wide: real size, around the target, cut on a whole button
        k = 1; vw = LW; vh = LH;
        L = T.w > vw - 16 ? T.x - 8 : T.x + T.w / 2 - vw / 2;
        L = G.w > vw ? Math.max(G.x, Math.min(G.x + G.w - vw, L)) : G.x + G.w / 2 - vw / 2;
        T0 = G.h <= vh ? G.y + G.h / 2 - vh / 2 : Math.max(G.y, Math.min(G.y + G.h - vh, T.h > vh - 8 ? T.y - 4 : T.y + T.h / 2 - vh / 2));
        if (G.w > vw) L = snapLeft(L, T0, vw, vh, T, G);
        if (S.nudge && G.w > vw) { const L2 = Math.max(G.x, Math.min(G.x + G.w - vw, L + S.nudge)); S.nudge = L2 - L; L = L2; }
      }
      loupe._k = k;
      const c = (fresh === false && pan.firstChild) ? pan.firstChild : snapshot();
      loupe.scrollLeft = 0; loupe.scrollTop = 0;
      c.style.clipPath = 'inset(' + (G.y + bt) + 'px ' + Math.max(0, OW - (G.x + bl + G.w)) + 'px ' + Math.max(0, OH - (G.y + bt + G.h)) + 'px ' + (G.x + bl) + 'px round 10px)';
      pan.style.transform = 'translate(' + Math.round(-(L + bl) * k) + 'px, ' + Math.round(-(T0 + bt) * k) + 'px) scale(' + (+k.toFixed(4)) + ')';
      loupe.classList.toggle('cut-l', L > G.x + 1);
      loupe.classList.toggle('cut-r', L + vw < G.x + G.w - 1);
      loupe.parentNode.classList.toggle('cut', loupe.classList.contains('cut-l') || loupe.classList.contains('cut-r'));
      const ps = pc.scale || 1;
      const vx = Math.max(L, G.x), vy = Math.max(T0, G.y), vx2 = Math.min(L + vw, G.x + G.w), vy2 = Math.min(T0 + vh, G.y + G.h);
      pc.lens.style.left = ((vx + bl) * ps) + 'px'; pc.lens.style.top = ((vy + bt) * ps) + 'px';
      pc.lens.style.width = (Math.max(0, vx2 - vx) * ps) + 'px'; pc.lens.style.height = (Math.max(0, vy2 - vy) * ps) + 'px';
      const real = k > 0.995 ? 'at its real size' : 'at nearly its real size';
      loupeCap.textContent = tg.aim ? 'the part you are pointing at, ' + real : (S.litName ? S.litName + ' ' : '') + 'on the computer, ' + real;
    }
    /* clicks and taps on the close-up press the real thing on the computer drawing */
    loupe.addEventListener('mousedown', e => e.preventDefault());       // no focus inside a copy that screen readers skip
    loupe.addEventListener('focusin', e => { if (e.target && e.target.blur) e.target.blur(); });
    let lscrub = null;
    function lscrubTo(x) { if (!lscrub || !pcTL || !pcTL.tOf) return; const { cr, or } = lscrub; onScrub(pcTL.tOf(or.left + (x - cr.left) * (or.width / (cr.width || 1)))); }
    loupe.addEventListener('pointerdown', e => {
      const o = origOf(e.target), cr = e.target.closest && e.target.closest('.fm-ruler');
      if (!o || !o.isConnected || !cr || !o.closest('.fm-ruler')) return;
      lscrub = { cr: cr.getBoundingClientRect(), or: o.closest('.fm-ruler').getBoundingClientRect() };
      e.preventDefault(); try { loupe.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
      lscrubTo(e.clientX);
    });
    /* a sideways drag moves the close-up along (when there is more to see); a tap still presses */
    let ldrag = null, swallowUntil = 0;
    loupe.addEventListener('pointerdown', e => {
      if (lscrub || (e.button != null && e.button !== 0)) return;
      ldrag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, n0: S.nudge || 0, moved: false };
    });
    loupe.addEventListener('pointermove', e => {
      if (lscrub) { lscrubTo(e.clientX); return; }
      if (!ldrag || e.pointerId !== ldrag.id) return;
      const dx = e.clientX - ldrag.x0, dy = e.clientY - ldrag.y0;
      if (!ldrag.moved) {
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
        if (!loupe.classList.contains('cut-l') && !loupe.classList.contains('cut-r')) { ldrag = null; return; }
        ldrag.moved = true; endTour(); loupe.classList.add('dragging');
        try { loupe.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
      }
      S.nudge = ldrag.n0 - dx / (loupe._k || 1);
      drawLoupe(false);
    });
    ['pointerup', 'pointercancel'].forEach(t => loupe.addEventListener(t, () => {
      lscrub = null;
      if (ldrag && ldrag.moved) { swallowUntil = performance.now() + 400; loupe.classList.remove('dragging'); }
      ldrag = null;
    }));
    loupe.addEventListener('click', e => {
      if (performance.now() < swallowUntil) { swallowUntil = 0; return; }     // the end of a drag is not a tap
      const o = origOf(e.target); if (!o) return;
      if (!o.isConnected) { drawLoupe(); return; }                    // the drawing changed under it: refresh, do nothing
      if (o.closest('.fm-ruler')) return;                               // handled on pointerdown
      o.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
    loupe.addEventListener('pointerover', e => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const o = origOf(e.target); setPeek(o && o.isConnected ? keyOf(o, pc) : null);
    });
    loupe.addEventListener('pointerleave', () => setPeek(null));
    /* with a mouse, resting on a spot of the small computer brings that spot into the close-up */
    let aimT = 0;
    function wireAim(fr) {
      fr.root.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse' || (!e.movementX && !e.movementY)) return;   // a scroll under a resting mouse is not pointing
        const rr = fr.root.getBoundingClientRect(), s = fr.scale || 1;
        const p = { x: (e.clientX - rr.left) / s - fr.root.clientLeft, y: (e.clientY - rr.top) / s - fr.root.clientTop };
        clearTimeout(aimT);
        aimT = setTimeout(() => {
          if (fr !== pc || (S.aim && Math.abs(S.aim.x - p.x) < 2 && Math.abs(S.aim.y - p.y) < 2)) return;
          endTour(); S.aim = p; S.nudge = 0; drawLoupe(false);
        }, 160);
      });
      fr.root.addEventListener('pointerleave', () => clearTimeout(aimT));
    }
    let rafId = 0, lateId = 0;
    function schedule() {
      cancelAnimationFrame(rafId); clearTimeout(lateId);
      rafId = requestAnimationFrame(() => { aimTails(); renderStats(); drawLoupe(); });
      lateId = setTimeout(drawLoupe, reduced() ? 60 : 420);
    }
    if (typeof ResizeObserver !== 'undefined') {
      let rt = 0;
      new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (host.isConnected) { drawLoupe(); renderMap(pc.root.querySelector('.v4-sheet')); } }, 120); }).observe(host);
    }
    host._shown = () => schedule();

    /* ---------------- actions ---------------- */
    function toastBoth(text, undo) {
      const a = undo ? { label: 'Undo', run: doUndo } : null;
      V.toast(ph.root, text, a);
      V.toast(pc.root, text, a, { bottom: size().tlH + 14 });
    }
    /* kind: 'edit' (one undo step), 'mock' (a look or a volume on this drawing, not an undo step), 'undo', 'bad', 'note' */
    function setLast(say, kind) {
      S.last = { say, kind };
      if (kind === 'edit' || kind === 'mock' || kind === 'bad') toastBoth(say, kind === 'edit');
    }
    function run(cmd, args, say) {
      const r = ed.run(cmd, args);
      if (!r.ok) { setLast(r.say, 'bad'); return r; }
      setLast(say || r.say || r.label, 'edit');
      return r;
    }
    function manual(label, fn) { ed.undoStack.push({ label, json: JSON.stringify(ed.doc) }); ed.redoStack = []; fn(ed.doc); }
    function uniq(base) { const ids = new Set(ed.doc.layers.map(l => l.id)); let n = 2; while (ids.has(base + '-' + n)) n++; return base + '-' + n; }
    function doUndo() { stopTour(); const l = ed.undo(); S.last = l ? { say: 'Undone: ' + l, kind: 'undo' } : { say: 'Nothing to undo', kind: 'bad' }; draw(); }

    function onTool(id) {
      stopTour();
      const k = 'tool:' + id; light(k); S.last = null;
      if (S.tool === k) S.tool = null; else { S.tool = k; S.rise = true; }
      draw();
    }
    function onTray(id) {
      stopTour();
      const R = ed.read(), u = S.sel && R.units[S.sel]; if (!u) return;
      const k = 'tray:' + id; light(k); S.last = null;
      if (['speed', 'volume', 'look', 'crop', 'editwords', 'editlines'].indexOf(id) >= 0) { if (S.tool === k) S.tool = null; else { S.tool = k; S.rise = true; } draw(); return; }
      S.tool = null;
      const nm = nameOf(u.lead);
      if (id === 'delete') {
        if (R.isMain(S.sel)) { const r = run('deleteClip', { id: S.sel }); if (r.ok) { S.sel = null; S.lit = null; } }
        else { const ids = new Set(u.layers); manual('Delete ' + nm, d => { d.layers = d.layers.filter(l => !ids.has(l.id)); }); S.sel = null; S.lit = null; setLast('Deleted ' + nm, 'edit'); }
      } else if (id === 'lift') {
        const r = run('makeOverlay', { id: S.sel }); if (r.ok) S.openSec = 'overlay';
      } else if (id === 'stay') {
        const on = !E.hasFlag(u.lead, 'stay'); const r = ed.run('stayPut', { id: S.sel, on });
        if (r.ok) setLast(on ? nm + ' stays put now and no longer follows its clip' : nm + ' follows its clip again', 'edit'); else setLast(r.say, 'bad');
      } else if (id === 'capfollow' || id === 'capstay') {         // the captions' two-way choice (DESIGN §8.5): a no-op when already on that side
        const on = id === 'capstay';
        if (E.hasFlag(u.lead, 'stay') !== on) {
          const r = ed.run('stayPut', { id: S.sel, on });
          if (r.ok) setLast(on ? 'The captions stay with the sound now' : 'The captions follow the clips again', 'edit'); else setLast(r.say, 'bad');
        }
      } else if (id === 'copy') {                                   // the item's Duplicate (the clip's is duplicateClip, which only lights here)
        const L = E.clone(u.lead), nid = uniq(L.id), d = Math.max(0, Math.min(u.end, R.trackEnd - L.duration)) - L.start;
        L.id = nid; L.start += d; delete L.sm; E.kfLists(L).forEach(a => a.forEach(q => { q.t += d; }));
        manual('Copy ' + nm, doc => { const at = doc.layers.findIndex(l => l.id === u.lead.id); doc.layers.splice(Math.max(0, at), 0, L); });
        S.sel = nid; light('item:' + nid); setLast('Copied ' + nm, 'edit');
      }
      draw();
    }
    function onAct(act) {
      stopTour();
      const k = normAct(act); if (!ACT[k]) return;
      light('act:' + k);
      if (k === 'play') { togglePlay(); renderLit(); return; }
      S.last = null;
      if (k === 'toStart') S.t = 0;
      else if (k === 'toEnd') S.t = Math.max(0, S.end - 1 / FPS);
      else if (k === 'undo') { const l = ed.undo(); S.last = l ? { say: 'Undone: ' + l, kind: 'undo' } : { say: 'Nothing to undo', kind: 'bad' }; }
      else if (k === 'redo') { const l = ed.redo(); S.last = l ? { say: 'Redone: ' + l, kind: 'undo' } : { say: 'Nothing to redo', kind: 'bad' }; }
      else if (k === 'split') split();
      draw();
    }
    function split() {
      const R = ed.read();
      let id = S.sel && R.isMain(S.sel) ? S.sel : null;
      if (id) { const e = R.entry(id); if (!(S.t > e.start && S.t < e.end)) { setLast('Move the playhead onto ' + nameOf(R.layer(id)) + ' to split it', 'bad'); return; } }
      if (!id) { const e = R.mainAt(S.t); if (e && !e.slot) id = e.id; }
      if (!id) { setLast('No clip at the playhead', 'bad'); return; }
      run('split', { id, t: S.t }, 'Split ' + nameOf(R.layer(id)) + ' in two');
    }
    function onPanel(act, arg) {
      stopTour();
      const R = ed.read(), u = S.sel && R.units[S.sel];
      if (act === 'close') { S.tool = null; draw(); return; }
      if (act === 'addclip') {
        const c = POOL[arg !== '' && arg != null ? (+arg % POOL.length) : (S.poolI++ % POOL.length)];
        const r = run('insert', { clips: [E.clone(c)] }, 'Added ' + c.name + ' at the end');
        if (r.ok) { S.tool = null; S.t = r.time != null ? r.time : S.t; }
      } else if (act === 'addtext') {
        const id = uniq('text'), st = Math.max(0, Math.min(S.t, R.trackEnd - 2));
        manual('Add text', d => { d.layers.splice(Math.min(1, d.layers.length), 0, { id, type: 'text', name: 'Your text', text: 'Your text', start: st, duration: 2 }); });
        S.sel = id; S.tool = null; S.openSec = 'text'; light('item:' + id); setLast('Added text at ' + V.fmt(st), 'edit');
      } else if (act === 'speed' && u) {
        const sp = +arg, old = u.lead.speed || 1;
        run('speed', { id: S.sel, sp }, nameOf(u.lead) + ' plays at ' + sp + '× now' + (sp > old ? ', so the clips after it moved up' : sp < old ? ', so the clips after it moved along' : ''));
      } else if (act === 'look') {
        const nm = (LOOKS.find(x => x[0] === arg) || ['', arg])[1];
        if (S.tool === 'tool:look') { S.look.all = arg; setLast(arg === 'none' ? 'No look on the clips' : nm + ' on every clip', 'mock'); }
        else if (u) { S.look.clip[S.sel] = arg; setLast(arg === 'none' ? 'No look on ' + nameOf(u.lead) : nm + ' on ' + nameOf(u.lead), 'mock'); }
      } else if (act === 'vol' && u) { S.vol[S.sel] = +arg; setLast(nameOf(u.lead) + ' at ' + arg + '% volume', 'mock'); }
      else if (act === 'crop' && u) { S.crop[S.sel] = arg; setLast(nameOf(u.lead) + (arg === 'free' ? ' cropped freely' : ' cropped to ' + arg), 'mock'); }
      else setLast(NOTE[arg] || NOTE[act] || 'Same panel, same words, on both', 'note');
      draw();
    }

    function onTap(id) {
      stopTour();
      const R = ed.read();
      S.sel = S.sel === id ? null : id;
      if (S.tool && S.tool.indexOf('tray:') === 0) S.tool = null;
      if (S.sel) {
        const u = R.units[id];
        if (u && ['captions', 'text', 'overlay', 'effect', 'behind'].indexOf(u.section) >= 0) S.openSec = u.section;
        light('item:' + id);
      } else S.lit = null;
      S.last = null;
      draw();
    }
    let scrubT = 0;
    function onScrub(x) {
      stopTour();
      S.t = Math.max(0, Math.min(x, S.end - 1 / FPS));
      tick();
      clearTimeout(scrubT); scrubT = setTimeout(schedule, 160);
    }
    function onSeam(id) { stopTour(); run('closeGap', { id }); draw(); }
    function onAdd() { stopTour(); light('add'); onPanel('addclip', ''); }

    /* ---------------- playback ---------------- */
    let playRaf = 0;
    function tick() {
      if (phTL && phTL.setTime) phTL.setTime(S.t);
      if (pcTL && pcTL.setTime) pcTL.setTime(S.t);
      drawStages(); setTimes();
    }
    function togglePlay() {
      if (S.playing) { S.playing = false; cancelAnimationFrame(playRaf); setTimes(); schedule(); return; }
      if (S.t >= S.end - 0.05) S.t = 0;
      S.playing = true; let last = performance.now();
      const step = now => {
        if (!S.playing) return;
        if (!host.isConnected) { S.playing = false; return; }
        S.t += Math.min(0.1, (now - last) / 1000); last = now;
        if (S.t >= S.end - 1 / FPS) { S.t = Math.max(0, S.end - 1 / FPS); S.playing = false; }
        tick();
        if (S.playing) playRaf = requestAnimationFrame(step); else schedule();
      };
      playRaf = requestAnimationFrame(step); setTimes();
    }

    /* ---------------- a first look: light each tool in turn, once, when the pair comes into view ---------------- */
    let tourT = 0, tourStopped = false, toured = false;
    function endTour() { tourStopped = true; clearTimeout(tourT); }
    function stopTour() {                          // every user action: end the tour and clear the last action's toast
      endTour();
      [ph, pc].forEach(fr => { const t = fr && fr.root.querySelector(':scope > .fm-toast'); if (t) { clearTimeout(t._tm); t.classList.remove('show'); } });
    }
    function tourStep(i) {
      if (tourStopped || !host.isConnected || i >= V.QUICK_TOOLS.length) return;
      light('tool:' + V.QUICK_TOOLS[i].id); renderLit();
      tourT = setTimeout(() => tourStep(i + 1), 1400);
    }
    function startTour() { if (toured || tourStopped || reduced()) return; toured = true; tourT = setTimeout(() => tourStep(0), 700); }
    host.addEventListener('pointerdown', endTour, true);
    host.addEventListener('keydown', endTour, true);
    const pair = q('.v4-pair');
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); startTour(); } }, { threshold: 0.2 });
      io.observe(pair);
    } else startTour();

    draw();
  }

  V.register('v4', {
    title: 'Phone and PC',
    group: 'Try it',
    blurb: 'The same project on a phone and a computer, with the same tools in the same order and the same names, so you only learn it once.',
    mount
  });
})();
