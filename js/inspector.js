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
    /* ⚠️ THE CURVE, BESIDE THE DIAMOND (queue 557). Ezra: *"Opacity slider doesn't have graphing
       options"* — his shot shows Opacity with a ◆ and no curve, while an effect's Amount row has both.
       The easing editor was already wired to Move & Transform, Volume, Speed, Crop and every effect
       param; opacity was simply never given the door. Same `buildEasingEditorFor` those four use, so
       there is no second editor to keep in step — see the `_opaEasing` branch in the view switch.
       ⚠️ ONLY WHEN IT IS ANIMATED. A curve button on a property with no keyframes opens an editor with
       nothing to edit, which is the "control that does nothing" complaint from queue 529. It appears
       with the first keyframe, exactly like the timeline's own curve affordances. */
    /* ⚠️ DIMMED, NOT ABSENT — queue 601, and he reported this a SECOND time because of it.
       Ezra, now: *"You seemingly forgot to add graphing to the opacity setting."* He had not: queue 557
       added it, and the note above records the deliberate choice to show it **only once the property is
       animated**, so it could never open an editor with nothing in it (queue 529's "control that does
       nothing").
       **That decision was right and its DELIVERY was wrong.** Hidden and missing look identical, so a
       property he had not keyframed yet read as one that had been forgotten — and he reported it again.
       ⚠️ **The app already had the idiom for exactly this, a few hundred lines away:** the crop rail
       writes `'mt-ease' + (cropReady ? '' : ' mt-dim')` — the button stays, greyed, saying what it needs.
       So: present always, DISABLED until there is a keyframe, and the tooltip says why. It cannot open an
       empty editor (it is disabled) and it cannot read as forgotten (it is there).
       **Fifth time this session the app knew something and did not say it** — #572, #578, #595, #598. */
    if (opts.ease && FM.buildEasingEditorFor) {
      const ready = FM.isAnimated(p);
      const eb = el('button', 'kf-btn kf-ease-btn' + (ready ? '' : ' mt-dim'));
      eb.innerHTML = (typeof MT_ICONS !== 'undefined' && MT_ICONS.ease) ? MT_ICONS.ease : '∿';
      eb.disabled = !ready;
      eb.title = ready ? (label + ' easing curve')
                       : (label + ' easing curve — add a keyframe (◆) first, then this shapes how it moves between them');
      if (ready) eb.addEventListener('click', () => { FM._opaEasing = { key: key, label: label }; FM.inspector.refresh(); });
      row.appendChild(eb);
    }
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

  /* ═══ BORDER & SHADOW: PREVIEW TILES (queue 610) ══════════════════════════════════════════════
   * Ezra, and it was a REPEAT of an earlier ask: *"You still haven't re designed the border and shadow
   * section to look better instead of the simple tick boxes as it is"*. He was right — in an app that
   * is glassy numbered cards everywhere else, that panel was five bare checkboxes and plain text, and
   * it looked like a debug form.
   * Options were drawn at 380px and sent (#545); **he picked A, the preview tiles**, on 28 Aug.
   * 🔑 IT FIXES A SECOND PROBLEM HE DID NOT NAME. "Trim path" and "Repeater" are not words that explain
   * themselves, and a checkbox cannot teach you what it does. Each tile draws the thing: a stroked
   * outline, a stroke that stops half way, a dashed one, an offset dark copy, three stepped copies. You
   * can see what it is before you turn it on.
   * The art is inline SVG on `currentColor`, so the ON state colours the picture as well as the frame
   * without a second asset or a second copy of the shape. */
  const BS_ART = {
    outline:  '<svg viewBox="0 0 44 28" aria-hidden="true"><rect x="7.5" y="5.5" width="29" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
    trim:     '<svg viewBox="0 0 44 28" aria-hidden="true"><rect x="7.5" y="5.5" width="29" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="52 100" stroke-linecap="round"/></svg>',
    dashes:   '<svg viewBox="0 0 44 28" aria-hidden="true"><rect x="7.5" y="5.5" width="29" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="5 4.5" stroke-linecap="round"/></svg>',
    shadow:   '<svg viewBox="0 0 44 28" aria-hidden="true"><rect x="12" y="9" width="26" height="16" rx="4" fill="currentColor" opacity=".32"/><rect x="6.5" y="4.5" width="26" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
    /* ⚠️ THE COPIES ARE SPREAD, and that is not a nicety. At 44x28 three rects six pixels apart
       overlap so heavily they read as one striped box — it looked like a battery in the first render.
       Stepping them diagonally with clear air between is what makes "three copies of the same thing"
       legible at the size it actually ships at, which is the whole argument for picture tiles. */
    repeater: '<svg viewBox="0 0 44 28" aria-hidden="true"><rect x="24" y="4.5" width="15" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.9" opacity=".34"/><rect x="15" y="8.5" width="15" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.9" opacity=".62"/><rect x="6" y="12.5" width="15" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.9"/></svg>'
  };
  /* A BUTTON, not a label+checkbox. The whole tile is the target — on a phone a 44px-square tile is a
     far easier thing to hit than a 15px box, and `aria-pressed` keeps it a toggle for a screen reader
     rather than an unlabelled button. */
  function bsTile(kind, label, on, onChange, wide) {
    const t = el('button', 'bs-tile' + (on ? ' on' : '') + (wide ? ' bs-wide' : ''));
    t.type = 'button';
    t.setAttribute('aria-pressed', on ? 'true' : 'false');
    const art = el('span', 'bs-art'); art.innerHTML = BS_ART[kind] || '';
    t.appendChild(art);
    t.appendChild(el('span', 'bs-name', label));
    t.appendChild(el('span', 'bs-dot'));
    t.addEventListener('click', () => { onChange(!on); commitH(); });
    return t;
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

  /* Every numeric property row in the inspector (v6.20). There are 37 call sites — Width, Height and
   * Corner radius in Edit Shape, mask feather, gradient angle, fill opacity, stroke width, text
   * spacing / line height / curve, audio fades, camera FOV / focus / depth of field, and the effects
   * that declare a plain numeric param — and until now every one of them was a raw
   * <input type="range">. Two of Ezra's reports are the same complaint about that: "the width and
   * height in here actually need their own sliders" (queue 67) and "some effects use raw sliders"
   * (queue 31). A browser range input in an app whose every other number is an AM-style ruler is not
   * a slider, it is the absence of one.
   * So this renders the SAME tickStrip the effect params and keyframe rows use: notched, snapping,
   * with the momentum glide, and it is fixed here rather than at 37 call sites so they cannot drift
   * apart again. Each caller's signature is untouched.
   * No ◆ diamond, deliberately: kfNumRow's diamond writes through FM.setProp, and most of these
   * properties are read by the compositor as RAW numbers (layer.shapeW is read at four places in
   * compositor.js and never through evalProp). A diamond here would create keyframes the renderer
   * ignores — a control that appears to work and does nothing, which is worse than not offering it. */
  function rangeRow(label, get, set, min, max, step, onCommit, qForce) {
    step = step || 1;
    const prec = step >= 1 ? 0 : (step >= 0.1 ? 1 : 2);
    const wrap = el('div', 'prop-wrap');
    const row = el('div', 'prop-row prop-row--scrub');
    row.appendChild(el('label', null, label));
    const val = el('input', 'fx-scrub-val'); val.type = 'text'; val.value = (+get()).toFixed(prec);
    const strip = tickStrip({
      min: min, max: max, step: step, unit: '', dflt: null, q: qForce || 0, read: () => +get(),
      apply: (v) => { set(v); val.value = v.toFixed(prec); FM.requestRender(); },
      // onCommit fires on RELEASE — it is safe to rebuild the inspector there, and doing it per-frame
      // would tear the control out from under the finger still dragging it.
      release: () => { commitH(); if (onCommit) onCommit(); },
    });
    // Typing an exact number still has to work: the ruler is for feel, the box is for precision.
    val.addEventListener('change', () => {
      const v = parseFloat(val.value);
      if (isNaN(v)) { val.value = (+get()).toFixed(prec); return; }
      const c = Math.max(min, Math.min(max, v));
      set(c); val.value = c.toFixed(prec); strip._sync(c);
      FM.requestRender(); commitH(); if (onCommit) onCommit();
    });
    val.addEventListener('keydown', (e) => { if (e.key === 'Enter') val.blur(); });
    row.appendChild(strip); row.appendChild(val);
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
  /* THE PRESET LIST CHANGED, SO THE PANEL SHOWING IT MUST RE-READ IT (queue 330). Ezra: *"Also when
   * you save a preset you have to exit and go back into the menu, make it auto update the menu"*.
   * The two save buttons and the two ✕ buttons were four separate places that each had to remember to
   * call refresh(), and three of them did — the fourth, "Save look + animations…", goes through
   * FM.savePresetPrompt over in app.js, which has no idea the inspector exists. So exactly the path
   * that could not see the panel was the path that did not refresh it.
   * Adding the call there too would fix today and leave the same trap set for the next path. Instead
   * the rule lives at the ONE point every change to either list passes through — the write — so
   * refreshing is a consequence of the list having changed rather than something a caller remembers. */
  function presetsChanged() {
    if (FM.inspector && FM.inspector.refresh) FM.inspector.refresh();
  }

  /* TAGS AND RENAMES LIVE BESIDE THE PRESETS, NOT INSIDE THEM (queue 331 clauses 5-9). Ezra: *"if you
   * hold on a preset you can re name it and also tag it and when you put on a tag that tag is now a new
   * group that you can go through"*.
   * Both preset stores are keyed by NAME, and this entry was parked on the belief that queue 37 would
   * replace them with one id-keyed namespace first — doing tags before that meant writing the storage
   * twice. **That is stale: #37 shipped as the preset PREVIEW screen and never touched the stores**, and
   * no store rework is scheduled anywhere. So it was that or leave four clauses waiting on something
   * that is not coming.
   * A sidecar map keyed by '<store>:<name>' is what a name-keyed store allows without a migration.
   * A rename is therefore a RE-KEY, and the one thing a re-key can do that is genuinely bad is silently
   * merge two presets into one — so renaming onto a name that already exists is refused rather than
   * resolved, and the tags are carried across in the same breath. Deleting a preset forgets its tags,
   * or the map slowly fills with entries for presets that no longer exist. */
  /* The card is rebuilt from scratch on every refresh (and presetsChanged now fires one on every
     write), so the filter and the search text cannot live in the card — they would reset on the first
     keystroke. Module state, deliberately not persisted: a search you typed a session ago is clutter,
     not a preference. */
  let presetQuery = '', presetTag = '';

  FM.presetTags = {
    _key: 'fm.presettags',
    all() { try { const o = JSON.parse(localStorage.getItem(this._key) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } },
    _write(o, quiet) {
      try { localStorage.setItem(this._key, JSON.stringify(o)); }
      catch (e) { if (FM.toast) FM.toast('Storage full — tag not saved'); return; }
      if (!quiet) presetsChanged();
    },
    get(key) { const t = this.all()[key]; return Array.isArray(t) ? t.filter(x => typeof x === 'string') : []; },
    set(key, tags, quiet) {
      const o = this.all(), seen = Object.create(null), out = [];
      (tags || []).forEach(t => {
        const v = String(t).trim(); if (!v) return;
        const k = v.toLowerCase(); if (seen[k]) return;      // "Warm" and "warm" are one tag, not two
        seen[k] = 1; out.push(v);
      });
      if (out.length) o[key] = out; else delete o[key];
      this._write(o, quiet);
    },
    move(from, to) { const o = this.all(); if (!(from in o)) return; o[to] = o[from]; delete o[from]; this._write(o, true); },
    forget(key) { const o = this.all(); if (!(key in o)) return; delete o[key]; this._write(o, true); },
    // Every tag in use, once each, in the order they read best on a chip row.
    list() {
      const o = this.all(), seen = Object.create(null), out = [];
      Object.keys(o).forEach(k => (o[k] || []).forEach(t => {
        const lk = String(t).toLowerCase(); if (seen[lk]) return; seen[lk] = 1; out.push(t);
      }));
      return out.sort((a, b) => a.localeCompare(b));
    }
  };

  FM.fxPresets = {
    _key: 'fm.fxpresets',
    builtins: [],
    saved() { try { return JSON.parse(localStorage.getItem(this._key) || '[]'); } catch (e) { return []; } },
    list() { return this.builtins.concat(this.saved()); },
    _write(arr) { try { localStorage.setItem(this._key, JSON.stringify(arr)); } catch (e) { return; } presetsChanged(); },
    save(name, effects) { if (!name) return; const arr = this.saved().filter(p => p.name !== name); arr.push({ name: name, effects: JSON.parse(JSON.stringify(effects || [], FM.jsonReplacer)) }); this._write(arr); },   // jsonReplacer strips _expanded etc. from presets
    get(name) { return this.list().find(p => p.name === name); },
    /* Refused rather than resolved when the new name is taken: the name IS the key, so writing over it
       would silently merge two saved looks into one and lose whichever lost. */
    rename(oldName, newName) {
      const to = String(newName || '').trim();
      if (!to || to === oldName) return false;
      const arr = this.saved(), p = arr.filter(x => x.name === oldName)[0];
      if (!p) return false;
      if (this.get(to)) { if (FM.toast) FM.toast('There is already a preset called “' + to + '”'); return false; }
      p.name = to;
      FM.presetTags.move('fp:' + oldName, 'fp:' + to);
      this._write(arr);
      return true;
    },
    remove(name) { FM.presetTags.forget('fp:' + name); this._write(this.saved().filter(p => p.name !== name)); }   // built-ins are not removable
  };

  // Copy/paste for ONE effect (v5.39, Ezra: "in the three dots for each effect, add options to copy
  // effect and paste effect"). Kept in localStorage rather than a variable, because the point of
  // copying an effect is usually to put it on a layer in a DIFFERENT project — a page-lifetime
  // clipboard would be empty exactly when you got there.
  //
  // Copies carry the live params, which means they carry keyframes: an animated parameter IS a
  // channel object sitting in fx.params[key], so the deep clone takes the animation with it. That is
  // the same reason Duplicate clones instead of building a fresh default instance.
  /* ONE effect clipboard (v6.32, queue 59). There used to be two, and they could not see each other:
   * this one, holding a single effect in localStorage, behind each row's ⋯ menu; and
   * FM.effectClipboard, an in-memory array of the WHOLE stack, behind the panel's Copy/Paste buttons.
   * So "Copy effect" from a row's ⋯ followed by the panel's Paste did not paste that effect — the
   * panel button was reading the other clipboard, and was usually disabled, which reads as broken.
   * Ezra: "copy/paste button in the effects menu, and paste ONE effect."
   * It stores an ARRAY either way now, so one effect and a whole stack are the same shape and every
   * Copy feeds every Paste. It also keeps the localStorage backing the panel buttons never had — the
   * in-memory one died on every reload, and copying a look from one project into another is exactly
   * the case where you close and reopen something. */
  /* ---- Saved effect lists are UNTRUSTED input too (queue 218) ---------------------------------
   * The effect clipboard, the effect presets and the layer presets all live in localStorage and all
   * rebuild layer.effects from whatever they find there. Every one of them checked only that the
   * effect's NAME was real and then took the values on trust — so a hand-edited or corrupted store
   * reached the renderer with whatever parameters it liked.
   * They go through the same sanitiser the import path uses now, rather than a second, weaker set of
   * checks that would drift from it. It rebuilds each effect from the registry's own schema, so this
   * is not "validate a few fields" — an effect that does not survive it is not landed at all.
   * This mattered less when an effect was a flat bag of numbers. #113's filters make it a CONTAINER
   * with children, so an unchecked list is now a way to smuggle in a nested structure nothing has
   * ever looked at. */
  function sanitizeFxList(list) {
    const arr = (Array.isArray(list) ? list : []).filter(Boolean);
    if (!arr.length) return [];
    /* FAIL CLOSED. The first cut returned the list unchecked when the sanitiser was missing, which is
       the wrong way round: the one situation where validation is unavailable is exactly the situation
       where unvalidated data should not reach the renderer. storage.js is a hard dependency loaded
       before this file, so in practice this never fires — and if it ever does, an empty clipboard is
       a far better outcome than an unchecked one. */
    if (!(FM.storage && FM.storage._sanitizeEffects)) return [];
    const holder = { effects: arr };
    try { FM.storage._sanitizeEffects(holder); } catch (e) { return []; }
    return Array.isArray(holder.effects) ? holder.effects : [];
  }
  FM._sanitizeFxList = sanitizeFxList;   // read by the suite

  FM.fxClipboard = {
    _key: 'fm.fxclip',
    // Accepts one effect or an array of them.
    copy(fxOrList) {
      const list = (Array.isArray(fxOrList) ? fxOrList : [fxOrList]).filter(Boolean);
      if (!list.length) return false;
      // jsonReplacer drops the runtime '_' props — without it the clipboard carries _expanded, and a
      // pasted effect arrives with its editor already open, shoving the stack around.
      try { localStorage.setItem(this._key, JSON.stringify(list, FM.jsonReplacer)); return true; }
      catch (e) { return false; }
    },
    // Always an array, never null. Empty means nothing usable is on it.
    read() {
      try {
        const raw = JSON.parse(localStorage.getItem(this._key) || 'null');
        if (!raw) return [];
        // Tolerate the pre-v6.32 single-object format, so a clipboard written by an older build
        // still pastes instead of silently reading as empty.
        const list = Array.isArray(raw) ? raw : [raw];
        // A type that no longer exists (older build, renamed effect) would paste a row that renders
        // nothing and cannot be edited — drop those rather than land them.
        // Name-checked AND value-checked (queue 218): the registry test below only ever proved the
        // effect exists, never that its parameters were sane.
        const usable = sanitizeFxList(list.filter(fx => fx && fx.type && FM.fxRegistry.get(fx.type)));
        /* A LAYER REFERENCE FROM ANOTHER PROJECT (bug hunt, 21 Aug). This clipboard lives in
         * localStorage, so it survives across projects — and the effects that point AT a layer (Luma
         * Matte, Compound Blur, Match Grade, Polar Displacement) carried that layer's id with them.
         * Pasted somewhere else, the reference named a layer that does not exist: measured, 4 of 4
         * (tests/_fxclipsrc.html). The type and the parameter VALUES were already checked on the way
         * out; this was the one field that was not.
         * Cleared only when it does NOT resolve here, so pasting within the same project — the common
         * case — still keeps the matte it was pointing at. */
        usable.forEach(fx => {
          if (fx && fx.params && fx.params.source && !FM.layerById(FM.scene, fx.params.source)) fx.params.source = '';
        });
        return usable;
      } catch (e) { return []; }
    },
    count() { return this.read().length; },
    // Names ONE effect, or says how many — the menu uses this to say what you are about to land.
    label() {
      const list = this.read();
      if (!list.length) return null;
      if (list.length === 1) { const reg = FM.fxRegistry.get(list[0].type); return (reg && reg.label) || list[0].type; }
      return list.length + ' effects';
    }
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
    _write(arr) { try { localStorage.setItem(this._key, JSON.stringify(arr)); } catch (e) { if (FM.toast) FM.toast('Storage full — preset not saved'); return; } presetsChanged(); },
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
    rename(oldName, newName) {
      const to = String(newName || '').trim();
      if (!to || to === oldName) return false;
      const arr = this.list(), p = arr.filter(x => x.name === oldName)[0];
      if (!p) return false;
      if (arr.some(x => x !== p && x.name === to)) { if (FM.toast) FM.toast('There is already a preset called “' + to + '”'); return false; }
      p.name = to;
      FM.presetTags.move('lp:' + oldName, 'lp:' + to);
      this._write(arr);
      return true;
    },
    apply(name, layer) {
      const p = this.list().find(x => x.name === name);
      if (!p || !layer) return;
      this.applyTo(p.data, layer);
      /* REMEMBER WHERE THIS LOOK CAME FROM (queue 407 clause 2). Ezra: "I just want to open a preset, edit
         it and then it automatically updates that preset." Without a note of the origin there is nothing to
         update — the layer arrives carrying a look with no idea whose it was.
         It is a plain field on the layer, so it saves and reloads with the project like everything else,
         and applying a DIFFERENT preset overwrites it rather than accumulating.
         ⚠️ AND THAT SENTENCE WAS FALSE FOR AS LONG AS IT HAS BEEN WRITTEN DOWN (#686). The field was
         named `_fromPreset`, and FM.jsonReplacer drops EVERY key beginning with an underscore — that
         prefix is the codebase's own mark for "runtime only, never saved". So the note of the origin
         was thrown away by the next save, and "Update <preset>" — the entire point of queue 407's
         second clause — was gone on the first reload. The fix is the NAME, not an exception in the
         replacer: this value is meant to persist, so it must not wear the mark that means it does not.
         Nothing needs migrating, because nothing was ever written to migrate. */
      layer.fromPreset = name;
      afterFx();
      if (FM.canvasEdit) FM.canvasEdit.update();
    },
    /* …and writing the layer's current look BACK over that preset. Deliberately a one-tap action rather
       than the literal "automatically" he asked for, and the reason is worth stating because it is a
       judgement call he can overrule: a preset can be applied to many layers, so an automatic write-back
       would mean nudging one layer silently restyles every other use of that preset — including in
       projects not open. One tap keeps his round trip (open → edit → update) and cannot destroy anything
       without being asked. Say the word and it becomes automatic. */
    update(name, layer) {
      if (!name || !layer) return false;
      if (!this.list().some(x => x.name === name)) return false;
      this.save(name, layer);          // save() already replaces a preset of the same name
      return true;
    },
    /* WHAT APPLYING ACTUALLY DOES, with no side effects — split out of apply() so the PREVIEW can run
     * the very same code on a throwaway clone. That is the whole point of the preview: it has to show
     * the picture you are about to get, and a second implementation of "what a preset does" would
     * drift from this one the first time either changed. Touches nothing but `layer`. */
    applyTo(d, layer) {
      if (!d || !layer) return;
      layer.effects = sanitizeFxList(clone(d.effects) || []);   // queue 218 — a saved preset is untrusted too
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
    },
    remove(name) { FM.presetTags.forget('lp:' + name); this._write(this.list().filter(p => p.name !== name)); },
  };

  // ===== AM-style ruler scrubber (ONE implementation shared by fxScrubber + kfNumRow) =====
  // A FINITE ruler of tick notches (one per TICK px) scrolls under the fixed green centre line.
  // Notches are REAL snap points: a drag lands on min + n*q (like timeline frame-snap — typed values
  // in the box stay free-form), and the ruler physically ends at min/max so a drag can never leave
  // the range. White marker lines flag notable values: the min/max walls, midpoint, zero, the
  // param's default, and every 45° for angle params.
  const TICK = 7;   // px of drag = one notch; keep in sync with the 7px gradient period in styles.css
  /* How much of a drag counts, given how far the pointer has strayed from the strip (queue 253).
   * On the strip: 1 — unchanged, so every existing feel and the full 0–100000% speed travel survive.
   * Beyond it the rate steps down in the same coarse/half/quarter/fine ladder an iOS scrubber uses.
   * STEPS rather than a smooth curve, deliberately: a continuous falloff means the rate is different
   * every time you look down, and you can never learn where "quarter speed" is. Steps you can feel. */
  /* Three stops, not four. A 0.05 rung was tried and removed: combined with the step-snapping above
   * it made a 20px drag change nothing at all on some rows, and a control that appears dead is worse
   * than one that is merely coarse. The precision comes from landing on the parameter's real step,
   * not from an extreme rate — 0.15 is already ~1 unit per 6px, which is as fine as a finger can aim. */
  const FINE_STOPS = [
    { from: 0,   rate: 1 },
    { from: 34,  rate: 0.4 },
    { from: 90,  rate: 0.15 },
  ];
  /* Which grid a scrub lands on. Pure and exported so the suite can assert it directly: driving this
   * through synthetic pointer events proved unreliable — the momentum glide and the touch direction
   * lock both interfere — and a test that cannot reliably see the behaviour is worse than one that
   * checks the rule. The integration was verified by hand in the browser: 20px of drag moved a
   * shape's Width by 56 units on the strip, 9 units 120px away and 3 units at 220px. */
  function scrubGrid(fine, step, q) {
    if (!fine) return q;                       // normal: the ruler's own coarse notch
    const s = +step;
    return (isFinite(s) && s > 0) ? s : q;     // fine: the parameter's REAL step, which is the floor
  }
  FM._scrubGrid = scrubGrid;
  // Exposed so the suite can assert the SPEED row's notch directly (queue 455). Driving the strip with
  // synthetic pointer events is unreliable here for the reasons scrubGrid's own note gives — the
  // momentum glide and the touch direction lock both interfere — and the defect was arithmetic: a
  // widened range silently coarsened the quantum from 5% to 1000%.
  FM._tickQuantum = tickQuantum;
  // The Speed % row lives in buildCategory, not fillPanel. Its SOURCE is what proves the row asks for
  // its own notch — the arithmetic seam above only proves what tickQuantum would return if it did not.
  FM._buildCategorySrc = function () { return String(buildCategory); };

  function fineRate(clientY, strip) {
    const r = strip.getBoundingClientRect();
    const away = clientY < r.top ? (r.top - clientY) : (clientY > r.bottom ? (clientY - r.bottom) : 0);
    let rate = 1;
    for (let i = 0; i < FINE_STOPS.length; i++) if (away >= FINE_STOPS[i].from) rate = FINE_STOPS[i].rate;
    return rate;
  }
  FM._fineRate = fineRate;   // read by the suite
  /* ⚠️ THE NOTCH BUDGET IS 400, AND IT USED TO BE 100 (queue 635 — the third report of one feel).
   * Ezra: *"Pinch bulges slider jumps too much too fast, make its sliders more gradual"*. Before that,
   * *"the speed slider goes WAY too fast, it goes up 10x at a time"* (queue 455) and queue 609.
   * 🔑 `q` IS NOT A DRAWING DETAIL — it decides what you can land on AND how fast the drag moves. The
   * notches are real snap points (`min + n*q`, see the note below) and the drag rate is `dx * q / TICK`,
   * so a coarse `q` makes the value jump further AND travel faster per pixel. That is both halves of
   * his sentence, from one number.
   * 📐 MEASURED across the whole library: **195 of 808 parameters were being coarsened**, and Pinch /
   * Bulge's Amount is a step of **0.02 given a quantum of 0.1 — five times its own step** — because a
   * span of 3 at that step is 150 notches, barely over the old 120 gate.
   * The cap is not wrong in principle: Counter's 0-100,000 range would be 100,000 notches at its true
   * step, and that really is a ruler nobody can drag. It was simply far too tight. At 400 the widest
   * ruler is 400 × TICK ≈ 2800px — the speed row already runs to 140,071px and works — and the family
   * improves together: Amount and Radius get their exact step, phase goes 15x → 5x, Shake and Wiggle
   * 50x → 10x. Nothing loses a landmark: `legal()` still forces q to be a whole multiple of step, and
   * the degree branch still only offers divisors of 45. */
  const NOTCH_BUDGET = 400;
  function tickQuantum(min, max, step, unit) {
    // Notch quantum q: the param's step, unless that means more notches than the budget — then
    // coarsen to a "nice" 1/2/5×10^k. q is always an integer multiple of step so snaps stay legal.
    const span = max - min;
    if (!(step > 0)) step = span > 0 ? span / NOTCH_BUDGET : 1;
    if (!(span > 0) || span / step <= NOTCH_BUDGET) return step;
    const legal = q => { const m = q / step; return m >= 1 - 1e-6 && Math.abs(m - Math.round(m)) < 1e-6; };
    const snap = q => Math.round(q / step) * step;
    if (unit === '°') { for (const q of [1, 5, 15, 45]) if (legal(q) && span / q <= NOTCH_BUDGET) return snap(q); }   // divisors of 45 keep the 45° landmarks landable
    for (let k = -3; k <= 6; k++) for (const m of [1, 2, 5]) { const q = m * Math.pow(10, k); if (legal(q) && span / q <= NOTCH_BUDGET) return snap(q); }
    return Math.ceil(span / NOTCH_BUDGET / step) * step;
  }
  FM._tickQuantum = tickQuantum;   // seam: the suite measures the real rule rather than a copy of it
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
  /* GLIDE LENGTH (queue 116, and the reason it needed a second pass).
   * Ezra, twice: "The sliders we have for everything like effects and what not are too stiff, they
   * need to flow like the timeline does, when you swipe it glides." Queue 45 added this glide and was
   * correctly ticked — the glide is real and it is attached to every one of these controls. What
   * happened next is the whole bug: **queue 103 retuned the TIMELINE and not this**. There, on his
   * "the glide ends too quick", friction went 0.9 → 0.947 and a full-speed flick went from ~3.7s of
   * timeline to ~8.8s. The line below still said 0.9 under a comment claiming "same friction as the
   * timeline's momentum" — true the day it was written, false from #103 onward. So the sliders are
   * not missing a glide, they are wearing the timeline's OLD one, and next to the new one they feel
   * exactly as he describes: stiff.
   * Same lever as #103, because friction is what sets the distance (v0·16.67/(1−f)), not launch
   * speed: throwing harder makes short flicks overshoot while leaving the long tail — the part you
   * feel — just as short. 0.9 → 0.947 takes a full-speed flick from ~395px of ruler to ~765px. The
   * clamp is raised only modestly alongside it, exactly as #103 did (0.022 → 0.028 there), so a hard
   * flick covers more ground without a light one turning twitchy. The stop threshold comes down with
   * it, or the longer tail gets cut off while still visibly moving — which is itself "ends too quick".
   * FM.glideTuning + FM.timeline.momentumTuning are exposed so the suite pins the two together; the
   * defect here was two things meant to feel the same drifting apart in silence. */
  const GLIDE_MIN_FLICK = 0.6;    // px/ms, TOUCH — below this it was a positioning drag, not a flick
  /* A MOUSE FLICK IS SLOWER THAN A THUMB'S, AND ITS LAST SAMPLE LIES (queue 715). Ezra: "Make the sliders
   * on pc glide when you let go like on mobile coz rn its tedious to aadjust. Also rn it does work but
   * not always its kind finicky." Two causes, both measured on the strip:
   * · The release velocity was the LAST pointermove's, smoothed 0.35/0.65 towards it — so the one or two
   *   slow samples a hand produces as it lets go of a button (the mouse stalls a few ms before the click
   *   releases) took a 1.2 px/ms drag to 0.15 and the glide died. That is the "not always". A thumb
   *   leaves the glass mid-motion; a mouse button releases while the hand is stopping.
   * · A mouse flick that FEELS like a flick runs 0.3–0.5 px/ms on a desk, and the 0.6 touch bar sits
   *   above most of them. That is the "tedious".
   * So the velocity is the pointer's travel over the last GLIDE_WINDOW ms — a stall sample dents it
   * instead of erasing it — and a pointer that has been STILL for GLIDE_REST ms before release was
   * parked, not flung, and gets zero (the old code carried the stale last-sample velocity across any
   * pause, so a careful park-then-release could fling the value). The mouse bar is its own number;
   * touch is unchanged, so a thumb's positioning drag still does not fling. */
  const GLIDE_MIN_FLICK_MOUSE = 0.25;
  const GLIDE_WINDOW = 100;       // ms of trail the release velocity is read over
  const GLIDE_REST = 80;          // ms still before release → parked, no glide
  const GLIDE_MAX_V = 3.2;        // a hard flick travels a long way, not forever
  const GLIDE_FRICTION = 0.947;   // per 16.67ms — MUST match the timeline's (see the note above)
  const GLIDE_STOP = 0.004;       // px/ms below which the tail is imperceptible
  FM.glideTuning = { friction: GLIDE_FRICTION, maxV: GLIDE_MAX_V, minFlick: GLIDE_MIN_FLICK, minFlickMouse: GLIDE_MIN_FLICK_MOUSE,
    window: GLIDE_WINDOW, rest: GLIDE_REST, stopAt: GLIDE_STOP };
  function attachGlide(node, applyDx, onSettle) {
    let drag = null, raf = 0;
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    const settle = () => { if (onSettle) onSettle(); };
    node.addEventListener('pointerdown', e => {
      stop();                                        // a fresh grab kills any in-flight glide
      drag = { mouse: e.pointerType === 'mouse', trail: [{ x: e.clientX, t: e.timeStamp }] };
    });
    node.addEventListener('pointermove', e => {
      if (!drag) return;
      const tr = drag.trail; tr.push({ x: e.clientX, t: e.timeStamp });
      while (tr.length > 2 && tr[1].t <= e.timeStamp - GLIDE_WINDOW) tr.shift();   // keep one sample at or before the window's edge
    });
    // Travel over the window, not the last sample. A pointer still for GLIDE_REST before the release
    // was parked. Sparse samples (a slow mouse) fall back to the one sample before the window.
    const releaseV = (e) => {
      const tr = drag.trail, last = tr[tr.length - 1];
      if (e.timeStamp - last.t > GLIDE_REST) return 0;
      let i = tr.length - 1;
      while (i > 0 && tr[i - 1].t >= last.t - GLIDE_WINDOW) i--;
      if (i === tr.length - 1 && i > 0) i--;
      const dt = last.t - tr[i].t;
      return dt >= 8 ? (last.x - tr[i].x) / dt : 0;
    };
    const release = (e) => {
      if (!drag) return;
      const min = drag.mouse ? GLIDE_MIN_FLICK_MOUSE : GLIDE_MIN_FLICK;
      const v0 = releaseV(e);
      let v = Math.max(-GLIDE_MAX_V, Math.min(GLIDE_MAX_V, isFinite(v0) ? v0 : 0));
      drag = null;
      if (Math.abs(v) < min) { settle(); return; }
      let last = performance.now();
      const step = (now) => {
        // The panel rebuilds constantly (refresh, category change, deselect), which detaches this
        // control while its glide is still in flight — and its closures would go on writing to the
        // old layer's property from something nobody can see. Die with the element.
        if (!node.isConnected) { raf = 0; settle(); return; }
        const dt = Math.min(48, now - last); last = now;
        v *= Math.pow(GLIDE_FRICTION, dt / 16.67);               // the timeline's friction, from the shared constant
        const alive = applyDx(v * dt);
        if (alive && Math.abs(v) > GLIDE_STOP) raf = requestAnimationFrame(step);
        else { raf = 0; settle(); }
      };
      raf = requestAnimationFrame(step);
    };
    node.addEventListener('pointerup', release);
    node.addEventListener('pointercancel', () => { if (!drag) return; drag = null; settle(); });   // OS-cancelled → settle where it is, never glide
    /* cancelDrag is called by the strip when a touch turns out to be a scroll (nothing in flight yet)
       AND — from its own pointerup, which runs AFTER this one — when the drag ended in fine mode. In
       that second case the glide is ALREADY running: clearing `drag` did nothing to it, so "no momentum
       out of fine mode" (queue 253) was dead code and a careful fine drag flung anyway (audit 2 Sep,
       queue 726). Stopping the frame loop is the fix; the settle is owed because the loop would have. */
    return { stop: stop, cancelDrag: () => { drag = null; if (raf) { stop(); settle(); } } };
  }

  /* A scrub gesture, held in its OWN coordinate instead of read back off the value it wrote.
   *
   * WHY THIS EXISTS. Both scrubbers used to do `setVal(getVal() + dx * scrub)`, which quietly assumes
   * the setter stores exactly what it was handed. Hardly any of them do — mtSetXY snaps to any align
   * target within 8 units, resizeCrop rounds to whole pixels, Samples rounds to a whole count — and a
   * read-modify-write against a setter that rewrites the value throws away every sub-step of movement,
   * because the next event starts from the rewritten number again. Two measured consequences:
   *   · X/Y STUCK ON A SNAP and could not be dragged off it. A pointer produces roughly 1-6px per move
   *     event and the snap radius is 8, so every event was undone as fast as it arrived. Live on a
   *     1080-wide project: X walked 700 → 549, snapped to 540, then sat at 540 for the remaining ~210px
   *     of the drag. Only a single jump of more than 8px in ONE event escaped.
   *   · Motion Blur SAMPLES never moved at all: 0.08 per pixel into a Math.round is always the number
   *     it started from. Crop Width dies the same way on any project narrower than ~1400.
   * Holding `base + acc` fixes both — the raw value genuinely travels, so a snap grabs on the way in
   * and lets go on the way out, and small steps add up instead of being rounded away each time. It is
   * what the Move trackpad has always done, which is why only the number boxes were stuck.
   *
   * The accumulator is clamped back to what the LIMITS allowed (`g.acc = v - g.base`), so dragging far
   * past an end does not bank travel that has to be un-dragged before the value moves again. Snapping
   * happens inside setVal and is invisible here, which is exactly the difference we want: a wall pins
   * the gesture, a snap does not.
   */
  // One clamp, so a scrubber's limits and its gesture's limits can never be written differently.
  function mkClamp(min, max) {
    return v => { if (min != null) v = Math.max(min, v); if (max != null) v = Math.min(max, v); return v; };
  }
  function scrubGesture(getVal, setVal, clamp) {
    let g = null;
    return {
      begin: () => { g = { base: getVal(), acc: 0 }; },
      end: () => { g = null; },
      // Returns false ONLY when a hard limit refused the movement, so a glide dies at the wall instead
      // of spinning against it. A snapped value is still alive and must keep gliding until it escapes.
      apply: (step) => {
        if (!g) g = { base: getVal(), acc: 0 };
        g.acc += step;
        const raw = g.base + g.acc, v = clamp ? clamp(raw) : raw;
        g.acc = v - g.base;
        setVal(v);
        return Math.abs(v - raw) < 1e-9;
      }
    };
  }
  FM._scrubGesture = scrubGesture;

  // re-scrolls the ruler (call after a typed value).
  function tickStrip(o) {
    const strip = el('div', 'fx-scrub');
    /* A ROW MAY FORCE ITS OWN NOTCH (queue 455). tickQuantum coarsens so a ruler never exceeds ~100
       notches, which is right for a bounded parameter and catastrophic for the speed row: widening
       speed to 0.01x-1000x (queue 184) took span/step from 60 to 20,000, so the quantum jumped from
       5% to **1000% — ten times speed per notch**, which is precisely what Ezra reported: *"The speed
       slider goes WAY too fast, it goes up 10x at a time, slow this way the fuck down"*.
       The comment on SPD_MIN/SPD_MAX already promised the opposite — "the ruler still moves 5% per
       step so ordinary speeds feel exactly as they did, and 1000x is reached by typing in the box".
       That promise was true when it was written and was broken by an interaction two hundred lines
       away. `q` lets the row keep it. */
    const q = (o.q > 0) ? o.q : tickQuantum(o.min, o.max, o.step, o.unit);
    strip.dataset.q = String(q);   // the notch this row actually uses — read by the suite (queue 455)
    const ruler = el('div', 'fx-scrub-ticks');
    /* ⚠️ THE RULER IS A WINDOW ONCE IT GETS LONG (queue 609). Ezra: *"The speed slider looks weird and
     * broken"*, with a screenshot showing a white wall at the far left and a scatter of blurred grey
     * smudges where the notches should be.
     * MEASURED at 380px: this element was **139,999px wide** inside a 299px row, its max wall mark at
     * x 140,071. `((max−min)/q) × TICK` = `((100000−1)/5) × 7`. Both inputs are deliberate — the range
     * is 0.01x–1000x (queue 184) and `q` is FORCED to 5 (queue 455) because letting it coarsen made the
     * notch 1000% and he reported *"it goes up 10x at a time"*. So the two complaints are one trade,
     * and picking a side just swaps which one he files.
     * The blur is the giveaway: `.fx-scrub-ticks` carries `will-change: transform`, so a 140,000px
     * element becomes a compositing layer far past the browser's maximum texture size and gets
     * DOWNSAMPLED. Nothing was wrong with the maths; the browser could not paint the box.
     * It never needed to be that long — only the slice under the centre line is ever visible. So past
     * WIN px the element becomes a fixed window that re-anchors as you scrub. Everything else is
     * untouched: `q`, `TICK`, the drag maths, the feel tuned by queues 455 and 253.
     * ⚠️ **A SHORT RULER TAKES THE OLD PATH EXACTLY** — `base` stays 0, the transform is the old
     * transform, and no background offset is written. Every ordinary row (Opacity 0–100 renders 140px)
     * is byte-for-byte what it was, which is the point: this must not "fix" the pathological case by
     * changing the 200 rows that were already right. */
    const totalPx = ((o.max - o.min) / q) * TICK;
    const WIN = 4000;                       // ~10 screens of ruler; far below any texture limit
    const virt = totalPx > WIN;
    ruler.style.width = (virt ? WIN : totalPx) + 'px';
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
    const markEls = marks.map(m => { const d = el('div', 'fx-scrub-mark' + (m.end ? ' end' : '')); d.__v = ((m.v - o.min) / q) * TICK; ruler.appendChild(d); return d; });
    strip.appendChild(ruler); strip.appendChild(el('div', 'fx-scrub-notch'));
    const place = () => { markEls.forEach(d => { d.style.left = (d.__v - base) + 'px'; }); };
    let base = 0;
    place();
    const sync = v => {
      const off = ((v - o.min) / q) * TICK;
      if (virt) {
        /* Re-anchor the window so the centre line always has ruler either side of it, then move the
           element the remaining sub-window distance. Clamped to the tape's real ends so the min/max
           walls still arrive exactly where they always did. */
        /* ⚠️ ROUNDED AFTER THE CLAMP, not before. `totalPx` is `((max−min)/q) × TICK` and is rarely a
           whole number — the speed row's is 139,998.6 — so clamping a rounded value against it hands
           back a FRACTIONAL base at the far end, the notch gradient gets re-phased by a fraction of a
           pixel, and the ruler goes soft again exactly where this fix was supposed to sharpen it.
           Measured before the round moved: background-position −23.6px at max. */
        const want = Math.round(Math.max(0, Math.min(totalPx - WIN, off - WIN / 2)));
        if (want !== base) {
          base = want;
          /* ⚠️ AND THE NOTCH PATTERN HAS TO BE RE-PHASED, or re-anchoring makes the notches JUMP.
             They are two repeating gradients — 35px for every fifth notch, then 7px — and both repeat
             from the element's own left edge, which has just moved. Offsetting each by `base` modulo
             its own period puts every notch back at the same absolute place on the tape. TICK is 7 and
             the comment on it already says it must match the 7px period in styles.css. */
          ruler.style.backgroundPositionX = (-(base % 35)) + 'px, ' + (-(base % TICK)) + 'px';
          place();
        }
      }
      ruler.style.transform = 'translateX(' + (base - off) + 'px)';
    };
    sync(o.read());
    let drag = null, pend = null, cur = o.read(), lastApplied = null;
    // Push dx SCREEN px through the ruler. `cur` carries the un-quantised position so a slow drag or a
    // decaying glide accumulates sub-notch movement instead of losing it to rounding every frame.
    // REVERSED (AM): you grab the ruler and push it — drag LEFT to raise the value (a right-side tick
    // slides under the fixed centre line), drag RIGHT to lower it, hence the minus.
    /* `fine` is the second half of queue 253, and the half that actually matters. Slowing the drag
     * rate alone changes nothing you can land on: the applied value snaps to a multiple of the NOTCH
     * QUANTUM q, and q is coarsened to keep the ruler under ~100 notches — measured at 3.6 units on a
     * shape's Width. So a slower drag just means a longer drag for the same 3.6-unit jump, and every
     * value in between stays unreachable. Measured that way too: at the finest rate a 10px drag moved
     * the value by exactly 0.
     * So in fine mode the value snaps to the parameter's REAL step instead of the display quantum.
     * The ruler still shows its coarse notches — it is a legibility device, not the precision — and
     * the number lands where the finger says. */
    const applyDx = (dx, fine) => {
      const before = cur;
      cur = Math.max(o.min, Math.min(o.max, cur - dx * q / TICK));
      const grid = scrubGrid(fine, o.step, q);
      const v = Math.max(o.min, Math.min(o.max, o.min + Math.round((cur - o.min) / grid) * grid));   // land ON a notch (the grid can overshoot an off-grid max)
      if (v !== lastApplied) { lastApplied = v; o.apply(v); sync(v); }
      return Math.abs(cur - before) > 1e-9;   // false at a wall → the glide stops rather than spinning
    };
    const glide = attachGlide(strip, applyDx, () => { o.release(); });
    /* DIRECTIONAL LOCK on touch (v6.19). Ezra: "sometimes when scrolling through an effect with lots
     * of sliders it doesn't let me scroll up because I placed my finger on the slider, which is
     * annoying." The old code claimed the gesture on pointerdown — setPointerCapture plus
     * preventDefault — before the finger had moved a single pixel, and .fx-scrub carried
     * touch-action:none, which tells the browser this element handles EVERY direction. Between them
     * the scroll was dead on contact: on a panel with a dozen sliders most of the panel IS slider, so
     * most of the panel could not be scrolled.
     * Now a touch is only PENDING until it proves which way it is going. Past a 6px slop, whichever
     * axis is winning takes the gesture: horizontal → we capture and scrub from the ORIGINAL down
     * point (not from the point where the lock resolved, or the value would jump by the slop);
     * vertical → we let go completely and the browser scrolls, which it can now do because the CSS
     * says touch-action: pan-y. glide.cancelDrag() matters on that branch — attachGlide starts
     * tracking velocity on every pointerdown, so without it a scroll-flick would release into a
     * momentum glide and move a value the user never touched.
     * A mouse keeps the old immediate behaviour: you cannot scroll a panel by dragging with a mouse,
     * so there is no ambiguity to resolve and adding a 6px dead zone would only make it feel loose. */
    const LOCK = 6;
    strip.addEventListener('pointerdown', (e) => {
      cur = o.read(); lastApplied = null;          // re-read: the value may have been typed or keyframed since
      if (e.pointerType === 'mouse') {
        drag = { x: e.clientX };
        try { strip.setPointerCapture(e.pointerId); } catch (err) {} e.preventDefault();
        return;
      }
      pend = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    const end = () => { pend = null; if (drag) { drag = null; glide.cancelDrag(); o.release(); } };
    // buttons===0 guard: if the pointerup was swallowed (capture lost, DOM rebuilt mid-drag), a plain
    // hover would otherwise KEEP scrubbing.
    strip.addEventListener('pointermove', (e) => {
      if (pend) {
        const px = e.clientX - pend.x, py = e.clientY - pend.y;
        if (Math.abs(px) < LOCK && Math.abs(py) < LOCK) return;      // still too small to call
        if (Math.abs(py) > Math.abs(px)) { pend = null; glide.cancelDrag(); return; }   // theirs: a scroll
        drag = { x: pend.x };                                        // ours: measure from where the finger LANDED
        try { strip.setPointerCapture(pend.id); } catch (err) {}
        pend = null;
      }
      if (!drag) return; if (e.pointerType === 'mouse' && e.buttons === 0) return end();
      const dx = e.clientX - drag.x; drag.x = e.clientX;
      /* FINE CONTROL BY MOVING AWAY FROM THE STRIP (queue 253). Ezra: "when editing a shape the
       * sliders move to quickly, i cant precisely get the exact size i want, cos it jumps a lot of
       * numbers, leaving me to type in what i want."
       * Measured before touching it: on a shape's Width the scrub runs at **3.6 units per pixel of
       * drag**, so the smallest change a finger can make is about four units and every value between
       * is unreachable. Falling back to typing is the only way to land on a number, which is exactly
       * what he said he was doing.
       * The fix is the iOS scrubber idiom rather than a slower rate: keep your finger on the strip and
       * nothing changes — the whole range is still one comfortable drag, which the speed row needs
       * since #184 took it to 0–100000% — but slide AWAY from the strip vertically and the rate drops.
       * Chosen over the obvious alternatives on purpose: a fine-drag MODIFIER is useless on a phone,
       * where there is no modifier key, and slowing everything down would make that speed row
       * untraversable. This is one finger, no chrome, and free if you never need it.
       * The vertical direction is safe here because the gesture is already horizontally locked by the
       * time this runs — the LOCK above hands any vertical-dominant touch to the scroller, so a
       * gesture that reaches this line has committed to being a scrub. */
      const rate = fineRate(e.clientY, strip);
      drag.fine = rate < 1;                 // remembered for the release below
      if (dx) applyDx(dx * rate, rate < 1);
    });
    /* NO MOMENTUM OUT OF FINE MODE (queue 253). attachGlide releases a flick into a momentum run that
       calls applyDx at FULL rate — so a careful fine drag ended with the value flung past the number
       you had just aimed at, undoing the precision you moved away from the strip to get. Momentum is
       for covering distance and fine mode is for landing exactly; they are opposite intents, so the
       glide stands down whenever the drag ended out in the fine zone. Found by measuring a fine drag
       and seeing it move almost as far as a coarse one. */
    strip.addEventListener('pointerup', () => {
      if (drag && drag.fine) glide.cancelDrag();
      pend = null; drag = null;
    });   // attachGlide's own pointerup starts the glide and settles
    strip.addEventListener('pointercancel', end); strip.addEventListener('lostpointercapture', end);
    strip._sync = sync;
    return strip;
  }

  // AM signature control: the ruler scrubber + an editable value box.
  function fxScrubber(fx, p, layer, fxIdx) {
    const row = el('div', 'fx-scrub-row');
    /* Decimals follow the step, and the third tier is not decoration: queue 559 takes the wipes to a
       0.005 step, and at 2dp every second value it can hold would render as the same number — a readout
       that lies about what the slider is doing is worse than a coarse slider. */
    const prec = p.step >= 1 ? 0 : (p.step >= 0.1 ? 1 : (p.step >= 0.01 ? 2 : 3));
    // An ABSENT param renders at the effect's own fallback — `legacy` where the schema declares one
    // (a param added to an existing effect keeps that effect's original hardcoded value), otherwise
    // the default. Same rule fxSegment already follows; a slider that displays a number the renderer
    // is not using is the same lie in a different control.
    const fallback = p.legacy != null ? p.legacy : p.default;
    const read = () => { const c = fx.params[p.key]; return FM.isAnimated(c) ? FM.evalProp(c, FM.time) : (typeof c === 'number' ? c : fallback); };
    // keyframe gutter (only for keyframable params)
    if (p.keyframable) {
      const c = fx.params[p.key];
      const kfb = el('button', 'fx-kf' + (FM.isAnimated(c) ? ' active' : '') + (FM.hasKeyframeAt(c, FM.time) ? ' here' : ''), '◆');
      kfb.title = FM.isAnimated(c) ? 'Keyframe at playhead (click to remove)' : 'Animate this parameter';
      kfb.addEventListener('click', () => { FM.toggleProp(fx.params, p.key, FM.time, fallback); afterFx(); });
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
      min: p.min, max: p.max, step: p.step, unit: p.unit, dflt: p.default, read: read, q: p.q,
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

  /* Which list this menu's Duplicate / Delete / Paste act on. Without it they act on layer.effects at
   * an index that belongs to a DIFFERENT array — the same defect fxRow's listOf() was written to fix,
   * one level up. It matters now because a caption cue has a stack of its own. (queue 151) */
  function fxMoreMenu(layer, fx, idx, btn, stack) {
    const listFor = () => (stack ? (stack.list(layer) || []) : (layer.effects || []));
    const done = stack ? stack.after : afterFx;
    if (!FM.contextMenu) return;
    const r = btn.getBoundingClientRect();
    const reg = FM.fxRegistry.get(fx.type);
    const clipLabel = FM.fxClipboard.label();
    /* Move this effect between the track's stack and the cue that is showing (queue 151). Offered only
     * on a caption track with a live cue — on anything else there is no second stack to move to, and a
     * menu item that cannot do anything is worse than no menu item. */
    const cueNow = activeCue(layer);
    const moveItems = [];
    if (cueNow) {
      const onCue = stack === CUE_STACK;
      moveItems.push({
        label: onCue ? 'Apply to the whole track' : 'Apply to this cue only',
        action: () => {
          const from = listFor();
          const i = from.indexOf(fx);
          if (i < 0) return;
          from.splice(i, 1);
          const to = onCue ? (Array.isArray(layer.effects) ? layer.effects : (layer.effects = []))
                           : cueFxList(layer, true);
          if (to) to.push(fx);
          afterFx();
          if (FM.toast) FM.toast(onCue ? 'Moved to the whole track' : 'Moved to this cue', 1800);
        },
      });
    }
    const items = [
      { label: 'Reset', action: () => { const inst = FM.fxRegistry.makeInstance(fx.type); if (inst) { fx.params = inst.params; afterFx(); } } },
      // Duplicate must carry the CURRENT settings + keyframes (a fresh default instance isn't a duplicate)
      { label: 'Duplicate', action: () => { const copy = JSON.parse(JSON.stringify(fx, FM.jsonReplacer)); listFor().splice(idx + 1, 0, copy); done(); } },
      { label: 'Copy effect', action: () => {
        const ok = FM.fxClipboard.copy(fx);
        if (FM.toast) FM.toast(ok ? 'Copied ' + ((reg && reg.label) || fx.type) : 'Couldn’t copy this effect', 1600);
      } },
    ];
    // Favourite from here too: you usually decide an effect is a keeper while you are USING it, not
    // while browsing for it — and until now the ★ existed only in the browser. (#62)
    if (FM.fxBrowser && FM.fxBrowser.toggleFav) {
      const faved = FM.fxBrowser.isFav(fx.type);
      const nm = (reg && reg.label) || fx.type;
      items.push({ label: faved ? 'Remove from favourites' : 'Favourite', action: () => {
        const on = FM.fxBrowser.toggleFav(fx.type);
        if (FM.toast) FM.toast(on ? '★ ' + nm + ' added to favourites' : nm + ' removed from favourites', 1600);
      } });
    }
    // Naming what is on the clipboard matters more here than in most menus: an effect stack is a list
    // of near-identical rows, and a bare "Paste effect" gives you no way to tell what you are about to
    // land on it. Absent entirely when there is nothing to paste, rather than present and dead.
    if (clipLabel) {
      items.push({ label: 'Paste ' + clipLabel, action: () => {
        const list = FM.fxClipboard.read();
        if (!list.length) { if (FM.toast) FM.toast('Nothing to paste', 1400); return; }
        list.forEach(fxIn => delete fxIn._expanded);
        if (!Array.isArray(layer.effects)) layer.effects = [];
        // …below the effect you opened the menu on, in clipboard order.
        listFor().splice(idx + 1, 0, ...list);
        afterFx();
        if (FM.toast) FM.toast('Pasted ' + clipLabel, 1400);
      } });
    }
    FM.contextMenu.show(Math.max(8, r.right - 170), r.bottom + 4, items.concat(
      moveItems.length ? [{ sep: true }].concat(moveItems) : [], [
      // "…THIS effect" (queue 406): one effect's own settings, not the layer's — see the note in app.js.
      { label: 'Save this effect as preset…', action: () => {
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
      { label: 'Delete', danger: true, action: () => { listFor().splice(idx, 1); done(); } },
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
      /* TELL THE SHEET TO STAND DOWN (#686). js/mobile.js's swipe-down-to-dismiss already excludes
         `.fx-grip` from claiming a gesture, because that handle carries touch-action:none and keeps
         feeding pointermoves — its comment records the measured failure: the sheet called
         setPointerCapture(), every later move AND the pointerup were retargeted at the panel, so
         endReorder never ran and the drop was thrown away. The PRESS-HOLD path cannot be excluded the
         same way: at pointerdown nobody knows yet whether this becomes a reorder, because the hold
         does not fire for another 280ms — by which time the sheet has already armed itself. So the
         reorder announces itself instead, and the sheet checks. Queue 383's non-passive touchmove
         cannot cover this: preventDefault stops the BROWSER's own pan, and the sheet-dismiss is a JS
         listener on an ancestor, which preventDefault does not silence. */
      FM._fxReordering = true;
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
      FM._fxReordering = false;
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
        // `fx-swiping` comes off only after the spring-back has finished — pulling it at once would
        // hide the red panel mid-flight, so a swipe you changed your mind about would snap back over
        // nothing. On the COMMIT branch above it deliberately stays on: the row is animating out and
        // the red is what it animates out over.
        setTimeout(() => { wrap.style.transition = ''; row._g.moved = false; row.classList.remove('fx-swiping'); }, 300);
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
        // `fx-swiping` is what makes the red DELETE panel visible and promotes the wrapper — see the
        // note in styles.css. It goes on HERE, once the gesture is definitely a horizontal swipe, and
        // never during a scroll, which is the whole point (#58).
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) + 2) { mode = 'swipe'; row._g.moved = true; clearHold(); row.classList.add('fx-swiping'); }
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
      FM._fxReordering = false;   // belt and braces: cleared on EVERY exit, so an aborted drag can never leave the sheet unable to close
      mode = null;
    };
    head.addEventListener('pointerup', finish);
    head.addEventListener('pointercancel', e => finish(e, true));
    /* THE HOLD-ANYWHERE DRAG NOW SURVIVES ON A PHONE (queue 383). Ezra: "if I press on the dots in the
       side it does [work] … the fact that it kinda works but not fully unless I grab the dots is weird".
       "Kinda works" is exactly right, and the comment on the pointerdown above already described the
       cause without treating it as a fault: the press-hold DOES begin a reorder, and then the browser's
       own vertical pan claims the touch, fires `pointercancel`, and `finish(e, true)` aborts the drag
       that had just started. So it works with a mouse and fails under a finger — which is why the grip
       (touch-action: none, so the browser never takes the gesture) looked like the only path that works.
       `preventDefault()` inside the pointermove handler cannot fix that: touch scrolling is governed by
       touch-action, and a pointer event is too late to call it off. A NON-PASSIVE touchmove listener can,
       and only while a reorder is actually in progress — so a plain scroll over an effect row still
       scrolls the sheet, a swipe-left still deletes, and a tap still opens the accordion. */
    head.addEventListener('touchmove', e => { if (mode === 'reorder' && e.cancelable) e.preventDefault(); }, { passive: false });
  }

  // One effect row (AM): collapsed = ▸ name … eye; expanded = ▾ name … ⋯ + delete, then its editor.
  // Reorder = press-hold + drag; delete = swipe left (see attachFxGestures).
  function fxRow(layer, fx, idx, stack) {
    const reg = FM.fxRegistry.get(fx.type) || { label: fx.type, params: [] };
    // Which list this row lives in. Without it a row inside a filter deletes from the LAYER's stack at
    // its own child index — i.e. removes whichever unrelated effect happens to sit at that position.
    // Same descriptor the audio stack already uses (AFX_STACK), one level in.
    const listOf = () => (stack ? (stack.list(layer) || []) : (layer.effects || []));
    const after = stack ? stack.after : afterFx;
    const isBox = FM.isFxContainer(fx);
    const expanded = !!fx._expanded, off = fx.enabled === false;
    const row = el('div', 'fx-row' + (off ? ' fx-off' : '') + (expanded ? ' fx-open' : ''));
    fxTapHint();
    const head = el('div', 'fx-head');
    const disc = el('button', 'fx-disc'); disc.innerHTML = FX_CHEVRON;
    disc.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    disc.title = expanded ? 'Close this effect' : 'Open this effect\u2019s controls';
    // A filter from the library carries its own name ("Teal & Orange"); a hand-built one has none and
    // falls back to the registry label, "Filter". Only containers get this — a normal effect is what
    // the registry says it is, and letting a saved file rename Gaussian Blur would be a small lie with
    // no upside.
    const name = el('span', 'fx-name', (isBox && typeof fx.name === 'string' && fx.name) ? fx.name : reg.label);
    /* "IT DOES NOTHING" — SAID BY THE APP, NOT LEFT FOR HIM TO CONCLUDE (queue 477, v11.81).
       He reported effects doing nothing three times (#460). They all work; his SUBJECT could not show
       them — Channel Remap swaps red and blue and his magenta has both at 204.
       THE ANSWER IS READ FROM THE EFFECT, NEVER COMPUTED HERE. v11.79 computed it inline on every row
       build and was withdrawn for it: a panel refresh happens on every slider step, so the hint
       recomputed constantly and vanished the moment he touched anything — which is exactly when he
       would be reading it. Now the row only DISPLAYS the last measured answer, and a settle timer
       measures a new one once the settings stop moving. Dragging therefore leaves the hint alone
       instead of flickering it off. */
    if (!off && expanded) scheduleNoopCheck(layer, fx, idx);
    if (!off && expanded && fx._noop === true) row.classList.add('fx-noop');
    // a tap toggles the editor, but a swipe/reorder gesture must NOT also toggle it.
    // ACCORDION (like Blending & Opacity): opening one effect closes every other, so exactly one
    // editor is ever open — no more scrolling past three expanded stacks to reach the fourth.
    const toggle = () => {
      if (_justReordered()) return;                       // a drag just dropped here — not a tap
      if (row._g && row._g.moved) { row._g.moved = false; return; }
      // Accordion scoped to SIBLINGS AT THIS DEPTH. Scoped to the whole layer instead, opening an
      // effect inside a filter would close the filter holding it — collapsing the row you just tapped
      // out of existence.
      listOf().forEach(e => { if (e !== fx) e._expanded = false; });
      fx._expanded = !expanded;
      kfNavSync();   // a different effect's params are in play now — drop the old row, re-arm the timeline
      FM.inspector.refresh();
    };
    // Tap ANYWHERE on the row header to open/close the editor — not just the ▸ arrow. The action
    // buttons (eye / ⋯ / delete) keep their own behaviour; the disc + name + empty space all toggle.
    head.addEventListener('click', (e) => { if (e.target.closest('.fx-icon-btn')) return; toggle(); });
    if (listOf().length > 1) head.appendChild(el('span', 'fx-grip', '⠿'));   // drag affordance (press-hold to reorder) — on OPEN rows too, or the one you are editing looks unmovable
    head.appendChild(disc); head.appendChild(name);
    /* Say when position does not matter. Nine effect types (FM.CSS_FX) are folded into a single CSS
       filter applied BEFORE the layer is drawn, so wherever you drag them the picture is the same —
       measured, not assumed. Letting someone reorder them with no feedback is a control that lies,
       and filters made it worse by handing people a second list to drag things around in.
       AFTER the name, deliberately: appended any earlier it lands between the grip and the chevron,
       so the row reads "⠿ always first › Gaussian Blur" — the tag arriving before the thing it is
       talking about. A filter row never gets it; where a filter sits decides where its children land. */
    /* Say when an effect cannot possibly do anything to THIS layer (queue 180). The toast at add time
       answers the moment of confusion; this answers reopening the project a week later and finding a
       Saturation sitting there doing nothing. Only ever shown when the app can PROVE it — see
       FM.fxDeadOnLayer, which measures one pixel through the shipped filter string.
       ONE tag, never two. Both together overflowed the row at 380px and pushed the eye button off the
       right edge — the control for switching the effect off became unreachable, on the row most likely
       to make someone want to switch it off. Caught in a screenshot; the DOM check for the tag itself
       said it fitted, because the thing being shoved out was the button next to it. So the dead hint
       takes the slot: "always first" is trivia about reordering, this is the answer to "why is nothing
       happening", and if only one of them can be on screen it is not a close call. */
    const deadWhy = FM.fxDeadOnLayer ? FM.fxDeadOnLayer(fx, layer, FM.time) : null;
    if (deadWhy) {
      const dt = el('span', 'fx-dead-tag', 'does nothing here'); dt.title = deadWhy; head.appendChild(dt);
    } else if (FM.CSS_FX && FM.CSS_FX[fx.type]) {
      const tag = el('span', 'fx-first-tag', 'always first');
      tag.title = 'Blur, brightness, contrast, saturation, hue, greyscale, sepia, invert and glow are applied together before everything else — moving them up or down does not change the picture.';
      head.appendChild(tag);
    }
    head.appendChild(el('span', 'fx-spacer'));
    if (expanded) {
      const more = el('button', 'fx-icon-btn', '⋯'); more.title = 'More';
      more.addEventListener('click', (ev) => fxMoreMenu(layer, fx, idx, ev.currentTarget, stack));
      const del = el('button', 'fx-icon-btn fx-del'); del.title = 'Delete effect'; del.innerHTML = svgIcon('M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13');
      del.addEventListener('click', () => { listOf().splice(idx, 1); after(); });
      head.appendChild(more); head.appendChild(del);
    } else {
      /* A HIDDEN EFFECT LOOKS HIDDEN (queue 224). Ezra: "when you press the eye button on a layer and
         it puts a cross through it, changing what it looks like, you should also make it so it does
         that when you make an effect hidden, right now its hard to tell when an effect is hidden."
         The layer's eye SWAPS GLYPH — an open eye becomes a struck-through one — while the effect's
         only faded the same open eye, which at .4 opacity on a dark row is barely a difference. This
         is the layer's own pair of paths, copied verbatim from js/timeline.js rather than redrawn, so
         the two controls cannot drift apart into two dialects of "off". */
      const eye = el('button', 'fx-icon-btn fx-eye' + (off ? ' off' : '')); eye.title = off ? 'Effect off — enable' : 'Effect on — disable';
      // ONE svg with both the eye and the slash inside it — two stacked <svg> elements would sit side
      // by side in the button rather than on top of each other. Same markup timeline.js uses.
      eye.innerHTML = off
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19M6.6 6.6A18 18 0 0 0 1 12s4 8 11 8a9 9 0 0 0 5.4-1.6"/><line x1="2" y1="2" x2="22" y2="22"/></svg>'
        : svgIcon('M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6');
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
      /* NO EXPLANATION BLOCK (queue 378). Ezra, for the fourth time and now as a rule rather than an
         instance: *"Get rid of motion blur explanation, and make a note to get rid of all
         explanations, if you have to, write it down somewhere else, so that when we make tutorials
         the info is there for you to reference"*. (Also 331 clause 1, 346, 350.)
         The PANEL stops rendering it; the text is NOT deleted. `reg.desc` is still the browser tile's
         tooltip and still the written record of what each effect does — which is the "somewhere else"
         he asked for. Deleting 190-odd strings would have thrown away the thing he asked to keep. */
      reg.params.forEach(p => {
        if (p.type === 'range') {
          const row = fxScrubber(fx, p, layer, idx);
          // Dim and lock a slider whose value is currently being overridden by a tick box above it,
          // and say WHICH one — a greyed control with no explanation just reads as broken.
          if (p.overriddenBy) {
            const ctrl = reg.params.find(q => q.key === p.overriddenBy);
            const raw = fx.params[p.overriddenBy];
            const cur = (raw == null) ? (ctrl && ctrl.default) : raw;
            /* ⚠️ A TICK BOX AND A LIST OF MODES ARE NOT THE SAME TEST (queue 482).
               This was written for a TOGGLE, where truthy means "the override is on", and it was then
               pointed at two SEGMENT controls, where truthy just means "any option except the first".
               So it locked the slider in exactly the mode the slider is FOR, and left it looking live
               in the modes where it does nothing:
               · HSL Bands → Custom greyed out "Custom centre" and "Custom width" — and the row is
                 `pointer-events: none`, so choosing Custom gave you a band you could not customise.
               · Frame Stutter → Strobe greyed out "Strobe on-time", its only mode.
               · Either of them on the FIRST option (Red / Hold) left both sliders bright and inert.
               `liveWhen` says which value of the controlling param actually uses this slider; without
               it the old truthy test stands, which is right for the real toggle (Rounded Corners). */
            let active, why;
            if (p.liveWhen !== undefined) {
              active = Number(cur) !== Number(p.liveWhen);
              const opts = (ctrl && ctrl.options) || [];
              let lbl = String(p.liveWhen);
              for (let oi = 0; oi < opts.length; oi++) {
                const o = opts[oi], val = Array.isArray(o) ? o[0] : oi;
                if (Number(val) === Number(p.liveWhen)) { lbl = Array.isArray(o) ? o[1] : o; break; }
              }
              why = 'Only used when ' + ((ctrl && ctrl.label) || p.overriddenBy) + ' is ' + lbl;
            } else {
              active = !!cur;
              why = 'Overridden by ' + ((ctrl && ctrl.label) || p.overriddenBy);
            }
            if (active) {
              row.classList.add('fx-overridden');
              row.setAttribute('aria-disabled', 'true');
              const tag = el('span', 'fx-ovr-tag');
              tag.textContent = why;
              row.appendChild(tag);
            }
          }
          body.appendChild(row);
        }
        else if (p.type === 'toggle') body.appendChild(fxToggle(fx, p));
        else if (p.type === 'segment') body.appendChild(fxSegment(fx, p));
        /* ⚠️ EFFECT COLOURS KEYFRAME NOW (queue 555). Ezra, with a Gradient Overlay open: *"Colours for
           every effect like gradient overly should be key frame able"* — his screenshot shows Amount
           carrying a ◆ and a curve while Start and End have neither.
           BOTH HALVES ALREADY EXISTED and were simply not wired together, which is why this is two
           lines rather than a mechanism: `FM.evalProp` has lerped '#rrggbb' keyframes channel-wise for
           months (see lerpHexKf in scene.js), and `kfColorRow` — the colour row WITH a diamond — was
           already in this file, used by stroke and shadow. Effect colours alone were built with a plain
           row and marked `keyframable: false` in the registry. Checked before building anything, as the
           entry asked.
           The row is asked for the value through evalProp and writes through setProp, so a static colour
           stays a plain string and only becomes a keyframe object when he presses the ◆. */
        else if (p.type === 'color') { body.appendChild(kfColorRow(fx.params, p.key, p.label, p.default)); }
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
      /* A FILTER'S CHILDREN (queue 113). They come AFTER the container's own controls, so Strength —
         the one thing that acts on all of them — reads as the heading it is rather than as one more
         effect in the list. Ezra: "at the top you will have an opacity slider, so you can turn down the
         effects strength and it will automatically apply it to every effect under that filter."
         Each child is a normal fxRow pointed at the FILTER's list, so it gets the same open/close, eye,
         delete, swipe and drag-to-reorder as any other effect, scoped to inside the filter. */
      if (isBox) {
        const kids = el('div', 'fx-kids');
        const kl = fx.effects || [];
        if (!kl.length) kids.appendChild(el('div', 'insp-hint', 'This filter is empty \u2014 add an effect to it below.'));
        const KID_STACK = { list: () => fx.effects || [], after: afterFx };
        kl.forEach((ch, ci) => kids.appendChild(fxRow(layer, ch, ci, KID_STACK)));
        const addK = el('button', 'fx-add-btn fx-add-kid', '+ Add effect to this filter');
        addK.addEventListener('click', () => { if (FM.fxBrowser) FM.fxBrowser.open(layer, { into: fx }); });
        kids.appendChild(addK);
        body.appendChild(kids);
      }
      if (!reg.params.length && !isBox) body.appendChild(el('div', 'insp-hint', 'No adjustable parameters.'));
      if (row.classList.contains('fx-noop')) {
        const why = NOOP_WHY[fx.type];
        body.appendChild(el('div', 'insp-hint fx-noop-hint',
          'This is on, but it changes nothing on this layer at these settings' + (why ? ' — ' + why : '') + '.'));
      }
      wrap.appendChild(body);
    }
    row.appendChild(delBg);
    row.appendChild(wrap);
    row._wrap = wrap; row._delBg = delBg;
    attachFxGestures(row, head, layer, fx, idx, stack);   // swipe-left = delete · press-hold + drag = reorder
    return row;
  }

  /* The Filters subsection (queue 113, step 5). His words: "now I want a third subsection for filters.
   * It'll work the same as the others" and "You will make a Bunch of filters and section them, so that
   * people can find stuff organised, like how the effects are organised."
   *
   * A browse list, sectioned, saying for each look WHAT IS IN IT. That last part is deliberate and is
   * the thing a thumbnail would not tell you: the whole promise of a filter here is that it is not a
   * black box — it is a group of ordinary effects you can open and retune — so the list names them
   * before you commit. Tapping a row adds it and drops you back on the stack with it open.
   *
   * NO THUMBNAILS IN THIS VERSION, and that is a real gap rather than a decision: the thumbnail system
   * is built around ONE effect type per tile (fx-thumbs' mountPreset takes preset.fx, a type STRING),
   * so filters need their own recipe branch there. That is its own release; a list that says what a
   * look contains is worth having in the meantime, and is more use than the picker menu it replaces. */
  function filtersSection(layer) {
    const s = section('Filters');
    const h4 = s.querySelector('h4'); if (h4) h4.remove();
    /* NO EXPLANATION PARAGRAPH, and no sub-line under the Empty filter row (queue 301). His words:
       "Get rid of the explanations here, the top one saying what filters are and the second one
       underneath the add empty filter, so the empty filter button can be smaller and take up less
       space." Both were mine, both were prose above the thing you came here to tap, and on a phone
       they pushed the actual looks below the fold. The grid of filters says what this tab is. */
    /* Build-your-own lives here now (queue 220). "+ Add Filter" is gone from the Effects tab because he
       wants one door — so this door has to carry BOTH things people arrive for, a ready-made look and an
       empty one to fill yourself, or removing that button would have removed the feature. */
    const mkEmpty = el('button', 'flt-row flt-empty');
    /* The + is not decoration and is not scope creep: it is doing the job the deleted sub-line was
       doing. Stripped to the bare words "Empty filter", a full-width row directly under a heading reads
       as ANOTHER heading rather than a button. The + is this app's own add idiom ("+ Add Effect",
       "+ Add Audio Effect"), costs no height, and is how he referred to the control himself — "the add
       empty filter". */
    mkEmpty.appendChild(el('div', 'flt-name', '+  Empty filter'));
    mkEmpty.addEventListener('click', () => {
      const box = FM.fxRegistry.makeInstance(FM.FX_CONTAINER);
      if (!box) { if (FM.toast) FM.toast('Filters aren’t available'); return; }
      box.effects = [];
      if (!layer.effects) layer.effects = [];
      layer.effects.forEach(e => { e._expanded = false; });
      box._expanded = true;
      layer.effects.push(box);
      fxTab = 'visual';
      afterFx();
    });
    s.appendChild(mkEmpty);
    /* ONE TILE BUILDER, USED TWICE (queue 444, clause 5). Ezra: "make it so you can fave them and they
       go to the top when you do, not the categories but each individual. And it doesn't take it away
       from its group when you do so."
       That last sentence is the whole design: a favourite is not a MOVE, it is a SECOND PLACE the same
       filter appears. So the favourites row and the category rows are drawn by the same function from
       the same definitions — nothing is reordered and nothing is removed from its section. Two calls to
       one builder rather than two builders, because two would be two chances for a fave tile and its
       twin in the category below to stop behaving the same way. */
    /* TOGGLE, THEN ADD — like the effects menu (queue 464). Ezra: *"When adding filters make it so that
       you can toggle them select and then have to press add, like the main effects menu, this is good so
       I can see them all quickly and not have to add then delete and go back. And so you can add multiple
       at once if you're heart desires"*.
       He gave the reason as well as the request and the reason IS the spec: tapping a filter used to
       apply it immediately AND jump back to the stack, so trying three looks meant add, look, delete, go
       back, three times over.
       The badge and the button are the effects browser's own classes (`.fxb-pick`, `.fxb-commit-go`), so
       the two menus look and count the same rather than becoming two dialects of one idea. The BAR needs
       its own positioning: `.fxb-commit` is `position:absolute` against the effects sheet, and there is
       no such sheet here — see `.flt-commit` in styles.css. */
    /* ⚠️ PAGE DOTS UNDER A FILTER ROW (queue 565). Ezra: "Make it obvious that you can scroll on filter
       rows to show more, like do the little dots at the bottom or sum."
       A filter row holds more than fits and scrolls sideways, and nothing on screen said so — the tiles
       past the right edge may as well not have existed.
       ⚠️ SAME VOCABULARY AS THE ADD MENU, NOT A SECOND ONE. The shape grid has paged sideways with dots
       since v2.39, so the MARK here is that mark: `.addmenu-dot`, the identical 6px span, with `.on` for
       the current page. Only the container differs, because `.addmenu-dots` is `position: sticky` for the
       add sheet and a filter row wants none of that.
       ⚠️ AND THEY ARE SPANS, NOT BUTTONS — that is a measured decision recorded in js/addmenu.js, not a
       style preference: a 6px dot made into a <button> is a 2px-reach click target, and it puts one extra
       item per page into the tab order announcing itself as a button. The ROW is the affordance; the dots
       are the readout.
       ⚠️ NOTHING IS DRAWN WHEN THE ROW FITS. Dots under a row with nothing hidden are a control pointing
       at nothing, which is the "clutter explaining itself" this panel has had removed from it twice. */
    function rowDots(grid) {
      const host = el('div', 'flt-dots');
      /* -1, not 0: `build()` bails when the page count is unchanged, so starting at 0 meant a row that
         FITS matched on the first pass and returned before applying `hidden` — leaving an empty host
         still carrying its margins under every short row. Measured as 4px of stray space per row. */
      let count = -1;
      /* ⚠️ CEIL, NOT ROUND (queue 675). `round` is right for a ratio of 2.0 and a lie at 1.25: a row
         holding five tiles where four fit overflows by a quarter of a page, rounds to ONE, and draws a
         single dot under a row the user can visibly scroll. The outer guard has already established
         that it overflows, so the answer can never legitimately be 1 — any overflow at all is a second
         page. Exposed by adding a fifth Cinematic filter, but the arithmetic was always wrong; every
         section happened to sit at a whole number of pages until one did not. */
      const pages = () => Math.max(2, Math.ceil(grid.scrollWidth / Math.max(1, grid.clientWidth)));
      const build = () => {
        const n = grid.scrollWidth > grid.clientWidth + 4 ? pages() : 0;
        if (n === count) return;
        count = n;
        host.textContent = '';
        host.classList.toggle('hidden', n === 0);
        for (let i = 0; i < n; i++) host.appendChild(el('span', 'addmenu-dot' + (i === 0 ? ' on' : '')));
      };
      const mark = () => {
        if (!count) return;
        const max = Math.max(1, grid.scrollWidth - grid.clientWidth);
        const i = Math.round((grid.scrollLeft / max) * (count - 1));
        [].forEach.call(host.children, (d, k) => d.classList.toggle('on', k === i));
      };
      grid.addEventListener('scroll', mark, { passive: true });
      /* Built on a ResizeObserver rather than once, because the row has NO WIDTH the moment it is
         created — the panel is still laying out — so a single pass would count one page every time and
         draw nothing. Same reason the effects sheet watches its canvas (queue 528). */
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => { build(); mark(); });
        ro.observe(grid);
      }
      build();
      setTimeout(() => { build(); mark(); }, 0);
      return host;
    }

    const paintFilterPicks = () => {
      const host = document.querySelector('.insp-body') || document;
      host.querySelectorAll('.flt-tile[data-fltid]').forEach(t => {
        const n = _fltPicks.indexOf(t.dataset.fltid);
        let b = t.querySelector('.fxb-pick');
        if (n < 0) { if (b) b.remove(); t.classList.remove('is-picked'); return; }
        if (!b) { b = el('span', 'fxb-pick'); t.appendChild(b); }
        b.textContent = String(n + 1);
        t.classList.add('is-picked');
      });
      const bar = host.querySelector('.flt-commit');
      if (bar) {
        bar.classList.toggle('hidden', !_fltPicks.length);
        const go = bar.querySelector('.fxb-commit-go');
        if (go) go.textContent = _fltPicks.length === 1 ? 'Add 1 filter' : 'Add ' + _fltPicks.length + ' filters';
      }
    };

  /* ⚠️ PICKING A FILTER NOW SHOWS IT ON HIS CANVAS (queue 554). Ezra: *"When selecting filters it
     doesn't actually preview what it will look like when you add them"*.
     MEASURED FIRST, because the entry named two different possible faults and they need different fixes:
     all 30 filter tiles DO render their own thumbnail (`mountFilter`), and picking one changed **0
     pixels** on the main canvas. So the tiles were never the problem — the CANVAS was.
     ⚠️ NO NEW MECHANISM. The effects browser has previewed picks live since queue 277 through
     `FM._fxPreview = { id, list }`, which the compositor reads and which touches nothing in the scene —
     no history, no autosave, no export. A filter is just a named list of ordinary effects, so it flattens
     straight into the same list. Building a second preview path beside that one is exactly how two
     things drift apart.
     Cleared on commit and on leaving the tab, for the same reason the browser clears it: a preview that
     outlives the picking is a canvas showing something the project does not contain. */
  function filterPreviewStack() {
    const out = [];
    _fltPicks.forEach(id => {
      const f = FM.filters && FM.filters.get ? FM.filters.get(id) : null;
      (f && f.effects || []).forEach(c => {
        if (!c || !c.type) return;
        const inst = FM.fxRegistry.makeInstance(c.type);
        if (!inst) return;
        if (c.params) Object.assign(inst.params, c.params);
        out.push(inst);
      });
    });
    return out;
  }
  function restartFilterPreview() {
    const layer = FM.selectedLayer ? FM.selectedLayer(FM.scene) : null;
    if (!layer) { FM._fxPreview = null; if (FM.requestRender) FM.requestRender(); return; }
    FM._fxPreview = _fltPicks.length ? { id: layer.id, list: filterPreviewStack() } : null;
    if (FM.requestRender) FM.requestRender();
  }
  FM._filterPreviewStack = filterPreviewStack;   // suite seam

    const applyFilter = (id) => {
      const f = FM.filters.get(id);
      if (!f) return { ok: false, why: 'gone' };
      const box = FM.filters.makeInstance(id);
      if (!box) return { ok: false, why: 'unavailable', name: (f && f.name) || id };
      const fitted = FM.fxRegistry.fitToLayer(box, layer);
      if (!fitted) return { ok: false, why: 'unsuited', name: f.name };
      if (!layer.effects) layer.effects = [];
      layer.effects.forEach(e => { e._expanded = false; });
      fitted._expanded = true;
      layer.effects.push(fitted);
      return { ok: true, name: f.name, dropped: box.effects.length - fitted.effects.length };
    };

    const mkTile = (f) => {

        /* A TILE, matching the effects and audio browsers (queue 220). He asked for the section to work
           "like how effects and audio does", and those are grids of pictures — a picture is how you
           choose a LOOK, which is the one thing a sentence is bad at.
           The description and the ingredient list stay, as the tile's title, because they are the thing
           the picture cannot tell you: that a filter is not a black box but a group of ordinary effects
           you can open and retune. */
        const row = el('button', 'flt-tile');
        const th = el('div', 'flt-thumb');
        const cv = el('canvas', 'flt-thumb-cv');
        th.appendChild(cv);
        row.appendChild(th);
        if (FM.fxThumbs && FM.fxThumbs.mountFilter) FM.fxThumbs.mountFilter(cv, f.id);
        row.appendChild(el('div', 'flt-name', f.name));
        // What it is made of, in the app's own words for those effects — so the names match what you
        // will see inside the filter once it is added, not a second vocabulary invented here.
        const made = (f.effects || []).map(c => {
          const reg = FM.fxRegistry.get(c.type);
          return (reg && reg.label) || c.type;
        }).filter(Boolean);
        // On the tile itself these would be three lines of text under a 62px picture at 380px wide, so
        // they move to the title — still there when you want them, not shouting over the grid.
        row.title = f.name + (f.desc ? ' — ' + f.desc : '') + (made.length ? '\nMade of: ' + made.join(' · ') : '');
        row.dataset.fltid = f.id;
        row.addEventListener('click', () => {
          const i = _fltPicks.indexOf(f.id);
          if (i >= 0) _fltPicks.splice(i, 1); else _fltPicks.push(f.id);
          paintFilterPicks();
          restartFilterPreview();   // queue 554 — show it on HIS canvas, not just on the tile
        });
      /* THE STAR (clauses 3 and 4). On the tile rather than in a menu: it is a per-filter thing he can
         change while looking at the grid, and a menu would be two taps to express a preference.
         It stops propagation, or starring a filter would also ADD it — the tile's own click is the
         "use this look" action and the star sits inside it. */
      const star = el('button', 'flt-fave');
      const paintStar = () => {
        const on = FM.filters.isFave(f.id);
        star.classList.toggle('on', on);
        star.textContent = on ? '\u2605' : '\u2606';
        star.title = on ? 'Remove \u201c' + f.name + '\u201d from favourites' : 'Add \u201c' + f.name + '\u201d to favourites';
        star.setAttribute('aria-label', star.title);
      };
      paintStar();
      star.addEventListener('click', (ev) => {
        ev.stopPropagation(); ev.preventDefault();
        FM.filters.toggleFave(f.id);
        // Redraw the whole browser: the favourites row above has to gain or lose this filter, and the
        // twin tile in the category has to relight its star. Repainting only this one would leave the
        // other showing the opposite state.
        afterFx();
      });
      row.appendChild(star);
      return row;
    };

    /* FAVOURITES FIRST — and every one of these still appears in its own category below. */
    const favs = (FM.filters.faves && FM.filters.faves()) || [];
    if (favs.length) {
      s.appendChild(el('div', 'insp-sub-label', 'Favourites'));
      const fwrap = el('div', 'flt-grid');
      favs.forEach(f => fwrap.appendChild(mkTile(f)));
      s.appendChild(fwrap);
      s.appendChild(rowDots(fwrap));
    }
    (FM.filters.sections() || []).forEach(sec => {
      const list = FM.filters.bySection(sec.key);
      if (!list.length) return;
      s.appendChild(el('div', 'insp-sub-label', sec.label));
      const wrap = el('div', 'flt-grid');
      list.forEach(f => wrap.appendChild(mkTile(f)));
      s.appendChild(wrap);
      s.appendChild(rowDots(wrap));
    });

    /* The commit bar. Hidden until something is picked — an empty "Add 0 filters" sitting under the
       grid would be a control that does nothing, which is worse than no control. */
    const bar = el('div', 'fxb-commit flt-commit hidden');
    const clear = el('button', 'fxb-commit-clear', 'Clear');
    clear.type = 'button';
    clear.addEventListener('click', () => { _fltPicks = []; paintFilterPicks(); restartFilterPreview(); });
    const go = el('button', 'fxb-commit-go', 'Add 1 filter');
    go.type = 'button';
    go.addEventListener('click', () => {
      if (!_fltPicks.length) return;
      const picks = _fltPicks.slice();
      _fltPicks = [];
      /* The previewed copies go BEFORE the real ones land, or the layer briefly carries both — the same
         ordering the effects browser's commitPicks uses, and for the same reason. */
      FM._fxPreview = null;
      let added = 0, dropped = 0; const failed = [];
      // IN THE ORDER HE PICKED THEM. The badges are numbered, so applying them in any other order would
      // make the numbers a lie — and filters stack, so the order changes the result.
      picks.forEach(id => {
        const r = applyFilter(id);
        if (r.ok) { added++; dropped += (r.dropped || 0); }
        else failed.push(r.name || id);
      });
      // Back to the stack once, at the end — not once per filter.
      fxTab = 'visual';
      afterFx();
      if (FM.toast) {
        const what = added === 1 ? '1 filter' : added + ' filters';
        FM.toast(failed.length
          ? 'Added ' + what + ' — ' + failed.length + ' did not suit this layer'
          : (dropped ? 'Added ' + what + ' — ' + dropped + ' part(s) did not suit this layer' : 'Added ' + what));
      }
    });
    bar.appendChild(clear); bar.appendChild(go);
    s.appendChild(bar);
    setTimeout(paintFilterPicks, 0);   // after the section is in the DOM
    return s;
  }

  function effectsSection(layer) {
    const s = section('Effects');
    const list = el('div', 'fx-list');
    /* QUEUE 560 — rows in render order: every effect-stack entry (a mask MARKER renders as its mask's row), then
       the masks with no marker, which the compositor applies outermost. All on one stack — see mergedStack. */
    _merged.delete(layer);
    const ST = mergedStack(layer), ML = mergedList(layer), canMask = maskableLayer(layer);
    (layer.effects || []).forEach((fx, idx) => {
      if (fx && fx.type === 'penmask') {
        const mk = (Array.isArray(layer.masks) ? layer.masks : []).filter(x => x && x.id === fx.maskId)[0];
        if (mk && canMask) maskRows(layer, [mk], ST, ML.length).forEach(r => list.appendChild(r));
        return;
      }
      list.appendChild(fxRow(layer, fx, idx, ST));
    });
    /* MASKS GO IN THE SAME LIST (queue 560) — see the note above `maskRows`. They used to be appended
       after this whole section, below Copy / Paste / Save, under their own "Masks" heading, which is the
       "own menu" he is pointing at. Only when the layer actually has one: an empty heading explaining
       itself was removed once already and should not come back by another route. */
    if (canMask && Array.isArray(layer.masks) && layer.masks.length) {
      const un = unmarkedMasksOf(layer);
      if (un.length) maskRows(layer, un, ST, ML.length).forEach(r => list.appendChild(r));   // unmarked = outermost, so they sit last
    }
    s.appendChild(list);
    /* THE CUE'S OWN STACK, under the track's (queue 151). Shown only on a caption track while a cue is
     * actually on screen — an "effects for this cue" list with no cue under the playhead would be a
     * control with no subject. Labelled with the cue's own words so there is no doubt which one it
     * belongs to, because the answer changes as the playhead moves. */
    const cue = activeCue(layer);
    if (cue) {
      const cueFx = cueFxList(layer, false) || [];
      const words = String(cue.text || '').trim();
      const head = el('div', 'fx-cue-head', 'This cue' + (words ? ' — “' + (words.length > 22 ? words.slice(0, 21) + '…' : words) + '”' : ''));
      s.appendChild(head);
      const clist = el('div', 'fx-list');
      cueFx.forEach((fx, idx) => clist.appendChild(fxRow(layer, fx, idx, CUE_STACK)));
      if (!cueFx.length) clist.appendChild(el('div', 'insp-hint', 'Nothing on this cue yet — add an effect above, then ⋯ → Apply to this cue only.'));
      s.appendChild(clist);
    }
    const add = el('button', 'fx-add-btn', '+ Add Effect');
    add.addEventListener('click', () => { if (FM.fxBrowser) FM.fxBrowser.open(layer); });
    s.appendChild(add);
    /* NO "+ Add Filter" here (queue 220). It used to sit under Add Effect and open a picker, and he
       ruled that out: "there should[n't] be an add filter button in the effect tab, you should have to
       go over to filters tab." One door, and the door is the Filters subsection — which now carries the
       empty-filter option too, so building your own was moved rather than taken away. */
    // secondary stack tools — copy / paste / save-as-preset (demoted below the add button)
    const tools = el('div', 'fx-stack-tools');
    /* Both buttons speak to FM.fxClipboard now (v6.32) — see the note on it. They used to use a
       separate in-memory FM.effectClipboard, so "Copy effect" from a row's ⋯ left this Paste greyed
       out, and copying a stack here did nothing for the ⋯ menu's Paste. One clipboard, so every Copy
       feeds every Paste, and it survives a reload because it is in localStorage. */
    const clipN = FM.fxClipboard.count();
    const cp = el('button', 'fx-act', 'Copy'); cp.disabled = !(layer.effects && layer.effects.length);
    cp.addEventListener('click', () => {
      const n = (layer.effects || []).length;
      if (!FM.fxClipboard.copy(layer.effects)) { if (FM.toast) FM.toast('Couldn’t copy'); return; }
      if (FM.toast) FM.toast('Copied ' + n + (n === 1 ? ' effect' : ' effects'));
      FM.inspector.refresh();   // the Paste button's label and disabled state are derived from the clipboard
    });
    // Says WHAT it will paste. "Paste" alone gives you no way to tell whether you are about to land
    // one effect or somebody's whole stack on this layer.
    const pa = el('button', 'fx-act', clipN > 1 ? 'Paste ' + clipN : 'Paste'); pa.disabled = !clipN;
    pa.addEventListener('click', () => {
      const list = FM.fxClipboard.read();
      if (!list.length) return;
      if (!layer.effects) layer.effects = [];
      /* Fit each entry to THIS layer before landing it. A filter built on a text layer can hold text
         effects, and pasted onto a shape not one of them can run — so the child is dropped from inside
         the filter and the filter is kept, rather than the whole look being thrown away for one child
         that does not belong. Says so when it happens: a look that silently arrives different from the
         one you copied is worse than one that tells you what it left behind. */
      const fitted = list.map(e => FM.fxRegistry.fitToLayer(e, layer)).filter(Boolean);
      const dropped = list.length - fitted.length;
      fitted.forEach(e => { delete e._expanded; layer.effects.push(e); });
      afterFx();
      if (FM.toast) {
        FM.toast('Pasted ' + fitted.length + (fitted.length === 1 ? ' effect' : ' effects') +
                 (dropped ? ' — ' + dropped + ' didn\u2019t suit this layer' : ''));
      }
    });
    /* "Save EFFECTS ONLY" (queue 406). This one really does store just `layer.effects` — see the call
       below — and sitting in the Effects card under a bare "Save preset…" it was indistinguishable from
       the layer ⋯ menu's saver, which takes the whole look. That is the confusion he reported. */
    /* ⚠️ "Save as preset", not "Save effects only…" — queue 583, his words: *"Make this button say save
       as preset."* He circled this button.
       ⚠️ **The ⋯ menu's "Save this effect as preset…" is DELIBERATELY still different, and must stay so.**
       The entry said to make the two agree, and they now agree on the VOCABULARY — both say "preset" —
       while keeping the words that separate their scope: this button saves the whole STACK, that one
       saves THIS effect. Collapsing them to one string would make two different actions read as the same
       action, in the same panel, which is worse than the mismatch it fixed.
       The ellipsis goes with the rename: it promised a dialog to choose WHAT gets saved, and there is
       only a name prompt.
       ⚠️ **IT IS "Save effects only as preset", NOT the bare "Save as preset" HE ASKED FOR, AND THAT IS A
       DELIBERATE DEPARTURE FROM HIS WORDS.** Two of his own requests collide here. Queue 329 made this
       button and its sibling say WHAT EACH ONE KEEPS — the other is "Save look + animations…" — because
       an earlier pair ("Save this layer as preset" / "Save current effects") both read as "save a preset"
       and nobody could tell which kept the layer's motion. The suite asserts one of the two still says it
       keeps ONLY the effects, and the bare "Save as preset" says neither. **It went red on exactly that,
       which is the guard doing its job.**
       So this keeps his phrase — "as preset" — and keeps the word that carries the distinction. **Told
       him, rather than quietly delivering different words than he asked for**; the bare label is one
       word away if he would rather have it and lose the contrast. */
    const sv = el('button', 'fx-act', 'Save effects only as preset'); sv.disabled = !(layer.effects && layer.effects.length);
    sv.title = 'Save every effect on this layer as one preset — without its animation';
    sv.addEventListener('click', () => { const name = prompt('Preset name:', 'My look'); if (!name || !name.trim()) return; FM.fxPresets.save(name.trim(), layer.effects); if (FM.toast) FM.toast('Saved preset “' + name.trim() + '”'); });
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

  /* PER-CUE EFFECTS (queue 151). Ezra: "you should be able to chose somehow between adding effects to
   * each section or adding effects that effect the whole layer."
   *
   * A cue's stack is an ordinary effects array living on the cue, and the compositor concatenates it
   * onto the track's when that cue is showing (js/compositor.js, drawLayer). Here it is just another
   * stack descriptor — the same shape the audio side and filter children already use — so every row,
   * gesture, menu and index is scoped correctly by construction rather than by remembering.
   *
   * You still ADD effects to the track and then move them down. That is deliberate: the alternative is
   * teaching the effect browser and three other add paths which stack they are aiming at, and an add
   * path that guesses wrong does not throw, it silently puts your effect somewhere you did not look.
   * Moving is one explicit action on a row that already exists. */
  const CUE_STACK = { list: l => cueFxList(l, false), after: afterFx };
  function activeCue(layer) {
    if (!layer || !Array.isArray(layer.captions) || !layer.captions.length) return null;
    try { return (FM.captions && FM.captions.cueAt(layer, FM.time)) || null; } catch (e) { return null; }
  }
  // `create` is the difference between reading the list and intending to put something in it — an
  // empty array minted on every render would write `effects: []` onto every cue you merely scrolled past.
  function cueFxList(layer, create) {
    const cue = activeCue(layer);
    if (!cue) return null;
    if (!Array.isArray(cue.effects)) { if (!create) return null; cue.effects = []; }
    return cue.effects;
  }
  FM._cueFxList = cueFxList;   // exposed for the suite

  // audio-fx.js param descriptors carry `def` and no `type`; fxScrubber reads `default` and dispatches
  // on `type`. Bridge them rather than teaching either side about the other.
  function afxParam(p) {
    return { type: 'range', key: p.key, label: p.label, min: p.min, max: p.max, step: p.step, default: p.def, unit: p.unit, keyframable: p.keyframable };
  }
  /* A per-PARAM warning, shown only once the param is actually animated. Reverb's Size and Decay are the
     only two that carry one, and it is the warning Ezra asked for by name — *"if audio key frames break
     the project and lag too much just put a warning next to it before use"*. Deliberately conditional:
     the same note sitting under a slider nobody has keyframed is wallpaper, and wallpaper is what people
     stop reading before the one time it mattered. */
  function afxWarnFor(reg, fx, p) {
    const w = reg && reg.warn && reg.warn[p.key];
    if (!w) return null;
    return FM.isAnimated(fx.params ? fx.params[p.key] : undefined) ? w : null;
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
    const areg = FM.audioFxRegistry.get(fx.type);
    const items = [
      { label: 'Reset', action: () => { const inst = FM.audioFxRegistry.makeInstance(fx.type); if (inst) { fx.params = inst.params; afterAudioFx(); } } },
      // Duplicate carries the CURRENT settings + keyframes, as the visual stack's does (queue 727, hunt HIGH #10): a
      // fresh default instance is a Reset wearing Duplicate's label — a tuned reverb came back stock, keyframes gone.
      { label: 'Duplicate', action: () => { const copy = JSON.parse(JSON.stringify(fx, FM.jsonReplacer)); layer.audioFx.splice(idx + 1, 0, copy); afterAudioFx(); } },
    ];
    // Same favourite affordance as the visual effects' ⋯ menu — audio effects live in their own
    // browser with its own ★ and its own fav list, so this toggles that one. (#62)
    if (FM.audioFxBrowser && FM.audioFxBrowser.toggleFav) {
      const faved = FM.audioFxBrowser.isFav(fx.type);
      const nm = (areg && areg.label) || fx.type;
      items.push({ label: faved ? 'Remove from favourites' : 'Favourite', action: () => {
        const on = FM.audioFxBrowser.toggleFav(fx.type);
        if (FM.toast) FM.toast(on ? '★ ' + nm + ' added to favourites' : nm + ' removed from favourites', 1600);
      } });
    }
    FM.contextMenu.show(Math.max(8, r.right - 170), r.bottom + 4, items.concat([
      { sep: true },
      { label: 'Delete', danger: true, action: () => { layer.audioFx.splice(idx, 1); afterAudioFx(); } },
    ]));
  }

  function audioFxRow(layer, fx, idx) {
    const reg = FM.audioFxRegistry.get(fx.type) || { label: fx.type, params: [] };
    const expanded = !!fx._expanded, off = fx.enabled === false;
    const row = el('div', 'fx-row' + (off ? ' fx-off' : '') + (expanded ? ' fx-open' : ''));
    fxTapHint();
    const head = el('div', 'fx-head');
    const disc = el('button', 'fx-disc'); disc.innerHTML = FX_CHEVRON;
    disc.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    disc.title = expanded ? 'Close this effect' : 'Open this effect\u2019s controls';
    const name = el('span', 'fx-name', reg.label);
    const toggle = () => {
      if (_justReordered()) return;                       // a drag just dropped here — not a tap
      if (row._g && row._g.moved) { row._g.moved = false; return; }
      (layer.audioFx || []).forEach(e => { if (e !== fx) e._expanded = false; });   // accordion: exactly one editor open
      fx._expanded = !expanded;
      // Collapsing the row you were auditioning must stop the sound: the control that would stop it is
      // the thing being hidden, and audio playing from a panel you have closed is the worst kind of
      // stuck state — there is nothing on screen to connect it to. (queue 653)
      if (expanded && FM.audioFxLive && FM.audioFxLive.stopAudition) FM.audioFxLive.stopAudition();
      FM.inspector.refresh();
    };
    head.addEventListener('click', (e) => { if (e.target.closest('.fx-icon-btn')) return; toggle(); });
    if (!expanded && (layer.audioFx || []).length > 1) head.appendChild(el('span', 'fx-grip', '⠿'));
    head.appendChild(disc); head.appendChild(name); head.appendChild(el('span', 'fx-spacer'));
    if (expanded) {
      /* ═══ HEAR IT (queue 653) ══════════════════════════════════════════════════════════════════
       * Ezra: "Note that we need a way to hear audio effects while messing with them".
       * On the EXPANDED row only, because that is the row whose sliders you are dragging — a play
       * button on a collapsed row would audition an effect you cannot currently change.
       * It does NOT auto-start when the row opens: his own rule in the entry. A panel that starts
       * making noise because you tapped it is a different feature from one that offers to. */
      const hear = el('button', 'fx-icon-btn fx-hear');
      const live = FM.audioFxLive && FM.audioFxLive.auditioning && FM.audioFxLive.auditioning(layer);
      hear.classList.toggle('on', !!live);
      hear.title = live ? 'Stop' : 'Hear this effect';
      hear.setAttribute('aria-label', hear.title);
      hear.innerHTML = live ? svgIcon('M7 6h3v12H7zM14 6h3v12h-3z') : svgIcon('M8 5.5v13l11-6.5z');
      hear.addEventListener('click', () => {
        if (!FM.audioFxLive) return;
        if (FM.audioFxLive.auditioning(layer)) { FM.audioFxLive.stopAudition(); FM.inspector.refresh(); return; }
        /* The refusals come back as a WORD, not as false, so the button can say why instead of doing
           nothing — "it does nothing" is the report this app gets most often, and each of these is a
           case where auditioning would be a lie about what the project sounds like. */
        const r = FM.audioFxLive.audition(layer);
        const why = { reversed: 'A reversed clip\u2019s sound is rebuilt on playback, so it cannot be auditioned here',
                      silent: 'This layer is hidden or muted \u2014 there is nothing to hear',
                      solo: 'Another layer is soloed, so this one is silent' }[r];
        if (why) { if (FM.toast) FM.toast(why, 3600); return; }
        if (r !== true) { if (FM.toast) FM.toast('Could not start playback for this clip', 3000); return; }
        FM.inspector.refresh();
      });
      head.appendChild(hear);
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
      reg.params.forEach(p => {
        body.appendChild(fxScrubber(fx, afxParam(p), layer, idx));
        const w = afxWarnFor(reg, fx, p);
        if (w) body.appendChild(el('div', 'insp-hint afx-kf-warn', w));
      });
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
    /* NO EMPTY-STATE LINE HERE (queue 527). Ezra circled *"No audio effects yet — add one to shape this
       clip's sound."* and said: "Get rid of this text".
       It sat directly above a button reading **+ Add Audio Effect**, so the two lines carried one fact
       between them and the sentence was the redundant half.
       CHECKED BEFORE REMOVING, because the entry asked whether its siblings say the same thing and
       warned against assuming: the VISUAL effects section has no such line at all (see the + Add Effect
       button above — list, then button, nothing between), and the Behaviors section carries a note
       saying its own two explanation lines were removed for this same reason at queue 346/378. So audio
       was the odd one out, and removing it makes the three agree rather than making it the exception.
       The two hints that REMAIN elsewhere are deliberately left: "This filter is empty" and "Nothing on
       this cue yet" both say WHERE the effect will land — into this filter, onto this one cue — which is
       something their buttons do not, so they are carrying information rather than repeating it. */
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
  let _fltPicks = [];   // filters toggled but not yet added (queue 464); cleared whenever the view changes
  /* ONE LEAVE PATH (queue 729, hunt HIGH #12). The note above says the preview is "cleared on commit and on leaving the
     tab" — only Add and the tile/Clear paths cleared FM._fxPreview; openCategory dropped the picks but not the preview,
     and back(), a layer change, the ‹ back button and the Visual/Audio/Filters toggle cleared neither. So ticking filter
     tiles and leaving without Add kept rendering the preview on that layer, and a re-entry showed stale ticks. Every way
     out calls this.
     ⚠️ IT LIVES HERE, BESIDE THE STATE IT CLEARS, AND NOT beside restartFilterPreview() where it reads more naturally.
     Those helpers are indented at module level but are NESTED inside the filters view builder, so a function declared
     among them is invisible to openCategory / back / refresh — "clearFilterPreview is not defined", thrown from the
     refresh that runs on every selection change. Indentation is not scope; `_fltPicks` is the anchor that is. */
  const clearFilterPreview = () => { _fltPicks = []; FM._fxPreview = null; };

  // Order mirrors Alight Motion's property menu (Color & Fill leads, Move & Transform 4th, Effects last).
  const CATEGORIES = [
    { key: 'color', label: 'Colouring', icon: 'M12 3a9 9 0 1 0 9 9c0-1.1-.9-2-2-2h-1.5a2 2 0 0 1 0-4H19a2 2 0 0 0 2-2c0-2-4-3-9-3z' },
    /* "OUTLINE & SHADOWS" (queue 369). Ezra: "Change border and shadow to outline add shadows then in
       the actual menu change anything saying border to outline." Read as dictation for "Outline and
       Shadows" — plural, as he said it. The `border` KEY is untouched, so nothing saved is affected; this
       is a string change, the third in a row after Null → Controller and Blending / Opacity → Mixing. */
    { key: 'border', label: 'Outline & Shadows', icon: 'M4 4h12v12H4zM9 20h11V9' },
    /* "MIXING", not "Blending / Opacity" (queue 366). Ezra: "if you can think of a rename for blending
       and opacity that describes what it does just as well then change that name too."
       The slash was the tell: it read as a list of two settings when it is one idea. Blend mode is HOW
       this layer's pixels combine with what is under it; opacity is HOW MUCH of it combines. Mix METHOD
       and mix AMOUNT — so one plain word covers both honestly.
       Rejected, with reasons, so this is not re-litigated: "Compositing" is exactly right and exactly the
       wrong register (it is the word a manual uses); "Transparency" names only the opacity half and says
       nothing about blend modes; "Blend & Fade" reads well but "fade" implies change over TIME and this
       card is static values; "Blending" alone drops opacity, which is the more used of the two.
       The `blend` KEY is untouched, so every saved project and every lookup keeps working. */
    { key: 'blend', label: 'Mixing', icon: 'M9 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12M15 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12' },
    { key: 'transform', label: 'Position / Scale', icon: 'M12 2v20M2 12h20M8 5l4-3 4 3M8 19l4 3 4-3M5 8l-3 4 3 4M19 8l3 4-3 4' },
    { key: 'speed', label: 'Speed', icon: 'M4.2 16.8a8 8 0 1 1 15.6 0M12 12l4-2.5' },
    { key: 'volume', label: 'Volume', icon: 'M11 5 6 9H3v6h3l5 4zM16 8.5a4 4 0 0 1 0 7M19.5 6a8 8 0 0 1 0 12' },
    // No 'audiofx' card (queue 45). Audio effects are a SIDE of the Effects card now — the panel and
    // the Add Effect browser each carry a Visual/Audio toggle — so there is one door to every effect.
    { key: 'element', label: 'Element Properties', icon: 'M4 9h7v7H4zM15 6a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7M16 14l4 6h-8z' },
    { key: 'editgroup', label: 'Edit Group', icon: 'M4 4h7v7H4zM13 13h7v7h-7zM13 7.5h3.5a1 1 0 0 1 1 1V12M11 16.5H7.5a1 1 0 0 1-1-1V12' },   // group only — opens the group's own timeline
    /* CAPTIONS gets a door of its own (queue 150 part 1). Ezra: "make the auto detect captions button
     * way easier to access and use." It was reachable only as text layer → text editor → Aa sheet →
     * scroll, i.e. three levels down and inside a 46vh scroller, which is why he could not find it.
     * A tile beside the others is one tap from a selected text layer, and it is where someone looking
     * for captions would look first. Text and caption layers only — every other kind has nothing to
     * caption, and the branches below build by blacklist, so it is taken back out in catsFor. */
    { key: 'captions', label: 'Captions', icon: 'M3 5h18v14H3zM6.5 10.5h4M13.5 10.5h4M6.5 14h7' },
    /* A BOOKMARK, NOT A STAR (queue 367). Ezra: "Change the presets logo to be a little bookmark flag
       icon thing instead of a star, keep the same colours and put work into making sure it's great
       looking."
       A ribbon with a deep V notch, chosen by DRAWING the alternatives and looking at them at 22px —
       which is the size that actually decides it. A flag-on-a-pole was the other honest reading of
       "bookmark flag" and it loses badly: filled at 22px it collapses into an illegible blob, because
       the pole is a 1px line and the flag is most of the ink. The notch is what says "bookmark", so it
       is cut deep enough to survive at real size rather than closing up into a plain tab.
       ⚠️ The favourite ★ in the effects browser is a DIFFERENT glyph and is deliberately untouched — a
       bookmark there would be a second meaning for one shape. */
    { key: 'presets', label: 'Presets', icon: 'M6.6 3.2h10.8a1.2 1.2 0 0 1 1.2 1.2v16.4a.6.6 0 0 1-.95.49L12 16.6l-5.65 4.69A.6.6 0 0 1 5.4 20.8V4.4a1.2 1.2 0 0 1 1.2-1.2z' },
    { key: 'effects', label: 'Effects', icon: 'M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M19 5l-3.5 3.5M8.5 15.5L5 19' },
    // camera only — the Effects-style door into the lens, focus and fog (Ezra)
    { key: 'cameraopts', label: 'Camera Options', icon: 'M3 8.5 8.5 4v3H14a6 6 0 0 1 0 12H9M3 8.5 8.5 13v-3' },
  ];

  /* "CUSTOMISE …", not "Edit …" (queue 368). Ezra: "Change edit points and edit shape and edit text to
     replace the work edit with customise" — "the work edit" being the WORD edit. Australian spelling, as
     he wrote it.
     The category is still named after the layer kind, which is the Alight Motion idea this took: Text for
     text, Points for point shapes (library shapes and drawn paths — every bend is a point), Shape for
     parametric shapes and media (where it is the crop editor).
     ⚠️ THREE OTHER "Edit …" LABELS ARE DELIBERATELY UNCHANGED — 'Edit Group' (inspector.js), 'Edit group'
     (app.js) and 'Edit path' (the mask row). He named three and got three; changing the rest would be me
     deciding how his app reads. They are one line each and the entry flags them so he can say "those too"
     in one word. */
  /* The shortcut to the Filters subsection (queue 220: it GOES there rather than adding one — a shortcut takes you
     somewhere to look before you choose). Compact and on the Colouring header row since queue 714. */
  function filterShortcut() {
    const fb = el('button', 'fx-add-btn insp-filter-shortcut', '✦ Filters →');
    fb.title = 'Ready-made looks — Cinematic, Retro, Glow, Stylised';
    fb.addEventListener('click', () => FM.inspector.openCategory('filters'));
    return fb;
  }
  function elementLabel(layer) {
    if (layer.type === 'text' || layer.type === 'caption') return 'Customise Text';
    if (FM.isPointShape && FM.isPointShape(layer)) return 'Customise Points';
    return 'Customise Shape';
  }

  const FONTS = ['Inter, sans-serif', 'Helvetica, Arial, sans-serif', 'Georgia, serif', 'Times New Roman, serif', 'Courier New, monospace', 'Impact, sans-serif', 'Verdana, sans-serif', 'Trebuchet MS, sans-serif', 'Palatino, serif', 'Comic Sans MS, cursive'];

  /* The open/close affordance on an effect row. It used to be an 11px '\u25b8' text triangle in a
     20px box — Ezra: "the arrow to show an effect is open or closed is way too small, and it's kinda
     hard to someone who doesn't know what to do to figure out that ur supposed to tap on the effect
     to open and close." So: a real stroked chevron at a legible size that ROTATES between states
     (motion reads as state far better than swapping one glyph for another), the head styled as
     something you can press, and a one-time line of text for the person who has never seen it. */
  const FX_CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  /* WHY an effect can look dead, where the reason is knowable from the effect alone (queue 477).
     Every line is a cause queue 460 MEASURED on his own magenta rectangle, not a guess. Anything not
     listed gets the general sentence — a wrong reason is worse than no reason. */
  const NOOP_WHY = {
    channelremap: 'this mode swaps two colour channels, and on this colour they are already the same',
    halation: 'it blooms around highlights, and there are none here',
    lightglow: 'it needs a bright area to glow from',
    longshadow: 'the shadow is the same colour as what is behind it',
    radialshadow: 'the shadow is the same colour as what is behind it',
    dropshadow: 'the shadow is the same colour as what is behind it',
    matchgrade: 'it has no source layer to match yet',
  };
  /* THE SETTLE TIMER. Two full-resolution renders is the only comparison that is trustworthy (see
     fx-thumbs), so it must never run on the interaction path. Each change restarts the wait; nothing is
     measured until the settings have been still for NOOP_SETTLE, and the row is only redrawn when the
     ANSWER changes — otherwise a refresh here would schedule another check and loop forever. */
  const NOOP_SETTLE = 400;
  let noopTimer = 0;
  function scheduleNoopCheck(layer, fx, idx) {
    if (!FM.fxThumbs || !FM.fxThumbs.effectDoesNothing) return;
    const key = layer.id + '#' + idx + '#' + JSON.stringify(fx, FM.jsonReplacer);
    if (fx._noopKey === key) return;                      // already measured for exactly these settings
    clearTimeout(noopTimer);
    noopTimer = setTimeout(function tick() {
      /* NEVER WHILE HE IS PLAYING OR EXPORTING (queue 477, found by hunting my own work at v11.81).
         This check is two FULL-RESOLUTION renders. The timer fires 400ms after a settings change, so
         changing a slider and immediately pressing play — or Export — drops both of them straight onto
         the main thread in the middle of a render he is watching or waiting on. That is a stutter, from
         the man who has reported lag for weeks, bought for a hint nobody is reading at that moment.
         Deferred rather than dropped: it re-arms and measures once he stops. */
      if (FM.playing || FM._exporting) { noopTimer = setTimeout(tick, NOOP_SETTLE); return; }
      const live = FM.layerById ? FM.layerById(FM.scene, layer.id) : layer;
      const lfx = live && live.effects && live.effects[idx];
      if (!lfx) return;
      const k2 = live.id + '#' + idx + '#' + JSON.stringify(lfx, FM.jsonReplacer);
      if (k2 !== key) return;                             // it moved again while we waited — let the next one win
      const was = lfx._noop;
      lfx._noop = FM.fxThumbs.effectDoesNothing(live, idx);
      lfx._noopKey = key;
      if (lfx._noop === was) return;
      /* PAINT IT IN PLACE — never `FM.inspector.refresh()` from here. A refresh REBUILDS the row, and
         this timer fires 400ms after a change, which lands squarely inside a press-and-hold: rebuilding
         the row under the finger cancels the drag that was arming. The suite caught exactly that —
         "an OPEN effect row can still be dragged to reorder" went red — and it would have broken
         reordering for him in the same breath as adding the hint.
         The accordion guarantees at most one open row, so it can be found rather than tracked. */
      const openRow = document.querySelector('.fx-row.fx-open');
      if (!openRow) return;
      openRow.classList.toggle('fx-noop', lfx._noop === true);
      const existing = openRow.querySelector('.fx-noop-hint');
      if (lfx._noop === true) {
        if (!existing) {
          const body = openRow.querySelector('.fx-body') || openRow.querySelector('.fx-wrap') || openRow;
          const why = NOOP_WHY[lfx.type];
          body.appendChild(el('div', 'insp-hint fx-noop-hint',
            'This is on, but it changes nothing on this layer at these settings' + (why ? ' — ' + why : '') + '.'));
        }
      } else if (existing) existing.remove();
    }, NOOP_SETTLE);
  }

  function fxTapHint() {
    try {
      if (localStorage.getItem('fm.fx.tapHint')) return;
      localStorage.setItem('fm.fx.tapHint', '1');
    } catch (e) { return; }
    if (FM.toast) FM.toast('Tap an effect to open its controls', 2600);
  }

  /* ---- Coloured category icons (#77) ----------------------------------------------------------
   * Ezra: "it would be nice if you added colouring to all of these … gradients with bright nice
   * colours." Same mechanism the add-menu tabs use (js/addmenu.js icoMulti): the wrapper carries NO
   * blanket stroke="currentColor", because that would overwrite every per-path paint and flatten the
   * gradients back to one colour. Gradient ids are namespaced fm-ci-* so they cannot collide with
   * the add menu's fm-ic-* set — two <defs> with the same id in one document and the first one wins
   * everywhere, which is a silent, confusing failure. */
  function icoMulti(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  function lg(id, x1, y1, x2, y2, stops) {
    return '<defs><linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
      '" gradientUnits="userSpaceOnUse">' +
      stops.map(function (st) { return '<stop offset="' + st[0] + '" stop-color="' + st[1] + '"/>'; }).join('') +
      '</linearGradient></defs>';
  }

  /* SPEED — a real speedometer, which is what Ezra asked for by name: a dial ARC with tick marks, a
   * needle, and a hub, not a generic gauge outline. The dial runs cool at the low end and RED at the
   * top, the way a redline is printed on a real instrument, and the needle is swung up into that red
   * so the icon reads as "fast" rather than as "a dial". Geometry is explicit: centre (12, 18.4),
   * radius 8.4, ticks at 180/135/90/45/0 degrees drawn inward. */
  const ICO_SPEED = lg('fm-ci-spd', 3.6, 18.4, 20.4, 9, [
      ['0', '#5BE7B8'], ['.45', '#FFD166'], ['1', '#FF8A3D']]) +
    // the dial, then the REDLINE painted over its top-right third — a real instrument prints the red
    // as its own band, and at 22px a gradient that merely ends in red is not readable as one
    '<path d="M3.6 18.4a8.4 8.4 0 0 1 16.8 0" stroke="url(#fm-ci-spd)" stroke-width="2.6"/>' +
    '<path d="M15.9 9.6a8.4 8.4 0 0 1 4.5 8.8" stroke="#FF2D2D" stroke-width="2.6"/>' +
    '<path d="M6.6 12.6l1.3 1.2M12 9.9v1.8M17.4 12.6l-1.3 1.2" stroke="#cfe6f2" stroke-width="1.4" opacity=".75"/>' +
    // needle swung up into the red
    '<path d="M12 18.4 17.1 13.3" stroke="#FF2D2D" stroke-width="2.4"/>' +
    '<circle cx="12" cy="18.4" r="2" fill="#FF2D2D"/>';

  /* BLENDING & OPACITY — Ezra: "make it look like one of the little circles was one colour and the
   * other was another colour and where they meet is like them overlaying to a new colour." So the
   * discs are FILLED and the right one is composited with `screen`: the overlap is a genuine third
   * colour computed by the blend, not a third flat shape painted to look like one. isolation:isolate
   * on the svg keeps that blend inside the icon instead of reaching the panel behind it. */
  const ICO_BLEND =
    '<circle cx="9.2" cy="12" r="5.6" fill="#3FA9FF" fill-opacity=".92"/>' +
    '<circle cx="14.8" cy="12" r="5.6" fill="#FF4FA3" fill-opacity=".92" style="mix-blend-mode:screen"/>';

  /* EFFECTS — Ezra: "a shared gradient over every little spike that makes a rainbow, don't just make
   * each spike a new colour but it's like blends between them all." One gradient defined over the
   * icon's whole box in userSpaceOnUse, referenced by EVERY spike — so a spike's colour comes from
   * where it sits in the glyph, and the ramp runs continuously across all of them. Per-path
   * gradients (the obvious wrong version) would restart the ramp inside each spike. */
  const ICO_EFFECTS = lg('fm-ci-fx', 3, 21, 21, 3, [
      ['0', '#FF4FA3'], ['.25', '#FF8A3D'], ['.5', '#FFE14D'], ['.75', '#49E39B'], ['1', '#4FC3FF']]) +
    '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M19 5l-3.5 3.5M8.5 15.5L5 19" ' +
      'stroke="url(#fm-ci-fx)" stroke-width="2.1"/>';

  /* COLOURING — Ezra asked for this glyph to be CHANGED, not just tinted. It was a paint-blob
   * outline; it is a filled droplet over a swatch bar now, which says "the colour AND the fill".
   *
   * v6.13, the recolour: "the logo for colour and fill looks like a fire, just change the colour."
   * It did, and the palette was the whole reason — pink at the tip running to orange and then YELLOW at
   * the base is exactly how a flame is lit, and the droplet's pointed top sold the rest. Two things fix
   * it. The ramp now runs violet → magenta → pink, so there is no yellow or orange anywhere in the
   * glyph; and it runs COOL at the top to WARM at the base, which is the reverse of a flame (fire is
   * hottest, so palest, at the bottom). Magenta was also the one hue no other category had claimed —
   * Speed and Presets own the warms, Border, Transform, Volume and Shape own the cools, Effects owns
   * the whole rainbow — so this reads as its own thing at 24px rather than as a near-miss of a
   * neighbour. */
  const ICO_COLOR = lg('fm-ci-col', 6, 4, 19, 20, [
      ['0', '#9B5CFF'], ['.5', '#E255D8'], ['1', '#FF6FB5']]) +
    '<path d="M12 3.2c3.4 3.9 5.2 6.6 5.2 8.9a5.2 5.2 0 0 1-10.4 0c0-2.3 1.8-5 5.2-8.9z" fill="url(#fm-ci-col)"/>' +
    '<path d="M5 20.3h14" stroke="url(#fm-ci-col)" stroke-width="2.4"/>';

  const ICO_BORDER = lg('fm-ci-bor', 4, 4, 20, 20, [
      ['0', '#6FE3FF'], ['.55', '#4F9DFF'], ['1', '#7C6BFF']]) +
    // the cast shadow has to be VISIBLE against a dark card, so it is a tinted slab, not near-black
    '<rect x="8.4" y="8.4" width="11.4" height="11.4" rx="2.4" fill="#3a6b8f" fill-opacity=".55"/>' +
    '<rect x="4.6" y="4.6" width="11.4" height="11.4" rx="2.4" stroke="url(#fm-ci-bor)" stroke-width="2"/>';

  const ICO_TRANSFORM = lg('fm-ci-tr', 3, 21, 21, 3, [
      ['0', '#3FE0C8'], ['.5', '#4FA8FF'], ['1', '#A96BFF']]) +
    '<path d="M12 2.8v18.4M2.8 12h18.4M8.6 6.2 12 2.8l3.4 3.4M8.6 17.8 12 21.2l3.4-3.4' +
      'M6.2 8.6 2.8 12l3.4 3.4M17.8 8.6 21.2 12l-3.4 3.4" stroke="url(#fm-ci-tr)" stroke-width="2"/>';

  /* VOLUME — two states. Ezra: "make the volume icon change when there's no volume on a layer, like
   * instead of the three lines just make it one horizontal line." So a silent layer gets a single
   * flat stroke where the arcs were: a flat line IS the picture of no signal, and it reads at 22px
   * where a small crossed-out speaker does not. */
  const VOL_GRAD = lg('fm-ci-vol', 4, 18, 21, 6, [
      ['0', '#49E39B'], ['.55', '#3FD8D8'], ['1', '#4FC3FF']]);
  const VOL_BODY = '<path d="M11 5 6 9H3v6h3l5 4z" fill="url(#fm-ci-vol)"/>';
  const ICO_VOLUME = VOL_GRAD + VOL_BODY +
    '<path d="M14.6 9.4a3.6 3.6 0 0 1 0 5.2M17.2 6.8a7.2 7.2 0 0 1 0 10.4" stroke="url(#fm-ci-vol)" stroke-width="2"/>';
  const ICO_VOLUME_OFF = VOL_GRAD + VOL_BODY +
    '<path d="M14.4 12h6" stroke="#6f8592" stroke-width="2.1"/>';

  /* ELEMENT — Edit Shape keeps a shape; Edit Points gets the same shape WITH its vertices shown,
   * because the points are the thing that screen edits. elementLabel() already picks the wording off
   * FM.isPointShape, so the icon switches on exactly the same condition and the two can never
   * disagree. */
  const EL_GRAD = lg('fm-ci-el', 4, 20, 20, 4, [
      ['0', '#8CE86B'], ['.55', '#3FD8B0'], ['1', '#4FC3FF']]);
  const ICO_SHAPE = EL_GRAD +
    '<path d="M12 3.6 20.4 12 12 20.4 3.6 12z" stroke="url(#fm-ci-el)" stroke-width="2"/>';
  const ICO_POINTS = EL_GRAD +
    '<path d="M12 3.6 20.4 12 12 20.4 3.6 12z" stroke="url(#fm-ci-el)" stroke-width="1.7" opacity=".75"/>' +
    '<rect x="10" y="1.6" width="4" height="4" rx="1" fill="url(#fm-ci-el)"/>' +
    '<rect x="18.4" y="10" width="4" height="4" rx="1" fill="url(#fm-ci-el)"/>' +
    '<rect x="10" y="18.4" width="4" height="4" rx="1" fill="url(#fm-ci-el)"/>' +
    '<rect x="1.6" y="10" width="4" height="4" rx="1" fill="url(#fm-ci-el)"/>';

  /* A serif capital T — a letterform, so it cannot be confused with the keyframe diamond ICO_SHAPE
     draws. Same EL_GRAD as its siblings so the element family still reads as one set. */
  const ICO_TEXT = EL_GRAD +
    '<path d="M4.4 7.2V5h15.2v2.2" stroke="url(#fm-ci-el)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<path d="M12 5v14" stroke="url(#fm-ci-el)" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M8.6 19h6.8" stroke="url(#fm-ci-el)" stroke-width="2" stroke-linecap="round"/>';

  const ICO_PRESETS = lg('fm-ci-pre', 4, 20, 20, 4, [
      ['0', '#FFB03A'], ['.55', '#FFD84D'], ['1', '#FFF0A6']]) +
    '<path d="M6.6 3.2h10.8a1.2 1.2 0 0 1 1.2 1.2v16.4a.6.6 0 0 1-.95.49L12 16.6l-5.65 4.69A.6.6 0 0 1 5.4 20.8V4.4a1.2 1.2 0 0 1 1.2-1.2z" fill="url(#fm-ci-pre)"/>';   // same amber gradient, new shape (queue 367): "keep the same colours"

  /* Which coloured glyph a category shows, given the layer it is describing. Returns raw inner SVG
   * for icoMulti, or null to fall back to the old single-path currentColor icon. */
  /* THE BORDER COLOURS ARE THE ICON'S OWN (queue 339). Ezra: *"make it so each buttons background is the
   * same but the line around it is a unique colour that matches the colours in the icon, using gradients"*.
   * These are LIFTED from the gradient stops a few lines up, not picked to look nice beside them — that is
   * the whole request, and a hand-matched approximation is the version that drifts the first time an icon
   * is retouched. Where a card has no gradient icon (Blending is two flat circles, Captions and the rest
   * fall back to a stroked glyph) the pair is taken from the flat fills instead, same principle.
   * The fallback is the app's accent, so a category added later gets a working border rather than none. */
  const CAT_HUES = {
    color:     ['#9B5CFF', '#E255D8', '#FF6FB5'],
    border:    ['#6FE3FF', '#4F9DFF', '#7C6BFF'],
    blend:     ['#3FA9FF', '#A05FD0', '#FF4FA3'],   // the two circles, plus where they overlap
    transform: ['#3FE0C8', '#4FA8FF', '#A96BFF'],
    // RED-DOMINANT, with the green only in one corner (his note on the v9.87 screenshot): *"the speeds
    // outer line should be mainly red as it looks too similar to the presets one, so like red mainly
    // with a bit of green in the corner"*. Taking Speed's three stops straight from its dial ran
    // green→amber→orange, which sat right next to Presets' amber→yellow and read as the same ring.
    speed:     ['#5BE7B8', '#FF3B30', '#C2261F'],
    volume:    ['#49E39B', '#3FD8D8', '#4FC3FF'],
    element:   ['#8CE86B', '#3FD8B0', '#4FC3FF'],
    presets:   ['#FFB03A', '#FFD84D', '#FFF0A6'],
    effects:   ['#FF4FA3', '#FFE14D', '#4FC3FF'],
    captions:  ['#7CC6FF', '#4F9DFF', '#9B8CFF'],
    editgroup: ['#8CE86B', '#3FD8B0', '#4FC3FF'],
    cameraopts:['#6FE3FF', '#4F9DFF', '#7C6BFF'],
  };
  Object.setPrototypeOf(CAT_HUES, null);

  function catIco(key, layer) {
    if (key === 'color') return ICO_COLOR;
    if (key === 'border') return ICO_BORDER;
    if (key === 'blend') return ICO_BLEND;
    if (key === 'transform') return ICO_TRANSFORM;
    if (key === 'speed') return ICO_SPEED;
    if (key === 'presets') return ICO_PRESETS;
    if (key === 'effects') return ICO_EFFECTS;
    if (key === 'volume') {
      // A layer that cannot carry audio at all is silent by nature, not merely muted — showing it
      // three sound waves is a promise the layer type can never keep.
      const canHaveAudio = !!layer && layer.type === 'video';
      const silent = !canHaveAudio || layer.muted === true ||
        (layer.volume != null && typeof layer.volume === 'number' && layer.volume <= 0);
      return silent ? ICO_VOLUME_OFF : ICO_VOLUME;
    }
    // Text gets its own glyph (queue 137). Ezra: "edit text button should have a diff icon." It was
    // falling through to ICO_SHAPE — a DIAMOND — which is the keyframe mark used everywhere else in
    // the app, so the card read as "add a keyframe" rather than "edit the text". elementLabel()
    // already branches on exactly this condition, so the icon and the wording cannot disagree.
    if (key === 'element') {
      if (layer && (layer.type === 'text' || layer.type === 'caption')) return ICO_TEXT;
      return (layer && FM.isPointShape && FM.isPointShape(layer)) ? ICO_POINTS : ICO_SHAPE;
    }
    // 'text' is not an inspector category — text lives under 'element' there. It exists so Paste
    // Style, whose grid DOES have a standalone Text tile, can ask for the letterform by name instead
    // of keeping its own copy of the glyph. See STYLE_CATS (queue 127).
    if (key === 'text') return ICO_TEXT;
    return null;
  }
  FM._catIco = catIco;   // read by the suite, which compares the Paste Style grid against these

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
    if (FM.reconcileMaskMarkers) FM.reconcileMaskMarkers(layer);   // a deleted mask takes its marker with it (queue 560)
    if (layer.masks && !layer.masks.length) delete layer.masks;   // empty === absent → stay byte-for-byte diff-free
    commitH(); FM.requestRender(); FM.inspector.refresh(); if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
  }
  /* A mask row behaves like an effect row now (queue 360 clause 1). Ezra: *"The mask effect… doesn't
     work like an effect. I can't swipe it away to delete it or minimise it."*
     He is right about the history and the deeper half of it is a big job — `layer.masks` is layer STATE
     with 30 call sites across eight files including the render path, so making it a registry effect is
     a #335-scale migration and is recorded as still open.
     But neither thing he actually named needs any of that, and both come from the same place: this
     block rendered every mask fully expanded with no gestures on it. `attachFxGestures` is already the
     reusable wiring for swipe-left-to-delete AND press-hold-to-reorder, and it is generic — it reads
     its list through a `stack` descriptor and deletes by OBJECT IDENTITY rather than by index, so it
     takes masks unchanged. This is the same two-key descriptor the audio stack uses. */
  const MASK_STACK = { list: l => (Array.isArray(l.masks) ? l.masks : []), after: afterMasks };
  /* ── QUEUE 560: ONE LIST FOR EFFECTS AND MASKS ────────────────────────────────────────────────────
     His words: "layering them with the other effects and it works the same as an effect. But keeping the
     function." A mask placed among the effects is an ORDERING MARKER `{ type: 'penmask', maskId }` in
     layer.effects (the compositor applies that one mask at that position); layer.masks stays the data.
     The rows on screen are, in order: every entry of layer.effects (a marker renders as its mask's row),
     then the masks that have NO marker — which the compositor still applies outermost, so the row order IS
     the render order. attachFxGestures measures the WHOLE .fx-list and splices ONE array at the DOM index,
     so every row here shares this stack, whose list is that merged order. Its `after` reads the spliced
     list back: an effect or marker keeps its place; an unmarked mask that now sits ABOVE any effect has
     been dragged INTO the stack and gets a marker there; a mask no longer in the list at all was swiped
     away and is deleted (for a marker row that means the mask, not just the marker). Before this, a mask
     row's reorder spliced layer.masks at a DOM index measured over the merged list — wrong on any layer
     that also had effects (the 2 Sep audit, item 7). */
  const _merged = new WeakMap();
  const isMaskObj = x => !!(x && (Array.isArray(x.path) || (x.path && Array.isArray(x.path.kf))));
  function markedIdsOf(layer) { const ids = new Set(); (layer.effects || []).forEach(e => { if (e && e.type === 'penmask' && typeof e.maskId === 'string') ids.add(e.maskId); }); return ids; }
  function unmarkedMasksOf(layer) { const ids = markedIdsOf(layer); return (Array.isArray(layer.masks) ? layer.masks : []).filter(x => x && !ids.has(x.id)); }
  function mergedList(layer) {
    let m = _merged.get(layer);
    if (!m) { m = (layer.effects || []).slice().concat(unmarkedMasksOf(layer)); _merged.set(layer, m); }
    return m;
  }
  function reconcileMarkers(layer) {
    if (!Array.isArray(layer.effects)) return;
    const have = new Set((Array.isArray(layer.masks) ? layer.masks : []).filter(Boolean).map(x => x.id)), seen = new Set();
    layer.effects = layer.effects.filter(e => { if (!e || e.type !== 'penmask') return true; if (!have.has(e.maskId) || seen.has(e.maskId)) return false; seen.add(e.maskId); return true; });
  }
  FM.reconcileMaskMarkers = reconcileMarkers;
  function applyMerged(layer) {
    const m = _merged.get(layer) || mergedList(layer); _merged.delete(layer);
    let lastFx = -1; m.forEach((x, i) => { if (!isMaskObj(x)) lastFx = i; });
    const effects = [];
    m.forEach((x, i) => {
      if (!isMaskObj(x)) effects.push(x);                                             // an effect, or a marker already in the stack
      else if (i < lastFx && layer.type !== 'adjustment') effects.push({ type: 'penmask', maskId: x.id });   // dragged INTO the stack (adjustment layers never dispatch post-fx — audit item 13)
    });
    const keep = new Set(m.filter(isMaskObj).map(x => x.id).concat(effects.filter(e => e && e.type === 'penmask').map(e => e.maskId)));
    if (Array.isArray(layer.masks)) layer.masks = layer.masks.filter(x => x && keep.has(x.id));
    layer.effects = effects;
    reconcileMarkers(layer);
    if (layer.masks && !layer.masks.length) delete layer.masks;
    afterFx();
  }
  function mergedStack(layer) { return { list: () => mergedList(layer), after: () => applyMerged(layer) }; }

  /* ONE LIST, NOT TWO (queue 560). Ezra: "Masks still don't work like effects and have their own menu
     fix this" — his screenshot shows a MASKS heading sitting below the effect list, below even Copy /
     Paste / Save, with Mask 1 in a card of its own.
     ⚠️ MOST OF "BEHAVES LIKE AN EFFECT" WAS ALREADY TRUE, and checking that first is what kept this
     small. #360 gave masks the chevron, the grip, the eye, the bin, swipe-to-delete and hold-to-reorder
     (they already run through `attachFxGestures`), and the "+ Add mask" button is long gone — Mask is an
     entry in the effect browser, so the add route is shared too. What was left is exactly what he can
     see: a separate block with its own heading, and a card that looks different from an effect's.
     So these are rows now, returned to `effectsSection` and appended to the SAME `.fx-list`, wearing
     `fx-row`/`fx-head` so the shared styling, the chevron rotation and the swipe backdrop all apply.
     ⚠️ THE MODEL IS STILL `layer.masks`, and that is stated rather than implied. #360 sized the real
     migration: 30 call sites across 8 files, and the compositor applies masks at a different stage from
     the effect stack. This is the UI half — one list, one row treatment, one way in — which is what he
     is looking at. */
  function maskRows(layer, which, stack, rowCount) {
    const rows = [];
    const masks = Array.isArray(layer.masks) ? layer.masks : [];   // caller only calls this when it's non-empty
    const show = Array.isArray(which) ? which : masks;                 // queue 560: a subset (one marker's mask, or the unmarked ones)
    const st = stack || MASK_STACK, merged = stack ? mergedList(layer) : null;
    show.forEach((mask) => {
      const idx = masks.indexOf(mask);                                  // 'Mask N' keeps its number wherever the row sits
      /* `_expanded` is SAFE to hang on a mask, and it was worth checking before doing it: the mask
         sanitiser (js/storage.js:550) rebuilds every mask from a whitelist of eight keys, so a UI flag
         cannot reach a saved project — the same guarantee `fx._expanded` already relies on. */
      const expanded = !!mask._expanded;
      const item = el('div', 'fx-row mask-item' + (mask.enabled === false ? ' fx-off mask-off' : '') + (expanded ? ' fx-open' : ''));
      const head = el('div', 'fx-head mask-item-head');
      const disc = el('button', 'fx-disc'); disc.innerHTML = FX_CHEVRON;
      disc.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      disc.title = expanded ? 'Close this mask' : 'Open this mask\u2019s controls';
      const toggleMask = () => {
        if (_justReordered()) return;                    // a drag just dropped here — not a tap
        if (item._g && item._g.moved) { item._g.moved = false; return; }
        masks.forEach(m => { if (m !== mask) m._expanded = false; });   // accordion, same as the fx stack
        mask._expanded = !expanded;
        FM.inspector.refresh();
      };
      head.addEventListener('click', (e) => { if (e.target.closest('.fx-icon-btn')) return; toggleMask(); });
      if ((rowCount != null ? rowCount : masks.length) > 1) head.appendChild(el('span', 'fx-grip', '\u283f'));   // press-hold to reorder
      const eye = el('button', 'fx-icon-btn fx-eye' + (mask.enabled === false ? ' off' : ''));
      eye.title = mask.enabled === false ? 'Mask off — enable' : 'Mask on — disable';
      eye.innerHTML = svgIcon('M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6');
      eye.addEventListener('click', () => { mask.enabled = mask.enabled === false; afterMasks(layer); });
      /* SAME ORDER AS AN EFFECT ROW (queue 560): chevron, then name, then the icons on the right. The
         mask put its eye FIRST, so in one list the two rows disagreed about where their controls live —
         the disclosure arrow started in a different column on every other row. */
      head.appendChild(disc);
      head.appendChild(el('span', 'mask-name', 'Mask ' + (idx + 1)));
      head.appendChild(el('span', 'fx-spacer'));
      head.appendChild(eye);
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
      /* THE SAME SWIPE STRUCTURE AN EFFECT ROW HAS (queue 560), and it is not decoration. `.fx-row >
         .fx-swipe-wrap > .fx-head > .fx-disc` is how the open-chevron rule is scoped, so without the
         wrap the mask's chevron never rotated — an arrow that stays shut on an open row is the one
         thing a disclosure triangle must not do, and it is exactly the "does not behave like an
         effect" he is reporting. `attachFxGestures` also slides `row._wrap` to reveal the red delete
         panel behind it; with no wrap the whole card translated and there was nothing underneath. */
      const delBg = el('div', 'fx-del-bg');
      delBg.innerHTML = '<span class="fx-del-ico">' + svgIcon('M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6') + '</span>';
      const wrap = el('div', 'fx-swipe-wrap');
      wrap.appendChild(head);
      item.appendChild(delBg);
      item.appendChild(wrap);
      item._wrap = wrap; item._delBg = delBg;   // both, exactly as fxRow sets them
      // MINIMISED unless opened — the other half of "I can't … minimise it". Every mask used to render
      // its four controls and an Edit path button whether you were looking at it or not, so two masks
      // buried the rest of the panel.
      if (expanded) {
        /* `.fx-row` is `padding: 0` — its head carries its own — so the body needs a box of its own or
           the controls run to the card's edge. */
        const bodyEl = el('div', 'mask-body');
        wrap.appendChild(bodyEl);   // inside the wrap, so head and body travel together on a swipe
        bodyEl.appendChild(segRow('Mode', [['add', 'Add'], ['subtract', 'Subtract'], ['intersect', 'Intersect']], () => mask.mode || 'add', v => { mask.mode = v; }));
        bodyEl.appendChild(rangeRow('Feather', () => mask.feather || 0, v => { mask.feather = Math.max(0, v); }, 0, 200, 1));
        bodyEl.appendChild(rangeRow('Opacity', () => Math.round((mask.opacity != null ? mask.opacity : 1) * 100), v => { mask.opacity = Math.max(0, Math.min(1, v / 100)); }, 0, 100, 1));
        bodyEl.appendChild(checkRow('Invert', !!mask.invert, v => { mask.invert = v; FM.requestRender(); }));
        const edit = el('button', 'mask-edit-btn', 'Edit path');
        edit.addEventListener('click', () => { if (FM.maskTool && FM.maskTool.open) FM.maskTool.open(layer.id, mask.id); else if (FM.toast) FM.toast('Mask editor unavailable'); });
        bodyEl.appendChild(edit);
      }
      /* INSIDE THE STACK THE ROW STANDS FOR ITS MARKER (queue 728, hunt HIGH #11 — a regression of v14.99). The merged
         list holds `{ type: 'penmask', maskId }` for a mask that sits among the effects, not the mask object, so handing
         the gestures the mask gave them an index of −1: a swipe animated the row away and refreshed it straight back,
         a press-hold drag shuffled the wrong rows and dropped it where it was. The gestures get the entry the list
         actually contains; applyMerged() already deletes a mask whose marker has left the list and keeps one that
         was only moved. An unmarked mask is still itself. */
      const entry = merged ? (merged.indexOf(mask) >= 0 ? mask : (merged.find(e => e && e.type === 'penmask' && e.maskId === mask.id) || mask)) : mask;
      attachFxGestures(item, head, layer, entry, merged ? merged.indexOf(entry) : idx, st);   // swipe-left = delete · press-hold + drag = reorder — the index is the row's place in the list the stack splices
      rows.push(item);
    });
    return rows;
  }

  // ===== Paste Style (Alight Motion) — copy a layer, then apply chosen style aspects to another. =====
  /* NO `icon:` field here, deliberately (queue 127). This table used to carry its own single-path
     glyphs, and when the inspector's cards were regraded to the coloured gradient set in #77 the two
     drifted — Ezra's screenshot caught both icon sets on screen at once, the old ones in this grid
     and the current ones on the cards right below it: "Paste style menu needs to reflect the current
     icons that have since changed."
     Copying the new paths across would only reset the clock on the same bug. The grid asks catIco()
     the same question the cards ask instead, so there is no second table left to go stale. Every key
     below must resolve there — the suite asserts it. */
  const STYLE_CATS = [
    { key: 'color',     label: 'Colouring' },
    { key: 'border',    label: 'Outline & Shadows' },   // the Paste Style list — must match the card (queue 369)
    { key: 'blend',     label: 'Mixing' },   // must stay in step with the card above (queue 366)
    { key: 'transform', label: 'Position / Scale' },
    { key: 'text',      label: 'Text', textOnly: true },
    /* Ezra: "this section when pasting a style probably needs other options because there's 9
       categories now not 6." Correct — the inspector grew Speed, Volume, Element and Presets after
       this table was written. Three of those four are real style aspects and are added here.
       PRESETS deliberately is NOT: it is a browser of saved looks, not a property the layer carries,
       so there is nothing on the source layer to copy. A toggle for it would be a dead switch. */
    { key: 'speed',     label: 'Speed' },
    { key: 'volume',    label: 'Volume' },
    { key: 'effects',   label: 'Effects' },
  ];
  /* The arithmetic behind the "Crop to canvas" button (queue 580), lifted out so the suite drives the
     REAL function rather than a copy of the formula — a copied formula keeps passing after the shipped
     one changes, which is a failure shape this repo already knows.
     Returns the LARGEST rect with the project's aspect ratio that fits inside the source, centred. It
     can only ever remove picture: whichever way round the two shapes are, one dimension is taken whole
     and the other is reduced, so nothing is stretched or invented. */
  FM.cropToCanvasRect = function (mw, mh, pw, ph) {
    const MW = (mw > 0) ? mw : 1, MH = (mh > 0) ? mh : 1;
    const ar = (pw > 0 && ph > 0) ? (pw / ph) : (MW / MH);
    let w = MW, h = MW / ar;
    if (h > MH) { h = MH; w = MH * ar; }
    w = Math.min(MW, Math.max(1, w));
    h = Math.min(MH, Math.max(1, h));
    return { x: (MW - w) / 2, y: (MH - h) / 2, w: w, h: h };
  };

  FM._styleCats = STYLE_CATS;   // read by the suite, which checks every key still resolves to an icon

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
    /* trimPath AND repeater PASTE TOO (#689). The category table above says this list "must match the
       card", and it had drifted: the Outline & Shadows card edits stroke, shadow, Trim Path and
       Repeater, while this pasted the first two and dropped the other two without a word. Measured
       through the real dialog — tick Outline & Shadows on a shape carrying all four and only half of
       it arrives. Assigned unconditionally, exactly as stroke and shadow already are: this category
       pastes the card wholesale, so a source with no repeater clears the target's, which is what the
       existing two do and what "paste this card" has always meant here. */
    if (cats.border) { target.stroke = clone(src.stroke); target.shadow = clone(src.shadow); target.trimPath = clone(src.trimPath); target.repeater = clone(src.repeater); }
    if (cats.blend) {
      target.blendMode = src.blendMode || 'normal';
      if (src.transform && 'opacity' in src.transform) target.transform.opacity = clone(src.transform.opacity);
    }
    if (cats.transform && src.transform) {
      /* POSITION NOW PASTES TOO, and this is a deliberate reversal — it is queue 380. Ezra: "Make sure
         paste style actually works, I just tried pasting style and only selected the position and scale
         and it didn't do anything."
         It was doing something, and nothing he could see. This branch used to restore the target's x, y
         and anchor after cloning the source's transform — "so Paste Style doesn't teleport the layer onto
         the source's spot" — while the tick he had to tick to reach it is labelled **Position / Scale**.
         Two layers at the same scale (which is to say, most layers) then changed by exactly nothing, and
         the toast said "Pasted style" over the top of it. A control that names a property and then refuses
         to paste it is the bug, not the teleport.
         The label cannot move instead: `transform` is the inspector CARD's own key, and queue 366/369 made
         the Paste Style list mirror the cards precisely so the two can never drift apart again. So the
         behaviour is what changes.
         OPACITY still stays behind, and that is not the same compromise: opacity belongs to the **Mixing**
         card, which is its own tick in this very list, so pasting it here would make one box quietly do
         another box's job. */
      const tr = target.transform, t = clone(src.transform);
      t.opacity = tr.opacity;
      target.transform = t;
    }
    if (cats.text && target.type === 'text' && src.type === 'text') {
      // captionBg IS ON THIS CARD (#689) — "Caption background" is a checkRow in buildTextExtras, and
      // this list is supposed to mirror the card. It was pasting the font, the slant and the spacing
      // and silently leaving the pill behind.
      ['fontFamily', 'fontSize', 'bold', 'italic', 'align', 'letterSpacing', 'lineHeight', 'textCurve', 'captionBg'].forEach(k => { if (k in src) target[k] = src[k]; });
      if ('textAnim' in src) target.textAnim = clone(src.textAnim);
      if (src.color != null) target.color = clone(src.color);   // may be a keyframe object
    }
    if (cats.speed) {
      // The Speed card's own properties. `speed` may be a KEYFRAME OBJECT (a ramp), so it is cloned
      // and re-anchored like every other animated value rather than assigned by reference.
      if ('speed' in src) target.speed = clone(src.speed);
      if ('frameBlend' in src) target.frameBlend = src.frameBlend;
    }
    if (cats.volume) {
      // Volume is keyframable too; the fades are plain seconds. `muted` travels with it because a
      // pasted level of 1 onto a muted layer would otherwise read as "the paste did nothing".
      if ('volume' in src) target.volume = clone(src.volume);
      if ('muted' in src) target.muted = src.muted;
      if ('fadeIn' in src) target.fadeIn = src.fadeIn;
      if ('fadeOut' in src) target.fadeOut = src.fadeOut;
    }
    if (cats.effects) {
      const fx = clone(src.effects) || [];
      target.effects = (FM.fxRegistry && FM.fxRegistry.supportsLayer) ? fx.filter(f => FM.fxRegistry.supportsLayer(f.type, target)) : fx;
    }
  }

  /* ---- WHAT CAN ACTUALLY BE PASTED (queue 569) --------------------------------------------------
   * Ezra: *"Make sure the past look menu is always working and always representative of what can
   * actually be pasted"*. Both halves of that sentence turned out to be ONE fault, and it was not
   * cosmetic — MEASURED at v12.83 on a text layer copied onto a shape:
   *   · **Effects was offered as enabled AND pre-ticked while the clipboard held ZERO effects.**
   *     Pasting it ran `target.effects = []` and **silently deleted the target's blur and glow.**
   *     That is the "not always working" half: the default state of the dialog destroyed work, and
   *     the toast said "Pasted style" over the top of it.
   *   · **Volume was offered on two layers that have no audio at all.** Nothing to give, nothing to
   *     take, a slot spent saying so.
   * Only `textOnly` was ever checked, so seven of the eight tiles claimed to be pasteable
   * unconditionally. This asks the honest question instead: does the SOURCE carry this aspect, and can
   * the TARGET take it? A tile that answers no is disabled and SAYS WHY on its tooltip — the entry
   * called out that greying a tile "still takes a slot and says nothing about why".
   * ⚠️ Returns a REASON string when unavailable and `null` when fine, so the caller cannot accidentally
   * treat "no reason" as "not allowed" — a plain boolean here inverts silently. */
  function styleBlockedReason(cat, src, target) {
    const has = k => src && src[k] != null;
    switch (cat.key) {
      case 'text':
        // The original rule, kept: text properties are meaningless off a text layer, either end.
        if (src.type !== 'text') return 'The copied layer is not a text layer';
        if (target.type !== 'text') return 'This layer is not a text layer';
        return null;
      case 'color':
        if (!(has('color') || has('fill') || 'fillMode' in src || src.fillImage || src.fillGradient || src.colorGrade)) return 'The copied layer has no colouring to paste';
        return null;
      case 'border':
        if (!(src.stroke || src.shadow)) return 'The copied layer has no outline or shadow';
        return null;
      case 'transform':
        if (!src.transform) return 'The copied layer has no position or scale to paste';
        return null;
      case 'speed':
        if (!('speed' in src || 'frameBlend' in src)) return 'The copied layer has no speed setting';
        return null;
      case 'volume': {
        /* ⚠️ `'volume' in layer` IS NOT THE QUESTION and answering it that way is why this tile was
           always on — every layer carries a default volume, including a rectangle. The question is
           whether there is a SOUND, and FM.hasAudioTrack is the thing that knows. It answers
           true/false/null, and **null means "not probed yet", which the app elsewhere reads as YES** —
           so null must stay enabled here too, or a video whose track has not been sniffed yet would
           have its volume tile greyed out for no reason the user can see. */
        const aud = l => (FM.hasAudioTrack ? FM.hasAudioTrack(l) : (!!l && l.type === 'video'));
        if (aud(src) === false) return 'The copied layer has no sound';
        if (aud(target) === false) return 'This layer has no sound';
        return null;
      }
      case 'effects': {
        const fx = (src.effects || []);
        if (!fx.length) return 'The copied layer has no effects — pasting this would only delete the ones here';
        if (FM.fxRegistry && FM.fxRegistry.supportsLayer && !fx.some(f => FM.fxRegistry.supportsLayer(f.type, target))) {
          return 'None of the copied effects work on this kind of layer';
        }
        return null;
      }
      default: return null;
    }
  }
  FM._styleBlockedReason = styleBlockedReason;   // the suite drives this directly

  // The AM-style picker popup: toggle which style aspects to paste, then Paste.
  FM.openPasteStyle = function (target) {
    document.querySelectorAll('.ps-overlay').forEach(o => o.remove());   // never stack overlays (#10)
    target = target || FM.selectedLayer(FM.scene);
    const src = (FM.clipboard && FM.clipboard[0] && FM.clipboard[0].snapshot) || null;
    if (!target) { if (FM.toast) FM.toast('Select a layer to paste onto'); return; }
    if (!src) { if (FM.toast) FM.toast('Copy a layer first, then Paste look'); return; }
    const overlay = el('div', 'ps-overlay');
    const card = el('div', 'ps-card');
    /* "Paste look" (queue 437) — the overlay's own title has to agree with the menu entry that opens
       it, or the app calls one action two names. Renamed with the menu, not after a bug report. */
    card.appendChild(el('div', 'ps-title', 'Paste look'));
    const grid = el('div', 'ps-grid');
    const sel = {};
    let live = 0;
    STYLE_CATS.forEach(c => {
      const reason = styleBlockedReason(c, src, target);
      const disabled = !!reason;
      sel[c.key] = !disabled;
      if (!disabled) live++;
      const b = el('button', 'ps-cat' + (disabled ? ' dis' : ' on'));
      /* The tooltip is the only place the dialog can explain ITSELF. When the tile is live it names
         the aspect; when it is dead it says why, which is what the entry asked for. */
      b.title = disabled ? (c.label + ' — ' + reason) : c.label;
      b.disabled = disabled;
      // Volume is the one glyph that depends on the layer, and the honest layer to ask is the one
      // being pasted ONTO — the tile describes what this paste will do to the target.
      b.innerHTML = icoMulti(catIco(c.key, target) || '<circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="2"/>');
      /* ⚠️ LABELLED, because the grid it mirrors is labelled (queue 569). His shot put eight UNNAMED
         icon tiles directly above the inspector's eight NAMED cards, and the entry is blunt that the
         mismatch "is most of why it is hard to tell what it offers". textContent, never innerHTML —
         these strings are ours today, but this is the layer-styling path and it must stay safe if a
         category label ever comes from a preset name. */
      const cap = el('span', 'ps-cat-cap');
      cap.textContent = c.label;
      b.appendChild(cap);
      if (!disabled) b.addEventListener('click', () => { sel[c.key] = !sel[c.key]; b.classList.toggle('on', sel[c.key]); });
      grid.appendChild(b);
    });
    card.appendChild(grid);
    /* An all-dead grid is a dialog that cannot do anything, and eight grey squares do not say so.
       This is the honest end of "always representative": if there is nothing to paste, say it. */
    if (!live) card.appendChild(el('div', 'ps-none', 'Nothing on this layer can take anything from the one you copied.'));
    const foot = el('div', 'ps-foot');
    const cancel = el('button', 'ps-cancel', 'Cancel');
    const paste = el('button', 'ps-paste', 'Paste');
    const close = () => overlay.remove();
    cancel.addEventListener('click', close);
    paste.addEventListener('click', () => {
      /* ⚠️ NOT NAMED `live` — that is the tile counter above, and shadowing it here is how a rename
         turns into a silent bug. This is the layer, re-fetched because the dialog can outlive it. */
      const lay = FM.layerById(FM.scene, target.id) || target;
      const chosen = Object.keys(sel).filter(k => sel[k]);
      if (!chosen.length) { close(); if (FM.toast) FM.toast('Nothing was ticked, so nothing was pasted'); return; }
      applyStyle(lay, src, sel);
      close();
      FM.requestRender(); FM.inspector.refresh(); if (FM.timeline) FM.timeline.rebuild(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.history) FM.history.commit();
      /* "Pasted style" fired even when every box was unticked and nothing had happened — the same
         shape of lie as the effects wipe, in the other direction. Name what actually moved. */
      if (FM.toast) FM.toast(chosen.length === 1 ? ('Pasted ' + (STYLE_CATS.find(c => c.key === chosen[0]) || {}).label) : ('Pasted ' + chosen.length + ' style settings'));
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
  /* ---- TEXT TO VOICE (queue 392) -----------------------------------------------------------------
   * The button he drew, and the menu behind it. Everything user-supplied here goes in through
   * textContent — the layer's own words are displayed back to him, and voice names come from the
   * platform, so neither may be interpolated into markup.
   */


  function quickRow(layer) {
    const row = el('div', 'quick-row');
    function qbtn(title, icon, opts, fn) {
      opts = opts || {};
      const b = el('button', 'qr-btn' + (opts.on ? ' on' : '') + (opts.disabled ? ' disabled' : '') + (opts.cls ? ' ' + opts.cls : ''));
      /* `opts.html` is raw inner-SVG for the few icons that cannot be one stroked path — see the
         move/extend pair below, whose whole point is that one is FILLED and one is not. */
      b.title = title;
      b.innerHTML = opts.html
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + opts.html + '</svg>'
        : svgIcon(icon);
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
      /* THE SAME PAIR THE DESKTOP ALREADY FIXED (queue 338). Ezra: *"The two extend icons are too
         similar, you fixed on of now fix on mobile"* — and he is right about the history. Queue 235 was
         this identical complaint about the floating DESKTOP pair (*"at first glance, I cannot tell a
         fucking difference"*), it was solved there, and the phone copy was left on the old drawings. The
         two differed only in whether the box was closed or open at one end: about four pixels of ink at
         this size, on two buttons that sit side by side.
         So the desktop's answer is copied rather than a third pair of glyphs invented — FILL versus
         OUTLINE, the strongest cue available this small, with the arrowheads reinforcing it:
           MOVE   solid block + DOUBLE chevron — the whole clip picks up and travels to the line.
           EXTEND outlined block open at the near edge + a DASHED span + one arrow — that edge is pulled
                  out to the line, and the dashes are the new material.
         Kept identical to js/timeline.js:3025 so the two homes for one action cannot drift apart. */
      const mv = qbtn(right ? 'Move clip right to the playhead' : 'Move clip left to the playhead', '',
        { html: right
          ? '<path d="M3.5 8.5h8.5v7H3.5z" fill="currentColor" stroke="none"/><path d="M14 10l2 2-2 2M17 10l2 2-2 2"/><path d="M21 4.5v15"/>'
          : '<path d="M12 8.5h8.5v7H12z" fill="currentColor" stroke="none"/><path d="M10 10l-2 2 2 2M7 10l-2 2 2 2"/><path d="M3 4.5v15"/>' },
        () => { if (FM.moveClipTo(layer, FM.time)) after(); });
      mv.classList.add('qr-nudge');
      row.appendChild(mv);
      // open-ended box = that edge stretches; closed box above = the whole clip travels
      const ex = qbtn(right ? 'Extend the end of the clip to the playhead' : 'Extend the start of the clip to the playhead', '',
        { html: right
          ? '<path d="M12 8.5H3.5v7H12"/><path d="M12.5 12h6" stroke-dasharray="2 2"/><path d="M17 10l2 2-2 2"/><path d="M21 4.5v15"/>'
          : '<path d="M12 8.5h8.5v7H12"/><path d="M11.5 12h-6" stroke-dasharray="2 2"/><path d="M7 10l-2 2 2 2"/><path d="M3 4.5v15"/>' },
        () => { if (FM.extendClipTo(layer, FM.time)) after(); else if (FM.toast) FM.toast('No more source to extend into', 1500); });
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

    /* ---- clip actions on the whole selection (AM bottom-left) ----
     * PHONE ONLY from v7.74 (queue 169). Ezra: "in the left massive area where its currently got the
     * six small buttons, just get rid of the buttons that are near the play head and then with the
     * align buttons just make them big and fill up the whole section."
     * These three ARE the buttons near the playhead — #tl-trim / #tl-nudge float over the ruler on
     * desktop — and as of v7.74 those act on the whole selection rather than on the primary layer, so
     * removing this copy loses nothing. Wrapped in one element so the LABEL leaves with the buttons;
     * hiding the buttons alone would strand an "Edit 3 clips" heading over an empty gap. The single-
     * clip row next door was already handled this way (.qr-trim / .qr-nudge, styles.css). */
    const acts = el('div', 'align-clipacts');
    acts.appendChild(el('div', 'align-label', 'Edit ' + n + ' clips'));
    const bar = el('div', 'quick-row');
    /* `opts.html` is the same raw inner-SVG hatch qbtn carries, and for the same reason: svgIcon() hard-codes
       fill="none" on a single path, so a FILLED shape cannot be expressed through it — and fill-vs-outline is
       the entire point of the move/extend pair (queue 338). Without this the multi-clip row could only ever
       redraw one outlined box as a slightly different outlined box, which is the complaint. */
    function ab(title, icon, opts, fn) {
      const b = el('button', 'qr-btn' + (opts.danger ? ' qr-danger' : ''));
      b.title = title;
      b.innerHTML = opts.html
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + opts.html + '</svg>'
        : svgIcon(icon);
      if (opts.disabled) b.disabled = true;
      b.addEventListener('click', fn);
      bar.appendChild(b);
    }
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
        /* SAME DRAWINGS AS THE SINGLE-CLIP PAIR (queue 338, finished 22 Aug). v9.86 redrew that pair —
           filled block vs outlined block — and left THIS one carrying the exact art the complaint was
           about: `M4 8h9v8H4z` against `M12 8H4v8h8`, a closed box beside the same box open at one edge.
           js/timeline.js's queue-235 comment names that very pair and measures the difference at "about
           four pixels at 15px", which is his *"couple of pixels of ink"* verbatim. Two fixes for one
           complaint, one of them never applied — found by re-auditing closed requests. */
        '', { html: right
          ? '<path d="M3.5 8.5h8.5v7H3.5z" fill="currentColor" stroke="none"/><path d="M14 10l2 2-2 2M17 10l2 2-2 2"/><path d="M21 4.5v15"/>'
          : '<path d="M20.5 8.5H12v7h8.5z" fill="currentColor" stroke="none"/><path d="M10 10l-2 2 2 2M7 10l-2 2 2 2"/><path d="M3 4.5v15"/>' }, () => {
        const d = groupShift();   // recomputed at press: the panel doesn't rebuild on scrub
        layers.forEach(l => setStart(l, l.start + d));
        done();
      });
      // EXTEND is per-clip: each one's nearest edge reaches the playhead, so clips on either side of it
      // grow toward it from their own direction and they all end up meeting there.
      ab('Extend all ' + n + ' clips to the playhead', '', { html:
        '<path d="M12 8.5H3.5v7H12"/><path d="M12.5 12h6" stroke-dasharray="2 2"/><path d="M17 10l2 2-2 2"/><path d="M21 4.5v15"/>' }, () => {
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
    acts.appendChild(bar);
    wrap.appendChild(acts);

    /* THE GROUPING ROW IS GONE FROM THIS SHEET (queue 436). It shipped here at v10.66 on a measurement
       that said the phone header was full; Ezra's answer was that the header is where he wanted it —
       *"I wanted the ability to group every layer selected in the top right with an icon for the two
       options, not in the bottom menu"* — and the re-measurement agreed there was room (49.5px spare at
       380px with four layers selected). Both buttons live in the top bar now, on both layouts, so this
       row would be a third door to the same two actions rather than the only one. */

    /* ---- timeline alignment (AM bottom-right): time only, never canvas position ----
     * "with the align buttons just make them big and fill up the whole section" — the .align-big class
     * is what styles.css hangs that on, desktop only. It is worth being precise about what "the whole
     * section" is here: with a multi-selection this panel holds NOTHING else. Measured at 1440x900
     * with three clips selected, before this change: 168px of content in a 580px panel, the other
     * 412px empty. That is the "left massive area" in his message. */
    const alg = el('div', 'align-big');
    alg.appendChild(el('div', 'align-label', 'Align on timeline'));
    const tbar = el('div', 'quick-row');
    /* Each one gains a NAME on desktop (`.qr-cap`, hidden by CSS on the phone, where the row stays a
       compact icon strip). Three unlabelled icons in a 36px row can be a toolbar; three of them grown
       to fill half a panel cannot — at that size an icon with no word beside it just looks like an
       unfinished button, and "start together" vs "end together" is exactly the pair a mirrored glyph
       fails to distinguish. The full sentence stays on the title, so nothing is lost. */
    function tb(title, cap, icon, fn, parent) {
      const b = el('button', 'qr-btn'); b.title = title;
      b.innerHTML = svgIcon(icon) + '<span class="qr-cap"></span>';
      b.querySelector('.qr-cap').textContent = cap;   // textContent, never interpolated into the HTML above
      b.addEventListener('click', fn); (parent || tbar).appendChild(b);
    }
    tb('Start together — all clips begin at the same time', 'Start together', 'M5 4v16M9 7h10M9 12h7M9 17h11', () => {
      const s0 = Math.min.apply(null, layers.map(l => l.start));
      layers.forEach(l => setStart(l, s0));
      done();
    });
    /* TWO STAIRCASES, NOT ONE (queue 465). Ezra, with the button scribbled over and a line drawn down
       its middle: *"Split this button into two, one stairs down and one stairs up."*
       The icon `M3 6h6 M9 12h6 M15 18h6` is three strokes descending to the right — stairs going DOWN —
       and the action chains the clips in ROW ORDER, so the top row goes first and each next one starts
       later: the picture and the behaviour already agreed. What was missing is the other direction.
       Up is the same action from the bottom row: the LAST row starts first and the chain climbs. Not a
       reversal of the clips themselves, which would reorder his layers — only of which end the chain
       starts from, so the stack is untouched and just the timings differ.
       Kept as two separate buttons rather than one that toggles: a toggle would have to say which way it
       is currently pointing, and a button whose meaning depends on a state you cannot see is the thing
       the "start together / end together" pair either side of it deliberately avoids. */
    /* The two of them share ONE row on desktop (.align-chainpair), where the others take a row each.
       Not decoration — a measurement: this panel is a 264px band in Studio, so a fourth full-width row
       took every button from 48px down to 34px, thinner than the phone's own 36px strip and the exact
       "make them big" complaint from queue 169 coming back by a different door. Side by side they cost
       one row between them and everything stays 48px. It also happens to say the true thing about them,
       that they are one control split down the middle, which is how he described it.
       `display: contents` on the phone, so the compact icon strip is laid out exactly as before. */
    const chain = el('div', 'align-chainpair');
    tb('One after another, down — the top clip starts first and each next one follows', 'Chain down', 'M3 6h6M9 12h6M15 18h6', () => {
      let t = Math.min.apply(null, layers.map(l => l.start));
      rowOrder.forEach(l => { setStart(l, t); t += l.duration; });
      done();
    }, chain);
    tb('One after another, up — the bottom clip starts first and the chain climbs', 'Chain up', 'M3 18h6M9 12h6M15 6h6', () => {
      let t = Math.min.apply(null, layers.map(l => l.start));
      rowOrder.slice().reverse().forEach(l => { setStart(l, t); t += l.duration; });
      done();
    }, chain);
    tbar.appendChild(chain);
    tb('End together — all clips finish at the same time', 'End together', 'M19 4v16M5 7h10M8 12h7M4 17h11', () => {
      const e0 = Math.max.apply(null, layers.map(l => l.start + l.duration));
      layers.forEach(l => setStart(l, e0 - l.duration));
      done();
    });
    alg.appendChild(tbar);
    wrap.appendChild(alg);
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
    const isText = layer && (layer.type === 'text' || layer.type === 'caption');
    return out
      .filter(c => c.key !== 'cameraopts' || (layer && layer.type === 'camera'))
      .filter(c => c.key !== 'captions' || isText);   // same blacklist trap the camera card fell into
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
    /* shape / text / image DROP Volume entirely (queue 370). Ezra, with a phone shot of a text layer:
       "In the text edit menu just get rid of the volume button so the effects button can fit."
       It used to be included and merely greyed, and he is right that this costs real space: ten cards lay
       out 3+3+3+1, so Effects — the card he uses most — was orphaned alone on a fourth row while a card
       that can NEVER do anything on a silent layer held its place. Nine is a clean 3x3.
       DONE FOR ALL THREE, not just the text layer he photographed: shape and image are equally silent and
       showed the same dead card, and fixing only the type in the screenshot is how this comes back as a
       second report a week later.
       Speed STAYS — it used to be greyed here too, but since v6.39 it re-times the clip and stretches its
       keyframes, so it genuinely works on these (see viewAllowed). Audio and video keep Volume. */
    if (['shape', 'text', 'image'].indexOf(layer.type) >= 0) return CATEGORIES.filter(c => c.key !== 'editgroup' && c.key !== 'volume');
    // …and everything else (group, null, camera) keeps Speed for the same reason, losing only Volume.
    return CATEGORIES.filter(c => c.key !== 'volume' && c.key !== 'editgroup');
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
    /* The third subsection (queue 113). His words: "now I want a third subsection for filters. It'll
       work the same as the others." Its gate is the VISUAL gate — a filter is a group of visual
       effects, so it needs a picture for the same reason Effects does — plus a library to browse. */
    const okFilters = okVisual && !!(FM.filters && FM.filters.all().length);
    // 'Visual', not 'Effects' (queue 220): the CARD is Effects, and these three are what is inside it.
    // "I want all the tabs to be classified as effects, so you go into the effects tab, then you have,
    // visual, filters, and then audio." Effects → Effects was always a bit odd.
    [['visual', 'Visual', okVisual], ['filters', 'Filters', okFilters], ['audio', 'Audio', okAudio]].forEach(([key, label, ok]) => {
      const b = el('button', 'fxmode-btn' + (current === key ? ' on' : '') + (ok ? '' : ' off'), label);
      b.title = ok ? (key === 'audio' ? 'Audio effects for this clip’s sound'
                    : key === 'filters' ? 'Ready-made looks — a group of effects that act as one'
                    : 'Effects for the picture')
        : (key === 'audio' ? 'This layer has no audio'
           : key === 'filters' ? 'This is an audio clip — a filter changes the picture'
           : 'This is an audio clip — it has no picture');
      b.addEventListener('click', () => {
        if (!ok) {
          if (FM.toast) FM.toast(key === 'audio'
            ? (layer && layer.type === 'video' ? 'This clip has no audio track — there’s nothing for an audio effect to work on' : 'This layer has no audio')
            : key === 'filters'
            ? 'This is an audio clip — a filter changes the picture, and there isn’t one'
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
    if (fxTab === 'audio' && audioSideOk(layer)) return 'audio';
    // Filters share the visual gate — a filter is a group of visual effects — so an audio-only clip
    // has already fallen through to 'audio' above, and anything reaching here has a picture.
    if (fxTab === 'filters' && FM.filters && FM.filters.all().length) return 'filters';
    return 'visual';
  }

  // Is `v` a category this layer can actually show? Guards against unreachable views — e.g. the timeline
  // dbl-click calling openCategory('element') on a VIDEO (which rendered a stale duplicate Volume slider
  // that DESTROYED keyframed volume), or a persisted 'volume'/'speed' view after a media replace.
  function viewAllowed(layer, v) {
    if (!layer || v === 'home') return true;
    /* Speed is offered on EVERY layer type since v6.39 (queue 68: "also has to work on every layer
     * type"). It used to be gated to layers with a source, because re-timing a source clock was the
     * only thing it did — which is why queue 38 complained that it was a dead control on a shape.
     * It now also stretches the layer's KEYFRAMES with the clip, and that is meaningful on anything
     * that can be animated, i.e. anything. So the control does something on every type, which is what
     * queue 38 actually asked for; hiding it was the cheap answer to that, not the right one. */
    if (v === 'speed') return true;
    // Text to Voice reads a text layer aloud, so it exists on nothing else (queue 392).
    if (v === 'tts') return layer.type === 'text';
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
      // Speed is live on EVERY type since v6.39 — it re-times the clip AND stretches its keyframes,
      // so there is nothing left for it to be dead on. (It was greyed here when all it could do was
      // re-time a source clock; see viewAllowed.)
      if (volDisabled) card.classList.add('cat-card-disabled');
      // Number badge (1-based) — press that key to open the category (see openCategoryByIndex).
      /* EACH CARD OUT OF STEP WITH THE OTHERS (queue 339 clause 5). Ezra: *"make sure each one is doing
         its own thing so it doesn't look like they're all moving in the same pattern"*.
         Two knobs, and BOTH are needed. A different duration alone still lets two cards drift into step
         and sit there; a different delay alone leaves them all at the same speed, which reads as one
         pattern however offset. The delay is NEGATIVE so every card starts already part-way through its
         cycle — with a positive delay they would all begin at the same frame and only separate later,
         which is precisely the "they all move together" he is describing.
         The multipliers are irrational-ish on purpose (1.37s, 2.9s) so the phases do not re-align on any
         short loop. */
      const hue = CAT_HUES[cat.key] || ['#2fd0b5', '#4FC3FF', '#9B5CFF'];
      card.style.setProperty('--c1', hue[0]);
      card.style.setProperty('--c2', hue[1]);
      card.style.setProperty('--c3', hue[2]);
      card.style.setProperty('--shine-dur', (7.4 + i * 1.37).toFixed(2) + 's');
      // (1 + i), not i: at i=0 the delay is 0s, which is also what a card with `animation: none` reports,
      // so the first card and any disabled one looked identical to anything comparing phases.
      card.style.setProperty('--shine-delay', '-' + ((1 + i) * 2.9).toFixed(2) + 's');
      const gico = catIco(cat.key, layer);
      card.innerHTML = (i < 9 ? '<span class="cat-num">' + (i + 1) + '</span>' : '') +
        '<span class="cat-ico">' + (gico ? icoMulti(gico) : svgIcon(cat.icon)) + '</span>' +
        '<span class="cat-label">' + label + '</span>';
      /* HOLD A CARD TO RESET THAT GROUP (queue 381). Ezra: "Make it so if you hold down on any of the
         layer edit buttons it gives an option to reset that one specific groups values back to how to
         was."
         "Back to how it was" is ambiguous and the entry called it: this is back to the app's DEFAULTS,
         which is what reset means everywhere else — "undo my last few changes" is what undo is for.
         WHICH PROPERTIES BELONG TO A GROUP IS NOT RE-DECLARED HERE. `applyStyle` already knows, category
         by category, and it is exercised by Paste Style on every build; a second table listing the same
         properties would be one more thing to forget when a card gains a field, which is exactly how the
         Paste Style icon grid went stale in queue 127. So a reset is a paste FROM A PRISTINE LAYER of the
         same type — one code path, one place to update.
         Only the categories applyStyle actually handles are offered. Presets is a browser, Edit Points and
         Edit Group are doors to other screens, and Camera options has no defaults of its own — a "reset"
         on any of those would be a dead menu item. */
      const RESETTABLE = { color: 1, border: 1, blend: 1, transform: 1, text: 1, speed: 1, volume: 1, effects: 1 };
      if (RESETTABLE[cat.key] && !volDisabled) {
        let holdT = null;
        const clear = () => { if (holdT) { clearTimeout(holdT); holdT = null; } };
        card.addEventListener('pointerdown', () => {
          clear();
          holdT = setTimeout(() => {
            holdT = null;
            card._heldReset = true;    // swallow the click this hold will produce (queue 331 / 365)
            const r = card.getBoundingClientRect();
            const live = FM.layerById(FM.scene, layer.id) || layer;
            const doReset = () => {
              const fresh = FM.makeLayer(live.type, live.shape ? { shape: live.shape } : {});
              applyStyle(live, fresh, { [cat.key]: true });
              FM.requestRender(); FM.inspector.refresh();
              if (FM.timeline) FM.timeline.rebuild();
              if (FM.canvasEdit) FM.canvasEdit.update();
              if (FM.history) FM.history.commit();   // ONE undo step for the whole group, per the entry
              if (FM.toast) FM.toast('Reset ' + label);
            };
            if (FM.contextMenu) FM.contextMenu.show(Math.max(8, Math.min(r.left, window.innerWidth - 220)), r.bottom + 6, [{ label: 'Reset ' + label, action: doReset }]);
            else doReset();
          }, 480);
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => card.addEventListener(ev, clear));
      }
      card.addEventListener('click', (ev) => {
        if (card._heldReset) { card._heldReset = false; if (ev) { ev.preventDefault(); ev.stopPropagation(); } return; }
        if (volDisabled) { if (FM.toast) FM.toast('This layer has no audio', 1200); return; }   // pressing Volume on a no-audio layer does nothing (Ezra)
        if (cat.key === 'editgroup') { if (FM.enterGroup) FM.enterGroup(layer.id); return; }   // opens the group's own timeline
        // Text: open the focused editor SYNCHRONOUSLY inside this tap — iOS only pops the keyboard
        // when .focus() runs in the gesture's call stack (the refresh() interception's setTimeout won't).
        if (cat.key === 'element' && layer.type === 'text' && FM.textEdit) { FM.textEdit.start(layer.id); return; }
        if (cat.key === 'effects') fxTab = 'visual';   // the card always means the visual stack; the toggle inside is how you reach the audio one
        view = cat.key; kfNavSync(); FM._mtAxis = 'xy'; FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._opaEasing = null; FM._fxEasing = null; FM._cropEasing = false; FM.inspector.refresh();
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
  /* Speed bounds (queue 184 part 2). His words: "it seems alight motion lets you speed up and slow
   * down unlimitedly, you can have something 1000x speed for example." It was 0.25×–4× — which is
   * why he hit it. Now 0.01×–1000×.
   *
   * Widening it does NOT ruin the control, because the speed row is a scrub ruler plus a typed box,
   * not a fixed-width slider: the ruler still moves 5% per step so ordinary speeds feel exactly as
   * they did, and 1000× is reached by typing in the box — "the ruler is for feel, the box is for
   * precision", which is rangeRow's own rule rather than a new one invented here. A linear slider
   * across this range would have put 1× a pixel from the left end and made every normal speed
   * unreachable, which is the trap this shape avoids.
   *
   * Worth knowing at the extremes: a <video> element's playbackRate is capped by the BROWSER (we ask
   * for at most 16×), so live preview playback of a 900× clip cannot keep up. Rendering and export
   * seek per frame and are unaffected — the picture is right, it is only the live element that
   * cannot run that fast. */
  const SPD_MIN = 0.01, SPD_MAX = 1000;

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
  // Suite seam: the easing editor keeps its OWN copy of this table (MODE_PROPS in graph-editor.js),
  // and the two silently disagreeing about Rotate is what left 3D tilts un-eased. Exposed so a test can
  // hold them equal rather than restating either list a third time.
  FM._mtProps = MT_PROPS;
  // The channels a mode keyframes by DEFAULT (matches Alight Motion). The extra channels (z for Move,
  // scaleX/scaleY for Scale) are only keyframed when they're actually in use — otherwise a plain
  // position/scale keyframe would needlessly animate Z / break uniform scale into non-uniform. (#17)
  const MT_PRIMARY = { move: ['x', 'y'], rotate: ['rotation'], scale: ['scale'], skew: ['skewX', 'skewY'], anchor: [] };
  /* WHETHER A NON-DEFAULT BUT STILL *STATIC* CHANNEL GETS SWEPT INTO A KEYFRAME (queue 419).
   * For Move and Scale it must: x/y are two halves of one position, and scale/scaleX/scaleY are one
   * size — keying `scale` while leaving a 1.5 scaleX unkeyed would let a later keyframe change the
   * aspect on its own. They are components of one thing, so they travel together.
   * ROTATION IS NOT LIKE THAT. Rotation, X tilt and Y tilt are three independent axes that happen to
   * share a panel. Sweeping a static 20-degree tilt into a spin keyframe is what Ezra reported:
   * *"The key frames for these three things are all interacting with each other and causing issues,
   * make em independent"*. Measured before this: keyframing rotation on a layer with a static X tilt
   * left BOTH animated. Nothing is lost by leaving it out — an unkeyed static tilt simply stays at 20
   * degrees throughout, which is what it did before anyone pressed the diamond. */
  const MT_SWEEP_STATIC = { move: 1, scale: 1, skew: 1, rotate: 0, anchor: 0 };
  const MT_DEF = { x: 0, y: 0, z: 0, rotation: 0, rotationX: 0, rotationY: 0, scale: 1, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, anchorX: 0.5, anchorY: 0.5 };

  /* THE MAGNET GOVERNS EVERY SNAP IN THIS SECTION (queue 620). Ezra: *"When you turn off the magnet
   * button it should stop snapping for when you're moving clips on the canvas too, like in the
   * position / scale section."*
   * ⚠️ WORTH KNOWING BEFORE CHANGING ANYTHING: the CANVAS DRAG DOES NOT SNAP, and that is his doing —
   * *"the canvas has snapping when you touch to drag stuff, while the touch pad thing to move stuff
   * does not, it should be the other way around."* So "moving clips on the canvas" means moving them
   * through THESE controls, which is where the snapping was deliberately moved to. Nothing on the
   * canvas needed changing; four things here did.
   * One switch, four sites: the X/Y setter, the trackpad, the rotation notches and the anchor pad. A
   * magnet that silences three of four would be worse than one that silences none, because you could
   * not predict which. */
  function magnetOn() { return !(FM.timeline && FM.timeline.isSnapping) || FM.timeline.isSnapping(); }
  /* Seam, same idiom as FM._fxDeadHereWhy and FM._tilesLastBB: the four snap sites are spread across
     600 lines and none of them is reachable from outside, so without this the only way to test the
     magnet would be to drive four separate gestures — and a test that hard is a test that gets
     written once and never maintained. */
  FM._magnetOn = magnetOn;
  function mtEval(layer, key) { const p = layer.transform[key]; return p == null ? MT_DEF[key] : FM.evalProp(p, FM.time); }
  function mtSet(layer, key, v) { FM.setTransform(layer, key, v, FM.time); FM.requestRender(); if (FM.timeline) FM.timeline.updatePlayhead(); }
  // X/Y setter that SNAPS to the shared align targets (centre / edges / this layer's keyframe
  // positions) so Move & Transform keeps things aligned just like canvas dragging, and flashes the
  // matching guide line on the canvas so you can see the snap. (Ezra)
  function mtSetXY(layer, key, v, typed) {
    if (typed) { mtSet(layer, key, v); return; }   // a TYPED value is exact — snapping/rounding silently rewrote it (545 became 540)
    let target = null;
    if (FM.snapAxis && magnetOn()) { const s = FM.snapAxis(layer, key, v, 8); v = s.v; if (s.hit) target = s.target; }
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
    const clamp = mkClamp(opts.min, opts.max);
    let drag = null;
    // Dragging the number is a scrub too, so it flicks like every other one. It accumulates the
    // gesture rather than re-reading what it wrote — see scrubGesture for why the old way froze X/Y
    // on every snap target and made Samples immovable.
    const gest = scrubGesture(getVal, setVal, clamp);
    const applyDx = (dx) => {
      const alive = gest.apply(dx * (opts.scrub || 1));
      refresh(); if (opts.onScrub) opts.onScrub();
      return alive;
    };
    const glide = attachGlide(val, applyDx, () => { gest.end(); commitH(); FM.inspector.refresh(); });
    val.addEventListener('pointerdown', e => { if (val.isContentEditable) { glide.cancelDrag(); return; } drag = { x: e.clientX, moved: false }; gest.begin(); try { val.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
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
      /* SWITCHING AXIS AND TYPING ARE THE SAME TAP NOW (queue 414). Ezra: "The buttons that show a number
         for the position should be able to be tapped on and customised, so you can type exactly the number
         you want."
         Tap-to-type already existed on these boxes — but the X / Y / Z ones carry an `axis`, and this
         branch RETURNED after switching it, so on the position readouts a tap never reached the editor.
         "The buttons that show a number for the position" is precisely the set that had it swallowed.
         The refresh is dropped rather than moved: it rebuilds the card, which would destroy the very
         element startEdit is about to focus. The axis highlight is therefore a beat stale while you type,
         and corrects itself the moment you finish — `finish()` already calls refresh(). A stale highlight
         for the length of one edit is a much smaller thing than a control you cannot type into. */
      if (opts.axis) FM._mtAxis = opts.axis;
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
  // `lim` are the setter's OWN limits, restated so the gesture stops accumulating where the value
  // stops moving. Without them a drag far past an end banks travel that has to be un-dragged first.
  function mtScrub(getVal, setVal, scrub, onChange, lim) {
    const strip = el('div', 'mt-scrub'); strip.appendChild(el('div', 'mt-scrub-ticks')); strip.appendChild(el('div', 'mt-scrub-mid'));
    let drag = null, offset = 0;
    // Both background layers (coarse + fine ruling) scroll together. Only the X longhand is set, so
    // the shorthand's `center` Y survives; repeat-x means the offset can grow forever without a seam.
    const paint = () => { strip.style.backgroundPositionX = offset + 'px, ' + offset + 'px'; };
    // Apply dx SCREEN pixels of scrub. Returns false when the value refused to move (clamped at its
    // end) so the glide can die there instead of spinning against a wall.
    const gest = scrubGesture(getVal, setVal, lim ? mkClamp(lim.min, lim.max) : null);
    const applyDx = (dx) => {
      const alive = gest.apply(dx * scrub);
      /* THE STRIP STOPS WHEN THE VALUE DOES (queue 347). Ezra: *"Make it so the sliders here and
         everywhere actually stop when you reach the limit, currently it keeps letting you swipe"*.
         `offset` advanced unconditionally, so at a hard limit the value pinned correctly and the ticks
         under your finger kept sliding — which reads as "still responding" while nothing changes.
         `gest.apply` already returns false for exactly this case; nothing was listening. One line, and
         it fixes every scrubber at once because they all share this one. */
      if (alive) { offset += dx; paint(); }
      if (onChange) onChange();
      return alive;
    };
    // Same momentum as every other scrubber — one implementation, so they cannot drift apart in feel.
    const glide = attachGlide(strip, applyDx, () => { gest.end(); commitH(); if (onChange) onChange(); });
    strip.addEventListener('pointerdown', e => {
      drag = { x: e.clientX }; gest.begin();
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
  /* RESET AND CROP TO CANVAS WRITE THE RECT PER FIELD, like the scrubbers (queue 719, hunt HIGH #2). They did
     `layer.crop = {…}` — a whole-object replace — so a keyframed crop (the hint under the buttons says "Crop is
     keyframed") lost every keyframe on x, y, w and h in one tap, silently, with only undo to bring them back.
     Through FM.setProp a plain field is set and a keyframed one gets a key at the playhead: exactly what
     dragging the width scrubber does, so the two buttons and the scrubbers are one behaviour again. */
  function writeCropRect(layer, r) {
    if (!ensureCrop(layer)) { layer.crop = { x: r.x, y: r.y, w: r.w, h: r.h }; return; }
    ['x', 'y', 'w', 'h'].forEach(k => FM.setProp(layer.crop, k, r[k], FM.time));
  }

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
    /* THE EASING BUTTON EXPLAINS ITSELF INSTEAD OF LATCHING A FLAG NOTHING CAN HONOUR.
     * This panel deliberately does not stamp a crop onto the layer just to display one, so layer.crop
     * is undefined until you keyframe or resize. The sub-view that draws the easing graph is gated on
     * layer.crop existing — but the click set FM._cropEasing unconditionally, and nothing cleared it.
     * So the first tap was silently dead, the flag stayed true, and the NEXT refresh that happened
     * once a crop existed swapped the panel out: you pressed the keyframe diamond and the crop editor
     * you were working in vanished into an easing graph you never asked for. Same jump after dragging
     * Width or Height, which also creates the crop and refreshes.
     * Dimmed-and-explains-itself is the convention already used by the motion-path button a few
     * hundred lines down, for the same "not ready yet" reason. */
    const cropReady = !!layer.crop;
    const easeBtn = el('button', 'mt-ease' + (cropReady ? '' : ' mt-dim')); easeBtn.innerHTML = MT_ICONS.ease;
    easeBtn.title = cropReady ? 'Easing curve' : 'Keyframe the crop first (tap ◆), then shape its easing here';
    if (!cropReady) easeBtn.style.opacity = '0.38';
    easeBtn.addEventListener('click', () => {
      if (!layer.crop) { if (FM.toast) FM.toast('Keyframe the crop first (tap ◆), then shape its easing here', 2400); return; }
      FM._cropEasing = true; FM.inspector.refresh();
    });
    left.appendChild(easeBtn);
    row.appendChild(left);

    // center — Width / Height crop boxes (source px)
    const cur = () => FM.cropOf(layer, FM.time);
    const getW = () => Math.round(cur().w), getH = () => Math.round(cur().h);
    let boxW, boxH;
    const syncAll = () => { if (boxW) boxW._refresh(); if (boxH) boxH._refresh(); FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); };
    /* The locked ratio is captured ONCE and held for the whole drag. It used to be re-derived from the
     * CURRENT crop on every call — `c.h / c.w` — while the same call wrote back an integer-rounded
     * height, so each step's rounding became the next step's ratio and the error compounded across
     * the hundreds of pointermove events in one gesture. Measured on a 1920x1080 source: a slow drag
     * from Width 1920 down to 1016 produced h=508 instead of 572, i.e. 16:9 had decayed to 2:1; and
     * dragging to the minimum and back up produced a 901x901 SQUARE, because once the height bottoms
     * out on the Math.max(1, …) floor while the width is still large, the derived ratio collapses to
     * 1:1 and never recovers. The lock button went on saying the ratio was held throughout.
     *
     * `lockR` lives in this panel-builder scope, which is rebuilt on every FM.inspector.refresh() —
     * and a scrub release refreshes. So its lifetime IS the gesture, with no new plumbing, and
     * toggling the lock (which also refreshes) re-derives it, which is what you want after resizing
     * freely. A clamped step no longer poisons the next one: nw is re-derived from the fixed ratio,
     * so dragging back up restores the shape instead of keeping the square. */
    let lockR = null;
    function resizeCrop(axis, V) {
      ensureCrop(layer);
      const c = cur(); let nw = c.w, nh = c.h;
      if (lockR == null) lockR = (c.w > 0 && c.h > 0) ? (c.h / c.w) : (MW > 0 ? MH / MW : 1);
      if (axis === 'w') { nw = Math.max(1, Math.min(MW, Math.round(V))); if (_szLock) nh = Math.max(1, Math.min(MH, Math.round(nw * lockR))); }
      else { nh = Math.max(1, Math.min(MH, Math.round(V))); if (_szLock) nw = Math.max(1, Math.min(MW, Math.round(nh / lockR))); }
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

    /* Width and Height get their own scrub strips, exactly like Move & Transform's Size — the two
     * number boxes on their own gave you no way to ease a crop in, only to type at it. (#67)
     * Aspect LOCKED is one strip (both edges move together, which is what the lock means); Resize
     * Freely opens a second strip below it so the two axes are independent — the same shape the
     * unlinked Size control already uses, so the gesture is learned once.
     * Rate is derived from the SOURCE size, not fixed: a crop is measured in source pixels, so a
     * constant px-per-finger-px would crawl on a 4K frame and bolt on a small one. */
    const control = el('div', 'mt-control');
    const rateW = Math.max(0.25, MW / 1400), rateH = Math.max(0.25, MH / 1400);
    if (_szLock) {
      control.appendChild(mtScrub(getW, v => resizeCrop('w', v), rateW, syncAll, { min: 1, max: MW }));
    } else {
      control.classList.add('mt-control-dual');
      control.appendChild(mtScrub(getW, v => resizeCrop('w', v), rateW, syncAll, { min: 1, max: MW }));
      control.appendChild(mtScrub(getH, v => resizeCrop('h', v), rateH, syncAll, { min: 1, max: MH }));
    }
    center.appendChild(control);

    // Free crop (not in AM) — drag a box right on the playback area, iPhone-style.
    const tools = el('div', 'es-crop-tools');
    const freeBtn = el('button', 'btn es-freecrop'); freeBtn.innerHTML = ES_ICONS.crop + '<span>Free crop</span>';
    freeBtn.title = 'Drag a crop box directly on the video';
    freeBtn.addEventListener('click', () => { if (FM.cropTool) FM.cropTool.start(layer.id); });
    tools.appendChild(freeBtn);
    /* ⚠️ CROP TO CANVAS (queue 580). Ezra: *"Add an option to the customise shape menu similar to the
       free crop button but an option to crop to canvas size."* He named the surface, the neighbour and
       the behaviour, so this sits beside Free crop and does the one thing.
       **"Canvas size" is the project's SHAPE, not its pixel count.** A 1080x1920 project and a 1920x1080
       clip do not share a single dimension, so copying width and height literally would be meaningless —
       what he wants is the clip cropped so it fills the canvas without bars. So: the LARGEST rect with
       the project's aspect ratio that still fits inside the source, centred.
       ⚠️ **It writes the same `layer.crop` source-pixel rect the free tool writes** — one representation,
       so Reset, the scrubbers and the crop overlay all keep working with no second code path.
       ⚠️ **Centred, and it never invents pixels:** the rect is clamped inside the source either way round
       (portrait-in-landscape takes the full height, landscape-in-portrait the full width), so it can only
       ever remove picture, never stretch it. */
    const canvasBtn = el('button', 'btn es-cropcanvas');
    canvasBtn.innerHTML = ES_ICONS.crop + '<span>Crop to canvas</span>';
    canvasBtn.title = 'Crop to the project’s shape, centred — so the layer fills the canvas with no bars';
    canvasBtn.addEventListener('click', () => {
      const P = FM.scene && FM.scene.project;
      writeCropRect(layer, FM.cropToCanvasRect(MW, MH, P && P.width, P && P.height));   // queue 719: per field — a keyframed crop keeps its keyframes
      FM.requestRender();
      if (FM.canvasEdit) FM.canvasEdit.update();
      FM.inspector.refresh();
      commitH();
    });
    tools.appendChild(canvasBtn);
    const cr0 = cur();
    if (!(cr0.w >= MW - 0.5 && cr0.h >= MH - 0.5)) {   // show Reset only when actually cropped
      const resetBtn = el('button', 'btn es-cropreset', 'Reset');
      resetBtn.title = 'Show the whole frame again';
      resetBtn.addEventListener('click', () => { writeCropRect(layer, { x: 0, y: 0, w: MW, h: MH }); FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); FM.inspector.refresh(); commitH(); });
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
  /* Keyframe a shape's POINT SET (queue 254 — "edit points has literally no keyframe functionality").
   * Deliberately the same shape as toggleMaskPathKf above, because it is the same problem: the value
   * is a whole path, not a number, so FM.toggleProp/evalProp would NaN it. Seeds through
   * FM.evalShapeSubs so pressing ◆ between keys captures the shape you can SEE.
   * A keyframe holds the WHOLE point set rather than one vertex — a per-point track would need stable
   * identity for every vertex across every key, and inserting a point mid-path silently renumbers
   * everything after it. Removing the last keyframe reverts to a plain static array. */
  function cloneSubs(s) { return (Array.isArray(s) ? s : []).map(pl => (Array.isArray(pl) ? pl : []).map(p => Array.isArray(p) ? p.slice() : p)); }
  function toggleShapeSubsKf(layer, t) {
    const cur = cloneSubs(FM.evalShapeSubs ? FM.evalShapeSubs(layer, t) : []);
    const p = layer.subs;
    if (!p || Array.isArray(p)) {
      if (!cur.length) { if (FM.toast) FM.toast('This shape has no points to animate'); return; }
      layer.subs = { kf: [{ t: t, v: cur, e: 'linear' }] };
      layer.points = null;              // subs win in traceShapePath; don't leave a stale single path
      return;
    }
    if (!Array.isArray(p.kf)) return;
    const hit = p.kf.find(k => Math.abs(k.t - t) < 1e-3);
    if (hit) { p.kf = p.kf.filter(k => k !== hit); if (!p.kf.length) layer.subs = cloneSubs(hit.v); return; }
    p.kf.push({ t: t, v: cur, e: 'linear' }); p.kf.sort((a, b) => a.t - b.t);
  }

  function editPointsTools(layer, body) {
    const pe = FM.pointEdit;
    const panel = el('div', 'mt-panel pep-panel');

    // left rail — keyframe the point set, then curve / corner / delete for the selected point
    const left = el('div', 'mt-rail mt-rail-left');
    const subsAnim = !!(FM.isAnimated && FM.isAnimated(layer.subs));
    const subsHere = subsAnim && FM.hasKeyframeAt(layer.subs, FM.time);
    const kfBtn = el('button', 'mt-kf' + (subsAnim ? ' active' : '') + (subsHere ? ' here' : ''), '◆');
    kfBtn.title = subsHere ? 'Remove the point keyframe at the playhead'
      : subsAnim ? 'Keyframe these points at the playhead'
      : 'Animate the points — adds a keyframe at the playhead';
    kfBtn.addEventListener('click', () => {
      toggleShapeSubsKf(layer, FM.time);
      commitH(); FM.requestRender(); FM.inspector.refresh();
      if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
    });
    left.appendChild(kfBtn);
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
      center.appendChild(rangeRow('Line width', () => FM.evalProp(stk.width, FM.time),
        v => { FM.setProp(stk, 'width', Math.max(1, v), FM.time); }, 1, 60, 1));   /* keyframe-safe — see the note in the Edit Shape panel */
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
    /* THE DIAMOND FOLLOWS THE SELECTED ROW (queue 419). Ezra, with all three rotate readouts circled:
     * *"The key frames for these three things are all interacting with each other and causing issues,
     * make em independent"*.
     * The three ARE separate properties — `rotation`, `rotationX`, `rotationY` — and each number box
     * already writes only its own. What was shared is this BUTTON: it keys `MT_PROPS[mode]`, so in
     * rotate mode one press touched all three. Adding also swept in any tilt merely sitting at a
     * non-default angle, so keyframing a spin quietly made a static tilt animated; removing hit all
     * three unconditionally, so clearing a rotation key took a tilt key with it.
     * The machinery to say WHICH one was already here and simply unread: tapping a row's label selects
     * that property (`kfSel`, "tap to pick which property's keyframes you are editing"). So the diamond
     * now honours it — with a row selected it keys that row alone, and the button's own lit state
     * follows the same scope so it cannot claim a keyframe that belongs to a different channel.
     * Deliberately ADDITIVE: with nothing selected every mode behaves exactly as before, so a plain
     * position keyframe still keys x and y together, which is right and is what AM does. */
    const _selK = (kfSel && kfSel.layerId === layer.id && /^tf:/.test(kfSel.key || '')) ? kfSel.key.slice(3) : null;
    const scoped = (_selK && props.indexOf(_selK) >= 0) ? [_selK] : null;
    const stateProps = scoped || props;
    const anyAnim = stateProps.some(k => FM.isAnimated(layer.transform[k]));
    /* The lit state and the title follow the SAME judgement as the click (queue 419). Before this the
       diamond titled itself "Remove keyframe at playhead" on the strength of a tilt key while rotation
       had none — the button announced the wrong action before you touched it. */
    const litProps = (function () {
      const p = stateProps.filter(k => MT_PRIMARY[mode] && MT_PRIMARY[mode].indexOf(k) >= 0);
      return p.length ? p : stateProps;
    })();
    const onHere = litProps.some(k => FM.hasKeyframeAt(layer.transform[k], FM.time));
    const kfBtn = el('button', 'mt-kf' + (anyAnim ? ' active' : '') + (onHere ? ' here' : ''), '◆');
    kfBtn.title = onHere ? 'Remove keyframe at playhead' : 'Add a keyframe at the playhead';
    kfBtn.addEventListener('click', () => {
      // recompute at CLICK time — the build-time value goes stale the moment the playhead scrubs
      // (the panel isn't rebuilt on scrub), which made the diamond silently no-op or delete
      // Re-read the selection at CLICK time for the same reason the value is re-read: the panel is not
      // rebuilt when the row selection changes underneath a held panel.
      const selK = (kfSel && kfSel.layerId === layer.id && /^tf:/.test(kfSel.key || '')) ? kfSel.key.slice(3) : null;
      const only = (selK && props.indexOf(selK) >= 0) ? [selK] : null;
      /* WHAT THE BUTTON IS *ABOUT* DECIDES ADD-vs-REMOVE — not every channel in the panel (queue 419,
         finished 22 Aug). `judge` was the whole of MT_PROPS[mode], so a keyframe on a channel this
         button is not for could flip it into REMOVE. Measured, and it destroys work: with rotationX
         animated 20→60, `rotation` static and the playhead on the tilt's first key, one press deleted
         that key — the tilt collapsed to 60 everywhere and the animation was gone — while `rotation`,
         the thing the button is for, was never keyed at all. A second press then re-keyed the tilt flat.
         That is verbatim the half this entry ticked (*"clearing a spin key took the tilt's"*), and the
         v11.33 POLISH-LOG told him it was fixed — true only when a ROW is selected, which it is not by
         default (`kfSel` is null and every panel or mode change clears it).
         Judged on the PRIMARY channels, the button says Add when rotation has no key there, and adds —
         which is what it looks like it will do. What it ACTS on is unchanged: the add path still sweeps
         in any already-animated channel so rotation and a moving tilt stay in step, and remove still
         reaches every channel so a stray key can always be cleaned up. */
      const primary = props.filter(k => MT_PRIMARY[mode].indexOf(k) >= 0);
      const judge = only || (primary.length ? primary : props);
      const add = !judge.some(k => FM.hasKeyframeAt(layer.transform[k], FM.time));
      // Add: only the mode's primary channels + any extra channel already in use (animated or
      // moved off its default). Remove: every channel, so stray keyframes can always be cleaned up.
      const usable = only ? only : (add
        ? props.filter(k => MT_PRIMARY[mode].indexOf(k) >= 0 || FM.isAnimated(layer.transform[k])
                            || (MT_SWEEP_STATIC[mode] && layer.transform[k] != null && layer.transform[k] !== MT_DEF[k]))
        : props);
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
        if (!magnetOn()) return null;   // magnet off → nothing is ever caught; the caller already handles null
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
      /* 45° DETENTS (queue 99). Ezra: "the spin tool should have snapping every 45 degrees."
       *
       * The snap is on the DIAL ONLY, and that is the point rather than a shortcut: it is the same
       * split he asked for on the trackpad (queue 15 — "trackpad snaps, canvas drag is free"). A
       * tolerance snap necessarily makes the angles inside the tolerance unreachable, so 41° cannot be
       * dragged on this ring — but the Rotation number box beside it is a free scrubber and types
       * exact values, so nothing becomes impossible, it just moves to the control that is good at it.
       * The dial is the coarse, fast instrument; the box is the precise one.
       *
       * The angle is accumulated RAW and only snapped on the way out, never written back into rd.acc.
       * Snapping the accumulator would make the drag creep: each move would start from the snapped
       * value, so eight notches of travel would land you somewhere other than 360°. */
      const SNAP_DEG = 45, snapTol = () => (magnetOn() ? 7 : 0);   // magnet off → tolerance 0, so nothing holds (queue 620) — read LIVE (queue 736): the timeline's magnet toggle never refreshes this panel, so a build-time read held the old answer for the rest of the session
      let lastNotch = null;
      ring.addEventListener('pointermove', e => {
        if (!rd) return;
        if (e.pointerType === 'mouse' && e.buttons === 0) { rd = null; commitH(); return; }
        const a = ang(e); let d = a - rd.a; d -= 360 * Math.round(d / 360); rd.acc += d; rd.a = a;
        const raw = rd.v + rd.acc;
        const notch = Math.round(raw / SNAP_DEG) * SNAP_DEG;
        const held = Math.abs(raw - notch) <= snapTol();
        if (held && notch !== lastNotch) {   // one tick per notch ENTERED, not per frame while inside it
          lastNotch = notch;
          if (navigator.vibrate) { try { navigator.vibrate(9); } catch (_) {} }
        } else if (!held) lastNotch = null;
        ring.classList.toggle('snapped', held);
        mtSet(layer, 'rotation', held ? notch : Math.round(raw));
        place(); brot._refresh(); if (FM.canvasEdit) FM.canvasEdit.update();
      });
      ring.addEventListener('pointerup', e => { if (!rd) return; rd = null; lastNotch = null; ring.classList.remove('snapped'); try { ring.releasePointerCapture(e.pointerId); } catch (_) {} commitH(); });
      ring.addEventListener('pointercancel', e => { if (!rd) return; rd = null; lastNotch = null; ring.classList.remove('snapped'); try { ring.releasePointerCapture(e.pointerId); } catch (_) {} commitH(); });
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
        control.appendChild(mtScrub(() => mtEval(layer, 'scale'), v => mtSet(layer, 'scale', Math.max(0.01, v)), 0.004, () => { refreshAllBoxes(); if (FM.canvasEdit) FM.canvasEdit.update(); }, { min: 0.01 }));
      } else {
        // UNLINKED: a SECOND strip appears below the first, and the two drive width and height
        // separately (Ezra: "in alight motion it opens up a second slider below the first one and the
        // two sliders will separately effect the width and height"). Before this, unlinking only
        // changed what the two number boxes wrote — the single slider still moved both axes together,
        // which is the "confusing and janky" part. Both strips work in EFFECTIVE factor units so
        // mtScrub's gesture accumulates in the same units it writes.
        control.classList.add('mt-control-dual');
        const base = () => Math.max(1e-4, mtEval(layer, 'scale'));
        control.appendChild(mtScrub(effX, v => mtSet(layer, 'scaleX', Math.max(0.01, v) / base()), 0.004,
          () => { bw._refresh(); if (FM.canvasEdit) FM.canvasEdit.update(); }, { min: 0.01 }));
        control.appendChild(mtScrub(effY, v => mtSet(layer, 'scaleY', Math.max(0.01, v) / base()), 0.004,
          () => { bh._refresh(); if (FM.canvasEdit) FM.canvasEdit.update(); }, { min: 0.01 }));
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
      /* ⚠️ THE BOX THE RENDERER ACTUALLY PIVOTS AROUND — not the layer's size (queue 628).
       * Ezra: *"Moving the anchor shouldn't be moving the position of a bunch of clips in a group."*
       * MEASURED (tests/_628pivot.html): moving a group's anchor with NO compensation moves its content
       * **0.0px** — `applyLayerTransform` translates to (x,y) and rotates/scales about that point and
       * never reads anchorX/anchorY, and a group has no content box of its own. **The anchor is inert
       * for a group, so the compensation was the only thing moving anything.**
       * It was also compensating by the wrong amount even in principle: `FM.layerSize` has no group
       * branch, so a group falls through to the `{w:100,h:100}` media fallback — measured 100×100 for a
       * group whose real bounds are **900×300**, a 25px shift where 225px would have been needed.
       * ⚠️ WHEN #630 MAKES THE ANCHOR REAL FOR GROUPS, THIS MUST COME BACK — and with `FM.groupBounds`,
       * not `layerSize`. That is why this is a named question about the RENDERER rather than a
       * `type === 'group'` special case buried in the maths. */
      const asz = FM.anchorPivotBox(layer);
      /* ⚠️ A GROUP COMPENSATES BY A DIFFERENT LAW, and getting this wrong re-broke #628 for one run.
       * A normal layer draws its content offset by −size·anchor, so moving the pivot displaces it by
       * R·S·δ and the correction is exactly that, which is what the code below computes.
       * A GROUP has no content of its own: since #630 its children sit at `gx + P + R·S·(L − P)`, so
       * moving the pivot by δ displaces them by **(1 − R·S)·δ** — which is ZERO at scale 1 with no
       * rotation, because the pivot sandwich collapses to the identity. Compensating a group the normal
       * way shifted it by the full 225px when nothing had moved at all (measured: 46.4 preview px).
       * So the correction is (R·S − 1)·δ, and it is applied below by adjusting the factor rather than
       * the direction — see `pivotLaw`. */
      const isGroupPivot = layer.type === 'group';
      const aEffX = () => mtEval(layer, 'scale') * (layer.transform.scaleX != null ? mtEval(layer, 'scaleX') : 1);
      const aEffY = () => mtEval(layer, 'scale') * (layer.transform.scaleY != null ? mtEval(layer, 'scaleY') : 1);
      const getA = k => { const v = layer.transform[k]; return typeof v === 'number' ? v : (FM.evalProp(v, FM.time) != null ? FM.evalProp(v, FM.time) : 0.5); };
      const setAnchor = (ax, ay) => {
        const oldX = getA('anchorX'), oldY = getA('anchorY');
        /* THE BOXES' RANGE, NOT 0..1 (queue 723, hunt HIGH #6). Queue 345 (v9.93) widened the Anchor boxes to −400…500%
           so the pivot could sit outside the layer, and the note there says the anchor is no longer trapped — but every
           route (boxes, pad, Centre) came through this clamp, which still pinned it to 0…1: type 150% and the readout
           snapped back to 100%. The clamp now matches the boxes. */
        const nx = Math.max(-4, Math.min(5, ax)), ny = Math.max(-4, Math.min(5, ay));
        layer.transform.anchorX = Math.round(nx * 1000) / 1000;
        layer.transform.anchorY = Math.round(ny * 1000) / 1000;
        // Keep it visually still. The anchor moved (nx-oldX) of the layer's SCALED width — but that
        // displacement is in the LAYER's own space, and the layer is drawn translate → rotate →
        // scale, so it has to be rotated into the parent frame before it can be added to x/y.
        // Without this a rotated layer jumped the moment you touched its pivot.
        /* δ is the pivot's travel in the layer's own space. For a normal layer it is already scaled,
           because the content offset is −size·anchor·scale. For a GROUP it must stay UNSCALED: the
           children live in the group's child space and the scale is applied on top of the pivot, which
           is the whole reason the law below differs. */
        let dx = (nx - oldX) * asz.w * (isGroupPivot ? 1 : aEffX());
        let dy = (ny - oldY) * asz.h * (isGroupPivot ? 1 : aEffY());
        const rot = (mtEval(layer, 'rotation') || 0) * Math.PI / 180;
        if (isGroupPivot) {
          // (R·S − 1)·δ : zero when the group is unrotated and unscaled, which is exactly when moving
          // its pivot changes nothing on screen.
          const sx = aEffX(), sy = aEffY();
          const c = Math.cos(rot), sn = Math.sin(rot);
          const rx = (dx * sx) * c - (dy * sy) * sn;
          const ry = (dx * sx) * sn + (dy * sy) * c;
          dx = rx - dx; dy = ry - dy;
        } else if (rot) { const c = Math.cos(rot), s = Math.sin(rot); const rx = dx * c - dy * s; dy = dx * s + dy * c; dx = rx; }
        // shiftTransform, not mtSet: on a layer with ANIMATED position, setTransform would upsert a
        // keyframe at the playhead — moving the pivot would silently add a keyframe and bend the
        // existing animation. shiftTransform moves the whole curve, which is what a pivot change means.
        FM.shiftTransform(layer, 'x', Math.round(mtEval(layer, 'x') + dx), FM.time);
        FM.shiftTransform(layer, 'y', Math.round(mtEval(layer, 'y') + dy), FM.time);
        FM.requestRender();
      };
      /* THE ANCHOR IS NOT TRAPPED IN THE LAYER (queue 345). Ezra: *"The anchor currently has a limit on
         where you can place it but you should be able to put it anywhere"*. It was clamped to 0-100% of
         the layer's own box, so you could never put a pivot OUTSIDE the thing being pivoted — which is
         the case people actually reach for (a door hinging off its frame, an arm swinging from a
         shoulder). Checked before widening, per the entry's own warning: the compositor never clamped
         it — `anchorX(tr)` only defaults a missing value and passes anything finite through — so this
         was purely these two boxes. */
      FM.inspector._setAnchor = setAnchor;   // suite seam (queue 723): the closure the boxes, the pad and Centre all go through
      const bax = mtVBox('Anchor X', () => getA('anchorX') * 100, v => setAnchor(v / 100, getA('anchorY')), { dp: 1, unit: '%', scrub: 0.3, min: -400, max: 500, onScrub: () => { if (FM.canvasEdit) FM.canvasEdit.update(); } });
      const bay = mtVBox('Anchor Y', () => getA('anchorY') * 100, v => setAnchor(getA('anchorX'), v / 100), { dp: 1, unit: '%', scrub: 0.3, min: -400, max: 500, onScrub: () => { if (FM.canvasEdit) FM.canvasEdit.update(); } });
      refreshables.push(bax, bay); values.append(bax, bay);
      const apad = el('div', 'mt-trackpad'); apad.appendChild(el('span', 'mt-trackpad-hint', 'Swipe to place the anchor · snaps to centre, edges and corners'));
      // 260px of swipe crosses the layer, and it snaps to the nine points you actually want
      const SNAP = [0, 0.25, 0.5, 0.75, 1];
      const snapA = v => { if (!magnetOn()) return v; for (let i = 0; i < SNAP.length; i++) if (Math.abs(v - SNAP[i]) < 0.045) return SNAP[i]; return v; };
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
      control.appendChild(mtScrub(() => mtEval(layer, 'skewX'), v => mtSet(layer, 'skewX', Math.max(-80, Math.min(80, v))), 0.2, () => bsx._refresh(), { min: -80, max: 80 }));
      control.appendChild(mtScrub(() => mtEval(layer, 'skewY'), v => mtSet(layer, 'skewY', Math.max(-80, Math.min(80, v))), 0.2, () => bsy._refresh(), { min: -80, max: 80 }));
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
    // (the two explanation lines that were here are gone — queue 346/378)

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
  /* Volume ceiling (queue 195). Ezra: "I want to be able adjust the volume up to like 1000%." Above
   * unity is Web Audio only — `el.volume` cannot exceed 1 — and the boost stage in audio-fx-live.js
   * clamps to the same number, so the UI cannot ask for a gain the audio path will not honour. */
  const VOL_MAX = 10;

  function volumePanel(layer) {
    if (layer.volume == null) layer.volume = 1;
    const panel = el('div', 'mt-panel vol-panel');
    const volPct = () => Math.round((layer.volume == null ? 1 : FM.evalProp(layer.volume, FM.time)) * 100);   // raw level (mute is a separate flag, shown on the speaker)
    /* UP TO 1000% (queue 195). Ezra: "I want to be able adjust the volume up to like 1000%."
     * It was capped at 1, and that cap was not arbitrary — `el.volume` CANNOT exceed 1 (assigning 2
     * throws IndexSizeError and the value stays 1), so a wider slider on its own would have been
     * silent in the preview and loud in the export. Above unity now goes through the Web Audio boost
     * stage in audio-fx-live.js instead, with a limiter, so preview and file agree.
     * `el.volume` still carries everything UP TO unity — fades, solo, mute and the de-click all live
     * there and are untouched — and the two multiply back to the value asked for. */
    const setPct = pct => {
      const f = Math.max(0, Math.min(VOL_MAX, pct / 100));
      const wasBoosted = FM.audioFxLive && FM.audioFxLive.needsBoost && FM.audioFxLive.needsBoost(layer);
      FM.setProp(layer, 'volume', f, FM.time);            // keyframe-aware (writes a kf when animated)
      const m = FM.media.get(layer.id); if (m && m.el) m.el.volume = Math.min(1, f);
      /* CROSSING unity has to (re)build the routing — the chain does not exist below it, and it must
       * come back OUT when you drop back down, or a clip stays in Web Audio for no reason. Only on the
       * crossing, not on every drag step, or each pixel of movement would tear down a live graph. */
      if (FM.audioFxLive) {
        const nowBoosted = FM.audioFxLive.needsBoost && FM.audioFxLive.needsBoost(layer);
        if (nowBoosted !== wasBoosted) FM.audioFxLive.sync(layer);
        else if (nowBoosted && FM.audioFxLive.setBoost) FM.audioFxLive.setBoost(layer, f);
      }
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
    const vbox = mtVBox('Volume', volPct, v => setPct(Math.round(v)), { dp: 0, unit: '%', scrub: 1, min: 0, max: VOL_MAX * 100 });
    values.appendChild(vbox);

    const srow = el('div', 'vol-slider-row');
    const mute = el('button', 'vol-mute');
    const muteIcon = () => { const m = !!layer.muted || volPct() <= 0; mute.classList.toggle('on', m); mute.innerHTML = svgIcon(m ? 'M11 5 6 9H3v6h3l5 4zM17 9l4 6M21 9l-4 6' : 'M11 5 6 9H3v6h3l5 4zM16 8.5a4 4 0 0 1 0 7'); };
    muteIcon();
    /* THE EFFECTS-STYLE SCRUB RULER, not a dot on a line (queue 195) — his words: "The volume slider
       needs to be like the effects slider and not a dot on a line, because I want to be able adjust
       the volume up to like 1000%." The two halves are one requirement: an `<input type=range>` maps
       its whole travel onto its min..max, so at 0–1000% every ordinary level would be squeezed into
       the first tenth of the bar and 100% would be a few pixels from the left. A scrub ruler has no
       ends to run out of — the same control the effect params use, and the reason he asked for it. */
    const slider = tickStrip({
      min: 0, max: VOL_MAX * 100, step: 1, unit: '%', dflt: 100, read: volPct,
      apply: v => { setPct(Math.round(v)); if (vbox._refresh) vbox._refresh(); muteIcon(); },
      release: () => commitH(),
    });
    slider.classList.add('vol-strip');
    // Kept because FM.inspector.syncTransform below calls it every time the playhead moves — on a
    // keyframed volume the displayed level changes without anyone touching the control.
    const sync = () => { if (slider._sync) slider._sync(volPct()); if (vbox._refresh) vbox._refresh(); muteIcon(); };
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
    /* The button goes dead while the work runs, as well as the guard inside toggleKaraoke. Belt and
       braces on purpose: the guard is the correctness (any caller, any route), this is the honesty —
       a button that still looks pressable during a multi-second render is what invited the second tap. */
    karBtn.addEventListener('click', async () => {
      if (karBtn.disabled) return;
      karBtn.disabled = true;
      try { if (FM.toggleKaraoke) await FM.toggleKaraoke(layer); }
      finally { karBtn.disabled = false; if (FM.inspector) FM.inspector.refresh(); }
    });
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
    /* AND IF IT CANNOT WORK HERE, SAY SO ON THE CONTROL ITSELF (#686). Letter spacing is drawn by
     * ctx.letterSpacing, which not every browser's canvas has. Where it is missing this slider moved
     * its number, wrote its value and re-rendered, and the letters did not budge — with nothing
     * anywhere explaining why. That is #645 and #661's complaint word for word: the screen said one
     * thing and the app did another. FM.textSpacingOK() MEASURES it rather than asking whether the
     * property exists, and this reuses the same "does nothing here" pill the effects stack already
     * uses for exactly this sentence, so it is one existing answer in a second place rather than a
     * new one. Only the Spacing slider is tagged: the Text Spacing EFFECT also carries line height,
     * which works everywhere, so tagging the whole effect dead would be a false warning — and a wrong
     * warning is the same defect as a wrong reassurance. */
    const spRow = rangeRow('Spacing', () => layer.letterSpacing, v => { layer.letterSpacing = v; }, -10, 60, 1);
    const spOK = FM.textSpacingOK ? FM.textSpacingOK() : null;
    if (spOK && !spOK.letter) {
      /* UNDER the row, not inside the label and not on the row itself. Inside the label it would land
       * in label.textContent, where other code matches rows by their exact label text; on the row it
       * would compete for width with the scrub strip, which is the 380px overflow the effects stack
       * already has a note about. Its own line costs nothing and cannot squeeze anything. */
      const dt = el('span', 'fx-dead-tag', 'does nothing here');
      dt.title = "This browser's canvas cannot space letters, so this slider will move but the text will not.";
      dt.style.display = 'inline-block';
      dt.style.margin = '2px 0 6px 6px';
      spRow.appendChild(dt);
    }
    body.appendChild(spRow);
    body.appendChild(rangeRow('Line height', () => layer.lineHeight, v => { layer.lineHeight = v; }, 0.8, 2.5, 0.05));
    body.appendChild(rangeRow('Curve', () => layer.textCurve || 0, v => { layer.textCurve = v; }, -180, 180, 1));
    if (!layer.textAnim) layer.textAnim = { preset: 'none', unit: 'char', durIn: 0.6, durOut: 0, stagger: 0.04 };
    const an = layer.textAnim;
    const ar2 = el('div', 'prop-row'); ar2.appendChild(el('label', null, 'Animate'));
    const asel = document.createElement('select');
    /* ⚠️ THIS LIST AND THE ONE IN js/compositor.js ARE THE SAME LIST, and nothing enforces that —
       an entry here with no branch there is a menu option that silently does nothing, which is exactly
       the class of bug queue 572 was about. The suite asserts every option renders differently from
       "none" (queue 573); if you add one, add it in both places or that test fails.
       Grouped deliberately: the five entrances he already had, then the four new entrances, then the
       two that NEVER SETTLE — wave and jitter keep moving for the layer's whole life, which is a
       different kind of thing and is why they sit at the bottom rather than mixed in. */
    [['none', 'None'], ['fade', 'Fade in'], ['fade-up', 'Fade up'], ['typewriter', 'Typewriter'], ['pop', 'Pop'], ['slide', 'Slide in'],
     ['drop', 'Drop in'], ['spin', 'Spin in'], ['zoom-out', 'Zoom in from big'], ['stretch', 'Stretch'],
     ['wave', 'Wave (keeps moving)'], ['jitter', 'Jitter (keeps moving)']].forEach(p => { const o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; if (p[0] === an.preset) o.selected = true; asel.appendChild(o); });
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
    /* Motion blur is the CAMERA's, not a layer's (queue 31b). Layers do not render through the camera —
       they are drawn into one plate and the camera transform is applied to that whole plate — so a
       per-layer blur cannot see a pan, and putting the switch on a layer would be a switch that does
       nothing. It is also how every real editor has it, and it is the answer to "why doesn't my whip
       pan smear". */
    { key: 'blur',  label: 'Motion Blur',  icon: 'M4 8h16M4 12h11M4 16h16M18 12h2' },
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
    if (tab === 'blur') {
      if (!layer.motionBlur || typeof layer.motionBlur !== 'object') layer.motionBlur = { enabled: false, shutter: 0.5, samples: 8 };
      const mb = layer.motionBlur;
      body.appendChild(checkRow('Motion blur', !!mb.enabled, v => { mb.enabled = !!v; FM.requestRender(); FM.inspector.refresh(); commitH(); }));
      if (mb.enabled) {
        body.appendChild(rangeRow('Shutter', () => (mb.shutter != null ? mb.shutter : 0.5),
          v => { mb.shutter = Math.max(0, Math.min(12, v)); FM.requestRender(); }, 0, 12, 0.05));   // 12: queue 695, matching the layer version
        body.appendChild(rangeRow('Samples', () => Math.round(mb.samples || 8),
          v => { mb.samples = Math.max(2, Math.min(32, Math.round(v))); FM.requestRender(); }, 2, 32, 1));
      }
      body.appendChild(el('div', 'insp-hint', 'Smears the whole scene when the CAMERA moves — a pan, a dolly or a spin. It costs nothing while the camera is still, and nothing at all when it has not moved far enough to see, so it is safe to leave on. Shutter is how long the shutter stays open: 0.5 is the 180° shutter film uses. Samples is how many slices are averaged — more is smoother and slower. This does not smear movement INSIDE the picture: a layer\u2019s own keyframes are Motion Blur (Object), and movement made by an effect is Motion Blur (Footage).'));
      return;
    }
    /* ⚠️ ONE ANSWER TO "IS THIS SCENE FLAT", SHARED BY EVERY CAMERA CONTROL THAT NEEDS DEPTH
       (queue 595 + the sweep that followed it). Field of view, Distance and Focus blur all act on the
       gap between layers in Z, and all three are dead without one. **Two copies of this test would drift
       — one tab would start warning while the other stayed quiet about the same scene.**
       Returns null when there IS depth, so the caller adds nothing and the warning cannot become
       furniture. `layer` is the camera itself and is excluded: its own Z is the dolly, not the scene's. */
    function flatSceneWarning(cam, whatIsDead) {
      const hasDepth = (FM.scene && FM.scene.layers || []).some(l => l && l !== cam && l.transform &&
        l.transform.z != null && Math.abs(FM.evalProp(l.transform.z, FM.time) || 0) > 0.5);
      if (hasDepth) return null;
      const w = el('div', 'insp-hint insp-hint-warn');
      w.textContent = 'Nothing in this scene has depth yet, so ' + whatIsDead + ' — every layer sits at the same Z. Give a layer some depth first: select it, open Move & Transform, and change Z beside X and Y.';
      return w;
    }

    if (tab === 'view') {
      body.appendChild(rangeRow('Field of view', () => (layer.fov != null ? FM.evalProp(layer.fov, FM.time) : camLegacyFov(P)),
        v => { layer.fov = Math.max(5, Math.min(160, v)); FM.requestRender(); }, 5, 160, 0.5));
      // Distance IS the camera's own Z — it already exists, already keyframes, and already feeds the
      // parallax maths. Giving it a second home here rather than a second field keeps one truth.
      body.appendChild(rangeRow('Distance', () => -(layer.transform.z != null ? FM.evalProp(layer.transform.z, FM.time) : 0),
        v => { FM.setTransform(layer, 'z', -Math.round(v), FM.time); FM.requestRender(); }, -2000, 4000, 5));
      /* ⚠️ SAY WHEN THESE CONTROLS CANNOT DO ANYTHING — queue 595. Ezra: *"Field of view and distance
         sliders don't work in camera"*, with two screenshots proving it: FOV 5 → 159 and Distance
         −2000 → 4000, and an identical picture.
         **He was right, and nothing here was broken.** MEASURED: on a FLAT scene those two change **0
         pixels**; give one layer `z = 900` and the same FOV change moves **77,759**. Both controls act on
         DEPTH, and a scene whose layers all sit at the same Z has none — so the lens correctly has
         nothing to work with, and the hint below cheerfully promised parallax it could not deliver.
         ⚠️ **This is the third time the app has known something and not said it** (#572's effects browser,
         #578's motion blur). The fix is the same each time: say it where he is looking, at the moment it
         matters — not in a manual.
         ⚠️ **It names the CONTROL that fixes it.** "Nothing has depth" is a diagnosis; "set Z in Move" is
         an instruction, and Z is already there beside X and Y. Telling him the problem without the cure
         is what made this a bug report in the first place. */
      const w = flatSceneWarning(layer, 'these two do nothing');
      if (w) body.appendChild(w);
      body.appendChild(el('div', 'insp-hint', 'Field of view is the lens. Wide (90°+) throws depth hard — layers at different Z separate and the camera’s pan gains real parallax. Narrow (20°) flattens the scene almost to 2D. Distance dollies the camera along Z; it is the same value as the camera’s own Z, so keyframing either animates the move.'));
      return;
    }
    if (tab === 'focus') {
      if (!layer.focus) layer.focus = { enabled: false, distance: 0, dof: 200, blur: 0.5 };
      /* ⚠️ FOCUS NEEDS DEPTH TOO — found by sweeping for the queue-595 shape rather than waiting for him
         to report it a second time. MEASURED at v13.04: with Focus blur ON and every layer at the same Z,
         turning it on changes **0 pixels**; give one layer `z = 900` and the same switch changes
         **39,542**. It is the identical fault to Field of view, one tab across in the same panel.
         Focus separates NEAR from FAR — `off = |zz - distance| - dof` — so with no depth there is nothing
         to separate, and the blur it can produce is a uniform wash over everything, which is not what
         anyone reaches for a focus control to do.
         **Same helper, same words, same colour as the View tab** — one truth about what "flat" means,
         rather than a second copy that can drift from it. */
      const fw = flatSceneWarning(layer, 'Focus blur has nothing to separate');
      if (fw) body.appendChild(fw);
      const f = layer.focus;
      body.appendChild(checkRow('Focus blur', !!f.enabled, v => { f.enabled = v; FM.requestRender(); FM.inspector.refresh(); commitH(); }));
      if (!f.enabled) { body.appendChild(el('div', 'insp-hint', 'Turn this on to defocus layers by their depth. Give layers different Z values (Position / Scale → Move) and everything off the focus plane softens.')); return; }
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

  /* TRANSFORM motion blur — Motion Blur (Object) — has NO block here any more, deliberately.
   * `motionBlurBlock()` lived here and built its Shutter and Samples rows, and it had lost its last
   * caller, so the effect rendered with nothing to adjust while its own toast pointed at a panel that
   * did not have it either (queue 695, 1 Sep). It is an ORDINARY EFFECT now — `js/fx-browser.js` adds a
   * real `objectblur` instance, exactly as sheet mode and the save-file migration already did — so the
   * generic effect card draws its controls from the catalog, where Shutter reaches 12.
   * The dead copy is gone rather than re-wired: it clamped Shutter to 1, which queue 379 raised to 4
   * and queue 540 to 12, so re-connecting it would have quietly reinstated the old ceiling. */


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
      /* ---- Speed to the playhead (queue 184) --------------------------------------------------
       * His words: "let's say your clip is slightly too short for what you need, then you can go on
       * the timeline to exactly where you want it to last to, then press a button and it will change
       * the speed to go exactly to that point."
       *
       * So the speed is SOLVED, not nudged. The invariant is the source span — duration × speed, the
       * amount of footage in the clip — which re-timing never changes. Want the clip to end at time
       * T with its start fixed? The new duration is T − start, so the new speed is span / (T − start).
       * One divide; the value of this feature is that you never work it out yourself.
       *
       * Above the slider, matching where AM puts them. Two buttons, one per edge, because those are
       * the two things that can actually be solved — see the note in REQUESTS #184 about the four in
       * his screenshot. Deliberately NOT disabled when the playhead is out of range: the panel does
       * not rebuild while you scrub, so a button greyed out at build time would still be grey after
       * you moved the playhead somewhere valid. Same reasoning, and the same comment, as the trim
       * buttons in the quick row — each handler checks the CURRENT playhead instead. */
      function spdSolve(toEnd) {
        // A ramp is a curve through several speeds; there is no single speed to solve for, and
        // overwriting it would silently throw the ramp away.
        if (FM.isAnimated(layer.speed)) {
          if (FM.toast) FM.toast('This clip has a speed ramp — solving one speed would throw the ramp away', 2800);
          return;
        }
        const span = layer.duration * FM.speedAt(layer, layer.start);   // the footage, which re-timing never changes. speedAt, not `|| 1` (queue 451): a malformed prop is an object and this span would be NaN
        const end = layer.start + layer.duration;
        const want = toEnd ? (FM.time - layer.start) : (end - FM.time);
        if (!(want > 0.02)) {
          if (FM.toast) FM.toast(toEnd ? 'Put the playhead after the clip starts' : 'Put the playhead before the clip ends', 2400);
          return;
        }
        let sp = span / want;
        sp = Math.max(SPD_MIN, Math.min(SPD_MAX, sp));
        const durBefore = layer.duration;
        layer.speed = sp;
        layer.duration = Math.max(0.1, span / sp);
        // Clamp against the source actually left, exactly as the slider and the trim grips do.
        const mm = FM.media.get(layer.id);
        const srcDur = (mm && mm.duration) ? mm.duration : Infinity;
        if (layer.type === 'video' && isFinite(srcDur)) {
          layer.duration = Math.max(0.1, Math.min(layer.duration, (srcDur - (layer.trimStart || 0)) / sp));
        }
        // Holding the RIGHT edge means the left edge moves — and it moves to wherever the clamped
        // duration actually put it, not to the playhead we were aiming at, or a clip clamped by its
        // source would end up somewhere neither edge was asked for.
        if (!toEnd) layer.start = end - layer.duration;
        /* PIVOT ON THE EDGE THAT DID NOT MOVE (#686). scaleLayerKeyframes defaults its pivot to
         * layer.start, which is right for every other caller — the speed slider and the trim grips all
         * hold the LEFT edge. This one does not: "start at the playhead" holds the RIGHT edge and slides
         * the start, and the line above has just overwritten layer.start with the new one. So the
         * keyframes were pivoted on the edge that moved, and measured from it too, which is wrong twice
         * over: a keyframe that sat on the clip's first frame no longer sat on its first frame, and the
         * whole animation drifted out of step with the bar it belongs to. Pivoting on `end` is the same
         * arithmetic as "offset from the OLD start, scaled, laid off the NEW start" — end is fixed by
         * construction here, including after the source clamp, because start is derived from it. */
        if (durBefore > 0 && FM.scaleLayerKeyframes) FM.scaleLayerKeyframes(layer, layer.duration / durBefore, toEnd ? layer.start : end);
        if (FM.refitGroupsFor) FM.refitGroupsFor(layer);   // queue 626 — the group follows its contents
        const newEnd = layer.start + layer.duration;
        if (newEnd > FM.scene.project.duration) FM.scene.project.duration = newEnd;
        const m2 = FM.media.get(layer.id);
        if (m2 && m2.el) { try { m2.el.playbackRate = Math.min(16, Math.max(0.0625, sp)); } catch (e) {} }
        FM.seekVideosToTime(); FM.timeline.rebuild(); commitH(); FM.inspector.refresh();
        if (FM.toast) FM.toast('Speed ' + (Math.round(sp * 100) / 100) + '×', 1600);
      }
      {
        const sbar = el('div', 'spd-solve-row');
        const mk = (title, icon, toEnd) => {
          const b = el('button', 'qr-btn spd-solve');
          b.title = title; b.innerHTML = svgIcon(icon);
          b.setAttribute('aria-label', title);
          b.addEventListener('click', () => spdSolve(toEnd));
          sbar.appendChild(b);
        };
        // Same icon vocabulary as the trim pair, so the row reads as "the speed version of those".
        mk('Speed so the clip STARTS at the playhead (the end stays put)', 'M6 4v16M6 4h4M6 20h4M14 4v16', false);
        mk('Speed so the clip ENDS at the playhead (the start stays put)', 'M18 4v16M18 4h-4M18 20h-4M10 4v16', true);
        spCenter.appendChild(sbar);
        spCenter.appendChild(el('div', 'insp-hint', 'Park the playhead, then press one of these — the speed is worked out so the clip begins or ends there.'));
      }
      spCenter.appendChild(rangeRow('Speed %', () => Math.round((FM.evalProp(layer.speed, FM.time) || 1) * 100), v => {
        const sp = Math.max(SPD_MIN, v / 100);
        if (FM.isAnimated(layer.speed)) {
          FM.setProp(layer, 'speed', sp, FM.time);          // ramp: writes/updates a keyframe at the playhead; clip window stays fixed
        } else {
          const durBefore = layer.duration;                   // measured BEFORE, so the keyframes below scale by what ACTUALLY happened
          const span = layer.duration * FM.speedAt(layer, layer.start);   // source span is invariant → re-time the clip (speedAt, queue 451)
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
          /* …and the animation rides with the clip (queue 68). The factor is taken from the durations
           * that actually resulted, not from the speed ratio, because layer.duration is CLAMPED just
           * above — by the 0.1s floor and, on a video, by the source that is really left. Deriving it
           * from sp instead would let the keyframes stretch past a bar that had stopped growing.
           * This runs per slider step, and that is fine: each step scales by the ratio between two
           * consecutive real durations, so the product telescopes to the exact total ratio. */
          if (durBefore > 0 && FM.scaleLayerKeyframes) FM.scaleLayerKeyframes(layer, layer.duration / durBefore);
          // A GROUP AROUND THIS CLIP MUST FOLLOW IT (queue 626) — otherwise the group keeps its old
          // length, its tail is empty, and the preview goes black there. Measured: children 2.000 →
          // 1.176 while the group stayed at 2.000.
          if (FM.refitGroupsFor) FM.refitGroupsFor(layer);
          const end = layer.start + layer.duration;
          if (end > FM.scene.project.duration) FM.scene.project.duration = end;
        }
        const m = FM.media.get(layer.id); if (m && m.el) { try { m.el.playbackRate = Math.min(16, Math.max(0.0625, FM.evalProp(layer.speed, FM.time) || 1)); } catch (e) {} }
        FM.seekVideosToTime();
        FM.timeline.rebuild();
      }, SPD_MIN * 100, SPD_MAX * 100, 5, () => FM.inspector.refresh(), 5));
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
          // Flipping this MID-PLAYBACK changes which audio path owns the clip, and nothing here used
          // to say so — the element kept emitting forward audio under a backwards picture, or the
          // synthesized reverse buffer played on over a resumed element. (BUG-HUNT)
          if (FM.reconcileAudio) FM.reconcileAudio();
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
      body.appendChild(transformRow(layer, 'opacity', 'Opacity', { step: 0.01, dp: 2, ease: true, slider: { min: 0, max: 1, step: 0.01 } }));
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
        /* A GROUP WITH ONE MEMBER IS A ROW, NOT A DROPDOWN (queue 388). Ezra: "make it so that the basic
           tab with normal as an option is just normal with no tab, it's a waste of time to open a tab when
           there's only one choice in it."
           Written as the general rule rather than as `name === 'Basic'`, which the entry asked for and which
           costs nothing here: the next single-member group — a legacy mode that lands alone in its family,
           or a family trimmed to one — behaves correctly without anyone remembering this. The row shows the
           MODE's name ("Normal"), not the group's ("Basic"): with the tab gone the group name is a label for
           a set you can no longer see, and the thing you are tapping is the mode.
           It stays a real button, which is clause 2's warning: Normal is the default every layer starts on,
           so this row is how you come BACK from another mode and must not degrade into a caption. */
        const single = modes.length === 1;
        const row = el('div', 'blend-cat' + (activeCat === name ? ' active' : '') + (single ? ' blend-cat-single' : ''));
        const head = el('button', 'blend-cat-head');
        const open = !single && !!FM._blendOpen[name];
        const curIn = modes.find(m => m[0] === cur);
        if (single) {
          head.innerHTML = '<span class="blend-cat-name">' + modes[0][1] + '</span>' + (curIn ? '<span class="blend-check">✓</span>' : '');
          head.addEventListener('click', () => { layer.blendMode = modes[0][0]; FM.requestRender(); FM.inspector.refresh(); commitH(); });
        } else {
        head.innerHTML = '<span class="blend-arrow">' + (open ? '▾' : '▸') + '</span><span class="blend-cat-name">' + name + '</span>' +
          (curIn ? '<span class="blend-cur">' + curIn[1] + '</span><span class="blend-check">✓</span>' : '');
        head.addEventListener('click', () => { const was = !!FM._blendOpen[name]; FM._blendOpen = {}; if (!was) FM._blendOpen[name] = true; FM.inspector.refresh(); });   // accordion: only ONE dropdown open at a time (AM)
        }
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
    } else if (key === 'captions') {
      /* The captions card (queue 150 part 1). Everything that used to be buried in the Aa sheet, one
       * tap from the layer: detection at the top — it is the reason to use captions at all — and the
       * cue grid under it. This card does not own that UI, it hosts it: js/captions.js still builds
       * both, so the Aa sheet and this card can never drift into two different captions editors. */
      if (!FM.captionsEditor) {
        body.appendChild(el('div', 'insp-hint', 'The captions editor failed to load — hard-refresh and try again.'));
      } else if (Array.isArray(layer.captions)) {
        const host = el('div', 'cap-host');
        FM.captionsEditor.mount(host, layer);
        body.appendChild(host);
      } else {
        body.appendChild(el('div', 'insp-hint', 'Turn this text layer into a caption track to give it timed cues — or detect them from a clip’s audio.'));
        const mk = el('button', 'btn cap-make', '+ Use as caption track');
        mk.addEventListener('click', () => {
          if (FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive() && FM.textEdit.layerId() === layer.id) FM.textEdit.stop();
          if (FM.captions) FM.captions.makeTrack(layer);
          FM.requestRender(); commitH();
          if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
          if (FM.inspector) FM.inspector.refresh();
        });
        body.appendChild(mk);
        // …and detection straight from the empty state, because it converts the layer AND fills the
        // grid in one press. Making someone press "use as caption track" first is a step for nothing.
        if (FM.captionsEditor.detectRow) {
          body.appendChild(FM.captionsEditor.detectRow(layer, () => { if (FM.inspector) FM.inspector.refresh(); }));
        }
      }
    } else if (key === 'presets') {
      const pwrap = el('div', 'preset-wrap rows');

      /* SEARCH AND TAG CHIPS (queue 331 clauses 4, 7, 8). Ezra: *"there's no way to search presets or
         organise … each tag menu will appear at the top and each time you create a new tag a new option
         will appear at the top"*. The chips ARE those menus: one per tag in use, so creating a tag on a
         preset makes its chip appear here by construction rather than by a second list that has to be
         kept in step. "All" leads the row so there is always a way back out of a filter. */
      const bar = el('div', 'preset-tools');
      const q = el('input', 'preset-search');
      q.type = 'search'; q.placeholder = 'Search presets'; q.value = presetQuery;
      q.setAttribute('aria-label', 'Search presets');
      /* 'input', not 'change': he asked to SEARCH, and a box that only filters when you leave it is a
         box you have to be told how to use. The card rebuild puts focus back, since rebuilding replaces
         the node the caret was in. */
      q.addEventListener('input', () => {
        presetQuery = q.value;
        FM.inspector.refresh();
        const again = document.querySelector('#inspector .preset-search');
        if (again) { again.focus(); const n = again.value.length; try { again.setSelectionRange(n, n); } catch (e) {} }
      });
      bar.appendChild(q);
      const tags = FM.presetTags.list();
      if (tags.length) {
        const chips = el('div', 'preset-chips');
        const chip = (label, val) => {
          const b = el('button', 'preset-chip' + (presetTag === val ? ' on' : ''), label);
          b.type = 'button';
          b.addEventListener('click', () => { presetTag = (presetTag === val) ? '' : val; FM.inspector.refresh(); });
          chips.appendChild(b);
        };
        chip('All', '');
        tags.forEach(t => chip(t, t));
        bar.appendChild(chips);
      }
      pwrap.appendChild(bar);

      // One filter for both lists: a row survives if the search matches its name or one of its tags,
      // and if the chosen tag (when there is one) is on it.
      const tagsOf = k => FM.presetTags.get(k);
      const passes = (name, key) => {
        const t = tagsOf(key);
        if (presetTag && t.map(x => x.toLowerCase()).indexOf(presetTag.toLowerCase()) < 0) return false;
        const needle = presetQuery.trim().toLowerCase();
        if (!needle) return true;
        return name.toLowerCase().indexOf(needle) >= 0 || t.some(x => x.toLowerCase().indexOf(needle) >= 0);
      };
      /* UNTAGGED LAST (clause 9) — *"loose ones that aren't tagged will appear at the bottom like they
         do now"*. A stable partition, not a sort: within each half the order the store already has is
         the order he saved them in, and shuffling that to satisfy "grouped" would lose it. */
      const byTag = list => list.filter(x => tagsOf(x._k).length).concat(list.filter(x => !tagsOf(x._k).length));
      /* EVERY ROW SHOWS THE LAYER WITH THE PRESET ON IT. Ezra: "the preset menu I wanted to show what
       * the layer would look like with that effect … when you would tap on one thing it would show how
       * the effects preset would make the layer look, this is similar to how we have the effects menu
       * as it is". He is right that the engine was already there — the effects browser has had live
       * per-layer previews since v6.30; this card was still a row of text pills.
       * The tile is rendered by running the REAL apply on a throwaway clone (FM.fxThumbs.mountApplied),
       * not by a second description of what a preset does. A preview that could disagree with the row
       * you tap would be worse than no preview. */
      const canThumb = !!(FM.fxThumbs && FM.fxThumbs.mountApplied);
      let noPreview = false;
      // Keyed on CONTENTS, not name: re-saving a preset under a name it already had must not serve
      // the old picture out of the tile cache.
      const stamp = o => { const t = JSON.stringify(o) || ''; let h = 5381; for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return t.length + '_' + h.toString(36); };
      /* Rename and Tags both go through prompt(), which is what the two Save buttons on this same card
         already do. A bespoke inline editor would be a nicer thing to own and a worse thing to meet:
         one idiom on one card beats two. */
      function presetHoldMenu(anchorEl, o) {
        const r = anchorEl.getBoundingClientRect();
        const store = o.storeKey.slice(0, 2) === 'lp' ? FM.layerPresets : FM.fxPresets;
        FM.contextMenu.show(r.left + 8, r.bottom + 4, [
          { label: 'Rename…', action: () => {
              const to = prompt('Rename preset:', o.name);
              if (to === null) return;
              if (store.rename(o.name, to) && FM.toast) FM.toast('Renamed to “' + String(to).trim() + '”');
            } },
          { label: 'Tags…', action: () => {
              const now = FM.presetTags.get(o.storeKey);
              const t = prompt('Tags for “' + o.name + '” (separate with commas):', now.join(', '));
              if (t === null) return;
              FM.presetTags.set(o.storeKey, String(t).split(','));
              if (FM.toast) FM.toast(String(t).trim() ? 'Tagged “' + o.name + '”' : 'Tags cleared');
            } }
        ]);
      }

      function presetRow(o) {
        const row = el('div', 'fxp-row insp-preset-row' + (o.cls || ''));
        if (canThumb && o.applyTo) {
          const th = el('div', 'fxb-thumb fxp-thumb'); th.dataset.cat = o.cat || 'stylize';
          const cv = el('canvas', 'fxb-thumb-cv');
          th.appendChild(cv);
          if (FM.fxThumbs.mountApplied(cv, o.key, layer, o.applyTo)) row.appendChild(th);
          else noPreview = true;   // nothing of this layer is on screen; a sample of another subject would mislead
        }
        const txt = el('div', 'fxp-txt');
        const nm = el('button', 'fxp-name insp-preset-name', o.name);
        nm.type = 'button'; nm.title = o.title;
        nm.addEventListener('click', () => { if (nm._held) { nm._held = false; return; } o.onTap(); });
        /* HOLD TO RENAME OR TAG (queue 331 clauses 5-6). Ezra: *"if you hold on a preset you can re name
           it and also tag it"*. A hold, not a second button: the row already carries a thumbnail, a name,
           a sub-line and a ✕ at 380px, and a fifth control is what made him ask for this card to be
           tidied in the first place.
           The tap that follows a hold is swallowed — otherwise letting go APPLIES the preset you were
           trying to rename, which on a card whose whole job is replacing your effect stack is the worst
           possible accident. Same guard the Add menu uses on its own long-press. */
        if (o.storeKey) {
          let ht = null;
          const stop = () => { if (ht) { clearTimeout(ht); ht = null; } };
          nm.addEventListener('pointerdown', () => {
            stop();
            ht = setTimeout(() => { ht = null; nm._held = true; presetHoldMenu(nm, o); }, 550);
          });
          ['pointerup', 'pointercancel', 'pointerleave', 'pointermove'].forEach(e => nm.addEventListener(e, stop));
          nm.addEventListener('contextmenu', e => { e.preventDefault(); nm._held = true; presetHoldMenu(nm, o); });
        }
        txt.appendChild(nm);
        if (o.sub) txt.appendChild(el('div', 'fxp-desc', o.sub));
        row.appendChild(txt);
        if (o.onDelete) {
          /* AN SVG CROSS, NOT THE CHARACTER (queue 331 clause 3). Ezra: *"the X isn't centred in this
             screenshot for each preset"*. The button was already a centred flex box, so nothing about
             the BOX was wrong — flex centres the line box and the font decides where the ink sits
             inside it, which is why an ✕ can look level on one screen and high on another. Third time
             this exact defect has been reported (the × and the magnifier in queue 209, the + in 296),
             and the fix is the same each time: draw it, so the ink is centred by geometry. */
          const d = el('button', 'fxp-del'); d.type = 'button'; d.title = 'Delete this preset';
          d.innerHTML = svgIcon('M6 6l12 12M18 6L6 18');
          d.addEventListener('click', e => { e.stopPropagation(); o.onDelete(); });
          row.appendChild(d);
        }
        return row;
      }

      // LAYER presets first (look + animations — the AM-style ones saved via "Save Preset")
      const lps = byTag(FM.layerPresets.list().map(p => { p._k = 'lp:' + p.name; return p; }))
                    .filter(p => passes(p.name, p._k));
      /* THE SAVE ACTION LEADS ITS SECTION (queue 331 clauses 1-2). Ezra: *"Get rid of explanation and
         put the save current effects as preset at the top"*. Both buttons used to sit UNDER their lists,
         so with a few presets saved the thing you came to the card to do was below the fold on a phone,
         and the first thing on screen was a sentence explaining what a preset is — the second time he
         has asked for an explanation block to go.
         Each button stays with the heading that names what it makes, rather than both being stacked at
         the very top: that pairing is what queue 329 was for, and separating a button from its own list
         would undo it to satisfy the word "top" too literally. The heading is unconditional now, so an
         empty section reads as a heading and a button rather than a button floating with nothing above
         it — which is what an empty "Look + animations" used to give you. */
      pwrap.appendChild(el('div', 'preset-sec', 'Look + animations'));
      const svL = el('button', 'fx-act', 'Save look + animations…');
      svL.addEventListener('click', () => FM.savePresetPrompt && FM.savePresetPrompt(layer));
      pwrap.appendChild(svL);
      /* UPDATE THE PRESET THIS LAYER CAME FROM (queue 407 clause 2). It appears only when the layer was
         applied from one that still exists, so it is never a dead control — and it closes his round trip:
         open a preset, edit the layer, press this, and that preset now holds what you can see. */
      const from = layer.fromPreset;
      if (from && FM.layerPresets.list().some(x => x.name === from)) {
        const up = el('button', 'fx-act insp-preset-update', 'Update “' + from + '”');
        up.title = 'Write this layer’s current look + animations back over the “' + from + '” preset';
        up.addEventListener('click', () => {
          if (FM.layerPresets.update(from, layer) && FM.toast) FM.toast('Updated “' + from + '”');
          FM.inspector.refresh();
        });
        pwrap.appendChild(up);
      }
      lps.forEach(p => {
        pwrap.appendChild(presetRow({
          name: p.name,
          key: 'lp:' + p.name + ':' + stamp(p.data),
          title: 'Apply “' + p.name + '” — look + animations',
          storeKey: p._k,
          // Its tags ARE the sub-line when it has any: on a filtered card "why is this one here" should
          // be answerable from the row, and 'Look + animations' is already the heading above it.
          sub: tagsOf(p._k).length ? tagsOf(p._k).map(t => '#' + t).join('  ') : 'Look + animations',
          applyTo: doc => FM.layerPresets.applyTo(p.data, doc),
          onTap: () => { FM.layerPresets.apply(p.name, layer); if (FM.toast) FM.toast('Applied “' + p.name + '”'); },
          onDelete: () => { FM.layerPresets.remove(p.name); }   // the store refreshes — see presetsChanged
        }));
      });
      /* THE LABELS SAY WHAT EACH ONE KEEPS (queue 329). Ezra: *"what is the difference between pressing
         save this layer as preset and save current effects? If none then just make one button not
         two"*. There IS a difference, so the merge he offered is not the right answer — but he could
         not tell from the buttons, which is the actual defect. One saves the whole layer including its
         transform and animation; the other saves the effect stack and nothing else.
         "Look + animations" is not a new phrase: it is exactly what the saved rows already call
         themselves a few lines up, so the words that describe the thing on the button are the words on
         the thing it makes. The contrast with "effects only" is what carries the difference — neither
         label needs a sentence under it, which is what he has asked twice to stop doing. */
      // "Effect looks" said no more than "My presets" did — the two headings were as interchangeable as
      // the two buttons under them, which is half of why the question got asked (queue 329).
      pwrap.appendChild(el('div', 'preset-sec', 'Effects only'));
      /* ⚠️ "Save as preset", not "Save effects only…" — queue 583, his words: *"Make this button say save
       as preset."* He circled this button.
       ⚠️ **The ⋯ menu's "Save this effect as preset…" is DELIBERATELY still different, and must stay so.**
       The entry said to make the two agree, and they now agree on the VOCABULARY — both say "preset" —
       while keeping the words that separate their scope: this button saves the whole STACK, that one
       saves THIS effect. Collapsing them to one string would make two different actions read as the same
       action, in the same panel, which is worse than the mismatch it fixed.
       The ellipsis goes with the rename: it promised a dialog to choose WHAT gets saved, and there is
       only a name prompt.
       ⚠️ **IT IS "Save effects only as preset", NOT the bare "Save as preset" HE ASKED FOR, AND THAT IS A
       DELIBERATE DEPARTURE FROM HIS WORDS.** Two of his own requests collide here. Queue 329 made this
       button and its sibling say WHAT EACH ONE KEEPS — the other is "Save look + animations…" — because
       an earlier pair ("Save this layer as preset" / "Save current effects") both read as "save a preset"
       and nobody could tell which kept the layer's motion. The suite asserts one of the two still says it
       keeps ONLY the effects, and the bare "Save as preset" says neither. **It went red on exactly that,
       which is the guard doing its job.**
       So this keeps his phrase — "as preset" — and keeps the word that carries the distinction. **Told
       him, rather than quietly delivering different words than he asked for**; the bare label is one
       word away if he would rather have it and lose the contrast. */
    const sv = el('button', 'fx-act', 'Save effects only as preset'); sv.disabled = !(layer.effects && layer.effects.length);
    sv.title = 'Save every effect on this layer as one preset — without its animation';
      // No refresh() here: the store fires presetsChanged on write (queue 330).
      sv.addEventListener('click', () => { const name = prompt('Preset name:', 'My look'); if (!name || !name.trim()) return; FM.fxPresets.save(name.trim(), layer.effects); if (FM.toast) FM.toast('Saved preset “' + name.trim() + '”'); });
      pwrap.appendChild(sv);
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
      byTag(FM.fxPresets.list().map(p => { p._k = 'fp:' + p.name; return p; }))
        .filter(p => passes(p.name, p._k))
        .forEach(p => {
        const raw = Array.isArray(p.effects) ? p.effects : [];
        const fx = usableFx(p);
        const skipped = raw.length - fx.length;
        if (!fx.length) {
          // NOT hidden: a broken row you cannot see is a row you cannot delete. It stays visible, keeps
          // its ✕, and explains itself — and gets NO thumbnail, because there is nothing it could
          // honestly show. A tile here would be a picture of a look that will never be applied.
          const why = raw.length
            ? ('its ' + raw.length + ' effect' + (raw.length === 1 ? ' is' : 's are') + ' not in this build')
            : 'it was saved empty, or in a format this panel doesn’t read';
          const t0 = '“' + p.name + '” can’t be applied — ' + why + '. Applying it would wipe this layer’s effects, so it does nothing. Remove it with ✕.';
          pwrap.appendChild(presetRow({
            name: p.name, cls: ' broken', title: t0, sub: '⚠ ' + why,
            onTap: () => { if (FM.toast) FM.toast('“' + p.name + '” has no effects to apply — ' + why + '. Your effect stack is untouched.', 3600); },
            onDelete: p.builtin ? null : (() => { FM.fxPresets.remove(p.name); })
          }));
          return;
        }
        const t1 = (p.builtin ? 'Built-in — apply “' : 'Apply “') + p.name + '” (' + fx.length + ' effect' + (fx.length === 1 ? '' : 's') +
          (skipped ? ', ' + skipped + ' skipped — not in this build' : '') + ')';
        pwrap.appendChild(presetRow({
          name: p.name,
          key: 'fp:' + p.name + ':' + stamp(fx),
          cls: p.builtin ? ' builtin' : '',
          cat: (FM.fxRegistry.get(fx[0].type) || {}).category || 'stylize',
          title: t1,
          storeKey: p.builtin ? '' : p._k,   // a built-in cannot be renamed or deleted, so it gets no hold menu
          sub: (tagsOf(p._k).map(t => '#' + t).join('  ') + ' ' +
                fx.length + ' effect' + (fx.length === 1 ? '' : 's') + (skipped ? ' · ' + skipped + ' skipped' : '')).trim(),
          // A preset is a saved LOOK → it REPLACES the stack, and the preview has to show THAT, not the
          // layer's current effects with these added on top.
          applyTo: doc => { doc.effects = usableFx(p).map(e => JSON.parse(JSON.stringify(e))); },
          onTap: () => {
            const use = usableFx(p);   // re-read at click time: never assign an empty/unusable stack
            if (!use.length) { if (FM.toast) FM.toast('“' + p.name + '” has no effects to apply — your effect stack is untouched.', 3600); return; }
            layer.effects = use.map(e => JSON.parse(JSON.stringify(e)));
            FM.inspector.refresh(); FM.timeline.rebuild(); FM.requestRender(); if (FM.history) FM.history.commit();
            if (FM.toast) FM.toast('Applied “' + p.name + '”' + (skipped ? ' (' + skipped + ' effect' + (skipped === 1 ? '' : 's') + ' skipped — not in this build)' : ''));
          },
          onDelete: p.builtin ? null : (() => { FM.fxPresets.remove(p.name); })
        }));
      });
      // Say WHY there are no pictures rather than leaving a column of bare names looking half-built.
      if (noPreview) pwrap.appendChild(el('div', 'insp-hint', 'No previews — nothing of this layer is on screen at the playhead.'));
      body.appendChild(pwrap);
    } else if (key === 'effects') {
      // Two stacks, one card (queue 45): the toggle picks which one the panel is editing, and matches
      // the one at the top of the Add Effect browser. It leads the panel so the answer to "where did
      // Audio Effects go" is the first thing on screen.
      const tab = fxTabFor(layer);
      body.appendChild(fxModeToggle(layer, tab, k => { clearFilterPreview(); fxTab = k; FM._fxEasing = null; FM.inspector.refresh(); }));   // queue 729
      // An unknown audio answer rendered as available; settle it and demote the toggle if it's a no.
      probeAudioSide(layer, id => { const cur = FM.selectedLayer(FM.scene); if (cur && cur.id === id && view === 'effects') FM.inspector.refresh(); });
      if (tab === 'filters') {
        body.appendChild(filtersSection(layer));
      } else if (tab === 'audio') {
        const s = audioFxSection(layer);
        const h4 = s.querySelector('h4'); if (h4) h4.remove();
        body.appendChild(s);
      } else {
        // Motion Blur (Object) sits with the effects because that is where people look for it, and
        // because it reads as one: added from the browser, removed with an ×.
        // The Motion Blur (Object) block is GONE (queue 335) — it is an ordinary effect row now, which
        // is the whole point of that change. Leaving this would also re-create `layer.motionBlur` on
        // any layer whose card was opened, re-arming the legacy path the migration just retired.
        const s = effectsSection(layer);
        const h4 = s.querySelector('h4'); if (h4) h4.remove();
        body.appendChild(s);
        // Masks are rendered INSIDE the effect list by effectsSection now (queue 560) — they used to be
        // appended here, after the whole section, which put them below Copy / Paste / Save under their
        // own heading. That separate block is what he meant by "their own menu".
      }
    } else if (key === 'color') {
      /* Filters, at the top of Colouring (queue 113). Ezra asked for exactly this: "have a button at
         the top of the colouring section as a shortcut to it." And it belongs here — a filter IS a
         colour decision most of the time, and this is the panel you are already in when you decide the
         clip needs a look rather than a slider. Same picker as "+ Add Effect"'s neighbour, so there is
         one filter menu in the app rather than two that drift apart. */
      // The Filters shortcut now sits on the HEADER row beside "‹ Colouring" (queue 714) — see filterShortcut()
      // and the header branch in refresh(). It used to be a full-width row here, first in the body.
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
      /* THE TILE GRID IS APPENDED FIRST and every toggle goes into it, so the five controls read as one
         block and each one's detail rows fall below the grid rather than splitting it in half. */
      const bsGrid = el('div', 'bs-tiles');
      body.appendChild(bsGrid);
      // ===== BORDER (AM parity, keyframeable) =====
      // Reuses layer.stroke as the single border. position = inside/center/outside. For line/arc shapes
      // stroke is the LINE colour (not a border), so no border UI there. Group border = silhouette
      // dilation → outside only. size + colour are keyframeable (◆); position is a plain choice.
      const openKind = layer.type === 'shape' && ['line', 'arc'].indexOf(layer.shape) >= 0;
      /* …and MEDIA (queue 386 clause 1). Ezra: "Outlines should still be a toggle option on videos and
         clips, not just shadow". Video and image were excluded because the media draw path ignores
         `layer.stroke` — but it does not have to read it: `effectiveFx` now turns the toggle into the
         same alpha-outline `stroke` effect a group's border already becomes, so the card can offer the
         identical control here and it renders. */
      const canBorder = (layer.type === 'shape' && !openKind) || layer.type === 'text' || layer.type === 'group'
                        || layer.type === 'video' || layer.type === 'image';
      if (canBorder) {
        if (!layer.stroke) layer.stroke = { enabled: false, width: layer.type === 'text' ? 6 : 8, color: layer.type === 'text' ? '#000000' : '#ffffff' };
        const stk = layer.stroke;
        if (stk.position == null) stk.position = (layer.type === 'text' || layer.type === 'group') ? 'outside' : 'center';
        bsGrid.appendChild(bsTile('outline', 'Outline', stk.enabled, v => { stk.enabled = v; FM.requestRender(); FM.inspector.refresh(); }));
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
        bsGrid.appendChild(bsTile('trim', 'Trim path', !!(tp0 && tp0.enabled), v => {
          if (v) { if (!layer.trimPath) layer.trimPath = { enabled: true, start: 0, end: 1, offset: 0 }; else layer.trimPath.enabled = true; }
          else if (layer.trimPath) layer.trimPath.enabled = false;
          FM.requestRender(); FM.inspector.refresh();
        }));
        if (layer.trimPath && layer.trimPath.enabled) {
          const tp = layer.trimPath;
          body.appendChild(kfScaledRow(tp, 'start', 'Start', 0, 100, 1, 0, '%', 100));
          body.appendChild(kfScaledRow(tp, 'end', 'End', 0, 100, 1, 100, '%', 100));
          body.appendChild(kfScaledRow(tp, 'offset', 'Offset', 0, 100, 1, 0, '%', 100));
          body.appendChild(el('div', 'insp-hint', hasStroke ? 'Keyframe End 0→100% to draw the stroke on.' : 'Trim shows on the stroke — turn on Outline above.'));
        }
        // Dashes live inside the stroke object (created lazily on first enable).
        if (!layer.stroke) layer.stroke = { enabled: false, width: 8, color: '#ffffff' };
        const dstroke = layer.stroke;
        bsGrid.appendChild(bsTile('dashes', 'Dashes', !!(dstroke.dash && dstroke.dash.enabled), v => {
          if (v) { if (!dstroke.dash) dstroke.dash = { enabled: true, length: 12, gap: 8, offset: 0 }; else dstroke.dash.enabled = true; }
          else if (dstroke.dash) dstroke.dash.enabled = false;
          FM.requestRender(); FM.inspector.refresh();
        }));
        if (dstroke.dash && dstroke.dash.enabled) {
          const dh = dstroke.dash;
          body.appendChild(rangeRow('Length', () => dh.length, v => { dh.length = Math.max(0, v); }, 0, 100, 1));
          body.appendChild(rangeRow('Gap', () => dh.gap, v => { dh.gap = Math.max(0, v); }, 0, 100, 1));
          body.appendChild(kfNumRow(dh, 'offset', 'Offset', -200, 200, 1, 0, ''));
          if (!hasStroke) body.appendChild(el('div', 'insp-hint', 'Dashes show on the stroke — turn on Outline above.'));
        }
      }
      // ===== SHADOW (AM parity, keyframeable) =====
      /* dx/dy DEFAULT TO 0 (queue 386 clause 2). Ezra: "there needs to be a normal shadow not just the
         long drop one". Nothing was missing from the renderer — a shadow hugging the layer has always
         been one offset away — the problem was that every shadow anyone switched on STARTED at 8/8, so
         the only shadow the app ever showed you was the offset one. A new shadow is now the plain kind
         and the offset one is a tap away in the Style row below.
         Only NEW shadows: a layer that already carries a shadow object keeps the offsets saved in it,
         so nothing in an existing project moves. */
      if (!layer.shadow) layer.shadow = { enabled: false, blur: 16, dx: 0, dy: 0, color: '#000000', alpha: 100 };
      const sh = layer.shadow;
      if (sh.alpha == null) sh.alpha = 100;
      /* "Shadow", not "Drop shadow" — the toggle now turns on either kind, and the old label was half of
         why he thought the offset one was all there was. */
      bsGrid.appendChild(bsTile('shadow', 'Shadow', sh.enabled, v => { sh.enabled = v; FM.requestRender(); FM.inspector.refresh(); }));
      if (sh.enabled) {
        /* THE CHOICE, MADE VISIBLE. Position X/Y are still right there below and still keyframeable —
           this row does not replace them, it just means you do not have to know that a shadow becomes
           the normal kind by zeroing two sliders that are already at 8.
           Hidden while either offset is ANIMATED: writing a plain number over a keyframed property
           would silently throw the keyframes away, and someone animating the shadow's position has
           already answered the question this row asks. */
        const animated = p => p != null && typeof p === 'object';
        if (!animated(sh.dx) && !animated(sh.dy)) {
          body.appendChild(segRow('Style', [['soft', 'Soft'], ['drop', 'Drop']],
            () => ((sh.dx || 0) === 0 && (sh.dy || 0) === 0) ? 'soft' : 'drop',
            v => {
              if (v === 'soft') { sh.dx = 0; sh.dy = 0; }
              else if (!(sh.dx || sh.dy)) { sh.dx = 8; sh.dy = 8; }   // keep offsets the user chose himself
            }));
        }
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
        bsGrid.appendChild(bsTile('repeater', 'Repeater', !!(rp0 && rp0.enabled), v => {
          if (v) { if (!layer.repeater) layer.repeater = { enabled: true, copies: 3, offsetX: 40, offsetY: 0, rotation: 0, scale: 1, opacity: 1, anchorX: 0.5, anchorY: 0.5 }; else layer.repeater.enabled = true; }
          else if (layer.repeater) layer.repeater.enabled = false;
          FM.requestRender(); FM.inspector.refresh();
        }, true));   // wide: Repeater spans both columns so the grid does not end on a lonely half-tile
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
        /* DRAW-ON (queue 322, clause 2). Ezra: *"it has an option to change the start and end point, so
           you could do a cool effect with key frames to make it look like it's being drawn live"*.
           Keyframe Draw to from 0 to 100 and the line draws itself on.
           Open paths only. Trimming a CLOSED path turns a filled shape into a filled crescent, which is
           not what "start and end point" describes and is not what anyone reaching for this wants.
           kfNumRow rather than rangeRow, because keyframing is the entire feature — a static trim is a
           way to hide half your drawing. */
        if (layer.shape === 'path' && !layer.closed) {
          /* DRAW MORE (queue 322, clause 3). Ezra: *"there should be a button to re edit the drawing so
             you can draw more or erase"*. It re-opens the sketching tool ON this drawing rather than
             starting an empty one — new strokes join it, and the eraser can reach what is already
             there, which is the "or erase" half. */
          const more = el('button', 'btn', '✎  Draw more');
          more.style.cssText = 'width:100%;margin:2px 0 8px;';
          more.addEventListener('click', () => { if (FM.startDraw) FM.startDraw('freehand', { layerId: layer.id }); });
          body.appendChild(more);
          body.appendChild(el('div', 'insp-sub-label', 'Draw-on'));
          body.appendChild(kfNumRow(layer, 'trimStart', 'Draw from', 0, 100, 1, 0, '%'));
          body.appendChild(kfNumRow(layer, 'trimEnd', 'Draw to', 0, 100, 1, 100, '%'));
        }
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
        /* Read and write stroke.width through evalProp/setProp, NOT raw. Border & Shadow makes this
         * very field keyframable (kfNumRow(stk, 'width', …)), so it can legitimately hold a {kf:[…]}
         * container — and a raw binding did two destructive things with one. Reading it handed an
         * object to an <input type=range>, which silently substitutes the mid-range, so the row
         * showed a thumb at 30 and the literal text "[object Object]" whatever the layer's real
         * width was. Writing it REPLACED the container with a plain number: every border-size
         * keyframe destroyed, silently, on one nudge — verified, {kf:[{t:0,v:30},{t:1,v:2}]} became
         * 42. setProp assigns plainly when the property is static and upserts a keyframe when it is
         * animated, so the ordinary case is unchanged and the animated one stops being wiped. */
          body.appendChild(rangeRow('Line width', () => FM.evalProp(stk.width, FM.time),
            v => { FM.setProp(stk, 'width', Math.max(1, v), FM.time); }, 1, 60, 1));
        } else {
          body.appendChild(checkRow('Stroke', stk.enabled, v => { stk.enabled = v; FM.requestRender(); FM.inspector.refresh(); }));
          if (stk.enabled) {
            body.appendChild(rangeRow('Stroke width', () => FM.evalProp(stk.width, FM.time),
              v => { FM.setProp(stk, 'width', v, FM.time); }, 0, 60, 1));
            const sr = el('div', 'prop-row'); sr.appendChild(el('label', null, 'Stroke color'));
            /* Same defect on the colour channel, and the same fix. Raw, the {kf:[…]} object went
             * into normHex(), stringified to "[object object]", failed the hex regex and came back
             * #000000 — so the swatch misreported the layer before you touched it — and the first
             * pick assigned a bare string over the whole container, losing every colour keyframe. */
            sr.appendChild(colorField(() => FM.evalProp(stk.color, FM.time) || '#ffffff',
              v => { FM.setProp(stk, 'color', v, FM.time); }));
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

  /* ---- Which section owns the canvas overlay (queue 205) --------------------------------------
   * Ezra: "Make it so when you open move and transform it gets rid of the outline on the shape or
   * layer, and instead just shows the anchor point as a circle depending on where it is." And then:
   * "Same with when opening edit points."
   *
   * ONE rule rather than two special cases, which is what his second sentence asks for in effect:
   * some sections draw their own thing on the canvas, and when they do, the selection box is clutter
   * sitting on top of it. Move & Transform wants the anchor visible (it is what everything rotates
   * and scales around, and it was previously invisible unless you were in the anchor sub-mode); Edit
   * Points already draws its own handles. Two special cases would drift apart the first time a third
   * section joined them.
   * Returns the section key, so the caller can also decide what to draw INSTEAD — not just a bool. */
  /* Exposed for the suite (queue 367): the coloured Presets glyph, so "keep the same colours" can be
     checked against the REAL gradient rather than against a copy of it living in a test. Attached after
     FM.inspector exists — an earlier version ran at module-eval time, when it does not, and the guard
     silently skipped, which would have made the colour assertion a no-op. */
  FM._presetIcoSrc = function () { return ICO_PRESETS; };

  FM.inspector = {
    currentView() { return view; },   // read by the scrub probe (queue 768): which panel was open while he scrubbed
    _mergedStack: mergedStack,   // seam: the 560 tests drive the merged effects+masks list without a pointer drag
    /* Open the Effects card on a particular side (queue 317). The full-screen browsers own two of the
       three sides and have nowhere to put the third — Filters is a list of ready-made looks, not a grid
       of effect tiles — so they hand it back here rather than each growing their own copy of it.
       IT LIVES INSIDE THIS OBJECT rather than being assigned next to FM.fxModeToggle further up, which
       is where it was first written: that is ~2300 lines before `FM.inspector` exists, so it threw on
       load. A parse check does not catch that — only running it does. */
    openFxTab(key) {
      /* DELEGATES rather than setting fxTab itself, and the first version did not — it wrote
         `fxTab = 'filters'` and then called openCategory('effects'), which sets `fxTab = 'visual'` on
         its way past. The tab was correct for about a line. openCategory has carried the right mapping
         all along ('filters' and 'audiofx' both land on the Effects card with the matching side up), so
         this is a translation from the toggle's vocabulary to that one and nothing else. */
      this.openCategory(key === 'audio' ? 'audiofx' : key === 'filters' ? 'filters' : 'effects');
    },
    ownsCanvas() {
      if (view === 'transform') return 'transform';
      if (FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive()) return 'points';
      return null;
    },
    // The category list for a layer, exposed read-only for the suite. Which cards a layer offers is a
    // rule that has been got wrong by accident before — Camera Options leaked onto four layer kinds —
    // and it is invisible until someone opens the wrong layer and sees a card that does nothing.
    _catsFor(layer) { return catsFor(layer).slice(); },
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
    openCategory(key) { clearFilterPreview();   // queue 729: leaving the filters view drops an uncommitted selection AND its preview, the same way the effects browser's close() clears its own (queue 464)
      if (key === 'audiofx') { fxTab = 'audio'; key = 'effects'; } else if (key === 'filters') { fxTab = 'filters'; key = 'effects'; } else if (key === 'effects') { fxTab = 'visual'; } const layer = FM.selectedLayer(FM.scene); view = viewAllowed(layer, key) ? key : 'home'; kfNavSync(); FM._mtAxis = 'xy'; FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._opaEasing = null; FM._fxEasing = null; FM._cropEasing = false; this.refresh();
      /* The canvas overlay has to be told (queue 205). Opening a section that owns the canvas changes
         whether the selection box should be showing, and nothing else was going to ask — the overlay
         only updates on a render or a canvas gesture, so without this the outline stayed up until you
         happened to touch something. Found by a test, but it is a real defect, not a test artifact. */
      if (FM.canvasEdit && FM.canvasEdit.update) FM.canvasEdit.update();
    },
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
      view = cat.key; kfNavSync(); FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._opaEasing = null; FM._fxEasing = null; FM._cropEasing = false; this.refresh();
      return true;
    },
    // Step BACK one level (Esc / click-off): easing sub-view → its category, category → the grid,
    // grid → deselect. Returns true if it did something. (AM: Esc doesn't nuke the layer outright.)
    back() {
      const layer = FM.selectedLayer(FM.scene);
      if (!layer) return false;
      clearFilterPreview();   // queue 729: any way out of the filters view drops its preview
      /* ⚠️ `_opaEasing` BELONGS IN THIS GUARD, not just in the body below (queue 557). The body has
         always cleared all six; the CONDITION listed five. The opacity curve is the only one of them
         gated on its flag ALONE rather than on a `view`, so with just that editor open this test failed
         and fell through to the `view = 'home'` line — which changes the view, refreshes, and redraws
         the very editor it was asked to leave. Back did nothing, twice, and there was no way out. */
      if (FM._mtEasing || FM._volEasing || FM._spdEasing || FM._opaEasing || FM._fxEasing || FM._cropEasing) {
        FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._opaEasing = null; FM._fxEasing = null; FM._cropEasing = false; this.refresh(); return true;
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
      /* THE RAISED ADD MENU HAS TO COME BACK DOWN WHEN IT STOPS BEING THE ADD MENU (queue 511).
         Selecting a layer swaps this panel's contents, and a panel raised over the canvas would
         otherwise stay raised while showing something else entirely — with its drag handle hidden, so
         there is no way to lower it. See the note on FM.syncAddMenuFloat. Called here because this is
         the one path every selection change already goes through. */
      if (FM.syncAddMenuFloat) FM.syncAddMenuFloat();
      // The LABEL span, not the whole row — the row also holds the project-name field (v6.13), and
      // writing textContent on the row would delete it on the next refresh.
      const title = document.querySelector('#inspector-panel .panel-title-label');
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
      if (layer.id !== lastLayerId) { view = 'home'; clearFilterPreview(); lastLayerId = layer.id; kfClearSel(); FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._opaEasing = null; FM._fxEasing = null; FM._cropEasing = false; FM._camTab = 'view'; fxTab = 'visual'; }
      if (view !== 'home' && !viewAllowed(layer, view)) { view = 'home'; FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._opaEasing = null; FM._fxEasing = null; FM._cropEasing = false; FM._camTab = 'view'; }   // a category that doesn't apply to this layer (e.g. after a media replace) → drop to the grid
      // Every numbered category is a SINGLE-layer editor — it builds from the primary layer and writes
      // to it alone. Left open while a second clip is selected it silently edits one of them, so
      // selecting more drops straight back to the multi actions.
      if (view !== 'home' && FM.selectionIds && FM.selectionIds().length >= 2) { view = 'home'; FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._opaEasing = null; FM._fxEasing = null; FM._cropEasing = false; FM._camTab = 'view'; }
      /* A FLAG THE VIEW CANNOT HONOUR MUST NOT SURVIVE A REFRESH. The crop easing sub-view is gated on
       * layer.crop existing, and this panel deliberately does not create a crop just to show one — so a
       * _cropEasing left armed with no crop sat waiting and hijacked whatever refresh came next, the
       * moment a crop appeared. That is how tapping ◆ threw you out of the crop editor into an easing
       * graph. Cleared here, before the view is chosen, so it is dropped whatever route set it: the
       * button's own guard below is the message, this is the guarantee. */
      if (FM._cropEasing && !(layer && layer.crop)) FM._cropEasing = false;
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
        if (!multi) {
          root.appendChild(quickRow(layer)); root.appendChild(categoryGrid(layer));
        }
        else root.appendChild(alignRow());
      } else if (view === 'transform' && FM._mtEasing && FM.buildEasingEditor) {
        // Easing curve editor — an INLINE sub-view of Move & Transform (same sheet), not a screen.
        const back = el('button', 'cat-back', '‹  Position / Scale');
        back.addEventListener('click', () => { FM._mtEasing = false; FM.inspector.refresh(); });
        root.appendChild(back);
        const bodyEl = el('div', 'cat-body');
        bodyEl.appendChild(FM.buildEasingEditor(layer, FM._mtMode || 'move'));
        root.appendChild(bodyEl);
      } else if (FM._opaEasing && FM.buildEasingEditorFor) {
        /* Opacity easing curve — inline sub-view (queue 557), the same shape as Volume and Speed below.
           Not gated on a `view`, because opacity's row lives in the Mixing panel while the same control
           could reasonably be reached from elsewhere; the flag alone decides, and every panel switch
           already clears it beside _volEasing and _spdEasing. */
        const okey = FM._opaEasing.key || 'opacity';
        const back = el('button', 'cat-back', '‹  ' + (FM._opaEasing.label || 'Opacity'));
        back.addEventListener('click', () => { FM._opaEasing = null; FM.inspector.refresh(); });
        root.appendChild(back);
        const bodyEl = el('div', 'cat-body');
        bodyEl.appendChild(FM.buildEasingEditorFor(layer, () => layer.transform[okey], [okey], okey));
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
        back.addEventListener('click', () => { view = 'home'; clearFilterPreview(); FM._mtEasing = false; FM._volEasing = false; FM._spdEasing = false; FM._opaEasing = null; FM._fxEasing = null; FM._cropEasing = false; FM.inspector.refresh(); });
        // AM shows the crop controls (aspect lock + size origin) at the top-RIGHT of the Edit Shape
        // header — put them on the header row for media so they sit far right, not buried in the body.
        if (view === 'element' && (layer.type === 'video' || layer.type === 'image') && FM._inspectorCropToggles) {
          const head = el('div', 'cat-head-row');
          back.classList.add('cat-back-flex');
          head.appendChild(back);
          head.appendChild(FM._inspectorCropToggles(layer));
          root.appendChild(head);
        } else if (view === 'color' && FM.filters && FM.filters.all().length) {
          /* QUEUE 714. Ezra, with a screenshot of the full-width "✦ Filters →" row circled and a line drawn along
             the "‹ Colouring" row: "make the filters button on pc and mobile in the colouring menu smaller and fit
             on the row that i drew a line on". Same head-row the crop toggles already use, so the back link and
             the shortcut share one line on both layouts; the compact size is CSS on .cat-head-row. */
          const head = el('div', 'cat-head-row');
          back.classList.add('cat-back-flex');
          head.appendChild(back);
          head.appendChild(filterShortcut());
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
