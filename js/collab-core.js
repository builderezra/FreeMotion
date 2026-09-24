/* FreeMotion — live collaboration (queue 921): constants, the shared namespace, and (S2) the hooks
 * the rest of the app calls.
 *
 * ⚠️ STILL INERT AT LOAD. Nothing below runs on an ordinary page: no listeners, no timers, no storage
 * reads, no DOM. The hooks added in S2 are entry points that answer instantly while `active` is false,
 * and the only thing that flips `active` is `attach()`, which nothing outside a session calls. A solo
 * user with Labs off must not be able to tell this shipped.
 * The one exception is the TEST AGENT GATE at the foot of the file, which needs localhost AND an
 * explicit `fmtest=collab` in the query — two conditions neither of which a phone can satisfy.
 * The `#j=` join stash (S6) is the one other thing that runs at load, and only when the address
 * carries an invite — see its note at the foot of the file.
 *
 * `active` and `role` are the flags the S0 hooks already read (`history.js:130`, `storage.js:446`,
 * `app.js:109`, index.html's `controllerchange`).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};

  /* Compatibility is by PROTO + SCHEMA_REV, never by app version — he ships 20–30 builds a day and
     exact-version gating would make joining nearly impossible (spec D13 / §14.7). */
  C.PROTO = 1;
  /* Bumped to 2 in S2, which is what S1's note below said the bump was for: the fingerprint now
     includes the derived writers (§11.1), so a build whose autoFitDuration or loop-mode inheritance
     differs is refused at the door instead of disagreeing forever about a document nobody can see a
     difference in. */
  C.SCHEMA_REV = 2;

  C.active = false;      // no session is running
  C.role = 'owner';

  /* ═══ §21 limits, in one place so no module invents its own ═══════════════════════════════════ */
  C.LIMITS = Object.freeze({
    PEOPLE_DEFAULT: 8, PEOPLE_MAX_PC: 12, PEOPLE_MAX_PHONE: 6,
    LAYERS: 2000,                          // the same ceiling storage.applyScene refuses above
    TX_BYTES: 4 * 1024 * 1024, TX_OPS: 5000, OP_VALUE_BYTES: 2 * 1024 * 1024,
    STRING_LEAF: 200000,                   // text and caption bodies
    NAME: 32, COMMENT: 2000, COMMENTS: 500,
    /* §21 caps comments but says nothing about replies, and an uncapped list inside a capped one is
       not a cap: 5000 replies ride inside ONE `ai` value, from the lowest writable role (queue 921). */
    REPLIES: 200,
    DIAG: 500,                             // the host's diagnostics ring; a peer controls its fill rate
    TX_PER_SEC: 30, TX_BURST: 60, PRESENCE_PER_SEC: 30, OFFERS_PER_MIN: 10,
    TICK_PC: 100, TICK_PHONE: 125, BIG_ATOMIC: 8 * 1024, BIG_ATOMIC_HZ: 2, QUIET: 250,
    SWEEP_MIN: 1000, SWEEP_FACTOR: 20,
    COALESCE: 50,
    PING: 2000, OFFLINE_AFTER: 6000, PRESENCE_PURGE: 60000, LEASE_EXPIRY: 30000,
    ICE_GATHER: 3000, ICE_CONNECT: 20000,
    RING_BATCHES: 2000, RING_BYTES: 8 * 1024 * 1024,
    HASH_IDLE: 2000, HASH_MIN: 10000, HASH_ESCALATE: 3, HASH_WINDOW: 600000,
    OUTBOX_OPS: 5000, OUTBOX_BYTES: 4 * 1024 * 1024,
    UNDO_STEPS: 120,
    CKPT_EVERY: 600000, CKPT_KEEP: 10,
    KNOCK_TIMEOUT: 120000, PENDING_JOIN: 24 * 3600 * 1000,
    /* ⚠️ ONE NUMBER, NOT TWO (queue 921 S3 review). The joining device's wait and the owner's knock
       card were separate constants — 30 s against 120 s — so an owner who took 40 seconds to pick up his
       phone answered a guest that had already given up and closed its connection: `addPeer` then ran
       against a dead link and left a member in his people list who was never there. The joiner's wait is
       DERIVED from the knock it is waiting on, plus the room a handshake and a snapshot need. */
    JOIN_WAIT: 120000 + 20000,
    ACK_CACHE: 64,                         // §7.1 step 3: the acks kept per member for a resend
    /* ═══ S6: the relay and the reconnect (§13.5, §14.3, §14.4, §22) ═══
       §13.5's schedule: every 3 s for two minutes, every 10 s to ten minutes, every 30 s after that.
       ⚠️ OFFERS_PER_MIN IS PER SENDER, and OFFERS_ALL_PER_MIN caps the room (S6, measured against the
       spec's own numbers). §14.3 says a host rejects "more than 10 offers per minute", and §13.5 has a
       reconnecting guest retry every 3 s — twenty offers a minute from ONE honest guest, so read
       literally the host would refuse the very reconnect the schedule exists for, and two guests coming
       back after his phone unlocks would lock each other out. So the ten is per peer tag, the room as a
       whole takes thirty, and an attempt waits ANSWER_WAIT for its answer before the next one starts
       (≈ 6.7 offers a minute at the fastest cadence — under the ten). */
    RETRY_FAST: 3000, RETRY_FAST_FOR: 120000, RETRY_MID: 10000, RETRY_MID_UNTIL: 600000, RETRY_SLOW: 30000,
    ENV_SKEW: 120000, NONCE_TTL: 600000, OFFERS_ALL_PER_MIN: 30,
    RELAY_UP: 8000,                        // §22: no driver connected within 8 s → "Couldn't reach the free connection service"
    ANSWER_WAIT: 6000,                     // one offer's wait for its answer before the next attempt
    PJS_HEARTBEAT: 5000, PJS_ID_TAKEN_FOR: 60000, MQTT_KEEPALIVE: 30,
    PENDING_ADMIT: 4,                      // relay offers being answered at once, on the host — per door (S6 review)
    /* S6 review: a 9-character code lives this long after it was last on the owner's screen. Its topic is
       one fixed function of 45 bits, so a code that never expired could be cracked at leisure; one that
       lives half an hour cannot, and members come back through the hub, never through the code. */
    CODE_TTL: 30 * 60000
  });

  /* The op grammar (§6.1), as data, so the schema fingerprint below moves when the wire moves.
     `f` on `lr` and `a` on `ai` are optional; everything else listed is required. */
  C.OP_GRAMMAR = Object.freeze({
    s: ['p', 'v'], d: ['p'],
    li: ['id', 'a', 'v'], lr: ['id'], mv: ['id', 'a'],
    ai: ['p', 'k', 'v'], ar: ['p'], am: ['p', 'a']
  });

  /* ═══ SCHEMA FINGERPRINT (§14.7) ══════════════════════════════════════════════════════════════
   *
   * Two devices may run different builds; they may not run different DOCUMENT RULES. If the sanitizer,
   * an effect's parameter defaults or the op grammar change under one of them, the same document
   * normalizes to two different things and every hash after that disagrees for a reason no user can
   * see. So: hash the rules, pin the hash, and fail the suite when it moves.
   *
   * 📐 DECIDED AGAINST THE SPEC LINE, and §14.7 has been updated to match. It asked for
   * `cyrb53(canon(_sanitizeLayers(KITCHEN_SINK)) + canon(fxRegistry param defs) + canon(normalizeDerived(FIXTURE2)))`
   * with KITCHEN_SINK living in the suite. Two problems, both measured here:
   *   · `normalizeDerived` is the bridge's (S2). Including it now is impossible; leaving a term out
   *     silently would make the constant mean something different from what its own spec line says.
   *     It is added in S2, which bumps SCHEMA_REV and re-pins the constant — that is what the bump is
   *     for, and joining across the two stages is refused by PROTO/SCHEMA_REV anyway.
   *   · a fixture that lives in tests/tests.js while the constant lives here is two sources of truth
   *     for one number. Anyone editing the fixture to cover a new shape would "fix" the constant to
   *     match and the gate would quietly stop guarding anything. The fixture is therefore HERE, beside
   *     the constant, and the suite only compares.
   * The op grammar is included, which the spec line omitted: a changed op shape is exactly the kind of
   * incompatibility this gate exists to refuse, and it costs one canon() of a frozen literal.
   */
  C.SCHEMA_FIXTURE = function () {
    return [{
      id: 'fp_1', type: 'text', name: 'Fingerprint', start: 0, duration: 4,
      text: 'Ab', transform: { x: 1, y: 2, scale: 1, rotation: 0, opacity: 1 },
      captions: [{ start: 0, end: 1, text: 'one' }],
      masks: [{ id: 'fpm', mode: 'add', path: [[0, 0], [8, 0], [8, 8]] }],
      effects: [{ type: 'blur', enabled: true, params: { radius: 3 } }],
      audioFx: [{ type: 'reverb', enabled: true, params: {} }],
      behaviors: [{ type: 'wiggle', prop: 'x', enabled: true, params: {} }],
      speed: { kf: [{ t: 0, v: 1, e: 'linear' }, { t: 2, v: 2, e: 'easeIn' }] }
    }];
  };

  /* ═══ THE DERIVED-WRITER TERM (§14.7, added in S2) ═════════════════════════════════════════════
   *
   * The three writers in §11.1 edit the document FROM the document. Two devices that disagree about
   * what `autoFitDuration` computes will disagree about D forever, for a reason neither person can
   * see: each one keeps "correcting" the other, and the divergence detector resyncs in a loop. That is
   * exactly what the fingerprint is for, and S1 left it out only because the bridge did not exist yet.
   *
   * ⚠️ IT IS MEASURED BY RUNNING THEM, not by hashing their source. Hashing source text would move the
   * number when a comment changed — and this gate REFUSES A JOIN, so a false positive means two of his
   * own devices cannot talk to each other after a build that changed nothing. He ships 20–30 builds a
   * day (§14.7's own reasoning); the number must move when the RULES move and not before.
   *
   * ⚠️ AND THAT MEANS SWAPPING `FM.scene` FOR A FIXTURE, briefly. `autoFitDuration` and
   * `inheritLoopModes` read and write `FM.scene` directly — they take no argument — so the only way to
   * ask them what they compute is to give them something to compute it from. The swap is SYNCHRONOUS
   * (no awaits, no rAF can interleave), it restores in a `finally`, and it puts `FM.time` back too,
   * because autoFitDuration clamps the playhead. Parameterising the two functions instead would be a
   * refactor of app.js and timeline.js that S2 has no other reason to make, on the two functions the
   * whole timeline depends on — a much larger risk than a swap that cannot be observed.
   * The fixture carries FIXED uids, because `stampIds` mints random ones and a fingerprint that
   * changed every time it was measured would be worse than no fingerprint at all. */
  C.DERIVED_FIXTURE = function () {
    return {
      project: { width: 320, height: 240, fps: 30, duration: 0, background: '#000000', loopIn: 1, loopOut: 99 },
      layers: [
        { id: 'd1', type: 'shape', name: 'One', start: 0, duration: 4, loopMode: 'loop',
          transform: { x: { kf: [{ t: 0, v: 0, e: 'linear' }, { t: 2, v: 9, e: 'linear' }] }, y: 0, scale: 1, rotation: 0, opacity: 1 },
          effects: [{ uid: 'dfx00001', type: 'blur', enabled: true, params: {} }] },
        { id: 'd2', type: 'camera', name: 'Cam', start: 0, duration: 1,
          transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 } }
      ]
    };
  };
  C.derivedFingerprint = function () {
    const P = C.path;
    if (!P || !C.bridge || !FM.scene) return null;
    const saved = FM.scene, savedTime = FM.time;
    const fx = C.DERIVED_FIXTURE();
    try {
      FM.scene = fx;
      C.bridge.normalizeDerived();
    } catch (e) { return null; } finally { FM.scene = saved; FM.time = savedTime; }
    return P.canon({ project: C._viewOfProject(fx.project), layers: fx.layers });
  };

  /* Recomputed on demand; never at load. Returns null when the app pieces it hashes are absent, so a
     caller can say "cannot be measured" instead of inventing a number. */
  C.schemaFingerprint = function () {
    const P = C.path;
    if (!P || !FM.storage || !FM.storage._sanitizeLayers || !FM.fxRegistry) return null;
    const der = C.derivedFingerprint();
    if (der === null) return null;
    const L = C.SCHEMA_FIXTURE();
    FM.storage._sanitizeLayers(L);
    const defs = (FM.fxRegistry.all() || []).map(function (e) {
      return [e.type, (e.params || []).map(function (p) {
        return [p.key, p.type, p.default, p.legacy, p.min, p.max, p.keyframable !== false ? 1 : 0];
      })];
    }).sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
    return P.cyrb53(P.canon(L) + '|' + P.canon(defs) + '|' + P.canon(C.OP_GRAMMAR) + '|' + der + '|r' + C.SCHEMA_REV);
  };

  /* Measured by `921 S1 SCHEMA_FP gate…`. When that test fails it prints the new number and the reason
     the rules moved; bump SCHEMA_REV and paste the number here — never the other way round. */
  C.SCHEMA_FP = 7274450401628346;

  /* ═══ S2: THE HOOKS THE APP CALLS ═════════════════════════════════════════════════════════════
   *
   * Every one of these is a seam S0 already installed (§4.2). They exist here so that the S0 call
   * sites — `FM.collab.beforeSnap()`, `FM.collab.undo()`, `FM.collab.reachable(id)` — reach something
   * real once a session is attached, and answer in one comparison when one is not.
   *
   * ⚠️ `active` IS THE ONLY SWITCH, AND ONLY attach() TOUCHES IT. Every hook below is guarded on the
   * session existing rather than on `active` alone, so a half-torn-down session cannot throw inside a
   * commit — which would take the whole editor down for a feature the person may not even be using. */
  C.session = null;

  let undoHandover = false;     // §10.5: outlives the session, until the project is switched
  /* ⚠️ …AND SO MUST THE SESSION IT IS DELEGATED TO (queue 921 S3 review). `undoHandover` outliving the
     session is §10.5 working as designed — a solo undo right after a session must not revert a guest's
     work with a pre-session snapshot. But `detach()` nulled `C.session` and left the flag set, so
     `C.undo()` looked up a session that was gone and returned false FOREVER: from Stop sharing (or
     Labs off) until the project was switched, Ctrl-Z and both buttons silently did nothing, and the
     tidy-up that arming had committed to HIS document could no longer be undone at all. The flag is
     right; what was missing is somewhere for it to point. The stopped session still holds the undo
     stacks and still applies locally (`stop()` only closes links), so it is kept HERE and released by
     the same `onReset` that releases the flag — one lifetime, not two. */
  let handoverSession = null;
  let ticker = null;
  let pendingReload = false;

  function S() { return C.session; }
  /* The session UNDO may reach: the live one, or the last one while the hand-over is still on. */
  function US() { return C.session || (undoHandover ? handoverSession : null); }

  C.attach = function (session, opts) {
    const o = opts || {};
    /* ⚠️ IDEMPOTENT, AND IT HAS TO BE (queue 921). `share()` does not open a project, so nothing on
       that path reaches `history.reset()` → `onReset()`, which is the only thing that stands a session
       down. A second Share — a double tap, or re-arming after a peer dropped — therefore left session
       1 running: `ticker` was reassigned without the old interval being cleared, so `detach()` could
       only ever stop the newest one, and the orphan kept ticking for the life of the page with its
       peer endpoints still bound. After a project switch it would diff ITS base against whatever
       document was now open, and its room's ops would be applied straight into that document. */
    const prev = C.session;
    if (prev && prev !== session) { try { prev.stop('replaced'); } catch (e) {} }
    if (ticker) { clearInterval(ticker); ticker = null; }
    C.session = session;
    C.active = true;
    C.role = session.role || 'editor';
    undoHandover = true;
    handoverSession = session;
    if (C.bridge && session.adapter === C.bridge) C.bridge.install();   // a PlainAdapter session has no DOM to listen to
    /* S5: presence is the only other thing a session switches on, and it too refuses a PlainAdapter
       session — there is no screen to draw the other people on. Its timer follows `autoTick` like the
       engine's, so a suite that ticks by hand ticks presence by hand too. */
    if (C.presence) { try { C.presence.attach(session, o); } catch (e) { C.lastError = e; } }
    if (o.autoTick !== false) {
      const ms = (FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone()) ? C.LIMITS.TICK_PHONE : C.LIMITS.TICK_PC;
      ticker = setInterval(function () { try { session.tick('hot'); } catch (e) { C.lastError = e; } }, ms);
    }
    if (FM.history && FM.history.syncButtons) FM.history.syncButtons();
    /* S7: somebody who JOINS as a Viewer or Commenter is read-only from the first frame — no `role`
       message ever arrives to say so, because nothing changed. Found by photographing a Viewer's phone:
       the + and every inspector control were live until the first role change. */
    if (C.ui && C.ui.applyRoleClasses) { try { C.ui.applyRoleClasses(); } catch (e) {} }
    return session;
  };

  C.detach = function () {
    const s = C.session;
    C.session = null;
    C.active = false;
    C.role = 'owner';
    if (ticker) { clearInterval(ticker); ticker = null; }
    if (C.bridge) C.bridge.uninstall();
    /* …and every overlay, listener and timer presence made goes with it (§23: no session, no presence). */
    if (C.presence) { try { C.presence.detach(); } catch (e) {} }
    /* S6: the relay, the wake lock and any reconnect belong to the session they were started for. They
       live in collab-ui.js (they are what a person sees and what the network sees), and they are taken
       down HERE rather than at each of the four doors a session leaves by — Stop sharing, Labs off, a
       project switch, a leave — because a relay that outlived its session would keep answering
       strangers' offers for a room nobody is in. */
    if (C.ui && C.ui.onDetach) { try { C.ui.onDetach(s); } catch (e) {} }
    if (FM.history && FM.history.syncButtons) FM.history.syncButtons();
    /* §14.8: a service-worker takeover that arrived mid-session was held, because reloading then drops
       the connection and with it anything not yet sent — which reads as "it lost my work". */
    if (pendingReload) { pendingReload = false; try { C._reload(); } catch (e) {} }
    return s;
  };

  C.beforeSnap = function () { const s = S(); if (s) s.beforeSnap(); };
  C.afterCommit = function () { const s = S(); if (s) s.afterCommit(); };
  C.beforeFlush = function () { const s = S(); if (s) s.beforeFlush(); };

  /* §10.5: undo stays delegated after a session ends, until the project is switched or the page
     reloads — otherwise a solo undo right afterwards would revert a guest's work with a snapshot. */
  C.undoActive = function () { return undoHandover; };
  C.undo = function () { const s = US(); return s ? s.undo() : false; };
  C.redo = function () { const s = US(); return s ? s.redo() : false; };
  C.canUndo = function () { const s = US(); return s ? s.canUndo() : false; };
  C.canRedo = function () { const s = US(); return s ? s.canRedo() : false; };

  /* history.reset() runs on every project open, import and boot: the session stands down (§12.1
     `paused`) and the borrowed undo goes back. NOT gated on `active` — the hand-back is exactly the
     thing that has to happen after a session has already ended.

     ⚠️ A RESET IS NOT ALWAYS A DOCUMENT CHANGE, AND THE BOOT'S LAST ONE IS NOT (queue 921 S2).
     `js/app.js`'s boot ends with `FM.storage.load().then(restored => { if (restored) history.reset() })`
     — an ASYNC tail that lands whenever IndexedDB and the media hydrate are done, which on a phone with
     a real project is hundreds of milliseconds after the editor is already on screen and tappable.
     Anything that armed a session in that window — §12.4's reload recovery, which BY ITS NATURE runs at
     boot, or a tap on Share while `load()` is still in flight — was stood down by it: `stop('paused')`
     closes the link and sends `bye` to the room, so the recovered outbox is DROPPED with no toast, no
     report and no error anywhere. Measured in tier 3, one run in three: the guest sent `hello` and 10 ms
     later `bye`, and the offline edit it had just recovered never reached the host. That is exactly the
     loss §12.4 exists to prevent, and the reset causing it belongs to the very document the session is
     attached to.

     So: stand down when the open project is no longer the one this session is bound to — the same
     comparison `pushLocal` already uses as its lock — or when the caller SAYS the document is about to
     be replaced. `projects.open()` is that caller: it stands the session down while the id it is
     leaving is still the current one, which is the whole point of doing it there (see storage.js). */
  C.onReset = function (opts) {
    const s = S();
    if (!s) { undoHandover = false; handoverSession = null; afterReset(); return; }
    if (!(opts && opts.force) && s.pid && FM.projects && FM.projects.currentId && FM.projects.currentId() === s.pid) return;
    undoHandover = false;
    handoverSession = null;
    try { s.stop('paused'); } catch (e) {}
    C.detach();
    afterReset();
  };
  /* S6 (§12.1 paused → arming, §12.2 reconnect): the document that is open now may be one this device is
     sharing, or somebody else's shared copy. collab-ui.js decides — and does nothing at all with Labs
     off, which is the one question it asks first — on the next turn, once the open has finished. */
  function afterReset() { if (C.ui && C.ui.afterReset) { try { C.ui.afterReset(); } catch (e) {} } }

  /* §4.2: media a deleted layer still needs, because this person's undo can bring it back. */
  C.reachable = function (id) { const s = S(); return s ? s.reachable(id) : false; };
  C.isGuest = function () { return !!C.active && C.role !== 'owner'; };

  /* ═══ S7: WHAT THIS DEVICE'S ROLE LETS IT DO (§16) ═══════════════════════════════════════════════
   * One answer, asked by every courtesy in the app — the canvas and timeline gesture guards, the + button,
   * the inspector, the export gate, the comments card. ⚠️ THESE ARE COURTESIES. The host refuses anything a
   * role may not do whatever a device sends (collab-host.js `allowed`), and a read-only session writes
   * back from base whatever slipped past the UI (collab-session.js `revertToBase`). A device that lies
   * about its own role gains nothing: the host has never asked it.
   * A session that has ENDED is no longer anybody's room — the copy is his to do what he likes with, so
   * nothing is read-only after `bye` (the next open detaches it into a project of his own anyway). */
  C.myRole = function () {
    const s = C.session;
    if (!s || !C.active || s.ended || s.active === false) return 'owner';
    return s.isOwner ? 'owner' : (s.role === 'viewer' || s.role === 'commenter' ? s.role : 'editor');
  };
  C.readOnly = function () { const r = C.myRole(); return r === 'viewer' || r === 'commenter'; };
  C.canComment = function () { return C.myRole() !== 'viewer'; };
  /* The owner's room settings as this device last heard them (§20 `settings`). An owner reads his own. */
  C.roomSettings = function () { const s = C.session; return (s && s.roomSettings) || {}; };
  /* D11: viewers and commenters may export unless the owner turned it off. Everyone else always may. */
  C.canExport = function () { return !C.readOnly() || C.roomSettings().roExport !== false; };
  /* Somebody else would see a change right now — the question the canvas-size confirm asks (D10). */
  C.othersHere = function () {
    const s = C.session;
    if (!s || !C.active || s.ended || s.active === false) return false;
    return s.isOwner ? !!(s.peerIds && s.peerIds().length) : true;
  };
  C.deferReload = function () { pendingReload = true; return true; };
  /* One level of indirection, purely so the DEFERRAL is testable. A suite that could not stand in for
     the reload could only ever assert that a flag was set, which is the half of the rule that does not
     matter; the half that does is that the reload happens when the session lets go, and `location.reload`
     is not writable. (queue 921 S2) */
  C._reload = function () { location.reload(); };
  C._pendingReload = function () { return pendingReload; };
  C._undoHandover = function (v) { if (v !== undefined) { undoHandover = !!v; if (!undoHandover) handoverSession = null; } return undoHandover; };

  /* ═══ THE TEST-AGENT GATE (§25.3) ═════════════════════════════════════════════════════════════
   * Two conditions, both required, and the app cannot be pushed into this state from outside: the
   * page must be on loopback AND carry `fmtest=collab`. GitHub Pages satisfies neither, so the agent
   * cannot ship to a phone however the URL is decorated. index.html skips the service-worker
   * registration under the same flag, so a test instance is never served a cached shell. */
  const TEST_HOST = /^(127\.0\.0\.1|localhost|[a-z0-9-]+\.localhost)$/;
  C.testMode = function () {
    try {
      return TEST_HOST.test(location.hostname) && /(^|[?&])fmtest=collab(&|$)/.test(location.search);
    } catch (e) { return false; }
  };
  if (C.testMode()) {
    /* A Tier-3 instance is meant to start from nothing; a second run of the suite would otherwise
       inherit the linked copies the first one made, and the same-device refusal (§12.2 check 3) would
       fire on state the test did not put there. SYNCHRONOUS and here rather than in the agent, because
       the agent loads asynchronously and storage.load() would already have read the old index. */
    try { if (/(^|[?&])fmwipe=1(&|$)/.test(location.search)) localStorage.clear(); } catch (e) {}
    try {
      const sc = document.createElement('script');
      sc.src = 'tests/collab-agent.js';
      sc.async = false;
      document.head.appendChild(sc);
    } catch (e) {}
  }

  /* ═══ §14.2 THE `#j=` STASH (S6) ══════════════════════════════════════════════════════════════
   *
   * An invite link is `…/FreeMotion/#j=<44 characters>`. Two things can throw it away before anybody
   * reads it, and both run before the app has finished booting: the version tap's `?fresh=` reload
   * (index.html — `location.replace(base + '?fresh=' + …)`, which drops the fragment by construction)
   * and a service-worker `controllerchange` reload. So the invite is written to localStorage HERE, at
   * parse time, and the fragment is taken off the address bar in the same breath — a secret left in the
   * URL is a secret in the history list, in a bookmark and in a screenshot. `FM.collab.ui` picks it up
   * after Home has booted (`resumePendingJoin`).
   *
   * ⚠️ THE FRAGMENT AND NOTHING ELSE. GitHub Pages never sees a fragment; it sees every query string.
   * A `?j=` is never read, so an invite can only be one that never left the device it was opened on.
   * ⚠️ AFTER THE TEST GATE, NOT BEFORE IT: `fmwipe=1` clears localStorage above, and a stash written
   * first would be wiped by the very reset that lets a tier-3 frame start clean.
   * ⚠️ AND IT WRITES NOTHING THAT IS NOT AN INVITE: 44 base64url characters or no write at all, so a
   * hand-typed `#j=anything` cannot plant a value the join flow then has to distrust. */
  C.stashJoin = function (loc, hist) {
    const L = loc || location;
    let hash = '';
    try { hash = String(L.hash || ''); } catch (e) { return false; }
    const m = /^#j=([A-Za-z0-9_-]{44})(?:&|$)/.exec(hash);
    if (!m) return false;
    try { localStorage.setItem('fm.pendingJoin', JSON.stringify({ j: m[1], at: Date.now() })); } catch (e) { return false; }
    try { (hist || history).replaceState(null, '', String(L.pathname || '') + String(L.search || '')); } catch (e) {}
    return true;
  };
  C.stashJoin();
  /* ⚠️ AND AN INVITE PASTED INTO A TAB THAT IS ALREADY OPEN (S6 review). When only the fragment differs the
     browser does not load the page again — it fires `hashchange` and nothing else — so the stash above never
     ran: no Join sheet, and the 44-character secret sat in the address bar and the history. One listener,
     which does nothing at all unless the new fragment is an invite; the rest is the same path a cold start
     takes (Labs, the profile, the Join sheet), and with Labs off that is the "turn it on" card. */
  window.addEventListener('hashchange', function () {
    if (!C.stashJoin()) return;
    if (C.ui && C.ui.resumePendingJoin) { try { C.ui.resumePendingJoin(); } catch (e) { C.lastError = e; } }
  });

})(window.FM);
