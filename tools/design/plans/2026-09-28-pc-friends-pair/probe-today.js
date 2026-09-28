/* PC TODAY — measure the cog's Canvas settings card and the Share button's panel (read-only; nothing in the app is edited).
   Run:  python3 tools/shot.py --width 1280 --height 800 --setup '' --js-file tools/design/plans/2026-09-28-pc-friends-pair/probe-today.js --out x.png
   No network: the page is on localhost, so relayGate() refuses a real socket; WebSocket and RTCPeerConnection are also stubbed to throw. */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
window.WebSocket = function () { throw new Error('probe: no network'); };
window.RTCPeerConnection = function () { throw new Error('probe: no network'); };
const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) }; };
const out = { vw: innerWidth, vh: innerHeight };
const cog = document.getElementById('btn-settings');
out.cog = R(cog);
out.export = R(document.getElementById('btn-export'));
out.shareLabsOff = R(document.getElementById('btn-share'));
out.shareLabsOffDisplay = document.getElementById('btn-share') ? getComputedStyle(document.getElementById('btn-share')).display : 'absent';
const dlg = document.getElementById('canvas-dialog');
cog.click(); await sleep(500);
const card = dlg.querySelector('.export-card');
out.canvas = { open: !dlg.classList.contains('hidden'), up: document.body.classList.contains('cv-up'), anchored: document.body.classList.contains('cv-anchored'), pair: dlg.classList.contains('cv-pair'),
  card: R(card), scrollH: card.scrollHeight, clientH: card.clientHeight, friendsBox: document.getElementById('cv-friends').getClientRects().length,
  roomAbove: Math.round(cog.getBoundingClientRect().top - 16), maxH: getComputedStyle(card).maxHeight, tail: R(card._popTail) };
const phase = (typeof PHASE !== 'undefined') ? PHASE : 'canvas';
if (phase === 'share') {
  document.getElementById('cv-cancel').click(); await sleep(200);
  FM.settings.set('collabLabs', true); await sleep(400);
  const sb = document.getElementById('btn-share');
  out.shareLabsOn = R(sb);
  out.shareParent = sb && sb.parentNode && (sb.parentNode.id || sb.parentNode.className);
  sb.click(); await sleep(1500);
  const sc = document.querySelector('.collab-scrim .collab-card');
  out.sharePanel = sc ? { id: sc.id, box: R(sc), scrollH: sc.scrollHeight, clientH: sc.clientHeight, session: !!(FM.collab && FM.collab.session) } : null;
}
return out;
