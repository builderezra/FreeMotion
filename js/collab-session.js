/* FreeMotion — live collaboration (queue 921), STAGE S2: the per-device engine (spec §8–§13).
 *
 * One Session runs on every device in a room. It owns the two trees (`base` and the live document it
 * reaches through a DocAdapter), the tick scheduler (§9), the receive rules (§8), per-person undo
 * (§10), the divergence detector (§11.4), the offline outbox (§13) and the link state machine (§12).
 *
 * ⚠️ PURE OF THE APP, like the Host. It takes a DocAdapter and a Link, so the whole engine can be run
 * against plain objects in a test with no DOM at all — which is what makes the fuzz and the tier-2
 * rules testable without three browsers.
 *
 * The owner's Session wraps an `FM.collab.Host`: its `base` IS `host.base`, because the owner's copy
 * is the authoritative one by definition. A guest's `base` is the host-confirmed state plus its own
 * outstanding ops, which is what makes "the last person to let go wins" (§8) a local decision.
 *
 * WHAT S2 DELIBERATELY DOES NOT DO: no signalling, no WebRTC, no media transfer, no presence, no UI.
 * A session only exists once something outside this file hands it a Link, and in S2 the only things
 * that do are the test agent and the suite.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};
  const P = C.path, D = C.diff;
  const LIM = C.LIMITS;
  const canon = P.canon, eq = P.eq, clone = P.clone, cyrb53 = P.cyrb53;

  /* §5.1: the owner's workspace pointers are his, not the document's. They must not travel, they must
     not be diffed, and they must not reach the hash — a guest whose copy came from a template would
     otherwise disagree with the host forever about a key it can never be told the value of. */
  const DENY = ['ofTemplate', 'ofTemplateRev', 'ofElement', 'returnTo', 'fromTemplate'];

  function viewOfProject(project) {
    const out = {};
    const ks = Object.keys(project || {});
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i];
      if (DENY.indexOf(k) >= 0) continue;
      if (!P.syncable(k)) continue;                 // `_` keys and anything no path can name
      out[k] = project[k];
    }
    return out;
  }

  function pathOf(op) { return op.p || ['L', op.id]; }
  /* S7: an insert into the comment list or a reply list, or the first list itself — the ops whose value
     the host rewrites (`by`, `at`) on the way through. */
  function commentStamp(op) {
    const p = op && op.p;
    if (!Array.isArray(p) || p[0] !== 'P' || p[1] !== 'comments') return false;
    return op.o === 'ai' || (op.o === 's' && p.length === 2);
  }
  function isStructuralOp(op) { return op.o === 'lr' || op.o === 'ar'; }
  function isMoveOp(op) { return op.o === 'li' || op.o === 'mv' || op.o === 'ai' || op.o === 'am'; }

  /* The layer-ish part of a path, for the summary the adapter refreshes from. */
  function layerIdOf(op) {
    if (op.o === 'li' || op.o === 'lr' || op.o === 'mv') return op.id || null;
    const p = op.p;
    return (Array.isArray(p) && p[0] === 'L' && p.length > 1) ? p[1] : null;
  }

  function Session(opts) {
    const o = opts || {};
    const A = o.adapter;
    if (!A || typeof A.doc !== 'function' || typeof A.view !== 'function') {
      throw new Error('FM.collab.Session needs a DocAdapter with doc() and view()');
    }
    const now = o.now || function () { return Date.now(); };
    const isOwner = o.role === 'owner';
    const host = o.host || null;
    if (isOwner && !host) throw new Error('an owner Session needs a Host');

    const S = {
      role: o.role || 'editor',
      mid: o.mid || (isOwner ? 'o' : 'g'),
      isOwner: isOwner,
      host: host,
      adapter: A,
      /* base: the host-confirmed document plus our own outstanding ops. On the owner it IS the host's
         authoritative tree — one object, never a copy, so they can never drift. */
      base: isOwner ? host.base : (o.base || { project: {}, layers: [] }),
      epoch: isOwner ? host.epoch : (o.epoch || null),
      bs: 0,                       // the last host seq this device has applied
      cid: 0,
      online: true,
      active: true,
      /* diagnostics / assertions */
      stats: { tx: 0, batches: 0, skipped: 0, deferredN: 0, adopted: 0, reasserted: 0, structWins: 0, resyncs: 0, queued: 0, forcedN: 0 }
    };

    /* ── outstanding work (§8.1 pending, §13.1 outbox) ───────────────────────────────────────────
       One structure for both, because §13.2 treats them identically on reconnect ("outbox and pending
       count as pending"). An entry is a tx we have applied to our own base and the host has not yet
       acknowledged — whether that is because it is in flight or because there is nothing to fly. */
    const outstanding = [];                       // [{cid, ops, sent}]
    const pending = Object.create(null);          // pathKey -> cid, for `s` and `d` ONLY (§8.1)
    const forceIds = Object.create(null);         // S7: layer ids whose next `lr` is a confirmed delete-anyway
    let refusedAt = 0;                            // S7: the §16.3 toast, said once rather than every tick
    let outboxOps = 0, outboxBytes = 0;

    /* ── the local interaction (§8.2) ────────────────────────────────────────────────────────── */
    let held = Object.create(null);               // pathKey -> {b: the value before the interaction}
    let deferred = Object.create(null);           // pathKey -> op held back from live
    let forced = [];                              // ops refused by role/lease: applied at release anyway
    let deferredOrd = null;                       // §8.3a S2 note: an order adoption waiting for a finger
    let heldStructural = false;

    /* ── undo (§10) ──────────────────────────────────────────────────────────────────────────── */
    let step = newStep();
    const undoStack = [], redoStack = [];
    let recording = true;
    let preSnaps = null, preIdx = -1;
    let keepIds = null;                           // memoised reachable() answer

    /* ── frozen / busy (§8.9) ────────────────────────────────────────────────────────────────── */
    const msgQueue = [];                          // guests: whole messages. owner: live applications.

    /* ── links ───────────────────────────────────────────────────────────────────────────────── */
    const peers = Object.create(null);            // owner: mid -> endpoint
    let link = null;                              // guest: the host endpoint
    /* ⚠️ NOT FROM ZERO EVERY TIME (S7 review). A comment's author is the mid the host stamped (`by.mid`), and
       the comment outlives the session — so a new session that minted m1, m2… again in arrival order handed
       Sam's comments to whoever reconnected first. The owner starts past every mid the document or the room
       has ever used (`C.share` works it out), and a returning member is given back its own (collab-ui.js). */
    let nextMid = Math.max(0, Math.floor(+o.midFloor || 0));
    /* S6: what the owner granted each member when it was let in — the id its token is filed under and
       the token itself — so its `welcome` can carry them (§20 `you:{mid, role, color, tok?}`). */
    const grants = Object.create(null);
    /* S6 (§20 ping/pong, §21 liveness): off unless the link is a real one. A LoopLink or a PostLink in the
       suite never goes quiet by itself, and a guest ticked by hand in a test would read a long pause
       between two ticks as the host going silent. The UI turns it on for the links it makes. */
    let liveness = false, lastHeard = now(), lastPing = 0, pingN = 0;

    /* ── hot set (§9) ────────────────────────────────────────────────────────────────────────── */
    let hotLast = Object.create(null);

    /* ── divergence (§11.4) ──────────────────────────────────────────────────────────────────── */
    let lastBatchAt = 0, lastHashAt = 0, resyncAt = [];
    const reports = S.reports = [];

    function newStep() { return { ops: [], recs: [], orders: [], byKey: Object.create(null) }; }
    function doc() { return A.doc(); }
    function view() { return A.view(); }
    function frozen() { return !!(A.frozen && A.frozen()); }
    function busy() { return !!(A.busy && A.busy()); }
    function interacting() { return !!(A.interacting && A.interacting()); }
    function toast(m, ms) { if (A.toast) try { A.toast(m, ms); } catch (e) {} }
    function liveOpts() { return { live: true, teardown: A.teardown }; }

    /* ═══ SENDING ═══════════════════════════════════════════════════════════════════════════════ */

    function sendToHost(msg) {
      if (!link || !link.open) return false;
      return link.send('ctl', msg);
    }
    function sendTo(mid, msg) {
      const ep = peers[mid];
      if (!ep || !ep.open) return false;
      return ep.send('ctl', msg);
    }
    function broadcast(msg, exceptMid) {
      Object.keys(peers).forEach(function (mid) {
        if (mid === exceptMid) return;
        const ep = peers[mid];
        if (ep && ep.open) ep.send('ctl', msg);
      });
    }

    /* ═══ §9 — WHEN DIFFS RUN ═══════════════════════════════════════════════════════════════════
     * One funnel. Everything that wants to send local work — the commit hook, the active tick, the
     * idle sweep, the flush before a remote apply — arrives here, so the release rules, the undo
     * recording and the held bookkeeping cannot be forgotten by one caller and remembered by another. */
    function hotSet() {
      const h = new Set();
      h.add('P');
      const live = view();
      const sel = A.selectedIds ? A.selectedIds() : [];
      for (let i = 0; i < sel.length; i++) h.add(sel[i]);
      Object.keys(hotLast).forEach(function (id) { h.add(id); });
      /* The id LIST is always compared by diffDoc regardless of `hot`, so a layer appearing or
         vanishing can never be missed by a hot tick (collab-diff.js:487). */
      if (live && live.layers && live.layers.length <= 12) live.layers.forEach(function (l) { if (l && l.id) h.add(l.id); });
      return h;
    }

    function diffNow(scope) {
      const opt = (scope === 'hot') ? { hot: hotSet() } : null;
      return D.diffDoc(S.base, view(), opt);
    }

    /* The whole local step. Returns the number of ops sent. */
    function pushLocal(scope) {
      if (!S.active) return 0;
      if (frozen() || busy()) return 0;              // §8.9: ticks and sweeps stand down
      /* ⚠️ NEVER DIFF ONE PROJECT AGAINST ANOTHER (queue 921). `FM.projects.open()` empties the live
         scene and THEN awaits `storage.load()` — IndexedDB plus a media hydrate, hundreds of ms — and
         the 100 ms ticker fires right through it. Nothing on that path is `jobWrapped` and nothing
         mutes history, so the barrier above is wide open, and a tick that lands mid-switch sees every
         layer as removed: one `lr` each, accepted by the host (an editor may delete), broadcast, and
         the whole room — including the owner's real project, via `applyIncoming`'s autosave — is
         emptied. A few ticks later the OTHER project is uploaded into the room as `li`s.
         `projects.open()` now stands the session down before it tears the scene, and this is the lock
         on that door, because an ordering one line long is a thing anyone could move. */
      if (S.pid && FM.projects && FM.projects.currentId && FM.projects.currentId() !== S.pid) return 0;
      if (A.normalizeDerived) A.normalizeDerived();  // §11.1 — deterministic, so it is a no-op on peers
      P.stampIds(doc());                             // §5.4 — before every diff
      let res = diffNow(scope);
      if (!res.ops.length) return 0;
      /* ═══ S7 · §16.3 THE STRUCTURAL BACKSTOP ════════════════════════════════════════════════════════
         Every op this device's role may not send is written back from base into live, here, before it is
         recorded, held or sent — whatever slipped past the UI's courtesies (a shortcut, a context menu, a
         paste, a tool nobody guarded). The rule is the HOST's own (`Host.allowed`), asked of the same base
         the host will judge it against, so the two can never disagree about what a Viewer may do.
         ⚠️ FOR EVERY GUEST, NOT ONLY THE READ-ONLY ROLES. An Editor's device may not rewrite a comment's
         `by`/`at` either (collab-host.js `editorCommentOp`), and the one way it could try is a stamp the
         host rewrote arriving while the finger was still down. Sending it would earn a refusal toast that
         says "you can only comment" to an Editor; writing base back says nothing, which is right — it is a
         repair, not a person being told no. */
      if (!isOwner) {
        res = backstop(res);
        if (!res.ops.length) return 0;
        /* A guest whose outbox is full holds no more (§13.1, S8 review): what was just done is written back from
           base, the way a Viewer's edit is — before it is recorded, held or queued — until the queue drains. */
        if (S.outboxFull) { revertToBase(res.ops); return 0; }
      }
      /* §17.2 delete-anyway (S7): a delete the person confirmed carries `f:1`, which the host reads as
         "revoke the lease and take it". Only the layer he said yes for, and only once. */
      for (let i = 0; i < res.ops.length; i++) {
        const op = res.ops[i];
        if (op.o === 'lr' && forceIds[op.id]) { op.f = 1; delete forceIds[op.id]; }
      }

      hotLast = Object.create(null);
      for (let i = 0; i < res.ops.length; i++) {
        const lid = layerIdOf(res.ops[i]);
        if (lid) hotLast[lid] = 1;
      }

      if (recording) record(res);
      if (interacting()) markHeld(res);
      keepIds = null;

      if (isOwner) {
        const r = host.local(res.ops);
        if (r.b) {
          S.epoch = host.epoch;
          broadcast(r.b, null);
          lastBatchAt = now();
          /* The ops came OUT of live, so live already has them. The invariant fix did not — it was
             computed on a clone of base (§11.2) and has to reach live like any other remote change,
             which means through the receive rules so it cannot yank a control under a finger. */
          if (r.b.fix && r.b.fix.length) applyIncoming(r.b.fix, { by: S.mid, own: true });
          if (r.b.ord) adoptOrder(r.b.ord);
          /* S7: the host STAMPED every comment it just took (`by` and `at` are its to write, §16.2) — so
             his own screen shows what everybody else's does, rather than the time his tap happened to be
             read. Straight into live: this is his own comment coming back, and no finger is on its `at`. */
          for (let i = 0; i < r.b.ops.length; i++) if (commentStamp(r.b.ops[i])) D.apply(doc(), r.b.ops[i], liveOpts());
        }
        if (r.rej && r.rej.length) refuseLocal(r.rej, res.ops);
        S.stats.tx++;
        return res.ops.length;
      }

      /* A guest: apply to our own base, remember what is outstanding, and send (or park it). */
      const ops = res.ops.map(function (op, i) { return withBefore(op, res.recs[i]); });
      for (let i = 0; i < res.ops.length; i++) D.apply(S.base, res.ops[i]);
      S.cid += 1;
      const entry = { cid: S.cid, ops: ops, sent: false };
      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        /* §8.1 correction: ONLY `s` and `d`. A structural op's key is the whole layer, so recording it
           would mark that layer's subtree pending and the skip rule would throw away every remote
           content op underneath it, in base as well as live, with nothing to bring them back. */
        if (op.o === 's' || op.o === 'd') pending[P.key(op.p)] = S.cid;
      }
      outstanding.push(entry);
      outboxOps += ops.length;
      outboxBytes += canon(ops).length;
      /* §13.1 (S8 review): past the cap this device turns read-only and says so — the flag was set and nothing
         read it, so the outbox went on growing past the size it exists to bound. */
      if (!S.outboxFull && (outboxOps > LIM.OUTBOX_OPS || outboxBytes > LIM.OUTBOX_BYTES)) {
        S.outboxFull = true;
        keepMyVersion();
        if (A.onOutboxFull) { try { A.onOutboxFull(true); } catch (e) {} }
      }
      if (S.online) flushOutstanding();
      S.stats.tx++;
      return res.ops.length;
    }

    /* §16.3's backstop as one function, because it has THREE callers and it had one (S7 review): a guest's
       Undo and Redo (runStep) and the reload outbox (recoverOutbox) diffed, applied to base and sent without
       it — so an Editor demoted to Viewer who pressed Cmd+Z sent the ops anyway, and a Commenter's Undo of
       her own Resolve was refused with "you can only comment". Every op the role may not send is written
       back from base into live, BEFORE it is applied to base, recorded or queued. */
    function backstop(res) {
      const keep = { ops: [], recs: [], orders: res.orders }, bad = [];
      for (let i = 0; i < res.ops.length; i++) {
        if (C.Host.allowed(S.role, res.ops[i], S.base, S.mid)) { keep.ops.push(res.ops[i]); keep.recs.push(res.recs[i]); }
        else bad.push(res.ops[i]);
      }
      if (!bad.length) return res;
      /* An order statement describes the stack this diff SAW; a refused move never happened, so the
         step must not remember one (undo would "restore" an order nobody made). */
      if (bad.some(function (op) { return op.o === 'li' || op.o === 'lr' || op.o === 'mv' || op.o === 'am'; })) {
        keep.orders = (res.orders || []).filter(function (st) { return keep.ops.some(function (op) { return op.o === 'ai' && st.p && P.key(st.p) === P.key(op.p); }); });
      }
      revertToBase(bad);
      if (S.role === 'viewer' || S.role === 'commenter') refusedOnce();
      return keep;
    }

    /* Every op we may have to replay carries the value its author saw (§6.1), because the host's CAS
       is stateless: a reconnect after a host reload has nothing to compare against but this. */
    function withBefore(op, rec) {
      const out = {};
      Object.keys(op).forEach(function (k) { out[k] = op[k]; });
      if (!rec) return out;
      if (op.o === 'lr' || op.o === 'ar') { if (rec.bh != null) out.bh = rec.bh; else if (rec.b !== undefined) out.bh = cyrb53(canon(rec.b)); }
      else if (rec.b === undefined) out.b = { $u: 1 };
      else out.b = clone(rec.b);
      return out;
    }

    function flushOutstanding() {
      for (let i = 0; i < outstanding.length; i++) {
        const e = outstanding[i];
        if (e.sent) continue;
        /* q:1 marks a tx the host must CAS, i.e. one written against a base the host may have moved
           past. Anything that waited out an offline stretch qualifies, and so does a re-send. */
        const q = (e.queued || e.replay) ? 1 : 0;
        const ops = q ? e.ops : e.ops.map(stripBefore);
        if (!sendToHost({ t: 'tx', cid: e.cid, ops: ops, q: q })) { markOffline(); return; }
        e.sent = true;
      }
    }
    function stripBefore(op) {
      if (op.b === undefined && op.bh === undefined) return op;
      const out = {};
      Object.keys(op).forEach(function (k) { if (k !== 'b' && k !== 'bh') out[k] = op[k]; });
      return out;
    }

    /* ═══ §8.2 — HELD AND DEFERRED ══════════════════════════════════════════════════════════════ */

    function markHeld(res) {
      for (let i = 0; i < res.ops.length; i++) {
        const op = res.ops[i];
        const k = P.key(pathOf(op));
        if (!(k in held)) held[k] = { b: (res.recs[i] && res.recs[i].b !== undefined) ? clone(res.recs[i].b) : undefined };
        if (op.o === 'li' || op.o === 'lr' || op.o === 'mv') heldStructural = true;
      }
    }
    function overlapsHeld(p) {
      const keys = Object.keys(held);
      for (let i = 0; i < keys.length; i++) { const q = P.fromWire(keys[i]); if (q && P.overlaps(p, q)) return true; }
      return false;
    }
    /* ⚠️ `deferred` IS KEYED BY THE INCOMING OP'S PATH, `held` BY THE LOCAL ONE (queue 921), and the
       test that pairs them — `overlapsHeld` → `P.overlaps` — is a prefix match in EITHER direction.
       So clearing a deferral by the held key alone leaves every deferral at a different depth behind:
       a remote rename under a held `mv`, a remote effect parameter under a held `ai`. Both callers
       below mean "everything under this path", so both have to say it in the deferred map's own
       terms. */
    function dropDeferredUnder(p) {
      Object.keys(deferred).forEach(function (k) {
        const q = P.fromWire(k);
        if (q && P.overlaps(p, q)) delete deferred[k];
      });
    }
    function dropHeldUnder(p) {
      Object.keys(held).forEach(function (k) {
        const q = P.fromWire(k);
        if (q && P.overlaps(p, q)) delete held[k];
      });
      dropDeferredUnder(p);
    }

    /* §8.2's release, run at the commit hook and at settle.
     *
     * 📐 DECIDED AGAINST §9's STATED ORDER, and §9 has been updated. It lists "normalizeDerived, then
     * stampIds, then diff, then release rules". Measured: with the diff first, a gesture that was
     * ROLLED BACK (a pinch cancel, timeline.js's restoreGestures) diffs live-back-at-`b` against a base
     * that already holds the remote value, so the diff emits `s{p, v:b}` — which UNDOES the other
     * person's change and sends it. Release has to run BEFORE the diff for the rollback half of the
     * rule to mean anything; the re-assert half then falls out of the very next diff for free, because
     * a held path whose live value differs from base is exactly what the diff emits. */
    function release() {
      /* ⚠️ THE §8.9 BARRIER APPLIES HERE TOO (queue 921). `S.tick` runs drainQueue, then this settle,
         then pushLocal — and the two neighbours stand down while an export or a job is in flight
         while this one did not. So a deferred remote op, plus everything in `forced` and the parked
         order, were written into FM.scene mid-export (a frame rendered from a document that changed
         under it) or mid-job (a write into a tree the job is halfway through rebuilding), and
         afterApply then rebuilt the timeline and could restart audio. Nothing is lost by waiting:
         held/deferred/forced are left exactly as they are, and the very next tick after the barrier
         lifts finds the same settle condition and runs. */
      if (frozen() || busy()) return false;
      let did = false;
      /* ⚠️ WALK `deferred`, NOT `held`. The two maps are keyed from DIFFERENT paths — `held` by the
         local op's (`pathOf`, so `['L',id]` for an `li`/`lr`/`mv` and the ARRAY path for an `ai`) and
         a deferral by the incoming op's — while the test that created the deferral matches a prefix in
         either direction. The keys are therefore equal only when the two paths are identical, and this
         loop looked its entries up by exact key: a remote rename arriving during a local reorder, or a
         remote effect parameter arriving during a local "add effect", was parked under a key nothing
         could find, dropped when the maps were cleared below, and then REVERTED on every device by the
         next diff — base had the value, live did not, so the diff sent live's. Silently, with no clash
         count and nothing in the reports. A deferred op now has exactly two fates (queue 921).
         The rollback question — "did the person let go without changing it?" — can only be asked of
         the path the held record was taken for. §8.2 protects the value under the finger; an op on a
         different path is not that value, so it is taken rather than thrown away. */
      Object.keys(deferred).forEach(function (k) {
        const d = deferred[k];
        const p = P.fromWire(k);
        if (!p) return;
        const h = held[k];
        if (h && !eq(D.valueAt(doc(), p), h.b)) {
          S.stats.reasserted++;        // the diff below emits the live value; the host sequences it last
          return;
        }
        /* Rolled back — or never held at this path at all: either way the value they were protected
           from is the value they should now see. Nothing is sent. */
        D.apply(doc(), d, liveOpts());
        S.stats.adopted++; did = true;
      });
      for (let i = 0; i < forced.length; i++) { D.apply(doc(), forced[i], liveOpts()); did = true; }
      if (forced.length) S.stats.forcedN += forced.length;
      if (deferredOrd) { D.applyOrder(doc(), deferredOrd); deferredOrd = null; did = true; }
      held = Object.create(null);
      deferred = Object.create(null);
      forced = [];
      heldStructural = false;
      if (did && A.afterApply) A.afterApply({ wasSelected: A.selected ? A.selected() : null, paths: [], layerIds: {}, removed: [], structural: true, projectKeys: {}, release: true });
      return did;
    }

    /* ═══ §8 — RECEIVING ════════════════════════════════════════════════════════════════════════ */

    function strictAncestorOfClaimed(p) {
      const seen = Object.keys(pending).concat(Object.keys(held));
      for (let i = 0; i < seen.length; i++) {
        const q = P.fromWire(seen[i]);
        if (q && q.length > p.length && P.overlaps(p, q)) return true;
      }
      return false;
    }
    function overlapsPending(p) {
      const keys = Object.keys(pending);
      for (let i = 0; i < keys.length; i++) { const q = P.fromWire(keys[i]); if (q && P.overlaps(p, q)) return true; }
      return false;
    }
    function laterPending(p, cid) {
      const keys = Object.keys(pending);
      for (let i = 0; i < keys.length; i++) {
        if (pending[keys[i]] <= cid) continue;
        const q = P.fromWire(keys[i]);
        if (q && P.overlaps(p, q)) return true;
      }
      return false;
    }
    function dropPendingUnder(p) {
      Object.keys(pending).forEach(function (k) { const q = P.fromWire(k); if (q && P.overlaps(p, q)) delete pending[k]; });
    }

    function classify(op) {
      if (isStructuralOp(op)) return 'struct';
      if (isMoveOp(op)) return 'move';
      return strictAncestorOfClaimed(pathOf(op)) ? 'struct' : 'leaf';
    }

    /* opts: {own:true, cid} for our own ack echo; {by:mid} otherwise. Returns the summary §8.6 needs. */
    function applyIncoming(ops, opts) {
      const oo = opts || {};
      const sum = {
        wasSelected: A.selected ? A.selected() : null,
        paths: [], layerIds: Object.create(null), removed: [], inserted: [],
        structural: false, projectKeys: Object.create(null), by: oo.by || null
      };
      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        const p = pathOf(op);
        const kind = classify(op);

        if (oo.own) {
          /* §8.5: our own ack repairs any host-side resolution difference. It always lands in base;
             it lands in live unless a later cid or the current interaction owns that path. */
          D.apply(S.base, op);
          /* S7: a comment the host stamped is our own comment coming back with its real author and time
             — taken even while `P/comments` is held (the Post tap is still "interacting" for 250 ms), or
             live keeps our guess at `at` and the next diff tries to send it. */
          if (!laterPending(p, oo.cid) && (!overlapsHeld(p) || commentStamp(op))) applyLive(op, sum);
          continue;
        }

        if (kind === 'leaf' && overlapsPending(p)) { S.stats.skipped++; continue; }   // §8.1

        if (kind !== 'struct' && overlapsHeld(p)) {                                    // §8.2
          D.apply(S.base, op);
          deferred[P.key(p)] = op;
          S.stats.deferredN++;
          continue;
        }

        D.apply(S.base, op);
        applyLive(op, sum);
        if (kind === 'struct') {                                                       // §8.3
          dropPendingUnder(p);
          dropHeldUnder(p);
          S.stats.structWins++;
          const lid = layerIdOf(op);
          if (lid && A.cancelGesturesOn) { try { A.cancelGesturesOn(lid); } catch (e) {} }
        }
      }
      keepIds = null;
      if (A.afterApply) A.afterApply(sum);
      if (A.autosave) { try { A.autosave(); } catch (e) {} }        // §8.6 step 6 / §7.1 step 12
      return sum;
    }

    function applyLive(op, sum) {
      const removes = (op.o === 'lr');
      const r = D.apply(doc(), op, liveOpts());
      if (r === 'ok' || r === 'noop') {
        const p = pathOf(op);
        sum.paths.push(P.key(p));
        const lid = layerIdOf(op);
        if (lid) sum.layerIds[lid] = 1;
        if (removes) sum.removed.push(op.id);
        if (op.o === 'li') sum.inserted.push(op.id);
        if (op.o === 'li' || op.o === 'lr' || op.o === 'mv') sum.structural = true;
        if (p[0] === 'P' && p.length > 1) sum.projectKeys[p[1]] = 1;
      }
      return r;
    }

    /* §8.3a: a batch that reordered something states the resulting order. Adopting it while the layer
       list is HELD would make the stack jump under a finger mid-drag, so it waits for the release. */
    function adoptOrder(ord, remote) {
      if (!ord || !ord.length) return;
      for (let i = 0; i < ord.length; i++) {
        const st = ord[i];
        D.applyOrder(S.base, st);
        /* ⚠️ ONLY THE LAYER LIST WAITS, AND ONLY IT EVER COULD (queue 921). `heldStructural` means a
           finger is on the LAYER STACK, so that is the one array an adoption could yank out from under
           it — §8.3a's whole reason for the deferral. This used to park `ord[0]` and apply every other
           statement to BASE ONLY: a batch that both moved a layer and touched a keyed array (one
           statement per disturbed array, collab-diff.js orderStatementsFor) left live holding a stale
           effect order for good, and the next diff then dragged base back to it and undid the other
           person's reorder on every device. A second batch also overwrote the single slot before the
           first had been released, losing that one too. Order statements are absolute, so the newest
           layer statement replacing a parked one is exactly right. */
        if (remote && heldStructural && st.p == null) { deferredOrd = st; continue; }
        D.applyOrder(doc(), st);
      }
    }

    /* §8.4: turn any local in-flight change into a pending or held path BEFORE remote values land. */
    function flushBefore() {
      if (A.flushPendingCommit) { try { A.flushPendingCommit(); } catch (e) {} }
      pushLocal('hot');
    }

    /* ═══ MESSAGES ══════════════════════════════════════════════════════════════════════════════ */

    S.onMessage = function (ch, msg, fromMid) {
      /* Any byte from the host is proof it is there — `pres` every 2 s, `bulk` during a transfer — so the
         silence clock resets on every channel, BEFORE §8.9's queue can hold the message back: an export
         must not read as the host going quiet. */
      if (!isOwner) lastHeard = now();
      /* §15.5's media bytes (S4). They carry no document and no ops, so they go straight to the media
         module — including while §8.9 has the document frozen, because the PARTS are inert records
         under `collab:` and only the APPLY has to wait (see collab-media.js `complete`). Holding the
         bytes as well would stall a transfer for the length of an export and then need the whole
         window re-sent. */
      if (ch === 'bulk') {
        if (isOwner && !mayOffer(fromMid)) return;           // S7 review: see `mayOffer`
        if (C.media) C.media.onBulk(S, fromMid || (isOwner ? null : 'h'), msg);
        return;
      }
      /* §18 (S5): presence has its own channel and its own module, and it never touches the document —
         so it is answered here, before §8.9's frozen/busy queue, exactly like the media bytes above. */
      if (ch === 'pres') { if (C.presence) { try { C.presence.onPres(S, isOwner ? fromMid : 'h', msg); } catch (e) { C.lastError = e; } } return; }
      if (ch !== 'ctl') return;
      if (!msg || typeof msg !== 'object') return;
      if (isOwner) return hostMessage(fromMid, msg);
      return guestMessage(msg);
    };

    function hostMessage(mid, msg) {
      switch (msg.t) {
        case 'hello': return onHello(mid, msg);
        /* §20: answered from onmessage, never queued — its whole meaning is "I am here right now". */
        case 'ping': sendTo(mid, { t: 'pong', n: (typeof msg.n === 'number' && isFinite(msg.n)) ? msg.n : 0, hc: now() }); return;
        case 'tx': {
          const r = host.receive(mid, msg);
          if (r.ack) sendTo(mid, r.ack);
          if (r.b) {
            broadcast(r.b, mid);
            lastBatchAt = now();
            const all = r.b.ops.concat(r.b.fix || []);
            if (frozen() || busy()) { msgQueue.push({ kind: 'live', ops: all, by: mid, ord: r.b.ord }); S.stats.queued++; }
            else { applyIncoming(all, { by: mid }); adoptOrder(r.b.ord, true); }
          }
          return;
        }
        case 'resync':
          /* Only a member is owed a copy of the document — and only as fast as `catchUp` allows (S8). */
          if (!host.members[mid]) { strangerNote(mid, 'resync'); return; }
          S.stats.resyncs++;
          catchUp(mid, null);
          return;
        case 'bye':
          host.part(mid);
          /* ⚠️ CLOSE IT, don't just forget it. postMessage and a data channel both go quiet without
             saying so, so the peer's endpoint is still "open" from this side and whatever created it
             will hand the same one back on a reconnect — with its onmessage bound to a mid this host
             has just removed. The next hello then reaches `sendTo(deadMid, …)`, which has no endpoint
             to send through, and the welcome and the snapshot are never sent: the rejoin simply hangs
             (queue 921 S2, found by the leave-then-rejoin test). */
          if (peers[mid]) { try { peers[mid].close(); } catch (e) {} }
          delete peers[mid];
          delete grants[mid];
          delete catchBudget[mid];
          if (C.media && C.media.forget) C.media.forget(S, mid);
          /* S8 review: the UI owns the room's member table, and a member who LEFT is not coming back on that
             token (their copy became their own). `paused` and a dropped link are not this. */
          if (A.onPeerLeft) { try { A.onPeerLeft(mid, typeof msg.why === 'string' ? msg.why.slice(0, 16) : ''); } catch (e) {} }
          return;
        default:
          /* ⚠️ OFFERING A FILE IS AN EDIT (S7 review). A peer's `ann` makes it the SOURCE of a file for a layer,
             and the file it sends is written over that layer's record on this device — so a Viewer who named
             one of his clips at `mediaRev + 1` could replace it with any bytes she liked, with no document op,
             nothing kept in `prev:` and nothing any role check would ever see. Only a member who may change
             the document may offer it media; everybody may still ASK for it (`want`, `ok`, `have`). */
          if ((msg.t === 'ann' || msg.t === 'mf') && !mayOffer(mid)) return;
          if (C.media && C.media.onCtl(S, mid, msg)) return;      // mf / ann / want / ok / have (§15, S4)
          return;
      }
    }
    function mayOffer(mid) {
      const m = host && mid != null ? host.members[mid] : null;
      return !!m && m.role === 'editor';
    }

    function onHello(mid, msg) {
      /* ⚠️ A HELLO NEVER MAKES A MEMBER, AND NEVER NAMES ITS OWN ROLE (queue 921 S8, found by the adversarial
         fuzz). It used to be `members[mid] || host.join(mid, {role: msg.role || 'editor'})` — so a hello from an
         endpoint whose member had been dropped (`dropPeer` forgets the member and leaves the endpoint bound; a
         transport that delivers one more message after its close is all it takes) came back as a member with
         whatever role it SAID: `{t:'hello', role:'owner'}` was an owner, whose next tx the host took whole —
         layers, the project, anybody's comments. Membership is minted in exactly one place, `addPeer`, from what
         the owner's UI decided, and a hello from anywhere else is a stranger's and is not answered. */
      const m = host.members[mid];
      if (!m) { strangerNote(mid, 'hello'); return; }
      const have = (msg.have && typeof msg.have === 'object') ? msg.have : {};
      /* S5: a member who says hello (joined, or came back) is owed the roster and everybody's state now. */
      if (C.presence) { try { C.presence.onJoin(S, mid); } catch (e) {} }
      const welcome = { t: 'welcome', mid: mid, epoch: host.epoch, seq: host.seq, role: m.role, proto: C.PROTO, schema: C.SCHEMA_REV };
      /* S6: the member's own token, to THAT member only. It is what lets the phone come back after a lock
         without the owner being asked again (D5), so it goes nowhere else — not in the roster, not in a
         broadcast. */
      if (grants[mid]) {
        welcome.rid = grants[mid].rid; welcome.tok = grants[mid].tok;
        /* S6 review: …and the room's hub, the members-only topic its reconnect goes through. */
        if (typeof grants[mid].hub === 'string') welcome.hub = grants[mid].hub;
      }
      if (host.ownerSelf && typeof host.ownerSelf.name === 'string') welcome.hostName = host.ownerSelf.name.slice(0, LIM.NAME);
      sendTo(mid, welcome);
      /* S7: …and the room's switches, as they apply to this member, before a byte of the document. */
      sendSettings(mid);
      catchUp(mid, have);
    }

    /* ═══ S8 · A COPY OF THE DOCUMENT IS THE ONE THING A PEER CAN MAKE THE OWNER PAY FOR ═══════════════════
     * A `hello` and a `resync` are each one small message, and each makes the owner clone, hash and send the
     * whole document — or a tail of up to the ring's 2000 batches / 8 MB. Nothing limited them: the
     * adversarial fuzz had a VIEWER ask for a copy on every message it sent, and the owner's device spent the
     * minute making copies (§14.9 — treat every peer as untrusted, and a Viewer is a peer). An honest device
     * asks once per connection and once per divergence, which §11.4 already spaces to one per ten seconds;
     * so each member gets CATCHUP_BURST copies at once and one more every CATCHUP_EVERY. A request over the
     * budget is not refused — it is OWED, and the newest one wins: the next tick with a token sends it. A
     * guest that really fell behind therefore still gets exactly one current copy, a little later, and a
     * flood costs the owner three copies and then one every two seconds, whatever its rate. */
    const catchBudget = Object.create(null);         // mid -> {tokens, at, owed}
    function catchToken(mid) {
      const t = now();
      let b = catchBudget[mid];
      if (!b) b = catchBudget[mid] = { tokens: LIM.CATCHUP_BURST, at: t, owed: null };
      b.tokens = Math.min(LIM.CATCHUP_BURST, b.tokens + (t - b.at) / LIM.CATCHUP_EVERY);
      b.at = t;
      if (b.tokens < 1) return false;
      b.tokens -= 1;
      return true;
    }
    function catchUp(mid, have) {
      if (!catchToken(mid)) { catchBudget[mid].owed = { have: have }; return false; }
      catchBudget[mid].owed = null;
      sendCopy(mid, have);
      return true;
    }
    function sendCopy(mid, have) {
      if (have && have.epoch === host.epoch) {
        const tail = host.tail(have.seq || 0);
        if (tail) { sendTo(mid, tail); return; }
      }
      sendTo(mid, host.snapshot());
    }
    function serveOwed() {
      const ks = Object.keys(catchBudget);
      for (let i = 0; i < ks.length; i++) {
        const mid = ks[i], b = catchBudget[mid];
        if (!host.members[mid] || !peers[mid]) { delete catchBudget[mid]; continue; }
        if (b.owed && catchToken(mid)) { const o = b.owed; b.owed = null; sendCopy(mid, o.have); }
      }
    }
    S._catchUp = function (mid) { const b = catchBudget[mid]; return b ? { tokens: b.tokens, owed: !!b.owed } : null; };
    /* A message from an endpoint with no member behind it — dropped, removed or never let in. Counted, once a
       second at most, so a flood of them is visible in the diagnostics without being able to fill them. */
    let strangerAt = 0, strangerN = 0;
    function strangerNote(mid, what) {
      strangerN++;
      const t = now();
      if (t - strangerAt < 1000) return;
      strangerAt = t;
      reports.push({ what: 'stranger', at: t, mid: mid, msg: what, n: strangerN });
      while (reports.length > 20) reports.shift();       // the same ceiling onHash keeps
    }

    function guestMessage(msg) {
      /* §15's media conversation does not touch the document, so it is answered BEFORE the §8.9 queue
         rather than parked in it (S4). Queueing `want` for the length of an export would stall the
         other device's transfer; queueing `mf` would hide files the export dialog has to ask about. */
      if (C.media && C.media.onCtl(S, 'h', msg)) return;
      /* …and so is presence's half of `ctl` (S5): who is here (`roster`) and a refused lease (`lease-no`).
         Queued behind an export, a `lease-no` would leave the text editor open on a layer somebody else
         holds for as long as the export runs. */
      if (C.presence && C.presence.onCtl(S, 'h', msg)) return;
      if (msg.t === 'pong') return;                 // S6: consumed by the silence clock above, never queued
      /* §8.9: a guest queues WHOLE incoming messages while frozen or busy, so an export or a half-built
         paste never sees a document somebody else is changing underneath it. */
      if ((frozen() || busy()) && msg.t !== 'welcome') { msgQueue.push({ kind: 'msg', msg: msg }); S.stats.queued++; return; }
      switch (msg.t) {
        case 'welcome':
          S.mid = msg.mid || S.mid;
          S.epoch = msg.epoch;
          S.role = msg.role || S.role;
          if (typeof msg.hostName === 'string' && msg.hostName) S.hostName = msg.hostName.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').slice(0, LIM.NAME);
          /* S6 review: the owner has ADMITTED this hello — the one moment "back in sync" is true. */
          if (A.onWelcome) try { A.onWelcome(msg); } catch (e) {}
          return;
        case 'snap': return onSnap(msg);
        case 'tail': {
          for (let i = 0; i < msg.batches.length; i++) onBatch(msg.batches[i]);
          replayOutstanding();
          return;
        }
        case 'b': return onBatch(msg);
        case 'ack': return onAck(msg);
        case 'hash': return onHash(msg);
        /* ⚠️ A DEMOTION HAS TO TRAVEL (queue 921 S3 review). `H.setRole` moved a number in the owner's
           own member table and nothing else: the guest kept the full editing UI, the view-only banner
           never appeared, and the first they knew of it was a refusal toast one edit at a time. */
        case 'role': {
          const r = typeof msg.role === 'string' ? msg.role : '';
          if (r !== 'editor' && r !== 'commenter' && r !== 'viewer') return;
          if (r === S.role) return;
          S.role = r;
          if (A.onRole) try { A.onRole(r); } catch (e) {}
          return;
        }
        /* S7 (§20 `settings`): the owner's room switches as they apply to THIS member — export for viewers
           and commenters, the invite for editors. A stranger's string all of it: the booleans are booleans,
           the number is a number, and the link is kept only if it is an invite link to this app. */
        case 'settings': {
          const x = msg.s && typeof msg.s === 'object' ? msg.s : {};
          const rs = { roExport: x.roExport !== false, editorsInvite: x.editorsInvite === true, max: (typeof x.max === 'number' && isFinite(x.max)) ? Math.max(2, Math.min(12, Math.round(x.max))) : null };
          if (typeof x.link === 'string' && x.link.length <= 400 && /^https?:\/\/[^\s#]+#j=[A-Za-z0-9_-]{44}$/.test(x.link)) {
            rs.link = x.link;
            rs.ask = x.ask !== false;
            rs.linkRole = (x.linkRole === 'viewer' || x.linkRole === 'commenter') ? x.linkRole : 'editor';
          }
          if (typeof x.owner === 'string') rs.owner = x.owner.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').slice(0, LIM.NAME);
          S.roomSettings = rs;
          if (rs.owner) S.hostName = rs.owner;
          if (A.onSettings) try { A.onSettings(rs); } catch (e) {}
          return;
        }
        /* ⚠️ `paused` IS NOT AN END (S6). The owner sends it when he opens ANOTHER project (§12.1 `paused`),
           and sharing comes back the moment he reopens this one (resume on reopen). Read as `ended` it
           marked this copy finished — its reconnect never started, and the next open DETACHED it into a
           project of its own, so an owner glancing at another project cut every guest loose for good.
           It is the wire going, said politely: the link is closed here, and the reconnect takes it. */
        case 'bye':
          if (msg.why === 'paused') { if (link) { try { link.close('paused'); } catch (e) {} } return; }
          S.ended = msg.why || 'ended'; S.active = false; if (A.onEnd) A.onEnd(msg.why); return;
        /* S6: the owner's answer to a RECONNECT's hello can be a refusal (§14.7's version gate, removed,
           full). The app decides what it means — stop trying, or try again later. */
        case 'deny': if (A.onDeny) { try { A.onDeny(typeof msg.why === 'string' ? msg.why.slice(0, 16) : 'auth'); } catch (e) {} } return;
        default: return;
      }
    }

    function onBatch(b) {
      flushBefore();
      S.stats.batches++;
      lastBatchAt = now();
      /* ⚠️ A GAP IS KNOWABLE THE MOMENT IT LANDS (queue 921). `S.bs = b.seq` below was assigned blind,
         so a batch that never arrived — dropped in the join handshake, lost on a flaky link — left no
         trace at all, and the ONLY thing that could ever notice was §11.4's divergence hash: 2 s of
         quiet, at most once per 10 s, and skipped entirely while this device has anything outstanding,
         which during an edit is always. Ten seconds of two people disagreeing about the layer stack,
         at best; for ever when the dropped batch was the host's last one, because `onHash` bails
         unless `msg.seq === S.bs`. One comparison costs one snapshot instead. */
      if (S.bs && b.seq != null && b.seq > S.bs + 1) {
        S.stats.gaps = (S.stats.gaps || 0) + 1;
        sendToHost({ t: 'resync', seq: S.bs, h: S.baseHash() });
      }
      applyIncoming(b.ops.concat(b.fix || []), { by: b.by });
      adoptOrder(b.ord, true);
      S.bs = b.seq;
      persistSoon();
    }

    function onAck(ack) {
      const i = outstanding.findIndex(function (e) { return e.cid === ack.cid; });
      const entry = i >= 0 ? outstanding[i] : null;
      if (entry) {
        outboxOps -= entry.ops.length;
        outboxBytes -= canon(entry.ops).length;
        outstanding.splice(i, 1);
        if (S.outboxFull && outboxOps <= LIM.OUTBOX_OPS && outboxBytes <= LIM.OUTBOX_BYTES) {
          S.outboxFull = false;
          if (A.onOutboxFull) { try { A.onOutboxFull(false); } catch (e) {} }
        }
      }
      Object.keys(pending).forEach(function (k) { if (pending[k] <= ack.cid) delete pending[k]; });
      flushBefore();
      applyIncoming((ack.ops || []).concat(ack.fix || []), { own: true, cid: ack.cid });
      adoptOrder(ack.ord);
      if (ack.seq != null) S.bs = Math.max(S.bs, ack.seq);
      if ((ack.lost && ack.lost.length) || (ack.rej && ack.rej.length)) { forceRefused(ack, entry); onClash(ack, entry); }
      /* S8 review: the host's repair of what it refused did not all fit its budget (collab-host.js FIX_OPS), so
         the rest of the truth comes as a copy — asked for once, and paced by the owner's `catchUp`. */
      if (ack.resync === 1) sendToHost({ t: 'resync', seq: S.bs, h: S.baseHash() });
      persistSoon();
    }

    /* §8.2's last rule, and it is not cosmetic: "rejected paths are put into `forced` and applied to
       live at release regardless".
       ⚠️ WITHOUT IT A REFUSED EDIT MID-GESTURE LOOPS FOREVER. The ack carries the host's value for the
       refused path (§7.1 step 11), but a HELD path does not take it — that is what held means — so at
       release the live value still differs from base, the re-assert fires, the host refuses it again,
       and a viewer who merely rests a finger on a slider produces a tx every hundred milliseconds for
       as long as they hold it. `forced` is the exception to held: the refusal wins whatever the finger
       is doing, and dropping the held entry is what stops the re-assert (queue 921 S2). */
    function forceRefused(ack, entry) {
      if (!entry) return;
      const refused = (ack.rej || []).concat(ack.lost || []);
      for (let i = 0; i < refused.length; i++) {
        const op = (refused[i][0] === '*') ? null : entry.ops[refused[i][0]];
        if (!op) continue;
        const k = P.key(pathOf(op));
        if (!(k in held)) continue;
        delete held[k];
        const p = P.fromWire(k);
        if (!p) continue;
        dropDeferredUnder(p);          // the deferred map is keyed by the INCOMING path — see dropHeldUnder

        const cur = D.valueAt(S.base, p);
        /* S8: a keyed element that is back in base goes back on screen as an upsert with its place — an `s` on
           an element this screen has already removed is 'gone' (see collab-host.js `presentOp`). */
        const last = p[p.length - 1];
        if (cur !== undefined && p.length >= 3 && P.isKeyedSeg(last) && cur && typeof cur === 'object' && !Array.isArray(cur)) {
          const arr = D.valueAt(S.base, p.slice(0, -1));
          const field = P.keyedField(last);
          const at = Array.isArray(arr) ? P.indexOfKey(arr, field, P.keyedValue(last)) : -1;
          forced.push({ o: 'ai', p: p.slice(0, -1), k: last, a: at > 0 ? P.keyedSeg(field, arr[at - 1][field]) : null, v: clone(cur) });
          continue;
        }
        forced.push(cur === undefined ? { o: 'd', p: p } : { o: 's', p: p, v: clone(cur) });
      }
    }

    /* §13.4: the clashes are counted and named, and "Save my version as a copy" is offered. `myVersion`
       was taken before the reconnect, so the offer is real rather than a phrase. */
    function onClash(ack, entry) {
      const lost = (ack.lost || []).length, gone = (ack.rej || []).filter(function (r) { return r[1] === 'gone'; }).length;
      const role = (ack.rej || []).filter(function (r) { return r[1] === 'role'; }).length;
      const lease = (ack.rej || []).filter(function (r) { return r[1] === 'lease'; }).length;
      S.clashes = (S.clashes || 0) + lost + gone;
      /* The WORDING follows S.role, not the reason code: a viewer told "you can only comment" is being
         given the wrong permission to ask for (queue 921 S3 review). */
      /* …and an Editor is not a Commenter: the one thing an Editor is refused is a comment's author, time or
         pin, which only the host writes (S7 review). */
      if (role) toast(S.role === 'viewer' ? 'View only — ask for edit access' : S.role === 'commenter' ? 'You can only comment in this project' : 'That change to a comment wasn’t allowed, so it was put back');
      else if (lease) leaseToast(ack.rej, entry && entry.ops, 'that layer');
      if (lost || gone) {
        S.lastClash = { lost: lost, gone: gone, at: now() };
        /* §13.4 (S8 review): [Save my version as a copy] — a real offer now, because the version was kept
           before the flush. Ten seconds, and only while that version is under ten minutes old. */
        const mv = S.myVersionKept && (now() - S.myVersionKept.at) < 600000 ? S.myVersionKept : null;
        const said = lost + gone + ' of your offline changes clashed with newer edits and were not applied';
        if (mv && A.toastAction && A.saveVersion) {
          try { A.toastAction(said + ' — tap to save your version as a copy', function () { A.saveVersion(mv.D); }, 10000); } catch (e) {}
        } else toast(said);
      }
    }

    function onSnap(snap) {
      const mine = Object.create(null);
      Object.keys(pending).forEach(function (k) { mine[k] = 1; });
      Object.keys(held).forEach(function (k) { mine[k] = 1; });
      S.epoch = snap.epoch;
      S.bs = snap.seq;
      const snapD = snap.D;
      /* §11.4 step 3 / §13.2 step 4: the snapshot reaches base and live as a DIFF applied IN PLACE, not
         as a replacement. Replacing FM.scene.layers would detach the inspector, the mask tool and every
         kfDrag alias in one go — the exact thing §6.4 exists to prevent. */
      const toBase = D.diffDoc(S.base, snapD);
      for (let i = 0; i < toBase.ops.length; i++) D.apply(S.base, toBase.ops[i]);
      for (let i = 0; i < toBase.orders.length; i++) D.applyOrder(S.base, toBase.orders[i]);
      /* …then re-apply what is still ours, so an offline edit is not silently discarded by the catch-up. */
      for (let i = 0; i < outstanding.length; i++) {
        for (let j = 0; j < outstanding[i].ops.length; j++) D.apply(S.base, stripBefore(outstanding[i].ops[j]));
      }
      const toLive = D.diffDoc(view(), S.base);
      const sum = { wasSelected: A.selected ? A.selected() : null, paths: [], layerIds: Object.create(null), removed: [], inserted: [], structural: true, projectKeys: Object.create(null) };
      for (let i = 0; i < toLive.ops.length; i++) {
        const op = toLive.ops[i];
        if (mine[P.key(pathOf(op))]) continue;
        applyLive(op, sum);
      }
      for (let i = 0; i < toLive.orders.length; i++) D.applyOrder(doc(), toLive.orders[i]);
      keepIds = null;
      if (A.afterApply) A.afterApply(sum);
      if (A.autosave) { try { A.autosave(); } catch (e) {} }
      replayOutstanding();
      persistSoon();
      S.stats.snaps = (S.stats.snaps || 0) + 1;
    }

    /* §13.2 step 6: everything outstanding goes back out as q:1, in cid order. */
    function replayOutstanding() {
      for (let i = 0; i < outstanding.length; i++) { outstanding[i].sent = false; outstanding[i].replay = true; }
      if (S.online) flushOutstanding();
    }

    /* ═══ §11.4 — DIVERGENCE ════════════════════════════════════════════════════════════════════ */

    S.hash = function () {
      const v = view();
      return cyrb53(canon({ project: viewOfProject(v.project), layers: v.layers }));
    };
    S.baseHash = function () { return cyrb53(canon({ project: S.base.project, layers: S.base.layers })); };

    function onHash(msg) {
      if (Object.keys(pending).length || outstanding.length) return;
      if (frozen() || busy() || Object.keys(held).length) return;
      if (msg.seq !== S.bs) return;
      if (S.baseHash() === msg.h) return;
      if (S.hashPausedUntil && now() < S.hashPausedUntil) return;
      const t = now();
      resyncAt = resyncAt.filter(function (x) { return t - x < LIM.HASH_WINDOW; });
      resyncAt.push(t);
      reports.push({ what: 'resync', at: t, seq: msg.seq, theirs: msg.h, mine: S.baseHash(), epoch: S.epoch, schema: C.SCHEMA_REV, paths: differingPaths(msg) });
      while (reports.length > 20) reports.shift();
      S.stats.resyncs++;
      sendToHost({ t: 'resync', seq: S.bs, h: S.baseHash() });
      if (resyncAt.length >= LIM.HASH_ESCALATE) {
        S.hashPausedUntil = t + LIM.HASH_WINDOW;
        toast('Sync had trouble — a report was saved');
      }
    }
    function differingPaths() {
      /* The host's document is not here to compare against yet — the snap is what answers that. What IS
         knowable now is where OUR base and OUR live disagree, which is the local half of the report. */
      const res = D.diffDoc(S.base, view());
      return res.ops.slice(0, 50).map(function (op) { return P.key(pathOf(op)); });
    }

    /* The host's side: a hash when it has been quiet (§11.4 trigger). */
    function maybeHash() {
      if (!isOwner) return;
      const t = now();
      if (t - lastBatchAt < LIM.HASH_IDLE) return;
      if (t - lastHashAt < LIM.HASH_MIN) return;
      lastHashAt = t;
      broadcast({ t: 'hash', seq: host.seq, h: host.hash() }, null);
    }

    /* ═══ §10 — UNDO AND REDO (per person) ══════════════════════════════════════════════════════ */

    function record(res) {
      for (let i = 0; i < res.ops.length; i++) {
        const op = res.ops[i], rec = res.recs[i] || {};
        const k = P.key(pathOf(op));
        if (op.o === 's' || op.o === 'd') {
          const had = step.byKey[k];
          if (had !== undefined) {
            /* §10.1: within the open step, recs merge per path — keep the EARLIEST `b` and the LATEST
               after-value, so a 60-tick slider drag undoes in one move to where it started. */
            step.ops[had] = op;
            step.recs[had].after = (op.o === 's') ? clone(op.v) : undefined;
            step.recs[had].o = op.o;
            continue;
          }
          step.byKey[k] = step.ops.length;
          step.ops.push(op);
          step.recs.push({ p: rec.p || pathOf(op), o: op.o, b: rec.b === undefined ? undefined : clone(rec.b), after: (op.o === 's') ? clone(op.v) : undefined });
          continue;
        }
        step.ops.push(op);
        step.recs.push(rec);
      }
      for (let i = 0; i < res.orders.length; i++) step.orders.push(res.orders[i]);
    }

    function closeStep() {
      if (!step.ops.length) { step = newStep(); return; }
      undoStack.push({ ops: step.ops, recs: step.recs, orders: step.orders });
      while (undoStack.length > LIM.UNDO_STEPS) undoStack.shift();
      redoStack.length = 0;
      step = newStep();
      keepIds = null;
    }

    /* §10.4: the owner's pre-session steps, computed lazily from the snapshot stack. Only he edited
       before the session started, so attribution is exact and no rec is needed. */
    function preSessionStep() {
      if (!preSnaps || preIdx <= 0) return null;
      const to = docOfSnapshot(preSnaps[preIdx]);
      const from = docOfSnapshot(preSnaps[preIdx - 1]);
      preIdx--;
      if (!to || !from) return null;
      const res = D.diffDoc(from, to);
      res.recs.forEach(function (r, i) { if (res.ops[i].o === 's') r.after = clone(res.ops[i].v); });
      return { ops: res.ops, recs: res.recs, orders: res.orders, pre: true };
    }
    function docOfSnapshot(str) {
      try { const s = JSON.parse(str); return { project: viewOfProject(s.project), layers: s.layers }; }
      catch (e) { return null; }
    }

    function whoChanged(pathKey) {
      const by = isOwner ? host.lastBy.get(pathKey) : (S.lastBy && S.lastBy.get(pathKey));
      if (!by || by === S.mid) return 'someone else';
      const m = isOwner ? host.members[by] : null;
      return (m && m.name) || 'someone else';
    }

    function runStep(st, intoRedo) {
      if (A.flushPendingCommit) { try { A.flushPendingCommit(); } catch (e) {} }
      pushLocal('hot');
      const keepOps = [], keepRecs = [];
      let soft = 0, hardFail = null;
      for (let i = 0; i < st.ops.length; i++) {
        const op = st.ops[i], rec = st.recs[i] || {};
        const p = rec.p || pathOf(op);
        const cur = D.valueAt(S.base, p);
        if (op.o === 's' || op.o === 'd') {
          /* §10.2: undo only what is still as this person left it. Anything a peer has changed since is
             left alone and reported — an undo that silently reverted somebody else's later edit would
             be the single most damaging thing this feature could do. */
          if (eq(cur, rec.after)) { keepOps.push(op); keepRecs.push(rec); }
          else { soft++; hardFail = hardFail || null; S.lastSoftPath = P.key(p); }
          continue;
        }
        if (op.o === 'li') {
          if (cur !== undefined && canon(cur) === rec.after) { keepOps.push(op); keepRecs.push(rec); }
          else hardFail = P.key(p);
          continue;
        }
        if (op.o === 'lr' || op.o === 'ar') {
          if (cur === undefined) { keepOps.push(op); keepRecs.push(rec); }
          else hardFail = P.key(p);
          continue;
        }
        if (op.o === 'ai') {
          const at = D.valueAt(S.base, op.p.concat(op.k));
          if (at !== undefined) { keepOps.push(op); keepRecs.push(rec); }
          else hardFail = P.key(p);
          continue;
        }
        /* mv / am: order is restated absolutely by invertStep, so the only question is existence. */
        if (cur !== undefined) { keepOps.push(op); keepRecs.push(rec); }
        else hardFail = P.key(p);
      }
      if (hardFail) {
        /* All-or-nothing when a structural rec cannot be honoured, so an ungroup is never half-undone.
           The step is consumed either way (§10.2) — offering it again would just fail again. */
        toast("Can't undo — " + whoChanged(hardFail) + ' changed it since');
        return false;
      }
      const inv = D.invertStep({ ops: keepOps, recs: keepRecs, orders: st.orders || [] });
      const sum = { wasSelected: A.selected ? A.selected() : null, paths: [], layerIds: Object.create(null), removed: [], inserted: [], structural: false, projectKeys: Object.create(null) };
      for (let i = 0; i < inv.length; i++) applyLive(inv[i], sum);
      keepIds = null;
      if (A.afterApply) A.afterApply(sum);

      /* The inverse reaches everyone the ordinary way: an immediate full diff. Nothing special travels
         for an undo, which is why an undo can be received by a peer with no undo-specific rule at all. */
      recording = false;
      let res = diffNow('full');
      recording = true;
      if (!isOwner && res.ops.length) {
        res = backstop(res);
        /* Refused whole — nothing was undone, so the step is NOT used up: an Editor made a Viewer who presses
           Undo has it back when he is an Editor again, rather than losing one step per press. */
        if (!res.ops.length) {
          if (st.pre) preIdx++;
          else (intoRedo ? undoStack : redoStack).push(st);
          return false;
        }
      }
      if (res.ops.length) {
        if (isOwner) {
          const r = host.local(res.ops);
          if (r.b) { broadcast(r.b, null); lastBatchAt = now(); if (r.b.fix && r.b.fix.length) applyIncoming(r.b.fix, { by: S.mid, own: true }); adoptOrder(r.b.ord); }
        } else {
          const ops = res.ops.map(function (op, i) { return withBefore(op, res.recs[i]); });
          for (let i = 0; i < res.ops.length; i++) D.apply(S.base, res.ops[i]);
          S.cid += 1;
          for (let i = 0; i < ops.length; i++) if (ops[i].o === 's' || ops[i].o === 'd') pending[P.key(ops[i].p)] = S.cid;
          outstanding.push({ cid: S.cid, ops: ops, sent: false });
          if (S.online) flushOutstanding();
        }
        res.recs.forEach(function (r, i) { if (res.ops[i].o === 's') r.after = clone(res.ops[i].v); });
        (intoRedo ? redoStack : undoStack).push({ ops: res.ops, recs: res.recs, orders: res.orders });
        while (redoStack.length > LIM.UNDO_STEPS) redoStack.shift();
        while (undoStack.length > LIM.UNDO_STEPS) undoStack.shift();
      }
      if (A.autosave) { try { A.autosave(); } catch (e) {} }
      if (soft) toast('Part of this was changed by ' + whoChanged(S.lastSoftPath) + ' since, so it was left alone');
      return true;
    }

    S.undo = function () {
      const st = undoStack.pop() || preSessionStep();
      if (!st) return false;
      const ok = runStep(st, true);
      if (A.syncUndoButtons) A.syncUndoButtons();
      return ok;
    };
    S.redo = function () {
      const st = redoStack.pop();
      if (!st) return false;
      const ok = runStep(st, false);
      if (A.syncUndoButtons) A.syncUndoButtons();
      return ok;
    };
    S.canUndo = function () { return undoStack.length > 0 || (!!preSnaps && preIdx > 0); };
    S.canRedo = function () { return redoStack.length > 0; };
    S.seedPreSession = function (snaps) { preSnaps = snaps || null; preIdx = preSnaps ? preSnaps.length - 1 : -1; };
    S._undoDepth = function () { return { undo: undoStack.length, redo: redoStack.length, open: step.ops.length, pre: preIdx }; };

    /* ═══ HOOKS THE APP CALLS (§4.2) ════════════════════════════════════════════════════════════ */

    S.beforeSnap = function () {
      /* ⚠️ DRAIN FIRST. §8.9 says "when both clear, drain the queue in order, then run a full diff",
         and the only thing that noticed they had cleared was the 100 ms tick — so a commit that
         happened in between (the very next thing a paste or a split does) snapshotted a document that
         was missing everything queued during the job, and the diff below then had nothing to say about
         it either. A commit is by definition the moment the app is coherent again, which is exactly
         when the queue is safe to apply (queue 921 S2). */
      drainQueue();
      release();
      pushLocal('full');
    };
    S.afterCommit = function () { closeStep(); };
    S.beforeFlush = function () { release(); pushLocal('full'); S.persist(); };

    /* The scheduled work of §9, in one call so the app has one timer and the suite has one entry. */
    S.tick = function (scope) {
      if (!S.active) return 0;
      if (isOwner) serveOwed();
      drainQueue();
      if (!interacting() && (Object.keys(held).length || deferredOrd)) release();   // settle
      const n = pushLocal(scope || 'hot');
      maybeHash();
      liveTick();
      /* §15's reconcile (S4). It is deliberately the LAST thing the tick does and it is asynchronous
         inside, so a slow IndexedDB read can never delay the document half of the tick. */
      if (C.media) { try { C.media.tick(S); } catch (e) { C.lastError = e; } }
      return n;
    };

    function drainQueue() {
      if (!msgQueue.length) return;
      if (frozen() || busy()) return;
      const q = msgQueue.splice(0, msgQueue.length);
      for (let i = 0; i < q.length; i++) {
        if (q[i].kind === 'live') { applyIncoming(q[i].ops, { by: q[i].by }); adoptOrder(q[i].ord, true); }
        else guestMessage(q[i].msg);
      }
      pushLocal('full');                       // §8.9: drain, then a full diff
    }
    S._queued = function () { return msgQueue.length; };

    /* §12.4: the guest's base, so a reload can compute an outbox instead of losing the offline work. */
    let persistTimer = null, persistFails = 0;
    function persistSoon() {
      if (isOwner || !A.persistBase) return;
      if (Object.keys(pending).length || outstanding.length) return;
      if (persistTimer) return;
      persistTimer = setTimeout(function () { persistTimer = null; S.persist(); }, 2000);
    }
    /* A write that did not happen is a real condition, not a shrug: this guest currently has NO
       recovery point, so §12.4's reload would compute no outbox and the offline work would be
       overwritten by the next snapshot. Back off, keep trying, and say so once (queue 921). */
    function persistFailed() {
      persistFails++;
      if (persistFails === 3) toast('Your offline backup could not be saved — this device is low on storage');
      if (persistTimer || isOwner || !A.persistBase) return false;
      const wait = Math.min(30000, 2000 * Math.pow(2, Math.min(4, persistFails)));
      persistTimer = setTimeout(function () { persistTimer = null; S.persist(); }, wait);
      return false;
    }
    S.persist = function () {
      if (isOwner || !A.persistBase) return false;
      /* ⚠️ ONLY WHEN NOTHING IS OUTSTANDING, and the guard lives HERE rather than only in the 2-second
         scheduler. `base` is the confirmed document PLUS our own unsent ops, so persisting it mid-flight
         records work as if the host had already taken it — and §12.4's reload recovery, which is
         `diffDoc(persistedBase, live)`, then finds no difference and the offline edit is gone with no
         trace anywhere. The scheduler already checked; a direct caller (a reload, a visibilitychange,
         a test) did not (queue 921 S2). */
      if (Object.keys(pending).length || outstanding.length) return false;
      /* ⚠️ `cid` TRAVELS WITH IT. The host dedupes by "cid ≤ the last one I saw from you" (§7.1 step 3),
         so a guest that came back from a reload counting from zero has every recovered op silently
         DROPPED as a duplicate — the acks even look right, because a cached one is resent. Persisting
         the counter makes the recovery start where the connection left off, and it is what makes the
         replay idempotent in the other direction too: an op that WAS delivered comes back under the
         same cid the host already answered (queue 921 S2). */
      /* ⚠️ ANSWER FOR THE WRITE, NOT FOR HAVING ASKED FOR IT (queue 921). The bridge's `persistBase`
         goes to IndexedDB, which is async and which swallows a quota failure into a resolved `false`.
         The promise was dropped and `true` returned on the next line, so on a nearly-full phone the
         one thing that could have said the recovery point does not exist said it worked — and the
         failure only shows up much later as the guest's offline edits being quietly overwritten by a
         snapshot. The `catch` below could never see it either: an async rejection is not a throw. */
      let r;
      try { r = A.persistBase({ epoch: S.epoch, seq: S.bs, cid: S.cid, D: clone({ project: S.base.project, layers: S.base.layers }) }); }
      catch (e) { return persistFailed(); }
      if (r && typeof r.then === 'function') {
        return r.then(function (ok) { if (!ok) return persistFailed(); persistFails = 0; return true; },
          function () { return persistFailed(); });
      }
      if (r === false) return persistFailed();
      persistFails = 0;
      return true;
    };

    /* §12.4 guest reload recovery: whatever the live document holds that the persisted base does not
       becomes the outbox. A stale base is safe, because the host's CAS is idempotent (§13.3). */
    S.recoverOutbox = function (persisted) {
      if (!persisted || !persisted.D) return 0;
      const pb = persisted.D;
      S.base = { project: clone(pb.project), layers: clone(pb.layers) };
      S.epoch = persisted.epoch;
      S.bs = persisted.seq || 0;
      let res = D.diffDoc(S.base, view());
      if (!res.ops.length) return 0;
      if (!isOwner) { res = backstop(res); if (!res.ops.length) return 0; }
      const ops = res.ops.map(function (op, i) { return withBefore(op, res.recs[i]); });
      for (let i = 0; i < res.ops.length; i++) D.apply(S.base, res.ops[i]);
      S.cid += 1;
      for (let i = 0; i < ops.length; i++) if (ops[i].o === 's' || ops[i].o === 'd') pending[P.key(ops[i].p)] = S.cid;
      outstanding.push({ cid: S.cid, ops: ops, sent: false, queued: true });
      keepMyVersion();                          // §13.2 step 5: a reload's recovered work is offline work too
      return ops.length;
    };

    /* §13.1: offline is a state the link reports, never one we infer from silence and hope about. */
    function markOffline() {
      if (!S.online) return;
      S.online = false;
      for (let i = 0; i < outstanding.length; i++) { outstanding[i].sent = false; outstanding[i].queued = true; }
      if (A.onOffline) try { A.onOffline(); } catch (e) {}
    }
    S.setOnline = function (on) {
      if (on === S.online) return;
      /* ⚠️ DELEGATE — DO NOT PRE-ASSIGN (queue 921). `S.online = !!on` ran BEFORE markOffline(), whose
         own first line is `if (!S.online) return;`, so from this caller the body never ran at all:
         nothing was marked `queued`, and `queued` is what makes the re-send a `q:1` the host must CAS.
         The offline edits therefore went back out as `q:0`, which collab-host.js applies
         unconditionally — silently overwriting the newer edits made while this device was away, with
         `rej:[]`, `lost:[]`, no clash count and no toast: exactly the loss §13.3/§13.4 exist to stop.
         The entries already in flight were not re-sent at all, because they kept `sent:true`. Invisible
         because the link's own `onclose` path calls markOffline() while `S.online` is still true, and
         because `replayOutstanding()` sets `replay` when a tail happens to arrive first. */
      if (!on) { markOffline(); return; }
      S.online = true;
      lastHeard = now();
      keepMyVersion();
      /* Reconnect (§13.2): say where we are and let the host choose tail or snap. */
      sendToHost(helloMsg());
      if (A.onOnline) try { A.onOnline(); } catch (e) {}
    };
    S.myVersion = function () { return clone({ project: view().project, layers: view().layers }); };
    /* §13.2 step 5 (S8 review): "before sending, keep myVersion = clone(D live) for 10 minutes". Nothing kept it —
       `myVersion()` above had no caller, and by the time a clash toast could have used it the acks had already
       put the other editor's values into live. Kept at the one moment it is still this device's version: when
       there is offline work to send and it has not gone yet. */
    S.myVersionKept = null;
    function keepMyVersion() {
      if (isOwner || !outstanding.some(function (e) { return !e.sent; })) return;
      S.myVersionKept = { D: S.myVersion(), at: now() };
    }

    /* §4.2 storage hook: media a deleted layer still needs, because undo can bring it back. */
    S.reachable = function (id) {
      if (!keepIds) {
        keepIds = Object.create(null);
        const add = function (l) { if (l && l.id) keepIds[l.id] = 1; };
        (S.base.layers || []).forEach(add);
        const scan = function (stack) {
          for (let i = 0; i < stack.length; i++) {
            const st = stack[i];
            for (let j = 0; j < st.recs.length; j++) {
              const r = st.recs[j];
              if (r && r.b && r.b.id) keepIds[r.b.id] = 1;
              if (st.ops[j] && st.ops[j].id) keepIds[st.ops[j].id] = 1;
            }
          }
        };
        scan(undoStack); scan(redoStack); scan([step]);
      }
      return !!keepIds[id];
    };

    /* ═══ LINKS AND LIFECYCLE ═══════════════════════════════════════════════════════════════════ */

    S.setLink = function (ep) {
      link = ep;
      lastHeard = now();
      if (!ep) return;
      ep.onmessage = function (ch, msg) { S.onMessage(ch, msg, null); };
      /* ⚠️ ONLY THE CURRENT LINK MAY SAY THE WIRE WENT (S6). A reconnect hands the session a NEW link while
         the old one may still be closing; its late `onclose` used to reach markOffline() and put a session
         that had just come back straight offline again, with the replacement link open and ignored. */
      ep.onclose = function () { if (link === ep) markOffline(); };
      ep.onopen = function () { S.online = true; sendToHost(helloMsg()); };
    };
    S.hello = function (info) {
      const i = info || {};
      return sendToHost(helloMsg({ name: i.name, color: i.color }));
    };
    /* S6 (§20 `hello`): who this device is, carried on EVERY hello — the first one and each reconnect —
       so the owner's knock card, the version gate and the member table all read the same fields. */
    function helloMsg(extra) {
      const me = S.me || {};
      const m = { t: 'hello', role: S.role, have: { epoch: S.epoch, seq: S.bs }, proto: C.PROTO, schema: C.SCHEMA_REV };
      if (typeof me.name === 'string') m.name = me.name;
      if (typeof me.color === 'string') m.color = me.color;
      if (typeof me.mk === 'string') m.mk = me.mk;
      if (me.dev === 'phone' || me.dev === 'pc') m.dev = me.dev;
      if (typeof me.app === 'string') m.app = me.app;
      const x = extra || {};
      Object.keys(x).forEach(function (k) { if (x[k] !== undefined) m[k] = x[k]; });
      return m;
    }
    S._helloMsg = helloMsg;
    /* §21 liveness, guest side: a ping every 2 s, and six seconds with nothing at all from the host
       closes the link — which is what starts the reconnect. Without it a host whose phone locked leaves
       the data channel open-but-dead for the thirty-odd seconds ICE takes to call it failed, and the
       guest sits on "Live" typing into nothing. */
    S.setLiveness = function (on) { liveness = !!on; lastHeard = now(); lastPing = 0; return liveness; };
    function liveTick() {
      if (!liveness || isOwner || !S.online || !link || !link.open) return;
      const t = now();
      if (t - lastHeard > LIM.OFFLINE_AFTER) { try { link.close('silence'); } catch (e) {} return; }
      if (t - lastPing >= LIM.PING) { lastPing = t; sendToHost({ t: 'ping', n: ++pingN }); }
    }
    /* The owner side: one endpoint per member. The mid is minted HERE and never taken from the peer —
       a guest that could name its own mid could name the owner's and inherit his permissions. */
    S.addPeer = function (ep, info) {
      /* ⚠️ A CLOSED ENDPOINT IS NOT A MEMBER (queue 921 S3 review). The owner's knock card waited two
         minutes while the joining device gave up after thirty seconds and closed its link — so "Let in"
         could land on a connection that was already gone. `join` then added the member, the welcome and
         the whole snapshot were pushed into a closed channel, and because `onclose` had already fired
         before anything bound it the row NEVER went away: a person in his people list who was never
         there. Answer with null instead so the caller can say so; the deadlines were made one number at
         the same time (C.LIMITS.JOIN_WAIT), and this is the lock on that door. */
      if (ep && ep.open === false) return null;
      const i = info || { role: 'editor' };
      /* S6: a MEMBER coming back (token-verified by the owner's UI, never claimed by the peer) keeps the
         mid it had, so its presence, its leases and every "changed by" the host remembers still point at
         the same person. Only an id the host itself minted this session, and only when free. */
      const again = (typeof i.mid === 'string' && /^m\d{1,6}$/.test(i.mid) && !peers[i.mid] && +i.mid.slice(1) <= nextMid) ? i.mid : null;
      const mid = again || ('m' + (++nextMid));
      peers[mid] = ep;
      host.join(mid, i);
      if (typeof i.rid === 'string' && typeof i.tok === 'string') grants[mid] = { rid: i.rid, tok: i.tok, hub: typeof i.hub === 'string' ? i.hub : undefined };
      else delete grants[mid];
      ep.onmessage = function (ch, msg) { S.onMessage(ch, msg, mid); };
      ep.onclose = function () { };
      return mid;
    };
    /* The owner's half of a role change: the table AND the person. One call, so a panel cannot do the
       first and forget the second — which is exactly what shipped (queue 921 S3 review). */
    S.midTop = function () { return nextMid; };
    S.setPeerRole = function (mid, role) {
      if (!isOwner || !host.members[mid]) return false;
      host.setRole(mid, role);
      const now_ = host.members[mid].role;
      sendTo(mid, { t: 'role', role: now_ });
      /* S7: what the settings say depends on the role — an Editor gets the invite when he allows it, and
         loses it the moment he is not one. */
      sendSettings(mid);
      return now_ === role;
    };
    /* ═══ S7 · THE ROOM'S SWITCHES (§16.1, §20 `settings`) ════════════════════════════════════════
       The owner's UI keeps them (the host record); the session is only the wire. Each member is told what
       applies to IT: the link travels only to an Editor, and only while "Editors can invite others" is on
       — §20's broadcast of one `s` to everybody would have handed the room's key to every Viewer. */
    S.roomSettings = isOwner ? { roExport: true, editorsInvite: false, max: LIM.PEOPLE_DEFAULT } : null;
    function settingsFor(mid) {
      const rs = S.roomSettings || {};
      const m = host && host.members[mid];
      const out = { roExport: rs.roExport !== false, editorsInvite: rs.editorsInvite === true, max: rs.max || LIM.PEOPLE_DEFAULT };
      if (host && host.ownerSelf && host.ownerSelf.name) out.owner = host.ownerSelf.name;
      /* …with what the link does (S7 review): an Editor's panel promised "the owner still says yes to each new
         person" while the owner's link let people straight in. */
      if (out.editorsInvite && m && m.role === 'editor' && typeof rs.link === 'string') { out.link = rs.link; out.ask = rs.ask !== false; out.linkRole = rs.linkRole || 'editor'; }
      return out;
    }
    function sendSettings(mid) { if (isOwner && host && host.members[mid]) sendTo(mid, { t: 'settings', s: settingsFor(mid) }); }
    S.setRoomSettings = function (rs) {
      if (!isOwner || !rs || typeof rs !== 'object') return false;
      S.roomSettings = { roExport: rs.roExport !== false, editorsInvite: rs.editorsInvite === true, max: rs.max || LIM.PEOPLE_DEFAULT, link: typeof rs.link === 'string' ? rs.link : null,
        ask: rs.ask !== false, linkRole: (rs.linkRole === 'viewer' || rs.linkRole === 'commenter') ? rs.linkRole : 'editor' };
      Object.keys(peers).forEach(sendSettings);
      return true;
    };
    S._settingsFor = settingsFor;
    S.dropPeer = function (mid) {
      host.part(mid); delete peers[mid]; delete grants[mid]; delete catchBudget[mid];
      if (C.media && C.media.forget) C.media.forget(S, mid);     // S8: nothing keyed by a member outlives it
    };
    S.peerIds = function () { return Object.keys(peers); };

    /* ── the seams §15's media module reaches the wire through (S4) ───────────────────────────────
     * They exist so `collab-media.js` never has to know whether it is running on the owner or on a
     * guest: it names a peer and sends. On a guest the name is ignored, because a guest has exactly
     * one peer — and that asymmetry belongs HERE, beside the endpoints, rather than as an `isOwner`
     * branch at every call site in the other file. */
    S.sendMsg = function (mid, msg) { return isOwner ? sendTo(mid, msg) : sendToHost(msg); };
    S.sendBulk = function (mid, buf) {
      const ep = isOwner ? peers[mid] : link;
      if (!ep || !ep.open) return false;
      return ep.send('bulk', buf);
    };
    S.endpoint = function (mid) { return isOwner ? peers[mid] : link; };

    S.stop = function (why) {
      S.active = false;
      /* S6 review: WHY it stopped, for whoever tidies up after it — a knock still on the owner's screen is
         answered "paused" when he merely opened another project, and "ended" when he stopped sharing. */
      S.stopWhy = why || (isOwner ? 'ended' : 'left');
      /* §12.4: the parts of anything half-arrived are left on disk on purpose — a rejoin to the same
         room resumes from them (§15.7). What is collected is the abandoned ones, and only once the
         session that could still have wanted them is over. */
      if (C.media) { try { C.media.detach(S); } catch (e) {} }
      if (isOwner) broadcast({ t: 'bye', why: why || 'ended' }, null);
      else sendToHost({ t: 'bye', why: why || 'left' });
      if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
      Object.keys(peers).forEach(function (m) { if (peers[m]) peers[m].close(); delete peers[m]; });
      if (link) { link.close(); link = null; }
    };

    /* Read-only windows into the state, for the suite and for S3's banner. */
    S._pending = function () { return Object.assign(Object.create(null), pending); };
    S._held = function () { return Object.keys(held); };
    S._deferred = function () { return Object.keys(deferred); };
    S._outstanding = function () { return outstanding.map(function (e) { return { cid: e.cid, n: e.ops.length, sent: e.sent }; }); };
    S._release = release;
    S._pushLocal = pushLocal;
    S._forced = function () { return forced.length; };

    /* ═══ S7 · WRITING BASE BACK INTO LIVE (§16.3, §7.2, §17.2) ══════════════════════════════════
       Live changed in ways the room will not take (a role, a lease), so live goes back to base on exactly
       those paths. The ops that do it are the diff FROM live TO base, filtered to the paths that were
       refused — not a hand-built inverse per op kind. That matters for the one case the old version got
       wrong: a refused DELETE. `s ['L', id]` cannot put back a layer live no longer has (apply answers
       'gone'), so an owner whose delete of a leased layer was refused lost the layer on his own screen while
       base kept it, and the next diff sent the delete again, and again. The reverse diff says `li` with the
       anchor base really has. A refused reorder puts the whole stack back to base's order, because two
       LIS walks over the same move need not pick the same layers to move. */
    function revKey(op) {
      if (op.o === 'li' || op.o === 'lr' || op.o === 'mv') return 'L*';
      if (op.o === 'am') return 'A:' + P.key(op.p.slice(0, -1));
      if (op.o === 'ai') return P.key(op.p.concat(op.k));
      return P.key(op.p);
    }
    function revertToBase(bad) {
      if (!bad || !bad.length) return 0;
      const want = Object.create(null);
      for (let i = 0; i < bad.length; i++) want[revKey(bad[i])] = 1;
      const sum = { wasSelected: A.selected ? A.selected() : null, paths: [], layerIds: Object.create(null), removed: [], inserted: [], structural: false, projectKeys: Object.create(null) };
      const back = D.diffDoc(view(), S.base);
      let n = 0;
      for (let i = 0; i < back.ops.length; i++) {
        const op = back.ops[i];
        if (!want[revKey(op)]) continue;
        applyLive(op, sum);
        n++;
      }
      if (want['L*'] && Array.isArray(S.base.layers)) {
        D.applyOrder(doc(), { p: null, f: 'id', k: S.base.layers.map(function (l) { return l && l.id; }) });
        sum.structural = true;
      }
      keepIds = null;
      if (A.afterApply) A.afterApply(sum);
      S.stats.reverted = (S.stats.reverted || 0) + n;
      return n;
    }
    S._revertToBase = revertToBase;
    /* ⚠️ SAID EVERY TIME A CHANGE IS PUT BACK, NOT ONCE PER FOUR SECONDS (S7 review). A Viewer who flipped a
       clip and then flipped it the other way two seconds later watched the second one snap back with no
       word: the first toast had gone and the throttle swallowed the second. The toast now outlives the
       throttle, so there is a message on screen for every change that is put back — and a drag that is
       refused every tick still re-shows one toast rather than stacking them. */
    function refusedOnce() {
      const t = now();
      if (t - refusedAt < 1500) return;
      refusedAt = t;
      toast(S.role === 'viewer' ? 'View only — ask ' + ownerWord() + ' for edit access' : 'You can comment here — ask ' + ownerWord() + ' for edit access to change the project', 3000);
    }
    function ownerWord() { return (S.hostName && typeof S.hostName === 'string') ? S.hostName : 'the owner'; }

    /* §7.2: an owner op the host refuses (a lease) is put back to the host's value and named, rather
       than left sitting at a number only this device believes in. */
    function refuseLocal(rej, ops) {
      const bad = [];
      for (let i = 0; i < rej.length; i++) { const op = ops[rej[i][0]]; if (op) bad.push(op); }
      revertToBase(bad);
      leaseToast(rej, ops, 'this');
    }
    /* §17.2's words, and for a refused DELETE its one action: "Sam is editing 'Logo' — it wasn't deleted
       [Delete anyway]". The whole toast is the button (FM.toast's onTap), so it can be pressed on a phone
       without a third control. */
    function leaseToast(rej, ops, what) {
      const who = holderSaid(rej, ops);
      const r = (rej || []).filter(function (x) { return x[1] === 'lease'; });
      let del = null;
      for (let i = 0; i < r.length; i++) { const op = ops && ops[r[i][0]]; if (op && op.o === 'lr') { del = op.id; break; } }
      if (del && A.toastAction) {
        const L = D.valueAt(S.base, ['L', del]);
        const nm = (L && typeof L.name === 'string' && L.name) ? '“' + L.name.slice(0, 40) + '”' : 'that layer';
        try { A.toastAction(who + ' is editing ' + nm + ' — it wasn’t deleted. Tap to delete anyway', function () { S.forceDelete(del); }); } catch (e) {}
        return;
      }
      toast(who + ' is editing ' + (what || 'this'));
    }
    /* Delete-anyway (§17.2): the layer goes through the app's own delete (its undo step, its playback
       teardown, its selection repair), and the diff that carries it marks it `f:1` — see pushLocal. */
    S.forceDelete = function (id) {
      if (typeof id !== 'string') return false;
      forceIds[id] = 1;
      if (A.deleteLayer) { try { A.deleteLayer(id); } catch (e) {} }
      pushLocal('hot');
      return true;
    };
    S._forceIds = function () { return Object.keys(forceIds); };
    /* §22's "Sam is editing this" (S5 review). Before S5 nothing granted a lease, so "Someone else" was
       all a refusal could say; presence now knows who holds every layer, so the toast names them. The
       first refused op's layer is the one asked about; a name nobody knows stays "Someone else". */
    function holderSaid(rej, ops) {
      const r = (rej || []).filter(function (x) { return x[1] === 'lease'; })[0];
      const op = r && ops ? ops[r[0]] : null;
      const lid = op ? layerIdOf(op) : null;
      let name = null;
      if (lid && C.presence && C.presence.holderName) { try { name = C.presence.holderName(lid); } catch (e) { name = null; } }
      return name || 'Someone else';
    }

    return S;
  }

  C.Session = Session;
  C._viewOfProject = viewOfProject;
  C.DENY = DENY;

  /* ── S6 helpers for the three doors below ─────────────────────────────────────────────────────── */
  const CTRL_ = /[\u0000-\u001f\u007f-\u009f]/g;
  function cleanStr(s, n) { return typeof s === 'string' ? s.replace(CTRL_, '').trim().slice(0, n) : ''; }
  function meOf(o) { return { name: o.name, color: o.color, mk: o.mk, dev: o.dev, app: o.app }; }
  function joinHello(o) {
    const m = { t: 'hello', role: o.role || 'editor', name: o.name, color: o.color, have: { epoch: null, seq: 0 }, proto: C.PROTO, schema: C.SCHEMA_REV };
    if (typeof o.mk === 'string') m.mk = o.mk;
    if (o.dev === 'phone' || o.dev === 'pc') m.dev = o.dev;
    if (typeof o.app === 'string') m.app = o.app;
    return m;
  }
  /* The same comparison the owner makes, turned round: an owner who is NEWER means this device is the
     older one. */
  function guestGate(w) {
    const g = C.signal && C.signal.schemaGate ? C.signal.schemaGate(w) : null;
    return g === 'host-older' ? 'guest-older' : g === 'guest-older' ? 'host-older' : null;
  }

  /* ═══ ARM, JOIN AND LEAVE (§12.1, §12.2, §12.3) ═══════════════════════════════════════════════
   *
   * These are the three things the Share panel and the Join sheet will call in S3. They are here, in
   * product code, rather than in the test rig, because the alternative is that the suite's join flow
   * and the UI's join flow are two different pieces of code and only one of them is ever tested —
   * which is how the same-device refusal ends up proved against a mock.
   *
   * What is deliberately NOT here: the Labs check, the profile prompt, the storage-room dialog, the
   * knock and every piece of signalling. All of those are S3 and every one of them is a UI decision;
   * `share()` and `join()` take a Link that somebody else has already opened.
   */

  /* §7.3 / §12.1 step 4: make base a fixed point of the sanitiser BEFORE anybody can join it. After
     this the guests' own defensive sanitise changes nothing and the hashes agree; without it every
     device disagrees forever about a document nobody can see a difference in. */
  function tidyOnArm(A, inv, base) {
    const out = { ops: [], recs: [] };
    const ls = base.layers || [];
    for (let i = 0; i < ls.length; i++) {
      if (!ls[i] || !ls[i].id) continue;
      const c = clone(ls[i]);
      inv.layer(c);
      D.diffNode(['L', ls[i].id], ls[i], c, out);
    }
    if (base.project) {
      const pc = clone(base.project);
      inv.project(pc);
      D.diffNode(['P'], base.project, pc, out);
    }
    const cl = clone(base.layers || []);
    if (inv.layers) inv.layers(cl);
    for (let i = 0; i < cl.length; i++) {
      const want = cl[i];
      const j = P.indexOfKey(base.layers || [], 'id', want.id);
      if (j < 0) continue;
      if (!eq((base.layers[j] || {}).parent, want.parent)) {
        out.ops.push({ o: 's', p: ['L', want.id, 'parent'], v: clone(want.parent) });
        out.recs.push({ p: ['L', want.id, 'parent'], o: 's', b: clone(base.layers[j].parent) });
      }
    }
    for (let i = 0; i < out.ops.length; i++) {
      D.apply(base, out.ops[i]);
      D.apply(A.doc(), out.ops[i], { live: true });
    }
    return out.ops.length;
  }

  /* The highest `m<n>` any comment or reply in a document was stamped with — a new session mints past it, so
     no newcomer is ever handed somebody else's comments by number (S7 review). */
  function midsUsed(doc) {
    let top = 0;
    const see = function (by) {
      const m = by && typeof by.mid === 'string' ? /^m(\d{1,6})$/.exec(by.mid) : null;
      if (m) top = Math.max(top, +m[1]);
    };
    const l = doc && doc.project && Array.isArray(doc.project.comments) ? doc.project.comments : [];
    for (let i = 0; i < l.length; i++) {
      if (!l[i] || typeof l[i] !== 'object') continue;
      see(l[i].by);
      if (Array.isArray(l[i].replies)) for (let j = 0; j < l[i].replies.length; j++) see(l[i].replies[j] && l[i].replies[j].by);
    }
    return top;
  }

  C.share = function (opts) {
    const o = opts || {};
    const A = o.adapter || C.bridge;
    const inv = o.invariants || A.invariants();
    if (A.normalizeDerived) A.normalizeDerived();
    const v = A.view();
    const base = clone({ project: v.project, layers: v.layers });
    const tidied = tidyOnArm(A, inv, base);
    const host = C.Host({ base: base, invariants: inv, ownerInfo: o.ownerInfo, now: o.now, rand: o.rand });
    const S = Session({ adapter: A, role: 'owner', mid: 'o', host: host, now: o.now, rand: o.rand, midFloor: Math.max(+o.midFloor || 0, midsUsed(base)) });
    S.tidied = tidied;
    S.pid = (FM.projects && FM.projects.currentId) ? FM.projects.currentId() : null;
    /* §15: the owner serves media AND receives it (a guest adding a clip), so the controller is the
       same one on both sides. The room id keys the resume parts; before S6 mints one, the project is
       as unique and as stable. */
    if (C.media) C.media.install(S, { sid: o.sid || S.pid });
    /* "Tidy-up for sharing" is an ordinary owner step, committed BEFORE the pre-session stack is read
       so that undoing past the session start can undo it too — it is a change to his document and he
       did not ask for it. Safe to commit with no session attached yet: the ops went to base and live
       together, so there is nothing for a diff to find. */
    if (tidied && FM.history && FM.history.commit) FM.history.commit();
    /* §10.4: only he edited before the session, so his pre-session undo steps are exactly the snapshot
       stack, and attribution for them is exact. */
    if (FM.history && FM.history._snapshotsUpTo) S.seedPreSession(FM.history._snapshotsUpTo());
    C.attach(S, o);
    return S;
  };

  /* §12.2 check 3, the half that protects HIS data: a document whose layer ids are already on this
     device is the same document, and writing a second copy of it would give this device two projects
     with the same layer ids — which is how media gets released out from under a project that is still
     using it. The caller decides what to do; the default is to refuse and say which project. */
  C.sameDeviceCopy = function (D_, exceptPid) {
    const ids = Object.create(null);
    const ls = (D_ && D_.layers) || [];
    for (let i = 0; i < ls.length; i++) if (ls[i] && ls[i].id) ids[ls[i].id] = 1;
    const list = (FM.projects && FM.projects.list()) || [];
    for (let i = 0; i < list.length; i++) {
      const pid = list[i].id;
      if (pid === exceptPid) continue;
      let doc = null;
      try { doc = JSON.parse(localStorage.getItem('fm.proj.' + pid) || 'null'); } catch (e) { doc = null; }
      const dl = (doc && doc.layers) || [];
      for (let j = 0; j < dl.length; j++) {
        if (dl[j] && ids[dl[j].id]) return { pid: pid, linked: !!list[i].collab, name: list[i].name };
      }
    }
    return null;
  };

  /* Returns a promise for {gpid, session}, or rejects with {why}. `onConflict`:
       'refuse'  (default) — stop and say which project already holds these layers
       'replace'           — remove that copy and take the live one (§12.2's "Replace it")
       'keepFirst'         — detach that copy into his own project first, then join (§12.2's "Keep it") */
  C.join = function (opts) {
    const o = opts || {};
    const ep = o.link;
    if (!ep) return Promise.reject({ why: 'no-link' });
    const A = o.adapter || C.bridge;
    return new Promise(function (resolve, reject) {
      let welcome = null, settled = false;
      const early = [];
      /* §19.3's knock card is what this is waiting on, so the deadline comes from the knock rather than
         from a second number that could drift away from it (queue 921 S3 review). */
      const timer = setTimeout(function () { if (!settled) { settled = true; reject({ why: 'timeout' }); } },
        o.timeoutMs || (C.LIMITS && C.LIMITS.JOIN_WAIT) || 140000);
      /* ⚠️ A LINK THAT DIES WHILE WE WAIT IS SAID AT ONCE (S6 review). Only `onmessage` was listened to, so a
         phone that locked, or Wi-Fi that dropped, during the up-to-two-minute knock left the sheet on
         "Waiting…" for the whole JOIN_WAIT — and then it blamed the owner for not answering. */
      ep.onclose = function () { if (!settled) { settled = true; clearTimeout(timer); reject({ why: 'closed' }); } };
      ep.onmessage = function (ch, msg) {
        if (ch !== 'ctl' || !msg) return;
        if (msg.t === 'welcome') {
          /* §14.7 from THIS side too (S6): an owner on a build before S6 never gates a hello, so the
             joiner is the only one that can notice the two devices run different document rules. */
          const g = guestGate(msg);
          if (g) { if (!settled) { settled = true; clearTimeout(timer); reject({ why: g, app: cleanStr(msg.app, 16) }); } return; }
          welcome = msg;
          return;
        }
        /* `refused` is S3's word for a knock the owner turned down; `deny` is §20's, and what the relay
           path sends — declined, full, removed, ended, and the two version refusals, each with its own
           sentence on the joining device (§22). */
        if (msg.t === 'refused' || msg.t === 'deny') {
          if (!settled) { settled = true; clearTimeout(timer); reject({ why: cleanStr(msg.why, 16) || 'refused', app: cleanStr(msg.app, 16) }); }
          return;
        }
        if (msg.t === 'snap') { finish(msg); return; }
        /* ⚠️ EVERYTHING ELSE IS KEPT, NOT DROPPED (queue 921). The host puts a joiner in its broadcast
           set the moment its `hello` arrives, so every batch it sequences from then on is addressed
           here — and this handler stays bound through the whole async tail below: sameDeviceCopy, a
           possible remove/detachLinked, createLinked, and an AWAITED `projects.open()` that loads
           media out of IndexedDB. Those batches used to fall off the end of this function. Nothing
           noticed, because the session then started at `S.bs = snap.seq` and `onBatch` assigned the
           next seq blind: the guest simply edited a document missing several seconds of the owner's
           work. `reopen()` re-says hello after setLink and so heals itself; join never did. */
        early.push({ ch: ch, msg: msg });
      };
      ep.send('ctl', joinHello(o));

      function finish(snap) {
        if (settled) return;
        settled = true; clearTimeout(timer);
        Promise.resolve().then(function () {
          const clash = C.sameDeviceCopy(snap.D, null);
          if (!clash) return null;
          if (o.onConflict === 'replace') return FM.projects.remove(clash.pid).then(function () { return null; });
          if (o.onConflict === 'keepFirst') return FM.projects.detachLinked(clash.pid).then(function (nid) {
            /* The detached copy carries NEW layer ids, so it no longer collides — but the linked copy
               it came from is gone, and any OTHER project might still hold them. Check again rather
               than assume; this is the path that runs when he says "keep my old one". */
            return C.sameDeviceCopy(snap.D, null) ? Promise.reject({ why: 'same-device', pid: clash.pid }) : null;
          });
          return Promise.reject({ why: 'same-device', pid: clash.pid, linked: clash.linked, name: clash.name });
        }).then(function () {
          /* S6: what this device needs to find the room again on its own — the invite's sid/sk or the
             room code it joined with, and the member token the owner granted (`welcome.tok`, filed under
             `welcome.rid`). A connection-code join has neither rendezvous, so it keeps neither. */
          const gpid = FM.projects.createLinked({
            sid: o.sid, sk: o.sk, code: o.code || null,
            hostName: cleanStr((welcome && welcome.hostName) || o.hostName, 32), hostColor: o.hostColor,
            mid: welcome && welcome.mid, role: (welcome && welcome.role) || o.role || 'editor',
            rid: welcome && typeof welcome.rid === 'string' ? welcome.rid.slice(0, 32) : null,
            tok: welcome && typeof welcome.tok === 'string' ? welcome.tok.slice(0, 64) : null,
            hub: welcome && typeof welcome.hub === 'string' ? welcome.hub.slice(0, 32) : null,
            epoch: snap.epoch, seq: snap.seq, name: o.name
          }, snap.D);
          if (!gpid) return Promise.reject({ why: 'no-room' });
          return FM.projects.open(gpid).then(function (opened) {
            /* queue 690: false = storage is full, his open project is not saved, and he chose to stay in it. The
               session must not attach: it would apply the room's edits into HIS project. Take back the copy just
               made (nothing of his is in it) and say what is true — there is no room. */
            if (opened === false) {
              return Promise.resolve(FM.projects.remove(gpid)).catch(function () {}).then(function () { return Promise.reject({ why: 'no-room' }); });
            }
            const S = Session({
              adapter: A, role: (welcome && welcome.role) || o.role || 'editor',
              mid: (welcome && welcome.mid) || 'g',
              base: clone({ project: snap.D.project, layers: snap.D.layers }),
              epoch: snap.epoch, now: o.now, rand: o.rand
            });
            S.bs = snap.seq;
            S.gpid = gpid;
            S.pid = gpid;                 // what pushLocal checks the open project against
            S.sid = o.sid || gpid;
            S.me = meOf(o);
            if (C.media) C.media.install(S, { sid: S.sid });   // §15: request media once the copy exists
            S.setLink(ep);
            C.attach(S, o);
            /* …and now replay what arrived while this was being built, in order. A batch the snapshot
               already contains is dropped by seq rather than applied twice (queue 921). */
            for (let i = 0; i < early.length; i++) {
              const m = early[i];
              if (m.msg.t === 'b' && m.msg.seq != null && m.msg.seq <= snap.seq) continue;
              try { S.onMessage(m.ch, m.msg, null); } catch (e) { C.lastError = e; }
            }
            early.length = 0;
            resolve({ gpid: gpid, session: S });
          });
        }).catch(function (e) { reject(e && e.why ? e : { why: 'failed', err: String(e) }); });
      }
    });
  };

  /* §12.3. `keep` is the recommended answer and the default: his copy becomes his, with new layer ids
     so a later rejoin cannot collide with it. */
  let leaving = 0;
  /* A Leave is still copying the project into his own (collab-ui.js resumeOpen must not start a second copy). */
  C.leaving = function () { return leaving > 0; };
  C.leave = function (opts) {
    const o = opts || {};
    const s = C.session;
    if (!s) return Promise.resolve(null);
    /* ⚠️ THE OWNER'S DOOR IS end(), NOT THIS ONE (queue 921). An owner Session never carries `gpid` —
       `share()` sets `pid` — so `s.gpid || currentId()` resolved to HIS OWN, REAL project: the default
       `keep` duplicated it with a new project id and new layer ids and deleted the original (undo
       stack reset, media re-keyed), and `keep:false` simply removed it. One Leave button wired to the
       wrong session, or one crossed pair of buttons, is all that would take — so the refusal lives
       here rather than in the panel that will call it. */
    if (s.isOwner) { C.end(); return Promise.resolve(null); }
    const gpid = s.gpid || (FM.projects && FM.projects.currentId());
    /* …and the destructive branch may only ever run on a copy THIS DEVICE made as a guest. A project
       whose card carries no `collab` record is not a linked copy, whatever the session believes. */
    const card = ((FM.projects && FM.projects.list()) || []).filter(function (p) { return p.id === gpid; })[0];
    if (!card || !card.collab) { s.stop('left'); C.detach(); return Promise.resolve(null); }
    /* ⚠️ S8 review: THE CARD IS MARKED LEFT FIRST, AND A WAITING APP UPDATE WAITS FOR THE COPY. `C.detach` runs a
       deferred service-worker reload synchronously, so an update that had landed during the session reloaded
       the page before `detachLinked` had copied a byte — and the linked card, untouched, reconnected on the
       next open (the owner still accepts its token): he was back in the room he had just left, sending his
       edits into Ezra's project. A failed copy (a full phone) did the same without any update. Marked `ended`
       before anything else, a copy that never finishes becoming his is still never dialled again, and the
       reload runs once the copy has settled either way. */
    try { if (FM.projects.patchCollab) FM.projects.patchCollab(gpid, { ended: 'left' }); } catch (e) {}
    leaving++;
    s.stop('left');
    C.detach({ holdReload: true });
    const settled = function (v) { leaving = Math.max(0, leaving - 1); C.runPendingReload(); return v; };
    const job = (o.keep === false) ? FM.projects.remove(gpid).then(function () { return null; }) : FM.projects.detachLinked(gpid);
    return Promise.resolve(job).then(settled, function (e) { settled(); throw e; });
  };

  /* §12.4's guest reload recovery, and the only piece of §12.2 that runs when nothing was clicked: the
     linked project is already open (the app reopened it like any other), a link has been re-established,
     and the question is what this device still owes the host. The answer is the difference between the
     persisted base and what is on screen — and it is safe to be wrong about, because the host's CAS is
     stateless and idempotent (§13.3): an op that already landed comes back 'noop', not applied twice. */
  C.reopen = function (opts) {
    const o = opts || {};
    const ep = o.link;
    const A = o.adapter || C.bridge;
    const gpid = o.gpid || (FM.projects && FM.projects.currentId());
    return Promise.resolve(A.readBase ? A.readBase(gpid) : null).then(function (stored) {
      let saved = stored;
      /* S6: a guest that never had two quiet seconds to persist a base (§12.4) still has a linked copy
         and a token, and the reconnect must not strand it. With no base there is nothing to diff
         against, so it asks for a SNAPSHOT (`epoch: null`) and takes the host's document — the one
         case in which work made since the join and never confirmed is not recoverable, and the only
         alternative is never reconnecting at all. Only when the caller asks for it. */
      if ((!saved || !saved.D) && o.fallbackLive) {
        const v = A.view();
        saved = { D: clone({ project: v.project, layers: v.layers }), epoch: null, seq: 0, cid: 0 };
      }
      if (!saved || !saved.D) return null;
      const S = Session({ adapter: A, role: o.role || 'editor', mid: o.mid || 'g', base: clone(saved.D), epoch: saved.epoch, now: o.now, rand: o.rand });
      S.gpid = gpid;
      S.pid = gpid;                         // what pushLocal checks the open project against
      S.bs = saved.seq || 0;
      S.cid = saved.cid || 0;                 // see the note on persist(): the host dedupes by cid
      /* §15.7's resume is what makes a reload cheap: the parts already on disk are keyed by the ROOM
         and the file's fingerprint, so the very first `want` after coming back asks for `from` rather
         than for the whole file again. */
      S.sid = o.sid || saved.sid || gpid;
      if (C.media) C.media.install(S, { sid: S.sid });
      const owed = S.recoverOutbox(saved);
      S.me = meOf(o);
      S.setLink(ep);
      C.attach(S, o);
      ep.send('ctl', S._helloMsg({ name: o.name }));
      return { session: S, owed: owed, gpid: gpid };
    });
  };

  C.end = function () {
    const s = C.session;
    if (!s) return null;
    s.stop('ended');
    C.detach();
    return s;
  };

})(window.FM);
