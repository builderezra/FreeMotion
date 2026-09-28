/* PC FRIENDS PAIR — a THROWAWAY prototype for the option pictures. Nothing here ships and no app file is edited.
   Injected by render.sh through tools/shot.py --js-file, with two constants prepended:
     OPT  = 'A' (stacked, like the phone: small bar on top, big block hanging off the cog)
          | 'B' (side by side: Friends always left, Canvas always right by the cog; ⤢ slides the divider)
     PLAN = 'strip' (closed → Canvas → four frozen flight frames → Friends, for --frames 300,1300,2000,2600,3200,4300)
          | 'sizes' (Canvas, then Friends: --frames 900,2400)
   It uses the REAL pair code in js/app.js (cvPairApply / cvPairSwap / the Friends block from collab-ui.js): the phone gate
   `cvPhoneMq.matches` is answered "phone" for the length of ONE cog click, so openCanvasDialog puts the dialog in `cv-pair`
   while its PC anchor (min-width: 701px) still runs. The CSS below is what the build would add for PC.
   No network: localhost already makes relayGate() refuse a socket; WebSocket / RTCPeerConnection are stubbed to throw too,
   and nothing here presses Start sharing. */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message))); window.addEventListener('unhandledrejection', (e) => errs.push('rejection: ' + String(e.reason && e.reason.message || e.reason)));
window.WebSocket = function () { throw new Error('proto: no network'); };
window.RTCPeerConnection = function () { throw new Error('proto: no network'); };
try { localStorage.setItem('fm.profile', JSON.stringify({ name: 'Ezra', color: '#ff9f43' })); } catch (e) {}
try { localStorage.removeItem('fm.cvPair'); } catch (e) {}
FM.settings.set('collabLabs', true);
await sleep(250);

const COMMON = `
@media (min-width: 701px) {
  #canvas-dialog.cv-pair .cv-mini { align-items: center; gap: 12px; height: 64px; padding: 11px 12px 11px 14px; cursor: pointer; flex: none; box-sizing: border-box; }
  .cv-mini-ico { width: 38px; height: 38px; border-radius: 50%; flex: none; display: grid; place-items: center; background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }
  .cv-mini-ico svg { width: 21px; height: 21px; }
  .cv-mini-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .cv-mini-t { font-weight: 700; font-size: 15.5px; color: var(--text); }
  .cv-mini-s { font-size: 12.5px; color: var(--text-dim); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cv-fr-live { color: #4fd18b; font-weight: 700; }
  .cv-fr-faces { display: flex; flex: none; padding-left: 8px; }
  .cv-fr-faces:empty { display: none; }
  .cv-mini-exp { position: relative; width: 38px; height: 38px; flex: none; border-radius: 50%; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); display: grid; place-items: center; padding: 0; cursor: pointer; }
  .cv-mini-exp svg { width: 17px; height: 17px; }
  .cv-mini-trow { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .cv-mini-app { position: relative; flex: none; height: 24px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; }
  #canvas-dialog.cv-pair > #cv-friends { display: flex; flex-direction: column; overflow: hidden; position: relative; box-sizing: border-box; }
  #canvas-dialog.cv-pair:not(.cv-fr-big):not(.cv-flying) > #cv-friends > #cv-fr-body { display: none; }
  #canvas-dialog.cv-pair:not(.cv-fr-big) > #cv-friends > #cv-fr-bar { display: flex; }
  #canvas-dialog.cv-pair.cv-fr-big:not(.cv-flying) > .export-card { padding: 0; }
  #canvas-dialog.cv-pair.cv-fr-big:not(.cv-flying) > .export-card > :not(.cv-mini) { display: none; }
  #canvas-dialog.cv-pair.cv-fr-big > .export-card > .cv-mini { display: flex; }
  #canvas-dialog.cv-pair.cv-fr-big:not(.cv-flying) > #cv-friends > #cv-fr-bar { display: none; }
  #cv-fr-body { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; padding: 18px 18px 14px; }
  #canvas-dialog.cv-pair.cv-flying > .export-card, #canvas-dialog.cv-pair.cv-flying > #cv-friends { overflow: hidden; }
  #canvas-dialog.cv-pair.cv-flying > .export-card > .cv-mini,
  #canvas-dialog.cv-pair.cv-flying > #cv-friends > #cv-fr-bar { display: flex; position: absolute; left: 0; right: 0; top: 0; z-index: 2; }
  #canvas-dialog.cv-pair.cv-flying > #cv-friends > #cv-fr-body { display: flex; }
  #cv-fr-body .cs-start { width: 100%; min-height: 46px; border-radius: 12px; border: 1px solid var(--accent); background: var(--accent); color: #0b0e14; font-weight: 800; font-size: 15px; margin: 10px 0 6px; cursor: pointer; }
  #cv-fr-body .cs-fr-hint { font-size: 12.5px; color: var(--text-dim); text-align: center; margin-bottom: 12px; }
  body.cv-anchored #canvas-dialog.cv-pair > #cv-friends { animation: cv-grow 160ms cubic-bezier(.2, .8, .3, 1); transform-origin: bottom right; }
}`;

