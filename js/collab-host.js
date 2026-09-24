/* FreeMotion — live collaboration (queue 921), STAGE S1: the host sequencer (spec §7).
 *
 * One device owns the truth. Every change — including the owner's own — goes through this pipeline in
 * one fixed order, and what comes out the other end is a numbered batch that every device applies the
 * same way. That is the whole convergence argument: there is no merge algorithm, there is a queue.
 *
 *   validate → rate-limit → dedupe → role → lease → CAS → resolve+apply to base →
 *   invariants (on CLONES) → seq++ and ring → ack to the sender, b to everyone else → persist
 *
 * ⚠️ PURE. It never touches FM.scene, the DOM or storage. It holds a `base` (plain JSON) and calls the
 * adapter for the two things it cannot know: the document invariants, and how to reach the live tree.
 * That is what makes 300 rounds of seeded fuzz against three virtual guests possible at all.
 *
 * ⚠️ `invariants` IS REQUIRED, AND A MISSING HOOK THROWS. The sanitizer, the project clamp and the
 * parent-cycle repair are what stop one device's malformed document from becoming everybody's. A host
 * constructed without them would run, converge, and quietly ship a document no sanitizer ever saw —
 * a green test that proves nothing, which is the failure mode this repo has paid for most often. So:
 * construct it wrong and it refuses, loudly, at construction, not at the first hostile message.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};
  const P = C.path, D = C.diff;
  const canon = P.canon, eq = P.eq, clone = P.clone, cyrb53 = P.cyrb53;
  const LIM = C.LIMITS;
  const hasOwn = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  const isPlainObject = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };

  const ROLES = { owner: 1, editor: 1, commenter: 1, viewer: 1 };

  /* `b` on a queued (offline) op carries the value the author saw. `undefined` cannot travel as JSON,
     so it is sent as {"$u":1} (§6.1). */
  function decodeB(b) { return (b && typeof b === 'object' && b.$u === 1) ? undefined : b; }

  function layerOf(op) {
    if (!op) return null;
    if (op.o === 'li' || op.o === 'lr' || op.o === 'mv') return op.id || null;
    const p = op.p;
    return (Array.isArray(p) && p[0] === 'L' && p.length > 1) ? p[1] : null;
  }
  function layerById(doc, id) {
    const arr = doc && doc.layers;
    if (!Array.isArray(arr)) return undefined;
    const i = P.indexOfKey(arr, 'id', id);
    return i < 0 ? undefined : arr[i];
  }
  function anchorOf(arr, field, value) {
    const i = P.indexOfKey(arr, field, value);
    return i > 0 ? arr[i - 1][field] : null;
  }

  /* ═══ ROLE FILTER (§16.2) ══════════════════════════════════════════════════════════════════════
   * Authoritative. The guest also enforces it locally (§16.3) but only as a courtesy — this is the
   * copy that matters, because the only thing a guest's copy protects against is its own UI. */
  function isCommentsPath(p) { return p && p[0] === 'P' && p[1] === 'comments'; }
  function ownsComment(base, p, mid) {
    /* p is P/comments/#i:<c>[/replies/#i:<r>][/…]. Ownership is read from the host's own base, never
       from anything the message claims. */
    if (!isCommentsPath(p) || !P.isKeyedSeg(p[2])) return false;
    const list = base && base.project && base.project.comments;
    if (!Array.isArray(list)) return false;
    const ci = P.indexOfKey(list, 'id', P.keyedValue(p[2]));
    if (ci < 0) return false;
    const comment = list[ci];
    if (p[3] === 'replies' && P.isKeyedSeg(p[4])) {
      const rs = comment.replies;
      if (!Array.isArray(rs)) return false;
      const ri = P.indexOfKey(rs, 'id', P.keyedValue(p[4]));
      return ri >= 0 && !!rs[ri].by && rs[ri].by.mid === mid;
    }
    return !!comment.by && comment.by.mid === mid;
  }
  /* ⚠️ S7: A COMMENT'S AUTHOR AND TIME ARE THE HOST'S TO WRITE, FOR EVERY ROLE. §16.2 has the host
     overwrite `by`/`at` on an `ai` so "identity cannot be spoofed" — and then lets an Editor send any op,
     which includes `s P/comments/#i:c/by {name:'Ezra'}`: one op, and a comment reads as his, uneditable by
     the person who wrote it (ownsComment reads `by.mid`). The safer reading keeps §16.2's promise for
     everybody: inside `P/comments` an Editor (and the owner's own device, which never passes through here)
     may insert, remove and move whole comments and replies — the host stamps every insert — and may change
     `text` and `resolved`, which is §16.1's "edit, delete or resolve anyone's". Nothing else in a comment
     is writable by a peer: not `by`, `at`, `id`, the pin (`lid`/`t`), and not the whole list at once — the
     one `s` it accepts on `P/comments` itself is the FIRST list, where base has none, and every comment in
     it is stamped as the sender's (`firstList`, `stampList`). A whole list that arrives where base already
     has one is never a rewrite: the host turns it into one insert per comment base does not have
     (`lateList`, `listToInserts`). */
  function editorCommentOp(op, base) {
    const p = op.p;
    /* ⚠️ AN `ai` IS AN UPSERT (collab-diff.js applyAi), SO "INSERT" IS A QUESTION ABOUT BASE (S7 review).
       Only a comment or a reply, only keyed by its `id` (a `#u:` key stores an element with no id, which
       makes the id-keyed list atomic on every device for good — collab-path.js arrayMode), and an insert
       on an id that already exists keeps its author, time and pin (stampAuthor), so it can change the
       words and the resolved flag and nothing §16.2 keeps for the host. */
    if (op.o === 'ai') return isCommentInsert(op) && commentKeyOk(op);
    if (op.o === 'ar' || op.o === 'am') return true;
    if (op.o === 's' && p.length === 2) return firstList(op, base);
    if (op.o !== 's' && op.o !== 'd') return false;
    const last = p[p.length - 1];
    if (last !== 'text' && last !== 'resolved') return false;
    return (p.length === 4 && P.isKeyedSeg(p[2])) || (p.length === 6 && P.isKeyedSeg(p[2]) && p[3] === 'replies' && P.isKeyedSeg(p[4]) && last === 'text');
  }
  /* The FIRST comment in a project whose document has no list yet does not arrive as an `ai` — the diff
     sees a key only live has and says `s P/comments [the comment]`. Refusing it would make the first
     comment impossible for a Commenter; accepting it unexamined would let anybody plant a whole list of
     comments in anybody's name. So it is accepted only where base has NO list, from anybody who may
     comment, and resolveOp stamps every element in it with the SENDER as author, exactly as an `ai`. */
  function firstList(op, base) {
    const have = base && base.project && base.project.comments;
    return Array.isArray(op.v) && !Array.isArray(have);
  }
  /* ⚠️ …AND ONE THAT ARRIVES WHEN A LIST ALREADY EXISTS IS NOT A ROLE QUESTION AT ALL (S7 review). Two people
     posting the first comment at once both send a whole list against a base with none, and the second one's
     was refused as 'role' and lost — an Editor was told "you can only comment". It is still never applied
     as a list (`allowed` keeps refusing a rewrite, above): the host turns it into one stamped insert per
     comment base does not have (`listToInserts`), which is exactly what separate `ai`s would have done, and
     hands the sender the real list back. So a whole-list set can never replace, re-author or re-pin anything
     that exists. Only from a role that may add a comment at all. */
  function lateList(role, op, base) {
    if (role !== 'editor' && role !== 'commenter') return false;
    if (!op || op.o !== 's' || !Array.isArray(op.p) || op.p.length !== 2 || !isCommentsPath(op.p) || !Array.isArray(op.v)) return false;
    return !!(base && base.project && Array.isArray(base.project.comments));
  }
  function isCommentInsert(op) {
    const p = op && op.p;
    if (!op || op.o !== 'ai' || !Array.isArray(p) || !isCommentsPath(p)) return false;
    return p.length === 2 || (p.length === 4 && P.isKeyedSeg(p[2]) && p[3] === 'replies');
  }
  function commentKeyOk(op) { return P.isKeyedSeg(op.k) && P.keyedField(op.k) === 'id'; }
  function allowed(role, op, base, mid) {
    if (role === 'owner' || role === 'editor') return !isCommentsPath(op.p) || editorCommentOp(op, base);
    if (role !== 'commenter') return false;                 // viewer, or anything unknown
    const p = op.p;
    if (op.o === 's' && Array.isArray(p) && p.length === 2 && isCommentsPath(p)) return firstList(op, base);
    if (op.o === 'ai') {
      /* A new comment, or a reply — keyed by its id, and NEW. An `ai` on an id that exists is an upsert
         that would rewrite somebody else's words under their name (S7 review), so on an existing id it is
         only his own. */
      if (!isCommentInsert(op) || !commentKeyOk(op)) return false;
      const at = p.concat(op.k);
      if (D.valueAt(base, at) !== undefined) return ownsComment(base, at, mid);
      return true;
    }
    /* Taking his own `resolved` away is how his own Undo of a Resolve arrives (invertStep turns an `s` whose
       value was absent into a `d`), and refusing it told him "you can only comment" (S7 review). */
    if (op.o === 'd') {
      if (!Array.isArray(p) || p.length !== 4 || p[3] !== 'resolved') return false;
      return ownsComment(base, p, mid);
    }
    if (op.o === 's') {
      if (!Array.isArray(p)) return false;
      const last = p[p.length - 1];
      if (last !== 'text' && last !== 'resolved') return false;
      if (p.length !== 4 && p.length !== 6) return false;    // …/#i:c/text  or  …/#i:c/replies/#i:r/text
      return ownsComment(base, p, mid);
    }
    if (op.o === 'ar') {
      if (!Array.isArray(p)) return false;
      if (p.length !== 3 && p.length !== 5) return false;
      return ownsComment(base, p, mid);
    }
    return false;
  }

  /* ═══ VALIDATION (§7.1 step 1, §21) ════════════════════════════════════════════════════════════
   * Everything a peer sends is untrusted (§14.9), including the owner's. A failure rejects the WHOLE
   * tx rather than the offending op: a message that is malformed anywhere was not produced by a
   * FreeMotion that agrees with us about the document, so trusting the rest of it is a guess. */
  function badValue(v, depth) {
    const d = depth || 0;
    if (d > 32) return 'deep';
    if (v === null) return null;
    const t = typeof v;
    if (t === 'number') return isFinite(v) ? null : 'number';
    if (t === 'string') return v.length > LIM.STRING_LEAF ? 'string' : null;
    if (t === 'boolean') return null;
    if (t !== 'object') return 'type';                      // undefined / function / symbol cannot travel
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) { const e = badValue(v[i], d + 1); if (e) return e; }
      return null;
    }
    const ks = Object.keys(v);
    for (let i = 0; i < ks.length; i++) {
      if (ks[i] === '__proto__') return 'proto';
      const e = badValue(v[ks[i]], d + 1); if (e) return e;
    }
    return null;
  }
  function validOp(op) {
    if (!op || typeof op !== 'object') return 'shape';
    const need = C.OP_GRAMMAR[op.o];
    if (!need) return 'kind';
    for (let i = 0; i < need.length; i++) {
      const f = need[i];
      if (f === 'a') continue;                               // an anchor may legitimately be null
      if (!hasOwn(op, f)) return 'field';
    }
    if (op.o === 'li' || op.o === 'lr' || op.o === 'mv') {
      if (typeof op.id !== 'string' || !P.KEYVAL_RE.test(op.id)) return 'id';
      if (op.o !== 'lr' && op.a != null && (typeof op.a !== 'string' || !P.KEYVAL_RE.test(op.a))) return 'anchor';
    } else {
      if (!P.valid(op.p)) return 'path';
      /* ⚠️ NO BARE-ROOT WRITES. `s{p:['L'], v:[…]}` would replace the whole layer list in one op, which
         is the one way a tx could put two layers with the same id into base — and every id-keyed walk
         in the app is ambiguous after that (which of the two does `parent` mean?). Nothing the diff
         emits is ever a bare root, so refusing them costs nothing and closes the hole. */
      if (op.p.length < 2) return 'root';
      /* ⚠️ …AND THE BARE ROOT WAS NOT THE ONLY WAY IN. `s{p:['L',<id>]}` is one segment deeper and does
         the same damage from the other end: `v:{id:'B'}` renames a layer to an id another layer already
         has, and `v:{name:'x'}` deletes its `id` outright (patchObject drops what `v` omits), which
         leaves a layer no path can name, no sanitiser can see and no diff can remove — while canon()
         still hashes it, so every device converges on it. `d` on `['L',<id>,'id']` reaches the same
         state in one op. Nothing the diff emits is either shape (it descends to leaves), so refusing
         them costs nothing, which is the same argument the bare-root rule makes (queue 921). */
      if ((op.o === 's' || op.o === 'd') && P.namesKeyField(op.p)) return 'key';
      if (op.o === 's' && P.isElementPath(op.p) && !isPlainObject(op.v)) return 'element';
      if (op.o === 'ai' && !P.isKeyedSeg(op.k)) return 'k';
      if ((op.o === 'ai' || op.o === 'am') && op.a != null && !P.isKeyedSeg(op.a)) return 'anchor';
      if ((op.o === 'ar' || op.o === 'am') && !P.isKeyedSeg(op.p[op.p.length - 1])) return 'path';
    }
    if (hasOwn(op, 'v')) {
      const e = badValue(op.v, 0);
      if (e) return 'value:' + e;
      if (canon(op.v).length > LIM.OP_VALUE_BYTES) return 'value:size';
    }
    return null;
  }
  function validateTx(tx) {
    if (!tx || typeof tx !== 'object') return 'shape';
    /* ⚠️ A SAFE INTEGER, not just a whole number (S8, the adversarial fuzz). `cid: 1e300` passed — it is ≥ 0 and
       floor() leaves it alone — and became the member's `lastCid`, so every later tx from that device, counted
       1, 2, 3… as an honest one counts, read as a duplicate of something already done and was dropped without a
       word for the rest of the session. Past 2^53 a counter cannot even count by one. */
    if (!Number.isSafeInteger(tx.cid) || tx.cid < 0) return 'cid';
    if (!Array.isArray(tx.ops)) return 'ops';
    if (tx.ops.length > LIM.TX_OPS) return 'ops:count';
    let bytes = 0;
    for (let i = 0; i < tx.ops.length; i++) {
      const e = validOp(tx.ops[i]);
      if (e) return 'op[' + i + ']:' + e;
      bytes += canon(tx.ops[i]).length;
      if (bytes > LIM.TX_BYTES) return 'bytes';
    }
    return null;
  }

  /* ═══ THE HOST ═════════════════════════════════════════════════════════════════════════════════ */

  /* opts:
   *   base        {project, layers} — taken BY REFERENCE and mutated in place; the caller owns it
   *   invariants  {layer(clone), project(clone), layers(cloneArray)->idOrder|null}  REQUIRED
   *   now()       clock (injected so the fuzz is seeded and the rate limiter testable)
   *   rand()      0..1 (ids)
   *   ownerInfo   {name, color} — the owner is never in `members`, so without this his own comments
   *               are stamped with an empty name and the default grey while every guest's are right
   *   epoch       string; a fresh one per host page lifetime, which is what resets seq
   *   live(ops)   optional: apply a sequenced batch to the live tree (the bridge's job, S2)
   *   afterBatch()optional: §7.1 step 12, autosave
   */
  function Host(opts) {
    const o = opts || {};
    const inv = o.invariants;
    if (!inv || typeof inv.layer !== 'function' || typeof inv.project !== 'function' || typeof inv.layers !== 'function') {
      throw new Error('FM.collab.Host needs invariants {layer, project, layers} — without them the host would sequence documents no sanitizer ever saw');
    }
    const now = o.now || function () { return Date.now(); };
    const rand = o.rand || Math.random;

    const base = o.base || { project: {}, layers: [] };
    const members = Object.create(null);
    const leases = Object.create(null);                      // layerId -> mid
    const ring = [];
    let ringBytes = 0;
    const lastBy = new Map();                                // pathKey -> mid (LRU, diagnostics + undo blame)
    const lastW = new Map();                                 // pathKey -> {seq, by} (diagnostics)
    const diag = [];

    const H = {
      base: base,
      epoch: o.epoch || ('e' + Math.floor(rand() * 0x100000000).toString(36)),
      seq: 0,
      ownerMid: o.ownerMid || 'o',
      members: members, leases: leases, ring: ring, lastBy: lastBy, lastW: lastW, diag: diag
    };
    /* The owner is not in `members` — nobody sends him a join — so his name and colour have to reach
       the host some other way or every comment he writes is stamped anonymous. §17.1's card renders
       `by.name` and `by.color`. Same clamps H.join applies, so the two paths cannot drift. */
    H.ownerSelf = {
      mid: H.ownerMid,
      name: (o.ownerInfo && typeof o.ownerInfo.name === 'string') ? o.ownerInfo.name.slice(0, LIM.NAME) : '',
      color: (o.ownerInfo && /^#[0-9a-f]{6}$/i.test(o.ownerInfo.color || '')) ? o.ownerInfo.color : '#888888'
    };

    /* ⚠️ EVERY DIAGNOSTICS ENTRY GOES THROUGH HERE, BECAUSE A PEER CONTROLS THE FILL RATE. `ring` is
       capped, `lastBy`/`lastW` are capped, `m.acks` is capped — `diag` was a bare array, and it is the
       one a remote member can grow at will: 5000 malformed txs from a VIEWER (a role that cannot write
       a single op) left 5000 entries, because §7.1 validates before it rate-limits, so the token bucket
       never even saw them. On a phone host that is the session's memory. Repeats collapse into a count
       rather than a row each, which also makes a flood legible instead of burying what it is drowning
       out (queue 921). */
    function note(e) {
      const last = diag[diag.length - 1];
      if (last && last.what === e.what && last.mid === e.mid && last.why === e.why) {
        last.n = (last.n || 1) + 1; last.t = e.t; return;
      }
      diag.push(e);
      while (diag.length > LIM.DIAG) diag.shift();
    }

    /* ── members ─────────────────────────────────────────────────────────────────────────────── */
    H.join = function (mid, info) {
      const i = info || {};
      members[mid] = {
        mid: mid, role: ROLES[i.role] ? i.role : 'viewer',
        name: typeof i.name === 'string' ? i.name.slice(0, LIM.NAME) : '',
        color: /^#[0-9a-f]{6}$/i.test(i.color || '') ? i.color : '#888888',
        lastCid: -1, acks: [], tokens: LIM.TX_BURST, tokenAt: now(), flagged: false,
        fixTokens: LIM.FIX_BURST, fixAt: now()
      };
      return members[mid];
    };
    H.part = function (mid) {
      delete members[mid];
      Object.keys(leases).forEach(function (lid) { if (leases[lid] === mid) delete leases[lid]; });
    };
    /* ⚠️ ONLY AN EDITOR MAY HOLD A LEASE (§17.2), so a demotion lets go of whatever the member held
       (S5 review). A lease is checked when it is TAKEN; an editor demoted with the text editor open kept
       the layer, and the owner was refused every edit on it for as long as that editor stayed open. */
    H.setRole = function (mid, role) {
      if (!members[mid] || !ROLES[role]) return;
      members[mid].role = role;
      if (role !== 'editor') Object.keys(leases).forEach(function (lid) { if (leases[lid] === mid) delete leases[lid]; });
    };
    H.grantLease = function (lid, mid) { if (!leases[lid]) { leases[lid] = mid; return true; } return leases[lid] === mid; };
    H.releaseLease = function (lid) { delete leases[lid]; };

    /* ── the pipeline ────────────────────────────────────────────────────────────────────────── */

    function takeToken(m) {
      const t = now();
      const refill = (t - m.tokenAt) / 1000 * LIM.TX_PER_SEC;
      m.tokens = Math.min(LIM.TX_BURST, m.tokens + refill);
      m.tokenAt = t;
      if (m.tokens < 1) return false;
      m.tokens -= 1;
      return true;
    }

    /* §7.1 step 6. Stateless, so it survives a host reload — which is the whole reason offline ops
       carry `b`/`bh` rather than the host remembering what each guest last saw. */
    function cas(op) {
      if (op.o === 'lr' || op.o === 'ar') {
        const el = (op.o === 'lr') ? layerById(base, op.id) : D.valueAt(base, op.p);
        if (el === undefined) return 'noop';                 // already gone: the intent is met
        if (op.bh == null) return 'ok';
        return (cyrb53(canon(el)) === op.bh) ? 'ok' : 'clash';
      }
      /* §13.3 says a new key never clashes, and that is true — but `li` and `ai` are UPSERTS
         (collab-diff.js:238, 293), so "new key" is a question about base, not about the op kind.
         Answering it by kind meant a queued insert for an id that is back — which is what an undo of a
         delete, or a re-send from an outbox, produces — silently overwrote whatever had been done to it
         while its author was offline, with rej=[], lost=[] and nothing to show the person. patchObject
         also DELETES the keys the stale copy does not carry, so it reverted the whole element to the
         offline author's snapshot rather than just the fields it named (queue 921). */
      if (op.o === 'li' || op.o === 'ai') {
        const el = (op.o === 'li') ? layerById(base, op.id) : D.valueAt(base, op.p.concat(op.k));
        if (el === undefined) return 'ok';                   // genuinely a new key: §13.3 as written
        if (!hasOwn(op, 'b')) return 'ok';                   // no CAS information was offered
        if (eq(el, decodeB(op.b))) return 'ok';
        /* Already what the author wanted. Still 'ok' rather than 'noop', because the op also carries a
           POSITION: apply() reports 'noop' only when the anchor did not move it either. The key is
           asserted the way apply() asserts it, so an op whose `v` omits its own key is not a clash. */
        const want = clone(op.v);
        if (isPlainObject(want)) {
          if (op.o === 'li') want.id = op.id;
          else want[P.keyedField(op.k)] = P.keyedValue(op.k);
          if (eq(el, want)) return 'ok';
        }
        return 'clash';
      }
      if (op.o === 'mv' || op.o === 'am') return 'ok';        // applies if it still exists; apply() says 'gone' if not
      const cur = D.valueAt(base, op.p);
      if (!hasOwn(op, 'b')) return 'ok';                      // no CAS information was offered
      if (eq(cur, decodeB(op.b))) return 'ok';
      if (op.o === 's' && eq(cur, op.v)) return 'noop';        // somebody already made it what we wanted
      if (op.o === 'd' && cur === undefined) return 'noop';
      return 'clash';
    }

    /* Resolve the anchor a `li`/`mv`/`ai`/`am` will ACTUALLY use, and strip the fields that only
       travelled for CAS. The resolved op is what gets sequenced, so every device splices identically
       even when one of them never saw the anchor layer. */
    function resolveOp(op, m) {
      const r = { o: op.o };
      if (op.o === 'li' || op.o === 'mv' || op.o === 'lr') {
        r.id = op.id;
        if (op.o !== 'lr') r.a = D.resolveAnchor(base.layers || [], 'id', op.a);
        if (op.o === 'li') r.v = clone(op.v);
        if (op.o === 'lr' && op.f === 1) r.f = 1;
      } else {
        r.p = op.p.slice();
        if (op.o === 's') { r.v = clone(op.v); stampList(r, m); }
        if (op.o === 'ai') {
          r.k = op.k; r.v = clone(op.v);
          const arr = D.valueAt(base, op.p);
          const field = P.keyedField(op.k);
          r.a = Array.isArray(arr) ? D.resolveAnchor(arr, field, op.a == null ? null : P.keyedValue(op.a)) : null;
          if (r.a != null) r.a = P.keyedSeg(field, r.a);
          stampAuthor(r, m);
        }
        if (op.o === 'am') {
          const arr = D.valueAt(base, op.p.slice(0, -1));
          const field = P.keyedField(op.p[op.p.length - 1]);
          r.a = Array.isArray(arr) ? D.resolveAnchor(arr, field, op.a == null ? null : P.keyedValue(op.a)) : null;
          if (r.a != null) r.a = P.keyedSeg(field, r.a);
        }
      }
      return r;
    }
    /* §16.2, last bullet: identity on a comment or reply is written by the HOST, for every role, so it
       cannot be spoofed by the device that sent it — and §16.2's first bullet: "the element IS
       VALIDATED AGAINST §17.1". That second half did not exist, and the two halves are the same
       sentence: stamping only the element that was inserted let a commenter — the lowest writable
       role — post a comment carrying a REPLY whose `by` named the owner. The host then agreed (
       ownsComment reads base, so the words became Ezra's, uneditable even by the person who planted
       them) and every device rendered them under his name. Nothing downstream would ever have caught
       it: the sanitisers in storage.js are layer-shaped and never look at project.comments, so
       whatever an `ai` carries is what the session stores, hashes and shows, forever (queue 921). */
    const COMMENT_KEYS = { id: 1, by: 1, at: 1, text: 1, lid: 1, t: 1, resolved: 1, replies: 1 };
    const REPLY_KEYS = { id: 1, by: 1, at: 1, text: 1 };
    /* ⚠️ THE AUTHORS OF WHAT WAS DELETED (S7 review). An Undo of a comment delete arrives as an ordinary
       `ai` carrying the whole thread — and stamping it as the sender re-authored the comment AND every
       reply inside it as whoever pressed Undo: Sam's reply read as Mia's, editable by Mia and no longer by
       Sam. The host remembers each comment and reply it removes, and a removed id that comes back comes
       back as it was: its author, its time and its words. (Words included, so nobody can bring an id
       back with new text under somebody else's name.) Per host lifetime, capped. */
    const gone = new Map();
    function goneKey(isReply, id) { return (isReply ? 'r:' : 'c:') + id; }
    function remember(el, isReply) {
      if (!isPlainObject(el) || typeof el.id !== 'string') return;
      gone.delete(goneKey(isReply, el.id));
      gone.set(goneKey(isReply, el.id), { by: clone(el.by), at: el.at, text: el.text });
      if (!isReply && Array.isArray(el.replies)) el.replies.forEach(function (r) { remember(r, true); });
      while (gone.size > 2000) gone.delete(gone.keys().next().value);
    }
    H._gone = gone;
    /* A Commenter may bring back only what was his (the Undo of his own delete); an Editor may bring back
       anybody's, since he may delete anybody's. */
    function goneRefused(m, op) {
      if (!m || m.role !== 'commenter' || !isCommentInsert(op) || !P.isKeyedSeg(op.k)) return false;
      const was = gone.get(goneKey(op.p.length === 4, P.keyedValue(op.k)));
      return !!was && !(was.by && was.by.mid === m.mid);
    }
    function stampAuthor(r, m) {
      const p = r.p;
      const isComment = isCommentsPath(p) && (p.length === 2 || (p.length === 4 && p[3] === 'replies'));
      if (!isComment || !isPlainObject(r.v)) return;
      const isReply = p.length === 4;
      /* ⚠️ AN INSERT ON AN ID THAT IS ALREADY THERE IS AN UPSERT (S7 review): patchObject would delete every
         key the value leaves out — the pin, the resolved flag, every reply — and the stamp would make it
         the sender's. It changes the words and the resolved flag, and nothing else. */
      const cur = D.valueAt(base, p.concat(r.k));
      if (isPlainObject(cur)) {
        const v = clone(cur);
        if (typeof r.v.text === 'string') v.text = r.v.text.slice(0, LIM.COMMENT);
        if (!isReply && hasOwn(r.v, 'resolved')) v.resolved = r.v.resolved === true;
        r.v = v;
        /* …and it stays where it is: with its anchor as sent (null), the upsert moved it to the top of
           everybody's list. */
        const arr = D.valueAt(base, p);
        const field = P.keyedField(r.k);
        const prev = Array.isArray(arr) ? anchorOf(arr, field, P.keyedValue(r.k)) : null;
        r.a = prev == null ? null : P.keyedSeg(field, prev);
        return;
      }
      sanitizeComment(r.v, m, isReply);
      /* The id IS the key. A value naming another id would be stored under that one (applyAi asserts the
         key's own field), and a second element with an id the list already has makes it atomic. */
      r.v.id = P.keyedValue(r.k);
      const was = gone.get(goneKey(isReply, r.v.id));
      if (was) restore(r.v, was);
    }
    function restore(v, was) {
      v.by = clone(was.by); v.at = was.at;
      if (typeof was.text === 'string') v.text = was.text;
    }
    /* S7: the first comment list (see `firstList`) — every element stamped as the sender's, ids checked
       and de-duplicated, capped at §21's 500, exactly what 500 separate `ai`s would have produced. */
    function stampList(r, m) {
      if (!isCommentsPath(r.p) || r.p.length !== 2 || !Array.isArray(r.v)) return;
      /* Only the FIRST list. The owner's own device is never role-checked, and if his list ever went atomic
         for one diff (a duplicated id, §5.3) the whole-list set that follows must not re-author every comment
         in it as his. (A guest's list that arrives when base already has one never gets here — it is turned
         into inserts by `listToInserts`.) */
      if (base.project && Array.isArray(base.project.comments)) return;
      const seen = Object.create(null);
      r.v = r.v.filter(function (c) {
        if (!isPlainObject(c) || typeof c.id !== 'string' || !P.KEYVAL_RE.test(c.id) || seen[c.id]) return false;
        seen[c.id] = 1;
        return true;
      }).slice(0, LIM.COMMENTS);
      r.v.forEach(function (c) {
        sanitizeComment(c, m, false);
        const was = gone.get(goneKey(false, c.id));
        if (was) restore(c, was);
      });
    }
    /* A guest's whole comment list, arriving where base already HAS one (a second list in the same tx, or
       the first-comment race): one insert per comment base does not have, in the list's order, each going
       through the same limit, stamp and apply as an `ai` would. Comments base has are left exactly as base
       has them. */
    function listToInserts(op) {
      const out = [];
      const have = base.project.comments;
      const seen = Object.create(null);
      let prev = null;                                        // each one after the last, as a push would put it
      for (let i = 0; i < have.length; i++) if (have[i] && typeof have[i].id === 'string') { seen[have[i].id] = 1; prev = have[i].id; }
      (op.v || []).forEach(function (c) {
        if (!isPlainObject(c) || typeof c.id !== 'string' || !P.KEYVAL_RE.test(c.id) || seen[c.id]) return;
        seen[c.id] = 1;
        out.push({ o: 'ai', p: ['P', 'comments'], k: P.keyedSeg('id', c.id), a: prev == null ? null : P.keyedSeg('id', prev), v: clone(c) });
        prev = c.id;
      });
      return out;
    }
    function sanitizeComment(v, m, isReply) {
      const keep = isReply ? REPLY_KEYS : COMMENT_KEYS;
      Object.keys(v).forEach(function (k) { if (keep[k] !== 1) delete v[k]; });
      v.text = (typeof v.text === 'string') ? v.text.slice(0, LIM.COMMENT) : '';
      if (typeof v.lid !== 'string' || !P.KEYVAL_RE.test(v.lid)) delete v.lid;
      if (typeof v.t !== 'number' || !isFinite(v.t)) delete v.t;
      if (v.resolved !== true) delete v.resolved;
      v.by = authorOf(m);
      v.at = now();
      if (isReply) return;
      if (!Array.isArray(v.replies)) { v.replies = []; return; }
      v.replies = v.replies.slice(0, LIM.REPLIES);
      const seen = Object.create(null);
      for (let i = v.replies.length - 1; i >= 0; i--) {
        const rep = v.replies[i];
        /* A reply with no usable id makes the whole array atomic for the diff (§5.3), which quietly
           turns every later reply edit into a whole-list write; a duplicate is worse. Drop both. */
        if (!isPlainObject(rep) || typeof rep.id !== 'string' || !P.KEYVAL_RE.test(rep.id) || seen[rep.id]) { v.replies.splice(i, 1); continue; }
        seen[rep.id] = 1;
        sanitizeComment(rep, m, true);
        /* A reply the host removed coming back inside its comment (the Undo of a delete) is its author's,
           not the person who pressed Undo. */
        const was = gone.get(goneKey(true, rep.id));
        if (was) restore(rep, was);
      }
    }
    /* ⚠️ THE OWNER HAS A NAME TOO. `H.local` used to hand resolveOp a literal null, which is the "no
       member record" case, so the host overwrote Ezra's own comments with an empty name and the
       default grey while every guest's were correctly named and coloured — the one person whose
       identity is never in doubt was the only one whose name disappeared (queue 921). */
    function authorOf(m) {
      return { mid: m ? m.mid : H.ownerMid, name: m ? m.name : '', color: m ? m.color : '#888888' };
    }
    function ownerMember() {
      return members[H.ownerMid] || H.ownerSelf;
    }

    /* §21: the ceilings that must hold on BASE, checked where the op would breach them rather than
       trusted to the sender. */
    function overLimit(op) {
      if (op.o === 'li' && (base.layers || []).length >= LIM.LAYERS && P.indexOfKey(base.layers || [], 'id', op.id) < 0) return 'layers';
      if (op.o === 'ai' && isCommentsPath(op.p) && op.p.length === 2) {
        const list = base.project && base.project.comments;
        if (Array.isArray(list) && list.length >= LIM.COMMENTS) return 'comments';
      }
      /* §21 gives replies no ceiling of their own, so one comment could hold as many as a peer liked.
         (The replies that ride INSIDE a new comment's value are trimmed by sanitizeComment.) */
      if (op.o === 'ai' && isCommentsPath(op.p) && op.p.length === 4 && op.p[3] === 'replies') {
        const rs = D.valueAt(base, op.p);
        if (Array.isArray(rs) && rs.length >= LIM.REPLIES) return 'replies';
      }
      /* ⚠️ S8 review: AND IT IS A STRING, AND `resolved` IS A BOOLEAN — FOR EVERY ROLE. The cap above was
         measured only `typeof op.v === 'string'`, so a Commenter's `s …/text` carrying an ARRAY of ten
         199 999-character strings passed every check (each leaf under STRING_LEAF, the whole under
         OP_VALUE_BYTES) and landed 2 MB in his document per op; `…/resolved` was not looked at at all.
         Three of those and the owner's autosave hit the localStorage quota: "autosave paused", and every
         edit after it — his and everybody's — lost on reload. The only values these two fields ever hold
         are a string and true/false (sanitizeComment writes nothing else). */
      if (op.o === 's' && isCommentsPath(op.p)) {
        const last = op.p[op.p.length - 1];
        if (last === 'text' && (typeof op.v !== 'string' || op.v.length > LIM.COMMENT)) return 'comment';
        if (last === 'resolved' && typeof op.v !== 'boolean') return 'comment';
      }
      /* ⚠️ THE SAME CAP, ON THE OP THAT CREATES THE COMMENT. It was enforced only on an EDIT, so the
         identical body sent as the `ai` that makes the comment was stored in full: 199 000 characters
         against a 2000 ceiling, from a commenter, sequenced and broadcast (queue 921). */
      if (op.o === 'ai' && isCommentsPath(op.p) && commentTooLong(op.v)) return 'comment';
      return null;
    }
    function commentTooLong(v) {
      if (!isPlainObject(v)) return false;
      if (typeof v.text === 'string' && v.text.length > LIM.COMMENT) return true;
      const rs = v.replies;
      if (Array.isArray(rs)) {
        for (let i = 0; i < rs.length; i++) {
          if (isPlainObject(rs[i]) && typeof rs[i].text === 'string' && rs[i].text.length > LIM.COMMENT) return true;
        }
      }
      return false;
    }

    /* Steps 7–8: apply the accepted ops to base, then run the invariants on CLONES and turn the
       difference into fix ops. Never sanitize live objects — storage's sanitizers REASSIGN effects,
       masks, audioFx, behaviors and kf, which detaches every reference the app is holding (§11.2). */
    function applyAndFix(ops, m, rejOut, indexOf, resyncOut) {
      const accepted = [];
      const touched = Object.create(null);
      let projectTouched = false, structural = false;
      const guest = !!m && m !== ownerMember() && m.mid !== H.ownerMid;
      /* S8 review: what every comment together may weigh, measured once per tx (only when the tx touches
         comments) and counted forward op by op — an overestimate for a set that replaces text, which is the
         safe side. A guest only: the owner's own device is never role-checked either. */
      let cBytes = -1;
      function commentsOver(op) {
        if (!guest || !op || !isCommentsPath(op.p) || !hasOwn(op, 'v')) return false;
        if (cBytes < 0) cBytes = canon((base.project && base.project.comments) || []).length;
        const add = canon(op.v).length + (op.o === 'ai' ? 192 : 0);   // …plus the author and time the host stamps on an insert
        if (cBytes + add > LIM.COMMENT_BYTES) return true;
        cBytes += add;
        return false;
      }
      for (let i = 0; i < ops.length; i++) {
        /* ⚠️ A GUEST'S WHOLE COMMENT LIST, WHERE BASE ALREADY HAS ONE, BECOMES INSERTS (S7 review). The role
           check ran against the PRE-tx base, so two `s P/comments` in one tx both passed it as "the first
           list" — and the second was applied raw, because stampList only stamps the first: a comment "by
           Ezra" that Ezra never wrote, over the 500 cap, with any keys it liked. Decided HERE, against the
           base this op is actually applied to. */
        if (guest && ops[i].o === 's' && isCommentsPath(ops[i].p) && ops[i].p.length === 2 &&
            base.project && Array.isArray(base.project.comments)) {
          const ins = listToInserts(ops[i]);
          if (resyncOut) resyncOut.push(indexOf(i));          // the sender is handed the real list back
          for (let j = 0; j < ins.length; j++) {
            if (goneRefused(m, ins[j])) continue;             // somebody else's deleted comment is not hers to bring back
            if (overLimit(ins[j]) || commentsOver(ins[j])) { rejOut.push([indexOf(i), 'limit']); break; }
            const rop = resolveOp(ins[j], m);
            if (D.apply(base, rop) === 'ok') { accepted.push(rop); projectTouched = true; }
          }
          continue;
        }
        /* A comment or reply keyed any way but by its id is refused from every device, the owner's too: the
           stored element would have no id, and the list would be atomic for good (S7 review). */
        if (isCommentsPath(ops[i].p) && ops[i].o === 'ai' && !commentKeyOk(ops[i])) { rejOut.push([indexOf(i), 'bad']); continue; }
        /* §21, against the RAW op (resolveOp clamps a comment, which would make the cap unmeasurable)
           and after the earlier ops in this tx have landed: counting against the PRE-TX base let one
           message of 520 comments through a 500 ceiling, because nothing had been applied yet. */
        const lim = overLimit(ops[i]) || (commentsOver(ops[i]) ? 'comments' : null);
        if (lim) { rejOut.push([indexOf(i), 'limit']); continue; }
        /* What a comment delete takes away is remembered, so its Undo brings back the right authors. */
        if (ops[i].o === 'ar' && isCommentsPath(ops[i].p) && (ops[i].p.length === 3 || ops[i].p.length === 5)) {
          remember(D.valueAt(base, ops[i].p), ops[i].p.length === 5);
        }
        /* ⚠️ RESOLVED HERE, ONE OP AT A TIME — NOT IN A PASS BEFOREHAND (queue 921). An anchor names a
           sibling, and in a tx that inserts two layers the second one's anchor IS the first: resolving
           the whole tx against the pre-tx base collapsed it to null, so a two-layer paste landed
           reversed and stayed that way — §8.3a makes the broadcast `ord` authoritative, the sender
           adopts its own ack, and the next diff then sees no difference at all. Every undo of a layer
           delete was the same shape (invertStep re-inserts the layer, then moves its old neighbours
           after it) and came back in the wrong order through the host while applying the very same ops
           DIRECTLY gave the right one. Resolving against the base each op is actually applied to also
           means the anchor broadcast is always the anchor the host itself used. */
        const op = resolveOp(ops[i], m);
        const res = D.apply(base, op);
        if (res === 'noop') continue;                        // §5.5: not sequenced, not echoed, not recorded
        if (res !== 'ok') { rejOut.push([indexOf(i), res === 'gone' ? 'gone' : 'bad']); continue; }
        accepted.push(op);
        const lid = layerOf(op);
        if (lid) touched[lid] = 1;
        if (op.p && op.p[0] === 'P') projectTouched = true;
        if (op.o === 'li' || op.o === 'lr' || op.o === 'mv') structural = true;
        if (op.p && op.p[0] === 'L' && op.p[op.p.length - 1] === 'parent') structural = true;
        /* …and a WHOLE-LAYER write can set `parent` without the path ever ending in `parent`, so the
           spelling of the op decided whether the cycle repair ran at all: two `s` ops at ['L',<id>]
           could close a parent loop — the document FM.repairParentCycles exists to stop, the one that
           makes every parent walk recurse until the stack blows — and the invariants never looked.
           Any write AT a layer is treated as structural; the repair is idempotent and costs one clone. */
        if (op.p && op.p[0] === 'L' && op.p.length <= 2) structural = true;
      }
      return { accepted: accepted, fix: invariantFix(touched, projectTouched, structural) };
    }

    function invariantFix(touched, projectTouched, structural) {
      const out = { ops: [], recs: [] };
      Object.keys(touched).forEach(function (lid) {
        const bl = layerById(base, lid);
        if (!bl) return;
        const c = clone(bl);
        inv.layer(c);
        D.diffNode(['L', lid], bl, c, out);
      });
      if (projectTouched && base.project) {
        const c = clone(base.project);
        inv.project(c);
        D.diffNode(['P'], base.project, c, out);
      }
      if (structural && Array.isArray(base.layers)) {
        const cl = clone(base.layers);
        const order = inv.layers(cl);
        for (let i = 0; i < cl.length; i++) {                 // parent-cycle repair, as ordinary sets
          const want = cl[i], have = layerById(base, want.id);
          if (have && !eq(have.parent, want.parent)) {
            const p = ['L', want.id, 'parent'];
            if (want.parent == null && !hasOwn(want, 'parent')) out.ops.push({ o: 'd', p: p });
            else out.ops.push({ o: 's', p: p, v: clone(want.parent) });
            out.recs.push({ p: p, o: 's', b: have ? clone(have.parent) : undefined });
          }
        }
        if (order) orderFix(order, out);
      }
      for (let i = 0; i < out.ops.length; i++) D.apply(base, out.ops[i]);
      return out.ops;
    }

    /* The order repair, as `mv` ops. `FM.normalizeGroupOrder` is the app's invariant (queue 921 S0: it
       repairs a REPEATED id, not group contiguity — read the comment on it, it is measured).
       ⚠️ A returned order that is NOT a permutation of what base holds cannot be said in ops: `mv`
       addresses by id, and the one thing that shape means is that base has two layers with the same
       id. That is unreachable through this pipeline — `li` upserts by id and bare-root writes are
       refused by validOp — so rather than invent a repair for it, it is recorded LOUDLY and left for
       the divergence detector to settle with a snapshot (§11.4). Silence here would be the bug. */
    function orderFix(order, out) {
      const cur = (base.layers || []).map(function (l) { return l && l.id; });
      if (order.length !== cur.length || order.slice().sort().join(',') !== cur.slice().sort().join(',')) {
        note({ t: now(), what: 'order-unexpressible', have: cur.length, want: order.length });
        H.warn = 'order';
        return;
      }
      const idx = Object.create(null);
      for (let i = 0; i < cur.length; i++) idx[cur[i]] = i;
      const seqIdx = order.map(function (id) { return idx[id]; });
      const keep = Object.create(null);
      const lis = D.lisIndices(seqIdx);
      for (let i = 0; i < lis.length; i++) keep[order[lis[i]]] = 1;
      let prev = null;
      for (let i = 0; i < order.length; i++) {
        if (!keep[order[i]]) { out.ops.push({ o: 'mv', id: order[i], a: prev }); out.recs.push({ p: ['L', order[i]], o: 'mv', aBefore: null }); }
        prev = order[i];
      }
    }

    /* §7.1 step 11: the sender also gets the host's CURRENT value for every path it was refused, so a
       rejected slider does not sit at a value only that device believes in.
       ⚠️ IT REPORTS THE DEEPEST ANCESTOR THAT STILL EXISTS, not the path that was asked for. If the
       refusal was 'gone' because the EFFECT the path runs through was deleted, then `d` on
       …/#u:x/params/amount is a lie about where the change is — and worse, on a device that still has
       that effect it would delete a real parameter. The truthful statement is "that effect is not
       here", i.e. `ar` on the element. Found while writing the keyed-array test. */
    function currentStateOps(op) {
      const out = [];
      if (op.o === 'lr' || op.o === 'mv' || op.o === 'li') {
        const L = layerById(base, op.id);
        if (L) out.push({ o: 'li', id: op.id, a: anchorOf(base.layers, 'id', op.id), v: clone(L) });
        else out.push({ o: 'lr', id: op.id });
        return out;
      }
      if (!Array.isArray(op.p)) return out;
      const p = (op.o === 'ai') ? op.p.concat(op.k) : op.p;
      const cur = D.valueAt(base, p);
      if (cur !== undefined) { out.push(presentOp(p, cur)); return out; }
      let at = p;
      for (let n = 2; n <= p.length; n++) {                 // the shallowest prefix that is already absent
        const pre = p.slice(0, n);
        if (D.valueAt(base, pre) === undefined) { at = pre; break; }
      }
      const last = at[at.length - 1];
      if (at.length === 2 && at[0] === 'L') out.push({ o: 'lr', id: last });
      else if (P.isKeyedSeg(last)) out.push({ o: 'ar', p: at });
      else out.push({ o: 'd', p: at });
      return out;
    }

    /* ⚠️ S8 (found by the eight-device fuzz): A KEYED ELEMENT THAT IS STILL HERE IS SAID AS AN `ai`, NOT AN `s`.
       The sender of a refused `ar` — a Commenter's Undo of her own reply, landing just after the owner made her a
       Viewer; an Editor deleting an effect on a layer somebody holds — has ALREADY removed that element from its
       own base and screen. An `s` on the element's path cannot put it back: `apply` finds no element with that
       key and answers 'gone', so the device kept a document without it for good (a divergence only §11.4's hash
       could ever notice, ten quiet seconds later, and only if nobody was editing). A refused `am` had the other
       half of the same hole: the `s` restored the element's fields and left it where the sender had moved it.
       An `ai` is an upsert WITH a position — it re-inserts what is missing, rewrites what is there, and puts it
       after the sibling it follows here — which is exactly what `li` already does for a whole layer above. */
    function presentOp(p, cur) {
      const last = p[p.length - 1];
      if (p.length >= 3 && P.isKeyedSeg(last) && isPlainObject(cur)) {
        const arrPath = p.slice(0, -1);
        const arr = D.valueAt(base, arrPath);
        const field = P.keyedField(last);
        const prev = Array.isArray(arr) ? anchorOf(arr, field, P.keyedValue(last)) : null;
        return { o: 'ai', p: arrPath, k: last, a: prev == null ? null : P.keyedSeg(field, prev), v: clone(cur) };
      }
      return { o: 's', p: p, v: clone(cur) };
    }
    H._presentOp = presentOp;

    function sequence(by, accepted, fix) {
      if (!accepted.length && !fix.length) return null;
      H.seq += 1;
      const ord = D.orderStatementsFor(base, accepted.concat(fix));
      const batch = { t: 'b', seq: H.seq, by: by, ops: accepted, fix: fix };
      if (ord.length) batch.ord = ord;
      const bytes = canon(batch).length;
      ring.push({ seq: H.seq, by: by, ops: accepted, fix: fix, ord: batch.ord, bytes: bytes });
      ringBytes += bytes;
      while (ring.length > LIM.RING_BATCHES || (ringBytes > LIM.RING_BYTES && ring.length > 1)) {
        ringBytes -= ring.shift().bytes;
      }
      H.lastByMid = by;
      const all = accepted.concat(fix);
      for (let i = 0; i < all.length; i++) {
        const op = all[i];
        const k = P.key(op.p || ['L', op.id]);
        lastBy.set(k, by); lastW.set(k, { seq: H.seq, by: by });
        if (lastBy.size > 10000) lastBy.delete(lastBy.keys().next().value);
        if (lastW.size > 10000) lastW.delete(lastW.keys().next().value);
      }
      if (typeof o.live === 'function') { try { o.live(all, by, batch); } catch (e) { note({ t: now(), what: 'live', err: String(e) }); } }
      if (typeof o.afterBatch === 'function') { try { o.afterBatch(batch); } catch (e) {} }
      return batch;
    }

    /* The owner's own ops: steps 1–6 are skipped (they came from this device's own diff), but the
       LEASES are not — an owner op on a layer a guest holds is refused here, which is what puts the
       "Sam is editing this — [Take over]" toast in front of him instead of stealing it. */
    H.local = function (ops) {
      const rej = [];
      const pass = [];
      const idx = [];
      for (let i = 0; i < (ops || []).length; i++) {
        const op = ops[i];
        if (validOp(op)) { rej.push([i, 'bad']); continue; }
        const lid = layerOf(op);
        if (lid && leases[lid] && leases[lid] !== H.ownerMid && !(op.o === 'lr' && op.f === 1)) { rej.push([i, 'lease']); continue; }
        /* §17.2 delete-anyway (S7): the owner's forced delete revokes the lease it overrode, as a guest's does
           in `receive` — otherwise the holder's next heartbeat keeps a lease on a layer that no longer exists. */
        if (op.o === 'lr' && op.f === 1 && leases[lid]) delete leases[lid];
        pass.push(op); idx.push(i);
      }
      const r = applyAndFix(pass, ownerMember(), rej, function (i) { return idx[i]; });
      const b = sequence(H.ownerMid, r.accepted, r.fix);
      return { b: b, rej: rej };
    };

    /* One guest tx, §7.1 in order. Returns {ack, b}: `ack` goes back to the sender, `b` to everyone
       else. Either may be null — a tx that changed nothing is not a batch. */
    H.receive = function (mid, tx) {
      const m = members[mid];
      if (!m) return { ack: null, b: null, dropped: 'unknown' };

      const bad = validateTx(tx);                             // 1
      if (bad) {
        note({ t: now(), mid: mid, what: 'bad-tx', why: bad });
        return { ack: { t: 'ack', cid: (tx && tx.cid) || 0, seq: null, at: H.seq, ops: [], fix: [], rej: [['*', 'bad']], lost: [] }, b: null };
      }
      if (!takeToken(m)) {                                    // 2
        m.flagged = true;
        note({ t: now(), mid: mid, what: 'rate' });
        return { ack: null, b: null, dropped: 'rate' };
      }
      if (tx.cid <= m.lastCid) {                              // 3
        for (let i = m.acks.length - 1; i >= 0; i--) if (m.acks[i].cid === tx.cid) return { ack: m.acks[i], b: null, dup: true };
        return { ack: null, b: null, dup: true };
      }

      const rej = [], lost = [], pass = [], idx = [];
      for (let i = 0; i < tx.ops.length; i++) {
        const op = tx.ops[i];
        if (!allowed(m.role, op, base, mid) && !lateList(m.role, op, base)) { rej.push([i, 'role']); continue; }   // 4
        if (goneRefused(m, op)) { rej.push([i, 'role']); continue; }
        const lid = layerOf(op);                                                            // 5
        if (lid && leases[lid] && leases[lid] !== mid && !(op.o === 'lr' && op.f === 1)) { rej.push([i, 'lease']); continue; }
        if (tx.q === 1) {                                                                   // 6
          const c = cas(op);
          if (c === 'clash') { lost.push([i, 'clash']); continue; }
          if (c === 'noop') continue;
        }
        if (op.o === 'lr' && op.f === 1 && leases[lid]) delete leases[lid];                 // §17.3 delete-anyway revokes
        pass.push(op); idx.push(i);
      }

      const resync = [];
      const r = applyAndFix(pass, m, rej, function (i) { return idx[i]; }, resync);          // 7 + 8
      const fix = r.fix.slice();
      const seen = Object.create(null);
      /* ⚠️ S8 review: THE REPAIR IS A COPY, AND A PEER CHOOSES WHAT IT COPIES. Every refused op names a path or a
         layer, and the host answers with a clone of what is there now — so a Viewer (who is refused EVERYTHING)
         sending 500 tiny `mv`s, one per layer id it saw in the snapshot, got the whole document back in one
         ack, 30 times a second under the token bucket, each one cloned, serialised and queued by the owner's
         phone, and 64 of them kept in `m.acks`. `catchUp` exists because "a copy of the document is the one
         thing a peer can make the owner pay for", and this was a second door to the same room. So the repair
         is budgeted — per tx (FIX_OPS / FIX_BYTES) and per member (FIX_BURST refilled at FIX_PER_SEC) — and
         whatever does not fit is not dropped: the ack says `resync`, and the sender's copy comes through
         `catchUp`, which is the one budget a copy of the document is allowed to cost. */
      const ft = now();
      m.fixTokens = Math.min(LIM.FIX_BURST, (m.fixTokens == null ? LIM.FIX_BURST : m.fixTokens) + (ft - (m.fixAt || ft)) / 1000 * LIM.FIX_PER_SEC);
      m.fixAt = ft;
      let fixN = 0, fixBytes = 0, cut = false;
      rej.concat(lost, resync.map(function (i) { return [i, 'resync']; })).forEach(function (e) {   // 11: current value for refusals
        if (cut) return;
        const oi = e[0];
        const op = (oi === '*') ? null : tx.ops[oi];
        if (!op) return;
        currentStateOps(op).forEach(function (f) {
          if (cut) return;
          const k = f.o + '|' + P.key(f.o === 'ai' ? f.p.concat(f.k) : (f.p || ['L', f.id]));   // two elements of one array are two fixes
          if (seen[k]) return;
          const n = canon(f).length;
          if (fixN >= LIM.FIX_OPS || fixBytes + n > LIM.FIX_BYTES || n > m.fixTokens) { cut = true; return; }
          seen[k] = 1; fix.push(f);
          fixN++; fixBytes += n; m.fixTokens -= n;
        });
      });

      const b = sequence(mid, r.accepted, r.fix);                                            // 9 + 10
      m.lastCid = tx.cid;
      /* ⚠️ `seq` IS THE BATCH THAT CARRIES THESE OPS, OR NULL — never "where the host happens to be".
         §14.6 types it `seq|null` and step 1 of this same function already answers null for a malformed
         tx; the other exit reported H.seq, so a tx whose ops were all §5.5 no-ops (the common case the
         whole design leans on) or all refused came back naming a batch somebody ELSE produced. A
         receive rule that reads it as "my batch" would attribute a stranger's work to itself, and
         S2's rules are being written against this contract now. `at` says where the host is, under a
         name that means that (queue 921). */
      const ack = { t: 'ack', cid: tx.cid, seq: b ? b.seq : null, at: H.seq, ops: r.accepted, fix: fix, rej: rej, lost: lost };
      if (b && b.ord) ack.ord = b.ord;     // the sender's own resolution may differ; it adopts too
      if (cut) ack.resync = 1;
      /* …and what is KEPT for a resend is not the repair (S8 review): 64 cached acks each carrying a copy of a
         2 MB document is 128 MB held for one member. A resend of a tx that was refused gets the ack without its
         repair, and `resync` in its place — the same budgeted copy, only when it is really asked for. */
      const repaired = fix.length > r.fix.length;
      m.acks.push(repaired ? Object.assign({}, ack, { fix: r.fix, resync: 1 }) : ack);
      while (m.acks.length > LIM.ACK_CACHE) m.acks.shift();
      return { ack: ack, b: b };
    };

    /* ── reading the host ────────────────────────────────────────────────────────────────────── */
    H.hash = function () { return cyrb53(canon({ project: base.project, layers: base.layers })); };
    H.snapshot = function () {
      return { t: 'snap', epoch: H.epoch, seq: H.seq, h: H.hash(), D: clone({ project: base.project, layers: base.layers }) };
    };
    /* The batches after `from`, or null when the ring no longer reaches back that far — in which case
       the caller must send a snapshot instead (§13.2). */
    H.tail = function (from) {
      /* A guest that is AHEAD of us is not up to date, it is holding a document from a life this host
         no longer has (an epoch it has not noticed yet). Saying "nothing to catch up on" to that is the
         worst possible answer, so it gets a snapshot. */
      if (from > H.seq) return null;
      if (!ring.length) return { t: 'tail', from: from, batches: [] };
      if (from < ring[0].seq - 1) return null;
      const out = [];
      for (let i = 0; i < ring.length; i++) if (ring[i].seq > from) out.push({ t: 'b', seq: ring[i].seq, by: ring[i].by, ops: ring[i].ops, fix: ring[i].fix, ord: ring[i].ord });
      return { t: 'tail', from: from, batches: out };
    };
    /* A new epoch resets seq — every guest must resynchronise from a snapshot (host reload, §13.2). */
    H.bumpEpoch = function (e) {
      H.epoch = e || ('e' + Math.floor(rand() * 0x100000000).toString(36));
      H.seq = 0; ring.length = 0; ringBytes = 0;
      Object.keys(members).forEach(function (k) { members[k].lastCid = -1; members[k].acks.length = 0; });
      return H.epoch;
    };

    return H;
  }

  Host.allowed = allowed;
  Host.validateTx = validateTx;
  Host.validOp = validOp;
  Host.layerOf = layerOf;
  Host.decodeB = decodeB;
  C.Host = Host;

})(window.FM);
