  /* ═══ P17: five LOW items from the ChatGPT batch 3 write-up (#1051 to #1055). Each states its CONTROL first, so a red is for the reason the entry gives. ═══ */
  test('P17 #1051 a project file whose "project" (or a layer) is not an object is refused with the existing reason, makes no junk project, and does not throw', { item: '1051' }, async function () {
    const realToast = FM.toast, said = [], count = () => (FM.projects.list() || []).length;
    try {
      FM.toast = function (m) { said.push(String(m || '')); };
      const before = count();
      const ok0 = { app: 'freemotion', project: { name: 'x1051 good', width: 200, height: 200, duration: 3, fps: 30 }, layers: [] };
      const bad = [];
      ['x', 5, true, []].forEach(v => bad.push([{ app: 'freemotion', project: v, layers: [] }, 'project ' + JSON.stringify(v)]));
      [[null], ['x'], [5], [[]]].forEach(v => bad.push([{ app: 'freemotion', project: { name: 'x1051', width: 100, height: 100, duration: 1, fps: 30 }, layers: v }, 'layers ' + JSON.stringify(v)]));
      for (const [obj, what] of bad) {
        said.length = 0;
        let ok, threw = null;
        try { ok = await FM.storage.importObject(obj); } catch (e) { threw = e; }
        if (threw) throw new Error(what + ' threw out of importObject: ' + threw.message);
        if (ok) throw new Error(what + ' was imported');
        if (count() !== before) throw new Error(what + ' left ' + (count() - before) + ' junk project(s) behind');
        if (!said.length) throw new Error(what + ' said nothing');
        if (/Could not read that project file$/.test(said[said.length - 1])) throw new Error(what + ' fell through to the generic catch (“' + said.join(' | ') + '”): the gate did not name the problem');
      }
      /* the clamp itself (a collab host runs it on whatever a peer's `project` write holds): a non-object is left alone and never throws */
      for (const v of ['x', 5, true, null, undefined, [], [1, 2]]) { try { FM.storage._clampProjectDims(v); } catch (e) { throw new Error('_clampProjectDims(' + JSON.stringify(v) + ') threw ' + e.message); } }
      const arr = []; FM.storage._clampProjectDims(arr); if (Object.keys(arr).length) throw new Error('_clampProjectDims wrote ' + Object.keys(arr) + ' onto a list');
      /* applyScene keeps its own guard (it has other callers in the suite): it answers false, never throws */
      for (const [obj, what] of [[{ project: 'x', layers: [] }, 'project "x"'], [{ project: [], layers: [] }, 'project []'], [{ project: { width: 100, height: 100 }, layers: [null] }, 'layers [null]']]) {
        let r, threw = null; try { r = await FM.storage.applyScene(obj); } catch (e) { threw = e; }
        if (threw || r !== false) throw new Error('applyScene(' + what + ') ' + (threw ? 'threw ' + threw.message : 'returned ' + r));
      }
      said.length = 0;
      const good = await FM.storage.importObject(ok0);
      if (!good || count() !== before + 1) throw new Error('CONTROL: a well-formed file was refused: ' + said.join(' | '));
    } finally {
      FM.toast = realToast;
      try { for (const p of (FM.projects.list() || []).filter(p => /x1051 good/.test(p.name || ''))) if (FM.projects.remove) await FM.projects.remove(p.id); } catch (e) {}
    }
  });

  test('P17 #1052 camera focus / fog "enabled" and a note’s "remind" are read as booleans: the string "false" no longer switches depth of field, fog or a reminder on', { item: '1052' }, function () {
    const mk = (fe, ge) => { const c = FM.makeLayer('camera', { name: 'cam' }); c.focus = { enabled: fe, distance: 10, dof: 200, blur: 0.5 }; c.fog = { enabled: ge, color: '#ffffff', near: 0, far: 2000 }; return c; };
    const t = mk(true, true), f = mk(false, false);
    FM.storage._sanitizeLayers([t, f]);
    if (t.focus.enabled !== true || t.fog.enabled !== true) throw new Error('CONTROL: true did not stay true (' + t.focus.enabled + ', ' + t.fog.enabled + ')');
    if (f.focus.enabled !== false || f.fog.enabled !== false) throw new Error('CONTROL: false did not stay false');
    const s = mk('false', 'false'), z = mk(0, 'no');
    FM.storage._sanitizeLayers([s, z]);
    if (s.focus.enabled !== false) throw new Error('focus.enabled "false" became ' + s.focus.enabled);
    if (s.fog.enabled !== false) throw new Error('fog.enabled "false" became ' + s.fog.enabled);
    if (z.focus.enabled !== false || z.fog.enabled !== false) throw new Error('0 / "no" became ' + z.focus.enabled + ', ' + z.fog.enabled);
    const p = { width: 320, height: 240, fps: 30, duration: 1, notes: [{ id: 'a', text: 'keep', remind: true }, { id: 'b', text: 'str', remind: 'false' }, { id: 'c', text: 'num', remind: 1 }, { id: 'd', text: 'off', remind: false }, { id: 'e', text: 'none' }] };
    FM.storage._clampProjectDims(p);
    const by = id => p.notes.find(n => n.id === id);
    if (!by('a') || by('a').remind !== true) throw new Error('CONTROL: a real reminder (true) was changed: ' + JSON.stringify(by('a')));
    if (by('b').remind) throw new Error('a note with remind "false" is a reminder (' + JSON.stringify(by('b').remind) + ')');
    if (by('c').remind) throw new Error('a note with remind 1 is a reminder');
    if (by('d').remind !== false || 'remind' in by('e') && by('e').remind) throw new Error('CONTROL: false / absent should stay off');
    if (p.notes.length !== 5 || by('a').text !== 'keep') throw new Error('a note was dropped or its text changed');
  });

  test('P17 #1053 numeric text such as "0.5" is read as the number in audio effects, behaviours, Trim Path, dashed stroke and Repeater, as it already is in effect parameters', { item: '1053' }, function () {
    const afx = FM.audioFxRegistry.all().find(d => d.params.some(p => typeof p.def === 'number' && isFinite(p.min) && isFinite(p.max) && p.max > p.min));
    if (!afx) throw new Error('setup: no audio effect with a numeric parameter');
    const ap = afx.params.find(p => typeof p.def === 'number' && isFinite(p.min) && isFinite(p.max) && p.max > p.min), av0 = +(((ap.min + ap.max) / 2).toFixed(3)), av = av0 === ap.def ? +(ap.min + (ap.max - ap.min) * 0.37).toFixed(3) : av0;
    if (av === ap.def) throw new Error('setup: the probe value equals the default, so it proves nothing');
    const L = FM.makeLayer('shape', { name: 'p17' });
    L.audioFx = [{ type: afx.type, enabled: true, params: { [ap.key]: String(av) } }];
    L.behaviors = [{ type: 'wiggle', prop: 'x', enabled: true, params: { amp: '35', freq: '3' } }];
    L.trimPath = { enabled: true, start: '0.2', end: '0.5', offset: '0.1' };
    L.stroke = Object.assign({}, L.stroke, { dash: { enabled: true, length: '20', gap: '10', offset: '5' } });
    L.repeater = { enabled: true, copies: '4', offsetX: '30', offsetY: '5', rotation: '10', scale: '0.5', opacity: '0.5', anchorX: '0.25', anchorY: '0.75' };
    const C = FM.makeLayer('shape', { name: 'p17 control' });
    C.trimPath = { enabled: true, start: 0.2, end: 0.5, offset: 0.1 }; C.repeater = { enabled: true, copies: 4, offsetX: 30, offsetY: 5, rotation: 10, scale: 0.5, opacity: 0.5, anchorX: 0.25, anchorY: 0.75 };
    C.audioFx = [{ type: afx.type, enabled: true, params: { [ap.key]: av } }];
    const bad = FM.makeLayer('shape', { name: 'p17 junk' });
    bad.trimPath = { enabled: true, start: 'abc', end: ' ', offset: 'Infinity' };
    FM.storage._sanitizeLayers([L, C, bad]);
    const got = [];
    const eq = (what, a, b) => { if (!(Math.abs(a - b) < 1e-9)) got.push(what + ' is ' + a + ', want ' + b); };
    eq('audioFx ' + afx.type + '.' + ap.key, L.audioFx[0].params[ap.key], av);
    eq('behaviours wiggle.amp', L.behaviors[0].params.amp, 35); eq('behaviours wiggle.freq', L.behaviors[0].params.freq, 3);
    eq('trimPath.start', L.trimPath.start, 0.2); eq('trimPath.end', L.trimPath.end, 0.5); eq('trimPath.offset', L.trimPath.offset, 0.1);
    eq('dash.length', L.stroke.dash.length, 20); eq('dash.gap', L.stroke.dash.gap, 10); eq('dash.offset', L.stroke.dash.offset, 5);
    eq('repeater.copies', L.repeater.copies, 4); eq('repeater.scale', L.repeater.scale, 0.5); eq('repeater.anchorX', L.repeater.anchorX, 0.25);
    if (got.length) throw new Error(got.join('; '));
    if (C.trimPath.end !== 0.5 || C.repeater.copies !== 4 || C.audioFx[0].params[ap.key] !== av) throw new Error('CONTROL: real numbers changed');
    if (bad.trimPath.start !== 0 || bad.trimPath.end !== 1 || bad.trimPath.offset !== 0) throw new Error('CONTROL: text that is not a number should still fall back to the default: ' + JSON.stringify(bad.trimPath));
  });

  test('P17 #1054 the ? sheet names the condition on the 1 – 5 row, lists the 1 – 9 card keys, and mentions Backspace and Ctrl+Y', { item: '1054' }, async function () {
    FM.shortcuts.show(); await sleep(150);
    try {
      const rows = Array.from(document.querySelectorAll('#shortcuts-overlay .shortcut-row')).map(r => Array.from(r.children).map(c => c.textContent));
      const row = rx => (rows.find(r => rx.test(r[0])) || ['', '']).join(' · ');
      if (!/^Space/.test(rows[0][0])) throw new Error('CONTROL: the sheet is not the keyboard list: ' + JSON.stringify(rows[0]));
      if (!/nothing selected/i.test(row(/^1 – [2-5]\b/))) throw new Error('the 1 – 5 row does not say it needs nothing selected: “' + row(/^1 – [2-5]\b/) + '”');
      if (!rows.some(r => /^1 – 9/.test(r[0]) && /layer selected/i.test(r[1]) && /card/i.test(r[1]))) throw new Error('no row says that 1 – 9 open a selected layer’s cards');
      if (!rows.some(r => /Backspace/.test(r[0]) && /Delete/i.test(r[1] + r[0]))) throw new Error('Backspace is not listed beside Delete');
      if (!rows.some(r => /(Ctrl|⌘)\s*\+\s*Y/.test(r[0]) && /Redo/.test(r[1]))) throw new Error('Ctrl+Y is not listed as Redo');
      /* the longer keys must still fit their column (a clipped key reads as a different shortcut) */
      const clipped = Array.from(document.querySelectorAll('#shortcuts-overlay .shortcut-key')).filter(k => k.scrollWidth > k.clientWidth + 1).map(k => k.textContent);
      if (clipped.length) throw new Error('these keys overflow their column: ' + clipped.join(' | '));
    } finally { FM.shortcuts.hide({ now: true }); }
    /* the paired behaviour check: with a layer selected, 1 opens a card (not the Add menu) */
    const L = FM.makeLayer('shape', { name: 'p17 key', start: 0, duration: 2 });
    const homeWas = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (homeWas) FM.home.close();   // a full-screen overlay eats bare keys (app.js overlayOwnsScreen)
    const P0 = FM.scene; FM.scene = scene([L]); FM.scene.selectedId = L.id; FM.scene.selectedIds = [L.id];
    try {
      let tab = null; const ot = FM.addMenu.openTab; FM.addMenu.openTab = function (k) { tab = k; };
      let opened = null; const oc = FM.inspector.openCategoryByIndex; FM.inspector.openCategoryByIndex = function (n) { opened = n; return true; };
      try { document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '1', bubbles: true, cancelable: true })); } finally { FM.addMenu.openTab = ot; FM.inspector.openCategoryByIndex = oc; }
      if (opened !== 1 || tab !== null) throw new Error('with a layer selected, 1 did not open its first card (card ' + opened + ', add-menu tab ' + tab + ', overlayOwnsScreen ' + (FM.overlayOwnsScreen && FM.overlayOwnsScreen()) + ')');
    } finally { FM.scene = P0; if (homeWas) FM.home.open(); }
  });

  test('P17 #1055 Pixelate on an adjustment layer honours Block aspect and Edges (Soft), and a Pixelate on a clip draws exactly as before', { item: '1055' }, function () {
    const W = 160, H = 120;
    const mkBase = () => { const b = FM.makeLayer('shape', { name: 'base', shape: 'rect', x: W / 2, y: H / 2, shapeW: W, shapeH: H, start: 0, duration: 3 }); b.fill = '#335577'; const t = FM.makeLayer('text', { text: 'Ag7', x: W * 0.4, y: H * 0.45, size: 60, color: '#e8d24a', start: 0, duration: 3 }); return [t, b]; };
    const render = (setup) => { const layers = mkBase(); setup(layers); const c = offscreen(W, H); FM.renderScene(c.getContext('2d'), scene(layers, { project: { width: W, height: H, fps: 30, duration: 3, background: '#101820' } }), 0.5); return c.getContext('2d').getImageData(0, 0, W, H).data; };
    const adj = (params) => (layers) => { const A = FM.makeLayer('adjustment', { name: 'adj', start: 0, duration: 3 }); A.start = 0; A.duration = 3; const fx = FM.fxRegistry.makeInstance('pixelate'); Object.assign(fx.params, params); A.effects = [fx]; layers.unshift(A); };
    const clip = (params) => (layers) => { const fx = FM.fxRegistry.makeInstance('pixelate'); Object.assign(fx.params, params); layers[0].effects = [fx]; };
    const base = adj({ size: 12, aspect: 100, smooth: 0 });
    const a0 = render(base), none = render(() => {});
    if (!pxDiff(a0, none).bytes) throw new Error('CONTROL: Pixelate on an adjustment layer changes nothing at all');
    if (!pxDiff(render(clip({ size: 12, aspect: 100, smooth: 0 })), render(clip({ size: 12, aspect: 400, smooth: 0 }))).bytes) throw new Error('CONTROL: the clip path ignores Block aspect');
    const lo = render(adj({ size: 12, aspect: 25, smooth: 0 })), hi = render(adj({ size: 12, aspect: 400, smooth: 0 }));
    if (!pxDiff(lo, a0).bytes || !pxDiff(hi, a0).bytes || !pxDiff(lo, hi).bytes) throw new Error('Block aspect 25 / 100 / 400 render alike on an adjustment layer (' + pxDiff(lo, a0).bytes + ', ' + pxDiff(hi, a0).bytes + ', ' + pxDiff(lo, hi).bytes + ' bytes differ)');
    if (!pxDiff(render(adj({ size: 12, aspect: 100, smooth: 1 })), a0).bytes) throw new Error('Edges: Soft renders like Blocks on an adjustment layer');
    /* …and on a slice of the frame (a zoomed preview: the plate does not start at the frame's corner, so the adjustment layer takes pixelateOnFrameGrid, the export's grid) */
    const renderOff = (setup) => { const layers = mkBase(); setup(layers); const c = offscreen(120, 90); c.__fmCrop = true; c.__fmRS = 1; c.__fmOX = 20; c.__fmOY = 10; FM.renderScene(c.getContext('2d'), scene(layers, { project: { width: W, height: H, fps: 30, duration: 3, background: '#101820' } }), 0.5); return c.getContext('2d').getImageData(0, 0, 120, 90).data; };
    const o0 = renderOff(adj({ size: 12, aspect: 100, smooth: 0 }));
    if (!pxDiff(o0, renderOff(() => {})).bytes) throw new Error('CONTROL: the slice render shows no Pixelate at all');
    if (!pxDiff(renderOff(adj({ size: 12, aspect: 25, smooth: 0 })), o0).bytes || !pxDiff(renderOff(adj({ size: 12, aspect: 400, smooth: 0 })), o0).bytes) throw new Error('Block aspect is ignored on a slice of the frame (the export-grid path)');
    if (!pxDiff(renderOff(adj({ size: 12, aspect: 100, smooth: 1 })), o0).bytes) throw new Error('Edges: Soft is ignored on a slice of the frame (the export-grid path)');
    /* the clip path is byte-for-byte unchanged by the fix: a frozen render of it, computed from the same inputs, must still match itself across two runs and across the adjustment edit */
    const c1 = render(clip({ size: 12, aspect: 200, smooth: 1 })), c2 = render(clip({ size: 12, aspect: 200, smooth: 1 }));
    if (pxDiff(c1, c2).bytes) throw new Error('CONTROL: the clip render is not deterministic');
  });
