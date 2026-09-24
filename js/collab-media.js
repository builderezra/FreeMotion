/* FreeMotion — live collaboration (queue 921), STAGE S4: media (spec §15, §22, §12.4).
 *
 * The document has crossed since S2 and the wire has been real since S3. This file is what makes a
 * shared project a project rather than an outline: the CLIPS. It owns the manifest, the want/have
 * conversation, the chunked transfer over the `bulk` channel, the 4 MiB parts in IndexedDB that make a
 * dropped link resumable, the writes into the receiver's own records, fonts, and the two honest
 * answers a device can give — "I am out of room" and "I am still receiving, do you want to wait".
 *
 * ⚠️ IT IS ONE RECONCILE, NOT A SCRIPT. Every path below — a join, a split, a paste, a replace, an undo
 * of a replace, a guest adding a clip, a third peer arriving, a link that dropped in the middle of a
 * 649 KB file — ends in the same place: `reconcile()` asks "what does my document need that I do not
 * have, and what do I hold that my peers do not know about", and `pump()` moves the difference. A
 * script with one branch per event is a script with a branch nobody wrote for the event nobody thought
 * of; the events here are exactly the ones nobody thinks of.
 *
 * ⚠️ AND IT NEVER WRITES OVER ONE OF HIS OWN PROJECTS. Every write this file makes is keyed by a LAYER
 * ID that arrived in the host's own document, into the linked copy §12.2 created, or under `collab:`.
 * The same-device refusal (§12.2 check 3) is what guarantees those ids are not already on this device;
 * this file adds the second half of that promise — it never writes a record for a layer id that is not
 * in the OPEN project's document.
 *
 * ⚠️ NOTHING HERE RUNS UNTIL A SESSION EXISTS. No listeners, no timers, no storage reads at load: like
 * every other collab module, this file costs one parse to a solo user with Labs off (§23).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};
  const P = C.path;
  const M = {};

  /* ═══ §21's MEDIA ROW ═════════════════════════════════════════════════════════════════════════
   * 📐 DECIDED, and §21 has been updated. The spec says every constant lives in `collab-core.js` "so no
   * module invents its own", and that rule is about numbers MORE THAN ONE module reads — a tick rate the
   * session and the bridge must agree on, a ceiling the host and the guest both enforce. Every number
   * below is read by this file and by nothing else, and `C.LIMITS` is frozen at parse time in a file
   * three stages older, so adding them there means every stage after this one edits a file it otherwise
   * has no reason to touch. Frozen and exported, so the suite measures the real numbers rather than a
   * copy of them, which is the half of the rule that matters. */
  const LIM = Object.freeze({
    CHUNK: 64 * 1024,               // §15.5 — the link re-frames to the SCTP limit underneath us
    PART: 4 * 1024 * 1024,          // §15.6 — one IndexedDB record per 4 MiB, which is the resume grain
    WINDOW: 8 * 1024 * 1024,        // §15.5 — the sender never runs this far ahead of the receiver's `ok`
    IN_FLIGHT: 2,                   // §15.3 — at most two files at once
    BUFFER_HIGH: 4 * 1024 * 1024,   // §15.5 — pause over this, resume under a quarter of it
    ASK_ABOVE: 100 * 1024 * 1024,   // §15.4 — above this, ask before downloading at all
    GUEST_WARN: 200 * 1024 * 1024,  // §15.9 — warn a guest adding a file this big
    GUEST_CAP: 1024 * 1024 * 1024,  // §15.9 — and refuse above this
    FONT_MAX: 4 * 1024 * 1024,      // §15.9 — fonts are capped
    FILE_MAX: 8 * 1024 * 1024 * 1024, // §14.9 — a peer-declared size this side of absurd; nothing legitimate is near it
    PART_TTL: 7 * 24 * 3600 * 1000, // §12.4 — parts older than a week are nobody's resume point
    SWEEP: 1500,                    // §9's sweep rule applied to media: notice what nothing announced
    NAME_MAX: 200,                  // a file name is a peer's string
    TRIES: 2                        // §14.9 — a file that arrives broken twice is not asked for a third time
  });
  M.LIMITS = LIM;

  const MEDIA_SKIP = { text: 1, shape: 1, null: 1, group: 1, camera: 1 };
  function carriesMedia(l) { return !!(l && typeof l.type === 'string' && !MEDIA_SKIP[l.type]); }

  /* ═══ FRAMES (§15.5) ══════════════════════════════════════════════════════════════════════════
   * 12 bytes: [u8 type][u8 0][u16 0][u32 xid][u32 seq]. Type 1 starts a transfer and carries a UTF-8
   * JSON header; type 2 is payload. The LINK does its own fragmentation to the SCTP limit underneath
   * this (collab-link.js), so a frame arrives whole or not at all — which is why `seq` here counts
   * CHUNKS and not packets. */
  const HDR = 12;
  const T_START = 1, T_DATA = 2;
  const enc = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : null;
  const dec = (typeof TextDecoder !== 'undefined') ? new TextDecoder() : null;

  function frame(type, xid, seq, bytes) {
    const n = bytes ? bytes.length : 0;
    const out = new Uint8Array(HDR + n);
    const dv = new DataView(out.buffer);
    dv.setUint8(0, type); dv.setUint8(1, 0); dv.setUint16(2, 0);
    dv.setUint32(4, xid >>> 0); dv.setUint32(8, seq >>> 0);
    if (n) out.set(bytes, HDR);
    return out.buffer;
  }
  function unframe(buf) {
    /* ⚠️ A PEER'S BYTES (§14.9). A frame shorter than the header, a type nobody sends, a length that
       does not add up: all free to send, none of them an error anywhere else. */
    if (!buf) return null;
    const b = (buf instanceof ArrayBuffer) ? new Uint8Array(buf) : (ArrayBuffer.isView(buf) ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) : null);
    if (!b || b.length < HDR) return null;
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { type: dv.getUint8(0), xid: dv.getUint32(4), seq: dv.getUint32(8), body: b.subarray(HDR) };
  }

  function fpOf(file) {
    if (!file) return null;
    return String(file.name || 'media') + '|' + (file.size | 0) + '|' + (file.lastModified || 0);
  }
  /* 📐 DECIDED AGAINST §15.1's `fid = 'f' + n`, and §15.1 has been updated. A counter is STATE: it has
     to survive every manifest delta, a host reload (which mints a new epoch but keeps the files), and
     the two directions this file is symmetric in — and two peers counting independently would hand the
     same name to different files. `fp` is what §15.7 already resumes by and what §15.2 already dedupes
     by, so a hash of it is a name both ends compute rather than exchange, it is stable across a reload
     by construction, and it makes the part key (`collab:part:<sid>:<cyrb53(fp)>:<n>`) derivable from
     the fid alone instead of from a lookup that may have been thrown away.
     Two DIFFERENT files with the same name, size and millisecond would collide — and collapsing them is
     what §15.2's own "another layer already holds a completed file with the same fp" rule does on
     purpose, so this is the existing reading of fp, not a new one. */
  function fidOf(fp) { return 'f' + (P.cyrb53(String(fp)) >>> 0).toString(36) + (P.cyrb53(String(fp), 7) >>> 0).toString(36); }
  function hashOf(fp) { return (P.cyrb53(String(fp)) >>> 0).toString(36); }

  function clean(s, max) {
    return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f]/g, '').slice(0, max || LIM.NAME_MAX);
  }
  function mb(n) { const v = n / 1048576; return (v >= 1024 ? (v / 1024).toFixed(1) + ' GB' : (v < 10 ? v.toFixed(1) : Math.round(v)) + ' MB'); }

  /* ═══ THE PER-SESSION CONTROLLER ══════════════════════════════════════════════════════════════ */

  function ctlOf(S) { return S && S._media ? S._media : null; }

  M.install = function (S, opts) {
    if (!S) return null;
    if (S._media) return S._media;
    const o = opts || {};
    const ctl = {
      S: S,
      /* The room, not the project: §12.4 keys parts by sid so a rejoin to the SAME room finds them and
         a different room never does. A loopback session in the suite has no sid; its own gpid is just
         as unique and just as stable. */
      sid: o.sid || S.sid || S.gpid || S.pid || 'room',
      mine: Object.create(null),      // fid -> what THIS device holds and can serve
      peer: Object.create(null),      // fid -> what a peer has told us about  (+ .from = mid)
      told: Object.create(null),      // fid -> the peers we have already advertised it to
      out: Object.create(null),       // xid -> an outgoing transfer
      inb: Object.create(null),       // fid -> an incoming transfer
      queue: [],                      // fids still wanted, in §15.3 order
      wanted: Object.create(null),    // fid -> 1 while it is queued or in flight
      have: Object.create(null),      // fid -> 1 once it is written here
      held: [],                       // completed files parked behind the §8.9 barrier
      nextXid: 1,
      bytesWant: 0, bytesGot: 0,
      files: 0, filesDone: 0,
      failed: 0,                      // files this device had no room for
      skip: false,                    // "Skip media" / "Not now"
      cap: 0,                         // >0 after "Get what fits": the byte budget still allowed
      asked: false,                   // §15.4's questions are asked once per session
      busy: false,                    // one reconcile at a time
      dirty: true,                    // something changed; reconcile again
      revs: Object.create(null),      // lid -> the mediaRev we last acted on
      tries: Object.create(null),     // fid -> attempts that ended in a file this device could not use
      bad: Object.create(null),       // fid -> 1 once this device has stopped asking for it
      capped: false,                  // "Get what fits" is in force — a budget spent to 0 is still a budget
      stats: { sentBytes: 0, gotBytes: 0, localCopies: 0, resumed: 0, wants: 0, writes: 0 }
    };
    S._media = ctl;
    /* §15.10's markers are CLASSES AND CHILDREN ON `.clip` ELEMENTS, and the timeline replaces every
       one of those on each rebuild — a pinch, a clip drag, a file landing. The only repaint was behind
       a flag that a data FRAME sets, so a rebuild during a stall, between two files, or before the
       first byte left the clip looking like an ordinary one that renders blank. The timeline offers
       the hook §15.10 names; this is the file that never subscribed to it. */
    try {
      if (FM.timeline && FM.timeline.onRebuilt) ctl._offRebuilt = FM.timeline.onRebuilt(function () { M.paint(S); });
    } catch (e) {}
    return ctl;
  };

  M.detach = function (S) {
    const ctl = ctlOf(S);
    if (!ctl) return false;
    Object.keys(ctl.out).forEach(function (x) { ctl.out[x].stop = true; });
    ctl.queue.length = 0;
    if (ctl._offRebuilt) { try { ctl._offRebuilt(); } catch (e) {} ctl._offRebuilt = null; }
    /* ⚠️ §12.4's COLLECTOR NEEDED A CALLER, and this is the one its own comment names ("it runs when a
       session ENDS"). Nothing called it: `pruneOrphans` skips every `collab:` key by design, so the
       4 MiB parts left by every dropped link and every tab closed mid-download stayed on the device
       for good — in the same IndexedDB quota as his real projects, until an ordinary save starts
       failing on a device that looks empty. Fire and forget, and NEVER forced: this room's own parts
       are still somebody's resume point (§15.7); what goes is what the rooms before it left behind. */
    try { M._gc = M.gcParts({ sid: ctl.sid, ctl: ctl }).catch(function () { return 0; }); } catch (e) {}
    S._media = null;
    M.ui.hide();
    return true;
  };

  M.state = function (S) {
    const ctl = ctlOf(S || C.session);
    if (!ctl) return null;
    return {
      sid: ctl.sid, files: ctl.files, done: ctl.filesDone, failed: ctl.failed,
      bytesWant: ctl.bytesWant, bytesGot: ctl.bytesGot, skip: ctl.skip,
      pct: ctl.bytesWant ? Math.min(100, Math.round(ctl.bytesGot / ctl.bytesWant * 100)) : 100,
      queued: ctl.queue.length, inFlight: Object.keys(ctl.inb).length,
      mine: Object.keys(ctl.mine).length, peer: Object.keys(ctl.peer).length,
      stats: ctl.stats
    };
  };
  /* §15.8's question and §15.10's placeholders both need one number: how much of what this device is
     still waiting for has arrived. Counted in BYTES, not files, because "2 of 3" with the 4 GB one
     outstanding reads as nearly done and is not. */
  M.pending = function (S) {
    const ctl = ctlOf(S || C.session);
    if (!ctl) return { n: 0, pct: 100, bytes: 0 };
    const n = ctl.queue.length + Object.keys(ctl.inb).length + ctl.held.length;
    return { n: n, bytes: Math.max(0, ctl.bytesWant - ctl.bytesGot), pct: ctl.bytesWant ? Math.min(100, Math.round(ctl.bytesGot / ctl.bytesWant * 100)) : 100 };
  };
  /* Which layers in the open document are still without their picture — the timeline paints these. */
  M.missingLayers = function (S) {
    const ctl = ctlOf(S || C.session);
    const out = Object.create(null);
    if (!ctl) return out;
    Object.keys(ctl.peer).forEach(function (fid) {
      if (ctl.have[fid] || !ctl.wanted[fid]) return;
      const e = ctl.peer[fid];
      const inb = ctl.inb[fid];
      const pct = inb && e.size ? Math.min(99, Math.round(inb.got / e.size * 100)) : 0;
      (e.layers || []).forEach(function (pair) { out[pair[0]] = pct; });
    });
    return out;
  };

  /* ═══ WHAT THIS DEVICE HOLDS ══════════════════════════════════════════════════════════════════
   * One entry per distinct FILE, with every layer that uses it listed on it. That grouping is the
   * whole of "a split, a duplicate or a paste of the same clip transfers ZERO extra bytes": both
   * layers land on one entry, one transfer serves both, and a receiver that already holds one of them
   * copies the record across locally instead of asking (§15.2). */
  async function scanLocal(ctl) {
    const v = ctl.S.adapter.view();
    const layers = (v && v.layers) || [];
    const mine = Object.create(null);
    const byFp = Object.create(null);           // fp -> {file, kind} already on this device
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i];
      if (!carriesMedia(L)) continue;
      const rev = L.mediaRev || 0;
      let rec = FM.media.get(L.id);
      if (!rec || !rec.file || (rec.rev || 0) !== rev) {
        const disk = await FM.storage.readMedia(L.id);
        if (disk && disk.file && (disk.rev || 0) === rev) rec = disk;
        else if (!(rec && rec.file)) rec = null;
      }
      if (!rec || !rec.file) continue;
      const fp = fpOf(rec.file), fid = fidOf(fp);
      if (!byFp[fp]) byFp[fp] = { file: rec.file, kind: rec.kind || (L.type === 'image' ? 'image' : 'video') };
      const e = mine[fid] || (mine[fid] = {
        fid: fid, fp: fp, size: rec.file.size, mime: rec.file.type || '',
        kind: rec.kind || (L.type === 'image' ? 'image' : 'video'),
        name: clean(rec.file.name || 'media'), lm: rec.file.lastModified || 0, layers: []
      });
      e.layers.push([L.id, rev]);
      e._file = rec.file;
    }
    ctl.byFp = byFp;
    /* Fonts (§15.9). Only the families the document actually uses, and only the ones small enough to
       carry — the same rule `embedFonts` already applies when he exports a project file. */
    const fonts = [];
    try {
      if (FM.fonts && FM.fonts.list) {
        const used = Object.create(null);
        layers.forEach(function (l) { if (l && l.type === 'text' && l.fontFamily) used[l.fontFamily] = 1; });
        const list = FM.fonts.list() || [];
        for (let i = 0; i < list.length; i++) {
          const f = list[i];
          if (!f || !used[f.css]) continue;
          const file = await FM.fonts.getFile(f.id);
          if (!file || file.size > LIM.FONT_MAX) continue;
          const fid = 'font:' + f.id;
          fonts.push({ fid: fid, family: f.family, name: clean(f.name || 'Font'), css: f.css, size: file.size, mime: file.type || '' });
          mine[fid] = { fid: fid, fp: fid, size: file.size, mime: file.type || '', kind: 'font', name: clean(f.name || 'Font'), lm: 0, family: f.family, css: f.css, layers: [], _file: file };
        }
      }
    } catch (e) {}
    ctl.mine = mine;
    ctl.fonts = fonts;
    return mine;
  }

  /* The manifest as it goes on the wire: no `_file`, and every field a peer is allowed to see. */
  function wireEntry(e) {
    const o = { fid: e.fid, fp: e.fp, size: e.size, mime: e.mime, kind: e.kind, name: e.name, lm: e.lm, layers: e.layers };
    if (e.family) { o.family = e.family; o.css = e.css; }
    if (e.miss) o.miss = 1;
    return o;
  }
  /* And the same thing coming back OFF the wire, where every field is a stranger's (§14.9). A junk
     entry is dropped whole rather than half-trusted: there is no useful half. */
  function takeEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const fid = typeof raw.fid === 'string' ? raw.fid.slice(0, 64) : '';
    const fp = typeof raw.fp === 'string' ? raw.fp.slice(0, 400) : '';
    const size = +raw.size;
    if (!fid || !fp) return null;
    if (!(size >= 0 && size <= LIM.FILE_MAX)) return null;
    const kind = (raw.kind === 'image' || raw.kind === 'video' || raw.kind === 'font') ? raw.kind : 'video';
    const layers = [];
    if (Array.isArray(raw.layers)) {
      for (let i = 0; i < raw.layers.length && layers.length < 2000; i++) {
        const p = raw.layers[i];
        if (Array.isArray(p) && typeof p[0] === 'string' && p[0].length <= 64) layers.push([p[0], (+p[1] || 0)]);
      }
    }
    const e = {
      fid: fid, fp: fp, size: size, mime: MIME_RE.test(raw.mime || '') ? String(raw.mime) : '', kind: kind,
      name: clean(raw.name || 'media'), lm: (+raw.lm || 0), layers: layers, miss: raw.miss ? 1 : 0
    };
    if (kind === 'font') {
      /* ⚠️ A FAMILY NAME BECOMES CSS, AND IT CAME OFF THE WIRE (§14.9). `applyEmbedded` registers it as
         a `FontFace` family and writes `family + ', sans-serif'` into a font string that ends up in a
         `style` attribute and in `ctx.font`. The app's own import path takes that string from a file HE
         picked; this one takes it from a peer, so it is matched against a shape rather than trimmed —
         anything with a quote, a brace or a semicolon in it is not a font family, it is an injection
         attempt, and a font that does not arrive is a smaller loss than one that does. */
      if (!FAMILY_RE.test(raw.family || '')) return null;
      /* ⚠️ AND THE CAP IS ENFORCED HERE, NOT ONLY WHERE WE ADVERTISE (§15.9). `scanLocal` refuses to
         OFFER a font over FONT_MAX, which is this device policing itself; the ceiling that matters is
         on a stranger's DECLARATION. 90 MB is under §15.4's ask-first line, so it downloads in total
         silence and `applyEmbedded` then reads it whole through `readAsDataURL` — the blob, a base64
         string a third bigger, and a second File on top. On a phone that is the tab. */
      if (!(size <= LIM.FONT_MAX)) return null;
      e.family = String(raw.family);
      e.css = e.family + ', sans-serif';
    }
    return e;
  }
  const MIME_RE = /^[a-z0-9][a-z0-9.+\-]{0,40}\/[a-z0-9][a-z0-9.+\-]{0,60}$/i;
  /* ⚠️ AND IT IS THE SHAPE THE APP'S OWN IMPORT MINTS, not "anything that looks like a family name".
     `FM.fonts.import` names every face `'FMF' + id` and nothing else ever enters the font index, so
     this is not a restriction on any legitimate peer — it is the removal of the one thing a peer could
     do with a free-form name: send `family: 'Inter'` with any bytes at all. `fontHere` only searches
     the IMPORTED list, which never holds a built-in, so 'Inter' reads as missing; `applyEmbedded`
     builds its de-dup set from that same list, so it registers the face, writes it into the localStorage
     font index and the IDB blob store, and `rehydrateAll` puts it back on every boot afterwards. Every
     text layer in every project of his defaults to `'Inter, sans-serif'` — preview AND export — so a
     peer could permanently swap the glyphs of his whole app from inside one session. */
  const FAMILY_RE = /^FMF[A-Za-z0-9]{1,60}$/;

  /* ═══ ADVERTISING (§15.1 host `mf`, §15.9 guest `ann`) ════════════════════════════════════════
   * Symmetric on purpose. The host tells every guest what it holds; a guest tells the host what it
   * holds; and once the host HAS a guest's clip it advertises it like any other, which is how the file
   * reaches a third peer without the guest having to know that peer exists. */
  function advertise(ctl) {
    const S = ctl.S;
    const all = Object.keys(ctl.mine);
    const targets = S.isOwner ? S.peerIds() : ['h'];
    for (let t = 0; t < targets.length; t++) {
      const to = targets[t];
      const seen = ctl.told[to] || (ctl.told[to] = Object.create(null));
      const files = [], fonts = [];
      for (let i = 0; i < all.length; i++) {
        const fid = all[i], e = ctl.mine[fid];
        const stamp = e.size + ':' + e.layers.map(function (p) { return p[0] + '@' + p[1]; }).join(',');
        if (seen[fid] === stamp) continue;
        seen[fid] = stamp;
        if (e.kind === 'font') fonts.push(wireEntry(e)); else files.push(wireEntry(e));
      }
      if (!files.length && !fonts.length) continue;
      /* The MESSAGE NAME is the only asymmetry, and it is the one §20 asks for: `mf` from the host,
         `ann` from a guest. Both carry the same shape, so `onManifest` reads one. */
      S.sendMsg(to, { t: S.isOwner ? 'mf' : 'ann', files: files, fonts: fonts });
    }
  }

  /* ═══ RECEIVING A MANIFEST ════════════════════════════════════════════════════════════════════ */
  function onManifest(ctl, fromMid, msg) {
    const lists = [msg.files, msg.fonts];
    let n = 0;
    for (let k = 0; k < lists.length; k++) {
      const arr = lists[k];
      if (!Array.isArray(arr)) continue;
      for (let i = 0; i < arr.length && i < 4000; i++) {
        const e = takeEntry(arr[i]);
        if (!e) continue;
        e.from = fromMid || null;
        const prev = ctl.peer[e.fid];
        /* A DELTA MERGES ITS LAYER LIST rather than replacing it (queue 921 S4). The host sends `mf`
           deltas as things change, and a delta that only mentions the layer that just appeared would
           otherwise DROP the layers this entry already served — so a split's second half would look
           satisfied and its first half would quietly stop being tracked. */
        if (prev) {
          const seen = Object.create(null);
          prev.layers.forEach(function (p) { seen[p[0] + '@' + p[1]] = 1; });
          e.layers.forEach(function (p) { if (!seen[p[0] + '@' + p[1]]) prev.layers.push(p); });
          /* ⚠️ `miss` AND `from` ARE THE TWO FIELDS A DELTA MOVES, AND A STRANGER MUST NOT MOVE THEM
             (§14.9). Everything else above merges or is left alone; these two were taken from whoever
             spoke last. `miss` makes `planWants` skip the entry for the rest of the session — including
             the ZERO-BYTE local-copy path, so a clip whose bytes are already on this device would never
             be written — and nothing ever clears it, because `advertise` de-dupes by a stamp and the
             honest holder never re-sends. `from` is where the next `want` is addressed, so it re-sources
             a file to a peer that never offered it. A peer OFFERING bytes may become the source; only
             the CURRENT source may say the bytes are gone, and when it does the entry loses its source
             so an honest holder can still claim it. */
          if (e.miss) {
            if (prev.from == null || prev.from === e.from) { prev.miss = 1; prev.from = null; }
          } else {
            prev.miss = 0;
            prev.from = e.from;
          }
          /* And a `miss` answer to a `want` WE ARE WAITING ON is the end of that transfer. Nothing tore
             it down: `planWants`'s miss test sits before its in-flight test, so the entry was skipped
             while `ctl.inb[fid]` stayed for good. At IN_FLIGHT 2 two of those stop media altogether,
             and §15.8's card asked about a clip that could never arrive on every export forever. */
          if (prev.miss && ctl.inb[e.fid]) abort(ctl, e.fid, 'miss');
        } else {
          ctl.peer[e.fid] = e;
        }
        n++;
      }
    }
    if (n) ctl.dirty = true;
    return n;
  }

  /* ═══ THE RECONCILE ═══════════════════════════════════════════════════════════════════════════
   * The one place that decides what has to happen. Called on every tick and after every message. */
  async function reconcile(ctl) {
    if (ctl.busy) return;
    ctl.busy = true;
    ctl.dirty = false;
    try {
      await applyHeld(ctl);
      await scanLocal(ctl);
      advertise(ctl);
      await replaceWatch(ctl);
      await planWants(ctl);
      pump(ctl);
      M.ui.sync(ctl);
      if (FM.timeline && FM.timeline.rebuild && ctl._paintSoon) { ctl._paintSoon = false; M.paint(ctl.S); }
    } catch (e) { C.lastError = e; }
    ctl.busy = false;
  }

  /* §15.9's replace half, and the undo of it. A `mediaRev` that went UP means somebody swapped the
     file: stash what is here as `prev:<id>` exactly as `FM.replaceMedia` does locally, then let the
     need check fetch the new one. A `mediaRev` that went DOWN is an undo, and the app already knows
     how to answer that — `FM.restoreReplacedMedia()` is the same call `history.restore` makes. */
  async function replaceWatch(ctl) {
    const v = ctl.S.adapter.view();
    const layers = (v && v.layers) || [];
    let undone = 0;
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i];
      if (!carriesMedia(L)) continue;
      const rev = L.mediaRev || 0;
      const was = ctl.revs[L.id];
      if (was === rev) continue;
      ctl.revs[L.id] = rev;
      if (was === undefined) continue;                       // first sight is not a change
      if (rev > was) {
        const cur = FM.media.get(L.id) || await FM.storage.readMedia(L.id);
        /* ⚠️ AND ONLY WHILE THE RECORD IS STILL THE OLD ONE (queue 921 S4, and it re-opens 829's loss).
           Nothing tells this watcher whether the rev went up because a PEER replaced the clip or
           because HE just did — it only sees the number move. On a local replace `FM.replaceMedia` has
           already stashed the outgoing file and already put the NEW record in the registry, so stashing
           again here writes the REPLACEMENT into `prev:<id>`. There is one slot per layer (storage.js),
           so that overwrites the only copy of his original, which is then unreferenced and reaped by
           the boot sweep — and Ctrl+Z, finding the stash at the rev it wants, "restores" the file he
           was undoing while reporting success. The record's own `rev` is the tell: it is level with the
           layer only after the local path has run. */
        if (cur && cur.file && (cur.rev || 0) !== rev && FM.storage.stashPrevMedia) {
          try { await FM.storage.stashPrevMedia(L.id, cur, was); } catch (e) {}
        }
      } else {
        undone++;
      }
    }
    if (undone && FM.restoreReplacedMedia) { try { await FM.restoreReplacedMedia(); } catch (e) {} }
  }

  /* Is this layer's picture already right here? */
  async function satisfied(lid, rev) {
    const m = FM.media.get(lid);
    if (m && m.file && (m.rev || 0) === rev) return true;
    const r = await FM.storage.readMedia(lid);
    return !!(r && r.file && (r.rev || 0) === rev);
  }

  /* §15.3's order: what is on screen now, then what is selected, then images (cheap and instantly
     visible), then video by start, then everything else. */
  function orderKey(ctl, e) {
    const v = ctl.S.adapter.view();
    const layers = (v && v.layers) || [];
    const sel = (ctl.S.adapter.selectedIds ? ctl.S.adapter.selectedIds() : []) || [];
    const t = (typeof FM.time === 'number') ? FM.time : 0;
    let best = 9, start = 1e9;
    for (let i = 0; i < e.layers.length; i++) {
      const lid = e.layers[i][0];
      const L = layers.filter(function (x) { return x.id === lid; })[0];
      if (!L) continue;
      start = Math.min(start, +L.start || 0);
      const visible = (+L.start || 0) <= t && t < (+L.start || 0) + (+L.duration || 0);
      let rank = 4;
      if (visible) rank = 0;
      else if (sel.indexOf(lid) >= 0) rank = 1;
      else if (L.type === 'image') rank = 2;
      else if (L.type === 'video') rank = 3;
      best = Math.min(best, rank);
    }
    if (e.kind === 'font') best = Math.min(best, 1);     // text with no face is text he cannot read
    return best * 1e9 + Math.max(0, Math.min(1e8, start * 1000));
  }

  /* What is needed, what can be copied from a file already here, and what has to be asked for. */
  async function planWants(ctl) {
    const v = ctl.S.adapter.view();
    const layers = (v && v.layers) || [];
    const byId = Object.create(null);
    layers.forEach(function (l) { if (l && l.id) byId[l.id] = l; });
    const fids = Object.keys(ctl.peer);
    const fresh = [];
    let want = 0;
    for (let i = 0; i < fids.length; i++) {
      const fid = fids[i], e = ctl.peer[fid];
      if (e.miss) continue;                                  // the far end has no bytes either
      if (ctl.bad[fid]) continue;                            // this device has stopped asking (see `tried`)
      if (ctl.inb[fid]) { want += e.size; continue; }
      if (e.kind === 'font') {
        if (e.size > LIM.FONT_MAX) { ctl.bad[fid] = 1; continue; }   // §15.9, for a stale entry that got past takeEntry
        if (ctl.have[fid] || fontHere(e)) { ctl.have[fid] = 1; continue; }
        if (!ctl.wanted[fid]) fresh.push({ fid: fid, e: e, key: orderKey(ctl, e) });
        want += e.size;
        continue;
      }
      /* Which of this entry's layers are in MY document and still without their picture. A layer id
         that is not in the open project is not mine to write — that is the promise at the top of this
         file, and it is what keeps a stale manifest from ever touching one of his own records. */
      const missing = [];
      for (let j = 0; j < e.layers.length; j++) {
        const lid = e.layers[j][0], rev = e.layers[j][1];
        const L = byId[lid];
        if (!L) continue;
        /* ⚠️ AND NOT A LAYER THAT HAS MOVED PAST THIS FILE. If he replaced that clip here, or imported
           one into a layer whose shared bytes had not landed yet, the layer is at a HIGHER `mediaRev`
           and the file this entry names is the OLD one — asking for it is asking to be handed the thing
           he just got rid of. `satisfied` cannot see this: it asks "is the rev the MANIFEST names here",
           and the answer for a layer that has moved on is honestly no. */
        if ((L.mediaRev || 0) > (rev || 0)) continue;
        /* ⚠️ …NOR ONE THE DOCUMENT HAS NOT REACHED (S7 review). A rev AHEAD of the layer names a file the
           document does not name at all, and writing it overwrites the layer's own record with bytes nobody
           put in the edit — a peer only has to add one to a layer's rev. When the op that raises the rev
           lands, this same sweep asks for it. */
        if ((rev || 0) !== (L.mediaRev || 0)) continue;
        if (await satisfied(lid, rev)) continue;
        missing.push([lid, rev]);
      }
      if (!missing.length) { ctl.have[fid] = 1; continue; }
      /* §15.2 rule 2 — THE ZERO-BYTE PATH. Another layer here already holds a completed file with the
         same fingerprint, so this is a split, a duplicate or a paste of a clip that is already on this
         device. Copy the record across; ask for nothing. */
      const local = ctl.byFp && ctl.byFp[e.fp];
      if (local && local.file) {
        for (let j = 0; j < missing.length; j++) await writeRecord(ctl, missing[j][0], missing[j][1], local.file, local.kind || e.kind);
        ctl.stats.localCopies += missing.length;
        ctl.have[fid] = 1;
        ctl.dirty = true;
        continue;
      }
      if (!ctl.wanted[fid]) fresh.push({ fid: fid, e: e, key: orderKey(ctl, e) });
      want += e.size;
    }
    /* ⚠️ "SKIP MEDIA" AND "THIS DEVICE IS FULL" HAVE TO STAY DECIDED (§15.4). `pump` refuses to move
       while `skip` is set and this half did not, so every fid `outOfRoom` dropped was un-`wanted` and
       therefore FRESH again on the very next 1.5 s sweep: the queue refilled, `pend` was never 0, and
       the one card that says the honest thing — "This device is full" — is behind `failed && !pend`
       and so could never be shown at all. What he saw instead, for the rest of the session, was
       "Receiving media · 3 of 17 · 41%" with a bar frozen forever. The local-copy pass above still
       runs, because a file already on this device costs no room. */
    if (ctl.skip) { ctl.bytesWant = ctl.bytesGot + want; return; }
    if (!fresh.length) { ctl.bytesWant = ctl.bytesGot + want; return; }

    fresh.sort(function (a, b) { return a.key - b.key; });
    /* §15.4's checks, before the FIRST want of the session and never again — a card per file is a card
       he stops reading. */
    if (!ctl.asked) {
      ctl.asked = true;
      const total = fresh.reduce(function (a, x) { return a + x.e.size; }, 0);
      const biggest = fresh.reduce(function (a, x) { return Math.max(a, x.e.size); }, 0);
      const ok = await roomCheck(ctl, total, biggest);
      if (!ok) return;
    }
    for (let i = 0; i < fresh.length; i++) {
      const f = fresh[i];
      /* "Get what fits" is a BUDGET, and it is spent here rather than at write time: refusing a file
         before a byte of it moves is the difference between "I only took what fits" and "I filled the
         device and then failed" (§15.4). */
      /* `capped`, not `cap > 0`: a budget spent to exactly zero is still a budget, and testing the
         NUMBER lifted it silently at the one moment it mattered — the rest of the manifest then queued
         unbudgeted, which is the inverse of §15.4's promise. And a file that does not fit is MARKED, or
         the next sweep counts it again: `failed` climbed by one per file per 1.5 s and the card's
         "N clips could not be saved here" was a number that grew forever. */
      if (ctl.capped) {
        if (f.e.size > ctl.cap) { ctl.bad[f.fid] = 1; ctl.failed++; continue; }
        ctl.cap -= f.e.size;
      }
      ctl.wanted[f.fid] = 1;
      ctl.queue.push(f.fid);
      ctl.files++;
      ctl.bytesWant += f.e.size;
    }
  }

  function fontHere(e) {
    try {
      const list = (FM.fonts && FM.fonts.list) ? (FM.fonts.list() || []) : [];
      for (let i = 0; i < list.length; i++) if (list[i] && list[i].family === e.family) return true;
    } catch (x) {}
    return false;
  }

  /* ═══ §15.4 — IS THERE ROOM, AND DOES HE WANT THIS MUCH ═══════════════════════════════════════ */
  async function roomCheck(ctl, total, biggest) {
    let free = null;
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const q = await navigator.storage.estimate();
        if (q && typeof q.quota === 'number') free = Math.max(0, q.quota - (q.usage || 0));
      }
    } catch (e) { free = null; }
    if (M._freeOverride != null) free = M._freeOverride;      // suite seam: a full device on demand
    const need = total + biggest;
    if (free != null && need > free) {
      /* The honest card. It says the two numbers, and it offers the two answers that are actually
         available — take what fits, or take none of it. It never says "free up space and try again",
         because nothing here retries. */
      const yes = await ask({
        title: 'Not enough space for the shared media',
        message: 'This project needs about ' + mb(need) + ' and this device has ' + mb(free) + ' free. '
          + 'Taking what fits keeps the rest of the project working — the clips that do not fit stay on the other device.',
        ok: 'Get what fits', cancel: 'Skip media'
      });
      if (!yes) { ctl.skip = true; M.ui.sync(ctl); return false; }
      /* The budget leaves the largest file's worth of headroom, because a part file and the finished
         file are both on disk for the moment between the last part landing and the parts being
         deleted (§15.6). Filling to the brim is how a device with room for the file runs out during
         the write. */
      ctl.capped = true;
      ctl.cap = Math.max(0, free - biggest);
      M.ui.sync(ctl);
      return true;
    }
    if (total > LIM.ASK_ABOVE) {
      const yes = await ask({
        title: 'Download ' + mb(total) + ' of media?',
        message: 'The shared project has ' + mb(total) + ' of clips. They will download in the background — you can start editing now either way.',
        ok: 'Download', cancel: 'Not now'
      });
      if (!yes) { ctl.skip = true; M.ui.sync(ctl); return false; }
    }
    return true;
  }

  function ask(opts) {
    /* ⚠️ `!= null`, NOT a truth test. The seam stands in for a TAP, and one of the two taps every card
       here offers is "no" — a truthiness check swallows exactly that answer and falls through to the
       real dialog, which in a suite never resolves. Found by the [Skip media] control (queue 921 S4). */
    if (M._answer != null) { const a = M._answer; M._answer = null; return Promise.resolve(a); }   // suite seam
    if (!FM.ask) return Promise.resolve(true);
    return FM.ask(opts).then(function (v) { return !!v; }, function () { return false; });
  }

  /* ═══ THE PUMP ════════════════════════════════════════════════════════════════════════════════ */
  function pump(ctl) {
    if (ctl.skip) return;
    while (ctl.queue.length && Object.keys(ctl.inb).length < LIM.IN_FLIGHT) {
      const fid = ctl.queue.shift();
      const e = ctl.peer[fid];
      if (!e || ctl.have[fid]) { delete ctl.wanted[fid]; continue; }
      startWant(ctl, e);
    }
  }

  async function startWant(ctl, e) {
    const S = ctl.S;
    const to = S.isOwner ? e.from : 'h';
    /* §15.7 — RESUME. Whatever parts of this file already landed, in this room, are counted before a
       byte is asked for: `want{fid, from}`. The parts survive a reload, a rejoin and a new epoch,
       because they are keyed by the fingerprint and not by the connection. */
    let from = 0, haveParts = 0;
    try {
      const keys = await FM.storage.collabKeys(partPrefix(ctl, e.fp));
      haveParts = countParts(keys);
      /* ⚠️ THE RESUME POINT IS THE SUM OF WHAT IS ACTUALLY STORED, never `count × 4 MiB` (queue 921
         S4). The arithmetic version is right only while every part is exactly full, and one short
         part — the last one of an earlier attempt that DID finish its final flush, or a part written
         by a build with a different grain — makes it ask the sender to skip bytes that were never
         written. The file is then the right LENGTH and wrong from that offset on, which decodes to
         nothing and looks like a corrupt download. Reading the sizes costs one IndexedDB read per
         4 MiB and cannot be wrong. */
      for (let i = 0; i < haveParts; i++) {
        const rec = await FM.storage.collabGet(partPrefix(ctl, e.fp) + i);
        const n = rec && rec.blob ? rec.blob.size : 0;
        if (!n) { haveParts = i; break; }
        from += n;
      }
      if (from > e.size) { from = 0; haveParts = 0; }   // a stale or over-long set is not a resume point
    } catch (x) { from = 0; haveParts = 0; }
    if (from > 0) ctl.stats.resumed++;
    const inb = { fid: e.fid, e: e, from: from, got: from, buf: [], bufLen: 0, part: haveParts, xid: null, upto: from };
    ctl.inb[e.fid] = inb;
    ctl.stats.wants++;
    S.sendMsg(to, { t: 'want', fid: e.fid, from: from });
    M.ui.sync(ctl);
  }

  function partPrefix(ctl, fp) { return 'collab:part:' + ctl.sid + ':' + hashOf(fp) + ':'; }
  function countParts(keys) {
    /* Contiguous from zero, and no further: part 0,1,3 is two parts of resume and a hole, and a hole
       silently stitched is a corrupt file that decodes to garbage. */
    const have = Object.create(null);
    (keys || []).forEach(function (k) { const n = +String(k).split(':').pop(); if (n >= 0) have[n] = 1; });
    let n = 0;
    while (have[n]) n++;
    return n;
  }

  /* ═══ SERVING (§15.5) ═════════════════════════════════════════════════════════════════════════ */
  async function serve(ctl, toMid, fid, from) {
    const S = ctl.S;
    const e = ctl.mine[fid];
    if (!e || !e._file) { S.sendMsg(toMid, { t: 'mf', files: [{ fid: fid, fp: fid, size: 0, kind: 'video', name: '', lm: 0, layers: [], miss: 1 }], fonts: [] }); return; }
    const file = e._file;
    const start = (from >= 0 && from < file.size) ? from : 0;
    /* ⚠️ ONE `want` IS ONE MESSAGE, AND A MESSAGE COSTS A PEER NOTHING (§14.9). The RECEIVING side is
       capped at two files at once; this side had no cap and no de-dupe, so ten thousand copies of one
       `want` opened ten thousand independent read-and-send loops over the same file, each with its own
       25 ms timer and its own `File.slice().arrayBuffer()`, on the device that is also rendering — and
       each of them passes the buffered-amount brake while the others are still awaiting their read, so
       they all push at once. A second ask for the same file SUPERSEDES the job already running rather
       than being ignored: ignoring it is the shape that stalls, because a receiver that aborted
       mid-stream (a bad offset, a sender over its own declared size) re-asks from the same place and
       would then wait forever for a T_START that never comes. Only one job per peer per file lives, and
       a peer gets at most as many concurrent jobs as it is ever entitled to ask for. */
    const xids = Object.keys(ctl.out);
    let live = 0;
    for (let i = 0; i < xids.length; i++) {
      const j = ctl.out[xids[i]];
      if (!j || j.to !== toMid || j.stop) continue;
      if (j.fid === fid) { j.stop = true; continue; }        // one job per (peer, file): the newest ask wins
      live++;
    }
    if (live >= LIM.IN_FLIGHT) return;                      // an honest peer never asks for more at once
    const xid = ctl.nextXid++;
    const job = { xid: xid, to: toMid, fid: fid, from: start, off: start, size: file.size, upto: start, stop: false };
    ctl.out[xid] = job;
    const ep = S.endpoint(toMid);
    const head = enc ? enc.encode(JSON.stringify({ fid: fid, from: start, size: file.size, kind: e.kind === 'font' ? 'font' : 'media' })) : null;
    if (!S.sendBulk(toMid, frame(T_START, xid, 0, head))) { delete ctl.out[xid]; return; }
    let seq = 1;
    while (job.off < file.size && !job.stop) {
      /* §15.5's two brakes, and they are different brakes. `bufferedAmount` is the BROWSER's queue —
         ignoring it buffers the whole file in the tab's heap, which on a phone is the tab. `upto` is
         the RECEIVER's — it is acknowledged only once a part is persisted, so IndexedDB's speed, not
         the network's, is what bounds the memory on the far end. */
      if (ep && ep.bufferedAmount && ep.bufferedAmount('bulk') > LIM.BUFFER_HIGH) { await sleep(25); continue; }
      if (job.off - job.upto > LIM.WINDOW) { await sleep(25); continue; }
      const end = Math.min(job.off + LIM.CHUNK, file.size);
      let bytes;
      try { bytes = new Uint8Array(await file.slice(job.off, end).arrayBuffer()); }
      catch (x) { break; }
      if (job.stop) break;
      if (!S.sendBulk(toMid, frame(T_DATA, xid, seq++, bytes))) break;   // the link went; the receiver resumes
      job.off = end;
      ctl.stats.sentBytes += bytes.length;
    }
    delete ctl.out[xid];
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ═══ RECEIVING BYTES (§15.6) ═════════════════════════════════════════════════════════════════ */
  async function onBulkFrame(ctl, fromMid, buf) {
    const f = unframe(buf);
    if (!f) return;
    if (f.type === T_START) {
      let h = null;
      try { h = JSON.parse(dec ? dec.decode(f.body) : ''); } catch (x) { return; }
      if (!h || typeof h.fid !== 'string') return;
      const inb = ctl.inb[h.fid];
      if (!inb) return;                                  // nothing here asked for it
      /* ⚠️ AND IT HAS TO BE THE PEER WE ASKED. `xid` is the SENDER's counter and every controller starts
         its own at 1 (`nextXid`), so two guests uploading at once both open with xid 1. Keyed by the
         number alone, the second T_START silently took over the first one's transfer: every frame of
         A's file was appended to B's parts and persisted there, B failed its length check and paid for
         a full re-download, and A's slot was never freed — one of the two in-flight slots gone for the
         session, with §15.8's export card asking about a clip that would never arrive. */
      const src = ctl.S.isOwner ? (inb.e.from || null) : 'h';
      if (src && fromMid && fromMid !== src) return;
      const sentFrom = (+h.from >= 0) ? +h.from : 0;
      /* ⚠️ THE SENDER DECIDES WHERE IT STARTS, AND IT MAY NOT BE WHERE WE ASKED (§14.9 — it is a peer,
         not a promise). If it starts from zero we simply throw our parts away and take the whole file;
         if it starts anywhere ELSE than the offset we hold, there is no arithmetic that can stitch the
         two together, so the transfer is abandoned rather than completed into a corrupt file. */
      if (sentFrom !== inb.from) {
        if (sentFrom !== 0) { abort(ctl, h.fid, 'offset'); dropParts(ctl, h.fid); tried(ctl, h.fid); ctl.dirty = true; return; }
        /* ⚠️ THE DROP HAS TO FINISH BEFORE THE NEW PART 0 IS WRITTEN (queue 921 S4). `dropParts` LISTS
           the keys and only then issues the deletes, so fired and forgotten it races the part this very
           transfer is about to flush — and the delete of the OLD part 0 removes the NEW one. `complete`
           then finds a hole and throws the whole file away, which costs a silent re-download of the lot.
           It cannot simply be awaited here: `onBulk` is the link's own dispatch and the frames that
           arrive during the await would be dropped. Putting it on the chain the part writes already
           queue behind orders the two without holding up a single frame — which is what the one caller
           that gets this right (`applyFile`) does by awaiting. */
        inb.chain = (inb.chain || Promise.resolve()).then(function () { return dropParts(ctl, h.fid); }).catch(function () {});
        inb.part = 0;
      }
      const key = xkeyOf(fromMid, f.xid);
      ctl.byXid = ctl.byXid || Object.create(null);
      if (inb.xkey && inb.xkey !== key) delete ctl.byXid[inb.xkey];   // a superseded start must not still resolve
      inb.xid = f.xid;
      inb.xkey = key;
      inb.from = sentFrom;
      inb.got = inb.from;
      inb.upto = inb.from;
      inb.buf = []; inb.bufLen = 0;
      ctl.byXid[key] = h.fid;
      return;
    }
    if (f.type !== T_DATA) return;
    const fid = ctl.byXid && ctl.byXid[xkeyOf(fromMid, f.xid)];
    const inb = fid && ctl.inb[fid];
    if (!inb) return;
    /* The declared size EXACTLY, not a part's grace beyond it: a sender that overruns its own manifest
       is a sender whose manifest is wrong, and the grace only bought the right to assemble a file that
       then fails the length check anyway — at the cost of up to 4 MiB written to his disk first. */
    if (inb.got + f.body.length > inb.e.size) { abort(ctl, fid, 'oversize'); tried(ctl, fid); ctl.dirty = true; return; }
    inb.buf.push(f.body.slice());                        // the frame's buffer is the link's; keep our own
    inb.bufLen += f.body.length;
    inb.got += f.body.length;
    ctl.bytesGot += f.body.length;
    ctl.stats.gotBytes += f.body.length;
    if (inb.bufLen >= LIM.PART || inb.got >= inb.e.size) await flushPart(ctl, inb, inb.got >= inb.e.size);
    ctl._paintSoon = true;
    /* Once per 100 ms, not once per 64 KiB frame: a 100 MB file is 1600 frames and three DOM writes
       each, which is 1600 layout passes on the device least able to afford them. Every state CHANGE
       still syncs — a part landing, a file applying, the sweep — so nothing is missed, only repeated. */
    const now = Date.now();
    if (now - (ctl._uiAt || 0) >= 100) { ctl._uiAt = now; M.ui.sync(ctl); }
  }
  function xkeyOf(mid, xid) { return (mid == null ? '?' : String(mid)) + '\u0000' + (xid >>> 0); }

  /* ⚠️ THE PART NUMBER IS TAKEN SYNCHRONOUSLY AND THE WRITES ARE CHAINED (queue 921 S4). `onBulk` is
     called from the link's own dispatch and is not awaited, so a second frame can arrive while the
     first part is still being written: two flushes would then read the same `inb.part`, write the
     SAME key twice, and the file would be reassembled with a hole and 4 MiB of the wrong bytes — a
     corruption with no error anywhere, because every write "succeeded". The number is claimed before
     the first await and the writes are queued behind each other, so the parts land in order. */
  function flushPart(ctl, inb, last) {
    const n = inb.part++;
    const blob = new Blob(inb.buf, inb.e.mime ? { type: inb.e.mime } : undefined);
    inb.buf = []; inb.bufLen = 0;
    const upto = inb.got;
    const job = (inb.chain || Promise.resolve()).then(async function () {
      if (inb.dead) return;
      /* §15.6 — the part is held under `FM._mediaBusy`, which is what stops `pruneOrphans` and
         `releaseUnreachableMedia` running over a half-arrived file. (`pruneOrphans` also skips every
         `collab:` key outright, S0 — this is the second lock, on the same door, for the window in
         which the sweep has already collected its candidate list.) */
      FM._mediaBusy = (FM._mediaBusy || 0) + 1;
      let ok = false;
      try {
        ok = await FM.storage.collabPut(partPrefix(ctl, inb.e.fp) + n, { v: 1, sid: ctl.sid, fp: inb.e.fp, n: n, at: Date.now(), blob: blob });
      } catch (e) { ok = false; }
      FM._mediaBusy = Math.max(0, (FM._mediaBusy || 1) - 1);
      if (!ok) { outOfRoom(ctl, inb.fid); return; }
      inb.upto = Math.max(inb.upto, upto);
      ctl.S.sendMsg(ctl.S.isOwner ? inb.e.from : 'h', { t: 'ok', xid: inb.xid, upto: inb.upto });
      if (last) await complete(ctl, inb);
    });
    inb.chain = job.catch(function (e) { C.lastError = e; });
    return inb.chain;
  }

  /* ⚠️ "AND NOTHING WRITTEN BEYOND WHAT FITS" (§15.4, §22). A refused write is the end of this file
     AND the end of the queue: carrying on would fill the device with parts of things that can never
     be finished, and every one of them would then have to be collected. What already landed stays —
     the clips that DID fit are the whole point of "Get what fits". */
  function outOfRoom(ctl, fid) {
    ctl.failed++;
    ctl.full = true;
    ctl.skip = true;
    abort(ctl, fid, 'full');
    const q = ctl.queue.splice(0, ctl.queue.length);
    q.forEach(function (f) { delete ctl.wanted[f]; ctl.failed++; });
    dropParts(ctl, fid);
    M.ui.sync(ctl);
  }

  /* ⚠️ THE CLEANUP COMES BEFORE THE EARLY EXIT (queue 921 S4). `complete` deletes the inb on its FIRST
     line and then has three ways to fail afterwards — a part gone from disk, a read that throws, a
     write the device refused — and every one of them calls this. With the guard first, all three were
     no-ops: `wanted` stayed set, and `planWants` re-queues only what is NOT wanted, so the clip was
     never asked for again for the life of the session. Nothing said so either: `pending()` counts the
     queue, the in-flight and the held, and it was in none of them, so the export card stayed quiet
     while the timeline painted that clip at 0% forever. */
  function abort(ctl, fid, why) {
    const inb = ctl.inb[fid];
    delete ctl.wanted[fid];
    if (inb) {
      inb.dead = true;                     // a queued part write must not land after the abort
      delete ctl.inb[fid];
      if (ctl.byXid && inb.xkey) delete ctl.byXid[inb.xkey];
    }
    ctl.lastAbort = why || 'abort';
  }

  /* ⚠️ AND A FILE THAT ARRIVES BROKEN MUST NOT LOOP (queue 921 S4). A completed transfer whose bytes do
     not add up to the declared size drops its parts and clears `wanted` — right, it should be tried
     again — but nothing counted the tries, so a peer whose declared size is simply wrong had this
     device download the same file every 1.5 s for the rest of the session, on mobile data, with the
     card's file count and skipped count climbing without bound. Two goes; then it is named as skipped
     and left alone, which is the honest thing the card already has words for. */
  function tried(ctl, fid) {
    const t = (ctl.tries[fid] || 0) + 1;
    ctl.tries[fid] = t;
    if (t >= LIM.TRIES) { ctl.bad[fid] = 1; ctl.failed++; M.ui.sync(ctl); }
    return t;
  }

  function dropParts(ctl, fid) {
    const e = ctl.peer[fid];
    if (!e) return Promise.resolve();
    return FM.storage.collabKeys(partPrefix(ctl, e.fp)).then(function (keys) {
      return Promise.all((keys || []).map(function (k) { return FM.storage.collabDel(k); }));
    }).catch(function () {});
  }

  /* ═══ COMPLETION (§15.6 step 2 onward) ════════════════════════════════════════════════════════ */
  async function complete(ctl, inb) {
    const e = inb.e;
    delete ctl.inb[e.fid];
    if (ctl.byXid && inb.xkey) delete ctl.byXid[inb.xkey];
    let parts = [];
    try {
      /* The parts THIS transfer wrote, counted rather than re-derived from what is on disk: an
         abandoned longer transfer of the same file would leave keys past the end, and stitching those
         on is a file that is the right size nowhere and decodes to nothing. */
      const n = inb.part;
      for (let i = 0; i < n; i++) {
        const rec = await FM.storage.collabGet(partPrefix(ctl, e.fp) + i);
        if (!rec || !rec.blob) { abort(ctl, e.fid, 'gap'); tried(ctl, e.fid); ctl.dirty = true; return; }
        parts.push(rec.blob);
      }
    } catch (x) { abort(ctl, e.fid, 'read'); tried(ctl, e.fid); ctl.dirty = true; return; }
    const file = new File(parts, e.name || 'media', { type: e.mime || '', lastModified: e.lm || 0 });
    if (file.size !== e.size) { await dropParts(ctl, e.fid); delete ctl.wanted[e.fid]; tried(ctl, e.fid); ctl.dirty = true; return; }
    /* ⚠️ HELD BEHIND THE §8.9 BARRIER, and this is a decision worth naming (queue 921 S4). An export
       renders from FM.scene and FM.media; a job (a paste, a split) is halfway through rebuilding both.
       Dropping a new <video> element and a new record into either of them mid-flight changes the frame
       under the renderer, which is the exact failure §8.9 exists to stop. The BYTES keep flowing — the
       parts are inert records under `collab:` and cost nothing to anyone — and only the APPLY waits.
       That also makes §15.8's "Export anyway" honest: an export that starts without a clip finishes
       without it, rather than half with it. */
    ctl.held.push({ e: e, file: file });
    ctl.dirty = true;
    await applyHeld(ctl);
  }

  async function applyHeld(ctl) {
    if (!ctl.held.length) return;
    const A = ctl.S.adapter;
    if ((A.frozen && A.frozen()) || (A.busy && A.busy())) return;
    const jobs = ctl.held.splice(0, ctl.held.length);
    for (let i = 0; i < jobs.length; i++) await applyFile(ctl, jobs[i].e, jobs[i].file);
  }

  async function applyFile(ctl, e, file) {
    if (e.kind === 'font') {
      let ok = false;
      try {
        if (FM.fonts && FM.fonts.applyEmbedded) {
          const durl = await new Promise(function (res) { const r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = function () { res(null); }; r.readAsDataURL(file); });
          if (durl) { await FM.fonts.applyEmbedded({ x: { name: e.name, family: e.family, css: e.css, dataURL: durl } }); ok = true; }
        }
      } catch (x) { ok = false; }
      ctl.have[e.fid] = 1;
      delete ctl.wanted[e.fid];
      ctl.filesDone++;
      await dropParts(ctl, e.fid);
      ctl.S.sendMsg(ctl.S.isOwner ? e.from : 'h', { t: 'have', fid: e.fid });
      if (ok && FM.requestRender) FM.requestRender();
      M.ui.sync(ctl);
      return ok;
    }
    const v = ctl.S.adapter.view();
    const byId = Object.create(null);
    ((v && v.layers) || []).forEach(function (l) { if (l && l.id) byId[l.id] = l; });
    let wrote = 0;
    for (let i = 0; i < e.layers.length; i++) {
      const lid = e.layers[i][0], rev = e.layers[i][1];
      if (!byId[lid]) continue;                                   // not a layer of the open document
      /* ⚠️ AND NOT OVER A PICTURE THAT IS ALREADY AHEAD OF THIS FILE (queue 921 S4). The want was
         planned when the transfer STARTED, and on a 400 MB clip over a phone that is minutes ago: if he
         replaced that clip in the meantime, or imported one into a layer whose shared bytes had not
         landed yet, the layer has moved to a higher `mediaRev` and this arriving file is the old one.
         `writeMedia` is an unconditional overwrite on the layer's own key, so it would destroy the clip
         he just chose — and in the import case there is nothing in `prev:` to undo it with, because
         there was nothing to replace. `planWants` makes exactly this check with `satisfied()`; it makes
         it at WANT time, and the gap between want and apply is the whole download. */
      if ((byId[lid].mediaRev || 0) > (rev || 0)) continue;
      if ((rev || 0) !== (byId[lid].mediaRev || 0)) continue;     // …or one it no longer (or never) names (S7 review)
      const ok = await writeRecord(ctl, lid, rev, file, e.kind);
      if (!ok) { outOfRoom(ctl, e.fid); return false; }
      wrote++;
    }
    ctl.have[e.fid] = 1;
    delete ctl.wanted[e.fid];
    ctl.filesDone++;
    await dropParts(ctl, e.fid);
    ctl.S.sendMsg(ctl.S.isOwner ? e.from : 'h', { t: 'have', fid: e.fid });
    /* The host now HOLDS this file, so the next advertise tells every other peer about it — which is
       how a guest's clip reaches a third device without either guest knowing the other exists. And it
       has to reach the host's own project document, or the next boot reads a layer with no record. */
    if (ctl.S.isOwner && FM.storage && FM.storage.save) { try { FM.storage.save(); } catch (x) {} }
    ctl.dirty = true;                 // the next file in the queue starts now, not at the next sweep
    if (wrote) {
      if (FM.requestRender) FM.requestRender();
      /* Rebuild FIRST. It replaces every `.clip` element, so painting before it threw the markers away
         in the same turn they were drawn. The `onRebuilt` subscription in `M.install` covers every
         rebuild something ELSE starts; this order covers the one this file starts itself. */
      if (FM.timeline && FM.timeline.rebuild) { try { FM.timeline.rebuild(); } catch (x) {} }
      M.paint(ctl.S);
    }
    M.ui.sync(ctl);
    return true;
  }

  /* The one writer. Record first, then the decoded element — in that order, because a record on disk
     with no element is a clip that appears at the next boot, and an element with no record is a clip
     that disappears at the next boot. */
  async function writeRecord(ctl, lid, rev, file, kind) {
    FM._mediaBusy = (FM._mediaBusy || 0) + 1;
    let ok = false;
    try { ok = await FM.storage.writeMedia(lid, { file: file, kind: kind, rev: rev || 0 }); }
    catch (x) { ok = false; }
    FM._mediaBusy = Math.max(0, (FM._mediaBusy || 1) - 1);
    if (!ok) return false;
    ctl.stats.writes++;
    let rec = null;
    try { rec = (kind === 'image') ? await FM.loadImageFile(file) : await FM.loadVideoFile(file); }
    catch (x) { rec = null; }
    if (rec) {
      rec.rev = rev || 0;
      rec.file = rec.file || file;
      FM.media.set(lid, rec);
      if (rec.kind === 'video' && rec.el && FM.wireVideoRepaint) { try { FM.wireVideoRepaint(rec); } catch (x) {} }
    }
    return true;
  }

  /* ═══ MESSAGES ════════════════════════════════════════════════════════════════════════════════ */
  M.onCtl = function (S, fromMid, msg) {
    const ctl = ctlOf(S);
    if (!ctl || !msg) return false;
    switch (msg.t) {
      case 'mf':
      case 'ann':
        onManifest(ctl, fromMid || (S.isOwner ? null : 'h'), msg);
        kick(ctl);
        return true;
      case 'want': {
        if (typeof msg.fid !== 'string') return true;
        serve(ctl, fromMid || 'h', msg.fid.slice(0, 64), Math.max(0, +msg.from || 0));
        return true;
      }
      case 'ok': {
        const job = ctl.out[+msg.xid];
        if (job) job.upto = Math.max(job.upto, +msg.upto || 0);
        return true;
      }
      case 'have':
        return true;                                   // §20 names it; the sender needs nothing from it
      default:
        return false;
    }
  };

  M.onBulk = function (S, fromMid, buf) {
    const ctl = ctlOf(S);
    if (!ctl) return false;
    onBulkFrame(ctl, fromMid, buf);
    return true;
  };

  let kickTimer = null;
  function kick(ctl) {
    ctl.dirty = true;
    if (kickTimer) return;
    kickTimer = setTimeout(function () { kickTimer = null; if (ctl.S && ctl.S.active) reconcile(ctl); }, 0);
  }

  /* ⚠️ THE SWEEP IS NOT AT THE TICK RATE, AND THAT IS THE POINT. The tick is 100 ms on a PC and 125 ms
     on a phone, and a full reconcile costs one IndexedDB read per layer that has no resident record —
     on a big project with media still arriving that is a read storm at 10 Hz, on the device least able
     to afford it. Anything that CHANGES something sets `dirty` and is answered on the very next tick
     (a manifest, a completed file, a message); the periodic sweep is only there to notice what nothing
     announced — a layer added locally, a clip replaced, a peer that arrived between messages. */
  M.tick = function (S) {
    const ctl = ctlOf(S);
    if (!ctl) return 0;
    /* A file waiting behind the §8.9 barrier has to land the moment the barrier lifts, and asking is
       two property reads — so that half is not throttled. */
    if (ctl.held.length) applyHeld(ctl);
    const t = Date.now();
    if (!ctl.dirty && (t - (ctl.lastSweep || 0)) < LIM.SWEEP) return 0;
    ctl.lastSweep = t;
    reconcile(ctl);
    return 1;
  };

  /* ═══ §15.8 — EXPORTING WITH MEDIA STILL ARRIVING ═════════════════════════════════════════════ */
  M.exportGate = function () {
    const S = C.session;
    if (!S || !C.active) return Promise.resolve(true);
    /* The role half first: a refusal is not a question, and asking "wait or export anyway" of someone
       who may not export at all would be offering a door that is locked. */
    const room = (S.settings || {});
    if (!S.isOwner && (S.role === 'viewer' || S.role === 'commenter') && room.roExport === false) {
      return ask({ title: 'Exporting is off for viewers', message: 'The owner has turned off exporting for viewers and commenters in this project.', ok: 'OK', cancel: 'Close' })
        .then(function () { return false; });
    }
    const p = M.pending(S);
    if (!p.n) return Promise.resolve(true);
    return ask({
      title: p.n === 1 ? '1 clip is still arriving (' + p.pct + '%)' : p.n + ' clips are still arriving (' + p.pct + '%)',
      message: 'Exporting now leaves those clips out of the video. They are still downloading in the background.',
      ok: 'Export anyway', cancel: 'Wait'
    });
  };

  /* ═══ §15.10 — THE TIMELINE'S PROGRESS BAR ════════════════════════════════════════════════════
   * The canvas checkerboard is NOT in S4, deliberately: it wants `boxFor` plus an overlay layer over
   * the canvas, which is the surface S5 builds for presence — a second one shipped now would be torn
   * out a stage later. A clip he can see filling up is the half that tells him the wait is working,
   * and the timeline already rebuilds on a hook this can paint from. */
  M.paint = function (S) {
    const ctl = ctlOf(S || C.session);
    const tracks = document.getElementById('tl-tracks');
    if (!tracks) return 0;
    const missing = ctl ? M.missingLayers(S || C.session) : Object.create(null);
    let n = 0;
    const clips = tracks.querySelectorAll('.clip');
    for (let i = 0; i < clips.length; i++) {
      const el = clips[i];
      const id = el.getAttribute('data-id');
      const pct = (id && missing[id] !== undefined) ? missing[id] : null;
      let bar = el.querySelector('.cm-prog');
      if (pct === null) {
        el.classList.remove('cm-missing');
        if (bar) bar.remove();
        continue;
      }
      el.classList.add('cm-missing');
      if (!bar) { bar = document.createElement('div'); bar.className = 'cm-prog'; el.appendChild(bar); }
      bar.style.width = Math.max(2, pct) + '%';
      n++;
    }
    return n;
  };

  /* ═══ THE PROGRESS CARD ═══════════════════════════════════════════════════════════════════════
   * 📐 DECIDED: ONE new surface, not three. §15.4's storage question and §15.8's export question are
   * two-answer questions, and the app already has a card family for those — `FM.ask`, which is
   * responsive at 380 px, carries the light/dark decision, traps Escape and has been proved by the
   * suite since #919. A second lookalike would be a second thing to keep in step. What the app has NO
   * shape for is a thing that is not a question: a quiet, non-modal line that says how far the
   * download has got and, when it fails, says so honestly instead of leaving blank clips. That is this
   * card, and it is the only visual S4 adds. */
  const UI = {};
  let cardEl = null, barEl = null, textEl = null, subEl = null;

  UI.el = function () { return cardEl; };
  UI.hide = function () {
    if (cardEl && cardEl.parentNode) cardEl.parentNode.removeChild(cardEl);
    cardEl = null; barEl = null; textEl = null; subEl = null;
  };
  /* What the card is SAYING, so a dismissal can be remembered against it rather than against a moment. */
  function sigOf(ctl) { return ctl.failed ? ('f' + ctl.failed + (ctl.full ? '!' : '')) : 'ok'; }
  UI.sync = function (ctl) {
    if (!ctl) return UI.hide();
    UI._ctl = ctl;
    const pend = ctl.queue.length + Object.keys(ctl.inb).length + ctl.held.length;
    const failed = ctl.failed;
    if (!pend && !failed) { ctl.cardHidden = null; return UI.hide(); }
    /* ⚠️ AND THE × HAS TO MEAN SOMETHING. `sync` runs at the tail of every data frame and on every
       1.5 s sweep, and `hide` only took the card out of the DOM — so it was back within milliseconds
       and the button was dead for the whole download, and dead forever once a failure had happened.
       On a 380 px phone that card sits across the bottom of the preview, so this is not a cosmetic
       complaint. Dismissal is remembered against WHAT it was saying, which holds for this download
       and still lets a failure he has not been told about through. */
    if (ctl.cardHidden === sigOf(ctl)) return UI.hide();
    ctl.cardHidden = null;
    if (!cardEl) {
      cardEl = document.createElement('div');
      cardEl.id = 'collab-media';
      cardEl.className = 'collab-media';
      cardEl.setAttribute('role', 'status');
      textEl = document.createElement('div'); textEl.className = 'cm-title';
      subEl = document.createElement('div'); subEl.className = 'cm-sub';
      const track = document.createElement('div'); track.className = 'cm-track';
      barEl = document.createElement('div'); barEl.className = 'cm-bar';
      track.appendChild(barEl);
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'cm-close'; x.textContent = '×';
      x.setAttribute('aria-label', 'Hide');
      x.addEventListener('click', function () { const c = UI._ctl; if (c) c.cardHidden = sigOf(c); UI.hide(); });
      cardEl.appendChild(textEl); cardEl.appendChild(subEl); cardEl.appendChild(track); cardEl.appendChild(x);
      (document.getElementById('stage') || document.body).appendChild(cardEl);
    }
    const pct = ctl.bytesWant ? Math.min(100, Math.round(ctl.bytesGot / ctl.bytesWant * 100)) : 0;
    if (failed && !pend) {
      cardEl.classList.add('warn');
      textEl.textContent = ctl.full ? 'This device is full' : 'Some media was skipped';
      subEl.textContent = failed === 1 ? '1 clip could not be saved here — it stays on the other device.'
        : failed + ' clips could not be saved here — they stay on the other device.';
      barEl.style.width = '100%';
      return cardEl;
    }
    cardEl.classList.toggle('warn', !!failed);
    textEl.textContent = 'Receiving media';
    subEl.textContent = (ctl.filesDone + ' of ' + ctl.files + ' · ' + pct + '%')
      + (failed ? ' · ' + failed + ' skipped' : '');
    barEl.style.width = Math.max(2, pct) + '%';
    return cardEl;
  };
  M.ui = UI;

  /* ═══ §12.4's COLLECTOR, for the keys THIS stage creates ══════════════════════════════════════
   * Parts only, and never at boot: §23's bargain is that nothing collab runs at load, and a sweep of
   * IndexedDB is the one thing in §12.4's table that would break it. It runs when a session ENDS,
   * which is the moment a part that is still there is known to be abandoned. A part younger than a
   * week, in a room that still exists, is somebody's resume point (§15.7) and is left alone.
   *
   * ⚠️ AND IT NEVER TOUCHES A PART THAT IS ARRIVING. `pruneOrphans` already skips every `collab:` key
   * (S0), which is the rule that keeps a half-transferred file safe from the boot sweep; this is the
   * same promise on the one collector that CAN delete these keys. */
  M.gcParts = async function (opts) {
    const o = opts || {};
    const now = o.now || Date.now();
    const live = Object.create(null);
    const ctl = o.ctl || ctlOf(C.session);
    if (ctl) Object.keys(ctl.inb).forEach(function (fid) { live[partPrefix(ctl, ctl.inb[fid].e.fp)] = 1; });
    let keys = [];
    try { keys = await FM.storage.collabKeys('collab:part:'); } catch (e) { return 0; }
    let n = 0;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const pre = k.slice(0, k.lastIndexOf(':') + 1);
      if (live[pre]) continue;                                  // arriving right now
      const rec = await FM.storage.collabGet(k);
      const at = (rec && rec.at) || 0;
      const mine = o.sid ? (rec && rec.sid === o.sid) : false;
      if (!mine && at && (now - at) < LIM.PART_TTL) continue;   // another room's, and still fresh
      if (mine && (now - at) < LIM.PART_TTL && !o.force) continue;
      await FM.storage.collabDel(k);
      n++;
    }
    return n;
  };

  /* Suite seams. Everything here is a READ of the real state or a stand-in for a browser answer this
     machine cannot be made to give (a full disk, a tap on a card) — there is no seam that writes a
     result the product code would not have written itself. */
  M._ctl = ctlOf;
  /* `M._gc` is not in this list because it is not a seam: `detach` assigns the collector's own promise
     so a caller can know when the sweep it started has finished. It is a read of real work. */
  M._reconcile = function (S) { const c = ctlOf(S); return c ? reconcile(c) : Promise.resolve(); };
  M._scanLocal = function (S) { const c = ctlOf(S); return c ? scanLocal(c) : Promise.resolve(null); };
  M._partPrefix = function (S, fp) { const c = ctlOf(S); return c ? partPrefix(c, fp) : null; };
  M._fid = fidOf;
  M._fp = fpOf;
  M._frame = frame;
  M._unframe = unframe;

  C.media = M;

})(window.FM);
