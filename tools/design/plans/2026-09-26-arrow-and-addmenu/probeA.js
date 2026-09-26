/* probe (A): where does the drawn arrow's tip land relative to the + — at draw time, and after everything settles?
   Parent page = shot.py's own app (--fresh, so Projects is empty). A same-origin IFRAME boots a second copy with the
   session keys cleared, so it takes the REAL first-launch road (splash -> fm:splash-dismiss -> hm-intro -> arrowSoon),
   and FM.homeArrow.draw is wrapped from outside the moment it exists, to record the +'s rect and animations AT DRAW TIME. */
const U = [Math.cos(-52 * Math.PI / 180), Math.sin(-52 * Math.PI / 180)];
const R1 = v => +(+v).toFixed(1);
function tipOf(doc) {
  const mp = doc.querySelector('#hm-arrow936 mask path'); if (!mp) return null;   // first mask path = the main stroke; last point = E
  const n = mp.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
  return [n[n.length - 2], n[n.length - 1]];
}
function geo(doc) {
  const pl = doc.getElementById('hm-new'); if (!pl) return { plus: null };
  const p = pl.getBoundingClientRect(), r = p.width / 2, c = [p.left + r, p.top + p.height / 2];
  const E = tipOf(doc), o = { plusRect: [p.left, p.top, p.width, p.height].map(R1), plusC: c.map(R1), r: R1(r) };
  if (!E) { o.tip = null; return o; }
  const want = [c[0] + U[0] * (r + 12), c[1] + U[1] * (r + 12)];
  o.tip = E.map(R1); o.tipRel = [R1(E[0] - c[0]), R1(E[1] - c[1])];
  o.tipToCentre = R1(Math.hypot(E[0] - c[0], E[1] - c[1])); o.designedTipToCentre = R1(r + 12);
  o.tipErrPx = R1(Math.hypot(E[0] - want[0], E[1] - want[1]));
  o.tipInsideDisc = Math.hypot(E[0] - c[0], E[1] - c[1]) < r;
  return o;
}
const out = { vw: innerWidth, vh: innerHeight, look: document.documentElement.getAttribute('data-home') };
out.parentAtJsStart = geo(document);
out.parentAnimsAtJsStart = (document.getElementById('hm-new') || { getAnimations: () => [] }).getAnimations().map(a => ({ name: a.animationName || a.id, ct: a.currentTime && Math.round(a.currentTime), state: a.playState }));
out.parentHomeCls = (document.getElementById('home-screen') || {}).className;

try { sessionStorage.removeItem('fm.splashed'); sessionStorage.removeItem('fm.session'); } catch (e) {}
const f = document.createElement('iframe');
f.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;border:0;z-index:2147483647;background:#000';
f.src = '/index.html?probeA=1';
document.body.appendChild(f);
const t0 = performance.now();
let wrapped = false; const ev = {}; const draws = []; const plusTrack = [];
await new Promise(res => {
  function tick() {
    let w = null, d = null;
    try { w = f.contentWindow; d = f.contentDocument; } catch (e) {}
    try {
      if (w && w.FM && w.FM.homeArrow && w.FM.homeArrow.draw && !wrapped) {
        wrapped = true; const orig = w.FM.homeArrow.draw;
        w.FM.homeArrow.draw = function (o) {
          const pl = d.getElementById('hm-new'), rr = pl.getBoundingClientRect();
          const rec = { t: Math.round(w.performance.now()), opts: o || null, plusRectAtDraw: [rr.left, rr.top, rr.width, rr.height].map(R1),
            plusAnims: pl.getAnimations().map(a => ({ name: a.animationName, ct: a.currentTime == null ? null : Math.round(a.currentTime), delay: Math.round(a.effect.getTiming().delay), dur: Math.round(a.effect.getTiming().duration), state: a.playState })),
            homeCls: d.getElementById('home-screen').className };
          const ret = orig.apply(this, arguments);
          rec.geoRightAfterDraw = geo(d); draws.push(rec); return ret;
        };
      }
      const hs = d && d.getElementById('home-screen');
      if (hs) {
        const now = Math.round(w.performance.now());
        if (!ev.homeSeen) ev.homeSeen = now;
        if (hs.classList.contains('hm-preintro') && !ev.preintro) ev.preintro = now;
        if (hs.classList.contains('hm-intro') && !ev.intro) ev.intro = now;
        if (ev.intro && !hs.classList.contains('hm-intro') && !ev.introStripped) ev.introStripped = now;
        const pl = d.getElementById('hm-new');
        if (pl && pl.classList.contains('hm-in-fab') && !ev.fabStamped) { ev.fabStamped = now; ev.fabDelay = pl.style.animationDelay; ev.seqLen = d.querySelectorAll('#home-screen .hm-top > *').length + d.querySelectorAll('#home-screen .hm-tabs > *').length + (d.querySelector('#home-screen .hm-grid') || { children: [] }).children.length; }
        if (pl && ev.intro && plusTrack.length < 400) { const r = pl.getBoundingClientRect(); const last = plusTrack[plusTrack.length - 1]; const row = [now, R1(r.top), R1(r.width)]; if (!last || last[1] !== row[1] || last[2] !== row[2]) plusTrack.push(row); }
        if (d.getElementById('hm-arrow936') && !ev.arrowSeen) ev.arrowSeen = now;
        if (d.getElementById('splash') && !ev.splashSeen) ev.splashSeen = now;
      }
    } catch (e) { ev.err = String(e); }
    if (performance.now() - t0 > 11000) return res();
    setTimeout(tick, 4);
  }
  tick();
});
const d = f.contentDocument;
out.frame = { events: ev, draws, settled: geo(d), homeClsSettled: d.getElementById('home-screen').className,
  plusTrack: plusTrack.slice(0, 22), dpr: f.contentWindow.devicePixelRatio, innerH: f.contentWindow.innerHeight,
  hover: f.contentWindow.matchMedia('(hover: none)').matches };
/* CONTROL, in the parent: the arrow drawn NOW, with the + at rest, must land exactly where the code means it to */
out.parentSettledBefore = geo(document);
if (window.FM && FM.homeArrow) { FM.homeArrow.draw({ still: true }); out.parentRedrawnAtRest = geo(document); }
return out;
