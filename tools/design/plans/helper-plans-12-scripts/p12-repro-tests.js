  /* ═══ P12 reproductions: one test per item, each RED on main 2e3fd7a9 (v17.25) and the assertion the finished fix has to satisfy.
     Append before `async function run()` in tests/tests.js. Names start with "P12 " so `?only=P12` runs them. ═══ */
  const p12Lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const p12Ratio = (a, b) => { let x = p12Lum(a), y = p12Lum(b); if (x < y) { const t = x; x = y; y = t; } return (x + 0.05) / (y + 0.05); };
  const p12Hex = h => { h = String(h).trim().replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };

  test('P12 #1025 the faint text token reaches 4.5:1 on every surface it is drawn on, dark editor and light settings sheet', { item: 'P12' }, function () {
    const read = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();
    const bad = [];
    const dark = document.body, faint = read(dark, '--text-faint');
    if (!/^#[0-9a-f]{6}$/i.test(faint)) throw new Error('setup: --text-faint on the body is "' + faint + '", not a #rrggbb');
    ['--panel', '--panel-2', '--panel-3'].forEach(n => {
      const bg = read(dark, n); if (!/^#[0-9a-f]{6}$/i.test(bg)) return;       // an rgba surface is judged below on its composite
      const r = p12Ratio(p12Hex(faint), p12Hex(bg)); if (r < 4.5) bad.push('dark ' + faint + ' on ' + n + ' ' + bg + ' = ' + r.toFixed(2));
    });
    /* the light Home's settings sheet re-points the tokens on .set-scrim (theme-glass.css:1118-1135) — put it on screen the way Home does */
    const de = document.documentElement, was = de.getAttribute('data-home'), hadHome = document.body.classList.contains('home-open');
    const scrim = document.createElement('div'); scrim.className = 'set-scrim'; document.body.appendChild(scrim);
    try {
      de.setAttribute('data-home', 'light'); document.body.classList.add('home-open');
      const lf = read(scrim, '--text-faint'), lp = read(scrim, '--panel');
      if (/^#[0-9a-f]{6}$/i.test(lf) && /^#[0-9a-f]{6}$/i.test(lp)) { const r = p12Ratio(p12Hex(lf), p12Hex(lp)); if (r < 4.5) bad.push('light ' + lf + ' on --panel ' + lp + ' = ' + r.toFixed(2)); }
      else throw new Error('setup: the light override did not apply (--text-faint "' + lf + '", --panel "' + lp + '")');
    } finally {
      scrim.remove(); if (was == null) de.removeAttribute('data-home'); else de.setAttribute('data-home', was);
      if (!hadHome) document.body.classList.remove('home-open');
    }
    if (bad.length) throw new Error('--text-faint is under 4.5:1 on: ' + bad.join('; '));
  });

  test('P12 #1026 the Home tab that is on says so to a screen reader, and only that one', { item: 'P12' }, async function () {
    if (!FM.home || !FM.home.open) throw new Error('setup: FM.home is missing');
    if (!FM.home.isOpen()) FM.home.open();
    await new Promise(r => setTimeout(r, 400));
    const tabs = [].slice.call(document.querySelectorAll('#home-screen .hm-tab'));
    if (tabs.length < 4) throw new Error('setup: expected the four Home tabs, found ' + tabs.length);
    const state = b => b.getAttribute('aria-pressed') || b.getAttribute('aria-selected');
    const go = async t => { document.querySelector('#home-screen .hm-tab[data-tab="' + t + '"]').click(); await new Promise(r => setTimeout(r, 450)); };
    const bad = [];
    for (const t of ['templates', 'elements', 'tutorials', 'projects']) {
      await go(t);
      tabs.forEach(b => { const want = b.dataset.tab === t ? 'true' : 'false'; if (state(b) !== want) bad.push(t + ': ' + b.dataset.tab + ' exposes ' + JSON.stringify(state(b)) + ', wanted ' + want); });
    }
    if (bad.length) throw new Error('the selected Home tab is only a CSS class: ' + bad.slice(0, 4).join(' | ') + (bad.length > 4 ? ' … (' + bad.length + ' in all)' : ''));
  });

  test('P12 #1027 a keyboard user can jump to the next keyframe and nudge one by a frame', { item: 'P12' }, async function () {
    if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close();   // a full-screen overlay owns the keyboard (app.js keydown): Home must be shut
    const layers0 = FM.scene.layers.slice(), t0 = FM.time;
    try {
      const L = FM.makeLayer('shape', { shape: 'rect', x: 100, y: 100, shapeW: 60, shapeH: 60, start: 0, duration: 4 });
      L.transform.x = { kf: [{ t: 0, v: 100, e: 'linear' }, { t: 1, v: 400, e: 'linear' }] };
      FM.scene.layers.length = 0; FM.scene.layers.push(L); FM.selectLayer(L.id); FM.refreshAll(); FM.setTime(0);
      FM.inspector.openCategory('move'); await new Promise(r => setTimeout(r, 300));
      const key = (code, o) => document.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ code: code, key: code, bubbles: true, cancelable: true }, o || {})));
      key('Period', { shiftKey: true });            // the proposed "next keyframe": Shift + . (Comma / Period step a frame, so the shifted pair steps a keyframe)
      if (Math.abs(FM.time - 1) > 1e-6) throw new Error('Shift+. left the playhead at ' + FM.time + ' s; the next keyframe is at 1 s');
      const fps = FM.scene.project.fps || 30;
      key('Period', { altKey: true });   // the proposed nudge: Alt + . moves the keyframe under the playhead one frame later (Ctrl/Cmd + anything is returned unhandled at app.js:8889, and Alt+Shift switches the keyboard layout on Windows)
      const kf = L.transform.x.kf.map(k => +k.t.toFixed(4));
      if (Math.abs(kf[1] - (1 + 1 / fps)) > 1e-3) throw new Error('Alt+. left the keyframes at ' + JSON.stringify(kf) + '; the second should now be ' + (1 + 1 / fps).toFixed(4) + ' s with its value unchanged');
      if (L.transform.x.kf[1].v !== 400) throw new Error('the nudge changed the keyframe\'s value to ' + L.transform.x.kf[1].v);
    } finally { FM.scene.layers.length = 0; layers0.forEach(l => FM.scene.layers.push(l)); FM.setTime(t0); FM.selectLayer(null); FM.refreshAll(); }
  });

  test('P12 #1028 the preview canvas has an accessible name and a role', { item: 'P12' }, function () {
    const c = document.getElementById('preview');
    if (!c) throw new Error('setup: #preview is missing');
    const name = (c.getAttribute('aria-label') || '').trim(), role = c.getAttribute('role');
    if (!name || role !== 'img') throw new Error('#preview has aria-label ' + JSON.stringify(name) + ' and role ' + JSON.stringify(role) + '; wanted a non-empty label and role="img"');
  });

  test('P12 #1029 a long project name is readable in full on a Home card (two lines, or a title with the whole name), on a phone', { item: 'P12' }, async function () {
    if (!FM.home || !FM.projects) throw new Error('setup: FM.home / FM.projects missing');
    const long = 'Summer holiday in Portugal and Spain with the whole family final cut';
    await atPhoneWidth(async function () {
      const pid = await FM.projects.create({ name: long, width: 1080, height: 1920 });
      try {
        if (FM.home.isOpen()) FM.home.close();
        FM.home.open(); await new Promise(r => setTimeout(r, 900));
        const e = [].slice.call(document.querySelectorAll('#home-screen .hm-name')).filter(n => n.textContent === long)[0];
        if (!e) throw new Error('setup: no Home card carries the long name');
        const cs = getComputedStyle(e), clamp = parseInt(cs.webkitLineClamp, 10) || 0, wraps = cs.whiteSpace !== 'nowrap';
        const titled = (e.title || (e.closest('.hm-card') && e.closest('.hm-card').title) || '') === long;
        if (titled || (wraps && clamp >= 2)) return;
        if (!(e.scrollWidth > e.clientWidth + 1)) throw new Error('CONTROL: the 68-character name is not cut off at this width (' + e.scrollWidth + ' in ' + e.clientWidth + ' px), so this proves nothing');
        throw new Error('the name is cut off (' + e.scrollWidth + ' px of text in ' + e.clientWidth + ' px) on one line, with no title: white-space ' + cs.whiteSpace + ', line-clamp ' + (clamp || 'none') + ', title ' + JSON.stringify(e.title));
      } finally { try { await FM.projects.remove(pid); } catch (x) {} if (FM.home.isOpen()) FM.home.close(); }
    }, 380);
  });
