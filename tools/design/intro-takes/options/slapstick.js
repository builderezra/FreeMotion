// Slapstick lane: three takes that are funny because of timing and weight. Every frame comes from t alone.
(function () {
  'use strict';

  // Where the logo sits: s is CSS px per logo unit, U and V turn logo units into stage px.
  function fit(kit, wf, cyf, cxf) {
    const F = kit.F;
    const s = Math.min(kit.w * wf / F.box.w, (kit.h - 250) / F.box.h);
    const cx = kit.w * (cxf === undefined ? 0.5 : cxf);
    const cy = Math.max(60 + F.box.h * s / 2 + 6, kit.h * cyf);
    return { s, cx, cy, U: (u) => cx + (u - 60) * s, V: (v) => cy + (v - 56.5) * s };
  }

  // A font size that makes the name exactly this wide.
  function sizeForWidth(g, font, width) {
    g.save();
    g.font = font.replace('%', '100');
    const m = g.measureText('FreeMotion').width;
    g.restore();
    return 100 * width / m;
  }

  /* ------------------------------------------------------------------ (a) BOUNCING BALL
     Ink and paint on a painted background, like an old cartoon. The floors rise while each apex falls, so the ball really
     does lose energy all the way up. A white glove runs in from the wings with each clip to get it under the ball in time.
     It is later each time. The third time it gets stung. */
  FMI.add({
    id: 'slapstick-ball',
    lane: 'Slapstick',
    name: 'Bouncing ball',
    blurb: 'A rubber ball bounces in and a cartoon glove rushes each clip under it, later every time, until the ball lands on the playhead and goes flat into its triangle.',
    dur: 3.3,
    ground: '#e9b130',
    make(stage, kit) {
      const w = kit.w, h = kit.h, F = kit.F, k = kit.k, clamp = kit.clamp, lerp = kit.lerp;
      const L = fit(kit, 0.62, 0.42), s = L.s, U = L.U, V = L.V;
      const px = s / 2.5;
      const INK = '#1c1410', lw = Math.max(1.5, 2.3 * px);
      const SHADOW = 'rgba(125,62,0,.42)';

      // The painted background: gouache on board, one coat, the brush still showing.
      const bg = kit.canvas({ alpha: false });
      bg.fillStyle = '#e9b130';
      bg.fillRect(0, 0, w, h);
      const r0 = kit.rng(11);
      for (let i = 0; i < 300; i++) {
        bg.fillStyle = r0() < 0.5 ? 'rgba(255,225,130,.035)' : 'rgba(170,90,0,.03)';
        const rad = 14 + r0() * 80;
        bg.beginPath();
        bg.ellipse(r0() * w, r0() * h, rad * 1.9, rad * (0.2 + r0() * 0.3), -0.25 + r0() * 0.5, 0, 7);
        bg.fill();
      }
      for (let i = 0; i < 130; i++) {
        const y = r0() * h, x = r0() * w, len = 40 + r0() * 170;
        bg.strokeStyle = r0() < 0.5 ? 'rgba(255,235,160,.07)' : 'rgba(160,85,0,.06)';
        bg.lineWidth = 0.5 + r0() * 2.4;
        bg.beginPath();
        bg.moveTo(x - len, y);
        bg.quadraticCurveTo(x, y + r0() * 8 - 4, x + len, y + r0() * 8 - 4);
        bg.stroke();
      }
      const lg = bg.createLinearGradient(0, 0, w * 0.4, h);
      lg.addColorStop(0, 'rgba(255,240,190,.2)');
      lg.addColorStop(0.5, 'rgba(255,240,190,0)');
      lg.addColorStop(1, 'rgba(140,60,0,.26)');
      bg.fillStyle = lg;
      bg.fillRect(0, 0, w, h);
      kit.grain(bg, kit.grainTile(256, 0.06, 5), 1, 0.7);

      const g = kit.canvas();
      let boilN = 0;
      const bo = (i, a) => (kit.hash(i + boilN * 97, 31) - 0.5) * 2 * a;

      // The three clips as cels: flat paint, a hard shadow band, an inked line. They bend from the fixed left end.
      const paint = [['#f3eee1', '#cbc4b2', '#ffffff'], ['#b8b5ad', '#8e8b84', '#d8d5cc'], ['#6d6c6f', '#4b4a4e', '#8d8c8f']];
      const clips = F.clips.map((c, i) => ({ X: U(c.x), Y: V(c.y), W: c.w * s, H: c.h * s, rad: c.r * s, n: Math.max(4, Math.round(c.w / 8)), col: paint[i], c, i }));
      function plankPath(c, X, Y, A, seed) {
        const W = c.W, H = c.H, r = c.rad, n = c.n, e = (x) => { const q = x / W; return A * q * q; };
        g.beginPath();
        g.moveTo(X + r, Y + e(r));
        for (let i = 1; i <= n; i++) {
          const x = r + (W - 2 * r) * i / n;
          g.lineTo(X + x, Y + e(x) + (i < n ? bo(seed + i, 0.35) : 0));
        }
        const yE = e(W);
        g.quadraticCurveTo(X + W, Y + yE, X + W, Y + yE + r);
        g.lineTo(X + W, Y + yE + H - r);
        g.quadraticCurveTo(X + W, Y + yE + H, X + W - r, Y + yE + H);
        for (let i = n - 1; i >= 0; i--) {
          const x = r + (W - 2 * r) * i / n;
          g.lineTo(X + x, Y + e(x) + H + (i > 0 ? bo(seed + 20 + i, 0.35) : 0));
        }
        g.quadraticCurveTo(X, Y + H, X, Y + H - r);
        g.lineTo(X, Y + r);
        g.quadraticCurveTo(X, Y, X + r, Y);
        g.closePath();
      }
      function drawPlank(c, X, Y, A) {
        const W = c.W, H = c.H, e = (x) => { const q = x / W; return A * q * q; };
        g.save();
        plankPath(c, X, Y, A, c.i * 50);
        g.fillStyle = c.col[0];
        g.fill();
        g.clip();
        // The shadow band along the bottom edge, following the bend.
        g.fillStyle = c.col[1];
        g.beginPath();
        g.moveTo(X - 2, Y + H * 0.7);
        for (let i = 0; i <= 8; i++) {
          const x = W * i / 8;
          g.lineTo(X + x, Y + e(x) + H * 0.7);
        }
        g.lineTo(X + W + 2, Y + e(W) + H + 3);
        g.lineTo(X - 2, Y + H + 3);
        g.closePath();
        g.fill();
        // A dry highlight.
        g.strokeStyle = c.col[2];
        g.lineCap = 'round';
        g.lineWidth = Math.max(1.2, H * 0.08);
        g.beginPath();
        g.moveTo(X + W * 0.1 + H * 0.3, Y + e(W * 0.1) + H * 0.2);
        g.lineTo(X + W * 0.58, Y + e(W * 0.58) + H * 0.2);
        g.moveTo(X + W * 0.65, Y + e(W * 0.65) + H * 0.2);
        g.lineTo(X + W * 0.72, Y + e(W * 0.72) + H * 0.2);
        g.stroke();
        g.restore();
        // Trim marks, because these are clips.
        g.strokeStyle = INK;
        g.lineCap = 'round';
        g.lineWidth = lw * 0.62;
        g.beginPath();
        for (const x of c.i === 2 ? [W - H * 0.34] : [H * 0.34, W - H * 0.34]) {
          g.moveTo(X + x, Y + e(x) + H * 0.3);
          g.lineTo(X + x, Y + e(x) + H * 0.7);
        }
        g.stroke();
        plankPath(c, X, Y, A, c.i * 50);
        g.strokeStyle = INK;
        g.lineWidth = lw;
        g.lineJoin = 'round';
        g.stroke();
      }

      // THE GLOVE. Local units are the height of a clip. x runs along the fingers.
      const hs = F.clips[0].h * s;
      const GLOVE = '#fdf9ef', GLOVE2 = '#d8d0bd';
      function gloveBack() {
        g.strokeStyle = INK;
        g.lineCap = 'round';
        g.lineWidth = hs * 0.34;
        g.beginPath();
        g.moveTo(-1.28 * hs, 0);
        g.bezierCurveTo(-3 * hs, 0.5 * hs, -5 * hs, -0.7 * hs, -14 * hs, 0.3 * hs);
        g.stroke();
        g.lineWidth = lw;
        g.fillStyle = GLOVE;
        g.beginPath();
        g.ellipse(-0.56 * hs, 0, 0.64 * hs, 0.66 * hs, 0, 0, 7);
        g.fill();
        g.save();
        g.clip();
        g.fillStyle = GLOVE2;
        g.beginPath();
        g.ellipse(-0.62 * hs, 0.42 * hs, 0.7 * hs, 0.38 * hs, 0, 0, 7);
        g.fill();
        g.restore();
        g.beginPath();
        g.ellipse(-0.56 * hs, 0, 0.64 * hs, 0.66 * hs, 0, 0, 7);
        g.stroke();
        g.beginPath();
        for (const y of [-0.26, 0, 0.26]) {
          g.moveTo(-0.92 * hs, y * hs);
          g.lineTo(-0.62 * hs, y * 0.8 * hs);
        }
        g.stroke();
        g.fillStyle = GLOVE;
        g.beginPath();
        g.ellipse(-1.2 * hs, 0, 0.2 * hs, 0.5 * hs, 0, 0, 7);
        g.fill();
        g.stroke();
      }
      function capsule(x0, y0, x1, y1, t0) {
        g.lineCap = 'round';
        g.strokeStyle = INK;
        g.lineWidth = t0 + lw * 2;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
        g.strokeStyle = GLOVE;
        g.lineWidth = t0;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
      }
      function gloveFront(curl) {
        const t0 = hs * 0.32;
        capsule(-0.3 * hs, -0.36 * hs, (0.3 - curl * 0.2) * hs, -0.36 * hs, t0);
        capsule(-0.3 * hs, 0.36 * hs, (0.3 - curl * 0.2) * hs, 0.36 * hs, t0);
        capsule(-0.3 * hs, 0, (0.42 - curl * 0.2) * hs, 0, t0);
        capsule(-0.72 * hs, -0.56 * hs, -0.14 * hs, -0.74 * hs, t0 * 0.92);
      }
      function atHand(x, y, rot, sx, sy, fn, a) {
        g.save();
        g.translate(x, y);
        g.rotate(rot);
        g.scale(sx, sy);
        fn(a);
        g.restore();
      }

      // The ball: a rubber toy, flat teal with one hard shadow and a painted stripe that shows it turning.
      const r = 9.5 * s;

      // THE FLIGHT PLAN. Floors go up the screen, apexes come down it, so the numbers below are all honest gravity.
      const G = 1111 * s;
      const yFloor = [V(78) - r, V(49) - r, V(20) - r, V(14) - r * 0.72];
      const xFloor = [U(25), U(50), U(68), U(82)];
      const apex = [V(-27), V(-14), V(-8)];
      const contact = [0.1, 0.09, 0.08];
      const T0 = 0.52;
      const hits = [], arcs = [];
      {
        let t = T0;
        for (let i = 0; i < 3; i++) {
          const c = 2 - i;
          hits.push({ t0: t, t1: t + contact[i], x: xFloor[i], clip: c });
          const leave = t + contact[i];
          const rise = Math.sqrt(2 * (yFloor[i] - apex[i]) / G), fall = Math.sqrt(2 * (yFloor[i + 1] - apex[i]) / G);
          arcs.push({ t0: leave, t1: leave + rise + fall, x0: xFloor[i], x1: xFloor[i + 1], y0: yFloor[i], vy: -G * rise });
          t = leave + rise + fall;
        }
        hits.tRod = t;
      }
      const tRod = hits.tRod, tMorph = tRod + 0.05;

      // When the glove comes and goes. Later every time: the last arrival is on the very frame of the hit.
      const xOff = -2.4 * hs;
      const entries = [
        { in0: hits[0].t0 - 0.38, in1: hits[0].t0 - 0.14, out0: hits[0].t0 - 0.08, out1: hits[0].t0 + 0.03 },
        { in0: hits[1].t0 - 0.32, in1: hits[1].t0 - 0.07, out0: hits[1].t0 - 0.04, out1: hits[1].t0 + 0.07 },
        { in0: hits[2].t0 - 0.22, in1: hits[2].t0, out0: hits[2].t0 + 0.2, out1: hits[2].t0 + 0.52 },
      ];
      function handX(j, X, t) {
        const e = entries[j];
        return k(t, [[e.in0, xOff], [e.in1, X, 'out3'], [e.out0, X], [e.out1, xOff, 'in2']]);
      }
      const flex = [
        { a: 5 * px, w: 2 * Math.PI * 9, d: 11 },
        { a: 14 * px, w: 2 * Math.PI * 6, d: 7 },
        { a: 24 * px, w: 2 * Math.PI * 4.2, d: 4.6 },
      ];
      function bendOf(j, t) {
        const h0 = hits[j], f = flex[j], tau = t - h0.t0;
        let A = 0;
        if (tau >= 0) {
          const tc = (h0.t1 - h0.t0) * 0.6;
          if (tau < tc) A = f.a * Math.sin(Math.PI / 2 * tau / tc);
          else A = f.a * Math.exp(-f.d * (tau - tc)) * Math.cos(f.w * (tau - tc));
        }
        for (let n = j + 1; n < 3; n++) {
          const q = t - hits[n].t0;
          if (q > 0) A += 2.4 * px * Math.exp(-9 * q) * Math.sin(f.w * q);
        }
        return A;
      }

      // The triangle as radii round its own middle, ready to morph from the circle.
      const triC = [81, 8.5], N = 40, triR = [];
      for (let i = 0; i < N; i++) {
        const th = i / N * Math.PI * 2, dx = Math.cos(th), dy = Math.sin(th);
        let best = 1e9;
        for (let e = 0; e < 3; e++) {
          const A = F.head.tri[e], B = F.head.tri[(e + 1) % 3];
          const ax = A[0] - triC[0], ay = A[1] - triC[1], ex = B[0] - A[0], ey = B[1] - A[1];
          const den = dx * ey - dy * ex;
          if (Math.abs(den) < 1e-6) continue;
          const u = (ax * ey - ay * ex) / den, v = (ax * dy - ay * dx) / den;
          if (u > 0 && v >= 0 && v <= 1 && u < best) best = u;
        }
        triR.push(best * s);
      }

      // The name, as a cel, brought on by the glove like everything else.
      const wordFont = "400 %px 'Archivo Black'";
      const wordPx = sizeForWidth(g, wordFont, F.box.w * s);
      const wL = kit.layer(F.box.w * s + 14, wordPx * 1.5);
      {
        const x = wL.g;
        x.font = wordFont.replace('%', wordPx.toFixed(2));
        x.textBaseline = 'alphabetic';
        x.lineJoin = 'round';
        x.lineWidth = lw * 2.1;
        x.strokeStyle = INK;
        x.strokeText('FreeMotion', 7, wordPx * 1.1);
        x.fillStyle = '#f7f2e5';
        x.fillText('FreeMotion', 7, wordPx * 1.1);
      }
      const wordX = U(14), wordY = V(110) + wordPx * 0.32;
      const tW = { in0: tRod + 0.3, in1: tRod + 0.48, out0: tRod + 0.56, out1: tRod + 0.68 };

      function ballState(t) {
        if (t < T0) {
          const x = lerp(-r * 2.4, xFloor[0], t / T0);
          const y = yFloor[0] - 0.5 * G * T0 * T0 + 0.5 * G * t * t;
          return { x, y, vx: (xFloor[0] + r * 2.4) / T0, vy: G * t, contact: -1 };
        }
        for (let i = 0; i < 3; i++) {
          if (t < hits[i].t1) return { x: hits[i].x, contact: i, p: (t - hits[i].t0) / (hits[i].t1 - hits[i].t0) };
          const a = arcs[i];
          if (t < a.t1) {
            const tau = t - a.t0, q = tau / (a.t1 - a.t0);
            return { x: lerp(a.x0, a.x1, q), y: a.y0 + a.vy * tau + 0.5 * G * tau * tau, vx: (a.x1 - a.x0) / (a.t1 - a.t0), vy: a.vy + G * tau, contact: -1 };
          }
        }
        return { x: xFloor[3], contact: 3, p: (t - tRod) / (tMorph - tRod) };
      }

      return function seek(tIn) {
        const t = kit.on(tIn, 24), fr = kit.frame(tIn, 24);
        boilN = Math.floor(fr / 2);
        g.clearRect(0, 0, w, h);
        g.save();

        // The whole picture jumps on a hit.
        let sx = 0, sy = 0;
        const amps = [3.5, 4.5, 5.5, 3.5];
        for (let i = 0; i < 4; i++) {
          const t0 = i < 3 ? hits[i].t0 : tRod, q = t - t0;
          if (q >= 0 && q < 0.2) {
            const e = amps[i] * px * Math.exp(-q * 22);
            sx += (kit.hash(fr, 7 + i) - 0.5) * e;
            sy += kit.hash(fr, 13 + i) * e;
          }
        }
        g.translate(sx, sy);

        // Work out the clips and their gloves.
        const shX = 5 * px, shY = 7 * px;
        const list = [];
        for (let j = 0; j < 3; j++) {
          const c = clips[hits[j].clip], e = entries[j];
          if (t < e.in0) continue;
          const hx = handX(j, c.X, t), hy = c.Y + c.H / 2;
          const held = t < hits[j].t0 && t < e.out0 || j === 2 && t < hits[j].t0;
          const A = t >= hits[j].t0 ? bendOf(j, t) : 0;
          const entry = { c, j, X: held ? hx : c.X, Y: c.Y, A };
          if (held) {
            const q = kit.map(t, e.in0, e.in1);
            entry.Y = c.Y + (1 - kit.ease.out3(q)) * [18, -14, 26][j] * px;
            entry.rot = (1 - kit.ease.out3(q)) * [0.14, -0.1, 0.2][j];
          }
          list.push(entry);
          if (t < e.out1) {
            // Speed stretches the glove along its arm.
            const v = Math.abs(handX(j, c.X, t + 1 / 24) - hx) * 24;
            const st = 1 + Math.min(0.55, v / 2400);
            let bx = 0, by = 0, rot = entry.rot || 0;
            if (j === 2 && t >= hits[2].t0) {
              // Stung. It buzzes with the board, lets go, and leaves shaking its fingers.
              const q = t - hits[2].t0;
              bx = bo(5, 5 * px * Math.exp(-q * 4));
              by = bo(9, 6 * px * Math.exp(-q * 4));
              if (t > e.out0) rot = Math.sin(fr * 2.4) * 0.5;
            }
            entry.hand = { x: hx + bx, y: (held ? entry.Y + c.H / 2 : hy) + by, rot, st, curl: t > e.out0 ? 1 : 0 };
          }
        }

        // Rod, thrown up from below on the frame the ball needs it, gripped by a second glove.
        const tS = tRod - 0.26;
        let rodFlex = 0, rodDip = 0, rodIn = 0, rodLean = 0;
        const rodOn = t >= tS;
        if (rodOn) {
          if (t < tRod) {
            const q = (t - tS) / (tRod - tS);
            rodIn = (1 - kit.ease.out2(q)) * (h - V(14) + 40);
            rodLean = (1 - q) * 0.1;
          } else {
            const q = t - tRod;
            rodDip = 15 * px * Math.exp(-9 * q) * Math.cos(2 * Math.PI * 3.1 * q);
            rodFlex = 13 * px * Math.exp(-4.6 * q) * Math.sin(2 * Math.PI * 4.1 * q);
          }
        }
        const rodX = U(82), rodTop = V(14) + rodIn + rodDip, rodBot = V(110) + rodIn + rodDip * 0.35;
        const leanPx = rodLean * (rodBot - rodTop);
        const tipX = rodX + rodFlex + leanPx;
        function strokeRod(dx, dy, col, lwid) {
          g.strokeStyle = col;
          g.lineWidth = lwid;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(rodX + dx, rodBot + dy);
          g.quadraticCurveTo(rodX + dx + rodFlex * 0.25 + leanPx * 0.5, (rodTop + rodBot) / 2 + dy, tipX + dx, rodTop + dy);
          g.stroke();
        }
        const rodHandOut = k(t, [[tRod + 0.16, 0], [tRod + 0.32, h, 'in2']]);
        const rodHandOn = rodOn && t < tRod + 0.32;

        // The ball's shape this frame.
        const b = ballState(t);
        let bx = b.x, by = 0, sa = 1, sb = 1, ang = 0;
        const morphing = t >= tMorph;
        if (!morphing) {
          if (b.contact >= 0 && b.contact < 3) {
            const c = clips[hits[b.contact].clip], A = bendOf(b.contact, t);
            const q = clamp((b.x - c.X) / c.W);
            const sq = Math.pow(Math.sin(Math.PI * clamp(b.p)), 0.8);
            sb = 1 - 0.5 * sq;
            sa = 1 + 0.62 * sq;
            by = c.Y + A * q * q - r * sb;
          } else if (b.contact === 3) {
            const sq = Math.pow(Math.sin(Math.PI * 0.5 * clamp(b.p)), 0.8);
            sb = 1 - 0.46 * sq;
            sa = 1 + 0.58 * sq;
            by = rodTop - r * sb;
            bx = tipX;
          } else {
            by = b.y;
            const sp = Math.hypot(b.vx, b.vy), q = clamp(sp / (G * 0.62)) * 0.55;
            ang = Math.atan2(b.vy, b.vx);
            sa = 1 + q;
            sb = 1 / (1 + q * 0.85);
          }
        }
        function ballMatrix() {
          g.translate(bx, by);
          g.rotate(ang);
          g.scale(sa, sb);
          g.rotate(-ang);
        }

        // Painted shadows on the wall first.
        g.fillStyle = SHADOW;
        for (const d of list) {
          g.save();
          if (d.rot) {
            g.translate(d.X, d.Y + d.c.H / 2);
            g.rotate(d.rot);
            g.translate(-d.X, -(d.Y + d.c.H / 2));
          }
          plankPath(d.c, d.X + shX, d.Y + shY, d.A, d.c.i * 50);
          g.fill();
          g.restore();
        }
        if (!morphing) {
          g.save();
          g.translate(11 * px, 16 * px);
          ballMatrix();
          g.beginPath();
          g.arc(0, 0, r, 0, 7);
          g.fill();
          g.restore();
        }
        if (rodOn) strokeRod(4 * px, 6 * px, SHADOW, 3 * s);

        // Palms go behind the clips, fingers in front.
        for (const d of list) if (d.hand) atHand(d.hand.x, d.hand.y, d.hand.rot, d.hand.st, 1, gloveBack);
        for (const d of list) {
          g.save();
          if (d.rot) {
            g.translate(d.X, d.Y + d.c.H / 2);
            g.rotate(d.rot);
            g.translate(-d.X, -(d.Y + d.c.H / 2));
          }
          drawPlank(d.c, d.X, d.Y, d.A);
          g.restore();
        }
        for (const d of list) if (d.hand) atHand(d.hand.x, d.hand.y, d.hand.rot, d.hand.st, 1, gloveFront, d.hand.curl);

        // The rod and its glove.
        if (rodOn) {
          if (rodHandOn) atHand(rodX + leanPx * -0.02, rodBot + hs * 0.1 + rodHandOut, -Math.PI / 2, 1, 1, gloveBack);
          strokeRod(0, 0, INK, 3 * s + lw * 2);
          strokeRod(0, 0, F.teal, 3 * s);
          g.strokeStyle = '#a6f5e6';
          g.lineWidth = 0.6 * s;
          g.beginPath();
          g.moveTo(rodX - s * 0.75, rodBot - 2);
          g.quadraticCurveTo(rodX - s * 0.75 + rodFlex * 0.25 + leanPx * 0.5, (rodTop + rodBot) / 2, tipX - s * 0.75, rodTop + 2);
          g.stroke();
          if (rodHandOn) atHand(rodX + leanPx * -0.02, rodBot + hs * 0.1 + rodHandOut, -Math.PI / 2, 1, 1, gloveFront, 0);
        }

        // The ball, or what is left of it.
        if (!morphing) {
          g.save();
          g.save();
          ballMatrix();
          g.beginPath();
          g.arc(0, 0, r, 0, 7);
          g.restore();
          g.fillStyle = F.teal;
          g.fill();
          g.clip();
          g.save();
          ballMatrix();
          // The stripe turns with the distance travelled, so it rolls.
          const spin = bx / r * 0.9;
          g.save();
          g.rotate(spin);
          g.strokeStyle = '#f7f2e5';
          g.lineWidth = r * 0.42;
          g.beginPath();
          g.ellipse(0, -r * 0.55, r * 1.25, r * 0.55, 0, 0.25, Math.PI - 0.25);
          g.stroke();
          g.restore();
          // A hard crescent of shade, always low on the right.
          g.fillStyle = 'rgba(6,92,84,.5)';
          g.beginPath();
          g.arc(0, 0, r * 1.05, -0.35, Math.PI * 0.82);
          g.arc(-r * 0.34, -r * 0.32, r * 1.02, Math.PI * 0.75, -0.3, true);
          g.closePath();
          g.fill();
          g.fillStyle = '#fbfff9';
          g.beginPath();
          g.ellipse(-r * 0.42, -r * 0.48, r * 0.19, r * 0.11, -0.7, 0, 7);
          g.fill();
          g.restore();
          g.restore();
          g.save();
          ballMatrix();
          g.beginPath();
          g.arc(0, 0, r, 0, 7);
          g.restore();
          g.strokeStyle = INK;
          g.lineWidth = lw * 1.15;
          g.stroke();
        } else {
          // Flat on the pin: it goes down in four frames, wrinkled, and what is left is the triangle.
          const q = t - tMorph;
          const m = clamp(q / 0.17);
          const over = 1 + 0.26 * Math.exp(-q * 11) * Math.cos(q * 34) * (m >= 1 ? 1 : 0);
          const ox = lerp(tipX, tipX - (82 - triC[0]) * s, m);
          const oy = lerp(rodTop - r * 0.62, rodTop - (14 - triC[1]) * s, m);
          g.save();
          g.translate(ox, oy);
          g.rotate(rodFlex * 0.012);
          g.beginPath();
          for (let i = 0; i < N; i++) {
            const th = i / N * Math.PI * 2;
            const wrinkle = (1 - m) * m * 4 * r * 0.16 * Math.sin(th * 7 + 1);
            const round = r * lerp(0.92, 0.6, m) * (1 + 0.38 * Math.cos(2 * th) * (1 - m));
            const rad = lerp(round, triR[i] * over, m * m) + wrinkle;
            const px2 = Math.cos(th) * rad, py2 = Math.sin(th) * rad;
            if (i === 0) g.moveTo(px2, py2);
            else g.lineTo(px2, py2);
          }
          g.closePath();
          g.fillStyle = F.teal;
          g.fill();
          g.strokeStyle = INK;
          g.lineWidth = lw;
          g.lineJoin = 'round';
          g.stroke();
          g.restore();
        }

        g.restore();

        // The glove brings the name on, gives it a push, and goes.
        if (t >= tW.in0) {
          const wx = k(t, [[tW.in0, -w * 0.9], [tW.in1, wordX, 'out3']]);
          const gx = k(t, [[tW.in0, -w * 0.9], [tW.in1, wordX, 'out3'], [tW.out0, wordX], [tW.out1, xOff, 'in2']]);
          const hy = wordY + wordPx * 0.74;
          if (t < tW.out1) atHand(gx, hy, 0, 1, 1, gloveBack);
          g.drawImage(wL.canvas, wx - 7, wordY, wL.w, wL.h);
          if (t < tW.out1) atHand(gx, hy, 0, 1, 1, gloveFront, t > tW.out0 ? 1 : 0);
        }
      };
    },
  });

  /* ------------------------------------------------------------------ (b) THE LATE CLIP
     Seen from above, on a workbench. Two blocks drop on their marks. The third is late, skids in, hits the playhead,
     freezes, then parallel parks. The playhead watches the whole thing. */
  FMI.add({
    id: 'slapstick-late',
    lane: 'Slapstick',
    name: 'The late clip',
    blurb: 'Two clips drop onto a workbench and wait; the short one skids in late, overshoots into the playhead, then parallel parks back onto its mark while the playhead watches.',
    dur: 4.05,
    ground: '#b98a55',
    make(stage, kit) {
      const w = kit.w, h = kit.h, F = kit.F, k = kit.k, lerp = kit.lerp, clamp = kit.clamp;
      const L = fit(kit, 0.62, 0.41), s = L.s, U = L.U, V = L.V;
      const px = s / 2.5;
      const DEG = Math.PI / 180;

      // The bench: boards of pale wood with long grain, a coffee ring, old pencil ticks, and camera tape on the empty mark.
      const M = 14;
      const desk = kit.layer(w + M * 2, h + M * 2);
      {
        const x = desk.g, R = kit.rng(31), W = w + M * 2, H = h + M * 2;
        x.fillStyle = '#c0935c';
        x.fillRect(0, 0, W, H);
        const boards = 4, bw = H / boards;
        for (let b = 0; b < boards; b++) {
          const y0 = b * bw;
          x.fillStyle = 'rgba(' + (b % 2 ? '90,50,15' : '255,220,170') + ',' + (0.05 + R() * 0.06) + ')';
          x.fillRect(0, y0, W, bw);
          const n = Math.round(bw * 1.1);
          for (let i = 0; i < n; i++) {
            const y = y0 + R() * bw, dark = R() < 0.72;
            x.strokeStyle = dark ? 'rgba(85,45,12,' + (0.03 + R() * 0.12) + ')' : 'rgba(255,225,180,' + (0.03 + R() * 0.08) + ')';
            x.lineWidth = 0.4 + R() * 1.1;
            const a = R() * 7, amp = 2 + R() * 7;
            x.beginPath();
            x.moveTo(-2, y);
            x.bezierCurveTo(W * 0.3, y + Math.sin(a) * amp, W * 0.66, y + Math.cos(a) * amp, W + 2, y + Math.sin(a * 2) * amp);
            x.stroke();
          }
          x.fillStyle = 'rgba(55,28,8,.55)';
          x.fillRect(0, y0 - 0.8, W, 1.6);
          x.fillStyle = 'rgba(255,225,180,.22)';
          x.fillRect(0, y0 + 0.8, W, 1);
        }
        // Light from the upper left, dropping off to the corner.
        const gr = x.createLinearGradient(0, 0, W, H);
        gr.addColorStop(0, 'rgba(255,240,210,.16)');
        gr.addColorStop(0.5, 'rgba(255,240,210,0)');
        gr.addColorStop(1, 'rgba(50,20,0,.3)');
        x.fillStyle = gr;
        x.fillRect(0, 0, W, H);
        // Coffee ring, cropped by the screen.
        const cx = W * 0.9, cy = H * 0.14, cr = W * 0.17;
        x.strokeStyle = 'rgba(70,35,10,.2)';
        x.lineWidth = 3.5;
        x.beginPath();
        x.arc(cx, cy, cr, 0, 7);
        x.stroke();
        x.strokeStyle = 'rgba(70,35,10,.13)';
        x.lineWidth = 1.2;
        x.beginPath();
        x.arc(cx + 1, cy + 1, cr - 3.2, 0.3, 5.6);
        x.stroke();
        // Knife nicks and pencil ticks.
        for (let i = 0; i < 26; i++) {
          const a = R() * W, b = R() * H, len = 6 + R() * 30, an = R() * 3.14;
          x.strokeStyle = R() < 0.6 ? 'rgba(60,30,10,.2)' : 'rgba(55,55,65,.18)';
          x.lineWidth = 0.6;
          x.beginPath();
          x.moveTo(a, b);
          x.lineTo(a + Math.cos(an) * len, b + Math.sin(an) * len);
          x.stroke();
        }
        // The mark for the missing clip: two corners of white camera tape.
        const tx = U(14) + M, ty = V(78) + M, tw = 26 * s, th = 22 * s, ta = 3.2 * s, tl = 11 * s;
        function tape(px0, py0, ww, hh) {
          x.fillStyle = 'rgba(40,20,5,.28)';
          x.fillRect(px0 + 0.8, py0 + 1.2, ww, hh);
          x.fillStyle = '#efe9da';
          x.fillRect(px0, py0, ww, hh);
          x.fillStyle = 'rgba(120,100,70,.18)';
          for (let i = 0; i < Math.max(ww, hh) / 3; i++) x.fillRect(px0 + R() * ww, py0 + R() * hh, 1, 1);
        }
        tape(tx - ta - 1.2 * s, ty - ta - 1.2 * s, tl + ta, ta);
        tape(tx - ta - 1.2 * s, ty - ta - 1.2 * s, ta, tl + ta);
        tape(tx - ta - 1.2 * s, ty + th + 1.2 * s, tl + ta, ta);
        tape(tx - ta - 1.2 * s, ty + th + 1.2 * s - tl, ta, tl + ta);
        kit.grain(x, kit.grainTile(256, 0.05, 9), 2, 0.7);
      }

      const g = kit.canvas({ alpha: false });

      // A painted block seen from above: bevelled, worn at the corners, with the trim grooves of a timeline clip.
      function block(W, H, tone, seed) {
        const m = 4, lay = kit.layer(W + m * 2, H + m * 2), x = lay.g, R = kit.rng(seed), rad = 5 / 22 * H;
        x.save();
        x.translate(m, m);
        x.beginPath();
        x.roundRect(0, 0, W, H, rad);
        x.save();
        x.clip();
        x.fillStyle = tone;
        x.fillRect(0, 0, W, H);
        for (let i = 0; i < 26; i++) {
          const y = R() * H;
          x.strokeStyle = R() < 0.6 ? 'rgba(0,0,0,' + (0.02 + R() * 0.04) + ')' : 'rgba(255,255,255,' + (0.015 + R() * 0.03) + ')';
          x.lineWidth = 0.5 + R() * 0.8;
          x.beginPath();
          x.moveTo(-2, y);
          x.bezierCurveTo(W * 0.35, y + R() * 2 - 1, W * 0.7, y + R() * 2 - 1, W + 2, y + R() * 2 - 1);
          x.stroke();
        }
        const bev = Math.max(1.6, H * 0.075);
        x.fillStyle = 'rgba(255,255,255,.34)';
        x.fillRect(0, 0, W, bev);
        x.fillStyle = 'rgba(255,255,255,.14)';
        x.fillRect(0, 0, bev, H);
        x.fillStyle = 'rgba(0,0,0,.32)';
        x.fillRect(0, H - bev, W, bev);
        x.fillStyle = 'rgba(0,0,0,.16)';
        x.fillRect(W - bev, 0, bev, H);
        for (const gx of [H * 0.3, W - H * 0.3]) {
          x.fillStyle = 'rgba(0,0,0,.28)';
          x.fillRect(gx - 0.6, bev * 1.4, Math.max(1, H * 0.05), H - bev * 2.8);
          x.fillStyle = 'rgba(255,255,255,.2)';
          x.fillRect(gx + Math.max(1, H * 0.05) - 0.6, bev * 1.4, 0.8, H - bev * 2.8);
        }
        // Bare wood where the paint has worn: at the corners, not in a row along the edge.
        for (let i = 0; i < 9; i++) {
          x.fillStyle = 'rgba(150,110,70,.55)';
          const cx = R() < 0.5 ? R() * H * 0.28 : W - R() * H * 0.28, onTop = R() < 0.5;
          x.beginPath();
          x.ellipse(cx, onTop ? R() * 1.7 : H - R() * 1.7, 0.5 + R() * 1.5, 0.3 + R() * 0.6, 0, 0, 7);
          x.fill();
        }
        x.restore();
        x.restore();
        // A soft shadow, baked: the shape is drawn far off the layer and only its shadow lands here.
        const sm = 16, sh = kit.layer(W + sm * 2, H + sm * 2);
        sh.g.shadowColor = 'rgba(30,14,2,.72)';
        sh.g.shadowBlur = 7 * kit.dpr;
        sh.g.shadowOffsetX = 3000 * kit.dpr;
        sh.g.fillStyle = '#000';
        sh.g.beginPath();
        sh.g.roundRect(sm - 3000, sm, W, H, rad);
        sh.g.fill();
        return { lay, sh, W, H, m, sm };
      }
      const tones = ['#dcdce0', '#94959b', '#55565d'];
      const clips = F.clips.map((c, i) => Object.assign({ X: U(c.x), Y: V(c.y), c }, block(c.w * s, c.h * s, tones[i], 40 + i)));

      // A paperclip that jumps when the bench is hit.
      const pcS = Math.round(62 * Math.min(1.1, w / 380));
      const pc = kit.layer(pcS + 8, pcS + 8), pcShadow = kit.layer(pcS + 8, pcS + 8);
      {
        const c = (pcS + 8) / 2;
        function wire(x, col, lw) {
          x.lineCap = 'round';
          x.lineJoin = 'round';
          x.strokeStyle = col;
          x.lineWidth = lw;
          const a = pcS * 0.26, b = pcS * 0.4;
          x.beginPath();
          x.moveTo(c - a * 0.36, c + b * 0.42);
          x.lineTo(c - a * 0.36, c - b * 0.6);
          x.arc(c, c - b * 0.6, a * 0.36, Math.PI, 0);
          x.lineTo(c + a * 0.36, c + b * 0.68);
          x.arc(c - a * 0.1, c + b * 0.68, a * 0.46, 0, Math.PI);
          x.lineTo(c - a * 0.56, c - b * 0.78);
          x.arc(c, c - b * 0.78, a * 0.56, Math.PI, 0);
          x.lineTo(c + a * 0.56, c + b * 0.3);
          x.stroke();
        }
        wire(pcShadow.g, '#1a0c02', 2.4);
        wire(pc.g, '#a9aab0', 2.4);
        wire(pc.g, '#eeeef2', 1);
      }
      const pcX = w * 0.17, pcY = Math.max(92, Math.min(h * 0.15, V(14) - 44));

      // THE STORY, in one place.
      const T = {
        rod: [0.0, 0.09], long: [0.13, 0.25], med: [0.41, 0.52],
        look1: 0.92, enter: 1.34, bump: 1.66,
        back1: [1.92, 2.18], fwd: [2.3, 2.47], back2: [2.56, 2.7], nudge: [2.78, 2.86],
        straighten: [3.08, 3.42], headBack: 3.06, label: 3.62,
      };
      const thuds = [T.long[1], T.med[1], T.bump, T.label + 0.08];
      const thudAmp = [4, 3.2, 1.6, 2];
      const uLeft = 60 - (w / 2) / s - 18;

      // The late clip's centre in logo units and its angle.
      function lateX(t) {
        return k(t, [[T.enter, uLeft], [T.bump, 71.5, 'out2'], [T.back1[0], 71.5], [T.back1[1], 19.5, 'io3'], [T.fwd[0], 19.5], [T.fwd[1], 33, 'io2'], [T.back2[0], 33], [T.back2[1], 25.4, 'io2'], [T.nudge[0], 25.4], [T.nudge[1], 27, 'io2']]);
      }
      function lateY(t) {
        return k(t, [[T.enter, 101], [T.bump, 99, 'out2'], [T.back1[0], 99], [T.back1[1], 92, 'io3'], [T.fwd[0], 92], [T.fwd[1], 88, 'io2'], [T.back2[0], 88], [T.back2[1], 89.6, 'io2'], [T.nudge[0], 89.6], [T.nudge[1], 89, 'io2']]);
      }
      function lateRot(t) {
        return k(t, [[T.enter, -26], [T.enter + 0.14, -7, 'out2'], [T.bump, 13, 'io2'], [T.bump + 0.06, 9, 'out2'], [T.back1[0], 9], [T.back1[1], -11, 'io3'], [T.fwd[0], -11], [T.fwd[1], 5, 'io2'], [T.back2[0], 5], [T.back2[1], -2, 'io2'], [T.nudge[0], -2], [T.nudge[1], 0, 'io2']]) * DEG;
      }
      // Rubber left on the bench by the skid and by the panic reverse: precomputed, then drawn up to t.
      const marks = [];
      {
        const c = clips[2];
        // Only the forward skid leaves rubber: two lines that fishtail a little and stay roughly parallel.
        for (let t = T.enter; t <= T.bump + 0.001; t += 1 / 60) {
          const x = U(lateX(t)), y = V(lateY(t)), a = lateRot(t) * 0.3, ca = Math.cos(a), sa = Math.sin(a);
          const hw = c.W * 0.5 * 0.82, hh = c.H * 0.5 * 0.7;
          marks.push({ t, a: [x - hw * ca - hh * sa, y - hw * sa + hh * ca], b: [x - hw * ca + hh * sa, y - hw * sa - hh * ca] });
        }
      }

      function drop(t, span) {
        // Height above the bench, 0 to 1, for a block dropped from the camera. Negative start means not there yet.
        if (t < span[0]) return -1;
        if (t < span[1]) {
          const q = (t - span[0]) / (span[1] - span[0]);
          return (1 - q * q);
        }
        const q = t - span[1];
        return q < 0.09 ? 0.045 * Math.sin(Math.PI * q / 0.09) : 0;
      }

      function drawBlock(c, cx, cy, rot, z, stretch) {
        const sc = 1 + z * 0.75, st = stretch || 1, sq = 1 / Math.pow(st, 0.6);
        const ox = (3.4 + z * 46) * px, oy = (5 + z * 66) * px;
        g.save();
        g.globalAlpha = 1 - z * 0.45;
        g.translate(cx + ox, cy + oy);
        g.rotate(rot);
        g.scale((1 + z * 0.5) * st, (1 + z * 0.5) * sq);
        g.drawImage(c.sh.canvas, -c.W / 2 - c.sm, -c.H / 2 - c.sm, c.W + c.sm * 2, c.H + c.sm * 2);
        g.restore();
        g.save();
        g.translate(cx, cy);
        g.rotate(rot);
        g.scale(sc * st, sc * sq);
        g.drawImage(c.lay.canvas, -c.W / 2 - c.m, -c.H / 2 - c.m, c.W + c.m * 2, c.H + c.m * 2);
        g.restore();
      }

      // The label that lands last.
      const labW = F.box.w * s * 0.86, labFont = "600 %px " + kit.SYS;
      const labPx = sizeForWidth(g, labFont, labW * 0.8);
      const labH = labPx * 1.55;
      const lab = block(labW, labH, '#17171a', 77);
      {
        const x = lab.lay.g;
        x.save();
        x.translate(lab.m, lab.m);
        x.font = labFont.replace('%', labPx.toFixed(2));
        x.textBaseline = 'alphabetic';
        x.textAlign = 'center';
        const by = labH * 0.5 + labPx * 0.35;
        x.fillStyle = 'rgba(0,0,0,.9)';
        x.fillText('FreeMotion', labW / 2 + 0.6, by + 0.8);
        x.fillStyle = '#f4f2ec';
        x.fillText('FreeMotion', labW / 2, by);
        x.restore();
      }
      const labCx = U(14) + labW / 2, labCy = V(110) + labH * 0.5 + 15 * px;

      return function seek(tIn) {
        const t = kit.on(tIn, 24), fr = kit.frame(tIn, 24);
        let sx = 0, sy = 0;
        for (let i = 0; i < thuds.length; i++) {
          const q = t - thuds[i];
          if (q >= 0 && q < 0.2) {
            const e = thudAmp[i] * px * Math.exp(-q * 20);
            sx += (kit.hash(fr, 3 + i) - 0.5) * 2 * e;
            sy += (kit.hash(fr, 9 + i) - 0.5) * 2 * e;
          }
        }
        g.drawImage(desk.canvas, -M + sx, -M + sy, w + M * 2, h + M * 2);
        g.save();
        g.translate(sx, sy);

        // Rubber on the bench.
        let nMarks = 0;
        while (nMarks < marks.length && marks[nMarks].t <= t) nMarks++;
        if (nMarks > 1) {
          g.lineCap = 'round';
          g.lineJoin = 'round';
          for (const side of ['a', 'b']) {
            let split = 0;
            while (split < nMarks && marks[split].t <= T.bump) split++;
            g.beginPath();
            for (let i = 0; i < split; i++) {
              const P = marks[i][side];
              if (i === 0) g.moveTo(P[0], P[1]);
              else g.lineTo(P[0], P[1]);
            }
            g.strokeStyle = 'rgba(28,18,12,.2)';
            g.lineWidth = 7.5 * px;
            g.stroke();
            g.strokeStyle = 'rgba(28,18,12,.26)';
            g.lineWidth = 3.2 * px;
            g.stroke();
            if (nMarks > split) {
              g.strokeStyle = 'rgba(28,18,12,.15)';
              g.lineWidth = 4.5 * px;
              g.beginPath();
              for (let i = split; i < nMarks; i++) {
                const P = marks[i][side];
                if (i === split) g.moveTo(P[0], P[1]);
                else g.lineTo(P[0], P[1]);
              }
              g.stroke();
            }
          }
        }

        // The paperclip jumps a little further on each thud and stays where it lands.
        {
          let ox = 0, oy = 0, rot = -0.5, lift = 0;
          const hopX = [10, -6, 3], hopY = [-4, 5, 2], hopR = [0.32, -0.2, 0.1];
          for (let i = 0; i < 3; i++) {
            const q = (t - thuds[i]) / 0.2;
            if (q > 0) {
              const c = clamp(q);
              ox += hopX[i] * px * c;
              oy += hopY[i] * px * c;
              rot += hopR[i] * c;
              if (q < 1) lift += Math.sin(Math.PI * q) * [1, 0.7, 0.3][i];
            }
          }
          const pw = pcS + 8;
          g.save();
          g.translate(pcX + ox + 2 + lift * 9, pcY + oy + 3 + lift * 12);
          g.rotate(rot);
          g.globalAlpha = 0.35;
          g.drawImage(pcShadow.canvas, -pw / 2, -pw / 2, pw, pw);
          g.restore();
          g.save();
          g.translate(pcX + ox, pcY + oy - lift * 5);
          g.rotate(rot);
          g.scale(1 + lift * 0.14, 1 + lift * 0.14);
          g.drawImage(pc.canvas, -pw / 2, -pw / 2, pw, pw);
          g.restore();
        }

        // Long and medium.
        const zL = drop(t, T.long), zM = drop(t, T.med);
        if (zM >= 0) drawBlock(clips[1], clips[1].X + clips[1].W / 2, clips[1].Y + clips[1].H / 2, 0, zM);
        if (zL >= 0) drawBlock(clips[0], clips[0].X + clips[0].W / 2, clips[0].Y + clips[0].H / 2, 0, zL);

        // The late one.
        if (t >= T.enter) {
          let lx = lateX(t), ly = lateY(t), lr = lateRot(t);
          if (t >= T.bump && t < T.back1[0]) {
            // Frozen at the scene of the accident, trembling.
            const q = t - T.bump;
            lx += Math.sin(fr * 2.6) * 0.42 * Math.min(1, q * 8);
          }
          if (t >= T.nudge[1] && t < T.nudge[1] + 0.12) {
            const q = (t - T.nudge[1]) / 0.12;
            ly += Math.sin(q * Math.PI * 3) * 0.5 * (1 - q);
          }
          // Stretched by its own speed, crushed for two frames when it hits, a little smaller while it is in trouble.
          const speed = Math.abs(lateX(t + 1 / 24) - lateX(t)) * 24;
          let st = 1 + Math.min(0.42, speed / 620);
          if (t >= T.bump && t < T.bump + 0.09) st = 0.8;
          else if (t >= T.bump + 0.09 && t < T.back1[0]) st = 0.95;
          drawBlock(clips[2], U(lx), V(ly), lr, 0, st);
        }

        // The playhead. It pivots at its middle like a needle: when its foot is hit, its head swings toward the culprit.
        const pv = [U(82), V(62)];
        const zR = drop(t, T.rod);
        // Looks left, looks right, looks left again. Then it follows the clip back with its whole body until the clip is parked.
        let lean = k(t, [[T.look1, 0], [T.look1 + 0.12, 8, 'out3'], [1.08, 8], [1.17, -5, 'io2'], [1.24, -5], [T.enter, 7, 'io2'], [T.bump - 0.03, 6, 'io2'], [T.bump + 0.05, 24, 'out3'], [T.bump + 0.26, 12, 'io2'], [T.straighten[0], 12], [T.straighten[1], -2.5, 'io3'], [T.straighten[1] + 0.14, 0, 'io2']]);
        if (t > T.bump + 0.26) lean += (71.5 - lateX(t)) / 44.5 * 11 * (1 - kit.ease.io3(kit.map(t, T.straighten[0], T.straighten[1])));
        if (t > T.bump && t < T.bump + 0.5) lean += 4 * Math.exp(-(t - T.bump) * 7) * Math.sin((t - T.bump) * 40);
        if (t > T.label + 0.08) lean += 1.6 * Math.exp(-(t - T.label - 0.08) * 9) * Math.sin((t - T.label - 0.08) * 30);
        const face = k(t, [[T.look1 - 0.02, 1], [T.look1 + 0.06, -1, 'io2'], [1.08, -1], [1.14, 1, 'io2'], [1.24, 1], [1.3, -1, 'io2'], [T.headBack, -1], [T.headBack + 0.08, 1, 'io2']]);
        const a = lean * DEG, sn = Math.sin(a), cs = Math.cos(a);
        if (zR >= 0) {
          const zs = 1 + zR * 0.6;
          const hd = [pv[0] - sn * 48 * s * zs, pv[1] - cs * 48 * s * zs], tl = [pv[0] + sn * 48 * s * zs, pv[1] + cs * 48 * s * zs];
          const ox = (3 + zR * 40) * px, oy = (4.4 + zR * 55) * px;
          function shape(dx, dy, col, widthK) {
            g.strokeStyle = col;
            g.fillStyle = col;
            g.lineCap = 'round';
            g.lineWidth = 3 * s * widthK * zs;
            g.beginPath();
            g.moveTo(hd[0] + dx, hd[1] + dy);
            g.lineTo(tl[0] + dx, tl[1] + dy);
            g.stroke();
            g.save();
            g.translate(hd[0] + dx, hd[1] + dy);
            g.rotate(-a);
            g.scale(face * s * zs, s * zs);
            g.beginPath();
            g.moveTo(F.head.tri[0][0] - 82, F.head.tri[0][1] - 14);
            g.lineTo(F.head.tri[1][0] - 82, F.head.tri[1][1] - 14);
            g.lineTo(F.head.tri[2][0] - 82, F.head.tri[2][1] - 14);
            g.closePath();
            g.fill();
            g.restore();
          }
          shape(ox, oy, 'rgba(30,14,2,.42)', 1);
          shape(0, 0, F.teal, 1);
          // A sliver of light down the metal.
          g.strokeStyle = 'rgba(255,255,255,.42)';
          g.lineWidth = 0.6 * s * zs;
          g.beginPath();
          g.moveTo(hd[0] - s * 0.75 * cs, hd[1] + s * 0.75 * sn);
          g.lineTo(tl[0] - s * 0.75 * cs, tl[1] + s * 0.75 * sn);
          g.stroke();
        }

        // The label lands, and that is the end of it.
        if (t >= T.label) {
          const q = (t - T.label) / 0.08;
          const z = q < 1 ? 0.55 * (1 - q * q) : 0;
          drawBlock(lab, labCx, labCy, -1.6 * DEG, z);
        }
        g.restore();
      };
    },
  });

  /* ------------------------------------------------------------------ (c) DOMINOES
     A real little 3D scene: boxes on a terrazzo floor, a low camera that rises to look straight down, and long hard
     shadows. The chain forks at the end, three tall slabs get knocked flat and become the clips; a teal rod is left
     standing, teeters from the shaking, and falls last. */
  FMI.add({
    id: 'slapstick-dominoes',
    lane: 'Slapstick',
    name: 'Dominoes',
    blurb: 'A curving line of little clips knocks down across a stone floor and speeds up, three tall slabs slap flat into the F, and the playhead left standing wobbles and falls across them.',
    dur: 3.6,
    ground: '#e7dcc8',
    make(stage, kit) {
      const w = kit.w, h = kit.h, F = kit.F, k = kit.k, map = kit.map, lerp = kit.lerp, ease = kit.ease;
      const L = fit(kit, 0.56, 0.385, 0.535), s = L.s, U = L.U, V = L.V;
      const sc = Math.max(0.8, Math.min(1.15, w / 380));
      const g = kit.canvas({ alpha: false });

      const wordFont = "400 %px 'Archivo Black'";
      const wordPx = sizeForWidth(g, wordFont, F.box.w * s);
      const wordBase = V(110) + wordPx * 1.2;

      // The floor: terrazzo as a seamless tile, twice the density, drawn with the camera's own matrix.
      const TS = 640;
      const tile = document.createElement('canvas');
      tile.width = tile.height = TS;
      {
        const x = tile.getContext('2d'), R = kit.rng(101);
        x.fillStyle = '#e8ddc9';
        x.fillRect(0, 0, TS, TS);
        const cols = ['#ddd0b8', '#d2c3a8', '#f4eee1', '#c8b799', '#f8f4ea', '#b7a688', '#8a8172', '#b06a4c', '#52504b'];
        const wts = [30, 30, 24, 18, 18, 12, 6, 3, 3];
        const tot = wts.reduce((a, b) => a + b, 0);
        for (let i = 0; i < 620; i++) {
          let pick = R() * tot, c = 0;
          while (pick > wts[c]) { pick -= wts[c]; c++; }
          const big = c < 6 ? 1 : 0.7;
          const cx = R() * TS, cy = R() * TS, rad = (3 + R() * R() * 15) * big, n = 4 + Math.floor(R() * 3), rot = R() * 7;
          const pts = [];
          for (let j = 0; j < n; j++) {
            const an = rot + j / n * Math.PI * 2 + R() * 0.5, rr = rad * (0.6 + R() * 0.5);
            pts.push([Math.cos(an) * rr, Math.sin(an) * rr * (0.6 + R() * 0.4)]);
          }
          x.fillStyle = cols[c];
          for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
            const px = cx + ox * TS, py = cy + oy * TS;
            if (px < -40 || px > TS + 40 || py < -40 || py > TS + 40) continue;
            x.beginPath();
            pts.forEach((p, j) => { if (j) x.lineTo(px + p[0], py + p[1]); else x.moveTo(px + p[0], py + p[1]); });
            x.closePath();
            x.fill();
          }
        }
        x.drawImage(kit.grainTile(TS, 0.05, 44), 0, 0);
      }
      const floorPat = g.createPattern(tile, 'repeat');

      // THE ROUTE: down the right side, a wave along the bottom, up the left, then a curl into the first row.
      const yTop = wordBase + 26 * sc, yBot = h - 122;
      const yb = (yTop + yBot) / 2, amp = Math.max(4, (yBot - yTop) / 2 - 6 * sc);
      const tx = Math.max(19 * sc, U(14) * 0.3);
      const rowY = [V(31), V(60), V(89)];
      const H0 = 30 * sc, W0 = 13 * sc, D0 = 3.4 * sc, sp = 13 * sc;
      const endX = U(14) - H0 * 0.55;
      const R0 = endX - tx;
      const route = [
        [w * 0.87, h * -0.05], [w * 0.92, h * 0.12], [w * 0.885, h * 0.3], [w * 0.915, (h * 0.3 + yb) * 0.5 + h * 0.02], [w * 0.875, yb + amp * 0.35],
        [w * 0.68, yBot - 1], [w * 0.42, yBot - amp * 0.28], [w * 0.2, yBot - amp * 0.72],
        [tx + 5 * sc, (yBot - amp * 0.72 + rowY[2] + R0) * 0.5], [tx, rowY[2] + R0], [tx, rowY[1] + R0], [tx, rowY[0] + R0],
        [tx + R0 * 0.3, rowY[0] + R0 * 0.3], [endX, rowY[0]],
      ];
      function catmull(P, n) {
        const out = [];
        for (let i = 0; i < P.length - 1; i++) {
          const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)];
          for (let j = 0; j < n; j++) {
            const q = j / n, q2 = q * q, q3 = q2 * q;
            out.push([
              0.5 * (2 * b[0] + (c[0] - a[0]) * q + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * q2 + (3 * b[0] - a[0] - 3 * c[0] + d[0]) * q3),
              0.5 * (2 * b[1] + (c[1] - a[1]) * q + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * q2 + (3 * b[1] - a[1] - 3 * c[1] + d[1]) * q3),
            ]);
          }
        }
        out.push(P[P.length - 1]);
        return out;
      }
      function resample(pts, step) {
        const out = [];
        let need = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (len < 1e-6) continue;
          let at = need;
          while (at <= len) {
            const q = at / len;
            out.push({ x: lerp(a[0], b[0], q), y: lerp(a[1], b[1], q), hx: (b[0] - a[0]) / len, hy: (b[1] - a[1]) / len });
            at += step;
          }
          need = at - len;
        }
        return out;
      }
      const main = resample(catmull(route, 24), sp);
      const doms = [];
      {
        let tc = 0;
        const n = main.length;
        main.forEach((d, i) => {
          const q = i / (n - 1);
          const v = lerp(210, 1500, Math.pow(q, 1.25));
          d.t = tc;
          tc += sp / sc / v;
          d.q = q;
          doms.push(d);
        });
        // The fork: where the trunk passes rows 3 and 2 a short curve peels off to the right.
        for (const row of [2, 1]) {
          let best = 0, bd = 1e9;
          main.forEach((d, i) => {
            const e = Math.hypot(d.x - tx, d.y - (rowY[row] + R0));
            if (e < bd) { bd = e; best = i; }
          });
          const bz = [];
          for (let i = 0; i <= 24; i++) {
            const q = i / 24, q1 = 1 - q;
            bz.push([q1 * q1 * tx + 2 * q1 * q * tx + q * q * endX, q1 * q1 * (rowY[row] + R0) + 2 * q1 * q * rowY[row] + q * q * rowY[row]]);
          }
          const pieces = resample(bz, sp).slice(1);
          let tb = main[best].t;
          pieces.forEach((d) => {
            tb += sp / sc / 1500;
            d.t = tb;
            d.q = 1;
            d.row = row;
            doms.push(d);
          });
        }
      }
      // Fit the whole run to the same time on every phone.
      const tEndRaw = main[main.length - 1].t;
      const Tchain = 1.95, tStart = 0.05, tScale = Tchain / tEndRaw;
      const rowEnd = [main[main.length - 1].t * tScale + tStart, 0, 0];
      for (const d of doms) {
        d.t = d.t * tScale + tStart;
        d.T = lerp(0.17, 0.09, d.q);
        if (d.row) rowEnd[d.row] = Math.max(rowEnd[d.row], d.t);
      }
      const REST = Math.acos(D0 / sp);
      doms.forEach((d, i) => { d.tone = (kit.hash(i, 21) * 3) | 0; d.i = i; });

      // The tall slabs, standing on the shared left edge, each falling to the right. Longer falls slower.
      const slabT = [0.34, 0.27, 0.2];
      const D1 = 5.5 * sc;
      const toneSlab = ['#6d6d74', '#515157', '#36363b'];
      const slabs = F.clips.map((c, i) => {
        const W = c.h * s, H = c.w * s;
        const lay = kit.layer(H + 2, W + 2), x = lay.g, rad = 5 / 22 * W;
        x.translate(1, 1);
        x.beginPath();
        x.roundRect(0, 0, H, W, rad);
        x.save();
        x.clip();
        x.fillStyle = toneSlab[i];
        x.fillRect(0, 0, H, W);
        const sh = x.createLinearGradient(0, 0, 0, W);
        sh.addColorStop(0, 'rgba(255,255,255,.26)');
        sh.addColorStop(0.1, 'rgba(255,255,255,.05)');
        sh.addColorStop(0.8, 'rgba(0,0,0,0)');
        sh.addColorStop(1, 'rgba(0,0,0,.34)');
        x.fillStyle = sh;
        x.fillRect(0, 0, H, W);
        for (const gx of [W * 0.3, H - W * 0.3]) {
          x.fillStyle = 'rgba(0,0,0,.34)';
          x.fillRect(gx, W * 0.14, Math.max(1, W * 0.05), W * 0.72);
          x.fillStyle = 'rgba(255,255,255,.16)';
          x.fillRect(gx + Math.max(1, W * 0.05), W * 0.14, 0.8, W * 0.72);
        }
        x.restore();
        return { i, c, W, H, D: D1, bx: U(c.x), by: V(c.y + c.h / 2), hx: 1, hy: 0, tS: rowEnd[i] + 0.035, T: slabT[i], lay, rad, tone: i };
      });
      const tSlapLast = Math.max(...slabs.map((a) => a.tS + a.T));
      const tRodFall = tSlapLast + 0.46, tRodDown = tRodFall + 0.3, tWord = tRodDown + 0.14;

      function slabTheta(sl, t) {
        const q = t - sl.tS;
        if (q <= 0) return 0;
        if (q < sl.T) {
          const p = q / sl.T;
          return Math.PI / 2 * p * p * (0.3 + 0.7 * p);
        }
        const r = q - sl.T;
        return Math.PI / 2 - 0.075 * Math.exp(-r * 16) * Math.abs(Math.sin(r * 42));
      }
      function rodTheta(t) {
        const q = t - tSlapLast;
        if (q <= 0) return 0;
        if (t < tRodFall) return 0.12 * Math.exp(-q * 1.1) * Math.sin(2 * Math.PI * 2.4 * q);
        const base = 0.12 * Math.exp(-(tRodFall - tSlapLast) * 1.1) * Math.sin(2 * Math.PI * 2.4 * (tRodFall - tSlapLast));
        if (t < tRodDown) {
          const p = (t - tRodFall) / (tRodDown - tRodFall);
          return base + (Math.PI / 2 - base) * Math.pow(p, 2.6);
        }
        const r = t - tRodDown;
        return Math.PI / 2 - 0.05 * Math.exp(-r * 18) * Math.abs(Math.sin(r * 46));
      }

      // THE CAMERA. Starts low and close on the first domino, rises and backs off until it looks straight down.
      const fl = main.length;
      function front(t) {
        let lo = 0, hi = fl - 1;
        const tt = Math.min(t, main[fl - 1].t);
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (main[mid].t <= tt) lo = mid;
          else hi = mid;
        }
        const a = main[lo], b = main[hi], q = kit.clamp((tt - a.t) / (b.t - a.t || 1e-6));
        return [lerp(a.x, b.x, q), lerp(a.y, b.y, q)];
      }
      const cam = { fx: 0, fy: 0, Z: 1, sn: 1, cs: 0, P: 8000, sx: 0, sy: 0, psi: 0, cp: 1, sp: 0 };
      function setCam(t) {
        const end = tRodDown;
        const phi = k(t, [[0, 24], [0.55, 31, 'io2'], [1.55, 66, 'io2'], [tSlapLast, 76, 'out2'], [tRodFall, 76], [end, 90, 'io3']]) * Math.PI / 180;
        cam.sn = Math.sin(phi);
        cam.cs = Math.abs(phi - Math.PI / 2) < 1e-4 ? 0 : Math.cos(phi);
        // The camera starts round to the side so the run crosses the frame, then swings behind it as it rises.
        cam.psi = k(t, [[0, 74], [0.85, 46, 'io2'], [1.62, 0, 'io3']]) * Math.PI / 180;
        cam.cp = Math.cos(cam.psi);
        cam.sp = Math.sin(cam.psi);
        cam.Z = k(t, [[0, 2.2], [0.6, 1.75, 'io2'], [1.5, 1.08, 'io2'], [end, 1, 'out2']]);
        cam.P = k(t, [[0, 1000], [1.5, 2400, 'io2'], [end, 40000, 'in2']]) * sc;
        const fw = front(t + 0.05);
        const e = ease.io2(map(t, 0.75, 1.72));
        cam.fx = lerp(fw[0], w / 2, e);
        cam.fy = lerp(fw[1], h / 2, e);
        cam.sx = w / 2;
        cam.sy = h / 2;
      }
      const P = new Float32Array(32);
      function proj(i, x, y, z) {
        const dx0 = x - cam.fx, dy0 = y - cam.fy;
        const dx = dx0 * cam.cp - dy0 * cam.sp, dy = dx0 * cam.sp + dy0 * cam.cp, dep = dy * cam.cs + z * cam.sn;
        const den = cam.P - dep, p = cam.Z * cam.P / (den < 80 ? 80 : den);
        P[i * 2] = cam.sx + dx * p;
        P[i * 2 + 1] = cam.sy + (dy * cam.sn - z * cam.cs) * p;
      }

      // Light from high on the upper left. Shadows run down and to the right, long.
      const Sx = 0.5 * sc / sc, Sy = 0.72;
      const Lv = (function () { const a = [-0.42, -0.6, 0.68], n = Math.hypot(a[0], a[1], a[2]); return [a[0] / n, a[1] / n, a[2] / n]; })();
      const toneRGB = [[98, 98, 104], [78, 78, 85], [120, 120, 124], [60, 60, 66], [38, 38, 43]];
      const LEVELS = 28;
      const palette = toneRGB.map((c) => {
        const row = [];
        for (let i = 0; i < LEVELS; i++) {
          const l = i / (LEVELS - 1), f = 0.6 + l * 0.95;
          row.push('rgb(' + Math.min(255, c[0] * f | 0) + ',' + Math.min(255, c[1] * f | 0) + ',' + Math.min(255, c[2] * f | 0) + ')');
        }
        return row;
      });
      const shadeOf = (nx, ny, nz) => {
        const l = Math.max(0, nx * Lv[0] + ny * Lv[1] + nz * Lv[2]);
        return Math.min(LEVELS - 1, l * (LEVELS - 1) | 0);
      };

      // The eight corners of a box leaning by th, pivoting on its front bottom edge.
      const W3 = new Float64Array(24);
      function corners(bx, by, zb, hx, hy, W, H, D, th, sway) {
        const nx = -hy, ny = hx, st = Math.sin(th), ct = Math.cos(th);
        const ex = hx * st, ey = hy * st, ez = ct;
        const mx = hx * ct, my = hy * ct, mz = -st;
        const hw = W / 2, lat = sway || 0;
        const set = (i, sgn, top, back) => {
          const x = bx + nx * sgn * hw + ex * top * H - mx * back * D + nx * lat * top * H;
          const y = by + ny * sgn * hw + ey * top * H - my * back * D + ny * lat * top * H;
          const z = zb + ez * top * H - mz * back * D;
          W3[i * 3] = x; W3[i * 3 + 1] = y; W3[i * 3 + 2] = z;
          proj(i, x, y, z);
        };
        set(0, -1, 0, 0); set(1, 1, 0, 0); set(2, 1, 1, 0); set(3, -1, 1, 0);
        set(4, -1, 0, 1); set(5, 1, 0, 1); set(6, 1, 1, 1); set(7, -1, 1, 1);
        return { nx, ny, ex, ey, ez, mx, my, mz };
      }
      function face(a, b, c, d, fill) {
        g.fillStyle = fill;
        g.beginPath();
        g.moveTo(P[a * 2], P[a * 2 + 1]);
        g.lineTo(P[b * 2], P[b * 2 + 1]);
        g.lineTo(P[c * 2], P[c * 2 + 1]);
        g.lineTo(P[d * 2], P[d * 2 + 1]);
        g.closePath();
        g.fill();
      }
      const vis = (nx, ny, nz) => (nx * cam.sp + ny * cam.cp) * cam.cs + nz * cam.sn > 0.001;
      function boxFaces(ax, tone, skipBack) {
        const pal = palette[tone];
        // The small faces first, then the big back face.
        if (vis(-ax.mx, -ax.my, -ax.mz) === false && vis(ax.mx, ax.my, ax.mz)) face(0, 1, 2, 3, pal[shadeOf(ax.mx, ax.my, ax.mz)]);
        if (vis(ax.nx, ax.ny, 0)) face(1, 2, 6, 5, pal[shadeOf(ax.nx, ax.ny, 0)]);
        if (vis(-ax.nx, -ax.ny, 0)) face(0, 3, 7, 4, pal[shadeOf(-ax.nx, -ax.ny, 0)]);
        if (vis(ax.ex, ax.ey, ax.ez)) face(3, 2, 6, 7, pal[shadeOf(ax.ex, ax.ey, ax.ez)]);
        if (vis(-ax.ex, -ax.ey, -ax.ez)) face(0, 1, 5, 4, pal[shadeOf(-ax.ex, -ax.ey, -ax.ez)]);
        if (!skipBack && vis(-ax.mx, -ax.my, -ax.mz)) face(4, 5, 6, 7, pal[shadeOf(-ax.mx, -ax.my, -ax.mz)]);
      }
      // A shadow is a quad on the floor from the box's foot to where its top lands. One path, one fill, so they do not stack.
      const SH = [];
      function addShadow(i0, i1, i2, i3) {
        const pts = [i0, i1, i2, i3].map((i) => {
          const z = W3[i * 3 + 2];
          proj(8, W3[i * 3] + z * Sx, W3[i * 3 + 1] + z * Sy, 0);
          return [P[16], P[17]];
        });
        let area = 0;
        for (let i = 0; i < 4; i++) {
          const a = pts[i], b = pts[(i + 1) % 4];
          area += a[0] * b[1] - b[0] * a[1];
        }
        if (area < 0) pts.reverse();
        SH.push(pts);
      }

      const order = doms.slice();
      const wordY = wordBase;

      return function seek(tIn) {
        const t = kit.on(tIn, 30), fr = kit.frame(tIn, 30);
        setCam(t);

        // The floor jumps when a slab lands.
        let shy = 0, shx = 0;
        for (const sl of slabs) {
          const q = t - (sl.tS + sl.T);
          if (q >= 0 && q < 0.16) {
            const e = (1.6 + sl.i * -0.3 + sl.H / (92 * s) * 3) * Math.exp(-q * 22);
            shy += e * (kit.hash(fr, 5 + sl.i) - 0.5) * 2;
            shx += e * 0.5 * (kit.hash(fr, 8 + sl.i) - 0.5) * 2;
          }
        }
        {
          const q = t - tRodDown;
          if (q >= 0 && q < 0.14) shy += 2.2 * Math.exp(-q * 24) * (kit.hash(fr, 15) - 0.5) * 2;
        }
        cam.sx += shx;
        cam.sy += shy;

        // Floor.
        g.save();
        g.fillStyle = '#e8ddc9';
        g.fillRect(0, 0, w, h);
        g.translate(cam.sx, cam.sy);
        g.scale(cam.Z, cam.Z * cam.sn);
        g.rotate(cam.psi);
        g.translate(-cam.fx, -cam.fy);
        g.scale(0.5, 0.5);
        g.fillStyle = floorPat;
        const ex = Math.max(w, h / cam.sn) / cam.Z * 1.6;
        g.fillRect((cam.fx - ex) * 2, (cam.fy - ex) * 2, ex * 4, ex * 4);
        g.restore();

        // Work out every piece's angle, then its corners twice: once for its shadow, once to paint it.
        SH.length = 0;
        for (const d of doms) {
          const q = (t - d.t) / d.T;
          let th = 0;
          if (q > 0) {
            if (q < 1) th = REST * Math.pow(q, 2.2);
            else {
              const r = (t - d.t - d.T);
              th = REST - 0.08 * Math.exp(-r * 24) * Math.abs(Math.sin(r * 44));
            }
          }
          d.th = th;
          corners(d.x, d.y, 0, d.hx, d.hy, W0, H0, D0, th);
          addShadow(0, 1, 6, 7);
          d.depth = ((d.x - cam.fx) * cam.sp + (d.y - cam.fy) * cam.cp) * cam.cs + Math.cos(th) * H0 * 0.5 * cam.sn;
        }
        for (const sl of slabs) {
          sl.th = slabTheta(sl, t);
          corners(sl.bx, sl.by, 0, sl.hx, sl.hy, sl.W, sl.H, sl.D, sl.th);
          addShadow(0, 1, 6, 7);
        }
        const rW = F.head.w * s, rH = F.head.h * s, rD = 2.4 * sc, rbx = U(F.head.x + F.head.w / 2), rby = V(F.head.y);
        const rTh = rodTheta(t), restZ = (rTh > 1 ? D1 : 0);
        // Shaken by the slabs, the rod also rocks side to side, and its long shadow swings like a clock hand.
        const qr = t - tSlapLast;
        const rSway = qr > 0 ? 0.16 * Math.exp(-qr * 1.4) * Math.sin(2 * Math.PI * 3.1 * qr) * (1 - kit.clamp((t - tRodFall) / 0.12)) : 0;
        corners(rbx, rby, restZ, 0, 1, rW, rH, rD, rTh, rSway);
        addShadow(0, 1, 6, 7);

        g.fillStyle = 'rgba(58,36,18,.34)';
        g.beginPath();
        for (const q of SH) {
          g.moveTo(q[0][0], q[0][1]);
          g.lineTo(q[1][0], q[1][1]);
          g.lineTo(q[2][0], q[2][1]);
          g.lineTo(q[3][0], q[3][1]);
          g.closePath();
        }
        g.fill();

        // Painter's order: anything lying down goes first, each over the one it lies on; then the standing ones, far to near.
        order.sort((a, b) => {
          const fa = a.th > 0.95, fb = b.th > 0.95;
          if (fa !== fb) return fa ? -1 : 1;
          if (fa) return b.i - a.i;
          return a.depth - b.depth || a.i - b.i;
        });
        g.lineCap = 'butt';
        for (const d of order) {
          const ax = corners(d.x, d.y, 0, d.hx, d.hy, W0, H0, D0, d.th);
          boxFaces(ax, d.tone);
          if (vis(-ax.mx, -ax.my, -ax.mz)) {
            // The dividing line printed across a domino's face, and a dark edge so each one reads on its own.
            g.lineWidth = Math.max(0.5, 0.6 * cam.Z);
            g.strokeStyle = 'rgba(16,14,14,.42)';
            g.beginPath();
            g.moveTo(P[8], P[9]);
            g.lineTo(P[10], P[11]);
            g.lineTo(P[12], P[13]);
            g.lineTo(P[14], P[15]);
            g.closePath();
            g.stroke();
            g.strokeStyle = 'rgba(255,255,255,.3)';
            g.lineWidth = Math.max(0.6, 0.8 * cam.Z);
            g.beginPath();
            g.moveTo((P[8] + P[14]) / 2, (P[9] + P[15]) / 2);
            g.lineTo((P[10] + P[12]) / 2, (P[11] + P[13]) / 2);
            g.stroke();
          }
        }

        // The slabs, textured, because they are the logo.
        for (let n = 2; n >= 0; n--) {
          const sl = slabs[n];
          const ax = corners(sl.bx, sl.by, 0, sl.hx, sl.hy, sl.W, sl.H, sl.D, sl.th);
          boxFaces(ax, 3, true);
          if (vis(-ax.mx, -ax.my, -ax.mz)) {
            const ox = P[8], oy = P[9];
            const vx = (P[14] - ox) / sl.H, vy = (P[15] - oy) / sl.H, ux = (P[10] - ox) / sl.W, uy = (P[11] - oy) / sl.W;
            g.save();
            g.transform(vx, vy, ux, uy, ox, oy);
            g.drawImage(sl.lay.canvas, -1, -1, sl.H + 2, sl.W + 2);
            g.restore();
          }
        }

        // The rod's triangular foot, flat on the floor, then the rod.
        const tri = F.head.tri;
        proj(8, U(tri[0][0]) + 1.5, V(tri[0][1]) + 2, 0);
        proj(9, U(tri[1][0]) + 1.5, V(tri[1][1]) + 2, 0);
        proj(10, U(tri[2][0]) + 1.5, V(tri[2][1]) + 2, 0);
        g.fillStyle = 'rgba(58,36,18,.38)';
        g.beginPath();
        g.moveTo(P[16], P[17]);
        g.lineTo(P[18], P[19]);
        g.lineTo(P[20], P[21]);
        g.closePath();
        g.fill();
        proj(8, U(tri[0][0]), V(tri[0][1]), 1);
        proj(9, U(tri[1][0]), V(tri[1][1]), 1);
        proj(10, U(tri[2][0]), V(tri[2][1]), 1);
        g.fillStyle = F.teal;
        g.beginPath();
        g.moveTo(P[16], P[17]);
        g.lineTo(P[18], P[19]);
        g.lineTo(P[20], P[21]);
        g.closePath();
        g.fill();

        {
          const ax = corners(rbx, rby, restZ, 0, 1, rW, rH, rD, rTh, rSway);
          const lit = (nx, ny, nz) => {
            const l = Math.max(0, nx * Lv[0] + ny * Lv[1] + nz * Lv[2]);
            return 'rgb(' + (20 + l * 50 | 0) + ',' + (150 + l * 90 | 0) + ',' + (128 + l * 80 | 0) + ')';
          };
          if (vis(ax.nx, ax.ny, 0)) face(1, 2, 6, 5, lit(ax.nx, ax.ny, 0));
          if (vis(-ax.nx, -ax.ny, 0)) face(0, 3, 7, 4, lit(-ax.nx, -ax.ny, 0));
          if (vis(ax.ex, ax.ey, ax.ez)) face(3, 2, 6, 7, lit(ax.ex, ax.ey, ax.ez));
          if (vis(ax.mx, ax.my, ax.mz)) face(0, 1, 2, 3, F.teal);
          if (vis(-ax.mx, -ax.my, -ax.mz)) face(4, 5, 6, 7, F.teal);
        }

        if (t >= tWord) {
          g.save();
          g.font = wordFont.replace('%', wordPx.toFixed(2));
          g.textBaseline = 'alphabetic';
          g.fillStyle = '#2b2b30';
          g.fillText('FreeMotion', U(14), wordY);
          g.restore();
        }
      };
    },
  });
})();
