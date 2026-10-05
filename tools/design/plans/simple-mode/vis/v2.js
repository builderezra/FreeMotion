/* V2 — The first ten seconds (DESIGN §7.1 New project, §7.3 the first ten seconds, §8.2 the tray row, §8.5 the clip tray,
 * §8.9 the words). A step-through at 380 px: Home → New project (today's dialog, unchanged, §0.4 V6) → the phone's own picker → the clips
 * load and land end to end → the one-time hint → tap a clip and its tools fill the tray row → a second batch through
 * Clips › Add clips with the line at 0 (nothing asked) → one more with the line inside clip 2 (At the end / After Clip 2, the
 * caret at that seam, §8.5 Clips row) → a mixed pick of clips and a song at Create (the song lands as music, one Undo).
 * Next / Back / Play, taps inside the phone, and ← → keys. The controls sit under the phone, never over it. Built on the kit: VIS.phoneFrame, VIS.drawQuick, VIS.stage and
 * the engine's real insert / split / reorder / duplicate / delete commands. Its CSS is injected once (id v2-css), all
 * under .v2 (hub side) or .v2-* inside the mock, so index.html needs no extra <link>.
 */
(function () {
  'use strict';
  const VIS = window.VIS;
  if (!VIS || !VIS.register) return;
  const E = VIS.engine, el = VIS.el, esc = VIS.esc;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------------------------------------------------------------- the pictures ------------------------------------------ */
  /* Each clip is a small 9:16 scene (viewBox 90×160), used as a data URI so ids never collide: picker tile, filmstrip, canvas. */
  const LG = (a, b, c, d) => '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="' + (d || 1) + '" stop-color="' + b + '"/>' + (c ? '<stop offset="1" stop-color="' + c + '"/>' : '') + '</linearGradient></defs>';
  const SCN = {
    arrive: LG('#7fcbe4', '#d8eef0', null, '.45') + '<rect width="90" height="160" fill="url(#g)"/><circle cx="67" cy="30" r="8" fill="#fff6d8"/>' +
      '<path d="M0 66h90v20H0z" fill="#3d9bbd"/><path d="M0 82c20-5 50-6 90 2v76H0z" fill="#efd9a6"/>' +
      '<path d="M0 118c14-14 30-16 44-8s30 4 46-4v54H0z" fill="#86c396"/><path d="M37 160l7-76h3l13 76z" fill="#c9a169"/>' +
      '<path d="M39 150h19M40 138h16M41 126h13M42 114h11M43 102h8M44 92h5" stroke="#8b6a3e" stroke-width="1.2"/>' +
      '<circle cx="52" cy="108" r="2.3" fill="#2f3b44"/><path d="M52 110v8M49 114h6M52 118l-2 5M52 118l2 5" stroke="#2f3b44" stroke-width="1.5" stroke-linecap="round"/>',
    waves: '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfeaf6"/><stop offset=".38" stop-color="#8fd5ea"/><stop offset=".38" stop-color="#2b86b8"/><stop offset="1" stop-color="#15527e"/></linearGradient></defs>' +
      '<rect width="90" height="160" fill="url(#g)"/>' +
      '<path d="M0 72c8-4 15-4 22 0s15 4 22 0 15-4 22 0 16 4 24 0" stroke="#e8fbff" stroke-width="1.5" fill="none" opacity=".7"/>' +
      '<path d="M-4 94c10-6 19-6 28 0s19 6 28 0 19-6 28 0 19 6 28 0" stroke="#fff" stroke-width="2.4" fill="none" opacity=".8"/>' +
      '<path d="M-8 118c12-7 23-7 34 0s23 7 34 0 23-7 34 0" stroke="#fff" stroke-width="3" fill="none" opacity=".9"/>' +
      '<path d="M0 138c15-9 30-9 45 0s30 9 45 0v22H0z" fill="#eaf9fb"/><path d="M0 150c15-6 30-6 45 0s30 6 45 0v10H0z" fill="#e8d6a6"/>',
    castle: LG('#ffe6ae', '#f6c77c', null, '.6') + '<rect width="90" height="160" fill="url(#g)"/><circle cx="18" cy="26" r="7" fill="#fff3cf"/>' +
      '<path d="M0 104c30-6 60-6 90 0v56H0z" fill="#e0b066"/>' +
      '<path d="M22 112V76h5v-5h4v5h4v-5h4v5h5v36z" fill="#b97d3e"/><path d="M42 112V90h5v-5h4v5h4v-5h4v5h5v22z" fill="#c68a47"/>' +
      '<path d="M30 112v-9a3 3 0 0 1 6 0v9z" fill="#7a4e22"/><path d="M33 71V56" stroke="#6b4a2a" stroke-width="1.3"/><path d="M33 56l9 3-9 3z" fill="#ff6f5b"/>' +
      '<path d="M0 126c30-5 60-3 90 2v32H0z" fill="#d9a55b"/><path d="M68 124l3-9h7l3 9z" fill="#4fb3ff"/>',
    sunset: LG('#6a3d7a', '#ffb46b', null, '.62') + '<rect width="90" height="100" fill="url(#g)"/><circle cx="45" cy="98" r="18" fill="#ffe0a0"/>' +
      '<rect y="98" width="90" height="62" fill="#3d2a5a"/><path d="M30 104h30M34 111h22M38 118h14M41 125h8" stroke="#ffc98a" stroke-width="2.4" opacity=".75"/>' +
      '<path d="M0 132c20-4 40-4 60 0s22 4 30 2v26H0z" fill="#241a36"/>',
    park: LG('#bfe3ff', '#e9f6ff') + '<rect width="90" height="160" fill="url(#g)"/><path d="M0 110c30-8 60-8 90 0v50H0z" fill="#6dbb57"/>' +
      '<rect x="41" y="80" width="6" height="36" fill="#6b4a2e"/><circle cx="44" cy="70" r="20" fill="#3f8f3a"/><circle cx="31" cy="80" r="12" fill="#4ea347"/><circle cx="58" cy="80" r="13" fill="#4ea347"/>' +
      '<path d="M0 132c30-6 60-6 90 0v28H0z" fill="#5aa847"/>',
    dinner: LG('#4a2c1c', '#1c110b') + '<rect width="90" height="160" fill="url(#g)"/><circle cx="45" cy="92" r="30" fill="#efe6da"/><circle cx="45" cy="92" r="22" fill="#f7f1e8"/>' +
      '<circle cx="40" cy="90" r="10" fill="#d9733a"/><circle cx="53" cy="97" r="7" fill="#7bb661"/><rect x="9" y="70" width="3" height="46" rx="1.5" fill="#cfcfcf"/>' +
      '<rect x="72" y="36" width="12" height="28" rx="3" fill="#fff" opacity=".28"/>',
    city: LG('#0e1838', '#2b3f78') + '<rect width="90" height="160" fill="url(#g)"/><circle cx="70" cy="24" r="6" fill="#f4f1d0"/>' +
      '<path d="M4 160V72h18v88zM24 160V50h16v110zM42 160V82h20v78zM64 160V60h22v100z" fill="#0a1026"/>' +
      '<path d="M8 80h4v4H8zM14 92h4v4h-4zM28 58h4v4h-4zM28 74h4v4h-4zM34 66h4v4h-4zM46 90h4v4h-4zM54 102h4v4h-4zM68 68h4v4h-4zM76 80h4v4h-4zM68 96h4v4h-4zM30 98h4v4h-4zM8 110h4v4H8z" fill="#ffd27a"/>',
    cake: LG('#ffd6e0', '#ffb3c6') + '<rect width="90" height="160" fill="url(#g)"/><rect y="120" width="90" height="40" fill="#f3e1c9"/>' +
      '<rect x="22" y="86" width="46" height="36" rx="4" fill="#fff4e8"/><path d="M22 92c4 5 8 5 11 0s8-5 11 0 8 5 12 0 8-5 12 0v-6H22z" fill="#ff8fab"/>' +
      '<path d="M35 86V72M45 86V72M55 86V72" stroke="#7fd4ff" stroke-width="3"/><ellipse cx="35" cy="68" rx="2" ry="3.4" fill="#ffcf4a"/><ellipse cx="45" cy="68" rx="2" ry="3.4" fill="#ffcf4a"/><ellipse cx="55" cy="68" rx="2" ry="3.4" fill="#ffcf4a"/>',
    mountain: LG('#9fc6ef', '#dcebf8') + '<rect width="90" height="160" fill="url(#g)"/><path d="M0 110L22 70l18 28 18-38 32 44v56H0z" fill="#7f95b8"/>' +
      '<path d="M22 70l5 9-5-2-4 3zM58 60l6 10-6-3-5 4z" fill="#fff"/><path d="M0 130l30-34 22 28 18-18 20 22v32H0z" fill="#4d6386"/>',
    road: LG('#ffd9a0', '#ffb877') + '<rect width="90" height="160" fill="url(#g)"/><circle cx="62" cy="62" r="11" fill="#fff0c9"/><rect y="96" width="90" height="64" fill="#c89a62"/>' +
      '<path d="M32 160l12-64h2l20 64z" fill="#3a3a40"/><path d="M45 102v6M45 116v9M45 134v12" stroke="#ffe08a" stroke-width="1.6"/>',
    flowers: LG('#2f5d3a', '#1d3b25') + '<rect width="90" height="160" fill="url(#g)"/>' +
      '<g fill="#ffcc4d"><circle cx="24" cy="50" r="6"/><circle cx="32" cy="56" r="6"/><circle cx="18" cy="58" r="6"/><circle cx="26" cy="64" r="6"/></g><circle cx="25" cy="57" r="4" fill="#8a4b1b"/>' +
      '<g fill="#ff7aa2"><circle cx="62" cy="96" r="7"/><circle cx="71" cy="102" r="7"/><circle cx="55" cy="104" r="7"/><circle cx="64" cy="111" r="7"/></g><circle cx="63" cy="103" r="4.5" fill="#fff0b3"/>' +
      '<g fill="#ffcc4d"><circle cx="30" cy="120" r="5"/><circle cx="37" cy="125" r="5"/><circle cx="25" cy="127" r="5"/><circle cx="32" cy="132" r="5"/></g><circle cx="31" cy="126" r="3.4" fill="#8a4b1b"/>',
    shot: '<rect width="90" height="160" fill="#f2f3f6"/><rect x="8" y="10" width="30" height="4" rx="2" fill="#c9ccd4"/><rect x="8" y="26" width="74" height="40" rx="6" fill="#dfe3ea"/>' +
      '<rect x="8" y="74" width="60" height="5" rx="2.5" fill="#b8bdc8"/><rect x="8" y="84" width="70" height="5" rx="2.5" fill="#cdd1da"/><rect x="8" y="94" width="50" height="5" rx="2.5" fill="#cdd1da"/>' +
      '<rect x="8" y="132" width="74" height="16" rx="8" fill="#0a84ff"/>'
  };
  const LOOK = { arrive: ['#9ad1a8', '#3f7d6b'], waves: ['#5fd3e6', '#1f6fa3'], castle: ['#f3d27a', '#c98b4b'], sunset: ['#ff9966', '#6a3d7a'],
    park: ['#bfe3ff', '#4ea347'], dinner: ['#6a4430', '#1c110b'], city: ['#2b3f78', '#0a1026'], cake: ['#ffd6e0', '#ff8fab'], mountain: ['#9fc6ef', '#4d6386'],
    road: ['#ffd9a0', '#3a3a40'], flowers: ['#2f5d3a', '#ffcc4d'], shot: ['#f2f3f6', '#b8bdc8'] };
  const urlCache = {};
  const sceneURL = k => urlCache[k] || (urlCache[k] = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice">' + (SCN[k] || SCN.shot) + '</svg>') + '")');
  const hueOf = l => (l && l.hue ? 'hue-rotate(' + l.hue + 'deg)' : '');

  /* The camera roll: oldest first, newest last (the beach clips are the four most recent). A picture lands 5 s long:
     FM.defaultLayerDuration() (js/app.js:2777). */
  const ROLL = [
    { id: 'p1', name: 'Lookout', scene: 'mountain', photo: true }, { id: 'p2', name: 'Park', scene: 'park', dur: 12.4 },
    { id: 'p3', name: 'Dinner', scene: 'dinner', photo: true }, { id: 'p4', name: 'City lights', scene: 'city', dur: 21.3 },
    { id: 'p5', name: 'Flowers', scene: 'flowers', photo: true }, { id: 'p6', name: 'Birthday', scene: 'cake', dur: 7.2 },
    { id: 'p7', name: 'Road trip', scene: 'road', dur: 15.0 }, { id: 'p8', name: 'Screenshot', scene: 'shot', photo: true },
    { id: 'p9', name: 'Picnic', scene: 'park', hue: 40, photo: true }, { id: 'p10', name: 'Night bus', scene: 'city', hue: -30, dur: 9.1 },
    { id: 'p11', name: 'Lunch', scene: 'dinner', hue: 20, photo: true }, { id: 'p12', name: 'Hills', scene: 'mountain', hue: 150, dur: 18.2 },
    { id: 'p13', name: 'Garden', scene: 'flowers', hue: 200, photo: true }, { id: 'p14', name: 'Drive home', scene: 'road', hue: 180, dur: 11.4 },
    { id: 'p15', name: 'Cupcakes', scene: 'cake', hue: 90, photo: true }, { id: 'p16', name: 'Pool', scene: 'waves', hue: 60, photo: true },
    { id: 'c1', name: 'Arriving', scene: 'arrive', dur: 6.2 }, { id: 'c2', name: 'Waves', scene: 'waves', dur: 9.4 },
    { id: 'c3', name: 'Sandcastle', scene: 'castle', dur: 5.1 }, { id: 'c4', name: 'Sunset', scene: 'sunset', dur: 7.6 }
  ];
  const DEFAULT_PICK = ['c1', 'c2', 'c3', 'c4'];
  const PHOTO_LEN = 5;
  const rollById = id => ROLL.find(p => p.id === id);
  const lenOf = p => (p.photo ? PHOTO_LEN : p.dur);
  const secsOf = ids => ids.reduce((s, id) => { const p = rollById(id); return s + (p ? lenOf(p) : 0); }, 0);
  /* one picked roll item → the clip the engine's insert takes; ids are kept only for the first import (fresh ids after that) */
  function clipOf(p, keepId) {
    const c = { type: p.photo ? 'image' : 'video', name: p.name, duration: lenOf(p), srcDur: p.photo ? undefined : p.dur, look: LOOK[p.scene], scene: p.scene, hue: p.hue || 0 };
    if (keepId) c.id = p.id;
    return c;
  }
  /* §8.5 Clips › Add clips, later on: a second batch with the line at 0 (no question), then one more with the line mid-track */
  const BATCH1 = ['p9', 'p16'];          // in roll order, the order the phone hands them over
  const BATCH2 = ['p13'];
  /* §7.3 a mixed pick: a song cannot come from Photos, so on an iPhone this pick is made in Files */
  const SONG = { name: 'Summer song', dur: 192, look: ['#ff5f8a', '#a44bff'] };
  const FILES = [
    { id: 'c1', file: 'Arriving.mov', meta: '0:06 · 14 MB' }, { id: 'c2', file: 'Waves.mov', meta: '0:09 · 21 MB' },
    { id: 'c3', file: 'Sandcastle.mov', meta: '0:05 · 11 MB' }, { id: 'c4', file: 'Sunset.mov', meta: '0:08 · 17 MB' },
    { id: 'song', file: 'Summer song.m4a', meta: '3:12 · 7 MB', song: true }, { id: 'doc', file: 'Trip plan.pdf', meta: 'Not a photo, video or song', off: true }
  ];
  const FILES_PICK = ['c1', 'c2', 'c3', 'c4', 'song'];
  const ASPECTS = [
    { k: '9:16', sub: 'Phone', w: 1080, h: 1920, fw: 10, fh: 16 }, { k: '16:9', sub: 'Wide', w: 1920, h: 1080, fw: 18, fh: 10 },
    { k: '1:1', sub: 'Square', w: 1080, h: 1080, fw: 13, fh: 13 }, { k: '4:5', sub: 'Post', w: 1080, h: 1350, fw: 12, fh: 15 },
    { k: '4:3', sub: 'Classic', w: 1440, h: 1080, fw: 16, fh: 12 }, { k: 'Custom', sub: 'Auto adjusts', w: 1080, h: 1920, fw: 13, fh: 13, dash: true }
  ];

  /* icons the kit does not have, drawn on its 24px grid with its 1.8 stroke */
  const MORE_ICONS = {
    length: '<path d="M3.5 5v14M20.5 5v14M7 12h10M10 9l-3 3 3 3M14 9l3 3-3 3"/>',
    earlier: '<rect x="12" y="6" width="8.5" height="12" rx="2"/><path d="M8.5 9l-3.5 3 3.5 3M5 12h5"/>',
    later: '<rect x="3.5" y="6" width="8.5" height="12" rx="2"/><path d="M15.5 9l3.5 3-3.5 3M19 12h-5"/>',
    replace: '<path d="M4.5 10a7.5 7.5 0 0 1 13-3.5L19 8M19.5 14a7.5 7.5 0 0 1-13 3.5L5 16"/><path d="M19 3.8V8h-4.2M5 20.2V16h4.2"/>',
    reverse: '<path d="M19.5 8H6M9 5L6 8l3 3M4.5 16H18M15 13l3 3-3 3"/>',
    soundout: '<path d="M3 12h1.5M6.5 8.5v7M10 5.5v13M13.5 9v6"/><path d="M16.5 12h5M19 9.5l2.5 2.5-2.5 2.5"/>',
    quick: '<rect x="1.5" y="6" width="9" height="12" rx="2"/><rect x="12" y="6" width="9" height="12" rx="2"/><rect x="22.5" y="6" width="9" height="12" rx="2"/>',
    full: '<rect x="2" y="4" width="18" height="4" rx="2"/><rect x="9" y="10" width="21" height="4" rx="2"/><rect x="5" y="16" width="13" height="4" rx="2"/>'
  };
  const icon = (name, cls, vb) => MORE_ICONS[name]
    ? '<svg viewBox="0 0 ' + (vb || 24) + ' 24" class="ico' + (cls ? ' ' + cls : '') + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + MORE_ICONS[name] + '</svg>'
    : VIS.icon(name, cls);

  /* the main-clip tray, left to right (§8.5); 🗑 is pinned at the right end, Split is only on the play bar's ✂ */
  const CLIP_TOOLS = [
    { id: 'speed', label: 'Speed', icon: 'speed' }, { id: 'volume', label: 'Volume', icon: 'sound' },
    { id: 'lift', label: 'Lift off', icon: 'lift' }, { id: 'look', label: 'Look', icon: 'look' },
    { id: 'crop', label: 'Crop', icon: 'crop' }, { id: 'length', label: 'Length', icon: 'length' },
    { id: 'earlier', label: 'Move earlier', icon: 'earlier' }, { id: 'later', label: 'Move later', icon: 'later' },
    { id: 'effects', label: 'Effects', icon: 'effects' }, { id: 'replace', label: 'Replace', icon: 'replace' },
    { id: 'duplicate', label: 'Duplicate', icon: 'duplicate' }, { id: 'reverse', label: 'Reverse', icon: 'reverse' },
    { id: 'soundout', label: 'Take sound out', icon: 'soundout' }
  ];

  /* ---------------------------------------------------------------- the words -------------------------------------------- */
  const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const numWord = n => NUM[n] || String(n);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const ICON_TOKENS = { split: 'split', undo: 'undo', trash: 'delete', more: 'more', add: 'add' };
  function rich(s) {                    // our own strings only; escaped first, then {split} etc. become the app's icons
    return esc(s).replace(/\{(\w+)\}/g, (m, k) => ICON_TOKENS[k] ? '<span class="v2-ii">' + VIS.icon(ICON_TOKENS[k]) + '</span>' : m);
  }
  const STEPS = [
    { key: 'home', title: 'Home, on a new phone',
      text: () => 'Someone opens FreeMotion for the very first time. No projects yet, and one big + at the bottom.',
      small: 'This is the real Home. The ▶, the words “Let’s see what you’re made of” and the arrow to the + are in the app today. Nothing on Home changes for Simple.' },
    { key: 'new', title: 'New project, as today',
      text: () => 'Today’s New project, unchanged. They type a name, keep the phone shape, and tap Create.',
      small: 'Nothing in this dialog is new. Which editor it opens in is this phone’s last switch in the ⚙ cog (decision D3, recommended): this page follows a phone that last switched to Simple. A phone that has never switched, like yours today, opens Full, exactly as now.' },
    { key: 'pick', title: 'The picker opens at once',
      text: () => 'That same tap on Create opens the phone’s own photo picker. They pick four beach clips and tap Add.',
      small: 'It has to open inside that one tap, or an iPhone quietly blocks it. The picks wait until the new project is ready, then go in. Try it: tap any photo to pick or unpick it. Cancel shows what happens if they close the picker.' },
    { key: 'land', title: n => cap(numWord(n)) + (n === 1 ? ' clip lands' : ' clips, end to end'),
      text: n => 'The project opens. The clip row counts them in, then ' + (n === 1 ? 'it sits' : 'all ' + numWord(n) + ' sit end to end') + ' from the very start, with the first frame showing.',
      small: 'While they load, the row is not a button, so it cannot open a second picker by mistake. Adding them is one step: one tap on {undo} takes them all back out. They land in the order the phone hands them over; {more} › Sort by date taken fixes a wrong order.' },
    { key: 'hint', title: 'One hint, once',
      text: () => 'The row under the timeline says what to do next, and {split} glows once.',
      small: 'Exact words: “Tap a clip to change its speed or look · {split} splits it at the line”. On a computer it says “Click a clip…” and “{split} or S splits it at the line”. It goes on the first tap anywhere and never comes back on that device. It never shows in a project made from a template, or in Full.' },
    { key: 'tap', title: 'Tap a clip',
      text: (n, second) => 'Tap ' + second + '. It gets a white outline with a handle at each end, and the row fills with what you can do to it.',
      small: 'That row was always there, so nothing on screen jumps. {trash} always sits at the right end, and splitting lives only on {split} above. The row is longer than the screen: swipe it (with a mouse, drag it, scroll the wheel or use ‹ ›). Try it here: tap other clips, drag along the numbers, press play, or use Move later, Duplicate and {trash} for real. {undo} undoes.' },
    { key: 'more', title: 'More clips later',
      text: () => 'Later they tap Clips, then Add clips. The line is still at the very start, so nothing is asked: the new clips go on the end.',
      small: 'It is the same picker as Create. From Clips, new clips go after the last clip (and before an end card, if there is one). It only asks where when the line is somewhere inside the clips: that is the next step. The + at the end of the clip row always adds at the end and never asks. One tap on {undo} takes the whole batch back out.' },
    { key: 'mid', title: 'Adding in the middle',
      text: (n, second) => 'Now the line is inside ' + second + '. This time Clips asks one thing: At the end, or After Clip 2. A thin line on the clips shows where After Clip 2 is.',
      small: 'At the end is already picked, so tapping Add clips straight away does what it did before. After Clip 2 means the cut nearest the line, so no clip is ever cut in two to make room. Drag along the numbers while Clips is open: the words and the thin line follow. Near the front of the first clip it reads Before Clip 1.' },
    { key: 'song', title: 'A song in the pick',
      text: () => 'Back at Create, say they also picked a song. The clips go on the clip row, and the whole song goes under them as music. It is longer than the clips, so the video runs on in black after them, as Full does today (your pick, D17). One tap on {undo} takes all of it back out.',
      small: 'Photos only has photos and videos, so on an iPhone a song is picked in Files (Choose Files). On a computer it is the normal file window. While they load, the row counts every file (Adding 5 files…). The song starts with the first clip and goes in whole: nothing trims or fades it. The black band after the last clip says how long the video runs on; to end the song with the clips, trim its end, as in Full. It is all one step, so one {undo} takes out the clips and the song together. A song picked on its own goes in whole, and the + Add clips row stays.' }
  ];
  const BRANCH = { title: 'If they close the picker',
    text: 'The new project opens empty. The whole clip row is one big + Add clips button, so their next tap opens the picker again.',
    small: 'The playhead stays hidden until something is added. The moment anything is in the project, the row drops to its normal height and the playhead comes back.' };
  const HINT = 'Tap a clip to change its speed or look · {split} splits it at the line';
  const LAST = STEPS.length - 1;
  const TAP = STEPS.findIndex(s => s.key === 'tap');
  const PROJECT_TOOLS = VIS.QUICK_TOOLS.map(t => t.id === 'look' ? Object.assign({}, t, { label: 'Look for all' }) : t);

  /* ---------------------------------------------------------------- styles ----------------------------------------------- */
  const CSS = `
/* The controls sit under the phone, in the page (QA 29 Sep: pinned to the bottom of a 380×800 screen they covered the phone's
   last 200 px, the hint row included). overflow-anchor: none because the page holds the phone still by hand when the words above
   it change length (drawSide), and the browser's own anchoring would move it twice. */
.v2 { display: grid; grid-template-areas: "head" "phone" "ctl"; gap: 14px; min-width: 0; overflow-anchor: none; }
.v2-head { grid-area: head; min-width: 0; display: grid; gap: 8px; }
.v2-phonecol { grid-area: phone; min-width: 0; width: 100%; max-width: 394px; justify-self: center; }
.v2-ctl { grid-area: ctl; min-width: 0; display: grid; gap: 8px; }
.v2-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 32px; }
.v2-count { font-family: var(--h-mono); font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--h-muted); }
.v2-replay { font: 600 13.5px/1 var(--h-body); color: var(--h-accent); background: none; border: 0; padding: 8px 4px; min-height: 36px; cursor: pointer; border-radius: 8px; }
.v2-replay:hover { text-decoration: underline; }
.v2-title { font-family: var(--h-display); font-weight: 700; font-size: clamp(22px, 5.4vw, 28px); line-height: 1.12; margin: 0; letter-spacing: -.01em; text-wrap: balance; }
.v2-text { margin: 0; font-size: 16.5px; line-height: 1.45; max-width: 52ch; text-wrap: pretty; }
.v2-more { font-size: 14.5px; color: var(--h-muted); max-width: 56ch; }
.v2-more summary { cursor: pointer; color: var(--h-accent); font-weight: 700; padding: 6px 0; min-height: 36px; display: inline-flex; align-items: center; list-style: none; }
.v2-more summary::-webkit-details-marker { display: none; }
.v2-more summary::after { content: "›"; margin-left: 6px; transition: transform .15s; display: inline-block; }
.v2-more[open] summary::after { transform: rotate(90deg); }
.v2-more p { margin: 2px 0 6px; line-height: 1.5; }
.v2-ii { display: inline-block; width: 1.05em; height: 1.05em; vertical-align: -.16em; color: var(--h-accent); }
.v2-ii svg { width: 100%; height: 100%; display: block; }
.v2-list { display: none; list-style: none; margin: 4px 0 0; padding: 0; gap: 2px; }
.v2-li { display: grid; grid-template-columns: 28px minmax(0, 1fr); align-items: center; gap: 6px; width: 100%; text-align: left; border: 0; background: transparent; color: var(--h-ink); font: 15px/1.25 var(--h-body); padding: 8px 8px; border-radius: 9px; cursor: pointer; min-height: 40px; }
.v2-li:hover { background: var(--h-accent-soft); }
.v2-li .n { font-family: var(--h-mono); font-size: 12px; color: var(--h-muted); }
.v2-li[aria-current="step"] { background: var(--h-accent-soft); font-weight: 700; }
.v2-li[aria-current="step"] .n { color: var(--h-accent); }
.v2-li.done .n::after { content: " ✓"; color: var(--h-good); }
.v2-now { margin: 0; display: flex; align-items: baseline; gap: 8px; min-width: 0; font-size: 14.5px; line-height: 1.3; }
.v2-now .n { flex: none; font-family: var(--h-mono); font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--h-muted); }
.v2-now b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v2-segs { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; }
.v2-seg { height: 26px; border: 0; background: transparent; padding: 0; cursor: pointer; display: grid; align-items: center; border-radius: 6px; }
.v2-seg i { display: block; height: 5px; border-radius: 3px; background: var(--h-rule); overflow: hidden; position: relative; }
.v2-seg i::after { content: ""; position: absolute; inset: 0; width: 0; background: var(--h-accent); border-radius: 3px; }
.v2-seg.done i::after, .v2-seg.cur i::after { width: 100%; }
.v2-seg.cur.run i::after { width: 0; animation: v2-fill var(--dur, 3s) linear forwards; }
@keyframes v2-fill { to { width: 100%; } }
.v2-btns { display: grid; grid-template-columns: 1fr 1.15fr 1fr; gap: 8px; }
.v2-btns .h-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-width: 0; white-space: nowrap; padding-inline: 10px; }
.v2-btns .h-btn svg { width: 16px; height: 16px; flex: none; }
.v2-btns .h-btn[disabled] { opacity: .45; cursor: default; }
.v2-keys { display: none; font-size: 13px; color: var(--h-faint); margin: 0; }
.v2-ctl { gap: 6px; }
@media (min-width: 820px) {
  .v2 { grid-template-columns: 394px minmax(0, 1fr); grid-template-areas: "phone head" "phone ctl" "phone ."; grid-template-rows: auto auto 1fr; column-gap: 32px; row-gap: 18px; align-items: start; }
  .v2-list { display: grid; }
  .v2-head, .v2-ctl { max-width: 520px; }
  .v2-now { display: none; }
}
@media (hover: hover) and (min-width: 820px) { .v2-keys { display: block; } }

/* ---- inside the mock ---- */
.fm.v2-root .fm-topbar, .fm.v2-root .fm-stagewrap, .fm.v2-root .fm-tools, .fm.v2-root .fm-playbar .fm-ibtn, .fm.v2-root .fm-playbar .fm-time, .fm.v2-root .fm-tlwrap { transition: opacity .35s ease; }
.fm.v2-focus .fm-topbar, .fm.v2-focus .fm-stagewrap, .fm.v2-focus .fm-tools, .fm.v2-focus .fm-playbar .fm-ibtn:not([data-act="split"]), .fm.v2-focus .fm-playbar .fm-time { opacity: .28; }
.fm.v2-focus .fm-tray { box-shadow: inset 0 0 0 1.5px rgba(90, 199, 237, .75); }
.fm .fm-ibtn.v2-glow { animation: v2-glow 1.7s ease-in-out 1 both; }
@keyframes v2-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(90, 199, 237, 0); } 40%, 62% { box-shadow: 0 0 0 2px #5ac7ed, 0 0 14px rgba(90, 199, 237, .55); color: #5ac7ed; } }
.fm .v2-pressed { transform: scale(.93); filter: brightness(1.18); transition: transform .1s, filter .1s; }
.fm.v2-root [hidden], .v2 [hidden] { display: none !important; }
/* "Look for all" is two lines at 380 rather than "Look for…": icons stay on one line, a long name wraps under its own icon */
.fm.v2-root .fm-tools .fm-tool { justify-content: flex-start; padding-top: 5px; }
.fm.v2-root .fm-tools .fm-tool .tl { white-space: normal; text-align: center; line-height: 1.05; overflow: visible; }
.fm .v2-ii .ico { width: 100%; height: 100%; }
.fm.v2-focus.v2-rm .fm-playbar .fm-ibtn[data-act="split"] { box-shadow: 0 0 0 2px #5ac7ed; color: #5ac7ed; }
.fm .v2-hint.v2-fadein { animation-delay: .45s; }
.fm .v2-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.v2-finger { position: absolute; left: 0; top: 0; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; z-index: 70; pointer-events: none; opacity: 0;
  background: radial-gradient(circle, rgba(255,255,255,.62), rgba(255,255,255,.22) 58%, rgba(255,255,255,0) 72%); box-shadow: 0 0 0 2px rgba(255,255,255,.9), 0 6px 18px rgba(0,0,0,.45); }
.v2-ripple { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; border: 2px solid rgba(255,255,255,.95); z-index: 69; pointer-events: none; animation: v2-ripple .5s ease-out forwards; }
@keyframes v2-ripple { from { transform: scale(.6); opacity: 1; } to { transform: scale(1.8); opacity: 0; } }

/* Home */
.v2-home { position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column; background: var(--bg); overflow: hidden; opacity: 0; visibility: hidden; transition: opacity .34s ease, visibility 0s linear .34s; }
.v2-home.on { opacity: 1; visibility: visible; transition: opacity .34s ease; }
.v2-home.dim > * { filter: brightness(.8); }
.v2-home::before { content: ""; position: absolute; inset: -25%; pointer-events: none; background: radial-gradient(38% 28% at 22% 26%, rgba(90,199,237,.17), transparent 70%), radial-gradient(42% 32% at 82% 68%, rgba(154,120,255,.15), transparent 70%); animation: v2-drift 16s ease-in-out infinite alternate; }
@keyframes v2-drift { to { transform: translate(6%, -4%) rotate(8deg); } }
.v2-hm-top { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 10px; }
.v2-brand { font-weight: 800; font-size: 21px; letter-spacing: .2px; display: flex; align-items: center; gap: 7px; color: #eaf7fc; text-shadow: 0 0 18px rgba(90,199,237,.35); }
.v2-brand b { color: var(--accent); font-size: 15px; }
.v2-hm-search { width: 38px; height: 38px; border-radius: 50%; background: var(--panel-2); border: 1px solid var(--line); display: grid; place-items: center; color: var(--text); }
.v2-hm-search .ico { width: 18px; height: 18px; }
.v2-hm-tabs { position: relative; display: flex; gap: 7px; padding: 6px 16px 12px; }
.v2-hm-tabs span { flex: 1 1 0; min-width: 0; text-align: center; background: var(--panel-2); border: 1px solid var(--line); color: var(--text-dim); font-size: 12.5px; font-weight: 700; padding: 9px 4px; border-radius: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v2-hm-tabs span.on { background: var(--accent); border-color: var(--accent); color: #0b0e14; }
.v2-hm-empty { position: relative; flex: 1; display: grid; place-content: center; justify-items: center; gap: 10px; text-align: center; padding: 0 30px 150px; }
.v2-hm-empty .mk { font-size: 30px; line-height: 1; color: var(--accent); opacity: .55; }
.v2-hm-empty .tt { font-size: 17px; font-weight: 700; letter-spacing: .2px; }
.v2-hm-arrow { position: absolute; left: 50%; bottom: 96px; width: 120px; height: 150px; margin-left: -18px; color: rgba(233,244,247,.55); pointer-events: none; }
.v2-hm-arrow path { stroke-dasharray: 260; stroke-dashoffset: 0; }
.v2-home.on .v2-hm-arrow path.draw { animation: v2-draw 1s .25s ease-out backwards; }
@keyframes v2-draw { from { stroke-dashoffset: 260; } }
.v2-plus { position: absolute; left: 50%; bottom: 26px; width: 58px; height: 58px; margin-left: -29px; border-radius: 50%; border: 0; padding: 0; cursor: pointer; color: #06121c; display: grid; place-items: center;
  background-image: radial-gradient(120% 100% at 30% 16%, rgba(255,255,255,.9), rgba(255,255,255,0) 55%), conic-gradient(from 210deg at 50% 50%, #7FD4FF 0deg, #6BF0C8 76deg, #9BE88A 150deg, #8FB8FF 232deg, #C86BFF 300deg, #7FD4FF 360deg);
  box-shadow: 0 0 30px rgba(154,120,255,.40), 0 0 14px rgba(90,199,237,.34), inset 0 0 0 1px rgba(255,255,255,.5); animation: v2-hue 26s ease-in-out infinite alternate; }
.v2-plus::before { content: ""; position: absolute; inset: -12px; border-radius: 50%; }
.v2-plus svg { width: 26px; height: 26px; }
@keyframes v2-hue { to { filter: hue-rotate(80deg); } }

/* New project */
.v2-dlg { position: absolute; inset: 0; z-index: 32; background: rgba(4,6,10,.7); display: flex; align-items: center; justify-content: center; padding: 14px 12px; opacity: 0; visibility: hidden; transition: opacity .25s, visibility 0s linear .25s; }
.v2-dlg.on { opacity: 1; visibility: visible; transition: opacity .25s; }
.v2-dcard { width: 100%; max-width: 356px; max-height: 100%; display: flex; flex-direction: column; background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 16px 14px 12px; transform-origin: 50% 100%; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
.v2-dcard.pop { animation: v2-pop .38s cubic-bezier(.2,.9,.3,1.12) both; }
@keyframes v2-pop { from { transform: translateY(150px) scale(.2); opacity: 0; border-radius: 50%; } 60% { opacity: 1; } }
.v2-dtitle { font-weight: 800; font-size: 16px; margin-bottom: 12px; }
.v2-dscroll { flex: 1; min-height: 0; overflow-y: auto; margin: 0 -6px; padding: 0 6px 2px; scrollbar-width: thin; }
.v2-kinds { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.v2-kind { position: relative; text-align: left; display: grid; gap: 2px; align-content: start; padding: 10px 10px 11px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--panel-2); color: var(--text); cursor: pointer; min-height: 88px; transition: border-color .2s, background .2s; }
.v2-kind .ic { width: 40px; height: 22px; color: var(--text-dim); margin-bottom: 4px; }
.v2-kind .ic svg { width: 40px; height: 22px; }
.v2-kind b { font-size: 14.5px; }
.v2-kind .d { font-size: 11.5px; color: var(--text-dim); line-height: 1.3; }
.v2-kind[aria-checked="true"] { border-color: var(--accent); background: linear-gradient(180deg, rgba(90,199,237,.17), rgba(90,199,237,.05)); }
.v2-kind[aria-checked="true"] .ic { color: var(--accent); }
.v2-kind .tick { position: absolute; top: 8px; right: 8px; width: 18px; height: 18px; border-radius: 50%; background: var(--accent); color: #04161d; display: none; place-items: center; }
.v2-kind .tick svg { width: 12px; height: 12px; stroke-width: 3; }
.v2-kind[aria-checked="true"] .tick { display: grid; }
.v2-dnote { font-size: 11.5px; color: var(--accent); margin: 8px 2px 0; }
.v2-lbl { font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--text-dim); margin: 13px 0 6px; }
.v2-input { padding: 9px 12px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 10px; font-size: 15px; min-height: 40px; display: flex; align-items: center; }
.v2-input.focus { border-color: var(--accent); }
.v2-typed.sel { background: rgba(90,199,237,.38); border-radius: 2px; }
.v2-caret { display: none; width: 1.5px; height: 18px; background: var(--accent); margin-left: 1px; animation: v2-blink 1s steps(1) infinite; }
.v2-input.focus .v2-caret { display: block; }
@keyframes v2-blink { 50% { opacity: 0; } }
.v2-aspects { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.v2-asp { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 2px; padding: 7px 4px 6px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 10px; font-weight: 700; font-size: 12.5px; color: var(--text); cursor: pointer; min-height: 52px; }
.v2-asp small { font-size: 10px; color: var(--text-dim); font-weight: 500; }
.v2-asp i { display: block; border: 1.5px solid var(--text-dim); border-radius: 2px; margin-bottom: 2px; }
.v2-asp i.dash { border-style: dashed; }
.v2-asp.on { border-color: var(--accent); color: var(--accent); }
.v2-asp.on i { border-color: var(--accent); }
.v2-asp.on small { color: var(--accent); }
.v2-morerow { margin-top: 11px; width: 100%; display: flex; align-items: center; gap: 5px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); background: rgba(255,255,255,.02); color: var(--text-dim); font-size: 12.5px; cursor: pointer; min-height: 42px; text-align: left; }
.v2-morerow b { color: var(--text); font-weight: 700; }
.v2-morerow .chev { margin-left: auto; font-size: 16px; line-height: 1; }
.v2-fields { margin-top: 6px; }
.v2-fld { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--line-soft); font-size: 13px; }
.v2-fld:last-child { border-bottom: 0; }
.v2-fld .val { padding: 6px 10px; border-radius: 8px; background: var(--panel-2); border: 1px solid var(--line); font-size: 12px; white-space: nowrap; }
.v2-sw { display: inline-flex; gap: 5px; }
.v2-sw i { width: 24px; height: 22px; border-radius: 6px; border: 1px solid var(--line); display: block; }
.v2-sw i.on { outline: 2px solid var(--accent); outline-offset: 1px; }
.v2-sw i.none { background: repeating-conic-gradient(#555 0 25%, #333 0 50%) 0 0 / 8px 8px; }
.v2-dacts { display: flex; justify-content: flex-end; gap: 8px; padding-top: 12px; }
.v2-dacts button { padding: 10px 18px; border-radius: 9px; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); font-weight: 600; cursor: pointer; min-height: 40px; }
.v2-dacts .v2-create { background: var(--accent); border-color: var(--accent); color: #0b0e14; }

/* the phone's own picker (iOS look) */
.v2-pick { position: absolute; inset: 0; z-index: 34; background: rgba(0,0,0,.45); opacity: 0; visibility: hidden; transition: opacity .3s, visibility 0s linear .36s; }
.v2-pick.on { opacity: 1; visibility: visible; transition: opacity .3s; }
.v2-sheet { position: absolute; left: 0; right: 0; top: 26px; bottom: 0; background: #1c1c1e; border-radius: 13px 13px 0 0; display: flex; flex-direction: column; transform: translateY(104%); transition: transform .4s cubic-bezier(.2,.8,.2,1); font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif; color: #fff; box-shadow: 0 -10px 30px rgba(0,0,0,.4); }
.v2-pick.on .v2-sheet { transform: none; }
.v2-grab { width: 36px; height: 5px; border-radius: 3px; background: #48484a; margin: 6px auto 0; }
.v2-ph { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 2px 6px 6px; }
.v2-ph button { background: none; border: 0; color: #0a84ff; font-size: 15px; padding: 8px 8px; cursor: pointer; min-height: 40px; }
.v2-ph .v2-pcancel { justify-self: start; }
.v2-ph .v2-add { justify-self: end; font-weight: 700; }
.v2-ph .v2-add[disabled] { color: #545458; cursor: default; }
.v2-pseg { display: grid; grid-template-columns: 1fr 1fr; width: 170px; background: #2c2c2e; border-radius: 9px; padding: 2px; font-size: 12px; font-weight: 600; }
.v2-pseg span { text-align: center; padding: 5px 4px; border-radius: 7px; color: #fff; }
.v2-pseg span.on { background: #636366; }
.v2-grid { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; align-content: end; }
.v2-ptile { position: relative; aspect-ratio: 1 / 1; border: 0; padding: 0; background: #333; cursor: pointer; overflow: hidden; }
.v2-ptile .img { position: absolute; inset: 0; background-position: center; background-size: cover; background-repeat: no-repeat; }
.v2-ptile .dur { position: absolute; right: 5px; bottom: 3px; font-size: 11px; font-weight: 600; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.9); z-index: 2; }
.v2-ptile .chk { position: absolute; right: 5px; top: 5px; width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.95); background: rgba(0,0,0,.18); display: grid; place-items: center; z-index: 2; box-shadow: 0 1px 3px rgba(0,0,0,.4); }
.v2-ptile .chk svg { width: 13px; height: 13px; opacity: 0; color: #fff; stroke-width: 3; }
.v2-ptile[aria-pressed="true"] .chk { background: #0a84ff; border-color: #fff; }
.v2-ptile[aria-pressed="true"] .chk svg { opacity: 1; }
.v2-ptile[aria-pressed="true"]::after { content: ""; position: absolute; inset: 0; background: rgba(255,255,255,.16); box-shadow: inset 0 0 0 2px rgba(10,132,255,.9); }
.v2-ptile.pop .chk { animation: v2-chk .32s cubic-bezier(.2,.9,.3,1.5); }
@keyframes v2-chk { from { transform: scale(.4); } }
.v2-pfoot { padding: 8px 12px 14px; text-align: center; font-size: 12px; color: #8e8e93; border-top: 1px solid #2c2c2e; min-height: 38px; }

/* the empty / loading clip row (§7.3) */
.v2-bigrow { position: absolute; left: 0; top: 2px; height: 56px; border-radius: 9px; }
button.v2-bigrow { border: 0; padding: 0; cursor: pointer; color: #06121c; font-weight: 800; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 6px;
  background: linear-gradient(100deg, #7FD4FF, #6BF0C8, #9BE88A, #8FB8FF, #C86BFF, #7FD4FF); background-size: 300% 100%; animation: v2-flow 9s linear infinite; box-shadow: 0 0 20px rgba(154,120,255,.28), inset 0 0 0 1px rgba(255,255,255,.5); }
button.v2-bigrow svg { width: 18px; height: 18px; stroke-width: 2.6; }
@keyframes v2-flow { to { background-position: 300% 0; } }
.v2-bigrow.loading { border: 1.5px dashed rgba(90,199,237,.45); background: repeating-linear-gradient(135deg, rgba(90,199,237,.09) 0 8px, rgba(90,199,237,.03) 8px 16px); background-size: 22.6px 22.6px; animation: v2-stripes 1.1s linear infinite; }
@keyframes v2-stripes { to { background-position: 22.6px 0; } }
.v2-phbox { position: absolute; top: 8px; height: 48px; border-radius: 7px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); transition: width .38s cubic-bezier(.2,.8,.2,1), background .3s, border-color .3s; overflow: hidden; }
.v2-phbox.known { background: rgba(90,199,237,.2); border-color: rgba(90,199,237,.6); }
.v2-phbox::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent); transform: translateX(-100%); animation: v2-shimmer 1.2s ease-in-out infinite; }
.v2-phbox.known::after { display: none; }
@keyframes v2-shimmer { to { transform: translateX(100%); } }
.v2-loadlbl { position: absolute; top: 19px; z-index: 3; transform: translateX(-50%); background: rgba(6,12,15,.86); border: 1px solid var(--line); padding: 4px 11px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; color: var(--text); font-variant-numeric: tabular-nums; }
.fm .v2-land .fm-tile { animation: v2-drop .46s cubic-bezier(.2,.9,.3,1.15) backwards; }
@keyframes v2-drop { from { opacity: 0; transform: translateY(-14px) scale(.96); } }
.fm .fm-tile.v2-pulse { animation: v2-pulse .8s ease-out 1; }
@keyframes v2-pulse { 0% { box-shadow: 0 0 0 0 rgba(90,199,237,.9); } 100% { box-shadow: 0 0 0 10px rgba(90,199,237,0); } }
.fm .v2-fadein { animation: v2-fade .45s ease-out both; }
@keyframes v2-fade { from { opacity: 0; } }

/* the tray row */
.fm .fm-tray.v2-tray { padding: 0 4px 0 6px; }
.v2-hint { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 0 4px; font-size: 12.5px; line-height: 1.3; color: var(--text); }
.v2-hint .v2-ii { color: var(--accent); width: 15px; height: 15px; vertical-align: -3px; }
.v2-quiet { color: var(--text-dim); font-size: 12.5px; padding-left: 6px; }
.v2-quiet b { color: var(--text); }
.v2-trayrow { display: flex; align-items: stretch; width: 100%; height: 44px; gap: 2px; }
/* the clip tools scroll sideways: a swipe on a phone; with a mouse, drag it, turn the wheel, or use the ‹ › that show on that side */
.v2-tswrap { position: relative; flex: 1; min-width: 0; display: flex; }
.v2-trayscroll { flex: 1; min-width: 0; display: flex; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; overscroll-behavior-x: contain; padding-right: 22px; }
.v2-trayscroll::-webkit-scrollbar { display: none; }
.v2-trayrow.more-r .v2-trayscroll { -webkit-mask-image: linear-gradient(90deg, #000 84%, transparent); mask-image: linear-gradient(90deg, #000 84%, transparent); }
.v2-trayrow.more-l .v2-trayscroll { -webkit-mask-image: linear-gradient(90deg, transparent, #000 16%); mask-image: linear-gradient(90deg, transparent, #000 16%); }
.v2-trayrow.more-l.more-r .v2-trayscroll { -webkit-mask-image: linear-gradient(90deg, transparent, #000 16%, #000 84%, transparent); mask-image: linear-gradient(90deg, transparent, #000 16%, #000 84%, transparent); }
.v2-tsbtn { display: none; position: absolute; top: 5px; bottom: 5px; width: 26px; z-index: 3; place-items: center; padding: 0; border: 0; border-radius: 8px; cursor: pointer; color: var(--text); background: rgba(23, 44, 54, .96); box-shadow: 0 0 0 1px var(--line), 0 2px 8px rgba(0,0,0,.4); }
.v2-tsbtn:hover { color: var(--accent); }
.v2-tsbtn svg { width: 14px; height: 14px; }
.v2-tsbtn.l { left: 0; }
.v2-tsbtn.r { right: 0; }
@media (hover: hover) and (pointer: fine) {
  .v2-trayrow.more-l .v2-tsbtn.l, .v2-trayrow.more-r .v2-tsbtn.r { display: grid; }
  .v2-trayrow.more-l .v2-trayscroll, .v2-trayrow.more-r .v2-trayscroll { cursor: grab; }
  .v2-trayscroll.dragging, .v2-trayscroll.dragging .fm-tool { cursor: grabbing; }
}
.v2-trayrow .fm-tool { flex: 0 0 auto; min-width: 52px; padding: 3px 5px; }
.v2-trayrow .v2-trash { flex: none; width: 52px; border-left: 1px solid var(--line-soft); border-radius: 0 10px 10px 0; }
.v2-trayrow .v2-trash .ico { color: #ff8a95; }
.fm .v2-rise .fm-tool { animation: v2-rise .4s cubic-bezier(.2,.9,.3,1.25) backwards; }
@keyframes v2-rise { from { opacity: 0; transform: translateY(18px); } }
.v2-line { flex: 1; min-width: 0; color: var(--text); font-size: 12.5px; padding-left: 6px; }
.fm .fm-tile.v2-drop { animation: v2-drop .46s cubic-bezier(.2,.9,.3,1.15) backwards, v2-pulse .8s ease-out .46s 1; }

/* Clips › the sheet (§8.5 Clips row): Add clips, and the where-line only while the playhead is inside the clips */
/* kept under ~140 px so it never covers the clip row, where the caret is drawn */
.v2-csheet { position: absolute; left: 0; right: 0; bottom: 0; z-index: 28; display: grid; gap: 6px; padding: 6px 12px 8px; background: var(--panel); border-top: 1px solid var(--line); border-radius: 14px 14px 0 0; box-shadow: 0 -6px 16px rgba(0,0,0,.35);
  transform: translateY(105%); visibility: hidden; transition: transform .3s cubic-bezier(.2,.8,.2,1), visibility 0s linear .3s; }
.v2-csheet.on { transform: none; visibility: visible; transition: transform .3s cubic-bezier(.2,.8,.2,1); }
.v2-cs-head { display: flex; align-items: center; justify-content: space-between; min-height: 30px; }
.v2-cs-head b { display: flex; align-items: center; gap: 7px; font-size: 15px; }
.v2-cs-head b .ico { width: 18px; height: 18px; color: var(--accent); }
.v2-cs-x { width: 32px; height: 30px; display: grid; place-items: center; border: 0; border-radius: 10px; background: transparent; color: var(--text-dim); cursor: pointer; }
.v2-cs-x:hover { background: rgba(255,255,255,.06); color: var(--text); }
.v2-cs-x .ico { width: 18px; height: 18px; }
.v2-cs-wherebox { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 8px; }
.v2-cs-lbl { font-size: 12px; color: var(--text-dim); white-space: nowrap; }
.v2-cs-where { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 2px; border-radius: 11px; background: var(--panel-2); border: 1px solid var(--line); }
.v2-cs-where button { min-height: 34px; white-space: nowrap; border: 0; border-radius: 8px; background: transparent; color: var(--text-dim); font-weight: 700; font-size: 13px; cursor: pointer; }
.v2-cs-where button[aria-checked="true"] { background: var(--accent-soft); color: var(--accent); box-shadow: inset 0 0 0 1px rgba(90,199,237,.6); }
.fm .v2-cs-add { min-height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 12px; background: var(--accent); color: #06121c; font-weight: 800; font-size: 14px; cursor: pointer; }
.fm .v2-cs-add svg { width: 18px; height: 18px; stroke-width: 2.6; }
/* the 2 px insertion caret at the After Clip N seam while the sheet is open: bright when that choice is picked */
.v2-inscaret { position: absolute; top: -2px; bottom: -2px; width: 2px; margin-left: -1px; z-index: 8; pointer-events: none; background: var(--accent); box-shadow: 0 0 8px rgba(90,199,237,.85); transition: left .12s; }
.v2-inscaret::before, .v2-inscaret::after { content: ""; position: absolute; left: -4px; border: 5px solid transparent; }
.v2-inscaret::before { top: -4px; border-top: 6px solid var(--accent); }
.v2-inscaret::after { bottom: -4px; border-bottom: 6px solid var(--accent); }
.v2-inscaret.dim { background: repeating-linear-gradient(180deg, rgba(90,199,237,.75) 0 4px, transparent 4px 7px); box-shadow: none; }
.v2-inscaret.dim::before { border-top-color: rgba(90,199,237,.6); }
.v2-inscaret.dim::after { border-bottom-color: rgba(90,199,237,.6); }
.v2-loadlbl.inline { top: 17px; }

/* the music a mixed pick adds: its 2 s fade-out drawn as a ramp at the end */
.fm .v2-fade { position: absolute; top: 0; bottom: 0; right: 0; pointer-events: none; border-radius: 0 6px 6px 0; background: linear-gradient(to bottom right, transparent 49%, rgba(0,0,0,.55) 51%); }

/* Files (the iPhone's Choose Files), for a pick that holds a song */
.v2-ftitle { font-size: 15px; font-weight: 700; text-align: center; }
.v2-flist { flex: 1; min-height: 0; overflow-y: auto; padding: 2px 0 6px; }
.v2-frow { display: grid; grid-template-columns: 24px 44px minmax(0, 1fr); align-items: center; gap: 11px; width: 100%; min-height: 60px; padding: 7px 14px; border: 0; border-bottom: 1px solid #2c2c2e; background: transparent; color: #fff; text-align: left; cursor: pointer; font-family: inherit; }
.v2-frow .chk { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid #636366; display: grid; place-items: center; }
.v2-frow .chk svg { width: 13px; height: 13px; opacity: 0; color: #fff; stroke-width: 3; }
.v2-frow[aria-pressed="true"] .chk { background: #0a84ff; border-color: #0a84ff; }
.v2-frow[aria-pressed="true"] .chk svg { opacity: 1; }
.v2-frow.pop .chk { animation: v2-chk .32s cubic-bezier(.2,.9,.3,1.5); }
.v2-frow .th { width: 44px; height: 44px; border-radius: 8px; background-position: center; background-size: cover; background-repeat: no-repeat; display: grid; place-items: center; }
.v2-frow .th.song { background-image: linear-gradient(135deg, #ff5f8a, #a44bff); color: #fff; }
.v2-frow .th.song svg { width: 22px; height: 22px; }
.v2-frow .th.doc { background: #3a3a3c; color: #aeaeb2; font-size: 10px; font-weight: 800; letter-spacing: .5px; }
.v2-frow .nm { display: grid; gap: 2px; min-width: 0; }
.v2-frow .nm b { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v2-frow .nm small { font-size: 11.5px; color: #8e8e93; }
.v2-frow[disabled] { opacity: .4; cursor: default; }

@media (prefers-reduced-motion: reduce) {
  .v2-home::before, .v2-plus, button.v2-bigrow, .v2-bigrow.loading, .v2-phbox::after { animation: none !important; }
  .v2-sheet, .v2-csheet, .v2-inscaret { transition: none !important; }
}
`;
  function injectCSS() {
    if (document.getElementById('v2-css')) return;
    const s = document.createElement('style'); s.id = 'v2-css'; s.textContent = CSS;
    (document.body || document.head).appendChild(s);                 // after kit.css's <link>, so ties go to this page
  }

  /* ---------------------------------------------------------------- the page --------------------------------------------- */
  function mount(host) {
    injectCSS();
    const S = {
      step: 0, branch: null, quick: true, more: false, fullNote: false, aspect: 0, name: 'Beach day', nameSel: false, nameFocus: false,
      picked: new Set(DEFAULT_PICK), pickTouched: false, popId: null,
      ed: null, loading: null, t: 0, sel: null, hint: true, line: null, pps: 10, span: 30,
      base: false,                       // the project is the first import (steps 4-6 keep hand edits to it)
      sheet: null, whereMode: 'end',     // the Clips sheet, and its At the end / After Clip N choice
      picker: null, morePick: new Set(), pickAt: null, more1: BATCH1.slice(),   // the photo picker opened from Clips or the +
      phase: null, filesPick: new Set(FILES_PICK),                              // step 9: 'pick' | 'load' | 'done' | 'empty'
      touched: false                     // anything moved yet (the Replay link waits for it)
    };
    let gen = 0, demo = 0, playing = false, playGen = 0, vidOn = false, raf = 0, lastTs = 0, TL = null, lineTimer = 0, lastToast = null;

    /* ---- hub side ---- */
    const wrap = el('div', 'v2');
    const head = el('div', 'v2-head');
    head.innerHTML =
      '<div class="v2-meta"><span class="v2-count"></span><button type="button" class="v2-replay" hidden>↺ Replay this step</button></div>' +
      '<ol class="v2-list" aria-label="Steps"></ol>' +
      '<h3 class="v2-title" aria-live="polite"></h3><p class="v2-text"></p>' +
      '<details class="v2-more"><summary>The small print</summary><p></p></details>';
    const phoneCol = el('div', 'v2-phonecol');
    const ctl = el('div', 'v2-ctl');
    ctl.innerHTML = '<p class="v2-now" aria-hidden="true"></p><div class="v2-segs" role="group" aria-label="Jump to a step"></div>' +
      '<div class="v2-btns"><button type="button" class="h-btn v2-back">' + VIS.icon('back') + '<span>Back</span></button>' +
      '<button type="button" class="h-btn v2-play"></button>' +
      '<button type="button" class="h-btn primary v2-next"><span>Next</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div>' +
      '<p class="v2-keys">Tip: the ← and → keys step too, and you can click inside the phone.</p>';
    wrap.appendChild(head); wrap.appendChild(phoneCol); wrap.appendChild(ctl);
    host.appendChild(wrap);
    const q = (root, s) => root.querySelector(s);
    const H = { count: q(head, '.v2-count'), replay: q(head, '.v2-replay'), list: q(head, '.v2-list'), title: q(head, '.v2-title'), text: q(head, '.v2-text'),
      small: q(head, '.v2-more p'), segs: q(ctl, '.v2-segs'), back: q(ctl, '.v2-back'), play: q(ctl, '.v2-play'), next: q(ctl, '.v2-next'), now: q(ctl, '.v2-now') };
    STEPS.forEach((st, i) => {
      const li = el('li'); const b = el('button', 'v2-li'); b.type = 'button'; b.dataset.i = i; li.appendChild(b); H.list.appendChild(li);
      const sg = el('button', 'v2-seg', '<i></i>'); sg.type = 'button'; sg.dataset.i = i; H.segs.appendChild(sg);
    });

    /* ---- the phone ---- */
    const f = VIS.phoneFrame(phoneCol, { name: S.name, editor: 'quick', stageH: 280, tlH: 180, tools: PROJECT_TOOLS, onTool: projectTool });
    f.root.classList.add('v2-root');
    f.tray.classList.add('v2-tray');
    const live = el('div', 'v2-live'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); f.root.appendChild(live);
    const home = el('div', 'v2-home'), dlg = el('div', 'v2-dlg'), pick = el('div', 'v2-pick'), files = el('div', 'v2-pick v2-files'), csheet = el('div', 'v2-csheet'), finger = el('div', 'v2-finger');
    [csheet, home, dlg, pick, files, finger].forEach(n => f.root.appendChild(n));
    const EDITOR_PARTS = [f.topbar, f.stage, f.playbar, f.timeline, f.tray, f.tools];

    home.innerHTML =
      '<div class="v2-hm-top"><div class="v2-brand"><b>▶</b>FreeMotion</div><span class="v2-hm-search" aria-hidden="true"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><circle cx="11" cy="11" r="7.5" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16.4" y1="16.4" x2="21.2" y2="21.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span></div>' +
      '<div class="v2-hm-tabs" aria-hidden="true"><span class="on">Projects</span><span>Templates</span><span>Elements</span><span>Tutorials</span></div>' +
      '<div class="v2-hm-empty"><div class="mk" aria-hidden="true">▶</div><div class="tt">Let’s see what you’re made of</div></div>' +
      '<svg class="v2-hm-arrow" viewBox="0 0 120 150" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path class="draw" d="M64 6c34 14 44 44 26 70-12 17-38 22-54 38-6 6-10 13-12 22"/><path d="M14 124l10 14 10-12"/></svg>' +
      '<button type="button" class="v2-plus" aria-label="New project"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>';

    dlg.innerHTML =
      '<div class="v2-dcard" role="dialog" aria-label="New project"><div class="v2-dtitle">New project</div><div class="v2-dscroll">' +
        '<div class="v2-lbl">Name</div><div class="v2-input"><span class="v2-typed"></span><i class="v2-caret"></i></div>' +
        '<div class="v2-lbl">Aspect ratio</div><div class="v2-aspects">' +
          ASPECTS.map((a, i) => '<button type="button" class="v2-asp" data-a="' + i + '"><i' + (a.dash ? ' class="dash"' : '') + ' style="width:' + a.fw + 'px;height:' + a.fh + 'px"></i>' + esc(a.k) + '<small>' + esc(a.sub) + '</small></button>').join('') +
        '</div>' +
        '<div class="v2-fields">' +
          '<div class="v2-fld"><span>Resolution</span><span class="val">1080p (FHD) ▾</span></div>' +
          '<div class="v2-fld"><span>Frame rate</span><span class="val">30 fps ▾</span></div>' +
          '<div class="v2-fld"><span>Background</span><span class="v2-sw"><i class="on" style="background:#000"></i><i style="background:#fff"></i><i style="background:#00b140"></i><i class="none"></i></span></div>' +
          '<div class="v2-fld"><span>Canvas</span><span class="v2-size"></span></div>' +
        '</div>' +
      '</div><div class="v2-dacts"><button type="button" class="v2-dcancel">Cancel</button><button type="button" class="v2-create">Create</button></div></div>';

    pick.innerHTML =
      '<div class="v2-sheet" role="dialog" aria-label="Photo picker"><div class="v2-grab"></div>' +
        '<div class="v2-ph"><button type="button" class="v2-pcancel">Cancel</button><div class="v2-pseg" aria-hidden="true"><span class="on">Photos</span><span>Collections</span></div><button type="button" class="v2-add">Add</button></div>' +
        '<div class="v2-grid">' + ROLL.map(p => {
          const d = p.photo ? '' : '<span class="dur">' + Math.floor(Math.round(p.dur) / 60) + ':' + String(Math.round(p.dur) % 60).padStart(2, '0') + '</span>';
          return '<button type="button" class="v2-ptile" data-id="' + p.id + '" aria-label="' + esc(p.name + (p.photo ? ', photo' : ', video')) + '"><i class="img" style="background-image:' + sceneURL(p.scene).replace(/"/g, '&quot;') + (p.hue ? ';filter:hue-rotate(' + p.hue + 'deg)' : '') + '"></i>' + d + '<span class="chk">' + VIS.icon('check') + '</span></button>';
        }).join('') + '</div>' +
        '<div class="v2-pfoot"></div>' +
      '</div>';

    files.innerHTML =
      '<div class="v2-sheet" role="dialog" aria-label="Files"><div class="v2-grab"></div>' +
        '<div class="v2-ph"><button type="button" class="v2-pcancel v2-fcancel">Cancel</button><b class="v2-ftitle">Recents</b><button type="button" class="v2-add v2-fopen">Open</button></div>' +
        '<div class="v2-flist">' + FILES.map(x => {
          const p = rollById(x.id);
          const th = x.song ? '<i class="th song">' + VIS.icon('music') + '</i>' : x.off ? '<i class="th doc">PDF</i>'
            : '<i class="th" style="background-image:' + sceneURL(p.scene).replace(/"/g, '&quot;') + '"></i>';
          return '<button type="button" class="v2-frow" data-id="' + x.id + '"' + (x.off ? ' disabled' : '') + ' aria-pressed="false"><span class="chk">' + VIS.icon('check') + '</span>' + th +
            '<span class="nm"><b>' + esc(x.file) + '</b><small>' + esc(x.meta) + '</small></span></button>';
        }).join('') + '</div>' +
        '<div class="v2-pfoot v2-ffoot"></div>' +
      '</div>';

    csheet.setAttribute('role', 'dialog'); csheet.setAttribute('aria-label', 'Clips');
    csheet.innerHTML = '<div class="v2-cs-head"><b>' + VIS.icon('clips') + 'Clips</b><button type="button" class="v2-cs-x" aria-label="Close">' + VIS.icon('close') + '</button></div>' +
      '<div class="v2-cs-wherebox"><div class="v2-cs-lbl">New clips go:</div><div class="v2-cs-where" role="radiogroup" aria-label="Where the new clips go">' +
        '<button type="button" role="radio" data-w="end">At the end</button><button type="button" role="radio" data-w="after"></button></div></div>' +
      '<button type="button" class="v2-cs-add">' + VIS.icon('add') + '<span>Add clips</span></button>';

    /* ---------------------------------------------------------------- state helpers ---------------------------------------- */
    const alive = g => g === gen && wrap.isConnected;
    const keyNow = () => (S.branch ? 'branch' : STEPS[S.step].key);
    const pickedClips = () => ROLL.filter(p => S.picked.has(p.id)).map(p => clipOf(p, true));
    const emptyDoc = () => { const a = ASPECTS[S.aspect]; return { project: { name: S.name, width: a.w, height: a.h, fps: 30, duration: 0, sm: { v: 1, home: 'simple' } }, layers: [] }; };
    const doc = () => (S.ed ? S.ed.doc : emptyDoc());
    const read = () => E.classify(doc());
    const mainIds = () => read().main.filter(e => !e.slot).map(e => e.id);
    function setScale(total) {                              // one zoom per step, from the longest the step's track gets
      if (total == null) total = pickedClips().reduce((s, c) => s + c.duration, 0);
      const w = f.timeline.clientWidth || 380;
      S.span = (total || 10) + 1; S.pps = Math.max(4, (w - 36 - 72) / S.span);
    }
    function landNow(total) {                               // the first import, landed at once (no loading row)
      setScale(total);
      S.ed = E.editor(emptyDoc());
      const res = S.ed.run('insert', { clips: pickedClips() });
      S.loading = null; S.t = 0; S.base = true;
      return res;
    }
    function resetEditorUI() { S.sel = null; S.hint = false; S.sheet = null; S.picker = null; S.whereMode = 'end'; S.pickAt = null; S.phase = null; S.line = null; }
    /* The cut Clips would insert at (DESIGN §3.6 Insert row, FM.spine.insertIndexAt): the nearest cut, an exact tie going after.
       The choice line shows only while the playhead is strictly inside the main track. */
    function whereAt(R, t) {
      const N = R.main.length, eps = R.eps || 1e-6;
      if (!N) return { mid: false };
      const cutAt = k => (k === 0 ? R.main[0].start : k === N ? R.trackEnd : R.main[k - 1].end);
      let j = 0, best = Infinity;
      for (let k = 0; k <= N; k++) { const d = Math.abs(cutAt(k) - t); if (d <= best + 1e-9) { best = Math.min(best, d); j = k; } }
      return { mid: t > R.main[0].start + eps && t < R.trackEnd - eps, j, seamT: cutAt(j), label: j === 0 ? 'Before Clip 1' : 'After Clip ' + j };
    }
    function loadWords(L, cur) {
      const n = L.clips.length + L.songs.length;
      const word = L.songs.length ? (n === 1 ? ' file' : ' files') : (n === 1 ? ' clip' : ' clips');
      return 'Adding ' + n + word + '… (' + Math.max(1, Math.min(n, cur)) + ' of ' + n + ')';
    }
    function widen(L) {                                     // a file's length has arrived: widen its box, move the rest along
      let x = 0;
      L.clips.forEach((c, j) => { const b = L.boxes[j]; if (!b) return; b.style.left = (x + 2) + 'px'; if (j < L.done) { b.classList.add('known'); b.style.width = Math.max(10, c.duration * S.pps - 4) + 'px'; } x += j < L.done ? c.duration * S.pps : 30; });
    }
    /* A pick that holds songs (§7.3 step 2): the clips Append, and each song becomes Music in the SAME step (one Undo). The
       first song starts where the first new clip starts, further songs end to end. D17 B (his pick, 1 Oct): each goes in
       WHOLE with Stay put alone (no trim, no Ends with the video, no fade), so a long song makes the video run on in black,
       exactly as Full does today (DESIGN §4.5). */
    function addMixed(clips, songs) {
      const ed = S.ed, before = JSON.stringify(ed.doc), T0 = E.classify(ed.doc).trackEnd;
      let res = { ok: true, newIds: [] };
      if (clips.length) { res = ed.run('insert', { clips }); if (!res.ok) return res; }
      const d = ed.doc, end = E.classify(d).trackEnd, ids = [];
      const taken = new Set(d.layers.map(l => l.id));
      let T = T0;
      songs.forEach(s => {
        let id = 'song', n = 2; while (taken.has(id)) id = 'song-' + (n++); taken.add(id);
        const l = { id, type: 'video', audioOnly: true, name: s.name, start: T, duration: s.dur, trimStart: 0, srcDur: s.dur, speed: 1, look: s.look };
        T += s.dur;
        if (clips.length) l.sm = { stay: true };
        d.layers.push(l); ids.push(id);
      });
      if (songs.length) d.project.duration = Math.max(end, ...d.layers.filter(l => !(l.sm && l.sm.tail)).map(l => l.start + l.duration));   // the song runs on: the video is as long as it
      const nc = clips.length, ns = songs.length;
      const words = [nc ? nc + (nc === 1 ? ' clip' : ' clips') : '', ns ? ns + (ns === 1 ? ' song' : ' songs') : ''].filter(Boolean).join(' and ');
      if (nc) ed.undoStack[ed.undoStack.length - 1].label = 'Add ' + words;
      else { ed.undoStack.push({ label: 'Add ' + words, json: before }); ed.redoStack = []; }
      return { ok: true, say: 'Added ' + words, newIds: (res.newIds || []).concat(ids) };
    }
    const hasClips = () => !!S.ed && read().main.length > 0;

    /* ---------------------------------------------------------------- drawing: the overlays -------------------------------- */
    function drawDialog() {
      dlg.querySelectorAll('.v2-asp').forEach(b => b.classList.toggle('on', +b.dataset.a === S.aspect));   // every field shows, as today
      const a = ASPECTS[S.aspect]; q(dlg, '.v2-size').textContent = a.w + ' × ' + a.h;
      const typed = q(dlg, '.v2-typed'); typed.textContent = S.name; typed.classList.toggle('sel', S.nameSel);
      q(dlg, '.v2-input').classList.toggle('focus', S.nameFocus);
    }
    const pickSet = () => (S.picker === 'photos' ? S.morePick : S.picked);
    function drawPicker() {
      const set = pickSet();
      pick.querySelectorAll('.v2-ptile').forEach(b => {
        const on = set.has(b.dataset.id);
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('pop', on && S.popId === b.dataset.id);
      });
      const n = set.size;
      const add = q(pick, '.v2-add'); add.disabled = !n; add.textContent = n ? 'Add (' + n + ')' : 'Add';
      q(pick, '.v2-pfoot').textContent = n ? n + (n === 1 ? ' item selected' : ' items selected') : 'Pick photos and videos';
    }
    function drawFiles() {
      files.querySelectorAll('.v2-frow').forEach(b => {
        const on = S.filesPick.has(b.dataset.id);
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('pop', on && S.popId === b.dataset.id);
      });
      const n = S.filesPick.size;
      q(files, '.v2-fopen').disabled = !n;
      q(files, '.v2-ffoot').textContent = n ? n + (n === 1 ? ' item selected' : ' items selected') : 'Pick videos, photos or songs';
    }
    /* the Clips sheet's changing parts, and the caret on the clip row; also called on every scrub while the sheet is open */
    function drawSheet() {
      const w = S.sheet === 'clips' ? whereAt(read(), S.t) : null;
      const box = q(csheet, '.v2-cs-wherebox');
      box.hidden = !(w && w.mid);
      if (w && w.mid) {
        const [endB, afterB] = csheet.querySelectorAll('.v2-cs-where button');
        afterB.textContent = w.label;
        endB.setAttribute('aria-checked', String(S.whereMode !== 'after')); afterB.setAttribute('aria-checked', String(S.whereMode === 'after'));
      }
      if (f.toolbar) f.toolbar.set('clips', { on: S.sheet === 'clips' });
      const lane = TL && TL.clipRow && TL.clipRow.querySelector('.fm-lane');
      let c = lane && lane.querySelector('.v2-inscaret');
      if (!(w && w.mid && lane)) { if (c) c.remove(); return w; }
      if (!c) { c = el('div', 'v2-inscaret'); lane.appendChild(c); }
      c.style.left = (w.seamT * S.pps) + 'px';
      c.classList.toggle('dim', S.whereMode !== 'after');
      return w;
    }
    function overlays() {
      const key = keyNow();
      const filesOn = key === 'song' && S.phase === 'pick';
      const onHome = (S.step < 3 && !S.branch) || filesOn;
      home.classList.toggle('on', onHome);
      home.classList.toggle('dim', (S.step === 2 && !S.branch) || filesOn);
      dlg.classList.toggle('on', S.step === 1 && !S.branch);
      pick.classList.toggle('on', (S.step === 2 && !S.branch) || S.picker === 'photos');
      files.classList.toggle('on', filesOn);
      csheet.classList.toggle('on', !onHome && S.sheet === 'clips');
      const covered = onHome || S.picker === 'photos';
      EDITOR_PARTS.forEach(p => { if (covered) p.setAttribute('inert', ''); else p.removeAttribute('inert'); });
      if (!covered && S.sheet === 'clips') { f.tray.setAttribute('inert', ''); f.tools.setAttribute('inert', ''); }
      [home, dlg, pick, files, csheet].forEach(o => { if (o.classList.contains('on')) o.removeAttribute('inert'); else o.setAttribute('inert', ''); });
      if (home.classList.contains('dim')) home.setAttribute('inert', '');
      if (S.picker === 'photos') csheet.setAttribute('inert', '');
      f.topbar.querySelector('.fm-name').textContent = S.name;
    }

    /* ---------------------------------------------------------------- drawing: the editor ---------------------------------- */
    function decorateStage(R) {
      const cv = f.stage.querySelector('.fm-canvas'); if (!cv) return;
      const empty = cv.querySelector('.cv-empty'); if (empty) empty.remove();
      const e = R.mainAt(S.t), lay = cv.querySelector('.cv-layer');
      if (!e || !lay || e.slot) return;
      const l = R.layer(e.id); if (!l || !l.scene) return;
      lay.style.background = sceneURL(l.scene) + ' center / cover no-repeat, ' + VIS.thumb(l);
      lay.style.filter = hueOf(l);
      if (vidOn && !reduced()) { const u = (S.t - e.start) / Math.max(.1, e.end - e.start); lay.style.transform = 'scale(' + (1 + .07 * u).toFixed(4) + ')'; }
    }
    function drawStage() {
      const d = doc();
      VIS.stage(f.stage, d, S.t, { selected: S.sel });
      decorateStage(E.classify(d));
    }
    function setTimeLabel() {
      f.time.innerHTML = VIS.icon(vidOn ? 'pause' : 'play') + ' ' + VIS.tc(S.t, 30);
      const s = f.time.querySelector('svg'); if (s) s.style.cssText = 'width:10px;height:10px;display:inline-block;margin-right:3px;vertical-align:-1px';
      f.time.setAttribute('aria-label', vidOn ? 'Pause' : 'Play');
    }
    function syncPlaybar() {
      const u = f.playbar.querySelector('[data-act="undo"]'), r = f.playbar.querySelector('[data-act="redo"]');
      u.classList.toggle('dim', !(S.ed && S.ed.canUndo())); r.classList.toggle('dim', !(S.ed && S.ed.canRedo()));
    }
    function bigRow(api, mode) {
      const lane = api.clipRow.querySelector('.fm-lane');
      const w = Math.max(160, (api.scroller.clientWidth || 380) - 36 - 10);
      if (mode === 'empty') {
        const b = el('button', 'v2-bigrow empty', VIS.icon('add') + '<span>Add clips</span>'); b.type = 'button'; b.style.width = w + 'px';
        b.setAttribute('aria-label', 'Add clips');
        b.addEventListener('click', ev => {
          ev.stopPropagation(); hand();
          if (keyNow() === 'song') { S.phase = 'pick'; S.filesPick = new Set(); S.popId = null; drawFiles(); overlays(); drawEditor(); return; }
          S.branch = null; goStep(2, { anim: true });
        });
        lane.appendChild(b); return b;
      }
      const L = S.loading, row = el('div', 'v2-bigrow loading'); row.style.width = w + 'px'; row.setAttribute('aria-busy', 'true');
      lane.appendChild(row);
      let x = 0;
      L.clips.forEach((c, k) => {
        const known = k < L.done;
        const box = el('div', 'v2-phbox' + (known ? ' known' : ''));
        box.style.left = (x + 2) + 'px'; box.style.width = Math.max(10, (known ? c.duration * S.pps : 26) - 4) + 'px';
        lane.appendChild(box); L.boxes[k] = box;
        x += known ? c.duration * S.pps : 30;
      });
      const lbl = el('div', 'v2-loadlbl'); lbl.style.left = (w / 2) + 'px';
      lbl.textContent = loadWords(L, L.done + 1);
      lane.appendChild(lbl); L.lbl = lbl;
      return row;
    }
    function drawTimeline(opts) {
      opts = opts || {};
      const d = doc(), R = E.classify(d), any = R.main.length > 0;
      TL = VIS.drawQuick(f.timeline, d, {
        pxPerSec: S.pps, minSpan: S.span, time: any && !S.loading ? S.t : null, selected: S.sel, addButton: any, open: null,
        onTap: onItemTap, onScrub: any ? onScrub : null, onAdd: plusTap
      });
      if (!any && !(S.loading && S.loading.inline)) bigRow(TL, S.loading ? 'loading' : 'empty');
      if (any && S.loading && S.loading.inline) {             // Clips › Add clips on a track that has clips: a chip at the seam
        const lane = TL.clipRow.querySelector('.fm-lane'), L = S.loading, seamT = L.seamT == null ? R.trackEnd : L.seamT;
        const mark = el('div', 'v2-inscaret dim'); mark.style.left = (seamT * S.pps) + 'px'; lane.appendChild(mark);
        const vis = (TL.scroller.clientWidth || 380) - 36;
        const lbl = el('div', 'v2-loadlbl inline'); lbl.style.left = Math.max(80, Math.min(vis - 80, seamT * S.pps)) + 'px';
        lbl.textContent = loadWords(L, L.done + 1); lane.appendChild(lbl); L.lbl = lbl;
        lane.setAttribute('aria-busy', 'true');
      }
      if (opts.land) TL.clipRow.classList.add('v2-land');
      if (opts.land) R.main.forEach((e, i) => { const t = TL.items.get(e.id); if (t) t.style.animationDelay = (i * 90) + 'ms'; });
      let k = 0;
      R.main.forEach(e => {                                         // the filmstrip: the clip's own picture, frame after frame
        const tile = TL.items.get(e.id); if (!tile || e.slot) return;
        const l = R.layer(e.id), film = tile.querySelector('.film');
        if (film && l.scene) { film.style.background = sceneURL(l.scene) + ' 0 0 / 34px 100% repeat-x, ' + VIS.thumb(l); film.style.filter = hueOf(l); }
        tile.setAttribute('aria-label', 'Clip ' + (e.i + 1) + ', ' + VIS.fmt(e.end - e.start));
        if (opts.pulse === e.id) tile.classList.add('v2-pulse');
        if (opts.landIds && opts.landIds.has(e.id) && !reduced()) { tile.classList.add('v2-drop'); tile.style.animationDelay = (k++ * 90) + 'ms'; }
      });
      TL.items.forEach((node, id) => {                              // a song's fade-out, drawn as a ramp at its end
        const l = R.layer(id);
        if (!l || !l.audioOnly || !l.fadeOut) return;
        const fd = el('i', 'v2-fade'); fd.style.width = Math.max(4, l.fadeOut * S.pps) + 'px'; node.appendChild(fd);
        node.title = l.name + ' · fades out over ' + VIS.fmt(l.fadeOut);
      });
      TL.scroller.addEventListener('click', ev => {
        if (ev.target.closest('.fm-tile, .fm-item, .fm-ruler, button')) return;
        if (!hasClips()) return;
        userTouch(); S.hint = false; S.sel = null; drawEditor();
      });
      return R;
    }
    function drawTray(R, opts) {
      opts = opts || {};
      const tray = f.tray; tray.innerHTML = ''; tray.classList.remove('v2-rise');
      const any = R.main.length > 0;
      if (S.line) { tray.appendChild(el('div', 'v2-line', esc(S.line))); return; }
      if (S.sel && R.isMain(S.sel)) {
        const row = el('div', 'v2-trayrow'), sc = el('div', 'v2-trayscroll');
        const i = R.idx[S.sel], n = R.main.length;
        CLIP_TOOLS.forEach(t => {
          const b = el('button', 'fm-tool', icon(t.icon) + '<span class="tl">' + esc(t.label) + '</span>');
          b.type = 'button'; b.title = t.label; b.setAttribute('aria-label', t.label); b.dataset.tool = t.id;
          if ((t.id === 'earlier' && i === 0) || (t.id === 'later' && i === n - 1)) b.disabled = true;
          b.addEventListener('click', ev => { ev.stopPropagation(); userTouch(); clipTool(t.id); });
          sc.appendChild(b);
        });
        const del = el('button', 'fm-tool v2-trash', VIS.icon('delete') + '<span class="tl">Delete</span>');
        del.type = 'button'; del.title = 'Delete'; del.setAttribute('aria-label', 'Delete');
        del.addEventListener('click', ev => { ev.stopPropagation(); userTouch(); clipTool('delete'); });
        const tw = el('div', 'v2-tswrap'); tw.appendChild(sc);
        const chev = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
        const lb = el('button', 'v2-tsbtn l', chev('M15 5l-7 7 7 7')), rb = el('button', 'v2-tsbtn r', chev('M9 5l7 7-7 7'));
        [lb, rb].forEach(x => { x.type = 'button'; x.tabIndex = -1; x.setAttribute('aria-hidden', 'true'); tw.appendChild(x); });
        row.appendChild(tw); row.appendChild(del); tray.appendChild(row);
        sideScroll(sc, row, lb, rb);
        if (opts.rise) {
          tray.classList.add('v2-rise');
          row.querySelectorAll('.fm-tool').forEach((b, k) => { b.style.animationDelay = (b === del ? 60 : k * 32) + 'ms'; });
        }
        return;
      }
      if (any && S.hint) { const h = el('div', 'v2-hint' + (opts.hintIn ? ' v2-fadein' : ''), '<span>' + rich(HINT) + '</span>'); tray.appendChild(h); return; }
      if (any) {
        const n = R.main.length;
        tray.appendChild(el('div', 'v2-quiet', '<b>' + n + (n === 1 ? ' clip' : ' clips') + '</b>' + esc(VIS.say('', R.trackEnd))));
      }
    }
    /* A row wider than the screen: a finger swipes it; a mouse can drag it, turn the wheel over it, or use the ‹ › that show on
       whichever side has more (QA 29 Sep: at 1280 the tools past Crop could not be reached with a mouse). */
    function sideScroll(sc, host, lb, rb) {
      const max = () => sc.scrollWidth - sc.clientWidth;
      const upd = () => { host.classList.toggle('more-l', sc.scrollLeft > 2); host.classList.toggle('more-r', sc.scrollLeft < max() - 2); };
      sc.addEventListener('scroll', upd, { passive: true });
      requestAnimationFrame(upd);
      const by = dir => sc.scrollBy({ left: dir * Math.max(90, sc.clientWidth * 0.7), behavior: reduced() ? 'auto' : 'smooth' });
      lb.addEventListener('click', e => { e.stopPropagation(); userTouch(); by(-1); });
      rb.addEventListener('click', e => { e.stopPropagation(); userTouch(); by(1); });
      sc.addEventListener('wheel', e => {
        if (max() <= 1 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;      // a sideways swipe on a trackpad already works
        const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        if ((d < 0 && sc.scrollLeft <= 0) || (d > 0 && sc.scrollLeft >= max() - 1)) return;   // at an end: let the page scroll
        e.preventDefault(); sc.scrollLeft += d;
      }, { passive: false });
      let moved = false;
      sc.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'mouse' || e.button !== 0 || max() <= 1) return;
        const x0 = e.clientX, l0 = sc.scrollLeft, s = f.scale || 1;
        moved = false;
        const mv = ev => { const dx = (ev.clientX - x0) / s; if (!moved && Math.abs(dx) > 5) { moved = true; sc.classList.add('dragging'); } if (moved) sc.scrollLeft = l0 - dx; };
        const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); sc.classList.remove('dragging'); setTimeout(() => { moved = false; }, 0); };
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      });
      sc.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);   // a drag is not a tap
    }
    function drawEditor(opts) {
      opts = opts || {};
      drawStage();
      const R = drawTimeline(opts);
      drawTray(R, opts);
      setTimeLabel(); syncPlaybar();
      f.topbar.querySelector('[data-act="notes"]').style.visibility = S.sel ? 'hidden' : '';
      if (opts.stageIn) { const cv = f.stage.querySelector('.fm-canvas'); if (cv) cv.classList.add('v2-fadein'); }
      drawSheet();
      return R;
    }
    function say(text) { live.textContent = ''; setTimeout(() => { live.textContent = text; }, 30); }
    const toastBottom = () => Math.max(118, f.root.clientHeight - f.playbar.offsetTop + 10);   // over the picture, never over the clips
    function toast(text) { lastToast = VIS.toast(f.root, text, null, { ms: 2600, bottom: toastBottom() }); }
    function undoToast(text) { lastToast = VIS.toast(f.root, text, { label: 'Undo', run: () => { hand(); undoNow(); } }, { ms: 4200, bottom: toastBottom() }); }
    function showLine(text) {
      S.line = text; clearTimeout(lineTimer); drawTray(read());
      lineTimer = setTimeout(() => { if (S.line === text) { S.line = null; if (wrap.isConnected) drawTray(read()); } }, 3500);
    }

    /* ---------------------------------------------------------------- the hub side ---------------------------------------- */
    function stepWords() {
      const ids = mainIds(), n = S.ed && ids.length ? ids.length : S.picked.size;
      const second = (() => { const R = read(); const e = R.main[1] || R.main[0]; if (e && !e.slot) return R.layer(e.id).name; const c = pickedClips(); return (c[1] || c[0] || { name: 'a clip' }).name; })();
      if (S.branch) return BRANCH;
      const st = STEPS[S.step];
      return { title: typeof st.title === 'function' ? st.title(n) : st.title, text: st.text(n, second), small: st.small };
    }
    /* One column (a phone): the words above the phone change length from step to step, so hold the phone still on screen
       rather than let it (and the buttons under it) jump. Only while the phone is on screen. */
    const oneCol = () => !window.matchMedia || window.matchMedia('(max-width: 819px)').matches;
    function holdPhone(fn) {
      let top = null;
      if (oneCol()) { const r = phoneCol.getBoundingClientRect(); if (r.bottom > 0 && r.top < (window.innerHeight || 800)) top = r.top; }
      fn();
      if (top == null) return;
      const fix = () => { const d = phoneCol.getBoundingClientRect().top - top; if (Math.abs(d) > 0.5) window.scrollBy(0, d); };
      fix(); requestAnimationFrame(fix);
    }
    function drawSide() { holdPhone(drawSideNow); }
    function drawSideNow() {
      const w = stepWords();
      H.count.textContent = S.branch ? 'Step 3 of ' + STEPS.length + ' · a side road' : 'Step ' + (S.step + 1) + ' of ' + STEPS.length;
      H.title.innerHTML = rich(w.title); H.text.innerHTML = rich(w.text); H.small.innerHTML = rich(w.small);
      H.now.innerHTML = '<span class="n">' + (S.branch ? 'Side road' : 'Step ' + (S.step + 1) + ' of ' + STEPS.length) + '</span><b>' + rich(w.title) + '</b>';
      H.list.querySelectorAll('.v2-li').forEach(b => {
        const i = +b.dataset.i, st = STEPS[i];
        const n = S.picked.size || 4;
        b.innerHTML = '<span class="n">' + (i + 1) + '</span><span>' + rich(typeof st.title === 'function' ? st.title(n) : st.title) + '</span>';
        if (i === S.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        b.classList.toggle('done', i < S.step);
      });
      H.segs.querySelectorAll('.v2-seg').forEach(b => {
        const i = +b.dataset.i;
        b.classList.toggle('done', i < S.step); b.classList.toggle('cur', i === S.step); b.classList.remove('run');
        b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + (typeof STEPS[i].title === 'function' ? STEPS[i].title(S.picked.size || 4) : STEPS[i].title));
        if (i === S.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      H.back.disabled = S.step === 0 && !S.branch;
      const atEnd = S.step === LAST && !S.branch;
      H.next.querySelector('span').textContent = S.branch ? 'Picker' : atEnd ? 'Restart' : 'Next';
      drawPlayBtn();
    }
    function drawPlayBtn() {
      H.play.innerHTML = playing ? VIS.icon('pause') + '<span>Pause</span>' : VIS.icon('play') + '<span>Play</span>';
      H.play.setAttribute('aria-pressed', String(playing));
      H.replay.hidden = !S.touched || playing || !!S.branch;       // nothing to replay before anything has been shown
    }
    function runSeg(ms) {
      const b = H.segs.querySelector('.v2-seg.cur'); if (!b || reduced()) return;
      b.style.setProperty('--dur', ms + 'ms'); b.classList.remove('run'); void b.offsetWidth; b.classList.add('run');
    }

    /* ---------------------------------------------------------------- steps ------------------------------------------------ */
    async function goStep(i, opts) {
      opts = opts || {};
      const g = ++gen;
      if (!opts.first) S.touched = true;
      stopVid();
      clearTimeout(lineTimer); S.line = null;
      if (lastToast) { lastToast.hide(); lastToast = null; }
      S.step = Math.max(0, Math.min(LAST, i));
      const seq = !!opts.anim, anim = seq && !reduced();          // seq: step-by-step changes; anim: movement (off for reduced motion)
      S.loading = null; S.sheet = null; S.picker = null; S.pickAt = null; S.whereMode = 'end'; S.phase = null; S.popId = null;
      f.root.classList.remove('v2-focus');
      f.root.classList.toggle('v2-rm', reduced());
      f.playbar.querySelector('[data-act="split"]').classList.remove('v2-glow');
      drawSide();
      const key = STEPS[S.step].key;
      if (S.branch) { S.ed = E.editor(emptyDoc()); S.base = false; setScale(); S.sel = null; overlays(); drawEditor(); return; }
      if (key === 'home') {
        S.quick = true; S.more = false; S.fullNote = false; S.name = 'Beach day'; S.nameSel = false; S.nameFocus = false;
        S.ed = null; S.base = false; S.sel = null; S.t = 0; S.hint = true;
        overlays(); drawEditor();
        if (seq) { home.style.transition = 'none'; home.classList.remove('on'); void home.offsetWidth; home.style.transition = ''; home.classList.add('on'); }
        return;
      }
      if (key === 'new') {
        S.fullNote = false;
        overlays(); drawDialog();
        if (!seq) { S.name = 'Beach day'; S.nameSel = false; S.nameFocus = false; drawDialog(); return; }
        const card = q(dlg, '.v2-dcard'); card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
        S.name = 'Project 1'; S.nameSel = false; S.nameFocus = false; drawDialog();
        await sleep(650); if (!alive(g)) return;
        S.nameFocus = true; S.nameSel = true; drawDialog();
        await sleep(450); if (!alive(g)) return;
        S.nameSel = false; S.name = ''; drawDialog();
        for (const ch of 'Beach day') { await sleep(75); if (!alive(g)) return; S.name += ch; drawDialog(); }
        await sleep(250); if (!alive(g)) return;
        S.nameFocus = false; drawDialog();
        return;
      }
      if (key === 'pick') {
        S.name = S.name || 'Beach day'; S.nameFocus = false; S.nameSel = false; S.popId = null;
        if (!S.pickTouched) S.picked = new Set(seq ? [] : DEFAULT_PICK);
        overlays(); drawPicker();
        if (!seq || S.pickTouched) return;
        await sleep(520);
        for (const id of DEFAULT_PICK) {
          if (!alive(g)) return;
          S.picked.add(id); S.popId = id; drawPicker();
          await sleep(300);
        }
        S.popId = null;
        return;
      }
      if (key === 'land') {
        if (!S.picked.size) S.picked = new Set(DEFAULT_PICK);
        S.sel = null; S.hint = true; S.t = 0;
        overlays();
        if (!seq) { landNow(); drawEditor(); say('Added ' + mainIds().length + ' clips'); return; }
        setScale();
        S.ed = E.editor(emptyDoc()); S.base = false;
        S.loading = { clips: pickedClips(), songs: [], done: 0, boxes: [], lbl: null };
        drawEditor();
        await sleep(420); if (!alive(g)) return;             // QA 29 Sep: without this check a step change here read S.loading after it was cleared
        const L = S.loading, n = L.clips.length;
        for (let k = 0; k < n; k++) {
          if (!alive(g)) return;
          L.done = k + 1; widen(L);                                 // this file's length has arrived
          if (L.lbl) L.lbl.textContent = loadWords(L, k + 2);
          await sleep(k === n - 1 ? 380 : 430);
        }
        if (!alive(g)) return;
        landNow();
        drawEditor({ land: true, stageIn: true, hintIn: true });
        say('Added ' + mainIds().length + ' clips');
        await sleep(1000);
        return;
      }
      if (key === 'hint') {
        if (!hasClips() || S.loading || !S.base) landNow();
        S.sel = null; S.hint = true;
        overlays(); drawEditor();
        f.root.classList.add('v2-focus');
        if (anim) {
          const sp = f.playbar.querySelector('[data-act="split"]');
          await sleep(350); if (!alive(g)) return;
          sp.classList.remove('v2-glow'); void sp.offsetWidth; sp.classList.add('v2-glow');
          await sleep(1700);
        }
        return;
      }
      if (key === 'tap') {
        if (!hasClips() || S.loading || !S.base) landNow();
        const R = read();
        if (!S.sel || !R.isMain(S.sel)) { const e = R.main[1] || R.main[0]; S.sel = e && !e.slot ? e.id : null; }
        S.hint = false;
        overlays(); drawEditor({ rise: anim });
        drawSide();
        if (anim) await sleep(700);
        return;
      }
      if (key === 'more') {                                          // Clips › Add clips with the line at 0: nothing asked
        if (!S.picked.size) S.picked = new Set(DEFAULT_PICK);
        const base = secsOf([...S.picked]);
        landNow(base + secsOf(BATCH1)); S.base = false; resetEditorUI();
        overlays(); drawEditor(); drawSide();
        if (!seq) { openSheet(); return; }
        demo = g;
        await sleep(600); if (!alive(g)) return;
        await fingerTap(f.tools.querySelector('[data-tool="clips"]')); if (!alive(g)) return;
        openSheet();
        await sleep(1100); if (!alive(g)) return;
        await fingerTap(q(csheet, '.v2-cs-add')); if (!alive(g)) return;
        sheetAdd();
        await sleep(650); if (!alive(g)) return;
        for (const id of BATCH1) { S.morePick.add(id); S.popId = id; drawPicker(); await sleep(320); if (!alive(g)) return; }
        S.popId = null;
        await fingerTap(q(pick, '.v2-add')); if (!alive(g)) return;
        await commitMore(g);
        if (demo === g) demo = 0;
        return;
      }
      if (key === 'mid') {                                           // the line inside clip 2: At the end / After Clip 2
        if (!S.picked.size) S.picked = new Set(DEFAULT_PICK);
        const more1 = S.more1 && S.more1.length ? S.more1 : BATCH1;
        landNow(secsOf([...S.picked]) + secsOf(more1) + secsOf(BATCH2)); S.base = false; resetEditorUI();
        S.ed.run('insert', { clips: more1.map(id => clipOf(rollById(id))) });
        S.t = 0;
        const target = midTarget();
        overlays(); drawEditor(); drawSide();
        if (!seq) { S.t = target; openSheet(); return; }
        demo = g;
        await sleep(500); if (!alive(g)) return;
        await dragPlayhead(g, target, 950); if (!alive(g)) return;
        await sleep(250); if (!alive(g)) return;
        await fingerTap(f.tools.querySelector('[data-tool="clips"]')); if (!alive(g)) return;
        openSheet();
        await sleep(1300); if (!alive(g)) return;
        await fingerTap(csheet.querySelector('.v2-cs-where [data-w="after"]')); if (!alive(g)) return;
        S.whereMode = 'after'; drawSheet();
        await sleep(1200); if (!alive(g)) return;
        await fingerTap(q(csheet, '.v2-cs-add')); if (!alive(g)) return;
        sheetAdd();
        await sleep(600); if (!alive(g)) return;
        for (const id of BATCH2) { S.morePick.add(id); S.popId = id; drawPicker(); await sleep(320); if (!alive(g)) return; }
        S.popId = null;
        await fingerTap(q(pick, '.v2-add')); if (!alive(g)) return;
        await commitMore(g);
        if (demo === g) demo = 0;
        return;
      }
      if (key === 'song') {                                          // a mixed pick at Create: clips + a song, one step
        S.name = 'Beach day'; S.base = false; resetEditorUI(); S.t = 0;
        if (!seq) { S.filesPick = new Set(FILES_PICK); await loadMixed(g, false); return; }
        demo = g;
        S.ed = null; S.phase = 'pick'; S.filesPick = new Set(); S.popId = null;
        setScale(secsOf(FILES_PICK.filter(id => rollById(id))));
        drawFiles(); overlays(); drawEditor();
        await sleep(560); if (!alive(g)) return;
        for (const id of FILES_PICK) { S.filesPick.add(id); S.popId = id; drawFiles(); await sleep(300); if (!alive(g)) return; }
        S.popId = null;
        await fingerTap(q(files, '.v2-fopen')); if (!alive(g)) return;
        const res = await loadMixed(g, true); if (!res || !res.ok || !alive(g)) return;
        await sleep(2000); if (!alive(g)) return;
        await fingerTap(f.playbar.querySelector('[data-act="undo"]')); if (!alive(g)) return;
        undoNow(); toast('One Undo took out the clips and the song together');
        await sleep(1900); if (!alive(g)) return;
        await fingerTap(f.playbar.querySelector('[data-act="redo"]')); if (!alive(g)) return;
        redoNow(); toast('Redo put them all back');
        if (demo === g) demo = 0;
      }
    }
    /* the line's target in step 8: 70 % into clip 2, so the nearest cut is the one after it */
    function midTarget() {
      const R = read(), e = R.main[Math.min(1, R.main.length - 1)];
      return e ? e.start + 0.7 * (e.end - e.start) : 0;
    }
    function openSheet() {
      S.sheet = 'clips'; S.sel = null; S.hint = false; S.whereMode = 'end'; S.picker = null;
      overlays(); drawEditor();
    }
    function closeSheet() { S.sheet = null; overlays(); drawEditor(); }
    /* the sheet's Add clips: fix where they go from the line as it is now, then open the phone's picker */
    function sheetAdd() {
      const w = whereAt(read(), S.t);
      S.pickAt = w.mid && S.whereMode === 'after' ? { j: w.j, seamT: w.seamT } : null;
      openMorePicker();
    }
    function openMorePicker() { S.picker = 'photos'; S.morePick = new Set(); S.popId = null; drawPicker(); overlays(); }
    function plusTap() {                                            // the + after the last clip: always at the end, never asks
      hand(); if (S.loading || !S.ed) return;
      S.sheet = null; S.pickAt = null; openMorePicker();
    }
    /* Add in the picker opened from Clips or the +: load (a chip counts them in), then ONE Insert / Append, one Undo */
    async function commitMore(g) {
      const ids = ROLL.filter(p => S.morePick.has(p.id)).map(p => p.id);    // the order the phone hands them over
      if (!ids.length || !S.ed) return null;
      const at = S.pickAt;
      const clips = ids.map(id => clipOf(rollById(id)));
      S.picker = null; S.sheet = null; S.sel = null; S.hint = false; S.pickAt = null;
      S.loading = { clips, songs: [], done: 0, boxes: [], lbl: null, inline: hasClips(), seamT: at ? at.seamT : null };
      overlays(); drawEditor();
      for (let k = 0; k < clips.length; k++) {
        await sleep(360); if (!alive(g)) return null;
        S.loading.done = k + 1; if (!S.loading.inline) widen(S.loading); if (S.loading.lbl) S.loading.lbl.textContent = loadWords(S.loading, k + 2);
      }
      await sleep(200); if (!alive(g)) return null;
      S.loading = null;
      const res = S.ed.run('insert', at ? { clips, at: at.j } : { clips });
      if (!res.ok) { drawEditor(); showLine(res.say); return res; }
      if (keyNow() === 'more') S.more1 = ids;
      S.t = res.time != null ? res.time : S.t;
      drawEditor({ landIds: new Set(res.newIds || []) });
      say(res.say); undoToast(res.say);
      drawSide();
      return res;
    }
    /* step 9's Open: the loading row counts every file, then clips + song land as one step */
    async function loadMixed(g, seq) {
      const picked = FILES.filter(x => S.filesPick.has(x.id) && !x.off);
      const clips = picked.filter(x => !x.song).map(x => clipOf(rollById(x.id), true));
      const songs = picked.filter(x => x.song).map(() => SONG);
      if (!clips.length && !songs.length) return null;
      S.phase = 'load'; S.sel = null; S.hint = false; S.t = 0; S.sheet = null; S.picker = null;
      setScale(clips.reduce((a, c) => a + c.duration, 0));
      S.ed = E.editor(emptyDoc()); S.base = false;
      overlays();
      if (seq) {
        S.loading = { clips, songs, done: 0, boxes: [], lbl: null };
        drawEditor();
        await sleep(420); if (!alive(g)) return null;
        const L = S.loading, n = clips.length + songs.length;
        for (let k = 0; k < n; k++) {
          L.done = k + 1; widen(L);
          if (L.lbl) L.lbl.textContent = loadWords(L, k + 2);
          await sleep(k === n - 1 ? 380 : 400); if (!alive(g)) return null;
        }
        S.loading = null;
      }
      S.phase = 'done';
      const res = addMixed(clips, songs);
      drawEditor({ land: seq && !reduced(), stageIn: seq });
      say(res.say); undoToast(res.say);
      drawSide();
      return res;
    }
    /* the finger dragging along the numbers, the playhead following it */
    function dragPlayhead(g, to, ms) {
      return new Promise(resolve => {
        if (!TL || !TL.ruler) { S.t = to; redrawTime(); resolve(); return; }
        const from = S.t;
        const pt = t => {
          const rr = f.root.getBoundingClientRect(), ir = TL.inner.getBoundingClientRect(), rl = TL.ruler.getBoundingClientRect(), s = f.scale || 1;
          return { x: (ir.left - rr.left) / s - f.root.clientLeft + TL.xOf(t), y: (rl.top + rl.height / 2 - rr.top) / s - f.root.clientTop };
        };
        if (reduced() || !finger.animate) { S.t = to; redrawTime(); const p = pt(to); ripple(p); setTimeout(resolve, 300); return; }
        const p0 = pt(from); finger.style.left = p0.x + 'px'; finger.style.top = p0.y + 'px';
        finger.animate([{ opacity: 0, transform: 'translate(30px, 40px) scale(1.1)' }, { opacity: 1, transform: 'scale(.86)' }], { duration: 300, easing: 'ease-out', fill: 'forwards' });
        const t0 = performance.now() + 320;
        const fade = () => finger.animate([{ opacity: 1, transform: 'scale(.86)' }, { opacity: 0, transform: 'scale(1)' }], { duration: 240, fill: 'forwards' });
        const frame = now => {
          if (!alive(g)) { fade(); resolve(); return; }
          const u = Math.max(0, Math.min(1, (now - t0) / ms)), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
          S.t = from + (to - from) * e; redrawTime();
          const p = pt(S.t); finger.style.left = p.x + 'px'; finger.style.top = p.y + 'px';
          if (u < 1) requestAnimationFrame(frame); else setTimeout(() => { fade(); resolve(); }, 140);
        };
        requestAnimationFrame(frame);
      });
    }
    function redrawTime() { drawStage(); if (TL && TL.setTime) TL.setTime(S.t); setTimeLabel(); if (S.sheet === 'clips') drawSheet(); }
    function targetOf(i) {
      if (S.branch) return f.timeline.querySelector('.v2-bigrow');
      const key = STEPS[i].key;
      if (key === 'home') return q(home, '.v2-plus');
      if (key === 'new') return q(dlg, '.v2-create');
      if (key === 'pick') return q(pick, '.v2-add');
      if (key === 'hint' && TL) { const R = read(); const e = R.main[1] || R.main[0]; return e ? TL.items.get(e.id) : null; }
      return null;
    }
    let navGen = 0;
    async function next(auto) {                                 // a newer press wins; an older one stops where it is
      const my = ++navGen;
      if (S.branch) { S.branch = null; await goStep(2, { anim: true }); return; }
      if (S.step >= LAST) { await goStep(0, { anim: true }); return; }
      const from = S.step;
      if (STEPS[from].key === 'new' && !S.quick) {              // Create with Full picked: say what happens, then carry on in Simple
        S.quick = true; S.fullNote = true; drawDialog();
        if (!auto) return;
        await sleep(1400); if (my !== navGen) return;
      }
      if (STEPS[from].key === 'pick' && !S.picked.size) { S.picked = new Set(DEFAULT_PICK); S.pickTouched = false; drawPicker(); await sleep(300); if (my !== navGen) return; }
      const tgt = targetOf(from);
      if (tgt) { await fingerTap(tgt); if (my !== navGen || S.step !== from) return; }
      await goStep(from + 1, { anim: true });
    }
    function back() {
      if (S.branch) { S.branch = null; goStep(2, { anim: false }); return; }
      if (S.step > 0) goStep(S.step - 1, { anim: false });
    }

    /* the finger that shows each tap (a drawing only: it never dispatches events) */
    function posIn(node) {
      const rr = f.root.getBoundingClientRect(), r = node.getBoundingClientRect(), s = f.scale || 1;
      return { x: (r.left + r.width / 2 - rr.left) / s - f.root.clientLeft, y: (r.top + r.height / 2 - rr.top) / s - f.root.clientTop };
    }
    function ripple(p) { const r = el('div', 'v2-ripple'); r.style.left = p.x + 'px'; r.style.top = p.y + 'px'; f.root.appendChild(r); setTimeout(() => r.remove(), 600); }
    async function fingerTap(node) {
      if (!node || !node.isConnected) return;
      const p = posIn(node);
      finger.style.left = p.x + 'px'; finger.style.top = p.y + 'px';
      if (reduced() || !finger.animate) { ripple(p); await sleep(300); return; }
      finger.animate([
        { opacity: 0, transform: 'translate(36px, 52px) scale(1.12)' },
        { opacity: 1, transform: 'translate(0, 0) scale(1)', offset: .62 },
        { opacity: 1, transform: 'scale(.8)', offset: .82 },
        { opacity: 1, transform: 'scale(1)' }], { duration: 640, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
      await sleep(520);
      ripple(p); node.classList.add('v2-pressed');
      await sleep(170);
      node.classList.remove('v2-pressed');
      finger.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' });
    }

    /* autoplay: each step's own animation, time to read, then the finger taps and it moves on */
    const DWELL = { home: 1700, new: 1900, pick: 1900, land: 2300, hint: 2400, tap: 2400, more: 1900, mid: 1900, song: 0 };
    async function play() {
      if (playing) { stopPlay(); return; }
      playing = true; const my = ++playGen; drawPlayBtn();
      if (S.step === LAST && !S.branch) { await goStep(0, { anim: true }); }
      while (playing && my === playGen && wrap.isConnected) {
        const key = S.branch ? 'pick' : STEPS[S.step].key;
        if (!S.branch && S.step >= LAST) break;
        const ms = DWELL[key] || 1800; runSeg(ms);
        await sleep(ms);
        if (!playing || my !== playGen || !wrap.isConnected) return;
        await next(true);
      }
      if (my === playGen) { playing = false; drawPlayBtn(); }
    }
    function stopPlay() {
      if (!playing) return;
      playing = false; playGen++;
      H.segs.querySelectorAll('.v2-seg.run').forEach(b => b.classList.remove('run'));
      drawPlayBtn();
    }
    function userTouch() { stopPlay(); }
    function hand() { stopPlay(); gen++; demo = 0; }                 // a hand inside the phone takes over from the demo

    /* ---------------------------------------------------------------- the editor's own controls ---------------------------- */
    function onItemTap(id, info) {
      userTouch();
      if (S.loading) return;
      if (!info || info.kind !== 'main') return;
      const was = S.sel;
      S.hint = false; S.sel = id;
      if (S.step < TAP && !S.branch) { goStep(TAP, { anim: true }); return; }
      hand(); S.sheet = null; overlays();
      stopVid();
      drawEditor({ rise: was !== id && !reduced() });
      drawSide();
    }
    function onScrub(t) {
      userTouch(); stopVid();
      const R = read(); if (!R.main.length) return;
      S.t = Math.max(0, Math.min(t, R.trackEnd - 1 / 30));
      if (S.hint) { S.hint = false; drawTray(R); }
      redrawTime();                                   // with Clips open, its words and the caret follow the line
    }
    function tick(ts) {
      if (!vidOn || !wrap.isConnected) { stopVid(); return; }
      if (lastTs) S.t += Math.min(.1, (ts - lastTs) / 1000);
      lastTs = ts;
      const end = read().trackEnd;
      if (S.t >= end - 1 / 30) { S.t = Math.max(0, end - 1 / 30); vidOn = false; }
      drawStage(); if (TL && TL.setTime) TL.setTime(S.t); setTimeLabel();
      if (vidOn) raf = requestAnimationFrame(tick);
    }
    function playVid() {
      if (!hasClips() || S.loading) return;
      if (vidOn) { stopVid(); return; }
      const R = read();
      if (S.t >= R.trackEnd - 0.1) S.t = 0;
      if (S.hint) { S.hint = false; drawTray(R); }
      vidOn = true; lastTs = 0; setTimeLabel(); raf = requestAnimationFrame(tick);
    }
    function stopVid() { if (!vidOn) return; vidOn = false; cancelAnimationFrame(raf); setTimeLabel(); drawStage(); }
    function afterEdit(res, pulse) {
      const R = read();
      if (S.sel && !R.units[S.sel]) S.sel = null;
      S.t = Math.max(0, Math.min(S.t, Math.max(0, R.trackEnd - 1 / 30)));
      drawEditor({ pulse });
      if (res && res.say) say(res.say);
      drawSide();
    }
    function clipTool(id) {
      stopVid();
      const R = read(); if (!S.sel || !R.isMain(S.sel)) return;
      const i = R.idx[S.sel];
      if (id === 'delete') { const res = S.ed.run('deleteClip', { id: S.sel }); if (!res.ok) return showLine(res.say); S.sel = null; afterEdit(res); return; }
      if (id === 'earlier' || id === 'later') {
        const res = S.ed.run('reorder', { id: S.sel, to: id === 'earlier' ? i - 1 : i + 2 });
        if (!res.ok) return showLine(res.say);
        const R2 = read(); say('Clip ' + (i + 1) + ' moved to ' + (R2.idx[S.sel] + 1) + ' of ' + R2.main.length);
        afterEdit(null, S.sel); return;
      }
      if (id === 'duplicate') { const res = S.ed.run('duplicate', { id: S.sel }); if (!res.ok) return showLine(res.say); afterEdit(res, res.newId); return; }
      const t = CLIP_TOOLS.find(x => x.id === id);
      toast((t ? t.label : 'That') + ' opens its own panel here. Try it on V3.');
    }
    function split() {
      if (!hasClips() || S.loading) return;
      stopVid();
      const R = read();
      let e = S.sel && R.isMain(S.sel) ? R.entry(S.sel) : null;
      if (!e || !(S.t > e.start && S.t < e.end)) e = R.mainAt(S.t);
      if (!e || e.slot) return showLine('Move the line onto a clip first');
      const res = S.ed.run('split', { id: e.id, t: S.t });
      if (!res.ok) return showLine(res.say);
      S.hint = false;
      afterEdit(res, res.newId);
    }
    function projectTool(id) {
      userTouch();
      if (S.step < 3 && !S.branch) return;
      if (S.loading) return;
      if (S.hint && hasClips()) { S.hint = false; drawTray(read()); }
      if (id === 'clips') { hand(); if (!S.ed) S.ed = E.editor(emptyDoc()); if (S.sheet === 'clips') closeSheet(); else openSheet(); return; }
      const t = PROJECT_TOOLS.find(x => x.id === id);
      toast((t ? t.label : 'That') + ' is tried out on V3.');
    }
    f.on('play', () => { userTouch(); playVid(); });
    f.on('split', () => { userTouch(); split(); });
    function undoNow() { stopVid(); if (!S.ed || !S.ed.canUndo()) return; if (lastToast) lastToast.hide(); const lab = S.ed.undo(); if (lab) say('Undid ' + lab); afterEdit(null); }
    function redoNow() { stopVid(); if (!S.ed || !S.ed.canRedo()) return; if (lastToast) lastToast.hide(); const lab = S.ed.redo(); if (lab) say('Redid ' + lab); afterEdit(null); }
    f.on('undo', () => { userTouch(); hand(); undoNow(); });
    f.on('redo', () => { userTouch(); hand(); redoNow(); });
    f.on('toStart', () => { userTouch(); stopVid(); if (!hasClips()) return; S.t = 0; drawStage(); if (TL && TL.setTime) TL.setTime(0); setTimeLabel(); });
    f.on('toEnd', () => { userTouch(); stopVid(); if (!hasClips()) return; S.t = Math.max(0, read().trackEnd - 1 / 30); drawStage(); if (TL && TL.setTime) TL.setTime(S.t); setTimeLabel(); });
    f.on('more', () => { userTouch(); if (hasClips()) toast('⋯ has Sort by date taken and Close all gaps'); });
    f.on('settings', () => { userTouch(); if (S.step >= 3 || S.branch) toast('The switch to Full is in this ⚙ cog: page V1 tries it'); });
    ['fit', 'back', 'help', 'notes', 'export'].forEach(a => f.on(a, () => { userTouch(); if (S.step >= 3 || S.branch) toast('Not part of this page'); }));
    f.root.addEventListener('pointerdown', ev => { if (!ev.isTrusted) return; stopPlay(); if (demo && demo === gen) { gen++; demo = 0; } });

    /* ---- the overlays' own controls ---- */
    q(home, '.v2-plus').addEventListener('click', () => { userTouch(); if (S.step === 0) next(); });
    dlg.querySelectorAll('.v2-asp').forEach(b => b.addEventListener('click', () => { userTouch(); S.aspect = +b.dataset.a; drawDialog(); }));
    q(dlg, '.v2-dcancel').addEventListener('click', () => { userTouch(); goStep(0, { anim: false }); });
    q(dlg, '.v2-create').addEventListener('click', () => { userTouch(); if (S.step === 1) next(); });
    pick.querySelectorAll('.v2-ptile').forEach(b => b.addEventListener('click', () => {
      hand();                                             // stop the demo picking if it is still going
      const more = S.picker === 'photos', set = pickSet(), id = b.dataset.id;
      if (!more) S.pickTouched = true;
      if (set.has(id)) { set.delete(id); S.popId = null; } else { set.add(id); S.popId = id; }
      drawPicker(); if (!more) drawSide();
    }));
    q(pick, '.v2-add').addEventListener('click', () => {
      userTouch();
      if (S.picker === 'photos') { if (S.morePick.size) { hand(); commitMore(gen); } return; }
      if (S.step === 2 && S.picked.size) next();
    });
    q(pick, '.v2-pcancel').addEventListener('click', () => {
      userTouch();
      if (S.picker === 'photos') { hand(); S.picker = null; S.sheet = null; S.pickAt = null; overlays(); drawEditor(); return; }
      S.branch = 'cancel'; goStep(2, { anim: true });
    });
    files.querySelectorAll('.v2-frow').forEach(b => b.addEventListener('click', () => {
      hand();
      const id = b.dataset.id;
      if (S.filesPick.has(id)) { S.filesPick.delete(id); S.popId = null; } else { S.filesPick.add(id); S.popId = id; }
      drawFiles();
    }));
    q(files, '.v2-fopen').addEventListener('click', () => { userTouch(); if (!S.filesPick.size) return; hand(); loadMixed(gen, true); });
    q(files, '.v2-fcancel').addEventListener('click', () => {         // closed with nothing picked: the empty editor, + Add clips
      hand(); S.phase = 'empty'; S.ed = E.editor(emptyDoc()); S.t = 0; overlays(); drawEditor();
    });
    q(csheet, '.v2-cs-x').addEventListener('click', () => { hand(); closeSheet(); });
    q(csheet, '.v2-cs-add').addEventListener('click', () => { hand(); sheetAdd(); });
    csheet.querySelectorAll('.v2-cs-where button').forEach(b => b.addEventListener('click', () => { hand(); S.whereMode = b.dataset.w; drawSheet(); }));

    /* ---- the hub controls ---- */
    H.next.addEventListener('click', () => { stopPlay(); next(); });
    H.back.addEventListener('click', () => { stopPlay(); back(); });
    H.play.addEventListener('click', () => { play(); });
    H.replay.addEventListener('click', () => { stopPlay(); if (S.branch) { S.branch = null; } goStep(S.step, { anim: true }); });
    const jump = i => { stopPlay(); const wasBranch = !!S.branch; S.branch = null; if (i === S.step && !wasBranch) return; goStep(i, { anim: i > S.step }); };
    H.list.addEventListener('click', e => { const b = e.target.closest('.v2-li'); if (b) jump(+b.dataset.i); });
    H.segs.addEventListener('click', e => { const b = e.target.closest('.v2-seg'); if (b) jump(+b.dataset.i); });
    document.addEventListener('keydown', e => {
      if (!wrap.isConnected || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const a = document.activeElement;
      if (a && a !== document.body && !wrap.contains(a)) return;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
      if (a && a.closest && a.closest('.fm-tl-scroll, .v2-trayscroll')) return;   // those rows scroll with the arrows
      e.preventDefault(); stopPlay();
      if (e.key === 'ArrowRight') next(); else back();
    });

    goStep(0, { anim: false, first: true });
  }

  VIS.register('v2', {
    title: 'The first ten seconds',
    group: 'Try it',
    blurb: 'What someone who has never edited sees first: New project, pick four clips, they land end to end, one tap shows what a clip can do, then more clips and a song.',
    mount
  });
})();
