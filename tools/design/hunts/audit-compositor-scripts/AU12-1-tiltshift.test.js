  test('AU12-1 Tilt-Shift blurs a half-scale preview as much as the export, not twice as much', { item: 'AU12', budgetMs: 60000 }, async function () {
    const P = FM.scene.project, keep = FM.scene.layers.slice(), keepSel = [FM.scene.selectedId, FM.scene.selectedIds], d0 = P.duration, w0 = P.width, h0 = P.height, bg0 = P.background;
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const W = 320, H = 240;
    try {
      P.width = W; P.height = H; P.duration = 4; P.background = '#202830';
      const sc = document.createElement('canvas'); sc.width = W; sc.height = H; const g = sc.getContext('2d');
      const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#e8553a'); gr.addColorStop(0.5, '#3ab0e8'); gr.addColorStop(1, '#f2e04a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#111'; g.fillRect(40, 40, 90, 60); g.fillStyle = '#fff'; g.beginPath(); g.arc(220, 150, 50, 0, 7); g.fill();
      g.strokeStyle = '#000'; g.lineWidth = 4; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(10 + i * 38, 0); g.lineTo(30 + i * 38, H); g.stroke(); }
      const blob = await new Promise(r => sc.toBlob(r, 'image/png')); const rec = await FM.loadImageFile(new File([blob], 't.png', { type: 'image/png' }));
      const mk = (type, params) => {
        const L = FM.makeLayer('image', { name: 'src', x: W / 2, y: H / 2, start: 0, duration: 4 }); L.transform.scale = 1; FM.media.set(L.id, rec);
        const e = FM.fxRegistry.makeInstance(type); if (!e) throw new Error('no effect ' + type); Object.assign(e.params, params || {}); L.effects = [e];
        return { project: P, layers: [L], selectedId: null, selectedIds: [] };
      };
      const draw = (scene, rs, exporting) => {
        const c = document.createElement('canvas'); c.width = Math.round(W * rs); c.height = Math.round(H * rs); c.__fmRS = rs; c.__fmOX = 0; c.__fmOY = 0;
        FM._exporting = !!exporting; try { FM.renderScene(c.getContext('2d'), scene, 0.5); } finally { FM._exporting = false; }
        return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      };
      const ref = (scene, rs) => {
        const full = document.createElement('canvas'); full.width = W; full.height = H; full.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(draw(scene, 1, false)), W, H), 0, 0);
        const w = Math.round(W * rs), h = Math.round(H * rs), d = document.createElement('canvas'); d.width = w; d.height = h;
        const x = d.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(full, 0, 0, w, h); return x.getImageData(0, 0, w, h).data;
      };
      const cmp = (a, b) => { let s = 0, n = 0, hi = 0; for (let i = 0; i < a.length; i += 4) { let m = 0; for (let k = 0; k < 3; k++) { const d = Math.abs(a[i + k] - b[i + k]); s += d; if (d > m) m = d; } if (m > 8) hi++; n++; } return { mad: s / (n * 3), hi: hi * 100 / n }; };
      // CONTROL 1: at full scale the preview and the export draw the same bytes
      const ts = mk('tiltshift');
      const a = draw(ts, 1, false), b = draw(ts, 1, true); for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) throw new Error('CONTROL: tiltshift preview and export differ at full scale (byte ' + i + ')');
      // CONTROL 2: a pure per-pixel effect shows the floor this comparison itself has (measured 2.2 MAD / 13 % at half scale)
      const br = cmp(ref(mk('brightness'), 0.5), draw(mk('brightness'), 0.5, false));
      if (br.mad > 4.5 || br.hi > 26) throw new Error('CONTROL: brightness at half scale is ' + br.mad.toFixed(2) + ' MAD / ' + br.hi.toFixed(1) + ' % off its downscaled export, past the floor this test relies on');
      // the claim: measured 10.0 MAD / 58.7 % of pixels before, 0.98 / 0 % after (320x240, blur 1x)
      for (const [blur, rs] of [[1, 0.5], [1, 0.75], [2, 0.5]]) {
        const r = cmp(ref(mk('tiltshift', { blur }), rs), draw(mk('tiltshift', { blur }), rs, false));
        if (r.mad > 2.5 || r.hi > 5) throw new Error('Tilt-Shift blur ' + blur + 'x at render scale ' + rs + ' is ' + r.mad.toFixed(2) + ' MAD / ' + r.hi.toFixed(1) + ' % of pixels off the export (limit 2.5 / 5): the preview blurs more than the export');
      }
    } finally {
      FM.scene.layers.length = 0; for (const l of keep) FM.scene.layers.push(l); FM.scene.selectedId = keepSel[0]; FM.scene.selectedIds = keepSel[1];
      P.duration = d0; P.width = w0; P.height = h0; P.background = bg0; if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

