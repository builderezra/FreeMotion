/* FreeMotion — Project persistence (autosave).
 * Scene document → localStorage; media file blobs → IndexedDB (keyed by layer id).
 * Restored on load so reloads don't lose the user's work. All wrapped in try/catch so a
 * storage failure never breaks the editor.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const DB_NAME = 'freemotion', STORE = 'media', SCENE_KEY = 'fm.scene';
  // Multi-project model (v2.25): every project's scene doc lives in fm.proj.<id>; a small index in
  // fm.projects drives the home screen; fm.currentProject picks which doc save()/load() target.
  // The legacy single-project fm.scene key is migrated into the index on first load.
  const PROJ_INDEX = 'fm.projects', CUR_KEY = 'fm.currentProject', TPL_INDEX = 'fm.templates', ELEM_INDEX = 'fm.elements';
  let saveTimer = null, thumbTimer = 0;
  let _dirty = false;   // a REAL edit happened since the last modified-stamp — merely viewing a project must not bump it to the top of the home list (Ezra)
  function newId(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function readJSON(key, def) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; } catch (e) { return def; } }
  function writeJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { warnQuota(e); return false; } }
  function curId() {
    let id = null;
    try { id = localStorage.getItem(CUR_KEY); } catch (e) {}
    return id;
  }
  // boundId pins THIS TAB to the project it loaded — curKey used to re-read fm.currentProject from
  // localStorage at every write, so a second tab opening another project made this tab's next
  // autosave overwrite THAT project's doc with this tab's scene.
  let boundId = null;
  function curKey() { return 'fm.proj.' + (boundId || curId() || 'default'); }

  /* ---- THE STALE-TAB GUARD (#306) -------------------------------------------------------------
   * boundId above stops a second tab writing THIS tab's scene into ANOTHER project's doc. It does
   * nothing about the worse case, which is two tabs on the SAME project: tab A holds an old scene,
   * you do real work in tab B, then you switch back to tab A — whose `visibilitychange` handler
   * immediately flushSync()s its stale scene straight over the good one. Refresh and your work is
   * gone, replaced by an older version of the same project. On a phone that is not an edge case:
   * backgrounding the browser fires visibilitychange in EVERY open tab.
   * Nothing detected it either, because a scene doc carried no notion of which of two versions was
   * newer — the app genuinely could not tell "this is your project" from "this is an old copy".
   * So the doc now carries a monotonic `rev`. A write reads the rev already on disk first: if disk is
   * AHEAD of what this tab last wrote or loaded, some other context has moved on and this tab must
   * not clobber it — it goes stale, says so, and stops writing. Reloading picks up the newer doc.
   * The read-back after the write is the second half: a write that throws is caught below, but a
   * write that silently does nothing (a full or restricted store) is otherwise indistinguishable
   * from success, and that is the OTHER way a reload serves an older version. */
  let lastRev = 0, _stale = false, _staleWarned = false;
  function diskRev() {
    try {
      const raw = localStorage.getItem(curKey());
      if (!raw) return 0;
      const m = /^\{"rev":(\d+)/.exec(raw);   // rev is written first, so this never parses the whole doc
      return m ? +m[1] : 0;
    } catch (e) { return 0; }
  }
  function warnStale() {
    if (_staleWarned) return; _staleWarned = true;
    if (FM.toast) FM.toast('This tab is showing an older copy of the project — newer changes were saved elsewhere. Reload to catch up; nothing here has been saved over them.', 9000);
  }
  // The ONE place a scene doc is written. Returns true only if the bytes actually landed.
  function writeScene() {
    if (_stale) return false;
    const dr = diskRev();
    if (dr > lastRev) { _stale = true; warnStale(); return false; }
    const rev = dr + 1;
    const doc = sceneDoc(); doc.rev = rev;
    // rev FIRST in the serialised object, so diskRev()'s anchored regex can find it without a parse
    const ordered = { rev: rev }; for (const k in doc) if (k !== 'rev') ordered[k] = doc[k];
    try { localStorage.setItem(curKey(), JSON.stringify(ordered, FM.jsonReplacer)); }
    catch (e) { warnQuota(e); return false; }
    if (diskRev() !== rev) { warnQuota({ name: 'QuotaExceededError' }); return false; }   // the write silently did nothing
    lastRev = rev;
    return true;
  }
  // load()/open() call this so a fresh document resets the guard for the new project.
  function adoptRev(r) { lastRev = (typeof r === 'number' && isFinite(r)) ? r : 0; _stale = false; _staleWarned = false; }
  FM._sceneRevState = function () { return { lastRev, stale: _stale, disk: diskRev() }; };   // suite hook

  // The autosaved scene document. selectedIds is persisted too so a multi-layer selection survives a
  // reload/undo instead of silently collapsing to one layer (align/distribute act on the whole set). (#20)
  function sceneDoc() {
    return { project: FM.scene.project, layers: FM.scene.layers, selectedId: FM.scene.selectedId, selectedIds: FM.scene.selectedIds };
  }
  // Surface a localStorage quota failure ONCE (autosave runs every 600ms — don't spam). The scene
  // JSON can outgrow the ~5MB quota on a heavy project; silently swallowing it stops persistence
  // with no sign, and a reload then reverts to the last write that fit. (#15)
  let _quotaWarned = false;
  function warnQuota(e) {
    const quota = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
    if (quota && !_quotaWarned) { _quotaWarned = true; if (FM.toast) FM.toast('Storage full — autosave paused. Use ⚙ → Save project file to keep your work.', 5000); }
  }

  function openDB() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  function idbGet(db, key) { return new Promise((res) => { try { const rq = db.transaction(STORE, 'readonly').objectStore(STORE).get(key); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); } catch (e) { res(null); } }); }
  // Resolves TRUE only if the write actually landed. This used to resolve the same way on success and
  // on failure, and writeMedia returned a hardcoded true on top of it — so a video too big for the
  // origin quota was rejected by the browser, reported as saved, and silently missing after a reload.
  // On mobile, where the quota is far smaller and Safari rejects rather than prompting, that is most of
  // what "I cannot add long videos, it won't work" looks like from the outside.
  function idbPut(db, key, val) { return new Promise((res) => { try { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(val, key); tx.oncomplete = () => res(true); tx.onerror = () => { warnStore(tx.error); res(false); }; tx.onabort = () => { warnStore(tx.error); res(false); }; } catch (e) { warnStore(e); res(false); } }); }

  // Say WHY, with the real numbers, instead of failing mutely. Separate latch from warnQuota so a
  // localStorage warning earlier in the session cannot suppress this one.
  let _storeWarned = false;
  function warnStore(e) {
    const quota = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
    if (_storeWarned || !FM.toast) return;
    _storeWarned = true;
    const mb = n => (n / 1048576).toFixed(0) + ' MB';
    const say = extra => FM.toast((quota ? 'Not enough storage to save that media.' : 'Could not save that media.') + (extra || ''), 6000);
    if (quota && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(q => say(q && q.quota ? ' Used ' + mb(q.usage || 0) + ' of ' + mb(q.quota) + '.' : '')).catch(() => say(''));
    } else say('');
  }

  // Ask once for persistent storage. Without it the browser may evict this origin's media under
  // pressure — i.e. projects can lose their clips with no user action at all. Cheap, and silent when
  // it is refused or unsupported.
  try {
    if (navigator.storage && navigator.storage.persist && navigator.storage.persisted) {
      navigator.storage.persisted().then(p => { if (!p) return navigator.storage.persist(); }).catch(() => {});
    }
  } catch (e) {}
  function idbDel(db, key) { return new Promise((res) => { try { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = () => res(); tx.onerror = () => res(); } catch (e) { res(); } }); }
  function idbKeys(db) { return new Promise((res) => { try { const rq = db.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys(); rq.onsuccess = () => res(rq.result || []); rq.onerror = () => res([]); } catch (e) { res([]); } }); }

  // Repair a circular parent link carried by an already-saved (or imported) document, and SAY SO.
  // Silent repair would be worse than the bug: the user's group nesting genuinely changes, and a
  // change to their work that nobody announces is indistinguishable from corruption. Returns nothing
  // when the document was clean — a healthy project must not see a toast, or a write, at all.
  function repairAndAnnounce(layers, whenLoading) {
    const fixed = FM.repairParentCycles ? FM.repairParentCycles(layers) : null;
    if (!fixed) return null;
    // Short on purpose. #toast shrink-fits inside the 50vw its left:50% containing block leaves it, so
    // at 380px it has ~190px to wrap into — a sentence long enough to explain itself in full becomes a
    // six-line block nobody reads. The layer names and the reason go to the console for the long form.
    const msg = fixed.length === 1
      ? 'Repaired this project: “' + fixed[0] + '” was parented in a loop'
      : 'Repaired this project: ' + fixed.length + ' layers were parented in a loop';
    let done = false;
    const go = () => { if (done) return; done = true; if (FM.toast) FM.toast(msg, 7000); };
    // On a cold launch the splash covers the screen for ~3s and would eat the notice, so wait for the
    // dismiss the home intro already waits for — same idiom, same 6s backstop for a splash torn down
    // some other way. No splash (import, project switch, repeat load) → show it right away.
    const sp = whenLoading ? document.getElementById('splash') : null;
    if (sp && !sp.classList.contains('hidden') && !sp.classList.contains('splash-out')) {
      document.addEventListener('fm:splash-dismiss', () => setTimeout(go, 600), { once: true });
      setTimeout(go, 6000);
    } else {
      setTimeout(go, 400);
    }
    try { console.warn('FreeMotion: broke a circular parent link on ' + fixed.join(', ') + ' — this project could not have opened otherwise.'); } catch (e) {}
    return fixed;
  }

  /* ---- LEAVING A PROJECT SHOULD COST NOTHING TO STAY LEFT (queue 385) --------------------------
   * His words: *"I think it may be worth having project not stay open and close when you leave them,
   * needing them to be re loaded when you back in and out, incase a project is broken and really laggy
   * then it won't effect the home menu"* — and, on the OPEN glint he likes, *"I do like the effect of
   * having a project open with the glint around it but not at the cost of a shitty system"*.
   *
   * MEASURED FIRST (`tests/_leavecost.html`, 19 Aug): going home tears down NOTHING. Across
   * `home.open()` the scene stayed fully resident, `curId` was kept, and a `<video>` element was still
   * attached with its `src` intact. `home.open()` pauses playback, resets the viewport, exits a group
   * and saves metadata — and releases no heavy state at all. So his diagnosis was right.
   *
   * The two things he wants are not in tension, which is the whole answer: the glint is a FLAG on a
   * card and costs nothing; what costs is the decoded media. So the scene document and `curId` stay —
   * he keeps the glint — and the media goes.
   *
   * FOUR THINGS MAKE THIS SAFE, and each is a bug that would otherwise be silent:
   *  1. NOTHING IS FREED THAT IDB CANNOT GIVE BACK. The ids are checked against the store's KEYS (one
   *     read, no blobs) before anything is released. A record with no blob behind it — an import whose
   *     write had not landed, anything parked here by another module — is left alone. Releasing one
   *     would destroy a clip, and the user would find out much later.
   *  2. PINNED records are skipped (`fx-thumbs` parks its own entries here under ids that are not
   *     layers), and `remove()` unpins as a side effect, so releasing one would also break the effect
   *     thumbnails permanently.
   *  3. It stands down entirely while a pack write is in flight (`FM._mediaBusy`) or an export is
   *     running (`FM._exporting`) — an export reads these records frame by frame.
   *  4. It only runs while home is genuinely open, re-checked AFTER the awaits, because the user can
   *     be back inside the project by the time the key read returns.
   * The ORDERING hazard is handled at the call site, not here: `home.open()` finishes with an async
   * thumbnail capture that RENDERS THE CANVAS, so releasing before it runs would re-capture every card
   * blank. The release is hung off the end of that capture — see `captureThumbSoon` in js/home.js. */
  /* ONE HYDRATE AT A TIME. Two overlapping runs would both `idbGet` the same layer and both `set()`,
   * and `set()` FREES whatever it displaces — so the second one would tear down a record the compositor
   * may already be drawing from, and that clip goes blank with nothing in the log. The routes really can
   * overlap: close() fires this without awaiting, and openProject awaits its own call on the
   * same-project path. Callers share the run rather than racing it. */
  let _hydrating = null;
  function hydrateSceneMedia(opts) {
    if (_hydrating) return _hydrating;
    _hydrating = _hydrateSceneMedia(opts).then(function (n) { _hydrating = null; return n; },
                                              function (e) { _hydrating = null; throw e; });
    return _hydrating;
  }
  async function _hydrateSceneMedia(opts) {
    const onlyMissing = !!(opts && opts.onlyMissing);
    let n = 0;
    try {
      const db = await openDB();
      for (const layer of FM.scene.layers) {
        if (!layer || layer.type === 'text') continue;
        if (onlyMissing && FM.media.get(layer.id)) continue;   // still resident — a fresh load, or never released
        try {   // per-layer: ONE corrupt/undecodable blob must not abort the restore of every later layer
          const rec = await idbGet(db, layer.id);
          if (rec && rec.file) {
            const loaded = rec.kind === 'video' ? await FM.loadVideoFile(rec.file) : await FM.loadImageFile(rec.file);
            FM.media.set(layer.id, loaded);
            if (loaded.kind === 'video') loaded.el.addEventListener('seeked', () => { if (!FM.playing && FM.requestRender) FM.requestRender(); });
            if (FM.wireVideoRepaint) FM.wireVideoRepaint(loaded);   // a reopened project decodes from cold — repaint when the frame lands
            n++;
          }
        } catch (le) { /* this layer's media failed to decode — keep restoring the rest */ }
      }
      db.close();
    } catch (e) { /* media restore failed — scene structure still loads */ }
    return n;
  }

  // reversed / frame-blend-slow clips render from the frame cache — rebuild it so they don't
  // show forward-direction frames when scrubbing before the first play. ONE writer, called by the
  // project load and by the return-from-home rehydrate: two copies would be two chances to disagree
  // about which clips need a cache, and the failure looks like "slow-mo died on reload".
  function warmReverseCaches() {
    FM.scene.layers.forEach(l => { if (l && l.type === 'video' && (l.reversed || (l.frameBlend && (FM.isAnimated(l.speed) || (l.speed || 1) < 1))) && FM.ensureReverseCache) FM.ensureReverseCache(l); });   // ramped speed is an object → isAnimated, else (obj||1)<1 is false and slow-mo dies on reload
  }

  function releaseBlocked() {
    if (FM._exporting) return 'an export is running';
    if (FM._mediaBusy) return 'a media write is in flight';
    if (!(FM.home && FM.home.isOpen && FM.home.isOpen())) return 'the project is not actually left';
    return '';
  }

  async function releaseSceneMedia() {
    if (releaseBlocked()) return 0;
    let ids = [];
    try {
      const db = await openDB();
      const keys = new Set(await idbKeys(db));
      db.close();
      for (const layer of FM.scene.layers) {
        if (!layer || layer.type === 'text') continue;
        const id = layer.id;
        if (!FM.media.get(id)) continue;                                  // nothing resident to free
        if (FM.media.isPinned && FM.media.isPinned(id)) continue;         // owned by something other than the scene
        if (!keys.has(id)) continue;                                      // ← IDB cannot give it back, so it is not ours to free
        ids.push(id);
      }
    } catch (e) { return 0; }
    if (releaseBlocked()) return 0;   // re-checked: the reads above awaited, and he may be back inside
    ids.forEach(id => FM.media.remove(id));
    return ids.length;
  }

  FM.storage = {
    async save() {
      let sceneOk = writeScene();   // rev-guarded; a quota failure shouldn't block the IDB media save below
      const warnedBefore = _quotaWarned;
      if (FM.projects) FM.projects.touchCurrent();
      // reset the once-flag only when EVERYTHING wrote — resetting after the scene write alone made
      // a failing index write re-toast "Storage full" every 600ms forever
      if (sceneOk && !(_quotaWarned && !warnedBefore)) _quotaWarned = false;
      try {
        const db = await openDB();
        for (const layer of FM.scene.layers) {
          if (layer.type === 'text') continue;
          const m = FM.media.get(layer.id);
          if (m && m.file) {
            const existing = await idbGet(db, layer.id);
            if (!existing) await idbPut(db, layer.id, { file: m.file, kind: m.kind });
          }
        }
        // NOTE: no blanket prune here any more — media blobs are shared across ALL projects (plus
        // template/element packs), so "not in the current scene" ≠ orphaned. deleteLayer/removeMedia
        // handle explicit deletions; FM.projects.pruneOrphans() sweeps true orphans once at boot.
        db.close();
      } catch (e) { /* storage unavailable — ignore */ }
    },

    // Synchronous best-effort scene write for page unload (the 600ms debounce can't run there).
    flushSync() { clearTimeout(saveTimer); return writeScene(); },

    async removeMedia(id) { try { const db = await openDB(); await idbDel(db, id); db.close(); } catch (e) {} },

    // Generic single-key access to the media store, for features that need to read or write a blob
    // outside the scene document (the Media library reads imported files and caches its thumbnails).
    async readMedia(key) { try { const db = await openDB(); const v = await idbGet(db, key); db.close(); return v; } catch (e) { return null; } },
    // Reports what actually happened. It used to return a hardcoded true, so callers could not tell a
    // stored clip from one the browser refused on quota.
    async writeMedia(key, val) { try { const db = await openDB(); const ok = await idbPut(db, key, val); db.close(); return ok; } catch (e) { return false; } },
    // Every key in the store, optionally narrowed to one prefix. Export crash-resume needs it to sweep
    // its own leftovers (`xr:part:*`) without knowing how many there were — a job that died mid-write
    // is precisely the case where the count on record is not to be trusted.
    async listMediaKeys(prefix) {
      try {
        const db = await openDB(); const ks = await idbKeys(db); db.close();
        return prefix ? ks.filter(k => typeof k === 'string' && k.indexOf(prefix) === 0) : ks;
      } catch (e) { return []; }
    },

    // autosave is invoked ONLY by real-edit paths (history commit/undo/redo, template/element
    // inserts) — the single choke point that marks the project genuinely modified.
    autosave() { _dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(() => FM.storage.save(), 600); },
    markDirty() { _dirty = true; },   // for edit-paths that call save() directly (import)
    clearDirty() { _dirty = false; }, // for history.reset(): opening/loading a project is not an edit

    async load() {
      if (FM.projects) FM.projects.migrate();   // legacy single-project fm.scene → indexed project (one-time)
      boundId = curId();                        // pin every future save in this tab to the project being loaded
      adoptRev(0);                              // a project with no doc yet must not inherit the previous one's rev (#306)
      if (FM.fonts) FM.fonts.rehydrateAll();     // register imported custom fonts (idempotent; re-renders when ready)
      let scene = readJSON(curKey(), null);
      if (!scene || !scene.project) return false;   // accept a 0-layer project so canvas settings (name/size/fps/bg) survive a reload
      adoptRev(scene.rev);        // this tab is now level with what is on disk (#306)
      /* RE-CLAMP ON EVERY OPEN (queue 470). This is the door EVERY project comes through, every time, and
         until now it trusted whatever was in storage — the note just below says as much about layers.
         Dimensions are different from layers in one decisive way: a bad one is not a wrong picture, it is
         a device that cannot open the project at all, and cannot open it again on the next launch either.
         So the cheap half is done here unconditionally (six numeric clamps on ONE object, not a walk over
         every layer): whatever route wrote an absurd size — the template bug this was found with, a
         corrupted doc, a build that predates a clamp — opening it repairs it instead of dying on it. */
      clampProjectDims(scene.project);
      FM.scene.project = scene.project;
      FM.scene.layers = Array.isArray(scene.layers) ? scene.layers : [];
      // The AUTOSAVE path sanitises nothing — applyScene (the .fmproj import) is the only caller of
      // sanitizeImportedLayers, and this is the route every project takes on every open. So anything
      // an import once let through has been autosaved back into localStorage and comes in unchecked
      // here forever after. Effects are the sharpest edge of that (a type is a bare key into six
      // render dispatch tables), so they get checked here. The rest of the sanitisers are NOT run:
      // rewriting audioFx / masks / behaviours across his existing projects is a much larger change
      // than this one is allowed to be, and it is logged as its own item rather than smuggled in.
      /* …AND THE VALUE-LEVEL SAFETY CHECKS, on every load (bug hunt, 21 Aug). `sanitizeEffects` alone
         left a remote `fillImage` URL intact through a save and reopen, and the compositor assigns that
         straight to `Image.src`. Cheap enough to run on every layer of every open. */
      FM.scene.layers.forEach(l => { if (l) { sanitizeEffects(l); sanitizeUnsafeValues(l); } });
      // BEFORE anything walks the graph. A document saved by a pre-v5.06 build can carry a parent
      // cycle; every parent walk below (refreshAll → the timeline, the layers panel, the compositor)
      // then throws, and because that throw happens inside this promise the boot .then() never runs:
      // no layers panel, no Home, and every other project unreachable behind it. Measured on v5.72
      // before this line existed: RangeError out of collectGroupUnits, home never opened.
      repairAndAnnounce(FM.scene.layers, true);
      FM.scene.selectedId = scene.selectedId;
      // Restore the full multi-selection (filtered to layers that still exist), not just one. (#20)
      const liveIds = new Set(FM.scene.layers.map(l => l.id));
      FM.scene.selectedIds = (Array.isArray(scene.selectedIds) ? scene.selectedIds : (scene.selectedId ? [scene.selectedId] : [])).filter(id => liveIds.has(id));
      await hydrateSceneMedia();
      if (FM.resizeCanvas) FM.resizeCanvas();
      if (FM.refreshAll) FM.refreshAll();
      if (FM.seekVideosToTime) FM.seekVideosToTime();
      warmReverseCaches();
      return true;
    },

    // Reset the CURRENT project only (blank doc + drop its media blobs). Never .clear() the whole
    // IDB store — it also holds every OTHER project's media plus template/element packs.
    async clear() {
      try {
        const doc = readJSON(curKey(), null);
        const db = await openDB();
        const libKeys = new Set(FM.mediaLib && FM.mediaLib.keys ? FM.mediaLib.keys() : []);   // same keep-set as remove()/pruneOrphans
        if (doc && Array.isArray(doc.layers)) for (const l of doc.layers) { if (!libKeys.has(l.id)) await idbDel(db, l.id); }
        db.close();
        localStorage.removeItem(curKey());
        if (FM.projects) FM.projects.touchCurrent();
      } catch (e) {}
    },
  };

  // ---- portable project file (.fmotion.json): scene graph + small media as base64 ----
  function fileToDataURL(file) { return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(file); }); }
  // ONLY rehydrate real data: URIs. An imported .fmotion.json is untrusted input; a non-data URL here
  // (e.g. https://attacker/beacon) would otherwise be fetch()ed on open — a zero-click tracking beacon /
  // LAN probe. Reject anything that isn't an embedded data URL.
  async function dataURLToFile(dataURL, name) { if (typeof dataURL !== 'string' || !/^data:/i.test(dataURL)) return null; const blob = await (await fetch(dataURL)).blob(); return new File([blob], name || 'media', { type: blob.type }); }
  const EMBED_LIMIT = 6 * 1024 * 1024;   // skip embedding media larger than this (keeps the JSON sane)

  FM.storage.hydrateSceneMedia = hydrateSceneMedia;
  FM.storage.releaseSceneMedia = releaseSceneMedia;
  FM.storage.warmReverseCaches = warmReverseCaches;

  FM.storage.serializeScene = async function (scene) {
    const media = {};
    for (const layer of scene.layers) {
      if (layer.type === 'text' || layer.type === 'shape' || layer.type === 'null') continue;
      const m = FM.media.get(layer.id);
      if (m && m.file && m.file.size <= EMBED_LIMIT) {
        const dataURL = await fileToDataURL(m.file);
        if (dataURL) media[layer.id] = { kind: m.kind, name: m.file.name, dataURL: dataURL };
      }
    }
    const fonts = await embedFonts(scene.layers);
    return { app: 'freemotion', v: 1, project: scene.project, layers: scene.layers, selectedId: scene.selectedId, selectedIds: scene.selectedIds, media: media, fonts: fonts };
  };

  /* Embed the custom fonts the text layers actually use, so the file still renders correctly when it is
     opened on another device (fonts are otherwise a device-local library).
     EXTRACTED (queue 343) because a second exporter now needs it — sharing a TEMPLATE as a file. Copying
     these eight lines would have been the easy move and the wrong one: the two would drift, and the way
     they would drift is that the newer path silently stops embedding fonts, which nobody notices until
     someone else opens the file and the type is wrong. */
  async function embedFonts(layers) {
    const fonts = {};
    if (!FM.fonts) return fonts;
    const used = new Set((layers || []).filter(l => l.type === 'text' && l.fontFamily).map(l => l.fontFamily));
    for (const f of FM.fonts.list()) {
      if (!used.has(f.css)) continue;
      const file = await FM.fonts.getFile(f.id);
      if (file && file.size <= FONT_EMBED_LIMIT) { const durl = await fileToDataURL(file); if (durl) fonts[f.id] = { name: f.name, family: f.family, css: f.css, dataURL: durl }; }
    }
    return fonts;
  }

  // Clamp untrusted project dimensions to sane bounds. An imported/AI/hand-crafted .fmotion.json with
  // width/height 16000 allocates ~1GB per canvas (main + ghost + ~10 compositor buffers) → OOM-crashes
  // mobile Safari on open, AND (being autosaved as current) crashes again on every relaunch = a brick.
  // ai-ops already clamps AI-set dims to [16,7680]; the human-import path must too.
  function clampProjectDims(p) {
    if (!p) return;
    const ev = n => Math.max(16, Math.min(7680, Math.round((+n || 0) / 2) * 2));
    if (p.width != null) p.width = ev(p.width) || 1080;
    if (p.height != null) p.height = ev(p.height) || 1920;
    if (!(p.width >= 16)) p.width = 1080;
    if (!(p.height >= 16)) p.height = 1920;
    // fps: an integer 1–120, the same range the editor's own Canvas settings and the New project
    // dialog offer. (This used to be a 24/25/30/50/60 WHITELIST, which silently reset every other
    // value to 30 — including 120, every Custom fps, and any 48fps project round-tripped through
    // an export/import. The bound is what protects us; the whitelist was just lossy.)
    p.fps = Math.max(1, Math.min(120, Math.round(+p.fps) || 30));
    p.duration = Math.max(0, Math.min(3600, +p.duration || 0));
  }
  // An imported layer.fillImage flows straight to img.src / CSS url() on the first render — an external
  // URL there is a zero-click tracking beacon / LAN-probe (SSRF). Only a data:image/ URL is safe (the
  // same rule dataURLToFile enforces for embedded media). Strip anything else.
  //
  // Colour fields (labelColor, clipColor, gradient stops) are interpolated RAW into CSS strings on
  // render — `stripe.style.background = layer.labelColor` (timeline) and `'…-gradient(…,'+c0+','+c1+')'`
  // (inspector fill preview). A value like `url(http://evil/x)` there is the same zero-click beacon.
  // Canvas colour props (fill/color/stroke — fillStyle/addColorStop) are NOT a fetch vector, so only
  // the CSS-reaching fields are validated. Accept hex / rgb() / hsl() / a bare colour name; reject rest.
  function safeColor(v) {
    if (typeof v !== 'string') return false;
    const s = v.trim();
    if (!s || s.length > 32) return false;
    if (/^#[0-9a-f]{3,8}$/i.test(s)) return true;                        // #rgb / #rrggbb / #rrggbbaa
    if (/^(rgb|hsl)a?\(\s*[0-9.,%\s/deg]+\)$/i.test(s)) return true;     // rgb()/rgba()/hsl()/hsla() — numerics + separators only (no url(), no nested fn)
    if (/^[a-z]{3,20}$/i.test(s)) return true;                          // named colour (transparent, red, …)
    return false;
  }
  // An imported layer.audioFx entry drives two untrusted paths: .type reaches the DOM as a label and
  // FM.buildAudioFxChain as a builder key, and .params reach AudioParams. Nothing from the file is
  // trusted: the type is whitelisted against the registry and the params are REBUILT from the registry
  // schema (file values are only ever adopted after a range check), so an unknown key can't survive.
  const AFX_MAX = 16, AFX_MAX_KF = 200;
  // own-property only: EASES/EASE_PRESETS are plain literals, so a bare [e] lookup lets 'toString' /
  // 'constructor' pass the whitelist — scene.js then calls it unbound and every eval goes NaN.
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  function easeOk(e) { return typeof e === 'string' && (hasOwn(FM.EASES, e) || hasOwn(FM.EASE_PRESETS, e)); }
  /* A parameterised ease — { fam, preset, p } — written by the graph editor (graph-editor.js:161).
   * Whitelisted by ASKING the ease catalogue whether that family/preset pair exists, which is the same
   * test FM.easeApply makes at eval time; anything it would ignore is dropped here instead of stored. */
  const EZ_MAX_P = 12;
  function safeEz(ez) {
    if (!ez || typeof ez !== 'object') return null;
    if (typeof ez.fam !== 'string' || typeof ez.preset !== 'string') return null;
    if (!FM.easePreset || !FM.easePreset(ez.fam, ez.preset)) return null;
    const out = { fam: ez.fam, preset: ez.preset };
    if (ez.p && typeof ez.p === 'object') {
      const p = {};
      Object.keys(ez.p).slice(0, EZ_MAX_P).forEach(k => { const n = +ez.p[k]; if (isFinite(n)) p[k] = n; });
      out.p = p;
    }
    return out;
  }
  function safeKfProp(p, min, max) {
    if (!p || typeof p !== 'object' || !Array.isArray(p.kf)) return null;
    const kf = [];
    p.kf.slice(0, AFX_MAX_KF).forEach(k => {
      if (!k || typeof k !== 'object') return;
      const t = +k.t, v = +k.v;
      if (!isFinite(t) || t < 0 || !isFinite(v)) return;
      const o = { t: Math.min(3600, t), v: Math.max(min, Math.min(max, v)), e: easeOk(k.e) ? k.e : 'linear' };
      if (Array.isArray(k.bez) && k.bez.length === 4 && k.bez.every(n => isFinite(+n))) o.bez = k.bez.map(Number);
      /* ez / ti / to used to be dropped here, silently. That was survivable while this function only
       * saw audio params, and stops being survivable the moment effect params come through it (below):
       * evalProp honours all three on ANY prop (scene.js:105 for ez, :118-126 for the Hermite tangents),
       * the keyframe clipboard deliberately carries ti/to onto whatever you paste them to — including an
       * 'effect.<i>.<key>' address — and fx-presets.js:69-70 preserves them through an effect preset.
       * So a curve someone shaped by hand would come back a straight line after a reload, with nothing
       * on screen to say why. Kept, validated: non-finite is what evalProp already treats as absent. */
      const ez = safeEz(k.ez); if (ez) o.ez = ez;
      if (isFinite(+k.ti)) o.ti = Math.max(-1e7, Math.min(1e7, +k.ti));
      if (isFinite(+k.to)) o.to = Math.max(-1e7, Math.min(1e7, +k.to));
      kf.push(o);
    });
    if (!kf.length) return null;
    kf.sort((a, b) => a.t - b.t);
    const out = { kf: kf };
    if (['cycle', 'pingpong'].indexOf(p.loopMode) >= 0 && kf.length >= 2) out.loopMode = p.loopMode;
    return out;
  }
  function sanitizeAudioFx(l) {
    if (l.audioFx == null) return;
    // No registry (script failed to load) = no way to whitelist a type — drop rather than trust the file.
    if (!Array.isArray(l.audioFx) || !FM.audioFxRegistry) { delete l.audioFx; return; }
    l.audioFx = l.audioFx.slice(0, AFX_MAX).map(f => {
      if (!f || typeof f !== 'object') return null;
      const def = FM.audioFxRegistry.get(f.type);
      if (!def) return null;
      const params = {};
      FM.audioFxRegistry.paramsOf(f.type).forEach(pd => {
        const v = f.params && typeof f.params === 'object' ? f.params[pd.key] : undefined;
        if (typeof v === 'number' && isFinite(v)) params[pd.key] = Math.max(pd.min, Math.min(pd.max, v));
        else {
          const kfp = pd.keyframable !== false ? safeKfProp(v, pd.min, pd.max) : null;
          params[pd.key] = kfp || pd.def;
        }
      });
      // enabled !== false is the engine's own "on" test (layerHasAudioFx / buildAudioFxChain); an
      // omitted flag must stay ON, so absence — not falsiness — is what decides the boolean.
      return { type: def.type, enabled: f.enabled !== false, params: params };
    }).filter(Boolean);
  }
  // A number in [min,max], OR a validated animated prop, OR the default. Same untrusted-file discipline
  // as sanitizeAudioFx: file values are only adopted after a range/keyframe check.
  function numOrKf(v, min, max, def, keyframable) {
    if (typeof v === 'number' && isFinite(v)) return Math.max(min, Math.min(max, v));
    if (keyframable) { const kfp = safeKfProp(v, min, max); if (kfp) return kfp; }
    return def;
  }
  // Trim Path / dashed stroke / Repeater are drawn straight into canvas path + transform + setLineDash —
  // a NaN/Infinity would throw and kill the frame, and copies feeds a render loop (uncapped = DoS). Rebuild
  // each from its schema, keeping ONLY known keys, exactly like the audioFx/gradient hardening above.
  function sanitizeTrimRepeater(l) {
    if (l.trimPath != null) {
      const t = l.trimPath;
      if (typeof t !== 'object') delete l.trimPath;
      else l.trimPath = { enabled: t.enabled === true, start: numOrKf(t.start, 0, 1, 0, true), end: numOrKf(t.end, 0, 1, 1, true), offset: numOrKf(t.offset, 0, 1, 0, true) };
    }
    if (l.stroke && l.stroke.dash != null) {
      const d = l.stroke.dash;
      if (typeof d !== 'object') delete l.stroke.dash;
      else l.stroke.dash = { enabled: d.enabled === true, length: numOrKf(d.length, 0, 4000, 12, false), gap: numOrKf(d.gap, 0, 4000, 8, false), offset: numOrKf(d.offset, -1e6, 1e6, 0, true) };
    }
    if (l.repeater != null) {
      const r = l.repeater;
      if (typeof r !== 'object') delete l.repeater;
      else l.repeater = {
        enabled: r.enabled === true,
        copies: numOrKf(r.copies, 1, 50, 3, true),
        offsetX: numOrKf(r.offsetX, -10000, 10000, 40, true), offsetY: numOrKf(r.offsetY, -10000, 10000, 0, true),
        rotation: numOrKf(r.rotation, -3600, 3600, 0, true), scale: numOrKf(r.scale, 0, 10, 1, true),
        opacity: numOrKf(r.opacity, 0, 1, 1, true),
        anchorX: numOrKf(r.anchorX, 0, 1, 0.5, false), anchorY: numOrKf(r.anchorY, 0, 1, 0.5, false),
      };
    }
  }
  // An imported layer.behaviors entry drives the per-frame transform resolver (FM.behaviorValue): .type is a
  // builder key into FM.behaviorRegistry, .prop selects which transform channel it rewrites, and .params reach
  // the math every frame. Nothing from the file is trusted — .type is whitelisted OWN-PROPERTY against the
  // registry (a bare registry[type] would let 'constructor'/'toString' walk the prototype chain and pass), the
  // resolved def must round-trip its own type, .prop must be a real transform channel the type declares, and
  // .params are REBUILT from the registry schema (file numbers only after a range check; id refs kept only if
  // plain strings; band whitelisted). Unknown + leading-underscore keys can't survive the rebuild.
  const BEH_MAX = 24;
  const BEHAVIOR_PROPS = ['x', 'y', 'scale', 'rotation', 'opacity'];
  const BEHAVIOR_BANDS = ['overall', 'bass', 'mid', 'treble'];
  function sanitizeBehaviors(l) {
    if (l.behaviors == null) return;
    // No registry (script failed to load) = no way to whitelist a type — drop rather than trust the file.
    if (!Array.isArray(l.behaviors) || !FM.behaviorRegistry || typeof FM.behaviorRegistry.get !== 'function') { delete l.behaviors; return; }
    l.behaviors = l.behaviors.slice(0, BEH_MAX).map(b => {
      if (!b || typeof b !== 'object') return null;
      if (typeof b.type !== 'string') return null;
      // def.type must equal the requested type: a get() that resolved a prototype key ('toString') returns a
      // def whose own .type wouldn't match, so the round-trip is the own-property guarantee.
      const def = FM.behaviorRegistry.get(b.type);
      if (!def || def.type !== b.type) return null;
      // prop must be a real behaviour-able transform channel AND one this behaviour declares ("*" = any).
      const allowed = Array.isArray(def.props) ? def.props : [];
      if (BEHAVIOR_PROPS.indexOf(b.prop) < 0) return null;
      if (allowed.indexOf('*') < 0 && allowed.indexOf(b.prop) < 0) return null;
      const schema = typeof FM.behaviorRegistry.paramsOf === 'function' ? (FM.behaviorRegistry.paramsOf(b.type) || []) : [];
      const params = {};
      schema.forEach(pd => {
        if (!pd || typeof pd.key !== 'string') return;
        const v = b.params && typeof b.params === 'object' ? b.params[pd.key] : undefined;
        if (typeof pd.def === 'string') {
          // string param: a layer-id ref (kept only if a plain, length-capped string) or an enum like band.
          const opts = Array.isArray(pd.options) ? pd.options : (pd.key === 'band' ? BEHAVIOR_BANDS : null);
          if (opts) params[pd.key] = (typeof v === 'string' && opts.indexOf(v) >= 0) ? v : pd.def;
          else params[pd.key] = (typeof v === 'string' && v.length <= 64) ? v : pd.def;
        } else {
          if (typeof v === 'number' && isFinite(v)) {
            const min = isFinite(pd.min) ? pd.min : -Infinity, max = isFinite(pd.max) ? pd.max : Infinity;
            params[pd.key] = Math.max(min, Math.min(max, v));
          } else params[pd.key] = pd.def;
        }
      });
      // enabled: absence stays ON (matches makeInstance's enabled:true and the audioFx convention).
      return { type: def.type, prop: b.prop, enabled: b.enabled !== false, params: params };
    }).filter(Boolean);
  }
  // Pen masks (layer.masks — a NEW array, separate from the legacy layer.mask). Each mask's path is
  // traced into a canvas path and its points are lerped vertex-by-vertex, so a NaN/Infinity coord or a
  // runaway point/keyframe count would throw or hang the render. Rebuild each mask from the CONTRACT
  // schema, keeping ONLY known keys — same untrusted-file discipline as audioFx/trimPath/behaviors above.
  // COORDINATE SPACE: points are project/canvas pixels (0..width, 0..height), clamped to a sane range.
  const MASK_MAX = 24, MASK_MAX_PTS = 2000, MASK_MAX_KF = 200;
  // own-property whitelist: a bare MASK_MODES[m.mode] lookup would let 'constructor'/'toString' pass.
  const MASK_MODES = { add: 1, subtract: 1, intersect: 1 };
  // A point list -> a clean pts array ([x,y] corner or [x,y,1] smooth). null only when v is not an array
  // (so a malformed path drops the mask); an empty-but-array path survives as [] (a freshly-drawn mask).
  function safeMaskPts(v) {
    if (!Array.isArray(v)) return null;
    const pts = [];
    for (let i = 0; i < v.length && pts.length < MASK_MAX_PTS; i++) {
      const p = v[i];
      if (!Array.isArray(p) || p.length < 2) continue;
      const x = +p[0], y = +p[1];
      if (!isFinite(x) || !isFinite(y)) continue;
      const pt = [Math.max(-1e5, Math.min(1e5, x)), Math.max(-1e5, Math.min(1e5, y))];
      if (p[2]) pt.push(1);   // per-point smooth flag preserved (FM.buildSubPath reads pts[i][2])
      pts.push(pt);
    }
    return pts;
  }
  // path is EITHER a static pts array OR an animated prop { kf:[{t,v:ptsArray,e}] } so the WHOLE path can
  // be keyframed. Returns null (drop the mask) when neither shape validates.
  function safeMaskPath(path) {
    if (path && typeof path === 'object' && !Array.isArray(path) && Array.isArray(path.kf)) {
      const kf = [];
      path.kf.slice(0, MASK_MAX_KF).forEach(k => {
        if (!k || typeof k !== 'object') return;
        const t = +k.t;
        if (!isFinite(t) || t < 0) return;
        const pts = safeMaskPts(k.v);
        if (!pts || !pts.length) return;   // a keyframe with no valid vertices contributes nothing → drop it
        kf.push({ t: Math.min(3600, t), v: pts, e: easeOk(k.e) ? k.e : 'linear' });
      });
      if (!kf.length) return null;
      kf.sort((a, b) => a.t - b.t);
      return { kf: kf };
    }
    return safeMaskPts(path);   // static path (possibly []); null when not an array
  }
  function sanitizeMasks(l) {
    if (l.masks == null) return;
    if (!Array.isArray(l.masks)) { delete l.masks; return; }
    l.masks = l.masks.slice(0, MASK_MAX).map(m => {
      if (!m || typeof m !== 'object') return null;
      const path = safeMaskPath(m.path);
      if (path == null) return null;   // malformed path → drop the whole mask
      let feather = +m.feather; if (!isFinite(feather)) feather = 0;
      let opacity = +m.opacity; if (!isFinite(opacity)) opacity = 1;
      return {
        id: (typeof m.id === 'string' && m.id && m.id.length <= 64) ? m.id : newId('mask'),
        enabled: m.enabled !== false,                                   // absence stays ON (audioFx convention)
        mode: hasOwn(MASK_MODES, m.mode) ? m.mode : 'add',
        feather: Math.max(0, Math.min(500, feather)),
        opacity: Math.max(0, Math.min(1, opacity)),
        invert: m.invert === true,
        closed: m.closed !== false,
        path: path,
      };
    }).filter(Boolean);
  }

  // Camera Options (fov / focus / fog) come in from an imported .fmproj as raw JSON. A non-finite
  // number here is not cosmetic: fov feeds the focal length, and an Infinity or NaN reaching it NaNs
  // every layer transform in the scene. Rebuilt from a schema — unknown keys never survive.
  function sanitizeCamera(l) {
    if (!l || l.type !== 'camera') { if (l) { delete l.fov; delete l.focus; delete l.fog; } return; }
    const num = (v, lo, hi, dflt) => { const n = +v; return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt; };
    if (l.fov != null) { const f = +l.fov; if (isFinite(f) && f > 0.5 && f < 179) l.fov = f; else delete l.fov; }
    if (l.focus) {
      const f = l.focus;
      l.focus = { enabled: !!f.enabled, distance: num(f.distance, -100000, 100000, 0), dof: num(f.dof, 1, 100000, 200), blur: num(f.blur, 0, 2, 0.5) };
    }
    if (l.fog) {
      const g = l.fog;
      const near = num(g.near, -100000, 100000, 0), far = num(g.far, -100000, 200000, 2000);
      l.fog = { enabled: !!g.enabled, color: safeColor(g.color) ? g.color : '#ffffff', near: near, far: (far === near ? near + 1 : far) };
    }
  }
  /* layer.effects — the last major layer sub-structure with no validation on the way in, and the one
   * with the longest reach: `type` is a bare bracket key into six render dispatch tables, and every
   * value in `params` is evaluated per frame and handed to canvas APIs. Two of those tables were still
   * inheriting from Object.prototype until today (compositor TEXT_FX / PIXEL_ADJ), and the TEXT_FX
   * lookup CALLS what it finds — an effect named 'valueOf' on a text layer threw out of the render.
   * The tables are cut off now; this closes the other end, so a bad type never reaches them at all.
   *
   * BYTE-IDENTITY IS THE CONTRACT, and it is why this deliberately does NOT copy sanitizeAudioFx's
   * shape. That one rebuilds every param from the schema, filling absences with the default. Here an
   * ABSENT param key is MEANINGFUL: the renderer falls back to the effect's `legacy` value, which for
   * a param added to an existing effect is whatever that effect used to hardcode — not the schema
   * default (fx-registry paramsOf: "an old instance must keep rendering as it always did"). Filling
   * absences would quietly restyle every old project; Edge Glow's radius alone jumps 3 → 8.
   * So the rule is: whitelist the TYPE, keep only keys the schema declares, validate each key that is
   * PRESENT, and leave absent keys absent.
   *
   * And when the registry has not loaded, do NOTHING. sanitizeAudioFx deletes in that case, which is
   * right for a handful of audio filters and very wrong here: one 404'd script would strip every
   * effect off every layer and then autosave the gutted project over the original.
   */
  const FX_MAX = 120, FX_ID_MAX = 64, FX_CHILD_MAX = 24;
  // -> {keep:false} means leave the key ABSENT, which is not the same as writing the default (above).
  function safeFxParam(pd, v) {
    const ty = pd.type;
    if (ty === 'color') return safeColor(v) ? { keep: true, value: v } : { keep: false };
    if (ty === 'layer') return (typeof v === 'string' && v.length <= FX_ID_MAX) ? { keep: true, value: v } : { keep: false };
    if (ty === 'toggle') return (typeof v === 'boolean' || v === 0 || v === 1) ? { keep: true, value: v } : { keep: false };
    if (ty === 'segment') {
      // Options are normalised to [value, label] pairs by fx-registry. Compare both ways: a bare-label
      // list makes the value the INDEX (a number), while an explicit pair can carry anything the
      // catalogue author wrote.
      const ok = (pd.options || []).some(o => Array.isArray(o) && (o[0] === v || (isFinite(+o[0]) && isFinite(+v) && +o[0] === +v)));
      return ok ? { keep: true, value: v } : { keep: false };
    }
    const min = isFinite(pd.min) ? pd.min : -1e7, max = isFinite(pd.max) ? pd.max : 1e7;
    if (typeof v === 'number' && isFinite(v)) return { keep: true, value: Math.max(min, Math.min(max, v)) };
    // A numeric STRING is coerced rather than dropped. The renderer coerces it anyway (evalProp feeds
    // arithmetic), so keeping it renders the same and dropping it would change how the layer looks.
    if (typeof v === 'string' && v.trim() !== '' && isFinite(+v)) return { keep: true, value: Math.max(min, Math.min(max, +v)) };
    if (pd.keyframable !== false) { const kfp = safeKfProp(v, min, max); if (kfp) return { keep: true, value: kfp }; }
    return { keep: false };
  }
  function sanitizeEffects(l) {
    /* MOTION BLUR (OBJECT): FLAG → EFFECT (queue 335). It used to be `layer.motionBlur`, layer state
     * rather than a stack entry, which is why it could never go inside a Filter. Every project he has
     * already made carries the flag, and there is NO scene versioning and no other load-time layer
     * normalisation in this app — so if nothing converts it, his existing work silently loses its motion
     * blur. Silently is the operative word: nothing throws, no test goes red, the picture just stops
     * smearing.
     * This is the FIRST statement in the function on purpose. Below are two early returns
     * (`l.effects == null`, and the registry not being loaded), and a layer carrying the flag with no
     * effects array is the commonest legacy shape there is — hooked underneath them, the migration would
     * die on exactly the layer it exists for.
     * It sits here rather than at the call sites because this one function is reached from all three
     * routes in: project load, import, and history.restore.
     * UNSHIFT, never push. The dispatch that read this flag is at the BASE of the post-fx recursion, so
     * the blur has always composited INNERMOST; appending it would put it outermost and quietly change
     * the picture on every project that has both an effect and the blur.
     * Cameras are skipped: `cam.motionBlur` is a different feature with its own renderer (camBlurSlices)
     * and a camera cannot hold an effect at all. */
    if (l && l.type !== 'camera' && l.motionBlur && typeof l.motionBlur === 'object' && l.motionBlur.enabled) {
      const mb = l.motionBlur;
      if (!Array.isArray(l.effects)) l.effects = [];
      if (!l.effects.some(e => e && e.type === 'objectblur')) {
        // Both params written explicitly — sanitizeEffects keeps only params that are PRESENT, so an
        // empty object would render at the kernel's fallbacks and silently reset everyone's settings.
        const sh = typeof mb.shutter === 'number' && isFinite(mb.shutter) ? Math.max(0, Math.min(4, mb.shutter)) : 0.5;   // ceiling matches the renderer (queue 379)
        const sa = typeof mb.samples === 'number' && isFinite(mb.samples) ? Math.max(2, Math.min(32, Math.round(mb.samples))) : 8;
        l.effects.unshift({ type: 'objectblur', enabled: true, params: { shutter: sh, samples: sa } });
      }
      delete l.motionBlur;   // converted — leaving it would render the blur twice
    }
    /* PER-CUE STACKS GO THROUGH THE SAME GATE (queue 151). A caption cue can carry its own effects
     * array now, and it arrives from exactly the same places layer.effects does — an imported project
     * file, an autosave written by an older build, a hand-edited JSON. This function's own note calls
     * layer.effects "the sub-structure with the weakest validation on the way in"; a second one that
     * skipped the check entirely would simply be weaker still. Recursion is one level and cannot loop:
     * a cue is a plain object with no captions of its own. */
    if (Array.isArray(l.captions)) {
      l.captions.forEach(c => {
        if (!c || typeof c !== 'object') return;
        if (c.effects == null) return;
        if (!Array.isArray(c.effects)) { delete c.effects; return; }
        sanitizeEffects(c);
      });
    }
    if (l.effects == null) return;
    if (!Array.isArray(l.effects)) { delete l.effects; return; }
    if (!FM.fxRegistry || typeof FM.fxRegistry.get !== 'function') return;   // no whitelist → touch nothing
    const sane = (f, depth) => {
      if (!f || typeof f !== 'object' || typeof f.type !== 'string') return null;
      // A filter container (queue 113) is a normal effect that happens to carry children. Recognised
      // by SHAPE here rather than by registry lookup, because the type is not registered until step 5
      // and this has to hold the structure together before then.
      const container = f.type === FM.FX_CONTAINER && Array.isArray(f.effects);
      // Nesting is capped at 1, and capped HERE as well as in the add path — the add path only governs
      // what this build creates, and a hand-edited or older file is exactly the input this function
      // exists for. Two levels would cost 2^depth full rasterisations, each holding a comp-sized plate
      // pair (~16.6MB at 1080x1920), against depth counters in the compositor that are not capped.
      if (container && depth > 0) return null;
      const reg = FM.fxRegistry.get(f.type);
      // The round-trip IS the own-property guarantee: a get() that walked the prototype chain returns
      // something whose own .type cannot match what was asked for.
      if (!container && (!reg || typeof reg !== 'object' || reg.type !== f.type)) return null;
      const src = (f.params && typeof f.params === 'object') ? f.params : {};
      const params = {};
      ((reg && reg.params) || []).forEach(pd => {
        if (!pd || typeof pd.key !== 'string') return;
        if (!hasOwn(src, pd.key)) return;                                    // absent stays absent
        const r = safeFxParam(pd, src[pd.key]);
        if (r.keep) params[pd.key] = r.value;
      });
      // enabled: absence stays ON — matches makeInstance and the engine's own `e.enabled === false` test.
      // Transient UI state (fx._expanded) is dropped by the rebuild, which is what the leading
      // underscore means everywhere else in this file.
      const out = { type: f.type, enabled: f.enabled !== false, params: params };
      if (container) {
        out.effects = f.effects.slice(0, FX_CHILD_MAX).map(c => sane(c, depth + 1)).filter(Boolean);
        // A library filter's own name. String-only and length-capped — it reaches the inspector row as
        // textContent so it cannot carry markup, but an unbounded one would still wreck the row.
        if (typeof f.name === 'string' && f.name && f.name.length <= 64) out.name = f.name;
      }
      return out;
    };
    l.effects = l.effects.slice(0, FX_MAX).map(f => sane(f, 0)).filter(Boolean);
  }
  /* THE VALUE-LEVEL CHECKS THAT MUST RUN ON EVERY LOAD, NOT ONLY ON IMPORT (bug hunt, 21 Aug).
   *
   * These were inside sanitizeImportedLayers, and the ordinary project load runs only sanitizeEffects —
   * the load path says so itself: "anything an import once let through has been autosaved back into
   * localStorage and comes in unchecked here forever after." Measured (tests/_fillurl.html): a shape
   * whose `fillImage` is `https://example.invalid/beacon.png` SURVIVES a save and a reopen, and
   * js/compositor.js does `rec.img.src = layer.fillImage` — so drawing the project fetches it. A
   * zero-click beacon / LAN probe out of an app whose whole promise is that nothing leaves the device.
   * The same run showed `fillGradient.angle` coming back as the string "99999" and `type` as
   * "url(http://evil)", both of which are interpolated raw into a CSS gradient string.
   *
   * Split out rather than copied, so the import and the load cannot drift into two different ideas of
   * what is safe. Only the CHEAP value checks are here: audioFx, masks and behaviours stay
   * import-only, because rewriting those across his existing projects is the much larger change the
   * load path's comment already declines, and it is logged rather than smuggled in. */
  function sanitizeUnsafeValues(l) {
    if (!l) return;
    if (l.fillImage != null && !/^data:image\//i.test(String(l.fillImage))) delete l.fillImage;
    if (l.labelColor != null && !safeColor(l.labelColor)) delete l.labelColor;   // → transparent stripe
    if (l.clipColor != null && !safeColor(l.clipColor)) delete l.clipColor;      // → default clip colour
    if (l.clipColorSet != null) l.clipColorSet = !!l.clipColorSet;               // deliberate-choice flag: boolean only
    if (l.fillGradient) {
      if (l.fillGradient.c0 != null && !safeColor(l.fillGradient.c0)) l.fillGradient.c0 = '#3a7bd5';
      if (l.fillGradient.c1 != null && !safeColor(l.fillGradient.c1)) l.fillGradient.c1 = '#0a0c10';
      // angle + type are interpolated raw into a CSS gradient string (inspector fill preview) — a
      // crafted angle could close the gradient and inject url(http://…): coerce to a number / whitelist.
      l.fillGradient.angle = Math.max(0, Math.min(360, +l.fillGradient.angle || 0));
      if (['linear', 'radial', 'angular'].indexOf(l.fillGradient.type) < 0) l.fillGradient.type = 'linear';
    }
  }
  FM.storage_sanitizeUnsafeValues = sanitizeUnsafeValues;   // seam: the suite drives the real function

  /* A LAYER'S TIMING MUST BE A NUMBER (queue 467, found by a bug hunt).
   * The project's own width/height/fps/duration have been clamped since the OOM-brick fix above, but the
   * LAYER's start and duration never were — an asymmetry, not a decision. Measured: a file carrying
   * `"duration": "abc"`, `null` or `{}` imports with that value intact, and since every timeline and
   * compositor read is `start + duration`, the arithmetic goes to NaN. The clip then silently never
   * renders and the whole project reports itself as 0 seconds long. No crash, no message — the project
   * just looks empty, which is the worst way for a file to fail.
   * It matters more from here on: sharing project and template files with other people is something Ezra
   * has asked for (queue 427), and that turns "a file I made" into "a file someone sent me".
   * ⚠️ speed and volume are KEYFRAMABLE, so they arrive as {kf:[…]} objects on perfectly good projects.
   * Coercing those to numbers would silently delete real animation — a far worse bug than the one being
   * fixed — so an animated value is left alone and only a non-finite PLAIN value is repaired. */
  function num(v, lo, hi, dflt) {
    // MISSING is not the same as OUT OF RANGE, and conflating them was wrong in the first draft:
    // `+null` is 0, which is finite, so a null duration clamped to the 0.05 floor and imported as a
    // 20-millisecond sliver of a clip instead of falling back to a sane length. Absent means absent.
    if (v === null || v === undefined || v === '') return dflt;
    v = +v;
    return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt;
  }
  function sanitizeTiming(l) {
    if (!l) return;
    l.start = num(l.start, 0, 3600, 0);
    l.duration = num(l.duration, 0.05, 3600, 1);       // 0 would be a clip that cannot be selected or seen
    if (l.trimStart != null) l.trimStart = num(l.trimStart, 0, 3600, 0);
    // …and the two that may legitimately be animated: repair a broken plain value, never touch a keyframed one.
    if (l.speed != null && !(FM.isAnimated && FM.isAnimated(l.speed))) l.speed = num(l.speed, 0.05, 100, 1);
    if (l.volume != null && !(FM.isAnimated && FM.isAnimated(l.volume))) l.volume = num(l.volume, 0, 4, 1);
  }
  FM.storage._sanitizeTiming = sanitizeTiming;   // seam: the suite drives the real function

  /* KEYFRAMES FROM A FILE (queue 468, found by a bug hunt).
   * `FM.evalProp` assumes a keyframe list is sorted by time and that every entry HAS a value. Both are
   * true of anything this app writes — `toggleProp` inserts in order and substitutes 0 for a missing
   * fallback, and all 199 visual effects plus all 60 audio params carry a default, so the app cannot
   * produce either shape. A FILE can. Measured:
   *   · **unsorted** keyframes make `evalProp` return the FIRST entry's value at every time — the whole
   *     animation silently collapses to a constant. This is the worse of the two: the movement is simply
   *     gone, with nothing to see or undo.
   *   · a keyframe whose `v` is `null` (perfectly legal JSON) evaluates to NaN at exactly its own time,
   *     which puts the layer somewhere it should not be rather than crashing — wrong, quietly.
   * WHY A GENERIC WALK rather than a list of properties. Animated props are scattered — transform
   * channels, speed, volume, per-effect params, per-audio-effect params, text colour — and a hand-kept
   * list is a second source of truth that goes stale the moment anything new becomes keyframable. That is
   * the exact bug shape this codebase keeps paying for. Anything shaped `{kf:[…]}` is repaired, wherever
   * it lives, so a future animatable property is covered without anyone remembering.
   * ⚠️ A STRING VALUE IS LEGAL and must survive: colour keyframes lerp '#rrggbb' channel-wise. Only a
   * MISSING value is dropped. */
  function sanitizeKeyframes(node, depth) {
    if (!node || typeof node !== 'object' || (depth || 0) > 8) return;
    if (Array.isArray(node.kf)) {
      const kept = node.kf.filter(function (f) {
        return f && typeof f === 'object' && isFinite(+f.t) && f.v !== null && f.v !== undefined;
      });
      // Sorted by time, because evalProp walks the list in order and a file need not be.
      kept.sort(function (a, b) { return (+a.t) - (+b.t); });
      kept.forEach(function (f) { f.t = +f.t; });
      if (!kept.length) delete node.kf;              // no usable keyframes → not an animation at all
      else node.kf = kept;
    }
    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; i++) {
      const v = node[keys[i]];
      if (v && typeof v === 'object') {
        if (Array.isArray(v)) { for (let j = 0; j < v.length; j++) sanitizeKeyframes(v[j], (depth || 0) + 1); }
        else sanitizeKeyframes(v, (depth || 0) + 1);
      }
    }
  }
  FM.storage._sanitizeKeyframes = sanitizeKeyframes;   // seam: the suite drives the real function

  function sanitizeImportedLayers(layers) {
    (layers || []).forEach(l => {
      if (!l) return;
      sanitizeEffects(l);
      sanitizeAudioFx(l);
      sanitizeTrimRepeater(l);
      sanitizeBehaviors(l);
      sanitizeMasks(l);
      sanitizeCamera(l);
      sanitizeUnsafeValues(l);
      sanitizeTiming(l);
      sanitizeKeyframes(l, 0);
    });
  }
  // Exposed for the suite: the byte-identity contract is asserted against the REAL function, not a
  // re-implementation of it in the test (which would only ever agree with itself).
  FM.storage._sanitizeEffects = sanitizeEffects;
  FM.storage._sanitizeLayers = sanitizeImportedLayers;   // read by the suite, and by history.restore
  FM.storage._reIdLayers = reIdLayers;
  FM.storage.applyScene = async function (obj) {
    if (!obj || !obj.project || !Array.isArray(obj.layers)) return false;
    if (obj.layers.length > 2000) return false;   // absurd layer count = malicious/corrupt — refuse rather than hang the render
    clampProjectDims(obj.project);
    sanitizeImportedLayers(obj.layers);
    // Re-id EVERY imported layer. An exported file carries the ids of the project it came from —
    // reusing them would collide with that project in the SHARED IDB media store (the old
    // "drop stale media" loop here actively deleted the other project's blobs). Fresh ids need
    // no clearing at all; embedded media is rehydrated under the new ids below.
    const re = reIdLayers(obj.layers);
    FM.scene.project = obj.project;
    FM.scene.layers = re.layers;
    repairAndAnnounce(FM.scene.layers, false);   // an imported .fmotion.json is untrusted input: a cycle in it is a hang, not a render
    FM.scene.selectedId = (obj.selectedId && re.map[obj.selectedId]) || (re.layers[0] ? re.layers[0].id : null);
    FM.scene.selectedIds = (Array.isArray(obj.selectedIds) ? obj.selectedIds : []).map(id => re.map[id]).filter(Boolean);
    if (!FM.scene.selectedIds.length && FM.scene.selectedId) FM.scene.selectedIds = [FM.scene.selectedId];
    if (FM.fonts && obj.fonts) await FM.fonts.applyEmbedded(obj.fonts);   // register any fonts carried in the file
    if (obj.media) {
      for (const id of Object.keys(obj.media)) {
        const md = obj.media[id], nid = re.map[id];
        if (!nid || !md || (md.kind !== 'video' && md.kind !== 'image')) continue;
        try {
          const file = await dataURLToFile(md.dataURL, md.name);
          if (!file) continue;   // non-data: URL was rejected → layer loads media-less (relink via Replace media…)
          const rec = md.kind === 'video' ? await FM.loadVideoFile(file) : await FM.loadImageFile(file);
          if (rec) { FM.media.set(nid, rec); if (rec.kind === 'video' && rec.el) rec.el.addEventListener('seeked', () => { if (!FM.playing && FM.requestRender) FM.requestRender(); }); if (FM.wireVideoRepaint) FM.wireVideoRepaint(rec); }
        } catch (e) { /* a missing/corrupt embed → that layer loads media-less (relink via Replace media…) */ }
      }
    }
    if (FM.resizeCanvas) FM.resizeCanvas();
    if (FM.refreshAll) FM.refreshAll();
    if (FM.seekVideosToTime) FM.seekVideosToTime();
    if (FM.requestRender) FM.requestRender();
    return true;
  };

  FM.storage.exportFile = async function () {
    const obj = await FM.storage.serializeScene(FM.scene);
    const name = ((FM.scene.project.name || 'project').replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim()) || 'project';
    const blob = new Blob([JSON.stringify(obj, FM.jsonReplacer)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name + '.fmotion.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (FM.toast) FM.toast('Project file saved');
  };

  FM.storage.importFile = function (onDone) {   // onDone runs ONLY on a successful import (not on picker-cancel)
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0]; input.remove();
      if (!file) return;
      try {
        const obj = JSON.parse(await file.text());
        if (obj.app !== 'freemotion') { if (FM.toast) FM.toast('Not a FreeMotion project file'); return; }
        // Import into a NEW project — never overwrite whatever happens to be open. (#r1)
        if (FM.projects) await FM.projects.create({ name: (obj.project && obj.project.name ? obj.project.name : 'Imported project'), width: obj.project && obj.project.width, height: obj.project && obj.project.height });
        const ok = await FM.storage.applyScene(obj);
        if (ok) { if (FM.history) FM.history.reset(); FM.storage.markDirty(); FM.storage.save(); if (FM.projects) FM.projects.touchCurrent(true); if (FM.toast) FM.toast('Project imported'); if (onDone) onDone(); }
      } catch (e) { if (FM.toast) FM.toast('Could not read that project file'); }
    });
    document.body.appendChild(input); input.click();
  };

  // ================= Multi-project home screen + Templates + Elements =================
  // Projects: index in localStorage 'fm.projects', one doc per project in 'fm.proj.<id>'.
  // Templates/Elements: small index in localStorage; the heavy pack (layer JSON + media Files)
  // lives in IndexedDB under 'tpl:<id>' / 'elem:<id>' so base64 never bloats the 5MB LS quota.

  // Deep-clone layers and re-id them (fresh ids + parent remap) so inserting a pack twice — or
  // into a project that already has those ids — can never collide with existing layers/media.
  /* SANITISE HERE, not at each call site (queue 217). reIdLayers is the gate every batch of FOREIGN
   * layers comes through — importing a project file, inserting a template, inserting an element,
   * duplicating a project — and until now only ONE of those four also called
   * sanitizeImportedLayers. The other three handed the renderer whatever was in the file.
   * Putting it here makes it structural: a new way of bringing layers in cannot forget, because
   * re-iding them is not optional and this is where that happens. Running it twice on the import
   * path is harmless — the sanitisers rebuild from a known schema, so they are idempotent — and a
   * duplicated call is a far cheaper mistake than a missed one.
   * It matters more than it did: #113's filters make layer.effects a NESTED structure, so "which
   * paths validate" stops being academic the moment a container can arrive through one that does not. */
  function reIdLayers(layers) {
    const map = Object.create(null);   // null-proto: an imported layer.parent of 'constructor' would otherwise "remap" to a prototype function
    const out = JSON.parse(JSON.stringify(layers, FM.jsonReplacer));
    sanitizeImportedLayers(out);
    out.forEach(l => { map[l.id] = newId('l'); l.id = map[l.id]; });
    out.forEach(l => { if (l.parent) l.parent = map[l.parent] || null; });
    // Behaviors carry CROSS-LAYER id refs (follow.targetId, audio.sourceId). Remap them through the same
    // table or a follow/audio-drive silently dies in every shared/imported copy (the id points at the
    // source project's layer). map is null-proto, so a bogus id can't resolve to a prototype key.
    out.forEach(l => { if (Array.isArray(l.behaviors)) l.behaviors.forEach(b => { if (b && b.params) {
      if (b.params.targetId) b.params.targetId = map[b.params.targetId] || '';
      if (b.params.sourceId) b.params.sourceId = map[b.params.sourceId] || '';
    } }); });
    // EFFECTS carry cross-layer refs too, and this was the class that got missed. Every effect
    // declared `layer: true` in the registry stores a layer id in params.source — Luma Matte,
    // Compound Blur, Match Grade, Displacement Map, Polar Displacement. Unremapped, the copy's id
    // pointed at a layer that does not exist in the new scene, and the compositor's lookup simply
    // returns undefined and falls through to drawing the layer PLAIN: the full uncut rectangle
    // instead of the matte, no blur map, no grade. No error and no toast, and the broken ref is
    // autosaved into the copy, so the duplicated / imported / templated project silently renders
    // differently from the original and stays that way. karaokeOf is the same unremapped class.
    out.forEach(l => {
      FM.eachFx(l, fx => {
        if (fx && fx.params && fx.params.source) fx.params.source = map[fx.params.source] || '';
      });
      if (l.karaokeOf) l.karaokeOf = map[l.karaokeOf] || null;
    });
    return { layers: out, map };
  }
  // Exposed for the regression suite: the cross-layer-ref remap is pure and worth asserting directly,
  // and the alternative — duplicating a real project to check it — writes to IndexedDB.
  FM.storage._reIdLayers = reIdLayers;
  // Snapshot layers + their in-memory media Files into a storable pack.
  function packLayers(layers) {
    const media = {};
    layers.forEach(l => {
      const m = FM.media.get(l.id);
      if (m && m.file) media[l.id] = { file: m.file, kind: m.kind };
    });
    return { layers: JSON.parse(JSON.stringify(layers, FM.jsonReplacer)), media: media };
  }
  // Register a pack's media for freshly re-id'd layers: in-memory registry + IDB (so it autosaves).
  async function hydratePack(layers, media, idMap) {
    FM._mediaBusy = (FM._mediaBusy || 0) + 1;   // pruneOrphans stands down while packs hydrate
    let db = null;
    try { db = await openDB(); } catch (e) {}
    for (const oldId of Object.keys(media || {})) {
      const newLayerId = idMap[oldId];
      const md = media[oldId];
      if (!newLayerId || !md || !md.file) continue;
      try {
        const rec = md.kind === 'video' ? await FM.loadVideoFile(md.file) : await FM.loadImageFile(md.file);
        FM.media.set(newLayerId, rec);
        if (rec.kind === 'video' && rec.el) rec.el.addEventListener('seeked', () => { if (!FM.playing && FM.requestRender) FM.requestRender(); });
        if (FM.wireVideoRepaint) FM.wireVideoRepaint(rec);
        if (db) await idbPut(db, newLayerId, { file: md.file, kind: md.kind });
      } catch (e) { /* that layer loads media-less */ }
    }
    if (db) db.close();
    FM._mediaBusy = Math.max(0, (FM._mediaBusy || 1) - 1);
  }
  // Poster frame of the current scene for home-screen cards. 360px longest side (2× the old 180 —
  // retina-crisp at the list-row thumb size), PROGRESSIVE halving on the way down (a single
  // 1080→180 drawImage skipped most source pixels = the old mushy cards), JPEG q0.8.
  function makeThumb() {
    try {
      const P = FM.scene.project;
      let src = document.createElement('canvas'); src.width = P.width; src.height = P.height;
      FM.renderScene(src.getContext('2d'), FM.scene, FM.time);
      const s = Math.min(360 / P.width, 360 / P.height, 1);
      const tw = Math.max(2, Math.round(P.width * s)), th = Math.max(2, Math.round(P.height * s));
      while (src.width >= tw * 2) {   // halve until within 2× of target — each step averages real pixels
        const half = document.createElement('canvas');
        half.width = Math.max(tw, Math.round(src.width / 2)); half.height = Math.max(th, Math.round(src.height / 2));
        const hg = half.getContext('2d'); hg.imageSmoothingQuality = 'high';
        hg.drawImage(src, 0, 0, half.width, half.height);
        src = half;
      }
      const c = document.createElement('canvas');
      c.width = tw; c.height = th;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
      g.drawImage(src, 0, 0, tw, th);
      return c.toDataURL('image/jpeg', 0.8);
    } catch (e) { return null; }
  }

  /* ═══ A PICTURE OF THE ELEMENT ITSELF (queue 342).
   * `saveFromProject` — the Home route — stamps the source project's thumbnail, which is right there
   * because the project IS the element. `save(name, layers)` — the "save this selection as an
   * element" route — stamped NOTHING, so every element made that way fell back to a letter glyph.
   * That is the "a card is a name and a layer count" in his complaint: fine with three elements,
   * useless with thirty, and it is not a taste call which way it should go.
   * Rendered from the layers being saved rather than the open project, so a selection of two layers
   * out of twenty shows those two — the thing you are actually saving. */
  function makeLayerThumb(layers) {
    try {
      if (!layers || !layers.length || !FM.renderScene) return null;
      const P = FM.scene.project;
      const mini = { project: P, layers: layers };
      let src = document.createElement('canvas'); src.width = P.width; src.height = P.height;
      FM.renderScene(src.getContext('2d'), mini, FM.time);
      const s = Math.min(360 / P.width, 360 / P.height, 1);
      const tw = Math.max(2, Math.round(P.width * s)), th = Math.max(2, Math.round(P.height * s));
      while (src.width >= tw * 2) {
        const half = document.createElement('canvas');
        half.width = Math.max(tw, Math.round(src.width / 2)); half.height = Math.max(th, Math.round(src.height / 2));
        const hg = half.getContext('2d'); hg.imageSmoothingQuality = 'high';
        hg.drawImage(src, 0, 0, half.width, half.height);
        src = half;
      }
      const c = document.createElement('canvas');
      c.width = tw; c.height = th;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
      g.drawImage(src, 0, 0, tw, th);
      return c.toDataURL('image/jpeg', 0.8);
    } catch (e) { return null; }   // a thumbnail is never worth failing a save over
  }
  FM._makeLayerThumb = makeLayerThumb;

  // Thumbnails live in IndexedDB (key 'thumb:<id>'), NOT in the fm.projects index. The index is
  // re-parsed + rewritten on EVERY autosave (~0.6s while editing); an inline ~8KB JPEG per project
  // made that a multi-MB serialize at a few hundred projects — the "gets laggy, delete some" problem.
  // Out of the index, each entry is ~150 bytes, so hundreds of projects stay snappy. (STORE 'media' is
  // keyed by layer id like 'l_…'; 'thumb:p_…' can't collide.)
  // In-memory mirror of what's in IDB, so re-rendering the Home grid (every search keystroke, every
  // select tick) doesn't reopen the database once per card — that's what made the cards strobe their
  // ▶ placeholder while typing. A cache hit resolves in a microtask, before the browser paints.
  const _thumbCache = new Map();
  function putThumb(id, url) { _thumbCache.set(id, url); openDB().then(db => idbPut(db, 'thumb:' + id, url).then(() => db.close())).catch(() => {}); }
  function delThumb(db, id) { _thumbCache.delete(id); return idbDel(db, 'thumb:' + id); }

  // Hand back everything the outgoing project's media holds, then drop the registry entries (the
  // blobs stay in IDB — this is a switch, not a delete).
  //
  // The audio graph has to go with it: media.remove only revokes the object URL, so a rec carrying a
  // live effect chain would leave its LFOs running on the shared AudioContext with no reference left
  // to stop them.
  //
  // Order matters and the ONLY safe order is release-then-remove: FM.media.remove deletes the
  // registry entry, so after it there is no reference left to release anything through. This loop
  // used to call dropAudioGraph + media.remove and skip BOTH decoded caches. Measured on a real
  // project switch (3 image clips + one frame cache): 5 ImageBitmaps created, 0 closed, and 4 of
  // them still reachable after six forced GCs — retained, not merely awaiting collection. Both
  // caches are ImageBitmaps, i.e. native memory that exerts no GC pressure, and frameCache alone is
  // budgeted at up to 160MB on mobile (FM.frameCacheLimits) precisely because it is expected to be
  // handed back promptly. FM.resetProject did it in this order before queue 177 removed it; this path had drifted.
  //
  // Split out of projects.open() and exported so the teardown can be regression-tested directly.
  // Driving a real switch from the suite would mean stubbing localStorage and FM.storage.load in
  // the live app page, and this app holds the only copy of the user's work.
  /* ONE definition of "let this clip go", so the two callers below can never tear down differently.
   * Detaching the element's src matters as much as revoking the URL: a <video> that still points at
   * a blob keeps its decode buffers, and revokeObjectURL alone does not tell it to let them go. */
  FM.releaseMediaFor = function (id) {
    const m = FM.media.get(id);
    if (!m) return false;
    if (FM.clearFrameCache) FM.clearFrameCache(m);
    if (FM.clearClipStrip) FM.clearClipStrip(m);
    if (FM.dropAudioGraph) FM.dropAudioGraph(m);
    if (m.el && m.el.tagName === 'VIDEO') {
      try { m.el.pause(); } catch (e) {}
      try { m.el.removeAttribute('src'); m.el.load(); } catch (e) {}
    }
    FM.media.remove(id);   // revokes the object URL
    return true;
  };

  FM.releaseProjectMedia = function (layers) {
    (layers || []).forEach(l => FM.releaseMediaFor(l.id));
  };

  /* Free the in-memory record of a clip that can no longer be reached (the leak named in the
   * "Editing lags, and gets bad fast" entry: *"FM.media never releases a deleted clip's record, so
   * memory grows with every import you throw away"*).
   *
   * WHY IT COULD NOT SIMPLY BE FREED ON DELETE, and why this is safe. FM.deleteLayer deliberately
   * keeps the record, because undo restores the layer's JSON only — destroying the media there made
   * an undone delete come back permanently BLANK, which is the worst kind of data loss. So the test
   * is not "was it deleted" but "can it still come back": a record is freed only when its id appears
   * in NEITHER the live scene NOR any snapshot on the history stack. Anything an undo OR a redo could
   * restore is still reachable and is kept. The whole stack is scanned, not just the undo side.
   *
   * The IndexedDB blob is untouched — pruneOrphans owns that at boot. This is RAM only.
   * Called from history.commit() when a snapshot is discarded, since that is the only moment an id
   * can stop being reachable. */
  FM.releaseUnreachableMedia = function (snapshots) {
    if (FM._mediaBusy) return 0;               // a pack is hydrating; its ids are in flight
    const store = (FM.media && FM.media.all && FM.media.all()) || {};
    const ids = Object.keys(store);
    if (!ids.length) return 0;
    const live = new Set(((FM.scene && FM.scene.layers) || []).map(l => l.id));
    const snaps = snapshots || [];
    let freed = 0;
    ids.forEach(id => {
      if (live.has(id)) return;
      if (FM.media.isPinned && FM.media.isPinned(id)) return;   // owned by something other than the scene

      for (let i = 0; i < snaps.length; i++) if (snaps[i].indexOf(id) >= 0) return;   // an undo or redo can still bring it back
      if (FM.releaseMediaFor(id)) freed++;
    });
    return freed;
  };

  FM.projects = {
    list() { return readJSON(PROJ_INDEX, []); },
    // Thumbnail for a card — IDB first, then the legacy inline thumb (pre-migration entries). Async.
    async getThumb(id) {
      if (_thumbCache.has(id)) return _thumbCache.get(id);
      try { const db = await openDB(); const v = await idbGet(db, 'thumb:' + id); db.close(); if (v) { _thumbCache.set(id, v); return v; } } catch (e) {}
      const e = this.list().find(p => p.id === id);
      const legacy = (e && e.thumb) || null;
      if (legacy) _thumbCache.set(id, legacy);
      return legacy;
    },
    // One-time sweep: lift every inline thumb out of the index into IDB, then null it. Runs once (guarded)
    // so existing users' indexes shrink immediately instead of only as each project is next opened.
    async migrateThumbs() {
      try { if (localStorage.getItem('fm.thumbsMigrated')) return; } catch (e) { return; }
      const idx = this.list(); let moved = false;
      try {
        const db = await openDB();
        for (const p of idx) { if (p.thumb) { await idbPut(db, 'thumb:' + p.id, p.thumb); _thumbCache.set(p.id, p.thumb); p.thumb = null; moved = true; } }
        db.close();
      } catch (e) {}
      if (moved) this.saveIndex(idx);
      try { localStorage.setItem('fm.thumbsMigrated', '1'); } catch (e) {}
    },
    // Rough storage-health read for the home screen. Now that thumbs are out of the hot path the app
    // stays fast far longer, but a very large library still means a big IndexedDB + slower home render,
    // so surface a gentle nudge (never a blocker). level: 'ok' | 'busy' | 'full'.
    health() {
      const n = this.list().length;
      return { count: n, level: n >= 120 ? 'full' : n >= 60 ? 'busy' : 'ok' };
    },
    saveIndex(arr) { writeJSON(PROJ_INDEX, arr); },
    currentId() { return curId(); },
    // One-time: fold the legacy single fm.scene autosave into the project index.
    migrate() {
      let id = curId();
      const idx = this.list();
      if (id && idx.some(p => p.id === id)) return;
      // A current doc that lost its index entry (e.g. a saveIndex quota failure) gets RE-indexed,
      // not abandoned — minting a new id would orphan the doc and pruneOrphans would eat its media.
      if (id) {
        const doc = readJSON('fm.proj.' + id, null);
        if (doc && doc.project) {
          idx.unshift({ id: id, name: doc.project.name || 'My project', created: Date.now(), modified: Date.now(), width: doc.project.width, height: doc.project.height, duration: doc.project.duration, layers: (doc.layers || []).length, thumb: null });
          this.saveIndex(idx);
          return;
        }
      }
      const legacy = readJSON(SCENE_KEY, null);
      id = newId('p');
      try { localStorage.setItem(CUR_KEY, id); } catch (e) {}
      if (legacy && legacy.project) {
        writeJSON('fm.proj.' + id, legacy);
        idx.unshift({ id: id, name: legacy.project.name || 'My project', created: Date.now(), modified: Date.now(), width: legacy.project.width, height: legacy.project.height, duration: legacy.project.duration, layers: (legacy.layers || []).length, thumb: null });
        try { localStorage.removeItem(SCENE_KEY); } catch (e) {}
      } else {
        idx.unshift({ id: id, name: 'My project', created: Date.now(), modified: Date.now(), width: 1080, height: 1920, duration: 0, thumb: null });
      }
      this.saveIndex(idx);
    },
    // Keep the index card for the current project fresh (called from every autosave — cheap; the
    // thumbnail re-render is throttled and skipped mid-playback).
    /* `noThumb` skips the capture unconditionally (queue 128). makeThumb() renders the current frame
     * and serialises it, and that is expensive where it matters: measured at 6x CPU throttle it is
     * **62ms of the 81ms** that js/home.js's open() blocks for before the leaving-a-project animation
     * can start. The metadata half — name, size, duration, layer count — is what the card grid needs
     * in order to be rendered, and it is nearly free. So the two are separable, and home.open() takes
     * the cheap half now and the picture a moment later. */
    touchCurrent(forceThumb, noThumb) {
      const id = boundId || curId(); if (!id) return;   // THIS tab's project, not the shared fm.currentProject — else a 2nd tab makes us stamp its card/thumbnail with our scene
      const idx = this.list();
      const e = idx.find(p => p.id === id); if (!e) return;
      const P = FM.scene.project;
      e.name = P.name || 'Untitled';
      // Backfill BEFORE the bump below — reading e.modified afterwards would stamp every pre-v3.68
      // project as "created today" the moment it's first edited.
      if (!e.created) e.created = e.modified || Date.now();
      // modified (= home-list order) moves ONLY on a real edit — viewing refreshes meta/thumb but
      // leaves the project exactly where it was in the list.
      if (_dirty) { e.modified = Date.now(); _dirty = false; }
      e.width = P.width; e.height = P.height; e.duration = P.duration; e.fps = P.fps || 30;
      e.layers = FM.scene.layers.length;
      const now = Date.now();
      // A pinned thumbnail (user chose a specific frame) is never auto-overwritten by the periodic capture.
      if (!noThumb && !P.thumbPinned && (forceThumb || (now - thumbTimer > 12000 && !FM.playing))) { thumbTimer = now; const t = makeThumb(); if (t) { e.thumb = null; putThumb(id, t); } }   // thumb → IDB, keeps the index small + autosave fast
      this.saveIndex(idx);
    },
    // Capture the current frame NOW as the card thumbnail (the video is correctly seeked at the playhead
    // here — rendering an arbitrary time later would draw the wrong video frame). The pin flag lives on
    // the project doc, so touchCurrent() stops auto-overwriting it. Returns false if nothing to capture.
    pinThumbnail() {
      const id = boundId || curId(); if (!id) return false;   // pin the thumbnail to THIS tab's project (see touchCurrent)
      const t = makeThumb(); if (!t) return false;
      const idx = this.list(); const e = idx.find(p => p.id === id);
      if (e) { e.thumb = null; this.saveIndex(idx); }
      putThumb(id, t);
      thumbTimer = Date.now();   // don't let a same-tick autosave race a fresh capture
      if (FM.scene && FM.scene.project) FM.scene.project.thumbPinned = true;   // touchCurrent() now leaves it alone
      return true;
    },
    // Switch the editor to another project (stash current first).
    async open(id) {
      if (id === curId()) return true;
      if (FM.tracker && FM.tracker.isPicking && FM.tracker.isPicking()) FM.tracker.cancel();   // drop any tracking overlay from the outgoing project
      if (FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive()) FM.pointEdit.stop();
      if (FM.cropTool && FM.cropTool.isActive && FM.cropTool.isActive()) FM.cropTool.stop();
      if (FM.fillDrag && FM.fillDrag.isActive && FM.fillDrag.isActive()) FM.fillDrag.stop();   // its layer belongs to the outgoing project
      if (FM.maskTool && FM.maskTool.isActive && FM.maskTool.isActive()) FM.maskTool.stop();   // same — and it caches the path it is editing
      if (FM.pause) FM.pause(); else FM.playing = false;   // stop WebAudio + <video> sound, not just the flag (#r4)
      if (FM.groupContext && FM.exitGroup) FM.exitGroup(true);   // the group view belongs to the outgoing project
      FM.storage.flushSync(); this.touchCurrent(true);
      FM.releaseProjectMedia(FM.scene.layers);
      try { localStorage.setItem(CUR_KEY, id); } catch (e) {}
      // Motion Blur (Footage) keeps a per-layer canvas of the previous frame. Those belong to the
      // OUTGOING project's layer ids and nothing else ever clears them (only the exporter did), so
      // the store grew for the whole session and a re-used id could inherit a stranger's frame.
      if (FM.resetMotionFlowCache) FM.resetMotionFlowCache();
      if (FM.viewport) FM.viewport.reset();   // fresh project → fresh view (preview pan/zoom is never saved)
      FM.scene.selectedId = null; FM.scene.selectedIds = []; FM.scene.layers = []; FM.time = 0;
      const ok = await FM.storage.load();
      if (!ok) { FM.scene.project = Object.assign(FM.newScene().project, { name: (this.list().find(p => p.id === id) || {}).name || 'Untitled' }); if (FM.refreshAll) FM.refreshAll(); }
      if (FM.selectLayer) FM.selectLayer(null);
      if (FM.history) FM.history.reset();
      if (FM.warnOversizeProject) FM.warnOversizeProject();
      return true;
    },
    async create(opts) {
      opts = opts || {};
      FM.storage.flushSync(); this.touchCurrent(true);
      const id = newId('p');
      const fresh = FM.newScene();
      fresh.project.name = opts.name || 'Untitled';
      if (opts.width) fresh.project.width = opts.width;
      if (opts.height) fresh.project.height = opts.height;
      if (opts.fps) fresh.project.fps = Math.max(1, Math.min(120, parseInt(opts.fps, 10) || 30));
      // background: a #rrggbb string paints, null/'' means TRANSPARENT (the compositor skips the fill).
      // Anything else is rejected rather than written into the doc — this value goes straight to fillStyle.
      if ('background' in opts) fresh.project.background = /^#[0-9a-f]{6}$/i.test(String(opts.background || '')) ? opts.background : null;
      clampProjectDims(fresh.project);   // opts can come from an untrusted import (importFile passes obj.project.width/height straight through)
      writeJSON('fm.proj.' + id, { project: fresh.project, layers: [], selectedId: null, selectedIds: [] });
      const idx = this.list();
      /* `elementDraft` marks a project that exists only as a WORKSPACE for building an element (queue
         340). Ezra: *"When you create a new element it just creates a new project"* — and he was right,
         because it does: an element is saved from layers, so something has to hold those layers while
         you draw them. The mistake was letting that workspace land in Projects looking like an ordinary
         project. Flagged here, hidden from the Projects tab, and shown under Elements as a draft. */
      const rec = { id: id, name: fresh.project.name, created: Date.now(), modified: Date.now(), width: fresh.project.width, height: fresh.project.height, fps: fresh.project.fps, duration: fresh.project.duration, thumb: null };
      if (opts.elementDraft) rec.elementDraft = true;
      idx.unshift(rec);
      this.saveIndex(idx);
      await this.open(id);
      return id;
    },
    async duplicate(id) {
      if (id === curId() && FM.storage && FM.storage.flushSync) FM.storage.flushSync();   // duplicating the OPEN project must copy the last 600ms of edits, not the stale doc
      const doc = readJSON('fm.proj.' + id, null); if (!doc) return;
      FM._mediaBusy = (FM._mediaBusy || 0) + 1;
      const src = this.list().find(p => p.id === id) || {};
      const re = reIdLayers(doc.layers || []);
      const nid = newId('p');
      writeJSON('fm.proj.' + nid, { project: JSON.parse(JSON.stringify(doc.project)), layers: re.layers, selectedId: null, selectedIds: [] });
      // index the copy BEFORE the (slow, awaited) media copies — killing the tab mid-copy used to
      // strand an invisible doc that no home card showed and pruneOrphans then gutted
      const idx = this.list();
      idx.unshift(Object.assign({}, src, { id: nid, name: (src.name || 'Project') + ' copy', created: Date.now(), modified: Date.now(), layers: re.layers.length, thumb: null }));
      this.saveIndex(idx);
      // duplicate the media blobs under the new layer ids so the copy survives deleting the original
      try {
        const db = await openDB();
        for (const oldId of Object.keys(re.map)) {
          const rec = await idbGet(db, oldId);
          if (rec) await idbPut(db, re.map[oldId], rec);
        }
        const th = await idbGet(db, 'thumb:' + id); if (th) { await idbPut(db, 'thumb:' + nid, th); _thumbCache.set(nid, th); }   // copy the card thumbnail too
        db.close();
      } catch (e) {}
      FM._mediaBusy = Math.max(0, (FM._mediaBusy || 1) - 1);
    },
    rename(id, name) {
      const idx = this.list(); const e = idx.find(p => p.id === id); if (!e) return;
      e.name = name; e.modified = Date.now(); this.saveIndex(idx);   // renaming is a real change → bumps list order
      const doc = readJSON('fm.proj.' + id, null);
      if (doc && doc.project) { doc.project.name = name; writeJSON('fm.proj.' + id, doc); }
      if (id === curId()) { FM.scene.project.name = name; if (FM.refreshAll) FM.refreshAll(); }
    },
    async remove(id) {
      const doc = readJSON('fm.proj.' + id, null);
      try {
        const db = await openDB();
        // Deleting a project deletes ITS media — except any blob the Media library is holding on
        // to. This path never goes through pruneOrphans, so it needs the same keep-set: without it,
        // deleting the project you imported a file into would silently gut the library grid.
        const libKeys = new Set(FM.mediaLib && FM.mediaLib.keys ? FM.mediaLib.keys() : []);
        if (doc && Array.isArray(doc.layers)) for (const l of doc.layers) { if (!libKeys.has(l.id)) await idbDel(db, l.id); }
        await delThumb(db, id);
        db.close();
      } catch (e) {}
      try { localStorage.removeItem('fm.proj.' + id); } catch (e) {}
      this.saveIndex(this.list().filter(p => p.id !== id));
      if (id === curId()) {
        const rest = this.list();
        if (rest.length) await this.open(rest[0].id);
        else { try { localStorage.removeItem(CUR_KEY); } catch (e) {} await this.create({}); }
        // open()/create() flushSync'd BEFORE switching CUR_KEY, resurrecting the deleted doc as an
        // unindexed localStorage orphan that leaks quota forever — remove it (again) now. (#r2)
        try { localStorage.removeItem('fm.proj.' + id); localStorage.removeItem('fm.proj.default'); } catch (e) {}
      }
    },
    // Boot sweep: delete IDB media keys that belong to no project doc and no template/element pack.
    // Race-hardened: stands down entirely while a pack hydration/duplicate is writing media, and
    // re-verifies every candidate against a FRESH keep-set (plus the live media registry) right
    // before deleting — the classic mark-and-sweep window shrinks from the whole scan to ~0.
    async pruneOrphans() {
      try {
        if (FM._mediaBusy) return;   // media writes in flight — sweep again next boot
        /* An interrupted export's saved chunks live in this store too, and belong to no layer, no
         * project and no media-library entry — so the keep-set below reads them as orphans and deletes
         * them at the first boot after a crash, which is the exact boot on which they are the point.
         * They are exempted from the scan (see the prefix list) and reaped by their own rules instead. */
        if (FM.exportResume && FM.exportResume.sweep) { try { await FM.exportResume.sweep(); } catch (e) {} }
        const projIds = new Set();   // EVERY stored project doc — scanned from localStorage, not just the index (an unindexed doc's media must never be mass-deleted)
        const collectKeep = () => {
          const keep = new Set();
          for (let i = 0; i < localStorage.length; i++) {
            const lk = localStorage.key(i);
            if (lk && lk.indexOf('fm.proj.') === 0) {
              projIds.add(lk.slice(8));
              const d = readJSON(lk, null); if (d && d.layers) d.layers.forEach(l => keep.add(l.id));
            }
          }
          FM.scene.layers.forEach(l => keep.add(l.id));
          // The Media library points at blobs by the id of the layer that first imported them, so a
          // file stays available after the project that introduced it is deleted. Without this the
          // library would quietly rot to broken tiles at the next boot.
          if (FM.mediaLib && FM.mediaLib.keys) FM.mediaLib.keys().forEach(k => keep.add(k));
          return keep;
        };
        const keep = collectKeep();
        // the three index-backed prefixes, so an unreferenced pack can finally be collected
        const tplIds = new Set((FM.templates.list() || []).map(t => t.id));
        const elemIds = new Set((FM.elements.list() || []).map(e => e.id));
        const fontIds = new Set((FM.fonts && FM.fonts.list ? FM.fonts.list() : []).map(f => f.id));
        const db = await openDB();
        const candidates = [];
        for (const k of await idbKeys(db)) {
          /* These prefixes used to be skipped OUTRIGHT, which is why a pack whose index write failed
             could never be reclaimed. Cross-check them against their index instead: a 'tpl:'/'elem:'/
             'font:' pack that nothing references is exactly the orphan this sweep is for. The other
             two prefixes stay unconditional — libthumb2 is the media library's own cache and xr is the
             export-resume scratch, and neither has an index here to check against. */
          if (typeof k === 'string' && (k.indexOf('libthumb2:') === 0 || k.indexOf('xr:') === 0)) continue;
          if (typeof k === 'string' && k.indexOf('tpl:') === 0) { if (tplIds.has(k.slice(4))) continue; candidates.push(k); continue; }
          if (typeof k === 'string' && k.indexOf('elem:') === 0) { if (elemIds.has(k.slice(5))) continue; candidates.push(k); continue; }
          if (typeof k === 'string' && k.indexOf('font:') === 0) { if (fontIds.has(k.slice(5))) continue; candidates.push(k); continue; }
          // project-card thumbnails are keyed 'thumb:<projectId>' — they were being treated as
          // orphans and wiped at EVERY boot; only a deleted project's thumb is really an orphan
          if (typeof k === 'string' && k.indexOf('thumb:') === 0) { if (projIds.has(k.slice(6))) continue; candidates.push(k); continue; }
          if (!keep.has(k)) candidates.push(k);
        }
        if (candidates.length) {
          if (FM._mediaBusy) { db.close(); return; }   // something started writing mid-scan
          const keep2 = collectKeep();                  // fresh snapshot at delete time
          for (const k of candidates) {
            if (keep2.has(k) || FM.media.get(k)) continue;   // referenced since the scan / live in memory
            await idbDel(db, k);
          }
        }
        db.close();
      } catch (e) {}
    },
  };

  FM.templates = {
    list() { return readJSON(TPL_INDEX, []); },
    // Save a whole project (by id, default current) as a reusable template.
    async save(name, projectId) {
      const id = projectId || curId();
      if (id === curId()) FM.storage.flushSync();
      const doc = readJSON('fm.proj.' + id, null); if (!doc) return false;
      const tid = newId('t');
      // pack media Files: from memory for the current project, from IDB for a closed one
      const pack = { project: JSON.parse(JSON.stringify(doc.project)), layers: JSON.parse(JSON.stringify(doc.layers || [])), media: {} };
      /* A TEMPLATE MUST NOT CARRY THE NOTES (queue 214). Ezra: "Currently the notes carry across
       * projects, I want each projects notes only for that project."
       * Reproduced by measurement, and this is the path it comes down: notes live on
       * scene.project.notes exactly as designed, and creating, opening and duplicating a project all
       * behave — but a template packs the whole project object, so `useAsNew` handed every new
       * project the notes of whoever made the template. That is not a stale cache or a global; it is
       * a copy, and it is the only route that produced his symptom.
       * The line drawn here, deliberately: a DUPLICATE keeps its notes (it is a copy of that project,
       * and losing your notes when you duplicate would be its own bug), while a TEMPLATE does not (it
       * is a reusable starting point, and "remember to fix the audio at 0:12" belongs to one project
       * and means nothing in the next). Stripped at SAVE, so templates already on disk are cleaned as
       * they are re-saved and nothing has to be migrated. */
      delete pack.project.notes;
      delete pack.project.fromTemplate;   // …and never inherit the "came from" pointer (queue 408): a
                                          // template made from a project is its own thing, not that
                                          // project's parent, and carrying it would make an update loop.
      try {
        const db = await openDB();
        for (const l of pack.layers) {
          const mem = (id === curId()) ? FM.media.get(l.id) : null;
          if (mem && mem.file) pack.media[l.id] = { file: mem.file, kind: mem.kind };
          else { const rec = await idbGet(db, l.id); if (rec && rec.file) pack.media[l.id] = { file: rec.file, kind: rec.kind }; }
        }
        await idbPut(db, 'tpl:' + tid, pack);
        db.close();
      } catch (e) { return false; }
      const idx = this.list();
      const card = (await FM.projects.getThumb(id)) || (id === curId() ? makeThumb() : null);   // template cards keep an inline thumb (few templates); read the project's from IDB
      idx.unshift({ id: tid, name: name, width: pack.project.width, height: pack.project.height, duration: pack.project.duration, thumb: card });
      /* THE INDEX WRITE CAN FAIL, AND SAYING "saved" ANYWAY IS THE WORST OUTCOME (BUG-HUNT).
         writeJSON swallows a quota failure — it returns false and calls warnQuota, which only toasts
         the FIRST time in a session, so once autosave has hit quota nothing is said at all. The return
         value was discarded and this returned an unconditional true, so home.js toasted "saved" for a
         template that never appeared and could never be recovered. Meanwhile the pack — full copies of
         the project's video and image files — sat in IndexedDB with nothing pointing at it, and the
         boot sweep was coded to skip that prefix outright, so the space was never coming back.
         Tell the truth, and take the pack with it. */
      if (!writeJSON(TPL_INDEX, idx)) { try { const db2 = await openDB(); await idbDel(db2, 'tpl:' + tid); db2.close(); } catch (e) {} return false; }
      return true;
    },
    cardFor(projectId) { const e = FM.projects.list().find(p => p.id === projectId); return (e && e.thumb) || (projectId === curId() ? makeThumb() : null); },
    async getPack(tid) { try { const db = await openDB(); const p = await idbGet(db, 'tpl:' + tid); db.close(); return p; } catch (e) { return null; } },
    /* SAVE A TEMPLATE AS A SHAREABLE FILE (queue 343 clause 4). Ezra chose this over links, verbatim:
       *"maybe not links then and instead just project files that people can download like what's
       already in"* — which keeps the app local-only: no server, no hosting, no bill, nothing of his on
       somebody else's machine.
       It writes the SAME `.fmotion.json` a project writes, so `importFile` already reads it and nothing
       new had to be invented or versioned. The difference is where the bytes come from: a project
       serializes the LIVE scene through `FM.media`, and a template has no live scene — its layers and
       its media files sit in the pack in IndexedDB. So this walks the pack instead.
       THE TEMPLATE'S OWN NAME WINS over the packed project's. A template packs the whole project object,
       so `pack.project.name` is whatever the project was called when the template was made — import it
       and you would get a project named "Untitled 3" rather than the template you chose. */
    async exportFile(tid) {
      const pack = await this.getPack(tid);
      if (!pack || !pack.layers) return false;
      const meta = this.list().find(t => t.id === tid) || {};
      const media = {};
      for (const lid in pack.media) {
        const rec = pack.media[lid];
        if (rec && rec.file && rec.file.size <= EMBED_LIMIT) {
          const durl = await fileToDataURL(rec.file);
          if (durl) media[lid] = { kind: rec.kind, name: rec.file.name, dataURL: durl };
        }
      }
      const project = Object.assign({}, pack.project, { name: meta.name || pack.project.name || 'Template' });
      const obj = { app: 'freemotion', v: 1, project: project, layers: pack.layers, media: media, fonts: await embedFonts(pack.layers) };
      const safe = String(project.name).replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim() || 'template';
      const blob = new Blob([JSON.stringify(obj, FM.jsonReplacer)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = safe + '.fmotion.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    },
    async remove(tid) {
      writeJSON(TPL_INDEX, this.list().filter(t => t.id !== tid));
      try { const db = await openDB(); await idbDel(db, 'tpl:' + tid); db.close(); } catch (e) {}
    },
    /* DUPLICATE A TEMPLATE (queue 374). Ezra: "There's no way to duplicate templates or elements".
       ⚠️ THE ENTRY'S WARNING DOES NOT APPLY HERE, and it is worth saying why rather than re-keying
       things for the look of it. It warned that a duplicate "MUST re-key pack.media or the copy and the
       original will share media and deleting one will gut the other" — which is exactly right for a
       PROJECT, whose media lives in IndexedDB under the layer's own id, so two projects naming the same
       id really do share one record. A pack does not work that way: it carries its media INSIDE the
       record (`pack.media[layerId] = {file, kind}`), IndexedDB structured-clones on put, `remove()`
       deletes only `tpl:<id>`, and the boot sweep keeps or collects a pack by its INDEX id alone —
       nothing in it ever consults the layer ids inside. So the copy owns its own clone of every File
       and is independent by construction, and the ids are re-keyed at USE time anyway (`reIdLayers`,
       in useAsNew and insertInto both). Re-keying at duplicate time would be motion without meaning.
       The order — pack first, index second, roll the pack back if the index write fails — is `save()`'s,
       for `save()`'s reason: writeJSON swallows a quota failure, and an index entry pointing at nothing
       is worse than no entry at all. _mediaBusy holds the boot sweep off in between, because in that
       window the new pack is referenced by no index and is exactly what the sweep collects. */
    async duplicate(tid) {
      const pack = await this.getPack(tid); if (!pack) return false;
      const meta = this.list().find(t => t.id === tid); if (!meta) return false;
      const nid = newId('t');
      FM._mediaBusy = (FM._mediaBusy || 0) + 1;
      let ok = false;
      try {
        const db = await openDB(); await idbPut(db, 'tpl:' + nid, pack); db.close();
        const idx = this.list();
        idx.unshift(Object.assign({}, meta, { id: nid, name: (meta.name || 'Template') + ' copy' }));
        ok = writeJSON(TPL_INDEX, idx);
        if (!ok) { try { const db2 = await openDB(); await idbDel(db2, 'tpl:' + nid); db2.close(); } catch (e) {} }
      } catch (e) { ok = false; }
      FM._mediaBusy = Math.max(0, (FM._mediaBusy || 1) - 1);
      return ok;
    },
    // Start a brand-new project from a template.
    async useAsNew(tid) {
      const pack = await this.getPack(tid); if (!pack) return false;
      const meta = this.list().find(t => t.id === tid) || {};
      const pid = await FM.projects.create({ name: (meta.name || 'Template') + ' project', width: pack.project.width, height: pack.project.height });
      /* …and again on the way OUT, for templates saved before v8.22. Stripping only at save would
         leave every existing template still handing its notes to new projects. */
      /* REMEMBER WHICH TEMPLATE THIS CAME FROM (queue 408). Ezra: "templates need to be editable as well,
         currently they ain't." Opening one already forks a real, fully editable project — what was missing
         is the way BACK, and there was nothing recording where the project came from to go back to.
         Kept on the project object, so it saves and reloads with the doc, AND mirrored onto the index entry
         so the Home card can offer the update without reading every project's document to find out. */
      FM.scene.project = Object.assign(JSON.parse(JSON.stringify(pack.project)), { name: FM.scene.project.name, notes: [], fromTemplate: tid });
      /* CLAMP AGAIN, BECAUSE THIS LINE JUST THREW THE FIRST CLAMP AWAY (queue 470).
         `projects.create()` above clamps the width/height it is handed — and then the assign replaces the
         whole project object with the pack's RAW one, so a template carrying 16000x16000 at 999fps landed
         in the live scene unclamped and `autosave()` below wrote it to disk. Measured, end to end, through
         this exact call. What that costs is in clampProjectDims' own note: ~1GB per canvas, an OOM crash
         on open, and — being the current project — a crash again on every relaunch. A brick. */
      clampProjectDims(FM.scene.project);
      const re = reIdLayers(pack.layers);
      FM.scene.layers = re.layers;
      await hydratePack(re.layers, pack.media, re.map);
      try { const idx = FM.projects.list(); const e = idx.find(x => x.id === pid); if (e) { e.fromTemplate = tid; FM.projects.saveIndex(idx); } } catch (e) {}
      if (FM.resizeCanvas) FM.resizeCanvas();
      if (FM.refreshAll) FM.refreshAll();
      if (FM.history) FM.history.reset();
      FM.storage.autosave();
      return pid;
    },
    /* WRITE A PROJECT BACK OVER THE TEMPLATE IT CAME FROM (queue 408 clause 2). Same shape as the preset
       round trip in queue 407, and the same judgement: ONE TAP rather than automatic. A template is a
       starting point other projects were built from; silently rewriting it whenever one of its children
       changed would be a change nobody asked for and nobody could see. It keeps the template's NAME and
       its place in the list — only the contents are replaced. */
    async updateFrom(tid, projectId) {
      const meta = this.list().find(t => t.id === tid);
      if (!meta) return false;
      const ok = await this.save(meta.name, projectId || curId());
      if (!ok) return false;
      /* save() unshifts a NEW entry, so the old one has to go or the list grows a duplicate every time
         you press update. The fresh entry inherits the name; this drops the previous id and keeps the
         new one where the old one sat, so the card does not jump to the top of the list under your finger. */
      const idx = this.list();
      const fresh = idx[0];
      const rest = idx.filter(t => t.id !== tid && t !== fresh);
      const at = Math.max(0, idx.findIndex(t => t.id === tid));
      rest.splice(Math.min(at, rest.length), 0, fresh);
      writeJSON(TPL_INDEX, rest);
      try { const db = await openDB(); await idbDel(db, 'tpl:' + tid); db.close(); } catch (e) {}
      // …and every project that pointed at the old id now points at the new one
      try {
        const pidx = FM.projects.list(); let moved = false;
        pidx.forEach(p => { if (p.fromTemplate === tid) { p.fromTemplate = fresh.id; moved = true; } });
        if (moved) FM.projects.saveIndex(pidx);
      } catch (e) {}
      if (FM.scene && FM.scene.project && FM.scene.project.fromTemplate === tid) FM.scene.project.fromTemplate = fresh.id;
      return true;
    },
    // Insert a template's layers INTO the current project at the playhead.
    async insertInto(tid) {
      const pack = await this.getPack(tid); if (!pack) return false;
      const re = reIdLayers(pack.layers);
      const t0 = Math.min.apply(null, re.layers.length ? re.layers.map(l => l.start || 0) : [0]);
      re.layers.forEach(l => { const d = FM.time - t0; l.start = (l.start || 0) + d; if (FM.shiftLayerKeyframes) FM.shiftLayerKeyframes(l, d); });   // keyframes are absolute time — inserted animation rides to the playhead
      // An element pack can carry a camera; inserting it twice (or into a scene that already has
      // one) gave the project multiple cameras, and the composite silently uses the first it finds.
      if (FM.scene.layers.some(l => l.type === 'camera')) re.layers = re.layers.filter(l => l.type !== 'camera');
      FM.scene.layers = re.layers.concat(FM.scene.layers);
      await hydratePack(re.layers, pack.media, re.map);
      if (FM.refreshAll) FM.refreshAll();
      if (FM.history) FM.history.commit();
      FM.storage.autosave();
      return true;
    },
  };

  FM.elements = {
    list() { return readJSON(ELEM_INDEX, []); },
    // Save the given layers (the current selection) as a reusable element.
    async save(name, layers) {
      if (!layers || !layers.length) return false;
      const eid = newId('e');
      const pack = packLayers(layers);
      try { const db = await openDB(); await idbPut(db, 'elem:' + eid, pack); db.close(); } catch (e) { return false; }
      const idx = this.list();
      idx.unshift({ id: eid, name: name, count: layers.length, thumb: makeLayerThumb(layers) });
      if (!writeJSON(ELEM_INDEX, idx)) { try { const db2 = await openDB(); await idbDel(db2, 'elem:' + eid); db2.close(); } catch (e) {} return false; }   // see templates.save
      return true;
    },
    async getPack(eid) { try { const db = await openDB(); const p = await idbGet(db, 'elem:' + eid); db.close(); return p; } catch (e) { return null; } },
    // Save a whole PROJECT's layers as one element — the Home screen's route, where there is no
    // selection to work from. A watermark or logo you built once as its own little project becomes a
    // thing you can drop into any edit. Media comes from IDB for a closed project (packLayers only
    // knows the in-memory map, which is empty for anything but the project that is currently open).
    async saveFromProject(projectId, name) {
      const id = projectId || curId();
      if (id === curId()) FM.storage.flushSync();
      const doc = readJSON('fm.proj.' + id, null); if (!doc) return false;
      const layers = doc.layers || []; if (!layers.length) return false;
      const eid = newId('e');
      const pack = { layers: JSON.parse(JSON.stringify(layers)), media: {} };
      try {
        const db = await openDB();
        for (const l of pack.layers) {
          const mem = (id === curId()) ? FM.media.get(l.id) : null;
          if (mem && mem.file) pack.media[l.id] = { file: mem.file, kind: mem.kind };
          else { const rec = await idbGet(db, l.id); if (rec && rec.file) pack.media[l.id] = { file: rec.file, kind: rec.kind }; }
        }
        await idbPut(db, 'elem:' + eid, pack);
        db.close();
      } catch (e) { return false; }
      const idx = this.list();
      idx.unshift({ id: eid, name: name, count: pack.layers.length, thumb: (await FM.projects.getThumb(id)) || (id === curId() ? makeThumb() : null) });
      if (!writeJSON(ELEM_INDEX, idx)) { try { const db2 = await openDB(); await idbDel(db2, 'elem:' + eid); db2.close(); } catch (e) {} return false; }   // see templates.save
      return true;
    },
    async remove(eid) {
      writeJSON(ELEM_INDEX, this.list().filter(t => t.id !== eid));
      try { const db = await openDB(); await idbDel(db, 'elem:' + eid); db.close(); } catch (e) {}
    },
    // Duplicate an element (queue 374) — same construction as templates.duplicate, and the note above
    // it explains why the pack is copied whole rather than re-keyed.
    async duplicate(eid) {
      const pack = await this.getPack(eid); if (!pack) return false;
      const meta = this.list().find(e => e.id === eid); if (!meta) return false;
      const nid = newId('e');
      FM._mediaBusy = (FM._mediaBusy || 0) + 1;
      let ok = false;
      try {
        const db = await openDB(); await idbPut(db, 'elem:' + nid, pack); db.close();
        const idx = this.list();
        idx.unshift(Object.assign({}, meta, { id: nid, name: (meta.name || 'Element') + ' copy' }));
        ok = writeJSON(ELEM_INDEX, idx);
        if (!ok) { try { const db2 = await openDB(); await idbDel(db2, 'elem:' + nid); db2.close(); } catch (e) {} }
      } catch (e) { ok = false; }
      FM._mediaBusy = Math.max(0, (FM._mediaBusy || 1) - 1);
      return ok;
    },
    // Insert an element's layers into the current project at the playhead.
    async insert(eid) {
      let pack = null;
      try { const db = await openDB(); pack = await idbGet(db, 'elem:' + eid); db.close(); } catch (e) {}
      if (!pack) return false;
      const re = reIdLayers(pack.layers);
      const t0 = Math.min.apply(null, re.layers.length ? re.layers.map(l => l.start || 0) : [0]);
      re.layers.forEach(l => { const d = FM.time - t0; l.start = (l.start || 0) + d; if (FM.shiftLayerKeyframes) FM.shiftLayerKeyframes(l, d); });   // keyframes are absolute time — inserted animation rides to the playhead
      FM.scene.layers = re.layers.concat(FM.scene.layers);
      await hydratePack(re.layers, pack.media, re.map);
      FM.scene.selectedId = re.layers[0] ? re.layers[0].id : FM.scene.selectedId;
      FM.scene.selectedIds = re.layers.map(l => l.id);
      if (FM.refreshAll) FM.refreshAll();
      if (FM.history) FM.history.commit();
      FM.storage.autosave();
      return true;
    },
  };

  // ================= Custom fonts (global library) =================
  // Imported TTF/OTF/WOFF files live in a global index (fm.fonts) + blobs in IDB under 'font:<id>',
  // mirroring templates/elements. Each is registered once via the FontFace API so canvas text can use
  // it, and survives reload. Fonts are GLOBAL — imported once, they appear in every project's picker.
  // A text layer references a font by its generated `css` token ('FMF<id>, sans-serif'); the token is
  // machine-generated (alnum only), so splicing it straight into ctx.font carries no injection risk.
  const FONT_INDEX = 'fm.fonts', FONT_EMBED_LIMIT = 4 * 1024 * 1024;
  const _fontReg = new Set();   // ids already handed to document.fonts (keeps rehydrate idempotent)
  function fontFileOk(file) {
    if (!file) return false;
    const n = (file.name || '').toLowerCase();
    return /\.(ttf|otf|woff2?|ttc)$/.test(n) || /^font\//.test(file.type || '') || (file.type || '').indexOf('font') >= 0;
  }
  async function registerFace(family, file) {
    if (!file || !window.FontFace) return false;
    try { const ff = new FontFace(family, await file.arrayBuffer()); await ff.load(); document.fonts.add(ff); return true; }
    catch (e) { return false; }
  }

  FM.fonts = {
    list() { return readJSON(FONT_INDEX, []); },
    // Register every imported font not already live. Idempotent — safe on each boot / project switch;
    // only unregistered ids touch IDB. Re-renders once the faces are ready so canvas text reflows.
    async rehydrateAll() {
      const pending = this.list().filter(f => f && f.id && !_fontReg.has(f.id));
      if (!pending.length) return;
      let any = false;
      try {
        const db = await openDB();
        for (const f of pending) {
          const rec = await idbGet(db, 'font:' + f.id);
          // Only mark as registered on SUCCESS — otherwise a transiently-failed load (e.g. IDB not
          // ready yet) would be skipped forever. A permanently-broken blob just re-reads IDB each boot.
          if (rec && rec.file && await registerFace(f.family, rec.file)) { _fontReg.add(f.id); any = true; }
        }
        db.close();
      } catch (e) {}
      if (any && FM.requestRender) FM.requestRender();
    },
    async getFile(id) { try { const db = await openDB(); const r = await idbGet(db, 'font:' + id); db.close(); return r && r.file ? r.file : null; } catch (e) { return null; } },
    // Import a font File: validate → register → persist (IDB blob + index). Returns the record (with
    // .css to drop straight onto layer.fontFamily) or null on failure.
    async import(file) {
      if (!fontFileOk(file)) { if (FM.toast) FM.toast('Pick a .ttf, .otf or .woff font file'); return null; }
      const id = newId('f');
      const family = 'FMF' + id.replace(/[^a-z0-9]/gi, '');
      const css = family + ', sans-serif';
      if (!await registerFace(family, file)) { if (FM.toast) FM.toast("Couldn't read that font file"); return null; }
      _fontReg.add(id);
      try { const db = await openDB(); await idbPut(db, 'font:' + id, { file: file }); db.close(); } catch (e) {}
      const name = ((file.name || 'Custom font').replace(/\.[^.]+$/, '').replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim()) || 'Custom font';
      const idx = this.list(); idx.push({ id: id, name: name, family: family, css: css });
      if (!writeJSON(FONT_INDEX, idx)) {   // see templates.save — a font that cannot be indexed is not imported
        _fontReg.delete(id);
        try { const db2 = await openDB(); await idbDel(db2, 'font:' + id); db2.close(); } catch (e) {}
        if (FM.toast) FM.toast('Storage is full — that font could not be saved');
        return null;
      }
      if (FM.requestRender) FM.requestRender();
      if (FM.toast) FM.toast('Font “' + name + '” added');
      return { id: id, name: name, family: family, css: css };
    },
    async remove(id) {
      writeJSON(FONT_INDEX, this.list().filter(f => f.id !== id));
      try { const db = await openDB(); await idbDel(db, 'font:' + id); db.close(); } catch (e) {}
    },
    // Open a file picker and import the chosen font; calls back with the new record on success.
    pick(onDone) {
      const input = document.createElement('input'); input.type = 'file';
      input.accept = '.ttf,.otf,.woff,.woff2,.ttc,font/*'; input.style.display = 'none';
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0]; input.remove();
        if (!file) return;
        const rec = await this.import(file);
        if (rec && onDone) onDone(rec);
      });
      document.body.appendChild(input); input.click();
    },
    // Register fonts embedded in an imported .fmotion.json so its text renders on this device too.
    // Adds only fonts the library doesn't already have, keyed by their (stable) family token.
    async applyEmbedded(fontsObj) {
      if (!fontsObj) return;
      const idx = this.list();
      const haveFam = new Set(idx.map(f => f.family));
      for (const key of Object.keys(fontsObj)) {
        const fd = fontsObj[key];
        if (!fd || !fd.family || haveFam.has(fd.family)) continue;
        const file = await dataURLToFile(fd.dataURL, fd.name || 'font');   // rejects non-data: URLs
        if (!file || !await registerFace(fd.family, file)) continue;
        const nid = newId('f'); _fontReg.add(nid);
        try { const db = await openDB(); await idbPut(db, 'font:' + nid, { file: file }); db.close(); } catch (e) {}
        idx.push({ id: nid, name: fd.name || 'Imported font', family: fd.family, css: fd.css || (fd.family + ', sans-serif') });
        haveFam.add(fd.family);
      }
      writeJSON(FONT_INDEX, idx);
    },
  };

  /* ---- Canvas presets (queue 183) ----------------------------------------------------------
   * His words: "This settings menu shall have an option that says save project as preset", with a
   * screenshot of the CANVAS SETTINGS dialog — so a preset here is that dialog's own contents: the
   * aspect, the size, the frame rate and the background. Nothing else. Deliberately not the layers,
   * not the duration, not the effects: the dialog he pointed at sets up an empty canvas, and a
   * "preset" that quietly dragged a copy of the project along would be a different feature wearing
   * the same word.
   *
   * localStorage rather than IndexedDB — this is a handful of small records, and the new-project
   * dialog needs them SYNCHRONOUSLY as it opens; an await there would have the chips pop in after
   * the card is already on screen. Everything here is validated on the way OUT as well as in: the
   * store is user-editable text on disk, and a preset with a junk width should not be able to make a
   * project 0 pixels wide. */
  // Flush the pending (debounced) save when the tab is hidden/closed so the last edit isn't lost.
  window.addEventListener('pagehide', () => { if (FM.scene) FM.storage.flushSync(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && FM.scene) FM.storage.flushSync(); });
})(window.FM);
