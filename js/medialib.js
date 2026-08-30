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
 * Thumbnails are generated lazily on first display (after waiting for a real decoded frame —
 * see frameReady) and cached at 'libthumb2:<mid>'.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const INDEX = 'fm.medialib';
  // v2 prefix: v1 ('libthumb:') cached solid-black tiles for every video, because the frame hadn't
  // decoded when it was drawn. Renaming the namespace retires those permanently — pruneOrphans no
  // longer protects the old prefix, so the poisoned entries get swept on the next boot.
  const THUMB = 'libthumb2:';
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
    // Newest first. Entries are NOT verified here (that would mean an IDB read per tile on every
    // redraw) — a tile whose blob has gone is dropped when it's tapped or its thumbnail is built.
    list() { return readIndex(); },

    // Called on every successful import. `key` is the IDB key the blob lives under (the layer id).
    add(rec, key) {
      if (!rec || !key || !rec.file) return null;
      const fp = fingerprint(rec.file);
      const list = readIndex();
      const hit = list.find(e => e.fp === fp);
      if (hit) {
        // Already known — float it to the front, but DON'T repoint it at this import's blob. The
        // old anchor may live in a project the user is keeping; re-pointing it at a copy inside a
        // project they later delete would take the library entry down with it.
        hit.added = Date.now();
        if (!hit.key) hit.key = key;
        writeIndex([hit].concat(list.filter(e => e !== hit)));
        return hit.mid;
      }
      // A song imports through the VIDEO path (an mp3 is a <video> with a 0×0 picture), so `kind`
      // alone can't tell a track from a clip. Record it, so the Add menu can file songs under Audio
      // instead of burying them among the video thumbnails (Ezra).
      /* A DIMENSIONLESS VIDEO IS A MEASUREMENT THAT FAILED, NOT A SONG (#686). "No picture" was the
       * only evidence used here, and it is not sufficient: js/media.js reports width from
       * el.videoWidth, which is 0 whenever metadata has not arrived by the time finish() runs — the
       * timeout path, and the MediaRecorder-webm path the file above already flags as "Infinity until
       * forced". A screen recording is exactly that shape. The verdict was then written as an EXPLICIT
       * `audio: true`, and isAudio() gives an explicit flag priority ON PURPOSE, so the row could
       * never be healed: it sat under Add → Audio with a music note, permanently, and the clip was
       * simply not where he would look for it.
       * The corroborating evidence was in hand the whole time and never asked for — the File's own
       * type and name. A file the OS calls a video is never filed as a song just because this app
       * could not measure it. A file with no type and no dimensions still falls through to the old
       * heuristic, because for that genuinely ambiguous case the old guess is the right one. */
      /* ⚠️ THE MIME TYPE OUTRANKS THE EXTENSION, and .webm is why. It is a container used for BOTH
       * audio and video, so a voice memo recorded in the app arrives as `audio/webm` with a .webm
       * name — and an extension-first test calls that a video and buries his recordings in the Media
       * tab. The existing voice-import test caught exactly that. The extension is the FALLBACK, for
       * the case the type is missing or unhelpful; a file that states it is audio is audio. */
      const fname = rec.file.name || '', ftype = rec.file.type || '';
      const saysAudio = /^audio\//i.test(ftype);
      const saysVideo = !saysAudio && (/^video\//i.test(ftype) || /\.(mp4|m4v|mov|webm|mkv|avi|3gp)$/i.test(fname));
      const isAud = (rec.kind || 'image') !== 'image' && !(rec.width > 0 && rec.height > 0) && !saysVideo;
      const entry = {
        mid: newMid(), key: key, fp: fp,
        name: rec.file.name || (isAud ? 'Audio' : rec.kind === 'video' ? 'Video' : 'Photo'),
        kind: rec.kind || 'image',
        type: ftype,
        audio: isAud,
        w: rec.width || 0, h: rec.height || 0,
        dur: rec.kind === 'video' ? (rec.duration || 0) : 0,
        size: rec.file.size || 0,
        added: Date.now(),
      };
      writeIndex([entry].concat(list));
      return entry.mid;
    },

    // Is this entry a song? Entries written before the `audio` flag existed are recognised by the
    // shape they already have: not an image, and no picture dimensions.
    /* An explicit flag WINS, in both directions. It used to be `e.audio === true || <shape guess>`,
     * so writing `audio: false` on a row changed nothing — the guess ran anyway and a dimensionless
     * video was still called a song. Caught by the test for the backfill fix, which is the only
     * reason that fix is not inert. The shape heuristic now applies ONLY where the flag is absent,
     * which is exactly what it was written for: rows saved before the flag existed. */
    isAudio(e) { return !!e && (e.audio === true || (e.audio === undefined && e.kind !== 'image' && !e.w && !e.h)); },

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
      if (this.isAudio(e)) return null;   // no picture to grab — don't decode a whole song for a blank tile
      const cached = await FM.storage.readMedia(THUMB + mid);
      if (typeof cached === 'string' && cached) { memThumb.set(mid, cached); return cached; }
      const file = await this.getFile(mid);
      if (!file) return null;
      let url = null;
      try {
        const loaded = e.kind === 'image' ? await FM.loadImageFile(file) : await FM.loadVideoFile(file);
        // loadVideoFile resolves at 'loadedmetadata' (readyState 1) — drawing a video that has no
        // decoded frame yet paints NOTHING, which used to bake a solid black tile into the cache
        // forever. Wait for a real frame first, and bail rather than cache a blank.
        const ok = e.kind === 'image' ? true : await frameReady(loaded.el);
        this._learn(mid, loaded.width, loaded.height);   // backfilled rows learn what they actually are
        url = ok ? makeThumb(loaded) : null;
        if (loaded.url) URL.revokeObjectURL(loaded.url);   // this element was only ever for the thumbnail
      } catch (err) { return null; }
      if (url) { memThumb.set(mid, url); FM.storage.writeMedia(THUMB + mid, url); }
      return url;
    },

    /* Write back what a decode just taught us about a backfilled entry, so the guess above becomes a
       fact. A backfilled row has w:0/h:0 and no idea whether it is a clip or a song; the moment its
       file is actually loaded we know both. Songs land back under Audio, clips keep their real size.
       Only ever touches rows that still have no dimensions, so a real import is never rewritten. */
    _learn(mid, width, height) {
      const list = readIndex();
      const e = list.find(x => x.mid === mid);
      if (!e || e.fp !== '' || (e.w && e.h)) return false;
      const isSong = !(width > 0 && height > 0);
      e.w = width || 0; e.h = height || 0; e.audio = isSong;
      writeIndex(list);
      return true;
    },

    remove(mid) {
      writeIndex(readIndex().filter(e => e.mid !== mid));
      memThumb.delete(mid);
      if (FM.storage && FM.storage.removeMedia) FM.storage.removeMedia(THUMB + mid);
      // the blob itself is left alone — pruneOrphans collects it if no project still uses it
    },

    // How much history is remembered, split the way the Add menu splits it: songs are one tab, clips
    // and photos are another. Settings labels its two Clear buttons from this, so you can see what a
    // press is about to forget without opening the Add menu to count tiles.
    counts() {
      let audio = 0, visual = 0;
      readIndex().forEach(e => { if (FM.mediaLib.isAudio(e)) audio++; else visual++; });
      return { audio: audio, visual: visual, total: audio + visual };
    },

    // Forget imported files. `kind` is 'audio' | 'visual', or nothing for the lot. Returns how many
    // entries went, so a caller can say so.
    //
    // What this does NOT do is delete your media. An entry is a POINTER at a blob some project's layer
    // already owns (see the header) — dropping the pointer only takes away the one-tap shortcut. Any
    // project using that file keeps it, because pruneOrphans keeps every key a project references;
    // a blob no project references is collected on the next sweep, which is what you wanted anyway if
    // you are clearing the history. Nothing here can reach into a project and empty a layer.
    clear(kind) {
      const list = readIndex();
      const goes = e => !kind || (FM.mediaLib.isAudio(e) ? 'audio' : 'visual') === kind;
      const gone = list.filter(goes);
      gone.forEach(e => {
        memThumb.delete(e.mid);
        if (FM.storage && FM.storage.removeMedia) FM.storage.removeMedia(THUMB + e.mid);
      });
      writeIndex(list.filter(e => !goes(e)));
      return gone.length;
    },

    // One-time sweep so the library isn't empty on the day it ships: every media layer in every
    // stored project becomes an entry, pointing at the blob that layer already owns.
    /* Heal an index that backfill already poisoned, once. Targets `fp === ''` — backfill's own
       marker — so it CANNOT touch a real import, which always carries a fingerprint from add(). That
       is what makes this safe: a genuine song imported normally has audio:true and a real fp, and is
       never considered here. Entries that really are songs get corrected back by getThumb the first
       time their tile is drawn. */
    repairBackfilled() {
      try { if (localStorage.getItem('fm.medialibAudioFix')) return 0; } catch (e) { return 0; }
      const list = readIndex();
      let n = 0;
      list.forEach(e => {
        if (!e || e.fp !== '' || e.kind === 'image') return;
        if (e.audio !== undefined) return;
        e.audio = false; n++;
      });
      if (n) writeIndex(list);
      try { localStorage.setItem('fm.medialibAudioFix', '1'); } catch (e) {}
      return n;
    },

    /* …and the same repair for rows ALREADY written the wrong way (#686). An explicit `audio: true`
       wins over every heuristic, by design, so a video misfiled once stays misfiled for good — his
       library can already contain them. Same one-time-flag shape as repairBackfilled above, and it
       decodes nothing: a stored name ending .mp4/.mov/.webm is enough to know the row is wrong,
       and no real song has ever had one. */
    repairMisfiledVideos() {
      try { if (localStorage.getItem('fm.medialibVidFix')) return 0; } catch (e) { return 0; }
      const list = readIndex();
      let n = 0;
      list.forEach(e => {
        if (!e || e.audio !== true) return;
        const nm = e.name || '', ty = e.type || '';
        if (/^audio\//i.test(ty)) return;   // stated audio outranks any extension — see add() on .webm
        if (!(/^video\//i.test(ty) || /\.(mp4|m4v|mov|webm|mkv|avi|3gp)$/i.test(nm))) return;
        e.audio = false; n++;
      });
      if (n) writeIndex(list);
      try { localStorage.setItem('fm.medialibVidFix', '1'); } catch (e) {}
      return n;
    },

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
            /* audio:false EXPLICITLY (BUG-HUNT: "the whole pre-existing video library is filed under
               Add → Audio as songs"). backfill reads layer JSON, never the file, so it hardcodes
               w:0/h:0 — and isAudio() infers "song" from exactly that shape, so every clip the user
               ever placed vanished from the Media tab and reappeared under Audio with a music note.
               It cannot tell a clip from a song here (an mp3 rides the video path as a 0x0 <video>,
               and the live media record isAudioOnly needs is not loaded for a closed project), so it
               states the common case and getThumb heals the rest on first view. */
            kind: l.type, audio: false, w: 0, h: 0, dur: l.duration || 0, size: 0,
            added: (l._added || 0) || Date.now() - 1,
          });
        });
      }
      if (found.length) writeIndex(found.concat(list));
      try { localStorage.setItem('fm.medialibFilled', '1'); } catch (e) {}
    },
  };

  // Resolve once the element actually has a frame to draw. Seeks a touch past 0 (the very first
  // frame of a fade-in is often black anyway), and never hangs the grid: 3s and it gives up.
  function frameReady(el) {
    if (!el) return Promise.resolve(false);
    if (el.readyState >= 2) return Promise.resolve(true);   // HAVE_CURRENT_DATA
    return new Promise(res => {
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        clearTimeout(timer);
        el.removeEventListener('seeked', finish);
        el.removeEventListener('loadeddata', finish);
        res(el.readyState >= 2);
      };
      const timer = setTimeout(finish, 3000);
      el.addEventListener('seeked', finish, { once: true });
      el.addEventListener('loadeddata', finish, { once: true });
      try { el.currentTime = Math.min(0.1, (el.duration || 1) / 10); } catch (e) {}
    });
  }

  // 200px JPEG from a loaded media record (image element or a video with a decoded frame).
  function makeThumb(rec) {
    try {
      const src = rec.el;
      if (src && src.readyState !== undefined && src.readyState < 2) return null;   // belt and braces: a blank canvas must never reach the cache
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
