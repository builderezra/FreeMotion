// (1) the template-fill slot rail: does it draw a native bar on a PC? (16 shape slots, classic bars forced)
// (2) the effects browser's New row: NOW vs option A, shot with --frames 300,2600,4300 (A hover · after one ›).
const R = {};
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(500);
const Ls = [];
for (let i = 0; i < 16; i++) { const l = FM.makeLayer('shape', { name: 'S' + i, shape: 'rect', x: 20 + i * 5, y: 20, shapeW: 40, shapeH: 40, fill: '#3a7bd5' }); l.start = 0; l.duration = 4; Ls.push(l); }
FM.scene.layers.length = 0; Ls.forEach(l => FM.scene.layers.push(l)); FM.refreshAll(); await sleep(300);
const opened = FM.templateFill.open(); await sleep(700);
const ts = document.querySelector('#tpl-fill .tfill-slots');
R.tfill = ts ? { opened, slots: ts.querySelectorAll('.tfill-slot').length, sw: ts.scrollWidth, cw: ts.clientWidth, barPx: ts.offsetHeight - ts.clientHeight, scrollbarWidth: getComputedStyle(ts).scrollbarWidth } : 'no slot rail';
document.querySelector('#tpl-fill .tfill-done').click(); await sleep(400);

FM.scene.layers.length = 0; FM.scene.layers.push(Ls[0]); FM.selectLayer(Ls[0].id); FM.refreshAll(); await sleep(300);
FM.fxBrowser.open(Ls[0]); await sleep(1500);
const row = document.querySelector('#fx-browser .fxb-featured');
row.scrollLeft = 0; row._autoLeft = 0; row.dispatchEvent(new WheelEvent('wheel', { deltaX: 1 }));   // hold the auto-scroll still for the shots (8 s)
const sec = row.parentElement, sr = sec.getBoundingClientRect(), fr = document.getElementById('fx-browser').querySelector('.fxb-scroll').getBoundingClientRect();
R.newRow = { cards: row.querySelectorAll('.fxb-card').length, sw: row.scrollWidth, cw: row.clientWidth, barPx: row.offsetHeight - row.clientHeight, sheet: [Math.round(fr.left), Math.round(fr.width)] };
R.box = { x: Math.round(fr.left), y: Math.round(sr.top - 8), w: Math.round(fr.width), h: Math.round(sr.height + 16) };
setTimeout(() => { PROTO.style('proto-rail', RAIL_CSS); PROTO.style('proto-hover', PROTO.cssHover); PROTO.wrapFeatured(); sec.classList.add('proto-hover'); }, 1200);
setTimeout(() => sec.querySelector('.fm-rail-arrow--next').click(), 3000);
return R;
