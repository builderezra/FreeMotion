// Film and tape: three takes built from the real material. Every frame comes from t alone.
(function () {
  const TAU = Math.PI * 2;
  const LANE = 'Film and tape';

  // An off-screen layer drawn in CSS pixels at its own resolution. A low res gives printed softness when scaled back up.
  function lay(W, H, res) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * res));
    c.height = Math.max(1, Math.round(H * res));
    const g = c.getContext('2d');
    g.scale(c.width / W, c.height / H);
    return { canvas: c, g, w: W, h: H };
  }

  function makeNoise(kit, seed) {
    const N = 128, M = N - 1, tb = new Float32Array(N * N), r = kit.rng(seed);
    for (let i = 0; i < tb.length; i++) tb[i] = r();
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const fx = x - xi, fy = y - yi;
      const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
      const x0 = xi & M, x1 = (xi + 1) & M, y0 = (yi & M) * N, y1 = ((yi + 1) & M) * N;
      const a = tb[x0 + y0], b = tb[x1 + y0], c = tb[x0 + y1], d = tb[x1 + y1];
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }
  function fbm(n, x, y, oct) {
    let s = 0, a = 0.5, f = 1, m = 0;
    for (let i = 0; i < oct; i++) {
      s += a * n(x * f + i * 17, y * f + i * 9);
      m += a; a *= 0.5; f *= 2.03;
    }
    return s / m;
  }
  // Soft density blotches, for emulsion, frosted glass and the like. Drawn small, scaled up.
  function blotch(kit, W, H, cell, seed, rgb, amount, floor) {
    const res = 0.25, lw = Math.ceil(W * res), lh = Math.ceil(H * res);
    const c = document.createElement('canvas');
    c.width = lw; c.height = lh;
    const x = c.getContext('2d'), im = x.createImageData(lw, lh), n = makeNoise(kit, seed), d = im.data;
    for (let py = 0, i = 0; py < lh; py++) {
      for (let px = 0; px < lw; px++, i += 4) {
        const v = fbm(n, px / (cell * res), py / (cell * res), 4);
        const a = kit.clamp((v - floor) / (1 - floor) * 2.4) * amount;
        d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = a * 255;
      }
    }
    x.putImageData(im, 0, 0);
    return c;
  }
  function specks(g, kit, f, W, H, n, whiteShare, big) {
    for (let i = 0; i < n; i++) {
      const a = kit.hash(f * 97 + i, 21), b = kit.hash(f * 53 + i * 3, 22), c = kit.hash(f + i * 7, 23);
      const r = 0.4 + c * c * c * (big || 3.2);
      g.fillStyle = kit.hash(f + i * 13, 24) < whiteShare ? 'rgba(255,252,240,.9)' : 'rgba(8,6,4,.9)';
      g.beginPath();
      g.ellipse(a * W, b * H, r, r * (0.5 + kit.hash(i + f, 25) * 0.8), kit.hash(i * 3 + f, 26) * 3, 0, TAU);
      g.fill();
    }
  }
  function hairs(g, kit, f, W, H, n) {
    g.lineWidth = 0.9;
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const life = f * 3 + i;
      if (kit.hash(life, 71) > 0.55) continue;
      const x = kit.hash(life, 72) * W, y = kit.hash(life, 73) * H, L = 14 + kit.hash(life, 74) * 60;
      const a = kit.hash(life, 75) * TAU;
      g.strokeStyle = kit.hash(life, 76) < 0.5 ? 'rgba(10,8,6,.8)' : 'rgba(252,248,236,.8)';
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + Math.cos(a) * L * 0.5 + 14, y + Math.sin(a) * L * 0.5 - 12, x + Math.cos(a + 1) * L, y + Math.sin(a + 1) * L, x + Math.cos(a) * L, y + Math.sin(a) * L);
      g.stroke();
    }
  }
  function scratches(g, kit, f, W, H, n, strength) {
    for (let i = 0; i < n; i++) {
      const life = Math.floor((f + i * 7) / (5 + i * 2));
      const x = kit.hash(life * 31 + i, 61) * W + Math.sin(f * 0.9 + i) * 1.4;
      const a = (0.18 + kit.hash(f + i * 11, 62) * 0.5) * strength;
      const y0 = kit.hash(life + i, 63) < 0.6 ? 0 : kit.hash(life + i, 64) * H * 0.7;
      const len = kit.hash(life + i, 65) < 0.6 ? H : H * 0.3;
      g.fillStyle = (kit.hash(life, 66 + i) < 0.7 ? 'rgba(250,246,230,' : 'rgba(10,8,6,') + a + ')';
      g.fillRect(x, y0, 0.7 + kit.hash(life + i, 67) * 1.1, len);
    }
  }

  // ------------------------------------------------------------------------------------------------------------------
  // (a) A projected leader. 3, 2, the punched pop-frame, then the film jams on the 1, blisters and burns through in the
  // gate. The projectionist restarts it, the title frames roll up, catch, and weave down to rest.
  // ------------------------------------------------------------------------------------------------------------------
  FMI.add({
    id: 'film-leader',
    lane: LANE,
    name: 'Leader burn',
    blurb: 'A projected film leader counts 3, 2, pops, jams on the 1 and burns through in the gate, then the logo rolls up and catches on the film.',
    dur: 3.7,
    ground: '#000',
    make(stage, kit) {
      const { w, h, hash, clamp, lerp, F } = kit;
      const g = kit.canvas({ alpha: false });
      g.lineCap = 'round';
      const M = 44;
      const PW = w + M * 2, PH = h + M * 2;
      const cx = PW / 2, cy = h * 0.45 + M;
      const R = Math.min(w * 0.44, h * 0.27);
      const RES = 0.8;

      // The leader's stock: warm grey, uneven density, faint processing streaks running along the film.
      const field = lay(PW, PH, RES);
      {
        const c = field.g;
        c.fillStyle = '#b4b0a0';
        c.fillRect(0, 0, PW, PH);
        c.drawImage(blotch(kit, PW, PH, 150, 11, [46, 38, 26], 0.42, 0.45), 0, 0, PW, PH);
        c.drawImage(blotch(kit, PW, PH, 44, 12, [255, 250, 232], 0.2, 0.5), 0, 0, PW, PH);
        const r = kit.rng(5);
        for (let i = 0; i < 70; i++) {
          c.fillStyle = (r() < 0.5 ? 'rgba(20,16,10,' : 'rgba(255,250,235,') + (0.015 + r() * 0.05) + ')';
          c.fillRect(r() * PW, 0, 0.6 + r() * 2.4, PH);
        }
      }
      // What is printed on it: cross, double ring, ticks, the number, a stamped word and a grease pencil note.
      function ink(d) {
        const L = lay(PW, PH, RES), c = L.g;
        c.fillStyle = '#0c0b09';
        c.fillRect(0, cy - 1, PW, 2);
        c.fillRect(cx - 1, 0, 2, PH);
        for (let i = -24; i <= 24; i++) {
          if (!i) continue;
          const q = i * R * 0.125, big = i % 4 === 0 ? 7 : 3.5;
          c.fillRect(cx + q - 0.7, cy - big, 1.4, big * 2);
          c.fillRect(cx - big, cy + q - 0.7, big * 2, 1.4);
        }
        c.strokeStyle = '#f8f5ea';
        c.lineWidth = Math.max(2.4, R * 0.022);
        c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
        c.lineWidth = Math.max(1.4, R * 0.012);
        c.beginPath(); c.arc(cx, cy, R * 0.86, 0, TAU); c.stroke();
        c.font = '400 ' + Math.round(R * 1.42) + 'px Anton';
        c.textAlign = 'center';
        c.textBaseline = 'alphabetic';
        const m = c.measureText(String(d));
        c.fillStyle = '#0c0b09';
        c.fillText(String(d), cx, cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
        c.font = '700 ' + Math.max(10, Math.round(w * 0.031)) + 'px "Courier Prime"';
        c.textAlign = 'left';
        c.fillStyle = 'rgba(12,11,9,.82)';
        c.fillText('PICTURE', M + w * 0.075, M + Math.max(78, h * 0.1));
        c.textAlign = 'right';
        c.fillText('REEL 1', M + w * 0.925, M + Math.max(78, h * 0.1));
        c.save();
        c.translate(cx + R * 0.56, cy + R * 1.2);
        c.rotate(-0.13);
        c.font = '400 ' + Math.round(w * 0.095) + 'px "Reenie Beanie"';
        c.fillStyle = 'rgba(146,30,18,.86)';
        c.textAlign = 'center';
        c.fillText(d === 3 ? 'head' : d === 2 ? 'head out' : 'sync', 0, 0);
        c.restore();
        return L;
      }
      const inks = { 3: ink(3), 2: ink(2), 1: ink(1) };

      // The punch: a hole through the frame with a torn lip, pure lamp behind it.
      const punch = lay(PW, PH, 1);
      {
        const c = punch.g, r = kit.rng(9), rr = R * 0.5;
        c.beginPath();
        for (let i = 0; i <= 90; i++) {
          const a = (i / 90) * TAU, q = rr * (1 + (r() - 0.5) * 0.035);
          const x = cx + R * 0.12 + Math.cos(a) * q, y = cy - R * 0.08 + Math.sin(a) * q;
          if (i) c.lineTo(x, y); else c.moveTo(x, y);
        }
        c.closePath();
        c.fillStyle = '#fffef6';
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = '#17120c';
        c.stroke();
      }

      // Lens falloff across the screen, fixed to the projector.
      const vig = lay(w, h, 0.5);
      {
        const c = vig.g, gr = c.createRadialGradient(w * 0.5, h * 0.46, Math.min(w, h) * 0.42, w * 0.5, h * 0.48, Math.hypot(w, h) * 0.58);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(0.55, 'rgba(0,0,0,.24)');
        gr.addColorStop(1, 'rgba(0,0,0,.72)');
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
      }
      // The gate: a black plate with a rounded hole. It stays still while the film weaves behind it.
      const gate = lay(w, h, Math.min(kit.dpr, 2));
      {
        const c = gate.g, ins = Math.max(5, w * 0.016), r = w * 0.04, rn = kit.rng(44);
        c.fillStyle = '#000';
        c.fillRect(0, 0, w, h);
        c.globalCompositeOperation = 'destination-out';
        c.beginPath();
        c.roundRect(ins, ins, w - ins * 2, h - ins * 2, r);
        c.fill();
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#000';
        for (let i = 0; i < 40; i++) {
          const along = rn(), side = rn();
          if (side < 0.5) c.fillRect(side < 0.25 ? ins - 1 : w - ins - 0.6, along * h, 1.6, 2 + rn() * 12);
          else c.fillRect(along * w, side < 0.75 ? ins - 1 : h - ins - 0.6, 2 + rn() * 12, 1.6);
        }
      }

      // The burn: blisters open ahead of the main hole, each with a char line and a hot lip, lamp white inside.
      const BR = 0.4, BW = Math.round(w * BR), BH = Math.round(h * BR);
      const burn = [];
      {
        const bx = w * 0.56, by = h * 0.42, D = Math.hypot(Math.max(bx, w - bx), Math.max(by, h - by));
        const r = kit.rng(77), nA = makeNoise(kit, 31), seeds = [{ x: bx, y: by, t: 0, k: 1.05 }];
        for (let i = 0; i < 42; i++) {
          const a = r() * TAU, q = Math.sqrt(r()) * D * 0.92;
          seeds.push({ x: bx + Math.cos(a) * q, y: by + Math.sin(a) * q, t: (q / D) * 0.6 + 0.04 + r() * 0.12, k: 2.2 + r() * 4.2 });
        }
        const B = new Float32Array(BW * BH);
        for (let y = 0, i = 0; y < BH; y++) {
          for (let x = 0; x < BW; x++, i++) {
            const px = x / BR, py = y / BR;
            let m = 9;
            for (let s = 0; s < seeds.length; s++) {
              const q = seeds[s], dx = px - q.x, dy = py - q.y;
              const v = q.t + (Math.sqrt(dx * dx + dy * dy) / D) * q.k;
              if (v < m) m = v;
            }
            B[i] = m + (fbm(nA, px / 34, py / 34, 3) - 0.5) * 0.16 + (nA(px / 5, py / 5) - 0.5) * 0.028;
          }
        }
        const stops = [[0, 124, 76, 30, 0], [0.5, 122, 72, 26, 0], [0.7, 98, 54, 18, 0.74], [0.82, 22, 11, 5, 0.97], [0.92, 74, 30, 10, 1], [0.965, 216, 118, 30, 1], [0.99, 255, 226, 150, 1], [1, 255, 253, 242, 1]];
        const lut = new Uint8ClampedArray(256 * 4);
        for (let i = 0; i < 256; i++) {
          const p = i / 255;
          let a = stops[0], b = stops[stops.length - 1];
          for (let s = 0; s < stops.length - 1; s++) if (p >= stops[s][0] && p <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
          const q = (p - a[0]) / (b[0] - a[0] || 1);
          for (let c = 0; c < 3; c++) lut[i * 4 + c] = lerp(a[c + 1], b[c + 1], q);
          lut[i * 4 + 3] = lerp(a[4], b[4], q) * 255;
        }
        for (let fr = 0; fr < 12; fr++) {
          const p = 0.02 + Math.pow(fr / 11, 1.55) * 1.28;
          const c = document.createElement('canvas');
          c.width = BW; c.height = BH;
          const x = c.getContext('2d'), im = x.createImageData(BW, BH), d = im.data;
          for (let i = 0; i < B.length; i++) {
            const v = p - B[i];
            if (v < -0.24) continue;
            const q = v >= 0 ? 255 : Math.round(((v + 0.24) / 0.24) * 255);
            d[i * 4] = lut[q * 4]; d[i * 4 + 1] = lut[q * 4 + 1]; d[i * 4 + 2] = lut[q * 4 + 2]; d[i * 4 + 3] = lut[q * 4 + 3];
          }
          x.putImageData(im, 0, 0);
          burn.push(c);
        }
      }

      // The title frame, printed: milky black, bone-white logo with pinholes and uneven density, soft from the optical printer.
      const s = Math.min(w * 0.6, h * 0.3) / F.box.w;
      const tcy = h * 0.4 + M, tcx = PW / 2;
      const title = lay(PW, PH, 0.9), tint = lay(PW, PH, 0.9);
      {
        const c = title.g;
        c.fillStyle = '#0d0c0a';
        c.fillRect(0, 0, PW, PH);
        c.drawImage(blotch(kit, PW, PH, 120, 21, [40, 36, 28], 0.5, 0.5), 0, 0, PW, PH);
        const mark = lay(PW, PH, 0.9), mc = mark.g;
        kit.drawF(mc, tcx, tcy, s, { fill: '#f6efdd', head: false });
        mc.font = '400 ' + Math.round(w * 0.142) + 'px "Abril Fatface"';
        mc.textAlign = 'center';
        mc.textBaseline = 'alphabetic';
        mc.fillStyle = '#f6efdd';
        mc.fillText('FreeMotion', tcx, tcy + s * F.box.h * 0.5 + w * 0.2);
        // The double rule of a silent-picture title card, its corners stepped in.
        const bx0 = tcx - w * 0.43, bx1 = tcx + w * 0.43;
        const by0 = tcy - s * F.box.h * 0.5 - h * 0.075, by1 = tcy + s * F.box.h * 0.5 + w * 0.2 + h * 0.07;
        const rule = (ins, lw, step) => {
          mc.lineWidth = lw;
          mc.strokeStyle = '#f6efdd';
          mc.beginPath();
          mc.moveTo(bx0 + ins + step, by0 + ins);
          mc.lineTo(bx1 - ins - step, by0 + ins);
          mc.lineTo(bx1 - ins - step, by0 + ins + step);
          mc.lineTo(bx1 - ins, by0 + ins + step);
          mc.lineTo(bx1 - ins, by1 - ins - step);
          mc.lineTo(bx1 - ins - step, by1 - ins - step);
          mc.lineTo(bx1 - ins - step, by1 - ins);
          mc.lineTo(bx0 + ins + step, by1 - ins);
          mc.lineTo(bx0 + ins + step, by1 - ins - step);
          mc.lineTo(bx0 + ins, by1 - ins - step);
          mc.lineTo(bx0 + ins, by0 + ins + step);
          mc.lineTo(bx0 + ins + step, by0 + ins + step);
          mc.closePath();
          mc.stroke();
        };
        rule(0, Math.max(2, w * 0.007), w * 0.03);
        rule(w * 0.017, Math.max(1, w * 0.0028), w * 0.03);
        mc.globalCompositeOperation = 'source-atop';
        mc.drawImage(blotch(kit, PW, PH, 90, 22, [150, 132, 100], 0.2, 0.52), 0, 0, PW, PH);
        mc.globalCompositeOperation = 'destination-out';
        const r = kit.rng(3);
        for (let i = 0; i < 260; i++) {
          mc.beginPath();
          mc.arc(r() * PW, r() * PH, 0.3 + r() * r() * 1.5, 0, TAU);
          mc.fill();
        }
        mc.globalCompositeOperation = 'source-over';
        c.drawImage(mark.canvas, 0, 0, PW, PH);
        kit.drawF(tint.g, tcx, tcy, s, { fill: 'rgba(0,0,0,0)', headFill: F.teal });
        c.save();
        c.globalCompositeOperation = 'destination-out';
        c.fillRect(tcx - (F.box.x + F.box.w / 2) * s + (F.head.x - 1) * s, tcy - (F.box.y + F.box.h / 2) * s + F.head.y * s, (F.head.w + 2) * s, F.head.h * s);
        c.restore();
        c.globalCompositeOperation = 'destination-over';
        c.fillStyle = '#0d0c0a';
        c.fillRect(0, 0, PW, PH);
        c.globalCompositeOperation = 'source-over';
      }
      const grain = kit.grainTile(256, 0.2, 11);

      const F2 = 11, FPOP = 35, F1 = 37, FBURN = 45, FWHITE = 57, FROLL = 59, FCATCH = 66, FEND = 89;
      const SWEEP1 = [0.04, 0.09, 0.13, 0.15, 0.165, 0.172, 0.172];
      const WY = { 39: 7, 40: -4, 41: 14, 42: 6, 43: 30, 44: 26 };
      const bar = h * 0.07, P = h + bar;

      function leader(f) {
        const jam = f >= 43;
        const amp = jam ? 0 : 1;
        const wx = jam ? 2 : (hash(f, 41) - 0.5) * 3.2 * amp + Math.sin(f * 0.37) * 1.1 * amp;
        let wy = (hash(f, 42) - 0.5) * 4.4 * amp + Math.sin(f * 0.23 + 1) * 1.5 * amp;
        if (f === 23) wy -= 9;
        if (f === 24) wy += 3;
        if (WY[f] !== undefined) wy = WY[f];
        if (f >= 45) wy = 28;
        const px = wx - M, py = wy - M;
        const d = f < F2 ? 3 : f < FPOP + 2 ? 2 : 1;
        const rev = f < F2 ? (f + 13) / 24 : f < FPOP ? (f - F2) / 24 : f < F1 ? 1 : SWEEP1[Math.min(f - F1, 6)];
        g.fillStyle = '#000';
        g.fillRect(0, 0, w, h);
        g.drawImage(field.canvas, px, py, PW, PH);
        const ax = px + cx, ay = py + cy;
        g.fillStyle = 'rgba(16,14,10,.66)';
        g.beginPath();
        g.moveTo(ax, ay);
        g.arc(ax, ay, Math.hypot(w, h), -Math.PI / 2, -Math.PI / 2 + rev * TAU);
        g.closePath();
        g.fill();
        g.drawImage(inks[d].canvas, px, py, PW, PH);
        g.strokeStyle = 'rgba(250,247,235,.95)';
        g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(ax, ay);
        const ha = -Math.PI / 2 + rev * TAU;
        g.lineTo(ax + Math.cos(ha) * Math.hypot(w, h), ay + Math.sin(ha) * Math.hypot(w, h));
        g.stroke();
        if (f === 23) {
          g.fillStyle = 'rgba(240,236,222,.55)';
          g.fillRect(px, py + M + h * 0.62, PW, 5);
        }
        if (f === FPOP) g.drawImage(punch.canvas, px, py, PW, PH);
        if (f < FBURN) {
          scratches(g, kit, f, w, h, 5, 1);
          specks(g, kit, f, w, h, 34, 0.45);
          hairs(g, kit, f, w, h, 2);
        } else {
          scratches(g, kit, 44, w, h, 5, 1);
          specks(g, kit, 44, w, h, 34, 0.45);
        }
        g.fillStyle = 'rgba(0,0,0,' + (0.02 + hash(jam ? 44 : f, 12) * 0.13) + ')';
        g.fillRect(0, 0, w, h);
      }

      function titleAt(y, wx, tintShift) {
        for (let n = -1; n <= 1; n++) {
          const yy = y + n * P - M;
          if (yy > h || yy + PH < 0) continue;
          g.drawImage(title.canvas, wx - M, yy, PW, PH);
          g.drawImage(tint.canvas, wx - M + tintShift, yy, PW, PH);
          g.fillStyle = '#000';
          g.fillRect(0, yy + M + h, w, bar);
        }
      }

      let shown = -1;
      return function seek(t) {
        const f = Math.min(kit.frame(t, 24), FEND);
        // Every picture here depends on the film frame alone, so if the canvas already holds this frame there is nothing to do.
        if (f === shown) return;
        shown = f;
        if (f < FROLL) {
          if (f === FPOP + 1) {
            g.fillStyle = '#fffef4';
            g.fillRect(0, 0, w, h);
            g.globalAlpha = 0.2;
            g.drawImage(inks[2].canvas, -M, -M, PW, PH);
            g.globalAlpha = 1;
          } else if (f >= FWHITE) {
            g.fillStyle = '#fffdf2';
            g.fillRect(0, 0, w, h);
          } else {
            leader(f);
            if (f >= FBURN) g.drawImage(burn[Math.min(f - FBURN, 11)], 0, 0, w, h);
          }
        } else {
          // The projectionist restarts it. Frames roll through out of rack, the claw catches, the jolt, then the weave dies down.
          const p = clamp((f - FROLL) / (FCATCH - FROLL));
          const q = f < FCATCH ? -P * 1.75 * Math.pow(1 - p, 1.45) : f === FCATCH ? 13 : f === FCATCH + 1 ? -7 : f === FCATCH + 2 ? 3 : 0;
          const e = clamp((f - FCATCH) / (FEND - FCATCH));
          const ampW = f < FCATCH ? 1 : lerp(3.4, 0, 1 - Math.pow(1 - e, 2.2));
          const wx = (hash(f, 41) - 0.5) * 2 * ampW * 0.75;
          const wy = (hash(f, 42) - 0.5) * 2 * ampW + Math.sin(f * 0.31) * ampW * 0.5;
          g.fillStyle = '#000';
          g.fillRect(0, 0, w, h);
          titleAt(q + wy, wx, (hash(f, 48) - 0.5) * lerp(2.4, 0.5, e));
          if (f < FCATCH) {
            // Travel ghost: the shutter is out of phase, so the bright logo smears along the direction the film moves.
            const sm = (P * 1.75 * 1.45 * Math.pow(1 - p, 0.45)) / (FCATCH - FROLL);
            g.globalCompositeOperation = 'lighter';
            g.globalAlpha = 0.24;
            titleAt(q + wy - sm * 0.33, wx, 0);
            titleAt(q + wy - sm * 0.66, wx, 0);
            g.globalAlpha = 1;
            g.globalCompositeOperation = 'source-over';
          }
          const fade = 1 - e * 0.72;
          scratches(g, kit, f, w, h, f < FCATCH + 6 ? 4 : 2, fade);
          specks(g, kit, f, w, h, Math.round(lerp(26, 5, e)), 0.92, 2.4);
          if (e < 0.5) hairs(g, kit, f, w, h, 1);
          g.fillStyle = 'rgba(0,0,0,' + (hash(f, 12) * lerp(0.22, 0.03, e)) + ')';
          g.fillRect(0, 0, w, h);
        }
        kit.grain(g, grain, f, f >= FWHITE && f < FROLL ? 0.2 : 0.55);
        if (!(f === FPOP + 1) && !(f >= FWHITE && f < FROLL)) g.drawImage(vig.canvas, 0, 0, w, h);
        g.drawImage(gate.canvas, 0, 0, w, h);
        if (f < FWHITE) {
          // A hair caught in the gate, quivering from the lamp house draught. It does not weave, because it is on the plate.
          const hx = w * 0.14, hy = h - Math.max(5, w * 0.016);
          const q = f >= 45 ? 0 : Math.sin(f * 1.9) * 3;
          g.strokeStyle = 'rgba(6,5,4,.92)';
          g.lineWidth = 1.3;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(hx, hy);
          g.bezierCurveTo(hx + 10 + q, hy - h * 0.05, hx - 16 - q, hy - h * 0.09, hx + 26 + q * 1.8, hy - h * 0.125);
          g.stroke();
        }
      };
    },
  });

  // ------------------------------------------------------------------------------------------------------------------
  // (b) Extreme close-up on a light table. 16mm whips through and stops dead on pins. The frame there has the logo put
  // together wrong, so it gets a grease pencil X, a razor takes it off, the right piece drops in, clear tape goes over
  // the join, the press comes down, and a strip of camera tape labels it.
  // ------------------------------------------------------------------------------------------------------------------
  FMI.add({
    id: 'film-splice',
    lane: LANE,
    name: 'The splice',
    blurb: 'A strip of 16mm whips past and stops dead on a frame of the logo assembled wrong, which gets crossed out and razored off so the right frame can be taped in.',
    dur: 3.0,
    ground: '#efe9da',
    make(stage, kit) {
      const { w, h, clamp, lerp, F } = kit;
      const g = kit.canvas({ alpha: false });
      const res = Math.min(kit.dpr, 1.5);
      const fw = Math.round(w * 0.8), fx = Math.round((w - fw) / 2);
      const perfCol = fw * 0.14, trackCol = fw * 0.11;
      const frW = fw - perfCol - trackCol, frH = Math.round(frW * 0.74), gap = Math.max(3, Math.round(fw * 0.012));
      const pitch = frH + gap;
      const cyL = Math.round(h * 0.4);
      const joinY = cyL + pitch / 2;
      const N = Math.ceil(h / pitch) + 3, TH = N * pitch, KBAD = 2;
      const y0Stop = cyL - pitch / 2 - KBAD * pitch;
      const LS = (frH * 0.84) / F.box.h;
      const tcl = F.teal;

      // The light table: frosted acrylic, uneven, a little dust, falling off toward the edges.
      const table = lay(w, h, Math.min(kit.dpr, 1));
      {
        const c = table.g;
        c.fillStyle = '#f4efe2';
        c.fillRect(0, 0, w, h);
        c.drawImage(blotch(kit, w, h, 180, 51, [196, 182, 150], 0.34, 0.45), 0, 0, w, h);
        c.drawImage(blotch(kit, w, h, 30, 52, [255, 255, 250], 0.24, 0.5), 0, 0, w, h);
        const r = kit.rng(53);
        for (let i = 0; i < 90; i++) {
          c.fillStyle = 'rgba(70,58,40,' + (0.1 + r() * 0.3) + ')';
          c.beginPath();
          c.arc(r() * w, r() * h, 0.3 + r() * 0.8, 0, TAU);
          c.fill();
        }
        const gr = c.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, 'rgba(92,76,50,.34)');
        gr.addColorStop(0.09, 'rgba(92,76,50,0)');
        gr.addColorStop(0.91, 'rgba(92,76,50,0)');
        gr.addColorStop(1, 'rgba(92,76,50,.34)');
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
      }

      // Shots on the reel: the film carries real pictures, drawn small and scaled up so they go soft, with grain on top.
      const blot = blotch(kit, frW * 2, frH * 2, 34, 54, [255, 252, 240], 0.5, 0.5);
      const shotLay = lay(frW, frH, 0.36);
      const shotGrain = kit.grainTile(128, 0.13, 57);
      function shotFrame(c, kind, i, x, y) {
        shot(shotLay.g, kind, i, 0, 0, frW, frH);
        c.save();
        c.beginPath();
        c.roundRect(x + 0.5, y + 0.5, frW - 1, frH - 1, 5);
        c.clip();
        c.drawImage(shotLay.canvas, x, y, frW, frH);
        const ox2 = -kit.hash(i, 58) * 128, oy2 = -kit.hash(i, 59) * 128;
        for (let qy = oy2; qy < frH; qy += 128) for (let qx = ox2; qx < frW; qx += 128) c.drawImage(shotGrain, x + qx, y + qy);
        c.restore();
      }
      function shot(c, kind, i, x, y, W, H) {
        c.save();
        c.beginPath();
        c.rect(x, y, W, H);
        c.clip();
        if (kind === 2) {
          // High key: pale sea, a jetty running out, one figure at the end.
          const sky = c.createLinearGradient(0, y, 0, y + H);
          sky.addColorStop(0, '#ece8da');
          sky.addColorStop(0.52, '#f7f3e6');
          sky.addColorStop(0.53, '#a9a698');
          sky.addColorStop(1, '#ded9c9');
          c.fillStyle = sky;
          c.fillRect(x, y, W, H);
          c.fillStyle = '#1b1914';
          c.beginPath();
          c.moveTo(x + W * 0.1, y + H);
          c.lineTo(x + W * (0.56 + i * 0.002), y + H * 0.54);
          c.lineTo(x + W * (0.6 + i * 0.002), y + H * 0.54);
          c.lineTo(x + W * 0.5, y + H);
          c.fill();
          c.fillRect(x + W * 0.572, y + H * 0.44, H * 0.028, H * 0.1);
        } else if (kind === 3) {
          // Low key: night street, kerb lines running to a vanishing point, a few lamps.
          c.fillStyle = '#0e0d0a';
          c.fillRect(x, y, W, H);
          c.strokeStyle = '#8f8b7c';
          c.lineWidth = 2.4;
          const vx = x + W * 0.6, vy = y + H * 0.42;
          c.beginPath();
          c.moveTo(vx, vy); c.lineTo(x, y + H * 0.92);
          c.moveTo(vx, vy); c.lineTo(x + W * 0.8, y + H);
          c.stroke();
          c.fillStyle = '#efe9d6';
          for (let q = 0; q < 5; q++) {
            const pz = 0.12 + q * q * 0.05 + (i % 3) * 0.012;
            c.beginPath();
            c.arc(lerp(vx, x + W * 1.1, pz), lerp(vy, y - H * 0.25, pz), 2 + pz * 14, 0, TAU);
            c.fill();
          }
        } else if (kind === 0) {
          const sky = c.createLinearGradient(0, y, 0, y + H * 0.66);
          sky.addColorStop(0, '#6d6a60');
          sky.addColorStop(1, '#ded9c8');
          c.fillStyle = sky;
          c.fillRect(x, y, W, H);
          c.globalAlpha = 0.5;
          c.drawImage(blot, x - i * 7, y - H * 0.2, W * 1.3, H * 0.9);
          c.globalAlpha = 1;
          c.fillStyle = '#5a574d';
          c.beginPath();
          c.moveTo(x, y + H * 0.62);
          for (let q = 0; q <= 8; q++) c.lineTo(x + (W * q) / 8, y + H * (0.6 - 0.05 * Math.sin(q * 1.4 + 1)) + 2);
          c.lineTo(x + W, y + H); c.lineTo(x, y + H);
          c.fill();
          c.fillStyle = '#16140f';
          c.beginPath();
          c.moveTo(x, y + H * 0.76);
          c.quadraticCurveTo(x + W * 0.5, y + H * 0.62, x + W, y + H * 0.8);
          c.lineTo(x + W, y + H); c.lineTo(x, y + H);
          c.fill();
          for (let p = 0; p < 4; p++) {
            const px = x + W * (0.12 + p * 0.3) - i * 9;
            c.fillRect(px, y + H * 0.34, 1.6, H * 0.36);
            c.fillRect(px - 6, y + H * 0.37, 13, 1.3);
          }
          const fx2 = x + W * (0.4 + i * 0.022), fy2 = y + H * 0.66;
          c.beginPath(); c.arc(fx2, fy2 - H * 0.135, H * 0.024, 0, TAU); c.fill();
          c.fillRect(fx2 - H * 0.02, fy2 - H * 0.11, H * 0.04, H * 0.075);
          c.save();
          c.lineWidth = H * 0.016;
          c.strokeStyle = '#16140f';
          c.beginPath();
          c.moveTo(fx2, fy2 - H * 0.04); c.lineTo(fx2 + (i % 2 ? 4 : -4), fy2 + H * 0.025);
          c.moveTo(fx2, fy2 - H * 0.04); c.lineTo(fx2 + (i % 2 ? -5 : 5), fy2 + H * 0.025);
          c.stroke();
          c.restore();
        } else {
          c.fillStyle = '#1a1713';
          c.fillRect(x, y, W, H);
          const wx = x + W * (0.14 + i * 0.012), wy = y + H * 0.14, ww = W * 0.34, wh = H * 0.6;
          c.fillStyle = '#ece6d4';
          c.fillRect(wx, wy, ww, wh);
          c.fillStyle = '#1a1713';
          c.fillRect(wx + ww * 0.47, wy, ww * 0.06, wh);
          c.fillRect(wx, wy + wh * 0.47, ww, wh * 0.06);
          c.globalAlpha = 0.4;
          c.fillStyle = '#ece6d4';
          c.beginPath();
          c.moveTo(wx + ww, wy); c.lineTo(x + W, y + H * 0.5); c.lineTo(x + W, y + H); c.lineTo(wx + ww * 0.6, y + H); c.lineTo(wx, wy + wh);
          c.fill();
          c.globalAlpha = 1;
          c.fillStyle = '#0a0806';
          c.beginPath(); c.arc(x + W * 0.66, y + H * 0.42, H * 0.13, 0, TAU); c.fill();
          c.beginPath(); c.ellipse(x + W * 0.66, y + H * 0.96, H * 0.27, H * 0.42, 0, 0, TAU); c.fill();
        }
        c.restore();
      }

      // A logo in a frame: clear film where the clips are (the table shines through), dye for the playhead.
      function clipF(c, ox, oy, sc, rows, headAt, tilt) {
        c.save();
        c.globalCompositeOperation = 'destination-out';
        for (const q of rows) {
          c.beginPath();
          c.roundRect(ox + q[0] * sc, oy + q[1] * sc, q[2] * sc, 22 * sc, 5 * sc);
          c.fill();
        }
        c.restore();
        if (headAt === null) return;
        const hd = F.head;
        c.save();
        c.translate(ox + (headAt + 1.5) * sc, oy + 60 * sc);
        c.rotate(tilt || 0);
        c.fillStyle = tcl;
        c.beginPath();
        c.roundRect(-1.5 * sc, (hd.y - 60) * sc, hd.w * sc, hd.h * sc, 1.5 * sc);
        c.fill();
        c.beginPath();
        c.moveTo((hd.tri[0][0] - hd.x - 1.5) * sc, (hd.tri[0][1] - 60) * sc);
        c.lineTo((hd.tri[1][0] - hd.x - 1.5) * sc, (hd.tri[1][1] - 60) * sc);
        c.lineTo((hd.tri[2][0] - hd.x - 1.5) * sc, (hd.tri[2][1] - 60) * sc);
        c.fill();
        c.restore();
      }

      function filmStrip(H, frames) {
        const T = lay(fw, H, res), c = T.g, r = kit.rng(61);
        c.fillStyle = '#080705';
        c.fillRect(0, 0, fw, H);
        c.fillStyle = '#54401f';
        c.fillRect(0, 0, 1.6, H);
        c.fillRect(fw - 1.6, 0, 1.6, H);
        const count = Math.round(H / pitch);
        for (let i = 0; i < count; i++) {
          const x = perfCol, y = i * pitch + gap / 2;
          c.fillStyle = '#1b1814';
          c.beginPath();
          c.roundRect(x, y, frW, frH, 5);
          c.fill();
          frames(c, i, x, y);
        }
        // Scratches and dust that travel with the film.
        for (let i = 0; i < 16; i++) {
          c.fillStyle = 'rgba(245,240,226,' + (0.05 + r() * 0.16) + ')';
          c.fillRect(perfCol + r() * frW, r() * H, 0.6 + r() * 0.7, H * (0.1 + r() * 0.5));
        }
        for (let i = 0; i < count * 40; i++) {
          c.fillStyle = 'rgba(245,240,226,' + (0.25 + r() * 0.6) + ')';
          c.beginPath();
          c.arc(r() * fw, r() * H, 0.25 + r() * r() * 1.1, 0, TAU);
          c.fill();
        }
        // The optical track: a bright variable-area waveform running down the far edge.
        const tx = fw - trackCol * 0.5, n = makeNoise(kit, 62 + H);
        c.save();
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = '#000';
        c.beginPath();
        for (let y = 0; y <= H; y += 2) {
          const a = trackCol * 0.31 * (0.14 + 0.86 * Math.pow(fbm(n, 0, y / 7, 3), 1.6) * 1.8);
          if (y) c.lineTo(tx - Math.min(a, trackCol * 0.34), y); else c.moveTo(tx - a, y);
        }
        for (let y = H; y >= 0; y -= 2) {
          const a = trackCol * 0.31 * (0.14 + 0.86 * Math.pow(fbm(n, 0, y / 7, 3), 1.6) * 1.8);
          c.lineTo(tx + Math.min(a, trackCol * 0.34), y);
        }
        c.closePath();
        c.fill();
        c.restore();
        // Edge print between the perforations.
        c.font = '700 ' + Math.max(6.5, fw * 0.021) + 'px "Courier Prime"';
        c.textAlign = 'center';
        c.fillStyle = '#c7a55c';
        for (let i = 0; i <= count; i++) {
          c.save();
          c.translate(perfCol * 0.46, i * pitch + pitch / 2);
          c.rotate(-Math.PI / 2);
          c.fillText(i % 2 ? 'SAFETY FILM' : 'FM 1138 ' + (40 + i), 0, 3);
          c.restore();
        }
        // Perforations: one to a frame, on the frame line, punched right through.
        const pw = perfCol * 0.58, ph = perfCol * 0.38, px = perfCol * 0.46 - pw / 2;
        for (let i = 0; i <= count; i++) {
          const py = i * pitch - ph / 2;
          c.save();
          c.globalCompositeOperation = 'destination-out';
          c.beginPath();
          c.roundRect(px, py, pw, ph, ph * 0.26);
          c.fill();
          c.restore();
          c.strokeStyle = 'rgba(92,70,36,.9)';
          c.lineWidth = 1;
          c.beginPath();
          c.roundRect(px - 0.5, py - 0.5, pw + 1, ph + 1, ph * 0.26);
          c.stroke();
        }
        return T;
      }

      const WRONG = [[14, 20, 26], [14, 49, 92], [14, 78, 62]];
      const logoX = (x) => x + frW / 2 - (F.box.x + F.box.w / 2) * LS;
      const logoY = (y) => y + frH / 2 - (F.box.y + F.box.h / 2) * LS;
      const reel = filmStrip(TH, (c, i, x, y) => {
        if (i <= KBAD) {
          clipF(c, logoX(x), logoY(y), LS, WRONG, 58 + (KBAD - i) * 9, 0.09);
        } else {
          shotFrame(c, i % 7 < 4 ? 0 : 1, i, x, y);
        }
      });
      // The film smeared along its length, for the whip. It sits on table colour so the average is right.
      function smear(src, H2) {
        const S = lay(fw, H2, Math.min(res, 1)), c = S.g, M2 = 16;
        c.fillStyle = '#f4efe2';
        c.fillRect(0, 0, fw, H2);
        for (let i = 0; i < M2; i++) {
          const dy = (i / M2) * pitch * 0.92;
          c.globalAlpha = 1 / (i + 1);
          c.drawImage(src.canvas, 0, dy, fw, H2);
          c.drawImage(src.canvas, 0, dy - H2, fw, H2);
        }
        c.globalAlpha = 1;
        return S;
      }
      const reelBlur = smear(reel, TH);
      // The reel going past before it slows: a longer run of shots with big changes of tone, and no logo in it.
      const RUNH = pitch * 16;
      const runOrder = [2, 2, 2, 3, 3, 0, 0, 2, 1, 1, 3, 3, 3, 2, 0, 1];
      const run = filmStrip(RUNH, (c, i, x, y) => shotFrame(c, runOrder[i % 16], i, x, y));
      const runBlur = smear(run, RUNH);
      // The right piece: black leader, and the finished logo as its one and only picture, at the bottom end.
      const MN = Math.ceil(joinY / pitch) + 2, freshH = MN * pitch;
      const fresh = filmStrip(freshH, (c, i, x, y) => {
        const up = MN - 1 - i;
        const rows = F.clips.map((q) => [q.x, q.y, q.w]);
        if (up === 0) clipF(c, logoX(x), logoY(y), LS, rows, F.head.x, 0);
      });

      // The single-edge razor: folded spine, brushed body, ground edge, stamped and punched.
      const RW = w * 0.82, RH = RW * 0.34;
      const razor = lay(RW, RH, Math.min(kit.dpr, 2));
      {
        const c = razor.g, spine = RH * 0.24, bevel = RH * 0.15;
        const gr = c.createLinearGradient(0, 0, RW, RH * 0.7);
        gr.addColorStop(0, '#d5d8d9');
        gr.addColorStop(0.22, '#a2a7aa');
        gr.addColorStop(0.42, '#f0f2f2');
        gr.addColorStop(0.55, '#b4b8ba');
        gr.addColorStop(0.8, '#868b8e');
        gr.addColorStop(1, '#cfd2d3');
        c.fillStyle = gr;
        c.beginPath();
        c.moveTo(RW * 0.014, spine * 0.5);
        c.lineTo(RW * 0.986, spine * 0.5);
        c.lineTo(RW, RH);
        c.lineTo(0, RH);
        c.closePath();
        c.fill();
        c.save();
        c.clip();
        const r = kit.rng(71);
        for (let i = 0; i < 160; i++) {
          c.fillStyle = (r() < 0.5 ? 'rgba(255,255,255,' : 'rgba(30,34,38,') + (0.03 + r() * 0.08) + ')';
          c.fillRect(0, spine + r() * (RH - spine), RW, 0.5 + r() * 0.5);
        }
        const by = RH - bevel;
        const bg = c.createLinearGradient(0, by, RW, RH);
        bg.addColorStop(0, '#f7f8f8');
        bg.addColorStop(0.5, '#c6cacb');
        bg.addColorStop(1, '#fbfcfc');
        c.fillStyle = bg;
        c.fillRect(0, by, RW, bevel);
        c.fillStyle = 'rgba(40,44,48,.55)';
        c.fillRect(0, by - 0.6, RW, 1.2);
        for (let i = 0; i < 260; i++) {
          c.fillStyle = 'rgba(70,74,78,' + (0.05 + r() * 0.12) + ')';
          const qx = r() * RW;
          c.fillRect(qx, by + 1, 0.7, bevel - 1);
        }
        c.fillStyle = '#ffffff';
        c.fillRect(0, RH - 1.1, RW, 1.1);
        c.restore();
        const sg = c.createLinearGradient(0, 0, 0, spine);
        sg.addColorStop(0, '#5c6063');
        sg.addColorStop(0.3, '#c9cdcf');
        sg.addColorStop(0.55, '#8e9295');
        sg.addColorStop(1, '#2e3134');
        c.fillStyle = sg;
        c.fillRect(0, 0, RW, spine);
        c.fillStyle = 'rgba(0,0,0,.42)';
        c.fillRect(0, spine, RW, 2.4);
        c.font = '700 ' + Math.round(RH * 0.105) + 'px "Courier Prime"';
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        const ty = spine + (RH - spine - bevel) * 0.5;
        c.fillStyle = 'rgba(255,255,255,.7)';
        c.fillText('STAINLESS', RW * 0.56, ty + 0.8);
        c.fillStyle = 'rgba(32,36,40,.84)';
        c.fillText('STAINLESS', RW * 0.56, ty);
        c.fillStyle = 'rgba(255,255,255,.7)';
        c.fillText('.009 IN', RW * 0.07, ty + 0.8);
        c.fillStyle = 'rgba(32,36,40,.84)';
        c.fillText('.009 IN', RW * 0.07, ty);
        c.save();
        c.globalCompositeOperation = 'destination-out';
        c.beginPath();
        c.roundRect(RW * 0.38, ty - RH * 0.1, RW * 0.14, RH * 0.2, RH * 0.1);
        c.fill();
        c.restore();
        c.strokeStyle = 'rgba(30,34,38,.7)';
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(RW * 0.38, ty - RH * 0.1, RW * 0.14, RH * 0.2, RH * 0.1);
        c.stroke();
      }

      // Clear splicing tape. The loose version has trapped air; the pressed one is flat with one tiny bubble left.
      const TW = fw + 14, TH2 = Math.max(30, pitch * 0.27);
      function tape(loose) {
        const T = lay(TW, TH2, Math.min(kit.dpr, 2)), c = T.g, r = kit.rng(loose ? 81 : 82);
        c.fillStyle = loose ? 'rgba(255,248,226,.13)' : 'rgba(255,248,226,.075)';
        c.fillRect(0, 0, TW, TH2);
        const sh = c.createLinearGradient(0, 0, TW, TH2 * 1.5);
        const a = loose ? 0.42 : 0.18;
        sh.addColorStop(0.08, 'rgba(255,255,255,0)');
        sh.addColorStop(0.18, 'rgba(255,255,255,' + a + ')');
        sh.addColorStop(0.27, 'rgba(255,255,255,0)');
        sh.addColorStop(0.58, 'rgba(255,255,255,0)');
        sh.addColorStop(0.64, 'rgba(255,255,255,' + a * 0.7 + ')');
        sh.addColorStop(0.71, 'rgba(255,255,255,0)');
        c.fillStyle = sh;
        c.fillRect(0, 0, TW, TH2);
        c.fillStyle = 'rgba(255,255,255,.62)';
        c.fillRect(0, 0, TW, 1);
        c.fillRect(0, TH2 - 1, TW, 1);
        c.fillStyle = 'rgba(30,24,14,.36)';
        c.fillRect(0, 1, TW, 0.8);
        c.fillRect(0, TH2 - 1.8, TW, 0.8);
        const bubbles = loose ? 11 : 1;
        for (let i = 0; i < bubbles; i++) {
          const bx = (loose ? 30 + r() * (TW - 60) : TW * 0.8), by = TH2 * (0.2 + r() * 0.6), br = (loose ? 2 + r() * 6 : 1.8);
          const ex = br * (1 + r() * 0.8), rot = r() * 2;
          c.beginPath();
          c.ellipse(bx, by, ex, br, rot, 0, TAU);
          c.fillStyle = 'rgba(255,255,255,.09)';
          c.fill();
          c.lineWidth = 0.7;
          c.strokeStyle = 'rgba(20,16,8,.4)';
          c.stroke();
          c.beginPath();
          c.ellipse(bx, by, ex * 0.8, br * 0.8, rot, Math.PI * 0.9, Math.PI * 1.7);
          c.lineWidth = 1;
          c.strokeStyle = 'rgba(255,255,255,.66)';
          c.stroke();
        }
        return T;
      }
      const tapeLoose = tape(true), tapeFlat = tape(false);

      // The hinged press: anodised plate, rubber pad, two screws.
      const SW = w + 30, SH = TH2 * 3;
      const slab = lay(SW, SH, Math.min(kit.dpr, 1.5));
      {
        const c = slab.g;
        const gr = c.createLinearGradient(0, 0, 0, SH);
        gr.addColorStop(0, '#54575a');
        gr.addColorStop(0.08, '#393b3e');
        gr.addColorStop(0.92, '#26282a');
        gr.addColorStop(1, '#141516');
        c.fillStyle = gr;
        c.fillRect(0, 0, SW, SH);
        const r = kit.rng(91);
        for (let i = 0; i < 90; i++) {
          c.fillStyle = 'rgba(255,255,255,' + (0.012 + r() * 0.03) + ')';
          c.fillRect(0, r() * SH, SW, 0.6);
        }
        c.fillStyle = 'rgba(0,0,0,.5)';
        c.fillRect(0, SH * 0.3, SW, 1.2);
        c.fillStyle = 'rgba(255,255,255,.08)';
        c.fillRect(0, SH * 0.3 + 1.2, SW, 1);
        c.fillStyle = 'rgba(0,0,0,.5)';
        c.fillRect(0, SH * 0.7, SW, 1.2);
        c.fillStyle = 'rgba(255,255,255,.08)';
        c.fillRect(0, SH * 0.7 + 1.2, SW, 1);
        c.font = '700 ' + Math.round(SH * 0.13) + 'px "Courier Prime"';
        c.fillStyle = 'rgba(214,214,206,.68)';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('PRESS', SW / 2, SH / 2);
        for (const q of [0.1, 0.9]) {
          const sx = SW * q, sy = SH / 2, sr = SH * 0.12;
          c.fillStyle = '#7d8083';
          c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
          c.fillStyle = '#17181a';
          c.beginPath(); c.arc(sx, sy, sr * 0.8, 0, TAU); c.fill();
          c.save();
          c.translate(sx, sy);
          c.rotate(q * 7);
          c.fillStyle = '#6a6d70';
          c.fillRect(-sr * 0.55, -sr * 0.11, sr * 1.1, sr * 0.22);
          c.restore();
        }
      }

      // White camera tape with the name in marker, torn at both ends.
      const CAM = (w + 2) / fw;
      const LW = w * 0.66, LH = LW * 0.215;
      const label = lay(LW, LH, Math.min(kit.dpr, 2));
      {
        const c = label.g, r = kit.rng(97), tear = LW * 0.02;
        c.beginPath();
        c.moveTo(tear, 0);
        c.lineTo(LW - tear, 0);
        for (let y = 0; y <= LH; y += LH / 9) c.lineTo(LW - tear * (0.2 + r() * 1.2), y);
        c.lineTo(tear, LH);
        for (let y = LH; y >= 0; y -= LH / 9) c.lineTo(tear * (0.2 + r() * 1.2), y);
        c.closePath();
        c.fillStyle = '#f2eedf';
        c.fill();
        c.save();
        c.clip();
        for (let i = 0; i < LH; i += 2) {
          c.fillStyle = 'rgba(120,108,84,.09)';
          c.fillRect(0, i, LW, 0.7);
        }
        for (let i = 0; i < LW; i += 2.4) {
          c.fillStyle = 'rgba(120,108,84,.07)';
          c.fillRect(i, 0, 0.7, LH);
        }
        c.fillStyle = 'rgba(90,76,50,.16)';
        c.fillRect(0, LH - 2, LW, 2);
        c.restore();
        let px = Math.round(LH * 0.66);
        c.font = '400 ' + px + 'px "Permanent Marker"';
        const mw = c.measureText('FreeMotion').width;
        px = Math.floor(px * Math.min(1, (LW * 0.88) / mw));
        c.font = '400 ' + px + 'px "Permanent Marker"';
        c.fillStyle = '#121110';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('FreeMotion', LW / 2, LH * 0.53);
      }
      const labelY = joinY + TH2 / 2 + LH * 0.86;
      const heroX = fx + perfCol + frW / 2;

      // Brass register pins.
      const pinR = perfCol * 0.135;
      function pin(x, y, p) {
        const q = pinR * p;
        g.fillStyle = 'rgba(30,20,8,.5)';
        g.beginPath(); g.arc(x + 1.5, y + 2, q, 0, TAU); g.fill();
        const gr = g.createLinearGradient(x - q, y - q, x + q, y + q);
        gr.addColorStop(0, '#f2dd9c');
        gr.addColorStop(0.5, '#b58f3b');
        gr.addColorStop(1, '#5e4516');
        g.fillStyle = gr;
        g.beginPath(); g.arc(x, y, q, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,248,214,.7)';
        g.beginPath(); g.arc(x - q * 0.25, y - q * 0.25, q * 0.34, 0, TAU); g.fill();
      }

      // Times.
      const tB = 0.42, tS = 0.58, V = 5200, D = (V * (tS - tB)) / 1.6;
      const X1a = 0.76, X1b = 0.84, X2a = 0.88, X2b = 0.96;
      const Rin = 1.0, Rhov = 1.12, Rback = 1.2, Rcut = 1.36;
      const tGap = 1.32, tYank = 1.44, tYankE = 1.56;
      const tFresh = 1.58, tLand = 1.72;
      const tTape = 1.8, tTapeE = 1.92;
      const tDown = 1.98, tHit = 2.08, tUp = 2.2, tOff = 2.3;
      const tLabel = 2.38, tLabelE = 2.5;

      function drawReel(y, sharpA, blurA, S1, S2, H2) {
        const a = S1 || reel, b = S2 || reelBlur, T2 = H2 || TH;
        const yy = ((y % T2) + T2) % T2;
        for (const q of [yy - T2, yy]) {
          if (q > h || q + T2 < 0) continue;
          if (blurA > 0) {
            g.globalAlpha = blurA;
            g.drawImage(b.canvas, fx, q, fw, T2);
          }
          if (sharpA > 0) {
            g.globalAlpha = sharpA;
            g.drawImage(a.canvas, fx, q, fw, T2);
          }
        }
        g.globalAlpha = 1;
      }
      function cross(t) {
        const x = fx + perfCol, y = cyL - frH / 2, W = frW, H = frH;
        const rough = (a, b, off) => {
          g.beginPath();
          g.moveTo(a[0] + off, a[1] - off);
          g.quadraticCurveTo((a[0] + b[0]) / 2 + 7, (a[1] + b[1]) / 2 - 6, b[0] + off, b[1] - off);
        };
        const strokeLine = (a, b, p) => {
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.03;
          g.strokeStyle = '#f7d531';
          g.lineCap = 'round';
          g.setLineDash([L * p, L * 2]);
          g.lineWidth = Math.max(4, frH * 0.03);
          rough(a, b, 0);
          g.stroke();
          g.lineWidth = 1.2;
          g.strokeStyle = 'rgba(255,240,150,.9)';
          rough(a, b, 2.2);
          g.stroke();
          g.strokeStyle = 'rgba(190,150,20,.9)';
          rough(a, b, -2.4);
          g.stroke();
          g.setLineDash([]);
        };
        const p1 = clamp((t - X1a) / (X1b - X1a)), p2 = clamp((t - X2a) / (X2b - X2a));
        if (p1 > 0) strokeLine([x + W * 0.05, y + H * 0.07], [x + W * 1.03, y + H * 0.96], p1);
        if (p2 > 0) strokeLine([x + W * 0.97, y + H * 0.04], [x - W * 0.02, y + H * 0.93], p2);
      }

      return function seek(t) {
        g.drawImage(table.canvas, 0, 0, w, h);
        // The jolts that travel through the table, in closed form from each hit.
        const jolt = (t0, amp, freq) => (t < t0 ? 0 : amp * Math.exp(-(t - t0) * 24) * Math.cos((t - t0) * freq));
        const sy = jolt(tS, 7, 70) + jolt(tLand, 2.5, 80) + jolt(tHit, 5, 90) + jolt(tLabelE, 2.5, 80);
        const sx = jolt(tS, 2, 50);
        g.save();
        g.translate(sx, sy);
        // A hard cut in, on the hit of the press: closer on the frame, the perforations against the left of the screen.
        if (t >= tHit) {
          g.translate(-1, h * 0.385);
          g.scale(CAM, CAM);
          g.translate(-fx, -cyL);
        }

        if (t < tS) {
          const p = t < tB ? -(D + V * (tB - t)) : -D * Math.pow(1 - (t - tB) / (tS - tB), 1.6);
          const speed = t < tB ? V : (V * Math.pow(1 - (t - tB) / (tS - tB), 0.6));
          const b = clamp(speed / 1500);
          if (t < tB) drawReel(y0Stop + p, 0, 1, run, runBlur, RUNH);
          else drawReel(y0Stop + p, 1 - b * b, b);
        } else {
          const rec = jolt(tS, 9, 62);
          const y0 = y0Stop + rec;
          // Lower piece: stays on its pin for the rest of the take.
          const bump = t < tLand ? 0 : 2 * Math.exp(-(t - tLand) * 18);
          g.save();
          g.beginPath();
          g.rect(0, joinY + rec + bump, w, h);
          g.clip();
          drawReel(y0 + bump, 1, 0);
          g.restore();
          pin(fx + perfCol * 0.46, joinY + rec + bump + pitch, clamp((t - tS) / 0.05));

          // Upper piece: holds, gets its X, is cut, and is pulled away.
          if (t < tYankE) {
            const open = t < tGap ? 0 : Math.min(1, (t - tGap) / 0.05) * 3;
            const yank = t < tYank ? 0 : -Math.pow((t - tYank) / (tYankE - tYank), 2.2) * (joinY + TH2 + pitch * 2);
            const rot = t < tYank ? 0 : Math.pow((t - tYank) / (tYankE - tYank), 2) * -0.1;
            g.save();
            g.translate(fx + fw, joinY);
            g.rotate(rot);
            g.translate(-(fx + fw), yank - joinY - open);
            g.save();
            g.beginPath();
            g.rect(-40, -h, w + 80, h + joinY + rec);
            g.clip();
            drawReel(y0, 1, 0);
            g.restore();
            if (t < tYank) pin(fx + perfCol * 0.46, joinY + rec - pitch, clamp((t - tS) / 0.05));
            cross(t);
            g.restore();
          }
          // The new piece drops onto the same pin and butts the cut, hard.
          if (t >= tFresh) {
            const q = clamp((t - tFresh) / (tLand - tFresh));
            const y = joinY - freshH - (1 - Math.pow(q, 2.1) * 1 ) * (joinY + 20);
            g.drawImage(fresh.canvas, fx, y, fw, freshH);
            if (q >= 1) pin(fx + perfCol * 0.46, joinY - pitch, 1);
            g.fillStyle = 'rgba(34,24,12,.55)';
            if (q >= 1) g.fillRect(fx, joinY + bump * 0.2 - 0.5, fw, 1);
          }

          // Tape: flicked in from the right, lands crooked, the press flattens and straightens it.
          if (t >= tTape) {
            const q = clamp((t - tTape) / (tTapeE - tTape));
            const landed = t >= tTapeE;
            const pressed = t >= tHit;
            const tx = lerp(w + TW * 0.55, w / 2, 1 - Math.pow(1 - q, 2.4));
            const rot = pressed ? 0 : lerp(0.16, 0.017, q);
            const lift = landed ? 0 : (1 - q) * 9;
            g.save();
            g.translate(tx + lift, joinY + lift);
            g.rotate(rot);
            if (!pressed) {
              g.fillStyle = 'rgba(34,24,10,.2)';
              g.fillRect(-TW / 2 + 1.5, -TH2 / 2 + 2 + lift * 0.6, TW, TH2);
            }
            g.drawImage((pressed ? tapeFlat : tapeLoose).canvas, -TW / 2, -TH2 / 2, TW, TH2);
            g.restore();
          }

          // The razor. Comes in over the frame, draws back a touch, then goes through in a third of a blink.
          if (t >= Rin && t < Rcut + 0.02) {
            const tipStart = fx + fw + 12;
            let tip;
            if (t < Rhov) tip = lerp(w + 30, tipStart - 6, 1 - Math.pow(1 - (t - Rin) / (Rhov - Rin), 3));
            else if (t < Rback) tip = lerp(tipStart - 6, tipStart + 16, Math.pow((t - Rhov) / (Rback - Rhov), 1.6));
            else tip = lerp(tipStart + 16, -RW - 40, Math.pow(clamp((t - Rback) / (Rcut - Rback)), 2.2));
            const hov = t < Rback ? 1 : 0;
            const ang = -0.085;
            const lift2 = hov * 7;
            const shx = 5 + hov * 8, shy = 6 + hov * 9;
            g.save();
            g.translate(tip + shx, joinY - lift2 + shy);
            g.rotate(ang);
            g.fillStyle = 'rgba(22,16,8,.32)';
            g.fillRect(0, -RH, RW, RH);
            g.restore();
            g.save();
            g.translate(tip, joinY - lift2);
            g.rotate(ang);
            g.drawImage(razor.canvas, 0, -RH, RW, RH);
            g.restore();
            if (t >= Rback) {
              g.fillStyle = 'rgba(255,250,235,.95)';
              g.fillRect(Math.max(tip, fx), joinY - 0.6, fx + fw - Math.max(tip, fx), 1.4);
            }
          }

          // The press swings over on its hinge at the right edge of the screen. Foreshortened while it falls.
          if (t >= tDown && t < tOff) {
            const q = t < tHit ? Math.pow((t - tDown) / (tHit - tDown), 2.6) : t < tUp ? 1 : 1 - Math.pow((t - tUp) / (tOff - tUp), 1.7);
            const sw = Math.max(0.04, q) * SW, left = w + 8 - sw;
            g.fillStyle = 'rgba(16,12,6,' + (0.28 + (1 - q) * 0.1) + ')';
            g.fillRect(left - (1 - q) * 46 - 6, joinY - SH / 2 + 7, sw + (1 - q) * 46 + 14, SH);
            g.drawImage(slab.canvas, left, joinY - SH / 2, sw, SH);
            g.fillStyle = 'rgba(0,0,0,' + (1 - q) * 0.62 + ')';
            g.fillRect(left, joinY - SH / 2, sw, SH);
          }

          // Camera tape, slapped on.
          if (t >= tLabel) {
            const q = clamp((t - tLabel) / (tLabelE - tLabel));
            const e = 1 - Math.pow(1 - q, 2.2);
            const lx = lerp(-LW * 0.8, heroX, e), ly = lerp(labelY + 74, labelY, e), rot = lerp(0.3, -0.042, e);
            const air = (1 - q) * 13;
            g.save();
            g.translate(lx + 2 + air, ly + 3 + air);
            g.rotate(rot);
            g.fillStyle = 'rgba(20,14,6,.34)';
            g.fillRect(-LW / 2 + LW * 0.01, -LH / 2, LW * 0.98, LH);
            g.restore();
            g.save();
            g.translate(lx, ly);
            g.rotate(rot);
            g.drawImage(label.canvas, -LW / 2, -LH / 2, LW, LH);
            g.restore();
          }
        }
        g.restore();
      };
    },
  });

  // ------------------------------------------------------------------------------------------------------------------
  // (c) A deck, on a PAL set. Blue with the OSD, a clunk, it rewinds: tape picture running backward with noise bands and
  // torn lines while the counter runs down. It hits zero, clunks, PLAY, the picture rolls and locks, auto tracking walks
  // the noise band down the frame until it sits under the picture as head-switching, and the logo plays forward.
  // ------------------------------------------------------------------------------------------------------------------
  FMI.add({
    id: 'film-deck',
    lane: LANE,
    name: 'Tape deck',
    blurb: 'A video deck on blue rewinds through old beach footage and colour bars with the picture tearing, the counter hits zero, it plays, tracks in, and the logo builds on tape.',
    dur: 3.7,
    ground: '#000',
    make(stage, kit) {
      const { w, h, hash, clamp, lerp, F, k } = kit;
      const g = kit.canvas({ alpha: false });
      const L = Math.round(h / 2), BW = Math.round(w * 0.46), rowH = h / L;
      const vc = document.createElement('canvas');
      vc.width = BW; vc.height = L;
      const v = vc.getContext('2d', { alpha: false });
      v.scale(BW / w, L / h);
      const BLUE = '#1a22b6';

      // The OSD font: a chunky 5x7 made bolder by doubling each stroke to the right, as the decks did.
      const GL = {
        0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
        1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
        2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
        3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
        4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
        5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
        6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
        7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
        8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
        9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
        ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
        A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
        C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
        E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
        G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
        I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
        K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
        L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
        N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
        O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
        P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
        R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
        S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
        T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
        U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
        W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
        Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
        '>': ['10000', '11000', '11100', '11110', '11100', '11000', '10000'],
        '<': ['00001', '00011', '00111', '01111', '00111', '00011', '00001'],
      };
      function atlas(ds) {
        const A = { ds, adv: 7 * ds, g: {} };
        Object.keys(GL).forEach((ch) => {
          const c = document.createElement('canvas');
          c.width = Math.ceil((7 * ds + ds) * Math.min(kit.dpr, 2));
          c.height = Math.ceil((8 * ds) * Math.min(kit.dpr, 2));
          const x = c.getContext('2d'), sc = Math.min(kit.dpr, 2);
          x.scale(sc, sc);
          const rows = GL[ch];
          const lit = (cx, cy) => {
            if (cy < 0 || cy > 6) return false;
            const s = rows[cy];
            return s[cx] === '1' || s[cx - 1] === '1';
          };
          x.fillStyle = '#08081a';
          for (let cy = -1; cy < 8; cy++) for (let cx = -1; cx < 8; cx++) {
            if (lit(cx - 1, cy - 1) || lit(cx, cy - 1) || lit(cx - 1, cy)) x.fillRect((cx + 0.5) * ds, (cy + 0.5) * ds, ds, ds);
          }
          x.fillStyle = '#f6f6ee';
          for (let cy = 0; cy < 7; cy++) for (let cx = 0; cx < 6; cx++) {
            if (lit(cx, cy)) x.fillRect((cx + 0.5) * ds, (cy + 0.5) * ds, ds, ds);
          }
          A.g[ch] = { c, W: c.width / sc, H: c.height / sc };
        });
        return A;
      }
      const bd = Math.max(4, Math.floor((w * 0.86) / 48)), sd = Math.max(3, Math.floor(w * 0.0105));
      const big = atlas(bd), small = atlas(sd);
      function osd(str, x, y, A) {
        let cx = x;
        for (let i = 0; i < str.length; i++) {
          const ch = str[i];
          if (ch !== ' ') {
            const q = A.g[ch];
            if (q) g.drawImage(q.c, cx, y, q.W, q.H);
            cx += A.adv;
          } else cx += A.adv * 0.72;
        }
      }
      const clock = (s) => {
        const S = Math.max(0, Math.round(s)), H = Math.floor(S / 3600), Mn = Math.floor(S / 60) % 60, Se = S % 60;
        return H + ':' + String(Mn).padStart(2, '0') + ':' + String(Se).padStart(2, '0');
      };
      const x0 = Math.round(w * 0.07), y0 = Math.round(Math.max(66, h * 0.085));
      const yBig = y0 + 8 * sd + Math.round(sd * 2.4);

      // Noise, the way a head crossing the wrong track makes it: short bright dashes, denser in the middle of the band.
      function bandSprite(seed) {
        const S = lay(300, 80, 1), c = S.g, r = kit.rng(seed);
        for (let y = 0; y < 80; y++) {
          const dens = Math.pow(Math.sin((y / 80) * Math.PI), 1.3);
          let x = -r() * 20;
          while (x < 300) {
            const run = 1 + r() * r() * 46, q = r();
            if (q < dens * 0.92) {
              const b = r();
              c.fillStyle = b < 0.72 ? 'rgba(240,240,236,' + (0.5 + r() * 0.5) + ')' : 'rgba(6,6,10,' + (0.6 + r() * 0.4) + ')';
              c.fillRect(x, y, run, 1);
            }
            x += run + r() * r() * 22 * (1.2 - dens);
          }
        }
        return S.canvas;
      }
      const bands = [bandSprite(1), bandSprite(2), bandSprite(3), bandSprite(4)];
      // Snow, and the fine chroma crawl that lies over every tape picture.
      function snowTile(seed, tw, th, alpha, colour) {
        const c = document.createElement('canvas');
        c.width = tw; c.height = th;
        const x = c.getContext('2d'), im = x.createImageData(tw, th), r = kit.rng(seed), d = im.data;
        for (let py = 0, i = 0; py < th; py++) {
          let run = 0, cr = 0, cg = 0, cb = 0, ca = 0;
          for (let px = 0; px < tw; px++, i += 4) {
            if (run-- <= 0) {
              run = 1 + r() * 3;
              const b = r() * 255;
              if (colour) {
                const q = r();
                cr = q < 0.33 ? 255 : b * 0.4; cg = q >= 0.33 && q < 0.66 ? 255 : b * 0.4; cb = q >= 0.66 ? 255 : b * 0.4;
                ca = r() * alpha * 255;
              } else {
                cr = cg = cb = b; ca = alpha * 255;
              }
            }
            d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = ca;
          }
        }
        x.putImageData(im, 0, 0);
        return c;
      }
      const snow = snowTile(5, 320, 640, 1, false), crawl = snowTile(6, 320, 640, 0.3, true);
      const scan = lay(w, h, Math.min(kit.dpr, 2));
      {
        const c = scan.g;
        c.fillStyle = 'rgba(0,0,0,.16)';
        for (let y = 0; y < h; y += 2) c.fillRect(0, y, w, 1);
      }

      // ---- What is on the tape ----
      const s = Math.min(w * 0.64, h * 0.3) / F.box.w;
      const lcx = w * 0.5, lcy = h * 0.46;
      const ox = lcx - (F.box.x + F.box.w / 2) * s, oy = lcy - (F.box.y + F.box.h / 2) * s;
      const greys = [232, 188, 146];
      const wordPx = Math.round(w * 0.128);
      const wordY = oy + (F.box.y + F.box.h) * s + w * 0.15;
      function rgbPass(fn) {
        // Tape keeps colour softer and later than brightness: a small warm lag on one side, not an anaglyph split.
        v.globalCompositeOperation = 'lighter';
        fn(1.5, 1, 0, 0);
        fn(-0.5, 0, 1, 1);
        v.globalCompositeOperation = 'source-over';
      }
      function program(tt) {
        v.fillStyle = '#0b0a10';
        v.fillRect(0, 0, w, h);
        const parts = [
          k(tt, [[0.08, 0], [0.2, 1, 'out4']]),
          k(tt, [[0.28, 0], [0.36, 1, 'out3']]),
          k(tt, [[0.46, 0], [0.5, 1, 'out2']]),
        ];
        F.clips.forEach((c, i) => {
          const p = parts[i];
          if (p <= 0) return;
          const cw = c.w * s * p, cx = ox + c.x * s, cy = oy + c.y * s, ch = c.h * s, gv = greys[i];
          const rr = Math.min(c.r * s, cw / 2);
          rgbPass((off, r, gr, b) => {
            v.fillStyle = 'rgb(' + gv * r + ',' + gv * gr + ',' + gv * b + ')';
            v.beginPath();
            v.roundRect(cx + off, cy, cw, ch, rr);
            v.fill();
          });
          // The sharpness circuit's edge: an overshoot on the leading side, a pale ghost trailing the far side.
          v.fillStyle = 'rgba(255,255,255,.3)';
          v.fillRect(cx - 1, cy + rr, 3, ch - rr * 2);
          v.fillStyle = 'rgba(255,255,255,.13)';
          v.fillRect(cx + cw + 4, cy + rr * 0.5, 12, ch - rr);
        });
        const hp = k(tt, [[0.58, 0], [0.82, 1, 'io3']]);
        if (tt > 0.56) {
          const hd = F.head;
          const hx = ox + lerp(F.clips[0].x, hd.x, hp) * s;
          v.fillStyle = 'rgba(41,217,187,.32)';
          v.fillRect(hx + 2, oy + hd.y * s, hd.w * s + 12, hd.h * s);
          v.fillStyle = F.teal;
          v.fillRect(hx, oy + hd.y * s, hd.w * s, hd.h * s);
          v.beginPath();
          v.moveTo(hx + (hd.tri[0][0] - hd.x) * s, oy + hd.tri[0][1] * s);
          v.lineTo(hx + (hd.tri[1][0] - hd.x) * s, oy + hd.tri[1][1] * s);
          v.lineTo(hx + (hd.tri[2][0] - hd.x) * s, oy + hd.tri[2][1] * s);
          v.fill();
        }
        if (tt >= 1.0) {
          v.font = '400 ' + wordPx + 'px "Archivo Black"';
          v.textAlign = 'center';
          v.textBaseline = 'alphabetic';
          v.fillStyle = '#000';
          v.fillText('FreeMotion', lcx + 4, wordY + 4);
          rgbPass((off, r, gr, b) => {
            v.fillStyle = 'rgb(' + 240 * r + ',' + 240 * gr + ',' + 236 * b + ')';
            v.fillText('FreeMotion', lcx + off, wordY);
          });
        }
      }
      const BARS = ['#bfbfbf', '#bfbf10', '#10bfbf', '#10bf10', '#bf10bf', '#bf1010', '#1010bf'];
      const BARS2 = ['#1010bf', '#131313', '#bf10bf', '#131313', '#10bfbf', '#131313', '#bfbfbf'];
      function colourBars() {
        for (let i = 0; i < 7; i++) {
          const x = (w * i) / 7;
          v.fillStyle = BARS[i];
          v.fillRect(x, 0, w / 7 + 1, h * 0.67);
          v.fillStyle = BARS2[i];
          v.fillRect(x, h * 0.67, w / 7 + 1, h * 0.08);
        }
        v.fillStyle = '#0a2a5a';
        v.fillRect(0, h * 0.75, w * 0.18, h);
        v.fillStyle = '#ececec';
        v.fillRect(w * 0.18, h * 0.75, w * 0.18, h);
        v.fillStyle = '#2a0a5a';
        v.fillRect(w * 0.36, h * 0.75, w * 0.18, h);
        v.fillStyle = '#101010';
        v.fillRect(w * 0.54, h * 0.75, w * 0.46, h);
      }
      function slate() {
        v.fillStyle = '#0b0a10';
        v.fillRect(0, 0, w, h);
        v.font = '700 ' + Math.round(w * 0.085) + 'px "Courier Prime"';
        v.fillStyle = '#e8e8e2';
        v.textAlign = 'left';
        v.textBaseline = 'alphabetic';
        const lx = w * 0.12;
        v.fillText('TAPE 01', lx, h * 0.4);
        v.fillText('ROUGH CUT', lx, h * 0.4 + w * 0.11);
        v.fillText('REV 14', lx, h * 0.4 + w * 0.22);
        v.fillText('SP  PAL', lx, h * 0.4 + w * 0.33);
      }

      // Further down the tape: someone's camcorder footage it was recorded over. A summer Christmas on the beach, date stamp and all.
      function homeVideo(tt) {
        const px = Math.sin(tt * 3.1) * w * 0.03 + tt * w * 0.08;
        const py = Math.sin(tt * 4.7) * h * 0.006;
        const hz = h * 0.4 + py, sandY = h * 0.56 + py;
        const sky = v.createLinearGradient(0, 0, 0, hz);
        sky.addColorStop(0, '#4f8fc0');
        sky.addColorStop(1, '#d6d8bc');
        v.fillStyle = sky;
        v.fillRect(0, 0, w, hz + 1);
        v.fillStyle = '#23708c';
        v.fillRect(0, hz, w, sandY - hz);
        v.fillStyle = 'rgba(232,244,236,.8)';
        for (let i = 0; i < 4; i++) v.fillRect(-20 + ((i * 97 + tt * 30) % w), hz + (sandY - hz) * (0.3 + i * 0.16), w * 0.5, 2.4);
        const sand = v.createLinearGradient(0, sandY, 0, h);
        sand.addColorStop(0, '#d9bf82');
        sand.addColorStop(1, '#a98851');
        v.fillStyle = sand;
        v.fillRect(0, sandY, w, h - sandY);
        // Umbrella, planted, drifting only with the camera.
        const ux = w * 0.76 - px, uy = sandY + h * 0.05;
        v.fillStyle = '#efe7d2';
        v.fillRect(ux - 2, uy - h * 0.16, 4, h * 0.2);
        for (let i = 0; i < 6; i++) {
          v.fillStyle = i % 2 ? '#d62a1c' : '#f2efe0';
          v.beginPath();
          v.moveTo(ux, uy - h * 0.2);
          v.lineTo(ux - w * 0.24 + (i * w * 0.48) / 6, uy - h * 0.13);
          v.lineTo(ux - w * 0.24 + ((i + 1) * w * 0.48) / 6, uy - h * 0.13);
          v.fill();
        }
        // A kid running with a dog behind, and a ball being chased. All of it runs backward when the tape does.
        const kx = w * (0.02 + tt * 0.34) - px, ky = sandY + h * 0.09, st = Math.sin(tt * 26), ku = w * 0.05;
        v.fillStyle = '#1e2a3c';
        v.fillRect(kx - ku * 0.55 + st * ku * 0.5, ky + h * 0.03, ku * 0.46, h * 0.062);
        v.fillRect(kx + ku * 0.1 - st * ku * 0.5, ky + h * 0.03, ku * 0.46, h * 0.062);
        v.fillStyle = '#d62a1c';
        v.fillRect(kx - ku * 0.7, ky - h * 0.04, ku * 1.4, h * 0.08);
        v.fillStyle = '#a8663c';
        v.fillRect(kx + ku * 0.6, ky - h * 0.03 + st * 6, ku * 0.9, ku * 0.34);
        v.beginPath();
        v.arc(kx + ku * 0.12, ky - h * 0.065, ku * 0.56, 0, TAU);
        v.fill();
        v.fillStyle = '#21140c';
        v.beginPath();
        v.arc(kx + ku * 0.04, ky - h * 0.07, ku * 0.56, Math.PI * 0.95, Math.PI * 2.05);
        v.fill();
        const dx2 = kx - w * 0.24, dy2 = ky + h * 0.05;
        v.fillStyle = '#5a3a1c';
        v.beginPath();
        v.ellipse(dx2, dy2, w * 0.06, h * 0.014, 0, 0, TAU);
        v.fill();
        v.beginPath();
        v.arc(dx2 + w * 0.065, dy2 - h * 0.018, h * 0.012, 0, TAU);
        v.fill();
        v.fillRect(dx2 - w * 0.04 + st * 4, dy2, 5, h * 0.03);
        v.fillRect(dx2 + w * 0.03 - st * 4, dy2, 5, h * 0.03);
        const bx = kx + w * 0.3, by = ky + h * 0.06 - Math.abs(Math.sin(tt * 7)) * h * 0.12;
        v.fillStyle = '#f2e23c';
        v.beginPath();
        v.arc(bx, by, h * 0.02, 0, TAU);
        v.fill();
        v.fillStyle = '#2d6bd0';
        v.fillRect(bx - h * 0.02, by - h * 0.006, h * 0.04, h * 0.012);
        // The camcorder's date stamp is recorded into the picture, so it tears with it.
        v.font = '700 ' + Math.round(w * 0.06) + 'px "Courier Prime"';
        v.textAlign = 'right';
        v.textBaseline = 'alphabetic';
        v.fillStyle = '#10100a';
        v.fillText('DEC 25 1989', w * 0.93 + 2, h * 0.78 + 2);
        v.fillStyle = '#f4eeb0';
        v.fillText('DEC 25 1989', w * 0.93, h * 0.78);
      }

      // ---- The times ----
      const FR = 25, T_REW = 0.24, T_ZERO = 1.64, T_PLAY = 1.84, T_ROLL = 2.0, T_LOCK = 2.42, T_PROG = 1.98;
      const T_TRACK_END = 3.3, S0 = 14 * 60 + 52;

      function picture(T, f, o) {
        // o: roll in rows, wob (how much the time base shakes), tearA (big line tears), bands [{y, hw, tear}]
        g.fillStyle = '#000';
        g.fillRect(0, 0, w, h);
        const roll = Math.round(o.roll || 0);
        const hsn = Math.round(L * 0.038);
        for (let r = 0; r < L; r++) {
          const y = r * rowH;
          let dx = Math.sin(r * 0.021 + f * 1.7) * 0.8 * o.wob + Math.sin(r * 0.13 + f * 2.3) * 0.4 * o.wob + (hash(r + f * 733, 9) - 0.5) * 0.8 * o.wob;
          if (r < 26) dx += Math.pow(26 - r, 1.5) * 0.09 * (1 + 0.3 * Math.sin(f * 2.1));
          if (o.bands) {
            for (let b = 0; b < o.bands.length; b++) {
              const q = o.bands[b], d = Math.abs(y - q.y) / q.hw;
              if (d < 1) dx += (hash(r * 3 + f * 97, 40 + b) - 0.5) * q.tear * (1 - d * 0.6);
              else if (d < 3) dx += q.tear * 0.16 * (3 - d) * (y < q.y ? 1 : -0.4);
            }
          }
          if (o.tearA && hash(Math.floor(r / 9) + f * 31, 77) < 0.08) dx += (hash(Math.floor(r / 9) + f, 78) - 0.5) * o.tearA;
          if (r >= L - hsn && o.hsw) {
            const q = (r - (L - hsn)) / hsn;
            dx += q * q * w * 0.16 * o.hsw + (hash(r + f * 11, 83) - 0.5) * 16 * q * o.hsw;
          }
          let sr = (r + roll) % L;
          if (sr < 0) sr += L;
          g.drawImage(vc, 0, sr, BW, 1, dx, y, w, rowH + 0.6);
          if (Math.abs(dx) > 1) g.drawImage(vc, 0, sr, BW, 1, dx > 0 ? dx - w : dx + w, y, w, rowH + 0.6);
        }
        if (roll) {
          // The vertical blanking bar rolling through while the picture has no lock.
          const by = ((L - (roll % L)) % L) * rowH;
          g.fillStyle = '#000';
          g.fillRect(0, by - h * 0.024, w, h * 0.048);
          g.fillStyle = 'rgba(232,232,226,.6)';
          g.fillRect(0, by + h * 0.008, w * 0.24, 2);
        }
        if (o.bands) {
          for (let b = 0; b < o.bands.length; b++) {
            const q = o.bands[b];
            const n = Math.floor(hash(f + b * 7, 88) * 4);
            const sx = hash(f * 3 + b, 90) * 120;
            g.drawImage(bands[n], sx, 0, 180, 80, 0, q.y - q.hw, w, q.hw * 2);
          }
        }
        // Dropouts: oxide missing, a white comet a few lines tall.
        const nd = o.drop || 0;
        for (let i = 0; i < nd; i++) {
          if (hash(f * 5 + i, 91) > 0.55) continue;
          const y = hash(f * 7 + i, 92) * h, x = hash(f * 13 + i, 93) * w, len = 18 + hash(f + i, 94) * 90;
          g.fillStyle = 'rgba(245,245,240,.92)';
          g.fillRect(x, y, len, 1.6);
          g.fillStyle = 'rgba(245,245,240,.35)';
          g.fillRect(x + len, y, len * 0.6, 1.6);
        }
        if (o.hsw) {
          const hy = h - hsn * rowH;
          const sx = hash(f, 96) * 120;
          g.drawImage(bands[f % 4], sx, 40, 180, 40, 0, hy - 2, w, hsn * rowH + 4);
        }
        g.globalAlpha = o.crawl === undefined ? 0.5 : o.crawl;
        g.drawImage(crawl, hash(f, 97) * 160, hash(f, 98) * 320, 160, 320, 0, 0, w, h);
        g.globalAlpha = 1;
      }
      function blue() {
        v.fillStyle = BLUE;
        v.fillRect(0, 0, w, h);
      }

      let shown = -1;
      return function seek(t) {
        const f = kit.frame(t, FR), T = f / FR;
        // PAL: the picture is a function of the frame number alone, so a repeat of the same frame costs nothing.
        if (f === shown) return;
        shown = f;
        if (T < T_REW) {
          // Blue back. The deck has been told to rewind and the head drum is winding up: one clunk through the picture.
          blue();
          const clunk = T >= 0.12 && T < 0.2;
          picture(T, f, { wob: clunk ? 7 : 0.4, tearA: clunk ? w * 0.4 : 0, crawl: 0.22, roll: clunk ? (f % 2 ? 14 : -9) : 0 });
          osd('STOP', x0, y0, small);
          osd('SP', w - x0 - 2 * small.adv, y0, small);
          osd(clock(S0), x0, yBig, big);
        } else if (T < T_ZERO) {
          // Rewind, tape order backward: the old camcorder footage it was recorded over, a slate, bars, then the logo itself
          // coming apart, the last thing on the tape before the very start.
          const u = (T - T_REW) / (T_ZERO - T_REW);
          if (T < 0.64) homeVideo(1.9 - (T - T_REW) * 3.6);
          else if (T < 0.72) slate();
          else if (T < 1.0) colourBars();
          else if (T < 1.06) { v.fillStyle = '#060608'; v.fillRect(0, 0, w, h); }
          else if (T < 1.6) program(1.3 * (1 - (T - 1.06) / 0.54));
          else { v.fillStyle = '#0b0a10'; v.fillRect(0, 0, w, h); }
          const by = [];
          const sp = 2.1;
          for (let i = 0; i < 3; i++) {
            const q = (((i * 0.37 + T * sp) % 1) + 1) % 1;
            by.push({ y: (1 - q) * h * 1.2 - h * 0.1, hw: h * (0.036 + 0.02 * i), tear: w * (0.26 + i * 0.1) });
          }
          picture(T, f, { wob: 5, tearA: w * 0.42, bands: by, roll: Math.sin(f * 2.7) * 3, drop: 6, hsw: 1, crawl: 0.6 });
          osd('<< REW', x0, y0, small);
          osd('SP', w - x0 - 2 * small.adv, y0, small);
          osd(clock(S0 * (1 - Math.pow(u, 1.7))), x0, yBig, big);
        } else if (T < T_PLAY) {
          // Hits the head of the tape. Hard stop, blue, a held breath.
          blue();
          const hit = T < T_ZERO + 0.08;
          picture(T, f, { wob: hit ? 9 : 0.4, tearA: hit ? w * 0.6 : 0, crawl: 0.22, roll: hit ? -18 : 0 });
          osd('STOP', x0, y0, small);
          osd('SP', w - x0 - 2 * small.adv, y0, small);
          osd(clock(0), x0, yBig, big);
        } else {
          // Play. Blue for a moment, snow while the drum finds the track, picture rolls, locks, and tracking walks the band away.
          const tt = T - T_PROG;
          const settle = clamp((T - T_LOCK) / (T_TRACK_END - T_LOCK));
          if (T < T_ROLL) {
            if (T < T_ROLL - 0.08) blue();
            else { v.drawImage(snow, hash(f, 1) * 160, hash(f, 2) * 320, 160, 320, 0, 0, w, h); }
            picture(T, f, { wob: 1.2, crawl: 0.3 });
          } else {
            program(tt);
            const roll = T < T_LOCK ? L * 1.7 * Math.pow(1 - (T - T_ROLL) / (T_LOCK - T_ROLL), 1.7) : 0;
            const trackP = kit.ease.io2(settle);
            const hw = lerp(h * 0.052, h * 0.02, settle);
            const by = lerp(h * 0.3, h * 1.04, trackP);
            const bandList = T < T_TRACK_END ? [{ y: by, hw, tear: w * lerp(0.22, 0.06, settle) }] : null;
            picture(T, f, { wob: lerp(2.4, 0.62, settle), bands: bandList, roll, drop: T < T_TRACK_END ? 3 : 1, hsw: lerp(0.5, 1, settle), crawl: 0.5 });
          }
          osd('> PLAY', x0, y0, small);
          osd('SP', w - x0 - 2 * small.adv, y0, small);
          osd(clock(Math.floor(Math.max(0, T - T_PROG))), x0, yBig, big);
          if (T >= T_LOCK && T < T_TRACK_END) {
            // The tracking bar on the OSD, walking toward centre in steps as the auto-tracking hunts.
            const steps = 13, pos = Math.round(lerp(2, 6, kit.ease.out3(settle)));
            const by2 = Math.round(h * 0.765), bx = x0;
            osd('TRACKING', bx, by2, small);
            const cell = sd * 3.6;
            for (let i = 0; i < steps; i++) {
              const x = bx + i * (cell + sd * 0.6), y = by2 + small.adv * 1.4;
              g.fillStyle = '#08081a';
              g.fillRect(x + 1, y + 1, cell, sd * 3);
              g.fillStyle = i === pos ? '#f6f6ee' : 'rgba(246,246,238,.34)';
              g.fillRect(x, y, cell, sd * 3);
            }
          }
        }
        g.drawImage(scan.canvas, 0, 0, w, h);
      };
    },
  });
})();
