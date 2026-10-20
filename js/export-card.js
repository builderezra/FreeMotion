/* export-card.js — the Export card, option A: “What you’ll get” (queue 985).
 *
 * His words, 29 Sep: "the export menus settings are honestly a bit daunting for someone who doesnt know how it works. I
 * dont want to lose any function but i want it to actually make sense at first glance. Capcut does a really good job of
 * this but dont fully copy". Three designs were drawn inside the real app (tools/design/985/); A was decided on 11 Oct
 * (#1130). It opens on the answer — a picture, the length and about how big the file will be — then five buttons for what
 * to make, four plain rows that open in place with Recommended on the default, and the exact controls in More options.
 * tools/design/985/mapping.md gives each of the old dialog's 34 settings its place here.
 *
 * ⚠️ THIS FILE IS A VIEW, AND ONLY A VIEW. The export reads exactly the controls it always read — #exp-format, #exp-res,
 * #exp-cw/#exp-ch, #exp-fps, #exp-fps-num, #exp-quality, #exp-range, #exp-transparent and the layer picker (js/app.js,
 * runExport). This card WRITES those controls (the value, then the change event their own listeners already wait for)
 * and READS them back to draw itself; it keeps no setting of its own. So for the same values the export is today's, and
 * nothing that is remembered changed shape: fm.exportPrefs is still {v, format, quality}, written by app.js on Export.
 * The selects sit hidden in .xa-model (index.html); the size and fps boxes, the layer picker, the silent-export warning,
 * Close and Export are the real elements, placed where A draws them.
 *
 * EVERY NUMBER IS THE EXPORTER'S OWN. "About N MB" is runExport's sum — min(80 Mb/s, width × height × fps × quality) —
 * plus 160 kb/s of AAC when the project has sound to lose, over the length of the Part; the sizes are what run(), runGif(),
 * runFrames() and snapshotPNG() make of those settings. GIF and PNG frames cannot be predicted honestly, so they say so.
 * The user's own words (the project's name, a layer's name) only ever reach the page as textContent.
 */
