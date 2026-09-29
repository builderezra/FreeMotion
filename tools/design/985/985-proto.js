/* queue 985 — a THROWAWAY prototype for the export-menu options sheet (tools/design/985/985-render.py). Nothing here ships.
   Draws three redesigns of the Export card INSIDE the real app's #export-dialog, with the app's own tokens and controls:
     A  "What you'll get" card + Adjust rows          (recommended)
     B  Pick a goal (tiles) + Fine-tune
     C  Plain-language sliders + a live estimate
   The real dialog's own children are only HIDDEN (never removed), so NOW is the untouched card.
   Every number shown is computed from the project with the exporter's own arithmetic (W×H×fps×factor, capped at
   80 Mb/s, + 160 kb/s of sound) — none of them are made up. */
(function () {
  'use strict';
  const X = window.P985 = {};

  /* ---------- the demo project: a 24 s portrait "Beach trip" so the thumbnail and the numbers are real ---------- */
  X.setup = function () {
    if (X._setup) return 'already';
    X._setup = 1;
    const S = FM.scene, P = S.project;
    P.name = 'Beach trip';
    P.background = '#7cc4ec';
    const mk = function (type, props) { const l = FM.makeLayer(type, props); FM.insertLayer(l); return l; };
    mk('shape', { name: 'Sea', shape: 'rect', x: 540, y: 1560, shapeW: 1300, shapeH: 760, fill: '#1c6f9e', start: 0, duration: 24 });
    mk('shape', { name: 'Sand', shape: 'rect', x: 540, y: 1860, shapeW: 1300, shapeH: 260, fill: '#f0d49a', start: 0, duration: 24 });
    mk('shape', { name: 'Sun', shape: 'ellipse', x: 780, y: 420, shapeW: 300, shapeH: 300, fill: '#ffd24a', start: 0, duration: 24 });
    mk('shape', { name: 'Cloud', shape: 'cloud', x: 330, y: 560, shapeW: 420, shapeH: 285, fill: '#ffffff', start: 0, duration: 24 });
    mk('shape', { name: 'Boat', shape: 'boat', x: 600, y: 1240, shapeW: 300, shapeH: 300, fill: '#e2574c', start: 0, duration: 24 });
    const t = mk('text', { name: 'Title', text: 'Beach trip', x: 540, y: 900, fontSize: 150, color: '#ffffff', start: 2, duration: 3 });
    P.loopIn = 6; P.loopOut = 12;
    S.selectedId = t.id; S.selectedIds = [t.id];
    if (FM.autoFitDuration) FM.autoFitDuration();
    if (FM.refreshAll) FM.refreshAll();
    FM.time = 3; if (FM.requestRender) FM.requestRender();
    return { dur: P.duration, layers: S.layers.length };
  };

  /* ---------- facts & arithmetic ---------- */
  const Q = { high: 0.18, med: 0.1, low: 0.05 };
  function facts() {
    const P = FM.scene.project;
    return { W: P.width, H: P.height, fps: Math.round((P.fps || 30) * 100) / 100, dur: P.duration || 0, name: P.name || 'Untitled' };
  }
  X.facts = facts;
  function mmss(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function mp4MB(w, h, fps, q, dur) {
    const br = Math.min(80e6, Math.round(w * h * fps * q));
    return (br * dur / 8 + 160e3 * dur / 8) / 1e6;
  }
  function mb(n) { return n >= 100 ? Math.round(n) + ' MB' : n >= 10 ? Math.round(n) + ' MB' : (Math.round(n * 10) / 10) + ' MB'; }
  function rungs() {
    const f = facts(), s = Math.min(f.W, f.H), out = [];
    [2160, 1440, 1080, 720, 480, 360].forEach(function (t) { if (t < s - 1) { const k = t / s; out.push({ p: t, w: Math.round(f.W * k), h: Math.round(f.H * k) }); } });
    return out;
  }
  X.rungs = rungs;

  /* ---------- tiny DOM helpers ---------- */
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* the current frame, copied off the real preview canvas */
  function thumb(maxW, maxH) {
    const f = facts(), k = Math.min(maxW / f.W, maxH / f.H);
    const c = document.createElement('canvas');
    c.width = Math.round(f.W * k * 2); c.height = Math.round(f.H * k * 2);
    c.style.width = Math.round(f.W * k) + 'px'; c.style.height = Math.round(f.H * k) + 'px';
    const src = document.getElementById('preview');
    try { c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); } catch (e) {}
    return c;
  }

  const I = {   /* 24-box line icons, the app's stroke style */
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.2v5.6l4.6-2.8z" fill="currentColor"/></svg>',
    gif: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><text x="12" y="15.3" text-anchor="middle" font-size="7.6" font-weight="800" font-family="-apple-system,system-ui,sans-serif" fill="currentColor" stroke="none">GIF</text></svg>',
    pic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="9" cy="9.5" r="1.7"/><path d="m4 17.5 5-4.5 3.5 3 3-2.5 4.5 4"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/></svg>',
    frames: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="13" height="12" rx="2.2"/><path d="M4 15.5V6.2A2.2 2.2 0 0 1 6.2 4H15"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3.2 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6 18 18M18 6 6 18"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    layer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5" opacity=".45"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.01"/></svg>',
  };
  X.I = I;

  const css = `
  #export-dialog .export-card.p985-on { padding: 18px 18px; width: min(362px, calc(100vw - 28px)); }
  #export-dialog .export-card.p985-on > :not(.p985) { display: none !important; }
  #export-dialog .export-card.p985-on { scrollbar-width: none; }
  @media (min-width: 701px) { #export-dialog .export-card.p985-on { width: 440px; padding: 20px 22px; } }
  .p985 { position: relative; font-size: 13.5px; color: var(--text); }
  .p985 * { box-sizing: border-box; }
  .p985 svg { display: block; }
  .p985-x { position: absolute; top: -6px; right: -6px; width: 34px; height: 34px; border-radius: 50%; border: 0; background: transparent; color: var(--text-dim); display: grid; place-items: center; cursor: pointer; }
  .p985-x svg { width: 18px; height: 18px; }
  .p985-lbl { font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: var(--text-faint); margin: 14px 2px 7px; }
  .p985-rec { display: inline-flex; align-items: center; gap: 3px; height: 18px; padding: 0 7px; border-radius: 9px; background: var(--accent-soft); color: var(--accent); font-size: 10.5px; font-weight: 700; white-space: nowrap; flex: none; }
  .p985-rec svg { width: 10px; height: 10px; }
  .p985-foot { position: sticky; bottom: -18px; z-index: 2; margin: 14px -18px -18px; padding: 12px 18px 16px; background: var(--panel); box-shadow: 0 -12px 16px -8px var(--panel); }
  @media (min-width: 701px) { .p985-foot { bottom: -20px; margin: 16px -22px -20px; padding: 12px 22px 18px; } }
  .p985-go { width: 100%; height: 48px; justify-content: center; font-size: 15px; font-weight: 700; border-radius: 12px; }
  .p985-go small { font-weight: 600; opacity: .72; font-size: 13.5px; }
  .p985-warn { display: flex; gap: 9px; align-items: flex-start; margin: 0 0 10px; padding: 9px 11px; border-radius: 10px; font-size: 12.5px; line-height: 1.4;
    background: color-mix(in srgb, var(--warn, #e8a33d) 14%, transparent); border: 1px solid color-mix(in srgb, var(--warn, #e8a33d) 55%, transparent); }
  .p985-warn svg { width: 16px; height: 16px; flex: none; color: var(--warn, #e8a33d); margin-top: 1px; }
  .p985-note { font-size: 12px; color: var(--text-dim); line-height: 1.4; margin: 8px 2px 0; }
  .p985-sw { flex: none; position: relative; width: 44px; height: 26px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel-3); }
  .p985-sw::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #dfe5ee; transition: none; }
  .p985-sw.on { background: var(--accent); border-color: var(--accent); }
  .p985-sw.on::after { left: 20px; background: #fff; }
  .p985-sw.off { opacity: .45; }
  .p985-num { display: inline-flex; align-items: center; gap: 6px; }
  .p985-num input { width: 70px; height: 34px; background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 0 9px; font: inherit; font-variant-numeric: tabular-nums; text-align: center; }
  .p985-num .x { color: var(--text-dim); }
  .p985-seg { display: flex; background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 3px; gap: 3px; }
  .p985-seg > button { flex: 1 1 0; min-width: 0; border: 0; background: transparent; color: var(--text-dim); border-radius: 7px; padding: 7px 4px; font: inherit; font-size: 12.5px; font-weight: 600; line-height: 1.2; }
  .p985-seg > button.on { background: var(--panel-3); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.35); }
  .p985-seg > button small { display: block; font-weight: 500; font-size: 10.5px; color: var(--text-faint); margin-top: 1px; }
  .p985-seg > button.on small { color: var(--text-dim); }
  .p985-tech { font-size: 11.5px; color: var(--text-faint); line-height: 1.5; padding: 10px 2px 0; }
  .p985-tech b { color: var(--text-dim); font-weight: 600; }

  /* ===== A ===== */
  .pA-head { display: flex; gap: 13px; align-items: center; padding-right: 26px; }
  .pA-thumb { flex: none; width: 64px; height: 92px; border-radius: 9px; background: var(--bg); border: 1px solid var(--line); display: grid; place-items: center; overflow: hidden; }
  .pA-thumb canvas { border-radius: 3px; }
  .pA-sum { min-width: 0; }
  .pA-kick { font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: var(--text-faint); }
  .pA-big { font-size: 19px; font-weight: 750; margin: 2px 0 3px; letter-spacing: -.2px; }
  .pA-small { font-size: 12.5px; color: var(--text-dim); font-variant-numeric: tabular-nums; line-height: 1.35; }
  .pA-small b { color: var(--text); font-weight: 650; }
  .pA-only { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; min-height: 22px; padding: 3px 9px 3px 8px; line-height: 1.25; border-radius: 9px; background: color-mix(in srgb, var(--warn, #e8a33d) 16%, transparent); color: var(--warn, #e8a33d); font-size: 11.5px; font-weight: 700; }
  .pA-only svg { width: 13px; height: 13px; flex: none; }
  .pA-chips { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .pA-chip { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 62px; border-radius: 11px; background: var(--panel-2); border: 1px solid var(--line); color: var(--text-dim); font: inherit; font-size: 11.5px; font-weight: 600; padding: 0; }
  .pA-chip svg { width: 23px; height: 23px; }
  .pA-chip.on { background: var(--accent); border-color: var(--accent); color: #06231d; }
  .pA-rows { margin-top: 12px; border-radius: 12px; background: var(--panel-2); border: 1px solid var(--line); overflow: hidden; }
  .pA-row { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 10px 0 13px; border-top: 1px solid var(--line-soft); }
  .pA-row:first-child { border-top: 0; }
  .pA-row .k { font-weight: 650; flex: none; }
  .pA-row .v { flex: 1 1 auto; min-width: 0; text-align: right; color: var(--text-dim); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
  .pA-row .v b { color: var(--text); font-weight: 600; }
  .pA-row .c { flex: none; width: 16px; height: 16px; color: var(--text-faint); }
  .pA-row.open { background: var(--panel-3); }
  .pA-row.open .c { color: var(--accent); }
  .pA-list { background: var(--bg); border-top: 1px solid var(--line-soft); padding: 4px 0; }
  .pA-opt { display: flex; align-items: center; gap: 11px; padding: 8px 12px 8px 13px; }
  .pA-rad { flex: none; width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--line); }
  .pA-opt.on .pA-rad { border-color: var(--accent); background: radial-gradient(circle, var(--accent) 0 4px, transparent 4.5px); }
  .pA-opt .t { flex: 1 1 auto; min-width: 0; }
  .pA-opt .t1 { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; font-weight: 600; font-size: 13.5px; }
  .pA-opt .t2 { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-faint); margin-top: 2px; }
  .pA-opt .n { flex: none; font-size: 12.5px; font-weight: 500; color: var(--text-dim); font-variant-numeric: tabular-nums; text-align: right; }
  .pA-opt.dis { opacity: .42; }
  .pA-more { width: 100%; display: flex; align-items: center; gap: 8px; min-height: 52px; margin-top: 10px; padding: 0 10px 0 13px; border-radius: 12px; border: 1px dashed var(--line); background: transparent; color: var(--text); font: inherit; text-align: left; }
  .pA-more .k { font-weight: 650; flex: 1 1 auto; min-width: 0; }
  .pA-more .k small { display: block; font-weight: 500; color: var(--text-faint); font-size: 11.5px; margin-top: 2px; }
  .pA-more .on1 { color: var(--warn, #e8a33d); font-weight: 700; font-size: 12px; flex: none; }
  .pA-more .c { width: 16px; height: 16px; color: var(--text-faint); flex: none; }
  .pA-more.open { border-style: solid; background: var(--panel-2); border-radius: 12px 12px 0 0; }
  .pA-morebody { border: 1px solid var(--line); border-top: 0; border-radius: 0 0 12px 12px; background: var(--panel-2); padding: 2px 13px 12px; }
  .pA-mrow { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 50px; border-top: 1px solid var(--line-soft); }
  .pA-mrow:first-child { border-top: 0; }
  .pA-mrow .k { font-weight: 600; }
  .pA-mrow .s { font-size: 11.5px; color: var(--text-faint); margin-top: 2px; }
  .pA-pick { height: 34px; display: inline-flex; align-items: center; gap: 7px; padding: 0 10px 0 11px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--text); font: inherit; font-size: 13px; white-space: nowrap; }
  .pA-pick svg { width: 14px; height: 14px; color: var(--text-dim); }
  .pA-pick.set { border-color: var(--warn, #e8a33d); color: var(--warn, #e8a33d); font-weight: 650; }
  .pA-seg2 { width: 100%; margin: 4px 0 2px; }

  .pA-body { display: block; }
  @media (min-width: 701px) {
    #export-dialog .export-card.p985-on.p985-wide { width: 580px; }
    .pA-body { display: grid; grid-template-columns: 150px minmax(0, 1fr); column-gap: 20px; align-items: start; }
    .pA-left { position: sticky; top: 0; }
    .pA-head { flex-direction: column; align-items: flex-start; padding-right: 0; gap: 12px; }
    .pA-thumb { width: 150px; height: 222px; border-radius: 12px; }
    .pA-big { font-size: 20px; }
    .pA-right > .p985-lbl:first-child { margin-top: 2px; }
    .pA-row { min-height: 44px; }
    .pA-more { min-height: 48px; }
    .pA .p985-x { top: -8px; right: -10px; }
    .pA-right { padding-right: 0; }
    .pA-right > .p985-lbl:first-child { padding-right: 34px; }
  }

  /* ===== B ===== */
  .pB-title { font-size: 17px; font-weight: 750; padding-right: 30px; }
  .pB-sub { font-size: 12.5px; color: var(--text-dim); margin-top: 2px; }
  .pB-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 13px; }
  .pB-tile { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; min-height: 96px; padding: 11px 11px 10px; border-radius: 13px; background: var(--panel-2); border: 1.5px solid var(--line); color: var(--text); font: inherit; text-align: left; }
  .pB-tile .ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: var(--panel-3); color: var(--text-dim); margin-bottom: 4px; }
  .pB-tile .ic svg { width: 19px; height: 19px; }
  .pB-tile .nm { font-weight: 700; font-size: 14px; line-height: 1.2; }
  .pB-tile .rs { font-size: 11.5px; color: var(--text-dim); line-height: 1.3; font-variant-numeric: tabular-nums; }
  .pB-tile.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 9%, var(--panel-2)); }
  .pB-tile.on .ic { background: var(--accent); color: #06231d; }
  .pB-tile .p985-rec { position: absolute; top: 10px; right: 9px; }
  .pB-tile .fit { font-size: 10.5px; color: var(--accent); font-weight: 650; margin-top: 2px; }
  .pB-tile .cst { position: absolute; top: 10px; right: 9px; height: 18px; padding: 0 7px; border-radius: 9px; background: color-mix(in srgb, var(--warn, #e8a33d) 18%, transparent); color: var(--warn, #e8a33d); font-size: 10.5px; font-weight: 700; display: inline-flex; align-items: center; }
  .pB-row { display: flex; align-items: center; gap: 10px; min-height: 48px; margin-top: 10px; padding: 0 10px 0 13px; border-radius: 12px; background: var(--panel-2); border: 1px solid var(--line); }
  .pB-row .k { font-weight: 650; flex: none; }
  .pB-row .v { flex: 1 1 auto; min-width: 0; text-align: right; color: var(--text-dim); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
  .pB-row .v b { color: var(--text); font-weight: 600; }
  .pB-row .c { flex: none; width: 16px; height: 16px; color: var(--text-faint); }
  .pB-row.ft { background: transparent; border-style: dashed; }
  .pB-row.ft.open { border-style: solid; background: var(--panel-2); border-radius: 12px 12px 0 0; }
  .pB-row.ft.open .c { color: var(--accent); }
  @media (min-width: 701px) {
    .pB-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .pB-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
    .pB-pair > .pB-row { margin-top: 0; }
    .pB-pair > .pB-row.ft.open { border-radius: 12px; }
    .pB-pair + .pB-ftbody { margin-top: 8px; border-top: 1px solid var(--line); border-radius: 12px; }
  }
  .pB-ftbody { border: 1px solid var(--line); border-top: 0; border-radius: 0 0 12px 12px; background: var(--panel-2); padding: 10px 13px 12px; }
  .pB-strip { display: flex; align-items: center; gap: 11px; margin-top: 13px; padding: 10px 10px 10px 11px; border-radius: 13px; border: 1.5px solid var(--accent); background: color-mix(in srgb, var(--accent) 9%, var(--panel-2)); }
  .pB-strip .ic { flex: none; width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; background: var(--accent); color: #06231d; }
  .pB-strip .ic svg { width: 20px; height: 20px; }
  .pB-strip .t { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .pB-strip .nm { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 7px; }
  .pB-strip .nm .cst { position: static; }
  .pB-strip .rs { font-size: 11.5px; color: var(--text-dim); font-variant-numeric: tabular-nums; line-height: 1.3; }
  .pB-chg { flex: none; display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 8px 0 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--text); font: inherit; font-size: 12.5px; font-weight: 600; }
  .pB-chg svg { width: 13px; height: 13px; color: var(--text-dim); }
  .pB-strip .cst, .pB-tile .cst { height: 18px; padding: 0 7px; border-radius: 9px; background: color-mix(in srgb, var(--warn, #e8a33d) 18%, transparent); color: var(--warn, #e8a33d); font-size: 10.5px; font-weight: 700; display: inline-flex; align-items: center; }
  #export-dialog .pB-ftbody .field { margin-bottom: 10px; grid-template-columns: minmax(64px, 1fr) clamp(150px, 62%, 220px); }
  #export-dialog .pB-ftbody .field > span { color: var(--text-dim); font-size: 13px; }
  #export-dialog .pB-ftbody .field select { background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 0 26px 0 9px; height: 34px; width: 100%; font: inherit; font-size: 13px; }
  #export-dialog .pB-ftbody .field select.chg { border-color: var(--warn, #e8a33d); color: var(--warn, #e8a33d); font-weight: 650; }
  .pB-ftbody .pA-pick { width: 100%; justify-content: space-between; }
  .pB-ftbody .swrow { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 40px; margin-bottom: 8px; }
  .pB-ftbody .swrow .k { color: var(--text-dim); font-size: 13px; }
  .pB-ftbody .swrow .s { font-size: 11px; color: var(--text-faint); }

  /* ===== C ===== */
  .pC-top { position: sticky; top: -18px; z-index: 3; margin: -18px -18px 0; padding: 18px 18px 6px; background: var(--panel); box-shadow: 0 12px 14px -12px rgba(0,0,0,.55); }
  .pC-top .p985-x { top: 12px; right: 12px; }
  @media (min-width: 701px) { .pC-top { top: -20px; margin: -20px -22px 0; padding: 20px 22px 6px; } .pC-top .p985-x { top: 14px; right: 14px; } }
  .pC-read .pA-only { margin-top: 7px; }
  .pA-thumb.snd { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--bg)); }
  .pA-thumb.snd svg { width: 34px; height: 34px; }
  @media (min-width: 701px) { .pA-thumb.snd svg { width: 64px; height: 64px; } }
  .pC-read { margin: 14px 2px 2px; }
  .pC-read .big { display: block; white-space: nowrap; }
  .pC-read .sm { display: block; margin-top: 2px; }
  .pC-read .big { font-size: 26px; font-weight: 800; letter-spacing: -.4px; font-variant-numeric: tabular-nums; }
  .pC-read .sm { font-size: 12.5px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
  .pC-seg { margin-right: 30px; }
  .pC-sl { margin-top: 16px; }
  .pC-sl .hd { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 0 2px 9px; }
  .pC-sl .hd .k { font-weight: 650; }
  .pC-sl .hd .k small { font-weight: 500; color: var(--text-faint); font-size: 11.5px; margin-left: 5px; }
  .pC-sl .hd .v { color: var(--accent); font-weight: 700; font-size: 13px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .pC-track { position: relative; height: 28px; margin: 0 11px; }
  .pC-track .rail { position: absolute; left: 0; right: 0; top: 12px; height: 4px; border-radius: 2px; background: var(--panel-3); }
  .pC-track .fill { position: absolute; left: 0; top: 12px; height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--accent-2), var(--accent)); }
  .pC-track .dot { position: absolute; top: 10px; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: var(--line); border: 0; }
  .pC-track .dot.in { background: color-mix(in srgb, var(--accent) 60%, #06231d); }
  .pC-track .dot.dis { background: var(--line-soft); }
  .pC-track .star { position: absolute; top: -9px; width: 12px; height: 12px; margin-left: -6px; color: var(--accent); }
  .pC-track .thumb { position: absolute; top: 3px; width: 22px; height: 22px; margin-left: -11px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 35%, transparent), 0 2px 6px rgba(0,0,0,.4); }
  .pC-ticks { position: relative; height: 16px; margin: 3px 11px 0; }
  .pC-ticks span { position: absolute; transform: translateX(-50%); font-size: 10.5px; color: var(--text-faint); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .pC-ticks span.on { color: var(--text); font-weight: 700; }
  .pC-ticks span:first-child { transform: translateX(-11px); }
  .pC-ticks span:last-child { transform: translateX(calc(-100% + 11px)); }
  .pC-ticks span.rec { color: var(--accent); }
  .pC-ticks span svg { display: inline-block; width: 9px; height: 9px; margin-right: 2px; vertical-align: -0.5px; }
  .pC-ticks span.dis { opacity: .45; }
  .pC-links { display: flex; gap: 8px; margin-top: 16px; }
  .pC-link { flex: 1 1 0; min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 6px; height: 42px; padding: 0 10px 0 12px; border-radius: 11px; border: 1px dashed var(--line); background: transparent; color: var(--text); font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; }
  .pC-link .c { width: 15px; height: 15px; color: var(--text-faint); flex: none; }
  .pC-link.open { border-style: solid; background: var(--panel-2); }
  .pC-link.open .c { color: var(--accent); }
  .pC-link .on1 { color: var(--warn, #e8a33d); font-size: 11.5px; font-weight: 700; }
  .pC-box { margin-top: 8px; border: 1px solid var(--line); border-radius: 12px; background: var(--panel-2); padding: 4px 13px 10px; }
  .pC-box .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 48px; border-top: 1px solid var(--line-soft); }
  .pC-box .row:first-child { border-top: 0; }
  .pC-box .row .k { font-weight: 600; }
  .pC-box .row .s { font-size: 11.5px; color: var(--text-faint); margin-top: 1px; }
  .pC-box .p985-seg { margin: 2px 0 10px; }
  .pC-box .cap { font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--text-faint); margin: 10px 0 6px; }
  `;
  function addCss() { if (!document.getElementById('p985-css')) { const s = document.createElement('style'); s.id = 'p985-css'; s.textContent = css; document.head.appendChild(s); } }

  /* ---------- open / close the REAL dialog ---------- */
  X.open = function () {
    const d = document.getElementById('export-dialog');
    if (d && !d.classList.contains('hidden')) return Promise.resolve('open');
    document.getElementById('btn-export').click();
    return new Promise(function (res) { setTimeout(function () { res(!document.getElementById('export-dialog').classList.contains('hidden')); }, 700); });
  };
  X.clear = function () {
    const card = document.querySelector('#export-dialog .export-card');
    card.classList.remove('p985-on', 'p985-wide');
    card.querySelectorAll(':scope > .p985').forEach(function (n) { n.remove(); });
    card.scrollTop = 0; card._p985Scroll = null; card._p985Anchor = null;
  };
  function mount(node) {
    addCss(); X.clear();
    const card = document.querySelector('#export-dialog .export-card');
    card.classList.add('p985-on');
    card.appendChild(node);
    return card;
  }

  /* ---------- NOW (today's card, untouched) — the "open" variant shows its hidden rows ---------- */
  X.now = function (state) {
    X.clear();
    const res = document.getElementById('exp-res'), fps = document.getElementById('exp-fps');
    if (state === 'custom') {
      res.value = 'custom'; res.dispatchEvent(new Event('change'));
      fps.value = 'custom'; fps.dispatchEvent(new Event('change'));
    } else {
      res.value = res.options[0].value; res.dispatchEvent(new Event('change'));
      fps.value = 'project'; fps.dispatchEvent(new Event('change'));
    }
    return 'now';
  };

  /* ================= A — What you'll get + Adjust rows ================= */
  X.A = function (state) {
    const f = facts(), R = rungs();
    const gif = state === 'gif', snd = state === 'sound';
    const soloOn = state === 'more';
    const kind = gif ? 'GIF' : snd ? 'Sound' : 'Video';
    const gw = gif ? Math.round(f.W * Math.min(1, 640 / Math.max(f.W, f.H))) : f.W, gh = gif ? Math.round(f.H * Math.min(1, 640 / Math.max(f.W, f.H))) : f.H;
    const size = mb(mp4MB(f.W, f.H, f.fps, Q.high, f.dur));
    const wavMB = mb(f.dur * 192e3 / 1e6);
    const sumSmall = gif ? '<b>' + gw + '×' + gh + '</b> · ' + f.fps + ' fps · loops · size shown when done'
      : snd ? '<b>WAV</b> · 48 kHz stereo · about ' + wavMB
      : '<b>' + f.W + '×' + f.H + '</b> · ' + f.fps + ' fps · about <b>' + size + '</b>';
    let n = h('<div class="p985 pA"></div>');
    n.appendChild(h('<button class="p985-x" aria-label="Close">' + I.x + '</button>'));
    const head = h('<div class="pA-head"><div class="pA-thumb' + (snd ? ' snd' : '') + '"></div><div class="pA-sum"><div class="pA-kick">You’ll get</div>' +
      '<div class="pA-big">' + kind + ' · ' + mmss(f.dur) + '</div><div class="pA-small">' + sumSmall + '</div>' +
      (soloOn ? '<div class="pA-only">' + I.layer + 'Only the “Title” layer</div>' : '') + '</div></div>');
    const wide = matchMedia('(min-width: 701px)').matches;
    // Sound has no picture, so the preview says so instead of showing a frame that will not be in the file
    if (snd) head.querySelector('.pA-thumb').innerHTML = I.sound;
    else head.querySelector('.pA-thumb').appendChild(wide ? thumb(142, 214) : thumb(60, 88));
    const body = h('<div class="pA-body"><div class="pA-left"></div><div class="pA-right"></div></div>');
    body.firstElementChild.appendChild(head);
    n.appendChild(body);
    const right = body.lastElementChild;
    const n0 = n; n = right;
    n.appendChild(h('<div class="p985-lbl">What to make</div>'));
    const chips = h('<div class="pA-chips"></div>');
    [['video', 'Video'], ['gif', 'GIF'], ['pic', 'Picture'], ['sound', 'Sound'], ['frames', 'Frames']].forEach(function (c) {
      const on = (c[0] === 'video' && !gif && !snd) || (c[0] === 'gif' && gif) || (c[0] === 'sound' && snd);
      chips.appendChild(h('<button class="pA-chip' + (on ? ' on' : '') + '">' + I[c[0]] + '<span>' + c[1] + '</span></button>'));
    });
    n.appendChild(chips);
    if (gif) n.appendChild(h('<div class="p985-note">A GIF is at most 640 px on its longest side, 50 fps and 256 colours — so this one comes out ' + gw + '×' + gh + '.</div>'));
    if (snd) n.appendChild(h('<div class="p985-note">Just the soundtrack, no picture.</div>'));

    const rows = h('<div class="pA-rows"></div>');
    function row(k, v, open) { return h('<div class="pA-row' + (open ? ' open' : '') + '"><span class="k">' + k + '</span><span class="v">' + v + '</span><span class="c">' + (open ? I.down : I.chev) + '</span></div>'); }
    function opt(on, t1, rec, t2, num, dis) {
      return h('<div class="pA-opt' + (on ? ' on' : '') + (dis ? ' dis' : '') + '"><span class="pA-rad"></span><span class="t"><span class="t1"><span>' + t1 + '</span><span class="n">' + (num || '') + '</span></span>' +
        '<span class="t2">' + (rec ? '<span class="p985-rec">' + I.star + 'Recommended</span>' : '') + (t2 || '') + '</span></span></div>');
    }
    if (snd) {
      rows.appendChild(row('Sound file', '<b>WAV</b> · always works'));
      rows.appendChild(row('Part', '<b>Whole video</b> · ' + mmss(f.dur)));
    } else {
      const sizeOpen = state === 'size';
      rows.appendChild(row('Size', gif ? '<b>Biggest a GIF allows</b> · ' + gw + '×' + gh : '<b>Same as project</b> · ' + f.W + '×' + f.H, sizeOpen));
      if (sizeOpen) {
        const L = h('<div class="pA-list"></div>');
        L.appendChild(opt(true, 'Same as project', true, f.W + '×' + f.H + ' · full detail', 'about ' + size));
        const hints = { 1440: 'sharp on big screens', 1080: 'sharp on any phone', 720: 'still sharp on a phone', 480: 'a bit soft', 360: 'tiny, for quick previews' };
        R.forEach(function (r) { L.appendChild(opt(false, r.p + 'p', false, r.w + '×' + r.h + ' · ' + (hints[r.p] || ''), 'about ' + mb(mp4MB(r.w, r.h, f.fps, Q.high, f.dur)))); });
        L.appendChild(opt(false, 'Exact size…', false, 'any width × height — fitted in, never cropped', ''));
        rows.appendChild(L);
      }
      rows.appendChild(row('Smoothness', '<b>' + f.fps + ' fps</b> · same as project'));
      if (!gif) rows.appendChild(row('Quality', '<b>Best</b> · about ' + size));
      if (gif) rows.appendChild(row('See-through background', '<b>Off</b>'));
      rows.appendChild(row('Part', '<b>Whole video</b> · ' + mmss(f.dur)));
    }
    n.appendChild(rows);

    const moreOpen = state === 'more';
    const more = h('<button class="pA-more' + (moreOpen ? ' open' : '') + '"><span class="k">More options' +
      (moreOpen ? '' : '<small>' + (snd ? 'One layer · technical details' : gif ? 'One layer · exact size &amp; fps' : 'One layer · see-through · exact size &amp; fps') + '</small>') + '</span>' + (soloOn ? '<span class="on1">1 on</span>' : '') + '<span class="c">' + (moreOpen ? I.down : I.chev) + '</span></button>');
    n.appendChild(more);
    if (moreOpen) {
      const B = h('<div class="pA-morebody"></div>');
      B.appendChild(h('<div class="pA-mrow"><div><div class="k">Only one layer</div><div class="s">Picture and sound of just that layer</div></div><button class="pA-pick set">' + I.layer + 'Title' + I.down + '</button></div>'));
      B.appendChild(h('<div class="pA-mrow"><div><div class="k">See-through background</div><div class="s">GIF and Frames only — a video can’t hold it</div></div><span class="p985-sw off"></span></div>'));
      B.appendChild(h('<div class="pA-mrow"><div><div class="k">Exact size</div><div class="s">Never cropped</div></div><span class="p985-num"><input value="' + f.W + '"><span class="x">×</span><input value="' + f.H + '"></span></div>'));
      B.appendChild(h('<div class="pA-mrow"><div><div class="k">Exact fps</div><div class="s">Any rate from 1 to 120</div></div><span class="p985-num"><input value="' + f.fps + '"></span></div>'));
      B.appendChild(h('<div class="pA-mrow" style="display:block;padding-top:10px"><div class="k">Sound file type</div><div class="s" style="margin-bottom:8px">For Sound — the soundtrack on its own</div>' +
        '<div class="p985-seg pA-seg2"><button class="on">WAV<small>always works</small></button><button>M4A<small>about 10× smaller</small></button></div></div>'));
      B.appendChild(h('<div class="p985-tech"><b>Technical details</b> — H.264 video, AAC sound at 160 kb/s 48 kHz, a key frame every 2 s, file named “' + esc(f.name) + '”.</div>'));
      n.appendChild(B);
    }
    n = n0;
    const label = gif ? 'Export GIF' : snd ? 'Export sound<small>· about ' + wavMB + '</small>' : 'Export video<small>· about ' + size + '</small>';
    n.appendChild(h('<div class="p985-foot"><button class="btn btn-accent p985-go">' + label + '</button></div>'));
    const card = mount(n);
    card.classList.add('p985-wide');
    if (state === 'more') { card._p985Scroll = 'bottom'; if (wide) card._p985Anchor = '.pA-more'; }
    return 'A ' + (state || 'first');
  };

  /* ================= B — Pick a goal + Fine-tune ================= */
  X.B = function (state) {
    const f = facts(), R = rungs();
    const down = R[0] || { w: f.W, h: f.H, p: Math.min(f.W, f.H) };
    const fine = state === 'fine';
    const fpsNow = fine ? 60 : f.fps;
    const best = mb(mp4MB(f.W, f.H, fpsNow, Q.high, f.dur));
    const small = mb(mp4MB(down.w, down.h, f.fps, Q.med, f.dur));
    const gk = Math.min(1, 640 / Math.max(f.W, f.H)), gw = Math.round(f.W * gk), gh = Math.round(f.H * gk);
    const portrait = f.H / f.W > 1.7 && f.H / f.W < 1.8;
    const n = h('<div class="p985 pB"></div>');
    n.appendChild(h('<button class="p985-x" aria-label="Close">' + I.x + '</button>'));
    n.appendChild(h('<div><div class="pB-title">What are you making?</div><div class="pB-sub">“' + esc(f.name) + '” · ' + mmss(f.dur) + '</div></div>'));
    const g = h('<div class="pB-grid"></div>');
    function tile(on, ic, nm, rs, extra) { return h('<button class="pB-tile' + (on ? ' on' : '') + '"><span class="ic">' + I[ic] + '</span><span class="nm">' + nm + '</span><span class="rs">' + rs + '</span>' + (extra || '') + '</button>'); }
    g.appendChild(tile(true, 'video', 'Best quality', f.W + '×' + f.H + ' · ' + fpsNow + ' fps<br>about ' + best,
      (fine ? '<span class="cst">Custom</span>' : '<span class="p985-rec">' + I.star + 'Recommended</span>') + (portrait ? '<span class="fit">Fits Reels &amp; TikTok</span>' : '')));
    g.appendChild(tile(false, 'send', 'Smaller to send', down.w + '×' + down.h + ' · ' + f.fps + ' fps<br>about ' + small));
    g.appendChild(tile(false, 'gif', 'GIF', gw + '×' + gh + ' · loops<br>size shown when done'));
    g.appendChild(tile(false, 'pic', 'Picture', 'This frame as a PNG<br>' + f.W + '×' + f.H));
    g.appendChild(tile(false, 'sound', 'Sound only', 'The soundtrack<br>WAV · about ' + mb(f.dur * 192e3 / 1e6)));
    g.appendChild(tile(false, 'frames', 'Frame by frame', 'Every frame as a PNG<br>' + Math.round(f.dur * f.fps) + ' files in a ZIP'));
    if (fine) {
      // while Fine-tune is open the six tiles fold into one line (the picked goal, now "Custom"), so the exact
      // controls fit on a phone without scrolling the goal out of sight; "Change" unfolds them again
      n.appendChild(h('<div class="pB-strip"><span class="ic">' + I.video + '</span><span class="t"><span class="nm">Best quality <span class="cst">Custom</span></span>' +
        '<span class="rs">' + f.W + '×' + f.H + ' · ' + fpsNow + ' fps<br>about ' + best + '</span></span><button class="pB-chg">Change' + I.down + '</button></div>'));
    } else n.appendChild(g);
    const pair = h('<div class="pB-pair"></div>');
    pair.appendChild(h('<div class="pB-row"><span class="k">Part</span><span class="v"><b>Whole video</b> · ' + mmss(f.dur) + '</span><span class="c">' + I.down + '</span></div>'));
    n.appendChild(pair);
    const ft = h('<div class="pB-row ft' + (fine ? ' open' : '') + '"><span class="k">Fine-tune</span><span class="v">' + (fine ? '<b style="color:var(--warn,#e8a33d)">1 changed</b>' : 'size · fps · more') + '</span><span class="c">' + (fine ? I.down : I.chev) + '</span></div>');
    pair.appendChild(ft);
    if (fine) {
      const B = h('<div class="pB-ftbody"></div>');
      function sel(label, opts, chg) { return h('<label class="field"><span>' + label + '</span><select' + (chg ? ' class="chg"' : '') + '>' + opts.map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select></label>'); }
      B.appendChild(sel('Size', [f.W + '×' + f.H + ' · project']));
      B.appendChild(sel('Smoothness', ['60 fps · smooth'], true));
      B.appendChild(sel('Quality', ['High · about ' + best]));
      B.appendChild(h('<label class="field"><span>Only one layer</span><button class="pA-pick">All layers' + I.down + '</button></label>'));
      B.appendChild(h('<div class="swrow"><div><div class="k">See-through background</div><div class="s">GIF and Frame by frame only</div></div><span class="p985-sw off"></span></div>'));
      B.appendChild(h('<div class="swrow"><div><div class="k">Sound file</div><div class="s">for Sound only</div></div><div class="p985-seg" style="width:170px"><button class="on">WAV</button><button>M4A</button></div></div>'));
      B.appendChild(h('<div class="p985-tech" style="padding-top:4px"><b>Technical details</b> — H.264, AAC 160 kb/s, key frame every 2 s.</div>'));
      n.appendChild(B);
    }
    n.appendChild(h('<div class="p985-foot"><button class="btn btn-accent p985-go">Export — ' + (fine ? 'Custom' : 'Best quality') + '<small>· about ' + best + '</small></button></div>'));
    const card = mount(n);
    card.classList.add('p985-wide');
    if (fine) { card._p985Scroll = 'bottom'; card._p985Anchor = '.pB-strip'; }
    return 'B ' + (state || 'first');
  };

  /* ================= C — Plain-language sliders + live estimate ================= */
  X.C = function (state) {
    const f = facts(), R = rungs().slice().reverse();
    const open = state === 'open';
    const size = mb(mp4MB(f.W, f.H, f.fps, Q.high, f.dur));
    const n = h('<div class="p985 pC"></div>');
    // the switch and the live size stay pinned at the top while the card scrolls: the size IS this concept, so it must
    // never scroll out of sight while a slider or an exact box is being changed
    const top = h('<div class="pC-top p985-sticky"></div>');
    top.appendChild(h('<button class="p985-x" aria-label="Close">' + I.x + '</button>'));
    top.appendChild(h('<div class="p985-seg pC-seg"><button class="on">Video</button><button>GIF</button><button>Picture</button><button>Sound</button><button>Frames</button></div>'));
    top.appendChild(h('<div class="pC-read"><span class="big">about ' + size + '</span><span class="sm">' + mmss(f.dur) + ' · ' + f.W + '×' + f.H + ' · ' + f.fps + ' fps</span>' +
      ((open || state === 'more') ? '<span class="pA-only">' + I.layer + 'Only the “Title” layer</span>' : '') + '</div>'));
    n.appendChild(top);
    function slider(k, sub, v, stops, at, star) {
      const s = h('<div class="pC-sl ' + ({ Sharpness: 'sharp', Smoothness: 'fps', Quality: 'q' })[k] + '"><div class="hd"><span class="k">' + k + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="v">' + v + '</span></div><div class="pC-track"><span class="rail"></span><span class="fill"></span></div><div class="pC-ticks"></div></div>');
      const tr = s.querySelector('.pC-track'), tk = s.querySelector('.pC-ticks'), N = stops.length;
      stops.forEach(function (st, i) {
        const x = N === 1 ? 50 : (i / (N - 1)) * 100;
        tr.appendChild(h('<span class="dot' + (i <= at ? ' in' : '') + '" style="left:' + x + '%"></span>'));
        tk.appendChild(h('<span class="' + (i === at ? 'on' : '') + (i === star ? ' rec' : '') + '" style="left:' + x + '%">' + (i === star ? I.star : '') + st + '</span>'));
      });
      const ax = (at / (N - 1)) * 100;
      tr.querySelector('.fill').style.width = ax + '%';
      tr.appendChild(h('<span class="thumb" style="left:' + ax + '%"></span>'));
      return s;
    }
    const sharp = R.map(function (r) { return r.p + 'p'; }).concat(['Project']);
    n.appendChild(slider('Sharpness', '', f.W + '×' + f.H, sharp, sharp.length - 1, sharp.length - 1));
    const fpsStops = [15, 24, 25, 30, 50, 60, 120], fi = fpsStops.indexOf(f.fps);
    n.appendChild(slider('Smoothness', '', f.fps + ' fps', fpsStops, fi < 0 ? 3 : fi, fi < 0 ? 3 : fi));
    n.appendChild(slider('Quality', '↔ file size', 'Best', ['Smallest', 'Balanced', 'Best'], 2, 2));
    // 'exact' opens Exact numbers, 'more' opens More (with one layer picked, so it says "1 on"), 'open' opens both
    const exOpen = open || state === 'exact', moOpen = open || state === 'more';
    const wideC = matchMedia('(min-width: 701px)').matches;
    const links = h('<div class="pC-links"><button class="pC-link' + (exOpen ? ' open' : '') + '">Exact numbers<span class="c">' + (exOpen ? I.down : I.chev) + '</span></button>' +
      '<button class="pC-link' + (moOpen ? ' open' : '') + '">More' + (moOpen ? '<span class="on1">1 on</span>' : '') + '<span class="c">' + (moOpen ? I.down : I.chev) + '</span></button></div>');
    n.appendChild(links);
    if (exOpen) {
      const B = h('<div class="pC-box"></div>');
      if (open) B.appendChild(h('<div class="cap">Exact numbers</div>'));
      if (wideC) {   // a PC card has the width for both on one line
        B.appendChild(h('<div class="row"><span class="k">Size</span><span class="p985-num"><input value="' + f.W + '"><span class="x">×</span><input value="' + f.H + '"></span>' +
          '<span class="k" style="margin-left:auto">Frame rate</span><span class="p985-num"><input value="' + f.fps + '" style="width:58px"></span></div>'));
        B.appendChild(h('<div class="s" style="font-size:11.5px;color:var(--text-faint);margin:-4px 0 2px">Any width × height, never cropped · any rate from 1 to 120</div>'));
      } else {
        B.appendChild(h('<div class="row"><div><div class="k">Size</div><div class="s">Any width × height, never cropped</div></div><span class="p985-num"><input value="' + f.W + '"><span class="x">×</span><input value="' + f.H + '"></span></div>'));
        B.appendChild(h('<div class="row"><div><div class="k">Frame rate</div><div class="s">Any rate from 1 to 120</div></div><span class="p985-num"><input value="' + f.fps + '"></span></div>'));
      }
      n.appendChild(B);
    }
    if (moOpen) {
      const B = h('<div class="pC-box"></div>');
      if (open) B.appendChild(h('<div class="cap">More</div>'));
      B.appendChild(h('<div class="k" style="font-weight:600;margin:10px 0 7px">Part</div>'));
      B.appendChild(h('<div class="p985-seg"><button class="on">Whole<small>' + mmss(f.dur) + '</small></button><button>Your marks<small>0:06</small></button><button>Selected clip<small>0:03</small></button></div>'));
      B.appendChild(h('<div class="row"><div><div class="k">Only one layer</div><div class="s">Picture and sound of just that layer</div></div><button class="pA-pick set">' + I.layer + 'Title' + I.down + '</button></div>'));
      B.appendChild(h('<div class="row"><div><div class="k">See-through background</div><div class="s">GIF and Frames only</div></div><span class="p985-sw off"></span></div>'));
      B.appendChild(h('<div class="p985-tech" style="padding-top:2px"><b>Technical details</b> — H.264, AAC 160 kb/s, key frame every 2 s.</div>'));
      n.appendChild(B);
    }
    n.appendChild(h('<div class="p985-foot"><button class="btn btn-accent p985-go">Export video</button></div>'));
    const card = mount(n);
    if (exOpen || moOpen) card._p985Scroll = 'bottom';
    if (state === 'exact' && wideC) card._p985Anchor = '.pC-sl.fps';
    return 'C ' + (state || 'first');
  };

  /* popFrom caps the card's height a moment after it opens (its ResizeObserver), so a scroll set at build time can land
     short — re-apply it once the card has settled. 'bottom' scrolls as far down as it can WITHOUT cutting a line of text
     at the top edge: the cut is moved up to the nearest gap between blocks (a scrolled-to-the-end card cut "WHAT TO MAKE"
     and a tile in half on the first pass). A sticky header (.p985-sticky) counts as covering the top. */
  const CUTS = '.p985-lbl, .p985-note, .pA-head, .pA-chips, .pA-rows, .pA-row, .pA-list, .pA-opt, .pA-more, .pA-mrow, ' +
    '.pB-grid, .pB-tile, .pB-strip, .pB-pair, .pB-row, .pB-ftbody .field, .pB-ftbody .swrow, ' +
    '.pC-sl, .pC-links, .pC-box, .pC-box .row, .pC-box .cap';
  X.settle = function () {
    const card = document.querySelector('#export-dialog .export-card');
    if (card._p985Scroll !== 'bottom') return card.scrollTop;
    card.scrollTop = 0;
    const max = card.scrollHeight - card.clientHeight;
    if (max <= 0) return 0;
    const top0 = card.getBoundingClientRect().top + (parseFloat(getComputedStyle(card).borderTopWidth) || 0);
    const st = card.querySelector('.p985-sticky');
    const cover = st ? st.getBoundingClientRect().height : 0;   // stuck flush to the top edge, it hides this much
    // a state can name the block that should sit at the top (just under any pinned header). If that needs more room
    // than the content has, a little is added above the Export row, so the opened part shows to its last line.
    if (card._p985Anchor) {
      const a = card.querySelector(card._p985Anchor);
      const sa = Math.max(0, Math.floor(a.getBoundingClientRect().top - top0 - 6 - cover));
      if (sa > max) card.querySelector('.p985-foot').insertAdjacentHTML('beforebegin', '<div class="p985-pad" style="height:' + (sa - max) + 'px"></div>');
      card.scrollTop = sa;
      return card.scrollTop;
    }
    // the bottom edge matters too: the sticky Export row covers everything under its top, so prefer a scroll where no
    // line of text is half under it (C's Technical details line was, on the second pass)
    const foot = card.querySelector('.p985-foot');
    // …and its shadow fades the ~14 px above it, so a line in that band reads as cut too (PC "More options", pass 3)
    const fTop = (foot ? foot.getBoundingClientRect().top : card.getBoundingClientRect().bottom) - top0 - 16;
    const texts = [];
    card.querySelectorAll('.p985 *').forEach(function (e) {
      if (!e.offsetParent || e.closest('svg') || (st && st.contains(e)) || (foot && foot.contains(e))) return;
      const txt = e.tagName === 'INPUT' || [].some.call(e.childNodes, function (c) { return c.nodeType === 3 && c.textContent.trim(); });
      if (!txt) return;
      const b = e.getBoundingClientRect();
      texts.push([b.top - top0, b.bottom - top0]);
    });
    const clean = function (y) { return texts.every(function (t) { return !(t[0] < y - 1 && t[1] > y + 1); }); };
    let best = 0, bestBoth = -1, up = Infinity;
    card.querySelectorAll(CUTS).forEach(function (e) {
      if (!e.offsetParent || (st && st.contains(e))) return;
      const y = e.getBoundingClientRect().top - top0;          // where the block starts, at scroll 0
      const s = Math.floor(y - 6 - cover);
      if (s < 0) return;
      if (s >= max) { if (s < up) up = s; return; }
      if (s > best) best = s;
      if (s > bestBoth && clean(s + fTop)) bestBoth = s;
    });
    // best of all: the first boundary just past the end, reached by adding a little room above the Export row —
    // then the top is a clean gap AND the opened section is shown to its last line (PC "More options" hid its
    // Technical details line under the Export row otherwise)
    // a little room (≤ 24 px) reads as ordinary padding; more than that looks like a hole, so a scroll that stops
    // short with a clean bottom edge wins over it, and a big room is only the last clean resort
    const pad = function () { if (up > max) card.querySelector('.p985-foot').insertAdjacentHTML('beforebegin', '<div class="p985-pad" style="height:' + (up - max) + 'px"></div>'); return up; };
    if (up - max <= 24) card.scrollTop = pad();
    else if (bestBoth >= 0) card.scrollTop = bestBoth;
    else if (up - max <= 80) card.scrollTop = pad();
    else card.scrollTop = best;
    return card.scrollTop;
  };

  /* ---------- measure what the shot shows: the card box, and any text that is clipped ---------- */
  X.measure = function () {
    const card = document.querySelector('#export-dialog .export-card');
    const r = card.getBoundingClientRect();
    const clipped = [];
    card.querySelectorAll('.p985 *').forEach(function (e) {
      if (!e.offsetParent || e.tagName === 'svg' || e.closest('svg')) return;
      const cs = getComputedStyle(e);
      if ((cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1) clipped.push((e.className || e.tagName) + ': ' + e.textContent.slice(0, 50));
    });
    const out = [];
    card.querySelectorAll('.p985 *').forEach(function (e) {
      if (!e.offsetParent || e.closest('svg')) return;
      const b = e.getBoundingClientRect();
      if (b.width && (b.right > r.right + 1 || b.left < r.left - 1)) out.push((e.className || e.tagName) + ' ' + Math.round(b.left) + '-' + Math.round(b.right));
    });
    return { card: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], scroll: [card.scrollTop, card.scrollHeight, card.clientHeight],
      vw: innerWidth, vh: innerHeight, clipped: clipped.slice(0, 12), outside: out.slice(0, 12) };
  };
})();
