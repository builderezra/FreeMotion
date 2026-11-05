/* FreeMotion intro tryouts: the helpers every take can use. An intro is a pure function of time, so any frame can be
   looked at on its own. No timers, no Math.random, no clock inside a take. */
window.FMI = { options: [], dropCaches: [], add(o) { this.options.push(o); } };

(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const map = (t, a, b) => clamp((t - a) / (b - a));
  const pow = (n) => ({
    in: (p) => Math.pow(p, n),
    out: (p) => 1 - Math.pow(1 - p, n),
    io: (p) => (p < 0.5 ? Math.pow(2 * p, n) / 2 : 1 - Math.pow(2 * (1 - p), n) / 2),
  });
  const ease = {
    lin: (p) => p,
    in2: pow(2).in, in3: pow(3).in, in4: pow(4).in,
    out2: pow(2).out, out3: pow(3).out, out4: pow(4).out,
    io2: pow(2).io, io3: pow(3).io, io4: pow(4).io,
    hold: (p) => (p >= 1 ? 1 : 0),
    back: (p) => { const s = 1.4; const q = p - 1; return q * q * ((s + 1) * q + s) + 1; },
  };
  // Keyframes: k(t, [[0, 10], [0.4, 90, 'out3'], [1, 50, 'in2']]). The name on a key eases the segment that ends on it.
  function k(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i];
        const p = (t - a[0]) / (b[0] - a[0] || 1e-6);
        return lerp(a[1], b[1], (ease[b[2]] || ease.lin)(p));
      }
    }
    return keys[keys.length - 1][1];
  }
  const on = (t, fps) => Math.floor(t * fps + 1e-6) / fps;    // hold t on a low frame rate (12 is "on twos")
  const frame = (t, fps) => Math.floor(t * fps + 1e-6);
  function hash(i, seed = 1) {                                 // the same "random" number for the same i, every time
    let x = Math.imul((i | 0) + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed | 0, 0xc2b2ae35);
    x = Math.imul(x ^ (x >>> 13), 0x5bd1e995);
    return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
  }
  function rng(seed) {                                         // a stream of repeatable random numbers
    let a = (seed | 0) + 0x6d2b79f5;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let z = Math.imul(a ^ (a >>> 15), 1 | a);
      z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }
  // A dropped thing: height above the ground t seconds after it lets go, with bounces. e is how much bounce is kept.
  function bounceY(t, h0, g, e) {
    if (t < 0) return h0;
    let tFall = Math.sqrt((2 * h0) / g);
    if (t < tFall) return h0 - 0.5 * g * t * t;
    let rest = t - tFall, v = g * tFall * e;
    for (let n = 0; n < 8 && v > 8; n++) {
      const d = (2 * v) / g;
      if (rest < d) return v * rest - 0.5 * g * rest * rest;
      rest -= d; v *= e;
    }
    return 0;
  }
  // THE LOGO, in its own units (a 200 x 260 drawing, with the mark's own box given here). His pick: three clips stacked on
  // a shared left edge, long / medium / short, and a playhead through them with a triangle on top.
  const F = {
    clips: [{ x: 14, y: 20, w: 92, h: 22, r: 5 }, { x: 14, y: 49, w: 62, h: 22, r: 5 }, { x: 14, y: 78, w: 26, h: 22, r: 5 }],
    head: { x: 80.5, y: 14, w: 3, h: 96, r: 1.5, tri: [[77, 3], [89, 8.5], [77, 14]] },
    box: { x: 14, y: 3, w: 92, h: 107 },
    top: '#f5f5f7', bottom: '#3a3a3f', teal: '#29d9bb',
  };
  const SYS = "-apple-system, 'SF Pro Display', system-ui, 'Segoe UI', sans-serif";

  window.FMI.makeKit = function (stage, w, h, dpr) {
    const kit = {
      w, h, dpr, stage, F, SYS, clamp, lerp, map, ease, k, on, frame, hash, rng, bounceY,
      // A full-stage canvas, already scaled so you draw in CSS pixels.
      canvas(opts) {
        const c = document.createElement('canvas');
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
        c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
        stage.appendChild(c);
        const g = c.getContext('2d', opts && opts.alpha === false ? { alpha: false } : undefined);
        g.scale(dpr, dpr);
        return g;
      },
      // An off-screen canvas for anything costly: draw it once in make(), then drawImage it per frame.
      layer(lw, lh) {
        const c = document.createElement('canvas');
        c.width = Math.round((lw || w) * dpr); c.height = Math.round((lh || h) * dpr);
        const g = c.getContext('2d');
        g.scale(dpr, dpr);
        return { canvas: c, g, w: lw || w, h: lh || h };
      },
      // A DOM element inside the stage (position:absolute by default). Move it with inline transforms from seek(t).
      el(tag, css, parent) {
        const e = document.createElement(tag || 'div');
        e.style.cssText = 'position:absolute;' + (css || '');
        (parent || stage).appendChild(e);
        return e;
      },
      // The finished logo, centred on (cx, cy), s CSS pixels per logo unit. Options: fill (colour, or 'grade' for his
      // light-from-above grey), head (false to leave it out), headFill, knock (the ground colour for the 1px gap round
      // the playhead).
      drawF(g, cx, cy, s, o) {
        o = o || {};
        g.save();
        g.translate(cx - (F.box.x + F.box.w / 2) * s, cy - (F.box.y + F.box.h / 2) * s);
        g.scale(s, s);
        let fill = o.fill || 'grade';
        if (fill === 'grade') {
          fill = g.createLinearGradient(0, 20, 0, 100);
          fill.addColorStop(0, F.top); fill.addColorStop(1, F.bottom);
        }
        g.fillStyle = fill;
        for (const c of F.clips) { g.beginPath(); g.roundRect(c.x, c.y, c.w, c.h, c.r); g.fill(); }
        if (o.head !== false) {
          const hd = F.head;
          if (o.knock) { g.fillStyle = o.knock; g.fillRect(hd.x - 1, hd.y, hd.w + 2, hd.h); }
          g.fillStyle = o.headFill || F.teal;
          g.beginPath(); g.roundRect(hd.x, hd.y, hd.w, hd.h, hd.r); g.fill();
          g.beginPath(); g.moveTo(hd.tri[0][0], hd.tri[0][1]); g.lineTo(hd.tri[1][0], hd.tri[1][1]); g.lineTo(hd.tri[2][0], hd.tri[2][1]); g.fill();
        }
        g.restore();
      },
      // The name in the font the app really shows.
      wordmark(g, x, y, px, fill, align) {
        g.save();
        g.font = '600 ' + px + 'px ' + SYS;
        g.fillStyle = fill || F.top;
        g.textAlign = align || 'left';
        g.textBaseline = 'alphabetic';
        g.fillText('FreeMotion', x, y);
        g.restore();
      },
      // Film grain as a tile: make it once in make(), then grain(g, tile, frameNumber) each frame.
      grainTile(size, amount, seed) {
        const s = size || 256, c = document.createElement('canvas');
        c.width = c.height = s;
        const x = c.getContext('2d'), im = x.createImageData(s, s), r = rng(seed || 7), a = amount === undefined ? 0.14 : amount;
        for (let i = 0; i < im.data.length; i += 4) {
          const v = r() < 0.5 ? 0 : 255;
          im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
          im.data[i + 3] = r() * 255 * a;
        }
        x.putImageData(im, 0, 0);
        return c;
      },
      grain(g, tile, n, alpha) {
        const s = tile.width, ox = -Math.floor(hash(n, 3) * s), oy = -Math.floor(hash(n, 5) * s);
        g.save();
        if (alpha !== undefined) g.globalAlpha = alpha;
        for (let y = oy; y < h; y += s) for (let x = ox; x < w; x += s) g.drawImage(tile, x, y);
        g.restore();
      },
    };
    return kit;
  };
})();
