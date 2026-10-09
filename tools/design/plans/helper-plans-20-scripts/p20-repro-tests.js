  /* ════════ P20: repro tests for #1075, #1078, #1079. Append before `async function run()` in tests/tests.js; `?only=P20` runs them. ════════ */
  test('P20 #1075 a clip picked up by a touch hold LIFTS (class clip-grab) and is put down again on release and on abort', { item: '1075', budgetMs: 30000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const savedLayers = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, dur0 = FM.scene.project.duration;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    try {
      return await atPhoneWidth(async function () {
        FM.scene.layers.length = 0;
        for (let i = 0; i < 3; i++) { const L = FM.makeLayer('shape', { shape: 'rect', x: 200, y: 300, shapeW: 120, shapeH: 90, fill: '#c05030' }); L.start = i * 2; L.duration = 2; FM.scene.layers.push(L); }
        FM.scene.project.duration = 6; FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild(); FM.setTime(0);
        const tl = document.getElementById('timeline'); tl.scrollLeft = 0; await sleep(360);
        const ev = (el, t, x, y, b, id) => el.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: b }));
        const inner = () => document.getElementById('tl-inner');
        const lifted = () => document.querySelectorAll('#tl-tracks .clip.clip-grab').length;
        const clips = () => document.querySelectorAll('#tl-tracks .clip');
        const grab = async (id) => {
          const c = clips()[1]; if (!c) throw new Error('setup: no second clip');
          const r = c.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
          ev(c, 'pointerdown', x, y, 1, id); await sleep(560);
          return { x: x, y: y };
        };
        // CONTROL: before any touch nothing is lifted
        if (lifted()) throw new Error('CONTROL: a clip looks lifted with no finger down');
        const p1 = await grab(41);
        if (!FM.timeline._dragState || !FM.timeline._dragState().clipMove) { /* the seam may not expose it; the visible sign is the claim */ }
        if (lifted() !== 1) throw new Error('a touch hold picked the clip up (350 ms) and nothing on the clip body shows it: ' + lifted() + ' lifted clips (Safari has no vibrate)');
        ev(inner(), 'pointerup', p1.x, p1.y, 0, 41); await sleep(200);
        if (lifted()) throw new Error('the clip still looks lifted after the finger came up');
        FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild(); await sleep(300);   // the release above was a tap, which selects: back to the full list
        const p2 = await grab(42);
        if (lifted() !== 1) throw new Error('second grab: not lifted');
        FM.timeline._abortGestures(); await sleep(60);
        if (lifted()) throw new Error('the clip still looks lifted after the gesture was aborted');
        ev(inner(), 'pointerup', p2.x, p2.y, 0, 42); await sleep(100);
        // a clip that is ALREADY selected (phone solo view): hold and release it. No selection change means no rebuild to replace the element, so only the release itself can put it down.
        FM.selectLayer(FM.scene.layers[1].id); FM.refreshAll(); FM.timeline.rebuild(); await sleep(400);
        const solo = document.querySelector('#tl-tracks .clip');
        if (!solo) throw new Error('setup: no clip in the solo view');
        const rs = solo.getBoundingClientRect(), sx = rs.left + rs.width / 2, sy = rs.top + rs.height / 2;
        ev(solo, 'pointerdown', sx, sy, 1, 43); await sleep(560);
        if (lifted() !== 1) throw new Error('selected clip: not lifted after the hold');
        ev(inner(), 'pointerup', sx, sy, 0, 43); await sleep(250);
        if (lifted()) throw new Error('a selected clip stays lifted after the finger comes up (nothing rebuilds the row to put it down)');
      }, 380);
    } finally {
      try { FM.timeline._abortGestures(); } catch (e) {}
      FM.scene.layers.length = 0; savedLayers.forEach(l => FM.scene.layers.push(l)); FM.scene.project.duration = dur0;
      FM.selectLayer(sel0 || null); FM.refreshAll(); FM.timeline.rebuild();
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

  test('P20 #1078 Drop Shadow with Shadow only on a layer that fills the frame says why the picture is black (and says nothing at half size, or with Shadow only off)', { item: '1078', budgetMs: 40000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const saved = FM.scene, hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    try {
      const P = { width: 360, height: 640, fps: 30, duration: 3, background: '#ffffff' };
      const tagFor = async (w, h, only) => {
        const L = FM.makeLayer('image', { name: 'P20', x: 180, y: 320, start: 0, duration: 3 });   // a clip, as in the report: the frame-cover test is for video and image layers
        const cv = document.createElement('canvas'); cv.width = 360; cv.height = 640; cv.getContext('2d').fillStyle = '#c05030'; cv.getContext('2d').fillRect(0, 0, 360, 640);
        FM.media.set(L.id, { kind: 'image', el: cv, img: cv, width: 360, height: 640 }); L.transform.scale = w / 360;
        const fx = FM.fxRegistry.makeInstance('dropshadow'); fx.params.shadowonly = only; L.effects = [fx];
        FM.scene = { layers: [L], project: Object.assign({}, P), selectedId: null, selectedIds: [], version: 1 };
        FM.refreshAll(); FM.selectLayer(L.id); await sleep(200);
        FM.inspector.openCategory('effects'); await sleep(450);
        const row = document.querySelector('#inspector-panel .fx-row');
        if (!row) throw new Error('setup: no effect row in the Effects panel');
        const t = row.querySelector('.fx-dead-tag');
        return t ? t.textContent : '';
      };
      const full = await tagFor(360, 640, 1);
      const half = await tagFor(180, 320, 1);
      const off = await tagFor(360, 640, 0);
      if (half || off) throw new Error('CONTROL: a tag appeared where nothing is wrong (half size: "' + half + '", Shadow only off: "' + off + '")');
      if (!full) throw new Error('a full-frame layer with Drop Shadow on Shadow only goes solid black and the effect row says nothing (the report: "reads as broken")');
    } finally {
      FM.scene = saved; try { FM.selectLayer(null); FM.refreshAll(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

  test('P20 #1079 phone: with a clip selected the "Tap to add a layer" row is still there, and a tap on it opens the Add sheet', { item: '1079', budgetMs: 40000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const savedLayers = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, dur0 = FM.scene.project.duration;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const errs = [], onErr = e => errs.push(String(e && e.message || e));
    window.addEventListener('error', onErr);
    try {
      return await atPhoneWidth(async function () {
        FM.scene.layers.length = 0;
        for (let i = 0; i < 2; i++) { const L = FM.makeLayer('shape', { shape: 'rect', x: 200, y: 300, shapeW: 120, shapeH: 90, fill: '#c05030' }); L.start = i * 2; L.duration = 2; FM.scene.layers.push(L); }
        FM.scene.project.duration = 4; FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild(); await sleep(300);
        const visible = () => { const r = document.querySelector('#tl-tracks .tl-addrow'); if (!r) return false; const b = r.getBoundingClientRect(); return b.width > 100 && b.height > 20; };
        if (!visible()) throw new Error('CONTROL: with nothing selected the add row is not on screen');
        FM.selectLayer(FM.scene.layers[0].id); FM.refreshAll(); FM.timeline.rebuild(); await sleep(400);
        if (!FM._soloLayerId || !FM._soloLayerId()) throw new Error('CONTROL: the phone is not in the solo view with a clip selected');
        if (!visible()) throw new Error('a clip is selected (the solo view, what every import and every Add leaves behind) and the "Tap to add a layer" row is not drawn: a beginner cannot find how to add a title or a song');
        const row = document.querySelector('#tl-tracks .tl-addrow'), b = row.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
        const ev = (t, bb) => row.dispatchEvent(new PointerEvent(t, { pointerId: 51, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: bb }));
        document.body.classList.remove('add-open');
        ev('pointerdown', 1); await sleep(60); ev('pointerup', 0); await sleep(120);
        if (!document.body.classList.contains('add-open')) { const row2 = document.querySelector('#tl-tracks .tl-addrow'); if (row2) row2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y })); }   // a rebuild may have replaced the row: re-acquire it
        await sleep(500);
        if (!document.body.classList.contains('add-open')) throw new Error('a tap on the add row (clip selected) did not open the Add sheet');
        if (errs.length) throw new Error('script errors while using the add row in the solo view: ' + errs.join(' | '));
      }, 380);
    } finally {
      window.removeEventListener('error', onErr);
      try { FM.mobile && FM.mobile.closeAdd && FM.mobile.closeAdd(); } catch (e) {}
      document.body.classList.remove('add-open');
      FM.scene.layers.length = 0; savedLayers.forEach(l => FM.scene.layers.push(l)); FM.scene.project.duration = dur0;
      FM.selectLayer(sel0 || null); FM.refreshAll(); FM.timeline.rebuild();
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

