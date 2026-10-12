/* render-filters-probe.js — the twelve candidate filters (filter-candidates.js) rendered through the APP'S OWN compositor on
   Ezra's fx-art photos, each beside the three existing filters it sits nearest to on that photo, plus #675's measure re-taken in
   Chrome. For tools/shot.py --js-file. Nothing is changed in the app: candidates are pushed into FM.FILTERS only long enough for
   FM.filters.makeInstance to build their container (the real saneChild path), then taken out again.

   THIS FILE IS AN ASYNC FUNCTION BODY. shot.py wraps any --js that contains "return" as `(async () => { … })()` and prints the
   value it resolves to — cut to 4000 characters. So the images do not come back that way: with ?fmrecv=<port> on the page
   address the probe POSTs its one JSON object to tools/design/plans/new-effects/recv.py on 127.0.0.1:<port> as filters.json
   and returns a short summary. Without it the summary is all you get (the full object stays on window.__fmNewFilters).

   The whole run, from the worktree that holds this file (run-probes.sh does exactly this, plus the slot/ship checks):
     P=<free port>; R=<free port>
     tools/serve.sh $P . &  python3 tools/design/plans/new-effects/recv.py $R /tmp/fm-new-effects &
     python3 tools/shot.py --port $P --path "/index.html?fmrecv=$R" --width 1280 --height 800 --wait 300 \
         --js-file tools/design/plans/new-effects/render-filters-probe.js --out /tmp/fm-new-filters-page.png
     python3 tools/design/plans/new-effects/compose-filters-sheet.py /tmp/fm-new-effects/filters.json /tmp/fm-new-effects/filters-sheet.jpg

   filters.json: { ok, size, cmpSize, rows: [{ id, name, section, subject, desc, from, was, photo, cand, compare: [{ id, name, img }] }],
                   m675: [{ id, mean, colour, plain, near: [[name, d]×3], peer: [id, d], mono? }], ctxFilterOK, ms }
   photo/cand/img are JPEG data URLs: cand at SIZE (720), photo and the comparisons at CMP (360). 12 renders at 720 + 36 at 360
   ≈ 21 full-size renders of work, under the ~25 budget. */
const SIZE = 720, CMP = 360, Q = 0.86, T = 0.001;
const t0 = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.FM && FM.filters && FM.filters.makeInstance && FM.FILTERS && FM.renderScene && FM.makeLayer && FM.media && FM.fxRegistry); i++) await sleep(50);
if (!(window.FM && FM.renderScene && FM.filters)) return { ok: false, error: 'FM never came up' };
const recvPort = (new URLSearchParams(location.search)).get('fmrecv');
const RECV = recvPort && /^\d{2,5}$/.test(recvPort) ? 'http://127.0.0.1:' + recvPort : null;

/* the candidates, from the served tree (one source of truth — this probe carries no copy of them) */
const srcText = await (await fetch('tools/design/plans/new-effects/filter-candidates.js?t=' + Date.now(), { cache: 'no-store' })).text();
const mod = { exports: {} };
new Function('module', 'exports', 'window', srcText)(mod, mod.exports, undefined);
const DATA = mod.exports;
if (!DATA || !Array.isArray(DATA.CANDIDATES)) return { ok: false, error: 'filter-candidates.js did not load' };
const CANDS = DATA.CANDIDATES, COMPARE = DATA.COMPARE || {};

/* build a container exactly the way the Filters tab does: FM.filters.makeInstance (saneChild validation) */
function boxFor(def) {
  const known = FM.FILTERS.some(f => f.id === def.id);
  if (!known) FM.FILTERS.push({ id: def.id, name: def.name, section: def.section, desc: def.desc, effects: def.effects });
  try { return FM.filters.makeInstance(def.id); } finally { if (!known) FM.FILTERS.splice(FM.FILTERS.findIndex(f => f.id === def.id), 1); }
}
const photos = {};
function loadPhoto(key) {
  if (photos[key]) return photos[key];
  photos[key] = new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => bad(new Error('no photo ' + key)); im.src = 'fx-art/' + key + '.jpg?v=1'; });
  return photos[key];
}
const made = [];
/* one square tile: the photo centre-cropped to S, as an image layer with the filter container on it, through FM.renderScene */
async function tile(key, box, S) {
  const im = await loadPhoto(key), side = Math.min(im.naturalWidth, im.naturalHeight);
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  c.getContext('2d').drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, S, S);
  if (!box) return c.toDataURL('image/jpeg', Q);
  const mid = '_newfx_' + key + '_' + S + '_' + made.length;
  FM.media.set(mid, { kind: 'image', el: c, width: S, height: S, duration: 0 });
  if (FM.media.pin) FM.media.pin(mid);
  made.push(mid);
  const L = FM.makeLayer('image', { x: S / 2, y: S / 2, start: 0, duration: 2 }); L.id = mid;
  const fit = FM.fxRegistry.fitToLayer(JSON.parse(JSON.stringify(box)), L);
  if (!fit) throw new Error('fitToLayer kept nothing of ' + box.name);
  L.effects = [fit];
  const o = document.createElement('canvas'); o.width = S; o.height = S;
  FM.renderScene(o.getContext('2d'), { project: { width: S, height: S, fps: 30, duration: 2, background: '#000000' }, layers: [L] }, T);
  return o.toDataURL('image/jpeg', Q);
}

