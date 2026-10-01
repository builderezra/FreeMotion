/* #482 batch 4 — the three options for the Filters tab, DOM-injected into the LIVE tab that setup.js left open (a real
   photo layer, a real pick, today's commit bar). Nothing in js/ or styles.css changes; the browser is thrown away.
   window.__b4arg: 'A' | 'B' | 'C' (the bar options), 'hold' (A's bar with ◐ held), 'row' (the open filter row's ◐).

   What is real and what is drawn:
   - REAL: the canvas. Strength 40 % is the app's own compositor drawing the picked container with params.strength 0.4
     (FM._fxPreview — the path the Filters tab already previews through); "held" is the same preview switched off.
   - REAL: "Your filters" — three filters saved with FM.effectPresets in this throw-away profile, listed by
     FM.filters.custom() and thumbnailed by FM.fxThumbs.mountFilter, exactly the calls the row will make.
   - REAL: the search results in C — FM.filters.all() matched on name, description and ingredient labels.
   - DRAWN: the new buttons, built from the app's own classes (fxb-commit-*, fx-scrub*, flt-*), so they wear today's
     styles rather than a lookalike. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OPT = String(window.__b4arg || 'A');
const STR = 0.4;
const panel = document.getElementById('inspector-panel');
const L = FM.selectedLayer(FM.scene);
const visualClips = FM.scene.layers.filter(l => l && (l.type === 'image' || l.type === 'video')).length;

const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const CMP_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.8a8.2 8.2 0 0 0 0 16.4z" fill="currentColor"/></svg>';
const SEARCH_SVG = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
const css = h('style');
css.textContent = `
  .b4-cmp { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center;
            background: var(--panel-2); border: 1px solid var(--line); color: var(--text); padding: 0; }
  .b4-cmp.held { background: var(--accent); border-color: var(--accent); color: #04120f; box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 30%, transparent); }
  .b4-col { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; padding-top: 16px !important;
           background: linear-gradient(to top, var(--panel, #10141d) calc(100% - 12px), rgba(16, 20, 29, 0)) !important; }
  .b4-line { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .b4-line .fx-scrub { flex: 1 1 auto !important; order: 0 !important; height: 36px; min-width: 60px; }
  .b4-line .fx-scrub-val { width: 50px; height: 32px; }
  .b4-line .fx-scrub-label { min-width: 0; flex: none; font-size: 12px; }
  .b4-all { flex: 0 1 auto; padding: 10px 12px; border-radius: 10px; background: transparent; border: 1.5px solid var(--accent);
            color: var(--accent); font-size: 13px; font-weight: 700; white-space: nowrap; }
  .b4-x { flex: 0 0 auto; width: 40px; height: 40px; padding: 0; border-radius: 10px; background: var(--panel-2); border: 1px solid var(--line);
          color: var(--text-dim); font-size: 15px; }
  .b4-seg { flex: 0 0 auto; display: flex; padding: 3px; gap: 2px; border-radius: 11px; background: var(--panel-2); border: 1px solid var(--line); }
  .b4-seg > span { padding: 8px 10px; border-radius: 8px; font-size: 12.5px; color: var(--text-dim); white-space: nowrap; font-weight: 600; }
  .b4-seg > span.on { background: color-mix(in srgb, var(--accent) 22%, var(--panel-2)); color: var(--text); box-shadow: inset 0 0 0 1.5px var(--accent); }
  .b4-split { flex: 1 1 auto; display: flex; min-width: 0; }
  .b4-split .fxb-commit-go { border-radius: 10px 0 0 10px; white-space: nowrap; }
  .b4-split .b4-caret { flex: 0 0 auto; width: 36px; border: none; border-left: 1px solid rgba(4,18,15,.28); border-radius: 0 10px 10px 0;
            background: var(--accent); color: #04120f; font-size: 13px; font-weight: 800; padding: 0; }
  .b4-mini { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .b4-mini .b4-cap { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-dim); padding: 0 2px; line-height: 13px; }
  .b4-mini .b4-cap b { color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
  .b4-mini .fx-scrub { flex: 0 0 auto !important; order: 0 !important; height: 26px; }
  .b4-scrubval { position: relative; flex: 1 1 auto; min-width: 0; display: flex; }
  .b4-scrubval .fx-scrub { flex: 1 1 auto !important; order: 0 !important; height: 40px; }
  .b4-scrubval .b4-in { position: absolute; right: 5px; top: 5px; bottom: 5px; padding: 0 7px; border-radius: 6px; display: flex; align-items: center;
            background: rgba(8,12,18,.78); color: var(--text); font-size: 12px; font-variant-numeric: tabular-nums; pointer-events: none; }
  .b4-scrubval .b4-lab { position: absolute; left: 6px; top: 5px; bottom: 5px; padding: 0 7px; border-radius: 6px; display: flex; align-items: center;
            background: rgba(8,12,18,.78); color: var(--text-dim); font-size: 11.5px; pointer-events: none; }
  .b4-top { display: flex; gap: 8px; align-items: stretch; }
  .b4-search { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 7px; padding: 0 11px; border-radius: 12px;
               background: var(--panel-2); border: 1px solid color-mix(in srgb, var(--muted, #8fa3b0) 16%, transparent); color: var(--text-dim); }
  .b4-search.typing { border-color: var(--accent); color: var(--text); }
  .b4-search input { flex: 1 1 auto; min-width: 0; background: none; border: 0; outline: 0; color: var(--text); font: inherit; font-size: 14px; padding: 9px 0; }
  .b4-search input::placeholder { color: var(--text-dim); }
  .b4-search .b4-clr { color: var(--text-dim); font-size: 13px; }
  .b4-top .flt-row.flt-empty { width: auto; flex: 0 0 auto; white-space: nowrap; }
  .b4-held-tag { position: fixed; z-index: 50; padding: 4px 10px; border-radius: 999px; background: rgba(8,12,18,.82); color: #fff;
                 font: 600 12px -apple-system, system-ui, sans-serif; letter-spacing: .2px; pointer-events: none; }
  .b4-ring { position: fixed; z-index: 50; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; pointer-events: none;
             background: rgba(255,255,255,.22); box-shadow: 0 0 0 2px rgba(255,255,255,.85), 0 0 0 9px rgba(255,255,255,.18); }
`;
document.head.appendChild(css);

// ---- the canvas: the pick previewed at 40 % by the app's own compositor ----
function previewAt(s) {
  if (FM._fxPreview && FM._fxPreview.list) FM._fxPreview.list.forEach(b => { b.params = b.params || {}; b.params.strength = s; });
  FM.requestRender && FM.requestRender();
}

// ---- Your filters: three saved in this throw-away profile, the way "Save this effect as preset…" saves them ----
function saveCustom(fid, name, s) {
  const box = FM.filters.makeInstance(fid); if (!box) return;
  box.params = box.params || {}; box.params.strength = s;
  const p = FM.effectPresets.capture(box, name); if (p) FM.effectPresets.save(p);
}
if (!FM.filters.custom().length) {
  saveCustom('goldenhour', 'Beach sunset', 0.7);
  saveCustom('vhs', 'Retro tape', 0.85);
  saveCustom('noir', 'Tuff B&W', 1);
}
if (FM.hideToast) FM.hideToast();

function tile(f) {
  const row = h('button', 'flt-tile'); row.dataset.b4 = f.id;
  const th = h('div', 'flt-thumb'); const cv = h('canvas', 'flt-thumb-cv'); th.appendChild(cv); row.appendChild(th);
  if (FM.fxThumbs && FM.fxThumbs.mountFilter) FM.fxThumbs.mountFilter(cv, f.id);
  row.appendChild(h('div', 'flt-name', f.name));
  const star = h('button', 'flt-fave', '☆'); row.appendChild(star);
  return row;
}
function rail(list) {
  const r = h('div', 'flt-rail'); const g = h('div', 'flt-grid');
  list.forEach(f => g.appendChild(tile(f))); r.appendChild(g); return r;
}

// ---- the top of the tab: the search field shares the Empty filter row (all three options) ----
const sec = panel.querySelector('.flt-commit').parentElement;
const empty = sec.querySelector('.flt-row.flt-empty');
const top = h('div', 'b4-top');
const search = h('label', 'b4-search'); search.innerHTML = SEARCH_SVG;
const inp = h('input'); inp.placeholder = 'Search filters'; inp.readOnly = true; search.appendChild(inp);
top.appendChild(search);
empty.querySelector('.flt-name').textContent = '+  Empty';
empty.parentNode.insertBefore(top, empty); top.appendChild(empty);

const firstLabel = sec.querySelector('.insp-sub-label');
const yours = FM.filters.custom();
let searchInfo = null;
if (OPT === 'C') {
  // Search IN USE: the results replace the list while there is text in the field.
  const q = 'night';
  inp.value = q; search.classList.add('typing');
  const clr = h('span', 'b4-clr', '✕'); search.appendChild(clr);
  const match = FM.filters.all().filter(f => {
    const parts = [f.name, f.desc || ''].concat((f.effects || []).map(c => { const r = FM.fxRegistry.get(c.type); return (r && r.label) || c.type; }));
    return parts.join(' ').toLowerCase().indexOf(q) >= 0;
  });
  searchInfo = { q, hits: match.map(f => f.name) };
  [].slice.call(sec.children).forEach(c => { if (c !== top && !c.classList.contains('flt-commit')) c.style.display = 'none'; });
  const lab = h('div', 'insp-sub-label', match.length + ' filters match “' + q + '”');
  sec.insertBefore(lab, sec.querySelector('.flt-commit'));
  sec.insertBefore(rail(match.slice(0, 8)), sec.querySelector('.flt-commit'));
} else if (yours.length) {
  const lab = h('div', 'insp-sub-label', 'Your filters');
  sec.insertBefore(lab, firstLabel);
  sec.insertBefore(rail(yours), firstLabel);
}

// ---- the commit bar ----
const bar = sec.querySelector('.flt-commit');
bar.classList.remove('hidden');
bar.innerHTML = '';
function strip(v, cls) {
  const s = h('div', 'fx-scrub');
  s.innerHTML = '<div class="fx-scrub-ticks" style="width:700px;transform:translateX(' + (-v * 700) + 'px)">' +
    '<div class="fx-scrub-mark end" style="left:0px"></div><div class="fx-scrub-mark end" style="left:700px"></div><div class="fx-scrub-mark" style="left:350px"></div></div>' +
    '<div class="fx-scrub-notch"></div>';
  return s;
}
const pct = Math.round(STR * 100) + '%';
const cmpBtn = () => { const b = h('button', 'b4-cmp'); b.innerHTML = CMP_SVG; b.title = 'Hold to see it without filters'; return b; };
const nPick = 1;
const addTxt = nPick === 1 ? 'Add 1 filter' : 'Add ' + nPick + ' filters';
let cmp = null;

if (OPT === 'A' || OPT === 'hold' || OPT === 'C') {
  bar.classList.add('b4-col');
  const l1 = h('div', 'b4-line');
  l1.appendChild(h('span', 'fx-scrub-label', 'Strength'));
  l1.appendChild(strip(STR));
  const val = h('input', 'fx-scrub-val'); val.value = pct; val.readOnly = true; l1.appendChild(val);
  cmp = cmpBtn(); l1.appendChild(cmp);
  bar.appendChild(l1);
  const l2 = h('div', 'b4-line');
  if (OPT === 'C') {
    l2.appendChild(h('button', 'b4-x', '✕'));
    const seg = h('div', 'b4-seg'); seg.appendChild(h('span', '', 'This clip')); seg.appendChild(h('span', 'on', 'All ' + visualClips));
    l2.appendChild(seg);
    const go = h('button', 'fxb-commit-go', 'Add to ' + visualClips + ' clips'); go.style.whiteSpace = 'nowrap'; l2.appendChild(go);
  } else {
    l2.appendChild(h('button', 'fxb-commit-clear', 'Clear'));
    const go = h('button', 'fxb-commit-go', addTxt); go.style.whiteSpace = 'nowrap'; l2.appendChild(go);
    l2.appendChild(h('button', 'b4-all', 'Add to all ' + visualClips + ' clips'));
  }
  bar.appendChild(l2);
} else if (OPT === 'B') {
  // ONE ROW, today's height: a caption over a short strip, so the strip keeps its ticks and its notch visible.
  cmp = cmpBtn(); bar.appendChild(cmp);
  const sv = h('div', 'b4-mini');
  const cap = h('div', 'b4-cap'); cap.appendChild(h('span', '', 'Strength')); cap.appendChild(h('b', '', pct)); sv.appendChild(cap);
  sv.appendChild(strip(STR));
  bar.appendChild(sv);
  const split = h('div', 'b4-split'); split.style.flex = '0 0 auto';
  const go = h('button', 'fxb-commit-go', addTxt); split.appendChild(go);
  const caret = h('button', 'b4-caret', '\u25BE'); split.appendChild(caret);
  bar.appendChild(split);
}

/* NARROW FALLBACK — the PC Studio inspector is 307 px wide, narrower than the phone. Measured, not guessed: shorten only
   while a line still overflows, in this order: Clear becomes a ✕, the all-clips button drops "Add to", Add drops "1 filter". */
