/* FreeMotion — ONE drawn ✕ for every close and delete button (queue 965).
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
})(window.FM);
