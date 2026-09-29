/* #482 — Gradient Overlay's default Amount, drawn for him to pick (a taste call: nothing in the app changes).
   Runs INSIDE the app (tools/design/482/render.py injects it). Every tile is the app's own renderer — FM.renderScene
   on a real image layer carrying a real Gradient Overlay from FM.fxRegistry.makeInstance, with only `amount` set —
   rendered at 1080x1080 (the width his phone exports at) and scaled into a tile, so what he sees is what the effect
   does. The photo is 'bay', the one the Effects browser already shows Gradient Overlay on.
   ⚠️ The ask said "Keep = 1 vs Gentler = 0.8". The default is ALREADY 0.8 (it has been since v2.02, 30 Jun — never 1),
   so the tiles say so: 0.8 is Keep, 1.0 is shown only as the reference the ask assumed, and Gentler is below 0.8. */
return (async function () {
  var R = 1080, PHOTO = 'bay';
  var OPTS = [
    { amt: null, name: 'Original', sub: 'no effect' },
    { amt: 1, name: 'Full · 1.0', sub: 'for reference — photo shows through: 0%' },
    { amt: 0.8, name: 'Keep · 0.8', sub: 'today’s default — photo shows through: 20%' },
    { amt: 0.5, name: 'Gentler · 0.5', sub: 'photo shows through: 50%', rec: true },
  ];
  var im = await new Promise(function (ok, bad) {
    var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { bad(new Error('no photo ' + PHOTO)); };
    i.src = 'fx-art/' + PHOTO + '.jpg?v=1';
  });
  var base = document.createElement('canvas'); base.width = R; base.height = R;
  var bg = base.getContext('2d'); bg.imageSmoothingQuality = 'high';
  bg.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, 0, 0, R, R);
  var mid = '_482go_' + PHOTO;
  FM.media.set(mid, { kind: 'image', el: base, width: R, height: R, duration: 0 }); if (FM.media.pin) FM.media.pin(mid);
  function render(amt) {
    var l = FM.makeLayer('image', { x: R / 2, y: R / 2, start: 0, duration: 2 }); l.id = mid;
    if (amt != null) { var e = FM.fxRegistry.makeInstance('gradientoverlay'); e.params.amount = amt; l.effects = [e]; }
    var c = document.createElement('canvas'); c.width = R; c.height = R;
    FM.renderScene(c.getContext('2d', { willReadFrequently: true }), { project: { width: R, height: R, fps: 30, duration: 2, background: '#000000' }, layers: [l] }, 0.5);
    return c;
  }
  var def = FM.fxRegistry.makeInstance('gradientoverlay').params.amount;
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0f1117;color:#e9ecf3;font:14px -apple-system,system-ui,sans-serif;padding:18px 14px;box-sizing:border-box;overflow:hidden';
  ov.innerHTML = '<div style="font-weight:700;font-size:19px;letter-spacing:-.2px">Gradient Overlay — how strong to start?</div>' +
    '<div style="color:#a8afbf;font-size:12.5px;line-height:1.4;margin:6px 0 14px">What you get the moment you add it, on a photo. Nothing changes in the app until you pick. The default today is <b style="color:#e9ecf3">' + def + '</b>.</div>' +
    '<div id="g482" style="display:grid;grid-template-columns:1fr 1fr;gap:12px 10px"></div>' +
    '<div style="color:#a8afbf;font-size:12px;line-height:1.4;margin-top:14px">Amount is still a slider after you add it — this only picks where it starts. Reply <b style="color:#e9ecf3">Keep</b> or <b style="color:#e9ecf3">Gentler</b>.</div>';
  document.body.appendChild(ov);
  var grid = ov.querySelector('#g482');
  OPTS.forEach(function (o) {
    var cell = document.createElement('div'); cell.style.cssText = 'position:relative';
    var cv = render(o.amt); cv.style.cssText = 'width:100%;aspect-ratio:1;display:block;border-radius:10px;' + (o.rec ? 'outline:3px solid #4fd1a5;outline-offset:2px' : '');
    cell.appendChild(cv);
    var t = document.createElement('div'); t.style.cssText = 'font-weight:650;font-size:14px;margin-top:7px';
    t.textContent = o.name; cell.appendChild(t);
    var s = document.createElement('div'); s.style.cssText = 'color:#a8afbf;font-size:11.5px;line-height:1.3;margin-top:2px';
    s.textContent = o.sub; cell.appendChild(s);
    if (o.rec) {
      var b = document.createElement('div');
      b.style.cssText = 'position:absolute;top:8px;left:8px;background:#4fd1a5;color:#06281c;font-weight:750;font-size:11px;padding:3px 8px;border-radius:999px';
      b.textContent = '★ Recommended'; cell.appendChild(b);
    }
    grid.appendChild(cell);
  });
  var last = ov.lastElementChild.getBoundingClientRect();
  return { defaultAmount: def, contentBottom: Math.ceil(last.bottom + 18) };
})();
