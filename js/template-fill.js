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

  let root, cv, ctx, scrub, slotsEl, btnReplace, sel = null, raf = 0;

  // A template's replaceable clips are its media layers, in timeline order — which is the order you
  // watch them in, and therefore the order the row should read in.
  function slots() {
    return (FM.scene.layers || [])
      .filter(l => l && (l.type === 'video' || l.type === 'image'))
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
    const rec = FM.media && FM.media.get ? FM.media.get(layer.id) : null;
    const g = c.getContext('2d');
    g.fillStyle = '#0a0f16'; g.fillRect(0, 0, c.width, c.height);
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

  function select(layer) {
    sel = layer ? layer.id : null;
    [].forEach.call(slotsEl.querySelectorAll('.tfill-slot'), b => b.classList.toggle('is-sel', b.dataset.id === sel));
    if (btnReplace) btnReplace.disabled = !sel;
    if (layer) seek(layer.start || 0);
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
    if (!list.length) slotsEl.appendChild(el('div', 'tfill-none', 'This template has no video or image clips to replace.'));
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

    root.appendChild(el('div', 'tfill-lead', 'Tap to Replace with your Media'));
    slotsEl = el('div', 'tfill-slots');
    root.appendChild(slotsEl);

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
    /* Opened right after a template becomes a project. Returns false and shows nothing when there is
       nothing to fill — a template made only of text and shapes has no slots, and a screen that says
       "replace your media" over an empty row would be worse than not appearing. */
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
