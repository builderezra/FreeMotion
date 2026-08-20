/* FreeMotion — Captions.
 *
 * A caption TRACK is an ordinary text layer whose visible string comes from a timed list of cues
 * ({start, end, text}, in LAYER-LOCAL seconds) instead of layer.text. The compositor renders the
 * cue live at the playhead through the SAME text path as any other text layer (js/compositor.js →
 * FM.activeCaption), which is why every text control — font, colour, border, shadow, background
 * plate, animation, effects — works on captions for free, and why captions burn into the export
 * rather than being a preview-only overlay.
 *
 * This file owns:
 *   FM.captions.*        — the cue data model (add / move / trim / normalise / cue-at-playhead)
 *   FM.captionsEditor    — the list UI in the inspector + the editor's "Aa" sheet
 *   FM.captions.detect() — offline speech detection (js/captions-vad.js) → an empty cue grid
 *
 * Cue TEXT is edited by the real text editor (js/text-edit.js), not by a bespoke field: open it on
 * a caption track and it binds to the cue at the playhead, with ‹ › to walk the track.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const MIN_CUE = 0.10;          // s — a cue shorter than this is invisible and untrimmable
  const DEFAULT_CUE = 2.0;       // s — length of a cue created by hand

  function num(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  const C = {
    MIN_CUE: MIN_CUE,

    /* Is this layer a caption track? (a text layer that has cues) */
    isTrack(layer) {
      return !!layer && layer.type === 'text' && Array.isArray(layer.captions) && layer.captions.length > 0;
    },
    cues(layer) { return (layer && Array.isArray(layer.captions)) ? layer.captions : []; },

    /* Project time -> layer-local time. Cue times are local, so cues travel with the clip when it is
     * moved or trimmed on the timeline — the same contract keyframes deliberately do NOT have. */
    localTime(layer, t) { return (t == null ? (FM.time || 0) : t) - (layer.start || 0); },

    /* Index of the cue live at project time t, or -1. Ties go to the LATER start, matching
     * FM.activeCaption in js/scene.js — one source of truth for "which cue is showing". */
    indexAt(layer, t) {
      const cues = C.cues(layer), lt = C.localTime(layer, t);
      let hit = -1;
      for (let i = 0; i < cues.length; i++) {
        const c = cues[i];
        if (lt >= c.start && lt < c.end && (hit < 0 || c.start > cues[hit].start)) hit = i;
      }
      return hit;
    },
    cueAt(layer, t) { const i = C.indexAt(layer, t); return i < 0 ? null : C.cues(layer)[i]; },

    /* The cue nearest project time t (used when the playhead sits in a gap). */
    nearestIndex(layer, t) {
      const cues = C.cues(layer), lt = C.localTime(layer, t);
      let best = -1, bd = Infinity;
      for (let i = 0; i < cues.length; i++) {
        const c = cues[i];
        const d = lt < c.start ? c.start - lt : lt > c.end ? lt - c.end : 0;
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    },

    /* Sort by start and keep every cue inside the clip with a usable length. Called after any edit
     * that can reorder or overshoot; it never merges or deletes, so nothing disappears silently. */
    normalize(layer) {
      const cues = C.cues(layer);
      const dur = layer.duration > 0 ? layer.duration : Infinity;
      cues.forEach(c => {
        c.start = clamp(num(c.start, 0), 0, isFinite(dur) ? Math.max(0, dur - MIN_CUE) : 1e9);
        c.end = num(c.end, c.start + MIN_CUE);
        if (isFinite(dur)) c.end = Math.min(c.end, dur);
        if (c.end < c.start + MIN_CUE) c.end = Math.min(c.start + MIN_CUE, isFinite(dur) ? dur : c.start + MIN_CUE);
        if (typeof c.text !== 'string') c.text = String(c.text == null ? '' : c.text);
      });
      cues.sort((a, b) => a.start - b.start || a.end - b.end);
      return cues;
    },

    /* Add a cue at layer-local `at`, sized so it does not swallow the next one. Returns its index. */
    addCue(layer, at, text) {
      if (!Array.isArray(layer.captions)) layer.captions = [];
      const dur = layer.duration > 0 ? layer.duration : (at + DEFAULT_CUE);
      let start = clamp(num(at, 0), 0, Math.max(0, dur - MIN_CUE));
      // Landing INSIDE an existing cue would hide it: two overlapping cues resolve to the later
      // start, so the new (empty) one would silently blank the old one's words. Slide past it.
      C.cues(layer).forEach(c => { if (start >= c.start - 1e-6 && start < c.end - 1e-6) start = Math.min(c.end, Math.max(0, dur - MIN_CUE)); });
      let end = Math.min(start + DEFAULT_CUE, dur);
      // don't overlap the next cue that starts after us
      let nextStart = Infinity;
      C.cues(layer).forEach(c => { if (c.start > start + 1e-6 && c.start < nextStart) nextStart = c.start; });
      if (isFinite(nextStart)) end = Math.min(end, Math.max(start + MIN_CUE, nextStart));
      if (end < start + MIN_CUE) end = start + MIN_CUE;
      const cue = { start: +start.toFixed(3), end: +end.toFixed(3), text: text == null ? '' : String(text) };
      layer.captions.push(cue);
      C.normalize(layer);
      return layer.captions.indexOf(cue);
    },

    /* Turn a plain text layer into a caption track, carrying its current text into cue 1. */
    makeTrack(layer) {
      const dur = layer.duration > 0 ? layer.duration : DEFAULT_CUE;
      layer.captions = [{ start: 0, end: Math.min(DEFAULT_CUE, dur), text: layer.text || '' }];
      layer.text = '';
      return layer.captions;
    },

    /* Every layer in the project whose media could be analysed for speech. Audio-only imports become
     * 'video' layers with no picture, which is also what the exporter's mixer keys off. */
    audioSources() {
      return (FM.scene ? FM.scene.layers : []).filter(l => {
        if (l.type !== 'video') return false;
        const m = FM.media.get(l.id);
        return !!(m && m.file);
      });
    },

    /* Source-buffer seconds -> caption-layer-local seconds, honouring the source clip's position,
     * trim and speed. Without this the cues land at the wrong place on any trimmed or sped-up clip. */
    sourceToLocal(capLayer, srcLayer, bufT) {
      const trim = srcLayer.trimStart || 0;
      const ramped = FM.isAnimated && FM.isAnimated(srcLayer.speed);
      // A ramped clip's mapping is the integral, not a divide; approximate with its average rate,
      // exactly as the exporter's audio mixer does for the same reason.
      const sp = ramped
        ? (FM.layerSourceAdvance(srcLayer, srcLayer.duration) / Math.max(0.01, srcLayer.duration))
        : FM.speedAt(srcLayer, srcLayer.start);   // THROUGH speedAt (queue 451): a malformed prop is an object, and the divide below would be NaN
      const projT = (srcLayer.start || 0) + (bufT - trim) / Math.max(0.01, sp);
      return projT - (capLayer.start || 0);
    },

    /* WHERE THE DETECTED CUES ARE ALLOWED TO LAND (queue 150).
     *
     * Ezra asked for "a choice between only detecting where the captions are added in the project or
     * detecting the whole project or detecting a specific audio layer then let you select it". The
     * first two are this function: the detector always reads the whole source clip, so the choice is
     * about which of its findings survive.
     *   'clip'    — keep only what falls inside the caption clip you already placed. What it has always
     *               done, and right when you have deliberately put the captions over one section.
     *   'project' — keep everything, and MOVE AND GROW the caption clip to cover it. Speech before the
     *               caption clip's start would otherwise be silently thrown away, which is the case
     *               "detect the whole project" exists for.
     * Pure and exported so the arithmetic can be tested without decoding audio — the same reasoning as
     * the exporter's fit rect. Returns the cues in the layer's NEW local time, plus where that layer
     * has to move and how long it has to be. */
    fitCues(capLayer, raw, mode) {
      const out = { cues: [], start: capLayer.start || 0, duration: capLayer.duration || 0 };
      if (!raw || !raw.length) return out;
      if (mode !== 'project') {
        const dur = capLayer.duration > 0 ? capLayer.duration : Infinity;
        raw.forEach(c => {
          let a = c.a, b = c.b;
          if (isFinite(dur)) { a = clamp(a, 0, dur); b = clamp(b, 0, dur); }
          else a = Math.max(0, a);
          if (b - a >= MIN_CUE) out.cues.push({ a: a, b: b, text: c.text });
        });
        return out;
      }
      /* Whole project. A cue at a negative local time means the speech starts BEFORE the caption clip
       * does, so the clip has to move back to meet it — and every cue re-bases by the same shift, or
       * they all slide by however far it moved. */
      let minA = 0, maxB = 0;
      raw.forEach(c => { if (c.a < minA) minA = c.a; if (c.b > maxB) maxB = c.b; });
      const shift = minA < 0 ? -minA : 0;
      raw.forEach(c => {
        const a = c.a + shift, b = c.b + shift;
        if (b - a >= MIN_CUE) out.cues.push({ a: a, b: b, text: c.text });
      });
      out.start = (capLayer.start || 0) - shift;
      out.duration = Math.max(capLayer.duration || 0, maxB + shift);
      return out;
    },

    /* Run the detector over a source clip's audio and lay down EMPTY cues at every stretch of speech.
     * Existing cue text is carried onto whichever new cue overlaps it most, so re-running the
     * detector after typing does not throw the words away.
     * Returns { count, stats } or throws. */
    async detect(capLayer, srcLayer, onProgress, mode) {
      if (!FM.decodeAudio || !FM.detectSpeech) throw new Error('speech detection unavailable');
      const m = FM.media.get(srcLayer.id);
      if (!m || !m.file) throw new Error('that clip has no media file');
      // 8 kHz: ample for voice activity, and ~6x smaller than a device-rate decode. Full-rate decoding
      // measured 439 MB for 20 minutes (js/media.js) and killed the tab.
      const buf = await FM.decodeAudio(m.file, { rate: 8000 });
      if (!buf) throw new Error('no decodable audio in that clip');
      const res = await FM.detectSpeech(buf, { onProgress: onProgress });

      const dur = capLayer.duration > 0 ? capLayer.duration : Infinity;
      const old = C.cues(capLayer).filter(c => (c.text || '').trim());
      // Detecting on a PLAIN text layer converts it. Its existing string is real user work, so it
      // rides along as a whole-clip pseudo-cue and lands on the first detected cue.
      if (!old.length && (capLayer.text || '').trim()) old.push({ start: 0, end: isFinite(dur) ? dur : 1e9, text: capLayer.text });
      // Every finding in the caption layer's local time, before any decision about what to keep.
      const raw = res.segments.map(s => ({
        a: C.sourceToLocal(capLayer, srcLayer, s.start),
        b: C.sourceToLocal(capLayer, srcLayer, s.end),
      }));
      const fit = C.fitCues(capLayer, raw, mode);
      const used = new Set();
      const cues = [];
      fit.cues.forEach(c => {
        const a = c.a, b = c.b;
        // carry over the best-overlapping old text
        let bestI = -1, bestOv = 0;
        old.forEach((o, i) => {
          if (used.has(i)) return;
          const ov = Math.min(b, o.end) - Math.max(a, o.start);
          if (ov > bestOv) { bestOv = ov; bestI = i; }
        });
        let text = '';
        if (bestI >= 0) { text = old[bestI].text; used.add(bestI); }
        cues.push({ start: +a.toFixed(3), end: +b.toFixed(3), text: text });
      });
      if (!cues.length) return { count: 0, stats: res.stats };
      capLayer.start = fit.start;
      capLayer.duration = fit.duration;
      capLayer.captions = cues;
      capLayer.text = '';
      C.normalize(capLayer);
      return { count: cues.length, stats: res.stats };
    },
  };
  FM.captions = C;

  /* ---------------- the cue list UI ---------------- */

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function commitH() { if (FM.history) FM.history.commit(); }
  function refreshAll(container, layer) {
    FM.captionsEditor.mount(container, layer);
    FM.requestRender();
    if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
  }

  FM.captionsEditor = {
    mount(container, layer) {
      container.innerHTML = '';
      if (!layer || !Array.isArray(layer.captions)) return;

      // Detection FIRST. It is the reason to use captions at all, and the Aa sheet is a 46vh
      // scroller — parked under a long cue list on a phone it sat below the fold, unfound.
      container.appendChild(FM.captionsEditor.detectRow(layer, () => refreshAll(container, layer)));

      layer.captions.forEach((c, i) => {
        const row = el('div', 'cap-row');

        // TEXT: a button, not a field. Cue text is typed in the REAL text editor (same font/size/
        // colour controls as any other text, and ‹ › to walk the track) — one text-entry surface,
        // not a second bespoke one that quietly behaves differently.
        const t = el('button', 'cap-text' + ((c.text || '').trim() ? '' : ' cap-empty'));
        t.type = 'button';
        t.textContent = (c.text || '').trim() || 'Empty — tap to type';   // textContent: cue text is user data, never innerHTML
        t.title = 'Edit this cue’s text';
        t.addEventListener('click', () => {
          if (FM.scrubTime) FM.scrubTime((layer.start || 0) + c.start + Math.min(0.05, (c.end - c.start) / 2));
          if (FM.selectLayer) FM.selectLayer(layer.id);
          if (FM.textEdit) FM.textEdit.start(layer.id, { selectAll: true });
        });

        const s = document.createElement('input');
        s.type = 'number'; s.className = 'cap-time'; s.step = '0.1'; s.value = c.start; s.title = 'Start (s)';
        s.addEventListener('input', () => { c.start = num(s.value, c.start); FM.requestRender(); });
        s.addEventListener('change', () => {
          c.start = num(s.value, c.start);
          C.normalize(layer); refreshAll(container, layer); commitH();
        });

        const e = document.createElement('input');
        e.type = 'number'; e.className = 'cap-time'; e.step = '0.1'; e.value = c.end; e.title = 'End (s)';
        e.addEventListener('input', () => { c.end = num(e.value, c.end); FM.requestRender(); });
        e.addEventListener('change', () => {
          c.end = num(e.value, c.end);
          C.normalize(layer); refreshAll(container, layer); commitH();
        });

        const del = el('button', 'cap-del', '✕'); del.title = 'Remove cue';
        del.addEventListener('click', () => { layer.captions.splice(i, 1); refreshAll(container, layer); commitH(); });

        const times = el('div', 'cap-times'); times.append(s, e);
        row.append(t, times, del);
        container.appendChild(row);
      });

      const add = el('button', 'btn cap-add', '+ Add cue at playhead');
      add.addEventListener('click', () => {
        C.addCue(layer, Math.max(0, C.localTime(layer, FM.time)));
        refreshAll(container, layer); commitH();
      });
      container.appendChild(add);
    },

    /* The speech-detection control: a source picker (only when there is a choice) + the button. */
    detectRow(layer, rerender) {
      const wrap = el('div', 'cap-detect');
      const sources = C.audioSources();
      /* THE SCOPE PICKER (queue 150). Ezra: "it should have a choice between only detecting where the
       * captions are added in the project or detecting the whole project or detecting a specific audio
       * layer then let you select it."
       * The third is not a convenience, it is the FIX, and #152's measurement is what says so: the
       * detector holds up against a music bed 18 dB down and collapses once music comes within 12 dB
       * of the voice — 2 of 3 utterances at −12 dB, none at −6. Pointing it at the voice track instead
       * of the finished mix is the difference between three cues and zero. So it is a listed choice
       * rather than a dropdown you have to notice. */
      const scope = document.createElement('select');
      scope.className = 'cap-scope';
      [['clip', 'Just this caption clip'], ['project', 'The whole project'], ['source', 'One audio clip…']]
        .forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; if (v === (FM._capScope || 'clip')) o.selected = true; scope.appendChild(o); });
      wrap.appendChild(scope);

      let sel = null;
      if (sources.length) {
        sel = document.createElement('select');
        sel.className = 'cap-src';
        sources.forEach(l => { const o = document.createElement('option'); o.value = l.id; o.textContent = l.name || 'Clip'; if (l.id === FM._capSrcId) o.selected = true; sel.appendChild(o); });
        sel.addEventListener('change', () => { FM._capSrcId = sel.value; });   // transient: never serialized with the project
        wrap.appendChild(sel);
      }
      // The clip picker belongs to the third choice only — showing it beside the other two would ask
      // you to answer a question those modes do not have.
      const syncScope = () => {
        FM._capScope = scope.value;
        if (sel) sel.classList.toggle('hidden', scope.value !== 'source');
      };
      scope.addEventListener('change', syncScope);
      syncScope();
      const btn = el('button', 'btn cap-detect-btn', '🎙 Detect speech');
      btn.title = 'Find where someone is talking and lay down empty cues at those times — all on this device';
      if (!sources.length) { btn.disabled = true; btn.title = 'Import a video or audio clip first — detection reads that clip’s audio'; }
      btn.addEventListener('click', async () => {
        const mode = scope.value;
        const chosen = (mode === 'source' && sel) ? sel.value : (FM._capSrcId || (sources[0] && sources[0].id));
        const src = sources.find(l => l.id === chosen) || sources[0];
        if (!src) return;
        /* WHICH CLIPS TO TRY, and why the order is what it is. On the two whole-scope modes, a clip
         * that turns up nothing is not the end of the answer — the next clip might be the voice track.
         * #150's note asks for the source to "default to the most voice-like", and the honest way to
         * know that is the level distribution the detector already returns... which means decoding.
         * Decoding every clip up front is the expensive half of the whole operation, so instead the
         * fallback is LAZY: try the chosen clip, and only if it finds nothing walk the rest. It costs
         * extra exactly when the user would otherwise be stuck with "no speech found" and no idea that
         * another clip was an option. On 'source' he has named the clip, so his choice is respected
         * and nothing else is touched. */
        const queue = (mode === 'source') ? [src] : [src].concat(sources.filter(l => l.id !== src.id));
        btn.disabled = true;
        const label = btn.textContent;
        btn.textContent = 'Decoding…';
        try {
          let r = null, used = src, tried = 0;
          for (const cand of queue) {
            tried++;
            const tag = queue.length > 1 ? ' (' + tried + '/' + queue.length + ')' : '';
            r = await C.detect(layer, cand, p => { btn.textContent = 'Listening…' + tag + ' ' + Math.round(p * 100) + '%'; }, mode);
            used = cand;
            if (r.count) break;
          }
          btn.textContent = label; btn.disabled = false;
          const src2 = used;
          if (!r.count) {
            /* WHY it found nothing, not just that it did (queue 152). Ezra: "im pretty sure the auto
               detect speaking and auto make the captions doesnt work… would be better to not add it
               then add a shit version." Measured against real synthesised speech (tests/_vadreal.html,
               fixtures in tests/_fixtures/vad) the detector is fine — 3/3 utterances on a clean voice
               within ~100 ms, still 3/3 with a music bed 18 dB down. It collapses once the music comes
               within 12 dB of the voice: 2/3 at −12 dB, 0/3 at −6 dB. It does NOT invent cues on music
               with no speech in it, which is the failure that would actually be unforgivable.
               So the feature works and the report is still true from where he is standing: he points it
               at a SONG, gets "no speech found", and reads that as broken. The level distribution says
               exactly which case it is — a voice makes the level swing (clipDbStd 100 on clean speech),
               a music bed does not (0.18 with no voice, 0.95 at −6 dB, against 4.5 at −18 dB where
               detection still worked). Under 3 is music with a wide margin either side. */
            const nm = String(src2.name || 'that clip');
            const shortNm = nm.length > 16 ? nm.slice(0, 15) + '…' : nm;
            const st = r.stats || {};
            const musicLike = typeof st.clipDbStd === 'number' && st.clipDbStd < 3;
            if (FM.toast) {
              FM.toast(musicLike
                ? 'No speech in “' + shortNm + '” — that reads as music, not talking'
                : 'No speech found in “' + shortNm + '”', musicLike ? 5000 : 3000);
            }
            try { console.info('FreeMotion speech detection found nothing in “' + nm + '”:', st); } catch (e) {}
          } else {
            commitH();
            if (FM.toast) FM.toast(r.count + ' cue' + (r.count === 1 ? '' : 's') + ' from “' + (src2.name || 'clip') + '” — tap one to type');
          }
          if (rerender) rerender(); else FM.requestRender();
          if (FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();
          if (FM.inspector) FM.inspector.refresh();
        } catch (err) {
          btn.textContent = label; btn.disabled = false;
          if (FM.toast) FM.toast('Speech detection failed: ' + (err && err.message || err));
        }
      });
      wrap.appendChild(btn);
      return wrap;
    },
  };
})(window.FM);
