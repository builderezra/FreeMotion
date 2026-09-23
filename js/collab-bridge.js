/* FreeMotion — live collaboration (queue 921), STAGE S2: the FM.scene DocAdapter (spec §8.6–§8.9, §11.1).
 *
 * The Session and the Host are both pure: they know paths, ops and rules, and nothing about this app.
 * This file is the only place that knows both. It answers four questions for them —
 *
 *   what is the document?     doc() (to write into) and view() (to diff and hash)
 *   is someone touching it?   interacting() (§8.8)
 *   is it safe to change?     frozen() and busy() (§8.9)
 *   what has to be redrawn?   afterApply() (§8.6)
 *
 * — and it runs the derived-value normalisation (§11.1) so the three deterministic writers the app
 * already has become ordinary ops that are no-ops on every receiver, instead of a permanent difference
 * that makes every device think the others are wrong.
 *
 * ⚠️ NOTHING HERE RUNS UNTIL install(). No listeners, no timers, no state. With no session running
 * this file costs one parse, which is the bargain §23 makes with a solo user.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};
  const P = C.path;

  /* §8.8's last clause: "now − lastLocalChangeAt < 250 ms" covers glide momentum, a tickStrip's inertia
     and every timer-driven write that has no pointer behind it. */
  let lastLocalChangeAt = 0;
  let pointers = 0;
  let keyHeld = false;
  let installed = false;
  let lastRebuildAt = 0, lastInspectorAt = 0;
  let rebuildPending = false, inspectorPending = false;

  /* §8.8's tool list. Six answer `isActive()`; the other three do not, and asking all nine the same
     question is how three of them would silently never be detected — `FM.drawTool` is a plain state
     object with `.active`, `touchupTool` answers `isOpen()`, and the tracker answers `isPicking()`.
     A loop over `isActive` alone reads as thorough and covers two thirds of the list (queue 921 S2). */
  const TOOLS = ['textEdit', 'maskTool', 'cropTool', 'fillDrag', 'motionPath', 'pointEdit'];

  function toolActive() {
    for (let i = 0; i < TOOLS.length; i++) {
      const t = FM[TOOLS[i]];
      if (t && typeof t.isActive === 'function') { try { if (t.isActive()) return true; } catch (e) {} }
    }
    if (FM.drawTool && FM.drawTool.active) return true;
    if (FM.touchupTool && FM.touchupTool.isOpen) { try { if (FM.touchupTool.isOpen()) return true; } catch (e) {} }
    if (FM.tracker && FM.tracker.isPicking) { try { if (FM.tracker.isPicking()) return true; } catch (e) {} }
    return false;
  }

  function editableTarget(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'textarea') return true;
    if (tag === 'input') {
      const t = (el.type || 'text').toLowerCase();
      return t !== 'button' && t !== 'checkbox' && t !== 'submit' && t !== 'radio';
    }
    return !!el.isContentEditable;
  }

  let pointerInInspector = false;
  const onPointerDown = function (e) {
    pointers++;
    lastLocalChangeAt = Date.now();
    const panel = document.getElementById('inspector-panel');
    if (panel && e && e.target && e.target.nodeType === 1 && panel.contains(e.target)) pointerInInspector = true;
  };
  const onPointerUp = function () {
    pointers = Math.max(0, pointers - 1);
    if (!pointers) pointerInInspector = false;
    lastLocalChangeAt = Date.now();
  };
  const onKeyDown = function (e) { if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key && e.key.length === 1) keyHeld = true; lastLocalChangeAt = Date.now(); };
  const onKeyUp = function () { keyHeld = false; lastLocalChangeAt = Date.now(); };

  const bridge = {
    /* ── the document ─────────────────────────────────────────────────────────────────────────── */
    /* The tree ops are APPLIED to. FM.scene itself, never a copy: the inspector, the mask tool and
       kfDrag all hold references into it, so anything that replaced an object here would detach a live
       control from the document it is editing (§6.4). */
    doc: function () { return FM.scene; },
    /* The tree that is DIFFED and HASHED: D, i.e. the project minus the owner's workspace pointers,
       plus the real layer array. The project copy is shallow and rebuilt per call — it is a handful of
       scalars — and the layer array is the live one, so the diff reads exactly what the app holds. */
    view: function () { return { project: C._viewOfProject(FM.scene.project), layers: FM.scene.layers }; },
    selected: function () { return FM.scene.selectedId; },
    selectedIds: function () {
      const out = [];
      if (FM.scene.selectedId) out.push(FM.scene.selectedId);
      const ids = FM.scene.selectedIds;
      if (Array.isArray(ids)) for (let i = 0; i < ids.length; i++) if (out.indexOf(ids[i]) < 0) out.push(ids[i]);
      return out;
    },

    /* ── §11.1 derived writes ─────────────────────────────────────────────────────────────────────
     * All three are deterministic functions of D, so they produce the SAME value on every device and
     * §5.5's equality rule turns them into nothing on the wire. Run before every diff and before every
     * hash: left uncommitted they would sit as a permanent difference between base and live, which
     * reads as "somebody changed it" to the undo guard and as divergence to the hash. */
    normalizeDerived: function () {
      if (FM.autoFitDuration) FM.autoFitDuration();
      if (FM.timeline && FM.timeline.inheritLoopModes) FM.timeline.inheritLoopModes();
      if (FM.eachRefFx && FM._fillFxParams) {
        const ls = FM.scene.layers || [];
        for (let i = 0; i < ls.length; i++) FM.eachRefFx(ls[i], FM._fillFxParams);
      }
      P.stampIds(FM.scene);
    },

    /* ── §7.1 step 8: the invariants, run by the host on CLONES ───────────────────────────────── */
    invariants: function () {
      return {
        layer: function (c) { FM.storage._sanitizeLayers([c]); },
        /* The REAL clamp, exposed by storage.js for this (queue 921 S2). S1's host had to use the
           suite's copy of the arithmetic, which is two sources of truth for one rule. */
        project: function (p) { FM.storage._clampProjectDims(p); },
        layers: function (arr) { FM.repairParentCycles(arr); return FM.normalizeGroupOrder(arr); }
      };
    },

    /* ── §8.8 interacting ─────────────────────────────────────────────────────────────────────── */
    interacting: function () {
      if (pointers > 0 || keyHeld) return true;
      if (editableTarget(document.activeElement)) return true;
      if (toolActive()) return true;
      /* A timeline drag is NOT asked about separately: every one of them starts with a pointerdown and
         ends with a pointerup or pointercancel, which the capture listeners above already count —
         including an edge-hold, where the finger stops moving but stays down. The only seam that could
         answer it is `FM.timeline._dragState`, a suite seam, and reading one from the app is how a
         seam stops being a seam. */
      return (Date.now() - lastLocalChangeAt) < C.LIMITS.QUIET;
    },
    interactingInInspector: function () {
      const panel = document.getElementById('inspector-panel');
      if (!panel) return false;
      const a = document.activeElement;
      if (a && panel.contains(a) && editableTarget(a)) return true;
      return pointers > 0 && pointerInInspector;
    },

    /* ── §8.9 frozen and busy ─────────────────────────────────────────────────────────────────── */
    frozen: function () { return !!FM._exporting; },
    busy: function () { return (FM.jobDepth ? FM.jobDepth() > 0 : false) || !!(FM.history && FM.history.isMuted && FM.history.isMuted()); },

    /* ── §6.4 / §8.3 app callbacks ────────────────────────────────────────────────────────────── */
    teardown: function (id) { if (FM.teardownLayerPlayback) FM.teardownLayerPlayback(id); },
    cancelGesturesOn: function (id) { if (FM.cancelGesturesOn) FM.cancelGesturesOn(id); },
    flushPendingCommit: function () { if (FM.flushPendingCommit) FM.flushPendingCommit(); },
    autosave: function () { if (FM.storage && FM.storage.autosave) FM.storage.autosave(); },
    syncUndoButtons: function () { if (FM.history && FM.history.syncButtons) FM.history.syncButtons(); },
    toast: function (m) { if (FM.toast) FM.toast(m); },

    /* ── §12.3 / §13.1: THE LINK'S OWN STATE, SAID OUT LOUD ────────────────────────────────
     * ⚠️ THE SESSION HAS CALLED THESE SINCE S2 AND NOTHING WAS LISTENING (queue 921 S3 review).
     * `onEnd`, `onOffline` and `onOnline` are three of the DocAdapter's callbacks; the test rig's plain
     * adapter implements all three, and the adapter the APP runs implemented none — so when the owner
     * tapped Stop sharing, or the Wi-Fi went, the other device said nothing at all. No toast, no banner,
     * no card: the guest kept editing a project that was no longer syncing, and its panel still read
     * "Live". §19.4's banner was written for exactly this moment and could not be reached from anywhere
     * a transport event could get to. A hook the engine calls and the app ignores is worse than a
     * missing feature, because every test of the engine passes. */
    onOffline: function () { syncCollabBanner(); },
    onOnline: function () { syncCollabBanner(); },
    onRole: function () { syncCollabBanner(); },
    onEnd: function (why) {
      /* S5 review: presence goes with the session, here and now. `C.detach` is not called on this path
         (the session object stays, for the Ended banner and the guest panel), and presence was left
         ticking behind it — chip, listeners, Follow, and a stale roster closing his text editor. */
      if (FM.collab && FM.collab.presence) { try { FM.collab.presence.detach(); } catch (e) {} }
      /* “The owner ended this” is NOT an offline state and must not read as one — offline implies it
         comes back, and S3 has no reconnect. Said once, as a toast, and then held in the banner. */
      if (FM.toast) FM.toast(why === 'removed'
        ? 'You were removed from the live project — your copy stays on this device'
        : 'The owner ended the live session — your copy stays on this device', 4200);
      syncCollabBanner();
    },

    /* ── §8.6 after applying a batch ──────────────────────────────────────────────────────────── */
    afterApply: function (sum) {
      if (!sum) return;
      /* 1. The selection, the group context, the mask tool and the playhead, through the block undo
         already uses — with pause:false, because a friend renaming a layer must not stop playback. */
      if (FM.history && FM.history._afterExternalChange) {
        try { FM.history._afterExternalChange(sum.wasSelected, { pause: false }); } catch (e) {}
      }
      /* 2. FM.addAt is an index into the layer list, so a remote insert or removal silently re-points
         it at a different boundary — the next thing he adds lands somewhere he did not choose. */
      if (sum.structural && typeof FM.addAt === 'number') {
        FM.addAt = Math.max(0, Math.min(FM.addAt, (FM.scene.layers || []).length));
      }
      /* 3. Audio is scheduled ahead of the playhead, so anything that changes what should be heard has
         to restart it or the mix keeps playing the old document. */
      if (FM.playing && audioTouched(sum) && FM.restartAudioIfPlaying) { try { FM.restartAudioIfPlaying(); } catch (e) {} }
      /* 4. The canvas element's size is not part of the document; it is derived from it. */
      const pk = sum.projectKeys || {};
      if ((pk.width || pk.height || pk.fps || pk.background) && FM.resizeCanvas) { try { FM.resizeCanvas(); } catch (e) {} }
      /* 5. Refresh. Render always; the timeline at most 5 Hz; the inspector at most 2 Hz and never
         while a control inside it is being used, because rebuilding it calls innerHTML='' and would
         kill a live glide under the finger. An UNKNOWN path costs a rebuild, never staleness. */
      if (FM.requestRender) FM.requestRender();
      if (needsTimeline(sum)) scheduleRebuild();
      if (needsInspector(sum)) scheduleInspector();
    },

    /* ── install / uninstall ──────────────────────────────────────────────────────────────────── */
    install: function () {
      if (installed) return;
      installed = true;
      pointers = 0; keyHeld = false; lastLocalChangeAt = 0;
      document.addEventListener('pointerdown', onPointerDown, true);
      document.addEventListener('pointerup', onPointerUp, true);
      document.addEventListener('pointercancel', onPointerUp, true);
      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('keyup', onKeyUp, true);
    },
    uninstall: function () {
      if (!installed) return;
      installed = false;
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerUp, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      pointers = 0; keyHeld = false; pointerInInspector = false;
    },
    /* §12.4: the guest's confirmed base, so a reload can work out what it still owes the host instead
       of losing it. IndexedDB rather than localStorage, because the linked project document is ALREADY
       in localStorage and a second copy of it there is what makes check 4's room calculation wrong. */
    persistBase: function (state) {
      const gpid = (C.session && C.session.gpid) || (FM.projects && FM.projects.currentId());
      if (!gpid) return false;
      /* ⚠️ RETURN THE WRITE'S OWN PROMISE (queue 921). `collabPut` is async and turns a quota failure
         into a resolved `false`; dropping it here and answering `true` on the next line meant the one
         place that could have said "this guest has no recovery point" reported success instead. On a
         phone near its quota — or at pagehide, where flushSync's synchronous scene write lands and
         this one does not — §12.4's whole purpose failed silently. */
      return FM.storage.collabPut('collab:base:' + gpid, { v: 1, gpid: gpid, epoch: state.epoch, seq: state.seq, cid: state.cid || 0, D: state.D, at: Date.now() });
    },
    readBase: function (gpid) { return FM.storage.collabGet('collab:base:' + (gpid || FM.projects.currentId())); },
    dropBase: function (gpid) { return FM.storage.collabDel('collab:base:' + (gpid || FM.projects.currentId())); },
    installed: function () { return installed; },
    _touch: function () { lastLocalChangeAt = Date.now(); },
    _quiet: function () { lastLocalChangeAt = 0; pointers = 0; keyHeld = false; pointerInInspector = false; }
  };

  /* Any of these on an audio-bearing layer changes what should be coming out of the speakers. */
  const AUDIO_KEYS = ['volume', 'fadeIn', 'fadeOut', 'audioFx', 'muted', 'solo', 'speed', 'start', 'trimStart', 'duration', 'reversed'];
  function audioTouched(sum) {
    if (sum.structural) return true;                    // a layer arrived or left: it may carry audio
    const keys = sum.paths || [];
    for (let i = 0; i < keys.length; i++) {
      const p = P.fromWire(keys[i]);
      if (!p || p[0] !== 'L' || p.length < 3) continue;
      if (AUDIO_KEYS.indexOf(p[2]) >= 0) return true;
    }
    return false;
  }

  /* §8.6 step 5's list — plus the catch-all: a path NOT in the list also rebuilds. An unknown path
     costs one rebuild; a missing one costs a stale timeline nobody can explain. */
  const LAYOUT_KEYS = ['start', 'duration', 'trimStart', 'name', 'visible', 'locked', 'labelColor', 'clipColor', 'parent', 'collapsed'];
  function needsTimeline(sum) {
    if (sum.structural) return true;
    const keys = sum.paths || [];
    for (let i = 0; i < keys.length; i++) {
      const p = P.fromWire(keys[i]);
      if (!p) return true;
      if (p[0] === 'P') continue;
      if (p.length < 3) return true;
      if (LAYOUT_KEYS.indexOf(p[2]) >= 0) return true;
      return true;                                      // anything else on a layer: refresh rather than risk stale
    }
    return false;
  }
  function needsInspector(sum) {
    const sel = FM.scene.selectedId;
    if (!sel) return false;
    return !!(sum.layerIds && sum.layerIds[sel]);
  }

  function scheduleRebuild() {
    const t = Date.now();
    if (t - lastRebuildAt >= 200) { lastRebuildAt = t; doRebuild(); return; }
    if (rebuildPending) return;
    rebuildPending = true;
    setTimeout(function () { rebuildPending = false; lastRebuildAt = Date.now(); doRebuild(); }, 200 - (t - lastRebuildAt));
  }
  function doRebuild() { if (FM.timeline && FM.timeline.rebuild) { try { FM.timeline.rebuild(); } catch (e) {} } }

  function scheduleInspector() {
    /* Deferred while a control in the panel is in use — see afterApply step 5. */
    if (bridge.interactingInInspector()) {
      if (inspectorPending) return;
      inspectorPending = true;
      setTimeout(function () { inspectorPending = false; scheduleInspector(); }, 250);
      return;
    }
    const t = Date.now();
    if (t - lastInspectorAt >= 500) { lastInspectorAt = t; doInspector(); return; }
    if (inspectorPending) return;
    inspectorPending = true;
    setTimeout(function () { inspectorPending = false; lastInspectorAt = Date.now(); doInspector(); }, 500 - (t - lastInspectorAt));
  }
  function doInspector() { if (FM.inspector && FM.inspector.refresh) { try { FM.inspector.refresh(); } catch (e) {} } }

  function syncCollabBanner() {
    if (C.ui && C.ui.syncBanner) { try { C.ui.syncBanner(); } catch (e) {} }
  }

  C.bridge = bridge;

})(window.FM);
