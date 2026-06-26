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
        s.addEventListener('change', () => { c.start = Math.max(0, num(s.value, c.start)); if (c.end <= c.start) c.end = c.start + 0.1; FM.captionsEditor.mount(container, layer); FM.requestRender(); if (FM.history) FM.history.commit(); });
        const e = document.createElement('input'); e.type = 'number'; e.className = 'cap-time'; e.step = '0.1'; e.value = c.end; e.title = 'End (s)';
        e.addEventListener('input', () => { c.end = num(e.value, c.end); FM.requestRender(); });
        e.addEventListener('change', () => { c.end = num(e.value, c.end); if (c.end <= c.start) c.end = c.start + 0.1; FM.captionsEditor.mount(container, layer); FM.requestRender(); if (FM.history) FM.history.commit(); });
        const del = document.createElement('button'); del.className = 'cap-del'; del.textContent = '✕'; del.title = 'Remove segment';
        del.addEventListener('click', () => { layer.captions.splice(i, 1); FM.captionsEditor.mount(container, layer); FM.requestRender(); if (FM.history) FM.history.commit(); });
        const times = document.createElement('div'); times.className = 'cap-times'; times.append(s, e);
        row.append(t, times, del);
        container.appendChild(row);
      });
      const add = document.createElement('button'); add.className = 'btn cap-add'; add.textContent = '+ Add segment';
      add.addEventListener('click', () => {
        const last = layer.captions[layer.captions.length - 1];
        const start = last ? last.end : 0;
        layer.captions.push({ start: start, end: start + 2, text: 'Caption' });
        FM.captionsEditor.mount(container, layer); FM.requestRender(); if (FM.history) FM.history.commit();
      });
      container.appendChild(add);
    },
  };
})(window.FM);
