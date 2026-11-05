// Big type lane: cut paper (Saul Bass), slam cards, a Perth departures board.
(function () {
  // A closed shape, or several, as one Path2D. Holes work because everything here fills with 'evenodd'.
  function pathOf(subs) {
    const p = new Path2D();
    for (const s of subs) {
      p.moveTo(s[0][0], s[0][1]);
      for (let i = 1; i < s.length; i++) p.lineTo(s[i][0], s[i][1]);
      p.closePath();
    }
    return p;
  }

  // ==================================================================================================== CUT PAPER
  // Sugar paper as a repeating tile: cloudy pulp, then hair-fine fibres, then flecks.
  function paperTile(kit, base, seed, strength) {
    const S = 256, c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d'), r = kit.rng(seed), a = strength || 1;
    x.fillStyle = base;
    x.fillRect(0, 0, S, S);
    for (let i = 0; i < 60; i++) {
      x.fillStyle = (r() < 0.5 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + 0.018 * a + ')';
      x.beginPath();
      x.arc(r() * S, r() * S, 10 + r() * 50, 0, 6.3);
      x.fill();
    }
    x.lineCap = 'round';
    for (let i = 0; i < 2100; i++) {
      const px = r() * S, py = r() * S, an = r() * 6.283, l = 2 + r() * r() * 24;
      x.strokeStyle = (r() < 0.55 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + (0.03 + r() * 0.11) * a + ')';
      x.lineWidth = 0.3 + r() * 0.55;
      x.beginPath();
      x.moveTo(px, py);
      x.quadraticCurveTo(px + Math.cos(an) * l * 0.5 + (r() - 0.5) * 7, py + Math.sin(an) * l * 0.5 + (r() - 0.5) * 7, px + Math.cos(an) * l, py + Math.sin(an) * l);
      x.stroke();
    }
    for (let i = 0; i < 420; i++) {
      x.fillStyle = (r() < 0.4 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + (0.05 + r() * 0.16) * a + ')';
      x.fillRect(r() * S, r() * S, 0.6 + r() * 1.3, 0.6 + r() * 1.1);
    }
    return c;
  }

  // Hand-cut letters: straight scissor cuts only, so a bowl is a few facets. Cap height is 1, baseline at y = 1.
  const CUT = {
    F: { w: 0.62, s: [[[0, 0], [0.63, 0], [0.61, 0.2], [0.23, 0.19], [0.24, 0.42], [0.53, 0.41], [0.51, 0.61], [0.24, 0.6], [0.25, 1], [0, 1]]] },
    M: { w: 0.9, s: [[[0, 1], [0.03, 0], [0.23, 0], [0.45, 0.47], [0.67, 0], [0.87, 0], [0.9, 1], [0.68, 1], [0.66, 0.42], [0.5, 0.8], [0.39, 0.8], [0.23, 0.42], [0.21, 1]]] },
    r: { w: 0.46, s: [[[0, 0.33], [0.2, 0.33], [0.21, 0.43], [0.44, 0.3], [0.47, 0.52], [0.23, 0.58], [0.21, 1], [0, 1]]] },
    e: { w: 0.58, s: [[[0.05, 0.4], [0.19, 0.3], [0.41, 0.3], [0.56, 0.42], [0.58, 0.71], [0.21, 0.7], [0.25, 0.84], [0.42, 0.83], [0.55, 0.77], [0.57, 0.93], [0.4, 1.02], [0.17, 1.02], [0.03, 0.9], [0, 0.62]], [[0.21, 0.46], [0.37, 0.45], [0.39, 0.57], [0.2, 0.58]]] },
    o: { w: 0.6, s: [[[0.06, 0.38], [0.2, 0.3], [0.42, 0.3], [0.56, 0.39], [0.6, 0.66], [0.55, 0.92], [0.4, 1.02], [0.2, 1.02], [0.05, 0.92], [0, 0.65]], [[0.23, 0.48], [0.38, 0.47], [0.4, 0.84], [0.21, 0.85]]] },
    t: { w: 0.47, s: [[[0.12, 0.13], [0.31, 0.07], [0.32, 0.33], [0.46, 0.33], [0.47, 0.5], [0.32, 0.51], [0.33, 0.82], [0.47, 0.82], [0.47, 1], [0.22, 1.02], [0.11, 0.9], [0.11, 0.51], [0, 0.51], [0, 0.34], [0.11, 0.33]]] },
    i: { w: 0.22, s: [[[0, 0.33], [0.2, 0.33], [0.22, 1], [0.01, 1]], [[0.01, 0.03], [0.21, 0.02], [0.2, 0.23], [0, 0.22]]] },
    n: { w: 0.56, s: [[[0, 0.33], [0.19, 0.33], [0.2, 0.41], [0.33, 0.3], [0.46, 0.33], [0.55, 0.45], [0.57, 1], [0.36, 1], [0.35, 0.53], [0.26, 0.49], [0.2, 0.56], [0.21, 1], [0, 1]]] },
  };

  FMI.add({
    id: 'type-cut',
    lane: 'Big type',
    name: 'Cut paper',
    blurb: 'Black paper strips jerk onto an orange sheet, a jagged paper arm snips them to length with scissors, and a teal spear sticks in to make the F.',
    dur: 3.5,
    ground: '#eee3ca',
    make(stage, kit) {
      const W = kit.w, H = kit.h, F = kit.F, hash = kit.hash;
      const g = kit.canvas({ alpha: false });
      const r = kit.rng(4107);
      const pat = (base, seed, st) => g.createPattern(paperTile(kit, base, seed, st), 'repeat');
      const BLACK = pat('#141110', 21, 0.75), CREAM = pat('#efe4cb', 22, 1.1), STEEL = pat('#a9b3ad', 23, 1.1), TEAL = pat('#29d9bb', 24, 1.0);

      // The sheet on the rostrum: flat orange, cloudy and fibrous, lit a little unevenly by two lamps.
      const sheet = kit.layer();
      {
        const x = sheet.g;
        x.fillStyle = x.createPattern(paperTile(kit, '#d8481b', 25, 1.05), 'repeat');
        x.fillRect(0, 0, W, H);
        const q = kit.rng(77);
        for (let i = 0; i < 26; i++) {
          x.fillStyle = (q() < 0.5 ? 'rgba(255,230,190,' : 'rgba(70,10,0,') + 0.012 + ')';
          x.beginPath();
          x.arc(q() * W, q() * H, 60 + q() * 160, 0, 6.3);
          x.fill();
        }
        const lamp = x.createLinearGradient(0, 0, W, H);
        lamp.addColorStop(0, 'rgba(255,220,170,.05)');
        lamp.addColorStop(0.55, 'rgba(255,220,170,0)');
        lamp.addColorStop(1, 'rgba(60,5,0,.14)');
        x.fillStyle = lamp;
        x.fillRect(0, 0, W, H);
      }
      // It starts on a cream sheet. The orange one gets shoved in over it from the left, by hand, in two pushes.
      const cream = kit.layer();
      cream.g.fillStyle = cream.g.createPattern(paperTile(kit, '#eee3ca', 26, 1.0), 'repeat');
      cream.g.fillRect(0, 0, W, H);
      const sheetEdge = (() => {
        const pts = [[-W * 1.4, -30], [0, -30]];
        let y = 0, flip = 1;
        while (y < H) {
          y += 40 + r() * 90;
          flip = -flip;
          pts.push([flip * (6 + r() * 16), y]);
        }
        pts.push([0, H + 30], [-W * 1.4, H + 30]);
        return pathOf([pts]);
      })();
      const SHEET_AT = { 2: 0.34, 3: 0.86 };

      // Layout. The word's cap height follows from its width, the F takes what is left.
      const word = ['F', 'r', 'e', 'e', 'M', 'o', 't', 'i', 'o', 'n'];
      const wordUnits = word.reduce((a, c) => a + CUT[c].w, 0) + 0.075 * 9;
      const cap = (W * 0.86) / wordUnits;
      const gap = Math.max(20, H * 0.034);
      const s = Math.min((W * 0.84) / F.box.w, (H - 60 - 110 - cap - gap - 12) / F.box.h);
      const fw = F.box.w * s, fh = F.box.h * s;
      const left = (W - fw) / 2;
      const top = 60 + Math.max(4, (H - 170 - fh - gap - cap) * 0.38);
      const u = s / 3.4;
      const tilt = 0.17, tanT = Math.tan(tilt);

      // Shadow and paper of one cut piece. The lit edge is the pale core of the paper showing where the scissors went.
      function paper(path, fill, x, y, rot, lift) {
        const o = (lift || 1) * u;
        g.save();
        g.translate(x + 2.8 * o, y + 3.4 * o);
        if (rot) g.rotate(rot);
        g.fillStyle = 'rgba(40,6,0,.13)';
        g.fill(path, 'evenodd');
        g.restore();
        g.save();
        g.translate(x + 1.4 * o, y + 1.7 * o);
        if (rot) g.rotate(rot);
        g.fillStyle = 'rgba(40,6,0,.27)';
        g.fill(path, 'evenodd');
        g.restore();
        g.save();
        g.translate(x, y);
        if (rot) g.rotate(rot);
        g.fillStyle = fill;
        g.fill(path, 'evenodd');
        g.strokeStyle = 'rgba(255,245,225,.17)';
        g.lineWidth = 0.7;
        g.stroke(path);
        g.restore();
      }

      // ---- The three strips, each one whole, then kept part and offcut along a nibbled scissor line.
      const ENDX = W + 60 * u - left;
      const rough = (x1, amp) => {
        const pts = [];
        let x = 0;
        while (x < x1) {
          pts.push([x, (r() - 0.5) * amp * 2]);
          x += 26 * u + r() * 70 * u;
        }
        pts.push([x1, (r() - 0.5) * amp * 2]);
        return pts;
      };
      const yAt = (pts, x) => {
        for (let i = 1; i < pts.length; i++) {
          if (x <= pts[i][0]) {
            const a = pts[i - 1], b = pts[i], p = (x - a[0]) / (b[0] - a[0] || 1);
            return a[1] + (b[1] - a[1]) * p;
          }
        }
        return pts[pts.length - 1][1];
      };
      const bars = F.clips.map((c, i) => {
        const bh = c.h * s, cx = c.w * s, y = top + (c.y - F.box.y) * s;
        const tp = rough(ENDX, 1.5 * u), bt = rough(ENDX, 1.5 * u).map((p) => [p[0], p[1] + bh]);
        const cutX = (yy) => cx + (yy - bh / 2) * tanT;
        const jag = [[0, 0], [0.31, 2.6], [0.355, -2.2], [0.67, 1.5], [0.72, -2.6], [1, 0]].map((j) => {
          const yy = bh * j[0];
          return [cutX(yy) + j[1] * u, yy];
        });
        jag[0][1] = yAt(tp, jag[0][0]);
        jag[jag.length - 1][1] = yAt(bt, jag[jag.length - 1][0]);
        const lt = [(r() - 0.5) * 3 * u, tp[0][1]], lb = [(r() - 0.5) * 4 * u, bt[0][1]];
        const whole = [lt].concat(tp.slice(1), bt.slice().reverse().slice(0, -1), [lb]);
        const kept = [lt].concat(tp.slice(1).filter((p) => p[0] < jag[0][0]), jag, bt.slice(1).filter((p) => p[0] < jag[jag.length - 1][0]).reverse(), [lb]);
        // The offcut pivots on its middle, so it is stored around that point.
        const offRaw = jag.slice().reverse().concat(tp.filter((p) => p[0] > jag[0][0]), bt.filter((p) => p[0] > jag[jag.length - 1][0]).reverse());
        const ox = (cx + ENDX) / 2, oy = bh / 2;
        const off = offRaw.map((p) => [p[0] - ox, p[1] - oy]);
        // Where the scissors' rivet goes for this cut: just under the strip, on the line of the cut.
        const py = y + bh + bh * 0.26;
        const px = left + cx + (py - (y + bh / 2)) * tanT;
        return { y, bh, cx, whole: pathOf([whole]), kept: pathOf([kept]), off: pathOf([off]), ox, oy, px, py };
      });

      const CUT_F = [15, 13, 9];
      const ARRIVE = [0, 2, 3];
      const u2 = u;
      const STAB = 20;
      const stepVal = (keys, f, dflt) => {
        let v = dflt;
        for (const k of keys) {
          if (f >= k[0]) v = k[1];
        }
        return v;
      };

      // Thin Golden Arm strips that stab in from top and bottom and get pulled away again.
      const stabs = [
        { x: W * 0.13, w: 11 * u, fromTop: true, keys: [[0, H * 0.58], [1, H * 0.66], [5, H * 0.2], [6, -10]] },
        { x: W * 0.74, w: 20 * u, fromTop: false, keys: [[1, H * 0.2], [2, H * 0.27], [4, H * 0.27], [5, H * 0.7], [6, H * 2]] },
        { x: W * 0.46, w: 7 * u, fromTop: true, keys: [[2, H * 0.34], [3, H * 0.86], [4, -10]] },
      ].map((b) => {
        const wob = () => (r() - 0.5) * 2.4 * u;
        b.path = pathOf([[[wob(), 0], [b.w + wob(), 0], [b.w + wob(), H * 1.3], [wob(), H * 1.3]]]);
        return b;
      });

      // ---- The arm and scissors, in L units with the rivet at the origin and the tips straight up. Rotated as one by tilt.
      const L = bars[0].bh * 1.62;
      const scaled = (pts) => pts.map((p) => [p[0] * L, p[1] * L]);
      const ringAt = (cx, cy, ro, ri) => {
        const out = [], inn = [];
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * 6.283 + 0.2;
          out.push([cx + Math.cos(a) * ro * (0.92 + r() * 0.16), cy + Math.sin(a) * ro * 1.12 * (0.92 + r() * 0.16)]);
        }
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * 6.283;
          inn.push([cx + Math.cos(a) * ri * (0.9 + r() * 0.2), cy + Math.sin(a) * ri * 1.15 * (0.9 + r() * 0.2)]);
        }
        return [out, inn];
      };
      const bladeA = pathOf([scaled([[0.015, -1.02], [-0.12, -0.3], [-0.13, -0.02], [-0.06, 0.1], [0.06, 0.08], [0.055, -0.04], [0.035, -0.7]])]);
      const bladeB = pathOf([scaled([[-0.015, -1.0], [0.125, -0.32], [0.13, -0.03], [0.06, 0.1], [-0.06, 0.08], [-0.05, -0.05], [-0.03, -0.72]])]);
      const handA = pathOf([scaled([[-0.05, 0.04], [0.05, 0.08], [-0.11, 0.72], [-0.21, 0.68]])].concat(ringAt(-0.25, 0.88, 0.2, 0.11).map(scaled)));
      const handB = pathOf([scaled([[0.05, 0.04], [-0.05, 0.08], [0.11, 0.72], [0.21, 0.68]])].concat(ringAt(0.25, 0.88, 0.2, 0.11).map(scaled)));
      const rivet = pathOf([scaled([[-0.035, -0.02], [0.012, -0.045], [0.04, 0.0], [0.01, 0.04], [-0.03, 0.03]])]);
      const armPath = pathOf([scaled([
        [-0.42, 0.94], [-0.56, 0.72], [-0.68, 0.7], [-0.74, 0.84], [-0.66, 1.0],
        [-0.6, 1.24], [-0.47, 1.44], [-0.4, 1.62], [-0.52, 1.86], [-0.4, 2.1], [-0.62, 2.46], [-0.48, 2.8], [-0.72, 3.3], [-0.58, 3.72], [-0.84, 4.4], [-0.66, 5.0], [-0.94, 5.9], [-0.8, 6.8], [-1, 9],
        [1.1, 9], [0.86, 6.9], [1.02, 6.0], [0.72, 5.1], [0.88, 4.5], [0.6, 3.8], [0.76, 3.3], [0.5, 2.84], [0.62, 2.4], [0.42, 2.06], [0.52, 1.82], [0.38, 1.6],
        [0.5, 1.38], [0.62, 1.14], [0.55, 0.94], [0.42, 0.86], [0.35, 0.95], [0.21, 0.84], [0.14, 0.94], [0.0, 0.84], [-0.07, 0.94], [-0.2, 0.85], [-0.27, 0.95],
      ])]);
      // Cut lines between the fingers, as thin slivers of black paper.
      const fingerCuts = pathOf([[[0.35, 0.95], [0.38, 1.3], [0.33, 1.3]], [[0.14, 0.94], [0.17, 1.32], [0.12, 1.32]], [[-0.07, 0.94], [-0.04, 1.3], [-0.09, 1.3]], [[-0.27, 0.95], [-0.24, 1.26], [-0.29, 1.26]]].map(scaled));

      const P = (i) => [bars[i].px, bars[i].py];
      const armKeys = {};
      {
        const [ax, ay] = P(2), [bx, by] = P(1), [cx, cy] = P(0);
        armKeys[5] = [ax + 44 * u2, ay + H * 0.42, 0.2];
        armKeys[6] = [ax + 15 * u2, ay + 26 * u2, 0.62];
        armKeys[7] = [ax - 3 * u2, ay - 5 * u2, 0.64];
        armKeys[8] = [ax, ay, 0.34];
        armKeys[9] = [ax, ay - 2 * u2, 0.03];
        armKeys[10] = [ax + 8 * u2, ay + 12 * u2, 0.34];
        armKeys[11] = [bx - 28 * u2, by + 30 * u2, 0.66];
        armKeys[12] = [bx, by, 0.42];
        armKeys[13] = [bx, by - 2 * u2, 0.03];
        armKeys[14] = [cx - 14 * u2, cy + 18 * u2, 0.6];
        armKeys[15] = [cx, cy - 2 * u2, 0.03];
        // Job done, and like a barber it gives one more snip at nothing before it leaves.
        armKeys[16] = [cx + 2 * u2, cy - 6 * u2, 0.6];
        armKeys[17] = [cx + 1 * u2, cy - 9 * u2, 0.03];
        armKeys[18] = [cx + 3 * u2, cy + 4 * u2, 0.3];
        armKeys[19] = [cx + 34 * u2, cy + H * 0.5, 0.3];
      }

      // ---- Trimmings: they drop and stay on the floor at the bottom of the sheet.
      const floors = [H - 26 * u, H - 44 * u, H - 22 * u];
      const rests = [-0.42, 0.13, -0.09];
      const restX = [W * 0.8, W * 0.66, W * 0.46];
      const GR = 3300 * u;

      // ---- The playhead: a thin teal spear, pinned at its bottom tip so it can shudder when it sticks.
      const hd = F.head;
      const hx = left + (hd.x - F.box.x) * s, hy = top + (hd.y + hd.h - F.box.y) * s;
      const hw = Math.max(hd.w * s * 1.15, 5);
      const spear = pathOf([[
        [(r() - 0.5) * u, 0], [hw + (r() - 0.5) * u, -1.5 * u], [hw + 0.6 * u, -hd.h * s],
        [(hd.tri[1][0] - hd.x) * s, (hd.tri[1][1] - hd.y - hd.h) * s],
        [(hd.tri[0][0] - hd.x) * s, (hd.tri[0][1] - hd.y - hd.h) * s],
        [(hd.tri[2][0] - hd.x) * s, (hd.tri[2][1] - hd.y - hd.h) * s + 1.5 * u],
        [-0.5 * u, -hd.h * s],
      ]]);
      const SHUD = [0.022, -0.016, 0.009, -0.005];

      // ---- The name, one piece of paper per letter, laid down in clumps.
      const laid = [22, 23, 24, 25, 22, 24, 23, 25, 26, 26];
      const letters = [];
      {
        let cur = (W - cap * wordUnits) / 2;
        const baseY = top + fh + gap;
        word.forEach((ch, i) => {
          const G = CUT[ch];
          const sz = cap * (0.96 + r() * 0.1);
          const subs = G.s.map((sp) => sp.map((p) => [(p[0] + (r() - 0.5) * 0.034 - G.w / 2) * sz, (p[1] + (r() - 0.5) * 0.034 - 0.5) * sz]));
          letters.push({ path: pathOf(subs), x: cur + (G.w / 2) * cap, y: baseY + 0.5 * cap + (r() - 0.5) * 0.1 * cap, rot: (r() - 0.5) * 0.16, f: laid[i], id: 200 + i });
          cur += (G.w + 0.075) * cap;
        });
      }

      return function seek(t) {
        const f = kit.frame(t, 8);
        const boil = (id, amp) => [(hash(f * 31 + id, 11) - 0.5) * amp * u, (hash(f * 37 + id, 13) - 0.5) * amp * u, (hash(f * 41 + id, 17) - 0.5) * 0.0042];
        if (f >= 4) {
          g.drawImage(sheet.canvas, 0, 0, W, H);
        } else {
          g.drawImage(cream.canvas, 0, 0, W, H);
          if (SHEET_AT[f]) {
            const ex = SHEET_AT[f] * W;
            g.save();
            g.translate(ex + 4 * u, 3 * u);
            g.fillStyle = 'rgba(50,30,0,.3)';
            g.fill(sheetEdge);
            g.restore();
            g.save();
            g.translate(ex, 0);
            g.clip(sheetEdge);
            g.translate(-ex, 0);
            g.drawImage(sheet.canvas, 0, 0, W, H);
            g.restore();
          }
        }

        stabs.forEach((b, i) => {
          const v = stepVal(b.keys, f, null);
          if (v === null || v <= 0 || v >= H * 1.5) return;
          const q = boil(10 + i, 1.2);
          const y = b.fromTop ? v - H * 1.3 : H - v;
          paper(b.path, BLACK, b.x + q[0], y + q[1], 0, 1);
        });

        // A hit from the spear jolts the whole F down the sheet.
        const jolt = f === STAB + 1 ? 3.4 * u : f === STAB + 2 ? 1.1 * u : 0;
        bars.forEach((b, i) => {
          const n = f - ARRIVE[i];
          if (n < 0) return;
          const dx = n === 0 ? W * 0.6 : n === 1 ? -8 * u : n === 2 ? 2.4 * u : 0;
          const q = boil(20 + i, 1.5);
          if (f < CUT_F[i]) {
            paper(b.whole, BLACK, left + dx + q[0], b.y + q[1], q[2] * 0.4, 1);
            return;
          }
          paper(b.kept, BLACK, left + q[0], b.y + q[1] + jolt, q[2] * 0.4, 1);
          // The offcut hangs for one frame, a hair apart, then goes.
          const q2 = boil(30 + i, 1.2);
          const dt = (f - CUT_F[i] - 1) / 8;
          const sx = left + b.ox, sy = b.y + b.oy;
          if (dt < 0) {
            paper(b.off, BLACK, sx + 3 * u, sy + 1.5 * u, 0.012, 1);
          } else {
            const h0 = floors[i] - sy;
            const tf = Math.sqrt((2 * h0) / GR);
            const yy = floors[i] - kit.bounceY(dt, h0, GR, 0.2);
            const pr = kit.clamp(dt / tf);
            const rot = rests[i] * Math.pow(pr, 1.25) + (pr < 1 ? 0.14 * Math.sin(pr * 4) * (i === 1 ? -1 : 1) : 0);
            const xx = kit.lerp(sx + 3 * u, restX[i], kit.ease.out2(pr));
            paper(b.off, BLACK, xx + q2[0] * 0.4, yy + q2[1] * 0.4, rot, pr < 1 ? 2.2 : 1);
          }
        });

        if (f >= STAB) {
          const n = f - STAB;
          const y = n === 0 ? -H * 0.34 : n === 1 ? 5 * u : n === 2 ? 1.2 * u : 0;
          const rot = n >= 1 && n <= 4 ? SHUD[n - 1] : 0;
          paper(spear, TEAL, hx, hy + y, rot, n === 0 ? 3 : 1);
        }

        letters.forEach((l) => {
          if (f < l.f) return;
          const n = f - l.f, q = boil(l.id, 0.8);
          const sc = n === 0 ? 1.13 : 1;
          g.save();
          g.translate(l.x + q[0], l.y + q[1] + (n === 0 ? -3 * u : 0));
          g.scale(sc, sc);
          paper(l.path, CREAM, 0, 0, l.rot + q[2], n === 0 ? 2.6 : 0.8);
          g.restore();
        });

        const a = armKeys[f];
        if (a) {
          g.save();
          g.translate(a[0], a[1]);
          g.rotate(-tilt);
          const th = a[2] / 2;
          paper(handB, TEAL, 0, 0, -th, 1.4);
          paper(bladeB, STEEL, 0, 0, -th, 1.4);
          paper(handA, TEAL, 0, 0, th, 1.4);
          paper(bladeA, STEEL, 0, 0, th, 1.4);
          paper(rivet, BLACK, 0, 0, 0, 0.3);
          paper(armPath, CREAM, 0, 0, 0, 2.2);
          g.fillStyle = BLACK;
          g.fill(fingerCuts, 'evenodd');
          g.restore();
        }

        // The lamp is never quite the same twice between exposures.
        const fl = hash(f, 77);
        g.fillStyle = fl > 0.5 ? 'rgba(255,235,200,' + (fl - 0.5) * 0.05 + ')' : 'rgba(30,0,0,' + (0.5 - fl) * 0.08 + ')';
        g.fillRect(0, 0, W, H);
      };
    },
  });

  // ==================================================================================================== SLAM
  FMI.add({
    id: 'type-slam',
    lane: 'Big type',
    name: 'Slam',
    blurb: 'FREE hits as four dead still cards, MOTION stutters and tears through the frame, then the F slams on as giant bars and snaps down to size.',
    dur: 3.1,
    ground: '#e8200f',
    make(stage, kit) {
      const W = kit.w, H = kit.h, F = kit.F, hash = kit.hash;
      const g = kit.canvas({ alpha: false });
      const RED = '#e4210f', YEL = '#ffd000', BLK = '#0b0a09', WHT = '#f6f2e6', TEAL = F.teal;
      const grainTile = kit.grainTile(256, 0.11, 31);
      const cache = {};
      function mt(str) {
        if (!cache[str]) {
          g.font = '400 400px Anton';
          const m = g.measureText(str);
          cache[str] = { l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent };
        }
        return cache[str];
      }
      // Fit the ink of str exactly into a rectangle in CSS pixels. The rectangle may run off the frame, that is the point.
      function ink(str, x0, y0, x1, y1, col) {
        const m = mt(str), sx = (x1 - x0) / (m.l + m.r), sy = (y1 - y0) / (m.a + m.d);
        g.save();
        g.translate(x0 + m.l * sx, y0 + m.a * sy);
        g.scale(sx, sy);
        g.font = '400 400px Anton';
        g.textAlign = 'left';
        g.textBaseline = 'alphabetic';
        g.fillStyle = col;
        g.fillText(str, 0, 0);
        g.restore();
      }
      const field = (c) => {
        g.fillStyle = c;
        g.fillRect(-4, -4, W + 8, H + 8);
      };
      // Fractions of the frame.
      const big = (str, gr, col, fx0, fy0, fx1, fy1, dx, dy) => {
        field(gr);
        ink(str, fx0 * W + (dx || 0), fy0 * H + (dy || 0), fx1 * W + (dx || 0), fy1 * H + (dy || 0), col);
      };
      // A letter that arrives moving: two frames of animator's multiples, then it stops dead and keeps creeping.
      const tear = (str, gr, col, rc, dirx, diry, n) => {
        field(gr);
        const x0 = rc[0] * W, y0 = rc[1] * H, x1 = rc[2] * W, y1 = rc[3] * H;
        const span = Math.abs(dirx) * W + Math.abs(diry) * H;
        if (n === 0) {
          for (let i = 3; i >= 0; i--) {
            const o = (0.17 + i * 0.09) * span;
            ink(str, x0 + dirx * o, y0 + diry * o, x1 + dirx * o, y1 + diry * o, col);
          }
        } else {
          const o = -(n - 1) * 0.014 * span;
          ink(str, x0 + dirx * o, y0 + diry * o, x1 + dirx * o, y1 + diry * o, col);
        }
      };
      const shake = (n, amp, seed) => {
        const k = n < 0 || n > 3 ? 0 : [1, 0.55, -0.3, 0.12][n];
        return [k * amp * (hash(seed, 3) < 0.5 ? -1 : 1), k * amp * 1.3 * (hash(seed, 5) < 0.5 ? -1 : 1)];
      };
      const sideways = (str, gr, col, n) => {
        field(gr);
        g.save();
        g.translate(W, 0);
        g.rotate(Math.PI / 2);
        ink(str, -0.015 * H, 0.0 * W - W * 0.02, H * 1.015, W * 1.02, col);
        g.restore();
      };
      const rowBand = (str, gr, col, y0, y1, dx) => {
        g.save();
        g.beginPath();
        g.rect(-4, y0, W + 8, y1 - y0);
        g.clip();
        g.fillStyle = gr;
        g.fillRect(-4, y0, W + 8, y1 - y0);
        ink(str, -0.015 * W + dx, y0 - (y1 - y0) * 0.02, 1.015 * W + dx, y1 + (y1 - y0) * 0.02, col);
        g.restore();
      };

      // The mark, drawn large and bar by bar.
      const bar = (i, S, X, Y, col) => {
        const c = F.clips[i];
        g.fillStyle = col;
        g.beginPath();
        g.roundRect(X + (c.x - F.box.x) * S, Y + (c.y - F.box.y) * S, c.w * S, c.h * S, c.r * S * 0.5);
        g.fill();
      };
      // The giant version: the three clips stretched into flags that fill the frame top to bottom, flush left, the long one
      // running out on the right. The next card snaps them back to the real proportions.
      const gX = W * 0.86 / (F.head.x - F.box.x), gY = (H * 1.02) / 80;
      const flag = (i, dx, dy, col) => {
        const c = F.clips[i];
        g.fillStyle = col;
        g.fillRect(dx, dy - H * 0.01 + (c.y - 20) * gY, c.w * gX, c.h * gY);
      };
      const flagHead = (dx, dy, col, wide) => {
        const hx = dx + (F.head.x - F.box.x) * gX;
        g.fillStyle = col;
        g.fillRect(hx - wide / 2, 0, wide, H);
        if (wide < W * 0.1) {
          g.beginPath();
          g.moveTo(hx - wide / 2, 58 + dy);
          g.lineTo(hx + wide * 2.2, 58 + H * 0.05 + dy);
          g.lineTo(hx - wide / 2, 58 + H * 0.1 + dy);
          g.closePath();
          g.fill();
        }
      };
      // The last card.
      // Everything goes as big as the safe area allows: the F runs the full width, the name is stretched tall to fill what is left.
      const nameM = mt('FreeMotion');
      const pad = W * 0.03, gapF = Math.max(10, H * 0.016);
      const nameW = W - 2 * pad, nameNatural = (nameW * (nameM.a + nameM.d)) / (nameM.l + nameM.r);
      const safe = H - 60 - 110 - 6;
      const fS = Math.min((W - 2 * pad) / F.box.w, (safe - nameNatural * 1.2 - gapF) / F.box.h);
      const nameH = Math.min(nameNatural * 2.1, safe - F.box.h * fS - gapF);
      const fTop = 60 + (safe - F.box.h * fS - gapF - nameH) * 0.45;
      const nameY = fTop + F.box.h * fS + gapF;
      const finalCard = (n, withName, nameN) => {
        field(YEL);
        const a = shake(n, W * 0.035, 61), b = shake(nameN, W * 0.022, 62);
        const dx = a[0] + b[0], dy = a[1] + b[1];
        const X = pad + dx, Y = fTop + dy;
        bar(0, fS, X, Y, BLK);
        bar(1, fS, X, Y, BLK);
        bar(2, fS, X, Y, BLK);
        // A fatter playhead than the logo's, it has to hold up against all this.
        const hd = F.head, hw = hd.w * fS * 1.7, hx = X + (hd.x - F.box.x) * fS, hy = Y + (hd.y - F.box.y) * fS;
        g.fillStyle = YEL;
        g.fillRect(hx - fS * 1.2, hy, hw + fS * 2.4, hd.h * fS);
        g.fillStyle = RED;
        g.fillRect(hx, hy - fS * 3.4, hw, hd.h * fS + fS * 3.4);
        g.beginPath();
        hd.tri.forEach((p, i) => {
          const px = X + (p[0] - F.box.x) * fS, py = Y + (p[1] - F.box.y) * fS;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        });
        g.closePath();
        g.fill();
        if (withName) ink('FreeMotion', pad + dx * 1.4, nameY + dy * 1.4, pad + nameW + dx * 1.4, nameY + nameH + dy * 1.4, BLK);
      };

      // [first frame at 24 fps, what to draw]. A quarter note is 10 frames, tap along.
      const cuts = [
        [0, () => big('F', RED, BLK, -0.14, -0.015, 1.02, 1.03)],
        [5, () => big('R', YEL, BLK, -0.03, 0.035, 1.08, 1.17)],
        [10, () => big('E', BLK, WHT, 0.03, -0.04, 1.2, 1.04)],
        [13, () => big('E', WHT, RED, -0.2, 0.0, 1.0, 1.12)],
        [15, () => sideways('FREE', RED, WHT)],
        // MO, MO, TION: a stutter edit, the way a loud trailer treats a word.
        [20, (n) => tear('M', YEL, BLK, [-0.05, 0.0, 1.05, 1.02], 1, 0, n)],
        [23, (n) => tear('O', BLK, WHT, [-0.06, -0.03, 1.06, 1.03], 0, -1, n)],
        [26, (n) => tear('M', WHT, BLK, [-0.12, -0.04, 1.0, 1.08], -1, 0, n)],
        [28, (n) => tear('O', RED, YEL, [-0.02, -0.06, 1.12, 1.03], 0, 1, n)],
        [30, (n) => tear('T', WHT, RED, [-0.04, -0.02, 1.04, 1.1], -1, 0, n)],
        [32, (n) => tear('I', RED, YEL, [0.2, -0.05, 0.8, 1.05], 0, 1, n)],
        [34, (n) => {
          // The O zooms through its own hole, in three hard steps, into the next card's yellow.
          const z = n === 0 ? 1 : n === 1 ? 2.1 : 6;
          const cx = 0.5, cy = 0.5;
          big('O', YEL, BLK, cx - 0.56 * z, cy - 0.52 * z, cx + 0.56 * z, cy + 0.52 * z);
        }],
        [37, (n) => tear('N', YEL, BLK, [-0.04, -0.01, 1.04, 1.03], -0.7, -0.7, n)],
        [40, (n) => {
          field(BLK);
          const b = H / 3;
          const sl = (m) => (m < 0 ? null : m === 0 ? W * 0.55 : m === 1 ? -W * 0.02 : 0);
          const a0 = sl(n), a1 = sl(n - 2), a2 = sl(n - 4);
          if (a0 !== null) rowBand('MO', BLK, YEL, 0, b + 1, a0);
          if (a1 !== null) rowBand('TI', WHT, BLK, b, 2 * b + 1, -a1);
          if (a2 !== null) rowBand('ON', RED, WHT, 2 * b, H, a2);
        }],
        [50, (n) => {
          field(BLK);
          flag(0, n === 0 ? W * 0.55 : 0, 0, YEL);
        }],
        [53, (n) => {
          field(BLK);
          flag(0, 0, 0, YEL);
          flag(1, n === 0 ? -W * 0.5 : 0, 0, WHT);
        }],
        [56, (n) => {
          field(BLK);
          flag(0, 0, 0, YEL);
          flag(1, 0, 0, WHT);
          flag(2, n === 0 ? W * 0.3 : 0, 0, RED);
        }],
        [58, (n) => {
          field(BLK);
          const a = shake(n - 1, W * 0.04, 58);
          flag(0, a[0], a[1], YEL);
          flag(1, a[0], a[1], WHT);
          flag(2, a[0], a[1], RED);
          flagHead(a[0], a[1], TEAL, n === 0 ? W * 0.16 : W * 0.042);
        }],
        [60, (n) => finalCard(n, false, -1)],
        [70, (n) => finalCard(9, true, n)],
      ];

      return function seek(t) {
        const f = kit.frame(t, 24);
        let c = cuts[0];
        for (let i = 0; i < cuts.length; i++) {
          if (f >= cuts[i][0]) c = cuts[i];
        }
        // Shot on a rostrum: each frame sits a hair differently in the gate, even a dead still one.
        g.save();
        g.translate((hash(f, 91) - 0.5) * 1.3, (hash(f, 92) - 0.5) * 1.7);
        c[1](f - c[0]);
        g.restore();
        kit.grain(g, grainTile, f, 0.55);
      };
    },
  });

  // ==================================================================================================== SPLIT-FLAP
  FMI.add({
    id: 'type-board',
    lane: 'Big type',
    name: 'Departure board',
    blurb: 'A Perth train departures board clatters flap by flap until FREO has become FREE, MOSMAN has become MOTION, and the empty rows land the F in flap tiles.',
    dur: 3.35,
    ground: '#0a0a09',
    make(stage, kit) {
      const W = kit.w, H = kit.h, F = kit.F, dpr = kit.dpr;
      const g = kit.canvas({ alpha: false });
      const r = kit.rng(2207);
      const COLS = 6;
      const mx = Math.max(6, W * 0.018), gx = Math.max(1.5, W * 0.005);
      const tw = (W - 2 * mx - (COLS - 1) * gx) / COLS;
      const rail = Math.max(3.5, W * 0.013);
      const TOP = 62;
      const pitch = Math.min(tw * 1.34 + rail, (H - 110 - TOP - 2) / 6.3);
      const th = pitch - rail;
      const wordY = TOP + Math.max(0, H - 110 - TOP - 6.3 * pitch) * 0.4;

      // Rows run from above the top of the screen to below the bottom. wordRow is the row that says FREE.
      const above = Math.ceil(wordY / pitch);
      const rowsN = above + Math.ceil((H - wordY) / pitch) + 1;
      const wordRow = above;
      const rowY = (i) => wordY + (i - wordRow) * pitch;
      const colX = (c) => mx + c * (tw + gx);

      // Where the mark is printed, across the flaps. Long clip sits in the row 3 below FREE.
      const longRow = wordRow + 3;
      const uy = pitch / 29;
      const ux = Math.min(uy * 1.2, (W - 2 * mx - 10) / F.box.w);
      const mX = (v) => colX(0) + 5 + (v - F.box.x) * ux;
      const mY = (v) => rowY(longRow) + th / 2 + (v - 31) * uy;
      const headRects = [
        [mX(F.head.tri[0][0]), mY(F.head.tri[0][1]), mX(F.head.tri[1][0]), mY(F.head.tri[2][1])],
        [mX(F.head.x) - 1.5, mY(F.head.y), mX(F.head.x + F.head.w) + 1.5, mY(F.head.y + F.head.h)],
      ];
      const barRects = F.clips.map((c) => [mX(c.x), mY(c.y), mX(c.x + c.w), mY(c.y + c.h)]);
      const over = (a, x0, y0, x1, y1) => a[0] < x1 && a[2] > x0 && a[1] < y1 && a[3] > y0;

      // ---- The drum every tile carries, in order. Three coloured flaps sit after the digits, as real boards had.
      const DRUM = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789rgy'.split('');
      const N = DRUM.length;
      const pos = {};
      DRUM.forEach((c, i) => { pos[c] = i; });

      const cw = Math.ceil(tw) + 2, ch = Math.ceil(th) + 2;
      const PERROW = 11;
      const artTiles = [];
      for (let i = longRow - 1; i <= longRow + 3; i++) {
        for (let c = 0; c < COLS; c++) {
          const x0 = colX(c), y0 = rowY(i), x1 = x0 + tw, y1 = y0 + th + rail;
          if (barRects.concat(headRects).some((a) => over(a, x0, y0 - 1, x1, y1))) artTiles.push({ i, c, id: N + artTiles.length });
        }
      }
      const glyphCount = N + artTiles.length;
      const atlas = kit.layer(PERROW * cw, Math.ceil(glyphCount / PERROW) * ch);
      const ax = atlas.g;
      const cellX = (id) => (id % PERROW) * cw + 1;
      const cellY = (id) => Math.floor(id / PERROW) * ch + 1;

      const FONT = "'Archivo Black'";
      ax.font = '400 200px ' + FONT;
      const capM = ax.measureText('H');
      const px = ((th * 0.67) / capM.actualBoundingBoxAscent) * 200;

      function flapBase(id, topA, topB, botA, botB) {
        const X = cellX(id), Y = cellY(id);
        ax.save();
        ax.beginPath();
        ax.roundRect(X, Y, tw, th, Math.max(1.5, tw * 0.035));
        ax.clip();
        const gt = ax.createLinearGradient(0, Y, 0, Y + th / 2);
        gt.addColorStop(0, topA);
        gt.addColorStop(1, topB);
        ax.fillStyle = gt;
        ax.fillRect(X, Y, tw, th / 2);
        const gb = ax.createLinearGradient(0, Y + th / 2, 0, Y + th);
        gb.addColorStop(0, botA);
        gb.addColorStop(0.3, botB);
        gb.addColorStop(1, botB);
        ax.fillStyle = gb;
        ax.fillRect(X, Y + th / 2, tw, th / 2);
        return [X, Y];
      }
      function flapFinish(id) {
        const X = cellX(id), Y = cellY(id), q = kit.rng(id * 7 + 3);
        // Years of wear: a few nicks in the print, a rub along the bottom edge.
        for (let i = 0; i < 16; i++) {
          ax.fillStyle = q() < 0.6 ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.06)';
          ax.fillRect(X + q() * tw, Y + q() * th, 0.5 + q() * 1.6, 0.5 + q() * 0.8);
        }
        const rub = ax.createLinearGradient(0, Y + th * 0.88, 0, Y + th);
        rub.addColorStop(0, 'rgba(255,255,255,0)');
        rub.addColorStop(1, 'rgba(255,255,255,.05)');
        ax.fillStyle = rub;
        ax.fillRect(X, Y + th * 0.88, tw, th * 0.12);
        // The split, and the notches each side where the flap's pins sit in the drum.
        ax.fillStyle = 'rgba(0,0,0,.95)';
        ax.fillRect(X, Y + th / 2 - 0.7, tw, 1.4);
        ax.fillStyle = 'rgba(255,255,255,.07)';
        ax.fillRect(X, Y + th / 2 + 0.7, tw, 0.7);
        const nh = Math.max(3.5, th * 0.075), nw = Math.max(1.5, tw * 0.03);
        ax.fillStyle = '#000';
        ax.fillRect(X, Y + th / 2 - nh / 2, nw, nh);
        ax.fillRect(X + tw - nw, Y + th / 2 - nh / 2, nw, nh);
        ax.restore();
      }
      const INK = '#f6f1e3';
      const FLAP = ['#383633', '#272523', '#171614', '#262421'];
      DRUM.forEach((c, id) => {
        if (c === 'r' || c === 'g' || c === 'y') {
          const col = { r: ['#c7301f', '#b12a1b', '#8d2015', '#ab2a1b'], g: ['#2f8a54', '#287a49', '#1d5f38', '#26734a'], y: ['#e7b21d', '#d6a418', '#b08612', '#cf9e17'] }[c];
          flapBase(id, col[0], col[1], col[2], col[3]);
          flapFinish(id);
          return;
        }
        const [X, Y] = flapBase(id, FLAP[0], FLAP[1], FLAP[2], FLAP[3]);
        if (c !== ' ') {
          ax.font = '400 ' + px + 'px ' + FONT;
          ax.textBaseline = 'alphabetic';
          ax.textAlign = 'left';
          const m = ax.measureText(c);
          const inkW = m.actualBoundingBoxRight + m.actualBoundingBoxLeft;
          // Wide letters are drawn condensed to fit their flap, as they were on the real thing.
          const sq = Math.min(1, (tw * 0.82) / inkW);
          ax.save();
          ax.translate(X + (tw - inkW * sq) / 2 + m.actualBoundingBoxLeft * sq, Y + (th + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
          ax.scale(sq, 1);
          ax.fillStyle = INK;
          ax.fillText(c, 0, 0);
          ax.restore();
          // The print sits under the same light as the flap, a little dimmer just under the hinge.
          const dim = ax.createLinearGradient(0, Y + th / 2, 0, Y + th * 0.7);
          dim.addColorStop(0, 'rgba(0,0,0,.2)');
          dim.addColorStop(1, 'rgba(0,0,0,0)');
          ax.fillStyle = dim;
          ax.fillRect(X, Y + th / 2, tw, th * 0.2);
        }
        flapFinish(id);
      });
      // The art flaps: the mark printed across several tiles, cut by the gaps between them.
      const artOf = {};
      artTiles.forEach((a) => {
        const [X, Y] = flapBase(a.id, FLAP[0], FLAP[1], FLAP[2], FLAP[3]);
        artOf[a.i + ':' + a.c] = a.id;
        ax.save();
        ax.translate(X - colX(a.c), Y - rowY(a.i));
        const grade = ax.createLinearGradient(0, mY(20), 0, mY(100));
        grade.addColorStop(0, '#f0bc22');
        grade.addColorStop(1, '#d59d14');
        ax.fillStyle = grade;
        F.clips.forEach((c) => {
          ax.beginPath();
          ax.roundRect(mX(c.x), mY(c.y), c.w * ux, c.h * uy, c.r * ux);
          ax.fill();
        });
        const hx0 = mX(F.head.x), hw = Math.max(3, F.head.w * ux);
        ax.fillStyle = '#1a1917';
        ax.fillRect(hx0 - 1.5, mY(F.head.y), hw + 3, F.head.h * uy);
        ax.fillStyle = F.teal;
        ax.fillRect(hx0, mY(F.head.y), hw, F.head.h * uy);
        ax.beginPath();
        ax.moveTo(mX(F.head.tri[0][0]), mY(F.head.tri[0][1]));
        ax.lineTo(mX(F.head.tri[1][0]), mY(F.head.tri[1][1]));
        ax.lineTo(mX(F.head.tri[2][0]), mY(F.head.tri[2][1]));
        ax.closePath();
        ax.fill();
        ax.restore();
        flapFinish(a.id);
      });

      // ---- What the board says at the start. Perth stations cut to six flaps, the way a board abbreviates.
      const START = {
        '-2': 'ELLNBK', '-1': 'PERTH1', 0: 'FREO 2', 1: 'MOSMAN', 2: 'SUBI 3', 3: 'BUTLER', 4: 'MIDLND', 5: 'ROCKHM', 6: 'JOONDL', 7: 'ARMDLE', 8: 'COTT 4', 9: 'KWINAN', 10: 'THRNLI', 11: 'WARWCK',
      };
      const TARGET = { 0: 'FREE  ', 1: 'MOTION' };

      // Every tile gets a table of flip times up front, so any frame can be drawn from t alone.
      // A word tile that already reads right never moves at all: that is the joke.
      const tiles = [];
      function plan(startId, endId, isArt, land, earliest, rate) {
        const from = pos[DRUM[startId]], to = isArt ? 0 : pos[DRUM[endId]];
        let n = (to - from + N) % N;
        const span = Math.max(0.05, land - earliest);
        const extraFlip = isArt ? 1 : 0;
        // Whole extra turns of the drum, as many as fit at about this tile's speed. A tile with time to spare starts later.
        while ((n + N + extraFlip) / span <= rate * 1.2) n += N;
        const real = Math.max(rate, (n + extraFlip) / span);
        const ts = [], seq = [startId];
        const begin = land - (n + extraFlip) / real;
        // Now and then a tile catches on something for a moment, then catches up by having set off that bit sooner.
        const hicDur = 0.05 + r() * 0.09;
        const hic = r() < 0.34 && begin - hicDur > 0.03 ? Math.floor(r() * n) : -1;
        for (let i = 0; i < n; i++) {
          const jit = (r() - 0.5) * 0.36;
          let at = begin + (i + jit) / real;
          if (hic >= 0 && i < hic) at -= hicDur;
          ts.push(Math.max(0.02, at));
          seq.push((from + i + 1) % N);
        }
        if (isArt) {
          ts.push(land);
          seq.push(endId);
        } else if (n) {
          ts[n - 1] = land;
        }
        const fold = kit.clamp(0.62 / real, 0.03, 0.075);
        return { ts, seq, fold };
      }
      const LATE = [2.1, 2.3, 2.5];
      for (let i = 0; i < rowsN; i++) {
        const k = i - wordRow;
        const start = (START[k] || 'PERTH ').padEnd(COLS, ' ');
        const target = TARGET[k] || '';
        const rowRate = 20 + r() * 14;
        const rowEarly = 0.05 + r() * 0.34;
        const rowLand = 0.7 + r() * 1.0;
        for (let c = 0; c < COLS; c++) {
          const s = pos[start[c]];
          let tile;
          const art = artOf[i + ':' + c];
          if (art !== undefined) {
            let land;
            const inHead = headRects.some((a) => over(a, colX(c), rowY(i) - 1, colX(c) + tw, rowY(i) + th + rail));
            const barRow = i - longRow;
            if (inHead) land = 2.72 + (i - (longRow - 1)) * 0.085 + r() * 0.03;
            else land = LATE[kit.clamp(barRow, 0, 2)] + c * (0.055 + r() * 0.04) + r() * 0.03;
            tile = plan(s, art, true, land, 0.08 + r() * 0.5, rowRate);
          } else if (target) {
            const want = pos[target[c]];
            if (want === s) tile = { ts: [], seq: [s], fold: 0.05 };
            else if (k === 0) tile = plan(s, want, false, c === 3 ? 1.08 : 0.62, c === 3 ? 0.1 : 0.25, 27);
            else tile = plan(s, want, false, c === 2 ? 1.5 : c === 3 ? 1.72 : c === 4 ? 1.9 : 1.05, 0.2 + c * 0.03, 26);
          } else {
            tile = plan(s, 0, false, rowLand + (r() - 0.3) * 0.6, rowEarly + r() * 0.2, rowRate * (0.86 + r() * 0.28));
          }
          tile.bounce = 0.55 + r() * 0.5;
          tile.x = colX(c);
          tile.y = rowY(i);
          tiles.push(tile);
        }
      }

      // ---- The housing: painted steel behind, an aluminium rail with rivets under each row.
      const back = kit.layer();
      {
        const x = back.g;
        x.fillStyle = '#080807';
        x.fillRect(0, 0, W, H);
        for (let i = 0; i < rowsN; i++) {
          const y = rowY(i) + th;
          const rg = x.createLinearGradient(0, y, 0, y + rail);
          rg.addColorStop(0, '#050505');
          rg.addColorStop(0.2, '#5a5853');
          rg.addColorStop(0.5, '#3b3a36');
          rg.addColorStop(1, '#141412');
          x.fillStyle = rg;
          x.fillRect(0, y, W, rail);
          for (let c = 0; c <= COLS; c++) {
            const rx = c === 0 ? mx * 0.5 : c === COLS ? W - mx * 0.5 : colX(c) - gx / 2;
            x.fillStyle = '#16140f';
            x.beginPath();
            x.arc(rx, y + rail / 2, rail * 0.3, 0, 6.3);
            x.fill();
            x.fillStyle = 'rgba(255,255,255,.28)';
            x.fillRect(rx - rail * 0.14, y + rail * 0.3, rail * 0.14, rail * 0.14);
          }
        }
      }
      // Fluorescent tubes above the board: brighter at the top, falling away, and a wide dull sheen across the flaps.
      const light = kit.layer();
      {
        const x = light.g;
        const lg = x.createLinearGradient(0, 0, 0, H);
        lg.addColorStop(0, 'rgba(255,248,230,.075)');
        lg.addColorStop(0.3, 'rgba(255,248,230,.015)');
        lg.addColorStop(0.62, 'rgba(0,0,0,.06)');
        lg.addColorStop(1, 'rgba(0,0,0,.34)');
        x.fillStyle = lg;
        x.fillRect(0, 0, W, H);
        const sh = x.createLinearGradient(0, 0, W, 0);
        sh.addColorStop(0, 'rgba(0,0,0,.12)');
        sh.addColorStop(0.4, 'rgba(255,255,255,.012)');
        sh.addColorStop(1, 'rgba(0,0,0,.16)');
        x.fillStyle = sh;
        x.fillRect(0, 0, W, H);
      }

      const sw = tw * dpr, sh = th * dpr;
      const srcX = (id) => cellX(id) * dpr, srcY = (id) => cellY(id) * dpr;
      const topHalf = (id, x, y) => g.drawImage(atlas.canvas, srcX(id), srcY(id), sw, sh / 2, x, y, tw, th / 2);
      const botHalf = (id, x, y) => g.drawImage(atlas.canvas, srcX(id), srcY(id) + sh / 2, sw, sh / 2, x, y + th / 2, tw, th / 2);
      const STRIPS = 4;
      // A flap folding on its hinge. ang is 0 when it lies flat, PI/2 edge on. Its free edge swings at the viewer, so that edge is wider.
      function foldTop(id, x, y, ang) {
        const c = Math.cos(ang), si = Math.sin(ang), hh = (th / 2) * c, hinge = y + th / 2;
        for (let j = 0; j < STRIPS; j++) {
          const a = j / STRIPS, b = (j + 1) / STRIPS;
          const wide = 1 + 0.2 * si * b, dw = tw * wide;
          g.drawImage(atlas.canvas, srcX(id), srcY(id) + (sh / 2) * (1 - b), sw, (sh / 2) * (b - a), x - (dw - tw) / 2, hinge - hh * b, dw, hh * (b - a) + 0.5);
        }
        g.fillStyle = 'rgba(0,0,0,' + si * 0.62 + ')';
        const e = tw * 0.1 * si;
        g.beginPath();
        g.moveTo(x, hinge);
        g.lineTo(x + tw, hinge);
        g.lineTo(x + tw + e, hinge - hh);
        g.lineTo(x - e, hinge - hh);
        g.closePath();
        g.fill();
      }
      function foldBot(id, x, y, ang) {
        const c = Math.cos(ang), si = Math.sin(ang), hh = (th / 2) * c, hinge = y + th / 2;
        for (let j = 0; j < STRIPS; j++) {
          const a = j / STRIPS, b = (j + 1) / STRIPS;
          const wide = 1 + 0.2 * si * b, dw = tw * wide;
          g.drawImage(atlas.canvas, srcX(id), srcY(id) + sh / 2 + (sh / 2) * a, sw, (sh / 2) * (b - a), x - (dw - tw) / 2, hinge + hh * a - 0.25, dw, hh * (b - a) + 0.5);
        }
        // Tipping up to the tubes overhead it catches the light, then settles.
        g.fillStyle = 'rgba(255,250,235,' + si * 0.14 + ')';
        const e = tw * 0.1 * si;
        g.beginPath();
        g.moveTo(x, hinge);
        g.lineTo(x + tw, hinge);
        g.lineTo(x + tw + e, hinge + hh);
        g.lineTo(x - e, hinge + hh);
        g.closePath();
        g.fill();
      }

      return function seek(t) {
        g.drawImage(back.canvas, 0, 0, W, H);
        for (let q = 0; q < tiles.length; q++) {
          const T = tiles[q], x = T.x, y = T.y, ts = T.ts;
          if (y > H || y + th < 0) continue;
          let lo = 0, hi = ts.length;
          while (lo < hi) {
            const m = (lo + hi) >> 1;
            if (ts[m] <= t) lo = m + 1;
            else hi = m;
          }
          const idx = lo;
          if (idx === 0) {
            topHalf(T.seq[0], x, y);
            botHalf(T.seq[0], x, y);
            continue;
          }
          const isLast = idx === ts.length;
          const fold = isLast ? 0.13 : T.fold;
          const p = (t - ts[idx - 1]) / fold;
          const prev = T.seq[idx - 1], next = T.seq[idx];
          if (p >= 1) {
            if (isLast) {
              // The flap has landed and bounces twice on its stop before it lies still.
              const after = t - ts[idx - 1] - fold;
              const b = after < 0.05 ? Math.sin((after / 0.05) * Math.PI) * 0.5 : after < 0.085 ? Math.sin(((after - 0.05) / 0.035) * Math.PI) * 0.2 : 0;
              if (b > 0) {
                topHalf(next, x, y);
                botHalf(prev, x, y);
                foldBot(next, x, y, b * T.bounce);
                continue;
              }
            }
            topHalf(next, x, y);
            botHalf(next, x, y);
            continue;
          }
          // Mid-flip: the new top is uncovered behind, the old bottom waits to be covered.
          topHalf(next, x, y);
          botHalf(prev, x, y);
          const a = Math.PI * Math.pow(p, 1.55);
          if (a < Math.PI / 2) {
            g.fillStyle = 'rgba(0,0,0,' + Math.cos(a) * 0.3 + ')';
            g.fillRect(x, y + th * 0.06, tw, th * 0.44);
            foldTop(prev, x, y, a);
          } else {
            const b = Math.PI - a;
            g.fillStyle = 'rgba(0,0,0,' + Math.cos(b) * 0.42 + ')';
            g.fillRect(x, y + th / 2, tw, th / 2);
            foldBot(next, x, y, b);
          }
        }
        g.drawImage(light.canvas, 0, 0, W, H);
      };
    },
  });
})();
