/* FreeMotion — live collaboration (queue 921), STAGE S6: a QR code for the invite link — and (S8) the reader
 * the Join sheet's [Scan QR] uses to read one back, at the foot of the file.
 *
 * §19.1 puts a [QR] beside [Copy link], so a phone on the same table can join by pointing its camera at
 * the screen instead of being sent anything. This file draws one, and nothing else.
 *
 * 📐 HAND-WRITTEN, NOT `vendor/qrcode-generator.js` (§4.1 / D14 planned a lazily-loaded 20 KB library).
 * Measured against what the link needs: an invite is 88 bytes of URL, which is a version-6 symbol at
 * error-correction level M — one mode (bytes), one level, versions 1–10. That is the ~150 lines below,
 * where the library is twenty kilobytes covering forty versions, four levels and four modes that will
 * never be used, and would have had to be FETCHED (vendor/ does not hold it, and pulling one into the
 * repo means a download nobody has reviewed) or loaded from a CDN at the moment he taps QR. A file this
 * small is loaded eagerly like every other collab script and does nothing until it is called.
 * It is checked by the suite the only way that means anything: the browser's own BarcodeDetector reads
 * the symbol back and must get the link, byte for byte.
 *
 * The construction follows ISO/IEC 18004 as laid out in Project Nayuki's reference implementation
 * (MIT): finder, timing and alignment patterns, format bits with their BCH code, version bits from
 * version 7, Reed-Solomon over GF(256) with the 0x11D polynomial, block interleaving, the zig-zag
 * placement, and the eight masks chosen by the standard's penalty score.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};
  const Q = {};

  /* Level M: [EC codewords per block, [[blocks, data codewords per block], …]] for versions 1–10. */
  const LEVEL_M = [null,
    [10, [[1, 16]]], [16, [[1, 28]]], [26, [[1, 44]]], [18, [[2, 32]]], [24, [[2, 43]]],
    [16, [[4, 27]]], [18, [[4, 31]]], [22, [[2, 38], [2, 39]]], [22, [[3, 36], [2, 37]]], [26, [[4, 43], [1, 44]]]];
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  const MAX_VERSION = 10;

  function dataCodewords(v) {
    let n = 0;
    LEVEL_M[v][1].forEach(function (g) { n += g[0] * g[1]; });
    return n;
  }
  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 255;
  }
  function rsDivisor(deg) {
    const r = [];
    for (let i = 0; i < deg; i++) r.push(0);
    r[deg - 1] = 1;
    let root = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < deg; j++) {
        r[j] = gfMul(r[j], root);
        if (j + 1 < deg) r[j] ^= r[j + 1];
      }
      root = gfMul(root, 2);
    }
    return r;
  }
  function rsRemainder(data, div) {
    const r = div.map(function () { return 0; });
    for (let k = 0; k < data.length; k++) {
      const f = data[k] ^ r.shift();
      r.push(0);
      for (let i = 0; i < div.length; i++) r[i] ^= gfMul(div[i], f);
    }
    return r;
  }

  /* Returns {version, size, mask, modules[y][x]} or null when the text does not fit version 10. */
  Q.encode = function (text) {
    const bytes = new TextEncoder().encode(String(text == null ? '' : text));
    let v = 1;
    for (; v <= MAX_VERSION; v++) if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= dataCodewords(v) * 8) break;
    if (v > MAX_VERSION) return null;
    const cap = dataCodewords(v);

    /* The bit stream: mode 0100 (bytes), the count, the bytes, up to four terminator zeros, pad to a byte,
       then the two pad codewords alternately. */
    const bits = [];
    function put(val, n) { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4);
    put(bytes.length, v < 10 ? 8 : 16);
    for (let i = 0; i < bytes.length; i++) put(bytes[i], 8);
    put(0, Math.min(4, cap * 8 - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (let pad = 0xEC; bits.length < cap * 8; pad ^= 0xEC ^ 0x11) put(pad, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      data.push(b);
    }

    /* Blocks, error correction, and the interleave: every block's first data codeword, then every
       block's second, … (a shorter block simply has none at its last position), then the EC the same way. */
    const ecLen = LEVEL_M[v][0];
    const div = rsDivisor(ecLen);
    const blocks = [];
    let k = 0;
    LEVEL_M[v][1].forEach(function (g) {
      for (let i = 0; i < g[0]; i++) {
        const d = data.slice(k, k + g[1]);
        k += g[1];
        blocks.push({ d: d, e: rsRemainder(d, div) });
      }
    });
    const words = [];
    let maxD = 0;
    blocks.forEach(function (b) { maxD = Math.max(maxD, b.d.length); });
    for (let i = 0; i < maxD; i++) blocks.forEach(function (b) { if (i < b.d.length) words.push(b.d[i]); });
    for (let i = 0; i < ecLen; i++) blocks.forEach(function (b) { words.push(b.e[i]); });

    /* The matrix. `fn` marks the function patterns, which data never overwrites and masks never touch. */
    const size = v * 4 + 17;
    const mod = [], fn = [];
    for (let y = 0; y < size; y++) {
      const a = [], b = [];
      for (let x = 0; x < size; x++) { a.push(false); b.push(false); }
      mod.push(a); fn.push(b);
    }
    function setF(x, y, dark) { mod[y][x] = !!dark; fn[y][x] = true; }

    for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          const xx = c[0] + dx, yy = c[1] + dy;
          if (xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    });
    const al = ALIGN[v], n = al.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) setF(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
    function drawFormat(mask) {
      const d = mask;                                    // level M's two format bits are 00
      let rem = d;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const fb = ((d << 10) | rem) ^ 0x5412;
      const g = function (i) { return ((fb >>> i) & 1) !== 0; };
      for (let i = 0; i <= 5; i++) setF(8, i, g(i));
      setF(8, 7, g(6)); setF(8, 8, g(7)); setF(7, 8, g(8));
      for (let i = 9; i < 15; i++) setF(14 - i, 8, g(i));
      for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, g(i));
      for (let i = 8; i < 15; i++) setF(8, size - 15 + i, g(i));
      setF(8, size - 8, true);                           // the dark module
    }
    drawFormat(0);
    if (v >= 7) {
      let rem = v;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      const vb = (v << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const bit = ((vb >>> i) & 1) !== 0;
        const a = size - 11 + i % 3, b = Math.floor(i / 3);
        setF(a, b, bit); setF(b, a, bit);
      }
    }

    /* The zig-zag: two columns at a time from the right, up then down, skipping the vertical timing line. */
    let bi = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const up = ((right + 1) & 2) === 0;
          const y = up ? size - 1 - vert : vert;
          if (!fn[y][x] && bi < words.length * 8) {
            mod[y][x] = ((words[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0;
            bi++;
          }
        }
      }
    }

    function maskBit(m, x, y) {
      switch (m) {
        case 0: return (x + y) % 2 === 0;
        case 1: return y % 2 === 0;
        case 2: return x % 3 === 0;
        case 3: return (x + y) % 3 === 0;
        case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
        case 5: return (x * y) % 2 + (x * y) % 3 === 0;
        case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
        default: return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
      }
    }
    function applyMask(m) {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && maskBit(m, x, y)) mod[y][x] = !mod[y][x];
    }
    const F1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], F2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function penalty() {
      let p = 0, dark = 0;
      for (let pass = 0; pass < 2; pass++) {
        for (let a = 0; a < size; a++) {
          let run = 1;
          for (let b = 1; b < size; b++) {
            const cur = pass ? mod[b][a] : mod[a][b], prev = pass ? mod[b - 1][a] : mod[a][b - 1];
            if (cur === prev) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
          }
          for (let b = 0; b + 11 <= size; b++) {
            let m1 = true, m2 = true;
            for (let t = 0; t < 11; t++) {
              const cell = (pass ? mod[b + t][a] : mod[a][b + t]) ? 1 : 0;
              if (cell !== F1[t]) m1 = false;
              if (cell !== F2[t]) m2 = false;
            }
            if (m1) p += 40;
            if (m2) p += 40;
          }
        }
      }
      for (let y = 0; y < size - 1; y++) {
        for (let x = 0; x < size - 1; x++) {
          const c = mod[y][x];
          if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
        }
      }
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (mod[y][x]) dark++;
      const total = size * size;
      p += Math.max(0, Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return p;
    }
    let best = 0, bestScore = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(m);
      drawFormat(m);
      const s = penalty();
      if (s < bestScore) { bestScore = s; best = m; }
      applyMask(m);
    }
    applyMask(best);
    drawFormat(best);
    return { version: v, size: size, mask: best, modules: mod };
  };

  /* Black on white with the standard four-module quiet zone, whatever the theme: a camera reads dark
     modules on a light ground, and an inverted code is one many phone scanners refuse. */
  Q.toCanvas = function (qr, scale, margin, canvas) {
    const m = margin == null ? 4 : margin;
    const s = Math.max(1, scale | 0);
    const px = (qr.size + m * 2) * s;
    const c = canvas || document.createElement('canvas');
    c.width = px; c.height = px;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, px, px);
    g.fillStyle = '#000000';
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) if (qr.modules[y][x]) g.fillRect((x + m) * s, (y + m) * s, s, s);
    }
    return c;
  };

  /* ═══ S8 · READING ONE BACK (§19.2 [Scan QR]) ══════════════════════════════════════════════════════════
   *
   * The browser's own `BarcodeDetector` where it has one (Chrome on a Mac, on Android — measured: it reads this
   * file's codes back byte for byte, which the S6 test already relies on). Where it has not — Safari, on the
   * iPhone this feature is for — jsQR, fetched from the CDN the first time the SCANNER OPENS and never before:
   * nothing here runs at load, a person who never taps [Scan QR] never downloads a byte of it, and one who has
   * a BarcodeDetector never downloads it at all.
   *
   * 📐 THE FALLBACK IS A PINNED VERSION ON cdn.jsdelivr.net/npm/, not a copy in vendor/. The plan (§26 S8) said
   * `vendor/jsqr.js`; the brief for S8 said the CDN, and the CDN is the safer of the two here: a vendored copy is
   * a 250 KB file nobody has reviewed sitting in the repo and in the service worker's cache forever, for a
   * feature behind Labs, where a pinned npm version is immutable (npm never lets a version be republished) and
   * costs nothing until the one tap that needs it, with `crossorigin` so a failure is a failure.
   *
   * ⚠️ AND IT IS NEVER LOADED WITHOUT ITS INTEGRITY HASH — FAIL CLOSED (S8 security pass). A script from a CDN runs
   * with everything this page can reach, and this page keeps his own AI key in localStorage (js/ai-key.js): one
   * compromised CDN edge would be one stolen key. `integrity` makes the browser refuse any byte that is not the
   * file the hash names. The hash is not pinned YET because pinning it means fetching the file once to hash it,
   * which an unattended build does not do — so until `JSQR_SRI` holds it, a browser with no BarcodeDetector is
   * told the reader is not available here and to open the link with its camera app or paste it (the iPhone's own
   * Camera app reads the QR and opens the link anyway). Pinning it is one line: COLLAB-DESIGN.md §26 S8 as built.
   * index.html sets no CSP. */
  Q.JSQR_URL = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
  Q.JSQR_SRI = null;           // 'sha384-…' — see above; null keeps the fallback OFF
  let jsqrP = null;
  /* The loader, as a seam: the suite stands in for the network (it must never touch it), and a failed load is
     forgotten so the next tap can try again rather than failing forever on one bad moment of signal. */
  Q._load = function (url, sri) {
    return new Promise(function (res, rej) {
      const sc = document.createElement('script');
      sc.src = url;
      sc.async = true;
      sc.crossOrigin = 'anonymous';
      if (sri) sc.integrity = sri;
      sc.onload = function () { res(window.jsQR); };
      sc.onerror = function () { sc.remove(); rej(new Error('jsQR did not load')); };
      document.head.appendChild(sc);
    });
  };
  function loadJsQR() {
    if (typeof window.jsQR === 'function') return Promise.resolve(window.jsQR);
    if (!Q.JSQR_SRI) return Promise.reject(new Error('jsQR is not pinned (no integrity hash), so it is not loaded'));
    if (!jsqrP) {
      jsqrP = Q._load(Q.JSQR_URL, Q.JSQR_SRI).then(function (f) {
        if (typeof f !== 'function') throw new Error('jsQR loaded but is not a function');
        return f;
      });
      jsqrP.catch(function () { jsqrP = null; });
    }
    return jsqrP;
  }
  Q._jsqrRequested = function () { return !!jsqrP; };
  /* S8 review: can this browser read a QR code AT ALL — asked synchronously, with nothing loaded, when the Join
     sheet decides whether to offer [Scan QR]. A browser with no BarcodeDetector and no pinned jsQR (Safari on
     the iPhone, today) could only ever answer every tap with "can't read QR codes here yet", so it is not
     offered the button; the sheet points at the Camera app instead, which reads the code and opens the link. */
  Q.canRead = function () {
    return typeof window.BarcodeDetector === 'function' || !!Q.JSQR_SRI || typeof window.jsQR === 'function';
  };
  Q._forget = function () { jsqrP = null; };          // suite seam: a stand-in reader must not outlive its test

  /* Which reader this browser gets, and nothing loaded to find out. A detector that exists but cannot read
     QR codes (some builds list only 1-D formats) is no detector. */
  Q.nativeReader = function () {
    const BD = window.BarcodeDetector;
    if (typeof BD !== 'function') return Promise.resolve(null);
    const formats = typeof BD.getSupportedFormats === 'function' ? BD.getSupportedFormats() : Promise.resolve(['qr_code']);
    return Promise.resolve(formats).then(function (f) {
      if (!Array.isArray(f) || f.indexOf('qr_code') < 0) return null;
      let det = null;
      try { det = new BD({ formats: ['qr_code'] }); } catch (e) { return null; }
      return function (source) {
        return det.detect(source).then(function (found) {
          for (let i = 0; i < (found || []).length; i++) if (found[i] && typeof found[i].rawValue === 'string') return found[i].rawValue;
          return null;
        }, function () { return null; });
      };
    }, function () { return null; });
  };

  /* One frame from a video, a canvas or an image, as the pixels jsQR reads — at most 640 px on the long side,
     which is plenty for a code filling a quarter of the frame and keeps each attempt a few milliseconds on a
     phone. */
  function pixels(source, canvas) {
    const w = source.videoWidth || source.naturalWidth || source.width || 0;
    const h = source.videoHeight || source.naturalHeight || source.height || 0;
    if (!w || !h) return null;
    const k = Math.min(1, 640 / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
    const c = canvas || document.createElement('canvas');
    if (c.width !== cw) c.width = cw;
    if (c.height !== ch) c.height = ch;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(source, 0, 0, cw, ch);
    return g.getImageData(0, 0, cw, ch);
  }

  /* A reader: `read(source)` → the text of the first QR code in it, or null. Native if it can be; otherwise
     jsQR, loaded now. Rejects only when neither exists — the caller says so and offers Paste. */
  Q.reader = function () {
    return Q.nativeReader().then(function (nat) {
      if (nat) return { kind: 'native', read: nat };
      return loadJsQR().then(function (jsQR) {
        const cv = document.createElement('canvas');
        return {
          kind: 'jsqr',
          read: function (source) {
            try {
              const img = pixels(source, cv);
              if (!img) return Promise.resolve(null);
              const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
              return Promise.resolve(code && typeof code.data === 'string' ? code.data : null);
            } catch (e) { return Promise.resolve(null); }
          }
        };
      });
    });
  };

  C.qr = Q;

})(window.FM);
