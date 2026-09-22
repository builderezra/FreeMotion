/* FreeMotion — live collaboration (queue 921), STAGE S1: constants and the shared namespace.
 *
 * ⚠️ THIS FILE IS INERT. It defines numbers and two pure functions and touches nothing else: no
 * listeners, no timers, no storage reads, no DOM. A solo user with Labs off must not be able to tell
 * it shipped, and the cheapest way to guarantee that is for there to be nothing here that can run.
 * The `#j=` join stash and the test-agent loader that spec §4.1 also parks in this file need a join
 * flow and an agent to exist first, so they arrive with S3 and S2 respectively — shipping them now
 * would mean a localStorage write and a 404 <script> on every load, for a feature nobody can reach.
 *
 * `active` and `role` are the flags the S0 hooks already read (`history.js:130`, `storage.js:446`,
 * `app.js:109`, index.html's `controllerchange`). They are false/owner and nothing in S1 sets them.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};

  /* Compatibility is by PROTO + SCHEMA_REV, never by app version — he ships 20–30 builds a day and
     exact-version gating would make joining nearly impossible (spec D13 / §14.7). */
  C.PROTO = 1;
  C.SCHEMA_REV = 1;

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
    ACK_CACHE: 64                          // §7.1 step 3: the acks kept per member for a resend
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

  /* Recomputed on demand; never at load. Returns null when the app pieces it hashes are absent, so a
     caller can say "cannot be measured" instead of inventing a number. */
  C.schemaFingerprint = function () {
    const P = C.path;
    if (!P || !FM.storage || !FM.storage._sanitizeLayers || !FM.fxRegistry) return null;
    const L = C.SCHEMA_FIXTURE();
    FM.storage._sanitizeLayers(L);
    const defs = (FM.fxRegistry.all() || []).map(function (e) {
      return [e.type, (e.params || []).map(function (p) {
        return [p.key, p.type, p.default, p.legacy, p.min, p.max, p.keyframable !== false ? 1 : 0];
      })];
    }).sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
    return P.cyrb53(P.canon(L) + '|' + P.canon(defs) + '|' + P.canon(C.OP_GRAMMAR) + '|r' + C.SCHEMA_REV);
  };

  /* Measured by `921 S1 SCHEMA_FP gate…`. When that test fails it prints the new number and the reason
     the rules moved; bump SCHEMA_REV and paste the number here — never the other way round. */
  C.SCHEMA_FP = 5865326250834970;

})(window.FM);
