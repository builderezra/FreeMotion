/* TUTORIALS (#1082) — the lessons in Home's Tutorials tab.
   Ezra, 11 Oct (through the logging chat): yes to layout A — the same card rows as Projects, a reader per lesson with
   Previous and Next, "Start here" on the first — with the checked drafts (20 for the Full editor; Simple's, with its
   10 and 13 merged into one), every step re-checked against the app, and every lesson drawn with textContent only.

   The lessons are Markdown files in tutorials/, listed in order by tutorials/index.json. Both are fetched with the
   app's version as ?v=, so the service worker caches them like every script (sw.js isVersionedAsset: no ?v= means
   network only, which would leave the tab empty on a train) and a release that changes a lesson is never answered
   with the old copy. sw.js drops the superseded copies (its tutorials rule in pruneSuperseded).
   An entry marked "hidden" is a lesson for a feature that has not shipped yet; the suite says when to show it. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  /* What the files use, and nothing else: "# title", "1. step", **bold**, the lead-ins below and plain paragraphs.
     Anything else is shown as the text it is. Built with createElement + textContent only, so a lesson can never put
     markup, a script or an attribute on the page — a hostile file is one of the tests. */
  const LEAD = [['Before you start', 'pre'], ['Tip', 'tip'], ['Note', 'note'], ['If it doesn\'t work', 'warn'], ['On a computer', 'desk']];

  /* Two things are for reviewers, not readers, and come out first: the <!-- … --> notes after the steps (where and how
     each was checked) and everything from "## Verification" down (the table of checks). A comment left open is cut to
     the end of ITS line, never to the end of the file. */
  function clean(src) {
    const cut = String(src).search(/^#{2,3}\s+Verification/m);
    if (cut >= 0) src = String(src).slice(0, cut);
    return String(src).replace(/<!--[\s\S]*?-->/g, '').split('\n')
      .map(l => l.replace(/<!--.*$/, '').replace(/\s+$/, '')).join('\n');
  }

  function el(tag, cls, parent, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function inline(parent, text) {
    text.split(/\*\*([^*]+)\*\*/).forEach((s, i) => {
      if (!s) return;
      if (i % 2) el('strong', '', parent, s);
      else parent.appendChild(document.createTextNode(s));
    });
  }

  function lead(line) {
    const l = line.replace(/’/g, '\'');
    for (let i = 0; i < LEAD.length; i++) {
      const key = LEAD[i][0];
      if (l.indexOf(key + ':') === 0) return { label: line.slice(0, key.length), cls: LEAD[i][1], rest: line.slice(key.length + 1).replace(/^\s+/, '') };
    }
    return null;
  }

  // render(src, root): fills root and returns { title, intro, steps, callouts } (the suite reads the counts)
  function render(src, root) {
    const out = { title: '', intro: '', steps: 0, callouts: 0 };
    let ol = null;
    root.textContent = '';
    clean(src).split('\n').forEach(line => {
      if (!line.trim()) { ol = null; return; }
      let m;
      if ((m = /^#\s+(.*)$/.exec(line))) { out.title = m[1]; inline(el('h2', 'tut-title', root), m[1]); return; }
      if ((m = /^\d+\.\s+(.*)$/.exec(line))) {
        if (!ol) ol = el('ol', 'tut-steps', root);
        out.steps++;
        inline(el('li', '', ol), m[1]);
        return;
      }
      ol = null;
      const ld = lead(line);
      if (ld) {
        const box = el('div', 'tut-callout tut-' + ld.cls, root);
        el('span', 'tut-lab', box, ld.label);
        inline(el('span', 'tut-body', box), ld.rest);
        out.callouts++;
        return;
      }
      const p = el('p', out.intro ? '' : 'tut-intro', root);
      if (!out.intro) out.intro = line;
      inline(p, line);
    });
    return out;
  }

  // The app's own version label, as the ?v= of every lesson (see the top).
  function ver() {
    const v = document.querySelector('.brand .ver');
    return v ? v.textContent.trim().replace(/^v/, '') : '0';
  }

  let listP = null;
  function list() {
    if (!listP) {
      listP = fetch('tutorials/index.json?v=' + encodeURIComponent(ver()))
        .then(r => { if (!r.ok) throw new Error('tutorials/index.json ' + r.status); return r.json(); })
        .then(a => (Array.isArray(a) ? a : []).filter(e => e && e.file && e.title && !e.hidden))
        .catch(err => { listP = null; throw err; });   // a failed fetch is tried again next time, not remembered
    }
    return listP;
  }

  const texts = {};
  function load(file) {
    if (texts[file] != null) return Promise.resolve(texts[file]);
    return fetch('tutorials/' + file + '?v=' + encodeURIComponent(ver()))
      .then(r => { if (!r.ok) throw new Error(file + ' ' + r.status); return r.text(); })
      .then(t => (texts[file] = t));
  }

  const GROUPS = ['Start', 'Look', 'Move', 'Make', 'Share and manage'];
  const MODES = [['full', 'Full editor'], ['simple', 'Simple editor']];

  function card(it, idx, items, first) {
    const c = el('div', 'hm-card tut-card');
    c.setAttribute('role', 'button');
    c.tabIndex = 0;
    c.dataset.tut = it.file;
    const g = GROUPS.indexOf(it.group);
    const th = el('div', 'hm-thumb tut-thumb tut-g' + (g < 0 ? 0 : g), c);
    el('span', 'tut-num', th, String(idx + 1));
    if (first) el('span', 'tut-ribbon', th, 'Start here');
    const body = el('div', 'hm-body', c);
    el('div', 'hm-name', body, it.title);
    el('div', 'hm-meta', body, it.group || '');
    const go = () => open(items, idx);
    c.addEventListener('click', go);
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    return c;
  }

  /* fill(grid, query, ctx): Home's render() hands over its grid. The list may still be arriving, so the cards go in
     when it lands — unless a newer render owns the grid by then (ctx.still() says whether the Tutorials tab is still
     the one on screen; the counter catches a re-render on the same tab, such as a search keystroke). */
  let fills = 0;
  function fill(grid, query, ctx) {
    const n = ++fills;
    const still = () => n === fills && (!ctx || !ctx.still || ctx.still());
    const empty = (ctx && ctx.emptyState) || ((m, t, l) => el('div', 'hm-empty', null, t + (l ? ' — ' + l : '')));
    list().then(all => {
      if (!still()) return;
      const q = String(query || '').trim().toLowerCase();
      const both = MODES.filter(m => all.some(e => (e.mode || 'full') === m[0])).length > 1;
      let shown = 0;
      MODES.forEach(([mode, name]) => {
        const items = all.filter(e => (e.mode || 'full') === mode);
        const hits = items.filter(e => !q || (e.title + ' ' + (e.group || '') + ' ' + name).toLowerCase().indexOf(q) >= 0);
        if (!hits.length) return;
        if (both) el('div', 'hm-section tut-section', grid, name);
        hits.forEach(e => { grid.appendChild(card(e, items.indexOf(e), items, !q && shown === 0 && items.indexOf(e) === 0)); });
        shown += hits.length;
      });
      if (!shown) grid.appendChild(empty('▷', 'No tutorial matches “' + query + '”', 'Try a word like export, text or music.'));
    }).catch(() => {
      if (!still()) return;
      grid.appendChild(empty('▷', 'Couldn’t load the tutorials', 'Check your connection, then open this tab again.'));
    });
  }

  /* THE READER — one lesson over Home, Previous and Next within the same editor's lessons. It lives inside
     #home-screen, so it goes when Home goes; Home's render() closes it on any other tab. */
  let reader = null;
  function close() {
    if (!reader) return;
    reader.remove();
    reader = null;
    document.removeEventListener('keydown', onKey, true);
  }
  function onKey(e) { if (e.key === 'Escape' && reader) { e.stopPropagation(); close(); } }

  function chevron(parent) {
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M15 5l-7 7 7 7');
    s.appendChild(p);
    parent.appendChild(s);
  }

  function open(items, i) {
    const it = items && items[i];
    if (!it) return;
    const host = document.getElementById('home-screen') || document.body;
    const again = !!reader;
    close();
    reader = el('div', 'tut-reader' + (again ? '' : ' tut-arrive'), host);
    reader.setAttribute('role', 'dialog');
    reader.setAttribute('aria-label', it.title);
    reader.dataset.tut = it.file;
    const bar = el('div', 'tut-bar', reader);
    const back = el('button', 'tut-back', bar);
    back.type = 'button';
    back.setAttribute('aria-label', 'Back to the tutorials');
    chevron(back);
    const mode = MODES.find(m => m[0] === (it.mode || 'full'));
    el('div', 'tut-where', bar, (mode ? mode[1] : '') + ' · ' + (i + 1) + ' of ' + items.length);
    const scroll = el('div', 'tut-scroll', reader);
    const body = el('article', 'tut-article', scroll);
    el('p', 'tut-intro', body, 'Loading…');
    const pn = el('div', 'tut-pn', reader);
    const pv = el('button', 'tut-btn tut-prev', pn, '‹ Previous');
    const nx = el('button', 'tut-btn tut-next', pn, 'Next ›');
    pv.type = nx.type = 'button';
    pv.disabled = i === 0;
    nx.disabled = i === items.length - 1;
    pv.addEventListener('click', () => open(items, i - 1));
    nx.addEventListener('click', () => open(items, i + 1));
    back.addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);
    const mine = reader;
    load(it.file).then(src => { if (reader === mine) render(src, body); })
      .catch(() => { if (reader === mine) { body.textContent = ''; el('p', 'tut-intro', body, 'Couldn’t load this tutorial. Check your connection.'); } });
    try { back.focus({ preventScroll: true }); } catch (_) {}
  }

  FM.tutorials = { render: render, clean: clean, list: list, load: load, fill: fill, open: open, close: close, isOpen: () => !!reader };
})(window.FM);
