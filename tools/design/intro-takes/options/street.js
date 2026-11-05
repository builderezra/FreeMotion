// Street and print. Four takes: a cardboard stencil on concrete, a two-ink press pass, a pixel console boot, and a
// ransom note. Every take draws its frame from t alone. Costly things are drawn once in make().
(function () {
  const LANE = 'Street and print';
  const TAU = Math.PI * 2;

  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }
  function randTile(kit, seed) {
    const a = new Float32Array(65536), r = kit.rng(seed);
    for (let i = 0; i < 65536; i++) a[i] = r();
    return a;
  }
  function noiseOf(tile) {
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const x0 = xi & 255, x1 = (x0 + 1) & 255, y0 = (yi & 255) << 8, y1 = ((yi + 1) & 255) << 8;
      const A = tile[y0 | x0], B = tile[y0 | x1], C = tile[y1 | x0], D = tile[y1 | x1];
      return A + (B - A) * sx + (C - A) * sy + (A - B - C + D) * sx * sy;
    };
  }
  // A blurred copy of a canvas's alpha, made by shrinking and growing it. Used only in make(), and it works on iPhone,
  // where canvas filters do not.
  function softAlpha(src, shift) {
    const a = cv(src.width >> shift, src.height >> shift), ax = a.getContext('2d');
    ax.imageSmoothingEnabled = true;
    ax.imageSmoothingQuality = 'high';
    ax.drawImage(src, 0, 0, a.width, a.height);
    const b = cv(src.width, src.height), bx = b.getContext('2d');
    bx.imageSmoothingEnabled = true;
    bx.imageSmoothingQuality = 'high';
    bx.drawImage(a, 0, 0, b.width, b.height);
    return bx.getImageData(0, 0, b.width, b.height).data;
  }
  // Turns a clean shape into something that was really put down with ink or paint: the edge breaks up on noise, the body
  // varies in density, and small flecks of nothing show through. Done once, per pixel, in make().
  function roughen(src, o) {
    const W = src.width, H = src.height, near = softAlpha(src, o.near), far = o.far ? softAlpha(src, o.far) : null;
    const out = cv(W, H), x = out.getContext('2d'), im = x.createImageData(W, H), d = im.data;
    const T = o.tile, n = o.noise, rgb = o.rgb, sc = o.scale || 1, edge = o.edge === undefined ? 0.7 : o.edge;
    for (let py = 0, i = 0; py < H; py++) {
      for (let px = 0; px < W; px++, i += 4) {
        const a1 = near[i + 3] / 255, a2 = far ? far[i + 3] / 255 : 0;
        if (a1 === 0 && a2 === 0) continue;
        const r1 = T[(px & 255) | ((py & 255) << 8)], r2 = T[((px + 97) & 255) | (((py + 41) & 255) << 8)];
        let cov = 0;
        if (a1 > 0.5 + (r1 - 0.5) * edge) {
          const blot = n(px / (34 * sc), py / (34 * sc));
          cov = (o.floor || 0.84) + (1 - (o.floor || 0.84)) * blot;
          if (o.thin) {
            const th = o.thin(px / sc, py / sc);
            if (r2 < th) cov *= 0.25 + r1 * 0.5;
          } else if (r2 < (o.salt || 0)) cov *= 0.35;
          if (o.streak) cov *= o.streak(px / sc);
        } else if (far && r2 < a2 * a2 * (o.mist || 0.16)) {
          cov = 0.45 + 0.45 * r1;
        }
        if (cov > 0) {
          d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = cov * 255;
        }
      }
    }
    x.putImageData(im, 0, 0);
    return out;
  }
  function tinted(src, color) {
    const c = cv(src.width, src.height), x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function logScale(d) { return Math.max(1, Math.round(Math.log2(Math.max(1, d))) + 1); }

  // ---------------------------------------------------------------------------------------------------------------
  // (a) STENCIL
  // ---------------------------------------------------------------------------------------------------------------
  function buildWall(kit, W, H) {
    const tile = randTile(kit, 11), n = noiseOf(tile);
    const base = cv(W, H), bx = base.getContext('2d'), im = bx.createImageData(base.width, base.height), d = im.data;
    const bh = Math.max(130, H * 0.235), off = [];
    for (let i = 0; i < 12; i++) off.push(kit.hash(i, 5) * 16 - 8);
    for (let y = 0, i = 0; y < base.height; y++) {
      const board = Math.floor((y + 40) / bh), by = y + 40 - board * bh;
      const lift = by < 2.5 ? -30 * (1 - by / 2.5) : by > bh - 1.5 ? 10 : 0;
      for (let x = 0; x < base.width; x++, i += 4) {
        const a = n(x / 170, y / 170) * 0.6 + n(x / 70 + 13, y / 70) * 0.3 + n(x / 32, y / 32 + 7) * 0.1 - 0.5;
        const b = n(x / 15 + 31, y / 15) - 0.5;
        const streak = n(x / 6 + 9, y / 190) - 0.5;
        const c = tile[(x & 255) | ((y & 255) << 8)] - 0.5;
        const v = 172 + off[board] + a * 80 + b * 16 + streak * (4 + 12 * (by / bh)) + c * 22 + lift;
        d[i] = v + 2; d[i + 1] = v; d[i + 2] = v - 6; d[i + 3] = 255;
      }
    }
    bx.putImageData(im, 0, 0);
    const L = kit.layer(W, H), x = L.g, r = kit.rng(23);
    x.drawImage(base, 0, 0, W, H);
    // Water stains running down from the form lines.
    for (let i = 0; i < 16; i++) {
      const sx = r() * W, sy = Math.floor(r() * 5) * bh - 40, sl = bh * (0.4 + r() * 1.1), sw = 3 + r() * 16, strength = 0.05 + r() * 0.09;
      // A stain is many thin runs, each its own length, never one rectangle.
      for (let j = 0; j < 12; j++) {
        const lx = sx + (r() + r() - 1) * sw, ll = sl * (0.35 + r() * 0.65), lw = 0.8 + r() * 2.6;
        const gr = x.createLinearGradient(0, sy, 0, sy + ll);
        gr.addColorStop(0, 'rgba(40,36,28,' + strength + ')');
        gr.addColorStop(1, 'rgba(40,36,28,0)');
        x.fillStyle = gr;
        x.fillRect(lx, sy, lw, ll);
      }
    }
    // Plywood grain printed into the pour.
    x.lineWidth = 0.7;
    for (let i = 0; i < 46; i++) {
      const gy = r() * H, gx = r() * W * 0.8 - 40, gl = 60 + r() * W * 0.8;
      x.strokeStyle = 'rgba(50,46,40,' + (0.05 + r() * 0.09) + ')';
      x.beginPath();
      x.moveTo(gx, gy);
      x.quadraticCurveTo(gx + gl / 2, gy + (r() - 0.5) * 10, gx + gl, gy + (r() - 0.5) * 4);
      x.stroke();
    }
    // Lips on the form lines, where the boards met.
    for (let b = 0; b < 8; b++) {
      const fy = b * bh - 40;
      x.strokeStyle = 'rgba(30,27,22,.5)';
      x.lineWidth = 1;
      x.beginPath();
      for (let px = -4; px <= W + 4; px += 18) { const yy = fy + (kit.hash(px, b + 3) - 0.5) * 1.6; if (px < 0) x.moveTo(px, yy); else x.lineTo(px, yy); }
      x.stroke();
      x.strokeStyle = 'rgba(235,232,222,.32)';
      x.beginPath();
      for (let px = -4; px <= W + 4; px += 18) { const yy = fy + 1.4 + (kit.hash(px, b + 3) - 0.5) * 1.6; if (px < 0) x.moveTo(px, yy); else x.lineTo(px, yy); }
      x.stroke();
    }
    // Pin holes and air pockets, each with a little lit lip below it.
    for (let i = 0; i < 1500; i++) {
      const px = r() * W, py = r() * H, s = 0.35 + Math.pow(r(), 3) * 1.8;
      x.fillStyle = 'rgba(28,25,20,' + (0.3 + r() * 0.45) + ')';
      x.beginPath(); x.ellipse(px, py, s, s * (0.6 + r() * 0.6), r() * 3, 0, TAU); x.fill();
      if (s > 0.9) { x.fillStyle = 'rgba(240,238,228,.3)'; x.beginPath(); x.ellipse(px + 0.3, py + s, s * 0.8, 0.5, 0, 0, TAU); x.fill(); }
    }
    for (let i = 0; i < 20; i++) {
      const px = r() * W, py = r() * H, s = 1.1 + r() * 1.7;
      x.fillStyle = 'rgba(22,20,16,.62)';
      x.beginPath(); x.ellipse(px, py, s, s * (0.5 + r() * 0.5), r() * 3, 0, TAU); x.fill();
      x.fillStyle = 'rgba(240,238,228,.34)';
      x.beginPath(); x.ellipse(px + 0.4, py + s * 0.8, s * 0.9, 0.8, 0, 0, TAU); x.fill();
    }
    // Form tie holes, in their grid.
    const tr = Math.max(4.5, W * 0.015);
    for (let b = 0; b < 6; b++) {
      for (const fx of [0.09, 0.91]) {
        const hx = W * fx, hy = b * bh - 40 + bh * 0.5;
        if (hy < 40 || hy > H) continue;
        const gr = x.createRadialGradient(hx - tr * 0.2, hy - tr * 0.3, tr * 0.1, hx, hy, tr);
        gr.addColorStop(0, '#16140f'); gr.addColorStop(0.75, '#2d2a23'); gr.addColorStop(1, '#6d695f');
        x.fillStyle = gr;
        x.beginPath(); x.arc(hx, hy, tr, 0, TAU); x.fill();
        x.strokeStyle = 'rgba(236,233,222,.42)';
        x.lineWidth = 0.9;
        x.beginPath(); x.arc(hx, hy + 0.6, tr + 0.6, 0.2, Math.PI - 0.2); x.stroke();
      }
    }
    // One long crack.
    let cxp = W * 0.72, cyp = H * 0.73;
    x.lineCap = 'round';
    x.beginPath(); x.moveTo(cxp, cyp);
    const pts = [];
    for (let i = 0; i < 16; i++) { cxp += (r() - 0.25) * 22; cyp += 7 + r() * 16; x.lineTo(cxp, cyp); pts.push([cxp, cyp]); }
    x.strokeStyle = 'rgba(20,18,14,.75)'; x.lineWidth = 1.1; x.stroke();
    // Daylight from up and to the left, and street dirt coming up from the bottom.
    let gr = x.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, 'rgba(255,252,240,.1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,18,12,.22)');
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    gr = x.createLinearGradient(0, H * 0.82, 0, H);
    gr.addColorStop(0, 'rgba(30,26,18,0)'); gr.addColorStop(1, 'rgba(30,26,18,.36)');
    x.fillStyle = gr; x.fillRect(0, H * 0.82, W, H * 0.18);
    return L;
  }

  function buildCan(kit, cw, ch, o) {
    const L = kit.layer(cw, ch), x = L.g;
    const bx = cw * 0.08, bw = cw * 0.84, top = ch * 0.17, bot = ch * 0.985, mid = cw / 2;
    const rr = cw * 0.05;
    // Cap of the actuator and the neck.
    x.fillStyle = '#d9d8d2';
    x.beginPath(); x.roundRect(mid - cw * 0.13, 0, cw * 0.26, ch * 0.075, 3); x.fill();
    x.fillStyle = '#17171a';
    x.fillRect(mid - cw * 0.03, ch * 0.02, cw * 0.06, ch * 0.022);
    x.fillStyle = '#a9a8a2';
    x.fillRect(mid - cw * 0.17, ch * 0.075, cw * 0.34, ch * 0.022);
    // Shoulder, tinned steel.
    x.beginPath();
    x.moveTo(mid - cw * 0.17, ch * 0.097);
    x.lineTo(mid + cw * 0.17, ch * 0.097);
    x.quadraticCurveTo(bx + bw, ch * 0.115, bx + bw, top);
    x.lineTo(bx, top);
    x.quadraticCurveTo(bx, ch * 0.115, mid - cw * 0.17, ch * 0.097);
    let gr = x.createLinearGradient(bx, 0, bx + bw, 0);
    gr.addColorStop(0, '#5c5c5a'); gr.addColorStop(0.2, '#d4d4cf'); gr.addColorStop(0.36, '#f4f4ee'); gr.addColorStop(0.6, '#9a9a95'); gr.addColorStop(1, '#3e3e3c');
    x.fillStyle = gr; x.fill();
    // Body.
    x.fillStyle = o.body;
    x.beginPath(); x.roundRect(bx, top, bw, bot - top, [2, 2, rr, rr]); x.fill();
    // Label: a band, the colour, and the words on it.
    x.fillStyle = o.band;
    x.fillRect(bx, top + (bot - top) * 0.17, bw, (bot - top) * 0.3);
    x.fillStyle = o.ink;
    x.textAlign = 'center';
    x.font = Math.round(bw * 0.3) + 'px "Bebas Neue"';
    x.fillText(o.word1, mid, top + (bot - top) * 0.3);
    x.font = Math.round(bw * 0.21) + 'px "Bebas Neue"';
    x.fillText(o.word2, mid, top + (bot - top) * 0.415);
    x.font = Math.round(bw * 0.085) + 'px "Courier Prime"';
    x.fillStyle = o.small;
    x.fillText('400 ML', mid, top + (bot - top) * 0.57);
    x.fillText('SHAKE WELL', mid, top + (bot - top) * 0.62);
    // Paint that ran down the can.
    x.fillStyle = o.paint;
    const r = kit.rng(o.seed);
    for (let i = 0; i < 4; i++) {
      const dx = bx + bw * (0.2 + r() * 0.6), dl = (bot - top) * (0.1 + r() * 0.3), dw = 1.4 + r() * 2.2;
      x.beginPath(); x.roundRect(dx, top, dw, dl, dw / 2); x.fill();
      x.beginPath(); x.arc(dx + dw / 2, top + dl, dw * 0.7, 0, TAU); x.fill();
    }
    // Scratches.
    x.lineWidth = 0.6;
    for (let i = 0; i < 26; i++) {
      x.strokeStyle = 'rgba(255,255,255,' + (0.06 + r() * 0.16) + ')';
      const sx = bx + r() * bw, sy = top + r() * (bot - top);
      x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (r() - 0.5) * 16, sy + (r() - 0.5) * 6); x.stroke();
    }
    // Cylinder light over everything.
    gr = x.createLinearGradient(bx, 0, bx + bw, 0);
    gr.addColorStop(0, 'rgba(0,0,0,.55)');
    gr.addColorStop(0.16, 'rgba(0,0,0,.1)');
    gr.addColorStop(0.27, 'rgba(255,255,255,.34)');
    gr.addColorStop(0.36, 'rgba(255,255,255,.06)');
    gr.addColorStop(0.72, 'rgba(0,0,0,.18)');
    gr.addColorStop(1, 'rgba(0,0,0,.62)');
    x.fillStyle = gr;
    x.beginPath(); x.roundRect(bx, top, bw, bot - top, [2, 2, rr, rr]); x.fill();
    // Rolled seams.
    x.fillStyle = 'rgba(0,0,0,.45)';
    x.fillRect(bx, top - 1, bw, 1.6);
    x.fillRect(bx, bot - ch * 0.03, bw, 1.4);
    x.fillStyle = 'rgba(255,255,255,.28)';
    x.fillRect(bx, top + 0.8, bw, 0.8);
    return L;
  }

  // One puff of paint leaving the nozzle: dense fine mist, a soft body, and some heavy droplets thrown wider.
  function buildPuff(kit, R, color, seed, dense) {
    const size = R * 2, L = kit.layer(size, size), x = L.g, r = kit.rng(seed);
    const rgb = color.join(',');
    const gr = x.createRadialGradient(R, R, 0, R, R, R);
    gr.addColorStop(0, 'rgba(' + rgb + ',' + 0.14 * dense + ')');
    gr.addColorStop(0.45, 'rgba(' + rgb + ',' + 0.09 * dense + ')');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, size, size);
    x.fillStyle = 'rgba(' + rgb + ',1)';
    for (let i = 0; i < 1500; i++) {
      const a = r() * TAU, rr = R * Math.min(1, Math.abs(r() + r() + r() - 1.5) * 0.92), s = 0.45 + r() * 0.75;
      x.globalAlpha = 0.3 + r() * 0.5;
      x.fillRect(R + Math.cos(a) * rr, R + Math.sin(a) * rr, s, s);
    }
    x.globalAlpha = 1;
    for (let i = 0; i < 70; i++) {
      const a = r() * TAU, rr = R * (0.25 + r() * 0.75), s = 0.5 + r() * 0.65;
      x.beginPath(); x.arc(R + Math.cos(a) * rr, R + Math.sin(a) * rr, s, 0, TAU); x.fill();
    }
    for (let i = 0; i < 8; i++) {
      const a = r() * TAU, rr = R * (0.45 + r() * 0.55), s = 0.9 + r() * 1.1;
      x.beginPath(); x.ellipse(R + Math.cos(a) * rr, R + Math.sin(a) * rr, s, s * 0.8, a, 0, TAU); x.fill();
    }
    return L;
  }

  FMI.add({
    id: 'street-stencil',
    lane: LANE,
    name: 'Stencil',
    blurb: 'A cardboard stencil is slapped on a concrete wall, sprayed twice, hit with teal, and ripped off to leave the F and name with drips still running.',
    dur: 3.35,
    ground: '#a9a69e',
    make(stage, kit) {
      const W = kit.w, H = kit.h, D = kit.dpr, { k, on, map, ease, clamp, lerp, hash, rng, F } = kit;
      const g = kit.canvas({ alpha: false });
      const tile = randTile(kit, 31), noise = noiseOf(tile);
      const safeTop = 64, safeBot = H - 118, avail = safeBot - safeTop;
      const FONT = '"Anton"';
      // The lockup, left aligned like a real stencil block.
      g.font = '100px ' + FONT;
      const nameW = W * 0.82, px = (nameW / g.measureText('FreeMotion').width) * 100;
      g.font = px + 'px ' + FONT;
      const capH = g.measureText('F').actualBoundingBoxAscent;
      const s = Math.min((nameW * 0.86) / F.box.w, (avail * 0.6) / F.box.h);
      const Fw = F.box.w * s, Fh = F.box.h * s, gap = Math.max(18, H * 0.026);
      const groupH = Fh + gap + capH, top = safeTop + (avail - groupH) * 0.4, x0 = (W - nameW) / 2;
      const baseline = top + Fh + gap + capH;
      const ox = x0 - F.box.x * s, oy = top - F.box.y * s;
      const cxr = W / 2, cyr = (top + baseline) / 2, rot = (-1.6 * Math.PI) / 180;
      const applyRot = (x) => { x.translate(cxr, cyr); x.rotate(rot); x.translate(-cxr, -cyr); };
      const rotPt = (px1, py1) => {
        const dx = px1 - cxr, dy = py1 - cyr, c = Math.cos(rot), sn = Math.sin(rot);
        return [cxr + dx * c - dy * sn, cyr + dx * sn + dy * c];
      };
      // Holes: the clips, with card left round the playhead, and the name with stencil bridges.
      const clipsL = kit.layer(W, H), headL = kit.layer(W, H), nameL = kit.layer(W, H);
      {
        const x = clipsL.g;
        x.save(); applyRot(x);
        x.fillStyle = '#fff';
        for (const c of F.clips) { x.beginPath(); x.roundRect(ox + c.x * s, oy + c.y * s, c.w * s, c.h * s, c.r * s); x.fill(); }
        const hd = F.head, bridge = Math.max(2.4, s * 1.5);
        x.globalCompositeOperation = 'destination-out';
        x.fillRect(ox + hd.x * s - bridge, oy + hd.y * s, hd.w * s + bridge * 2, hd.h * s);
        x.restore();
        const z = nameL.g;
        z.save(); applyRot(z);
        z.fillStyle = '#fff';
        z.font = px + 'px ' + FONT;
        z.textBaseline = 'alphabetic';
        z.fillText('FreeMotion', x0, baseline);
        z.globalCompositeOperation = 'destination-out';
        const word = 'FreeMotion', bw = Math.max(2, px * 0.036);
        for (let i = 0; i < word.length; i++) {
          if (!'eo'.includes(word[i])) continue;
          const a = z.measureText(word.slice(0, i)).width, wd = z.measureText(word[i]).width;
          z.fillRect(x0 + a + wd / 2 - bw / 2, baseline - capH - 4, bw, capH + 8);
        }
        z.restore();
        const y = headL.g;
        y.save(); applyRot(y);
        y.fillStyle = '#fff';
        y.fillRect(ox + hd.x * s, oy + hd.y * s, hd.w * s, hd.h * s);
        y.beginPath();
        y.moveTo(ox + hd.tri[0][0] * s, oy + hd.tri[0][1] * s);
        y.lineTo(ox + hd.tri[1][0] * s, oy + hd.tri[1][1] * s);
        y.lineTo(ox + hd.tri[2][0] * s, oy + hd.tri[2][1] * s);
        y.fill();
        y.restore();
      }
      const maskAll = kit.layer(W, H);
      maskAll.g.drawImage(clipsL.canvas, 0, 0, W, H);
      maskAll.g.drawImage(nameL.canvas, 0, 0, W, H);
      maskAll.g.drawImage(headL.canvas, 0, 0, W, H);

      // The card.
      const m = Math.max(10, W * 0.03);
      const card = { x: x0 - m, y: top - m * 1.3, w: nameW + m * 2, h: baseline - top + m * 2.8 };
      const cr = rng(41), poly = [];
      {
        const pushEdge = (ax, ay, bx, by, n) => { for (let i = 0; i < n; i++) { const p = i / n; poly.push([lerp(ax, bx, p) + (cr() - 0.5) * 2.4, lerp(ay, by, p) + (cr() - 0.5) * 2.4]); } };
        pushEdge(card.x, card.y, card.x + card.w, card.y + 2, 6);
        pushEdge(card.x + card.w, card.y + 2, card.x + card.w - 3, card.y + card.h, 8);
        pushEdge(card.x + card.w - 3, card.y + card.h, card.x + 2, card.y + card.h - 1, 6);
        pushEdge(card.x + 2, card.y + card.h - 1, card.x, card.y, 8);
      }
      const cardPath = (x) => { x.beginPath(); poly.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); };

      function buildCardFace(base, seed, printed) {
        const L = kit.layer(W, H), x = L.g, r = rng(seed);
        x.save(); applyRot(x); cardPath(x); x.clip();
        x.fillStyle = base;
        x.fillRect(card.x - 6, card.y - 6, card.w + 12, card.h + 12);
        // Big stains and handling marks.
        for (let i = 0; i < 16; i++) {
          const ex = card.x + r() * card.w, ey = card.y + r() * card.h, er = 30 + r() * 130;
          const gr = x.createRadialGradient(ex, ey, 0, ex, ey, er);
          const dark = r() < 0.6;
          gr.addColorStop(0, dark ? 'rgba(62,38,14,.14)' : 'rgba(255,232,190,.12)');
          gr.addColorStop(1, dark ? 'rgba(62,38,14,0)' : 'rgba(255,232,190,0)');
          x.fillStyle = gr;
          x.fillRect(ex - er, ey - er, er * 2, er * 2);
        }
        // Corrugation showing through the liner.
        const flute = Math.max(4.5, W * 0.0145);
        for (let fx = card.x - 4; fx < card.x + card.w + 4; fx += flute) {
          x.fillStyle = 'rgba(70,42,14,.085)';
          x.fillRect(fx, card.y - 4, flute * 0.42, card.h + 8);
          x.fillStyle = 'rgba(255,234,196,.075)';
          x.fillRect(fx + flute * 0.55, card.y - 4, flute * 0.3, card.h + 8);
        }
        // Fibres.
        x.lineWidth = 0.6;
        for (let i = 0; i < 2600; i++) {
          const fx = card.x + r() * card.w, fy = card.y + r() * card.h, a = r() * TAU, l = 1 + r() * 4;
          x.strokeStyle = r() < 0.55 ? 'rgba(52,30,10,' + (0.08 + r() * 0.22) + ')' : 'rgba(250,228,190,' + (0.08 + r() * 0.2) + ')';
          x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + Math.cos(a) * l, fy + Math.sin(a) * l); x.stroke();
        }
        if (printed) {
          // The box it was cut from: arrows and the words the box came with, printed in cheap brown.
          const ink = 'rgba(58,32,14,.62)';
          const gx = ox + (F.clips[2].x + F.clips[2].w) * s + Math.max(30, s * 26), gy = oy + F.clips[2].y * s - s * 2;
          x.fillStyle = ink;
          x.font = Math.round(Math.max(12, s * 7)) + 'px "Bebas Neue"';
          x.textBaseline = 'alphabetic';
          x.fillText('THIS WAY UP', gx, gy + s * 26);
          for (let i = 0; i < 2; i++) {
            const ax = gx + s * 3 + i * s * 12, ay = gy + s * 16;
            x.beginPath();
            x.moveTo(ax, ay - s * 11); x.lineTo(ax + s * 4.4, ay - s * 5); x.lineTo(ax + s * 1.7, ay - s * 5);
            x.lineTo(ax + s * 1.7, ay); x.lineTo(ax - s * 1.7, ay); x.lineTo(ax - s * 1.7, ay - s * 5); x.lineTo(ax - s * 4.4, ay - s * 5);
            x.closePath(); x.fill();
          }
          // A scuff through the print.
          x.strokeStyle = 'rgba(205,175,130,.75)';
          x.lineWidth = 1.2;
          for (let i = 0; i < 18; i++) {
            const sx = gx + r() * s * 40, sy = gy + r() * s * 28;
            x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + 2 + r() * 14, sy + r() * 3); x.stroke();
          }
        }
        // A crease across the sheet where the box folded.
        const ch = card.y + card.h * 0.9;
        x.fillStyle = 'rgba(58,34,12,.28)';
        x.fillRect(card.x - 4, ch, card.w + 8, 1.2);
        x.fillStyle = 'rgba(255,236,204,.34)';
        x.fillRect(card.x - 4, ch + 1.2, card.w + 8, 1.6);
        x.restore();
        // Edge: a rim of darker cut board.
        x.save(); applyRot(x);
        cardPath(x);
        x.strokeStyle = 'rgba(60,36,14,.55)';
        x.lineWidth = 1.2;
        x.stroke();
        x.restore();
        // A pale rim on the far side of each cut, then the holes themselves.
        x.globalCompositeOperation = 'source-atop';
        x.drawImage(tinted(maskAll.canvas, '#e2c79c'), 1.3, 1.3, W, H);
        x.globalCompositeOperation = 'destination-out';
        x.drawImage(maskAll.canvas, 0, 0, W, H);
        x.globalCompositeOperation = 'source-over';
        return L;
      }
      const cardPlain = buildCardFace('#b28e5e', 51, true);
      const cardBack = buildCardFace('#c2a374', 53, false);

      // Inside each hole, the shadow the card casts on the wall.
      const holeShade = kit.layer(W, H);
      {
        const x = holeShade.g;
        x.drawImage(tinted(maskAll.canvas, 'rgba(0,0,0,.55)'), 0, 0, W, H);
        x.globalCompositeOperation = 'destination-out';
        x.drawImage(maskAll.canvas, 2, 3, W, H);
      }

      // Tape: the piece on the card, and the torn scrap it leaves on the wall.
      const tapeW = Math.max(46, W * 0.15), tapeH = Math.max(15, W * 0.048);
      const tapePieces = [
        { x: card.x + card.w * 0.02, y: card.y + 1, a: -0.72, t: 0.205 },
        { x: card.x + card.w * 0.985, y: card.y + 4, a: 0.66, t: 0.255 },
        { x: card.x + card.w * 0.985, y: card.y + card.h - 3, a: -0.6, t: 0.3 },
        { x: card.x + card.w * 0.03, y: card.y + card.h - 3, a: 0.74, t: 0.235 },
      ];
      function buildTape(len, hgt, seed, torn) {
        const L = kit.layer(len + 10, hgt + 10), x = L.g, r = rng(seed);
        x.translate(5, 5);
        x.beginPath();
        x.moveTo(0, 0);
        const zig = (x1, y1, x2, y2, n, amp) => { for (let i = 1; i <= n; i++) { const p = i / n; x.lineTo(lerp(x1, x2, p) + (r() - 0.5) * amp, lerp(y1, y2, p)); } };
        x.lineTo(len, 0);
        zig(len, 0, len, hgt, 7, torn ? 7 : 3);
        x.lineTo(0, hgt);
        zig(0, hgt, 0, 0, 7, 3);
        x.closePath();
        x.save();
        x.clip();
        x.fillStyle = 'rgba(226,212,170,.94)';
        x.fillRect(-4, -4, len + 8, hgt + 8);
        x.strokeStyle = 'rgba(120,100,60,.2)';
        x.lineWidth = 0.6;
        for (let i = 0; i < 40; i++) { const px1 = r() * len; x.beginPath(); x.moveTo(px1, 0); x.lineTo(px1 + (r() - 0.5) * 4, hgt); x.stroke(); }
        x.fillStyle = 'rgba(255,255,255,.14)';
        x.fillRect(0, hgt * 0.08, len, hgt * 0.14);
        x.fillStyle = 'rgba(80,60,30,.1)';
        x.fillRect(0, hgt * 0.75, len, hgt * 0.25);
        x.restore();
        return L;
      }
      const tapeFull = tapePieces.map((p, i) => buildTape(tapeW, tapeH, 60 + i, false));
      const tapeScrap = tapePieces.map((p, i) => buildTape(tapeW * (0.34 + 0.12 * i), tapeH, 70 + i, true));
      const putTape = (x, sprite, p, sc) => {
        const [tx, ty] = rotPt(p.x, p.y);
        x.save();
        x.translate(tx, ty);
        x.rotate(p.a + rot);
        const sw = sprite.w * (sc || 1), sh = sprite.h * (sc || 1);
        x.drawImage(sprite.canvas, -sw / 2, -sh / 2, sw, sh);
        x.restore();
      };

      const wall = buildWall(kit, W, H);
      // The torn ends the tape leaves behind. They only exist once the card comes off.
      const scraps = kit.layer(W, H);
      tapePieces.forEach((p, i) => {
        const dirX = p.x < cxr ? -1 : 1, dirY = p.y < cyr ? -1 : 1;
        const q = { x: p.x + dirX * tapeW * 0.2, y: p.y + dirY * tapeW * 0.14, a: p.a };
        putTape(scraps.g, tapeScrap[i], q);
      });

      // Paint.
      const Rp = Math.max(84, W * 0.27), Rt = Math.max(24, W * 0.075);
      const black = [14, 14, 15], teal = [41, 217, 187];
      const puffs = [buildPuff(kit, Rp, black, 81, 1), buildPuff(kit, Rp, black, 82, 1), buildPuff(kit, Rp, black, 83, 1)];
      const tealPuffs = [buildPuff(kit, Rt, teal, 84, 1.8), buildPuff(kit, Rt, teal, 85, 1.8)];
      const yA = top + Fh * 0.27, yB = top + Fh * 0.86 + gap;
      function stamps(xa, ya, xb, yb, n, seed, arc) {
        const out = [], r = rng(seed);
        for (let i = 0; i < n; i++) {
          const p = i / (n - 1);
          out.push({ x: lerp(xa, xb, p) + (r() - 0.5) * 6, y: lerp(ya, yb, p) + Math.sin(p * Math.PI) * arc + (r() - 0.5) * 8, a: r() * TAU, v: Math.floor(r() * 99) });
        }
        return out;
      }
      const K = 34, passA = stamps(-W * 0.04, yA + 10, W * 1.04, yA - 6, K, 91, -14), passB = stamps(W * 1.04, yB - 8, -W * 0.04, yB + 8, K, 92, 12);
      const hx = rotPt(ox + (F.head.x + F.head.w / 2) * s, oy + F.head.y * s)[0], fTop = top, fBot = top + Fh;
      const passT = stamps(hx, fTop - Rt * 0.2, hx + 2, fBot, 15, 93, 2);
      const putStamp = (x, st, set, alpha) => {
        const sp = set[st.v % set.length];
        x.save();
        x.translate(st.x, st.y);
        x.rotate(st.a);
        if (alpha !== undefined) x.globalAlpha = alpha;
        x.drawImage(sp.canvas, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
        x.restore();
      };
      const fog1 = kit.layer(W, H), fog2 = kit.layer(W, H), fog3 = kit.layer(W, H);
      passA.forEach((st) => putStamp(fog1.g, st, puffs));
      fog2.g.drawImage(fog1.canvas, 0, 0, W, H);
      passB.forEach((st) => putStamp(fog2.g, st, puffs));
      fog3.g.drawImage(fog2.canvas, 0, 0, W, H);
      passT.forEach((st) => putStamp(fog3.g, st, tealPuffs));
      // What the card keeps once it comes away.
      const cardRip = kit.layer(W, H);
      {
        const x = cardRip.g;
        x.drawImage(cardPlain.canvas, 0, 0, W, H);
        x.globalCompositeOperation = 'source-atop';
        x.drawImage(fog3.canvas, 0, 0, W, H);
        x.globalCompositeOperation = 'source-over';
        tapePieces.forEach((p, i) => putTape(x, tapeFull[i], p));
      }
      // The mist that landed outside the card: on the wall it leaves the card's clean ghost.
      const ghost = kit.layer(W, H);
      {
        const x = ghost.g;
        x.drawImage(fog3.canvas, 0, 0, W, H);
        x.globalCompositeOperation = 'destination-out';
        x.save(); applyRot(x); cardPath(x); x.fillStyle = '#000'; x.fill(); x.restore();
      }
      // The paint itself, on the wall, with edges that bled.
      const near = logScale(D), far = near + 2;
      const clipThin = (px1, py1) => clamp((noise(px1 / 60, py1 / 60) - 0.56) * 0.9 + (px1 < W * 0.25 && py1 < H * 0.3 ? 0.05 : 0), 0, 0.45);
      const paintBlack = roughen(clipsL.canvas, { near, far, tile, noise, rgb: black, scale: D, floor: 0.86, edge: 0.8, mist: 0.22, thin: clipThin });
      const paintName = roughen(nameL.canvas, { near: Math.max(1, near - 1), far: far - 1, tile, noise, rgb: black, scale: D, floor: 0.9, edge: 0.42, mist: 0.1, salt: 0.015 });
      const paintTeal = roughen(headL.canvas, { near, far, tile, noise, rgb: teal, scale: D, floor: 0.9, edge: 0.8, mist: 0.3, salt: 0.05 });
      const paint = kit.layer(W, H);
      paint.g.drawImage(paintBlack, 0, 0, W, H);
      paint.g.drawImage(paintName, 0, 0, W, H);
      paint.g.drawImage(paintTeal, 0, 0, W, H);
      // Done with the working canvases: hand their memory back, which matters on a phone.
      [paintBlack, paintName, paintTeal, clipsL.canvas, nameL.canvas, headL.canvas, maskAll.canvas].forEach((c) => { c.width = c.height = 0; });

      // Drips: gravity is straight down the wall, whatever angle the stencil was at.
      const dr = rng(101), drips = [];
      const scaleU = Math.max(0.8, W / 390);
      const addDrip = (px1, py1, col, big) => {
        const [dx, dy] = rotPt(px1, py1);
        drips.push({ x: dx, y: dy - 1, col, w: (1.7 + dr() * (big ? 2.1 : 1.1)) * scaleU, L: (big ? 0.11 + dr() * 0.14 : 0.03 + dr() * 0.09) * H, t0: 1.34 + dr() * 1.15, k: 0.85 + dr() * 1.4, wob: dr() });
      };
      F.clips.forEach((c, i) => {
        const n = [3, 2, 2][i];
        for (let j = 0; j < n; j++) addDrip(ox + (c.x + c.w * (0.12 + 0.76 * ((j + dr() * 0.8) / n))) * s, oy + (c.y + c.h) * s, '#0e0e0f', j === 0 && i !== 1);
      });
      g.font = px + 'px ' + FONT;
      for (const at of [0.03, 0.15, 0.27, 0.46, 0.62, 0.83, 0.97]) addDrip(x0 + nameW * at, baseline, '#0e0e0f', at === 0.46 || at === 0.03);
      addDrip(ox + (F.head.x + F.head.w / 2) * s, oy + (F.head.y + F.head.h) * s, '#1fc4a6', true);
      function drawDrips(x, t) {
        for (const d of drips) {
          if (t < d.t0) continue;
          const len = d.L * (1 - Math.exp(-(t - d.t0) * d.k));
          x.fillStyle = d.col;
          x.beginPath();
          x.moveTo(d.x - d.w * 1.1, d.y - 1);
          x.lineTo(d.x + d.w * 1.1, d.y - 1);
          x.lineTo(d.x + d.w * 0.45, d.y + Math.min(5, len));
          x.lineTo(d.x + d.w * 0.42, d.y + len);
          x.lineTo(d.x - d.w * 0.42, d.y + len);
          x.lineTo(d.x - d.w * 0.45, d.y + Math.min(5, len));
          x.closePath();
          x.fill();
          x.beginPath();
          x.ellipse(d.x, d.y + len, d.w * 0.72, d.w * 1.15, 0, 0, TAU);
          x.fill();
          x.fillStyle = 'rgba(255,255,255,.22)';
          x.fillRect(d.x - d.w * 0.28, d.y + len - d.w * 0.6, Math.max(0.6, d.w * 0.2), d.w * 0.5);
        }
      }

      // The cans.
      const canW = Math.max(74, W * 0.25), canH = canW * 2.55;
      const canBlack = buildCan(kit, canW, canH, { body: '#17171a', band: '#e9e6dc', ink: '#121214', small: '#3a3a3c', paint: '#000', word1: 'MATT', word2: 'BLACK', seed: 3 });
      const canTeal = buildCan(kit, canW, canH, { body: '#20b49c', band: '#10201e', ink: '#29d9bb', small: '#8fb7ae', paint: '#16937f', word1: 'FAT', word2: 'TEAL', seed: 5 });
      // The can is well off the wall, so its shadow is big and soft. Baked once.
      const canShadow = kit.layer(canW * 1.7, canH * 1.2);
      {
        const x = canShadow.g;
        x.shadowColor = 'rgba(18,14,8,.46)';
        x.shadowBlur = 16 * D;
        x.shadowOffsetX = 3000 * D;
        x.fillStyle = '#000';
        x.beginPath();
        x.roundRect(canW * 0.35 - 3000, canH * 0.1, canW, canH * 0.95, 10);
        x.fill();
      }
      function drawCan(sprite, nx, ny, lean) {
        g.save();
        g.translate(nx, ny);
        g.rotate(lean);
        g.drawImage(canShadow.canvas, -canW * 0.6, canW * 0.18, canShadow.w, canShadow.h);
        g.drawImage(sprite.canvas, -canW / 2, -canH * 0.03, canW, canH);
        g.restore();
      }

      // Times.
      const tLand = 0.15, a0 = 0.3, a1 = 0.84, b0 = 0.9, b1 = 1.34, c0 = 1.47, c1 = 1.74, tCurl = 1.92, tRip = 2.06, tGone = 2.42;
      const nx0 = -W * 0.3, nx1 = W * 1.14;
      const passProgress = (t, s0, s1, xa, xb) => ease.io2(map(t, s0, s1)) * (xb - xa) + xa;
      const corner = rotPt(card.x + card.w, card.y);
      const fn = { x: 0.8, y: -0.6 };
      const fold = (q) => {
        const P = { x: corner[0] - fn.x * q, y: corner[1] - fn.y * q };
        return { P };
      };
      const diag = Math.hypot(card.w, card.h);

      return function seek(t0) {
        const t = on(t0, 30), n = kit.frame(t0, 30);
        const shake = t >= tLand && t < tLand + 0.1 ? (n % 2 ? 3 : -2) * (1 - (t - tLand) / 0.1) : 0;
        g.save();
        g.translate(0, shake);
        g.drawImage(wall.canvas, 0, 0, W, H);
        if (t < tCurl) {
          // The card on the wall, or flying at it.
          const fly = 1 - ease.in3(clamp(t / tLand));
          const sc = 1 + 0.5 * fly, drot = 0.1 * fly, lift = fly * 22 + (t >= tLand && t < tLand + 0.07 ? 1.5 : 0);
          if (t >= tLand) g.drawImage(holeShade.canvas, 0, 0, W, H);
          g.save();
          g.translate(cxr, cyr); g.rotate(drot); g.scale(sc, sc); g.translate(-cxr, -cyr);
          // Contact shadow first: tight once it is on the wall.
          g.save();
          g.translate(lift * 0.7 + 1.2, lift + 1.8);
          applyRot(g);
          g.fillStyle = 'rgba(16,13,8,' + (t >= tLand ? 0.42 : 0.22) + ')';
          cardPath(g);
          g.fill();
          g.restore();
          g.drawImage(cardPlain.canvas, 0, 0, W, H);
          g.restore();
          for (let i = 0; i < tapePieces.length; i++) {
            const p = tapePieces[i];
            if (t < p.t) continue;
            const fresh = t - p.t < 0.05 ? 1.14 : 1;
            putTape(g, tapeFull[i], p, fresh);
          }
          // Paint so far.
          if (t >= a0) {
            if (t >= c1) g.drawImage(fog3.canvas, 0, 0, W, H);
            else if (t >= b1) {
              g.drawImage(fog2.canvas, 0, 0, W, H);
              const cnt = Math.floor(map(t, c0, c1) * passT.length);
              for (let i = 0; i < cnt; i++) putStamp(g, passT[i], tealPuffs);
            } else if (t >= a1) {
              g.drawImage(fog1.canvas, 0, 0, W, H);
              const nx = passProgress(t, b0, b1, nx1, nx0);
              const fr = (W * 1.04 - nx) / (W * 1.08);
              const cnt = Math.floor(clamp(fr) * K);
              for (let i = 0; i < cnt; i++) putStamp(g, passB[i], puffs);
            } else {
              const nx = passProgress(t, a0, a1, nx0, nx1);
              const fr = (nx + W * 0.04) / (W * 1.08);
              const cnt = Math.floor(clamp(fr) * K);
              for (let i = 0; i < cnt; i++) putStamp(g, passA[i], puffs);
            }
          }
          // The can in front of everything, and the live cloud round its nozzle.
          const puffNow = (nx, ny, set, a) => putStamp(g, { x: nx, y: ny, a: hash(n, 3) * TAU, v: n }, set, a);
          if (t >= a0 && t < a1) {
            const nx = passProgress(t, a0, a1, nx0, nx1), ny = yA + 10 - (nx / W) * 16;
            if (nx > -W * 0.1 && nx < W * 1.1) puffNow(nx, ny, puffs, 0.85);
            drawCan(canBlack, nx, ny - canW * 0.04, 0.05 + 0.05 * Math.sin(n * 0.9));
          } else if (t >= a1 && t < b0) {
            const p = map(t, a1, b0);
            drawCan(canBlack, nx1, lerp(yA, yB, ease.io2(p)), 0.02);
          } else if (t >= b0 && t < b1) {
            const nx = passProgress(t, b0, b1, nx1, nx0), ny = yB - 8 + ((W - nx) / W) * 16;
            if (nx > -W * 0.1 && nx < W * 1.1) puffNow(nx, ny, puffs, 0.85);
            drawCan(canBlack, nx, ny - canW * 0.04, -0.06 - 0.05 * Math.sin(n * 0.8));
          } else if (t >= 1.38 && t < c1 + 0.1) {
            const nx = k(t, [[1.38, W * 1.3], [c0, hx + canW * 0.04, 'out3'], [c1, hx + canW * 0.04], [c1 + 0.1, W * 1.3, 'in3']]);
            const ny = k(t, [[1.38, fTop + 30], [c0, fTop, 'out3'], [c1, fBot, 'io2'], [c1 + 0.1, fBot - 30, 'in2']]);
            if (t >= c0 && t < c1) puffNow(nx, ny, tealPuffs, 1);
            drawCan(canTeal, nx, ny, 0.12);
          }
        } else {
          // The corner lifts, a held breath, and then it comes off.
          const q = t < tRip ? k(t, [[tCurl, 0], [tCurl + 0.05, W * 0.09, 'out3'], [tRip, W * 0.1]]) : lerp(W * 0.1, diag * 2.1, ease.in2(map(t, tRip, tGone)));
          g.drawImage(scraps.canvas, 0, 0, W, H);
          g.drawImage(ghost.canvas, 0, 0, W, H);
          g.drawImage(paint.canvas, 0, 0, W, H);
          drawDrips(g, t0);
          if (t < tGone) {
            const P = fold(q).P, tx = -fn.y, ty = fn.x, FAR = 3000;
            // The part still flat on the wall.
            g.save();
            g.beginPath();
            g.moveTo(P.x + tx * FAR, P.y + ty * FAR);
            g.lineTo(P.x - tx * FAR, P.y - ty * FAR);
            g.lineTo(P.x - tx * FAR - fn.x * FAR, P.y - ty * FAR - fn.y * FAR);
            g.lineTo(P.x + tx * FAR - fn.x * FAR, P.y + ty * FAR - fn.y * FAR);
            g.closePath();
            g.clip();
            g.save();
            g.translate(1.2, 1.8);
            applyRot(g);
            g.fillStyle = 'rgba(16,13,8,.42)';
            cardPath(g);
            g.fill();
            g.restore();
            g.drawImage(cardRip.canvas, 0, 0, W, H);
            g.restore();
            // The flap: the same card folded over the moving line, back side up.
            const dot = P.x * fn.x + P.y * fn.y;
            const a = 1 - 2 * fn.x * fn.x, b = -2 * fn.x * fn.y, d = 1 - 2 * fn.y * fn.y, e = 2 * dot * fn.x, f = 2 * dot * fn.y;
            const flap = () => {
              g.transform(a, b, b, d, e, f);
              g.beginPath();
              g.moveTo(P.x + tx * FAR, P.y + ty * FAR);
              g.lineTo(P.x - tx * FAR, P.y - ty * FAR);
              g.lineTo(P.x - tx * FAR + fn.x * FAR, P.y - ty * FAR + fn.y * FAR);
              g.lineTo(P.x + tx * FAR + fn.x * FAR, P.y + ty * FAR + fn.y * FAR);
              g.closePath();
              g.clip();
            };
            g.save();
            g.translate(-W * 0.03, H * 0.022);
            flap();
            applyRot(g);
            g.fillStyle = 'rgba(16,13,8,.3)';
            cardPath(g);
            g.fill();
            g.restore();
            g.save();
            flap();
            g.drawImage(cardBack.canvas, 0, 0, W, H);
            // A band of dark at the fold, where the board turns away from the light.
            const gr = g.createLinearGradient(P.x, P.y, P.x + fn.x * W * 0.34, P.y + fn.y * W * 0.34);
            gr.addColorStop(0, 'rgba(28,16,6,.62)');
            gr.addColorStop(0.3, 'rgba(28,16,6,.22)');
            gr.addColorStop(1, 'rgba(255,240,210,.12)');
            g.save();
            applyRot(g);
            cardPath(g);
            g.restore();
            g.fillStyle = gr;
            g.fill();
            g.restore();
          }
        }
        g.restore();
      };
    },
  });

  // ---------------------------------------------------------------------------------------------------------------
  // (b) MISREGISTERED PRINT
  // ---------------------------------------------------------------------------------------------------------------
  function halftone(x, pitch, angleDeg, b, cov, seed, kit) {
    const a = (angleDeg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, R = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2 + pitch;
    const r = kit.rng(seed);
    x.beginPath();
    for (let v = -R; v <= R; v += pitch) {
      for (let u = -R; u <= R; u += pitch) {
        const j = r();
        const px = cx + u * ca - v * sa, py = cy + u * sa + v * ca;
        if (px < b.x0 - pitch || px > b.x1 + pitch || py < b.y0 - pitch || py > b.y1 + pitch) continue;
        const c = cov(px, py);
        if (c <= 0.012) continue;
        const rad = pitch * Math.sqrt(c / Math.PI) * (1 + (j - 0.5) * 0.07);
        x.moveTo(px + rad, py);
        x.arc(px, py, rad, 0, TAU);
      }
    }
    x.fill();
  }
  function regMark(x, cx, cy, r) {
    x.lineWidth = Math.max(1.1, r * 0.13);
    x.beginPath(); x.arc(cx, cy, r * 0.62, 0, TAU); x.stroke();
    x.beginPath();
    x.moveTo(cx - r, cy); x.lineTo(cx + r, cy);
    x.moveTo(cx, cy - r); x.lineTo(cx, cy + r);
    x.stroke();
  }

  FMI.add({
    id: 'street-print',
    lane: LANE,
    name: 'Bad register',
    blurb: 'A sheet jerks out of a two-ink press with the grey on it, whips back, returns with the teal printed way off, and gets knocked into register.',
    dur: 2.9,
    ground: '#77786f',
    make(stage, kit) {
      const W = kit.w, H = kit.h, D = kit.dpr, { k, on, map, ease, clamp, lerp, hash, rng, F } = kit;
      const g = kit.canvas({ alpha: false });
      const tile = randTile(kit, 203), noise = noiseOf(tile);
      const headH = Math.max(62, H * 0.082);
      const pX = Math.max(10, W * 0.04), pW = W - pX * 2, pBot = H - Math.max(10, H * 0.016);
      const safeBot = H - 118;

      // The tray and the sides of the machine.
      const bed = kit.layer(W, H);
      {
        const x = bed.g, r = rng(211);
        x.fillStyle = '#6f7069';
        x.fillRect(0, 0, W, H);
        x.lineWidth = 0.7;
        for (let i = 0; i < 90; i++) {
          x.strokeStyle = r() < 0.6 ? 'rgba(30,30,26,' + (0.1 + r() * 0.2) + ')' : 'rgba(230,230,220,' + (0.05 + r() * 0.12) + ')';
          const sx = r() * W, sy = r() * H;
          x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (r() - 0.5) * 6, sy + 10 + r() * 60); x.stroke();
        }
        x.fillStyle = 'rgba(18,18,16,.36)';
        for (let i = 0; i < 28; i++) { const yy = headH + i * (H / 26); x.fillRect(0, yy, Math.max(4, pX * 0.5), 1); x.fillRect(W - Math.max(4, pX * 0.5), yy, Math.max(4, pX * 0.5), 1); }
      }

      // The sheet: uncoated stock, with fibres and the marks feed rollers leave.
      const paper = kit.layer(W, H);
      {
        const x = paper.g, r = rng(217);
        x.fillStyle = '#efe8d5';
        x.fillRect(pX, -8, pW, H + 16);
        x.save();
        x.beginPath(); x.rect(pX, -8, pW, H + 16); x.clip();
        for (let i = 0; i < 14; i++) {
          const ex = pX + r() * pW, ey = r() * H, er = 40 + r() * 160;
          const gr = x.createRadialGradient(ex, ey, 0, ex, ey, er);
          const dark = r() < 0.55;
          gr.addColorStop(0, dark ? 'rgba(150,120,70,.06)' : 'rgba(255,255,245,.1)');
          gr.addColorStop(1, dark ? 'rgba(150,120,70,0)' : 'rgba(255,255,245,0)');
          x.fillStyle = gr; x.fillRect(ex - er, ey - er, er * 2, er * 2);
        }
        x.lineWidth = 0.55;
        for (let i = 0; i < 3400; i++) {
          const fx = pX + r() * pW, fy = r() * H, a = r() * TAU, l = 1.2 + r() * 5;
          x.strokeStyle = r() < 0.72 ? 'rgba(110,88,50,' + (0.06 + r() * 0.17) + ')' : 'rgba(255,255,250,' + (0.1 + r() * 0.3) + ')';
          x.beginPath(); x.moveTo(fx, fy); x.quadraticCurveTo(fx + Math.cos(a) * l * 0.5 + r() - 0.5, fy + Math.sin(a) * l * 0.5 + r() - 0.5, fx + Math.cos(a) * l, fy + Math.sin(a) * l); x.stroke();
        }
        for (let i = 0; i < 80; i++) {
          x.fillStyle = 'rgba(70,56,36,' + (0.2 + r() * 0.4) + ')';
          x.beginPath(); x.ellipse(pX + r() * pW, r() * H, 0.4 + r() * 0.9, 0.3 + r() * 0.5, r() * 3, 0, TAU); x.fill();
        }
        // Two tracks of faint tyre marks from the rollers.
        for (const fx of [0.22, 0.78]) {
          for (let yy = 0; yy < H; yy += 5 + r() * 6) {
            x.fillStyle = 'rgba(70,66,56,' + (0.015 + r() * 0.05) + ')';
            x.fillRect(pX + pW * fx - 7 + r() * 3, yy, 10 + r() * 5, 1.2 + r() * 1.6);
          }
        }
        // Stock edge.
        x.fillStyle = 'rgba(120,100,70,.24)';
        x.fillRect(pX, -8, 1, H + 16);
        x.fillRect(pX + pW - 1, -8, 1, H + 16);
        x.restore();
      }

      // Where everything sits on the sheet.
      const top = headH + Math.max(16, H * 0.024);
      const avail = safeBot - top;
      g.font = '100px "Abril Fatface"';
      const nameW = pW * 0.9, px = (nameW / g.measureText('FreeMotion').width) * 100;
      g.font = px + 'px "Abril Fatface"';
      const capH = g.measureText('F').actualBoundingBoxAscent;
      const s = Math.min((pW * 0.86) / F.box.w, (avail * 0.66) / F.box.h);
      const Fw = F.box.w * s, Fh = F.box.h * s, lx = pX + (pW - nameW) / 2;
      const ox = lx - F.box.x * s, oy = top + Math.max(4, avail * 0.03) - F.box.y * s;
      const fBottom = oy + (F.box.y + F.box.h) * s;
      const baseline = Math.min(safeBot - 8, fBottom + Math.max(capH * 1.28, avail * 0.15));
      const pitch = Math.max(7.4, W * 0.026);

      const greyInk = kit.layer(W, H), tealInk = kit.layer(W, H);
      // GREY: the clips in big dots, the screen getting heavier down the F, which is his light-from-above grey.
      {
        const x = greyInk.g;
        x.fillStyle = '#000';
        x.save();
        x.beginPath();
        for (const c of F.clips) x.roundRect(ox + c.x * s, oy + c.y * s, c.w * s, c.h * s, c.r * s);
        x.clip();
        const yT = oy + F.clips[0].y * s, yB = oy + (F.clips[2].y + F.clips[2].h) * s;
        halftone(x, pitch, 45, { x0: ox, y0: yT, x1: ox + 120 * s, y1: yB }, (px1, py1) => {
          const p = clamp((py1 - yT) / (yB - yT));
          const c = 0.42 + 0.56 * p;
          const xp = clamp((px1 - ox) / (106 * s));
          return Math.min(1.25, c + 0.14 * (1 - xp));
        }, 221, kit);
        x.restore();
        // A knocked-out gap where the playhead is meant to go. The teal lands in it when it is right.
        x.globalCompositeOperation = 'destination-out';
        const hd = F.head;
        x.fillRect(ox + hd.x * s - Math.max(1.2, s * 0.6), oy + hd.y * s, hd.w * s + Math.max(2.4, s * 1.2), hd.h * s);
        x.globalCompositeOperation = 'source-over';
        // The name is solid, and it overprints whatever the teal does. A little ink gain keeps the hairlines alive.
        x.font = px + 'px "Abril Fatface"';
        x.textBaseline = 'alphabetic';
        x.lineJoin = 'round';
        x.lineWidth = Math.max(0.7, px * 0.016);
        x.strokeStyle = '#000';
        x.fillText('FreeMotion', lx, baseline);
        x.strokeText('FreeMotion', lx, baseline);
      }
      // TEAL: the playhead, a shadow of the name, and a screen that comes up from the bottom of the sheet.
      const tealHead = kit.layer(W, H), tealName = kit.layer(W, H);
      {
        const x = tealHead.g, hd = F.head;
        x.fillStyle = '#000';
        x.fillRect(ox + hd.x * s, oy + hd.y * s, hd.w * s, hd.h * s);
        x.beginPath();
        x.moveTo(ox + hd.tri[0][0] * s, oy + hd.tri[0][1] * s);
        x.lineTo(ox + hd.tri[1][0] * s, oy + hd.tri[1][1] * s);
        x.lineTo(ox + hd.tri[2][0] * s, oy + hd.tri[2][1] * s);
        x.fill();
        const y = tealName.g;
        y.font = px + 'px "Abril Fatface"';
        y.textBaseline = 'alphabetic';
        y.fillStyle = '#000';
        y.strokeStyle = '#000';
        y.lineJoin = 'round';
        y.lineWidth = Math.max(0.7, px * 0.016);
        y.fillText('FreeMotion', lx, baseline);
        y.strokeText('FreeMotion', lx, baseline);
      }
      {
        const x = tealInk.g;
        x.drawImage(tealHead.canvas, 0, 0, W, H);
        x.drawImage(tealName.canvas, 0, 0, W, H);
        x.fillStyle = '#000';
        const y0 = fBottom - Math.max(8, Fh * 0.1);
        x.save();
        x.beginPath(); x.rect(pX - 8, y0, pW + 16, H - y0 + 20); x.clip();
        halftone(x, pitch * 1.18, 15, { x0: pX - 8, y0, x1: pX + pW + 8, y1: H + 16 }, (px1, py1) => {
          const p = clamp((py1 - y0) / (H - y0));
          return 0.04 + Math.pow(p, 1.25) * 1.05;
        }, 223, kit);
        x.restore();
      }
      // Marks the press leaves in both inks: register crosses and little solid swatches. They are what give the game away.
      {
        const r = Math.max(7, W * 0.022), cx0 = pX + r + 7, cx1 = pX + pW - r - 7, cyT = top + r + 2, cyB = safeBot - r - 6;
        const swatch = Math.max(9, W * 0.03);
        for (const L of [greyInk, tealInk]) {
          const x = L.g;
          x.strokeStyle = '#000';
          x.fillStyle = '#000';
          regMark(x, cx1, cyT, r);
          regMark(x, cx0, cyB, r);
          regMark(x, cx1, cyB, r);
        }
        greyInk.g.fillRect(cx1 - swatch * 0.5, cyT + r * 1.8, swatch, swatch);
        tealInk.g.fillRect(cx1 - swatch * 0.5, cyT + r * 1.8 + swatch + 3, swatch, swatch);
      }
      // Real ink: each layer gets its edges broken, its body uneven, and salt in it.
      const near = Math.max(1, logScale(D) - 1);
      const streaks = (seed, amt) => {
        const tb = new Float32Array(2048);
        const n2 = noiseOf(randTile(kit, seed));
        for (let i = 0; i < 2048; i++) tb[i] = 1 - amt * Math.pow(n2(i / 26, 2.3), 2) - amt * 0.6 * Math.pow(n2(i / 5, 9.1), 3);
        return (v) => tb[Math.min(2047, Math.max(0, v | 0))];
      };
      const greyRough = roughen(greyInk.canvas, { near, tile, noise, rgb: [74, 77, 80], scale: D, floor: 0.78, edge: 0.34, salt: 0.05, streak: streaks(231, 0.2) });
      const tealRough = roughen(tealInk.canvas, { near, tile, noise, rgb: [41, 217, 187], scale: D, floor: 0.82, edge: 0.34, salt: 0.05, streak: streaks(233, 0.14) });

      // The machine's top: enamel housing, a chrome bar, the black rubber roller.
      const hoodPlate = (colour, words) => {
        const L = kit.layer(W, headH + 26), x = L.g, r = rng(241);
        // The shadow the roller throws on the sheet.
        let gr = x.createLinearGradient(0, headH - 2, 0, headH + 24);
        gr.addColorStop(0, 'rgba(20,18,12,.58)'); gr.addColorStop(0.3, 'rgba(20,18,12,.2)'); gr.addColorStop(1, 'rgba(20,18,12,0)');
        x.fillStyle = gr; x.fillRect(0, headH - 2, W, 28);
        x.fillStyle = '#3f4238';
        x.fillRect(0, 0, W, headH - Math.max(14, H * 0.02));
        for (let i = 0; i < 320; i++) {
          x.fillStyle = r() < 0.5 ? 'rgba(255,255,240,' + r() * 0.1 + ')' : 'rgba(0,0,0,' + r() * 0.2 + ')';
          x.fillRect(r() * W, r() * headH, 0.6 + r() * 2, 0.6 + r() * 1.2);
        }
        // Roller.
        const ry = headH - Math.max(14, H * 0.02), rh = Math.max(14, H * 0.02);
        gr = x.createLinearGradient(0, ry, 0, ry + rh);
        gr.addColorStop(0, '#0d0d0c'); gr.addColorStop(0.3, '#42423d'); gr.addColorStop(0.46, '#7d7d74'); gr.addColorStop(0.6, '#2a2a27'); gr.addColorStop(1, '#050505');
        x.fillStyle = gr; x.fillRect(0, ry, W, rh);
        x.fillStyle = '#c9c9bf';
        x.fillRect(0, ry - 2, W, 2);
        // Screws, and the plate that names the ink on the drum.
        for (const fx of [0.05, 0.95]) {
          const sx = W * fx, sy = ry * 0.68, sr = Math.max(3.4, W * 0.011);
          x.fillStyle = '#9b9b90'; x.beginPath(); x.arc(sx, sy, sr, 0, TAU); x.fill();
          x.strokeStyle = '#2a2a26'; x.lineWidth = 1;
          x.beginPath(); x.moveTo(sx - sr * 0.7, sy - sr * 0.3); x.lineTo(sx + sr * 0.7, sy + sr * 0.3); x.stroke();
        }
        // A riveted plate on the housing naming the drum that is loaded. It changes when the ink does.
        const pw = Math.max(70, W * 0.21), ph = Math.max(13, H * 0.017), plx = W * 0.72 - pw / 2, ply = ry * 0.66 - ph / 2;
        x.fillStyle = colour;
        x.fillRect(plx, ply, pw, ph);
        x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 1;
        x.strokeRect(plx, ply, pw, ph);
        x.fillStyle = '#10110f';
        x.font = '700 ' + Math.round(ph * 0.74) + 'px "Courier Prime"';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(words, plx + pw / 2, ply + ph / 2 + 0.5);
        return L;
      };
      const hoodGrey = hoodPlate('#a9abab', 'DRUM 1 GREY'), hoodTeal = hoodPlate('#29d9bb', 'DRUM 2 TEAL');

      // Timing. Paper position is a table of jerks: it moves in hits and waits, like a pinch roller that keeps catching.
      const span = pBot - headH + 30;
      const feedKeys = [
        [0, -span * 0.95],
        [0.05, -span * 0.82, 'out2'], [0.13, -span * 0.82],
        [0.19, -span * 0.58, 'out3'], [0.32, -span * 0.58],
        [0.37, -span * 0.3, 'out3'], [0.47, -span * 0.3],
        [0.54, 0, 'out3'],
        [0.58, -span * 0.012, 'out2'], [0.62, 0, 'in2'],
        [0.96, 0],
        [1.08, -span * 1.02, 'in3'],
        [1.12, -span * 1.02],
        [1.17, -span * 0.5, 'out3'], [1.25, -span * 0.5],
        [1.3, -span * 0.13, 'out3'], [1.37, -span * 0.13],
        [1.42, 0, 'out3'],
      ];
      // Each knock is a thump through the machine, and the teal moves a part of the way home.
      const knocks = [
        { t: 1.8, to: 0.58, amp: 7 },
        { t: 2.1, to: 0.27, amp: 6 },
        { t: 2.27, to: 0.1, amp: 4.5 },
        { t: 2.38, to: 0.03, amp: 3 },
        { t: 2.46, to: 0.0, amp: 2 },
      ];
      const off0 = { x: W * 0.082, y: -W * 0.047, r: (-2.3 * Math.PI) / 180 };
      const rest = { x: 0.9, y: -0.7 };
      const offsetNow = (t) => {
        let p = 1;
        for (const n of knocks) {
          if (t >= n.t) { p = lerp(p, n.to, clamp((t - n.t) / 0.034)); }
        }
        return p;
      };
      // The sheet keeps every hit it took: earlier strikes stay on it as faint echoes.
      const echo = kit.layer(W, H);
      {
        const x = echo.g;
        const steps = [1, 0.58, 0.27, 0.1];
        steps.forEach((p, i) => {
          x.save();
          x.translate(W / 2 + off0.x * p, H / 2 + off0.y * p);
          x.rotate(off0.r * p);
          x.translate(-W / 2, -H / 2);
          x.globalAlpha = 0.09 + i * 0.05;
          x.drawImage(tealHead.canvas, 0, 0, W, H);
          x.globalAlpha = 0.03 + i * 0.03;
          x.drawImage(tealName.canvas, 0, 0, W, H);
          x.restore();
        });
      }
      const echoTeal = (function () {
        const c = cv(echo.canvas.width, echo.canvas.height), x = c.getContext('2d');
        x.drawImage(echo.canvas, 0, 0);
        x.globalCompositeOperation = 'source-in';
        x.fillStyle = '#29d9bb';
        x.fillRect(0, 0, c.width, c.height);
        return c;
      })();
      // Done with the working canvases: hand their memory back, which matters on a phone.
      [greyInk.canvas, tealInk.canvas, tealHead.canvas, tealName.canvas, echo.canvas].forEach((c) => { c.width = c.height = 0; });

      return function seek(t0) {
        const t = on(t0, 30), n = kit.frame(t0, 30);
        const feed = k(t, feedKeys);
        let sx = 0, sy = 0;
        for (const kn of knocks) {
          const dt = t - kn.t;
          if (dt >= 0 && dt < 0.16) {
            const a = kn.amp * (1 - dt / 0.16);
            sx += (n % 2 ? 1 : -1) * a * (W / 390);
            sy += (n % 2 ? -0.4 : 0.5) * a * (W / 390);
          }
        }
        // First arrival hit on the stop.
        if (t >= 0.54 && t < 0.66) sx += (n % 2 ? 1 : -1) * 2;
        if (t >= 1.42 && t < 1.56) sx += (n % 2 ? 1 : -1) * 4 * (1 - (t - 1.42) / 0.14);
        g.drawImage(bed.canvas, 0, 0, W, H);
        g.save();
        g.translate(sx, feed + sy);
        // The sheet's own shadow on the tray.
        g.fillStyle = 'rgba(12,12,8,.34)';
        g.fillRect(pX + 3, headH - span - 10, pW, H + span + 20);
        g.drawImage(paper.canvas, 0, 0, W, H);
        // Lower edge of the sheet, with a touch of curl while it moves.
        if (feed < -0.5) {
          const edge = pBot, gr = g.createLinearGradient(0, edge - 16, 0, edge);
          gr.addColorStop(0, 'rgba(60,50,30,0)'); gr.addColorStop(1, 'rgba(60,50,30,.3)');
          g.fillStyle = gr; g.fillRect(pX, edge - 16, pW, 16);
        }
        // Ink stays on the sheet, whatever the register is doing.
        g.save();
        g.beginPath();
        g.rect(pX, -span - 20, pW, H + span + 40);
        g.clip();
        g.globalCompositeOperation = 'multiply';
        g.drawImage(greyRough, 0, 0, W, H);
        if (t >= 1.08) {
          const p = offsetNow(t);
          if (t >= 2.1) { g.globalAlpha = map(t, 2.1, 2.14); g.drawImage(echoTeal, 0, 0, W, H); g.globalAlpha = 1; }
          g.save();
          g.translate(W / 2 + off0.x * p + rest.x * (1 - p), H / 2 + off0.y * p + rest.y * (1 - p));
          g.rotate(off0.r * p);
          g.translate(-W / 2, -H / 2);
          g.drawImage(tealRough, 0, 0, W, H);
          g.restore();
        }
        g.restore();
        g.restore();
        // Below the sheet's bottom edge the tray shows, so cover the sheet's overrun.
        g.fillStyle = '#6f7069';
        if (feed > -0.5) g.fillRect(0, pBot + sy, W, H - pBot + 4);
        else {
          const by = pBot + feed;
          g.drawImage(bed.canvas, 0, by * D, W * D, (H - by) * D, 0, by, W, H - by);
        }
        // The sheet's little shadow on the tray, below its edge.
        const edgeY = pBot + (feed > -0.5 ? sy : feed);
        g.fillStyle = 'rgba(12,12,8,.34)';
        g.fillRect(pX + 3 + sx, edgeY, pW, 3);
        const hd = t >= 1.04 ? hoodTeal : hoodGrey;
        // The housing takes the same thump as the sheet, less of it. The roller's ribs turn with the feed.
        const hy = sy * 0.5;
        g.drawImage(hd.canvas, 0, hy, W, headH + 26);
        const rollH = Math.max(14, H * 0.02), rollY = headH - rollH + hy;
        g.fillStyle = 'rgba(255,255,245,.14)';
        const ribGap = rollH / 3, turn = ((-feed * 0.7) % ribGap + ribGap) % ribGap;
        for (let i = 0; i < 3; i++) g.fillRect(0, rollY + ((i * ribGap + turn) % rollH), W, 1);
      };
    },
  });

  // ---------------------------------------------------------------------------------------------------------------
  // (c) ARCADE BOOT
  // ---------------------------------------------------------------------------------------------------------------
  const GLYPH = {
    F: ['11111', '11000', '11000', '11110', '11000', '11000', '11000'],
    r: ['00000', '00000', '11011', '11100', '11000', '11000', '11000'],
    e: ['00000', '00000', '01110', '11011', '11111', '11000', '01111'],
    M: ['10001', '11011', '11111', '10101', '10001', '10001', '10001'],
    o: ['00000', '00000', '01110', '11011', '11011', '11011', '01110'],
    t: ['01100', '01100', '11111', '01100', '01100', '01100', '00111'],
    i: ['01100', '00000', '11100', '01100', '01100', '01100', '11110'],
    n: ['00000', '00000', '11110', '11011', '11011', '11011', '11011'],
  };

  FMI.add({
    id: 'street-arcade',
    lane: LANE,
    name: 'Arcade boot',
    blurb: 'A pixel F drops onto a row of blank tiles and bounces, its playhead gets knocked off the screen, the tiles flip to the name, and the playhead falls back in and sets off a colour wave.',
    dur: 2.6,
    ground: '#9bbc0f',
    make(stage, kit) {
      const W = kit.w, H = kit.h, { bounceY } = kit;
      const g = kit.canvas({ alpha: false });
      g.imageSmoothingEnabled = false;
      const cell = Math.max(3, Math.floor(W / 64));
      const cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
      const bgC = cv(cols, rows), bg = bgC.getContext('2d');
      const fgC = cv(cols, rows), fg = fgC.getContext('2d');
      // The LCD: the gaps between cells, the plastic window's sheen, the shade at the rim. Drawn once, laid over every frame.
      const lcd = kit.layer(W, H);
      {
        const x = lcd.g, lw = Math.max(0.8, cell * 0.15);
        x.fillStyle = 'rgba(12,26,10,.15)';
        for (let c1 = 0; c1 <= cols; c1++) x.fillRect(c1 * cell - lw / 2, 0, lw, H);
        for (let r1 = 0; r1 <= rows; r1++) x.fillRect(0, r1 * cell - lw / 2, W, lw);
        x.fillStyle = 'rgba(255,255,255,.055)';
        x.beginPath(); x.moveTo(0, H * 0.3); x.lineTo(W * 0.78, 0); x.lineTo(W * 0.42, 0); x.lineTo(0, H * 0.16); x.closePath(); x.fill();
        const gv = x.createLinearGradient(0, 0, 0, H);
        gv.addColorStop(0, 'rgba(10,20,6,.14)'); gv.addColorStop(0.08, 'rgba(10,20,6,0)'); gv.addColorStop(0.92, 'rgba(10,20,6,0)'); gv.addColorStop(1, 'rgba(10,20,6,.18)');
        x.fillStyle = gv; x.fillRect(0, 0, W, H);
      }

      // Palettes: [ground, light, mid, dark, playhead].
      const DMG = ['#9bbc0f', '#8bac0f', '#4a7a22', '#0f380f', '#0f380f'];
      const CYCLE = [
        ['#0f380f', '#306230', '#8bac0f', '#d2e27a', '#d2e27a'],
        ['#f6c744', '#e88a2c', '#a83a1e', '#2e1409', '#2e1409'],
        ['#ef6f7c', '#c23c5b', '#6d1c39', '#1e0814', '#fff3d6'],
        ['#fff3d6', '#f0c988', '#c56b3a', '#23150c', '#c23c5b'],
        ['#1e2a2c', '#2f4648', '#7d8f90', '#e9ecd8', '#f6c744'],
        ['#f6c744', '#e88a2c', '#a83a1e', '#2e1409', '#2e1409'],
      ];
      const FINAL = ['#29d9bb', '#1eb9a0', '#0e6f60', '#06231f', '#fff6dc'];
      const OFF = ['#7f9320', '#7f9320', '#7f9320', '#7f9320', '#7f9320'];

      // The scene, in cells: 64 wide and centred, so every phone gets the same chunky drawing.
      const ox = Math.floor((cols - 64) / 2);
      const yTile = Math.floor(rows * 0.6);
      const tileH = 10, tileW = 6;
      const clip = [{ w: 46, h: 11 }, { w: 31, h: 11 }, { w: 13, h: 11 }], cgap = 3;
      const fH = clip.length * 11 + cgap * 2;
      const fx = ox + 1;
      const headCol = fx + 33;

      // Bounce: the F falls from above the screen and loses height each landing.
      const h0 = yTile + 12, gr = (2 * h0) / (0.34 * 0.34), start = 0.04, e = 0.56;
      const lands = [];
      {
        let tl = start + Math.sqrt((2 * h0) / gr), v = gr * Math.sqrt((2 * h0) / gr) * e;
        lands.push(tl);
        for (let i = 0; i < 4 && v > 8; i++) { tl += (2 * v) / gr; lands.push(tl); v *= e; }
      }
      const fallAt = (t) => Math.round(bounceY(t - start, h0, gr, e));
      // The playhead goes straight up when the F first hits, and gravity brings it back.
      const tThrow = lands[0], airT = 1.3, tThunk = tThrow + airT;
      const apex = 62, gh = (8 * apex) / (airT * airT), vh = (gh * airT) / 2;
      const word = 'FreeMotion';
      const L1 = lands[1], L2 = lands[2];
      const flipAt = [L1, L1 + 0.067, L1 + 0.134, L1 + 0.2, L2, L2, L2 + 0.067, L2 + 0.134, L2 + 0.134, L2 + 0.267];

      let paint = FINAL, waveOn = false, wavePhase = 0, waveRow = 0;
      const palAt = (row) => {
        if (!waveOn) return paint;
        const d = Math.abs(row - waveRow);
        const ph = Math.floor((wavePhase * 11 - d) / 7);
        if (ph < 0) return DMG;
        if (ph >= CYCLE.length) return FINAL;
        return CYCLE[ph];
      };
      function px(c, x, y, w, h, shade) {
        if (w <= 0 || h <= 0) return;
        if (!waveOn) { c.fillStyle = paint[shade]; c.fillRect(x, y, w, h); return; }
        for (let r = 0; r < h; r++) { c.fillStyle = palAt(y + r)[shade]; c.fillRect(x, y + r, w, 1); }
      }
      function drawClip(c, x, y, w, h) {
        px(c, x + 1, y, w - 2, h, 3);
        px(c, x, y + 1, w, h - 2, 3);
        // One lit row and the two pixels that say "clip".
        px(c, x + 2, y + 1, w - 4, 1, 2);
        px(c, x + 2, y + 3, 1, h - 6, 2);
      }
      function drawFsprite(c, xx, yy, squash) {
        let y1 = yy;
        for (let i = 0; i < 3; i++) {
          const hh = clip[i].h - squash, ww = clip[i].w + squash;
          drawClip(c, xx - (squash > 0 ? 1 : 0), y1, ww, hh);
          y1 += hh + cgap;
        }
        // The slot the playhead lives in. Empty, it is a funny little gap in the F.
        c.clearRect(headCol - 1, yy - 1, 4, clip[1].h * 2 + cgap + 2);
      }
      function drawHead(c, xx, yy, len) {
        px(c, xx, yy, 2, len, 4);
        const widths = [2, 4, 6, 7, 6, 4, 2];
        widths.forEach((wd, i) => px(c, xx - 1, yy - 7 + i, wd, 1, 4));
      }
      function drawSpin(c, cx1, cy1, frameN) {
        const dir = frameN % 4, len = 12;
        for (let i = -len; i <= len; i++) {
          const ax = dir === 0 ? 0 : dir === 2 ? i : i * 0.72, ay = dir === 0 ? i : dir === 2 ? 0 : dir === 1 ? i * 0.72 : -i * 0.72;
          px(c, Math.round(cx1 + ax), Math.round(cy1 + ay), 2, 2, 4);
        }
        const tipX = dir === 0 ? 0 : dir === 2 ? len : len * 0.72, tipY = dir === 0 ? -len : dir === 2 ? 0 : dir === 1 ? len * 0.72 : -len * 0.72;
        px(c, Math.round(cx1 + tipX) - 2, Math.round(cy1 + tipY) - 2, 6, 6, 4);
      }
      function drawTile(c, x, y, idx, wd, face) {
        const lft = x + Math.floor((tileW - wd) / 2);
        if (!face) {
          // The blank side.
          px(c, lft, y, wd, tileH, 2);
          px(c, lft, y + tileH - 1, wd, 1, 3);
          if (wd >= 4) { px(c, lft + 2, y + 3, 2, 3, 1); }
          return;
        }
        px(c, lft, y, wd, tileH, 3);
        const gl = GLYPH[word[idx]];
        const gw = wd >= 6 ? 5 : wd >= 4 ? 3 : 1;
        const gx = lft + (wd >= 6 ? 1 : Math.floor((wd - gw) / 2));
        for (let ry = 0; ry < 7; ry++) {
          for (let c1 = 0; c1 < gw; c1++) {
            const sx = gw === 5 ? c1 : Math.floor(((c1 + 0.5) / gw) * 5);
            if (gl[ry][sx] === '1') px(c, gx + c1, y + 1 + ry, 1, 1, 0);
          }
        }
      }
      function drawGround(c, yy) {
        // Under the tiles: the crude dithered floor of a four-colour console game.
        const y0 = yy + tileH;
        px(c, 0, y0, cols, 1, 3);
        for (let r = 1; r < rows - y0; r++) {
          const band = Math.min(4, Math.floor(r / 6)), yr = y0 + r;
          if (band === 0) { for (let i = r % 2; i < cols; i += 2) px(c, i, yr, 1, 1, 1); }
          else if (band === 1) px(c, 0, yr, cols, 1, 1);
          else if (band === 2) { px(c, 0, yr, cols, 1, 1); for (let i = r % 2; i < cols; i += 2) px(c, i, yr, 1, 1, 2); }
          else px(c, 0, yr, cols, 1, 2);
        }
      }

      return function seek(t0) {
        const FPS = 15, n = kit.frame(t0, FPS), t = n / FPS;
        waveOn = false;
        const on1 = t >= 0.067;
        paint = on1 ? DMG : OFF;
        if (t >= tThunk) { waveOn = true; wavePhase = (t - tThunk) * FPS; waveRow = yTile; }
        bg.clearRect(0, 0, cols, rows);
        fg.clearRect(0, 0, cols, rows);
        if (waveOn) { for (let r = 0; r < rows; r++) { bg.fillStyle = palAt(r)[0]; bg.fillRect(0, r, cols, 1); } }
        else { bg.fillStyle = paint[0]; bg.fillRect(0, 0, cols, rows); }
        if (on1) {
          // Hits: how far the row of tiles is pushed down, and how much the screen jumps.
          let dent = 0, jump = 0;
          lands.forEach((l, i) => {
            const dt = t - l;
            if (dt >= -1e-6 && dt < 0.14) dent = Math.max(dent, i === 0 ? (dt < 0.07 ? 3 : 1) : 1);
          });
          if (t >= tThunk && t - tThunk < 0.2) dent = Math.max(dent, t - tThunk < 0.07 ? 3 : 1);
          if (t >= lands[0] && t - lands[0] < 0.2) jump = n % 2 ? 1 : -1;
          if (t >= tThunk && t - tThunk < 0.27) jump = n % 2 ? -1 : 1;
          const yy = yTile + jump;
          drawGround(bg, yy);
          for (let i = 0; i < 10; i++) {
            const dtf = t - flipAt[i];
            const hop = dtf >= 0 && dtf < 0.067 ? -2 : dtf >= 0.067 && dtf < 0.134 ? -1 : 0;
            let wd = tileW, face = false;
            if (dtf >= 0) {
              const fr = Math.floor(dtf * FPS + 1e-6);
              wd = [4, 1, 1, 4, 6][Math.min(4, fr)];
              face = fr >= 2;
            }
            // Blocks are the width of the letter plus one, so the last column closes the bar.
            drawTile(fg, ox + 1 + i * tileW, yy + dent + hop, i, wd, face);
          }
          px(fg, ox + 1 + 10 * tileW, yy + dent, 1, tileH, flipAt[9] <= t ? 3 : 2);
          // Where the F is, and where it just was: the slow LCD keeps a ghost.
          const fyOf = (tt) => yy + dent - fH - fallAt(tt);
          const fNow = fyOf(t);
          if (t < lands[3] + 0.1 && t >= start) {
            const yb = fyOf(t - 1 / FPS);
            if (Math.abs(yb - fNow) >= 1) {
              let yc = yb;
              for (let i = 0; i < 3; i++) { px(bg, fx, yc, clip[i].w, clip[i].h, 1); yc += clip[i].h + cgap; }
            }
          }
          let squash = 0;
          lands.forEach((l, i) => {
            const dt = t - l;
            if (dt >= -1e-6 && dt < 0.067) squash = Math.max(squash, i === 0 ? 4 : i === 1 ? 3 : 1);
            else if (dt >= 0.067 && dt < 0.134) squash = Math.max(squash, i === 0 ? 2 : i === 1 ? 1 : 0);
          });
          if (t >= tThunk && t - tThunk < 0.067) squash = 2;
          if (t >= start) drawFsprite(fg, fx, fNow + squash * 3, squash);
          // Dust at the landings: two crude puffs running out from under the F.
          for (let i = 0; i < 2; i++) {
            const dt = t - lands[i];
            if (dt < 0 || dt >= 0.27) continue;
            const fr = Math.floor(dt * FPS + 1e-6), sz = [3, 3, 2, 1][fr];
            for (const side of [-1, 1]) {
              const dx = side < 0 ? fx - 2 - fr * 2 + 1 : fx + 14 + fr * 4;
              px(fg, dx, yy - 3 - fr + i, sz, sz, 2);
              px(fg, dx + side * 3, yy - 2 - fr, Math.max(1, sz - 1), Math.max(1, sz - 1), 2);
            }
          }
          // The playhead: on the F until the first hit, then up and over.
          if (t < tThrow) {
            drawHead(fg, headCol, fNow - 3, fH + 3);
          } else if (t < tThunk) {
            const dt = t - tThrow;
            const up = vh * dt - 0.5 * gh * dt * dt;
            const y1 = yy - fH - 4 - up;
            if (t > tThunk - 0.28) drawHead(fg, headCol, Math.round(y1), fH + 3);
            else if (y1 > -20) drawSpin(fg, headCol + Math.round(dt * 26), Math.round(y1 + 12), n);
          } else {
            drawHead(fg, headCol, fNow - 3, fH + 3);
          }
        }
        // Compose: the ground, a faint offset shadow of the sprites on the back plate, then the sprites and the glass.
        const dw = cols * cell, dh = rows * cell;
        g.imageSmoothingEnabled = false;
        g.drawImage(bgC, 0, 0, dw, dh);
        g.globalAlpha = 0.18;
        g.drawImage(fgC, Math.max(1.5, cell * 0.35), Math.max(2, cell * 0.5), dw, dh);
        g.globalAlpha = 1;
        g.drawImage(fgC, 0, 0, dw, dh);
        g.drawImage(lcd.canvas, 0, 0, W, H);
      };
    },
  });

  // ---------------------------------------------------------------------------------------------------------------
  // (d) RANSOM NOTE
  // ---------------------------------------------------------------------------------------------------------------
  FMI.add({
    id: 'street-ransom',
    lane: LANE,
    name: 'Ransom note',
    blurb: 'Strips and letters cut from old print get slapped down one at a time, and the last letter lands upside down until it is slapped right.',
    dur: 3.05,
    ground: '#d8d5ca',
    make(stage, kit) {
      const W = kit.w, H = kit.h, D = kit.dpr, { k, on, map, ease, clamp, lerp, hash, rng, F } = kit;
      const g = kit.canvas({ alpha: false });
      const safeTop = 64, safeBot = H - 118, avail = safeBot - safeTop;

      // The page: a photocopy of a photocopy, toner dirt and a hard black edge where the lid was left up.
      const page = kit.layer(W, H);
      {
        const x = page.g, r = rng(311);
        x.fillStyle = '#d8d5ca';
        x.fillRect(0, 0, W, H);
        // Copier streaks.
        for (let i = 0; i < 26; i++) {
          x.fillStyle = 'rgba(40,38,34,' + (0.015 + r() * 0.05) + ')';
          x.fillRect(r() * W, 0, 0.6 + r() * 3.5, H);
        }
        // Toner dust.
        for (let i = 0; i < 2600; i++) {
          x.fillStyle = 'rgba(20,20,18,' + (0.25 + r() * 0.6) + ')';
          const s = 0.35 + Math.pow(r(), 4) * 1.8;
          x.fillRect(r() * W, r() * H, s, s);
        }
        for (let i = 0; i < 26; i++) {
          x.fillStyle = 'rgba(16,16,14,.7)';
          const cx = r() * W, cy = r() * H;
          for (let j = 0; j < 22; j++) x.fillRect(cx + (r() - 0.5) * 16, cy + (r() - 0.5) * 10, 0.6 + r(), 0.6 + r());
        }
        // Fold lines from being in someone's pocket.
        for (const fy of [0.33, 0.67]) {
          const yy = H * fy;
          x.fillStyle = 'rgba(30,28,24,.2)';
          x.fillRect(0, yy, W, 1);
          x.fillStyle = 'rgba(255,255,250,.5)';
          x.fillRect(0, yy + 1, W, 1.2);
          for (let i = 0; i < 90; i++) { x.fillStyle = 'rgba(20,20,18,.42)'; x.fillRect(r() * W, yy - 1 + r() * 3, 0.8 + r() * 2.6, 0.7); }
        }
        // The black edge of the copier, top and bottom, rough where the toner breaks up.
        const edge = (yA, dir, depth) => {
          x.fillStyle = '#121211';
          x.beginPath();
          x.moveTo(0, yA);
          for (let px = 0; px <= W + 8; px += 8) x.lineTo(px, yA + dir * (depth + (r() - 0.5) * 3 + Math.sin(px * 0.02) * 2));
          x.lineTo(W, yA);
          x.closePath();
          x.fill();
          for (let i = 0; i < 700; i++) {
            const yy = yA + dir * (depth - 2 + Math.pow(r(), 2.4) * 22);
            x.fillRect(r() * W, yy, 0.5 + r() * 1.2, 0.5 + r() * 1.2);
          }
        };
        edge(0, 1, Math.max(26, H * 0.04));
        edge(H, -1, Math.max(34, H * 0.05));
      }

      // A piece of paper cut with bad scissors. Everything baked: paper, what was printed on it, its edge and its shadow.
      function clipSprite(cw, ch, seed, paint) {
        const P = 7, L = kit.layer(cw + P * 2, ch + P * 2), x = L.g, r = rng(seed);
        const v = [
          [P + r() * cw * 0.05, P + r() * ch * 0.08],
          [P + cw * (0.5 + (r() - 0.5) * 0.3), P + r() * ch * 0.04],
          [P + cw - r() * cw * 0.05, P + r() * ch * 0.1],
          [P + cw - r() * cw * 0.03, P + ch * (0.5 + (r() - 0.5) * 0.3)],
          [P + cw - r() * cw * 0.05, P + ch - r() * ch * 0.1],
          [P + cw * (0.45 + (r() - 0.5) * 0.3), P + ch - r() * ch * 0.04],
          [P + r() * cw * 0.06, P + ch - r() * ch * 0.08],
        ];
        const path = () => { x.beginPath(); v.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); };
        x.save();
        x.shadowColor = 'rgba(0,0,0,.42)';
        x.shadowBlur = 2.4 * D;
        x.shadowOffsetX = 1 * D;
        x.shadowOffsetY = 1.6 * D;
        path();
        x.fillStyle = '#fff';
        x.fill();
        x.restore();
        x.save();
        path();
        x.clip();
        paint(x, P, P, cw, ch, r);
        x.restore();
        // The cut edge catches light.
        path();
        x.strokeStyle = 'rgba(255,255,255,.55)';
        x.lineWidth = 0.7;
        x.stroke();
        return { L, w: cw + P * 2, h: ch + P * 2, shape: v };
      }
      function bodyText(x, ax, ay, aw, ah, r, ink, pitch) {
        x.fillStyle = ink;
        for (let yy = ay + 1; yy < ay + ah; yy += pitch) {
          let cx = ax + r() * -8;
          while (cx < ax + aw) {
            const l = 2 + r() * 9;
            x.fillRect(cx, yy, l, Math.max(0.8, pitch * 0.34));
            cx += l + 1 + r() * 1.5;
          }
        }
      }
      const glyph = (x, ch, font, size, ax, ay, aw, ah, ink, neighbours) => {
        x.font = font.replace('$', size);
        x.fillStyle = ink;
        x.textBaseline = 'alphabetic';
        x.textAlign = 'center';
        const m = x.measureText(ch);
        const base = ay + ah / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
        x.fillText(ch, ax + aw / 2, base);
        if (neighbours) {
          // The letters either side, cut through. That is what makes it look clipped from a headline.
          const wl = x.measureText(neighbours[0]).width, wr = x.measureText(neighbours[1]).width;
          x.fillText(neighbours[0], ax + aw / 2 - m.width / 2 - wl / 2 - size * 0.02, base);
          x.fillText(neighbours[1], ax + aw / 2 + m.width / 2 + wr / 2 + size * 0.02, base);
        }
      };
      const PAPERS = {
        news: (x, ax, ay, aw, ah, r) => {
          x.fillStyle = '#e4dcc4'; x.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
          x.fillStyle = 'rgba(120,96,60,.1)';
          for (let i = 0; i < 300; i++) x.fillRect(ax + r() * aw, ay + r() * ah, 0.8, 0.8);
        },
        white: (x, ax, ay, aw, ah, r) => {
          x.fillStyle = '#f3f0e8'; x.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
          x.fillStyle = 'rgba(60,60,60,.05)';
          for (let i = 0; i < 200; i++) x.fillRect(ax + r() * aw, ay + r() * ah, 1, 1);
        },
        red: (x, ax, ay, aw, ah, r) => {
          x.fillStyle = '#cf2b1e'; x.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
          x.fillStyle = 'rgba(255,255,255,.12)';
          x.beginPath(); x.moveTo(ax, ay + ah * 0.2); x.lineTo(ax + aw, ay - ah * 0.1); x.lineTo(ax + aw, ay + ah * 0.22); x.lineTo(ax, ay + ah * 0.5); x.fill();
        },
        pink: (x, ax, ay, aw, ah, r) => {
          x.fillStyle = '#f0bfa6'; x.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
          x.fillStyle = 'rgba(120,50,30,.1)';
          for (let i = 0; i < 200; i++) x.fillRect(ax + r() * aw, ay + r() * ah, 1, 1);
        },
        yellow: (x, ax, ay, aw, ah, r) => {
          x.fillStyle = '#efc42f'; x.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
          x.fillStyle = 'rgba(40,30,0,.3)';
          x.fillRect(ax + aw * 0.08, ay - 2, 0.7, ah + 4);
        },
        black: (x, ax, ay, aw, ah, r) => {
          x.fillStyle = '#141413'; x.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
          x.fillStyle = 'rgba(255,255,255,.08)';
          for (let i = 0; i < 90; i++) x.fillRect(ax + r() * aw, ay + r() * ah, 1, 1);
        },
        dots: (x, ax, ay, aw, ah, r) => {
          x.fillStyle = '#f5efe0'; x.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
          x.fillStyle = '#e04a3a';
          const p = Math.max(3.4, aw * 0.08);
          for (let v = -2; v < ah / p + 2; v++) for (let u = -2; u < aw / p + 2; u++) {
            x.beginPath(); x.arc(ax + (u + (v % 2) * 0.5) * p, ay + v * p * 0.86, p * 0.28, 0, TAU); x.fill();
          }
        },
        kraft: (x, ax, ay, aw, ah, r) => {
          x.fillStyle = '#b58e5e'; x.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
          x.strokeStyle = 'rgba(70,44,18,.2)'; x.lineWidth = 0.6;
          for (let i = 0; i < 90; i++) { const sx = ax + r() * aw, sy = ay + r() * ah; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + r() * 6, sy + r() * 2); x.stroke(); }
        },
      };

      // The word, one cutting per letter.
      const defs = [
        { ch: 'F', font: '$px "Abril Fatface"', size: 1.1, paper: 'news', ink: '#141310', nb: ['B', 'R'], wide: 1.02 },
        { ch: 'r', font: '700 $px "Courier Prime"', size: 1.02, paper: 'white', ink: '#1d1c1a', wide: 0.82 },
        { ch: 'e', font: '$px "Anton"', size: 1.12, paper: 'red', ink: '#fbf5e4', wide: 0.86 },
        { ch: 'e', font: '$px "Special Elite"', size: 1.06, paper: 'pink', ink: '#201410', wide: 0.9 },
        { ch: 'M', font: '$px "Archivo Black"', size: 1.14, paper: 'yellow', ink: '#121110', wide: 1.26 },
        { ch: 'o', font: '$px "Abril Fatface"', size: 1.08, paper: 'black', ink: '#f3efe2', wide: 0.9 },
        { ch: 't', font: '$px "Anton"', size: 1.02, paper: 'dots', ink: '#121110', wide: 0.78 },
        { ch: 'i', font: '700 $px "Courier Prime"', size: 1.06, paper: 'kraft', ink: '#14100a', wide: 0.72 },
        { ch: 'o', font: '$px "Archivo Black"', size: 0.96, paper: 'news', ink: '#0f9a83', wide: 0.92 },
        { ch: 'n', font: '$px "Abril Fatface"', size: 1.14, paper: 'white', ink: '#101010', nb: ['a', 'u'], wide: 1 },
      ];
      const totalW = defs.reduce((a, d) => a + d.wide, 0);
      const usable = W * 0.95, unit = usable / (totalW * 0.9 + 0.1);
      const cH = unit * 1.86;
      const sz = unit * 1.62;
      // The F and the word as one block, up off the buttons.
      const s = Math.min((W * 0.84) / F.box.w, (avail * 0.6) / F.box.h);
      const Fw = F.box.w * s, Fh = F.box.h * s, gapN = Math.max(16, cH * 0.42);
      const blockH = Fh + gapN + cH, blockTop = safeTop + Math.max(0, avail - blockH) * 0.42;
      const baseY = blockTop + Fh + gapN + cH / 2;
      let cursor = (W - usable) / 2;
      const letters = defs.map((d, i) => {
        const cw = unit * d.wide, chh = cH * (d.ch === 'M' ? 1.14 : d.ch === 'i' ? 0.92 : 1);
        const sp = clipSprite(cw, chh, 400 + i, (x, ax, ay, aw, ah, r) => {
          PAPERS[d.paper](x, ax, ay, aw, ah, r);
          glyph(x, d.ch, d.font, sz * d.size * (d.ch === 'M' ? 0.98 : 1), ax, ay, aw, ah, d.ink, d.nb);
        });
        const cx = cursor + cw / 2;
        cursor += cw * 0.9;
        const yJit = (hash(i, 7) - 0.5) * cH * 0.24, rJit = (hash(i, 9) - 0.5) * 0.26;
        return { sp, x: cx, y: baseY + yJit, rot: rJit, cw, ch: chh };
      });

      // The F: three strips cut out of old pages, and a length of teal tape.
      const fx = (W - Fw) / 2 - W * 0.01, fy = blockTop;
      const ox = fx - F.box.x * s, oy = fy - F.box.y * s;
      const photoNoise = noiseOf(randTile(kit, 77));
      const stripPaint = [
        (x, ax, ay, aw, ah, r) => {
          PAPERS.news(x, ax, ay, aw, ah, r);
          x.fillStyle = '#16140f';
          x.font = (ah * 1.02) + 'px "Abril Fatface"';
          x.textBaseline = 'alphabetic';
          x.textAlign = 'left';
          x.fillText('LATE EDITION PICTURES', ax - ah * 0.18, ay + ah * 0.84);
        },
        (x, ax, ay, aw, ah, r) => {
          x.fillStyle = '#c9c6ba'; x.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
          // A slice of a halftoned photo.
          const p = Math.max(3, s * 1.6);
          x.fillStyle = '#17161a';
          for (let v = -2; v < ah / p + 2; v++) for (let u = -2; u < aw / p + 2; u++) {
            const dx = ax + (u + (v % 2) * 0.5) * p, dy = ay + v * p * 0.86;
            const lum = Math.min(1, 0.12 + Math.pow(photoNoise(dx / (s * 18) + 3, dy / (s * 9)) * 0.75 + photoNoise(dx / (s * 5), dy / (s * 5)) * 0.25, 1.4) * 1.15);
            x.beginPath(); x.arc(dx, dy, p * 0.64 * Math.sqrt(lum), 0, TAU); x.fill();
          }
        },
        (x, ax, ay, aw, ah, r) => {
          PAPERS.black(x, ax, ay, aw, ah, r);
          x.fillStyle = '#efeadc';
          x.font = '100px "Anton"';
          const cutSize = Math.min(ah * 0.84, ((aw * 0.8) / x.measureText('CUT').width) * 100);
          x.font = cutSize + 'px "Anton"';
          x.textBaseline = 'alphabetic';
          x.textAlign = 'center';
          x.fillText('CUT', ax + aw / 2, ay + ah / 2 + cutSize * 0.43);
        },
      ];
      const strips = F.clips.map((c, i) => {
        const cw = c.w * s, chh = c.h * s;
        const sp = clipSprite(cw, chh, 500 + i, stripPaint[i]);
        return { sp, x: ox + (c.x + c.w / 2) * s, y: oy + (c.y + c.h / 2) * s, rot: [-0.012, 0.016, -0.03][i], cw, ch: chh };
      });
      // Teal tape, vector cut, with a torn end, sheen and fine wrinkles.
      const hd = F.head, tapeWd = Math.max(8, (hd.w + 1.6) * s), tapeLen = hd.h * s;
      const tealStrip = kit.layer(tapeWd + 10, tapeLen + 20);
      {
        const x = tealStrip.g, r = rng(601);
        x.translate(5, 10);
        x.save();
        x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 2 * D; x.shadowOffsetX = 1 * D; x.shadowOffsetY = 1.4 * D;
        x.beginPath();
        x.moveTo(0, 0);
        x.lineTo(tapeWd, 1);
        x.lineTo(tapeWd, tapeLen);
        for (let i = 1; i <= 6; i++) x.lineTo(tapeWd - (i * tapeWd) / 6, tapeLen + (i % 2 ? -4 : 2) * (0.5 + r()));
        x.closePath();
        x.fillStyle = '#23c8ad';
        x.fill();
        x.restore();
        x.save();
        x.clip();
        const gr = x.createLinearGradient(0, 0, tapeWd, 0);
        gr.addColorStop(0, 'rgba(0,50,44,.12)'); gr.addColorStop(0.3, 'rgba(255,255,255,.14)'); gr.addColorStop(0.5, 'rgba(255,255,255,.02)'); gr.addColorStop(1, 'rgba(0,50,44,.14)');
        x.fillStyle = gr;
        x.fillRect(-1, -1, tapeWd + 2, tapeLen + 8);
        x.lineWidth = 0.6;
        for (let i = 0; i < 26; i++) {
          x.strokeStyle = r() < 0.5 ? 'rgba(0,50,44,.22)' : 'rgba(255,255,255,.2)';
          const yy = r() * tapeLen;
          x.beginPath(); x.moveTo(0, yy); x.lineTo(tapeWd, yy + (r() - 0.5) * 4); x.stroke();
        }
        x.restore();
      }
      const triW = (hd.tri[1][0] - hd.tri[0][0]) * s * 1.25, triH = (hd.tri[2][1] - hd.tri[0][1]) * s * 1.25;
      const tealTri = kit.layer(triW + 12, triH + 12);
      {
        const x = tealTri.g;
        x.translate(6, 6);
        x.save();
        x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 2 * D; x.shadowOffsetX = 1 * D; x.shadowOffsetY = 1.4 * D;
        x.beginPath(); x.moveTo(0, 1); x.lineTo(triW, triH * 0.52); x.lineTo(1, triH); x.closePath();
        x.fillStyle = '#23c8ad';
        x.fill();
        x.restore();
        x.save();
        x.clip();
        const gr = x.createLinearGradient(0, 0, triW, triH);
        gr.addColorStop(0.2, 'rgba(255,255,255,.26)'); gr.addColorStop(0.6, 'rgba(255,255,255,.02)'); gr.addColorStop(1, 'rgba(0,50,44,.26)');
        x.fillStyle = gr;
        x.fillRect(0, 0, triW, triH);
        x.restore();
      }
      const hdX = ox + hd.x * s - (tapeWd - hd.w * s) / 2, hdY = oy + hd.y * s;
      // Masking tape, dropped over things in the order they went down.
      const maskW = Math.max(30, W * 0.11), maskH = Math.max(11, W * 0.034);
      const maskSprite = (seed) => clipSprite(maskW, maskH, seed, (x, ax, ay, aw, ah, r) => {
        x.fillStyle = '#e4d9ae'; x.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
        x.strokeStyle = 'rgba(110,90,50,.22)'; x.lineWidth = 0.6;
        for (let i = 0; i < 14; i++) { const px1 = ax + r() * aw; x.beginPath(); x.moveTo(px1, ay); x.lineTo(px1 + (r() - 0.5) * 3, ay + ah); x.stroke(); }
        x.fillStyle = 'rgba(255,255,255,.2)';
        x.fillRect(ax, ay + ah * 0.1, aw, ah * 0.18);
      });
      const tapes = [
        { sp: maskSprite(701), x: strips[0].x - strips[0].cw * 0.5, y: strips[0].y - strips[0].ch * 0.26, rot: -0.7, t: 0.18 },
        { sp: maskSprite(702), x: strips[0].x + strips[0].cw * 0.46, y: strips[0].y + strips[0].ch * 0.3, rot: 0.5, t: 0.2 },
        { sp: maskSprite(703), x: strips[2].x - strips[2].cw * 0.2, y: strips[2].y + strips[2].ch * 0.5, rot: 0.2, t: 0.56 },
        { sp: maskSprite(704), x: letters[0].x - letters[0].cw * 0.3, y: letters[0].y - letters[0].ch * 0.5, rot: -0.3, t: 1.06 },
        { sp: maskSprite(705), x: letters[4].x, y: letters[4].y - letters[4].ch * 0.52, rot: 0.1, t: 1.68 },
        { sp: maskSprite(706), x: letters[9].x, y: letters[9].y + letters[9].ch * 0.5, rot: -0.15, t: 2.74 },
      ];

      // When each thing lands. Uneven on purpose: he slaps them down, stops, gets bored, rushes.
      const tS = [0.05, 0.3, 0.42];
      const tL = [0.94, 1.08, 1.15, 1.22, 1.56, 1.76, 1.84, 1.9, 1.98, 2.1];
      const tFix = 2.6;
      const hits = [];
      tS.forEach((v, i) => hits.push({ t: v, a: 3.2 - i * 0.5 }));
      tL.forEach((v, i) => hits.push({ t: v, a: i === 4 ? 6 : 1.8 }));
      hits.push({ t: tFix, a: 4.5 });
      hits.push({ t: 0.74, a: 1.6 });
      const FLIGHT = 0.11;
      const LAND = (x, it, t, tOn, from) => {
        const dt = t - tOn;
        if (dt < -FLIGHT) return;
        let sc = 1, off = 0, shadow = 0;
        if (dt < 0) {
          const p = 1 + dt / FLIGHT;
          sc = lerp(from.s, 1, ease.in3(p));
          off = 1 - ease.in3(p);
          shadow = off;
        }
        x.save();
        x.translate(it.x + from.x * off, it.y + from.y * off);
        x.rotate(it.rot + from.r * off);
        x.scale(sc, sc);
        if (shadow > 0 && !it.noShadow) {
          x.fillStyle = 'rgba(0,0,0,.22)';
          x.fillRect(-it.sp.w * 0.46 + shadow * 16, -it.sp.h * 0.46 + shadow * 22, it.sp.w * 0.92, it.sp.h * 0.92);
        }
        x.drawImage(it.sp.L.canvas, -it.sp.w / 2, -it.sp.h / 2, it.sp.w, it.sp.h);
        x.restore();
      };
      const FROM = (i) => ({ s: 1.9, x: (hash(i, 2) - 0.3) * W * 0.5, y: H * 0.26 * (hash(i, 3) < 0.5 ? 1 : 0.6), r: (hash(i, 4) - 0.5) * 1.2 });

      return function seek(t0) {
        const t = on(t0, 24), n = kit.frame(t0, 24);
        let jx = 0, jy = 0, flutter = 0;
        for (const h of hits) {
          const dt = t - h.t;
          if (dt >= 0 && dt < 0.13) {
            const a = h.a * (1 - dt / 0.13) * (W / 390);
            jx += (n % 2 ? -0.5 : 0.5) * a;
            jy += (n % 2 ? 1 : -0.7) * a;
            flutter = Math.max(flutter, a);
          }
        }
        g.drawImage(page.canvas, 0, 0, W, H);
        g.save();
        g.translate(jx, jy);
        // Strips.
        strips.forEach((st, i) => {
          const w = t >= tS[i] ? (n % 2 ? 1 : -1) * flutter * 0.0035 * (i + 1) : 0;
          LAND(g, { ...st, rot: st.rot + w }, t, tS[i], FROM(i + 20));
        });
        // Teal tape pulled down the F, then the triangle slapped on top.
        const pull = map(t, 0.62, 0.74);
        if (pull > 0) {
          const len = tapeLen * ease.out2(pull);
          g.save();
          g.beginPath(); g.rect(hdX - 6, hdY - 14, tapeWd + 12, len + 18); g.clip();
          g.drawImage(tealStrip.canvas, hdX - 5, hdY - 10, tealStrip.w, tealStrip.h);
          g.restore();
        }
        const triX = ox + hd.tri[0][0] * s - 2, triY = oy + hd.tri[0][1] * s - 4;
        LAND(g, { sp: { L: { canvas: tealTri.canvas }, w: tealTri.w, h: tealTri.h }, x: triX + tealTri.w / 2, y: triY + tealTri.h / 2, rot: 0.03, noShadow: true }, t, 0.86, FROM(30));
        // Letters.
        letters.forEach((lt, i) => {
          if (i === 9) return;
          const w = t >= tL[i] ? (n % 2 ? 1 : -1) * flutter * 0.006 * (hash(i, 8) - 0.3) : 0;
          LAND(g, { ...lt, rot: lt.rot + w }, t, tL[i], FROM(i));
        });
        // The last one lands upside down, sits there, and then gets turned over and slapped.
        const lst = letters[9];
        let rot = lst.rot + Math.PI + 0.1, lift = 0, sc = 1;
        if (t >= tFix - 0.13) {
          const fr = map(t, tFix - 0.13, tFix);
          rot = lerp(lst.rot + Math.PI + 0.1, lst.rot, ease.io2(fr));
          sc = 1 + Math.sin(fr * Math.PI) * 0.42;
          lift = Math.sin(fr * Math.PI) * cH * 0.22;
        }
        if (t >= tL[9] - FLIGHT) {
          if (t < tL[9]) LAND(g, { ...lst, rot }, t, tL[9], FROM(9));
          else {
            g.save();
            g.translate(lst.x, lst.y - lift);
            g.rotate(rot);
            g.scale(sc, sc);
            if (lift > 1) {
              g.fillStyle = 'rgba(0,0,0,.22)';
              g.fillRect(-lst.sp.w * 0.46 + 5, -lst.sp.h * 0.46 + 8, lst.sp.w * 0.92, lst.sp.h * 0.92);
            }
            g.drawImage(lst.sp.L.canvas, -lst.sp.w / 2, -lst.sp.h / 2, lst.sp.w, lst.sp.h);
            g.restore();
          }
        }
        // Masking tape, each with a hard cut and one frame of bigger.
        tapes.forEach((tp) => {
          if (t < tp.t) return;
          const fresh = t - tp.t < 0.042 ? 1.22 : 1;
          g.save();
          g.translate(tp.x, tp.y);
          g.rotate(tp.rot);
          g.scale(fresh, fresh);
          g.drawImage(tp.sp.L.canvas, -tp.sp.w / 2, -tp.sp.h / 2, tp.sp.w, tp.sp.h);
          g.restore();
        });
        g.restore();
      };
    },
  });
})();
