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
    return JSON.stringify({ project: FM.scene.project, layers: FM.scene.layers, selectedId: FM.scene.selectedId });
  }

  function restore(str) {
    const s = JSON.parse(str);
    suppress = true;
    FM.scene.project = s.project;
    FM.scene.layers = s.layers;
    FM.scene.selectedId = s.selectedId;
    FM.scene.selectedIds = (s.selectedId && FM.layerById(FM.scene, s.selectedId)) ? [s.selectedId] : [];   // avoid stale multi-selection after undo/redo
    suppress = false;
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
      stack.splice(index + 1);          // drop redo tail
      stack.push(snap());
      index = stack.length - 1;
      if (stack.length > 120) { stack.shift(); index--; }
      if (FM.storage) FM.storage.autosave();
    },
    undo() { if (index > 0) { index--; restore(stack[index]); if (FM.storage) FM.storage.autosave(); } },   // persist so a hard kill after undo can't resurrect the edit
    redo() { if (index < stack.length - 1) { index++; restore(stack[index]); if (FM.storage) FM.storage.autosave(); } },
  };
})(window.FM);
