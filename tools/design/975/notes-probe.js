  const sleep = ms => new Promise(r => setTimeout(r, ms));
  if (FM.home && FM.home.isOpen && FM.home.isOpen()) { FM.home.close(); await sleep(400); }
  try { localStorage.removeItem('fm.panelBig'); localStorage.removeItem('fm.panelBigByProject'); } catch (e) {}
  const P = FM.scene.project, seeded = [];
  const SHORT = window.__short === true;
  for (let i = 0; i < 20; i++) seeded.push({ id: 'n' + i, text: SHORT ? 'Note ' + (i + 1) : 'Note ' + (i + 1) + (i % 3 ? '' : ' — a longer one, so a few of the rows wrap onto a second line like real notes do'), remind: i % 4 === 0 });
  P.notes = seeded;
  FM.notepad.open(); await sleep(700);
  const card = document.querySelector('.np-scrim .np-card');
  if (window.__big && card._panelSize) { card._panelSize.setBig(true, false); await sleep(700); }
  const r = card.getBoundingClientRect(), list = card.querySelector('.np-list');
  const lb = list.getBoundingClientRect();
  const shown = [].filter.call(card.querySelectorAll('.np-row'), x => { const q = x.getBoundingClientRect(); return q.top >= lb.top - 1 && q.bottom <= lb.bottom + 1; }).length;
  const parts = {};
  ['.np-head', '.np-hint', '.np-list', '.np-add', '.np-actions'].forEach(s => { const e = card.querySelector(s); parts[s] = e ? Math.round(e.getBoundingClientRect().height) : null; });
  return { vw: innerWidth, vh: innerHeight, card: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], big: card.classList.contains('pb-big'), shown: shown, parts: parts, rowH: [].map.call(card.querySelectorAll('.np-row'), x => Math.round(x.getBoundingClientRect().height)).slice(0, 6) };
