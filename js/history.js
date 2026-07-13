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
    suppress = true;
    FM.scene.project = s.project;
    FM.scene.layers = s.layers;
    FM.scene.selectedId = s.selectedId;
    // Restore the full multi-selection (filtered to surviving layers), so undo right after a
    // multi-select edit doesn't collapse the set align/distribute/nudge act on. (#20)
    FM.scene.selectedIds = (Array.isArray(s.selectedIds) ? s.selectedIds : (s.selectedId ? [s.selectedId] : [])).filter(id => FM.layerById(FM.scene, id));
    suppress = false;
    // Undo can remove the group the user is INSIDE (Edit Group) — a dangling groupContext filters
    // every layer out of the timeline (blank list + stale crumb). Validate and exit if it's gone.
    if (FM.groupContext && !FM.scene.layers.some(l => l.id === FM.groupContext)) {
      if (FM.exitGroup) FM.exitGroup(true); else FM.groupContext = null;
    }
    // Snapshots don't include FM.time; clamp it into the restored duration so undoing a duration-grow
    // (with the playhead parked past the new end) doesn't blank the preview / divide-by-zero in pxPerSec.
    FM.time = Math.max(0, Math.min((FM.scene.project && FM.scene.project.duration) || 0, FM.time || 0));
    if (FM.playing && FM.pause) FM.pause();
    if (FM.resizeCanvas) FM.resizeCanvas();
    FM.refreshAll();
    if (FM.seekVideosToTime) FM.seekVideosToTime();
  }

  FM.history = {
    reset() { stack.length = 0; index = -1; this.commit(); },
    commit() {
      if (suppress) return;
      const s = snap();
      if (index >= 0 && stack[index] === s) return;   // identical to the current state → a no-op action can never add a stray undo step
      stack.splice(index + 1);          // drop redo tail
      stack.push(s);
      index = stack.length - 1;
      if (stack.length > 120) { stack.shift(); index--; }
      // Byte cap too: 120 snapshots of a multi-MB scene ≈ hundreds of MB of strings — an iOS Safari
      // jetsam risk. Trim the oldest until the stack fits (always keep a handful of steps).
      let bytes = 0; for (let i = 0; i < stack.length; i++) bytes += stack[i].length;
      while (bytes > 48000000 && stack.length > 8) { bytes -= stack[0].length; stack.shift(); index--; }
      if (FM.storage) FM.storage.autosave();
    },
    undo() { if (FM.flushPendingCommit) FM.flushPendingCommit(); if (index > 0) { index--; restore(stack[index]); if (FM.storage) FM.storage.autosave(); } },   // persist so a hard kill after undo can't resurrect the edit
    redo() { if (FM.flushPendingCommit) FM.flushPendingCommit(); if (index < stack.length - 1) { index++; restore(stack[index]); if (FM.storage) FM.storage.autosave(); } },
  };
})(window.FM);
