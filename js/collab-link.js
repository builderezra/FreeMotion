/* FreeMotion — live collaboration (queue 921), STAGE S2: the link layer (spec §4.1, §25.2, §25.3).
 *
 * A Link is one duplex pipe to ONE peer, with named channels. Nothing above it knows how the bytes
 * travel, which is the whole point: the session engine is written once and proved against transports
 * that cost nothing to run — LoopLink (two endpoints in the same page) and PostLink (postMessage
 * between frames). `RtcLink` arrives in S3 and implements exactly this interface.
 *
 * ⚠️ S2 SHIPS NO NETWORK OF ANY KIND. There is no RTCPeerConnection, no WebSocket, no fetch and no
 * signalling in this file. The S0 guard test (§23 b) counts constructions of all three and asserts
 * zero, and it must stay zero until S3 puts a real connection behind a Labs switch.
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

  function jcopy(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

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

  C.link = { CHANNELS: CHANNELS, LoopLink: LoopLink, PostLink: PostLink };

})(window.FM);
