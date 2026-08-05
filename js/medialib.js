/* FreeMotion — Media library.
 *
 * Why this exists: a web app CANNOT read your camera roll. There is no browser API for it on iOS
 * or anywhere else — the only way in is the file picker, by design. So instead of asking for the
 * picker every time, the app remembers every photo/video/audio file you have ever imported and
 * shows them as a grid in Add → Media. After the first import, your stuff is simply there: one tap
 * drops it on the timeline, no picker, no round trip through the Photos app.
 *
 * Storage: the blob is NOT copied. Importing already writes the file to IndexedDB under the layer's
 * id (storage.js save()), so an entry just points at that key — a library of 200 clips costs a few
 * KB of index, not a second copy of every video. FM.projects.pruneOrphans() is taught to keep any
 * key the library references, so deleting the project that first imported a file doesn't evict it.
 * Thumbnails are generated lazily on first display and cached at 'libthumb:<mid>'.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const INDEX = 'fm.medialib';
  const MAX = 300;                       // newest-first cap; the tail is dropped from the INDEX only
  const memThumb = new Map();            // mid -> dataURL (avoids re-reading IDB on every redraw)

  function readIndex() {
    try { const v = JSON.parse(localStorage.getItem(INDEX)); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function writeIndex(list) { try { localStorage.setItem(INDEX, JSON.stringify(list.slice(0, MAX))); } catch (e) {} }
  function newMid() { return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  // Same file re-imported → same entry. Name+size+mtime is what a File can tell us without reading it.
  function fingerprint(file) {
    if (!file) return '';
    return [file.name || '', file.size || 0, file.lastModified || 0].join('|');
  }

  FM.mediaLib = {
    // Newest first. Entries whose blob has since been evicted are filtered out (and forgotten).
    list() { return readIndex(); },

    // Called on every successful import. `key` is the IDB key the blob lives under (the layer id).
    add(rec, key) {
      if (!rec || !key || !rec.file) return null;
      const fp = fingerprint(rec.file);
      const list = readIndex();
      const hit = list.find(e => e.fp === fp);
      if (hit) {   // already known — just float it to the front and make sure the key is live
        hit.key = key; hit.added = Date.now();
        writeIndex([hit].concat(list.filter(e => e !== hit)));
        return hit.mid;
      }
      const entry = {
        mid: newMid(), key: key, fp: fp,
        name: rec.file.name || (rec.kind === 'video' ? 'Video' : 'Photo'),
        kind: rec.kind || 'image',
        w: rec.width || 0, h: rec.height || 0,
        dur: rec.kind === 'video' ? (rec.duration || 0) : 0,
        size: rec.file.size || 0,
        added: Date.now(),
      };
      writeIndex([entry].concat(list));
      return entry.mid;
    },

    // Every IDB key the library still points at — pruneOrphans must not sweep these.
    keys() { return readIndex().map(e => e.key).filter(Boolean); },

    async getFile(mid) {
      const e = readIndex().find(x => x.mid === mid);
      if (!e) return null;
      const rec = await FM.storage.readMedia(e.key);
      return rec && rec.file ? rec.file : null;
    },

    // Add this item to the timeline right now — the whole point of the library.
    async use(mid) {
      const e = readIndex().find(x => x.mid === mid);
      if (!e) return false;
      const file = await this.getFile(mid);
      if (!file) {   // the blob went away (project deleted before this shipped, storage cleared)
        this.remove(mid);
        if (FM.toast) FM.toast('That file is no longer stored — import it again');
        return false;
      }
      try {
        const loaded = e.kind === 'image' ? await FM.loadImageFile(file) : await FM.loadVideoFile(file);
        FM.addMediaLayer(loaded);
        return true;
      } catch (err) {
        if (FM.toast) FM.toast('Could not open that file');
        return false;
      }
    },

    // Thumbnail for the grid. Cached in memory, then IDB, and only decoded as a last resort.
    async getThumb(mid) {
      if (memThumb.has(mid)) return memThumb.get(mid);
      const e = readIndex().find(x => x.mid === mid);
      if (!e) return null;
      const cached = await FM.storage.readMedia('libthumb:' + mid);
      if (typeof cached === 'string' && cached) { memThumb.set(mid, cached); return cached; }
      const file = await this.getFile(mid);
      if (!file) return null;
      let url = null;
      try {
        const loaded = e.kind === 'image' ? await FM.loadImageFile(file) : await FM.loadVideoFile(file);
        url = makeThumb(loaded);
        if (loaded.url) URL.revokeObjectURL(loaded.url);   // this element was only ever for the thumbnail
      } catch (err) { return null; }
      if (url) { memThumb.set(mid, url); FM.storage.writeMedia('libthumb:' + mid, url); }
      return url;
    },

    remove(mid) {
      writeIndex(readIndex().filter(e => e.mid !== mid));
      memThumb.delete(mid);
      if (FM.storage && FM.storage.removeMedia) FM.storage.removeMedia('libthumb:' + mid);
      // the blob itself is left alone — pruneOrphans collects it if no project still uses it
    },

    clear() {
      readIndex().forEach(e => { if (FM.storage && FM.storage.removeMedia) FM.storage.removeMedia('libthumb:' + e.mid); });
      memThumb.clear();
      writeIndex([]);
    },

    // One-time sweep so the library isn't empty on the day it ships: every media layer in every
    // stored project becomes an entry, pointing at the blob that layer already owns.
    backfill() {
      try { if (localStorage.getItem('fm.medialibFilled')) return; } catch (e) { return; }
      const list = readIndex();
      const known = new Set(list.map(e => e.key));
      const found = [];
      for (let i = 0; i < localStorage.length; i++) {
        const lk = localStorage.key(i);
        if (!lk || lk.indexOf('fm.proj.') !== 0) continue;
        let doc = null;
        try { doc = JSON.parse(localStorage.getItem(lk)); } catch (e) { continue; }
        if (!doc || !Array.isArray(doc.layers)) continue;
        doc.layers.forEach(l => {
          if (!l || (l.type !== 'video' && l.type !== 'image')) return;
          if (known.has(l.id)) return;
          known.add(l.id);
          found.push({
            mid: newMid(), key: l.id, fp: '',
            name: l.name || (l.type === 'video' ? 'Video' : 'Photo'),
            kind: l.type, w: 0, h: 0, dur: l.duration || 0, size: 0,
            added: (l._added || 0) || Date.now() - 1,
          });
        });
      }
      if (found.length) writeIndex(found.concat(list));
      try { localStorage.setItem('fm.medialibFilled', '1'); } catch (e) {}
    },
  };

  // 200px JPEG from a loaded media record (image element or a seeked video element).
  function makeThumb(rec) {
    try {
      const src = rec.el;
      const sw = rec.width || src.videoWidth || src.naturalWidth || 0;
      const sh = rec.height || src.videoHeight || src.naturalHeight || 0;
      if (!sw || !sh) return null;
      const N = 200;
      const c = document.createElement('canvas');
      const scale = Math.min(N / sw, N / sh, 1);
      c.width = Math.max(1, Math.round(sw * scale));
      c.height = Math.max(1, Math.round(sh * scale));
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(src, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.72);
    } catch (e) { return null; }
  }
})(window.FM);
