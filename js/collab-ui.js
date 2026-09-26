/* FreeMotion — live collaboration (queue 921), STAGE S3: every surface a person can see or touch.
 * Spec §19 (surfaces), §18.1 (profile), §12.1/§12.2 (lifecycle), §14.5 (connection codes), §23 (solo).
 *
 * ⚠️ NOTHING IN THIS FILE RUNS UNTIL LABS IS ON. Not a listener, not a timer, not one element. Loading
 * it costs one parse and defines one object; `install()` is the only thing that builds DOM, and the only
 * caller is `syncLabs()`, which Settings calls when the switch moves and once at boot if it is already
 * on. §23's promise to a solo user is literal and the suite measures it: with Labs off there is no
 * `#btn-share`, no `#hm-join-btn`, no card, no scrim and no interval.
 *
 * 📐 DECIDED AGAINST §23's OWN WORDING, and §23 has been updated. It says "no collab DOM exists… and
 * `#btn-share` stays `.hidden`", which cannot both be true — a hidden button is DOM. §4.2 wanted the
 * button written into index.html's markup. Built here instead, on install, and removed on uninstall:
 *   · the stronger promise is the one a person could check, and "there is no share button in the page"
 *     is checkable in one line from the suite, where "there is one but it has a class on it" is one CSS
 *     regression away from being false;
 *   · the S2 inertness test asserts `!document.getElementById('btn-share')` and it stays true unchanged,
 *     which is worth more than saving eight lines of DOM building.
 *
 * ⚠️ …WITH ONE DRAWING THAT RUNS WITH LABS OFF (queue 945): the Friends block in Canvas settings on a phone is static
 * markup in index.html, and opening it with Labs off draws — into THAT block, with no collab id, no scrim, no listener and
 * no timer — one explanation and the one switch that turns live sharing on (U.renderFriends → drawLabsOff).
 *
 * ⚠️ EVERY PIECE OF TEXT THAT CAME FROM ANOTHER DEVICE GOES IN AS `textContent` (§14.9). Names and
 * colours are chosen on someone else's phone. There is no `innerHTML` in this file with peer data in
 * it — there is no `innerHTML` in this file at all — and the colour is matched against the palette
 * rather than trusted, so a hand-edited profile cannot put `url(javascript:…)` into a style attribute.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};
  const U = {};

  /* §18.1's palette. Fixed, and a colour that is not in it is not a colour: the guest's swatch is
     painted into a style attribute, so "any string he typed" would be an injection point, and a colour
     outside the set can also collide with the clip colours or vanish against the canvas. */
  const PALETTE = ['#ff6b6b', '#ff9f43', '#a3e635', '#a78bfa', '#f472b6', '#6366f1', '#d4a373', '#e879f9'];
  U.PALETTE = PALETTE;

  const ROLES = [['editor', 'Editor'], ['commenter', 'Commenter'], ['viewer', 'Viewer']];

  let installed = false;
  let shareBtn = null, joinBtn = null;
  let scrim = null, card = null;             // the one card on screen, whichever it is
  let bannerEl = null, bannerTimer = null;
  let knockQueue = [];                       // §19.3: requests queue one at a time
  let pendingKnock = null;
  let hostRoom = null;                       // { sid, sk, code, settings, members, blocked } for the project being shared
  let hostRoomPid = null;                    // …and WHICH project that is (see useRoom)
  /* ── S6 ── */
  let relay = null;                          // host: the rendezvous answering offers for hostRoom
  let recon = null;                          // guest: the §13.5 reconnect in progress
  let joinFlow = null;                       // guest: a link / room-code join in flight on the Join sheet
  let joinBusy = 0;                          // a join is building a session — resume must not start a second one
  let wakeLock = null;
  let ridMid = Object.create(null);          // host: member id (the token's) → the engine mid it has this session
  let hostOlder = null;                      // host: somebody newer knocked (§14.7) — { name }
  let versionNote = null;                    // guest: the owner refused a reconnect on version — { why }
  let resumeT = null;
  let otherTab = null;                       // S8 review: the linked copy another tab is already reconnecting
  let docWatch = false;                      // visibilitychange + online, only while a relay or a reconnect runs
  /* ── S7 ── */
  let ckptTimer = null;                      // host: §12.4's "every 10 min if changed", only while sharing
  let ckptSig = null, ckptWhen = 0, lastCkTs = 0;
  let ckptClock = null;                      // test seam: ten real minutes is not a thing a suite waits out

  /* ═══ SMALL DOM HELPERS ═══════════════════════════════════════════════════════════════════════ */

  function el(tag, cls, text) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }
  function btn(cls, text, fn) {
    const b = el('button', cls, text);
    b.type = 'button';
    if (fn) b.addEventListener('click', fn);
    return b;
  }

  /* ═══ PROFILE (§18.1) ═════════════════════════════════════════════════════════════════════════ */

  function cleanName(s) {
    /* §14.9: at most 32 characters, control characters stripped. Applied on the way IN as well as on
       the way out, so the stored profile is already safe and nothing downstream has to remember. */
    return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, (C.LIMITS && C.LIMITS.NAME) || 32);
  }
  function cleanColor(c) {
    const s = String(c == null ? '' : c).toLowerCase();
    return PALETTE.indexOf(s) >= 0 ? s : null;
  }
  U.cleanName = cleanName;
  U.cleanColor = cleanColor;

  U.getProfile = function () {
    let p = null;
    try { p = JSON.parse(localStorage.getItem('fm.profile') || 'null'); } catch (e) { p = null; }
    if (!p || typeof p !== 'object') return null;
    const name = cleanName(p.name), color = cleanColor(p.color);
    if (!name || !color) return null;
    return { mk: typeof p.mk === 'string' ? p.mk : null, name: name, color: color };
  };
  U.setProfile = function (name, color) {
    const n = cleanName(name), c = cleanColor(color);
    if (!n || !c) return null;
    const old = U.getProfile();
    const p = { mk: (old && old.mk) || C.signal.b64url(C.signal.randomBytes(16)), name: n, color: c };
    try { localStorage.setItem('fm.profile', JSON.stringify(p)); } catch (e) {}
    return p;
  };

  /* ═══ THE CARD SHELL ══════════════════════════════════════════════════════════════════════════
   * One scrim, one card, the `.fm-ask-card` family look (§19). The light/dark decision is made HERE at
   * open time and written as a class, for the reason ask.js spells out: `html[data-home="light"]` is on
   * the root and stays "light" inside the editor, which is dark whatever Home is set to — so the
   * question a body-level card has to ask is "is the light Home on screen right now". */
  function openCard(id, opts) {
    const o = opts || {};
    closeCard();
    scrim = el('div', 'collab-scrim');
    card = el('div', 'collab-card fm-ask-card');
    card.id = id;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', o.label || 'Live collaboration');
    const home = document.getElementById('home-screen');
    const onLightHome = !!home && !home.classList.contains('hidden')
      && document.documentElement.getAttribute('data-home') === 'light';
    scrim.classList.toggle('collab-light', onLightHome);
    if (o.sheet !== false) card.classList.add('collab-sheet');
    scrim.appendChild(card);
    document.body.appendChild(scrim);
    /* ⚠️ S8 review: EVERY TOAST FROM A CARD WAS PAINTED UNDER IT. #toast is z 60 (205 on Home) and this scrim is
       222 — so "Link copied", "Code copied", the copy-failure fallback, the phone host's "keep FreeMotion
       open", a refused Follow and the Join sheet's Paste failure were all behind the card that caused them,
       and a tap looked like it did nothing (the S7 review fixed one row of this, Restore, and no others).
       While a card is up the toast is lifted above its scrim (styles.css `body.collab-card-open #toast`). */
    document.body.classList.add('collab-card-open');
    /* A tap outside closes the card ON CLICK, and only when the press began on the backdrop (queue 944) — the rule js/ask.js,
       Notes and the ? sheet already follow. Closing on pointerdown handed the rest of the tap to whatever was underneath: a
       second click on the Share button shut the card on the way down and opened it again on the way up. His words: "when I
       click on it to open it and click on the same button again to close it, it doesn't close it, it just reopens it". */
    let downOnScrim = false;
    scrim.addEventListener('pointerdown', function (e) { downOnScrim = e.target === scrim; });
    scrim.addEventListener('click', function (e) { if (e.target === scrim && downOnScrim && o.dismissable !== false) closeCard(); downOnScrim = false; });
    /* A modal owns Escape. Capture, like ask.js, because the editor's bare-key shortcuts do not check
       what has focus and Backspace deletes the selected layer. */
    card._esc = function (e) { if (e.key === 'Escape' && o.dismissable !== false) { e.preventDefault(); e.stopPropagation(); closeCard(); } };
    window.addEventListener('keydown', card._esc, true);
    if (o.anchor && FM.popFrom) card._unpop = FM.popFrom(card, o.anchor, { flavour: 'collab' });
    return card;
  }
  function closeCard() {
    if (!card) return;
    if (card._esc) window.removeEventListener('keydown', card._esc, true);
    if (card._unpop) { try { card._unpop(); } catch (e) {} }
    if (card._onclose) { const f = card._onclose; card._onclose = null; try { f(); } catch (e) {} }
    if (scrim && scrim.parentNode) scrim.parentNode.removeChild(scrim);
    scrim = null; card = null;
    document.body.classList.remove('collab-card-open');
  }
  U.close = function () { closeAny(); };   // queue 945: closes the Friends block too (defined below)
  U.openCard = function (id) { return document.getElementById(id); };
  /* ⚠️ S8 review: A CARD'S MIDDLE SCROLLS; ITS BUTTONS DO NOT. The card is capped at 82svh and had no scroller of
     its own (only the Share panel built one), so on a 667 px phone — or in iPhone Safari, where 82svh is about
     545 px — the Join sheet's code step pushed Cancel and Join below the screen, and the scanner, the one child
     that could shrink, cut off its own instructions. Everything between the title and the actions goes in
     here; the actions stay on the card, always on screen. */
  function bodyOf(c) {
    const b = el('div', 'cs-body cj-body');
    c.appendChild(b);
    return b;
  }

  /* ═══ 1. THE PROFILE PROMPT (§18.1) ═══════════════════════════════════════════════════════════
   * Asked at the first Share or Join and never again. Resolves the profile, or null if he backed out. */
  U.profile = function (opts) {
    const o = opts || {};
    const have = U.getProfile();
    if (have && !o.force) return Promise.resolve(have);
    return new Promise(function (resolve) {
      const c = openCard('collab-profile', { label: 'What should others see?' });
      let done = false;
      c._onclose = function () { if (!done) resolve(null); };
      c.appendChild(el('div', 'fm-ask-title', 'What should others see?'));
      const pb = bodyOf(c);
      pb.appendChild(el('div', 'collab-sub', 'Your name and colour show up beside your cursor on the other person’s screen.'));
      const input = el('input', 'fm-ask-input collab-name');
      input.type = 'text';
      input.maxLength = (C.LIMITS && C.LIMITS.NAME) || 32;
      input.placeholder = 'Your name';
      input.setAttribute('aria-label', 'Your name');
      input.value = (have && have.name) || '';
      pb.appendChild(input);
      const row = el('div', 'collab-swatches');
      let picked = (have && have.color) || PALETTE[Math.floor(Math.random() * PALETTE.length)];
      PALETTE.forEach(function (hex) {
        const s = btn('collab-swatch', '', function () {
          picked = hex;
          row.querySelectorAll('.collab-swatch').forEach(function (x) {
            const on = x === s;
            x.classList.toggle('on', on);
            x.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
        });
        s.style.background = hex;
        s.setAttribute('aria-label', 'Colour ' + hex);
        s.setAttribute('aria-pressed', hex === picked ? 'true' : 'false');
        if (hex === picked) s.classList.add('on');
        row.appendChild(s);
      });
      pb.appendChild(row);
      const err = el('div', 'collab-err hidden');
      pb.appendChild(err);
      const acts = el('div', 'fm-ask-actions');
      acts.appendChild(btn('fm-ask-cancel', 'Cancel', function () { closeCard(); }));
      acts.appendChild(btn('fm-ask-ok accent collab-continue', 'Continue', function () {
        const p = U.setProfile(input.value, picked);
        if (!p) {
          err.textContent = cleanName(input.value) ? 'Pick one of the colours.' : 'Type a name so people know who you are.';
          err.classList.remove('hidden');
          input.focus();
          return;
        }
        done = true;
        closeCard();
        resolve(p);
      }));
      c.appendChild(acts);
      input.focus();
      try { input.select(); } catch (e) {}
    });
  };

  /* ═══ THE HOST RECORD (§12.1, §12.4) ══════════════════════════════════════════════════════════ */

  function hostKey(pid) { return 'fm.collab.host.' + pid; }
  function loadRoom(pid) {
    let r = null;
    try { r = JSON.parse(localStorage.getItem(hostKey(pid)) || 'null'); } catch (e) { r = null; }
    if (!r || r.v !== 1 || !r.sid) return null;
    r.settings = r.settings || {};
    /* Members are keyed by the id their token is filed under (`r` + 16 hex). A hand-edited record is
       read through an own-property check everywhere, never `members[x]` on a string from a peer. */
    r.members = (r.members && typeof r.members === 'object') ? r.members : {};
    r.blocked = Array.isArray(r.blocked) ? r.blocked : [];
    /* S6 review: the tokens of members he removed, kept ONLY so the refusal their device gets can be signed
       (collab-signal.js `failSigned`) — a removed phone is then told so, and nobody else can say it. */
    r.revoked = (r.revoked && typeof r.revoked === 'object' && !Array.isArray(r.revoked)) ? r.revoked : {};
    r.told = (r.told && typeof r.told === 'object' && !Array.isArray(r.told)) ? r.told : {};
    if (typeof r.codeAt !== 'number') r.codeAt = 0;
    if (typeof r.hub !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(r.hub)) {
      r.hub = C.signal.b64url(C.signal.randomBytes(16));
      saveRoom(pid, r);
    }
    /* 📐 A ROOM FROM BEFORE S6 GETS ITS CODE — AND "ASK ME FIRST" — THE FIRST TIME IT IS READ. S3 saved
       `ask:false` into every room because the only way in was a code the owner read out himself (see
       newRoom). S6 adds the invite link, which can be forwarded, and D5 says the owner is asked before an
       unknown person gets in. A stored `false` from S3 is S3's default, not a choice he made about links,
       and there is no way to tell the two apart — so the safer answer wins, once, and the switch is right
       there in the panel. */
    if (!C.signal.normRoomCode(r.code)) {
      r.code = C.signal.newRoomCode();
      r.settings.ask = true;
      saveRoom(pid, r);
    }
    return r;
  }
  /* The highest mid this room has handed out, kept on the record so the next session mints past it (S7 review). */
  function noteMidTop(s) {
    if (!hostRoom || !s || !s.midTop) return;
    const top = s.midTop();
    if (!(top <= (hostRoom.midTop || 0))) hostRoom.midTop = top;
    saveRoom(hostRoomPid || currentPid(), hostRoom);
  }
  function saveRoom(pid, r) {
    try { localStorage.setItem(hostKey(pid), JSON.stringify(r)); } catch (e) {}
  }
  function dropRoom(pid) { try { localStorage.removeItem(hostKey(pid)); } catch (e) {} }
  /* ⚠️ THE ROOM BELONGS TO A PROJECT, AND THE MODULE REMEMBERED IT WITHOUT SAYING WHICH (S6). `hostRoom`
     outlived the session it was loaded for: share project A, switch to B, share B with a session that
     already existed, and the panel, the relay and every admission ran on A's room — A's link and code
     shown for B, and B's joiners let into a room whose record was filed under A. Found by the S6 suite in
     order (it passed test by test). Every reader now asks for the room OF A PROJECT. */
  function useRoom(pid, create) {
    if (hostRoom && hostRoomPid === pid) return hostRoom;
    hostRoom = loadRoom(pid);
    if (!hostRoom && create) { hostRoom = newRoom(); saveRoom(pid, hostRoom); }
    hostRoomPid = hostRoom ? pid : null;
    return hostRoom;
  }

  /* 📐 `ask` DEFAULTS TO FALSE IN S3, AND §12.1's table now says why. It lists `ask:true`, which is the
     right default for the INVITE LINK — a link can be forwarded, so an unknown person can arrive and the
     owner must get a say. S3 has no link: the only way in is a connection code the owner read out and
     whose answer he pasted back himself, and §14.5 says in as many words that pasting the answer "counts
     as admitting the guest: no knock". Defaulting to true here would make the app ask him to approve the
     thing he just did, every time. The switch is live in the Share panel, so the knock card is reachable
     the moment he wants it; S6 ships the link and with it the `true` default for that half. */
  /* S6: `ask` is TRUE now (§12.1's own table, and D5): the link can be forwarded, so an unknown person
     can arrive with it and the owner gets a say. A connection code (S3) still admits without a knock —
     the owner pasting the answer and confirming the five letters IS the admission (§14.5) — and a room
     code always knocks (§14.1), whatever this says. */
  function newRoom() {
    const r = C.signal.newRoom();
    return {
      v: 1, sid: r.sid, sk: r.sk, code: C.signal.newRoomCode(), codeAt: 0, created: r.created,
      /* S6 review: the members' own way back in (collab-signal.js "the members' room"). Never rotated:
         Reset and Remove change the link and the code, and members keep coming back through this. */
      hub: C.signal.b64url(C.signal.randomBytes(16)),
      settings: { ask: true, linkRole: 'editor', editorsInvite: false, roExport: true, max: (C.LIMITS && C.LIMITS.PEOPLE_DEFAULT) || 8 },
      members: {}, blocked: [], revoked: {}
    };
  }

  /* ═══ S6 review · THE SHORT CODE LIVES HALF AN HOUR ═══════════════════════════════════════════════
   * ⚠️ ITS TOPIC IS A FIXED FUNCTION OF 45 BITS, THE SAME ON EVERY DEVICE. The salt has to be a constant
   * (a joiner who has only nine characters can know nothing else), so one offline sweep of every code
   * matches every code topic anybody ever saw on a public broker — and the code never changed, and the
   * owner announced it on every foreground whether or not he had ever handed it out. So: the code is
   * listened on only while it is FRESH — shown on his screen within CODE_TTL — and a code that has lapsed
   * is replaced by a new one the next time he opens the panel. Members never need it (they come back
   * through the hub), so letting it lapse costs nobody who is already in. */
  let codeTtl = null;                        // test seam, like `_knockWait`: half an hour is not a thing a suite waits out
  U._codeTtl = function (ms) { codeTtl = (ms == null ? null : ms); return codeTtl; };
  function codeTtlMs() { return codeTtl != null ? codeTtl : ((C.LIMITS && C.LIMITS.CODE_TTL) || 1800000); }
  function codeFresh(r) {
    const room = r || hostRoom;
    return !!room && typeof room.codeAt === 'number' && room.codeAt > 0 && Date.now() - room.codeAt < codeTtlMs();
  }
  /* S8 review: the code is STILL on his screen (or has only just left it): keep it alive, never replace it — the
     people in front of him are reading this one. */
  function touchCode() {
    if (!hostRoom || C.signal.codesOnly() || !hostRoom.codeAt) return;
    hostRoom.codeAt = Date.now();
    saveRoom(hostRoomPid || currentPid(), hostRoom);
  }
  /* The code is on his screen: it stays live for another CODE_TTL — or, if the one he last saw has
     lapsed, it is replaced first, so a code he reads out is never one an old sweep already knows. */
  function showCode() {
    if (!hostRoom || C.signal.codesOnly()) return;
    if (hostRoom.codeAt && !codeFresh()) hostRoom.code = C.signal.newRoomCode();
    hostRoom.codeAt = Date.now();
    saveRoom(hostRoomPid || currentPid(), hostRoom);
  }

  /* ═══ S8 review · ONE TAB PER ROOM (§12.1 step 6, §12.2 step 5, §22 "Second tab") ═══════════════════════════
   * The spec's Web Lock was never built, and a second tab ARMED A SECOND HOST: the installed app and a browser
   * tab (or two windows) both booted into the shared project, both resumed sharing on the same sid, hub and code,
   * and answered the same relay topics with different epochs and different documents — a guest reconnecting
   * after a lock was taken by whichever answered first, and the two tabs saved over each other. Two tabs of one
   * linked copy did the same from the other side, each reconnect displacing the other ("Sam is back" every few
   * seconds). A lock per room, held for as long as this tab hosts it (or holds that copy's reconnect or
   * session); the tab that cannot get it does not arm, and says why. A browser with no Web Locks keeps the old
   * behaviour rather than refusing to share at all. */
  const locks = Object.create(null);         // lock name -> { release, done }
  const releasing = Object.create(null);     // lock name -> settles once THIS tab's release has gone through
  function hostLock(pid) { return 'fm-collab-host-' + pid; }
  function guestLock(gpid) { return 'fm-collab-guest-' + gpid; }
  function takeLock(name) {
    if (locks[name]) return Promise.resolve(true);
    const L = navigator.locks;
    if (!L || typeof L.request !== 'function') return Promise.resolve(true);
    /* A lock this tab has just let go of (a project switch and straight back, which is how a resume happens) is
       released asynchronously — asking again before that has gone through would find it "held by another tab",
       and that other tab is this one. */
    return (releasing[name] || Promise.resolve()).then(function () {
      return new Promise(function (resolve) {
        let answered = false;
        const req = L.request(name, { ifAvailable: true }, function (lock) {
          answered = true;
          if (!lock) { resolve(false); return null; }
          return new Promise(function (release) { locks[name] = { release: release, done: req }; resolve(true); });
        });
        req.catch(function () { if (!answered) resolve(true); });
      });
    });
  }
  function dropLock(name) {
    const l = locks[name];
    if (!l) return;
    delete locks[name];
    const r = releasing[name] = Promise.resolve(l.done).then(function () {}, function () {}).then(function () { if (releasing[name] === r) delete releasing[name]; });
    try { l.release(); } catch (e) {}
  }
  U._locks = function () { return Object.keys(locks); };
  const OTHER_TAB = 'Sharing is already running in another FreeMotion tab';

  /* ═══ 2. THE SHARE PANEL (§19.1) ══════════════════════════════════════════════════════════════ */

  function currentPid() { return (FM.projects && FM.projects.currentId) ? FM.projects.currentId() : null; }
  function projectName() {
    const pid = currentPid();
    const list = (FM.projects && FM.projects.list && FM.projects.list()) || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === pid) return list[i].name || 'this project';
    return (FM.scene && FM.scene.project && FM.scene.project.name) || 'this project';
  }

  function stateLine(s) {
    if (!s) return 'Not shared yet';
    const n = s.peerIds ? s.peerIds().length : 0;
    if (!n) return 'Live · waiting for someone';
    return 'Live · ' + n + (n === 1 ? ' person here' : ' people here');
  }

  function memberRows(s) {
    const list = el('ul', 'cs-people');
    const me = U.getProfile() || { name: 'You', color: PALETTE[0] };
    list.appendChild(personRow(me.name, me.color, 'you', null, null));
    if (!s || !s.host) return list;
    const members = s.host.members || {};
    Object.keys(members).forEach(function (mid) {
      if (mid === s.host.ownerMid) return;
      const m = members[mid];
      list.appendChild(personRow(m.name || 'Someone', m.color || '#888888', m.role, mid, s));
    });
    /* ⚠️ AND THE MEMBERS WHO ARE NOT HERE RIGHT NOW (S6 review). The list was the engine's roster, which
       drops a member the moment its link closes — so a member whose phone was lost or stolen, or who left
       on bad terms, had no row and so no Remove, while its token would still let that phone straight back
       in with no knock. Every member this room has let in is listed; the ones not connected say so. */
    if (hostRoom && hostRoomPid === ((s && s.pid) || currentPid())) {
      Object.keys(hostRoom.members).forEach(function (rid) {
        const m = memberByRid(rid);
        if (!m) return;
        const mid = ridMid[rid];
        if (mid && members[mid]) return;             // connected: already listed above
        list.appendChild(offlineRow(rid, m));
      });
    }
    return list;
  }
  function offlineRow(rid, m) {
    const li = personRow(m.name || 'Someone', m.color || '#888888', m.role, null, null, { st: 'off' });
    li.setAttribute('data-rid', rid);
    const b = btn('cs-role', labelFor(m.role) + ' ▾', function (e) {
      const r = b.getBoundingClientRect();
      const items = ROLES.map(function (p) {
        /* Not connected, so there is nobody to tell now: the room remembers it, and the welcome that lets
           them back in carries it. */
        return { label: p[1], action: function () { const x = memberByRid(rid); if (x) { x.role = p[0]; saveRoom(hostRoomPid || currentPid(), hostRoom); } redrawShare(); } };
      });
      items.push({ sep: true });
      /* S8 review: clearing a row is not a ban. Remove blocks that device's profile key and changes the link and
         the code for everyone — the only control an offline row had, so tidying the list of somebody who had
         simply left banned their phone. Forget drops the row and its token and nothing else: they can come
         back with the link like anybody. */
      items.push({ label: 'Forget', action: function () { forgetRid(rid); redrawShare(); } });
      items.push({ label: 'Remove…', danger: true, action: function () { removePerson(null, null, m.name, rid); } });
      FM.contextMenu.show(r.left, r.bottom + 4, items);
      e.stopPropagation();
    });
    b.setAttribute('aria-label', 'Change what ' + (cleanName(m.name) || 'they') + ' can do');
    li.appendChild(b);
    return li;
  }

  /* S5: what presence knows about one person — here/away, which layer, what they have open — as one
     line under their name. Also how the phone's one-row solo view names what somebody else is on (§18.4). */
  function presenceOf(mid) {
    if (!mid || !C.presence || !C.presence.people) return null;
    const list = C.presence.people();
    for (let i = 0; i < list.length; i++) if (list[i].mid === mid) return list[i];
    return null;
  }
  function statusLine(role, pz) {
    const bits = [role === 'you' ? 'You · Owner' : labelFor(role)];
    if (pz) {
      if (pz.st === 'away') bits.push('away');
      else if (pz.st === 'off') bits.push('offline');
      if (pz.st !== 'off' && pz.where) bits.push(pz.where);
      if (pz.following) bits.push('you are following');
    }
    return bits.join(' · ');
  }
  /* Follow, from either panel. ⚠️ A REFUSED FOLLOW IS SAID, AND THE PANEL STAYS (S5 review): the panel
     closed whatever `follow()` answered, so tapping Follow on somebody who had just left shut the panel
     and did nothing at all — no banner, no word. Returns whether it is now following. */
  function startFollow(mid, name) {
    if (!C.presence) return false;
    if (C.presence.follow(mid)) { closeAny(); return true; }
    const why = C.presence.canFollow ? C.presence.canFollow(mid) : 'left';
    const who = cleanName(name) || 'They';
    if (FM.toast) FM.toast(why === 'away' ? who + ' is away right now' : why === 'off' ? who + ' is offline right now'
      : why === 'gone' ? 'The live link is down — nobody to follow' : who + ' has left', 2600);
    U.onPeople();
    return false;
  }
  function followItem(mid, name) {
    const pz = presenceOf(mid);
    if (!pz || !C.presence) return null;
    return pz.following
      ? { label: 'Stop following', action: function () { C.presence.unfollow(); redrawShare(); } }
      : { label: 'Follow', action: function () { startFollow(mid, name); } };
  }
  /* The dot is the legend for everything drawn in that person's colour, so it wears the colour presence
     DRAWS them in (S5 review): the host re-colours a guest whose colour clashes with somebody already in
     (paletteFor), and the Share panel went on painting the colour they picked — the same red as his own
     "You" row, while their outlines on the canvas were orange. */
  function dotColor(pz, color) { return cleanColor(pz && pz.color) || cleanColor(color) || '#888888'; }

  function personRow(name, color, role, mid, s, pzIn) {
    const li = el('li', 'cs-person');
    if (mid) li.setAttribute('data-mid', mid);
    li.setAttribute('data-role', role || '');
    const pz = pzIn || presenceOf(mid);
    const dot = el('span', 'cs-dot');
    dot.style.background = dotColor(pz, color);
    li.appendChild(dot);
    const txt = el('div', 'cs-ptext');
    /* textContent — this is the other person's name, typed on their device (§14.9). */
    txt.appendChild(el('div', 'cs-pname', cleanName(name) || 'Someone'));
    txt.appendChild(el('div', 'cs-prole', statusLine(role, pz)));
    if (pz && pz.st !== 'here') li.classList.add('cs-away');
    li.appendChild(txt);
    if (mid && s) {
      const b = btn('cs-role', labelFor(role) + ' ▾', function (e) {
        const r = b.getBoundingClientRect();
        const items = ROLES.map(function (p) {
          /* THROUGH THE SESSION, not straight into the host's table (queue 921 S3 review): `H.setRole`
             moves a number here and tells nobody, so a demoted guest kept the full editing UI and found
             out one refused edit at a time. `setPeerRole` does both halves or neither. */
          return { label: p[1], action: function () { s.setPeerRole(mid, p[0]); noteRole(mid, p[0]); redrawShare(); } };
        });
        items.push({ sep: true });
        /* §19.1: Follow sits in the same menu, between the roles and Remove. */
        const f = followItem(mid, name);
        if (f) items.push(f);
        items.push({ label: 'Remove…', danger: true, action: function () { removePerson(s, mid, name); } });
        FM.contextMenu.show(r.left, r.bottom + 4, items);
        e.stopPropagation();
      });
      b.setAttribute('aria-label', 'Change what ' + (cleanName(name) || 'they') + ' can do');
      li.appendChild(b);
    }
    return li;
  }
  function labelFor(role) {
    if (role === 'owner') return 'Owner';
    for (let i = 0; i < ROLES.length; i++) if (ROLES[i][0] === role) return ROLES[i][1];
    return 'Editor';
  }

  /* `mid` for somebody connected now, `rid` for a member who is not (S6 review: offline members can be
     removed too). */
  function removePerson(s, mid, name, ridIn) {
    FM.ask({
      title: 'Remove ' + (cleanName(name) || 'them') + '?',
      /* ⚠️ SAYS WHAT IT DOES, ALL OF IT (S6 review): it is permanent for that device, and it changes the
         link and the code — the dialog used to mention neither. */
      message: 'They lose the live copy straight away and can’t rejoin from that device, even with a new link. The link and the short code change too, so send the new link to anyone still to join. Their own copy of the project stays on their device.',
      ok: 'Remove', danger: true
    }).then(function (yes) {
      if (!yes) return;
      /* S6: removed means REMOVED — the member's token is struck, and its id and the profile key it said
         hello with go on the room's refused list, so its automatic reconnect is turned away by name.
         📐 THE PROFILE KEY IS A HINT, NOT AN IDENTITY (S6 review): it is random per browser storage and
         the peer reports it itself, so the same person in another browser, a private window or Safari
         beside the installed app has a new one. What actually keeps them out is below — the link and the
         code they hold stop working. Members are not affected: they come back through the hub. */
      const rid = ridIn || ridOfMid(mid);
      if (rid) revokeRid(rid);
      if (s && mid) {
        const ep = s._eps && s._eps[mid];
        if (ep) { try { ep.send('ctl', { t: 'bye', why: 'removed' }); } catch (e) {} try { ep.close(); } catch (e) {} }
        s.dropPeer(mid);
      }
      rotateRoom();
      redrawShare();
      if (FM.toast) FM.toast((cleanName(name) || 'They') + ' removed — the link and code have changed, so the old ones no longer work', 3200);
    });
  }
  /* A new sid, key and code: every copy of the old link and every note of the old code stops working. The
     hub is NOT changed, so every member who is still in keeps coming back by itself. */
  function rotateRoom() {
    if (!hostRoom) return;
    const r = C.signal.newRoom();
    hostRoom.sid = r.sid; hostRoom.sk = r.sk; hostRoom.code = C.signal.newRoomCode();
    /* The panel he removed them from is on screen, so the new code is being shown now. */
    hostRoom.codeAt = panelRoot() ? Date.now() : 0;   // queue 945: or the Friends block
    saveRoom(hostRoomPid || currentPid(), hostRoom);
    stopHostRelay();
    startHostRelay();
    /* S7: an Editor allowed to invite was holding the OLD link — the one that now reaches nobody. They get
       the new one at once; the removed person, who is no longer a member, gets nothing. */
    pushSettings();
  }
  /* S6: the room's member table remembers the role he chose, so a member who drops out and comes back
     with its token comes back as what he made it — not as the link's default. */
  function noteRole(mid, role) {
    if (!hostRoom) return;
    Object.keys(ridMid).forEach(function (rid) {
      const m = ridMid[rid] === mid ? memberByRid(rid) : null;
      if (m) { m.role = role; saveRoom(currentPid(), hostRoom); }
    });
  }
  function ridOfMid(mid) {
    let rid = null;
    Object.keys(ridMid).forEach(function (k) { if (ridMid[k] === mid) rid = k; });
    return rid;
  }
  /* S8 review: a member who is no longer a member, WITHOUT a refusal: their token stops opening the hub (so a
     device that left can never come back on it), and nothing is blocked or rotated. */
  function forgetRid(rid) {
    if (!hostRoom || !memberByRid(rid)) return false;
    delete hostRoom.members[rid];
    delete ridMid[rid];
    saveRoom(hostRoomPid || currentPid(), hostRoom);
    if (relay) syncMemberRooms(relay);
    return true;
  }
  U._forgetRid = forgetRid;
  /* A guest's `bye` (collab-session.js, through the bridge). ⚠️ ONLY `left`: a guest on `paused` switched to
     another project and is still a member. Leave throws the device's token away (the copy becomes its own, or
     is deleted), so its row could only ever read "offline", and a rejoin by link added a second one beside it. */
  U.onPeerLeft = function (mid, why) {
    if (why !== 'left' || !hostRoom) return false;
    const rid = ridOfMid(mid);
    if (!rid || !forgetRid(rid)) return false;
    redrawShare();
    paintRelayLine();
    return true;
  };
  function revokeRid(rid) {
    if (!hostRoom) return false;
    const m = memberByRid(rid);
    if (!m) return false;
    hostRoom.blocked = Array.isArray(hostRoom.blocked) ? hostRoom.blocked : [];
    if (hostRoom.blocked.indexOf(rid) < 0) hostRoom.blocked.push(rid);
    if (m.pmk && hostRoom.blocked.indexOf('p:' + m.pmk) < 0) hostRoom.blocked.push('p:' + m.pmk);
    if (hostRoom.blocked.length > 200) hostRoom.blocked.splice(0, hostRoom.blocked.length - 200);
    /* Its token is kept aside, and only to sign "removed" to its device (keyFor below). Twenty at most. */
    hostRoom.revoked = hostRoom.revoked || {};
    if (typeof m.tok === 'string') hostRoom.revoked[rid] = m.tok;
    const ks = Object.keys(hostRoom.revoked);
    if (ks.length > 20) ks.slice(0, ks.length - 20).forEach(function (k) { delete hostRoom.revoked[k]; if (hostRoom.told) delete hostRoom.told[k]; });
    delete hostRoom.members[rid];
    delete ridMid[rid];
    saveRoom(hostRoomPid || currentPid(), hostRoom);
    if (relay) syncMemberRooms(relay);
    return true;
  }


  let shareStep = 'main';          // 'main' | 'code'
  let offerLink = null;            // the RtcLink waiting for an answer code
  let connecting = false;          // a code exchange is in flight on this card
  /* One sentence, rendered ONCE by the next draw of the panel. A message that has to survive the redraw
     that mints a fresh code cannot live in the code step's own status node — that node is thrown away
     by the redraw, which is exactly what made "Not let in." look like nothing happened. */
  let shareNote = null;
  /* Test seam, the same one `U._offer` is: the ICE_CONNECT race below is twenty real seconds, and a
     suite that had to wait them out would be a suite nobody runs. */
  let connectWait = null;
  U._connectWait = function (ms) { connectWait = (ms == null ? null : ms); return connectWait; };

  /* ⚠️ `link.opened` NEVER SETTLES ON ITS OWN WHEN THERE IS NO PATH (queue 921 S3 review). The only
     thing that rejects it is `pc.iceConnectionState === 'failed'`, and ICE does not reach 'failed' when
     it has nothing to check — no candidates in the code, no reachable path, no STUN server configured.
     Both sides then sit on "Connecting…" for ever, with no message and, on the Share card, no cancel.
     So the wait is RACED against §21's own ICE_CONNECT, and both ends already own a 'timeout' sentence. */
  function openedWithin(link) {
    const ms = connectWait != null ? connectWait : ((C.LIMITS && C.LIMITS.ICE_CONNECT) || 20000);
    return new Promise(function (res, rej) {
      let done = false;
      const t = setTimeout(function () { if (done) return; done = true; rej({ why: 'timeout' }); }, ms);
      link.opened.then(
        function (v) { if (done) return; done = true; clearTimeout(t); res(v); },
        function (e) { if (done) return; done = true; clearTimeout(t); rej(e); }
      );
    });
  }

  /* ⚠️ "THE CODES YOU HAVE HANDED OUT STOP WORKING" IS A PROMISE THE CARD MAKES OUT LOUD, so stopping
     has to CLOSE the outstanding offer rather than merely forget about it. It did neither, and both
     halves of that were real. The RTCPeerConnection stayed open and gathering after the session ended
     — and because `drawCodeStep` REUSES a live `offerLink` by design (see its own note: one link per
     step, not one per draw), the next Share → Add someone with a code showed the SAME code, minted
     against the room he had just thrown away. So a code he had been told was dead still had a live
     peer connection behind it, and pasting its answer would have run `s.addPeer` on the new session:
     "stop sharing" that does not revoke is the one failure in this card that is not cosmetic.
     It is the same retryable-versus-spent split `hostConnect` already reasons about, which is why both
     ends go through one helper rather than two copies of the same three lines. (queue 921 S3) */
  function dropOffer(delayMs) {
    if (offerLink) {
      const l = offerLink;
      offerLink = null;
      /* A refusal has to reach the far end before the channel goes, so the close can be held for a
         beat — but the REFERENCE is dropped now, or the next draw would hand out the dead code again. */
      if (delayMs) setTimeout(function () { try { l.close(); } catch (e) {} }, delayMs);
      else { try { l.close(); } catch (e) {} }
    }
    connecting = false;
    shareStep = 'main';
  }

  /* ═══ queue 945 · THE FRIENDS BLOCK (Canvas settings on a phone) ════════════════════════════════════════════
     The same content as the Share card, drawn into a HOST — #cv-fr-body, inside #canvas-dialog — instead of into the one
     scrim card. It has its own variable, never `card`: openCard() closes whatever card is up first, so the profile prompt
     that Start sharing or Change… raises would otherwise tear the block out from under itself.
     ⚠️ OPENING IT NEVER ARMS. The Share button's U.share() arms a room the moment it is pressed (relays, a wake lock,
     a checkpoint); the block draws what is TRUE — not shared yet, live, a guest, a shared copy — and only its Start
     sharing button runs the arm. */
  let fhost = null;              // #cv-fr-body while Friends is mounted in it
  let fhostShowedCode = false;   // the room code was drawn there: taking it down starts the code's half hour, as closing the card does
  let fhostObs = null;           // the backstop: anything that hides the dialog with a bare class unmounts the block
  let arming = null;             // the one arm in flight — a double tap on Start sharing cannot arm twice
  let pendingLinkRole = null;    // "New people join as", chosen before there is a room; applied when Start sharing arms
  function friendsDlg() { return document.getElementById('canvas-dialog'); }
  /* Visible means VISIBLE: the classes say the block is big, and it has a box — above 700px it is display:none whatever
     the classes say (critic's finding: a redraw into an unseen block spends the one-shot notes). */
  function friendsVisible() {
    const d = friendsDlg();
    if (!d || d.classList.contains('hidden') || !d.classList.contains('cv-fr-big')) return false;
    const f = document.getElementById('cv-friends');
    return !!(f && f.getClientRects().length);
  }
  function fhostLive() { return !!fhost && fhost.isConnected && friendsVisible(); }
  /* Whichever panel is on screen now — the Share card, or the Friends block — for the redraws that update in place. */
  function panelRoot() { return (card && card.id === 'collab-share') ? card : (fhostLive() ? fhost : null); }
  function mountHost(host) {
    if (fhostShowedCode) { fhostShowedCode = false; touchCode(); }   // the host-mode twin of closeCard running _onclose on a redraw
    host.textContent = '';
    return host;
  }
  function watchFriendsHost() {
    if (fhostObs || typeof MutationObserver === 'undefined') return;
    const d = friendsDlg();
    if (!d) return;
    /* THE LIVE STATE, NOT THE RECORD (critic's finding): a bare hide followed by a reopen in the same task queues a record
       that says "hidden" after the dialog is open again — acting on it emptied a block that was on screen. */
    fhostObs = new MutationObserver(function () { const dd = friendsDlg(); if (!dd || dd.classList.contains('hidden')) U.friendsClosed(); });
    fhostObs.observe(d, { attributes: true, attributeFilter: ['class'] });
  }
  /* Done / Leave / Follow / Comments from either surface: the card closes, and so does the dialog holding the block. */
  function closeAny() {
    closeCard();
    if (fhost) { if (FM.closeCanvasDialog) FM.closeCanvasDialog(); else U.friendsClosed(); }
  }

  function redrawShare() {
    if (card && card.id === 'collab-share') { U.share({ keepStep: true }); return; }
    /* queue 945: a redraw into the block goes through renderFriends, never U.share — which ARMS when there is no session,
       so a late link close after Stop sharing would have started sharing again by itself. */
    if (fhostLive()) U.renderFriends(fhost, { keepStep: true });
    else U.friendsBar();
  }

  /* §12.1 step 2 and §24: A CHECKPOINT BEFORE ANYTHING IS TOUCHED. Arming runs a pre-sanitise tidy-up
     over his document and commits it as an owner step (`C.share`), and from that moment other people can
     change it. The snapshot taken here is the last picture of the project as it was before he shared it,
     and §24 lists it as one of the four promises made about HIS data. `C.share()` (S2) does not write it
     because S2 had no arming UI; this is the arming UI.
     ⚠️ IT TRIMS ITSELF TO TEN rather than waiting for a collector. §12.4 puts `ckpt` in `FM.collab.gc()`'s
     hands, and §23's bargain with a solo user is that nothing runs at load — a boot-time IndexedDB sweep
     is the one thing in that table that would break it. A writer that keeps its own last ten needs no
     sweep at all, and `pruneOrphans` already skips everything under `collab:` (S0). */
  function ckNow() { return ckptClock ? ckptClock() : Date.now(); }
  /* `kind`: 'arm' (Share), 'resume' (a reopen re-arming), 'tick' (ten minutes, changed) or 'stop'.
     ⚠️ THE ARM'S SAVE POINT IS PINNED (S7 review). It is "before anybody touched it" — the one he comes back
     for when a guest has wrecked the edit — and the trim deleted the OLDEST key, which is exactly that one:
     90 minutes of editing, or ten reopens of the project on a phone, and it was gone. Its key ends `-arm`, and
     the trim keeps the newest arm key whatever its age, the other nine by age.
     ⚠️ AND A REOPEN OR A STOP WITH NOTHING NEW WRITES NOTHING. A resume wrote a save point every time the
     project was reopened, changed or not, and each one pushed a real one off the end. */
  function checkpoint(pid, kind) {
    if (!pid || !FM.storage || !FM.storage.collabPut) return Promise.resolve(false);
    const D = { project: C._viewOfProject(FM.scene.project), layers: FM.scene.layers };
    let body;
    try { body = JSON.stringify(D, FM.jsonReplacer); } catch (e) { return Promise.resolve(false); }
    const prefix = 'collab:ckpt:' + pid + ':';
    /* S7: the key's time is the one "Earlier versions…" prints, so two save points written in the same
       millisecond (arm, then Stop sharing on a fast machine) must not share a key and overwrite each other. */
    const ts = Math.max(Math.round(ckNow()), lastCkTs + 1);
    lastCkTs = ts;
    const s = C.session;
    if (s && s.isOwner && s.host) { ckptSig = s.host.epoch + ':' + s.host.seq; ckptWhen = ckNow(); }
    const same = (kind === 'resume' || kind === 'stop') && FM.storage.collabKeys
      ? FM.storage.collabKeys(prefix).then(function (keys) {
        return keys.length ? FM.storage.collabGet(keys[keys.length - 1]).then(function (v) { return v === body; }) : false;
      }).catch(function () { return false; })
      : Promise.resolve(false);
    return same.then(function (dup) {
      if (dup) return true;
      return FM.storage.collabPut(prefix + ts + (kind === 'arm' ? '-arm' : ''), body).then(function () {
        if (!FM.storage.collabKeys) return true;
        return FM.storage.collabKeys(prefix).then(function (keys) {
          const keep = (C.LIMITS && C.LIMITS.CKPT_KEEP) || 10;
          const arms = keys.filter(isArmKey);
          const pinned = arms.length ? arms[arms.length - 1] : null;
          const rest = keys.filter(function (k) { return k !== pinned; });
          const old = rest.slice(0, Math.max(0, rest.length - (pinned ? keep - 1 : keep)));
          return Promise.all(old.map(function (k) { return FM.storage.collabDel(k); })).then(function () { return true; });
        });
      });
    }).catch(function () { return false; });
  }
  function isArmKey(k) { return /-arm$/.test(k); }
  U._checkpoint = checkpoint;

  /* ═══ S7 · §12.4 "EVERY 10 MIN IF CHANGED" ═══════════════════════════════════════════════════════
   * While he shares, a save point every ten minutes — but only if the room has sequenced anything since
   * the last one, so a project left open overnight does not fill the ten slots with ten copies of the
   * same picture and push the arm's "before anybody touched it" save point off the end. "Changed" is the
   * host's own counter (epoch + seq): every change anybody makes, his included, is a sequenced batch,
   * and comparing two numbers costs nothing where hashing the document every tick would not. */
  U._ckptClock = function (fn) { ckptClock = typeof fn === 'function' ? fn : null; return !!ckptClock; };
  function ckptTick() {
    const s = C.session;
    if (!s || !s.isOwner || !s.host) return Promise.resolve(false);
    const every = (C.LIMITS && C.LIMITS.CKPT_EVERY) || 600000;
    if (ckNow() - ckptWhen < every) return Promise.resolve(false);
    if (s.host.epoch + ':' + s.host.seq === ckptSig) return Promise.resolve(false);
    return checkpoint(s.pid || currentPid(), 'tick');
  }
  U._ckptTick = ckptTick;
  function armCkpt() {
    stopCkpt();
    const s = C.session;
    if (s && s.host) ckptSig = s.host.epoch + ':' + s.host.seq;
    ckptWhen = ckNow();
    ckptTimer = setInterval(function () { try { ckptTick(); } catch (e) { C.lastError = e; } }, 30000);
  }
  function stopCkpt() { if (ckptTimer) { clearInterval(ckptTimer); ckptTimer = null; } }
  U._ckptTimer = function () { return !!ckptTimer; };

  /* The save points of one project, newest first, read back: when, how many layers, what size. */
  function listCheckpoints(pid) {
    if (!pid || !FM.storage || !FM.storage.collabKeys) return Promise.resolve([]);
    const prefix = 'collab:ckpt:' + pid + ':';
    return FM.storage.collabKeys(prefix).then(function (keys) {
      return Promise.all(keys.slice().reverse().map(function (k) {
        return FM.storage.collabGet(k).then(function (v) {
          let d = null;
          try { d = typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { d = null; }
          const ts = parseInt(k.slice(prefix.length), 10);
          if (!d || !d.project || !Array.isArray(d.layers) || !isFinite(ts)) return null;
          return { key: k, ts: ts, arm: isArmKey(k), layers: d.layers.length, w: d.project.width, h: d.project.height };
        });
      }));
    }).then(function (rows) { return rows.filter(Boolean); }, function () { return []; });
  }
  U._listCheckpoints = listCheckpoints;
  function whenLabel(ts) {
    const d = new Date(ts), now = new Date();
    let t = '';
    try { t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (e) { t = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
    if (d.toDateString() === now.toDateString()) return 'Today, ' + t;
    const y = new Date(now.getTime() - 86400000);
    if (d.toDateString() === y.toDateString()) return 'Yesterday, ' + t;
    try { return d.toLocaleDateString() + ', ' + t; } catch (e) { return t; }
  }
  /* For a NAME, which is kept for good: "Today" in a project name is wrong from tomorrow on (S7 review). */
  function absLabel(ts) {
    const d = new Date(ts);
    let day = '', t = '';
    try { day = d.toLocaleDateString([], d.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { day = d.toDateString(); }
    try { t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (e) { t = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
    return day + ', ' + t;
  }
  U._absLabel = absLabel;
  /* §24: "Earlier versions…" ALWAYS restores as a NEW project. It goes through `duplicateFrom` — new layer
     ids, the media copied under them, queue 915.3's rollback if the device fills up half way — so the
     project he is sharing, and everybody's copy of it, is not touched in any way. */
  function restoreCheckpoint(key, name) {
    return FM.storage.collabGet(key).then(function (v) {
      let d = null;
      try { d = typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { d = null; }
      if (!d || !d.project || !Array.isArray(d.layers)) return null;
      return FM.projects.duplicateFrom(d, { name: name }).then(function (nid) {
        if (!nid) return null;
        /* No source card is named (its thumbnail and size are TODAY's, not this version's), so the card
           takes the size the saved document itself has. */
        try {
          const idx = FM.projects.list();
          const e = idx.find(function (x) { return x.id === nid; });
          if (e) { e.width = d.project.width; e.height = d.project.height; e.fps = d.project.fps; e.duration = d.project.duration; FM.projects.saveIndex(idx); }
        } catch (e) {}
        return nid;
      });
    });
  }
  U._restoreCheckpoint = restoreCheckpoint;

  /* ═══ S7 · THE ROOM'S SWITCHES, TO THE PEOPLE THEY APPLY TO ════════════════════════════════════════
   * The host record keeps them; the session carries them (collab-session.js `setRoomSettings`), each
   * member getting only what applies to it. Called whenever one of them, or the link, changes. */
  function pushSettings() {
    const s = C.session;
    if (!s || !s.isOwner || !s.setRoomSettings || !hostRoom) return false;
    const st = hostRoom.settings || {};
    return s.setRoomSettings({ roExport: st.roExport !== false, editorsInvite: !!st.editorsInvite, max: maxPeople(),
      ask: st.ask !== false, linkRole: st.linkRole || 'editor',
      link: C.signal.codesOnly() ? null : C.signal.inviteLink(hostRoom) });
  }
  U._pushSettings = pushSettings;

  /* ═══ S7 · §16.3's UI COURTESY — THE ROLE, ON THE WHOLE EDITOR ═══════════════════════════════════
   * `body.collab-ro` hides the + and turns the inspector's controls off (styles.css); the canvas and the
   * timeline guard their gesture starts on `FM.collab.readOnly()`. A line above the inspector says why, in
   * words, so a Viewer is never left pressing things that do nothing. None of this is the lock — that is
   * the host, and the backstop in collab-session.js — it is what keeps a Viewer from feeling locked out. */
  function applyRoleClasses() {
    const b = document.body;
    const r = C.myRole ? C.myRole() : 'owner';
    const ro = installed && (r === 'viewer' || r === 'commenter');
    b.classList.toggle('collab-ro', ro);
    b.classList.toggle('collab-commenter', ro && r === 'commenter');
    b.classList.toggle('collab-viewer', ro && r === 'viewer');
    let note = document.getElementById('collab-ro-note');
    if (!ro) { if (note) note.remove(); return; }
    const panel = document.getElementById('inspector-panel'), insp = document.getElementById('inspector');
    if (!panel || !insp || insp.parentNode !== panel) return;
    if (!note) { note = el('div', 'collab-ro-note'); note.id = 'collab-ro-note'; note.setAttribute('role', 'status'); }
    if (note.parentNode !== panel || note.nextSibling !== insp) panel.insertBefore(note, insp);
    const t = r === 'viewer' ? 'View only — you can watch, play and follow' : 'Commenter — you can comment, not change the edit';
    if (note.textContent !== t) note.textContent = t;
  }
  U.applyRoleClasses = applyRoleClasses;
  function roleWords(r) { return r === 'viewer' ? 'a Viewer' : r === 'commenter' ? 'a Commenter' : 'an Editor'; }
  /* The owner changed this device's role: said, applied, and every open surface redrawn — now, not at
     the next thing the person tries (§16.3 "live role changes update these classes immediately"). */
  U.onRole = function () {
    applyRoleClasses();
    const s = C.session;
    const root = panelRoot();
    if (root && s && !s.isOwner) drawGuestPanel(s, root === card ? undefined : root);
    U.friendsBar();
    if (C.comments && C.comments.onRole) { try { C.comments.onRole(); } catch (e) {} }
    if (s && !s.isOwner && FM.toast) FM.toast((s.hostName || 'The owner') + ' made you ' + roleWords(s.role), 2600);
  };
  U.onSettings = function () {
    const s = C.session;
    const root = panelRoot();
    if (root && s && !s.isOwner) drawGuestPanel(s, root === card ? undefined : root);
  };
  /* A comment was added, answered or resolved: the "Comments" row of whichever panel is open says so. */
  U.onComments = function () {
    const root = panelRoot();
    if (!root) return;
    const row = root.querySelector('.cs-comments');
    if (!row) return;
    const fresh = commentsRow();
    row.parentNode.replaceChild(fresh, row);
  };
  function commentsRow() {
    const n = C.comments ? C.comments.count() : 0;
    /* ⚠️ NOT `.cs-add`: that class is the "Connect with a code" door, and the S3 suite (and anything else)
       finds that door by it — a comments row sharing the class sat first in the card and took its clicks. */
    const b = btn('cs-navrow cs-comments', n ? 'Comments · ' + n + ' open' : 'Comments', function () {
      closeAny();
      if (C.comments) C.comments.open();
    });
    /* By role (S7 review): a Viewer was told to "reply" and "leave a note", and the card behind the row lets
       a Viewer do neither. */
    const canWrite = !C.comments || !C.comments.canWrite || C.comments.canWrite();
    b.appendChild(el('span', 'cs-add-sub', !canWrite
      ? (n ? 'Read what people have said — ask to be a Commenter to add your own' : 'Nothing yet — ask to be a Commenter to add one')
      : n ? 'Read them and reply — comments never stop an export' : 'Leave a note about the edit for everyone — it never stops an export'));
    return b;
  }
  /* Test seam, the same one level of indirection `FM.collab._reload()` exists for (S2's note): the
     revocation above is a thing that has to be MEASURED as absent, and "no live offer" is not visible
     from outside the module any other way. */
  U._offer = function () { return offerLink; };

  U.share = function (opts) {
    const o = opts || {};
    if (!U.labsOn()) return Promise.resolve(null);
    /* S6: a pending note is NOT cleared by opening the panel — the knock that declined itself while the
       panel was shut (§19.3's "quiet note") has to still be there when he next looks. The note is spent
       by the draw that shows it, as before. */
    if (!o.keepStep) shareStep = 'main';
    const s = C.session;
    /* A guest's Share button opens the same card showing the session he is IN, never an arm. */
    if (s && !s.isOwner) return drawGuestPanel(s);
    if (!s) {
      /* ⚠️ A SHARED COPY WITH NO SESSION IS STILL SOMEBODY ELSE'S (S6 review). A copy reopened after iOS
         killed the app has no session while its reconnect runs, and this branch ARMED it — a new room of
         the guest's own, on the public relays, under the owner's project — and then the reconnect, finding
         a session, closed the link it had just made to the owner. So the copy gets its guest panel:
         what it is doing, and a Leave that works without a session. */
      const lc = cardOf(currentPid());
      if (lc && lc.collab) return Promise.resolve(drawLinkedPanel(lc));
      return armShare().then(function (ok) { return ok ? drawShare() : null; });
    }
    useRoom(s.pid || currentPid(), true);
    showCode();
    startHostRelay();                        // an ensure: a Codes-only flip, a lapsed code or a dropped relay comes back here
    return Promise.resolve(drawShare());
  };

  /* §12.1 arming, steps 1–7 — the Share button's, and since queue 945 the Friends block's Start sharing (the ONLY two doors
     that may arm; opening the block is not one). Resolves true when a room is live. `arming` makes it one arm however many
     times it is pressed: the race check below runs before the async checkpoint, so two taps could both reach C.share. */
  function armShare() {
    if (arming) return arming;
    if (!U.labsOn() || C.session) return Promise.resolve(false);
    const lc = cardOf(currentPid());
    if (lc && lc.collab) return Promise.resolve(false);          // somebody else's copy never arms (S6 review)
    const a = arming = U.profile().then(function (p) {
      if (!p) return false;
      const pid = currentPid();
      return takeLock(hostLock(pid)).then(function (mine) {
        if (!mine) {
          FM.ask({ title: OTHER_TAB, single: true, ok: 'OK', message: 'This project is being shared from another FreeMotion tab or window. Share from there, or stop sharing there first and try again here.' });
          return false;
        }
        if (C.session || currentPid() !== pid) { dropLock(hostLock(pid)); return false; }
        useRoom(pid, true);
        /* queue 945: "New people join as" picked in the block before there was a room to write it to. */
        if (pendingLinkRole && hostRoom && hostRoom.settings) { hostRoom.settings.linkRole = pendingLinkRole; saveRoom(pid, hostRoom); }
        pendingLinkRole = null;
        showCode();                          // the panel is about to show it: live from the first second
        return checkpoint(pid, 'arm').then(function () {
          /* S6: the room's own id keys the media resume parts now that there is one (§15's note). */
          C.share({ ownerInfo: { name: p.name, color: p.color }, sid: hostRoom.sid, midFloor: hostRoom.midTop || 0 });
          afterArm();
          return true;
        });
      });
    });
    a.then(function () { if (arming === a) arming = null; }, function () { if (arming === a) arming = null; });
    return a;
  }

  /* §12.1 arming steps 8 and on, in one place for the Share button and for the resume on reopen. */
  function afterArm() {
    ridMid = Object.create(null);
    hostOlder = null;
    startHostRelay();
    /* S7: the room's switches reach every member from the first hello (collab-session.js sends them with
       the welcome), and a save point every ten minutes while anything changes (§12.4). */
    pushSettings();
    armCkpt();
    /* The foreground listener is for the WAKE LOCK as much as for the relay — a phone hosting with Codes
       only has no relay and still needs its lock back after every glance at another app — so it is
       installed here, at once, not when the relay's keys have been derived. */
    watchDoc();
    takeWake();
    /* §22: a phone that hosts has to stay awake — iOS drops every connection soon after the screen locks,
       and a wake lock only holds while the app is on screen. Said once, when he starts. */
    if (isPhoneNow() && FM.toast) FM.toast('Keep FreeMotion open — the session pauses when your screen locks', 3600);
    U.syncBanner();
  }

  /* ═══ queue 945 · WHAT THE FRIENDS BLOCK DRAWS ══════════════════════════════════════════════════════════════
     Routed by what is TRUE, and not one of the routes arms: Labs off → the switch; a guest → the guest panel; the owner,
     live → the Share panel itself; a shared copy with no session → its panel; otherwise → not shared yet, with Start sharing. */
  U.renderFriends = function (host, o) {
    if (!host) return null;
    if (fhost !== host) { fhost = host; fhostShowedCode = false; }
    watchFriendsHost();
    if (!(o && o.keepStep)) shareStep = 'main';
    U.friendsBar();
    if (!U.labsOn()) return drawLabsOff(host);
    const s = C.session;
    if (s && !s.isOwner) return drawGuestPanel(s, host);
    if (s) return drawShare(host);
    const lc = cardOf(currentPid());
    if (lc && lc.collab) return drawLinkedPanel(lc, host);
    return drawFriendsIdle(host);
  };
  function drawFriendsIdle(host) {
    const c = mountHost(host);
    const head = el('div', 'cs-head');
    head.appendChild(el('h2', 'fm-ask-title', 'Share “' + projectName() + '”'));
    head.appendChild(el('div', 'cs-state', stateLine(null)));
    c.appendChild(head);
    const body = el('div', 'cs-body');
    c.appendChild(body);
    /* Him, as the others will see him — and NOT memberRows(), which also lists a stored room's offline members. The row's
       second line is said here, not by statusLine(): nothing is shared, so he is nobody's "Owner" yet (critic's finding). */
    const have = U.getProfile();
    const me = have || { name: 'You', color: PALETTE[0] };
    const ul = el('ul', 'cs-people');
    const li = personRow(me.name, me.color, 'you', null, null);
    const pr = li.querySelector('.cs-prole');
    if (pr) pr.textContent = have ? 'You — your name and colour, as others see them' : 'You — pick the name and colour others will see';
    li.appendChild(btn('cs-role cs-fr-profile', have ? 'Change…' : 'Set up…', function () {
      U.profile({ force: true }).then(function () { if (fhost === host && host.isConnected) U.renderFriends(host, { keepStep: true }); });
    }));
    ul.appendChild(li);
    body.appendChild(ul);
    const start = btn('cs-start accent', 'Start sharing', function () {
      start.disabled = true;
      armShare().then(function () {
        if (fhost === host && host.isConnected) U.renderFriends(host); else start.disabled = false;
      }, function () { start.disabled = false; });
    });
    body.appendChild(start);
    body.appendChild(el('div', 'cs-fr-hint', 'Opening this never shares anything by itself.'));
    body.appendChild(joinAsRow({ pending: true }));
    const foot = el('div', 'cs-foot');
    foot.appendChild(btn('cs-done', 'Done', function () { closeAny(); }));
    c.appendChild(foot);
    return c;
  }
  /* With Labs off the bar still shows (his pick) — and opened, it says what live sharing is and offers the one switch.
     The privacy line is the Labs switch's own, because turning it on here is turning on exactly that. */
  function drawLabsOff(host) {
    const c = mountHost(host);
    const head = el('div', 'cs-head');
    head.appendChild(el('h2', 'fm-ask-title', 'Work on this with friends'));
    head.appendChild(el('div', 'cs-state', 'Live sharing is still being tested'));
    c.appendChild(head);
    const body = el('div', 'cs-body');
    c.appendChild(body);
    body.appendChild(el('div', 'collab-sub', 'Share this project live and edit it together from your own phones or computers. It is still being tested, so it stays off until you turn it on — and you can turn it off again in Settings → Labs.'));
    body.appendChild(switchRow('Live collaboration', 'Being tested', false, function () {
      if (FM.settings && FM.settings.set) FM.settings.set('collabLabs', true);
      if (fhost === host && host.isConnected) U.renderFriends(host);
    }));
    body.appendChild(el('div', 'cs-privacy', PRIVACY_LINE));
    const foot = el('div', 'cs-foot');
    foot.appendChild(btn('cs-done', 'Done', function () { closeAny(); }));
    c.appendChild(foot);
    return c;
  }
  /* Everything the block holds, let go — at every close of the dialog, and by the observer at a bare hide. */
  U.friendsClosed = function () {
    if (fhostObs) { try { fhostObs.disconnect(); } catch (e) {} fhostObs = null; }
    if (fhostShowedCode) { fhostShowedCode = false; touchCode(); }
    const b = fhost || document.getElementById('cv-fr-body');
    if (b) b.textContent = '';
    fhost = null;
    pendingLinkRole = null;
    U.friendsBar();
  };
  /* THE BAR: what is true in one line, and who is here. Names and colours came from other devices: textContent, and the
     colour through the palette check into a custom property, never a raw style string (§14.9). Counts OTHER people, like
     the card's head and the stage chip, so all three agree. */
  let friendsSig = '';
  U.friendsBar = function () {
    const sub = document.getElementById('cv-fr-sub'), faces = document.getElementById('cv-fr-faces');
    if (!sub || !faces) return;
    const s = C.session;
    let live = false, text;
    if (!U.labsOn()) text = 'Share it live with friends';
    else if (s && s.isOwner) {
      live = true;
      const n = s.peerIds ? s.peerIds().length : 0;
      text = n ? n + (n === 1 ? ' person here' : ' people here') : 'waiting for someone';
    } else if (s) {
      live = !s.ended && s.online !== false;
      text = s.ended ? 'Ended — your copy stays here' : s.online === false ? 'Offline — reconnecting' : 'shared with you';
    } else {
      const lc = cardOf(currentPid());
      text = (lc && lc.collab) ? 'Shared by ' + hostNameFor(lc.id) + ' · not connected' : 'Not shared yet · invite people';
    }
    const people = (s && U.labsOn() && C.presence && C.presence.people) ? C.presence.people() : [];
    const sig = JSON.stringify([live, text, people.map(function (p) { return [p.name, p.color, p.st]; })]);
    if (sig === friendsSig && sub.firstChild) return;
    friendsSig = sig;
    sub.textContent = '';
    if (live) { sub.appendChild(el('span', 'cv-fr-live', '● Live')); sub.appendChild(document.createTextNode(' · ' + text)); }
    else sub.textContent = text;
    faces.textContent = '';
    const ini = (C.presence && C.presence.initials) ? C.presence.initials : function (n) { return (cleanName(n).charAt(0) || '?').toUpperCase(); };
    people.slice(0, 3).forEach(function (p) {
      const f = el('span', 'cv-fr-face' + (p.st && p.st !== 'here' ? ' away' : ''), ini(p.name));
      f.style.setProperty('--peer', cleanColor(p.color) || '#888888');
      faces.appendChild(f);
    });
    if (people.length > 3) faces.appendChild(el('span', 'cv-fr-more', '+' + (people.length - 3)));
  };
  /* The people door — the stage's person+ and the faces chip. On a phone: Canvas settings with Friends big (a second press
     closes it, the 944 rule); it NEVER falls back to U.share() there, which arms (critic's finding). On a PC: the Share card. */
  U.openPeople = function () {
    if (isPhoneNow()) {
      const homeUp = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
      if (homeUp || !FM.openCanvasDialog) return Promise.resolve(null);
      const d = friendsDlg();
      if (d && !d.classList.contains('hidden')) { if (FM.closeCanvasDialog) FM.closeCanvasDialog(); return Promise.resolve(null); }
      FM.openCanvasDialog({ block: 'friends' });
      return Promise.resolve(null);
    }
    return U.share();
  };

  function drawShare(host) {
    const s = C.session;
    useRoom((s && s.pid) || currentPid(), true);
    if (shareStep === 'main') showCode();                        // the code is on screen, so it stays live
    if (shareStep !== 'code') startHostRelay();
    let c;
    if (host) {
      /* queue 945: into the Friends block. The code's half hour starts when the block lets go of it (mountHost/friendsClosed). */
      c = mountHost(host);
      if (shareStep === 'main') fhostShowedCode = true;
    } else {
      const anchor = shareBtn && shareBtn.getBoundingClientRect().width > 0 ? shareBtn : null;
      c = openCard('collab-share', { label: 'Share this project', anchor: anchor });
      /* S8 review: "stops working 30 minutes after you close this" — so the half hour starts at the close, not at
         the last redraw (a panel left open 25 minutes used to leave the code 5). */
      if (shareStep === 'main') c._onclose = function () { touchCode(); };
    }
    const head = el('div', 'cs-head');
    const drill = shareStep === 'settings' || shareStep === 'versions';
    if (drill) {
      /* S7: the drill-in's own header — a back arrow and where you are, in place of the project title. */
      const bk = el('div', 'cs-backrow');
      const back = btn('cs-backbtn', '\u2039', function () { shareStep = shareStep === 'versions' ? 'settings' : 'main'; redrawShare(); });
      back.setAttribute('aria-label', 'Back');
      bk.appendChild(back);
      bk.appendChild(el('h2', 'fm-ask-title', shareStep === 'versions' ? 'Earlier versions' : 'Sharing settings'));
      head.appendChild(bk);
    } else {
      head.appendChild(el('h2', 'fm-ask-title', 'Share “' + projectName() + '”'));
      head.appendChild(el('div', 'cs-state', stateLine(s)));
    }
    /* Rendered once and consumed: it says what happened to the code that is no longer on screen. */
    if (shareNote) { head.appendChild(el('div', 'cs-note', shareNote)); shareNote = null; }
    c.appendChild(head);

    const body = el('div', 'cs-body');
    c.appendChild(body);

    /* 📐 THE DRILL-IN, PICKED FROM THREE DRAWN OPTIONS (rule 16 / #545 — all three rendered at 380 and
       1280 and kept). "One page" put the whole code exchange under the people list and "Code first" put
       it above; both were rejected for the same measured reason. The code is 165 characters — six
       wrapped lines at 380px, five at 1280 — so wherever it sits at rest it is the biggest thing in the
       card, and on a phone it pushed "who is here" off the screen. It is also the one part of this
       panel he will use ONCE per person and then never look at again, whereas the people list is what
       he opens the panel to see. So the resting view is lean (§19.1's own word), and the exchange is a
       step you go into and come back from. */
    if (shareStep === 'code') drawCodeStep(body);
    else if (shareStep === 'settings') drawSettingsStep(body);
    else if (shareStep === 'versions') drawVersionsStep(body);
    else {
      body.appendChild(memberRows(s));
      /* S7 (§17.1 entry points): the comments, one tap from the people — the same row the guest panel has. */
      if (C.comments && C.comments.installed && C.comments.installed()) body.appendChild(commentsRow());
      /* S6 (§19.1 "General access"): the link, the QR and the 9-character code, then who gets asked. The
         connection-code exchange stays — it is the way in that needs no relay at all — but as the second
         choice rather than the only one. */
      const relayOn = !C.signal.codesOnly();
      body.appendChild(inviteBlock());
      if (relayOn) body.appendChild(askRow());
      /* S7 (§19.1 "They join as [Editor ▾]"): Docs puts the role a link grants right beside the link. */
      body.appendChild(joinAsRow());
      const addBtn = btn('cs-add', relayOn ? 'Connect with a code instead' : 'Add someone with a code', function () { shareStep = 'code'; redrawShare(); });
      addBtn.appendChild(el('span', 'cs-add-sub', relayOn
        ? 'No relay at all — you send them a long code and they send one back'
        : 'No account, no server — you send them a code and they send one back' /* queue 921 S3: NOT "read out": the codes-only code is a ~250-character block you copy into a message. A short code you could read aloud needs the relay (S6), and saying "read" of a 250-char blob is a promise the screen does not keep. */));
      body.appendChild(addBtn);
      /* §14.9's privacy line, word for word, wherever the relay is in use. */
      if (relayOn) body.appendChild(el('div', 'cs-privacy', PRIVACY_LINE));
    }

    /* 📐 S7: THE FOOT IS [⚙] [Stop sharing] [Done], and "Comments" is a row in the body. §19.1 lists four
       things for the foot — ⚙ · "Comments (3)" · [Stop sharing] · [Done] — and at 380 px they do not fit:
       the card's content box is 332 px, "Stop sharing" needs ~115 of it and "Comments (3)" ~120, and the
       drawn option with all four cut Stop sharing in half. Stop sharing is the one that must never be two
       taps away, so it keeps its place and the comments go where the people are. */
    const foot = el('div', 'cs-foot');
    if (shareStep !== 'code') {
      const gear = btn('cs-gear' + (drill ? ' on' : ''), '', function () { shareStep = drill ? 'main' : 'settings'; redrawShare(); });
      gear.appendChild(gearSvg());
      gear.setAttribute('aria-label', drill ? 'Back to sharing' : 'Sharing settings');
      gear.setAttribute('aria-pressed', drill ? 'true' : 'false');
      foot.appendChild(gear);
    }
    foot.appendChild(btn('cs-stop', 'Stop sharing', function () {
      FM.ask({
        title: 'Stop sharing?', danger: true, ok: 'Stop sharing',
        message: 'Everyone here keeps their own copy. The codes you have handed out stop working.'
      }).then(function (yes) {
        if (!yes) return;
        const pid = currentPid();
        /* §12.1 "ending": a final save point, BEFORE the room goes — the last picture of the project as the
           people in it left it. Not awaited: IndexedDB takes its own time and the stop must not wait on it. */
        checkpoint(pid, 'stop');
        C.end();
        dropOffer();                 // …and the code he read out a minute ago really does stop working
        dropRoom(pid);
        hostRoom = null; hostRoomPid = null;
        U.syncBanner();
        /* queue 945: in the Friends block the block stays, and says it is not shared any more (with Start sharing). */
        if (host) { if (fhost === host && host.isConnected) U.renderFriends(host); }
        else closeCard();
        if (FM.toast) FM.toast('Sharing stopped', 2200);
      });
    }));
    foot.appendChild(btn('cs-done accent', 'Done', function () { if (host) closeAny(); else closeCard(); }));
    c.appendChild(foot);
    return c;
  }

  function gearSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', 'cs-gearico'); svg.setAttribute('aria-hidden', 'true');
    const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c1.setAttribute('cx', '12'); c1.setAttribute('cy', '12'); c1.setAttribute('r', '3');
    const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p1.setAttribute('d', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z');
    svg.appendChild(c1); svg.appendChild(p1);
    return svg;
  }

  /* "New people join as [Editor ▾]" — the role the link and the short code grant (§19.1). A member he has
     already let in keeps the role he gave them; this is only where a stranger starts. */
  function joinAsRow(o) {
    /* queue 945: `pending` — the Friends block before anything is shared. There is no room to write the choice to, and
       making one would re-arm the project by itself at its next open (resumeOpen: "a record means he never stopped"),
       so the choice is held here and applied by Start sharing. */
    const pending = !!(o && o.pending);
    const row = el('div', 'cs-row cs-joinrow');
    row.appendChild(el('div', 'cs-rowlabel', 'New people join as'));
    const cur = pending ? (pendingLinkRole || 'editor') : ((hostRoom && hostRoom.settings && hostRoom.settings.linkRole) || 'editor');
    const b = btn('cs-role cs-joinas', labelFor(cur) + ' \u25be', function (e) {
      const r = b.getBoundingClientRect();
      FM.contextMenu.show(r.left, r.bottom + 4, ROLES.map(function (p) {
        return { label: p[1] + (p[0] === cur ? '  \u2713' : ''), action: function () {
          if (pending) { pendingLinkRole = p[0]; redrawShare(); return; }
          if (!hostRoom) return;
          hostRoom.settings.linkRole = p[0];
          saveRoom(hostRoomPid || currentPid(), hostRoom);
          pushSettings();
          redrawShare();
        } };
      }));
      e.stopPropagation();
    });
    b.setAttribute('aria-label', 'New people join as ' + labelFor(cur));
    row.appendChild(b);
    return row;
  }

  /* ═══ S7 · THE COLLABORATION SETTINGS MENU (§19.1 "Settings drill-in") ═════════════════════════════
   * His words: "it might need its own settings menu for when you do have it enabled … take inspiration
   * from what Google Docs has". One place for all of it, grouped the way Docs groups its sharing settings:
   * who you are, what the people in it may do, what THIS device shows, how it connects, and the save
   * points. Stop sharing stays in the foot, where it is from every view.
   * 📐 DRAWN THREE WAYS FIRST (rule 16 / #545), all rendered in the real app at 380 and 1280:
   *   A · a drill-in behind ⚙ in the Share card's foot (BUILT) — the resting view stays "who is here and
   *       how do I invite someone", which is what he opens the panel for, and the settings are one tap away;
   *   B · tabs across the top [People | Invite | Settings] — the invite and the people could no longer be
   *       seen together, and a third of his taps became tab switches;
   *   C · one long page — at 380 px the settings began two and a half screens down, under the invite.
   * §19.1 wanted this too, as the "⚙ (settings drill-in using the sb-panel-in family)". */
  function switchRow(label, hint, on, flip) {
    const row = el('div', 'cs-srow');
    const t = el('div', 'cs-stext');
    t.appendChild(el('div', 'cs-slabel', label));
    if (hint) t.appendChild(el('div', 'cs-shint', hint));
    row.appendChild(t);
    const sw = el('button', 'set-switch cs-switch' + (on ? ' on' : ''));
    sw.type = 'button';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', on ? 'true' : 'false');
    sw.setAttribute('aria-label', label);
    sw.appendChild(el('span', 'set-knob'));
    sw.addEventListener('click', function () { flip(!on); });
    row.appendChild(sw);
    return row;
  }
  function sgroup(title) {
    const g = el('div', 'cs-sgroup');
    if (title) g.appendChild(el('div', 'cs-sgtitle', title));
    return g;
  }
  function drawSettingsStep(body) {
    const st = hostRoom.settings;
    /* You */
    const you = sgroup('You');
    const me = U.getProfile() || { name: 'You', color: PALETTE[0] };
    const yr = el('div', 'cs-srow');
    const dot = el('span', 'cs-dot'); dot.style.background = cleanColor(me.color) || PALETTE[0];
    yr.appendChild(dot);
    const yt = el('div', 'cs-stext');
    yt.appendChild(el('div', 'cs-slabel', cleanName(me.name) || 'You'));
    yt.appendChild(el('div', 'cs-shint', 'Your name and colour, as the others see them'));
    yr.appendChild(yt);
    yr.appendChild(btn('cs-role cs-profile', 'Change…', function () {
      U.profile({ force: true }).then(function (p) {
        /* The owner is never in the member table, so the roster reads his name from the host itself —
           which is what makes a change here reach every screen at the next roster, not the next session. */
        const ss = C.session;
        if (p && ss && ss.isOwner && ss.host && ss.host.ownerSelf) { ss.host.ownerSelf.name = p.name; ss.host.ownerSelf.color = p.color; pushSettings(); }
        if (C.session && C.session.isOwner) { shareStep = 'settings'; if (fhostLive()) U.renderFriends(fhost, { keepStep: true }); else U.share({ keepStep: true }); }
      });
    }));
    you.appendChild(yr);
    body.appendChild(you);

    /* People */
    const ppl = sgroup('People in this project');
    /* ⚠️ SAID AS IT IS (S7 review). "You still let each person in" is only true while the link asks him first:
       with "Let them in", whoever an Editor hands the link to walks straight in — which is his setting, so
       the switch says so rather than promising a knock that will not come. And with Codes only on there is
       no link to hand anyone, so it says that too. */
    const inviteHint = C.signal.codesOnly()
      ? 'Off while “Connect with codes only” is on — there is no link to pass on. It comes back when you turn that off.'
      : st.ask
        ? 'They see the link and can pass it on; you still let each person in. A link they already copied works until you reset it.'
        : 'They see the link and can pass it on — and with the link set to “Let them in”, whoever they give it to gets straight in. A link they already copied works until you reset it.';
    ppl.appendChild(switchRow('Editors can invite others', inviteHint,
      !!st.editorsInvite, function (v) { st.editorsInvite = v; saveRoom(hostRoomPid || currentPid(), hostRoom); pushSettings(); redrawShare(); }));
    /* D11: said honestly. The video is made on THEIR device, from a copy of the project that has to be on
       their device for the session to work at all, so this can only ask their FreeMotion to hold back. */
    ppl.appendChild(switchRow('Viewers and commenters can export',
      'Their device makes the video, so this only asks it not to — it can’t stop a screen recording, and their copy is on their device either way.',
      st.roExport !== false, function (v) { st.roExport = v; saveRoom(hostRoomPid || currentPid(), hostRoom); pushSettings(); redrawShare(); }));
    const cap = isPhoneNow() ? ((C.LIMITS && C.LIMITS.PEOPLE_MAX_PHONE) || 6) : ((C.LIMITS && C.LIMITS.PEOPLE_MAX_PC) || 12);
    const mr = el('div', 'cs-srow');
    const mt = el('div', 'cs-stext');
    mt.appendChild(el('div', 'cs-slabel', 'Most people at once'));
    mt.appendChild(el('div', 'cs-shint', 'Counting you. Up to 12 from a computer, 6 from a phone.'));
    mr.appendChild(mt);
    const mb = btn('cs-role cs-max', String(maxPeople()) + ' \u25be', function (e) {
      const r = mb.getBoundingClientRect();
      const items = [];
      for (let n = 2; n <= cap; n++) {
        (function (n) {
          items.push({ label: String(n) + (n === maxPeople() ? '  \u2713' : ''), action: function () { st.max = n; saveRoom(hostRoomPid || currentPid(), hostRoom); pushSettings(); redrawShare(); } });
        })(n);
      }
      FM.contextMenu.show(r.left, r.bottom + 4, items);
      e.stopPropagation();
    });
    mb.setAttribute('aria-label', 'Most people at once: ' + maxPeople());
    mr.appendChild(mb);
    ppl.appendChild(mr);
    body.appendChild(ppl);

    /* On this device — the same three switches Settings → Labs has (§19.8), read and written through the
       one settings store, so the two places can never disagree. */
    const dev = sgroup('On this device');
    const flipSetting = function (k) { return function (v) { FM.settings.set(k, v); redrawShare(); }; };
    dev.appendChild(switchRow('Show others’ pointers', 'Their mouse pointer and their taps, in their colour.', FM.settings.get('collabCursors') !== false, flipSetting('collabCursors')));
    dev.appendChild(switchRow('Show others’ selections', 'An outline in their colour around the layers they have selected.', FM.settings.get('collabSelections') !== false, flipSetting('collabSelections')));
    dev.appendChild(switchRow('Connect with codes only', 'No free relay at all. The link and the short code stop working — you swap a long code with each person instead.', !!FM.settings.get('collabCodesOnly'), function (v) {
      FM.settings.set('collabCodesOnly', v);
      pushSettings();
      shareStep = 'settings';
      redrawShare();
    }));
    body.appendChild(dev);

    /* Connection */
    const con = sgroup('Connection');
    const line = el('div', 'cs-relay cs-sstatus', C.signal.codesOnly() ? 'Codes only — nothing but the devices themselves' : relayLine());
    if (!C.signal.codesOnly()) { line.id = 'collab-relay-status'; if (relayWarn()) line.classList.add('warn'); }
    con.appendChild(line);
    con.appendChild(btn('cs-slink', 'Having trouble? Connect with a code', function () { shareStep = 'code'; redrawShare(); }));
    body.appendChild(con);

    const ev = btn('cs-navrow cs-versions-nav', 'Earlier versions…', function () { shareStep = 'versions'; redrawShare(); });
    ev.appendChild(el('span', 'cs-add-sub', 'Save points from while you shared — any one comes back as a new project'));
    body.appendChild(ev);

    /* Only where a relay is in use — the main view has always guarded it, and under Codes only it said the
       opposite of the "nothing but the devices themselves" line just above it (S7 review). */
    if (!C.signal.codesOnly()) body.appendChild(el('div', 'cs-privacy', PRIVACY_LINE));
    const ver = document.querySelector('.ver');
    body.appendChild(el('div', 'cs-ver', 'FreeMotion ' + (ver ? ver.textContent.trim() : '')));
  }

  /* ═══ S7 · "EARLIER VERSIONS…" (§12.1, §24) ═══════════════════════════════════════════════════════ */
  function drawVersionsStep(body, forPid, forName) {
    const pid = forPid || currentPid();
    const pname = forName || projectName();
    body.appendChild(el('div', 'collab-sub', 'A save point is made when you start sharing, every 10 minutes while anything changes, and when you stop. The last 10 are kept, and always the one from when you started. Bringing one back makes a NEW project — this one, and everybody’s copy of it, is not touched.'));
    const ul = el('ul', 'cs-versions');
    ul.appendChild(el('li', 'cs-vempty', 'Looking…'));
    body.appendChild(ul);
    listCheckpoints(pid).then(function (rows) {
      if (!ul.isConnected) return;
      ul.textContent = '';
      if (!rows.length) { ul.appendChild(el('li', 'cs-vempty', 'No save points yet — they are made while you share this project.')); return; }
      rows.forEach(function (r) {
        const li = el('li', 'cs-version');
        li.setAttribute('data-key', r.key);
        const t = el('div', 'cs-stext');
        t.appendChild(el('div', 'cs-slabel', whenLabel(r.ts)));
        t.appendChild(el('div', 'cs-shint', (r.arm ? 'When sharing started · ' : '') + r.layers + (r.layers === 1 ? ' layer' : ' layers') + (r.w && r.h ? ' · ' + r.w + '×' + r.h : '')));
        /* ⚠️ THE RESULT IS SAID IN THE ROW (S7 review). It was a toast, and the toast (z 60) is painted under
           this card's own scrim (222) — "Saved as …" and "the device may be full" were both invisible, and
           with no sign of anything happening the natural thing was to tap Restore again. */
        const said = el('div', 'cs-shint cs-vstatus hidden');
        said.setAttribute('role', 'status');
        t.appendChild(said);
        li.appendChild(t);
        const rb = btn('cs-role cs-restore', 'Restore', function () {
          const nm = pname + ' — ' + absLabel(r.ts);
          FM.ask({ title: 'Bring this version back?', ok: 'Make a copy',
            message: 'It becomes a new project on Home called “' + nm + '”, with its clips. “' + pname + '” stays exactly as it is, for you and for everyone in it.' })
            .then(function (yes) {
              if (!yes) return;
              rb.disabled = true; rb.textContent = 'Restoring…';
              said.classList.add('hidden');
              restoreCheckpoint(r.key, nm).then(function (nid) { return nid; }, function () { return null; }).then(function (nid) {
                rb.disabled = false; rb.textContent = 'Restore';
                said.textContent = nid ? 'Saved as “' + nm + '” on Home' : 'Could not bring that version back — the device may be full';
                said.classList.remove('hidden');
                said.classList.toggle('warn', !nid);
                if (nid && FM.home && FM.home.refresh) { try { FM.home.refresh(); } catch (e) {} }
              });
            });
        });
        li.appendChild(rb);
        ul.appendChild(li);
      });
    });
  }

  /* ⚠️ "EARLIER VERSIONS…" WITHOUT SHARING (S7 review). Its only door was Share → ⚙, and Share on a project
     with no session ARMS one — a new room, a new link and code, the public relays, and a fresh save point
     that pushed the oldest one out — all to read a list that is on this device. After Stop sharing, which is
     exactly when a wrecked session is looked back on, that was the only way in. This is the list on its own
     card, for any project, reached from the project's ⋯ on Home; nothing is armed and nothing is written. */
  U.versions = function (pid, name) {
    if (!pid) return null;
    const c = openCard('collab-versions', { label: 'Earlier versions' });
    const head = el('div', 'cs-head');
    head.appendChild(el('h2', 'fm-ask-title', 'Earlier versions of “' + (name || 'this project') + '”'));
    c.appendChild(head);
    const body = el('div', 'cs-body');
    c.appendChild(body);
    drawVersionsStep(body, pid, name || 'this project');
    const foot = el('div', 'cs-foot');
    foot.appendChild(btn('cs-done accent', 'Done', function () { closeCard(); }));
    c.appendChild(foot);
    return c;
  };

  /* 📐 "THE LINK", NOT "THE LINK OR CODE". §19.1 labels this row "When someone uses the link or code",
     and §14.1 says in the same spec that "code joins ALWAYS knock". Both cannot be true of one switch; the
     safer reading keeps the knock on the code (45 bits a person can read out loud is far easier to hand
     on, or overhear, than a 44-character link) and makes the label say only what the switch controls. */
  function askRow() {
    const row = el('div', 'cs-row');
    row.appendChild(el('div', 'cs-rowlabel', 'When someone uses the link'));
    const seg = el('div', 'cs-seg');
    [['ask', 'Ask me first'], ['in', 'Let them in']].forEach(function (p) {
      const on = (p[0] === 'ask') === !!(hostRoom && hostRoom.settings.ask);
      const b = btn('cs-segbtn' + (on ? ' on' : ''), p[1], function () {
        if (!hostRoom) return;
        hostRoom.settings.ask = p[0] === 'ask';
        saveRoom(currentPid(), hostRoom);
        pushSettings();                      // an Editor who may invite is told what the link now does (S7 review)
        redrawShare();
      });
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      seg.appendChild(b);
    });
    row.appendChild(seg);
    row.appendChild(el('div', 'cs-rowhint', 'The short code always asks you first.'));
    return row;
  }

  /* ═══ S6 · THE INVITE (§19.1 "General access") ═══════════════════════════════════════════════════
   * The link, a QR of it, and the 9-character code, with Copy beside each. Copy and Share run INSIDE the
   * tap (§19.1, J2 #3): iOS refuses a clipboard write or a share sheet that comes after an await, which
   * is why the room — and so the link — exists before this is drawn. */
  /* ⚠️ EVERY THIRD PARTY, BY NAME (S6 review). It said "the free relay", singular, and "address and
     timing" — while there are three relays, two address servers (STUN) that learn his address on every
     connection, public brokers ANYBODY can listen on, and every holder of the link or code can open the
     envelopes that carry a joining device's address. The line is longer; the promise it makes is true. */
  const PRIVACY_LINE = 'Free public services help the devices find each other: relays run by PeerJS, EMQX and HiveMQ, and Google and Cloudflare’s address lookup. They see your internet address and when a room is in use, and so can anyone watching those relays; anyone with the link or code can see the address of each device that connects. They never see your project — it goes straight between devices, encrypted.';

  function isPhoneNow() { return !!(FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone()); }

  function copyPlain(text, said, near) {
    const t = String(text || '');
    if (!t) return;
    /* S8 review: "select it and copy it yourself" — and there was nothing to select: the invite block shows
       the link as buttons only. On a refusal the text is put in a read-only field beside the button that
       asked, already selected, so the sentence is true. */
    function fallback() {
      if (FM.toast) FM.toast('Could not copy — it is selected below, copy it yourself', 2800);
      const at = near && near.parentNode;
      if (!at) return;
      let f = at.parentNode ? at.parentNode.querySelector('.cs-copyfield') : null;
      if (!f) {
        f = el('input', 'fm-ask-input cs-copyfield');
        f.type = 'text'; f.readOnly = true;
        f.setAttribute('aria-label', 'Copy this yourself');
        at.parentNode.insertBefore(f, at.nextSibling);
      }
      f.value = t;
      try { f.focus(); f.select(); } catch (e) {}
    }
    try {
      navigator.clipboard.writeText(t).then(function () { if (FM.toast) FM.toast(said || 'Copied', 1800); }, fallback);
    } catch (e) { fallback(); }
  }

  function relayLine() {
    if (C.signal.codesOnly()) return '';
    const r = relay;
    if (!r || !r.rv) return 'Starting the relay…';
    if (r.status === 'unreachable') return 'Couldn’t reach the free connection service — use Connect with a code below.';
    /* S6 review: it only ever went UP. Every relay dropping — Wi-Fi to cellular, a broker hanging up —
       left "the link and the code are live" on screen while no offer could reach him. */
    if (r.status === 'reconnecting') return 'Reconnecting to the free connection service… the link and the code work again once it’s back.';
    if (r.status === 'up') {
      const n = C.session && C.session.peerIds ? C.session.peerIds().length : 0;
      return n ? 'Connected · the link and the code are live' : 'Waiting for people · the link and the code are live';
    }
    return 'Starting the relay…';
  }
  function relayWarn() { return !!relay && (relay.status === 'unreachable' || relay.status === 'reconnecting'); }
  function paintRelayLine() {
    const n = document.getElementById('collab-relay-status');
    if (n) { const t = relayLine(); if (n.textContent !== t) n.textContent = t; n.classList.toggle('warn', relayWarn()); }
  }

  function inviteBlock() {
    const box = el('div', 'cs-invite');
    if (C.signal.codesOnly()) {
      box.classList.add('cs-invite-off');
      box.appendChild(el('div', 'cs-rowlabel', 'Codes only is on'));
      box.appendChild(el('div', 'collab-sub', 'The link and the short code need the free relay, which this device is set not to use. People join by swapping connection codes instead.'));
      return box;
    }
    const link = hostRoom ? C.signal.inviteLink(hostRoom) : null;
    const code = hostRoom ? C.signal.fmtRoomCode(hostRoom.code) : '';
    box.appendChild(el('div', 'cs-rowlabel', 'Invite with a link or a code'));
    const row = el('div', 'cs-linkrow');
    const cl = btn('cs-copylink accent', 'Copy link', function () { copyPlain(link, 'Link copied', cl); });
    row.appendChild(cl);
    if (navigator.share) {
      row.appendChild(btn('cs-sharelink', 'Share…', function () {
        try { navigator.share({ title: 'Join “' + projectName() + '” in FreeMotion', url: link }).catch(function () {}); } catch (e) {}
      }));
    }
    const qrBtn = btn('cs-qrbtn', 'QR', function () { toggleQr(box, link, qrBtn); });
    qrBtn.setAttribute('aria-pressed', 'false');
    qrBtn.setAttribute('aria-label', 'Show a QR code of the link');
    row.appendChild(qrBtn);
    box.appendChild(row);
    const codeRow = el('div', 'cs-roomrow');
    const cv = el('div', 'cs-roomcode', code);
    cv.id = 'collab-room-code';
    cv.setAttribute('aria-label', 'Short code ' + code.split('').join(' '));
    codeRow.appendChild(cv);
    const cc = btn('cs-copycode', 'Copy', function () { copyPlain(code, 'Code copied', cc); });
    codeRow.appendChild(cc);
    box.appendChild(codeRow);
    /* The relay line's own style (spacing, size, light-Home ink), so the hint needs no CSS of its own. */
    box.appendChild(el('div', 'cs-relay cs-codehint', 'The short code stops working ' + Math.round(codeTtlMs() / 60000) + ' minutes after you close this.'));
    const st = el('div', 'cs-relay', relayLine());
    st.id = 'collab-relay-status';
    if (relayWarn()) st.classList.add('warn');
    box.appendChild(st);
    box.appendChild(btn('cs-reset', 'Reset link and code', resetLink));
    return box;
  }

  function toggleQr(box, link, qrBtn) {
    const had = box.querySelector('.cs-qr');
    if (had) { had.parentNode.removeChild(had); qrBtn.setAttribute('aria-pressed', 'false'); qrBtn.classList.remove('on'); return; }
    if (!link || !C.qr) return;
    const q = C.qr.encode(link);
    if (!q) return;
    /* Drawn at the screen's own pixel density so the modules are crisp, and laid out at 4 CSS px a module
       (~196 px for the link's version 6) — a size a phone camera across a table locks onto at once. */
    const dpr = Math.max(1, Math.min(3, Math.round(window.devicePixelRatio || 1)));
    const cv = C.qr.toCanvas(q, 4 * dpr, 4);
    cv.className = 'cs-qrimg';
    cv.style.width = cv.style.height = ((q.size + 8) * 4) + 'px';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', 'QR code of the invite link');
    const wrap = el('div', 'cs-qr');
    wrap.appendChild(cv);
    wrap.appendChild(el('div', 'collab-sub', 'Point the other phone’s camera at this.'));
    const row = box.querySelector('.cs-linkrow');
    box.insertBefore(wrap, row ? row.nextSibling : null);
    qrBtn.setAttribute('aria-pressed', 'true');
    qrBtn.classList.add('on');
  }

  /* §19.1 "Reset link and code": a new sid, key and code, so every copy of the old link and every note
     of the old code stops working. People connected right now stay connected — their channels do not go
     through the relay — and since the S6 review a member who drops out afterwards comes back as before:
     its reconnect goes through the room's hub, which Reset does not touch. */
  function resetLink() {
    FM.ask({
      title: 'Reset the link and code?', danger: true, ok: 'Reset',
      message: 'The old link and code stop working. People who have already joined keep their place and reconnect as before; anyone still to join will need the new link.'
    }).then(function (yes) {
      if (!yes || !hostRoom) return;
      const r = C.signal.newRoom();
      hostRoom.sid = r.sid; hostRoom.sk = r.sk; hostRoom.code = C.signal.newRoomCode();
      saveRoom(currentPid(), hostRoom);
      stopHostRelay();
      startHostRelay();
      pushSettings();                          // S7: the editors who may invite get the new link
      redrawShare();
      if (FM.toast) FM.toast('New link and code — the old ones no longer work', 2600);
    });
  }

  /* ═══ S6 · THE HOST'S RELAY (§12.1 step 8, §14.4) ════════════════════════════════════════════════
   * One rendezvous listening on BOTH the link's topic and the code's (§14.1: "the host listens on both"),
   * answering each offer with a real peer connection, then the same admission a connection code gets —
   * the hello, the version gate, the member table, the knock — before `addPeer` makes a stranger a member. */
  function startHostRelay() {
    const s = C.session;
    if (!s || !s.isOwner || !hostRoom || !U.labsOn() || C.signal.codesOnly()) return null;
    /* The code's room only while the code is fresh (above); the link's and the hub's always. */
    const code = codeFresh() ? hostRoom.code : null;
    if (relay && relay.sid === hostRoom.sid && relay.code === code && relay.hub === hostRoom.hub && !relay.stopped) return relay;
    stopHostRelay();
    const r = relay = { pid: currentPid(), sid: hostRoom.sid, code: code, hub: hostRoom.hub, rv: null, status: 'starting',
      admitting: { join: 0, member: 0, revoked: 0 }, stopped: false, hereAt: 0, memberList: [], memberCache: Object.create(null), codeT: null };
    Promise.all([C.signal.linkKeys(hostRoom), code ? C.signal.codeKeys(code) : null, C.signal.hubKeys(hostRoom.hub)]).then(function (ks) {
      if (relay !== r || r.stopped) return;
      r.hubKeys = ks[2];
      return syncMemberRooms(r).then(function () { return ks; });
    }).then(function (ks) {
      if (!ks || relay !== r || r.stopped) return;
      r.rooms = [{ kind: 'link', keys: ks[0] }];
      if (ks[1]) r.rooms.push({ kind: 'code', keys: ks[1] });
      /* The hub has no key of its own: every member seals with the one its token makes (collab-signal.js). */
      r.rooms.push({ kind: 'hub', keys: ks[2], members: function () { return r.memberList; } });
      if (code) armCodeLapse(r);
      r.rv = C.signal.Rendezvous({
        role: 'host', rooms: r.rooms,
        onEnvelope: function (inner, room, env) { onOffer(r, inner, room, env); },
        onState: function (st, d) {
          if (relay !== r) return;
          if (st.up) r.status = 'up';
          else if (r.status === 'up') r.status = 'reconnecting';
          /* A driver that comes (back) up says `here`, so a guest waiting on that broker retries now
             rather than at its next scheduled attempt. Once a second at most. */
          if (d && d.state === 'up') announce(r);
          paintRelayLine();
        }
      });
      r.rv.start();
      watchDoc();
      r.rv.ready((C.LIMITS && C.LIMITS.RELAY_UP) || 8000).then(function () {
        if (relay !== r) return;
        r.status = 'up'; announce(r); paintRelayLine();
      }, function () {
        if (relay !== r || r.stopped) return;
        if (!r.rv.anyUp()) r.status = 'unreachable';
        paintRelayLine();
      });
    }, function () { if (relay === r) { r.status = 'unreachable'; paintRelayLine(); } });
    return r;
  }
  function announce(r) {
    if (!r || !r.rv || r.stopped) return;
    const t = Date.now();
    if (t - r.hereAt < 1000) return;
    r.hereAt = t;
    r.rv.here();
  }
  /* The code lapses CODE_TTL after it was last on screen. If the panel is still showing it, that is
     "on screen" and it carries on; otherwise the owner stops listening on its topic. */
  function armCodeLapse(r) {
    clearTimeout(r.codeT);
    const left = Math.max(50, (hostRoom ? hostRoom.codeAt : 0) + codeTtlMs() - Date.now() + 20);
    r.codeT = setTimeout(function () {
      if (relay !== r || r.stopped) return;
      /* ⚠️ S8 review: STILL ON SCREEN MEANS STILL THE SAME CODE. This called showCode(), which re-mints a code that
         has lapsed — and at this moment it always has — so the code went on changing behind a panel that kept
         showing the old one, and the next redraw swapped it for a new one under the eyes of the people who had
         written the old one down. The code on screen is simply kept alive. */
      { const n = document.getElementById('collab-room-code'); if (n && n.getClientRects().length) { touchCode(); armCodeLapse(r); return; } }   // queue 945: ON SCREEN, not merely in the page
      startHostRelay();                                    // `code` is no longer fresh, so this restarts without it
    }, left);
  }
  /* The member rooms the hub opens envelopes with: everybody in the room's member table, and — `quiet`,
     answered only to be told — anybody removed whose token is kept to sign that. Keys are derived once. */
  function syncMemberRooms(r) {
    if (!hostRoom || !r.hubKeys) return Promise.resolve([]);
    const want = [];
    Object.keys(hostRoom.members).forEach(function (rid) {
      const m = memberByRid(rid);
      if (m && typeof m.tok === 'string') want.push({ rid: rid, tok: m.tok, quiet: false });
    });
    Object.keys(hostRoom.revoked || {}).forEach(function (rid) {
      const t = hostRoom.revoked[rid];
      if (told(rid) >= revokedTells()) return;               // S8 review: told enough times — its envelopes stop opening at all
      if (!memberByRid(rid) && typeof t === 'string' && /^r[0-9a-f]{16}$/.test(rid)) want.push({ rid: rid, tok: t, quiet: true });
    });
    return Promise.all(want.map(function (w) {
      const have = r.memberCache[w.rid];
      if (have && have.tok === w.tok) { have.room.quiet = w.quiet; return have.room; }
      return C.signal.memberKeys(r.hubKeys, w.rid, w.tok).then(function (keys) {
        const room = { kind: 'member', rid: w.rid, keys: keys, quiet: w.quiet };
        r.memberCache[w.rid] = { tok: w.tok, room: room };
        return room;
      }, function () { return null; });
    })).then(function (list) {
      if (relay === r) r.memberList = list.filter(Boolean);
      return r.memberList;
    });
  }
  function revokedTells() { return (C.LIMITS && C.LIMITS.REVOKED_TELLS) || 3; }
  function told(rid) { return (hostRoom && hostRoom.told && +hostRoom.told[rid]) || 0; }
  function stopHostRelay() {
    const r = relay;
    relay = null;
    if (!r) return;
    r.stopped = true;
    clearTimeout(r.codeT);
    if (r.rv) { try { r.rv.stop(); } catch (e) {} }
    unwatchDocIfIdle();
  }
  U._relay = function () { return relay; };
  U._onOffer = onOffer;               // suite seam: the admission budget is a rule about offers, measured without a network
  U._room = function () { return hostRoom; };
  U._syncMembers = function () { return relay ? syncMemberRooms(relay) : Promise.resolve([]); };

  function memberByRid(rid) {
    if (!hostRoom || typeof rid !== 'string' || !/^r[0-9a-f]{16}$/.test(rid)) return null;
    return Object.prototype.hasOwnProperty.call(hostRoom.members, rid) ? hostRoom.members[rid] : null;
  }
  function blockedHas(k) { return !!hostRoom && Array.isArray(hostRoom.blocked) && hostRoom.blocked.indexOf(k) >= 0; }
  /* D4: the owner's own limit, capped by what this device can carry — six on a phone, twelve on a PC. */
  function maxPeople() {
    const want = +((hostRoom && hostRoom.settings && hostRoom.settings.max) || (C.LIMITS && C.LIMITS.PEOPLE_DEFAULT) || 8);
    const cap = isPhoneNow() ? ((C.LIMITS && C.LIMITS.PEOPLE_MAX_PHONE) || 6) : ((C.LIMITS && C.LIMITS.PEOPLE_MAX_PC) || 12);
    return Math.max(2, Math.min(want, cap));
  }

  /* The key a joiner claims to hold (§14.6): the room's own for the room it came in on — never the OTHER
     room's, so a code cannot be used to authenticate on the link's topic — or a member's token. A removed
     member's token is refused BY NAME, so its device can say "removed" rather than "this invite no longer
     works" and stop trying. */
  function keyFor(mode, mid, room) {
    if (!hostRoom || !C.session || !C.session.isOwner) return { deny: 'ended' };
    if (mode === 'tok') {
      /* S6 review: a token is good ONLY in its own member room — the one its own key opened — so it cannot
         be presented on the link's or the code's topic, where anybody holding those can read it. */
      if (!room || room.kind !== 'member' || room.rid !== mid) return { deny: 'auth' };
      /* Removed: refused by name AND SIGNED with the token it was given, so its device can believe it
         (collab-signal.js `failSigned`) — and nobody without that token can forge it. */
      if (blockedHas(mid)) return { deny: 'removed', key: room.keys.auth };
      const m = memberByRid(mid);
      const k = m && typeof m.tok === 'string' ? C.signal.fromB64url(m.tok) : null;
      return k && k.length === 16 ? k : { deny: 'auth' };
    }
    if ((mode === 'link' || mode === 'code') && room && room.kind === mode) return room.keys.auth;
    return { deny: 'auth' };
  }

  /* ⚠️ TWO DOORS, TWO BUDGETS (S6 review). One counter of four covered every offer, and a knock holds its
     slot until he answers it — so four people typing the short code (a code read out at a meeting, or
     one person with four tabs) held all four for up to eight minutes, and every member whose phone
     locked meanwhile had its reconnect dropped unanswered. A member's offer arrives in the hub, so its
     door is known before anything is answered, and it has its own four. */
  function onOffer(r, inner, room, env) {
    const s = C.session;
    if (relay !== r || !s || !s.isOwner || !hostRoom) return;
    /* ⚠️ S8 review: A REMOVED TOKEN IS NOT A MEMBER, AND IT GETS NO MEMBER'S SLOT. Its room is kept (`quiet`) only
       so its device can be told, signed, that it was removed — and it was answered through the MEMBERS' door:
       a removed device that sent four offers every twenty seconds and never finished ICE held all four
       member slots, so every honest member's reconnect was dropped; and every answer carried the owner's
       current addresses, sealed to a key the removed person holds, for as long as the room lived. So it has
       a door of its own, one answer at a time, and REVOKED_TELLS answers in all — then its room is dropped
       from the hub and its envelopes stop opening. An honest removed device believes the first signed
       refusal and stops trying; one that does not was never going to be told anything else. */
    const revoked = !!(room && room.kind === 'member' && room.quiet);
    const door = revoked ? 'revoked' : room && room.kind === 'member' ? 'member' : 'join';
    if ((r.admitting[door] || 0) >= (revoked ? 1 : ((C.LIMITS && C.LIMITS.PENDING_ADMIT) || 4))) return;
    if (revoked) {
      if (told(room.rid) >= revokedTells()) { syncMemberRooms(r); return; }
      hostRoom.told = hostRoom.told || {};
      hostRoom.told[room.rid] = told(room.rid) + 1;
      saveRoom(hostRoomPid || currentPid(), hostRoom);
      if (told(room.rid) >= revokedTells()) syncMemberRooms(r);
    }
    r.admitting[door] = (r.admitting[door] || 0) + 1;
    const me = U.getProfile() || {};
    C.signal.answer({ rv: r.rv, room: room, offer: inner, env: env, sid: hostRoom.sid, info: { nm: me.name, cl: me.color }, keyFor: keyFor })
      .then(function (res) { return admitRelay(res.link, res.auth, room); })
      .then(function (out) { r.last = out || null; }, function (e) { r.last = (e && e.why) || 'failed'; })
      .then(function () { r.admitting[door]--; });
  }

  /* After the handshake: the hello (bounded, like the code path), then §14.7's gate, the removed list,
     the room's size, and — for somebody the owner has not let in before — the knock. A member coming back
     with its token goes straight in, and takes its old place (its mid) if it had one this session. */
  function admitRelay(link, auth, room) {
    const s = C.session;
    if (!s || !s.isOwner || !hostRoom) { try { link.close(); } catch (e) {} return Promise.resolve('ended'); }
    function deny(why, extra) {
      try { link.send('ctl', Object.assign({ t: 'deny', why: why }, extra || {})); } catch (e) {}
      setTimeout(function () { try { link.close(); } catch (e) {} }, 250);
      return why;
    }
    return awaitHello(link).then(null, function (e) {
      /* No hello, or a flood before it: the link is not somebody we are going to admit, and it must not
         stay open behind the owner's back (awaitHello only lets go of it). */
      try { link.close(); } catch (x) {}
      return Promise.reject(e);
    }).then(function (hello) {
      /* ⚠️ S8 review: NOTHING MORE IS HEARD FROM A LINK UNTIL IT IS LET IN. `awaitHello` lets go of the link the
         moment the hello arrives, and for the whole knock (two minutes, longer while other knocks queue ahead)
         RtcLink still reassembled every 16 MB `ctl` and 64 MB `bulk` message and parsed each one — before
         anybody had decided anything. The link goes quiet instead: frames are counted and dropped unread, and
         past the same budget the hello had the link is closed (which takes the knock card with it). */
      link.quiet = { n: 0, bytes: 0, maxN: HELLO_MAX_MSGS, max: HELLO_MAX_BYTES };
      const gate = C.signal.schemaGate(hello);
      if (gate) {
        if (gate === 'host-older') { hostOlder = { name: cleanName(hello.name) || 'Someone' }; U.syncBanner(); }
        return deny(gate, { app: C.signal.appVersion(), schema: C.SCHEMA_REV });
      }
      if (C.session !== s || !hostRoom) return deny('ended');
      const member = auth && auth.mode === 'tok' ? memberByRid(auth.mid) : null;
      const pmk = typeof hello.mk === 'string' ? hello.mk.slice(0, 32) : '';
      /* A HINT, not an identity (S6 review): the same device's profile key. Another browser has another
         one — what keeps a removed person out is that Remove changes the link and the code. */
      if (!member && pmk && blockedHas('p:' + pmk)) return deny('removed');
      const back = member && ridMid[auth.mid] && s.peerIds().indexOf(ridMid[auth.mid]) >= 0;
      if (!back && s.peerIds().length + 1 >= maxPeople()) return deny('full');
      const knock = !member && (room.kind === 'code' || !!hostRoom.settings.ask);
      const dev = hello.dev === 'phone' ? 'phone' : hello.dev === 'pc' ? 'computer' : '';
      const who = cleanName(hello.name) || 'Someone';
      const kp = knock ? U.knock({ name: who, role: hostRoom.settings.linkRole || 'editor', dev: dev, sas: auth && auth.sas, via: room.kind }) : null;
      /* S6 review: somebody who gives up while they wait takes their knock with them — the card does not
         sit there for two minutes asking him about a person who has gone. */
      if (kp) link.onclose = function () { kp.cancel('gone'); };
      return (kp || Promise.resolve(true)).then(function (yes) {
        if (kp) link.onclose = null;
        /* The session this knock was for stood down while he looked at it: say which way (S6 review) —
           a switch to another project is a pause, and sharing comes back when he does. */
        if (yes === 'paused' || yes === 'ended') return deny(yes);
        if (yes === 'gone' || link.open === false) { noteGone(who); return 'gone'; }
        if (yes !== true) return deny('declined');
        if (C.session !== s || !hostRoom) return deny('ended');
        /* ⚠️ S8 review: THE ROOM IS COUNTED AGAIN AFTER "LET IN". The count above ran before the knock, and four
           knocks can be up at once — so two people typing the code into a phone room with one place left both
           passed it, and two taps on Let in made seven people on a device D4 caps at six. */
        const backNow = member && ridMid[auth.mid] && s.peerIds().indexOf(ridMid[auth.mid]) >= 0;
        if (!backNow && s.peerIds().length + 1 >= maxPeople()) return deny('full');
        link.quiet = null;                                   // admitted: the session reads it from here on
        const rid = member ? auth.mid : 'r' + C.signal.hex(C.signal.randomBytes(8));
        const rec = member || { added: Date.now() };
        rec.name = cleanName(hello.name) || rec.name || 'Someone';
        rec.color = cleanColor(hello.color) || rec.color || PALETTE[0];
        rec.role = member ? (rec.role || 'editor') : (hostRoom.settings.linkRole || 'editor');
        rec.dev = hello.dev === 'phone' ? 'phone' : 'pc';
        rec.tok = member ? rec.tok : C.signal.b64url(C.signal.randomBytes(16));
        if (pmk) rec.pmk = pmk;
        rec.last = Date.now();
        hostRoom.members[rid] = rec;
        saveRoom(currentPid(), hostRoom);
        /* A member coming back REPLACES its own old link: the phone that locked left a data channel the
           owner still thinks is open, and two endpoints for one person would double every broadcast. */
        const old = ridMid[rid];
        /* ⚠️ …AND ACROSS SESSIONS, THE MID IT HAD LAST TIME (S7 review). `ridMid` is emptied at every arm, so a
           member coming back after a resume or a re-share was minted a fresh mid in arrival order — and a
           comment's author IS its mid, so Alex reconnecting first inherited Sam's comments. The mid is kept
           on the member's own record, and the session is armed past every mid this room has used. */
        let reuse = (member && typeof member.mid === 'string') ? member.mid : null;
        if (old) {
          const ep0 = s._eps && s._eps[old];
          if (ep0) { delete s._eps[old]; ep0.onclose = null; try { ep0.close(); } catch (e) {} }
          if (s.peerIds().indexOf(old) >= 0) s.dropPeer(old);
          reuse = old;
        }
        const mid = s.addPeer(link, { role: rec.role, name: rec.name, color: rec.color, rid: rid, tok: rec.tok, hub: hostRoom.hub, mid: reuse });
        if (!mid) { noteGone(rec.name); return 'gone'; }
        rec.mid = mid;
        noteMidTop(s);
        if (relay && !member) syncMemberRooms(relay);         // their reconnect is recognised from now on
        ridMid[rid] = mid;
        s._eps = s._eps || Object.create(null);
        s._eps[mid] = link;
        link.onclose = function () {
          if (s._eps && s._eps[mid] === link) { delete s._eps[mid]; try { s.dropPeer(mid); } catch (e) {} }
          redrawShare();
          paintRelayLine();
        };
        s.onMessage('ctl', hello, mid);
        (link._buffered || []).forEach(function (m) { try { s.onMessage(m.ch, m.msg, mid); } catch (e) {} });
        link._buffered = null;
        redrawShare();
        paintRelayLine();
        U.syncBanner();
        if (FM.toast) FM.toast(rec.name + (member ? ' is back' : ' joined'), 2400);
        return member ? 'back' : 'in';
      });
    });
  }

  /* "Let in" for somebody who had already gone did nothing and said nothing (S6 review). */
  function noteGone(name) {
    shareNote = (cleanName(name) || 'Someone') + ' stopped waiting before they were let in.';
    if (FM.toast) FM.toast((cleanName(name) || 'Someone') + ' stopped waiting', 2400);
    redrawShare();
  }

  /* ═══ S6 · A WAKE LOCK WHILE HOSTING ON A PHONE (§12.1 step 8) ══════════════════════════════════════
   * The OS releases it whenever the page is hidden, so it is taken again on every return to the screen,
   * and let go the moment the session ends — a lock that outlived its session would keep his screen on
   * for nothing. */
  /* S8 review: …and a phone that is RECEIVING the shared media. A guest's download runs over the same link the
     host's does, and iOS drops it soon after the screen locks — so the footage stopped at the last 4 MiB part
     until he unlocked, under a card that still read "Receiving media · 40%". Held while anything is arriving
     (collab-media.js asks through `syncWake` on every change), let go when the queue drains. */
  function wantWake() {
    const s = C.session;
    if (!s || !isPhoneNow() || !U.labsOn()) return false;
    if (s.isOwner) return true;
    if (s.ended || s.active === false) return false;
    const p = C.media && C.media.pending ? C.media.pending(s) : null;
    return !!(p && p.n > 0);
  }
  U.syncWake = function () {
    if (wantWake()) takeWake();
    else if (wakeLock) dropWake();
  };
  function takeWake() {
    if (!wantWake() || wakeLock || !navigator.wakeLock || document.visibilityState !== 'visible') return;
    let p;
    try { p = navigator.wakeLock.request('screen'); } catch (e) { return; }
    wakeLock = { pending: true };
    p.then(function (l) {
      if (!wantWake()) { wakeLock = null; try { l.release(); } catch (e) {} return; }
      wakeLock = l;
      l.addEventListener('release', function () { if (wakeLock === l) wakeLock = null; });
    }, function () { wakeLock = null; });
  }
  function dropWake() {
    const l = wakeLock;
    wakeLock = null;
    if (l && typeof l.release === 'function') { try { l.release(); } catch (e) {} }
  }
  U._wake = function () { return wakeLock; };

  /* ═══ S6 · FOREGROUND AND ONLINE (§13.5, §12.1 "visible → rendezvous re-start + here") ═════════════
   * Two document listeners, and ONLY while a relay or a reconnect is running (§23: a solo user gets none). */
  function onVisible() {
    if (document.visibilityState !== 'visible') return;
    if (relay && relay.rv) { relay.rv.kick(); relay.hereAt = 0; announce(relay); }
    takeWake();
    if (recon) recon.kick('visible');
    if (joinFlow && joinFlow.kick) joinFlow.kick();
  }
  function onOnlineEv() {
    if (relay && relay.rv) { relay.rv.kick(); relay.hereAt = 0; announce(relay); }
    if (recon) recon.kick('online');
    if (joinFlow && joinFlow.kick) joinFlow.kick();
  }
  function watchDoc() {
    if (docWatch) return;
    docWatch = true;
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnlineEv);
  }
  function unwatchDocIfIdle() {
    if (!docWatch || relay || recon || joinFlow || (C.session && C.session.isOwner)) return;
    docWatch = false;
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnlineEv);
  }

  /* §14.7's [Update now]: the version label's own force-update — flush, drop the worker and the caches,
     come back on a fresh URL — because it is the one update path already proven on his phone. A join
     that was in progress is stashed first, so it resumes on the far side of the reload. */
  /* `pending` is the invite's `j` (a string), or `{c: code}` for a join typed as a short code — which has no
     `j`, and so used to be dropped here, losing the join the reload was meant to resume (S6 review). */
  U.updateNow = function (pending) {
    const p = typeof pending === 'string' ? { j: pending } : (pending && typeof pending === 'object' ? pending : null);
    if (p && (typeof p.j === 'string' || typeof p.c === 'string')) {
      try { localStorage.setItem('fm.pendingJoin', JSON.stringify(Object.assign({}, p, { at: Date.now() }))); } catch (e) {}
    }
    try { if (FM.storage && FM.storage.flushSync) FM.storage.flushSync(); } catch (e) {}
    const v = document.querySelector('.ver');
    if (v) v.click();
  };

  /* §14.5's three steps, in one card: his code out, their code in. */
  function drawCodeStep(body) {
    body.appendChild(el('div', 'cs-steplabel', 'Step 1 · send them this code'));
    const codeBox = el('div', 'cs-code', 'Making a code…');
    codeBox.id = 'collab-offer-code';
    body.appendChild(codeBox);
    const copy = btn('cs-copy', 'Copy code', function () { copyText(codeBox.textContent); });
    copy.disabled = true;
    body.appendChild(copy);

    body.appendChild(el('div', 'cs-steplabel', 'Step 2 · paste the code they send back'));
    const input = el('input', 'fm-ask-input cs-answer');
    input.type = 'text';
    input.spellcheck = false;
    input.autocapitalize = 'characters';
    input.placeholder = 'FM1-…';
    input.setAttribute('aria-label', 'Their code');
    body.appendChild(input);
    const status = el('div', 'cs-status');
    body.appendChild(status);
    const connect = btn('cs-connect accent', 'Connect', function () {
      /* SAY SOMETHING. Returning silently is indistinguishable from a broken button, and this branch
         is reachable: a code that could not be minted leaves no live offer (queue 921 S3 review). */
      if (!offerLink) { status.textContent = 'There is no live code here — go back and start again.'; return; }
      status.textContent = 'Connecting…';
      hostConnect(offerLink, input.value, status);
    });
    body.appendChild(connect);
    body.appendChild(btn('cs-back', '‹ Back', function () {
      /* Backing out of a connect that is IN FLIGHT cancels it. Without this the chain kept running
         against a card nobody can see, writing its status into a detached node. A step he merely
         looked at keeps its link, which is what the note below is about. */
      if (connecting) dropOffer();
      shareStep = 'main';
      redrawShare();
    }));

    /* ⚠️ ONE LINK PER STEP, not one per DRAW. Anything on this card can redraw it — the ask segment, a
       peer joining, a role change — and a version that only reused the link once its code had ARRIVED
       would mint a second RTCPeerConnection for every redraw during the two seconds ICE is gathering,
       each with its own `mk`, so the code he reads out would not be the one the answer is checked
       against. The pending `.then` below looks its box up by id at resolve time, so it fills whichever
       draw is on screen. (queue 921 S3) */
    if (offerLink) {
      if (offerLink._code) { codeBox.textContent = offerLink._code; copy.disabled = false; }
      return;
    }
    let link;
    try { link = C.link.RtcLink({ self: 'host', peer: 'guest' }); }
    catch (e) { codeBox.textContent = 'This browser cannot make a direct connection.'; return; }
    offerLink = link;
    link.createOffer().then(function (code) {
      link._code = code;
      const live = document.getElementById('collab-offer-code');
      if (!live) return;
      live.textContent = code;
      const cp = live.parentNode.querySelector('.cs-copy');
      if (cp) cp.disabled = false;
    }).catch(function (e) {
      const live = document.getElementById('collab-offer-code');
      if (!live) return;
      live.textContent = (e && e.why === 'no-candidates')
        ? 'Could not find a way to connect on this network — try again on Wi-Fi.'
        : 'Could not make a code — close this and try again.';
    });
  }

  function copyText(text) {
    const t = String(text || '');
    if (!t || t.indexOf('FM1') !== 0) return;
    /* Synchronously inside the tap (§19.1): a clipboard write made after an await is refused on iOS. */
    try {
      navigator.clipboard.writeText(t).then(function () { if (FM.toast) FM.toast('Code copied', 1800); },
        function () { if (FM.toast) FM.toast('Could not copy — select the code and copy it', 2600); });
    } catch (e) { if (FM.toast) FM.toast('Could not copy — select the code and copy it', 2600); }
  }

  /* ═══ THE SHORT AUTHENTICATION STRING (§14.6 as built in S3) ════════════════════════════
   * ⚠️ THE FINGERPRINT BINDING DOES NOT COVER THE CODE CHANNEL, AND THIS IS WHAT DOES.
   * The pairing key travels INSIDE the offer code (js/collab-signal.js packs `mk` into every offer), and
   * this card tells him to copy that code into a chat app. So anybody who can rewrite the message he
   * pastes — a compromised chat account, a forwarded thread, an extension — holds the key AND the
   * fingerprint it is meant to authenticate: they can swap in their own certificate, answer him with a
   * second one, and compute both MACs. Both handshakes resolve, both screens say connected, and the
   * whole project flows through them, readable and writable, with no warning anywhere.
   * The one thing they cannot rewrite is the two people. `S.sas` derives five characters from the key
   * and the fingerprints THIS leg is really using, so under a relay his five and theirs differ. He may
   * not admit anybody until he has said they match. It is a gate, not a notice: the promise resolves
   * false and the code is spent. */
  function confirmSas(sas, status) {
    return new Promise(function (resolve) {
      if (!sas) return resolve(false);
      status.textContent = '';
      status.appendChild(el('div', 'cs-steplabel', 'Step 3 \u00b7 check these letters match theirs'));
      status.appendChild(el('div', 'cs-sas', sas));
      status.appendChild(el('div', 'collab-sub', 'Ask them to read out what their screen shows. If it is different, somebody is in the middle \u2014 stop.'));
      const row = el('div', 'cs-sasacts');
      row.appendChild(btn('cs-sasno', 'They don\u2019t match', function () { resolve(false); }));
      row.appendChild(btn('cs-sasyes accent', 'They match', function () { resolve(true); }));
      status.appendChild(row);
    });
  }

  /* The owner's half of §14.5 step 3, and the point at which a stranger becomes a member. */
  function hostConnect(link, answerCode, status) {
    const s = C.session;
    if (!s) { status.textContent = 'Sharing stopped.'; return; }
    connecting = true;
    link.acceptAnswer(answerCode).then(function () {
      status.textContent = 'Connecting\u2026';
      return openedWithin(link);
    }).then(function () {
      status.textContent = 'Checking the code\u2026';
      const me = U.getProfile() || {};
      return C.signal.handshake(link, {
        side: 'host', key: link.mk, sid: hostRoom ? hostRoom.sid : '',
        info: { nm: me.name, cl: me.color },
        fpLocal: link.fpLocal, fpRemote: link.fpRemote
      });
    }).then(function (res) {
      /* ⚠️ BIND THE HELLO HANDLER BEFORE THE GATE, NOT AFTER. The guest says hello the instant its own
         handshake resolves, and the gate below is a person reading five letters down a phone line — so
         a version that waited for the tap first would have nothing listening for the seconds in between
         and would lose the hello entirely. `awaitHello` starts its own clock here, which is right: the
         hello is a machine's answer and arrives in milliseconds. */
      const wait = awaitHello(link);
      return confirmSas(res && res.sas, status).then(function (yes) {
        if (!yes) return Promise.reject({ why: 'sas' });
        status.textContent = 'Waiting for them\u2026';
        return wait;
      });
    }).then(function (hello) {
      return maybeKnock(hello).then(function (allowed) {
        if (!allowed) return Promise.reject({ why: 'denied' });
        const role = (hostRoom && hostRoom.settings.linkRole) || 'editor';
        /* ⚠️ AND THE FAR END MAY HAVE GONE WHILE THE KNOCK SAT THERE (queue 921 S3 review). `addPeer`
           refuses a closed endpoint and answers null; admitting one anyway put a person in his people
           list who was never there and whose row could never clear itself. */
        const mid = s.addPeer(link, { role: role, name: cleanName(hello.name), color: cleanColor(hello.color) || PALETTE[0] });
        if (!mid) return Promise.reject({ why: 'gone' });
        noteMidTop(s);
        s._eps = s._eps || Object.create(null);
        s._eps[mid] = link;
        link.onclose = function () { try { s.dropPeer(mid); } catch (e) {} redrawShare(); };
        /* Replay the hello that started all this, now that the member exists — the host answers it with
           the welcome and the snapshot, exactly as it would any other. */
        s.onMessage('ctl', hello, mid);
        (link._buffered || []).forEach(function (m) { try { s.onMessage(m.ch, m.msg, mid); } catch (e) {} });
        link._buffered = null;
        offerLink = null;
        connecting = false;
        shareStep = 'main';
        redrawShare();
        U.syncBanner();
        if (FM.toast) FM.toast((cleanName(hello.name) || 'They') + ' joined', 2400);
      });
    }).catch(function (e) {
      connecting = false;
      const why = (e && e.why) || '';
      /* ⚠️ A DENIED OR SPENT CODE MUST NOT STAY ON THE CARD (queue 921 S3 review). The deny branch used
         to `return` normally, so the `.catch` that clears `offerLink` never ran: the SAME dead code
         stayed on screen for ever, every answer he pasted failed inside `setRemoteDescription` on a
         closed connection and came back as "that code did not read" — which is a lie — and ‹ Back and
         "Add someone with a code" handed the identical dead code straight back. The only escapes were
         Stop sharing and turning Labs off. Note that a MISTAP is not needed: the knock's own two-minute
         auto-decline enters here, so putting the phone down burned the code.
         A MISREAD ANSWER is the one retryable case — `acceptAnswer` leaves the connection in
         have-local-offer, so the code he read out is still good and he can just paste again. */
      if (why === 'bad-code') { status.textContent = codeError(e); return; }
      if (why === 'denied' || why === 'sas') {
        try { link.send('ctl', { t: 'refused', why: 'denied' }); } catch (x) {}
        shareNote = why === 'sas'
          ? 'Stopped \u2014 those letters did not match. That code is used up; add them again for a fresh one.'
          : 'Not let in. That code is used up \u2014 add them again for a fresh one.';
        if (offerLink === link) dropOffer(250);
        else setTimeout(function () { try { link.close(); } catch (x) {} }, 250);
        redrawShare();
        return;
      }
      shareNote = why === 'gone' ? 'They gave up waiting \u2014 that code is used up. Add them again for a fresh one.' : codeError(e);
      if (offerLink === link) dropOffer();
      else { try { link.close(); } catch (x) {} }
      redrawShare();
    });
  }

  function codeError(e) {
    const why = (e && e.why) || '';
    if (why === 'bad-code') return 'That code did not read — check you pasted all of it.';
    if (why === 'auth') return 'That code is for a different session.';
    if (why === 'no-candidates') return 'That code has no way to connect on this network — ask for a fresh one on Wi-Fi.';
    if (why === 'flood') return 'That device sent a flood of data before saying hello, so it was dropped.';
    if (why === 'timeout') return 'They did not answer — try a fresh code.';
    return 'Could not connect — try a fresh code.';
  }

  /* Hold `ctl` until the guest says hello, keeping anything else that arrives so the session can have it
     the moment it owns the link.

     ⚠️ WITH A CEILING, BECAUSE THE PEER IS NOT ADMITTED YET (queue 921 S3 review, §14.9). This handler
     ran for the full ICE_CONNECT window with no length cap, no byte accounting and no rate limit, on ALL
     THREE channels — so a peer that passed the handshake and then simply never said hello could stream
     `bulk` at line rate and have every message RETAINED. `MAX_REASSEMBLE.bulk` allows 64 MB per message,
     so that is hundreds of megabytes of held ArrayBuffers on a LAN, and the tab is dead before he has
     even been asked whether to let this person in. The host's own token bucket cannot see this queue —
     it lives behind `H.receive`, i.e. after `addPeer`. RtcLink caps reassembly per message for exactly
     this reason; this layer re-opened the same hole one level up, per message.
     Two rules. Nothing but `ctl` is kept at all — `C.join` filters the same way on the other side, and
     nothing above the link consumes `pres` or `bulk` in S3 (collab-session.js: `if (ch !== 'ctl') return`).
     And what IS kept is bounded; past the bound the link is dropped rather than trimmed, because a peer
     doing this is not one to admit. */
  const HELLO_MAX_MSGS = 32, HELLO_MAX_BYTES = 256 * 1024;
  function awaitHello(link) {
    return new Promise(function (resolve, reject) {
      const buf = [];
      let bytes = 0;
      const timer = setTimeout(function () { link.onmessage = null; link._buffered = null; reject({ why: 'timeout' }); },
        (C.LIMITS && C.LIMITS.ICE_CONNECT) || 20000);
      link._buffered = buf;
      link.onmessage = function (ch, msg) {
        if (ch !== 'ctl' || !msg) return;
        if (msg.t === 'hello') {
          clearTimeout(timer);
          link.onmessage = null;
          resolve(msg);
          return;
        }
        let n;
        if (typeof msg === 'object' && typeof msg.byteLength === 'number') n = msg.byteLength;
        else { try { n = JSON.stringify(msg).length; } catch (e) { n = HELLO_MAX_BYTES + 1; } }
        bytes += n;
        if (buf.length >= HELLO_MAX_MSGS || bytes > HELLO_MAX_BYTES) {
          clearTimeout(timer);
          link.onmessage = null;
          buf.length = 0;
          link._buffered = null;
          try { link.close(); } catch (e) {}
          reject({ why: 'flood' });
          return;
        }
        buf.push({ ch: ch, msg: msg });
      };
      /* S6: whatever the handshake kept because it arrived while the host was still finishing (see
         `sentAuth3` in collab-signal.js) goes through the same rules, first, in order. */
      const early = link._early;
      link._early = null;
      if (early) for (let i = 0; i < early.length && typeof link.onmessage === 'function'; i++) link.onmessage(early[i].ch, early[i].msg);
    });
  }
  U._helloCap = function () { return { msgs: HELLO_MAX_MSGS, bytes: HELLO_MAX_BYTES }; };

  /* 📐 A CONNECTION CODE NEVER KNOCKS (S6). §14.5: "the host pasting the answer counts as admitting the
     guest: no knock" — and since S3 he has also read the five letters and pressed They match. S3 let the
     `ask` switch add a knock on top because `ask` defaulted to false and so never did; S6 makes `ask`
     true for the invite LINK (D5), and leaving this wired to it would have put a third "are you sure"
     after the two deliberate steps he had just taken, on every code join. The switch is the link's and
     the room code's; the knock for those is in `admitRelay`. */
  function maybeKnock(hello) {
    return Promise.resolve(true);
  }

  function followBtn(f, pz) {
    const t = pz.following ? 'Following' : 'Follow';
    if (f.textContent !== t) f.textContent = t;
    f.setAttribute('aria-pressed', pz.following ? 'true' : 'false');
    f.setAttribute('aria-label', (pz.following ? 'Stop following ' : 'Follow ') + (cleanName(pz.name) || 'them'));
  }
  /* Presence calls this whenever what the people panels show would change (S5 review: they were
     snapshots). The rows are brought up to date IN PLACE — a whole redraw would replace the button under
     a finger that is half-way through tapping it. Only a guest's list changing membership is redrawn:
     that list IS presence's, whereas the owner's comes from the member table, which the join and leave
     paths already redraw. */
  U.onPeople = function () {
    U.friendsBar();                                  // queue 945: the Friends bar's faces and count follow the room
    const root = panelRoot();
    if (!root) return;
    const s = C.session;
    if (!s) return;
    const list = (C.presence && C.presence.people) ? C.presence.people() : [];
    const byMid = Object.create(null);
    list.forEach(function (pz) { byMid[pz.mid] = pz; });
    const rows = Array.prototype.slice.call(root.querySelectorAll('.cs-person[data-mid]'));
    if (!s.isOwner) {
      const shown = rows.map(function (r) { return r.getAttribute('data-mid'); }).join();
      if (shown !== list.map(function (pz) { return pz.mid; }).join()) { drawGuestPanel(s, root === card ? undefined : root); return; }
    }
    rows.forEach(function (li) {
      const pz = byMid[li.getAttribute('data-mid')];
      if (!pz) return;
      const role = li.getAttribute('data-role');
      const line = li.querySelector('.cs-prole');
      const t = statusLine(role, pz);
      if (line && line.textContent !== t) line.textContent = t;
      li.classList.toggle('cs-away', pz.st !== 'here');
      const dot = li.querySelector('.cs-dot');
      if (dot) dot.style.background = dotColor(pz, null);
      const f = li.querySelector('.cs-follow');
      if (f) followBtn(f, pz);
    });
  };

  /* The guest's own view of the same card (§19.1 "Guest panel"). */
  function drawGuestPanel(s, host) {
    const c = host ? mountHost(host) : openCard('collab-share', { label: 'This shared project' });
    const head = el('div', 'cs-head');
    head.appendChild(el('h2', 'fm-ask-title', 'Shared with you'));
    head.appendChild(el('div', 'cs-state', s.ended ? 'Ended — your copy stays on this device'
      : s.online === false ? 'Offline — the live link dropped; your changes are kept here' : 'Live'));
    head.appendChild(el('div', 'collab-sub cs-myrole', 'You’re ' + (s.role === 'viewer' ? 'a Viewer' : s.role === 'commenter' ? 'a Commenter' : 'an Editor') + '.'));
    c.appendChild(head);
    const body = el('div', 'cs-body');
    c.appendChild(body);
    const rs = s.roomSettings || {};
    const ro = !s.ended && (s.role === 'viewer' || s.role === 'commenter');
    /* S7: what the role means, in words — and D11's export switch, said where the person will look for it. */
    if (ro) {
      body.appendChild(el('div', 'collab-sub cs-rolehint', (s.role === 'viewer'
        ? 'You can watch, play and follow along. '
        : 'You can read and add comments, and change or delete your own. ') +
        (rs.roExport === false ? 'Exporting is turned off for viewers and commenters in this project.' : 'You can export a video of it on this device.')));
    }
    /* S5 (§19.1 "Guest panel"): who else is in, read-only, each with Follow. The names come from the
       host's roster via presence, so this is the same list the owner sees, in the same colours. */
    if (C.presence && C.presence.people) {
      const list = el('ul', 'cs-people');
      C.presence.people().forEach(function (pz) {
        const li = personRow(pz.name, pz.color, pz.role === 'owner' ? 'owner' : pz.role, null, null, pz);
        li.setAttribute('data-mid', pz.mid);
        /* The button reads the state when it is PRESSED, not when it was drawn: the row is kept up to
           date in place (U.onPeople), so what it was drawn with may be minutes old. */
        const f = btn('cs-role cs-follow', '', function () {
          if (C.presence.following() === pz.mid) { C.presence.unfollow(); U.onPeople(); }
          else startFollow(pz.mid, pz.name);
        });
        followBtn(f, pz);
        li.appendChild(f);
        list.appendChild(li);
      });
      if (list.children.length) body.appendChild(list);
    }
    /* S7 (§17.1): the comments, from the guest's side too. */
    if (C.comments && C.comments.installed && C.comments.installed()) body.appendChild(commentsRow());
    /* S7 (§16.1 "See link and code: Editor only if editorsInvite"): the LINK, and only the link.
       📐 NOT THE SHORT CODE. The owner listens on the code's topic only while the code is FRESH — half an
       hour after it was last on HIS screen (S6 review, CODE_TTL) — and he cannot know when an Editor's
       screen shows it, so a code shown here could be one nobody is listening for any more, and the person
       it was read to would wait on a dead door. The link never lapses. */
    if (!s.ended && s.role === 'editor' && rs.editorsInvite && typeof rs.link === 'string') {
      const box = el('div', 'cs-invite cs-guestinvite');
      box.appendChild(el('div', 'cs-rowlabel', 'Invite someone'));
      const row = el('div', 'cs-linkrow');
      const gl = btn('cs-copylink accent', 'Copy link', function () { copyPlain(rs.link, 'Link copied', gl); });
      row.appendChild(gl);
      if (navigator.share) {
        row.appendChild(btn('cs-sharelink', 'Share…', function () {
          try { navigator.share({ title: 'Join “' + projectName() + '” in FreeMotion', url: rs.link }).catch(function () {}); } catch (e) {}
        }));
      }
      const qrBtn = btn('cs-qrbtn', 'QR', function () { toggleQr(box, rs.link, qrBtn); });
      qrBtn.setAttribute('aria-pressed', 'false');
      qrBtn.setAttribute('aria-label', 'Show a QR code of the link');
      row.appendChild(qrBtn);
      box.appendChild(row);
      /* Only when it is true (S7 review): with the link set to "Let them in" nobody is asked. */
      box.appendChild(el('div', 'cs-relay', rs.ask === false
        ? 'Whoever you give the link to gets straight in, as ' + (rs.linkRole === 'viewer' ? 'a Viewer' : rs.linkRole === 'commenter' ? 'a Commenter' : 'an Editor') + '.'
        : (s.hostName || 'The owner') + ' still says yes to each new person.'));
      body.appendChild(box);
    }
    const foot = el('div', 'cs-foot');
    foot.appendChild(btn('cs-stop', 'Leave', function () {
      /* ⚠️ IT SAID "or delete it from this device" AND HAD NO DELETE BUTTON (queue 921 S3 review).
         `FM.ask` builds exactly two buttons, and `C.leave({keep:false})` — the delete branch — has no
         caller anywhere in the app. Offering a choice the dialog cannot express is worse than not
         offering it, so the sentence now describes what the two buttons do. §12.3's [Delete] arrives
         with the third-button ask, not before it. */
      /* S8 review: clips still on their way are blank in the copy he keeps — said before he goes, not after. */
      const pend = C.media && C.media.pending ? C.media.pending(s) : null;
      const blank = pend ? (pend.n || 0) + (pend.skipped || 0) : 0;
      FM.ask({ title: 'Leave this project?', message: 'You stop getting their changes. Your copy stays on this device — you can delete it from Home if you want.'
        + (blank ? ' ' + (blank === 1 ? '1 clip has' : blank + ' clips have') + ' not arrived yet and will be blank in your copy.' : ''), ok: 'Keep my own copy', cancel: 'Cancel' })
        .then(function (yes) {
          if (!yes) return;
          if (host) closeAny(); else closeCard();
          return leaveKeeping(s);
        });
    }));
    foot.appendChild(btn('cs-done accent', 'Done', function () { if (host) closeAny(); else closeCard(); }));
    c.appendChild(foot);
    return c;
  }

  /* ⚠️ S8 review: LEAVE SAYS WHAT HAPPENED, AND LOOKS FOR ROOM FIRST. It used to fire `C.leave` and forget it: a
     copy that failed on a full phone (keeping the copy writes every clip a second time) said nothing, left the
     session stopped and the project still linked — and the next open reconnected him. A copy that worked said
     nothing either, while seconds of media were copied under the screen. So: the room is checked BEFORE the
     session is let go (§12.3 step 1) — if the clips will not fit twice, he chooses between deleting the copy
     and staying in; the copy runs under a "Leaving…" line; and the result is said either way. */
  function leaveKeeping(s) {
    const gpid = s && s.gpid;
    return copyRoom(gpid).then(function (fits) {
      if (fits === false) {
        return FM.ask({ title: 'Not enough room to keep a copy', danger: true, ok: 'Delete it instead', cancel: 'Stay in the session',
          message: 'Keeping this project as your own copies every clip in it, and this device does not have room for that. You can leave and delete the copy, or stay in the session.' })
          .then(function (del) {
            if (!del) return null;
            return C.leave({ keep: false }).then(function () { U.syncBanner(); if (FM.toast) FM.toast('You left — the copy was deleted from this device', 2600); return null; });
          });
      }
      if (FM.toast) FM.toast('Leaving… copying your clips', 0);
      return C.leave({ keep: true }).then(function (nid) { return nid; }, function () { return null; }).then(function (nid) {
        U.syncBanner();
        if (nid) { if (FM.toast) FM.toast('You left — this is now your own copy', 2600); return nid; }
        if (FM.hideToast) FM.hideToast();
        FM.ask({ title: 'Your copy could not be made your own', ok: 'OK', single: true,
          message: 'You have left the live session, but this device could not finish copying the project — it may be full. The copy stays as it is and will not reconnect; free some space and open it to try again, or delete it from Home.' });
        return null;
      });
    });
  }
  /* Is there room for a second copy of every clip in this project? true / false, or null when the browser will
     not say (then the copy is simply tried, and its own rollback answers). */
  function copyRoom(gpid) {
    let need = 0;
    try {
      ((FM.scene && FM.scene.layers) || []).forEach(function (l) {
        const r = l && FM.media.get(l.id);
        if (r && r.file && r.file.size) need += r.file.size;
      });
    } catch (e) {}
    if (!need || !navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
    return navigator.storage.estimate().then(function (q) {
      if (!q || typeof q.quota !== 'number') return null;
      let free = Math.max(0, q.quota - (q.usage || 0));
      if (U._freeOverride != null) free = U._freeOverride;      // suite seam: a full device on demand, as media's
      return need <= free;
    }, function () { return null; });
  }
  U._freeOverride = null;

  /* A shared copy that has no session right now — reopened, and finding its owner, or with nothing to
     find it through (S6 review). The same card a guest gets, saying what is true, and a Leave that works
     without a session: the copy becomes his own, exactly as Leave does in a session. */
  function drawLinkedPanel(pc, host) {
    const pid = pc.id;
    const who = hostNameFor(pid);
    const c = host ? mountHost(host) : openCard('collab-share', { label: 'This shared project' });
    c.appendChild(el('h2', 'fm-ask-title', 'Shared with you'));
    const looking = recon && !recon.stopped && recon.gpid === pid;
    /* ⚠️ S8 review: "SENT WHEN YOU'RE BACK IN TOUCH" IS ONLY TRUE OF A COPY THAT CAN GET BACK IN TOUCH. One that
       joined with a connection code was given no member token (there was no room to find), so it never
       reconnects — and a new code comes in through "Keep mine, join fresh / Replace my copy", neither of
       which sends anything kept here. It says what is true instead. */
    const findable = !!reconTarget(pc);
    const ended = pc.collab && pc.collab.ended;
    c.appendChild(el('div', 'cs-state', ended ? (ended === 'left' ? 'Not connected — you have left this live session'
        : ended === 'removed' ? 'Not connected — ' + who + ' removed you from this project' : 'Not connected — ' + who + ' stopped sharing')
      : looking ? 'Reconnecting to ' + who + '…'
      : !findable ? 'Not connected — this copy joined with a code, so it can’t find ' + who + ' by itself'
      : C.signal.codesOnly() ? 'Not connected — Codes only is on, so this copy can’t find ' + who + ' by itself'
        : 'Not connected — ' + who + '’s device isn’t reachable right now'));
    c.appendChild(el('div', 'collab-sub', ended
      ? 'This copy could not be made your own yet — the device may be full. It will not reconnect; Leave tries again.'
      : findable ? 'This is ' + who + '’s project. Your changes are kept on this device and sent when you’re back in touch.'
        : 'This is ' + who + '’s project. To get back in, ask ' + who + ' for a new code — joining again starts from ' + who + '’s copy, and what you changed here stays in this one.'));
    const foot = el('div', 'cs-foot');
    foot.appendChild(btn('cs-stop', 'Leave', function () {
      FM.ask({ title: 'Leave this project?', message: 'You stop getting their changes. Your copy stays on this device as a project of your own.', ok: 'Keep my own copy', cancel: 'Cancel' })
        .then(function (yes) {
          if (!yes) return;
          if (recon && recon.gpid === pid) stopRecon();
          if (host) closeAny(); else closeCard();
          if (!FM.projects || !FM.projects.detachLinked) return;
          /* S8 review: marked left FIRST, so a copy that cannot be finished (a full device) is still never dialled
             again — and the result is said either way. */
          try { if (FM.projects.patchCollab) FM.projects.patchCollab(pid, { ended: 'left' }); } catch (e) {}
          joinBusy++;
          FM.projects.detachLinked(pid).then(function (nid) { return nid; }, function () { return null; }).then(function (nid) {
            joinBusy = Math.max(0, joinBusy - 1); U.syncBanner();
            if (nid) { if (FM.toast) FM.toast('You left — this is now your own copy', 2600); return; }
            FM.ask({ title: 'Your copy could not be made your own', ok: 'OK', single: true,
              message: 'This device could not finish copying the project — it may be full. The copy stays as it is and will not reconnect; free some space and open it to try again, or delete it from Home.' });
          });
        });
    }));
    foot.appendChild(btn('cs-done accent', 'Done', function () { if (host) closeAny(); else closeCard(); }));
    c.appendChild(foot);
    return c;
  }

  /* ═══ 3. THE JOIN SHEET (§19.2) ═══════════════════════════════════════════════════════════════ */

  const STEPS = ['Reading the code…', 'Connecting…', 'Checking the code…',
    'Waiting for them to let you in…', 'Downloading the project…'];
  let joinLink = null;             // the RtcLink a join in flight is using

  U.join = function () {
    if (!U.labsOn()) return Promise.resolve(null);
    return U.profile().then(function (p) {
      if (!p) return null;
      return drawJoin(p);
    });
  };

  function drawJoin(profile, opts) {
    const jo = opts || {};
    const c = openCard('collab-join', { label: 'Join a live project' });
    /* ⚠️ CLOSING THE SHEET REALLY DOES CANCEL. Without this, tapping the scrim halfway through a join
       leaves an RTCPeerConnection gathering and a handshake waiting on a card nobody can see — and if it
       then succeeded it would open a project he had just backed out of. S6: the relay join too — its
       rendezvous, its retry timer and the attempt in flight. */
    c._onclose = function () {
      /* S8: the camera light goes off with the sheet, whatever state the scanner was in. */
      if (c._scan) { try { c._scan.stop(); } catch (e) {} c._scan = null; }
      if (joinLink) { try { joinLink.close(); } catch (e) {} joinLink = null; }
      if (joinFlow && joinFlow.cancel) joinFlow.cancel();
      /* §12.4: a pending invite is spent "on use" — joined, or looked at and put away. */
      if (jo.fromPending) clearPendingJoin();
    };
    c.appendChild(el('h2', 'fm-ask-title', 'Join a live project'));
    const jb = bodyOf(c);
    /* S8 review: a browser that has no way to read a QR code — Safari on the iPhone, until jsQR's hash is
       pinned — gets no [Scan QR] (a control that can only ever refuse) and is told what does work. */
    const canScan = !C.signal.codesOnly() && !!(C.qr && C.qr.reader && (!C.qr.canRead || C.qr.canRead()));
    jb.appendChild(el('div', 'collab-sub', C.signal.codesOnly()
      ? 'Codes only is on: ask them to tap Share → Add someone with a code, then paste the code they send you.'
      : 'Paste the invite link they sent, or type the short code they read out. A long code from “Connect with a code” works here too.'
        + (canScan ? '' : ' To use their QR code, point your camera app at it.')));
    const fieldRow = el('div', 'cj-fieldrow');
    const input = el('input', 'fm-ask-input cj-code');
    input.type = 'text';
    input.spellcheck = false;
    input.autocapitalize = 'characters';
    input.placeholder = C.signal.codesOnly() ? 'Paste a code' : 'Link or code';
    input.setAttribute('aria-label', C.signal.codesOnly() ? 'Paste a code' : 'Invite link or code');
    if (jo.prefill) input.value = jo.prefill;
    fieldRow.appendChild(input);
    fieldRow.appendChild(btn('cj-paste', 'Paste', function () {
      /* Inside the tap, like §19.1's Copy — a clipboard read after an await is refused. */
      try {
        navigator.clipboard.readText().then(function (t) { input.value = t; }, function () {
          status.textContent = 'Paste it into the box yourself — this browser will not hand it over.';   // S8 review: in the sheet, not under it
          try { input.focus(); } catch (e) {}
        });
      } catch (e) { status.textContent = 'Paste it into the box yourself.'; }
    }));
    /* S8 (§19.2): [Scan QR] — the camera reads the code on the other person's screen straight into the field.
       Not under Codes only: the only QR this app draws is an invite LINK, and a link cannot connect there. */
    let scan = null;
    if (canScan) {
      const sb = btn('cj-scan', null, function () { if (scan) { scan.stop(); scan = null; return; } scan = openScanner(c, input, status, go, sb, function () { scan = null; }); });
      sb.setAttribute('aria-label', 'Scan a QR code');
      sb.title = 'Scan a QR code';
      sb.appendChild(scanIcon());
      fieldRow.appendChild(sb);
    }
    jb.appendChild(fieldRow);
    /* 📐 ONE LINE THAT REPLACES ITSELF, picked over a five-step checklist (the second drawn option,
       kept as join-stacked-*.png). Listing all five up front answers "how long will this take" and
       costs something worse: it presents five things that have not happened as a set of instructions,
       on the one screen where the person is already being asked to do something unfamiliar. */
    const status = el('div', 'cj-status');
    jb.appendChild(status);
    const back = el('div', 'cj-back hidden');
    const backCode = el('div', 'cs-code');
    back.appendChild(el('div', 'cs-steplabel', 'Read this back to them'));
    back.appendChild(backCode);
    back.appendChild(btn('cs-copy', 'Copy code', function () { copyText(backCode.textContent); }));
    jb.appendChild(back);
    /* §14.6's short authentication string. It is HIS half of the check the owner is making: the key
       rode inside the code, so only the two people can tell a relay from a friend. */
    const sasBox = el('div', 'cj-sas hidden');
    jb.appendChild(sasBox);
    const acts = el('div', 'fm-ask-actions');
    acts.appendChild(btn('fm-ask-cancel', 'Cancel', function () { closeCard(); }));
    const go = btn('fm-ask-ok accent cj-go', 'Join', function () {
      go.disabled = true;
      joinAny(input.value, profile, status, back, backCode, go, sasBox);
    });
    acts.appendChild(go);
    c.appendChild(acts);
    /* ⚠️ AN INVITE IN THE ADDRESS BAR IS NOT A TAP (S6 review). It used to start joining by itself —
       "tapping the link WAS the request" — but any page can send the browser to a `#j=` address, and then
       this device told a stranger's room its name, colour and profile key and took their project, with
       nobody having touched anything in FreeMotion. So the sheet is filled in and waits for ONE tap. */
    if (jo.prefill && jo.fromPending) {
      status.textContent = 'Tap Join to connect to this project.';
      try { go.focus(); } catch (e) {}
    } else input.focus();
    return c;
  }

  /* ═══ S8 · THE QR SCANNER (§19.2 [Scan QR]) ═══════════════════════════════════════════════════════════
   * The back camera in a box under the field, read a few times a second by `C.qr.reader()` — the browser's
   * BarcodeDetector where there is one, jsQR from the CDN (loaded at THIS tap and never before) where there is
   * not. What it finds goes INTO THE FIELD and waits for Join, exactly like a pending link (S6 review: an
   * invite that arrives by itself is not a tap — anybody can hold up a QR code). A code that is not an invite
   * says so and keeps looking. The camera stops the moment it finds one, on [Scan QR] again, on Cancel and on
   * the sheet closing — a light left on is the one thing a camera feature must never do.
   * `U._camera` is the seam the suite uses to stand in for a lens (a canvas stream showing the app's own code). */
  U._camera = function () {
    const md = navigator.mediaDevices;
    if (!md || typeof md.getUserMedia !== 'function') return Promise.reject({ why: 'no-camera' });
    return md.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  };
  function scanIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const sv = document.createElementNS(ns, 'svg');
    sv.setAttribute('viewBox', '0 0 24 24'); sv.setAttribute('width', '22'); sv.setAttribute('height', '22'); sv.setAttribute('aria-hidden', 'true');
    ['M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9', 'M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9', 'M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15', 'M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15', 'M7 12h10'].forEach(function (d) {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', '2'); p.setAttribute('stroke-linecap', 'round');
      sv.appendChild(p);
    });
    return sv;
  }
  function openScanner(card, input, status, go, button, onEnd) {
    const box = el('div', 'cj-scanner');
    const vid = el('video', 'cj-scanvid');
    vid.setAttribute('playsinline', ''); vid.muted = true; vid.autoplay = true;
    vid.setAttribute('aria-label', 'Camera view');
    const frame = el('div', 'cj-scanframe');
    box.appendChild(vid); box.appendChild(frame);
    const line = el('div', 'cj-scanline', 'Starting the camera…');
    box.appendChild(line);
    const row = card.querySelector('.cj-fieldrow');
    if (row && row.parentNode) row.parentNode.insertBefore(box, row.nextSibling); else card.appendChild(box);
    button.classList.add('on');
    button.setAttribute('aria-pressed', 'true');
    let stream = null, timer = null, stopped = false, reader = null, lastWrong = 0;
    const api = {
      stop: function () {
        if (stopped) return;
        stopped = true;
        clearTimeout(timer);
        if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} }
        try { vid.srcObject = null; } catch (e) {}
        if (box.parentNode) box.parentNode.removeChild(box);
        button.classList.remove('on');
        button.setAttribute('aria-pressed', 'false');
        if (card._scan === api) card._scan = null;
        if (onEnd) onEnd();
      },
      _stream: function () { return stream; }, _reader: function () { return reader; }
    };
    card._scan = api;
    function fail(text) {
      api.stop();
      status.textContent = text;
    }
    function tick() {
      if (stopped) return;
      Promise.resolve(vid.readyState >= 2 ? reader.read(vid) : null).then(function (text) {
        if (stopped) return;
        if (text != null) {
          const k = C.signal.classify(text);
          if (k && (k.kind === 'link' || k.kind === 'code')) {
            input.value = String(text).trim();
            api.stop();
            status.textContent = 'Found an invite — tap Join to connect.';
            go.disabled = false;
            try { go.focus(); } catch (e) {}
            return;
          }
          const t = Date.now();
          if (t - lastWrong > 2500) { lastWrong = t; line.textContent = 'That QR code isn’t a FreeMotion invite — keep looking.'; }
        }
        timer = setTimeout(tick, 220);
      });
    }
    /* The READER first, then the camera: a browser that cannot read a code is never asked for the camera (no
       permission prompt for nothing), and a camera is never started that a failed reader would then leave on —
       which is what the first version did (S8 security pass: the stream had arrived, the reader had not, and the
       error path had no stream to stop). */
    C.qr.reader().then(function (r) {
      if (stopped) return null;
      reader = r;
      line.textContent = 'Starting the camera…';
      return U._camera();
    }).then(function (st) {
      if (!st) return;
      if (stopped) { try { st.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} return; }
      stream = st;
      vid.srcObject = stream;
      const pl = vid.play && vid.play();
      if (pl && pl.catch) pl.catch(function () {});
      line.textContent = 'Point the camera at the QR code on their screen.';
      tick();
    }, function (e) {
      if (stopped) return;
      const why = e && (e.why || e.name);
      if (why === 'NotAllowedError' || why === 'SecurityError') fail('The camera is turned off for FreeMotion — allow it in your browser’s settings, or paste the link instead.');
      else if (why === 'no-camera' || why === 'NotFoundError' || why === 'OverconstrainedError') fail('This device has no camera FreeMotion can use — paste the link instead.');
      else if (e instanceof Error && /not pinned/.test(e.message)) fail('This browser can’t read QR codes here yet — open the link with your camera app, or paste it instead.');
      else if (e instanceof Error && /jsQR/.test(e.message)) fail('The QR reader could not be downloaded — check the connection, or paste the link instead.');
      else fail('The camera could not start — paste the link instead.');
    });
    return api;
  }

  /* ═══ S8 · SETTINGS → LABS → "TEST CONNECTION" (§25.5, §22) ═══════════════════════════════════════════
   * Three questions, each answered in a sentence a person can act on, and the numbers behind them written into
   * a report he can copy (§25.5: candidate types, SDP size, maxMessageSize and throughput):
   *   · Can this network reach the free connection services? — every relay driver the join path uses, tried at
   *     once on a throwaway room, for §22's eight seconds. Up → invite links and short codes work here.
   *   · Can this device learn its public address? — one peer connection gathering against the two STUN servers
   *     for §21's gather cap. A server-reflexive candidate means devices on other networks can usually connect.
   *   · Does this device's WebRTC work at all, and how fast? — two real connections to each other, through the
   *     same connection-code codec a join uses, and a 2 MB message timed across them.
   * ⚠️ NOTHING HERE RUNS UNTIL THE BUTTON IS TAPPED (§23: no sockets, no peer connections until he asks), and it
   * obeys every rule a session obeys: Codes only means no relay and no STUN at all, and a loopback page is not
   * allowed out (relayGate). The throwaway room's keys are thrown away — nothing is announced to anybody. */
  const RELAY_NAMES = { pjs: 'PeerJS', mqtt1: 'EMQX', mqtt2: 'HiveMQ' };
  U._connOpts = null;      // suite seam: shorter waits and a stand-in STUN peer connection; nothing in the app sets it
  U.testConnection = function (opts) {
    const o = Object.assign({}, U._connOpts || {}, opts || {});
    const LIM = C.LIMITS || {};
    const S = C.signal;
    const out = { at: new Date().toISOString(), relays: [], relayGate: null, stun: null, direct: null };
    const relayP = new Promise(function (resolve) {
      const gate = S.relayGate();
      if (!gate.ok) { out.relayGate = gate.why; resolve(); return; }
      S.linkKeys(S.newRoom()).then(function (keys) {
        const t0 = Date.now();
        const upAt = Object.create(null);
        const rv = S.Rendezvous({ role: 'guest', rooms: [{ kind: 'link', keys: keys }] });
        const wait = o.relayWait || LIM.RELAY_UP || 8000;
        let done = false;
        function finish() {
          if (done) return;
          done = true;
          clearInterval(poll);
          const st = rv.state();
          out.relays = st.drivers.map(function (d) { return { name: d.name, label: RELAY_NAMES[d.name] || d.name, up: d.state === 'up', ms: upAt[d.name] == null ? null : upAt[d.name], why: d.state === 'up' ? null : (d.why || (d.state === 'connecting' ? 'timeout' : d.state)) }; });
          try { rv.stop(); } catch (e) {}
          resolve();
        }
        const poll = setInterval(function () {
          const st = rv.state();
          st.drivers.forEach(function (d) { if (d.state === 'up' && upAt[d.name] == null) upAt[d.name] = Date.now() - t0; });
          if (st.drivers.every(function (d) { return d.state === 'up'; }) || Date.now() - t0 >= wait) finish();
        }, 100);
        rv.start();
      }, function () { out.relayGate = 'crypto'; resolve(); });
    });
    const stunP = new Promise(function (resolve) {
      /* Codes only wins over everything, the suite's stand-in included: it is a promise about third parties. */
      const servers = S.codesOnly() ? [] : (o.iceServers || S.iceServers());
      if (!servers.length) {
        out.stun = { skipped: S.codesOnly() ? 'codes-only' : ((function () { try { return navigator.onLine === false; } catch (e) { return false; } })() ? 'offline' : 'not-allowed') };
        resolve(); return;
      }
      const PC = o.stunPC || window.RTCPeerConnection;
      let pc = null;
      try { pc = new PC({ iceServers: servers }); } catch (e) { out.stun = { error: String(e && e.message || e) }; resolve(); return; }
      const types = Object.create(null);
      let n = 0, finished = false;
      function done() {
        if (finished) return;
        finished = true;
        clearTimeout(t);
        out.stun = { types: Object.assign({}, types), n: n, srflx: !!types.srflx, servers: servers.map(function (x) { return x.urls; }) };
        try { pc.close(); } catch (e) {}
        resolve();
      }
      pc.onicecandidate = function (e) {
        if (!e || !e.candidate) { done(); return; }
        const m = / typ ([a-z]+)/.exec(e.candidate.candidate || '');
        const k = m ? m[1] : 'other';
        types[k] = (types[k] || 0) + 1; n++;
      };
      pc.onicegatheringstatechange = function () { if (pc.iceGatheringState === 'complete') done(); };
      const t = setTimeout(done, o.stunWait || Math.max(LIM.ICE_GATHER || 3000, 4000));
      try { pc.createDataChannel('probe'); } catch (e) {}
      pc.createOffer().then(function (d) { return pc.setLocalDescription(d); }).catch(function (e) { out.stun = { error: String(e && e.message || e) }; finished = true; clearTimeout(t); try { pc.close(); } catch (x) {} resolve(); });
    });
    const directP = new Promise(function (resolve) {
      if (typeof RTCPeerConnection === 'undefined') { out.direct = { ok: false, why: 'This browser has no WebRTC' }; resolve(); return; }
      let a = null, b = null;
      const t0 = Date.now();
      function end(res) { try { a && a.close(); } catch (e) {} try { b && b.close(); } catch (e) {} out.direct = res; resolve(); }
      const guard = setTimeout(function () { end({ ok: false, why: 'timeout' }); }, o.directWait || 15000);
      try { a = C.link.RtcLink({ self: 'a', peer: 'b' }); b = C.link.RtcLink({ self: 'b', peer: 'a' }); }
      catch (e) { clearTimeout(guard); end({ ok: false, why: String(e && e.message || e) }); return; }
      let offer = null, answer = null;
      a.createOffer().then(function (c) { offer = c; return b.acceptOffer(c); })
        .then(function (c) { answer = c; return a.acceptAnswer(c); })
        .then(function () { return Promise.all([a.opened, b.opened]); })
        .then(function () {
          const up = Date.now() - t0;
          const size = o.bytes || 2 * 1024 * 1024;
          const buf = new Uint8Array(size);
          for (let i = 0; i < size; i += 4096) buf[i] = i & 255;
          const t1 = performance.now();
          b.onmessage = function (ch, msg) {
            if (ch !== 'bulk') return;
            const ms = Math.max(1, performance.now() - t1);
            clearTimeout(guard);
            const got = msg && msg.byteLength;
            end({ ok: got === size, why: got === size ? null : 'the test message arrived short (' + got + ' of ' + size + ' bytes)',
              connectMs: up, bytes: size, ms: Math.round(ms), mbps: Math.round(size / 1048576 / (ms / 1000) * 10) / 10,
              maxMessageSize: (a.pc.sctp && a.pc.sctp.maxMessageSize) || null,
              sdpBytes: (a.pc.localDescription && a.pc.localDescription.sdp || '').length, offerCode: (offer || '').length, answerCode: (answer || '').length });
          };
          a.send('bulk', buf.buffer);
        })
        .catch(function (e) { clearTimeout(guard); end({ ok: false, why: (e && (e.why || e.message)) || String(e) }); });
    });
    return Promise.all([relayP, stunP, directP]).then(function () {
      out.lines = connLines(out);
      out.report = connReport(out);
      try { localStorage.setItem('fm.lastConnReport', out.report); } catch (e) {}
      return out;
    });
  };
  /* What it means, for him — one line per question, each saying what works and, when something does not, the
     one thing that does (§22's sentences, reused, so the test and a failed join say the same thing). */
  function connLines(r) {
    const L = [];
    if (r.relayGate === 'codes-only') L.push({ st: 'skip', text: 'Invite links and short codes: off — “Connect with codes only” is on, so nothing was tried.' });
    else if (r.relayGate) L.push({ st: 'skip', text: 'Invite links and short codes: not tried here (' + (r.relayGate === 'loopback' ? 'a test copy of the app' : r.relayGate) + ').' });
    else {
      const up = r.relays.filter(function (x) { return x.up; }), down = r.relays.filter(function (x) { return !x.up; });
      if (up.length) L.push({ st: 'ok', text: 'Invite links and short codes work here — reached ' + up.map(function (x) { return x.label; }).join(', ') + (down.length ? ' (' + down.map(function (x) { return x.label; }).join(', ') + ' didn’t answer)' : '') + '.' });
      else L.push({ st: 'no', text: 'Couldn’t reach the free connection service on this network — invite links and short codes won’t work here. Connect with a code instead.' });
    }
    const st = r.stun || {};
    if (st.skipped) L.push({ st: 'skip', text: 'Other networks: not checked (' + (st.skipped === 'codes-only' ? 'Codes only is on' : st.skipped === 'offline' ? 'this device is offline' : 'a test copy of the app') + ').' });
    else if (st.error) L.push({ st: 'no', text: 'Other networks: couldn’t check (' + st.error + ').' });
    else if (st.srflx) L.push({ st: 'ok', text: 'Other networks: this device found its public address, so someone on a different network can usually connect.' });
    else L.push({ st: 'no', text: 'Other networks: this network hides this device’s address. Put both devices on the same Wi-Fi, or turn off mobile data.' });
    const d = r.direct || {};
    if (d.ok) L.push({ st: 'ok', text: 'This device: live connections work — ' + d.mbps + ' MB/s between two connections here' + (d.maxMessageSize ? ', messages up to ' + Math.round(d.maxMessageSize / 1024) + ' KB' : '') + '.' });
    else L.push({ st: 'no', text: 'This device: live connections didn’t start (' + (d.why || 'unknown') + ').' });
    return L;
  }
  function connReport(r) {
    const lines = ['FreeMotion connection test · ' + r.at];
    if (r.relayGate) lines.push('relays: not tried (' + r.relayGate + ')');
    else lines.push('relays: ' + r.relays.map(function (x) { return x.label + ' ' + (x.up ? 'up ' + x.ms + ' ms' : 'down (' + x.why + ')'); }).join(', '));
    const st = r.stun || {};
    if (st.skipped) lines.push('stun: not tried (' + st.skipped + ')');
    else if (st.error) lines.push('stun: error ' + st.error);
    else lines.push('stun: ' + st.n + ' candidates — ' + Object.keys(st.types || {}).map(function (k) { return k + ' ' + st.types[k]; }).join(', ') + (st.srflx ? '' : ' (no srflx)'));
    const d = r.direct || {};
    if (d.ok) lines.push('webrtc: connected in ' + d.connectMs + ' ms · maxMessageSize ' + d.maxMessageSize + ' · offer SDP ' + d.sdpBytes + ' bytes · codes ' + d.offerCode + '/' + d.answerCode + ' chars · ' + (d.bytes / 1048576) + ' MB in ' + d.ms + ' ms = ' + d.mbps + ' MB/s');
    else lines.push('webrtc: failed (' + d.why + ')');
    try { lines.push('device: ' + navigator.userAgent); } catch (e) {}
    return lines.join('\n');
  }

  /* S6: one field, three kinds of thing (§19.2) — an invite link, the 9-character room code, or S3's long
     connection code. The first two go through the relay; the third is the serverless exchange. */
  function joinAny(text, profile, status, back, backCode, go, sasBox) {
    const k = C.signal.classify(text);
    if (!k) { status.textContent = 'That does not look like an invite link or a code.'; go.disabled = false; return; }
    if (k.kind === 'conn') return guestJoin(text, profile, status, back, backCode, go, sasBox);
    return relayJoin(k, profile, status, go, sasBox);
  }

  function showSas(box, sas, soft) {
    if (!box) return;
    box.textContent = '';
    if (!sas) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    if (soft) {
      /* The relay's version (S6): the owner sees the same five on the knock card, and only needs to ask
         if something feels wrong — there is no step here, just the letters and what they are for. */
      const line = el('div', 'collab-sub cj-softsas');
      line.appendChild(document.createTextNode('If they ask, your screen shows '));
      line.appendChild(el('b', null, sas));
      box.appendChild(line);
      return;
    }
    box.appendChild(el('div', 'cs-steplabel', 'Read these letters back to them'));
    box.appendChild(el('div', 'cs-sas', sas));
    box.appendChild(el('div', 'collab-sub', 'They must see the same five. If they don\u2019t, somebody is in the middle \u2014 stop.'));
  }

  /* ⚠️ S8 review: A SESSION THE OWNER ENDED IS NOT ONE HE IS IN. `bye{ended}` and a removal leave the guest's
     session object in place — the Ended banner and the guest panel read it — and nothing detached it, so after
     Ezra stopped sharing and shared again, Sam's Join was refused with "You are already in a live session —
     leave it first" (and a new invite link was thrown away), until he went back into the dead copy and tapped
     Leave. Joining anew is the moment that session is finally let go: the copy is already marked ended, so its
     next open makes it his own exactly as before. */
  function standDownEnded() {
    const s = C.session;
    if (!s || s.isOwner || !s.ended) return false;
    try { C.detach(); } catch (e) {}
    return true;
  }

  /* ═══ S6 · JOINING THROUGH THE RELAY (§12.2 finding → connecting → auth → waiting → syncing) ════════
   * Keys from the link (HKDF) or the code (PBKDF2, then HKDF); a rendezvous on that room's topic; an
   * offer every few seconds until the owner's device answers — it may be a phone that is waking up —
   * and a `here` from it retries at once; then the same `C.join` the code path uses, so the knock, the
   * snapshot and the same-device choice are all the ones S3 proved. */
  function relayJoin(target, profile, status, go, sasBox) {
    if (C.signal.codesOnly()) {
      status.textContent = 'Codes only is on in Settings → Labs, so invite links and short codes cannot connect. Ask them for a connection code, or turn Codes only off.';
      go.disabled = false;
      return null;
    }
    standDownEnded();
    if (C.session) { status.textContent = 'You are already in a live session — leave it first.'; go.disabled = false; return null; }
    if (joinFlow && joinFlow.cancel) joinFlow.cancel();
    const LIM = C.LIMITS || {};
    const J = joinFlow = { target: target, stopped: false, rv: null, attempt: null, timer: null, started: Date.now(), tries: 0, step: null, room: null };
    joinBusy++;
    let hostLabel = 'them';
    status.textContent = 'Finding the project…';
    function stop() {
      if (J.stopped) return;
      J.stopped = true;
      joinBusy = Math.max(0, joinBusy - 1);
      clearTimeout(J.timer);
      if (J.attempt) { const a = J.attempt; J.attempt = null; a.cancel(); }
      if (J.rv) { try { J.rv.stop(); } catch (e) {} }
      if (joinFlow === J) joinFlow = null;
      unwatchDocIfIdle();
    }
    J.cancel = stop;
    function fail(e) {
      if (J.stopped && !(e && e.after)) return;
      stop();
      showSas(sasBox, null);
      status.textContent = '';
      status.appendChild(document.createTextNode(relayError(Object.assign({ kind: target.kind }, e || {}), hostLabel)));
      const why = e && e.why;
      /* §22: two failures come with the one thing that fixes them. */
      if (why === 'relays') status.appendChild(btn('cj-alt', 'Connect with a code instead', function () { status.textContent = 'Ask them to tap Share → Connect with a code instead, then paste the long code they send you here.'; }));
      if (why === 'guest-older') status.appendChild(btn('cj-alt accent', 'Update', function () { U.updateNow(target.kind === 'code' ? { c: target.code } : (target.j || null)); }));
      go.disabled = false;
    }
    function attempt() {
      if (J.stopped || J.joined || J.attempt || !J.rv) return;
      J.tries++;
      J.step = 'offer';
      const a = J.attempt = C.signal.dial({
        rv: J.rv, room: J.room, key: J.room.keys.auth, mode: target.kind, nm: profile.name, cl: profile.color,
        onStep: function (st, ans) {
          if (J.stopped || J.attempt !== a) return;
          J.step = st;
          if (ans && ans.nm) hostLabel = cleanName(ans.nm) || hostLabel;
          if (st === 'connecting') status.textContent = hostLabel !== 'them' ? 'Connecting to ' + hostLabel + '…' : 'Connecting…';
          if (st === 'auth') status.textContent = 'Checking the invite…';
        }
      });
      a.then(function (res) {
        if (J.attempt !== a || J.stopped) { try { res.link.close(); } catch (e) {} return; }
        J.attempt = null;
        joined(res);
      }, function (e) {
        if (J.attempt !== a || J.stopped) return;
        J.attempt = null;
        const why = (e && e.why) || '';
        /* ⚠️ A REFUSAL NOBODY PROVED IS NOT AN ANSWER (S6 review). Anybody holding the link or the code can
           answer an offer first and say anything before auth3 — and a failed auth3 means exactly that an
           impostor answered. Both are asked again, like a missing answer; if nothing better ever comes, the
           last thing said is what the sheet reports. */
        const unproven = why === 'auth' || (e && e.deny && !e.proven);
        if (unproven) J.lastDeny = why;
        const retry = unproven || why === 'no-answer' || why === 'timeout' || why === 'ice' || why === 'closed' || why === 'cancelled';
        if (!retry) return fail(e);
        /* The owner's device may simply not be there yet — keep asking for §13.5's first window. */
        if (Date.now() - J.started > (LIM.RETRY_FAST_FOR || 120000)) return fail({ why: J.lastDeny || (why === 'ice' ? 'ice' : 'no-host') });
        const theirs = hostLabel !== 'them' ? hostLabel + '’s device' : 'their device';
        status.textContent = why === 'ice' || why === 'timeout'
          ? 'Couldn’t connect directly yet — trying again…'
          : 'Waiting for ' + theirs + ' to answer — keep this open' + (target.kind === 'code' ? ', and check the code is right.' : '…');
        J.timer = setTimeout(attempt, LIM.RETRY_FAST || 3000);
      });
    }
    /* A `here`, a foreground or an `online`: an offer still waiting for its answer went to nobody. */
    J.kick = function () {
      /* Once the owner has answered, the relay's part is over — a foreground while the knock is up must
         not send a second offer (which would fail on the stopped rendezvous and put an error under a join
         that is going fine). */
      if (J.stopped || J.joined || !J.rv) return;
      J.rv.kick();
      if (J.attempt) {
        if (J.step !== 'offer' && J.step !== 'offered') return;
        const a = J.attempt; J.attempt = null; a.cancel();
      }
      clearTimeout(J.timer);
      attempt();
    };
    function joined(res) {
      J.joined = true;
      const h = (res.auth && res.auth.host) || {};
      hostLabel = cleanName(res.host && res.host.nm) || cleanName(h.nm) || hostLabel;
      status.textContent = 'Waiting for ' + hostLabel + ' to let you in…';
      showSas(sasBox, res.auth && res.auth.sas, true);
      joinLink = res.link;                                    // closing the sheet now closes this link (S3's rule)
      if (J.rv) { try { J.rv.stop(); } catch (e) {} }         // the relay's work is done: nothing more goes through it
      const me = U.getProfile() || profile;
      const joinOpts = {
        link: res.link, role: 'editor', name: me.name, color: me.color, mk: me.mk || undefined,
        dev: isPhoneNow() ? 'phone' : 'pc', app: C.signal.appVersion(), onConflict: 'refuse',
        sid: target.sid || (typeof h.sid === 'string' ? h.sid : null), sk: target.sk || null,
        code: target.kind === 'code' ? target.code : null,
        hostName: hostLabel, hostColor: cleanColor(res.host && res.host.cl) || cleanColor(h.cl) || null
      };
      function done(r) {
        if (joinLink === res.link) joinLink = null;          // the session owns it now
        stop();
        clearPendingJoin();
        const s = C.session;
        if (s && !s.isOwner && s.setLiveness) s.setLiveness(true);
        if (s && !s.isOwner && s.gpid) takeLock(guestLock(s.gpid));   // S8 review: this tab holds the new copy's room
        showSas(sasBox, null);
        U.syncBanner();
        closeCard();
        showEditor();
        if (FM.toast) FM.toast('You’re in — this copy stays in sync with ' + hostLabel, 3000);
        return r;
      }
      function lateFail(e) { try { res.link.close(); } catch (x) {} fail(Object.assign({ after: true }, e || {})); }
      C.join(joinOpts).then(done, function (e) {
        if (e && e.why === 'same-device') { stop(); return sameDeviceChoice(e, status, joinOpts, done, lateFail); }
        lateFail(e);
      });
    }
    const keysP = target.kind === 'link' ? C.signal.linkKeys(target) : C.signal.codeKeys(target.code);
    keysP.then(function (keys) {
      if (J.stopped) return;
      J.room = { kind: target.kind, keys: keys };
      J.rv = C.signal.Rendezvous({ role: 'guest', rooms: [J.room], onHere: function () { J.kick(); } });
      J.rv.start();
      watchDoc();
      return J.rv.ready(LIM.RELAY_UP || 8000).then(attempt, function (e) { fail({ why: 'relays', refused: e && e.refused }); });
    }, function (e) { fail(e && e.why ? e : { why: 'bad-link' }); });
    return J;
  }

  /* ⚠️ A JOIN LANDS IN THE EDITOR (S6 review). Every join starts on Home — the Join button lives there,
     and an invite opens a fresh device onto Home — and `C.join` opens the copy underneath it: the sheet
     closed onto the OLD Home, the new copy missing and "OPEN" on another card, and tapping that card
     switched project and stood the new session down. §12.2: "The editor opens immediately". */
  function showEditor() {
    try { if (FM.home && FM.home.isOpen && FM.home.isOpen()) FM.home.close(); } catch (e) {}
  }

  /* ⚠️ §12.2's TWO ANSWERS, WHICH `C.join` HAS ALWAYS IMPLEMENTED AND NOTHING COULD ASK FOR (queue 921
     S3 review). The sheet hardcoded `onConflict:'refuse'` and turned the refusal into one dead-end
     sentence, so a guest whose phone locked mid-session — his own linked copy holds the host's layer ids
     by construction — could never rejoin: no Replace, no Keep, no Leave on a phone, and nothing on
     screen saying that deleting the project from Home was the only way back. The LINK IS KEPT ALIVE
     here: the refusal happens after the snapshot has arrived, the host still has this member, and
     re-saying hello on the same endpoint gets the welcome and the snapshot again. Closing it first
     would have meant asking him for a fresh code to answer a question we had already asked. */
  function sameDeviceChoice(e, status, joinOpts, done, fail) {
    status.textContent = '';
    const name = cleanName(e && e.name);
    status.appendChild(el('div', 'cj-clash', 'You already have this project on this device' + (name ? ' (\u201c' + name + '\u201d)' : '') + '. Which copy do you want?'));
    const row = el('div', 'cj-clashacts');
    function pick(mode) {
      status.textContent = STEPS[4];
      C.join(Object.assign({}, joinOpts, { onConflict: mode })).then(done, fail);
    }
    row.appendChild(btn('cj-clashbtn', 'Keep mine, join fresh', function () { pick('keepFirst'); }));
    row.appendChild(btn('cj-clashbtn accent', 'Replace my copy', function () { pick('replace'); }));
    status.appendChild(row);
  }

  function guestJoin(code, profile, status, back, backCode, go, sasBox) {
    if (!C.signal.isConnCode(code)) {
      status.textContent = 'That does not look like a code. It starts with FM1.';
      go.disabled = false;
      return;
    }
    status.textContent = STEPS[0];
    let link;
    try { link = C.link.RtcLink({ self: 'guest', peer: 'host' }); }
    catch (e) { status.textContent = 'This browser cannot make a direct connection.'; go.disabled = false; return; }
    joinLink = link;
    let joinOpts = null;

    function done() {
      status.textContent = STEPS[4];
      joinLink = null;             // the session owns the link now — closing the card must not kill it
      if (C.session && !C.session.isOwner && C.session.gpid) takeLock(guestLock(C.session.gpid));   // S8 review
      showSas(sasBox, null);
      U.syncBanner();
      closeCard();
      showEditor();
      if (FM.toast) FM.toast('You\u2019re in \u2014 this copy stays in sync', 3000);
    }
    function fail(e) {
      try { link.close(); } catch (x) {}
      if (joinLink === link) joinLink = null;
      showSas(sasBox, null);
      status.textContent = joinError(e);
      go.disabled = false;
    }

    link.acceptOffer(code).then(function (answer) {
      backCode.textContent = answer;
      back.classList.remove('hidden');
      status.textContent = STEPS[1];
      /* NO AUTOMATIC CLIPBOARD WRITE HERE. It would be outside the tap that started this, which Safari
         refuses — and the refusal path ends in a toast saying "could not copy", i.e. an error message
         for something nobody asked for. The Copy button beside the code is inside its own tap. */
      return openedWithin(link);
    }).then(function () {
      status.textContent = STEPS[2];
      /* No `sid` is passed: on the code path the guest has no source for it but the host's own auth1,
         and the handshake takes it from there and hands it back below (§14.6 as built in S3). */
      return C.signal.handshake(link, {
        side: 'guest', key: link.mk, mode: 'conn',
        fpLocal: link.fpLocal, fpRemote: link.fpRemote
      });
    }).then(function (res) {
      status.textContent = STEPS[3];
      const h = (res && res.host) || {};
      showSas(sasBox, res && res.sas);
      joinOpts = {
        link: link, role: 'editor', name: profile.name, color: profile.color, onConflict: 'refuse',
        sid: h.sid || null, hostName: cleanName(h.nm) || 'them', hostColor: cleanColor(h.cl) || null
      };
      return C.join(joinOpts);
    }).then(done, function (e) {
      if (e && e.why === 'same-device' && joinOpts) return sameDeviceChoice(e, status, joinOpts, done, fail);
      fail(e);
    });
  }

  function joinError(e) {
    const why = (e && e.why) || '';
    if (why === 'bad-code') return 'That code did not read — check you pasted all of it.';
    if (why === 'auth') return 'That code is for a different session.';
    if (why === 'denied' || why === 'refused') return 'They did not let you in.';
    if (why === 'same-device') return 'You already have this project on this device.';
    if (why === 'no-candidates') return 'That code has no way to connect on this network — ask for a fresh one on Wi-Fi.';
    if (why === 'no-room') return 'Not enough room on this device — delete a project and try again.';
    if (why === 'timeout') return 'They did not answer — ask for a fresh code.';
    if (why === 'closed') return 'The connection dropped while you were waiting — ask for a fresh code and try again.';
    return 'Could not join — ask for a fresh code.';
  }

  /* §22's sentences for the relay path, one per refusal, each naming the person where it can. The
     connection-code path keeps `joinError` above: its words are about a code the two people swapped. */
  function relayError(e, host) {
    const why = (e && e.why) || '';
    const who = host && host !== 'them' ? host : '';
    const whose = who ? who + '’s' : 'Their';
    if (why === 'relays') return 'Couldn’t reach the free connection service.';
    if (why === 'no-host') return e.kind === 'code'
      ? whose + ' device isn’t answering. Check the code — a short code works for ' + Math.round(codeTtlMs() / 60000) + ' minutes — or ask them to open the project in FreeMotion, then try again.'
      /* S8 review: a link the owner RESET (or changed by removing someone) is never answered either — the owner
         stops listening on its topic — and the joiner cannot tell the two apart, so the sentence names both. */
      : whose + ' device isn’t answering. If they reset the link or removed someone, the old link stopped working — ask ' + (who || 'them') + ' for the new one. Otherwise ask them to open the project in FreeMotion, then try again.';
    if (why === 'ice') return 'Couldn’t connect directly. Put both devices on the same Wi-Fi, or turn off mobile data.';
    if (why === 'auth' || why === 'bad-link' || why === 'bad-code') return 'This invite no longer works — ask ' + (who || 'them') + ' for a new link.';
    if (why === 'declined' || why === 'denied' || why === 'refused') return (who || 'They') + ' didn’t let you in.';
    if (why === 'full') return 'This project is full — ask ' + (who || 'them') + ' to make room.';
    if (why === 'removed') return (who || 'The owner') + ' removed you from this project.';
    if (why === 'ended') return 'That live session has ended.';
    if (why === 'paused') return (who || 'They') + ' switched to another project before letting you in — try again once they’re back on it.';
    if (why === 'closed') return 'The connection dropped while you were waiting — tap Join to try again.';
    if (why === 'host-older') return whose + ' FreeMotion needs an update before you can join — ask ' + (who || 'them') + ' to tap the version number.';
    if (why === 'guest-older') return 'Update to join — this FreeMotion is older than ' + (who ? who + '’s' : 'theirs') + '.';
    if (why === 'same-device') return 'You already have this project on this device.';
    if (why === 'no-room') return 'Not enough room on this device — delete a project and try again.';
    if (why === 'timeout') return (who || 'They') + ' didn’t answer — try again.';
    return 'Could not join — try again.';
  }

  U._relayError = relayError;         // suite seam: §22's sentences, read without two minutes of retries

  /* ═══ 4. THE KNOCK CARD (§19.3) ═══════════════════════════════════════════════════════════════
   * Requests queue one at a time, and one that is never answered declines itself after two minutes —
   * an owner who has put his phone down must not leave someone staring at "waiting" forever. */
  /* Test seam, the same one `U._connectWait` is: the knock's own two minutes are not a thing a suite waits out. */
  let knockWait = null;
  U._knockWait = function (ms) { knockWait = (ms == null ? null : ms); return knockWait; };
  /* Resolves true (let in), false (not), or — when the knock is called off before he answers (S6 review) —
     the reason: 'gone' (they gave up), 'paused' or 'ended' (the session it was for stood down). The
     promise carries `.cancel(why)`. */
  U.knock = function (info) {
    let entry = null;
    const p = new Promise(function (resolve) {
      entry = { info: info || {}, resolve: resolve, done: false };
      knockQueue.push(entry);
      pumpKnock();
    });
    p.cancel = function (why) { cancelKnock(entry, why || 'gone'); };
    return p;
  };
  function cancelKnock(k, why) {
    if (!k || k.done) return;
    const i = knockQueue.indexOf(k);
    if (i >= 0) { knockQueue.splice(i, 1); k.done = true; k.resolve(why); return; }
    if (pendingKnock === k && k.answer) k.answer(why);
  }
  /* ⚠️ A KNOCK BELONGS TO THE SESSION IT CAME IN ON (S6 review). The card outlived it: he opened another
     project, or stopped sharing, and "Sam wants to join" stayed up over whatever came next — and Let in
     then told Sam the session had ENDED when it had only paused. Every knock, shown or queued, is
     answered with what really happened. */
  function cancelKnocks(why) {
    knockQueue.splice(0).forEach(function (k) { if (!k.done) { k.done = true; k.resolve(why); } });
    if (pendingKnock && pendingKnock.answer) pendingKnock.answer(why);
  }
  /* Suite seam: how many knocks are waiting on him (the one on screen and the ones queued behind it). */
  U._knocks = function () { return knockQueue.length + (pendingKnock ? 1 : 0); };
  function pumpKnock() {
    if (pendingKnock || !knockQueue.length) return;
    const k = pendingKnock = knockQueue.shift();
    const host = el('div', 'collab-knock');
    host.id = 'collab-knock';
    host.setAttribute('role', 'alertdialog');
    const who = (cleanName(k.info.name) || 'Someone') + (k.info.dev ? ' (' + cleanName(k.info.dev) + ')' : '');
    host.appendChild(el('div', 'ck-text', who + ' wants to join as ' + labelFor(k.info.role) + '.'));
    /* S6: on the relay, the five letters this leg of the handshake derived (§14.6). Somebody holding the
       link could sit between a real joiner and this device; the joiner's screen shows the same five only
       when nobody does. Offered, not demanded — the link's promise is one tap — and in plain words. */
    if (typeof k.info.sas === 'string' && /^[0-9A-Z]{5}$/.test(k.info.sas)) {
      const line = el('div', 'ck-sas');
      line.appendChild(document.createTextNode('Their screen shows '));
      line.appendChild(el('b', null, k.info.sas));
      line.appendChild(document.createTextNode(k.info.via === 'code' ? ' · came in with the short code' : ''));
      host.appendChild(line);
    }
    const acts = el('div', 'ck-acts');
    acts.appendChild(btn('ck-no', 'Don’t allow', function () { answer(false); }));
    acts.appendChild(btn('ck-yes accent', 'Let in', function () { answer(true); }));
    host.appendChild(acts);
    document.body.appendChild(host);
    const t = setTimeout(function () {
      /* §19.3: a request nobody answers declines itself, with a quiet note where he will look next. */
      shareNote = (cleanName(k.info.name) || 'Someone') + ' asked to join and was not let in — the request timed out.';
      answer(false);
      redrawShare();
    }, knockWait != null ? knockWait : ((C.LIMITS && C.LIMITS.KNOCK_TIMEOUT) || 120000));
    function answer(yes) {
      if (k.done) return;
      k.done = true;
      clearTimeout(t);
      if (host.parentNode) host.parentNode.removeChild(host);
      if (pendingKnock === k) pendingKnock = null;
      k.resolve(yes);
      pumpKnock();
    }
    k.answer = answer;
  }

  /* ═══ 5. THE BANNER (§19.4) ═══════════════════════════════════════════════════════════════════ */

  U.banner = function (text, opts) {
    const o = opts || {};
    if (!text) return U.hideBanner();
    if (!bannerEl) {
      bannerEl = el('div', 'collab-banner');
      bannerEl.id = 'collab-banner';
      bannerEl.setAttribute('role', 'status');
      const stage = document.getElementById('stage') || document.body;
      stage.appendChild(bannerEl);
    }
    /* The words in a span of their own, so THEY are what gives when the line is too long (S5 review):
       as a bare text node beside the × they were an anonymous flex item that cannot shrink, so a long
       name pushed "Following Alexandra Montgomery ×" past the banner's edge and the × was clipped away. */
    bannerEl.textContent = '';
    bannerEl.appendChild(el('span', 'cb-text', text));
    bannerEl.classList.toggle('warn', !!o.warn);
    /* S5: "Following Sam ×" shares this slot (§18.7), and it is the one state with something to press. */
    bannerEl.classList.toggle('has-x', typeof o.onClose === 'function');
    /* S6: one state has a thing to DO rather than to close — §14.7's "Update now". */
    bannerEl.classList.toggle('has-act', typeof o.onAction === 'function');
    if (typeof o.onAction === 'function') {
      bannerEl.appendChild(btn('cb-act', o.action || 'OK', function (e) { e.stopPropagation(); o.onAction(); }));
    }
    if (typeof o.onClose === 'function') {
      const x = btn('cb-x', '\u00d7', function (e) { e.stopPropagation(); o.onClose(); });
      x.setAttribute('aria-label', o.closeLabel || 'Close');
      if (FM.drawnX) FM.drawnX(x, 18);   // queue 965: one drawn ✕ for the app
      bannerEl.appendChild(x);
    }
    if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
    if (o.ms) bannerTimer = setTimeout(U.hideBanner, o.ms);
    U.placeBanner();
    return bannerEl;
  };
  /* ⚠️ THE BANNER CLEARS THE PEOPLE CHIP (S5 review). Both live at the top of the stage: the chip in the
     left corner, the banner centred with 70 px each side — which the chip outgrows once four or more
     people are in (three faces and "+1" reach x≈102 at 380 px), and then it sat over the first letters of
     "View only — ask for edit access". So when centring would put the banner under the chip, it starts
     just past the chip instead, and may run to 46 px from the right edge (the view bar is 40) to keep
     its words. Presence calls this whenever the chip changes; `U.banner` whenever the words do. */
  U.placeBanner = function () {
    const b = bannerEl;
    if (!b || !b.parentNode) return;
    b.style.left = ''; b.style.transform = ''; b.style.maxWidth = '';
    const chip = document.getElementById('collab-people');
    if (!chip || chip.parentNode !== b.parentNode || !chip.offsetWidth) return;
    const sr = b.parentNode.getBoundingClientRect(), cr = chip.getBoundingClientRect(), br = b.getBoundingClientRect();
    const minL = cr.right - sr.left + 6;
    if (br.left - sr.left >= minL || cr.bottom <= br.top || cr.top >= br.bottom) return;
    b.style.transform = 'none';
    b.style.left = minL + 'px';
    b.style.maxWidth = Math.max(60, sr.width - 46 - minL) + 'px';
  };
  U.hideBanner = function () {
    if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
    if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
    bannerEl = null;
    return null;
  };
  /* Says what the session is, from the session, rather than from a flag somebody remembered to set. */
  U.syncBanner = function () {
    applyRoleClasses();
    U.friendsBar();                            // queue 945: the Friends bar says live / reconnecting / ended with the banner
    const s = C.session;
    if (!s || !C.active) {
      /* ⚠️ A REOPENED COPY SAID NOTHING WHILE IT LOOKED FOR ITS OWNER (S6 review). No session yet, so
         the banner hid — and the copy looked like a project of his own, which is exactly what made
         tapping Share arm it. It says what it is and what it is doing. */
      if (!s && recon && !recon.stopped && recon.mode === 'reopen' && recon.gpid === currentPid()) {
        const who = hostNameFor(recon.gpid);
        return U.banner(isPhoneNow() ? 'Reconnecting to ' + who + '…' : 'Shared by ' + who + ' · reconnecting… your changes are kept', { warn: true });
      }
      if (!s && otherTab && otherTab === currentPid()) return U.banner('This shared project is open in another FreeMotion tab — it stays in sync there', { warn: true });
      /* S8 review: a copy that joined with a code has no way back by itself, and looked like his own project. */
      const lc = !s && U.labsOn() ? cardOf(currentPid()) : null;
      if (lc && lc.collab && !lc.collab.ended && !reconTarget(lc)) {
        const who = hostNameFor(lc.id);
        return U.banner(isPhoneNow() ? 'Shared by ' + who + ' · not connected' : 'Shared by ' + who + ' · not connected — ask for a new code to rejoin', { warn: true });
      }
      return U.hideBanner();
    }
    /* ⚠️ "THE OWNER ENDED THIS" IS NOT AN OFFLINE STATE (queue 921 S3 review). Nothing on either device
       said a word when a session stopped or the wire went — the adapter had no `onEnd`/`onOffline` at
       all — so the guest kept editing a project that was no longer syncing while its panel read "Live".
       And the offline line PROMISED A RE-SEND: there is no reconnect in S3 (`C.reopen` has no caller),
       so "will send when you reconnect" was untrue. It says what is true instead. */
    if (s.ended) return U.banner(s.ended === 'removed'
      ? 'You were removed from this project — your copy stays on this device'
      : 'This live session has ended — your copy stays on this device', { warn: true });
    /* §13.1 (S8 review): "Too many offline changes to hold — [Save my version as a copy]". */
    if (!s.isOwner && s.outboxFull) {
      return U.banner(isPhoneNow() ? 'Too many offline changes' : 'Too many offline changes to hold — editing waits until they are sent', {
        warn: true, action: isPhoneNow() ? 'Save mine' : 'Save my version',
        onAction: function () { if (s.adapter && s.adapter.saveVersion) s.adapter.saveVersion(s.myVersion()); }
      });
    }
    /* S6 (§14.7): the owner turned a reconnect away on version — say which side needs the update. */
    /* 📐 THE PHONE GETS THE SHORT SENTENCE (S6, photographed at 380 px). The pill is `100% − 140 px` wide so
       it clears the people chip — 240 px on a phone — and the long forms were cut mid-word ("Ezra is
       offline · reconnecting… y…", "Sam has a ne…" beside its own button), losing exactly the half that
       says what to do. Same facts, fewer words, on a phone only. */
    const short = isPhoneNow();
    if (!s.isOwner && versionNote) {
      return versionNote.why === 'guest-older'
        ? U.banner(short ? 'This app is older' : 'Update to reconnect — this FreeMotion is older than ' + hostNameOf(s) + '’s', { warn: true, action: 'Update', onAction: function () { U.updateNow(); } })
        : U.banner(short ? hostNameOf(s) + ' needs to update' : hostNameOf(s) + '’s FreeMotion needs an update — ask them to tap the version number', { warn: true });
    }
    if (s.online === false) {
      /* S6: NOW there is a reconnect, so the banner may promise one — but only while one is really
         running for this copy. With Codes only, or a copy that came in by connection code (no room to
         find), there is none, and S3's sentence stays true. */
      if (recon && recon.gpid === s.gpid) {
        const n = owedOps(s);
        return U.banner(short
          ? 'Reconnecting to ' + hostNameOf(s) + '…' + (n ? ' (' + n + ' kept)' : '')
          : hostNameOf(s) + ' is offline · reconnecting… your changes are kept' + (n ? ' (' + n + ')' : ''), { warn: true });
      }
      return U.banner('Offline — the live link dropped; your changes are kept on this device', { warn: true });
    }
    /* §14.7 on the owner's side: somebody newer knocked and was turned away. */
    if (s.isOwner && hostOlder) {
      return U.banner(hostOlder.name + (short ? ' is newer' : ' has a newer FreeMotion'), { warn: true, action: 'Update now', onAction: function () { U.updateNow(); },
        onClose: function () { hostOlder = null; U.syncBanner(); }, closeLabel: 'Dismiss' });
    }
    const fl = C.presence && C.presence.followLabel ? C.presence.followLabel() : null;
    const follow = { onClose: function () { C.presence.unfollow(); }, closeLabel: 'Stop following' };
    /* ⚠️ A VIEWER WHO FOLLOWS IS TOLD SO, AND GETS THE × (S5 review). The view-only line returned before
       Follow was ever asked about, so the person most likely to follow — a client watching the edit —
       saw the playhead start moving by itself under a banner that said nothing about it and offered
       nothing to press. Both facts are true, so the banner says both. */
    if (!s.isOwner && (s.role === 'viewer' || s.role === 'commenter')) return fl ? U.banner('View only · ' + fl, follow) : U.banner('View only — ask for edit access');
    if (C._pendingReload && C._pendingReload()) return U.banner('Update ready — it applies when you leave the session');
    /* Lowest: what he chose to do, below what the session is telling him. */
    if (fl) return U.banner(fl, follow);
    return U.hideBanner();
  };

  function cardOf(pid) {
    const list = (FM.projects && FM.projects.list && FM.projects.list()) || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === pid) return list[i];
    return null;
  }
  function hostNameOf(s) { return hostNameFor(s && s.gpid); }
  function hostNameFor(gpid) {
    const c = gpid ? cardOf(gpid) : null;
    return cleanName(c && c.collab && c.collab.hostName) || 'The owner';
  }
  function owedOps(s) {
    let n = 0;
    try { (s._outstanding ? s._outstanding() : []).forEach(function (e) { n += e.n || 0; }); } catch (e) {}
    return n;
  }

  /* ═══ S6 · AUTOMATIC RECONNECT (§13.5, §12.2 "offline ─retry─▶ finding") ═══════════════════════════
   * A guest whose link went — its own phone locked, the owner's did, the Wi-Fi changed — keeps editing
   * (the outbox, §13.1) and finds the room again on its own: the rendezvous of the link or the code it
   * joined with, and its MEMBER TOKEN instead of a knock (D5). Every 3 s for two minutes, every 10 s to
   * ten, every 30 s after that; at once on a foreground, an `online`, or the owner's `here`.
   * The same machine runs when a linked copy is OPENED (§12.4 "guest reload recovery"): there is no
   * session yet, and the connection is handed to `C.reopen` instead of to the session that dropped it.
   * A copy that joined by connection code has no room to find, so it has no reconnect — the banner then
   * keeps S3's sentence, which does not promise one. */
  /* S6 review: a member comes back through the room's HUB, with its own token — never through the link or
     the code, which anybody holding them could read and answer (collab-signal.js "the members' room"). */
  function reconTarget(card) {
    const c = card && card.collab;
    if (!c || c.ended || typeof c.tok !== 'string' || typeof c.rid !== 'string' || typeof c.hub !== 'string') return null;
    return { hub: c.hub, rid: c.rid, tok: c.tok };
  }
  function stopRecon() {
    const R = recon;
    recon = null;
    if (!R) return;
    R.stopped = true;
    /* The copy's lock goes with its reconnect — unless the reconnect succeeded, and the session now holds it. */
    if (!(C.session && !C.session.isOwner && C.session.gpid === R.gpid)) dropLock(guestLock(R.gpid));
    R.awaiting = false;
    clearTimeout(R.timer);
    if (R.attempt) { const a = R.attempt; R.attempt = null; a.cancel(); }
    if (R.rv) { try { R.rv.stop(); } catch (e) {} }
    unwatchDocIfIdle();
    if (R.mode === 'reopen' && !C.session) U.syncBanner();   // the "reconnecting" line was about this one
  }
  U._recon = function () { return recon; };

  function startRecon(gpid, mode) {
    if (recon && recon.gpid === gpid && !recon.stopped) { recon.kick('again'); return recon; }
    stopRecon();
    otherTab = null;
    if (!U.labsOn() || C.signal.codesOnly()) return null;
    const t = reconTarget(cardOf(gpid));
    if (!t) return null;
    const LIM = C.LIMITS || {};
    const R = recon = { gpid: gpid, mode: mode, started: Date.now(), timer: null, attempt: null, rv: null, room: null, tries: 0, step: null, stopped: false, last: null };
    function delay() {
      const e = Date.now() - R.started;
      return e < (LIM.RETRY_FAST_FOR || 120000) ? (LIM.RETRY_FAST || 3000)
        : e < (LIM.RETRY_MID_UNTIL || 600000) ? (LIM.RETRY_MID || 10000) : (LIM.RETRY_SLOW || 30000);
    }
    R.delay = delay;
    function schedule() { if (R.stopped) return; clearTimeout(R.timer); R.timer = setTimeout(go, delay()); }
    function go() {
      if (R.stopped || R.attempt || !R.rv) return;
      clearTimeout(R.timer); R.timer = null;
      R.awaiting = false;
      const c = (cardOf(gpid) || {}).collab || {};
      const tok = C.signal.fromB64url(c.tok);
      if (!tok || tok.length !== 16) { stopRecon(); U.syncBanner(); return; }
      R.tries++;
      R.step = 'offer';
      const me = U.getProfile() || {};
      const a = R.attempt = C.signal.dial({
        rv: R.rv, room: R.room, key: tok, mode: 'tok', rid: c.rid, nm: me.name, cl: me.color,
        onStep: function (st) { if (R.attempt === a) R.step = st; }
      });
      a.then(function (res) {
        if (R.attempt !== a || R.stopped) { try { res.link.close(); } catch (e) {} return; }
        R.attempt = null;
        connect(res);
      }, function (e) {
        if (R.attempt !== a || R.stopped) return;
        R.attempt = null;
        const why = (e && e.why) || '';
        R.last = why;
        /* ⚠️ ONLY A REFUSAL THE OWNER SIGNED ENDS THE COPY (S6 review). `auth` used to, as "a token the owner
           no longer knows" — but the owner's own handshake timeout, a crypto hiccup and a wrong MAC all go
           out as `auth` too, so a phone that locked mid-handshake was cut loose for good, and anybody who
           could answer the offer first could say "removed" and be believed. A removal is now signed with
           the member's own token (collab-signal.js `failSigned`); everything else is asked again. */
        if ((why === 'removed' || why === 'ended') && e.proven) { stopRecon(); endCopy(gpid, why); return; }
        schedule();
      });
    }
    /* A foreground, an `online` or a `here`: an offer still waiting for its answer went to nobody, so it is
       dropped and a fresh one sent now. One that already has its answer is left to finish. */
    R.kick = function () {
      if (R.stopped || !R.rv) return;
      R.rv.kick();
      if (R.attempt) {
        if (R.step !== 'offer' && R.step !== 'offered') return;
        const a = R.attempt; R.attempt = null; a.cancel();
      }
      go();
    };
    /* ⚠️ "BACK IN SYNC" WAITS FOR THE OWNER'S WELCOME (S6 review). It was said the moment the link was
       handed over — before the owner had read the hello, so a reconnect he then turned away (full, or
       an older build) read "Back in sync with Ezra" and then the opposite, every three seconds for as
       long as the room stayed full. Now the hello goes out, the reconnect waits (`awaiting`), and the
       session's welcome is what says it (U.onWelcome). A refusal closes the link, which starts it again. */
    function connect(res) {
      const s = C.session;
      if (s && !s.isOwner && s.gpid === gpid && !s.ended) {
        R.awaiting = true;
        s.setLink(res.link);
        s.setLiveness(true);
        s.setOnline(true);
        return;
      }
      if (C.session || currentPid() !== gpid) { try { res.link.close(); } catch (e) {} stopRecon(); return; }
      const c = (cardOf(gpid) || {}).collab || {};
      const me = U.getProfile() || {};
      joinBusy++;
      R.awaiting = true;
      C.reopen({
        link: res.link, gpid: gpid, role: c.role || 'editor', mid: c.mid || 'g', sid: c.sid || gpid,
        name: me.name, color: me.color, mk: me.mk || undefined, dev: isPhoneNow() ? 'phone' : 'pc', app: C.signal.appVersion(),
        fallbackLive: true
      }).then(function (r) {
        if (!r) { R.awaiting = false; try { res.link.close(); } catch (e) {} schedule(); return; }
        if (r.session && r.session.setLiveness) r.session.setLiveness(true);
      }, function () { R.awaiting = false; try { res.link.close(); } catch (e) {} schedule(); })
        .then(function () { joinBusy = Math.max(0, joinBusy - 1); });
    }
    function back() {
      if (!R.awaiting || R.stopped) return;
      R.awaiting = false;
      try { if (FM.projects.patchCollab) FM.projects.patchCollab(gpid, { seen: Date.now() }); } catch (e) {}
      versionNote = null;
      stopRecon();
      U.syncBanner();
      if (FM.toast) FM.toast('Back in sync with ' + hostNameOf(C.session), 2200);
    }
    R.back = back;
    takeLock(guestLock(gpid)).then(function (mine) {
      if (R.stopped) return null;
      if (!mine) { stopRecon(); otherTab = gpid; U.syncBanner(); return null; }
      return C.signal.memberRoom(t.hub, t.rid, t.tok);
    }).then(function (room) {
      if (R.stopped || !room) return;
      R.room = room;
      R.rv = C.signal.Rendezvous({ role: 'guest', rooms: [R.room], onHere: function () { R.kick(); } });
      R.rv.start();
      watchDoc();
      go();
    }, function () { stopRecon(); U.syncBanner(); });
    U.syncBanner();
    return R;
  }

  /* The owner ended the session, removed this device, or no longer knows its token (`lost`): the copy
     stops being a copy of anything live. In a session, it says so and stays on screen; with no session
     (a reopen that was turned away) this IS the "next open" §12.3 detaches on. */
  function endCopy(gpid, why) {
    try { if (FM.projects.patchCollab) FM.projects.patchCollab(gpid, { ended: why }); } catch (e) {}
    const s = C.session;
    if (s && !s.isOwner && s.gpid === gpid) {
      if (!s.ended) {
        s.ended = why === 'removed' ? 'removed' : 'ended';
        s.active = false;
        if (why === 'lost') {
          if (C.presence) { try { C.presence.detach(); } catch (e) {} }
          if (FM.toast) FM.toast('This invite no longer works — ask ' + hostNameOf(s) + ' for a new link. Your copy stays on this device.', 4200);
        } else if (s.adapter && s.adapter.onEnd) { try { s.adapter.onEnd(s.ended); } catch (e) {} }
      }
      U.syncBanner();
      return null;
    }
    return detachEnded(gpid, why);
  }
  function detachEnded(gpid, why) {
    if (joinBusy || !FM.projects || !FM.projects.detachLinked) return null;
    const card = cardOf(gpid);
    const name = cleanName(card && card.collab && card.collab.hostName) || 'The owner';
    joinBusy++;
    return FM.projects.detachLinked(gpid).then(function (nid) {
      if (nid && FM.toast) {
        FM.toast(why === 'removed' ? name + ' removed you — this is now your own copy'
          : why === 'left' ? 'You left — this is now your own copy'
          : why === 'lost' ? 'That shared project can no longer be reached — this is now your own copy'
          : name + ' stopped sharing — this is now your own copy', 3800);
      }
      return nid;
    }, function () { return null; }).then(function (r) { joinBusy = Math.max(0, joinBusy - 1); return r; });
  }

  /* ── what the session tells the UI (collab-bridge.js / collab-core.js) ─────────────────────────── */
  U.onOffline = function () {
    const s = C.session;
    /* `active` false is a session being STOPPED (a leave, a switch) whose own link close lands here on the
       way out — not a wire that went. */
    if (!s || s.isOwner || s.ended || s.active === false || !s.gpid || versionNote) return;
    startRecon(s.gpid, 'live');
  };
  U.onEnded = function (why) {
    const s = C.session;
    if (s && !s.isOwner && s.gpid) { try { if (FM.projects.patchCollab) FM.projects.patchCollab(s.gpid, { ended: why === 'removed' ? 'removed' : 'ended' }); } catch (e) {} }
    stopRecon();
  };
  /* The owner admitted a reconnect's hello: NOW it is back in sync (S6 review). */
  U.onWelcome = function () {
    const s = C.session;
    if (recon && recon.awaiting && s && !s.isOwner && s.gpid === recon.gpid && recon.back) recon.back();
  };
  /* A `deny` AFTER the handshake — the owner's answer to a reconnect's hello (§14.7, §22). */
  U.onDeny = function (why) {
    const s = C.session;
    if (!s || s.isOwner) return;
    if (why === 'removed' || why === 'ended') { stopRecon(); endCopy(s.gpid, why); return; }
    if (why === 'guest-older' || why === 'host-older') {
      versionNote = { why: why };
      stopRecon();
      const ep = s.endpoint ? s.endpoint() : null;
      if (ep) { try { ep.close(); } catch (e) {} }
      U.syncBanner();
    }
    /* full / declined / busy: the owner closes this link in a moment and the reconnect carries on. */
  };
  U.onDetach = function (s) {
    applyRoleClasses();                        // S7: no session, no role — the editor is his again
    if (s && s.isOwner && s.pid) dropLock(hostLock(s.pid));
    if (s && !s.isOwner && s.gpid && !(recon && recon.gpid === s.gpid && !recon.stopped)) dropLock(guestLock(s.gpid));
    if (!s || s.isOwner) {
      stopCkpt();
      stopHostRelay(); dropWake(); ridMid = Object.create(null); hostOlder = null;
      cancelKnocks(s && s.stopWhy === 'paused' ? 'paused' : 'ended');
    }
    if (recon && (!s || recon.gpid === s.gpid || recon.mode === 'live')) stopRecon();
    if (wakeLock && !wantWake()) dropWake();   // S8 review: a guest's download lock goes with its session too
    versionNote = null;
    unwatchDocIfIdle();
    /* queue 945: the Friends block redraws to what is true now — never through U.share, which would arm again. */
    U.friendsBar();
    if (fhostLive()) U.renderFriends(fhost);
  };

  /* ═══ S6 · RESUME ON REOPEN (§12.1 "paused ─reopened─▶ arming", §12.4 guest recovery) ═══════════════
   * Called on the turn after every `history.reset()` — a project open, an import, the boot — and it asks
   * one question first: is Labs on. With it off nothing below runs (§23). With it on: a project this
   * device is sharing starts sharing again (Stop sharing is what deletes the host record, so a record
   * means he never stopped); a copy of somebody else's starts finding its owner; a copy whose owner ended
   * it or removed this device becomes his own. */
  U.afterReset = function () {
    if (!U.labsOn() || resumeT) return;
    resumeT = setTimeout(function () { resumeT = null; try { U.resumeOpen(); } catch (e) { C.lastError = e; } }, 0);
  };
  U.resumeOpen = function () {
    if (!U.labsOn() || !installed) return null;
    const pid = currentPid();
    if (recon && recon.mode === 'reopen' && recon.gpid !== pid) stopRecon();
    /* S8 review: …nor while a Leave is still copying this project into his own — the card is already marked
       left, and a resume now would start a SECOND copy of it beside the first. */
    if (!pid || C.session || joinBusy || (C.leaving && C.leaving())) return null;
    const card = cardOf(pid);
    if (card && card.collab) {
      if (card.collab.ended) return detachEnded(pid, card.collab.ended);
      const R = startRecon(pid, 'reopen');
      if (!R) U.syncBanner();                  // S8 review: a copy with no way back says so (see syncBanner)
      return R;
    }
    const room = loadRoom(pid);
    return room ? resumeHost(pid, room) : null;
  };
  function resumeHost(pid, room) {
    const p = U.getProfile();
    if (!p) return null;
    hostRoom = room; hostRoomPid = pid;
    return takeLock(hostLock(pid)).then(function (mine) {
      if (!mine) { if (FM.toast) FM.toast(OTHER_TAB + ' — this one is not sharing', 3600); return false; }
      return checkpoint(pid, 'resume').then(function () { return true; });
    }).then(function (go) {
      if (!go) return null;
      if (C.session || currentPid() !== pid || !U.labsOn()) {
        if (!(C.session && C.session.isOwner && C.session.pid === pid)) dropLock(hostLock(pid));   // not if that session is the one holding it
        return null;
      }
      C.share({ ownerInfo: { name: p.name, color: p.color }, sid: room.sid, midFloor: room.midTop || 0 });
      afterArm();
      if (FM.toast) FM.toast('Sharing is on again — people can reconnect', 2600);
      return C.session;
    });
  }

  /* ═══ S6 · THE INVITE THAT OPENED THE APP (§14.2, §19.7) ══════════════════════════════════════════
   * collab-core.js stashed `#j=` at parse time; this picks it up once Home has booted. In order: the iOS
   * landing card (an invite opened in Safari on an iPhone is almost always meant for the installed app,
   * whose storage Safari cannot see), then Labs, then the profile, then the Join sheet — filled in, and
   * waiting for one tap on Join (S6 review: an address bar is not a tap — see drawJoin). */
  function readPendingJoin() {
    try {
      const p = JSON.parse(localStorage.getItem('fm.pendingJoin') || 'null');
      if (p && typeof p.at === 'number' && (typeof p.j === 'string' || typeof p.c === 'string')) return p;
    } catch (e) {}
    return null;
  }
  function clearPendingJoin() { try { localStorage.removeItem('fm.pendingJoin'); } catch (e) {} }
  U.pendingJoin = readPendingJoin;

  /* iOS, and not the installed app. iPadOS reports itself as a Mac, so a Mac with a touch screen is one. */
  U.isIosBrowser = function (nav, standalone) {
    const n = nav || navigator;
    const ua = String(n.userAgent || '');
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (n.maxTouchPoints || 0) > 1);
    if (!ios) return false;
    const sa = standalone != null ? !!standalone
      : (!!n.standalone || !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
    return !sa;
  };
  let iosProbe = null;                       // test seam: {nav, standalone}
  U._iosProbe = function (p) { iosProbe = p || null; return iosProbe; };

  U.afterBoot = function () { return U.resumePendingJoin(); };

  U.resumePendingJoin = function (opts) {
    const o = opts || {};
    const pj = readPendingJoin();
    if (!pj) return null;
    const lim = (C.LIMITS && C.LIMITS.PENDING_JOIN) || 86400000;
    const age = Date.now() - pj.at;
    if (!(age >= -60000 && age < lim)) { clearPendingJoin(); return null; }
    /* S6 review: a short code comes back here too — [Update] on a join typed as a code stashes it — and it
       was typed on THIS device, so it never needs the iPhone landing card. */
    const code = typeof pj.c === 'string' ? C.signal.normRoomCode(pj.c) : null;
    const target = code ? { kind: 'code', code: code } : C.signal.roomFromJ(pj.j);
    if (!target) { clearPendingJoin(); return null; }
    const link = code ? C.signal.fmtRoomCode(code) : C.signal.linkFromJ(pj.j);
    const ios = iosProbe ? U.isIosBrowser(iosProbe.nav, iosProbe.standalone) : U.isIosBrowser();
    if (!o.here && ios && !code) return landingCard(link, o);
    if (!U.labsOn()) return labsCard(o);
    standDownEnded();
    if (C.session) {
      clearPendingJoin();
      if (FM.toast) FM.toast('You are in a live session — leave it before joining another', 3200);
      return null;
    }
    return U.profile().then(function (p) {
      if (!p) { clearPendingJoin(); return null; }
      return drawJoin(p, { prefill: link, fromPending: true });
    });
  };

  /* §19.7. Safari and the installed app are two storages on an iPhone: a join here makes a copy the app
     never sees. So the card offers the app first — copy the invite, open the app, paste — and Safari
     second. It is shown whether or not Labs is on HERE: the question is which app, not which setting. */
  function landingCard(link, o) {
    const c = openCard('collab-landing', { label: 'Open this invite in the FreeMotion app' });
    c.appendChild(el('h2', 'fm-ask-title', 'Open this in your FreeMotion app'));
    const lb = bodyOf(c);
    lb.appendChild(el('div', 'collab-sub', 'Joining in Safari keeps this copy separate from your FreeMotion app.'));
    /* ⚠️ STEP 3 USED TO BE "Tap Join, then Paste" (S6 review) — in an installed app with Labs off, which is
       the default, there is no Join anywhere until Live collaboration is on, and the invite in Safari's
       storage is invisible to the app. So the steps say how to get to it, and what the button looks like. */
    const steps = el('ol', 'cl-steps');
    steps.appendChild(el('li', null, 'Tap Copy invite'));
    steps.appendChild(el('li', null, 'Open FreeMotion from your Home Screen'));
    steps.appendChild(el('li', null, 'If Live collaboration is off, turn it on in Settings → Labs'));
    steps.appendChild(el('li', null, 'On Home, tap ⎇ (Join a live project), then Paste'));
    lb.appendChild(steps);
    const acts = el('div', 'fm-ask-actions cl-acts');
    acts.appendChild(btn('fm-ask-cancel cl-here', 'Join here in Safari instead', function () {
      closeCard();
      U.resumePendingJoin(Object.assign({}, o || {}, { here: true }));
    }));
    const ci = btn('fm-ask-ok accent cl-copy', 'Copy invite', function () { copyPlain(link, 'Invite copied — now open FreeMotion from your Home Screen', ci); });
    acts.appendChild(ci);
    c.appendChild(acts);
    return c;
  }

  /* §12.2 check 1: "Turn on Live collaboration to join" [Turn on]. An invite is the one thing that may put
     a card on screen with Labs off — he tapped a link to get here. */
  function labsCard(o) {
    const c = openCard('collab-labs-ask', { label: 'Turn on live collaboration' });
    let keep = false;
    c._onclose = function () { if (!keep) clearPendingJoin(); };
    c.appendChild(el('h2', 'fm-ask-title', 'Turn on Live collaboration to join'));
    bodyOf(c).appendChild(el('div', 'collab-sub', 'Somebody sent you an invite to a live project. Live collaboration is still a preview, so it is off until you turn it on (Settings → Labs).'));
    const acts = el('div', 'fm-ask-actions');
    acts.appendChild(btn('fm-ask-cancel', 'Not now', function () { closeCard(); }));
    acts.appendChild(btn('fm-ask-ok accent cl-turnon', 'Turn on', function () {
      keep = true;
      closeCard();
      if (FM.settings && FM.settings.set) FM.settings.set('collabLabs', true);
      U.resumePendingJoin(o);
    }));
    c.appendChild(acts);
    return c;
  }

  /* Codes only is a DEVICE setting (§19.8), read wherever a relay would start — so flipping it has to
     reach anything already running: on, and the host's relay, a reconnect and a join in flight all stop
     (no socket stays open behind the switch); off, and a sharing host's relay starts. */
  let codesOnlyWas = null;
  function syncRelayMode() {
    const co = C.signal.codesOnly();
    const changed = codesOnlyWas !== null && codesOnlyWas !== co;
    codesOnlyWas = co;
    const s = C.session;
    if (co) {
      stopHostRelay();
      stopRecon();
      if (joinFlow && joinFlow.cancel) joinFlow.cancel();
    } else if (s && s.isOwner) startHostRelay();
    else if (s && !s.isOwner && s.online === false && !s.ended && !versionNote) startRecon(s.gpid, 'live');
    if (changed) { pushSettings(); redrawShare(); U.syncBanner(); }
  }

  /* ═══ INSTALL / UNINSTALL (§23) ═══════════════════════════════════════════════════════════════ */

  U.labsOn = function () {
    try { return !!(FM.settings && FM.settings.get && FM.settings.get('collabLabs')); } catch (e) { return false; }
  };
  U.isInstalled = function () { return installed; };

  const SHARE_SVG = 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v13M8 7l4-4 4 4';

  /* ⚠️ IT LIVES BESIDE EXPORT, WHEREVER EXPORT CURRENTLY IS — AND ON A PHONE THAT IS A DIFFERENT BAR.
     On a desktop `pcTransportLayout` MOVES #btn-export out of #topbar and down into the transport row,
     once, and latches; #topbar is then not on screen at all. So a share button placed into #topbar
     before that move and never looked at again is a button he cannot see.

     ⚠️ AND ON A PHONE #topbar IS `display:none` AT EVERY WIDTH, SO THERE WAS NO SHARE BUTTON AT ALL
     (queue 921 S3 review). The button was built, inserted beside #btn-export inside `<header id="topbar">`,
     given a zero box by `@media (max-width: 700px) { #topbar { display:none } }`, and never shown — with
     Labs on, on his iPhone, the whole owner half of this feature was unreachable, and so was the guest's
     Leave button, because this is the only door to the guest panel. The phone has its own bar,
     `#topbar-m`, with its own `#m-export`, and nothing was ever put in it. `pcTransportLayout` returns
     early below 701px, so nothing re-homed it either.
     So the placement is a question about the SCREEN, asked fresh on every install and again whenever the
     width crosses the breakpoint. Re-homing costs two getElementById and makes every order the same
     order. (queue 921 S3) */
  /* ⚠️ S7: ON A PHONE THE SHARE BUTTON IS NO LONGER IN #topbar-m — IT IS THE ROUND "person+" IN THE
     STAGE'S TOP-LEFT CORNER, where the people chip appears once a session is live. Measured at 380 px
     with Labs on: the bar holds back 42 · name · v-chip 65 · ? 42 · notes 42 · cog 42 · share 42 ·
     export 38, and the project-name field was left 34 px — "U.." for "Untitled", every project's name
     cut to one letter on his phone. That is exactly what D18 predicted ("the phone top bar has about 85 px
     to spare and the notes/cog gap is signed off (#189)") when it put the presence chip on the stage
     instead, and §18.5 drew the chip, alone, as "a single 28 px round person+ Share button". So that is
     the phone's Share: the same corner, the same look, and once somebody is in, the faces take its place
     (styles.css hides it while #collab-people is on the stage). Drawn against two other fixes first —
     the version chip shrunk to its icon (the name gets 69 px, and a signed-off chip loses its words) and
     the four bar icons narrowed (breaks the #189 notes/cog gap he approved) — see COLLAB-DESIGN.md §19.
     On a desktop nothing moves: beside Export, wherever Export currently lives. */
  function shareHost() {
    const phone = !window.matchMedia || window.matchMedia('(max-width: 700px)').matches;
    const st = document.getElementById('stage');
    const d = document.getElementById('btn-export');
    if (phone && st) return { before: null, parent: st, phone: true, stage: true };
    if (d && d.parentNode) return { before: d, parent: d.parentNode, phone: false };
    if (st) return { before: null, parent: st, phone: true, stage: true };
    return null;
  }

  const INVITE_SVG = 'M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M19 8v6M16 11h6';
  function makeShareButton() {
    const at = shareHost();
    let b = document.getElementById('btn-share');
    if (!at) return b || null;
    if (!b) {
      b = el('button', 'btn icon-btn');
      b.id = 'btn-share';
      b.type = 'button';
      // a second press on the button that opened the card CLOSES it (queue 944) — wherever the card sits
      /* queue 945: on a phone it opens Canvas settings with Friends big (U.openPeople), which never arms; on a PC, the Share card. */
      b.addEventListener('click', function (e) { e.stopPropagation(); if (card && card.isConnected) { closeCard(); return; } U.openPeople(); });
    }
    const mode = at.stage ? 'stage' : 'bar';
    if (b._mode !== mode) {
      b._mode = mode;
      b.textContent = '';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', at.stage ? '1.9' : '1.8');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('class', at.stage ? 'cp-plus' : 'ico');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', at.stage ? INVITE_SVG : SHARE_SVG);
      svg.appendChild(path);
      b.appendChild(svg);
      b.title = at.stage ? 'Share this project live — invite people' : 'Share this project live';
      b.setAttribute('aria-label', 'Share');
    }
    /* The stage version wears the people chip's own classes, so it IS that chip at rest: the same size,
       place and glass, and the same rules hide it (text editing, a phone selection). */
    b.className = at.stage ? 'collab-people cp-invite cs-stagebtn' : 'btn icon-btn';
    if (b.parentNode !== at.parent || (at.before ? b.nextSibling !== at.before : false)) at.parent.insertBefore(b, at.before);
    return b;
  }

  function makeJoinButton() {
    const already = document.getElementById('hm-join-btn');
    if (already) return already;
    const search = document.getElementById('hm-search-btn');
    if (!search || !search.parentNode) return null;
    const b = el('button', 'hm-search-btn');
    b.id = 'hm-join-btn';
    b.type = 'button';
    b.title = 'Join a live project';
    b.setAttribute('aria-label', 'Join a live project');
    b.textContent = '⎇';
    b.addEventListener('click', function () { U.join(); });
    search.parentNode.insertBefore(b, search);
    return b;
  }

  /* ⚠️ AN ENSURE, NOT A ONE-SHOT. `.hm-top` is built the first time Home renders, which on a cold boot
     into the editor is AFTER Labs has been synced — a one-shot install would leave the Join button
     missing until the next flip of the switch, which is the kind of "it works on my machine" the S0/S1
     notes keep warning about. Both makers return whatever is already there, so calling this on every
     Home build and every settings change costs two getElementById. */
  /* The breakpoint the share button's home depends on, watched only while the UI is installed — §23
     promises a solo user not one listener. `change` fires on the crossing, not on every resize. */
  let widthWatch = null, onWidth = null;

  U.install = function () {
    const first = !installed;
    installed = true;
    shareBtn = makeShareButton();            // an ENSURE and a RE-HOME: the bar it belongs in can change
    /* S7: comments and the role courtesies exist while Labs is on — the ruler marks for a project that has
       comments, and whatever the current session's role says. */
    if (C.comments && C.comments.install) { try { C.comments.install(); } catch (e) { C.lastError = e; } }
    applyRoleClasses();
    if (!joinBtn || !joinBtn.isConnected) joinBtn = makeJoinButton();
    if (!widthWatch && window.matchMedia) {
      try {
        widthWatch = window.matchMedia('(max-width: 700px)');
        onWidth = function () { if (installed) shareBtn = makeShareButton(); };
        if (widthWatch.addEventListener) widthWatch.addEventListener('change', onWidth);
        else if (widthWatch.addListener) widthWatch.addListener(onWidth);
      } catch (e) { widthWatch = null; onWidth = null; }
    }
    return first;
  };

  U.uninstall = function () {
    /* ⚠️ NO EARLY-OUT ON `installed` (queue 921 S3 review). The by-id sweep below is idempotent and
       cheap, and it is the ONLY thing that can clear a share button that came back after the switch was
       already off — which `pcTransportTeardown` did, by re-inserting the detached node it had borrowed.
       `if (!installed) return false` meant the one sweep that could have caught it never ran again. */
    const was = installed;
    installed = false;
    if (C.comments && C.comments.uninstall) { try { C.comments.uninstall(); } catch (e) {} }
    applyRoleClasses();
    stopCkpt();
    /* S6: the two invite cards are the exception — they are shown BECAUSE Labs is off (or before the
       question arises), and any setting that re-applies must not sweep away the card he is reading. */
    if (!card || (card.id !== 'collab-labs-ask' && card.id !== 'collab-landing')) closeCard();
    U.hideBanner();
    cancelKnocks('ended');
    /* BY ID, NOT BY THE REMEMBERED NODE. `pcTransportTeardown` can delete the button and a later
       install re-create it, so the module's own reference goes stale — and §23's promise is about what
       is IN THE PAGE, not about what this file remembers putting there. (queue 921 S3) */
    ['btn-share', 'hm-join-btn'].forEach(function (id) {
      const n = document.getElementById(id);
      if (n && n.parentNode) n.parentNode.removeChild(n);
    });
    shareBtn = null; joinBtn = null;
    if (widthWatch && onWidth) {
      if (widthWatch.removeEventListener) widthWatch.removeEventListener('change', onWidth);
      else if (widthWatch.removeListener) widthWatch.removeListener(onWidth);
    }
    widthWatch = null; onWidth = null;
    dropOffer();
    shareNote = null;
    if (joinLink) { try { joinLink.close(); } catch (e) {} joinLink = null; }
    /* S6: nothing the relay started may outlive the switch — no socket, no timer, no listener. */
    stopHostRelay();
    stopRecon();
    if (joinFlow && joinFlow.cancel) joinFlow.cancel();
    dropWake();
    if (resumeT) { clearTimeout(resumeT); resumeT = null; }
    unwatchDocIfIdle();
    return was;
  };

  /* The one entry point Settings calls, at boot and on every flip. Turning Labs OFF while a session is
     live ENDS it rather than hiding it — a switch that leaves a connection running behind a hidden UI is
     worse than no switch, and he can read the promise off the label. */
  U.syncLabs = function () {
    if (U.labsOn()) {
      const r = U.install();
      /* S5: this is also the one call every settings change makes, so the pointer and selection switches
         take effect here, on the next frame, rather than at the next thing somebody else does. */
      if (C.presence && C.presence.refresh) C.presence.refresh();
      syncRelayMode();
      if (fhostLive()) U.renderFriends(fhost);   // queue 945: the switch in the block turned it on — show Start sharing
      return r;
    }
    /* ⚠️ `C.end()` IS THE OWNER'S DOOR AND A GUEST WAS BEING PUSHED THROUGH IT (queue 921 S3 review).
       A guest's project is a LINKED copy: its card carries a `collab` record and its layers deliberately
       keep the HOST's ids. `C.end()` stops the session and detaches, but only `C.leave` calls
       `FM.projects.detachLinked`, so flipping the switch off left a project marked `collab`, holding
       another device's layer ids, with no session behind it — and then `uninstall()` took away the only
       UI that could ever detach it. Rejoining was refused by the same-device check, and tapping Share on
       it would arm it as a NEW room while its card still pointed at the old one. The distinction is the
       session's, so ask the session. */
    if (C.active) {
      const s = C.session;
      if (s && !s.isOwner) { try { C.leave({ keep: true }); } catch (e) {} }
      else {
        /* ⚠️ AN END IS AN END (S6 review). This told every guest "ended" and kept the room — so turning Labs
           back on, weeks later, and opening the project re-armed it on the same link and code, on the
           public relays, with a toast saying people could reconnect. Stop sharing drops the room; so does
           this. (A room PAUSED by opening another project is kept: its guests were told "paused".) */
        const pid = s && s.pid;
        try { C.end(); } catch (e) {}
        dropOffer();
        if (pid) { dropRoom(pid); if (hostRoomPid === pid) { hostRoom = null; hostRoomPid = null; } }
      }
    }
    const r = U.uninstall();
    if (fhost) U.renderFriends(fhost);           // queue 945: the block shows the Labs-off view, never stale live content
    U.friendsBar();
    return r;
  };

  C.ui = U;

})(window.FM);