const lines = [].slice.call(bar.querySelectorAll('.b4-line')).concat([bar]);
const over = () => lines.some(l => l.scrollWidth > l.clientWidth + 1);
const narrowSteps = [
  () => { const c = bar.querySelector('.fxb-commit-clear'); if (c) { const x = h('button', 'b4-x', '\u2715'); x.title = 'Clear'; c.replaceWith(x); } },
  () => { const a = bar.querySelector('.b4-all'); if (a) a.textContent = 'All ' + visualClips + ' clips'; },
  () => { const g = bar.querySelector('.fxb-commit-go'); if (g) g.textContent = 'Add'; },
  () => { const l = bar.querySelector('.b4-line .fx-scrub-label'); if (l) l.style.display = 'none'; },
];
const narrowed = [];
for (let i = 0; i < narrowSteps.length && over(); i++) { narrowSteps[i](); narrowed.push(i); }

previewAt(STR);
panel.querySelector('.insp-body') && (panel.querySelector('.insp-body').scrollTop = 0);
[panel, panel.querySelector('.insp-body'), panel.querySelector('.insp-scroll')].forEach(e => { if (e) e.scrollTop = 0; });
let s2 = sec; while (s2 && s2 !== document.body) { if (s2.scrollHeight > s2.clientHeight + 4) s2.scrollTop = 0; s2 = s2.parentElement; }
// window.__b4scroll = 'search': bring the search row to the top of the panel (the short PC band shows nothing else)
if (window.__b4scroll === 'search') {
  let sc = top.parentElement; while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
  if (sc) sc.scrollTop += top.getBoundingClientRect().top - sc.getBoundingClientRect().top - 6;
}
await sleep(900);   // thumbnails mount, the canvas redraws

