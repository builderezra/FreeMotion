/* ask.js — FreeMotion's own prompt() and confirm() (queue 919).
 *
 * Ezra, 22 Sep, answering the #912 big-change ask — "Rename, Delete, Save as template and similar pop-ups
 * on Home are the phone's built-in grey boxes. They can't follow light/dark or animate. Replace them with
 * FreeMotion's own pop-ups?" — verbatim: "Yes, make our own (Recommended)".
 *
 *   FM.ask({ title, message, input: { value, placeholder }, ok: 'Rename', cancel: 'Cancel', danger: true })
 *     → Promise: with `input`, the text in the field (untrimmed, exactly as prompt() returned it) or null;
 *                without it, true or null. Cancel, Escape and a tap on the scrim all give null, so every
 *                `if (!n || !n.trim()) return` / `if (!confirm(…)) return` caller keeps its meaning after
 *                an `await`.
 *
 * It is the #hm-dialog card family, not a lookalike: `.fm-ask-card` is added to the same selector lists as
 * `.hm-dlg-card` (styles.css, theme-glass.css), so it wears the same glass, swings open with the same
 * fm-hinge-panel on a phone and pop-grow on PC, and stands still under prefers-reduced-motion.
 *
 * ⚠️ WHY NOT JUST REUSE `.hm-dlg-card`. Its light-look rules are `html[data-home="light"] .hm-dlg-card`,
 * which is only safe because #hm-dialog lives INSIDE #home-screen. This one lives on <body>, because
 * Settings opens it too and Settings opens from the editor — and data-home stays "light" in the editor,
 * which is dark whatever it is set to (the #864 trap: a rule that cannot tell the two apart turns the
 * editor's pop-ups white). So the light look is decided HERE, at open time, by the same on-screen test
 * contextmenu.js makes for .ctx-light, and the CSS reads a class.
 *
 * ⚠️ USER TEXT GOES IN AS TEXT. Titles and messages quote project, template and element names — his
 * words, typed by him, and a name like `<img onerror=…>` must print as those characters. Everything is
 * textContent / .value; nothing here touches innerHTML. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let scrim = null, card = null, titleEl = null, msgEl = null, input = null, okBtn = null, cancelBtn = null;
  let line = null, area = null;   // the one-line field and the multi-line one; `input` is whichever is showing
  let pending = null;        // { resolve, withInput } for the dialog on screen, or null
  let returnFocus = null;    // what had focus before, so Tab / a screen reader land back where they were
  let downOnScrim = false;   // the press that started on the scrim itself — see the click handler

  function el(tag, cls, id) { const e = document.createElement(tag); if (cls) e.className = cls; if (id) e.id = id; return e; }

  function build() {
    scrim = el('div', 'hidden', 'fm-ask');
    card = el('div', 'fm-ask-card');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'fm-ask-title');
    card.setAttribute('aria-describedby', 'fm-ask-msg');
    titleEl = el('div', 'fm-ask-title', 'fm-ask-title');
    msgEl = el('div', 'fm-ask-msg', 'fm-ask-msg');
    input = line = el('input', 'fm-ask-input');
    input.type = 'text';
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.setAttribute('enterkeyhint', 'done');   // the phone keyboard's return key says what it does
    /* `input: { multiline: true }` (queue 921 S7 review): a comment is written in a textarea, and an
       <input type=text> strips every line break out of the value it is given — so editing one joined its
       lines into one, even on a Save with nothing changed. */
    area = el('textarea', 'fm-ask-input fm-ask-area hidden');
    area.rows = 4;
    area.spellcheck = true;
    const actions = el('div', 'fm-ask-actions');
    cancelBtn = el('button', 'fm-ask-cancel'); cancelBtn.type = 'button';
    okBtn = el('button', 'fm-ask-ok'); okBtn.type = 'button';
    actions.appendChild(cancelBtn); actions.appendChild(okBtn);
    card.appendChild(titleEl); card.appendChild(msgEl); card.appendChild(line); card.appendChild(area); card.appendChild(actions);
    scrim.appendChild(card);
    document.body.appendChild(scrim);

    cancelBtn.addEventListener('click', () => finish(null));
    okBtn.addEventListener('click', () => finish(answer()));
    /* THE SCRIM CANCELS ON CLICK, NOT ON POINTERDOWN. Hiding on pointerdown hands the rest of that tap —
       the pointerup and the click — to whatever was under the scrim, which on Home is a project card: a
       tap meant to dismiss would open a project. On click the whole gesture has landed here and is spent.
       And only when the press STARTED on the scrim: dragging to select the name in the field and letting
       go past the card's edge fires its click on the scrim too, and that is not a request to cancel. */
    scrim.addEventListener('pointerdown', e => { downOnScrim = e.target === scrim; });
    scrim.addEventListener('click', e => { if (e.target === scrim && downOnScrim) finish(null); downOnScrim = false; });
  }

  function answer() { return pending && pending.withInput ? input.value : true; }

  /* WINDOW, CAPTURE PHASE — the first listener any key reaches — and it stops every key from going further.
     Behind this card is either Home, whose own Escape closes #hm-dialog, or Settings, whose Escape closes
     the whole panel, or the editor, whose bare-key shortcuts (Backspace deletes the selected layer) do not
     check what has focus when it is a button. A modal owns the keyboard. The browser's own handling of the
     key — typing, Tab, Space on a button — is untouched: that is preventDefault's business, not this. */
  function onKey(e) {
    if (!pending) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); finish(null); return; }
    if (e.key === 'Enter') {
      if (e.isComposing || e.keyCode === 229) return;   // an IME confirming a word, not the dialog
      if (e.target === area && !(e.metaKey || e.ctrlKey)) return;   // a new line; ⌘/Ctrl+Enter answers
      e.preventDefault();
      finish(e.target === cancelBtn ? null : answer());   // Enter on a Tabbed-to Cancel means Cancel
      return;
    }
    if (e.key === 'Tab') {   // keep focus inside the card; anything behind it is not reachable while it is up
      const stops = [pending.withInput ? input : null, cancelBtn.classList.contains('hidden') ? null : cancelBtn, okBtn].filter(Boolean);
      const i = stops.indexOf(document.activeElement);
      e.preventDefault();
      stops[(i + (e.shiftKey ? stops.length - 1 : 1) + stops.length) % stops.length].focus();
    }
  }

  function finish(value) {
    if (!pending) return;
    const p = pending; pending = null;
    scrim.classList.add('hidden');
    window.removeEventListener('keydown', onKey, true);
    const back = returnFocus; returnFocus = null;
    if (back && back.isConnected && typeof back.focus === 'function') { try { back.focus({ preventScroll: true }); } catch (e) {} }
    p.resolve(value);
  }

  FM.ask = function ask(opts) {
    opts = opts || {};
    if (!scrim) build();
    if (pending) finish(null);   // a second ask replaces the first, which answers Cancel — never two cards
    const withInput = !!opts.input;
    const multi = withInput && !!opts.input.multiline;
    titleEl.textContent = opts.title || '';
    titleEl.classList.toggle('hidden', !opts.title);
    msgEl.textContent = opts.message || '';
    msgEl.classList.toggle('hidden', !opts.message);
    line.classList.toggle('hidden', !withInput || multi);
    area.classList.toggle('hidden', !multi);
    input = multi ? area : line;
    input.value = withInput && opts.input.value != null ? String(opts.input.value) : '';
    input.placeholder = withInput && opts.input.placeholder ? String(opts.input.placeholder) : '';
    input.setAttribute('aria-label', opts.message || opts.title || 'Name');
    cancelBtn.textContent = opts.cancel || 'Cancel';
    /* `single: true` (queue 921 S7 review): a notice has one answer. "Exporting is turned off" drew Close
       AND OK side by side, both doing the same thing — on a phone that reads as a choice there is not. */
    cancelBtn.classList.toggle('hidden', !!opts.single);
    okBtn.textContent = opts.ok || 'OK';
    okBtn.classList.toggle('danger', !!opts.danger);
    okBtn.classList.toggle('accent', !opts.danger);
    card.setAttribute('role', withInput ? 'dialog' : 'alertdialog');
    const home = document.getElementById('home-screen');
    const onLightHome = !!home && !home.classList.contains('hidden')
                     && document.documentElement.getAttribute('data-home') === 'light';
    scrim.classList.toggle('fm-ask-light', onLightHome);
    scrim.classList.toggle('fm-ask-has-input', withInput);
    returnFocus = document.activeElement;
    // display:none → flex restarts the card's CSS entrance, exactly as #hm-dialog's does
    scrim.classList.remove('hidden');
    window.addEventListener('keydown', onKey, true);
    /* FOCUS NOW, INSIDE THE TAP THAT OPENED IT. Every caller runs from a click (a ⋯ menu row, a Settings
       button), and iOS only raises the keyboard for a focus() made during a user gesture — a setTimeout
       here would leave him tapping the field first, which the native prompt() never asked of him. The name
       is selected so typing replaces it, which is what prompt() did too. A confirm focuses its answer, so
       Enter is OK there as it was. */
    if (withInput) { input.focus(); try { input.select(); } catch (e) {} }
    else okBtn.focus();
    return new Promise(resolve => { pending = { resolve, withInput }; });
  };
  FM.ask.isOpen = () => !!pending;
})(window.FM);
