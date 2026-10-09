  test('AU19-1 after Undo or Redo of a replaced video the timeline bar shows that clip’s frames, not the other one’s', { item: 'AU19', budgetMs: 90000 }, async function () {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) throw new Error('setup: this browser cannot record the two test clips (no VP9 MediaRecorder)');
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const clip = async hue => {
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 120; const g = cv.getContext('2d');
      const rec = new MediaRecorder(cv.captureStream(15), { mimeType: 'video/webm;codecs=vp9' }), ch = []; rec.ondataavailable = e => ch.push(e.data);
      const done = new Promise(r => rec.onstop = r); rec.start(100);
      for (let i = 0; i < 14; i++) { g.fillStyle = 'hsl(' + hue + ',80%,' + (35 + i) + '%)'; g.fillRect(0, 0, 160, 120); await sleep(66); }
      rec.stop(); await done; return new File([new Blob(ch, { type: 'video/webm' })], 'v' + hue + '.webm', { type: 'video/webm' });
    };
    const P = FM.scene.project, keep = FM.scene.layers.slice(), keepSel = [FM.scene.selectedId, FM.scene.selectedIds];
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const red = await clip(0), blue = await clip(230);
    try {
      FM.scene.layers.length = 0; FM.history.reset(); FM.selectLayer(null);
      FM.addMediaLayer(await FM.loadVideoFile(red)); const L = FM.scene.layers[0], id = L.id;
      const hue = c => { const mx = Math.max(c[0], c[1], c[2]); return c[0] === mx ? 'red' : (c[2] === mx ? 'blue' : 'green'); };
      const dom = () => { const c = document.querySelector('.clip-filmstrip'); if (!c) return null; const d = c.getContext('2d').getImageData(4, 16, 1, 1).data; return d[3] ? hue([d[0], d[1], d[2]]) : null; };
      const model = () => { const m = FM.media.get(id), f = m && m.stripFrames && m.stripFrames[0]; if (!f) return null; const c = document.createElement('canvas'); c.width = f.width; c.height = f.height; c.getContext('2d').drawImage(f, 0, 0); const d = c.getContext('2d').getImageData(4, 4, 1, 1).data; return hue([d[0], d[1], d[2]]); };
      const settle = async want => { for (let i = 0; i < 80; i++) { await sleep(100); FM.timeline.rebuild(); if (model() === want && dom()) break; } return { model: model(), dom: dom() }; };
      let r = await settle('red'); if (r.dom !== 'red') throw new Error('CONTROL: the first clip’s bar is ' + r.dom + ', not red');
      // the real replace sequence (js/app.js FM.replaceMedia)
      const nrec = await FM.loadVideoFile(blue), outgoing = FM.media.get(id);
      await FM.storage.stashPrevMedia(id, outgoing, L.mediaRev || 0);
      FM.replaceMediaWith(id, nrec); L.mediaRev = (L.mediaRev || 0) + 1; FM.media.get(id).rev = L.mediaRev;
      FM.refreshAll(); FM.history.commit(); FM.storage.save();
      r = await settle('blue'); if (r.dom !== 'blue') throw new Error('CONTROL: after the replace the bar is ' + r.dom + ', not blue');
      FM.history.undo(); await sleep(200); await FM.restoreReplacedMedia();
      r = await settle('red'); if (r.model !== 'red') throw new Error('setup: Undo did not bring the red clip back (record is ' + r.model + ')');
      if (r.dom !== 'red') throw new Error('after Undo the clip is red but its timeline bar shows ' + r.dom + ' frames');
      FM.history.redo(); await sleep(200); await FM.restoreReplacedMedia();
      r = await settle('blue'); if (r.model !== 'blue') throw new Error('setup: Redo did not bring the blue clip back (record is ' + r.model + ')');
      if (r.dom !== 'blue') throw new Error('after Redo the clip is blue but its timeline bar shows ' + r.dom + ' frames');
    } finally {
      FM.scene.layers.length = 0; for (const l of keep) FM.scene.layers.push(l); FM.scene.selectedId = keepSel[0]; FM.scene.selectedIds = keepSel[1];
      FM.history.reset(); if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

