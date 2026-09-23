/* FreeMotion — live collaboration (queue 921), STAGE S3: the codes-only half of §14.
 *
 * Two jobs, and nothing else:
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
 * ⚠️ S3 SHIPS NO RENDEZVOUS DRIVER, NO INVITE LINK AND NO ROOM CODE. §14.4's PeerJS and MQTT drivers,
 * §14.1's 9-character room code and its PBKDF2, and the `#j=` link are all S6. There is no fetch and no
 * WebSocket in this file, and the §23 guard test counts both and asserts zero. What ships here is the
 * one path that needs nothing but the two people: he reads his code to the other device, it reads one
 * back. PBKDF2 is deliberately NOT here either — it exists only to turn a room code into a rendezvous
 * key, and a key-stretching function with no caller is a thing a later stage would have to re-check
 * rather than write.
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

  function macFor(which, sid, fpG, fpH, nH, nG) {
    return 'fm-auth-' + which + '|' + sid + '|' + fpG + '|' + fpH + '|' + nH + '|' + nG;
  }

  /* `side` is 'host' or 'guest'. `key` is the raw key bytes (mk for mode 'conn').
     Resolves {mode, mid} on the host and {} on the guest; rejects {why:'auth'|'timeout'|'crypto'}. */
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
    if (!key || !fpH || !fpG) return Promise.reject({ why: 'auth' });
    return new Promise(function (resolve, reject) {
      const prev = ep.onmessage;
      let done = false, nH = null, nG = null;
      const hostInfo = { sid: sid, nm: '', cl: '' };   // what auth1 said about the room; the guest's only source
      const timer = setTimeout(function () { fail('timeout'); }, o.timeoutMs || AUTH_TIMEOUT);
      function stop() { done = true; clearTimeout(timer); ep.onmessage = prev || null; }
      function fail(why) {
        if (done) return;
        stop();
        try { ep.send('ctl', { t: 'deny', why: 'auth' }); } catch (e) {}
        try { ep.close(); } catch (e) {}
        reject({ why: why || 'auth' });
      }
      function ok(v) { if (done) return; stop(); resolve(v || {}); }

      ep.onmessage = function (ch, msg) {
        if (ch !== 'ctl' || !msg || typeof msg !== 'object') return;
        if (msg.t === 'deny') return fail('auth');
        if (isHost) {
          if (msg.t !== 'auth2' || typeof msg.nG !== 'string' || typeof msg.mac !== 'string') return;
          nG = msg.nG;
          S.hmac(key, macFor('g', sid, fpG, fpH, nH, nG)).then(function (want) {
            /* Constant-time is pointless over a network the attacker cannot re-time to a microsecond,
               but a LENGTH check before the compare is not: a truncated mac must fail as a mac, not as
               a shorter string that happens to prefix-match. */
            if (want.length !== msg.mac.length || want !== msg.mac) return fail('auth');
            return S.hmac(key, macFor('h', sid, fpG, fpH, nH, nG)).then(function (macH) {
              ep.send('ctl', { t: 'auth3', mac: macH });
              /* …and the five letters the two people compare. Derived from the SAME fingerprints this
                 leg used, so a relay holding `mk` gets a different answer on each side (see the file
                 header). Resolving only after it is ready keeps the UI from having a gate with nothing
                 to show. */
              return S.sas(key, fpG, fpH).then(function (sas) {
                ok({ mode: typeof msg.mode === 'string' ? msg.mode.slice(0, 8) : 'conn', mid: typeof msg.mid === 'string' ? msg.mid.slice(0, 32) : null, sas: sas });
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

  C.signal = S;

})(window.FM);