(function () {
  'use strict';
  const FM = window.FM = window.FM || {};
  const $ = function (id) { return document.getElementById(id); };
  const val = function (id) { const e = $(id); return e ? e.value : ''; };

  const NAME = { video: 'Video', gif: 'GIF', picture: 'Picture', sound: 'Sound', frames: 'Frames' };
  const FMT = { video: 'mp4', gif: 'gif', picture: 'frame', frames: 'frames' };   // sound: 'audio' (WAV) or 'audiom4a'
  function kindOf(fmt) {
    return fmt === 'gif' ? 'gif' : fmt === 'frame' ? 'picture' : fmt === 'frames' ? 'frames'
      : (fmt === 'audio' || fmt === 'audiom4a') ? 'sound' : 'video';
  }
  /* Which rows each kind shows. A row that cannot change the file is not on the card — queue 216's rule ("a control that
     cannot affect the output is worse than no control"), which the old dialog already followed for audio. A picture is
     one frame, so it has no smoothness, quality or part; a GIF and PNG frames have no bitrate, so no quality. */
  const ROWS = {
    video: { size: 1, fps: 1, quality: 1, part: 1 },
    gif: { size: 1, fps: 1, alpha: 1, part: 1 },
    picture: { size: 1 },
    sound: { sound: 1, part: 1 },
    frames: { size: 1, fps: 1, alpha: 1, part: 1 }
  };
  const LISTS = ['size', 'fps', 'quality', 'sound', 'part'];
  const MORE_SUB = {
    video: 'One layer · see-through · exact size & fps',
    gif: 'One layer · exact size & fps',
    picture: 'One layer · technical details',
    sound: 'One layer · technical details',
    frames: 'One layer · exact size & fps'
  };
  const RUNG_HINT = { 2160: 'sharp on big screens', 1440: 'sharp on big screens', 1080: 'sharp on any phone',
    720: 'still sharp on a phone', 480: 'a bit soft', 360: 'tiny, for quick previews' };
  // the three qualities are the bitrate factors the exporter has always used (High 0.18, Medium 0.1, Low 0.05)
  const QNAME = { '0.18': 'Best', '0.1': 'Balanced', '0.05': 'Smallest' };
  const QHINT = { '0.18': 'the sharpest picture', '0.1': 'a little softer, a smaller file', '0.05': 'softer again, the smallest file' };
  const PART = { whole: 'Whole video', loop: 'Between your marks', clip: 'Selected clip' };

  // view state only — nothing here is saved, and every open starts it again (the sound type lives for the session, so
  // Sound comes back as the file type he last picked, exactly as the remembered format already does)
  const ui = { list: null, more: false, sound: 'wav' };

  /* ---------- the facts, read off the controls the export reads ---------- */
  // runExport's own clamp for a typed size (js/app.js): the card shows the size the export will be handed
  function clampDim(v, fallback) { const n = Math.round(parseFloat(v)); return (isFinite(n) && n >= 16) ? Math.min(7680, n) : fallback; }
  function spanLen(range) {
    const P = FM.scene.project;
    const s = FM.exportSpan ? FM.exportSpan(range) : { from: null, to: null };
    if (!s || s.stop) return 0;
    const a = s.from == null ? 0 : s.from, b = s.to == null ? (P.duration || 0) : s.to;
    return Math.max(0, b - a);
  }
  function facts() {
    const P = FM.scene.project;
    const fmt = val('exp-format') || 'mp4', res = val('exp-res') || '1', custom = res === 'custom';
    const f = {
      P: P, fmt: fmt, kind: kindOf(fmt), res: res, custom: custom,
      scale: custom ? 1 : (parseFloat(res) || 1),
      outW: custom ? clampDim(val('exp-cw'), P.width) : 0,
      outH: custom ? clampDim(val('exp-ch'), P.height) : 0,
      fpsSel: val('exp-fps') || 'project',
      fps: FM._exportFps ? FM._exportFps() : (P.fps || 30),
      q: parseFloat(val('exp-quality')) || 0.1,
      range: val('exp-range') || 'whole'
    };
    f.len = spanLen(f.range);
    return f;
  }
  /* The size of the file each path makes from these settings — the same arithmetic as js/exporter.js run() (even sides),
     runGif() (the longest side capped at 640), runFrames(), and app.js snapshotPNG() (a rung of the project; Exact size
     does not reach a picture — runExport's 'frame' branch takes the scale only). */
  function dimsFor(f, kind, scale, outW, outH) {
    const P = f.P;
    if (kind === 'picture') {
      let sc = scale;
      if (P.width * P.height * sc * sc > 64e6) sc = Math.sqrt(64e6 / (P.width * P.height));
      return [Math.max(1, Math.round(P.width * sc)), Math.max(1, Math.round(P.height * sc))];
    }
    const own = outW > 0 && outH > 0;
    const bw = own ? outW : P.width * scale, bh = own ? outH : P.height * scale;
    if (kind === 'video') return [Math.max(2, Math.round(bw / 2) * 2), Math.max(2, Math.round(bh / 2) * 2)];
    let w = Math.max(1, Math.round(bw)), h = Math.max(1, Math.round(bh));
    if (kind === 'gif') {
      const L = Math.max(w, h);
      if (L > 640) { const k = 640 / L; w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k)); }
    }
    return [w, h];
  }
  function dims(f) { return dimsFor(f, f.kind, f.scale, f.outW, f.outH); }
  // runExport: bitrate = min(80e6, round(bpW × bpH × fps × quality)), bpW being the typed width or the project's × scale
  function mp4Bytes(f, scale, outW, outH, fps, q, len) {
    const P = f.P;
    const bpW = outW || (P.width * scale), bpH = outH || (P.height * scale);
    const br = Math.min(80e6, Math.round(bpW * bpH * fps * q));
    const snd = (FM.projectHasAudio && FM.projectHasAudio()) ? 160e3 : 0;   // the AAC track run() adds when there is sound
    return (br + snd) * len / 8;
  }
  // the mix is 48 kHz stereo (exporter.buildAudioMix), written as 16-bit WAV or as AAC at 160 kb/s in an .m4a
  function soundBytes(m4a, len) { return m4a ? 160e3 * len / 8 : 44 + 48000 * 2 * 2 * len; }
  function mb(bytes) {
    const n = bytes / 1e6;
    if (!(n > 0)) return '0 KB';
    if (n < 1) return Math.max(1, Math.round(n * 1000)) + ' KB';
    return (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10) + ' MB';
  }
  function clock(s) {
    if (!(s > 0)) return '0:00';
    if (s < 1) return (Math.round(s * 10) / 10) + ' s';
    s = Math.round(s);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function fpsTxt(n) { return String(Math.round(n * 100) / 100); }
  /* bughunt6 #12: A PNG SEQUENCE HOLDS AT MOST 900 FRAMES (js/exporter.js FRAMES_MAX; runFrames refuses more before it
     renders anything). The card counted the frames ("1200 PNGs in a ZIP") and offered Export anyway, and the refusal came
     after the tap. Counted here exactly as runFrames counts them, so the card says it is over and greys Export first. */
  function framesMax() { return (FM.exporter && FM.exporter.FRAMES_MAX) || 900; }
  function frameCount(f) { return Math.max(1, Math.round(f.len * f.fps)); }
  function framesOver(f) { return f.kind === 'frames' && frameCount(f) > framesMax(); }
  function hasMarks() { return !!(FM.hasLoopRegion && FM.hasLoopRegion()); }
  function soloLayer() {
    const id = FM._exportSoloId ? FM._exportSoloId() : null;
    return id && FM.layerById ? FM.layerById(FM.scene, id) : null;
  }

  /* ---------- tiny DOM helpers: text only, never markup ---------- */
  function span(cls, text) { const e = document.createElement('span'); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  // parts: a string (plain text), [string] (bold), or a node
  function txt(node, parts) {
    node.textContent = '';
    parts.forEach(function (p) {
      if (p == null || p === '') return;
      if (Array.isArray(p)) { const b = document.createElement('b'); b.textContent = p[0]; node.appendChild(b); }
      else if (typeof p === 'string') node.appendChild(document.createTextNode(p));
      else node.appendChild(p);
    });
  }
  // a run that must not break across lines ("1080×1920", "about 34 MB") — the row wraps between runs instead of cutting one
  function nw(parts) { const e = span('xa-nw'); txt(e, [].concat(parts)); return e; }
  function nwb(s) { const e = document.createElement('b'); e.className = 'xa-nw'; e.textContent = s; return e; }
  function star() {
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'currentColor'); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', 'm12 3.2 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z');
    s.appendChild(p);
    return s;
  }
  function card() { return document.querySelector('#export-dialog .xa-card'); }
  function grp(k) { return $('xa-g-' + k); }
  function rowBtn(k) { const g = grp(k); return g && g.querySelector('.xa-row'); }
  function rowV(k) { const b = rowBtn(k); return b && b.querySelector('.v'); }
  function listEl(k) { const g = grp(k); return g && g.querySelector('.xa-list'); }

  /* ---------- writing the controls the export reads ---------- */
  function setModel(id, v) {
    const e = $(id);
    if (!e) return;
    ui.list = null;
    e.value = v;
    e.dispatchEvent(new Event('change', { bubbles: true }));   // their own listeners: syncExportFormat, the Custom rows
    sync();
  }
  // straight into a box, inside the same tap, so a phone keyboard comes up with it
  function focusBox(id) {
    const e = $(id);
    if (!e || !e.getClientRects().length) return;
    try { e.focus({ preventScroll: true }); } catch (x) { e.focus(); }
    try { e.select(); } catch (x) {}
    try { e.scrollIntoView({ block: 'nearest' }); } catch (x) {}
  }
  function pickKind(k) {
    const fmt = k === 'sound' ? (ui.sound === 'm4a' ? 'audiom4a' : 'audio') : FMT[k];
    if (!fmt) return;
    setModel('exp-format', fmt);
  }
  function toggleAlpha() {
    const t = $('exp-transparent');
    if (!t || t.disabled) return;
    t.checked = !t.checked;
    t.dispatchEvent(new Event('change', { bubbles: true }));
    sync();
  }
  // Exact… picked again while it is already the choice: the list folds away like any other pick (review, 16 Oct — it
  // used to stay open over the boxes), then on to the boxes
  function pickExactSize() {
    if (val('exp-res') !== 'custom') setModel('exp-res', 'custom');
    else { ui.list = null; sync(); }
    focusBox('exp-cw');
  }
  function pickExactFps() {
    if (val('exp-fps') !== 'custom') setModel('exp-fps', 'custom');
    else { ui.list = null; sync(); }
    focusBox('exp-fps-num');
  }

  /* ---------- the lists, built only while one is open ---------- */
  function sizeItems(f) {
    const out = [], sel = $('exp-res');
    if (!sel) return out;
    [].forEach.call(sel.options, function (o) {
      if (o.value === 'custom') return;
      const s = parseFloat(o.value) || 1;
      const d = dimsFor(f, f.kind, s, 0, 0);
      const p = /^(\d+)p\b/.exec(o.textContent || '');
      out.push({
        value: o.value,
        title: s === 1 ? 'Same as project' : (p ? p[1] + 'p' : o.textContent),
        hint: d[0] + '×' + d[1] + ' · ' + (s === 1 ? 'full detail' : (RUNG_HINT[p && p[1]] || 'smaller')),
        rec: s === 1,
        on: f.res === o.value || (f.kind === 'picture' && f.custom && s === 1),
        right: f.kind === 'video' ? 'about ' + mb(mp4Bytes(f, s, 0, 0, f.fps, f.q, f.len)) : '',
        pick: function () { setModel('exp-res', o.value); }
      });
    });
    if (f.kind !== 'picture') {
      out.push({ value: 'custom', title: 'Exact size…', hint: 'any width × height — fitted in, never cropped', on: f.custom,
        right: f.custom ? dims(f).join('×') : '', pick: pickExactSize });
    }
    return out;
  }
  function fpsHint(n) { return n <= 15 ? 'choppy, a small file' : n < 30 ? 'film-like' : n < 50 ? 'standard' : n <= 60 ? 'smooth' : 'very smooth, a big file'; }
  function fpsItems(f) {
    const out = [], sel = $('exp-fps'), pf = f.P.fps || 30;
    if (!sel) return out;
    [].forEach.call(sel.options, function (o) {
      if (o.value === 'custom') return;
      const n = o.value === 'project' ? pf : (parseFloat(o.value) || 30);
      out.push({
        value: o.value,
        title: o.value === 'project' ? 'Same as project' : fpsTxt(n) + ' fps',
        hint: (o.value === 'project' ? fpsTxt(pf) + ' fps' : fpsHint(n)) + (f.kind === 'gif' && n > 50 ? ' · a GIF plays it at 50' : ''),
        rec: o.value === 'project',
        on: f.fpsSel === o.value,
        right: f.kind === 'video' ? 'about ' + mb(mp4Bytes(f, f.scale, f.outW, f.outH, n, f.q, f.len)) : '',
        pick: function () { setModel('exp-fps', o.value); }
      });
    });
    out.push({ value: 'custom', title: 'Exact fps…', hint: 'any rate from 1 to 120', on: f.fpsSel === 'custom',
      right: f.fpsSel === 'custom' ? fpsTxt(f.fps) + ' fps' : '', pick: pickExactFps });
    return out;
  }
  function qualityItems(f) {
    const out = [], sel = $('exp-quality');
    if (!sel) return out;
    [].forEach.call(sel.options, function (o) {
      out.push({ value: o.value, title: QNAME[o.value] || o.textContent, hint: QHINT[o.value] || '', rec: o.value === '0.18',
        on: val('exp-quality') === o.value,
        right: 'about ' + mb(mp4Bytes(f, f.scale, f.outW, f.outH, f.fps, parseFloat(o.value) || 0.1, f.len)),
        pick: function () { setModel('exp-quality', o.value); } });
    });
    return out;
  }
  function soundItems(f) {
    return [
      { value: 'audio', title: 'WAV', hint: 'always works', rec: true, on: f.fmt === 'audio', right: 'about ' + mb(soundBytes(false, f.len)),
        pick: function () { ui.sound = 'wav'; setModel('exp-format', 'audio'); } },
      { value: 'audiom4a', title: 'M4A', hint: 'about 10× smaller — if this browser cannot make it, you get the WAV', on: f.fmt === 'audiom4a',
        right: 'about ' + mb(soundBytes(true, f.len)), pick: function () { ui.sound = 'm4a'; setModel('exp-format', 'audiom4a'); } }
    ];
  }
  function partItems(f) {
    const out = [], sel = $('exp-range');
    if (!sel) return out;
    [].forEach.call(sel.options, function (o) {
      const v = o.value;
      let dis = !!o.disabled, hint = '';
      // greyed BEFORE he can pick it, with how to set it, instead of the "No region marked" toast after Export (mapping 34)
      if (v === 'loop' && !hasMarks()) { dis = true; hint = 'mark them with [ and ] or the ⋯ menu'; }
      if (v === 'clip' && dis) hint = 'select a clip first';
      out.push({ value: v, title: PART[v] || o.textContent, hint: hint, rec: v === 'whole', dis: dis, on: f.range === v,
        right: dis ? '' : clock(spanLen(v)), pick: function () { setModel('exp-range', v); } });
    });
    return out;
  }
  const ITEMS = { size: sizeItems, fps: fpsItems, quality: qualityItems, sound: soundItems, part: partItems };
  function optNode(it, k) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'xa-opt' + (it.on ? ' on' : '');
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', it.on ? 'true' : 'false');
    b.dataset.value = it.value;   // the value this choice writes into the control the export reads
    if (it.dis) b.disabled = true;
    const t = span('t'), t1 = span('t1'), t2 = span('t2');
    t1.appendChild(span('nm', it.title));
    if (it.right) t1.appendChild(span('n', it.right));
    t.appendChild(t1);
    if (it.rec) { const r = span('xa-rec'); r.appendChild(star()); r.appendChild(document.createTextNode('Recommended')); t2.appendChild(r); }
    if (it.hint) t2.appendChild(span('h', it.hint));
    if (t2.childNodes.length) t.appendChild(t2);
    b.appendChild(span('xa-rad'));
    b.appendChild(t);
    /* A pick folds its list away, and this button with it — so a choice made from the keyboard used to drop focus to the
       page (review, 16 Oct): the next Tab started from the top of the editor behind the card. It goes back to the row the
       list belongs to, unless the pick put it somewhere on purpose (Exact size… goes to its width box). */
    b.addEventListener('click', function () {
      if (b.disabled) return;
      const had = document.activeElement === b;
      it.pick();
      const a = document.activeElement, r = rowBtn(k);
      if (had && r && (!a || a === document.body || !a.isConnected)) {
        try { r.focus({ preventScroll: true }); } catch (x) { r.focus(); }
      }
    });
    return b;
  }
  function fillList(k, f) {
    const L = listEl(k);
    if (!L) return;
    L.textContent = '';
    ITEMS[k](f).forEach(function (it) { L.appendChild(optNode(it, k)); });
    if (k === 'part') L.appendChild(span('xa-lnote', 'Stays picked until you close FreeMotion'));
  }

  /* ---------- drawing the card ---------- */
  function sizeWords(f) {
    const d = dims(f), wh = d[0] + '×' + d[1];
    if (f.kind === 'gif') {
      const raw = dimsFor(f, 'frames', f.scale, f.outW, f.outH);   // the same settings before the GIF's 640 cap
      if (raw[0] !== d[0] || raw[1] !== d[1]) return ['Biggest a GIF allows', wh];
    }
    if (f.custom && f.kind !== 'picture') return ['Exact size', wh];
    if (f.scale === 1) return ['Same as project', wh];
    const o = [].find.call(($('exp-res') || { options: [] }).options, function (x) { return x.value === f.res; });
    const p = o && /^(\d+p)\b/.exec(o.textContent || '');
    return [p ? p[1] : 'Smaller', wh];
  }
  function fpsWords(f) {
    let n = f.fps, tail = f.fpsSel === 'project' ? 'same as project' : f.fpsSel === 'custom' ? 'exact' : '';
    if (f.kind === 'gif' && n > 50) { n = 50; tail = 'the most a GIF plays'; }
    return [fpsTxt(n) + ' fps', tail];
  }
  function summary(f) {
    const d = dims(f), wh = d[0] + '×' + d[1], m4a = f.fmt === 'audiom4a';
    $('xa-big').textContent = NAME[f.kind] + ' · ' + (f.kind === 'picture' ? 'at ' + clock(FM.time || 0) : clock(f.len));
    const small = $('xa-small');
    if (f.kind === 'video') txt(small, [nwb(wh), ' · ', nw(fpsTxt(f.fps) + ' fps'), ' · ', nw(['about ', [mb(mp4Bytes(f, f.scale, f.outW, f.outH, f.fps, f.q, f.len))]])]);
    else if (f.kind === 'gif') txt(small, [nwb(wh), ' · ', nw(fpsTxt(Math.min(50, f.fps)) + ' fps'), ' · loops · ', nw('size shown when done')]);
    else if (f.kind === 'picture') txt(small, [nwb(wh), ' · PNG · ', nw('the frame under the playhead')]);
    else if (f.kind === 'sound') txt(small, [nwb(m4a ? 'M4A' : 'WAV'), ' · ', nw(m4a ? 'AAC 160 kb/s' : '48 kHz stereo'), ' · ', nw(['about ', [mb(soundBytes(m4a, f.len))]])]);
    else txt(small, [nwb(wh), ' · ', nw(fpsTxt(f.fps) + ' fps'), ' · ', framesOver(f) ? nw(frameCount(f) + ' frames, over the ' + framesMax() + '-frame limit') : nw(frameCount(f) + ' PNGs in a ZIP')]);
    // one layer is never silent: it says so in amber, under the summary (mapping 18)
    const L = soloLayer();
    $('xa-only').classList.toggle('hidden', !L);
    $('xa-only-t').textContent = L ? 'Only the “' + (L.name || L.type || 'Layer') + '” layer' : '';
    $('xa-thumb').classList.toggle('snd', f.kind === 'sound');
  }
  function note(f) {
    const n = $('xa-note');
    let t = '';
    if (f.kind === 'gif') {
      const d = dims(f), raw = dimsFor(f, 'frames', f.scale, f.outW, f.outH);
      t = 'A GIF is at most 640 px on its longest side, 50 fps and 256 colours' + ((raw[0] !== d[0] || raw[1] !== d[1]) ? ' — so this one comes out ' + d[0] + '×' + d[1] + '.' : '.');
    } else if (f.kind === 'sound') t = 'Just the soundtrack, no picture.';
    else if (f.kind === 'picture') t = 'The frame under the playhead, as a PNG. Slide to the moment you want first.';
    else if (f.kind === 'frames') t = framesOver(f) ? 'A ZIP of PNGs holds at most ' + framesMax() + ' frames, and this is ' + frameCount(f) + '. Shorten the Part or lower the Smoothness to export it.' : 'Every frame as its own PNG, all in one ZIP.';
    n.textContent = t;
    n.classList.toggle('hidden', !t);
  }
  function rows(f) {
    const show = ROWS[f.kind];
    ['size', 'fps', 'quality', 'alpha', 'sound', 'part'].forEach(function (k) { const g = grp(k); if (g) g.classList.toggle('hidden', !show[k]); });
    if (ui.list && !show[ui.list]) ui.list = null;
    const sz = sizeWords(f);
    txt(rowV('size'), [[sz[0]], ' · ', nw(sz[1])]);
    const fw = fpsWords(f);
    txt(rowV('fps'), [nwb(fw[0]), fw[1] ? ' · ' : '', fw[1] ? nw(fw[1]) : '']);
    const qv = val('exp-quality');
    txt(rowV('quality'), [[QNAME[qv] || 'Custom'], ' · ', nw('about ' + mb(mp4Bytes(f, f.scale, f.outW, f.outH, f.fps, f.q, f.len)))]);
    const t = $('exp-transparent'), alphaOn = !!(t && t.checked);
    const ar = $('xa-alpha-row');
    if (ar) { ar.setAttribute('aria-checked', alphaOn ? 'true' : 'false'); txt(ar.querySelector('.v'), [[alphaOn ? 'On' : 'Off']]); }
    const m4a = f.fmt === 'audiom4a';
    txt(rowV('sound'), [[m4a ? 'M4A' : 'WAV'], ' · ', nw(m4a ? 'about 10× smaller' : 'always works')]);
    if (f.range === 'loop' && !hasMarks()) txt(rowV('part'), [['Between your marks'], ' · ', nw('not set, so the whole video · ' + clock(f.len))]);
    else if (f.range === 'clip' && !(f.len > 0)) txt(rowV('part'), [['Selected clip'], ' · ', nw('nothing selected')]);
    else txt(rowV('part'), [[PART[f.range] || 'Whole video'], ' · ', nw(clock(f.len))]);
    // the exact boxes sit under the row they belong to, and only once Exact is picked (they are the real #exp-cw, #exp-ch
    // and #exp-fps-num, so what is typed is what runExport reads)
    const cf = $('exp-custom-field'), cfps = $('exp-custom-fps');
    if (cf) cf.classList.toggle('hidden', !(f.custom && show.size && f.kind !== 'picture'));
    if (cfps) cfps.classList.toggle('hidden', !(f.fpsSel === 'custom' && show.fps));
    LISTS.forEach(function (k) {
      const b = rowBtn(k), L = listEl(k), open = ui.list === k;
      if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!L) return;
      L.classList.toggle('hidden', !open);
      if (open) fillList(k, f); else L.textContent = '';
    });
  }
  function more(f) {
    const btn = $('xa-more'), body = $('xa-morebody'), sub = $('xa-more-s');
    btn.setAttribute('aria-expanded', ui.more ? 'true' : 'false');
    body.classList.toggle('hidden', !ui.more);
    sub.textContent = ui.more ? '' : MORE_SUB[f.kind];
    sub.classList.toggle('hidden', ui.more);
    const show = ROWS[f.kind];
    const sizeOk = !!show.size && f.kind !== 'picture', fpsOk = !!show.fps;
    const alphaOk = f.fmt === 'gif' || f.fmt === 'frames';
    const t = $('exp-transparent'), alphaOn = !!(t && t.checked && alphaOk);
    $('xa-m-alpha').classList.toggle('hidden', f.kind === 'sound');
    const sw = $('xa-alpha-sw');
    sw.disabled = !alphaOk;
    sw.setAttribute('aria-checked', alphaOn ? 'true' : 'false');
    // the reason it is greyed names the kind he picked: "a video can't hold it" under Picture was not true of a PNG (review)
    $('xa-m-alpha-s').textContent = alphaOk ? 'Clear wherever nothing is drawn' : 'GIF and Frames only' + (f.kind === 'video' ? ' — a video can’t hold it' : '');
    $('xa-m-size').classList.toggle('hidden', !sizeOk);
    $('xa-m-fps').classList.toggle('hidden', !fpsOk);
    const sb = $('xa-m-size-b'), fb = $('xa-m-fps-b');
    sb.textContent = f.custom && sizeOk ? dims(f).join(' × ') : 'Set…';
    sb.classList.toggle('on', f.custom && sizeOk);
    fb.textContent = f.fpsSel === 'custom' && fpsOk ? fpsTxt(f.fps) + ' fps' : 'Set…';
    fb.classList.toggle('on', f.fpsSel === 'custom' && fpsOk);
    const n = (soloLayer() ? 1 : 0) + (alphaOn ? 1 : 0) + (f.custom && sizeOk ? 1 : 0) + (f.fpsSel === 'custom' && fpsOk ? 1 : 0);
    const on1 = $('xa-on1');
    on1.textContent = n ? n + ' on' : '';
    on1.classList.toggle('hidden', !n);
    tech(f);
  }
  // runExport's file names (the project's name, cleaned the same way) and the fixed choices no control sets (mapping 33)
  function fileBase(fallback) { return ((FM.scene.project.name || '').replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim()) || fallback; }
  function tech(f) {
    const m4a = f.fmt === 'audiom4a';
    let what, file;
    if (f.kind === 'video') { what = 'H.264 video and AAC sound at 160 kb/s 48 kHz, a key frame every 2 s, an even width and height, at most 80 Mb/s'; file = fileBase('freemotion-export') + '.mp4'; }
    else if (f.kind === 'gif') { what = '256 colours a frame, at most 640 px on the longest side and 50 fps, plays on a loop'; file = fileBase('freemotion-export') + '.gif'; }
    else if (f.kind === 'picture') {
      const t = FM.frameExportTime ? FM.frameExportTime(FM.time || 0) : (FM.time || 0);
      what = 'a PNG of the frame under the playhead'; file = fileBase('frame') + '-' + (+t || 0).toFixed(2) + 's.png';
    }
    else if (f.kind === 'sound') { what = m4a ? 'AAC at 160 kb/s 48 kHz in an .m4a — if this browser cannot make AAC you get the WAV' : '16-bit WAV, 48 kHz stereo'; file = fileBase('project') + (m4a ? '.m4a' : '.wav'); }
    else { what = 'one PNG for every frame, in a ZIP, at most 900 frames'; file = fileBase('freemotion-export') + '_frames.zip'; }
    txt($('xa-tech'), [['Technical details'], ' — ' + what + ', file named “' + file + '”.']);
  }
  function goLabel(f) {
    const go = $('exp-go');
    if (!go) return;
    const m4a = f.fmt === 'audiom4a';
    let k = 'Export video', s = '';
    if (f.kind === 'video') s = 'about ' + mb(mp4Bytes(f, f.scale, f.outW, f.outH, f.fps, f.q, f.len));
    else if (f.kind === 'gif') k = 'Export GIF';
    else if (f.kind === 'picture') k = 'Save picture';
    else if (f.kind === 'sound') { k = 'Export sound'; s = 'about ' + mb(soundBytes(m4a, f.len)); }
    else k = 'Export frames';
    go.disabled = framesOver(f);   // bughunt6 #12: nothing to tap that can only be refused (every other kind re-enables it here)
    go.textContent = '';
    go.appendChild(span('xa-go-k', k));
    if (s) go.appendChild(span('xa-go-s', ' · ' + s));   // the space keeps its name "Export video · about 34 MB" when read aloud
  }

  function sync() {
    const c = card();
    if (!c || !FM.scene || !FM.scene.project || !$('exp-format')) return;
    const f = facts();
    if (f.fmt === 'audiom4a') ui.sound = 'm4a'; else if (f.fmt === 'audio') ui.sound = 'wav';
    c.querySelectorAll('.xa-kind').forEach(function (b) {
      const on = b.dataset.kind === f.kind;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    summary(f); note(f); rows(f); more(f); goLabel(f);
  }
  // a control changed underneath the card (a test, a typed box, a listener) — redraw once, after every listener has run
  let queued = false;
  function later() {
    if (queued) return;
    queued = true;
    Promise.resolve().then(function () { queued = false; sync(); });
  }

  /* The picture: the frame he is looking at, as the FILE will hold it. Drawn once per open — the card is modal, so the
     playhead cannot move under it. Sized to fit the PC's 150×222 box at 2×; CSS fits it into the phone's smaller one.
     ⚠️ RENDERED, NOT COPIED OFF #preview (review, 16 Oct). The preview canvas also carries what is never exported: the View
     menu's isolate (on PC the Export button stays up with a clip isolated, and the file holds every layer — compositor),
     the guides and the onion skin drawn over the frame (app.js render()), and when zoomed in only the visible slice
     (__fmCrop), which a copy stretched to the project's shape. So it renders the scene at this size the way
     FM.snapshotPNG does — the isolate and the crop tool's whole-frame view held aside for the one render — at the time
     the preview shows (FM._endInstantTime). The copy is kept only as the fallback if a render throws. */
  function drawThumb() {
    const c = $('xa-pic'), src = $('preview'), P = FM.scene && FM.scene.project;
    if (!c || !P || !(P.width > 0) || !(P.height > 0)) return;
    const k = Math.min(300 / P.width, 444 / P.height);
    c.width = Math.max(1, Math.round(P.width * k));
    c.height = Math.max(1, Math.round(P.height * k));
    const g = c.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, c.width, c.height);
    if (FM.renderScene) {
      const isoWas = FM.isolate;
      const held = (FM.scene.layers || []).filter(function (l) { return l && l._cropEditing; });
      FM.isolate = null;
      held.forEach(function (l) { l._cropEditing = false; });
      try {
        const t = FM._endInstantTime ? FM._endInstantTime(FM.scene, FM.time || 0) : (FM.time || 0);
        FM.renderScene(g, FM.scene, t);
        return;
      } catch (e) {
        try { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, c.width, c.height); } catch (x) {}
      } finally {
        FM.isolate = isoWas;
        held.forEach(function (l) { l._cropEditing = true; });
      }
    }
    try { if (src && src.width > 0 && src.height > 0 && !src.__fmCrop) g.drawImage(src, 0, 0, c.width, c.height); } catch (e) {}
  }

  function opened() {
    ui.list = null; ui.more = false;
    drawThumb();
    sync();
    const c = card();
    if (c) c.scrollTop = 0;
  }
  function closed() {
    ui.list = null; ui.more = false;
    LISTS.forEach(function (k) { const L = listEl(k); if (L) { L.textContent = ''; L.classList.add('hidden'); } });
    const body = $('xa-morebody'); if (body) body.classList.add('hidden');
  }

  let wired = false;
  function wire() {
    const c = card();
    if (!c || wired) return;
    wired = true;
    c.querySelectorAll('.xa-kind').forEach(function (b) { b.addEventListener('click', function () { pickKind(b.dataset.kind); }); });
    c.querySelectorAll('.xa-row[data-list]').forEach(function (b) {
      b.addEventListener('click', function () { ui.list = ui.list === b.dataset.list ? null : b.dataset.list; sync(); });
    });
    $('xa-alpha-row').addEventListener('click', toggleAlpha);
    $('xa-alpha-sw').addEventListener('click', toggleAlpha);
    $('xa-more').addEventListener('click', function () { ui.more = !ui.more; sync(); });
    $('xa-m-size-b').addEventListener('click', pickExactSize);
    $('xa-m-fps-b').addEventListener('click', pickExactFps);
    ['exp-format', 'exp-res', 'exp-fps', 'exp-quality', 'exp-range', 'exp-transparent'].forEach(function (id) { const e = $(id); if (e) e.addEventListener('change', later); });
    ['exp-cw', 'exp-ch', 'exp-fps-num'].forEach(function (id) { const e = $(id); if (e) e.addEventListener('input', later); });
    /* A tap on the dim around the card closes it, as ✕, Escape and the Export button already do (mapping 22). Only a tap
       that STARTED on the dim: a drag that begins in a box and ends outside the card is not a request to leave.
       …and only the TOPMOST thing (review, 16 Oct). With the layer list open over the card, or the phone keyboard up for
       an exact size, a tap on the dim is how he puts THAT away — it used to close the card as well, and the next open
       starts size, fps and layer again from the project. Those taps only close the list or the keyboard; the next one
       closes the card. A press that starts on the dim and lets go on the card (a mouse drag) does not close it either. */
    const dlg = $('export-dialog');
    let downOut = false;
    dlg.addEventListener('pointerdown', function (e) {
      const a = document.activeElement;
      const listOpen = !!(FM.contextMenu && FM.contextMenu.isOpen && FM.contextMenu.isOpen());
      // a box on screen with focus — a hidden one (focus left behind by the last open) has no keyboard to put away
      const typing = !!(a && a.tagName === 'INPUT' && dlg.contains(a) && a.getClientRects().length > 0);
      downOut = e.target === dlg && !listOpen && !typing;
    });
    dlg.addEventListener('pointerup', function (e) { if (e.target !== dlg) downOut = false; });
    dlg.addEventListener('click', function (e) {
      const go = e.target === dlg && downOut;
      downOut = false;
      if (go) { const x = $('exp-cancel'); if (x) x.click(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  FM.exportCard = { sync: sync, opened: opened, closed: closed };
})();
