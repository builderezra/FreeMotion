/* FreeMotion — live collaboration (queue 921), STAGE S1: ops, diff and apply (spec §6).
 *
 * Two functions carry the whole document half of collaboration:
 *   diffDoc(base, live)  — what changed, as a list of path-level ops, in an order that reproduces
 *                          `live` exactly when applied to `base`. That is a property test, not a hope.
 *   apply(target, op)    — the same ops, IN PLACE. In place is not an optimisation: the inspector, the
 *                          mask tool and kfDrag all hold references INTO FM.scene, so replacing an
 *                          object or an array behind them detaches a live control from the document it
 *                          is editing. Only splice/patch, never reassign.
 *
 * Pure: plain JSON in, plain JSON out. It never reads FM.scene, and the only app knowledge it has is
 * the shape rules in collab-path.js.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};
  const P = C.path;
  const canon = P.canon, eq = P.eq, clone = P.clone, cyrb53 = P.cyrb53;
  const hasOwn = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  const FORBIDDEN = ['__proto__', 'constructor', 'prototype'];

  function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function present(o, k) { return hasOwn(o, k) && o[k] !== undefined; }
  /* A key that can appear in a path. Anything else is not part of D: it cannot be addressed, so it
     cannot be sent — and collab-path's canon() drops the same names, so it cannot make two devices
     disagree on a hash either. (Since queue 921 `syncable` IS `isKeySeg`; the conjunction stays as the
     definition of the rule, so a future widening of either one has to be a deliberate edit here.) */
  function syncableKey(k) { return P.syncable(k) && P.isKeySeg(k); }

  /* ═══ LONGEST INCREASING SUBSEQUENCE ═══════════════════════════════════════════════════════════
   * The reorder minimiser. Everything NOT in the LIS has to move; everything in it can stay put, and
   * keeping it put is what makes a reorder cost one `mv` instead of rewriting the stack — which
   * matters because every `mv` a peer receives is a timeline rebuild it did not need. Returns the
   * indices of one longest strictly-increasing subsequence, in order. */
  function lisIndices(a) {
    const n = a.length;
    if (!n) return [];
    const tails = [], prev = new Array(n);
    for (let i = 0; i < n; i++) prev[i] = -1;
    for (let i = 0; i < n; i++) {
      let lo = 0, hi = tails.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (a[tails[mid]] < a[i]) lo = mid + 1; else hi = mid; }
      if (lo > 0) prev[i] = tails[lo - 1];
      if (lo === tails.length) tails.push(i); else tails[lo] = i;
    }
    const out = [];
    let k = tails[tails.length - 1];
    while (k >= 0) { out.push(k); k = prev[k]; }
    out.reverse();
    return out;
  }

  /* ═══ READING A PATH ═══════════════════════════════════════════════════════════════════════════ */

  /* The value `path[0..upto)` names, or undefined when anything on the way is missing. `root` is the
     document `{project, layers}`. Never creates anything. */
  function nodeAt(root, path, upto) {
    if (!root) return undefined;
    let cur;
    for (let i = 0; i < upto; i++) {
      const s = path[i];
      if (i === 0) { cur = (s === 'P') ? root.project : (s === 'L') ? root.layers : undefined; }
      else if (i === 1 && path[0] === 'L') {
        if (!Array.isArray(cur)) return undefined;
        const idx = P.indexOfKey(cur, 'id', s);
        cur = idx < 0 ? undefined : cur[idx];
      } else if (P.isKeyedSeg(s)) {
        if (!Array.isArray(cur)) return undefined;
        const idx = P.indexOfKey(cur, P.keyedField(s), P.keyedValue(s));
        cur = idx < 0 ? undefined : cur[idx];
      } else {
        if (!cur || typeof cur !== 'object') return undefined;
        cur = cur[s];
      }
      if (cur === undefined) return undefined;
    }
    return cur;
  }
  function valueAt(root, path) {
    if (!Array.isArray(path) || !path.length) return undefined;
    return nodeAt(root, path, path.length);
  }

  /* ═══ WRITING, IN PLACE ════════════════════════════════════════════════════════════════════════ */

  /* Make `dst` equal `src` without replacing `dst`. Keys missing from `src` are deleted — EXCEPT `_`
     keys, which are the app's runtime caches and were never part of D in the first place. */
  function patchObject(dst, src) {
    const dk = Object.keys(dst);
    for (let i = 0; i < dk.length; i++) {
      const k = dk[i];
      if (k.charCodeAt(0) === 95) continue;
      if (!present(src, k)) delete dst[k];
    }
    const sk = Object.keys(src);
    for (let i = 0; i < sk.length; i++) {
      const k = sk[i];
      if (k.charCodeAt(0) === 95 || FORBIDDEN.indexOf(k) >= 0) continue;   // `dst.__proto__ = …` is prototype pollution, not a write
      const sv = src[k];
      if (sv === undefined) continue;
      const dv = dst[k];
      if (isPlainObject(sv) && isPlainObject(dv)) patchObject(dv, sv);
      else if (Array.isArray(sv) && Array.isArray(dv)) fillArray(dv, sv);
      else dst[k] = clone(sv);
    }
  }
  /* Keeps the ARRAY IDENTITY. mask-tool.js:73,104 aliases layer.masks[i].path and kfDrag holds a kf
     list; `layer.masks[i].path = [...]` under either of them edits an array nobody is looking at. */
  function fillArray(dst, src) {
    dst.length = 0;
    for (let i = 0; i < src.length; i++) dst.push(clone(src[i]));
  }

  /* §6.4: after an `s` or `d` on a live layer, drop the own `_`-prefixed keys of the written object and
     of the layer, except `_expanded`. Exactly what history.restore already does to every layer on undo,
     so it is known-safe; it is what invalidates `_wrapCache` and friends when a remote value lands. */
  function clearRuntimeKeys(obj) {
    if (!obj || typeof obj !== 'object') return;
    const ks = Object.keys(obj);
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i];
      if (k.charCodeAt(0) === 95 && k !== '_expanded') delete obj[k];
    }
  }

  /* The anchor an insert/move will actually use: `a` when that id is present, otherwise null (the top
     of the list). The host resolves anchors with this BEFORE applying, and broadcasts the resolved
     value, so every device splices into the same slot (§7.1 step 7). */
  function resolveAnchor(arr, field, a) {
    if (a == null) return null;
    return P.indexOfKey(arr, field, a) >= 0 ? a : null;
  }
  function moveAfter(arr, from, a, field) {
    const el = arr.splice(from, 1)[0];
    let at = 0;
    if (a != null) { const ai = P.indexOfKey(arr, field, a); at = ai < 0 ? 0 : ai + 1; }
    arr.splice(at, 0, el);
    return at;
  }

  /* apply(target, op, opts) → 'ok' | 'noop' | 'gone' | 'bad'
   *   'bad'  the op is malformed — reject the message that carried it
   *   'gone' the container it names no longer exists — the host turns this into rej 'gone'
   *   'noop' the value was already what the op asks for (§5.5); nothing was written
   * opts: { live:true } to run the live-tree extras (`_` key clearing, teardown before a layer
   * removal). `opts.teardown(id)` is FM.teardownLayerPlayback in the app; absent here in S1. */
  function apply(target, op, opts) {
    if (!target || !op || typeof op !== 'object') return 'bad';
    const o = opts || {};
    switch (op.o) {
      case 's': return applySet(target, op, o);
      case 'd': return applyDel(target, op, o);
      case 'li': return applyLi(target, op, o);
      case 'lr': return applyLr(target, op, o);
      case 'mv': return applyMv(target, op, o);
      case 'ai': return applyAi(target, op, o);
      case 'ar': return applyAr(target, op, o);
      case 'am': return applyAm(target, op, o);
      default: return 'bad';
    }
  }

  /* The container that holds the last segment of `p`, plus how to write it. Returns null when the path
     is malformed and undefined-ish info when something on the way is missing. */
  function locate(target, p) {
    if (!P.valid(p)) return null;
    if (p.length === 1) return { kind: 'root', obj: target, key: (p[0] === 'P' ? 'project' : 'layers') };
    const parent = nodeAt(target, p, p.length - 1);
    if (parent === undefined || parent === null) return { kind: 'gone' };
    const last = p[p.length - 1];
    if (p.length === 2 && p[0] === 'L') {
      if (!Array.isArray(parent)) return { kind: 'gone' };
      return { kind: 'keyed', arr: parent, field: 'id', val: last };
    }
    if (P.isKeyedSeg(last)) {
      if (!Array.isArray(parent)) return { kind: 'gone' };
      return { kind: 'keyed', arr: parent, field: P.keyedField(last), val: P.keyedValue(last) };
    }
    if (typeof parent !== 'object' || Array.isArray(parent)) return { kind: 'gone' };
    return { kind: 'obj', obj: parent, key: last };
  }

  function touchedLayer(target, p, o) {
    if (!o.live || p[0] !== 'L' || p.length < 2) return;
    clearRuntimeKeys(nodeAt(target, ['L', p[1]], 2));
  }

  function applySet(target, op, o) {
    const p = op.p;
    const loc = locate(target, p);
    if (!loc) return 'bad';
    if (loc.kind === 'gone') return 'gone';
    if (P.namesKeyField(p)) return 'bad';                    // `s` on …/id or …/uid: see namesKeyField
    let cur, write;
    if (loc.kind === 'keyed') {
      const idx = P.indexOfKey(loc.arr, loc.field, loc.val);
      if (idx < 0) return 'gone';
      /* ⚠️ A KEYED SLOT HOLDS AN IDENTIFIED OBJECT, AND THE KEY IS NOT THE VALUE'S TO CARRY (queue 921).
         Without these two lines `s{p:['L','A'], v:{name:'x'}}` was accepted and patchObject deleted
         the `id` the path had just used to find it — one op, and that layer was unaddressable,
         unsanitisable and undeletable for the rest of the session on every device; `v:42` left a bare
         number in the layer list. applyLi:241 and applyAi:301 already re-assert the key after patching;
         this is the third writer into a keyed array and it was the one that did not. */
      cur = loc.arr[idx];
      if (!isPlainObject(op.v) || !isPlainObject(cur)) return 'bad';
      write = function (v) {
        patchObject(cur, v);
        cur[loc.field] = loc.val;
        return cur;
      };
    } else {
      const holder = loc.obj, key = loc.key;
      if (FORBIDDEN.indexOf(key) >= 0) return 'bad';
      cur = holder[key];
      write = function (v) {
        if (isPlainObject(v) && isPlainObject(cur)) { patchObject(cur, v); return cur; }
        if (Array.isArray(v) && Array.isArray(cur)) { fillArray(cur, v); return cur; }
        return (holder[key] = clone(v));
      };
    }
    if (eq(cur, op.v)) return 'noop';
    const written = write(op.v);
    if (o.live) { clearRuntimeKeys(isPlainObject(written) ? written : null); touchedLayer(target, p, o); }
    return 'ok';
  }

  function applyDel(target, op, o) {
    const p = op.p;
    const loc = locate(target, p);
    if (!loc) return 'bad';
    if (loc.kind === 'gone') return 'gone';
    if (loc.kind !== 'obj') return 'bad';                   // deleting an ELEMENT is `ar`, not `d`
    if (P.namesKeyField(p)) return 'bad';                   // `d` on …/id or …/uid: see namesKeyField
    if (!present(loc.obj, loc.key)) return 'noop';
    delete loc.obj[loc.key];
    if (o.live) touchedLayer(target, p, o);
    return 'ok';
  }

  function applyLi(target, op, o) {
    const arr = target.layers;
    if (!Array.isArray(arr)) return 'gone';
    if (typeof op.id !== 'string' || !P.KEYVAL_RE.test(op.id) || !isPlainObject(op.v)) return 'bad';
    const a = resolveAnchor(arr, 'id', op.a);
    const at = (a == null) ? 0 : P.indexOfKey(arr, 'id', a) + 1;
    const cur = P.indexOfKey(arr, 'id', op.id);
    if (cur >= 0) {                                         // UPSERT: the layer is back, or a re-send
      const before = canon(arr[cur]), wasAt = cur;
      patchObject(arr[cur], op.v);
      arr[cur].id = op.id;
      const now = moveAfter(arr, P.indexOfKey(arr, 'id', op.id), a, 'id');
      if (o.live) clearRuntimeKeys(arr[now]);
      return (before === canon(arr[now]) && wasAt === now) ? 'noop' : 'ok';
    }
    const el = clone(op.v);
    el.id = op.id;
    arr.splice(Math.min(at, arr.length), 0, el);
    return 'ok';
  }

  function applyLr(target, op, o) {
    const arr = target.layers;
    if (!Array.isArray(arr)) return 'gone';
    const idx = P.indexOfKey(arr, 'id', op.id);
    if (idx < 0) return 'gone';
    /* On live, stop the layer's playback first — the same teardown deleteLayer does. The IndexedDB
       record and the FM.media entry are deliberately KEPT, exactly as deleteLayer keeps them, because
       an undo has to be able to bring the layer back with its media (§6.4). */
    if (o.live && typeof o.teardown === 'function') { try { o.teardown(op.id); } catch (e) {} }
    arr.splice(idx, 1);
    return 'ok';
  }

  function applyMv(target, op, o) {
    const arr = target.layers;
    if (!Array.isArray(arr)) return 'gone';
    const idx = P.indexOfKey(arr, 'id', op.id);
    if (idx < 0) return 'gone';
    const a = resolveAnchor(arr, 'id', op.a);
    if (a === op.id) return 'bad';                          // "after myself" is not a position
    const before = arr.map(function (l) { return l && l.id; }).join(',');
    moveAfter(arr, idx, a, 'id');
    return before === arr.map(function (l) { return l && l.id; }).join(',') ? 'noop' : 'ok';
  }

  function keyedTarget(target, op) {
    const p = op.p;
    if (!P.valid(p)) return null;
    const arr = nodeAt(target, p, p.length);
    return Array.isArray(arr) ? arr : undefined;
  }

  function applyAi(target, op, o) {
    if (!P.isKeyedSeg(op.k) || !isPlainObject(op.v)) return 'bad';
    const arr = keyedTarget(target, op);
    if (arr === null) return 'bad';
    if (arr === undefined) return 'gone';
    const field = P.keyedField(op.k), val = P.keyedValue(op.k);
    const a = (op.a == null) ? null : (P.isKeyedSeg(op.a) ? P.keyedValue(op.a) : null);
    const anchor = resolveAnchor(arr, field, a);
    const cur = P.indexOfKey(arr, field, val);
    if (cur >= 0) {
      const before = canon(arr[cur]), wasAt = cur;
      patchObject(arr[cur], op.v);
      arr[cur][field] = val;
      const now = moveAfter(arr, P.indexOfKey(arr, field, val), anchor, field);
      return (before === canon(arr[now]) && wasAt === now) ? 'noop' : 'ok';
    }
    const el = clone(op.v);
    el[field] = val;                                        // never trust `v` to carry its own key
    const at = (anchor == null) ? 0 : P.indexOfKey(arr, field, anchor) + 1;
    arr.splice(Math.min(at, arr.length), 0, el);
    if (o.live) touchedLayer(target, op.p, o);
    return 'ok';
  }

  function applyAr(target, op, o) {
    const p = op.p;
    if (!P.valid(p) || p.length < 2 || !P.isKeyedSeg(p[p.length - 1])) return 'bad';
    const arr = nodeAt(target, p, p.length - 1);
    if (!Array.isArray(arr)) return 'gone';
    const last = p[p.length - 1];
    const idx = P.indexOfKey(arr, P.keyedField(last), P.keyedValue(last));
    if (idx < 0) return 'gone';
    arr.splice(idx, 1);
    if (o.live) touchedLayer(target, p, o);
    return 'ok';
  }

  function applyAm(target, op, o) {
    const p = op.p;
    if (!P.valid(p) || p.length < 2 || !P.isKeyedSeg(p[p.length - 1])) return 'bad';
    const arr = nodeAt(target, p, p.length - 1);
    if (!Array.isArray(arr)) return 'gone';
    const last = p[p.length - 1], field = P.keyedField(last), val = P.keyedValue(last);
    const idx = P.indexOfKey(arr, field, val);
    if (idx < 0) return 'gone';
    const a = (op.a == null) ? null : (P.isKeyedSeg(op.a) ? P.keyedValue(op.a) : null);
    if (a === val) return 'bad';
    const anchor = resolveAnchor(arr, field, a);
    const before = arr.map(function (e) { return e && e[field]; }).join(',');
    moveAfter(arr, idx, anchor, field);
    if (o.live) touchedLayer(target, p, o);
    return before === arr.map(function (e) { return e && e[field]; }).join(',') ? 'noop' : 'ok';
  }

  /* ═══ ORDER STATEMENTS ═════════════════════════════════════════════════════════════════════════
   *
   * ⚠️ FOUND BY THE S1 CONVERGENCE FUZZ, AND IT IS A HOLE IN THE SPEC AS WRITTEN (§8.3 now says so).
   * Two people reordering at the same time do NOT converge under ops alone, because a move is relative
   * and the two devices apply the two moves to different lists. Measured, from A,B,C:
   *     I drag A below C          → mv{A, a:C}     my list  B,C,A
   *     you drag C above B        → mv{C, a:A}     host     A,C,B   (sequenced first)
   *     I apply yours to MINE     → B,A,C          host applies mine → C,A,B
   *     my ack re-applies mine    → B,C,A          host stays        C,A,B
   * Both devices are now certain and they disagree, no further op is produced by either, and the only
   * thing that would ever notice is the 10-second divergence hash — i.e. his layer stack sits visibly
   * wrong until a background timer happens to look. That is not good enough for something as ordinary
   * as two people tidying the timeline.
   *
   * The fix is one field and no algorithm: a batch that contains ANY order op also states the array's
   * resulting key order, and the receiver adopts it. The host is authoritative about order anyway —
   * this just says so out loud instead of hoping relative moves commute. It costs an id list only on
   * batches that actually reorder something (never on a slider tick), and a device's own pending move
   * is re-applied by its ack immediately afterwards, so the last person to let go still wins.
   * ⚠️ S2: the bridge must defer an adoption while the layer list is HELD (§8.2), or the stack would
   * jump under a finger that is mid-drag. */
  function applyOrder(target, st) {
    const arr = (st.p == null) ? (target && target.layers) : valueAt(target, st.p);
    if (!Array.isArray(arr)) return 'gone';
    const field = st.f || 'id';
    const rank = Object.create(null);
    const want = st.k || [];
    for (let i = 0; i < want.length; i++) if (want[i] != null) rank[want[i]] = i;
    /* Only the slots holding a key the sender knows about are rewritten. Anything else — a layer this
       device has just made and has not sent yet — keeps its slot, so an adoption never loses it. */
    const slots = [], known = [];
    for (let i = 0; i < arr.length; i++) {
      const k = arr[i] && arr[i][field];
      if (k != null && rank[k] !== undefined) { slots.push(i); known.push(arr[i]); }
    }
    known.sort(function (a, b) { return rank[a[field]] - rank[b[field]]; });
    let changed = false;
    for (let i = 0; i < slots.length; i++) {
      if (arr[slots[i]] !== known[i]) { arr[slots[i]] = known[i]; changed = true; }
    }
    return changed ? 'ok' : 'noop';
  }

  /* The order statements a batch of ops needs to carry: one per array whose ORDER it disturbed. */
  function orderStatementsFor(doc, ops) {
    const want = Object.create(null);
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (op.o === 'li' || op.o === 'lr' || op.o === 'mv') want['L'] = { p: null, f: 'id' };
      else if (op.o === 'ai') want[P.key(op.p)] = { p: op.p, f: P.keyedField(op.k) };
      else if (op.o === 'ar' || op.o === 'am') {
        const ap = op.p.slice(0, -1);
        want[P.key(ap)] = { p: ap, f: P.keyedField(op.p[op.p.length - 1]) };
      }
    }
    const out = [];
    Object.keys(want).forEach(function (k) {
      const w = want[k];
      const arr = (w.p == null) ? (doc && doc.layers) : valueAt(doc, w.p);
      if (!Array.isArray(arr)) return;
      out.push({ p: w.p, f: w.f, k: arr.map(function (e) { return e && e[w.f]; }) });
    });
    return out;
  }

  /* ═══ DIFF (§6.2, §6.3) ════════════════════════════════════════════════════════════════════════
   *
   * Emission order is the contract: removals, then order, then per-layer content, then the project.
   * Applying the list in order to `base` must reproduce `live` exactly — that is the Tier-1 property
   * test, run over 200 seeded kitchen-sink scenes.
   *
   * `opts.hot` is a Set of layer ids (plus the literal 'P') to deep-diff; the id LIST is always
   * compared, because a layer appearing or disappearing is never something a tick may miss.
   * There is deliberately NO per-layer JSON.stringify fast path here yet (§6.2 allows one): it is an
   * optimisation, correctness must not depend on it, and an untested cache that decides what to diff
   * is the shape of bug this repo pays for most.  */
  function diffDoc(base, live, opts) {
    const o = opts || {};
    const hot = o.hot || null;
    const out = { ops: [], recs: [], orders: [] };
    const bl = (base && base.layers) || [], ll = (live && live.layers) || [];

    const before = out.ops.length;
    const bIdx = Object.create(null);
    for (let i = 0; i < bl.length; i++) if (bl[i] && bl[i].id) bIdx[bl[i].id] = i;
    const lSet = Object.create(null);
    for (let i = 0; i < ll.length; i++) if (ll[i] && ll[i].id) lSet[ll[i].id] = i;

    /* 1. removals — first, so the order walk below never has to step around a corpse */
    for (let i = 0; i < bl.length; i++) {
      const L = bl[i];
      if (!L || !L.id || lSet[L.id] !== undefined) continue;
      const anchors = [];
      for (let k = i - 1; k >= 0 && anchors.length < 5; k--) if (bl[k] && bl[k].id) anchors.push(bl[k].id);
      const b = clone(L);
      push(out, { o: 'lr', id: L.id }, { p: ['L', L.id], o: 'lr', b: b, bh: cyrb53(canon(b)), anchors: anchors });
    }

    /* 2. order — LIS over the surviving ids, so only what must move moves */
    const common = [], commonBaseIdx = [];
    for (let i = 0; i < ll.length; i++) {
      const L = ll[i];
      if (L && L.id && bIdx[L.id] !== undefined) { common.push(L.id); commonBaseIdx.push(bIdx[L.id]); }
    }
    const keepSet = Object.create(null);
    const lis = lisIndices(commonBaseIdx);
    for (let i = 0; i < lis.length; i++) keepSet[common[lis[i]]] = 1;

    let prev = null;
    for (let i = 0; i < ll.length; i++) {
      const L = ll[i];
      if (!L || !L.id) continue;
      if (bIdx[L.id] === undefined) {
        push(out, { o: 'li', id: L.id, a: prev, v: clone(L) }, { p: ['L', L.id], o: 'li', after: canon(L) });
      } else if (!keepSet[L.id]) {
        const bi = bIdx[L.id];
        let aBefore = null;
        for (let k = bi - 1; k >= 0; k--) if (bl[k] && bl[k].id) { aBefore = bl[k].id; break; }
        push(out, { o: 'mv', id: L.id, a: prev }, { p: ['L', L.id], o: 'mv', aBefore: aBefore, aAfter: prev });
      }
      prev = L.id;
    }
    if (out.ops.length > before) out.orders.push({ p: null, f: 'id', k: bl.map(idOf).filter(notNull) });

    /* 3. per common layer */
    for (let i = 0; i < ll.length; i++) {
      const L = ll[i];
      if (!L || !L.id || bIdx[L.id] === undefined) continue;
      if (hot && !hot.has(L.id)) continue;
      diffNode(['L', L.id], bl[bIdx[L.id]], L, out);
    }

    /* 4. the project */
    if (!hot || hot.has('P')) diffNode(['P'], (base && base.project) || {}, (live && live.project) || {}, out);

    return out;
  }

  function push(out, op, rec) { out.ops.push(op); out.recs.push(rec); }
  function idOf(l) { return l && l.id; }
  function notNull(x) { return !!x; }

  function diffNode(path, b, l, out) {
    /* ⚠️ STOP ONE SEGMENT SHORT OF THE PATH GRAMMAR'S CEILING (queue 921). §5.2 caps a path at
       P.MAX_SEGS, and every other walk in the system has a matching bound (badValue at 32, canon and
       clone at 64, stampIds at 24) — this one had none, so a document nested deeper than the grammar
       can name emitted an op on a 33-segment path that apply() calls 'bad' and validOp calls 'path'.
       §7.1 step 1 then rejects the WHOLE tx, so one over-deep value anywhere in an imported project
       blocks every batch it rides in, including the slider the person is actually dragging, and the
       ack names nothing they can act on. Past the ceiling the node is set whole — the atomic fallback
       §5.3 already relies on — which keeps the promise that applying a diff reproduces `live`. */
    if (path.length >= P.MAX_SEGS) {
      if (!eq(b, l)) push(out, { o: 's', p: path, v: clone(l) }, { p: path, o: 's', b: clone(b) });
      return;
    }
    if (isPlainObject(b) && isPlainObject(l)) return diffObject(path, b, l, out);
    if (Array.isArray(b) && Array.isArray(l)) {
      const key = path[path.length - 1];
      const mb = P.arrayMode(key, b), ml = P.arrayMode(key, l);
      if (mb && mb === ml) return diffKeyed(path, b, l, mb, out);
      /* atomic, or the mode changed under us: set the whole array. §5.3 — an atomic value can lose a
         concurrent edit to a sibling element, but it never drops data, which is the trade the spec
         makes deliberately for kf lists, mask paths and caption cues. */
    }
    if (!eq(b, l)) push(out, { o: 's', p: path, v: clone(l) }, { p: path, o: 's', b: clone(b) });
  }

  /* ⚠️ S8: THE SAME WALK, WITHOUT A PATH PER LEAF. Measured at 500 layers under a 4× CPU throttle (§26 S8),
     the commit hook's full diff was the whole of the budget, and most of it was spent allocating: a
     `seen` table and a key list for every object, and a fresh `path.concat(k)` for every leaf of every
     layer — twenty thousand arrays a commit, nearly all of them thrown away because the leaf was equal.
     The order of emission is unchanged (b's keys in b's order, then the keys only l has, in l's order),
     a path is built only for a leaf that DIFFERS or a node the walk descends into, and a pair of plain
     values is compared here exactly as diffNode would compare it (neither is an object or an array, so
     diffNode's only branch for them is the `eq` at its foot — whatever the depth). The 200-scene
     diff/apply round trip (`921 S1 diff then apply…`) is what holds this to the old answer. */
  function diffObject(path, b, l, out) {
    const bk = Object.keys(b), lk = Object.keys(l);
    for (let i = 0; i < bk.length; i++) {
      const k = bk[i];
      if (!syncableKey(k)) continue;
      const bv = b[k];
      const inB = bv !== undefined, inL = present(l, k);
      if (inB && !inL) { const p = path.concat(k); push(out, { o: 'd', p: p }, { p: p, o: 'd', b: clone(bv) }); }
      else if (!inB && inL) { const p = path.concat(k); push(out, { o: 's', p: p, v: clone(l[k]) }, { p: p, o: 's', b: undefined }); }
      else if (inB && inL) {
        const lv = l[k];
        if ((bv === null || typeof bv !== 'object') && (lv === null || typeof lv !== 'object')) {
          if (!eq(bv, lv)) { const p = path.concat(k); push(out, { o: 's', p: p, v: clone(lv) }, { p: p, o: 's', b: clone(bv) }); }
        } else diffNode(path.concat(k), bv, lv, out);
      }
    }
    for (let i = 0; i < lk.length; i++) {
      const k = lk[i];
      if (hasOwn(b, k) || !syncableKey(k)) continue;         // b's own keys were all decided above
      if (l[k] === undefined) continue;
      const p = path.concat(k);
      push(out, { o: 's', p: p, v: clone(l[k]) }, { p: p, o: 's', b: undefined });
    }
  }

  function diffKeyed(path, b, l, field, out) {
    const seg = function (v) { return P.keyedSeg(field, v); };
    const before = out.ops.length;
    const bIdx = Object.create(null);
    for (let i = 0; i < b.length; i++) bIdx[b[i][field]] = i;
    const lSet = Object.create(null);
    for (let i = 0; i < l.length; i++) lSet[l[i][field]] = i;

    for (let i = 0; i < b.length; i++) {
      const k = b[i][field];
      if (lSet[k] !== undefined) continue;
      const anchors = [];
      for (let j = i - 1; j >= 0 && anchors.length < 5; j--) anchors.push(seg(b[j][field]));
      const was = clone(b[i]);
      const p = path.concat(seg(k));
      push(out, { o: 'ar', p: p }, { p: p, o: 'ar', b: was, bh: cyrb53(canon(was)), anchors: anchors, arr: path });
    }

    const common = [], commonBaseIdx = [];
    for (let i = 0; i < l.length; i++) { const k = l[i][field]; if (bIdx[k] !== undefined) { common.push(k); commonBaseIdx.push(bIdx[k]); } }
    const keepSet = Object.create(null);
    const lis = lisIndices(commonBaseIdx);
    for (let i = 0; i < lis.length; i++) keepSet[common[lis[i]]] = 1;

    let prev = null;
    for (let i = 0; i < l.length; i++) {
      const k = l[i][field];
      if (bIdx[k] === undefined) {
        push(out, { o: 'ai', p: path, k: seg(k), a: prev, v: clone(l[i]) }, { p: path.concat(seg(k)), o: 'ai', arr: path, after: canon(l[i]) });
      } else if (!keepSet[k]) {
        const bi = bIdx[k];
        const aBefore = bi > 0 ? seg(b[bi - 1][field]) : null;
        const p = path.concat(seg(k));
        push(out, { o: 'am', p: p, a: prev }, { p: p, o: 'am', aBefore: aBefore, aAfter: prev, arr: path });
      }
      prev = seg(k);
    }
    if (out.orders && out.ops.length > before) {
      out.orders.push({ p: path.slice(), f: field, k: b.map(function (e) { return e[field]; }) });
    }

    for (let i = 0; i < l.length; i++) {
      const k = l[i][field];
      if (bIdx[k] === undefined) continue;
      diffNode(path.concat(seg(k)), b[bIdx[k]], l[i], out);
    }
  }

  /* ═══ INVERSES (§10.2) ═════════════════════════════════════════════════════════════════════════
   * One op plus the rec the diff produced for it gives the op that undoes it. The CONDITIONS on an
   * undo (has anyone else touched it since?) belong to the session (S2); this builds the op only, and
   * returns null when the rec cannot support one. `live` supplies surviving anchors for a re-insert.
   *
   * ⚠️ FOR `mv` AND `am` THIS IS THE INVERSE OF THE OP, WHICH IS NOT THE INVERSE OF THE STEP — use
   * invertStep() below for an undo. Measured counterexample, and it is not exotic: base A,B,C,D →
   * live C,A,D,B diffs to mv{C,a:null} then mv{D,a:A}. Replaying those two inverses in reverse order
   * (mv{D,a:C}, then mv{C,a:B}, each op's recorded base predecessor) gives D,A,B,C — not the base
   * order at all. The reason is that a reorder walk places each layer relative to a list that is half
   * old and half new, so "the layer that used to be above me" is not where I came from. */
  function invert(op, rec, live) {
    if (!op || !rec) return null;
    switch (op.o) {
      case 's':
        return (rec.b === undefined) ? { o: 'd', p: op.p } : { o: 's', p: op.p, v: clone(rec.b) };
      case 'd':
        return { o: 's', p: op.p, v: clone(rec.b) };
      case 'li':
        return { o: 'lr', id: op.id };
      case 'lr':
        return { o: 'li', id: op.id, a: firstSurviving(rec.anchors, live, null, 'id'), v: clone(rec.b) };
      case 'mv':
        return { o: 'mv', id: op.id, a: rec.aBefore == null ? null : rec.aBefore };
      case 'ai':
        return { o: 'ar', p: op.p.concat(op.k) };
      case 'ar':
        return { o: 'ai', p: rec.arr, k: op.p[op.p.length - 1], a: firstSurviving(rec.anchors, live, rec.arr, null), v: clone(rec.b) };
      case 'am':
        return { o: 'am', p: op.p, a: rec.aBefore == null ? null : rec.aBefore };
      default: return null;
    }
  }
  /* The highest anchor that is still there. A deleted layer is put back where it was unless everything
     that used to be above it has gone too, in which case it goes to the top — which is where `li` with
     a:null puts it, and is the same fallback the host uses. */
  function firstSurviving(anchors, live, arrPath, field) {
    if (!anchors || !anchors.length || !live) return anchors && anchors.length ? anchors[0] : null;
    const arr = arrPath ? nodeAt(live, arrPath, arrPath.length) : (live.layers || []);
    if (!Array.isArray(arr)) return null;
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      const f = field || (P.isKeyedSeg(a) ? P.keyedField(a) : 'id');
      const v = P.isKeyedSeg(a) ? P.keyedValue(a) : a;
      if (P.indexOfKey(arr, f, v) >= 0) return a;
    }
    return null;
  }

  /* The inverse of a WHOLE diff step: apply it to `live` and you are back at `base`, exactly. This is
     what an undo needs, and it is a Tier-1 property test over 200 seeded scenes.
     Two passes, in this order:
       1. content and membership, in reverse emission order — an `s`/`d` goes back to its recorded `b`,
          an insert is removed, a removal is re-inserted (at the top; pass 2 puts it where it belongs);
       2. ORDER, restated absolutely rather than inverted: for every array whose order the step
          disturbed (`res.orders`, the same `{p, f, k}` shape applyOrder takes), walk the recorded base
          key list and emit `mv`/`am` placing each key after its
          predecessor. That is n ops instead of the LIS-minimal count, which is the right trade for an
          undo — it is unconditional, it cannot be wrong, and apply() reports the ones that change
          nothing as 'noop' so the host never sequences them. */
  function invertStep(res) {
    const inv = [];
    for (let i = res.ops.length - 1; i >= 0; i--) {
      const op = res.ops[i], rec = res.recs[i] || {};
      switch (op.o) {
        case 's': inv.push(rec.b === undefined ? { o: 'd', p: op.p } : { o: 's', p: op.p, v: clone(rec.b) }); break;
        case 'd': inv.push({ o: 's', p: op.p, v: clone(rec.b) }); break;
        case 'li': inv.push({ o: 'lr', id: op.id }); break;
        case 'lr': inv.push({ o: 'li', id: op.id, a: null, v: clone(rec.b) }); break;
        case 'ai': inv.push({ o: 'ar', p: op.p.concat(op.k) }); break;
        case 'ar': inv.push({ o: 'ai', p: rec.arr, k: op.p[op.p.length - 1], a: null, v: clone(rec.b) }); break;
        default: break;                                   // mv / am: pass 2
      }
    }
    const orders = res.orders || [];
    for (let i = 0; i < orders.length; i++) {
      const ord = orders[i];
      let prev = null;
      for (let j = 0; j < ord.k.length; j++) {
        const k = ord.k[j];
        if (ord.p == null) inv.push({ o: 'mv', id: k, a: prev });
        else inv.push({ o: 'am', p: ord.p.concat(P.keyedSeg(ord.f, k)), a: prev == null ? null : P.keyedSeg(ord.f, prev) });
        prev = k;
      }
    }
    return inv;
  }

  C.diff = {
    diffDoc: diffDoc, diffNode: diffNode, apply: apply, invertStep: invertStep,
    applyOrder: applyOrder, orderStatementsFor: orderStatementsFor,
    valueAt: valueAt, nodeAt: nodeAt, locate: locate,
    patchObject: patchObject, fillArray: fillArray, clearRuntimeKeys: clearRuntimeKeys,
    lisIndices: lisIndices, resolveAnchor: resolveAnchor, moveAfter: moveAfter,
    invert: invert, firstSurviving: firstSurviving
  };

})(window.FM);
