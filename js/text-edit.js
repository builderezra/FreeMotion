/* FreeMotion — Text edit mode (Alight Motion style).
 * A focused, full-screen text-entry mode: a big text field docked above the mobile keyboard + a
 * compact top toolbar with exactly four controls — Align · Font · Size · Colour — and a ✓ Done.
 * Everything else (bold/italic, spacing, line-height, curve, outline, animation, captions) stays in
 * the inspector's "Edit Text" category, matching AM (it keeps those out of the focused text bar too).
 * Cloned from crop-tool.js's overlay lifecycle, with all on-canvas geometry stripped.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let active = null;                 // { layerId, prevText }
  let bar = null, dock = null, input = null, pop = null, popKind = '';

  function layer() { return active ? FM.scene.layers.find(l => l.id === active.layerId) : null; }

  // Built-in families (mirrors inspector.js FONTS); imported fonts come from FM.fonts.list().
  const FONTS = ['Inter, sans-serif', 'Helvetica, Arial, sans-serif', 'Georgia, serif', 'Times New Roman, serif', 'Courier New, monospace', 'Impact, sans-serif', 'Verdana, sans-serif', 'Trebuchet MS, sans-serif', 'Palatino, serif', 'Comic Sans MS, cursive'];
  function fontLabel(css) {
    const mine = (FM.fonts ? FM.fonts.list() : []).find(f => f.css === css);
    if (mine) return mine.name;
    return String(css || 'Inter').split(',')[0].trim();
  }

  const ALIGN_ICON = {
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h10M4 18h13"/></svg>',
    center: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M6 18h12"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M10 12h10M7 18h13"/></svg>',
  };

  function elc(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  // ---- top toolbar buttons -------------------------------------------------
  function updateBarLabels() {
    const l = layer(); if (!l || !bar) return;
    const a = l.align || 'left';
    bar.querySelector('.te-align').innerHTML = ALIGN_ICON[a] || ALIGN_ICON.left;
    const fb = bar.querySelector('.te-font-lbl'); if (fb) fb.textContent = fontLabel(l.fontFamily);
    const sb = bar.querySelector('.te-size-lbl'); if (sb) sb.textContent = Math.round(l.fontSize || 96);
    const sw = bar.querySelector('.te-swatch'); if (sw && FM._fillGet) sw.style.background = FM._fillGet(l);
  }

  function cycleAlign() {
    const l = layer(); if (!l) return;
    const order = ['left', 'center', 'right'];
    l.align = order[(order.indexOf(l.align || 'left') + 1) % 3];
    FM.requestRender(); updateBarLabels();
  }

  // ---- transient sub-popover (font rail / size slider / colour) ------------
  function closePop() { if (pop && pop.parentElement) pop.parentElement.removeChild(pop); pop = null; popKind = ''; if (bar) bar.querySelectorAll('.te-btn.on').forEach(b => b.classList.remove('on')); }
  function positionPop() { if (!pop || !bar) return; const r = bar.getBoundingClientRect(); pop.style.top = (r.bottom + 6) + 'px'; }
  function openPop(kind, build, btn) {
    if (popKind === kind) { closePop(); return; }
    closePop();
    pop = elc('div', 'te-pop te-pop-' + kind);
    build(pop);
    document.body.appendChild(pop);
    popKind = kind;
    if (btn) btn.classList.add('on');
    positionPop();
  }

  function buildFontRail(host) {
    const l = layer(); if (!l) return;
    const rail = elc('div', 'te-font-rail');
    const addCard = (css, name) => {
      const card = elc('button', 'te-font-card' + (css === l.fontFamily ? ' on' : ''));
      card.type = 'button';
      const abc = elc('span', 'te-font-abc'); abc.textContent = 'Abc'; abc.style.fontFamily = css;
      const nm = elc('span', 'te-font-name'); nm.textContent = name;
      card.append(abc, nm);
      card.addEventListener('click', () => { const ly = layer(); if (!ly) return; ly.fontFamily = css; FM.requestRender(); updateBarLabels(); rail.querySelectorAll('.te-font-card.on').forEach(c => c.classList.remove('on')); card.classList.add('on'); });
      rail.appendChild(card);
    };
    FONTS.forEach(css => addCard(css, css.split(',')[0].trim()));
    (FM.fonts ? FM.fonts.list() : []).forEach(f => addCard(f.css, f.name));
    // Import (AM's "View All Fonts" → here it's the useful action: pull a font off the device)
    const imp = elc('button', 'te-font-card te-font-import', '<span class="te-font-abc">＋</span><span class="te-font-name">Import</span>');
    imp.type = 'button';
    imp.addEventListener('click', () => { if (!FM.fonts) return; FM.fonts.pick(rec => { const ly = layer(); if (!ly || !rec) return; ly.fontFamily = rec.css; FM.requestRender(); updateBarLabels(); if (popKind === 'font') openPop('font', buildFontRail); }); });
    rail.appendChild(imp);
    host.appendChild(rail);
    // scroll the selected card into view
    requestAnimationFrame(() => { const on = rail.querySelector('.te-font-card.on'); if (on && on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest' }); });
  }

  function buildSizePop(host) {
    const l = layer(); if (!l) return;
    const row = elc('div', 'te-size-row');
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '8'; slider.max = '400'; slider.step = '1'; slider.value = String(Math.round(l.fontSize || 96));
    slider.className = 'te-size-slider';
    const val = elc('span', 'te-size-val', String(Math.round(l.fontSize || 96)));
    slider.addEventListener('input', () => { const ly = layer(); if (!ly) return; ly.fontSize = parseInt(slider.value, 10) || 1; val.textContent = slider.value; FM.requestRender(); updateBarLabels(); });
    row.append(slider, val); host.appendChild(row);
  }

  function buildColorPop(host) {
    const l = layer(); if (!l) return;
    const wrap = elc('div', 'te-color-wrap');
    if (FM._colorField && FM._fillGet && FM._fillSet) {
      wrap.appendChild(FM._colorField(() => FM._fillGet(l), v => FM._fillSet(l, v)));
      wrap.addEventListener('input', updateBarLabels);
      wrap.addEventListener('click', () => setTimeout(updateBarLabels, 0));
    }
    host.appendChild(wrap);
  }

  // ---- keyboard docking (the one thing crop-tool didn't need) --------------
  function onViewport() {
    if (!dock) return;
    const vv = window.visualViewport;
    const gap = vv ? Math.max(0, (window.innerHeight - vv.height - vv.offsetTop)) : 0;
    dock.style.bottom = gap + 'px';
    positionPop();
  }

  // ---- lifecycle -----------------------------------------------------------
  function onInput() { const l = layer(); if (l) { l.text = input.value; FM.requestRender(); } }

  function commit() {
    const l = layer();
    if (l && input) l.text = input.value;
    teardown();
    FM.requestRender();
    if (FM.inspector) FM.inspector.refresh();
    if (FM.history) FM.history.commit();
  }

  function onDocDown(e) {
    if (!active) return;
    if (pop && (pop.contains(e.target) || (bar && bar.contains(e.target)))) return;
    if (pop) closePop();
  }

  function teardown() {
    active = null;
    closePop();
    if (bar && bar.parentElement) bar.parentElement.removeChild(bar); bar = null;
    if (dock && dock.parentElement) dock.parentElement.removeChild(dock); dock = null;
    input = null;
    document.body.classList.remove('text-editing');
    window.removeEventListener('resize', onViewport);
    if (window.visualViewport) { window.visualViewport.removeEventListener('resize', onViewport); window.visualViewport.removeEventListener('scroll', onViewport); }
    document.removeEventListener('pointerdown', onDocDown, true);
  }

  FM.textEdit = {
    isActive() { return !!active; },
    layerId() { return active ? active.layerId : null; },
    start(layerId, opts) {
      opts = opts || {};
      const l = FM.scene.layers.find(x => x.id === layerId);
      if (!l || l.type !== 'text') { if (FM.toast) FM.toast('Select a text layer'); return; }
      if (active) teardown();
      if (FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive()) FM.pointEdit.stop();
      if (FM.cropTool && FM.cropTool.isActive && FM.cropTool.isActive()) FM.cropTool.stop();
      if (FM.selectLayer) FM.selectLayer(l.id);
      active = { layerId: layerId, prevText: l.text };

      // ---- top toolbar: Align · Font · Size · Colour · Done ----
      bar = elc('div', 'te-bar');
      const alignBtn = elc('button', 'te-btn te-align'); alignBtn.type = 'button'; alignBtn.title = 'Alignment';
      const fontBtn = elc('button', 'te-btn te-font', '<span class="te-font-lbl"></span><span class="te-caret">▾</span>'); fontBtn.type = 'button';
      const sizeBtn = elc('button', 'te-btn te-size', '<span class="te-size-lbl"></span><span class="te-size-unit">pt</span><span class="te-caret">▾</span>'); sizeBtn.type = 'button';
      const colorBtn = elc('button', 'te-btn te-color', '<span class="te-swatch"></span>'); colorBtn.type = 'button'; colorBtn.title = 'Colour';
      const doneBtn = elc('button', 'te-btn te-done', '✓'); doneBtn.type = 'button'; doneBtn.title = 'Done';
      bar.append(alignBtn, fontBtn, sizeBtn, colorBtn, doneBtn);
      document.body.appendChild(bar);
      alignBtn.addEventListener('click', () => { closePop(); cycleAlign(); });
      fontBtn.addEventListener('click', () => openPop('font', buildFontRail, fontBtn));
      sizeBtn.addEventListener('click', () => openPop('size', buildSizePop, sizeBtn));
      colorBtn.addEventListener('click', () => openPop('color', buildColorPop, colorBtn));
      // guard mousedown so tapping a bar button doesn't blur/close the keyboard mid-edit
      bar.addEventListener('mousedown', e => { if (e.target !== input) e.preventDefault(); });
      doneBtn.addEventListener('click', commit);

      // ---- bottom dock: the text field ----
      dock = elc('div', 'te-dock');
      input = document.createElement('textarea');
      input.id = 'te-input'; input.rows = 2; input.value = l.text || ''; input.spellcheck = false;
      input.setAttribute('placeholder', 'Type your text…');
      dock.appendChild(input);
      document.body.appendChild(dock);
      input.addEventListener('input', onInput);
      input.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); commit(); }
        // Cmd/Ctrl+Enter also commits (plain Enter inserts a newline — text can be multi-line)
        else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
      });

      document.body.classList.add('text-editing');
      window.addEventListener('resize', onViewport);
      if (window.visualViewport) { window.visualViewport.addEventListener('resize', onViewport); window.visualViewport.addEventListener('scroll', onViewport); }
      document.addEventListener('pointerdown', onDocDown, true);

      updateBarLabels();
      onViewport();
      input.focus();
      if (opts.selectAll) input.select();
      else { const n = input.value.length; try { input.setSelectionRange(n, n); } catch (_) {} }
    },
    // Esc / external close → commit-and-exit (the live value is already applied).
    stop() { if (active) commit(); },
  };
})(window.FM);
