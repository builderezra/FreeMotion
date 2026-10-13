/* render-probe.js — the options sheet for #966 B8 (twelve filter looks), B2 (Colour Flash) and B15 (Shape Wipe), rendered
   through the APP'S OWN compositor on Ezra's fx-art photos, for his pick (#545: he picks the look before anything ships; the
   build did not wait — every variant here is already one of the effect's own options, so his pick sets defaults or deletes
   four looks, nothing more). Nothing in the app is changed: every layer and photo it makes is removed again, and the one
   measure that borrows the live scene (#675's frame) puts it back.

   THIS FILE IS AN ASYNC FUNCTION BODY. tools/shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints
   the value it resolves to, cut to 4000 characters — so the pictures do not come back that way. Each sheet is POSTed as a JPEG
   (a data URL; recv.py decodes it) to the local receiver at 'http://127.0.0.1:' + window.__recv + '/<name>.jpg', where
   window.__recv is the receiver's port as a NUMBER (the slot harness sets it); `?fmrecv=<port>` on the page address works too.
   Without either it still renders and returns the summary (the sheets stay on window.__fmNewSheets as data URLs).

   The run, from the worktree that holds this file (never beside a ship or a mutation — a browser beside ship.sh turned 921 red):
     P=<free port>; R=<free port>
     tools/serve.sh $P . &   python3 tools/design/plans/fxnew-looks/recv.py $R /tmp/fm-fxnew &
     python3 tools/shot.py --port $P --path "/index.html?fmrecv=$R" --width 1280 --height 800 --wait 300 \
         --js-file tools/design/plans/fxnew-looks/render-probe.js --out /tmp/fm-fxnew/page.png

   What it posts (every page is at most ~1.8x as tall as it is wide, so each reaches his phone whole — tall-images lesson):
     b15-shapes-hard.jpg   Shape Wipe's six shapes at Progress 0.5, clouds opening onto the city shot underneath, 9:16 frame
     b15-shapes-soft.jpg   the same six with Edge softness 40 px
     b15-variants.jpg      Progress 0.1 → 0.9, and Invert / turned / stretched / off-centre variants
     b2-flash.jpg          Colour Flash: ten variants as strips of 12 frames over one second on the dusk photo
     b8-looks-p1..p3.jpg   the twelve looks, each big on its own photo beside the photo as shot and the three existing filters
                           it sits nearest to on #675's measure, with that measure re-taken here in Chrome
     b8-lowkey-subject.jpg Autumn on bush, and Low Key on bush (as it was) and on cat (as it is now) — his question
     fxnew-probe.json      the #675 table for the twelve (Etching's first Chrome reading), errors, timings */
const SIZE_T0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.renderScene && FM.filters && FM.fxRegistry && FM.media && FM.makeLayer); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.filters && FM.fxRegistry)) return { ok: false, error: 'FM never came up' };
const LOOKS = ['handheld', 'xray', 'pencil', 'autumn', 'greencode', 'skygrad', 'solarised', 'stainedglass', 'ledwall', 'watercolour', 'darkroom', 'etching'];
const lacks = ['colorflash', 'shapewipe'].filter(t => !FM.fxRegistry.get(t)).concat(LOOKS.filter(id => !FM.filters.get(id)));
if (lacks.length) return { ok: false, error: 'this tree lacks ' + lacks.join(', ') + ' — serve hunt/fxnew-looks' };

const qp = (new URLSearchParams(location.search)).get('fmrecv');
const PORT = (typeof window.__recv === 'number' && window.__recv > 0) ? window.__recv : (qp && /^\d{2,5}$/.test(qp) ? +qp : null);
const RECV = PORT ? 'http://127.0.0.1:' + PORT : null;
const posted = [], errors = [], sheets = {};
async function post(name, body) {
  sheets[name] = body;
  if (!RECV) return;
  try { const r = await fetch(RECV + '/' + name, { method: 'POST', body: body }); posted.push(name + ' ' + (await r.text())); }
  catch (e) { errors.push('POST ' + name + ': ' + (e && e.message)); }
}

