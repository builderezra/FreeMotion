/* V3 · Quick on a phone.
 *
 * A playable Beach day in Quick at phone size, run on VIS.engine (DESIGN §3 ripple, §4 attachments, §8.2 phone):
 * trim either edge (the rest closes up while the finger moves), delete, split, hold-drag to reorder, speed;
 * titles and stickers ride with the clip they start on (the link line), Stay put, captions shifting line by line,
 * a gap block with Close gap, Undo / Redo, and the "Deleted clip and 2 things on it · Undo" line in the tray row (§3.12).
 *
 * Plain JS, no libraries. The page's own styles are injected once, scoped to .v3, so index.html needs no extra link.
 * Nothing is saved except which "Try this" steps have been ticked (localStorage, per viewer).
 */
(function () {
  'use strict';
  const VIS = window.VIS;
  if (!VIS || !VIS.engine || !VIS.register) return;
  const E = VIS.engine, el = VIS.el, esc = VIS.esc;
  // One rounding for every number on the page. The engine gives 1.85 for Waves at 2× but 1.8499999 for the clips after it,
  // and rounding each straight to tenths printed "1.9s shorter" beside "1.8s earlier" (QA 29 Sep).
  const fmt = t => VIS.fmt(Math.round(t * 1000) / 1000);
  const PPS = 20, FPS = 30, HOLD_MS = 350;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const touchFirst = () => !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
  const now = () => (window.performance ? performance.now() : Date.now());
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const f1 = n => Math.round(n * 10) / 10;
  const nice = sp => String(Math.round(sp * 100) / 100);
  const mmss = d => Math.floor(d / 60) + ':' + String(Math.round(d % 60)).padStart(2, '0');
  const nm = l => !l ? 'it' : (l.type === 'text' && !Array.isArray(l.captions)) ? '“' + (l.text || l.name) + '”' : (l.name || l.id);
  const layerOf = (doc, id) => doc.layers.find(l => l.id === id);
  const ico = d => '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';

  /* icons the kit may not have, on its 24px grid with its 1.8 stroke; the kit's own icon wins when it has one */
  const LOCAL_ICONS = {
    length: '<path d="M3.5 5v14M20.5 5v14M7 12h10M10 9l-3 3 3 3M14 9l3 3-3 3"/>',
    earlier: '<rect x="12" y="6" width="8.5" height="12" rx="2"/><path d="M8.5 9l-3.5 3 3.5 3M5 12h5"/>',
    later: '<rect x="3.5" y="6" width="8.5" height="12" rx="2"/><path d="M15.5 9l3.5 3-3.5 3M19 12h-5"/>',
    replace: '<path d="M4.5 10a7.5 7.5 0 0 1 13-3.5L19 8M19.5 14a7.5 7.5 0 0 1-13 3.5L5 16"/><path d="M19 3.8V8h-4.2M5 20.2V16h4.2"/>',
    reverse: '<path d="M19.5 8H6M9 5L6 8l3 3M4.5 16H18M15 13l3 3-3 3"/>',
    soundout: '<path d="M3 12h1.5M6.5 8.5v7M10 5.5v13M13.5 9v6"/><path d="M16.5 12h5M19 9.5l2.5 2.5-2.5 2.5"/>',
    editwords: '<path d="M4 6h11M9.5 6v12M18 7v11M16 7h4M16 18h4"/>',
    style: '<path d="M3.5 18l4.5-12 4.5 12M5.2 13.5h5.6"/><circle cx="17.5" cy="15" r="3"/><path d="M20.5 11.5V18"/>',
    animate: '<path d="M10 7l8 5-8 5z"/><path d="M3 9h3.5M2.5 12h4M3 15h3.5"/>',
    blend: '<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',
    removecolour: '<path d="M12.5 8.5l3 3-7.5 7.5H5v-3z"/><path d="M15.5 4.5a2.1 2.1 0 0 1 3 3l-2.5 2.5-3-3z"/>',
    forward: '<rect x="3.5" y="10" width="10" height="10" rx="2"/><rect x="10.5" y="4" width="10" height="10" rx="2" fill="currentColor" fill-opacity=".28"/>',
    backward: '<rect x="10.5" y="4" width="10" height="10" rx="2"/><rect x="3.5" y="10" width="10" height="10" rx="2" fill="currentColor" fill-opacity=".28"/>',
    fade: '<path d="M3 18h4L17 6h4"/><path d="M3 21h18" opacity=".45"/>',
    voice: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    endswith: '<path d="M3 12h12.5M11.5 8l4 4-4 4"/><path d="M20 5v14"/>',
    findspeech: '<path d="M3 12h1.5M6 9v6M9 6.5v11M12 9.5v5"/><circle cx="17" cy="12.5" r="3.5"/><path d="M19.6 15.1L22 17.5"/>',
    editlines: '<path d="M4 7h11M4 12h8M4 17h5"/><path d="M13 19.5l.8-3.3 5.7-5.7 2.5 2.5-5.7 5.7z"/>',
    strength: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    change: '<path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5"/>'
  };
  const MISSING = VIS.icon('\u0000none');
  const icon = n => { const k = VIS.icon(n); return (k === MISSING && LOCAL_ICONS[n]) ? ico(LOCAL_ICONS[n]) : k; };
  // our own strings only: escaped first, then {undo} {redo} {split} become the round icons the phone's play bar really shows
  const TOKEN = { undo: 'Undo', redo: 'Redo', split: 'Split' };
  const rich = s => esc(s).replace(/\{(\w+)\}/g, (m, k) => TOKEN[k] ? '<span class="v3-ii" role="img" aria-label="' + TOKEN[k] + '">' + VIS.icon(k) + '</span>' : m);

  /* ---------------------------------- the trays (DESIGN §8.5, left to right; 🗑 pinned at the right end) ---------------------------------- */
  const CLIP_TOOLS = [
    { id: 'speed', label: 'Speed', icon: 'speed' }, { id: 'volume', label: 'Volume', icon: 'sound' },
    { id: 'lift', label: 'Lift off', icon: 'lift', title: 'Lift off (make it an overlay)' }, { id: 'look', label: 'Look', icon: 'look' },
    { id: 'crop', label: 'Crop', icon: 'crop' }, { id: 'length', label: 'Length', icon: 'length' },
    { id: 'earlier', label: 'Move earlier', icon: 'earlier' }, { id: 'later', label: 'Move later', icon: 'later' },
    { id: 'effects', label: 'Effects', icon: 'effects' }, { id: 'replace', label: 'Replace', icon: 'replace' },
    { id: 'duplicate', label: 'Duplicate', icon: 'duplicate' }, { id: 'reverse', label: 'Reverse', icon: 'reverse' },
    { id: 'soundout', label: 'Take sound out', icon: 'soundout' }
  ];
  // the kit's tray, when it is the §8.5 one, so the same tap shows the same row as on the other pages
  function clipTools() {
    const k = (VIS.CLIP_TRAY || []).filter(t => t.id !== 'delete');
    const same = ['speed', 'volume', 'lift', 'look', 'crop', 'length', 'earlier', 'later'].every((id, i) => k[i] && k[i].id === id);
    return same ? k.map(t => Object.assign({}, t, { id: t.id === 'duplicateClip' ? 'duplicate' : t.id })) : CLIP_TOOLS;
  }
  const TEXT_TOOLS = [
    { id: 'editwords', label: 'Edit words', icon: 'editwords' }, { id: 'style', label: 'Style', icon: 'style' },
    { id: 'animate', label: 'Animate', icon: 'animate' }, { id: 'effects', label: 'Effects', icon: 'effects' },
    { id: 'copy', label: 'Duplicate', icon: 'duplicate' }, { id: 'stay', label: 'Stay put', icon: 'pin' }
  ];
  const OVERLAY_TOOLS = [
    { id: 'into', label: 'Into row', icon: 'drop', title: 'Put in the clip row' }, { id: 'blend', label: 'Blend', icon: 'blend' },
    { id: 'volume', label: 'Volume', icon: 'sound', video: true }, { id: 'look', label: 'Look', icon: 'look' },
    { id: 'ovspeed', label: 'Speed', icon: 'speed', video: true }, { id: 'effects', label: 'Effects', icon: 'effects' },
    { id: 'removecolour', label: 'Remove a colour', icon: 'removecolour' }, { id: 'crop', label: 'Crop', icon: 'crop' },
    { id: 'forward', label: 'Forward', icon: 'forward' }, { id: 'backward', label: 'Back', icon: 'backward' },
    { id: 'stay', label: 'Stay put', icon: 'pin' }
  ];
  const CAPTION_TOOLS = [
    { id: 'editlines', label: 'Edit lines', icon: 'editlines' }, { id: 'capstyle', label: 'Style', icon: 'style' },
    { id: 'findspeech', label: 'Find speech', icon: 'findspeech' }
  ];
  const SOUND_TOOLS = [
    { id: 'volume', label: 'Volume', icon: 'sound' }, { id: 'fade', label: 'Fade', icon: 'fade' },
    { id: 'endswith', label: 'Ends with the video', icon: 'endswith' }, { id: 'sndspeed', label: 'Speed', icon: 'speed' },
    { id: 'voice', label: 'Voice', icon: 'voice' }, { id: 'stay', label: 'Stay put', icon: 'pin' }
  ];
  const SEGMENT_TOOLS = [
    { id: 'change', label: 'Change effect', icon: 'change' }, { id: 'strength', label: 'Strength', icon: 'strength' },
    { id: 'stay', label: 'Stay put', icon: 'pin' }
  ];
  // tools this page does not draw: where they are drawn instead (V4 has the Volume, Look and Crop panels)
  const ELSEWHERE = { volume: 'v4', look: 'v4', crop: 'v4' };
  const PAGE_NAME = { v4: 'Phone and PC' };

  /* ---------------------------------- effects (DESIGN §8.5c) ----------------------------------
     seg: can be a whole-picture effect at the line (the colour, blur and grade kind). The others only go on a clip or an
     item, so from the project row they carry "Pick a clip first". not: the kinds of item that cannot take it. */
  const n3 = v => (+v).toFixed(3);
  const FX = [
    { id: 'warm', name: 'Warm', seg: true, f: a => 'sepia(' + n3(0.35 * a) + ') saturate(' + n3(1 + 0.5 * a) + ') hue-rotate(' + n3(-8 * a) + 'deg)' },
    { id: 'cool', name: 'Cool', seg: true, f: a => 'hue-rotate(' + n3(22 * a) + 'deg) saturate(' + n3(1 + 0.2 * a) + ') brightness(' + n3(1 + 0.04 * a) + ')' },
    { id: 'vivid', name: 'Vivid', seg: true, f: a => 'saturate(' + n3(1 + 0.9 * a) + ') contrast(' + n3(1 + 0.12 * a) + ')' },
    { id: 'faded', name: 'Faded', seg: true, f: a => 'contrast(' + n3(1 - 0.28 * a) + ') brightness(' + n3(1 + 0.1 * a) + ') saturate(' + n3(1 - 0.4 * a) + ')' },
    { id: 'bw', name: 'Black & white', seg: true, f: a => 'grayscale(' + n3(a) + ') contrast(' + n3(1 + 0.15 * a) + ')' },
    { id: 'blur', name: 'Blur', seg: true, not: ['text'], f: (a, H) => 'blur(' + n3((H || 190) * 0.014 * a) + 'px)' },
    { id: 'shake', name: 'Shake', m: (a, lt) => 'translate(' + n3(Math.sin(lt * 53) * 2.4 * a) + '%, ' + n3(Math.cos(lt * 41) * 1.8 * a) + '%) rotate(' + n3(Math.sin(lt * 29) * 1.3 * a) + 'deg) scale(' + n3(1 + 0.07 * a) + ')' },
    { id: 'zoom', name: 'Zoom in', m: (a, lt, len) => 'scale(' + n3(1 + 0.2 * a * clamp(lt / Math.max(0.1, len || 1), 0, 1)) + ')' },
    { id: 'pulse', name: 'Pulse', m: (a, lt) => 'scale(' + n3(1 + 0.06 * a * (0.5 + 0.5 * Math.sin(lt * 7))) + ')' }
  ];
  const FXBY = {}; FX.forEach(x => { FXBY[x.id] = x; });
  function fxStyle(l, time, H) {
    const fl = [], tr = [];
    (l && l.fx || []).forEach(i => {
      const x = FXBY[i.id]; if (!x) return;
      const a = i.amt == null ? 1 : i.amt;
      if (x.f) fl.push(x.f(a, H));
      if (x.m) tr.push(x.m(a, time - l.start, l.duration));
    });
    return { filter: fl.join(' '), transform: tr.join(' ') };
  }
  const fxNames = l => (l && l.fx || []).map(i => FXBY[i.id] && FXBY[i.id].name).filter(Boolean).join(' + ');

  /* the clips the Add clips sheet offers (drawn like the phone's own picker) */
  const MEDIA = [
    { name: 'Rock pools', duration: 3, srcDur: 8, look: ['#8fb8c9', '#35505e'] },
    { name: 'Big waves', duration: 2.5, srcDur: 6, look: ['#5fd3e6', '#1f6fa3'] },
    { name: 'Castle close-up', duration: 2, srcDur: 5, look: ['#f3d27a', '#c98b4b'] },
    { name: 'Sunset glow', duration: 3, srcDur: 7, look: ['#ff9966', '#3d2a5c'] }
  ];

  /* ---------------------------------- the project ---------------------------------- */
  // Beach day (the kit's sample) plus a second thing on Waves, so deleting Waves takes two things with it.
  function beachDoc() {
    const d = VIS.sample('beach');
    const k = d.layers.findIndex(l => l.id === 'sticker');
    d.layers.splice(k + 1, 0, { id: 'shades', type: 'image', name: 'Sunglasses', start: 5.0, duration: 1.8,
      transform: { scale: 0.34, x: 0.3, y: 0.62 }, look: ['#3a3f4a', '#15181e'],
      kf: { scale: [{ t: 5.0, v: 0.22 }, { t: 5.3, v: 0.34 }] } });
    return d;
  }

  /* ---------------------------------- the footage (drawn) ----------------------------------
     Each clip is a small scene drawn as a function of SOURCE time, so a head trim really shows other footage,
     a split continues where the first half stopped, and 2× makes the waves roll twice as fast. */
  function wavePath(y, amp, ph, k) { let d = ''; for (let x = -6; x <= 96; x += 6) d += (x === -6 ? 'M' : 'L') + x + ' ' + f1(y + Math.sin(x / k + ph) * amp); return d; }
  const SCENES = {
    arriving(s) {
      const cl = f1(((s * 4) % 130) - 25), ph = (s * 0.9) % 1;
      let planks = '';
      for (let k = 0; k < 9; k++) { const p = (k + ph) / 9, y = 74 + 86 * p * p, hw = 2 + 15 * (y - 74) / 86; planks += '<path d="M' + f1(45 - hw) + ' ' + f1(y) + 'H' + f1(45 + hw) + '" stroke="#a9834f" stroke-width="' + f1(0.4 + 1.6 * p) + '"/>'; }
      return '<rect width="90" height="76" fill="url(#v3g-arr-sky)"/>' +
        '<g fill="#fff" opacity=".85"><ellipse cx="' + cl + '" cy="22" rx="11" ry="4"/><ellipse cx="' + f1(cl + 7) + '" cy="19" rx="7" ry="4"/></g>' +
        '<rect y="62" width="90" height="10" fill="#63c6d8"/>' +
        '<path d="M0 72 Q22 60 46 70 T90 66 V160 H0Z" fill="url(#v3g-arr-dune)"/>' +
        '<path d="M0 96 Q26 82 56 96 T90 92 V160 H0Z" fill="#6aa684" opacity=".75"/>' +
        '<path d="M28 160 L43 74 H47 L62 160Z" fill="#dcbc88"/>' + planks +
        '<g stroke="#4f8a64" stroke-width="1.2" stroke-linecap="round" fill="none"><path d="M12 118 l-3 -9 M14 118 l1 -10 M16 118 l4 -8"/><path d="M74 132 l-3 -9 M76 132 l1 -10 M78 132 l4 -8"/></g>';
    },
    waves(s) {
      let w = '';
      for (let j = 0; j < 6; j++) w += '<path d="' + wavePath(72 + j * 15, 1.1 + j * 0.45, s * 1.7 + j * 1.3, 8 + j) + '" fill="none" stroke="#fff" stroke-opacity="' + f1(0.3 + j * 0.07) + '" stroke-width="' + f1(0.8 + j * 0.3) + '"/>';
      const fy = f1(144 + Math.sin(s * 1.3) * 5), gx = f1(14 + (s * 5) % 62);
      return '<rect width="90" height="66" fill="url(#v3g-wav-sky)"/><circle cx="70" cy="22" r="8" fill="#fff7cf"/>' +
        '<rect y="64" width="90" height="96" fill="url(#v3g-wav-sea)"/>' + w +
        '<path d="M0 ' + fy + ' Q22 ' + f1(fy - 6) + ' 45 ' + fy + ' T90 ' + fy + ' V160 H0Z" fill="#f4fbfc" opacity=".9"/>' +
        '<path d="M' + gx + ' 34 q3 -3 6 0 q3 -3 6 0" fill="none" stroke="#2f4858" stroke-width="1.2" stroke-linecap="round"/>';
    },
    castle(s) {
      const fl = f1(Math.sin(s * 5) * 1.6);
      return '<rect width="90" height="50" fill="url(#v3g-san-sky)"/><rect y="48" width="90" height="14" fill="#5bbdd4"/>' +
        '<path d="M0 60 Q22 57 45 60 T90 59" stroke="#fff" stroke-width="1.2" fill="none" opacity=".8"/>' +
        '<rect y="60" width="90" height="100" fill="url(#v3g-san-sand)"/>' +
        '<g fill="#d8a653"><rect x="22" y="84" width="12" height="44"/><rect x="56" y="84" width="12" height="44"/>' +
        '<rect x="22" y="80" width="3" height="5"/><rect x="26.5" y="80" width="3" height="5"/><rect x="31" y="80" width="3" height="5"/>' +
        '<rect x="56" y="80" width="3" height="5"/><rect x="60.5" y="80" width="3" height="5"/><rect x="65" y="80" width="3" height="5"/></g>' +
        '<rect x="30" y="98" width="30" height="30" fill="#e6bb6c"/><rect x="38" y="88" width="14" height="12" fill="#e9c274"/>' +
        '<path d="M40 128 V118 a5 5 0 0 1 10 0 V128Z" fill="#9b6d33"/>' +
        '<path d="M62 84 V62" stroke="#7a5a2e" stroke-width="1"/><path d="M62 62 L72 ' + f1(64.5 + fl) + ' L62 67Z" fill="#ff5f5f"/>' +
        '<path d="M8 128 H22 L20 146 H10Z" fill="#4fa3ff"/><path d="M8 129 Q15 118 22 129" fill="none" stroke="#2f6fb8" stroke-width="1"/>' +
        '<g fill="#b98a45" opacity=".45"><ellipse cx="74" cy="142" rx="2.5" ry="4"/><ellipse cx="80" cy="152" rx="2.5" ry="4"/></g>';
    },
    sunset(s) {
      const sy = f1(80 + s * 2.4), vis = clamp((114 - sy) / 26, 0, 1), bx = f1(12 + s * 4);
      let refl = '';
      for (let i = 0; i < 6; i++) { const w = 22 - i * 3; refl += '<rect x="' + f1(45 - w / 2) + '" y="' + (111 + i * 7) + '" width="' + w + '" height="1.6" rx=".8" fill="#ffc27a" opacity="' + f1((0.75 - i * 0.1) * vis) + '"/>'; }
      return '<rect width="90" height="110" fill="url(#v3g-sun-sky)"/>' +
        '<circle cx="45" cy="' + sy + '" r="26" fill="url(#v3g-glow)"/><circle cx="45" cy="' + sy + '" r="12" fill="#ffd98a"/>' +
        '<rect y="108" width="90" height="52" fill="url(#v3g-sun-sea)"/>' + refl +
        '<path d="M0 104 Q14 96 30 106 L30 108 H0Z" fill="#2a1f3d"/>' +
        '<path d="M' + bx + ' 40 q2.5 -2.5 5 0 q2.5 -2.5 5 0 M' + f1(+bx + 14) + ' 48 q2 -2 4 0 q2 -2 4 0" fill="none" stroke="#2a1f3d" stroke-width="1" stroke-linecap="round"/>';
    },
    rocks(s) {
      const r1 = (s * 7) % 16, r2 = (s * 7 + 8) % 16;
      return '<rect width="90" height="48" fill="url(#v3g-rock-sky)"/><rect y="46" width="90" height="14" fill="#6fb3c7"/>' +
        '<rect y="58" width="90" height="102" fill="#7d9098"/>' +
        '<g fill="#5f727b"><ellipse cx="14" cy="70" rx="18" ry="8"/><ellipse cx="78" cy="84" rx="16" ry="9"/><ellipse cx="20" cy="146" rx="22" ry="10"/></g>' +
        '<ellipse cx="34" cy="104" rx="22" ry="10" fill="#5fc0d8"/><ellipse cx="62" cy="134" rx="18" ry="8" fill="#58b6cf"/>' +
        '<ellipse cx="34" cy="104" rx="' + f1(r1) + '" ry="' + f1(r1 * 0.45) + '" fill="none" stroke="#fff" stroke-opacity="' + f1(1 - r1 / 16) + '"/>' +
        '<ellipse cx="62" cy="134" rx="' + f1(r2 * 0.8) + '" ry="' + f1(r2 * 0.36) + '" fill="none" stroke="#fff" stroke-opacity="' + f1(1 - r2 / 16) + '"/>' +
        '<path d="M66 96 l2 5 5 .4 -4 3.3 1.3 5 -4.3 -2.8 -4.3 2.8 1.3 -5 -4 -3.3 5 -.4z" fill="#ff8a4c"/>';
    }
  };
  function sceneOf(l) {
    const n = String(l && l.name || '').toLowerCase();
    return /arriv/.test(n) ? 'arriving' : /wave/.test(n) ? 'waves' : /sand|castle/.test(n) ? 'castle' : /sunset/.test(n) ? 'sunset' : /rock|pool/.test(n) ? 'rocks' : null;
  }
  function art(l, s) {
    const k = sceneOf(l);
    const a = (l.look && l.look[0]) || '#557', b = (l.look && l.look[1]) || '#223';
    const body = k ? SCENES[k](Math.max(0, s)) : '<rect width="90" height="160" fill="' + esc(a) + '"/><rect y="80" width="90" height="80" fill="' + esc(b) + '" opacity=".7"/>';
    return '<svg viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + body + '</svg>';
  }
  const STICKERS = {
    shell: '<svg viewBox="0 0 40 36" aria-hidden="true"><path d="M20 34 L3 15 Q20 -6 37 15Z" fill="url(#v3g-shell)" stroke="#e0785f" stroke-width="1"/><path d="M20 34 L8 9 M20 34 L14 4.5 M20 34 L20 3 M20 34 L26 4.5 M20 34 L32 9" stroke="#e0785f" stroke-width=".9" opacity=".8"/><rect x="16" y="30" width="8" height="5" rx="2" fill="#f2a58f"/></svg>',
    shades: '<svg viewBox="0 0 64 24" aria-hidden="true"><path d="M4 5 H28 Q29 17 20 19 H11 Q3 18 4 5Z M36 5 H60 Q61 18 53 19 H44 Q35 17 36 5Z" fill="#161a21"/><path d="M28 7 Q32 4 36 7" fill="none" stroke="#161a21" stroke-width="2.5"/><path d="M8 8 L14 8 M40 8 L46 8" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  const stickerOf = l => /glass|shade/i.test(l.name || '') ? STICKERS.shades : STICKERS.shell;

  function defsEl() {
    const g = (id, stops) => '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' + stops.map((c, i) => '<stop offset="' + (i / (stops.length - 1)) + '" stop-color="' + c + '"/>').join('') + '</linearGradient>';
    const box = document.createElement('div');
    box.innerHTML = '<svg aria-hidden="true" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden;left:0;top:0"><defs>' +
      g('v3g-arr-sky', ['#bfe8f0', '#eef8f1']) + g('v3g-arr-dune', ['#9ad1a8', '#5f9e84']) +
      g('v3g-wav-sky', ['#9fe3f2', '#e2f7fa']) + g('v3g-wav-sea', ['#5fd3e6', '#1f6fa3']) +
      g('v3g-san-sky', ['#a9dcf0', '#e3f3f8']) + g('v3g-san-sand', ['#f3d27a', '#c98b4b']) +
      g('v3g-sun-sky', ['#3d2a5c', '#8e4a7a', '#ff9966', '#ffcf8a']) + g('v3g-sun-sea', ['#3a4a78', '#1c2748']) +
      g('v3g-rock-sky', ['#bfe3ee', '#e6f3f6']) + g('v3g-shell', ['#ffe2b8', '#ff9a8b']) +
      '<radialGradient id="v3g-glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>' +
      '</defs></svg>';
    return box.firstChild;
  }

  /* ---------------------------------- what moved (plain words) ---------------------------------- */
  function capDiff(l, x) {
    const abs = L => (L.captions || []).filter(q => q.end > 0 && q.start < L.duration).map(q => ({ text: q.text, s: L.start + q.start, e: L.start + q.end }));
    const B = abs(l), A = abs(x), used = new Set(), shifts = [];
    let moved = 0, shorter = 0, longer = 0, gone = 0;
    B.forEach(q => {
      let j = -1;
      A.forEach((p, i) => { if (j < 0 && !used.has(i) && p.text === q.text) j = i; });
      if (j < 0) { gone++; return; }
      used.add(j);
      const p = A[j], d = p.s - q.s, dl = (p.e - p.s) - (q.e - q.s);
      if (Math.abs(d) > 0.004) { moved++; shifts.push(d); }
      if (dl < -0.004) shorter++; else if (dl > 0.004) longer++;
    });
    const bTexts = new Set(B.map(q => q.text)), extra = A.filter((p, i) => !used.has(i));
    const added = extra.filter(p => bTexts.has(p.text)).length, back = extra.length - added, parts = [];
    const st0 = E.hasFlag(l, 'stay'), st1 = E.hasFlag(x, 'stay');
    if (st0 !== st1) parts.push(st1 ? 'now stay with the sound' : 'follow the clips again');
    if (moved) {
      const same = shifts.every(v => Math.abs(v - shifts[0]) < 0.01);
      parts.push(moved + (moved === 1 ? ' line ' : ' lines ') + (same ? fmt(Math.abs(shifts[0])) + (shifts[0] < 0 ? ' earlier' : ' later') : 'moved'));
    }
    if (shorter) parts.push(shorter + ' shorter');
    if (longer) parts.push(longer + ' longer');
    if (gone) parts.push(gone + (gone === 1 ? ' line went' : ' lines went') + ' with the clip');
    if (added) parts.push(added + (added === 1 ? ' line' : ' lines') + ' cut in two');
    if (back) parts.push(back + (back === 1 ? ' line' : ' lines') + ' back');
    return parts.join(' · ');
  }
  function describe(b, a, undoing) {
    const Bm = new Map(b.layers.map(l => [l.id, l])), Am = new Map(a.layers.map(l => [l.id, l]));
    const Rb = E.classify(b), Ra = E.classify(a);
    const kindIn = (R, id) => R.isMain(id) ? 'clip' : (R.units[id] && R.units[id].section) || 'x';
    const splitParent = new Map(), splitChild = new Set();
    a.layers.forEach(x => {
      if (Bm.has(x.id) || !x.splitOf) return;
      const p = b.layers.find(q => Am.has(q.id) && Math.abs(q.start + q.duration - (x.start + x.duration)) < 1e-3 &&
        Math.abs(Am.get(q.id).start + Am.get(q.id).duration - x.start) < 1e-3);
      if (p) { splitParent.set(p.id, x.id); splitChild.add(x.id); }
    });
    const out = [], stayed = [];
    b.layers.forEach(l => {
      const x = Am.get(l.id), k = kindIn(Rb, l.id);
      if (!x) {
        const h = Rb.units[l.id] && Rb.units[l.id].host;
        out.push({ kind: 'gone', name: nm(l), note: h && !Am.has(h) ? 'went with its clip' : 'deleted', ord: 9, at: l.start });
        return;
      }
      if (Array.isArray(l.captions)) { const c = capDiff(l, x); if (c) out.push({ kind: 'captions', name: 'Captions', note: c, ord: 5, at: 0 }); return; }
      if (splitParent.has(l.id)) { out.push({ kind: 'clip', name: nm(x), note: 'split in two at ' + fmt(x.start + x.duration), ord: 1, at: x.start }); return; }
      const ka = kindIn(Ra, x.id), parts = [];
      const ds = x.start - l.start, dd = x.duration - l.duration, s0 = l.speed || 1, s1 = x.speed || 1;
      if (k === 'clip' && ka !== 'clip') parts.push('lifted off the clip row');
      if (k !== 'clip' && ka === 'clip') parts.push('put in the clip row');
      if (Math.abs(s1 - s0) > 1e-6) parts.push('now ' + nice(s1) + '×');
      if (Math.abs(ds) > 0.004) parts.push(fmt(Math.abs(ds)) + (ds < 0 ? ' earlier' : ' later'));
      if (Math.abs(dd) > 0.004) parts.push(fmt(Math.abs(dd)) + (dd < 0 ? ' shorter' : ' longer'));
      if (l.type === 'adjustment') {
        const f0 = (l.fx || [])[0] || {}, f1 = (x.fx || [])[0] || {};
        if (f0.id !== f1.id) parts.push('was ' + ((FXBY[f0.id] || {}).name || 'another effect'));
        else if ((f0.amt == null ? 1 : f0.amt) !== (f1.amt == null ? 1 : f1.amt)) parts.push('strength now ' + Math.round(100 * (f1.amt == null ? 1 : f1.amt)) + '%');
      } else if (fxNames(l) !== fxNames(x)) parts.push(fxNames(x) ? 'now has ' + fxNames(x) : 'effect taken off');
      const st0 = E.hasFlag(l, 'stay'), st1 = E.hasFlag(x, 'stay');
      if (st0 !== st1 && k !== 'clip') parts.push(st1 ? 'set to Stay put' : 'goes with its clip again');
      if (!parts.length) {
        if (st1 && k !== 'clip' && k !== 'audio') stayed.push({ kind: ka, name: nm(x), note: 'stayed put', ord: 6, at: x.start });
        return;
      }
      let note = parts.join(' · ');
      if (k === 'audio' && Math.abs(ds) < 0.004 && Math.abs(dd) > 0.004 && E.hasFlag(x, 'tail')) note = 'stays put · still ends with the video, now at ' + fmt(x.start + x.duration);
      else if (ka !== 'clip' && k !== 'clip' && Math.abs(ds) > 0.004) {
        const h = Ra.units[x.id] && Ra.units[x.id].host, hl = h && Am.get(h);
        if (hl) note += ' · with ' + nm(hl);
      }
      out.push({ kind: ka, name: nm(x), note, ord: ka === 'clip' ? 1 : ka === 'audio' ? 8 : 3, at: x.start });
    });
    a.layers.forEach(x => {
      if (Bm.has(x.id)) return;
      const ka = kindIn(Ra, x.id), twin = b.layers.some(q => q.name === x.name);
      let note = undoing ? 'back' : splitChild.has(x.id) ? 'the new second half' : twin ? 'a new copy' : 'new';
      const h = ka !== 'clip' && Ra.units[x.id] && Ra.units[x.id].host, hl = h && Am.get(h);
      if (hl && !undoing) note += ' · rides on ' + nm(hl);
      out.push({ kind: ka, name: nm(x), note, ord: 2, at: x.start });
    });
    if (out.length) out.push(...stayed);
    out.sort((p, q) => p.ord - q.ord || p.at - q.at);
    return out;
  }

  /* ---------------------------------- styles (scoped to .v3) ---------------------------------- */
  const CSS = `
.v3 { display: block; }
.v3-grid { display: grid; gap: 18px; align-items: start; }
@media (min-width: 900px) { .v3-grid { grid-template-columns: 394px minmax(0, 1fr); gap: 28px; } }
.v3-phonecol, .v3-side { display: grid; gap: 14px; min-width: 0; }
.v3-phone { min-width: 0; }
.v3-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

.v3 .fm-time svg { width: 10px; height: 10px; display: inline-block; margin-right: 3px; vertical-align: -1px; }
.v3 .fm-tile { -webkit-touch-callout: none; transition: transform .3s ease; }
.v3 .fm-tile.v3-arming { transform: scale(.95); }
.v3 .fm-tile .grip { touch-action: none; width: 16px; }
/* The trim tabs: 16 px to see, 40 px to hit (QA: an 11 px tab let a finger a few px off scroll the timeline instead).
   The hit area reaches 12 px into the clip and 12 px past the tab; onDown also takes a press just inside either edge. */
.v3 .fm-tile .grip.l { left: -16px; }
.v3 .fm-tile .grip.r { right: -16px; }
.v3 .fm-tile .grip::before { top: -8px; bottom: -8px; left: -12px; right: -12px; }
.v3 .v3-fxb { position: absolute; right: 4px; top: 4px; width: 17px; height: 17px; border-radius: 5px; background: rgba(0,0,0,.6); color: #ff9ab9; display: grid; place-items: center; z-index: 2; pointer-events: none; }
.v3 .v3-fxb .ico { width: 12px; height: 12px; }
.v3 .v3-caret { position: absolute; width: 0; border-left: 2px solid #5ac7ed; z-index: 8; pointer-events: none; box-shadow: 0 0 6px rgba(90,199,237,.8); }
.v3 .v3-caret b { position: absolute; top: 0; left: -10px; width: 18px; height: 18px; border-radius: 50%; background: #5ac7ed; color: #06222c; display: grid; place-items: center; box-shadow: 0 1px 4px rgba(0,0,0,.5); }
.v3 .v3-caret b .ico { width: 13px; height: 13px; stroke-width: 2.6; }
.v3 .fm-tile .film { overflow: hidden; }
.v3 .fm-tile.sel .film { border-radius: 6px; }
.v3 .v3-fr { position: absolute; top: 0; bottom: 0; width: 34px; overflow: hidden; }
.v3 .v3-fr svg, .v3 .v3-full svg { display: block; width: 100%; height: 100%; }
.v3 .fm-tile.v3-hole { opacity: .32; border-style: dashed; border-color: rgba(255,255,255,.8); box-shadow: none; }
.v3 .fm-tile.v3-hole .lbl, .v3 .fm-tile.v3-hole .len, .v3 .fm-tile.v3-hole .grip { visibility: hidden; }
.v3 .fm-tile.v3-ghost { z-index: 2; transform: scale(1.06) rotate(-1.5deg); box-shadow: 0 14px 28px rgba(0,0,0,.6), 0 0 0 2px #fff; pointer-events: none; }
.v3 .fm-tile.v3-ghost .grip { display: none; }
.v3-ov { position: absolute; inset: 0; pointer-events: none; z-index: 30; overflow: hidden; }
.v3-bubble { position: absolute; transform: translate(-50%, -100%); background: #fff; color: #0b1419; font-weight: 800; font-size: 11.5px; line-height: 1; padding: 6px 8px; border-radius: 8px; white-space: nowrap; box-shadow: 0 6px 16px rgba(0,0,0,.45); font-variant-numeric: tabular-nums; }
.v3-bubble small { font-size: 10.5px; font-weight: 700; color: #1f6f8f; margin-left: 5px; }
.v3-bubble em { display: block; font-style: normal; font-size: 10px; color: #a4561a; margin-top: 3px; font-weight: 700; }
.v3-bubble::after { content: ""; position: absolute; left: 50%; bottom: -5px; margin-left: -5px; border: 5px solid transparent; border-bottom: 0; border-top-color: #fff; }
.v3 .fm-item.v3-rider { box-shadow: 0 0 0 1.5px rgba(255,255,255,.8); }
.v3 .fm-mark.v3-rider-mark { box-shadow: 0 0 0 1.5px #fff; z-index: 2; }
.v3 .v3-flash { animation: v3-flash .9s ease-out 1; }
@keyframes v3-flash { 0% { box-shadow: 0 0 0 3px #5ac7ed, 0 0 18px rgba(90,199,237,.8); } 100% { box-shadow: 0 0 0 0 rgba(90,199,237,0); } }
.v3 .v3-pulse { animation: v3-pulse 1.1s ease-in-out 3; z-index: 9; }
@keyframes v3-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(90,199,237,0); } 50% { box-shadow: 0 0 0 6px rgba(90,199,237,.9); } }
@media (prefers-reduced-motion: reduce) {
  .v3 .v3-pulse { animation: none; box-shadow: 0 0 0 3px #5ac7ed !important; }
  .v3 .v3-flash { animation: none; }
}

.v3 .v3-full { overflow: hidden; }
.v3 .v3-stk { position: absolute; transform: translate(-50%, -50%); filter: drop-shadow(0 2px 3px rgba(0,0,0,.45)); }
.v3 .v3-stk svg { display: block; width: 100%; height: auto; }
.v3 .fm-canvas .v3-on { outline: 1.5px dashed #5ac7ed; outline-offset: 3px; }

.v3 .fm-tray { padding: 0 4px 0 6px; }
.v3-trayrow { display: flex; align-items: center; gap: 2px; width: 100%; height: 100%; min-width: 0; }
.v3-toolswrap { position: relative; flex: 1 1 auto; min-width: 0; height: 100%; display: flex; }
.v3-tools { display: flex; align-items: center; gap: 2px; flex: 1 1 auto; min-width: 0; overflow-x: auto; scrollbar-width: none; height: 100%; }
.v3-tools::-webkit-scrollbar { display: none; }
.v3-toolswrap.more-r .v3-tools { -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 30px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 30px), transparent); }
.v3-toolswrap.more-l .v3-tools { -webkit-mask-image: linear-gradient(90deg, transparent, #000 30px); mask-image: linear-gradient(90deg, transparent, #000 30px); }
.v3-toolswrap.more-l.more-r .v3-tools { -webkit-mask-image: linear-gradient(90deg, transparent, #000 30px, #000 calc(100% - 30px), transparent); mask-image: linear-gradient(90deg, transparent, #000 30px, #000 calc(100% - 30px), transparent); }
.v3-arw { display: none; position: absolute; top: 50%; transform: translateY(-50%); width: 26px; height: 40px; border: 0; border-radius: 9px; background: rgba(28,36,44,.95); color: var(--text); z-index: 2; cursor: pointer; place-items: center; padding: 0; box-shadow: 0 2px 8px rgba(0,0,0,.5); }
.v3-arw .ico { width: 16px; height: 16px; }
.v3-arw.l { left: 0; } .v3-arw.r { right: 0; }
@media (hover: hover) { .v3-toolswrap.more-l .v3-arw.l, .v3-toolswrap.more-r .v3-arw.r { display: grid; } }
.v3 .v3-tools .fm-tool { flex: 0 0 auto; min-width: 46px; padding: 3px 5px; }
.v3 .v3-tools .fm-tool[aria-pressed="true"] { color: var(--accent); background: var(--accent-soft); }
.v3 .v3-tools .fm-tool[aria-pressed="true"] .ico { color: var(--accent); }
.v3-chipinfo { flex: 0 0 auto; max-width: 108px; padding: 0 6px 0 4px; font-size: 11.5px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v3-chipinfo b { color: var(--text); font-weight: 600; }
.v3 .v3-tools .v3-seg { margin: 0 4px; }
.v3-ii, .v3 .v3-step span.v3-ii, .v3 .v3-foot span.v3-ii { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; background: #13202a; color: #eaf0f8; vertical-align: -6px; margin: 0 1px; }
.v3-ii .ico { width: 15px; height: 15px; }
.v3 .fm-tray .v3-ii { width: 20px; height: 20px; vertical-align: -5px; background: rgba(255,255,255,.08); }
.v3 .fm-tool.v3-bin { flex: 0 0 52px; min-width: 52px; }
.v3 .fm-tool.v3-bin .ico { color: #ff8a95; }
.v3-info { flex: 0 1 auto; min-width: 0; padding: 0 8px 0 4px; color: var(--text-dim); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v3-info b { color: var(--text); font-weight: 600; }
.v3-info.wrap { white-space: normal; line-height: 1.3; flex: 1 1 auto; }
.v3-msg { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 4px; padding-left: 9px; border-left: 3px solid var(--accent); height: 36px; }
.v3-msg.warn { border-left-color: var(--warn); }
.v3-msg .t { flex: 0 1 auto; min-width: 0; font-size: 12.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 4px; }
.v3-msg button { flex: none; border: 0; cursor: pointer; font-weight: 700; font-size: 12.5px; }
.v3-msg .act { min-width: 44px; min-height: 32px; padding: 0 10px; border-radius: 8px; background: var(--accent-soft); color: var(--accent); }
.v3-msg .act[aria-disabled="true"] { opacity: .45; cursor: default; }
.v3-msg .x { width: 32px; height: 32px; border-radius: 8px; background: transparent; color: var(--text-dim); display: grid; place-items: center; }
.v3-msg .x .ico { width: 16px; height: 16px; }
.v3-binslot { flex: 0 0 56px; }
.v3-seg { display: inline-flex; flex: none; padding: 2px; border-radius: 10px; background: rgba(255,255,255,.06); gap: 2px; }
.v3-seg button { border: 0; background: transparent; color: var(--text-dim); font-size: 11.5px; font-weight: 600; padding: 0 9px; min-height: 36px; border-radius: 8px; cursor: pointer; }
.v3-seg button[aria-pressed="true"] { background: var(--accent-soft); color: var(--accent); }

.v3-sheet { position: absolute; left: 0; right: 0; bottom: 0; z-index: 25; background: var(--panel-2); border-top: 1px solid var(--line); border-radius: 14px 14px 0 0; padding: 10px 12px 12px; display: grid; gap: 8px; box-shadow: 0 -12px 28px rgba(0,0,0,.45); animation: v3-rise .2s cubic-bezier(.2,.8,.2,1); }
@keyframes v3-rise { from { transform: translateY(16px); opacity: 0; } }
.v3-sheet-h { display: flex; align-items: center; gap: 8px; min-height: 32px; }
.v3-sheet-h b { font-size: 14px; }
.v3-sp-now { color: var(--accent); font-weight: 800; font-variant-numeric: tabular-nums; }
.v3-sp-len { color: var(--text-dim); font-size: 12px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v3-sp-len.warn { color: var(--warn); }
.v3-done { border: 1px solid var(--glass-rim); background: var(--accent-soft); color: var(--accent); font-weight: 700; border-radius: 9px; min-height: 32px; padding: 0 14px; cursor: pointer; }
.v3-presets { display: flex; gap: 6px; }
.v3-presets button { flex: 1 1 0; min-width: 0; min-height: 36px; border-radius: 9px; border: 1px solid var(--line); background: var(--panel); color: var(--text); font-weight: 700; cursor: pointer; font-variant-numeric: tabular-nums; }
.v3-presets button[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.v3-range { width: 100%; margin: 0; height: 28px; accent-color: #5ac7ed; }
.v3-close { flex: none; width: 34px; height: 34px; border: 0; border-radius: 9px; background: transparent; color: var(--text-dim); display: grid; place-items: center; cursor: pointer; padding: 0; }
.v3-close .ico { width: 17px; height: 17px; }
.v3-sheet-h .v3-grow { flex: 1; }
.v3-note { margin: 0; font-size: 12px; line-height: 1.3; color: var(--text-dim); min-height: 16px; }
.v3-note.warn { color: var(--warn); }
.v3-media { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.v3-fxgrid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 7px 6px; }
.v3-mt { position: relative; border: 0; padding: 0; background: transparent; color: var(--text); cursor: pointer; display: grid; gap: 4px; font: inherit; text-align: left; min-width: 0; -webkit-tap-highlight-color: transparent; }
.v3-mt .pv { position: relative; height: 58px; border-radius: 8px; overflow: hidden; box-shadow: 0 0 0 1px var(--line); background: #000; }
.v3-fxgrid .v3-mt .pv { height: 50px; }
.v3-mt .pv > svg, .v3-mt .pv .in > svg { width: 100%; height: 100%; display: block; }
.v3-mt .pv .in { position: absolute; inset: 0; }
.v3-mt .d { position: absolute; right: 4px; bottom: 4px; font-size: 9.5px; font-weight: 700; background: rgba(0,0,0,.55); color: #fff; padding: 1px 4px; border-radius: 4px; font-variant-numeric: tabular-nums; }
.v3-mt .n { font-size: 10.5px; line-height: 1.15; color: var(--text-dim); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; min-height: 2.3em; }
.v3-media .v3-mt .n { min-height: 0; -webkit-line-clamp: 1; white-space: nowrap; display: block; text-overflow: ellipsis; }
.v3-mt .k { position: absolute; left: 4px; top: 4px; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #fff; background: rgba(0,0,0,.25); font-size: 11px; font-weight: 800; display: grid; place-items: center; color: #fff; }
.v3-mt[aria-pressed="true"] .pv { box-shadow: 0 0 0 2px var(--accent); }
.v3-mt[aria-pressed="true"] .k { background: var(--accent); border-color: var(--accent); color: #06222c; }
.v3-mt[aria-pressed="true"] .n { color: var(--accent); }
.v3-mt .mi { position: absolute; left: 4px; top: 4px; width: 18px; height: 18px; border-radius: 5px; background: rgba(0,0,0,.55); color: #fff; display: grid; place-items: center; }
.v3-mt .mi .ico { width: 12px; height: 12px; }
.v3-mt .no { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; padding: 3px; font-size: 9.5px; font-weight: 700; line-height: 1.15; color: #fff; background: rgba(8,12,16,.66); }
.v3-mt[aria-disabled="true"] .n { opacity: .55; }
.v3-mt .pv .in span svg { width: 100%; height: auto; display: block; }
.v3-mt.m-shake .in { animation: v3-jig .6s linear infinite; }
@keyframes v3-jig { 0%, 100% { transform: translate(0, 0) scale(1.08); } 25% { transform: translate(-3%, 2%) rotate(-1.6deg) scale(1.08); } 50% { transform: translate(2.5%, -2%) rotate(1deg) scale(1.08); } 75% { transform: translate(-2%, -1.5%) rotate(1.4deg) scale(1.08); } }
.v3-mt.m-zoom .in { animation: v3-zm 1.6s ease-in-out infinite alternate; }
@keyframes v3-zm { to { transform: scale(1.22); } }
.v3-mt.m-pulse .in { animation: v3-pl .8s ease-in-out infinite alternate; }
@keyframes v3-pl { to { transform: scale(1.07); } }
@media (prefers-reduced-motion: reduce) { .v3-mt .in { animation: none !important; } }
@media (hover: hover) { .v3-mt:hover .pv { box-shadow: 0 0 0 2px rgba(255,255,255,.55); } .v3-mt[aria-pressed="true"]:hover .pv { box-shadow: 0 0 0 2px var(--accent); } }
.v3-sheet-f { display: flex; align-items: center; gap: 8px; min-height: 38px; }
.v3-go { margin-left: auto; min-height: 38px; padding: 0 16px; border-radius: 10px; border: 0; background: #5ac7ed; color: #06222c; font-weight: 800; font-size: 13px; cursor: pointer; white-space: nowrap; }
.v3-go[disabled] { opacity: .4; cursor: default; }
.v3-len { display: flex; align-items: center; justify-content: center; gap: 8px; }
.v3-len .st { width: 52px; height: 42px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel); color: var(--text); font-size: 22px; font-weight: 700; cursor: pointer; touch-action: manipulation; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
.v3-len .st:active { background: var(--accent-soft); border-color: var(--accent); }
.v3-len input { width: 92px; height: 42px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel); color: var(--text); font: 700 16px/1 inherit; text-align: center; font-variant-numeric: tabular-nums; }
.v3-len .u { color: var(--text-dim); font-size: 13px; margin-left: -4px; }

.v3-cmp { position: absolute; inset: 0; z-index: 12; background: rgba(12,17,22,.95); display: grid; grid-template-rows: auto 1fr; animation: v3-fade .15s ease-out; }
@keyframes v3-fade { from { opacity: 0; } }
.v3-cmp-h { padding: 10px 12px 0; font-size: 12.5px; line-height: 1.3; color: var(--text-dim); }
.v3-cmp-h b { color: var(--text); }
.v3-cmp-sc { overflow-x: auto; overflow-y: hidden; scrollbar-width: none; display: flex; align-items: center; }
.v3-cmp-sc::-webkit-scrollbar { display: none; }
.v3-cmp-row { position: relative; height: 76px; flex: none; }
.v3-sq { position: absolute; top: 10px; border-radius: 8px; overflow: hidden; box-shadow: 0 0 0 1px rgba(255,255,255,.28), 0 2px 6px rgba(0,0,0,.4); transition: left .16s cubic-bezier(.2,.8,.2,1); background: #000; }
.v3-sq svg { width: 100%; height: 100%; display: block; }
.v3-sq-hole { position: absolute; top: 10px; border-radius: 8px; border: 1.5px dashed rgba(255,255,255,.6); transition: left .16s cubic-bezier(.2,.8,.2,1); }
.v3-sq.ghost { z-index: 31; transform: scale(1.14); box-shadow: 0 12px 26px rgba(0,0,0,.6), 0 0 0 2px #fff; transition: none; pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .v3-sq, .v3-sq-hole { transition: none; } .v3-cmp { animation: none; } }

.v3-moved, .v3-try, .v3-rules { display: grid; gap: 10px; align-content: start; }
.v3 .v3-eyebrow { margin: 0; font-family: var(--h-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--h-muted); }
.v3 h3 { margin: 0; font-family: var(--h-display); font-size: 19px; line-height: 1.2; }
.v3-moved ul, .v3-rules ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
.v3-moved li { display: grid; grid-template-columns: 12px minmax(0, 1fr); gap: 9px; align-items: baseline; font-size: 15px; line-height: 1.35; }
.v3-moved li i { width: 10px; height: 10px; border-radius: 3px; display: block; transform: translateY(1px); }
.v3-moved li span { min-width: 0; overflow-wrap: anywhere; }
.v3-moved li em { font-style: normal; color: var(--h-muted); }
.v3-muted { margin: 0; color: var(--h-muted); font-size: 15px; }
.v3-tryhead { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.v3-count { font-family: var(--h-mono); font-size: 12px; color: var(--h-muted); white-space: nowrap; }
.v3-bar { height: 6px; border-radius: 3px; background: var(--h-surface-2); overflow: hidden; }
.v3-bar i { display: block; height: 100%; background: var(--h-good); transition: width .3s; }
.v3-steps { list-style: none; margin: 0; padding: 0; }
.v3-step { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 0; border-top: 1px solid var(--h-rule); }
.v3-step:first-child { border-top: 0; padding-top: 2px; }
.v3-tick { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--h-rule); display: grid; place-items: center; color: #fff; }
.v3-tick .ico { width: 14px; height: 14px; opacity: 0; }
.v3-step.done .v3-tick { background: var(--h-good); border-color: var(--h-good); }
.v3-step.done .v3-tick .ico { opacity: 1; }
.v3-step b { display: block; font-size: 15.5px; }
.v3-step span { display: block; font-size: 14px; color: var(--h-muted); line-height: 1.4; }
.v3-step .h-btn { min-height: 40px; padding: 8px 12px; font-size: 14px; white-space: nowrap; }
.v3-rules li { font-size: 15px; line-height: 1.4; padding-left: 16px; position: relative; }
.v3-rules li::before { content: ""; position: absolute; left: 2px; top: .55em; width: 6px; height: 6px; border-radius: 50%; background: var(--h-accent); }
.v3-foot { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.v3 .fm-canvas .v3-fxw { position: absolute; inset: 0; }
.v3-opt { display: grid; gap: 12px; align-content: start; }
.v3-opt .h-seg { justify-self: start; }
.v3-opt p { margin: 0; font-size: 15px; line-height: 1.45; }
.v3-opt .v3-muted { font-size: 14px; }
.v3-optpic { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.v3-optpic button { font: inherit; text-align: left; color: inherit; margin: 0; display: grid; gap: 7px; align-content: start; padding: 10px; border-radius: 12px; border: 1.5px solid var(--h-rule); background: var(--h-surface); cursor: pointer; min-width: 0; -webkit-tap-highlight-color: transparent; }
.v3-optpic button[aria-pressed="true"] { border-color: var(--h-accent); background: var(--h-accent-soft); }
.v3-optpic .cap { font-size: 13.5px; line-height: 1.35; color: var(--h-muted); }
.v3-optpic .cap b { display: block; color: var(--h-ink); font-size: 15px; }
.v3-optpic .on { font-size: 12px; font-weight: 700; color: var(--h-accent); visibility: hidden; }
.v3-optpic button[aria-pressed="true"] .on { visibility: visible; }
.v3-optpic svg { width: 100%; height: auto; display: block; border-radius: 8px; }
`;

  /* ---------------------------------- the page ---------------------------------- */
  const STEPS = [
    { k: 'tail', t: 'Trim the end', d: 'Tap a clip, then drag the white tab on its right edge. Everything after it slides along as you drag.' },
    { k: 'head', t: 'Trim the start', d: 'Drag the white tab on the left edge. The clip keeps its place and the rest closes up.' },
    { k: 'move', t: 'Move a clip', d: 'Hold a clip for a moment, then drag it. With a mouse, just drag. What is on it goes with it.' },
    { k: 'split', t: 'Split', d: 'Put the line on a clip and tap {split} on the bar under the picture.' },
    { k: 'speed', t: 'Speed it up', d: 'Pick a clip, tap Speed, then 2×. It gets shorter and the rest closes up.' },
    { k: 'effects', t: 'Add an effect', d: 'Tap Effects at the bottom for a look over the picture at the line. For Shake, pick a clip first and use Effects in its row.' },
    { k: 'delete', t: 'Delete Waves', d: 'Its title and the sunglasses go with it, and the line under the clips says so.' },
    { k: 'undo', t: 'Undo', d: '{undo} on the bar under the picture puts it all back in one step. {redo} does it again.' },
    { k: 'stay', t: 'Stay put', d: 'Tap the title “Beach day!”, then Stay put. Now clips can move under it and it stays where it is.' },
    { k: 'gap', t: 'Close a gap', d: 'Full can leave a gap between clips. Make one, then tap the orange chip to close it.', btn: 'Make a gap' }
  ];
  const STEP_OF = { trimTail: 'tail', trimHead: 'head', split: 'split', reorder: 'move', speed: 'speed', deleteClip: 'delete', closeGap: 'gap' };
  const DOT = { clip: '#5ac7ed', gone: 'var(--h-warn)' };
  function loadSteps() { try { const v = JSON.parse(localStorage.getItem('vis.v3.steps') || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function saveSteps(d) { try { localStorage.setItem('vis.v3.steps', JSON.stringify(d)); } catch (e) { /* private window: ticks just are not remembered */ } }

  function mountV3(host) {
    const root = el('div', 'v3');
    const style = document.createElement('style'); style.textContent = CSS; root.appendChild(style);
    root.appendChild(defsEl());
    const grid = el('div', 'v3-grid'); root.appendChild(grid);
    const phoneCol = el('div', 'v3-phonecol'), side = el('aside', 'v3-side');
    grid.appendChild(phoneCol); grid.appendChild(side);
    const phoneHost = el('div', 'v3-phone'); phoneCol.appendChild(phoneHost);
    const movedCard = el('section', 'h-card v3-moved'); movedCard.setAttribute('aria-live', 'polite'); phoneCol.appendChild(movedCard);
    const tryCard = el('section', 'h-card v3-try'); side.appendChild(tryCard);
    const optCard = el('section', 'h-card v3-opt'); side.appendChild(optCard);
    const rulesCard = el('section', 'h-card v3-rules'); side.appendChild(rulesCard);
    host.appendChild(root);

    const f = VIS.phoneFrame(phoneHost, { name: 'Beach day', editor: 'quick', stageH: 214, tlH: 206, onTool: projectTool });
    const ov = el('div', 'v3-ov'); f.root.appendChild(ov);
    const live = el('div', 'v3-sr'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); f.root.appendChild(live);
    const tl = f.timeline;

    let ed = E.editor(beachDoc());
    let sel = null, t = 5.7, lastOpen = null, api = null, msg = null, msgTimer = 0, sheet = null, bubble = null;
    let playing = false, playRaf = 0, hinted = false, lastEdit = null, suppressUntil = 0, drag = null;
    const done = loadSteps();
    let reorderView = 'plain';     // the option card's pick (per viewer): 'plain' scrolls at the edge, 'compact' shrinks every clip
    try { if (localStorage.getItem('vis.v3.reorder') === 'compact') reorderView = 'compact'; } catch (e) { /* not remembered, fine */ }

    const dur = () => ed.doc.project.duration || 0;
    const read = () => E.classify(ed.doc);
    const ORDER = ['captions', 'text', 'overlay', 'effect', 'behind'];
    function openFor(R) {
      const u = sel && R.units[sel];
      if (u && !R.isMain(sel) && ORDER.includes(u.section)) return u.section;
      if (lastOpen && R.lanes[lastOpen] && R.lanes[lastOpen].length) return lastOpen;
      return null;
    }

    /* ---------- drawing ---------- */
    function drawAll(o) {
      o = o || {};
      const R = read();
      if (sel && !R.units[sel]) sel = null;
      t = clamp(t, 0, Math.max(0, dur() - 1 / FPS));
      drawTL(ed.doc, o);
      drawStage(ed.doc, t);
      renderTray();
      setPill();
      syncBar();
      (o.flash || []).forEach(id => flash(id));
      if (o.reveal) reveal(o.reveal);
    }
    function drawTL(doc, o) {
      o = o || {};
      const keep = api ? { x: api.scroller.scrollLeft, y: api.scroller.scrollTop } : null;
      const snap = o.animate && !reduced() ? snapshot() : null;
      const R = E.classify(doc);
      // the track always fills the phone's width, so the ruler never stops short of the edge
      api = VIS.drawQuick(tl, doc, { pxPerSec: PPS, time: t, selected: sel, open: openFor(R), maxLanes: 2, minSpan: Math.max(R.trackEnd + 1, 14.2),
        onTap, onScrub, onOpen, onSeam, onAdd: () => openAdd(false) });
      if (keep) { api.scroller.scrollLeft = keep.x; api.scroller.scrollTop = keep.y; }
      decorate(doc, api.R, o);
      if (snap) flip(snap);
      return api;
    }
    function decorate(doc, R, o) {
      api.items.forEach((n, id) => { n.dataset.k = id; n.dataset.id = id; });
      R.main.forEach(e => {
        if (e.slot) return;
        const n = api.items.get(e.id), l = R.layer(e.id), film = n && n.querySelector('.film');
        if (!film || !l) return;
        const len = e.end - e.start, count = Math.max(1, Math.ceil(len * PPS / 34));
        let h = '';
        for (let i = 0; i < count; i++) h += '<div class="v3-fr" style="left:' + (i * 34) + 'px">' + art(l, (l.trimStart || 0) + ((i * 34 + 17) / PPS) * (l.speed || 1)) + '</div>';
        film.innerHTML = h;
        if ((l.fx || []).length) n.insertAdjacentHTML('beforeend', '<span class="v3-fxb" title="' + esc(fxNames(l)) + '">' + VIS.icon('effects') + '</span>');
      });
      const seen = {};
      api.inner.querySelectorAll('.fm-cue').forEach(c => { const k = c.textContent; seen[k] = (seen[k] || 0) + 1; c.dataset.k = 'cue:' + k + ':' + seen[k]; });
      api.inner.querySelectorAll('.fm-gap').forEach(g => { const nx = g.nextElementSibling; g.dataset.k = 'gap:' + (nx && nx.dataset.id); g.dataset.next = nx && nx.dataset.id || ''; g.title = 'Gap'; g.style.cursor = 'pointer'; });
      api.inner.querySelectorAll('.fm-seam').forEach(s => { const pv = s.previousElementSibling; s.dataset.k = 'seam:' + (pv && pv.dataset.id); });
      const add = api.inner.querySelector('.fm-addclip'); if (add) add.dataset.k = 'add';
      if (api.playhead) api.playhead.dataset.k = 'ph';
      if (o.hole) { const h = api.items.get(o.hole); if (h) h.classList.add('v3-hole'); }
      const ir = api.inner.getBoundingClientRect(), s = ir.width / api.inner.offsetWidth || 1, cr = api.clipRow.getBoundingClientRect();
      // the last clip's end tab would sit on the + : move the + clear of it while that clip is picked
      const last = R.main[R.main.length - 1];
      if (add && last && sel === last.id && !o.hole) add.style.left = (parseFloat(add.style.left) + 22) + 'px';
      drawCaret();
      if (sel && R.isMain(sel) && !o.hole) {
        // the things that ride on the picked clip: outlined, each with its link line down to the clip. A folded
        // section's items are marks in the one strip; the kit draws them section by section, lane by lane, so the
        // same walk tells which mark is which (checked by count, else the marks are left alone).
        const present = ORDER.filter(x => R.lanes[x] && R.lanes[x].length);
        const open = openFor(R) || present[0] || null, markIds = [];
        present.filter(x => x !== open).forEach(x => R.lanes[x].forEach(ids => ids.forEach(id => markIds.push(id))));
        const marks = api.inner.querySelectorAll('.fm-folded .fm-mark');
        const markOf = id => (marks.length === markIds.length && markIds.indexOf(id) >= 0) ? marks[markIds.indexOf(id)] : null;
        (R.followers[sel] || []).forEach(fid => {
          const u = R.units[fid], n = api.items.get(fid) || markOf(fid);
          if (!n || !u || n.closest('.fm-soundrow')) return;
          n.classList.add(n.classList.contains('fm-mark') ? 'v3-rider-mark' : 'v3-rider');
          const r = n.getBoundingClientRect();
          VIS.linkLine(api.inner, api.xOf(u.start) + 1, (r.bottom - ir.top) / s, (cr.top - ir.top) / s + 4, VIS.SECTION_COLOR[u.section] || '#fff');
        });
      } else if (sel && R.units[sel] && R.units[sel].host) {
        const hn = api.items.get(R.units[sel].host);
        if (hn) hn.style.boxShadow = '0 0 0 2px ' + (VIS.SECTION_COLOR[R.units[sel].section] || '#fff');
      }
    }
    // Add clips' insertion caret (§8.5): at the seam the new clips will go into, while the sheet is open. Moved in place
    // rather than redrawn, so a drag along the ruler keeps its grip while the caret follows the line.
    function drawCaret() {
      if (!api) return;
      const old = api.inner.querySelector(':scope > .v3-caret'); if (old) old.remove();
      if (!sheet || sheet.caret == null) return;
      // from just under the ruler down through the clip row, so it still shows above the sheet
      const ir = api.inner.getBoundingClientRect(), s = ir.width / api.inner.offsetWidth || 1, cr = api.clipRow.getBoundingClientRect();
      const top = api.ruler ? (api.ruler.getBoundingClientRect().bottom - ir.top) / s + 2 : (cr.top - ir.top) / s - 6;
      const c = el('div', 'v3-caret', '<b>' + VIS.icon('add') + '</b>');
      c.style.left = (api.xOf(sheet.caret) - 1) + 'px'; c.style.top = top + 'px'; c.style.height = ((cr.bottom - ir.top) / s + 4 - top) + 'px';
      api.inner.appendChild(c);
    }
    function secOf(n) {
      const s = n.closest('.fm-sec'); if (s) return s.className;
      return n.closest('.fm-cliprow') ? 'clip' : n.closest('.fm-soundrow') ? 'sound' : 'x';
    }
    function snapshot() {
      const m = new Map(); if (!api) return m;
      const ir = api.inner.getBoundingClientRect(), s = ir.width / api.inner.offsetWidth || 1;
      api.inner.querySelectorAll('[data-k]').forEach(n => {
        const r = n.getBoundingClientRect();
        m.set(n.dataset.k, { n, l: parseFloat(n.style.left), w: parseFloat(n.style.width), sec: secOf(n),
          ghost: n.classList.contains('fm-tile') || n.classList.contains('fm-item') || n.classList.contains('fm-cue'),
          rx: (r.left - ir.left) / s, ry: (r.top - ir.top) / s, rw: r.width / s, rh: r.height / s });
      });
      return m;
    }
    function flip(snap) {
      const ease = { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' };
      api.inner.querySelectorAll('[data-k]').forEach(n => {
        const o = snap.get(n.dataset.k);
        if (!o) { if (n.dataset.k !== 'ph' && n.animate) n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 }); return; }
        o.used = true;
        if (o.sec !== secOf(n) || !n.animate) return;
        const nl = parseFloat(n.style.left), nw = parseFloat(n.style.width);
        const from = {}, to = {};
        if (!isNaN(o.l) && !isNaN(nl) && Math.abs(o.l - nl) > 0.5) { from.left = o.l + 'px'; to.left = nl + 'px'; }
        if (!isNaN(o.w) && !isNaN(nw) && Math.abs(o.w - nw) > 0.5) { from.width = o.w + 'px'; to.width = nw + 'px'; }
        if (Object.keys(from).length) n.animate([from, to], ease);
      });
      snap.forEach(o => {
        if (o.used || !o.ghost) return;
        const g = o.n;
        g.removeAttribute('data-k'); g.removeAttribute('data-id');
        g.classList.remove('sel', 'v3-rider', 'v3-flash', 'v3-pulse');
        Object.assign(g.style, { position: 'absolute', left: o.rx + 'px', top: o.ry + 'px', width: o.rw + 'px', height: o.rh + 'px', margin: '0', pointerEvents: 'none', zIndex: '7', boxShadow: 'none' });
        api.inner.appendChild(g);
        const a = g.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.82)' }], { duration: 260, easing: 'ease-in' });
        a.onfinish = () => g.remove();
      });
    }

    /* the picture: the footage at its source time, the title's fade, the stickers' pop, the caption line */
    function drawStage(doc, time) {
      const st = f.stage, P = doc.project;
      let cv = st.querySelector('.v3-cv');
      if (!cv) {
        st.innerHTML = '';
        cv = el('div', 'fm-canvas v3-cv');
        cv.style.aspectRatio = P.width + ' / ' + P.height; cv.style.height = '100%'; cv.style.maxWidth = '100%';
        st.appendChild(cv);
      }
      const H = cv.clientHeight || 190;
      // an item's own effects (Shake, Warm, …) as a filter and a transform on top of its own placement
      const sty = (l, base) => {
        const s = fxStyle(l, time, H), tr = [base, s.transform].filter(Boolean).join(' ');
        return (s.filter ? ';filter:' + s.filter : '') + (tr ? ';transform:' + tr : '');
      };
      let h = '';
      doc.layers.slice().reverse().forEach(l => {
        if (l.visible === false || l.audioOnly || l.type === 'camera' || l.type === 'group') return;
        if (!(time >= l.start - 1e-6 && time < l.start + l.duration - 1e-6)) return;
        if (l.type === 'adjustment') {      // an effect over the picture: it changes everything drawn below it
          const s = fxStyle(l, time, H);
          if (s.filter || s.transform) h = '<div class="v3-fxw" style="' + (s.filter ? 'filter:' + s.filter + ';' : '') + (s.transform ? 'transform:' + s.transform : '') + '">' + h + '</div>';
          return;
        }
        const kv = (p, d) => { const a = l.kf && l.kf[p]; return a && a.length ? E.valueAt(a, time) : d; };
        const op = clamp(kv('opacity', l.opacity == null ? 1 : l.opacity), 0, 1);
        const tr = l.transform || {}, on = sel === l.id ? ' v3-on' : '';
        if (l.type === 'text' && Array.isArray(l.captions)) {
          const q = l.captions.find(c => time - l.start >= c.start && time - l.start < c.end);
          if (q) h += '<div class="cv-cap" style="font-size:' + Math.max(8, H * 0.036).toFixed(1) + 'px"><span>' + esc(q.text) + '</span></div>';
        } else if (l.type === 'text') {
          h += '<div class="cv-text' + on + '" style="top:' + ((tr.y != null ? tr.y : 0.42) * 100) + '%;font-size:' + Math.max(9, H * 0.075).toFixed(1) + 'px;opacity:' + op.toFixed(3) + sty(l) + '">' + esc(l.text || l.name) + '</div>';
        } else if (tr.scale != null && tr.scale < 0.95) {
          const sc = kv('scale', tr.scale), x = (tr.x != null ? tr.x : 0.5) * 100, y = (tr.y != null ? tr.y : 0.5) * 100;
          if (l.type === 'image') h += '<div class="v3-stk' + on + '" style="left:' + x + '%;top:' + y + '%;width:' + (sc * 100).toFixed(2) + '%;opacity:' + op.toFixed(3) + sty(l, 'translate(-50%, -50%)') + '">' + stickerOf(l) + '</div>';
          else h += '<div class="cv-pip v3-full' + on + '" style="left:' + (x - sc * 50) + '%;top:' + (y - sc * 50) + '%;width:' + (sc * 100) + '%;height:' + (sc * 100) + '%' + sty(l) + '">' + art(l, (l.trimStart || 0) + (time - l.start) * (l.speed || 1)) + '</div>';
        } else {
          const sc = kv('scale', 1);
          h += '<div class="cv-layer v3-full" style="opacity:' + op.toFixed(3) + sty(l, Math.abs(sc - 1) > 1e-3 ? 'scale(' + sc.toFixed(4) + ')' : '') + '">' + art(l, (l.trimStart || 0) + (time - l.start) * (l.speed || 1)) + '</div>';
        }
      });
      cv.innerHTML = h;
    }
    function setPill() {
      f.time.innerHTML = VIS.icon(playing ? 'pause' : 'play') + ' ' + VIS.tc(t, FPS);
      f.time.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }
    function syncBar() {
      const u = f.playbar.querySelector('[data-act="undo"]'), r = f.playbar.querySelector('[data-act="redo"]');
      if (u) u.classList.toggle('dim', !ed.canUndo());
      if (r) r.classList.toggle('dim', !ed.canRedo());
    }
    function flash(id) { const n = api && api.items.get(id); if (n) flashNode(n); }
    function flashNode(n) { n.classList.remove('v3-flash'); void n.offsetWidth; n.classList.add('v3-flash'); setTimeout(() => n.classList.remove('v3-flash'), 950); }
    function pulse(n) { if (!n) return; n.classList.remove('v3-pulse'); void n.offsetWidth; n.classList.add('v3-pulse'); setTimeout(() => n.classList.remove('v3-pulse'), 3400); }
    function announce(text) { live.textContent = ''; live.textContent = text || ''; }
    function reveal(what) {
      const n = typeof what === 'string' ? api.items.get(what) : what; if (!n || !api) return;
      const sc = api.scroller, x = (parseFloat(n.style.left) || 0) + 36, w = parseFloat(n.style.width) || 30;
      if (x < sc.scrollLeft + 44 || x + w > sc.scrollLeft + sc.clientWidth - 8) {
        const left = Math.max(0, x - 36 - Math.max(16, (sc.clientWidth - 36 - w) / 2));
        if (sc.scrollTo) sc.scrollTo({ left, behavior: reduced() ? 'auto' : 'smooth' }); else sc.scrollLeft = left;
      }
    }
    function bringPhone() {
      const r = f.outer.getBoundingClientRect(), vh = window.innerHeight || 800;
      if (r.top < -8 || r.top > vh * 0.35) f.outer.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
    }

    /* ---------- the tray row (§8.2): the selection's tools, or a line with its buttons (§3.12) ---------- */
    let trayKey = null;
    function renderTray() {
      const tray = f.tray;
      // keep the row where it was and the pressed tool focused, so Move later can be pressed again at once (§3.12)
      const oldBox = tray.querySelector('.v3-tools'), keepX = oldBox && trayKey === sel ? oldBox.scrollLeft : 0;
      const ae = document.activeElement, keepTool = ae && tray.contains(ae) && ae.dataset ? ae.dataset.tool : null;
      tray.innerHTML = ''; trayKey = sel;
      const row = el('div', 'v3-trayrow'); tray.appendChild(row);
      if (msg) { renderMsg(row); return; }
      const R = read();
      if (!sel) {
        const n = R.main.filter(e => !e.slot).length;
        row.appendChild(el('div', 'v3-info' + (hinted ? '' : ' wrap'), hinted ? '<b>' + n + (n === 1 ? ' clip' : ' clips') + '</b> · ' + mmss(dur()) : rich('Tap a clip to change its speed or look · {split} splits it at the line')));
        return;
      }
      const u = R.units[sel]; if (!u) return;
      const l = u.lead, stay = E.hasFlag(l, 'stay');
      let list, lead = null, seg = null, bin = () => deleteItem(sel);
      const pin = t => t.id === 'stay' ? Object.assign({}, t, { pressed: stay }) : t;
      if (R.isMain(sel)) {
        const i = R.idx[sel], N = R.main.length;
        list = clipTools().map(t => Object.assign({}, t, {
          disabled: (t.id === 'earlier' && i === 0) || (t.id === 'later' && i >= N - 1),
          on: t.id === 'effects' && (l.fx || []).length > 0 }));
        bin = () => deleteClip(sel);
      } else if (u.kind === 'captions') {
        list = CAPTION_TOOLS;
        seg = el('div', 'v3-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Captions');
        [['follow', 'Follows the clips', !stay], ['stay', 'Stays with the sound', stay]].forEach(([k, lab, on]) => {
          const b = el('button', '', esc(lab)); b.type = 'button'; b.setAttribute('aria-pressed', String(on));
          b.addEventListener('click', () => { if (!on) act('stayPut', { id: sel, on: k === 'stay' }); });
          seg.appendChild(b);
        });
      } else if (u.section === 'audio') {
        list = SOUND_TOOLS.map(t => t.id === 'endswith' ? Object.assign({}, t, { pressed: E.hasFlag(l, 'tail') }) : pin(t));
      } else {
        const hl = u.host && R.layer(u.host);
        lead = hl ? 'Goes with <b>' + esc(nm(hl)) + '</b>' : stay ? '<b>Stays put</b> at ' + fmt(u.start) : 'Not on a clip';
        if (u.kind === 'effect') list = SEGMENT_TOOLS.map(pin);
        else if (u.kind === 'text') list = TEXT_TOOLS.map(t => t.id === 'effects' ? Object.assign({}, t, { on: (l.fx || []).length > 0 }) : pin(t));
        else list = OVERLAY_TOOLS.filter(t => !t.video || l.type === 'video').map(t => t.id === 'effects' ? Object.assign({}, t, { on: (l.fx || []).length > 0 }) : pin(t));
      }
      const sc = scroller(row), box = sc.box;
      if (lead) box.appendChild(el('span', 'v3-chipinfo', lead));
      list.forEach(t => {
        const b = el('button', 'fm-tool' + (t.on ? ' on' : ''), icon(t.icon) + '<span class="tl">' + esc(t.label) + '</span>');
        b.type = 'button'; b.dataset.tool = t.id; b.title = t.title || t.label; b.setAttribute('aria-label', t.title || t.label);
        if (t.pressed != null) b.setAttribute('aria-pressed', String(!!t.pressed));
        if (t.disabled) b.disabled = true;
        b.addEventListener('click', () => trayTool(t.id));
        box.appendChild(b);
      });
      if (seg) box.appendChild(seg);
      binBtn(row, bin);
      if (keepX) box.scrollLeft = keepX;
      if (keepTool) { const b = box.querySelector('[data-tool="' + keepTool + '"]:not([disabled])') || box.querySelector('.fm-tool:not([disabled])'); if (b) b.focus({ preventScroll: true }); }
      sc.update();
    }
    /* the tools row scrolls sideways: a fade shows there is more, and with a mouse the wheel and the ‹ › buttons move it */
    function scroller(row) {
      const wrap = el('div', 'v3-toolswrap'), box = el('div', 'v3-tools');
      const arrow = (cls, dir) => {
        const b = el('button', 'v3-arw ' + cls, VIS.icon('back')); b.type = 'button'; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true');
        if (dir > 0) b.firstElementChild.style.transform = 'scaleX(-1)';
        b.addEventListener('click', () => { const w = box.clientWidth * 0.7 * dir; if (box.scrollBy) box.scrollBy({ left: w, behavior: reduced() ? 'auto' : 'smooth' }); else box.scrollLeft += w; });
        return b;
      };
      wrap.appendChild(box); wrap.appendChild(arrow('l', -1)); wrap.appendChild(arrow('r', 1)); row.appendChild(wrap);
      const upd = () => { const max = box.scrollWidth - box.clientWidth; wrap.classList.toggle('more-l', box.scrollLeft > 2); wrap.classList.toggle('more-r', box.scrollLeft < max - 2); };
      box.addEventListener('scroll', upd, { passive: true });
      box.addEventListener('wheel', e => {
        const max = box.scrollWidth - box.clientWidth, d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : 0;
        if (max <= 0 || !d || (d < 0 && box.scrollLeft <= 0) || (d > 0 && box.scrollLeft >= max - 1)) return;
        e.preventDefault(); box.scrollLeft += d;
      }, { passive: false });
      return { box, update: () => { upd(); requestAnimationFrame(upd); } };
    }
    function showTool(name) {              // scroll a tray tool into view (the row scrolls sideways), then pulse it
      const b = f.tray.querySelector('[data-tool="' + name + '"]'); if (!b) return;
      const box = b.closest('.v3-tools');
      if (box && (b.offsetLeft < box.scrollLeft || b.offsetLeft + b.offsetWidth > box.scrollLeft + box.clientWidth)) box.scrollLeft = Math.max(0, b.offsetLeft - (box.clientWidth - b.offsetWidth) / 2);
      pulse(b);
    }
    function binBtn(row, fn) {
      const b = el('button', 'fm-tool v3-bin', VIS.icon('delete') + '<span class="tl">Delete</span>');
      b.type = 'button'; b.dataset.tool = 'delete'; b.title = 'Delete'; b.setAttribute('aria-label', 'Delete');
      b.addEventListener('click', fn); row.appendChild(b); return b;
    }
    function renderMsg(row) {
      const m = el('div', 'v3-msg' + (msg.warn ? ' warn' : ''));
      const tx = el('span', 't', esc(msg.text)); tx.title = msg.text; m.appendChild(tx);
      const wait = Math.max(0, 400 - (now() - msg.at));      // buttons never appear under a finger that is still tapping
      (msg.actions || []).slice(0, 2).forEach(a => {
        const b = el('button', 'act', esc(a.label)); b.type = 'button';
        if (wait) { b.setAttribute('aria-disabled', 'true'); setTimeout(() => b.removeAttribute('aria-disabled'), wait); }
        b.addEventListener('click', () => { if (b.getAttribute('aria-disabled') === 'true') return; clearMsg(false); a.run(); });
        m.appendChild(b);
      });
      const x = el('button', 'x', VIS.icon('close')); x.type = 'button'; x.title = 'Close'; x.setAttribute('aria-label', 'Close');
      x.addEventListener('click', () => clearMsg(true)); m.appendChild(x);
      row.appendChild(m);
      row.appendChild(el('div', 'v3-binslot'));           // the bin's place stays empty while a line shows
    }
    function say(text, actions, warn) {
      msg = { text, actions, warn: !!warn, at: now() };
      clearTimeout(msgTimer);
      const tick = () => {
        if (!msg) return;
        if (f.tray.matches(':hover') || f.tray.contains(document.activeElement)) { msgTimer = setTimeout(tick, 1500); return; }
        msg = null; renderTray();
      };
      msgTimer = setTimeout(tick, actions && actions.length ? 10000 : 4000);
      renderTray();
      announce(text);
    }
    function clearMsg(redraw) { msg = null; clearTimeout(msgTimer); if (redraw !== false) renderTray(); }

    /* ---------- edits: every one goes through the engine, one undo step each ---------- */
    function mark(k) { if (!k || done[k]) return; done[k] = true; saveSteps(done); renderTry(); }
    function act(name, args, o) {
      o = o || {};
      stopPlay();
      const before = ed.doc, res = ed.run(name, args);
      if (!res.ok) { say(res.say || 'That did not work', null, true); return res; }
      mark(name === 'stayPut' ? (args.on ? 'stay' : null) : STEP_OF[name]);
      afterEdit(before, res.label, res, o);
      return res;
    }
    function afterEdit(before, label, res, o) {
      o = o || {};
      if (res && res.time != null && isFinite(res.time)) t = res.time;
      if (o.pre) o.pre(res, o);
      lastEdit = { label, lines: describe(before, ed.doc) };
      msg = null; clearTimeout(msgTimer);
      drawAll({ animate: o.animate !== false, flash: o.flash, reveal: o.reveal });
      renderMoved();
      announce((res && res.say) || label);
    }
    function manual(label, fn, o) {       // an edit the engine has no command for (a Full-side trim, deleting a title, an effect)
      stopPlay(); if (!(o && o.keepSheet)) closeSheet();
      const before = ed.doc, json = JSON.stringify(before), d = JSON.parse(json);
      fn(d);
      ed.undoStack.push({ label, json }); ed.redoStack = []; ed.doc = d;
      afterEdit(before, label, { say: '' }, o || {});
    }
    function tryDoc(name, args) {
      try { const e2 = E.editor(ed.doc), r = e2.run(name, args); return r.ok ? e2.doc : null; } catch (err) { return null; }
    }
    function doUndo() {
      stopPlay(); closeSheet();
      const before = ed.doc, label = ed.undo();
      if (!label) { say('Nothing to undo'); return; }
      mark('undo');
      lastEdit = { label: 'Undo · ' + label, lines: describe(before, ed.doc, true) };
      msg = null; clearTimeout(msgTimer);
      drawAll({ animate: true }); renderMoved(); announce('Undid ' + label);
    }
    function doRedo() {
      stopPlay(); closeSheet();
      const before = ed.doc, label = ed.redo();
      if (!label) { say('Nothing to redo'); return; }
      lastEdit = { label: 'Redo · ' + label, lines: describe(before, ed.doc, true) };
      msg = null; clearTimeout(msgTimer);
      drawAll({ animate: true }); renderMoved(); announce('Redid ' + label);
    }
    function deleteClip(id) {
      const res = act('deleteClip', { id }, { pre: () => { sel = null; } });
      // §3.12: a line with Undo only when the delete took other things with it; a plain delete has ↶ on the bar
      if (res.ok && /thing/.test(res.say || '')) say(res.say, [{ label: 'Undo', run: doUndo }]);
    }
    function deleteItem(id) {
      const l = layerOf(ed.doc, id); if (!l) return;
      manual('Delete ' + nm(l), d => { d.layers = d.layers.filter(x => x.id !== id); }, { pre: () => { sel = null; } });
    }
    function trayTool(id) {
      const R = read(), u = sel && R.units[sel]; if (!u) return;
      const main = R.isMain(sel), i = R.idx[sel];
      if (id === 'speed' && main) openSpeed();
      else if (id === 'length' && main) openLength();
      else if (id === 'earlier' && main) act('reorder', { id: sel, to: i - 1 }, { flash: [sel], reveal: sel });
      else if (id === 'later' && main) act('reorder', { id: sel, to: i + 2 }, { flash: [sel], reveal: sel });
      else if (id === 'duplicate' && main) act('duplicate', { id: sel }, { pre: (res, o) => { o.flash = [res.newId]; } });
      else if (id === 'lift' && main) act('makeOverlay', { id: sel }, { flash: [sel] });
      else if (id === 'into') act('makeMain', { id: sel }, { flash: [sel] });
      else if (id === 'effects') openEffects(main ? 'clip' : u.kind === 'text' ? 'text' : 'overlay', sel);
      else if (id === 'change' && u.kind === 'effect') openEffects('change', sel);
      else if (id === 'strength' && u.kind === 'effect') openStrength();
      else if (id === 'stay') act('stayPut', { id: sel, on: !E.hasFlag(u.lead, 'stay') }, { flash: [sel] });
      else {
        const all = CLIP_TOOLS.concat(TEXT_TOOLS, OVERLAY_TOOLS, CAPTION_TOOLS, SOUND_TOOLS), t = all.find(x => x.id === id);
        notHere(t ? t.label : 'That', ELSEWHERE[id]);
      }
    }
    /* the page talking, not the app: a short note, like V1 and V2, for a button this page does not draw behind */
    let notAt = 0;
    function notHere(label, page) {
      const n = now(); if (n - notAt < 450) return; notAt = n;
      const where = page && PAGE_NAME[page] && VIS.open ? page : null;
      // over the bottom of the picture, never over the clips, so it cannot catch a tap meant for one
      const rr = f.root.getBoundingClientRect(), sr = f.stage.getBoundingClientRect(), s = f.scale || 1;
      VIS.toast(f.root, label + ' isn’t part of this page' + (where ? ' · see ' + PAGE_NAME[where] : ''),
        where ? { label: 'Show', run: () => VIS.open(where) } : null, { ms: where ? 4000 : 2400, bottom: Math.round((rr.bottom - sr.bottom) / s + 10) });
    }
    /* ---------- Add clips (§8.5): the + and the Clips tool open the same picker; nothing is added until Add ---------- */
    function insertIndexAt(R, time) {      // §3.6: the cut nearest the line; an exact tie goes after
      const N = R.main.length; if (!N) return 0;
      let best = 0, bd = Infinity;
      for (let k = 0; k <= N; k++) {
        const c = k === 0 ? R.main[0].start : k === N ? R.trackEnd : R.main[k].start, dd = Math.abs(c - time);
        if (dd <= bd + 1e-9) { bd = Math.min(bd, dd); best = k; }
      }
      return best;
    }
    function openAdd(fromTools) {
      stopPlay(); closeSheet(); clearMsg(false);
      const picks = []; let place = 'end';
      const sh = el('div', 'v3-sheet'); sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Add clips');
      sh.innerHTML = '<div class="v3-sheet-h"><b>Add clips</b><span class="v3-sp-len v3-grow">Pick one or more</span>' +
        '<button type="button" class="v3-close" aria-label="Cancel" title="Cancel">' + VIS.icon('close') + '</button></div>' +
        '<div class="v3-media" role="group" aria-label="Your videos"></div>' +
        '<div class="v3-sheet-f"><div class="v3-where"></div><button type="button" class="v3-go" disabled>Add</button></div>';
      const grid = sh.querySelector('.v3-media'), go = sh.querySelector('.v3-go'), where = sh.querySelector('.v3-where'), sub = sh.querySelector('.v3-sp-len');
      const tiles = MEDIA.map((m, k) => {
        const b = el('button', 'v3-mt', '<span class="pv">' + art(m, m.srcDur / 2) + '<span class="k"></span><span class="d">' + esc(fmt(m.duration)) + '</span></span><span class="n">' + esc(m.name) + '</span>');
        b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', m.name + ', ' + fmt(m.duration));
        b.addEventListener('click', () => { const j = picks.indexOf(k); if (j >= 0) picks.splice(j, 1); else picks.push(k); sync(); });
        grid.appendChild(b); return b;
      });
      function sync() {
        tiles.forEach((b, k) => { const j = picks.indexOf(k); b.setAttribute('aria-pressed', String(j >= 0)); b.querySelector('.k').textContent = j >= 0 ? String(j + 1) : ''; });
        go.disabled = !picks.length;
        go.textContent = picks.length > 1 ? 'Add ' + picks.length + ' clips' : 'Add';
        sub.textContent = picks.length ? picks.length + ' picked' : 'Pick one or more';
      }
      // the two-choice line only when the line is strictly inside the clips (§8.5); the + always adds at the end
      function placeLine() {
        if (!sheet || sheet.el !== sh) return;
        const R = read(), N = R.main.length;
        const inside = fromTools && N > 0 && t > R.main[0].start + 1e-6 && t < R.trackEnd - 1e-6;
        const j = inside ? insertIndexAt(R, t) : N;
        where.innerHTML = '';
        if (!inside || j >= N) {
          place = 'end'; sheet.at = null;
          where.appendChild(el('span', 'v3-note', 'They go at the end'));
          setCaret(N ? R.trackEnd : null);
          return;
        }
        const seg = el('div', 'v3-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Where they go');
        [['end', 'At the end'], ['at', j === 0 ? 'Before Clip 1' : 'After Clip ' + j]].forEach(([k, txt]) => {
          const b = el('button', '', esc(txt)); b.type = 'button'; b.setAttribute('aria-pressed', String(place === k));
          b.addEventListener('click', () => { place = k; placeLine(); });
          seg.appendChild(b);
        });
        where.appendChild(seg);
        sheet.at = j;
        setCaret(place === 'at' ? (j === 0 ? R.main[0].start : R.main[j].start) : R.trackEnd);
      }
      function setCaret(x) {
        sheet.caret = x; drawCaret();
        if (x == null || !api) return;
        const sc = api.scroller, px = api.xOf(x);
        if (px < sc.scrollLeft + 44 || px > sc.scrollLeft + sc.clientWidth - 24) sc.scrollLeft = Math.max(0, px - sc.clientWidth / 2);
      }
      sh.querySelector('.v3-close').addEventListener('click', () => closeSheet());
      go.addEventListener('click', () => {
        if (!picks.length) return;
        const clips = picks.map(k => Object.assign({}, MEDIA[k]));
        const at = place === 'at' && sheet && sheet.at != null ? sheet.at : null;
        closeSheet();
        act('insert', at == null ? { clips } : { clips, at }, { pre: (res, o) => { const ids = res.newIds || []; sel = null; hinted = true; o.flash = ids; o.reveal = ids[0]; } });
      });
      f.root.appendChild(sh);
      sheet = { el: sh, caret: null, at: null, onTime: placeLine };
      placeLine(); sync();
    }
    /* "Make the track long": for trying the two ways of moving a clip a long way */
    function makeLong() {
      const lens = [2, 2.5, 1.5, 3], clips = [];
      for (let k = 0; k < 8; k++) { const m = MEDIA[k % 4]; clips.push(Object.assign({}, m, { name: m.name + ' ' + (Math.floor(k / 4) + 2), duration: lens[k % 4] })); }
      stopPlay(); closeSheet(); sel = null; hinted = true;
      const res = act('insert', { clips }, { pre: (r, o) => { o.flash = r.newIds || []; } });
      if (!res || !res.ok) return;
      bringPhone();
      const ids = read().main.filter(e => !e.slot).map(e => e.id), last = ids[ids.length - 1];
      if (api) api.scroller.scrollLeft = api.scroller.scrollWidth;
      say(touchFirst() ? 'Now hold the last clip and drag it to the start' : 'Now drag the last clip to the start');
      setTimeout(() => pulse(api && api.items.get(last)), 80);
    }
    function splitNow() {
      stopPlay(); closeSheet();
      const R = read();
      let id = sel && R.isMain(sel) ? sel : null;
      if (sel && !id) { say('Split works on clips · pick a clip first', null, true); return; }
      if (!id) { const e = R.mainAt(t); if (!e || e.slot) { say('Move the playhead onto the clip to split', null, true); return; } id = e.id; }
      const e = R.entry(id);
      if (t <= e.start + 1e-6 || t >= e.end - 1e-6) { say('Move the playhead onto the clip to split', null, true); return; }
      act('split', { id, t }, { pre: (res, o) => { o.flash = [id, res.newId]; sel = res.newId || sel; } });
    }
    function makeGap() {
      const R = read(), ids = R.main.filter(e => !e.slot).map(e => e.id);
      if (ids.length < 2) { say('Add another clip first', null, true); return false; }
      // Full trims one clip's end and nothing closes up. Pick a clip and an amount that leave a real gap
      // (if something starts in the cut-off end, Quick shows a card there instead, §3.1).
      const cands = ids.slice(0, -1).sort((a, b) => (b === 'c3') - (a === 'c3'));
      let id = null, cut = 0;
      for (const c of cands) {
        for (const k of [1, 0.8, 0.6, 0.4]) {
          const d = E.clone(ed.doc), x = layerOf(d, c);
          if (x.duration - k < 0.5) continue;
          x.duration = +(x.duration - k).toFixed(4);
          const R2 = E.classify(d);
          if (R2.main.some(e => e.seam.kind === 'gap') && !R2.main.some(e => e.slot)) { id = c; cut = k; break; }
        }
        if (id) break;
      }
      if (!id) { say('No clip here can leave a clean gap', null, true); return false; }
      manual('Trimmed in Full', d => { const x = layerOf(d, id); x.duration = +(x.duration - cut).toFixed(4); }, { flash: [id] });
      say('A gap, as Full leaves it · tap the orange chip');
      return true;
    }
    function closeAllGaps() {
      stopPlay(); closeSheet();
      const before = ed.doc, n0 = ed.undoStack.length;
      let n = 0;
      for (let guard = 0; guard < 24; guard++) {
        const e = read().main.find(x => ['gap', 'hairline'].includes(x.seam.kind));
        if (!e || !ed.run('closeGap', { id: e.id }).ok) break;
        n++;
      }
      if (!n) { say('No gaps to close'); return; }
      ed.undoStack.splice(n0, ed.undoStack.length - n0, { label: 'Close all gaps', json: ed.undoStack[n0].json });   // one undo step
      mark('gap');
      afterEdit(before, 'Close all gaps', { say: n === 1 ? 'Closed 1 gap' : 'Closed ' + n + ' gaps' }, {});
    }

    /* ---------- the Speed panel: presets and a slider; the slider previews, release commits (§8.5) ---------- */
    function openSpeed() {
      const R = read(); if (!sel || !R.isMain(sel)) return;
      closeSheet(); clearMsg(false);
      const id = sel, sp0 = R.layer(id).speed || 1;
      const sh = el('div', 'v3-sheet'); sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Speed');
      sh.innerHTML = '<div class="v3-sheet-h"><b>Speed</b><span class="v3-sp-now"></span><span class="v3-sp-len"></span><button type="button" class="v3-done">Done</button></div>' +
        '<div class="v3-presets" role="group" aria-label="Speed presets"></div><input class="v3-range" type="range" min="0" max="100" step="1" aria-label="Speed">';
      const presets = sh.querySelector('.v3-presets'), range = sh.querySelector('.v3-range'), nowEl = sh.querySelector('.v3-sp-now'), lenEl = sh.querySelector('.v3-sp-len');
      [0.5, 1, 1.5, 2, 3].forEach(p => { const b = el('button', '', p + '×'); b.type = 'button'; b.dataset.sp = p; b.addEventListener('click', () => commit(p)); presets.appendChild(b); });
      const toV = sp => Math.round(100 * Math.log(sp / 0.25) / Math.log(16));
      const toSp = v => { const x = 0.25 * Math.pow(16, v / 100); return x < 2 ? Math.round(x * 20) / 20 : Math.round(x * 10) / 10; };
      function show(sp, doc, warn) {
        const cur = layerOf(doc || ed.doc, id);
        nowEl.textContent = nice(sp) + '×';
        lenEl.textContent = warn || (cur ? nm(cur) + ' · ' + fmt(cur.duration) : '');
        lenEl.classList.toggle('warn', !!warn);
        presets.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(+b.dataset.sp - sp) < 1e-6)));
      }
      function commit(sp) {
        const cur = layerOf(ed.doc, id); if (!cur) { closeSheet(); return; }
        if (Math.abs((cur.speed || 1) - sp) < 1e-6) { drawTL(ed.doc, {}); drawStage(ed.doc, t); range.value = toV(sp); show(sp); return; }
        const res = act('speed', { id, sp }, { flash: [id] });
        const now_ = (layerOf(ed.doc, id) || {}).speed || 1;
        if (!res.ok) clearMsg();
        range.value = toV(now_);
        show(now_, null, res.ok ? '' : res.say);
      }
      range.value = toV(sp0);
      range.addEventListener('input', () => { const sp = toSp(+range.value), doc = tryDoc('speed', { id, sp }); drawTL(doc || ed.doc, {}); drawStage(doc || ed.doc, t); show(sp, doc); });
      range.addEventListener('change', () => commit(toSp(+range.value)));
      sh.querySelector('.v3-done').addEventListener('click', () => { closeSheet(); drawAll(); });
      f.root.appendChild(sh);
      sheet = { el: sh, id };
      show(sp0);
    }
    function closeSheet() {
      if (!sheet) return;
      const s = sheet; sheet = null; s.el.remove();
      if (s.caret != null) drawCaret();
      if (s.onClose) s.onClose();
    }

    /* ---------- Effects (§8.5c) ----------
       'seg'    the project row's Effects: an effect over the whole picture at the line, for up to 3 s of the clip under it.
                Only the kinds that can be one are live; the rest say "Pick a clip first". Nothing is added until a pick.
       'clip' / 'text' / 'overlay'   the item's own Effects: only what that item can take, added to it, and it goes where it goes.
       'change' a picked effect's Change effect. */
    function openEffects(mode, id) {
      stopPlay(); closeSheet(); clearMsg(false);
      const target = id ? layerOf(ed.doc, id) : null;
      if (mode !== 'seg' && !target) return;
      const segMode = mode === 'seg' || mode === 'change';
      if (mode === 'change') { t = clamp(t, target.start, target.start + target.duration - 1 / FPS); drawAll(); }
      const list = segMode ? FX : FX.filter(x => !(x.not || []).includes(mode));
      const title = mode === 'seg' ? 'Effects' : mode === 'change' ? 'Change effect' : 'Effects on ' + nm(target);
      const sub = mode === 'seg' ? 'Over the picture at the line' : mode === 'change' ? 'Same place, same length'
        : mode === 'text' ? 'The ones a title can use' : 'They go where it goes';
      const sh = el('div', 'v3-sheet'); sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', title);
      sh.innerHTML = '<div class="v3-sheet-h"><b>' + esc(title) + '</b><span class="v3-sp-len v3-grow">' + esc(sub) + '</span>' +
        '<button type="button" class="v3-close" aria-label="Cancel" title="Cancel">' + VIS.icon('close') + '</button></div>' +
        '<div class="v3-fxgrid" role="group" aria-label="Effects"></div><p class="v3-note" aria-live="polite"></p>';
      const grid = sh.querySelector('.v3-fxgrid'), note = sh.querySelector('.v3-note');
      const tell = (text, warn) => { note.textContent = text || ''; note.classList.toggle('warn', !!warn); };
      tell(mode === 'seg' ? 'Nothing is added until you pick one.' : mode === 'change' ? '' : 'Tap one to add it. Tap a lit one to take it off.');
      // what each tile shows: the frame under the line (or the item itself), with the effect on it
      const R = read(), under = R.mainAt(t), base = (() => {
        if (mode === 'text') return '<svg viewBox="0 0 90 60" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="90" height="60" fill="#22303b"/><text x="45" y="39" text-anchor="middle" font-size="22" font-weight="800" fill="#fff" font-family="system-ui, sans-serif">Aa</text></svg>';
        if (mode === 'overlay' && target.type === 'image') return '<svg viewBox="0 0 90 60" aria-hidden="true"><rect width="90" height="60" fill="#22303b"/></svg><span style="position:absolute;left:22%;right:22%;top:24%">' + stickerOf(target) + '</span>';
        const c = mode === 'clip' || mode === 'overlay' ? target : (under && !under.slot ? R.layer(under.id) : null);
        if (!c) return '<svg viewBox="0 0 90 60" aria-hidden="true"><rect width="90" height="60" fill="#22303b"/></svg>';
        const at = mode === 'clip' || mode === 'overlay' ? (c.trimStart || 0) + c.duration * (c.speed || 1) / 2 : (c.trimStart || 0) + (t - c.start) * (c.speed || 1);
        return art(c, at);
      })();
      const curSeg = mode === 'change' ? ((target.fx || [])[0] || {}).id : null;
      const has = x => mode === 'change' ? curSeg === x.id : !segMode && (target.fx || []).some(i => i.id === x.id);
      list.forEach(x => {
        const off = mode === 'seg' ? !x.seg : mode === 'change' ? !x.seg : false;
        if (mode === 'change' && off) return;           // a picked effect can only become another whole-picture one
        const b = el('button', 'v3-mt' + (x.m ? ' m-' + x.id : ''),
          '<span class="pv"><span class="in" style="' + (x.f ? 'filter:' + x.f(1, 60) : '') + '">' + base + '</span>' +
          (x.m ? '<span class="mi" aria-hidden="true">' + icon('animate') + '</span>' : '') +
          (off ? '<span class="no">Pick a clip first</span>' : '') + '</span><span class="n">' + esc(x.name) + '</span>');
        b.type = 'button'; b.dataset.fx = x.id;
        b.setAttribute('aria-label', x.name + (off ? ', pick a clip first' : ''));
        if (off) b.setAttribute('aria-disabled', 'true');
        if (!segMode || mode === 'change') b.setAttribute('aria-pressed', String(has(x)));
        b.addEventListener('click', () => {
          if (off) { tell(x.name + ' goes on a clip · pick one, then Effects in its row', true); return; }
          if (mode === 'seg') addSegment(x, tell);
          else if (mode === 'change') changeSegment(id, x);
          else toggleFx(id, x);
        });
        grid.appendChild(b);
      });
      sh.querySelector('.v3-close').addEventListener('click', () => closeSheet());
      f.root.appendChild(sh);
      sheet = { el: sh, id };
    }
    function addSegment(x, tell) {
      const R = read();
      let e = R.mainAt(t);
      if (!e || e.slot) e = R.main.find(m => !m.slot && m.start >= t - 1e-6) || null;
      if (!e) { tell('Add a clip first · tap +', true); return; }
      // §4.3: from the line, for 3 s or to the end of the clip under it; too little left and it starts on the next clip
      let s0 = Math.max(e.start, Math.floor(t * FPS + 1e-6) / FPS), len = Math.min(3, e.end - s0);
      if (len < E.minLen(FPS)) {
        const nx = R.main[R.idx[e.id] + 1];
        if (!nx || nx.slot) { tell('Move the line onto a clip first', true); return; }
        s0 = nx.start; len = Math.min(3, nx.end - nx.start);
      }
      let nid = 'fx1', k = 1; while (layerOf(ed.doc, nid)) nid = 'fx' + (++k);
      closeSheet();
      manual('Add ' + x.name, d => {
        // just above the clips: below the titles, stickers and captions, so it colours the footage, not the words
        const top = d.layers.findIndex(q => q.sm && q.sm.main);
        d.layers.splice(top < 0 ? d.layers.length : top, 0, { id: nid, type: 'adjustment', name: x.name,
          start: +s0.toFixed(6), duration: +len.toFixed(6), fx: [{ id: x.id, amt: 1, sm: 1 }] });
      }, { pre: () => { sel = nid; lastOpen = 'effect'; hinted = true; }, flash: [nid], reveal: nid });
      mark('effects');
      announce('Added ' + x.name + ' at ' + fmt(s0));
    }
    function changeSegment(id, x) {
      const l = layerOf(ed.doc, id); if (!l) { closeSheet(); return; }
      if (((l.fx || [])[0] || {}).id === x.id) { closeSheet(); return; }
      manual('Change to ' + x.name, d => {
        const q = layerOf(d, id), a = ((q.fx || [])[0] || {}).amt;
        q.name = x.name; q.fx = [{ id: x.id, amt: a == null ? 1 : a, sm: 1 }];
      }, { flash: [id] });
    }
    function toggleFx(id, x) {
      const l = layerOf(ed.doc, id); if (!l) { closeSheet(); return; }
      const on = (l.fx || []).some(i => i.id === x.id);
      manual(on ? 'Take ' + x.name + ' off ' + nm(l) : 'Add ' + x.name + ' to ' + nm(l), d => {
        const q = layerOf(d, id);
        q.fx = on ? (q.fx || []).filter(i => i.id !== x.id) : (q.fx || []).concat([{ id: x.id, amt: 1, sm: 1 }]);
        if (!q.fx.length) delete q.fx;
      }, { flash: [id] });
      if (!on) mark('effects');
      announce((on ? 'Took ' + x.name + ' off ' : 'Added ' + x.name + ' to ') + nm(l));
    }
    /* Strength of a picked effect: the slider previews, letting go saves it (one step) */
    function openStrength() {
      const id = sel, l0 = layerOf(ed.doc, id);
      if (!l0 || l0.type !== 'adjustment') return;
      stopPlay(); closeSheet(); clearMsg(false);
      t = clamp(t, l0.start, l0.start + l0.duration - 1 / FPS); drawAll();
      const a0 = ((l0.fx || [])[0] || {}).amt, amt0 = a0 == null ? 1 : a0;
      const sh = el('div', 'v3-sheet'); sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Strength');
      sh.innerHTML = '<div class="v3-sheet-h"><b>Strength</b><span class="v3-sp-now"></span><span class="v3-sp-len">' + esc(nm(l0)) + '</span><span class="v3-grow"></span><button type="button" class="v3-done">Done</button></div>' +
        '<input class="v3-range" type="range" min="0" max="100" step="5" aria-label="Strength">';
      const range = sh.querySelector('.v3-range'), nowEl = sh.querySelector('.v3-sp-now');
      range.value = Math.round(amt0 * 100); nowEl.textContent = range.value + '%';
      const withAmt = v => { const d = E.clone(ed.doc), q = layerOf(d, id); if (q && q.fx && q.fx[0]) q.fx[0].amt = v; return d; };
      range.addEventListener('input', () => { nowEl.textContent = range.value + '%'; drawStage(withAmt(+range.value / 100), t); });
      range.addEventListener('change', () => {
        const v = +range.value / 100, cur = ((layerOf(ed.doc, id) || {}).fx || [])[0];
        if (!cur || Math.abs((cur.amt == null ? 1 : cur.amt) - v) < 1e-6) return;
        manual('Strength of ' + nm(l0), d => { const q = layerOf(d, id); if (q && q.fx && q.fx[0]) q.fx[0].amt = v; }, { keepSheet: true });
      });
      sh.querySelector('.v3-done').addEventListener('click', () => { closeSheet(); drawAll(); });
      f.root.appendChild(sh);
      sheet = { el: sh, id };
    }
    /* Length (§8.5): the clip's length with − and + of one frame (hold to keep going) and a typed value. Each works like
       dragging the white tab: the rest close up. One hold is one step. */
    function openLength() {
      const R0 = read(); if (!sel || !R0.isMain(sel)) return;
      stopPlay(); closeSheet(); clearMsg(false);
      const id = sel; let edge = 'end', run = null, rep = 0, repI = 0;
      const sh = el('div', 'v3-sheet'); sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Length');
      sh.innerHTML = '<div class="v3-sheet-h"><b>Length</b><span class="v3-sp-len v3-grow"></span><button type="button" class="v3-done">Done</button></div>' +
        '<div class="v3-sheet-f"><div class="v3-seg" role="group" aria-label="Which end"><button type="button" data-e="end">Trim the end</button><button type="button" data-e="start">Trim the start</button></div></div>' +
        '<div class="v3-len"><button type="button" class="st" data-d="-1" aria-label="One frame shorter" title="One frame shorter">−</button>' +
        '<input type="number" inputmode="decimal" step="0.1" min="0.1" aria-label="Length in seconds"><span class="u">s</span>' +
        '<button type="button" class="st" data-d="1" aria-label="One frame longer" title="One frame longer">+</button></div>' +
        '<p class="v3-note" aria-live="polite"></p>';
      const nameEl = sh.querySelector('.v3-sp-len'), inp = sh.querySelector('input'), note = sh.querySelector('.v3-note'), segBtns = sh.querySelectorAll('[data-e]');
      function show(warn) {
        const l = layerOf(ed.doc, id); if (!l) { closeSheet(); return; }
        nameEl.textContent = nm(l);
        if (document.activeElement !== inp) inp.value = (Math.round(l.duration * 100) / 100).toFixed(2);
        segBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.e === edge)));
        note.textContent = warn || (edge === 'end' ? 'One frame a tap · hold to keep going' : 'The clip keeps its place · the rest close up');
        note.classList.toggle('warn', !!warn);
      }
      function step(dir) {
        const l = layerOf(ed.doc, id); if (!l) return false;
        const res = edge === 'end' ? ed.run('trimTail', { id, dur: l.duration + dir / FPS }) : ed.run('trimHead', { id, by: -dir / FPS });
        if (!res.ok) { show(res.say); return false; }
        if (res.time != null && isFinite(res.time)) t = res.time;
        drawTL(ed.doc, {}); drawStage(ed.doc, t); setPill(); show();
        return true;
      }
      function begin() { stopPlay(); run = { before: ed.doc, n0: ed.undoStack.length }; }
      function end() {
        clearTimeout(rep); clearInterval(repI);
        if (!run) return;
        const r = run; run = null;
        const n = ed.undoStack.length - r.n0;
        if (n <= 0) { drawAll(); return; }
        const label = ed.undoStack[ed.undoStack.length - 1].label;
        if (n > 1) ed.undoStack.splice(r.n0, n, { label, json: ed.undoStack[r.n0].json });   // one hold, one undo step
        mark(edge === 'end' ? 'tail' : 'head');
        lastEdit = { label, lines: describe(r.before, ed.doc) };
        drawAll({ flash: [id] }); renderMoved(); announce(label);
      }
      sh.querySelectorAll('.st').forEach(b => {
        const dir = +b.dataset.d;
        b.addEventListener('pointerdown', e => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          e.preventDefault();
          try { b.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
          begin();
          if (!step(dir)) { end(); return; }
          rep = setTimeout(() => { repI = setInterval(() => { if (!step(dir)) clearInterval(repI); }, 70); }, 420);
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, end));
        b.addEventListener('click', e => { if (e.detail === 0) { begin(); step(dir); end(); } });   // Enter or Space
        b.addEventListener('contextmenu', e => e.preventDefault());
      });
      segBtns.forEach(b => b.addEventListener('click', () => { edge = b.dataset.e; show(); }));
      inp.addEventListener('change', () => {
        const v = parseFloat(inp.value), l = layerOf(ed.doc, id);
        if (!l || !isFinite(v)) { show(); return; }
        const want = Math.round(v * FPS) / FPS;
        const res = edge === 'end' ? act('trimTail', { id, dur: want }, { flash: [id] }) : act('trimHead', { id, by: l.duration - want }, { flash: [id] });
        inp.blur(); show(res && !res.ok ? res.say : '');
      });
      sh.querySelector('.v3-done').addEventListener('click', () => { closeSheet(); drawAll(); });
      f.root.appendChild(sh);
      sheet = { el: sh, id, onClose: () => { if (run) end(); } };
      show();
    }

    /* ---------- playing ---------- */
    function play() {
      if (playing) { stopPlay(); return; }
      closeSheet();
      if (t >= dur() - 0.05) t = 0;
      playing = true;
      let last = now();
      const step = () => {
        if (!playing) return;
        if (!root.isConnected) { stopPlay(); return; }
        const n = now(), D = dur();
        t = Math.min(D, t + (n - last) / 1000); last = n;
        drawStage(ed.doc, t);
        if (api && api.setTime) api.setTime(t);
        follow(); setPill();
        if (t >= D - 1e-6) { t = Math.max(0, D - 1 / FPS); stopPlay(); return; }
        playRaf = requestAnimationFrame(step);
      };
      playRaf = requestAnimationFrame(step);
      setPill();
    }
    function stopPlay() { if (!playing) return; playing = false; cancelAnimationFrame(playRaf); setPill(); }
    function follow() {
      if (!api) return;
      const x = api.xOf(t), sc = api.scroller;
      if (x > sc.scrollLeft + sc.clientWidth - 30) sc.scrollLeft = x - 80;
      else if (x < sc.scrollLeft + 40) sc.scrollLeft = Math.max(0, x - 80);
    }

    /* ---------- the kit's timeline callbacks ---------- */
    function onTap(id, info) {
      if (now() < suppressUntil) return;
      if (info && info.kind === 'slot') return;
      stopPlay(); closeSheet();
      hinted = true; msg = null; clearTimeout(msgTimer);
      sel = id;
      drawAll();
    }
    function onScrub(x) {
      stopPlay();
      t = clamp(x, 0, Math.max(0, dur() - 1 / FPS));
      if (api && api.setTime) api.setTime(t);
      drawStage(ed.doc, t); setPill();
      if (sheet && sheet.onTime) sheet.onTime();
    }
    function onOpen(s) {
      lastOpen = s;
      const R = read();
      if (sel && !R.isMain(sel) && R.units[sel] && R.units[sel].section !== s) sel = null;
      drawAll();
    }
    function onSeam(id) { closeSheet(); act('closeGap', { id }); }

    tl.addEventListener('click', e => {
      if (now() < suppressUntil) return;
      if (e.target.closest('.fm-ruler, button')) return;
      const cue = e.target.closest('.fm-cue');
      if (cue) { const cap = Object.values(read().units).find(u => u.kind === 'captions'); if (cap) onTap(cap.id, { kind: 'captions' }); return; }
      const gap = e.target.closest('.fm-gap');
      if (gap && gap.dataset.next) {
        const R = read(), en = R.entry(gap.dataset.next);
        if (en) { say('A gap of ' + fmt(en.seam.amt), [{ label: 'Close gap', run: () => act('closeGap', { id: gap.dataset.next }) }]); return; }
      }
      if (sel) { sel = null; msg = null; closeSheet(); drawAll(); }
    });
    tl.addEventListener('contextmenu', e => { if (e.target.closest('.fm-tile')) e.preventDefault(); });

    /* ---------- gestures: trim grips and hold-drag (§3.8). Nothing is written until the finger lifts. ---------- */
    tl.addEventListener('pointerdown', onDown);
    f.root.addEventListener('pointermove', onMove);
    f.root.addEventListener('pointerup', onUp);
    f.root.addEventListener('pointercancel', onCancel);
    f.root.addEventListener('touchmove', e => { if (drag && drag.kind !== 'arm' && e.cancelable) e.preventDefault(); }, { passive: false });

    function onDown(e) {
      if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (e.target.closest('.fm-ruler, .fm-seam, .fm-addclip, .fm-opener')) return;
      const zone = gripNear(e);
      if (zone) { e.preventDefault(); stopPlay(); beginTrim(e, sel, zone); return; }
      const tile = e.target.closest('.fm-tile');
      if (!tile || !tile.dataset.id || tile.classList.contains('slot')) return;
      const id = tile.dataset.id, grip = e.target.closest('.grip');
      stopPlay();
      if (grip && sel === id) { e.preventDefault(); beginTrim(e, id, grip.classList.contains('l') ? 'head' : 'tail'); return; }
      drag = { kind: 'arm', id, tile, pid: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, mouse: e.pointerType === 'mouse' };
      if (!drag.mouse) {
        tile.classList.add('v3-arming');
        drag.timer = setTimeout(() => { if (drag && drag.kind === 'arm') startMove(); }, HOLD_MS);
      }
    }
    // a press on the picked clip's white tab, or just inside or just past either edge of it, trims (QA: a finger a few px
    // off the 11 px tab scrolled the timeline). Measured on the screen, so it holds at any scale.
    function gripNear(e) {
      if (!sel || !api) return null;
      const g = e.target.closest('.grip');
      if (g) { const tl0 = g.closest('.fm-tile'); return tl0 && tl0.dataset.id === sel ? (g.classList.contains('l') ? 'head' : 'tail') : null; }
      const n = api.items.get(sel);
      if (!n || !n.classList.contains('fm-tile') || !n.classList.contains('sel') || !read().isMain(sel)) return null;
      const r = n.getBoundingClientRect(), s = f.scale || 1, x = e.clientX, y = e.clientY;
      if (y < r.top - 6 * s || y > r.bottom + 6 * s) return null;
      const inner = Math.min(16 * s, r.width / 3);
      if (x >= r.left - 28 * s && x <= r.left + inner) return 'head';
      if (x >= r.right - inner && x <= r.right + 28 * s) return 'tail';
      return null;
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      drag.x = e.clientX; drag.y = e.clientY;
      if (drag.kind === 'arm') {
        const d = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
        if (drag.mouse) { if (d > 5) startMove(); }
        else if (d > 10) disarm();          // a swipe: let the timeline scroll
      }
    }
    function onUp(e) { if (!drag || e.pointerId !== drag.pid) return; if (drag.kind === 'arm') disarm(); else finish(true); }
    function onCancel(e) { if (!drag || e.pointerId !== drag.pid) return; if (drag.kind === 'arm') disarm(); else finish(false); }
    function disarm() { if (!drag) return; clearTimeout(drag.timer); drag.tile.classList.remove('v3-arming'); drag = null; }
    const rootXY = (cx, cy) => { const s = f.scale || 1, rr = f.root.getBoundingClientRect(), bw = f.root.clientLeft || 0; return { x: (cx - rr.left) / s - bw, y: (cy - rr.top) / s - bw }; };

    function startMove() {
      const d = drag; clearTimeout(d.timer); d.tile.classList.remove('v3-arming');
      const R0 = read(), e0 = R0.entry(d.id);
      if (!e0 || e0.slot) { drag = null; return; }
      if (reorderView === 'compact') { startCompact(d, R0, e0); return; }
      const s = f.scale || 1, tr = d.tile.getBoundingClientRect(), p = rootXY(tr.left, tr.top);
      Object.assign(d, { kind: 'move', R0, e0, to: null, preview: null, grab: (d.x0 - tr.left) / s, top: p.y, lastKey: null });
      closeSheet(); if (msg) clearMsg(false);
      const g = d.tile;                       // the pressed tile itself becomes the floating copy, so the touch keeps its target
      g.classList.remove('v3-flash', 'v3-pulse');
      g.classList.add('v3-ghost');
      g.style.left = p.x + 'px'; g.style.top = p.y + 'px';
      ov.appendChild(g);
      try { f.root.setPointerCapture(d.pid); } catch (err) { /* already released */ }
      suppressUntil = now() + 1e7;
      drawTL(ed.doc, { hole: d.id });
      try { if (!d.mouse && navigator.vibrate) navigator.vibrate(8); } catch (err) { /* no buzz, fine */ }
      loop();
    }
    /* The compact view (an option, §3.8): while a clip is held, every clip becomes a small square so the whole track fits,
       and the held one slides between them. Drawn over the timeline; nothing is written until the finger lifts. */
    function startCompact(d, R0, e0) {
      Object.assign(d, { kind: 'compact', R0, e0, to: null, lastKey: null });
      closeSheet(); if (msg) clearMsg(false);
      const W = f.timeline.clientWidth || 380, N = R0.main.length, gap = 6, pad = 14;
      const S = Math.round(clamp((W - 2 * pad + gap) / N - gap, 30, 56));
      const box = el('div', 'v3-cmp'), head = el('div', 'v3-cmp-h'), sc = el('div', 'v3-cmp-sc'), row = el('div', 'v3-cmp-row');
      row.style.width = (2 * pad + N * (S + gap) - gap) + 'px'; row.style.height = (S + 22) + 'px';
      sc.appendChild(row); box.appendChild(head); box.appendChild(sc); f.timeline.appendChild(box);
      const square = m => {
        const l = !m.slot && R0.layer(m.id);
        const n = el('div', 'v3-sq', l ? art(l, (l.trimStart || 0) + (m.end - m.start) * (l.speed || 1) / 2) : '<svg viewBox="0 0 10 10" aria-hidden="true"><rect width="10" height="10" fill="#5b4a8a"/></svg>');
        n.style.width = n.style.height = S + 'px'; return n;
      };
      const rest = R0.main.filter(m => m.id !== e0.id), sq = new Map();
      rest.forEach(m => { const n = square(m); row.appendChild(n); sq.set(m.id, n); });
      const hole = el('div', 'v3-sq-hole'); hole.style.width = hole.style.height = S + 'px'; row.appendChild(hole);
      const ghost = square(e0); ghost.classList.add('ghost'); ov.appendChild(ghost);
      d.cmp = { box, head, sc, row, sq, hole, ghost, rest, S, gap, pad, k: -1 };
      layoutCompact(d, e0.i);
      const hx = pad + e0.i * (S + gap);
      if (hx + S > sc.clientWidth) sc.scrollLeft = hx - sc.clientWidth / 2;
      try { f.root.setPointerCapture(d.pid); } catch (err) { /* already released */ }
      suppressUntil = now() + 1e7;
      try { if (!d.mouse && navigator.vibrate) navigator.vibrate(8); } catch (err) { /* no buzz, fine */ }
      loop();
    }
    function layoutCompact(d, k) {
      const c = d.cmp; if (c.k === k) return; c.k = k;
      let slot = 0;
      c.rest.forEach(m => { if (slot === k) slot++; c.sq.get(m.id).style.left = (c.pad + slot * (c.S + c.gap)) + 'px'; slot++; });
      c.hole.style.left = (c.pad + k * (c.S + c.gap)) + 'px';
      d.to = k < c.rest.length ? d.R0.idx[c.rest[k].id] : d.R0.main.length;
      const same = d.to === d.e0.i || d.to === d.e0.i + 1, name = m => m.slot ? 'the card' : nm(d.R0.layer(m.id));
      c.head.innerHTML = '<b>Moving ' + esc(name(d.e0)) + '</b> · ' + (same ? 'back where it was' : k === 0 ? 'goes first' : 'goes after ' + esc(name(c.rest[k - 1])));
    }
    function compactFrame(d) {
      const c = d.cmp, s = f.scale || 1, p = rootXY(d.x, d.y);
      c.ghost.style.left = (p.x - c.S / 2) + 'px'; c.ghost.style.top = (p.y - c.S - 14) + 'px';   // just above the finger, so it shows
      const rr = c.row.getBoundingClientRect(), xr = (d.x - rr.left) / s;
      layoutCompact(d, clamp(Math.round((xr - c.pad - c.S / 2) / (c.S + c.gap)), 0, c.rest.length));
    }
    function endCompact(d, commit) {
      const c = d.cmp, id = d.e0.id, same = d.to == null || d.to === d.e0.i || d.to === d.e0.i + 1;
      c.ghost.remove(); c.box.remove();
      if (commit && !same) {
        const before = ed.doc, res = ed.run('reorder', { id, to: d.to });
        if (res.ok) {
          mark('move');
          if (res.time != null) t = res.time;
          lastEdit = { label: res.label, lines: describe(before, ed.doc) };
          drawAll({ flash: [id], reveal: id }); renderMoved(); announce(res.say);
          return;
        }
        say(res.say, null, true);
      }
      drawAll({});
    }
    function beginTrim(e, id, side) {
      const l = layerOf(ed.doc, id); if (!l) return;
      closeSheet(); if (msg) clearMsg(false);
      drag = { kind: 'trim', side, id, pid: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
        down: api.tOf(e.clientX), start: l.start, dur0: l.duration, cut: 0, newLen: l.duration, arg: null, mouse: e.pointerType === 'mouse' };
      drag.lastKey = drag.x + ':' + api.scroller.scrollLeft + ':' + drag.y;
      try { f.root.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
      suppressUntil = now() + 1e7;
      showBubble(drag);
      loop();
    }
    function loop() { if (!drag || drag.kind === 'arm') return; frame(); if (drag) drag.raf = requestAnimationFrame(loop); }
    function frame() {
      const d = drag; if (!api) return;
      // edge auto-scroll: near either edge of the timeline the track scrolls under the finger
      const cmp = d.kind === 'compact', sc = cmp ? d.cmp.sc : api.scroller, sr = sc.getBoundingClientRect(), s = f.scale || 1;
      const L = sr.left + (cmp ? 0 : 36 * s), Rr = sr.right, zone = 30 * s;
      let v = 0;
      if (d.x < L + zone) v = -Math.ceil(8 * (L + zone - d.x) / zone);
      else if (d.x > Rr - zone) v = Math.ceil(8 * (d.x - (Rr - zone)) / zone);
      if (v) sc.scrollLeft = clamp(sc.scrollLeft + clamp(v, -8, 8), 0, Math.max(0, sc.scrollWidth - sc.clientWidth));
      const key = d.x + ':' + sc.scrollLeft + ':' + d.y;
      if (key === d.lastKey) return;
      d.lastKey = key;
      if (d.kind === 'move') moveFrame(d); else if (cmp) compactFrame(d); else trimFrame(d);
    }
    function moveFrame(d) {
      const R0 = d.R0, e0 = d.e0, len = e0.end - e0.start;
      const tStart = api.tOf(d.x) - d.grab / PPS, center = tStart + len / 2;
      const rest = R0.main.filter(m => m.id !== e0.id);
      const k = rest.filter(m => (m.start + m.end) / 2 < center).length;
      const to = k < rest.length ? R0.idx[rest[k].id] : R0.main.length;
      const p = rootXY(d.x, d.y), s = f.scale || 1;
      d.tile.style.left = (p.x - d.grab) + 'px';
      d.tile.style.top = (d.top + clamp((d.y - d.y0) / s, -22, 22)) + 'px';
      if (to !== d.to) {
        d.to = to;
        const same = to === e0.i || to === e0.i + 1;
        d.preview = same ? null : tryDoc('reorder', { id: e0.id, to });
        drawTL(d.preview || ed.doc, { hole: e0.id, animate: true });   // the neighbours part
        drawStage(d.preview || ed.doc, t);
      }
    }
    function trimFrame(d) {
      const delta = api.tOf(d.x) - d.down;
      let doc = null, newLen = d.dur0, cut = 0, limit = '';
      if (d.side === 'tail') {
        const want = Math.max(E.minLen(FPS), E.snap(d.start + d.dur0 + delta, FPS) - d.start);
        doc = tryDoc('trimTail', { id: d.id, dur: want });
        if (doc) newLen = layerOf(doc, d.id).duration;
        if (want > newLen + 1e-3) limit = 'End of the footage';
        else if (want < newLen - 1e-3) limit = 'As short as it goes';
        d.arg = doc ? { dur: newLen } : null;
      } else {
        const by = E.snap(delta, FPS);
        doc = Math.abs(by) > 1e-9 ? tryDoc('trimHead', { id: d.id, by }) : null;
        if (doc) { newLen = layerOf(doc, d.id).duration; cut = d.dur0 - newLen; }
        if (Math.abs(by) > Math.abs(cut) + 1e-3) limit = by < 0 ? 'Start of the footage' : 'As short as it goes';
        d.arg = doc ? { by: cut } : null;
      }
      d.cut = cut; d.newLen = newLen; d.limit = limit;
      drawTL(doc || ed.doc, {});
      // a start trim keeps the clip where it is; drawn from the finger's side, the part before it follows the finger
      if (cut) shiftLanes(cut * PPS);
      drawStage(doc || ed.doc, d.side === 'tail' ? d.start + newLen - 1 / FPS : d.start + 1e-4);
      showBubble(d);
    }
    function shiftLanes(dx) {
      if (!api) return;
      api.inner.querySelectorAll('.fm-lane, .fm-ruler > .tick, .fm-playhead, .fm-link').forEach(n => { n.style.transform = dx ? 'translateX(' + dx + 'px)' : ''; });
    }
    function showBubble(d) {
      const n = api.items.get(d.id); if (!n) return;
      const g = n.querySelector(d.side === 'tail' ? '.grip.r' : '.grip.l');
      const r = (g || n).getBoundingClientRect(), tr = n.getBoundingClientRect();
      const p = rootXY(g ? r.left + r.width / 2 : (d.side === 'tail' ? r.right : r.left), tr.top);
      if (!bubble) { bubble = el('div', 'v3-bubble'); ov.appendChild(bubble); }
      const diff = d.newLen - d.dur0;
      bubble.innerHTML = esc(fmt(d.newLen)) + (Math.abs(diff) > 1e-3 ? '<small>' + (diff > 0 ? '+' : '−') + esc(fmt(Math.abs(diff))) + '</small>' : '') + (d.limit ? '<em>' + esc(d.limit) + '</em>' : '');
      bubble.style.left = clamp(p.x, 34, (f.root.clientWidth || 394) - 48) + "px"; bubble.style.top = (p.y - 8) + 'px';
    }
    function hideBubble() { if (bubble) { bubble.remove(); bubble = null; } }
    function finish(commit) {
      const d = drag; drag = null;
      if (!d) return;
      cancelAnimationFrame(d.raf);
      suppressUntil = now() + 350;
      try { f.root.releasePointerCapture(d.pid); } catch (err) { /* fine */ }
      hideBubble();
      if (d.kind === 'move') endMove(d, commit); else if (d.kind === 'compact') endCompact(d, commit); else endTrim(d, commit);
    }
    function endMove(d, commit) {
      const g = d.tile, id = d.e0.id, ok = commit && d.preview && d.to != null;
      if (ok) {
        const before = ed.doc, res = ed.run('reorder', { id, to: d.to });
        if (res.ok) {
          mark('move');
          if (res.time != null) t = res.time;
          lastEdit = { label: res.label, lines: describe(before, ed.doc) };
          renderMoved(); announce(res.say);
        } else say(res.say, null, true);
      }
      drawAll({ hole: id });
      const land = () => { g.remove(); const m = api.items.get(id); if (m) { m.classList.remove('v3-hole'); if (ok) flashNode(m); } };
      const n = api.items.get(id);
      if (n && g.animate && !reduced()) {
        const r = n.getBoundingClientRect(), p = rootXY(r.left, r.top);
        const a = g.animate([{ left: g.style.left, top: g.style.top, transform: getComputedStyle(g).transform },
          { left: p.x + 'px', top: p.y + 'px', transform: 'none' }], { duration: 190, easing: 'cubic-bezier(.2,.8,.2,1)' });
        a.onfinish = land;
      } else land();
    }
    function endTrim(d, commit) {
      let ok = false;
      if (commit && d.arg) {
        const before = ed.doc, res = ed.run(d.side === 'tail' ? 'trimTail' : 'trimHead', Object.assign({ id: d.id }, d.arg));
        if (res.ok) {
          ok = true; mark(d.side);
          if (res.time != null) t = res.time;
          lastEdit = { label: res.label, lines: describe(before, ed.doc) };
          renderMoved(); announce(res.label);
        } else say(res.say, null, true);
      }
      drawAll({});
      if (ok && d.side === 'head' && d.cut && !reduced()) {        // the part before the clip glides back into place
        const dx = d.cut * PPS;
        api.inner.querySelectorAll('.fm-lane, .fm-ruler > .tick, .fm-playhead, .fm-link').forEach(n => {
          if (n.animate) n.animate([{ transform: 'translateX(' + dx + 'px)' }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
        });
      }
      if (ok) flash(d.id);
    }

    /* ---------- the play bar and the project tools ---------- */
    f.on('play', () => play());
    f.on('split', splitNow);
    f.on('undo', doUndo);
    f.on('redo', doRedo);
    f.on('toStart', () => { stopPlay(); t = 0; drawAll(); if (api) api.scroller.scrollLeft = 0; });
    f.on('toEnd', () => { stopPlay(); t = dur() - 1 / FPS; drawAll(); follow(); });
    f.on('switch', () => say('Full is one tap away · it has its own page', [{ label: 'Show', run: () => { if (VIS.open) VIS.open('v1'); } }]));
    f.on('more', () => {
      const has = read().main.some(x => ['gap', 'hairline'].includes(x.seam.kind));
      if (has) say('There are gaps between clips', [{ label: 'Close all gaps', run: closeAllGaps }]); else say('No gaps to close');
    });
    function projectTool(id) {
      if (id === 'clips') { openAdd(true); return; }         // §8.5: Clips opens Add clips, whatever is picked
      if (id === 'effects') { openEffects('seg'); return; }  // §8.5c: the project row's Effects makes whole-picture effects only
      const tool = VIS.QUICK_TOOLS.find(x => x.id === id);
      notHere(tool ? tool.label : 'That');
    }
    // the top bar and Full screen: not drawn behind on this page, so they say so rather than doing nothing (QA)
    [['back', 'Projects'], ['help', 'Help'], ['notes', 'Notes'], ['settings', 'Settings'], ['export', 'Export'], ['fit', 'Full screen']]
      .forEach(([a, label]) => f.on(a, () => notHere(label)));

    document.addEventListener('keydown', e => {
      if (!root.isConnected || !root.offsetParent || e.defaultPrevented) return;
      const tg = e.target;
      if (tg && tg.closest && tg.closest('input, textarea, select, [contenteditable]')) return;
      if (tg && tg !== document.body && !root.contains(tg)) return;
      const k = e.key, mod = e.metaKey || e.ctrlKey;
      if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
      if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); doRedo(); return; }
      if (mod || e.altKey && !/Arrow/.test(k)) return;
      if (k === ' ' && !(tg && tg.closest && tg.closest('button'))) { e.preventDefault(); play(); }
      else if (k === 's' || k === 'S') splitNow();
      else if ((k === 'Delete' || k === 'Backspace') && sel) { e.preventDefault(); if (read().isMain(sel)) deleteClip(sel); else deleteItem(sel); }
      else if (k === 'Escape') { sel = null; msg = null; closeSheet(); drawAll(); }
      else if (e.altKey && (k === 'ArrowLeft' || k === 'ArrowRight') && sel && read().isMain(sel)) { e.preventDefault(); trayTool(k === 'ArrowLeft' ? 'earlier' : 'later'); }
    });

    /* ---------- the hub side: what moved, try this, the rules ---------- */
    function renderMoved() {
      movedCard.innerHTML = '';
      movedCard.appendChild(el('p', 'v3-eyebrow', 'What moved'));
      if (!lastEdit) {
        movedCard.appendChild(el('h3', '', 'Nothing yet'));
        movedCard.appendChild(el('p', 'v3-muted', 'Make an edit on the phone. Everything that moves because of it is listed here, in plain words.'));
        return;
      }
      movedCard.appendChild(el('h3', '', esc(lastEdit.label)));
      const lines = lastEdit.lines;
      if (!lines.length) { movedCard.appendChild(el('p', 'v3-muted', 'Nothing else had to move.')); return; }
      const ul = el('ul');
      lines.slice(0, 8).forEach(x => {
        const c = DOT[x.kind] || VIS.SECTION_COLOR[x.kind] || '#8195a0';
        const li = el('li', '', '<i style="background:' + c + '"></i><span><b>' + esc(x.name) + '</b> <em>· ' + esc(x.note) + '</em></span>');
        ul.appendChild(li);
      });
      if (lines.length > 8) ul.appendChild(el('li', '', '<i></i><span><em>and ' + (lines.length - 8) + ' more</em></span>'));
      movedCard.appendChild(ul);
    }
    function renderTry() {
      tryCard.innerHTML = '';
      const n = STEPS.filter(s => done[s.k]).length;
      tryCard.appendChild(el('div', 'v3-tryhead', '<h3>Try this</h3><span class="v3-count">' + n + ' of ' + STEPS.length + ' tried</span>'));
      tryCard.appendChild(el('div', 'v3-bar', '<i style="width:' + Math.round(100 * n / STEPS.length) + '%"></i>'));
      tryCard.appendChild(el('p', 'v3-muted', touchFirst()
        ? 'Tap a clip to pick it. The white tabs trim it. Hold a clip to move it.'
        : 'Click a clip to pick it. Drag the white tabs to trim it, or drag the clip to move it. S splits, Delete deletes, ⌘Z or Ctrl+Z undoes.'));
      const ol = el('ol', 'v3-steps');
      STEPS.forEach(s => {
        const li = el('li', 'v3-step' + (done[s.k] ? ' done' : ''), '<span class="v3-tick">' + VIS.icon('check') + '</span><div><b>' + esc(s.t) + '</b><span>' + rich(s.d) + '</span></div>');
        const b = el('button', 'h-btn', esc(s.btn || 'Show me')); b.type = 'button';
        b.setAttribute('aria-label', (s.btn || 'Show me') + ': ' + s.t);
        b.addEventListener('click', () => show(s.k));
        li.appendChild(b); ol.appendChild(li);
      });
      tryCard.appendChild(ol);
      const foot = el('div', 'v3-foot');
      const again = el('button', 'h-btn', 'Start again'); again.type = 'button';
      again.addEventListener('click', () => {
        stopPlay(); closeSheet(); hideBubble();
        ed = E.editor(beachDoc()); sel = null; t = 5.7; lastEdit = null; lastOpen = null; msg = null; clearTimeout(msgTimer);
        if (api) api.scroller.scrollLeft = 0;
        drawAll({ animate: true }); renderMoved(); announce('Beach day is back to how it started');
      });
      foot.appendChild(again);
      foot.appendChild(el('span', 'v3-muted', 'Puts Beach day back. Nothing here is saved.'));
      tryCard.appendChild(foot);
    }
    const OPT_PIC = {
      plain: '<svg viewBox="0 0 160 56" aria-hidden="true"><rect x=".75" y=".75" width="158.5" height="54.5" rx="8" style="fill:var(--h-surface-2);stroke:var(--h-rule);stroke-width:1.5"/>' +
        '<g style="fill:var(--h-muted)" opacity=".5"><rect x="8" y="20" width="38" height="22" rx="4"/><rect x="49" y="20" width="30" height="22" rx="4"/><rect x="122" y="20" width="44" height="22" rx="4"/></g>' +
        '<rect x="84" y="12" width="32" height="22" rx="4" transform="rotate(-4 100 23)" style="fill:var(--h-accent)"/>' +
        '<path d="M141 47l8-4.5-8-4.5" style="fill:none;stroke:var(--h-accent);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"/></svg>',
      compact: '<svg viewBox="0 0 160 56" aria-hidden="true"><rect x=".75" y=".75" width="158.5" height="54.5" rx="8" style="fill:var(--h-surface-2);stroke:var(--h-rule);stroke-width:1.5"/>' +
        '<g style="fill:var(--h-muted)" opacity=".5">' + [0, 1, 2, 4, 5, 6, 7, 8, 9, 10].map(i => '<rect x="' + (9 + i * 13.3) + '" y="24" width="10" height="10" rx="2"/>').join('') + '</g>' +
        '<rect x="' + (9 + 3 * 13.3) + '" y="24" width="10" height="10" rx="2" style="fill:none;stroke:var(--h-accent);stroke-dasharray:2 2"/>' +
        '<rect x="44" y="9" width="13" height="13" rx="2.5" style="fill:var(--h-accent)"/></svg>'
    };
    function renderOpt() {
      optCard.innerHTML = '';
      optCard.appendChild(el('p', 'v3-eyebrow', 'An option · not decided'));
      optCard.appendChild(el('h3', '', 'Moving a clip a long way'));
      optCard.appendChild(el('p', 'v3-muted', 'The design scrolls the track when you drag near the edge. Shrinking every clip is an extra idea. Pick one, make the track long, and move a clip to feel it.'));
      const pics = el('div', 'v3-optpic');
      [['plain', 'Scrolls at the edge', 'Drag toward either side and the track moves under your finger.'],
       ['compact', 'Every clip shrinks', 'While you hold a clip, each one turns into a small square, so the whole track fits.']].forEach(([k, t1, t2]) => {
        const b = el('button', '', OPT_PIC[k] + '<span class="cap"><b>' + esc(t1) + '</b>' + esc(t2) + '</span><span class="on">✓ On in the phone</span>');
        b.type = 'button'; b.setAttribute('aria-pressed', String(reorderView === k));
        b.addEventListener('click', () => { reorderView = k; try { localStorage.setItem('vis.v3.reorder', k); } catch (e) { /* fine */ } renderOpt(); });
        pics.appendChild(b);
      });
      optCard.appendChild(pics);
      const foot = el('div', 'v3-foot');
      const long = el('button', 'h-btn', 'Make the track long'); long.type = 'button';
      long.addEventListener('click', makeLong);
      foot.appendChild(long);
      foot.appendChild(el('span', 'v3-muted', rich('Adds 8 short clips. {undo} takes them out.')));
      optCard.appendChild(foot);
    }
    function renderRules() {
      rulesCard.innerHTML = '<p class="v3-eyebrow">The rules it follows</p><h3>Clips stick together</h3><ul>' +
        '<li>Take a clip out, or make it shorter, and the ones after it close up. No gaps are left behind.</li>' +
        '<li>A title or sticker goes with the clip it starts on. Tap one to see the line down to its clip.</li>' +
        '<li>Captions move line by line with the clips under them.</li>' +
        '<li>The song stays put and always ends with the video.</li>' +
        '<li>Every edit is one step. ' + rich('{undo}') + ' undoes the whole thing.</li></ul>';
    }
    function show(k) {
      stopPlay(); closeSheet(); hinted = true;
      const R = read(), ids = R.main.filter(e => !e.slot).map(e => e.id);
      const prefer = (id, i) => ids.includes(id) ? id : ids[Math.min(ids.length - 1, i)];
      const pick = (id, then) => {
        if (!id) { say('Add a clip first · tap +', null, true); bringPhone(); return; }
        sel = id; msg = null; clearTimeout(msgTimer); drawAll(); reveal(id); bringPhone();
        if (then) setTimeout(then, 60);
      };
      const tool = name => () => showTool(name);
      if (k === 'tail') pick(prefer('c2', 1), () => pulse(api.items.get(sel) && api.items.get(sel).querySelector('.grip.r')));
      else if (k === 'head') pick(prefer('c3', 2), () => pulse(api.items.get(sel) && api.items.get(sel).querySelector('.grip.l')));
      else if (k === 'speed') pick(prefer('c2', 1), tool('speed'));
      else if (k === 'delete') pick(prefer('c2', 1), tool('delete'));
      else if (k === 'stay') {
        if (!layerOf(ed.doc, 'title')) { say('The title is gone · undo first', [{ label: 'Undo', run: doUndo }]); bringPhone(); return; }
        lastOpen = 'text'; pick('title', tool('stay'));
      } else if (k === 'move') {
        const id = ids[ids.length - 1]; if (!id) return pick(null);
        sel = null; drawAll(); reveal(id); bringPhone();
        setTimeout(() => pulse(api.items.get(id)), 60);
        say(touchFirst() ? 'Hold ' + nm(R.layer(id)) + ', then drag it left' : 'Drag ' + nm(R.layer(id)) + ' to the left');
      } else if (k === 'split') {
        let e = R.mainAt(t); if (!e || e.slot) e = R.main.find(x => !x.slot);
        if (!e) return pick(null);
        t = E.snap((e.start + e.end) / 2, FPS); sel = null; msg = null; drawAll(); reveal(e.id); bringPhone();
        setTimeout(() => pulse(f.playbar.querySelector('[data-act="split"]')), 60);
      } else if (k === 'undo') { bringPhone(); pulse(f.playbar.querySelector('[data-act="undo"]')); }
      else if (k === 'effects') {
        sel = null; msg = null; clearTimeout(msgTimer); drawAll(); bringPhone();
        setTimeout(() => pulse(f.tools.querySelector('[data-tool="effects"]')), 60);
      }
      else if (k === 'gap') {
        if (!R.main.some(e => e.seam.kind === 'gap') && !makeGap()) { bringPhone(); return; }
        bringPhone();
        const chip = api.inner.querySelector('.fm-seam');
        if (chip) { reveal(chip); setTimeout(() => pulse(chip), 60); }
      }
    }

    drawAll();
    renderMoved(); renderTry(); renderOpt(); renderRules();
    host._shown = () => { if (api) drawAll(); };
  }

  VIS.register('v3', {
    title: 'Quick on a phone',
    group: 'Try it',
    blurb: 'Trim, split, move, speed up and delete real clips, and watch the titles, stickers and captions on them go along.',
    mount(host) { mountV3(host); }
  });
})();