/* A — STACKED, like the phone. The pair is one column hanging off the cog: the dialog's padding does the anchoring the card's
   margin does today, so the big block's bottom-right corner sits exactly where the card's does now. */
const CSS_A = `
@media (min-width: 701px) {
  body.cv-anchored #canvas-dialog.cv-pair { flex-direction: column; align-items: flex-end; justify-content: flex-end; gap: 10px;
    padding: 16px var(--cv-anchor-right, 16px) var(--cv-anchor-bottom, 80px) 16px; }
  body.cv-anchored.cv-up #canvas-dialog.cv-pair > .export-card { margin: 0; }
  #canvas-dialog.cv-pair > .export-card, #canvas-dialog.cv-pair > #cv-friends { width: 360px; flex: none; }
  #canvas-dialog.cv-pair:not(.cv-fr-big) > #cv-friends { order: -1; }
  body.cv-anchored.cv-up #canvas-dialog.cv-pair > .export-card,
  body.cv-anchored.cv-up #canvas-dialog.cv-pair.cv-fr-big > #cv-friends { max-height: calc(100vh - var(--cv-anchor-bottom, 80px) - 16px - 74px); }
}`;

/* B — SIDE BY SIDE. A two-column grid hanging off the cog; Friends always left, Canvas always right (by the cog, so the tail
   never moves). The big one is 360 wide and the small one a 176 px tile at the foot, level with the cog; ⤢ slides the line between them. */
const CSS_B = `
@media (min-width: 701px) {
  body.cv-anchored #canvas-dialog.cv-pair { display: grid; grid-auto-flow: column; align-content: end; justify-content: end; align-items: end; column-gap: 10px;
    padding: 16px var(--cv-anchor-right, 16px) var(--cv-anchor-bottom, 80px) 16px; }
  body.cv-anchored.cv-up #canvas-dialog.cv-pair > .export-card { margin: 0; }
  #canvas-dialog.cv-pair > #cv-friends { order: -1; }
  #canvas-dialog.cv-pair > .export-card, #canvas-dialog.cv-pair.cv-fr-big > #cv-friends { width: 360px; }
  #canvas-dialog.cv-pair:not(.cv-fr-big) > #cv-friends, #canvas-dialog.cv-pair.cv-fr-big > .export-card { width: 176px; }
  body.cv-anchored.cv-up #canvas-dialog.cv-pair > .export-card,
  body.cv-anchored.cv-up #canvas-dialog.cv-pair > #cv-friends { max-height: calc(100vh - var(--cv-anchor-bottom, 80px) - 16px); }
  /* the small block is a TILE: the bar's parts stacked, ⤢ at the foot */
  #canvas-dialog.cv-pair .cv-mini { flex-direction: column; align-items: flex-start; height: auto; padding: 16px 14px 14px; gap: 10px; }
  #canvas-dialog.cv-pair.cv-flying > .export-card > .cv-mini, #canvas-dialog.cv-pair.cv-flying > #cv-friends > #cv-fr-bar { bottom: 0; height: auto; right: auto; width: 176px; }
  #canvas-dialog.cv-pair .cv-mini-txt { flex: none; width: 100%; }
  #canvas-dialog.cv-pair .cv-mini-s { white-space: normal; line-height: 1.35; margin-top: 4px; text-wrap: balance; }
  #canvas-dialog.cv-pair .cv-mini-trow { flex-wrap: wrap; row-gap: 8px; }
  #canvas-dialog.cv-pair .cv-mini-exp { margin-top: auto; align-self: flex-end; }
  #canvas-dialog.cv-pair .cv-fr-faces { padding-left: 8px; }
  /* in flight the contents keep their BIG width and are clipped, so nothing reflows while its block narrows */
  #canvas-dialog.cv-pair.cv-flying > .export-card > :not(.cv-mini) { width: 312px; }
  #canvas-dialog.cv-pair.cv-flying > #cv-friends > #cv-fr-body { width: 360px; box-sizing: border-box; }
}`;

const st = document.createElement('style');
st.id = 'pcp-proto';
st.textContent = COMMON + (OPT === 'B' ? CSS_B : CSS_A);
document.head.appendChild(st);

const d = Object.getOwnPropertyDescriptor(MediaQueryList.prototype, 'matches');
Object.defineProperty(MediaQueryList.prototype, 'matches', { configurable: true, get() { if (window.__pcpPhone && this.media === '(max-width: 700px)') return true; return d.get.call(this); } });

