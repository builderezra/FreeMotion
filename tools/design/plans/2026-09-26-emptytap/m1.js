const sleep = ms => new Promise(r => setTimeout(r, ms));
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(500);
FM.scene.layers.length = 0;
FM.selectLayer(null); FM.refreshAll(); FM.timeline.rebuild();
await sleep(400);
const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left*10)/10, Math.round(r.top*10)/10, Math.round(r.right*10)/10, Math.round(r.bottom*10)/10]; };
const panel = document.getElementById('timeline-panel');
const tl = document.getElementById('timeline');
const row = document.querySelector('.tl-addrow');
const out = { ver: (document.querySelector('#app-version, .app-version') || {}).textContent, vw: innerWidth, vh: innerHeight,
  emptyStart: panel.classList.contains('tl-empty-start'), rowClass: row && row.className };
out.rect = { panel: R(panel), timeline: R(tl), rulerrow: R(document.getElementById('tl-rulerrow')), tracks: R(document.getElementById('tl-tracks')),
  row: R(row), pulse: R(row && row.querySelector('.tl-addrow-pulse')), plus: R(document.querySelector('.tl-addrow-plus')) };
const cs = getComputedStyle(tl);
out.tlStyle = { overflow: cs.overflow, pos: cs.position, boxShadowRest: cs.boxShadow, radius: cs.borderRadius, scrollTop: tl.scrollTop, scrollH: tl.scrollHeight, clientH: tl.clientHeight };
out.rulerBg = getComputedStyle(document.getElementById('tl-rulerrow')).backgroundColor;
out.rulerZ = getComputedStyle(document.getElementById('tl-rulerrow')).zIndex;
// focus the row the way a tap on a tabIndex=0 element does
row.focus();
await sleep(100);
out.afterFocus = { active: document.activeElement && (document.activeElement.id || document.activeElement.className), focusWithin: tl.matches(':focus-within'), focusVisible: row.matches(':focus-visible'), boxShadow: getComputedStyle(tl).boxShadow };
// what is painted at each edge of #timeline, 0.5px inside
const r = tl.getBoundingClientRect();
const who = (x, y) => { const e = document.elementFromPoint(x, y); return e ? (e.id ? '#' + e.id : '.' + String(e.className).split(' ')[0]) : null; };
out.edges = {
  top: [0.1, 0.3, 0.5, 0.7, 0.9].map(f => who(r.left + r.width * f, r.top + 0.5)),
  top22: [0.5].map(f => who(r.left + r.width * f, r.top + 23)),
  left: [0.1, 0.5, 0.9].map(f => who(r.left + 0.5, r.top + r.height * f)),
  right: [0.1, 0.5, 0.9].map(f => who(r.right - 0.5, r.top + r.height * f)),
  bottom: [0.1, 0.5, 0.9].map(f => who(r.left + r.width * f, r.bottom - 0.5)),
};
// the sheet open/close cycle a tap causes — does focus survive it?
FM.mobile.openAdd(); await sleep(500);
out.duringSheet = { active: document.activeElement && (document.activeElement.id || document.activeElement.className), focusWithin: tl.matches(':focus-within') };
FM.mobile.closeAdd(); await sleep(700);
out.afterSheetClose = { active: document.activeElement && (document.activeElement.id || document.activeElement.className), focusWithin: tl.matches(':focus-within'), boxShadow: getComputedStyle(tl).boxShadow };
// the rule list that paints the box
out.rules = [];
for (const s of document.styleSheets) { let rs; try { rs = s.cssRules; } catch (e) { continue; } for (const ru of rs) { if (ru.selectorText && /#timeline:(hover|focus-within)/.test(ru.selectorText)) out.rules.push(ru.selectorText + ' {' + ru.style.cssText + '}'); } }
window.__probe = out;
return out;
