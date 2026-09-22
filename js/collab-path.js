/* FreeMotion — live collaboration (queue 921), STAGE S1: the path grammar and value rules.
 *
 * Every device has to agree, byte for byte, on three things or nothing else in collab can work:
 *   · how a place in the document is named (§5.2)                     → seg / wire / parse
 *   · whether two values are "the same" (§5.5)                        → canon / eq / cyrb53
 *   · which arrays are addressable element-by-element and which are   → arrayMode / KEYED
 *     replaced whole (§5.3)
 *
 * Pure. No DOM, no FM.scene, no state. It is safe to call any of this with a hostile document: every
 * entry point is written to answer "no" rather than to throw.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};

  /* ═══ 1. SEGMENTS AND WIRE FORM (§5.2) ════════════════════════════════════════════════════════ */

  /* An ordinary object key. First character is a letter or $, which is what rejects BOTH a leading
     underscore (never synced — the FM.jsonReplacer rule, scene.js:729) and a numeric index; §5.2 says
     numeric index segments do not exist, because an array is either keyed or atomic. */
  const KEY_RE = /^[A-Za-z$][\w$]{0,63}$/;
  /* …and three names that must never be walked into, because assigning through them reaches
     Object.prototype from a peer's message. `__proto__` is already refused by the leading-underscore
     rule above; the other two pass KEY_RE and are refused here.
     ⚠️ A `{__proto__:1}` literal would NOT have worked as a lookup table — that syntax sets the
     prototype rather than an own key — so this is a list, checked by ===. */
  const FORBIDDEN = ['__proto__', 'constructor', 'prototype'];
  const KEYVAL_RE = /^[\w.-]{1,64}$/;      // the id/uid inside a #i:/#u: segment, and a layer id

  function escSeg(s) { return String(s).replace(/~/g, '~0').replace(/\//g, '~1'); }
  /* ~1 before ~0, the JSON-Pointer order: the other way round turns an escaped literal "~1" back into
     a separator. */
  function unescSeg(s) { return String(s).replace(/~1/g, '/').replace(/~0/g, '~'); }

  function isKeySeg(s) {
    return typeof s === 'string' && KEY_RE.test(s) && FORBIDDEN.indexOf(s) < 0;
  }
  function isKeyedSeg(s) {
    return typeof s === 'string' && (s.charCodeAt(0) === 35) && (s[1] === 'i' || s[1] === 'u') && s[2] === ':' &&
      KEYVAL_RE.test(s.slice(3));
  }
  function keyedField(s) { return s[1] === 'u' ? 'uid' : 'id'; }
  function keyedValue(s) { return s.slice(3); }
  function keyedSeg(field, value) { return (field === 'uid' ? '#u:' : '#i:') + value; }

  /* The segment ceiling, as a name rather than a literal, because the DIFF has to stop descending one
     level before it (queue 921): a walk that keeps going emits an op on a path its own apply() calls
     'bad', and the host then refuses the whole tx — including the unrelated slider in the same batch. */
  const MAX_SEGS = 32;

  /* A whole path, as an array of segments. Roots are P (project) and L (layers); the segment right
     after L is a layer id, which is minted by FM.uid and so is not an object-key shape. */
  function validPath(p) {
    if (!Array.isArray(p) || !p.length || p.length > MAX_SEGS) return false;
    const root = p[0];
    if (root !== 'P' && root !== 'L') return false;
    let i = 1;
    if (root === 'L') {
      if (p.length === 1) return true;                      // the layer list itself
      if (typeof p[1] !== 'string' || !KEYVAL_RE.test(p[1])) return false;
      i = 2;
    }
    for (; i < p.length; i++) {
      const s = p[i];
      if (!isKeySeg(s) && !isKeyedSeg(s)) return false;
    }
    return true;
  }

  function toWire(p) {
    if (!Array.isArray(p)) return '';
    const out = new Array(p.length);
    for (let i = 0; i < p.length; i++) out[i] = escSeg(p[i]);
    return out.join('/');
  }
  /* Returns null — never a half-parsed path — when the string is not a valid path. Callers treat null
     as "reject the message", which is the only safe reading of input from another device. */
  function fromWire(s) {
    if (typeof s !== 'string' || !s.length || s.length > 2048) return null;
    const raw = s.split('/');
    const out = new Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = unescSeg(raw[i]);
    return validPath(out) ? out : null;
  }
  /* ⚠️ Does this path's LAST segment name the key field of the element that HOLDS it? `['L',<id>,'id']`
     names a layer's own id; `[…,'#u:x','uid']` names an effect's own uid. Writing or deleting either
     detaches the element from the only name anything can address it by: `locate` answers 'gone' for
     every later path through it, the diff's layer walk skips it (`if (!L || !L.id) continue`), the
     host's per-layer sanitiser never sees it again — and canon() still counts it, so every device
     converges on a corpse nothing can remove. `s`/`d` on such a path are refused (queue 921). */
  function namesKeyField(p) {
    if (!Array.isArray(p) || p.length < 3) return false;
    const last = p[p.length - 1], holder = p[p.length - 2];
    if (p.length === 3 && p[0] === 'L' && last === 'id') return true;
    return isKeyedSeg(holder) && last === keyedField(holder);
  }
  /* …and the paths that address a keyed ELEMENT itself, rather than a key inside one. An `s` here
     replaces an identified element, so its value must be an object (§5.3). */
  function isElementPath(p) {
    if (!Array.isArray(p) || p.length < 2) return false;
    if (p.length === 2 && p[0] === 'L') return true;
    return isKeyedSeg(p[p.length - 1]);
  }

  /* The map key for held/pending/deferred/lastW. Identical to the wire form; it exists as its own name
     so that a future change to the wire cannot silently change what "the same path" means to a Map. */
  function pathKey(p) { return toWire(p); }

  /* "Overlaps" (§8.1): one path is a segment-prefix of the other, in either direction — so a pending
     write to a parent covers its children and a pending write to a child is covered by its parent. */
  function overlaps(a, b) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  /* ═══ 2. CANONICAL FORM AND EQUALITY (§5.5) ═══════════════════════════════════════════════════ */

  /* JSON.stringify with sorted keys and `_` keys dropped, so two devices that built the same document
     in a different key order hash the same. JSON semantics throughout, which is what makes the
     comparison honest about what will actually travel: NaN and ±Infinity become null (they do on the
     wire), -0 becomes 0, undefined disappears from an object and becomes null inside an array.
     Returns undefined for a value JSON would drop entirely (undefined, a function, a symbol). */
  function canon(v, depth) {
    const d = depth || 0;
    if (d > 64) return '"[deep]"';                          // a cycle or absurd nesting: bounded, never a throw
    if (v === null) return 'null';
    const t = typeof v;
    if (t === 'number') return isFinite(v) ? JSON.stringify(v === 0 ? 0 : v) : 'null';
    if (t === 'boolean') return v ? 'true' : 'false';
    if (t === 'string') return JSON.stringify(v);
    if (t !== 'object') return undefined;                   // undefined / function / symbol
    if (typeof v.toJSON === 'function') { try { return canon(v.toJSON(), d + 1); } catch (e) { return 'null'; } }
    if (Array.isArray(v)) {
      const parts = new Array(v.length);
      for (let i = 0; i < v.length; i++) { const s = canon(v[i], d + 1); parts[i] = (s === undefined) ? 'null' : s; }
      return '[' + parts.join(',') + ']';
    }
    const keys = Object.keys(v).filter(syncable).sort();
    const out = [];
    for (let i = 0; i < keys.length; i++) {
      const s = canon(v[keys[i]], d + 1);
      if (s !== undefined) out.push(JSON.stringify(keys[i]) + ':' + s);
    }
    return '{' + out.join(',') + '}';
  }

  /* ⚠️ canon(), clone() and the diff's key walk MUST drop the same keys or the whole thing stops
     converging. A key that cannot appear in a path (a `_` cache, or one of the three prototype names)
     can never be sent — so if the HASH counted it, two devices holding identical synced documents
     would disagree forever, resync forever, and the report would name a path nobody can write.
     ⚠️ THAT IS WHY THIS IS `isKeySeg` AND NOT JUST THE `_`/FORBIDDEN PAIR (queue 921). The diff walks
     by `syncable(k) && isKeySeg(k)`, so a key outside KEY_RE — `font-size`, `2x`, one over 64
     characters — was hashed and cloned but could never be addressed: a peer that slipped one in
     through a whole-value `s` left it in base for good, the host's own sanitiser could not emit a
     repair for it (the repair diff skips it too), and the exact "disagree forever" above is what the
     next device to normalise its live tree would do. Measured: every key the sanitiser produces, on
     all 205 registered effects and on the schema fixture, is a valid key segment, so this narrowing
     drops nothing the app makes. */
  function syncable(k) { return isKeySeg(k); }

  /* ⚠️ THE NO-OP RULE LIVES HERE AND IT IS LOAD-BEARING (§5.5). An op whose value already equals the
     target is never sequenced, echoed or recorded. That single line is what lets every device run the
     same deterministic derived writes (autoFitDuration, _fillFxParams, inheritLoopModes) without them
     turning into a message storm between peers — each one computes the same value, the diff sees no
     difference, and nothing is sent. Mutating it is one of the §25.6 mutation proofs. */
  function eq(a, b) { return canon(a) === canon(b); }

  /* cyrb53 — a 53-bit non-cryptographic hash. Used for the divergence detector (§11.4), for `bh` on
     removals (§6.1) and for the schema fingerprint. Never for security. */
  function cyrb53(str, seed) {
    let h1 = 0xdeadbeef ^ (seed || 0), h2 = 0x41c6ce57 ^ (seed || 0);
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  /* A plain-JSON deep copy with `_` keys dropped — the same shape canon() describes, so anything that
     survives a clone is exactly what a peer would have received. */
  function clone(v, depth) {
    const d = depth || 0;
    /* ⚠️ AT THE CEILING IT MUST RETURN SOMETHING THAT CANNOT ALIAS (queue 921). Returning `v` handed
       back the LIVE sub-object, so `clone()` past depth 64 was not a copy — and the host's whole
       sanitise-on-a-clone guarantee (collab-host.js:308) rests on it being one: an invariant reaching
       that deep would have edited `base` itself, with no fix op recording that it happened, and
       H.snapshot() would have shipped aliased state. `'[deep]'` is also exactly what canon() says is
       there at this depth, so the two functions describe the same document. */
    if (d > 64) return '[deep]';
    if (v === null || typeof v !== 'object') {
      return (typeof v === 'number' && !isFinite(v)) ? null : v;
    }
    if (Array.isArray(v)) {
      const out = new Array(v.length);
      for (let i = 0; i < v.length; i++) { const c = clone(v[i], d + 1); out[i] = (c === undefined) ? null : c; }
      return out;
    }
    const out = {};
    const keys = Object.keys(v);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!syncable(k)) continue;        // `out.__proto__ = …` would set a PROTOTYPE, not a key
      const c = clone(v[k], d + 1);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }

  /* ═══ 3. KEYED AND ATOMIC ARRAYS (§5.3) ═══════════════════════════════════════════════════════ */

  const KEYED = { effects: 'uid', audioFx: 'uid', behaviors: 'uid', masks: 'id', notes: 'id', comments: 'id', replies: 'id' };

  /* 📐 DECIDED, AND §5.3 HAS BEEN UPDATED. The spec's rules 2 and 3 contradict each other: rule 2 says
     "if every element is an object with a unique string id, the array is keyed by id (future-proofing)",
     and rule 3 then lists `captions`, `markers`, `points`, `subs`, `bez` and the mask `path` as atomic.
     Measured in this tree, none of those shapes carries an `id` today, so both rules agree — but the moment
     anyone adds one (a caption cue id for the ruler marks, say) rule 2 would silently promote that array
     to element addressing, and the atomic guarantee §5.3 leans on — "it can lose a concurrent edit to a
     sibling, but it never drops data" — would be gone from a list the spec says is atomic. The names are
     therefore checked BEFORE the shape sniff. This is a safe direction to be wrong in: naming an array
     atomic costs a whole-value set, naming it keyed costs data. */
  const ATOMIC = { kf: 1, subs: 1, points: 1, path: 1, captions: 1, markers: 1, bez: 1, crop: 1, stops: 1, segments: 1, cues: 1 };

  /* Returns 'uid' | 'id' | null (atomic) for the array `arr` found under object key `key`.
     A DECLARED key field that is missing or duplicated on any element makes the array atomic for this
     diff rather than producing two ops that address the same place — stampIds() repairs the document
     on the next tick and it becomes keyed again. Ambiguity resolved towards "never drop data". */
  function arrayMode(key, arr) {
    if (!Array.isArray(arr)) return null;
    if (Object.prototype.hasOwnProperty.call(ATOMIC, key)) return null;
    const declared = Object.prototype.hasOwnProperty.call(KEYED, key) ? KEYED[key] : null;
    if (declared) return usableKey(arr, declared) ? declared : null;
    if (!arr.length) return null;                            // an empty array is atomic: nothing to key on
    return usableKey(arr, 'id') ? 'id' : null;
  }
  function usableKey(arr, field) {
    const seen = Object.create(null);
    for (let i = 0; i < arr.length; i++) {
      const el = arr[i];
      if (!el || typeof el !== 'object' || Array.isArray(el)) return false;
      const k = el[field];
      if (typeof k !== 'string' || !KEYVAL_RE.test(k)) return false;
      if (seen[k]) return false;
      seen[k] = 1;
    }
    return true;
  }

  function indexOfKey(arr, field, value) {
    for (let i = 0; i < arr.length; i++) { const el = arr[i]; if (el && el[field] === value) return i; }
    return -1;
  }

  /* ═══ 4. UID STAMPING (§5.4) ══════════════════════════════════════════════════════════════════ */

  /* The sanitizers keep a uid only when it matches this (storage.js `keepUid`, queue 921 S0). Minting
     anything else would produce a uid the next load throws away, and the array would silently go
     atomic on one device and keyed on another. */
  const UID_RE = /^[a-z0-9]{4,16}$/;
  function mintUid(rand) {
    let s = '';
    const r = rand || Math.random;
    while (s.length < 8) s += Math.floor(r() * 0x100000000).toString(36);
    return s.slice(0, 8);
  }

  /* Walks the whole document and gives every element of a uid-keyed array a valid, unique uid.
     · Runs only while a session is active, before every diff and every remote apply, so a solo project
       never gains one (the S0 byte-identity bargain).
     · A DUPLICATE is re-stamped on the LATER occurrence, so the first element keeps the identity the
       other devices already know — duplicating an effect or pasting a preset is the ordinary way to
       produce one and the copy is the new thing.
     · id-keyed arrays (masks, notes, comments) are never touched: those ids are the app's own.
     Returns the number of elements stamped, so a caller can skip a redundant diff. */
  function stampIds(root, rand) {
    let n = 0;
    walk(root, 0);
    return n;

    function walk(node, depth) {
      if (!node || typeof node !== 'object' || depth > 24) return;
      if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) walk(node[i], depth + 1); return; }
      const keys = Object.keys(node);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (k.charCodeAt(0) === 95) continue;               // never synced, never stamped
        const v = node[k];
        if (!v || typeof v !== 'object') continue;
        if (Array.isArray(v) && KEYED[k] === 'uid') stampArray(v);
        walk(v, depth + 1);
      }
    }
    function stampArray(arr) {
      const seen = Object.create(null);
      for (let i = 0; i < arr.length; i++) {
        const el = arr[i];
        if (!el || typeof el !== 'object' || Array.isArray(el)) continue;
        let u = el.uid;
        if (typeof u !== 'string' || !UID_RE.test(u) || seen[u]) {
          do { u = mintUid(rand); } while (seen[u]);
          el.uid = u; n++;
        }
        seen[u] = 1;
      }
    }
  }

  C.path = {
    KEY_RE: KEY_RE, KEYVAL_RE: KEYVAL_RE, KEYED: KEYED, ATOMIC: ATOMIC, UID_RE: UID_RE,
    MAX_SEGS: MAX_SEGS,
    esc: escSeg, unesc: unescSeg,
    isKeySeg: isKeySeg, isKeyedSeg: isKeyedSeg,
    namesKeyField: namesKeyField, isElementPath: isElementPath,
    keyedField: keyedField, keyedValue: keyedValue, keyedSeg: keyedSeg,
    valid: validPath, toWire: toWire, fromWire: fromWire, key: pathKey, overlaps: overlaps,
    canon: canon, eq: eq, cyrb53: cyrb53, clone: clone, syncable: syncable,
    arrayMode: arrayMode, indexOfKey: indexOfKey,
    mintUid: mintUid, stampIds: stampIds
  };

})(window.FM);
