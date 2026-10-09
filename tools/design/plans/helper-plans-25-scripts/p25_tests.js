  /* ═══ P25 #1101: the sync fingerprint must notice an appended segment option ═══ */
  test('P25 #1101 appending an option to a segment parameter changes the sync fingerprint, rewording a label does not', { item: '1101', budgetMs: 30000 }, function () {
    const C = FM.collab; if (!C || typeof C.schemaFingerprint !== 'function') throw new Error('FM.collab.schemaFingerprint is not reachable');
    let seg = null, owner = null;
    FM.fxRegistry.all().some(function (e) { return (e.params || []).some(function (p) { if (p.type === 'segment' && Array.isArray(p.options) && p.options.length >= 2) { seg = p; owner = e.type; return true; } return false; }); });
    if (!seg) throw new Error('setup: no segment parameter found in the registry');
    const base = C.schemaFingerprint(); if (typeof base !== 'number' && typeof base !== 'string') throw new Error('setup: no fingerprint');
    const saved = seg.options.slice();
    try {
      if (C.schemaFingerprint() !== base) throw new Error('CONTROL: the fingerprint is not stable between two reads');
      seg.options = saved.concat([[saved.length + 40, 'A brand new choice']]);
      const withNew = C.schemaFingerprint();
      if (withNew === base) throw new Error('an appended option on ' + owner + '.' + seg.key + ' did not change the fingerprint, so a build with it and a build without it would join one session and the older would strip the newer one’s choice');
      seg.options = saved.map(function (o) { return Array.isArray(o) ? [o[0], String(o[1]) + ' (reworded)'] : o; });
      if (C.schemaFingerprint() !== base) throw new Error('rewording the labels changed the fingerprint: labels are not schema');
    } finally { seg.options = saved; }
    if (C.schemaFingerprint() !== base) throw new Error('CONTROL: the fingerprint did not come back after the test restored the options');
  });

  /* ═══ P25 #1102: an embedded font's css is the app's own form, not a string from the file ═══ */
  test('P25 #1102 a font opened from a file is stored with the app’s own css, not the one in the file', async function () {
    if (!FM.fonts || typeof FM.fonts.applyEmbedded !== 'function') throw new Error('FM.fonts.applyEmbedded is not reachable');
    const realFF = window.FontFace, realAdd = document.fonts.add, key = 'fm.fonts';
    const before = FM.fonts.list().map(f => f.id);
    try {
      window.FontFace = function () { this.load = function () { return Promise.resolve(); }; };   // as the 915 test does: a stand-in, so no real font is needed
      document.fonts.add = function () {};
      await FM.fonts.applyEmbedded({
        a: { family: 'FMFp25plain', name: 'plain.ttf', dataURL: 'data:font/ttf;base64,AAAAAAAAAAA=' },
        b: { family: 'FMFp25evil', name: 'evil.ttf', css: 'x; } body { display:none } @import url(http://evil.example/a.css);', dataURL: 'data:font/ttf;base64,AAAAAAAAAAA=' },
        c: { family: 'FMFp25kept', name: 'kept.ttf', css: 'FMFp25kept, sans-serif', dataURL: 'data:font/ttf;base64,AAAAAAAAAAA=' },
      });
      const got = {}; FM.fonts.list().forEach(f => { got[f.family] = f.css; });
      if (got.FMFp25plain !== 'FMFp25plain, sans-serif') throw new Error('CONTROL: a font with no css was stored as "' + got.FMFp25plain + '"');
      if (got.FMFp25kept !== 'FMFp25kept, sans-serif') throw new Error('CONTROL: a font with the ordinary css was stored as "' + got.FMFp25kept + '"');
      if (got.FMFp25evil !== 'FMFp25evil, sans-serif') throw new Error('a font whose file carried extra css was stored with it: "' + got.FMFp25evil + '"');
    } finally {
      window.FontFace = realFF; if (realAdd) document.fonts.add = realAdd; else delete document.fonts.add;
      try { for (const f of FM.fonts.list().filter(f => before.indexOf(f.id) < 0)) await FM.fonts.remove(f.id); } catch (e) {}
    }
  });

