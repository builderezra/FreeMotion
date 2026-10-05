/* FreeMotion — FM.editor: which editor this device shows for the open project (Simple mode Phase 1, DESIGN.md §6, §7.2).
 *
 * THE EDITOR IS A VIEW, NOT A DOCUMENT FACT. Switching writes nothing to the project, takes no undo step and sends nothing
 * to a live session (§6.2): it toggles `body.ed-simple`, and the timeline dispatches on that class. What this device last
 * chose lives on ITS project card (the index entry's `editor`) and in `fm.editor.last`, never in the document.
 *
 * ONE DOOR (his rule, 1 Oct): the ⚙ cog's third block calls request(). There is no play-bar button, no ⋯ item and no E key
 * (DESIGN.md §0.4 V1–V3, B14). request() works out what a switch would lose and ASKS first (§6.4). apply() never closes a tool
 * that holds unapplied work: it refuses instead, so no door — today's or a later one — can throw work away silently.
 *
 * D22: GATED false (recommended A) = no Settings row, enabled() is always true. Under D22 B set GATED true and add the
 * Settings row (BUILD-PLAN 1.3.7–1.3.9).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const GATED = false;                 // D22
  const W = () => (FM.spineWords && FM.spineWords.editor) || {};
  let mode = 'full';                   // what is on screen
  let lastPid = undefined;             // the project that mode was worked out for
  let pendingFx = false;               // a switch made from the cog: its crossfade waits for the cog to close (§6.3)
  const listeners = [];

  const body = () => document.body;
  const enabled = () => !GATED || !!(FM.settings && FM.settings.get && FM.settings.get('simpleEditor'));
  const openPid = () => (FM.storage && FM.storage.openProjectId) ? FM.storage.openProjectId() : null;
  const card = pid => { try { return ((FM.projects && FM.projects.list && FM.projects.list()) || []).find(p => p.id === pid) || null; } catch (e) { return null; } };
  const safe = f => { try { return !!f(); } catch (e) { return false; } };

  /* WHICH EDITOR A PROJECT OPENS IN (§7.2): this device's card for that project, else Full. project.sm.home is NEVER read
     (§0.4 B27). Phase 3, under D3 A (re-asked 1 Oct), gives a NEW project's card `editor` from fm.editor.last at create, in createFromDialog. */
  function homeFor(pid) {
    if (!enabled()) return 'full';
    const c = pid ? card(pid) : null;
    return (c && c.editor === 'simple') ? 'simple' : 'full';
  }
  function remember(pid, ed) {
    try { localStorage.setItem('fm.editor.last', ed); } catch (e) {}
    if (!pid || !FM.projects || !FM.projects.list || !FM.projects.saveIndex) return;
    const idx = FM.projects.list(), e = idx.find(p => p.id === pid);
    if (!e || e.editor === ed) return;
    e.editor = ed;
    FM.projects.saveIndex(idx);
  }

  /* THE GUARD'S THREE LISTS (§6.4). HOLDS: a tool that can hold work NOT yet in history — closing it would lose that work, so
     the switch asks first and then presses the tool's OWN Done (Full's Done, unchanged: the switch adds no new way to apply
     anything). COMMITS: a tool whose close is one ordinary undo step. QUIET: a tool whose close writes nothing. */
  const click = sel => { const b = document.querySelector(sel); if (!b) return false; b.click(); return true; };
  const HOLDS = [
    { id: 'crop',    live: () => FM.cropTool && FM.cropTool.isActive() && FM.cropTool.changed(),       keep: () => click('#crop-bar .cb-done') },
    { id: 'touchup', live: () => FM.touchupTool && FM.touchupTool.isOpen() && FM.touchupTool.changed(), keep: () => click('#touchup-bar .cb-done') },
    /* DESIGN §21 F1: the draw bar's Done is `#draw-bar .db-done` (js/draw-tool.js:788), not `.cb-done`; and under 3 points that
       Done only toasts "Tap at least 3 points" and stays open (finish(), :691-693), so "Switch anyway" — which the warning
       says throws the points away — must discard them itself, or apply() would see the pen still live and refuse in silence. */
    { id: 'pen',     live: () => FM.drawTool && FM.drawTool.active && FM.drawTool.mode === 'vector' && FM.drawTool.points.length > 0,
      keep: () => { if (FM.drawTool.points.length >= 3) return click('#draw-bar .db-done'); if (FM.drawTools) FM.drawTools.stop(); return true; } }
    /* No voice take here (§21 F2): the recorder is #vr-overlay, fixed, inset 0, z 190 — over the cog — and no switch path closes
       it, so a take is never lost by a switch. busyReason() refuses while it is open instead. */
  ];
  const COMMITS = [
    { id: 'text',   live: () => FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive(), close: () => FM.textEdit.stop() },
    { id: 'mask',   live: () => FM.maskTool && FM.maskTool.isActive && FM.maskTool.isActive(), close: () => FM.maskTool.stop() },
    { id: 'points', live: () => FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive(), close: () => FM.pointEdit.stop() },
    { id: 'wheel',  live: () => FM.hasPendingCommit && FM.hasPendingCommit(), close: () => FM.flushPendingCommit() }
  ];
  const QUIET = [   // open but holding nothing: closing writes nothing (an untouched crop / touch-up box, motion path, graph)
    { id: 'crop',    live: () => FM.cropTool && FM.cropTool.isActive(),    close: () => FM.cropTool.stop() },
    { id: 'touchup', live: () => FM.touchupTool && FM.touchupTool.isOpen(), close: () => FM.touchupTool.close() },
    { id: 'path',    live: () => FM.motionPath && FM.motionPath.isActive && FM.motionPath.isActive(), close: () => FM.motionPath.stop() }
  ];
  /* STAYS: open across a switch, closed by nothing here, losing nothing. Sketching (freehand draw) commits each stroke as it
     lands, but its own ↷ (histFuture) would die with the tool, so it must never be added to QUIET (§21 F4). */
  const STAYS = ['draw-freehand'];
  FM.editorGuardLists = { HOLDS: HOLDS.map(h => h.id), COMMITS: COMMITS.map(c => c.id), QUIET: QUIET.map(q => q.id).concat(['graph', 'tracker']), STAYS: STAYS, REFUSED: ['voice'] };   // cog T2 reads this: every LEASED row (draw = pen + draw-freehand) and the recorder must be in one list

  /* What would stop a switch outright (§6.1 refusals). '' when nothing does. */
  function busyReason() {
    if (FM._exporting) return 'export';
    if (FM.voiceRec && FM.voiceRec.isOpen && FM.voiceRec.isOpen()) return 'recording';   // §21 F2: open at all, not only recording (refusal line: "Close the recorder first")
    if ((FM.spine && FM.spine.running) || body().classList.contains('sm-running')) return 'busy';
    if ((FM.timeline && FM.timeline.gestureLive && FM.timeline.gestureLive()) || (FM.canvasGestureLive && FM.canvasGestureLive())) return 'drag';
    return '';
  }

  /* THE PLAN: what this switch would write and what it would lose. The swap itself writes only this device's card and
     fm.editor.last; every HOLDS entry that is live would be lost; any step it makes while ↷ has steps loses the redo tail. */
  /* §21 F5: the ↷ the person SEES. In a live session undo and redo go through FM.collab (js/history.js:208, :325-326), and the
     local stack's canRedo() says nothing about it — the redo warning would be wrong in exactly the case with a friend in. */
  const canRedoNow = () => safe(() => (FM.collab && FM.collab.undoActive && FM.collab.undoActive()) ? FM.collab.canRedo() : FM.history.canRedo());
  const redoCountNow = () => { try { return ((FM.collab && FM.collab.undoActive && FM.collab.undoActive()) ? FM.collab.redoDepth() : FM.history.redoDepth()) || 1; } catch (e) { return 1; } };   // the steps ↷ holds, for the redo line
  function plan(to) {
    const p = { to: to, refuse: busyReason(), lose: [], steps: 0, writes: ['card.editor', 'fm.editor.last'] };
    HOLDS.forEach(h => { if (safe(h.live)) p.lose.push(h.id); });
    /* ONLY A STEP THE SWITCH REALLY MAKES cuts the redo tail (review 6 Oct). A pen under 3 points is thrown away (keep()
       commits nothing), and closing an untouched text editor, mask or Edit Points commits an identical snapshot, which
       history.commit() ignores — so neither may say "Redo can't bring back…". Unsure (no wouldStep, or a live session's
       own undo) means warn. */
    const penDiscard = id => id === 'pen' && FM.drawTool && FM.drawTool.points.length < 3;
    const collabUndo = safe(() => FM.collab && FM.collab.undoActive && FM.collab.undoActive());
    const wouldStep = () => { try { return !FM.history.wouldStep || FM.history.wouldStep(); } catch (e) { return true; } };
    const commitStep = COMMITS.some(c => safe(c.live)) && (collabUndo || wouldStep());
    p.steps = p.lose.filter(id => !penDiscard(id)).length + (commitStep ? 1 : 0);   // applying a held thing is a step too
    if (p.steps && canRedoNow()) p.lose.push('redo');
    return p;
  }
  function warning(p) {
    const w = W().warn || {}, to = p.to === 'simple' ? (W().simple || 'Simple') : (W().full || 'Full');
    const lines = p.lose.map(id => id === 'pen' && FM.drawTool && FM.drawTool.points.length < 3 ? w.penShort(FM.drawTool.points.length) : (id === 'redo' ? w.redo(redoCountNow()) : w[id]));
    const one = p.lose.length === 1 ? p.lose[0] : null;
    return { title: (w.title || 'Switch to ') + to + '?', message: lines.join('\n'),
             ok: one ? ((one === 'pen' && FM.drawTool.points.length < 3) ? w.okAnyway : (w.ok[one] || w.okAnyway)) : w.okSeveral,
             cancel: w.stay || 'Stay' };
  }
  function refuse(kind) {
    const r = (W().refuse || {})[kind] || '';
    window.dispatchEvent(new CustomEvent('fm-editor-refuse', { detail: { kind: kind, text: r } }));   // the cog block shakes and shows it (§6.1)
    return false;
  }

  /* PUT AN EDITOR ON SCREEN, writing nothing. Every door reaches this. It NEVER closes a tool that holds work: with one live
     it refuses, so the only way past is request(), which asked. */
  function apply(next, opts) {
    next = next === 'simple' && enabled() ? 'simple' : 'full';
    opts = opts || {};
    if (next === mode && !opts.force) return true;
    if (busyReason() && !opts.force) return false;
    if (HOLDS.some(h => safe(h.live))) return false;
    COMMITS.forEach(c => { if (safe(c.live)) { try { c.close(); } catch (e) {} } });
    QUIET.forEach(q => { if (safe(q.live)) { try { q.close(); } catch (e) {} } });
    const had = document.activeElement;
    mode = next;
    /* This project's editor is decided NOW. Without this the rebuild below ran syncProject while lastPid still named no project
       (the last rebuild came before the open id was set, as on every app start), and it re-applied the card's editor: the
       first switch after opening the app turned Simple on and straight back off, with no refusal and no question (cog T10b). */
    lastPid = openPid();
    body().classList.toggle('ed-simple', mode === 'simple');
    /* §6.2: a switch leaves Edit Group (review 6 Oct). There was a call to FM.exitEditGroup, which does not exist, so the group
       context rode into Simple and the + filed new clips INSIDE the group. FM.exitGroup(true) is the app's own exit; it runs
       after lastPid is set, so the rebuild inside it cannot re-enter apply through syncProject. */
    if (FM.groupContext && FM.exitGroup) { try { FM.exitGroup(true); } catch (e) {} }
    if (opts.from === 'cog') pendingFx = true; else if (!opts.quiet) crossfade();
    if (FM.syncSelectionChrome) FM.syncSelectionChrome();
    if (!opts.noRebuild && FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();   // syncProject runs INSIDE a rebuild: no second one
    if (FM._dockSheet) requestAnimationFrame(FM._dockSheet);
    listeners.forEach(f => { try { f(mode); } catch (e) {} });
    /* focus never falls to <body> (§8.10 item 2): if what held it is gone from view, the cog it came from takes it */
    if (!opts.quiet && (!had || had === document.body || !had.isConnected || !had.getClientRects().length)) {
      const c = ['m-settings', 'btn-settings'].map(id => document.getElementById(id)).find(b => b && b.getClientRects().length);
      if (c) { try { c.focus({ preventScroll: true }); } catch (e) {} }
    }
    return true;
  }
  /* Phase 1: a 150 ms crossfade (§6.3); the morph (D11 B: the morph only, his pick) replaces it in Phase 3. From the cog it plays when the cog closes. */
  function crossfade() {
    const panel = document.getElementById('timeline-panel');
    if (!panel || (FM.reducedMotion && FM.reducedMotion())) return;
    panel.classList.remove('ed-xfade'); void panel.offsetWidth; panel.classList.add('ed-xfade');
    setTimeout(() => panel.classList.remove('ed-xfade'), 180);
  }

  /* THE DELIBERATE SWITCH: apply, then remember it on this device. Reached only through request() (and the suite). */
  function set(next, opts) {
    const from = mode;
    if (!apply(next, opts)) return false;
    remember(openPid(), mode);
    if (from !== mode) announce();
    return true;
  }
  function announce() {
    const w = W();
    /* §21 F12: #sm-live sits inside #sm-timeline, which is display:none in Full, so "Full editor" was never read out. One
       visually hidden live region at body level (built here, `ed-live`, outside both timelines) speaks for both. */
    let live = document.getElementById('ed-live');
    if (!live) { live = document.createElement('div'); live.id = 'ed-live'; live.className = 'sm-vh'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); document.body.appendChild(live); }
    if (live) live.textContent = mode === 'simple' ? (w.liveSimple || 'Simple editor') : (w.liveFull || 'Full editor');
    /* First arrival in SIMPLE only, once per device (§6.1). Arriving in Full shows nothing (§0.4 V4). */
    if (mode === 'simple') {
      let seen = null; try { seen = localStorage.getItem('fm.editor.hint'); } catch (e) {}
      if (!seen && FM.toast) { FM.toast(w.firstSimple || 'Simple editor. Switch back any time from the ⚙ cog.', 2600); try { localStorage.setItem('fm.editor.hint', '1'); } catch (e) {} }
    }
  }

  /* THE ONE DOOR (§6.1, §6.4). Resolves true when the editor changed (or already was `to`). */
  async function request(to, o) {
    to = to === 'simple' ? 'simple' : 'full';
    o = o || {};
    if (to === mode) return true;
    const p = plan(to);
    if (p.refuse) return refuse(p.refuse);
    if (p.lose.length) {
      const ok = FM.ask ? await FM.ask(warning(p)) : false;      // Stay, Escape and the scrim answer falsy: nothing touched
      if (!ok) return false;
      const again = plan(to);                                    // the world may have moved while the pop-up was up
      if (again.refuse) return refuse(again.refuse);
      for (const id of again.lose) {
        const h = HOLDS.find(x => x.id === id);
        if (h && !h.keep()) return refuse('unsettled');          // the tool's own Done was not there: stay, lose nothing
      }
    }
    /* §21 F1: apply() refuses while any HOLDS tool is still live (a Done that settles later, a keep that did nothing). Say so in
       the block instead of returning a silent false that leaves the knob, the cog and him all waiting. */
    /* A HOP (Open in Full from a Simple line or chip, DESIGN §6.2 / §9.2): the same guard and the same questions, but it writes
       NO editor memory — one look at an item in Full must not change how the project opens next time (review 6 Oct: it went
       through set(), which saved the card as Full, and skipped every question above). */
    if (o.hop) { if (!apply(to, {})) return refuse('unsettled'); announce(); return true; }
    return set(to, { from: o.from }) || refuse('unsettled');
  }

  FM.editor = {
    mode: () => mode,
    isSimple: () => mode === 'simple',
    enabled: enabled,
    homeFor: homeFor,
    plan: plan,
    request: request,
    apply: apply,
    set: set,                                   // the suite's seam; the app's only caller is request()
    onChange: f => { if (typeof f === 'function') listeners.push(f); },
    /* The cog closed after a switch made from it (cvClose): play the held animation now that it can be seen (§6.3). */
    afterCogClose() { if (pendingFx) { pendingFx = false; crossfade(); } },
    /* Called first thing in every timeline rebuild: a project that just opened gets its own editor, silently. Only a real
       change runs apply, so a rebuild in Full never flushes the text editor or closes a tool (the "off means off" test). */
    syncProject() {
      const pid = openPid();
      if (pid === lastPid) return;
      const want = homeFor(pid);
      if (want === mode) { lastPid = pid; return; }
      if (apply(want, { quiet: true, force: true, noRebuild: true })) lastPid = pid;   // a held tool: retried on the next rebuild
    },
    /* D22 B only: the Settings row flipped. Off goes through the same guard (never a silent discard); if he stays, the row
       flips back on. On: the project returns to its own editor. */
    async onPreviewFlip() {
      if (!GATED) return;
      body().classList.toggle('sm-on', enabled());
      if (!enabled()) { if (mode !== 'full' && !(await request('full', { from: 'settings' }))) FM.settings.set('simpleEditor', true); }
      else { const want = homeFor(openPid()); if (want !== mode) apply(want, { force: true }); }
    },
    /* KEYS (§8.3, §15.1). In Full this answers NOTHING (no E, §0.4 B14). In Simple, the arranging keys that have no Simple
       command yet say so instead of doing Full's thing to a clip on the main track. */
    onKey(e) {
      /* PHASE 2 (DESIGN.md §8.3's table). A / D ripple-trim a main clip with the playhead inside it, else the main clip under
         the playhead (selected first); S splits the selected item, else that main clip; Delete and ⌘D on one main clip are
         Simple's delete and duplicate. An overlay, text or caption item keeps Full's own A / D / Delete / ⌘D (no ripple). */
      /* Phase 2.2 (§8.3): Alt+← / Alt+→ are Move earlier / Move later on one selected main clip (free keys in Full) */
      if (mode === 'simple' && e.altKey && !(e.metaKey || e.ctrlKey) && (e.code === 'ArrowLeft' || e.code === 'ArrowRight') && FM.spine && FM.spine.cmd && FM.spine.cmd.move) {
        const sel = FM.selectionIds ? FM.selectionIds() : [];
        if (sel.length === 1 && FM.spine.read(FM.scene).isMain(sel[0])) { e.preventDefault(); if (!e.repeat) FM.spine.cmd.move(sel[0], e.code === 'ArrowLeft' ? -1 : 1); return true; }
      }
      if (mode !== 'simple' || e.altKey) return false;
      const mod = e.metaKey || e.ctrlKey;
      const S = FM.spine;
      if (!S || !S.cmd) return false;
      const lines = (FM.spineWords && FM.spineWords.lines) || {};
      const ids = FM.selectionIds ? FM.selectionIds() : [];
      const R = S.read(FM.scene);
      const one = ids.length === 1 ? ids[0] : null;
      const t = FM.time || 0;
      const inside = id => { const l = FM.layerById(FM.scene, id); return !!l && t > (+l.start || 0) + 1e-4 && t < (+l.start || 0) + (+l.duration || 0) - 1e-4; };
      const mainTarget = () => {
        if (one && R.isMain(one) && inside(one)) return one;
        const m = S.mainAtTime(R, t);
        if (m && FM.selectLayer && FM.scene.selectedId !== m.id) FM.selectLayer(m.id);
        return m ? m.id : null;
      };
      if (!mod && (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'KeyS')) {
        if (one && !R.isMain(one) && e.code !== 'KeyS') return false;
        e.preventDefault();
        if (e.repeat) return true;
        if (e.code === 'KeyS' && one && !R.isMain(one)) { S.cmd.split(one); return true; }
        const id = mainTarget();
        if (!id) { S.say(lines.noClipHere || 'No clip at the playhead'); return true; }
        if (e.code === 'KeyA') S.cmd.trimHead(id); else if (e.code === 'KeyD') S.cmd.trimTail(id); else S.cmd.split(id);
        return true;
      }
      if (!mod && (e.code === 'Backspace' || e.code === 'Delete')) {
        const mains = ids.filter(id => R.isMain(id));
        if (!mains.length) return false;
        e.preventDefault();
        if (ids.length > 1) { S.say(lines.deleteOne || 'Delete one clip at a time'); return true; }
        S.cmd.del(mains[0]);
        return true;
      }
      if (mod && (e.key === 'd' || e.key === 'D') && one && R.isMain(one)) { e.preventDefault(); S.cmd.duplicate(one); return true; }
      return false;
    },
    _state: () => ({ mode: mode, lastPid: lastPid, pendingFx: pendingFx })   // suite seam
  };

  function wire() {
    if (GATED) body().classList.toggle('sm-on', enabled());
    const sp = document.getElementById('btn-sm-split');
    /* Phase 2: ✂ splits the selected item, or the main clip under the playhead when nothing is selected (§8.5: one home) */
    if (sp && !sp._edWired) { sp._edWired = true; sp.addEventListener('click', () => { if (!FM.spine || !FM.spine.cmd) return; const ids = FM.selectionIds ? FM.selectionIds() : []; FM.spine.cmd.split(ids.length === 1 ? ids[0] : null); }); }
    if (GATED && FM.settings && FM.settings.onChange) FM.settings.onChange(() => { if (!!enabled() !== body().classList.contains('sm-on')) FM.editor.onPreviewFlip(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})(window.FM);
