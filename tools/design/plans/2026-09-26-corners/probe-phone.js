// Corner-lines prototype for #t-sel (PC layer-action group). Injected by tools/shot.py --js-file.
// Nothing here is written to the repo: it adds one <style> element to the page and swaps its text.
// window.__ZOOM (set by a prefix line) renders the whole page at CSS zoom 2 to imitate a DPR-2 screen.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const Z = window.__ZOOM || 1;
if (Z !== 1) (document.getElementById('timeline-panel') || document.getElementById('transport')).style.zoom = String(Z);   // only the panel: the whole page at zoom lays out at the full viewport and the row lands off-screen (measured: row top 2682 in an 1800 shot)
if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
await sleep(500);
const P = FM.scene.project;
const mk = (name, shape, fill, x, y) => { const l = FM.makeLayer('shape', { name, shape, x: Math.round(P.width * x), y: Math.round(P.height * y), shapeW: Math.round(P.width * 0.3), shapeH: Math.round(P.width * 0.3), fill }); l.start = 0; l.duration = 4; return l; };
const A = mk('Person', 'rect', '#2fd06a', 0.5, 0.35), B = mk('Star', 'ellipse', '#3b6ff0', 0.3, 0.6), C3 = mk('Flame', 'rect', '#e0443a', 0.7, 0.7);
FM.scene.layers.push(A, B, C3);
FM.selectLayer(A.id); FM.refreshAll();
await sleep(500);

const V = {
  A: { w: 1.5, c: 'rgba(255,255,255,.6)',  rx: '60%', ry: '85%', solid: '25%' },
  B: { w: 1.5, c: 'var(--accent)',         rx: '60%', ry: '85%', solid: '25%' },
  C: { w: 2,   c: 'rgba(255,255,255,.85)', rx: '30%', ry: '70%', solid: '35%' },
  D: { w: 1.5, c: 'rgba(255,255,255,.5)',  rx: '95%', ry: '100%', solid: '15%' },
};
const mask = (o, at) => `radial-gradient(ellipse ${o.rx} ${o.ry} at ${at}, #000 ${o.solid}, transparent 100%)`;
const css = o => !o ? '' : `
html #t-sel.has-sel { position: relative; background: none; border: 0; padding: 1px 6px; }
html #t-sel.has-sel::before, html #t-sel.has-sel::after {
  content: ''; position: absolute; inset: 0; pointer-events: none; box-sizing: border-box;
  border-radius: inherit; border: ${o.w}px solid transparent; }
html #t-sel.has-sel::before { border-top-color: ${o.c}; border-right-color: ${o.c};
  -webkit-mask-image: ${mask(o, '100% 0')}; mask-image: ${mask(o, '100% 0')}; }
html #t-sel.has-sel::after { border-bottom-color: ${o.c}; border-left-color: ${o.c};
  -webkit-mask-image: ${mask(o, '0 100%')}; mask-image: ${mask(o, '0 100%')}; }`;
const st = document.createElement('style'); st.id = 'probe-corners'; document.head.appendChild(st);
const res = { iw: innerWidth, hoverNone: matchMedia('(hover: none)').matches, pcRule: matchMedia('(min-width: 701px)').matches, tsel: !!document.getElementById('t-sel'), hasSelAnywhere: document.querySelectorAll('.has-sel').length, selected: FM.scene.selectedId === A.id };
setTimeout(() => { st.textContent = css(V.A); }, 3500);
return res;
