  /* ════════ AU10: audit of js/app.js, lines 3051 to 6100. Append before `async function run()`; `?only=AU10` runs them. ════════ */
  test('AU10-1 Align puts a layer\'s DRAWN box on the canvas edge or centre, also for a member of an offset / scaled / turned group and for a turned layer', { item: 'AU10', budgetMs: 60000 }, async function () {
    const P = FM.scene.project, keep = FM.scene.layers.slice(), keepSel = [FM.scene.selectedId, FM.scene.selectedIds], d0 = P.duration, w0 = P.width, h0 = P.height, t0 = FM.time;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const box = L => FM._layerAABB(L, FM.time, FM.scene);
    const want = { left: b => b.x0, hcenter: b => (b.x0 + b.x1) / 2, right: b => b.x1, top: b => b.y0, vcenter: b => (b.y0 + b.y1) / 2, bottom: b => b.y1 };
    const target = { left: () => 0, hcenter: () => P.width / 2, right: () => P.width, top: () => 0, vcenter: () => P.height / 2, bottom: () => P.height };
    const fresh = () => {
      FM.scene.layers.length = 0; FM.history.reset();
      const mk = (x, y, w, h, fill) => { FM.addShapeLayer('rect'); const L = FM.scene.layers[0]; L.transform.x = x; L.transform.y = y; L.shapeW = w; L.shapeH = h; L.fill = fill; L.start = 0; L.duration = 4; return L; };
      return mk;
    };
    try {
      P.width = 300; P.height = 240; P.duration = 4; FM.time = 1;
      const sel = L => { FM.scene.selectedId = L.id; FM.scene.selectedIds = [L.id]; };
      // CONTROL: a plain layer keeps its exact old numbers (left puts transform.x at round(half the width))
      let mk = fresh(); let L = mk(150, 120, 81, 40, '#fff'); FM.autoFitDuration(); sel(L); FM.alignLayers('left');
      if (L.transform.x !== 41) throw new Error('CONTROL: Align left on a plain 81-wide layer put x at ' + L.transform.x + ', the old rule gives 41');
      for (const mode of Object.keys(want)) {
        // a layer turned 37 degrees
        mk = fresh(); L = mk(150, 120, 80, 40, '#fff'); L.transform.rotation = 37; FM.autoFitDuration(); sel(L);
        FM.alignLayers(mode);
        let got = want[mode](box(L)), exp = target[mode]();
        if (Math.abs(got - exp) > 0.05) throw new Error('Align ' + mode + ' on a layer turned 37 degrees: its drawn box is at ' + got.toFixed(2) + ', the canvas ' + mode + ' is ' + exp);
        // a member of a group that is offset, scaled and turned
        mk = fresh(); const a = mk(100, 60, 80, 40, '#fff'), b = mk(200, 180, 80, 40, '#fff'); FM.autoFitDuration();
        FM.scene.selectedIds = [a.id, b.id]; FM.scene.selectedId = a.id; FM.groupSelection();
        const g = FM.scene.layers.find(l => l.type === 'group'); if (!g) throw new Error('setup: no group');
        g.transform.x = 60; g.transform.y = -20; g.transform.scale = 1.25; g.transform.rotation = 20;
        sel(a); FM.alignLayers(mode);
        got = want[mode](box(a)); exp = target[mode]();
        if (Math.abs(got - exp) > 0.05) throw new Error('Align ' + mode + ' on a member of an offset, scaled and turned group: its drawn box is at ' + got.toFixed(2) + ', the canvas ' + mode + ' is ' + exp);
      }
    } finally {
      FM.scene.layers = keep; FM.scene.selectedId = keepSel[0]; FM.scene.selectedIds = keepSel[1]; P.duration = d0; P.width = w0; P.height = h0; FM.time = t0; try { FM.refreshAll(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });
