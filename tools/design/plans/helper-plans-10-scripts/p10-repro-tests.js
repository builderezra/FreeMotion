
  /* ── P10 reproductions (scratch, not for main): each FAILS on v17.25 with a message that measures the defect ── */
  test('P10 repro 1015 edits made offline or before the reply go out as CAS, not overwrite', { item: 'p10', budgetMs: 60000 }, async function () {
    await withCollab921([layer921('A')], async function (c) {
      const g = c.addGuest(); const sent = []; const orig = g.loop.b.send;
      g.loop.b.send = function (ch, msg) { sent.push(msg); return orig.call(g.loop.b, ch, msg); };
      try {
        g.G.setOnline(false);
        g.doc.layers[0].name = 'guest offline'; g.G.tick('full');
        FM.scene.layers[0].name = 'owner newer'; FM.history.commit();
        sent.length = 0;
        g.G.setOnline(true);
        g.doc.layers[0].name = 'guest again before the reply'; g.G.tick('full');
        const txs = sent.filter(function (m) { return m && m.t === 'tx'; }).map(function (m) { return 'cid' + m.cid + ' q:' + m.q; });
        const bad = sent.filter(function (m) { return m && m.t === 'tx' && m.q !== 1; });
        g.loop.settle(); g.loop.settle();
        const final = FM.scene.layers[0].name;
        if (bad.length || final !== 'owner newer') throw new Error('txs sent after reconnect: [' + txs.join(', ') + ']; the owner ended with "' + final + '" (expected "owner newer")');
      } finally { g.loop.b.send = orig; }
    });
  });
  test('P10 repro 1019 undo and redo count against the outbox cap', { item: 'p10', budgetMs: 120000 }, async function () {
    const many = []; for (let i = 0; i < 1200; i++) many.push(layer921('L' + i));
    await withCollab921(many, async function (c) {
      const g = c.addGuest(); g.G.setOnline(false);
      for (let i = 0; i < g.doc.layers.length; i++) g.doc.layers[i].name = 'renamed ' + i;
      g.G.tick('full');
      const after1 = g.G._outstanding().reduce(function (s, e) { return s + e.n; }, 0);
      for (let i = 0; i < 9; i++) { if (i % 2 === 0) g.G.undo(); else g.G.redo(); }
      const total = g.G._outstanding().reduce(function (s, e) { return s + e.n; }, 0);
      if (!g.G.outboxFull) throw new Error('outstanding ops ' + after1 + ' after the edit and ' + total + ' after 9 undo/redo steps, cap is 5000, and outboxFull is ' + g.G.outboxFull);
    });
  });
  test('P10 repro 1018 the persistent-storage answer is kept', { item: 'p10' }, async function () {
    if (!('storagePersisted' in FM)) throw new Error('FM.storagePersisted is ' + typeof FM.storagePersisted + ' after load: the persisted()/persist() answer (js/storage.js:330-332) is thrown away');
  });
  test('P10 repro 1017 Tab with a button focused is left to the browser', { item: 'p10', budgetMs: 30000 }, async function () {
    const saved = FM.scene.layers.slice(), wasOpen = FM.home.isOpen();
    try {
      if (wasOpen) FM.home.close();
      const a = FM.makeLayer('shape', { shape: 'rect', x: 50, y: 50, shapeW: 40, shapeH: 40, fill: '#f44', start: 0, duration: 3 });
      const b = FM.makeLayer('shape', { shape: 'rect', x: 100, y: 50, shapeW: 40, shapeH: 40, fill: '#4f4', start: 0, duration: 3 });
      FM.scene.layers.push(a, b); FM.selectLayer(a.id);
      const btn = document.getElementById('btn-export') || document.getElementById('m-export') || document.querySelector('button');
      btn.focus();
      const ev = new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true });
      btn.dispatchEvent(ev);
      const moved = FM.scene.selectedId !== a.id;
      if (ev.defaultPrevented || moved) throw new Error('Tab on #' + btn.id + ': defaultPrevented ' + ev.defaultPrevented + ', selection moved ' + moved);
    } finally { FM.scene.layers.length = 0; saved.forEach(function (l) { FM.scene.layers.push(l); }); FM.selectLayer(null); if (wasOpen) FM.home.open(); }
  });
  test('P10 repro 1016 the Volume value box can be reached and opened from a keyboard', { item: 'p10', budgetMs: 30000 }, async function () {
    const frame = () => new Promise(r => setTimeout(r, 90)); const layers0 = FM.scene.layers.slice();
    try {
      const L = FM.makeLayer('video', { name: 'V' }); L.start = 0; L.duration = 4; L.volume = 1;
      FM.scene.layers.push(L); FM.selectLayer(L.id); FM.inspector.openCategory('volume'); await frame();
      const val = document.querySelector('.vol-panel .mt-vbox-val');
      if (!val) throw new Error('no volume value box');
      val.focus();
      const reach = document.activeElement === val;
      val.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
      const opened = val.isContentEditable;
      const scr = [].slice.call(document.querySelectorAll('.vol-panel .fx-scrub-val')), unnamed = scr.filter(s => !s.getAttribute('aria-label')).length;
      if (!reach || !opened) throw new Error('focusable ' + reach + ' (tabIndex ' + val.tabIndex + ', role ' + val.getAttribute('role') + ', aria-label ' + val.getAttribute('aria-label') + '); Enter opened the editor: ' + opened + '; .fx-scrub-val without a name: ' + unnamed + ' of ' + scr.length);
    } finally { FM.scene.layers.length = 0; layers0.forEach(l => FM.scene.layers.push(l)); FM.selectLayer(null); }
  });
