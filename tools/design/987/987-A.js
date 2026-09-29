window.__OPT987 = 'A';
/* queue 987 — a THROWAWAY prototype for the options sheet (tools/design/987/987-sheet.py). Nothing here ships.
   Fakes a live session on the REAL app with no network: three people (Ezra the owner, Sam, Mia) in their
   palette colours, the stage's faces chip + LIVE pill, four notes in project.notes carrying a `by`, then
   opens the real Notes panel and marks each row with option OPT:
     now · today: no author at all
     A   · a coloured dot + the person's name above the note
     B   · a coloured stripe down the note's left edge
     C   · the person's face (initial in their colour, the Comments / stage-chip circle) beside the note
   The option letter is the first line of the generated per-option file: window.__OPT987 = 'A'; */
const OPT = window.__OPT987 || 'now';
const PEOPLE = {
  o: { mid: 'o', name: 'Ezra', color: '#a78bfa' },
  s: { mid: 'm_s', name: 'Sam', color: '#ff9f43' },
  m: { mid: 'm_m', name: 'Mia', color: '#a3e635' }
};
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function initial(n) { return String(n || '?').trim().charAt(0).toUpperCase() || '?'; }

/* 1. the editor, not Home */
try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
await new Promise(r => setTimeout(r, 700));

/* 1b. a small "Beach trip" project so the stage and timeline are not empty (985's demo scene) */
{
  const S = FM.scene, P = S.project;
  P.name = 'Beach trip';
  P.background = '#7cc4ec';
  const mk = (type, props) => { const l = FM.makeLayer(type, props); FM.insertLayer(l); return l; };
  mk('shape', { name: 'Sea', shape: 'rect', x: 540, y: 1560, shapeW: 1300, shapeH: 760, fill: '#1c6f9e', start: 0, duration: 24 });
  mk('shape', { name: 'Sand', shape: 'rect', x: 540, y: 1860, shapeW: 1300, shapeH: 260, fill: '#f0d49a', start: 0, duration: 24 });
  mk('shape', { name: 'Sun', shape: 'ellipse', x: 780, y: 420, shapeW: 300, shapeH: 300, fill: '#ffd24a', start: 0, duration: 24 });
  mk('shape', { name: 'Cloud', shape: 'cloud', x: 330, y: 560, shapeW: 420, shapeH: 285, fill: '#ffffff', start: 0, duration: 24 });
  mk('shape', { name: 'Boat', shape: 'boat', x: 600, y: 1240, shapeW: 300, shapeH: 300, fill: '#e2574c', start: 0, duration: 24 });
  mk('text', { name: 'Title', text: 'Beach trip', x: 540, y: 900, fontSize: 150, color: '#ffffff', start: 2, duration: 3 });
  S.selectedId = null; S.selectedIds = [];
  if (FM.autoFitDuration) FM.autoFitDuration();
  if (FM.refreshAll) FM.refreshAll();
  FM.time = 3; if (FM.requestRender) FM.requestRender();
  await new Promise(r => setTimeout(r, 400));
}

/* 2. the notes, as a shared project would hold them after three people wrote */
FM.scene.project.notes = [
  { id: 'n987a', text: 'Swap the intro song for the faster one', remind: true, by: PEOPLE.o },
  { id: 'n987b', text: 'Logo pops in too early — nudge it to 0:03', remind: false, by: PEOPLE.s },
  { id: 'n987c', text: 'Grade the beach clips a bit warmer', remind: true, by: PEOPLE.m },
  { id: 'n987d', text: 'Check the captions spelling before export', remind: false, by: PEOPLE.s }
];
if (FM.notepad && FM.notepad.sync) FM.notepad.sync();

/* 3. the stage looks live: faces chip (the real .collab-people / .cp-av classes) and the owner's LIVE pill */
const css = `
.p987-dotline { display: flex; align-items: center; gap: 6px; margin: 2px 0 -3px 9px; font: 700 11.5px/1.2 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #5d5440; }
.p987-dot { flex: none; width: 9px; height: 9px; border-radius: 50%; background: var(--peer); box-shadow: 0 0 0 1px rgba(0,0,0,.22) inset; }
.p987-col { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.p987-col .np-text { width: 100%; box-sizing: border-box; }
.np-row.p987-stripe { position: relative; padding-left: 12px; }
.np-row.p987-stripe::before { content: ""; position: absolute; left: 0; top: 7px; bottom: 7px; width: 5px; border-radius: 3px; background: var(--peer); box-shadow: 0 0 0 1px rgba(0,0,0,.14) inset; }
.p987-face { flex: none; width: 24px; height: 24px; margin-top: 4px; border-radius: 50%; display: grid; place-items: center; background: var(--peer); color: #111;
  font: 800 10.5px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 0 0 1px rgba(0,0,0,.18) inset; }
`;
const st = el('style'); st.textContent = css; document.head.appendChild(st);

const stage = document.getElementById('stage');
const real = document.getElementById('collab-people');
if (real) real.style.display = 'none';            // the idle invite door; a live session shows faces instead
const chip = el('button', 'collab-people p987-people');
chip.type = 'button';
[PEOPLE.o, PEOPLE.s, PEOPLE.m].forEach(p => { const a = el('span', 'cp-av', initial(p.name)); a.style.setProperty('--peer', p.color); chip.appendChild(a); });
stage.appendChild(chip);
const live = el('button', 'collab-live');
live.type = 'button';
live.appendChild(el('i', 'clv-dot'));
live.appendChild(el('span', 'clv-txt', 'LIVE'));
stage.appendChild(live);
const cr = chip.getBoundingClientRect(), sr = stage.getBoundingClientRect();
live.style.left = Math.round(cr.right - sr.left + 6) + 'px';

/* 4. the real Notes panel */
FM.notepad.open();
await new Promise(r => setTimeout(r, 900));        // the flip-open animation
const card = document.querySelector('.np-card');
const rows = Array.from(card.querySelectorAll('.np-row'));
const notes = FM.scene.project.notes;
rows.forEach((row, i) => {
  const by = notes[i] && notes[i].by;
  if (!by) return;
  row.style.setProperty('--peer', by.color);
  const ta = row.querySelector('.np-text');
  if (OPT === 'A') {
    const col = el('div', 'p987-col');
    const line = el('div', 'p987-dotline');
    line.appendChild(el('span', 'p987-dot'));
    line.appendChild(el('span', null, by.name));
    ta.parentNode.insertBefore(col, ta);
    col.appendChild(line);
    col.appendChild(ta);
  } else if (OPT === 'B') {
    row.classList.add('p987-stripe');
  } else if (OPT === 'C') {
    const f = el('span', 'p987-face', initial(by.name));
    f.title = by.name + '’s note';
    row.insertBefore(f, ta);
  }
  ta.dispatchEvent(new Event('np-fit'));
});
await new Promise(r => setTimeout(r, 200));
const b = card.getBoundingClientRect();
const pc = chip.getBoundingClientRect();
return { opt: OPT, card: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], chip: [Math.round(pc.left), Math.round(pc.top), Math.round(pc.width), Math.round(pc.height)], rows: rows.length, w: innerWidth, h: innerHeight };