const rows = [], errors = [];
try {
  for (const c of CANDS) {
    const box = boxFor(c);
    if (!box) { errors.push(c.id + ': makeInstance returned null'); continue; }
    if (box.effects.length !== c.effects.length) errors.push(c.id + ': makeInstance kept ' + box.effects.length + ' of ' + c.effects.length);
    const row = { id: c.id, name: c.name, section: c.section, subject: c.subject, desc: c.desc, from: c.from, was: c.was || null,
      photo: await tile(c.subject, null, CMP), cand: await tile(c.subject, box, SIZE), compare: [] };
    for (const id of (COMPARE[c.id] || []).slice(0, 3)) {
      const f = FM.filters.get(id), b = f && FM.filters.makeInstance(id);
      if (!b) { errors.push(c.id + ': no existing filter ' + id); continue; }
      row.compare.push({ id: id, name: f.name, img: await tile(c.subject, b, CMP) });
    }
    rows.push(row);
    await sleep(0);
  }
} finally { made.forEach(id => { try { if (FM.media.remove) FM.media.remove(id); } catch (e) {} }); }

/* #675 RE-TAKEN IN CHROME — tests/tests.js '#675: every added filter sits somewhere the existing set does not', the same frame
   (200x200 #c05030 rect, oversized, t = 1), the same centre box and the same distance. The node table in filter-candidates.js
   is a model of this; this is the thing itself. (#579 for a Black / White one: colour spread over the frame and the nearest
   mono mean.) */
function m675() {
  // exactly the test's set-up: the LIVE scene shrunk to 200 x 200 with one oversized rect, restored afterwards
  const S = FM.scene, P = S.project, keep = S.layers.slice(), ow = P.width, oh = P.height, od = P.duration;
  try {
    P.width = 200; P.height = 200; P.duration = 3;
    S.layers.length = 0;
    return m675on(S);
  } finally {
    S.layers.length = 0; keep.forEach(l => S.layers.push(l));
    P.width = ow; P.height = oh; P.duration = od;
    if (FM.refreshAll) try { FM.refreshAll(); } catch (e) {}
  }
}
function m675on(scene) {
  const W = 200, cv = document.createElement('canvas'); cv.width = W; cv.height = W;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const hero = FM.makeLayer('shape', { shape: 'rect', shapeW: 400, shapeH: 400, fill: '#c05030' });
  hero.start = 0; hero.duration = 3; scene.layers.push(hero);   // oversized: it must cover the frame
  const stats = effects => {
    hero.effects = (effects || []).map(e => JSON.parse(JSON.stringify(e)));
    cx.clearRect(0, 0, W, W); FM.renderScene(cx, scene, 1);
    const d = cx.getImageData(0, 0, W, W).data;
    let n = 0, sum = 0, sp = 0, spAll = 0;
    for (let i = 0; i < d.length; i += 4) spAll += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
    for (let y = 70; y < 130; y++) for (let x = 70; x < 130; x++) {
      const o = (y * W + x) * 4, r = d[o], g = d[o + 1], b = d[o + 2];
      sum += r * 0.299 + g * 0.587 + b * 0.114; sp += Math.max(r, g, b) - Math.min(r, g, b); n++;
    }
    return { mean: sum / n, colour: sp / n, spreadAll: spAll / (W * W) };
  };
  const dist = (a, b) => Math.hypot(a.mean - b.mean, (a.colour - b.colour) * 0.6);
  const plain = stats([]);
  const lib = FM.FILTERS.filter(f => !CANDS.some(c => c.id === f.id)).map(f => Object.assign({ id: f.id, name: f.name, section: f.section }, stats(f.effects)));
  const mine = CANDS.map(c => Object.assign({ id: c.id, section: c.section }, stats(c.effects)));
  return mine.map(m => {
    const near = lib.map(x => [x.name, +dist(m, x).toFixed(1)]).sort((a, b) => a[1] - b[1]).slice(0, 3);
    const peer = mine.filter(o => o !== m).map(o => [o.id, +dist(m, o).toFixed(1)]).sort((a, b) => a[1] - b[1])[0];
    const out = { id: m.id, mean: +m.mean.toFixed(1), colour: +m.colour.toFixed(1), plain: +dist(m, plain).toFixed(1), near: near, peer: peer };
    if (m.section === 'mono') {
      const monos = lib.filter(x => x.section === 'mono').concat(mine.filter(o => o !== m && o.section === 'mono'));
      out.mono = { spreadAll: +m.spreadAll.toFixed(1), nearest: monos.map(x => [x.name || x.id, +Math.abs(x.mean - m.mean).toFixed(1)]).sort((a, b) => a[1] - b[1])[0] };
    }
    out.pass = near[0][1] > 10 && peer[1] > 10 && out.plain >= 8 && (!out.mono || (out.mono.spreadAll <= 4 && out.mono.nearest[1] >= 8));
    return out;
  });
}
let table = null;
try { table = m675(); } catch (e) { errors.push('m675: ' + (e && e.message)); }

const full = { ok: !errors.length, size: SIZE, cmpSize: CMP, rows: rows, m675: table, errors: errors,
  ctxFilterOK: FM.ctxFilterOK ? FM.ctxFilterOK() : null, ms: Date.now() - t0 };
window.__fmNewFilters = full;
let posted = null;
if (RECV) {
  try { posted = await (await fetch(RECV + '/filters.json', { method: 'POST', body: JSON.stringify(full) })).text(); }
  catch (e) { posted = 'POST failed: ' + (e && e.message); }
}
/* the summary shot.py prints (well under its 4000 characters) */
return { ok: full.ok, posted: posted, recv: RECV, rows: rows.length, compareTiles: rows.reduce((n, r) => n + r.compare.length, 0),
  ctxFilterOK: full.ctxFilterOK, ms: full.ms, errors: errors.slice(0, 5),
  m675: (table || []).map(r => r.id + ' ' + r.near[0][0] + ' ' + r.near[0][1] + ' / ' + r.peer[0] + ' ' + r.peer[1] + (r.mono ? ' / mono ' + r.mono.nearest[1] : '') + (r.pass ? '' : ' FAIL')) };
