window.__patchFirst=false;
// #960 screenshots: four states on one page, captured with shot.py --frames.
//   frame ~700  : BEFORE, Media tab        frame ~1700 : BEFORE, Audio tab
//   frame ~3300 : AFTER (option), Media    frame ~4300 : AFTER (option), Audio
// window.__opt picks the AFTER look: 'A' (gradient icon + rename) or 'B' (A + a lit top edge on both plates).
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OPT = window.__opt || 'A';
localStorage.setItem('fm.medialib', JSON.stringify([
  { mid: 'pv1', key: 'k1', name: 'Beach.mp4', kind: 'video', audio: false, w: 1080, h: 1920, dur: 6, added: 3 },
  { mid: 'pp1', key: 'k2', name: 'Sunset.jpg', kind: 'image', audio: false, w: 1080, h: 1350, dur: 0, added: 2 },
  { mid: 'pa1', key: 'k3', name: 'Song.mp3', kind: 'video', audio: true, w: 0, h: 0, dur: 95, added: 1 }
]));
const AUDIO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
  + '<defs><linearGradient id="fm-ic-impau" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">'
  + '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity=".55"/></linearGradient></defs>'
  + '<path d="M12 16V4M7 9l5-5 5 5" stroke="url(#fm-ic-impau)"/>'
  + '<path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="url(#fm-ic-impau)"/></svg>';
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(900);
const phone = innerWidth < 768;
const rootOf = () => phone ? document.querySelector('.addmenu--sheet') : document.querySelector('#inspector-panel .addmenu');
const tabBtn = key => rootOf().querySelector('.addmenu-tab[data-key="' + key + '"]') || [...rootOf().querySelectorAll('.addmenu-tab')].find(t => t.textContent.trim().toLowerCase() === key);
async function fresh() {
  if (phone) {
    const sh = document.getElementById('add-sheet'); if (sh && sh.classList.contains('open')) { document.getElementById('add-fab').click(); await sleep(500); }
    document.getElementById('add-fab').click(); await sleep(700);
  } else {
    const L = FM.scene.layers[0];
    if (L) { FM.selectLayer(L.id); await sleep(250); }
    FM.selectLayer(null); await sleep(350);
  }
}
function patch() {
  if (OPT === 'C') { const sc = document.createElement('style'); sc.textContent = "@media (min-width: 701px) {\n  .addmenu--fit .addmenu-pinned .addmenu-card { padding: 5px 3px; gap: 4px; height: auto; }\n  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-ic,\n  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-ic svg { width: 22px; height: 22px; }\n  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-lbl { font-size: 10px; line-height: 1.2; white-space: nowrap; max-height: none; }\n}\n"; document.head.appendChild(sc); }
  if (window.__fixCss !== '') { const fx = document.createElement('style'); fx.textContent = window.__fixCss || '@media (min-width: 701px) { .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-lbl { white-space: nowrap; } }'; document.head.appendChild(fx); }
  const T = FM.addMenu._tabs();
  const media = T.find(t => t.key === 'media'), audio = T.find(t => t.key === 'audio');
  const mOpt = media.options, aOpt = audio.options;
  media.options = function () { return mOpt.call(this).map(o => o.label === 'Import' ? Object.assign({}, o, { label: 'Import media' }) : o); };
  audio.options = function () { return aOpt.call(this).map(o => o.label === 'Import audio' ? Object.assign({}, o, { icon: AUDIO_ICON }) : o); };
  if (OPT === 'B') {
    // Option B: the same icon, plus a lit top edge on BOTH import plates (a 1px white inner highlight + a soft top sheen).
    const st = document.createElement('style');
    st.textContent = '.addmenu-card.addmenu-card--import{box-shadow:inset 0 1px 0 rgba(255,255,255,.34),inset 0 0 0 1px rgba(255,255,255,.06)!important;'
      + 'background-image:linear-gradient(180deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,0) 46%),linear-gradient(158deg,rgba(150,160,176,.30) 0%,rgba(150,160,176,.10) 55%,rgba(255,255,255,.03) 100%)!important;}';
    document.head.appendChild(st);
    const mark = () => document.querySelectorAll('.addmenu-card').forEach(c => { const l = ((c.querySelector('.addmenu-lbl') || {}).textContent || '').trim(); if (l === 'Import media' || l === 'Import audio') c.classList.add('addmenu-card--import'); });
    new MutationObserver(mark).observe(document.body, { childList: true, subtree: true }); mark();
  }
}
if (window.__patchFirst) patch();
await fresh();
tabBtn('media').click();
await sleep(200);
// Is the proposed importIcon('fm-ic-imp') byte-identical (as the browser serialises it) to HEAD's Media icon?
function importIcon(gid) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<defs><linearGradient id="' + gid + '" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">'
    + '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity=".55"/></linearGradient></defs>'
    + '<path d="M12 16V4M7 9l5-5 5 5" stroke="url(#' + gid + ')"/>'
    + '<path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="url(#' + gid + ')"/>' + '</svg>';
}
const headCard = window.__patchFirst ? null : [...rootOf().querySelectorAll('.addmenu-card')].find(c => ((c.querySelector('.addmenu-lbl') || {}).textContent || '').trim() === 'Import');
const tmp = document.createElement('span'); tmp.innerHTML = importIcon('fm-ic-imp');
const helperSame = !!headCard && headCard.querySelector('.addmenu-ic').innerHTML === tmp.innerHTML;
const tmp2 = document.createElement('span'); tmp2.innerHTML = importIcon('fm-ic-impau');
const auSame = tmp2.innerHTML === (function(){ const t = document.createElement('span'); t.innerHTML = AUDIO_ICON; return t.innerHTML; })();
const t0 = performance.now() - 200, at = ms => sleep(Math.max(0, t0 + ms - performance.now()));
(async () => {
  await at(1000); tabBtn('audio').click();
})();
const R = (phone ? document.getElementById('add-sheet') : document.getElementById('inspector-panel')).getBoundingClientRect();
return { phone, w: innerWidth, h: innerHeight, dpr: devicePixelRatio, rect: [Math.round(R.left), Math.round(R.top), Math.round(R.width), Math.round(R.height)], helperSameAsHeadMedia: helperSame, helperSameAsProbeAudio: auSame };
