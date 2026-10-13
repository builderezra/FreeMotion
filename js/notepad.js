/* FreeMotion — the project notepad (queue 139).
 *
 * Ezra: "In the top menu, put a little note pad icon and make it so you can add notes about the
 * project and reminders, make it so you can tick wether it will remind you to do these things when
 * you press the export button, so anytime you press export it'll give you a pop up first showing the
 * reminder."
 *
 * Two things in one, and the distinction is the whole design:
 *   · a NOTE is something you wrote down. It never interrupts you.
 *   · a REMINDER is a note you ticked, and it is shown once, before the export dialog opens.
 * An untickable list would be a to-do app; a list that always interrupted would be worse than no
 * feature, which is why the pre-export card does not appear at all when nothing is ticked.
 *
 * Notes live on the PROJECT (scene.project.notes) so they travel with it, save with it, and are gone
 * when it is. They are plain {id, text, remind} — no dates, no ordering rules, nothing that needs
 * migrating later. (One optional key since queue 987: `by`, who wrote it, and only in a live session —
 * see liveAuthor.)
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function list() {
    const P = FM.scene && FM.scene.project;
    if (!P) return [];
    if (!Array.isArray(P.notes)) P.notes = [];
    return P.notes;
  }
  function uid() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  let popCleanup = null;   // queue 548 — see the popFrom call in open()
  let remindBack = null;   // queue 690 — while the "Before you export" card is up, how to press its Back
  let sizer = null;        // queue 927 — the small/BIG grip (js/panelsize.js)
  let folding = null;      // queue 927 — a close that is still folding into the button
  let curScrim = null;     // the notepad's own scrim (the export reminder and the comments card are np-scrims too)
  let liveRefresh = null;  // queue 987 — while the panel is open, how a friend's change redraws it (see open())

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  /* WHO WROTE IT (queue 987). Ezra: "If you're doing a collab edit - there should be a colour indicator based on who
   * left the note." Three were drawn (tools/design/987/) and C was picked: the author's FACE beside the note — the same
   * initial in their colour as the people chip on the video and every comment's byline (collab-comments.js `face`),
   * not a new circle drawn its own way.
   * A note made while a session is live carries `by: {mid, name, color}` — the member id the people layer knows each
   * person by, and the name and colour so the face can still be drawn once they have left. What this device writes is
   * only its guess: the HOST stamps the real one on every new note and keeps it through every later edit, so fixing a
   * friend's typo leaves the note theirs (collab-host.js `stampNotes`).
   * ⚠️ ALONE, NOTHING IS WRITTEN: no session, no `by` key at all, so a solo project's notes save byte for byte as they
   * always did — and with no author on any note, no face is drawn. */
  function liveAuthor() {
    const C = FM.collab, s = C && C.session;
    if (!C || !C.active || !s || s.ended || s.active === false) return null;
    const by = (C.comments && C.comments.author) ? C.comments.author() : null;
    return (by && typeof by.mid === 'string' && by.mid) ? by : null;
  }
  /* Drawn only from an author that looks like one — anything else a file or a peer put there is ignored (and storage.js
     strips it on load). The face cleans the name and matches the colour against the palette itself. */
  function authorOf(n) {
    const b = n && n.by;
    return (b && typeof b === 'object' && !Array.isArray(b) && typeof b.mid === 'string' && b.mid) ? b : null;
  }
  function face(by) {
    const CM = FM.collab && FM.collab.comments;
    if (!CM || !CM.face) return null;
    const f = CM.face(by);
    f.classList.add('np-face');
    const who = String(typeof by.name === 'string' ? by.name : '').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, 32) || 'Someone';
    f.title = who + '’s note';
    f.setAttribute('aria-label', 'Written by ' + who);
    return f;
  }

  /* The notes that will actually stop an export. Everything downstream asks THIS rather than filtering
   * the list itself, so "what counts as a reminder" is defined once. */
  function pending() {
    return list().filter(n => n && n.remind && String(n.text || '').trim());
  }

  function save() {
    if (FM.history) FM.history.commit();
    if (FM.storage && FM.storage.markDirty) FM.storage.markDirty();
  }

  function badge() {
    const due = pending().length > 0;
    // Two dots now (queue 171): the desktop bar's and the phone bar's. Only one is ever on screen, but
    // the phone's was added later and a badge that lights on one device only is worse than none.
    ['btn-notes-dot', 'm-notes-dot'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.classList.toggle('on', due);
    });
  }

  /* The Notes button that is on screen — the PC transport row's or the phone top bar's. The fold (#927) lands
     on it, so it must be the one he can see. The phone bar's first at a phone width: a narrow desktop window lays
     out BOTH (measured: the transport row's at 83,379 as well as the top bar's), and the fold flew to the wrong one. */
  function notesButton() {
    const phone = window.matchMedia('(max-width: 700px)').matches;
    for (const id of (phone ? ['m-notes', 'btn-notes'] : ['btn-notes', 'm-notes'])) {
      const b = document.getElementById(id);
      if (b && b.getBoundingClientRect().width > 0) return b;
    }
    return null;
  }

  // ---- the panel -------------------------------------------------------------------------------
  function open() {
    closeNow();
    const scrim = el('div', 'np-scrim');
    const card = el('div', 'np-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Project notes');

    const head = el('div', 'np-head');
    head.appendChild(el('div', 'np-title', 'Notes'));   // .np-head is the pad's yellow glued edge now (queue 181)
    const hint = el('div', 'np-hint', 'Tick a note to be reminded of it when you export.');
    const body = el('div', 'np-list');
    let stale = false, staleTimer = 0, pressing = false;   // queue 987 — a friend's change waiting to be drawn (below)

    function render() {
      stale = false; clearTimeout(staleTimer);
      body.innerHTML = '';
      const rows = list();
      if (!rows.length) body.appendChild(el('div', 'np-empty', 'Nothing noted yet. Add a reminder for this project below.'));
      const authored = rows.some(authorOf);   // queue 987: if any note has a face, a note without one keeps its words in line
      rows.forEach(n => {
        /* THE NOTE AS THE LIST HOLDS IT NOW (queue 987). A friend's batch can swap the note objects under an open panel
           (a whole-list set copies them in), and a row that kept writing to the object it was drawn from wrote to one
           nobody saves; ✕ deleted by POSITION, so after a friend's delete it removed the WRONG note. Found by id, each
           lands on the note this row shows — or on nothing, if it has gone. */
        const cur = () => {
          const L = list();
          if (L.indexOf(n) >= 0) return n;
          for (let j = 0; j < L.length; j++) if (L[j] && n.id != null && L[j].id === n.id) return L[j];
          return null;
        };
        const row = el('div', 'np-row');
        if (typeof n.id === 'string') row.setAttribute('data-nid', n.id);   // which note a row is, as the comments card's data-cid (#987)
        const tick = el('button', 'np-tick' + (n.remind ? ' on' : ''));
        tick.type = 'button';
        tick.setAttribute('role', 'checkbox');
        tick.setAttribute('aria-checked', n.remind ? 'true' : 'false');
        tick.title = n.remind ? 'Remind me when I export' : 'Just a note — will not interrupt';
        tick.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>';
        tick.addEventListener('click', () => { const c = cur(); if (c) { c.remind = !c.remind; save(); } render(); badge(); });

        // A textarea, not a one-line input: a reminder is often a sentence, and a field that hides
        // its own content is a field people stop trusting.
        const ta = el('textarea', 'np-text');
        ta.value = n.text || '';
        ta.rows = 1;
        ta.placeholder = 'Write a note…';
        // BIG (#927) lets a long note show more of itself before it scrolls
        const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(card.classList.contains('pb-big') ? 420 : 160, ta.scrollHeight) + 'px'; };
        ta.addEventListener('input', () => { const c = cur(); if (c) c.text = ta.value; grow(); badge(); });
        ta.addEventListener('np-fit', grow);   // the panel changed size (#927)
        ta.addEventListener('change', save);

        const del = el('button', 'np-del', '✕');
        del.type = 'button'; del.title = 'Delete this note';
        if (FM.drawnX) FM.drawnX(del, 18);   // queue 965: one drawn ✕ for the app
        del.addEventListener('click', () => {
          const L = list(), at = L.indexOf(cur());
          if (at >= 0) { L.splice(at, 1); save(); }
          render(); badge();
        });

        /* queue 987, option C: the author's face between the tick and the words — only on a note that has an author. */
        const by = authorOf(n), f = by ? face(by) : null;
        row.appendChild(tick);
        if (f) row.appendChild(f);
        else if (authored) row.appendChild(el('span', 'np-face-gap'));
        row.append(ta, del);
        body.appendChild(row);
        grow();
      });
    }

    /* A FRIEND'S CHANGE REDRAWS THE PANEL (queue 987) — never under a finger. A redraw replaces every field, so a note
       being typed into would lose its cursor (a phone, its keyboard), and a tap begun on a tick would land on a button
       that is gone. So it waits until no note is focused and nothing on the card is pressed, looking again every 400 ms
       — and a tap on a tick, ✕ or + redraws anyway, which settles it. Where the list was scrolled to is kept. */
    const typing = () => { const f = document.activeElement; return !!(f && f.classList && f.classList.contains('np-text') && card.contains(f)); };
    const unpress = () => { setTimeout(() => { pressing = false; }, 60); };   // after the click that the press became
    card.addEventListener('pointerdown', () => { pressing = true; }, true);
    card.addEventListener('pointerup', unpress, true);
    card.addEventListener('pointercancel', unpress, true);
    const redraw = () => { const a = body.scrollTop, b = card.scrollTop; render(); body.scrollTop = a; card.scrollTop = b; };
    const later = () => {
      clearTimeout(staleTimer);
      staleTimer = setTimeout(() => {
        if (!stale || !card.isConnected) return;
        if (typing() || pressing) { later(); return; }
        redraw();
      }, 400);
    };
    liveRefresh = () => {
      if (!card.isConnected) return;
      if (typing() || pressing) { stale = true; later(); return; }
      redraw();
    };

    const add = el('button', 'btn np-add', '+ Add a note');
    add.addEventListener('click', () => {
      const note = { id: uid(), text: '', remind: false };
      const by = liveAuthor();
      if (by) note.by = by;   // queue 987: in a live session only — alone the note is exactly what it always was
      list().push(note);
      save(); render();
      const fields = body.querySelectorAll('.np-text');
      if (fields.length) fields[fields.length - 1].focus();
    });

    const actions = el('div', 'np-actions');
    const done = el('button', 'btn np-done', 'Done');   // NOT btn-accent: that is the app's blue, and this sheet is paper (queue 181)
    done.addEventListener('click', close);
    actions.appendChild(done);

    card.append(head, hint, body, add, actions);
    scrim.appendChild(card);
    document.body.appendChild(scrim);
    curScrim = scrim;
    /* A tap outside closes it ON CLICK, and only when the press began on the backdrop (queue 690) — see
       js/ask.js and js/shortcuts.js for the rule. Closing on pointerdown handed the rest of the tap to
       whatever was under the pad: on the phone a second tap on the Notes button shut it on the way down
       and opened it again on the way up, replaying the flip — his #762 exactly. */
    let downOnScrim = false;
    scrim.addEventListener('pointerdown', e => { downOnScrim = e.target === scrim; });
    scrim.addEventListener('click', e => { if (e.target === scrim && downOnScrim) close(); downOnScrim = false; });
    /* SMALL OR BIG (queue 927) — before popFrom, so a notepad he left big opens big and centred rather than
       hanging off the button first. */
    if (FM.panelSize) sizer = FM.panelSize.attach(card, {
      key: 'notes', name: 'Notes', button: notesButton,
      parts: () => [hint, body, add, actions],
      onChange: () => body.querySelectorAll('.np-text').forEach(t => t.dispatchEvent(new Event('np-fit')))
    });
    render();
    /* POP OUT OF THE 📒 BUTTON, WITH ITS OWN ANIMATION (queue 548 clauses 1-4). The notepad is the one
       clause where he asked for invention rather than consistency: "it would be cool if the note pad one
       had a unique animation that fit it". So it does not grow like the other three — it FLIPS OPEN over
       its own top edge, the way you turn back the cover of a pad (`pop-note` in styles.css).
       After render(), because popFrom measures the card and an empty card is the wrong size. */
    if (FM.popFrom) popCleanup = FM.popFrom(card, document.getElementById('btn-notes'), { flavour: 'note' });
    if (sizer) sizer.refresh();   // which corner the grip sits on depends on whether popFrom hung it off the button
    // Nothing is focused on open: on a phone that would throw the keyboard up over the list you came
    // to read. The + button focuses its own new row, which is the moment you actually want to type.
  }

  /* CLOSING WHILE BIG FOLDS INTO THE BUTTON (queue 927 clause 8): "it kind of like shrinks down onto itself before
     closing so it's like shrinking and then folding into the button". The notepad counts as closed from the first
     frame of that — isOpen() is false, a tap on the button opens it again at once — and the scrim is only taken
     away when the fold lands. Small closes the way it always has. */
  function close(o) {
    liveRefresh = null;   // closed from the first frame of a fold (#927), so a friend's change no longer redraws it (#987)
    if (o && o.now === true) { closeNow(); return; }   // e.g. a test tidying up: no fold
    const scrim = curScrim && curScrim.isConnected && !curScrim.classList.contains('np-closing') ? curScrim : null;
    if (scrim && sizer && sizer.isBig() && !folding) {
      const s = sizer, pc = popCleanup;
      sizer = null; popCleanup = null;
      scrim.classList.add('np-closing');
      folding = s.fold(() => {
        folding = null;
        s.detach();
        if (pc) pc();   // after the fold: the button stays lifted over the scrim until the panel has gone into it
        scrim.remove();
        badge();
      });
      badge();
      return;
    }
    closeNow();
  }
  function closeNow() {
    if (folding) folding.finish();   // a fold still in flight ends now, and cleans up after itself
    if (sizer) { sizer.detach(); sizer = null; }
    curScrim = null;
    liveRefresh = null;   // queue 987
    if (popCleanup) { popCleanup(); popCleanup = null; }   // the button stays lifted above the scrim otherwise
    /* COMMIT THE LINE BEING TYPED FIRST (queue 690). A note is saved on its field's `change`, which fires when
       the field loses focus — a tap on Done or on the backdrop does that on the way. Esc while typing (the
       editor's key handler, js/app.js) closes the pad with the cursor still in the field, and removing a
       focused field does not blur it (measured in Chrome: no blur, no change), so the note was in memory but
       never committed or marked for saving. With this, a real Esc after typing commits it like Done does. */
    const f = document.activeElement;
    if (f && f.closest && f.closest('.np-scrim') && f.blur) f.blur();
    document.querySelectorAll('.np-scrim').forEach(n => n.remove());
    badge();
  }

  /* ---- the pre-export card --------------------------------------------------------------------
   * Shown ONCE, before the export dialog, and only when something is ticked. Resolves to true when
   * the export should carry on. "Export anyway" is deliberately the quieter button: the whole point
   * of a reminder is that you probably meant to do the thing first.
   */
  function confirmExport() {
    return new Promise(resolve => {
      const due = pending();
      if (!due.length) { resolve(true); return; }   // nothing ticked → never interrupt
      const scrim = el('div', 'np-scrim np-remind');
      const card = el('div', 'np-card np-card--remind');
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');
      const head = el('div', 'np-head');
      const title = el('div', 'np-title', '');
      head.appendChild(title);
      card.appendChild(head);
      const ul = el('div', 'np-remind-list');
      const actions = el('div', 'np-actions');
      const back = el('button', 'btn np-back', 'Back');
      const go = el('button', 'btn np-anyway', '');

      /* TICKING OFF, RIGHT HERE (queue 176). Ezra: "put an option in that menu to tick off the notes."
       * Until now this card was read-only, so dealing with a reminder meant Back → notepad → untick →
       * export again, which is three screens to say "yes, done that".
       * The row STAYS once ticked, struck through, rather than disappearing: the list must not jump
       * under the finger at the moment you are deciding whether to export, and a wrong tap has to be
       * undoable without leaving. The snapshot `due` is what gets rendered for the same reason — the
       * card shows the notes it opened with, whatever you do to them while it is up. */
      const refresh = () => {
        const left = due.filter(n => n.remind).length;
        title.textContent = left === 0 ? 'All clear' :
          left === 1 ? 'Before you export' : 'Before you export — ' + left + ' reminders';
        // "Export anyway" is the quiet button while something is outstanding; once nothing is, it is
        // just Export, and there is no longer anything to be quiet about.
        go.textContent = left === 0 ? 'Export' : 'Export anyway';
        go.classList.toggle('np-anyway', left > 0);
        go.classList.toggle('np-back', left === 0);
      };

      due.forEach(n => {
        const r = el('div', 'np-remind-row');
        const tick = el('button', 'np-remind-tick');
        tick.type = 'button';
        tick.setAttribute('role', 'checkbox');
        tick.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>';
        const paint = () => {
          const done = !n.remind;
          r.classList.toggle('done', done);
          tick.setAttribute('aria-checked', done ? 'true' : 'false');
          tick.title = done ? 'Still outstanding? Tap to put it back' : 'Tick this off';
        };
        tick.addEventListener('click', () => { n.remind = !n.remind; save(); paint(); refresh(); badge(); });
        r.appendChild(tick);
        r.appendChild(el('span', 'np-remind-text', String(n.text || '').trim()));
        paint();
        ul.appendChild(r);
      });
      card.appendChild(ul);
      const finish = (v) => { remindBack = null; scrim.remove(); badge(); resolve(v); };
      remindBack = () => finish(false);   // Escape = Back (queue 690) — see escape() below
      back.addEventListener('click', () => finish(false));
      go.addEventListener('click', () => finish(true));
      actions.append(back, go);
      card.appendChild(actions);
      refresh();
      scrim.appendChild(card);
      document.body.appendChild(scrim);
      /* Same as the pad (queue 690): on click, not pointerdown. Closing on the way down let the tap carry on
         to what was underneath — on the phone that is the Export button, which pressed Export again and put
         this card straight back. */
      let downOnScrim = false;
      scrim.addEventListener('pointerdown', e => { downOnScrim = e.target === scrim; });
      scrim.addEventListener('click', e => { if (e.target === scrim && downOnScrim) finish(false); downOnScrim = false; });
    });
  }

  function isOpen() { return !!document.querySelector('.np-scrim:not(.np-closing)'); }   // a panel folding away is already closed (#927)
  function toggle() { if (isOpen()) close(); else open(); }   // a second tap on the Notes button CLOSES it (queue 762)
  /* ESCAPE (queue 690). Neither card listened for it, so on a PC Escape fell through to the editor and
     deselected the layer behind them. Answered for the app's Escape branch (js/app.js), true when it
     closed something. The reminder card goes out through its own Back, NEVER through close(): close()
     removes every .np-scrim, and the export that is awaiting confirmExport's promise would then wait
     for an answer that can no longer come. */
  function escape() {
    if (remindBack) { remindBack(); return true; }
    if (isOpen()) { close(); return true; }
    return false;
  }
  /* queue 987: a friend's batch touched the notes (collab-bridge.js afterApply) — the dot follows, and an open panel
     redraws when nothing is under his finger (see open()). */
  function onRemote() { badge(); if (liveRefresh) liveRefresh(); }
  FM.notepad = { open: open, close: close, isOpen: isOpen, toggle: toggle, escape: escape, pending: pending, confirmExport: confirmExport, sync: badge, onRemote: onRemote };
})(window.FM);
