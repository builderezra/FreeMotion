// Layers in 3D: three takes where the logo is built by real depth. Everything is drawn with a small software camera on a
// canvas, so a frame can be computed from t alone and every take can have true motion blur (several sub-frame renders
// averaged together).
(function () {
  const RAD = Math.PI / 180;
  const TAU = Math.PI * 2;
  const LANE = 'Layers in 3D';
  const hypot = Math.hypot;

  // ---- Where the finished logo sits on any phone ----
  function logoLayout(kit) {
    const F = kit.F, W = kit.w, H = kit.h;
    const s = Math.min(W * 0.6, H * 0.31) / F.box.w;
    const fh = F.box.h * s, fw = F.box.w * s;
    const m = document.createElement('canvas').getContext('2d');
    m.font = '600 100px ' + kit.SYS;
    const wordPx = (fw / m.measureText('FreeMotion').width) * 100;
    const gap = fh * 0.13;
    const block = fh + gap + wordPx;
    const top = 60 + Math.max(0, (H - 110 - 60 - block) / 2);
    const cx = W / 2, cy = top + fh / 2;
    return {
      s, fw, fh, cx, cy, wordPx,
      left: cx - fw / 2,
      wordY: top + fh + gap + wordPx * 0.8,
      X: (lx) => cx + (lx - (F.box.x + F.box.w / 2)) * s,
      Y: (ly) => cy + (ly - (F.box.y + F.box.h / 2)) * s,
    };
  }

  // ---- The camera for things lying in a plane (z is the plane's normal): spin about z, then tip about x ----
  function Cam(cx, cy) {
    this.cx = cx; this.cy = cy; this.f = 1000; this.dist = 1000;
    this.tx = 0; this.ty = 0; this.tz = 0;
    this.X = 0; this.Y = 0; this.D = 1;
    this.ca = 1; this.sa = 0; this.cp = 1; this.sp = 0;
  }
  Cam.prototype.turn = function (az, pitch) {
    this.ca = Math.cos(az); this.sa = Math.sin(az);
    this.cp = Math.cos(pitch); this.sp = Math.sin(pitch);
  };
  Cam.prototype.p = function (x, y, z) {
    x -= this.tx; y -= this.ty; z -= this.tz;
    const a = x * this.ca - y * this.sa, b = x * this.sa + y * this.ca;
    const y2 = b * this.cp - z * this.sp, z2 = b * this.sp + z * this.cp;
    const d = this.dist - z2;
    this.D = d;
    const s = this.f / Math.max(d, 0.0001);
    this.X = this.cx + a * s;
    this.Y = this.cy + y2 * s;
  };
  // Where a screen point lands on the plane z = 0.
  Cam.prototype.unproject = function (sx, sy, out) {
    const a1 = (sx - this.cx) / this.f, b1 = (sy - this.cy) / this.f;
    const d = (this.dist * this.cp) / (this.cp + b1 * this.sp);
    const b = b1 * d * this.cp + (this.dist - d) * this.sp;
    const a = a1 * d;
    out.x = a * this.ca + b * this.sa + this.tx;
    out.y = -a * this.sa + b * this.ca + this.ty;
  };

  // A picture on a plane, in perspective: cut into small cells, each cell an affine drawImage. mask (optional) skips the
  // cells that are empty.
  const meshBuf = new Float64Array(3 * 40 * 40);
  function drawMesh(g, dpr, cam, img, x0, y0, x1, y1, z, nu, nv, mask) {
    const cw = img.width / nu, ch = img.height / nv;
    let n = 0;
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        cam.p(x0 + ((x1 - x0) * i) / nu, y0 + ((y1 - y0) * j) / nv, z);
        meshBuf[n++] = cam.X; meshBuf[n++] = cam.Y; meshBuf[n++] = cam.D;
      }
    }
    const row = (nu + 1) * 3;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        if (mask && !mask[j * nu + i]) continue;
        const a = (j * (nu + 1) + i) * 3, b = a + 3, c = a + row, d = c + 3;
        if (meshBuf[a + 2] < 2 || meshBuf[b + 2] < 2 || meshBuf[c + 2] < 2 || meshBuf[d + 2] < 2) continue;
        let ux = (meshBuf[b] - meshBuf[a] + meshBuf[d] - meshBuf[c]) / 2, uy = (meshBuf[b + 1] - meshBuf[a + 1] + meshBuf[d + 1] - meshBuf[c + 1]) / 2;
        let vx = (meshBuf[c] - meshBuf[a] + meshBuf[d] - meshBuf[b]) / 2, vy = (meshBuf[c + 1] - meshBuf[a + 1] + meshBuf[d + 1] - meshBuf[b + 1]) / 2;
        const lu = hypot(ux, uy), lv = hypot(vx, vy);
        if (lu < 0.02 || lv < 0.02) continue;
        const eu = (lu + 0.9) / lu, ev = (lv + 0.9) / lv;
        ux *= eu; uy *= eu; vx *= ev; vy *= ev;
        const mx = (meshBuf[a] + meshBuf[b] + meshBuf[c] + meshBuf[d]) / 4, my = (meshBuf[a + 1] + meshBuf[b + 1] + meshBuf[c + 1] + meshBuf[d + 1]) / 4;
        g.setTransform((ux * dpr) / cw, (uy * dpr) / cw, (vx * dpr) / ch, (vy * dpr) / ch, (mx - (ux + vx) / 2) * dpr, (my - (uy + vy) / 2) * dpr);
        g.drawImage(img, i * cw, j * ch, cw, ch, 0, 0, cw, ch);
      }
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Which cells of a picture have anything in them.
  function cellMask(img, nu, nv) {
    const c = document.createElement('canvas');
    c.width = nu * 6; c.height = nv * 6;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const m = new Uint8Array(nu * nv);
    for (let py = 0; py < c.height; py++) {
      for (let px = 0; px < c.width; px++) {
        if (d[(py * c.width + px) * 4 + 3] > 1) m[Math.floor(py / 6) * nu + Math.floor(px / 6)] = 1;
      }
    }
    return m;
  }

  // Real motion blur: n renders across the shutter, averaged. draw(ctx, t) must paint a whole opaque frame.
  function shutter(g, off, dpr, t, open, n, draw) {
    if (n <= 1) { draw(g, t); return; }
    const o = off.g;
    for (let i = 0; i < n; i++) {
      o.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(o, t - (open * (n - 1 - i)) / (n - 1));
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1 / (i + 1);
      g.drawImage(off.canvas, 0, 0);
    }
    g.globalAlpha = 1;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function poly(g, pts) {
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
  }

  // ---- Footage. Eight little films drawn by hand in a 160 x 90 frame ----
  function ridge(x, base, amp, step, seed, fill) {
    x.fillStyle = fill;
    x.beginPath();
    x.moveTo(-2, 92);
    for (let i = 0, px = -2; px < 164; i++, px += step) {
      const n = (hash01(i, seed) - 0.5) * amp + (hash01(i >> 2, seed + 9) - 0.5) * amp * 1.3;
      x.lineTo(px, base + n);
    }
    x.lineTo(164, 92);
    x.closePath();
    x.fill();
  }
  function hash01(i, seed) {
    let v = Math.imul((i | 0) + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed | 0, 0xc2b2ae35);
    v = Math.imul(v ^ (v >>> 13), 0x5bd1e995);
    return ((v ^ (v >>> 15)) >>> 0) / 4294967296;
  }
  function vgrad(x, stops, y0, y1) {
    const gr = x.createLinearGradient(0, y0 === undefined ? 0 : y0, 0, y1 === undefined ? 90 : y1);
    stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s));
    return gr;
  }
  function scene(x, X, Y, W, H, kind, ph) {
    ph = ph || 0;
    x.save();
    x.beginPath(); x.rect(X, Y, W, H); x.clip();
    x.translate(X, Y); x.scale(W / 160, H / 90);
    if (kind === 0) {           // desert road at sundown
      x.fillStyle = vgrad(x, ['#54243a', '#b83f35', '#ef8a3a', '#fcd688'], 0, 58); x.fillRect(0, 0, 160, 60);
      x.fillStyle = '#fff1c9'; x.beginPath(); x.arc(112 - ph * 30, 44 + ph * 8, 12, 0, TAU); x.fill();
      ridge(x, 50, 13, 9, 3, '#7e2f35');
      x.fillStyle = '#34161e'; x.beginPath(); x.moveTo(-2, 60); x.lineTo(14, 60); x.lineTo(18, 40); x.lineTo(40, 39); x.lineTo(45, 60); x.lineTo(160, 60); x.lineTo(160, 90); x.lineTo(-2, 90); x.fill();
      x.fillStyle = '#1b0f12'; x.beginPath(); x.moveTo(78, 58); x.lineTo(84, 58); x.lineTo(150, 90); x.lineTo(16, 90); x.fill();
      x.fillStyle = '#f2c14e';
      for (let i = 0; i < 5; i++) { const q = i / 5, y = 60 + q * q * 30, w = 0.5 + q * 2; x.fillRect(81 - w / 2, y, w, 1 + q * 5); }
      const carQ = 0.35 + ph * 0.5, carY = 60 + carQ * carQ * 30, cw = 4 + carQ * 26;
      x.fillStyle = '#0c0a0a'; x.fillRect(66 - cw / 2 + ph * 6, carY - cw * 0.5, cw, cw * 0.5);
      x.fillStyle = '#e8402a'; x.fillRect(66 - cw / 2 + ph * 6, carY - cw * 0.26, cw * 0.18, cw * 0.1); x.fillRect(66 + cw / 2 - cw * 0.18 + ph * 6, carY - cw * 0.26, cw * 0.18, cw * 0.1);
    } else if (kind === 1) {    // sea, low sun
      x.fillStyle = vgrad(x, ['#d98a5a', '#f2c690', '#fbeac4'], 0, 50); x.fillRect(0, 0, 160, 52);
      x.fillStyle = vgrad(x, ['#1f6a70', '#0d3339'], 50, 90); x.fillRect(0, 50, 160, 40);
      x.fillStyle = '#fff4d6'; x.beginPath(); x.arc(58, 42, 8, 0, TAU); x.fill();
      for (let i = 0; i < 26; i++) { const y = 52 + i * 1.5; x.fillRect(58 - (2 + i * 0.8) * hash01(i, 4) - 3, y, (5 + i * 1.3) * hash01(i, 5) + 2, 0.7); }
      x.fillStyle = '#1b1a1c'; x.beginPath(); x.moveTo(104, 52); x.lineTo(118, 42); x.lineTo(129, 46); x.lineTo(160, 33); x.lineTo(160, 58); x.fill();
    } else if (kind === 2) {    // forest ridges in haze
      x.fillStyle = vgrad(x, ['#f0ead0', '#d8dcb6'], 0, 60); x.fillRect(0, 0, 160, 90);
      ridge(x, 32, 13, 7, 11, '#9fb68c'); ridge(x, 46, 12, 5, 12, '#6e9270'); ridge(x, 60, 13, 3.5, 13, '#3f6a4e'); ridge(x, 76, 11, 2.5, 14, '#1c3a2a');
    } else if (kind === 3) {    // city at night
      x.fillStyle = vgrad(x, ['#181620', '#3e2535', '#a84a3a'], 0, 72); x.fillRect(0, 0, 160, 90);
      for (let b = 0; b < 15; b++) {
        const bx = b * 11 - 3 + hash01(b, 2) * 5, bh = 26 + hash01(b, 3) * 46, bw = 8 + hash01(b, 4) * 9;
        x.fillStyle = b % 2 ? '#100e13' : '#17141b'; x.fillRect(bx, 90 - bh, bw, bh);
        x.fillStyle = '#f4c55a';
        for (let wy = 92 - bh; wy < 88; wy += 4) for (let wx = bx + 1; wx < bx + bw - 1; wx += 2.6) if (hash01(Math.floor(wx * 7 + wy * 13), b) < 0.32) x.fillRect(wx, wy, 1.3, 1.9);
      }
    } else if (kind === 4) {    // snow peak
      x.fillStyle = vgrad(x, ['#a8c9c9', '#e4ece4'], 0, 60); x.fillRect(0, 0, 160, 90);
      x.fillStyle = '#f7f7f1'; x.beginPath(); x.moveTo(8, 72); x.lineTo(62, 14); x.lineTo(74, 24); x.lineTo(88, 10); x.lineTo(150, 72); x.fill();
      x.fillStyle = '#7f98a2'; x.beginPath(); x.moveTo(88, 10); x.lineTo(78, 34); x.lineTo(92, 42); x.lineTo(84, 72); x.lineTo(150, 72); x.fill();
      ridge(x, 74, 7, 3, 21, '#28373c');
    } else if (kind === 5) {    // a face against the light
      x.fillStyle = vgrad(x, ['#e6a15c', '#f6d08f'], 0, 90); x.fillRect(0, 0, 160, 90);
      x.fillStyle = '#20140f';
      x.beginPath(); x.ellipse(82, 38, 16, 21, 0.08, 0, TAU); x.fill();
      x.beginPath(); x.moveTo(36, 92); x.quadraticCurveTo(44, 62, 72, 57); x.lineTo(94, 57); x.quadraticCurveTo(124, 62, 130, 92); x.fill();
      x.strokeStyle = '#fff0cf'; x.lineWidth = 1.2; x.beginPath(); x.arc(84, 38, 18, -0.9, 0.7); x.stroke();
    } else if (kind === 6) {    // beach from a drone
      x.fillStyle = '#e6cb97'; x.fillRect(0, 0, 160, 90);
      x.fillStyle = vgrad(x, ['#14737a', '#2aa59b'], 0, 90);
      x.beginPath(); x.moveTo(164, -2); x.lineTo(70, -2);
      for (let i = 0; i <= 12; i++) x.lineTo(72 + i * 4 + Math.sin(i * 1.5) * 6, i * 8);
      x.lineTo(164, 92); x.fill();
      x.strokeStyle = '#fbf7e8'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(70, -2);
      for (let i = 0; i <= 12; i++) x.lineTo(72 + i * 4 + Math.sin(i * 1.5) * 6, i * 8);
      x.stroke();
      const um = ['#d9412b', '#f2c14e', '#ffffff', '#21806f'];
      for (let i = 0; i < 12; i++) { x.fillStyle = um[i % 4]; x.beginPath(); x.arc(8 + hash01(i, 7) * 60, 6 + hash01(i, 8) * 78, 2.1, 0, TAU); x.fill(); }
    } else {                    // road from above, one red car
      x.fillStyle = '#4c4a44'; x.fillRect(0, 0, 160, 90);
      x.fillStyle = '#6f7c47'; x.fillRect(0, 0, 40, 90); x.fillRect(122, 0, 40, 90);
      x.fillStyle = '#e8e4d6'; for (let i = 0; i < 6; i++) x.fillRect(80, i * 17 - 4, 2, 9);
      x.fillStyle = '#d9412b'; x.fillRect(54, 36 - ph * 20, 13, 24); x.fillStyle = '#23201d'; x.fillRect(56, 42 - ph * 20, 9, 7);
    }
    x.restore();
  }
  function wave(x, X, Y, W, H, seed, color, bw, gap) {
    x.fillStyle = color;
    const n = Math.floor(W / (bw + gap));
    for (let i = 0; i < n; i++) {
      const beat = Math.pow(Math.abs(Math.sin(i * 0.11 + seed)), 3);
      const a = Math.min(1, (0.16 + 0.84 * beat) * (0.4 + 0.6 * hash01(i, seed + 2)) + 0.08 * hash01(i >> 3, seed + 3));
      x.fillRect(X + i * (bw + gap), Y + (H * (1 - a)) / 2, bw, Math.max(1, H * a));
    }
  }

  // ======================================================================================================
  // (a) THE STACK: a comp comes apart into hanging sheets, the camera swings round, a black matte drops on them.
  // ======================================================================================================
  FMI.add({
    id: 'layers-stack',
    lane: LANE,
    name: 'Exploded Stack',
    blurb: 'The sheets of a comp fly apart and the camera swings round them, then a black matte with an F cut through it slams down and flattens the lot.',
    dur: 2.92,
    ground: '#e7e2d5',
    make(stage, kit) {
      const W = kit.w, H = kit.h, dpr = kit.dpr;
      const g = kit.canvas({ alpha: false });
      const off = kit.layer();
      const L = logoLayout(kit), F = kit.F;
      const NU = 5, NV = 10;
      const INK = '#16130f', BONE = '#e7e2d5', COAL = '#0c0c0d';
      const texS = Math.min(dpr, 1.6), fs = W / 390;
      const tex = (paint) => {
        const c = document.createElement('canvas');
        c.width = Math.ceil(W * texS); c.height = Math.ceil(H * texS);
        const x = c.getContext('2d');
        x.scale(texS, texS);
        paint(x);
        return { img: c, mask: cellMask(c, NU, NV) };
      };
      const tab = (x, text, on, ink) => {
        x.font = '700 ' + 12 * fs + 'px "Courier Prime", monospace';
        const tw = x.measureText(text).width + 12 * fs;
        x.fillStyle = on; x.fillRect(0, 0, tw, 18 * fs);
        x.fillStyle = ink; x.textBaseline = 'middle'; x.textAlign = 'left';
        x.fillText(text, 6 * fs, 9.5 * fs);
      };
      const row = (c) => ({ x: L.X(c.x), y: L.Y(c.y), w: c.w * L.s, h: c.h * L.s, r: c.r * L.s });
      const R = F.clips.map(row);
      const keyRows = (x) => { R.forEach((r) => { x.beginPath(); x.roundRect(r.x, r.y, r.w, r.h, r.r); x.fill(); }); };
      const keyHead = (x) => {
        const hd = F.head;
        x.beginPath(); x.roundRect(L.X(hd.x), L.Y(hd.y), hd.w * L.s, hd.h * L.s, hd.r * L.s); x.fill();
        x.beginPath(); hd.tri.forEach((p, i) => (i ? x.lineTo(L.X(p[0]), L.Y(p[1])) : x.moveTo(L.X(p[0]), L.Y(p[1])))); x.fill();
      };

      // 0 COLOUR: a flat colour layer, solid, with the swatches it was picked from.
      const colour = tex((x) => {
        x.fillStyle = '#e4471d'; x.fillRect(0, 0, W, H);
        const r = kit.rng(5);
        for (let i = 0; i < 500; i++) { x.fillStyle = r() < 0.5 ? 'rgba(120,20,0,.16)' : 'rgba(255,190,120,.14)'; x.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
        const sw = ['#f6c544', '#f28a2e', '#e4471d', '#a92a15', '#efe6d0', '#1f7f70'], sh = H / 16;
        sw.forEach((c, i) => { x.fillStyle = c; x.fillRect(W - sh, H - sh * (6.4 - i), sh, sh + 1); x.fillStyle = INK; x.fillRect(W - sh, H - sh * (6.4 - i), sh, 1); });
        tab(x, 'COLOUR', INK, BONE);
      });
      // 1 CLIP: the same few seconds, frame after frame, with a burned-in counter. Stops above the short row so the colour shows there.
      const clip = tex((x) => {
        const fh = (W * 0.94 * 9) / 16, fx = W * 0.03, gapY = 7 * fs;
        const bottom = R[2].y - 5 * fs;
        let y = bottom - fh, n = 0;
        const frames = Math.ceil(bottom / (fh + gapY)) + 1;
        for (let i = frames - 1; i >= 0; i--) {
          const ph = 1 - i / frames;
          scene(x, fx, y, W * 0.94, fh, 0, 1 - ph);
          x.fillStyle = INK; x.fillRect(fx, y + fh - 17 * fs, 90 * fs, 17 * fs);
          x.fillStyle = BONE; x.font = '700 ' + 12 * fs + 'px "Courier Prime", monospace'; x.textBaseline = 'middle'; x.textAlign = 'left';
          x.fillText('00:04:' + String(11 + i) + ':' + String(3 + i * 7), fx + 5 * fs, y + fh - 8 * fs);
          y -= fh + gapY; n++;
        }
        x.save(); x.translate(fx, H * 0.77); scene(x, 0, 0, W * 0.94, fh * 0.9, 1, 0); x.restore();
        tab(x, 'CLIP 01', '#f6c544', INK);
      });
      // 2 WAVE: a bone band with the audio in it. Sits on the medium row.
      const wav = tex((x) => {
        const by = R[1].y - R[1].h * 0.5, bh = R[1].h * 2;
        x.fillStyle = BONE; x.fillRect(0, by, W, bh);
        wave(x, 0, by + 4 * fs, W, bh - 8 * fs, 2.4, INK, 2.2 * fs, 1.4 * fs);
        x.fillStyle = INK; x.fillRect(0, by, W, 1.4 * fs); x.fillRect(0, by + bh - 1.4 * fs, W, 1.4 * fs);
        x.save(); x.translate(0, by - 18 * fs); tab(x, 'AUDIO 2', INK, BONE); x.restore();
      });
      // 3 HEAD: the playhead on an otherwise empty sheet, with its ruler.
      const headT = tex((x) => {
        x.fillStyle = F.teal;
        x.fillRect(L.X(F.head.x), L.Y(F.head.y), F.head.w * L.s, H - L.Y(F.head.y));
        x.beginPath(); F.head.tri.forEach((p, i) => (i ? x.lineTo(L.X(p[0]), L.Y(p[1])) : x.moveTo(L.X(p[0]), L.Y(p[1])))); x.fill();
        const ry = L.Y(F.head.y) - 26 * L.s;
        x.fillStyle = INK;
        for (let i = 0; i * 8 * fs < W; i++) { const big = i % 5 === 0; x.fillRect(i * 8 * fs, ry, 2.2 * fs, (big ? 26 : 11) * fs); }
        x.font = '700 ' + 11 * fs + 'px "Courier Prime", monospace'; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
        for (let i = 0; i * 40 * fs < W; i++) x.fillText(String(i * 12), i * 40 * fs + 3 * fs, ry + 15 * fs);
        tab(x, 'PLAYHEAD', F.teal, INK);
      });
      // 4 MASK: a hand-placed outline round the F, anchor points and bezier handles showing.
      const maskT = tex((x) => {
        const pts = [[9, 15], [111, 15], [111, 47], [81, 47], [81, 76], [45, 76], [45, 105], [9, 105]].map((p) => [L.X(p[0]), L.Y(p[1])]);
        x.strokeStyle = INK; x.lineWidth = 4.5 * fs; x.lineJoin = 'miter';
        x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); x.stroke();
        x.lineWidth = 2.4 * fs;
        const hs = [[1, 52, -30], [2, 40, 34], [4, 46, 26], [6, -40, 36]];
        hs.forEach(([i, dx, dy]) => {
          const p = pts[i], a = dx * fs, b = dy * fs;
          x.beginPath(); x.moveTo(p[0] - a, p[1] - b); x.lineTo(p[0] + a, p[1] + b); x.stroke();
          x.fillStyle = INK;
          x.beginPath(); x.arc(p[0] - a, p[1] - b, 5.5 * fs, 0, TAU); x.fill();
          x.beginPath(); x.arc(p[0] + a, p[1] + b, 5.5 * fs, 0, TAU); x.fill();
        });
        pts.forEach((p) => { x.fillStyle = '#fff'; x.fillRect(p[0] - 7 * fs, p[1] - 7 * fs, 14 * fs, 14 * fs); x.strokeStyle = INK; x.lineWidth = 2.6 * fs; x.strokeRect(p[0] - 7 * fs, p[1] - 7 * fs, 14 * fs, 14 * fs); });
        x.save(); x.translate(pts[0][0], pts[0][1] - 28 * fs); tab(x, 'MASK 1', '#fff', INK); x.restore();
        tab(x, 'SHAPE', '#fff', INK);
      });
      // 5 MATTE: black card, the F and the playhead cut clean through, the name printed in bone.
      const card = tex((x) => {
        x.fillStyle = COAL; x.fillRect(0, 0, W, H);
        x.globalCompositeOperation = 'destination-out';
        keyRows(x); keyHead(x);
        x.globalCompositeOperation = 'source-over';
        kit.wordmark(x, L.left, L.wordY, L.wordPx, F.top);
        x.save(); x.translate(10 * fs, 10 * fs); tab(x, 'MATTE', BONE, INK); x.restore();
      });
      // The whole pile, flat, seen only through the holes.
      const flat = kit.layer();
      {
        const x = flat.g;
        [colour, clip, wav, headT].forEach((t) => x.drawImage(t.img, 0, 0, W, H));
        x.globalCompositeOperation = 'destination-in';
        x.fillStyle = '#000';
        x.beginPath();
        R.forEach((r) => x.roundRect(r.x, r.y, r.w, r.h, r.r));
        x.roundRect(L.X(F.head.x), L.Y(F.head.y), F.head.w * L.s, F.head.h * L.s, F.head.r * L.s);
        F.head.tri.forEach((p, i) => (i ? x.lineTo(L.X(p[0]), L.Y(p[1])) : x.moveTo(L.X(p[0]), L.Y(p[1]))));
        x.closePath();
        x.fill();
        x.globalCompositeOperation = 'source-over';
      }

      const sheets = [
        { t: colour, side: '#8f2a10', solid: true, h: 9 },
        { t: clip, side: null, gel: 'rgba(255,255,255,.2)' },
        { t: wav, side: null, gel: 'rgba(255,255,255,.14)' },
        { t: headT, side: null, gel: 'rgba(41,217,187,.2)' },
        { t: maskT, side: null, gel: 'rgba(246,197,68,.62)' },
      ];
      const gap = H * 0.3;
      const zRest = [0, 1, 1.82, 2.5, 3.46].map((v) => v * gap);
      const spread = zRest[4];
      const delay = [0.03, 0.0, 0.07, 0.045, 0.015];
      const damp = [7, 5.2, 6.4, 5.6, 4.6], wob = [14, 10, 15.5, 11.5, 9];
      const tDrop = 1.66, tImp = 2.14;
      const tFlatten = tImp - 0.15;
      const cam = new Cam(W / 2, H / 2);
      cam.f = H * 0.92;
      // The slab falls, hits the top sheet, and loses a little speed at every sheet it picks up on the way down.
      const zHit = [spread * 1.12, zRest[3] * 1.04, zRest[2] * 1.02, zRest[1], 0];
      const hitT = [tDrop + 0.2, tDrop + 0.265, tDrop + 0.315, tDrop + 0.38, tImp];
      const cardKeys = [[tDrop, spread * 2.05], [hitT[0], zHit[0], 'in2'], [hitT[1], zHit[1], 'in2'], [hitT[2], zHit[2], 'in2'], [hitT[3], zHit[3], 'in2'], [hitT[4], zHit[4], 'in2']];
      const zCard = (t) => kit.k(t, cardKeys);
      const stretch = (t) => kit.k(t, [[1.3, 1], [tDrop + 0.1, 1.1, 'io2']]);
      const zOf = (i, t) => {
        const q = Math.max(0, t - delay[i]);
        let z = zRest[i] * (1 - Math.exp(-damp[i] * q) * Math.cos(wob[i] * q));
        z *= stretch(t);
        if (t > tDrop) z = Math.min(z, zCard(t));
        return z;
      };
      const lightX = 0.2, lightY = 0.34;
      const zFloor = -H * 0.06;
      const corner = [0, 0, 0, 0, 0, 0, 0, 0];
      const quad = (z) => {
        const x0 = -W / 2, x1 = W / 2, y0 = -H / 2, y1 = H / 2;
        cam.p(x0, y0, z); corner[0] = cam.X; corner[1] = cam.Y;
        cam.p(x1, y0, z); corner[2] = cam.X; corner[3] = cam.Y;
        cam.p(x1, y1, z); corner[4] = cam.X; corner[5] = cam.Y;
        cam.p(x0, y1, z); corner[6] = cam.X; corner[7] = cam.Y;
        return corner;
      };
      const shadowOn = (zSheet, zPlane) => {
        const dz = zSheet - zPlane;
        const x0 = -W / 2 + dz * lightX, x1 = W / 2 + dz * lightX, y0 = -H / 2 + dz * lightY, y1 = H / 2 + dz * lightY;
        cam.p(x0, y0, zPlane); const a = cam.X, b = cam.Y;
        cam.p(x1, y0, zPlane); const c = cam.X, d = cam.Y;
        cam.p(x1, y1, zPlane); const e = cam.X, f = cam.Y;
        cam.p(x0, y1, zPlane); const h = cam.X, j = cam.Y;
        return [a, b, c, d, e, f, h, j];
      };
      const handles = (x, q) => {
        x.fillStyle = '#fff'; x.strokeStyle = INK; x.lineWidth = 1.2;
        for (let i = 0; i < 8; i += 2) { x.fillRect(q[i] - 3, q[i + 1] - 3, 6, 6); x.strokeRect(q[i] - 3, q[i + 1] - 3, 6, 6); }
      };

      let azNow = 0, pitchNow = 0;
      const TWA = [2.5, 8, -7, 10, -13], TWW = [3.4, 4.6, 3.9, 3.1, 2.6];
      const twist = (i, t) => TWA[i] * Math.sin(TWW[i] * t) * Math.exp(-0.9 * t) * (1 - kit.map(t, tDrop, tDrop + 0.2));
      const faceSheet = (i, t) => cam.turn((azNow + twist(i, t)) * RAD, pitchNow * RAD);
      function setCam(t) {
        const pitch = kit.k(t, [[0, 66], [0.5, 58, 'out2'], [tFlatten, 56], [tImp, 0, 'in3']]);
        const az = kit.k(t, [[0, -158], [0.1, -164, 'out2'], [0.98, 30, 'io2'], [1.46, 14, 'io2'], [tFlatten, 17, 'io2'], [tImp, 0, 'in3']]);
        const kd = kit.k(t, [[0, 0.86], [0.62, 2.02, 'out3'], [1.4, 1.84], [tFlatten, 2.0, 'io2'], [tImp, 1, 'in3']]);
        azNow = az; pitchNow = pitch;
        cam.turn(az * RAD, pitch * RAD);
        cam.dist = cam.f * kd;
        cam.tz = kit.k(t, [[0, 0], [0.6, spread * 0.5, 'out3'], [tDrop, spread * 0.5 * stretch(tDrop)], [tFlatten, spread * 0.36], [tImp, 0, 'in3']]);
      }

      function scenery(x, t) {
        x.fillStyle = BONE; x.fillRect(0, 0, W, H);
        setCam(t);
        // Shadows on the studio floor, one per sheet.
        const pile = [];
        for (let i = 0; i < 5; i++) pile.push(zOf(i, t));
        const zc = t > tDrop ? zCard(t) : null;
        x.fillStyle = 'rgba(52,44,32,.13)';
        for (let i = 0; i < 5; i++) { faceSheet(i, t); poly(x, shadowOn(pile[i], zFloor)); x.fill(); }
        if (zc !== null) { cam.turn(azNow * RAD, pitchNow * RAD); x.fillStyle = 'rgba(52,44,32,.32)'; poly(x, shadowOn(zc, zFloor)); x.fill(); }
        const gelOn = kit.map(t, 0.04, 0.34);
        for (let i = 0; i < 5; i++) {
          const sh = sheets[i], z = pile[i];
          faceSheet(i, t);
          if (sh.solid) {
            const a = quad(z).slice(), b = quad(z - sh.h);
            x.fillStyle = sh.side;
            for (let n = 0; n < 8; n += 2) {
              const m = (n + 2) % 8;
              poly(x, [a[n], a[n + 1], a[m], a[m + 1], b[m], b[m + 1], b[n], b[n + 1]]); x.fill();
            }
          }
          const q = quad(z).slice();
          if (sh.gel) { x.globalAlpha *= gelOn; x.fillStyle = sh.gel; poly(x, q); x.fill(); x.globalAlpha = 1; }
          drawMesh(x, dpr, cam, sh.t.img, -W / 2, -H / 2, W / 2, H / 2, z, NU, NV, sh.t.mask);
          // The next sheet up throws a hard shadow on this one.
          if (i < 4) {
            x.save();
            poly(x, q); x.clip();
            x.fillStyle = 'rgba(30,22,14,.22)';
            poly(x, shadowOn(pile[i + 1], z)); x.fill();
            x.restore();
          }
          x.strokeStyle = INK; x.lineWidth = 1.3;
          poly(x, q); x.stroke();
          if (!sh.solid) handles(x, q);
        }
        if (zc !== null) {
          cam.turn(azNow * RAD, pitchNow * RAD);
          const a = quad(zc).slice(), b = quad(zc - 12);
          x.fillStyle = '#26262a';
          for (let n = 0; n < 8; n += 2) {
            const m = (n + 2) % 8;
            poly(x, [a[n], a[n + 1], a[m], a[m + 1], b[m], b[m + 1], b[n], b[n + 1]]); x.fill();
          }
          drawMesh(x, dpr, cam, card.img, -W / 2, -H / 2, W / 2, H / 2, zc, NU, NV, null);
        }
      }

      [colour, clip, wav, headT, maskT, card].forEach((o) => off.g.drawImage(o.img, 0, 0, 1, 1));
      off.g.drawImage(flat.canvas, 0, 0, 1, 1);
      return function seek(t) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.globalAlpha = 1;
        if (t < tImp) {
          const n = t < 0.5 ? 7 : t < 1.05 ? 4 : t < tDrop ? 2 : t < tFlatten ? 4 : 8;
          shutter(g, off, dpr, t, t < 1.05 ? 0.016 : t < tDrop ? 0.01 : t < tFlatten ? 0.012 : 0.011, n, scenery);
          return;
        }
        // Everything is flat now and only the holes show the pile. The whole frame rings from the hit.
        const q = t - tImp;
        const zoom = 1 + 0.085 * Math.exp(-15 * q) * Math.cos(44 * q);
        const fr = kit.frame(q, 24);
        const amp = 9 * Math.exp(-15 * q);
        const jx = (kit.hash(fr, 8) - 0.5) * amp, jy = (kit.hash(fr, 9) - 0.5) * amp;
        g.fillStyle = COAL; g.fillRect(0, 0, W, H);
        g.save();
        g.translate(W / 2 + jx, H / 2 + jy); g.scale(zoom, zoom); g.translate(-W / 2, -H / 2);
        const cut = [0.42, 0.56, 0.62];
        const allClean = q >= cut[2] + 0.04;
        if (allClean) {
          kit.drawF(g, L.cx, L.cy, L.s, { knock: COAL });
        } else {
          g.drawImage(flat.canvas, 0, 0, W, H);
          // Each row cuts to the clean grey on its own beat.
          g.save();
          g.translate(L.X(0), L.Y(0)); g.scale(L.s, L.s);
          const gr = g.createLinearGradient(0, 20, 0, 100);
          gr.addColorStop(0, F.top); gr.addColorStop(1, F.bottom);
          g.fillStyle = gr;
          F.clips.forEach((c, i) => { if (q >= cut[i]) { g.beginPath(); g.roundRect(c.x, c.y, c.w, c.h, c.r); g.fill(); } });
          g.restore();
        }
        kit.wordmark(g, L.left, L.wordY, L.wordPx, F.top);
        g.restore();
      };
    },
  });

  // ======================================================================================================
  // (b) THE ZOOM-OUT: one clip fills the phone, then the camera leaves until the whole edit is one letter.
  // ======================================================================================================
  FMI.add({
    id: 'layers-zoomout',
    lane: LANE,
    name: 'Timeline Zoom-Out',
    blurb: 'It opens on one clip filling the screen, then pulls back through thousands of clips until the edit itself is a giant F, and snaps down to the logo.',
    dur: 2.8,
    ground: '#121314',
    make(stage, kit) {
      const W = kit.w, H = kit.h, dpr = kit.dpr;
      const g = kit.canvas({ alpha: false });
      const off = kit.layer();
      const L = logoLayout(kit), F = kit.F;
      const GROUND = '#121314';
      const u = 150 / F.box.h;            // tracks per logo unit
      const lx = (v) => (v - F.box.x) * u, ly = (v) => (v - F.box.y) * u;
      const bars = F.clips.map((c) => ({ x0: lx(c.x), x1: lx(c.x + c.w), y0: ly(c.y), y1: ly(c.y + c.h), r: c.r * u }));
      const FC = { x: lx(F.box.x + F.box.w / 2), y: ly(F.box.y + F.box.h / 2) };
      const xL = -74, xR = 204, yT = -112, yB = 262;

      const VIDEO = ['#f0a73a', '#e0607a', '#dcc591', '#3fb39f', '#e8783f', '#c7c98a', '#f2c94c'];
      const AUDIO = ['#7fae4e', '#9ab54e', '#5fa56b'];
      const DIMV = ['#2c2e31', '#303235', '#292b2e', '#35302c'];
      const DIMA = ['#25302a', '#2a332b'];
      const NAMES = ['A001_C014', 'drone_02', 'bts_take3', 'roll_B_44', 'sunset_ok', 'vo_line7', 'broll_city', 'wide_FINAL', 'cu_hands', 'sfx_whoosh', 'A003_C102', 'music_v2'];

      const parse = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
      const mix = (h, o, p) => { const a = parse(h), b = parse(o); return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * p) + ',' + Math.round(a[1] + (b[1] - a[1]) * p) + ',' + Math.round(a[2] + (b[2] - a[2]) * p) + ')'; };
      const rows = [];
      let nClips = 0, bandEnd = -1e9, bandN = 0, bandKind = 0, bandCol = VIDEO[0];
      for (let r = yT; r < yB; r++) {
        while (r >= bandEnd) {
          bandN++;
          bandEnd = r + 2 + Math.floor(kit.hash(bandN, 31) * 7);
          bandKind = kit.hash(bandN, 32) < 0.3 ? 1 : 0;
          const pl = bandKind ? AUDIO : VIDEO;
          bandCol = pl[Math.floor(kit.hash(bandN, 33) * pl.length)];
        }
        const kind = bandKind;
        const spans = [];
        for (const b of bars) {
          if (r >= Math.floor(b.y0) && r < Math.ceil(b.y1)) {
            const dy = Math.min(r + 0.5 - b.y0, b.y1 - (r + 0.5));
            const ins = dy < b.r ? b.r - Math.sqrt(Math.max(0, b.r * b.r - (b.r - dy) * (b.r - dy))) : 0;
            spans.push([b.x0 + ins, b.x1 - ins]);
          }
        }
        const clips = [];
        let x = xL + kit.hash(r, 22) * -14, n = 0;
        const addRun = (a, b, lit) => {
          let px = a;
          while (px < b - 0.05) {
            const h = kit.hash(n++ + r * 977, 23);
            const len = lit ? 2 + h * h * 14 : 3 + h * 22;
            let end = Math.min(b, px + len);
            if (b - end < 0.8) end = b;
            const hc = kit.hash(n + r * 131, 24);
            const pal = kind ? AUDIO : VIDEO;
            const base = hc < 0.8 ? bandCol : pal[Math.floor((hc - 0.8) * 5 * pal.length)];
            const tone = kit.hash(n + r * 211, 28);
            const col = lit ? mix(base, tone < 0.5 ? '#000000' : '#ffffff', Math.abs(tone - 0.5) * 0.34) : mix(base, '#202224', 0.86 + tone * 0.08);
            clips.push({ a: px, b: end, c: col, dim: mix(base, '#1b1d1f', 0.93 + tone * 0.05), lit, kind, th: Math.floor(kit.hash(n + r * 37, 25) * 8), wo: kit.hash(n + r * 71, 26), nm: Math.floor(kit.hash(n + r * 53, 27) * NAMES.length) });
            px = end;
            nClips++;
          }
        };
        let cursor = x;
        spans.sort((p, q) => p[0] - q[0]);
        for (const sp of spans) {
          if (sp[0] > cursor) addRun(cursor, sp[0], false);
          addRun(sp[0], sp[1], true);
          cursor = sp[1];
        }
        addRun(cursor, xR, false);
        rows.push(clips);
      }

      // Thumbnails and a strip of audio, drawn once.
      const TW = 108, TH = 61;
      const atlas = kit.layer(TW * 4, TH * 2);
      for (let i = 0; i < 8; i++) scene(atlas.g, (i % 4) * TW, (i >> 2) * TH, TW, TH, i, 0.4);
      const atlasPxW = TW * dpr, atlasPxH = TH * dpr;
      const wv = kit.layer(1400, 40);
      wave(wv.g, 0, 0, 1400, 40, 1.3, 'rgba(10,12,12,.86)', 1.6, 1);
      const wvIm = wv.canvas;
      const wvPxH = wvIm.height;

      // The entire edit as one big picture, for when the clips are too small to be worth drawing one by one.
      const Sf = (0.95 * W) / (F.box.w * u);
      const ppu = kit.clamp(Sf * dpr * 1.4, 3, 8);
      const worldW = xR - xL, worldH = yB - yT;
      const worldC = document.createElement('canvas');
      worldC.width = Math.ceil(worldW * ppu); worldC.height = Math.ceil(worldH * ppu);
      {
        const x = worldC.getContext('2d');
        x.scale(ppu, ppu); x.translate(-xL, -yT);
        x.fillStyle = GROUND; x.fillRect(xL, yT, worldW, worldH);
        rows.forEach((clips, ri) => {
          const r = ri + yT;
          for (const c of clips) {
            x.fillStyle = c.c;
            x.fillRect(c.a, r + 0.08, Math.max(0.1, c.b - c.a - 0.09), 0.84);
            if (c.lit && !c.kind) { x.fillStyle = 'rgba(255,255,255,.13)'; x.fillRect(c.a, r + 0.08, Math.max(0.1, c.b - c.a - 0.09), 0.34); }
            if (c.lit && c.kind) { x.fillStyle = 'rgba(10,20,10,.3)'; x.fillRect(c.a, r + 0.42, Math.max(0.1, c.b - c.a - 0.09), 0.2); }
          }
        });
        x.fillStyle = F.teal;
        x.fillRect(lx(F.head.x), ly(F.head.y), F.head.w * u, F.head.h * u);
        x.beginPath(); F.head.tri.forEach((p, i) => (i ? x.lineTo(lx(p[0]), ly(p[1])) : x.moveTo(lx(p[0]), ly(p[1])))); x.fill();
      }

      // The same edit with every clip dark: what is left behind when the bright F leaves.
      const dimC = document.createElement('canvas');
      const dimPpu = Math.min(ppu, 5);
      dimC.width = Math.ceil(worldW * dimPpu); dimC.height = Math.ceil(worldH * dimPpu);
      {
        const x = dimC.getContext('2d');
        x.scale(dimPpu, dimPpu); x.translate(-xL, -yT);
        x.fillStyle = GROUND; x.fillRect(xL, yT, worldW, worldH);
        rows.forEach((clips, ri) => {
          const r = ri + yT;
          for (const c of clips) { x.fillStyle = c.dim; x.fillRect(c.a, r + 0.08, Math.max(0.1, c.b - c.a - 0.09), 0.84); }
        });
      }

      // Just the bright F and its playhead, to throw down onto the dark edit at the end.
      const fPad = 4, fW = F.box.w * u + fPad * 2, fH = F.box.h * u + fPad * 2;
      const fOnly = document.createElement('canvas');
      fOnly.width = Math.ceil(fW * ppu); fOnly.height = Math.ceil(fH * ppu);
      {
        const x = fOnly.getContext('2d');
        x.scale(ppu, ppu); x.translate(fPad, fPad);
        rows.forEach((clips, ri) => {
          const r = ri + yT;
          for (const c of clips) if (c.lit) { x.fillStyle = c.c; x.fillRect(c.a, r + 0.08, Math.max(0.1, c.b - c.a - 0.09), 0.84); }
        });
        x.fillStyle = F.teal;
        x.fillRect(lx(F.head.x), ly(F.head.y), F.head.w * u, F.head.h * u);
        x.beginPath(); F.head.tri.forEach((p, i) => (i ? x.lineTo(lx(p[0]), ly(p[1])) : x.moveTo(lx(p[0]), ly(p[1])))); x.fill();
      }

      // The one clip we start on, drawn big, with a name he will recognise.
      const hr = 38;
      const heroRow = rows[hr - yT];
      let hi = heroRow.findIndex((c) => c.a > 58 && c.b < 124);
      if (hi < 0) hi = 0;
      const hero = heroRow[hi];
      hero.b = Math.min(hero.a + 6, 126); hero.c = '#f0a73a'; hero.kind = 0;
      heroRow.splice(hi + 1, heroRow.findIndex((c) => c.a >= hero.b) - hi - 1);
      const heroNext = heroRow[hi + 1];
      if (heroNext) heroNext.a = hero.b;
      const S0 = H * 1.04;
      const tileU = 1.05;
      const tilePx = Math.min(S0 * Math.min(dpr, 1.6), 1500);
      const tile = document.createElement('canvas');
      tile.width = Math.ceil(tileU * tilePx); tile.height = Math.ceil(0.84 * tilePx);
      {
        const x = tile.getContext('2d');
        x.scale(tilePx, tilePx);
        x.fillStyle = hero.c; x.beginPath(); x.roundRect(0, 0, tileU + 0.2, 0.84, 0.035); x.fill();
        scene(x, 0.012, 0.075, 0.33 * (16 / 9) * 1.5, 0.495, 0, 0.1);
        x.fillStyle = '#1b1208'; x.fillRect(0.012, 0.57, tileU, 0.26);
        const w2 = document.createElement('canvas'); w2.width = 1400; w2.height = 200;
        wave(w2.getContext('2d'), 0, 0, 1400, 200, 3.1, '#f0a73a', 3, 2);
        x.drawImage(w2, 0.012, 0.585, tileU, 0.23);
        x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 0, 0.012, 0.84);
        x.setTransform(1, 0, 0, 1, 0, 0);
        x.fillStyle = '#17110a';
        const lab = 0.0245 * tilePx;
        x.font = '700 ' + lab + 'px ' + kit.SYS; x.textBaseline = 'middle'; x.textAlign = 'left';
        x.fillText('intro_v47_FINAL_final2.mov', 0.03 * tilePx, 0.04 * tilePx);
      }
      const hx = hero.a;

      const cam = new Cam(W / 2, H / 2);
      cam.f = H * 1.12;
      const lnS0 = Math.log(S0), lnSf = Math.log(Sf);
      const tSnap = 2.2;
      const zoomLog = (t) => kit.k(t, [[0, lnS0 + 0.05], [0.2, lnS0 + 0.09, 'out2'], [0.44, lnS0 - 0.9, 'in3'], [1.86, lnSf + 0.02, 'out3'], [tSnap, lnSf, 'lin']]);
      const out = { x: 0, y: 0 };
      function setCam(t) {
        const lnS = zoomLog(t), S = Math.exp(lnS);
        const pitch = kit.k(t, [[0, 0], [0.5, 37, 'out2'], [1.15, 31], [1.74, 0, 'io2']]);
        const az = kit.k(t, [[0, 0], [0.75, -27, 'out2'], [1.74, 0, 'io3']]);
        cam.turn(az * RAD, pitch * RAD);
        cam.dist = cam.f / S;
        const q = kit.clamp((1 - Sf / S) / (1 - Sf / S0));
        const startX = hx + 0.2, startY = hr + 0.5;
        cam.tx = FC.x + (startX - FC.x) * q;
        cam.ty = FC.y + (startY - FC.y) * q;
        cam.cy = kit.lerp(L.cy, H / 2, kit.clamp(q * 1.05));
        return S;
      }
      const footprint = () => {
        let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
        const pts = [[0, 0], [W, 0], [0, H], [W, H]];
        for (const p of pts) {
          cam.unproject(p[0], p[1], out);
          a = Math.min(a, out.x); b = Math.max(b, out.x); c = Math.min(c, out.y); d = Math.max(d, out.y);
        }
        return [a - 1, b + 1, c - 1, d + 1];
      };
      const imgOn = (x, im, sx, sy, sw, sh, a, b, c, d) => {
        cam.p(a, b, 0); const x0 = cam.X, y0 = cam.Y;
        cam.p(c, b, 0); const x1 = cam.X, y1 = cam.Y;
        cam.p(a, d, 0); const x2 = cam.X, y2 = cam.Y;
        x.setTransform(((x1 - x0) * dpr) / sw, ((y1 - y0) * dpr) / sw, ((x2 - x0) * dpr) / sh, ((y2 - y0) * dpr) / sh, x0 * dpr, y0 * dpr);
        x.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
      };
      function clipsDraw(x, S) {
        const fp = footprint();
        const r0 = Math.max(yT, Math.floor(fp[2])), r1 = Math.min(yB - 1, Math.ceil(fp[3]));
        for (let r = r0; r <= r1; r++) {
          const clips = rows[r - yT];
          let lo = 0, hi2 = clips.length;
          while (lo < hi2) { const m = (lo + hi2) >> 1; if (clips[m].b < fp[0]) lo = m + 1; else hi2 = m; }
          for (let i = lo; i < clips.length; i++) {
            const c = clips[i];
            if (c.a > fp[1]) break;
            const a = c.a, b = Math.max(c.a + 0.1, c.b - 0.09), y0 = r + 0.08, y1 = r + 0.92;
            cam.p(a, y0, 0); const px = cam.X, py = cam.Y, D = cam.D;
            if (D < 0.01) continue;
            cam.p(b, y0, 0); const qx = cam.X, qy = cam.Y;
            cam.p(b, y1, 0); const sx = cam.X, sy = cam.Y;
            cam.p(a, y1, 0); const tx = cam.X, ty = cam.Y;
            x.fillStyle = c.c;
            x.beginPath(); x.moveTo(px, py); x.lineTo(qx, qy); x.lineTo(sx, sy); x.lineTo(tx, ty); x.closePath(); x.fill();
            const loc = cam.f / D;
            if (loc < 11) continue;
            let dirty = false;
            if (!c.kind) {
              const tw = 0.5 * (16 / 9);
              const room = c.b - c.a - 0.12;
              const cnt = loc < 30 ? 1 : Math.min(Math.ceil(room / tw), 24);
              const sx0 = (c.th % 4) * atlasPxW, sy0 = (c.th >> 2) * atlasPxH;
              for (let n = 0; n < cnt; n++) {
                const xa = c.a + 0.03 + n * tw, xb = Math.min(xa + tw - 0.015, b - 0.02);
                if (xb <= xa || xa > fp[1] || xb < fp[0]) continue;
                const frac = (xb - xa) / (tw - 0.015);
                imgOn(x, atlas.canvas, sx0, sy0, atlasPxW * frac, atlasPxH, xa, y0 + 0.05, xb, y0 + 0.55);
                dirty = true;
              }
            }
            if (loc >= 22) {
              const span = Math.min(b - a - 0.02, 8);
              const ww = span * 60;
              const y3 = c.kind ? y0 + 0.1 : y0 + 0.57, y4 = c.kind ? y1 - 0.1 : y1 - 0.02;
              imgOn(x, wvIm, (c.wo * 800) * dpr, 0, ww * dpr, wvPxH, a + 0.01, y3, a + 0.01 + span, y4);
              dirty = true;
            }
            if (loc >= 90) {
              cam.p(a + 0.03, y0, 0); const ox = cam.X, oy = cam.Y;
              cam.p(a + 1.03, y0, 0); const ux = (cam.X - ox) / 100, uy = (cam.Y - oy) / 100;
              cam.p(a + 0.03, y0 + 1, 0); const vx = (cam.X - ox) / 100, vy = (cam.Y - oy) / 100;
              x.setTransform(ux * dpr, uy * dpr, vx * dpr, vy * dpr, ox * dpr, oy * dpr);
              x.fillStyle = 'rgba(0,0,0,.8)';
              x.font = '600 4px ' + kit.SYS; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
              x.fillText(NAMES[c.nm], 0, 4);
              dirty = true;
            }
            if (dirty) x.setTransform(dpr, 0, 0, dpr, 0, 0);
          }
        }
        // The hero's front end.
        if (S > 22) {
          cam.p(hx, hr + 0.08, 0); const ox = cam.X, oy = cam.Y;
          cam.p(hx + tileU, hr + 0.08, 0); const ux = cam.X, uy = cam.Y;
          cam.p(hx, hr + 0.92, 0); const vx = cam.X, vy = cam.Y;
          x.setTransform(((ux - ox) * dpr) / tile.width, ((uy - oy) * dpr) / tile.width, ((vx - ox) * dpr) / tile.height, ((vy - oy) * dpr) / tile.height, ox * dpr, oy * dpr);
          x.drawImage(tile, 0, 0);
          x.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        // The giant playhead: a teal wall going past.
        x.fillStyle = F.teal;
        const hd = F.head;
        const hx0 = lx(hd.x), hx1 = lx(hd.x + hd.w), hy0 = ly(hd.y), hy1 = ly(hd.y + hd.h);
        if (hx1 > fp[0] && hx0 < fp[1] && hy1 > fp[2] && hy0 < fp[3]) {
          cam.p(hx0, hy0, 0); const a1 = cam.X, a2 = cam.Y;
          cam.p(hx1, hy0, 0); const b1 = cam.X, b2 = cam.Y;
          cam.p(hx1, hy1, 0); const c1 = cam.X, c2 = cam.Y;
          cam.p(hx0, hy1, 0); const d1 = cam.X, d2 = cam.Y;
          x.beginPath(); x.moveTo(a1, a2); x.lineTo(b1, b2); x.lineTo(c1, c2); x.lineTo(d1, d2); x.closePath(); x.fill();
          x.beginPath();
          hd.tri.forEach((p, i) => { cam.p(lx(p[0]), ly(p[1]), 0); if (i) x.lineTo(cam.X, cam.Y); else x.moveTo(cam.X, cam.Y); });
          x.closePath(); x.fill();
        }
      }
      function frameAt(x, t) {
        const S = setCam(t);
        x.fillStyle = GROUND; x.fillRect(0, 0, W, H);
        if (S > 12) clipsDraw(x, S);
        else drawMesh(x, dpr, cam, worldC, xL, yT, xR, yB, 0, 18, 24, null);
      }

      [worldC, dimC, fOnly, atlas.canvas, wvIm, tile].forEach((im) => off.g.drawImage(im, 0, 0, 1, 1));
      return function seek(t) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.globalAlpha = 1;
        if (t < tSnap) {
          const S = Math.exp(zoomLog(t));
          const speed = Math.abs(zoomLog(t) - zoomLog(t - 0.02)) / 0.02;
          const n = speed < 0.3 ? 1 : S > 150 ? 5 : S > 12 ? 3 : 5;
          shutter(g, off, dpr, t, S > 12 ? 0.016 : 0.028, n, frameAt);
          return;
        }
        const q = t - tSnap;
        setCam(tSnap);
        const land = 0.11;
        const shake = q >= land ? 5 * Math.exp(-24 * (q - land)) * Math.cos(70 * (q - land)) : 0;
        cam.cy += shake;
        drawMesh(g, dpr, cam, dimC, xL, yT, xR, yB, 0, 18, 24, null);
        const big = u * Sf;
        const sc = kit.k(q, [[0, big], [land, L.s * 0.955, 'in3'], [0.2, L.s, 'io2']]);
        if (q < land) {
          // Still the bright clips, falling away from the lens.
          const ps = sc / u;
          g.drawImage(fOnly, L.cx - (FC.x + fPad) * ps, L.cy - (FC.y + fPad) * ps, fW * ps, fH * ps);
        } else {
          kit.drawF(g, L.cx, L.cy + shake, sc, { knock: '#1a1c1e' });
          kit.wordmark(g, L.left, L.wordY + shake, L.wordPx, F.top);
        }
      };
    },
  });

  // ======================================================================================================
  // (c) THE TUMBLERS: three heavy billets spin on the playhead like a lock, and click home one at a time.
  // ======================================================================================================
  FMI.add({
    id: 'layers-tumbler',
    lane: LANE,
    name: 'Revolving Bars',
    blurb: 'Three heavy steel bars spin round the playhead like a revolving door, slowing notch by notch, and lock flat one at a time with a thud.',
    dur: 2.95,
    ground: '#d99a1c',
    make(stage, kit) {
      const W = kit.w, H = kit.h, dpr = kit.dpr;
      const g = kit.canvas({ alpha: false });
      const off = kit.layer();
      const L = logoLayout(kit), F = kit.F;
      const u = L.s;
      const AX = 82, AY = F.box.y + F.box.h / 2;
      const sx0 = L.X(AX), sy0 = L.Y(AY);

      // The wall: painted plaster with one lamp on it, and the same wall in shadow.
      const M = Math.ceil(Math.max(W, H) * 0.08);
      const wallW = W + M * 2, wallH = H + M * 2;
      const paintWall = (lg, base, pool) => {
        const c = lg.g;
        c.fillStyle = base; c.fillRect(0, 0, wallW, wallH);
        const gr = c.createRadialGradient(wallW * 0.42, wallH * 0.34, 10, wallW * 0.42, wallH * 0.34, wallH * 0.62);
        gr.addColorStop(0, pool); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr; c.fillRect(0, 0, wallW, wallH);
        const r = kit.rng(19);
        for (let i = 0; i < 2600; i++) {
          const a = r();
          c.fillStyle = a < 0.5 ? 'rgba(0,0,0,' + (0.03 + r() * 0.07) + ')' : 'rgba(255,240,215,' + (0.015 + r() * 0.035) + ')';
          const big = r() < 0.06;
          c.fillRect(r() * wallW, r() * wallH, big ? 2 + r() * 9 : 1 + r() * 1.6, big ? 1 + r() * 3 : 1 + r() * 1.6);
        }
      };
      const lit = kit.layer(wallW, wallH), dark = kit.layer(wallW, wallH);
      paintWall(lit, '#d99a1c', 'rgba(255,190,60,.16)');
      paintWall(dark, '#3d2a06', 'rgba(70,48,10,.2)');

      // Rounded outline of a bar, clockwise from the top left. side 0 follows the left end, side 1 follows the right.
      const seg = 3, outline = [];
      const arc = (cx, cy, a0, side) => {
        for (let i = 0; i <= seg; i++) {
          const a = a0 + (i / seg) * (Math.PI / 2);
          outline.push({ side, cx, cy, ca: Math.cos(a), sa: Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) });
        }
      };
      arc(1, 1, Math.PI, 0);          // top left
      arc(-1, 1, -Math.PI / 2, 1);    // top right
      arc(-1, -1, 0, 1);              // bottom right
      arc(1, -1, Math.PI / 2, 0);     // bottom left
      const NP = outline.length;

      const grade = (ly) => {
        const p = kit.clamp((ly - 20) / 80);
        return [245 + (58 - 245) * p, 245 + (58 - 245) * p, 247 + (63 - 247) * p];
      };
      const THICK = 19 * u, ZF = -2.6 * u;
      const bars = [
        { c: F.clips[0], T: 2.12, A: 7.25, p: 2.15, B: 1.9, x1s: (106 - AX) * u, K: 6, ph: 0 },
        { c: F.clips[1], T: 1.66, A: 6.5, p: 2.05, B: 1.5, x1s: -1.8 * u, K: 8, ph: 0 },
        { c: F.clips[2], T: 1.22, A: 5.33, p: 1.9, B: 1.2, x1s: -1.8 * u, K: 10, ph: 0 },
      ];
      bars.forEach((b) => {
        b.x0 = (b.c.x - AX) * u;
        b.x1l = (b.c.x + b.c.w - AX) * u;
        b.y0 = (b.c.y - AY) * u;
        b.y1 = (b.c.y + b.c.h - AY) * u;
        b.r = b.c.r * u;
        b.gt = grade(b.c.y); b.gb = grade(b.c.y + b.c.h);
        b.gm = [(b.gt[0] + b.gb[0]) / 2, (b.gt[1] + b.gb[1]) / 2, (b.gt[2] + b.gb[2]) / 2];
      });
      const TF = 2.56;                // the little triangle on top is last
      const angleOf = (T, A, p, B, K, t) => {
        const q = 1 - t / T;
        if (q > 0) {
          const go = (A * Math.pow(q, p) + B * q) * TAU * 0.5;
          return -(go + (0.82 * Math.sin(K * go)) / K);
        }
        const r = t - T;                  // past the stop: it hits, rebounds a little, hits again
        return (0.1 * Math.sin(Math.min(1, r / 0.07) * Math.PI) * (r < 0.07 ? 1 : 0)) + (r > 0.07 ? 0.028 * Math.sin(Math.min(1, (r - 0.07) / 0.05) * Math.PI) : 0);
      };
      const impacts = [[bars[2].T, 0.75], [bars[1].T, 1.0], [bars[0].T, 1.5], [2.32, 1.3], [TF, 0.42]];
      const jolt = (t) => {
        let y = 0, z = 0;
        for (const [T, A] of impacts) {
          const q = t - T;
          if (q < 0) continue;
          const e = Math.exp(-20 * q) * A;
          y += e * Math.cos(58 * q) * 9;
          z += e * Math.cos(46 * q) * 0.035;
        }
        return [y, z];
      };

      const pluck = (t) => {
        let v = 0;
        for (const [T, A] of impacts) {
          const q = t - T;
          if (q < 0) continue;
          v += A * Math.exp(-11 * q) * Math.sin(62 * q);
        }
        return v * 4.2 * u;
      };
      const LX = -0.46, LY = -0.72, LZ = 0.52;   // lamp, high and to the left, slightly in front
      const VZ = 1;
      const hx = LX, hy = LY, hz = LZ + VZ;
      const hl = hypot(hx, hy, hz);
      const SHX = 0.27, SHY = 0.34;              // the slant of the cast shadows
      const ZW0 = -((AX - 14) * u + THICK + 12 * u), ZW1 = ZF - THICK - 2 * u;
      const TW = 2.32;
      const zWall = (t) => kit.k(t, [[2.15, ZW0], [TW, ZW1, 'in3']]);

      // Camera.
      const c = { f: 1, dist: 1, cy: 1, sy: 0, cp: 1, sp: 0, cr: 1, sr: 0, ox: 0, oy: 0, X: 0, Y: 0, D: 1, t: 0 };
      const pj = (x, y, z) => {
        const a = x * c.cy + z * c.sy, b = -x * c.sy + z * c.cy;
        const y2 = y * c.cp - b * c.sp, z2 = y * c.sp + b * c.cp;
        const x3 = a * c.cr - y2 * c.sr, y3 = a * c.sr + y2 * c.cr;
        const d = Math.max(c.dist - z2, 6);
        const s = c.f / d;
        c.X = c.ox + x3 * s; c.Y = c.oy + y3 * s; c.D = d;
      };
      function setCam(t) {
        const j = jolt(t);
        const ff = kit.k(t, [[0, 0.72], [1.3, 1.25, 'lin'], [2.12, 1.7], [2.36, 12, 'in3']]) * H;
        const zoom = kit.k(t, [[0, 0.56], [0.5, 0.66, 'out2'], [1.3, 0.8, 'io2'], [2.2, 1, 'io2']]) + j[1];
        c.f = ff; c.dist = ff * zoom;
        const yaw = kit.k(t, [[0, 40], [0.95, -16, 'io2'], [1.7, 13, 'io2'], [2.36, 0, 'in2']]) * RAD;
        const pit = kit.k(t, [[0, 33], [0.9, 25], [1.66, 15, 'io2'], [2.36, 0, 'io2']]) * RAD;
        const rol = kit.k(t, [[0, -14], [1.2, -4, 'out2'], [2.2, 0]]) * RAD;
        c.cy = Math.cos(yaw); c.sy = Math.sin(yaw); c.cp = Math.cos(pit); c.sp = Math.sin(pit); c.cr = Math.cos(rol); c.sr = Math.sin(rol);
        c.ox = kit.k(t, [[0, W * 0.64], [1.5, sx0 + W * 0.02, 'io2'], [2.3, sx0, 'io2']]);
        c.oy = kit.k(t, [[0, H * 0.44], [1.5, sy0 + H * 0.05, 'io2'], [2.3, sy0, 'io2']]) + j[0];
      }
      const pts = new Float64Array(NP * 2 * 3);
      const hull = (arr, n) => {
        const idx = [];
        for (let i = 0; i < n; i++) idx.push(i);
        idx.sort((p, q) => arr[p * 2] - arr[q * 2] || arr[p * 2 + 1] - arr[q * 2 + 1]);
        const cross = (o, p, q) => (arr[p * 2] - arr[o * 2]) * (arr[q * 2 + 1] - arr[o * 2 + 1]) - (arr[p * 2 + 1] - arr[o * 2 + 1]) * (arr[q * 2] - arr[o * 2]);
        const h = [];
        for (const i of idx) { while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], i) <= 0) h.pop(); h.push(i); }
        const lower = h.length + 1;
        for (let k = idx.length - 2; k >= 0; k--) { const i = idx[k]; while (h.length >= lower && cross(h[h.length - 2], h[h.length - 1], i) <= 0) h.pop(); h.push(i); }
        h.pop();
        return h;
      };
      const shadowArr = new Float64Array(NP * 2 * 2);

      const barState = (b, t) => {
        const th = angleOf(b.T, b.A, b.p, b.B, b.K, t);
        const trim = kit.k(t, [[b.T, b.x1s], [b.T + 0.06, b.x1l, 'out3']]);
        return { th, x1: trim };
      };
      const rgb = (v) => 'rgb(' + Math.min(255, v[0] | 0) + ',' + Math.min(255, v[1] | 0) + ',' + Math.min(255, v[2] | 0) + ')';
      const shade = (nx, ny, nz, base, gloss) => {
        const d = Math.max(0, nx * LX + ny * LY + nz * LZ);
        const sp = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), 36) * gloss;
        const k2 = 0.24 + d * 1.02;
        return [base[0] * k2 + sp * 255, base[1] * k2 + sp * 255, base[2] * k2 + sp * 255];
      };

      function drawBar(x, b, st, t) {
        const cs = Math.cos(st.th), sn = Math.sin(st.th);
        const lockP = kit.clamp(1 - Math.abs(st.th) / 0.5);
        let n = 0;
        for (let i = 0; i < NP; i++) {
          const o = outline[i];
          const lx = o.side ? st.x1 + o.cx * b.r + o.ca * b.r : b.x0 + o.cx * b.r + o.ca * b.r;
          const ly = o.cy > 0 ? b.y0 + b.r + o.sa * b.r : b.y1 - b.r + o.sa * b.r;
          // front then back
          for (let w = 0; w < 2; w++) {
            const lz = w ? ZF - THICK : ZF;
            const X = lx * cs + lz * sn, Z = -lx * sn + lz * cs;
            pj(X, ly, Z);
            pts[n++] = c.X; pts[n++] = c.Y;
          }
        }
        // Side faces, each shaded by its own normal.
        for (let i = 0; i < NP; i++) {
          const j = (i + 1) % NP;
          const a = i * 4, e = j * 4;
          const area =
            (pts[a] * pts[e + 1] - pts[e] * pts[a + 1]) +
            (pts[e] * pts[e + 3] - pts[e + 2] * pts[e + 1]) +
            (pts[e + 2] * pts[a + 3] - pts[a + 2] * pts[e + 3]) +
            (pts[a + 2] * pts[a + 1] - pts[a] * pts[a + 3]);
          if (area >= 0) continue;
          const o = outline[i], o2 = outline[j];
          const lnx = (o.nx + o2.nx) / 2, lny = (o.ny + o2.ny) / 2;
          const nx = lnx * cs, nz = -lnx * sn;
          x.fillStyle = rgb(shade(nx, lny, nz, b.gm, 0.5));
          x.beginPath();
          x.moveTo(pts[a], pts[a + 1]); x.lineTo(pts[e], pts[e + 1]); x.lineTo(pts[e + 2], pts[e + 3]); x.lineTo(pts[a + 2], pts[a + 3]);
          x.closePath(); x.fill();
          x.strokeStyle = x.fillStyle; x.lineWidth = 0.7; x.stroke();
        }
        // The big flat faces.
        let farea = 0, barea = 0;
        for (let i = 0; i < NP; i++) {
          const j = (i + 1) % NP;
          farea += pts[i * 4] * pts[j * 4 + 1] - pts[j * 4] * pts[i * 4 + 1];
          barea += pts[i * 4 + 2] * pts[j * 4 + 3] - pts[j * 4 + 2] * pts[i * 4 + 3];
        }
        const front = farea > 0, backF = barea < 0;
        if (front || backF) {
          const off2 = front ? 0 : 2;
          x.beginPath();
          for (let i = 0; i < NP; i++) { const a = i * 4 + off2; if (i) x.lineTo(pts[a], pts[a + 1]); else x.moveTo(pts[a], pts[a + 1]); }
          x.closePath();
          const nz0 = front ? 1 : -1;
          const nx = nz0 * sn, nz = nz0 * cs;
          const light = kit.lerp(0.26 + Math.max(0, nx * LX + nz * LZ) * 1.5, 1, lockP);
          const lz = front ? ZF : ZF - THICK;
          const Xm = (b.x0 * 0.5) * cs + lz * sn, Zm = -(b.x0 * 0.5) * sn + lz * cs;
          pj(Xm, b.y0, Zm); const gx0 = c.X, gy0 = c.Y;
          pj(Xm, b.y1, Zm); const gx1 = c.X, gy1 = c.Y;
          const gr = x.createLinearGradient(gx0, gy0, gx1, gy1);
          gr.addColorStop(0, rgb([b.gt[0] * light, b.gt[1] * light, b.gt[2] * light]));
          gr.addColorStop(1, rgb([b.gb[0] * light, b.gb[1] * light, b.gb[2] * light]));
          x.fillStyle = gr; x.fill();
          // A band of light that slides along the face as it turns: this is what makes it read as metal.
          const sheen = (1 - lockP) * Math.pow(Math.max(0, (nx * hx + nz * hz) / hl), 3);
          if (sheen > 0.02) {
            const a = (front ? 0 : 2), lFar = NP * 4 / 4;
            pj(b.x0 * cs + lz * sn, 0, -b.x0 * sn + lz * cs); const l0x = c.X, l0y = c.Y;
            pj(st.x1 * cs + lz * sn, 0, -st.x1 * sn + lz * cs); const l1x = c.X, l1y = c.Y;
            const pos = kit.clamp(0.5 + (nx + 0.1) * 0.9, 0.08, 0.92);
            const sh = x.createLinearGradient(l0x, l0y, l1x, l1y);
            sh.addColorStop(Math.max(0, pos - 0.2), 'rgba(255,250,240,0)');
            sh.addColorStop(pos, 'rgba(255,250,240,' + sheen * 0.8 + ')');
            sh.addColorStop(Math.min(1, pos + 0.2), 'rgba(255,250,240,0)');
            x.fillStyle = sh; x.fill();
          }
          // Machined: a bright chamfer round the face and the grain of the mill along its length. Gone when it is home.
          if (lockP < 1) {
            const fade = 1 - lockP;
            x.strokeStyle = 'rgba(255,252,244,' + 0.55 * fade + ')';
            x.lineWidth = 1.1;
            x.stroke();
            x.beginPath();
            const lzz = lz, a0 = b.x0 + b.r * 0.6, a1 = st.x1 - b.r * 0.6;
            for (let n2 = 0; n2 < 5; n2++) {
              const yy = b.y0 + (b.y1 - b.y0) * (0.14 + n2 * 0.18);
              pj(a0 * cs + lzz * sn, yy, -a0 * sn + lzz * cs); x.moveTo(c.X, c.Y);
              pj(a1 * cs + lzz * sn, yy, -a1 * sn + lzz * cs); x.lineTo(c.X, c.Y);
            }
            x.strokeStyle = 'rgba(0,0,0,' + 0.13 * fade + ')';
            x.lineWidth = 0.8;
            x.stroke();
            // The two trim handles of a clip, cut into the metal.
            x.beginPath();
            for (const hxp of [b.x0 + 5 * u, st.x1 - 5 * u]) {
              pj(hxp * cs + lzz * sn, b.y0 + 3 * u, -hxp * sn + lzz * cs); x.moveTo(c.X, c.Y);
              pj(hxp * cs + lzz * sn, b.y1 - 3 * u, -hxp * sn + lzz * cs); x.lineTo(c.X, c.Y);
            }
            x.strokeStyle = 'rgba(0,0,0,' + 0.6 * fade + ')';
            x.lineWidth = 1.8;
            x.stroke();
          }
        }
      }
      function shadowPath(x, b, st) {
        const cs = Math.cos(st.th), sn = Math.sin(st.th), ZW = zWall(c.t);
        let n = 0;
        for (let i = 0; i < NP; i += 2) {
          const o = outline[i];
          const lx = o.side ? st.x1 + o.cx * b.r + o.ca * b.r : b.x0 + o.cx * b.r + o.ca * b.r;
          const ly = o.cy > 0 ? b.y0 + b.r + o.sa * b.r : b.y1 - b.r + o.sa * b.r;
          for (let w = 0; w < 2; w++) {
            const lz = w ? ZF - THICK : ZF;
            const X = lx * cs + lz * sn, Z = -lx * sn + lz * cs;
            const dz = Z - ZW;
            pj(X + dz * SHX, ly + dz * SHY, ZW);
            shadowArr[n++] = c.X; shadowArr[n++] = c.Y;
          }
        }
        const h = hull(shadowArr, n / 2);
        h.forEach((p, i) => (i ? x.lineTo(shadowArr[p * 2], shadowArr[p * 2 + 1]) : x.moveTo(shadowArr[p * 2], shadowArr[p * 2 + 1])));
        x.closePath();
      }
      const rodTop = (F.head.y - AY) * u, rodBot = (F.head.y + F.head.h - AY) * u, rodW = (F.head.w / 2) * u;
      const triPts = F.head.tri.map((p) => [(p[0] - AX) * u, (p[1] - AY) * u]);
      function drawAxle(x, t) {
        const thF = angleOf(TF, 11, 2.2, 2.5, 7, t);
        const cf = Math.cos(thF), sf = Math.sin(thF);
        // Rod, with a lit side so it reads as round.
        pj(0, rodTop, 0); const ax = c.X, ay = c.Y, as = c.f / c.D;
        pj(0, rodBot, 0); const bx = c.X, by = c.Y, bs = c.f / c.D;
        const dx = bx - ax, dy = by - ay, ln = hypot(dx, dy) || 1, ex = -dy / ln, ey = dx / ln;
        const wa = rodW * as, wb = rodW * bs;
        const flat = kit.map(t, 2.2, 2.42);
                // Plucked by every hit, so it bows in the middle and rings down.
        const pl = pluck(t), mx = (ax + bx) / 2 + ex * pl * 2, my = (ay + by) / 2 + ey * pl * 2;
        x.lineCap = 'round';
        x.strokeStyle = F.teal;
        x.lineWidth = wa + wb;
        x.beginPath(); x.moveTo(ax, ay); x.quadraticCurveTo(mx, my, bx, by); x.stroke();
        if (flat < 1) {
          x.strokeStyle = 'rgba(0,50,44,' + 0.5 * (1 - flat) + ')';
          x.lineWidth = (wa + wb) * 0.45;
          const ow = (wa + wb) * 0.27;
          x.beginPath(); x.moveTo(ax + ex * ow, ay + ey * ow); x.quadraticCurveTo(mx + ex * ow, my + ey * ow, bx + ex * ow, by + ey * ow); x.stroke();
        }
        x.lineCap = 'butt';
        // The triangle: a thin flag on the top of the rod. Darker edge-on.
        const lightF = 0.5 + 0.5 * Math.abs(cf);
        x.fillStyle = rgb([41 * lightF, 217 * lightF, 187 * lightF]);
        x.beginPath();
        triPts.forEach((p, i) => { pj(p[0] * cf, p[1], -p[0] * sf); if (i) x.lineTo(c.X, c.Y); else x.moveTo(c.X, c.Y); });
        x.closePath(); x.fill();
        x.strokeStyle = x.fillStyle; x.lineWidth = 1; x.stroke();
      }

      function frameAt(x, t) {
        setCam(t);
        c.t = t;
        const ZW = zWall(t);
        const j = jolt(t);
        const wx = -M + (c.ox - sx0) * 0.08, wy = -M + (c.oy - sy0) * 0.08 + j[0] * 0.5;
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
        x.drawImage(lit.canvas, wx, wy, wallW, wallH);
        const st = bars.map((b) => barState(b, t));
        // Every bar's shadow in one path, so overlapping shadows are one shadow, as they are in life.
        x.save();
        x.beginPath();
        bars.forEach((b, i) => shadowPath(x, b, st[i]));
        const rt = rodTop, rb = rodBot, rw = rodW * 1.2;
        const dz0 = -ZW;
        pj(rw + dz0 * SHX, rt + dz0 * SHY, ZW); x.moveTo(c.X, c.Y);
        pj(rw + dz0 * SHX, rb + dz0 * SHY, ZW); x.lineTo(c.X, c.Y);
        pj(-rw + dz0 * SHX, rb + dz0 * SHY, ZW); x.lineTo(c.X, c.Y);
        pj(-rw + dz0 * SHX, rt + dz0 * SHY, ZW); x.lineTo(c.X, c.Y);
        x.closePath();
        x.clip();
        x.drawImage(dark.canvas, wx, wy, wallW, wallH);
        x.restore();
        // Near things last. A bar is drawn after the axle only when its middle is nearer the lens than the axle is.
        pj(0, 0, 0);
        const dAxle = c.D;
        const order = bars.map((b, i) => {
          const mid = (b.x0 + st[i].x1) / 2;
          const lz = ZF - THICK / 2;
          pj(mid * Math.cos(st[i].th) + lz * Math.sin(st[i].th), (b.y0 + b.y1) / 2, -mid * Math.sin(st[i].th) + lz * Math.cos(st[i].th));
          return { i, d: c.D };
        }).sort((p, q) => q.d - p.d);
        let axleDone = false;
        for (const o of order) {
          if (!axleDone && o.d < dAxle) { drawAxle(x, t); axleDone = true; }
          drawBar(x, bars[o.i], st[o.i], t);
        }
        if (!axleDone) drawAxle(x, t);
      }

      const tFlat = TF + 0.14;
      return function seek(t) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.globalAlpha = 1;
        const fast = kit.clamp(1 - t / 1.8);
        const n = t > TF + 0.02 ? 1 : t > 2.2 ? 2 : Math.round(3 + fast * 8);
        const open = t > 2.2 ? 0.008 : 0.006 + 0.02 * fast;
        shutter(g, off, dpr, t, open, n, frameAt);
        if (t >= tFlat - 0.02) {
          kit.drawF(g, L.cx, L.cy + jolt(t)[0], L.s, { knock: '#3d2a06' });
        }
        if (t >= TF) kit.wordmark(g, L.left, L.wordY + jolt(t)[0], L.wordPx, '#17120a');
      };
    },
  });
})();
