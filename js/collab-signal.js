/* FreeMotion — live collaboration (queue 921), STAGES S3 + S6: §14, the codes and the relay.
 *
 * S3's two jobs, first:
 *   1. The MINIMAL-SDP CODEC (§14.5). A browser's offer is ~500 bytes of boilerplate around five facts:
 *      the ICE ufrag and password, the DTLS fingerprint, the setup role and up to six candidates. This
 *      packs those into ~110 bytes and prints them as Crockford base32 with an `FM1-` prefix, so one
 *      person can read a connection out loud, paste it, or (S8) scan it — with no server anywhere.
 *   2. The AUTH HANDSHAKE (§14.6), which runs on `ctl` BEFORE any document data and binds the shared
 *      secret to BOTH DTLS fingerprints, plus the SHORT AUTHENTICATION STRING the two people compare
 *      out loud.
 *
 * ⚠️ AND THE FINGERPRINT BINDING ALONE IS NOT ENOUGH ON THE CODE PATH — read this before trusting it.
 * The sentence this file used to carry ("a relay that made its own certificates would have to know a
 * key it has never seen") is TRUE of §14.1's room code, where the key never travels, and FALSE of the
 * only mode S3 ships. `mk` rides INSIDE the offer code (`packDesc`, bit 1 of the flags), so it travels
 * in the very blob a person pastes into a chat app — and anyone who can rewrite that blob holds both
 * the key and the fingerprint it is meant to authenticate. They can keep `mk`, substitute their own
 * certificate and candidates, and then compute BOTH MACs, because each leg's MAC is over the
 * fingerprints THAT leg really uses. Both handshakes resolve and neither device sees a thing.
 * So the binding is only effective against a relay in the MEDIA path (a TURN server), never one in the
 * CODE path, and the gap is closed by the one thing a relay cannot rewrite: the two people. `S.sas`
 * derives five Crockford characters from the key AND both fingerprints, `handshake` hands them back on
 * BOTH sides, and the owner may not admit anybody until he has confirmed they read the same five
 * (js/collab-ui.js). Under a relay the two legs hold different fingerprints, so the two strings differ
 * and the person reading them aloud is the detector. DO NOT BUILD §14.6's INVITE LINK ON THE OLD CLAIM.
 *
 * S6 ADDS THE RELAY at the foot of this file: §14.1's 9-character room code and its PBKDF2, the `#j=`
 * invite link, §14.3's sealed envelope and its receiver rules, §14.4's three drivers (PeerJS on 443 and
 * two MQTT brokers, hand-written), and the rendezvous that runs them in parallel. Still no fetch; the
 * only WebSocket constructions in the app are inside those drivers, each behind `relayGate()`, so Codes
 * only (and a loopback page without a test fake) opens none — the §23 guard test counts them.
 *
 * ⚠️ EVERY VALUE THAT COMES OFF A CODE IS UNTRUSTED (§14.9). A code is typed in by hand from another
 * device; it can be mistyped, truncated, or hostile. So the decoder validates lengths, character sets
 * and counts BEFORE it builds anything, and the rebuilt SDP is assembled from a fixed template with
 * only those validated fields interpolated — a candidate address is re-checked against an IPv4 / IPv6 /
 * mDNS-UUID shape rather than pasted through, because an SDP line is a parser's input and `\r\n` in a
 * field would let a code inject whole attributes. THE LOCAL DESCRIPTION IS NEVER MODIFIED (§14.5).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};
  const S = {};

  /* ═══ BYTES ═══════════════════════════════════════════════════════════════════════════════════ */

  function randomBytes(n) {
    const b = new Uint8Array(n);
    (self.crypto || window.crypto).getRandomValues(b);
    return b;
  }
  function hex(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return s;
  }
  function utf8(str) { return new TextEncoder().encode(str); }
  function b64url(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /* ═══ CROCKFORD BASE32 (§14.1) ════════════════════════════════════════════════════════════════
   * The alphabet leaves out I, L, O and U, and the reader folds I/L→1 and O→0, so the two characters
   * people most often confuse when reading a code aloud cannot produce a different code. U is out
   * because Crockford leaves it out (it keeps accidental words from forming). */
  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const B32REV = (function () {
    const m = Object.create(null);
    for (let i = 0; i < B32.length; i++) m[B32[i]] = i;
    m['I'] = 1; m['L'] = 1; m['O'] = 0;
    return m;
  })();

  function b32encode(bytes) {
    let out = '', bits = 0, acc = 0;
    for (let i = 0; i < bytes.length; i++) {
      acc = (acc << 8) | bytes[i]; bits += 8;
      while (bits >= 5) { bits -= 5; out += B32[(acc >>> bits) & 31]; }
    }
    if (bits) out += B32[(acc << (5 - bits)) & 31];
    return out;
  }
  /* Returns null rather than throwing on anything it cannot read: a mistyped code is the ordinary case
     here, not an exception, and every caller has a message to show for it. */
  function b32decode(str) {
    const s = String(str == null ? '' : str).toUpperCase().replace(/[\s\-_.]/g, '');
    if (!s.length) return null;
    const out = [];
    let bits = 0, acc = 0;
    for (let i = 0; i < s.length; i++) {
      const v = B32REV[s[i]];
      if (v === undefined) return null;
      acc = (acc << 5) | v; bits += 5;
      if (bits >= 8) { bits -= 8; out.push((acc >>> bits) & 255); }
    }
    return new Uint8Array(out);
  }

  /* `FM1-` names the format and the version in the one place a person sees, so a future format can be
     told apart by looking rather than by failing to decode. Grouped in fives because that is how a
     person reads a long string back to someone over the phone. */
  function toCode(bytes) {
    const raw = b32encode(bytes);
    return 'FM1-' + (raw.match(/.{1,5}/g) || []).join('-');
  }
  function fromCode(code) {
    const s = String(code == null ? '' : code).trim().toUpperCase().replace(/[\s\-_.]/g, '');
    if (s.indexOf('FM1') !== 0) return null;
    return b32decode(s.slice(3));
  }
  S.isConnCode = function (s) { return /^\s*FM1[-\s]?/i.test(String(s == null ? '' : s)); };

  /* ═══ THE MINIMAL-SDP CODEC (§14.5) ═══════════════════════════════════════════════════════════
   *
   * Layout, all big-endian:
   *   0      v (1)
   *   1      flags: bit0 role (0 offer, 1 answer) · bit1 has mk · bits2-3 setup (0 actpass, 1 active, 2 passive)
   *   2      ufrag length, then that many ASCII bytes
   *   ...    pwd length, then that many ASCII bytes
   *   ...    32 bytes fingerprint (sha-256, the colons dropped)
   *   ...    16 bytes mk, only when bit1 is set (offer only — the answer's key came from the offer)
   *   ...    candidate count, then per candidate:
   *            1 byte  (kind & 15) | (addrKind << 4)   kind 0 host, 1 srflx · addrKind 0 IPv4, 1 IPv6, 2 mDNS
   *            4 / 16 / 16 bytes address
   *            2 bytes port
   *
   * Measured at v16.83 in this repo's own headless Chrome: one host mDNS candidate, ufrag 4, pwd 24 →
   * 103 bytes → a 169-character code. The §14.5 estimate of "about 150 bytes / 250 characters" was for
   * six candidates; this is the one-candidate case a phone and a Mac on the same Wi-Fi actually produce. */

  const SETUPS = ['actpass', 'active', 'passive'];

  function fingerprintOf(sdp) {
    const m = String(sdp || '').match(/^a=fingerprint:sha-256 ([0-9A-Fa-f:]+)/m);
    return m ? m[1].toUpperCase() : null;
  }
  S.fingerprintOf = fingerprintOf;

  /* IPv6 is parsed with the browser's own URL parser rather than by hand: `::ffff:1.2.3.4`, `::` and
     every zero-compression form are exactly where a hand-written splitter gets it wrong, and getting
     it wrong here means a candidate that silently never connects. */
  function ipv6Bytes(ip) {
    let host;
    try { host = new URL('http://[' + ip + ']/').hostname; } catch (e) { return null; }
    const inner = host.replace(/^\[|\]$/g, '');
    const parts = inner.split('::');
    if (parts.length > 2) return null;
    const head = parts[0] ? parts[0].split(':') : [];
    const tail = parts.length === 2 ? (parts[1] ? parts[1].split(':') : []) : null;
    const groups = [];
    function push(list) {
      for (let i = 0; i < list.length; i++) {
        const g = list[i];
        if (/^[0-9a-fA-F]{1,4}$/.test(g)) { groups.push(parseInt(g, 16)); continue; }
        const v4 = g.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (!v4) return false;
        groups.push((+v4[1] << 8) | +v4[2], (+v4[3] << 8) | +v4[4]);
      }
      return true;
    }
    if (!push(head)) return null;
    if (tail) {
      const t = [];
      const before = groups.length;
      if (!push(tail)) return null;
      for (let i = before; i < groups.length; i++) t.push(groups[i]);
      groups.length = before;
      while (groups.length + t.length < 8) groups.push(0);
      for (let i = 0; i < t.length; i++) groups.push(t[i]);
    }
    if (groups.length !== 8) return null;
    const out = new Uint8Array(16);
    for (let i = 0; i < 8; i++) { out[i * 2] = (groups[i] >>> 8) & 255; out[i * 2 + 1] = groups[i] & 255; }
    return out;
  }
  function ipv6Text(b) {
    const g = [];
    for (let i = 0; i < 8; i++) g.push(((b[i * 2] << 8) | b[i * 2 + 1]).toString(16));
    /* Longest run of zeroes collapses to `::` — not cosmetic: an uncompressed form is still valid SDP,
       but keeping the canonical one means a code round-trips to the same text it came from, which is
       what the round-trip test can assert on. */
    let bi = -1, bl = 0, i = 0;
    while (i < 8) {
      if (g[i] !== '0') { i++; continue; }
      let j = i;
      while (j < 8 && g[j] === '0') j++;
      if (j - i > bl) { bl = j - i; bi = i; }
      i = j;
    }
    if (bl < 2) return g.join(':');
    return g.slice(0, bi).join(':') + '::' + g.slice(bi + bl).join(':');
  }

  const MDNS = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\.local$/i;

  function addrBytes(ip) {
    const v4 = String(ip).match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (v4) {
      const o = [+v4[1], +v4[2], +v4[3], +v4[4]];
      for (let i = 0; i < 4; i++) if (o[i] > 255) return null;
      return { kind: 0, bytes: new Uint8Array(o) };
    }
    const md = String(ip).match(MDNS);
    if (md) {
      const h = (md[1] + md[2] + md[3] + md[4] + md[5]).toLowerCase();
      const out = new Uint8Array(16);
      for (let i = 0; i < 16; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
      return { kind: 2, bytes: out };
    }
    const v6 = ipv6Bytes(ip);
    return v6 ? { kind: 1, bytes: v6 } : null;
  }
  function addrText(kind, b) {
    if (kind === 0) return b[0] + '.' + b[1] + '.' + b[2] + '.' + b[3];
    if (kind === 2) {
      const h = hex(b);
      return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20) + '.local';
    }
    return ipv6Text(b);
  }

  /* Everything a data-channel-only description needs, and nothing that is the same on every device.
     Candidates are capped at six (§14.5): past that a code stops being readable, and the extras are
     almost always a second interface that ICE would not have picked anyway. */
  S.parseDesc = function (sdp, role) {
    const text = String(sdp || '');
    const g = function (re) { const m = text.match(re); return m ? m[1] : null; };
    const ufrag = g(/^a=ice-ufrag:(\S+)/m);
    const pwd = g(/^a=ice-pwd:(\S+)/m);
    const fp = fingerprintOf(text);
    const setup = g(/^a=setup:(\S+)/m);
    if (!ufrag || !pwd || !fp || SETUPS.indexOf(setup) < 0) return null;
    const cands = [];
    const re = /^a=candidate:(\S+) (\d+) (\S+) (\d+) (\S+) (\d+) typ (\S+)/gm;
    let m;
    while ((m = re.exec(text)) && cands.length < 6) {
      if (m[2] !== '1') continue;                       // RTCP component: a data channel has none
      if (!/^udp$/i.test(m[3])) continue;               // TCP candidates cost more code than they win
      if (m[7] !== 'host' && m[7] !== 'srflx') continue;
      const port = +m[6];
      if (!(port > 0 && port < 65536)) continue;
      if (!addrBytes(m[5])) continue;
      cands.push({ t: m[7], ip: m[5], port: port });
    }
    return { v: 1, r: role === 'answer' ? 'a' : 'o', ufrag: ufrag, pwd: pwd, fp: fp, setup: setup, cands: cands };
  };

  S.packDesc = function (d, mk) {
    const uf = utf8(d.ufrag), pw = utf8(d.pwd);
    if (uf.length > 255 || pw.length > 255) return null;
    const fpHex = String(d.fp).replace(/:/g, '');
    if (!/^[0-9A-Fa-f]{64}$/.test(fpHex)) return null;
    const out = [];
    out.push(1);
    out.push((d.r === 'a' ? 1 : 0) | (mk ? 2 : 0) | (SETUPS.indexOf(d.setup) << 2));
    out.push(uf.length); for (let i = 0; i < uf.length; i++) out.push(uf[i]);
    out.push(pw.length); for (let i = 0; i < pw.length; i++) out.push(pw[i]);
    for (let i = 0; i < 32; i++) out.push(parseInt(fpHex.substr(i * 2, 2), 16));
    if (mk) for (let i = 0; i < 16; i++) out.push(mk[i]);
    const cs = (d.cands || []).slice(0, 6);
    out.push(cs.length);
    for (let i = 0; i < cs.length; i++) {
      const a = addrBytes(cs[i].ip);
      if (!a) return null;
      out.push((cs[i].t === 'srflx' ? 1 : 0) | (a.kind << 4));
      for (let j = 0; j < a.bytes.length; j++) out.push(a.bytes[j]);
      out.push((cs[i].port >>> 8) & 255, cs[i].port & 255);
    }
    return new Uint8Array(out);
  };

  /* ⚠️ EVERY READ IS BOUNDS-CHECKED AND EVERY FIELD IS RE-VALIDATED. This is the one function in the
     collab modules whose input a person types in by hand off another screen. A truncated code must say
     "that code looks incomplete", not walk off the end of the array and produce a half-description that
     fails ten seconds later inside ICE with nothing to show him. */
  S.unpackDesc = function (bytes) {
    const b = bytes;
    if (!b || b.length < 4) return null;
    let i = 0;
    if (b[i++] !== 1) return null;
    const flags = b[i++];
    const setup = SETUPS[(flags >> 2) & 3];
    if (!setup) return null;
    const rd = function (n) { if (i + n > b.length) return null; const s = b.subarray(i, i + n); i += n; return s; };
    const ul = rd(1); if (!ul) return null;
    const uf = rd(ul[0]); if (!uf) return null;
    const pl = rd(1); if (!pl) return null;
    const pw = rd(pl[0]); if (!pw) return null;
    const fp = rd(32); if (!fp) return null;
    let mk = null;
    if (flags & 2) { mk = rd(16); if (!mk) return null; mk = new Uint8Array(mk); }
    const cc = rd(1); if (!cc) return null;
    const n = cc[0];
    if (n > 6) return null;
    const cands = [];
    for (let k = 0; k < n; k++) {
      const h = rd(1); if (!h) return null;
      const kind = h[0] & 15, addrKind = h[0] >> 4;
      if (kind > 1 || addrKind > 2) return null;
      const a = rd(addrKind === 0 ? 4 : 16); if (!a) return null;
      const p = rd(2); if (!p) return null;
      const port = (p[0] << 8) | p[1];
      if (!port) return null;
      cands.push({ t: kind === 1 ? 'srflx' : 'host', ip: addrText(addrKind, a), port: port });
    }
    const ufrag = new TextDecoder().decode(uf), pwd = new TextDecoder().decode(pw);
    /* ICE credentials are ice-chars per RFC 5245; anything else in them would be a line break or a
       space smuggled into an SDP attribute. Refuse rather than sanitise — a code that does not decode
       to something an SDP can hold is not a code this app wrote. */
    if (!/^[A-Za-z0-9+/]{3,256}$/.test(ufrag) || !/^[A-Za-z0-9+/]{20,256}$/.test(pwd)) return null;
    const fpText = (hex(fp).toUpperCase().match(/.{2}/g) || []).join(':');
    return { v: 1, r: (flags & 1) ? 'a' : 'o', ufrag: ufrag, pwd: pwd, fp: fpText, setup: setup, cands: cands, mk: mk };
  };

  /* The data-channel-only template of §14.5. The `o=` session id is a constant: it is never compared
     across devices and it is 20 characters of code nobody can read. */
  S.buildSdp = function (d) {
    const L = ['v=0', 'o=- 4611731400430051336 2 IN IP4 127.0.0.1', 's=-', 't=0 0',
      'a=group:BUNDLE 0', 'a=extmap-allow-mixed', 'a=msid-semantic: WMS',
      'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0'];
    for (let i = 0; i < d.cands.length; i++) {
      const c = d.cands[i];
      L.push('a=candidate:' + (i + 1) + ' 1 udp ' + (2113937151 - i) + ' ' + c.ip + ' ' + c.port +
        ' typ ' + c.t + (c.t === 'srflx' ? ' raddr 0.0.0.0 rport 0' : '') + ' generation 0');
    }
    L.push('a=ice-ufrag:' + d.ufrag, 'a=ice-pwd:' + d.pwd,
      'a=fingerprint:sha-256 ' + d.fp, 'a=setup:' + d.setup,
      'a=mid:0', 'a=sctp-port:5000', 'a=max-message-size:262144');
    return L.join('\r\n') + '\r\n';
  };

  S.encode = function (sdp, role, mk) {
    const d = S.parseDesc(sdp, role);
    if (!d) return null;
    const bytes = S.packDesc(d, role === 'answer' ? null : mk);
    return bytes ? toCode(bytes) : null;
  };
  /* Returns {type, sdp, mk, fp} or null. `type` is what RTCSessionDescriptionInit wants. */
  S.decode = function (code) {
    const bytes = fromCode(code);
    if (!bytes) return null;
    const d = S.unpackDesc(bytes);
    if (!d) return null;
    return { type: d.r === 'a' ? 'answer' : 'offer', sdp: S.buildSdp(d), mk: d.mk, fp: d.fp, cands: d.cands.length };
  };

  /* ═══ CRYPTO (§14.1, §14.6) ═══════════════════════════════════════════════════════════════════ */

  function subtle() {
    const c = self.crypto || window.crypto;
    return c && c.subtle ? c.subtle : null;
  }
  S.available = function () { return !!subtle(); };

  S.hkdf = function (ikm, salt, label, bytes) {
    const sub = subtle();
    if (!sub) return Promise.reject(new Error('WebCrypto is not available'));
    return sub.importKey('raw', ikm, 'HKDF', false, ['deriveBits']).then(function (k) {
      return sub.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt, info: utf8(label) }, k, (bytes || 32) * 8);
    }).then(function (buf) { return new Uint8Array(buf); });
  };

  S.hmac = function (keyBytes, msg) {
    const sub = subtle();
    if (!sub) return Promise.reject(new Error('WebCrypto is not available'));
    return sub.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      .then(function (k) { return sub.sign('HMAC', k, utf8(msg)); })
      .then(function (buf) { return b64url(new Uint8Array(buf)); });
  };

  /* ═══ THE SHORT AUTHENTICATION STRING (queue 921 S3 review) ════════════════════════════
   * Five Crockford characters over the key AND both fingerprints — the same three facts the MACs bind,
   * rendered small enough for one person to read down a phone line. It is the ONLY part of this file a
   * relay on the code channel cannot satisfy: it holds `mk` (it travelled in the code) and it can forge
   * either MAC, but it cannot make its own certificate hash to the one the far end sees, so the string
   * it produces on one leg differs from the string on the other. The alphabet is Crockford's, so I/L/O
   * are not in it and cannot be misheard as 1/0.
   * The same three inputs on both sides in the same order: fpG then fpH, whoever is asking. */
  S.sas = function (key, fpG, fpH) {
    return S.hkdf(key, utf8(String(fpG) + '|' + String(fpH)), 'fm-sas', 3)
      .then(function (b) { return b32encode(b).slice(0, 5); });
  };

  S.randomBytes = randomBytes;
  S.b64url = b64url;
  S.hex = hex;
  S.b32encode = b32encode;
  S.b32decode = b32decode;
  S.toCode = toCode;
  S.fromCode = fromCode;

  /* A room's identity. `sk` is the secret; `sid` salts every derivation so two rooms that somehow drew
     the same secret still derive different keys. Both are S6's business (the rendezvous) — S3 needs them
     only because the host record and the guest's linked copy carry them (§12.1, §12.2). */
  S.newRoom = function () {
    return { sid: b64url(randomBytes(16)), sk: b64url(randomBytes(16)), created: Date.now() };
  };

  /* ═══ THE AUTH HANDSHAKE (§14.6) ══════════════════════════════════════════════════════════════
   *
   *   H→G {t:'auth1', v, nH}
   *   G→H {t:'auth2', nG, mode, mid?, mac}
   *   H→G {t:'auth3', mac}   |  {t:'deny', why:'auth'}
   *
   * ⚠️ IT BINDS THE FINGERPRINTS, and that is the whole point rather than a detail. A MAC over the
   * shared key alone proves only that the far end knows the key; it says nothing about WHICH encrypted
   * channel it is speaking over. A relay that terminated DTLS and made its own certificates sees
   * different fingerprints on each side, so the two MACs are computed over different strings.
   *
   * ⚠️ THAT REFUSES A RELAY THAT DOES NOT HOLD `mk`, WHICH ON THE CODE PATH IS NOT THE THREAT. `mk`
   * travels inside the offer code, so a relay that can rewrite the code holds it and can recompute both
   * MACs over whatever fingerprints each leg really has — see the file header. What it cannot do is make
   * the two SIDES agree: `sas` comes back on both sides of this function, derived from the key and the
   * fingerprints of THAT leg, and the owner may not admit anybody until he has confirmed the guest is
   * reading the same five characters. The refusals below are the machine's half; the SAS is the half
   * only the two people can do.
   *
   * ⚠️ AND IT MUST OWN `ctl` WHILE IT RUNS. The handshake borrows `ep.onmessage`, and hands it back
   * exactly as it found it — a session attached before auth finished would see `auth1` as an unknown
   * control message (harmless) but, much worse, a DENIED peer would already be wired to the document.
   * So `handshake()` resolves before anything binds the link, and rejects by CLOSING the endpoint. */
  const AUTH_TIMEOUT = 15000;
  /* The refusals that travel with their reason (§22 has a sentence for each). */
  const DENY_WHY = Object.create(null);
  ['auth', 'removed', 'full', 'ended', 'busy'].forEach(function (k) { DENY_WHY[k] = 1; });

  function macFor(which, sid, fpG, fpH, nH, nG) {
    return 'fm-auth-' + which + '|' + sid + '|' + fpG + '|' + fpH + '|' + nH + '|' + nG;
  }

  /* `side` is 'host' or 'guest'. `key` is the raw key bytes (mk for mode 'conn').
     Resolves {mode, mid} on the host and {} on the guest; rejects {why:'auth'|'timeout'|'crypto'}.
     A guest that is REFUSED (a `deny` from the other end) rejects {why, deny:true, proven} — see below. */
  S.handshake = function (ep, opts) {
    const o = opts || {};
    const isHost = o.side === 'host';
    /* ⚠️ THE PARENTHESES ARE THE GUARD (queue 921 S3 review). `?:` binds LOOSER than `||`, so
       `String(isHost ? o.fpLocal : o.fpRemote || '')` parsed as `String(isHost ? o.fpLocal : (o.fpRemote
       || ''))` — the default reached the guest branch only, and a host with no fingerprint got the
       string "null", which is truthy, so the refusal three lines down could not fire and the MAC was
       computed over the literal text "null" in place of a certificate. It failed closed by luck rather
       than by the check written for it. */
    const fpH = String((isHost ? o.fpLocal : o.fpRemote) || '');
    const fpG = String((isHost ? o.fpRemote : o.fpLocal) || '');
    const sid = String(o.sid || '');
    const key = o.key;
    /* S6: on the relay the host does not know which key the guest holds until `auth2` says — the room's
       own (mode 'link' / 'code') or the member token it was given when it was first let in ('tok'). So a
       host may pass `keyFor(mode, mid)` instead of `key`, answering the key or {deny: why}. */
    const keyFor = typeof o.keyFor === 'function' ? o.keyFor : null;
    if ((!key && !keyFor) || !fpH || !fpG) return Promise.reject({ why: 'auth' });
    return new Promise(function (resolve, reject) {
      const prev = ep.onmessage;
      let done = false, nH = null, nG = null, sentAuth3 = false;
      const hostInfo = { sid: sid, nm: '', cl: '' };   // what auth1 said about the room; the guest's only source
      const timer = setTimeout(function () { fail('timeout'); }, o.timeoutMs || AUTH_TIMEOUT);
      function stop() { done = true; clearTimeout(timer); ep.onmessage = prev || null; }
      function fail(why, extra) {
        if (done) return;
        stop();
        /* The reason travels only when it is one the other device has a sentence for (§22); anything
           else — a timeout, a crypto failure, a wrong MAC — is `auth`, which says nothing useful to a
           peer that is probing. */
        try { ep.send('ctl', { t: 'deny', why: DENY_WHY[why] ? why : 'auth' }); } catch (e) {}
        try { ep.close(); } catch (e) {}
        reject(Object.assign({ why: why || 'auth' }, extra || {}));
      }
      /* ⚠️ A REFUSAL IS ONLY BELIEVED WHEN IT IS SIGNED (S6 review). The guest used to take a `deny`
         at its word before auth3 had proved who sent it — and anybody holding the link or the code can
         answer an offer first, so anybody could tell a member "removed" and its reconnect gave up for
         good. So a host that refuses a key it KNOWS (a member it removed, whose token it keeps just for
         this) MACs the refusal with that key and both nonces, and the guest reports `proven` only when
         the MAC checks. Everything else — no MAC, a wrong one, a refusal before auth1 — is a claim. */
      function failSigned(why, k) {
        if (done) return;
        stop();
        S.hmac(k, macFor('d-' + why, sid, fpG, fpH, nH, nG)).then(null, function () { return null; }).then(function (mac) {
          try { ep.send('ctl', { t: 'deny', why: DENY_WHY[why] ? why : 'auth', mac: mac || undefined }); } catch (e) {}
          try { ep.close(); } catch (e) {}
          reject({ why: why || 'auth' });
        });
      }
      function ok(v) { if (done) return; stop(); resolve(v || {}); }

      ep.onmessage = function (ch, msg) {
        if (ch !== 'ctl' || !msg || typeof msg !== 'object') return;
        /* ⚠️ THE HOST HAS SAID auth3 AND IS STILL DERIVING THE LETTERS (S6). The guest answers auth3 with
           its `hello` the moment its own check passes, and the host's `sas` is one more WebCrypto call —
           so a quick guest's hello can land HERE, on a handler that only understands auth, and be dropped:
           the owner's side then waits twenty seconds for a hello that already came. Kept for whoever takes
           the link next (`_early`, read by the UI's `awaitHello`), bounded like every pre-admission buffer. */
        if (isHost && sentAuth3) {
          if (msg.t !== 'deny' && msg.t !== 'auth2') { const q = ep._early = ep._early || []; if (q.length < 8) q.push({ ch: ch, msg: msg }); }
          return;
        }
        if (msg.t === 'deny') {
          const said = DENY_WHY[msg.why] ? msg.why : 'auth';
          if (isHost || typeof msg.mac !== 'string' || !key || !nH || !nG) return fail(said, { deny: true, proven: false });
          const mac = msg.mac;
          S.hmac(key, macFor('d-' + said, hostInfo.sid, fpG, fpH, nH, nG)).then(function (want) {
            fail(said, { deny: true, proven: want.length === mac.length && want === mac });
          }, function () { fail(said, { deny: true, proven: false }); });
          return;
        }
        if (isHost) {
          if (msg.t !== 'auth2' || typeof msg.nG !== 'string' || typeof msg.mac !== 'string') return;
          if (nG !== null) return;                    // one auth2 per handshake; a second is noise
          nG = msg.nG;
          const mode = typeof msg.mode === 'string' ? msg.mode.slice(0, 8) : 'conn';
          const mid = typeof msg.mid === 'string' ? msg.mid.slice(0, 32) : null;
          Promise.resolve(keyFor ? keyFor(mode, mid) : key).then(function (k) {
            if (done) return;
            if (k && k.deny) return (k.key instanceof Uint8Array && k.key.length) ? failSigned(k.deny, k.key) : fail(k.deny);
            if (!(k instanceof Uint8Array) || !k.length) return fail('auth');
            return S.hmac(k, macFor('g', sid, fpG, fpH, nH, nG)).then(function (want) {
              /* Constant-time is pointless over a network the attacker cannot re-time to a microsecond,
                 but a LENGTH check before the compare is not: a truncated mac must fail as a mac, not as
                 a shorter string that happens to prefix-match. */
              if (want.length !== msg.mac.length || want !== msg.mac) return fail('auth');
              return S.hmac(k, macFor('h', sid, fpG, fpH, nH, nG)).then(function (macH) {
                ep.send('ctl', { t: 'auth3', mac: macH });
                sentAuth3 = true;
                /* …and the five letters the two people compare. Derived from the SAME fingerprints this
                   leg used, so a relay holding `mk` gets a different answer on each side (see the file
                   header). Resolving only after it is ready keeps the UI from having a gate with nothing
                   to show. */
                return S.sas(k, fpG, fpH).then(function (sas) { ok({ mode: mode, mid: mid, sas: sas }); });
              });
            });
          }).catch(function () { fail('crypto'); });
          return;
        }
        if (msg.t === 'auth1') {
          if (typeof msg.nH !== 'string') return fail('auth');
          nH = msg.nH;
          nG = b64url(randomBytes(16));
          /* The guest MACs over the sid the HOST stated. It has no other source for it on the code
             path, and a wrong one simply fails the compare — which is the honest outcome. */
          if (typeof msg.sid === 'string') { hostInfo.sid = msg.sid.slice(0, 64); }
          if (typeof msg.nm === 'string') hostInfo.nm = msg.nm.slice(0, 32);
          if (typeof msg.cl === 'string') hostInfo.cl = msg.cl.slice(0, 7);
          S.hmac(key, macFor('g', hostInfo.sid, fpG, fpH, nH, nG)).then(function (macG) {
            ep.send('ctl', { t: 'auth2', nG: nG, mode: o.mode || 'conn', mid: o.mid || undefined, mac: macG });
          }).catch(function () { fail('crypto'); });
          return;
        }
        if (msg.t === 'auth3') {
          if (typeof msg.mac !== 'string' || !nH || !nG) return fail('auth');
          S.hmac(key, macFor('h', hostInfo.sid, fpG, fpH, nH, nG)).then(function (want) {
            if (want.length !== msg.mac.length || want !== msg.mac) return fail('auth');
            return S.sas(key, fpG, fpH).then(function (sas) { ok({ host: hostInfo, sas: sas }); });
          }).catch(function () { fail('crypto'); });
        }
      };

      if (isHost) {
        nH = b64url(randomBytes(16));
        /* `sid`, `nm` and `cl` ride on auth1 (queue 921 S3, a deliberate addition to §14.6's line).
           On the CODE path there is no rendezvous and no invite link, so the joining device has no
           other way to learn the room id it must write onto its linked copy (§12.2 `createLinked`), or
           the host's name to put on that card — `welcome` carries neither. They are unauthenticated at
           this instant, which is exactly right for what they are: a display name and a room id. The MAC
           that follows one line later covers `sid`, so a peer that lied about it cannot then agree
           about the key; the name is cosmetic and is clamped like every other peer string (§14.9). */
        ep.send('ctl', { t: 'auth1', v: 1, nH: nH, sid: sid, nm: (o.info && o.info.nm) || undefined, cl: (o.info && o.info.cl) || undefined });
      }
    });
  };

  /* ═══════════════════════════════════════════════════════════════════════════════════════════════
   * S6 — THE RELAY: room codes, invite links, the sealed envelope, three drivers and one rendezvous.
   *
   * What the relays are for, in one line: two devices that have never met have to swap ~170 bytes each
   * (the minimal offer and answer above) before they can talk directly. Codes-only does that swap by hand;
   * this does it through three free public services at once — PeerJS's cloud server on 443 and two public
   * MQTT brokers — so that any ONE of them being down, blocked or slow costs nothing.
   *
   * ⚠️ THE RELAYS SEE ADDRESSES AND TIMING, NEVER THE PROJECT AND NEVER A FINGERPRINT (§14.3). Every
   * rendezvous message is sealed with AES-GCM under a key derived from the invite, with the topic as
   * associated data, so a relay holds ciphertext, a random topic name, a random peer tag and a clock. The
   * SDP (and with it the DTLS fingerprint the auth handshake binds) is inside the seal; the document never
   * goes near a relay at all — it crosses the data channel afterwards, which is encrypted end to end.
   *
   * ⚠️ WHO CAN SIT IN THE MIDDLE, STATED EXACTLY (§14.6's warning, answered for S6). The auth handshake
   * binds K to both DTLS fingerprints, so a relay operator — who never holds the invite — cannot insert
   * itself: it cannot open an envelope to learn the SDP, and it cannot forge the MACs over its own
   * certificates. Somebody who HOLDS THE LINK OR THE CODE is different: they can decrypt a joiner's offer,
   * answer it first, and relay both legs. That person could also simply join, which is what the knock is
   * for, so the five SAS letters are shown on the knock card and on the joiner's "waiting" line — the
   * same check S3 gates the connection codes on, offered here rather than forced, because the link's
   * whole promise is "tap it and you're in". The link and the code are bearer secrets and the UI says so.
   *
   * ⚠️ NOTHING HERE RUNS UNTIL A SESSION ASKS FOR IT (§23). No socket is opened at load, at Labs-on, or
   * at Share when Codes only is set: every driver asks `relayGate()` immediately before it constructs a
   * WebSocket, and the gate says no for Codes only. It also says no on a LOOPBACK page unless the socket
   * class in use is a test fake (`WebSocket.FM_FAKE`) or the page opted in with `?fmrelay=1` — which makes
   * "the suite must not need the network" a lock rather than a habit: a test that forgets to install the
   * fake broker gets a refused driver, not a connection to broker.emqx.io from his Mac.
   * ═══════════════════════════════════════════════════════════════════════════════════════════════ */

  function lim(k, d) { const v = C.LIMITS && C.LIMITS[k]; return typeof v === 'number' ? v : d; }
  function nowMs() { return Date.now(); }
  const CTRL = /[\u0000-\u001f\u007f-\u009f]/g;

  function fromB64url(s) {
    const t = String(s == null ? '' : s);
    if (!t.length || !/^[A-Za-z0-9_-]+$/.test(t) || t.length % 4 === 1) return null;
    let b = t.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    let bin;
    try { bin = atob(b); } catch (e) { return null; }
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  S.fromB64url = fromB64url;

  /* ── the 9-character room code (§14.1) ────────────────────────────────────────────────────────
   * 45 bits in Crockford base32, read aloud as `K7F-Q2M-9XD`. The reader folds I/L→1 and O→0 and drops
   * dashes and spaces, so the characters people mishear cannot produce a different code. */
  const ROOM_CODE_LEN = 9;
  S.newRoomCode = function () { return b32encode(randomBytes(6)).slice(0, ROOM_CODE_LEN); };
  S.normRoomCode = function (s) {
    const t = String(s == null ? '' : s).toUpperCase().replace(/[\s\-_.]/g, '');
    if (t.length !== ROOM_CODE_LEN) return null;
    let out = '';
    for (let i = 0; i < t.length; i++) {
      const v = B32REV[t[i]];
      if (v === undefined) return null;
      out += B32[v];
    }
    return out;
  };
  S.fmtRoomCode = function (c) {
    const n = S.normRoomCode(c);
    return n ? n.slice(0, 3) + '-' + n.slice(3, 6) + '-' + n.slice(6) : '';
  };

  /* PBKDF2 over the code, 200 000 rounds (§14.1). 45 bits is a lot of guessing for a person and very
     little for a machine, so the stretch is what makes "try every code against the public topic list"
     cost more than it could ever win. Cached per code: the host derives it once per arm, a guest once
     per join, and a reconnect every few seconds must not pay 200 000 rounds each time. */
  const CODE_SALT = 'freemotion-collab-code-v1';
  const codeCache = Object.create(null);
  let codeCacheN = 0;
  S.codeSecret = function (code) {
    const c = S.normRoomCode(code);
    if (!c) return Promise.reject({ why: 'bad-code' });
    if (codeCache[c]) return codeCache[c];
    const sub = subtle();
    if (!sub) return Promise.reject({ why: 'crypto' });
    if (++codeCacheN > 32) { Object.keys(codeCache).forEach(function (k) { delete codeCache[k]; }); codeCacheN = 1; }
    const p = sub.importKey('raw', utf8(c), 'PBKDF2', false, ['deriveBits'])
      .then(function (k) { return sub.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: utf8(CODE_SALT), iterations: 200000 }, k, 256); })
      .then(function (buf) { return new Uint8Array(buf); });
    codeCache[c] = p;
    p.catch(function () { delete codeCache[c]; });
    return p;
  };

  /* The four labels of §14.1, from one secret. `env` is a non-extractable AES-GCM key; `auth` is the
     HMAC key the handshake uses; `topic` and `pjs` are the only two things derived from the secret that a
     relay ever sees, and both are one-way. */
  S.deriveKeys = function (ikm, salt) {
    const sub = subtle();
    if (!sub) return Promise.reject({ why: 'crypto' });
    return Promise.all([S.hkdf(ikm, salt, 'fm-env', 32), S.hkdf(ikm, salt, 'fm-auth', 32),
      S.hkdf(ikm, salt, 'fm-topic', 16), S.hkdf(ikm, salt, 'fm-pjs', 12)]).then(function (r) {
      return sub.importKey('raw', r[0], { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']).then(function (env) {
        return Object.freeze({ env: env, auth: r[1], topic: hex(r[2]), pjs: 'fmh' + hex(r[3]) });
      });
    });
  };
  /* The link: ikm = sk, salt = sid (§14.1). */
  S.linkKeys = function (room) {
    const sid = fromB64url(room && room.sid), sk = fromB64url(room && room.sk);
    if (!sid || sid.length !== 16 || !sk || sk.length !== 16) return Promise.reject({ why: 'bad-link' });
    return S.deriveKeys(sk, sid);
  };
  /* 📐 THE CODE'S HKDF SALT IS THE PBKDF2 SALT, because §14.1 says only "the same four labels are derived
     from C" and names no salt — and the one value a joiner who has only the nine characters can know is
     a constant. It must differ from anything a link could produce, and a link's salt is 16 random bytes. */
  S.codeKeys = function (code) {
    return S.codeSecret(code).then(function (c) { return S.deriveKeys(c, utf8(CODE_SALT)); });
  };

  /* ── the members' room (S6 review) ─────────────────────────────────────────────────────────────
   * ⚠️ A MEMBER COMING BACK NEVER USES THE LINK OR THE CODE ANY MORE. It did, and that was three
   * findings at once: every reconnect offer — a name, a colour and an SDP with the phone's public
   * address, every 3 s for two minutes whenever a phone locked — was sealed with the ROOM's key, so
   * anybody holding the link could read it, including somebody the owner had removed; the same person
   * could answer it first and tell the member it was removed, which its reconnect believed for good; and
   * the owner could not change the link after a removal without cutting every other member loose.
   * So each room also has a `hub`: 16 random bytes the owner keeps and hands ONLY to members, in their
   * welcome, beside their token. The hub names one topic and one PeerJS id, and each member seals its
   * envelopes there with a key derived from ITS OWN TOKEN — so a member's reconnect can be opened, and
   * answered, only by the owner and by that member. Resetting the link and code leaves the hub alone. */
  const HUB_SALT = 'freemotion-collab-hub-v1';
  S.hubKeys = function (hub) {
    const h = fromB64url(hub);
    if (!h || h.length !== 16) return Promise.reject({ why: 'bad-link' });
    return S.deriveKeys(h, utf8(HUB_SALT)).then(function (k) { return Object.freeze({ topic: k.topic, pjs: k.pjs }); });
  };
  /* One member's keys in the hub: the hub's topic and id, an envelope key only that member's token can
     make, and the token itself as the handshake key. */
  S.memberKeys = function (hk, rid, tok) {
    const sub = subtle();
    const t = fromB64url(tok);
    if (!sub || !hk || !hk.topic) return Promise.reject({ why: 'crypto' });
    if (!t || t.length !== 16 || typeof rid !== 'string' || !/^r[0-9a-f]{16}$/.test(rid)) return Promise.reject({ why: 'bad-link' });
    return S.hkdf(t, utf8('fm-member|' + rid), 'fm-menv', 32).then(function (raw) {
      return sub.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }).then(function (env) { return Object.freeze({ env: env, auth: t, topic: hk.topic, pjs: hk.pjs }); });
  };
  S.memberRoom = function (hub, rid, tok) {
    return S.hubKeys(hub).then(function (hk) { return S.memberKeys(hk, rid, tok); })
      .then(function (keys) { return { kind: 'member', rid: rid, keys: keys }; });
  };

  /* ── the invite link (§14.1) ──────────────────────────────────────────────────────────────────
   * `https://builderezra.github.io/FreeMotion/#j=` + base64url(0x01 ‖ sid ‖ sk): 44 characters.
   * 📐 THE LIVE ADDRESS, NOT `location`: a link made on a Mac running a local copy would otherwise point
   * the phone at 127.0.0.1, which is a link that can never work. The reader below accepts any address —
   * only the fragment matters — so a link typed from a different host still reads. */
  S.APP_URL = 'https://builderezra.github.io/FreeMotion/';
  S.inviteJ = function (room) {
    const sid = fromB64url(room && room.sid), sk = fromB64url(room && room.sk);
    if (!sid || sid.length !== 16 || !sk || sk.length !== 16) return null;
    const b = new Uint8Array(33);
    b[0] = 1; b.set(sid, 1); b.set(sk, 17);
    return b64url(b);
  };
  S.inviteLink = function (room) { const j = S.inviteJ(room); return j ? S.APP_URL + '#j=' + j : null; };
  S.linkFromJ = function (j) { return /^[A-Za-z0-9_-]{44}$/.test(String(j == null ? '' : j)) ? S.APP_URL + '#j=' + j : null; };
  S.roomFromJ = function (j) {
    if (!/^[A-Za-z0-9_-]{44}$/.test(String(j == null ? '' : j))) return null;
    const b = fromB64url(j);
    if (!b || b.length !== 33 || b[0] !== 1) return null;
    return { sid: b64url(b.subarray(1, 17)), sk: b64url(b.subarray(17, 33)), j: j };
  };
  /* ⚠️ THE FRAGMENT ONLY. A `?j=` in the query is never read — GitHub Pages logs every query string it
     serves and never sees a fragment, so an invite that could be read from the query is one that could
     have been read by the server too. */
  S.parseInvite = function (text) {
    const s = String(text == null ? '' : text).trim();
    const at = s.indexOf('#');
    if (at < 0) return null;
    const m = /(?:^|&)j=([A-Za-z0-9_-]{44})(?:&|$)/.exec(s.slice(at + 1));
    return m ? S.roomFromJ(m[1]) : null;
  };
  /* What a person pasted into the Join sheet: an invite link, a 9-character room code, or a connection
     code (`FM1-…`, the S3 path). A room code is exactly nine characters after folding; a connection code
     is never nine, so the two cannot be confused even when a room code happens to start with FM1. */
  S.classify = function (text) {
    const s = String(text == null ? '' : text).trim();
    if (!s) return null;
    const inv = S.parseInvite(s);
    if (inv) return { kind: 'link', sid: inv.sid, sk: inv.sk, j: inv.j };
    const rc = S.normRoomCode(s);
    if (rc) return { kind: 'code', code: rc };
    if (S.isConnCode(s)) return { kind: 'conn', code: s };
    return null;
  };

  /* ── the envelope (§14.3) ─────────────────────────────────────────────────────────────────────
   *   {v:1, n:b64url(12-byte iv), c:b64url(AES-GCM(K_env, iv, utf8(JSON inner), AAD = utf8(topic)))}
   *   inner = {t:'offer'|'answer'|'here', from, to, ts, sdp?, re?, nm?, cl?}
   * `re` is an addition to §14.3's list: an answer names the envelope nonce of the offer it answers, so
   * a guest that has moved on to its next attempt can never pair an old answer with a new peer connection
   * (ICE would then sit in "checking" for twenty seconds on credentials that belong to a closed one). */
  const TAG_RE = /^[0-9a-f]{16}$/;
  const N_RE = /^[A-Za-z0-9_-]{16}$/;
  const ENV_C_MAX = 4096;
  function cleanInner(x) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
    if (x.t !== 'offer' && x.t !== 'answer' && x.t !== 'here') return null;
    if (typeof x.from !== 'string' || !TAG_RE.test(x.from)) return null;
    const to = x.to == null ? null : x.to;
    if (to !== null && (typeof to !== 'string' || !TAG_RE.test(to))) return null;
    if (typeof x.ts !== 'number' || !isFinite(x.ts)) return null;
    const out = { t: x.t, from: x.from, to: to, ts: x.ts };
    if (x.sdp != null) {
      if (typeof x.sdp !== 'string' || x.sdp.length > 1200 || !/^FM1(-[0-9A-Z]{1,5})+$/.test(x.sdp)) return null;
      out.sdp = x.sdp;
    }
    if (x.re != null) {
      if (typeof x.re !== 'string' || !N_RE.test(x.re)) return null;
      out.re = x.re;
    }
    if (typeof x.nm === 'string') out.nm = x.nm.replace(CTRL, '').trim().slice(0, 32);
    if (typeof x.cl === 'string' && /^#[0-9a-fA-F]{6}$/.test(x.cl)) out.cl = x.cl.toLowerCase();
    if (out.t !== 'here' && !out.sdp) return null;
    if (out.t === 'answer' && (!out.to || !out.re)) return null;
    return out;
  }
  S.cleanInner = cleanInner;

  S.seal = function (keys, inner) {
    const sub = subtle();
    if (!sub || !keys || !keys.env) return Promise.reject({ why: 'crypto' });
    const iv = randomBytes(12);
    return sub.encrypt({ name: 'AES-GCM', iv: iv, additionalData: utf8(keys.topic) }, keys.env, utf8(JSON.stringify(inner)))
      .then(function (ct) { return { v: 1, n: b64url(iv), c: b64url(new Uint8Array(ct)) }; });
  };
  /* Resolves the validated inner, or null. Never rejects: everything a relay hands over is untrusted and
     most of what fails here is simply somebody else's traffic on a busy public broker. */
  S.openEnvelope = function (keys, env) {
    if (!keys || !keys.env || !env || typeof env !== 'object' || env.v !== 1 || typeof env.n !== 'string' || typeof env.c !== 'string') return Promise.resolve(null);
    if (!N_RE.test(env.n) || env.c.length > ENV_C_MAX) return Promise.resolve(null);
    const iv = fromB64url(env.n), ct = fromB64url(env.c);
    if (!iv || iv.length !== 12 || !ct || ct.length < 17) return Promise.resolve(null);
    const sub = subtle();
    if (!sub) return Promise.resolve(null);
    return sub.decrypt({ name: 'AES-GCM', iv: iv, additionalData: utf8(keys.topic) }, keys.env, ct).then(function (pt) {
      let x = null;
      try { x = JSON.parse(new TextDecoder().decode(pt)); } catch (e) { return null; }
      return cleanInner(x);
    }, function () { return null; });
  };

  /* ── the receiver's rules (§14.3) ─────────────────────────────────────────────────────────────
   * Decrypted but stale (|ts − now| > 120 s), a nonce seen in the last ten minutes, or an offer past the
   * rate: refused. The nonce cache is ALSO the de-duplication §14.4 asks for — the same envelope arrives
   * once per driver, and only the first is ever acted on. A nonce is only remembered once it has
   * DECRYPTED, so a flood of junk cannot fill the cache and push a real nonce out of it. */
  S.guard = function (opts) {
    const o = opts || {};
    const now = o.now || nowMs;
    const seen = new Map();
    let offers = [];
    const G = {
      rejected: { stale: 0, replay: 0, flood: 0 },
      seen: function (n) { const e = seen.get(n); return e !== undefined && e > now(); },
      check: function (env, inner, kind) {
        const t = now();
        if (Math.abs(inner.ts - t) > lim('ENV_SKEW', 120000)) { G.rejected.stale++; return 'stale'; }
        if (G.seen(env.n)) { G.rejected.replay++; return 'replay'; }
        seen.set(env.n, t + lim('NONCE_TTL', 600000));
        if (seen.size > 2048) {
          seen.forEach(function (exp, k) { if (exp <= t) seen.delete(k); });
          while (seen.size > 2048) seen.delete(seen.keys().next().value);
        }
        /* ⚠️ THE ROOM-WIDE CAP IS PER KIND OF DOOR (S6 review): members coming back through the hub and
           strangers knocking through the link or the code do not share one budget, so thirty offers a
           minute from anybody holding the code cannot lock every member's reconnect out. */
        if (o.isHost && inner.t === 'offer') {
          const k = kind === 'member' ? 'member' : 'join';
          offers = offers.filter(function (x) { return t - x.t < 60000; });
          let mine = 0, door = 0;
          for (let i = 0; i < offers.length; i++) { if (offers[i].from === inner.from) mine++; if (offers[i].k === k) door++; }
          if (mine >= lim('OFFERS_PER_MIN', 10) || door >= lim('OFFERS_ALL_PER_MIN', 30)) { G.rejected.flood++; return 'flood'; }
          offers.push({ t: t, from: inner.from, k: k });
        }
        return null;
      }
    };
    return G;
  };

  /* ── may this page open a socket at all ───────────────────────────────────────────────────────── */
  const LOOP_HOST = /^(127\.0\.0\.1|localhost|\[::1\]|::1|[a-z0-9-]+\.localhost)$/i;
  function onLoopback() { try { return LOOP_HOST.test(location.hostname); } catch (e) { return false; } }
  function relayOptIn() { try { return /(^|[?&])fmrelay=1(&|$)/.test(location.search); } catch (e) { return false; } }
  S.codesOnly = function () {
    try { return !!(FM.settings && FM.settings.get && FM.settings.get('collabCodesOnly')); } catch (e) { return false; }
  };
  S.relayGate = function () {
    if (S.codesOnly()) return { ok: false, why: 'codes-only' };
    const WS = window.WebSocket;
    if (typeof WS !== 'function') return { ok: false, why: 'no-ws' };
    if (onLoopback() && !WS.FM_FAKE && !relayOptIn()) return { ok: false, why: 'loopback' };
    return { ok: true, WS: WS };
  };
  /* §14.4: two public STUN servers so a device behind a home router can learn its own public address.
     📐 EMPTY WHEN CODES ONLY IS SET, WHETHER OR NOT THE DEVICE IS ONLINE. §14.4 says "[] when Codes only is
     set AND the device is offline", which would still send his address to Google and Cloudflare from the
     one mode whose whole promise (§2 D3, §19.8) is "needs no third party". A STUN server is a third party;
     the safer reading is the one the setting's own label makes. Also empty offline (nothing to reach) and
     on a loopback page (the suite must not touch the network — see relayGate). The connection-code path
     (S3) keeps `[]` as well: it is the fully serverless path, and the fallback for when relays are
     blocked, so it must not depend on a server either. */
  S.STUN = Object.freeze([{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }]);
  S.iceServers = function () {
    if (S.codesOnly()) return [];
    try { if (navigator.onLine === false) return []; } catch (e) {}
    if (onLoopback() && !relayOptIn()) return [];
    return S.STUN.map(function (s) { return { urls: s.urls }; });
  };

  /* ── MQTT 3.1.1, the four packets this needs and nothing else (§14.4) ────────────────────────────
   * CONNECT (clean session), SUBSCRIBE at QoS 0, PUBLISH at QoS 0, PINGREQ, DISCONNECT. Hand-written
   * rather than a library because a library is 40 KB of client for five packet types, would have to be
   * fetched from a CDN at the moment a join starts, and would be one more thing that can change under
   * him. Over a WebSocket with the `mqtt` subprotocol, as both brokers require. */
  function mqttVarLen(n) {
    const out = [];
    do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; out.push(b); } while (n > 0);
    return out;
  }
  function mqttStr(s) {
    const u = utf8(s);
    const out = [(u.length >> 8) & 255, u.length & 255];
    for (let i = 0; i < u.length; i++) out.push(u[i]);
    return out;
  }
  function mqttPacket(first, body) {
    const head = [first].concat(mqttVarLen(body.length));
    const out = new Uint8Array(head.length + body.length);
    out.set(head, 0); out.set(body, head.length);
    return out;
  }
  const MQ = S.mqtt = {
    connect: function (clientId, keepalive) {
      const ka = keepalive | 0;
      return mqttPacket(0x10, [0, 4, 77, 81, 84, 84, 4, 2, (ka >> 8) & 255, ka & 255].concat(mqttStr(clientId)));
    },
    subscribe: function (pid, topics) {
      let body = [(pid >> 8) & 255, pid & 255];
      topics.forEach(function (t) { body = body.concat(mqttStr(t)); body.push(0); });
      return mqttPacket(0x82, body);
    },
    publish: function (topic, payload) {
      const t = mqttStr(topic);
      const body = new Uint8Array(t.length + payload.length);
      body.set(t, 0); body.set(payload, t.length);
      return mqttPacket(0x30, body);
    },
    pingreq: function () { return new Uint8Array([0xC0, 0]); },
    disconnect: function () { return new Uint8Array([0xE0, 0]); },
    /* A stream reader: a WebSocket message may carry several MQTT packets or half of one. Returns the
       whole packets so far, or null for a stream that cannot be MQTT (a length field over four bytes, or
       more buffered than any packet this client could want). */
    reader: function (maxBytes) {
      let buf = new Uint8Array(0);
      const cap = maxBytes || 65536;
      return function (chunk) {
        const c = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
        if (buf.length + c.length > cap) return null;
        const nb = new Uint8Array(buf.length + c.length);
        nb.set(buf, 0); nb.set(c, buf.length);
        buf = nb;
        const out = [];
        for (;;) {
          if (buf.length < 2) break;
          let len = 0, mul = 1, i = 1, complete = false;
          while (i < buf.length && i <= 4) {
            const b = buf[i++];
            len += (b & 127) * mul;
            mul *= 128;
            if (!(b & 128)) { complete = true; break; }
          }
          if (!complete) { if (i > 4) return null; break; }
          if (buf.length < i + len) break;
          out.push({ type: buf[0] >> 4, flags: buf[0] & 15, body: buf.slice(i, i + len) });
          buf = buf.slice(i + len);
        }
        return out;
      };
    }
  };

  /* ── the drivers ──────────────────────────────────────────────────────────────────────────────
   * Each has the same five-member face — start, stop, kick, send, state — so the rendezvous never knows
   * which one it is talking to. A driver RETRIES ON ITS OWN (3 s, then 10 s, then 30 s) while it is
   * started, and a refusal from `relayGate` (Codes only, loopback) is NOT retried: waiting does not
   * change either answer. */
  function backoffFor(fails) { return fails <= 3 ? lim('RETRY_FAST', 3000) : fails <= 10 ? lim('RETRY_MID', 10000) : lim('RETRY_SLOW', 30000); }

  function MqttDriver(o) {
    const d = { name: o.name, kind: 'mqtt', url: o.url, state: 'idle', why: null, frames: 0 };
    let ws = null, started = false, retryT = null, pingT = null, pid = 0, fails = 0, read = null, gen = 0;
    /* ⚠️ A PING THAT IS NEVER ANSWERED IS A DEAD SOCKET (S6 review). PINGRESP was ignored, so a socket
       whose path died without a FIN — a phone that changed network, a NAT that forgot it — stayed 'up'
       until the OS gave up on it, and kick() skips an 'up' driver, so coming back to the app could not
       repair it either: the Share panel said "live" while no offer could reach him. Now any packet from
       the broker answers the outstanding ping, and a ping still unanswered when the next is due (or
       PING_WAIT after a kick) takes the driver down, which reconnects it. */
    let pingOut = 0, kickT = null;
    const ka = (o.keepalive | 0) || lim('MQTT_KEEPALIVE', 30);
    const clientId = 'fm' + hex(randomBytes(8));
    function set(st, why) {
      const w = why || null;
      if (d.state === st && d.why === w) return;
      d.state = st; d.why = w;
      if (o.onState) o.onState(d);
    }
    function subs() {
      const out = [];
      o.rooms.forEach(function (r) {
        const base = 'fm1/' + r.keys.topic;
        if (o.role === 'host') out.push(base);
        else { out.push(base + '/' + o.tag); out.push(base); }
      });
      return out;
    }
    function teardown() {
      if (pingT) { clearInterval(pingT); pingT = null; }
      if (kickT) { clearTimeout(kickT); kickT = null; }
      pingOut = 0;
      const w = ws; ws = null;
      if (!w) return;
      w.onopen = null; w.onmessage = null; w.onclose = null; w.onerror = null;
      try { if (w.readyState === 1) w.send(MQ.disconnect()); } catch (e) {}
      try { w.close(); } catch (e) {}
    }
    function schedule() {
      if (!started || retryT) return;
      fails++;
      retryT = setTimeout(function () { retryT = null; open(); }, backoffFor(fails));
    }
    function lost(why) { teardown(); if (!started) return; set('down', why); schedule(); }
    function open() {
      if (!started) return;
      teardown();
      const g = S.relayGate();
      if (!g.ok) { set('down', g.why); return; }
      set('connecting');
      const my = ++gen;
      let w;
      try { w = new g.WS(o.url, ['mqtt']); } catch (e) { set('down', 'ws'); schedule(); return; }
      ws = w;
      try { w.binaryType = 'arraybuffer'; } catch (e) {}
      read = MQ.reader(64 * 1024);
      w.onopen = function () { if (my !== gen) return; try { w.send(MQ.connect(clientId, ka)); } catch (e) {} };
      w.onmessage = function (e) {
        if (my !== gen) return;
        const data = e && e.data;
        let bytes = null;
        if (data instanceof ArrayBuffer) bytes = new Uint8Array(data);
        else if (data && ArrayBuffer.isView(data)) bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        if (!bytes) return;
        const pk = read(bytes);
        if (pk === null) { lost('malformed'); return; }
        for (let i = 0; i < pk.length && my === gen; i++) handle(pk[i]);
      };
      w.onclose = function () { if (my === gen) lost('closed'); };
      w.onerror = function () { if (my === gen) lost('closed'); };
    }
    function pingWait() { return Math.min(lim('PING_WAIT', 5000), ka * 1000); }
    function ping() {
      if (!ws || ws.readyState !== 1) return;
      if (!pingOut) pingOut = nowMs();
      try { ws.send(MQ.pingreq()); } catch (e) {}
    }
    function handle(p) {
      d.frames++;
      pingOut = 0;                                         // anything from the broker says the socket is alive
      if (p.type === 2) {                                  // CONNACK
        if (p.body.length < 2 || p.body[1] !== 0) { lost('refused'); return; }
        fails = 0;
        pid = (pid % 65535) + 1;
        try { ws.send(MQ.subscribe(pid, subs())); } catch (e) {}
        if (pingT) clearInterval(pingT);
        const my = gen;
        pingT = setInterval(function () {
          if (my !== gen) return;
          if (pingOut) { if (nowMs() - pingOut >= pingWait()) lost('timeout'); return; }   // never answered
          ping();
        }, Math.floor(ka * 1000 * 2 / 3));
        set('up');
        return;
      }
      if (p.type !== 3) return;                            // SUBACK, PINGRESP: nothing more to do
      const b = p.body;
      if (b.length < 2) return;
      const tl = (b[0] << 8) | b[1];
      if (2 + tl > b.length) return;
      const topic = new TextDecoder().decode(b.subarray(2, 2 + tl));
      let at = 2 + tl;
      if ((p.flags >> 1) & 3) at += 2;                     // a broker may upgrade; skip the packet id
      const payload = b.subarray(at);
      if (payload.length > 8192) return;
      for (let i = 0; i < o.rooms.length; i++) {
        const base = 'fm1/' + o.rooms[i].keys.topic;
        if (topic !== base && topic !== base + '/' + o.tag) continue;
        let env = null;
        try { env = JSON.parse(new TextDecoder().decode(payload)); } catch (e) { return; }
        o.onEnv(env, { room: o.rooms[i], via: d.name });
        return;
      }
    }
    d.start = function () { if (started) return; started = true; fails = 0; open(); };
    d.stop = function () { started = false; gen++; if (retryT) { clearTimeout(retryT); retryT = null; } teardown(); set('idle'); };
    d.kick = function () {
      if (!started || d.state === 'connecting') return;
      /* An 'up' socket is ASKED rather than trusted: a foreground is exactly when a path that died while
         the phone slept is found out, and waiting for the next scheduled ping would leave the room
         unreachable for up to twenty seconds after he has come back to it. */
      if (d.state === 'up') {
        if (kickT) return;
        ping();
        const my = gen;
        kickT = setTimeout(function () { kickT = null; if (my === gen && pingOut) lost('timeout'); }, pingWait());
        return;
      }
      if (retryT) { clearTimeout(retryT); retryT = null; }
      open();
    };
    d.send = function (room, env, meta) {
      if (d.state !== 'up' || !ws) return false;
      const base = 'fm1/' + room.keys.topic;
      try { ws.send(MQ.publish(meta && meta.to ? base + '/' + meta.to : base, utf8(JSON.stringify(env)))); return true; } catch (e) { return false; }
    };
    return d;
  }

  /* PeerJS's signalling protocol, spoken directly (§14.4) — NOT the PeerJS library, whose default
     configuration adds its own TURN relays, which D3 rules out. The host registers one deterministic id
     per room (`pjs`, derived from the secret); a guest registers a random one, sends its OFFER to the
     host's id and gets the ANSWER back from the server with `src` filled in. The server answers an offer
     to an id nobody holds with EXPIRE, which is how a guest learns the host is not there yet. */
  function PeerJsDriver(o) {
    const d = { name: 'pjs', kind: 'pjs', url: o.url, state: 'idle', why: null, frames: 0 };
    let started = false;
    const socks = o.role === 'host'
      ? o.rooms.map(function (r) { return { room: r, id: r.keys.pjs }; })
      : [{ room: null, id: 'fmg' + o.tag }];
    socks.forEach(function (s) { s.ws = null; s.st = 'idle'; s.why = null; s.gen = 0; s.fails = 0; s.retryT = null; s.hbT = null; s.takenAt = 0; s.idTries = 0; });
    function agg() {
      const st = socks.some(function (x) { return x.st === 'up'; }) ? 'up'
        : socks.some(function (x) { return x.st === 'connecting'; }) ? 'connecting' : started ? 'down' : 'idle';
      let w = null;
      if (st === 'down') for (let i = 0; i < socks.length; i++) if (socks[i].why) { w = socks[i].why; break; }
      if (d.state === st && d.why === w) return;
      d.state = st; d.why = w;
      if (o.onState) o.onState(d);
    }
    function teardown(s) {
      if (s.hbT) { clearInterval(s.hbT); s.hbT = null; }
      const w = s.ws; s.ws = null;
      if (!w) return;
      w.onopen = null; w.onmessage = null; w.onclose = null; w.onerror = null;
      try { w.close(); } catch (e) {}
    }
    function schedule(s, ms) {
      if (!started || s.retryT) return;
      s.retryT = setTimeout(function () { s.retryT = null; open(s); }, ms);
    }
    function open(s) {
      if (!started) return;
      teardown(s);
      const g = S.relayGate();
      if (!g.ok) { s.st = 'down'; s.why = g.why; agg(); return; }
      s.st = 'connecting'; s.why = null; agg();
      const my = ++s.gen;
      const url = o.url + '?key=peerjs&id=' + encodeURIComponent(s.id) + '&token=' + hex(randomBytes(8)) + '&version=1.5.4';
      let w;
      try { w = new g.WS(url); } catch (e) { s.st = 'down'; s.why = 'ws'; agg(); s.fails++; schedule(s, backoffFor(s.fails)); return; }
      s.ws = w;
      w.onmessage = function (e) {
        if (my !== s.gen) return;
        if (typeof e.data !== 'string' || e.data.length > 16384) return;
        let m = null;
        try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m && typeof m === 'object') handle(s, m);
      };
      const gone = function () {
        if (my !== s.gen) return;
        teardown(s);
        if (!started) return;
        s.st = 'down'; s.why = s.why || 'closed'; agg();
        s.fails++; schedule(s, backoffFor(s.fails));
      };
      w.onclose = gone; w.onerror = gone;
    }
    function handle(s, m) {
      d.frames++;
      switch (m.type) {
        case 'OPEN':
          s.st = 'up'; s.why = null; s.fails = 0; s.takenAt = 0; s.idTries = 0;
          if (s.hbT) clearInterval(s.hbT);
          s.hbT = setInterval(function () { try { if (s.ws && s.ws.readyState === 1) s.ws.send(JSON.stringify({ type: 'HEARTBEAT' })); } catch (e) {} }, lim('PJS_HEARTBEAT', 5000));
          agg();
          return;
        case 'ID-TAKEN': {
          /* ⚠️ AFTER A RELOAD THE HOST'S OLD PAGE STILL HOLDS ITS ID until the server notices that socket is
             gone, which takes up to a minute. The id is derived from the room, so it cannot simply pick
             another: it waits and asks again, for PJS_ID_TAKEN_FOR, and MQTT carries the room meanwhile.
             A guest's id is random, so a guest just draws a new one. */
          const t = nowMs();
          teardown(s);
          if (o.role !== 'host') { s.id = 'fmg' + hex(randomBytes(8)); s.st = 'connecting'; agg(); schedule(s, 250); return; }
          if (!s.takenAt) s.takenAt = t;
          if (t - s.takenAt < lim('PJS_ID_TAKEN_FOR', 60000)) {
            s.idTries++;
            s.st = 'connecting'; s.why = 'id-taken'; agg();
            schedule(s, Math.min(8000, 1000 * Math.pow(2, s.idTries - 1)));
          } else { s.st = 'down'; s.why = 'id-taken'; agg(); }
          return;
        }
        case 'ERROR':
          teardown(s);
          s.st = 'down'; s.why = 'error'; agg();
          s.fails++; schedule(s, backoffFor(s.fails));
          return;
        case 'OFFER':
        case 'ANSWER':
          if (m.payload && typeof m.payload === 'object' && m.payload.env && typeof m.src === 'string' && m.src.length <= 64) {
            o.onEnv(m.payload.env, { room: s.room || o.rooms[0], via: 'pjs', pjs: m.src });
          }
          return;
        case 'EXPIRE':
          if (o.onExpire) o.onExpire({ via: 'pjs', dst: typeof m.src === 'string' ? m.src.slice(0, 64) : null });
          return;
        default: return;
      }
    }
    d.start = function () { if (started) return; started = true; socks.forEach(function (s) { s.fails = 0; open(s); }); };
    d.stop = function () {
      started = false;
      socks.forEach(function (s) { s.gen++; if (s.retryT) { clearTimeout(s.retryT); s.retryT = null; } teardown(s); s.st = 'idle'; s.why = null; });
      agg();
    };
    d.kick = function () {
      if (!started) return;
      socks.forEach(function (s) { if (s.st === 'up' || s.st === 'connecting') return; if (s.retryT) { clearTimeout(s.retryT); s.retryT = null; } open(s); });
    };
    d.send = function (room, env, meta) {
      if (o.role === 'host') {
        const dst = meta && meta.pjs;
        if (!dst) return false;                           // `here` is MQTT's job: PeerJS cannot broadcast
        /* By id, not by object: a member's room (S6 review) is its own object, and rides the hub's socket. */
        const s = socks.filter(function (x) { return x.room === room || (x.room && room && x.room.keys.pjs === room.keys.pjs); })[0];
        if (!s || s.st !== 'up' || !s.ws) return false;
        try { s.ws.send(JSON.stringify({ type: 'ANSWER', dst: dst, payload: { env: env } })); return true; } catch (e) { return false; }
      }
      const s = socks[0];
      if (!s || s.st !== 'up' || !s.ws || (meta && meta.to)) return false;
      try { s.ws.send(JSON.stringify({ type: 'OFFER', dst: room.keys.pjs, payload: { env: env } })); return true; } catch (e) { return false; }
    };
    return d;
  }

  S.RELAYS = Object.freeze({
    pjs: 'wss://0.peerjs.com/peerjs',
    mqtt: Object.freeze(['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'])
  });

  /* ── the rendezvous: three drivers, one mailbox (§14.4) ────────────────────────────────────────────
   * Everything sent goes out through EVERY driver that is up, and anything queued goes out through a
   * driver the moment it comes up (so an offer made in the half-second before the brokers connect is
   * not lost). Everything received is opened, checked by the guard, and handed on ONCE whichever driver
   * carried it first. A host hears offers; a guest hears answers addressed to its tag, and `here`. */
  S.Rendezvous = function (opts) {
    const o = opts || {};
    const role = o.role === 'host' ? 'host' : 'guest';
    const now = o.now || nowMs;
    const tag = o.tag || hex(randomBytes(8));
    const rooms = (o.rooms || []).filter(function (r) { return r && r.keys; });
    const guard = S.guard({ isHost: role === 'host', now: now });
    const routes = new Map();
    const waiters = [], readers = [];
    let out = [];
    let started = false;
    const R = {
      tag: tag, role: role, rooms: rooms, guard: guard,
      onEnvelope: o.onEnvelope || null, onHere: o.onHere || null, onState: o.onState || null, onExpire: o.onExpire || null,
      stats: { in: 0, dup: 0, bad: 0, sent: 0, delivered: 0 }
    };
    const common = { role: role, rooms: rooms, tag: tag, onEnv: deliver, onState: changed, onExpire: expired, keepalive: o.keepalive };
    const drivers = [PeerJsDriver(Object.assign({ url: S.RELAYS.pjs }, common))]
      .concat(S.RELAYS.mqtt.map(function (u, i) { return MqttDriver(Object.assign({ name: 'mqtt' + (i + 1), url: u }, common)); }));
    R.drivers = drivers;

    /* A host room that carries `members()` (the hub, S6 review) has no key of its own: each member seals
       with its own, so the envelope is tried against each, and the member whose key opens it IS the room
       it came in on — which is what the answer is sealed with and what `keyFor` checks the token against. */
    function openIn(room, env) {
      if (role !== 'host' || typeof room.members !== 'function') {
        return S.openEnvelope(room.keys, env).then(function (inner) { return inner ? { inner: inner, room: room } : null; });
      }
      const list = (room.members() || []).slice(0, 64);
      let i = 0;
      function next() {
        if (i >= list.length) return Promise.resolve(null);
        const m = list[i++];
        return S.openEnvelope(m.keys, env).then(function (inner) { return inner ? { inner: inner, room: m } : next(); });
      }
      return next();
    }
    function deliver(env, meta) {
      R.stats.in++;
      if (!started) return;
      if (!env || typeof env !== 'object' || typeof env.n !== 'string') { R.stats.bad++; return; }
      if (guard.seen(env.n)) { R.stats.dup++; return; }
      openIn(meta.room, env).then(function (got) {
        if (!started) return;
        if (!got) { R.stats.bad++; return; }
        const inner = got.inner, room = got.room;
        if (inner.from === tag) return;                    // our own `here`, back from the broker
        if (guard.check(env, inner, room.kind)) { R.stats.dup++; return; }
        if (meta.pjs) { routes.set(inner.from, meta.pjs); if (routes.size > 256) routes.delete(routes.keys().next().value); }
        R.stats.delivered++;
        if (role === 'host') { if (inner.t === 'offer' && R.onEnvelope) R.onEnvelope(inner, room, env); return; }
        if (inner.t === 'offer') return;                   // another guest's offer on the shared topic
        if (inner.to && inner.to !== tag) return;
        if (inner.t === 'here') { if (R.onHere) R.onHere(inner, room); return; }
        for (let i = 0; i < waiters.length; i++) {
          if (waiters[i].pred(inner)) { const w = waiters.splice(i, 1)[0]; w.done(inner); return; }
        }
        if (R.onEnvelope) R.onEnvelope(inner, room, env);
      });
    }
    function anyUp() { return drivers.some(function (d) { return d.state === 'up'; }); }
    /* Refused rather than failing: nothing will come up by waiting. */
    function dead() {
      return drivers.every(function (d) { return d.state === 'down' && (d.why === 'loopback' || d.why === 'codes-only' || d.why === 'no-ws'); });
    }
    function readyCheck() {
      if (!readers.length) return;
      if (anyUp()) readers.splice(0).forEach(function (r) { r.res(true); });
      else if (dead()) readers.splice(0).forEach(function (r) { r.rej({ why: 'relays', refused: drivers[0].why }); });
    }
    function changed(d) {
      if (d.state === 'up') flush();
      readyCheck();
      if (R.onState) { try { R.onState(R.state(), d); } catch (e) {} }
    }
    function expired(info) { if (R.onExpire) { try { R.onExpire(info); } catch (e) {} } }
    function push(it) {
      drivers.forEach(function (d) {
        if (it.via[d.name] || d.state !== 'up') return;
        if (d.send(it.room, it.env, { to: it.to, pjs: it.to ? (routes.get(it.to) || null) : null })) { it.via[d.name] = 1; R.stats.sent++; }
      });
    }
    function flush() {
      const t = now();
      out = out.filter(function (it) { return t - it.at < it.ttl; });
      out.forEach(push);
    }

    R.send = function (room, inner, ttl) {
      if (!started) return Promise.reject({ why: 'stopped' });
      return S.seal(room.keys, inner).then(function (env) {
        const it = { room: room, env: env, to: inner.to || null, at: now(), via: Object.create(null), ttl: ttl || lim('ANSWER_WAIT', 6000) };
        out.push(it);
        if (out.length > 64) out.shift();
        push(it);
        return env;
      });
    };
    /* To every room — and in the hub, to every member under its own key (a removed one is `quiet`: it is
       answered, so it can be told it was removed, but it is never invited to try). */
    R.here = function () {
      if (!started) return Promise.resolve(0);
      const to = [];
      rooms.forEach(function (r) {
        if (typeof r.members === 'function') (r.members() || []).forEach(function (m) { if (!m.quiet) to.push(m); });
        else to.push(r);
      });
      return Promise.all(to.map(function (r) { return R.send(r, { t: 'here', from: tag, to: null, ts: now() }); }))
        .then(function (a) { return a.length; }, function () { return 0; });
    };
    /* The first inner that satisfies `pred`, or {why:'no-answer'} after `ms`. `.cancel()` rejects it now. */
    R.expect = function (pred, ms) {
      let w = null;
      const p = new Promise(function (res, rej) {
        let t = null;
        w = {
          pred: pred,
          done: function (v) { clearTimeout(t); res(v); },
          fail: function (e) { clearTimeout(t); const i = waiters.indexOf(w); if (i >= 0) waiters.splice(i, 1); rej(e); }
        };
        t = setTimeout(function () { w.fail({ why: 'no-answer' }); }, ms || lim('ANSWER_WAIT', 6000));
        waiters.push(w);
      });
      p.cancel = function (why) { if (w) w.fail({ why: why || 'cancelled' }); };
      return p;
    };
    /* Resolves once any driver is up; rejects {why:'relays'} after `ms`, or at once if every driver was
       refused outright (Codes only, loopback) rather than merely slow. */
    R.ready = function (ms) {
      if (anyUp()) return Promise.resolve(true);
      return new Promise(function (res, rej) {
        const r = { res: null, rej: null };
        const t = setTimeout(function () { const i = readers.indexOf(r); if (i >= 0) readers.splice(i, 1); rej({ why: 'relays' }); }, ms || lim('RELAY_UP', 8000));
        r.res = function (v) { clearTimeout(t); res(v); };
        r.rej = function (e) { clearTimeout(t); rej(e); };
        readers.push(r);
        readyCheck();
      });
    };
    R.state = function () {
      const ds = drivers.map(function (d) { return { name: d.name, state: d.state, why: d.why }; });
      return { started: started, up: ds.filter(function (x) { return x.state === 'up'; }).length, drivers: ds };
    };
    R.anyUp = anyUp;
    R.isStarted = function () { return started; };
    R.route = function (t) { return routes.get(t) || null; };
    R.start = function () {
      if (started) return R;
      started = true;
      drivers.forEach(function (d) { d.start(); });
      readyCheck();
      return R;
    };
    R.stop = function () {
      started = false;
      drivers.forEach(function (d) { d.stop(); });
      out = [];
      waiters.slice().forEach(function (w) { w.fail({ why: 'stopped' }); });
      readers.splice(0).forEach(function (r) { r.rej({ why: 'stopped' }); });
      return R;
    };
    /* A foreground, an `online` event or a `here`: any driver that is down tries again now. */
    R.kick = function () { drivers.forEach(function (d) { d.kick(); }); };
    return R;
  };

  /* ── one attempt, each side ─────────────────────────────────────────────────────────────────────
   * ⚠️ `link.opened` NEVER SETTLES ON ITS OWN WHEN THERE IS NO PATH (the S3 review's finding, moved here
   * from collab-ui.js so both the code path and the relay share one copy): ICE does not reach "failed"
   * when it has nothing to check, so the wait is raced against §21's ICE_CONNECT. */
  S.openedWithin = function (link, ms) {
    const wait = ms || lim('ICE_CONNECT', 20000);
    return new Promise(function (res, rej) {
      let done = false;
      const t = setTimeout(function () { if (done) return; done = true; rej({ why: 'timeout' }); }, wait);
      link.opened.then(
        function (v) { if (done) return; done = true; clearTimeout(t); res(v); },
        function (e) { if (done) return; done = true; clearTimeout(t); rej(e && e.why === 'ice' ? { why: 'ice' } : (e || { why: 'closed' })); }
      );
    });
  };

  /* The GUEST's half (§14.4): make an offer, send it through every relay, wait for the answer that names
     this offer, connect, and prove who we are. Resolves {link, auth, host:{nm, cl}}; rejects {why}. The
     promise carries `.cancel()` — a `here` from the host means the offer in flight went to nobody. */
  S.dial = function (o) {
    const rv = o.rv;
    let link = null, exp = null, dead = false;
    const p = new Promise(function (res, rej) {
      try { link = C.link.RtcLink({ self: 'guest', peer: 'host', iceServers: S.iceServers() }); }
      catch (e) { rej({ why: 'no-rtc' }); return; }
      function live(v) { if (dead) throw { why: 'cancelled' }; return v; }
      /* ⚠️ NO NAME AND NO COLOUR IN THE OFFER OR THE ANSWER (S6 review). Everybody who holds the link or
         the code can open these envelopes, so a name here was a name handed to all of them — including
         somebody the owner turned away. Each side learns the other's name over the encrypted channel
         instead: the host's rides on auth1, the guest's on its hello. What the envelope still has to
         carry is the SDP, and with it the device's address; the privacy line says so. */
      link.createOffer({ key: false }).then(live).then(function (code) {
        return rv.send(o.room, { t: 'offer', from: rv.tag, to: null, ts: nowMs(), sdp: code });
      }).then(live).then(function (env) {
        if (o.onStep) o.onStep('offered');
        exp = rv.expect(function (inner) { return inner.t === 'answer' && inner.to === rv.tag && inner.re === env.n; }, o.wait || lim('ANSWER_WAIT', 6000));
        return exp;
      }).then(live).then(function (ans) {
        if (o.onStep) o.onStep('connecting', ans);
        return link.acceptAnswer(ans.sdp).then(function () { return S.openedWithin(link, o.connectMs); }).then(function () { return ans; });
      }).then(live).then(function (ans) {
        if (o.onStep) o.onStep('auth', ans);
        return S.handshake(link, { side: 'guest', key: o.key, mode: o.mode, mid: o.rid || undefined, fpLocal: link.fpLocal, fpRemote: link.fpRemote })
          .then(function (auth) { const h = (auth && auth.host) || {}; return { link: link, auth: auth, host: { nm: h.nm || '', cl: h.cl || '' } }; });
      }).then(function (v) {
        if (dead) { try { link.close(); } catch (x) {} rej({ why: 'cancelled' }); return; }
        res(v);
      }, function (e) {
        try { if (link) link.close(); } catch (x) {}
        rej(e && e.why ? e : { why: 'failed', err: String(e) });
      });
    });
    p.catch(function () {});
    p.cancel = function () {
      if (dead) return;
      dead = true;
      if (exp && exp.cancel) exp.cancel('cancelled');
      try { if (link) link.close('cancelled'); } catch (e) {}
    };
    return p;
  };

  /* The HOST's half: answer one offer, connect, and let the guest prove who it is. `keyFor(mode, mid,
     room)` picks the key the guest claims to hold — the room's own for 'link' and 'code', the member's
     token for 'tok' — or answers {deny:why}. Resolves {link, auth:{mode, mid, sas}}. */
  S.answer = function (o) {
    let link;
    try { link = C.link.RtcLink({ self: 'host', peer: o.offer.from, iceServers: S.iceServers() }); }
    catch (e) { return Promise.reject({ why: 'no-rtc' }); }
    return link.acceptOffer(o.offer.sdp).then(function (code) {
      return o.rv.send(o.room, { t: 'answer', from: o.rv.tag, to: o.offer.from, re: o.env.n, ts: nowMs(), sdp: code });
    }).then(function () { return S.openedWithin(link, o.connectMs); }).then(function () {
      return S.handshake(link, { side: 'host', sid: o.sid, info: o.info, fpLocal: link.fpLocal, fpRemote: link.fpRemote,
        keyFor: function (mode, mid) { return o.keyFor(mode, mid, o.room); } });
    }).then(function (auth) { return { link: link, auth: auth }; }, function (e) {
      try { link.close(); } catch (x) {}
      return Promise.reject(e && e.why ? e : { why: 'failed', err: String(e) });
    });
  };

  /* ── §14.7: the version gate, one function for both sides ────────────────────────────────────────
   * Compatibility is PROTO then SCHEMA_REV, never the app version (D13). Returns null, 'host-older' (the
   * joiner runs rules this device does not have) or 'guest-older'.
   * 📐 A HELLO WITH NO `proto` IS LET IN. Before S6 the hello never carried one — only the welcome did —
   * so every S3–S5 build says hello without it; those builds run PROTO 1 and SCHEMA_REV 2, exactly what
   * this one runs, and S6 adds nothing to the wire an older build cannot ignore. Refusing them would
   * refuse a compatible device for the absence of a field it was never asked to send. */
  S.schemaGate = function (hello) {
    const h = hello || {};
    if (typeof h.proto !== 'number' || typeof h.schema !== 'number') return null;
    if (h.proto > C.PROTO || (h.proto === C.PROTO && h.schema > C.SCHEMA_REV)) return 'host-older';
    if (h.proto < C.PROTO || (h.proto === C.PROTO && h.schema < C.SCHEMA_REV)) return 'guest-older';
    return null;
  };
  S.appVersion = function () {
    try { const v = document.querySelector('.ver'); return v ? String(v.textContent || '').trim().slice(0, 16) : ''; } catch (e) { return ''; }
  };

  C.signal = S;

})(window.FM);
