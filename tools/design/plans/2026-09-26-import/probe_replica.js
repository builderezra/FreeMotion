// #960: dry-run the PC half of the proposed proving test, outside the runner (shot.py at a desktop size), in three
// trees simulated at runtime: 'none' = HEAD, 'rename' = rename without the CSS fix, 'renameFix' = rename + fix.
// It runs the test body at several replica heights and reports pass/fail + the numbers behind it.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MODE = window.__probeMode || 'none';
if (MODE === 'renameFix') { const st = document.createElement('style'); st.textContent = '@media (min-width: 701px) { .addmenu--fit .addmenu-pinned .addmenu-card .addmenu-lbl { white-space: nowrap; } }'; document.head.appendChild(st); }
const T = FM.addMenu._tabs(); const media = T.find(t => t.key === 'media'); const mOpt = media.options;
if (MODE !== 'none') media.options = function () { return mOpt.call(this).map(o => o.label === 'Import' ? Object.assign({}, o, { label: 'Import media' }) : o); };
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await sleep(700);

// ---- the test body, as it will be pasted (minus atWideWidth, which needs run.html's iframe) ----
async function body(W, H) {
  const KEY = 'fm.medialib', saved = localStorage.getItem(KEY);
  const panel = document.createElement('aside'); panel.className = 'panel';
  panel.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + W + 'px;height:' + H + 'px;overflow:auto';
  const box = document.createElement('div'); panel.appendChild(box); document.body.appendChild(panel);
  const info = {};
  try {
    localStorage.setItem(KEY, JSON.stringify([
      { mid: 't960v', key: 'k960v', name: 'Clip.mp4', kind: 'video', audio: false, w: 1080, h: 1920, dur: 4, added: 2 },
      { mid: 't960p', key: 'k960p', name: 'Shot.jpg', kind: 'image', audio: false, w: 1080, h: 1350, dur: 0, added: 1 }
    ]));
    FM.addMenu.render(box, { variant: 'panel' });
    await sleep(120);
    const root = box.querySelector('.addmenu');
    const tab = [...root.querySelectorAll('.addmenu-tab')].find(e => e.textContent.trim() === 'Media');
    tab.click(); await sleep(250);
    const pinned = [...root.querySelectorAll('.addmenu-pinned .addmenu-card')];
    info.fit = root.dataset.amFit || 'none';
    info.strip = Math.round(root.querySelector('.addmenu-pinned').getBoundingClientRect().height);
    const card = pinned.find(c => ((c.querySelector('.addmenu-lbl') || {}).textContent || '').trim() === 'Import media');
    if (!card) throw new Error('no "Import media" tile in the PC Media strip (strip: ' + pinned.map(c => c.textContent.trim()).join(', ') + ')');
    if (!root.classList.contains('addmenu--fit')) throw new Error('the PC Media tab is not in its fitted layout (data-am-fit ' + (root.dataset.amFit || 'none') + ', strip ' + info.strip + 'px) — the strip grew and took the grid\'s room');
    const lb = card.querySelector('.addmenu-lbl'), fs = parseFloat(getComputedStyle(lb).fontSize);
    const lines = lb.getBoundingClientRect().height / (fs * 1.2);
    info.lines = +lines.toFixed(2); info.fs = fs;
    if (lines > 1.4) throw new Error('"Import media" wraps to ' + lines.toFixed(1) + ' lines in the fitted PC strip (' + fs + 'px) — a two-line label makes the strip taller than the box the fit planned against');
    return 'PASS ' + JSON.stringify(info);
  } catch (e) { return 'FAIL ' + e.message + ' ' + JSON.stringify(info); }
  finally { panel.remove(); if (saved == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, saved); }
}
const out = {};
for (const [W, H] of [[307, 245], [307, 270], [307, 300], [285, 358], [307, 600]]) out[W + 'x' + H] = await body(W, H);
media.options = mOpt;
return { mode: MODE, w: innerWidth, out };
