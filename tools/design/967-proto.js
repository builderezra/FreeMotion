/* queue 967 — a THROWAWAY prototype for the batch 2 options sheet (tools/design/967-render.py). Nothing here ships.
   Draws the recommended options over the REAL app: the Friends block's "How it works" + an on/off row that stays,
   the stage door with a Live marker, and a worded Join on Home. */
(function () {
  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  const css = `
  .p967-how { list-style: none; margin: 2px 0 12px; padding: 0; display: flex; flex-direction: column; gap: 7px; }
  .p967-how li { display: flex; gap: 10px; align-items: center; font-size: 13.5px; color: var(--text); }
  .p967-how b { flex: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--accent); color: #0b0e14; font-size: 12px; font-weight: 800; }
  .p967-off { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 2px 2px; margin-top: 8px; border-top: 1px solid var(--line); }
  .p967-off .t { font-weight: 700; font-size: 14px; color: var(--text); }
  .p967-off .s { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
  .p967-live { position: absolute; top: 9px; left: 42px; z-index: 22; display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 9px; border-radius: 11px;
    background: #e5484d; color: #fff; font: 800 11.5px/1 -apple-system, system-ui, sans-serif; letter-spacing: .4px; box-shadow: 0 2px 8px rgba(0,0,0,.35); }
  .p967-live i { width: 7px; height: 7px; border-radius: 50%; background: #fff; }
  .p967-guest { background: rgba(10,18,26,.82); border: 1px solid rgba(255,255,255,.18); }
  .p967-guest i { background: #4fd18b; }
  .p967-join { margin-right: 8px; } html[data-home="light"] .p967-join { background-color: rgba(255,255,255,.72); border-color: rgba(20,50,80,.16); color: #16233a; }
  `;
  window.P967 = {
    css: function () { if (!document.getElementById('p967-css')) { const s = el('style'); s.id = 'p967-css'; s.textContent = css; document.head.appendChild(s); } },
    /* the Friends block, idle, with How it works and the on/off row */
    friends: function (live) {
      P967.css();
      const body = document.getElementById('cv-fr-body');
      const head = body.querySelector('.cs-head');
      const how = el('ol', 'p967-how');
      [['1', 'Tap Start sharing'], ['2', 'Send your friend the link'], ['3', 'They tap it — you’re both editing']].forEach(function (x) {
        const li = el('li'); li.appendChild(el('b', null, x[0])); li.appendChild(document.createTextNode(x[1])); how.appendChild(li);
      });
      if (head && !live) head.appendChild(how);
      const foot = body.querySelector('.cs-foot');
      const row = el('div', 'p967-off');
      const t = el('div'); t.appendChild(el('div', 't', 'Work with friends')); t.appendChild(el('div', 's', live ? 'On — turning it off stops sharing every project' : 'On — turn it off here any time'));
      row.appendChild(t);
      const sw = el('button', 'set-switch cs-switch on'); sw.setAttribute('role', 'switch'); sw.appendChild(el('span', 'set-knob')); row.appendChild(sw);
      if (foot) foot.parentNode.insertBefore(row, foot);
    },
    /* the stage door + Live marker */
    stage: function (mode) {
      P967.css();
      const st = document.getElementById('stage');
      const p = el('div', 'p967-live' + (mode === 'guest' ? ' p967-guest' : ''));
      p.appendChild(el('i'));
      p.appendChild(document.createTextNode(mode === 'guest' ? 'Live · Ezra' : 'LIVE'));
      st.appendChild(p);
    },
    /* a worded Join on Home */
    join: function () {
      P967.css();
      const sel = document.getElementById('hm-select-btn');
      const j = el('button', 'hm-select-btn p967-join', 'Join');
      if (sel) sel.parentNode.insertBefore(j, sel);
      const old = document.getElementById('hm-join-btn'); if (old) old.style.display = 'none';
    },
  };
})();
