/* queue 981 — the frame strip: a tap on the empty project's area, then the add menu opening AT ONCE with the lights
   running round its edges. Run by tools/design/981/strip.py, which seeks a moment and then shoots it, frame by frame.
   Nothing here is timed by wall clock: every animation is PAUSED and SEEKED to a chosen moment, so a frame shows
   exactly t ms after the press however slow the machine is. A real quick tap lifts ~80 ms after the press, so the
   press's own animations run from t = 0 and everything the click starts (the sheet's swing, the menu's rim, the area
   lap's hand-over fade) runs from t = 80. The removal timers (fxTeardown) are swallowed so no node leaves mid-strip.
   window.__981.colour / .start pick the variant (FM.variant.force — the suite's seam); window.__981.frames the moments. */
const V = window.__981 || { colour: 'A', start: 'bottom', frames: [0, 60, 160, 260, 360, 440, 700] };
const CLICK_AT = 80;
if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
await new Promise(r => setTimeout(r, 600));
FM.scene.layers.length = 0; FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();
await new Promise(r => setTimeout(r, 500));
FM.variant.force('emptytap.colour', V.colour); FM.variant.force('emptytap.start', V.start);
const realST = window.setTimeout;
window.setTimeout = function (fn, ms) {
  if (typeof fn === 'function' && /parentNode\.removeChild\(el\)/.test(String(fn))) return 0;   // fxTeardown
  return realST.apply(window, arguments);
};
const tl = document.getElementById('timeline');
const a = FM._areaFx.area(tl);
const x = a.left + a.width * 0.3, y = a.top + a.height * 0.62;
const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 9, pointerType: 'touch', isPrimary: true, button: 0 };
tl.dispatchEvent(new PointerEvent('pointerdown', Object.assign({}, o, { buttons: 1 })));
const pressAnims = new Set(document.getAnimations());
const keys = document.querySelector('.tl-areafx--press canvas.fx-keys');
const keysHost = keys && keys.parentNode;
if (keysHost) keysHost._fxSeeking = true;
tl.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, o, { buttons: 0 })));
const hit = document.elementFromPoint(x, y);
hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
window.setTimeout = realST;
const sheet = document.getElementById('add-sheet');
const seek = function (t) {
  document.getAnimations().forEach(function (an) {
    const off = pressAnims.has(an) ? 0 : CLICK_AT;
    an.pause();
    an.currentTime = Math.max(0, t - off);
  });
  // before the lift the menu is not there yet
  sheet.style.visibility = t < CLICK_AT ? 'hidden' : '';
  const rim = sheet.querySelector('.add-sheet-rim');
  if (rim) rim.style.visibility = t < CLICK_AT ? 'hidden' : '';
  if (keysHost && keysHost._fxDraw) keysHost._fxDraw(t);
  let lbl = document.getElementById('__981lbl');
  if (!lbl) { lbl = document.createElement('div'); lbl.id = '__981lbl'; lbl.style.cssText = 'position:fixed;left:8px;top:112px;z-index:99999;font:700 13px system-ui;color:#fff;background:rgba(0,0,0,.6);padding:3px 7px;border-radius:6px;pointer-events:none'; document.body.appendChild(lbl); }
  lbl.textContent = V.colour + ' · ' + V.start + ' · ' + t + ' ms' + (t < CLICK_AT ? ' (finger down)' : t === CLICK_AT ? ' (lift: menu opens)' : '');
};
// strip.py calls this before each screenshot, so a slow shot can never let the frames drift apart
window.__981seek = seek;
return { hit: hit.tagName + "." + String(hit.className && hit.className.baseVal !== undefined ? hit.className.baseVal : hit.className), empty: FM._isEmptyStart(), home: FM.home.isOpen(), open: sheet.classList.contains('open'), rim: !!sheet.querySelector('.add-sheet-rim'), start: (sheet.querySelector('.add-sheet-rim') || {}).dataset ? sheet.querySelector('.add-sheet-rim').dataset.start : null, variant: (document.querySelector('.tl-areafx--press') || { dataset: {} }).dataset.variant, pressAnims: pressAnims.size, all: document.getAnimations().length };
