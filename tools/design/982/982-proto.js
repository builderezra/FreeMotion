/* queue 982 — a THROWAWAY prototype for the options sheet (tools/design/982/982-options.png). Nothing here ships.
   Swaps Home's worded "Join" pill for a round icon button in the search/cog style, one candidate glyph at a time,
   in the REAL Home top bar. Used as: python3 tools/shot.py --js "$(cat 982-proto.js)
   return P982.apply('A');" …  — apply() returns the measured boxes so the shot also checks the fit. */
window.P982 = {
  /* viewBox 0 0 24 24, fill none, stroke currentColor, round caps and joins — the cog's own attributes */
  G: {
    A: 'M14 3h4a2.5 2.5 0 0 1 2.5 2.5v13A2.5 2.5 0 0 1 18 21h-4M3.5 12h12M11 7.5l4.5 4.5-4.5 4.5',
    B: 'M13 4.2h3.5A1.5 1.5 0 0 1 18 5.7V20M3 20h3M13 20h8M13 3.2v17.6L6 19.4V5.2a1.4 1.4 0 0 1 1.1-1.4l4.4-1.2A1.2 1.2 0 0 1 13 3.2zM10.2 12v.01',
    C: 'M15.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM9.5 20c.6-3.6 2.9-5.5 6-5.5s5.4 1.9 6 5.5M2.5 12.5H9M6.5 10 9 12.5 6.5 15',
    D: 'M8 7H7a5 5 0 0 0 0 10h1M16 7h1a5 5 0 0 1 0 10h-1M8.5 12h7M12.5 9l3 3-3 3',
  },
  SW: 1.8,
  css: function () {
    if (document.getElementById('p982-css')) return;
    const s = document.createElement('style'); s.id = 'p982-css';
    /* 38 px drawn like its neighbours, 44 px to a finger: the hit area grows 3 px each way, inside the 8 px gaps */
    s.textContent = '#hm-join-btn.p982 { position: relative; padding: 0; }' +
      '#hm-join-btn.p982::after { content: ""; position: absolute; inset: -3px; border-radius: 50%; }';
    document.head.appendChild(s);
  },
  apply: function (opt) {
    P982.css();
    const b = document.getElementById('hm-join-btn');
    if (!b) return { error: 'no #hm-join-btn' };
    if (opt !== 'NOW') {
      b.className = b.className.replace(/\bhm-select-btn\b/, 'hm-search-btn') + ' p982';
      b.textContent = '';
      b.setAttribute('aria-label', 'Join');
      b.title = 'Join';
      b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="' + P982.SW +
        '" stroke-linecap="round" stroke-linejoin="round"><path d="' + P982.G[opt] + '"/></svg>';
    }
    const box = function (id) {
      const e = document.getElementById(id); if (!e) return null;
      const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.width), Math.round(r.height)];
    };
    const hit = (function () { const a = getComputedStyle(b, '::after'); return a.content === 'none' ? null : [a.top, a.left]; })();
    const top = document.querySelector('.hm-top'), tr = top.getBoundingClientRect();
    return { opt: opt, vw: innerWidth, brand: box('hm-brand') || (function () { const r = document.querySelector('.hm-brand').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; })(),
      search: box('hm-search-btn'), join: box('hm-join-btn'), select: box('hm-select-btn'), cog: box('hm-settings-btn'),
      barRight: Math.round(tr.right), hitInset: hit, overflow: top.scrollWidth > top.clientWidth + 1 };
  },
};
