  /* ════════ AU2: repro tests for the js/inspector.js audit. Append before `async function run()` in tests/tests.js; `?only=AU2` runs them. ════════ */
  test('AU2-1 typing the number an effect slider is already showing leaves it alone (26 shipped defaults sit between the step notches, and typing them moved them)', { item: 'au2', budgetMs: 30000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const saved = FM.scene, hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    try {
      const a = FM.makeLayer('shape', { name: 'AU2', shape: 'rect', x: 540, y: 700, shapeW: 300, shapeH: 300, fill: '#c05030', start: 0, duration: 4 });
      const fx = FM.fxRegistry.makeInstance('crt'); fx._expanded = true; a.effects = [fx];
      FM.scene = { layers: [a], project: { width: 1080, height: 1920, fps: 30, duration: 4, background: '#000000' }, selectedId: null, version: 1 };
      FM.refreshAll(); FM.selectLayer(a.id); await sleep(250);
      FM.inspector.openCategory('effects'); await sleep(450);
      const row = [].slice.call(document.querySelectorAll('#inspector-panel .fx-scrub-row')).find(r => /Scanline/i.test((r.querySelector('.fx-scrub-label') || {}).textContent || ''));
      if (!row) throw new Error('setup: no Scanline row in the open CRT effect');
      const box = row.querySelector('.fx-scrub-val'), want = fx.params.scanline;
      if (!(want > 0)) throw new Error('setup: CRT Scanline has no default to type back');
      const shown = parseFloat(box.value);
      if (Math.abs(shown - want) > 0.0051) throw new Error('CONTROL: the box shows ' + box.value + ' for a stored ' + want);
      box.value = String(shown); box.dispatchEvent(new Event('change', { bubbles: true })); await sleep(120);
      const got = FM.evalProp(fx.params.scanline, FM.time);
      if (Math.abs(got - want) > 1e-9) throw new Error('typing the value Scanline already shows (' + shown + ') changed it from ' + want + ' to ' + got);
      // CONTROL: a value that IS on the grid is kept exactly
      box.value = '0.30'; box.dispatchEvent(new Event('change', { bubbles: true })); await sleep(120);
      if (Math.abs(FM.evalProp(fx.params.scanline, FM.time) - 0.3) > 1e-9) throw new Error('CONTROL: typing 0.30 stored ' + FM.evalProp(fx.params.scanline, FM.time));
    } finally {
      FM.scene = saved; try { FM.selectLayer(null); FM.refreshAll(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

  test('AU2-2 Paste look → Effects fits a copied filter to the layer it lands on (a text-only child is dropped, as the effect Paste button does)', { item: 'au2', budgetMs: 30000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const saved = FM.scene, clip0 = FM.clipboard, hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    try {
      const txt = FM.makeLayer('text', { name: 'src', text: 'Hi', start: 0, duration: 4 });
      const kid = (id) => FM.fxRegistry.makeInstance(id);
      txt.effects = [{ type: FM.FX_CONTAINER, enabled: true, name: 'Mixed', effects: [kid('counter'), kid('blur')] }];
      if (!FM.fxRegistry.supportsLayer('counter', txt) || FM.fxRegistry.supportsLayer('counter', FM.makeLayer('shape', { shape: 'rect' }))) throw new Error('setup: counter is not a text-only effect any more, pick another');
      const shp = FM.makeLayer('shape', { name: 'dst', shape: 'rect', x: 540, y: 700, shapeW: 300, shapeH: 300, fill: '#c05030', start: 0, duration: 4 });
      FM.scene = { layers: [shp], project: { width: 1080, height: 1920, fps: 30, duration: 4, background: '#000000' }, selectedId: null, version: 1 };
      FM.clipboard = [{ snapshot: JSON.parse(JSON.stringify(txt)) }];
      FM.refreshAll(); FM.selectLayer(shp.id); await sleep(200);
      FM.openPasteStyle(shp); await sleep(100);
      const tiles = [].slice.call(document.querySelectorAll('.ps-overlay .ps-cat'));
      tiles.forEach(b => { const on = b.classList.contains('on'); const isFx = /effect/i.test(b.title || ''); if (on !== isFx && !b.disabled) b.click(); });   // only Effects ticked
      const fxTile = tiles.find(b => /effect/i.test(b.title || ''));
      if (!fxTile || fxTile.disabled) throw new Error('CONTROL: the Effects tile is not available for a copied filter (' + (fxTile && fxTile.title) + ')');
      document.querySelector('.ps-overlay .ps-paste').click(); await sleep(150);
      const out = (FM.layerById(FM.scene, shp.id).effects || []);
      const box = out.find(e => FM.isFxContainer(e));
      if (!box) throw new Error('CONTROL: the pasted filter did not arrive at all (effects: ' + out.map(e => e.type).join(',') + ')');
      const types = (box.effects || []).map(e => e.type);
      if (types.indexOf('blur') < 0) throw new Error('CONTROL: the child that suits a shape (blur) was dropped: ' + types.join(','));
      if (types.indexOf('counter') >= 0) throw new Error('Paste look landed a text-only effect (counter) inside a filter on a SHAPE, where it can never run: ' + types.join(','));
    } finally {
      FM.scene = saved; FM.clipboard = clip0; document.querySelectorAll('.ps-overlay').forEach(o => o.remove());
      try { FM.selectLayer(null); FM.refreshAll(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

  test('AU2-3 the multi-select Align buttons (Start together, Chain, End together) leave a LOCKED clip where it is, as the A / S / D keys and the drag do', { item: 'au2', budgetMs: 30000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const saved = FM.scene, hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    try {
      const mk = (name, start, dur) => { const l = FM.makeLayer('shape', { name: name, shape: 'rect', x: 300, y: 300, shapeW: 80, shapeH: 80, fill: '#c05030', start: start, duration: dur }); return l; };
      const run = async (title) => {
        const A = mk('A', 0, 2), B = mk('B', 3, 2), C = mk('C', 6, 2); B.locked = true;
        FM.scene = { layers: [A, B, C], project: { width: 1080, height: 1920, fps: 30, duration: 8, background: '#000000' }, selectedId: C.id, selectedIds: [A.id, B.id, C.id], version: 1 };
        FM.refreshAll(); FM.inspector.refresh(); await sleep(250);
        const btn = [].slice.call(document.querySelectorAll('.align-big .qr-btn')).find(b => (b.title || '').indexOf(title) === 0);
        if (!btn) throw new Error('setup: no "' + title + '" button in the multi-select Align row');
        btn.click(); await sleep(120);
        return { A: A.start, B: B.start, C: C.start };
      };
      const bad = [];
      for (const title of ['Start together', 'One after another, down', 'End together']) {
        const r = await run(title);
        if (r.B !== 3) bad.push(title + ' moved the LOCKED clip from 3 s to ' + r.B + ' s');
      }
      if (bad.length) throw new Error(bad.join('; '));
    } finally {
      FM.scene = saved; try { FM.selectLayer(null); FM.refreshAll(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

  test('AU2-4 the multi-select Align buttons move a selected GROUP together with what is inside it', { item: 'au2', budgetMs: 30000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const saved = FM.scene, hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    try {
      const mk = (name, start, dur) => FM.makeLayer('shape', { name: name, shape: 'rect', x: 300, y: 300, shapeW: 80, shapeH: 80, fill: '#c05030', start: start, duration: dur });
      const P = mk('Plain', 0, 2);
      const G = FM.makeLayer('group', { name: 'G', start: 5, duration: 3 });
      const M = mk('Member', 5, 3); M.parent = G.id;
      FM.scene = { layers: [P, G, M], project: { width: 1080, height: 1920, fps: 30, duration: 8, background: '#000000' }, selectedId: G.id, selectedIds: [P.id, G.id], version: 1 };
      if (!FM.groupDescendants || FM.groupDescendants(G.id).map(l => l.id).indexOf(M.id) < 0) throw new Error('setup: the member is not a descendant of the group (' + (FM.groupDescendants ? FM.groupDescendants(G.id).length : 'no API') + ')');
      FM.refreshAll(); FM.inspector.refresh(); await sleep(250);
      const btn = [].slice.call(document.querySelectorAll('.align-big .qr-btn')).find(b => (b.title || '').indexOf('Start together') === 0);
      if (!btn) throw new Error('setup: no "Start together" button in the multi-select Align row');
      btn.click(); await sleep(120);
      if (Math.abs(G.start - 0) > 1e-6) throw new Error('CONTROL: the group bar did not move to 0 (it is at ' + G.start + ')');
      if (Math.abs(M.start - G.start) > 1e-6) throw new Error('the group bar moved to ' + G.start + ' s but the layer inside it stayed at ' + M.start + ' s, so the group no longer contains its own contents');
    } finally {
      FM.scene = saved; try { FM.selectLayer(null); FM.refreshAll(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

