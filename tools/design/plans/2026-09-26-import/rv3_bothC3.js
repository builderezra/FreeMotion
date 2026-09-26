window.__probeMode='bothC3';
// #960: what does the PC fit do to the two Import tiles once the patch is in? Patch FIRST (rename + audio gradient),
// then force a fresh add-menu render, then visit Media/Audio in both orders. window.__probeMode:
//   'none'   — no patch (control)            'rename' — only the label rename
//   'icon'   — only the audio icon            'both'   — rename + icon (option A)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MODE = window.__probeMode || 'both';
if (window.__probeLib !== false) localStorage.setItem('fm.medialib', JSON.stringify([
  { mid: 'pv1', key: 'k1', name: 'Beach.mp4', kind: 'video', audio: false, w: 1080, h: 1920, dur: 6, added: 3 },
  { mid: 'pp1', key: 'k2', name: 'Sunset.jpg', kind: 'image', audio: false, w: 1080, h: 1350, dur: 0, added: 2 },
  { mid: 'pa1', key: 'k3', name: 'Song.mp3', kind: 'video', audio: true, w: 0, h: 0, dur: 95, added: 1 }
])); else localStorage.removeItem('fm.medialib');
const AUDIO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
  + '<defs><linearGradient id="fm-ic-impau" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">'
  + '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity=".55"/></linearGradient></defs>'
  + '<path d="M12 16V4M7 9l5-5 5 5" stroke="url(#fm-ic-impau)"/>'
  + '<path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="url(#fm-ic-impau)"/></svg>';
const T = FM.addMenu._tabs();
const media = T.find(t => t.key === 'media'), audio = T.find(t => t.key === 'audio');
const mOpt = media.options, aOpt = audio.options;
if (MODE === 'bothC3') { const st3 = document.createElement('style'); st3.textContent = "@media (min-width: 701px) {\n  .addmenu--fit .addmenu-pinned { container-type: inline-size; }\n  .addmenu--fit .addmenu-pinned .addmenu-card { padding: 5px 3px; gap: 4px; height: auto; }\n  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-ic,\n  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-ic svg { width: clamp(22px, 7.5cqi, 34px); height: clamp(22px, 7.5cqi, 34px); }\n  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-lbl { font-size: clamp(10px, 3.2cqi, 12px); line-height: 1.2; white-space: nowrap; max-height: none; }\n}\n"; document.head.appendChild(st3); }
if (MODE === 'bothC') { const st = document.createElement('style'); st.textContent = "@media (min-width: 701px) {\n  .addmenu--fit .addmenu-pinned .addmenu-card { padding: 5px 3px; gap: 4px; height: auto; }\n  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-ic,\n  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-ic svg { width: 22px; height: 22px; }\n  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-lbl { font-size: 10px; line-height: 1.2; white-space: nowrap; max-height: none; }\n}\n"; document.head.appendChild(st); }
if (/Fix$/.test(MODE)) { const st = document.createElement('style'); st.textContent = window.__fixCss || '@media (min-width: 701px) { .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-lbl { white-space: nowrap; } }'; document.head.appendChild(st); }
if (MODE === 'rename' || MODE === 'both' || MODE === 'renameFix' || MODE === 'bothFix' || MODE === 'bothC' || MODE === 'bothC3') media.options = function () { return mOpt.call(this).map(o => o.label === 'Import' ? Object.assign({}, o, { label: 'Import media' }) : o); };
if (MODE === 'icon' || MODE === 'both' || MODE === 'bothFix' || MODE === 'bothC' || MODE === 'bothC3') audio.options = function () { return aOpt.call(this).map(o => o.label === 'Import audio' ? Object.assign({}, o, { icon: AUDIO_ICON }) : o); };
window.__fmUnpatch = function () { media.options = mOpt; audio.options = aOpt; };
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(800);
const phone = innerWidth < 768;
try { const L = FM.scene.layers[0]; if (L && !phone) { FM.selectLayer(L.id); await sleep(300); } FM.selectLayer(null); } catch (e) {}
await sleep(500);
if (phone) { document.getElementById('add-fab').click(); await sleep(700); }
const rootOf = () => phone ? document.querySelector('.addmenu--sheet') : document.querySelector('#inspector-panel .addmenu');
const tab = name => [...rootOf().querySelectorAll('.addmenu-tab')].find(t => t.textContent.trim() === name);
const cardBy = re => [...rootOf().querySelectorAll('.addmenu-card')].find(c => re.test(((c.querySelector('.addmenu-lbl') || {}).textContent || '').trim()));
function m(c) {
  if (!c) return null;
  const r = c.getBoundingClientRect(), s = getComputedStyle(c), i = c.querySelector('svg').getBoundingClientRect();
  const lbEl = c.querySelector('.addmenu-lbl'), l = getComputedStyle(lbEl);
  const lines = Math.round(lbEl.getBoundingClientRect().height / (parseFloat(l.lineHeight) || parseFloat(l.fontSize) * 1.15));
  const strokes = [...c.querySelectorAll('svg path')].map(p => p.getAttribute('stroke') || 'cur').join(',');
  const rg = document.createRange(); rg.selectNodeContents(lbEl); const tr = rg.getBoundingClientRect();
  const gap = ' text ' + tr.width.toFixed(1) + 'px, room L ' + (tr.left - r.left).toFixed(1) + ' R ' + (r.right - tr.right).toFixed(1);
  return Math.round(r.width) + 'x' + Math.round(r.height) + ' pad ' + s.padding + ' ico ' + Math.round(i.width) + ' fs ' + l.fontSize + ' lines ' + lines + gap
    + (lbEl.scrollWidth > lbEl.clientWidth + .5 ? ' CLIPPED' : '') + ' [' + strokes + ']';
}
async function visit(name, re) {
  tab(name).click(); await sleep(600);
  const root = rootOf();
  let extra = '';
  if (!phone) {
    const host = document.getElementById('inspector-panel'), body = root.querySelector('.addmenu-body'), pin = root.querySelector('.addmenu-pinned');
    const top = body.getBoundingClientRect().top - host.getBoundingClientRect().top - host.clientTop + host.scrollTop;
    const padB = parseFloat(getComputedStyle(root.parentElement).paddingBottom) || 0;
    extra = ' strip ' + Math.round(pin.getBoundingClientRect().width) + 'w/' + Math.round(pin.getBoundingClientRect().height) + ' bare ' + Math.round(host.clientHeight - top - padB - 2) + ' lib ' + root.querySelectorAll('.addmenu-page .addmenu-card').length;
  }
  return name + ': fit=' + (root.dataset.amFit || 'none') + extra + ' | ' + m(cardBy(re));
}

const mre = /^Import( media)?$/, are = /^Import audio$/;
const out = {};
for (const bh of [270, 262, 254, 246, 238, 230, 210, 190, 150]) {
  document.documentElement.style.setProperty('--tl-h', bh + 'px');
  window.dispatchEvent(new Event('resize'));
  await sleep(500);
  const seq = [];
  seq.push(await visit('Media', mre));
  seq.push(await visit('Audio', are));
  seq.push(await visit('Media', mre));
  out['band' + bh + ' panel ' + Math.round(document.getElementById('inspector-panel').getBoundingClientRect().height)] = seq;
}
return { mode: MODE, w: innerWidth, h: innerHeight, out };
