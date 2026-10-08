  /* ═══ P15: #1041 (nested styled groups), #1042 (embedded-font index), #1043 (one undo step per picked file), #1044 (non-ASCII download names), #1045 (preset save on a full phone) ═══
     Append before `async function run()` in tests/tests.js. `?only=P15` runs them. Uses scene(), offscreen() and hunt2dCatchDownloads() from tests.js itself. */
  var P15_FONT_B64 = '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';
  function p15FontBytes() { return Uint8Array.from(atob(P15_FONT_B64), function (ch) { return ch.charCodeAt(0); }); }
  function p15Sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function p15Idb() { return new Promise(function (res, rej) { var rq = indexedDB.open('freemotion', 1); rq.onsuccess = function () { res(rq.result); }; rq.onerror = function () { rej(rq.error); }; }); }
  async function p15FontKeys() {
    var db = await p15Idb();
    try { return await new Promise(function (res, rej) { var rq = db.transaction('media', 'readonly').objectStore('media').getAllKeys(); rq.onsuccess = function () { res(rq.result.filter(function (k) { return typeof k === 'string' && k.indexOf('font:') === 0; })); }; rq.onerror = function () { rej(rq.error); }; }); }
    finally { db.close(); }
  }
  async function p15DelKey(k) {
    var db = await p15Idb();
    try { await new Promise(function (res) { var rq = db.transaction('media', 'readwrite').objectStore('media').delete(k); rq.onsuccess = res; rq.onerror = res; }); } finally { db.close(); }
  }
  function p15DataUrl(file) { return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(file); }); }

  /* P15 #1041: groups A > B > C, each with its own fade. Every fade applies once, whichever order the scene lists them in, and a plain transform-only group
     in the chain does not break it. Mixed fades (0.5 / 0.8 / 0.6) so a unit that is skipped or drawn twice cannot land on the right number by symmetry. */
  test('P15 #1041 three and four nested styled groups draw each fade once (equal fades, mixed fades, and a plain group in between)', { item: '1041', budgetMs: 40000 }, function () {
    function render(fades, plainAt, outerFirst) {
      var groups = [], prev = null;
      fades.forEach(function (op, i) {
        if (i === plainAt) { var pg = FM.makeLayer('group', { name: 'plain' }); if (prev) pg.parent = prev.id; groups.push(pg); prev = pg; }
        var g = FM.makeLayer('group', { name: 'G' + i }); g.transform.opacity = op; if (prev) g.parent = prev.id; groups.push(g); prev = g;
      });
      var leaf = FM.makeLayer('shape', { shape: 'rect', name: 'white leaf', x: 60, y: 45, shapeW: 60, shapeH: 40, fill: '#ffffff' });
      leaf.parent = prev.id;
      var layers = (outerFirst ? groups : groups.slice().reverse()).concat(leaf);
      var sc = scene(layers); sc.project = { width: 120, height: 90, fps: 30, duration: 5, background: '#000000' };
      var canvas = offscreen(120, 90), ctx = canvas.getContext('2d', { willReadFrequently: true });
      var original = FM.makeLayer, builds = 0;
      try { FM.makeLayer = function (type, props) { if (type === '_flat') builds++; return original(type, props); }; FM.renderScene(ctx, sc, 0); }
      finally { FM.makeLayer = original; }
      return { red: ctx.getImageData(60, 45, 1, 1).data[0], builds: builds };
    }
    var cases = [[[0.5], -1], [[0.5, 0.5], -1], [[0.5, 0.5, 0.5], -1], [[0.5, 0.5, 0.5, 0.5], -1], [[0.5, 0.8, 0.6], -1], [[0.5, 0.5, 0.5], 1]];
    cases.forEach(function (c) {
      var want = Math.round(255 * c[0].reduce(function (a, b) { return a * b; }, 1));
      [true, false].forEach(function (outerFirst) {
        var got = render(c[0], c[1], outerFirst);
        var label = c[0].length + ' styled groups, fades ' + c[0].join('/') + (c[1] >= 0 ? ' with a plain group at ' + c[1] : '') + ' (' + (outerFirst ? 'outer' : 'inner') + ' first)';
        if (Math.abs(got.red - want) > 2) throw new Error(label + ' render ' + got.red + ', expected ' + want);
        if (got.builds !== c[0].length) throw new Error(label + ' built ' + got.builds + ' flattened units, expected exactly ' + c[0].length);
      });
    });
  });

  /* P15 #1042: two ways the embedded-font import loses a font for good. (a) it reads the font index first, awaits per font, and writes that stale list
     last, so a font imported from the picker in the meantime vanishes from the index; (b) its final index write is refused (a full phone) and nothing
     is said, and the font files it already wrote stay behind with no index entry. */
  test('P15 #1042 embedded-font import keeps a font imported meanwhile, and leaves no orphan font file when the index write is refused', { item: '1042', budgetMs: 60000 }, async function () {
    var bytes = p15FontBytes(), idx0 = localStorage.getItem('fm.fonts'), keys0 = await p15FontKeys();
    var mk = function (n) { return new File([bytes], n + '.ttf', { type: 'font/ttf' }); };
    var toasts = [], realToast = FM.toast, realSet = Storage.prototype.setItem;
    FM.toast = function (m) { toasts.push(String(m)); };
    try {
      /* (a) interleave */
      localStorage.removeItem('fm.fonts');
      var emb = {}; ['A', 'B'].forEach(function (k) { emb[k] = { name: 'P15 emb ' + k, family: 'P15Emb' + k + Date.now(), dataURL: null, css: null }; });
      var durl = await p15DataUrl(mk('emb'));
      Object.keys(emb).forEach(function (k) { emb[k].dataURL = durl; emb[k].css = emb[k].family + ', sans-serif'; });
      var pending = FM.fonts.applyEmbedded(emb);
      var picked = await FM.fonts.import(mk('P15 picked'));
      await pending;
      var fams = FM.fonts.list().map(function (f) { return f.family; });
      if (!picked) throw new Error('setup: the picker import was refused');
      if (fams.indexOf(picked.family) < 0) throw new Error('(a) a font imported from the picker while an embedded import was running is gone from the index (' + fams.length + ' listed, ' + picked.family + ' missing)');
      Object.keys(emb).forEach(function (k) { if (fams.indexOf(emb[k].family) < 0) throw new Error('(a) the embedded font ' + emb[k].family + ' is not in the index'); });
      /* (b) refused index write */
      FM.fonts.list().forEach(function (f) { try { FM.fonts.remove(f.id); } catch (e) {} });
      await p15Sleep(300);
      var before = (await p15FontKeys()).length;
      var emb2 = {}; ['C', 'D'].forEach(function (k) { emb2[k] = { name: 'P15 refused ' + k, family: 'P15Ref' + k + Date.now(), dataURL: durl, css: null }; emb2[k].css = emb2[k].family + ', sans-serif'; });
      toasts.length = 0;
      Storage.prototype.setItem = function (k, v) { if (k === 'fm.fonts') throw new DOMException('refused by the P15 test', 'QuotaExceededError'); return realSet.call(this, k, v); };
      await FM.fonts.applyEmbedded(emb2);
      Storage.prototype.setItem = realSet;
      var after = await p15FontKeys();
      var leaked = after.length - before;
      if (leaked > 0) throw new Error('(b) the index write was refused and ' + leaked + ' font file(s) stayed in storage with no index entry (they are orphans)');
      if (!toasts.some(function (m) { return /storage is full|could not be saved|not saved/i.test(m); })) throw new Error('(b) the index write was refused and the person was told nothing (toasts: ' + JSON.stringify(toasts) + ')');
    } finally {
      Storage.prototype.setItem = realSet; FM.toast = realToast;
      var now = await p15FontKeys();
      for (var key of now) { if (keys0.indexOf(key) < 0) await p15DelKey(key); }
      if (idx0 == null) localStorage.removeItem('fm.fonts'); else localStorage.setItem('fm.fonts', idx0);
    }
  });

  /* P15 #1043: picking three photos at once is ONE action. One Undo takes all three away and one Redo brings them back; a single photo is still one step. */
  test('P15 #1043 picking three files at once is one undo step, and a single file is still one', { item: '1043', budgetMs: 60000 }, async function () {
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    var png = function (c, n) { return new Promise(function (res) { var cv = offscreen(24, 16), g = cv.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 24, 16); cv.toBlob(function (b) { res(new File([b], 'p15-' + n + '-' + Date.now() + '.png', { type: 'image/png' })); }); }); };
    try {
      FM.scene.layers.length = 0;
      var base = FM.makeLayer('shape', { shape: 'rect', x: 40, y: 40, shapeW: 30, shapeH: 30, fill: '#cc3300', name: 'P15 base' }); base.start = 0; base.duration = 3;
      FM.scene.layers.push(base); if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
      FM.refreshAll(); FM.history.commit();
      var s0 = FM.history._steps(), n0 = FM.scene.layers.length;
      await FM._handleFiles([await png('#ff0000', 1)]);
      var s1 = FM.history._steps();
      if (FM.scene.layers.length !== n0 + 1) throw new Error('setup: one file added ' + (FM.scene.layers.length - n0) + ' layers');
      if (s1.len - s0.len !== 1) throw new Error('CONTROL: one picked file made ' + (s1.len - s0.len) + ' history steps, not 1');
      FM.history.undo(); await p15Sleep(50);
      var s2 = FM.history._steps();
      await FM._handleFiles([await png('#00ff00', 2), await png('#0000ff', 3), await png('#ffff00', 4)]);
      var s3 = FM.history._steps(), added = FM.scene.layers.length - n0;
      if (added !== 3) throw new Error('setup: three files added ' + added + ' layers');
      if (s3.index - s2.index !== 1) throw new Error('three files picked together made ' + (s3.index - s2.index) + ' undo steps (history ' + s2.index + ' → ' + s3.index + '), not 1');
      FM.history.undo(); await p15Sleep(50);
      if (FM.scene.layers.length !== n0) throw new Error('one Undo after a three-file pick left ' + (FM.scene.layers.length - n0) + ' of the three layers');
      FM.history.redo(); await p15Sleep(50);
      if (FM.scene.layers.length !== n0 + 3) throw new Error('one Redo brought back ' + (FM.scene.layers.length - n0) + ' of the three layers');
    } finally { FM.scene.layers = layers0; FM.scene.selectedId = sel0; FM.scene.selectedIds = sel0 ? [sel0] : []; try { FM.refreshAll(); } catch (e) {} }
  });

  /* P15 #1044: a project or template named in any script keeps its name in the downloaded file, minus only what a file system cannot hold. */
  test('P15 #1044 project and template download names keep Cyrillic, CJK, Arabic, accents and emoji', { item: '1044', budgetMs: 60000 }, async function () {
    var dl = hunt2dCatchDownloads(), name0 = FM.scene.project.name, toast0 = FM.toast;
    var cases = [['Привет', 'Привет'], ['東京の夜', '東京の夜'], ['مشروع', 'مشروع'], ['Café Noir', 'Café Noir'], ['🎬 Reel', '🎬 Reel'], ['a/b:c*?', 'a b c'], ['...', 'project'], ['ab\ud83c', 'ab'], ['\ud83cab', 'ab'], ['\ud83c\udfac'.repeat(90), '\ud83c\udfac'.repeat(80)]];   // a lone surrogate goes; 90 emoji are cut at 80 code points, never inside one
    var tids = [], away = FM.storage.openProjectId(), pid = null;
    try {
      FM.toast = function () {};
      // a template needs an open project with a layer (templates.save is refused without one, templates.exportFile returns false on no layers), so this makes its own
      pid = await FM.projects.create({ name: 'P15 names', width: 320, height: 240 });
      FM.scene.layers.push(FM.makeLayer('shape', { name: 'p15', shape: 'rect', x: 100, y: 100, shapeW: 50, shapeH: 50, fill: '#f00', start: 0, duration: 2 }));
      for (var c of cases) {
        FM.scene.project.name = c[0]; dl.files.length = 0;
        await FM.storage.exportFile();
        var f = dl.files[dl.files.length - 1];
        if (!f) throw new Error('"' + c[0] + '": no download was produced');
        if (f.name !== c[1] + '.fmotion.json') throw new Error('project named "' + c[0] + '" downloads as "' + f.name + '", expected "' + c[1] + '.fmotion.json"');
      }
      if (FM.templates && FM.templates.save && FM.templates.exportFile) {
        for (var t of cases.slice(0, 5)) {
          FM.scene.project.name = t[0]; FM.storage.markDirty(); await FM.storage.save();
          if (!(await FM.templates.save(t[0], pid))) throw new Error('setup: template "' + t[0] + '" was not saved');
          var tid = FM.templates.list()[0].id; tids.push(tid); dl.files.length = 0;
          await FM.templates.exportFile(tid);
          var tf = dl.files[dl.files.length - 1];
          if (!tf || tf.name !== t[1] + '.fmotion.json') throw new Error('template named "' + t[0] + '" downloads as "' + (tf && tf.name) + '", expected "' + t[1] + '.fmotion.json"');
        }
      }
    } finally { dl.stop(); FM.toast = toast0; FM.scene.project.name = name0; for (var id of tids) { try { await FM.templates.remove(id); } catch (e) {} } try { if (away) await FM.projects.open(away); } catch (e) {} try { if (pid) await FM.projects.remove(pid); } catch (e) {} }
  });

  /* P15 #1045: when the phone's storage refuses the write, a preset is NOT reported as saved and the list does not claim it. */
  test('P15 #1045 saving a preset into full storage says so, does not say saved, and does not list it', { item: '1045', budgetMs: 40000 }, async function () {
    var realSet = Storage.prototype.setItem, realToast = FM.toast, realPrompt = window.prompt, toasts = [];
    var fxKey = 'fm.fxpresets', lpKey = 'fm.layerpresets', fx0 = localStorage.getItem(fxKey), lp0 = localStorage.getItem(lpKey);
    var layer = FM.makeLayer('shape', { shape: 'rect', x: 40, y: 40, shapeW: 30, shapeH: 30, fill: '#cc3300', name: 'P15 preset src' });
    layer.effects = [FM.fxRegistry.makeInstance('sepia')];
    try {
      FM.toast = function (m) { toasts.push(String(m)); };
      window.prompt = function () { return 'P15 full look'; };
      /* CONTROL: with room, both save, both say saved */
      var fxN = FM.fxPresets.saved().length, lpN = FM.layerPresets.list().length;
      FM.savePresetPrompt(layer); FM.fxPresets.save('P15 full look', layer.effects);
      if (FM.layerPresets.list().length !== lpN + 1 || FM.fxPresets.saved().length !== fxN + 1) throw new Error('CONTROL: with room to write, the presets did not both save');
      if (!toasts.some(function (m) { return /Preset saved/.test(m); })) throw new Error('CONTROL: a layer preset saved with room said nothing');
      FM.layerPresets.remove('P15 full look'); FM.fxPresets.remove('P15 full look');
      /* the phone fills */
      Storage.prototype.setItem = function (k, v) { if (k === fxKey || k === lpKey) throw new DOMException('refused by the P15 test', 'QuotaExceededError'); return realSet.call(this, k, v); };
      toasts.length = 0;
      var lpBefore = JSON.stringify(FM.layerPresets.list()), fxBefore = JSON.stringify(FM.fxPresets.saved());
      FM.savePresetPrompt(layer);
      var r = FM.fxPresets.save('P15 full look', layer.effects);
      Storage.prototype.setItem = realSet;
      if (toasts.some(function (m) { return /Preset saved/.test(m); })) throw new Error('layer preset: storage refused the write and the last word was "' + toasts[toasts.length - 1] + '" (toasts: ' + JSON.stringify(toasts) + ')');
      if (!toasts.some(function (m) { return /storage full/i.test(m); })) throw new Error('layer preset: storage refused the write and nothing said so (toasts: ' + JSON.stringify(toasts) + ')');
      if (JSON.stringify(FM.layerPresets.list()) !== lpBefore) throw new Error('layer preset: the list changed although the write was refused');
      if (r !== false) throw new Error('effect preset: save() returned ' + JSON.stringify(r) + ' for a refused write, so its two callers (inspector.js 2350, 6380) toast "Saved preset" whatever happened; it must return false');
      if (JSON.stringify(FM.fxPresets.saved()) !== fxBefore) throw new Error('effect preset: the list changed although the write was refused');
    } finally {
      Storage.prototype.setItem = realSet; FM.toast = realToast; window.prompt = realPrompt;
      if (fx0 == null) localStorage.removeItem(fxKey); else localStorage.setItem(fxKey, fx0);
      if (lp0 == null) localStorage.removeItem(lpKey); else localStorage.setItem(lpKey, lp0);
    }
  });

