window.__probeMode='none'; window.__css="@media (min-width: 701px) {\n  .addmenu--fit .addmenu-pinned { container-type: inline-size; }\n  .addmenu--fit .addmenu-pinned .addmenu-card { padding: 5px 3px; gap: 4px; height: auto; }\n  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-ic,\n  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-ic svg { width: clamp(22px, 7.5cqi, 34px); height: clamp(22px, 7.5cqi, 34px); }\n  .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-lbl { font-size: clamp(10px, 3.2cqi, 12px); line-height: 1.2; white-space: nowrap; max-height: none; }\n}\n";
// #960: dry-run BOTH proposed tests (verbatim bodies from plan.md §6) outside the runner, in three simulated trees:
//   'none'       = HEAD
//   'renameIcon' = the JS half only (rename + Import audio gradient), no CSS
//   'full'       = Option A as planned: rename + gradient + BY_LABEL key dropped + the PC strip CSS
// atWideWidth is stubbed (shot.py already runs at a desktop width); sleep is the suite's.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const atWideWidth = async (fn) => { if (matchMedia('(max-width: 700px)').matches) throw new Error('harness not at desktop width'); return fn(); };
const MODE = window.__probeMode || 'none';
const CSS = window.__css || '';
if (MODE === 'full') { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
function importIcon(gid) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<defs><linearGradient id="' + gid + '" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">'
    + '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="1" stop-color="#ffffff" stop-opacity=".55"/></linearGradient></defs>'
    + '<path d="M12 16V4M7 9l5-5 5 5" stroke="url(#' + gid + ')"/>'
    + '<path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="url(#' + gid + ')"/>' + '</svg>';
}
const TT = FM.addMenu._tabs(); const media = TT.find(t => t.key === 'media'), audio = TT.find(t => t.key === 'audio');
const mOpt = media.options, aOpt = audio.options, hue0 = FM.addMenu._tileHue;
if (MODE !== 'none') {
  media.options = function () { return mOpt.call(this).map(o => o.label === 'Import' ? Object.assign({}, o, { label: 'Import media', icon: importIcon('fm-ic-imp') }) : o); };
  audio.options = function () { return aOpt.call(this).map(o => o.label === 'Import audio' ? Object.assign({}, o, { icon: importIcon('fm-ic-impau') }) : o); };
  FM.addMenu._tileHue = function (l) { return l === 'Import' ? null : hue0(l); };   // the BY_LABEL 'Import' key removed
}
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(700);
const T = [];
function test(name, opts, fn) { T.push({ name, fn }); }
  /* ---------------- queue 960: Import media and Import audio match ----------------
   * His words: "The import media button and the import audio button both have some discrepancies. Like they both look
   * different. I think you should make them both have like the shiny look that the import media button has. But also
   * rename the import media button to import media because right now it's just called import just so then it feels a
   * bit more thought out and less slack"
   * MEASURED FIRST (v17.03, 1280x900 and 380x820, computed styles of both tiles): the plates were already the same —
   * one --am-tint (150, 160, 176), one class list, the same background, border, radius and inset shadow. The only
   * difference in the tile itself was the ICON PAINT: Media's arrow strokes url(#fm-ic-imp), a white → 55%-white
   * gradient (#270); Import audio's strokes currentColor, i.e. the grey tint. #270 left it grey on purpose and said so.
   * The SAME checker runs on the Media tile first — the look he pointed at is the positive control: if paint() could
   * not see a gradient, the Media tile would fail it too and this test could never pass vacuously. */
  test('960 Import media and Import audio wear the same white-gradient arrow, and the Media tile says "Import media"', { item: '960' }, async function () {
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-10000px;top:0;width:420px;height:600px';
    document.body.appendChild(host);
    try {
      FM.addMenu.render(host, { variant: 'panel' });
      const openTab = async function (name) {
        const tab = [...host.querySelectorAll('.addmenu-tab')].find(e => e.textContent.trim() === name);
        if (!tab) throw new Error('no ' + name + ' tab');
        tab.click(); await sleep(180);
      };
      const labelOf = c => ((c.querySelector('.addmenu-lbl') || {}).textContent || '').trim();
      const cardNamed = label => [...host.querySelectorAll('.addmenu-card')].find(c => labelOf(c) === label);
      // What a tile's icon is painted with. Every stroke must name ONE gradient, and it must live inside this card.
      function paint(card, what) {
        const paths = [...card.querySelectorAll('.addmenu-ic svg path')];
        if (!paths.length) throw new Error(what + ': the icon has no strokes to check');
        const ids = new Set();
        paths.forEach(p => {
          const st = p.getAttribute('stroke') || '';
          const m = /^url\(#([^)]+)\)$/.exec(st);
          if (!m) throw new Error(what + ': a stroke is "' + (st || 'currentColor, inherited from the svg') + '" — it takes the card\'s grey tint, not the white gradient');
          ids.add(m[1]);
        });
        if (ids.size !== 1) throw new Error(what + ': the arrow and the tray use ' + ids.size + ' different paints');
        const id = [...ids][0];
        const grad = [...card.querySelectorAll('linearGradient')].find(g => g.id === id);
        if (!grad) throw new Error(what + ': the icon points at #' + id + ', which is not inside this card — it would borrow (or lose) another icon\'s paint');
        const stops = [...grad.querySelectorAll('stop')].map(s => (s.getAttribute('stop-color') || '').toLowerCase() + '@' + (s.getAttribute('stop-opacity') || '1')).join(' > ');
        return { id, stops, tint: card.style.getPropertyValue('--am-tint').trim(), cls: card.className };
      }

      await openTab('Media');
      if (cardNamed('Import')) throw new Error('the Media tile is still called just "Import" — he asked for "Import media"');
      const media = cardNamed('Import media');
      if (!media) throw new Error('no "Import media" tile on the Media tab (tiles: ' + [...host.querySelectorAll('.addmenu-card')].map(labelOf).join(', ') + ')');
      if (media.title !== 'Import media') throw new Error('the Import media tile\'s tooltip says "' + media.title + '"');
      const m = paint(media, 'Import media');     // the positive control: the look he pointed at passes
      if (m.stops !== '#ffffff@1 > #ffffff@.55') throw new Error('the Import media gradient is ' + m.stops + ' — it is the reference look and was not meant to change');

      await openTab('Audio');
      const audio = cardNamed('Import audio');
      if (!audio) throw new Error('no "Import audio" tile on the Audio tab');
      const a = paint(audio, 'Import audio');

      if (a.stops !== m.stops) throw new Error('the two arrows are painted differently — Import media ' + m.stops + ', Import audio ' + a.stops);
      if (a.id === m.id) throw new Error('both icons use the id #' + a.id + ' — a duplicate id silently steals the paint from whichever element asks second');
      if (a.tint !== m.tint) throw new Error('the plates differ: Import media --am-tint ' + m.tint + ', Import audio ' + a.tint);
      if (a.cls !== m.cls) throw new Error('the tiles carry different classes: "' + m.cls + '" vs "' + a.cls + '"');

      // the tint map is keyed by the visible label, so the rename has to reach it — and leave no dead key behind
      const hue = FM.addMenu._tileHue('Import media');
      if (!hue) throw new Error('"Import media" has no tile colour — BY_LABEL is keyed by the label');
      const rgb = hue.split(',').map(n => parseInt(n, 10));
      if (Math.max.apply(null, rgb) - Math.min.apply(null, rgb) > 40) throw new Error('"Import media" is no longer the basic grey (#210): ' + hue);
      if (FM.addMenu._tileHue('Import')) throw new Error('the tile-colour map still carries an "Import" key that no tile has any more');
    } finally { host.remove(); }
  });

  /* 960, the PC half. MEASURED on the plan (v17.03 + the change applied at runtime, a library of two clips and a song):
   * 1. THE RENAME ALONE BROKE THE PC FIT. At 1280x900 (Studio, inspector 307x270) it knocked the Media tab out of its
   *    fitted layout — pinned tiles 43→64px tall, icons 19→22px, the library squeezed into the fixed five-column
   *    fallback — and Audio with it. Under .addmenu--fit a pinned label may wrap, "Import media" is wider than its
   *    fitted tile, it went to two lines, the strip grew, and the grid lost the room it had been planned in.
   * 2. THE TWO BUTTONS WERE NEVER THE SAME SIZE ON PC. The strip wore the fit variables planned for the LIBRARY under
   *    it, per tab: at 1280x900 Import was 64x43 with a 19px arrow and Import audio 87x60 with a 27px arrow.
   * The strip now has its own size (styles.css, queue 960), the same on both tabs. This drives the real fit (a .panel
   * host at a desktop width, the render the inspector does) and asserts the three facts: still fitted, one line,
   * same height and same arrow on both tabs. 285x358 is a panel the fit comments record measuring (classic 1024x640);
   * measured on the plan, it is a size where the un-fixed rename wraps to 2.0 lines at 12px. */
  test('960 on PC Import media and Import audio are the same size, on one line, and the tabs keep their fitted layout', { item: '960' }, async function () {
    const KEY = 'fm.medialib', saved = localStorage.getItem(KEY);
    const panel = document.createElement('aside'); panel.className = 'panel';
    panel.style.cssText = 'position:fixed;left:-10000px;top:0;width:285px;height:358px;overflow:auto';
    const box = document.createElement('div'); panel.appendChild(box); document.body.appendChild(panel);
    try {
      localStorage.setItem(KEY, JSON.stringify([
        { mid: 't960v', key: 'k960v', name: 'Clip.mp4', kind: 'video', audio: false, w: 1080, h: 1920, dur: 4, added: 3 },
        { mid: 't960p', key: 'k960p', name: 'Shot.jpg', kind: 'image', audio: false, w: 1080, h: 1350, dur: 0, added: 2 },
        { mid: 't960a', key: 'k960a', name: 'Song.mp3', kind: 'video', audio: true, w: 0, h: 0, dur: 95, added: 1 }
      ]));
      return await atWideWidth(async function () {
        FM.addMenu.render(box, { variant: 'panel' });
        await sleep(120);
        const root = box.querySelector('.addmenu');
        if (!root) throw new Error('the Add menu did not render into the test panel');
        const visit = async function (name, label) {
          const tab = [...root.querySelectorAll('.addmenu-tab')].find(e => e.textContent.trim() === name);
          if (!tab) throw new Error('no ' + name + ' tab');
          tab.click(); await sleep(250);
          const pinned = [...root.querySelectorAll('.addmenu-pinned .addmenu-card')];
          const card = pinned.find(c => ((c.querySelector('.addmenu-lbl') || {}).textContent || '').trim() === label);
          if (!card) throw new Error('no "' + label + '" tile in the PC ' + name + ' strip (strip: ' + pinned.map(c => c.textContent.trim()).join(', ') + ')');
          // THE CONTROL: this is the fitted PC layout, not the fixed fallback — otherwise nothing below is about the fit
          if (!root.classList.contains('addmenu--fit')) throw new Error('the PC ' + name + ' tab dropped out of its fitted layout (data-am-fit ' + (root.dataset.amFit || 'none') + ', strip ' + Math.round(root.querySelector('.addmenu-pinned').getBoundingClientRect().height) + 'px) — the strip took the room the grid was planned in');
          const lb = card.querySelector('.addmenu-lbl'), fs = parseFloat(getComputedStyle(lb).fontSize);
          return { h: card.getBoundingClientRect().height, ico: card.querySelector('.addmenu-ic svg').getBoundingClientRect().width, fs: fs, lines: lb.getBoundingClientRect().height / (fs * 1.2) };
        };
        const m = await visit('Media', 'Import media');
        const a = await visit('Audio', 'Import audio');
        if (m.lines > 1.4) throw new Error('"Import media" wraps to ' + m.lines.toFixed(1) + ' lines in the PC strip (' + m.fs + 'px) — a two-line label makes the strip taller than the box the fit planned against');
        if (Math.abs(m.h - a.h) > 0.5) throw new Error('on PC Import media is ' + m.h.toFixed(1) + 'px tall and Import audio ' + a.h.toFixed(1) + 'px — "they both look different"');
        if (Math.abs(m.ico - a.ico) > 0.5) throw new Error('on PC the Import media arrow is ' + m.ico.toFixed(1) + 'px and the Import audio arrow ' + a.ico.toFixed(1) + 'px');
      }, 1280);
    } finally {
      panel.remove();
      if (saved == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, saved);
    }
  });

const out = {};
for (const t of T) {
  try { await t.fn(); out[t.name.slice(0, 40)] = 'PASS'; }
  catch (e) { out[t.name.slice(0, 40)] = 'FAIL: ' + e.message.slice(0, 300); }
}
media.options = mOpt; audio.options = aOpt; FM.addMenu._tileHue = hue0;
return { mode: MODE, w: innerWidth, out };