/* ---- the photos, as image layers through the real renderer ---- */
const photos = {}, made = [];
function photo(key) {
  if (!photos[key]) photos[key] = new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no photo ' + key)); im.src = 'fx-art/' + key + '.jpg?v=1'; });
  return photos[key];
}
// the photo centre-cropped to W x H as image media, and a fresh layer on it (its own media id, so two layers never share one)
async function photoLayer(key, W, H) {
  const im = await photo(key), ar = W / H;
  let sw = im.naturalWidth, sh = im.naturalHeight; if (sw / sh > ar) sw = sh * ar; else sh = sw / ar;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, W, H);
  const id = '_fxnew_' + key + '_' + W + 'x' + H + '_' + made.length;
  FM.media.set(id, { kind: 'image', el: c, width: W, height: H, duration: 0 }); if (FM.media.pin) FM.media.pin(id);
  made.push(id);
  const L = FM.makeLayer('image', { x: W / 2, y: H / 2, start: 0, duration: 4 }); L.id = id; L.start = 0; L.duration = 4;
  return L;
}
// layers[0] is the TOP layer (an adjustment layer at 0 grades what is below it)
function render(layers, W, H, t) {
  const o = document.createElement('canvas'); o.width = W; o.height = H;
  FM.renderScene(o.getContext('2d'), { project: { width: W, height: H, fps: 30, duration: 4, background: '#0b0e14' }, layers: layers, selectedId: null, selectedIds: [] }, t);
  return o;
}
const fx = (type, over) => { const e = FM.fxRegistry.makeInstance(type); Object.assign(e.params, over || {}); return e; };

/* ---- the page furniture ---- */
function page(W, H, title, sub) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#11151c'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#ffffff'; g.font = 'bold 30px system-ui, sans-serif'; g.fillText(title, 24, 46);
  if (sub) { g.fillStyle = '#9aa4b2'; g.font = '17px system-ui, sans-serif'; wrap(g, sub, 24, 76, W - 48, 22); }
  return { c: c, g: g };
}
function wrap(g, text, x, y, w, lh) {
  let line = '';
  String(text).split(' ').forEach(wd => { const tr = line ? line + ' ' + wd : wd; if (g.measureText(tr).width > w && line) { g.fillText(line, x, y); y += lh; line = wd; } else line = tr; });
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}
function label(g, text, x, y, color, size, bold) { g.fillStyle = color || '#e8ecf2'; g.font = (bold ? 'bold ' : '') + (size || 15) + 'px system-ui, sans-serif'; g.fillText(text, x, y); }
const jpg = c => c.toDataURL('image/jpeg', 0.86);

