/* queue 945 — a THROWAWAY prototype, for the options pictures only. Injected into the real app by
   tools/design/945-render.sh (through tools/shot.py), so every picture is the real Canvas settings card and the
   real sharing-card styles (cs-*), with a friends block built beside it. Nothing here ships.
   P945.build(opt, state, live) — opt 'A' (the small block is always on top) or 'B' (friends always on top);
   state 'canvas' | 'friends'; live = the project is being shared (faces in the bar). P945.go(state) runs the
   swap; P945.freeze(p) holds it at progress p (0..1) for a still. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function svg(d, sw) {
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', sw || '1.9'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); return s;
  }
  const PEOPLE = 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.7.8 2.8 2.5 3.1 5.2';
  const FRAME = 'M8 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 8 3z';
  const EXPAND = 'M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5';

  const css = `
  #canvas-dialog.p945 { flex-direction: column; gap: 10px; }
  .p945-blk { width: min(420px, calc(100vw - 24px)); background: var(--panel); border: 1px solid var(--line); border-radius: 14px;
    box-shadow: 0 24px 70px rgba(0,0,0,.6); position: relative; overflow: hidden; flex: none; }
  .p945-blk > .export-card { width: 100%; border: 0; box-shadow: none; background: transparent; border-radius: 0; margin: 0; animation: none; max-height: none; }
  .p945-mini { display: flex; align-items: center; gap: 12px; padding: 11px 12px 11px 14px; height: 64px; box-sizing: border-box; }
  .p945-ico { width: 38px; height: 38px; border-radius: 50%; flex: none; display: grid; place-items: center;
    background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }
  .p945-ico svg { width: 21px; height: 21px; }
  .p945-txt { flex: 1; min-width: 0; }
  .p945-t { font-weight: 700; font-size: 15.5px; color: var(--text); }
  .p945-s { font-size: 12.5px; color: var(--text-dim); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .p945-s .live { color: #4fd18b; font-weight: 700; }
  .p945-faces { display: flex; flex: none; }
  .p945-face { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--panel); margin-left: -8px; display: grid; place-items: center;
    font-size: 11.5px; font-weight: 800; color: #10151f; }
  .p945-exp { width: 38px; height: 38px; flex: none; border-radius: 50%; border: 1px solid var(--line); background: var(--panel-2); color: var(--text);
    display: grid; place-items: center; padding: 0; }
  .p945-exp svg { width: 17px; height: 17px; }
  .p945-blk.small > .p945-full { display: none; }
  .p945-blk.big > .p945-mini { display: none; }
  .p945-blk.anim > .p945-mini, .p945-blk.anim > .p945-full { display: block; position: absolute; left: 0; right: 0; top: 0; }
  .p945-blk.anim > .p945-mini { display: flex; }
  .p945-full.p945-fr { padding: 20px 20px 18px; }
  .p945-fr .fm-ask-title { margin: 0; font-size: 17px; }
  .p945-fr .cs-state { font-size: 13px; color: var(--text-dim); margin: 3px 0 12px; }
  .p945-start { width: 100%; min-height: 50px; border-radius: 12px; border: 1px solid var(--accent); background: var(--accent); color: #0b0e14;
    font-weight: 800; font-size: 16px; margin: 6px 0 6px; }
  .p945-hint { font-size: 12.5px; color: var(--text-dim); text-align: center; margin-bottom: 12px; }
  .p945-fr .cs-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 6px 0 4px; }
  .p945-fr .cs-rowlabel { color: var(--text-dim); font-size: 13.5px; }
  .p945-fr .cs-role { border: 1px solid var(--line); background: var(--panel-2); color: var(--text); border-radius: 8px; padding: 6px 10px; font-weight: 600; font-size: 13.5px; }
  .p945-fr .cs-invite { margin: 4px 0 8px; }
  .p945-fr .cs-invite .cs-rowlabel { margin-bottom: 7px; }
  .p945-fr .cs-roomrow { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 9px; background: var(--bg); }
  .p945-fr .cs-roomcode { font-weight: 800; letter-spacing: 2px; font-size: 16px; }
  .p945-fr .cs-copycode { border: 1px solid var(--line); background: var(--panel-2); color: var(--text); border-radius: 7px; padding: 5px 10px; font-weight: 600; }
  .p945-fr .cs-gear { flex: 0 0 48px; display: grid; place-items: center; }
  .p945-fr .cs-gear svg { width: 19px; height: 19px; }
  `;

  let state = null, opt = 'A', live = false, anims = [];
  const dlg = () => document.getElementById('canvas-dialog');

  function faces() {
    const f = el('div', 'p945-faces');
    [['E', '#4fc3f7'], ['S', '#ff9f43'], ['M', '#f472b6']].forEach(function (p) { const d = el('div', 'p945-face', p[0]); d.style.background = p[1]; f.appendChild(d); });
    return f;
  }
  function mini(kind) {
    const m = el('div', 'p945-mini');
    const ic = el('div', 'p945-ico'); ic.appendChild(svg(kind === 'friends' ? PEOPLE : FRAME)); m.appendChild(ic);
    const t = el('div', 'p945-txt');
    t.appendChild(el('div', 'p945-t', kind === 'friends' ? 'Friends' : 'Canvas'));
    const s = el('div', 'p945-s');
    if (kind === 'friends') {
      if (live) { s.appendChild(el('span', 'live', '● Live')); s.appendChild(document.createTextNode(' · 3 people here')); }
      else s.textContent = 'Not shared yet · invite people';
    } else s.textContent = '9:16 · 1080 × 1920 · 30 fps';
    t.appendChild(s); m.appendChild(t);
    if (kind === 'friends' && live) m.appendChild(faces());
    const b = el('button', 'p945-exp'); b.setAttribute('aria-label', 'Expand'); b.appendChild(svg(EXPAND, '2'));
    b.addEventListener('click', function () { P945.go(kind); });
    m.appendChild(b);
    return m;
  }
  function person(name, color, role, menu) {
    const li = el('li', 'cs-person');
    const dot = el('span', 'cs-dot'); dot.style.background = color; li.appendChild(dot);
    const tx = el('div', 'cs-ptext'); tx.appendChild(el('div', 'cs-pname', name)); tx.appendChild(el('div', 'cs-prole', role)); li.appendChild(tx);
    if (menu) li.appendChild(el('button', 'cs-role', menu === 'Change' ? 'Change…' : menu + ' ▾'));
    return li;
  }
  function friendsFull() {
    const f = el('div', 'p945-full p945-fr');
    f.appendChild(el('h2', 'fm-ask-title', 'Share “Untitled”'));
    f.appendChild(el('div', 'cs-state', live ? 'Live · 3 people here' : 'Not shared yet'));
    const ul = el('ul', 'cs-people');
    ul.appendChild(person('Ezra', '#4fc3f7', live ? 'You · owner' : 'You — your name and colour, as others see them', live ? null : 'Change'));
    if (live) { ul.appendChild(person('Sam', '#ff9f43', 'Here · editing', 'Editor')); ul.appendChild(person('Mia', '#f472b6', 'Here · watching', 'Viewer')); }
    f.appendChild(ul);
    if (!live) {
      f.appendChild(el('button', 'p945-start', 'Start sharing'));
      f.appendChild(el('div', 'p945-hint', 'Opening this never shares anything by itself.'));
    } else {
      const inv = el('div', 'cs-invite');
      inv.appendChild(el('div', 'cs-rowlabel', 'Invite with a link or a code'));
      const lr = el('div', 'cs-linkrow');
      lr.appendChild(el('button', 'cs-copylink accent', 'Copy link')); lr.appendChild(el('button', 'cs-sharelink', 'Share…')); lr.appendChild(el('button', 'cs-qrbtn', 'QR'));
      inv.appendChild(lr);
      const rr = el('div', 'cs-roomrow'); rr.appendChild(el('div', 'cs-roomcode', '7KQ-M2P-4XD')); rr.appendChild(el('button', 'cs-copycode', 'Copy')); inv.appendChild(rr);
      f.appendChild(inv);
    }
    const jr = el('div', 'cs-row'); jr.appendChild(el('div', 'cs-rowlabel', 'New people join as')); jr.appendChild(el('button', 'cs-role', 'Editor ▾')); f.appendChild(jr);
    const foot = el('div', 'cs-foot');
    const g = el('button', 'cs-gear'); g.appendChild(svg('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z', '1.7'));
    foot.appendChild(g);
    if (live) foot.appendChild(el('button', 'cs-stop', 'Stop sharing'));
    foot.appendChild(el('button', live ? 'cs-done accent' : 'cs-done', 'Done'));
    f.appendChild(foot);
    return f;
  }

  function order() {
    const d = dlg(), fb = document.getElementById('p945-friends'), cb = document.getElementById('p945-canvas');
    const friendsFirst = opt === 'B' ? true : state === 'canvas';   // A: whichever is SMALL goes on top
    if (friendsFirst) { d.appendChild(fb); d.appendChild(cb); } else { d.appendChild(cb); d.appendChild(fb); }
    fb.className = 'p945-blk ' + (state === 'friends' ? 'big' : 'small');
    cb.className = 'p945-blk ' + (state === 'canvas' ? 'big' : 'small');
  }

  window.P945 = {
    build: function (o, st, lv) {
      opt = o; state = st; live = !!lv;
      if (!document.getElementById('p945-css')) { const s = el('style'); s.id = 'p945-css'; s.textContent = css; document.head.appendChild(s); }
      const d = dlg(); d.classList.add('p945');
      const card = d.querySelector('.export-card');
      let cb = document.getElementById('p945-canvas');
      if (!cb) {
        cb = el('div', 'p945-blk'); cb.id = 'p945-canvas';
        cb.appendChild(mini('canvas'));
        const full = card; full.classList.add('p945-full'); cb.appendChild(full);
        const fb = el('div', 'p945-blk'); fb.id = 'p945-friends';
        fb.appendChild(mini('friends')); fb.appendChild(friendsFull());
        d.appendChild(fb); d.appendChild(cb);
      }
      order();
      return true;
    },
    /* The swap, FLIP-style: measure both blocks, move to the new state, measure again, then fly each block from
       its old box to its new one while its bar and its card cross-fade. Both are lifted out of the flow for
       the flight, or animating one's height would push the other around mid-air. */
    go: function (to, dur) {
      if (to === state) return;
      dur = dur || 460;
      const blks = [document.getElementById('p945-friends'), document.getElementById('p945-canvas')];
      const first = blks.map(function (b) { return b.getBoundingClientRect(); });
      state = to; order();
      const last = blks.map(function (b) { return b.getBoundingClientRect(); });
      anims = [];
      const ease = 'cubic-bezier(.2,.85,.25,1.06)';
      blks.forEach(function (b, i) {
        const f = first[i], l = last[i];
        const growing = b.classList.contains('big');
        b.classList.add('anim');
        b.style.position = 'fixed'; b.style.left = l.left + 'px'; b.style.width = l.width + 'px'; b.style.margin = '0';
        b.style.zIndex = growing ? '2' : '1';
        anims.push(b.animate([{ top: f.top + 'px', height: f.height + 'px' }, { top: l.top + 'px', height: l.height + 'px' }], { duration: dur, easing: ease, fill: 'both' }));
        const m = b.querySelector('.p945-mini'), c = b.querySelector('.p945-full');
        /* the card's content fades in late and the bar's out early, so the two never read on top of each other */
        anims.push(m.animate(growing ? [{ opacity: 1 }, { opacity: 0, offset: .18 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 0, offset: .4 }, { opacity: 1, offset: .75 }, { opacity: 1 }], { duration: dur, fill: 'both' }));
        anims.push(c.animate(growing ? [{ opacity: 0 }, { opacity: 0, offset: .15 }, { opacity: 1, offset: .6 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0, offset: .25 }, { opacity: 0 }], { duration: dur, fill: 'both' }));
        /* the one arriving flies ABOVE the one leaving, and the one leaving dips back as it goes */
        if (!growing) anims.push(b.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(.7)', offset: .5 }, { filter: 'brightness(1)' }], { duration: dur, fill: 'both' }));
        else anims.push(b.animate([{ boxShadow: '0 24px 70px rgba(0,0,0,.6)' }, { boxShadow: '0 30px 90px rgba(0,0,0,.85)', offset: .5 }, { boxShadow: '0 24px 70px rgba(0,0,0,.6)' }], { duration: dur, fill: 'both' }));
      });
      Promise.all(anims.map(function (a) { return a.finished; })).then(function () {
        blks.forEach(function (b) { b.classList.remove('anim'); b.style.position = b.style.left = b.style.width = b.style.margin = b.style.zIndex = ''; });
        anims.forEach(function (a) { a.cancel(); });
      }).catch(function () {});
    },
    /* a frozen swap never finishes on its own (a paused animation's `finished` waits for play), so the renderer
       settles it before the next one — otherwise the next swap measures the old flight's boxes */
    settle: function () { anims.forEach(function (a) { a.finish(); }); },
    freeze: function (p) {
      anims.forEach(function (a) { a.pause(); a.currentTime = p * a.effect.getTiming().duration; });
    }
  };
})();
