/* Stand-in for the real edit: the planned code, wired from outside the timeline IIFE. Differences from the real
   change, and why they do not matter to what is measured: the old #timeline pointerdown still makes a .tl-tapburst
   (hidden here); the empty row's #616 listener is still bound (its element is display:none here, and the real change
   also skips binding it); the click hold is applied by a capture listener instead of inside the two open handlers. */
(function () {
  for (const sh of document.styleSheets) {
    let rs; try { rs = sh.cssRules; } catch (e) { continue; }
    for (let i = rs.length - 1; i >= 0; i--) {
      const sel = rs[i].selectorText || '';
      if (/tl-empty-start/.test(sel) && /#timeline:(hover|focus-within)/.test(sel)) sh.deleteRule(i);
    }
  }
  const st = document.createElement('style');
  st.textContent = __PROD_CSS__ + '\n.tl-tapburst { display: none !important; }';
  document.head.appendChild(st);
})();
(function () {
__PROD_JS__
  const tl = document.getElementById('timeline'), tlPanel = document.getElementById('timeline-panel');
  tl.addEventListener('pointerdown', function (e) {
    if (!tlPanel.classList.contains('tl-empty-start')) return;
    fxPressAt = performance.now();
    areaFx(tl, e.clientX, e.clientY);
  });
  tl.addEventListener('click', function (e) {
    if (!tlPanel.classList.contains('tl-empty-start')) return;
    const onRow = e.target.closest && e.target.closest('.tl-addrow');
    if (!onRow && e.target.closest && e.target.closest('button, input, select, textarea, a, [role="button"], #tl-ruler, .tl-ruler')) return;
    e.stopPropagation(); e.preventDefault();
    afterPress(function () { if (FM.mobile && FM.mobile.openAdd) FM.mobile.openAdd(); });
  }, true);
  const ruler = document.getElementById('tl-rulerrow');
  tlPanel.style.setProperty('--tl-area-top', (tl.offsetTop + ruler.offsetHeight) + 'px');
  window.__emuInfo = { offsetParent: tl.offsetParent && tl.offsetParent.id, areaTop: tl.offsetTop + ruler.offsetHeight };
})();
