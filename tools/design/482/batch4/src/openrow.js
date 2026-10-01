/* #482 batch 4 — an OPEN filter row: the picked filter (window.__b4pick) really added to the photo layer — the same
   container Add lands, fitToLayer(filters.makeInstance) — and opened in the Visual stack. window.__b4str sets its Strength
   (what the bar set before Add); window.__b4rowcmp draws the proposed ◐ beside ⋯. Runs after setup.js; nothing on disk. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const L = FM.selectedLayer(FM.scene);
FM._fxPreview = null;
const box = FM.fxRegistry.fitToLayer(FM.filters.makeInstance(window.__b4pick || 'tealorange'), L);
box._expanded = true;
if (window.__b4str != null) { box.params = box.params || {}; box.params.strength = window.__b4str; }   // what the bar set before Add
L.effects = [box];
FM.inspector.openCategory('effects'); FM.inspector.refresh();
FM.requestRender && FM.requestRender();
await sleep(2900);
const row = document.querySelector('#inspector-panel .fx-row.fx-open');
if (row) row.scrollIntoView({ block: 'start' });
await sleep(300);
/* ◐ ON THE OPEN FILTER ROW (option drawing, not app code): an fx-icon-btn beside ⋯, the row's own button class. */
if (row && window.__b4rowcmp) {
  const more = row.querySelector('.fx-head .fx-icon-btn');
  const b = document.createElement('button'); b.className = 'fx-icon-btn'; b.title = 'Hold to see it without filters';
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:20px;height:20px"><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.8a8.2 8.2 0 0 0 0 16.4z" fill="currentColor" stroke="none"/></svg>';
  b.style.color = 'var(--text)';
  more.parentNode.insertBefore(b, more);
  const tag = document.createElement('div');
  tag.textContent = 'hold';
  tag.style.cssText = 'position:fixed;z-index:60;padding:3px 8px;border-radius:999px;background:var(--accent);color:#04120f;font:700 11px -apple-system,system-ui,sans-serif;pointer-events:none';
  document.body.appendChild(tag);
  const r2 = b.getBoundingClientRect(); tag.style.left = (r2.left + r2.width / 2 - 17) + 'px'; tag.style.top = (r2.bottom + 1) + 'px';
}
FM.requestRender && FM.requestRender();
await sleep(400);
const r = row ? row.getBoundingClientRect() : null;
return { row: r && { top: r.top, bottom: r.bottom, h: r.height }, html: row ? row.querySelector('.fx-head').outerHTML.slice(0, 1500) : null };
