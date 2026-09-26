/* queue 948 — a THROWAWAY prototype for the options pictures (tools/design/948-render.py). Nothing here ships.
   Draws option A, B or C of the Templates / Elements "+" menu over the REAL Home, in the Home's own colours.
   The project pictures are stand-ins (gradients), because a test profile has no real projects to show. */
(function () {
  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  const css = `
  #p948 { position: fixed; inset: 0; z-index: 250; display: flex; align-items: center; justify-content: center; padding: 16px;
    background: rgba(4,6,10,.62); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); font: 14px/1.35 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; }
  html[data-home="light"] #p948 { background: rgba(20,38,56,.34); }
  #p948.sheet { align-items: flex-end; padding: 0; }
  .p9-card { width: min(400px, 100%); background: #121a24; color: #eef3f8; border: 1px solid rgba(255,255,255,.09); border-radius: 20px; padding: 20px 18px 16px;
    box-shadow: 0 30px 80px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.07); }
  html[data-home="light"] .p9-card { background: rgba(255,255,255,.97); color: #10151f; border-color: rgba(16,30,52,.12); box-shadow: 0 26px 60px -20px rgba(16,30,52,.55); }
  #p948.sheet .p9-card { width: 100%; border-radius: 24px 24px 0 0; padding-bottom: calc(18px + env(safe-area-inset-bottom)); }
  .p9-grab { width: 40px; height: 5px; border-radius: 3px; background: rgba(127,140,160,.45); margin: -8px auto 12px; }
  .p9-t { font-size: 20px; font-weight: 800; letter-spacing: -.2px; }
  .p9-s { font-size: 13.5px; opacity: .66; margin: 3px 0 14px; }
  .p9-lbl { font-size: 11.5px; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; opacity: .55; margin: 14px 2px 8px; }
  .p9-tile { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; padding: 12px; border-radius: 16px; border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.04); color: inherit; font: inherit; margin-bottom: 9px; }
  html[data-home="light"] .p9-tile { border-color: rgba(16,30,52,.1); background: rgba(16,30,52,.035); }
  .p9-art { width: 58px; height: 58px; border-radius: 13px; flex: none; display: grid; place-items: center; position: relative; overflow: hidden; }
  .p9-art.blank { background: repeating-conic-gradient(rgba(127,140,160,.22) 0 25%, transparent 0 50%) 0 0/12px 12px; border: 2px dashed rgba(92,200,239,.75); }
  .p9-art.blank::after { content: '+'; font-size: 28px; font-weight: 300; color: #5cc8ef; }
  .p9-art.proj { background: linear-gradient(135deg, #7FD4FF, #C86BFF); }
  .p9-art.proj::before, .p9-art.proj::after { content: ''; position: absolute; width: 30px; height: 38px; border-radius: 5px; background: rgba(255,255,255,.9); box-shadow: 0 2px 6px rgba(0,0,0,.25); }
  .p9-art.proj::before { transform: translate(-7px, 3px) rotate(-10deg); opacity: .6; }
  .p9-art.proj::after { transform: translate(6px, -2px) rotate(6deg); }
  .p9-art.file { background: rgba(92,200,239,.14); color: #5cc8ef; font-size: 26px; }
  .p9-tt { font-weight: 750; font-size: 15.5px; }
  .p9-td { font-size: 12.8px; opacity: .65; margin-top: 2px; }
  .p9-chev { margin-left: auto; opacity: .45; font-size: 20px; }
  .p9-strip { display: flex; gap: 10px; overflow: hidden; padding: 2px; }
  .p9-pc { flex: none; width: 92px; }
  .p9-pc .th { height: 122px; border-radius: 12px; position: relative; box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }
  .p9-pc .nm { font-size: 12.5px; font-weight: 650; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .p9-pc .mt { font-size: 11px; opacity: .55; }
  .p9-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .p9-grid .p9-pc { width: auto; }
  .p9-grid .p9-pc .th { height: 138px; }
  .p9-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .p9-big { border-radius: 18px; padding: 14px 12px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); text-align: center; }
  html[data-home="light"] .p9-big { border-color: rgba(16,30,52,.1); background: rgba(16,30,52,.035); }
  .p9-big .p9-art { width: 100%; height: 118px; margin-bottom: 10px; border-radius: 14px; }
  .p9-big .p9-art.proj::before, .p9-big .p9-art.proj::after { width: 46px; height: 60px; }
  .p9-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }
  .p9-btn { min-height: 42px; padding: 0 18px; border-radius: 11px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); color: inherit; font: inherit; font-weight: 700; }
  html[data-home="light"] .p9-btn { border-color: rgba(16,30,52,.14); background: rgba(16,30,52,.05); }
  .p9-back { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .p9-back b { font-size: 24px; opacity: .7; font-weight: 400; }
  .p9-chips { display: flex; gap: 7px; margin-top: 9px; }
  .p9-chip { padding: 5px 11px; border-radius: 999px; font-size: 12.5px; font-weight: 700; border: 1px solid rgba(255,255,255,.14); }
  html[data-home="light"] .p9-chip { border-color: rgba(16,30,52,.16); }
  .p9-chip.on { background: #5cc8ef; border-color: #5cc8ef; color: #0b0e14; }
  `;
  const PROJ = [['Beach reel', '9:16 · 0:24', 'linear-gradient(160deg,#ffcf8a,#ff7a59 55%,#3a2b6b)'], ['Logo sting', '16:9 · 0:06', 'linear-gradient(160deg,#1b2a4a,#5cc8ef)'],
    ['Promo cut', '9:16 · 0:15', 'linear-gradient(160deg,#a3e635,#0f766e)'], ['Birthday', '1:1 · 0:10', 'linear-gradient(160deg,#f472b6,#6366f1)'], ['Untitled', '9:16 · 0:00', '#000']];
  function pc(p) { const c = el('div', 'p9-pc'); const t = el('div', 'th'); t.style.background = p[2]; c.appendChild(t); c.appendChild(el('div', 'nm', p[0])); c.appendChild(el('div', 'mt', p[1])); return c; }
  function tile(art, t, d, chev) {
    const b = el('div', 'p9-tile'); b.appendChild(el('div', 'p9-art ' + art, art === 'file' ? '⤓' : null));
    const x = el('div'); x.appendChild(el('div', 'p9-tt', t)); x.appendChild(el('div', 'p9-td', d)); b.appendChild(x);
    if (chev) b.appendChild(el('div', 'p9-chev', '›')); return b;
  }
  const W = {
    element: { title: 'New element', sub: 'A piece you drop into any edit: a logo, a watermark, a lower-third.', blankT: 'Build from scratch', blankD: 'A clear canvas to draw it on', fromT: 'From one of your projects', fromD: 'Its layers become the element', fileT: 'Open an element file', fileD: 'One someone sent you' },
    template: { title: 'New template', sub: 'A starting point: open it, swap in your own media, and it’s a new project.', blankT: 'Start from a blank template', blankD: 'Pick its shape and length, then build it', fromT: 'From one of your projects', fromD: 'Save a copy of it as a template', fileT: 'Open a template file', fileD: 'One someone sent you' },
  };
  window.P948 = {
    show: function (opt, kind, step) {
      if (!document.getElementById('p948-css')) { const s = el('style'); s.id = 'p948-css'; s.textContent = css; document.head.appendChild(s); }
      const old = document.getElementById('p948'); if (old) old.remove();
      const w = W[kind || 'element'];
      const o = el('div'); o.id = 'p948';
      const c = el('div', 'p9-card');
      if (opt === 'A') {
        c.appendChild(el('div', 'p9-t', w.title)); c.appendChild(el('div', 'p9-s', w.sub));
        const bl = tile('blank', w.blankT, w.blankD, true); c.appendChild(bl);
        const ch = el('div', 'p9-chips'); ['1:1', '9:16', '16:9', '4:5'].forEach(function (a, i) { ch.appendChild(el('span', 'p9-chip' + (i === 0 ? ' on' : ''), a)); });
        bl.querySelector('div:nth-child(2)').appendChild(ch);
        c.appendChild(el('div', 'p9-lbl', w.fromT));
        const st = el('div', 'p9-strip'); PROJ.forEach(function (p) { st.appendChild(pc(p)); }); c.appendChild(st);
        const f = el('div', 'p9-foot'); f.appendChild(el('button', 'p9-btn', 'Cancel')); c.appendChild(f);
      } else if (opt === 'B') {
        if (step === 2) {
          const bk = el('div', 'p9-back'); bk.appendChild(el('b', null, '‹')); bk.appendChild(el('div', 'p9-t', 'Pick a project')); c.appendChild(bk);
          c.appendChild(el('div', 'p9-s', kind === 'template' ? 'A copy of it becomes the template. The project stays as it is.' : 'Its layers become the element. The project stays as it is.'));
          const g = el('div', 'p9-grid'); PROJ.concat([PROJ[1]]).slice(0, 6).forEach(function (p) { g.appendChild(pc(p)); }); c.appendChild(g);
        } else {
          c.appendChild(el('div', 'p9-t', w.title)); c.appendChild(el('div', 'p9-s', w.sub));
          const r = el('div', 'p9-row2');
          [['blank', w.blankT, w.blankD], ['proj', w.fromT, w.fromD]].forEach(function (x) {
            const b = el('div', 'p9-big'); b.appendChild(el('div', 'p9-art ' + x[0])); b.appendChild(el('div', 'p9-tt', x[1])); b.appendChild(el('div', 'p9-td', x[2])); r.appendChild(b);
          });
          c.appendChild(r);
          const f = el('div', 'p9-foot'); f.appendChild(el('button', 'p9-btn', 'Cancel')); c.appendChild(f);
        }
      } else {
        o.className = 'sheet';
        c.appendChild(el('div', 'p9-grab'));
        c.appendChild(el('div', 'p9-t', w.title)); c.appendChild(el('div', 'p9-s', w.sub));
        c.appendChild(tile('blank', w.blankT, w.blankD, true));
        c.appendChild(tile('proj', w.fromT, w.fromD, true));
        c.appendChild(tile('file', w.fileT, w.fileD, true));
      }
      o.appendChild(c);
      document.body.appendChild(o);
      return true;
    },
  };
})();
