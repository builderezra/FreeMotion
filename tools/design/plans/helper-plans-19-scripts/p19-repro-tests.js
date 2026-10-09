  /* ════════ P19: repro tests for #1062, #1063 (the rest of P19 are tooling plans). Append before `async function run()` in tests/tests.js; `?only=P19` runs them. ════════ */
  test('P19 #1062 Motion Blur (Footage), Pixel Motion: a paused preview frame equals the export frame, live playback keeps the cheaper smear; style Smear is the control', { item: '1062' }, async function () {
    const P = { width: 1080, height: 1080, background: '#202020', fps: 30, duration: 6 };
    const frame = (style, exporting, playing) => {
      const L = FM.makeLayer('text', { name: 'T', text: 'MOTION', start: 0, duration: 6, x: 540, y: 540, fontSize: 220, color: '#ffffff' });
      L.effects = [{ type: 'drift', enabled: true, params: { x: 600, y: 0 } }, { type: 'motionflow', enabled: true, params: { style: style, amount: 0.5 } }];
      const sc = { layers: [L], project: P }, c = document.createElement('canvas'); c.width = P.width; c.height = P.height;
      const x = c.getContext('2d', { willReadFrequently: true }), was = FM._exporting, wasP = FM.playing;
      FM._exporting = exporting; FM.playing = !!playing;
      try { for (const t of [3.0, 1.00, 1.04, 1.08]) { x.clearRect(0, 0, P.width, P.height); FM.renderScene(x, sc, t); } }
      finally { FM._exporting = was; FM.playing = wasP; }
      return x.getImageData(0, 0, P.width, P.height).data;
    };
    const diff = (a, b) => { let mx = 0; for (let i = 0; i < a.length; i += 4) for (let k = 0; k < 3; k++) { const d = Math.abs(a[i + k] - b[i + k]); if (d > mx) mx = d; } return mx; };
    const ctl = diff(frame(1, false), frame(1, true));   // style 1 (Smear) already builds the same layer in both modes
    if (ctl > 2) throw new Error('CONTROL: the Smear style differs between preview and export by ' + ctl);
    const d = diff(frame(0, false), frame(0, true));
    if (d > 2) throw new Error('Pixel Motion: the paused preview frame differs from the export frame by up to ' + d + ' levels (preview builds the smear at 480 px, export at 720)');
    const live = diff(frame(0, false, true), frame(0, true));   // live playback keeps the cheaper 480 px smear: pins BOTH branches (export at 480, or playback at 720, both go red)
    if (live < 6) throw new Error('while PLAYING the preview should still use the cheaper 480 px smear (it differs from export by ' + live + '), otherwise playback pays 2.25x for it, or export was lowered to 480');
    let sharp = 0; { const a = frame(0, true); for (let i = 0; i < a.length; i += 4) if (a[i] > 40) { sharp = 1; break; } }
    if (!sharp) throw new Error('CONTROL: the probe frame is empty, so a zero difference would mean nothing');
  });

  test('P19 #1063 rotating on the canvas: a drag across the point straight left of the pivot keeps turning (no 360 jump), and a drag that does not cross it is unchanged', { item: '1063' }, async function () {
    const box = document.getElementById('select-box');
    if (!box || !FM.canvasEdit) throw new Error('no selection box or FM.canvasEdit');
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (hadHome) FM.home.close();
    const savedLayers = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    try {
      const L = FM.makeLayer('shape', { shape: 'rect', x: 200, y: 200, shapeW: 80, shapeH: 80, fill: '#fff', start: 0, duration: 5 });
      FM.scene.layers.push(L);
      FM.timeline.rebuild(); FM.selectLayer(L.id); FM.refreshAll();
      if (FM.canvasEdit.update) FM.canvasEdit.update();
      await sleep(180);
      const h = box.querySelector('.sb-rot');
      if (!h) throw new Error('the selection box has no rotate handle to press');
      const br = box.getBoundingClientRect(), cx = br.left + br.width / 2, cy = br.top + br.height / 2, R = 90;
      const at = deg => ({ clientX: cx + R * Math.cos(deg * Math.PI / 180), clientY: cy + R * Math.sin(deg * Math.PI / 180) });
      const ev = (type, deg, extra) => Object.assign({ bubbles: true, cancelable: true, pointerId: 91, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1 }, at(deg), extra || {});
      const sweep = async (from, to, step) => {
        L.transform.rotation = 0; FM.requestRender(); await sleep(30);
        h.dispatchEvent(new PointerEvent('pointerdown', ev('pointerdown', from)));
        const seen = [FM.evalProp(L.transform.rotation, FM.time)];
        for (let a = from + step; step > 0 ? a <= to + 1e-9 : a >= to - 1e-9; a += step) {
          window.dispatchEvent(new PointerEvent('pointermove', ev('pointermove', a)));
          seen.push(FM.evalProp(L.transform.rotation, FM.time));
        }
        window.dispatchEvent(new PointerEvent('pointerup', ev('pointerup', to)));
        await sleep(30);
        return seen;
      };
      const maxStep = s => s.slice(1).reduce((m, v, i) => Math.max(m, Math.abs(v - s[i])), 0);
      const ctl = await sweep(10, 30, 2);                    // CONTROL: nowhere near the seam
      if (Math.abs(ctl[ctl.length - 1] - 20) > 1.5 || maxStep(ctl) > 4) throw new Error('CONTROL: 10° to 30° should turn the layer by +20, got ' + ctl.join(','));
      const cross = await sweep(170, 190, 2);                // straight left of the pivot
      if (maxStep(cross) > 4) throw new Error('crossing 180° made the rotation jump: ' + cross.join(','));
      if (Math.abs(cross[cross.length - 1] - 20) > 1.5) throw new Error('170° to 190° should turn the layer by +20, ended at ' + cross[cross.length - 1]);
      const back = await sweep(190, 170, -2);                // and back the other way
      if (maxStep(back) > 4 || Math.abs(back[back.length - 1] + 20) > 1.5) throw new Error('190° to 170° should be -20 with no jump: ' + back.join(','));
      const lap = await sweep(-90, 270, 10);                 // a whole lap keeps accumulating, it does not fold back
      if (Math.abs(lap[lap.length - 1] - 360) > 1.5) throw new Error('a full lap should end at +360, ended at ' + lap[lap.length - 1]);
    } finally {
      try { FM.canvasEdit._finishDrag && FM.canvasEdit._finishDrag(); } catch (e) {}
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 91, pointerType: 'mouse', button: 0, buttons: 0, clientX: 0, clientY: 0 }));
      FM.scene.layers.length = 0; savedLayers.forEach(l => FM.scene.layers.push(l));
      FM.selectLayer(sel0 || null); FM.timeline.rebuild(); FM.refreshAll(); await sleep(60);
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

  test('P19 #1074 phone: the FIRST import into an empty project leaves Export on the bar (nothing is selected); a later import still selects its clip; on a PC the first import still selects', { item: '1074' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const frame = window.frameElement;
    if (!frame) throw new Error('this test needs to own its viewport width and has no frameElement');
    const savedScene = FM.scene, hadW = frame.style.width, hadH = frame.style.height;
    const png = async n => { const c = document.createElement('canvas'); c.width = 64; c.height = 48; const x = c.getContext('2d'); x.fillStyle = n % 2 ? '#0a0' : '#a00'; x.fillRect(0, 0, 64, 48); return new File([await new Promise(r => c.toBlob(r, 'image/png'))], 'p19-' + n + '.png', { type: 'image/png' }); };
    const settle = async n => { for (let i = 0; i < 60 && FM.scene.layers.length < n; i++) await sleep(100); await sleep(150); };
    const exportShown = () => { const e = document.getElementById('m-export'); const r = e && e.getBoundingClientRect(); return !!(r && r.width > 0 && getComputedStyle(e).display !== 'none'); };
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (hadHome) FM.home.close();
    try {
      for (const phone of [true, false]) {
        FM.scene = scene([]); FM.selectLayer(null);
        frame.style.width = phone ? '380px' : hadW; frame.style.height = phone ? '780px' : hadH;
        await sleep(80);
        const isPhone = matchMedia('(max-width: 700px)').matches;
        if (phone && !isPhone) throw new Error('the frame did not become a phone (innerWidth ' + innerWidth + ')');
        if (!phone && isPhone) continue;   // the suite itself is running at phone width (the 380 pass): the PC half is the 1280 pass's
        await FM._handleFiles([await png(0)]); await settle(1);
        if (FM.scene.layers.length !== 1) throw new Error('setup: the first import added ' + FM.scene.layers.length + ' layers');
        if (phone) {
          if (FM.scene.selectedId) throw new Error('phone: the first import auto-selected its clip, which hides Export (body.m-editing) until the back arrow is found');
          if (!exportShown()) throw new Error('phone: Export is not on the bar after the first import');
          await FM._handleFiles([await png(1)]); await settle(2);
          if (!FM.scene.selectedId) throw new Error('CONTROL: a second import should still select its clip');
        } else if (!FM.scene.selectedId) throw new Error('CONTROL: on a PC the first import should still select its clip');
      }
    } finally {
      FM.scene = savedScene; frame.style.width = hadW; frame.style.height = hadH; await sleep(80);
      FM.selectLayer(null); FM.refreshAll && FM.refreshAll();
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

