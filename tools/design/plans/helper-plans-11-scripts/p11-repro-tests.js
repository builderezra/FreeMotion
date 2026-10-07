
  /* ── P11 reproductions (scratch, not for main): each FAILS on v17.25 with a message that measures the defect ── */
  test('P11 repro 1020 the owner queue is bounded while the owner is exporting', { item: 'p11', budgetMs: 60000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await withCollab921([layer921('A')], async function (c) {
      const g = c.addGuest(); const wasExp = FM._exporting;
      try {
        FM._exporting = true;
        const t0 = Date.now(); let sent = 0;
        while (Date.now() - t0 < 4000) { g.doc.layers[0].name = 'n' + (sent++) + ' ' + 'x'.repeat(2000); g.G.tick('full'); g.loop.settle(); await sleep(25); }
        const q = c.S._queued();
        if (q > 100) throw new Error('after 4 s of an editor sending (' + sent + ' txs) the owner is holding ' + q + ' queued live applications (no cap; the host token bucket allows 30 tx/s, burst 60)');
      } finally { FM._exporting = wasExp; }
    });
  });
  test('P11 repro 1021 the four dialogs and the export status are announced', { item: 'p11' }, async function () {
    const ids = ['hm-dialog', 'export-dialog', 'canvas-dialog', 'export-overlay', 'export-ready'];
    const bad = ids.filter(function (id) { const e = document.getElementById(id); return !e || e.getAttribute('role') !== 'dialog' || e.getAttribute('aria-modal') !== 'true' || !(e.getAttribute('aria-labelledby') || e.getAttribute('aria-label')); });
    const st = document.getElementById('export-status'), bar = document.getElementById('export-bar'), note = document.getElementById('export-note');
    const live = [st && st.getAttribute('role'), bar && bar.parentNode.getAttribute('role'), note && note.getAttribute('role')];
    if (bad.length || !live[0] || !live[1]) throw new Error('without role=dialog + aria-modal + a name: [' + bad.join(', ') + ']; export-status role ' + live[0] + ', progress track role ' + live[1] + ', export-note role ' + live[2]);
  });
  test('P11 repro 1022 Export takes focus, holds it, and gives it back', { item: 'p11', budgetMs: 30000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); const wasOpen = FM.home.isOpen();
    try {
      if (wasOpen) FM.home.close();
      const opener = document.getElementById('btn-export') || document.getElementById('m-export');
      opener.focus(); opener.click(); await sleep(600);
      const dlg = document.getElementById('export-dialog');
      const inside = dlg.contains(document.activeElement);
      const behind = document.getElementById('stage');
      const inert = !!(behind && (behind.inert || behind.closest('[inert]')));
      document.getElementById('exp-cancel').click(); await sleep(300);
      const back = document.activeElement === opener;
      if (!inside || !inert || !back) throw new Error('focus inside the dialog on open: ' + inside + '; the editor behind is inert: ' + inert + '; focus back on #' + opener.id + ' after Cancel: ' + back + ' (activeElement is ' + (document.activeElement && (document.activeElement.id || document.activeElement.tagName)) + ')');
    } finally { try { document.getElementById('exp-cancel').click(); } catch (e) {} if (wasOpen) FM.home.open(); }
  });
  test('P11 repro 1023 a toast is announced to a screen reader', { item: 'p11' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    FM.toast('P11 toast probe', 500); await sleep(150);
    const sr = document.getElementById('toast-sr'), t = document.getElementById('toast');
    const live = [t && t.getAttribute('role'), t && t.getAttribute('aria-live')];
    FM.hideToast();
    if (!sr || sr.textContent.indexOf('P11 toast probe') < 0) throw new Error('#toast-sr is ' + (sr ? 'present but holds "' + sr.textContent + '"' : 'missing') + '; #toast role/aria-live are ' + JSON.stringify(live) + ' (the role is stripped at js/app.js:1397)');
  });
  test('P11 repro 1024 the keyframe diamonds have an accessible name', { item: 'p11', budgetMs: 30000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); const saved = FM.scene.layers.slice();
    try {
      const L = FM.makeLayer('shape', { shape: 'rect', x: 100, y: 100, shapeW: 80, shapeH: 80, fill: '#4af', start: 0, duration: 3 });
      L.effects = [FM.fxRegistry.makeInstance('glow'), FM.fxRegistry.makeInstance('blur')];
      FM.scene.layers.push(L); FM.selectLayer(L.id);
      const seen = {};
      for (const cat of ['transform', 'effects', 'fx']) { try { FM.inspector.openCategory(cat); } catch (e) {} await sleep(150);
        document.querySelectorAll('.fx-kf,.mt-kf,.kf-btn,.fill-kf,.mt-vbox-kf').forEach(function (b, i) { seen[cat + i + b.className] = b; }); }
      const all = Object.keys(seen).map(k => seen[k]);
      const bare = all.filter(b => !b.getAttribute('aria-label') && /^[◆◇]?$/.test(b.textContent.trim()));
      const bareGlyph = all.filter(b => !b.getAttribute('aria-label') && /[◆◇]/.test(b.textContent));
      if (!all.length) throw new Error('CONTROL: no keyframe buttons found');
      if (bareGlyph.length) throw new Error(bareGlyph.length + ' of ' + all.length + ' keyframe buttons are named only by their glyph (' + bareGlyph.map(b => b.className.split(' ')[0] + ' title="' + (b.title || '') + '"').slice(0, 4).join('; ') + ')');
    } finally { FM.scene.layers.length = 0; saved.forEach(l => FM.scene.layers.push(l)); FM.selectLayer(null); }
  });
