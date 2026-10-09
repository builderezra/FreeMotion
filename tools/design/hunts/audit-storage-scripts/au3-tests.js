  /* ════════ AU3: repro tests for the js/storage.js audit. Append before `async function run()` in tests/tests.js; `?only=AU3` runs them. ════════ */
  test('AU3-1 a stored project whose layers list holds a null (an undefined entry stringifies to null) still OPENS, without the null', { item: 'au3', budgetMs: 30000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const id = FM.storage.openProjectId && FM.storage.openProjectId();
    if (!id) throw new Error('setup: no project is open in the suite');
    const key = 'fm.proj.' + id, original = localStorage.getItem(key);
    const layers0 = FM.scene.layers, proj0 = FM.scene.project, sel0 = FM.scene.selectedId, ids0 = FM.scene.selectedIds;
    let err = null, ok = null;
    try {
      const a = FM.makeLayer('shape', { name: 'AU3 a', shape: 'rect', x: 300, y: 300, shapeW: 80, shapeH: 80, fill: '#c05030', start: 0, duration: 2 });
      const b = FM.makeLayer('shape', { name: 'AU3 b', shape: 'rect', x: 500, y: 300, shapeW: 80, shapeH: 80, fill: '#30a050', start: 1, duration: 2 });
      FM.scene.layers = [a, b]; FM.scene.selectedId = null; FM.scene.selectedIds = [];
      if (!FM.storage.flushSync()) throw new Error('setup: the scene would not write');
      const doc = JSON.parse(localStorage.getItem(key));
      doc.layers = [doc.layers[0], null, doc.layers[1]];
      localStorage.setItem(key, JSON.stringify(doc));
      try { ok = await FM.storage.load(); } catch (e) { err = e; }
      await sleep(100);
      if (err) throw new Error('load() threw on a layers list holding one null: ' + (err && err.message) + ' — the project cannot be opened, and neither can the others behind it (the boot .then never runs)');
      if (!ok) throw new Error('load() refused the document');
      const names = FM.scene.layers.map(l => l && l.name).join('|');
      if (FM.scene.layers.some(l => !l) || names !== 'AU3 a|AU3 b') throw new Error('the two real layers should survive and the null go: ' + names);
    } finally {
      if (original != null) localStorage.setItem(key, original); else localStorage.removeItem(key);
      try { await FM.storage.load(); } catch (e) {}
      FM.scene.layers = layers0; FM.scene.project = proj0; FM.scene.selectedId = sel0; FM.scene.selectedIds = ids0;
      try { FM.refreshAll(); } catch (e) {}
    }
  });

  test('AU3-1b importing a project file whose layers list holds a null imports the real layers instead of throwing', { item: 'au3', budgetMs: 30000 }, async function () {
    const layers0 = FM.scene.layers, proj0 = FM.scene.project, sel0 = FM.scene.selectedId, ids0 = FM.scene.selectedIds;
    let err = null, ok = null;
    try {
      const a = FM.makeLayer('shape', { name: 'AU3 imp a', shape: 'rect', x: 300, y: 300, shapeW: 80, shapeH: 80, fill: '#c05030', start: 0, duration: 2 });
      const b = FM.makeLayer('shape', { name: 'AU3 imp b', shape: 'rect', x: 500, y: 300, shapeW: 80, shapeH: 80, fill: '#30a050', start: 1, duration: 2 });
      const obj = JSON.parse(JSON.stringify({ project: { name: 'x', width: 1080, height: 1920, fps: 30, duration: 3, background: '#000000' }, layers: [a, null, b], selectedId: a.id, selectedIds: [a.id] }, FM.jsonReplacer));
      try { ok = await FM.storage.applyScene(obj); } catch (e) { err = e; }
      if (err) throw new Error('applyScene threw on a layers list holding one null: ' + err.message);
      if (!ok) throw new Error('applyScene refused the file');
      const names = FM.scene.layers.map(l => l && l.name).join('|');
      if (names !== 'AU3 imp a|AU3 imp b') throw new Error('the two real layers should arrive and the null go: ' + names);
    } finally {
      FM.scene.layers = layers0; FM.scene.project = proj0; FM.scene.selectedId = sel0; FM.scene.selectedIds = ids0;
      try { FM.refreshAll(); } catch (e) {}
    }
  });

  test('AU3-2 the boot sweep keeps the media a damaged project document still names (it used to read an unparseable document as naming nothing and delete its clips)', { item: 'au3', budgetMs: 60000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    if (!FM.projects || !FM.projects.pruneOrphans || !FM.storage.writeMedia || !FM.storage.readMedia) throw new Error('setup: the storage seams are missing');
    const docKey = 'fm.proj.au3_damaged_' + Date.now().toString(36), named = 'au3_named_' + Date.now().toString(36), loose = 'au3_loose_' + Date.now().toString(36);
    const blob = () => new Blob([new Uint8Array(64)], { type: 'image/png' });
    try {
      if (!(await FM.storage.writeMedia(named, { file: blob(), kind: 'image', rev: 0 })) || !(await FM.storage.writeMedia(loose, { file: blob(), kind: 'image', rev: 0 }))) throw new Error('setup: could not write the two test blobs');
      // a project document cut off mid-write: valid start, layer ids present, no closing brackets
      localStorage.setItem(docKey, '{"rev":4,"project":{"name":"Damaged","width":1080,"height":1920,"fps":30,"duration":3},"layers":[{"id":"' + named + '","type":"image","name":"kept clip","start":0,"duration":3,"transform":{"x":540,');
      FM._mediaBusy = 0;
      await FM.projects.pruneOrphans(); await sleep(150);
      const gotLoose = await FM.storage.readMedia(loose);
      if (gotLoose) throw new Error('CONTROL: the sweep did not delete an unreferenced blob, so it did not run and a surviving blob proves nothing');
      const gotNamed = await FM.storage.readMedia(named);
      if (!gotNamed) throw new Error('the sweep deleted a clip that a damaged (unparseable) project document still names — the document is on the device, the project is listed, and its media is gone for good');
    } finally {
      try { localStorage.removeItem(docKey); } catch (e) {}
      try { await FM.storage.removeMedia(named); await FM.storage.removeMedia(loose); } catch (e) {}
    }
  });

  test('AU3-2b deleting a project keeps a clip that a damaged sibling document still names', { item: 'au3', budgetMs: 60000 }, async function () {
    const stamp = Date.now().toString(36), idX = 'au3x_' + stamp, idY = 'au3y_' + stamp, shared = 'au3_shared_' + stamp;
    const blob = () => new Blob([new Uint8Array(64)], { type: 'image/png' });
    try {
      if (!(await FM.storage.writeMedia(shared, { file: blob(), kind: 'image', rev: 0 }))) throw new Error('setup: could not write the test blob');
      localStorage.setItem('fm.proj.' + idX, JSON.stringify({ rev: 1, project: { name: 'X', width: 1080, height: 1920, fps: 30, duration: 3 }, layers: [{ id: shared, type: 'image', name: 'c', start: 0, duration: 3, transform: {} }] }));
      localStorage.setItem('fm.proj.' + idY, '{"rev":2,"project":{"name":"Y"},"layers":[{"id":"' + shared + '","type":"image","name":"c","start":0,');   // cut off: names the same layer id (a linked copy)
      await FM.projects.remove(idX);
      const got = await FM.storage.readMedia(shared);
      if (!got) throw new Error('deleting project X removed a clip that project Y (its document is damaged but still on the device) names');
    } finally {
      try { localStorage.removeItem('fm.proj.' + idX); localStorage.removeItem('fm.proj.' + idY); } catch (e) {}
      try { await FM.storage.removeMedia(shared); } catch (e) {}
    }
  });

  test('AU3-3 a stored project (and an imported file) whose layer lacks a transform, carries a non-object fillGradient, or has a caption cue without times still opens', { item: 'au3', budgetMs: 60000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const id = FM.storage.openProjectId && FM.storage.openProjectId();
    if (!id) throw new Error('setup: no project is open in the suite');
    const key = 'fm.proj.' + id, original = localStorage.getItem(key);
    const layers0 = FM.scene.layers, proj0 = FM.scene.project, sel0 = FM.scene.selectedId, ids0 = FM.scene.selectedIds;
    const bad = [];
    const mk = (name) => FM.makeLayer('shape', { name: name, shape: 'rect', x: 300, y: 300, shapeW: 80, shapeH: 80, fill: '#c05030', start: 0, duration: 2 });
    const variants = [
      ['no transform', l => { delete l.transform; }],
      ['transform null', l => { l.transform = null; }],
      ['fillGradient a string', l => { l.fillGradient = 'x'; }],
      ['fillGradient true', l => { l.fillGradient = true; }],
      ['a caption cue with no times', l => { l.type = 'text'; l.captions = [{ text: 'hi' }, { text: 'ok', start: 0, end: 1 }]; }],
    ];
    try {
      for (const [what, mutate] of variants) {
        const a = mk('AU3 ok'), b = mk('AU3 ' + what); mutate(b);
        const doc = JSON.parse(JSON.stringify({ rev: 1, project: { name: 'x', width: 1080, height: 1920, fps: 30, duration: 3, background: '#000000' }, layers: [a, b], selectedId: null, selectedIds: [] }, FM.jsonReplacer));
        // the stored path
        localStorage.setItem(key, JSON.stringify(doc));
        let err = null; try { const ok = await FM.storage.load(); if (!ok) err = new Error('load() refused it'); } catch (e) { err = e; }
        await sleep(60);
        if (err) bad.push('open (' + what + '): ' + err.message);
        else { try { FM.refreshAll(); FM.timeline.rebuild(); } catch (e) { bad.push('draw after open (' + what + '): ' + e.message); } }
        // the import path
        let err2 = null; try { await FM.storage.applyScene(Object.assign({ app: 'freemotion' }, JSON.parse(JSON.stringify(doc)))); } catch (e) { err2 = e; }
        if (err2) bad.push('import (' + what + '): ' + err2.message);
      }
      if (bad.length) throw new Error(bad.join('; '));
    } finally {
      if (original != null) localStorage.setItem(key, original); else localStorage.removeItem(key);
      try { await FM.storage.load(); } catch (e) {}
      FM.scene.layers = layers0; FM.scene.project = proj0; FM.scene.selectedId = sel0; FM.scene.selectedIds = ids0;
      try { FM.refreshAll(); FM.timeline.rebuild(); } catch (e) {}
    }
  });

  test('AU3-4 deleting a stored media record whose transaction aborts at commit still finishes (removeMedia used to wait for ever, so removing a project hung on it)', { item: 'au3', budgetMs: 30000 }, async function () {
    if (!FM.storage.removeMedia || typeof IDBDatabase === 'undefined') throw new Error('setup: no removeMedia or no IndexedDB here');
    const realTx = IDBDatabase.prototype.transaction;
    const settle = (p, ms) => Promise.race([p.then(() => 'done'), new Promise(r => setTimeout(() => r('hung'), ms))]);
    try {
      // CONTROL: with the real database, a delete finishes
      if (await settle(FM.storage.removeMedia('au3_nothing_here'), 3000) !== 'done') throw new Error('CONTROL: removeMedia hung on the real database');
      // an IndexedDB transaction can abort AFTER its request succeeded (the commit is refused: quota, eviction): only `abort` fires, `error` does not
      IDBDatabase.prototype.transaction = function () {
        const tx = { objectStore() { return { delete() { setTimeout(() => { try { tx.onabort && tx.onabort({ type: 'abort' }); } catch (e) {} }, 0); return {}; } }; }, error: { name: 'AbortError' } };
        return tx;
      };
      const r = await settle(FM.storage.removeMedia('au3_aborting'), 2500);
      if (r !== 'done') throw new Error('removeMedia never finished when the delete transaction aborted at commit: every caller that awaits it (removing a project, the boot sweep) hangs behind it');
    } finally { IDBDatabase.prototype.transaction = realTx; }
  });

