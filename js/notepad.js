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
 * migrating later.
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

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

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

  // ---- the panel -------------------------------------------------------------------------------
  function open() {
    close();
    const scrim = el('div', 'np-scrim');
    const card = el('div', 'np-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Project notes');

    const head = el('div', 'np-head');
    head.appendChild(el('div', 'np-title', 'Notes'));   // .np-head is the pad's yellow glued edge now (queue 181)
    const hint = el('div', 'np-hint', 'Tick a note to be reminded of it when you export.');
    const body = el('div', 'np-list');

    function render() {
      body.innerHTML = '';
      const rows = list();
      if (!rows.length) body.appendChild(el('div', 'np-empty', 'Nothing noted yet. Add a reminder for this project below.'));
      rows.forEach((n, i) => {
        const row = el('div', 'np-row');
        const tick = el('button', 'np-tick' + (n.remind ? ' on' : ''));
        tick.type = 'button';
        tick.setAttribute('role', 'checkbox');
        tick.setAttribute('aria-checked', n.remind ? 'true' : 'false');
        tick.title = n.remind ? 'Remind me when I export' : 'Just a note — will not interrupt';
        tick.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>';
        tick.addEventListener('click', () => { n.remind = !n.remind; save(); render(); badge(); });

        // A textarea, not a one-line input: a reminder is often a sentence, and a field that hides
        // its own content is a field people stop trusting.
        const ta = el('textarea', 'np-text');
        ta.value = n.text || '';
        ta.rows = 1;
        ta.placeholder = 'Write a note…';
        const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; };
        ta.addEventListener('input', () => { n.text = ta.value; grow(); badge(); });
        ta.addEventListener('change', save);

        const del = el('button', 'np-del', '✕');
        del.type = 'button'; del.title = 'Delete this note';
        del.addEventListener('click', () => { list().splice(i, 1); save(); render(); badge(); });

        row.append(tick, ta, del);
        body.appendChild(row);
        grow();
      });
    }

    const add = el('button', 'btn np-add', '+ Add a note');
    add.addEventListener('click', () => {
      list().push({ id: uid(), text: '', remind: false });
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
    /* A tap outside closes it ON CLICK, and only when the press began on the backdrop (queue 690) — see
       js/ask.js and js/shortcuts.js for the rule. Closing on pointerdown handed the rest of the tap to
       whatever was under the pad: on the phone a second tap on the Notes button shut it on the way down
       and opened it again on the way up, replaying the flip — his #762 exactly. */
    let downOnScrim = false;
    scrim.addEventListener('pointerdown', e => { downOnScrim = e.target === scrim; });
    scrim.addEventListener('click', e => { if (e.target === scrim && downOnScrim) close(); downOnScrim = false; });
    render();
    /* POP OUT OF THE 📒 BUTTON, WITH ITS OWN ANIMATION (queue 548 clauses 1-4). The notepad is the one
       clause where he asked for invention rather than consistency: "it would be cool if the note pad one
       had a unique animation that fit it". So it does not grow like the other three — it FLIPS OPEN over
       its own top edge, the way you turn back the cover of a pad (`pop-note` in styles.css).
       After render(), because popFrom measures the card and an empty card is the wrong size. */
    if (FM.popFrom) popCleanup = FM.popFrom(card, document.getElementById('btn-notes'), { flavour: 'note' });
    // Nothing is focused on open: on a phone that would throw the keyboard up over the list you came
    // to read. The + button focuses its own new row, which is the moment you actually want to type.
  }

  function close() {
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

  function isOpen() { return !!document.querySelector('.np-scrim'); }
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
  FM.notepad = { open: open, close: close, isOpen: isOpen, toggle: toggle, escape: escape, pending: pending, confirmExport: confirmExport, sync: badge };
})(window.FM);