try {
  /* ════ B15 SHAPE WIPE ════ */
  const SHAPES = ['Circle', 'Ellipse', 'Rectangle', 'Diamond', 'Star', 'Heart'];
  async function wipeTile(over, W, H) {
    const top = await photoLayer('clouds', W, H), under = await photoLayer('city', W, H);
    top.effects = [fx('shapewipe', over)];
    return render([top, under], W, H, 1);
  }
  async function shapesPage(name, title, sub, extra) {
    const TW = 270, TH = 480, M = 24, G = 18, LB = 34, HD = 110;
    const P = page(M * 2 + 3 * TW + 2 * G, HD + 2 * (TH + LB) + M, title, sub);
    for (let i = 0; i < 6; i++) {
      const x = M + (i % 3) * (TW + G), y = HD + Math.floor(i / 3) * (TH + LB);
      P.g.drawImage(await wipeTile(Object.assign({ shape: i, progress: 0.5 }, extra), TW, TH), x, y);
      label(P.g, SHAPES[i] + (i === 0 ? '   — recommended default' : ''), x, y + TH + 24, i === 0 ? '#ffd27a' : null, 16, true);
      await sleep(0);
    }
    await post(name, jpg(P.c));
  }
  await shapesPage('b15-shapes-hard.jpg', 'Shape Wipe — the six shapes', 'Progress 0.5 on your clouds photo, opening onto the city shot underneath (a 9:16 frame). Ellipse and Rectangle take the frame’s own shape, so they reach all four sides together; Circle, Diamond, Star and Heart are drawn true. Hard edge.', {});
  await shapesPage('b15-shapes-soft.jpg', 'Shape Wipe — soft edge', 'The same six with Edge softness 40 px (it is in project pixels, so the phone preview feathers exactly as the export).', { softness: 40 });
  {
    const TW = 160, TH = 284, M = 24, G = 14, LB = 34, HD = 104;
    const P = page(M * 2 + 5 * TW + 4 * G, HD + 2 * (TH + LB) + M, 'Shape Wipe — Progress, and the other controls', 'Top: Circle with Edge softness 30 as Progress runs 0.1 → 0.9 (keyframe it to run the wipe). Bottom: Invert, a Diamond turned 45° (a square), a Star turned 36°, a Heart stretched 150 %, and a Circle centred at 25 % / 30 %.');
    const row1 = [0.1, 0.3, 0.5, 0.7, 0.9].map(p => ['Progress ' + p, { progress: p, softness: 30 }]);
    const row2 = [['Invert', { progress: 0.5, invert: 1 }], ['Diamond, 45°', { shape: 3, progress: 0.5, rotation: 45 }], ['Star, 36°', { shape: 4, progress: 0.5, rotation: 36 }],
                  ['Heart, Stretch 150 %', { shape: 5, progress: 0.5, aspect: 150 }], ['Centre 25 / 30 %', { progress: 0.45, centerx: 25, centery: 30, softness: 20 }]];
    const rows = [row1, row2];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) {
      const x = M + i * (TW + G), y = HD + r * (TH + LB);
      P.g.drawImage(await wipeTile(rows[r][i][1], TW, TH), x, y);
      label(P.g, rows[r][i][0], x, y + TH + 24, null, 14);
      await sleep(0);
    }
    await post('b15-variants.jpg', jpg(P.c));
  }

  /* ════ B2 COLOUR FLASH: strips of 12 frames over one second ════ */
  {
    const FLASH = [
      ['Default — Pulse 2 Hz, Flash length 25 %, Decay, Strength 0.8, white   (recommended)', {}],
      ['Pulse, Sharp, 50 %', { curve: 0, duty: 50 }],
      ['Pulse, Smooth, 50 %', { curve: 1, duty: 50 }],
      ['Pulse, Decay, 50 %', { curve: 2, duty: 50 }],
      ['Random, Pattern 0, Sharp, 25 % — one flash a beat at uneven moments', { mode: 2, curve: 0 }],
      ['Single, Smooth, Progress keyed 0 → 1 over the second — the dip to white', { mode: 1, curve: 1, progress: { kf: [{ t: 0, v: 0, e: 'linear' }, { t: 1, v: 1, e: 'linear' }] } }],
      ['Blend Add, gold', { blend: 1, color: '#ffd060', curve: 0, duty: 50 }],
      ['Blend Screen, sky blue', { blend: 2, color: '#60c0ff', curve: 0, duty: 50 }],
      ['Blend Multiply, red', { blend: 3, color: '#ff3050', curve: 0, duty: 50 }],
      ['Normal, black — a dip to black', { color: '#000000', curve: 1, duty: 50 }],
    ];
    const N = 12, TW = 76, TH = 135, M = 24, G = 4, LB = 28, HD = 110;
    const P = page(M * 2 + N * TW + (N - 1) * G, HD + FLASH.length * (TH + LB) + M, 'Colour Flash — the variants, frame by frame', 'Each row is one second of your dusk photo, 12 frames, the clip starting at the first. Pulse flashes twice a second on the clip’s own clock; every option here is a control on the effect.');
    for (let r = 0; r < FLASH.length; r++) {
      const y = HD + r * (TH + LB);
      label(P.g, FLASH[r][0], M, y + 18, r === 0 ? '#ffd27a' : null, 15, r === 0);
      for (let k = 0; k < N; k++) {
        const L = await photoLayer('dusk', TW, TH);
        L.effects = [fx('colorflash', FLASH[r][1])];
        P.g.drawImage(render([L], TW, TH, k / N), M + k * (TW + G), y + 24);
      }
      await sleep(0);
    }
    await post('b2-flash.jpg', jpg(P.c));
  }

  /* ════ B8 THE TWELVE LOOKS ════ */
  // #675 re-taken in Chrome: exactly the test's frame (the live scene shrunk to 200 x 200, one oversized #c05030 rect, t = 1)
  function m675() {
    const S = FM.scene, Pj = S.project, keep = S.layers.slice(), ow = Pj.width, oh = Pj.height, od = Pj.duration;
    try {
      Pj.width = 200; Pj.height = 200; Pj.duration = 3; S.layers.length = 0;
      const hero = FM.makeLayer('shape', { shape: 'rect', shapeW: 400, shapeH: 400, fill: '#c05030' });
      hero.start = 0; hero.duration = 3; S.layers.push(hero);
      const cv = document.createElement('canvas'); cv.width = 200; cv.height = 200;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      const stats = list => {
        hero.effects = (list || []).map(e => JSON.parse(JSON.stringify(e)));
        cx.clearRect(0, 0, 200, 200); FM.renderScene(cx, S, 1);
        const d = cx.getImageData(0, 0, 200, 200).data; let n = 0, sum = 0, sp = 0;
        for (let y = 70; y < 130; y++) for (let x = 70; x < 130; x++) { const o = (y * 200 + x) * 4, r = d[o], g = d[o + 1], b = d[o + 2]; sum += r * 0.299 + g * 0.587 + b * 0.114; sp += Math.max(r, g, b) - Math.min(r, g, b); n++; }
        return { mean: sum / n, colour: sp / n };
      };
      const plain = stats([]);
      const rows = FM.filters.all().map(f => Object.assign({ id: f.id, name: f.name, section: f.section, isNew: LOOKS.indexOf(f.id) >= 0 }, stats(f.effects)));
      const dist = (a, b) => Math.hypot(a.mean - b.mean, (a.colour - b.colour) * 0.6);
      return rows.filter(r => r.isNew).map(a => {
        const near = rows.filter(b => !b.isNew).map(b => [b.id, b.name, +dist(a, b).toFixed(1)]).sort((p, q) => p[2] - q[2]).slice(0, 3);
        const peer = rows.filter(b => b.isNew && b !== a).map(b => [b.id, +dist(a, b).toFixed(1)]).sort((p, q) => p[1] - q[1])[0];
        const out = { id: a.id, mean: +a.mean.toFixed(1), colour: +a.colour.toFixed(1), plain: +dist(a, plain).toFixed(1), near: near, peer: peer };
        out.pass = near[0][2] > 10 && peer[1] > 10 && out.plain >= 8;
        return out;
      });
    } finally {
      S.layers.length = 0; keep.forEach(l => S.layers.push(l));
      Pj.width = ow; Pj.height = oh; Pj.duration = od;
      try { if (FM.refreshAll) FM.refreshAll(); } catch (e) {}
    }
  }
  let table = [];
  try { table = m675(); } catch (e) { errors.push('m675: ' + (e && e.message)); }
  const byId = {}; table.forEach(r => { byId[r.id] = r; });

  async function lookTile(id, key, S) {
    const L = await photoLayer(key, S, S);
    if (id) { const box = FM.filters.makeInstance(id), fit = box && FM.fxRegistry.fitToLayer(box, L); L.effects = fit ? [fit] : []; }
    return render([L], S, S, 0.001);
  }
  const SEC = {}; FM.filters.sections().forEach(s => { SEC[s.key] = s.label; });
  const NOTE = { handheld: 'The backlog called it Game Boy — that is Nintendo’s, so Handheld.', etching: 'Replaces CCTV, which measured 2.3 from Old Film in Chrome — a near-duplicate.', autumn: 'Takes the only photo with foliage (bush); Low Key moves to cat — see the last page.' };
  const BIG = 300, SM = 145, M = 24, HD = 104, ROW = 370, TXT = 330;
  const W = M + BIG + 14 + SM + 10 + SM + 20 + TXT + M;
  for (let pg = 0; pg < 3; pg++) {
    const ids = LOOKS.slice(pg * 4, pg * 4 + 4);
    const P = page(W, HD + ids.length * ROW + M, 'New filter looks — pick eight of these twelve (' + (pg + 1) + '/3)', 'Each one big on its own photo; beside it the photo as shot and the three filters you already have that it sits nearest to on the #675 measure, taken here in Chrome.');
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i], f = FM.filters.get(id), key = FM.fxThumbs && FM.fxThumbs._filterSubject ? FM.fxThumbs._filterSubject(id) : 'city';
      const y = HD + i * ROW, x2 = M + BIG + 14, r = byId[id];
      P.g.drawImage(await lookTile(id, key, BIG), M, y);
      P.g.drawImage(await lookTile(null, key, SM), x2, y); label(P.g, 'as shot', x2 + 6, y + SM - 8, '#ffffff', 13);
      const near = r ? r.near : [];
      for (let k = 0; k < 3; k++) {
        const nx = x2 + ((k + 1) % 2) * (SM + 10), ny = y + Math.floor((k + 1) / 2) * (SM + 10);
        if (!near[k]) continue;
        P.g.drawImage(await lookTile(near[k][0], key, SM), nx, ny);
        label(P.g, 'today: ' + near[k][1], nx + 6, ny + SM - 8, '#ffffff', 13);
      }
      const tx = x2 + 2 * SM + 10 + 20;
      label(P.g, f.name, tx, y + 26, '#ffffff', 24, true);
      label(P.g, SEC[f.section] || f.section, tx, y + 50, '#9aa4b2', 15);
      P.g.fillStyle = '#e8ecf2'; P.g.font = '16px system-ui, sans-serif';
      let ty = wrap(P.g, f.desc, tx, y + 78, TXT, 21);
      if (r) { P.g.fillStyle = r.pass ? '#9aa4b2' : '#ffb04a'; P.g.font = '14px system-ui, sans-serif'; ty = wrap(P.g, 'Nearest today: ' + r.near[0][1] + ' ' + r.near[0][2] + ' · nearest new: ' + r.peer[0] + ' ' + r.peer[1] + (r.pass ? '' : '  (!) under 10 — too close'), tx, ty + 6, TXT, 19); }
      if (NOTE[id]) { P.g.fillStyle = '#ffd27a'; P.g.font = '14px system-ui, sans-serif'; wrap(P.g, NOTE[id], tx, ty + 6, TXT, 19); }
      await sleep(0);
    }
    await post('b8-looks-p' + (pg + 1) + '.jpg', jpg(P.c));
  }
  {
    const T = 300, G = 18;
    const P = page(M * 2 + 3 * T + 2 * G, HD + T + 44 + M, 'One question: Low Key’s tile photo', 'Autumn needs the only photo with foliage, bush, which Low Key had in the same section (the suite keeps one photo per section). Low Key moved to cat — warm subject, dark ground. Keep it, or pick another?');
    const tiles = [['Autumn on bush', 'autumn', 'bush'], ['Low Key on bush (before)', 'lowkey', 'bush'], ['Low Key on cat (now)', 'lowkey', 'cat']];
    for (let i = 0; i < 3; i++) { const x = M + i * (T + G); P.g.drawImage(await lookTile(tiles[i][1], tiles[i][2], T), x, HD); label(P.g, tiles[i][0], x, HD + T + 26, null, 16, true); }
    await post('b8-lowkey-subject.jpg', jpg(P.c));
  }
  window.__fmNewSheets = sheets;
  await post('fxnew-probe.json', JSON.stringify({ m675: table, errors: errors, posted: posted.slice(), ctxFilterOK: FM.ctxFilterOK ? FM.ctxFilterOK() : null, ms: Date.now() - SIZE_T0 }));
} catch (e) {
  errors.push('probe: ' + (e && e.message));
} finally {
  made.forEach(id => { try { if (FM.media.unpin) FM.media.unpin(id); } catch (e) {} try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} });
}
return { ok: !errors.length, recv: RECV, posted: posted.length, sheets: Object.keys(sheets), errors: errors.slice(0, 5), ms: Date.now() - SIZE_T0 };
