/* FreeMotion — the Tier-3 test agent (queue 921 S2, spec §25.3).
 *
 * TEST-ONLY. `js/collab-core.js` loads it, and only when the page is on loopback AND carries
 * `fmtest=collab`. GitHub Pages satisfies neither, so this cannot reach a phone.
 *
 * WHY IT EXISTS. Tier 3 is three REAL app instances — separate origins, so separate localStorage,
 * IndexedDB and Web Locks with no storage code changed — talking to each other through a switchboard
 * in the test frame. The test is on a different origin from every instance, so it cannot touch their
 * documents directly. It drives them by RPC instead, through a FIXED ACTION TABLE: there is no
 * `eval`, no arbitrary property write, and nothing here can reach a piece of the app the table does
 * not name. That is deliberate — a test agent that could run anything is a test agent whose result
 * proves whatever it was told to prove.
 *
 * RPC:  parent → frame  {fmRpc:id, act, args}
 *       frame → parent  {fmRpc:id, ok:true, val} | {fmRpc:id, ok:false, err}
 */
(function (FM) {
  'use strict';
  if (!FM || !FM.collab) return;
  const C = FM.collab;

  function param(k) {
    const m = new RegExp('[?&]' + k + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }
  const TAG = param('tag') || 'x';
  C._agentTag = TAG;

  function post(msg) { try { window.parent.postMessage(msg, '*'); } catch (e) {} }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ── links ────────────────────────────────────────────────────────────────────────────────────
   * Every instance reaches every other through the switchboard, so a link is just a PostLink whose
   * `target` is the parent window. The host side has to be able to accept a peer it has never heard
   * of — see the greeter below. */
  const links = Object.create(null);           // peerTag -> endpoint
  /* ⚠️ A CLOSED ENDPOINT IS NOT A LINK. `Session.stop()` closes every endpoint it holds, which removes
     the PostLink's own message listener — so a cache that handed the same object back after a session
     ended produced a link that looked connected and delivered nothing, and the next join simply timed
     out with no error anywhere. */
  function linkTo(peer) {
    if (links[peer] && links[peer].open) return links[peer];
    links[peer] = C.link.PostLink({ self: TAG, peer: peer, target: window.parent, origin: '*' });
    return links[peer];
  }

  /* THE GREETER. A guest's very first message arrives before the host has any endpoint for it, so
     something has to be listening that is not a link. It creates the link, registers the peer with
     the session, and hands that FIRST message straight on — the PostLink's own listener was added
     during this same dispatch, so the DOM will not deliver the event to it as well. */
  window.addEventListener('message', function (e) {
    const d = e && e.data;
    if (!d || d.fmLink !== 1 || d.to !== TAG) return;
    if (links[d.from] && links[d.from].open) return;     // its own listener will deliver this
    const S = C.session;
    if (!S || !S.isOwner) return;
    const ep = linkTo(d.from);
    const mid = S.addPeer(ep, { role: 'editor', name: d.from, color: '#4488ff' });
    ep._mid = mid;
    if (typeof ep.onmessage === 'function') ep.onmessage(d.ch, d.data, ep);
  });

  /* ── the fixed action table ─────────────────────────────────────────────────────────────────── */
  const ACTS = {
    /* Wait until the app has finished booting: FM.scene populated and storage settled. */
    ready: async function () {
      for (let i = 0; i < 200; i++) {
        if (FM.scene && FM.scene.project && FM.storage && FM.projects && FM.projects.currentId()) break;
        await sleep(100);
      }
      return { tag: TAG, pid: FM.projects.currentId(), phone: !!(FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone()), w: window.innerWidth };
    },
    state: function () {
      const S = C.session;
      return {
        tag: TAG, pid: FM.projects.currentId(), active: C.active, role: C.role,
        layers: (FM.scene.layers || []).map(function (l) { return l.id; }),
        names: (FM.scene.layers || []).map(function (l) { return l.name; }),
        selected: FM.scene.selectedId,
        hash: S ? S.hash() : null, baseHash: S ? S.baseHash() : null,
        mid: S ? S.mid : null, bs: S ? S.bs : null, online: S ? S.online : null,
        pending: S ? Object.keys(S._pending()).length : 0,
        outstanding: S ? S._outstanding().length : null   /* null, NOT 0, when there is no session (queue 921): a test waiting for "outstanding === 0" otherwise reads a DEAD session as "all caught up" — which is exactly how a session killed at boot passed for finished */,
        held: S ? S._held().length : 0,
        stats: S ? S.stats : null,
        clashes: S ? (S.clashes || 0) : 0,
        canUndo: S ? S.canUndo() : null,
        undoDepth: S ? S._undoDepth() : null,
        reports: S ? S.reports.length : 0
      };
    },
    hash: function () { return C.session ? C.session.hash() : null; },
    doc: function () {
      const v = C.bridge.view();
      return { project: v.project, layers: v.layers };
    },
    /* Every fm.proj.* document as its raw string, so "byte-identical" means byte-identical (§24). */
    projects: function () {
      const out = { index: localStorage.getItem('fm.projects'), cur: localStorage.getItem('fm.currentProject'), docs: {} };
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('fm.proj.') === 0) out.docs[k] = localStorage.getItem(k);
      }
      return out;
    },
    idbDump: async function () {
      const out = {};
      try {
        const req = indexedDB.open('freemotion');
        const db = await new Promise(function (res, rej) { req.onsuccess = function () { res(req.result); }; req.onerror = function () { rej(req.error); }; });
        const names = Array.prototype.slice.call(db.objectStoreNames);
        for (let i = 0; i < names.length; i++) {
          const tx = db.transaction(names[i], 'readonly');
          const keys = await new Promise(function (res) { const r = tx.objectStore(names[i]).getAllKeys(); r.onsuccess = function () { res(r.result); }; r.onerror = function () { res([]); }; });
          out[names[i]] = keys.map(String).sort();
        }
        db.close();
      } catch (e) { out._err = String(e); }
      return out;
    },
    /* A clean document to start a test group from. Built through FM.makeLayer, because a hand-written
       layer literal with no `transform` takes the timeline rebuild down inside applyScene. */
    setScene: async function (a) {
      const names = (a && a.names) || ['Alpha', 'Beta', 'Gamma'];
      const layers = names.map(function (n, i) { return FM.makeLayer('shape', { name: n, start: i, duration: 3 }); });
      await FM.storage.applyScene({
        project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000000', name: (a && a.name) || 'T3' },
        layers: layers, selectedId: null, selectedIds: []
      });
      FM.history.reset();
      FM.selectLayer(null);
      FM.storage.flushSync();
      return FM.scene.layers.map(function (l) { return l.id; });
    },
    /* §24's IndexedDB comparison needs a record of HIS to compare. `setScene` builds shape layers and
       shapes write no media at all, so `idbDump().media` was empty or near-empty and "not one byte of
       his own data moves" was an assertion that could not fail whatever a join did. A FIXED key, so a
       second run of the suite overwrites this one record instead of adding another (queue 921). */
    /* The record must belong to a REAL layer of this instance's own project (queue 921). Written under a made-up
       key it is an orphan by construction, and pruneOrphans deleting it is the app working correctly — measured:
       the "not one byte of his own data moves" test passed alone and failed in suite order, purely on whether a
       sweep happened to run. A record hung off his own layer is the thing the test means to watch. */
    seedMedia: async function (a) {
      let L = FM.scene.layers[0];
      if (!L) { FM.addShapeLayer('rect'); L = FM.scene.layers[0]; if (FM.history) FM.history.commit(); }
      if (!L) return null;
      const key = (a && a.key) || L.id;
      const ok = await FM.storage.writeMedia(key, { file: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }), kind: 'image' });
      try { FM.storage.flushSync(); } catch (e) {}
      return ok ? key : null;
    },
    flush: function () { FM.storage.flushSync(); return true; },
    persist: function () { return C.session ? C.session.persist() : false; },
    /* §12.4: come back after a reload with a link and work out what is still owed. */
    rejoin: async function (a) {
      const r = await C.reopen({ link: linkTo((a && a.host) || 'h'), role: 'editor', mid: (a && a.mid) || 'g', autoTick: false });
      return r ? { owed: r.owed, gpid: r.gpid, bs: r.session.bs } : null;
    },
    select: function (a) { FM.selectLayer(a && a.id != null ? a.id : a); return FM.scene.selectedId; },
    /* A real edit: write the property and commit, which is what every inspector control does. The
       commit is the seam collab hangs off, so this exercises the whole §9 path. */
    setProp: function (a) {
      const l = (FM.scene.layers || []).filter(function (x) { return x.id === a.id; })[0];
      if (!l) throw new Error('no layer ' + a.id);
      l[a.key] = a.value;
      FM.history.commit();
      return l[a.key];
    },
    commit: function () { FM.history.commit(); return true; },
    undo: function () { FM.history.undo(); return true; },
    redo: function () { FM.history.redo(); return true; },
    addLayer: function (a) {
      const L = FM.makeLayer((a && a.type) || 'shape', { name: (a && a.name) || 'New', start: 0, duration: 3 });
      if (a && a.id) L.id = a.id;
      FM.insertLayer(L);
      FM.history.commit();
      return L.id;
    },
    deleteLayer: function (a) { FM.deleteLayer(a && a.id != null ? a.id : a); FM.history.commit(); return true; },
    tick: function (a) { return C.session ? C.session.tick((a && a.scope) || 'hot') : 0; },
    /* §12.1: arm. No signalling in S2 — the switchboard is the rendezvous. */
    share: function (a) {
      const S = C.share({ ownerInfo: { name: (a && a.name) || TAG, color: '#ff8800' }, autoTick: false });
      return { mid: S.mid, epoch: S.epoch, tidied: S.tidied };
    },
    /* §12.2: join. `onConflict` picks between refuse / replace / keepFirst. */
    join: async function (a) {
      const r = await C.join({ link: linkTo((a && a.host) || 'h'), role: (a && a.role) || 'editor', name: TAG, onConflict: a && a.onConflict, autoTick: false });
      return { gpid: r.gpid, mid: r.session.mid, bs: r.session.bs };
    },
    leave: async function (a) { const nid = await C.leave({ keep: !a || a.keep !== false }); return nid; },
    end: function () { C.end(); return true; },
    /* The switchboard cuts the wire; this tells the instance the wire is cut, which is what a real
       link's close event would do. Kept separate so a test can assert the two halves independently. */
    offline: function (a) { if (C.session) C.session.setOnline(!(a && a.down)); return C.session ? C.session.online : null; },
    role: function (a) { if (C.session && C.session.host) C.session.host.setRole(a.mid, a.role); return true; },
    kick: function (a) { if (C.session) C.session.dropPeer(a.mid); return true; },
    saveMyVersion: async function () {
      const S = C.session;
      if (!S) throw new Error('no session');
      return await FM.projects.duplicateFrom({ project: S.myVersion().project, layers: S.myVersion().layers }, { name: 'My version' });
    },
    dom: function (a) {
      const el = document.querySelector(a.sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { text: (el.textContent || '').slice(0, 200), x: r.x, y: r.y, w: r.width, h: r.height, cls: el.className };
    },
    settings: function (a) {
      if (!FM.settings) return null;
      if (a && 'value' in a) { FM.settings.set(a.key, a.value); return FM.settings.get(a.key); }
      return FM.settings.get(a.key);
    },
    /* Strips `fmwipe` on the way back: the flag is a BOOT-time reset and a reload that kept it would
       clear the very document the reload is supposed to bring back. */
    reload: function () {
      const url = location.href.replace(/([?&])fmwipe=1(&|$)/, function (m, a, b) { return b ? a : ''; });
      setTimeout(function () { location.replace(url); }, 10);
      return true;
    },
    wipe: function () { try { localStorage.clear(); } catch (e) {} return true; },
    wait: function (a) { return sleep((a && a.ms) || 50).then(function () { return true; }); },
    /* Export freeze (§8.9): the flag the exporter itself sets, driven directly so no 4-minute render
       has to happen for a rule about what the flag means to be measurable. */
    exportBegin: function () { FM._exporting = true; return true; },
    exportEnd: function () { FM._exporting = false; return true; },
    jobBegin: function () { ACTS._job = FM.jobBegin('agent'); return FM.jobDepth(); },
    jobEnd: function () { FM.jobEnd(ACTS._job); ACTS._job = null; return FM.jobDepth(); }
  };

  window.addEventListener('message', function (e) {
    const d = e && e.data;
    if (!d || typeof d.fmRpc !== 'number' || !d.act) return;
    const fn = ACTS[d.act];
    if (typeof fn !== 'function') { post({ fmRpc: d.fmRpc, ok: false, err: 'unknown action ' + d.act }); return; }
    Promise.resolve().then(function () { return fn(d.args || {}); })
      .then(function (val) { post({ fmRpc: d.fmRpc, ok: true, val: val === undefined ? null : val }); })
      .catch(function (err) { post({ fmRpc: d.fmRpc, ok: false, err: String(err && err.stack || err && err.why || err) }); });
  });

  post({ fmAgent: 'up', tag: TAG });

})(window.FM);
