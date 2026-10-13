/* #966 B9 — Word Highlight (karaoke captions): the picture sheets for Ezra, and the static-text pins.
 *
 * His #545 rule: he picks the look before it ships, so these sheets are what he is shown. Run in the APP page (index.html,
 * not tests/run.html) on a browser slot, with window.__recv set to the local JPEG receiver's port NUMBER. Each sheet is
 * POSTed to http://127.0.0.1:<port>/<name>.jpg; the probe returns a JSON string { sheets, pins, note?, err? }.
 *
 * PINS — text WITHOUT a Word Highlight (the configurations of the suite test '966 B9 text WITHOUT a lit Word Highlight ...'),
 * rendered and FNV-hashed. Run the probe on THIS tree and on 8004fa16 in the same browser: every pin must be identical
 * (the backlog's risk, "static text must stay byte-identical", checked against the OLD renderer). On 8004fa16 there is no
 * Word Highlight, so the probe takes the pins and stops.
 *
 * SHEETS — a 1080 x 1920 project over his clouds photo (fx-art/clouds.jpg), one caption cue (0.2-3.8 s, three wrapped lines),
 * each frame rendered at PHONE width (380 px wide) and cropped to the caption band:
 *   wh-<style>-<unit>.jpg  style colour / boxbehind / underline / scaleup x unit word / letter / line: 3 moments down,
 *                          left column Return, right column Keep highlight, every other control at its default (12 sheets)
 *   wh-options.jpg         no highlight, then colour / padding / radius / grow variants at one moment
 *   wh-animated.jpg        Fade up by word with Box behind: the box rides each word in
 * Every sheet is under 2x as tall as it is wide (tall sheets fail to reach his phone).
 */
