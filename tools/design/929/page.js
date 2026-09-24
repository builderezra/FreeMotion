/* #929 render helpers, evaluated INSIDE the real app page by render.py. Everything drawn here goes through
   the app's own code: FM.SHAPE_POLYS is swapped, js/addmenu.js is re-evaluated so the Add → Shape tiles
   are rebuilt by its own icoPoly() from the swapped geometry, and the big pictures are FM.renderScene. */
window.__fm929 = (function () {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clone = o => JSON.parse(JSON.stringify(o));
  const st = { orig: null, origAspect: null, src: null };
  async function init() {
    if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
    await sleep(300);
    st.orig = clone({ person: FM.SHAPE_POLYS.person, woman: FM.SHAPE_POLYS.woman, heart: FM.SHAPE_POLYS.heart });
    st.origAspect = FM.SHAPE_ASPECT.heart ? FM.SHAPE_ASPECT.heart.slice() : null;
    st.src = await (await fetch('js/addmenu.js', { cache: 'no-store' })).text();
    const s = await (await fetch('tools/design/929/options.js', { cache: 'no-store' })).text();
    (0, eval)(s);
    FM.scene.layers.length = 0; FM.selectLayer(null); FM.refreshAll();
    return { ok: true, heartTile: /label: 'Heart', icon: ico\('<path d="/.test(st.src) };
  }
  const DATA_TILES = [['Triangle', 'triangle'], ['Plus', 'plus'], ['Arrow', 'arrow'], ['Chevron', 'chevron'],
                      ['Trapezoid', 'trapezoid'], ['Parallelogram', 'parallelogram']];
  // o: { person, woman, heart, heartAspect, tile: 'baked' | 'outline' | 'fill' | 'alloutline' }
  function apply(o) {
    o = o || {};
    const S = FM.SHAPE_POLYS, O = st.orig;
    S.person = clone(o.person || O.person); S.woman = clone(o.woman || O.woman); S.heart = clone(o.heart || O.heart);
    if (o.heartAspect) FM.SHAPE_ASPECT.heart = o.heartAspect.slice();
    else if (st.origAspect) FM.SHAPE_ASPECT.heart = st.origAspect.slice(); else delete FM.SHAPE_ASPECT.heart;
    let src = st.src;
    const heartRe = /(label: 'Heart', icon: )ico\('<path d="[^"]*"\/>'\)/;
    if (o.tile === 'outline' || o.tile === 'alloutline') src = src.replace(heartRe, "$1icoPoly('heart', true)");
    if (o.tile === 'fill') src = src.replace(heartRe, "$1icoPoly('heart')");
    if (o.tile === 'alloutline') DATA_TILES.forEach(function (d) {
      src = src.replace(new RegExp("(label: '" + d[0] + "', icon: )ico\\('[^']*'\\)"), "$1icoPoly('" + d[1] + "', true)");
    });
    (0, eval)(src);
    return true;
  }
  // Open Add → Shape on the phone sheet or the PC panel; returns nothing.
  async function openShapes(phone) {
    /* An EMPTY project draws "Tap here to start creating" and a + bubble on the timeline, and the phone
       sheet's tiles are translucent, so that hint shows through them. A project with one layer is the
       state he is actually in when he opens Add → Shape, so give it one (a text layer far off-canvas). */
    if (!FM.scene.layers.length) {
      const L = FM.makeLayer('shape', { name: ' ', shape: 'rect', x: -5000, y: -5000, shapeW: 10, shapeH: 10, start: 0, duration: 3 });
      FM.scene.layers.push(L); FM.refreshAll(); await sleep(150);
    }
    // the timeline's playhead line sits behind the translucent phone sheet and shows through one tile column
    ['tl-playhead', 'tl-centerline'].forEach(function (id) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; });
    if (phone) {
      FM.mobile.closeAdd(); FM.selectLayer(null); await sleep(300);
      FM.mobile.openAdd(); await sleep(500);
      const t = document.querySelector('#add-grid .addmenu-tab[data-key="shape"]'); if (t) t.click();
    } else {
      FM.selectLayer(null); if (FM.inspector) FM.inspector.refresh(); await sleep(300);
      const t = document.querySelector('.addmenu--panel .addmenu-tab[data-key="shape"]'); if (t) t.click();
    }
    await sleep(500);
  }
  // Scroll the pager to the page holding the tile titled `title`; return its rect (and its page's).
  async function tileRect(phone, title) {
    const root = phone ? document.querySelector('#add-grid') : document.querySelector('.addmenu--panel');
    const card = [].find.call(root.querySelectorAll('.addmenu-card'), c => c.title === title);
    if (!card) return { error: 'no tile titled ' + title };
    const page = card.closest('.addmenu-page'), pager = card.closest('.addmenu-pager');
    if (pager && page) { pager.style.scrollBehavior = 'auto'; pager.scrollLeft = page.offsetLeft - pager.offsetLeft; }
    await sleep(450);
    const r = card.getBoundingClientRect(), g = (page || card).getBoundingClientRect(), sv = card.querySelector('svg');
    const s = sv ? sv.getBoundingClientRect() : null;
    return { tile: [r.left, r.top, r.width, r.height], page: [g.left, g.top, g.width, g.height], svg: s && [s.width, s.height] };
  }
  // A scratch scene with the given layers, drawn by FM.renderScene. items: [{kind, x, y, box, fill, stroke}]
  function renderBig(W, H, bg, items, scale) {
    const scene = { project: { width: W, height: H, fps: 30, duration: 3, background: bg }, layers: [], selectedId: null, selectedIds: [] };
    items.forEach(function (it) {
      const asp = FM.SHAPE_ASPECT[it.kind] || [1, 1];
      const k = it.box / Math.max(asp[0], asp[1]);
      const L = FM.makeLayer('shape', { name: it.kind, shape: it.kind, x: it.x, y: it.y,
        shapeW: Math.round(k * asp[0]), shapeH: Math.round(k * asp[1]), start: 0, duration: 3 });
      L.fill = it.fill || '#ffffff';
      if (it.stroke) L.stroke = { enabled: true, width: it.stroke.width, color: it.stroke.color };
      if (it.noFill) L.fillOpacity = 0;
      scene.layers.push(L);
    });
    scale = scale || 1;
    const cv = document.createElement('canvas'); cv.width = W * scale; cv.height = H * scale;
    const g = cv.getContext('2d');
    FM.renderScene(g, scene, 0.5);
    return cv.toDataURL('image/png');
  }
  // The real editor: add the shape at the playhead, make it big, optionally open Edit Points on it.
  async function editor(kind, opts) {
    opts = opts || {};
    FM.mobile && FM.mobile.closeAdd && FM.mobile.closeAdd();
    if (FM.pointEdit && FM.pointEdit.isActive()) FM.pointEdit.stop();
    FM.scene.layers.length = 0; FM.selectLayer(null); FM.refreshAll(); await sleep(150);
    FM.addShapeLayer(kind, { name: kind });
    const L = FM.scene.layers[FM.scene.layers.length - 1];
    const P = FM.scene.project, asp = FM.SHAPE_ASPECT[kind] || [1, 1];
    const box = Math.min(P.width, P.height) * (opts.frac || 0.9), k = box / Math.max(asp[0], asp[1]);
    L.shapeW = Math.round(k * asp[0]); L.shapeH = Math.round(k * asp[1]);
    L.transform.x = P.width / 2; L.transform.y = P.height / 2;
    if (opts.fill) L.fill = opts.fill;
    if (opts.stroke) L.stroke = { enabled: true, width: opts.stroke.width, color: opts.stroke.color };
    FM.refreshAll(); await sleep(200);
    if (opts.points && FM.pointEdit) { FM.pointEdit.start(L.id); await sleep(300); }
    const st2 = document.getElementById('stage').getBoundingClientRect();
    const cv = document.querySelector('#stage canvas');
    const cr = cv ? cv.getBoundingClientRect() : st2;
    return { stage: [st2.left, st2.top, st2.width, st2.height], canvas: [cr.left, cr.top, cr.width, cr.height] };
  }
  /* The shipped Add-menu heart icon (the hand-typed path in js/addmenu.js) laid over the heart the app actually
     draws, at the same size: the icon's 24-grid box is 2.5..21.5, which is where the heart's unit box maps. */
  function overlayIcon(W, bg, fill) {
    const B = Math.round(W * 0.8), o = (W - B) / 2;
    const url0 = renderBig(W, W, bg, [{ kind: 'heart', x: W / 2, y: W / 2, box: B, fill: fill }]);
    const m = st.src.match(/label: 'Heart', icon: ico\('<path d="([^"]*)"/);
    return new Promise(function (res) {
      const im = new Image();
      im.onload = function () {
        const cv = document.createElement('canvas'); cv.width = W; cv.height = W;
        const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
        g.save(); g.translate(o, o); g.scale(B / 19, B / 19); g.translate(-2.5, -2.5);
        g.lineWidth = 6 / (B / 19); g.strokeStyle = '#ffffff'; g.lineJoin = 'round';
        g.stroke(new Path2D(m[1])); g.restore();
        res(cv.toDataURL('image/png'));
      };
      im.src = url0;
    });
  }
  return { init, apply, openShapes, tileRect, renderBig, editor, overlayIcon, st };
})();
true;
