/* FreeMotion — "Insert your Media": fill a template's clips with your own footage.
 *
 * QUEUE 343 clause 2. Ezra, with a screenshot of Alight Motion's version:
 *   "the long term goal for templates is to make it when you press on them you can quickly swap out
 *    the media for ur own clips so you can use them as templates and not just the exact same thing as
 *    elements"
 *
 * The swap itself already existed and is not re-implemented here: FM.replaceMedia(id) picks a file and
 * hands it to FM.replaceMediaWith, which keeps the layer's transform, keyframes, timing, effects and
 * masks and only re-clamps the trim to the new source's length. That is exactly "it takes that slot's
 * place and keeps the template's timing and effects". What was missing was the SCREEN — a way to see
 * which clips are yours to replace without hunting through the timeline for them.
 *
 * Following his reference shot rather than inventing a shape: the template plays at the top with a
 * scrub bar under it, then a row of slots — one per replaceable clip, each with its duration — and a
 * Replace Media button. Tapping a slot SELECTS it and seeks the preview to that clip, so you are
 * looking at the thing you are about to swap before you swap it; the button then opens the picker.
 * Two taps, and the second one is not blind.
 *
 * Nothing here writes to the scene except through FM.replaceMedia, so there is no new undo story to
 * get wrong: the swap commits exactly as it does from the layer ⋯ menu.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  let root, cv, ctx, scrub, slotsEl, btnReplace, textWrap, textIn, colorWrap, colorIn, sel = null, raf = 0;

  /* WHAT COUNTS AS A SLOT (queue 619, and this is the whole of that entry).
   * It used to be media layers ONLY, and `open()` returned false when there were none — with the
   * sound reasoning that "a screen that says 'replace your media' over an empty row would be worse
   * than not appearing." The reasoning was right and the OUTCOME was that the feature never once
   * appeared for Ezra, because HIS templates are text and shapes: the logo, the rects, the captions.
   * Measured at v13.68: text+shapes gave 0 slots and silence; adding one image gave 1 slot and a sheet.
   * He reported it twice as "templates just create themselves as a project", which from where he
   * stands is exactly what a correct-but-silent decision looks like.
   * So the fix is not a better message — it is to make his templates fillable. A template you cannot
   * change is an element, and his own words are that templates should be "not just the exact same
   * thing as elements". For a text-and-shape template the thing you change is the WORDS and the
   * COLOURS, so those are slots now, each with the control that actually edits it.
   * ⚠️ TEXT INSIDE A SHAPE-ONLY TEMPLATE STILL COUNTS: order is by timeline start, unchanged, because
   * that is the order you watch them in. */
  function kindOf(l) {
    if (!l) return null;
    if (l.type === 'video' || l.type === 'image') return 'media';
    if (l.type === 'text') return 'text';
    if (l.type === 'shape') return 'shape';
    return null;
  }
  function slots() {
    return (FM.scene.layers || [])
      .filter(l => l && kindOf(l) && l.visible !== false)
      .slice()
      .sort((a, b) => (a.start || 0) - (b.start || 0));
  }

  function dur(l) {
    const s = Math.max(0, +l.duration || 0);
    const m = Math.floor(s / 60), r = s - m * 60;
    return m ? m + ':' + (r < 10 ? '0' : '') + r.toFixed(0) : r.toFixed(1) + 's';
  }

  function paint(t) {
    if (!ctx || !root || root.classList.contains('hidden')) return;
    const P = FM.scene.project || { width: 1080, height: 1920 };
    const box = cv.parentElement.getBoundingClientRect();
    // Fit the composition into the preview box at its own aspect — a template can be any shape and a
    // stretched preview would misrepresent the thing you are filling.
    const s = Math.min(box.width / P.width, box.height / P.height) || 0.1;
    const w = Math.max(1, Math.round(P.width * s)), h = Math.max(1, Math.round(P.height * s));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    try { FM.renderScene(ctx, { project: P, layers: FM.scene.layers }, t); } catch (e) {}
  }

  function total() {
    return Math.max(0.1, +(FM.scene.project && FM.scene.project.duration) || 0.1);
  }

  function seek(t) {
    if (scrub) scrub.value = String(Math.max(0, Math.min(total(), t)));
    // One frame behind a rAF: dragging the scrub fires far faster than a composite can keep up, and
    // painting per input event is how a scrubber ends up feeling heavier than the thing it scrubs.
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; paint(+scrub.value || 0); });
  }

  function drawThumb(c, layer) {
    const g = c.getContext('2d');
    g.fillStyle = '#0a0f16'; g.fillRect(0, 0, c.width, c.height);
    /* A TEXT OR SHAPE SLOT HAS NO `rec.el` TO BLIT, so it is rendered — one layer, on its own, at the
       moment it starts. Without this every non-media chip is an identical dark square and the row
       stops telling you which slot is which, which is the one job the row has. */
    if (kindOf(layer) !== 'media') {
      const P = FM.scene.project || { width: 1080, height: 1920 };
      const s2 = Math.min(c.width / P.width, c.height / P.height) || 0.1;
      g.save();
      g.translate((c.width - P.width * s2) / 2, (c.height - P.height * s2) / 2);
      g.scale(s2, s2);
      try { FM.renderScene(g, { project: Object.assign({}, P, { background: null }), layers: [layer] }, (layer.start || 0) + 0.01); } catch (e) {}
      g.restore();
      return;
    }
    const rec = FM.media && FM.media.get ? FM.media.get(layer.id) : null;
    const src = rec && rec.el;
    if (!src) return;
    const sw = rec.width || src.videoWidth || src.naturalWidth || 0;
    const sh = rec.height || src.videoHeight || src.naturalHeight || 0;
    if (!sw || !sh) return;
    // cover, so a portrait clip in a landscape chip still reads as a picture rather than as two bars
    const s = Math.max(c.width / sw, c.height / sh);
    const dw = sw * s, dh = sh * s;
    try { g.drawImage(src, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh); } catch (e) {}
  }

  /* THE CONTROL FOLLOWS THE SLOT (queue 619). A file picker is the right answer for a clip and the
     wrong one for a caption — offering "Replace Media" on a text layer would be the same silence in a
     new costume. So exactly one control is shown, chosen by kind, and the others are removed from the
     DOM rather than hidden: a disabled button you cannot use is still a thing to read past. */
  function showControlFor(layer) {
    const kind = kindOf(layer);
    [btnReplace, textWrap, colorWrap].forEach(n => { if (n && n.parentNode) n.parentNode.removeChild(n); });
    if (!layer) { if (btnReplace) { btnReplace.disabled = true; root.appendChild(btnReplace); } return; }
    if (kind === 'media') { btnReplace.disabled = false; root.appendChild(btnReplace); return; }
    if (kind === 'text') {
      textIn.value = layer.text == null ? '' : String(layer.text);
      root.appendChild(textWrap);
      return;
    }
    if (kind === 'shape') {
      const f = layer.fill;
      colorIn.value = (typeof f === 'string' && /^#[0-9a-f]{6}$/i.test(f)) ? f : '#ffffff';
      root.appendChild(colorWrap);
    }
  }

  function select(layer) {
    sel = layer ? layer.id : null;
    [].forEach.call(slotsEl.querySelectorAll('.tfill-slot'), b => b.classList.toggle('is-sel', b.dataset.id === sel));
    showControlFor(layer);
    if (layer) seek(layer.start || 0);
  }

  // The chip must follow the edit, or the row still shows the template's words after you changed them.
  function refreshChip(id) {
    const b = slotsEl && slotsEl.querySelector('.tfill-slot[data-id="' + id + '"]');
    const c = b && b.querySelector('canvas');
    const l = FM.layerById ? FM.layerById(FM.scene, id) : null;
    if (c && l) drawThumb(c, l);
  }

  function drawSlots() {
    slotsEl.textContent = '';
    const list = slots();
    list.forEach((l, i) => {
      const b = el('button', 'tfill-slot'); b.type = 'button'; b.dataset.id = l.id;
      const c = document.createElement('canvas'); c.className = 'tfill-thumb'; c.width = 108; c.height = 108;
      drawThumb(c, l);
      b.appendChild(c);
      b.appendChild(el('span', 'tfill-slot-n', String(i + 1)));
      b.appendChild(el('span', 'tfill-slot-d', dur(l)));
      b.addEventListener('click', () => select(l));
      slotsEl.appendChild(b);
    });
    if (!list.length) slotsEl.appendChild(el('div', 'tfill-none', 'This template has nothing to fill in.'));
    return list;
  }

  function build() {
    root = el('div', 'tfill hidden'); root.id = 'tpl-fill';

    const top = el('div', 'tfill-top');
    top.appendChild(el('div', 'tfill-title', 'Insert your Media'));
    const done = el('button', 'tfill-done', 'Done'); done.type = 'button';
    done.addEventListener('click', close);
    top.appendChild(done);
    root.appendChild(top);

    const stage = el('div', 'tfill-stage');
    cv = document.createElement('canvas'); cv.className = 'tfill-cv';
    ctx = cv.getContext('2d');
    stage.appendChild(cv);
    root.appendChild(stage);

    scrub = document.createElement('input');
    scrub.type = 'range'; scrub.className = 'tfill-scrub';
    scrub.min = '0'; scrub.step = '0.02'; scrub.value = '0';
    scrub.setAttribute('aria-label', 'Scrub the template');
    scrub.addEventListener('input', () => seek(+scrub.value || 0));
    root.appendChild(scrub);

    root.appendChild(el('div', 'tfill-lead', 'Tap a slot to make it yours'));
    slotsEl = el('div', 'tfill-slots');
    root.appendChild(slotsEl);

    /* ---- the three controls, built once and swapped in by showControlFor ---- */
    textWrap = el('div', 'tfill-edit');
    textWrap.appendChild(el('label', 'tfill-edit-lab', 'Your words'));
    textIn = document.createElement('input');
    textIn.type = 'text'; textIn.className = 'tfill-edit-in';
    textIn.setAttribute('aria-label', 'Replace this template\u2019s text');
    /* Live on every keystroke, not on a Done press: this whole screen exists so you can SEE the
       template become yours, and a preview that only updates when you commit is a form, not a fill. */
    textIn.addEventListener('input', () => {
      const l = sel && FM.layerById ? FM.layerById(FM.scene, sel) : null;
      if (!l) return;
      l.text = textIn.value;
      if (FM.storage) FM.storage.markDirty();
      paint(+scrub.value || 0);
      refreshChip(l.id);
    });
    /* Commit to history ONCE, when the field is left — not per keystroke, which would make undo walk
       back through the caption letter by letter. */
    textIn.addEventListener('change', () => { if (FM.commitHistory) FM.commitHistory(); if (FM.storage) FM.storage.save(); });
    textWrap.appendChild(textIn);

    colorWrap = el('div', 'tfill-edit');
    colorWrap.appendChild(el('label', 'tfill-edit-lab', 'Your colour'));
    colorIn = document.createElement('input');
    colorIn.type = 'color'; colorIn.className = 'tfill-edit-col';
    colorIn.setAttribute('aria-label', 'Replace this shape\u2019s colour');
    colorIn.addEventListener('input', () => {
      const l = sel && FM.layerById ? FM.layerById(FM.scene, sel) : null;
      if (!l) return;
      l.fill = colorIn.value;
      if (FM.storage) FM.storage.markDirty();
      paint(+scrub.value || 0);
      refreshChip(l.id);
    });
    colorIn.addEventListener('change', () => { if (FM.commitHistory) FM.commitHistory(); if (FM.storage) FM.storage.save(); });
    colorWrap.appendChild(colorIn);

    btnReplace = el('button', 'tfill-replace', 'Replace Media'); btnReplace.type = 'button'; btnReplace.disabled = true;
    btnReplace.addEventListener('click', () => {
      if (!sel || !FM.replaceMedia) return;
      const id = sel;
      FM.replaceMedia(id);
      /* FM.replaceMedia is a file picker and resolves whenever the user gets round to it, with no
         callback to hang the refresh on. Rather than invent one and change a path four other things
         use, the row re-reads itself when the window comes back — which is exactly when a picker
         closes — and once more shortly after, for the case where the file was already to hand and the
         decode finished first. Cheap: it redraws six chips. */
      const again = () => { if (root && !root.classList.contains('hidden')) { drawSlots(); select(FM.layerById(FM.scene, id)); } };
      window.addEventListener('focus', again, { once: true });
      setTimeout(again, 1200);
    });
    root.appendChild(btnReplace);

    document.body.appendChild(root);
  }

  function close() {
    if (!root) return;
    root.classList.add('hidden');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    sel = null;
    if (FM.requestRender) FM.requestRender();   // the editor owns the canvas again
  }

  FM.templateFill = {
    /* Opened right after a template becomes a project. Still returns false when there is genuinely
       nothing to fill — but since queue 619 that means a template with no media, no text AND no
       shapes, which is very nearly an empty one. It used to mean "no media", and since his templates
       are text and shapes it returned false EVERY time and said nothing, which he reported twice as
       the feature not existing. */
    open() {
      if (!root) build();
      const list = drawSlots();
      if (!list.length) { close(); return false; }
      scrub.max = String(total());
      scrub.value = '0';
      root.classList.remove('hidden');
      select(list[0]);
      // after the overlay has a box to measure
      requestAnimationFrame(() => paint(+scrub.value || 0));
      return true;
    },
    close: close,
    isOpen() { return !!root && !root.classList.contains('hidden'); },
    // exposed for the suite: the slot list IS the feature, and it must be timeline-ordered media only
    _slots: slots,
  };
})(window.FM);
