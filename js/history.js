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
  /* ⚠️ queue 826: MUTING IS A DEPTH, NOT A SWAPPED-OUT FUNCTION. Two callers used to batch a multi-layer
     action by saving `FM.history.commit`, replacing it with a no-op and restoring it in a finally —
     duplicateSelection (js/app.js) and clipSplit (js/timeline.js). Both await real work, so two of them can
     overlap: the second captures the FIRST one's no-op as "the real commit" and restores THAT, and from
     then on commit is a no-op FOREVER. Nothing looks wrong — the undo and redo buttons still light up,
     because syncButtons only runs from inside commit — but no snapshot is taken and `FM.storage.autosave()`
     is called ONLY from commit, so nothing he does reaches disk either. Then undo, which is NOT muted,
     restores the snapshot from before the mute and throws away every edit since.
     A counter cannot be lost that way: unbalanced calls can only ever end with a mute still ON, which the
     next commit's own guard reports, rather than silently ending with the app's history disconnected. */
  let muteDepth = 0;

  function snap() {
    // jsonReplacer strips runtime '_' props — without it, transient flags (e.g. _cropEditing) rode
    // into snapshots and undo resurrected them (a restored _cropEditing:true silently hid the layer's crop)
    return JSON.stringify({ project: FM.scene.project, layers: FM.scene.layers, selectedId: FM.scene.selectedId, selectedIds: FM.scene.selectedIds }, FM.jsonReplacer);
  }

  /* ═══ UNDO KEEPS THE EFFECT HE HAS OPEN (queue 690, sixth hunt) ═══════════════════════════════════════════════
   * Which effect row is open is `fx._expanded`, a runtime flag, and snap() strips every `_` key — so every snapshot
   * is a scene in which nothing is open, and restore() put exactly that back. He opens Gaussian Blur, drags it from 6
   * to 11.5 px, taps Undo to compare: the value came back and the controls he was using folded shut under his thumb;
   * Redo did the same. Every comparison cost him finding the effect and opening it again, on the phone and the PC.
   * So the open rows are carried from the scene being replaced onto the one coming back, matched by POSITION in the
   * same list on the same layer, and only where the thing there is the same kind of thing (same `type`, and the same
   * `id` where it has one) — so an undo that removed or reordered effects cannot open a different one in its place.
   * Every list with an open/close row: the effect stack, a filter's children, a caption cue's own stack, the audio
   * effects and the masks. It can only re-open what was open, so the accordion's one-open-row still holds.
   * The collab path needs none of this — it patches the live objects and keeps `_expanded` (collab-diff.js). */
  function carryOpen(from, to) {
    if (!Array.isArray(from) || !Array.isArray(to)) return;
    for (let i = 0; i < from.length && i < to.length; i++) {
      const a = from[i], b = to[i];
      if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || a.type !== b.type || a.id !== b.id) continue;
      if (a._expanded) b._expanded = true;
      carryOpen(a.effects, b.effects);   // a filter's children
    }
  }
  function keepOpenRows(oldLayers, newLayers) {
    const was = new Map();
    (oldLayers || []).forEach(l => { if (l && l.id) was.set(l.id, l); });
    (newLayers || []).forEach(l => {
      const o = l && was.get(l.id);
      if (!o) return;
      carryOpen(o.effects, l.effects);
      carryOpen(o.audioFx, l.audioFx);
      carryOpen(o.masks, l.masks);
      if (Array.isArray(o.captions) && Array.isArray(l.captions)) o.captions.forEach((c, k) => { if (c && l.captions[k]) carryOpen(c.effects, l.captions[k].effects); });
    });
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
    const wasIds = FM.selectionIds ? FM.selectionIds() : (wasSelected ? [wasSelected] : []);
    const hadIds = new Set(FM.scene.layers.map(l => l.id));
    suppress = true;
    const outgoing = FM.scene.layers;
    FM.scene.project = s.project;
    FM.scene.layers = s.layers;
    try { keepOpenRows(outgoing, s.layers); } catch (e) {}   // a UI nicety: it must never be able to stop an undo
    /* ═══ UNDO DOES NOT CHOOSE WHICH LAYER HE IS ON (queue 690) ═══════════════════════════════════════
     * This used to put back the SNAPSHOT's selection, and a snapshot's selection is whatever was
     * selected at the PREVIOUS commit — and selecting never commits (a real click on a clip or its
     * thumbnail adds no history step; measured). So: add Blue (selected, committed), CLICK Red, nudge
     * it or press Delete, press Cmd+Z — Red went back, and the selection and the panel jumped to Blue.
     * The next arrow key, slider drag or Delete then landed on Blue, a layer he never chose. That is
     * #629's reason exactly (*"it shouldn't force you to have another previous layer selected"*), in
     * the far more common case where the layer he was on still exists — which the 629 rule, below in
     * _afterExternalChange, never looks at.
     * The rule now, in three cases:
     *   · the layer he had selected survives → it STAYS selected, with the rest of his multi-selection
     *     that survived too (so undo right after an align/nudge of several keeps the set — #20);
     *   · he had nothing selected (a Delete leaves him there, #556) → select what the undo BROUGHT
     *     BACK, if anything: undoing a Delete puts the deleted layer back exactly as he had it, selected
     *     — never some third layer from an older commit. Only the TOPS of what came back: undoing the
     *     delete of a group brings its members back too, and he had the group selected, not them;
     *   · the layer he had selected is gone → nothing (#629, unchanged, applied in _afterExternalChange).
     * The snapshot's own choice is never used. */
    const alive = id => !!FM.layerById(FM.scene, id);
    if (wasSelected && alive(wasSelected)) {
      const keep = wasIds.filter(alive);
      FM.scene.selectedId = wasSelected;
      FM.scene.selectedIds = keep.indexOf(wasSelected) >= 0 ? keep : [wasSelected];
    } else if (!wasSelected) {
      const back = FM.scene.layers.filter(l => !hadIds.has(l.id));
      const backIds = new Set(back.map(l => l.id));
      const tops = back.filter(l => !(l.parent && backIds.has(l.parent))).map(l => l.id);
      FM.scene.selectedId = tops.length ? tops[0] : null;
      FM.scene.selectedIds = tops;
    } else {
      FM.scene.selectedId = null;   // the 629 rule in _afterExternalChange says the same; set here so no
      FM.scene.selectedIds = [];    // snapshot selection is ever installed, even for a moment
    }
    suppress = false;
    /* The block that used to stand here — the 629 rule, restoreReplacedMedia, the groupContext exit, the
       mask resync and the time clamp — is now _afterExternalChange below, WORD FOR WORD. See it for why
       (queue 921 S0). `pause:true` is what restore has always done; nothing else moved. */
    FM.history._afterExternalChange(wasSelected, { pause: true });
    if (FM.resizeCanvas) FM.resizeCanvas();
    FM.refreshAll();
    if (FM.seekVideosToTime) FM.seekVideosToTime();
    /* The stack entry we are now standing on still names the OLD selection. commit() treats a snapshot
       identical to stack[index] as a no-op, and one that differs only by selection as a real step — so
       without this, the first no-op commit after an undo (a panel that commits on close, a slider let go
       where it was) would push a selection-only step and throw the whole redo tail away. Re-stamped in
       snap()'s own key order, so it is byte-identical to what snap() would write for this state. Returned
       rather than written here because restore() does not know the index. */
    const sid = FM.scene.selectedId, sids = FM.scene.selectedIds;
    if (sid === s.selectedId && JSON.stringify(sids) === JSON.stringify(s.selectedIds)) return null;
    const o = JSON.parse(str);
    return JSON.stringify({ project: o.project, layers: o.layers, selectedId: sid, selectedIds: sids }, FM.jsonReplacer);
  }

  /* ═══ THE SCENE CHANGED UNDER THE UI — PUT THE UI BACK IN AGREEMENT WITH IT (queue 921 S0) ═════════
   * Extracted from restore() with ZERO behaviour change, because a second caller is coming: live
   * collaboration applies someone else's edits straight into FM.scene, and every repair below is needed
   * there for the same reason it is needed after an undo — the layers were swapped without the tools,
   * the selection or the playhead being asked.
   * ONE difference, and it is why `opts.pause` exists: an undo pauses playback (it always has), and a
   * remote edit must NOT — a friend renaming a layer cannot be allowed to stop your playback. So the
   * pause is a parameter rather than a second copy of this block that will drift from this one.
   * `wasSelected` is read by the caller BEFORE the swap: the whole question of the 629 rule is whether
   * the layer he was working on survived it. */
  function afterExternalChange(wasSelected, opts) {
    const pause = !opts || opts.pause !== false;
    /* Dead ids out of the multi-selection. restore() has already filtered them from the snapshot it
       just installed, so this is a no-op there — it is here for the collab caller, whose layers were
       removed by someone else — and it only writes when something is actually dead, so an undo cannot
       even swap the array for an identical copy. */
    const ids = FM.scene.selectedIds;
    if (Array.isArray(ids) && ids.some(id => !FM.layerById(FM.scene, id))) {
      FM.scene.selectedIds = ids.filter(id => FM.layerById(FM.scene, id));
    }
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
    /* queue 829: the layers are back — now bring the MEDIA back into agreement with them. An undo past a
       "Replace media…" restores a layer whose mediaRev is older than the file currently loaded for it, and
       the original was stashed at replace time for exactly this. Async and silent: the layer is already
       correct, this only makes the picture match it. */
    if (FM.restoreReplacedMedia) { try { FM.restoreReplacedMedia(); } catch (e) {} }
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
    if (pause && FM.playing && FM.pause) FM.pause();
  }

  /* Grey the transport's undo/redo when there is nothing behind or ahead (Ezra). The state already
   * existed — index > 0 and index < stack.length - 1 are exactly the guards undo()/redo() use — it
   * was simply never shown, so both buttons always looked live and pressing them did nothing at the
   * ends of the stack. Kept in here rather than in app.js so every path that moves the stack
   * (commit, undo, redo, reset) updates the buttons through one call and none can drift. */
  function syncButtons() {
    const u = document.getElementById('btn-undo'), r = document.getElementById('btn-redo');
    /* WHILE COLLAB OWNS UNDO, THE BUTTONS MUST ASK IT (queue 921 S0). In a session undo is per-person —
       it walks that person's own ops, not this snapshot stack — so `index` says nothing about whether
       there is anything to undo. Inert today: FM.collab does not exist until stage 1, and undoActive()
       is false until a session starts. */
    const collabUndo = !!(FM.collab && FM.collab.undoActive && FM.collab.undoActive());
    const canU = collabUndo ? !!FM.collab.canUndo() : index > 0;
    const canR = collabUndo ? !!FM.collab.canRedo() : index < stack.length - 1;
    if (u) { u.classList.toggle('is-off', !canU); u.setAttribute('aria-disabled', canU ? 'false' : 'true'); }
    if (r) { r.classList.toggle('is-off', !canR); r.setAttribute('aria-disabled', canR ? 'false' : 'true'); }
  }

  FM.history = {
    canUndo() { return index > 0; },
    /* queue 826 suite seam: how many steps are actually ON the stack. A test that counts CALLS to commit()
       measures the wrong thing now — a muted batch still calls it, and it returns early — so the honest
       question is how many places undo can go back to. */
    _steps() { return { len: stack.length, index: index }; },
    canRedo() { return index < stack.length - 1; },
    syncButtons: syncButtons,
    _afterExternalChange: afterExternalChange,   // queue 921 S0: restore's post-swap repairs, shared with collab
    /* queue 921 S0 (§10.4): the snapshots BEHIND the playhead of the stack, oldest first. A session that
       starts mid-project still has to be able to undo what he did BEFORE it started, and the only record
       of that is this stack — collab reads it once, at arm, and diffs consecutive pairs lazily. A copy:
       the array itself must never leave this closure. */
    _snapshotsUpTo() { return stack.slice(0, index + 1); },
    /* ═══ A NAME GIVEN ON HOME IS NOT AN EDITOR EDIT (queue 690, hunt 5) ═══════════════════════════════════
     * ⋯ → Rename… on Home renames the open project with no history step — and going back into the SAME
     * project keeps this stack, every snapshot of which still carried the OLD name. So the first Undo he
     * pressed inside, meaning to take back a move, put the old name back too: in the editor, on the card
     * and in the saved project, and Redo could not bring the new one back (every snapshot ahead had the old
     * name as well). The rename is written into every snapshot instead, so from undo's point of view the
     * project has always been called that. A rename made INSIDE the editor still commits its own step and
     * still undoes. One parse per snapshot, once, for a tap on Home — the same work one undo does. */
    renameProject(name) {
      for (let i = 0; i < stack.length; i++) {
        try {
          const o = JSON.parse(stack[i]);
          if (!o || !o.project || o.project.name === name) continue;
          o.project.name = name;
          stack[i] = JSON.stringify(o, FM.jsonReplacer);   // snap()'s own key order survives the round trip, so an unchanged scene still matches stack[index]
        } catch (e) {}
      }
    },
    // reset() runs on open/load/boot — its commit must not count as a user edit, or merely VIEWING
    // a project would bump it to the top of the home list (the autosave it schedules is harmless:
    // it would rewrite the just-loaded doc, and since queue 690 (hunt 5) writeScene makes no write at
    // all when nothing changed — it used to bump the rev, which made every OTHER window on the project
    // think newer work had been saved and stop saving).
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
      /* queue 921 S0: reset() runs on every project open/import/boot, which is exactly when a hosted
         session has to stand down (§12.1 `paused`) and when collab's borrowed undo has to be handed
         back. NOT gated on `active`: the hand-back must happen after a session has ended too. */
      if (FM.collab && FM.collab.onReset) FM.collab.onReset();
    },
    /* queue 826: batch a multi-step action with these instead of swapping `commit` out. Re-entrant by
       design — nested and overlapping batches each add one, and history resumes when the last one ends. */
    mute() { muteDepth++; },
    unmute() { if (muteDepth > 0) muteDepth--; },
    isMuted() { return muteDepth > 0; },
    commit() {
      if (suppress) return;
      if (muteDepth > 0) return;
      /* ═══ THE TWO COLLAB SEAMS (queue 921 S0, spec §9) ════════════════════════════════════════════
       * beforeSnap runs the derived-value normalisation and the diff, so the snapshot taken on the next
       * line already contains everything the diff sent — otherwise an undo would restore a state the
       * others never saw. afterCommit closes that person's undo step.
       * ⚠️ PAIRED ON EVERY EXIT, including the identical-snapshot return below: a beforeSnap whose
       * afterCommit never ran leaves an undo step open, and the next action merges into it. Both are
       * no-ops while no session is running, and FM.collab does not exist at all before stage 1. */
      /* …and while undo is still HANDED to a session that has stopped (§10.5 — after Stop sharing, until another project
         opens): ↶ goes there, so what he does after the end has to be recorded there too, or ↶ skips it and takes back
         an edit from the session instead (queue 690, sixth hunt). A stopped session records and sends nothing. */
      const cb = FM.collab && (FM.collab.active || !!(FM.collab.undoActive && FM.collab.undoActive()));
      if (cb) FM.collab.beforeSnap();
      const s = snap();
      if (index >= 0 && stack[index] === s) { if (cb) FM.collab.afterCommit(); return; }   // identical to the current state → a no-op action can never add a stray undo step
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
      if (cb) FM.collab.afterCommit();   // queue 921 S0: close this person's undo step (see beforeSnap above)
      if (FM.storage) FM.storage.autosave();
      syncButtons();   // a new edit drops the redo tail, so redo greys out here too
    },
    /* ⚠️ IN A SESSION, UNDO IS NOT THIS STACK (queue 921 S0, spec §10). A snapshot restore would put the
       WHOLE document back, wiping out everything the other people have done since — his rule for the
       feature was "undo only undoes your own changes". So while collab owns undo, it answers instead.
       One line, first, and false until a session starts. */
    /* The open text editor is a pending commit too (queue 690, second hunt): on PC its card leaves ↶ live, and his typing
       only commits at ✓, so ↶ used to step over it — right after Add text, the layer went with his words and ↷ brought
       back the word Text. flush() makes the typing its own step first; resync() re-reads the field (and the caption it
       is bound to) from the restored scene, because the editor stays open whenever the layer survived. */
    /* ⚠️ …AND IN A SESSION TOO (queue 690, sixth hunt). The session's line used to return BEFORE the flush, so with the
       card open his typing was still in collab's open step: ↶ popped the step before it — Add text — found the layer
       no longer read Text and refused with "Can't undo — someone else changed it since" (nobody else had touched it),
       and that step was used up, so the text he added could never be undone. The flush now runs first either way, and
       the resync after either way (a session's undo also rewrites the layer under the open field). */
    undo() { if (FM.flushPendingCommit) FM.flushPendingCommit(); if (FM.textEdit && FM.textEdit.flush) FM.textEdit.flush(); if (FM.collab && FM.collab.undoActive && FM.collab.undoActive()) { const ok = FM.collab.undo(); if (FM.textEdit && FM.textEdit.resync) FM.textEdit.resync(); return ok; } if (index > 0) { index--; const re = restore(stack[index]); if (re) stack[index] = re; if (FM.storage) FM.storage.autosave(); } if (FM.textEdit && FM.textEdit.resync) FM.textEdit.resync(); syncButtons(); },   // persist so a hard kill after undo can't resurrect the edit; `re` — see the end of restore()
    redo() { if (FM.flushPendingCommit) FM.flushPendingCommit(); if (FM.textEdit && FM.textEdit.flush) FM.textEdit.flush(); if (FM.collab && FM.collab.undoActive && FM.collab.undoActive()) { const ok = FM.collab.redo(); if (FM.textEdit && FM.textEdit.resync) FM.textEdit.resync(); return ok; } if (index < stack.length - 1) { index++; const re = restore(stack[index]); if (re) stack[index] = re; if (FM.storage) FM.storage.autosave(); } if (FM.textEdit && FM.textEdit.resync) FM.textEdit.resync(); syncButtons(); },
  };
})(window.FM);
