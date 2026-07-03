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
    input.addEventListener('change', () => { commitH(); if (FM.isAnimated(p)) { FM.timeline.rebuild(); FM.inspector.refresh(); } });   // show the new kf-dot/diamond
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
      range.addEventListener('change', () => { commitH(); if (FM.isAnimated(p)) { FM.timeline.rebuild(); FM.inspector.refresh(); } });   // show the new kf-dot/diamond
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

  function rangeRow(label, get, set, min, max, step, onCommit) {
    const wrap = el('div', 'prop-wrap');
    const row = el('div', 'prop-row');
    row.appendChild(el('label', null, label));
    const range = document.createElement('input'); range.type = 'range';
    range.min = min; range.max = max; range.step = step || 1; range.value = get();
    const val = el('span', 'fx-val', String(get()));
    range.addEventListener('input', () => { set(parseFloat(range.value)); val.textContent = range.value; FM.requestRender(); });
    range.addEventListener('change', () => { commitH(); if (onCommit) onCommit(); });   // onCommit fires on RELEASE (safe to rebuild the inspector here)
    row.appendChild(range); row.appendChild(val);
    wrap.appendChild(row);
    return wrap;
  }

  // Swatch + synced hex text input (type/paste/read exact colours). Renders on input, commits on change.
  function normHex(c) { c = String(c == null ? '#000000' : c).trim().toLowerCase(); let h = c.replace('#', ''); if (/^[0-9a-f]{3}$/.test(h)) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return /^[0-9a-f]{6}$/.test(h) ? '#' + h : '#000000'; }
  function addRecentColor(c) {
    c = normHex(c);
    FM.recentColors = [c].concat((FM.recentColors || []).filter(x => x !== c)).slice(0, 12);
    try { localStorage.setItem('fm.recentColors', JSON.stringify(FM.recentColors)); } catch (e) {}   // survive reload
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

  // The mutation trio every effect change must run (canvas + timeline keyframes + undo).
  function afterFx() { FM.inspector.refresh(); FM.timeline.rebuild(); FM.requestRender(); if (FM.history) FM.history.commit(); }

  // ---- LAYER presets: the whole look + its animations (AM presets), not just the effect stack.
  // Captures effects, fill/gradient/stroke/shadow/blend/grade and the transform's keyframes.
  // Position keyframes are stored as DELTAS from their first key, then re-based onto the target
  // layer's current position on apply — so a preset animates the layer from where it already is
  // instead of teleporting it to wherever the source layer lived.
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  function xyDelta(prop) {
    if (!prop || typeof prop !== 'object' || !Array.isArray(prop.kf) || !prop.kf.length) return null;
    const c = clone(prop), v0 = c.kf[0].v || 0;
    c.kf.forEach(k => { k.v = (k.v || 0) - v0; });
    return c;
  }
  function xyRebase(delta, base) {
    const c = clone(delta);
    c.kf.forEach(k => { k.v = (k.v || 0) + base; });
    return c;
  }
  // Keyframe times are ABSOLUTE project time — store them relative to the source clip's start and
  // re-anchor onto the target clip's start, or presets saved at 8s would be dead on a clip at 0s.
  function shiftKf(prop, dt) {
    if (!prop || typeof prop !== 'object' || !Array.isArray(prop.kf)) return clone(prop);
    const c = clone(prop);
    c.kf.forEach(k => { k.t = Math.max(0, (k.t || 0) + dt); });
    return c;
  }
  FM.layerPresets = {
    _key: 'fm.layerpresets',
    list() { try { return JSON.parse(localStorage.getItem(this._key) || '[]'); } catch (e) { return []; } },
    _write(arr) { try { localStorage.setItem(this._key, JSON.stringify(arr)); } catch (e) { if (FM.toast) FM.toast('Storage full — preset not saved'); } },
    save(name, layer) {
      if (!name || !layer) return;
      const tr = layer.transform || {};
      const data = {
        effects: clone(layer.effects || []),
        fill: layer.fill, fillGradient: clone(layer.fillGradient), stroke: clone(layer.stroke),
        shadow: clone(layer.shadow), blendMode: layer.blendMode, colorGrade: clone(layer.colorGrade),
        cornerRadius: layer.cornerRadius,
        transform: {
          rotation: shiftKf(tr.rotation, -(layer.start || 0)), scale: shiftKf(tr.scale, -(layer.start || 0)), opacity: shiftKf(tr.opacity, -(layer.start || 0)),
          xDelta: xyDelta(shiftKf(tr.x, -(layer.start || 0))), yDelta: xyDelta(shiftKf(tr.y, -(layer.start || 0))),
        },
      };
      const arr = this.list().filter(p => p.name !== name);
      arr.unshift({ name: name, data: data });
      this._write(arr);
    },
    apply(name, layer) {
      const p = this.list().find(x => x.name === name);
      if (!p || !layer) return;
      const d = p.data;
      layer.effects = clone(d.effects) || [];
      if (d.fill != null && layer.type === 'shape') layer.fill = d.fill;
      if (d.fillGradient !== undefined && (layer.type === 'shape' || layer.type === 'text')) layer.fillGradient = clone(d.fillGradient);
      if (d.stroke && (layer.type === 'shape' || layer.type === 'text')) layer.stroke = clone(d.stroke);
      if (d.shadow) layer.shadow = clone(d.shadow);
      if (d.blendMode) layer.blendMode = d.blendMode;
      if (d.colorGrade !== undefined) layer.colorGrade = clone(d.colorGrade);
      if (d.cornerRadius != null && layer.type === 'shape') layer.cornerRadius = d.cornerRadius;
      const tr = layer.transform, dt = d.transform || {}, t0 = layer.start || 0;
      if (dt.rotation !== undefined && dt.rotation !== null) tr.rotation = shiftKf(dt.rotation, t0);
      if (dt.scale !== undefined && dt.scale !== null) tr.scale = shiftKf(dt.scale, t0);
      if (dt.opacity !== undefined && dt.opacity !== null) tr.opacity = shiftKf(dt.opacity, t0);
      if (dt.xDelta) tr.x = shiftKf(xyRebase(dt.xDelta, FM.evalProp(tr.x, FM.time)), t0);   // relative motion from HERE, timed from the clip's start
      if (dt.yDelta) tr.y = shiftKf(xyRebase(dt.yDelta, FM.evalProp(tr.y, FM.time)), t0);
      afterFx();
      if (FM.canvasEdit) FM.canvasEdit.update();
    },
    remove(name) { this._write(this.list().filter(p => p.name !== name)); },
  };

  // AM signature control: a horizontal tick strip you drag to scrub a value, + an editable value box.
  function fxScrubber(fx, p) {
    const row = el('div', 'fx-scrub-row');
    const prec = p.step >= 1 ? 0 : (p.step >= 0.1 ? 1 : 2);
    const read = () => { const c = fx.params[p.key]; return FM.isAnimated(c) ? FM.evalProp(c, FM.time) : (typeof c === 'number' ? c : p.default); };
    // keyframe gutter (only for keyframable params)
    if (p.keyframable) {
      const c = fx.params[p.key];
      const kfb = el('button', 'fx-kf' + (FM.isAnimated(c) ? ' active' : '') + (FM.hasKeyframeAt(c, FM.time) ? ' here' : ''), '◆');
      kfb.title = FM.isAnimated(c) ? 'Keyframe at playhead (click to remove)' : 'Animate this parameter';
      kfb.addEventListener('click', () => { FM.toggleProp(fx.params, p.key, FM.time, p.default); afterFx(); });
      row.appendChild(kfb);
    } else { row.appendChild(el('span', 'fx-kf-spacer')); }
    row.appendChild(el('span', 'fx-scrub-label', p.label));
    const strip = el('div', 'fx-scrub'); strip.appendChild(el('div', 'fx-scrub-notch'));
    const valBox = el('input', 'fx-scrub-val'); valBox.type = 'text'; valBox.value = read().toFixed(prec) + (p.unit || '');
    function apply(v, commit) {
      v = Math.max(p.min, Math.min(p.max, Math.round(v / p.step) * p.step));
      FM.setProp(fx.params, p.key, v, FM.time);
      valBox.value = v.toFixed(prec) + (p.unit || '');
      FM.requestRender();
      if (commit && FM.history) FM.history.commit();
    }
    let drag = null;
    strip.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, v: read() }; try { strip.setPointerCapture(e.pointerId); } catch (err) {} e.preventDefault(); });
    strip.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x; apply(drag.v + dx * ((p.max - p.min) / 300), false); strip.style.backgroundPositionX = (-dx) + 'px'; });
    const end = () => { if (drag) { const wasAnim = FM.isAnimated(fx.params[p.key]); drag = null; strip.style.backgroundPositionX = '0px'; if (wasAnim) afterFx(); else if (FM.history) FM.history.commit(); } };   // animated param: rebuild timeline + inspector so the just-made keyframe is visible/selectable (afterFx includes commit)
    strip.addEventListener('pointerup', end); strip.addEventListener('pointercancel', end);
    valBox.addEventListener('change', () => { const v = parseFloat(valBox.value); if (!isNaN(v)) apply(v, true); else valBox.value = read().toFixed(prec) + (p.unit || ''); });
    valBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') valBox.blur(); });
    row.appendChild(strip); row.appendChild(valBox);
    return row;
  }

  // AM segmented control (e.g. Mirror direction) — no slider, no keyframe.
  function fxSegment(fx, p) {
    const row = el('div', 'fx-seg-row');
    row.appendChild(el('span', 'fx-scrub-label', p.label));
    const seg = el('div', 'fx-seg');
    p.options.forEach(opt => {
      const b = el('button', 'fx-seg-btn' + ((fx.params[p.key] || 0) == opt[0] ? ' on' : ''), opt[1]);
      b.addEventListener('click', () => { fx.params[p.key] = parseFloat(opt[0]); FM.requestRender(); FM.inspector.refresh(); if (FM.history) FM.history.commit(); });
      seg.appendChild(b);
    });
    row.appendChild(seg);
    return row;
  }

  function fxMoreMenu(layer, fx, idx, btn) {
    if (!FM.contextMenu) return;
    const r = btn.getBoundingClientRect();
    FM.contextMenu.show(Math.max(8, r.right - 170), r.bottom + 4, [
      { label: 'Reset', action: () => { const inst = FM.fxRegistry.makeInstance(fx.type); if (inst) { fx.params = inst.params; afterFx(); } } },
      { label: 'Duplicate', action: () => { const inst = FM.fxRegistry.makeInstance(fx.type); if (inst) { layer.effects.splice(idx + 1, 0, inst); afterFx(); } } },
      { sep: true },
      { label: 'Delete', danger: true, action: () => { layer.effects.splice(idx, 1); afterFx(); } },
    ]);
  }

  // Gestures on an effect row: SWIPE LEFT to delete, PRESS-HOLD then drag up/down to reorder.
  // (Replaces the old ▴▾ arrow buttons.) touch-action:pan-y lets the sheet still scroll vertically.
  function attachFxGestures(row, head, layer, fx, idx) {
    let sx = 0, sy = 0, mode = null, hold = null, rows = null, rects = null, slotH = 0, toIdx = idx, down = false;
    row._g = { moved: false };
    const clearHold = () => { if (hold) { clearTimeout(hold); hold = null; } };
    function beginReorder() {
      if (fx._expanded) return;                          // only collapsed rows reorder (uniform height) (#9)
      const list = row.parentNode; if (!list) return;
      mode = 'reorder'; row._g.moved = true;
      rows = Array.prototype.slice.call(list.children);
      rects = rows.map(r => r.getBoundingClientRect());  // measured BEFORE transforms — robust to mixed heights (#9)
      slotH = (rects[idx] ? rects[idx].height : 44) + 7;
      row.classList.add('fx-dragging');
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (_) {} }
    }
    function moveReorder(e) {
      row.style.transform = 'translateY(' + (e.clientY - sy) + 'px)';
      // drop index from the pointer vs each sibling's measured midpoint (handles expanded rows) (#9)
      let t = idx;
      for (let i = 0; i < rects.length; i++) {
        if (i === idx) continue;
        const mid = rects[i].top + rects[i].height / 2;
        if (i < idx && e.clientY < mid) t = Math.min(t, i);
        else if (i > idx && e.clientY > mid) t = Math.max(t, i);
      }
      toIdx = t;
      rows.forEach((r, i) => {
        if (i === idx) return;
        let ty = 0;
        if (idx < toIdx && i > idx && i <= toIdx) ty = -slotH;
        else if (idx > toIdx && i < idx && i >= toIdx) ty = slotH;
        r.style.transform = ty ? 'translateY(' + ty + 'px)' : '';
      });
    }
    function endReorder() {
      if (rows) rows.forEach(r => { r.style.transform = ''; r.style.transition = ''; });
      row.classList.remove('fx-dragging'); row.style.transform = '';
      const from = layer.effects ? layer.effects.indexOf(fx) : -1;   // by object, never a stale index (#16)
      if (from >= 0 && toIdx !== from) {
        const m = layer.effects.splice(from, 1)[0];
        layer.effects.splice(Math.max(0, Math.min(layer.effects.length, toIdx)), 0, m); afterFx();
      } else { FM.inspector.refresh(); }
    }
    function moveSwipe(e) {
      const dx = Math.min(0, e.clientX - sx);
      row.style.transform = 'translateX(' + dx + 'px)';
      row.classList.toggle('fx-swipe-armed', dx < -70);
    }
    function endSwipe(e) {
      if (e.clientX - sx < -70) {
        row.style.transition = 'transform .14s, opacity .14s'; row.style.transform = 'translateX(-100%)'; row.style.opacity = '0';
        setTimeout(() => { const i = layer.effects ? layer.effects.indexOf(fx) : -1; if (i >= 0) { layer.effects.splice(i, 1); afterFx(); } }, 130);   // delete the right fx by reference (#16)
      } else {
        row.style.transition = 'transform .14s'; row.style.transform = ''; row.classList.remove('fx-swipe-armed');
        setTimeout(() => { row.style.transition = ''; row._g.moved = false; }, 200);   // clear so the next tap isn't swallowed (#17)
      }
    }
    head.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;                       // let eye / disc / etc. work
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      sx = e.clientX; sy = e.clientY; mode = null; toIdx = idx; row._g.moved = false; down = true;
      try { head.setPointerCapture(e.pointerId); } catch (_) {}
      // The grip (touch-action:none) is the reliable drag handle on touch — start reorder immediately.
      // Elsewhere on the row, a still-finger press-hold also reorders (works on desktop; on a phone a
      // moving finger scrolls the sheet via pan-y, so the grip is the dependable path).
      if (e.target.closest('.fx-grip')) beginReorder();
      else hold = setTimeout(() => { if (mode === null) beginReorder(); }, 280);
    });
    head.addEventListener('pointermove', e => {
      if (!down) return;   // a mouse fires pointermove on plain HOVER (no button) — ignore it, else the row swipes itself away as the cursor passes over
      if (mode === null) {
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) + 2) { mode = 'swipe'; row._g.moved = true; clearHold(); }
        else if (Math.abs(dx) > 8 || Math.abs(dy) > 8) { clearHold(); return; }   // moved before the hold fired → it's a scroll; let the sheet pan, don't reorder (#18)
        else return;
      }
      if (mode === 'swipe') { moveSwipe(e); e.preventDefault(); }
      else if (mode === 'reorder') { moveReorder(e); e.preventDefault(); }
    });
    const finish = e => {
      if (!down) return;   // ignore stray pointerup/cancel from hover when we never started (mouse) (#swipe)
      down = false;
      clearHold();
      try { head.releasePointerCapture(e.pointerId); } catch (_) {}
      if (mode === 'swipe') endSwipe(e); else if (mode === 'reorder') endReorder();
      mode = null;
    };
    head.addEventListener('pointerup', finish);
    head.addEventListener('pointercancel', finish);
  }

  // One effect row (AM): collapsed = ▸ name … eye; expanded = ▾ name … ⋯ + delete, then its editor.
  // Reorder = press-hold + drag; delete = swipe left (see attachFxGestures).
  function fxRow(layer, fx, idx) {
    const reg = FM.fxRegistry.get(fx.type) || { label: fx.type, params: [] };
    const expanded = !!fx._expanded, off = fx.enabled === false;
    const row = el('div', 'fx-row' + (off ? ' fx-off' : '') + (expanded ? ' fx-open' : ''));
    const head = el('div', 'fx-head');
    const disc = el('button', 'fx-disc', expanded ? '▾' : '▸');
    const name = el('span', 'fx-name', reg.label);
    // a tap toggles the editor, but a swipe/reorder gesture must NOT also toggle it
    const toggle = () => { if (row._g && row._g.moved) { row._g.moved = false; return; } fx._expanded = !expanded; FM.inspector.refresh(); };
    // Tap ANYWHERE on the row header to open/close the editor — not just the ▸ arrow. The action
    // buttons (eye / ⋯ / delete) keep their own behaviour; the disc + name + empty space all toggle.
    head.addEventListener('click', (e) => { if (e.target.closest('.fx-icon-btn')) return; toggle(); });
    if (!expanded && (layer.effects || []).length > 1) head.appendChild(el('span', 'fx-grip', '⠿'));   // drag affordance (press-hold to reorder)
    head.appendChild(disc); head.appendChild(name); head.appendChild(el('span', 'fx-spacer'));
    if (expanded) {
      const more = el('button', 'fx-icon-btn', '⋯'); more.title = 'More';
      more.addEventListener('click', (ev) => fxMoreMenu(layer, fx, idx, ev.currentTarget));
      const del = el('button', 'fx-icon-btn fx-del'); del.title = 'Delete effect'; del.innerHTML = svgIcon('M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13');
      del.addEventListener('click', () => { layer.effects.splice(idx, 1); afterFx(); });
      head.appendChild(more); head.appendChild(del);
    } else {
      const eye = el('button', 'fx-icon-btn fx-eye' + (off ? ' off' : '')); eye.title = off ? 'Effect off — enable' : 'Effect on — disable';
      eye.innerHTML = svgIcon('M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6');
      eye.addEventListener('click', () => { fx.enabled = !(fx.enabled !== false); afterFx(); });
      head.appendChild(eye);
    }
    row.appendChild(head);
    attachFxGestures(row, head, layer, fx, idx);   // swipe-left = delete · press-hold + drag = reorder
    if (expanded) {
      const body = el('div', 'fx-ed-body');
      reg.params.forEach(p => {
        if (p.type === 'range') body.appendChild(fxScrubber(fx, p));
        else if (p.type === 'segment') body.appendChild(fxSegment(fx, p));
        else if (p.type === 'color') { const cr = el('div', 'prop-row'); cr.appendChild(el('label', null, p.label)); cr.appendChild(colorField(() => fx.params[p.key] || p.default, v => { fx.params[p.key] = v; })); body.appendChild(cr); }
      });
      if (!reg.params.length) body.appendChild(el('div', 'insp-hint', 'No adjustable parameters.'));
      row.appendChild(body);
    }
    return row;
  }

  function effectsSection(layer) {
    const s = section('Effects');
    const list = el('div', 'fx-list');
    (layer.effects || []).forEach((fx, idx) => list.appendChild(fxRow(layer, fx, idx)));
    s.appendChild(list);
    const add = el('button', 'fx-add-btn', '+ Add Effect');
    add.addEventListener('click', () => { if (FM.fxBrowser) FM.fxBrowser.open(layer); });
    s.appendChild(add);
    // secondary stack tools — copy / paste / save-as-preset (demoted below the add button)
    const tools = el('div', 'fx-stack-tools');
    const cp = el('button', 'fx-act', 'Copy'); cp.disabled = !(layer.effects && layer.effects.length);
    cp.addEventListener('click', () => { FM.effectClipboard = JSON.parse(JSON.stringify(layer.effects || [])); if (FM.toast) FM.toast('Copied ' + FM.effectClipboard.length + ' effect(s)'); FM.inspector.refresh(); });
    const pa = el('button', 'fx-act', 'Paste'); pa.disabled = !(FM.effectClipboard && FM.effectClipboard.length);
    pa.addEventListener('click', () => { if (!FM.effectClipboard || !FM.effectClipboard.length) return; if (!layer.effects) layer.effects = []; FM.effectClipboard.forEach(e => layer.effects.push(JSON.parse(JSON.stringify(e)))); afterFx(); });
    const sv = el('button', 'fx-act', 'Save preset…'); sv.disabled = !(layer.effects && layer.effects.length);
    sv.addEventListener('click', () => { const name = prompt('Preset name:', 'My look'); if (!name || !name.trim()) return; FM.fxPresets.save(name.trim(), layer.effects); if (FM.toast) FM.toast('Saved preset “' + name.trim() + '”'); FM.inspector.refresh(); });
    tools.appendChild(cp); tools.appendChild(pa); tools.appendChild(sv);
    s.appendChild(tools);
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
    { key: 'speed', label: 'Speed', icon: 'M4.2 16.8a8 8 0 1 1 15.6 0M12 12l4-2.5' },          // video only
    { key: 'volume', label: 'Volume', icon: 'M11 5 6 9H3v6h3l5 4zM16 8.5a4 4 0 0 1 0 7M19.5 6a8 8 0 0 1 0 12' },   // video only
    { key: 'element', label: 'Element Properties', icon: 'M4 9h7v7H4zM15 6a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7M16 14l4 6h-8z' },
    { key: 'editgroup', label: 'Edit Group', icon: 'M4 4h7v7H4zM13 13h7v7h-7zM13 7.5h3.5a1 1 0 0 1 1 1V12M11 16.5H7.5a1 1 0 0 1-1-1V12' },   // group only — opens the group's own timeline
    { key: 'presets', label: 'Presets', icon: 'M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.8 6.4 20l1.5-6.3L3 9.5 9.4 9z' },
    { key: 'effects', label: 'Effects', icon: 'M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M19 5l-3.5 3.5M8.5 15.5L5 19' },
  ];

  // Alight Motion labels its element category after the layer kind ("Edit Shape" / "Edit Text").
  function elementLabel(layer) {
    if (layer.type === 'text' || layer.type === 'caption') return 'Edit Text';
    if (layer.shape || layer.type === 'shape') return 'Edit Shape';
    return 'Element Properties';
  }

  const FONTS = ['Inter, sans-serif', 'Helvetica, Arial, sans-serif', 'Georgia, serif', 'Times New Roman, serif', 'Courier New, monospace', 'Impact, sans-serif', 'Verdana, sans-serif', 'Trebuchet MS, sans-serif', 'Palatino, serif', 'Comic Sans MS, cursive'];

  function svgIcon(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + path + '"/></svg>';
  }

  // ===== Paste Style (Alight Motion) — copy a layer, then apply chosen style aspects to another. =====
  const STYLE_CATS = [
    { key: 'color',     label: 'Color & Fill',       icon: 'M12 3a9 9 0 1 0 9 9c0-1.1-.9-2-2-2h-1.5a2 2 0 0 1 0-4H19a2 2 0 0 0 2-2c0-2-4-3-9-3z' },
    { key: 'border',    label: 'Border & Shadow',    icon: 'M4 4h12v12H4zM9 20h11V9' },
    { key: 'blend',     label: 'Blending & Opacity', icon: 'M9 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12M15 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12' },
    { key: 'transform', label: 'Move & Transform',   icon: 'M12 2v20M2 12h20M8 5l4-3 4 3M8 19l4 3 4-3M5 8l-3 4 3 4M19 8l3 4-3 4' },
    { key: 'text',      label: 'Text',               textOnly: true },
    { key: 'effects',   label: 'Effects',            icon: 'M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M19 5l-3.5 3.5M8.5 15.5L5 19' },
  ];

  // Apply the chosen style categories from a copied layer snapshot `src` onto `target`.
  function applyStyle(target, src, cats) {
    const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
    if (cats.color) {
      if (src.color != null) target.color = src.color;
      if (src.fill != null) target.fill = src.fill;
      if ('fillGradient' in src) target.fillGradient = clone(src.fillGradient);
      if ('colorGrade' in src) target.colorGrade = clone(src.colorGrade);
    }
    if (cats.border) { target.stroke = clone(src.stroke); target.shadow = clone(src.shadow); }
    if (cats.blend) {
      target.blendMode = src.blendMode || 'normal';
      if (src.transform && 'opacity' in src.transform) target.transform.opacity = clone(src.transform.opacity);
    }
    if (cats.transform && src.transform) {
      // Paste the LOOK of the transform (scale / rotation / skew / z) but keep the target's PLACEMENT
      // (x, y, anchor) and opacity — so Paste Style doesn't teleport the layer onto the source's spot.
      const tr = target.transform, t = clone(src.transform);
      ['x', 'y', 'anchorX', 'anchorY', 'opacity'].forEach(k => { t[k] = tr[k]; });
      target.transform = t;
    }
    if (cats.text && target.type === 'text' && src.type === 'text') {
      ['fontFamily', 'fontSize', 'bold', 'italic', 'align', 'letterSpacing', 'lineHeight', 'textCurve'].forEach(k => { if (k in src) target[k] = src[k]; });
      if ('textAnim' in src) target.textAnim = clone(src.textAnim);
      if (src.color != null) target.color = src.color;
    }
    if (cats.effects) {
      const fx = clone(src.effects) || [];
      target.effects = (FM.fxRegistry && FM.fxRegistry.supportsLayer) ? fx.filter(f => FM.fxRegistry.supportsLayer(f.type, target)) : fx;
    }
  }

  // The AM-style picker popup: toggle which style aspects to paste, then Paste.
  FM.openPasteStyle = function (target) {
    document.querySelectorAll('.ps-overlay').forEach(o => o.remove());   // never stack overlays (#10)
    target = target || FM.selectedLayer(FM.scene);
    const src = (FM.clipboard && FM.clipboard[0] && FM.clipboard[0].snapshot) || null;
    if (!target) { if (FM.toast) FM.toast('Select a layer to paste onto'); return; }
    if (!src) { if (FM.toast) FM.toast('Copy a layer first, then Paste Style'); return; }
    const overlay = el('div', 'ps-overlay');
    const card = el('div', 'ps-card');
    card.appendChild(el('div', 'ps-title', 'Paste Style'));
    const grid = el('div', 'ps-grid');
    const sel = {};
    STYLE_CATS.forEach(c => {
      const disabled = c.textOnly && !(target.type === 'text' && src.type === 'text');
      sel[c.key] = !disabled;
      const b = el('button', 'ps-cat' + (disabled ? ' dis' : ' on'));
      b.title = c.label;
      b.innerHTML = c.key === 'text' ? '<span class="ps-aa">Aa</span>' : svgIcon(c.icon);
      if (!disabled) b.addEventListener('click', () => { sel[c.key] = !sel[c.key]; b.classList.toggle('on', sel[c.key]); });
      grid.appendChild(b);
    });
    card.appendChild(grid);
    const foot = el('div', 'ps-foot');
    const cancel = el('button', 'ps-cancel', 'Cancel');
    const paste = el('button', 'ps-paste', 'Paste');
    const close = () => overlay.remove();
    cancel.addEventListener('click', close);
    paste.addEventListener('click', () => {
      const live = FM.layerById(FM.scene, target.id) || target;
      applyStyle(live, src, sel);
      close();
      FM.requestRender(); FM.inspector.refresh(); if (FM.timeline) FM.timeline.rebuild(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.history) FM.history.commit();
      if (FM.toast) FM.toast('Pasted style');
    });
    foot.append(cancel, paste);
    card.appendChild(foot);
    overlay.appendChild(card);
    overlay.addEventListener('pointerdown', e => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
  };

  // AM-style clip-action quick-row (matches Alight Motion's selected-layer panel):
  // speed/timing · split · trim-start-to-playhead · trim-end-to-playhead · mute.
  function quickRow(layer) {
    const row = el('div', 'quick-row');
    function qbtn(title, icon, opts, fn) {
      opts = opts || {};
      const b = el('button', 'qr-btn' + (opts.on ? ' on' : '') + (opts.disabled ? ' disabled' : ''));
      b.title = title; b.innerHTML = svgIcon(icon);
      if (opts.disabled) b.disabled = true; else b.addEventListener('click', fn);
      return b;
    }
    const after = () => { FM.requestRender(); FM.timeline.rebuild(); FM.inspector.refresh(); commitH(); };
    const onClip = FM.time > layer.start + 1e-4 && FM.time < layer.start + layer.duration - 1e-4;   // playhead inside the clip
    const goCat = k => { view = k; FM._mtEasing = false; FM._volEasing = false; FM.inspector.refresh(); };
    // AM's media row order: Speed | trim-in | trim-out | Volume. Split keeps a slot between the
    // trims (AM parks split in its timeline bar; we keep it here so it stays one tap away).
    const isVideo = layer.type === 'video';
    if (isVideo) row.appendChild(qbtn('Speed — slow-mo / reverse', 'M4.2 16.8a8 8 0 1 1 15.6 0M12 12l4-2.5', {}, () => goCat('speed')));
    // trim START to playhead (drop everything before the playhead)
    row.appendChild(qbtn('Trim start to playhead', 'M6 4v16M6 4h4M6 20h4M14 4v16', { disabled: !onClip }, () => {
      const cut = FM.time - layer.start; if (cut <= 0 || cut >= layer.duration) return;
      layer.start = FM.time; layer.duration -= cut;
      // Forward: advance the source trim by the dropped wall-time × speed. Reversed: trimStart anchors
      // the source tail, so the kept (later) span keeps the same trimStart — matches splitLayer. (#12)
      if (layer.type === 'video' && !layer.reversed) layer.trimStart = (layer.trimStart || 0) + cut * (layer.speed || 1);
      after();
    }));
    // split at playhead
    row.appendChild(qbtn('Split at playhead', 'M12 3v18M16 8l4 4-4 4M8 8l-4 4 4 4', { disabled: !onClip }, () => { FM.splitLayer(layer.id); }));
    // trim END to playhead (drop everything after the playhead)
    row.appendChild(qbtn('Trim end to playhead', 'M18 4v16M18 4h-4M18 20h-4M10 4v16', { disabled: !onClip }, () => {
      const nd = FM.time - layer.start; if (nd <= 0 || nd >= layer.duration) return;
      layer.duration = nd; after();
    }));
    // The Audio button opens the full Volume panel (which has its own mute) — no standalone mute button.
    if (isVideo) row.appendChild(qbtn('Audio — volume & fades', 'M11 5 6 9H3v6h3l5 4zM16 8.5a4 4 0 0 1 0 7', {}, () => goCat('volume')));
    return row;
  }

  function alignRow() {
    const n = FM.selectionIds().length;
    const wrap = el('div', 'align-row');
    // Group the multi-selection (AM) — the headline action for a multi-select, so it leads.
    const grp = el('button', 'fx-add-btn', '⧉ Group ' + n + ' layers');
    grp.addEventListener('click', (ev) => {
      const r = ev.currentTarget.getBoundingClientRect();
      if (FM.contextMenu) FM.contextMenu.show(r.left, r.bottom + 4, [
        { label: 'Group', action: () => FM.groupSelection() },
        { label: 'Masking Group — top layer clips the rest', action: () => FM.groupSelection({ mask: true }) },
      ]); else FM.groupSelection();
    });
    wrap.appendChild(grp);
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
    // Groups composite as a flattened unit whenever they carry a look of their own, so effects,
    // blending/opacity and presets all act on the whole group — plus the door into its own timeline.
    if (layer.type === 'group') return CATEGORIES.filter(c => ['color', 'border', 'blend', 'transform', 'editgroup', 'presets', 'effects'].indexOf(c.key) >= 0);
    // Video: Speed + Audio live in the quick-action row (not as grid cards), and there's no catch-all
    // Element card. Everything else hides Speed/Volume entirely (no audio/retiming).
    if (layer.type === 'video') return CATEGORIES.filter(c => c.key !== 'element' && c.key !== 'speed' && c.key !== 'volume' && c.key !== 'editgroup');
    return CATEGORIES.filter(c => c.key !== 'speed' && c.key !== 'volume' && c.key !== 'editgroup');
  }

  // Is `v` a category this layer can actually show? Guards against unreachable views — e.g. the timeline
  // dbl-click calling openCategory('element') on a VIDEO (which rendered a stale duplicate Volume slider
  // that DESTROYED keyframed volume), or a persisted 'volume'/'speed' view after a media replace.
  function viewAllowed(layer, v) {
    if (!layer || v === 'home') return true;
    if (v === 'speed' || v === 'volume') return layer.type === 'video';
    if (v === 'element') return layer.type !== 'video' && layer.type !== 'camera' && layer.type !== 'group';
    if (v === 'editgroup') return false;   // it's an action (enterGroup), not a panel
    return CATEGORIES.some(c => c.key === v);   // color/border/blend/transform/presets/effects apply broadly
  }
  function categoryGrid(layer) {
    // AM lays the cards out 3-then-rest: Color/Border/Blending on top, the rest in a tighter row below.
    const cats = catsFor(layer);
    const wrap = el('div', 'cat-wrap');
    const top = el('div', 'cat-grid cat-grid-top');
    const bot = el('div', 'cat-grid cat-grid-bot');
    cats.forEach((cat, i) => {
      const card = el('button', 'cat-card');
      const label = cat.key === 'element' ? elementLabel(layer) : cat.label;
      card.innerHTML = '<span class="cat-ico">' + svgIcon(cat.icon) + '</span><span class="cat-label">' + label + '</span>';
      card.addEventListener('click', () => {
        if (cat.key === 'editgroup') { if (FM.enterGroup) FM.enterGroup(layer.id); return; }   // opens the group's own timeline
        view = cat.key; FM._mtEasing = false; FM._volEasing = false; FM.inspector.refresh();
      });
      (i < 3 ? top : bot).appendChild(card);
    });
    wrap.appendChild(top);
    if (bot.children.length) wrap.appendChild(bot);
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

  // ===== Move & Transform — Alight Motion's mode-rail editor (Move / Rotate / Scale / Skew) =====
  const MT_ICONS = {
    move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/></svg>',
    rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7.5" y="7.5" width="9" height="9" rx="1.6"/><path d="M18.5 6.5a7 7 0 0 0-5-2.5"/><path d="M13.2 2.6 13.5 4l-1.4.4"/></svg>',
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6"/><path d="M9 15 15 9"/></svg>',
    skew: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5h12l-4 14H4z"/></svg>',
    ease: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19c5 0 5-14 16-14"/><circle cx="4" cy="19" r="1.4" fill="currentColor"/><circle cx="20" cy="5" r="1.4" fill="currentColor"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6"/><path d="M9 8H7a4 4 0 0 0 0 8h2"/><path d="M15 8h2a4 4 0 0 1 0 8h-2"/></svg>',
  };
  const MT_MODES = ['move', 'rotate', 'scale', 'skew'];
  const MT_TITLES = { move: 'Move', rotate: 'Rotate', scale: 'Scale', skew: 'Skew' };
  const MT_PROPS = { move: ['x', 'y', 'z'], rotate: ['rotation'], scale: ['scale', 'scaleX', 'scaleY'], skew: ['skewX', 'skewY'] };
  // The channels a mode keyframes by DEFAULT (matches Alight Motion). The extra channels (z for Move,
  // scaleX/scaleY for Scale) are only keyframed when they're actually in use — otherwise a plain
  // position/scale keyframe would needlessly animate Z / break uniform scale into non-uniform. (#17)
  const MT_PRIMARY = { move: ['x', 'y'], rotate: ['rotation'], scale: ['scale'], skew: ['skewX', 'skewY'] };
  const MT_DEF = { x: 0, y: 0, z: 0, rotation: 0, scale: 1, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 };

  function mtEval(layer, key) { const p = layer.transform[key]; return p == null ? MT_DEF[key] : FM.evalProp(p, FM.time); }
  function mtSet(layer, key, v) { FM.setTransform(layer, key, v, FM.time); FM.requestRender(); if (FM.timeline) FM.timeline.updatePlayhead(); }

  // A value box: shows the number (drag horizontally to scrub, tap to type) + a label beneath.
  function mtVBox(labelText, getVal, setVal, opts) {
    opts = opts || {}; const dp = opts.dp != null ? opts.dp : 1;
    const box = el('div', 'mt-vbox');
    const val = el('div', 'mt-vbox-val');
    const lab = el('div', 'mt-vbox-lab', labelText);
    const fmtS = () => round(getVal(), dp).toFixed(dp) + (opts.unit || '');
    const refresh = () => { if (!val.isContentEditable) val.textContent = fmtS(); };
    refresh(); box.appendChild(val); box.appendChild(lab);
    const clamp = v => { if (opts.min != null) v = Math.max(opts.min, v); if (opts.max != null) v = Math.min(opts.max, v); return v; };
    let drag = null;
    val.addEventListener('pointerdown', e => { if (val.isContentEditable) return; drag = { x: e.clientX, v: getVal(), moved: false }; try { val.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
    val.addEventListener('pointermove', e => { if (!drag) return; if (e.pointerType === 'mouse' && e.buttons === 0) { const moved = drag.moved; drag = null; if (moved) { commitH(); FM.inspector.refresh(); } return; } const dx = e.clientX - drag.x; if (Math.abs(dx) > 2) drag.moved = true; if (drag.moved) { setVal(clamp(drag.v + dx * (opts.scrub || 1))); refresh(); if (opts.onScrub) opts.onScrub(); } });
    val.addEventListener('pointerup', e => { if (!drag) return; const moved = drag.moved; drag = null; try { val.releasePointerCapture(e.pointerId); } catch (_) {} if (moved) { commitH(); FM.inspector.refresh(); } else startEdit(); });
    function startEdit() {
      val.contentEditable = 'true'; val.classList.add('editing'); val.textContent = String(round(getVal(), dp)); val.focus();
      const r = document.createRange(); r.selectNodeContents(val); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      const finish = commit => { val.removeEventListener('blur', onBlur); val.removeEventListener('keydown', onKey); val.contentEditable = 'false'; val.classList.remove('editing'); if (commit) { const n = parseFloat(val.textContent); if (!isNaN(n)) { setVal(clamp(n)); commitH(); } } refresh(); FM.inspector.refresh(); };
      const onBlur = () => finish(true);
      const onKey = e => { if (e.key === 'Enter') { e.preventDefault(); val.blur(); } else if (e.key === 'Escape') { e.preventDefault(); finish(false); } };
      val.addEventListener('blur', onBlur); val.addEventListener('keydown', onKey);
    }
    box._refresh = refresh; return box;
  }

  // A horizontal tick-strip you drag to scrub a value.
  function mtScrub(getVal, setVal, scrub, onChange) {
    const strip = el('div', 'mt-scrub'); strip.appendChild(el('div', 'mt-scrub-ticks')); strip.appendChild(el('div', 'mt-scrub-mid'));
    let drag = null;
    strip.addEventListener('pointerdown', e => { drag = { x: e.clientX, v: getVal() }; try { strip.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
    strip.addEventListener('pointermove', e => { if (!drag) return; if (e.pointerType === 'mouse' && e.buttons === 0) { drag = null; commitH(); if (onChange) onChange(); return; } setVal(drag.v + (e.clientX - drag.x) * scrub); if (onChange) onChange(); });
    strip.addEventListener('pointerup', e => { if (!drag) return; drag = null; try { strip.releasePointerCapture(e.pointerId); } catch (_) {} commitH(); if (onChange) onChange(); });
    return strip;
  }

  function moveTransformPanel(layer) {
    const mode = MT_MODES.indexOf(FM._mtMode) >= 0 ? FM._mtMode : 'move';
    const panel = el('div', 'mt-panel');
    const refreshables = [];
    const syncFns = [];   // extra redraws (dial knob, etc.) re-run when the playhead moves (#2)
    const refreshAllBoxes = () => refreshables.forEach(b => b._refresh && b._refresh());

    // left rail: keyframe + easing
    const left = el('div', 'mt-rail mt-rail-left');
    const props = MT_PROPS[mode];
    const anyAnim = props.some(k => FM.isAnimated(layer.transform[k]));
    const onHere = props.some(k => FM.hasKeyframeAt(layer.transform[k], FM.time));
    const kfBtn = el('button', 'mt-kf' + (anyAnim ? ' active' : '') + (onHere ? ' here' : ''), '◆');
    kfBtn.title = onHere ? 'Remove keyframe at playhead' : 'Add a keyframe at the playhead';
    kfBtn.addEventListener('click', () => {
      const add = !onHere;
      // Add: only the mode's primary channels + any extra channel already in use (animated or
      // moved off its default). Remove: every channel, so stray keyframes can always be cleaned up.
      const usable = add
        ? props.filter(k => MT_PRIMARY[mode].indexOf(k) >= 0 || FM.isAnimated(layer.transform[k]) || (layer.transform[k] != null && layer.transform[k] !== MT_DEF[k]))
        : props;
      usable.forEach(k => {
        if (layer.transform[k] == null) layer.transform[k] = MT_DEF[k];
        const has = FM.hasKeyframeAt(layer.transform[k], FM.time);
        if (add && !has) FM.toggleKeyframe(layer, k, FM.time);
        else if (!add && has) FM.toggleKeyframe(layer, k, FM.time);
      });
      FM.requestRender(); if (FM.timeline) FM.timeline.rebuild(); FM.inspector.refresh(); commitH();
    });
    left.appendChild(kfBtn);
    const easeBtn = el('button', 'mt-ease'); easeBtn.innerHTML = MT_ICONS.ease; easeBtn.title = 'Easing curve';
    easeBtn.addEventListener('click', () => { if (FM.openEasingCurve) FM.openEasingCurve(layer, mode); });
    left.appendChild(easeBtn);

    // center: value boxes + bespoke control per mode
    const center = el('div', 'mt-center');
    const values = el('div', 'mt-values');
    const control = el('div', 'mt-control');
    center.appendChild(values); center.appendChild(control);

    if (mode === 'move') {
      const bx = mtVBox('X', () => mtEval(layer, 'x'), v => mtSet(layer, 'x', Math.round(v)), { dp: 1, scrub: 1 });
      const by = mtVBox('Y', () => mtEval(layer, 'y'), v => mtSet(layer, 'y', Math.round(v)), { dp: 1, scrub: 1 });
      const bz = mtVBox('Z', () => mtEval(layer, 'z'), v => mtSet(layer, 'z', Math.round(v)), { dp: 1, scrub: 2 });
      refreshables.push(bx, by, bz); values.append(bx, by, bz);
      // 2D trackpad
      const pad = el('div', 'mt-trackpad'); pad.appendChild(el('span', 'mt-trackpad-hint', 'Swipe here to move layer'));
      const sens = ((FM.scene.project.width || 1080) / 300);
      let pd = null;
      pad.addEventListener('pointerdown', e => { pd = { x: e.clientX, y: e.clientY, ix: mtEval(layer, 'x'), iy: mtEval(layer, 'y') }; try { pad.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
      pad.addEventListener('pointermove', e => { if (!pd) return; if (e.pointerType === 'mouse' && e.buttons === 0) { pd = null; commitH(); return; } mtSet(layer, 'x', Math.round(pd.ix + (e.clientX - pd.x) * sens)); mtSet(layer, 'y', Math.round(pd.iy + (e.clientY - pd.y) * sens)); refreshAllBoxes(); if (FM.canvasEdit) FM.canvasEdit.update(); });
      pad.addEventListener('pointerup', e => { if (!pd) return; pd = null; try { pad.releasePointerCapture(e.pointerId); } catch (_) {} commitH(); });
      control.appendChild(pad);
    } else if (mode === 'rotate') {
      const brot = mtVBox('Rotation', () => mtEval(layer, 'rotation'), v => mtSet(layer, 'rotation', v), { dp: 0, unit: '°', scrub: 0.5 });
      refreshables.push(brot); values.appendChild(brot);
      const dial = el('div', 'mt-dial'); const ring = el('div', 'mt-dial-ring'); const knob = el('div', 'mt-dial-knob'); const read = el('div', 'mt-dial-read');
      ring.appendChild(knob); dial.appendChild(ring); dial.appendChild(read);
      const place = () => { const deg = mtEval(layer, 'rotation'); const rad = deg * Math.PI / 180; knob.style.left = (50 + Math.cos(rad) * 50) + '%'; knob.style.top = (50 + Math.sin(rad) * 50) + '%'; read.textContent = Math.round(deg) + '°'; };
      place(); syncFns.push(place);
      const ang = e => { const r = ring.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
      let rd = null;
      ring.addEventListener('pointerdown', e => { rd = { a: ang(e), v: mtEval(layer, 'rotation'), acc: 0 }; try { ring.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
      // Accumulate the angle incrementally, normalising each step into (-180,180], so dragging the
      // knob past the ±180° seam (9 o'clock) advances smoothly instead of snapping a full turn. (#3)
      ring.addEventListener('pointermove', e => { if (!rd) return; if (e.pointerType === 'mouse' && e.buttons === 0) { rd = null; commitH(); return; } const a = ang(e); let d = a - rd.a; d -= 360 * Math.round(d / 360); rd.acc += d; rd.a = a; mtSet(layer, 'rotation', Math.round(rd.v + rd.acc)); place(); brot._refresh(); if (FM.canvasEdit) FM.canvasEdit.update(); });
      ring.addEventListener('pointerup', e => { if (!rd) return; rd = null; try { ring.releasePointerCapture(e.pointerId); } catch (_) {} commitH(); });
      control.appendChild(dial);
    } else if (mode === 'scale') {
      const sz = FM.layerSize(layer);
      const effX = () => mtEval(layer, 'scale') * (layer.transform.scaleX != null ? mtEval(layer, 'scaleX') : 1);
      const effY = () => mtEval(layer, 'scale') * (layer.transform.scaleY != null ? mtEval(layer, 'scaleY') : 1);
      const link = FM._mtLink !== false;
      const setW = px => { const f = px / Math.max(1, sz.w); if (link) { mtSet(layer, 'scale', f); if (layer.transform.scaleX != null) mtSet(layer, 'scaleX', 1); if (layer.transform.scaleY != null) mtSet(layer, 'scaleY', 1); } else mtSet(layer, 'scaleX', f / Math.max(1e-4, mtEval(layer, 'scale'))); };
      const setH = px => { const f = px / Math.max(1, sz.h); if (link) { mtSet(layer, 'scale', f); if (layer.transform.scaleX != null) mtSet(layer, 'scaleX', 1); if (layer.transform.scaleY != null) mtSet(layer, 'scaleY', 1); } else mtSet(layer, 'scaleY', f / Math.max(1e-4, mtEval(layer, 'scale'))); };
      const bw = mtVBox('Width', () => sz.w * effX(), setW, { dp: 1, scrub: 1, min: 0, onScrub: () => { if (FM.canvasEdit) FM.canvasEdit.update(); } });
      const bh = mtVBox('Height', () => sz.h * effY(), setH, { dp: 1, scrub: 1, min: 0, onScrub: () => { if (FM.canvasEdit) FM.canvasEdit.update(); } });
      const linkBtn = el('button', 'mt-link' + (link ? ' on' : '')); linkBtn.innerHTML = MT_ICONS.link; linkBtn.title = link ? 'Aspect ratio linked' : 'Aspect ratio unlinked';
      linkBtn.addEventListener('click', () => { FM._mtLink = !link; FM.inspector.refresh(); });
      refreshables.push(bw, bh); values.append(bw, linkBtn, bh);
      control.appendChild(mtScrub(() => mtEval(layer, 'scale'), v => mtSet(layer, 'scale', Math.max(0.01, v)), 0.01, () => { refreshAllBoxes(); if (FM.canvasEdit) FM.canvasEdit.update(); }));
    } else if (mode === 'skew') {
      const bsx = mtVBox('X Skew', () => mtEval(layer, 'skewX'), v => mtSet(layer, 'skewX', v), { dp: 2, unit: '°', scrub: 0.2, min: -80, max: 80 });
      const bsy = mtVBox('Y Skew', () => mtEval(layer, 'skewY'), v => mtSet(layer, 'skewY', v), { dp: 2, unit: '°', scrub: 0.2, min: -80, max: 80 });
      refreshables.push(bsx, bsy); values.append(bsx, bsy);
      control.classList.add('mt-control-dual');
      control.appendChild(mtScrub(() => mtEval(layer, 'skewX'), v => mtSet(layer, 'skewX', Math.max(-80, Math.min(80, v))), 0.2, () => bsx._refresh()));
      control.appendChild(mtScrub(() => mtEval(layer, 'skewY'), v => mtSet(layer, 'skewY', Math.max(-80, Math.min(80, v))), 0.2, () => bsy._refresh()));
    }

    // right rail: mode buttons
    const right = el('div', 'mt-rail mt-rail-right');
    MT_MODES.forEach(m => { const b = el('button', 'mt-mode' + (m === mode ? ' on' : '')); b.innerHTML = MT_ICONS[m]; b.title = MT_TITLES[m]; b.addEventListener('click', () => { FM._mtMode = m; FM.inspector.refresh(); }); right.appendChild(b); });

    panel.append(left, center, right);
    // Expose a cheap "redraw values from the current playhead" hook the playback/seek paths call
    // (via updateReadout). No-ops once this panel is detached, so a stale closure can't fight a
    // newer one. Value boxes already skip refresh while being typed into. (#2)
    FM.inspector.syncTransform = () => { if (!document.contains(panel)) return; refreshAllBoxes(); syncFns.forEach(fn => { try { fn(); } catch (_) {} }); };
    return panel;
  }

  // Parent picker (moved out of the old Element Properties so it lives with the transform it controls).
  function parentControl(layer) {
    const wrap = el('div', 'parent-ctl');
    const candidates = FM.scene.layers.filter(l => l.id !== layer.id && !FM.isAncestor(FM.scene, layer.id, l.id));
    const row = el('div', 'prop-row'); row.appendChild(el('label', null, 'Parent'));
    const sel = document.createElement('select');
    const none = document.createElement('option'); none.value = ''; none.textContent = 'None'; if (!layer.parent) none.selected = true; sel.appendChild(none);
    candidates.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; if (layer.parent === c.id) o.selected = true; sel.appendChild(o); });
    sel.addEventListener('change', () => { layer.parent = sel.value || null; FM.requestRender(); FM.inspector.refresh(); if (FM.canvasEdit) FM.canvasEdit.update(); commitH(); });
    row.appendChild(sel); wrap.appendChild(row);
    if (layer.parent) {
      if (!layer.parentMode) layer.parentMode = 'normal';
      const mr = el('div', 'prop-row'); mr.appendChild(el('label', null, 'Link rotation'));
      const msel = document.createElement('select');
      [['normal', 'Normal'], ['locked', 'Locked (upright)'], ['weighted', 'Weighted']].forEach(p => { const o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; if (p[0] === layer.parentMode) o.selected = true; msel.appendChild(o); });
      msel.addEventListener('change', () => { layer.parentMode = msel.value; FM.requestRender(); FM.inspector.refresh(); commitH(); });
      mr.appendChild(msel); wrap.appendChild(mr);
      if (layer.parentMode === 'weighted') {
        if (layer.parentWeight == null) layer.parentWeight = 0.5;
        wrap.appendChild(rangeRow('Weight', () => layer.parentWeight, v => { layer.parentWeight = Math.max(0, Math.min(1, v)); }, 0, 1, 0.05));
      }
    }
    return wrap;
  }

  // ===== Volume panel — keyframeable audio level + easing (AM-style left rail: ◆ + curve) =====
  function volumePanel(layer) {
    if (layer.volume == null) layer.volume = 1;
    const panel = el('div', 'mt-panel vol-panel');
    const volPct = () => Math.round((layer.volume == null ? 1 : FM.evalProp(layer.volume, FM.time)) * 100);   // raw level (mute is a separate flag, shown on the speaker)
    const setPct = pct => {
      const f = Math.max(0, Math.min(1, pct / 100));
      FM.setProp(layer, 'volume', f, FM.time);            // keyframe-aware (writes a kf when animated)
      const m = FM.media.get(layer.id); if (m && m.el) m.el.volume = f;
      FM.requestRender(); if (FM.reconcileAudio) FM.reconcileAudio();
    };

    // left rail: ◆ keyframe + easing-curve button
    const left = el('div', 'mt-rail mt-rail-left');
    const anim = FM.isAnimated(layer.volume), onHere = FM.hasKeyframeAt(layer.volume, FM.time);
    const kfBtn = el('button', 'mt-kf' + (anim ? ' active' : '') + (onHere ? ' here' : ''), '◆');
    kfBtn.title = onHere ? 'Remove volume keyframe at playhead' : 'Keyframe the volume at the playhead';
    kfBtn.addEventListener('click', () => { FM.toggleProp(layer, 'volume', FM.time, 1); FM.requestRender(); if (FM.timeline) FM.timeline.rebuild(); FM.inspector.refresh(); commitH(); });
    left.appendChild(kfBtn);
    const easeBtn = el('button', 'mt-ease'); easeBtn.innerHTML = MT_ICONS.ease; easeBtn.title = 'Volume easing curve';
    easeBtn.addEventListener('click', () => { FM._volEasing = true; FM.inspector.refresh(); });
    left.appendChild(easeBtn);

    // center: value box + big slider + fades
    const center = el('div', 'mt-center');
    const values = el('div', 'mt-values');
    const control = el('div', 'mt-control vol-control');
    center.append(values, control);
    const vbox = mtVBox('Volume', volPct, v => setPct(Math.round(v)), { dp: 0, unit: '%', scrub: 1, min: 0, max: 100 });
    values.appendChild(vbox);

    const srow = el('div', 'vol-slider-row');
    const mute = el('button', 'vol-mute');
    const muteIcon = () => { const m = !!layer.muted || volPct() <= 0; mute.classList.toggle('on', m); mute.innerHTML = svgIcon(m ? 'M11 5 6 9H3v6h3l5 4zM17 9l4 6M21 9l-4 6' : 'M11 5 6 9H3v6h3l5 4zM16 8.5a4 4 0 0 1 0 7'); };
    muteIcon();
    const slider = document.createElement('input'); slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '1'; slider.value = String(volPct()); slider.className = 'vol-slider';
    const paint = () => { const p = volPct(); slider.style.background = 'linear-gradient(90deg, var(--accent) ' + p + '%, var(--line) ' + p + '%)'; };
    paint();
    const sync = () => { slider.value = String(volPct()); if (vbox._refresh) vbox._refresh(); muteIcon(); paint(); };
    slider.addEventListener('input', () => { setPct(parseFloat(slider.value) || 0); if (vbox._refresh) vbox._refresh(); muteIcon(); paint(); });
    slider.addEventListener('change', () => commitH());
    // Mute is a whole-clip flag (FM.layerVolume returns 0 when set) — NOT a 0-keyframe at the playhead,
    // so it works the same whether or not volume is animated. The slider still shows the real level.
    mute.addEventListener('click', () => { layer.muted = !layer.muted; if (FM.reconcileAudio) FM.reconcileAudio(); FM.requestRender(); muteIcon(); commitH(); });
    srow.append(mute, slider);
    control.appendChild(srow);

    if (layer.fadeIn == null) layer.fadeIn = 0; if (layer.fadeOut == null) layer.fadeOut = 0;
    const fmax = Math.max(1, Math.min(10, round(layer.duration, 1)));
    control.appendChild(rangeRow('Fade in (s)', () => round(layer.fadeIn, 1), v => { layer.fadeIn = Math.max(0, v); if (FM.reconcileAudio) FM.reconcileAudio(); }, 0, fmax, 0.1));
    control.appendChild(rangeRow('Fade out (s)', () => round(layer.fadeOut, 1), v => { layer.fadeOut = Math.max(0, v); if (FM.reconcileAudio) FM.reconcileAudio(); }, 0, fmax, 0.1));

    panel.append(left, center);
    // follow the playhead when volume is keyframed
    FM.inspector.syncTransform = () => { if (!document.contains(panel)) return; sync(); };
    return panel;
  }

  function buildCategory(key, layer, body) {
    if (key === 'transform') {
      body.appendChild(moveTransformPanel(layer));
      if (layer.type !== 'camera') body.appendChild(parentControl(layer));   // parenting lives with the transform it inherits (the camera ignores a parent) (#11)
    } else if (key === 'volume') {
      body.appendChild(volumePanel(layer));
    } else if (key === 'speed') {
      if (layer.speed == null) layer.speed = 1;
      body.appendChild(rangeRow('Speed %', () => Math.round((layer.speed || 1) * 100), v => {
        const sp = Math.max(0.1, v / 100);
        const span = layer.duration * (layer.speed || 1);   // source span is invariant → re-time the clip
        layer.speed = sp;
        layer.duration = Math.max(0.1, span / sp);
        const end = layer.start + layer.duration;
        if (end > FM.scene.project.duration) FM.scene.project.duration = end;
        const m = FM.media.get(layer.id); if (m && m.el) { try { m.el.playbackRate = Math.min(16, Math.max(0.0625, sp)); } catch (e) {} }
        FM.timeline.rebuild();
      }, 25, 400, 5, () => FM.inspector.refresh()));
      if (layer.frameBlend == null) layer.frameBlend = false;
      body.appendChild(checkRow('Smooth slow-motion (frame blend)', layer.frameBlend, async v => {
        layer.frameBlend = v;
        if (v) await FM.ensureReverseCache(layer); else if (FM.maybeClearCache) FM.maybeClearCache(layer);
        FM.requestRender(); FM.seekVideosToTime();
      }));
      body.appendChild(el('div', 'insp-hint', 'Frame blend interpolates new in-between frames so slowed-down clips look fluid instead of stuttery.'));
      body.appendChild(checkRow('Reverse (video + audio)', layer.reversed, async v => {
        layer.reversed = v; FM.timeline.rebuild();
        if (v) await FM.ensureReverseCache(layer); else if (FM.maybeClearCache) FM.maybeClearCache(layer);
        FM.requestRender(); FM.seekVideosToTime();
      }));
    } else if (key === 'blend') {
      body.appendChild(selectRow('Blend mode', layer.blendMode, FM.BLEND_MODES, v => { layer.blendMode = v; FM.requestRender(); }));
      body.appendChild(transformRow(layer, 'opacity', 'Opacity', { step: 0.01, dp: 2, slider: { min: 0, max: 1, step: 0.01 } }));
    } else if (key === 'presets') {
      body.appendChild(el('div', 'insp-hint', 'Tap a preset to apply its look, or save the current effect stack as a reusable preset.'));
      const pwrap = el('div', 'preset-wrap');
      // LAYER presets first (look + animations — the AM-style ones saved via “Save Preset”)
      const lps = FM.layerPresets.list();
      if (lps.length) pwrap.appendChild(el('div', 'preset-sec', 'My presets'));
      lps.forEach(p => {
        const chip = el('div', 'preset-chip');
        const nm = el('button', 'preset-name', p.name);
        nm.title = 'Apply “' + p.name + '” — look + animations';
        nm.addEventListener('click', () => { FM.layerPresets.apply(p.name, layer); if (FM.toast) FM.toast('Applied “' + p.name + '”'); });
        chip.appendChild(nm);
        const del = el('button', 'preset-del', '×'); del.title = 'Delete this preset';
        del.addEventListener('click', () => { FM.layerPresets.remove(p.name); FM.inspector.refresh(); });
        chip.appendChild(del);
        pwrap.appendChild(chip);
      });
      const svL = el('button', 'fx-act', 'Save this layer as preset…');
      svL.addEventListener('click', () => FM.savePresetPrompt && FM.savePresetPrompt(layer));
      pwrap.appendChild(svL);
      pwrap.appendChild(el('div', 'preset-sec', 'Effect looks'));
      FM.fxPresets.list().forEach(p => {
        const fx = Array.isArray(p.effects) ? p.effects : [];
        const chip = el('div', 'preset-chip' + (p.builtin ? ' builtin' : ''));
        const nm = el('button', 'preset-name', p.name);
        nm.title = (p.builtin ? 'Built-in — apply “' : 'Apply “') + p.name + '” (' + fx.length + ' effect' + (fx.length === 1 ? '' : 's') + ')';
        // A preset is a saved LOOK → REPLACE the stack (not append), so re-tapping never stacks duplicates.
        nm.addEventListener('click', () => { layer.effects = fx.map(e => JSON.parse(JSON.stringify(e))); FM.inspector.refresh(); FM.timeline.rebuild(); FM.requestRender(); if (FM.history) FM.history.commit(); if (FM.toast) FM.toast('Applied “' + p.name + '”'); });
        chip.appendChild(nm);
        if (!p.builtin) { const del = el('button', 'preset-del', '×'); del.title = 'Delete this preset'; del.addEventListener('click', () => { FM.fxPresets.remove(p.name); FM.inspector.refresh(); }); chip.appendChild(del); }
        pwrap.appendChild(chip);
      });
      const sv = el('button', 'fx-act', 'Save current effects…'); sv.disabled = !(layer.effects && layer.effects.length);
      sv.addEventListener('click', () => { const name = prompt('Preset name:', 'My look'); if (!name || !name.trim()) return; FM.fxPresets.save(name.trim(), layer.effects); if (FM.toast) FM.toast('Saved preset “' + name.trim() + '”'); FM.inspector.refresh(); });
      pwrap.appendChild(sv);
      body.appendChild(pwrap);
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
      if (layer.type === 'group') {   // border = outline traced around the group's composited silhouette
        if (!layer.stroke) layer.stroke = { enabled: false, width: 6, color: '#ffffff' };
        const stk = layer.stroke;
        body.appendChild(checkRow('Border', stk.enabled, v => { stk.enabled = v; FM.requestRender(); }));
        body.appendChild(rangeRow('Border width', () => stk.width, v => { stk.width = Math.max(1, Math.min(16, v)); }, 1, 16, 1));
        const bc = el('div', 'prop-row'); bc.appendChild(el('label', null, 'Border color'));
        bc.appendChild(colorField(() => stk.color || '#ffffff', v => { stk.color = v; }));
        body.appendChild(bc);
      }
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
      // (Visible → timeline eye; Parent → Move & Transform. The old Visible/Parent rows were removed
      // here so this "Edit Shape / Edit Text" panel stays focused and fits without scrolling.)
      if (false) (function () {
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
        [['rect', 'Rectangle'], ['ellipse', 'Ellipse'], ['line', 'Line'], ['arc', 'Arc'], ['polygon', 'Polygon'], ['triangle', 'Triangle'], ['star', 'Star'], ['heart', 'Heart'], ['plus', 'Plus'], ['pie', 'Pie'], ['semicircle', 'Semicircle'], ['ring', 'Ring'], ['arrow', 'Arrow'], ['chevron', 'Chevron'], ['trapezoid', 'Trapezoid'], ['parallelogram', 'Parallelogram']].forEach(p => { const o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; if (p[0] === layer.shape) o.selected = true; ksel.appendChild(o); });
        ksel.addEventListener('change', () => { layer.shape = ksel.value; FM.requestRender(); FM.inspector.refresh(); commitH(); });
        // a drawn path keeps its 'path' kind (not in the dropdown) — swapping kinds would discard its points
        if (layer.shape !== 'path') { kr.appendChild(ksel); body.appendChild(kr); }
        const openStroke = (layer.shape === 'line' || layer.shape === 'arc' || (layer.shape === 'path' && !layer.closed));   // stroked, never filled
        const fr = el('div', 'prop-row'); fr.appendChild(el('label', null, openStroke ? 'Color' : 'Fill'));
        fr.appendChild(colorField(() => layer.fill || '#3a7bd5', v => { layer.fill = v; }));
        body.appendChild(fr);
        if (!openStroke) gradientControls(layer, body);
        body.appendChild(rangeRow('Width', () => layer.shapeW, v => { layer.shapeW = Math.max(2, v); if (FM.canvasEdit) FM.canvasEdit.update(); }, 4, Math.max(200, P.width), 1));
        body.appendChild(rangeRow('Height', () => layer.shapeH, v => { layer.shapeH = Math.max(2, v); if (FM.canvasEdit) FM.canvasEdit.update(); }, 4, Math.max(200, P.height), 1));
        if (layer.shape === 'rect') body.appendChild(rangeRow('Corner radius', () => layer.cornerRadius || 0, v => { layer.cornerRadius = Math.max(0, v); }, 0, Math.round(Math.min(layer.shapeW, layer.shapeH) / 2), 1));
        if (layer.shape === 'polygon' || layer.shape === 'star') body.appendChild(rangeRow(layer.shape === 'star' ? 'Points' : 'Sides', () => layer.sides || 5, v => { layer.sides = Math.max(3, Math.round(v)); }, 3, 12, 1));
        if (!layer.stroke) layer.stroke = { enabled: false, width: 8, color: '#ffffff' };
        const stk = layer.stroke;
        if (openStroke) {
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
      // (The old video Volume/Fade/Speed/Reverse rows were removed — video uses the dedicated Volume &
      // Speed panels from the quick-row, and that legacy Volume slider was NOT keyframe-aware: it would
      // overwrite a {kf} volume with a number and destroy the animation. Video never opens 'element' now.)
    }
  }

  FM.inspector = {
    init() {
      root = document.getElementById('inspector');
      try { const rc = JSON.parse(localStorage.getItem('fm.recentColors') || '[]'); if (Array.isArray(rc)) FM.recentColors = rc; } catch (e) {}   // hydrate persisted recents
    },
    openCategory(key) { const layer = FM.selectedLayer(FM.scene); view = viewAllowed(layer, key) ? key : 'home'; FM._mtEasing = false; FM._volEasing = false; this.refresh(); },
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
      if (layer.id !== lastLayerId) { view = 'home'; lastLayerId = layer.id; FM._mtEasing = false; FM._volEasing = false; }
      if (view !== 'home' && !viewAllowed(layer, view)) { view = 'home'; FM._mtEasing = false; FM._volEasing = false; }   // a category that doesn't apply to this layer (e.g. after a media replace) → drop to the grid
      // The old header row (thumbnail + name + duplicate + delete) is gone: the thumbnail lives on
      // the timeline, duplicate is on the transport row, delete moved to the top bar, and rename is
      // now the top-bar name field. So the inspector goes straight to the actions.
      if (view === 'home') {
        root.appendChild(quickRow(layer));
        if (FM.selectionIds && FM.selectionIds().length >= 2) root.appendChild(alignRow());
        root.appendChild(categoryGrid(layer));
      } else if (view === 'transform' && FM._mtEasing && FM.buildEasingEditor) {
        // Easing curve editor — an INLINE sub-view of Move & Transform (same sheet), not a screen.
        const back = el('button', 'cat-back', '‹  Move & Transform');
        back.addEventListener('click', () => { FM._mtEasing = false; FM.inspector.refresh(); });
        root.appendChild(back);
        const bodyEl = el('div', 'cat-body');
        bodyEl.appendChild(FM.buildEasingEditor(layer, FM._mtMode || 'move'));
        root.appendChild(bodyEl);
      } else if (view === 'volume' && FM._volEasing && FM.buildEasingEditorFor) {
        // Volume easing curve — inline sub-view of the Volume panel.
        const back = el('button', 'cat-back', '‹  Volume');
        back.addEventListener('click', () => { FM._volEasing = false; FM.inspector.refresh(); });
        root.appendChild(back);
        const bodyEl = el('div', 'cat-body');
        bodyEl.appendChild(FM.buildEasingEditorFor(layer, () => layer.volume, ['volume'], 'volume'));
        root.appendChild(bodyEl);
      } else {
        const cat = CATEGORIES.find(c => c.key === view);
        const back = el('button', 'cat-back', '‹  ' + (cat ? cat.label : 'Back'));
        back.addEventListener('click', () => { view = 'home'; FM._mtEasing = false; FM._volEasing = false; FM.inspector.refresh(); });
        root.appendChild(back);
        const bodyEl = el('div', 'cat-body');
        buildCategory(view, layer, bodyEl);
        root.appendChild(bodyEl);
      }
    },
  };
})(window.FM);
