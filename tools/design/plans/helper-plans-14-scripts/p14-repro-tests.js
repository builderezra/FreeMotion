  /* ═══ P14: #1035 (mic mute mid-take), #1036 (390 to 844 rotation), #1037 (EXIF), #1038 (fonts travel), #1040 (no transform) ═══
     Append before `async function run()` in tests/tests.js. `?only=P14` runs them. */
  var P14_FONT_B64 = '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';   // a 1.7 KB TrueType (DejaVu Sans Mono cut to A a B b H h I i O o and space, renamed FMP14Test) so the font tests use a face the browser really parses

  /* P14 #1035: the microphone is interrupted in the middle of a take. Two shapes: the track ENDS (headset pulled, permission revoked), and the track
     is MUTED (a phone call on iPhone: the track stays live and the recorder writes silence). The take must not sit on "Recording" with a counting
     clock; it must end at once with what was heard so far, and say why. */
  test('P14 #1035 a take stops, with what was recorded, when the microphone is taken away mid-take (track ended, or muted)', { item: '1035', budgetMs: 40000 }, async function () {
    await withFakeMic(async function () {
      for (var how of ['ended', 'mute']) {
        FM.voiceRec.open();
        await vrWait(function () { return vrStates().join() === 'live'; }, 8000, 'the mic (' + how + ')');
        vrEl('.vr-rec').click();
        await vrWait(function () { return FM.voiceRec._state() === 'recording'; }, 4000, 'recording to start (' + how + ')');
        await new Promise(function (r) { setTimeout(r, 900); });
        var tr = FM.voiceRec._tracks()[0];
        if (how === 'ended') { tr.stop(); tr.dispatchEvent(new Event('ended')); }
        else { tr.dispatchEvent(new Event('mute')); }
        var t0 = Date.now();
        while (FM.voiceRec._state() === 'recording' && Date.now() - t0 < 3000) await new Promise(function (r) { setTimeout(r, 50); });
        var st = FM.voiceRec._state();
        if (st === 'recording') throw new Error('the microphone ' + (how === 'ended' ? 'ended' : 'was muted') + ' mid-take and 3 s later the panel still says Recording (the clock keeps counting on nothing)');
        if (st !== 'review') throw new Error('after the mic was ' + how + ' the panel is "' + st + '", not review with the take so far');
        var msg = vrEl('.vr-msg');
        if (msg.classList.contains('hidden') || !msg.textContent.trim()) throw new Error('the take was cut short by the mic ' + how + ' and the panel said nothing');
        FM.voiceRec.close();
        await new Promise(function (r) { setTimeout(r, 200); });
      }
    });
  });

  /* P14 #1036: rotating a phone from 390 wide to 844 wide crosses into the Studio layout. Same project, same selection, same playhead,
     and the selected layer's panel is still about that layer. Then back to 390: still there. */
  test('P14 #1036 rotating 390 to 844 and back keeps the selection, the playhead and the layer panel', { item: '1036', budgetMs: 40000 }, async function () {
    if (!window.frameElement) throw new Error('this test needs run.html’s iframe (no window.frameElement)');
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, t0 = FM.time;
    try {
      FM.scene.layers.length = 0;
      var A = FM.makeLayer('shape', { shape: 'rect', x: 40, y: 40, shapeW: 30, shapeH: 30, fill: '#cc3300', name: 'P14 first' }); A.start = 0; A.duration = 3;
      var B = FM.makeLayer('shape', { shape: 'ellipse', x: 90, y: 60, shapeW: 40, shapeH: 40, fill: '#0033cc', name: 'P14 second' }); B.start = 0; B.duration = 3;
      FM.scene.layers.push(A, B);
      if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();
      FM.refreshAll();
      var shape = function () { return FM.scene.selectedId + '|' + (Math.round(FM.time * 100) / 100) + '|' + FM.scene.layers.length; };
      var panelNamesIt = function () { var p = document.getElementById('inspector'); return !!p && p.textContent.trim().length > 0 && p.textContent.indexOf('Select a layer to edit it') < 0; };
      await atPhoneWidth(async function () {
        FM.selectLayer(B.id); FM.setTime(1.2); await sleep(200);
        var before = shape();
        if (before.split('|')[0] !== B.id) throw new Error('setup: the layer did not stay selected at 390 (' + before + ')');
        await atWideWidth(async function () {
          if (matchMedia('(max-width: 700px)').matches) throw new Error('CONTROL: 844 wide is still the phone layout, so nothing crossed into Studio');
          await sleep(250);
          if (shape() !== before) throw new Error('rotating to 844 wide changed the project state from ' + before + ' to ' + shape());
          if (!panelNamesIt()) throw new Error('at 844 wide the layer panel went back to \u201cSelect a layer to edit it\u201d although the layer is still selected');
        }, 844);
        await sleep(250);
        if (shape() !== before) throw new Error('rotating back to 390 changed the project state from ' + before + ' to ' + shape());
      }, 390);
    } finally {
      FM.scene.layers = layers0; FM.scene.selectedId = sel0; FM.scene.selectedIds = sel0 ? [sel0] : [];
      try { FM.setTime(t0 || 0); } catch (e) {}
    }
  });

  /* P14 #1037: a JPEG whose EXIF says "rotate 90 degrees" shows upright. The file is a 40 x 20 picture, red left half and blue right half,
     with EXIF Orientation 6 (the way a phone held upright writes a landscape sensor image). Upright it is 20 x 40, red on TOP. */
  test('P14 #1037 a JPEG with an EXIF rotation tag is loaded, laid out and drawn upright', { item: '1037', budgetMs: 30000 }, async function () {
    var c = document.createElement('canvas'); c.width = 40; c.height = 20; var g = c.getContext('2d');
    g.fillStyle = '#ff0000'; g.fillRect(0, 0, 20, 20); g.fillStyle = '#0000ff'; g.fillRect(20, 0, 20, 20);
    var jb = new Uint8Array(await (await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.95); })).arrayBuffer());
    var exif = [0xFF, 0xE1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x4D, 0x4D, 0x00, 0x2A, 0, 0, 0, 8, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0, 0, 0, 1, 0x00, 0x06, 0, 0, 0, 0, 0, 0];
    var out = new Uint8Array(jb.length + exif.length); out.set(jb.subarray(0, 2), 0); out.set(exif, 2); out.set(jb.subarray(2), 2 + exif.length);
    var file = new File([out], 'p14-exif6.jpg', { type: 'image/jpeg' });
    var rec = await FM.loadImageFile(file);
    if (rec.width !== 20 || rec.height !== 40) throw new Error('an EXIF-rotated 40 x 20 JPEG loads as ' + rec.width + ' x ' + rec.height + ', not the upright 20 x 40');
    var layers0 = FM.scene.layers.slice(), sel0 = FM.scene.selectedId, P = FM.scene.project, keep = { w: P.width, h: P.height };
    try {
      FM.scene.layers.length = 0;
      P.width = 40; P.height = 80;
      var L = FM.makeLayer('image', { name: 'p14 exif', x: 20, y: 40 }); L.start = 0; L.duration = 2; L.transform.scale = 2;
      FM.scene.layers.push(L); FM.media.set(L.id, rec);
      var cv = document.createElement('canvas'); cv.width = 40; cv.height = 80; var cg = cv.getContext('2d', { willReadFrequently: true }); cv.__fmRS = 1; cv.__fmOX = 0; cv.__fmOY = 0;
      FM.renderScene(cg, FM.scene, 0.1);
      var top = cg.getImageData(20, 15, 1, 1).data, bot = cg.getImageData(20, 65, 1, 1).data;
      if (!(top[0] > 200 && top[2] < 60)) throw new Error('the top of the drawn picture is rgb(' + [top[0], top[1], top[2]] + '), not the red the EXIF-upright image has on top (it drew the sensor orientation)');
      if (!(bot[2] > 200 && bot[0] < 60)) throw new Error('the bottom of the drawn picture is rgb(' + [bot[0], bot[1], bot[2]] + '), not blue');
    } finally {
      try { FM.media.remove(FM.scene.layers.filter(function (l) { return layers0.indexOf(l) < 0; }).map(function (l) { return l.id; })[0]); } catch (e) {}
      FM.scene.layers = layers0; FM.scene.selectedId = sel0; FM.scene.selectedIds = sel0 ? [sel0] : [];
      P.width = keep.w; P.height = keep.h;
    }
  });

  /* P14 #1038: a custom font a text layer uses travels INSIDE the project file and the template file, and a device that does not have it
     registers it on open. A real font (1.7 KB), a real text layer, the real export and import; then the font is removed from this device
     and the file is opened. The existing test passes with an empty fonts list. */
  test('P14 #1038 a custom font used by a text layer travels inside the project file and the template file, and registers on import', { item: '1038', budgetMs: 60000 }, async function () {
    var bytes = Uint8Array.from(atob(P14_FONT_B64), function (ch) { return ch.charCodeAt(0); });
    var rec = await FM.fonts.import(new File([bytes], 'P14 Test Font.ttf', { type: 'font/ttf' }));
    if (!rec) throw new Error('setup: the 1.7 KB test font was not accepted by FM.fonts.import');
    var made = [], prior = FM.projects.currentId(), wasHome = FM.home && FM.home.isOpen && FM.home.isOpen(), dl = hunt2dCatchDownloads();
    try {
      var T = FM.makeLayer('text', { text: 'AaBb', x: 50, y: 50, name: 'p14 text' }); T.fontFamily = rec.css; T.start = 0; T.duration = 2;
      var layers0 = FM.scene.layers.slice(); FM.scene.layers.push(T);
      var obj = await FM.storage.serializeScene(FM.scene);
      FM.scene.layers = layers0;
      var fonts = obj.fonts || {}, keys = Object.keys(fonts);
      if (keys.length !== 1 || fonts[keys[0]].family !== rec.family || !/^data:/.test(fonts[keys[0]].dataURL || '')) throw new Error('the project file carries ' + keys.length + ' font(s) for a text layer that uses one: ' + JSON.stringify(keys));
      /* the template file */
      if (FM.templates && FM.templates.save && FM.templates.exportFile) {
        FM.scene.layers.push(T); FM.storage.markDirty(); await FM.storage.save();
        if (!(await FM.templates.save('P14 template'))) throw new Error('setup: the template was not saved');
        var tid = FM.templates.list()[0].id;
        FM.scene.layers = layers0;
        dl.files.length = 0;
        await FM.templates.exportFile(tid);
        var f = dl.files[dl.files.length - 1];
        if (!f || !f.blob) throw new Error('the template file was not produced');
        var tobj = JSON.parse(await f.blob.text());
        if (Object.keys(tobj.fonts || {}).length !== 1) throw new Error('the template file carries ' + Object.keys(tobj.fonts || {}).length + ' font(s) for a text layer that uses one');
        try { await FM.templates.remove(tid); } catch (e) {}
      }
      /* the other device: it does not have the font */
      await FM.fonts.remove(rec.id);
      if (FM.fonts.list().some(function (x) { return x.family === rec.family; })) throw new Error('setup: the font is still listed after removing it');
      if (!(await FM.storage.importObject(JSON.parse(JSON.stringify(obj, FM.jsonReplacer)), null, { quiet: true, confirmed: true }))) throw new Error('the project file was refused on import');
      made.push(FM.projects.currentId());
      if (!FM.fonts.list().some(function (x) { return x.family === rec.family; })) throw new Error('opening the file did not register the font it carried (' + rec.family + ')');
    } finally {
      dl.stop();
      try { var left = FM.fonts.list().filter(function (x) { return x.family === rec.family; }); for (var x of left) await FM.fonts.remove(x.id); } catch (e) {}
      await hfCleanup(made, prior, wasHome);
    }
  });

  /* P14 #1040: a layer whose transform is missing, null, an array, a string, or an empty object must come out of import drawable.
     The first four crash the timeline (Object.keys(layer.transform), scene.js:562) and, once autosaved, every launch. An EMPTY object is
     kept as is by the rebuild the fix on chatgpt/1040-missing-transform does, and then reads NaN positions: asserted here too. */
  test('P14 #1040 a layer with a missing, null, array, string or empty transform comes out of import drawable', { item: '1040', budgetMs: 60000 }, async function () {
    var prior = FM.projects.currentId(), wasHome = FM.home && FM.home.isOpen && FM.home.isOpen(), made = [], bad = [];
    try {
      for (var mode of ['missing', 'null', 'array', 'string', 'empty']) {
        /* a clean project each time: a failed import leaves its broken layer live (batch 1 item 1.2), and the next import would then fail for THAT reason */
        try { var pid = await FM.projects.create({ name: 'P14 base ' + mode, width: 180, height: 140 }); made.push(pid); await FM.projects.open(pid); } catch (e) { bad.push(mode + ': could not open a clean project: ' + e.message); continue; }
        var layer = FM.makeLayer('shape', { name: 'P14 ' + mode, x: 90, y: 70 });
        if (mode === 'missing') delete layer.transform; else if (mode === 'null') layer.transform = null; else if (mode === 'array') layer.transform = []; else if (mode === 'string') layer.transform = 'x'; else layer.transform = {};
        var file = { app: 'freemotion', project: { name: 'P14 transform ' + mode, width: 180, height: 140, duration: 2, fps: 30 }, layers: [layer], media: {} };
        var ok = false;
        try { ok = !!(await FM.storage.importObject(file, null, { quiet: true, confirmed: true })); } catch (e) { bad.push(mode + ': import threw ' + e.message); continue; }
        if (!ok) { bad.push(mode + ': refused'); continue; }
        made.push(FM.projects.currentId());
        var got = FM.scene.layers.find(function (l) { return l.name === 'P14 ' + mode; });
        var tr = got && got.transform;
        if (!tr || typeof tr !== 'object' || Array.isArray(tr)) { bad.push(mode + ': transform is ' + JSON.stringify(tr)); continue; }
        try { FM.animatedProps(got); FM.refreshAll(); } catch (e) { bad.push(mode + ': the timeline threw ' + e.message); continue; }
        var cv = document.createElement('canvas'); cv.width = 180; cv.height = 140; cv.__fmRS = 1; cv.__fmOX = 0; cv.__fmOY = 0;
        try { FM.renderScene(cv.getContext('2d'), FM.scene, 0.1); } catch (e) { bad.push(mode + ': render threw ' + e.message); continue; }
        var nums = ['scale', 'anchorX', 'anchorY'].filter(function (k) { return !Number.isFinite(FM.evalProp ? FM.evalProp(tr[k], 0) : tr[k]); });
        if (nums.length) bad.push(mode + ': ' + nums.join(', ') + ' are not numbers after import');
      }
      if (bad.length) throw new Error(bad.length + ' of 5 bad transforms did not come out drawable: ' + bad.join(' | '));
    } finally {
      await hfCleanup(made, prior, wasHome);
    }
  });

