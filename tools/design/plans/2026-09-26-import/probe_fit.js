// #960: is the PC size difference between the two Import tiles steady-state, or a load-time artefact?
// Measures each tab's Import tile + the fit plan (data-am-fit), twice, several seconds apart. No patch.
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (window.__probeLib !== false) localStorage.setItem('fm.medialib', JSON.stringify([
  { mid: 'pv1', key: 'k1', name: 'Beach.mp4', kind: 'video', audio: false, w: 1080, h: 1920, dur: 6, added: 3 },
  { mid: 'pp1', key: 'k2', name: 'Sunset.jpg', kind: 'image', audio: false, w: 1080, h: 1350, dur: 0, added: 2 },
  { mid: 'pa1', key: 'k3', name: 'Song.mp3', kind: 'video', audio: true, w: 0, h: 0, dur: 95, added: 1 }
])); else localStorage.removeItem('fm.medialib');
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(800);
try { FM.selectLayer(null); } catch (e) {}
await sleep(400);
const phone = innerWidth < 768;
if (phone) { document.getElementById('add-fab').click(); await sleep(700); }
const rootOf = () => phone ? document.querySelector('.addmenu--sheet') : document.querySelector('#inspector-panel .addmenu');
const tab = name => [...rootOf().querySelectorAll('.addmenu-tab')].find(t => t.textContent.trim() === name);
const cardBy = re => [...rootOf().querySelectorAll('.addmenu-card')].find(c => re.test(((c.querySelector('.addmenu-lbl') || {}).textContent || '').trim()));
function m(c) {
  if (!c) return null;
  const r = c.getBoundingClientRect(), s = getComputedStyle(c), i = c.querySelector('svg').getBoundingClientRect(), l = getComputedStyle(c.querySelector('.addmenu-lbl'));
  return Math.round(r.width) + 'x' + Math.round(r.height) + ' pad ' + s.padding + ' ico ' + Math.round(i.width) + ' fs ' + l.fontSize;
}
async function pass(tag) {
  const out = { tag, t: Math.round(performance.now()) };
  const panel = document.getElementById('inspector-panel');
  out.panel = panel ? Math.round(panel.getBoundingClientRect().width) + 'x' + Math.round(panel.getBoundingClientRect().height) : null;
  tab('Media').click(); await sleep(500);
  out.mediaFit = (rootOf().dataset.amFit || 'none') + (rootOf().classList.contains('addmenu--fit') ? ' fit' : '');
  out.media = m(cardBy(/^Import$/));
  tab('Audio').click(); await sleep(500);
  out.audioFit = (rootOf().dataset.amFit || 'none') + (rootOf().classList.contains('addmenu--fit') ? ' fit' : '');
  out.audio = m(cardBy(/^Import audio$/));
  return out;
}
const a = await pass('p1');
await sleep(3000);
const b = await pass('p2');
await sleep(3000);
const c = await pass('p3');
return { w: innerWidth, h: innerHeight, a, b, c };
