/* FreeMotion — live collaboration (queue 921), STAGE S7: comments. Spec §17.1, D9, §16.1–§16.2.
 *
 * His words for the role this serves: "I guess they could have it set so you can give the person viewing
 * permissions, kind of like what Google Docs and all that has … I think there's a third option as well" —
 * the third option is Commenter, and a commenter needs somewhere to say something that is not an edit.
 *
 * WHAT A COMMENT IS. `project.comments = [{id:'c_…', by:{mid,name,color}, at, text, lid?, t?, resolved?,
 * replies:[{id:'r_…', by, at, text}]}]` — in the document, so it travels, saves and undoes like everything
 * else, and ID-KEYED (collab-path.js KEYED), so two people commenting at once are two inserts, not a clash.
 * The HOST writes `by` and `at` on every insert (collab-host.js `stampAuthor`); what this file writes there
 * is only its best guess, replaced the moment the host's version comes back.
 *
 * ⚠️ D9: A COMMENT NEVER STOPS AN EXPORT. Only a note with `remind` does (notepad.js `pending()`), and
 * nothing here writes `notes`. The suite exports with unresolved comments present and asserts the export
 * dialog opens with no card in front of it.
 *
 * ⚠️ EVERY WORD ON THIS CARD WAS TYPED ON SOMEBODY ELSE'S DEVICE (§14.9). Names, text and colours go in as
 * textContent, and a colour is matched against the palette before it reaches a style attribute. There is
 * no innerHTML in this file.
 *
 * ⚠️ NOTHING HERE RUNS WITHOUT LABS. `install()` is called by collab-ui.js when the Labs switch is on and
 * `uninstall()` when it goes off; until then this file has defined one object and done nothing (§23).
 *
 * 📐 THREE LAYOUTS WERE DRAWN FIRST (rule 16 / #545), rendered in the real app at 380 and 1280:
 *   A · the notepad's paper card (BUILT) — the §17.1 family: yellow glued edge, the writing on paper,
 *       newest first, resolved folded away, the composer at the foot with the pin under the thumb.
 *   B · a thread list inside the dark Share card, behind a [People | Comments] segment.
 *   C · a speech bubble anchored at the ruler mark, one thread at a time.
 * A because a comment IS writing, and this app already has exactly one surface that says "people's
 * writing" at a glance (the notepad) — B made a comment look like one more setting in the sharing card,
 * and C covers the very ruler it points at on a phone and still needs a list somewhere for the rest.
 * 📐 AND ONE DEPARTURE FROM §17.1, measured: the ruler marks live in `#tl-ruler`, not `#tl-inner`. The ruler
 * row is `position: sticky`, so a mark placed in #tl-inner at ruler height scrolls away with the tracks the
 * moment the timeline is scrolled down, and #tl-ruler already carries the clip that stops the bookmarks
 * painting over the icon column (styles.css, queue 429). The x is still `FM.timeline.timeToX(t)`, shifted
 * by the ruler's own offset, so it is the same arithmetic every other overlay uses.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};
  const CM = {};
  const LIM = C.LIMITS || {};
  const MAX_TEXT = LIM.COMMENT || 2000, MAX_COMMENTS = LIM.COMMENTS || 500, MAX_REPLIES = LIM.REPLIES || 200;
  const PALETTE = ['#ff6b6b', '#ff9f43', '#a3e635', '#a78bfa', '#f472b6', '#6366f1', '#d4a373', '#e879f9'];
  const GREY = '#8a8f98';
  const ID_RE = /^[\w.-]{1,64}$/;

  let installed = false;
  let unRebuilt = null;
  let scrim = null, card = null, listEl = null, composer = null;
  let showResolved = false, replyFor = null, replyDraft = '', focusId = null;

  /* ═══ SMALL HELPERS ═══════════════════════════════════════════════════════════════════════════ */
  function el(tag, cls, text) { const d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; }
  function btn(cls, text, fn) { const b = el('button', cls, text); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; }
  function cleanName(s) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, LIM.NAME || 32); }
  function cleanColor(c) { const s = String(c == null ? '' : c).toLowerCase(); return PALETTE.indexOf(s) >= 0 ? s : null; }
  function initials(name) {
    const w = cleanName(name).split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    return ((w[0][0] || '') + (w.length > 1 ? (w[w.length - 1][0] || '') : '')).toUpperCase();
  }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function rid(prefix) {
    let s = '';
    const a = new Uint8Array(8);
    try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 8; i++) a[i] = Math.floor(Math.random() * 256); }
    for (let i = 0; i < 8; i++) s += (a[i] % 36).toString(36);
    return prefix + s;
  }
  function fmtTime(t) {
    const s = Math.max(0, Math.floor(+t || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function ago(at) {
    const m = Math.round((Date.now() - (+at || 0)) / 60000);
    if (!(m >= 1)) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    try { return new Date(+at).toLocaleDateString(); } catch (e) { return ''; }
  }

  /* ═══ THE LIST, AND WHO MAY DO WHAT (§16.1) ═══════════════════════════════════════════════════ */
  function list() {
    const P = FM.scene && FM.scene.project;
    return (P && Array.isArray(P.comments)) ? P.comments : [];
  }
  function ensureList() {
    const P = FM.scene.project;
    if (!Array.isArray(P.comments)) P.comments = [];
    return P.comments;
  }
  function role() { return C.myRole ? C.myRole() : 'owner'; }
  function myMid() { const s = C.session; return (s && C.active && !s.isOwner && s.mid) ? s.mid : 'o'; }
  function me() {
    const p = (C.ui && C.ui.getProfile) ? C.ui.getProfile() : null;
    return { mid: myMid(), name: (p && p.name) || 'You', color: (p && p.color) || GREY };
  }
  function mine(x) { return !!x && isObj(x.by) && x.by.mid === myMid(); }
  CM.canWrite = function () { return role() !== 'viewer'; };
  /* Owner and Editor: anyone's. Commenter: their own. Viewer: nothing. The host enforces the same table;
     this only decides which buttons are drawn. */
  function canChange(x) { const r = role(); return r === 'owner' || r === 'editor' || (r === 'commenter' && mine(x)); }
  function findComment(id) { const l = list(); for (let i = 0; i < l.length; i++) if (l[i] && l[i].id === id) return l[i]; return null; }
  function layerName(lid) {
    if (typeof lid !== 'string' || !FM.layerById) return null;
    const L = FM.layerById(FM.scene, lid);
    return L ? (L.name || 'Layer') : null;
  }

  /* One step per write, and nothing else: the diff turns it into ops and the host stamps them. */
  function commit() {
    if (FM.history && FM.history.commit) FM.history.commit();
    if (FM.storage && FM.storage.markDirty) FM.storage.markDirty();
  }
  function changed() { CM.paintMarks(); render(); if (C.ui && C.ui.onComments) { try { C.ui.onComments(); } catch (e) {} } }

  CM.count = function () { return list().filter(function (c) { return c && !c.resolved; }).length; };
  CM.list = function () { return list().slice(); };

  /* opts: {pin:true} puts it at the playhead, and on the selected layer when there is one. */
  CM.add = function (text, opts) {
    const o = opts || {};
    const tx = String(text == null ? '' : text).trim().slice(0, MAX_TEXT);
    if (!tx || !CM.canWrite()) return null;
    const l = ensureList();
    /* ⚠️ SAID ON THE CARD, NOT IN A TOAST UNDER IT (S7 review): the card is a full-screen scrim at z 3000 and
       the toast sits at 60, so Post simply appeared to do nothing. And "resolve" was the wrong advice — the
       ceiling counts resolved comments too (the host's does), so only deleting makes room. */
    if (l.length >= MAX_COMMENTS) { say('This project has ' + MAX_COMMENTS + ' comments — delete some first to add another'); return null; }
    const c = { id: rid('c_'), by: me(), at: Date.now(), text: tx, replies: [] };
    if (o.pin !== false) {
      c.t = Math.round((+FM.time || 0) * 1000) / 1000;
      const sel = FM.scene.selectedId;
      if (typeof sel === 'string' && ID_RE.test(sel) && FM.layerById && FM.layerById(FM.scene, sel)) c.lid = sel;
    }
    l.push(c);
    commit(); changed();
    return c.id;
  };
  CM.reply = function (cid, text) {
    const c = findComment(cid);
    const tx = String(text == null ? '' : text).trim().slice(0, MAX_TEXT);
    if (!c || !tx || !CM.canWrite()) return null;
    if (!Array.isArray(c.replies)) c.replies = [];
    if (c.replies.length >= MAX_REPLIES) return null;
    const r = { id: rid('r_'), by: me(), at: Date.now(), text: tx };
    c.replies.push(r);
    commit(); changed();
    return r.id;
  };
  /* ⚠️ RESOLVED IS WRITTEN `false`, NEVER DELETED. The host lets a Commenter `s` his own `resolved` and
     nothing else (collab-host.js `allowed`); taking the key away is a `d`, which it refuses — so a
     commenter who reopened his own comment would have been told "you can only comment". */
  CM.resolve = function (cid, on) {
    const c = findComment(cid);
    if (!c || !canChange(c)) return false;
    c.resolved = !!on;
    commit(); changed();
    return true;
  };
  CM.edit = function (cid, rid_, text) {
    const c = findComment(cid);
    if (!c) return false;
    const x = rid_ ? (Array.isArray(c.replies) ? c.replies.filter(function (r) { return r && r.id === rid_; })[0] : null) : c;
    const tx = String(text == null ? '' : text).trim().slice(0, MAX_TEXT);
    if (!x || !tx || !canChange(x)) return false;
    x.text = tx;
    commit(); changed();
    return true;
  };
  CM.remove = function (cid, rid_) {
    const l = list();
    const i = l.findIndex(function (c) { return c && c.id === cid; });
    if (i < 0) return false;
    if (rid_) {
      const rs = Array.isArray(l[i].replies) ? l[i].replies : [];
      const j = rs.findIndex(function (r) { return r && r.id === rid_; });
      if (j < 0 || !canChange(rs[j])) return false;
      rs.splice(j, 1);
    } else {
      if (!canChange(l[i])) return false;
      l.splice(i, 1);
    }
    commit(); changed();
    return true;
  };

  /* A message about what just happened on the card, ON the card — a toast is painted under it. */
  function say(msg) {
    const n = composer && composer.querySelector('.cc-say');
    if (n) { n.textContent = msg; n.classList.remove('hidden'); return; }
    if (FM.toast) FM.toast(msg, 3200);
  }

  /* ═══ THE PLAYHEAD'S HEAD, PARKED ON A COMMENT (S7 review) ═══════════════════════════════════════
   * A comment is pinned at the playhead by default, so its mark is drawn exactly where #tl-headtap sits —
   * a 34×26 button over an 18×16 mark in another stacking context (the sticky ruler row, z 7, under the
   * centreline's 12). The mark could not be seen and a tap on it added a BOOKMARK. So when the head is
   * over a comment's mark the head wears it (its colour, `on-comment`) and a tap on the head opens it —
   * the one place both can be. */
  const HEAD_HALF = 17;
  CM.atHead = function () {
    if (!installed || !FM.timeline || !FM.timeline.timeToX) return null;
    const hx = FM.timeline.timeToX(+FM.time || 0);
    let best = null, bd = HEAD_HALF;
    list().forEach(function (c) {
      if (!c || c.resolved || typeof c.t !== 'number' || !isFinite(c.t) || typeof c.id !== 'string') return;
      const d = Math.abs(FM.timeline.timeToX(c.t) - hx);
      if (d <= bd) { bd = d; best = c; }
    });
    return best ? best.id : null;
  };
  CM.syncHead = function () {
    const cl = document.getElementById('tl-centerline');
    if (!cl) return;
    const id = CM.atHead();
    cl.classList.toggle('on-comment', !!id);
    refreshPinLabel();                      // every time change passes through here — playback included
    const head = document.getElementById('tl-headtap');
    if (id) {
      const c = findComment(id);
      cl.style.setProperty('--cm-peer', cleanColor(c && c.by && c.by.color) || GREY);
      if (head) head.setAttribute('aria-label', 'Open the comment from ' + (cleanName(c && c.by && c.by.name) || 'someone') + ' here');
    } else {
      cl.style.removeProperty('--cm-peer');
      if (head && /^Open the comment/.test(head.getAttribute('aria-label') || '')) head.setAttribute('aria-label', 'Add or remove a bookmark at the playhead');
    }
  };

  /* ═══ THE RULER MARKS (§17.1) ═════════════════════════════════════════════════════════════════
   * One small speech bubble per open, timed comment, in its author's colour. It is a <button>, so the
   * timeline's scrub handler leaves it alone (it skips buttons), and its pointerdown stops before the
   * ruler's own long-press menu can start. Tapping one opens the card at that comment. */
  CM.paintMarks = function () {
    const ruler = document.getElementById('tl-ruler');
    document.querySelectorAll('.tl-cmark').forEach(function (n) { n.remove(); });
    if (!installed || !ruler || !FM.timeline || !FM.timeline.timeToX) return 0;
    const off = ruler.offsetLeft || 0;
    let n = 0;
    list().forEach(function (c) {
      if (!c || c.resolved || typeof c.t !== 'number' || !isFinite(c.t) || typeof c.id !== 'string') return;
      const m = el('button', 'tl-cmark');
      m.type = 'button';
      m.setAttribute('data-cid', c.id);
      m.style.left = (FM.timeline.timeToX(c.t) - off) + 'px';
      m.style.setProperty('--peer', cleanColor(c.by && c.by.color) || GREY);
      const who = cleanName(c.by && c.by.name) || 'Someone';
      m.setAttribute('aria-label', 'Comment from ' + who + ' at ' + fmtTime(c.t));
      m.title = who + ': ' + String(c.text || '').slice(0, 80);
      m.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      m.addEventListener('click', function (e) { e.stopPropagation(); CM.open({ at: c.id }); });
      ruler.appendChild(m);
      n++;
    });
    CM.syncHead();
    return n;
  };

  /* ═══ THE CARD ════════════════════════════════════════════════════════════════════════════════ */
  CM.isOpen = function () { return !!card && card.isConnected; };
  CM.open = function (opts) {
    const o = opts || {};
    if (!installed) return null;
    if (C.ui && C.ui.close) { try { C.ui.close(); } catch (e) {} }
    CM.close();
    focusId = typeof o.at === 'string' ? o.at : null;
    if (focusId) { const f = findComment(focusId); if (f && f.resolved) showResolved = true; }
    scrim = el('div', 'np-scrim cc-scrim');
    card = el('div', 'np-card cc-card');
    card.id = 'collab-comments';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Comments');
    const head = el('div', 'np-head');
    head.appendChild(el('div', 'np-title cc-title', ''));
    head.appendChild(btn('btn np-done cc-done', 'Done', CM.close));
    card.appendChild(head);
    listEl = el('div', 'cc-list');
    card.appendChild(listEl);
    composer = el('div', 'cc-comp');
    card.appendChild(composer);
    scrim.appendChild(card);
    document.body.appendChild(scrim);
    /* ⚠️ WHAT MUST STAY ABOVE THIS CARD KNOWS IT IS OPEN (S7 review). The card borrows the notepad's scrim
       (z 3000), and the ⋯ menu (#ctx-menu, 300), the knock card (225) and every toast (60) were painted under
       it — Edit and Delete could not be reached at all, and "Let in" took two taps. `cc-open` lifts those
       three above it (styles.css), still under FM.ask (3200). */
    document.body.classList.add('cc-open');
    let downOnScrim = false;   // queue 944: close on the CLICK of a press that began on the backdrop — see js/collab-ui.js openCard
    scrim.addEventListener('pointerdown', function (e) { downOnScrim = e.target === scrim; });
    scrim.addEventListener('click', function (e) { if (e.target === scrim && downOnScrim) CM.close(); downOnScrim = false; });
    card._esc = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); CM.close(); } };
    window.addEventListener('keydown', card._esc, true);
    drawComposer();
    render();
    if (focusId) {
      const t = card.querySelector('.cc-c[data-cid="' + focusId + '"]');
      if (t) { t.classList.add('cc-focus'); try { t.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
    }
    return card;
  };
  CM.close = function () {
    if (card && card._esc) window.removeEventListener('keydown', card._esc, true);
    if (scrim && scrim.parentNode) scrim.parentNode.removeChild(scrim);
    document.body.classList.remove('cc-open');
    scrim = card = listEl = composer = null;
    replyFor = null; replyDraft = '';
  };

  /* The composer. Drawn once per open and again only when the role changes, so what he is typing survives
     every remote comment that arrives while he types (render() redraws the list, never this). */
  function drawComposer() {
    if (!composer) return;
    const was = composer.querySelector('textarea');
    const draft = was ? was.value : '';
    composer.textContent = '';
    composer.classList.toggle('cc-ro', !CM.canWrite());
    if (!CM.canWrite()) {
      composer.appendChild(el('div', 'cc-note', 'You can read the comments. Ask the owner to make you a Commenter or an Editor to add one.'));
      return;
    }
    const note = el('div', 'cc-note cc-say hidden');
    note.setAttribute('role', 'status');
    composer.appendChild(note);
    const ta = el('textarea', 'cc-input');
    ta.rows = 1;
    ta.maxLength = MAX_TEXT;
    ta.placeholder = 'Add a comment…';
    ta.setAttribute('aria-label', 'Add a comment');
    ta.value = draft;
    const grow = function () { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
    ta.addEventListener('input', grow);
    composer.appendChild(ta);
    const row = el('div', 'cc-comprow');
    const lab = el('label', 'cc-pinbox');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = true;
    lab.appendChild(cb);
    /* §17.1's "Pin to '<layer>' at 0:04" when a layer is selected — and when none is, still "At 0:04",
       because a comment on the edit is almost always about a moment in it, and the ruler mark is how
       anybody finds it again. Untick for a comment about the whole project. */
    lab.appendChild(el('span', 'cc-pinlabel', pinLabelText()));
    row.appendChild(lab);
    row.appendChild(btn('cc-post', 'Post', function () {
      const v = ta.value;
      if (!v.trim()) { ta.focus(); return; }
      ta.blur();
      if (CM.add(v, { pin: cb.checked })) { ta.value = ''; grow(); note.classList.add('hidden'); }
    }));
    composer.appendChild(row);
  }

  function pinLabelText() {
    const ln = layerName(FM.scene.selectedId);
    return ln ? 'Pin to “' + ln.slice(0, 32) + '” at ' + fmtTime(FM.time) : 'At ' + fmtTime(FM.time) + ' on the timeline';
  }
  /* ⚠️ THE LABEL IS WHERE THE COMMENT WILL GO, SO IT FOLLOWS THE PLAYHEAD (S7 review). It was written once
     per open; a tap on another comment's "at 0:03" moved the playhead (and selected its layer) with the
     card still open, and the next Post landed at 0:03 under a label that still said 0:01. Only the label
     is rewritten — never the textarea, so the draft survives. */
  function refreshPinLabel() {
    const n = composer && composer.querySelector('.cc-pinlabel');
    if (n) n.textContent = pinLabelText();
  }
  CM._refreshPinLabel = refreshPinLabel;
  function avatar(by) {
    const a = el('span', 'cc-av', initials(by && by.name));
    a.style.background = cleanColor(by && by.color) || GREY;
    return a;
  }
  /* ⚠️ S8 review: A NAME AND A COLOUR ARE CHOSEN ON THE OTHER DEVICE, SO THEY CANNOT SAY WHO IS THE OWNER. The host
     stamps every comment with the sender's member id (§16.2), and the owner's is always `o` — but the byline
     drew only the name and colour, so a guest whose profile said "Ezra" in Ezra's colour wrote comments that
     looked exactly like his on every device, his own included. The badge is drawn from the id the host wrote,
     which nobody else can have. */
  function byline(x) {
    const top = el('div', 'cc-top');
    top.appendChild(avatar(x.by));
    top.appendChild(el('span', 'cc-name', cleanName(x.by && x.by.name) || 'Someone'));
    if (C.active && x.by && x.by.mid === 'o') top.appendChild(el('span', 'cc-owner', 'Owner'));   // only while shared: alone, every comment is his
    top.appendChild(el('span', 'cc-time', '· ' + ago(x.at)));
    return top;
  }
  function moreMenu(anchor, c, r) {
    const x = r || c;
    const items = [];
    if (canChange(x)) {
      items.push({ label: 'Edit', action: function () {
        if (!FM.ask) return;
        /* MULTI-LINE, like the box it was written in (S7 review): a one-line field strips every line break
           out of its value, so Save — even with nothing changed — joined the lines into one. */
        FM.ask({ title: r ? 'Edit reply' : 'Edit comment', input: { value: x.text || '', multiline: true }, ok: 'Save' }).then(function (v) {
          if (v != null && String(v).trim()) CM.edit(c.id, r ? r.id : null, v);
        });
      } });
      items.push({ label: 'Delete', danger: true, action: function () { CM.remove(c.id, r ? r.id : null); } });
    }
    if (!items.length || !FM.contextMenu) return;
    const b = anchor.getBoundingClientRect();
    FM.contextMenu.show(b.left, b.bottom + 4, items);
  }

  function render() {
    if (!listEl || !card) return;
    const all = list().filter(function (c) { return isObj(c) && typeof c.id === 'string'; });
    const open = all.filter(function (c) { return !c.resolved; }).sort(function (a, b) { return (+b.at || 0) - (+a.at || 0); });
    const done = all.filter(function (c) { return c.resolved; }).sort(function (a, b) { return (+b.at || 0) - (+a.at || 0); });
    const title = card.querySelector('.cc-title');
    if (title) title.textContent = open.length ? 'Comments · ' + open.length + ' open' : 'Comments';
    const keepScroll = listEl.scrollTop;
    listEl.textContent = '';
    if (!all.length) listEl.appendChild(el('div', 'cc-empty', CM.canWrite() ? 'No comments yet. Say something about the edit below — it never gets in the way of an export.' : 'No comments yet.'));
    open.forEach(function (c) { listEl.appendChild(thread(c)); });
    if (done.length) {
      listEl.appendChild(btn('cc-resolved', done.length + ' resolved — ' + (showResolved ? 'hide' : 'show'), function () { showResolved = !showResolved; render(); }));
      if (showResolved) done.forEach(function (c) { listEl.appendChild(thread(c)); });
    }
    listEl.scrollTop = keepScroll;
  }

  function thread(c) {
    const d = el('div', 'cc-c' + (c.resolved ? ' cc-done' : '') + (c.id === focusId ? ' cc-focus' : ''));
    d.setAttribute('data-cid', c.id);
    d.appendChild(byline(c));
    if (typeof c.t === 'number' && isFinite(c.t)) {
      const ln = layerName(c.lid);
      /* Tapping where it is pinned takes the playhead there — the one thing a comment about a moment asks
         of whoever reads it. */
      d.appendChild(btn('cc-pin', (ln ? 'on “' + ln.slice(0, 32) + '” ' : '') + 'at ' + fmtTime(c.t), function () {
        if (FM.setTime) FM.setTime(c.t);
        if (ln && FM.selectLayer && FM.layerById(FM.scene, c.lid) && !C.readOnly()) FM.selectLayer(c.lid);
        refreshPinLabel();
      }));
    }
    d.appendChild(el('div', 'cc-text', String(c.text || '')));
    (Array.isArray(c.replies) ? c.replies : []).forEach(function (r) {
      if (!isObj(r)) return;
      const rd = el('div', 'cc-reply');
      rd.setAttribute('data-rid', String(r.id || ''));
      const top = byline(r);
      /* A reply's ⋯ sits on its own byline, at the end — on a line of its own it read as a stray. */
      if (canChange(r)) {
        const more = btn('cc-more cc-rmore', '⋯', function () { moreMenu(more, c, r); });
        more.setAttribute('aria-label', 'More for this reply');
        top.appendChild(more);
      }
      rd.appendChild(top);
      rd.appendChild(el('div', 'cc-text', String(r.text || '')));
      d.appendChild(rd);
    });
    const acts = el('div', 'cc-acts');
    if (CM.canWrite()) acts.appendChild(btn('cc-replybtn', 'Reply', function () { replyFor = replyFor === c.id ? null : c.id; replyDraft = ''; render(); focusReply(); }));
    if (canChange(c)) acts.appendChild(btn('cc-resolve', c.resolved ? 'Reopen' : 'Resolve', function () { CM.resolve(c.id, !c.resolved); }));
    if (canChange(c)) {
      const more = btn('cc-more', '⋯', function () { moreMenu(more, c, null); });
      more.setAttribute('aria-label', 'More for this comment');
      acts.appendChild(more);
    }
    if (acts.children.length) d.appendChild(acts);
    if (replyFor === c.id && CM.canWrite()) {
      const box = el('div', 'cc-replybox');
      const ta = el('textarea', 'cc-input cc-replyinput');
      ta.rows = 1; ta.maxLength = MAX_TEXT; ta.placeholder = 'Reply…';
      ta.setAttribute('aria-label', 'Reply');
      ta.value = replyDraft;
      ta.addEventListener('input', function () { replyDraft = ta.value; });
      box.appendChild(ta);
      box.appendChild(btn('cc-post cc-replypost', 'Reply', function () {
        const v = ta.value;
        if (!v.trim()) { ta.focus(); return; }
        ta.blur();
        const cid = replyFor;
        replyFor = null; replyDraft = '';
        CM.reply(cid, v);
      }));
      d.appendChild(box);
    }
    return d;
  }
  function focusReply() { if (!card) return; const t = card.querySelector('.cc-replyinput'); if (t) try { t.focus(); } catch (e) {} }

  /* ═══ WHAT THE REST OF THE APP CALLS ══════════════════════════════════════════════════════════ */
  /* The document changed under us — a batch from somebody else, an undo. */
  CM.onChange = function () { CM.paintMarks(); render(); };
  /* The role changed: the composer and every button are re-decided. */
  CM.onRole = function () { if (card) { drawComposer(); render(); } };
  CM.install = function () {
    if (installed) return;
    installed = true;
    if (FM.timeline && FM.timeline.onRebuilt) unRebuilt = FM.timeline.onRebuilt(function () { CM.paintMarks(); });
    CM.paintMarks();
  };
  CM.uninstall = function () {
    installed = false;
    if (unRebuilt) { try { unRebuilt(); } catch (e) {} unRebuilt = null; }
    CM.close();
    document.querySelectorAll('.tl-cmark').forEach(function (n) { n.remove(); });
    CM.syncHead();
    showResolved = false;
  };
  CM.installed = function () { return installed; };

  C.comments = CM;

})(window.FM);
