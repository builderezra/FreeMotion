/* FreeMotion — ONE drawn ✕ for every close and delete button (queue 965), and, since #1255, the app's own drawn icons (FM.ICON, at
 * the foot of this file) and the cog named inside a sentence (FM.IC.cog, FM.lineInto).
 *
 * Ezra, 26 Sep, on the Settings panel's close button: "Redesign the X for this menu and make it actually look good or
 * just use the same design that you're gonna use for the other ex … the one for when you're searching stuff". His pick
 * was B — the search box's drawn ✕ (#951) at 28px — and his yes to the sweep: every text ✕ in the app gets the same one.
 *
 * WHY DRAWN. A ✕ typed as text is placed by the FONT: it sat a pixel low as a thin speck in the search box (#951), and
 * the same glyph did the same in ten more buttons. A disc and a cross drawn in a 22-unit box are centred by geometry,
 * so one helper gives every button the same centred mark, sized to fit it.
 *
 * Built with createElementNS — constant markup, no text from anywhere — and the button keeps its own type, title,
 * aria-label and click handler; only its CONTENT changes. The colours are the search ✕'s: the dark defaults in
 * styles.css (.fm-x-disc / .fm-x-cross) and the light-Home disc in theme-glass.css. Loaded before every file that
 * builds one of these buttons (index.html), and every caller checks FM.drawnX first, so a missing file degrades to the
 * old text ✕ rather than to an empty button. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  FM.drawnX = function (btn, size) {
    if (!btn) return btn;
    const px = String(size || 22);
    btn.textContent = '';
    btn.classList.add('fm-x');
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 22 22');
    svg.setAttribute('width', px);
    svg.setAttribute('height', px);
    svg.setAttribute('aria-hidden', 'true');
    const disc = document.createElementNS(NS, 'circle');
    disc.setAttribute('class', 'fm-x-disc');
    disc.setAttribute('cx', '11'); disc.setAttribute('cy', '11'); disc.setAttribute('r', '11');
    const cross = document.createElementNS(NS, 'path');
    cross.setAttribute('class', 'fm-x-cross');
    cross.setAttribute('d', 'M7.6 7.6l6.8 6.8M14.4 7.6l-6.8 6.8');
    svg.appendChild(disc);
    svg.appendChild(cross);
    btn.appendChild(svg);
    /* The ✕ WAS the accessible name of a button with no label; the drawing is aria-hidden, so name it. */
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', btn.title || 'Close');
    return btn;
  };

  /* ═══ #1255: THE APP'S OWN DRAWN ICONS, where a character stood that a phone draws as a colour emoji ═══════════════════════════
   * His words, 23 Nov: "no emojis on text or buttons anywhere in the app. Design our own icons instead." A play triangle, a two-way
   * arrow, a cog and a warning sign are ordinary characters on a PC and COLOUR EMOJI on an iPhone, so a typed one is an emoji in
   * practice. These are from the set he passed on 24 Nov ("the pen could definitely be different. The rest are fine"; the pen is not
   * here), each drawn in a 24-unit box in the text's own colour. Only the ones the app draws through this table are in it.
   * ONE DRAWING PER THING (his words on the Templates icon, 24 Nov: "I just want them to be consistent"): `template` is the Stacked
   * cards he picked for every Templates spot, and `tutorial` and `element` are Home's own tab icons, so an empty tab's mark is its
   * tab's picture and not a near-copy of it. A test compares Home's tabs and the Add menu's Template tab with this table.
   * FM.iconHTML(name, cls) is the markup and FM.drawnIcon(name, cls) the element: constant strings, nothing from anywhere else. A
   * name that is not in the table gives '' and null, so a mistyped name draws nothing instead of a wrong picture (tests read the
   * names the callers pass). */
  FM.ICON = {
    play: '<path d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.9-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7z"/>',
    tutorial: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m10 8 6 4-6 4z"/>',   // Home's Tutorials tab, the same drawing (index.html)
    template: '<path d="M7.5 7.5V5a2 2 0 0 1 2-2H19a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2h-1.5"/><rect x="3" y="7.5" width="14.5" height="13.5" rx="2.5"/><path d="M8.6 11.5v5.5l4.5-2.75z"/>',
    element: '<path d="M7 3 3 10h8z"/><rect x="3" y="15" width="8" height="6" rx="1.2"/><circle cx="17.5" cy="17.5" r="3.5"/><path d="M15 3h6v6h-6z"/>',   // Home's Elements tab, the same drawing (index.html)
    move: '<path d="M4 12h16"/><path d="M7.5 8.5 4 12l3.5 3.5"/><path d="M16.5 8.5 20 12l-3.5 3.5"/>',
    cog: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  };
  FM.iconHTML = function (name, cls) {
    const d = Object.prototype.hasOwnProperty.call(FM.ICON, name) ? FM.ICON[name] : '';
    if (!d) return '';
    return '<svg class="fm-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
  };
  FM.drawnIcon = function (name, cls) {
    const html = FM.iconHTML(name, cls);
    if (!html) return null;
    const t = document.createElement('template');
    t.innerHTML = html;
    return t.content.firstChild;
  };

  /* AN ICON NAMED INSIDE A SENTENCE ("Change it in [the cog] → Canvas"). The sentence carries ONE private-use character for the icon
     (FM.IC.cog), so it is still a plain string wherever it travels. The two places that show such a line, FM.toast and FM.ask's
     message, hand it to FM.lineInto, which draws the icon and writes the button's own name beside it for a screen reader (hidden,
     .fm-sr-only); whatever can only take plain text (the spoken copy of a toast) uses FM.lineWords. A line that names no icon is set
     as text, exactly as before, so the 240-odd other toasts are untouched. Built from nodes, never from markup: the rest of the
     line may be a project's name. */
  const LINE_IC = { '\uE1C0': ['cog', 'Settings'] };   // the cog button's own name (index.html #btn-settings)
  const LINE_RE = /([\uE1C0])/;
  FM.IC = { cog: '\uE1C0' };
  FM.lineWords = function (text) {
    return String(text == null ? '' : text).replace(/[\uE1C0]/g, function (ch) { return LINE_IC[ch][1]; });
  };
  FM.lineInto = function (el, text) {
    text = String(text == null ? '' : text);
    if (!LINE_RE.test(text)) { el.textContent = text; return el; }
    el.textContent = '';
    const line = document.createElement('span');   // ONE box: shown in a flex row (a tappable toast is one) the words keep their spaces
    text.split(LINE_RE).forEach(function (part) {
      if (!part) return;
      const ic = LINE_IC[part];
      if (!ic) { line.appendChild(document.createTextNode(part)); return; }
      const mark = FM.drawnIcon(ic[0], 'fm-ic-inline');
      if (mark) line.appendChild(mark);
      const word = document.createElement('span');
      word.className = 'fm-sr-only';
      word.textContent = ic[1];
      line.appendChild(word);
    });
    el.appendChild(line);
    return el;
  };
})(window.FM);
