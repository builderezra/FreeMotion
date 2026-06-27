/* FreeMotion — Inspector: edit the selected layer's properties.
 * Each transform row has a value field + a keyframe diamond. Editing a value writes to
 * the scene at the current playhead time (creating a keyframe if the prop is animated).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let root;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function round(v, dp) { const m = Math.pow(10, dp); return Math.round(v * m) / m; }
  function commitH() { if (FM.history) FM.history.commit(); }

  function section(title) { const s = el('div', 'insp-section'); s.appendChild(el('h4', null, title)); return s; }

  function transformRow(layer, key, label, opts) {
    opts = opts || {};
    const p = layer.transform[key];
    const wrap = el('div', 'prop-wrap');
    const row = el('div', 'prop-row');
    row.appendChild(el('label', null, label));
    const input = document.createElement('input');
    input.type = 'number';
    input.step = opts.step != null ? opts.step : 1;
    input.value = round(FM.evalProp(p, FM.time), opts.dp != null ? opts.dp : 2);
    let range = null;
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      if (isNaN(v)) return;
      FM.setTransform(layer, key, v, FM.time);
      if (range) range.value = v;
      FM.requestRender();
      FM.timeline.updatePlayhead();
    });
    input.addEventListener('change', commitH);
    row.appendChild(input);
    const animated = FM.isAnimated(p);
    const onHere = FM.hasKeyframeAt(p, FM.time);
    const kf = el('button', 'kf-btn' + (animated ? ' active' : '') + (onHere ? ' here' : ''), '◆');
    kf.title = animated ? 'Keyframe at playhead (click to remove)' : 'Animate this property — adds a keyframe at the playhead';
    kf.addEventListener('click', () => {
      FM.toggleKeyframe(layer, key, FM.time);
      FM.inspector.refresh();
      FM.requestRender();
      commitH();
    });
    row.appendChild(kf);
    wrap.appendChild(row);
    if (opts.slider) {
      const sr = el('div', 'prop-slider');
      range = document.createElement('input');
      range.type = 'range';
      range.min = opts.slider.min; range.max = opts.slider.max; range.step = opts.slider.step || 0.01;
      range.value = FM.evalProp(p, FM.time);
      range.addEventListener('input', () => {
        const v = parseFloat(range.value);
        FM.setTransform(layer, key, v, FM.time);
        input.value = round(v, opts.dp != null ? opts.dp : 2);
        FM.requestRender();
      });
      range.addEventListener('change', commitH);
      sr.appendChild(range);
      wrap.appendChild(sr);
    }
    return wrap;
  }

  function textRow(label, value, onChange, type) {
    const row = el('div', 'prop-row');
    row.appendChild(el('label', null, label));
    const input = document.createElement('input');
    input.type = type || 'text';
    input.value = value;
    input.addEventListener('input', () => onChange(input.value));
    input.addEventListener('change', commitH);
    row.appendChild(input);
    return row;
  }

  function selectRow(label, value, options, onChange) {
    const row = el('div', 'prop-row');
    row.appendChild(el('label', null, label));
    const sel = document.createElement('select');
    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = o;
      if (o === value) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => { onChange(sel.value); commitH(); });
    row.appendChild(sel);
    return row;
  }

  function checkRow(label, checked, onChange) {
    const row = el('label', 'chk-row');
    const c = document.createElement('input');
    c.type = 'checkbox'; c.checked = checked;
    c.addEventListener('change', () => { onChange(c.checked); commitH(); });
    row.appendChild(c);
    row.appendChild(document.createTextNode(label));
    return row;
  }

  function rangeRow(label, get, set, min, max, step) {
    const wrap = el('div', 'prop-wrap');
    const row = el('div', 'prop-row');
    row.appendChild(el('label', null, label));
    const range = document.createElement('input'); range.type = 'range';
    range.min = min; range.max = max; range.step = step || 1; range.value = get();
    const val = el('span', 'fx-val', String(get()));
    range.addEventListener('input', () => { set(parseFloat(range.value)); val.textContent = range.value; FM.requestRender(); });
    range.addEventListener('change', commitH);
    row.appendChild(range); row.appendChild(val);
    wrap.appendChild(row);
    return wrap;
  }

  // Swatch + synced hex text input (type/paste/read exact colours). Renders on input, commits on change.
  function normHex(c) { c = String(c == null ? '#000000' : c).trim().toLowerCase(); let h = c.replace('#', ''); if (/^[0-9a-f]{3}$/.test(h)) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return /^[0-9a-f]{6}$/.test(h) ? '#' + h : '#000000'; }
  function addRecentColor(c) {
    c = normHex(c);
    FM.recentColors = [c].concat((FM.recentColors || []).filter(x => x !== c)).slice(0, 12);
  }
  function colorField(getVal, setVal) {
    const cont = el('div', 'color-field-wrap');
    const wrap = el('div', 'color-field');
    const sw = document.createElement('input'); sw.type = 'color'; sw.value = normHex(getVal());
    const hex = document.createElement('input'); hex.type = 'text'; hex.className = 'hex-input'; hex.spellcheck = false; hex.maxLength = 7; hex.value = normHex(getVal());
    const apply = (v) => { const n = normHex(v); setVal(n); sw.value = n; FM.requestRender(); };
    const commitColor = () => { addRecentColor(getVal()); commitH(); };
    sw.addEventListener('input', () => { hex.value = sw.value; apply(sw.value); });
    sw.addEventListener('change', commitColor);
    hex.addEventListener('input', () => { let v = hex.value.trim(); if (v && v[0] !== '#') v = '#' + v; if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) apply(v); });
    hex.addEventListener('blur', () => { hex.value = normHex(getVal()); });
    hex.addEventListener('change', commitColor);
    wrap.append(sw, hex); cont.appendChild(wrap);
    // recently-used colour swatches
    if (FM.recentColors && FM.recentColors.length) {
      const rec = el('div', 'color-recents');
      FM.recentColors.slice(0, 10).forEach(c => {
        const chip = document.createElement('button'); chip.className = 'swatch-chip'; chip.style.background = c; chip.title = c;
        chip.addEventListener('click', () => { apply(c); hex.value = normHex(c); commitColor(); FM.inspector.refresh(); });
        rec.appendChild(chip);
      });
      cont.appendChild(rec);
    }
    return cont;
  }
  FM._colorField = colorField;

  // Effect-stack presets: built-in starters (always present, showcase the effects) + the user's
  // own saved stacks (persisted to localStorage, reusable across projects).
  FM.fxPresets = {
    _key: 'fm.fxpresets',
    builtins: [
      { name: 'VHS Glitch', builtin: true, effects: [{ type: 'rgbsplit', enabled: true, params: { amount: 7 } }, { type: 'posterize', enabled: true, params: { levels: 4 } }] },
      { name: 'Duotone', builtin: true, effects: [{ type: 'threshold', enabled: true, params: { level: 0.5 } }, { type: 'tint', enabled: true, params: { amount: 1, color: '#19c3ff' } }] },
      { name: 'Dreamy', builtin: true, effects: [{ type: 'blur', enabled: true, params: { amount: 6 } }, { type: 'brightness', enabled: true, params: { amount: 1.15 } }, { type: 'saturate', enabled: true, params: { amount: 1.25 } }] },
      { name: 'Comic', builtin: true, effects: [{ type: 'posterize', enabled: true, params: { levels: 3 } }, { type: 'rgbsplit', enabled: true, params: { amount: 2 } }] }
    ],
    saved() { try { return JSON.parse(localStorage.getItem(this._key) || '[]'); } catch (e) { return []; } },
    list() { return this.builtins.concat(this.saved()); },
    _write(arr) { try { localStorage.setItem(this._key, JSON.stringify(arr)); } catch (e) { } },
    save(name, effects) { if (!name) return; const arr = this.saved().filter(p => p.name !== name); arr.push({ name: name, effects: JSON.parse(JSON.stringify(effects || [])) }); this._write(arr); },
    get(name) { return this.list().find(p => p.name === name); },
    remove(name) { this._write(this.saved().filter(p => p.name !== name)); }   // built-ins are not removable
  };

  function effectsSection(layer) {
    const s = section('Effects');
    const addRow = el('div', 'prop-row');
    addRow.appendChild(el('label', null, 'Add'));
    const sel = document.createElement('select');
    const ph = document.createElement('option'); ph.value = ''; ph.textContent = '+ Add effect…'; sel.appendChild(ph);
    // geometric post-fx need a per-layer geometry pass — an adjustment layer can't apply them to the
    // scene below, so don't offer them there (avoids a confusing no-op).
    const adjUnsupported = { mirror: 1 };   // adjustment supports all post-fx now except whole-scene mirror
    FM.EFFECTS.forEach(def => {
      if (layer.type === 'adjustment' && adjUnsupported[def.type]) return;
      const o = document.createElement('option'); o.value = def.type; o.textContent = def.label; sel.appendChild(o);
    });
    sel.addEventListener('change', () => {
      const def = FM.EFFECTS.find(e => e.type === sel.value); if (!def) return;
      if (!layer.effects) layer.effects = [];
      const params = {}; params[def.param] = def.def; if (def.color) params.color = def.defColor || '#ffffff'; if (def.color2) params.color2 = def.defColor2 || '#ffffff';
      layer.effects.push({ type: def.type, enabled: true, params: params });
      FM.inspector.refresh(); FM.requestRender(); if (FM.history) FM.history.commit();
    });
    addRow.appendChild(sel);
    // copy / paste the whole effect stack between layers
    const cp = el('button', 'fx-act', 'Copy'); cp.title = "Copy this layer's effect stack";
    cp.disabled = !(layer.effects && layer.effects.length);
    cp.addEventListener('click', () => { FM.effectClipboard = JSON.parse(JSON.stringify(layer.effects || [])); if (FM.toast) FM.toast('Copied ' + FM.effectClipboard.length + ' effect(s)'); FM.inspector.refresh(); });
    const pa = el('button', 'fx-act', 'Paste'); pa.title = 'Append copied effects to this layer';
    pa.disabled = !(FM.effectClipboard && FM.effectClipboard.length);
    pa.addEventListener('click', () => { if (!FM.effectClipboard || !FM.effectClipboard.length) return; if (!layer.effects) layer.effects = []; FM.effectClipboard.forEach(e => layer.effects.push(JSON.parse(JSON.stringify(e)))); FM.inspector.refresh(); FM.timeline.rebuild(); FM.requestRender(); if (FM.history) FM.history.commit(); });
    addRow.appendChild(cp); addRow.appendChild(pa);
    s.appendChild(addRow);

    // saved presets: click a chip to apply, × to delete, or Save the current stack
    const presetRow = el('div', 'prop-row');
    presetRow.appendChild(el('label', null, 'Presets'));
    const pwrap = el('div', 'preset-wrap');
    const presets = FM.fxPresets.list();
    if (!presets.length) pwrap.appendChild(el('span', 'preset-empty', 'none saved'));
    presets.forEach(p => {
      const chip = el('div', 'preset-chip' + (p.builtin ? ' builtin' : ''));
      const nm = el('button', 'preset-name', p.name); nm.title = (p.builtin ? 'Built-in — apply “' : 'Apply “') + p.name + '” (' + p.effects.length + ' effect' + (p.effects.length === 1 ? '' : 's') + ')';
      nm.addEventListener('click', () => { if (!layer.effects) layer.effects = []; p.effects.forEach(e => layer.effects.push(JSON.parse(JSON.stringify(e)))); FM.inspector.refresh(); FM.timeline.rebuild(); FM.requestRender(); if (FM.history) FM.history.commit(); });
      chip.appendChild(nm);
      if (!p.builtin) {   // built-in starters aren't removable
        const del = el('button', 'preset-del', '×'); del.title = 'Delete this preset';
        del.addEventListener('click', () => { FM.fxPresets.remove(p.name); FM.inspector.refresh(); });
        chip.appendChild(del);
      }
      pwrap.appendChild(chip);
    });
    const sv = el('button', 'fx-act', 'Save…'); sv.title = 'Save this effect stack as a reusable preset';
    sv.disabled = !(layer.effects && layer.effects.length);
    sv.addEventListener('click', () => { const name = prompt('Preset name:', 'My look'); if (!name || !name.trim()) return; FM.fxPresets.save(name.trim(), layer.effects); if (FM.toast) FM.toast('Saved preset “' + name.trim() + '”'); FM.inspector.refresh(); });
    pwrap.appendChild(sv);
    presetRow.appendChild(pwrap);
    s.appendChild(presetRow);

    (layer.effects || []).forEach((fx, idx) => {
      const def = FM.EFFECTS.find(e => e.type === fx.type) || { label: fx.type, param: 'amount', min: 0, max: 2, step: 0.05, def: 1 };
      const row = el('div', 'fx-row' + (fx.enabled === false ? ' fx-off' : ''));
      const head = el('div', 'fx-head');
      const en = el('button', 'fx-toggle' + (fx.enabled === false ? '' : ' on'), '●');
      en.title = fx.enabled === false ? 'Effect off — click to enable' : 'Effect on — click to disable';
      en.addEventListener('click', () => { fx.enabled = !(fx.enabled !== false); FM.inspector.refresh(); FM.timeline.rebuild(); FM.requestRender(); if (FM.history) FM.history.commit(); });
      head.appendChild(en);
      head.appendChild(el('span', 'fx-name', def.label));
      if (!def.options) {   // discrete-mode effects aren't keyframeable
        const kfP = fx.params[def.param];
        const kfb = el('button', 'kf-btn' + (FM.isAnimated(kfP) ? ' active' : '') + (FM.hasKeyframeAt(kfP, FM.time) ? ' here' : ''), '◆');
        kfb.title = FM.isAnimated(kfP) ? 'Keyframe at playhead (click to remove)' : 'Animate this effect — adds a keyframe at the playhead';
        kfb.addEventListener('click', () => { FM.toggleProp(fx.params, def.param, FM.time, def.def); FM.inspector.refresh(); FM.timeline.rebuild(); FM.requestRender(); commitH(); });
        head.appendChild(kfb);
      }
      if ((layer.effects || []).length > 1) {   // reorder — effect order changes the composite
        const e = layer.effects;
        const up = el('button', 'fx-mv' + (idx === 0 ? ' dis' : ''), '▲'); up.title = 'Move effect up';
        up.addEventListener('click', () => { if (idx > 0) { const x = e[idx - 1]; e[idx - 1] = e[idx]; e[idx] = x; FM.inspector.refresh(); FM.requestRender(); if (FM.history) FM.history.commit(); } });
        const dn = el('button', 'fx-mv' + (idx === e.length - 1 ? ' dis' : ''), '▼'); dn.title = 'Move effect down';
        dn.addEventListener('click', () => { if (idx < e.length - 1) { const x = e[idx + 1]; e[idx + 1] = e[idx]; e[idx] = x; FM.inspector.refresh(); FM.requestRender(); if (FM.history) FM.history.commit(); } });
        head.appendChild(up); head.appendChild(dn);
      }
      const rm = el('button', 'fx-rm', '×'); rm.title = 'Remove effect';
      rm.addEventListener('click', () => { layer.effects.splice(idx, 1); FM.inspector.refresh(); FM.timeline.rebuild(); FM.requestRender(); if (FM.history) FM.history.commit(); });
      head.appendChild(rm);
      row.appendChild(head);

      if (def.options) {   // discrete-mode effect (e.g. Mirror direction) → dropdown
        const mr2 = el('div', 'prop-row');
        const msel = document.createElement('select');
        def.options.forEach(opt => { const o = document.createElement('option'); o.value = opt[0]; o.textContent = opt[1]; if ((fx.params[def.param] || 0) == opt[0]) o.selected = true; msel.appendChild(o); });
        msel.addEventListener('change', () => { fx.params[def.param] = parseFloat(msel.value); FM.requestRender(); if (FM.history) FM.history.commit(); });
        mr2.appendChild(msel); row.appendChild(mr2);
      } else {
        const sr = el('div', 'fx-slider');
        const range = document.createElement('input'); range.type = 'range';
        range.min = def.min; range.max = def.max; range.step = def.step;
        const cur = fx.params[def.param];
        range.value = FM.isAnimated(cur) ? FM.evalProp(cur, FM.time) : ((typeof cur === 'number') ? cur : def.def);
        const val = el('span', 'fx-val', (Math.round(range.value * 100) / 100) + (def.unit || ''));
        range.addEventListener('input', () => { FM.setProp(fx.params, def.param, parseFloat(range.value), FM.time); val.textContent = (Math.round(range.value * 100) / 100) + (def.unit || ''); FM.requestRender(); });
        range.addEventListener('change', () => { if (FM.history) FM.history.commit(); });
        sr.appendChild(range); sr.appendChild(val);
        row.appendChild(sr);
      }

      if (def.color) {
        const cr = el('div', 'prop-row');
        cr.appendChild(el('label', null, def.colorLabel || 'Color'));
        cr.appendChild(colorField(() => fx.params.color || '#ffffff', v => { fx.params.color = v; }));
        row.appendChild(cr);
      }
      if (def.color2) {
        const cr2 = el('div', 'prop-row');
        cr2.appendChild(el('label', null, def.color2Label || 'Color 2'));
        cr2.appendChild(colorField(() => fx.params.color2 || '#ffffff', v => { fx.params.color2 = v; }));
        row.appendChild(cr2);
      }
      s.appendChild(row);
    });
    return s;
  }

  // ===== Alight Motion property-category model =====
  let view = 'home';
  let lastLayerId = null;

  // Order mirrors Alight Motion's property menu (Color & Fill leads, Move & Transform 4th, Effects last).
  const CATEGORIES = [
    { key: 'color', label: 'Color & Fill', icon: 'M12 3a9 9 0 1 0 9 9c0-1.1-.9-2-2-2h-1.5a2 2 0 0 1 0-4H19a2 2 0 0 0 2-2c0-2-4-3-9-3z' },
    { key: 'border', label: 'Border & Shadow', icon: 'M4 4h12v12H4zM9 20h11V9' },
    { key: 'blend', label: 'Blending & Opacity', icon: 'M9 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12M15 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12' },
    { key: 'transform', label: 'Move & Transform', icon: 'M12 2v20M2 12h20M8 5l4-3 4 3M8 19l4 3 4-3M5 8l-3 4 3 4M19 8l3 4-3 4' },
    { key: 'element', label: 'Element Properties', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8v4l3 2' },
    { key: 'effects', label: 'Effects', icon: 'M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M19 5l-3.5 3.5M8.5 15.5L5 19' },
  ];

  const FONTS = ['Inter, sans-serif', 'Helvetica, Arial, sans-serif', 'Georgia, serif', 'Times New Roman, serif', 'Courier New, monospace', 'Impact, sans-serif', 'Verdana, sans-serif', 'Trebuchet MS, sans-serif', 'Palatino, serif', 'Comic Sans MS, cursive'];

  function svgIcon(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + path + '"/></svg>';
  }

  function layerHeader(layer) {
    const h = el('div', 'insp-head');
    const thumb = document.createElement('canvas'); thumb.className = 'insp-thumb'; thumb.width = 46; thumb.height = 30;
    FM.renderThumb(layer, thumb);
    const name = document.createElement('input'); name.className = 'insp-name'; name.type = 'text'; name.value = layer.name;
    name.addEventListener('input', () => { layer.name = name.value; FM.layersPanel.refresh(); FM.timeline.rebuild(); });
    name.addEventListener('change', commitH);
    const dup = document.createElement('button'); dup.className = 'insp-del'; dup.title = 'Duplicate layer (Cmd+D)';
    dup.innerHTML = svgIcon('M9 9h11v11H9zM5 15H4V4h11v1');
    dup.addEventListener('click', () => FM.duplicateLayer(layer.id));
    const del = document.createElement('button'); del.className = 'insp-del'; del.title = 'Delete layer';
    del.innerHTML = svgIcon('M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13');
    del.addEventListener('click', () => FM.deleteLayer(layer.id));
    h.append(thumb, name, dup, del);
    return h;
  }

  // AM-style property quick-row: fast toggles between the header and the category grid.
  function quickRow(layer) {
    const row = el('div', 'quick-row');
    const P = FM.scene.project;
    function qbtn(title, icon, on, fn) {
      const b = el('button', 'qr-btn' + (on ? ' on' : '')); b.title = title; b.innerHTML = svgIcon(icon);
      b.addEventListener('click', fn); return b;
    }
    const after = () => { FM.requestRender(); FM.inspector.refresh(); if (FM.canvasEdit) FM.canvasEdit.update(); commitH(); };
    row.appendChild(qbtn('Center horizontally', 'M12 4v16M7 9l-3 3 3 3M17 9l3 3-3 3', false, () => { FM.setTransform(layer, 'x', Math.round(P.width / 2), FM.time); after(); }));
    row.appendChild(qbtn('Center vertically', 'M4 12h16M9 7l3-3 3 3M9 17l3 3 3-3', false, () => { FM.setTransform(layer, 'y', Math.round(P.height / 2), FM.time); after(); }));
    row.appendChild(qbtn('Reset scale & rotation', 'M3 12a9 9 0 1 0 2.6-6.3M3 4v4h4', false, () => { FM.setTransform(layer, 'scale', 1, FM.time); FM.setTransform(layer, 'rotation', 0, FM.time); after(); }));
    row.appendChild(qbtn(layer.locked ? 'Unlock layer' : 'Lock layer', 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z', !!layer.locked, () => { layer.locked = !layer.locked; FM.layersPanel.refresh(); FM.timeline.rebuild(); FM.inspector.refresh(); commitH(); }));
    if (layer.type === 'video') {
      const muted = (layer.volume || 0) <= 0;
      row.appendChild(qbtn(muted ? 'Unmute' : 'Mute', muted ? 'M11 5 6 9H3v6h3l5 4zM17 9l4 6M21 9l-4 6' : 'M11 5 6 9H3v6h3l5 4zM16 8.5a4 4 0 0 1 0 7', muted, () => {
        if ((layer.volume || 0) > 0) { layer._lastVol = layer.volume; layer.volume = 0; } else { layer.volume = layer._lastVol != null ? layer._lastVol : 1; }
        const m = FM.media.get(layer.id); if (m && m.el) m.el.volume = layer.volume;
        FM.inspector.refresh(); commitH();
      }));
    }
    return row;
  }

  function alignRow() {
    const n = FM.selectionIds().length;
    const wrap = el('div', 'align-row');
    wrap.appendChild(el('div', 'align-label', 'Align ' + n + ' layers'));
    const bar = el('div', 'quick-row');
    function ab(title, icon, fn) { const b = el('button', 'qr-btn'); b.title = title; b.innerHTML = svgIcon(icon); b.addEventListener('click', fn); bar.appendChild(b); }
    ab('Align left', 'M4 4v16M8 9h9M8 15h5', () => FM.alignLayers('left'));
    ab('Align centre (H)', 'M12 4v16M7 9h10M9 15h6', () => FM.alignLayers('hcenter'));
    ab('Align right', 'M20 4v16M7 9h9M12 15h5', () => FM.alignLayers('right'));
    ab('Align top', 'M4 4h16M9 8v9M15 8v5', () => FM.alignLayers('top'));
    ab('Align middle (V)', 'M4 12h16M9 7v10M15 9v6', () => FM.alignLayers('vcenter'));
    ab('Align bottom', 'M4 20h16M9 7v9M15 12v5', () => FM.alignLayers('bottom'));
    if (n >= 3) {
      ab('Distribute horizontally', 'M4 4v16M20 4v16M12 9v6', () => FM.distributeLayers('h'));
      ab('Distribute vertically', 'M4 4h16M4 20h16M9 12h6', () => FM.distributeLayers('v'));
    }
    wrap.appendChild(bar);
    return wrap;
  }

  function catsFor(layer) {   // a camera only pans/zooms/rotates — hide categories that can't apply
    if (layer.type === 'camera') return CATEGORIES.filter(c => c.key === 'transform');
    return CATEGORIES;
  }
  function categoryGrid(layer) {
    const wrap = el('div', 'cat-grid');
    catsFor(layer).forEach(cat => {
      const card = el('button', 'cat-card');
      card.innerHTML = '<span class="cat-ico">' + svgIcon(cat.icon) + '</span><span class="cat-label">' + cat.label + '</span>';
      card.addEventListener('click', () => { view = cat.key; FM.inspector.refresh(); });
      wrap.appendChild(card);
    });
    return wrap;
  }

  function gradientControls(layer, body) {
    if (!layer.fillGradient) layer.fillGradient = { enabled: false, type: 'linear', angle: 90, c0: '#3a7bd5', c1: '#0a0c10' };
    const g = layer.fillGradient;
    body.appendChild(checkRow('Gradient fill', g.enabled, v => { g.enabled = v; FM.requestRender(); FM.inspector.refresh(); }));
    if (!g.enabled) return;
    const tr = el('div', 'prop-row'); tr.appendChild(el('label', null, 'Gradient'));
    const tsel = document.createElement('select');
    [['linear', 'Linear'], ['radial', 'Radial']].forEach(p => { const o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; if (p[0] === g.type) o.selected = true; tsel.appendChild(o); });
    tsel.addEventListener('change', () => { g.type = tsel.value; FM.requestRender(); FM.inspector.refresh(); commitH(); });
    tr.appendChild(tsel); body.appendChild(tr);
    if (g.type === 'linear') body.appendChild(rangeRow('Angle', () => g.angle, v => { g.angle = v; }, 0, 360, 1));
    [['Color 1', 'c0', '#3a7bd5'], ['Color 2', 'c1', '#0a0c10']].forEach(pair => {
      const r = el('div', 'prop-row'); r.appendChild(el('label', null, pair[0]));
      r.appendChild(colorField(() => g[pair[1]] || pair[2], v => { g[pair[1]] = v; }));
      body.appendChild(r);
    });
  }

  function buildCategory(key, layer, body) {
    if (key === 'transform') {
      body.appendChild(el('div', 'insp-hint', '◆ Click a diamond to animate a property, then move the playhead and change the value to drop the next keyframe.'));
      const isCam = layer.type === 'camera';
      body.appendChild(transformRow(layer, 'x', isCam ? 'Pan X' : 'Position X', { step: 1 }));
      body.appendChild(transformRow(layer, 'y', isCam ? 'Pan Y' : 'Position Y', { step: 1 }));
      body.appendChild(transformRow(layer, 'scale', isCam ? 'Zoom' : 'Scale', { step: 0.01, dp: 3, slider: { min: 0, max: 3, step: 0.01 } }));
      body.appendChild(transformRow(layer, 'rotation', 'Rotation', { step: 1, slider: { min: -180, max: 180, step: 1 } }));
      if (!isCam) body.appendChild(transformRow(layer, 'opacity', 'Opacity', { step: 0.01, dp: 2, slider: { min: 0, max: 1, step: 0.01 } }));   // camera isn't rasterized → no opacity
      if (layer.type !== 'text' && !isCam) {
        // Anchor point = the rotation/scale pivot. Compensate position so moving it doesn't shift the layer (AM behaviour).
        body.appendChild(el('div', 'insp-sub-label', 'Anchor point (pivot)'));
        const bumpPos = (key, dw) => {
          const p = layer.transform[key];
          if (typeof p === 'number') layer.transform[key] = p + dw;
          else if (FM.isAnimated(p)) FM.setProp(layer.transform, key, FM.evalProp(p, FM.time) + dw, FM.time);   // animated → drop/update kf at playhead
        };
        const setAnchor = (axisKey, v) => {
          const sz = FM.layerSize(layer), sc = FM.evalProp(layer.transform.scale, FM.time) || 1;
          const rot = FM.evalProp(layer.transform.rotation, FM.time) * Math.PI / 180;
          const d = v - (layer.transform[axisKey] != null ? layer.transform[axisKey] : 0.5);
          // local compensation vector (rotate into world so a rotated layer still stays put)
          const lx = axisKey === 'anchorX' ? sz.w * d * sc : 0, ly = axisKey === 'anchorY' ? sz.h * d * sc : 0;
          const cos = Math.cos(rot), sin = Math.sin(rot);
          bumpPos('x', lx * cos - ly * sin);
          bumpPos('y', lx * sin + ly * cos);
          layer.transform[axisKey] = v;
          if (FM.canvasEdit) FM.canvasEdit.update();
        };
        body.appendChild(rangeRow('Anchor X', () => layer.transform.anchorX != null ? layer.transform.anchorX : 0.5, v => setAnchor('anchorX', v), 0, 1, 0.01));
        body.appendChild(rangeRow('Anchor Y', () => layer.transform.anchorY != null ? layer.transform.anchorY : 0.5, v => setAnchor('anchorY', v), 0, 1, 0.01));
      }
      const sub = el('div', 'insp-sub'); sub.appendChild(el('h4', null, 'Easing curve'));
      const geBox = el('div', 'ge-box'); sub.appendChild(geBox); body.appendChild(sub);
      if (FM.graphEditor) FM.graphEditor.mount(geBox, layer);
    } else if (key === 'blend') {
      body.appendChild(selectRow('Blend mode', layer.blendMode, FM.BLEND_MODES, v => { layer.blendMode = v; FM.requestRender(); }));
      body.appendChild(transformRow(layer, 'opacity', 'Opacity', { step: 0.01, dp: 2, slider: { min: 0, max: 1, step: 0.01 } }));
    } else if (key === 'effects') {
      const s = effectsSection(layer);
      const h4 = s.querySelector('h4'); if (h4) h4.remove();
      body.appendChild(s);
    } else if (key === 'color') {
      if (layer.type === 'text') {
        const cr = el('div', 'prop-row'); cr.appendChild(el('label', null, 'Text color'));
        cr.appendChild(colorField(() => layer.color || '#ffffff', v => { layer.color = v; }));
        body.appendChild(cr);
      }
      body.appendChild(el('div', 'insp-sub-label', 'Color Tune'));
      const cwBox = el('div', 'cw-box'); body.appendChild(cwBox);
      if (FM.colorWheel) FM.colorWheel.mount(cwBox, layer);
      if (!layer.colorGrade) layer.colorGrade = { hue: 0, sat: 1 };
      const cg = layer.colorGrade;
      if (cg.lift == null) cg.lift = 0; if (cg.gamma == null) cg.gamma = 1; if (cg.gain == null) cg.gain = 1;
      body.appendChild(el('div', 'insp-sub-label', 'Grade (lift / gamma / gain)'));
      body.appendChild(rangeRow('Lift', () => cg.lift, v => { cg.lift = v; }, -0.3, 0.3, 0.01));
      body.appendChild(rangeRow('Gamma', () => cg.gamma, v => { cg.gamma = v; }, 0.3, 3, 0.05));
      body.appendChild(rangeRow('Gain', () => cg.gain, v => { cg.gain = v; }, 0, 3, 0.02));
    } else if (key === 'border') {
      if (!layer.shadow) layer.shadow = { enabled: false, blur: 16, dx: 8, dy: 8, color: '#000000' };
      const sh = layer.shadow;
      body.appendChild(checkRow('Drop shadow', sh.enabled, v => { sh.enabled = v; FM.requestRender(); }));
      body.appendChild(rangeRow('Blur', () => sh.blur, v => { sh.blur = v; }, 0, 100, 1));
      body.appendChild(rangeRow('Offset X', () => sh.dx, v => { sh.dx = v; }, -100, 100, 1));
      body.appendChild(rangeRow('Offset Y', () => sh.dy, v => { sh.dy = v; }, -100, 100, 1));
      const cr = el('div', 'prop-row'); cr.appendChild(el('label', null, 'Color'));
      cr.appendChild(colorField(() => sh.color || '#000000', v => { sh.color = v; }));
      body.appendChild(cr);
    } else if (key === 'element') {
      body.appendChild(checkRow('Visible', layer.visible, v => { layer.visible = v; FM.requestRender(); FM.layersPanel.refresh(); }));
      // Parent picker — link this layer to inherit another layer's transform (cycles excluded).
      (function () {
        const candidates = FM.scene.layers.filter(l => l.id !== layer.id && !FM.isAncestor(FM.scene, layer.id, l.id));
        const row = el('div', 'prop-row'); row.appendChild(el('label', null, 'Parent'));
        const sel = document.createElement('select');
        const none = document.createElement('option'); none.value = ''; none.textContent = 'None'; if (!layer.parent) none.selected = true; sel.appendChild(none);
        candidates.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; if (layer.parent === c.id) o.selected = true; sel.appendChild(o); });
        sel.addEventListener('change', () => { layer.parent = sel.value || null; FM.requestRender(); FM.inspector.refresh(); if (FM.canvasEdit) FM.canvasEdit.update(); commitH(); });
        row.appendChild(sel); body.appendChild(row);
        if (layer.parent) {
          // AM parenting rotation mode: how the child responds to the parent's rotation.
          if (!layer.parentMode) layer.parentMode = 'normal';
          const mr = el('div', 'prop-row'); mr.appendChild(el('label', null, 'Link rotation'));
          const msel = document.createElement('select');
          [['normal', 'Normal'], ['locked', 'Locked (upright)'], ['weighted', 'Weighted']].forEach(p => { const o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; if (p[0] === layer.parentMode) o.selected = true; msel.appendChild(o); });
          msel.addEventListener('change', () => { layer.parentMode = msel.value; FM.requestRender(); FM.inspector.refresh(); commitH(); });
          mr.appendChild(msel); body.appendChild(mr);
          if (layer.parentMode === 'weighted') {
            if (layer.parentWeight == null) layer.parentWeight = 0.5;
            body.appendChild(rangeRow('Weight', () => layer.parentWeight, v => { layer.parentWeight = Math.max(0, Math.min(1, v)); }, 0, 1, 0.05));
          }
        }
      })();
      if (layer.type === 'text') {
        body.appendChild(textRow('Text', layer.text, v => { layer.text = v; FM.requestRender(); }));
        const fr = el('div', 'prop-row'); fr.appendChild(el('label', null, 'Font'));
        const fsel = document.createElement('select');
        FONTS.forEach(f => { const o = document.createElement('option'); o.value = f; o.textContent = f.split(',')[0]; if (f === layer.fontFamily) o.selected = true; fsel.appendChild(o); });
        fsel.addEventListener('change', () => { layer.fontFamily = fsel.value; FM.requestRender(); commitH(); });
        fr.appendChild(fsel); body.appendChild(fr);
        body.appendChild(textRow('Size', layer.fontSize, v => { const n = parseFloat(v); if (!isNaN(n) && n > 0) { layer.fontSize = n; FM.requestRender(); } }, 'number'));
        const ar = el('div', 'prop-row'); ar.appendChild(el('label', null, 'Align'));
        const aseg = el('div', 'seg');
        [['left', 'L'], ['center', 'C'], ['right', 'R']].forEach(pair => {
          const b = el('button', 'seg-btn' + (layer.align === pair[0] ? ' on' : ''), pair[1]);
          b.addEventListener('click', () => { layer.align = pair[0]; FM.requestRender(); FM.inspector.refresh(); commitH(); });
          aseg.appendChild(b);
        });
        ar.appendChild(aseg); body.appendChild(ar);
        const styr = el('div', 'prop-row'); styr.appendChild(el('label', null, 'Style'));
        const sseg = el('div', 'seg');
        const bB = el('button', 'seg-btn' + (layer.bold ? ' on' : ''), 'B'); bB.style.fontWeight = '700';
        bB.addEventListener('click', () => { layer.bold = !layer.bold; FM.requestRender(); FM.inspector.refresh(); commitH(); });
        const iB = el('button', 'seg-btn' + (layer.italic ? ' on' : ''), 'I'); iB.style.fontStyle = 'italic';
        iB.addEventListener('click', () => { layer.italic = !layer.italic; FM.requestRender(); FM.inspector.refresh(); commitH(); });
        sseg.append(bB, iB); styr.appendChild(sseg); body.appendChild(styr);
        if (layer.letterSpacing == null) layer.letterSpacing = 0;
        if (layer.lineHeight == null) layer.lineHeight = 1.15;
        body.appendChild(rangeRow('Spacing', () => layer.letterSpacing, v => { layer.letterSpacing = v; }, -10, 60, 1));
        body.appendChild(rangeRow('Line height', () => layer.lineHeight, v => { layer.lineHeight = v; }, 0.8, 2.5, 0.05));
        body.appendChild(rangeRow('Curve', () => layer.textCurve || 0, v => { layer.textCurve = v; }, -180, 180, 1));
        if (!layer.stroke) layer.stroke = { enabled: false, width: 6, color: '#000000' };
        const stk = layer.stroke;
        body.appendChild(checkRow('Outline', stk.enabled, v => { stk.enabled = v; FM.requestRender(); FM.inspector.refresh(); }));
        if (stk.enabled) {
          body.appendChild(rangeRow('Outline width', () => stk.width, v => { stk.width = v; }, 0, 40, 1));
          const sr = el('div', 'prop-row'); sr.appendChild(el('label', null, 'Outline color'));
          sr.appendChild(colorField(() => stk.color || '#000000', v => { stk.color = v; }));
          body.appendChild(sr);
        }
        gradientControls(layer, body);
        if (!layer.textAnim) layer.textAnim = { preset: 'none', unit: 'char', durIn: 0.6, durOut: 0, stagger: 0.04 };
        const an = layer.textAnim;
        const ar2 = el('div', 'prop-row'); ar2.appendChild(el('label', null, 'Animate'));
        const asel = document.createElement('select');
        [['none', 'None'], ['fade', 'Fade in'], ['fade-up', 'Fade up'], ['typewriter', 'Typewriter'], ['pop', 'Pop'], ['slide', 'Slide in']].forEach(p => { const o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; if (p[0] === an.preset) o.selected = true; asel.appendChild(o); });
        asel.addEventListener('change', () => { an.preset = asel.value; FM.requestRender(); FM.inspector.refresh(); commitH(); });
        ar2.appendChild(asel); body.appendChild(ar2);
        if (an.preset !== 'none') {
          const ur = el('div', 'prop-row'); ur.appendChild(el('label', null, 'By'));
          const usel = document.createElement('select');
          [['char', 'Character'], ['word', 'Word'], ['line', 'Line']].forEach(p => { const o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; if (p[0] === an.unit) o.selected = true; usel.appendChild(o); });
          usel.addEventListener('change', () => { an.unit = usel.value; FM.requestRender(); commitH(); });
          ur.appendChild(usel); body.appendChild(ur);
          body.appendChild(rangeRow('Duration in (s)', () => an.durIn, v => { an.durIn = Math.max(0, v); }, 0, 3, 0.05));
          body.appendChild(rangeRow('Stagger (s)', () => an.stagger, v => { an.stagger = Math.max(0, v); }, 0, 0.3, 0.01));
          body.appendChild(rangeRow('Fade out (s)', () => an.durOut, v => { an.durOut = Math.max(0, v); }, 0, 3, 0.05));
        }
        if (layer.captions && layer.captions.length) {
          body.appendChild(el('div', 'cap-title', 'Captions'));
          const capBox = el('div', 'cap-list'); body.appendChild(capBox);
          if (FM.captionsEditor) FM.captionsEditor.mount(capBox, layer);
          body.appendChild(checkRow('Caption background', !!layer.captionBg, v => { layer.captionBg = v; FM.requestRender(); }));
        } else {
          const capBtn = el('button', 'btn cap-make', '+ Use as caption track');
          capBtn.addEventListener('click', () => { layer.captions = [{ start: 0, end: 2, text: layer.text || 'Caption' }]; layer.text = ''; FM.inspector.refresh(); FM.requestRender(); commitH(); });
          body.appendChild(capBtn);
        }
      }
      if (layer.type === 'shape') {
        const P = FM.scene.project;
        const kr = el('div', 'prop-row'); kr.appendChild(el('label', null, 'Shape'));
        const ksel = document.createElement('select');
        [['rect', 'Rectangle'], ['ellipse', 'Ellipse'], ['line', 'Line'], ['polygon', 'Polygon'], ['triangle', 'Triangle'], ['star', 'Star'], ['heart', 'Heart']].forEach(p => { const o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; if (p[0] === layer.shape) o.selected = true; ksel.appendChild(o); });
        ksel.addEventListener('change', () => { layer.shape = ksel.value; FM.requestRender(); FM.inspector.refresh(); commitH(); });
        kr.appendChild(ksel); body.appendChild(kr);
        const fr = el('div', 'prop-row'); fr.appendChild(el('label', null, layer.shape === 'line' ? 'Color' : 'Fill'));
        fr.appendChild(colorField(() => layer.fill || '#3a7bd5', v => { layer.fill = v; }));
        body.appendChild(fr);
        if (layer.shape !== 'line') gradientControls(layer, body);
        body.appendChild(rangeRow('Width', () => layer.shapeW, v => { layer.shapeW = Math.max(2, v); if (FM.canvasEdit) FM.canvasEdit.update(); }, 4, Math.max(200, P.width), 1));
        body.appendChild(rangeRow('Height', () => layer.shapeH, v => { layer.shapeH = Math.max(2, v); if (FM.canvasEdit) FM.canvasEdit.update(); }, 4, Math.max(200, P.height), 1));
        if (layer.shape === 'rect') body.appendChild(rangeRow('Corner radius', () => layer.cornerRadius || 0, v => { layer.cornerRadius = Math.max(0, v); }, 0, Math.round(Math.min(layer.shapeW, layer.shapeH) / 2), 1));
        if (layer.shape === 'polygon' || layer.shape === 'star') body.appendChild(rangeRow(layer.shape === 'star' ? 'Points' : 'Sides', () => layer.sides || 5, v => { layer.sides = Math.max(3, Math.round(v)); }, 3, 12, 1));
        if (!layer.stroke) layer.stroke = { enabled: false, width: 8, color: '#ffffff' };
        const stk = layer.stroke;
        if (layer.shape === 'line') {
          body.appendChild(rangeRow('Line width', () => stk.width, v => { stk.width = Math.max(1, v); }, 1, 60, 1));
        } else {
          body.appendChild(checkRow('Stroke', stk.enabled, v => { stk.enabled = v; FM.requestRender(); FM.inspector.refresh(); }));
          if (stk.enabled) {
            body.appendChild(rangeRow('Stroke width', () => stk.width, v => { stk.width = v; }, 0, 60, 1));
            const sr = el('div', 'prop-row'); sr.appendChild(el('label', null, 'Stroke color'));
            sr.appendChild(colorField(() => stk.color || '#ffffff', v => { stk.color = v; }));
            body.appendChild(sr);
          }
        }
      }
      // Motion blur — averages sub-frames across the shutter; smears moving/rotating layers.
      if (!layer.motionBlur) layer.motionBlur = { enabled: false, shutter: 0.5, samples: 8 };
      const mb = layer.motionBlur;
      body.appendChild(checkRow('Motion blur', mb.enabled, v => { mb.enabled = v; FM.requestRender(); FM.inspector.refresh(); }));
      if (mb.enabled) {
        body.appendChild(rangeRow('Shutter', () => mb.shutter, v => { mb.shutter = Math.max(0.05, v); }, 0.1, 2, 0.05));
        body.appendChild(rangeRow('Samples', () => mb.samples, v => { mb.samples = Math.max(2, Math.round(v)); }, 2, 24, 1));
      }

      // Wiggle — procedural position jitter (no keyframes; great for handheld/shake looks).
      if (!layer.wiggle) layer.wiggle = { enabled: false, amp: 12, freq: 2 };
      const wg = layer.wiggle;
      body.appendChild(checkRow('Wiggle', wg.enabled, v => { wg.enabled = v; FM.requestRender(); FM.inspector.refresh(); }));
      if (wg.enabled) {
        body.appendChild(rangeRow('Wiggle amount', () => wg.amp, v => { wg.amp = Math.max(0, v); }, 0, 200, 1));
        body.appendChild(rangeRow('Wiggle speed', () => wg.freq, v => { wg.freq = Math.max(0.1, v); }, 0.1, 12, 0.1));
      }

      // Vector mask — clip this layer to a shape (rect / ellipse / polygon), optionally inverted.
      const maskOn = !!(layer.mask && layer.mask.enabled);
      body.appendChild(checkRow('Mask', maskOn, v => {
        if (v) {
          const sz = FM.layerSize(layer);
          layer.mask = { enabled: true, shape: 'ellipse', x: 0, y: 0, w: Math.round((sz.w || 300) * 0.7), h: Math.round((sz.h || 300) * 0.7), sides: 5, feather: 0, invert: false };
        } else if (layer.mask) { layer.mask.enabled = false; }
        FM.requestRender(); FM.inspector.refresh();
      }));
      if (maskOn) {
        const mk = layer.mask, sz = FM.layerSize(layer);
        const maxW = Math.round(Math.max(400, (sz.w || 400) * 2)), maxH = Math.round(Math.max(400, (sz.h || 400) * 2));
        const mr = el('div', 'prop-row'); mr.appendChild(el('label', null, 'Mask shape'));
        const msel = document.createElement('select');
        [['rect', 'Rectangle'], ['ellipse', 'Ellipse'], ['polygon', 'Polygon']].forEach(p => { const o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; if (p[0] === mk.shape) o.selected = true; msel.appendChild(o); });
        msel.addEventListener('change', () => { mk.shape = msel.value; FM.requestRender(); FM.inspector.refresh(); commitH(); });
        mr.appendChild(msel); body.appendChild(mr);
        body.appendChild(rangeRow('Mask X', () => mk.x || 0, v => { mk.x = v; }, -maxW, maxW, 1));
        body.appendChild(rangeRow('Mask Y', () => mk.y || 0, v => { mk.y = v; }, -maxH, maxH, 1));
        body.appendChild(rangeRow('Mask width', () => mk.w, v => { mk.w = Math.max(2, v); }, 2, maxW, 1));
        body.appendChild(rangeRow('Mask height', () => mk.h, v => { mk.h = Math.max(2, v); }, 2, maxH, 1));
        if (mk.shape === 'polygon') body.appendChild(rangeRow('Mask sides', () => mk.sides || 5, v => { mk.sides = Math.max(3, Math.round(v)); }, 3, 12, 1));
        body.appendChild(rangeRow('Feather', () => mk.feather || 0, v => { mk.feather = Math.max(0, v); }, 0, 200, 1));
        body.appendChild(checkRow('Invert mask', !!mk.invert, v => { mk.invert = v; FM.requestRender(); }));
      }
      body.appendChild(textRow('Start (s)', round(layer.start, 2), v => { layer.start = Math.max(0, parseFloat(v) || 0); FM.requestRender(); FM.timeline.rebuild(); }, 'number'));
      body.appendChild(textRow('Duration (s)', round(layer.duration, 2), v => { layer.duration = Math.max(0.1, parseFloat(v) || 0.1); FM.requestRender(); FM.timeline.rebuild(); }, 'number'));
      if (layer.type === 'video') {
        if (layer.volume == null) layer.volume = 1;
        body.appendChild(rangeRow('Volume %', () => Math.round(layer.volume * 100), v => { layer.volume = v / 100; const m = FM.media.get(layer.id); if (m && m.el) m.el.volume = layer.volume; }, 0, 100, 1));
        if (layer.fadeIn == null) layer.fadeIn = 0;
        if (layer.fadeOut == null) layer.fadeOut = 0;
        const fadeMax = Math.max(1, Math.min(10, round(layer.duration, 1)));
        body.appendChild(rangeRow('Fade in (s)', () => round(layer.fadeIn, 1), v => { layer.fadeIn = Math.max(0, v); }, 0, fadeMax, 0.1));
        body.appendChild(rangeRow('Fade out (s)', () => round(layer.fadeOut, 1), v => { layer.fadeOut = Math.max(0, v); }, 0, fadeMax, 0.1));
        if (layer.speed == null) layer.speed = 1;
        body.appendChild(rangeRow('Speed %', () => Math.round((layer.speed || 1) * 100), v => {
          const sp = Math.max(0.1, v / 100);
          const span = layer.duration * (layer.speed || 1);   // source span (invariant) → re-time clip
          layer.speed = sp;
          layer.duration = Math.max(0.1, span / sp);
          const end = layer.start + layer.duration;
          if (end > FM.scene.project.duration) FM.scene.project.duration = end;
          const m = FM.media.get(layer.id); if (m && m.el) { try { m.el.playbackRate = Math.min(16, Math.max(0.0625, sp)); } catch (e) {} }
          FM.timeline.rebuild();
        }, 25, 400, 5));
        if (layer.frameBlend == null) layer.frameBlend = false;
        body.appendChild(checkRow('Frame blend (smooth slow-mo)', layer.frameBlend, async v => {
          layer.frameBlend = v;
          if (v) await FM.ensureReverseCache(layer); else if (FM.maybeClearCache) FM.maybeClearCache(layer);
          FM.requestRender(); FM.seekVideosToTime();
        }));
        body.appendChild(checkRow('Reverse (video + audio)', layer.reversed, async v => {
          layer.reversed = v; FM.timeline.rebuild();
          if (v) await FM.ensureReverseCache(layer); else if (FM.maybeClearCache) FM.maybeClearCache(layer);
          FM.requestRender(); FM.seekVideosToTime();
        }));
      }
    }
  }

  FM.inspector = {
    init() { root = document.getElementById('inspector'); },
    openCategory(key) { view = key; this.refresh(); },
    refresh() {
      const layer = FM.selectedLayer(FM.scene);
      const title = document.querySelector('#inspector-panel .panel-title');
      root.innerHTML = '';
      if (!layer) {
        // AM model: nothing selected → show the Add menu (same one the mobile + button opens).
        // Selecting a clip swaps this for the property editor (refresh() re-runs on select).
        if (title) title.textContent = 'Add';
        if (FM.addMenu) FM.addMenu.render(root, { variant: 'panel' });
        else root.appendChild(el('div', 'empty', 'Select a layer to edit it.'));
        return;
      }
      if (title) title.textContent = 'Inspector';
      if (layer.id !== lastLayerId) { view = 'home'; lastLayerId = layer.id; }
      root.appendChild(layerHeader(layer));
      if (view === 'home') {
        root.appendChild(quickRow(layer));
        if (FM.selectionIds && FM.selectionIds().length >= 2) root.appendChild(alignRow());
        root.appendChild(categoryGrid(layer));
      } else {
        const cat = CATEGORIES.find(c => c.key === view);
        const back = el('button', 'cat-back', '‹  ' + (cat ? cat.label : 'Back'));
        back.addEventListener('click', () => { view = 'home'; FM.inspector.refresh(); });
        root.appendChild(back);
        const bodyEl = el('div', 'cat-body');
        buildCategory(view, layer, bodyEl);
        root.appendChild(bodyEl);
      }
    },
  };
})(window.FM);
