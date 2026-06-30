/* FreeMotion — Captions editor. Edits a text layer's time-ranged caption segments.
 * The compositor renders the segment active at the playhead (FM.activeCaption). Manual
 * entry now; an AI / whisper pass can fill the text of these segments later. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  function num(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; }

  FM.captionsEditor = {
    mount(container, layer) {
      container.innerHTML = '';
      if (!layer.captions) return;
      layer.captions.forEach((c, i) => {
        const row = document.createElement('div'); row.className = 'cap-row';
        const t = document.createElement('input'); t.type = 'text'; t.className = 'cap-text'; t.value = c.text; t.placeholder = 'Caption text'; t.spellcheck = false;
        t.addEventListener('input', () => { c.text = t.value; FM.requestRender(); });
        t.addEventListener('change', () => { if (FM.history) FM.history.commit(); });
        const s = document.createElement('input'); s.type = 'number'; s.className = 'cap-time'; s.step = '0.1'; s.value = c.start; s.title = 'Start (s)';
        s.addEventListener('input', () => { c.start = num(s.value, c.start); FM.requestRender(); });
        s.addEventListener('change', () => { const dur = layer.duration || 0; let v = Math.max(0, num(s.value, c.start)); if (dur > 0) v = Math.min(v, Math.max(0, dur - 0.1)); c.start = v; if (c.end <= c.start) c.end = (dur > 0) ? Math.min(c.start + 0.1, dur) : c.start + 0.1; FM.captionsEditor.mount(container, layer); FM.requestRender(); if (FM.history) FM.history.commit(); });
        const e = document.createElement('input'); e.type = 'number'; e.className = 'cap-time'; e.step = '0.1'; e.value = c.end; e.title = 'End (s)';
        e.addEventListener('input', () => { c.end = num(e.value, c.end); FM.requestRender(); });
        e.addEventListener('change', () => { const dur = layer.duration || 0; let v = num(e.value, c.end); if (dur > 0) v = Math.min(v, dur); c.end = v; if (c.end <= c.start) c.end = (dur > 0) ? Math.min(c.start + 0.1, dur) : c.start + 0.1; FM.captionsEditor.mount(container, layer); FM.requestRender(); if (FM.history) FM.history.commit(); });
        const del = document.createElement('button'); del.className = 'cap-del'; del.textContent = '✕'; del.title = 'Remove segment';
        del.addEventListener('click', () => { layer.captions.splice(i, 1); FM.captionsEditor.mount(container, layer); FM.requestRender(); if (FM.history) FM.history.commit(); });
        const times = document.createElement('div'); times.className = 'cap-times'; times.append(s, e);
        row.append(t, times, del);
        container.appendChild(row);
      });
      const add = document.createElement('button'); add.className = 'btn cap-add'; add.textContent = '+ Add segment';
      add.addEventListener('click', () => {
        const last = layer.captions[layer.captions.length - 1];
        const dur = layer.duration || 0;   // clamp into the clip so a new segment can't land entirely past the end (invisible)
        let start = last ? last.end : 0;
        if (dur > 0) start = Math.min(start, Math.max(0, dur - 0.1));
        const end = dur > 0 ? Math.min(start + 2, dur) : start + 2;
        layer.captions.push({ start: start, end: end, text: 'Caption' });
        FM.captionsEditor.mount(container, layer); FM.requestRender(); if (FM.history) FM.history.commit();
      });
      container.appendChild(add);
    },
  };
})(window.FM);
