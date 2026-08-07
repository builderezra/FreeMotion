/* FreeMotion — Home screen (AM-style project browser).
 * Full-screen overlay above the editor: all projects at a glance (thumbnail cards), plus a
 * Templates tab. Backed by FM.projects / FM.templates (storage.js). The editor stays mounted
 * underneath — opening a project just swaps the scene and hides this overlay.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let root = null, grid = null, tab = 'projects';
  let selectMode = false;                 // multi-select for bulk delete / duplicate (projects tab only)
  const selected = new Set();             // ids ticked while in select mode
  let query = '';                         // live search text ('' = not searching)

  function el(tag, cls, text) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }
  // role=button divs don't synthesise a click from Enter/Space like a real <button> — wire it so the
  // cards are keyboard-activatable (they announce as buttons to screen readers but did nothing on Enter).
  function keyActivate(elm) {
    elm.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elm.click(); } });
  }
  function ago(ts) {
    if (!ts) return '';
    const s = Math.max(1, (Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }
  function fmtDur(s) {
    s = Math.max(0, Math.round(s || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function aspectLabel(w, h) {
    if (!w || !h) return '';
    const r = w / h;
    if (Math.abs(r - 9 / 16) < 0.02) return '9:16';
    if (Math.abs(r - 16 / 9) < 0.02) return '16:9';
    if (Math.abs(r - 1) < 0.02) return '1:1';
    if (Math.abs(r - 4 / 5) < 0.02) return '4:5';
    if (Math.abs(r - 4 / 3) < 0.02) return '4:3';
    return w + '×' + h;
  }
  // "1080p" the way every editor labels it: the SHORT side (1080×1920 portrait is still 1080p).
  function resLabel(w, h) { return (w && h) ? Math.min(w, h) + 'p' : ''; }
  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ---------- search: forgiving name + date matching -------------------------------------------
   * Nothing here demands an exact query. Names match on substring, word-prefix, typo distance and
   * subsequence; date queries parse loosely ("yesterday", "last week", "aug", "2/8/26") into a
   * range and score by CLOSENESS, so the nearest project still surfaces when nothing falls inside
   * the range. Every result carries a 0..1 score; the list is ranked by it, best first.
   */
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const DAY_MS = 86400000;
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[\s_\-]+/g, ' ').trim(); }

  // Levenshtein distance — the typo tolerance ("prject" still finds "Project").
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = new Array(n + 1), cur = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
      }
      const t = prev; prev = cur; cur = t;
    }
    return prev[n];
  }
  // Initials / skipped-letter match ("sct" → "Spin Cut Transition"), scored by how tightly packed it is.
  function subseq(s, q) {
    let i = 0, first = -1, last = -1;
    for (let j = 0; j < s.length && i < q.length; j++) {
      if (s.charAt(j) === q.charAt(i)) { if (first < 0) first = j; last = j; i++; }
    }
    if (i < q.length) return 0;
    return Math.max(0.35, q.length / (last - first + 1));
  }
  // Initials, the way people actually abbreviate: "sct" → Spin Cut Transition.
  function initialsScore(s, q) {
    if (q.indexOf(' ') >= 0 || q.length < 2) return 0;
    const words = s.split(' ').filter(Boolean);
    if (words.length < 2 || q.length > words.length) return 0;
    for (let st = 0; st + q.length <= words.length; st++) {
      let ok = true;
      for (let i = 0; i < q.length; i++) if (words[st + i].charAt(0) !== q.charAt(i)) { ok = false; break; }
      if (ok) return st === 0 ? 0.84 : 0.78;
    }
    return 0;
  }
  function nameScore(name, q) {
    const s = norm(name), t = norm(q);
    if (!s || !t) return 0;
    if (s === t) return 1;
    const at = s.indexOf(t);
    if (at === 0) return 0.96;
    if (at > 0) return 0.9 - Math.min(0.12, at / 200);
    const words = s.split(' ').filter(Boolean);
    if (words.some(w => w.indexOf(t) === 0)) return 0.88;
    const ini = initialsScore(s, t);
    if (ini) return ini;
    let best = 0;
    for (const c of [s].concat(words)) {
      if (!c) continue;
      const sc = 1 - lev(c, t) / Math.max(c.length, t.length);
      if (sc > best) best = sc;
    }
    return Math.max(best * 0.86, subseq(s, t) * 0.7);
  }

  function dayStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function dayEnd(ts) { const d = new Date(ts); d.setHours(23, 59, 59, 999); return d.getTime(); }
  function daysInMonth(y, mo) { return new Date(y, mo + 1, 0).getDate(); }
  function monthIndex(w) {
    if (!w || w.length < 3) return -1;
    if (w === 'sept') return 8;
    for (let i = 0; i < 12; i++) if (MONTHS[i].indexOf(w) === 0) return i;
    return -1;
  }
  function monthRange(y, mo) { return { a: new Date(y, mo, 1).getTime(), b: new Date(y, mo + 1, 1).getTime() - 1 }; }
  // A day that doesn't exist ("31/6", "29/2/25") is NOT silently rolled into the next month — JS Date
  // would happily do that and we'd then announce "1 match" for a date the project was never touched on.
  function dayRange(y, mo, d) {
    if (d < 1 || d > daysInMonth(y, mo)) return null;
    const t = new Date(y, mo, d).getTime();
    return { a: dayStart(t), b: dayEnd(t) };
  }
  // Two-digit years: 26 → 2026, 99 → 1999 (nobody's editing video in 2099).
  function fullYear(y) { y = +y; return y >= 100 ? y : (y <= 79 ? 2000 + y : 1900 + y); }

  // Loose date query → {a, b} millisecond range, or null when the text isn't date-ish at all.
  function parseDateQuery(raw) {
    // NOT norm() — that collapses hyphens, which would eat "2026-08-02" and "2-8-26"
    const t = String(raw == null ? '' : raw).toLowerCase().replace(/\s+/g, ' ').trim();
    if (!t) return null;
    const now = Date.now(), D = new Date(now);
    let m;
    if (t === 'today') return { a: dayStart(now), b: dayEnd(now) };
    if (t === 'yesterday') return { a: dayStart(now - DAY_MS), b: dayEnd(now - DAY_MS) };
    if (t === 'this week' || t === 'week') return { a: dayStart(now - 6 * DAY_MS), b: dayEnd(now) };
    if (t === 'last week') return { a: dayStart(now - 13 * DAY_MS), b: dayEnd(now - 7 * DAY_MS) };
    if (t === 'this month' || t === 'month') return monthRange(D.getFullYear(), D.getMonth());
    if (t === 'last month') return monthRange(D.getFullYear(), D.getMonth() - 1);
    if (t === 'this year' || t === 'year') return { a: new Date(D.getFullYear(), 0, 1).getTime(), b: new Date(D.getFullYear() + 1, 0, 1).getTime() - 1 };
    if (t === 'last year') return { a: new Date(D.getFullYear() - 1, 0, 1).getTime(), b: new Date(D.getFullYear(), 0, 1).getTime() - 1 };
    // "3 days ago", "2 weeks ago", "6 months ago"
    m = t.match(/^(\d{1,3}) *(d|day|days|w|week|weeks|mo|month|months|y|year|years) *ago$/);
    if (m) {
      const n = +m[1], u = m[2];
      if (u[0] === 'd') { const ts = now - n * DAY_MS; return { a: dayStart(ts), b: dayEnd(ts) }; }
      if (u[0] === 'w') { const ts = now - n * 7 * DAY_MS; return { a: dayStart(ts - 3 * DAY_MS), b: dayEnd(ts + 3 * DAY_MS) }; }
      if (u[0] === 'm') return monthRange(D.getFullYear(), D.getMonth() - n);
      return { a: new Date(D.getFullYear() - n, 0, 1).getTime(), b: new Date(D.getFullYear() - n + 1, 0, 1).getTime() - 1 };
    }
    // ISO-ish: 2026-08-02, 2026/08, 2026-8
    m = t.match(/^(\d{4})[-\/](\d{1,2})(?:[-\/](\d{1,2}))?$/);
    if (m) { const y = +m[1], mo = +m[2] - 1; if (mo >= 0 && mo < 12) return m[3] ? dayRange(y, mo, +m[3]) : monthRange(y, mo); }
    // Day-first (he's in Perth): 2/8, 2-8-26, 02/08/2026
    m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2}|\d{4}))?$/);
    if (m) {
      const d = +m[1], mo = +m[2] - 1, y = m[3] ? fullYear(m[3]) : D.getFullYear();
      if (d >= 1 && d <= 31 && mo >= 0 && mo < 12) return dayRange(y, mo, d);
    }
    // Month names: "august", "aug 2026", "2 aug", "aug 2", "2 august 2026"
    const w = t.split(' ').filter(Boolean);
    if (w.length && w.length <= 3) {
      let mo = -1, day = 0, year = 0, ok = true;
      for (const part of w) {
        const mi = monthIndex(part);
        if (mi >= 0 && mo < 0) { mo = mi; continue; }
        if (/^\d{1,2}(st|nd|rd|th)?$/.test(part) && !day) { day = parseInt(part, 10); continue; }
        if (/^\d{4}$/.test(part) && !year) { year = +part; continue; }
        ok = false; break;
      }
      if (ok && mo >= 0) {
        const y = year || D.getFullYear();
        if (day >= 1) { const r = dayRange(y, mo, day); if (r) return r; }   // "feb 30" → fall back to the whole month rather than a wrong day
        return monthRange(y, mo);
      }
    }
    // A bare plausible year
    m = t.match(/^(\d{4})$/);
    if (m && +m[1] >= 1990 && +m[1] <= 2100) return { a: new Date(+m[1], 0, 1).getTime(), b: new Date(+m[1] + 1, 0, 1).getTime() - 1 };
    return null;
  }
  // Inside the range = a perfect hit; outside it fades over ~6 weeks so "closest" still means something.
  function dateScore(ts, range) {
    if (!ts || !range) return 0;
    if (ts >= range.a && ts <= range.b) return 1;
    const outDays = (ts < range.a ? range.a - ts : ts - range.b) / DAY_MS;
    return Math.max(0, 0.85 - outDays * 0.02);
  }
  // Best of name / created / edited. A date only counts as a real MATCH when the project actually
  // falls inside the range — proximity is for ranking the "closest" fallback, so asking for "today"
  // can't claim last week's project as a hit. `why` explains a date-driven row on the sub-line.
  function scoreProject(p, q, range) {
    const n = nameScore(p.name, q);
    let d = 0, inRange = false, why = '';
    if (range) {
      const cts = p.created || 0, ets = p.modified;
      const cs = dateScore(cts, range), es = dateScore(ets, range);
      d = Math.max(cs, es);
      inRange = d >= 1;
      // Only ever say "created" when a creation date was actually recorded — pre-v3.68 cards have
      // only an edit date, and labelling that as the creation date would be a plain lie.
      if (d > 0) why = (cts && cs >= es) ? ('created ' + fmtDate(cts)) : ('edited ' + fmtDate(ets));
    }
    return { score: Math.max(n, d), exact: n >= 0.45 || inRange, why: d > n ? why : '' };
  }

  function projectCard(p, subOverride) {
    // a DIV, not a button — a card is a <button> and the ⋯ is a nested <button>, which is invalid
    // HTML and silently breaks the inner tap on iOS Safari (the "three dots do nothing" bug).
    const card = el('div', 'hm-card' + (selectMode && selected.has(p.id) ? ' hm-sel' : ''));
    card.setAttribute('role', 'button'); card.tabIndex = 0; card.dataset.pid = p.id;
    card.setAttribute('aria-label', (p.name || 'Untitled') + ' — open project');
    const th = el('div', 'hm-thumb');
    // Thumbnails now live in IndexedDB (out of the autosave-hot index) — load async, placeholder first.
    const ph = el('span', 'hm-thumb-empty', '▶'); th.appendChild(ph);
    FM.projects.getThumb(p.id).then(url => { if (url) { const img = document.createElement('img'); img.src = url; img.alt = ''; img.addEventListener('load', () => { if (ph.parentNode) ph.remove(); }); th.insertBefore(img, ph); } });
    th.appendChild(el('span', 'hm-dur', fmtDur(p.duration)));   // AM-style timecode badge on the thumb
    if (p.id === FM.projects.currentId()) th.appendChild(el('span', 'hm-open-badge', 'OPEN'));
    if (selectMode) th.appendChild(el('span', 'hm-check' + (selected.has(p.id) ? ' on' : ''), selected.has(p.id) ? '✓' : ''));
    const name = el('div', 'hm-name', p.name || 'Untitled');
    // duration lives on the thumb badge; the meta line carries the AM set: aspect · resolution · fps · layers
    const meta = el('div', 'hm-meta');
    const mi = txt => { if (txt) meta.appendChild(el('span', 'hm-mi', txt)); };
    mi(aspectLabel(p.width, p.height));
    mi(resLabel(p.width, p.height));
    mi(p.fps ? p.fps + 'fps' : '');       // older cards have no fps yet — it fills in when the project is next opened
    mi(p.layers != null ? p.layers + (p.layers === 1 ? ' layer' : ' layers') : '');
    const sub = el('div', 'hm-sub', subOverride || ('edited ' + ago(p.modified)));
    const more = el('button', 'hm-card-more', '⋯');
    more.setAttribute('aria-label', 'Project actions');
    more.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = more.getBoundingClientRect();
      FM.contextMenu.show(Math.min(r.left, window.innerWidth - 210), r.bottom + 4, [
        { label: 'Open', action: () => openProject(p.id) },
        { label: 'Rename…', action: () => { const n = prompt('Project name:', p.name); if (n && n.trim()) { FM.projects.rename(p.id, n.trim()); render(); } } },
        { label: 'Duplicate', action: async () => { if (FM.toast) FM.toast('Duplicating…', 1200); await FM.projects.duplicate(p.id); render(); } },
        { label: 'Select…', action: () => { enterSelect(p.id); } },
        { label: 'Save as template…', action: async () => {
          const n = prompt('Template name:', p.name || 'My template'); if (!n || !n.trim()) return;
          const ok = await FM.templates.save(n.trim(), p.id);
          if (FM.toast) FM.toast(ok ? 'Template saved' : 'Could not save template');
        } },
        // EXPORT VIDEO — the same dialog the editor's Export button opens (format, resolution, frame
        // rate, quality, range). It used to fire FM.storage.exportFile() the instant you tapped, which
        // silently downloaded a .fmotion.json project file: no options, and not what "Export" means to
        // anyone. Rendering video needs the scene and its media actually loaded, so this opens the
        // project first and leaves you in it — you are exporting THAT project, so that is where you
        // should be standing.
        { label: 'Export video…', action: async () => {
          const ok = await openProject(p.id);
          if (!ok) { if (FM.toast) FM.toast('Busy opening a project — try again'); return; }
          // let the editor finish laying out before the dialog measures the project for its presets
          setTimeout(() => { if (FM.showExportDialog) FM.showExportDialog(); }, 260);
        } },
        // the project FILE (.fmotion.json) is a different thing — a backup you can re-import — so it
        // keeps its own entry, and still exports without stealing the OPEN badge from your project
        { label: 'Save project file…', action: async () => {
          const prev = FM.projects.currentId();
          const ok = await openProject(p.id, true);
          if (!ok) { if (FM.toast) FM.toast('Busy opening a project — try again'); return; }   // switch was skipped (another open in flight): exporting now would serialize the WRONG scene
          await FM.storage.exportFile();
          if (prev && prev !== p.id) { await openProject(prev, true); render(); }
        } },
        { sep: true },
        { label: 'Delete…', danger: true, action: async () => {
          if (!confirm('Delete "' + (p.name || 'Untitled') + '"? This cannot be undone.')) return;
          await FM.projects.remove(p.id); render();
        } },
      ]);
    });
    const body = el('div', 'hm-body');
    body.appendChild(name); body.appendChild(meta); body.appendChild(sub);
    card.appendChild(th); card.appendChild(body);
    if (!selectMode) card.appendChild(more);   // the ⋯ menu is redundant while selecting (the check owns that corner)
    card.addEventListener('click', () => {
      if (card._paintedAway) { card._paintedAway = false; return; }   // that "click" was the end of a drag-select
      if (selectMode) toggleSel(p.id); else openProject(p.id);
    });
    // Drag across cards to select a run of them. In select mode a drag paints immediately; outside
    // it, a HOLD enters select mode first and then paints — the same two ways in as the timeline.
    let holdTimer = null, downY = 0, downX = 0;
    card.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      if (ev.target.closest && ev.target.closest('.hm-card-more')) return;   // the ⋯ stays a button
      downX = ev.clientX; downY = ev.clientY;
      if (selectMode) { beginPaint(p.id, ev.clientY); }
      else {
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
          holdTimer = null;
          if (!card.isConnected) return;
          selectMode = true; selected.clear(); selected.add(p.id);
          document.body.classList.add('hm-selecting');
          render();                                   // one rebuild to draw the checks, BEFORE painting starts
          beginPaint(p.id, downY);
          if (paint) {
            paint.moved = true;
            paint.y = downY;
            // render() above replaced this card, so `card` is now a detached node — flag the LIVE one
            // (whichever node the follow-up click actually lands on) or the release immediately
            // un-ticks the project you just held to select.
            const live = grid && grid.querySelector('.hm-card[data-pid="' + p.id + '"]');
            if (live) live._paintedAway = true;
            card._paintedAway = true;
            // Arm the auto-scroll here too. The pointermove branch below only starts it on the
            // moved:false → true transition, and this path has already set moved — so entering select
            // mode by HOLD and then dragging to the edge of the list never scrolled.
            paint.raf = requestAnimationFrame(paintAutoScroll);
            paintClasses(); renderSelBar();
          }
        }, 380);
      }
    });
    card.addEventListener('pointermove', (ev) => {
      if (holdTimer && Math.hypot(ev.clientX - downX, ev.clientY - downY) > 10) { clearTimeout(holdTimer); holdTimer = null; }
      if (!paint) return;
      if (!paint.moved && Math.hypot(ev.clientX - downX, ev.clientY - downY) < 8) return;   // still a tap, not a drag
      if (!paint.moved) { paint.moved = true; card._paintedAway = true; paint.raf = requestAnimationFrame(paintAutoScroll); }
      ev.preventDefault();
      paint.y = ev.clientY;
      paintTo(ev.clientY);
    });
    const finish = () => { clearTimeout(holdTimer); holdTimer = null; endPaint(); };
    card.addEventListener('pointerup', finish);
    card.addEventListener('pointercancel', finish);
    keyActivate(card);
    return card;
  }

  /* ---------- paint-select: drag across cards to select a run of them ---------------------------
   * Same gesture the timeline uses on track heads, so it feels like one app: the selection this
   * drag makes is always the SPAN anchor→current card, which means dragging back the way you came
   * un-selects what you passed instead of forcing you to undo it by hand. Cards ticked before the
   * gesture started are never disturbed.
   *
   * Deliberately does NOT re-render while dragging — render() rebuilds the grid, which would detach
   * the card under your finger mid-gesture. Classes are painted straight onto the elements and the
   * bar is reconciled on release.
   */
  let paint = null;
  function cardEls() { return grid ? [].slice.call(grid.querySelectorAll('.hm-card[data-pid]')) : []; }
  function paintClasses() {
    cardEls().forEach(el => {
      const on = selected.has(el.dataset.pid);
      el.classList.toggle('hm-sel', on);
      const chk = el.querySelector('.hm-check');
      if (chk) { chk.classList.toggle('on', on); chk.textContent = on ? '✓' : ''; }
    });
  }
  function beginPaint(id, y) {
    const ids = cardEls().map(el => el.dataset.pid);
    const anchor = ids.indexOf(id);
    if (anchor < 0) return;
    paint = { ids: ids, anchor: anchor, pre: new Set(selected), last: anchor, moved: false, y: y, raf: 0 };
    // The cards' own pointerup only fires when you release ON the card you started from. Releasing
    // over a gap, over the select bar, or outside the grid left `paint` alive with its auto-scroll
    // rAF still running — the list kept scrolling by itself and the next tap painted a range.
    paint.onUp = function () { endPaint(); };
    window.addEventListener('pointerup', paint.onUp);
    window.addEventListener('pointercancel', paint.onUp);
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} }
  }
  function paintTo(clientY) {
    if (!paint) return;
    const els = cardEls();
    // Use each card's vertical band rather than elementFromPoint, so sliding sideways off the card
    // (or past the ends of the list) keeps extending the range instead of stalling.
    let idx = paint.last;
    for (let i = 0; i < els.length; i++) {
      const r = els[i].getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) { idx = i; break; }
      if (i === 0 && clientY < r.top) idx = 0;
      if (i === els.length - 1 && clientY > r.bottom) idx = els.length - 1;
    }
    paint.last = idx;
    const lo = Math.min(paint.anchor, idx), hi = Math.max(paint.anchor, idx);
    selected.clear();
    paint.pre.forEach(v => selected.add(v));           // pre-existing ticks survive untouched
    for (let i = lo; i <= hi; i++) selected.add(paint.ids[i]);
    paintClasses();
    renderSelBar();
  }
  // Auto-scroll when the finger sits near the top/bottom of the list, so a long run is reachable.
  function paintAutoScroll() {
    if (!paint) return;
    const sc = root && root.querySelector('.hm-scroll');
    if (sc) {
      const r = sc.getBoundingClientRect(), EDGE = 56;
      let d = 0;
      if (paint.y < r.top + EDGE) d = -(EDGE - (paint.y - r.top));
      else if (paint.y > r.bottom - EDGE) d = EDGE - (r.bottom - paint.y);
      if (d) { sc.scrollTop += d * 0.35; paintTo(paint.y); }
    }
    paint.raf = requestAnimationFrame(paintAutoScroll);
  }
  function endPaint() {
    if (!paint) return;
    if (paint.raf) cancelAnimationFrame(paint.raf);
    if (paint.onUp) { window.removeEventListener('pointerup', paint.onUp); window.removeEventListener('pointercancel', paint.onUp); }
    const did = paint.moved;
    paint = null;
    // `_paintedAway` exists to swallow the click that ends a drag — but that click lands on the card
    // you RELEASED over, so the flag on the card the drag STARTED from was never cleared and quietly
    // ate a genuine tap on it later. Clear them all once the click has had its turn (a 0ms timeout
    // runs after the click event that follows pointerup).
    setTimeout(function () { cardEls().forEach(function (el) { el._paintedAway = false; }); }, 0);
    renderSelBar();
    return did;
  }

  function toggleSel(id) {
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    // update the tapped card IN PLACE — a full render() rebuilt the whole grid and re-fetched every
    // thumbnail from IndexedDB per tick (each card flashing its ▶ placeholder) on a big library
    const card = grid && grid.querySelector('.hm-card[data-pid="' + id + '"]');
    if (card) {
      const on = selected.has(id);
      card.classList.toggle('hm-sel', on);
      const chk = card.querySelector('.hm-check');
      if (chk) { chk.classList.toggle('on', on); chk.textContent = on ? '✓' : ''; }
    }
    renderSelBar();
  }
  function enterSelect(preId) { selectMode = true; selected.clear(); if (preId) selected.add(preId); render(); }
  function exitSelect() { selectMode = false; selected.clear(); const b = document.getElementById('hm-selbar'); if (b) b.remove(); render(); }

  // Bottom action bar shown while selecting: Delete (n) · Duplicate (n) · Select all · Cancel.
  function renderSelBar() {
    let bar = document.getElementById('hm-selbar');
    if (!selectMode) { if (bar) bar.remove(); return; }
    if (!bar) { bar = el('div', 'hm-selbar'); bar.id = 'hm-selbar'; root.appendChild(bar); }
    bar.innerHTML = '';
    const n = selected.size;
    const count = el('span', 'hm-selcount', n + ' selected');
    const all = el('button', 'hm-selbtn', 'Select all');
    // "all" = everything CURRENTLY LISTED — with a search active, ticking projects you can't see
    // (and then hitting Delete) would be a nasty surprise
    all.addEventListener('click', () => { (shownIds.length ? shownIds : FM.projects.list().map(p => p.id)).forEach(id => selected.add(id)); renderSelBar(); render(); });
    const dup = el('button', 'hm-selbtn', 'Duplicate');
    dup.disabled = !n;
    dup.addEventListener('click', async () => { if (!n) return; const ids = [...selected]; if (FM.toast) FM.toast('Duplicating ' + ids.length + '…'); for (const id of ids) await FM.projects.duplicate(id); exitSelect(); });
    const del = el('button', 'hm-selbtn danger', 'Delete');
    del.disabled = !n;
    del.addEventListener('click', async () => {
      if (!n) return; let ids = [...selected];
      if (!confirm('Delete ' + ids.length + ' project' + (ids.length === 1 ? '' : 's') + '? This cannot be undone.')) return;
      if (FM.toast) FM.toast('Deleting ' + ids.length + '…');
      // delete the CURRENTLY-OPEN project LAST: remove() does a full project-switch (media decode +
      // refreshAll) whenever it deletes the open one, so deleting it first made every other doomed
      // project get fully opened in turn — order it last so that expensive switch happens once.
      const cur = FM.projects.currentId();
      ids = ids.sort((a, b) => (a === cur ? 1 : 0) - (b === cur ? 1 : 0));
      for (const id of ids) await FM.projects.remove(id);
      exitSelect();
    });
    const cancel = el('button', 'hm-selbtn', 'Cancel');
    cancel.addEventListener('click', exitSelect);
    bar.appendChild(count); bar.appendChild(el('span', 'hm-selspacer')); bar.appendChild(all); bar.appendChild(dup); bar.appendChild(del); bar.appendChild(cancel);
  }

  function templateCard(t) {
    const card = el('div', 'hm-card');   // div not button — same nested-button fix as projectCard
    card.setAttribute('role', 'button'); card.tabIndex = 0;
    const th = el('div', 'hm-thumb');
    if (t.thumb) { const img = document.createElement('img'); img.src = t.thumb; img.alt = ''; th.appendChild(img); }
    else th.appendChild(el('span', 'hm-thumb-empty', '❖'));
    th.appendChild(el('span', 'hm-dur', fmtDur(t.duration)));
    card.appendChild(th);
    const body = el('div', 'hm-body');
    body.appendChild(el('div', 'hm-name', t.name || 'Template'));
    body.appendChild(el('div', 'hm-meta', aspectLabel(t.width, t.height)));
    card.appendChild(body);
    const more = el('button', 'hm-card-more', '⋯');
    more.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = more.getBoundingClientRect();
      FM.contextMenu.show(Math.min(r.left, window.innerWidth - 210), r.bottom + 4, [
        { label: 'New project from template', action: use },
        { sep: true },
        { label: 'Delete template…', danger: true, action: async () => { if (!confirm('Delete template "' + t.name + '"?')) return; await FM.templates.remove(t.id); render(); } },
      ]);
    });
    more.setAttribute('aria-label', 'Template actions');
    card.appendChild(more);
    async function use() {
      if (FM.toast) FM.toast('Creating project…');
      const ok = await FM.templates.useAsNew(t.id);
      if (ok) FM.home.close(); else if (FM.toast) FM.toast('Could not load that template');
    }
    card.addEventListener('click', use);
    keyActivate(card);
    return card;
  }

  // An ELEMENT is a saved bundle of layers — a watermark, a logo, a lower-third — that you drop into
  // any edit instead of rebuilding it or hunting for the project you made it in. Its card leads with
  // INSERT, because that is the entire point of the thing; a template's leads with "new project".
  function elementCard(e) {
    const card = el('div', 'hm-card');   // div not button — same nested-button fix as projectCard
    card.setAttribute('role', 'button'); card.tabIndex = 0;
    const th = el('div', 'hm-thumb');
    if (e.thumb) { const img = document.createElement('img'); img.src = e.thumb; img.alt = ''; th.appendChild(img); }
    else th.appendChild(el('span', 'hm-thumb-empty', '✦'));
    card.appendChild(th);
    const body = el('div', 'hm-body');
    body.appendChild(el('div', 'hm-name', e.name || 'Element'));
    const n = e.count || 0;
    body.appendChild(el('div', 'hm-meta', n + (n === 1 ? ' layer' : ' layers')));
    card.appendChild(body);
    const more = el('button', 'hm-card-more', '⋯');
    more.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = more.getBoundingClientRect();
      FM.contextMenu.show(Math.min(r.left, window.innerWidth - 210), r.bottom + 4, [
        { label: 'Add to the open project', action: use },
        { sep: true },
        { label: 'Delete element…', danger: true, action: async () => { if (!confirm('Delete element "' + e.name + '"?')) return; await FM.elements.remove(e.id); render(); } },
      ]);
    });
    more.setAttribute('aria-label', 'Element actions');
    card.appendChild(more);
    async function use() {
      // Elements go INTO a project, so there has to be one open. Home is reachable with no project
      // loaded (first run, or after deleting the last one) — say so rather than failing silently.
      if (!FM.projects.currentId || !FM.projects.currentId()) {
        if (FM.toast) FM.toast('Open a project first, then add the element', 2200);
        return;
      }
      const ok = await FM.elements.insert(e.id);
      if (ok) { FM.home.close(); if (FM.toast) FM.toast('Added “' + e.name + '”'); }
      else if (FM.toast) FM.toast('That element’s data is missing — save it again');
    }
    card.addEventListener('click', use);
    keyActivate(card);
    return card;
  }

  // The + button is per-TAB (Ezra: "the templates and elements sections should actually work when you
  // press the create button, rn if you press the create button it creates a project not a template").
  // Templates and elements are both made FROM a project, so both routes pick one — there is nothing
  // else they could sensibly mean, and the alternative (a + that silently makes a project while you
  // are looking at a list of templates) is the bug being fixed.
  function pickProject(title, then) {
    const list = FM.projects.list();
    if (!list.length) { if (FM.toast) FM.toast('Make a project first — templates and elements are saved from one'); return; }
    const items = list.slice(0, 14).map(p => ({ label: p.name || 'Untitled', action: () => then(p) }));
    const btn = document.getElementById('hm-new'), r = btn.getBoundingClientRect();
    FM.contextMenu.show(Math.max(8, Math.min(r.left - 150, window.innerWidth - 230)), Math.max(8, r.top - 12 - Math.min(14, items.length) * 34),
      [{ label: title, disabled: true }, { sep: true }].concat(items));
  }
  function newFromTab() {
    if (tab === 'templates') {
      pickProject('Save which project as a template?', async (p) => {
        const name = prompt('Template name:', p.name || 'Template'); if (!name || !name.trim()) return;
        const ok = await FM.templates.save(name.trim(), p.id);
        if (FM.toast) FM.toast(ok ? 'Saved template “' + name.trim() + '”' : 'Could not save that template');
        render();
      });
      return;
    }
    if (tab === 'elements') {
      pickProject('Save which project as an element?', async (p) => {
        const name = prompt('Element name:', p.name || 'Element'); if (!name || !name.trim()) return;
        const ok = await FM.elements.saveFromProject(p.id, name.trim());
        if (FM.toast) FM.toast(ok ? 'Saved element “' + name.trim() + '”' : 'Could not save that element');
        render();
      });
      return;
    }
    newProjectDialog();
  }

  let _opening = false;
  async function openProject(id, keepOpen) {
    if (_opening) return false;   // ignore a second card tap while the first project's media is still decoding (two overlapping open() loads leaked media + raced refreshAll)
    _opening = true;
    try {
      if (id !== FM.projects.currentId()) await FM.projects.open(id);
      if (!keepOpen) FM.home.close();
      return true;   // callers (e.g. Export) need to know the switch actually happened, not got skipped
    } finally { _opening = false; }
  }

  let shownIds = [];   // project ids visible in the grid right now (search-aware; Select-all uses it)
  // A tick only counts while you can SEE the card. Without this, selecting three projects and then
  // typing a search would leave "3 selected" on the bar and Delete would take three projects that
  // are no longer on screen — the exact surprise the Select-all guard exists to prevent.
  function pruneSelection() {
    if (!selectMode || !selected.size) return;
    const live = new Set(shownIds);
    [...selected].forEach(id => { if (!live.has(id)) selected.delete(id); });
  }
  function render() {
    if (!grid) return;
    if (tab !== 'projects' && selectMode) { selectMode = false; selected.clear(); }   // select is projects-only
    document.body.classList.toggle('hm-selecting', selectMode);   // CSS hands card drags to paint-select instead of scrolling
    grid.innerHTML = '';
    shownIds = [];
    root.querySelectorAll('.hm-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    // header Select toggle (built once, kept in sync)
    const selBtn = document.getElementById('hm-select-btn');
    if (selBtn) { selBtn.textContent = selectMode ? 'Done' : 'Select'; selBtn.style.display = tab === 'projects' ? '' : 'none'; }
    // the + means something different on each tab — say which, so it isn't a mystery button
    const newBtn = document.getElementById('hm-new');
    if (newBtn) newBtn.setAttribute('aria-label', tab === 'templates' ? 'New template' : tab === 'elements' ? 'New element' : 'New project');
    if (tab === 'projects') {
      // Order follows Settings → Project sorting: most recently EDITED first (so the project you
      // just worked on is the front card), or plain A–Z by name.
      const byName = FM.settings && FM.settings.get('sort') === 'name';
      const list = FM.projects.list().slice().sort(byName
        ? (a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' })
        : (a, b) => (b.modified || 0) - (a.modified || 0));
      if (query) {
        if (!list.length) { grid.appendChild(el('div', 'hm-empty', 'No projects yet — tap + to create one.')); renderSelBar(); return; }
        const range = parseDateQuery(query);
        const scored = list.map(p => { const r = scoreProject(p, query, range); return { p: p, score: r.score, exact: r.exact, why: r.why }; })
          .sort((a, b) => (b.score - a.score) || ((b.p.modified || 0) - (a.p.modified || 0)));
        const strong = scored.filter(x => x.exact);
        const shown = strong.length ? strong : scored.slice(0, 5);   // never a dead end: fall back to the closest few
        grid.appendChild(el('div', 'hm-note', strong.length
          ? (strong.length + (strong.length === 1 ? ' match' : ' matches') + (range ? ' for that date' : '') + ' — best first')
          : 'Nothing matched “' + query + '” exactly. Closest projects:'));
        shown.forEach(x => { shownIds.push(x.p.id); grid.appendChild(projectCard(x.p, x.why || undefined)); });
        pruneSelection();
        renderSelBar();
        return;
      }
      if (!list.length) grid.appendChild(el('div', 'hm-empty', 'No projects yet — tap + to create one.'));
      // gentle housekeeping nudge on a big library (thumbs are out of the hot path now, so this is
      // informational — never a "you must delete to fix lag" like some other editors)
      const h = FM.projects.health && FM.projects.health();
      if (h && h.level !== 'ok' && !selectMode) {
        const msg = h.level === 'full'
          ? 'You have ' + h.count + ' projects. Things still run fast — but tap Select to tidy up any you don’t need.'
          : 'You have ' + h.count + ' projects. Tap Select to bulk-delete or duplicate.';
        grid.appendChild(el('div', 'hm-note', msg));
      }
      list.forEach(p => { shownIds.push(p.id); grid.appendChild(projectCard(p)); });
      pruneSelection();
    } else if (tab === 'templates') {
      let list = FM.templates.list();
      if (query && list.length) {
        // templates carry no dates — name matching only, same forgiving scorer
        const scored = list.map(t => ({ t: t, score: nameScore(t.name, query) })).sort((a, b) => b.score - a.score);
        const strong = scored.filter(x => x.score >= 0.45);
        const shown = strong.length ? strong : scored.slice(0, 5);
        grid.appendChild(el('div', 'hm-note', strong.length ? (strong.length + (strong.length === 1 ? ' match' : ' matches') + ' — best first') : 'Nothing matched “' + query + '” exactly. Closest templates:'));
        shown.forEach(x => grid.appendChild(templateCard(x.t)));
        renderSelBar();
        return;
      }
      if (!list.length) grid.appendChild(el('div', 'hm-empty', 'No templates yet. Tap + to save a project as one, or use a project card’s ⋯ → “Save as template…”.'));
      list.forEach(t => grid.appendChild(templateCard(t)));
    } else {
      // ELEMENTS — same shape as the templates branch, including the forgiving name search.
      let list = FM.elements.list();
      if (query && list.length) {
        const scored = list.map(e => ({ e: e, score: nameScore(e.name, query) })).sort((a, b) => b.score - a.score);
        const strong = scored.filter(x => x.score >= 0.45);
        const shown = strong.length ? strong : scored.slice(0, 5);
        grid.appendChild(el('div', 'hm-note', strong.length ? (strong.length + (strong.length === 1 ? ' match' : ' matches') + ' — best first') : 'Nothing matched “' + query + '” exactly. Closest elements:'));
        shown.forEach(x => grid.appendChild(elementCard(x.e)));
        renderSelBar();
        return;
      }
      if (!list.length) grid.appendChild(el('div', 'hm-empty', 'No elements yet. An element is a saved piece — a watermark, a logo, a lower-third — that you drop into any edit. Tap + to save a whole project as one, or inside a project select the layers and use ⋯ → “Save selection as element…”.'));
      list.forEach(e => grid.appendChild(elementCard(e)));
    }
    renderSelBar();
  }

  // Search bar show/hide. Closing always clears the query so reopening Home is never mysteriously filtered.
  function toggleSearch(force) {
    const bar = document.getElementById('hm-searchbar'), btn = document.getElementById('hm-search-btn'), inp = document.getElementById('hm-search-input');
    if (!bar || !inp) return;
    const on = force != null ? force : bar.classList.contains('hidden');
    bar.classList.toggle('hidden', !on);
    if (btn) { btn.classList.toggle('on', on); btn.setAttribute('aria-expanded', on ? 'true' : 'false'); }
    // focus SYNCHRONOUSLY inside the tap handler — WebKit only raises the software keyboard for a
    // focus() that still holds the user-gesture token, and a setTimeout callback has lost it
    if (on) { inp.focus(); }
    else {
      inp.value = '';
      const hint = document.querySelector('.hm-search-hint'); if (hint) hint.classList.remove('hidden');
      if (query) { query = ''; render(); }
    }
  }

  /* ---------- new-project dialog: every canvas option up front ---------------------------------
   * Aspect ratio + resolution (or a free custom W×H), frame rate (presets or custom), background
   * colour (or transparent) and the exact pixel size — so a project starts the way you want it
   * instead of being corrected later in Canvas settings. The picks are remembered for next time.
   */
  const NEWP_KEY = 'fm.newproj';
  const NP_ASPECTS = ['9:16', '16:9', '1:1', '4:5', '4:3', 'custom'];   // whitelist: a corrupt remembered value must not reach the a/b maths as NaN
  let npAspect = '9:16', npBg = '#000000', dlgEsc = null;
  const npEl = id => document.getElementById(id);
  const npClampDim = v => Math.max(16, Math.min(7680, Math.round((parseInt(v, 10) || 16) / 2) * 2));   // even + sane bounds, same clamp as Canvas settings
  function npCompute() {
    if (npAspect === 'custom') return { w: npClampDim(npEl('hm-new-w').value), h: npClampDim(npEl('hm-new-h').value) };
    const base = parseInt(npEl('hm-new-res').value, 10) || 1080;
    const pr = npAspect.split(':').map(Number), a = pr[0], b = pr[1];
    let w, h;
    if (a >= b) { h = base; w = base * a / b; } else { w = base; h = base * b / a; }   // the resolution is always the SHORT side
    return { w: Math.round(w / 2) * 2, h: Math.round(h / 2) * 2 };
  }
  function npFps() {
    const sel = npEl('hm-new-fps');
    const raw = (sel && sel.value === 'custom') ? (npEl('hm-new-fps-num') || {}).value : (sel ? sel.value : 30);
    return Math.max(1, Math.min(120, parseInt(raw, 10) || 30));
  }
  function npUpdate() {
    const custom = npAspect === 'custom';
    npEl('hm-new-res-row').classList.toggle('hidden', custom);
    npEl('hm-new-custom-size').classList.toggle('hidden', !custom);
    npEl('hm-new-custom-fps').classList.toggle('hidden', npEl('hm-new-fps').value !== 'custom');
    const dlg = npEl('hm-dialog');
    // aria-pressed too — the accent border is the ONLY selected-state cue otherwise, which tells a
    // screen-reader user (and a colour-blind one, on Black vs Charcoal) nothing at all
    dlg.querySelectorAll('.hm-aspect').forEach(b => { const on = b.dataset.aspect === npAspect; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    dlg.querySelectorAll('.hm-bg-sw').forEach(b => { const on = b.dataset.bg === npBg; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    const s = npCompute();
    npEl('hm-new-size').textContent = s.w + ' × ' + s.h + '  ·  ' + npFps() + ' fps';
  }
  function newProjectDialog() {
    const dlg = document.getElementById('hm-dialog');
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(NEWP_KEY)) || {}; } catch (e) {}
    npAspect = NP_ASPECTS.indexOf(saved.aspect) >= 0 ? saved.aspect : '9:16';
    npBg = (saved.bg === 'none' || /^#[0-9a-f]{6}$/i.test(saved.bg || '')) ? saved.bg : '#000000';
    // set every control EVERY time (not just when remembered) — the dialog is reused, so a value
    // left behind by the previous open would silently become the next project's setting
    npEl('hm-new-res').value = String(saved.res || 1080);
    npEl('hm-new-w').value = saved.w || 1080;
    npEl('hm-new-h').value = saved.h || 1920;
    const fsel = npEl('hm-new-fps'), fnum = npEl('hm-new-fps-num');
    const wantFps = String(saved.fps || 30);
    let has = false;
    for (let i = 0; i < fsel.options.length; i++) if (fsel.options[i].value === wantFps) has = true;
    if (has) { fsel.value = wantFps; fnum.value = 30; }
    else { fsel.value = 'custom'; fnum.value = wantFps; }
    if (/^#[0-9a-f]{6}$/i.test(npBg)) npEl('hm-new-bg').value = npBg;
    const input = npEl('hm-new-name');
    input.value = 'Project ' + (FM.projects.list().length + 1);
    npUpdate();
    dlg.classList.remove('hidden');
    // Focus the name field on a real keyboard only. On a phone, auto-focus throws the software
    // keyboard up the instant the dialog opens and pushes Create/Cancel off the visual viewport
    // (measured: a 667pt screen leaves ~380pt, the card is ~550pt) — the name already has a sane
    // default, so tapping the field when you actually want to rename is the better trade.
    const hasKeyboard = !window.matchMedia || matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (hasKeyboard) setTimeout(() => { input.focus(); input.select(); }, 30);
  }
  async function createFromDialog() {
    const dlg = npEl('hm-dialog');
    const name = (npEl('hm-new-name').value || '').trim() || 'Untitled';
    const s = npCompute(), fps = npFps();
    try { localStorage.setItem(NEWP_KEY, JSON.stringify({ aspect: npAspect, res: npEl('hm-new-res').value, fps: fps, bg: npBg, w: s.w, h: s.h })); } catch (e) {}
    dlg.classList.add('hidden');
    await FM.projects.create({ name: name, width: s.w, height: s.h, fps: fps, background: npBg === 'none' ? null : npBg });
    FM.home.close();
  }

  FM.home = {
    init() {
      root = document.getElementById('home-screen');
      if (!root) return;
      grid = root.querySelector('.hm-grid');
      root.querySelectorAll('.hm-tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
      document.getElementById('hm-new').addEventListener('click', newFromTab);   // per-tab: project / template / element
      // "Select" toggle in the top bar → enter/leave multi-select (bulk delete / duplicate)
      const top = root.querySelector('.hm-top');
      if (top && !document.getElementById('hm-select-btn')) {
        const sb = el('button', 'hm-select-btn', 'Select'); sb.id = 'hm-select-btn';
        sb.addEventListener('click', () => { if (selectMode) exitSelect(); else enterSelect(); });
        top.insertBefore(sb, top.querySelector('.hm-more'));
      }
      // settings cog — app-wide preferences (sorting, demo mode, defaults). Injected like the
      // Select button so the markup stays put; sits left of the ⋯ file menu.
      if (top && !document.getElementById('hm-settings-btn')) {
        const cg = el('button', 'hm-search-btn', ''); cg.id = 'hm-settings-btn';
        cg.setAttribute('aria-label', 'Settings'); cg.title = 'Settings';
        cg.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';   // same mark as the editor's cog
        cg.addEventListener('click', () => { if (FM.settings) FM.settings.open(); });
        top.insertBefore(cg, top.querySelector('.hm-more'));
      }
      // re-sort / re-render when a setting that affects this screen changes
      if (FM.settings) FM.settings.onChange(() => { if (FM.home.isOpen()) render(); });
      // top-right ⋯: file-level actions that used to live behind the editor's back arrow
      root.querySelector('.hm-more').addEventListener('click', (ev) => {
        const r = ev.currentTarget.getBoundingClientRect();
        FM.contextMenu.show(Math.min(r.left, window.innerWidth - 220), r.bottom + 4, [
          { label: 'Import project file…', action: () => { FM.storage.importFile(() => FM.home.close()); } },   // close on SUCCESS, not a blind 400ms timer (which dumped you into the editor even if you cancelled the picker)
          // NO "Save frame (PNG)" here: on Home there is no open project and so no frame to save.
          // It lives in the editor, where a frame actually exists.
          // Opens ON TOP of the home screen — reading the shortcut list shouldn't drop you into a
          // project you didn't ask to open (and, on a fresh install, shouldn't create one).
          { label: 'Shortcuts', action: () => { FM.shortcuts.toggle(); } },
        ]);
      });
      // search: magnifier → name/date bar over the list
      const sBtn = document.getElementById('hm-search-btn'), sInp = document.getElementById('hm-search-input');
      if (sBtn && sInp) {
        sBtn.addEventListener('click', () => toggleSearch());
        // debounced: render() rebuilds every card and re-reads each thumbnail from IndexedDB, so a
        // per-keystroke rebuild made a big library strobe its ▶ placeholders while typing
        let sTimer = null;
        sInp.addEventListener('input', () => {
          const hint = document.querySelector('.hm-search-hint');
          if (hint) hint.classList.toggle('hidden', !!sInp.value);   // reclaim the space once they're typing (phones: keyboard up)
          clearTimeout(sTimer);
          sTimer = setTimeout(() => { query = sInp.value.trim(); render(); }, 110);
        });
        sInp.addEventListener('keydown', e => {
          if (e.key === 'Escape') { e.preventDefault(); toggleSearch(false); }
          else if (e.key === 'Enter') { e.preventDefault(); sInp.blur(); }   // phones: close the keyboard, keep the results
        });
        const clr = document.getElementById('hm-search-clear');
        if (clr) clr.addEventListener('click', () => {
          sInp.value = ''; query = '';
          const hint = document.querySelector('.hm-search-hint'); if (hint) hint.classList.remove('hidden');
          render(); sInp.focus();
        });
      }
      // modal manners for the (now much bigger) new-project dialog: Escape closes, so does a tap on
      // the backdrop — on a phone with the keyboard up, the buttons can be the hardest thing to reach
      dlgEsc = e => { const d = document.getElementById('hm-dialog'); if (e.key === 'Escape' && d && !d.classList.contains('hidden')) { e.preventDefault(); d.classList.add('hidden'); } };
      document.addEventListener('keydown', dlgEsc);
      document.getElementById('hm-dialog').addEventListener('pointerdown', e => { if (e.target && e.target.id === 'hm-dialog') e.currentTarget.classList.add('hidden'); });
      // new-project dialog wiring
      const dlg = document.getElementById('hm-dialog');
      dlg.querySelectorAll('.hm-aspect').forEach(b => b.addEventListener('click', () => { npAspect = b.dataset.aspect; npUpdate(); }));
      dlg.querySelectorAll('.hm-bg-sw').forEach(b => b.addEventListener('click', () => {
        npBg = b.dataset.bg;
        if (/^#[0-9a-f]{6}$/i.test(npBg)) npEl('hm-new-bg').value = npBg;
        npUpdate();
      }));
      npEl('hm-new-bg').addEventListener('input', () => { npBg = npEl('hm-new-bg').value; npUpdate(); });
      npEl('hm-new-res').addEventListener('change', npUpdate);
      npEl('hm-new-fps').addEventListener('change', npUpdate);
      ['hm-new-w', 'hm-new-h', 'hm-new-fps-num'].forEach(id => { const inp = npEl(id); if (inp) inp.addEventListener('input', npUpdate); });
      npEl('hm-new-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); createFromDialog(); } });
      dlg.querySelector('#hm-create').addEventListener('click', createFromDialog);
      dlg.querySelector('#hm-cancel').addEventListener('click', () => dlg.classList.add('hidden'));
    },
    open() {
      if (!root) return;
      if (FM.pause) FM.pause(); else FM.playing = false;   // silence playback under the overlay (#r4)
      if (FM.groupContext && FM.exitGroup) FM.exitGroup(true);   // home always shows the top-level project
      if (FM.viewport) FM.viewport.reset();   // closing a project resets the preview pan/zoom (view-only)
      FM.projects.touchCurrent(true);   // fresh thumbnail for the card
      if (selectMode) { selectMode = false; selected.clear(); }
      tab = 'projects';       // set BEFORE toggleSearch: clearing a live query re-renders, and doing that on a stale 'templates' tab built a grid we immediately throw away
      toggleSearch(false);    // Home always opens on the full library, never a stale filter
      // one-time: lift legacy inline thumbs out of the index into IDB, then re-render so cards refill
      if (FM.projects.migrateThumbs) FM.projects.migrateThumbs().then(() => { if (root && !root.classList.contains('hidden')) render(); });
      render();
      root.classList.remove('hidden');
      document.body.classList.add('home-open');
      // Remember which screen the user is on, so a refresh / force-update reload puts them back
      // there instead of always landing on the project browser (the boot path reads this).
      try { localStorage.setItem('fm.view', 'home'); } catch (e) {}
    },
    close() {
      if (!root) return;
      root.classList.add('hidden');
      document.getElementById('hm-dialog').classList.add('hidden');
      document.body.classList.remove('home-open');
      if (FM.requestRender) FM.requestRender();
      try { localStorage.setItem('fm.view', 'editor'); } catch (e) {}   // in the editor now — reloads return here
    },
    isOpen() { return root && !root.classList.contains('hidden'); },
  };
})(window.FM);
