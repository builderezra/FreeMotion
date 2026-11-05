// FreeMotion intro takes, lane "Old motion machines": a tin zoetrope, a contact sheet, a darkroom tray.
(function () {
  const LANE = 'Old motion machines';
  const TAU = Math.PI * 2;
  const mod = (a, n) => ((a % n) + n) % n;

  // An off-screen canvas at any density, so a blurred texture can be cheaper than a sharp one.
  function off(W, H, d) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * d));
    c.height = Math.max(1, Math.round(H * d));
    const g = c.getContext('2d');
    g.scale(d, d);
    return { canvas: c, g, w: W, h: H, d };
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  // Canvas drawing is deferred, so a big layer is really painted the first time it is used. Do that now, in make(), or
  // the hitch lands in the middle of the take.
  function bake() {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const x = c.getContext('2d');
    for (let i = 0; i < arguments.length; i++) x.drawImage(arguments[i].canvas, 0, 0, 1, 1);
    x.getImageData(0, 0, 1, 1);
  }
  function fitFont(g, font, text, width, start) {
    let px = start;
    g.font = font.replace('$', px);
    const m = g.measureText(text).width;
    px = (start * width) / m;
    g.font = font.replace('$', px);
    return px;
  }

  // ===========================================================================================================
  // ZOETROPE. The drum is simulated: a slit at world angle phi lets you see the far wall at the mirrored angle, and
  // because both walls rotate, each pass of a slit over a screen column shows the strip one frame further along.
  // So the figures really do stand still and hop when the speed is right, and really do fall apart as it slows.
  // ===========================================================================================================
  FMI.add({
    id: 'machines-zoetrope',
    lane: LANE,
    name: 'Zoetrope',
    blurb: 'A tin zoetrope spins with a line of little Fs hopping through the slits, then it runs out of speed and rolls its printed label round to the front.',
    dur: 4.3,
    ground: '#a8c2b2',
    make(stage, kit) {
      const W = kit.w, Hs = kit.h, hash = kit.hash, clamp = kit.clamp;
      const d = Math.min(kit.dpr, 2);
      const g = kit.canvas({ alpha: false });
      const N = 8, DEL = TAU / N, SLIT = 0.082, Te = 1 / 12;
      const avail = Hs - 60 - 112;
      const R = Math.min(W * 0.46, avail / 2.5);
      const KY = 0.33, CY = Math.sqrt(1 - KY * KY), H = 1.55 * R, baseH = 0.36 * R;
      const xc = W / 2;
      const total = 2 * KY * R + H * CY + baseH;
      const top = 60 + Math.max(0, (avail - total) * 0.42);
      const Yb = top + KY * R + H * CY;
      const h1 = 0.5 * H, h2 = 0.968 * H, hs1 = 0.04 * H, hs2 = 0.51 * H;
      const INK = '#17110c', CREAM = '#efe3c4', RED = '#b5291b', GOLD = '#e4b857', WALL = '#a8c2b2';
      const yNear = (hh, c) => Yb + KY * R * c - hh * CY;
      const yFar = (hh, c) => Yb - KY * R * c - hh * CY;
      // The strip is seen on a flatter arc than the far rim: the small cheat that keeps the outer figures in their slits.
      const yStrip = (hh, c) => Yb - KY * R * (0.42 + 0.58 * c) - hh * CY;

      // ---- The spin: flat out, then bearing friction, a creep, and a small rock back. Computed once. ----
      const STEP = 1 / 240, om0 = DEL / Te, dur = 4.3;
      const tFric = 0.85, mu = 1.0, visc = 0.66;
      const table = [0];
      let th = 0, om = om0, stopT = -1;
      for (let i = 1; i <= Math.ceil(dur / STEP) + 2; i++) {
        const tt = i * STEP;
        if (tt > tFric) om = Math.max(0, om - (mu + visc * om) * STEP);
        if (om === 0 && stopT < 0) stopT = tt;
        th += om * STEP;
        table.push(th);
      }
      if (stopT < 0) stopT = dur;
      const rock = 0.05;                                       // radians it rolls back after stopping
      const thStop = table[Math.min(table.length - 1, Math.round(stopT / STEP))];
      const thEnd = thStop - rock;
      function TH(t) {                                         // drum angle at time t, ending exactly on the label
        if (t <= 0) return -thEnd + om0 * t;
        if (t >= stopT) {
          const p = clamp((t - stopT - 0.02) / 0.34);
          return -thEnd + thStop - rock * (p * p * (3 - 2 * p));
        }
        const f = t / STEP, i = Math.floor(f);
        return -thEnd + table[i] + (table[i + 1] - table[i]) * (f - i);
      }

      // ---- The paper strip inside the drum. On screen it is seen at half width, so it is drawn twice as wide. ----
      const stripW = TAU * R, sm = R * 0.5, bandH = (hs2 - hs1) * CY;
      const strip = off(stripW + sm, bandH, d);
      {
        const s = strip.g;
        s.fillStyle = CREAM; s.fillRect(0, 0, stripW + sm, bandH);
        for (let i = 0; i < 900; i++) {
          s.fillStyle = hash(i, 21) < 0.5 ? 'rgba(120,90,50,.09)' : 'rgba(255,255,255,.14)';
          s.fillRect(hash(i, 22) * stripW, hash(i, 23) * bandH, 3 + hash(i, 24) * 22, 0.7);
        }
        const groundY = bandH * 0.9;
        s.fillStyle = INK; s.fillRect(0, groundY, stripW + sm, 1.4);
        const cell = stripW / N, figH = Math.min(bandH * 0.56, (cell / 2) * 0.9 * (107 / 92));
        const fs = figH / 107, hop = bandH * 0.88 - figH * 1.16;
        // y (0 floor, 1 top of hop), squash, top clip lag, middle lag, short clip kick, playhead lean.
        const P = [
          [0, 0.72, 0, 0, 2, 2], [0.26, 1.16, -3, 1, 9, 9], [0.76, 1.08, -6, 2, 14, 14], [1, 0.97, -2, 3, 5, 5],
          [0.82, 1.02, 5, 0, -6, -6], [0.36, 1.14, 8, -2, -12, -12], [0, 1.12, 4, -3, -8, -8], [0, 0.58, 0, 0, 0, 0],
        ];
        const F = kit.F;
        for (let i = 0; i < N; i++) {
          const cx = (i + 0.5) * cell, p = P[i], yy = groundY - p[0] * hop;
          // Shadow on the printed ground line shrinks as it leaves the floor.
          s.fillStyle = 'rgba(23,17,12,.5)';
          s.beginPath(); s.ellipse(cx, groundY + 2.2, cell * 0.3 * (1 - p[0] * 0.55), 2.2, 0, 0, TAU); s.fill();
          s.save();
          s.translate(cx, yy);
          s.scale((2 * fs) / Math.sqrt(p[1]), fs * p[1]);
          s.translate(-60, -110);
          s.fillStyle = INK;
          F.clips.forEach((c, ci) => {
            rr(s, c.x + p[2 + ci] * (ci === 2 ? 1 : 1), c.y, c.w, c.h, c.r);
            s.fill();
          });
          s.fillStyle = '#10a08a';
          const hd = F.head, lean = (p[5] || 0) * 0.012;
          s.save(); s.translate(hd.x + 1.5, 100); s.transform(1, 0, lean, 1, 0, 0); s.translate(-hd.x - 1.5, -100);
          s.fillRect(hd.x - 1.5, hd.y, hd.w + 3, hd.h);
          s.beginPath(); s.moveTo(hd.tri[0][0], hd.tri[0][1]); s.lineTo(hd.tri[1][0], hd.tri[1][1]); s.lineTo(hd.tri[2][0], hd.tri[2][1]); s.fill();
          s.restore();
          s.restore();
          // Pencilled register mark between frames.
          s.fillStyle = 'rgba(23,17,12,.35)';
          s.fillRect(i * cell, 0, 0.8, bandH * 0.08);
        }
        s.drawImage(strip.canvas, 0, 0, sm * d, bandH * d, stripW, 0, sm, bandH);
      }

      // ---- The tin wall, unwrapped: red lacquer, gold lines, a pasted paper band with the label printed on it. ----
      const wallW = TAU * R, wm = R * 0.7, u0 = wallW / 4;
      const base = off(wallW + wm, H, d);
      {
        const s = base.g;
        s.fillStyle = RED; s.fillRect(0, 0, wallW, H);
        for (let i = 0; i < 420; i++) {
          const a = hash(i, 31);
          s.fillStyle = a < 0.5 ? 'rgba(60,8,4,.13)' : 'rgba(255,190,150,.08)';
          s.fillRect(hash(i, 32) * wallW, hash(i, 33) * H * 0.52, 2 + hash(i, 34) * 16, 0.8);
        }
        s.fillStyle = GOLD;
        s.fillRect(0, H * 0.008, wallW, Math.max(1, R * 0.007));
        s.fillRect(0, H * 0.017, wallW, Math.max(1.2, R * 0.01));
        s.fillRect(0, H * 0.507, wallW, Math.max(1.2, R * 0.01));
        s.fillRect(0, H * 0.518, wallW, Math.max(1, R * 0.007));
        // A gold lozenge between each pair of slits, so the speed can be seen on the wall too.
        for (let j = 0; j < N; j++) {
          const ux = u0 + (j + 0.5) * (wallW / N), rad = R * 0.035;
          for (const vy of [H * 0.27]) {
            s.beginPath();
            s.moveTo(ux, vy - rad * 2.2); s.lineTo(ux + rad, vy); s.lineTo(ux, vy + rad * 2.2); s.lineTo(ux - rad, vy); s.closePath();
            s.fill();
          }
        }
        // The pasted paper band.
        const vA = H * 0.532, vB = H * 0.982, bh = vB - vA;
        s.fillStyle = CREAM; s.fillRect(0, vA, wallW, bh);
        for (let i = 0; i < 1300; i++) {
          s.fillStyle = hash(i, 41) < 0.5 ? 'rgba(110,80,40,.07)' : 'rgba(255,255,255,.16)';
          s.fillRect(hash(i, 42) * wallW, vA + hash(i, 43) * bh, 3 + hash(i, 44) * 18, 0.7);
        }
        // Film perforations printed along both edges of the band.
        s.fillStyle = RED;
        const pp = R * 0.092, ps = R * 0.044;
        const nPerf = Math.round(wallW / pp), pw = wallW / nPerf;
        for (let i = 0; i < nPerf; i++) {
          rr(s, i * pw + 1, vA + bh * 0.03, ps, bh * 0.075, 1.2); s.fill();
          rr(s, i * pw + 1, vB - bh * 0.105, ps, bh * 0.075, 1.2); s.fill();
        }
        s.fillRect(0, vA + bh * 0.125, wallW, 1);
        s.fillRect(0, vB - bh * 0.13, wallW, 1);
        // The label, twice round the drum. It stops at the front.
        const innerH = bh * 0.72, fs = (innerH * 0.92) / 107, fw = 92 * fs;
        for (const uc of [u0, u0 + wallW / 2]) {
          const avail2 = R * 1.86, wordW = avail2 - fw - R * 0.06;
          s.fillStyle = INK;
          fitFont(s, '400 $px "Abril Fatface"', 'FreeMotion', wordW, 40);
          const left = uc - avail2 / 2;
          kit.drawF(s, left + fw / 2, vA + bh * 0.5, fs, { fill: INK, knock: CREAM, headFill: '#0f9d87' });
          s.fillStyle = INK; s.textAlign = 'left'; s.textBaseline = 'middle';
          s.fillText('FreeMotion', left + fw + R * 0.06, vA + bh * 0.52);
        }
        // A soldered seam and a few knocks, to mark one place on the drum.
        s.fillStyle = 'rgba(40,10,6,.55)';
        s.fillRect(u0 + wallW * 0.72, H * 0.04, 1.6, H * 0.46);
        s.drawImage(base.canvas, 0, 0, wm * d, H * d, wallW, 0, wm, H);
      }
      // Motion-blurred copies of the wall, blurred along the wall only.
      const blurPx = [0, R * 0.07, R * 0.24, R * 0.72];
      const blurTex = [base];
      for (let l = 1; l < blurPx.length; l++) {
        const L = blurPx[l], b = off(wallW + wm, H, 1);
        const K = Math.max(8, Math.min(26, Math.ceil(L / 3)));
        for (let i = 0; i < K; i++) {
          const o = -L / 2 + (L * i) / (K - 1);
          b.g.globalAlpha = 1 / (i + 1);
          for (const kk of [-1, 0, 1]) b.g.drawImage(base.canvas, 0, 0, wallW * d, H * d, o + kk * wallW, 0, wallW, H);
        }
        b.g.globalAlpha = 1;
        b.g.drawImage(b.canvas, 0, 0, wm, H, wallW, 0, wm, H);
        blurTex.push(b);
      }

      // ---- The room: painted wall, walnut table, a turned stand, hard shadows from one lamp. ----
      const bg = off(W, Hs, d);
      const yFoot = Yb + 0.47 * R, footR = 0.76 * R, tableY = Yb - 0.1 * R;
      {
        const s = bg.g;
        // The wall is in shade, with one hard block of window light across it.
        s.fillStyle = '#7d9a8c'; s.fillRect(0, 0, W, Hs);
        for (let i = 0; i < 500; i++) {
          s.fillStyle = hash(i, 51) < 0.5 ? 'rgba(50,75,65,.03)' : 'rgba(255,255,245,.03)';
          s.fillRect(hash(i, 52) * W, hash(i, 53) * tableY, 1 + hash(i, 54) * 3, 20 + hash(i, 55) * 80);
        }
        s.save();
        s.beginPath(); s.rect(0, 0, W, tableY); s.clip();
        const skew = W * 0.34, wx = -W * 0.14, wTop = top - R * 0.5, wH = tableY - wTop + R * 0.1, wW = W * 1.02;
        const pane = (x0, y0, w0, h0) => {
          s.beginPath();
          s.moveTo(x0 + skew * (1 - (y0 - wTop) / wH), y0);
          s.lineTo(x0 + w0 + skew * (1 - (y0 - wTop) / wH), y0);
          s.lineTo(x0 + w0 + skew * (1 - (y0 + h0 - wTop) / wH), y0 + h0);
          s.lineTo(x0 + skew * (1 - (y0 + h0 - wTop) / wH), y0 + h0);
          s.closePath(); s.fill();
        };
        s.fillStyle = '#b6cdbf';
        const bar = W * 0.018;
        pane(wx, wTop, wW / 2 - bar / 2, wH * 0.46 - bar / 2);
        pane(wx + wW / 2 + bar / 2, wTop, wW / 2 - bar / 2, wH * 0.46 - bar / 2);
        pane(wx, wTop + wH * 0.46 + bar / 2, wW / 2 - bar / 2, wH * 0.54 - bar / 2);
        pane(wx + wW / 2 + bar / 2, wTop + wH * 0.46 + bar / 2, wW / 2 - bar / 2, wH * 0.54 - bar / 2);
        s.restore();
        // Skirting and table edge.
        s.fillStyle = '#7f4d2b'; s.fillRect(0, tableY, W, Hs - tableY);
        const planks = 6;
        for (let i = 0; i < 1500; i++) {
          const yy = tableY + hash(i, 61) * (Hs - tableY);
          s.fillStyle = hash(i, 62) < 0.55 ? 'rgba(45,22,8,.13)' : 'rgba(235,180,120,.07)';
          s.fillRect(hash(i, 63) * W - 20, yy, 20 + hash(i, 64) * 130, 0.8 + hash(i, 65) * 0.8);
        }
        s.fillStyle = 'rgba(28,12,4,.55)';
        for (let i = 1; i < planks; i++) s.fillRect(0, tableY + (Hs - tableY) * Math.pow(i / planks, 1.5), W, 1.2);
        s.fillStyle = '#5b3419'; s.fillRect(0, tableY, W, 2);
        // Hard shadow of the drum on the wall, thrown right by a lamp at upper left.
        s.save();
        s.beginPath(); s.rect(0, 0, W, tableY); s.clip();
        s.fillStyle = 'rgba(30,50,42,.42)';
        const sx = xc + R * 0.5, sy = yNear(H, 1) - R * 0.1;
        s.beginPath();
        s.ellipse(sx, sy, R, KY * R * 0.9, 0, Math.PI, 0);
        s.lineTo(sx + R, tableY); s.lineTo(sx - R, tableY); s.closePath(); s.fill();
        s.restore();
        // Shadow on the table, a hard shape thrown to the right, darkest under the drum.
        s.fillStyle = 'rgba(22,8,2,.6)';
        s.beginPath(); s.ellipse(xc + R * 0.42, yFoot + R * 0.02, R * 1.12, R * 0.34, 0.02, 0, TAU); s.fill();
        // Foot of the stand: a turned disc, hidden by the drum at the back. The stem is behind the wall.
        const wood = s.createLinearGradient(xc - footR, 0, xc + footR, 0);
        wood.addColorStop(0, '#2c1608'); wood.addColorStop(0.22, '#6b4019'); wood.addColorStop(0.36, '#b07a45'); wood.addColorStop(0.44, '#8d5a2e'); wood.addColorStop(0.78, '#3f210e'); wood.addColorStop(1, '#1f0f05');
        const th = R * 0.06, fry = footR * KY;
        s.fillStyle = wood;
        s.beginPath(); s.ellipse(xc, yFoot + th, footR, fry, 0, 0, TAU); s.fill();
        s.fillRect(xc - footR, yFoot, footR * 2, th);
        s.fillStyle = 'rgba(0,0,0,.35)';
        s.beginPath(); s.ellipse(xc, yFoot + th, footR, fry, 0, 0, Math.PI); s.lineTo(xc - footR, yFoot); s.ellipse(xc, yFoot, footR, fry, 0, Math.PI, 0, true); s.closePath(); s.fill();
        s.fillStyle = wood;
        s.beginPath(); s.ellipse(xc, yFoot, footR, fry, 0, 0, TAU); s.fill();
        // A cut groove, and the drum's shadow falling across the disc.
        s.strokeStyle = 'rgba(30,14,4,.7)'; s.lineWidth = 1.4;
        s.beginPath(); s.ellipse(xc, yFoot, footR * 0.86, fry * 0.86, 0, 0, TAU); s.stroke();
        s.strokeStyle = 'rgba(255,220,170,.4)'; s.lineWidth = 1;
        s.beginPath(); s.ellipse(xc, yFoot + 1.4, footR * 0.86, fry * 0.86, 0, 0.5, 2.6); s.stroke();
      }

      // ---- Inside the drum, seen over the near rim. ----
      const inner = off(W, Hs, d);
      {
        const s = inner.g;
        const yy = yNear(H, 0);
        s.fillStyle = '#17100c';
        s.beginPath(); s.ellipse(xc, yy, R, KY * R, 0, 0, TAU); s.fill();
        // The far wall catches the lamp on its right-hand side.
        const gr = s.createLinearGradient(xc - R, 0, xc + R, 0);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(120,50,30,.12)'); gr.addColorStop(0.85, 'rgba(190,70,45,.5)'); gr.addColorStop(1, 'rgba(120,40,25,.2)');
        s.fillStyle = gr;
        s.beginPath(); s.ellipse(xc, yy, R, KY * R, 0, 0, TAU); s.fill();
      }

      // ---- What sits on top of the wall: cylinder shading, rolled rims. ----
      const over = off(W, Hs, d);
      {
        const s = over.g, yTop = yNear(H, 0), yBot = yNear(0, 0);
        s.save();
        s.beginPath();
        s.ellipse(xc, yTop, R, KY * R, 0, Math.PI, 0, true);
        s.lineTo(xc + R, yBot);
        s.ellipse(xc, yBot, R, KY * R, 0, 0, Math.PI, false);
        s.closePath(); s.clip();
        const gr = s.createLinearGradient(xc - R, 0, xc + R, 0);
        gr.addColorStop(0, 'rgba(10,2,0,.62)');
        gr.addColorStop(0.12, 'rgba(10,2,0,.22)');
        gr.addColorStop(0.3, 'rgba(10,2,0,.02)');
        gr.addColorStop(0.62, 'rgba(10,2,0,.08)');
        gr.addColorStop(0.86, 'rgba(10,2,0,.42)');
        gr.addColorStop(1, 'rgba(10,2,0,.72)');
        s.fillStyle = gr; s.fillRect(xc - R, 0, R * 2, Hs);
        // A hard tin highlight: a window reflected in the curve. It stays put while the drum turns.
        s.fillStyle = 'rgba(255,240,225,.2)';
        s.fillRect(xc - R * 0.56, 0, R * 0.09, Hs);
        s.fillStyle = 'rgba(255,240,225,.12)';
        s.fillRect(xc - R * 0.44, 0, R * 0.03, Hs);
        s.restore();
        // Near rim, a rolled tin lip.
        s.lineCap = 'butt';
        s.strokeStyle = '#7d1a10'; s.lineWidth = R * 0.03;
        s.beginPath(); s.ellipse(xc, yTop, R, KY * R, 0, 0, TAU); s.stroke();
        s.strokeStyle = '#d63a29'; s.lineWidth = R * 0.016;
        s.beginPath(); s.ellipse(xc, yTop - R * 0.004, R, KY * R, 0, 0, Math.PI); s.stroke();
        s.strokeStyle = 'rgba(255,225,205,.75)'; s.lineWidth = 1;
        s.beginPath(); s.ellipse(xc, yTop - R * 0.006, R, KY * R, 0, 1.75, 2.75); s.stroke();
        // Bottom edge.
        s.strokeStyle = '#4d0f09'; s.lineWidth = R * 0.022;
        s.beginPath(); s.ellipse(xc, yBot, R, KY * R, 0, 0, Math.PI); s.stroke();
      }

      // Screen columns, precomputed.
      function cols(dx) {
        const out = [];
        const n = Math.floor(R / dx), dp = kit.dpr;
        for (let i = -n; i < n; i++) {
          const x = (i + 0.5) * dx, s = x / R, c = Math.sqrt(1 - s * s);
          if (c < 0.09) continue;
          // Snap to real pixels so neighbouring columns meet with no seam at any screen density.
          const x0 = Math.round((xc + i * dx) * dp) / dp, x1 = Math.round((xc + (i + 1) * dx) * dp) / dp;
          out.push({ X: x0, phi: Math.asin(s), c, dx: x1 - x0 });
        }
        return out;
      }
      const C2 = cols(2), C1 = cols(1);
      const GAIN = 7;
      const grainT = kit.grainTile(256, 0.13, 25);
      const vign = off(W, Hs, 1);
      {
        const f = vign.g.createRadialGradient(xc, Yb - H * 0.3, W * 0.55, xc, Yb - H * 0.3, Math.max(W * 1.05, Hs * 0.68));
        f.addColorStop(0, 'rgba(20,12,6,0)'); f.addColorStop(1, 'rgba(20,12,6,.5)');
        vign.g.fillStyle = f; vign.g.fillRect(0, 0, W, Hs);
      }
      bake(bg, inner, over, strip, vign, blurTex[0], blurTex[1], blurTex[2], blurTex[3]);

      return function seek(t) {
        const T = Math.min(t, dur);
        const b = TH(T), a = TH(T - Te), lo = Math.min(a, b), hi = Math.max(a, b), span = hi - lo;
        const wob = Math.sin(b) * 1.1 * Math.min(1, span / (om0 * Te));
        g.globalAlpha = 1;
        g.drawImage(bg.canvas, 0, 0, W, Hs);
        g.save();
        g.translate(0, wob);
        g.drawImage(inner.canvas, 0, 0, W, Hs);

        // Far slits, seen over the near rim: the room shows through them. They run the other way.
        const hL = SLIT / 2;
        const colsNow = span * R < 40 ? C1 : C2;
        g.fillStyle = WALL;
        for (let i = 0; i < colsNow.length; i++) {
          const col = colsNow[i], psi = Math.PI - col.phi;
          const j0 = Math.ceil((psi - hi - hL) / DEL), j1 = Math.floor((psi - lo + hL) / DEL);
          for (let j = j0; j <= j1; j++) {
            const tc = psi - j * DEL;
            const ov = Math.min(hi, tc + hL) - Math.max(lo, tc - hL);
            let fr;
            if (span < 1e-4) fr = Math.abs(b - tc) < hL ? 1 : 0; else fr = ov > 0 ? ov / span : 0;
            if (fr <= 0) continue;
            const A = Math.min(0.95, fr * 2.4);
            const y0 = yFar(H, col.c), y1 = Math.min(yNear(H, col.c), yFar(h1, col.c));
            if (y1 <= y0) continue;
            g.globalAlpha = A;
            g.fillRect(col.X, y0, col.dx, y1 - y0);
          }
        }
        g.globalAlpha = 1;

        // The near wall, with however much motion blur this speed gives.
        const blur = span * R;
        let lv = 0;
        while (lv < blurPx.length - 2 && blur >= blurPx[lv + 1]) lv++;
        const pBlur = clamp((blur - blurPx[lv]) / (blurPx[lv + 1] - blurPx[lv]));
        const tA = blurTex[lv], tB = blurTex[lv + 1], dA = tA.d, dB = tB.d;
        const yT0 = H * CY;
        for (let i = 0; i < C2.length; i++) {
          const col = C2[i];
          const u = mod((col.phi - b) / TAU * wallW + u0, wallW), du = col.dx / col.c;
          const yy = yNear(H, col.c);
          if (pBlur < 0.995) g.drawImage(tA.canvas, u * dA, 0, du * dA, H * dA, col.X, yy, col.dx, yT0);
          if (pBlur > 0.005) {
            g.globalAlpha = pBlur;
            g.drawImage(tB.canvas, u * dB, 0, du * dB, H * dB, col.X, yy, col.dx, yT0);
            g.globalAlpha = 1;
          }
        }

        // The near slits: each column gets the strip as seen through every slit that crossed it during the exposure.
        const sh = strip.canvas.height / d;
        for (let i = 0; i < colsNow.length; i++) {
          const col = colsNow[i], phi = col.phi;
          const j0 = Math.ceil((phi - hi - hL) / DEL), j1 = Math.floor((phi - lo + hL) / DEL);
          for (let j = j0; j <= j1; j++) {
            const tc = phi - j * DEL;
            const ov = Math.min(hi, tc + hL) - Math.max(lo, tc - hL);
            let fr;
            if (span < 1e-4) fr = Math.abs(b - tc) < hL ? 1 : 0; else fr = ov > 0 ? ov / span : 0;
            if (fr <= 0) continue;
            const A = Math.min(1, fr * GAIN);
            const yT = yNear(h2, col.c), yB = yNear(h1, col.c);
            const ysT = yStrip(hs2, col.c), ysB = yStrip(hs1, col.c);
            g.globalAlpha = A;
            g.fillStyle = '#17100c';
            g.fillRect(col.X, yT, col.dx, yB - yT);
            const y0 = Math.max(yT, ysT), y1 = Math.min(yB, ysB);
            if (y1 > y0) {
              const u = mod((2 * phi - Math.PI - j * DEL) / TAU, 1) * stripW, du = (2 * col.dx) / col.c;
              const sy = ((y0 - ysT) / (ysB - ysT)) * sh, shh = ((y1 - y0) / (ysB - ysT)) * sh;
              g.drawImage(strip.canvas, u * d, sy * d, du * d, shh * d, col.X, y0, col.dx, y1 - y0);
            }
          }
        }
        g.globalAlpha = 1;

        // As it comes to rest the cut edges of the slits become visible.
        const edge = clamp(1 - span * R / 26);
        if (edge > 0.02) {
          g.globalAlpha = edge;
          for (let j = 0; j < N; j++) {
            const ph = mod(b + j * DEL + Math.PI, TAU) - Math.PI;
            if (Math.abs(ph) > 1.42) continue;
            const c = Math.cos(ph);
            const xL = xc + R * Math.sin(ph - hL), xR = xc + R * Math.sin(ph + hL);
            const yT = yNear(h2, c), yB = yNear(h1, c);
            g.fillStyle = '#3f0c07';
            g.fillRect(xL - 1, yT - 1, 1.2, yB - yT + 2);
            g.fillStyle = 'rgba(255,170,140,.55)';
            g.fillRect(xR, yT - 1, 1, yB - yT + 2);
            g.fillStyle = '#3f0c07';
            g.fillRect(xL, yT - 1, xR - xL, 1);
            g.fillStyle = 'rgba(255,170,140,.55)';
            g.fillRect(xL, yB, xR - xL, 1);
          }
          g.globalAlpha = 1;
        }
        g.drawImage(over.canvas, 0, 0, W, Hs);
        g.restore();
        // Shot on film: the corners fall off and the grain moves at the camera's speed.
        g.drawImage(vign.canvas, 0, 0, W, Hs);
        kit.grain(g, grainT, kit.frame(T, 18), 0.8);
      };
    },
  });

  // ===========================================================================================================
  // CONTACT SHEET. A photo shoot of the logo that went badly. The loupe finds the disasters, then the good one.
  // ===========================================================================================================
  FMI.add({
    id: 'machines-contact',
    lane: LANE,
    name: 'Contact sheet',
    blurb: 'A loupe slides over a contact sheet from a photo shoot of the logo, past the bad frames, then a red grease pencil circles the good one and the camera slams into it.',
    dur: 3.55,
    ground: '#26211c',
    make(stage, kit) {
      const W = kit.w, Hs = kit.h, hash = kit.hash, k = kit.k, clamp = kit.clamp, lerp = kit.lerp;
      const d = 2;
      const g = kit.canvas({ alpha: false });
      const stripW = W * 0.243, gap = W * 0.008, mx = W * 0.03, my = W * 0.05, ox = W * 0.02, oy = W * 0.018;
      const reb = stripW * 0.15, fw = stripW * 0.7, fh = fw * 1.5, fgp = fw * 0.055, pitch = fh + fgp;
      const rows = Math.ceil((Hs + my * 3) / pitch) + 1, colsN = 4;
      const sheetW = mx * 2 + colsN * stripW + (colsN - 1) * gap, sheetH = my * 2 + rows * pitch;
      const stripOff = [0, 1, 2, 3].map((i) => hash(i, 71) * pitch * 0.32);
      const frameXY = (c, r) => ({ x: mx + c * (stripW + gap) + reb, y: my + r * pitch + stripOff[c] + fgp / 2 });
      const heroC = 2;
      const heroR = Math.round((Hs * 0.46 + oy - my - stripOff[heroC] - fh / 2) / pitch);
      const heroXY = frameXY(heroC, heroR);
      const H0 = { x: heroXY.x + fw / 2, y: heroXY.y + fh / 2 };
      const ROT = -0.024;
      const SF = Math.min((W * 0.72) / fw, (Hs - 60 - 118) / (fh * 1.1));
      const finalPos = { x: W / 2, y: 60 + (Hs - 60 - 112) * 0.47 };
      const startPos = { x: H0.x - ox, y: H0.y - oy };

      // Who is in which frame.
      const gagAt = {};
      // The joke frames sit in the two middle strips, where the loupe fits on a phone.
      const thumbF = [1, heroR + 2], eF = [1, Math.max(0, heroR - 1)], apartF = [2, heroR + 2];
      gagAt[thumbF[0] + ',' + thumbF[1]] = 'thumb';
      gagAt[eF[0] + ',' + eF[1]] = 'E';
      gagAt[apartF[0] + ',' + apartF[1]] = 'apart';
      gagAt[heroC + ',' + heroR] = 'hero';
      gagAt[heroC + ',' + (heroR - 1)] = 'fell';
      gagAt[heroC + ',' + (heroR + 1)] = 'dark';
      const pool = ['std', 'tilt', 'low', 'close', 'dark', 'crop', 'fell', 'blown', 'far', 'blur', 'empty', 'tilt', 'std', 'high', 'close', 'far'];
      const typeOf = (c, r) => gagAt[c + ',' + r] || pool[Math.floor(hash(c * 31 + r * 7, 73) * pool.length)];

      function logo(s, cx, cy, sc, rot, o) {
        o = o || {};
        s.save();
        s.translate(cx, cy);
        if (rot) s.rotate(rot);
        // Hard cast shadow on the paper sweep, then the block's side, then its face.
        if (o.noShadow !== true) {
          s.save();
          s.translate(sc * 9, sc * 10);
          kit.drawF(s, 0, 0, sc, { fill: 'rgba(0,0,0,.5)', head: false });
          s.restore();
        }
        s.save(); s.translate(sc * 1.6, sc * 1.8); kit.drawF(s, 0, 0, sc, { fill: '#1b1b1b', headFill: '#1b1b1b' }); s.restore();
        kit.drawF(s, 0, 0, sc, { fill: o.fill || 'grade', headFill: o.head || '#f8f8f8', knock: o.knock || '#222' });
        s.restore();
      }
      function sweep(s, x, y, fW, fH, seed) {
        const gr = s.createLinearGradient(0, y, 0, y + fH);
        gr.addColorStop(0, '#3e3e3e'); gr.addColorStop(0.58, '#6d6d6d'); gr.addColorStop(0.74, '#8f8f8f'); gr.addColorStop(1, '#a6a6a6');
        s.fillStyle = gr; s.fillRect(x, y, fW, fH);
        const pool2 = s.createRadialGradient(x + fW * 0.36, y + fH * 0.32, fW * 0.05, x + fW * 0.4, y + fH * 0.4, fW * 0.95);
        pool2.addColorStop(0, 'rgba(255,255,255,.34)'); pool2.addColorStop(0.5, 'rgba(255,255,255,.06)'); pool2.addColorStop(1, 'rgba(0,0,0,.42)');
        s.fillStyle = pool2; s.fillRect(x, y, fW, fH);
      }
      function photo(s, c, r, x, y, type) {
        const seed = c * 13 + r * 29;
        s.save();
        s.beginPath(); s.rect(x, y, fw, fh); s.clip();
        sweep(s, x, y, fw, fh, seed);
        const base = (fw * 0.6) / 92, h1 = hash(seed, 74), h2 = hash(seed, 75);
        const cx = x + fw * (0.5 + (h1 - 0.5) * 0.08), cy = y + fh * (0.41 + (h2 - 0.5) * 0.04);
        const word = (px, wx, wy, rot, col) => {
          s.save(); s.translate(wx, wy); if (rot) s.rotate(rot);
          s.font = '700 ' + px + 'px ' + kit.SYS; s.textAlign = 'center'; s.textBaseline = 'alphabetic';
          s.fillStyle = col || '#111'; s.fillText('FreeMotion', 0, 0); s.restore();
        };
        const wpx = (fw * 0.78) / 5.45;
        switch (type) {
          case 'hero': {
            logo(s, x + fw * 0.47, y + fh * 0.385, (fw * 0.72) / 92, 0);
            word(wpx * 1.02, x + fw / 2, y + fh * 0.84, 0, '#0e0e0e');
            break;
          }
          case 'std': logo(s, cx, cy, base * (0.86 + h1 * 0.26), (h2 - 0.5) * 0.09); word(wpx, x + fw / 2, y + fh * 0.84, (h1 - 0.5) * 0.05); break;
          case 'tilt': logo(s, cx, cy + fh * 0.03, base, (h1 < 0.5 ? -1 : 1) * (0.28 + h2 * 0.26)); word(wpx, x + fw / 2, y + fh * 0.86, (h2 - 0.5) * 0.12); break;
          case 'close': logo(s, x + fw * (0.42 + h1 * 0.2), y + fh * (0.42 + h2 * 0.2), base * 2.3, (h1 - 0.5) * 0.3); break;
          case 'far': logo(s, x + fw * (0.3 + h1 * 0.4), y + fh * 0.6, base * 0.42, 0); word(wpx * 0.5, x + fw * (0.3 + h1 * 0.4), y + fh * 0.72, 0, '#222'); break;
          case 'low': logo(s, cx, y + fh * 0.84, base * 1.2, 0.05); break;
          case 'high': logo(s, cx, y + fh * 0.06, base * 1.25, -0.04); word(wpx, x + fw / 2, y + fh * 0.84, 0); break;
          case 'crop': logo(s, x + fw * (h1 < 0.5 ? -0.02 : 1.02), cy, base * 1.35, 0); word(wpx, x + fw * (h1 < 0.5 ? 0.2 : 0.8), y + fh * 0.85, 0); break;
          case 'dark': logo(s, cx, cy, base, 0.02); word(wpx, x + fw / 2, y + fh * 0.84, 0); s.fillStyle = 'rgba(0,0,0,.8)'; s.fillRect(x, y, fw, fh); break;
          case 'blown': logo(s, cx, cy, base, -0.03); word(wpx, x + fw / 2, y + fh * 0.84, 0); s.fillStyle = 'rgba(250,250,250,.78)'; s.fillRect(x, y, fw, fh); break;
          case 'fell': logo(s, cx, y + fh * 0.7, base * 0.9, 1.57 * (h1 < 0.5 ? 1 : -1)); break;
          case 'blur':
            s.globalAlpha = 0.55; logo(s, cx - fw * 0.05, cy, base, 0.02, { noShadow: true }); s.globalAlpha = 0.55; logo(s, cx + fw * 0.05, cy + fh * 0.015, base, 0.06, { noShadow: true }); s.globalAlpha = 1;
            break;
          case 'empty': break;
          case 'E': {
            // The wrong letter turned up to the shoot.
            const sc = base * 1.02, xx = cx - 46 * sc, yy = cy - 50 * sc, by = [0, 40, 80];
            by.forEach((b) => { s.fillStyle = 'rgba(0,0,0,.5)'; rr(s, xx + sc * 8, yy + b * sc + sc * 9, 92 * sc, 22 * sc, 5 * sc); s.fill(); });
            by.forEach((b) => { s.fillStyle = '#e4e4e4'; rr(s, xx, yy + b * sc, 92 * sc, 22 * sc, 5 * sc); s.fill(); });
            s.fillStyle = '#d4d4d4'; rr(s, xx, yy, 22 * sc, 102 * sc, 5 * sc); s.fill();
            word(wpx, x + fw / 2, y + fh * 0.84, -0.03);
            break;
          }
          case 'apart': {
            // It fell apart between shots: the clips in a heap on the floor, the playhead still standing, lost.
            const F = kit.F, sc = base * 1.15, fy = y + fh * 0.7;
            const ps = [[0.12, 0.1, 0.12], [0.3, 0.02, -0.34], [0.62, 0.11, 0.3]];
            F.clips.forEach((cl, i) => {
              s.save(); s.translate(x + fw * ps[i][0], fy + fh * ps[i][1]); s.rotate(ps[i][2]);
              s.fillStyle = 'rgba(0,0,0,.5)'; rr(s, 0 + sc * 4, sc * 5, cl.w * sc * 0.9, 20 * sc, 5 * sc); s.fill();
              s.fillStyle = '#e2e2e2'; rr(s, 0, 0, cl.w * sc * 0.9, 20 * sc, 5 * sc); s.fill();
              s.restore();
            });
            const px = x + fw * 0.66, py = y + fh * 0.2;
            s.fillStyle = 'rgba(0,0,0,.45)'; s.fillRect(px + sc * 7, py + sc * 9, 3 * sc, 90 * sc);
            s.fillStyle = '#f8f8f8'; s.fillRect(px, py, 3.2 * sc, 90 * sc);
            s.beginPath(); s.moveTo(px - sc * 3, py - sc * 11); s.lineTo(px + sc * 9, py - sc * 5.5); s.lineTo(px - sc * 3, py); s.closePath(); s.fill();
            break;
          }
          case 'thumb': {
            logo(s, cx, cy, base, 0.03);
            word(wpx, x + fw / 2, y + fh * 0.84, 0);
            // Somebody's thumb across the lens.
            const tx = x + fw * 0.82, ty = y + fh * 0.84;
            s.save(); s.translate(tx, ty); s.rotate(-0.62);
            const gr = s.createLinearGradient(-fw * 0.5, 0, fw * 0.5, 0);
            gr.addColorStop(0, '#050505'); gr.addColorStop(0.55, '#1c1c1c'); gr.addColorStop(1, '#2a2a2a');
            s.fillStyle = gr;
            s.beginPath(); s.ellipse(0, 0, fw * 0.5, fh * 0.48, 0, 0, TAU); s.fill();
            s.restore();
            break;
          }
          default: break;
        }
        // Exposure wanders from frame to frame while the photographer brackets. The good frame is exposed right.
        if (type !== 'hero' && type !== 'dark' && type !== 'blown') {
          const key = hash(seed, 78);
          if (key < 0.3) { s.fillStyle = 'rgba(0,0,0,' + (0.2 + key) + ')'; s.fillRect(x, y, fw, fh); }
          else if (key > 0.78) { s.fillStyle = 'rgba(255,255,255,' + (key - 0.62) + ')'; s.fillRect(x, y, fw, fh); }
        }
        // Dust: every print has it.
        s.fillStyle = 'rgba(255,255,255,.75)';
        for (let i = 0; i < 5; i++) s.fillRect(x + hash(seed + i, 76) * fw, y + hash(seed + i, 77) * fh, fw * 0.012, fw * 0.012);
        s.restore();
      }
      // The sheet, in sheet coordinates. Draws any rectangle of it, at any scale.
      function paintSheet(s, rx0, ry0, rx1, ry1) {
        s.fillStyle = '#efece3'; s.fillRect(0, 0, sheetW, sheetH);
        for (let c = 0; c < colsN; c++) {
          const sx = mx + c * (stripW + gap);
          s.fillStyle = '#20201e'; s.fillRect(sx, my * 0.45, stripW, sheetH - my * 0.45);
          if (sx > rx1 || sx + stripW < rx0) continue;
          for (let r = -1; r < rows; r++) {
            const p = frameXY(c, r);
            if (p.y > ry1 || p.y + pitch < ry0) continue;
            // Perforations, eight to a frame, on both edges.
            const hw = reb * 0.44, hh = (pitch / 8) * 0.56;
            for (let q = 0; q < 8; q++) {
              const hy = p.y - fgp / 2 + (q + 0.22) * (pitch / 8);
              for (const hx of [sx + reb * 0.08, sx + stripW - reb * 0.08 - hw]) {
                s.fillStyle = '#040404'; rr(s, hx, hy, hw, hh, hh * 0.22); s.fill();
                s.fillStyle = 'rgba(255,255,255,.13)'; s.fillRect(hx + hh * 0.2, hy + hh, hw - hh * 0.4, Math.max(0.3, hh * 0.07));
              }
            }
            if (r >= 0) photo(s, c, r, p.x, p.y, typeOf(c, r));
            // Edge print down the film, pale on black the way a negative prints it: frame number one side, stock the other.
            const n = 3 + c * 7 + r;
            s.font = '700 ' + reb * 0.34 + 'px "Courier Prime", monospace';
            s.textBaseline = 'middle';
            s.fillStyle = 'rgba(232,226,196,.82)';
            s.save();
            s.translate(sx + stripW - reb * 0.27, p.y + fh * 0.5);
            s.rotate(Math.PI / 2);
            s.textAlign = 'center';
            s.fillText(String(n) + '     ' + n + 'A', 0, 0);
            s.restore();
            s.save();
            s.translate(sx + reb * 0.75, p.y + fh * 0.5);
            s.rotate(-Math.PI / 2);
            s.textAlign = 'center';
            s.fillText(r % 2 ? 'FreeMotion PAN 400' : 'SAFETY FILM', 0, 0);
            s.restore();
          }
        }
      }

      // Grease pencil: wax drags over paper in broken strands, so a stroke is many short pieces with gaps.
      function waxBuild(pts, lw, strands, seed, dense) {
        const buckets = [[], [], []];
        const n = pts.length;
        for (let st = 0; st < strands; st++) {
          const of = (st + 0.5) / strands - 0.5, edge = Math.abs(of) * 2;
          for (let i = 0; i < n - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const h = hash(i * 13 + st * 101, seed);
            const gapP = (dense ? 0.1 : 0.03) + (dense ? 0.52 : 0.32) * edge * edge;
            if (h < gapP) continue;
            const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len, ny = dx / len;
            const press = 0.78 + 0.34 * Math.sin(i * 0.23 + seed);
            const o = of * lw * press + (hash(i + st * 7, seed + 1) - 0.5) * lw * 0.05;
            buckets[Math.floor(hash(i * 3 + st, seed + 2) * 3)].push([i, a[0] + nx * o, a[1] + ny * o, b[0] + nx * o, b[1] + ny * o]);
          }
        }
        buckets.forEach((b) => b.sort((p, q) => p[0] - q[0]));
        return { buckets, n, lw: (lw / strands) * 1.32 };
      }
      const WAXA = [0.72, 0.86, 1];
      function waxDraw(s, wx, upto) {
        s.save();
        s.strokeStyle = '#d3211a'; s.lineCap = 'round';
        s.lineWidth = wx.lw;
        const lim = upto * (wx.n - 1);
        wx.buckets.forEach((b, bi) => {
          s.globalAlpha = WAXA[bi];
          s.beginPath();
          for (let i = 0; i < b.length; i++) {
            const q = b[i];
            if (q[0] >= lim) break;
            s.moveTo(q[1], q[2]); s.lineTo(q[3], q[4]);
          }
          s.stroke();
        });
        s.restore();
      }
      // The scrawl around the good frame: starts top right, goes round anticlockwise a bit more than once, lopsided, so
      // the overlap lands above the picture and the end flicks away.
      function scrawl(sub) {
        const pts = [], rx = fw * 0.605, ry = fh * 0.58, cx = H0.x + fw * 0.006, cy = H0.y - fh * 0.004;
        const total = 132 * sub;
        for (let i = 0; i <= total; i++) {
          const p = i / total, a = -1.2 - p * TAU * 1.2;
          const grow = 1 - 0.05 * p + 0.03 * Math.sin(a * 2.3 + 0.6) + 0.014 * Math.sin(a * 6.1 + 1) + (p < 0.06 ? (0.06 - p) * 0.9 : 0);
          pts.push([cx + Math.cos(a) * rx * grow, cy + Math.sin(a) * ry * grow * (1 + 0.03 * Math.sin(a))]);
        }
        const last = pts[pts.length - 1], prev = pts[pts.length - 2 * sub - 1];
        const dx = last[0] - prev[0], dy = last[1] - prev[1], dl = Math.hypot(dx, dy) || 1;
        for (let i = 1; i <= 12 * sub; i++) {
          const q = i / (12 * sub);
          pts.push([last[0] + (dx / dl) * q * fw * 0.2 - q * q * fw * 0.06, last[1] + (dy / dl) * q * fw * 0.2 - q * q * fw * 0.1]);
        }
        return pts;
      }
      // The tick sits outside the ring, low on the right, over the frame below.
      function tick(sub) {
        const pts = [];
        const a = [H0.x + fw * 0.36, H0.y + fh * 0.525], b = [H0.x + fw * 0.44, H0.y + fh * 0.6], c = [H0.x + fw * 0.645, H0.y + fh * 0.4];
        for (let i = 0; i <= 12 * sub; i++) { const q = i / (12 * sub); pts.push([lerp(a[0], b[0], q), lerp(a[1], b[1], q)]); }
        for (let i = 1; i <= 26 * sub; i++) { const q = i / (26 * sub); pts.push([lerp(b[0], c[0], q) + Math.sin(q * 3.1) * fw * 0.02, lerp(b[1], c[1], q)]); }
        return pts;
      }
      function slash(c, r, kind) {
        const p = frameXY(c, r), out = [];
        const line = (x0, y0, x1, y1, seed) => {
          const pts = [];
          for (let i = 0; i <= 26; i++) { const q = i / 26; pts.push([lerp(x0, x1, q) + Math.sin(q * 5 + seed) * fw * 0.035, lerp(y0, y1, q) + Math.sin(q * 3 + seed) * fw * 0.04]); }
          return pts;
        };
        out.push(line(p.x - fw * 0.02, p.y + fh * 0.1, p.x + fw * 1.02, p.y + fh * 0.92, c + r));
        if (kind === 'x') out.push(line(p.x + fw * 1.0, p.y + fh * 0.06, p.x + fw * 0.02, p.y + fh * 0.94, c * 2 + r));
        return out;
      }
      const lwS = fw * 0.056;
      const LW = lwS;
      const strokeC = waxBuild(scrawl(1), LW, 4, 5, false);
      const strokeT = waxBuild(tick(1), LW, 4, 9, false);
      const old = [];
      function addSlash(c, r, kind) { slash(c, r, kind).forEach((l, i) => old.push(l)); }
      // A few frames were already struck out on an earlier pass. Not many, so the circle stays the event.
      let struck = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < colsN; c++) {
        const ty = typeOf(c, r);
        if (struck < 5 && (ty === 'blown' || ty === 'empty' || ty === 'blur' || ty === 'far') && !(c === heroC && Math.abs(r - heroR) < 2) && hash(c * 5 + r, 79) < 0.7) { addSlash(c, r, hash(c + r * 3, 80) < 0.5 ? 'x' : '/'); struck++; }
      }
      const oldMarks = old.map((l, i) => waxBuild(l, LW * 0.8, 3, 20 + i, false));

      const sheet = off(sheetW, sheetH, d);
      paintSheet(sheet.g, 0, 0, sheetW, sheetH);
      oldMarks.forEach((m) => waxDraw(sheet.g, m, 1));

      // The same part of the sheet at the zoomed size, drawn fresh so it is sharp, with the grease pencil in big wax strands.
      const rW = (W / SF) * 1.16, rH = (Hs / SF) * 1.16;
      const rX = H0.x - rW * 0.5, rY = H0.y - rH * 0.47;
      const fin = off(rW * SF, rH * SF, Math.min(kit.dpr, 2));
      fin.g.scale(SF, SF);
      fin.g.translate(-rX, -rY);
      paintSheet(fin.g, rX, rY, rX + rW, rY + rH);
      oldMarks.forEach((m) => waxDraw(fin.g, m, 1));
      {
        const s = fin.g;
        // Silver grain, seen at this size. Over the photographs only.
        const tile = kit.grainTile(200, 0.2, 83);
        const hx = heroXY.x, hy = heroXY.y;
        s.save();
        s.beginPath(); s.rect(hx, hy - pitch, fw, fh * 3 + fgp * 2); s.clip();
        s.translate(hx, hy - pitch); s.scale(1 / SF, 1 / SF);
        for (let yy = 0; yy < (fh * 3 + fgp * 2) * SF; yy += 200) for (let xx = 0; xx < fw * SF; xx += 200) s.drawImage(tile, xx, yy);
        s.restore();
        waxDraw(s, waxBuild(scrawl(3), LW * 1.06, 11, 5, true), 1);
        waxDraw(s, waxBuild(tick(3), LW * 1.06, 11, 9, true), 1);
      }

      const table = off(W, Hs, 1);
      {
        const s = table.g;
        s.fillStyle = '#26211c'; s.fillRect(0, 0, W, Hs);
        for (let i = 0; i < 300; i++) {
          s.fillStyle = hash(i, 91) < 0.5 ? 'rgba(0,0,0,.2)' : 'rgba(255,220,180,.05)';
          s.fillRect(hash(i, 92) * W, hash(i, 93) * Hs, 20 + hash(i, 94) * 100, 1);
        }
      }

      // ---- The china marker. Tip at the origin, body along +x. ----
      const penL = W * 1.5, penT = W * 0.05;
      const pen = off(penL + 8, penT * 2, Math.min(kit.dpr, 2));
      const penSh = off(penL + 8, penT * 2, 1);
      function paintPen(s, solid) {
        const my2 = penT;
        s.save();
        s.translate(2, my2);
        if (solid) s.fillStyle = '#000';
        // Wax point.
        if (!solid) s.fillStyle = '#c91e16';
        s.beginPath(); s.moveTo(0, 0); s.lineTo(penT * 1.25, -penT * 0.42); s.lineTo(penT * 1.25, penT * 0.42); s.closePath(); s.fill();
        // Paper wrap with the pull-string seam.
        if (!solid) {
          const gr = s.createLinearGradient(0, -penT / 2, 0, penT / 2);
          gr.addColorStop(0, '#f05045'); gr.addColorStop(0.28, '#d5271e'); gr.addColorStop(0.75, '#a31710'); gr.addColorStop(1, '#6e0d08');
          s.fillStyle = gr;
        }
        s.fillRect(penT * 1.2, -penT * 0.5, penL - penT * 1.2, penT);
        if (!solid) {
          s.strokeStyle = 'rgba(70,6,3,.55)'; s.lineWidth = 1;
          for (let i = 0; i < 12; i++) {
            const x0 = penT * 2.1 + i * penT * 2.6;
            s.beginPath(); s.moveTo(x0, -penT * 0.5); s.lineTo(x0 + penT * 0.7, penT * 0.5); s.stroke();
          }
          // The torn paper edge above the point.
          s.fillStyle = '#efe3c9';
          s.beginPath();
          s.moveTo(penT * 1.25, -penT * 0.46);
          for (let i = 0; i <= 8; i++) s.lineTo(penT * 1.25 + (hash(i, 95) * penT * 0.2), -penT * 0.5 + (i / 8) * penT);
          s.lineTo(penT * 1.12, penT * 0.46); s.closePath(); s.fill();
        }
        s.restore();
      }
      paintPen(pen.g, false);
      paintPen(penSh.g, true);

      // ---- Timings ----
      const framePos = (c, r) => { const p = frameXY(c, r); return { x: p.x + fw / 2, y: p.y + fh / 2 }; };
      const pThumb = framePos(thumbF[0], thumbF[1]), pE = framePos(eF[0], eF[1]), pApart = framePos(apartF[0], apartF[1]);
      const lensR = W * 0.235, ringW = W * 0.05, mag = 1.5;
      const tYank = 2.22, tP0 = 2.16, tC0 = 2.3, tC1 = 2.74, tK0 = 2.78, tK1 = 2.92, tZ = 3.04;
      const loupeX = [[0, -lensR * 2.4], [0.3, pThumb.x, 'out3'], [0.6, pThumb.x + fw * 0.02], [0.82, pApart.x, 'io3'], [1.1, pApart.x], [1.32, pE.x, 'io3'], [1.58, pE.x], [1.84, H0.x + fw * 0.09, 'io3'], [1.94, H0.x, 'io2'], [tYank, H0.x], [tYank + 0.15, W * 1.7, 'in3']];
      const loupeY = [[0, Hs * 1.0], [0.3, pThumb.y, 'out3'], [0.6, pThumb.y - fh * 0.03], [0.82, pApart.y, 'io3'], [1.1, pApart.y], [1.32, pE.y, 'io3'], [1.58, pE.y], [1.84, H0.y - fh * 0.05, 'io3'], [1.94, H0.y, 'io2'], [tYank, H0.y], [tYank + 0.15, H0.y - Hs * 0.5, 'in3']];
      const circlePts = scrawl(1), tickPts = tick(1);
      const at = (pts, p) => { const f = clamp(p) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)); return [lerp(pts[i][0], pts[i + 1][0], f - i), lerp(pts[i][1], pts[i + 1][1], f - i)]; };
      const circleP = (t) => { const p = clamp((t - tC0) / (tC1 - tC0)); return p < 0.5 ? 2 * p * p * 0.5 + p * 0.5 : p * 0.92 + 0.08 * (1 - Math.pow(1 - p, 3)); };
      const tickP = (t) => { const p = clamp((t - tK0) / (tK1 - tK0)); return p * p * (1.6 - 0.6 * p); };

      function transformAt(t) {
        const Z = k(t, [[tZ, 1], [tZ + 0.17, SF * 1.05, 'in3'], [tZ + 0.27, SF * 0.992, 'out2'], [tZ + 0.36, SF, 'io2']]);
        const mix = clamp((Z - 1) / (SF - 1));
        return { Z, mix, x: lerp(startPos.x, finalPos.x, mix), y: lerp(startPos.y, finalPos.y, mix), rot: lerp(ROT, ROT * 0.5, mix) };
      }
      function apply(s, tr) { s.translate(tr.x, tr.y); s.rotate(tr.rot); s.scale(tr.Z, tr.Z); s.translate(-H0.x, -H0.y); }
      const grainT = kit.grainTile(256, 0.12, 97);
      bake(sheet, fin, pen, penSh, table);

      return function seek(t) {
        const tr = transformAt(t);
        g.globalAlpha = 1;
        g.drawImage(table.canvas, 0, 0, W, Hs);
        g.save();
        apply(g, tr);
        g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(5, 7, sheetW, sheetH);
        g.drawImage(sheet.canvas, 0, 0, sheetW, sheetH);
        const showFin = tr.Z > 1.9;
        if (showFin) g.drawImage(fin.canvas, rX, rY, rW, rH);
        else {
          if (t >= tC0) waxDraw(g, strokeC, circleP(t));
          if (t >= tK0) waxDraw(g, strokeT, tickP(t));
        }
        g.restore();

        // Loupe.
        const lx0 = k(t, loupeX), ly0 = k(t, loupeY);
        if (t < tYank + 0.15) {
          const cs = Math.cos(tr.rot), sn = Math.sin(tr.rot);
          const dx = lx0 - H0.x, dy = ly0 - H0.y;
          const lx = tr.x + (dx * cs - dy * sn), ly = tr.y + (dx * sn + dy * cs);
          g.fillStyle = 'rgba(0,0,0,.5)';
          g.beginPath(); g.arc(lx + W * 0.022, ly + W * 0.032, lensR + ringW, 0, TAU); g.fill();
          g.save();
          g.beginPath(); g.arc(lx, ly, lensR, 0, TAU); g.clip();
          g.translate(lx, ly); g.scale(mag, mag); g.translate(-lx, -ly);
          apply(g, tr);
          g.drawImage(sheet.canvas, 0, 0, sheetW, sheetH);
          g.restore();
          // Lens edge, a dark refraction then a thin line of light.
          g.lineWidth = lensR * 0.06; g.strokeStyle = 'rgba(0,0,0,.5)';
          g.beginPath(); g.arc(lx, ly, lensR - lensR * 0.03, 0, TAU); g.stroke();
          g.lineWidth = lensR * 0.03; g.strokeStyle = 'rgba(255,255,255,.6)';
          g.beginPath(); g.arc(lx, ly, lensR * 0.88, 3.45, 4.35); g.stroke();
          g.lineWidth = lensR * 0.014; g.strokeStyle = 'rgba(255,255,255,.34)';
          g.beginPath(); g.arc(lx, ly, lensR * 0.88, 0.45, 1.05); g.stroke();
          // A heavy barrel in brushed aluminium with a knurled grip, so it reads against the black film.
          const rO = lensR + ringW;
          const bar = g.createLinearGradient(lx - rO, ly - rO, lx + rO, ly + rO);
          bar.addColorStop(0, '#d9d9d6'); bar.addColorStop(0.35, '#8f8f8c'); bar.addColorStop(0.62, '#5c5c5a'); bar.addColorStop(1, '#9d9d99');
          g.lineWidth = ringW; g.strokeStyle = bar;
          g.beginPath(); g.arc(lx, ly, lensR + ringW / 2, 0, TAU); g.stroke();
          g.lineWidth = 1; g.strokeStyle = 'rgba(20,20,20,.55)';
          g.beginPath();
          const rA = lensR + ringW * 0.42, rB = lensR + ringW * 0.94;
          for (let i = 0; i < 90; i++) { const a = (i / 90) * TAU, ca = Math.cos(a), sa = Math.sin(a); g.moveTo(lx + ca * rA, ly + sa * rA); g.lineTo(lx + ca * rB, ly + sa * rB); }
          g.stroke();
          g.lineWidth = ringW * 0.28; g.strokeStyle = '#141414';
          g.beginPath(); g.arc(lx, ly, lensR + ringW * 0.13, 0, TAU); g.stroke();
          g.lineWidth = 1.2; g.strokeStyle = 'rgba(0,0,0,.8)';
          g.beginPath(); g.arc(lx, ly, rO, 0, TAU); g.stroke();
        }

        // China marker: comes in from the lower right, scrawls, lifts, ticks, leaves.
        if (t > tP0 && t < tZ + 0.06) {
          const cs = Math.cos(tr.rot), sn = Math.sin(tr.rot);
          const toScreen = (q) => { const dx = q[0] - H0.x, dy = q[1] - H0.y; return [tr.x + (dx * cs - dy * sn), tr.y + (dx * sn + dy * cs)]; };
          const startC = toScreen(circlePts[0]), endC = toScreen(circlePts[circlePts.length - 1]), startK = toScreen(tickPts[0]), endK = toScreen(tickPts[tickPts.length - 1]);
          let px, py, lift, ang = 0.92;
          if (t < tC0) {
            const p = kit.ease.out3(clamp((t - tP0) / (tC0 - tP0)));
            px = lerp(W * 1.1, startC[0], p); py = lerp(Hs * 1.05, startC[1], p); lift = 1 - p;
          } else if (t < tC1) {
            const q = toScreen(at(circlePts, circleP(t))); px = q[0]; py = q[1]; lift = 0.06; ang += Math.sin(circleP(t) * 14) * 0.05;
          } else if (t < tK0) {
            const p = kit.ease.io2((t - tC1) / (tK0 - tC1));
            px = lerp(endC[0], startK[0], p); py = lerp(endC[1], startK[1], p); lift = 0.05 + Math.sin(p * Math.PI) * 0.5;
          } else if (t < tK1) {
            const q = toScreen(at(tickPts, tickP(t))); px = q[0]; py = q[1]; lift = 0.06;
          } else {
            const p = kit.ease.in3(clamp((t - tK1) / (tZ - tK1)));
            px = lerp(endK[0], W * 1.2, p); py = lerp(endK[1], Hs * 1.1, p); lift = 0.06 + p * 0.9;
          }
          const lo = W * (0.012 + lift * 0.09);
          g.save(); g.translate(px + lo, py + lo * 1.3); g.rotate(ang); g.globalAlpha = 0.45;
          g.drawImage(penSh.canvas, -2, -penT, penL + 8, penT * 2);
          g.restore();
          g.save(); g.translate(px, py); g.rotate(ang);
          g.drawImage(pen.canvas, -2, -penT, penL + 8, penT * 2);
          g.restore();
        }
        kit.grain(g, grainT, kit.frame(t, 18), 0.7);
      };
    },
  });

  // ===========================================================================================================
  // DARKROOM. The room is painted in full colour once, then multiplied through a red filter, so the safelight and the
  // white light are the same room. The print comes up from a table of development stages worked out in make().
  // ===========================================================================================================
  FMI.add({
    id: 'machines-darkroom',
    lane: LANE,
    name: 'Darkroom',
    blurb: 'Under a red safelight a blank sheet rocks in a developer tray and the logo comes up in patches, then the white tube light stutters on and the room has colour.',
    dur: 3.6,
    ground: '#120202',
    make(stage, kit) {
      const W = kit.w, Hs = kit.h, hash = kit.hash, k = kit.k, clamp = kit.clamp, lerp = kit.lerp;
      const dd = Math.min(kit.dpr, 2);
      const gB = kit.canvas({ alpha: false });
      const gT = kit.canvas();
      const trayEl = gT.canvas;
      trayEl.style.transformOrigin = '50% 46%';

      const tw = Math.min(W * 0.95, (Hs - 60 - 60) / 1.27), th = tw * 1.27;
      const tcx = W / 2, tcy = 60 + (Hs - 60 - 110) * 0.47;
      const tx = tcx - tw / 2, ty = tcy - th / 2;
      const rim = tw * 0.042, wallT = tw * 0.03;
      const fx = tx + rim + wallT, fy = ty + rim + wallT, fw = tw - 2 * (rim + wallT), fh = th - 2 * (rim + wallT);
      const pw = tw * 0.76, ph = pw * 1.26;

      function layerAt(fn) { const L = off(W, Hs, dd); fn(L.g); return L; }

      // ---- Enamel tray, used for the main one and the neighbours ----
      function paintTray(s, x, y, w, h, o) {
        const rb = w * 0.042, wl = w * 0.03;
        s.fillStyle = 'rgba(8,5,3,.62)';
        rr(s, x + w * 0.022, y + w * 0.03, w, h, w * 0.04); s.fill();
        s.fillStyle = o.rim;
        rr(s, x, y, w, h, w * 0.04); s.fill();
        s.fillStyle = '#f2f1ea';
        rr(s, x + w * 0.006, y + w * 0.006, w - w * 0.012, h - w * 0.012, w * 0.036); s.fill();
        // Inner wall, top and left in shade from the lamp.
        const iw = s.createLinearGradient(x, y, x + w * 0.25, y + w * 0.25);
        iw.addColorStop(0, '#b8b6ab'); iw.addColorStop(1, '#dedcd2');
        s.fillStyle = iw;
        rr(s, x + rb, y + rb, w - 2 * rb, h - 2 * rb, w * 0.026); s.fill();
        // Floor.
        s.fillStyle = '#e9e7dd';
        rr(s, x + rb + wl, y + rb + wl, w - 2 * (rb + wl), h - 2 * (rb + wl), w * 0.018); s.fill();
        // Pressed ribs in the floor.
        s.fillStyle = 'rgba(120,115,100,.3)';
        const n = 4;
        for (let i = 1; i <= n; i++) {
          const ry = y + rb + wl + (h - 2 * (rb + wl)) * (i / (n + 1));
          rr(s, x + rb + wl + w * 0.05, ry, w - 2 * (rb + wl) - w * 0.1, Math.max(1.5, w * 0.008), 2); s.fill();
        }
        // Chips in the enamel, with rust.
        for (let i = 0; i < 11; i++) {
          const side = hash(i, o.seed), p = hash(i, o.seed + 1), sz = 0.8 + Math.pow(hash(i, o.seed + 2), 3) * w * 0.012;
          let cx, cy;
          if (side < 0.25) { cx = x + p * w; cy = y + rb * 0.5; }
          else if (side < 0.5) { cx = x + p * w; cy = y + h - rb * 0.5; }
          else if (side < 0.75) { cx = x + rb * 0.5; cy = y + p * h; }
          else { cx = x + w - rb * 0.5; cy = y + p * h; }
          s.fillStyle = '#26211c';
          s.beginPath(); s.ellipse(cx, cy, sz, sz * (0.6 + hash(i, o.seed + 3) * 0.5), hash(i, o.seed + 4) * 3, 0, TAU); s.fill();
          s.fillStyle = '#8a4a1e';
          s.beginPath(); s.ellipse(cx, cy, sz * 0.55, sz * 0.4, 0, 0, TAU); s.fill();
        }
        // Standing liquid in the neighbours.
        if (o.liquid) {
          s.fillStyle = o.liquid;
          rr(s, x + rb + wl, y + rb + wl, w - 2 * (rb + wl), h - 2 * (rb + wl), w * 0.018); s.fill();
          // The tube light in its still surface.
          s.fillStyle = 'rgba(255,255,250,.5)';
          s.fillRect(x + w * 0.2, y + h * (o.seed < 150 ? 0.09 : 0.86), w * 0.55, Math.max(2, w * 0.007));
        }
      }
      function tape(s, x, y, w, h, rot, txt) {
        s.save(); s.translate(x, y); s.rotate(rot);
        s.fillStyle = '#e6d6a8';
        s.beginPath();
        s.moveTo(-w / 2, -h / 2);
        for (let i = 0; i <= 6; i++) s.lineTo(w / 2 + (hash(i, 111) - 0.5) * 2, -h / 2 + (i / 6) * h);
        for (let i = 6; i >= 0; i--) s.lineTo(-w / 2 + (hash(i, 112) - 0.5) * 2, -h / 2 + (i / 6) * h);
        s.closePath(); s.fill();
        s.fillStyle = '#1c1812';
        s.font = '400 ' + h * 0.74 + 'px "Permanent Marker"';
        s.textAlign = 'center'; s.textBaseline = 'middle';
        s.fillText(txt, 0, h * 0.04);
        s.restore();
      }

      // ---- The sink: wooden duckboard slats, wet. ----
      const benchW = layerAt((s) => {
        s.fillStyle = '#1a0f08'; s.fillRect(0, 0, W, Hs);
        const slat = Math.max(46, W / 6.2), gapw = Math.max(5, W * 0.016);
        for (let x = -slat * 0.3, i = 0; x < W; x += slat, i++) {
          const tone = 52 + hash(i, 121) * 22;
          s.fillStyle = 'rgb(' + (tone + 62) + ',' + (tone + 16) + ',' + (tone - 18) + ')';
          s.fillRect(x, 0, slat - gapw, Hs);
          for (let q = 0; q < 110; q++) {
            s.fillStyle = hash(q + i * 200, 122) < 0.6 ? 'rgba(40,18,6,.22)' : 'rgba(240,190,130,.08)';
            s.fillRect(x + hash(q + i * 200, 123) * (slat - gapw), hash(q + i * 200, 124) * Hs, 0.8 + hash(q + i * 200, 125) * 1.2, 30 + hash(q + i * 200, 126) * 170);
          }
          s.fillStyle = 'rgba(255,225,190,.14)'; s.fillRect(x, 0, 1, Hs);
          s.fillStyle = 'rgba(0,0,0,.35)'; s.fillRect(x + slat - gapw - 1.5, 0, 1.5, Hs);
        }
        // Wet patches and standing drops.
        for (let i = 0; i < 9; i++) {
          s.fillStyle = 'rgba(18,8,3,.26)';
          s.beginPath();
          const cx = hash(i, 127) * W, cy = hash(i, 128) * Hs, r = W * (0.06 + hash(i, 129) * 0.16);
          for (let a = 0; a < 18; a++) { const an = (a / 18) * TAU, rr2 = r * (0.7 + hash(a + i * 20, 130) * 0.5); s.lineTo(cx + Math.cos(an) * rr2, cy + Math.sin(an) * rr2 * 1.3); }
          s.closePath(); s.fill();
        }
        for (let i = 0; i < 60; i++) {
          const x = hash(i, 131) * W, y = hash(i, 132) * Hs, r = 1 + hash(i, 133) * 3.2;
          s.fillStyle = 'rgba(15,8,4,.42)'; s.beginPath(); s.arc(x, y, r, 0, TAU); s.fill();
          s.fillStyle = 'rgba(255,245,230,.7)'; s.beginPath(); s.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, TAU); s.fill();
        }
        // The next trays along. Only their ends show.
        const gapT = W * 0.13;
        paintTray(s, tx - W * 0.015, ty + th + gapT, tw, th, { rim: '#2b4a58', seed: 141, liquid: 'rgba(120,84,30,.34)' });
        tape(s, W * 0.27, ty + th + gapT + tw * 0.022, W * 0.2, Math.max(15, W * 0.05), -0.04, 'STOP');
        paintTray(s, tx + W * 0.01, ty - th - gapT, tw, th, { rim: '#2b4a58', seed: 151, liquid: 'rgba(110,110,70,.32)' });
        tape(s, W * 0.72, ty - gapT - tw * 0.022, W * 0.17, Math.max(15, W * 0.05), 0.03, 'FIX');
      });
      // The tube light is overhead and the edges of the sink fall away from it.
      {
        const s = benchW.g, f = s.createRadialGradient(W / 2, Hs * 0.42, W * 0.5, W / 2, Hs * 0.42, Hs * 0.72);
        f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(1, 'rgba(10,6,2,.42)');
        s.fillStyle = f; s.fillRect(0, 0, W, Hs);
      }
      // ---- The tray this all happens in. ----
      const trayW = layerAt((s) => {
        paintTray(s, tx, ty, tw, th, { rim: '#2b4a58', seed: 161 });
        tape(s, tx + tw * 0.2, ty + th - tw * 0.021, W * 0.17, Math.max(15, W * 0.05), 0.025, 'DEV');
        // A glass thermometer lying along the wall.
        s.save();
        s.translate(fx + fw * 0.965, fy + fh * 0.3);
        s.rotate(0.05);
        const tl = fh * 0.52, tb = Math.max(4, W * 0.016);
        s.fillStyle = 'rgba(10,8,5,.4)'; rr(s, -tb / 2 + 2.5, 3, tb, tl, tb / 2); s.fill();
        s.fillStyle = '#e8eae2'; rr(s, -tb / 2, 0, tb, tl, tb / 2); s.fill();
        s.fillStyle = 'rgba(20,20,20,.65)';
        for (let i = 0; i < 26; i++) s.fillRect(-tb / 2 + 1, tl * 0.08 + (i / 26) * tl * 0.8, i % 5 === 0 ? tb * 0.5 : tb * 0.3, 0.8);
        s.fillStyle = '#c4281b';
        s.fillRect(-0.9, tl * 0.4, 1.8, tl * 0.55);
        s.beginPath(); s.arc(0, tl * 0.96, tb * 0.62, 0, TAU); s.fill();
        s.fillStyle = 'rgba(255,255,255,.75)'; s.fillRect(-tb * 0.3, tl * 0.05, 0.9, tl * 0.85);
        s.restore();
      });

      // ---- The picture on the paper, as tones. The carrier's filed black edge comes up first. ----
      function jag(s, x0, y0, x1, y1, amp, seed) {
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3.2);
        const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
        for (let i = 1; i <= n; i++) {
          const p = i / n, a = (hash(i, seed) - 0.5) * amp * 0.7 + (hash(Math.floor(i / 7), seed + 1) - 0.5) * amp;
          s.lineTo(lerp(x0, x1, p) + (nx / nl) * a, lerp(y0, y1, p) + (ny / nl) * a);
        }
      }
      function paintPrint(s) {
        const m = pw * 0.075, iw = pw - m * 2, ih = ph - m * 2, ix = m, iy = m;
        const gr = s.createLinearGradient(0, iy, 0, iy + ih);
        gr.addColorStop(0, '#a4a4a4'); gr.addColorStop(0.62, '#c4c4c4'); gr.addColorStop(0.76, '#d7d7d7'); gr.addColorStop(1, '#bcbcbc');
        s.fillStyle = gr; s.fillRect(ix, iy, iw, ih);
        const pool = s.createRadialGradient(ix + iw * 0.4, iy + ih * 0.36, iw * 0.05, ix + iw * 0.45, iy + ih * 0.42, iw * 0.82);
        pool.addColorStop(0, 'rgba(255,255,255,.55)'); pool.addColorStop(0.6, 'rgba(255,255,255,.05)'); pool.addColorStop(1, 'rgba(0,0,0,.24)');
        s.fillStyle = pool; s.fillRect(ix, iy, iw, ih);
        const sc = (iw * 0.66) / 92, cx = ix + iw * 0.48, cy = iy + ih * 0.385;
        s.save(); s.translate(sc * 9, sc * 11);
        kit.drawF(s, cx, cy, sc, { fill: 'rgba(40,40,40,.58)', head: false });
        s.restore();
        const fill = s.createLinearGradient(0, 0, 0, 110);
        fill.addColorStop(0, '#4c4c4c'); fill.addColorStop(1, '#141414');
        s.save(); s.translate(sc * 1.4, sc * 1.6); kit.drawF(s, cx, cy, sc, { fill: '#000', headFill: '#000' }); s.restore();
        kit.drawF(s, cx, cy, sc, { fill: '#232323', headFill: '#ffffff', knock: '#000' });
        s.fillStyle = '#050505';
        fitFont(s, '400 $px "Archivo Black"', 'FreeMotion', iw * 0.8, 40);
        s.textAlign = 'center'; s.textBaseline = 'alphabetic';
        s.fillText('FreeMotion', pw / 2, iy + ih * 0.875);
        // The black keyline of a filed negative carrier.
        s.fillStyle = '#000';
        const t = pw * 0.012, o = t * 1.3;
        s.beginPath();
        s.moveTo(ix - o, iy - o);
        jag(s, ix - o, iy - o, ix + iw + o, iy - o, 2.8, 171);
        jag(s, ix + iw + o, iy - o, ix + iw + o, iy + ih + o, 2.8, 173);
        jag(s, ix + iw + o, iy + ih + o, ix - o, iy + ih + o, 2.8, 175);
        jag(s, ix - o, iy + ih + o, ix - o, iy - o, 2.8, 177);
        s.closePath();
        s.moveTo(ix + t, iy + t);
        jag(s, ix + t, iy + t, ix + t, iy + ih - t, 0.9, 179);
        jag(s, ix + t, iy + ih - t, ix + iw - t, iy + ih - t, 0.9, 181);
        jag(s, ix + iw - t, iy + ih - t, ix + iw - t, iy + t, 0.9, 183);
        jag(s, ix + iw - t, iy + t, ix + t, iy + t, 0.9, 185);
        s.closePath();
        s.fill('evenodd');
      }

      // ---- Development stages. Dark tones come up first, and the developer reached the top right corner first. ----
      const qs = dd >= 2 ? 1.5 : 1;
      const qw = Math.round(pw * qs), qh = Math.round(ph * qs);
      const tgt = off(pw, ph, qs);
      tgt.g.fillStyle = '#fff'; tgt.g.fillRect(0, 0, pw, ph);
      paintPrint(tgt.g);
      const src = tgt.g.getImageData(0, 0, qw, qh).data;
      function noise(gw, gh, seed) {
        const grid = new Float32Array((gw + 2) * (gh + 2));
        for (let i = 0; i < grid.length; i++) grid[i] = hash(i, seed);
        const out = new Float32Array(qw * qh);
        for (let y = 0; y < qh; y++) {
          const fy2 = (y / qh) * gw * (qh / qw), iy = Math.min(gh, Math.floor(fy2)), ry = fy2 - iy, sy = ry * ry * (3 - 2 * ry);
          for (let x = 0; x < qw; x++) {
            const fx2 = (x / qw) * gw, ix = Math.floor(fx2), rx = fx2 - ix, sx = rx * rx * (3 - 2 * rx);
            const a = grid[iy * (gw + 2) + ix], b = grid[iy * (gw + 2) + ix + 1], c = grid[(iy + 1) * (gw + 2) + ix], e = grid[(iy + 1) * (gw + 2) + ix + 1];
            out[y * qw + x] = (a + (b - a) * sx) * (1 - sy) + (c + (e - c) * sx) * sy;
          }
        }
        return out;
      }
      const gh2 = (n) => Math.ceil(n * (qh / qw)) + 1;
      const n1 = noise(5, gh2(5), 191), n2 = noise(17, gh2(17), 193), n3 = noise(70, gh2(70), 197);
      const STAGES = 9, stages = [];
      for (let si = 0; si < STAGES; si++) {
        const c = document.createElement('canvas');
        c.width = qw; c.height = qh;
        const x = c.getContext('2d');
        const im = x.createImageData(qw, qh), px = im.data;
        const s = (si / (STAGES - 1)) * 1.72;
        for (let y = 0; y < qh; y++) {
          for (let xx = 0; xx < qw; xx++) {
            const i = y * qw + xx, dens = 1 - src[i * 4] / 255;
            if (dens < 0.004) continue;
            const front = 0.5 * (1 - xx / qw) + 0.5 * (y / qh);
            const arr = 0.36 * front + 0.64 * (0.68 * n1[i] + 0.32 * n2[i]);
            const th0 = 0.03 + 0.45 * Math.pow(1 - dens, 1.25) + 0.9 * arr;
            const wd = 0.13 + 0.25 * (1 - dens);
            let v = (s - th0) / wd; v = v < 0 ? 0 : v > 1 ? 1 : v; v = v * v * (3 - 2 * v);
            const mott = 1 - 0.6 * (1 - v) * n3[i];
            px[i * 4 + 3] = 255 * dens * v * mott;
          }
        }
        x.putImageData(im, 0, 0);
        stages.push(c);
      }
      const inkBuf = off(pw, ph, qs);

      // ---- The paper ----
      const paper = off(pw + 8, ph + 8, dd);
      {
        const s = paper.g;
        s.translate(4, 4);
        s.fillStyle = '#f4f1e6'; s.fillRect(0, 0, pw, ph);
        for (let i = 0; i < 500; i++) {
          s.fillStyle = hash(i, 201) < 0.5 ? 'rgba(120,100,70,.05)' : 'rgba(255,255,255,.2)';
          s.fillRect(hash(i, 202) * pw, hash(i, 203) * ph, 2 + hash(i, 204) * 10, 0.6);
        }
      }
      const paperDone = off(pw + 8, ph + 8, dd);
      {
        const s = paperDone.g;
        s.drawImage(paper.canvas, 0, 0, pw + 8, ph + 8);
        s.translate(4, 4);
        const hi = off(pw, ph, dd);
        hi.g.fillStyle = '#fff'; hi.g.fillRect(0, 0, pw, ph);
        paintPrint(hi.g);
        s.globalCompositeOperation = 'multiply';
        s.drawImage(hi.canvas, 0, 0, pw, ph);
        s.globalCompositeOperation = 'source-over';
      }

      // ---- Plastic tongs. Teal, so under the safelight they read black, and the colour is the surprise. Tip at origin. ----
      const tongL = W * 1.25, tongH = W * 0.36;
      const tongs = off(tongL, tongH, dd), tongSh = off(tongL, tongH, 1);
      function paintTongs(s, solid) {
        s.save(); s.translate(0, tongH / 2);
        const blade = (dir) => {
          s.beginPath();
          s.moveTo(2, dir * W * 0.006);
          s.lineTo(W * 0.1, dir * W * 0.012);
          s.lineTo(W * 1.25, dir * W * 0.11);
          s.lineTo(W * 1.25, dir * W * 0.052);
          s.lineTo(W * 0.1, dir * (W * 0.012 - W * 0.034));
          s.lineTo(2, dir * (W * 0.006 - W * 0.022));
          s.closePath();
        };
        if (solid) { s.fillStyle = '#000'; blade(1); s.fill(); blade(-1); s.fill(); }
        else {
          for (const dir of [-1, 1]) {
            s.fillStyle = dir < 0 ? '#23c7ad' : '#159d88'; blade(dir); s.fill();
            s.strokeStyle = 'rgba(255,255,255,.32)'; s.lineWidth = 1;
            s.beginPath(); s.moveTo(W * 0.14, dir * W * 0.004); s.lineTo(W * 1.2, dir * W * 0.09); s.stroke();
            // Moulded grip ribs.
            s.fillStyle = 'rgba(0,50,44,.35)';
            for (let i = 0; i < 12; i++) { const qx = W * 0.5 + i * W * 0.05; const yy = dir * (W * 0.012 + (qx - W * 0.1) * 0.085); s.fillRect(qx, yy - W * 0.012, W * 0.012, W * 0.03); }
          }
          // Rubber tips.
          s.fillStyle = '#2d2925';
          for (const dir of [-1, 1]) { rr(s, 0, dir < 0 ? -W * 0.018 : W * 0.0005, W * 0.055, W * 0.0175, 2); s.fill(); }
        }
        s.restore();
      }
      paintTongs(tongs.g, false);
      paintTongs(tongSh.g, true);

      // ---- The same room under the red safelight. ----
      function safelit(L) {
        const R = off(W, Hs, dd), s = R.g;
        s.drawImage(L.canvas, 0, 0, W, Hs);
        s.globalCompositeOperation = 'multiply';
        s.fillStyle = 'rgb(186,24,12)'; s.fillRect(0, 0, W, Hs);
        // The safelight is small and close: it falls off fast from the middle of the tray.
        const f = s.createRadialGradient(tcx - W * 0.06, tcy - th * 0.1, W * 0.14, tcx, tcy, Math.max(W * 0.86, th * 0.72));
        f.addColorStop(0, '#ffffff'); f.addColorStop(0.5, '#a8a8a8'); f.addColorStop(0.82, '#4a4a4a'); f.addColorStop(1, '#141414');
        s.fillStyle = f; s.fillRect(0, 0, W, Hs);
        s.globalCompositeOperation = 'destination-in';
        s.drawImage(L.canvas, 0, 0, W, Hs);
        return R;
      }
      const benchR = safelit(benchW), trayR = safelit(trayW);
      function safeSmall(src2, W2, H2, dens, tint, falloff) {
        const R = off(W2, H2, dens), s = R.g;
        s.drawImage(src2.canvas, 0, 0, W2, H2);
        s.globalCompositeOperation = 'multiply';
        s.fillStyle = tint; s.fillRect(0, 0, W2, H2);
        if (falloff) {
          // The same fast falloff across the sheet: hottest upper left of centre, dull at the corners.
          const f = s.createRadialGradient(W2 * 0.42, H2 * 0.36, W2 * 0.12, W2 * 0.5, H2 * 0.5, Math.max(W2, H2) * 0.72);
          f.addColorStop(0, '#ffffff'); f.addColorStop(0.55, '#c4c4c4'); f.addColorStop(1, '#6e6e6e');
          s.fillStyle = f; s.fillRect(0, 0, W2, H2);
        }
        s.globalCompositeOperation = 'destination-in';
        s.drawImage(src2.canvas, 0, 0, W2, H2);
        return R;
      }
      const paperR = safeSmall(paper, pw + 8, ph + 8, dd, 'rgb(232,44,18)', true), paperDoneR = safeSmall(paperDone, pw + 8, ph + 8, dd, 'rgb(232,44,18)', true);
      const tongsR = safeSmall(tongs, tongL, tongH, dd, 'rgb(255,30,12)', false);
      const grainT = kit.grainTile(256, 0.16, 215);
      bake(benchW, benchR, trayW, trayR, paperR, paperDone, paperDoneR, tongs, tongsR, tongSh);

      // ---- Timing and physics ----
      const dur = 3.6, tLight = 3.02;
      // The hand tilts the tray. Uneven: a shove, a hold, a lazy return, another shove.
      const tiltKeys = [[0, 0.7], [0.16, -1, 'io2'], [0.42, -1], [0.8, 0.85, 'io3'], [1.0, 0.85], [1.34, -0.8, 'io2'], [1.46, -0.8], [1.86, 0.9, 'io3'], [2.02, 0.9], [2.38, -0.7, 'io2'], [2.5, -0.7], [2.86, 0.0, 'io2']];
      const tilt = (t) => k(t, tiltKeys);
      // The liquid follows the tilt on a damped spring. Worked out once, so any frame can be asked for.
      const STEP = 1 / 240, slosh = [];
      {
        let c = 0.55, v = 0;
        const om = TAU / 0.82, ze = 0.3;
        for (let i = 0; i <= Math.ceil((dur + 0.2) / STEP); i++) {
          const a = -2 * ze * om * v - om * om * (c - tilt(i * STEP) * 0.82);
          v += a * STEP; c += v * STEP;
          slosh.push(c, v);
        }
      }
      const sl = (t) => { const f = clamp(t, 0, dur) / STEP, i = Math.floor(f), r = f - i; return [lerp(slosh[i * 2], slosh[i * 2 + 2], r), lerp(slosh[i * 2 + 1], slosh[i * 2 + 3], r)]; };
      const devAt = (t) => k(t, [[0.28, 0], [0.7, 0.2, 'out2'], [1.0, 0.24], [1.5, 0.52, 'io2'], [1.76, 0.58], [2.3, 0.84, 'io2'], [2.86, 1, 'out2']]);
      const isWhite = (t) => (t >= tLight && t < tLight + 0.05) || t >= tLight + 0.125;
      const tongX = [[0, 0], [0.18, W * 0.018, 'out3'], [0.7, W * 0.018], [0.84, -W * 0.012, 'io2'], [1.5, -W * 0.012], [1.62, W * 0.012, 'out3'], [2.2, W * 0.012], [2.34, 0, 'io2'], [2.92, 0], [3.2, W * 0.03, 'out3']];
      const tongY = [[0, 0], [0.18, W * 0.03, 'out3'], [0.7, W * 0.03], [0.84, W * 0.005, 'io2'], [1.5, W * 0.005], [1.62, W * 0.03, 'out3'], [2.2, W * 0.03], [2.34, W * 0.012, 'io2'], [2.92, W * 0.012], [3.2, -W * 0.05, 'out3']];
      const pts = 30;
      const edge = (arr, y, t, seed, amp) => {
        for (let i = 0; i <= pts; i++) {
          const x = fx + (i / pts) * fw;
          const w1 = Math.sin(x * 0.019 + t * 5.6 + seed) * amp, w2 = Math.sin(x * 0.053 - t * 3.7 + seed * 2.1) * amp * 0.34;
          arr[i * 2] = x; arr[i * 2 + 1] = y + w1 + w2;
        }
        return arr;
      };
      const eA = new Float32Array((pts + 1) * 2), eB = new Float32Array((pts + 1) * 2);
      const trace = (s, arr, rev) => { if (!rev) for (let i = 0; i <= pts; i++) s.lineTo(arr[i * 2], arr[i * 2 + 1]); else for (let i = pts; i >= 0; i--) s.lineTo(arr[i * 2], arr[i * 2 + 1]); };

      return function seek(t) {
        const T = Math.min(t, dur);
        const white = isWhite(T), tl = tilt(T), s2 = sl(T), c = s2[0], vel = s2[1];
        gB.globalAlpha = 1;
        gB.drawImage((white ? benchW : benchR).canvas, 0, 0, W, Hs);
        // The tray actually tips, one end up and the other down.
        trayEl.style.transform = 'perspective(' + Math.round(W * 3.2) + 'px) rotateX(' + (tl * 3.1).toFixed(3) + 'deg) rotateY(' + (Math.sin(T * 2.7) * 0.5 * (T < 2.9 ? 1 : clamp((3.3 - T) / 0.4))).toFixed(3) + 'deg)';
        const s = gT;
        s.clearRect(0, 0, W, Hs);
        s.drawImage((white ? trayW : trayR).canvas, 0, 0, W, Hs);

        // The sheet floats with the liquid, and the tongs have hold of it.
        const dx = k(T, tongX) * 0.4, dy = c * W * 0.03 + k(T, tongY) * 0.35, rot = -0.03 + c * 0.012;
        const pcx = tcx + dx, pcy = tcy + dy;
        s.save();
        s.translate(pcx, pcy); s.rotate(rot);
        s.fillStyle = white ? 'rgba(60,50,30,.3)' : 'rgba(30,0,0,.35)';
        s.fillRect(-pw / 2 + 3, -ph / 2 + 4, pw, ph);
        const dv = devAt(T);
        if (dv >= 1) s.drawImage((white ? paperDone : paperDoneR).canvas, -pw / 2 - 4, -ph / 2 - 4, pw + 8, ph + 8);
        else {
          s.drawImage(paperR.canvas, -pw / 2 - 4, -ph / 2 - 4, pw + 8, ph + 8);
          const f = dv * (STAGES - 1), i0 = Math.min(STAGES - 2, Math.floor(f)), p = f - i0;
          const b = inkBuf.g;
          b.clearRect(0, 0, pw, ph);
          b.globalCompositeOperation = 'lighter';
          b.globalAlpha = 1 - p; b.drawImage(stages[i0], 0, 0, pw, ph);
          b.globalAlpha = p; b.drawImage(stages[i0 + 1], 0, 0, pw, ph);
          b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
          s.drawImage(inkBuf.canvas, -pw / 2, -ph / 2, pw, ph);
        }
        s.restore();

        // ---- The liquid. It runs up and down the floor, so part of the floor and the sheet can stand out of it. ----
        s.save();
        rr(s, fx, fy, fw, fh, tw * 0.018); s.clip();
        const reach = fh * 0.62, speed = Math.min(1.4, Math.abs(vel) * 0.42);
        const yt = fy + Math.max(-0.2, c) * reach - fh * 0.02 + (c < 0 ? c * reach * 0.0 : 0);
        const yb = fy + fh + Math.min(0.2, c) * reach + fh * 0.02;
        const amp = W * (0.012 + speed * 0.03);
        edge(eA, yt, T, 1.3, amp);
        edge(eB, yb, T, 4.1, amp);
        const tintC = white ? 'rgba(168,136,70,.1)' : 'rgba(58,0,0,.36)';
        s.fillStyle = tintC;
        s.beginPath(); s.moveTo(eA[0], eA[1]); trace(s, eA, false); trace(s, eB, true); s.closePath();
        s.save();
        s.fill();
        s.clip();
        // The lamp in the surface. Calm water gives a clean shape; moving water breaks it into stacked slivers.
        const rough = 0.15 + speed;
        if (white) {
          // The tube, long and thin, broken into slivers while the surface is still moving.
          const rx = fx + fw * (0.34 + c * 0.05), ry = fy + fh * (0.05 + c * 0.05);
          s.lineCap = 'round'; s.strokeStyle = 'rgba(255,255,250,.9)';
          const rowH = W * 0.008;
          s.lineWidth = rowH * (1.1 - Math.min(0.5, rough * 0.5));
          s.beginPath();
          for (let i = 0; i < 3; i++) {
            const half = fw * 0.3 * (0.8 + 0.2 * Math.sin(i * 2.4 + T * 7)), xo = Math.sin(i * 1.7 + T * 8.3) * rough * W * 0.03;
            const yy = ry + (i - 1) * rowH * (1 + rough);
            s.moveTo(rx + xo - half, yy); s.lineTo(rx + xo + half, yy);
          }
          s.stroke();
        } else {
          // The safelight as a broad sheen sliding over the wet surface, wavy at the edges.
          const sy = fy + fh * (0.34 + c * 0.62), slope = -0.1;
          [[fh * 0.17, 'rgba(255,120,80,.1)'], [fh * 0.05, 'rgba(255,135,95,.13)']].forEach((bandS, bi) => {
            s.fillStyle = bandS[1];
            s.beginPath();
            for (let i = 0; i <= 16; i++) { const x = fx + (i / 16) * fw, yy = sy + (x - fx) * slope - bandS[0] / 2 + Math.sin(i * 0.8 + T * 6 + bi) * W * 0.012 * (1 + rough * 2); s.lineTo(x, yy); }
            for (let i = 16; i >= 0; i--) { const x = fx + (i / 16) * fw, yy = sy + (x - fx) * slope + bandS[0] / 2 + Math.sin(i * 0.8 + T * 5 + bi + 2) * W * 0.012 * (1 + rough * 2); s.lineTo(x, yy); }
            s.closePath(); s.fill();
          });
        }
        s.restore();
        // The wave's lip: a crest with real thickness, bright on the lit side, dark in front where it bends the light.
        const lip = white ? 'rgba(255,255,255,.9)' : 'rgba(255,128,90,.82)';
        const dark = white ? 'rgba(84,62,24,.38)' : 'rgba(24,0,0,.62)';
        const band = white ? 'rgba(255,255,255,.3)' : 'rgba(255,92,60,.26)';
        const crest = (arr, dir, seed) => {
          // Dark band just outside the liquid.
          s.fillStyle = dark;
          s.beginPath();
          for (let i = 0; i <= pts; i++) { const x = arr[i * 2], y = arr[i * 2 + 1]; if (i === 0) s.moveTo(x, y); else s.lineTo(x, y); }
          for (let i = pts; i >= 0; i--) { const x = arr[i * 2], y = arr[i * 2 + 1]; s.lineTo(x, y - dir * (2.5 + 3 * Math.sin(i * 0.7 + seed + T * 4) ** 2)); }
          s.closePath(); s.fill();
          // Crest band just inside it, swelling and thinning along its length.
          s.fillStyle = band;
          s.beginPath();
          for (let i = 0; i <= pts; i++) { const x = arr[i * 2], y = arr[i * 2 + 1]; if (i === 0) s.moveTo(x, y); else s.lineTo(x, y); }
          for (let i = pts; i >= 0; i--) { const x = arr[i * 2], y = arr[i * 2 + 1]; s.lineTo(x, y + dir * (W * 0.012 + W * (0.018 + speed * 0.03) * Math.abs(Math.sin(i * 0.38 + seed + T * 3.4)))); }
          s.closePath(); s.fill();
          s.strokeStyle = lip; s.lineWidth = 1.5; s.lineCap = 'butt';
          s.beginPath();
          for (let i = 0; i <= pts; i++) { const x = arr[i * 2], y = arr[i * 2 + 1]; if (i === 0) s.moveTo(x, y); else s.lineTo(x, y); }
          s.stroke();
        };
        crest(eA, 1, 0.4);
        crest(eB, -1, 2.2);
        // Broken glints running behind each wave: short, tapered, gone as the water settles.
        const glintC = white ? 'rgba(255,255,255,.62)' : 'rgba(255,110,76,.6)';
        s.strokeStyle = glintC; s.lineCap = 'round';
        for (let row = 0; row < 3; row++) {
          const sp = (row + 1) * W * 0.058 * (0.8 + speed * 0.7);
          const yA = yt + sp, yB2 = yb - sp, fade = (0.25 + speed) * (1 - row * 0.24);
          s.globalAlpha = Math.min(1, fade);
          s.lineWidth = 1.5 - row * 0.3;
          s.beginPath();
          for (let i = 0; i < 6; i++) {
            const h0 = hash(i + row * 11, 211);
            const xx = fx + (((h0 * fw + T * W * (0.2 + row * 0.1) * (i % 2 ? 1 : -1)) % fw) + fw) % fw, lenG = W * (0.03 + hash(i + row * 7, 212) * 0.07);
            const wy = Math.sin(xx * 0.03 + T * 5 + row) * amp * 0.6;
            s.moveTo(xx, yA + wy); s.quadraticCurveTo(xx + lenG / 2, yA + wy - 2, xx + lenG, yA + wy);
            const xx2 = fx + (((hash(i + row * 13, 213) * fw - T * W * (0.2 + row * 0.1) * (i % 2 ? 1 : -1)) % fw) + fw) % fw;
            s.moveTo(xx2, yB2 + wy); s.quadraticCurveTo(xx2 + lenG / 2, yB2 + wy + 2, xx2 + lenG, yB2 + wy);
          }
          s.stroke();
        }
        s.globalAlpha = 1;
        s.restore();

        // Tongs, gripping the top right of the sheet. Their shadow lands on the liquid.
        const tipX = tcx + pw * 0.27 + k(T, tongX), tipY = tcy - ph * 0.385 + k(T, tongY) + c * W * 0.015;
        const ang = -1.2 + tl * 0.02;
        s.save(); s.translate(tipX + W * 0.016, tipY + W * 0.024); s.rotate(ang); s.globalAlpha = 0.42;
        s.drawImage(tongSh.canvas, 0, -tongH / 2, tongL, tongH);
        s.restore();
        s.save(); s.translate(tipX, tipY); s.rotate(ang);
        s.drawImage((white ? tongs : tongsR).canvas, 0, -tongH / 2, tongL, tongH);
        s.restore();
        // Fast film in a dim room is grainy. With the white light on, much less so.
        kit.grain(s, grainT, kit.frame(T, 18), white ? 0.28 : 0.85);
      };
    },
  });
})();
