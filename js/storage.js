/* FreeMotion — Project persistence (autosave).
 * Scene document → localStorage; media file blobs → IndexedDB (keyed by layer id).
 * Restored on load so reloads don't lose the user's work. All wrapped in try/catch so a
 * storage failure never breaks the editor.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const DB_NAME = 'freemotion', STORE = 'media', SCENE_KEY = 'fm.scene';
  let saveTimer = null;

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
  function idbPut(db, key, val) { return new Promise((res) => { try { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(val, key); tx.oncomplete = () => res(); tx.onerror = () => res(); } catch (e) { res(); } }); }
  function idbDel(db, key) { return new Promise((res) => { try { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = () => res(); tx.onerror = () => res(); } catch (e) { res(); } }); }
  function idbKeys(db) { return new Promise((res) => { try { const rq = db.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys(); rq.onsuccess = () => res(rq.result || []); rq.onerror = () => res([]); } catch (e) { res([]); } }); }

  FM.storage = {
    async save() {
      try { localStorage.setItem(SCENE_KEY, JSON.stringify(sceneDoc())); _quotaWarned = false; }
      catch (e) { warnQuota(e); }   // a quota failure shouldn't block the IDB media save below
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
        // prune blobs for layers no longer in the scene (deleted/split-replaced) so IDB doesn't grow unbounded
        const ids = new Set(FM.scene.layers.map(l => l.id));
        for (const k of await idbKeys(db)) { if (!ids.has(k)) await idbDel(db, k); }
        db.close();
      } catch (e) { /* storage unavailable — ignore */ }
    },

    // Synchronous best-effort scene write for page unload (the 600ms debounce can't run there).
    flushSync() { try { clearTimeout(saveTimer); localStorage.setItem(SCENE_KEY, JSON.stringify(sceneDoc())); } catch (e) { warnQuota(e); } },

    async removeMedia(id) { try { const db = await openDB(); await idbDel(db, id); db.close(); } catch (e) {} },

    autosave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => FM.storage.save(), 600); },

    async load() {
      let scene = null;
      try { const raw = localStorage.getItem(SCENE_KEY); if (raw) scene = JSON.parse(raw); } catch (e) {}
      if (!scene || !scene.project) return false;   // accept a 0-layer project so canvas settings (name/size/fps/bg) survive a reload
      FM.scene.project = scene.project;
      FM.scene.layers = Array.isArray(scene.layers) ? scene.layers : [];
      FM.scene.selectedId = scene.selectedId;
      // Restore the full multi-selection (filtered to layers that still exist), not just one. (#20)
      const liveIds = new Set(FM.scene.layers.map(l => l.id));
      FM.scene.selectedIds = (Array.isArray(scene.selectedIds) ? scene.selectedIds : (scene.selectedId ? [scene.selectedId] : [])).filter(id => liveIds.has(id));
      try {
        const db = await openDB();
        for (const layer of FM.scene.layers) {
          if (layer.type === 'text') continue;
          const rec = await idbGet(db, layer.id);
          if (rec && rec.file) {
            const loaded = rec.kind === 'video' ? await FM.loadVideoFile(rec.file) : await FM.loadImageFile(rec.file);
            FM.media.set(layer.id, loaded);
            if (loaded.kind === 'video') loaded.el.addEventListener('seeked', () => { if (!FM.playing && FM.requestRender) FM.requestRender(); });
          }
        }
        db.close();
      } catch (e) { /* media restore failed — scene structure still loads */ }
      if (FM.resizeCanvas) FM.resizeCanvas();
      if (FM.refreshAll) FM.refreshAll();
      if (FM.seekVideosToTime) FM.seekVideosToTime();
      // reversed / frame-blend-slow clips render from the frame cache — rebuild it so they don't
      // show forward-direction frames when scrubbing before the first play.
      FM.scene.layers.forEach(l => { if (l.type === 'video' && (l.reversed || (l.frameBlend && (l.speed || 1) < 1)) && FM.ensureReverseCache) FM.ensureReverseCache(l); });
      return true;
    },

    async clear() { try { localStorage.removeItem(SCENE_KEY); const db = await openDB(); db.transaction(STORE, 'readwrite').objectStore(STORE).clear(); db.close(); } catch (e) {} },
  };

  // ---- portable project file (.fmotion.json): scene graph + small media as base64 ----
  function fileToDataURL(file) { return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(file); }); }
  // ONLY rehydrate real data: URIs. An imported .fmotion.json is untrusted input; a non-data URL here
  // (e.g. https://attacker/beacon) would otherwise be fetch()ed on open — a zero-click tracking beacon /
  // LAN probe. Reject anything that isn't an embedded data URL.
  async function dataURLToFile(dataURL, name) { if (typeof dataURL !== 'string' || !/^data:/i.test(dataURL)) return null; const blob = await (await fetch(dataURL)).blob(); return new File([blob], name || 'media', { type: blob.type }); }
  const EMBED_LIMIT = 6 * 1024 * 1024;   // skip embedding media larger than this (keeps the JSON sane)

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
    return { app: 'freemotion', v: 1, project: scene.project, layers: scene.layers, selectedId: scene.selectedId, selectedIds: scene.selectedIds, media: media };
  };

  FM.storage.applyScene = async function (obj) {
    if (!obj || !obj.project || !Array.isArray(obj.layers)) return false;
    // Drop any stale media for incoming layer ids first — in BOTH the in-memory registry AND
    // IndexedDB. uid() resets its counter on reload, so an opened project's layer id CAN collide
    // with a leftover autosave blob; without clearing IDB too, a non-embedded (large) layer would
    // attach the WRONG clip on the next reload. Embedded media is rehydrated below; the rest load
    // empty (relink via Replace media…).
    for (const l of obj.layers) {
      if (l.type === 'video' || l.type === 'image') {
        if (FM.media.get(l.id)) FM.media.remove(l.id);
        if (FM.storage.removeMedia) { try { await FM.storage.removeMedia(l.id); } catch (e) {} }
      }
    }
    FM.scene.project = obj.project;
    FM.scene.layers = obj.layers;
    FM.scene.selectedId = obj.selectedId || (obj.layers[0] ? obj.layers[0].id : null);
    const liveIds = new Set(obj.layers.map(l => l.id));   // restore the saved multi-selection (#20)
    FM.scene.selectedIds = (Array.isArray(obj.selectedIds) ? obj.selectedIds : (FM.scene.selectedId ? [FM.scene.selectedId] : [])).filter(id => liveIds.has(id));
    if (obj.media) {
      for (const id of Object.keys(obj.media)) {
        const md = obj.media[id];
        if (!md || (md.kind !== 'video' && md.kind !== 'image')) continue;
        try {
          const file = await dataURLToFile(md.dataURL, md.name);
          if (!file) continue;   // non-data: URL was rejected → layer loads media-less (relink via Replace media…)
          const rec = md.kind === 'video' ? await FM.loadVideoFile(file) : await FM.loadImageFile(file);
          if (rec) { FM.media.set(id, rec); if (rec.kind === 'video' && rec.el) rec.el.addEventListener('seeked', () => { if (!FM.playing && FM.requestRender) FM.requestRender(); }); }
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
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name + '.fmotion.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (FM.toast) FM.toast('Project file saved');
  };

  FM.storage.importFile = function () {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0]; input.remove();
      if (!file) return;
      try {
        const obj = JSON.parse(await file.text());
        if (obj.app !== 'freemotion') { if (FM.toast) FM.toast('Not a FreeMotion project file'); return; }
        const ok = await FM.storage.applyScene(obj);
        if (ok) { if (FM.history) FM.history.reset(); FM.storage.save(); if (FM.toast) FM.toast('Project loaded'); }
      } catch (e) { if (FM.toast) FM.toast('Could not read that project file'); }
    });
    document.body.appendChild(input); input.click();
  };

  // Flush the pending (debounced) save when the tab is hidden/closed so the last edit isn't lost.
  window.addEventListener('pagehide', () => { if (FM.scene) FM.storage.flushSync(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && FM.scene) FM.storage.flushSync(); });
})(window.FM);