const dlg = document.getElementById('canvas-dialog');
const card = dlg.querySelector('.export-card');
const fr = document.getElementById('cv-friends');
const cog = document.getElementById('btn-settings');
const EASE = 'cubic-bezier(.2,.85,.25,1.06)';
let extra = [];
const flight = () => dlg.getAnimations({ subtree: true }).filter(a => !(window.CSSAnimation && a instanceof CSSAnimation) && !(window.CSSTransition && a instanceof CSSTransition));
/* A: the tail follows the BIG block, which is the one next to the cog (the plan's re-aim after every settle). */
const aim = () => {
  if (OPT !== 'A' || !FM.popFrom) return;
  const big = dlg.classList.contains('cv-fr-big') ? fr : card;
  if (FM._cvPop) { FM._cvPop(); FM._cvPop = null; }
  FM._cvPop = FM.popFrom(big, cog, { placed: true });
};
const PCP = window.PCP = {
  open(block) {
    try { localStorage.setItem('fm.cvPair', block); } catch (e) {}
    window.__pcpPhone = true;
    try { cog.click(); } finally { window.__pcpPhone = false; }
    aim();
  },
  swapTo(to) {
    if (OPT === 'A' && FM._cvPop) { FM._cvPop(); FM._cvPop = null; }   // A: the tail goes for the flight and comes back on the new big block
    const first = [card, fr].map(b => b.getBoundingClientRect());
    document.getElementById(to === 'friends' ? 'cv-fr-bar' : 'cv-mini').click();   // the REAL cvPairSwap
    if (OPT === 'B') {   // the plan's one change to the flight: left and width fly too
      const last = [card, fr].map(b => b.getBoundingClientRect());
      const real = flight();
      [card, fr].forEach((b, i) => extra.push(b.animate([{ left: first[i].left + 'px', width: first[i].width + 'px' }, { left: last[i].left + 'px', width: last[i].width + 'px' }], { duration: 460, fill: 'both', easing: EASE })));
      /* the real settle clears the inline styles when ITS flight lands; these go at the same moment (the build cancels them in cvPairSettle) */
      Promise.all(real.map(a => a.finished)).then(() => { extra.forEach(a => { try { a.cancel(); } catch (e) {} }); extra = []; }, () => {});
    }
  },
  freeze(p) { flight().forEach(a => { a.pause(); a.currentTime = p * 460; }); },
  release() {
    flight().forEach(a => { a.currentTime = 460; a.play(); });
    setTimeout(() => { extra.forEach(a => { try { a.cancel(); } catch (e) {} }); extra = []; aim(); }, 120);
  },
  measure() {
    const R = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
    const body = fr.querySelector('.cs-body');
    return { big: dlg.classList.contains('cv-fr-big') ? 'friends' : 'canvas', card: R(card), friends: R(fr), cog: R(cog),
      cardScroll: [card.scrollHeight, card.clientHeight], friendsBodyScroll: body ? [body.scrollHeight, body.clientHeight] : null,
      tail: card._popTail ? R(card._popTail) : (fr._popTail ? R(fr._popTail) : null), vw: innerWidth, vh: innerHeight };
  }
};
const log = window.__pcpLog = [];
if (PLAN === 'measure') {
  PCP.open('canvas'); await sleep(600);
  const m1 = PCP.measure();
  PCP.swapTo('friends'); await sleep(700); aim(); await sleep(200);
  const m2 = PCP.measure();
  return { opt: OPT, canvas: m1, friends: m2, errors: errs };
}
if (PLAN === 'flight') {   // the pair's rects at frozen points of the swap: does it stay standing on the cog?
  PCP.open('canvas'); await sleep(600);
  const R = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  PCP.swapTo('friends');
  const at = {};
  for (const p of [0, 0.1, 0.2, 0.3, 0.45, 0.7, 1]) { PCP.freeze(p); at[p] = { card: R(card), friends: R(fr) }; }
  PCP.release(); await sleep(400);
  return { opt: OPT, cogTop: Math.round(cog.getBoundingClientRect().top), at: at, settled: { card: R(card), friends: R(fr) } };
}
if (PLAN === 'strip') {
  setTimeout(() => { PCP.open('canvas'); }, 600);
  setTimeout(() => { log.push(PCP.measure()); PCP.swapTo('friends'); PCP.freeze(0.2); }, 1700);
  setTimeout(() => PCP.freeze(0.45), 2300);
  setTimeout(() => PCP.freeze(0.7), 2900);
  setTimeout(() => PCP.release(), 3500);
} else {
  PCP.open('canvas');
  setTimeout(() => { log.push(PCP.measure()); PCP.swapTo('friends'); }, 1400);
  setTimeout(() => aim(), 2000);
  setTimeout(() => { log.push(PCP.measure()); }, 2300);
}
return { opt: OPT, plan: PLAN, vw: innerWidth, vh: innerHeight };