(async function () {
  const out = { sheets: [], pins: {} };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const post = async (name, canvas) => {
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.88));
    await fetch('http://127.0.0.1:' + window.__recv + '/' + name + '.jpg', { method: 'POST', body: blob });
    out.sheets.push(name + '.jpg');
  };
  const fnv = (d) => { let h = 0x811c9dc5; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); };
  let me = null;
  try {
    if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();

    // ---- PINS: text without a Word Highlight, exactly the suite's byte-identity configurations ----
    const P0 = { width: 360, height: 180, fps: 30, duration: 4, background: '#000000' };
    const T = (o) => { const L = FM.makeLayer('text', Object.assign({ text: 'one two six ten', fontSize: 32, color: '#ffffff', x: 180, y: 90, start: 0, duration: 4 }, o || {})); L.letterSpacing = 0; if (o && o.text === '') L.text = ''; return L; };
    const fx = (type, p) => { const e = FM.fxRegistry.makeInstance(type); Object.assign(e.params, p || {}); return e; };
    const cfg = {
      plain: () => T(),
      outlined: () => { const L = T(); L.stroke = { enabled: true, width: 3, color: '#ff3366' }; return L; },
      gradient: () => { const L = T(); L.fillMode = 'gradient'; L.fillGradient = { type: 'linear', c0: '#ff8800', c1: '#2244ff', angle: 90 }; return L; },
      curved: () => { const L = T(); L.textCurve = 50; return L; },
      wrapped: () => { const L = T({ text: 'one two six ten nine' }); L.wrapWidth = 120; return L; },
      right: () => { const L = T(); L.align = 'right'; return L; },
      typeon: () => { const L = T(); L.effects = [fx('textprogress', { progress: 0.6, unit: 1, cursor: 2, blink: 2, hidecaret: 0 })]; return L; },
      caption: () => { const L = T({ text: '' }); L.captions = [{ start: 0, end: 2, text: 'one two six ten' }, { start: 2, end: 4, text: 'nine' }]; return L; },
      popin: () => { const L = T(); L.textAnim = { preset: 'pop', unit: 'word', durIn: 0.8, durOut: 0, stagger: 0.06 }; return L; },
    };
    for (const name of Object.keys(cfg)) for (const t of [0.35, 1.2]) {
      const c = document.createElement('canvas'); c.width = 360; c.height = 180;
      const g = c.getContext('2d', { willReadFrequently: true });
      FM.renderScene(g, { project: P0, layers: [cfg[name]()], selectedId: null, selectedIds: [] }, t);
      out.pins[name + '@' + t] = fnv(g.getImageData(0, 0, 360, 180).data);
    }
    if (!FM.fxRegistry.get('wordhighlight')) { out.note = 'no Word Highlight in this tree: pins only'; return JSON.stringify(out); }

    // ---- the caption over his clouds ----
    me = await FM.projects.create({ name: 'wh-sheet', width: 1080, height: 1920 }); await sleep(300);
    const P = FM.scene.project; P.width = 1080; P.height = 1920; P.duration = 6; P.background = '#1a2230';
    FM.scene.layers.length = 0; if (FM.history && FM.history.reset) FM.history.reset();
    const file = await fetch('fx-art/clouds.jpg').then(r => r.blob()).then(b => new File([b], 'clouds.jpg', { type: 'image/jpeg' }));
    const photo = await FM.loadImageFile(file); FM.addMediaLayer(photo);
    const PH = FM.scene.layers[0]; PH.start = 0; PH.duration = 6;
    PH.transform.scale = Math.max(1080 / photo.width, 1920 / photo.height); PH.transform.x = 540; PH.transform.y = 960;
    const LINE = 'Welcome to this beautiful family home in Perth';
    const TX = FM.makeLayer('text', { text: 'x', fontSize: 84, color: '#ffffff', x: 540, y: 1380, start: 0, duration: 6 });
    TX.bold = true; TX.letterSpacing = 0; TX.text = '';
    TX.captions = [{ start: 0.2, end: 3.8, text: LINE }];
    TX.wrapWidth = Math.round(1080 * 0.86);   // the column FM.captions.giveWrap gives every caption track
    TX.shadow = { enabled: true, color: '#000000', alpha: 55, blur: 10, dx: 0, dy: 4 };
    const R = 380, S = R / 1080, FH = Math.round(1920 * S);
    const band = { y: Math.round((1380 - 270) * S), h: Math.round(540 * S) };   // the caption, with room for Scale up
    const frame = (wh, t, anim) => {
      TX.effects = wh ? [wh] : [];
      TX.textAnim = anim || { preset: 'none', unit: 'char', durIn: 0.6, durOut: 0, stagger: 0.04 };
      const c = document.createElement('canvas'); c.width = R; c.height = FH; c.__fmRS = S; c.__fmOX = 0; c.__fmOY = 0;
      FM.renderScene(c.getContext('2d'), { project: P, layers: [TX, PH], selectedId: null, selectedIds: [] }, t);
      return c;
    };
    const compose = (title, cells, cols) => {
      const CW = R, CH = band.h, PAD = 8, LAB = 22, HEAD = 44, rows = Math.ceil(cells.length / cols);
      const sh = document.createElement('canvas'); sh.width = cols * CW + (cols + 1) * PAD; sh.height = HEAD + rows * (CH + LAB + PAD) + PAD;
      const g = sh.getContext('2d'); g.fillStyle = '#141a24'; g.fillRect(0, 0, sh.width, sh.height);
      g.fillStyle = '#eef2f8'; g.font = 'bold 17px sans-serif'; g.fillText(title, 10, 28);
      cells.forEach((cell, i) => {
        const x = PAD + (i % cols) * (CW + PAD), y = HEAD + Math.floor(i / cols) * (CH + LAB + PAD);
        g.fillStyle = '#9fb0c8'; g.font = '13px sans-serif'; g.fillText(cell.label, x + 2, y + 15);
        g.drawImage(cell.c, 0, band.y, R, band.h, x, y + LAB, CW, CH);
      });
      return sh;
    };
    const wh = (p) => fx('wordhighlight', p);

    // ---- 12 sheets: style x unit, Return | Keep highlight, three moments ----
    const STY = [[0, 'Colour', 'colour'], [1, 'Box behind', 'boxbehind'], [2, 'Underline', 'underline'], [3, 'Scale up', 'scaleup']];
    const UNI = [[0, 'Word'], [1, 'Letter'], [2, 'Line']], TIMES = [0.9, 2.0, 3.2];
    for (const [st, sn, slug] of STY) for (const [un, unm] of UNI) {
      const cells = [];
      for (const t of TIMES) for (const past of [0, 1]) cells.push({ c: frame(wh({ style: st, unit: un, past: past }), t), label: (past ? 'Keep highlight' : 'Return') + ' · ' + t.toFixed(1) + ' s' });
      await post('wh-' + slug + '-' + unm.toLowerCase(), compose('Word Highlight: ' + sn + ', by ' + unm + '  (left Return, right Keep)', cells, 2));
      await sleep(0);
    }

    // ---- the options, at one moment ----
    const OPT = [
      ['No Word Highlight (as today)', null],
      ['Colour: default yellow', {}],
      ['Colour: green #3ddc84', { color: '#3ddc84' }],
      ['Colour: pink #ff4fa3', { color: '#ff4fa3' }],
      ['Box: default violet, pad 12, r 14', { style: 1 }],
      ['Box: red, pad 4, r 0', { style: 1, boxcolor: '#e63946', padding: 4, radius: 0 }],
      ['Box: blue pill, pad 20, r 40', { style: 1, boxcolor: '#00b4d8', padding: 20, radius: 40 }],
      ['Underline: default', { style: 2 }],
      ['Underline: green, pad 2, r 0', { style: 2, color: '#3ddc84', padding: 2, radius: 0 }],
      ['Scale up: default Grow 120%', { style: 3 }],
      ['Scale up: Grow 150%, pink', { style: 3, grow: 150, color: '#ff4fa3' }],
      ['Box + Keep highlight', { style: 1, past: 1 }],
    ];
    await post('wh-options', compose('Word Highlight: options at 2.0 s (by Word)', OPT.map(([lab, p]) => ({ c: frame(p ? wh(p) : null, 2.0), label: lab })), 2));

    // ---- riding an Animate preset: Fade up by word, Box behind ----
    const anim = { preset: 'fade-up', unit: 'word', durIn: 0.5, durOut: 0, stagger: 0.08 };
    await post('wh-animated', compose('Word Highlight: Box behind on Fade up (by word)', [0.3, 0.5, 0.7, 0.9, 1.4, 2.2].map(t => ({ c: frame(wh({ style: 1 }), t, anim), label: t.toFixed(1) + ' s' })), 2));
  } catch (e) { out.err = (e && e.message) + ' ' + String(e && e.stack || '').slice(0, 300); }
  try { if (me) await FM.projects.remove(me); } catch (e) {}
  return JSON.stringify(out);
})()
