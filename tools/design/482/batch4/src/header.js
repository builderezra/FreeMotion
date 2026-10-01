/* #482 batch 4 — the label band drawn above each picture (run AFTER the app has been screenshotted: it covers the page).
   window.__b4hdr = { badge, title, rec, lines: [..], why, small }. Returns the band's clip for the screenshot. */
const H = window.__b4hdr || {};
document.querySelectorAll('.b4-hdr').forEach(e => e.remove());
const ov = document.createElement('div');
ov.className = 'b4-hdr';
ov.style.cssText = 'position:fixed;left:0;top:0;width:' + (H.width || innerWidth) + 'px;z-index:2147483647;background:#0f1117;color:#e9ecf3;' +
  'font:14px -apple-system,system-ui,sans-serif;padding:' + (H.small ? '10px 14px 9px' : '14px 14px 12px') + ';box-sizing:border-box;border-bottom:1px solid #262c38';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b style="color:#e9ecf3;font-weight:650">$1</b>');
let html = '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">';
if (H.badge) html += '<span style="flex:none;min-width:26px;height:26px;padding:0 6px;box-sizing:border-box;border-radius:8px;background:' + (H.rec ? '#4fd1a5' : '#2a3242') + ';color:' + (H.rec ? '#06281c' : '#e9ecf3') + ';font-weight:800;font-size:15px;display:inline-flex;align-items:center;justify-content:center">' + esc(H.badge) + '</span>';
html += '<span style="font-weight:700;font-size:' + (H.small ? 15 : 17.5) + 'px;letter-spacing:-.2px">' + esc(H.title || '') + '</span>';
if (H.rec) html += '<span style="background:#4fd1a5;color:#06281c;font-weight:750;font-size:11px;padding:3px 8px;border-radius:999px">★ Recommended</span>';
html += '</div>';
(H.lines || []).forEach(l => { html += '<div style="color:#a8afbf;font-size:12.5px;line-height:1.38;margin-top:6px">' + fmt(l) + '</div>'; });
if (H.why) html += '<div style="color:#bfeedd;font-size:12.5px;line-height:1.38;margin-top:7px;padding:7px 9px;border-radius:8px;background:rgba(79,209,165,.10);border:1px solid rgba(79,209,165,.28)">' + fmt(H.why) + '</div>';
ov.innerHTML = html;
document.body.appendChild(ov);
await new Promise(r => setTimeout(r, 120));
const hh = Math.ceil(ov.getBoundingClientRect().height);
ov.style.height = hh + 'px';   // a whole number of CSS px, so the clip never takes a row of the page beneath
await new Promise(r => setTimeout(r, 60));
return { clip: { x: 0, y: 0, width: Math.round(ov.getBoundingClientRect().width), height: hh } };
