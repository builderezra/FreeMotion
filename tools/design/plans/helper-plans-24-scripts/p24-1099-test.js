  /* ═══ P24 #1099: opening a file must not be able to freeze the app — shape and size checks at the import door ═══ */
  test('P24 #1099 a file with a damaged project block, too many keyframes, too many path points or too many fonts is refused before anything is created; a stray entry in the layer list is dropped', { item: '1099', budgetMs: 120000 }, async function () {
    if (!FM.storage || typeof FM.storage.importObject !== 'function' || typeof FM.storage.sceneFileProblem !== 'function') throw new Error('FM.storage.importObject / sceneFileProblem is not reachable');
    const realToast = FM.toast, said = [];
    const count = () => (FM.projects.list() || []).length;
    const proj = { name: 'p24 probe', width: 200, height: 200, duration: 3, fps: 30 };
    const file = (layers, extra) => Object.assign({ app: 'freemotion', project: Object.assign({}, proj), layers: layers }, extra || {});
    const shape = (n, kfs) => ({ id: 'l' + n, type: 'shape', shape: 'rect', name: 'r' + n, transform: { x: kfs ? { kf: kfs } : 100, y: 100, scale: 1, rotation: 0, opacity: 1 }, start: 0, duration: 3 });
    const kfs = n => { const a = []; for (let i = 0; i < n; i++) a.push({ t: i * 0.001, v: i % 50, e: 'linear' }); return a; };
    const pathLayer = pts => { const sub = []; for (let i = 0; i < pts; i++) sub.push([i % 300, (i * 7) % 300]); return { id: 'lp', type: 'shape', shape: 'path', name: 'p', subs: [sub], closed: false, transform: { x: 100, y: 100, scale: 1, rotation: 0, opacity: 1 }, start: 0, duration: 3 }; };
    const fonts = n => { const o = {}; for (let i = 0; i < n; i++) o['f' + i] = { family: 'P24Face' + i, name: 'f' + i, dataURL: 'data:font/ttf;base64,AAAA' }; return o; };
    try {
      FM.toast = function (m) { said.push(String(m || '')); };
      // CONTROLS: ordinary files pass the door check
      for (const [what, obj] of [['an empty project', file([])], ['2000 keyframes on one setting', file([shape(1, kfs(2000))])], ['5000 path points', file([pathLayer(5000)])], ['16 fonts', file([], { fonts: fonts(16) })]]) {
        const p = FM.storage.sceneFileProblem(obj); if (p) throw new Error('CONTROL: ' + what + ' was refused: ' + p);
      }
      // the refusals, each by its door check (cheap: must not walk the whole file first)
      const bad = [
        ['project given as text', file([], { project: 'x' }), /canvas settings/i],
        ['project given as a list', file([], { project: [1, 2] }), /canvas settings/i],
        ['2001 keyframes on one setting', file([shape(1, kfs(2001))]), /keyframes/i],
        ['40000 keyframes', file([shape(1, kfs(40000))]), /keyframes/i],
        ['100000 path points', file([pathLayer(100000)]), /points/i],
        ['17 fonts', file([], { fonts: fonts(17) }), /fonts/i],
        ['fonts given as a list', file([], { fonts: [1, 2] }), /fonts/i],
      ];
      for (const [what, obj, wants] of bad) {
        const t0 = performance.now(); const p = FM.storage.sceneFileProblem(obj); const ms = performance.now() - t0;
        if (!p) throw new Error(what + ' passed the door check');
        if (!wants.test(p)) throw new Error(what + ' was refused with "' + p + '", which does not say what was wrong');
        if (ms > 150) throw new Error(what + ': the refusal itself took ' + Math.round(ms) + ' ms');
      }
      // through importObject: nothing created, a message said, the open project untouched
      const before = count();
      for (const [what, obj] of [['project "x"', file([], { project: 'x' })], ['40000 keyframes', file([shape(1, kfs(40000))])]]) {
        said.length = 0;
        const ok = await FM.storage.importObject(obj);
        if (ok) throw new Error('importing ' + what + ' reported success');
        if (count() !== before) throw new Error('importing ' + what + ' left ' + (count() - before) + ' project(s) behind');
        if (!said.length) throw new Error('importing ' + what + ' said nothing');
      }
      // a stray entry in the layer list is dropped, the rest opens
      said.length = 0;
      const mixed = file([1, 'x', null, [], shape(2)]);
      const ok = await FM.storage.importObject(mixed);
      if (!ok) throw new Error('a file with stray non-object layer entries was refused: ' + said.join(' | '));
      if (FM.scene.layers.length !== 1) throw new Error('the stray entries were not dropped: ' + FM.scene.layers.length + ' layers after the import');
    } finally {
      FM.toast = realToast;
      try { for (const p of (FM.projects.list() || []).filter(p => /p24 probe/.test(p.name || ''))) await FM.projects.remove(p.id); } catch (e) {}
    }
  });

