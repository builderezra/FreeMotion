  /* ═══ P16: #1046 (an AI batch that deletes a layer), #1047 (Mask picked first), #1048 (quadratic text wrap), #1049 (unreadable indexes and checkpoints), #1050 (recent colours) ═══
     Append before `async function run()` in tests/tests.js. `?only=P16` runs them. Uses scene(), huntBScene(), hb2Layer(), hb2OpenBrowser(), atPhoneWidth() and
     q915aPut / q915aRaw / q915aDel from tests.js itself. */
  function p16Sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function p16Scene(layers, over, fn) {   // a throwaway scene with a fresh history, put back (history too) afterwards
    var saved = FM.scene;
    try {
      FM.scene = scene(layers, over || { project: { width: 120, height: 90, fps: 30, duration: 4, background: '#000000' } });
      FM.selectLayer(null); FM.refreshAll(); FM.history.reset();
      return await fn();
    } finally { FM.scene = saved; try { FM.history.reset(); } catch (e) {} try { FM.refreshAll(); } catch (e) {} }
  }

  /* P16 #1046: Director build, re-roll and Refine all run FM.aiOps.applyOps and then refreshAll + commit ONCE. The deleteLayer op commits for itself (FM.deleteLayer), so a
     batch that deleted a layer made two steps, and one Undo left the scene half-undone. */
  test('P16 #1046 an AI batch that deletes a layer is ONE undo step, and one Undo restores the whole scene', { item: '1046', budgetMs: 40000 }, async function () {
    var mk = function (n, c) { return FM.makeLayer('shape', { name: n, shape: 'rect', x: 60, y: 45, shapeW: 40, shapeH: 30, fill: c }); };
    var A = mk('A', '#ff0000'), B = mk('B', '#00ff00'), C = mk('C', '#ffffff');
    await p16Scene([C, B, A], null, async function () {
      var state = function () { return FM.scene.layers.map(function (l) { return l.name + ':' + (l.fill || ''); }).join(','); };
      var before = state(), n0 = FM.history._steps().len;
      var log = FM.aiOps.applyOps([{ op: 'setProp', ref: A.id, path: 'fill', value: '#ff00ff' }, { op: 'deleteLayer', ref: B.id }, { op: 'setProp', ref: C.id, path: 'fill', value: '#00ffff' }], {});
      FM.refreshAll(); FM.history.commit();   // exactly what every ai.js caller does after applyOps
      if (log.appliedCount !== 3) throw new Error('CONTROL: the batch applied ' + log.appliedCount + ' of 3 ops (' + JSON.stringify(log.dropped) + ')');
      if (FM.scene.layers.some(function (l) { return l.name === 'B'; })) throw new Error('CONTROL: B was not deleted');
      var made = FM.history._steps().len - n0;
      if (made !== 1) throw new Error('one batch (edit A, delete B, edit C) made ' + made + ' undo steps, not 1 — the delete committed on its own');
      FM.history.undo();
      if (state() !== before) throw new Error('one Undo left “' + state() + '”, not the scene before the batch “' + before + '”');
      FM.history.redo();
      if (FM.scene.layers.some(function (l) { return l.name === 'B'; })) throw new Error('Redo did not bring the whole batch back');
    });
    /* control: a batch with no delete was always one step */
    await p16Scene([mk('C2', '#ffffff'), mk('A2', '#ff0000')], null, async function () {
      var n0 = FM.history._steps().len;
      FM.aiOps.applyOps([{ op: 'setProp', ref: FM.scene.layers[1].id, path: 'fill', value: '#123456' }], {});
      FM.refreshAll(); FM.history.commit();
      if (FM.history._steps().len - n0 !== 1) throw new Error('CONTROL: a plain edit batch is not one step');
    });
  });

  /* P16 #1047: in the multi-pick sheet, Mask picked first then another effect: addMaskFromBrowser commits even when quiet, then commitPicks commits again. */
  test('P16 #1047 Mask picked before another effect is added in ONE undo step (Blur then Mask always was)', { item: '1047', budgetMs: 90000 }, async function () {
    var saved = FM.scene;
    try {
      await atPhoneWidth(async function () {
        var run = async function (order) {
          var L = await huntBScene(function () { return [hb2Layer('P16 mask')]; });
          FM.history.reset();
          await hb2OpenBrowser(L[0], null);
          for (var i = 0; i < order.length; i++) {
            FM.fxBrowser._openCategory(order[i] === '_mask' ? 'matte' : 'blur'); await p16Sleep(450);
            var t = document.querySelector('#fx-browser .fxb-tile[data-fxid="' + order[i] + '"]');
            if (!t) throw new Error('setup: no ' + order[i] + ' tile');
            t.click(); await p16Sleep(150);
          }
          if (FM._fxPicks().join() !== order.join()) throw new Error('CONTROL: the picks are ' + FM._fxPicks().join() + ', not ' + order.join());
          var n0 = FM.history._steps().len;
          document.querySelector('#fx-browser .fxb-commit-go').click(); await p16Sleep(500);
          var layer = FM.scene.layers[0], made = FM.history._steps().len - n0;
          var got = { made: made, masks: (layer.masks || []).length, blur: (layer.effects || []).filter(function (e) { return e.type === 'blur'; }).length };
          if (got.masks !== 1 || got.blur !== 1) throw new Error('CONTROL: ' + order.join(' then ') + ' did not add a mask and a blur: ' + JSON.stringify(got));
          FM.history.undo(); await p16Sleep(120);
          var after = FM.scene.layers[0];
          got.left = (after.masks || []).length + (after.effects || []).length;
          return got;
        };
        var blurFirst = await run(['blur', '_mask']);
        if (blurFirst.made !== 1 || blurFirst.left !== 0) throw new Error('CONTROL: Blur then Mask: ' + JSON.stringify(blurFirst));
        var maskFirst = await run(['_mask', 'blur']);
        if (maskFirst.made !== 1) throw new Error('Mask then Blur, then Add, made ' + maskFirst.made + ' undo steps, not 1');
        if (maskFirst.left !== 0) throw new Error('one Undo left ' + maskFirst.left + ' of the two additions behind');
      }, 380);
    } finally { try { FM.fxBrowser.close(); } catch (e) {} FM.scene = saved; try { FM.history.reset(); FM.refreshAll(); } catch (e) {} }
  });

  /* P16 #1048: FM.textLines chops a word wider than the column by measuring the whole remainder once per line and then one character at a time. The new version must cut in the same
     places on every input the old one handled, and measure O(n log n) characters, not O(n²). The reference below is the old chop, verbatim. */
  test('P16 #1048 a long unbroken run wraps in the same lines as before and measures a bounded number of characters', { item: '1048', budgetMs: 60000 }, function () {
    var make = function (text, ww) { var l = FM.makeLayer('text', { name: 'wrap', text: text, x: 0, y: 0 }); l.wrapWidth = ww; return l; };
    var ctxFor = function (px) { var c = offscreen(10, 10).getContext('2d'); c.font = px + 'px sans-serif'; return c; };
    function ref(ctx, ww, src) {   // the pre-fix algorithm
      var out = [], paras = src.split('\n'), trim = function (s) { return s.replace(/\s+$/, ''); }, fits = function (s) { return ctx.measureText(s).width <= ww; };
      var chop = function (s) {
        while (trim(s).length > 1 && !fits(trim(s))) {
          var solid = trim(s), cut = 1;
          while (cut < solid.length && fits(solid.slice(0, cut + 1))) cut++;
          out.push(solid.slice(0, cut)); s = solid.slice(cut) + s.slice(solid.length);
        }
        return s;
      };
      paras.forEach(function (para) {
        if (para === '') { out.push(''); return; }
        var words = para.match(/\S+\s*/g) || [para], line = '';
        words.forEach(function (w) { if (line === '') { line = chop(w); return; } if (fits(trim(line + w))) { line += w; return; } out.push(trim(line)); line = chop(w); });
        out.push(trim(line));
      });
      return out;
    }
    var cjk = '日本語のテキストは単語の間に空白がありません。'.repeat(8), emoji = '😀🙂🙃😉'.repeat(30), accents = 'Ünïcödé àccénts wïth cömbïnïng ẽ̃ marks '.repeat(6);
    var inputs = ['x'.repeat(1000), 'abc def ' + 'W'.repeat(300) + ' ghi jkl', 'iiiiiiii' + 'MMMMMMMM'.repeat(60), cjk, 'English then ' + cjk + ' and more words after', emoji, accents, 'one\n\n' + 'y'.repeat(400) + '\nlast line here', 'a', '', 'WWWWWWWWWW'];
    var widths = [14, 60, 180, 420], fonts = [16, 32];
    var bad = [];
    inputs.forEach(function (text, ti) { widths.forEach(function (ww) { fonts.forEach(function (px) {
      var ctx = ctxFor(px), want = ref(ctx, ww, text), got = FM.textLines(ctx, make(text, ww), text);
      if (JSON.stringify(Array.prototype.slice.call(got)) !== JSON.stringify(want)) bad.push('input ' + ti + ', width ' + ww + ', ' + px + 'px: ' + got.length + ' lines vs ' + want.length + ' before');
    }); }); });
    if (bad.length) throw new Error(bad.length + ' of ' + (inputs.length * widths.length * fonts.length) + ' layouts differ from the pre-fix cut points: ' + bad.slice(0, 3).join('; '));
    /* the cost: characters passed to measureText for 30,000 characters with no spaces */
    var n = 30000, ctx2 = ctxFor(20), real = ctx2.measureText, chars = 0;
    ctx2.measureText = function (s) { chars += String(s).length; return real.call(ctx2, s); };
    var lines = FM.textLines(ctx2, make('x'.repeat(n), 300), 'x'.repeat(n));
    if (lines.length < 100) throw new Error('CONTROL: 30,000 characters at width 300 wrapped into only ' + lines.length + ' lines');
    if (chars > 40 * n) throw new Error('wrapping ' + n + ' characters measured ' + chars + ' characters (' + Math.round(chars / n) + ' per character; the limit is 40) — it is still quadratic');
  });

  /* P16 #1049: three kinds of read that fail open. Each test says what the damage is and what must survive. */
  async function p16Keys(keys, fn) {   // set up raw records, run, always clean up
    try { return await fn(); } finally { for (var i = 0; i < keys.length; i++) { try { await q915aDel(keys[i]); } catch (e) {} } }
  }
  test('P16 #1049 a template, element or font index that cannot be read keeps every pack at the boot sweep (a valid empty index still collects them)', { item: '1049', budgetMs: 60000 }, async function () {
    var idx = { t: localStorage.getItem('fm.templates'), e: localStorage.getItem('fm.elements'), f: localStorage.getItem('fm.fonts') };
    var keys = ['tpl:p16A', 'elem:p16A', 'font:p16A'];
    var restore = function () { [['fm.templates', idx.t], ['fm.elements', idx.e], ['fm.fonts', idx.f]].forEach(function (p) { try { if (p[1] == null) localStorage.removeItem(p[0]); else localStorage.setItem(p[0], p[1]); } catch (e) {} }); };
    try {
      await p16Keys(keys, async function () {
        for (var i = 0; i < keys.length; i++) await q915aPut(keys[i], { p16: 1 });
        localStorage.setItem('fm.templates', '[{"id":"tA"'); localStorage.setItem('fm.elements', '{"not":"a list"'); localStorage.setItem('fm.fonts', '[{"id":');
        await FM.projects.pruneOrphans();
        var raw = await q915aRaw(), lost = keys.filter(function (k) { return !raw[k]; });
        if (lost.length) throw new Error('with the index unreadable the sweep deleted ' + lost.join(', ') + ' — every saved template, element and font gone at once');
        /* CONTROL: a valid, empty index means the packs really are orphans, and the sweep takes them (so it ran at all) */
        localStorage.setItem('fm.templates', '[]'); localStorage.setItem('fm.elements', '[]'); localStorage.setItem('fm.fonts', '[]');
        await FM.projects.pruneOrphans();
        raw = await q915aRaw();
        var kept = keys.filter(function (k) { return raw[k]; });
        if (kept.length) throw new Error('CONTROL: with valid empty indexes the sweep did not collect ' + kept.join(', ') + ', so it may not be running');
      });
    } finally { restore(); }
  });
  test('P16 #1049 a save point whose read fails keeps the media only it points at (the boot sweep stands down)', { item: '1049', budgetMs: 60000 }, async function () {
    var ckpt = 'collab:ckpt:p16proj:1', blob = 'p16ckptblob', orphan = 'p16plainorphan', realGet = IDBObjectStore.prototype.get;
    await p16Keys([ckpt, blob, orphan], async function () {
      await q915aPut(ckpt, JSON.stringify({ layers: [{ id: blob }] })); await q915aPut(blob, { p16: 1 }); await q915aPut(orphan, { p16: 1 });
      /* CONTROL first: with the save point readable, the blob it names survives and the plain orphan goes */
      await FM.projects.pruneOrphans();
      var raw = await q915aRaw();
      if (!raw[blob]) throw new Error('CONTROL: a readable save point did not keep its blob');
      if (raw[orphan]) throw new Error('CONTROL: the sweep did not collect a plain orphan, so it may not be running');
      await q915aPut(orphan, { p16: 1 });
      IDBObjectStore.prototype.get = function (k) { if (typeof k === 'string' && k.indexOf('collab:ckpt:p16proj') === 0) throw new Error('p16: a failed read'); return realGet.apply(this, arguments); };
      try { await FM.projects.pruneOrphans(); } finally { IDBObjectStore.prototype.get = realGet; }
      raw = await q915aRaw();
      if (!raw[blob]) throw new Error('with the save point unreadable the sweep deleted the blob only it points at');
    });
  });
  test('P16 #1049 deleting a project keeps a blob that another document, unreadable, may still use; and an index the app is about to overwrite is copied first', { item: '1049', budgetMs: 60000 }, async function () {
    var keyA = 'fm.proj.p16A', keyB = 'fm.proj.p16B', blob = 'p16shared', saved = {};
    ['fm.projects', keyA, keyB, 'fm.templates', 'fm.templates.unreadable'].forEach(function (k) { saved[k] = localStorage.getItem(k); });
    var doc = function (id) { return JSON.stringify({ app: 'freemotion', project: { name: id, width: 120, height: 90, fps: 30, duration: 3 }, layers: [{ id: blob, type: 'video' }] }); };
    var idx0 = JSON.parse(localStorage.getItem('fm.projects') || '[]');
    try {
      await p16Keys([blob], async function () {
        var trial = async function (docB, label) {
          await q915aPut(blob, { p16: 1 });
          localStorage.setItem(keyA, doc('A')); if (docB == null) localStorage.removeItem(keyB); else localStorage.setItem(keyB, docB);
          localStorage.setItem('fm.projects', JSON.stringify(idx0.concat([{ id: 'p16A', name: 'p16A', modified: 1 }])));
          await FM.projects.remove('p16A');
          var raw = await q915aRaw(); return !!raw[blob];
        };
        if (await trial(null, 'no other document')) throw new Error('CONTROL: with no other document the project delete did not remove its blob');
        if (!(await trial(doc('B'), 'a readable other document'))) throw new Error('CONTROL: a blob another readable project uses was deleted');
        if (!(await trial('{"layers":[{"id":"p16shared"', 'a truncated other document'))) throw new Error('deleting project A deleted the blob a truncated project B may still use');
      });
      /* an unreadable index is copied before the next write replaces it */
      var bad = '[{"id":"tA","name":"x"';
      localStorage.removeItem('fm.templates.unreadable'); localStorage.setItem('fm.templates', bad);
      await FM.templates.remove('p16none');
      if (localStorage.getItem('fm.templates.unreadable') !== bad) throw new Error('the unreadable template index was overwritten with no copy kept (copy: ' + localStorage.getItem('fm.templates.unreadable') + ')');
    } finally { Object.keys(saved).forEach(function (k) { try { if (saved[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, saved[k]); } catch (e) {} }); }
  });

  /* P16 #1050: addRecentColor wrote [c] + this window's in-memory list and never re-read the stored one. */
  test('P16 #1050 a colour picked here keeps the recent colours another window stored, and a popover built afterwards shows them', { item: '1050', budgetMs: 30000 }, function () {
    var keep = localStorage.getItem('fm.recentColors'), mem = FM.recentColors;
    try {
      FM.recentColors = ['#aaaaaa'];   // what THIS window hydrated at its start
      localStorage.setItem('fm.recentColors', JSON.stringify(['#aaaaaa']));
      var cur = '#445566', f = FM._colorField(function () { return cur; }, function (v) { cur = v; });   // the popover is already open here…
      localStorage.setItem('fm.recentColors', JSON.stringify(['#112233']));   // …when the OTHER window stores its pick
      var hex = f.querySelector('.hex-input'); hex.value = '#445566'; hex.dispatchEvent(new Event('change'));
      var stored = JSON.parse(localStorage.getItem('fm.recentColors'));
      if (stored.join() !== '#445566,#112233') throw new Error('the stored list is ' + stored.join() + ', not #445566,#112233 — this window overwrote the other one’s pick with its own memory');
      /* a popover built after the other window picked shows that pick */
      localStorage.setItem('fm.recentColors', JSON.stringify(['#778899', '#445566', '#112233']));
      var f2 = FM._colorField(function () { return cur; }, function (v) { cur = v; });
      var chips = Array.prototype.map.call(f2.querySelectorAll('.swatch-chip'), function (c) { return c.title; });
      if (chips.indexOf('#778899') < 0) throw new Error('a colour popover built after the other window’s pick shows ' + chips.join() + ', without #778899');
      /* CONTROL: unreadable stored data falls back to this window's own list instead of throwing */
      localStorage.setItem('fm.recentColors', '{not json'); FM.recentColors = ['#abcdef'];
      var f3 = FM._colorField(function () { return cur; }, function (v) { cur = v; }); var h3 = f3.querySelector('.hex-input'); h3.value = '#010203'; h3.dispatchEvent(new Event('input')); h3.dispatchEvent(new Event('change'));
      if (JSON.parse(localStorage.getItem('fm.recentColors')).join() !== '#010203,#abcdef') throw new Error('CONTROL: damaged stored colours broke the pick: ' + localStorage.getItem('fm.recentColors'));
    } finally { try { if (keep == null) localStorage.removeItem('fm.recentColors'); else localStorage.setItem('fm.recentColors', keep); } catch (e) {} FM.recentColors = mem; }
  });
