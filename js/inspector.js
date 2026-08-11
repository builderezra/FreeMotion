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
    wrap.append(sw, hex);
    // Eyedropper — sample a colour straight off the rendered frame (works on iOS, unlike EyeDropper()).
    if (FM.eyedropper) {
      const drop = el('button', 'eyedrop-btn');
      drop.type = 'button'; drop.title = 'Pick a colour from the video';
      drop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 3a2.1 2.1 0 0 1 0 3l-1.5 1.5 2 2L9 20l-5 1 1-5 10.5-10.5-1.5-1.5A2.1 2.1 0 0 1 16 2.5"/><path d="M14.5 6.5l3 3"/></svg>';
      drop.addEventListener('click', () => FM.eyedropper.pick(c => { apply(c); hex.value = normHex(c); commitColor(); FM.inspector.refresh(); }));
      wrap.appendChild(drop);
    }
    cont.appendChild(wrap);
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

  // Effect-stack presets — the user's own saved stacks only (localStorage, reusable across projects).
  // The four shipped starters (VHS Glitch / Duotone / Dreamy / Comic) are GONE (Ezra: "in the presets
  // menu remove the effects in there, like dreamy and shit"). They existed to showcase the effects
  // back when there were a few dozen; with 177 of them and a browser that groups and searches, four
  // fixed looks were just clutter you could not delete sitting on top of the presets you made.
  FM.fxPresets = {
    _key: 'fm.fxpresets',
    builtins: [],
    saved() { try { return JSON.parse(localStorage.getItem(this._key) || '[]'); } catch (e) { return []; } },
    list() { return this.builtins.concat(this.saved()); },
    _write(arr) { try { localStorage.setItem(this._key, JSON.stringify(arr)); } catch (e) { } },
    save(name, effects) { if (!name) return; const arr = this.saved().filter(p => p.name !== name); arr.push({ name: name, effects: JSON.parse(JSON.stringify(effects || [], FM.jsonReplacer)) }); this._write(arr); },   // jsonReplacer strips _expanded etc. from presets
    get(name) { return this.list().find(p => p.name === name); },
    remove(name) { this._write(this.saved().filter(p => p.name !== name)); }   // built-ins are not removable
  };

  // Copy/paste for ONE effect (v5.39, Ezra: "in the three dots for each effect, add options to copy
  // effect and paste effect"). Kept in localStorage rather than a variable, because the point of
  // copying an effect is usually to put it on a layer in a DIFFERENT project — a page-lifetime
  // clipboard would be empty exactly when you got there.
  //
  // Copies carry the live params, which means they carry keyframes: an animated parameter IS a
  // channel object sitting in fx.params[key], so the deep clone takes the animation with it. That is
  // the same reason Duplicate clones instead of building a fresh default instance.
  FM.fxClipboard = {
    _key: 'fm.fxclip',
    copy(fx) {
      // jsonReplacer drops the runtime '_' props — without it the clipboard carries _expanded, and a
      // pasted effect arrives with its editor already open, shoving the stack around.
      try { localStorage.setItem(this._key, JSON.stringify(fx, FM.jsonReplacer)); return true; }
      catch (e) { return false; }
    },
    read() {
      try {
        const fx = JSON.parse(localStorage.getItem(this._key) || 'null');
        // A type that no longer exists (older build, renamed effect) would paste a row that renders
        // nothing and cannot be edited — treat it as an empty clipboard.
        if (!fx || !fx.type || !FM.fxRegistry.get(fx.type)) return null;
        return fx;
      } catch (e) { return null; }
    },
    label() { const fx = this.read(); if (!fx) return null; const reg = FM.fxRegistry.get(fx.type); return (reg && reg.label) || fx.type; }
  };

  /* A reorder that has JUST finished (v5.56). Ezra: "if I only have two effects and I try to drag the
     top one down it just closes the menu." The per-row `_g.moved` flag was supposed to swallow the
     click that follows a drag — but dropping calls afterFx(), which REBUILDS every row, so by the time
     the click arrives its handler belongs to a brand new row whose flag is false. The accordion then
     toggled and the editor you were dragging shut itself. A module-level timestamp survives the
     rebuild; the flag never could. */
  let _fxReorderAt = 0;
  const _justReordered = () => (performance.now() - _fxReorderAt) < 400;

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
        fill: layer.fill, fillMode: layer.fillMode, fillOpacity: layer.fillOpacity, fillImage: layer.fillImage, fillImgX: clone(layer.fillImgX), fillImgY: clone(layer.fillImgY), fillGradient: clone(layer.fillGradient), stroke: clone(layer.stroke),
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
      if (d.fillMode != null && (layer.type === 'shape' || layer.type === 'text')) layer.fillMode = d.fillMode;
      if (d.fillOpacity != null) layer.fillOpacity = d.fillOpacity;
      if (d.fillImage !== undefined && layer.type === 'shape') { if (d.fillImage) layer.fillImage = d.fillImage; else delete layer.fillImage; }
      if (d.fillImage !== undefined && layer.type === 'shape') ['fillImgX', 'fillImgY'].forEach(k => { if (d[k] !== undefined) layer[k] = clone(d[k]); });
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

  // ===== AM-style ruler scrubber (ONE implementation shared by fxScrubber + kfNumRow) =====
  // A FINITE ruler of tick notches (one per TICK px) scrolls under the fixed green centre line.
  // Notches are REAL snap points: a drag lands on min + n*q (like timeline frame-snap — typed values
  // in the box stay free-form), and the ruler physically ends at min/max so a drag can never leave
  // the range. White marker lines flag notable values: the min/max walls, midpoint, zero, the
  // param's default, and every 45° for angle params.
  const TICK = 7;   // px of drag = one notch; keep in sync with the 7px gradient period in styles.css
  function tickQuantum(min, max, step, unit) {
    // Notch quantum q: the param's step, unless that means >120 notches — then coarsen to a "nice"
    // 1/2/5×10^k giving ≤100 notches. q is always an integer multiple of step so snaps stay legal.
    const span = max - min;
    if (!(step > 0)) step = span > 0 ? span / 100 : 1;
    if (!(span > 0) || span / step <= 120) return step;
    const legal = q => { const m = q / step; return m >= 1 - 1e-6 && Math.abs(m - Math.round(m)) < 1e-6; };
    const snap = q => Math.round(q / step) * step;
    if (unit === '°') { for (const q of [1, 5, 15, 45]) if (legal(q) && span / q <= 120) return snap(q); }   // divisors of 45 keep the 45° landmarks landable
    for (let k = -3; k <= 6; k++) for (const m of [1, 2, 5]) { const q = m * Math.pow(10, k); if (legal(q) && span / q <= 100) return snap(q); }
    return Math.ceil(span / 100 / step) * step;
  }
  // o: { min, max, step, unit, dflt, read(), apply(v), release() }. Returns the strip; strip._sync(v)
  /* ---- momentum, shared by every push-the-ruler control -------------------------------------
   * A flick keeps travelling and eases out, the way the timeline's scrub does. A slow deliberate
   * drag stops dead where you let go — fine placement matters more than flourish, and a control that
   * drifts after you release it is unusable for setting an exact number.
   * Written once and attached to both scrubbers (the effect/keyframe ruler and the Move & Transform
   * pad) so they cannot drift apart in feel. (Ezra: "every slider should have a level of glide like
   * how the timeline works".)
   *   applyDx(dx)  apply dx SCREEN px; return false when the value refused to move (hit its end), so
   *                the glide dies at the wall instead of spinning against it.
   *   onSettle()   called once when the whole gesture finishes — one history entry per gesture.
   */
  const GLIDE_MIN_FLICK = 0.6;    // px/ms — below this it was a positioning drag, not a flick
  const GLIDE_MAX_V = 2.5;        // a hard flick travels a long way, not forever
  function attachGlide(node, applyDx, onSettle) {
    let drag = null, raf = 0;
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    const settle = () => { if (onSettle) onSettle(); };
    node.addEventListener('pointerdown', e => {
      stop();                                        // a fresh grab kills any in-flight glide
      drag = { lastX: e.clientX, lastT: e.timeStamp, v: 0 };
    });
    node.addEventListener('pointermove', e => {
      if (!drag) return;
      const dt = e.timeStamp - drag.lastT, dx = e.clientX - drag.lastX;
      if (dt > 0) drag.v = drag.v * 0.35 + (dx / dt) * 0.65;   // px/ms, smoothed the way the timeline smooths its scrub
      drag.lastX = e.clientX; drag.lastT = e.timeStamp;
    });
    const release = () => {
      if (!drag) return;
      let v = Math.max(-GLIDE_MAX_V, Math.min(GLIDE_MAX_V, isFinite(drag.v) ? drag.v : 0));
      drag = null;
      if (Math.abs(v) < GLIDE_MIN_FLICK) { settle(); return; }
      let last = performance.now();
      const step = (now) => {
        // The panel rebuilds constantly (refresh, category change, deselect), which detaches this
        // control while its glide is still in flight — and its closures would go on writing to the
        // old layer's property from something nobody can see. Die with the element.
        if (!node.isConnected) { raf = 0; settle(); return; }
        const dt = Math.min(48, now - last); last = now;
        v *= Math.pow(0.9, dt / 16.67);                          // same friction as the timeline's momentum
        const alive = applyDx(v * dt);
        if (alive && Math.abs(v) > 0.008) raf = requestAnimationFrame(step);
        else { raf = 0; settle(); }
      };
      raf = requestAnimationFrame(step);
    };
    node.addEventListener('pointerup', release);
    node.addEventListener('pointercancel', () => { if (!drag) return; drag = null; settle(); });   // OS-cancelled → settle where it is, never glide
    return { stop: stop, cancelDrag: () => { drag = null; } };
  }

  // re-scrolls the ruler (call after a typed value).
  function tickStrip(o) {
    const strip = el('div', 'fx-scrub');
    const q = tickQuantum(o.min, o.max, o.step, o.unit);
    const ruler = el('div', 'fx-scrub-ticks');
    ruler.style.width = ((o.max - o.min) / q) * TICK + 'px';
    const marks = [];
    const mark = (v, isEnd) => {
      if (v == null || isNaN(v) || v < o.min - 1e-9 || v > o.max + 1e-9) return;
      for (let i = 0; i < marks.length; i++) if (Math.abs(marks[i].v - v) < q / 2) { if (isEnd) marks[i].end = true; return; }   // de-dup coinciding markers
      marks.push({ v: v, end: !!isEnd });
    };
    mark(o.min, true); mark(o.max, true);                       // the walls
    mark((o.min + o.max) / 2);                                  // midpoint
    if (o.min < 0 && o.max > 0) mark(0);
    mark(o.dflt);                                               // the param's default
    if (o.unit === '°') for (let a = Math.ceil(o.min / 45) * 45; a <= o.max + 1e-9; a += 45) mark(a);
    marks.forEach(m => { const d = el('div', 'fx-scrub-mark' + (m.end ? ' end' : '')); d.style.left = ((m.v - o.min) / q) * TICK + 'px'; ruler.appendChild(d); });
    strip.appendChild(ruler); strip.appendChild(el('div', 'fx-scrub-notch'));
    const sync = v => { ruler.style.transform = 'translateX(' + (-((v - o.min) / q) * TICK) + 'px)'; };
    sync(o.read());
    let drag = null, cur = o.read(), lastApplied = null;
    // Push dx SCREEN px through the ruler. `cur` carries the un-quantised position so a slow drag or a
    // decaying glide accumulates sub-notch movement instead of losing it to rounding every frame.
    // REVERSED (AM): you grab the ruler and push it — drag LEFT to raise the value (a right-side tick
    // slides under the fixed centre line), drag RIGHT to lower it, hence the minus.
    const applyDx = (dx) => {
      const before = cur;
      cur = Math.max(o.min, Math.min(o.max, cur - dx * q / TICK));
      const v = Math.max(o.min, Math.min(o.max, o.min + Math.round((cur - o.min) / q) * q));   // land ON a notch (the grid can overshoot an off-grid max)
      if (v !== lastApplied) { lastApplied = v; o.apply(v); sync(v); }
      return Math.abs(cur - before) > 1e-9;   // false at a wall → the glide stops rather than spinning
    };
    const glide = attachGlide(strip, applyDx, () => { o.release(); });
    strip.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX };
      cur = o.read(); lastApplied = null;          // re-read: the value may have been typed or keyframed since
      try { strip.setPointerCapture(e.pointerId); } catch (err) {} e.preventDefault();
    });
    const end = () => { if (drag) { drag = null; glide.cancelDrag(); o.release(); } };
    // buttons===0 guard: if the pointerup was swallowed (capture lost, DOM rebuilt mid-drag), a plain
    // hover would otherwise KEEP scrubbing.
    strip.addEventListener('pointermove', (e) => {
      if (!drag) return; if (e.pointerType === 'mouse' && e.buttons === 0) return end();
      const dx = e.clientX - drag.x; drag.x = e.clientX;
      if (dx) applyDx(dx);
    });
    strip.addEventListener('pointerup', () => { drag = null; });   // attachGlide's own pointerup starts the glide and settles
    strip.addEventListener('pointercancel', end); strip.addEventListener('lostpointercapture', end);
    strip._sync = sync;
    return strip;
  }

  // AM signature control: the ruler scrubber + an editable value box.
  function fxScrubber(fx, p, layer, fxIdx) {
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
    // easing curve for THIS parameter's keyframes (every effect param eases, like Move & Transform)
    if (p.keyframable && fxIdx != null) {
      const eb = el('button', 'fx-ease');
      eb.innerHTML = MT_ICONS.ease; eb.title = 'Easing curve — ' + p.label;
      eb.addEventListener('click', () => { FM._fxEasing = { fxIdx: fxIdx, key: p.key, label: p.label }; FM.inspector.refresh(); });
      row.appendChild(eb);
    }
    // The NAME selects the row (AM): tap it and this parameter's keyframes become the live ones on
    // the timeline. Only offered where it can mean something — kfScope covers the OPEN effect of the
    // Effects panel, so audio-effect rows (which share this builder) render a plain label.
    row.appendChild(paramName('fx-scrub-label', p.label, layer, 'fx:' + p.key));
    const valBox = el('input', 'fx-scrub-val'); valBox.type = 'text'; valBox.value = read().toFixed(prec) + (p.unit || '');
    function apply(v, commit) {
      v = Math.max(p.min, Math.min(p.max, Math.round(v / p.step) * p.step));
      FM.setProp(fx.params, p.key, v, FM.time);
      valBox.value = v.toFixed(prec) + (p.unit || '');
      FM.requestRender();
      if (commit && FM.history) FM.history.commit();
    }
    const strip = tickStrip({
      min: p.min, max: p.max, step: p.step, unit: p.unit, dflt: p.default, read: read,
      apply: v => apply(v, false),
      // animated param: rebuild timeline + inspector so the just-made keyframe is visible/selectable (afterFx includes commit)
      release: () => { if (FM.isAnimated(fx.params[p.key])) afterFx(); else if (FM.history) FM.history.commit(); },
    });
    valBox.addEventListener('change', () => { const v = parseFloat(valBox.value); if (!isNaN(v)) { apply(v, true); strip._sync(read()); } else valBox.value = read().toFixed(prec) + (p.unit || ''); });
    valBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') valBox.blur(); });
    row.appendChild(strip); row.appendChild(valBox);
    return row;
  }

  // AM segmented control (e.g. Mirror direction) — no slider, no keyframe.
  // A tick box for a param that switches a whole behaviour on, rather than picking between two equal
  // options. `note` explains what it does to the controls under it — which is the point of using a
  // tick box here at all: a segmented control implies "one of these two", a tick implies "this takes over".
  function fxToggle(fx, p) {
    const on = !!(fx.params[p.key] == null ? p.default : fx.params[p.key]);
    const row = el('div', 'fx-tog-row' + (on ? ' on' : ''));
    const btn = el('button', 'fx-tog');
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', String(on));
    btn.innerHTML = '<span class="fx-tog-box">' + (on ? '<span class="fx-tog-tick"></span>' : '') + '</span>' +
                    '<span class="fx-tog-label"></span>';
    btn.querySelector('.fx-tog-label').textContent = p.label;
    btn.addEventListener('click', () => {
      fx.params[p.key] = on ? 0 : 1;
      FM.requestRender(); FM.inspector.refresh(); if (FM.history) FM.history.commit();
    });
    row.appendChild(btn);
    if (p.note) { const n = el('div', 'fx-tog-note'); n.textContent = p.note; row.appendChild(n); }
    return row;
  }

  function fxSegment(fx, p) {
    const row = el('div', 'fx-seg-row');
    row.appendChild(el('span', 'fx-scrub-label', p.label));
    const seg = el('div', 'fx-seg');
    // An ABSENT param is not the same as 0. It renders at the effect's own fallback — `legacy` when
    // the schema declares one (an old instance keeps its original look), otherwise the default. The
    // old `|| 0` also swallowed a legitimately-selected 0, so option 0 could never light up.
    const cur = fx.params[p.key] != null ? fx.params[p.key]
      : (p.legacy != null ? p.legacy : (p.default != null ? p.default : 0));
    p.options.forEach(opt => {
      const b = el('button', 'fx-seg-btn' + (cur == opt[0] ? ' on' : ''), String(opt[1]));
      b.addEventListener('click', () => {
        const v = parseFloat(opt[0]);
        fx.params[p.key] = isNaN(v) ? opt[0] : v;   // never write NaN — it reads back as "not this option, and not any other"
        FM.requestRender(); FM.inspector.refresh(); if (FM.history) FM.history.commit();
      });
      seg.appendChild(b);
    });
    row.appendChild(seg);
    return row;
  }

  // Keyframe-aware rows for ANY container+key (border/shadow reuse the fxScrubber diamond machinery so
  // the ◆ toggles a keyframe, the value animates via FM.evalProp/setProp, and the timeline shows ticks).
  function afterKf() { commitH(); if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild(); FM.inspector.refresh(); }
  function kfNumRow(container, key, label, min, max, step, dflt, unit) {
    unit = unit || '';
    const row = el('div', 'fx-scrub-row');
    const prec = step >= 1 ? 0 : (step >= 0.1 ? 1 : 2);
    const read = () => { const c = container[key]; return FM.isAnimated(c) ? FM.evalProp(c, FM.time) : (typeof c === 'number' ? c : dflt); };
    const c0 = container[key];
    const kfb = el('button', 'fx-kf' + (FM.isAnimated(c0) ? ' active' : '') + (FM.hasKeyframeAt(c0, FM.time) ? ' here' : ''), '◆');
    kfb.title = FM.isAnimated(c0) ? 'Keyframe at playhead (click to remove)' : 'Animate this';
    kfb.addEventListener('click', () => { FM.toggleProp(container, key, FM.time, dflt); afterKf(); });
    row.appendChild(kfb);
    row.appendChild(el('span', 'fx-scrub-label', label));
    const valBox = el('input', 'fx-scrub-val'); valBox.type = 'text'; valBox.value = read().toFixed(prec) + unit;
    function apply(v, commit) {
      v = Math.max(min, Math.min(max, Math.round(v / step) * step));
      FM.setProp(container, key, v, FM.time);
      valBox.value = v.toFixed(prec) + unit;
      FM.requestRender();
      if (commit && FM.history) FM.history.commit();
    }
    const strip = tickStrip({
      min: min, max: max, step: step, unit: unit, dflt: dflt, read: read,
      apply: v => apply(v, false),
      release: () => { if (FM.isAnimated(container[key])) afterKf(); else if (FM.history) FM.history.commit(); },
    });
    valBox.addEventListener('change', () => { const v = parseFloat(valBox.value); if (!isNaN(v)) { apply(v, true); strip._sync(read()); } else valBox.value = read().toFixed(prec) + unit; });
    valBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') valBox.blur(); });
    row.appendChild(strip); row.appendChild(valBox);
    return row;
  }
  // kfNumRow's twin for props the compositor reads as a 0..1 fraction but users think of as 0..100%:
  // disp is the display-per-stored factor (100 = show a 0..1 value as a percent). min/max/step/dflt/unit
  // are all in DISPLAY units; the stored keyframe value stays a clean fraction so the engine reads 0..1.
  function kfScaledRow(container, key, label, min, max, step, dflt, unit, disp) {
    unit = unit || ''; disp = disp || 1;
    const row = el('div', 'fx-scrub-row');
    const prec = step >= 1 ? 0 : (step >= 0.1 ? 1 : 2);
    const read = () => { const c = container[key]; return (FM.isAnimated(c) ? FM.evalProp(c, FM.time) : (typeof c === 'number' ? c : dflt / disp)) * disp; };
    const c0 = container[key];
    const kfb = el('button', 'fx-kf' + (FM.isAnimated(c0) ? ' active' : '') + (FM.hasKeyframeAt(c0, FM.time) ? ' here' : ''), '◆');
    kfb.title = FM.isAnimated(c0) ? 'Keyframe at playhead (click to remove)' : 'Animate this';
    kfb.addEventListener('click', () => { FM.toggleProp(container, key, FM.time, dflt / disp); afterKf(); });
    row.appendChild(kfb);
    row.appendChild(el('span', 'fx-scrub-label', label));
    const valBox = el('input', 'fx-scrub-val'); valBox.type = 'text'; valBox.value = read().toFixed(prec) + unit;
    function apply(v, commit) {
      v = Math.max(min, Math.min(max, Math.round(v / step) * step));
      FM.setProp(container, key, v / disp, FM.time);
      valBox.value = v.toFixed(prec) + unit;
      FM.requestRender();
      if (commit && FM.history) FM.history.commit();
    }
    const strip = tickStrip({
      min: min, max: max, step: step, unit: unit, dflt: dflt, read: read,
      apply: v => apply(v, false),
      release: () => { if (FM.isAnimated(container[key])) afterKf(); else if (FM.history) FM.history.commit(); },
    });
    valBox.addEventListener('change', () => { const v = parseFloat(valBox.value); if (!isNaN(v)) { apply(v, true); strip._sync(read()); } else valBox.value = read().toFixed(prec) + unit; });
    valBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') valBox.blur(); });
    row.appendChild(strip); row.appendChild(valBox);
    return row;
  }
  function kfColorRow(container, key, label, dflt) {
    const row = el('div', 'prop-row kf-color-row');
    const c0 = container[key];
    const kfb = el('button', 'fx-kf' + (FM.isAnimated(c0) ? ' active' : '') + (FM.hasKeyframeAt(c0, FM.time) ? ' here' : ''), '◆');
    kfb.title = FM.isAnimated(c0) ? 'Keyframe at playhead (click to remove)' : 'Animate colour';
    kfb.addEventListener('click', () => { FM.toggleProp(container, key, FM.time, dflt); afterKf(); });
    row.appendChild(kfb);
    row.appendChild(el('label', null, label));
    row.appendChild(colorField(() => FM.evalProp(container[key], FM.time) || dflt, v => { FM.setProp(container, key, v, FM.time); }));
    return row;
  }
  function segRow(label, options, get, set) {
    const row = el('div', 'prop-row'); row.appendChild(el('label', null, label));
    const seg = el('div', 'seg');
    options.forEach(o => {
      const b = el('button', 'seg-btn' + (get() === o[0] ? ' on' : ''), o[1]);
      b.addEventListener('click', () => { set(o[0]); FM.requestRender(); FM.inspector.refresh(); commitH(); });
      seg.appendChild(b);
    });
    row.appendChild(seg);
    return row;
  }

  function fxMoreMenu(layer, fx, idx, btn) {
    if (!FM.contextMenu) return;
    const r = btn.getBoundingClientRect();
    const reg = FM.fxRegistry.get(fx.type);
    const clipLabel = FM.fxClipboard.label();
    const items = [
      { label: 'Reset', action: () => { const inst = FM.fxRegistry.makeInstance(fx.type); if (inst) { fx.params = inst.params; afterFx(); } } },
      // Duplicate must carry the CURRENT settings + keyframes (a fresh default instance isn't a duplicate)
      { label: 'Duplicate', action: () => { const copy = JSON.parse(JSON.stringify(fx, FM.jsonReplacer)); layer.effects.splice(idx + 1, 0, copy); afterFx(); } },
      { label: 'Copy effect', action: () => {
        const ok = FM.fxClipboard.copy(fx);
        if (FM.toast) FM.toast(ok ? 'Copied ' + ((reg && reg.label) || fx.type) : 'Couldn’t copy this effect', 1600);
      } },
    ];
    // Naming what is on the clipboard matters more here than in most menus: an effect stack is a list
    // of near-identical rows, and a bare "Paste effect" gives you no way to tell what you are about to
    // land on it. Absent entirely when there is nothing to paste, rather than present and dead.
    if (clipLabel) {
      items.push({ label: 'Paste ' + clipLabel, action: () => {
        const fxIn = FM.fxClipboard.read();
        if (!fxIn) { if (FM.toast) FM.toast('Nothing to paste', 1400); return; }
        delete fxIn._expanded;
        if (!Array.isArray(layer.effects)) layer.effects = [];
        layer.effects.splice(idx + 1, 0, fxIn);   // below the effect you opened the menu on
        afterFx();
        if (FM.toast) FM.toast('Pasted ' + clipLabel, 1400);
      } });
    }
    FM.contextMenu.show(Math.max(8, r.right - 170), r.bottom + 4, items.concat([
      { label: 'Save as preset…', action: () => {
        const name = prompt('Preset name:', (reg ? reg.label : fx.type) + ' preset'); if (!name || !name.trim()) return;
        const p = FM.effectPresets && FM.effectPresets.capture(fx, name.trim());
        // save() now reports its OWN failure (and any keyframe trim) on screen, so this only speaks
        // for the capture step and only when save() stayed quiet — otherwise a bare "Saved"/"Couldn't
        // save" would paint straight over the message that says what actually happened.
        if (!p) { if (FM.toast) FM.toast('Couldn’t save “' + (reg ? reg.label : fx.type) + '” as a preset — it has no settings to store', 2600); return; }
        if (!FM.effectPresets.save(p)) return;
        const note = FM.effectPresets.lastNote ? FM.effectPresets.lastNote() : '';
        if (!note && FM.toast) FM.toast('Saved — hold ' + (reg ? reg.label : fx.type) + ' in the Effects browser to use it', 2400);
      } },
      { sep: true },
      { label: 'Delete', danger: true, action: () => { layer.effects.splice(idx, 1); afterFx(); } },
    ]));
  }

  // Gestures on an effect row: SWIPE LEFT to delete, PRESS-HOLD then drag up/down to reorder.
  // (Replaces the old ▴▾ arrow buttons.) touch-action:pan-y lets the sheet still scroll vertically.
  // `stack` lets the audio-effect list reuse this: it names the array the gesture edits and the
  // commit that follows. Omitted = the visual stack (layer.effects + afterFx).
  function attachFxGestures(row, head, layer, fx, idx, stack) {
    const listOf = () => (stack ? stack.list(layer) : layer.effects);
    const after = stack ? stack.after : afterFx;
    let sx = 0, sy = 0, mode = null, hold = null, rows = null, rects = null, slotH = 0, toIdx = idx, down = false;
    let swVx = 0, swLastX = 0, swLastT = 0, swDx = 0, wasArmed = false;   // swipe velocity + state
    row._g = { moved: false };
    const clearHold = () => { if (hold) { clearTimeout(hold); hold = null; } };
    function beginReorder() {
      // Expanded rows reorder TOO (v5.52). Ezra: "dragging and layering effects is broken." The guard
      // that used to sit here refused to start a drag on an open row, which meant the effect you were
      // LOOKING AT was the one you could not move — you tap an effect to see it (the accordion opens
      // it and closes the rest), try to drag it, and nothing happens with no feedback at all. The
      // stated reason was uniform height, but that stopped being true: the drop index comes from each
      // sibling's MEASURED midpoint (see moveReorder), and slotH below already reads the dragged row's
      // own measured height, so a tall row shifts its siblings by exactly its own size.
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
      _fxReorderAt = performance.now();   // …so the click that follows this drop cannot toggle the accordion
      if (rows) rows.forEach(r => { r.style.transform = ''; r.style.transition = ''; });
      row.classList.remove('fx-dragging'); row.style.transform = '';
      const list = listOf();
      const from = list ? list.indexOf(fx) : -1;   // by object, never a stale index (#16)
      if (from >= 0 && toIdx !== from) {
        const m = list.splice(from, 1)[0];
        list.splice(Math.max(0, Math.min(list.length, toIdx)), 0, m); after();
      } else { FM.inspector.refresh(); }
    }
    const rowW = () => row.getBoundingClientRect().width || 300;
    const armDist = () => 34;   // red panel "armed" this early — well before the commit point
    function moveSwipe(e) {
      const wrap = row._wrap || row;
      let dx = e.clientX - sx;
      // rubber-band: only a whisper of give to the right (nothing to reveal there); soft resistance
      // once you swipe past ~60% so it feels springy, not like it hit a wall.
      if (dx > 0) dx = dx * 0.16;
      const soft = rowW() * 0.6;
      if (dx < -soft) dx = -soft - (Math.abs(dx) - soft) * 0.4;
      wrap.style.transform = 'translateX(' + dx + 'px)';
      const armed = dx < -armDist();
      if (armed !== wasArmed) { wasArmed = armed; if (armed && navigator.vibrate) { try { navigator.vibrate(9); } catch (_) {} } }
      row.classList.toggle('fx-swipe-armed', armed);
      // velocity (px/ms), smoothed a touch so a single jittery sample can't misfire a flick
      const now = e.timeStamp || performance.now(), dt = now - swLastT;
      if (dt > 0) swVx = swVx * 0.4 + ((e.clientX - swLastX) / dt) * 0.6;
      swLastX = e.clientX; swLastT = now; swDx = dx;
    }
    function endSwipe() {
      const wrap = row._wrap || row, w = rowW();
      // EASY commit: a short pull (~18% of width, capped at 56px — the armed point) deletes, and
      // any real left flick deletes almost immediately. No need to drag it halfway across anymore.
      const commit = swDx < -Math.min(56, w * 0.18) || (swVx < -0.28 && swDx < -20);
      if (commit) {
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
        wrap.style.transition = 'transform .19s cubic-bezier(.4,0,.2,1)';
        wrap.style.transform = 'translateX(-' + (w + 12) + 'px)';
        // collapse the row's height so the list closes the gap smoothly, THEN splice + rebuild
        row.style.height = row.offsetHeight + 'px'; row.style.overflow = 'hidden';
        void row.offsetHeight;                                   // reflow so the height transition runs
        row.style.transition = 'height .2s ease, opacity .2s ease, margin .2s ease';
        row.style.height = '0px'; row.style.opacity = '0'; row.style.marginTop = '0px'; row.style.marginBottom = '0px';
        setTimeout(() => { const list = listOf(); const i = list ? list.indexOf(fx) : -1; if (i >= 0) { list.splice(i, 1); after(); } else { FM.inspector.refresh(); } }, 210);
      } else {
        wrap.style.transition = 'transform .3s cubic-bezier(.22,1,.36,1)';   // spring back
        wrap.style.transform = 'translateX(0px)';
        row.classList.remove('fx-swipe-armed'); wasArmed = false;
        setTimeout(() => { wrap.style.transition = ''; row._g.moved = false; }, 300);
      }
    }
    head.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;                       // let eye / disc / etc. work
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      sx = e.clientX; sy = e.clientY; mode = null; toIdx = idx; row._g.moved = false; down = true;
      swVx = 0; swDx = 0; wasArmed = false; swLastX = e.clientX; swLastT = e.timeStamp || performance.now();
      try { head.setPointerCapture(e.pointerId); } catch (_) {}
      // The grip (touch-action:none) is the reliable drag handle on touch — start reorder immediately.
      // Elsewhere on the row, a still-finger press-hold also reorders (works on desktop; on a phone a
      // moving finger scrolls the sheet via pan-y, so the grip is the dependable path).
      if (e.target.closest('.fx-grip')) beginReorder();
      else hold = setTimeout(() => { if (mode === null) beginReorder(); }, 280);
    });
    head.addEventListener('pointermove', e => {
      // If the mouse button is UP but we still think we're dragging, the pointerup was swallowed
      // (capture lost / DOM rebuilt). End the gesture NOW so the row doesn't keep swiping when the
      // cursor drifts back over it. (Same guard the Move/Transform + effect sliders use.)
      if (down && e.pointerType === 'mouse' && e.buttons === 0) { finish(e); return; }
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
    const finish = (e, aborted) => {
      if (!down) return;   // ignore stray pointerup/cancel from hover when we never started (mouse) (#swipe)
      down = false;
      clearHold();
      try { head.releasePointerCapture(e.pointerId); } catch (_) {}
      if (aborted) { swDx = 0; swVx = 0; }   // pointercancel = the OS stole the gesture — it must NEVER count as a completed swipe-delete
      if (mode === 'swipe') endSwipe(e); else if (mode === 'reorder') endReorder();
      mode = null;
    };
    head.addEventListener('pointerup', finish);
    head.addEventListener('pointercancel', e => finish(e, true));
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
    // a tap toggles the editor, but a swipe/reorder gesture must NOT also toggle it.
    // ACCORDION (like Blending & Opacity): opening one effect closes every other, so exactly one
    // editor is ever open — no more scrolling past three expanded stacks to reach the fourth.
    const toggle = () => {
      if (_justReordered()) return;                       // a drag just dropped here — not a tap
      if (row._g && row._g.moved) { row._g.moved = false; return; }
      (layer.effects || []).forEach(e => { if (e !== fx) e._expanded = false; });
      fx._expanded = !expanded;
      kfNavSync();   // a different effect's params are in play now — drop the old row, re-arm the timeline
      FM.inspector.refresh();
    };
    // Tap ANYWHERE on the row header to open/close the editor — not just the ▸ arrow. The action
    // buttons (eye / ⋯ / delete) keep their own behaviour; the disc + name + empty space all toggle.
    head.addEventListener('click', (e) => { if (e.target.closest('.fx-icon-btn')) return; toggle(); });
    if ((layer.effects || []).length > 1) head.appendChild(el('span', 'fx-grip', '⠿'));   // drag affordance (press-hold to reorder) — on OPEN rows too, or the one you are editing looks unmovable
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
    // Swipe-to-delete (iOS-style): a red DELETE panel sits behind an opaque wrapper that slides left
    // to reveal it. The wrapper holds the head (+ body) so the whole row travels as one.
    const delBg = el('div', 'fx-del-bg');
    delBg.innerHTML = '<span class="fx-del-ico">' + svgIcon('M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6') + '</span>';
    const wrap = el('div', 'fx-swipe-wrap');
    wrap.appendChild(head);
    if (expanded) {
      const body = el('div', 'fx-ed-body');
      // A one-line "what this actually does", above the controls. Two effects can have names that
      // sound like the same thing (Directional Blur vs Motion Blur (Footage) vs the transform blur in
      // Move & Transform) and no arrangement of sliders will tell you which is which.
      if (reg.desc) body.appendChild(el('div', 'fx-desc', reg.desc));
      reg.params.forEach(p => {
        if (p.type === 'range') {
          const row = fxScrubber(fx, p, layer, idx);
          // Dim and lock a slider whose value is currently being overridden by a tick box above it,
          // and say WHICH one — a greyed control with no explanation just reads as broken.
          if (p.overriddenBy) {
            const ctrl = reg.params.find(q => q.key === p.overriddenBy);
            const raw = fx.params[p.overriddenBy];
            const active = !!(raw == null ? (ctrl && ctrl.default) : raw);
            if (active) {
              row.classList.add('fx-overridden');
              row.setAttribute('aria-disabled', 'true');
              const tag = el('span', 'fx-ovr-tag');
              tag.textContent = 'Overridden by ' + ((ctrl && ctrl.label) || p.overriddenBy);
              row.appendChild(tag);
            }
          }
          body.appendChild(row);
        }
        else if (p.type === 'toggle') body.appendChild(fxToggle(fx, p));
        else if (p.type === 'segment') body.appendChild(fxSegment(fx, p));
        else if (p.type === 'color') { const cr = el('div', 'prop-row'); cr.appendChild(el('label', null, p.label)); cr.appendChild(colorField(() => fx.params[p.key] || p.default, v => { fx.params[p.key] = v; })); body.appendChild(cr); }
        else if (p.type === 'layer') {   // Displacement Map: pick which OTHER layer drives the warp
          const cr = el('div', 'prop-row'); cr.appendChild(el('label', null, p.label || 'Source'));
          const sel = document.createElement('select');
          const o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'This layer (self)'; sel.appendChild(o0);
          (FM.scene.layers || []).forEach(l => {
            if (l.id === layer.id || l.type === 'camera' || l.type === 'null') return;   // self / non-visual can't be a map
            const op = document.createElement('option'); op.value = l.id; op.textContent = l.name || l.type; sel.appendChild(op);
          });
          sel.value = fx.params[p.key] || '';   // stale id (deleted layer) falls back to '' → self-displace
          sel.addEventListener('change', () => { fx.params[p.key] = sel.value; FM.requestRender(); if (FM.history) FM.history.commit(); });
          cr.appendChild(sel); body.appendChild(cr);
        }
      });
      // Remove Object: dragging a box on the canvas beats nudging four % sliders (esp. on a phone)
      if (fx.type === 'touchup' && FM.touchupTool) {
        const pick = el('button', 'fx-add-btn', 'Select area on canvas');
        pick.style.marginTop = '0';   // .fx-ed-body's gap already spaces it
        pick.addEventListener('click', () => FM.touchupTool.open(layer.id, fx));
        body.appendChild(pick);
      }
      if (!reg.params.length) body.appendChild(el('div', 'insp-hint', 'No adjustable parameters.'));
      wrap.appendChild(body);
    }
    row.appendChild(delBg);
    row.appendChild(wrap);
    row._wrap = wrap; row._delBg = delBg;
    attachFxGestures(row, head, layer, fx, idx);   // swipe-left = delete · press-hold + drag = reorder
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
    cp.addEventListener('click', () => { FM.effectClipboard = JSON.parse(JSON.stringify(layer.effects || [], FM.jsonReplacer)); if (FM.toast) FM.toast('Copied ' + FM.effectClipboard.length + ' effect(s)'); FM.inspector.refresh(); });
    const pa = el('button', 'fx-act', 'Paste'); pa.disabled = !(FM.effectClipboard && FM.effectClipboard.length);
    pa.addEventListener('click', () => { if (!FM.effectClipboard || !FM.effectClipboard.length) return; if (!layer.effects) layer.effects = []; FM.effectClipboard.forEach(e => layer.effects.push(JSON.parse(JSON.stringify(e)))); afterFx(); });
    const sv = el('button', 'fx-act', 'Save preset…'); sv.disabled = !(layer.effects && layer.effects.length);
    sv.addEventListener('click', () => { const name = prompt('Preset name:', 'My look'); if (!name || !name.trim()) return; FM.fxPresets.save(name.trim(), layer.effects); if (FM.toast) FM.toast('Saved preset “' + name.trim() + '”'); FM.inspector.refresh(); });
    tools.appendChild(cp); tools.appendChild(pa); tools.appendChild(sv);
    s.appendChild(tools);
    return s;
  }

  // ===== Audio effects — the same stack UI as visual effects, over layer.audioFx =====
  // Audio changes nothing on the canvas, so the commit re-syncs the live graph instead of re-rendering.
  function afterAudioFx() {
    FM.inspector.refresh();
    if (FM.reconcileAudio) FM.reconcileAudio();
    if (FM.timeline) FM.timeline.rebuild();
    if (FM.history) FM.history.commit();
  }
  const AFX_STACK = { list: l => l.audioFx, after: afterAudioFx };

  // audio-fx.js param descriptors carry `def` and no `type`; fxScrubber reads `default` and dispatches
  // on `type`. Bridge them rather than teaching either side about the other.
  function afxParam(p) {
    return { type: 'range', key: p.key, label: p.label, min: p.min, max: p.max, step: p.step, default: p.def, unit: p.unit, keyframable: p.keyframable };
  }

  // undefined numberOfChannels = not decoded yet = UNKNOWN. Only a decoded 1-channel buffer warns.
  function layerIsMono(layer) {
    const m = FM.media.get(layer.id), b = m && m.audioBuffer;
    return !!(b && b.numberOfChannels < 2);
  }
  // Centre-cancel needs a stereo source. The two effects fail DIFFERENTLY on mono, so they get their own
  // warnings: Stereo Width lands on a genuine no-op, but Vocal Remove has nothing to cancel and leaves
  // only its low-passed bass-keep path — i.e. it guts the clip rather than ignoring it.
  const AFX_MONO_HINT = {
    width: 'This clip’s audio is mono — there’s no stereo image to widen, so this effect does nothing.',
    vocalremove: 'This clip’s audio is mono — there’s no centred vocal to cancel, so this leaves only the deep bass and the clip comes back muffled. Needs a stereo track.',
  };

  function audioFxMoreMenu(layer, fx, idx, btn) {
    if (!FM.contextMenu) return;
    const r = btn.getBoundingClientRect();
    FM.contextMenu.show(Math.max(8, r.right - 170), r.bottom + 4, [
      { label: 'Reset', action: () => { const inst = FM.audioFxRegistry.makeInstance(fx.type); if (inst) { fx.params = inst.params; afterAudioFx(); } } },
      { label: 'Duplicate', action: () => { const inst = FM.audioFxRegistry.makeInstance(fx.type); if (inst) { layer.audioFx.splice(idx + 1, 0, inst); afterAudioFx(); } } },
      { sep: true },
      { label: 'Delete', danger: true, action: () => { layer.audioFx.splice(idx, 1); afterAudioFx(); } },
    ]);
  }

  function audioFxRow(layer, fx, idx) {
    const reg = FM.audioFxRegistry.get(fx.type) || { label: fx.type, params: [] };
    const expanded = !!fx._expanded, off = fx.enabled === false;
    const row = el('div', 'fx-row' + (off ? ' fx-off' : '') + (expanded ? ' fx-open' : ''));
    const head = el('div', 'fx-head');
    const disc = el('button', 'fx-disc', expanded ? '▾' : '▸');
    const name = el('span', 'fx-name', reg.label);
    const toggle = () => {
      if (_justReordered()) return;                       // a drag just dropped here — not a tap
      if (row._g && row._g.moved) { row._g.moved = false; return; }
      (layer.audioFx || []).forEach(e => { if (e !== fx) e._expanded = false; });   // accordion: exactly one editor open
      fx._expanded = !expanded;
      FM.inspector.refresh();
    };
    head.addEventListener('click', (e) => { if (e.target.closest('.fx-icon-btn')) return; toggle(); });
    if (!expanded && (layer.audioFx || []).length > 1) head.appendChild(el('span', 'fx-grip', '⠿'));
    head.appendChild(disc); head.appendChild(name); head.appendChild(el('span', 'fx-spacer'));
    if (expanded) {
      const more = el('button', 'fx-icon-btn', '⋯'); more.title = 'More';
      more.addEventListener('click', (ev) => audioFxMoreMenu(layer, fx, idx, ev.currentTarget));
      const del = el('button', 'fx-icon-btn fx-del'); del.title = 'Delete effect'; del.innerHTML = svgIcon('M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13');
      del.addEventListener('click', () => { layer.audioFx.splice(idx, 1); afterAudioFx(); });
      head.appendChild(more); head.appendChild(del);
    } else {
      const eye = el('button', 'fx-icon-btn fx-eye' + (off ? ' off' : '')); eye.title = off ? 'Effect off — enable' : 'Effect on — disable';
      eye.innerHTML = svgIcon('M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6');
      eye.addEventListener('click', () => { fx.enabled = !(fx.enabled !== false); afterAudioFx(); });
      head.appendChild(eye);
    }
    const delBg = el('div', 'fx-del-bg');
    delBg.innerHTML = '<span class="fx-del-ico">' + svgIcon('M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6') + '</span>';
    const wrap = el('div', 'fx-swipe-wrap');
    wrap.appendChild(head);
    if (expanded) {
      const body = el('div', 'fx-ed-body');
      if (AFX_MONO_HINT[fx.type] && layerIsMono(layer)) body.appendChild(el('div', 'insp-hint', AFX_MONO_HINT[fx.type]));
      reg.params.forEach(p => body.appendChild(fxScrubber(fx, afxParam(p), layer, idx)));
      if (!reg.params.length) body.appendChild(el('div', 'insp-hint', 'No adjustable parameters.'));
      wrap.appendChild(body);
    }
    row.appendChild(delBg);
    row.appendChild(wrap);
    row._wrap = wrap; row._delBg = delBg;
    attachFxGestures(row, head, layer, fx, idx, AFX_STACK);
    return row;
  }

  function audioFxSection(layer) {
    const s = section('Audio Effects');
    const list = el('div', 'fx-list');
    (layer.audioFx || []).forEach((fx, idx) => list.appendChild(audioFxRow(layer, fx, idx)));
    s.appendChild(list);
    if (!(layer.audioFx && layer.audioFx.length)) s.appendChild(el('div', 'insp-hint', 'No audio effects yet — add one to shape this clip’s sound.'));
    const add = el('button', 'fx-add-btn', '+ Add Audio Effect');
    add.addEventListener('click', () => { if (FM.audioFxBrowser) FM.audioFxBrowser.open(layer); });
    s.appendChild(add);
    const tools = el('div', 'fx-stack-tools');
    const cp = el('button', 'fx-act', 'Copy'); cp.disabled = !(layer.audioFx && layer.audioFx.length);
    cp.addEventListener('click', () => { FM.audioFxClipboard = JSON.parse(JSON.stringify(layer.audioFx || [], FM.jsonReplacer)); if (FM.toast) FM.toast('Copied ' + FM.audioFxClipboard.length + ' audio effect(s)'); FM.inspector.refresh(); });
    const pa = el('button', 'fx-act', 'Paste'); pa.disabled = !(FM.audioFxClipboard && FM.audioFxClipboard.length);
    pa.addEventListener('click', () => {
      if (!FM.audioFxClipboard || !FM.audioFxClipboard.length) return;
      if (!layer.audioFx) layer.audioFx = [];
      FM.audioFxClipboard.forEach(e => layer.audioFx.push(JSON.parse(JSON.stringify(e))));
      afterAudioFx();
    });
    tools.appendChild(cp); tools.appendChild(pa);
    s.appendChild(tools);
    return s;
  }

  // ===== Alight Motion property-category model =====
  let view = 'home';
  let lastLayerId = null;
  // Which side of the Effects card is showing: the visual stack or the audio one (queue 45). It is a
  // TAB, not a view — the browser, the panel and the per-parameter easing sub-view all read it, and a
  // separate 'audiofx' view would have had to be kept in sync with all three.
  let fxTab = 'visual';

  // Order mirrors Alight Motion's property menu (Color & Fill leads, Move & Transform 4th, Effects last).
  const CATEGORIES = [
    { key: 'color', label: 'Color & Fill', icon: 'M12 3a9 9 0 1 0 9 9c0-1.1-.9-2-2-2h-1.5a2 2 0 0 1 0-4H19a2 2 0 0 0 2-2c0-2-4-3-9-3z' },
    { key: 'border', label: 'Border & Shadow', icon: 'M4 4h12v12H4zM9 20h11V9' },
    { key: 'blend', label: 'Blending & Opacity', icon: 'M9 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12M15 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12' },
    { key: 'transform', label: 'Move & Transform', icon: 'M12 2v20M2 12h20M8 5l4-3 4 3M8 19l4 3 4-3M5 8l-3 4 3 4M19 8l3 4-3 4' },
    { key: 'speed', label: 'Speed', icon: 'M4.2 16.8a8 8 0 1 1 15.6 0M12 12l4-2.5' },
    { key: 'volume', label: 'Volume', icon: 'M11 5 6 9H3v6h3l5 4zM16 8.5a4 4 0 0 1 0 7M19.5 6a8 8 0 0 1 0 12' },
    // No 'audiofx' card (queue 45). Audio effects are a SIDE of the Effects card now — the panel and
    // the Add Effect browser each carry a Visual/Audio toggle — so there is one door to every effect.
    { key: 'element', label: 'Element Properties', icon: 'M4 9h7v7H4zM15 6a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7M16 14l4 6h-8z' },
    { key: 'editgroup', label: 'Edit Group', icon: 'M4 4h7v7H4zM13 13h7v7h-7zM13 7.5h3.5a1 1 0 0 1 1 1V12M11 16.5H7.5a1 1 0 0 1-1-1V12' },   // group only — opens the group's own timeline
    { key: 'presets', label: 'Presets', icon: 'M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.8 6.4 20l1.5-6.3L3 9.5 9.4 9z' },
    { key: 'effects', label: 'Effects', icon: 'M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M19 5l-3.5 3.5M8.5 15.5L5 19' },
    // camera only — the Effects-style door into the lens, focus and fog (Ezra)
    { key: 'cameraopts', label: 'Camera Options', icon: 'M3 8.5 8.5 4v3H14a6 6 0 0 1 0 12H9M3 8.5 8.5 13v-3' },
  ];

  // Alight Motion labels its element category after the layer kind: "Edit Text" for text,
  // "Edit Points" for point shapes (library shapes + drawn paths — every bend is a point),
  // "Edit Shape" for parametric shapes (rect/ellipse/…) and media (where it's the crop editor).
  function elementLabel(layer) {
    if (layer.type === 'text' || layer.type === 'caption') return 'Edit Text';
    if (FM.isPointShape && FM.isPointShape(layer)) return 'Edit Points';
    return 'Edit Shape';
  }

  const FONTS = ['Inter, sans-serif', 'Helvetica, Arial, sans-serif', 'Georgia, serif', 'Times New Roman, serif', 'Courier New, monospace', 'Impact, sans-serif', 'Verdana, sans-serif', 'Trebuchet MS, sans-serif', 'Palatino, serif', 'Comic Sans MS, cursive'];

  function svgIcon(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + path + '"/></svg>';
  }

  // ===== PEN MASKS (layer.masks) — a reveal window drawn on the layer plate in project pixel space =====
  // A NEW, separate system from the legacy single layer.mask. Absent/empty layer.masks renders exactly as
  // today. Only pixel-rasterizing layers get the UI (camera/null/group are excluded — a group flattens
  // separately). The path is EITHER a static pts array or an animated { kf } so a moving reveal keyframes.
  function maskableLayer(layer) { return ['shape', 'text', 'image', 'video', 'adjustment'].indexOf(layer.type) >= 0; }
  function clonePts(pts) { return (Array.isArray(pts) ? pts : []).map(p => Array.isArray(p) ? p.slice() : p); }
  // Fallback mask object matching the CONTRACT default shape, used only if FM.masks.make is not loaded yet.
  function makeMaskFallback() {
    const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    return { id: id, enabled: true, mode: 'add', feather: 0, opacity: 1, invert: false, closed: true, path: [] };
  }
  // Path keyframe toggle. Seeds/inserts vertex-safe pts via FM.evalMaskPath (numeric FM.evalProp would NaN
  // an array), so it never relies on lerping a pts array. Removing the last kf reverts to a static path.
  function toggleMaskPathKf(mask, t) {
    const p = mask.path;
    if (!FM.isAnimated(p)) {
      const pts = FM.evalMaskPath ? FM.evalMaskPath(mask, t) : (Array.isArray(p) ? p : []);
      mask.path = { kf: [{ t: t, v: clonePts(pts), e: 'linear' }] };
      return;
    }
    const hit = p.kf.find(k => Math.abs(k.t - t) < 1e-3);
    if (hit) { p.kf = p.kf.filter(k => k !== hit); if (!p.kf.length) mask.path = clonePts(hit.v); return; }
    const pts = FM.evalMaskPath ? FM.evalMaskPath(mask, t) : clonePts(p.kf[0] && p.kf[0].v);
    p.kf.push({ t: t, v: clonePts(pts), e: 'linear' }); p.kf.sort((a, b) => a.t - b.t);
  }
  function afterMasks(layer) {
    if (layer.masks && !layer.masks.length) delete layer.masks;   // empty === absent → stay byte-for-byte diff-free
    commitH(); FM.requestRender(); FM.inspector.refresh(); if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
  }
  function masksBlock(layer) {
    const wrap = el('div', 'mask-block');
    wrap.appendChild(el('div', 'insp-sub-label', 'Masks'));
    const masks = Array.isArray(layer.masks) ? layer.masks : [];   // caller only renders this block when it's non-empty
    masks.forEach((mask, idx) => {
      const item = el('div', 'mask-item' + (mask.enabled === false ? ' mask-off' : ''));
      const head = el('div', 'mask-item-head');
      const eye = el('button', 'fx-icon-btn fx-eye' + (mask.enabled === false ? ' off' : ''));
      eye.title = mask.enabled === false ? 'Mask off — enable' : 'Mask on — disable';
      eye.innerHTML = svgIcon('M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6');
      eye.addEventListener('click', () => { mask.enabled = mask.enabled === false; afterMasks(layer); });
      head.appendChild(eye);
      head.appendChild(el('span', 'mask-name', 'Mask ' + (idx + 1)));
      head.appendChild(el('span', 'fx-spacer'));
      const anim = FM.isAnimated(mask.path);
      const here = anim && FM.hasKeyframeAt(mask.path, FM.time);
      const kf = el('button', 'kf-btn' + (anim ? ' active' : '') + (here ? ' here' : ''), '◆');
      kf.title = anim ? 'Path keyframe at playhead (click to remove)' : 'Animate the mask path — adds a keyframe at the playhead';
      kf.addEventListener('click', () => { toggleMaskPathKf(mask, FM.time); afterMasks(layer); });
      head.appendChild(kf);
      const del = el('button', 'fx-icon-btn fx-del'); del.title = 'Delete mask';
      del.innerHTML = svgIcon('M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13');
      del.addEventListener('click', () => { masks.splice(idx, 1); afterMasks(layer); });
      head.appendChild(del);
      item.appendChild(head);
      item.appendChild(segRow('Mode', [['add', 'Add'], ['subtract', 'Subtract'], ['intersect', 'Intersect']], () => mask.mode || 'add', v => { mask.mode = v; }));
      item.appendChild(rangeRow('Feather', () => mask.feather || 0, v => { mask.feather = Math.max(0, v); }, 0, 200, 1));
      item.appendChild(rangeRow('Opacity', () => Math.round((mask.opacity != null ? mask.opacity : 1) * 100), v => { mask.opacity = Math.max(0, Math.min(1, v / 100)); }, 0, 100, 1));
      item.appendChild(checkRow('Invert', !!mask.invert, v => { mask.invert = v; FM.requestRender(); }));
      const edit = el('button', 'mask-edit-btn', 'Edit path');
      edit.addEventListener('click', () => { if (FM.maskTool && FM.maskTool.open) FM.maskTool.open(layer.id, mask.id); else if (FM.toast) FM.toast('Mask editor unavailable'); });
      item.appendChild(edit);
      wrap.appendChild(item);
    });
    // No "+ Add mask" button any more: Mask is an entry in the effect browser now (Ezra), so there
    // is ONE way in for everything that shapes a layer. This block still lists and edits whatever
    // masks the layer has.
    return wrap;
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
    // keyframe times are ABSOLUTE project time — pasted animation must be re-anchored from the
    // source clip's start to the target's, or it lands entirely outside the target's window
    const dt = (typeof src.start === 'number' && typeof target.start === 'number') ? (target.start - src.start) : 0;
    const shiftKfs = (v) => { if (v && typeof v === 'object') { if (Array.isArray(v.kf)) v.kf.forEach(k => { k.t += dt; }); Object.keys(v).forEach(k => shiftKfs(v[k])); } return v; };
    const clone = v => (v == null ? v : (dt ? shiftKfs(JSON.parse(JSON.stringify(v))) : JSON.parse(JSON.stringify(v))));
    if (cats.color) {
      // clone: fill/color can be KEYFRAME OBJECTS now — pasting onto several layers must not share one
      if (src.color != null) target.color = clone(src.color);
      if (src.fill != null) target.fill = clone(src.fill);
      if ('fillMode' in src) target.fillMode = src.fillMode;
      if ('fillOpacity' in src) target.fillOpacity = src.fillOpacity;
      if ('fillImage' in src) { if (src.fillImage) target.fillImage = src.fillImage; else delete target.fillImage; }
      ['fillImgX', 'fillImgY'].forEach(k => { if (k in src) target[k] = clone(src[k]); });   // the picture's pan travels with the picture
      if ('fillGradient' in src) target.fillGradient = clone(src.fillGradient);              // (carries the gradient's ox/oy)
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
      if (src.color != null) target.color = clone(src.color);   // may be a keyframe object
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
  // What the clip-action row was last BUILT for. Null until a row exists, so syncPlayhead can't fire
  // before there is anything to keep in sync. Everything that changes which buttons appear (or which
  // way their arrows point) has to be in this signature, or the row goes stale mid-scrub.
  let quickSideSig = null;
  let lastNavSig = null;   // layer+view the panel is currently scrolled for (see refresh)
  function homeRowSig() {
    const ids = FM.selectionIds ? FM.selectionIds() : [];
    if (ids.length >= 2) {
      const layers = ids.map(id => FM.layerById(FM.scene, id)).filter(Boolean);
      if (!layers.length) return 'multi:0';
      const onAny = layers.some(l => FM.time > l.start + 1e-4 && FM.time < l.start + l.duration - 1e-4);
      const first = Math.min.apply(null, layers.map(l => l.start));
      return 'multi:' + ids.length + ':' + (onAny ? 1 : 0) + ':' + (FM.time >= first ? 'r' : 'l');
    }
    const l = FM.selectedLayer(FM.scene);
    return l ? l.id + ':' + (FM.clipPlayheadSide ? FM.clipPlayheadSide(l) : 0) : null;
  }
  function quickRow(layer) {
    const row = el('div', 'quick-row');
    function qbtn(title, icon, opts, fn) {
      opts = opts || {};
      const b = el('button', 'qr-btn' + (opts.on ? ' on' : '') + (opts.disabled ? ' disabled' : '') + (opts.cls ? ' ' + opts.cls : ''));
      b.title = title; b.innerHTML = svgIcon(icon);
      if (opts.disabled) b.disabled = true; else b.addEventListener('click', fn);
      return b;
    }
    const after = () => { FM.requestRender(); FM.timeline.rebuild(); FM.inspector.refresh(); commitH(); };
    const onClip = FM.time > layer.start + 1e-4 && FM.time < layer.start + layer.duration - 1e-4;   // playhead inside the clip
    // AM's media row order: Speed | trim-in | trim-out | Volume. Split keeps a slot between the
    // trims (AM parks split in its timeline bar; we keep it here so it stays one tap away).
    // …except Speed and Volume are CARDS now, on every layer kind (queue 45). Ezra, with two
    // screenshots: "some layers look like the first image with the button option layout and some look
    // like the second image. I want them both to look like the second image." A video was the odd one
    // out — it hid the two controls a shape showed as cards 5 and 6, in an icon strip a shape didn't
    // have. So the strip is now the same three buttons everywhere: trim-in · split · trim-out.
    // THE MIDDLE THREE SWAP WITH THE PLAYHEAD (Alight Motion). Parked outside the clip, trim-start,
    // split and trim-end are three buttons that can't do anything — so out there they become the two
    // that can: slide the clip to the playhead, or stretch its near edge out to meet it. The icons
    // point the way the clip will actually travel, which is the only thing that tells you, before you
    // press, whether you're about to pull it left or push it right.
    const side = FM.clipPlayheadSide ? FM.clipPlayheadSide(layer) : 0;
    quickSideSig = homeRowSig();   // what this row was built for — syncPlayhead rebuilds when it stops matching
    if (side) {
      const right = side > 0;   // playhead is PAST the clip → everything moves/grows rightwards
      /* These two are ALSO rendered beside the playhead on the timeline (#tl-nudge, v5.01) — Ezra
       * moved them there because that is where your hand already is while you drag. They are hidden
       * here on desktop by CSS rather than removed, so the phone (whose timeline is too narrow for a
       * floating pair, and whose layout is off-limits) keeps them exactly where they have always
       * been. One home per platform, never two at once. */
      const mv = qbtn(right ? 'Move clip right to the playhead' : 'Move clip left to the playhead',
        right ? 'M4 8h9v8H4zM15.5 12h3M17 10l2 2-2 2M21 4v16' : 'M20 8h-9v8h9zM8.5 12h-3M7 10l-2 2 2 2M3 4v16',
        {}, () => { if (FM.moveClipTo(layer, FM.time)) after(); });
      mv.classList.add('qr-nudge');
      row.appendChild(mv);
      // open-ended box = that edge stretches; closed box above = the whole clip travels
      const ex = qbtn(right ? 'Extend the end of the clip to the playhead' : 'Extend the start of the clip to the playhead',
        right ? 'M12 8H4v8h8M12 12h6M16 10l2 2-2 2M21 4v16' : 'M12 8h8v8h-8M12 12H6M8 10l-2 2 2 2M3 4v16',
        {}, () => { if (FM.extendClipTo(layer, FM.time)) after(); else if (FM.toast) FM.toast('No more source to extend into', 1500); });
      ex.classList.add('qr-nudge');
      row.appendChild(ex);
    } else {
      // trim START to playhead (drop everything before the playhead)
      // disabled state is evaluated at BUILD, but the panel doesn't rebuild on scrub — leave the
      // buttons live and guard inside each handler with the CURRENT playhead instead
      row.appendChild(qbtn('Trim start to playhead', 'M6 4v16M6 4h4M6 20h4M14 4v16', { cls: 'qr-trim' }, () => {
        const cut = FM.time - layer.start; if (cut <= 0 || cut >= layer.duration) return;
        layer.start = FM.time; layer.duration -= cut;
        // Forward: advance the source trim by the dropped wall-time × speed. Reversed: trimStart anchors
        // the source tail, so the kept (later) span keeps the same trimStart — matches splitLayer. (#12)
        if (layer.type === 'video' && !layer.reversed) layer.trimStart = (layer.trimStart || 0) + (FM.layerSourceAdvance ? FM.layerSourceAdvance(layer, cut) : cut * (layer.speed || 1));   // ramp-safe: animated speed is an object (raw × = NaN)
        after();
      }));
      // split at playhead
      row.appendChild(qbtn('Split at playhead', 'M12 3v18M16 8l4 4-4 4M8 8l-4 4 4 4', { cls: 'qr-trim' }, () => { if (FM.time > layer.start + 1e-4 && FM.time < layer.start + layer.duration - 1e-4) FM.splitLayer(layer.id); }));
      // trim END to playhead (drop everything after the playhead)
      row.appendChild(qbtn('Trim end to playhead', 'M18 4v16M18 4h-4M18 20h-4M10 4v16', { cls: 'qr-trim' }, () => {
        const nd = FM.time - layer.start; if (nd <= 0 || nd >= layer.duration) return;
        layer.duration = nd; after();
      }));
    }
    return row;
  }

  // Multi-select bar (AM): Group leads; then trim/split/delete acting on EVERY selected clip; then
  // TIMELINE alignment — moves clips in time only (canvas position untouched), keyframes ride along.
  // (The old canvas align/distribute buttons lived here — Ezra: gone, this is about the timeline.)
  function alignRow() {
    const ids = FM.selectionIds();
    const n = ids.length;
    const layers = ids.map(id => FM.layerById(FM.scene, id)).filter(Boolean);
    const rowOrder = FM.scene.layers.filter(l => ids.indexOf(l.id) >= 0);   // top→bottom as shown in the timeline
    const wrap = el('div', 'align-row');
    // NO Group button and NO bin here (Ezra): both already sit in the top bar the moment a second
    // layer is selected, and a big "Group 3 layers" banner plus a red bin pushed the actual property
    // cards — Effects, Blending, Move & Transform — down below the fold. What is left is the two
    // things that have nowhere else to live: the clip actions and the timeline alignment.
    const done = () => { FM.requestRender(); if (FM.timeline) FM.timeline.rebuild(); FM.inspector.refresh(); if (FM.history) FM.history.commit(); };
    // move a clip in time: keyframes are absolute, so they must ride along (same rule as clip-drag v3.01)
    const setStart = (l, ns) => { const d = ns - l.start; if (!d) return; l.start = ns; if (FM.shiftLayerKeyframes) FM.shiftLayerKeyframes(l, d); };

    // ---- clip actions on the whole selection (AM bottom-left) ----
    wrap.appendChild(el('div', 'align-label', 'Edit ' + n + ' clips'));
    const bar = el('div', 'quick-row');
    function ab(title, icon, opts, fn) { const b = el('button', 'qr-btn' + (opts.danger ? ' qr-danger' : '')); b.title = title; b.innerHTML = svgIcon(icon); if (opts.disabled) b.disabled = true; b.addEventListener('click', fn); bar.appendChild(b); }
    const inside = l => FM.time > l.start + 1e-4 && FM.time < l.start + l.duration - 1e-4;
    const onAny = layers.some(inside);
    quickSideSig = homeRowSig();   // this bar swaps with the playhead too — keep syncPlayhead watching it
    // Same swap the single-clip row makes (Alight Motion): with the playhead over NONE of the selected
    // clips, trim and split are three dead buttons, so the whole set gets move / extend instead.
    if (!onAny) {
      // MOVE moves the selection as a BLOCK — the earliest clip lands on the playhead and every other
      // one keeps its offset from it. Snapping them all to the same start would destroy the timing you
      // built between them, which is the opposite of what a multi-select is for.
      // The SELECTION's near edge meets the playhead, exactly as a single clip's does — past the whole
      // selection it's the last END that travels, otherwise the first start. Anchoring on the first
      // start from the right threw the whole group forward by the selection's own length.
      const groupShift = () => {
        const firstStart = Math.min.apply(null, layers.map(l => l.start));
        const lastEnd = Math.max.apply(null, layers.map(l => l.start + l.duration));
        return FM.time - (FM.time >= lastEnd ? lastEnd : firstStart);
      };
      const right = groupShift() > 0;
      ab(right ? 'Move all ' + n + ' clips right to the playhead' : 'Move all ' + n + ' clips left to the playhead',
        right ? 'M4 8h9v8H4zM15.5 12h3M17 10l2 2-2 2M21 4v16' : 'M20 8h-9v8h9zM8.5 12h-3M7 10l-2 2 2 2M3 4v16', {}, () => {
        const d = groupShift();   // recomputed at press: the panel doesn't rebuild on scrub
        layers.forEach(l => setStart(l, l.start + d));
        done();
      });
      // EXTEND is per-clip: each one's nearest edge reaches the playhead, so clips on either side of it
      // grow toward it from their own direction and they all end up meeting there.
      ab('Extend all ' + n + ' clips to the playhead', 'M12 8H4v8h8M12 12h6M16 10l2 2-2 2M21 4v16', {}, () => {
        let moved = 0;
        layers.forEach(l => { if (FM.extendClipTo(l, FM.time)) moved++; });
        if (!moved && FM.toast) FM.toast('No more source to extend into', 1500);
        done();
      });
    } else {
    ab('Trim starts to playhead', 'M6 4v16M6 4h4M6 20h4M14 4v16', { disabled: !onAny }, () => {
      layers.forEach(l => {
        if (!inside(l)) return;
        const cut = FM.time - l.start;
        l.start = FM.time; l.duration -= cut;
        if (l.type === 'video' && !l.reversed) l.trimStart = (l.trimStart || 0) + (FM.layerSourceAdvance ? FM.layerSourceAdvance(l, cut) : cut * (l.speed || 1));
      });
      done();
    });
    ab('Split all at playhead', 'M12 3v18M16 8l4 4-4 4M8 8l-4 4 4 4', { disabled: !onAny }, async () => {
      for (const l of layers) { if (inside(l)) await FM.splitLayer(l.id); }   // sequential: splitLayer clones media safely one at a time
      done();
    });
    ab('Trim ends to playhead', 'M18 4v16M18 4h-4M18 20h-4M10 4v16', { disabled: !onAny }, () => {
      layers.forEach(l => { if (inside(l)) l.duration = FM.time - l.start; });
      done();
    });
    }
    wrap.appendChild(bar);

    // ---- timeline alignment (AM bottom-right): time only, never canvas position ----
    wrap.appendChild(el('div', 'align-label', 'Align on timeline'));
    const tbar = el('div', 'quick-row');
    function tb(title, icon, fn) { const b = el('button', 'qr-btn'); b.title = title; b.innerHTML = svgIcon(icon); b.addEventListener('click', fn); tbar.appendChild(b); }
    tb('Start together — all clips begin at the same time', 'M5 4v16M9 7h10M9 12h7M9 17h11', () => {
      const s0 = Math.min.apply(null, layers.map(l => l.start));
      layers.forEach(l => setStart(l, s0));
      done();
    });
    tb('One after another — each clip starts where the previous ends', 'M3 6h6M9 12h6M15 18h6', () => {
      let t = Math.min.apply(null, layers.map(l => l.start));
      rowOrder.forEach(l => { setStart(l, t); t += l.duration; });
      done();
    });
    tb('End together — all clips finish at the same time', 'M19 4v16M5 7h10M8 12h7M4 17h11', () => {
      const e0 = Math.max.apply(null, layers.map(l => l.start + l.duration));
      layers.forEach(l => setStart(l, e0 - l.duration));
      done();
    });
    wrap.appendChild(tbar);
    return wrap;
  }

  // masks live INSIDE the Effects card now (Ezra: not their own section) — no per-card gate needed
  // mp3/wav ride the video path with a 0×0 picture — that missing picture is what makes every visual
  // category meaningless on them.
  function isAudioOnly(layer) {
    if (!layer || layer.type !== 'video') return false;
    const m = FM.media.get(layer.id);
    return !!m && (!m.width || !m.height);
  }
  function catsFor(layer) {
    const out = catsForBase(layer);
    // Camera Options is whitelisted onto the camera. Every OTHER branch below builds its list by
    // blacklist, so a new category leaks into all of them unless it is taken back out here — which is
    // exactly what happened: the card turned up on shapes, text, media and groups.
    return (layer && layer.type === 'camera') ? out : out.filter(c => c.key !== 'cameraopts');
  }
  function catsForBase(layer) {   // a camera only pans/zooms/rotates — hide categories that can't apply
    if (layer.type === 'camera') return CATEGORIES.filter(c => c.key === 'transform' || c.key === 'cameraopts');
    // Groups composite as a flattened unit whenever they carry a look of their own, so effects,
    // blending/opacity and presets all act on the whole group — plus the door into its own timeline.
    if (layer.type === 'group') return CATEGORIES.filter(c => ['color', 'border', 'blend', 'transform', 'editgroup', 'presets', 'effects'].indexOf(c.key) >= 0);
    // Nulls/adjustments never rasterize their own pixels — a fill or border card would be a dead end.
    if (layer.type === 'null' || layer.type === 'adjustment') return CATEGORIES.filter(c => ['blend', 'transform', 'presets', 'effects'].indexOf(c.key) >= 0);   // adjustment reaches masks (= a LOCAL grade) inside its Effects card
    // Video: the SAME nine cards a shape gets (queue 45). Speed and Volume used to be hidden here and
    // parked in the icon strip instead, which is the entire difference Ezra photographed between the
    // two layouts. There's still no catch-all Element card — media's element card IS Edit Shape.
    if (layer.type === 'video') {
      const audioOnly = isAudioOnly(layer);
      // A SONG keeps its short list. Every visual category is a dead end on a 0×0 layer — there is
      // nothing to colour, size, move or blend (Ezra: "get rid of the effects menu for audios because
      // none of the effects will do anything"), and Presets is visual too (layer styles and effect
      // looks). Effects IS on the list now, because the audio stack lives behind it since queue 45 —
      // it opens straight onto the audio side, with the visual side greyed (see fxTabFor).
      if (audioOnly) return CATEGORIES.filter(c => ['speed', 'volume', 'effects'].indexOf(c.key) >= 0);
      return CATEGORIES.filter(c => c.key !== 'editgroup');
    }
    // shape / text / image show the same grid, with Speed and Volume DISABLED (categoryGrid greys
    // them): Volume because there's no audio, Speed because there's no source clock to re-time —
    // see layerHasSource.
    if (['shape', 'text', 'image'].indexOf(layer.type) >= 0) return CATEGORIES.filter(c => c.key !== 'editgroup');
    return CATEGORIES.filter(c => c.key !== 'speed' && c.key !== 'volume' && c.key !== 'editgroup');
  }
  function layerHasAudio(layer) { return !!layer && layer.type === 'video'; }   // only the video/audio path carries sound — shapes/text/images/groups don't
  // Speed re-times a layer's SOURCE clock and nothing else: layer.speed feeds FM.layerSourceAdvance →
  // FM.layerLocalTime, and every consumer of that (playback seek, export seek, frame cache, audio
  // resample) is gated on layer.type === 'video'. So it moves video frames and audio samples, and
  // nothing else — a shape/text layer's own keyframes are read at absolute project time, so a speed
  // ramp on one changes literally nothing on screen. IMAGES count as "no source" too: a still has no
  // timeline of its own (the compositor draws m.el with no time argument), so 4× an image is still
  // the same single frame. Rather than leave a control that silently does nothing, the card is shown
  // but disabled — same treatment Volume already gets on a layer with no audio.
  function layerHasSource(layer) { return !!layer && layer.type === 'video'; }   // 'video' covers audio-only clips (mp3/wav ride the same path)

  /* ---- Visual / Audio switch (queue 45) --------------------------------------------------------
   * Ezra: "move the audio effects to the effects menu but put a toggle at the top that switches from
   * showing you either the normal effects or audio ones, you can just grey it out and make it not
   * selectable if a layer has no audio."
   * ONE builder, three homes: the Effects panel here, and the two full-screen browsers (fx-browser.js
   * and audio-fx-browser.js call FM.fxModeToggle). Three hand-rolled copies would have drifted.
   *
   * "Has audio" is a DECODED TRACK, never the word "video" — silent screen recordings are ordinary.
   * FM.hasAudioTrack answers true/false/null and null means "not probed yet", which reads as YES:
   * greying out a side that would have worked is worse than one that turns out empty, and the caller
   * kicks FM.probeAudioTrack to settle it. The greyed side stays VISIBLE and dim and says why when
   * tapped — the same language as the disabled Volume card, which is the pattern everywhere. */
  function audioSideOk(layer) {
    const known = FM.hasAudioTrack ? FM.hasAudioTrack(layer) : (!!layer && layer.type === 'video');
    return known !== false;
  }
  function visualSideOk(layer) { return !isAudioOnly(layer); }   // a song is 0×0: no picture to put an effect on
  // Settle an unknown audio answer without blocking the UI. Only a NO changes anything on screen (the
  // optimistic render already assumed yes), so only a no re-renders — which also means no refresh loop.
  function probeAudioSide(layer, onNo) {
    if (!layer || !FM.probeAudioTrack) return;
    if (!FM.hasAudioTrack || FM.hasAudioTrack(layer) !== null) return;
    const id = layer.id;
    FM.probeAudioTrack(layer).then(v => { if (v === false) onNo(id); });
  }
  function fxModeToggle(layer, current, onPick) {
    const wrap = el('div', 'fxmode');
    const okAudio = audioSideOk(layer), okVisual = visualSideOk(layer);
    [['visual', 'Effects', okVisual], ['audio', 'Audio', okAudio]].forEach(([key, label, ok]) => {
      const b = el('button', 'fxmode-btn' + (current === key ? ' on' : '') + (ok ? '' : ' off'), label);
      b.title = ok ? (key === 'audio' ? 'Audio effects for this clip’s sound' : 'Effects for the picture')
        : (key === 'audio' ? 'This layer has no audio' : 'This is an audio clip — it has no picture');
      b.addEventListener('click', () => {
        if (!ok) {
          if (FM.toast) FM.toast(key === 'audio'
            ? (layer && layer.type === 'video' ? 'This clip has no audio track — there’s nothing for an audio effect to work on' : 'This layer has no audio')
            : 'This is an audio clip — there’s no picture for a visual effect to change', 1800);
          return;
        }
        if (key !== current) onPick(key);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }
  // The browsers live in their own files; they build the identical control from this.
  FM.fxModeToggle = fxModeToggle;
  FM.fxAudioSideOk = audioSideOk;
  FM.fxProbeAudioSide = probeAudioSide;
  // Which stack the Effects card is actually showing. A song is pinned to audio (nothing visual can
  // apply); a layer with no audio can only ever be on the visual side, whatever the tab last was.
  function fxTabFor(layer) {
    if (isAudioOnly(layer)) return 'audio';
    return (fxTab === 'audio' && audioSideOk(layer)) ? 'audio' : 'visual';
  }

  // Is `v` a category this layer can actually show? Guards against unreachable views — e.g. the timeline
  // dbl-click calling openCategory('element') on a VIDEO (which rendered a stale duplicate Volume slider
  // that DESTROYED keyframed volume), or a persisted 'volume'/'speed' view after a media replace.
  function viewAllowed(layer, v) {
    if (!layer || v === 'home') return true;
    if (v === 'speed') return layerHasSource(layer);   // speed only re-times a source clock — see layerHasSource
    if (v === 'volume') return layer.type === 'video';   // volume needs an audio track
    if (v === 'cameraopts') return layer.type === 'camera';   // the lens belongs to the camera and nothing else
    // Effects is the ONE view a song may still open, because since queue 45 the audio stack lives
    // behind it (fxTabFor pins a song to the audio side). It has to return before the gate below.
    if (v === 'effects') return true;
    // Past this point every view is a VISUAL one, and a song has no card for any of them — so nothing
    // may route into one either. A view persisted from the previously selected layer, or a timeline
    // double-click, would otherwise open a panel with no picture behind it. (Speed, Volume and
    // Effects have already returned above; those are the three a song does keep.)
    if (isAudioOnly(layer)) return false;
    if (v === 'element') return ['camera', 'group', 'null', 'adjustment'].indexOf(layer.type) < 0;   // shape/text/image/video
    if (v === 'masks') return false;   // card retired — masks live inside the Effects card (fall back home)
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
      const volDisabled = cat.key === 'volume' && !layerHasAudio(layer);   // Volume card shows on shapes/text but can't do anything with no audio
      const spdDisabled = cat.key === 'speed' && !layerHasSource(layer);   // same for Speed: nothing to re-time without video/audio frames
      if (volDisabled || spdDisabled) card.classList.add('cat-card-disabled');
      // Number badge (1-based) — press that key to open the category (see openCategoryByIndex).
      card.innerHTML = (i < 9 ? '<span class="cat-num">' + (i + 1) + '</span>' : '') + '<span class="cat-ico">' + svgIcon(cat.icon) + '</span><span class="cat-label">' + label + '</span>';
      card.addEventListener('click', () => {
        if (volDisabled) { if (FM.toast) FM.toast('This layer has no audio', 1200); return; }   // pressing Volume on a no-audio layer does nothing (Ezra)
        if (spdDisabled) { if (FM.toast) FM.toast('Speed only re-times video or audio — this layer has neither', 1800); return; }   // it used to open a panel whose slider changed nothing on screen
        if (cat.key === 'editgroup') { if (FM.enterGroup) FM.enterGroup(layer.id); return; }   // opens the group's own timeline
        // Text: open the focused editor SYNCHRONOUSLY inside this tap — iOS only pops the keyboard
        // when .focus() runs in the gesture's call stack (the refresh() interception's setTimeout won't).
        if (cat.key === 'element' && layer.type === 'text' && FM.textEdit) { FM.textEdit.start(layer.id); return; }
        if (cat.key === 'effects') fxTab = 'visual';   // the card always means the visual stack; the toggle inside is how you reach the audio one
        view = cat.key; kfNavSync(); FM._mtAxis = 'xy'; FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._fxEasing = null; FM._cropEasing = false; FM.inspector.refresh();
      });
      (i < 3 ? top : bot).appendChild(card);
    });
    // No row-fill classes any more. Stretching the last card to close the gap is what made Presets
    // two columns wide and Effects a full-width band, and those two then read as bigger, more
    // important things than the cards around them. The grid centres a short last row instead
    // (styles.css .cat-grid) — every card the same size, and no lopsided corner either way.
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

  // ===== Color & Fill — Alight Motion's None / Solid / Gradient / Media selector =====
  const FILL_ICO = {
    none: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M6.4 6.4l11.2 11.2"/></svg>',
    solid: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2c2.9 3.8 5.8 6.3 5.8 9.8a5.8 5.8 0 0 1-11.6 0c0-3.5 2.9-6 5.8-9.8z"/></svg>',
    gradient: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M20 6.5 6.5 20" fill="none"/><path d="M20 4v16H4z" fill="currentColor" stroke="none" opacity=".5"/></svg>',
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M12 9.1l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3L8.7 11.5l2.3-.3z" fill="currentColor" stroke="none"/></svg>',
    noneBig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>',
    gLinear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="7" width="16" height="10" rx="2"/><path d="M9 7v10M14 7v10" stroke-width="1" opacity=".75"/></svg>',
    gRadial: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="4"/></svg>',
    gAngular: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 12 20 4M12 12v-8" stroke-width="1"/></svg>',
  };
  // A shape's solid colour lives on layer.fill; text's on layer.color — one accessor for both.
  // Keyframe-aware: get evaluates at the playhead; set upserts a keyframe when the prop is animated.
  function fillColorKey(layer) { return layer.type === 'text' ? 'color' : 'fill'; }
  function fillColorGet(layer) { return FM.evalProp(layer[fillColorKey(layer)], FM.time) || (layer.type === 'text' ? '#ffffff' : '#3a7bd5'); }
  function fillColorSet(layer, v) { FM.setProp(layer, fillColorKey(layer), v, FM.time); }
  // Exposed so the AM-style text-edit overlay (text-edit.js) can drive the text fill through the same
  // keyframe-aware accessors instead of clobbering an animated colour.
  FM._fillGet = fillColorGet; FM._fillSet = fillColorSet;
  const FILL_SWATCHES = ['#ffffff', '#000000', '#7c4dff', '#8a8f98', '#e53935', '#ff1744', '#ff4dd2', '#ff6e40', '#ffd740', '#00e5c0', '#18c8ff', '#2979ff', '#00c853', '#b0ff57', '#a1887f', '#5d4037'];

  // Pick + downscale an image → self-contained data URL on layer.fillImage (keeps localStorage small).
  function pickFillImage(layer) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const img = new Image();
      img.onload = () => {
        const max = 1024, sc = Math.min(1, max / Math.max(img.width, img.height));
        const cw = Math.max(1, Math.round(img.width * sc)), ch = Math.max(1, Math.round(img.height * sc));
        const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
        cv.getContext('2d').drawImage(img, 0, 0, cw, ch);
        try { layer.fillImage = cv.toDataURL('image/jpeg', 0.85); } catch (e) { if (FM.toast) FM.toast('Could not read image'); return; }
        layer.fillMode = 'media';
        try { URL.revokeObjectURL(img.src); } catch (e) {}
        FM.requestRender(); FM.inspector.refresh(); commitH();
      };
      img.onerror = () => { if (FM.toast) FM.toast('Could not load image'); };
      img.src = URL.createObjectURL(f);
    });
    inp.click();
  }

  /* Which fill (if any) the on-canvas drag tool should own for this layer right now. Media only
   * counts once a picture has actually been chosen — until then the tab is just a file picker and
   * there is nothing on the canvas to move. */
  function fillDragMode(layer) {
    if (!layer) return null;
    const m = FM.fillModeOf ? FM.fillModeOf(layer) : layer.fillMode;
    if (m === 'gradient' && layer.fillGradient) return 'gradient';
    if (m === 'media' && layer.fillImage) return 'media';
    return null;
  }
  FM._fillDragMode = fillDragMode;

  /* "Position" row for the Gradient / Media tabs: the ◆ that animates the offset, and a Reset.
   * The drag itself happens on the CANVAS (fill-drag.js) — this row exists so the gesture is
   * discoverable, undoable to centre, and keyframeable without a second UI for it. */
  function fillPosRow(layer, mode) {
    const wrap = el('div', 'fill-pos');
    const head = el('div', 'prop-row');
    head.appendChild(el('label', null, 'Position'));
    const ref = FM.fillDrag.propRef(layer, mode);
    const kfBtn = el('button', 'fill-kf');
    const paintKf = () => {
      const anim = ref.keys.some(k => FM.isAnimated(ref.obj && ref.obj[k]));
      const at = anim && ref.keys.some(k => FM.hasKeyframeAt(ref.obj && ref.obj[k], FM.time));
      kfBtn.textContent = at ? '◆' : '◇';
      kfBtn.classList.toggle('on', !!anim);
      kfBtn.classList.toggle('here', !!at);
      kfBtn.title = anim ? ('Position keyframes — tap to ' + (at ? 'remove the one here' : 'add one here'))
        : 'Animate the fill position: add a keyframe at the playhead';
    };
    paintKf();
    kfBtn.addEventListener('click', () => {
      if (!ref.obj) return;
      ref.keys.forEach(k => FM.toggleProp(ref.obj, k, FM.time, 0));
      paintKf(); FM.requestRender(); commitH(); if (FM.timeline) FM.timeline.rebuild();
    });
    head.appendChild(kfBtn);
    const rs = el('button', 'fill-pos-reset', 'Centre');
    rs.addEventListener('click', () => { FM.fillDrag.reset(); FM.inspector.refresh(); });
    head.appendChild(rs);
    wrap.appendChild(head);
    wrap.appendChild(el('div', 'insp-hint', mode === 'gradient'
      ? 'Drag on the canvas to move the gradient. The corner handles still scale the layer.'
      : 'Drag on the canvas to reposition the picture inside the shape.'));
    return wrap;
  }

  function fillPanel(layer, body) {
    if (!layer.fillMode) layer.fillMode = FM.fillModeOf ? FM.fillModeOf(layer) : 'solid';
    if (layer.fillOpacity == null) layer.fillOpacity = 1;
    const isText = layer.type === 'text';
    const openStroke = layer.type === 'shape' && (layer.shape === 'line' || layer.shape === 'arc' || layer.shape === 'spiral' || (layer.shape === 'path' && !layer.closed));
    let modes;
    if (openStroke) modes = [['solid', 'Colour']];                                   // a line/arc is just its colour
    else if (isText) modes = [['solid', 'Solid'], ['gradient', 'Gradient']];
    else modes = [['none', 'None'], ['solid', 'Solid'], ['gradient', 'Gradient'], ['media', 'Media']];
    if (!modes.some(m => m[0] === layer.fillMode)) layer.fillMode = 'solid';

    const tabs = el('div', 'fill-tabs');
    modes.forEach(m => {
      const b = el('button', 'fill-tab' + (layer.fillMode === m[0] ? ' on' : ''));
      b.innerHTML = FILL_ICO[m[0]]; b.title = m[1];
      b.addEventListener('click', () => {
        layer.fillMode = m[0];
        if (m[0] === 'gradient') { if (!layer.fillGradient) layer.fillGradient = { enabled: true, type: 'linear', angle: 90, c0: fillColorGet(layer), c1: '#0a0c10' }; layer.fillGradient.enabled = true; }
        else if (layer.fillGradient) layer.fillGradient.enabled = false;   // keep legacy renderers in sync with the tab
        FM.requestRender(); FM.inspector.refresh(); commitH();
      });
      tabs.appendChild(b);
    });
    body.appendChild(tabs);
    const opacityRow = () => rangeRow('Opacity', () => Math.round((layer.fillOpacity != null ? layer.fillOpacity : 1) * 100), v => { layer.fillOpacity = Math.max(0, Math.min(1, v / 100)); const s = body.querySelector('.fill-hex'); if (s) s.textContent = normHex(fillColorGet(layer)).toUpperCase() + '   ' + Math.round(layer.fillOpacity * 100) + '%'; }, 0, 100, 1);

    const mode = layer.fillMode;
    if (mode === 'none') {
      const n = el('div', 'fill-none'); n.innerHTML = FILL_ICO.noneBig + '<span>No fill</span>';
      body.appendChild(n);
      return;
    }
    if (mode === 'solid') {
      const head = el('div', 'fill-readout');
      head.appendChild(el('span', 'fill-hex', normHex(fillColorGet(layer)).toUpperCase() + '   ' + Math.round((layer.fillOpacity != null ? layer.fillOpacity : 1) * 100) + '%'));
      // Keyframe diamond — animate the colour over time (AM). Filled when a keyframe sits at the
      // playhead; toggling on/off converts static ↔ animated exactly like the transform props.
      const ckey = fillColorKey(layer);
      const kfBtn = el('button', 'fill-kf');
      const paintKf = () => {
        const p = layer[ckey], anim = FM.isAnimated(p);
        const at = anim && p.kf.some(k => Math.abs(k.t - FM.time) < 1e-3);
        kfBtn.textContent = at ? '◆' : '◇';
        kfBtn.classList.toggle('on', !!anim);
        kfBtn.classList.toggle('here', !!at);   // amber when the playhead is on a keyframe (press = delete)
        kfBtn.title = anim ? (p.kf.length + ' colour keyframe' + (p.kf.length === 1 ? '' : 's') + ' — tap to ' + (at ? 'remove one here' : 'add one here')) : 'Animate colour: add a keyframe at the playhead';
      };
      paintKf();
      kfBtn.addEventListener('click', () => { FM.toggleProp(layer, ckey, FM.time, fillColorGet(layer)); paintKf(); FM.requestRender(); commitH(); if (FM.timeline) FM.timeline.rebuild(); });
      head.appendChild(kfBtn);
      body.appendChild(head);
      const grid = el('div', 'swatch-grid');
      FILL_SWATCHES.forEach(c => {
        const cell = el('button', 'swatch-cell' + (normHex(fillColorGet(layer)) === normHex(c) ? ' on' : ''));
        cell.style.background = c; cell.title = c;
        cell.addEventListener('click', () => { fillColorSet(layer, normHex(c)); addRecentColor(c); FM.requestRender(); FM.inspector.refresh(); commitH(); });
        grid.appendChild(cell);
      });
      body.appendChild(grid);
      const cr = el('div', 'prop-row'); cr.appendChild(el('label', null, 'Custom'));
      cr.appendChild(colorField(() => fillColorGet(layer), v => { fillColorSet(layer, v); const s = body.querySelector('.fill-hex'); if (s) s.textContent = normHex(v).toUpperCase() + '   ' + Math.round((layer.fillOpacity != null ? layer.fillOpacity : 1) * 100) + '%'; }));
      body.appendChild(cr);
      body.appendChild(opacityRow());
      return;
    }
    if (mode === 'gradient') {
      if (!layer.fillGradient) layer.fillGradient = { enabled: true, type: 'linear', angle: 90, c0: fillColorGet(layer), c1: '#0a0c10' };
      const g = layer.fillGradient; g.enabled = true;
      const prev = el('div', 'grad-preview');
      const paintPrev = () => {
        const c0 = g.c0 || '#ffffff', c1 = g.c1 || '#000000', a = g.angle || 0;
        prev.style.background = g.type === 'radial' ? ('radial-gradient(circle at 50% 50%, ' + c0 + ', ' + c1 + ')')
          : g.type === 'angular' ? ('conic-gradient(from ' + a + 'deg at 50% 50%, ' + c0 + ', ' + c1 + ', ' + c0 + ')')
            : ('linear-gradient(' + (a + 90) + 'deg, ' + c0 + ', ' + c1 + ')');
      };
      paintPrev(); body.appendChild(prev);
      const types = el('div', 'grad-types');
      [['linear', 'Linear', FILL_ICO.gLinear], ['radial', 'Radial', FILL_ICO.gRadial], ['angular', 'Angular', FILL_ICO.gAngular]].forEach(tt => {
        const b = el('button', 'grad-type' + (g.type === tt[0] ? ' on' : '')); b.innerHTML = tt[2]; b.title = tt[1];
        b.addEventListener('click', () => { g.type = tt[0]; FM.requestRender(); FM.inspector.refresh(); commitH(); });
        types.appendChild(b);
      });
      body.appendChild(types);
      [['Colour 1', 'c0'], ['Colour 2', 'c1']].forEach(pair => {
        const r = el('div', 'prop-row'); r.appendChild(el('label', null, pair[0]));
        r.appendChild(colorField(() => g[pair[1]] || '#ffffff', v => { g[pair[1]] = v; paintPrev(); }));
        body.appendChild(r);
      });
      if (g.type !== 'radial') body.appendChild(rangeRow('Angle', () => g.angle || 0, v => { g.angle = v; paintPrev(); }, 0, 360, 1));
      if (FM.fillDrag) { FM.fillDrag.start(layer.id, 'gradient'); body.appendChild(fillPosRow(layer, 'gradient')); }
      body.appendChild(opacityRow());
      return;
    }
    if (mode === 'media') {
      if (layer.fillImage) { const prev = el('div', 'fill-media-prev'); prev.style.backgroundImage = 'url(' + layer.fillImage + ')'; body.appendChild(prev); }
      const pick = el('button', 'btn fill-media-pick', layer.fillImage ? 'Replace image' : 'Select image');
      pick.addEventListener('click', () => pickFillImage(layer));
      body.appendChild(pick);
      if (layer.fillImage) {
        const rm = el('button', 'btn fill-media-rm', 'Remove image');
        rm.addEventListener('click', () => { delete layer.fillImage; layer.fillMode = 'solid'; FM.requestRender(); FM.inspector.refresh(); commitH(); });
        body.appendChild(rm);
        if (FM.fillDrag) { FM.fillDrag.start(layer.id, 'media'); body.appendChild(fillPosRow(layer, 'media')); }
        body.appendChild(opacityRow());
      }
      body.appendChild(el('div', 'insp-hint', 'The picture fills the shape — cover-fit and clipped to its outline.'));
      return;
    }
  }
  FM._fillPanel = fillPanel;

  // ===== Move & Transform — Alight Motion's mode-rail editor (Move / Rotate / Scale / Skew) =====
  const MT_ICONS = {
    track: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
    move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/></svg>',
    rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7.5" y="7.5" width="9" height="9" rx="1.6"/><path d="M18.5 6.5a7 7 0 0 0-5-2.5"/><path d="M13.2 2.6 13.5 4l-1.4.4"/></svg>',
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6"/><path d="M9 15 15 9"/></svg>',
    skew: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5h12l-4 14H4z"/></svg>',
    ease: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19c5 0 5-14 16-14"/><circle cx="4" cy="19" r="1.4" fill="currentColor"/><circle cx="20" cy="5" r="1.4" fill="currentColor"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6"/><path d="M9 8H7a4 4 0 0 0 0 8h2"/><path d="M15 8h2a4 4 0 0 1 0 8h-2"/></svg>',
    path: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18c4-10 12-2 16-12"/><circle cx="4" cy="18" r="1.8" fill="currentColor" stroke="none"/><circle cx="12" cy="11.3" r="1.8" fill="currentColor" stroke="none"/><circle cx="20" cy="6" r="1.8" fill="currentColor" stroke="none"/></svg>',
  };
  const MT_MODES = ['move', 'rotate', 'scale', 'skew'];
  // 'anchor' is a real mode but deliberately NOT a fifth rail button: pressing Move while already in
  // Move switches to it (Ezra), so the rail stays four wide and the anchor is one tap from where you
  // already are. MT_MODES is what the rail renders; ALL_MT_MODES is what the panel accepts.
  const ALL_MT_MODES = ['move', 'rotate', 'scale', 'skew', 'anchor'];
  const MT_TITLES = { move: 'Move', rotate: 'Rotate', scale: 'Scale', skew: 'Skew', anchor: 'Anchor point' };
  // anchor is deliberately EMPTY: the compositor reads tr.anchorX/anchorY as RAW NUMBERS (see
  // `-sw * tr.anchorX` in compositor.js), so letting the ◆ turn one into a {kf:[…]} object produces
  // NaN and the layer disappears entirely. The mode still needs an entry here or the keyframe rail
  // throws the moment you enter it.
  const MT_PROPS = { move: ['x', 'y', 'z'], rotate: ['rotation', 'rotationX', 'rotationY'], scale: ['scale', 'scaleX', 'scaleY'], skew: ['skewX', 'skewY'], anchor: [] };
  // The channels a mode keyframes by DEFAULT (matches Alight Motion). The extra channels (z for Move,
  // scaleX/scaleY for Scale) are only keyframed when they're actually in use — otherwise a plain
  // position/scale keyframe would needlessly animate Z / break uniform scale into non-uniform. (#17)
  const MT_PRIMARY = { move: ['x', 'y'], rotate: ['rotation'], scale: ['scale'], skew: ['skewX', 'skewY'], anchor: [] };
  const MT_DEF = { x: 0, y: 0, z: 0, rotation: 0, rotationX: 0, rotationY: 0, scale: 1, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, anchorX: 0.5, anchorY: 0.5 };

  function mtEval(layer, key) { const p = layer.transform[key]; return p == null ? MT_DEF[key] : FM.evalProp(p, FM.time); }
  function mtSet(layer, key, v) { FM.setTransform(layer, key, v, FM.time); FM.requestRender(); if (FM.timeline) FM.timeline.updatePlayhead(); }
  // X/Y setter that SNAPS to the shared align targets (centre / edges / this layer's keyframe
  // positions) so Move & Transform keeps things aligned just like canvas dragging, and flashes the
  // matching guide line on the canvas so you can see the snap. (Ezra)
  function mtSetXY(layer, key, v, typed) {
    if (typed) { mtSet(layer, key, v); return; }   // a TYPED value is exact — snapping/rounding silently rewrote it (545 became 540)
    let target = null;
    if (FM.snapAxis) { const s = FM.snapAxis(layer, key, v, 8); v = s.v; if (s.hit) target = s.target; }
    if (FM.showAlignGuide) FM.showAlignGuide(key === 'x' ? target : null, key === 'y' ? target : null);
    mtSet(layer, key, Math.round(v));
  }

  // A value box: shows the number (drag horizontally to scrub, tap to type) + a label beneath.
  function mtVBox(labelText, getVal, setVal, opts) {
    opts = opts || {}; const dp = opts.dp != null ? opts.dp : 1;
    const box = el('div', 'mt-vbox');
    const val = el('div', 'mt-vbox-val');
    const lab = el('div', 'mt-vbox-lab', labelText);
    // Move mode's X / Y / Z boxes double as the pad's mode switch (v5.43, AM): the label under the
    // number is the target, NOT the number itself — tapping the number already opens the type-in
    // editor, and taking that over would trade one thing for another.
    //
    // That same name is now also the ROW SELECTOR (AM): tapping it picks which property's keyframes
    // you are editing. The two live on one tap because they never disagree — the pad axis and the
    // selection are both "this is the channel I'm working on". Where a tap ALSO changes the axis it
    // selects rather than toggles, because that tap is unambiguously "I want this one".
    const selKey = (opts.kfKey && opts.layer) ? ('tf:' + opts.kfKey) : null;
    const selectable = !!(selKey && kfInScope(opts.layer, selKey));
    if (opts.axis) {
      lab.classList.add('mt-vbox-axis');
      const axisOn = (FM._mtAxis || 'xy') === opts.axis;
      box.classList.add(axisOn ? 'mt-axis-on' : 'mt-axis-off');   // the VALUE follows the axis too (AM)
      if (axisOn) lab.classList.add('on');
    }
    if (selectable) {
      const on = kfIsSel(opts.layer, selKey);
      lab.classList.add('kf-selectable');
      if (on) lab.classList.add('kf-sel');
      lab.setAttribute('role', 'button');
      lab.setAttribute('aria-pressed', String(on));
      lab.tabIndex = 0;
      lab.title = (on ? 'Editing ' + labelText + ' — tap to deselect' : 'Select ' + labelText)
        + (opts.axis ? (opts.axis === 'z' ? ' (and edit Z on the pad)' : ' (and edit X/Y on the pad)') : '')
        + ' — its keyframes become the ones you edit';
    } else if (opts.axis) {
      lab.title = opts.axis === 'z' ? 'Edit Z (depth) on the pad' : 'Edit X and Y on the pad';
    }
    if (opts.axis || selectable) {
      const onName = e => {
        e.stopPropagation();
        let axisChanged = false;
        if (opts.axis && (FM._mtAxis || 'xy') !== opts.axis) { FM._mtAxis = opts.axis; axisChanged = true; }
        if (selectable) kfSetSel(opts.layer, selKey, axisChanged ? 'on' : 'toggle');
        else FM.inspector.refresh();
      };
      lab.addEventListener('click', onName);
      // Space must not reach the window-level play/pause shortcut — see paramName.
      if (selectable) lab.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onName(e); } });
    }
    const fmtS = () => round(getVal(), dp).toFixed(dp) + (opts.unit || '');
    const refresh = () => { if (!val.isContentEditable) val.textContent = fmtS(); };
    refresh(); box.appendChild(val); box.appendChild(lab);
    // Per-slider keyframe diamond (Ezra: "Every single Individual slider needs to have its own key
    // frames … moving the clip around and zooming in need to be seperate"). It keys ONLY opts.kfKey,
    // so X and Y are genuinely independent tracks — unlike the mode-level ◆, which keys every channel
    // in MT_PRIMARY at once and is what tied them together. The data model always supported this:
    // FM.setTransform/toggleKeyframe work on a single property.
    if (opts.kfKey && opts.layer) {
      const kL = opts.layer, kKey = opts.kfKey;
      const kf = el('button', 'mt-vbox-kf');
      kf.type = 'button';
      kf.innerHTML = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 .8 9.2 5 5 9.2.8 5z"/></svg>';
      const on = FM.hasKeyframeAt(kL.transform[kKey], FM.time);
      if (on) kf.classList.add('on');
      else if (FM.isAnimated(kL.transform[kKey])) kf.classList.add('anim');
      kf.title = (on ? 'Remove the ' : 'Add a ') + labelText + ' keyframe at the playhead';
      kf.setAttribute('aria-label', kf.title);
      kf.addEventListener('click', (e) => {
        e.stopPropagation();
        if (kL.transform[kKey] == null) kL.transform[kKey] = MT_DEF[kKey];
        FM.toggleKeyframe(kL, kKey, FM.time);
        FM.requestRender();
        if (FM.timeline) FM.timeline.rebuild();
        FM.inspector.refresh();
        commitH();
      });
      box.appendChild(kf);
    }
    const clamp = v => { if (opts.min != null) v = Math.max(opts.min, v); if (opts.max != null) v = Math.min(opts.max, v); return v; };
    let drag = null;
    // Dragging the number is a scrub too, so it flicks like every other one.
    const applyDx = (dx) => {
      const before = getVal(), v = clamp(before + dx * (opts.scrub || 1));
      setVal(v); refresh(); if (opts.onScrub) opts.onScrub();
      return Math.abs(getVal() - before) > 1e-9;
    };
    const glide = attachGlide(val, applyDx, () => { commitH(); FM.inspector.refresh(); });
    val.addEventListener('pointerdown', e => { if (val.isContentEditable) { glide.cancelDrag(); return; } drag = { x: e.clientX, moved: false }; try { val.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
    val.addEventListener('pointermove', e => {
      if (!drag) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) { const moved = drag.moved; drag = null; glide.cancelDrag(); if (moved) { commitH(); FM.inspector.refresh(); } return; }
      const dx = e.clientX - drag.x; drag.x = e.clientX;
      if (!drag.moved && Math.abs(dx) > 2) drag.moved = true;
      if (drag.moved && dx) applyDx(dx);
    });
    // A TAP (never moved) opens the type-in editor and must not glide — cancel the momentum first.
    // EXCEPT on a box whose axis is not the live one. Ezra: "when pressing on z to edit its position and
    // same with X Y, you should be able to press on the number as well, not just the tiny little Z."
    // The original note here argued the number could not be the switch because tapping it already opens
    // the type-in editor — but that is only a conflict if both must happen on the same tap. Selecting
    // first and editing second resolves it and takes nothing away: the whole box is now the switch
    // instead of a 12px label, and typing into a box you were not already editing costs one extra tap.
    // Scrubbing by dragging the number is untouched either way.
    val.addEventListener('pointerup', e => {
      if (!drag) return;
      const moved = drag.moved; drag = null;
      try { val.releasePointerCapture(e.pointerId); } catch (_) {}
      if (moved) return;
      glide.cancelDrag();
      if (opts.axis && (FM._mtAxis || 'xy') !== opts.axis) { FM._mtAxis = opts.axis; FM.inspector.refresh(); return; }
      startEdit();
    });
    val.addEventListener('pointercancel', e => { if (!drag) return; const moved = drag.moved; drag = null; glide.cancelDrag(); try { val.releasePointerCapture(e.pointerId); } catch (_) {} if (moved) { commitH(); FM.inspector.refresh(); } });   // OS-cancelled scrub commits its value to history (never opens the editor)
    function startEdit() {
      val.contentEditable = 'true'; val.classList.add('editing'); val.textContent = String(round(getVal(), dp)); val.focus();
      const r = document.createRange(); r.selectNodeContents(val); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      const finish = commit => { val.removeEventListener('blur', onBlur); val.removeEventListener('keydown', onKey); val.contentEditable = 'false'; val.classList.remove('editing'); if (commit) { const n = parseFloat(val.textContent); if (!isNaN(n)) { setVal(clamp(n), true); commitH(); } } refresh(); FM.inspector.refresh(); };
      const onBlur = () => finish(true);
      const onKey = e => { if (e.key === 'Enter') { e.preventDefault(); val.blur(); } else if (e.key === 'Escape') { e.preventDefault(); finish(false); } };
      val.addEventListener('blur', onBlur); val.addEventListener('keydown', onKey);
    }
    box._refresh = refresh; return box;
  }

  // A horizontal tick-strip you drag to scrub a value.
  // The ruler TRAVELS under the fixed centre line, and a flick keeps gliding and eases to a stop, the
  // same way the timeline does (Ezra: "stiff and don't actually show any movement… should glide
  // slightly, like how the timeline does when you do a hard swipe"). The strip used to be a static
  // texture: only the number above it changed, so the control gave no sense of having moved at all,
  // and a big change meant many short drags because a fast one was worth no more than a slow one.
  function mtScrub(getVal, setVal, scrub, onChange) {
    const strip = el('div', 'mt-scrub'); strip.appendChild(el('div', 'mt-scrub-ticks')); strip.appendChild(el('div', 'mt-scrub-mid'));
    let drag = null, offset = 0;
    // Both background layers (coarse + fine ruling) scroll together. Only the X longhand is set, so
    // the shorthand's `center` Y survives; repeat-x means the offset can grow forever without a seam.
    const paint = () => { strip.style.backgroundPositionX = offset + 'px, ' + offset + 'px'; };
    // Apply dx SCREEN pixels of scrub. Returns false when the value refused to move (clamped at its
    // end) so the glide can die there instead of spinning against a wall.
    const applyDx = (dx) => {
      const before = getVal(), raw = before + dx * scrub;
      setVal(raw);
      offset += dx; paint();
      if (onChange) onChange();
      return Math.abs(getVal() - before) > 1e-9;
    };
    // Same momentum as every other scrubber — one implementation, so they cannot drift apart in feel.
    const glide = attachGlide(strip, applyDx, () => { commitH(); if (onChange) onChange(); });
    strip.addEventListener('pointerdown', e => {
      drag = { x: e.clientX };
      try { strip.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    strip.addEventListener('pointermove', e => {
      if (!drag) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) { drag = null; glide.cancelDrag(); commitH(); if (onChange) onChange(); return; }
      const dx = e.clientX - drag.x; drag.x = e.clientX;
      if (dx) applyDx(dx);
    });
    strip.addEventListener('pointerup', e => { drag = null; try { strip.releasePointerCapture(e.pointerId); } catch (_) {} });
    strip.addEventListener('pointercancel', e => { if (!drag) return; drag = null; glide.cancelDrag(); try { strip.releasePointerCapture(e.pointerId); } catch (_) {} commitH(); if (onChange) onChange(); });
    return strip;
  }

  // ===== AM "Edit Shape" for media (photo/video) = a Size editor =====
  // AM "Edit Shape" for media = a CROP editor. Width/Height are the crop-frame size in SOURCE pixels;
  // shrinking them crops the photo/video (the content is NOT scaled — you just see less of it). The two
  // top-right controls (aspect-ratio lock + size-from-edge/center) and a keyframe + easing rail that
  // keyframes the crop. Both toggle states are session tools (like the MT mode), not saved.
  let _szLock = true, _szEdge = false;
  const ES_ICONS = {
    center: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="1.5"/><circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/></svg>',
    edge:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="1.5"/><circle cx="6.6" cy="6.6" r="2" fill="currentColor" stroke="none"/><path d="M11 6.6h9M6.6 11v9"/></svg>',
    crop:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2v13a2 2 0 0 0 2 2h13M2 7h13a2 2 0 0 1 2 2v13"/></svg>',
  };
  function cropMediaOf(layer) { const m = FM.media && FM.media.get(layer.id); return (m && m.width && m.height) ? m : null; }
  function ensureCrop(layer) { const m = cropMediaOf(layer); if (!m) return null; if (!layer.crop) layer.crop = { x: 0, y: 0, w: m.width, h: m.height }; return m; }

  // The two top-right controls (aspect lock + size origin). Built here so the inspector header can
  // place them at the far top-right, matching AM. Toggling re-renders the panel + canvas.
  function cropToggles(layer) {
    const top = el('div', 'es-toprow');
    const aspectBtn = el('button', 'es-toggle' + (_szLock ? ' on' : ''));
    aspectBtn.innerHTML = MT_ICONS.link;
    aspectBtn.title = _szLock ? 'Aspect Ratio Locked — the crop keeps its ratio' : 'Resize Freely — crop each side on its own';
    aspectBtn.addEventListener('click', () => { _szLock = !_szLock; if (FM.toast) FM.toast(_szLock ? 'Aspect Ratio Locked' : 'Resize Freely'); FM.inspector.refresh(); });
    const originBtn = el('button', 'es-toggle' + (_szEdge ? '' : ' on'));
    originBtn.innerHTML = _szEdge ? ES_ICONS.edge : ES_ICONS.center;
    originBtn.title = _szEdge ? 'Size from edge — the crop grows from the top-left corner' : 'Size from center — the crop grows around the middle';
    originBtn.addEventListener('click', () => { _szEdge = !_szEdge; if (FM.toast) FM.toast(_szEdge ? 'Size from edge' : 'Size from center'); FM.inspector.refresh(); });
    top.appendChild(aspectBtn); top.appendChild(originBtn);
    return top;
  }
  FM._inspectorCropToggles = cropToggles;   // the inspector header uses this to place the toggles top-right

  function mediaSizePanel(layer, body) {
    const m = cropMediaOf(layer);   // read-only — don't stamp a crop onto the layer just for viewing
    if (!m) { body.appendChild(el('div', 'insp-hint', 'This clip has no picture to crop.')); return; }
    const MW = m.width, MH = m.height;
    const CK = ['w', 'h', 'x', 'y'];
    const def = k => (k === 'w' ? MW : k === 'h' ? MH : 0);

    const panel = el('div', 'mt-panel es-media');
    const row = el('div', 'es-body');

    // left rail — keyframe the crop + easing curve
    const left = el('div', 'mt-rail mt-rail-left');
    const anim = !!layer.crop && CK.some(k => FM.isAnimated(layer.crop[k]));
    const onHere = !!layer.crop && CK.some(k => FM.hasKeyframeAt(layer.crop[k], FM.time));
    const kfBtn = el('button', 'mt-kf' + (anim ? ' active' : '') + (onHere ? ' here' : ''), '◆');
    kfBtn.title = onHere ? 'Remove crop keyframe at playhead' : 'Keyframe the crop at the playhead';
    kfBtn.addEventListener('click', () => {
      ensureCrop(layer);
      CK.forEach(k => { if (layer.crop[k] == null) layer.crop[k] = def(k); });
      const has = CK.some(k => FM.hasKeyframeAt(layer.crop[k], FM.time));   // add unless already there → then remove
      CK.forEach(k => { const kh = FM.hasKeyframeAt(layer.crop[k], FM.time); if ((!has && !kh) || (has && kh)) FM.toggleProp(layer.crop, k, FM.time, def(k)); });
      FM.requestRender(); if (FM.timeline) FM.timeline.rebuild(); FM.inspector.refresh(); commitH();
    });
    left.appendChild(kfBtn);
    const easeBtn = el('button', 'mt-ease'); easeBtn.innerHTML = MT_ICONS.ease; easeBtn.title = 'Easing curve';
    easeBtn.addEventListener('click', () => { FM._cropEasing = true; FM.inspector.refresh(); });
    left.appendChild(easeBtn);
    row.appendChild(left);

    // center — Width / Height crop boxes (source px)
    const cur = () => FM.cropOf(layer, FM.time);
    const getW = () => Math.round(cur().w), getH = () => Math.round(cur().h);
    let boxW, boxH;
    const syncAll = () => { if (boxW) boxW._refresh(); if (boxH) boxH._refresh(); FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); };
    function resizeCrop(axis, V) {
      ensureCrop(layer);
      const c = cur(); let nw = c.w, nh = c.h;
      if (axis === 'w') { nw = Math.max(1, Math.min(MW, Math.round(V))); if (_szLock) nh = Math.max(1, Math.min(MH, Math.round(nw * (c.h / c.w)))); }
      else { nh = Math.max(1, Math.min(MH, Math.round(V))); if (_szLock) nw = Math.max(1, Math.min(MW, Math.round(nh * (c.w / c.h)))); }
      let nx, ny;
      if (_szEdge) { nx = c.x; ny = c.y; }                                   // keep the top-left corner
      else { nx = Math.round(c.x + c.w / 2 - nw / 2); ny = Math.round(c.y + c.h / 2 - nh / 2); }   // keep centre
      nx = Math.max(0, Math.min(MW - nw, nx)); ny = Math.max(0, Math.min(MH - nh, ny));
      FM.setProp(layer.crop, 'w', nw, FM.time); FM.setProp(layer.crop, 'h', nh, FM.time);
      FM.setProp(layer.crop, 'x', nx, FM.time); FM.setProp(layer.crop, 'y', ny, FM.time);
    }
    boxW = mtVBox('Width', getW, v => resizeCrop('w', v), { dp: 0, min: 1, max: MW, onScrub: syncAll });
    boxH = mtVBox('Height', getH, v => resizeCrop('h', v), { dp: 0, min: 1, max: MH, onScrub: syncAll });
    const center = el('div', 'mt-center');
    const boxes = el('div', 'es-boxes'); boxes.appendChild(boxW); boxes.appendChild(boxH);
    center.appendChild(boxes);

    // Free crop (not in AM) — drag a box right on the playback area, iPhone-style.
    const tools = el('div', 'es-crop-tools');
    const freeBtn = el('button', 'btn es-freecrop'); freeBtn.innerHTML = ES_ICONS.crop + '<span>Free crop</span>';
    freeBtn.title = 'Drag a crop box directly on the video';
    freeBtn.addEventListener('click', () => { if (FM.cropTool) FM.cropTool.start(layer.id); });
    tools.appendChild(freeBtn);
    const cr0 = cur();
    if (!(cr0.w >= MW - 0.5 && cr0.h >= MH - 0.5)) {   // show Reset only when actually cropped
      const resetBtn = el('button', 'btn es-cropreset', 'Reset');
      resetBtn.title = 'Show the whole frame again';
      resetBtn.addEventListener('click', () => { layer.crop = { x: 0, y: 0, w: MW, h: MH }; FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); FM.inspector.refresh(); commitH(); });
      tools.appendChild(resetBtn);
    }
    center.appendChild(tools);
    if (anim) center.appendChild(el('div', 'insp-hint', 'Crop is keyframed — it animates between keyframes along the easing curve.'));
    row.appendChild(center);
    panel.appendChild(row);
    body.appendChild(panel);
  }

  // ===== AM "Edit Points" panel — edits the point selected on the canvas overlay =====
  // Tap a point on the canvas to select it (green); drag it there, or nudge it here with the X/Y
  // boxes / trackpad. Tap a hollow ring to ADD a point on the curve; ⊖ (or double-tap) deletes.
  // Curve/Corner set whether the outline flows through the point or bends hard at it.
  const PEP_ICONS = {
    curve: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 17c5-10 13-10 18 0"/><circle cx="12" cy="9.5" r="2.2" fill="currentColor" stroke="none"/></svg>',
    corner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 12 7l8 11"/><rect x="9.8" y="4.8" width="4.4" height="4.4" fill="currentColor" stroke="none"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/></svg>',
  };
  function editPointsTools(layer, body) {
    const pe = FM.pointEdit;
    const panel = el('div', 'mt-panel pep-panel');

    // left rail — curve / corner / delete for the selected point
    const left = el('div', 'mt-rail mt-rail-left');
    const curveBtn = el('button', 'pep-btn'); curveBtn.innerHTML = PEP_ICONS.curve; curveBtn.title = 'Curve — the outline flows smoothly through this point';
    const cornerBtn = el('button', 'pep-btn'); cornerBtn.innerHTML = PEP_ICONS.corner; cornerBtn.title = 'Corner — the outline bends hard at this point';
    const delBtn = el('button', 'pep-btn pep-del'); delBtn.innerHTML = PEP_ICONS.del; delBtn.title = 'Delete this point (double-tapping it on the canvas works too)';
    curveBtn.addEventListener('click', () => { pe.setSelSmooth(true); });
    cornerBtn.addEventListener('click', () => { pe.setSelSmooth(false); });
    delBtn.addEventListener('click', () => { pe.delSel(); });
    left.append(curveBtn, cornerBtn, delBtn);
    panel.appendChild(left);

    // center — X/Y of the selected point (project px) + trackpad
    const center = el('div', 'mt-center');
    const values = el('div', 'mt-values');
    const bx = mtVBox('X', () => { const s = pe.getSel(); return s ? s.x : 0; }, v => { const s = pe.getSel(); if (s) pe.setSelPos(v, s.y); }, { dp: 1, scrub: 1 });
    const by = mtVBox('Y', () => { const s = pe.getSel(); return s ? s.y : 0; }, v => { const s = pe.getSel(); if (s) pe.setSelPos(s.x, v); }, { dp: 1, scrub: 1 });
    values.append(bx, by); center.appendChild(values);
    const pad = el('div', 'mt-trackpad'); pad.appendChild(el('span', 'mt-trackpad-hint', 'Swipe here to move point'));
    const sens = ((FM.scene.project.width || 1080) / 300);
    let pd = null;
    pad.addEventListener('pointerdown', e => { pd = { x: e.clientX, y: e.clientY }; try { pad.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
    pad.addEventListener('pointermove', e => {
      if (!pd) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) { pd = null; pe.commit(); return; }
      pe.moveSel((e.clientX - pd.x) * sens, (e.clientY - pd.y) * sens);
      pd = { x: e.clientX, y: e.clientY };
    });
    pad.addEventListener('pointerup', e => { if (!pd) return; pd = null; try { pad.releasePointerCapture(e.pointerId); } catch (_) {} pe.commit(); });
    pad.addEventListener('pointercancel', e => { if (!pd) return; pd = null; try { pad.releasePointerCapture(e.pointerId); } catch (_) {} pe.commit(); });
    center.appendChild(pad);
    center.appendChild(el('div', 'insp-hint', 'Tap a point to select it · on a curve point, drag its handles to shape the curve · tap a hollow ring to add a point · double-tap to delete'));

    // stroke still belongs to the shape (open drawings need their line width here)
    if (!layer.stroke) layer.stroke = { enabled: false, width: 8, color: '#ffffff' };
    const stk = layer.stroke;
    if (layer.shape === 'path' && !layer.closed) {
      center.appendChild(rangeRow('Line width', () => stk.width, v => { stk.width = Math.max(1, v); }, 1, 60, 1));
    }
    panel.appendChild(center);
    body.appendChild(panel);

    // live sync: selection change re-tints the rail; moves refresh the value boxes
    const paint = () => {
      const s = pe.getSel();
      curveBtn.classList.toggle('on', !!(s && s.smooth));
      cornerBtn.classList.toggle('on', !!(s && !s.smooth));
      bx._refresh(); by._refresh();
    };
    paint();
    // one live listener, not one per refresh: every inspector refresh rebuilds this panel, and the
    // stale closures (each pinning detached DOM) accumulated in point-edit's callback list all session
    if (FM._peChangeFn && pe.offChange) pe.offChange(FM._peChangeFn);
    FM._peChangeFn = kind => { if (!document.body.contains(panel)) return; if (kind === 'move') { bx._refresh(); by._refresh(); } else paint(); };
    pe.onChange(FM._peChangeFn);
  }

  function moveTransformPanel(layer) {
    const mode = ALL_MT_MODES.indexOf(FM._mtMode) >= 0 ? FM._mtMode : 'move';
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
      // recompute at CLICK time — the build-time value goes stale the moment the playhead scrubs
      // (the panel isn't rebuilt on scrub), which made the diamond silently no-op or delete
      const add = !props.some(k => FM.hasKeyframeAt(layer.transform[k], FM.time));
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
    // Anchor mode owns no keyframable channel (MT_PROPS.anchor is empty — the compositor reads
    // anchorX/anchorY as raw numbers), so ◆ would be a dead button there. The easing one was worse
    // than dead: graph-editor has no `anchor` entry in MODE_PROPS and fell back to `all`, so pressing
    // it while placing a pivot re-eased position, rotation and scale. Neither is rendered.
    if (props.length) {
      left.appendChild(kfBtn);
      const easeBtn = el('button', 'mt-ease'); easeBtn.innerHTML = MT_ICONS.ease; easeBtn.title = 'Easing curve';
      easeBtn.addEventListener('click', () => { if (FM.openEasingCurve) FM.openEasingCurve(layer, mode); });
      left.appendChild(easeBtn);
    }
    // Auto motion/head track — video only, on the Move rail. Seeds from a tap, writes x/y keyframes.
    if (layer.type === 'video' && mode === 'move' && !layer.parent && FM.tracker) {
      const trk = el('button', 'mt-ease mt-track'); trk.innerHTML = MT_ICONS.track; trk.title = 'Auto-track a head / point (writes position keyframes you can then edit)';
      trk.addEventListener('click', () => FM.tracker.pick(layer));
      left.appendChild(trk);
    }
    // Motion path — on-canvas trajectory editor. ALWAYS drawn in Move mode: an appearing-from-nowhere
    // button is invisible to someone who hasn't keyframed yet, so the not-ready states render dimmed
    // and explain themselves on tap instead of not existing. (Parented layers stay unsupported — their
    // x/y live in the parent's space, which the overlay can't map yet.)
    if (mode === 'move' && FM.motionPath) {
      const ready = !layer.parent && (FM.isAnimated(layer.transform.x) || FM.isAnimated(layer.transform.y));
      const active = ready && FM.motionPath.isActive && FM.motionPath.isActive();
      const mp = el('button', 'mt-ease mt-path' + (active ? ' on' : '') + (ready ? '' : ' mt-dim')); mp.innerHTML = MT_ICONS.path;
      if (!ready) mp.style.opacity = '0.38';
      mp.title = !ready ? 'Motion path — keyframe X/Y first' : active ? 'Close the motion path editor' : 'Motion path — edit the trajectory on the canvas';
      mp.addEventListener('click', () => {
        if (!ready) {
          if (FM.toast) FM.toast(layer.parent ? 'Motion path works on unparented layers — unlink Parent first' : 'Keyframe X or Y first (tap ◆), then edit the path here', 2600);
          return;
        }
        if (FM.motionPath.isActive && FM.motionPath.isActive()) FM.motionPath.stop();
        else FM.motionPath.open(layer.id);
        FM.inspector.refresh();
      });
      left.appendChild(mp);
    }

    // center: value boxes + bespoke control per mode
    const center = el('div', 'mt-center');
    const values = el('div', 'mt-values');
    const control = el('div', 'mt-control');
    center.appendChild(values); center.appendChild(control);

    if (mode === 'move') {
      const bx = mtVBox('X', () => mtEval(layer, 'x'), (v, typed) => mtSetXY(layer, 'x', v, typed), { dp: 1, scrub: 1, kfKey: 'x', layer: layer, axis: 'xy' });
      const by = mtVBox('Y', () => mtEval(layer, 'y'), (v, typed) => mtSetXY(layer, 'y', v, typed), { dp: 1, scrub: 1, kfKey: 'y', layer: layer, axis: 'xy' });
      const bz = mtVBox('Z', () => mtEval(layer, 'z'), v => mtSet(layer, 'z', Math.round(v)), { dp: 1, scrub: 2, kfKey: 'z', layer: layer, axis: 'z' });
      refreshables.push(bx, by, bz); values.append(bx, by, bz);

      // ---- Z sub-mode (v5.43, AM): tap the Z label and the same pad becomes a depth slider ----
      // Ezra: "you just tap on z and then it switches to this version." It is a sub-mode of the move
      // pad rather than a fifth button on the mode rail, exactly as AM has it — Z is still position.
      // VERTICAL only, and the sign is chosen so the pad drags the OBJECT and not the number: pushing
      // your finger DOWN pushes the layer back into the scene (z grows = further away, which is the
      // same direction the fog and focus maths already read it), so it shrinks under a camera; pulling
      // UP brings it toward you and it grows. The chevrons say which axis the gesture runs on.
      if ((FM._mtAxis || 'xy') === 'z') {
        const zpad = el('div', 'mt-trackpad mt-zpad');
        zpad.appendChild(el('i', 'mt-zpad-arrow up'));
        const zhint = el('span', 'mt-trackpad-hint', 'Swipe here to adjust Z position');
        zpad.appendChild(zhint);
        zpad.appendChild(el('i', 'mt-zpad-arrow down'));
        const zsens = ((FM.scene.project.width || 1080) / 640) * 2;   // depth ranges wider than x/y
        let zd = null;
        zpad.addEventListener('pointerdown', e => {
          zd = { y: e.clientY, iz: mtEval(layer, 'z') };
          try { zpad.setPointerCapture(e.pointerId); } catch (_) {}
          e.preventDefault();
        });
        zpad.addEventListener('pointermove', e => {
          if (!zd) return;
          if (e.pointerType === 'mouse' && e.buttons === 0) { zd = null; commitH(); return; }
          mtSet(layer, 'z', Math.round(zd.iz + (e.clientY - zd.y) * zsens));
          refreshAllBoxes(); if (FM.canvasEdit) FM.canvasEdit.update();
        });
        const zEnd = e => { if (!zd) return; zd = null; try { zpad.releasePointerCapture(e.pointerId); } catch (_) {} commitH(); };
        zpad.addEventListener('pointerup', zEnd);
        zpad.addEventListener('pointercancel', zEnd);
        control.appendChild(zpad);
        if (layer.type !== 'camera') control.appendChild(el('div', 'insp-hint', 'Z sets depth — add a Camera (Add → Object) and pan it, and layers at different Z move with parallax.'));
      } else {

      // 2D trackpad
      const pad = el('div', 'mt-trackpad');
      const padHint = el('span', 'mt-trackpad-hint', 'Swipe here to move layer · snaps to centre, edges & earlier keyframes');
      // Snapping was invisible: the layer just stopped somewhere and you had to guess whether it had
      // actually landed on anything (Ezra: "there should be an indicator of grid snapping when you are
      // using the move and transform move pad"). Now the pad shows a rule on the axis that locked, the
      // hint NAMES what it locked onto, and the matching alignment guide flashes on the canvas — the
      // same guide the X/Y boxes already used but the pad never asked for.
      const padVRule = el('i', 'mt-pad-rule v'), padHRule = el('i', 'mt-pad-rule h');
      pad.appendChild(padVRule); pad.appendChild(padHRule); pad.appendChild(padHint);
      const PAD_HINT = padHint.textContent;
      const targetName = (v, axis) => {
        const P = FM.scene.project;
        if (axis === 'x') return v === P.width / 2 ? 'centre' : v === 0 ? 'left edge' : v === P.width ? 'right edge' : 'a keyframe';
        return v === P.height / 2 ? 'middle' : v === 0 ? 'top edge' : v === P.height ? 'bottom edge' : 'a keyframe';
      };
      let padLockSig = '';
      const showPadSnap = (hx, hy) => {
        pad.classList.toggle('snap-x', hx != null);
        pad.classList.toggle('snap-y', hy != null);
        const sig = (hx == null ? '-' : hx) + ',' + (hy == null ? '-' : hy);
        if (sig !== padLockSig) {
          padLockSig = sig;
          // a tick only when it CATCHES something, not on every frame it stays caught
          if ((hx != null || hy != null) && navigator.vibrate) { try { navigator.vibrate(8); } catch (err) {} }
        }
        if (hx == null && hy == null) { padHint.textContent = PAD_HINT; return; }
        const parts = [];
        if (hx != null) parts.push(targetName(hx, 'x'));
        if (hy != null) parts.push(targetName(hy, 'y'));
        padHint.textContent = 'Snapped to ' + parts.join(' + ');
      };
      // HALF the old gain (was width/300 — 3.6 project px per finger px on a 1080 comp, which made
      // fine placement impossible). This pad is the precision control now, so it trades reach for
      // control: a long swipe crosses the frame, a small one nudges.
      const sens = ((FM.scene.project.width || 1080) / 640);
      // SNAPPING LIVES HERE NOW (Ezra). The canvas drag used to snap and this didn't; it is the wrong
      // way round, because the coarse gesture should go exactly where you put it and the precision one
      // should help you land on something. Targets are the same set the canvas used: frame centre,
      // frame edges, and — the new one — the positions this layer sits at on its OWN earlier
      // keyframes, so you can put it back exactly where it was.
      // Returns the target it caught, or null — the caller needs to KNOW, not just get a number back.
      const snapT = (v, targets, thr) => {
        let best = null, bd = thr;
        for (let i = 0; i < targets.length; i++) { const d = Math.abs(v - targets[i]); if (d < bd) { bd = d; best = targets[i]; } }
        return best;
      };
      let pd = null;
      pad.addEventListener('pointerdown', e => {
        pd = { x: e.clientX, y: e.clientY, ix: mtEval(layer, 'x'), iy: mtEval(layer, 'y'),
               tx: FM.alignTargets ? FM.alignTargets(layer, 'x') : [FM.scene.project.width / 2, 0, FM.scene.project.width],
               ty: FM.alignTargets ? FM.alignTargets(layer, 'y') : [FM.scene.project.height / 2, 0, FM.scene.project.height] };
        try { pad.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault();
      });
      pad.addEventListener('pointermove', e => {
        if (!pd) return;
        if (e.pointerType === 'mouse' && e.buttons === 0) { pd = null; commitH(); return; }
        const thr = 9 * sens;   // ~9 finger px of stickiness, expressed in project units
        const rx = pd.ix + (e.clientX - pd.x) * sens, ry = pd.iy + (e.clientY - pd.y) * sens;
        const hx = snapT(rx, pd.tx, thr), hy = snapT(ry, pd.ty, thr);
        mtSet(layer, 'x', Math.round(hx == null ? rx : hx)); mtSet(layer, 'y', Math.round(hy == null ? ry : hy));
        showPadSnap(hx, hy);
        if (FM.showAlignGuide) FM.showAlignGuide(hx, hy);   // the line on the CANVAS — what did I line up with?
        refreshAllBoxes(); if (FM.canvasEdit) FM.canvasEdit.update();
      });
      const padEnd = e => { if (!pd) return; pd = null; try { pad.releasePointerCapture(e.pointerId); } catch (_) {} showPadSnap(null, null); commitH(); };
      pad.addEventListener('pointerup', padEnd);
      pad.addEventListener('pointercancel', padEnd);
      control.appendChild(pad);
      // The parallax payoff is otherwise undiscoverable — Z, the Camera object and "pans give depth"
      // live in three unconnected places. One line here connects them at the moment Z is in hand.
      if (layer.type !== 'camera') control.appendChild(el('div', 'insp-hint', 'Z sets depth — add a Camera (Add → Object) and pan it, and layers at different Z move with parallax.'));
      }
    } else if (mode === 'rotate') {
      const brot = mtVBox('Rotation', () => mtEval(layer, 'rotation'), v => mtSet(layer, 'rotation', v), { dp: 0, unit: '°', scrub: 0.5, kfKey: 'rotation', layer: layer });
      // Snap near-zero tilt to EXACT 0 — a scrubbed-back residual (±1e-6°) is invisible but flips the
      // renderer onto the full plate+quad 3D path and breaks the touched-then-reverted diff-free case.
      const snap0 = v => (Math.abs(v) < 0.01 ? 0 : v);
      const btx = mtVBox('X tilt', () => mtEval(layer, 'rotationX'), v => mtSet(layer, 'rotationX', snap0(v)), { dp: 0, unit: '°', scrub: 0.5, min: -180, max: 180, kfKey: 'rotationX', layer: layer });
      const bty = mtVBox('Y tilt', () => mtEval(layer, 'rotationY'), v => mtSet(layer, 'rotationY', snap0(v)), { dp: 0, unit: '°', scrub: 0.5, min: -180, max: 180, kfKey: 'rotationY', layer: layer });
      refreshables.push(brot, btx, bty); values.append(brot, btx, bty);
      const dial = el('div', 'mt-dial'); const ring = el('div', 'mt-dial-ring'); const knob = el('div', 'mt-dial-knob'); const read = el('div', 'mt-dial-read');
      // The readout goes INSIDE the ring, not beside it: as a child of the unpositioned .mt-dial it
      // was absolutely positioned against the whole inspector panel, so it centred on the PANEL and
      // landed ~35px above the ring's centre.
      ring.appendChild(knob); ring.appendChild(read); dial.appendChild(ring);
      const place = () => { const deg = mtEval(layer, 'rotation'); const rad = deg * Math.PI / 180; knob.style.left = (50 + Math.cos(rad) * 50) + '%'; knob.style.top = (50 + Math.sin(rad) * 50) + '%'; read.textContent = Math.round(deg) + '°'; };
      place(); syncFns.push(place);
      const ang = e => { const r = ring.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
      let rd = null;
      ring.addEventListener('pointerdown', e => { rd = { a: ang(e), v: mtEval(layer, 'rotation'), acc: 0 }; try { ring.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
      // Accumulate the angle incrementally, normalising each step into (-180,180], so dragging the
      // knob past the ±180° seam (9 o'clock) advances smoothly instead of snapping a full turn. (#3)
      ring.addEventListener('pointermove', e => { if (!rd) return; if (e.pointerType === 'mouse' && e.buttons === 0) { rd = null; commitH(); return; } const a = ang(e); let d = a - rd.a; d -= 360 * Math.round(d / 360); rd.acc += d; rd.a = a; mtSet(layer, 'rotation', Math.round(rd.v + rd.acc)); place(); brot._refresh(); if (FM.canvasEdit) FM.canvasEdit.update(); });
      ring.addEventListener('pointerup', e => { if (!rd) return; rd = null; try { ring.releasePointerCapture(e.pointerId); } catch (_) {} commitH(); });
      ring.addEventListener('pointercancel', e => { if (!rd) return; rd = null; try { ring.releasePointerCapture(e.pointerId); } catch (_) {} commitH(); });
      control.appendChild(dial);
    } else if (mode === 'scale') {
      const sz = FM.layerSize(layer);
      const effX = () => mtEval(layer, 'scale') * (layer.transform.scaleX != null ? mtEval(layer, 'scaleX') : 1);
      const effY = () => mtEval(layer, 'scale') * (layer.transform.scaleY != null ? mtEval(layer, 'scaleY') : 1);
      const link = FM._mtLink !== false;
      const setW = px => { const f = px / Math.max(1, sz.w); if (link) { mtSet(layer, 'scale', f); if (layer.transform.scaleX != null) mtSet(layer, 'scaleX', 1); if (layer.transform.scaleY != null) mtSet(layer, 'scaleY', 1); } else mtSet(layer, 'scaleX', f / Math.max(1e-4, mtEval(layer, 'scale'))); };
      const setH = px => { const f = px / Math.max(1, sz.h); if (link) { mtSet(layer, 'scale', f); if (layer.transform.scaleX != null) mtSet(layer, 'scaleX', 1); if (layer.transform.scaleY != null) mtSet(layer, 'scaleY', 1); } else mtSet(layer, 'scaleY', f / Math.max(1e-4, mtEval(layer, 'scale'))); };
      // scrub 0.35 instead of 1: size was the worst offender for "expands too quickly" (Ezra), because
      // one finger pixel moved the layer a whole project pixel of width.
      // Which channel each row's ◆ keys follows the LINK state, because that is what the row actually
      // writes: linked, both Width and Height drive the uniform `scale`, so both diamonds key `scale`
      // (clicking either is the same keyframe — correct, there is only one channel). Unlinked, Width
      // owns scaleX and Height owns scaleY, so they become independent tracks like X and Y.
      const bw = mtVBox('Width', () => sz.w * effX(), setW, { dp: 1, scrub: 0.35, min: 0, kfKey: link ? 'scale' : 'scaleX', layer: layer, onScrub: () => { if (FM.canvasEdit) FM.canvasEdit.update(); } });
      const bh = mtVBox('Height', () => sz.h * effY(), setH, { dp: 1, scrub: 0.35, min: 0, kfKey: link ? 'scale' : 'scaleY', layer: layer, onScrub: () => { if (FM.canvasEdit) FM.canvasEdit.update(); } });
      const linkBtn = el('button', 'mt-link' + (link ? ' on' : '')); linkBtn.innerHTML = MT_ICONS.link; linkBtn.title = link ? 'Aspect ratio linked' : 'Aspect ratio unlinked';
      linkBtn.addEventListener('click', () => { FM._mtLink = !link; FM.inspector.refresh(); });
      refreshables.push(bw, bh); values.append(bw, linkBtn, bh);
      if (link) {
        // linked: ONE strip driving the uniform scale, as before (0.004/px — was 0.01, i.e. 2.5x finer)
        control.appendChild(mtScrub(() => mtEval(layer, 'scale'), v => mtSet(layer, 'scale', Math.max(0.01, v)), 0.004, () => { refreshAllBoxes(); if (FM.canvasEdit) FM.canvasEdit.update(); }));
      } else {
        // UNLINKED: a SECOND strip appears below the first, and the two drive width and height
        // separately (Ezra: "in alight motion it opens up a second slider below the first one and the
        // two sliders will separately effect the width and height"). Before this, unlinking only
        // changed what the two number boxes wrote — the single slider still moved both axes together,
        // which is the "confusing and janky" part. Both strips work in EFFECTIVE factor units so
        // mtScrub's re-anchor check sees the same units it writes.
        control.classList.add('mt-control-dual');
        const base = () => Math.max(1e-4, mtEval(layer, 'scale'));
        control.appendChild(mtScrub(effX, v => mtSet(layer, 'scaleX', Math.max(0.01, v) / base()), 0.004,
          () => { bw._refresh(); if (FM.canvasEdit) FM.canvasEdit.update(); }));
        control.appendChild(mtScrub(effY, v => mtSet(layer, 'scaleY', Math.max(0.01, v) / base()), 0.004,
          () => { bh._refresh(); if (FM.canvasEdit) FM.canvasEdit.update(); }));
      }
    } else if (mode === 'anchor') {
      // THE ANCHOR PLACER. The anchor is the point a layer scales and rotates AROUND, stored 0..1
      // across the layer's own box (0.5,0.5 = its centre). Move it to the top-left and the layer
      // grows down-right from there instead of outward in all directions — which is the whole point
      // of "so when you make stuff bigger it will expand from that point".
      //
      // Moving the anchor ALONE makes the layer jump, because x/y position the layer BY its anchor.
      // So every write compensates x/y by the same visual distance the anchor travelled, and the
      // layer stays exactly where it looks like it is. Only its pivot moves.
      const asz = FM.layerSize(layer);
      const aEffX = () => mtEval(layer, 'scale') * (layer.transform.scaleX != null ? mtEval(layer, 'scaleX') : 1);
      const aEffY = () => mtEval(layer, 'scale') * (layer.transform.scaleY != null ? mtEval(layer, 'scaleY') : 1);
      const getA = k => { const v = layer.transform[k]; return typeof v === 'number' ? v : (FM.evalProp(v, FM.time) != null ? FM.evalProp(v, FM.time) : 0.5); };
      const setAnchor = (ax, ay) => {
        const oldX = getA('anchorX'), oldY = getA('anchorY');
        const nx = Math.max(0, Math.min(1, ax)), ny = Math.max(0, Math.min(1, ay));
        layer.transform.anchorX = Math.round(nx * 1000) / 1000;
        layer.transform.anchorY = Math.round(ny * 1000) / 1000;
        // Keep it visually still. The anchor moved (nx-oldX) of the layer's SCALED width — but that
        // displacement is in the LAYER's own space, and the layer is drawn translate → rotate →
        // scale, so it has to be rotated into the parent frame before it can be added to x/y.
        // Without this a rotated layer jumped the moment you touched its pivot.
        let dx = (nx - oldX) * asz.w * aEffX();
        let dy = (ny - oldY) * asz.h * aEffY();
        const rot = (mtEval(layer, 'rotation') || 0) * Math.PI / 180;
        if (rot) { const c = Math.cos(rot), s = Math.sin(rot); const rx = dx * c - dy * s; dy = dx * s + dy * c; dx = rx; }
        // shiftTransform, not mtSet: on a layer with ANIMATED position, setTransform would upsert a
        // keyframe at the playhead — moving the pivot would silently add a keyframe and bend the
        // existing animation. shiftTransform moves the whole curve, which is what a pivot change means.
        FM.shiftTransform(layer, 'x', Math.round(mtEval(layer, 'x') + dx), FM.time);
        FM.shiftTransform(layer, 'y', Math.round(mtEval(layer, 'y') + dy), FM.time);
        FM.requestRender();
      };
      const bax = mtVBox('Anchor X', () => getA('anchorX') * 100, v => setAnchor(v / 100, getA('anchorY')), { dp: 1, unit: '%', scrub: 0.3, min: 0, max: 100, onScrub: () => { if (FM.canvasEdit) FM.canvasEdit.update(); } });
      const bay = mtVBox('Anchor Y', () => getA('anchorY') * 100, v => setAnchor(getA('anchorX'), v / 100), { dp: 1, unit: '%', scrub: 0.3, min: 0, max: 100, onScrub: () => { if (FM.canvasEdit) FM.canvasEdit.update(); } });
      refreshables.push(bax, bay); values.append(bax, bay);
      const apad = el('div', 'mt-trackpad'); apad.appendChild(el('span', 'mt-trackpad-hint', 'Swipe to place the anchor · snaps to centre, edges and corners'));
      // 260px of swipe crosses the layer, and it snaps to the nine points you actually want
      const SNAP = [0, 0.25, 0.5, 0.75, 1];
      const snapA = v => { for (let i = 0; i < SNAP.length; i++) if (Math.abs(v - SNAP[i]) < 0.045) return SNAP[i]; return v; };
      let ad = null;
      apad.addEventListener('pointerdown', e => { ad = { x: e.clientX, y: e.clientY, ax: getA('anchorX'), ay: getA('anchorY') }; try { apad.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
      apad.addEventListener('pointermove', e => {
        if (!ad) return;
        if (e.pointerType === 'mouse' && e.buttons === 0) { ad = null; commitH(); return; }
        setAnchor(snapA(ad.ax + (e.clientX - ad.x) / 260), snapA(ad.ay + (e.clientY - ad.y) / 260));
        refreshAllBoxes(); if (FM.canvasEdit) FM.canvasEdit.update();
      });
      apad.addEventListener('pointerup', e => { if (!ad) return; ad = null; try { apad.releasePointerCapture(e.pointerId); } catch (_) {} commitH(); });
      apad.addEventListener('pointercancel', e => { if (!ad) return; ad = null; try { apad.releasePointerCapture(e.pointerId); } catch (_) {} commitH(); });
      control.appendChild(apad);
      const reset = el('button', 'btn', 'Centre the anchor');
      reset.style.cssText = 'width:100%;justify-content:center;min-height:38px;';
      reset.addEventListener('click', () => { setAnchor(0.5, 0.5); refreshAllBoxes(); if (FM.canvasEdit) FM.canvasEdit.update(); commitH(); FM.inspector.refresh(); });
      control.appendChild(reset);
      control.appendChild(el('div', 'insp-hint', 'Scaling and rotation happen around this point. The layer stays where it is — only its pivot moves.'));
    } else if (mode === 'skew') {
      const bsx = mtVBox('X Skew', () => mtEval(layer, 'skewX'), v => mtSet(layer, 'skewX', v), { dp: 2, unit: '°', scrub: 0.2, min: -80, max: 80, kfKey: 'skewX', layer: layer });
      const bsy = mtVBox('Y Skew', () => mtEval(layer, 'skewY'), v => mtSet(layer, 'skewY', v), { dp: 2, unit: '°', scrub: 0.2, min: -80, max: 80 , kfKey: 'skewY', layer: layer});
      refreshables.push(bsx, bsy); values.append(bsx, bsy);
      control.classList.add('mt-control-dual');
      control.appendChild(mtScrub(() => mtEval(layer, 'skewX'), v => mtSet(layer, 'skewX', Math.max(-80, Math.min(80, v))), 0.2, () => bsx._refresh()));
      control.appendChild(mtScrub(() => mtEval(layer, 'skewY'), v => mtSet(layer, 'skewY', Math.max(-80, Math.min(80, v))), 0.2, () => bsy._refresh()));
    }

    // right rail: mode buttons
    const right = el('div', 'mt-rail mt-rail-right');
    MT_MODES.forEach(m => {
      // Move lights up for its own mode AND for anchor, because anchor lives behind it.
      const on = (m === mode) || (m === 'move' && mode === 'anchor');
      const b = el('button', 'mt-mode' + (on ? ' on' : '') + (m === 'move' && mode === 'anchor' ? ' mt-mode-alt' : ''));
      b.innerHTML = MT_ICONS[m];
      b.title = m === 'move' ? 'Move — press again for the anchor point' : MT_TITLES[m];
      b.addEventListener('click', () => {
        // Press Move while already on Move → the anchor placer. Press it again → back to Move.
        FM._mtMode = (m === 'move' && (mode === 'move' || mode === 'anchor')) ? (mode === 'move' ? 'anchor' : 'move') : m;
        kfNavSync();   // a new mode owns different channels — carrying a Move selection into Scale is meaningless
        FM.inspector.refresh();
      });
      right.appendChild(b);
    });

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

  // ===== Behaviors — procedural modifiers stacked onto a transform prop (wiggle/oscillate/bounce/
  // follow/audio). Data lives on layer.behaviors; the resolver is js/behaviors.js. Absent/empty =
  // today's render, so this block renders nothing until behaviors.js is loaded (diff-free guarantee). =====
  const BE_PROPS = ['x', 'y', 'scale', 'rotation', 'opacity'];
  const BE_PROP_LABEL = { x: 'X position', y: 'Y position', scale: 'Scale', rotation: 'Rotation', opacity: 'Opacity' };
  const BE_DEFAULT_PROP = { wiggle: 'x', oscillate: 'y', bounce: 'scale', follow: 'x', audio: 'scale' };
  const BE_BANDS = [['overall', 'Overall'], ['bass', 'Bass'], ['mid', 'Mid'], ['treble', 'Treble']];
  const BE_SPECIAL = { targetId: 1, sourceId: 1, band: 1 };   // rendered as bespoke controls, never as sliders

  function beAllowedProps(def, layer) {
    const p = def && def.props;
    let out = (!p || !p.length || p.indexOf('*') >= 0) ? BE_PROPS.slice() : BE_PROPS.filter(k => p.indexOf(k) >= 0);
    // The camera composite reads x/y/scale/rotation through the resolver but has no pixels — an
    // opacity behavior on it would be a dead option in the picker.
    if (layer && layer.type === 'camera') out = out.filter(k => k !== 'opacity');
    return out;
  }
  function beDefaultProp(def, layer) {
    const allowed = beAllowedProps(def, layer);
    const pref = BE_DEFAULT_PROP[def.type];
    return (pref && allowed.indexOf(pref) >= 0) ? pref : allowed[0];
  }
  function afterBehavior() { FM.requestRender(); FM.inspector.refresh(); if (FM.history) FM.history.commit(); }

  // A layer <select> for follow/audio. videoOnly restricts to video layers (audio source); otherwise
  // any other visual layer. A stale id (deleted layer) falls back to None.
  function beLayerSelect(layer, beh, key, label, videoOnly) {
    const row = el('div', 'prop-row');
    row.appendChild(el('label', null, label));
    const sel = document.createElement('select');
    const none = document.createElement('option'); none.value = ''; none.textContent = videoOnly ? 'None — pick a video' : 'None'; sel.appendChild(none);
    (FM.scene.layers || []).forEach(l => {
      if (l.id === layer.id) return;
      if (videoOnly ? l.type !== 'video' : l.type === 'camera') return;
      const op = document.createElement('option'); op.value = l.id; op.textContent = l.name || l.type; sel.appendChild(op);
    });
    sel.value = beh.params[key] || '';
    if (sel.selectedIndex < 0) sel.value = '';   // id no longer present → None
    sel.addEventListener('change', () => { beh.params[key] = sel.value; afterBehavior(); });
    row.appendChild(sel);
    return row;
  }

  // Frequency-band segmented control for the audio behavior (reuses the fx-seg idiom).
  function beBandSegment(beh) {
    const row = el('div', 'fx-seg-row');
    row.appendChild(el('span', 'fx-scrub-label', 'Band'));
    const seg = el('div', 'fx-seg');
    const cur = beh.params.band || 'overall';
    BE_BANDS.forEach(o => {
      const b = el('button', 'fx-seg-btn' + (cur === o[0] ? ' on' : ''), o[1]);
      b.addEventListener('click', () => { beh.params.band = o[0]; afterBehavior(); });
      seg.appendChild(b);
    });
    row.appendChild(seg);
    return row;
  }

  function behaviorRow(layer, beh, idx) {
    const reg = FM.behaviorRegistry;
    const def = (reg.get && reg.get(beh.type)) || { type: beh.type, label: beh.type, params: [], props: ['*'] };
    const off = beh.enabled === false;
    const row = el('div', 'fx-row be-row' + (off ? ' fx-off' : ''));
    const head = el('div', 'fx-head be-head');
    const eye = el('button', 'fx-icon-btn fx-eye be-eye' + (off ? ' off' : ''));
    eye.title = off ? 'Behavior off — enable' : 'Behavior on — disable';
    eye.innerHTML = svgIcon('M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6');
    eye.addEventListener('click', () => { beh.enabled = !(beh.enabled !== false); afterBehavior(); });
    head.appendChild(eye);
    head.appendChild(el('span', 'fx-name', def.label || beh.type));
    // target-prop select — which transform channel this behavior drives
    const allowed = beAllowedProps(def, layer);
    const psel = document.createElement('select'); psel.className = 'be-prop';
    allowed.forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = BE_PROP_LABEL[k] || k; if (k === beh.prop) o.selected = true; psel.appendChild(o); });
    if (allowed.indexOf(beh.prop) < 0) { const o = document.createElement('option'); o.value = beh.prop; o.textContent = BE_PROP_LABEL[beh.prop] || beh.prop; o.selected = true; psel.appendChild(o); }
    psel.addEventListener('change', () => { beh.prop = psel.value; afterBehavior(); });
    head.appendChild(psel);
    head.appendChild(el('span', 'fx-spacer'));
    const del = el('button', 'fx-icon-btn fx-del be-del'); del.title = 'Delete behavior';
    del.innerHTML = svgIcon('M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13');
    del.addEventListener('click', () => { (layer.behaviors || []).splice(idx, 1); if (layer.behaviors && !layer.behaviors.length) delete layer.behaviors; afterBehavior(); });
    head.appendChild(del);
    row.appendChild(head);

    const body = el('div', 'fx-ed-body');
    if (!beh.params) beh.params = {};
    if (beh.type === 'follow') body.appendChild(beLayerSelect(layer, beh, 'targetId', 'Follow layer', false));
    if (beh.type === 'audio') {
      body.appendChild(beLayerSelect(layer, beh, 'sourceId', 'Audio source', true));
      body.appendChild(beBandSegment(beh));
    }
    const params = (reg.paramsOf && reg.paramsOf(beh.type)) || def.params || [];
    params.forEach(p => {
      if (!p || BE_SPECIAL[p.key]) return;
      if (typeof p.def !== 'number' || p.min == null || p.max == null) return;   // only numeric params get a slider
      const dflt = p.def;
      body.appendChild(rangeRow((p.label || p.key) + (p.unit ? ' (' + p.unit + ')' : ''),
        () => { const v = beh.params[p.key]; return typeof v === 'number' ? round(v, 3) : dflt; },
        v => { beh.params[p.key] = v; },
        p.min, p.max, p.step || 1));
    });
    if (!body.childNodes.length) body.appendChild(el('div', 'insp-hint', 'No adjustable parameters.'));
    row.appendChild(body);
    return row;
  }

  function behaviorsBlock(layer) {
    const reg = FM.behaviorRegistry;
    if (!reg || !reg.all) return null;   // behaviors.js not loaded — render nothing (diff-free)
    const s = section('Behaviors');
    const list = el('div', 'fx-list be-list');
    (layer.behaviors || []).forEach((beh, idx) => { if (beh && beh.type) list.appendChild(behaviorRow(layer, beh, idx)); });
    s.appendChild(list);
    if (!(layer.behaviors && layer.behaviors.length)) s.appendChild(el('div', 'insp-hint', 'Add procedural motion: wiggle, oscillate, bounce, follow another layer, or drive from audio.'));
    // Behavior params are deliberately NOT keyframable — say so, or the missing ◆ (used everywhere
    // else) reads as a broken control to an AM power user.
    else s.appendChild(el('div', 'insp-hint', 'Behaviors run live on top of keyframes — their settings hold steady rather than keyframing.'));

    const add = el('button', 'fx-add-btn', '+ Add behavior');
    const picker = el('div', 'be-picker'); picker.style.display = 'none';
    (reg.all() || []).forEach(def => {
      const b = el('button', 'be-pick-btn', def.label || def.type);
      b.addEventListener('click', () => {
        if (!Array.isArray(layer.behaviors)) layer.behaviors = [];
        const inst = reg.makeInstance ? reg.makeInstance(def.type, beDefaultProp(def, layer)) : { type: def.type, prop: beDefaultProp(def, layer), enabled: true, params: {} };
        if (inst) layer.behaviors.push(inst);
        afterBehavior();
      });
      picker.appendChild(b);
    });
    add.addEventListener('click', () => { picker.style.display = picker.style.display === 'none' ? 'grid' : 'none'; });
    s.appendChild(add);
    s.appendChild(picker);
    return s;
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

    // Audio tools live WITH the Volume section (the ⋯ menu path was easy to miss on PC).
    const tools = el('div', 'vol-tools');
    const wavBtn = el('button', 'vol-tool-btn', 'Save audio as WAV…');
    wavBtn.addEventListener('click', () => { if (FM.downloadLayerAudio) FM.downloadLayerAudio(layer); });
    // Karaoke is a TOGGLE: the label + state follow whether an instrumental track is live, and it can be
    // flipped off from either the source clip or the karaoke track itself.
    const kState = FM.karaokeState ? FM.karaokeState(layer) : 'off';
    const karBtn = el('button', 'vol-tool-btn' + (kState === 'off' ? '' : ' on'),
      kState === 'off' ? 'Remove vocals (karaoke)' : 'Restore vocals');
    karBtn.title = kState === 'twin' ? 'This is the karaoke track — restore the original vocals'
      : kState === 'on' ? 'Vocals are removed — press to restore' : 'Mute the vocals and add an instrumental track (stereo only)';
    karBtn.addEventListener('click', async () => { if (FM.toggleKaraoke) await FM.toggleKaraoke(layer); if (FM.inspector) FM.inspector.refresh(); });
    const afxBtn = el('button', 'vol-tool-btn' + (FM.layerHasAudioFx && FM.layerHasAudioFx(layer) ? ' on' : ''), 'Audio effects…');
    afxBtn.title = 'Reverb, EQ, delay and more for this clip';
    afxBtn.addEventListener('click', () => FM.inspector.openCategory('audiofx'));
    const arBtn = el('button', 'vol-tool-btn', 'Audio → keyframes…');
    arBtn.title = 'Drive scale, opacity, rotation or position from this clip’s loudness';
    arBtn.addEventListener('click', () => { if (FM.audioReact) FM.audioReact.openSheet(layer); });
    tools.append(wavBtn, karBtn, afxBtn, arBtn);
    control.appendChild(tools);

    panel.append(left, center);
    // follow the playhead when volume is keyframed
    FM.inspector.syncTransform = () => { if (!document.contains(panel)) return; sync(); };
    return panel;
  }

  // Advanced text options — everything AM's focused text bar leaves out. Surfaced as the editor's "Aa"
  // sheet (FM._textExtras) so all text controls live WITH text editing, not scattered. Outline lives in
  // Border & Shadow; text fill lives in Color & Fill — this is Style / Spacing / Line height / Curve /
  // Animate / Captions only. `rerender` rebuilds the host (the inspector, or the editor's Aa popover).
  function buildTextExtras(layer, body, rerender) {
    rerender = rerender || function () { FM.inspector.refresh(); };
    const styr = el('div', 'prop-row'); styr.appendChild(el('label', null, 'Style'));
    const sseg = el('div', 'seg');
    const bB = el('button', 'seg-btn' + (layer.bold ? ' on' : ''), 'B'); bB.style.fontWeight = '700';
    bB.addEventListener('click', () => { layer.bold = !layer.bold; bB.classList.toggle('on', layer.bold); FM.requestRender(); commitH(); });
    const iB = el('button', 'seg-btn' + (layer.italic ? ' on' : ''), 'I'); iB.style.fontStyle = 'italic';
    iB.addEventListener('click', () => { layer.italic = !layer.italic; iB.classList.toggle('on', layer.italic); FM.requestRender(); commitH(); });
    sseg.append(bB, iB); styr.appendChild(sseg); body.appendChild(styr);
    if (layer.letterSpacing == null) layer.letterSpacing = 0;
    if (layer.lineHeight == null) layer.lineHeight = 1.15;
    body.appendChild(rangeRow('Spacing', () => layer.letterSpacing, v => { layer.letterSpacing = v; }, -10, 60, 1));
    body.appendChild(rangeRow('Line height', () => layer.lineHeight, v => { layer.lineHeight = v; }, 0.8, 2.5, 0.05));
    body.appendChild(rangeRow('Curve', () => layer.textCurve || 0, v => { layer.textCurve = v; }, -180, 180, 1));
    if (!layer.textAnim) layer.textAnim = { preset: 'none', unit: 'char', durIn: 0.6, durOut: 0, stagger: 0.04 };
    const an = layer.textAnim;
    const ar2 = el('div', 'prop-row'); ar2.appendChild(el('label', null, 'Animate'));
    const asel = document.createElement('select');
    [['none', 'None'], ['fade', 'Fade in'], ['fade-up', 'Fade up'], ['typewriter', 'Typewriter'], ['pop', 'Pop'], ['slide', 'Slide in']].forEach(p => { const o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; if (p[0] === an.preset) o.selected = true; asel.appendChild(o); });
    asel.addEventListener('change', () => { an.preset = asel.value; FM.requestRender(); commitH(); rerender(); });
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
      capBtn.addEventListener('click', () => {
        // Commit + close the focused text editor first, so the caption captures what's actually typed
        // and the editor's textarea can't write the old text back over the now-empty layer.text.
        if (FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive() && FM.textEdit.layerId() === layer.id) FM.textEdit.stop();
        if (FM.captions) FM.captions.makeTrack(layer);
        else { layer.captions = [{ start: 0, end: 2, text: layer.text || 'Caption' }]; layer.text = ''; }
        FM.requestRender(); commitH();
        if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
        if (FM.inspector) FM.inspector.refresh();
      });
      body.appendChild(capBtn);
      // Speech detection is the reason to make a caption track at all, so it is reachable from the
      // empty state too — FM.captions.detect() converts the layer and fills the grid in one press
      // (carrying whatever text was already on the layer onto the first cue).
      if (FM.captionsEditor && FM.captionsEditor.detectRow) {
        body.appendChild(FM.captionsEditor.detectRow(layer, () => { if (FM.inspector) FM.inspector.refresh(); }));
      }
    }
  }
  FM._textExtras = buildTextExtras;

  // ===== CAMERA OPTIONS — Camera View · Focus Blur · Fog =====
  // Three sub-screens behind one card, the way Move & Transform holds its modes: a rail of icons and
  // a transient FM._camTab, so the tab you were last on never becomes a field saved into the project.
  const CAM_TABS = [
    { key: 'view',  label: 'Camera View', icon: 'M3 8.5 8.5 4v3H14a6 6 0 0 1 0 12H9M3 8.5 8.5 13v-3' },
    { key: 'focus', label: 'Focus Blur',  icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9' },
    { key: 'fog',   label: 'Fog',         icon: 'M4 16h16M6 19h12M7 13h10a5 5 0 0 0-10 0' },
  ];
  // The lens the compositor has always used is f = 2 × project height, which through the ordinary
  // pinhole relation is 28.07° — so that is what Field of view reads on a camera nobody has touched,
  // and nothing moves until you drag it. Wider = shorter focal length = stronger perspective, and
  // every depth effect (z scaling, parallax, focus falloff) firms up together because all of them
  // divide by f.
  function camLegacyFov(P) { return +(2 * Math.atan((P.height || 1080) / 2 / Math.max(1, (P.height || 1080) * 2)) * 180 / Math.PI).toFixed(1); }
  function camPanel(layer, body) {
    const P = FM.scene.project;
    const tab = CAM_TABS.some(c => c.key === FM._camTab) ? FM._camTab : 'view';
    const rail = el('div', 'cam-rail');
    CAM_TABS.forEach(c => {
      const b = el('button', 'cam-tab' + (c.key === tab ? ' on' : ''));
      b.innerHTML = svgIcon(c.icon); b.title = c.label;
      b.addEventListener('click', () => { FM._camTab = c.key; FM.inspector.refresh(); });
      rail.appendChild(b);
    });
    body.appendChild(rail);
    body.appendChild(el('div', 'insp-sub-label', (CAM_TABS.find(c => c.key === tab) || {}).label));
    if (tab === 'view') {
      body.appendChild(rangeRow('Field of view', () => (layer.fov != null ? FM.evalProp(layer.fov, FM.time) : camLegacyFov(P)),
        v => { layer.fov = Math.max(5, Math.min(160, v)); FM.requestRender(); }, 5, 160, 0.5));
      // Distance IS the camera's own Z — it already exists, already keyframes, and already feeds the
      // parallax maths. Giving it a second home here rather than a second field keeps one truth.
      body.appendChild(rangeRow('Distance', () => -(layer.transform.z != null ? FM.evalProp(layer.transform.z, FM.time) : 0),
        v => { FM.setTransform(layer, 'z', -Math.round(v), FM.time); FM.requestRender(); }, -2000, 4000, 5));
      body.appendChild(el('div', 'insp-hint', 'Field of view is the lens. Wide (90°+) throws depth hard — layers at different Z separate and the camera’s pan gains real parallax. Narrow (20°) flattens the scene almost to 2D. Distance dollies the camera along Z; it is the same value as the camera’s own Z, so keyframing either animates the move.'));
      return;
    }
    if (tab === 'focus') {
      if (!layer.focus) layer.focus = { enabled: false, distance: 0, dof: 200, blur: 0.5 };
      const f = layer.focus;
      body.appendChild(checkRow('Focus blur', !!f.enabled, v => { f.enabled = v; FM.requestRender(); FM.inspector.refresh(); commitH(); }));
      if (!f.enabled) { body.appendChild(el('div', 'insp-hint', 'Turn this on to defocus layers by their depth. Give layers different Z values (Move & Transform → Move) and everything off the focus plane softens.')); return; }
      body.appendChild(rangeRow('Focus distance', () => FM.evalProp(f.distance, FM.time) || 0, v => { f.distance = Math.round(v); FM.requestRender(); }, -2000, 4000, 5));
      body.appendChild(rangeRow('Depth of field', () => FM.evalProp(f.dof, FM.time) || 200, v => { f.dof = Math.max(1, Math.round(v)); FM.requestRender(); }, 1, 3000, 5));
      body.appendChild(rangeRow('Blur strength', () => FM.evalProp(f.blur, FM.time) || 0, v => { f.blur = Math.max(0, Math.min(2, v)); FM.requestRender(); }, 0, 2, 0.05));
      body.appendChild(el('div', 'insp-hint', 'Focus distance is the Z that stays sharp. Depth of field is how far either side of it also stays sharp — past that the blur ramps up and tops out three widths out.'));
      return;
    }
    if (!layer.fog) layer.fog = { enabled: false, color: '#ffffff', near: 0, far: Math.round((P.height || 1080) * 2) };
    const g = layer.fog;
    body.appendChild(checkRow('Fog', !!g.enabled, v => { g.enabled = v; FM.requestRender(); FM.inspector.refresh(); commitH(); }));
    if (!g.enabled) { body.appendChild(el('div', 'insp-hint', 'Turn this on to wash distant layers toward a colour — haze, dusk, underwater. Layers need different Z values for it to do anything.')); return; }
    const cr = el('div', 'prop-row'); cr.appendChild(el('label', null, 'Colour'));
    cr.appendChild(colorField(() => g.color || '#ffffff', v => { g.color = v; FM.requestRender(); commitH(); }));
    body.appendChild(cr);
    body.appendChild(rangeRow('Near distance', () => FM.evalProp(g.near, FM.time) || 0, v => { g.near = Math.round(v); FM.requestRender(); }, -2000, 4000, 5));
    body.appendChild(rangeRow('Far distance', () => FM.evalProp(g.far, FM.time) || 0, v => { g.far = Math.round(v); FM.requestRender(); }, -2000, 8000, 5));
    body.appendChild(el('div', 'insp-hint', 'A layer at the near distance is untouched; at the far distance it is the fog colour outright; between the two it fades across. The wash clips to each layer’s own shape, so text stays text.'));
  }

  /* TRANSFORM motion blur — the blur that reads the CLIP's own movement.
   * This has been unreachable since v2.66: the checkbox and its two rows were pulled out of Edit
   * Shape to match Alight Motion and never re-homed, so layer.motionBlur rendered and exported but
   * nothing in the app could switch it on. (Ezra: "the normal one that isn't just for the content
   * currently is broken asf" — he was reaching the EFFECT called Motion Blur, which is a hand-aimed
   * smear and now says so on the tin.) Move & Transform is where it belongs: it is a property of how
   * the layer moves, not a look you bolt on.
   * Hidden on groups and cameras rather than shipped dead — drawGroupUnit never copies the flag onto
   * the unit it draws, and the camera drives the composite instead of being drawn as a layer.
   */
  function motionBlurBlock(layer) {
    if (!layer || layer.type === 'group' || layer.type === 'camera' || layer.type === 'null') return null;
    if (!layer.motionBlur || typeof layer.motionBlur !== 'object') layer.motionBlur = { enabled: false, shutter: 0.5, samples: 8 };
    const mb = layer.motionBlur;
    // OFF = render nothing. This block lives in EFFECTS now, and an effect you have not added should
    // not occupy a card there — it is switched on from + Add Effect → Motion Blur (Object), the same
    // as every other effect. (It used to be a checkbox in Move & Transform, which is exactly why Ezra
    // could not find it: "I'm only seeing motion blur footage".)
    if (!mb.enabled) return null;
    const wrap = el('div', 'insp-section');
    const head = el('div', 'insp-sec-title', 'Motion Blur (Object)');
    // × is how you turn it OFF now that the checkbox is gone — same gesture as removing an effect.
    const rm = el('button', 'insp-sec-x', '×');
    rm.type = 'button'; rm.title = 'Remove Motion Blur (Object)';
    rm.addEventListener('click', () => { mb.enabled = false; FM.requestRender(); FM.inspector.refresh(); commitH(); });
    head.appendChild(rm);
    wrap.appendChild(head);
    // The app's own value boxes, not bare <input type=range> (v5.54). Ezra: "some effects don't use
    // the slider format that we should have, and also the sliders on those ones can be finicky, like
    // this one." A 0..1 Shutter on a raw range input has almost no usable travel — a whole shutter
    // angle lives in a couple of hundred pixels — where mtVBox gives the same drag-to-scrub-with-glide
    // and tap-to-type as every other number in the app.
    const mbVals = el('div', 'mt-values');
    const bShut = mtVBox('Shutter', () => (mb.shutter != null ? mb.shutter : 0.5),
      v => { mb.shutter = Math.max(0, Math.min(1, v)); FM.requestRender(); },
      { dp: 2, scrub: 0.004, min: 0, max: 1 });
    const bSamp = mtVBox('Samples', () => Math.round(mb.samples || 8),
      v => { mb.samples = Math.max(2, Math.min(24, Math.round(v))); FM.requestRender(); },
      { dp: 0, scrub: 0.08, min: 2, max: 24 });
    mbVals.append(bShut, bSamp);
    wrap.appendChild(mbVals);
    wrap.appendChild(el('div', 'insp-hint', 'Shutter is how long the shutter stays open — 0.5 is the 180° shutter film uses. Samples is how many slices are averaged: more is smoother and slower. A clip that is not moving costs nothing.'));
    return wrap;
  }

  function buildCategory(key, layer, body) {
    if (key === 'cameraopts') { camPanel(layer, body); return; }
    if (key === 'transform') {
      body.appendChild(moveTransformPanel(layer));
      if (layer.type !== 'camera') body.appendChild(parentControl(layer));   // parenting lives with the transform it inherits (the camera ignores a parent) (#11)
      // Behaviors ride the per-layer transform reads (applyLayerTransform / layerOpacity). A GROUP's own
      // transform is applied to its children via applyParentChain with RAW evalProp — never through the
      // resolver — so a group's behaviors would render nothing. Hide the control there rather than ship a
      // dead switch. The CAMERA gets them since v3.46: its composite reads route through behaviorValue,
      // so a Wiggle on the camera is the one-tap whole-scene shake (with z-depth parallax riding it).
      if (layer.type !== 'group') { const bb = behaviorsBlock(layer); if (bb) body.appendChild(bb); }
    } else if (key === 'volume') {
      body.appendChild(volumePanel(layer));
    } else if (key === 'speed') {
      if (layer.speed == null) layer.speed = 1;
      // AM-style left rail (◆ keyframe + easing curve) beside the speed control — keyframed speed
      // = SPEED RAMPING: playback accelerates/decelerates along the eased curve between keyframes.
      const spRow = el('div', 'mt-panel spd-panel');
      const rail = el('div', 'mt-rail mt-rail-left');
      const spAnim = FM.isAnimated(layer.speed), spHere = FM.hasKeyframeAt(layer.speed, FM.time);
      const kfBtn = el('button', 'mt-kf' + (spAnim ? ' active' : '') + (spHere ? ' here' : ''), '◆');
      kfBtn.title = spHere ? 'Remove the speed keyframe at the playhead' : 'Keyframe the speed at the playhead (speed ramp)';
      kfBtn.addEventListener('click', () => { FM.toggleProp(layer, 'speed', FM.time, 1); FM.requestRender(); FM.seekVideosToTime(); if (FM.timeline) FM.timeline.rebuild(); FM.inspector.refresh(); commitH(); });
      rail.appendChild(kfBtn);
      const easeBtn = el('button', 'mt-ease'); easeBtn.innerHTML = MT_ICONS.ease; easeBtn.title = 'Speed easing curve';
      easeBtn.addEventListener('click', () => { FM._spdEasing = true; FM.inspector.refresh(); });
      rail.appendChild(easeBtn);
      spRow.appendChild(rail);
      const spCenter = el('div', 'mt-center spd-center');
      spCenter.appendChild(rangeRow('Speed %', () => Math.round((FM.evalProp(layer.speed, FM.time) || 1) * 100), v => {
        const sp = Math.max(0.1, v / 100);
        if (FM.isAnimated(layer.speed)) {
          FM.setProp(layer, 'speed', sp, FM.time);          // ramp: writes/updates a keyframe at the playhead; clip window stays fixed
        } else {
          const span = layer.duration * (layer.speed || 1);   // source span is invariant → re-time the clip
          layer.speed = sp;
          layer.duration = Math.max(0.1, span / sp);
          // Clamp against the source that's actually left, exactly as the trim grips do
          // (timeline.js: nd = min(nd, (srcDur - trimStart) / sp)). Without this, a clip whose span
          // already overruns its source — e.g. trimStart moved, or the media was replaced — keeps the
          // overrun through the re-time and freezes on its last decoded frame for the tail.
          const mm = FM.media.get(layer.id);
          const srcDur = (mm && mm.duration) ? mm.duration : Infinity;
          if (layer.type === 'video' && isFinite(srcDur)) {
            layer.duration = Math.max(0.1, Math.min(layer.duration, (srcDur - (layer.trimStart || 0)) / sp));
          }
          const end = layer.start + layer.duration;
          if (end > FM.scene.project.duration) FM.scene.project.duration = end;
        }
        const m = FM.media.get(layer.id); if (m && m.el) { try { m.el.playbackRate = Math.min(16, Math.max(0.0625, FM.evalProp(layer.speed, FM.time) || 1)); } catch (e) {} }
        FM.seekVideosToTime();
        FM.timeline.rebuild();
      }, 25, 400, 5, () => FM.inspector.refresh()));
      if (spAnim) spCenter.appendChild(el('div', 'insp-hint', 'Speed is keyframed (ramp): the clip length stays fixed while playback speeds up and slows down along the curve — use the curve button to shape the easing.'));
      spRow.appendChild(spCenter);
      body.appendChild(spRow);
      // Frame blend + Reverse are about VIDEO frames/audio. Since viewAllowed now gates the whole
      // panel to layers with a source (layerHasSource), this is video/audio only anyway — the guard
      // stays as the belt-and-braces it always was.
      if (layer.type === 'video') {
        if (layer.frameBlend == null) layer.frameBlend = false;
        body.appendChild(checkRow('Smooth slow-motion (frame blend)', layer.frameBlend, async v => {
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
    } else if (key === 'blend') {
      // Opacity slider on top, then blend families as expandable rows.
      //
      // ORDER AND NAMING ARE OURS, DELIBERATELY. Cutout sits directly under Basic because keeping
      // or punching a hole is the thing people reach for constantly — it doesn't belong buried at
      // the bottom under the colour maths. Brighten leads Deepen (adding light is the common case),
      // and Invert trails because it's the specialist. Labels use Australian spelling and plain
      // words for the same operations — the ids underneath are unchanged, so projects, presets and
      // the AI ops keep working regardless of what a row is called.
      body.appendChild(transformRow(layer, 'opacity', 'Opacity', { step: 0.01, dp: 2, slider: { min: 0, max: 1, step: 0.01 } }));
      const CATS = [
        ['Basic', [['normal', 'Normal']]],
        ['Cutout', [['mask-include', 'Stencil'], ['mask-exclude', 'Punch Out']]],
        ['Brighten', [['screen', 'Screen'], ['lighten', 'Lighten'], ['lighter-color', 'Brightest Colour'], ['color-dodge', 'Colour Dodge'], ['linear-dodge', 'Add']]],
        ['Deepen', [['multiply', 'Multiply'], ['darken', 'Darken'], ['darker-color', 'Deepest Colour'], ['color-burn', 'Colour Burn'], ['linear-burn', 'Linear Burn']]],
        ['Punch', [['overlay', 'Overlay'], ['soft-light', 'Soft Light'], ['hard-light', 'Hard Light'], ['soft-overlay', 'Gentle Overlay'], ['vivid-light', 'Vivid Light'], ['linear-light', 'Linear Light'], ['pin-light', 'Pin Light']]],
        ['Tint', [['hue', 'Hue'], ['saturation', 'Saturation'], ['color', 'Colourise'], ['luminosity', 'Luminance']]],
        ['Invert', [['difference', 'Difference'], ['exclusion', 'Exclusion'], ['subtract', 'Minus'], ['divide', 'Ratio']]],
      ];
      // Legacy/unlisted modes still resolve to their family so the current mode is always visible.
      // 'add' is the old Porter-Duff PLUS id kept for projects that already use it — new picks get
      // 'linear-dodge', which is the same look but composites correctly under opacity.
      const FAMILY = { add: 'Brighten' };
      const cur = layer.blendMode || 'normal';
      CATS.forEach(c => { const fam = FAMILY[cur]; if (fam === c[0] && !c[1].some(m => m[0] === cur)) c[1].push([cur, cur.charAt(0).toUpperCase() + cur.slice(1)]); });
      const catOf = m => { const hit = CATS.find(c => c[1].some(x => x[0] === m)); return hit ? hit[0] : 'Normal'; };
      const activeCat = catOf(cur);
      if (!FM._blendOpen) FM._blendOpen = {};
      CATS.forEach(([name, modes]) => {
        const row = el('div', 'blend-cat' + (activeCat === name ? ' active' : ''));
        const head = el('button', 'blend-cat-head');
        const open = !!FM._blendOpen[name];
        const curIn = modes.find(m => m[0] === cur);
        head.innerHTML = '<span class="blend-arrow">' + (open ? '▾' : '▸') + '</span><span class="blend-cat-name">' + name + '</span>' +
          (curIn ? '<span class="blend-cur">' + curIn[1] + '</span><span class="blend-check">✓</span>' : '');
        head.addEventListener('click', () => { const was = !!FM._blendOpen[name]; FM._blendOpen = {}; if (!was) FM._blendOpen[name] = true; FM.inspector.refresh(); });   // accordion: only ONE dropdown open at a time (AM)
        row.appendChild(head);
        if (open) {
          const list = el('div', 'blend-list');
          modes.forEach(([mode, label]) => {
            const b = el('button', 'blend-mode' + (cur === mode ? ' on' : ''), label);
            b.addEventListener('click', () => { layer.blendMode = mode; FM.requestRender(); FM.inspector.refresh(); commitH(); });
            list.appendChild(b);
          });
          row.appendChild(list);
        }
        body.appendChild(row);
      });
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
      // A row is only APPLICABLE if it carries at least one effect this build can actually build.
      // 'fm.fxpresets' is written by more than one code path and nothing validates another's shape,
      // so rows turn up with .effects missing, empty, a string, or full of types the registry no
      // longer has. Those used to render as "(0 effects)" and, when tapped, ran
      // `layer.effects = [].map(…)` — silently deleting every effect on the selected layer with no
      // confirmation and nothing but an unprompted Ctrl+Z between the user and the loss.
      // Now an unusable row is inert and says why. (Queue #37 replaces both preset systems with one
      // namespace + migration, which retires this class of bug; this is the stop-the-bleeding fix.)
      const usableFx = p => (Array.isArray(p.effects) ? p.effects : [])
        .filter(e => e && typeof e === 'object' && typeof e.type === 'string' && FM.fxRegistry.get(e.type));
      FM.fxPresets.list().forEach(p => {
        const raw = Array.isArray(p.effects) ? p.effects : [];
        const fx = usableFx(p);
        const skipped = raw.length - fx.length;
        const chip = el('div', 'preset-chip' + (p.builtin ? ' builtin' : '') + (fx.length ? '' : ' broken'));
        const nm = el('button', 'preset-name', p.name);
        if (!fx.length) {
          // NOT hidden: a broken row you cannot see is a row you cannot delete. It stays visible,
          // keeps its ×, and explains itself in a toast — a title tooltip alone is invisible on a phone.
          const why = raw.length
            ? ('its ' + raw.length + ' effect' + (raw.length === 1 ? ' is' : 's are') + ' not in this build')
            : 'it was saved empty, or in a format this panel doesn’t read';
          nm.title = '“' + p.name + '” can’t be applied — ' + why + '. Applying it would wipe this layer’s effects, so it does nothing. Remove it with ×.';
          nm.addEventListener('click', () => { if (FM.toast) FM.toast('“' + p.name + '” has no effects to apply — ' + why + '. Your effect stack is untouched.', 3600); });
        } else {
          nm.title = (p.builtin ? 'Built-in — apply “' : 'Apply “') + p.name + '” (' + fx.length + ' effect' + (fx.length === 1 ? '' : 's') +
            (skipped ? ', ' + skipped + ' skipped — not in this build' : '') + ')';
          // A preset is a saved LOOK → REPLACE the stack (not append), so re-tapping never stacks duplicates.
          nm.addEventListener('click', () => {
            const use = usableFx(p);   // re-read at click time: never assign an empty/unusable stack
            if (!use.length) { if (FM.toast) FM.toast('“' + p.name + '” has no effects to apply — your effect stack is untouched.', 3600); return; }
            layer.effects = use.map(e => JSON.parse(JSON.stringify(e)));
            FM.inspector.refresh(); FM.timeline.rebuild(); FM.requestRender(); if (FM.history) FM.history.commit();
            if (FM.toast) FM.toast('Applied “' + p.name + '”' + (skipped ? ' (' + skipped + ' effect' + (skipped === 1 ? '' : 's') + ' skipped — not in this build)' : ''));
          });
        }
        chip.appendChild(nm);
        // The ⚠ sits OUTSIDE the name button so the button's text stays exactly the preset's name.
        if (!fx.length) { const w = el('span', 'preset-warn', '⚠'); w.title = nm.title; chip.appendChild(w); }
        if (!p.builtin) { const del = el('button', 'preset-del', '×'); del.title = 'Delete this preset'; del.addEventListener('click', () => { FM.fxPresets.remove(p.name); FM.inspector.refresh(); }); chip.appendChild(del); }
        pwrap.appendChild(chip);
      });
      const sv = el('button', 'fx-act', 'Save current effects…'); sv.disabled = !(layer.effects && layer.effects.length);
      sv.addEventListener('click', () => { const name = prompt('Preset name:', 'My look'); if (!name || !name.trim()) return; FM.fxPresets.save(name.trim(), layer.effects); if (FM.toast) FM.toast('Saved preset “' + name.trim() + '”'); FM.inspector.refresh(); });
      pwrap.appendChild(sv);
      body.appendChild(pwrap);
    } else if (key === 'effects') {
      // Two stacks, one card (queue 45): the toggle picks which one the panel is editing, and matches
      // the one at the top of the Add Effect browser. It leads the panel so the answer to "where did
      // Audio Effects go" is the first thing on screen.
      const tab = fxTabFor(layer);
      body.appendChild(fxModeToggle(layer, tab, k => { fxTab = k; FM._fxEasing = null; FM.inspector.refresh(); }));
      // An unknown audio answer rendered as available; settle it and demote the toggle if it's a no.
      probeAudioSide(layer, id => { const cur = FM.selectedLayer(FM.scene); if (cur && cur.id === id && view === 'effects') FM.inspector.refresh(); });
      if (tab === 'audio') {
        const s = audioFxSection(layer);
        const h4 = s.querySelector('h4'); if (h4) h4.remove();
        body.appendChild(s);
      } else {
        // Motion Blur (Object) sits with the effects because that is where people look for it, and
        // because it reads as one: added from the browser, removed with an ×.
        const mbb = motionBlurBlock(layer); if (mbb) body.appendChild(mbb);
        const s = effectsSection(layer);
        const h4 = s.querySelector('h4'); if (h4) h4.remove();
        body.appendChild(s);
        // Masks live here, under the effect stack (Ezra: masks belong in Effects, not their own card) —
        // but ONLY once the layer has one. An empty "Masks" heading whose entire content was a sentence
        // pointing you back at the + Add Effect button directly above it was clutter explaining itself.
        if (maskableLayer(layer) && layer.masks && layer.masks.length) body.appendChild(masksBlock(layer));
      }
    } else if (key === 'color') {
      // EVERY layer gets AM's fill selector (None / Solid / Gradient / Media). On a video/image/
      // group, picking Solid (etc.) fully overwrites the content with that fill; None shows the
      // content as-is. A solid colour fills flat — gradients are their own tab, never an accident.
      fillPanel(layer, body);
      if (layer.type !== 'shape' && layer.type !== 'text' && FM.fillModeOf(layer) === 'none') {
        // Content is showing → offer the colour GRADE tools underneath (hidden while a fill
        // override paints the layer, where grading a replaced picture makes no sense).
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
      }
    } else if (key === 'border') {
      // ===== BORDER (AM parity, keyframeable) =====
      // Reuses layer.stroke as the single border. position = inside/center/outside. For line/arc shapes
      // stroke is the LINE colour (not a border), so no border UI there. Group border = silhouette
      // dilation → outside only. size + colour are keyframeable (◆); position is a plain choice.
      const openKind = layer.type === 'shape' && ['line', 'arc'].indexOf(layer.shape) >= 0;
      const canBorder = (layer.type === 'shape' && !openKind) || layer.type === 'text' || layer.type === 'group';
      if (canBorder) {
        if (!layer.stroke) layer.stroke = { enabled: false, width: layer.type === 'text' ? 6 : 8, color: layer.type === 'text' ? '#000000' : '#ffffff' };
        const stk = layer.stroke;
        if (stk.position == null) stk.position = (layer.type === 'text' || layer.type === 'group') ? 'outside' : 'center';
        body.appendChild(checkRow('Border', stk.enabled, v => { stk.enabled = v; FM.requestRender(); FM.inspector.refresh(); }));
        if (stk.enabled) {
          if (layer.type !== 'group') body.appendChild(segRow('Position', [['inside', 'Inside'], ['center', 'Center'], ['outside', 'Outside']], () => stk.position, v => { stk.position = v; }));
          body.appendChild(kfColorRow(stk, 'color', 'Color', stk.color || '#ffffff'));
          body.appendChild(kfNumRow(stk, 'width', 'Size', 0, 100, 1, 6, ''));
        }
      }
      // ===== TRIM PATH + DASHES (shape only) — both act on the STROKE, so they sit with the border.
      // Trim windows the stroke to a [start,end] fraction of its length (animate End 0→100% = the classic
      // draw-on); dashes pattern it (animate Offset = marching ants). line/arc shapes have no Border toggle
      // but ALWAYS stroke, so hasStroke covers them and skips the "turn on Border" hint. Stored 0..1.
      if (layer.type === 'shape') {
        const hasStroke = openKind || (layer.stroke && layer.stroke.enabled);
        const tp0 = layer.trimPath;
        body.appendChild(checkRow('Trim path', !!(tp0 && tp0.enabled), v => {
          if (v) { if (!layer.trimPath) layer.trimPath = { enabled: true, start: 0, end: 1, offset: 0 }; else layer.trimPath.enabled = true; }
          else if (layer.trimPath) layer.trimPath.enabled = false;
          FM.requestRender(); FM.inspector.refresh();
        }));
        if (layer.trimPath && layer.trimPath.enabled) {
          const tp = layer.trimPath;
          body.appendChild(kfScaledRow(tp, 'start', 'Start', 0, 100, 1, 0, '%', 100));
          body.appendChild(kfScaledRow(tp, 'end', 'End', 0, 100, 1, 100, '%', 100));
          body.appendChild(kfScaledRow(tp, 'offset', 'Offset', 0, 100, 1, 0, '%', 100));
          body.appendChild(el('div', 'insp-hint', hasStroke ? 'Keyframe End 0→100% to draw the stroke on.' : 'Trim shows on the stroke — turn on Border above.'));
        }
        // Dashes live inside the stroke object (created lazily on first enable).
        if (!layer.stroke) layer.stroke = { enabled: false, width: 8, color: '#ffffff' };
        const dstroke = layer.stroke;
        body.appendChild(checkRow('Dashes', !!(dstroke.dash && dstroke.dash.enabled), v => {
          if (v) { if (!dstroke.dash) dstroke.dash = { enabled: true, length: 12, gap: 8, offset: 0 }; else dstroke.dash.enabled = true; }
          else if (dstroke.dash) dstroke.dash.enabled = false;
          FM.requestRender(); FM.inspector.refresh();
        }));
        if (dstroke.dash && dstroke.dash.enabled) {
          const dh = dstroke.dash;
          body.appendChild(rangeRow('Length', () => dh.length, v => { dh.length = Math.max(0, v); }, 0, 100, 1));
          body.appendChild(rangeRow('Gap', () => dh.gap, v => { dh.gap = Math.max(0, v); }, 0, 100, 1));
          body.appendChild(kfNumRow(dh, 'offset', 'Offset', -200, 200, 1, 0, ''));
          if (!hasStroke) body.appendChild(el('div', 'insp-hint', 'Dashes show on the stroke — turn on Border above.'));
        }
      }
      // ===== SHADOW (AM parity, keyframeable) =====
      if (!layer.shadow) layer.shadow = { enabled: false, blur: 16, dx: 8, dy: 8, color: '#000000', alpha: 100 };
      const sh = layer.shadow;
      if (sh.alpha == null) sh.alpha = 100;
      body.appendChild(checkRow('Drop shadow', sh.enabled, v => { sh.enabled = v; FM.requestRender(); FM.inspector.refresh(); }));
      if (sh.enabled) {
        body.appendChild(kfColorRow(sh, 'color', 'Color', sh.color || '#000000'));
        body.appendChild(kfNumRow(sh, 'blur', 'Size', 0, 100, 1, 16, ''));
        body.appendChild(kfNumRow(sh, 'alpha', 'Alpha', 0, 100, 1, 100, '%'));
        body.appendChild(kfNumRow(sh, 'dx', 'Position X', -200, 200, 1, 8, ''));
        body.appendChild(kfNumRow(sh, 'dy', 'Position Y', -200, 200, 1, 8, ''));
      }
      // ===== REPEATER (shape only) — draws the shape (fill+stroke, incl. trim/dash) `copies` times, each
      // copy a cumulative step further (offset/rotate/scale) with an optional per-copy opacity falloff.
      // Its own block since it multiplies the WHOLE shape, not just the outline.
      if (layer.type === 'shape') {
        const rp0 = layer.repeater;
        body.appendChild(checkRow('Repeater', !!(rp0 && rp0.enabled), v => {
          if (v) { if (!layer.repeater) layer.repeater = { enabled: true, copies: 3, offsetX: 40, offsetY: 0, rotation: 0, scale: 1, opacity: 1, anchorX: 0.5, anchorY: 0.5 }; else layer.repeater.enabled = true; }
          else if (layer.repeater) layer.repeater.enabled = false;
          FM.requestRender(); FM.inspector.refresh();
        }));
        if (layer.repeater && layer.repeater.enabled) {
          const rp = layer.repeater;
          body.appendChild(kfNumRow(rp, 'copies', 'Copies', 1, 50, 1, 3, ''));
          body.appendChild(kfNumRow(rp, 'offsetX', 'Offset X', -500, 500, 1, 40, ''));
          body.appendChild(kfNumRow(rp, 'offsetY', 'Offset Y', -500, 500, 1, 0, ''));
          body.appendChild(kfNumRow(rp, 'rotation', 'Rotation', -360, 360, 1, 0, '°'));
          body.appendChild(kfNumRow(rp, 'scale', 'Scale', 0.1, 2, 0.01, 1, ''));
          body.appendChild(kfScaledRow(rp, 'opacity', 'Opacity falloff', 0, 100, 1, 100, '%', 100));
        }
      }
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
        // "Edit Text" IS the focused editor (text-edit.js) — refresh()'s interception launches it over
        // the category grid, so this element body normally never renders. It stays as a graceful
        // fallback (and the exact same controls are the editor's "Aa" sheet). Outline moved to Border &
        // Shadow; text fill lives in Color & Fill.
        buildTextExtras(layer, body);
      }
      if (layer.type === 'shape' && FM.isPointShape && FM.isPointShape(layer)) {
        // ===== Edit Points (AM) — point shapes replace Edit Shape with this =====
        // Auto-enter point editing: overlay on the canvas + this panel edits the selected point.
        if (FM.pointEdit && (!FM.pointEdit.isActive() || FM.pointEdit.layerId() !== layer.id)) FM.pointEdit.start(layer.id, { embedded: true });
        editPointsTools(layer, body);
      } else if (layer.type === 'shape') {
        // ===== Edit Shape — parametric kinds (rect/ellipse/polygon/…): sliders, no point sets =====
        const P = FM.scene.project;
        const kr = el('div', 'prop-row'); kr.appendChild(el('label', null, 'Shape'));
        const ksel = document.createElement('select');
        const baseKinds = [['rect', 'Rectangle'], ['ellipse', 'Ellipse'], ['line', 'Line'], ['arc', 'Arc'], ['polygon', 'Polygon'], ['star', 'Star'], ['pie', 'Pie'], ['semicircle', 'Semicircle'], ['ring', 'Ring']]
          .concat(Object.keys(FM.SHAPE_POLYS || {}).map(k => [k, k.charAt(0).toUpperCase() + k.slice(1)]));
        baseKinds.forEach(p => { const o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; if (p[0] === layer.shape) o.selected = true; ksel.appendChild(o); });
        ksel.addEventListener('change', () => { layer.shape = ksel.value; FM.requestRender(); FM.inspector.refresh(); commitH(); });
        kr.appendChild(ksel); body.appendChild(kr);
        const openStroke = (layer.shape === 'line' || layer.shape === 'arc');   // stroked, never filled
        // Fill/colour now lives in its own "Color & Fill" panel (AM parity) — Edit Shape is geometry + stroke.
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
      if (layer.type === 'video' || layer.type === 'image') {
        // Media has no path/points to edit — AM's "Edit Shape" for a photo/video is the SIZE editor.
        mediaSizePanel(layer, body);
      }
      // (Motion blur, Wiggle, Mask and the Start/Duration rows were removed from Edit Shape to match
      // Alight Motion — none of those live in AM's Edit Shape. Any layer that still carries those
      // fields from an older save keeps rendering them; there's just no longer UI to add them here.
      // Timing is set on the timeline; masking lives in Blending (mask modes) and masking groups.)
    }
  }

  // ===== WHICH property am I editing? — panel scope + an optional tapped row ======================
  //
  // v5.42 made keyframe diamonds inert outlines unless their property's editor is open, so "focus"
  // was implied by which PANEL you had open. Ezra (AM): "to tell what slider you have selected —
  // hence forth what key frames ur gonna be editing, it shows by making the item ur changing have a
  // different colour on the name of it, you can also tap on the name to select the row." In his
  // screenshot the Offset effect's X was green and its Y was not, so the unit is ONE PROPERTY, not
  // one control and not one row.
  //
  // ONE source of truth, deliberately: this is NOT a second focus system running beside the panel.
  // The open panel defines the SCOPE — every property that panel owns — and a tapped name NARROWS
  // that scope to a single member of it. A selection that is not in the current scope is stale by
  // definition and is ignored (kfScopeHit returns nothing), so a tapped row and an open panel can
  // never both claim the timeline with different answers. Nothing selected = the whole scope, which
  // is exactly the v5.42 behaviour, so opening a panel changes nothing until you tap a name.
  //
  // Keys are strings, not object identities, because the inspector throws its DOM away on every
  // refresh and effect params live on objects that get replaced by undo/redo and preset paste.
  //   'tf:x'      a transform channel        'fx:distance'  a param of the OPEN effect
  //   'volume' / 'speed'                     (the accordion guarantees exactly one open effect)
  let kfSel = null;   // { layerId, key } — survives a refresh, not a layer change

  // Every property the CURRENT panel owns, animated or not, in one place. kfFocusProps filters this
  // down to the animated ones; the row builders ask it whether a name is worth making tappable.
  function kfScope(layer) {
    const out = [];
    if (!layer) return out;
    // An OPEN EFFECT editor wins: you are looking at that effect's controls, so those are its
    // keyframes. Only while the EFFECTS panel is actually open — an effect left expanded from an
    // earlier visit would otherwise keep stealing focus while you work in Move & Transform.
    if (view === 'effects') {
      const openFx = (layer.effects || []).find(e => e && e._expanded);
      if (openFx && openFx.params) Object.keys(openFx.params).forEach(k => out.push({ key: 'fx:' + k, prop: openFx.params[k] }));
      return out;
    }
    // Move & Transform: the channels the current mode owns (Move = x/y/z, Scale = scale/scaleX/scaleY…).
    if (view === 'transform') {
      const mode = ALL_MT_MODES.indexOf(FM._mtMode) >= 0 ? FM._mtMode : 'move';
      (MT_PROPS[mode] || []).forEach(k => out.push({ key: 'tf:' + k, prop: layer.transform[k] }));
      return out;
    }
    if (view === 'blend') out.push({ key: 'tf:opacity', prop: layer.transform.opacity });
    else if (view === 'volume') out.push({ key: 'volume', prop: layer.volume });
    else if (view === 'speed') out.push({ key: 'speed', prop: layer.speed });
    return out;   // home / anything else — nothing is in focus, so nothing is dimmed
  }
  function kfScopeHit(layer) {
    if (!kfSel || !layer || kfSel.layerId !== layer.id) return null;
    return kfScope(layer).filter(e => e.key === kfSel.key);   // [] when the selection went out of scope
  }
  function kfInScope(layer, key) { return kfScope(layer).some(e => e.key === key); }
  function kfIsSel(layer, key) { return !!(kfSel && layer && kfSel.layerId === layer.id && kfSel.key === key && kfInScope(layer, key)); }
  // mode 'on' forces selection (used when the tap also switched the pad's axis — that tap is clearly
  // "I want this one", not "toggle me off"); anything else toggles.
  function kfSetSel(layer, key, mode) {
    if (!layer) return;
    kfSel = (mode !== 'on' && kfIsSel(layer, key)) ? null : { layerId: layer.id, key: key };
    if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();   // the diamonds follow immediately
    FM.inspector.refresh();
  }
  function kfClearSel() { kfSel = null; }
  // Navigating between panels/modes changes WHICH keyframes are armed, so the timeline has to be
  // rebuilt — it reads kfFocusProps once, at build time. v5.42 wired that to editing actions but not
  // to navigation, so opening Move & Transform from the category grid left every diamond an inert
  // outline until some unrelated edit happened to rebuild the track. Measured, not assumed: the
  // probe's E1 caught it (0 live diamonds after tapping the card, 4 expected).
  function kfNavSync() { kfClearSel(); if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild(); }

  // A parameter NAME that doubles as the row selector. Only rows whose property is actually in the
  // current scope get the affordance — a name that cannot change the timeline must not look like it can.
  function paramName(cls, text, layer, key) {
    const n = el('span', cls, text);
    if (!layer || !key || !kfInScope(layer, key)) return n;
    const on = kfIsSel(layer, key);
    n.classList.add('kf-selectable');
    if (on) n.classList.add('kf-sel');
    n.setAttribute('role', 'button');
    n.setAttribute('aria-pressed', String(on));
    n.tabIndex = 0;
    n.title = on ? 'Editing ' + text + ' — tap to deselect (its keyframes are the live ones)'
                 : 'Select ' + text + ' — its keyframes become the ones you edit';
    n.addEventListener('click', e => { e.stopPropagation(); kfSetSel(layer, key, 'toggle'); });
    // stopPropagation, not just preventDefault: the app's Space shortcut lives on WINDOW and does not
    // count a role=button span as "in an editor", so a bare preventDefault would select the row AND
    // start playback on the same key.
    n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); kfSetSel(layer, key, 'toggle'); } });
    return n;
  }

  // WHICH keyframes are you actually working on right now? The timeline PULLS this at build time
  // (rather than the inspector pushing, which would need a rebuild every panel change and could loop).
  // Returns the prop objects — the same `{kf:[…]}` containers FM.animatedProps hands back, so the
  // timeline matches them by identity — or null meaning "nothing is armed".
  //
  // Ezra: every slider should own its keyframes, the ones for what you're editing should be full
  // opacity and draggable, and the rest should still show at ~30% so you can see them without
  // grabbing them by accident.
  FM.kfFocusProps = function (layer) {
    if (!layer) return null;
    const scope = kfScope(layer);
    if (!scope.length) return null;
    const hit = kfScopeHit(layer);
    const use = (hit && hit.length) ? hit : scope;
    const out = use.map(e => e.prop).filter(p => FM.isAnimated(p));
    // An explicit selection is honoured even when it yields nothing: tapping a name that has no
    // keyframes yet means "these are the ones I'm about to make", and arming the rest would be a lie.
    if (hit && hit.length) return out;
    // A panel with NOTHING animated focuses nothing. Returning [] here matched no property and so
    // dimmed and froze every keyframe on the layer the moment you added any effect — a fresh effect
    // has no animated params, and v3.97 opens its editor automatically on add.
    return out.length ? out : null;
  };

  FM.inspector = {
    init() {
      root = document.getElementById('inspector');
      try { const rc = JSON.parse(localStorage.getItem('fm.recentColors') || '[]'); if (Array.isArray(rc)) FM.recentColors = rc; } catch (e) {}   // hydrate persisted recents
    },
    // Opening a panel starts with NOTHING selected, so it behaves exactly as it did before row
    // selection existed: the whole panel's keyframes are live until you tap a name to narrow it.
    // (Auto-selecting the first row would silently freeze the others the moment a panel opened.)
    // 'audiofx' is no longer a view of its own (queue 45) — it is the Effects card's audio TAB. The
    // key is still accepted because it is what the Volume panel's "Audio effects…" button and the
    // audio browser ask for, and because a project/session could have persisted it.
    openCategory(key) { if (key === 'audiofx') { fxTab = 'audio'; key = 'effects'; } else if (key === 'effects') { fxTab = 'visual'; } const layer = FM.selectedLayer(FM.scene); view = viewAllowed(layer, key) ? key : 'home'; kfNavSync(); FM._mtAxis = 'xy'; FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._fxEasing = null; FM._cropEasing = false; this.refresh(); },
    // The quick row's middle buttons depend on which SIDE of the clip the playhead is sitting on, and
    // the panel deliberately does NOT rebuild while you scrub (it would rebuild 60-120 times a second).
    // So watch for the CROSSING and rebuild only then — twice per clip, not twice per frame. Gated on
    // the home view: refreshing while a slider or an easing curve is open would yank it out mid-drag.
    syncPlayhead() {
      if (view !== 'home' || !root || quickSideSig == null) return;
      const sig = homeRowSig();
      if (sig != null && sig !== quickSideSig) this.refresh();
    },
    // Number keys 1..N (a layer selected): open the Nth category card in the grid's order.
    openCategoryByIndex(i) {
      const layer = FM.selectedLayer(FM.scene); if (!layer) return false;
      const cat = catsFor(layer)[i - 1]; if (!cat) return false;
      if (cat.key === 'editgroup') { if (FM.enterGroup) FM.enterGroup(layer.id); return true; }
      if (cat.key === 'effects') fxTab = 'visual';
      view = cat.key; kfNavSync(); FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._fxEasing = null; FM._cropEasing = false; this.refresh();
      return true;
    },
    // Step BACK one level (Esc / click-off): easing sub-view → its category, category → the grid,
    // grid → deselect. Returns true if it did something. (AM: Esc doesn't nuke the layer outright.)
    back() {
      const layer = FM.selectedLayer(FM.scene);
      if (!layer) return false;
      if (FM._mtEasing || FM._volEasing || FM._spdEasing || FM._fxEasing || FM._cropEasing) {
        FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._fxEasing = null; FM._cropEasing = false; this.refresh(); return true;
      }
      if (view !== 'home') { view = 'home'; kfNavSync(); this.refresh(); return true; }
      FM.selectLayer(null); kfClearSel(); return true;   // at the grid → deselect (closes the editor)
    },
    refresh() {
      // A selectedId that no longer resolves is the worst state this panel can be in: the app believes
      // something is selected (top bar, delete button, keyboard shortcuts, the mobile sheet) while the
      // inspector falls through to the Add menu — "a layer is selected but the edit options are gone".
      // A layer can vanish under the id from a dozen directions (delete, undo/redo, group/ungroup,
      // entering or leaving a group, a project load, an AI edit), so rather than patch each one, the
      // truth is re-established HERE, on the one path all of them already run through.
      if (FM.scene) {
        if (FM.scene.selectedId && !FM.layerById(FM.scene, FM.scene.selectedId)) FM.scene.selectedId = null;
        if (Array.isArray(FM.scene.selectedIds) && FM.scene.selectedIds.length) {
          const live = FM.scene.selectedIds.filter(id => !!FM.layerById(FM.scene, id));
          if (live.length !== FM.scene.selectedIds.length) FM.scene.selectedIds = live;
          // the primary is gone but others survive → promote one, don't strand the set with no primary
          if (!FM.scene.selectedId && live.length) FM.scene.selectedId = live[live.length - 1];
        }
      }
      const layer = FM.selectedLayer(FM.scene);
      const title = document.querySelector('#inspector-panel .panel-title');
      // A sub-view can be much taller than the grid, and the sheet keeps its scroll across a rebuild —
      // land back at the top whenever the LAYER or the VIEW changes, or you return to a short panel
      // already scrolled past its own content and it reads as empty. Same-view refreshes (a slider
      // dragging, the playhead crossing a clip edge) deliberately leave the scroll alone.
      const navSig = (layer ? layer.id : '-') + '/' + view;
      const navChanged = navSig !== lastNavSig; lastNavSig = navSig;
      root.innerHTML = '';
      // The easing editor is the one sub-view that has to FIT rather than scroll — its graph shrinks
      // into whatever height is left (see #inspector-panel.insp-ease in styles.css). Cleared on every
      // rebuild and re-applied at the bottom of this function from what actually got built, so no
      // branch can leave the panel stuck as a flex column after you navigate away from it.
      const panelEl = document.getElementById('inspector-panel');
      if (panelEl) panelEl.classList.remove('insp-ease');
      if (navChanged && root.scrollTop) root.scrollTop = 0;
      if (!layer) {
        // AM model: nothing selected → show the Add menu (same one the mobile + button opens).
        // Selecting a clip swaps this for the property editor (refresh() re-runs on select).
        // Clearing lastLayerId means re-selecting a layer (even the SAME one) reopens at the category
        // GRID, not the sub-menu you last had open — deselecting is a clean reset (Ezra).
        lastLayerId = null;
        if (FM.pointEdit && FM.pointEdit.isActive() && FM.pointEdit.isEmbedded()) FM.pointEdit.stop();   // deselect ends Edit Points
        if (FM.fillDrag && FM.fillDrag.isActive()) FM.fillDrag.stop();                                   // …and hands the canvas back from the fill drag
        if (title) title.textContent = 'Add';
        if (FM.addMenu) FM.addMenu.render(root, { variant: 'panel' });
        else root.appendChild(el('div', 'empty', 'Select a layer to edit it.'));
        return;
      }
      if (title) title.textContent = 'Inspector';
      if (layer.id !== lastLayerId) { view = 'home'; lastLayerId = layer.id; kfClearSel(); FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._fxEasing = null; FM._cropEasing = false; FM._camTab = 'view'; fxTab = 'visual'; }
      if (view !== 'home' && !viewAllowed(layer, view)) { view = 'home'; FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._fxEasing = null; FM._cropEasing = false; FM._camTab = 'view'; }   // a category that doesn't apply to this layer (e.g. after a media replace) → drop to the grid
      // Every numbered category is a SINGLE-layer editor — it builds from the primary layer and writes
      // to it alone. Left open while a second clip is selected it silently edits one of them, so
      // selecting more drops straight back to the multi actions.
      if (view !== 'home' && FM.selectionIds && FM.selectionIds().length >= 2) { view = 'home'; FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._fxEasing = null; FM._cropEasing = false; FM._camTab = 'view'; }
      // "Edit Text" IS the focused editor: opening the text element category launches the full-screen
      // text-edit mode OVER the grid, then leaves the inspector on the grid so ✓/Esc lands back on the
      // category list (Color & Fill, Border & Shadow, Effects, …) — not a one-off popup. Adding text
      // uses the same editor as a shortcut (app.js addTextLayer).
      if (view === 'element' && layer.type === 'text' && FM.textEdit) {
        view = 'home';
        const tid = layer.id;
        if (!FM.textEdit.isActive() || FM.textEdit.layerId() !== tid) setTimeout(() => { if (FM.textEdit && (!FM.textEdit.isActive() || FM.textEdit.layerId() !== tid) && FM.scene.layers.some(l => l.id === tid)) FM.textEdit.start(tid); }, 0);
      }
      // Embedded Edit-Points lifecycle: the overlay lives exactly as long as the Edit Points view —
      // leaving the view (back / other category / other layer / deselect) tears it down.
      if (FM.pointEdit && FM.pointEdit.isActive() && FM.pointEdit.isEmbedded() && (view !== 'element' || FM.pointEdit.layerId() !== layer.id)) FM.pointEdit.stop();
      // Same contract for the fill-position drag: it lives exactly as long as Colour & Fill's
      // Gradient/Media tab is open ON THIS LAYER. Leaving the view, switching tab, selecting another
      // layer or clearing the picture all release the canvas here, one frame before the panel rebuilds.
      if (FM.fillDrag && FM.fillDrag.isActive() &&
        (view !== 'color' || FM.fillDrag.layerId() !== layer.id || FM.fillDrag.mode() !== fillDragMode(layer))) FM.fillDrag.stop();
      // The old header row (thumbnail + name + duplicate + delete) is gone: the thumbnail lives on
      // the timeline, duplicate is on the transport row, delete moved to the top bar, and rename is
      // now the top-bar name field. So the inspector goes straight to the actions.
      if (view === 'home') {
        const multi = FM.selectionIds && FM.selectionIds().length >= 2;
        // multi-select: the multi bar's trim/split/delete act on the WHOLE selection — showing the
        // single-layer quick row above it too was a confusing near-duplicate (it hit only the primary)
        // The numbered 1-9 grid is a set of SINGLE-layer editors: each card builds its panel from the
        // primary layer and writes to that one only. With several clips selected they promise to edit
        // the selection and don't, which is worse than not offering them (Ezra: "we've still got all
        // the controls that don't need to exist when you select multiple layers"). A multi-selection
        // gets the actions that genuinely apply to all of it — trim, split, move, align — and nothing
        // that would quietly touch just one.
        if (!multi) { root.appendChild(quickRow(layer)); root.appendChild(categoryGrid(layer)); }
        else root.appendChild(alignRow());
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
      } else if (view === 'speed' && FM._spdEasing && FM.buildEasingEditorFor) {
        // Speed easing curve — inline sub-view of the Speed panel (speed ramping).
        const back = el('button', 'cat-back', '‹  Speed');
        back.addEventListener('click', () => { FM._spdEasing = false; FM.inspector.refresh(); });
        root.appendChild(back);
        const bodyEl = el('div', 'cat-body');
        bodyEl.appendChild(FM.buildEasingEditorFor(layer, () => layer.speed, ['speed'], 'speed'));
        root.appendChild(bodyEl);
      } else if (view === 'effects' && fxTabFor(layer) === 'audio' && FM._fxEasing && FM.buildEasingEditorFor && (layer.audioFx || [])[FM._fxEasing.fxIdx]) {
        // Per-parameter easing for an audio effect — inline sub-view of the Effects panel's AUDIO tab.
        // FM._fxEasing is shared with the visual stack: the two sides are mutually exclusive, so the
        // tab is what decides which stack the index refers to. This must be tested BEFORE the visual
        // branch, or an audio index would be read against layer.effects.
        const info = FM._fxEasing, fx = layer.audioFx[info.fxIdx];
        const back = el('button', 'cat-back', '‹  Audio Effects');
        back.addEventListener('click', () => { FM._fxEasing = null; FM.inspector.refresh(); });
        root.appendChild(back);
        const bodyEl = el('div', 'cat-body');
        bodyEl.appendChild(FM.buildEasingEditorFor(layer, k => fx.params[k], [info.key], info.label || info.key));
        root.appendChild(bodyEl);
      } else if (view === 'effects' && FM._fxEasing && FM.buildEasingEditorFor && (layer.effects || [])[FM._fxEasing.fxIdx]) {
        // Per-parameter easing for ANY effect — inline sub-view of the Effects panel.
        const info = FM._fxEasing, fx = layer.effects[info.fxIdx];
        const back = el('button', 'cat-back', '‹  Effects');
        back.addEventListener('click', () => { FM._fxEasing = null; FM.inspector.refresh(); });
        root.appendChild(back);
        const bodyEl = el('div', 'cat-body');
        bodyEl.appendChild(FM.buildEasingEditorFor(layer, k => fx.params[k], [info.key], info.label || info.key));
        root.appendChild(bodyEl);
      } else if (view === 'element' && FM._cropEasing && FM.buildEasingEditorFor && layer.crop) {
        // Crop easing — inline sub-view of the Edit Shape (crop) panel.
        const back = el('button', 'cat-back', '‹  ' + elementLabel(layer));
        back.addEventListener('click', () => { FM._cropEasing = false; FM.inspector.refresh(); });
        root.appendChild(back);
        const bodyEl = el('div', 'cat-body');
        bodyEl.appendChild(FM.buildEasingEditorFor(layer, k => layer.crop[k], ['w', 'h', 'x', 'y'], 'Crop'));
        root.appendChild(bodyEl);
      } else {
        const cat = CATEGORIES.find(c => c.key === view);
        const backLabel = (view === 'element') ? elementLabel(layer) : (cat ? cat.label : 'Back');
        const back = el('button', 'cat-back', '‹  ' + backLabel);
        back.addEventListener('click', () => { view = 'home'; FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._fxEasing = null; FM._cropEasing = false; FM.inspector.refresh(); });
        // AM shows the crop controls (aspect lock + size origin) at the top-RIGHT of the Edit Shape
        // header — put them on the header row for media so they sit far right, not buried in the body.
        if (view === 'element' && (layer.type === 'video' || layer.type === 'image') && FM._inspectorCropToggles) {
          const head = el('div', 'cat-head-row');
          back.classList.add('cat-back-flex');
          head.appendChild(back);
          head.appendChild(FM._inspectorCropToggles(layer));
          root.appendChild(head);
        } else {
          root.appendChild(back);
        }
        const bodyEl = el('div', 'cat-body');
        buildCategory(view, layer, bodyEl);
        root.appendChild(bodyEl);
      }
      if (panelEl && root.querySelector('.es-inline')) panelEl.classList.add('insp-ease');
    },
  };
})(window.FM);
