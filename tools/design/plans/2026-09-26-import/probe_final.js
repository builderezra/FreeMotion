// #960: dry-run BOTH proposed tests (verbatim bodies from plan.md §6) outside the runner, in three simulated trees:
//   'none'       = HEAD
//   'renameIcon' = the JS half only (rename + Import audio gradient), no CSS
//   'full'       = Option A as planned: rename + gradient + BY_LABEL key dropped + the PC strip CSS
// atWideWidth is stubbed (shot.py already runs at a desktop width); sleep is the suite's.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const atWideWidth = async (fn) => { if (matchMedia('(max-width: 700px)').matches) throw new Error('harness not at desktop width'); return fn(); };
const MODE = window.__probeMode || 'none';
const CSS = window.__css || '';
if (MODE === 'full') { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
function importIcon(gid) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<defs><linearGradient id="' + gid + '" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">'
    + '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity=".55"/></linearGradient></defs>'
    + '<path d="M12 16V4M7 9l5-5 5 5" stroke="url(#' + gid + ')"/>'
    + '<path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="url(#' + gid + ')"/>' + '</svg>';
}
const TT = FM.addMenu._tabs(); const media = TT.find(t => t.key === 'media'), audio = TT.find(t => t.key === 'audio');
const mOpt = media.options, aOpt = audio.options, hue0 = FM.addMenu._tileHue;
if (MODE !== 'none') {
  media.options = function () { return mOpt.call(this).map(o => o.label === 'Import' ? Object.assign({}, o, { label: 'Import media', icon: importIcon('fm-ic-imp') }) : o); };
  audio.options = function () { return aOpt.call(this).map(o => o.label === 'Import audio' ? Object.assign({}, o, { icon: importIcon('fm-ic-impau') }) : o); };
  FM.addMenu._tileHue = function (l) { return l === 'Import' ? null : hue0(l); };   // the BY_LABEL 'Import' key removed
}
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(700);
const T = [];
function test(name, opts, fn) { T.push({ name, fn }); }
/*__TESTS__*/
const out = {};
for (const t of T) {
  try { await t.fn(); out[t.name.slice(0, 40)] = 'PASS'; }
  catch (e) { out[t.name.slice(0, 40)] = 'FAIL: ' + e.message.slice(0, 300); }
}
media.options = mOpt; audio.options = aOpt; FM.addMenu._tileHue = hue0;
return { mode: MODE, w: innerWidth, out };
