  /* AU3-5 is NOT in the green set: it is the measurement for a finding that needs his decision (see audit-storage.md). It is red on main, and stays red until a policy is chosen. */
  test('AU3-5 [needs a decision] opening a project in a build that does not know one of its effects (or one of its parameters) throws that effect away, and the next autosave makes it permanent', { item: 'au3', budgetMs: 60000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const id = FM.storage.openProjectId && FM.storage.openProjectId();
    if (!id) throw new Error('setup: no project is open in the suite');
    const key = 'fm.proj.' + id, original = localStorage.getItem(key);
    const layers0 = FM.scene.layers, proj0 = FM.scene.project, sel0 = FM.scene.selectedId, ids0 = FM.scene.selectedIds;
    try {
      const a = FM.makeLayer('shape', { name: 'AU3 fx', shape: 'rect', x: 300, y: 300, shapeW: 80, shapeH: 80, fill: '#c05030', start: 0, duration: 2 });
      a.effects = [{ type: 'blur', enabled: true, params: { radius: 7, futureknob: 3 } }, { type: 'effectFromANewerBuild', enabled: true, params: { amount: 40 } }];
      FM.scene.layers = [a]; FM.scene.selectedId = null; FM.scene.selectedIds = [];
      if (!FM.storage.flushSync()) throw new Error('setup: the scene would not write');
      const stored = JSON.parse(localStorage.getItem(key));
      stored.layers[0].effects = [{ type: 'blur', enabled: true, params: { radius: 7, futureknob: 3 } }, { type: 'effectFromANewerBuild', enabled: true, params: { amount: 40 } }];
      localStorage.setItem(key, JSON.stringify(stored));
      await FM.storage.load(); await sleep(100);
      FM.storage.flushSync();
      const after = JSON.parse(localStorage.getItem(key)).layers[0].effects || [];
      const types = after.map(e => e.type).join(',');
      if (types.indexOf('effectFromANewerBuild') < 0) throw new Error('the effect from a newer build is gone from the stored document after one open (' + (types || 'no effects') + ')');
    } finally {
      if (original != null) localStorage.setItem(key, original); else localStorage.removeItem(key);
      try { await FM.storage.load(); } catch (e) {}
      FM.scene.layers = layers0; FM.scene.project = proj0; FM.scene.selectedId = sel0; FM.scene.selectedIds = ids0;
      try { FM.refreshAll(); } catch (e) {}
    }
  });