// B: the ▾ menu open — the app's own context menu, anchored above the caret
if (OPT === 'B') {
  const caret = bar.querySelector('.b4-caret'), r = caret.getBoundingClientRect();
  FM.contextMenu.show(r.right, r.top, [
    { label: 'Add to this clip', action() {} },
    { label: 'Add to all ' + visualClips + ' clips', action() {} },
    { sep: true },
    { label: 'Clear picks', action() {} },
  ]);
  await sleep(450);
  const m = document.getElementById('ctx-menu') || document.querySelector('.ctx-menu');
  if (m) { m.classList.remove('ctx-hinge'); const mr = m.getBoundingClientRect(); m.style.left = Math.round(r.right - mr.width) + 'px'; m.style.top = Math.round(r.top - mr.height - 6) + 'px'; }
}

// hold: ◐ pressed → the preview drops every filter (the same preview switched off), tagged on the canvas
if (OPT === 'hold') {
  cmp.classList.add('held');
  const saved = FM._fxPreview; FM._fxPreview = null; FM.requestRender && FM.requestRender();
  window.__b4saved = saved;
  await sleep(500);
  const cv = document.getElementById('preview').getBoundingClientRect();
  const tag = h('div', 'b4-held-tag', 'Original — no filters'); tag.style.left = (cv.left + 8) + 'px'; tag.style.top = (cv.top + 8) + 'px';
  document.body.appendChild(tag);
  const ring = h('div', 'b4-ring'); ring.style.left = (cv.left + cv.width * 0.62) + 'px'; ring.style.top = (cv.top + cv.height * 0.55) + 'px';
  document.body.appendChild(ring);
  const lab = h('div', 'b4-held-tag', 'or hold here'); lab.style.left = (cv.left + cv.width * 0.62 - 38) + 'px'; lab.style.top = (cv.top + cv.height * 0.55 + 32) + 'px';
  document.body.appendChild(lab);
}
await sleep(300);
const br = bar.getBoundingClientRect(), pr = panel.getBoundingClientRect();
const overflow = [].slice.call(bar.querySelectorAll('button, input, .fx-scrub, .b4-seg')).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.className + ':' + e.textContent);
return {
  opt: OPT, clips: visualClips, narrowed, bar: { top: br.top, h: br.height, w: br.width, left: br.left, right: br.right },
  panel: { top: pr.top, h: pr.height, right: pr.right }, yours: yours.map(f => f.name), search: searchInfo, overflow,
  barRightEdge: Math.max.apply(null, [].slice.call(bar.querySelectorAll('*')).map(e => e.getBoundingClientRect().right)),
};
