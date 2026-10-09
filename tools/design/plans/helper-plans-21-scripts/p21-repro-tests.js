  /* ════════ P21: repro tests for #1080, #1081, #1083. Append before `async function run()` in tests/tests.js; `?only=P21` runs them. ════════ */
  test('P21 #1080 a song added with the playhead at the END of the project starts at 0, under the video; mid-video it still starts at the playhead; footage still butts onto the end', { item: '1080', budgetMs: 30000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const savedLayers = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, dur0 = FM.scene.project.duration, t0 = FM.time;
    try {
      const mkRec = (name, picture) => ({ kind: 'video', file: new File([new Uint8Array(8)], name, { type: picture ? 'video/mp4' : 'audio/mpeg' }), duration: 4, width: picture ? 320 : 0, height: picture ? 240 : 0, el: document.createElement('video') });
      const add = async (name, picture, at) => {
        FM.scene.layers.length = 0;
        const base = FM.makeLayer('shape', { shape: 'rect', x: 200, y: 300, shapeW: 100, shapeH: 100, fill: '#c05030', start: 0, duration: 10 }); FM.scene.layers.push(base);
        FM.scene.project.duration = 10; FM.setTime(at); await sleep(60);
        FM.addMediaLayer(mkRec(name, picture)); await sleep(60);
        const L = FM.scene.layers.find(l => l.name === name.replace(/\.[^.]+$/, ''));
        if (!L) throw new Error('setup: the added layer "' + name + '" is not in the scene');
        return L.start;
      };
      const mid = await add('p21mid.mp3', false, 4);
      if (Math.abs(mid - 4) > 1e-6) throw new Error('CONTROL: a song added mid-video should start at the playhead (4), started at ' + mid);
      const clip = await add('p21clip.mp4', true, 10);
      if (Math.abs(clip - 10) > 1e-6) throw new Error('CONTROL: footage added at the end should butt onto the end (10), started at ' + clip);
      const song = await add('p21end.mp3', false, 10);
      if (Math.abs(song - 0) > 1e-6) throw new Error('a song added with the playhead at the end of the video starts at ' + song + ' s, after the video, and lengthens the project by the song, instead of playing under it');
    } finally {
      FM.scene.layers.length = 0; savedLayers.forEach(l => FM.scene.layers.push(l)); FM.scene.project.duration = dur0;
      FM.setTime(t0); FM.selectLayer(sel0 || null); FM.refreshAll(); FM.timeline.rebuild();
    }
  });

  test('P21 #1081 Save after an export downloads the file on a PC (mouse) and still opens the share sheet on a phone (coarse pointer)', { item: '1081', budgetMs: 30000 }, async function () {
    if (!FM._deliver) throw new Error('FM._deliver seam missing: the delivery function is not reachable from the suite');
    const realMM = window.matchMedia, realClick = HTMLAnchorElement.prototype.click, had = { canShare: Object.getOwnPropertyDescriptor(navigator, 'canShare'), share: Object.getOwnPropertyDescriptor(navigator, 'share') };
    const run = async (coarse) => {
      let shared = 0, downloaded = 0;
      window.matchMedia = q => (/pointer:\s*coarse/.test(q) ? { matches: coarse, media: q, addEventListener() {}, removeEventListener() {} } : realMM.call(window, q));
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { shared++; } });
      HTMLAnchorElement.prototype.click = function () { if (this.download) { downloaded++; return; } return realClick.call(this); };
      const how = await FM._deliver(new Blob([new Uint8Array(16)], { type: 'video/mp4' }), 'p21.mp4');
      return { how: how, shared: shared, downloaded: downloaded };
    };
    try {
      const phone = await run(true);
      if (phone.shared !== 1 || phone.downloaded !== 0) throw new Error('CONTROL: on a phone (coarse pointer) Save should open the share sheet once and not download: ' + JSON.stringify(phone));
      const pc = await run(false);
      if (pc.shared !== 0 || pc.downloaded !== 1) throw new Error('on a PC (mouse) Save opened the OS share sheet instead of downloading the file (' + JSON.stringify(pc) + '): on Windows that sheet has no "save to disk"');
    } finally {
      window.matchMedia = realMM; HTMLAnchorElement.prototype.click = realClick;
      ['canShare', 'share'].forEach(k => { if (had[k]) Object.defineProperty(navigator, k, had[k]); else { try { delete navigator[k]; } catch (e) {} } });
    }
  });

  test('P21 #1083 PC: a hidden "‹ Projects" pill in the stage corner appears when the mouse is over the corner, clicks the real back button, and never exists on a phone', { item: '1083', budgetMs: 40000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()); if (hadHome) FM.home.close();
    const pill = () => document.getElementById('btn-back-corner');
    const wide = matchMedia('(min-width: 701px)').matches;
    const realExit = FM.exitGroup, ctx0 = FM.groupContext;
    try {
      if (!wide) {
        if (pill() && getComputedStyle(pill()).display !== 'none') throw new Error('on a phone the corner pill must not exist (it would be an invisible button under a finger)');
        if (!pill()) throw new Error('the corner pill is missing from the page (it should be in the DOM and hidden by CSS on a phone)');
        return;
      }
      const p = pill(); if (!p) throw new Error('there is no #btn-back-corner in the page');
      const cs = () => getComputedStyle(p);
      if (cs().display === 'none') throw new Error('the corner pill is display:none on a PC with a mouse');
      if (+cs().opacity !== 0 || cs().pointerEvents !== 'none') throw new Error('at rest the pill must be invisible and inert (opacity ' + cs().opacity + ', pointer-events ' + cs().pointerEvents + ')');
      const main = document.getElementById('main'), mr = main.getBoundingClientRect();
      const move = (dx, dy) => main.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: mr.left + dx, clientY: mr.top + dy }));
      move(600, 400); await sleep(250);
      if (+cs().opacity !== 0) throw new Error('CONTROL: the mouse is mid-stage and the pill is showing');
      move(40, 40); await sleep(350);
      if (+cs().opacity < 0.95 || cs().pointerEvents === 'none') throw new Error('the mouse is in the top-left corner and the pill did not appear (opacity ' + cs().opacity + ')');
      const r = p.getBoundingClientRect();
      [[r.left + 14, r.top + r.height / 2], [r.right - 14, r.top + r.height / 2], [r.left + r.width / 2, r.top + 5], [r.left + r.width / 2, r.bottom - 5], [r.left + r.width / 2, r.top + r.height / 2]]   /* inside the rounded ends: a corner point of the box is outside a 17px radius */.forEach(pt => {
        const hit = document.elementFromPoint(pt[0], pt[1]);
        if (!hit || !(hit === p || p.contains(hit))) throw new Error('something else sits over the pill at ' + pt.map(Math.round) + ': ' + (hit && (hit.id || hit.className || hit.tagName)));
      });
      // the mouse leaving the stage from the corner (straight off the window edge) must put it away too: no mousemove arrives outside #main
      main.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false })); await sleep(300);
      if (+cs().opacity !== 0) throw new Error('the mouse left the stage from the corner and the pill stayed showing');
      move(40, 40); await sleep(300);
      // clicking it is the real back button: out of a group first, then Home
      let exited = 0; FM.groupContext = 'au-p21-g'; FM.exitGroup = function () { exited++; };
      p.click(); await sleep(60);
      if (exited !== 1) throw new Error('inside a group the pill should leave the group (exitGroup called ' + exited + ' times)');
      FM.groupContext = null; FM.exitGroup = realExit;
      p.click(); await sleep(400);
      if (!(FM.home && FM.home.isOpen && FM.home.isOpen())) throw new Error('at the top level the pill should open Home (the same as the back button)');
      if (FM.home.close) FM.home.close();
      move(600, 400); await sleep(250);
      if (+cs().opacity !== 0) throw new Error('moving the mouse away left the pill showing');
    } finally {
      FM.exitGroup = realExit; FM.groupContext = ctx0;
      try { if (FM.home && FM.home.close && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });

