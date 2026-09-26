/* A JS port of WebKit's LocalFrameView::fixedContainerEdges for the TOP side only (WebKit main, Sep 2026:
 * Source/WebCore/page/LocalFrameView.cpp), run against the live DOM. It answers: at the point WebKit hit-tests
 * (viewport centre x, 4px down), which fixed/sticky container does it find, how does it classify it, and which
 * background-color would it take. Approximations: Chrome's elementFromPoint honours overflow clipping (WebKit
 * passes IgnoreClipping), and "has a child renderer" is estimated from displayed children / text / pseudo content. */
window.__edgeEmu = function () {
  const W = innerWidth, H = innerHeight;
  const vpW = W - 8, vpH = H - 8;                         // fixedRect is the layout viewport contracted by 4px
  const cmp = (len, vp) => (len < vp * 0.9 ? 'S' : len < vp * 1.05 ? 'M' : 'L');
  const rgba = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const hex = (c) => c ? '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('') + (c.a < 1 ? '@' + (+c.a).toFixed(2) : '') : null;
  const desc = (el) => el ? (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '')) : null;
  const hasChildRenderer = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) return true;
      if (n.nodeType === 1 && getComputedStyle(n).display !== 'none') return true;
    }
    for (const p of ['::before', '::after']) { const c = getComputedStyle(el, p).content; if (c && c !== 'none' && c !== 'normal') return true; }
    return false;
  };
  const hasBg = (cs) => { const c = rgba(cs.backgroundColor); return (c && c.a > 0) || (cs.backgroundImage && cs.backgroundImage !== 'none'); };
  const replaced = (el) => /^(IMG|VIDEO|CANVAS|IFRAME|SVG|svg|EMBED|OBJECT|INPUT)$/.test(el.tagName);
  const hidden = (el, cs) => cs.visibility !== 'visible' || +cs.opacity < 0.1
    || (!hasBg(cs) && (cs.backdropFilter || 'none') === 'none' && (cs.webkitBackdropFilter || 'none') === 'none' && !hasChildRenderer(el) && !replaced(el));
  const primaryBg = (el, cs, r) => {
    if (r.width <= 10 || r.height <= 10) return null;
    if (hidden(el, cs)) return null;
    const c = rgba(cs.backgroundColor);
    if (!c || c.a === 0) return null;
    if (cmp(r.width, vpW) === 'S') return null;
    return c;
  };
  const classify = (el, cs, r) => {
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return 'NotFixed';
    const side = cmp(r.width, vpW), adj = cmp(r.height, vpH);
    if (hidden(el, cs)) return 'Hidden';
    let dimming = false;
    if (side !== 'S' && adj !== 'S' && hasBg(cs) && !hasChildRenderer(el)) {
      const c = primaryBg(el, cs, r);
      dimming = +cs.opacity < 1 || !!(c && c.a < 1);
    }
    if (side === 'S') return adj !== 'S' ? 'Sidebar' : 'TooSmall';
    if (!dimming && adj === 'L') return 'TooLarge';
    if (dimming) return 'Dimming';
    if (side === 'M' && adj === 'M') return (parseInt(cs.zIndex, 10) < 0) ? 'NegZ' : 'ViewportSized';
    return 'Candidate';
  };
  const pass = (ignorePE) => {
    let st = null;
    if (ignorePE) { st = document.createElement('style'); st.textContent = '*,*::before,*::after{pointer-events:auto!important}'; document.head.appendChild(st); }
    const hit = document.elementFromPoint(W / 2, 4);
    if (st) st.remove();
    const walk = [];
    let primary = null, multiple = false, backdrop = false, invisiblePE = false;
    for (let el = hit; el && el.nodeType === 1; el = el.parentElement) {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      const type = classify(el, cs, r);
      if (type !== 'Hidden') {
        if ((cs.backdropFilter || 'none') !== 'none' || (cs.webkitBackdropFilter || 'none') !== 'none') backdrop = true;
        else { const c = primaryBg(el, cs, r); if (c) { if (!primary) primary = c; else if (hex(c) !== hex(primary)) multiple = true; } }
      }
      if (type !== 'NotFixed') walk.push(desc(el) + ':' + type);
      if (['Hidden', 'TooLarge', 'NegZ'].includes(type)) invisiblePE = cs.pointerEvents === 'none';
      if (['ViewportSized', 'Dimming', 'Sidebar', 'Candidate'].includes(type)) {
        return { hit: desc(hit), container: desc(el), type, colour: backdrop ? 'Multiple(backdrop)' : multiple ? 'none(multiple→pixel sample)' : hex(primary) || 'none(→pixel sample)', walk: walk.join(' ') };
      }
    }
    return { hit: desc(hit), container: null, retry: invisiblePE, walk: walk.join(' ') };
  };
  let res = pass(true);
  if (!res.container && res.retry) res = Object.assign(pass(false), { retried: true });
  const htmlBg = hex(rgba(getComputedStyle(document.documentElement).backgroundColor));
  const bodyBg = hex(rgba(getComputedStyle(document.body).backgroundColor));
  res.pageBg = htmlBg && !/@0\.00$/.test(htmlBg) ? htmlBg : bodyBg;
  res.home = document.body.classList.contains('home-open') ? (document.documentElement.getAttribute('data-home') || '?') : 'project';
  return res;
};
/* every rendered fixed/sticky element: what can become a top-edge container */
window.__fixedList = function () {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    if (el.closest('[style*="display: none"]')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    let p = el, shown = true; while (p) { if (getComputedStyle(p).display === 'none') { shown = false; break; } p = p.parentElement; }
    if (!shown) continue;
    out.push([(el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + [...el.classList].slice(0, 1).join('')), cs.position[0], Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height), 'z' + cs.zIndex, 'o' + cs.opacity, cs.visibility[0], cs.pointerEvents === 'none' ? 'pe-' : 'pe+', cs.backgroundColor.replace(/\s/g, '')].join(' '));
  }
  return out;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
let t0 = performance.now();
const snap = (label) => { const e = __edgeEmu(); log.push(label + '|' + e.home + '|hit ' + e.hit + '|' + (e.container ? e.container + ' ' + e.type + ' ' + e.colour : 'NONE') + '|pg ' + e.pageBg + (e.retried ? ' R' : '')); };
const seq = async (label, fn) => { fn(); t0 = performance.now(); for (const t of [0, 80, 250, 450, 800, 1400]) { const w = t - (performance.now() - t0); if (w > 0) await sleep(w); snap(label + '+' + t); } };
snap('start');
await seq('close', () => FM.home.close({ push: true }));
await seq('open', () => FM.home.open());
document.documentElement.setAttribute('data-home', 'dark'); try { FM.settings.set('homeLight', false); } catch (e) {}
await sleep(300); snap('dark');
await seq('closeD', () => FM.home.close({ push: true }));
await seq('openD', () => FM.home.open());
return log;
