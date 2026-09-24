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
    if (o.tile === 'fill' || o.tile === 'allfill') src = src.replace(heartRe, "$1icoPoly('heart')");
    if (o.tile === 'alloutline' || o.tile === 'allfill') DATA_TILES.forEach(function (d) {
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
    /* …and so does that scratch layer's own clip and track header: the first review read the rounded clip bar
       across the top row as a new overlap bug. It is only the timeline behind the sheet, so it is hidden. */
    const tr = document.getElementById('tl-tracks'); if (tr) tr.style.visibility = 'hidden';
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
    return { tile: [r.left, r.top, r.width, r.height], page: [g.left, g.top, g.width, g.height], svg: s && [s.width, s.height],
             icon: s && [s.left, s.top, s.width, s.height] };
  }
  // A scratch scene with the given layers, drawn by FM.renderScene. items: [{kind, x, y, box, fill, stroke}]
  function renderBig(W, H, bg, items, scale) {
    const scene = { project: { width: W, height: H, fps: 30, duration: 3, background: bg }, layers: [], selectedId: null, selectedIds: [] };
    items.forEach(function (it) {
      const asp = it.aspect || FM.SHAPE_ASPECT[it.kind] || [1, 1];
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
  /* LEGIBILITY at a given size, measured the way the suite measures it (tests.js figMask/figTopo: the app's own
     traceShapePath into an n x n box, alpha > 127 is ink, 4-connected). Used to separate what he would actually
     SEE (a head fused to the shoulders, pinholes, legs merged) from rules that only encode the old proportions. */
  function legib(kind, sizes) {
    return sizes.map(function (n) {
      const c = document.createElement('canvas'); c.width = n; c.height = n;
      const g = c.getContext('2d');
      FM.traceShapePath(g, { shape: kind }, 0, 0, n, n); g.fillStyle = '#000'; g.fill();
      const d = g.getImageData(0, 0, n, n).data, N = n * n, m = new Uint8Array(N);
      for (let i = 0; i < N; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
      const st2 = new Int32Array(N);
      const flood = function (start, want, marks) {
        let sp = 0; marks[start] = 1; st2[sp++] = start;
        while (sp) {
          const p = st2[--sp], x = p % n, y = (p - x) / n;
          [[x > 0, p - 1], [x < n - 1, p + 1], [y > 0, p - n], [y < n - 1, p + n]].forEach(function (q) {
            if (q[0] && m[q[1]] === want && !marks[q[1]]) { marks[q[1]] = 1; st2[sp++] = q[1]; }
          });
        }
      };
      let comps = 0; const seen = new Uint8Array(N);
      for (let i = 0; i < N; i++) if (m[i] && !seen[i]) { comps++; flood(i, 1, seen); }
      const bg = new Uint8Array(N);
      for (let i = 0; i < n; i++) [i, i + (n - 1) * n, i * n, i * n + n - 1].forEach(function (p) { if (!m[p] && !bg[p]) flood(p, 0, bg); });
      let holes = 0; const hs = new Uint8Array(N);
      for (let i = 0; i < N; i++) if (!m[i] && !bg[i] && !hs[i]) { holes++; flood(i, 0, hs); }
      let y0 = -1, y1 = -1;
      for (let y = 0; y < n; y++) { let any = 0; for (let x = 0; x < n; x++) any |= m[y * n + x]; if (any) { if (y0 < 0) y0 = y; y1 = y; } }
      const yl = Math.round(y0 + 0.9 * (y1 - y0 + 1));
      let runs = 0, prev = 0; for (let x = 0; x < n; x++) { const v = m[yl * n + x]; if (v && !prev) runs++; prev = v; }
      return { n: n, components: comps, holes: holes, legRuns90: runs };
    });
  }
  // The union bbox of a tile icon's drawing, in its 24-unit viewBox — to say in words what redrawing a tile changes.
  function tileInk(phone, titles) {
    const out = {}, root = phone ? document.querySelector('#add-grid') : document.querySelector('.addmenu--panel');
    titles.forEach(function (t) {
      const card = [].find.call(root.querySelectorAll('.addmenu-card'), c => c.title === t);
      const sv = card && card.querySelector('svg'); if (!sv) { out[t] = null; return; }
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      [].forEach.call(sv.querySelectorAll('path, polygon, polyline, rect, circle, ellipse, line'), function (e) {
        const b = e.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
      });
      out[t] = { w: +(x1 - x0).toFixed(2), h: +(y1 - y0).toFixed(2), x: +x0.toFixed(2), y: +y0.toFixed(2) };
    });
    return out;
  }
  /* A REFERENCE beside or under our trace. figs: [{svg (text) | polys, vb, kind, cx, top, h, aspect}] — the
     reference is drawn (from its own published SVG, or from a point set via the app) so its ink is h px tall,
     centred on cx, top at `top`; with overlay, our shape is traced by the app's own traceShapePath and scaled so
     ITS ink box has the same height, centre and top. Grey = theirs, the line = ours. */
  function loadImg(url) { return new Promise(function (res, rej) { const im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = url; }); }
  function inkBox(g, w, h) {
    const d = g.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { x0: x0, y0: y0, x1: x1 + 1, y1: y1 + 1 };
  }
  async function refCanvas(f, fill) {
    const R = 1600;
    if (f.polys) {   // a point set (today's heart): drawn by the app, not by us
      const asp = f.aspect || [1, 1], S = R / Math.max(asp[0], asp[1]), sw = S * asp[0], sh = S * asp[1];
      const c = document.createElement('canvas'); c.width = Math.ceil(sw) + 4; c.height = Math.ceil(sh) + 4;
      const g = c.getContext('2d'), keep = FM.SHAPE_POLYS[f.kind];
      FM.SHAPE_POLYS[f.kind] = f.polys; FM.traceShapePath(g, { shape: f.kind }, 2, 2, sw, sh); FM.SHAPE_POLYS[f.kind] = keep;
      g.fillStyle = fill; g.fill();
      return { c: c, box: inkBox(g, c.width, c.height) };
    }
    const vb = f.vb, sc = R / vb[3], w = Math.ceil(vb[2] * sc), h = R;
    const t = f.svg.replace(/<\?xml[^>]*>/, '').replace(/<svg\b([^>]*)>/, function (m0, a) {
      a = a.replace(/\s(width|height|viewBox|fill)="[^"]*"/g, '');
      return '<svg' + a + ' width="' + w + '" height="' + h + '" viewBox="' + vb.join(' ') + '" fill="' + fill + '">';
    });
    const im = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0, w, h);
    return { c: c, box: inkBox(g, w, h) };
  }
  function fmInk(kind, asp) {
    const S = 1600, M = Math.max(asp[0], asp[1]), sw = S * asp[0] / M, sh = S * asp[1] / M;
    const c = document.createElement('canvas'); c.width = Math.ceil(sw) + 4; c.height = Math.ceil(sh) + 4;
    const g = c.getContext('2d'); FM.traceShapePath(g, { shape: kind }, 2, 2, sw, sh); g.fillStyle = '#000'; g.fill();
    return { sw: sw, sh: sh, b: inkBox(g, c.width, c.height) };
  }
  async function refFigure(o) {
    const cv = document.createElement('canvas'); cv.width = o.W; cv.height = o.H;
    const g = cv.getContext('2d'); g.fillStyle = o.bg; g.fillRect(0, 0, o.W, o.H);
    const report = [];
    for (const f of o.figs) {
      const r = await refCanvas(f, o.refFill);
      const bw = r.box.x1 - r.box.x0, bh = r.box.y1 - r.box.y0, k = f.h / bh;
      g.drawImage(r.c, r.box.x0, r.box.y0, bw, bh, f.cx - bw * k / 2, f.top, bw * k, bh * k);
      if (o.overlay) {
        const asp = f.aspect || FM.SHAPE_ASPECT[f.kind] || [1, 1], mi = fmInk(f.kind, asp);
        const kk = f.h / (mi.b.y1 - mi.b.y0);
        const ox = f.cx - ((mi.b.x0 + mi.b.x1) / 2 - 2) * kk, oy = f.top - (mi.b.y0 - 2) * kk;
        /* The outline of the UNION, not of each part: several figures are overlapping parts (Maki's man is six),
           and stroking the path draws every part's own edge through the middle of the figure. So stroke at twice
           the width on a layer of its own, then punch the filled shape out of it: the lines inside the figure go,
           and what is left is a line of lineW hugging our edge from the outside. */
        const lay = document.createElement('canvas'); lay.width = o.W; lay.height = o.H;
        const lg = lay.getContext('2d');
        FM.traceShapePath(lg, { shape: f.kind }, ox, oy, mi.sw * kk, mi.sh * kk);
        lg.lineWidth = o.lineW * 2; lg.strokeStyle = o.line; lg.lineJoin = 'round'; lg.stroke();
        lg.globalCompositeOperation = 'destination-out'; lg.fillStyle = '#000'; lg.fill();
        g.drawImage(lay, 0, 0);
        report.push({ kind: f.kind, refAspect: +(bw / bh).toFixed(4), oursAspect: +((mi.b.x1 - mi.b.x0) / (mi.b.y1 - mi.b.y0)).toFixed(4) });
      }
    }
    return { url: cv.toDataURL('image/png'), report: report };
  }
  return { init, apply, openShapes, tileRect, renderBig, editor, overlayIcon, legib, tileInk, refFigure, st };
})();
true;
