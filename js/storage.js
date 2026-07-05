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
  function newId(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function readJSON(key, def) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; } catch (e) { return def; } }
  function writeJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { warnQuota(e); return false; } }
  function curId() {
    let id = null;
    try { id = localStorage.getItem(CUR_KEY); } catch (e) {}
    return id;
  }
  function curKey() { return 'fm.proj.' + (curId() || 'default'); }

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
      try { localStorage.setItem(curKey(), JSON.stringify(sceneDoc(), FM.jsonReplacer)); _quotaWarned = false; }
      catch (e) { warnQuota(e); }   // a quota failure shouldn't block the IDB media save below
      if (FM.projects) FM.projects.touchCurrent();
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
    flushSync() { try { clearTimeout(saveTimer); localStorage.setItem(curKey(), JSON.stringify(sceneDoc(), FM.jsonReplacer)); } catch (e) { warnQuota(e); } },

    async removeMedia(id) { try { const db = await openDB(); await idbDel(db, id); db.close(); } catch (e) {} },

    autosave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => FM.storage.save(), 600); },

    async load() {
      if (FM.projects) FM.projects.migrate();   // legacy single-project fm.scene → indexed project (one-time)
      let scene = readJSON(curKey(), null);
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

    // Reset the CURRENT project only (blank doc + drop its media blobs). Never .clear() the whole
    // IDB store — it also holds every OTHER project's media plus template/element packs.
    async clear() {
      try {
        const doc = readJSON(curKey(), null);
        const db = await openDB();
        if (doc && Array.isArray(doc.layers)) for (const l of doc.layers) await idbDel(db, l.id);
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
    // Re-id EVERY imported layer. An exported file carries the ids of the project it came from —
    // reusing them would collide with that project in the SHARED IDB media store (the old
    // "drop stale media" loop here actively deleted the other project's blobs). Fresh ids need
    // no clearing at all; embedded media is rehydrated under the new ids below.
    const re = reIdLayers(obj.layers);
    FM.scene.project = obj.project;
    FM.scene.layers = re.layers;
    FM.scene.selectedId = (obj.selectedId && re.map[obj.selectedId]) || (re.layers[0] ? re.layers[0].id : null);
    FM.scene.selectedIds = (Array.isArray(obj.selectedIds) ? obj.selectedIds : []).map(id => re.map[id]).filter(Boolean);
    if (!FM.scene.selectedIds.length && FM.scene.selectedId) FM.scene.selectedIds = [FM.scene.selectedId];
    if (obj.media) {
      for (const id of Object.keys(obj.media)) {
        const md = obj.media[id], nid = re.map[id];
        if (!nid || !md || (md.kind !== 'video' && md.kind !== 'image')) continue;
        try {
          const file = await dataURLToFile(md.dataURL, md.name);
          if (!file) continue;   // non-data: URL was rejected → layer loads media-less (relink via Replace media…)
          const rec = md.kind === 'video' ? await FM.loadVideoFile(file) : await FM.loadImageFile(file);
          if (rec) { FM.media.set(nid, rec); if (rec.kind === 'video' && rec.el) rec.el.addEventListener('seeked', () => { if (!FM.playing && FM.requestRender) FM.requestRender(); }); }
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

  FM.storage.importFile = function () {
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
        if (ok) { if (FM.history) FM.history.reset(); FM.storage.save(); if (FM.projects) FM.projects.touchCurrent(true); if (FM.toast) FM.toast('Project imported'); }
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
  function reIdLayers(layers) {
    const map = {};
    const out = JSON.parse(JSON.stringify(layers, FM.jsonReplacer));
    out.forEach(l => { map[l.id] = newId('l'); l.id = map[l.id]; });
    out.forEach(l => { if (l.parent) l.parent = map[l.parent] || null; });
    return { layers: out, map };
  }
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
        if (db) await idbPut(db, newLayerId, { file: md.file, kind: md.kind });
      } catch (e) { /* that layer loads media-less */ }
    }
    if (db) db.close();
    FM._mediaBusy = Math.max(0, (FM._mediaBusy || 1) - 1);
  }
  // Small poster frame of the current scene for home-screen cards.
  function makeThumb() {
    try {
      const P = FM.scene.project;
      const full = document.createElement('canvas'); full.width = P.width; full.height = P.height;
      FM.renderScene(full.getContext('2d'), FM.scene, FM.time);
      const s = Math.min(180 / P.width, 180 / P.height);
      const c = document.createElement('canvas');
      c.width = Math.max(2, Math.round(P.width * s)); c.height = Math.max(2, Math.round(P.height * s));
      c.getContext('2d').drawImage(full, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.6);
    } catch (e) { return null; }
  }

  FM.projects = {
    list() { return readJSON(PROJ_INDEX, []); },
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
          idx.unshift({ id: id, name: doc.project.name || 'My project', modified: Date.now(), width: doc.project.width, height: doc.project.height, duration: doc.project.duration, layers: (doc.layers || []).length, thumb: null });
          this.saveIndex(idx);
          return;
        }
      }
      const legacy = readJSON(SCENE_KEY, null);
      id = newId('p');
      try { localStorage.setItem(CUR_KEY, id); } catch (e) {}
      if (legacy && legacy.project) {
        writeJSON('fm.proj.' + id, legacy);
        idx.unshift({ id: id, name: legacy.project.name || 'My project', modified: Date.now(), width: legacy.project.width, height: legacy.project.height, duration: legacy.project.duration, layers: (legacy.layers || []).length, thumb: null });
        try { localStorage.removeItem(SCENE_KEY); } catch (e) {}
      } else {
        idx.unshift({ id: id, name: 'My project', modified: Date.now(), width: 1080, height: 1920, duration: 0, thumb: null });
      }
      this.saveIndex(idx);
    },
    // Keep the index card for the current project fresh (called from every autosave — cheap; the
    // thumbnail re-render is throttled and skipped mid-playback).
    touchCurrent(forceThumb) {
      const id = curId(); if (!id) return;
      const idx = this.list();
      const e = idx.find(p => p.id === id); if (!e) return;
      const P = FM.scene.project;
      e.name = P.name || 'Untitled'; e.modified = Date.now();
      e.width = P.width; e.height = P.height; e.duration = P.duration;
      e.layers = FM.scene.layers.length;
      const now = Date.now();
      if (forceThumb || (now - thumbTimer > 12000 && !FM.playing)) { thumbTimer = now; const t = makeThumb(); if (t) e.thumb = t; }
      this.saveIndex(idx);
    },
    // Switch the editor to another project (stash current first).
    async open(id) {
      if (id === curId()) return true;
      if (FM.tracker && FM.tracker.isPicking && FM.tracker.isPicking()) FM.tracker.cancel();   // drop any tracking overlay from the outgoing project
      if (FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive()) FM.pointEdit.stop();
      if (FM.cropTool && FM.cropTool.isActive && FM.cropTool.isActive()) FM.cropTool.stop();
      if (FM.pause) FM.pause(); else FM.playing = false;   // stop WebAudio + <video> sound, not just the flag (#r4)
      if (FM.groupContext && FM.exitGroup) FM.exitGroup(true);   // the group view belongs to the outgoing project
      FM.storage.flushSync(); this.touchCurrent(true);
      // drop the outgoing project's media from the in-memory registry (blobs stay in IDB)
      FM.scene.layers.forEach(l => { if (FM.media.get(l.id)) FM.media.remove(l.id); });
      try { localStorage.setItem(CUR_KEY, id); } catch (e) {}
      FM.scene.selectedId = null; FM.scene.selectedIds = []; FM.scene.layers = []; FM.time = 0;
      const ok = await FM.storage.load();
      if (!ok) { FM.scene.project = Object.assign(FM.newScene().project, { name: (this.list().find(p => p.id === id) || {}).name || 'Untitled' }); if (FM.refreshAll) FM.refreshAll(); }
      if (FM.selectLayer) FM.selectLayer(null);
      if (FM.history) FM.history.reset();
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
      writeJSON('fm.proj.' + id, { project: fresh.project, layers: [], selectedId: null, selectedIds: [] });
      const idx = this.list();
      idx.unshift({ id: id, name: fresh.project.name, modified: Date.now(), width: fresh.project.width, height: fresh.project.height, duration: fresh.project.duration, thumb: null });
      this.saveIndex(idx);
      await this.open(id);
      return id;
    },
    async duplicate(id) {
      const doc = readJSON('fm.proj.' + id, null); if (!doc) return;
      FM._mediaBusy = (FM._mediaBusy || 0) + 1;
      const src = this.list().find(p => p.id === id) || {};
      const re = reIdLayers(doc.layers || []);
      const nid = newId('p');
      writeJSON('fm.proj.' + nid, { project: JSON.parse(JSON.stringify(doc.project)), layers: re.layers, selectedId: null, selectedIds: [] });
      // duplicate the media blobs under the new layer ids so the copy survives deleting the original
      try {
        const db = await openDB();
        for (const oldId of Object.keys(re.map)) {
          const rec = await idbGet(db, oldId);
          if (rec) await idbPut(db, re.map[oldId], rec);
        }
        db.close();
      } catch (e) {}
      const idx = this.list();
      idx.unshift(Object.assign({}, src, { id: nid, name: (src.name || 'Project') + ' copy', modified: Date.now(), layers: re.layers.length }));
      this.saveIndex(idx);
      FM._mediaBusy = Math.max(0, (FM._mediaBusy || 1) - 1);
    },
    rename(id, name) {
      const idx = this.list(); const e = idx.find(p => p.id === id); if (!e) return;
      e.name = name; this.saveIndex(idx);
      const doc = readJSON('fm.proj.' + id, null);
      if (doc && doc.project) { doc.project.name = name; writeJSON('fm.proj.' + id, doc); }
      if (id === curId()) { FM.scene.project.name = name; if (FM.refreshAll) FM.refreshAll(); }
    },
    async remove(id) {
      const doc = readJSON('fm.proj.' + id, null);
      try {
        const db = await openDB();
        if (doc && Array.isArray(doc.layers)) for (const l of doc.layers) await idbDel(db, l.id);
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
        const collectKeep = () => {
          const keep = new Set();
          this.list().forEach(p => { const d = readJSON('fm.proj.' + p.id, null); if (d && d.layers) d.layers.forEach(l => keep.add(l.id)); });
          FM.scene.layers.forEach(l => keep.add(l.id));
          return keep;
        };
        const keep = collectKeep();
        const db = await openDB();
        const candidates = [];
        for (const k of await idbKeys(db)) {
          if (typeof k === 'string' && (k.indexOf('tpl:') === 0 || k.indexOf('elem:') === 0)) continue;
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
      const card = this.cardFor(id);
      idx.unshift({ id: tid, name: name, width: pack.project.width, height: pack.project.height, duration: pack.project.duration, thumb: card });
      writeJSON(TPL_INDEX, idx);
      return true;
    },
    cardFor(projectId) { const e = FM.projects.list().find(p => p.id === projectId); return (e && e.thumb) || (projectId === curId() ? makeThumb() : null); },
    async getPack(tid) { try { const db = await openDB(); const p = await idbGet(db, 'tpl:' + tid); db.close(); return p; } catch (e) { return null; } },
    async remove(tid) {
      writeJSON(TPL_INDEX, this.list().filter(t => t.id !== tid));
      try { const db = await openDB(); await idbDel(db, 'tpl:' + tid); db.close(); } catch (e) {}
    },
    // Start a brand-new project from a template.
    async useAsNew(tid) {
      const pack = await this.getPack(tid); if (!pack) return false;
      const meta = this.list().find(t => t.id === tid) || {};
      const pid = await FM.projects.create({ name: (meta.name || 'Template') + ' project', width: pack.project.width, height: pack.project.height });
      FM.scene.project = Object.assign(JSON.parse(JSON.stringify(pack.project)), { name: FM.scene.project.name });
      const re = reIdLayers(pack.layers);
      FM.scene.layers = re.layers;
      await hydratePack(re.layers, pack.media, re.map);
      if (FM.resizeCanvas) FM.resizeCanvas();
      if (FM.refreshAll) FM.refreshAll();
      if (FM.history) FM.history.reset();
      FM.storage.autosave();
      return pid;
    },
    // Insert a template's layers INTO the current project at the playhead.
    async insertInto(tid) {
      const pack = await this.getPack(tid); if (!pack) return false;
      const re = reIdLayers(pack.layers);
      const t0 = Math.min.apply(null, re.layers.length ? re.layers.map(l => l.start || 0) : [0]);
      re.layers.forEach(l => { l.start = (l.start || 0) - t0 + FM.time; });
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
      idx.unshift({ id: eid, name: name, count: layers.length });
      writeJSON(ELEM_INDEX, idx);
      return true;
    },
    async remove(eid) {
      writeJSON(ELEM_INDEX, this.list().filter(t => t.id !== eid));
      try { const db = await openDB(); await idbDel(db, 'elem:' + eid); db.close(); } catch (e) {}
    },
    // Insert an element's layers into the current project at the playhead.
    async insert(eid) {
      let pack = null;
      try { const db = await openDB(); pack = await idbGet(db, 'elem:' + eid); db.close(); } catch (e) {}
      if (!pack) return false;
      const re = reIdLayers(pack.layers);
      const t0 = Math.min.apply(null, re.layers.length ? re.layers.map(l => l.start || 0) : [0]);
      re.layers.forEach(l => { l.start = (l.start || 0) - t0 + FM.time; });
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

  // Flush the pending (debounced) save when the tab is hidden/closed so the last edit isn't lost.
  window.addEventListener('pagehide', () => { if (FM.scene) FM.storage.flushSync(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && FM.scene) FM.storage.flushSync(); });
})(window.FM);
