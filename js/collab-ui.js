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
  let hostRoom = null;                       // { sid, sk, settings, members } for the project being shared

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
    scrim.addEventListener('pointerdown', function (e) { if (e.target === scrim && o.dismissable !== false) closeCard(); });
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
  }
  U.close = closeCard;
  U.openCard = function (id) { return document.getElementById(id); };

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
      c.appendChild(el('div', 'collab-sub', 'Your name and colour show up beside your cursor on the other person’s screen.'));
      const input = el('input', 'fm-ask-input collab-name');
      input.type = 'text';
      input.maxLength = (C.LIMITS && C.LIMITS.NAME) || 32;
      input.placeholder = 'Your name';
      input.setAttribute('aria-label', 'Your name');
      input.value = (have && have.name) || '';
      c.appendChild(input);
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
      c.appendChild(row);
      const err = el('div', 'collab-err hidden');
      c.appendChild(err);
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
    r.members = r.members || {};
    return r;
  }
  function saveRoom(pid, r) {
    try { localStorage.setItem(hostKey(pid), JSON.stringify(r)); } catch (e) {}
  }
  function dropRoom(pid) { try { localStorage.removeItem(hostKey(pid)); } catch (e) {} }

  /* 📐 `ask` DEFAULTS TO FALSE IN S3, AND §12.1's table now says why. It lists `ask:true`, which is the
     right default for the INVITE LINK — a link can be forwarded, so an unknown person can arrive and the
     owner must get a say. S3 has no link: the only way in is a connection code the owner read out and
     whose answer he pasted back himself, and §14.5 says in as many words that pasting the answer "counts
     as admitting the guest: no knock". Defaulting to true here would make the app ask him to approve the
     thing he just did, every time. The switch is live in the Share panel, so the knock card is reachable
     the moment he wants it; S6 ships the link and with it the `true` default for that half. */
  function newRoom() {
    const r = C.signal.newRoom();
    return {
      v: 1, sid: r.sid, sk: r.sk, created: r.created,
      settings: { ask: false, linkRole: 'editor', editorsInvite: false, roExport: true, max: (C.LIMITS && C.LIMITS.PEOPLE_DEFAULT) || 8 },
      members: {}, blocked: []
    };
  }

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
    return list;
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
    if (C.presence.follow(mid)) { closeCard(); return true; }
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
          return { label: p[1], action: function () { s.setPeerRole(mid, p[0]); redrawShare(); } };
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

  function removePerson(s, mid, name) {
    FM.ask({
      title: 'Remove ' + (cleanName(name) || 'them') + '?',
      message: 'They lose the live copy straight away. Their own copy of the project stays on their device.',
      ok: 'Remove', danger: true
    }).then(function (yes) {
      if (!yes) return;
      const ep = s._eps && s._eps[mid];
      if (ep) { try { ep.send('ctl', { t: 'bye', why: 'removed' }); } catch (e) {} try { ep.close(); } catch (e) {} }
      s.dropPeer(mid);
      redrawShare();
    });
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

  function redrawShare() { if (card && card.id === 'collab-share') U.share({ keepStep: true }); }

  /* §12.1 step 2 and §24: A CHECKPOINT BEFORE ANYTHING IS TOUCHED. Arming runs a pre-sanitise tidy-up
     over his document and commits it as an owner step (`C.share`), and from that moment other people can
     change it. The snapshot taken here is the last picture of the project as it was before he shared it,
     and §24 lists it as one of the four promises made about HIS data. `C.share()` (S2) does not write it
     because S2 had no arming UI; this is the arming UI.
     ⚠️ IT TRIMS ITSELF TO TEN rather than waiting for a collector. §12.4 puts `ckpt` in `FM.collab.gc()`'s
     hands, and §23's bargain with a solo user is that nothing runs at load — a boot-time IndexedDB sweep
     is the one thing in that table that would break it. A writer that keeps its own last ten needs no
     sweep at all, and `pruneOrphans` already skips everything under `collab:` (S0). */
  function checkpoint(pid) {
    if (!pid || !FM.storage || !FM.storage.collabPut) return Promise.resolve(false);
    const D = { project: C._viewOfProject(FM.scene.project), layers: FM.scene.layers };
    let body;
    try { body = JSON.stringify(D, FM.jsonReplacer); } catch (e) { return Promise.resolve(false); }
    const prefix = 'collab:ckpt:' + pid + ':';
    return FM.storage.collabPut(prefix + Date.now(), body).then(function () {
      if (!FM.storage.collabKeys) return true;
      return FM.storage.collabKeys(prefix).then(function (keys) {
        const keep = (C.LIMITS && C.LIMITS.CKPT_KEEP) || 10;
        const old = keys.slice(0, Math.max(0, keys.length - keep));
        return Promise.all(old.map(function (k) { return FM.storage.collabDel(k); })).then(function () { return true; });
      });
    }).catch(function () { return false; });
  }
  U._checkpoint = checkpoint;
  /* Test seam, the same one level of indirection `FM.collab._reload()` exists for (S2's note): the
     revocation above is a thing that has to be MEASURED as absent, and "no live offer" is not visible
     from outside the module any other way. */
  U._offer = function () { return offerLink; };

  U.share = function (opts) {
    const o = opts || {};
    if (!U.labsOn()) return Promise.resolve(null);
    if (!o.keepStep) { shareStep = 'main'; shareNote = null; }
    const s = C.session;
    /* A guest's Share button opens the same card showing the session he is IN, never an arm. */
    if (s && !s.isOwner) return drawGuestPanel(s);
    if (!s) {
      return U.profile().then(function (p) {
        if (!p) return null;
        const pid = currentPid();
        hostRoom = loadRoom(pid) || newRoom();
        saveRoom(pid, hostRoom);
        return checkpoint(pid).then(function () {
          C.share({ ownerInfo: { name: p.name, color: p.color } });
          U.syncBanner();
          return drawShare();
        });
      });
    }
    return Promise.resolve(drawShare());
  };

  function drawShare() {
    const s = C.session;
    if (!hostRoom) hostRoom = loadRoom(currentPid()) || newRoom();
    const anchor = shareBtn && shareBtn.getBoundingClientRect().width > 0 ? shareBtn : null;
    const c = openCard('collab-share', { label: 'Share this project', anchor: anchor });
    const head = el('div', 'cs-head');
    head.appendChild(el('h2', 'fm-ask-title', 'Share “' + projectName() + '”'));
    head.appendChild(el('div', 'cs-state', stateLine(s)));
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
    else {
      body.appendChild(memberRows(s));
      const addBtn = btn('cs-add', 'Add someone with a code', function () { shareStep = 'code'; redrawShare(); });
      addBtn.appendChild(el('span', 'cs-add-sub', 'No account, no server — you send them a code and they send one back' /* queue 921 S3: NOT "read out": the codes-only code is a ~250-character block you copy into a message. A short code you could read aloud needs the relay (S6), and saying "read" of a 250-char blob is a promise the screen does not keep. */));
      body.appendChild(addBtn);
      body.appendChild(askRow());
    }

    const foot = el('div', 'cs-foot');
    foot.appendChild(btn('cs-stop', 'Stop sharing', function () {
      FM.ask({
        title: 'Stop sharing?', danger: true, ok: 'Stop sharing',
        message: 'Everyone here keeps their own copy. The codes you have handed out stop working.'
      }).then(function (yes) {
        if (!yes) return;
        C.end();
        dropOffer();                 // …and the code he read out a minute ago really does stop working
        dropRoom(currentPid());
        hostRoom = null;
        U.syncBanner();
        closeCard();
        if (FM.toast) FM.toast('Sharing stopped', 2200);
      });
    }));
    foot.appendChild(btn('cs-done accent', 'Done', function () { closeCard(); }));
    c.appendChild(foot);
    return c;
  }

  function askRow() {
    const row = el('div', 'cs-row');
    row.appendChild(el('div', 'cs-rowlabel', 'When someone joins with a code'));
    const seg = el('div', 'cs-seg');
    [['ask', 'Ask me first'], ['in', 'Let them in']].forEach(function (p) {
      const on = (p[0] === 'ask') === !!(hostRoom && hostRoom.settings.ask);
      const b = btn('cs-segbtn' + (on ? ' on' : ''), p[1], function () {
        if (!hostRoom) return;
        hostRoom.settings.ask = p[0] === 'ask';
        saveRoom(currentPid(), hostRoom);
        redrawShare();
      });
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      seg.appendChild(b);
    });
    row.appendChild(seg);
    return row;
  }

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
    });
  }
  U._helloCap = function () { return { msgs: HELLO_MAX_MSGS, bytes: HELLO_MAX_BYTES }; };

  function maybeKnock(hello) {
    if (!hostRoom || !hostRoom.settings.ask) return Promise.resolve(true);
    return U.knock({ name: cleanName(hello.name), role: (hostRoom.settings.linkRole || 'editor'), dev: hello.dev });
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
    if (!card || card.id !== 'collab-share') return;
    const s = C.session;
    if (!s) return;
    const list = (C.presence && C.presence.people) ? C.presence.people() : [];
    const byMid = Object.create(null);
    list.forEach(function (pz) { byMid[pz.mid] = pz; });
    const rows = Array.prototype.slice.call(card.querySelectorAll('.cs-person[data-mid]'));
    if (!s.isOwner) {
      const shown = rows.map(function (r) { return r.getAttribute('data-mid'); }).join();
      if (shown !== list.map(function (pz) { return pz.mid; }).join()) { drawGuestPanel(s); return; }
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
  function drawGuestPanel(s) {
    const c = openCard('collab-share', { label: 'This shared project' });
    c.appendChild(el('h2', 'fm-ask-title', 'Shared with you'));
    c.appendChild(el('div', 'cs-state', s.ended ? 'Ended — your copy stays on this device'
      : s.online === false ? 'Offline — the live link dropped; your changes are kept here' : 'Live'));
    c.appendChild(el('div', 'collab-sub', 'You’re ' + (s.role === 'viewer' ? 'a Viewer' : s.role === 'commenter' ? 'a Commenter' : 'an Editor') + '.'));
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
      if (list.children.length) c.appendChild(list);
    }
    const foot = el('div', 'cs-foot');
    foot.appendChild(btn('cs-stop', 'Leave', function () {
      /* ⚠️ IT SAID "or delete it from this device" AND HAD NO DELETE BUTTON (queue 921 S3 review).
         `FM.ask` builds exactly two buttons, and `C.leave({keep:false})` — the delete branch — has no
         caller anywhere in the app. Offering a choice the dialog cannot express is worse than not
         offering it, so the sentence now describes what the two buttons do. §12.3's [Delete] arrives
         with the third-button ask, not before it. */
      FM.ask({ title: 'Leave this project?', message: 'You stop getting their changes. Your copy stays on this device — you can delete it from Home if you want.', ok: 'Keep my own copy', cancel: 'Cancel' })
        .then(function (yes) {
          if (!yes) return;
          C.leave({ keep: true });
          U.syncBanner();
          closeCard();
        });
    }));
    foot.appendChild(btn('cs-done accent', 'Done', function () { closeCard(); }));
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

  function drawJoin(profile) {
    const c = openCard('collab-join', { label: 'Join a live project' });
    /* ⚠️ CLOSING THE SHEET REALLY DOES CANCEL. Without this, tapping the scrim halfway through a join
       leaves an RTCPeerConnection gathering and a handshake waiting on a card nobody can see — and if it
       then succeeded it would open a project he had just backed out of. */
    c._onclose = function () { if (joinLink) { try { joinLink.close(); } catch (e) {} joinLink = null; } };
    c.appendChild(el('h2', 'fm-ask-title', 'Join a live project'));
    c.appendChild(el('div', 'collab-sub', 'Ask them to tap Share → Add someone with a code, then paste the code they send you.'));
    const fieldRow = el('div', 'cj-fieldrow');
    const input = el('input', 'fm-ask-input cj-code');
    input.type = 'text';
    input.spellcheck = false;
    input.autocapitalize = 'characters';
    input.placeholder = 'Paste a code';
    input.setAttribute('aria-label', 'Paste a code');
    fieldRow.appendChild(input);
    fieldRow.appendChild(btn('cj-paste', 'Paste', function () {
      /* Inside the tap, like §19.1's Copy — a clipboard read after an await is refused. */
      try {
        navigator.clipboard.readText().then(function (t) { input.value = t; }, function () {
          if (FM.toast) FM.toast('Paste it into the box yourself — this browser will not hand it over', 2800);
        });
      } catch (e) { if (FM.toast) FM.toast('Paste it into the box yourself', 2400); }
    }));
    c.appendChild(fieldRow);
    /* 📐 ONE LINE THAT REPLACES ITSELF, picked over a five-step checklist (the second drawn option,
       kept as join-stacked-*.png). Listing all five up front answers "how long will this take" and
       costs something worse: it presents five things that have not happened as a set of instructions,
       on the one screen where the person is already being asked to do something unfamiliar. */
    const status = el('div', 'cj-status');
    c.appendChild(status);
    const back = el('div', 'cj-back hidden');
    const backCode = el('div', 'cs-code');
    back.appendChild(el('div', 'cs-steplabel', 'Read this back to them'));
    back.appendChild(backCode);
    back.appendChild(btn('cs-copy', 'Copy code', function () { copyText(backCode.textContent); }));
    c.appendChild(back);
    /* §14.6's short authentication string. It is HIS half of the check the owner is making: the key
       rode inside the code, so only the two people can tell a relay from a friend. */
    const sasBox = el('div', 'cj-sas hidden');
    c.appendChild(sasBox);
    const acts = el('div', 'fm-ask-actions');
    acts.appendChild(btn('fm-ask-cancel', 'Cancel', function () { closeCard(); }));
    const go = btn('fm-ask-ok accent cj-go', 'Join', function () {
      go.disabled = true;
      guestJoin(input.value, profile, status, back, backCode, go, sasBox);
    });
    acts.appendChild(go);
    c.appendChild(acts);
    input.focus();
    return c;
  }

  function showSas(box, sas) {
    if (!box) return;
    box.textContent = '';
    if (!sas) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    box.appendChild(el('div', 'cs-steplabel', 'Read these letters back to them'));
    box.appendChild(el('div', 'cs-sas', sas));
    box.appendChild(el('div', 'collab-sub', 'They must see the same five. If they don\u2019t, somebody is in the middle \u2014 stop.'));
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
      showSas(sasBox, null);
      U.syncBanner();
      closeCard();
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
    return 'Could not join — ask for a fresh code.';
  }

  /* ═══ 4. THE KNOCK CARD (§19.3) ═══════════════════════════════════════════════════════════════
   * Requests queue one at a time, and one that is never answered declines itself after two minutes —
   * an owner who has put his phone down must not leave someone staring at "waiting" forever. */
  U.knock = function (info) {
    return new Promise(function (resolve) {
      knockQueue.push({ info: info || {}, resolve: resolve });
      pumpKnock();
    });
  };
  function pumpKnock() {
    if (pendingKnock || !knockQueue.length) return;
    const k = pendingKnock = knockQueue.shift();
    const host = el('div', 'collab-knock');
    host.id = 'collab-knock';
    host.setAttribute('role', 'alertdialog');
    const who = (cleanName(k.info.name) || 'Someone') + (k.info.dev ? ' (' + cleanName(k.info.dev) + ')' : '');
    host.appendChild(el('div', 'ck-text', who + ' wants to join as ' + labelFor(k.info.role) + '.'));
    const acts = el('div', 'ck-acts');
    acts.appendChild(btn('ck-no', 'Don’t allow', function () { answer(false); }));
    acts.appendChild(btn('ck-yes accent', 'Let in', function () { answer(true); }));
    host.appendChild(acts);
    document.body.appendChild(host);
    const t = setTimeout(function () { answer(false); }, (C.LIMITS && C.LIMITS.KNOCK_TIMEOUT) || 120000);
    function answer(yes) {
      clearTimeout(t);
      if (host.parentNode) host.parentNode.removeChild(host);
      pendingKnock = null;
      k.resolve(yes);
      pumpKnock();
    }
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
    if (typeof o.onClose === 'function') {
      const x = btn('cb-x', '\u00d7', function (e) { e.stopPropagation(); o.onClose(); });
      x.setAttribute('aria-label', o.closeLabel || 'Close');
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
    const s = C.session;
    if (!s || !C.active) return U.hideBanner();
    /* ⚠️ "THE OWNER ENDED THIS" IS NOT AN OFFLINE STATE (queue 921 S3 review). Nothing on either device
       said a word when a session stopped or the wire went — the adapter had no `onEnd`/`onOffline` at
       all — so the guest kept editing a project that was no longer syncing while its panel read "Live".
       And the offline line PROMISED A RE-SEND: there is no reconnect in S3 (`C.reopen` has no caller),
       so "will send when you reconnect" was untrue. It says what is true instead. */
    if (s.ended) return U.banner('This live session has ended — your copy stays on this device', { warn: true });
    if (s.online === false) return U.banner('Offline — the live link dropped; your changes are kept on this device', { warn: true });
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
  function shareHost() {
    const phone = !window.matchMedia || window.matchMedia('(max-width: 700px)').matches;
    const m = document.getElementById('m-export');
    const d = document.getElementById('btn-export');
    if (phone && m && m.parentNode) return { before: m, parent: m.parentNode, phone: true };
    if (d && d.parentNode) return { before: d, parent: d.parentNode, phone: false };
    if (m && m.parentNode) return { before: m, parent: m.parentNode, phone: true };
    return null;
  }

  function makeShareButton() {
    const at = shareHost();
    let b = document.getElementById('btn-share');
    if (!at) return b || null;
    if (!b) {
      b = el('button', 'btn icon-btn');
      b.id = 'btn-share';
      b.type = 'button';
      b.title = 'Share this project live';
      b.setAttribute('aria-label', 'Share');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('class', 'ico');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.8');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', SHARE_SVG);
      svg.appendChild(path);
      b.appendChild(svg);
      b.addEventListener('click', function () { U.share(); });
    }
    /* The two bars are different controls, not one control with two homes: #topbar-m's buttons are
       `.m-tbtn` with an `.m-ico` glyph and are hidden by the same body classes every other project
       control on that bar obeys, so the share button leaves with them the moment a selection owns the
       bar. Swapping the classes is what makes it BELONG to whichever bar it is in. */
    b.classList.toggle('m-tbtn', at.phone);
    b.classList.toggle('btn', !at.phone);
    b.classList.toggle('icon-btn', !at.phone);
    const svg = b.querySelector('svg');
    if (svg) svg.setAttribute('class', at.phone ? 'm-ico' : 'ico');
    if (b.parentNode !== at.parent || b.nextSibling !== at.before) at.parent.insertBefore(b, at.before);
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
    closeCard();
    U.hideBanner();
    knockQueue.length = 0;
    if (pendingKnock) { const k = pendingKnock; pendingKnock = null; const n = document.getElementById('collab-knock'); if (n && n.parentNode) n.parentNode.removeChild(n); k.resolve(false); }
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
      else { try { C.end(); } catch (e) {} }
    }
    return U.uninstall();
  };

  C.ui = U;

})(window.FM);
