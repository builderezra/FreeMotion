  /* ═══ P13: reproductions for #1030, #1031, #1032 (red on main) and coverage for #1033, #1034 (green on main, each mutation-checked) ═══
     Append before `async function run()` in tests/tests.js. `?only=P13` runs them. */

  /* P13 #1030: a guest ages a comment against the HOST's clock. Fake clocks, the same harness as the S6 liveness test: the host's clock is
     3 hours ahead of the guest's. Before the first pong the guest has no estimate (CONTROL: it reads its own clock); after one ping and
     pong it must read the host's. Then the label: a comment the host stamped 5 minutes ago reads "5 min ago" on the guest, where the
     raw guest clock says "just now" (guest behind) or "3 h ago" (guest ahead). */
  test('P13 #1030 a guest learns the host clock from the pongs, and a comment the host stamped 5 minutes ago reads 5 min ago on it', { item: '1030', budgetMs: 20000 }, async function () {
    const C = need921S6('the host clock estimate');
    const inv = C.bridge.invariants();
    const SKEWS = [-3 * 3600000, 3 * 3600000];
    for (const skew of SKEWS) {
      let th = 100000000;   // far from zero: a guest clock 3 h behind must still read positive (lastPing starts at 0)
      const hostNowFn = function () { return th; };
      const guestNowFn = function () { return th + skew; };
      const doc = { project: { width: 320, height: 240, fps: 30, duration: 3, background: '#000000' }, layers: [] };
      const H = C.Host({ base: jclone921(doc), invariants: inv, now: hostNowFn });
      const HS = C.Session({ adapter: plainAdapter921(jclone921(doc), inv), role: 'owner', mid: 'o', host: H, now: hostNowFn });
      const loop = C.link.LoopLink({ aTag: 'h', bTag: 'g', mode: 'manual' });
      const mid = HS.addPeer(loop.a, { role: 'editor', name: 'G', color: '#ff9f43' });
      const G = C.Session({ adapter: plainAdapter921(jclone921(doc), inv), role: 'editor', mid: mid, base: jclone921(doc), epoch: H.epoch, now: guestNowFn });
      G.setLink(loop.b); loop.settle();   // hello and welcome first: a guest that is not online sends no ping
      if (typeof G.hostNow !== 'function') throw new Error('the guest has no estimate of the host clock (#1030): every pong carries hc and nothing reads it');
      if (Math.abs(G.hostNow() - guestNowFn()) > 5) throw new Error('CONTROL: before any pong the guest should read its own clock, it reads ' + (G.hostNow() - guestNowFn()) + ' ms off it');
      G.setLiveness(true);
      th += 2100; G.tick('hot'); loop.settle();
      if (Math.abs(G.hostNow() - hostNowFn()) > 50) throw new Error('with the guest clock ' + (skew / 3600000) + ' h off, after a ping and its pong the guest reads the host clock ' + (G.hostNow() - hostNowFn()) + ' ms away');
      const at = hostNowFn() - 5 * 60000;   // the host stamped it five minutes ago
      const CM = FM.collab && FM.collab.comments;
      if (!CM || typeof CM._ago !== 'function') throw new Error('the comments seam CM._ago is missing');
      const raw = CM._ago(at, guestNowFn());
      if (raw === '5 min ago') throw new Error('CONTROL: with the guest clock ' + (skew / 3600000) + ' h off the raw label is already right (' + raw + '), so nothing below measures the bug');
      const fixed = CM._ago(at, G.hostNow());
      if (fixed !== '5 min ago') throw new Error('on a guest ' + (skew / 3600000) + ' h off the host, a comment stamped 5 minutes ago reads "' + fixed + '" (the raw clock says "' + raw + '")');
    }
  });

  /* P13 #1031: a GIF is offered to the share sheet through the ready card, like the MP4. Through the real export (exp-format = gif), the card
     must appear, and its Save must hand navigator.share a File of type image/gif, with no straight download. The frames zip goes the same way. */
  test('P13 #1031 a GIF export ends on the ready card, and Save offers the file to the share sheet as image/gif', { item: '1031', budgetMs: 45000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    if (typeof FM._runExport !== 'function' || typeof FM._setExportSoloId !== 'function') throw new Error('FM._runExport / FM._setExportSoloId are not reachable');
    const fmtEl = document.getElementById('exp-format'), rangeEl = document.getElementById('exp-range');
    if (!fmtEl) throw new Error('#exp-format is not in the DOM');
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, P = FM.scene.project;
    const keep = { w: P.width, h: P.height, d: P.duration, fps: P.fps }, fmt0 = fmtEl.value, range0 = rangeEl && rangeEl.value, solo0 = FM._exportSoloId();
    const canShare0 = Object.getOwnPropertyDescriptor(navigator, 'canShare'), share0 = Object.getOwnPropertyDescriptor(navigator, 'share');
    const click0 = HTMLAnchorElement.prototype.click;
    const shared = [], downloads = [];
    try {
      FM.scene.layers.length = 0;
      const A = FM.makeLayer('shape', { shape: 'rect', x: 40, y: 30, shapeW: 30, shapeH: 30, fill: '#cc3300' }); A.start = 0; A.duration = 1; FM.scene.layers.push(A);
      P.width = 80; P.height = 60; P.duration = 0.4; P.fps = 10;
      fmtEl.value = 'gif'; if (rangeEl) rangeEl.value = 'whole'; FM._setExportSoloId(null);
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: function () { return true; } });
      Object.defineProperty(navigator, 'share', { configurable: true, value: function (d) { shared.push(d && d.files && d.files[0]); return Promise.resolve(); } });
      HTMLAnchorElement.prototype.click = function () { if (this.download) downloads.push(this.download); };
      const visible = () => { const e = document.getElementById('export-ready'); return !!(e && !e.classList.contains('hidden')); };
      let settled = false;
      const running = FM._runExport().then(() => { settled = true; }, () => { settled = true; });
      const t0 = Date.now();
      while (!visible() && !settled && Date.now() - t0 < 25000) await sleep(100);
      if (!visible()) throw new Error('the GIF export ' + (settled ? 'finished' : 'is still running') + ' with no ready card: ' + downloads.length + ' straight download(s) (' + downloads.join(', ') + '), share called ' + shared.length + ' time(s)');
      if (downloads.length || shared.length) throw new Error('the card was up but the file had already gone (' + downloads.length + ' downloads, ' + shared.length + ' shares)');
      document.getElementById('xr-save').click();
      await running;
      if (shared.length !== 1 || !shared[0] || shared[0].type !== 'image/gif' || !/\.gif$/.test(shared[0].name)) throw new Error('Save did not offer one GIF to the share sheet: ' + JSON.stringify(shared.map(f => f && [f.name, f.type, f.size])));
      if (downloads.length) throw new Error('Save also downloaded: ' + downloads.join(', '));
      /* the frames zip, direct */
      let out = null;
      await FM.exporter.runFrames({ scale: 1, fps: 5, from: 0, to: 0.4, name: 'p13', onProgress: function () {}, onReady: function (o) { out = o; return Promise.resolve(); } });
      if (!out) throw new Error('runFrames ignored onReady and ' + (downloads.length ? 'downloaded straight away (' + downloads.join(', ') + ')' : 'did nothing'));
      shared.length = 0; await out.save();
      if (shared.length !== 1 || shared[0].type !== 'application/zip' || !/_frames\.zip$/.test(shared[0].name)) throw new Error('the frames zip was offered as ' + JSON.stringify(shared.map(f => f && [f.name, f.type])));
    } finally {
      HTMLAnchorElement.prototype.click = click0;
      if (canShare0) Object.defineProperty(navigator, 'canShare', canShare0); else delete navigator.canShare;
      if (share0) Object.defineProperty(navigator, 'share', share0); else delete navigator.share;
      try { const x = document.getElementById('export-ready'); if (x && !x.classList.contains('hidden')) document.getElementById('xr-discard').click(); } catch (e) {}
      fmtEl.value = fmt0; if (rangeEl && range0 != null) rangeEl.value = range0;
      try { FM._setExportSoloId(solo0); } catch (e) {}
      P.width = keep.w; P.height = keep.h; P.duration = keep.d; P.fps = keep.fps;
      FM.scene.layers = layers0; FM.scene.selectedId = sel0; FM.scene.selectedIds = sel0 ? [sel0] : [];
    }
  });

  /* P13 #1032: the Settings "Show" jump scrolls without animation when the person asked the OS for reduced motion. CONTROL: without it, it is smooth. */
  test('P13 #1032 the Settings reports jump does not animate under reduced motion, and still does without it', { item: '1032', budgetMs: 30000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    if (!FM.settings || !FM.settings.open || !FM.settings.close || !FM.home) throw new Error('settings / home missing');
    const wasOpen = !!(FM.home.isOpen && FM.home.isOpen());
    const realMM = window.matchMedia, realSIV = Element.prototype.scrollIntoView;
    const calls = [];
    try {
      Element.prototype.scrollIntoView = function (o) { calls.push(o && o.behavior); };
      for (const reduce of [true, false]) {
        window.matchMedia = function (q) { return /prefers-reduced-motion/.test(q) ? { matches: reduce, media: q, addEventListener: function () {}, removeEventListener: function () {} } : realMM.call(window, q); };
        if (FM.home.isOpen()) FM.home.close();
        await sleep(250);
        FM.settings.open(); await sleep(360);
        const btn = document.querySelector('.set-panel .set-jump button');
        if (!btn) throw new Error('setup: the jump row has no button');
        calls.length = 0; btn.click(); await sleep(150);
        if (!calls.length) throw new Error('setup: pressing the jump did not scroll anything into view');
        if (reduce && calls[0] === 'smooth') throw new Error('with prefers-reduced-motion on, the Settings jump still scrolls with behavior "smooth"');
        if (!reduce && calls[0] !== 'smooth') throw new Error('CONTROL: without reduced motion the jump scrolled with "' + calls[0] + '", not smooth');
        FM.settings.close(); await sleep(300);
      }
    } finally {
      window.matchMedia = realMM; Element.prototype.scrollIntoView = realSIV;
      try { FM.settings.close(); } catch (e) {}
      try { if (wasOpen && !FM.home.isOpen()) FM.home.open(); else if (!wasOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
      await sleep(200);
    }
  });

  /* P13 #1033: one unreadable file in a multi-file pick is named, and the files either side of it still import. Through the real picker
     (#file-input, three files in one go). Alert and the error reporter are caught, so nothing blocks the page. */
  test('P13 #1033 one unreadable file in a pick of three is named, and the other two still import', { item: '1033', budgetMs: 40000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const fi = document.getElementById('file-input');
    if (!fi) throw new Error('setup: there is no #file-input');
    const png = async function (name, color) {
      const c = document.createElement('canvas'); c.width = 40; c.height = 30; const g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, 40, 30);
      const b = await new Promise(r => c.toBlob(r, 'image/png')); return new File([b], name, { type: 'image/png' });
    };
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, report0 = FM.reportError, alert0 = window.alert;
    const reports = [], alerts = [];
    try {
      FM.reportError = function (where, err, human) { reports.push({ where: where, human: human || '' }); };
      window.alert = function (m) { alerts.push(m); };
      const first = await png('p13-first.png', '#cc3300'), last = await png('p13-last.png', '#0033cc');
      const broken = new File([new Uint8Array(256)], 'p13-broken.png', { type: 'image/png' });   // an image that says it is a PNG and is not
      const n0 = FM.scene.layers.length;
      const dt = new DataTransfer(); dt.items.add(first); dt.items.add(broken); dt.items.add(last); fi.files = dt.files;
      fi.dispatchEvent(new Event('change'));
      const t0 = Date.now();
      while (FM.scene.layers.length < n0 + 2 && Date.now() - t0 < 15000) await sleep(100);
      await sleep(300);
      const added = FM.scene.layers.length - n0;
      if (added !== 2) throw new Error('a pick of three with one unreadable file added ' + added + ' layer(s): the good file after the bad one ' + (added === 1 ? 'was dropped' : 'and its neighbour were not both imported'));
      if (reports.length !== 1) throw new Error('the unreadable file was reported ' + reports.length + ' time(s): ' + JSON.stringify(reports));
      if (reports[0].where.indexOf('p13-broken.png') < 0 || reports[0].human.indexOf('p13-broken.png') < 0) throw new Error('the report does not name the file that failed: ' + JSON.stringify(reports[0]));
      if (reports[0].where.indexOf('p13-first') >= 0 || reports[0].human.indexOf('p13-last') >= 0) throw new Error('the report names a good file: ' + JSON.stringify(reports[0]));
      if (alerts.length) throw new Error('an alert blocked the import: ' + alerts[0]);
    } finally {
      FM.reportError = report0; window.alert = alert0;
      FM.scene.layers = layers0; FM.scene.selectedId = sel0; FM.scene.selectedIds = sel0 ? [sel0] : [];
      fi.value = '';
    }
  });

  /* P13 #1034: a GIF over the memory budget is shrunk, still DRAWN at its full size, and its frames are freed when the clip is let go.
     A 2800 x 2800 GIF of six one-pixel frames needs 6 x 31 MB of decoded frames, 188 MB, over the 160 MB ceiling on any device, so the shrink must
     run. The draw is read off drawImage itself: the destination size the compositor asks for. */
  test('P13 #1034 a GIF over the memory budget is shrunk, drawn at its full size, and its frames are freed when the clip is replaced', { item: '1034', budgetMs: 60000 }, async function () {
    if (typeof h3aGifBytes !== 'function') throw new Error('setup: the GIF fixture builder (h3aGifBytes) is gone');
    const W = 2800, H = 2800, N = 6;
    const frames = []; for (let i = 0; i < N; i++) frames.push({ x: 0, y: 0, w: 1, h: 1, delay: 10, disposal: 2, transparent: -1, px: function () { return 1; } });
    const file = new File([h3aGifBytes(W, H, [[0, 0, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255]], frames)], 'p13-big.gif', { type: 'image/gif' });
    const layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, keepId = [];
    const realDraw = CanvasRenderingContext2D.prototype.drawImage;
    try {
      const anim = await FM._decodeGifAnimation(file);
      if (!anim || anim.frames.length !== N) throw new Error('setup: the six-frame GIF decoded to ' + (anim ? anim.frames.length : 'nothing'));
      if (!(anim.width < W && anim.height < H)) throw new Error('a ' + W + ' x ' + H + ' GIF of ' + N + ' frames (' + Math.round(W * H * 4 * N / 1048576) + ' MB decoded) kept its frames at ' + anim.width + ' x ' + anim.height + ': the memory budget never shrank it');
      if (anim.width < 100) throw new Error('the shrink went too far: ' + anim.width + ' x ' + anim.height);
      anim.frames.forEach(f => { try { f.close && f.close(); } catch (e) {} });
      const rec = await FM.loadImageFile(file);   // the importer's own loader (js/media.js), which decodes the frames
      if (!rec.anim) throw new Error('setup: the loader produced no decoded frames for the GIF');
      if (rec.width !== W || rec.height !== H) throw new Error('the loaded GIF is ' + rec.width + ' x ' + rec.height + ', not its own ' + W + ' x ' + H);
      const L = FM.makeLayer('image', { name: 'p13 big gif', x: FM.scene.project.width / 2, y: FM.scene.project.height / 2 });
      L.start = 0; L.duration = 2; L.transform.scale = 0.05;
      FM.scene.layers.push(L); FM.media.set(L.id, rec);
      const bitmaps = rec.anim.frames.slice();
      const dests = [];
      CanvasRenderingContext2D.prototype.drawImage = function (src) {
        if (bitmaps.indexOf(src) >= 0) { const a = arguments; dests.push(a.length >= 9 ? [a[7], a[8]] : a.length >= 5 ? [a[3], a[4]] : [src.width, src.height]); }
        return realDraw.apply(this, arguments);
      };
      const c = document.createElement('canvas'); c.width = 80; c.height = 60; const g = c.getContext('2d'); g.setTransform(0.25, 0, 0, 0.25, 0, 0);
      FM.renderScene(g, FM.scene, 0.05);
      CanvasRenderingContext2D.prototype.drawImage = realDraw;
      if (!dests.length) throw new Error('setup: rendering the layer never drew one of its decoded frames');
      if (Math.abs(dests[0][0] - W) > 2 || Math.abs(dests[0][1] - H) > 2) throw new Error('the shrunk frames are drawn ' + Math.round(dests[0][0]) + ' x ' + Math.round(dests[0][1]) + ' instead of the clip’s full ' + W + ' x ' + H);
      /* freed: replacing the clip's media releases the old record, which closes every decoded frame */
      const open0 = bitmaps.filter(b => b.width > 0).length;
      if (open0 !== N) throw new Error('CONTROL: ' + open0 + ' of ' + N + ' frames open before the release');
      FM.media.set(L.id, { kind: 'image', el: new Image(), url: null, file: null, width: 10, height: 10 });
      const still = bitmaps.filter(b => b.width > 0).length;
      if (still) throw new Error(still + ' of ' + N + ' decoded frames were still open after the clip was replaced');
      if (rec.anim) throw new Error('the released record still points at its frames');
    } finally {
      CanvasRenderingContext2D.prototype.drawImage = realDraw;
      FM.scene.layers.filter(l => layers0.indexOf(l) < 0).forEach(l => { try { FM.media.remove(l.id); } catch (e) {} });
      FM.scene.layers = layers0; FM.scene.selectedId = sel0; FM.scene.selectedIds = sel0 ? [sel0] : [];
    }
  });

