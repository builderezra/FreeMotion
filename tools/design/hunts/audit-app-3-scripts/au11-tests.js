  /* ════════ AU11: audit of js/app.js, lines 6101 to 9151. Append before `async function run()`; `?only=AU11` runs them. ════════ */
  test('AU11-1 an arrow key nudges a layer on the SCREEN, also for a member of a group that is turned or scaled', { item: 'AU11', budgetMs: 60000 }, async function () {
    const P = FM.scene.project, keep = FM.scene.layers.slice(), keepSel = [FM.scene.selectedId, FM.scene.selectedIds], d0 = P.duration, w0 = P.width, h0 = P.height, t0 = FM.time;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const centre = l => { const b = FM._layerAABB(l, FM.time, FM.scene); return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]; };
    const press = (code, shift) => document.dispatchEvent(new KeyboardEvent('keydown', { code: code, key: code.replace('Arrow', ''), shiftKey: !!shift, bubbles: true, cancelable: true }));
    const dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    try {
      P.width = 300; P.height = 240; P.duration = 4; FM.time = 1;
      const member = (rot, sc) => {
        FM.scene.layers.length = 0; FM.history.reset(); FM.addShapeLayer('rect'); FM.addShapeLayer('rect');
        const [a, b] = FM.scene.layers; for (const l of [a, b]) { l.shapeW = 40; l.shapeH = 40; l.start = 0; l.duration = 4; }
        a.transform.x = 100; a.transform.y = 80; b.transform.x = 160; b.transform.y = 140; FM.autoFitDuration();
        FM.scene.selectedIds = [a.id, b.id]; FM.scene.selectedId = a.id; FM.groupSelection();
        const g = FM.scene.layers.find(l => l.type === 'group'); if (!g) throw new Error('setup: no group');
        g.transform.rotation = rot; g.transform.scale = sc;
        FM.scene.selectedId = a.id; FM.scene.selectedIds = [a.id]; return a;
      };
      // CONTROL: a plain layer and a member of an untouched group move 1 px, in whole pixels
      FM.scene.layers.length = 0; FM.history.reset(); FM.addShapeLayer('rect'); const plain = FM.scene.layers[0]; plain.shapeW = 40; plain.shapeH = 40; plain.start = 0; plain.duration = 4; plain.transform.x = 100.4; plain.transform.y = 100; FM.autoFitDuration();
      FM.scene.selectedId = plain.id; FM.scene.selectedIds = [plain.id]; press('ArrowRight');
      if (plain.transform.x !== 101) throw new Error('CONTROL: Right on a plain layer at x 100.4 wrote ' + plain.transform.x + ', the old rule gives 101');
      let a = member(0, 1); a.transform.x = 100.4; let c0 = centre(a); press('ArrowRight'); let c1 = centre(a);
      if (a.transform.x !== 101) throw new Error('CONTROL: Right on a member of an UNTOUCHED group at x 100.4 wrote ' + a.transform.x + ', the old whole-pixel rule gives 101');
      if (Math.abs(c1[0] - c0[0] - 0.6) > 0.02 || Math.abs(c1[1] - c0[1]) > 0.02) throw new Error('CONTROL: Right on a member of an untouched group at x 100.4 moved it ' + (c1[0] - c0[0]).toFixed(2) + ', ' + (c1[1] - c0[1]).toFixed(2));
      for (const [rot, sc] of [[90, 1], [90, 2], [30, 1], [0, 1.5], [-45, 0.5]]) {
        for (const code of Object.keys(dirs)) for (const shift of [false, true]) {
          a = member(rot, sc); c0 = centre(a); press(code, shift); c1 = centre(a);
          const step = shift ? 10 : 1, ex = dirs[code][0] * step, ey = dirs[code][1] * step, dx = c1[0] - c0[0], dy = c1[1] - c0[1];
          if (Math.abs(dx - ex) > 0.05 || Math.abs(dy - ey) > 0.05) throw new Error(code + (shift ? ' with Shift' : '') + ' on a member of a group turned ' + rot + ' degrees and scaled ' + sc + ' moved it on screen by (' + dx.toFixed(2) + ', ' + dy.toFixed(2) + '), expected (' + ex + ', ' + ey + ')');
        }
      }
    } finally {
      FM.scene.layers = keep; FM.scene.selectedId = keepSel[0]; FM.scene.selectedIds = keepSel[1]; P.duration = d0; P.width = w0; P.height = h0; FM.time = t0; try { FM.refreshAll(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });
