  /* ═══ PF1: opening a project must not render it at full size, and must not render its card twice ═══ */
  test('PF1 importing a project with a heavy effect stack draws its card at the card’s size, no full-size render, and the import stays within its time ceiling', { item: 'PF1', budgetMs: 120000 }, async function () {
    if (!FM.storage || typeof FM.storage.importObject !== 'function') throw new Error('FM.storage.importObject is not reachable');
    const P = FM.scene.project, keepLayers = FM.scene.layers.slice(), keepSel = [FM.scene.selectedId, FM.scene.selectedIds];
    const had = P.width + 'x' + P.height + 'x' + P.duration;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const realRender = FM.renderScene, sizes = [];
    try {
      // a layer with 8 Glow effects on a 1080 x 1920 project: measured 3.0 s per full-size render here, and 0.16 s at card size
      P.width = 1080; P.height = 1920; P.duration = 6; FM.scene.layers.length = 0; FM.history.reset();
      FM.addShapeLayer('rect'); const l = FM.scene.layers[0]; l.shapeW = 300; l.shapeH = 300; l.start = 0; l.duration = 6; l.effects = [];
      for (let k = 0; k < 8; k++) l.effects.push(FM.fxRegistry.makeInstance('glow'));
      const obj = { app: 'freemotion', project: Object.assign({}, P, { name: 'pf1 probe' }), layers: JSON.parse(JSON.stringify(FM.scene.layers)) };
      FM.scene.layers.length = 0; FM.history.reset();
      const where = [], heavyW = [];
      FM.renderScene = function (ctx, scn) { const c = ctx && ctx.canvas; if (c) { const heavy = !!(scn && scn.layers && scn.layers.some(x => x && x.effects && x.effects.length === 8)); sizes.push(c.width); if (heavy) heavyW.push(c.width); where.push(c.width + ' <- ' + new Error().stack.split('\n').slice(2, 6).map(x => x.trim().replace(/http:\/\/[^/]+\//, '')).join(' < ')); } return realRender.apply(this, arguments); };
      const t0 = performance.now();
      const ok = await FM.storage.importObject(obj);
      const ms = performance.now() - t0;
      await new Promise(r => setTimeout(r, 400));
      FM.renderScene = realRender;
      if (!ok) throw new Error('setup: the import was refused');
      if (FM.scene.layers.length !== 1 || (FM.scene.layers[0].effects || []).length !== 8) throw new Error('setup: the imported layer lost its effects');
      const big = heavyW.filter(w => w > 1000);   // the preview canvas is smaller than the project; only a project-size render counts here
      if (big.length) throw new Error('opening the project rendered it at full size ' + big.length + ' time(s) (canvas widths ' + big.join(', ') + '): the card only needs 360 px, and a full-size render of this stack is about 3 s each');
      const cardW = Math.round(1080 * Math.min(360 / 1080, 360 / 1920)) * 2;   // the card is drawn at twice its 203 px width
      // the OUTGOING project's card is drawn first (create() keeps it fresh); what must not repeat is the IMPORTED project's
      const mine = heavyW.filter(w => w === cardW);
      if (mine.length > 1) throw new Error('the imported project\u2019s card was drawn ' + mine.length + ' times for one import, once is enough');
      /* CEILING WITH HEADROOM: measured here, 6.2 s before and 0.3 to 0.6 s after (one layer, 8 Glow, 1080 x 1920). 2.5 s is four times the worst
         "after" and well under the "before", so a slower machine passes and the old behaviour does not. */
      if (ms > 2500) throw new Error('the import took ' + Math.round(ms) + ' ms (ceiling 2500; measured 6200 before the fix and 300 to 600 after)');
    } finally {
      FM.renderScene = realRender;
      try { for (const p of (FM.projects.list() || []).filter(p => /pf1 probe/.test(p.name || ''))) await FM.projects.remove(p.id); } catch (e) {}
      if (had !== P.width + 'x' + P.height + 'x' + P.duration) { /* the open project is whatever the import left; the suite resets per test */ }
    }
  });

