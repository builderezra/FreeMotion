  /* #1079: an import selects the new clip, and on a phone one selected clip is the solo view, which drew that one row and no add
     row, so straight after a first video there was no way to add a title or a song. The control is the same project with
     nothing selected; the claim is the row, its + uncovered by the docked options, no grip, and that its tap opens the menu. */
  test('1079 on a phone with one clip selected the add row and its + stay on screen and uncovered, with no grip, and a tap opens the add menu', { item: '1079', budgetMs: 40000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const saved = { layers: FM.scene.layers.slice(), sel: FM.scene.selectedId };
    const sheet = document.getElementById('add-sheet');
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    /* One check, two phones: 380 wide, and 320 x 640, where the row pushes the clip down past the old 66 % cap of the docked
       options (measured with that cap: clip row 413-455, options sheet from 422, so the selected clip sat under the sheet). */
    const check = async where => {
      FM.scene.layers.length = 0;
      const A = FM.makeLayer('shape', { name: 'S1079a', shape: 'rect', x: 540, y: 700, shapeW: 300, shapeH: 300, fill: '#3a7bd5', start: 0, duration: 4 });
      const B = FM.makeLayer('shape', { name: 'S1079b', shape: 'rect', x: 540, y: 1200, shapeW: 300, shapeH: 300, fill: '#d55a3a', start: 0, duration: 4 });
      FM.scene.layers.push(A, B);
      FM.selectLayer(null); FM.refreshAll(); await sleep(150);
      if (!document.querySelector('#tl-tracks .tl-addrow')) throw new Error(where + ': CONTROL: no add row with nothing selected, so its absence below means nothing');
      FM.selectLayer(A.id); FM.refreshAll(); await sleep(350);
      const rows = document.querySelectorAll('#tl-tracks .track-row');
      if (FM._soloLayerId() !== A.id || rows.length !== 1) throw new Error(where + ': setup: one selected clip on a phone is not the solo view (' + rows.length + ' rows, solo ' + FM._soloLayerId() + ')');
      const add = document.querySelector('#tl-tracks .tl-addrow');
      if (!add) throw new Error(where + ': with one clip selected on a phone the add row is not drawn, so straight after an import there is no way to add a title or a song');
      const plus = add.querySelector('.tl-addrow-plus');
      if (!plus) throw new Error(where + ': the solo view add row has no +');
      const pr = plus.getBoundingClientRect(), ar = add.getBoundingClientRect();
      if (!(pr.width > 0 && pr.height > 0 && ar.left >= -1 && ar.right <= window.innerWidth + 1 && ar.top >= 0 && ar.bottom <= window.innerHeight)) throw new Error(where + ': the solo view add row is at ' + Math.round(ar.left) + ',' + Math.round(ar.top) + ' ' + Math.round(ar.width) + 'x' + Math.round(ar.height) + ' in a ' + window.innerWidth + 'x' + window.innerHeight + ' window');
      const hit = document.elementFromPoint(pr.left + pr.width / 2, pr.top + pr.height / 2);
      if (!hit || !add.contains(hit)) throw new Error(where + ': the + of the solo view add row is covered by ' + (hit ? (hit.id || hit.className || hit.tagName) : 'nothing') + ', so a tap on it does not reach it');
      if (add.querySelector('.tl-addrow-grip')) throw new Error(where + ': the solo view add row carries a drag grip with no second row to drag it past (queue 522)');
      const cr = rows[0].getBoundingClientRect(), insp = document.getElementById('inspector-panel');
      const ir = insp ? insp.getBoundingClientRect() : null;
      if (ir && ir.height > 0 && ir.top < cr.bottom - 1) throw new Error(where + ': the options sheet starts at ' + Math.round(ir.top) + ', over the selected clip row (' + Math.round(cr.top) + '-' + Math.round(cr.bottom) + ')');
      return add;
    };
    try {
      if (hadHome) FM.home.close();
      await atPhoneWidth(async () => {
        const add = await check('at 380 px');
        add.click(); await sleep(500);
        if (!sheet || !sheet.classList.contains('open')) throw new Error('a tap on the add row in the solo view did not open the add menu');
        try { if (FM.mobile && FM.mobile.closeAdd) FM.mobile.closeAdd(); } catch (e) {}
        await sleep(350);
      }, 380);
      await atSize921(320, 640, async () => { await check('at 320 x 640'); });
    } finally {
      try { if (FM.mobile && FM.mobile.closeAdd) FM.mobile.closeAdd(); } catch (e) {}
      await sleep(350);
      FM.scene.layers.length = 0; saved.layers.forEach(l => FM.scene.layers.push(l)); FM.scene.selectedId = saved.sel;
      try { FM.selectLayer(saved.sel); FM.refreshAll(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
      await sleep(60);
    }
  });
