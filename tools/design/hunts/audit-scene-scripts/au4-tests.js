  /* ════════ AU4: audit of js/scene.js + js/history.js. Append before `async function run()` in tests/tests.js; `?only=AU4` runs them. ════════ */
  const au4Fresh = function () {
    if (FM.textEdit && FM.textEdit.stop) FM.textEdit.stop();
    FM.scene.layers.length = 0; FM.scene.project.duration = 0; FM.selectLayer(null); FM.history.reset();
    FM.addShapeLayer('rect'); FM.history.commit();
  };
  test('AU4-1 undo right after Add text / Add captions (the editor still open) can be REDONE; the redo is not thrown away', { item: 'AU4', budgetMs: 30000 }, async function () {
    const savedLayers = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, dur0 = FM.scene.project.duration;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    try {
      // CONTROL: a shape (no editor opens) undoes and redoes
      au4Fresh(); FM.addShapeLayer('ellipse');
      if (FM.scene.layers.length !== 2) throw new Error('setup: shape not added');
      FM.history.undo(); if (!FM.history.canRedo()) throw new Error('CONTROL: nothing to redo after undoing a shape');
      FM.history.redo(); if (FM.scene.layers.length !== 2) throw new Error('CONTROL: redo did not bring the shape back');
      for (const kind of ['text', 'caption']) {
        au4Fresh();
        if (kind === 'text') FM.addTextLayer(); else FM.addCaptionLayer();
        if (FM.scene.layers.length !== 2) throw new Error(kind + ': setup: layer not added');
        if (!(FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive())) throw new Error(kind + ': setup: the editor is not open, so this is not the case under test');
        FM.history.undo();
        if (FM.scene.layers.length !== 1) throw new Error(kind + ': undo did not remove the layer (' + FM.scene.layers.length + ' layers)');
        if (!FM.history.canRedo()) throw new Error(kind + ': after undoing "Add ' + kind + '" with the editor open, Redo is gone: the editor closing pushed a selection-only step and threw the redo tail away');
        FM.history.redo();
        if (FM.scene.layers.length !== 2) throw new Error(kind + ': redo did not bring the layer back');
      }
    } finally {
      if (FM.textEdit && FM.textEdit.stop) FM.textEdit.stop();
      FM.scene.layers = savedLayers; FM.scene.project.duration = dur0; FM.scene.selectedId = sel0; FM.history.reset(); FM.refreshAll();
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });
  test('AU4-2 Add group while the text editor is open is ONE undo step, not two (the first undo used to do nothing visible)', { item: 'AU4', budgetMs: 30000 }, async function () {
    const savedLayers = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, dur0 = FM.scene.project.duration;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    try {
      // CONTROL: with no editor open, Add group is one step
      au4Fresh(); let n0 = FM.history._steps().len; FM.addEmptyGroup();
      if (FM.history._steps().len - n0 !== 1) throw new Error('CONTROL: Add group with no editor open made ' + (FM.history._steps().len - n0) + ' steps');
      au4Fresh(); FM.addTextLayer();
      if (!(FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive())) throw new Error('setup: the editor is not open');
      n0 = FM.history._steps().len; const layers0 = FM.scene.layers.length;
      FM.addEmptyGroup();
      const steps = FM.history._steps().len - n0;
      if (steps !== 1) throw new Error('Add group with the text editor open made ' + steps + ' history steps (the first one is a selection-only copy of the half-done add)');
      FM.history.undo();
      if (FM.scene.layers.length !== layers0) throw new Error('one undo did not take the group back (' + FM.scene.layers.length + ' layers, expected ' + layers0 + ')');
    } finally {
      if (FM.textEdit && FM.textEdit.stop) FM.textEdit.stop();
      FM.scene.layers = savedLayers; FM.scene.project.duration = dur0; FM.scene.selectedId = sel0; FM.history.reset(); FM.refreshAll();
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });
  test('AU4-3 a random sequence of real commands: every undo and every redo lands byte for byte on the snapshot it names (layers and project, duration aside)', { item: 'AU4', budgetMs: 120000 }, async function () {
    const savedLayers = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, dur0 = FM.scene.project.duration;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const J = () => JSON.stringify({ project: Object.assign({}, FM.scene.project, { duration: 0 }), layers: FM.scene.layers }, FM.jsonReplacer);
    const proj = x => { const o = JSON.parse(x); return JSON.stringify({ project: Object.assign({}, o.project, { duration: 0 }), layers: o.layers }, FM.jsonReplacer); };
    let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; const pick = a => a[Math.floor(rnd() * a.length)];
    try {
      let steps = 0;
      for (let round = 0; round < 4; round++) {
        if (FM.textEdit && FM.textEdit.stop) FM.textEdit.stop();
        FM.scene.layers.length = 0; FM.scene.project.duration = 0; FM.selectLayer(null); FM.history.reset();
        FM.addShapeLayer('rect'); FM.addShapeLayer('ellipse'); FM.addNullLayer(); FM.addAdjustmentLayer();
        if (FM.textEdit && FM.textEdit.stop) FM.textEdit.stop();
        FM.history.commit();
        const L = () => FM.scene.layers, any = () => pick(L());
        const sel = l => { FM.scene.selectedId = l.id; FM.scene.selectedIds = [l.id]; };
        const ops = [
          () => { const l = any(); FM.setTransform(l, 'x', Math.round(rnd() * 400), pick([0, 1, 2])); },
          () => { const l = any(); FM.toggleKeyframe(l, pick(['x', 'y', 'scale', 'opacity']), pick([0, .5, 1, 2])); },
          () => FM.addShapeLayer(pick(['rect', 'ellipse', 'star'])),
          async () => { const l = any(); sel(l); await FM.duplicateLayer(l.id); },
          () => { const l = any(); if (L().length > 2) { sel(l); FM.deleteSelected(); } },
          async () => { const l = any(); FM.time = Math.min(l.start + l.duration * 0.5, FM.scene.project.duration); sel(l); await FM.splitLayer(l.id); },
          () => { const a = any(), b = any(); if (a !== b && a.type !== 'group' && b.type !== 'group' && !a.parent && !b.parent) { FM.scene.selectedIds = [a.id, b.id]; FM.scene.selectedId = a.id; FM.groupSelection(); } },
          () => { const g = L().find(l => l.type === 'group'); if (g) FM.ungroup(g.id); },
          () => { FM.flipLayer(any(), pick(['x', 'y'])); },
          () => { const l = any(); if (!l.locked) FM.moveClipTo(l, rnd() * 3); },
          () => { const a = any(), b = any(); if (a !== b && !a.parent && !b.parent) FM.moveLayers([a.id], b.id); },
          async () => { const l = any(); sel(l); FM.copySelection(); await FM.pasteClipboard(); },
          () => { FM.scene.project.background = pick(['#000000', '#ffffff', '#336699']); },
        ];
        for (let i = 0; i < 30; i++) {
          await pick(ops)();
          if (FM.textEdit && FM.textEdit.stop) FM.textEdit.stop();
          FM.history.commit();
        }
        const S = FM.history._snapshotsUpTo(); steps += S.length;
        const tip = J(); if (tip !== proj(S[S.length - 1])) throw new Error('round ' + round + ': the live scene is not the newest snapshot');
        const bad = [];
        for (let i = S.length - 2; i >= 0; i--) { FM.history.undo(); if (J() !== proj(S[i])) bad.push('undo to ' + i); }
        for (let i = 1; i < S.length; i++) { FM.history.redo(); if (J() !== proj(S[i])) bad.push('redo to ' + i); }
        if (bad.length) throw new Error('round ' + round + ': ' + bad.length + ' of ' + (2 * (S.length - 1)) + ' steps did not land on their snapshot: ' + bad.slice(0, 6).join(', '));
      }
      if (steps < 60) throw new Error('setup: the sequences made only ' + steps + ' steps, too few to mean anything');
    } finally {
      if (FM.textEdit && FM.textEdit.stop) FM.textEdit.stop();
      FM.scene.layers = savedLayers; FM.scene.project.duration = dur0; FM.scene.selectedId = sel0; FM.history.reset(); FM.refreshAll();
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });
