/* frames of the first-launch intro in a same-origin iframe (real splash -> intro road), with FM.homeArrow.draw either left
   alone (HEAD) or wrapped as a PROTOTYPE of a fix:
     A1 = wait for the +'s entrance to finish, then draw (the arrow starts once the + has landed)
     A2 = draw at the same moment as today, but measure the + where it WILL land (seek its entrance to the end, read, restore)
   A label in the top-left corner says the mode and the ms since the iframe's #home-screen got .hm-intro. Returns at once;
   shot.py's --frames then photographs the flight. */
const MODE = window.__MODE || 'head';
try { sessionStorage.removeItem('fm.splashed'); sessionStorage.removeItem('fm.session'); } catch (e) {}
const f = document.createElement('iframe');
f.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;border:0;z-index:2147483646;background:#000';
f.src = '/index.html?probeAf=1';
document.body.appendChild(f);
const lab = document.createElement('div');
lab.style.cssText = 'position:fixed;left:6px;top:4px;z-index:2147483647;font:700 13px/1.2 -apple-system,system-ui,sans-serif;color:#fff;background:rgba(200,0,60,.85);padding:3px 7px;border-radius:6px;pointer-events:none';
lab.textContent = MODE; document.body.appendChild(lab);
let wrapped = false, introAt = 0;
function finite(pl) { return pl.getAnimations().filter(a => { const t = a.effect.getComputedTiming(); return isFinite(t.endTime) && a.playState !== 'finished' && a.playState !== 'idle'; }); }
(function tick() {
  let w, d; try { w = f.contentWindow; d = f.contentDocument; } catch (e) {}
  try {
    if (w && w.FM && w.FM.homeArrow && w.FM.homeArrow.draw && !wrapped) {
      wrapped = true; const orig = w.FM.homeArrow.draw;
      if (MODE === 'A1') w.FM.homeArrow.draw = function (o) {
        const pl = d.getElementById('hm-new'), mv = pl ? finite(pl) : [];
        if (!mv.length) return orig.call(this, o);
        Promise.all(mv.map(a => a.finished.catch(() => {}))).then(() => orig.call(this, o));
        return null;
      };
      if (MODE === 'A2') w.FM.homeArrow.draw = function (o) {
        const pl = d.getElementById('hm-new'), mv = pl ? finite(pl) : [];
        const saved = mv.map(a => [a, a.currentTime]);
        mv.forEach(a => { a.currentTime = a.effect.getComputedTiming().endTime; });
        try { return orig.call(this, o); } finally { saved.forEach(s => { s[0].currentTime = s[1]; }); }
      };
    }
    const hs = d && d.getElementById('home-screen');
    if (hs && hs.classList.contains('hm-intro') && !introAt) introAt = w.performance.now();
    if (introAt) lab.textContent = MODE + '  +' + Math.round(w.performance.now() - introAt) + ' ms after intro';
  } catch (e) { lab.textContent = MODE + ' err ' + e; }
  setTimeout(tick, 4);
})();
return 'started ' + MODE;
