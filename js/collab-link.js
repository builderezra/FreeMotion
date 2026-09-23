/* FreeMotion — live collaboration (queue 921), STAGE S2: the link layer (spec §4.1, §25.2, §25.3).
 *
 * A Link is one duplex pipe to ONE peer, with named channels. Nothing above it knows how the bytes
 * travel, which is the whole point: the session engine is written once and proved against transports
 * that cost nothing to run — LoopLink (two endpoints in the same page) and PostLink (postMessage
 * between frames). `RtcLink` arrives in S3 and implements exactly this interface.
 *
 * ⚠️ S3 ADDS THE ONE REAL TRANSPORT — `RtcLink`, at the foot of this file — AND NOTHING ELSE. There is
 * still no WebSocket and no fetch here, and no RTCPeerConnection is constructed except inside RtcLink,
 * which nothing reaches until somebody taps Share or Join behind the Labs switch. The §23 guard test
 * counts all three constructions over a scripted solo session with Labs off AND with Labs on but not
 * sharing, and asserts zero.
 *
 * ⚠️ EVERY MESSAGE IS SERIALISED ON THE WAY OUT, even in-page. A LoopLink that handed the same object
 * to both sides would let two "devices" share one tree: a receiver mutating what it was given would
 * reach into the sender's document, every identity test would pass for the wrong reason, and the first
 * real transport would then break things the suite said were fine. JSON is what a real link costs, so
 * the fake one costs it too.
 *
 * 📐 DECIDED: delivery is SCHEDULED, and a test pumps it by hand. §25.2 wants "the real app plus
 * virtual peers"; an in-page link that delivered synchronously inside send() would make every receive
 * rule run inside the sender's own call stack — including inside a commit, which is the one place §9
 * says the diff runs — and no assertion about ordering would mean anything. `mode:'manual'` with an
 * explicit pump() is therefore the default for tests, and `mode:'async'` (a macrotask, like a real
 * channel) is what the app uses.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};

  const CHANNELS = ['ctl', 'pres', 'bulk'];

  /* ⚠️ BINARY IS COPIED AS BYTES, NOT THROUGH JSON (queue 921 S4). `bulk` carries ArrayBuffers, and
     `JSON.parse(JSON.stringify(buf))` turns one into `{}` — silently, with no throw anywhere: the
     receiver gets an object where a file's bytes should be, every frame "arrives", and the transfer
     completes with nothing in it. The copy still has to happen for the reason the note above gives —
     a fake link that hands both sides the same buffer would let a receiver mutate the sender's file —
     so it is a real byte copy, which is what a real transport costs too. */
  function jcopy(v) {
    if (v === undefined) return undefined;
    if (v instanceof ArrayBuffer) return v.slice(0);
    if (ArrayBuffer.isView(v)) return new Uint8Array(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)).buffer;
    return JSON.parse(JSON.stringify(v));
  }

  /* ═══ LOOPLINK ════════════════════════════════════════════════════════════════════════════════
   * Two endpoints joined by a `wire`. The wire owns the schedule, so a test can hold every message
   * in flight, reorder presence, cut one side off and heal it — the three things §25.3 asks the
   * switchboard for, available one stage before the switchboard exists.
   *
   * `partition(tag)` makes that endpoint's link report itself CLOSED rather than silently swallowing
   * messages. That matters: §13.1's offline behaviour (keep editing, fill the outbox, show the
   * banner) is driven by the link saying so, and a transport that drops in silence would leave the
   * session cheerfully believing it was connected — which is the failure the banner exists to name. */
  function LoopLink(opts) {
    const o = opts || {};
    const wire = {
      q: [],
      mode: o.mode || 'manual',
      down: Object.create(null),
      n: 0,
      lossyPres: !!o.lossyPres,
      rand: o.rand || Math.random
    };

    function mk(self, peer) {
      const ep = {
        kind: 'loop', self: self, peer: peer, open: true,
        onmessage: null, onclose: null, onopen: null,
        sent: 0, recv: 0, dropped: 0,
        send: function (ch, msg) {
          if (!ep.open) { ep.dropped++; return false; }
          if (CHANNELS.indexOf(ch) < 0) throw new Error('unknown collab channel ' + ch);
          ep.sent++;
          /* Serialised HERE, at send time, so a sender that mutates the object afterwards cannot
             change what the peer receives — exactly like a real channel. */
          wire.q.push({ n: ++wire.n, to: peer, ch: ch, data: jcopy(msg) });
          if (wire.mode === 'async') schedule();
          return true;
        },
        close: function () {
          if (!ep.open) return;
          ep.open = false;
          if (typeof ep.onclose === 'function') ep.onclose();
        }
      };
      return ep;
    }

    const A = mk(o.aTag || 'a', o.bTag || 'b');
    const B = mk(o.bTag || 'b', o.aTag || 'a');
    const byTag = Object.create(null);
    byTag[A.self] = A; byTag[B.self] = B;

    let armed = false;
    function schedule() {
      if (armed) return;
      armed = true;
      setTimeout(function () { armed = false; pump(); }, 0);
    }

    /* Deliver everything currently queued, once. Messages queued BY a delivery are left for the next
       pump, so a test can step the conversation one hop at a time; `pump(n)` runs n hops. */
    function pump(rounds) {
      let moved = 0;
      for (let r = 0; r < (rounds || 1); r++) {
        const batch = wire.q.splice(0, wire.q.length);
        if (!batch.length) break;
        for (let i = 0; i < batch.length; i++) {
          const m = batch[i];
          const ep = byTag[m.to];
          if (!ep || !ep.open || wire.down[m.to]) { moved++; continue; }   // a cut link loses what was in flight
          if (m.ch === 'pres' && wire.lossyPres && wire.rand() < 0.2) { moved++; continue; }
          ep.recv++;
          moved++;
          if (typeof ep.onmessage === 'function') ep.onmessage(m.ch, m.data, ep);
        }
      }
      return moved;
    }
    /* Pump until nothing more is produced — the quiescence a convergence assertion needs. Bounded,
       because a rule that pumps messages forever is a bug this should REPORT rather than hang on. */
    function settle(limit) {
      const cap = limit || 200;
      for (let i = 0; i < cap; i++) if (!pump(1)) return i;
      throw new Error('LoopLink.settle: still producing messages after ' + cap + ' rounds — something is echoing');
    }

    return {
      a: A, b: B, wire: wire, pump: pump, settle: settle,
      pending: function () { return wire.q.length; },
      partition: function (tag) {
        wire.down[tag] = true;
        const ep = byTag[tag], other = byTag[tag === A.self ? B.self : A.self];
        if (ep) ep.close();
        if (other) other.close();
      },
      heal: function (tag) {
        delete wire.down[tag];
        [A, B].forEach(function (ep) {
          /* ⚠️ ONLY THE SIDE THAT IS ACTUALLY BACK (queue 921). `partition(tag)` marks ONE tag and
             closes BOTH endpoints, so healing one side of a two-way cut used to reopen the other one
             as well — `onopen` fires, the session says hello and starts sending, and `pump` goes on
             silently discarding everything addressed to it. That is the exact state this transport's
             `partition` exists to make visible, in the helper every tier-2 rule is proved against. */
          if (ep.open || wire.down[ep.self]) return;
          ep.open = true;
          if (typeof ep.onopen === 'function') ep.onopen();
        });
      }
    };
  }

  /* ═══ POSTLINK ════════════════════════════════════════════════════════════════════════════════
   * One peer, reached through postMessage. Used by the Tier-3 rig (§25.3): three real app instances
   * on *.localhost origins, routed by a switchboard in the test frame. The envelope is the one §25.3
   * names — {fmLink:1, from, to, ch, data} — so the switchboard is a router and nothing more.
   *
   * ⚠️ `from` AND `to` ARE CHECKED ON EVERY INBOUND MESSAGE. A frame receives every message anybody
   * posts to it, including its own broadcasts bouncing back off the switchboard; without the pair
   * check a host with two guests would hand guest A's tx to guest B's endpoint and the mids would
   * silently cross. The origin is NOT checked, deliberately and only here: the rig's frames are on
   * three different origins by design and the switchboard is the trust boundary. S3's real link
   * authenticates the PEER (§14.6) rather than the window. */
  function PostLink(opts) {
    const o = opts || {};
    if (!o.self || !o.peer) throw new Error('PostLink needs {self, peer}');
    const target = o.target || (typeof window !== 'undefined' ? window.parent : null);
    const origin = o.origin || '*';
    const ep = {
      kind: 'post', self: o.self, peer: o.peer, open: true,
      onmessage: null, onclose: null, onopen: null,
      sent: 0, recv: 0, dropped: 0,
      send: function (ch, msg) {
        if (!ep.open || !target) { ep.dropped++; return false; }
        if (CHANNELS.indexOf(ch) < 0) throw new Error('unknown collab channel ' + ch);
        ep.sent++;
        try { target.postMessage({ fmLink: 1, from: ep.self, to: ep.peer, ch: ch, data: msg }, origin); }
        catch (e) { ep.dropped++; return false; }
        return true;
      },
      close: function () {
        if (!ep.open) return;
        ep.open = false;
        window.removeEventListener('message', handler);
        if (typeof ep.onclose === 'function') ep.onclose();
      }
    };
    function handler(e) {
      const d = e && e.data;
      if (!d || d.fmLink !== 1 || d.to !== ep.self || d.from !== ep.peer) return;
      if (CHANNELS.indexOf(d.ch) < 0) return;
      ep.recv++;
      if (typeof ep.onmessage === 'function') ep.onmessage(d.ch, d.data, ep);
    }
    window.addEventListener('message', handler);
    ep._handler = handler;
    return ep;
  }

  /* ═══ RTCLINK (S3) ════════════════════════════════════════════════════════════════════════════
   *
   * The real one: one RTCPeerConnection carrying the same three named channels, so everything above it
   * — the session engine, the receive rules, the host sequencer — is the code that has been under test
   * since S1 against LoopLink. Nothing in `collab-session.js` knows this file exists.
   *
   * THE THREE CHANNELS ARE NEGOTIATED (§26 S3), with fixed ids 0/1/2 and no `ondatachannel` anywhere.
   * In-band negotiation makes the stream id depend on the DTLS role, so the two sides can disagree about
   * which channel is which — and it needs a round trip per channel before the first byte. Fixed ids are
   * one fact both sides already have from the code they exchanged.
   *   · ctl  — ordered, reliable. Control and the document. Fragmented (below).
   *   · pres — UNORDERED and `maxRetransmits: 0`. Presence is a position that is about to be replaced;
   *            retransmitting a stale cursor is worse than losing it, and head-of-line blocking on the
   *            ctl channel is exactly what a separate channel exists to avoid.
   *   · bulk — ordered, reliable, and the only one that is flow-controlled (§26 S3). Media in S4.
   *
   * ⚠️ SCTP HAS A MESSAGE SIZE LIMIT AND IT IS NOT NEGOTIABLE. Chrome reports 262144 here (measured);
   * other stacks report 65536, and a `send()` over the limit throws — so a 300 KB batch of ops would
   * take the link down on exactly the edit that mattered. Both directions are framed: every ctl and bulk
   * message is cut to `chunkSize()`, which is derived from the peer connection's OWN `sctp.maxMessageSize`
   * with room for the header, never from a constant.
   *
   * ⚠️ AND THE SEND QUEUE IS FLOW-CONTROLLED, because `bufferedAmount` is not a number you may ignore.
   * Pushing 20 MB into a data channel as fast as the loop runs buffers all 20 MB in the browser's heap
   * — on a phone that is the tab, and there is no error, just a dead app. The pump refuses to send while
   * `bufferedAmount` is over the ceiling and resumes on `bufferedamountlow`, so the buffer can never hold
   * more than the ceiling plus one chunk. */

  const CH_ID = { ctl: 0, pres: 1, bulk: 2 };
  const CTL_HIGH = 1024 * 1024;
  const BULK_HIGH = 4 * 1024 * 1024;
  const CHUNK_TARGET = 16 * 1024;        // comfortably under every stack's limit, and small enough that one stall is short
  const HDR = 12;                        // bulk frame header: msgId, index, count (3 × uint32)
  /* ⚠️ THE REASSEMBLY CEILINGS, AND THEY ARE A SECURITY RULE RATHER THAN A TIDINESS ONE (§14.9). The
     frame COUNT and the running SIZE both come off the wire, from a peer this device does not trust. A
     single 20-byte frame claiming `n = 4000000000` would have the receiver allocate a four-billion-entry
     array before one byte of payload arrived; a stream of frames that never completes would grow the
     buffer until the tab died. Both are free to send and neither is visible as an error. So a frame
     count and a total are checked before anything is kept, and a message over either limit is dropped
     whole — §21's own TX caps are 4 MB / 5000 ops, so nothing legitimate is anywhere near these. */
  const MAX_FRAMES = 65536;
  const MAX_REASSEMBLE = { ctl: 16 * 1024 * 1024, pres: 256 * 1024, bulk: 64 * 1024 * 1024 };

  function RtcLink(opts) {
    const o = opts || {};
    if (typeof RTCPeerConnection === 'undefined') throw new Error('this browser has no RTCPeerConnection');
    const pc = new RTCPeerConnection({ iceServers: o.iceServers || [] });
    const S = C.signal;
    const ep = {
      kind: 'rtc', self: o.self || 'me', peer: o.peer || 'them', open: false,
      onmessage: null, onclose: null, onopen: null,
      sent: 0, recv: 0, dropped: 0, pc: pc, mk: null,
      fpLocal: null, fpRemote: null
    };

    const chans = Object.create(null);
    let closed = false, openedResolve = null, openedReject = null, msgId = 0;

    ep.opened = new Promise(function (res, rej) { openedResolve = res; openedReject = rej; });
    /* An unhandled rejection on a link nobody awaited is a console error on a feature behind a Labs
       switch; the state is reported through `onclose` as well, which is what the UI listens to. */
    ep.opened.catch(function () {});

    function mkChan(name) {
      const init = { negotiated: true, id: CH_ID[name], ordered: true };
      if (name === 'pres') { init.ordered = false; init.maxRetransmits = 0; }
      const dc = pc.createDataChannel(name, init);
      dc.binaryType = 'arraybuffer';
      const st = { dc: dc, q: [], high: name === 'bulk' ? BULK_HIGH : CTL_HIGH, parts: null, waiting: false };
      dc.bufferedAmountLowThreshold = Math.floor(st.high / 2);
      dc.onbufferedamountlow = function () { st.waiting = false; pump(name); };
      dc.onmessage = function (e) { onFrame(name, e.data); };
      /* ⚠️ THE LINK IS OPEN WHEN ALL THREE CHANNELS ARE, NOT WHEN `ctl` IS (queue 921). The three negotiated channels
         open independently, a few milliseconds apart. `opened` used to resolve on `ctl` alone, so about one pairing in
         ten had `bulk` still connecting at the moment the link said it was ready — and ep.send on a channel that is not
         open DROPPED the message and returned false, which nobody checks. Measured: 8 MB sent, "nothing arrived" for
         150 s, both channels open at the timeout, bufferedAmount never above 0. In the app that is a friend's footage
         silently never sent. Now each channel's own open re-pumps its queue, and the link opens once all are up. */
      dc.onopen = function () {
        pump(name);
        if (CHANNELS.every(function (n) { return chans[n] && chans[n].dc.readyState === 'open'; }) && !ep.open) {
          ep.open = true;
          if (openedResolve) { openedResolve(ep); openedResolve = null; openedReject = null; }
          if (typeof ep.onopen === 'function') ep.onopen();
        }
      };
      if (name === 'ctl') dc.onclose = function () { ep.close('channel'); };
      chans[name] = st;
      return st;
    }

    CHANNELS.forEach(mkChan);

    /* The peer connection's own answer, asked at the moment of sending rather than cached: `pc.sctp` is
       null until the transport is up, and a cached 65536 fallback would then under-cut every later send
       by a factor of four for the life of the link. */
    ep.chunkSize = function () {
      const max = (pc.sctp && pc.sctp.maxMessageSize) || 65536;
      return Math.max(1024, Math.min(CHUNK_TARGET, max - 256));
    };

    function pump(name) {
      const st = chans[name];
      if (!st || closed) return;
      const dc = st.dc;
      while (st.q.length) {
        if (dc.readyState !== 'open') return;
        if (dc.bufferedAmount > st.high) { st.waiting = true; return; }
        const head = st.q[0];
        let frame;
        if (head.kind === 'text') {
          frame = head.parts[head.i++];
          if (head.i >= head.parts.length) st.q.shift();
        } else {
          /* The frame size is the one fixed WHEN THE MESSAGE WAS QUEUED, not the one chunkSize() would
             answer now: `pc.sctp` is null until the transport is up, so the ceiling can grow by 4× mid
             message, and a receiver reassembling by index would then stitch the parts at the wrong
             offsets — silently, since every part still arrives. */
          const size = head.size;
          const off = head.i * size;
          const end = Math.min(off + size, head.bytes.length);
          const buf = new Uint8Array(HDR + (end - off));
          const dv = new DataView(buf.buffer);
          dv.setUint32(0, head.id); dv.setUint32(4, head.i); dv.setUint32(8, head.n);
          buf.set(head.bytes.subarray(off, end), HDR);
          frame = buf.buffer;
          head.i++;
          if (head.i >= head.n) st.q.shift();
        }
        try { dc.send(frame); } catch (e) { ep.dropped++; st.q.length = 0; return; }
      }
    }

    function onFrame(name, data) {
      const st = chans[name];
      if (!st) return;
      if (typeof data === 'string') {
        if (data.charCodeAt(0) === 46) {                 // '.' — a whole message
          deliver(name, data.slice(1));
          return;
        }
        if (data.charCodeAt(0) !== 70) return;           // 'F' — a fragment; anything else is not ours
        const m = data.match(/^F(\d+),(\d+),(\d+),/);
        if (!m) return;
        const id = m[1], i = +m[2], n = +m[3], body = data.slice(m[0].length);
        if (!(n >= 1 && n <= MAX_FRAMES) || !(i >= 0 && i < n)) { ep.dropped++; return; }
        if (!st.parts || st.parts.id !== id) st.parts = { id: id, n: n, got: 0, size: 0, buf: new Array(n) };
        if (i >= st.parts.n || st.parts.buf[i] !== undefined) return;
        if (st.parts.size + body.length > MAX_REASSEMBLE[name]) { st.parts = null; ep.dropped++; return; }
        st.parts.buf[i] = body; st.parts.got++; st.parts.size += body.length;
        if (st.parts.got < st.parts.n) return;
        const whole = st.parts.buf.join('');
        st.parts = null;
        deliver(name, whole);
        return;
      }
      /* Binary: the bulk framing. Held per channel, so a ctl frame can never be mistaken for one. */
      const b = new Uint8Array(data);
      if (b.length < HDR) return;
      const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
      const id = dv.getUint32(0), i = dv.getUint32(4), n = dv.getUint32(8);
      if (!(n >= 1 && n <= MAX_FRAMES) || !(i < n)) { ep.dropped++; return; }
      if (!st.bin || st.bin.id !== id) st.bin = { id: id, n: n, got: 0, buf: new Array(n), size: 0 };
      if (i >= st.bin.n || st.bin.buf[i] !== undefined) return;
      const part = b.slice(HDR);
      if (st.bin.size + part.length > MAX_REASSEMBLE[name]) { st.bin = null; ep.dropped++; return; }
      st.bin.buf[i] = part; st.bin.got++; st.bin.size += part.length;
      if (st.bin.got < st.bin.n) return;
      const out = new Uint8Array(st.bin.size);
      let at = 0;
      for (let k = 0; k < st.bin.n; k++) { out.set(st.bin.buf[k], at); at += st.bin.buf[k].length; }
      st.bin = null;
      ep.recv++;
      if (typeof ep.onmessage === 'function') ep.onmessage(name, out.buffer, ep);
    }

    function deliver(name, json) {
      let msg = null;
      /* ⚠️ A PEER'S BYTES ARE NOT TRUSTED TO BE JSON (§14.9). A throw here would land inside the data
         channel's own event dispatch, where nothing in this app can catch it. */
      try { msg = JSON.parse(json); } catch (e) { ep.dropped++; return; }
      ep.recv++;
      if (typeof ep.onmessage === 'function') ep.onmessage(name, msg, ep);
    }

    ep.send = function (ch, msg) {
      if (!ep.open || closed) { ep.dropped++; return false; }
      if (CHANNELS.indexOf(ch) < 0) throw new Error('unknown collab channel ' + ch);
      const st = chans[ch];
      /* A channel that is still CONNECTING queues (its onopen pumps it); only one that is closing or closed drops. */
      if (!st || st.dc.readyState === 'closing' || st.dc.readyState === 'closed') { ep.dropped++; return false; }
      ep.sent++;
      if (msg instanceof ArrayBuffer || ArrayBuffer.isView(msg)) {
        const bytes = msg instanceof ArrayBuffer ? new Uint8Array(msg) : new Uint8Array(msg.buffer, msg.byteOffset, msg.byteLength);
        const size = ep.chunkSize() - HDR;
        st.q.push({ kind: 'bin', bytes: bytes, id: ++msgId, i: 0, size: size, n: Math.max(1, Math.ceil(bytes.length / size)) });
      } else {
        const json = JSON.stringify(msg);
        const size = ep.chunkSize();
        if (json.length + 1 <= size) st.q.push({ kind: 'text', parts: ['.' + json], i: 0 });
        else {
          const id = ++msgId;
          const head = 'F' + id + ',0,0,';
          const body = size - head.length - 8;             // room for the growing index and count digits
          /* ⚠️ NEVER CUT BETWEEN THE TWO HALVES OF A SURROGATE PAIR (queue 921 S3 review). `json.length`
             and `slice` count UTF-16 code units, and an emoji — or any non-BMP character in a text layer
             or a caption — is two of them. Cutting between them leaves each fragment ending or starting
             on a LONE surrogate, and `RTCDataChannel.send` takes a USVString: the browser replaces each
             lone half with U+FFFD, silently, with no throw and no error event. The unit count is
             unchanged so reassembly still lines up, U+FFFD is legal inside a JSON string so `JSON.parse`
             succeeds, and the guest ends up holding a document with �� where the emoji was — which then
             fails §11.4's hash, drives a resync, and is corrupted again by the same cut. A peer can aim
             a pair at a boundary on purpose; an ordinary caption hits one by accident.
             So the boundary walks back one unit when it would orphan a high surrogate, and `n` is
             counted from the slices rather than assumed from a division. */
          const slices = [];
          let at = 0;
          while (at < json.length) {
            let end = Math.min(at + body, json.length);
            if (end < json.length) {
              const c = json.charCodeAt(end - 1);
              if (c >= 0xd800 && c <= 0xdbff) end--;
            }
            if (end <= at) end = Math.min(at + body, json.length);   // body is ≥1009 here, so this cannot bite; a loop that could never end is not worth the risk
            slices.push(json.slice(at, end));
            at = end;
          }
          const n = slices.length;
          const parts = [];
          for (let i = 0; i < n; i++) parts.push('F' + id + ',' + i + ',' + n + ',' + slices[i]);
          st.q.push({ kind: 'text', parts: parts, i: 0 });
        }
      }
      pump(ch);
      return true;
    };

    /* The raw channel, for the suite: §26 S3 asserts the negotiated ids and the pres channel's
       unordered/no-retransmit shape, and those are properties of the RTCDataChannel itself. Nothing in
       the app reads this. */
    ep.channel = function (ch) { const st = chans[ch]; return st ? st.dc : null; };
    ep.bufferedAmount = function (ch) { const st = chans[ch || 'bulk']; return st ? st.dc.bufferedAmount : 0; };
    ep.queued = function (ch) { const st = chans[ch || 'bulk']; return st ? st.q.length : 0; };

    ep.close = function (why) {
      if (closed) return;
      closed = true;
      ep.open = false;
      CHANNELS.forEach(function (n) { try { chans[n].dc.close(); } catch (e) {} });
      try { pc.close(); } catch (e) {}
      if (openedReject) { openedReject({ why: why || 'closed' }); openedResolve = null; openedReject = null; }
      if (typeof ep.onclose === 'function') ep.onclose(why || 'closed');
    };

    pc.oniceconnectionstatechange = function () {
      if (pc.iceConnectionState === 'failed') ep.close('ice');
    };

    /* ⚠️ NON-TRICKLE, CAPPED (§14.4). There is no signalling channel to trickle candidates down — the
       whole description has to fit in one code a person reads out — so gathering is waited for. The cap
       matters as much as the wait: a machine with a VPN or a stale interface can leave gathering open
       for tens of seconds, and the candidates that arrive after the first few are almost never the ones
       ICE picks. Three seconds, then go with what there is. */
    function gathered() {
      if (pc.iceGatheringState === 'complete') return Promise.resolve();
      return new Promise(function (res) {
        const t = setTimeout(done, (C.LIMITS && C.LIMITS.ICE_GATHER) || 3000);
        function done() { clearTimeout(t); pc.removeEventListener('icegatheringstatechange', onch); res(); }
        function onch() { if (pc.iceGatheringState === 'complete') done(); }
        pc.addEventListener('icegatheringstatechange', onch);
      });
    }

    function localCode(role) {
      ep.fpLocal = S.fingerprintOf(pc.localDescription.sdp);
      /* ⚠️ A CODE WITH NO CANDIDATES IN IT CANNOT CONNECT, AND LOOKS EXACTLY LIKE ONE THAT CAN
         (queue 921 S3 review). `gathered()` gives up after three seconds whatever it has — right, because
         a VPN or a stale interface can hold gathering open for tens of seconds — but "whatever it has"
         was allowed to be NOTHING, and the codec has no opinion about an empty candidate list. The card
         then shows a perfectly ordinary FM1-… code, the far end accepts it, ICE has nothing to check
         against, and both screens sit on "Connecting…". Refuse to mint it instead, with a `why` the UI
         can turn into the sentence that actually helps. */
      const d = S.parseDesc(pc.localDescription.sdp, role);
      if (d && !d.cands.length) throw { why: 'no-candidates' };
      const code = S.encode(pc.localDescription.sdp, role, role === 'offer' ? ep.mk : null);
      if (!code) throw new Error('the local description could not be reduced to a code');
      return code;
    }

    /* The host's half: mint the one-time key that authenticates this pairing, and hand back the code.
       S6: on the RELAY it is the guest that offers, and the key it will prove is the room's (or its
       member token) — something both ends already hold. `{key:false}` makes an offer with no `mk` in it,
       because a key minted here and carried inside the sealed envelope would authenticate nothing the
       envelope's own key does not, and would be one more secret on the wire. */
    ep.createOffer = function (opts) {
      ep.mk = (opts && opts.key === false) ? null : S.randomBytes(16);
      return pc.createOffer()
        .then(function (d) { return pc.setLocalDescription(d); })
        .then(gathered)
        .then(function () { return localCode('offer'); });
    };

    /* The guest's half: take his code, answer it, hand back a code for him to paste. `mk` rides in the
       OFFER only — the answer is already bound to it by the handshake that follows. */
    ep.acceptOffer = function (code) {
      const d = S.decode(code);
      if (!d || d.type !== 'offer') return Promise.reject({ why: 'bad-code' });
      if (!d.cands) return Promise.reject({ why: 'no-candidates' });   // see localCode: nothing to connect to
      ep.mk = d.mk;
      ep.fpRemote = d.fp;
      return pc.setRemoteDescription({ type: 'offer', sdp: d.sdp })
        .then(function () { return pc.createAnswer(); })
        .then(function (a) { return pc.setLocalDescription(a); })
        .then(gathered)
        .then(function () { return localCode('answer'); })
        .catch(function (e) { return Promise.reject(e && e.why ? e : { why: 'bad-code', err: String(e) }); });
    };

    ep.acceptAnswer = function (code) {
      const d = S.decode(code);
      if (!d || d.type !== 'answer') return Promise.reject({ why: 'bad-code' });
      if (!d.cands) return Promise.reject({ why: 'no-candidates' });
      ep.fpRemote = d.fp;
      return pc.setRemoteDescription({ type: 'answer', sdp: d.sdp })
        .catch(function (e) { return Promise.reject({ why: 'bad-code', err: String(e) }); });
    };

    return ep;
  }

  C.link = { CHANNELS: CHANNELS, LoopLink: LoopLink, PostLink: PostLink, RtcLink: RtcLink, CH_ID: CH_ID, BULK_HIGH: BULK_HIGH, CTL_HIGH: CTL_HIGH };

})(window.FM);
