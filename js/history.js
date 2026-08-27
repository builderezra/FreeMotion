/* FreeMotion — Undo / redo.
 * Snapshots the scene document (pure JSON) on each discrete action. Media + frame caches
 * live in the registry keyed by layer id (which is preserved across snapshots), so undo
 * restores structure/transform/effects without touching loaded media.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const stack = [];
  let index = -1;
  let suppress = false;

  function snap() {
    // jsonReplacer strips runtime '_' props — without it, transient flags (e.g. _cropEditing) rode
    // into snapshots and undo resurrected them (a restored _cropEditing:true silently hid the layer's crop)
    return JSON.stringify({ project: FM.scene.project, layers: FM.scene.layers, selectedId: FM.scene.selectedId, selectedIds: FM.scene.selectedIds }, FM.jsonReplacer);
  }

  function restore(str) {
    const s = JSON.parse(str);
    /* Undo restores from a snapshot we wrote ourselves, so this is belt-and-braces rather than a
       defence against a hostile file (queue 217). It earns its place anyway: snapshots are strings
       that have been through localStorage, the sanitisers are idempotent and cheap, and undo is the
       one path that can put a layer back AFTER the app has already decided it was malformed —
       without this, "undo" could resurrect exactly the shape an import had just rejected. */
    if (FM.storage && FM.storage._sanitizeLayers) { try { FM.storage._sanitizeLayers(s.layers); } catch (e) {} }
    /* WHAT WAS SELECTED BEFORE THIS UNDO/REDO — captured before the swap, because the whole question
       below is whether the layer he was working on survived it (queue 629). */
    const wasSelected = FM.scene.selectedId;
    suppress = true;
    FM.scene.project = s.project;
    FM.scene.layers = s.layers;
    FM.scene.selectedId = s.selectedId;
    // Restore the full multi-selection (filtered to surviving layers), so undo right after a
    // multi-select edit doesn't collapse the set align/distribute/nudge act on. (#20)
    FM.scene.selectedIds = (Array.isArray(s.selectedIds) ? s.selectedIds : (s.selectedId ? [s.selectedId] : [])).filter(id => FM.layerById(FM.scene, id));
    /* ═══ IF THE UNDO TOOK THE LAYER YOU WERE ON, SELECT NOTHING (queue 629) ═══════════════════════
     * Ezra: *"When you undo or redo when on a layer and it basically is undo the creation of the layer
     * … it shouldn't force you to have another previous layer selected it should just close everything."*
     * The snapshot is a coherent past state, so `s.selectedId` is a layer that existed THEN — undoing
     * the creation of a layer therefore restores whatever was selected before it, which is a DIFFERENT
     * layer, and leaves the inspector open on it.
     * ⚠️ THE POINT IS NOT TIDINESS. Being dropped onto another layer with the same panel open is how
     * you edit the wrong thing without noticing — the next slider drag lands somewhere you never chose.
     * Selecting nothing is the safe failure, and it is what he asked for.
     * ⚠️ NARROW ON PURPOSE: this only fires when the layer he actually had selected is GONE from the
     * restored scene. An ordinary undo that keeps the layer keeps the selection exactly as before, so
     * undoing a nudge or a colour change does not cost him his place. */
    if (wasSelected && !FM.layerById(FM.scene, wasSelected)) {
      FM.scene.selectedId = null;
      FM.scene.selectedIds = [];
    }
    suppress = false;
    // Undo can remove the group the user is INSIDE (Edit Group) — a dangling groupContext filters
    // every layer out of the timeline (blank list + stale crumb). Validate and exit if it's gone.
    if (FM.groupContext && !FM.scene.layers.some(l => l.id === FM.groupContext)) {
      if (FM.exitGroup) FM.exitGroup(true); else FM.groupContext = null;
    }
    /* The on-canvas mask editor is aimed at a mask OBJECT, and the swap above just replaced it with a
       different object carrying the restored coordinates — while the editor still holds the pre-undo
       point list. It does not tear itself down, because it resolves its layer and mask by id and both
       ids survive. Left alone, the overlay keeps drawing the old shape and the next drag writes the
       whole pre-undo path back over the restored one, throwing the undo away without saying so.
       Every other on-canvas tool re-reads the live layer on each operation (point-edit does; crop,
       fill-drag and text-edit hold no geometry), so this is the only one that needs pointing again. */
    if (FM.maskTool && FM.maskTool.resync) FM.maskTool.resync();
    // Snapshots don't include FM.time; clamp it into the restored duration so undoing a duration-grow
    // (with the playhead parked past the new end) doesn't blank the preview / divide-by-zero in pxPerSec.
    FM.time = Math.max(0, Math.min((FM.scene.project && FM.scene.project.duration) || 0, FM.time || 0));
    if (FM.playing && FM.pause) FM.pause();
    if (FM.resizeCanvas) FM.resizeCanvas();
    FM.refreshAll();
    if (FM.seekVideosToTime) FM.seekVideosToTime();
  }

  /* Grey the transport's undo/redo when there is nothing behind or ahead (Ezra). The state already
   * existed — index > 0 and index < stack.length - 1 are exactly the guards undo()/redo() use — it
   * was simply never shown, so both buttons always looked live and pressing them did nothing at the
   * ends of the stack. Kept in here rather than in app.js so every path that moves the stack
   * (commit, undo, redo, reset) updates the buttons through one call and none can drift. */
  function syncButtons() {
    const u = document.getElementById('btn-undo'), r = document.getElementById('btn-redo');
    const canU = index > 0, canR = index < stack.length - 1;
    if (u) { u.classList.toggle('is-off', !canU); u.setAttribute('aria-disabled', canU ? 'false' : 'true'); }
    if (r) { r.classList.toggle('is-off', !canR); r.setAttribute('aria-disabled', canR ? 'false' : 'true'); }
  }

  FM.history = {
    canUndo() { return index > 0; },
    canRedo() { return index < stack.length - 1; },
    syncButtons: syncButtons,
    // reset() runs on open/load/boot — its commit must not count as a user edit, or merely VIEWING
    // a project would bump it to the top of the home list (the autosave it schedules is harmless:
    // it rewrites the just-loaded doc).
    /* Resetting the stack strands media just as an eviction does, and MORE of it: every clip deleted
     * during the outgoing project becomes unreachable the instant the undo history goes. The
     * project-switch teardown (FM.releaseProjectMedia) only walks FM.scene.layers, and a deleted
     * layer is by definition not in that array — so those records survived the switch and were pinned
     * for the life of the page. Measured: a discarded clip's record is still in the store after the
     * exact teardown sequence storage.js performs. BUG-HUNT.md put the cost at roughly 140 MB for one
     * discarded 3-minute track, and iOS Safari jetsams the tab, which reads as the app randomly
     * reloading and losing unsaved edits.
     * Safe at every caller: reset() runs either with the new project's layers and media already in
     * place (project open, import, template insert) or with both empty (boot). */
    reset() {
      stack.length = 0; index = -1; this.commit();
      if (FM.releaseUnreachableMedia) { try { FM.releaseUnreachableMedia(stack); } catch (e) {} }
      if (FM.storage && FM.storage.clearDirty) FM.storage.clearDirty();
      syncButtons();
    },
    commit() {
      if (suppress) return;
      const s = snap();
      if (index >= 0 && stack[index] === s) return;   // identical to the current state → a no-op action can never add a stray undo step
      // Discarding the redo tail can strand a clip just as an eviction can — a layer that only ever
      // existed "forward" of here is gone the moment the tail goes.
      let discarded = stack.length > index + 1;
      stack.splice(index + 1);          // drop redo tail
      stack.push(s);
      index = stack.length - 1;
      if (stack.length > 120) { stack.shift(); index--; discarded = true; }
      // Byte cap too: 120 snapshots of a multi-MB scene ≈ hundreds of MB of strings — an iOS Safari
      // jetsam risk. Trim the oldest until the stack fits (always keep a handful of steps).
      let bytes = 0; for (let i = 0; i < stack.length; i++) bytes += stack[i].length;
      while (bytes > 48000000 && stack.length > 8) { bytes -= stack[0].length; stack.shift(); index--; discarded = true; }
      /* A DISCARDED SNAPSHOT IS THE ONLY MOMENT a deleted clip's media can stop being reachable, so
       * this is the one place the sweep needs to run. deleteLayer deliberately keeps the record (undo
       * restores JSON only, so freeing it there made an undone delete come back blank); the record is
       * released here instead, once no snapshot on the stack can bring the layer back. */
      if (discarded && FM.releaseUnreachableMedia) { try { FM.releaseUnreachableMedia(stack); } catch (e) {} }
      if (FM.storage) FM.storage.autosave();
      syncButtons();   // a new edit drops the redo tail, so redo greys out here too
    },
    undo() { if (FM.flushPendingCommit) FM.flushPendingCommit(); if (index > 0) { index--; restore(stack[index]); if (FM.storage) FM.storage.autosave(); } syncButtons(); },   // persist so a hard kill after undo can't resurrect the edit
    redo() { if (FM.flushPendingCommit) FM.flushPendingCommit(); if (index < stack.length - 1) { index++; restore(stack[index]); if (FM.storage) FM.storage.autosave(); } syncButtons(); },
  };
})(window.FM);
