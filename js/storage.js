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

  /* ═══ THE POINTER READER (queue 915 clause 5, PHASE A) ════════════════════════════════════════════
   * His answer, 22 Sep: "Yes, one copy (Recommended)" — a clip reused from Add → Media is to be stored
   * ONCE, as a pointer `{ ref: 'lib:<mid>', kind, rev }` at one shared copy under `lib:<mid>`, instead of
   * a whole new copy per tap. That was built (branch fm-store) and NOT shipped: its review
   * (audits/915-5-review.json) found that a build which cannot read `lib:` — every release before this
   * one — deletes the shared copy at its boot sweep and reads a pointer as "nothing stored", so one
   * tools/rollback.sh past the writer would blank every reused clip, and his original import, for good.
   * So it ships in two halves, and THIS is the first: it READS pointers everywhere a layer's record is
   * read, and it NEVER DELETES and NEVER WRITES a `lib:` key or a pointer. Once it has run on his phone,
   * a rollback from the writer release lands on a build that keeps and reads what the writer made.
   * Both refusals live at the bottom (idbPut / idbDel), not at each caller, because "every deleter" is
   * a list nobody can keep complete by hand — the phase-B writer has to lift them ON PURPOSE.
   * A record stored the old way, the file itself, reads exactly as it always did. */
  const LIB_PREFIX = 'lib:';
  function isLibKey(k) { return typeof k === 'string' && k.indexOf(LIB_PREFIX) === 0; }
  function isRef(v) { return !!v && typeof v === 'object' && !v.file && isLibKey(v.ref); }
  /* A layer's record, with a pointer read through to the file it points at. A pointer whose shared copy
     is gone answers null — exactly what a layer with no record has always answered — so every caller's
     existing "nothing stored" path handles it, and none of them can copy the dead pointer onward. */
  async function idbGetMedia(db, key) {
    const v = await idbGet(db, key);
    if (!isRef(v)) return v;
    const t = await idbGet(db, v.ref);
    if (!t || !t.file) return null;
    return { file: t.file, kind: v.kind || t.kind, rev: v.rev || 0 };
  }
  // Resolves TRUE only if the write actually landed. This used to resolve the same way on success and
  // on failure, and writeMedia returned a hardcoded true on top of it — so a video too big for the
  // origin quota was rejected by the browser, reported as saved, and silently missing after a reload.
  // On mobile, where the quota is far smaller and Safari rejects rather than prompting, that is most of
  // what "I cannot add long videos, it won't work" looks like from the outside.
  function idbPut(db, key, val) {
    if (isLibKey(key) || isRef(val)) return Promise.resolve(false);   // queue 915 phase A: this release never writes a shared copy or a pointer (see above)
    return new Promise((res) => { try { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(val, key); tx.oncomplete = () => res(true); tx.onerror = () => { warnStore(tx.error); res(false); }; tx.onabort = () => { warnStore(tx.error); res(false); }; } catch (e) { warnStore(e); res(false); } }); }

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
  function idbDel(db, key) {
    if (isLibKey(key)) return Promise.resolve();   // queue 915 phase A: no deleter in this release may take a shared copy — a later build's clips point at it
    return new Promise((res) => { try { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = () => res(); tx.onerror = () => res(); } catch (e) { res(); } }); }
  function idbKeys(db) { return new Promise((res) => { try { const rq = db.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys(); rq.onsuccess = () => res(rq.result || []); rq.onerror = () => res([]); } catch (e) { res([]); } }); }

  /* ═══ THE LAYER IDS A COLLAB CHECKPOINT CAN STILL BRING BACK (queue 921 S0, spec §12.4) ════════════
   * A checkpoint — `collab:ckpt:<pid>:<ts>` — is the project's document as it stood before a share
   * started, and it is what "Earlier versions…" restores from. So its layer ids are REACHABLE: every
   * sweep that decides "no project doc names this id, delete the blob" has to count them, or restoring a
   * save point would bring the layers back with every clip blank. Nothing writes one before stage 2;
   * this reads them from the moment the app can, so a checkpoint written by a later build is never
   * gutted by the boot sweep of this one.
   * The value is the document as a JSON string. The regex fallback is deliberate: a half-written or
   * truncated checkpoint cannot be parsed, and the safe reading of "I cannot tell what this names" is to
   * keep everything it appears to name. */
  function ckptLayerIds(v) {
    const out = [];
    const take = (d) => { if (d && Array.isArray(d.layers)) { d.layers.forEach(l => { if (l && typeof l.id === 'string') out.push(l.id); }); return true; } return false; };
    if (v && typeof v === 'object' && take(v)) return out;
    if (typeof v !== 'string') return out;
    try { if (take(JSON.parse(v))) return out; } catch (e) {}
    const re = /"id"\s*:\s*"([^"]{1,64})"/g;
    let m;
    while ((m = re.exec(v))) out.push(m[1]);
    return out;
  }
  FM.storage_ckptLayerIds = ckptLayerIds;   // suite seam (queue 921 S0): the real reader, not a copy

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
  let _hydrating = null, _hydratingFor = null;
  /* ⚠️ queue 834 (u8): SHARE A RUN ONLY WITH THE SCENE IT IS FOR. Callers deliberately share an in-flight
     hydration rather than racing it — but the guard did not record WHICH scene the run belonged to, so
     opening a DIFFERENT project while one was still loading returned that other run's promise and the new
     project's clips were never fetched: it opened with every clip blank until he left and came back.
     The layer ARRAY identity is exactly what the loop is bound to (it reads FM.scene.layers after its
     first await), so that is what the run is tagged with. A run for a different scene is queued behind
     this one instead of being mistaken for it. */
  function hydrateSceneMedia(opts) {
    const forLayers = FM.scene.layers;
    if (_hydrating && _hydratingFor === forLayers) return _hydrating;
    const start = _hydrating ? _hydrating.catch(function () {}) : Promise.resolve();
    _hydratingFor = forLayers;
    _hydrating = start.then(function () { return _hydrateSceneMedia(opts); })
      .then(function (n) { if (_hydratingFor === forLayers) { _hydrating = null; _hydratingFor = null; } return n; },
            function (e) { if (_hydratingFor === forLayers) { _hydrating = null; _hydratingFor = null; } throw e; });
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
          const rec = await idbGetMedia(db, layer.id);   // queue 915 phase A: a reused clip's pointer reads as its file
          if (rec && rec.file) {
            const loaded = rec.kind === 'video' ? await FM.loadVideoFile(rec.file) : await FM.loadImageFile(rec.file);
            FM.media.set(layer.id, loaded);
            if (loaded.kind === 'video') loaded.el.addEventListener('seeked', () => { if (!FM.playing && FM.requestRender) FM.requestRender(); });
            if (FM.wireVideoRepaint) FM.wireVideoRepaint(loaded);   // a reopened project decodes from cold — repaint when the frame lands
            n++;
          }
        } catch (le) { /* this layer's media failed to decode — keep restoring the rest */ }
        /* queue 915: tried — so the editor now shows whatever this layer really has, and a card
           captured from here on is a true picture of it, even if the blob would not decode. */
        _released.delete(layer.id);
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

  /* ⚠️ queue 915 clause 1: WHAT WAS RELEASED, SO NOTHING PHOTOGRAPHS THE GAP. The capture before the
     release took a good picture — and then every route out of Home (tapping another card, + → Create,
     a template, a restore) went through projects.open()/create(), whose touchCurrent(true) re-rendered
     the OUTGOING scene with its media gone and wrote a solid black card over the good one. It stayed
     black until he opened that project again. Ids, not a flag on the layer array: the array is replaced
     by more paths than the ids are, and an id released here stops counting the moment its record is
     back. makeThumb reads this, so every caller of it is covered at once rather than each route. */
  const _released = new Set();
  function sceneMediaReleased() {
    if (!_released.size) return false;
    const layers = (FM.scene && FM.scene.layers) || [];
    for (let i = 0; i < layers.length; i++) {
      const l = layers[i];
      if (l && _released.has(l.id) && !FM.media.get(l.id)) return true;
    }
    return false;
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
    ids.forEach(id => { FM.media.remove(id); _released.add(id); });   // queue 915: remembered, see sceneMediaReleased
    return ids.length;
  }

  /* queue 830: which blobs this save is FOR, decided before any await. Exported so the suite can ask the
     same question the save asks, at the same moment, without racing a real IndexedDB write. */
  function planBlobWrites() {
    const jobs = [];
    (FM.scene.layers || []).forEach(layer => {
      if (!layer || layer.type === 'text') return;
      const m = FM.media.get(layer.id);
      if (m && m.file) jobs.push({ id: layer.id, file: m.file, kind: m.kind, rev: layer.mediaRev || 0 });
    });
    return jobs;
  }
  FM.storage = {
    _writeJobs: planBlobWrites,   // queue 830 suite seam
    _hydrateSceneMedia: hydrateSceneMedia,   // queue 834 (u8) suite seam: the shared-run guard itself
    /* ⚠️ queue 829: THE FILE HE IS REPLACING MUST SURVIVE THE REPLACE. A layer's blob is keyed by the
       LAYER id, so the next save writes the new file over the same key — the comment on replaceMedia says
       "the outgoing blob is NOT deleted any more", and it is right that nothing deletes it, but the save
       overwrites it a moment later. Together with the registry release and the library entry going, that
       was every copy: pick the wrong file and the original is gone, with undo unable to bring it back
       because history only ever swaps layer JSON. One slot per layer, so a chain of replaces cannot grow
       without bound, and it is written before the new file is, not after. */
    async stashPrevMedia(id, rec, rev) {
      if (!id || !rec || !rec.file) return false;
      try {
        const db = await openDB();
        await idbPut(db, 'prev:' + id, { file: rec.file, kind: rec.kind, rev: rev || 0 });
        db.close();
        return true;
      } catch (e) { return false; }
    },
    async takePrevMedia(id) {
      if (!id) return null;
      try {
        const db = await openDB();
        const got = await idbGet(db, 'prev:' + id);
        db.close();
        return got || null;
      } catch (e) { return null; }
    },
    async save() {
      let sceneOk = writeScene();   // rev-guarded; a quota failure shouldn't block the IDB media save below
      const warnedBefore = _quotaWarned;
      /* queue 748 (hunt MEDIUM #31): `warnedBefore` can only see a flag raised THIS tick, and the index write's result was
         thrown away — so with the index failing every tick, the flag was raised on tick 1, reset on tick 2 (raised before, not
         re-raised), and re-toasted on tick 3: "Storage full" every other tick, for ever. The index write reports now. */
      const indexOk = FM.projects ? (FM.projects.touchCurrent() !== false) : true;
      // reset the once-flag only when EVERYTHING wrote — resetting after the scene write alone made
      // a failing index write re-toast "Storage full" every 600ms forever
      if (sceneOk && indexOk && !(_quotaWarned && !warnedBefore)) _quotaWarned = false;
      try {
        /* ⚠️ queue 830: TAKE THE RECORDS BEFORE THE FIRST AWAIT. This loop re-read FM.media for each layer
           AFTER the previous layer's awaits, so anything that cleared the store mid-save silently blanked
           the rest — and one thing does exactly that: opening another project calls FM.releaseProjectMedia
           synchronously, which removes every record of the outgoing scene. Import three clips on a phone
           and go Home while the first big file is still being written, and the remaining clips were never
           written at all. The scene doc was already flushed and lists them, so that project reopens with
           permanently blank clips — and no toast, because idbPut was never reached, so nothing failed.
           A snapshot taken before any await belongs to the scene this save is FOR. */
        const jobs = planBlobWrites();
        const db = await openDB();
        for (const job of jobs) {
          {
            /* ═══ A REPLACED FILE MUST OVERWRITE THE OLD BLOB (queue 668) ═══════════════════════
             * This line used to read `if (!existing) await idbPut(...)`, and it is the ONLY writer of
             * a layer's media blob. `FM.replaceMedia` swaps the file under the SAME layer id, so after
             * a replace a record already existed here and the write was skipped — **forever**. The
             * registry held the new file all session and `_hydrateSceneMedia` loaded the original back
             * on the next launch.
             * 📐 REPRODUCED before changing anything: import RED, replace with BLUE, save — the store
             * still held RED while the registry held BLUE and `layer.mediaRev` said 1. **The layer's
             * own JSON claimed the replace and the blob disagreed**, with no error and no toast. The
             * same path is what "fill this template with my own photos" uses, so that reverted too.
             * ⚠️ THE GUARD ITSELF WAS NOT WRONG, WHICH IS WHY THIS IS NOT JUST DELETED. `save()` is a
             * debounced autosave and these are whole video files; writing every blob on every save
             * would be brutal on a phone. So the test is not "always write" but "write when the file
             * actually changed", and `mediaRev` — which already exists, is already bumped by the only
             * code that replaces media, and is already inside the history snapshot — is what says so.
             * A record written before this change has no `rev`, and an untouched layer has no
             * `mediaRev`, so both read 0 and nothing is rewritten: existing projects do not get a mass
             * re-write on first launch. `kind` rides along, which also fixes a video→image replace
             * saving the layer as one type against a stored record marked the other. */
            const existing = await idbGet(db, job.id);
            if (!existing || (existing.rev || 0) !== job.rev) await idbPut(db, job.id, { file: job.file, kind: job.kind, rev: job.rev });
          }
        }
        // NOTE: no blanket prune here any more — media blobs are shared across ALL projects (plus
        // template/element packs), so "not in the current scene" ≠ orphaned. deleteLayer/removeMedia
        // handle explicit deletions; FM.projects.pruneOrphans() sweeps true orphans once at boot.
        db.close();
      } catch (e) { /* storage unavailable — ignore */ }
    },

    /* Synchronous best-effort scene write for page unload (the 600ms debounce can't run there).
       queue 921 S0: collab gets the same last chance — beforeFlush runs a final diff and persists its
       base, so a phone killed at pagehide comes back knowing what it had already sent. Inert until a
       session is running. */
    flushSync() { if (FM.collab && FM.collab.active) FM.collab.beforeFlush(); clearTimeout(saveTimer); return writeScene(); },

    async removeMedia(id) { try { const db = await openDB(); await idbDel(db, id); db.close(); } catch (e) {} },

    // Generic single-key access to the media store, for features that need to read or write a blob
    // outside the scene document (the Media library reads imported files and caches its thumbnails).
    async readMedia(key) { try { const db = await openDB(); const v = await idbGetMedia(db, key); db.close(); return v; } catch (e) { return null; } },   // queue 915 phase A: a pointer reads as its file
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
      FM.scene.layers.forEach(l => { if (l) { sanitizeMasks(l); /* masks FIRST — a marker is validated against their ids (queue 560) */ sanitizeEffects(l); sanitizeUnsafeValues(l); } });
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

  /* ⚠️ WHAT THIS LEAVES OUT IS NOW RECORDED, AND IT USED TO VANISH (queue 888). Anything over
   * EMBED_LIMIT is skipped — which is a fair trade for a file you SHARE and was silently catastrophic
   * while this was also the app's only backup. A 40-second phone clip is 60-120MB, so the written file
   * came out at about 4KB with "media":{}, the toast said "Project file saved", and re-importing gave
   * a project whose video layer was present, correctly timed, correctly keyframed and completely
   * blank — with no message at any point. Someone who then cleared their storage on the strength of
   * having "a backup" had destroyed the only copy of the footage.
   * The skips are collected here rather than at the caller because this is the one place that knows
   * WHICH file was dropped and how big it was, and `omitted` travels INSIDE the written file so the
   * file can answer "is my video in here" a year later without the app's help. */
  FM.storage.serializeScene = async function (scene) {
    const media = {}, omitted = [];
    for (const layer of scene.layers) {
      if (layer.type === 'text' || layer.type === 'shape' || layer.type === 'null') continue;
      const m = FM.media.get(layer.id);
      if (!m || !m.file) continue;                     // nothing loaded for this layer — not an omission
      if (m.file.size > EMBED_LIMIT) {
        omitted.push({ layer: layer.name || layer.type || 'a layer', file: m.file.name || 'a clip', mb: Math.round(m.file.size / 1048576) });
        continue;
      }
      const dataURL = await fileToDataURL(m.file);
      if (dataURL) media[layer.id] = { kind: m.kind, name: m.file.name, dataURL: dataURL };
      else omitted.push({ layer: layer.name || layer.type || 'a layer', file: m.file.name || 'a clip', mb: Math.round(m.file.size / 1048576) });
    }
    const fonts = await embedFonts(scene.layers);
    return { app: 'freemotion', v: 1, project: scene.project, layers: scene.layers, selectedId: scene.selectedId, selectedIds: scene.selectedIds, media: media, fonts: fonts, omitted: omitted };
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
      /* ⚠️ queue 827: A NEGATIVE KEYFRAME TIME IS LEGAL. A clip can be dragged PAST 0 into a negative start
         — deliberate, supported, and the timeline floors it at -(duration - 0.1) — and shiftLayerKeyframes
         retimes its keyframes with it, so they go negative too. This sanitiser runs on EVERY project open
         and every undo, and it was deleting them: the animation reverted to whatever the first surviving
         keyframe held, and the next autosave wrote that loss to disk. Bounded on BOTH sides now, which is
         what the upper clamp was already doing for the other end. */
      if (!isFinite(t) || !isFinite(v)) return;
      const o = { t: Math.max(-3600, Math.min(3600, t)), v: Math.max(min, Math.min(max, v)), e: easeOk(k.e) ? k.e : 'linear' };
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
  /* ═══ A STABLE `uid` SURVIVES THE REBUILD (queue 921 S0, spec D16) ════════════════════════════════
   * Every sanitiser below REBUILDS its entries from the registry schema, keeping only known keys — which
   * is what makes an untrusted file safe, and which also deletes any identity an entry carries. Live
   * collaboration needs one: without it, two people editing the same layer's effects can only address an
   * entry by its INDEX, and an index means a duplicate or a re-order silently re-points somebody's edit
   * at a different effect (both judges named it as the divergence source).
   * ⚠️ IT IS NOT MINTED HERE. Nothing in the app writes a uid outside a session (stampIds does, at S1),
   * so a solo project never gains one and this is byte-for-byte what it always was — the S0 parity test
   * pins exactly that. This only KEEPS one that is already there, and only if it is the shape stampIds
   * writes, so a crafted file cannot smuggle an object or a 4KB string in under this name.
   * Appended LAST, after params, so the key order of a uid-less entry is unchanged too. */
  const UID_RE = /^[a-z0-9]{4,16}$/;
  function keepUid(src, out) {
    if (src && typeof src.uid === 'string' && UID_RE.test(src.uid)) out.uid = src.uid;
    return out;
  }
  FM.storage._keepUid = keepUid;   // suite seam: the rule itself, not a copy of it

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
      return keepUid(f, { type: def.type, enabled: f.enabled !== false, params: params });
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
      return keepUid(b, { type: def.type, prop: b.prop, enabled: b.enabled !== false, params: params });
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
        if (!isFinite(t)) return;          // queue 827: negative is legal — a clip dragged before zero takes its roto with it
        const pts = safeMaskPts(k.v);
        if (!pts || !pts.length) return;   // a keyframe with no valid vertices contributes nothing → drop it
        kf.push({ t: Math.max(-3600, Math.min(3600, t)), v: pts, e: easeOk(k.e) ? k.e : 'linear' });
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
    /* ⚠️ A KEYFRAMED COLOUR IS AN OBJECT, AND THIS RAN BEFORE ANYTHING CHECKED FOR THAT (queue 682).
     * `safeColor` is a string test, so an animated colour — `{kf:[{t,v}, …]}` — failed it and the whole
     * parameter was DROPPED. This runs on every project load and on every undo, so animating a Glow
     * red→blue and reopening the project silently replaced it with the effect's default.
     * The keyframe branch has to come first for colours the same way it already does for numbers. Each
     * keyframe's value is validated with the same `safeColor` the plain path uses, so a corrupt colour
     * inside a keyframe is still repaired — the protection is kept, it just stopped being applied to
     * the wrong shape of value. */
    if (ty === 'color') {
      if (FM.isAnimated && FM.isAnimated(v)) {
        const kf = (v.kf || []).filter(k => k && typeof k.t === 'number' && isFinite(k.t) && safeColor(k.v));
        return kf.length ? { keep: true, value: Object.assign({}, v, { kf: kf }) } : { keep: false };
      }
      return safeColor(v) ? { keep: true, value: v } : { keep: false };
    }
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
    const seenMarkers = new Set();   // one marker per mask (queue 560)
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
        /* ⚠️ 12, and it was 4 — a stale clamp on a number that had moved twice under it. The comment
           said "ceiling matches the renderer (queue 379)" and stopped being true at queue 540, which
           raised the renderer to 12. Nothing caught it because a migration that quietly lowers a value
           still produces a working project. Found 1 Sep alongside queue 695. */
        const sh = typeof mb.shutter === 'number' && isFinite(mb.shutter) ? Math.max(0, Math.min(12, mb.shutter)) : 0.5;
        const sa = typeof mb.samples === 'number' && isFinite(mb.samples) ? Math.max(2, Math.min(48, Math.round(mb.samples))) : 8;   // queue 759: the registry allows 48
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
      /* A MASK MARKER (queue 560) is `{ type: 'penmask', maskId }` and nothing else: no params, no enabled — the
         mask's own eye owns that. Kept only when its mask exists on this layer and no earlier marker already
         claims it; never inside a Filter container, whose two plates would each apply it. Everything else
         about it is rebuilt from scratch, so a UI flag or a stray field can never reach a saved project. */
      if (f.type === 'penmask') {
        if (depth > 0) return null;
        const id = (typeof f.maskId === 'string' && f.maskId && f.maskId.length <= 64) ? f.maskId : '';
        if (!id || !Array.isArray(l.masks) || !l.masks.some(m => m && m.id === id) || seenMarkers.has(id)) return null;
        seenMarkers.add(id);
        /* …and its uid, like every other entry in this array (queue 921 S0). A marker is an element of
           `effects`, which collab keys BY uid — strip it here and the host's sanitize-on-clone would emit
           a fix removing the uid that stampIds then re-adds, on every single diff. */
        return keepUid(f, { type: 'penmask', maskId: id });
      }

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
      const out = keepUid(f, { type: f.type, enabled: f.enabled !== false, params: params });
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
    /* ⚠️ THE FLOOR IS -3600, NOT 0, AND THAT IS A DATA-LOSS FIX (queue 680).
     * A NEGATIVE START IS A DELIBERATE, SUPPORTED STATE. js/timeline.js floors a clip drag at
     * `-(duration - 0.1)` under the comment "AM: a clip can be dragged PAST 0 into negative start — it
     * keeps going", the move-to-playhead path repeats that floor, and the suite itself builds a
     * `start: -2` scene as valid input. Clamping it to 0 here did not repair corruption; it destroyed
     * something he had deliberately done.
     * AND UNDO IS WHERE IT BIT. `history.restore()` runs this sanitiser over EVERY layer of the restored
     * snapshot — so one undo of an unrelated edit dragged every past-zero clip in the project forward
     * to 0. Redo could not bring it back (redo sanitises identically) and undo autosaves on the next
     * line, so the wrong position reached disk immediately. The ordinary project load does NOT run
     * this, which is why the value survived reloads and died only on undo, duplicate or import.
     * ⚠️ WHY NO TEST CAUGHT IT: the only test feeding a negative start uses -1e999, which is -Infinity
     * and returns via the non-finite branch above without ever reaching the clamp. That test pins
     * "must be finite" and passes identically with or without this floor.
     * The protection that mattered is kept: still finite, still bounded, just bounded symmetrically. */
    l.start = num(l.start, -3600, 3600, 0);
    l.duration = num(l.duration, 0.05, 3600, 1);       // 0 would be a clip that cannot be selected or seen
    // …and the THREE that may legitimately be animated: repair a broken plain value, never touch a keyframed one.
    /* trimStart joined them in queue 718 (hunt HIGH #1). It is keyframable on an open path — the Draw-from — and
       this line had no guard: `+{kf:[…]}` is NaN, so the whole animation became a plain 0. history.restore() runs
       this over every layer, so ONE UNDO OF ANYTHING left the drawing fully revealed, redo could not bring it back
       (it sanitises identically) and the next autosave wrote the loss to disk. Queue 680, one line down. */
    if (l.trimStart != null && !(FM.isAnimated && FM.isAnimated(l.trimStart))) l.trimStart = num(l.trimStart, 0, 3600, 0);
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
      sanitizeMasks(l);
      sanitizeAudioFx(l);
      sanitizeTrimRepeater(l);
      sanitizeBehaviors(l);
      sanitizeEffects(l);   // after the masks — queue 560
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
  /* queue 921 S2: the host runs the project clamp on a CLONE as one of its three invariants (§7.1 step
     8), and until now it could not reach this one — so S1's suite carried a hand-written copy of the
     arithmetic above, which is two sources of truth for one rule and exactly the shape the whitelist-
     drift memory note is about. The bridge uses this; the suite now compares against it. */
  FM.storage._clampProjectDims = clampProjectDims;
  /* ═══ THE `collab:` CORNER OF INDEXEDDB (queue 921 S2, spec §12.4) ═════════════════════════════
   * Checkpoints, a guest's persisted base and (in S4) media parts all live in the media store under
   * `collab:` keys — which `pruneOrphans` was already taught to skip in S0. Three one-line wrappers,
   * rather than a second `openDB()` inside the collab modules: the database name, the store name and
   * the quota handling are this file's business, and a second copy of them is a second thing to keep
   * in step with a schema bump.
   * ⚠️ The key prefix is enforced here, not trusted. Anything outside `collab:` would be a media
   * record, and a collab module writing one would be invisible to every rule that owns them. */
  function collabKey(k) {
    if (typeof k !== 'string' || k.indexOf('collab:') !== 0) throw new Error('collab storage keys must start with "collab:" — got ' + k);
    return k;
  }
  FM.storage.collabPut = async function (key, val) {
    try { const db = await openDB(); const ok = await idbPut(db, collabKey(key), val); db.close(); return ok; } catch (e) { return false; }
  };
  FM.storage.collabGet = async function (key) {
    try { const db = await openDB(); const v = await idbGet(db, collabKey(key)); db.close(); return v === undefined ? null : v; } catch (e) { return null; }
  };
  FM.storage.collabDel = async function (key) {
    try { const db = await openDB(); await idbDel(db, collabKey(key)); db.close(); return true; } catch (e) { return false; }
  };
  /* The fourth seam, added with the first writer that has to TRIM (queue 921 S3): §12.4 keeps 10
     checkpoints per project, and "keep 10" needs to know what is already there. Sorted, so a caller can
     take the oldest without re-deriving the timestamp out of the key. */
  FM.storage.collabKeys = async function (prefix) {
    const p = collabKey(prefix);
    try {
      const db = await openDB(); const ks = await idbKeys(db); db.close();
      return ks.filter(function (k) { return typeof k === 'string' && k.indexOf(p) === 0; }).sort();
    } catch (e) { return []; }
  };
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
    /* A file exported from INSIDE an element or template workspace carries that session's pointers; imported
       later, Home would write the imported project back over the element/template (review, 2 Sep). Strip them. */
    ['ofTemplate', 'ofElement', 'returnTo'].forEach(k => { try { delete obj.project[k]; } catch (e) {} });
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
    /* ⚠️ AND SAY WHICH LAYERS CAME BACK EMPTY (queue 888). The loop above only ever walks obj.media,
     * so a video whose file was too big to embed is restored as a layer that is present, correctly
     * timed, correctly keyframed and completely BLANK — and nothing anywhere said so. That silence is
     * the dangerous half: the project LOOKS like it opened fine, which is exactly what someone checks
     * before deleting the original. A video or image layer with no media entry is unambiguous, so it
     * can be named. Read from the file's own `omitted` list when it has one (written since v16.33) and
     * worked out from the layers otherwise, so files saved BEFORE this fix still get the warning. */
    try {
      const want = (obj.layers || []).filter(l => l && (l.type === 'video' || l.type === 'image'));
      const blank = want.filter(l => !(obj.media && obj.media[l.id])).map(l => l.name || l.type);
      if (blank.length) {
        const om = obj.omitted || [];
        const named = om.slice(0, 2).map(o => o.file).join(', ');
        const omMany = om.length > 1;
        if (FM.toast) FM.toast(blank.length + (blank.length === 1 ? ' layer has' : ' layers have') + ' no footage in this file' +
          (named ? ' (' + named + (om.length > 2 ? ' and more' : '') + (omMany ? ' were' : ' was') + ' too big to embed)' : '') +
          ' — ' + blank.slice(0, 3).join(', ') + (blank.length > 3 ? ' and more' : '') +
          '. Use Replace media… on ' + (blank.length === 1 ? 'it' : 'each') + ', or restore from a full backup.', 12000);
      }
    } catch (e) {}                                    // a warning must never break an import

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
    /* SAY WHAT IS NOT IN IT (queue 888). This used to toast "Project file saved" whatever happened,
       including when the only thing in the project was a video too big to embed and the file was 4KB
       of nothing. Naming the clips is the whole fix: a file that says what it is missing can be
       trusted, and one that does not cannot. */
    const miss = obj.omitted || [];
    if (!miss.length) { if (FM.toast) FM.toast('Project file saved'); return; }
    const names = miss.slice(0, 2).map(m => m.file + ' (' + m.mb + ' MB)').join(', ');
    const many = miss.length > 1;
    if (FM.toast) FM.toast('Project file saved WITHOUT ' + miss.length + (many ? ' clips — ' : ' clip — ') +
      names + (miss.length > 2 ? ' and more' : '') + (many ? ' are' : ' is') +
      ' too big to fit in a project file. Use Settings → Back up every project to keep the footage.', 12000);
  };

  /* ═══ BACK UP EVERY PROJECT TO ONE FILE (queue 869) ═══════════════════════════════════════════
   * Until now the ONLY backup was exportFile above: one project, by hand, before anything went
   * wrong. tools/rollback.sh can put the CODE back to any release and every release is on GitHub —
   * but his projects are not in the repo. They live in localStorage and IndexedDB on whichever device
   * made them, and js/home.js says so in its own words at the delete prompt: "there is no undo and no
   * backup". Clear the site data, lose the phone, or tap delete once, and they are gone.
   *
   * ⚠️ THE ONE THING A BACKUP MUST NEVER DO IS LIE ABOUT WHAT IT CONTAINS. exportFile skips any media
   * file over EMBED_LIMIT silently, which is a reasonable trade for SHARING one project and a
   * terrible one for a backup: a single long video would be dropped, the file would look fine, and he
   * would find out only when he needed it. So this uses a much larger ceiling, and — more importantly
   * — it COUNTS AND NAMES everything it could not carry, returns that to the caller, and writes it
   * into the file itself. A backup that says "these three clips are not in here" is honest. One that
   * quietly leaves them out is worse than no backup at all, because he would trust it.
   *
   * Local-only is untouched: this writes a file HE saves, exactly like exportFile. Nothing leaves the
   * device, there is no server and no account. That was the point of option A in #869. */
  /* A SEAM, not a constant, and the reason is that the honesty property is the one that matters most
     here. "Anything too big to carry is NAMED rather than silently dropped" cannot be tested with a
     hard 96MB ceiling — no suite is going to build a 96MB file — so the limit is readable and
     settable and the test lowers it to a few bytes. Untestable safety is not safety. */
  FM.storage._backupEmbedLimit = 96 * 1024 * 1024;   // a backup is MEANT to be big; a shared project is not

  FM.storage.buildBackup = async function (onProgress) {
    const idx = (FM.projects && FM.projects.list()) || [];
    const projects = [], skippedProjects = [], skippedMedia = [];
    let drafts = 0;
    for (let i = 0; i < idx.length; i++) {
      const p = idx[i];
      if (onProgress) { try { onProgress(i + 1, idx.length, p.name || 'Untitled'); } catch (e) {} }
      let got = null;
      try { got = await packFromProject(p.id, true); } catch (e) { got = null; }
      if (!got || !got.pack) { skippedProjects.push(p.name || p.id); continue; }
      const pack = got.pack, media = {};
      for (const lid in pack.media) {
        const rec = pack.media[lid];
        if (!rec || !rec.file) continue;
        if (rec.file.size > FM.storage._backupEmbedLimit) {
          skippedMedia.push({ project: p.name || 'Untitled', file: rec.file.name || 'a clip', mb: Math.round(rec.file.size / 1048576) });
          continue;
        }
        const durl = await fileToDataURL(rec.file);
        if (durl) media[lid] = { kind: rec.kind, name: rec.file.name, dataURL: durl };
        else skippedMedia.push({ project: p.name || 'Untitled', file: rec.file.name || 'a clip', mb: Math.round(rec.file.size / 1048576) });
      }
      /* ⚠️ queue 915 phase A: A CLIP WITH NOTHING STORED IS NAMED TOO. The loop above only walks what the
         packer FOUND, so a video/image layer (a song is a video layer) with no file behind it — a record
         that never landed, a pointer whose shared copy is gone — was simply absent, and the file claimed
         to be complete. The review of the one-copy build traced
         exactly that (audits/915-5-review.json): a backup taken while rolled back, with every reused clip
         silently missing. Whatever the cause, a blank in a backup must never be silent. `missing` tells
         these apart from the too-big ones, which DO exist and were only left out of the file. */
      for (const l of pack.layers || []) {
        if (!l || (l.type !== 'video' && l.type !== 'image')) continue;
        const has = pack.media[l.id];
        if (has && has.file) continue;
        const nm = l.name || (l.type === 'video' ? 'a clip' : 'a photo');
        skippedMedia.push({ project: p.name || 'Untitled', layer: nm, file: nm, mb: 0, missing: true });
      }
      /* The INDEX's name wins over the packed project's, for the same reason templates.exportFile
         gives: the doc's own name can be stale ("Untitled 3") while the card he recognises is right. */
      const project = Object.assign({}, pack.project, { name: p.name || pack.project.name || 'Untitled' });
      const entry = { app: 'freemotion', v: 1, project: project, layers: pack.layers, media: media, fonts: await embedFonts(pack.layers) };
      /* ⚠️ queue 915 clause 8: SAY WHICH ONES ARE WORKSPACES. list() includes the hidden element and
         template drafts, and restoring them through create() with no flag turned each into an ordinary
         project — the Projects-list clutter queue 340 removed. Kept IN the file rather than skipped: a
         "Build a new one…" draft is work that exists nowhere else, and elements/templates themselves are
         not in a backup. Only the KIND travels — never the ofElement/ofTemplate pointer, which on
         restore would write this old copy back over a live element the first time he came Home. */
      if (p.elementDraft) entry.draft = 'element';
      else if (p.templateDraft) entry.draft = 'template';
      if (entry.draft) drafts++;
      projects.push(entry);
    }
    return {
      app: 'freemotion', backup: 1, v: 1,
      projects: projects,
      /* Written INTO the file, not only shown once in a toast he may not be looking at. A year from
         now the file has to be able to answer "is my video in here" by itself. */
      notIncluded: { projects: skippedProjects, media: skippedMedia },
      count: projects.length,
      drafts: drafts,   // queue 915: of `count`, how many are element/template workspaces rather than projects
    };
  };

  FM.storage.backupAll = async function (onProgress) {
    const obj = await FM.storage.buildBackup(onProgress);
    if (!obj.count) return { ok: false, reason: 'There are no projects to back up yet.', report: obj };
    let blob;
    try { blob = new Blob([JSON.stringify(obj, FM.jsonReplacer)], { type: 'application/json' }); }
    catch (e) {
      /* A library of big videos can exceed what one JSON string can hold. Saying so beats a silent
         half-file or a crash, and it names the only lever he has. */
      return { ok: false, reason: 'That is too much to put in one file — back up a few projects at a time, or shorten the longest ones.', report: obj };
    }
    const stamp = FM.storage._backupStamp ? FM.storage._backupStamp() : 'backup';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'FreeMotion-' + stamp + '.fmbackup.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true, count: obj.count, drafts: obj.drafts || 0, notIncluded: obj.notIncluded, bytes: blob.size, report: obj };
  };
  // Split out so the suite can pin the filename without a clock in the test.
  FM.storage._backupStamp = function () {
    const d = new Date();
    const two = n => (n < 10 ? '0' : '') + n;
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
  };

  /* Put it back. Each project in the file goes through importObject, which is the SAME validated door
     a single .fmotion.json import uses — so a corrupt or foreign entry is refused with a reason
     rather than becoming an empty project, which is exactly what queue 673 fixed for the single case.
     ⚠️ IT ADDS, IT NEVER REPLACES. Restoring cannot destroy what is already on the device, because
     the failure this whole item exists to prevent is losing work — and a restore that wiped first
     would be a new way to do exactly that. */
  FM.storage.restoreBackup = async function (obj, onProgress) {
    if (!obj || obj.app !== 'freemotion' || !obj.backup || !Array.isArray(obj.projects)) {
      return { ok: false, reason: 'That is not a FreeMotion backup file.' };
    }
    /* ⚠️ queue 915 clause 4: AND PUT HIM BACK WHERE HE WAS. importObject goes through projects.create(),
       which switches the open project once per entry — so a restore left the EDITOR on the last restored
       project while Home's OPEN badge still sat on his own, and a restore from inside a project dropped
       him into a different one behind his back. Adding things must not move him. */
    const wasOn = curId();
    let restored = 0, drafts = 0; const failed = [];
    for (let i = 0; i < obj.projects.length; i++) {
      const one = obj.projects[i];
      const nm = (one && one.project && one.project.name) || 'Untitled';
      if (onProgress) { try { onProgress(i + 1, obj.projects.length, nm); } catch (e) {} }
      /* queue 915 clause 8: a workspace comes back as the same KIND of workspace — see buildBackup */
      const draft = one && (one.draft === 'element' || one.draft === 'template') ? one.draft : null;
      let ok = false;
      try { ok = await FM.storage.importObject(one, null, { quiet: true, draft: draft }); } catch (e) { ok = false; }
      if (ok) { restored++; if (draft) drafts++; } else failed.push(nm);
    }
    if (wasOn && FM.projects && curId() !== wasOn && FM.projects.list().some(p => p.id === wasOn)) {
      try { await FM.projects.open(wasOn); } catch (e) {}
    }
    return { ok: restored > 0, restored: restored, drafts: drafts, failed: failed, total: obj.projects.length };
  };

  /* ═══ WHAT IS WRONG WITH THIS FILE, IN WORDS (queue 673) ══════════════════════════════════════
   * The import used to create the project FIRST and validate second, and `applyScene` returns FALSE
   * rather than throwing when a file is malformed — with no `else` on that branch. So a bad file left
   * you sitting in a brand-new EMPTY project named after it, with **no message at all**, and the
   * project count went 1 → 2. A second bad file made 3.
   * ⚠️ THAT READS EXACTLY LIKE "THE IMPORT DESTROYED MY PROJECT", which is the worst possible reading
   * of what was actually a no-op. Silence is not neutral when the screen has visibly changed.
   * This returns a REASON rather than a boolean because the reasons are genuinely different and the
   * user can act on the difference: the wrong app's file, a truncated download, a file too big to
   * open. `applyScene` keeps its own guard — it has other callers — but nothing now depends on that
   * guard being the thing that speaks. */
  FM.storage.sceneFileProblem = function (obj) {
    if (!obj || typeof obj !== 'object') return 'That file is not a FreeMotion project.';
    if (obj.app !== 'freemotion') return 'That is not a FreeMotion project file.';
    if (!obj.project) return 'That project file is missing its canvas settings — it may be truncated or only half-downloaded.';
    if (!Array.isArray(obj.layers)) return 'That project file has no layers list — it may be truncated or only half-downloaded.';
    if (obj.layers.length > 2000) return 'That project has ' + obj.layers.length + ' layers, which is more than FreeMotion will open.';
    return null;
  };

  /* Split out of importFile so the ORDER can be tested. The bug was never in the parsing or the
     applying — it was that "create the project" happened before "is this file any good", and a file
     input is not something a test can fill. */
  /* `opts.quiet` exists for the backup RESTORE (queue 869), which calls this once per project: a
     twenty-project restore would otherwise fire twenty "Project imported" toasts on top of each
     other and say nothing useful. The restore reports once, at the end, with the real count. */
  FM.storage.importObject = async function (obj, onDone, opts) {
    const problem = FM.storage.sceneFileProblem(obj);
    if (problem) { if (FM.toast) FM.toast(problem, 5000); return false; }
    const kind = opts && opts.draft;   // queue 915 clause 8: only restoreBackup passes this, and only these two values
    if (FM.projects) await FM.projects.create(Object.assign({ name: (obj.project && obj.project.name ? obj.project.name : 'Imported project'), width: obj.project && obj.project.width, height: obj.project && obj.project.height },
      kind === 'element' ? { elementDraft: true } : kind === 'template' ? { templateDraft: true } : {}));
    const ok = await FM.storage.applyScene(obj);
    if (!ok) {
      /* Belt and braces: sceneFileProblem should have caught everything applyScene refuses, but if the
         two ever disagree the user must still be told rather than left in an empty project. */
      if (FM.toast) FM.toast('That project file could not be opened.', 5000);
      return false;
    }
    if (FM.history) FM.history.reset();
    FM.storage.markDirty(); FM.storage.save();
    if (FM.projects) FM.projects.touchCurrent(true);
    if (FM.toast && !(opts && opts.quiet)) FM.toast('Project imported');
    if (onDone) onDone();
    return true;
  };

  FM.storage.importFile = function (onDone) {   // onDone runs ONLY on a successful import (not on picker-cancel)
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0]; input.remove();
      if (!file) return;
      try {
        let obj = null;
        try { obj = JSON.parse(await file.text()); }
        catch (e) { if (FM.toast) FM.toast('That file is not readable as a project — it may be truncated.', 5000); return; }
        // Import into a NEW project — never overwrite whatever happens to be open. (#r1) …but only
        // once the file has been checked, which is queue 673's whole point.
        await FM.storage.importObject(obj, onDone);
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
    /* queue 914.8: the SPLIT LINEAGE is a cross-layer ref too. It is a plain string shared by the halves, so an
       element inserted twice gave both copies the same one — and FM.clipAt then let a child in one copy follow a
       half from the OTHER, flying off with it when that copy was moved. Renamed consistently per batch, so
       halves that arrive together stay halves of each other and nothing already in the scene can join them. */
    const lin = Object.create(null);
    out.forEach(l => { if (l.splitOf) { if (!lin[l.splitOf]) lin[l.splitOf] = l.id; l.splitOf = lin[l.splitOf]; } });
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
      // eachRefFx: a caption CUE's own effects carry params.source too, and were never remapped —
      // an imported or templated copy kept mattes pointing at a layer that is not in the new scene
      // and the compositor drew the layer plain (queue 834 u3).
      FM.eachRefFx(l, fx => {
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
      /* THE BYTES FIRST, THE DECODE SECOND (review of v15.04, 2 Sep). This used to store the blob only after a
         successful decode, so a clip this device cannot play (a codec Safari lacks, a size-probe timeout on a big
         file) was in neither FM.media nor IDB — and the next save-back (an element or template edited in place)
         packed the layer WITHOUT its media and overwrote the original: the file gone for good, on a device that
         never showed it. Stored first, the layer merely shows blank here and the file survives every round trip. */
      try { if (db) await idbPut(db, newLayerId, { file: md.file, kind: md.kind }); } catch (e) {}
      try {
        const rec = md.kind === 'video' ? await FM.loadVideoFile(md.file) : await FM.loadImageFile(md.file);
        FM.media.set(newLayerId, rec);
        if (rec.kind === 'video' && rec.el) rec.el.addEventListener('seeked', () => { if (!FM.playing && FM.requestRender) FM.requestRender(); });
        if (FM.wireVideoRepaint) FM.wireVideoRepaint(rec);
      } catch (e) { /* that layer loads media-less here; its file is kept above */ }
    }
    if (db) db.close();
    FM._mediaBusy = Math.max(0, (FM._mediaBusy || 1) - 1);
  }
  // Poster frame of the current scene for home-screen cards. 360px longest side (2× the old 180 —
  // retina-crisp at the list-row thumb size), PROGRESSIVE halving on the way down (a single
  // 1080→180 drawImage skipped most source pixels = the old mushy cards), JPEG q0.8.
  function makeThumb() {
    /* queue 915 clause 1: NO PICTURE BEATS A BLACK ONE. With the scene's media released (Home, queue
       385) a render is the project minus its photos and videos, and every caller already treats null as
       "keep the card you have" — which is the good picture captured just before the release. */
    if (sceneMediaReleased()) return null;
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
  /* ⚠️ queue 915 clause 6: THE PICTURE OF WHAT IS BEING SAVED, NOT OF WHAT WAS AUTOSAVED A WHILE AGO.
     Writing an element/template back (updateFrom) read the workspace's stored thumbnail first — but that
     is only re-captured every 12s, and Home deliberately skips the capture on the way out (queue 128) —
     so recolour red → blue → green inside 12s and the card came back BLUE over a pack that is green. It
     reads as "my edit didn't save". When the source IS the open scene, render it now. Null (a pinned
     picture he chose, media released on Home, not the open project) falls through to the stored one. */
  function liveThumbOf(id) {
    if (!id || id !== (boundId || curId())) return null;
    if (FM.scene && FM.scene.project && FM.scene.project.thumbPinned) return null;
    return makeThumb();
  }

  /* ═══ A PICTURE OF THE ELEMENT ITSELF (queue 342).
   * `saveFromProject` — the Home route — stamps the source project's thumbnail, which is right there
   * because the project IS the element. `save(name, layers)` — the "save this selection as an
   * element" route — stamped NOTHING, so every element made that way fell back to a letter glyph.
   * That is the "a card is a name and a layer count" in his complaint: fine with three elements,
   * useless with thirty, and it is not a taste call which way it should go.
   * Rendered from the layers being saved rather than the open project, so a selection of two layers
   * out of twenty shows those two — the thing you are actually saving. */
  /* WHEN DOES THIS SELECTION ACTUALLY SHOW SOMETHING? (queue 488) The thumbnail used to be drawn at
     whatever the playhead happened to be on, and `drawLayer` returns immediately for a layer that is
     not visible at that instant — so saving a selection whose clips do not span the playhead rendered
     NOTHING, and the JPEG (which has no transparency) came out solid black. Two black cards are
     indistinguishable from each other and both look broken, which is worse than the letter/✦ fallback
     this replaced.
     Prefer the playhead when it already shows the whole selection, so the card matches what he was
     looking at; otherwise take the moment where the most of it is on screen. */
  function pickThumbTime(layers) {
    const visibleAt = (t) => layers.reduce((n, l) => n + (!FM.isLayerVisibleAt || FM.isLayerVisibleAt(l, t) ? 1 : 0), 0);
    const now = Math.max(0, FM.time || 0);
    let bestT = now, bestN = visibleAt(now);
    if (bestN === layers.length) return now;
    layers.forEach(l => {
      const st = Math.max(0, +l.start || 0), du = Math.max(0, +l.duration || 0);
      [st + Math.min(0.05, du / 2), st + du / 2, st + Math.max(0, du - 0.05)].forEach(t => {
        if (!isFinite(t) || t < 0) return;
        const n = visibleAt(t);
        if (n > bestN) { bestN = n; bestT = t; }
      });
    });
    return bestT;
  }
  FM._pickThumbTime = pickThumbTime;   // suite seam

  function makeLayerThumb(layers) {
    try {
      if (!layers || !layers.length || !FM.renderScene) return null;
      const P = FM.scene.project;
      const mini = { project: P, layers: layers };
      let src = document.createElement('canvas'); src.width = P.width; src.height = P.height;
      FM.renderScene(src.getContext('2d'), mini, pickThumbTime(layers));
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
      /* AND NEVER HAND BACK A BLACK ONE. Choosing a better moment covers the common case, but a layer
         can draw nothing for reasons no time can fix — fully transparent, scaled to zero, or sitting
         entirely off-canvas. Returning null lets the caller fall back to the ✦ / letter card, which at
         least tells two of them apart.
         ⚠️ MEASURE BRIGHTNESS, NOT ALPHA. The first version of this check asked whether any pixel had
         alpha — and the scene paints an OPAQUE background, so alpha is full even when nothing at all
         was drawn. It passed a card that was 3072 out of 3072 pixels solid black. A flat card is only
         rejected when it is also DARK: a solid pink element is a perfectly good flat card and says
         what it is, whereas a black one is indistinguishable from every other black one. */
      try {
        const px = g.getImageData(0, 0, tw, th).data;
        let brightest = 0;
        for (let i = 0; i < px.length; i += 4) {
          const v = px[i] > px[i + 1] ? (px[i] > px[i + 2] ? px[i] : px[i + 2]) : (px[i + 1] > px[i + 2] ? px[i + 1] : px[i + 2]);
          if (v > brightest) { brightest = v; if (brightest > 12) break; }
        }
        if (brightest <= 12) return null;
      } catch (e) { /* tainted canvas (cross-origin media) — cannot read it, so trust the render */ }
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
      /* …and so can a COLLAB undo (queue 921 S0). In a session undo walks collab's own per-person
         steps, not this snapshot stack, so a layer deleted during the session is reachable from a
         record no `snaps[i]` mentions. Freeing it here would make that undo bring the layer back
         permanently blank — the exact data loss the paragraph above exists to prevent.
         NOT gated on `active`: collab keeps owning undo until the project is switched (§10.5). */
      if (FM.collab && FM.collab.reachable && FM.collab.reachable(id)) return;
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
    saveIndex(arr) { return writeJSON(PROJ_INDEX, arr); },   // queue 748: the autosave tick needs to know
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
      const id = boundId || curId(); if (!id) return true;   // (nothing to write) THIS tab's project, not the shared fm.currentProject — else a 2nd tab makes us stamp its card/thumbnail with our scene
      const idx = this.list();
      const e = idx.find(p => p.id === id); if (!e) return true;   // (nothing to write)
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
      return this.saveIndex(idx);   // queue 748: false when the index did not reach disk
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
      FM.storage.flushSync(); this.touchCurrent(true);   // queue 915: a no-op picture while its media are released (makeThumb)
      /* ⚠️ THE SESSION STANDS DOWN HERE, NOT AT history.reset() BELOW (queue 921, spec §12.1 `paused`).
         Everything from the next line to `load()` finishing is a document that belongs to NEITHER
         project: the scene is emptied, then `load()` is awaited for as long as IndexedDB and a media
         hydrate take. reset() is the only thing that reached FM.collab, and it runs at the END of all
         that — while the 100 ms ticker fires right through it. A tick landing in that window diffs a
         full base against an empty live and emits one `lr` per layer, which the host accepts and
         broadcasts: every layer deleted for everyone, the owner's real project autosaved over, and
         then the OTHER project uploaded into the room as the load completes. flushSync above has
         already sent the outgoing project's last edits, so this is the right moment and not a byte
         earlier. (pushLocal carries the matching structural check, so this ordering is not the only
         thing holding the door shut.) */
      /* `force`, because THIS is the caller that knows: the id being left is still the current one, so
         onReset's "is the open project still mine?" guard would answer yes and skip (queue 921 S2). */
      if (FM.collab && FM.collab.onReset) FM.collab.onReset({ force: true });
      FM.releaseProjectMedia(FM.scene.layers);
      _released.clear();   // a different scene from here on — the ids above no longer describe it
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
      /* WHICH element this workspace is editing (queue 505), stamped on the DOC so it survives a reload
         — the same two-place trick `fromTemplate` uses. Without it the editing session cannot know
         which element it came from, which is the whole reason saving could only ever mint a new one. */
      if (opts.ofElement) fresh.project.ofElement = opts.ofElement;
      /* ⚠️ NOT `ofTemplate` — deliberately. The element twin stamps ofElement on this create-time stub; a template
         must not, because the stub (`layers: []`) is what a crash during hydration leaves on disk, and Home's
         commit reads `project.ofTemplate` to decide whether to write the open doc BACK OVER THE TEMPLATE. With the
         pointer here, a relaunch after such a crash wiped the template to empty (review, 2 Sep). openForEdit puts
         ofTemplate on the project only AFTER the pack is adopted, so a half-hydrated workspace is never committable.
         The INDEX record still carries it (below) for the card's label and the one-workspace-per-template reuse. */
      writeJSON('fm.proj.' + id, { project: fresh.project, layers: [], selectedId: null, selectedIds: [] });
      const idx = this.list();
      /* `elementDraft` marks a project that exists only as a WORKSPACE for building an element (queue
         340). Ezra: *"When you create a new element it just creates a new project"* — and he was right,
         because it does: an element is saved from layers, so something has to hold those layers while
         you draw them. The mistake was letting that workspace land in Projects looking like an ordinary
         project. Flagged here, hidden from the Projects tab, and shown under Elements as a draft. */
      const rec = { id: id, name: fresh.project.name, created: Date.now(), modified: Date.now(), width: fresh.project.width, height: fresh.project.height, fps: fresh.project.fps, duration: fresh.project.duration, thumb: null };
      if (opts.elementDraft) rec.elementDraft = true;
      if (opts.ofElement) rec.ofElement = opts.ofElement;   // …and on the index, so Home can label the card without reading every doc
      if (opts.templateDraft) rec.templateDraft = true;      // a workspace EDITING a template (queue 505 clause 4): hidden from Projects, shown under Templates
      if (opts.ofTemplate) rec.ofTemplate = opts.ofTemplate;
      idx.unshift(rec);
      this.saveIndex(idx);
      await this.open(id);
      return id;
    },
    /* ⚠️ queue 915 clause 3: TRUE ONLY WHEN THERE IS A WHOLE COPY. Every write here was unread and the
       function returned nothing, so on a nearly-full phone the doc write failed, the copy was indexed
       anyway, and "X copy · 40 layers" opened EMPTY — while the bulk bar, reading `!== false`, toasted
       "Duplicated 1". He could reasonably delete the original next. So: no doc, stop before the card;
       a clip that could not be copied, take the half-copy back out (every key below is one this call
       minted a moment ago — nothing of his is touched) and say false. */
    async duplicate(id) {
      if (id === curId() && FM.storage && FM.storage.flushSync) FM.storage.flushSync();   // duplicating the OPEN project must copy the last 600ms of edits, not the stale doc
      const doc = readJSON('fm.proj.' + id, null); if (!doc) return false;
      /* THE BODY IS duplicateFrom (queue 921 S0). Behaviour-identical: `duplicate` still reads the doc off
         disk and still answers true/false; everything below the read happens there. Split because collab
         has two callers that must make the same kind of copy out of a document that is NOT on disk under
         its own key — "Save my version as a copy" after an offline clash (§13.4), and detaching a linked
         copy when a session ends (§12.3). A second copy of this code is a second set of the queue-915.3
         rollback rules to keep in step, and those were paid for once already. */
      return (await this.duplicateFrom(doc, { name: ((this.list().find(p => p.id === id) || {}).name || 'Project') + ' copy', srcIds: [id] })) !== null;
    },
    /* Make a NEW project out of a document — fresh project id, fresh layer ids, its media copied under
       those ids, and the whole half-copy taken back out if any part of it fails (queue 915.3). Returns
       the new project id, or null.
       `opts.name`   the card's name. Default: the source card's name (or the doc's own) + " copy".
       `opts.srcIds` project ids to inherit the card fields and the thumbnail from, first match wins.
                     `duplicate` passes the project it copied; a collab caller holding a document that
                     never had a card of its own passes nothing.
       ⚠️ THE DOCUMENT IS CLONED FIRST. `duplicate` hands over a freshly-parsed doc, but a collab caller
       hands over a live one — reIdLayers rewrites layer ids in place, and doing that to the caller's
       object would re-id the project he is still editing. */
    async duplicateFrom(doc, opts) {
      opts = opts || {};
      if (!doc || !doc.project) return null;
      doc = JSON.parse(JSON.stringify(doc));
      const src = (opts.srcIds || []).map(sid => this.list().find(p => p.id === sid)).filter(Boolean)[0] || {};
      const id = (opts.srcIds || [])[0] || null;   // the thumbnail's source, when there is one
      const name = opts.name || ((src.name || (doc.project && doc.project.name) || 'Project') + ' copy');
      const re = reIdLayers(doc.layers || []);
      const nid = newId('p');
      if (!writeJSON('fm.proj.' + nid, { project: JSON.parse(JSON.stringify(doc.project)), layers: re.layers, selectedId: null, selectedIds: [] })) return null;
      FM._mediaBusy = (FM._mediaBusy || 0) + 1;
      const done = (ok) => { FM._mediaBusy = Math.max(0, (FM._mediaBusy || 1) - 1); return ok ? nid : null; };
      // index the copy BEFORE the (slow, awaited) media copies — killing the tab mid-copy used to
      // strand an invisible doc that no home card showed and pruneOrphans then gutted
      const idx = this.list();
      idx.unshift(Object.assign({}, src, { id: nid, name: name, created: Date.now(), modified: Date.now(), layers: re.layers.length, thumb: null }));
      if (!this.saveIndex(idx)) { try { localStorage.removeItem('fm.proj.' + nid); } catch (e) {} return done(false); }
      // duplicate the media blobs under the new layer ids so the copy survives deleting the original
      const wrote = [];
      let whole = true;
      try {
        const db = await openDB();
        for (const oldId of Object.keys(re.map)) {
          /* queue 915 phase A: RESOLVED, so a reused clip's pointer is copied as the FILE — this release writes
             no pointers, and a whole copy is one every older build can read. A pointer at a shared copy that is
             gone answers null, like a clip with no record, and is not copied onward. */
          const rec = await idbGetMedia(db, oldId);
          if (!rec) continue;
          if (!(await idbPut(db, re.map[oldId], rec))) { whole = false; break; }
          wrote.push(re.map[oldId]);
        }
        if (whole && id) { const th = await idbGet(db, 'thumb:' + id); if (th) { await idbPut(db, 'thumb:' + nid, th); _thumbCache.set(nid, th); } }   // copy the card thumbnail too (cosmetic — not part of "whole")
        db.close();
      } catch (e) { whole = false; }
      if (whole) return done(true);
      try { const db = await openDB(); for (const k of wrote) await idbDel(db, k); await delThumb(db, nid); db.close(); } catch (e) {}
      try { localStorage.removeItem('fm.proj.' + nid); } catch (e) {}
      this.saveIndex(this.list().filter(p => p.id !== nid));
      return done(false);
    },
    /* ═══ THE GUEST'S COPY OF A SHARED PROJECT (queue 921 S2, spec §12.2) ══════════════════════════
     * A guest does not "open the owner's project" — there is no such thing on this device. It gets a
     * NEW project of its own, holding the host's document, with the host's LAYER IDS kept so the ops
     * line up. The link lives on the index entry under `collab`, which is where the secrets go for the
     * same reason the AI key does: localStorage, on this device, never in the document.
     *
     * ⚠️ THE SANITISE HAPPENS HERE, not at the call site. §12.2 lists it as step 2 of the join flow and
     * `createLinked` as step 3, which makes "we sanitised it" something a future caller has to
     * remember — and this repo's rule is that anything important enough to forget is structural. The
     * host has already normalised at arm (§7.3), so on a well-behaved room this changes nothing; the
     * point is the room that is not well behaved. Everything a peer sends is untrusted (§14.9).
     *
     * Returns the new project id, or null if the write failed (a full device). */
    createLinked(meta, D) {
      if (!D || !D.project || !Array.isArray(D.layers)) return null;
      const m = meta || {};
      const project = JSON.parse(JSON.stringify(D.project));
      const layers = JSON.parse(JSON.stringify(D.layers));
      sanitizeImportedLayers(layers);
      if (FM.repairParentCycles) FM.repairParentCycles(layers);
      clampProjectDims(project);
      const gpid = newId('p');
      if (!writeJSON('fm.proj.' + gpid, { rev: 1, project: project, layers: layers, selectedId: null, selectedIds: [] })) return null;
      const idx = this.list();
      const rec = {
        id: gpid, name: project.name || m.name || 'Shared project',
        created: Date.now(), modified: Date.now(),
        width: project.width, height: project.height, fps: project.fps, duration: project.duration,
        layers: layers.length, thumb: null,
        collab: {
          v: 1, sid: m.sid || null, sk: m.sk || null,
          hostName: m.hostName || '', hostColor: m.hostColor || '#888888',
          mid: m.mid || null, tok: m.tok || null, role: m.role || 'editor',
          joined: Date.now(), epoch: m.epoch || null, seq: m.seq || 0, cid: 0
        }
      };
      idx.unshift(rec);
      if (!this.saveIndex(idx)) { try { localStorage.removeItem('fm.proj.' + gpid); } catch (e) {} return null; }
      return gpid;
    },
    /* §12.3: the linked copy stops being linked and becomes HIS. New project id, NEW LAYER IDS (that is
     * the whole point — the ids were the host's, and two projects on one device holding the same layer
     * ids is what the same-device refusal in §12.2 exists to catch), media copied under them.
     *
     * ⚠️ IT GOES THROUGH duplicateFrom, which is queue 915.3's rollback: a half-copy on a full device
     * is taken back out rather than indexed. Detach must never be able to leave him with two broken
     * projects where he had one working one — this is the path that runs when the owner stops sharing,
     * i.e. when he is NOT looking at the screen.
     * The linked copy is removed only AFTER the new one is whole. Returns the new pid, or null. */
    async detachLinked(gpid) {
      /* ⚠️ THE SAME FIRST LINE `duplicate()` CARRIES, AND FOR THE SAME REASON (queue 921): this copies
         the doc ON DISK and then DELETES the project that still held the newer content in memory, so
         without the flush everything edited since the last 600 ms autosave is gone — silently, and
         into a project that no longer exists. The window is not capped at 600 ms either: every edit
         restarts that timer, so during continuous work the doc stays stale indefinitely, and "the
         owner stopped sharing" arrives when he is not looking at the screen. Inside the function
         rather than at the call sites, for the reason `createLinked`'s own note gives. */
      if (gpid === curId() && FM.storage && FM.storage.flushSync) FM.storage.flushSync();
      const doc = readJSON('fm.proj.' + gpid, null);
      if (!doc) return null;
      const src = this.list().find(p => p.id === gpid) || {};
      const nid = await this.duplicateFrom(doc, { name: src.name || (doc.project && doc.project.name) || 'Shared project', srcIds: [gpid] });
      if (!nid) return null;
      /* The copy inherited the source card's fields — including `collab`, which would make a project
         that is nobody's copy of anything look linked, and would hand its sid and key to a brand-new
         project the host has never heard of. */
      const idx = this.list();
      const e = idx.find(p => p.id === nid);
      if (e) { delete e.collab; this.saveIndex(idx); }
      const wasOpen = curId() === gpid;
      await this.remove(gpid);
      if (wasOpen && curId() !== nid) await this.open(nid);
      return nid;
    },
    rename(id, name) {
      const idx = this.list(); const e = idx.find(p => p.id === id); if (!e) return;
      e.name = name; e.modified = Date.now(); this.saveIndex(idx);   // renaming is a real change → bumps list order
      const doc = readJSON('fm.proj.' + id, null);
      if (doc && doc.project) { doc.project.name = name; writeJSON('fm.proj.' + id, doc); }
      if (id === curId()) { FM.scene.project.name = name; if (FM.refreshAll) FM.refreshAll(); }
    },
    /* ═══ DISCARD A DRAFT WITHOUT EVER MINTING A PROJECT (queue 505).
       `remove()` below deliberately opens another project — or CREATES an "Untitled" — when you delete
       the one that is currently open. That is right for a project you chose to delete, and exactly
       wrong here: tidying away an element's workspace must never manufacture the very thing he is
       complaining about. So this deletion has no such branch, and is only safe on a draft that is NOT
       current — every caller switches away first, and this refuses if that was not done. */
    async discardDraft(id) {
      if (!id || id === curId()) return false;
      const doc = readJSON('fm.proj.' + id, null);
      try {
        const db = await openDB();
        const libKeys = new Set(FM.mediaLib && FM.mediaLib.keys ? FM.mediaLib.keys() : []);
        if (doc && Array.isArray(doc.layers)) for (const l of doc.layers) { if (!libKeys.has(l.id)) await idbDel(db, l.id); }
        await delThumb(db, id);
        db.close();
      } catch (e) {}
      try { localStorage.removeItem('fm.proj.' + id); } catch (e) {}
      this.saveIndex(this.list().filter(p => p.id !== id));
      return true;
    },
    /* DELETE A DRAFT EVEN WHEN IT IS THE ONE YOU HAVE OPEN (queue 617 clause 4).
     * Ezra: *"You have to manually delete them you can't do the select delete, I figured it out"* …
     * *"But as long as there's one left I can't delete it"*.
     * He was exactly right, and the cause is one line: `discardDraft` returns false for `curId()`, by
     * design, because deleting the current document leaves the current-project pointer dangling and
     * the next boot mints "My project". So he could delete his way down the list and the last one —
     * whichever he happened to have open — refused forever, with a toast telling HIM to go and open
     * something else first.
     * ⚠️ THE ORDER IS THE WHOLE TRICK, and `commitDraft` below already learned it the hard way: switch
     * away FIRST, then discard. The other order simply leaves the draft behind.
     * ⚠️ AND `remove()` IS NOT THE ANSWER, tempting as it looks. It handles the current project by
     * opening another one OR MINTING AN "Untitled" — and manufacturing a project while deleting one is
     * the exact failure queue 505 was about.
     * Landing preference: a real project first, then any other project INCLUDING another draft. That
     * second fallback is what actually unblocks him — his screenshot is six drafts and nothing else,
     * so a real-projects-only rule would refuse on all six and reproduce the bug it is fixing.
     * ⚠️ AND IT HAS TO LIVE IN `FM.projects`, NOT `FM.elements`. Written first beside `commitDraft`,
     * which does this same switch-away dance — but commitDraft is a method of FM.elements and reaches
     * across with an explicit `FM.projects.discardDraft(pid)`. Pasted there, this one's `this.list()`
     * and `this.open()` silently addressed the wrong object, and `FM.projects.discardDraftAnyway` did
     * not exist at all. Caught by CALLING it in the browser, not by reading the diff.
     * If there is genuinely nowhere to land — this is the last project he has — it still refuses, and
     * the caller says so in words he can act on. */
    async discardDraftAnyway(id) {
      if (!id) return { ok: false, why: 'noid' };
      if (id !== curId()) return { ok: await this.discardDraft(id), why: '' };
      if (FM.storage && FM.storage.flushSync) FM.storage.flushSync();
      const others = this.list().filter(p => p.id !== id);
      const target = (others.filter(p => !p.elementDraft && !p.templateDraft)[0] || others[0] || {}).id;
      if (!target) return { ok: false, why: 'last' };
      await this.open(target);
      const ok = await this.discardDraft(id);
      return { ok: ok, why: ok ? '' : 'refused' };
    },
    async remove(id) {
      const doc = readJSON('fm.proj.' + id, null);
      try {
        const db = await openDB();
        // Deleting a project deletes ITS media — except any blob the Media library is holding on
        // to. This path never goes through pruneOrphans, so it needs the same keep-set: without it,
        // deleting the project you imported a file into would silently gut the library grid.
        const libKeys = new Set(FM.mediaLib && FM.mediaLib.keys ? FM.mediaLib.keys() : []);
        /* ═══ …AND NEVER A RECORD ANOTHER DOCUMENT STILL POINTS AT (queue 921 S0, spec §24) ═════════
         * This loop deletes one blob per layer id in the doc, on the assumption that a layer id belongs
         * to exactly one project — true while every copy re-ids (duplicate does), and NOT true once a
         * collab guest holds a LINKED copy, which carries the host's layer ids on purpose so the ops
         * line up. Deleting either project would then blank the other one's clips, permanently, with no
         * error. The keep-set is every layer id in every OTHER stored project doc, plus the live scene
         * when the project being removed is not the open one (its doc can be up to 600ms stale).
         * Checkpoints count too: `collab:ckpt:*` is the save point a session can be rolled back to, so a
         * record it names is still reachable — and the ones belonging to THIS project are going below. */
        const elsewhere = new Set();
        for (let i = 0; i < localStorage.length; i++) {
          const lk = localStorage.key(i);
          if (!lk || lk.indexOf('fm.proj.') !== 0 || lk.slice(8) === id) continue;
          const d = readJSON(lk, null);
          if (d && Array.isArray(d.layers)) d.layers.forEach(l => { if (l && l.id) elsewhere.add(l.id); });
        }
        if (id !== curId()) ((FM.scene && FM.scene.layers) || []).forEach(l => { if (l && l.id) elsewhere.add(l.id); });
        const ckptPrefix = 'collab:ckpt:' + id + ':';
        const allKeys = await idbKeys(db);
        for (const k of allKeys) {
          if (typeof k !== 'string' || k.indexOf('collab:ckpt:') !== 0 || k.indexOf(ckptPrefix) === 0) continue;
          ckptLayerIds(await idbGet(db, k)).forEach(lid => elsewhere.add(lid));
        }
        if (doc && Array.isArray(doc.layers)) for (const l of doc.layers) { if (!libKeys.has(l.id) && !elsewhere.has(l.id)) await idbDel(db, l.id); }
        // this project's own collab records go with it (spec §12.4): the checkpoints…
        for (const k of allKeys) { if (typeof k === 'string' && k.indexOf(ckptPrefix) === 0) await idbDel(db, k); }
        /* …and a guest's persisted base, which §12.4's own table collects on "copy detached or
           removed" and which nothing ever did. `collab.bridge.dropBase` was written for exactly this
           and has no caller anywhere, so every join-then-leave left a whole document behind in the
           media store with no rule that could name it again — `pruneOrphans` is taught to skip
           everything under `collab:`. Deleting it HERE rather than at the two call sites means a
           future caller that removes a project cannot forget (queue 921). */
        await idbDel(db, 'collab:base:' + id);
        await delThumb(db, id);
        db.close();
      } catch (e) {}
      try { localStorage.removeItem('fm.collab.host.' + id); } catch (e) {}   // …and the room it was shared from
      try { localStorage.removeItem('fm.proj.' + id); } catch (e) {}
      this.saveIndex(this.list().filter(p => p.id !== id));
      if (id === curId()) {
        /* ⚠️ queue 834 (u7): A DRAFT WORKSPACE IS NOT SOMEWHERE TO LAND. `list()` includes the hidden
           workspaces that an element or a template is edited in, so deleting the project you had open
           could quietly drop you INSIDE one — nothing on Home shows as open, and anything you then add
           is saved back over that element or template when you leave. The three sibling paths that pick
           a landing project (js/storage.js:1687, :2036, :2220) all filter these out; this one did not.
           No `|| any draft` fallback on purpose: with no real project left, a NEW one is the honest
           answer, and that branch already exists below. */
        const rest = this.list().filter(p => !p.elementDraft && !p.templateDraft);
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
        /* ⚠️ queue 921 S0: A SAVE POINT IS A REFERENCE (spec §12.4, §24). `collab:ckpt:*` holds the
           document as it was before a share started, so every layer id inside one is still reachable
           through "Earlier versions…" — and collectKeep above only reads `fm.proj.*`, which a checkpoint
           is not. Without this, the first boot after a session gutted exactly the media the save point
           exists to bring back. Read once here and folded into BOTH keep-sets below, because the delete
           pass re-collects and would otherwise have forgotten them again. */
        const ckptKeep = new Set();
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
          /* ⚠️ queue 915 phase A: A SHARED COPY IS NEVER A CANDIDATE. The one-copy writer (phase B) keeps clips
             in any project as pointers at 'lib:<mid>', and whether one is still used can only be told by reading
             every record — which this release does not do. Keeping them all is the only answer that cannot
             blank a clip; collecting the truly unused ones is the writer's job, with the writer's knowledge.
             (idbDel refuses them as well; this keeps them out of the list so nothing even tries.) */
          if (isLibKey(k)) continue;
          /* queue 921 S0: NOTHING UNDER `collab:` IS EVER A CANDIDATE (spec §4.2, §12.4). Three kinds
             live there — the pre-session checkpoints, a guest's confirmed base, and part-received media —
             and none of them is named by a project doc, so this sweep would read every one as an orphan
             and delete it at the next boot: the save point, the offline recovery point and a half-arrived
             file. They are collected by their own rules (FM.collab.gc), with the knowledge to do it. */
          if (typeof k === 'string' && k.indexOf('collab:') === 0) {
            if (k.indexOf('collab:ckpt:') === 0) ckptLayerIds(await idbGet(db, k)).forEach(id => ckptKeep.add(id));
            continue;
          }
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
            if (keep2.has(k) || ckptKeep.has(k) || FM.media.get(k)) continue;   // referenced since the scan / by a collab save point (queue 921 S0) / live in memory
            await idbDel(db, k);
          }
        }
        db.close();
      } catch (e) {}
    },
  };

  /* ═══ ONE PACKER FOR BOTH LIBRARIES (queue 505 clause 4) ═══════════════════════════════════════
   * Templates and elements are the same object in two stores: a set of layers plus the media files
   * they reference, keyed by layer id. Four routes built that pack with four copies of the same
   * media-gathering loop — `templates.save`, `templates.updateFrom`, `elements.saveFromProject` and
   * `elements.updateFrom` — and the entry for this queue item says why that matters: *"Do not copy the
   * element code across. If both stores end up with a hand-copied round trip, the next bug has to be
   * fixed twice."* It already had to be: the memory-vs-IDB rule below is subtle (a CLOSED project's
   * files are only in IndexedDB, the OPEN one's are only in memory until it flushes) and getting it
   * wrong loses the media silently.
   * `wantProject` is the one real difference: a template carries the project object so it can become a
   * new project, an element carries only layers because it is dropped INTO one. */
  async function packFromProject(projectId, wantProject) {
    const id = projectId || curId();
    if (id === curId()) FM.storage.flushSync();     // the doc on disk must be what he just saw
    const doc = readJSON('fm.proj.' + id, null); if (!doc) return null;
    /* ⚠️ AN EMPTY LAYER LIST IS NOT THE PACKER'S BUSINESS, and assuming it was broke template saving
       the moment these four routes were merged. An ELEMENT with no layers is meaningless, so
       `elements.*` refuses it. A TEMPLATE with no layers is a legitimate blank starting point — a size,
       a duration, a background — and `templates.save` has always allowed it. Two tests caught it
       instantly. The refusal belongs to the caller that has an opinion, not to the shared step. */
    const layers = doc.layers || [];
    const pack = { layers: JSON.parse(JSON.stringify(layers)), media: {} };
    if (wantProject) {
      pack.project = JSON.parse(JSON.stringify(doc.project));
      /* A TEMPLATE MUST NOT CARRY THE NOTES (queue 214) — "I want each projects notes only for that
         project" — nor the came-from pointer (queue 408), which would make an update loop. Stripped
         here so both the save and the update route obey it; the update route used to inherit this only
         by going through save(), which is exactly the coupling this helper replaces. */
      delete pack.project.notes;
      delete pack.project.fromTemplate;
      /* …NOR THE EDITING SESSION'S OWN POINTERS (queue 505 clause 4). A template draft's doc carries
         `ofTemplate` and `returnTo` so Home knows where to write back and where to land. If they were
         packed, every project later made FROM that template would arrive believing it was a template
         edit, and coming Home would write the project back over the template. Stripped at the one
         place both save routes pass through. */
      delete pack.project.ofTemplate;
      delete pack.project.ofElement;
      delete pack.project.returnTo;
    }
    try {
      const db = await openDB();
      for (const l of pack.layers) {
        const mem = (id === curId()) ? FM.media.get(l.id) : null;
        if (mem && mem.file) pack.media[l.id] = { file: mem.file, kind: mem.kind };
        else { const rec = await idbGetMedia(db, l.id); if (rec && rec.file) pack.media[l.id] = { file: rec.file, kind: rec.kind }; }   // queue 915 phase A: a pack (template, element, backup) carries the FILE, never a pointer into this device's store
      }
      db.close();
    } catch (e) { return null; }
    return { pack: pack, srcId: id };
  }
  FM._packFromProject = packFromProject;   // seam: the suite drives the real packer, not a copy

  FM.templates = {
    list() { return readJSON(TPL_INDEX, []); },
    // Save a whole project (by id, default current) as a reusable template.
    async save(name, projectId) {
      const got = await packFromProject(projectId, true);   // wantProject: a template becomes a project
      if (!got) return false;
      const tid = newId('t');
      const pack = got.pack, id = got.srcId;
      /* ⚠️ queue 915 clause 2: idbPut RESOLVES FALSE, IT NEVER THROWS — so this try/catch could not see a
         refused write, and a template whose pack never landed got a card and a "Template saved". The
         same unread result sat in all seven pack writers below; each now stops before the index. */
      let put = false;
      try {
        const db = await openDB();
        put = await idbPut(db, 'tpl:' + tid, pack);
        db.close();
      } catch (e) { return false; }
      if (!put) return false;
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
        const db = await openDB(); const put = await idbPut(db, 'tpl:' + nid, pack); db.close();
        if (!put) throw new Error('pack refused');   // queue 915: no copy landed, so no card for one
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
      await this._adopt(pack, { name: FM.scene.project.name, notes: [], fromTemplate: tid });
      try { const idx = FM.projects.list(); const e = idx.find(x => x.id === pid); if (e) { e.fromTemplate = tid; FM.projects.saveIndex(idx); } } catch (e) {}
      if (FM.resizeCanvas) FM.resizeCanvas();
      if (FM.refreshAll) FM.refreshAll();
      if (FM.history) FM.history.reset();
      FM.storage.autosave();
      return pid;
    },
    /* PUT A TEMPLATE'S CONTENTS INTO THE OPEN DOCUMENT — the one step useAsNew and openForEdit share, so
       the two cannot drift (queue 505's own instruction: "do not hand-copy"). `extra` is what the caller
       needs on the project object AFTER the pack's project replaces it — the assign below throws away
       everything create() stamped, which is also why the clamp has to run again:
       CLAMP AGAIN, BECAUSE THIS LINE JUST THREW THE FIRST CLAMP AWAY (queue 470). `projects.create()`
       clamps the width/height it is handed — and then the assign replaces the whole project object with
       the pack's RAW one, so a template carrying 16000x16000 at 999fps landed in the live scene unclamped
       and autosave wrote it to disk. Measured, end to end. What that costs is in clampProjectDims' own
       note: ~1GB per canvas, an OOM crash on open, and — being the current project — again on every
       relaunch. A brick. */
    async _adopt(pack, extra) {
      const proj = JSON.parse(JSON.stringify(pack.project));
      // packs saved before v15.04 may carry a session's pointers; the way OUT strips them as the way in now does
      ['ofTemplate', 'ofElement', 'returnTo', 'fromTemplate'].forEach(k => { delete proj[k]; });
      FM.scene.project = Object.assign(proj, extra || {});
      clampProjectDims(FM.scene.project);
      const re = reIdLayers(pack.layers);
      FM.scene.layers = re.layers;
      await hydratePack(re.layers, pack.media, re.map);
    },
    /* ═══ OPEN A TEMPLATE FOR EDITING (queue 505 clause 4) — the shape `elements.openForEdit` settled on.
       Ezra, 1 Sep: "The element opens as its own document" — and his words were "Elements AND templates".
       Tapping a template card used to run useAsNew, which mints a real project you then have to save
       back by hand (and until v14.91 that save minted a NEW template). This opens the template's OWN
       workspace: one per template, reused on the next tap, hidden from Projects, carrying the template's
       id on the doc so coming Home (`commitDraft`) can write it back in place and put the workspace away.
       No insert step can fail here — the pack is fetched BEFORE the workspace is minted, so a missing
       pack returns null without stranding a draft (the trap queue 617 found in the element path). */
    async openForEdit(tid) {
      const meta = this.list().find(t => t.id === tid);
      if (!meta) return null;
      const pack = await this.getPack(tid);
      if (!pack) return null;
      const rev = meta.rev || 0;
      const existing = FM.projects.list().find(p => p.templateDraft && p.ofTemplate === tid);
      if (existing) {
        await FM.projects.open(existing.id);
        /* THE TEMPLATE MOVED ON WHILE THIS WORKSPACE SAT (review, 2 Sep): "Update template from project" on some
           other project bumps `rev`; a workspace built from the older pack would, on Home, write the OLD contents
           back over the NEW ones. Re-adopt the current pack instead — the workspace was stale by definition. */
        if ((FM.scene.project.ofTemplateRev || 0) !== rev) {
          await this._adopt(pack, Object.assign({ name: meta.name || 'Template', notes: [], ofTemplate: tid, ofTemplateRev: rev }, FM.scene.project.returnTo ? { returnTo: FM.scene.project.returnTo } : {}));
          if (FM.selectLayer) FM.selectLayer(null); FM.scene.selectedIds = [];
          if (FM.resizeCanvas) FM.resizeCanvas(); if (FM.refreshAll) FM.refreshAll(); if (FM.history) FM.history.reset();
          if (FM.storage) { FM.storage.markDirty(); await FM.storage.save(); }
        }
        return existing.id;
      }
      const returnTo = curId();
      const pid = await FM.projects.create({ name: meta.name || 'Template', width: pack.project.width, height: pack.project.height, templateDraft: true, ofTemplate: tid });
      if (!pid) return null;
      // the pack's project replaces the doc's, so the session's own pointers ride in as `extra`
      await this._adopt(pack, Object.assign({ name: meta.name || 'Template', notes: [], ofTemplate: tid, ofTemplateRev: rev }, returnTo ? { returnTo: returnTo } : {}));
      /* ⚠️ ARRIVE WITH NOTHING SELECTED — the element path's lesson ("it's just opening you having every
         layer selected"). Nothing here selects, but say it explicitly so a later change cannot. */
      if (FM.selectLayer) FM.selectLayer(null);
      FM.scene.selectedIds = [];
      if (FM.selectMode) FM.selectMode = false;
      if (FM.syncSelectionChrome) FM.syncSelectionChrome();
      if (FM.resizeCanvas) FM.resizeCanvas();
      if (FM.refreshAll) FM.refreshAll();
      if (FM.history) FM.history.reset();
      if (FM.storage) { FM.storage.markDirty(); await FM.storage.save(); }
      return pid;
    },
    /* SAVE THE EDIT BACK AND PUT THE WORKSPACE AWAY — `elements.commitDraft`'s order, for the same
       reasons written there: flush first; a template deleted mid-edit keeps the draft; a failed write
       keeps the draft; nowhere to land keeps the draft; and switch away BEFORE discarding, because
       discardDraft refuses to delete the document you are standing in. */
    async commitDraft() {
      const P = FM.scene && FM.scene.project;
      const tid = P && P.ofTemplate;
      if (!tid) return false;
      const pid = curId();
      if (!pid) return false;
      /* THE FLUSH MUST LAND (review, 2 Sep). writeScene returns false on quota or a stale rev; the old code ignored
         it and went on to pack the doc ON DISK — which, after a failed write, is an older or empty version — and
         write that over the template, then discard the draft that held his real edits. Keep the draft instead. */
      if (FM.storage && FM.storage.flushSync && !FM.storage.flushSync()) return false;
      if (!this.list().some(t => t.id === tid)) return false;
      /* AND AN EMPTY WORKSPACE NEVER REPLACES A TEMPLATE THAT HAS LAYERS. A blank template is legitimate, so
         updateFrom allows an empty pack; a workspace that is empty while the template is not is a stub (a crash
         before hydration finished) or a refusal above that something later bypassed — not an edit. */
      const live = (FM.scene.layers || []).length;
      if (!live) { const cur = await this.getPack(tid); if (cur && cur.layers && cur.layers.length) return false; }
      const ok = await this.updateFrom(tid, pid);
      if (!ok) return false;
      const list = FM.projects.list().filter(p => !p.elementDraft && !p.templateDraft && p.id !== pid);
      const back = (P.returnTo && list.some(p => p.id === P.returnTo)) ? P.returnTo : (list[0] && list[0].id);
      if (!back) return true;
      await FM.projects.open(back);
      await FM.projects.discardDraft(pid);
      return true;
    },
    /* WRITE A PROJECT BACK OVER THE TEMPLATE IT CAME FROM (queue 408 clause 2). Same shape as the preset
       round trip in queue 407, and the same judgement: ONE TAP rather than automatic. A template is a
       starting point other projects were built from; silently rewriting it whenever one of its children
       changed would be a change nobody asked for and nobody could see. It keeps the template's NAME and
       its place in the list — only the contents are replaced. */
    /* ═══ UPDATE A TEMPLATE IN PLACE (queue 505 clause 4) ═══════════════════════════════════════
     * This used to call `save()`, which MINTS A NEW ID, and then spend four compensations papering over
     * it: delete the old pack, re-splice the index so the card did not jump, rewrite every project's
     * `fromTemplate` pointer, and patch the live scene. Each of those is a window where a crash leaves
     * the library inconsistent — and it is the same mint-then-patch shape elements had before v12.26.
     * Same key, same index position, same id: only the contents, the layer count and the thumbnail
     * move. Nothing points anywhere new, so there is nothing to repoint.
     * Built on the shared packer above rather than copied from `elements.updateFrom`, which is what
     * this queue item explicitly asked for. */
    async updateFrom(tid, projectId) {
      const idx = this.list();
      const at = idx.findIndex(t => t.id === tid);
      if (at < 0) return false;                      // deleted while it was being edited — refuse BEFORE writing
      const got = await packFromProject(projectId, true);
      if (!got) return false;
      /* queue 915 clause 2: a refused write leaves the OLD pack in place, so reporting success here made
         commitDraft discard the workspace holding the only copy of the edit. False keeps the draft. */
      let put = false;
      try {
        const db = await openDB();
        put = await idbPut(db, 'tpl:' + tid, got.pack);    // SAME key — this is the update
        db.close();
      } catch (e) { return false; }
      if (!put) return false;
      /* The pack IS the template. If the index write fails the edit has still landed, so report success
         and leave the card's count/thumbnail stale — it self-heals on the next save. Returning false
         would make the caller keep a workspace for a template that is already up to date. */
      idx[at].count = got.pack.layers.length;
      // the card's own three numbers — templates.save writes them, so an in-place edit must too (review, 2 Sep)
      if (got.pack.project) { idx[at].width = got.pack.project.width; idx[at].height = got.pack.project.height; idx[at].duration = got.pack.project.duration; }
      idx[at].rev = (idx[at].rev || 0) + 1;   // a workspace built from an older pack re-adopts on reuse (openForEdit)
      const th = liveThumbOf(got.srcId) || (await FM.projects.getThumb(got.srcId));   // queue 915 clause 6 — see liveThumbOf
      if (th) idx[at].thumb = th;
      // MOST RECENTLY EDITED FIRST — the same rule the Elements list got in v12.27, and his words for it:
      // "the element is at the top of the element list because you just edited it".
      idx.unshift(idx.splice(at, 1)[0]);
      writeJSON(TPL_INDEX, idx);
      return true;
    },
    // Insert a template's layers INTO the current project at the playhead.
    async insertInto(tid) {
      /* queue 921 S0 (spec §8.9): bracketed as a JOB. Between the layers landing and their media
         arriving this scene is HALF-BUILT, and a collab diff taken in that window would send layers
         whose clips nobody else can resolve yet. FM.jobDepth() says "wait"; solo behaviour is
         unchanged, the counter is all that happens. */
      const job = FM.jobBegin('templates.insertInto');   // the token, so an overlapping job closes its own bracket (queue 921 S0 review)
      try {
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
      } finally { FM.jobEnd(job); }
    },
  };

  FM.elements = {
    list() { return readJSON(ELEM_INDEX, []); },
    // Save the given layers (the current selection) as a reusable element.
    async save(name, layers) {
      if (!layers || !layers.length) return false;
      const eid = newId('e');
      const pack = packLayers(layers);
      let put = false;   // queue 915 clause 2 — see templates.save
      try { const db = await openDB(); put = await idbPut(db, 'elem:' + eid, pack); db.close(); } catch (e) { return false; }
      if (!put) return false;
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
      const got = await packFromProject(projectId, false);  // an element is layers only — it is dropped INTO a project
      if (!got || !got.pack.layers.length) return false;    // an element with no layers is meaningless
      const eid = newId('e');
      const pack = got.pack, id = got.srcId;
      let put = false;   // queue 915 clause 2 — see templates.save
      try {
        const db = await openDB();
        put = await idbPut(db, 'elem:' + eid, pack);
        db.close();
      } catch (e) { return false; }
      if (!put) return false;
      const idx = this.list();
      idx.unshift({ id: eid, name: name, count: pack.layers.length, thumb: (await FM.projects.getThumb(id)) || (id === curId() ? makeThumb() : null) });
      if (!writeJSON(ELEM_INDEX, idx)) { try { const db2 = await openDB(); await idbDel(db2, 'elem:' + eid); db2.close(); } catch (e) {} return false; }   // see templates.save
      return true;
    },
    /* ═══ UPDATE AN ELEMENT IN PLACE (queue 505). Ezra, for the third time: "Elements and templates are
       still not working… I don't like that when you tap on them they created as a project. I just want
       them to be editable in their own sections… stop doing the lazy way out."
       MEASURED before this existed: editing an element and following the app's own instruction produced
       a SECOND element (1 became 2) and left the workspace project behind. There was no update path at
       all — both save routes call `newId('e')`, so an element could only ever be forked.
       Same pack key, same index position, same name: only the contents, the layer count and the
       thumbnail move. Deliberately NOT built like `templates.updateFrom`, which mints a new id and then
       spends four compensations papering over it (delete the old pack, re-splice the index so the card
       does not jump, rewrite every project's pointer, patch the live scene) — each of those is a window
       where a crash leaves the library inconsistent. */
    /* ═══ OPEN AN ELEMENT FOR EDITING (queue 505). One workspace per element, reused — without the
       lookup below, every tap minted another draft and they piled up forever (measured: projects 4→5
       on a single tap, and one left behind per edit). */
    async openForEdit(eid) {
      const meta = this.list().find(e => e.id === eid);
      if (!meta) return null;
      const existing = FM.projects.list().find(p => p.elementDraft && p.ofElement === eid);
      if (existing) { await FM.projects.open(existing.id); return existing.id; }
      const returnTo = curId();
      const pid = await FM.projects.create({ name: meta.name || 'Element', width: 1080, height: 1080, elementDraft: true, ofElement: eid });
      if (!pid) return null;
      FM.scene.project.background = null;              // transparent, like the element itself
      if (returnTo) FM.scene.project.returnTo = returnTo;   // where to land when he goes back
      const ok = await this.insert(eid);
      /* NOTHING TO EDIT — AND THIS LINE USED TO STRAND A DRAFT EVERY TIME, which is queue 617 clause 1.
         Its comment said "do not strand a draft" and it stranded one on every failed open, because
         `create()` ends with `await this.open(id)` — so the workspace it just minted IS the current
         project — and `discardDraft` REFUSES on the current project by design (`id === curId()`
         returns false). The cleanup called the one function that cannot run here.
         MEASURED (tests/_617drafts.html): openForEdit returned null and left `p_…` behind with its
         `ofElement` set. It strands one per element rather than one per tap — the second open matches
         that same stranded draft and reuses it — which is why the count creeps rather than explodes.
         Landing back on `returnTo` is deliberate: that is where he actually was, and it is what makes
         the ordinary `discardDraft` legal again. `discardDraftAnyway` (clause 4) is the fallback when
         there is nowhere named to return to; it picks a real project first and refuses only if this is
         the last project in existence. */
      if (!ok) {
        if (returnTo && returnTo !== pid) { await FM.projects.open(returnTo); await FM.projects.discardDraft(pid); }
        else await FM.projects.discardDraftAnyway(pid);
        return null;
      }
      /* ⚠️ ARRIVE WITH NOTHING SELECTED. Ezra: "it's just opening you having every layer selected".
         `insert()` selects what it just added, which is right when you are dropping an element INTO a
         project — you want to move the thing you added. It is wrong for an EDIT: you are opening a
         document, and no editor opens with everything selected. Measured before this: all three layers
         selected and the multi-select header up, so the first thing he saw was a bulk-edit bar. */
      if (FM.selectLayer) FM.selectLayer(null);
      FM.scene.selectedIds = [];
      if (FM.selectMode) FM.selectMode = false;
      if (FM.syncSelectionChrome) FM.syncSelectionChrome();
      if (FM.refreshAll) FM.refreshAll();
      if (FM.storage) { FM.storage.markDirty(); await FM.storage.save(); }
      return pid;
    },
    /* ═══ SAVE THE EDIT BACK AND PUT THE WORKSPACE AWAY (queue 505).
       ⚠️ THE ORDER IS THE WHOLE SAFETY ARGUMENT, and each step earns its place:
       1. no element id on the doc → this is not an element edit, do nothing;
       2. flush, so the pack is built from what he just saw rather than a doc up to 600ms stale;
       3. element deleted while he was editing → keep the draft; resurrecting it would be worse, and
          discarding it would throw the work away;
       4. write failed → keep the draft, for the same reason;
       5. pick somewhere to land, and if there is nowhere, STOP AND KEEP THE DRAFT — discarding here
          would leave the current-project pointer dangling, and the next boot mints "My project";
       6. switch away FIRST, then discard. `discardDraft` refuses to delete the current document, so
          doing these two in the other order simply leaves the draft behind. */
    async commitDraft() {
      const P = FM.scene && FM.scene.project;
      const eid = P && P.ofElement;
      if (!eid) return false;
      const pid = curId();
      if (!pid) return false;
      /* ⚠️ queue 825: THE FLUSH MUST LAND — the same rule the TEMPLATE twin above got on 2 Sep, and this
         copy never did. writeScene returns false on quota, on a stale rev and on a read-back mismatch; the
         old code threw that away and went on to pack the doc ON DISK, which after a failed write is an
         OLDER version, wrote it over the element, and then discarded the draft holding his real edits.
         Keep the draft instead: it is the only copy left. */
      if (FM.storage && FM.storage.flushSync && !FM.storage.flushSync()) return false;
      if (!this.list().some(e => e.id === eid)) return false;     // deleted mid-edit — keep the draft
      /* …AND AN EMPTY WORKSPACE NEVER REPLACES AN ELEMENT THAT HAS LAYERS (also from the twin). A blank
         element is legitimate, so updateFrom allows an empty pack; a workspace that is empty while the
         element is not is a stub — a crash before hydration finished — not an edit. */
      const liveLayers = (FM.scene.layers || []).length;
      if (!liveLayers) { const cur = await this.getPack(eid); if (cur && cur.layers && cur.layers.length) return false; }
      const ok = await this.updateFrom(eid, pid);
      if (!ok) return false;                                       // failed write — keep the draft
      const list = FM.projects.list().filter(p => !p.elementDraft && !p.templateDraft && p.id !== pid);   // a template workspace is not somewhere to land either
      const back = (P.returnTo && list.some(p => p.id === P.returnTo)) ? P.returnTo : (list[0] && list[0].id);
      if (!back) return true;                                      // nowhere to land — edit saved, draft kept
      await FM.projects.open(back);
      await FM.projects.discardDraft(pid);
      return true;
    },
    async updateFrom(eid, projectId) {
      const idx = this.list();
      const at = idx.findIndex(e => e.id === eid);
      if (at < 0) return false;                      // element deleted while it was being edited — refuse BEFORE writing anything
      const got = await packFromProject(projectId, false);
      if (!got || !got.pack.layers.length) return false;    // an element with no layers is meaningless
      const pack = got.pack, id = got.srcId;
      /* ⚠️ queue 915 clause 2: THIS IS THE ONE THAT LOST HIS EDIT. A refused write leaves the old pack in
         place; the unread result made this report success, commitDraft then deleted the workspace that
         held the only copy, and the card showed the new picture over the old element. */
      let put = false;
      try {
        const db = await openDB();
        put = await idbPut(db, 'elem:' + eid, pack);       // SAME key — this is the update
        db.close();
      } catch (e) { return false; }
      if (!put) return false;
      /* The pack is the element. If the index write fails the edit has still landed, so report success
         and leave the card's count/thumbnail stale — it self-heals on the next save. Returning false
         here would make the caller keep a draft for an element that is already up to date. */
      idx[at].count = pack.layers.length;
      const th = liveThumbOf(id) || (await FM.projects.getThumb(id));   // queue 915 clause 6 — see liveThumbOf
      if (th) idx[at].thumb = th;
      /* MOST RECENTLY EDITED FIRST. Ezra: "the element is at the top of the element list because you
         just edited it". The Projects tab has sorted this way for months; the Elements list kept its
         creation order, so the one you were working on a second ago could be anywhere. */
      idx.unshift(idx.splice(at, 1)[0]);
      writeJSON(ELEM_INDEX, idx);
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
        const db = await openDB(); const put = await idbPut(db, 'elem:' + nid, pack); db.close();
        if (!put) throw new Error('pack refused');   // queue 915: no copy landed, so no card for one
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
      const job = FM.jobBegin('elements.insert');   // queue 921 S0: same half-built window as templates.insertInto above
      try {
      let pack = null;
      try { const db = await openDB(); pack = await idbGet(db, 'elem:' + eid); db.close(); } catch (e) {}
      if (!pack) return false;
      const re = reIdLayers(pack.layers);
      // ONE CAMERA PER SCENE, here too (queue 732, hunt MEDIUM #15). templates.insertInto has had this guard since queue 617; an element
      // pack can carry a camera as well, and this path put the element's layers FIRST, so its camera was the one the composite found.
      if (FM.scene.layers.some(l => l.type === 'camera')) re.layers = re.layers.filter(l => l.type !== 'camera');
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
      } finally { FM.jobEnd(job); }
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
    try { const ff = new FontFace(family, await file.arrayBuffer()); await ff.load(); document.fonts.add(ff);
      FM.fonts.faceLoaded();
      return true; }
    catch (e) { return false; }
  }

  FM.fonts = {
    /* EVERY LINE BREAK MEASURED BEFORE A FACE ARRIVES WAS MEASURED IN THE FALLBACK FONT, and
     * FM.textLines caches wraps under a key built from ctx.font — which is the SAME STRING before and
     * after the real face loads. Only measureText changes, so the key could not tell the two apart and
     * the fallback's line breaks were served for the rest of the session, in the preview AND in the
     * export. rehydrateAll has always called requestRender() here with a comment saying "so canvas
     * text reflows"; the re-render fired and the cache handed it back the same wrong lines, which is
     * the shape this whole queue keeps turning up — a guard that reads as protection and cannot fire.
     * Bumping a generation is enough: it is part of the wrap key, so every cached wrap in the project
     * is invalidated at once without walking the layers. Called from registerFace, the single place a
     * face actually becomes available, rather than from each of its callers. (#686) */
    faceLoaded() {
      FM.fontGen = (FM.fontGen || 0) + 1;
      if (FM.requestRender) FM.requestRender();
      return FM.fontGen;
    },
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
      /* queue 915 clause 2: the font file is the font. Unread, a refused write still said "added" and
         listed it — and after a reload its text fell back to the default face with nothing to explain it. */
      let put = false;
      try { const db = await openDB(); put = await idbPut(db, 'font:' + id, { file: file }); db.close(); } catch (e) {}
      if (!put) {
        _fontReg.delete(id);
        if (FM.toast) FM.toast('Storage is full — that font could not be saved');
        return null;
      }
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
        let put = false;   // queue 915 clause 2: registered for this session either way, but only a stored font is listed
        try { const db = await openDB(); put = await idbPut(db, 'font:' + nid, { file: file }); db.close(); } catch (e) {}
        if (!put) { _fontReg.delete(nid); continue; }
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
