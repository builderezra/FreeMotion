// Lane: Inside the editor. Three takes that are about the work itself: someone editing, the razor, the grade.
(function () {
  const LANE = 'Inside the editor';
  const smooth = (p) => p * p * (3 - 2 * p);
  const minJerk = (p) => p * p * p * (10 + p * (-15 + 6 * p));
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, Math.max(0.01, w), h, r); };
  const rgb = (c) => 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')';

  // A hand on a mouse: moves are min-jerk arcs between holds. moves = [t0, t1, x, y, arc].
  function track(start, moves) {
    let px = start[0], py = start[1];
    const ms = moves.map((m) => { const o = { a: m[0], b: m[1], fx: px, fy: py, x: m[2], y: m[3], arc: m[4] || 0 }; px = m[2]; py = m[3]; return o; });
    return function (t) {
      let x = start[0], y = start[1];
      for (const m of ms) {
        if (t >= m.b) { x = m.x; y = m.y; continue; }
        if (t > m.a) {
          const q = minJerk((t - m.a) / (m.b - m.a));
          const dx = m.x - m.fx, dy = m.y - m.fy, b = m.arc * 4 * q * (1 - q);
          x = m.fx + dx * q - dy * b;
          y = m.fy + dy * q + dx * b;
        }
        break;
      }
      return [x, y];
    };
  }
  function noise1(kit, x, seed) {
    const i = Math.floor(x), f = x - i;
    return kit.lerp(kit.hash(i, seed), kit.hash(i + 1, seed), smooth(f)) - 0.5;
  }

  // ---- Little pieces of footage, so the bin and the monitor hold real-looking pictures ----
  function sceneRidge(kit, g, W, H) {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.72);
    sky.addColorStop(0, '#7f9fb0'); sky.addColorStop(0.55, '#e7c7a4'); sky.addColorStop(1, '#f39a55');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff3d6'; g.beginPath(); g.arc(W * 0.3, H * 0.5, H * 0.075, 0, 7); g.fill();
    const cols = ['#c58f73', '#9a6f63', '#6a5358', '#3e3b44', '#1f2329'];
    cols.forEach((c, n) => {
      const base = H * (0.5 + n * 0.09), amp = H * (0.05 + n * 0.018);
      g.fillStyle = c; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W + 3; x += 3) {
        const u = x / W * (2 + n * 1.3) + n * 5.1;
        const y = base - amp * (Math.sin(u * 2.1) * 0.6 + Math.sin(u * 4.9 + 1.2) * 0.3 + noise1(kit, u * 8, 11 + n) * 0.7);
        g.lineTo(x, y);
      }
      g.lineTo(W, H); g.fill();
    });
  }
  function sceneBeach(kit, g, W, H) {
    const sea = g.createLinearGradient(0, 0, W, H);
    sea.addColorStop(0, '#0b5f70'); sea.addColorStop(0.6, '#2fa7a4'); sea.addColorStop(1, '#8fd6c0');
    g.fillStyle = sea; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e6cfa3'; g.beginPath(); g.moveTo(W * 0.62, 0);
    for (let y = 0; y <= H; y += 2) g.lineTo(W * (0.62 - y / H * 0.22) + noise1(kit, y * 0.15, 21) * W * 0.05, y);
    g.lineTo(W, H); g.lineTo(W, 0); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1, H * 0.018);
    for (let n = 0; n < 4; n++) {
      g.beginPath();
      for (let y = 0; y <= H; y += 2) { const x = W * (0.58 - n * 0.09 - y / H * 0.22) + noise1(kit, y * 0.12 + n * 9, 31) * W * 0.05; if (y === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
    }
  }
  function sceneRoad(kit, g, W, H) {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.5);
    sky.addColorStop(0, '#2c3a4a'); sky.addColorStop(1, '#d6824f');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#20242a'; g.fillRect(0, H * 0.5, W, H * 0.5);
    g.fillStyle = '#3a3f46'; g.beginPath(); g.moveTo(W * 0.48, H * 0.5); g.lineTo(W * 0.52, H * 0.5); g.lineTo(W * 0.95, H); g.lineTo(W * 0.05, H); g.fill();
    g.fillStyle = '#f0e4b8';
    for (let n = 0; n < 5; n++) { const a = 0.52 + n * n * 0.022, b = a + 0.01 + n * 0.012; g.beginPath(); g.moveTo(W * 0.497, H * a); g.lineTo(W * 0.503, H * a); g.lineTo(W * (0.5 + 0.004 * (n + 1)), H * b); g.lineTo(W * (0.5 - 0.004 * (n + 1)), H * b); g.fill(); }
    g.fillStyle = '#14171b';
    for (let n = 0; n < 6; n++) { const q = n / 6, x = W * (0.47 - q * 0.47), y = H * (0.5 + q * q * 0.2), hh = H * (0.06 + q * 0.28); g.fillRect(x, y - hh, Math.max(1, H * 0.012 * (1 + q * 2)), hh); }
  }

  // ---- Pointers ----
  function arrow(g, x, y, sc) {
    g.save(); g.translate(x, y); g.scale(sc, sc);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 16.5); g.lineTo(3.8, 13); g.lineTo(6.3, 18.6); g.lineTo(8.9, 17.5); g.lineTo(6.4, 12); g.lineTo(11.6, 12); g.closePath();
    g.lineJoin = 'round'; g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = '#0b0b0c'; g.fill();
    g.restore();
  }
  function fist(g, x, y, sc) {
    g.save(); g.translate(x, y); g.scale(sc, sc);
    const parts = [[-7, -3, 14, 11, 4.5], [-7.2, -6.5, 3.6, 8, 1.8], [-3.5, -7.6, 3.6, 8, 1.8], [0.1, -7.6, 3.6, 8, 1.8], [3.7, -6.5, 3.6, 8, 1.8]];
    g.strokeStyle = '#0b0b0c'; g.lineWidth = 2;
    parts.forEach((p) => { rr(g, p[0], p[1], p[2], p[3], p[4]); g.stroke(); });
    g.fillStyle = '#fff';
    parts.forEach((p) => { rr(g, p[0], p[1], p[2], p[3], p[4]); g.fill(); });
    g.lineWidth = 0.9; g.beginPath();
    [-3.6, 0, 3.6].forEach((a) => { g.moveTo(a, -4.5); g.lineTo(a, -0.5); });
    g.stroke();
    g.restore();
  }
  function trimCur(g, x, y, sc) {
    g.save(); g.translate(x, y); g.scale(sc, sc);
    const path = () => { g.beginPath(); g.moveTo(-1, -9); g.lineTo(2, -9); g.lineTo(2, 9); g.lineTo(-1, 9); g.moveTo(-3, 0); g.lineTo(-10, 0); g.moveTo(-7, -3); g.lineTo(-10, 0); g.lineTo(-7, 3); g.moveTo(5, 0); g.lineTo(11, 0); g.moveTo(8, -3); g.lineTo(11, 0); g.lineTo(8, 3); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    path(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke();
    path(); g.lineWidth = 1.8; g.strokeStyle = '#d7301f'; g.stroke();
    g.restore();
  }
  function ibeam(g, x, y, sc, ink) {
    g.save(); g.translate(x, y); g.scale(sc, sc);
    const path = () => { g.beginPath(); g.moveTo(-3.4, -10); g.lineTo(-1, -9); g.lineTo(1, -9); g.lineTo(3.4, -10); g.moveTo(0, -9); g.lineTo(0, 9); g.moveTo(-3.4, 10); g.lineTo(-1, 9); g.lineTo(1, 9); g.lineTo(3.4, 10); };
    path(); g.lineWidth = 3.4; g.strokeStyle = '#000'; g.lineCap = 'round'; g.stroke();
    path(); g.lineWidth = 1.3; g.strokeStyle = ink || '#fff'; g.stroke();
    g.restore();
  }

  // ======================================================================================================================
  // (a) SOMEONE IS EDITING
  // ======================================================================================================================
  FMI.add({
    id: 'editor-someone',
    lane: LANE,
    name: 'Someone editing',
    blurb: 'A cursor drags three clips onto a timeline, drops one in the wrong spot, fixes it, overdoes a trim, hits play, then deletes _final_v3_FINAL from the file name.',
    dur: 4.4,
    ground: '#25262a',
    make(stage, kit) {
      const { w, h, F, lerp, clamp, map, ease } = kit;
      const g = kit.canvas({ alpha: false });
      const C = { panel: '#25262a', well: '#141518', line: '#0d0e10', hi: '#37383e', txt: '#9ea1a9', hard: '#e4e5e8', lane1: '#2b2c31', lane2: '#28292e', yel: '#e8c34a', red: '#e8493a' };
      const UI = (px, wgt) => (wgt || 500) + ' ' + px + 'px ' + kit.SYS;
      const MONO = (px) => '700 ' + px + "px 'Courier Prime', monospace";

      // Layout. The status area stays empty, then menu, monitor, transport, bin, timeline.
      const topY = clamp(h * 0.066, 40, 60), menuH = 22, tabH = 22, hdr = 32;
      const monH = clamp(h * 0.185, 84, 170), transH = 26, binH = clamp(h * 0.105, 56, 92);
      const yMon = topY + menuH, yTrans = yMon + monH, yBin = yTrans + transH, yTab = yBin + binH, yRuler0 = yTab + tabH;
      const s = Math.min((w - hdr - 26) / 92 * 0.9, (h - yRuler0 - 10) / 107);
      const X0 = hdr + 6, CW = 22 * s, PITCH = 29 * s;
      const Xu = (u) => X0 + (u - 14) * s;
      const vTop = (i) => (20 - 3 + i * 29) * s;
      const LANE0 = (16.5 - 3) * s;

      // Where the timeline lands when the panel is maximised.
      g.font = UI(100, 600);
      const wordPx = Math.floor(Math.min(100 * (92 * s) / g.measureText('FreeMotion').width, 100 * (w - X0 - 8) / g.measureText('_final_v3_FINAL').width));
      const contentH = 107 * s + wordPx * 2.6;
      const yRulerF = Math.max(62, 60 + ((h - 170) - contentH) * 0.42);
      const wordX = X0, wordY = yRulerF + 107 * s + wordPx * 1.42;
      g.font = UI(wordPx, 600);
      const nameW = g.measureText('FreeMotion').width;

      // Footage.
      const thumbH = Math.round(CW), thumbW = Math.round(CW * 1.05);
      const shots = [sceneRidge, sceneBeach, sceneRoad].map((fn) => { const L = kit.layer(160, 90); fn(kit, L.g, 160, 90); return L; });
      const monImg = kit.layer(Math.ceil((monH - 8) * 16 / 9 * 1.5), Math.ceil(monH - 8)); sceneRidge(kit, monImg.g, monImg.w, monImg.h);

      // The clips, grey as the logo's own light-from-above, with a picture, a name and a waveform.
      const gradeAt = (v) => { const p = clamp((v - 20) / 80); const a = [245, 245, 247], b = [58, 58, 63]; return 'rgb(' + a.map((c, i) => Math.round(lerp(c, b[i], p))).join(',') + ')'; };
      const defs = [{ len: 92, shot: 0, name: 'A001_C007.mov', seed: 3 }, { len: 62, shot: 1, name: 'broll_ok.mov', seed: 5 }, { len: 58, shot: 2, name: 'IMG_4471.mov', seed: 8 }];
      const clips = defs.map((d, i) => {
        const L = kit.layer(d.len * s, CW), x = L.g, W = L.w, HH = L.h;
        const gr = x.createLinearGradient(0, 0, 0, HH);
        gr.addColorStop(0, gradeAt(20 + i * 29)); gr.addColorStop(1, gradeAt(42 + i * 29));
        x.fillStyle = gr; x.fillRect(0, 0, W, HH);
        x.drawImage(shots[d.shot].canvas, 0, 0, thumbW, HH);
        x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(thumbW, 0, 1, HH);
        const ink = i === 0 ? 'rgba(10,10,12,' : 'rgba(240,240,244,';
        x.font = UI(clamp(s * 3.2, 9, 12), 600); x.fillStyle = ink + '.8)'; x.textBaseline = 'top';
        x.fillText(d.name, thumbW + 6, 4);
        x.strokeStyle = ink + '.42)'; x.lineWidth = 1;
        x.beginPath();
        const mid = HH * 0.66, r = kit.rng(d.seed * 91);
        for (let px = thumbW + 4; px < W - 1; px += 2) {
          const env = 0.2 + 0.8 * Math.pow(Math.abs(Math.sin(px * 0.035 + d.seed)), 3), a = HH * 0.24 * env * (0.45 + 0.55 * r());
          x.moveTo(px + 0.5, mid - a); x.lineTo(px + 0.5, mid + a);
        }
        x.stroke();
        return L;
      });

      // The upper half of the screen: drawn once.
      const ui = kit.layer();
      (function () {
        const x = ui.g;
        x.fillStyle = C.panel; x.fillRect(0, 0, w, h);
        x.fillStyle = '#1b1c1f'; x.fillRect(0, 0, w, topY + menuH);
        x.font = UI(11.5); x.fillStyle = C.txt; x.textBaseline = 'middle';
        let mx = 8;
        ['File', 'Edit', 'Clip', 'Sequence', 'Window'].forEach((m) => { x.fillText(m, mx, topY + menuH / 2); mx += x.measureText(m).width + 11; });
        x.fillStyle = C.line; x.fillRect(0, topY + menuH - 1, w, 1);
        // Monitor.
        x.fillStyle = C.well; x.fillRect(0, yMon, w, monH);
        // Transport.
        x.fillStyle = '#1f2023'; x.fillRect(0, yTrans, w, transH);
        x.fillStyle = C.line; x.fillRect(0, yTrans, w, 1);
        // Bin.
        x.fillStyle = C.panel; x.fillRect(0, yBin, w, binH);
        x.fillStyle = C.line; x.fillRect(0, yBin, w, 1);
      })();
      const cellW = (w - 8 * 4) / 3, thumbBinH = binH - 22;
      const binCells = [0, 1, 2].map((i) => ({ x: 8 + i * (cellW + 8), y: yBin + 5, w: cellW, h: thumbBinH }));
      (function () {
        const x = ui.g;
        binCells.forEach((c, i) => {
          x.fillStyle = C.well; x.fillRect(c.x, c.y, c.w, c.h);
          const iw = Math.min(c.w, c.h * 16 / 9), ix = c.x + (c.w - iw) / 2;
          x.drawImage(shots[i].canvas, ix, c.y, iw, c.h);
          x.font = UI(clamp(cellW * 0.092, 8.5, 10.5)); x.fillStyle = C.txt; x.textBaseline = 'top';
          x.fillText(defs[i].name, c.x + 1, c.y + c.h + 3, c.w - 2);
        });
      })();
      const playBtn = { x: w / 2, y: yTrans + transH / 2 };
      function transport(x, playing, down) {
        x.fillStyle = C.txt;
        const cy = playBtn.y, cx = playBtn.x, u = 5;
        // Step back and forward, either side of play.
        [-1, 1].forEach((dir) => {
          for (let n = 0; n < 2; n++) {
            const bx = cx + dir * (30 + n * 26);
            x.beginPath(); x.moveTo(bx + dir * u, cy); x.lineTo(bx - dir * u * 0.6, cy - u); x.lineTo(bx - dir * u * 0.6, cy + u); x.fill();
            if (n === 1) x.fillRect(bx + dir * (u + 1) - 0.75, cy - u, 1.5, u * 2);
          }
        });
        x.fillStyle = down ? '#54565c' : C.hi; rr(x, cx - 15, cy - 10, 30, 20, 3); x.fill();
        x.fillStyle = C.hard;
        if (playing) { x.fillRect(cx - 4.5, cy - 5.5, 3, 11); x.fillRect(cx + 1.5, cy - 5.5, 3, 11); }
        else { x.beginPath(); x.moveTo(cx - 4, cy - 6); x.lineTo(cx + 6, cy); x.lineTo(cx - 4, cy + 6); x.fill(); }
      }

      // The timeline panel: its own layer, so it can be maximised as one thing.
      const tlH = tabH + 107 * s + Math.max(h, 400);
      const tl = kit.layer(w, tlH);
      (function () {
        const x = tl.g, ry = tabH;
        x.fillStyle = C.panel; x.fillRect(0, 0, w, tlH);
        // Tabs.
        x.fillStyle = '#1b1c1f'; x.fillRect(0, 0, w, tabH);
        x.fillStyle = C.panel; x.fillRect(4, 3, 112, tabH - 3);
        x.font = UI(11, 600); x.fillStyle = C.hard; x.textBaseline = 'middle'; x.fillText('Sequence 01', 12, tabH / 2 + 1);
        x.fillStyle = C.txt; x.font = UI(13); x.fillText('×', 100, tabH / 2 + 1);
        // Ruler.
        const rh = 13.5 * s;
        x.fillStyle = '#1f2023'; x.fillRect(0, ry, w, rh);
        x.fillStyle = C.line; x.fillRect(0, ry + rh - 1, w, 1);
        for (let u = 14, n = 0; Xu(u) < w; u += 3.0, n++) {
          const big = n % 10 === 0, mid = n % 5 === 0;
          x.fillStyle = big ? '#a5a8af' : '#5d5f66';
          x.fillRect(Xu(u), ry + rh - (big ? rh * 0.55 : mid ? rh * 0.3 : rh * 0.18), 1, big ? rh * 0.55 : mid ? rh * 0.3 : rh * 0.18);
          if (big) { x.font = MONO(clamp(s * 2.8, 9, 11)); x.fillStyle = '#a5a8af'; x.textBaseline = 'top'; x.fillText('00:0' + n / 10 * 2 + ':00', Xu(u) + 3, ry + rh * 0.12); }
        }
        // Lanes and their headers.
        for (let i = 0; i < 3; i++) {
          const y = ry + LANE0 + i * PITCH;
          x.fillStyle = i % 2 ? C.lane2 : C.lane1; x.fillRect(0, y, w, PITCH);
          x.fillStyle = C.line; x.fillRect(0, y + PITCH - 1, w, 1);
          if (i < 3) {
            x.fillStyle = '#1f2023'; x.fillRect(0, y, hdr, PITCH - 1);
            x.fillStyle = C.txt; x.font = UI(10.5, 600); x.textBaseline = 'middle'; x.textAlign = 'center';
            x.fillText('V' + (3 - i), hdr / 2, y + PITCH / 2 - 7);
            x.strokeStyle = C.txt; x.lineWidth = 1; x.beginPath(); x.ellipse(hdr / 2, y + PITCH / 2 + 8, 5, 3, 0, 0, 7); x.stroke();
            x.fillStyle = C.txt; x.beginPath(); x.arc(hdr / 2, y + PITCH / 2 + 8, 1.5, 0, 7); x.fill();
            x.textAlign = 'left';
          }
        }
        x.fillStyle = C.line; x.fillRect(hdr, ry, 1, rh + PITCH * 3);
      })();

      // The action sheet. Everything is timed by hand; a person does not move evenly.
      const T = { aDrop: 0.26, bGrab: 0.49, bMiss: 0.76, bRegrab: 1.02, bFix: 1.24, cGrab: 1.42, cDrop: 1.64, trimA: 1.8, trimOver: 2.06, trimB: 2.16, trimEnd: 2.32, playDown: 2.5, playStop: 2.94, nudge1: 2.99, nudge2: 3.05, max1: 3.16, max2: 3.24, maxDone: 3.34, selA: 3.62, selB: 3.78, del: 3.88, caretOff: 4.12 };
      const clipTopAt = (i, ry) => ry + vTop(i);
      const gA = 56, gB = 46, gC = 40;
      const pos = {
        A: [X0 + gA, clipTopAt(0, yRuler0) + CW * 0.5],
        miss: [X0 + 27 * s + gB, clipTopAt(2, yRuler0) + CW * 0.45],
        fix: [X0 + gB, clipTopAt(1, yRuler0) + CW * 0.5],
        C: [X0 + gC, clipTopAt(2, yRuler0) + CW * 0.5],
        trim: [X0 + 58 * s, clipTopAt(2, yRuler0) + CW * 0.55],
        over: [X0 + 12 * s, clipTopAt(2, yRuler0) + CW * 0.6],
        tr: [X0 + 26 * s, clipTopAt(2, yRuler0) + CW * 0.5],
      };
      const binAt = (i) => [binCells[i].x + binCells[i].w * 0.55, binCells[i].y + binCells[i].h * 0.55];
      const tabPos = [62, yTab + tabH * 0.55];
      const tabF = [62, yRulerF - tabH * 0.5];
      const wordEnd = [wordX + nameW + 1, wordY - wordPx * 0.3];
      g.font = UI(wordPx, 600);
      const junkW = g.measureText('_final_v3_FINAL').width;
      const park = [Math.min(w - 26, wordX + nameW + 16), wordY - wordPx * 0.42];
      const moves = [
        [0.0, 0.21, pos.A[0] - 11, pos.A[1] + 7, 0.07],
        [0.21, 0.26, pos.A[0], pos.A[1], 0],
        [0.31, 0.47, binAt(1)[0] + 7, binAt(1)[1] - 2, -0.14],
        [0.47, 0.49, binAt(1)[0], binAt(1)[1], 0],
        [0.51, 0.75, pos.miss[0], pos.miss[1], 0.08],
        // He looks at it. Wrong track, wrong place. A little shake of the mouse.
        [0.82, 0.86, pos.miss[0] - 7, pos.miss[1] + 1, 0],
        [0.86, 0.9, pos.miss[0] + 6, pos.miss[1] - 1, 0],
        [0.9, 0.94, pos.miss[0] - 3, pos.miss[1], 0],
        [0.94, 0.98, pos.miss[0], pos.miss[1], 0],
        [1.03, 1.21, pos.fix[0] - 9, pos.fix[1] - 3, -0.06],
        [1.21, 1.24, pos.fix[0], pos.fix[1], 0],
        [1.27, 1.41, binAt(2)[0], binAt(2)[1], 0.12],
        [1.44, 1.64, pos.C[0], pos.C[1], -0.05],
        [1.67, 1.79, pos.trim[0], pos.trim[1], 0.1],
        [1.82, 2.06, pos.over[0], pos.over[1], 0],
        [2.16, 2.29, pos.tr[0] + 3, pos.tr[1], 0],
        [2.29, 2.32, pos.tr[0], pos.tr[1], 0],
        [2.35, 2.49, playBtn.x + 2, playBtn.y + 3, 0.1],
        [2.66, 2.96, playBtn.x - 40, playBtn.y + 38, -0.1],
        [2.99, 3.15, tabPos[0], tabPos[1], 0.08],
        [3.4, 3.6, wordX + junkW + 3, wordY + wordPx * 0.86, 0.1],
        [3.63, 3.78, wordX - 2, wordY + wordPx * 0.8, 0.02],
        [3.92, 4.2, park[0], park[1], -0.12],
      ];
      const hand = track([w * 0.74, yBin + binH * 0.86], moves);

      const headU = (t) => {
        if (t < T.playDown + 0.02) return 14;
        if (t < T.playStop) return lerp(14, 83.5, (t - T.playDown - 0.02) / (T.playStop - T.playDown - 0.02));
        if (t < T.nudge1) return 83.5;
        if (t < T.nudge2) return 82;
        return 80.5;
      };
      function thinHead(u, ry) {
        const x = Xu(u + 1.5), tr = Math.min(1, 0.62);
        g.fillStyle = F.teal;
        g.fillRect(x - 1.25, ry + LANE0 * 0.8, 2.5, LANE0 * 0.2 + PITCH * 3);
        const oy = ry + LANE0 * 0.8;
        g.beginPath();
        g.moveTo(x - 1.25, oy - 11 * s * tr * 0.92); g.lineTo(x - 1.25 + 12 * s * tr * 0.92, oy - 5.5 * s * tr * 0.92); g.lineTo(x - 1.25, oy); g.fill();
      }
      function head(u, ry) {
        const hd = F.head, dx = (u - 80.5) * s;
        g.save();
        g.translate(X0 + (hd.x - 14) * s + dx, ry);
        g.fillStyle = F.teal;
        rr(g, 0, (hd.y - 3) * s, hd.w * s, hd.h * s, hd.r * s); g.fill();
        g.beginPath();
        g.moveTo((hd.tri[0][0] - hd.x) * s, (hd.tri[0][1] - 3) * s);
        g.lineTo((hd.tri[1][0] - hd.x) * s, (hd.tri[1][1] - 3) * s);
        g.lineTo((hd.tri[2][0] - hd.x) * s, (hd.tri[2][1] - 3) * s);
        g.fill();
        g.restore();
      }
      function drawClip(i, x, y, wide, sel) {
        const r = 5 * s;
        g.save();
        rr(g, x, y, wide, CW, r); g.clip();
        g.drawImage(clips[i].canvas, x, y, clips[i].w, CW);
        g.restore();
        if (sel) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; rr(g, x, y, wide, CW, r); g.stroke(); }
      }
      function snapMark(x, ry) {
        g.fillStyle = C.yel;
        g.fillRect(x - 0.75, ry, 1.5, LANE0 + PITCH * 3);
        g.beginPath(); g.moveTo(x - 5, ry); g.lineTo(x + 5, ry); g.lineTo(x, ry + 6); g.fill();
      }

      return function seek(t0) {
        const t = Math.min(kit.on(t0, 30), 4.4);
        const rise = ease.out4(map(t, T.max2, T.maxDone));
        const ry = lerp(yRuler0, yRulerF, rise);
        const panelTop = ry - tabH;
        const atEnd = t >= T.max2 + 0.066;
        const [hx, hy] = hand(t);
        const tre = 0.8;
        const cx = hx + noise1(kit, t * 11, 41) * tre, cy = hy + noise1(kit, t * 13, 43) * tre;

        // Above the timeline.
        if (rise < 1) {
          g.drawImage(ui.canvas, 0, 0, w, h);
          // Monitor: black until there is something under the playhead, then the shot; it pans while playing.
          const mh = monH - 8, mw = Math.min(w - 12, mh * 16 / 9), mx = (w - mw) / 2, my = yMon + 4;
          g.fillStyle = '#000'; g.fillRect(mx, my, mw, mh);
          if (t >= T.aDrop) {
            const play = clamp((t - T.playDown) / (T.playStop - T.playDown));
            const srcW = monImg.canvas.height * mw / mh;
            const sx = play * (monImg.canvas.width - srcW);
            g.drawImage(monImg.canvas, sx, 0, srcW, monImg.canvas.height, mx, my, mw, mh);
          } else {
            g.fillStyle = '#3a3b40'; g.font = UI(11); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('No clip', w / 2, my + mh / 2); g.textAlign = 'left';
          }
          // Timecode runs with the playhead, and the recording light is on.
          const fr = Math.round((headU(t) - 14) * 2.6);
          g.font = MONO(w < 350 ? 11 : 13); g.fillStyle = C.yel; g.textBaseline = 'middle';
          g.fillText('00:00:' + String(Math.floor(fr / 24)).padStart(2, '0') + ':' + String(fr % 24).padStart(2, '0'), 8, yTrans + transH / 2 + 1);
          const playing = t >= T.playDown && t < T.playStop;
          transport(g, playing, t >= T.playDown - 0.02 && t < T.playDown + 0.06);
          g.fillStyle = C.red; g.beginPath(); g.arc(w - 44, topY + menuH / 2, 3.5, 0, 7); g.fill();
          g.font = MONO(11); g.fillStyle = C.txt; g.fillText('0:' + String(Math.floor(t + 41)).padStart(2, '0'), w - 36, topY + menuH / 2 + 1);
        } else {
          g.fillStyle = C.panel; g.fillRect(0, 0, w, h);
        }

        // Timeline panel.
        g.drawImage(tl.canvas, 0, panelTop, w, tl.h);

        // A lane lights while a clip hangs over it.
        const dragging = t < T.aDrop ? 0 : (t >= T.bGrab && t < T.bMiss) || (t >= T.bRegrab && t < T.bFix) ? 1 : t >= T.cGrab && t < T.cDrop ? 2 : -1;
        let hoverLane = -1;
        if (dragging >= 0 && cy > yRuler0) { hoverLane = clamp(Math.floor((cy - yRuler0 - LANE0) / PITCH), 0, 2); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(hdr, ry + LANE0 + hoverLane * PITCH, w - hdr, PITCH - 1); }

        const simple = t >= T.max2 + 0.03;
        if (!simple) {
          // Landed clips.
          if (t >= T.aDrop) {
            const j = t < T.aDrop + 0.034 ? 2 : t < T.aDrop + 0.067 ? -1 : 0;
            drawClip(0, X0, clipTopAt(0, ry) + j, 92 * s, t < T.bGrab);
          }
          if (t >= T.bMiss && t < T.bRegrab) {
            const j = t < T.bMiss + 0.034 ? 2 : t < T.bMiss + 0.067 ? -1 : 0;
            drawClip(1, X0 + 27 * s, clipTopAt(2, ry) + j, 62 * s, true);
          }
          if (t >= T.bFix) {
            const j = t < T.bFix + 0.034 ? 2 : t < T.bFix + 0.067 ? -1 : 0;
            drawClip(1, X0, clipTopAt(1, ry) + j, 62 * s, t < T.cGrab);
          }
          if (t >= T.cDrop) {
            let wide = 58;
            if (t >= T.trimA) wide = clamp((Math.min(hx, pos.tr[0] + (t < T.trimEnd ? 1e4 : 0)) - X0) / s, 8, 58);
            if (t >= T.trimEnd) wide = 26;
            const j = t < T.cDrop + 0.034 ? 2 : t < T.cDrop + 0.067 ? -1 : 0;
            drawClip(2, X0, clipTopAt(2, ry) + j, wide * s, t < T.playDown - 0.1);
            // What the trim took off stays as a dim shadow while it is being dragged.
            if (t >= T.trimA && t < T.trimEnd) { g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1; g.setLineDash([3, 3]); rr(g, X0, clipTopAt(2, ry), 58 * s, CW, 5 * s); g.stroke(); g.setLineDash([]); }
          }
          // A clip on the end of the hand: a small ghost over the bin, its true length once it is over the timeline.
          if (dragging >= 0) {
            const gx = dragging === 0 ? gA : dragging === 1 ? gB : gC;
            if (cy > yRuler0 + LANE0 * 0.5) {
              g.globalAlpha = 0.86;
              drawClip(dragging, cx - gx, cy - CW * 0.5, clips[dragging].w, false);
              g.globalAlpha = 1;
            } else {
              g.globalAlpha = 0.8;
              g.drawImage(shots[defs[dragging].shot].canvas, cx - 30, cy - 17, 60, 34);
              g.globalAlpha = 1;
            }
          }
          // Yellow snap line: the clip finds the edge.
          if ((t >= T.aDrop && t < T.aDrop + 0.1) || (t >= T.bFix - 0.03 && t < T.bFix + 0.1) || (t >= T.cDrop && t < T.cDrop + 0.1)) snapMark(X0, ry);
          if (t >= T.trimEnd - 0.03 && t < T.trimEnd + 0.1) snapMark(X0 + 26 * s, ry);
          thinHead(headU(t), ry);
        } else {
          kit.drawF(g, X0 + 46 * s, ry + (3 + 107 / 2 - 3) * s, s, { knock: C.lane1 });
        }

        // The trim's little readout, right next to the hand.
        if (t >= T.trimA && t < T.trimEnd + 0.04) {
          const fr = Math.round(Math.abs(58 - (hx - X0) / s) * 2.6);
          const lab = '−' + '00:00:' + String(Math.floor(fr / 24)).padStart(2, '0') + ':' + String(fr % 24).padStart(2, '0');
          g.font = MONO(11);
          const bw = g.measureText(lab).width + 10, bx = clamp(hx + 12, 2, w - bw - 2), by = hy + 16;
          g.fillStyle = '#000'; g.fillRect(bx, by, bw, 18);
          g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(lab, bx + 5, by + 10);
        }

        // Maximised: the file name. It is what the sequence is really called.
        if (t >= T.maxDone) {
          const fy = wordY, lh = wordPx * 1.16;
          const del = t >= T.del;
          g.font = UI(11, 500); g.fillStyle = C.txt; g.textBaseline = 'alphabetic';
          g.fillText('Save as', wordX, fy - wordPx * 0.92);
          if (!del && t >= T.selA) {
            const sel = clamp((wordX + junkW + 3 - cx) / junkW);
            g.fillStyle = '#3b6fd6';
            g.fillRect(wordX + junkW - junkW * sel, fy + lh - wordPx * 0.84, junkW * sel + 1, wordPx * 1.06);
          }
          kit.wordmark(g, wordX, fy, wordPx, F.top);
          if (!del) { g.font = UI(wordPx, 600); g.fillStyle = '#c9cace'; g.textBaseline = 'alphabetic'; g.fillText('_final_v3_FINAL', wordX, fy + lh); }
          if (del && t < T.caretOff) { g.fillStyle = F.top; g.fillRect(wordEnd[0] + 1, fy - wordPx * 0.8, 2, wordPx); }
        }

        // The hand.
        const scC = clamp(w / 390, 0.95, 1.15) * 1.16;
        const grabbing = dragging >= 0;
        if (grabbing) fist(g, cx, cy, scC * 1.05);
        else if (t >= T.trimA - 0.03 && t < T.trimEnd + 0.03) trimCur(g, cx, cy, scC);
        else if (t >= T.selA - 0.08 && t < T.del + 0.03) ibeam(g, cx, cy, scC, '#fff');
        else arrow(g, cx, cy, scC * 1.08);
      };
    },
  });

  // ======================================================================================================================
  // (b) THE RAZOR
  // ======================================================================================================================
  FMI.add({
    id: 'editor-razor',
    lane: LANE,
    name: 'The razor',
    blurb: 'A razor chops one long clip, tick tick, and each time the rest of it drops a track and slams back to the left, like a typewriter, until the clips are the F.',
    dur: 2.25,
    ground: '#f2b31d',
    make(stage, kit) {
      const { w, h, F, lerp, clamp, map, ease } = kit;
      const g = kit.canvas({ alpha: false });
      const GROUND = '#f2b31d', LANEA = '#eeac14', INK = '#121212', RULE = '#b9840a';
      const s = Math.min(0.84 * w / 92, (h - 60 - 110 - 26) / 129);
      const X0 = (w - 92 * s) / 2, top = 60 + ((h - 170) - 129 * s) * 0.5;
      const Yv = (v) => top + (v - 3) * s;
      const CW = 22 * s, PITCH = 29 * s, R = 5 * s;
      const laneY = (i) => Yv(20) + i * PITCH;

      // The one long clip, laid out start to end: head stub, LONG, MED, waste, SHORT, waste, title.
      const stub = X0 + 40, W2 = Math.round(w * 0.19), W3 = Math.round(w * 0.17), TL = Math.round(w * 1.05);
      const seg = { long: stub, med: stub + 92 * s, w2: stub + 154 * s, short: stub + 154 * s + W2, w3: stub + 180 * s + W2, title: stub + 180 * s + W2 + W3 };
      const total = seg.title + TL;
      const strip = kit.layer(total, CW + 2);
      (function () {
        const x = strip.g, end = seg.title;
        x.fillStyle = INK; x.fillRect(0, 0, end, CW);
        // A real waveform: transients on a beat, with a tail on each.
        const r = kit.rng(77), mid = CW * 0.6, top2 = CW * 0.18;
        x.fillStyle = GROUND;
        const beat = Math.max(46, 15 * s);
        for (let px = 3; px < end - 2; px += 3.5) {
          const q = (px % beat) / beat, tail = Math.pow(1 - q, 2.6);
          const bar = (Math.floor(px / beat) % 4 === 0) ? 1 : 0.68;
          const a = (CW * 0.385) * (0.08 + 0.92 * tail * bar) * (0.5 + 0.5 * r());
          x.fillRect(px, mid - a, 2.1, a * 2);
        }
        // Clip name band.
        x.fillStyle = 'rgba(242,179,29,.16)'; x.fillRect(0, 0, end, top2);
        x.font = '600 ' + clamp(CW * 0.14, 8.5, 11) + 'px ' + kit.SYS; x.fillStyle = GROUND; x.textBaseline = 'middle';
        [[seg.long + 8, 'A001_C007.mov'], [seg.med + 8, 'A001_C007.mov'], [seg.short + 8, 'A001']].forEach((a) => x.fillText(a[1], a[0], top2 * 0.55));
        // The tail end of the strip is a title clip: hollow, outlined, the name inside it.
        x.strokeStyle = INK; x.lineWidth = 1.5; x.setLineDash([]);
        x.strokeRect(seg.title + 1, 0.75, TL + 8, CW - 1.5);
      })();
      // The word sized to the width of the top clip.
      let wordPx = 100;
      g.font = '700 100px ' + kit.SYS;
      wordPx = 100 * (92 * s * 0.985) / g.measureText('FreeMotion').width;

      // The blade: a single-edge razor, steel with a folded spine, drawn once, tip at the origin of its layer.
      const BL = kit.layer(150, 150);
      const blScale = clamp(CW / 62, 0.8, 1.35);
      (function () {
        const x = BL.g;
        x.translate(26, 132);
        x.scale(blScale, blScale);
        x.rotate(-Math.PI * 0.34);
        const W = 98, H = 46, sp = 11, bev = 11;
        const steel = x.createLinearGradient(0, -H, W, 0);
        steel.addColorStop(0, '#d9dee2'); steel.addColorStop(0.35, '#f7f9fa'); steel.addColorStop(0.55, '#b8bfc5'); steel.addColorStop(0.8, '#eef1f3'); steel.addColorStop(1, '#a6adb3');
        x.fillStyle = steel; x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0); x.lineTo(W - 5, -H); x.lineTo(5, -H); x.closePath(); x.fill();
        // The ground edge.
        x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0); x.lineTo(W - 1.2, -bev); x.lineTo(1.2, -bev); x.closePath(); x.fill();
        x.strokeStyle = '#7e868c'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(1.2, -bev); x.lineTo(W - 1.2, -bev); x.stroke();
        // Folded spine.
        const sg = x.createLinearGradient(0, -H, 0, -H + sp);
        sg.addColorStop(0, '#50565c'); sg.addColorStop(0.5, '#23272a'); sg.addColorStop(1, '#3c4146');
        x.fillStyle = sg; x.beginPath(); x.moveTo(3, -H + sp); x.lineTo(W - 3, -H + sp); x.lineTo(W - 5, -H - 1); x.lineTo(5, -H - 1); x.closePath(); x.fill();
        // Three slots through the steel.
        x.fillStyle = GROUND;
        [[W * 0.2], [W * 0.5], [W * 0.8]].forEach((a) => { rr(x, a[0] - 7, -H + sp + 6, 14, 5.5, 2.7); x.fill(); });
        x.strokeStyle = 'rgba(60,66,72,.65)'; x.lineWidth = 0.8;
        [[W * 0.2], [W * 0.5], [W * 0.8]].forEach((a) => { rr(x, a[0] - 7, -H + sp + 6, 14, 5.5, 2.7); x.stroke(); });
        // Outline, so it sits on the yellow.
        x.strokeStyle = 'rgba(18,18,18,.75)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0); x.lineTo(W - 5, -H - 1); x.lineTo(5, -H - 1); x.closePath(); x.stroke();
      })();

      // The room: lanes and a ruler, tones of the ground.
      const room = kit.layer();
      (function () {
        const x = room.g;
        x.fillStyle = GROUND; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 6; i++) {
          const y = laneY(i) - 3.5 * s;
          if (i % 2 === 0) { x.fillStyle = LANEA; x.fillRect(0, y, w, PITCH); }
          x.fillStyle = RULE; x.fillRect(0, y, w, 1);
        }
        const ry = Yv(3), rh = Yv(16.5) - ry;
        for (let u = 14 - 40 * 3, n = 0; (X0 + (u - 14) * s) < w; u += 3, n++) {
          const big = n % 10 === 0, mid = n % 5 === 0, tick = big ? rh * 0.5 : mid ? rh * 0.28 : rh * 0.16;
          const px = X0 + (u - 14) * s;
          if (px < -2) continue;
          x.fillStyle = INK; x.fillRect(px, ry + rh - tick, big ? 1.5 : 1, tick);
          if (big) { x.font = "700 " + clamp(s * 3, 9.5, 12) + "px 'Courier Prime', monospace"; x.textBaseline = 'top'; x.fillText('00:0' + ((n / 10 + 2) % 10) + ':00', px + 4, ry + rh * 0.1); }
        }
      })();

      // The score. Each line is the same phrase: tick, tick, drop, slam. It gets faster.
      const E = [
        { c: [0.14, 0.34], drop: 0.38, land: 0.46, slam: 0.47, hit: 0.56, dx: 92 * s },
        { c: [0.8, 0.96], drop: 1.0, land: 1.07, slam: 1.075, hit: 1.15, dx: 62 * s + W2 },
        { c: [1.32, 1.44], drop: 1.47, land: 1.525, slam: 1.53, hit: 1.6, dx: 26 * s + W3 },
      ];
      const STAB = 1.86;
      // Screen position of the strip's own x, before anything moved.
      const XS = (sx) => X0 + (sx - stub);
      function evAmount(e, t) { return [ease.in2(map(t, e.drop, e.land)), ease.in4(map(t, e.slam, e.hit))]; }
      function placeOf(events, t) {
        let dx = 0, dy = 0, smear = 0;
        for (let i = 0; i < events; i++) {
          const a = evAmount(E[i], t);
          dy += a[0] * PITCH; dx += a[1] * E[i].dx;
          if (t > E[i].slam && t < E[i].hit) smear = E[i].dx * (ease.in4(map(t, E[i].slam, E[i].hit)) - ease.in4(map(t - 0.033, E[i].slam, E[i].hit)));
          // A little rebound off the wall.
          const db = t - E[i].hit;
          if (db > 0 && db < 0.09) dx += -Math.sin(db / 0.09 * Math.PI) * (6 + E[i].dx * 0.012);
          const dl = t - E[i].land;
          if (dl > 0 && dl < 0.06) dy += -Math.sin(dl / 0.06 * Math.PI) * 3;
        }
        return [dx, dy, smear];
      }
      // Each visible piece: strip range, how many drop-and-slams it rides, when it was cut, when it conforms to a rounded clip.
      const pieces = [
        { a: seg.long, b: seg.med, ride: 0, roundAt: 0.56 },
        { a: seg.med, b: seg.w2, ride: 1, roundAt: 1.15 },
        { a: seg.w2, b: seg.short, ride: 1, waste: 0.97 },
        { a: seg.short, b: seg.w3, ride: 2, roundAt: 1.6 },
        { a: seg.w3, b: seg.title, ride: 2, waste: 1.45 },
        { a: seg.title, b: total, ride: 3 },
      ];
      const cuts = [
        { t: 0.14, x: X0, sx: seg.long },
        { t: 0.34, x: X0 + 92 * s, sx: seg.med },
        { t: 0.8, x: X0 + 62 * s, sx: seg.w2, lane: 1 },
        { t: 0.96, x: X0 + 62 * s + W2, sx: seg.short, lane: 1 },
        { t: 1.32, x: X0 + 26 * s, sx: seg.w3, lane: 2 },
        { t: 1.44, x: X0 + 26 * s + W3, sx: seg.title, lane: 2 },
      ];
      const jolts = [];
      cuts.forEach((c) => jolts.push({ t: c.t, x: 0, y: 2.5 }));
      E.forEach((e) => { jolts.push({ t: e.land, x: 0, y: 3 }); jolts.push({ t: e.hit, x: -5 - e.dx * 0.012, y: 0 }); });
      jolts.push({ t: STAB, x: 0, y: 6 });

      function drawPiece(a, b, x, y, r, whole) {
        const wide = b - a;
        if (!whole && (x > w + 2 || x + wide < -2)) return;
        const px = strip.canvas.width / strip.w;
        if (r > 0) { g.save(); rr(g, x, y, wide, CW, r); g.clip(); }
        const sxp = whole ? 0 : Math.max(0, x < 0 ? -x : 0), sw = whole ? wide : Math.min(wide - sxp, w + 2 - Math.max(x, 0));
        if (sw > 0) g.drawImage(strip.canvas, (a + sxp) * px, 0, sw * px, CW * px, x + sxp, y, sw, CW);
        if (r > 0) g.restore();
      }
      function blade(x, y, tilt) {
        g.save();
        g.translate(x, y);
        g.rotate(tilt);
        g.drawImage(BL.canvas, -26, -132, BL.w, BL.h);
        g.restore();
      }

      return function seek(t0) {
        const t = kit.on(t0, 60);
        // Camera jolts: three hard frames and it is over.
        let jx = 0, jy = 0;
        for (const j of jolts) {
          const d = t - j.t;
          if (d >= 0 && d < 0.1) { const m = [1, -0.55, 0.25][Math.floor(d * 30)] || 0; jx += j.x * m; jy += j.y * m; }
        }
        g.drawImage(room.canvas, 0, 0, w, h);
        g.save();
        g.translate(jx, jy);

        // Which clip is the tool over right now, and where. Tool hops between marks.
        const nextCut = cuts.find((c) => t < c.t + 0.1);
        // Aim line: the razor's guide, down through the lanes.
        const rx = (function () {
          let x = cuts[0].x + 26;
          let last = x;
          for (let i = 0; i < cuts.length; i++) {
            const c = cuts[i], start = i === 0 ? -0.1 : (i === 2 ? E[0].hit + 0.03 : i === 4 ? E[1].hit + 0.03 : cuts[i - 1].t + 0.05), end = c.t - 0.045;
            if (t < start) return last;
            if (t < end) return lerp(last, c.x, minJerk(map(t, start, end)));
            last = c.x;
          }
          return last;
        })();
        const laneNow = t < 0.56 ? 0 : t < 1.15 ? 1 : t < 1.6 ? 2 : 2;
        const hover = laneY(laneNow) - 16;
        const contact = laneY(laneNow) + CW + 3;
        let ry = hover;
        for (const c of cuts) {
          const d = t - c.t;
          if (d > -0.11 && d <= -0.045) ry = hover - 10 * ease.out2(map(d, -0.11, -0.045));
          else if (d > -0.045 && d <= 0) ry = lerp(hover - 10, contact, ease.in3(map(d, -0.045, 0)));
          else if (d > 0 && d <= 0.03) ry = contact;
          else if (d > 0.03 && d <= 0.11) ry = lerp(contact, hover, ease.out3(map(d, 0.03, 0.11)));
        }
        const toolOn = t < 1.72;
        if (toolOn && (nextCut || t < 1.6)) {
          g.fillStyle = 'rgba(18,18,18,.5)';
          g.fillRect(rx - 0.5, Yv(3), 1, laneY(3) - Yv(3));
        }

        // The head stub, cut off and dropping away.
        if (t < 0.5) {
          const d = t - 0.16;
          if (d <= 0) drawPiece(0, seg.long, XS(0), laneY(0), 0);
          else {
            g.save();
            const dy = 0.5 * 3200 * d * d;
            g.translate(X0 - 2, laneY(0) + dy);
            g.rotate(-d * 3.4);
            drawPiece(0, seg.long, -stub, 0, 0, true);
            g.restore();
          }
        }

        // The pieces, each riding however many drops and slams it has had.
        for (const p of pieces) {
          if (p.waste !== undefined && t >= p.waste + 0.4) continue;
          const pl = placeOf(p.ride, t);
          let x = XS(p.a) - pl[0], y = laneY(0) + pl[1];
          // The hairline: the far side of each cut jumps over a touch and stays there till the slam.
          let part = 0;
          for (let n = 1; n < cuts.length; n++) if (t >= cuts[n].t && cuts[n].sx <= p.a) part += 2;
          for (let i = 0; i < p.ride; i++) if (t >= E[i].hit) part -= (i === 0 ? 2 : 4);
          part = Math.max(0, part);
          x += part;
          if (p.waste !== undefined && t >= p.waste) {
            const d = t - p.waste;
            g.save();
            g.translate(x + (p.b - p.a) * 0.5, y + CW * 0.5 + 0.5 * 3400 * d * d);
            g.rotate(d * (p.a === seg.w2 ? 2.6 : -3.2));
            drawPiece(p.a, p.b, -(p.b - p.a) * 0.5, -CW * 0.5, 0, true);
            g.restore();
            continue;
          }
          const r = p.roundAt !== undefined && t >= p.roundAt ? R : 0;
          if (p.a === seg.title) {
            // Title clip: the name sits in it; its outline goes when the playhead lands.
            const showOutline = t < STAB;
            if (showOutline) drawPiece(p.a, p.b, x, y, 0);
            g.save();
            g.font = '700 ' + wordPx + 'px ' + kit.SYS; g.fillStyle = INK; g.textBaseline = 'middle';
            g.fillText('FreeMotion', x + 2, y + CW * 0.52 + 3 * s);
            g.restore();
            continue;
          }
          // Smear on the slam: two ghosts dragged behind, a frame's travel long.
          if (pl[2] > 6) {
            g.globalAlpha = 0.28; drawPiece(p.a, p.b, x + pl[2] * 0.66, y, r);
            g.globalAlpha = 0.5; drawPiece(p.a, p.b, x + pl[2] * 0.33, y, r);
            g.globalAlpha = 1;
          }
          drawPiece(p.a, p.b, x, y, r);
        }

        // The playhead comes down exactly like the razor did, and that is the last hit.
        const hd = F.head, hx = X0 + (hd.x - 14) * s;
        if (t >= STAB - 0.16) {
          let dy = 0;
          if (t < STAB - 0.05) dy = -h * 0.6 + 40 - 10 * ease.out2(map(t, STAB - 0.16, STAB - 0.05));
          else if (t < STAB) dy = lerp(-h * 0.6 + 30, 0, ease.in3(map(t, STAB - 0.05, STAB)));
          else if (t < STAB + 0.05) dy = 3 * Math.sin((t - STAB) / 0.05 * Math.PI);
          g.save();
          g.translate(hx, Yv(3) + dy);
          g.fillStyle = INK;
          rr(g, -1.5, (hd.y - 3) * s, hd.w * s + 3, hd.h * s, hd.r * s + 1); g.fill();
          g.beginPath();
          g.moveTo((hd.tri[0][0] - hd.x) * s - 2, (hd.tri[0][1] - 3) * s - 2.4);
          g.lineTo((hd.tri[1][0] - hd.x) * s + 3, (hd.tri[1][1] - 3) * s);
          g.lineTo((hd.tri[2][0] - hd.x) * s - 2, (hd.tri[2][1] - 3) * s + 2);
          g.fill();
          g.fillStyle = F.teal;
          rr(g, 0, (hd.y - 3) * s, hd.w * s, hd.h * s, hd.r * s); g.fill();
          g.beginPath();
          g.moveTo((hd.tri[0][0] - hd.x) * s, (hd.tri[0][1] - 3) * s);
          g.lineTo((hd.tri[1][0] - hd.x) * s, (hd.tri[1][1] - 3) * s);
          g.lineTo((hd.tri[2][0] - hd.x) * s, (hd.tri[2][1] - 3) * s);
          g.fill();
          g.restore();
        }

        // The razor goes out the top when the job is done, flicked up and away.
        if (toolOn) {
          let by = ry, bx = rx, tilt = 0.05;
          if (t > 1.5) { const d = map(t, 1.54, 1.72); by = hover - ease.in3(d) * h; bx = rx + ease.in3(d) * w * 0.5; tilt = 0.05 + ease.in2(d) * 0.9; }
          blade(bx, by, tilt);
        }
        g.restore();
      };
    },
  });
  // ======================================================================================================================
  // (c) THE GRADE
  // ======================================================================================================================
  FMI.add({
    id: 'editor-grade',
    lane: LANE,
    name: 'The grade',
    blurb: 'A washed-out grey shot of an F on a wall gets its curves and colour wheels yanked until it turns sunlit orange and teal, and the before-and-after line stops and becomes the playhead.',
    dur: 3.0,
    ground: '#6d6f6a',
    make(stage, kit) {
      const { w, h, F, lerp, clamp, map, ease } = kit;
      const g = kit.canvas({ alpha: false });
      const panelH = clamp(h * 0.36, 196, 306), yP = h - panelH;
      const s = Math.min(0.76 * w / 92, (yP - 66 - 10) / 107);
      const X0 = (w - 92 * s) / 2 - w * 0.015, Ytop = 66 + Math.max(0, (yP - 76 - 107 * s) * 0.8);
      const Xu = (u) => X0 + (u - 14) * s, Yv = (v) => Ytop + (v - 3) * s;
      const CW = 22 * s;

      // ---- The shot. A plaster wall in low sun, three slabs fixed to it, a real cast shadow, painted lettering. ----
      const RQ = w * h > 240000 ? 0.8 : 1, RW = Math.ceil(w * RQ), RH = Math.ceil(h * RQ), N = RW * RH;
      const lift = new Float32Array(N), blot = new Float32Array(N);
      function octave(arr, cell, amp, seed) {
        const gw = Math.ceil(RW / cell) + 2, gh = Math.ceil(RH / cell) + 2, r = kit.rng(seed), grid = new Float32Array(gw * gh);
        for (let i = 0; i < grid.length; i++) grid[i] = r();
        for (let y = 0, o = 0; y < RH; y++) {
          const fy = y / cell, iy = fy | 0, ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
          for (let x = 0; x < RW; x++, o++) {
            const fx = x / cell, ix = fx | 0, tx = fx - ix, sx = tx * tx * (3 - 2 * tx);
            const a = grid[iy * gw + ix], b = grid[iy * gw + ix + 1], c = grid[(iy + 1) * gw + ix], d = grid[(iy + 1) * gw + ix + 1];
            arr[o] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
          }
        }
      }
      octave(lift, 1.7, 0.5, 11); octave(lift, 3.3, 0.8, 12); octave(lift, 9, 1.0, 13);
      octave(blot, 22, 0.35, 14); octave(blot, 70, 0.65, 15); octave(blot, 210, 1.0, 16);
      // Sun: everything the slabs and the building hide from it. Long, low, from upper left.
      const ox = 15 * s, oy = 26 * s;
      const maskC = document.createElement('canvas'); maskC.width = RW; maskC.height = RH;
      const mg = maskC.getContext('2d', { willReadFrequently: true });
      mg.fillStyle = '#fff'; mg.fillRect(0, 0, RW, RH);
      mg.scale(RQ, RQ);
      mg.fillStyle = '#000';
      F.clips.forEach((c) => {
        const x = Xu(c.x), y = Yv(c.y), W = c.w * s, H = c.h * s;
        mg.beginPath(); mg.moveTo(x, y); mg.lineTo(x + W, y); mg.lineTo(x + W + ox, y + oy); mg.lineTo(x + W + ox, y + H + oy); mg.lineTo(x + ox, y + H + oy); mg.lineTo(x, y + H); mg.closePath(); mg.fill();
      });
      const m0 = mg.getImageData(0, 0, RW, RH).data, mask = new Float32Array(N);
      for (let i = 0; i < N; i++) mask[i] = m0[i * 4] / 255;
      function blur(a, r) {
        const t = new Float32Array(N), n = 2 * r + 1;
        for (let y = 0; y < RH; y++) { let acc = 0; const o = y * RW; for (let x = -r; x <= r; x++) acc += a[o + clamp(x, 0, RW - 1)]; for (let x = 0; x < RW; x++) { t[o + x] = acc / n; acc += a[o + Math.min(RW - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
        for (let x = 0; x < RW; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += t[clamp(y, 0, RH - 1) * RW + x]; for (let y = 0; y < RH; y++) { a[y * RW + x] = acc / n; acc += t[Math.min(RH - 1, y + r + 1) * RW + x] - t[Math.max(0, y - r) * RW + x]; } }
      }
      blur(mask, 2); blur(mask, 2);
      // The building across the street: its edge falls in a slant across the bottom of the wall.
      const edge = (x) => h * 0.76 + (x / w - 0.5) * w * 0.34;
      const rad = new Float32Array(N * 3);
      const sunC = [1.0, 0.8, 0.58], ambC = [0.2, 0.3, 0.42];
      const alb = [0.6, 0.31, 0.2];
      for (let y = 0, o = 0; y < RH; y++) {
        for (let x = 0; x < RW; x++, o++) {
          const nx = x < RW - 1 && y < RH - 1 ? lift[o + RW + 1] : lift[o];
          const bump = 1 + (nx - lift[o]) * 0.42;
          const stain = 0.7 + blot[o] * 0.36;
          const be = clamp((edge(x / RQ) - y / RQ) / 7 + 0.5);
          // A second, softer shadow from the top right corner, like a roof line.
          const roof = clamp(((x / RW - 0.74) - (y / RH) * 1.25 + 0.0) * 40 + 0.5);
          const sun = mask[o] * be * (1 - roof);
          for (let c = 0; c < 3; c++) {
            rad[o * 3 + c] = alb[c] * stain * (sun * bump * sunC[c] * 1.0 + ambC[c] * (0.92 + (bump - 1) * 0.4));
          }
        }
      }
      // The grade itself. Four states: log, contrast, warm highlights, teal shadows.
      const STAGE = [
        { c: 0, w: 0, t: 0, sat: 0.2 },
        { c: 1, w: 0, t: 0, sat: 0.34 },
        { c: 1, w: 1, t: 0, sat: 0.78 },
        { c: 1, w: 1, t: 1, sat: 0.96 },
      ];
      const OUT = [0, 0, 0];
      const SCURVE = new Float32Array(1025);
      for (let i = 0; i <= 1024; i++) { const q = clamp((i / 1024 * 1.3 - 0.13) / 0.92); SCURVE[i] = q * q * (3 - 2 * q); }
      const disp = new Float32Array(N * 3);
      for (let i = 0; i < N * 3; i++) disp[i] = Math.pow(rad[i], 0.4545);
      function gradeD(a, b, c, P) {
        const fa = 0.44 + (a - 0.52) * 0.33, fb = 0.45 + (b - 0.52) * 0.33, fc = 0.43 + (c - 0.52) * 0.33;
        const sa = SCURVE[Math.min(1024, (a / 1.3 * 1024) | 0)], sb = SCURVE[Math.min(1024, (b / 1.3 * 1024) | 0)], sc = SCURVE[Math.min(1024, (c / 1.3 * 1024) | 0)];
        a = fa + (sa - fa) * P.c; b = fb + (sb - fb) * P.c; c = fc + (sc - fc) * P.c;
        const l0 = 0.3 * a + 0.59 * b + 0.11 * c;
        a = l0 + (a - l0) * P.sat * 1.4; b = l0 + (b - l0) * P.sat * 1.2; c = l0 + (c - l0) * P.sat * 1.4;
        const l = l0 < 0 ? 0 : l0 > 1 ? 1 : l0;
        const h1 = (l - 0.28) / 0.4, h2 = (l - 0.74) / 0.18, l1 = l / 0.5;
        const hi = (h1 < 0 ? 0 : h1 > 1 ? 1 : h1) * (1 - 0.85 * (h2 < 0 ? 0 : h2 > 1 ? 1 : h2)), lo = 1 - (l1 > 1 ? 1 : l1);
        a *= 1 + 0.1 * P.w * hi; b *= 1 - 0.07 * P.w * hi; c *= 1 - 0.3 * P.w * hi;
        const ll = P.t * lo * lo;
        a += ll * -0.16; b += ll * 0.2; c += ll * 0.3;
        OUT[0] = a < 0 ? 0 : a > 1 ? 1 : a; OUT[1] = b < 0 ? 0 : b > 1 ? 1 : b; OUT[2] = c < 0 ? 0 : c > 1 ? 1 : c;
        return OUT;
      }
      const gc = (r, gg, b, P) => rgb(gradeD(Math.pow(r, 0.4545), Math.pow(gg, 0.4545), Math.pow(b, 0.4545), P).slice());
      // Word and the slabs drawn crisp over the soft wall.
      g.font = "400 100px 'Archivo Black', " + kit.SYS;
      const wordPx = 100 * (92 * s) / g.measureText('FreeMotion').width;
      const wordY = Math.max(Yv(110) + wordPx * 1.15, yP + wordPx * 0.84);
      const worn = kit.layer();
      (function () {
        const x = worn.g, r = kit.rng(444);
        x.font = "400 " + wordPx + "px 'Archivo Black', " + kit.SYS; x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
        x.fillText('FreeMotion', Xu(14), wordY);
        x.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(0,0,0,' + (0.2 + r() * 0.6) + ')'; const px = Xu(14) + r() * 92 * s, py = wordY - wordPx * 0.8 * r(); x.fillRect(px, py, 0.6 + r() * 1.8, 0.5 + r() * 1.1); }
        x.globalCompositeOperation = 'source-over';
      })();
      const speck = kit.layer(160, 160);
      (function () { const r = kit.rng(9); for (let i = 0; i < 900; i++) { speck.g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.09)' : 'rgba(255,255,255,.09)'; speck.g.fillRect(r() * 160, r() * 160, 0.6 + r() * 1.3, 0.6 + r() * 1.3); } })();
      const stages = [], scopes = [], paint = kit.layer(), px2 = paint.g;
      const SCW = Math.ceil((w - 24) * 0.46), SCH = 90;
      STAGE.forEach((P) => {
        const c = document.createElement('canvas'); c.width = RW; c.height = RH;
        const x = c.getContext('2d'), im = x.createImageData(RW, RH), d = im.data;
        const den = [new Uint16Array(SCW * SCH), new Uint16Array(SCW * SCH), new Uint16Array(SCW * SCH)];
        for (let i = 0; i < N; i++) {
          const o = gradeD(disp[i * 3], disp[i * 3 + 1], disp[i * 3 + 2], P);
          d[i * 4] = o[0] * 255; d[i * 4 + 1] = o[1] * 255; d[i * 4 + 2] = o[2] * 255; d[i * 4 + 3] = 255;
          if (i % 3 === 0) {
            const px = i % RW, py = (i / RW) | 0;
            if (py % 3 === 0) {
              const col = Math.floor(px / RW * (SCW / 3 - 2));
              for (let ch = 0; ch < 3; ch++) { const lane = col + ch * Math.floor(SCW / 3); const ly = SCH - 1 - Math.floor(o[ch] * (SCH - 1)); den[ch][ly * SCW + lane]++; }
            }
          }
        }
        x.putImageData(im, 0, 0);
        // Composite the full frame for this state.
        const L = kit.layer(), lx = L.g;
        lx.imageSmoothingEnabled = true; lx.drawImage(c, 0, 0, w, h);
        const bone = (m) => gc(0.98 * m, 0.92 * m, 0.82 * m, P);
        F.clips.forEach((cl) => {
          const X = Xu(cl.x), Y = Yv(cl.y), W = cl.w * s, H = cl.h * s, r = cl.r * s;
          const gr = lx.createLinearGradient(0, Y, 0, Y + H);
          gr.addColorStop(0, bone(1.18)); gr.addColorStop(0.5, bone(1.0)); gr.addColorStop(1, bone(0.8));
          lx.fillStyle = gr; rr(lx, X, Y, W, H, r); lx.fill();
          lx.save(); rr(lx, X, Y, W, H, r); lx.clip();
          for (let yy = Y - (Y % 160); yy < Y + H; yy += 160) for (let xx = X - (X % 160); xx < X + W; xx += 160) lx.drawImage(speck.canvas, xx, yy, 160, 160);
          lx.fillStyle = bone(0.5); lx.fillRect(X, Y + H - Math.max(1.5, s * 0.5), W, Math.max(1.5, s * 0.5));
          lx.restore();
        });
        px2.globalCompositeOperation = 'source-over'; px2.clearRect(0, 0, w, h);
        px2.drawImage(worn.canvas, 0, 0, w, h);
        px2.globalCompositeOperation = 'source-in';
        px2.fillStyle = bone(1.08); px2.fillRect(0, 0, w, h);
        lx.drawImage(paint.canvas, 0, 0, w, h);
        stages.push(L);
        // RGB parade from the real pixels of this state.
        const sc = document.createElement('canvas'); sc.width = SCW; sc.height = SCH;
        const sx = sc.getContext('2d'), si = sx.createImageData(SCW, SCH), sd = si.data;
        const tints = [[255, 70, 60], [80, 240, 110], [80, 150, 255]];
        for (let ch = 0; ch < 3; ch++) for (let q = 0; q < den[ch].length; q++) {
          const v = den[ch][q];
          if (v) { const a = q * 4; sd[a] = tints[ch][0]; sd[a + 1] = tints[ch][1]; sd[a + 2] = tints[ch][2]; sd[a + 3] = Math.min(255, 70 + v * 9); }
        }
        sx.putImageData(si, 0, 0);
        scopes.push(sc);
      });

      // ---- The grading panel ----
      const pad = 8, wheelR = Math.min((w - pad * 2) / 3 / 2 - 7, panelH * 0.21);
      const row1 = yP + 18 + wheelR, row2 = row1 + wheelR + 17;
      const wheelX = [0, 1, 2].map((i) => pad + (w - pad * 2) * (i + 0.5) / 3);
      const r2H = h - row2 - 8;
      const curve = { x: pad, y: row2, w: Math.floor((w - pad * 3) * 0.5), h: r2H };
      const scope = { x: curve.x + curve.w + pad, y: row2, w: w - curve.x - curve.w - pad * 2, h: r2H };
      const panel = kit.layer(w, panelH);
      (function () {
        const x = panel.g, oy2 = -yP;
        x.save(); x.translate(0, oy2);
        x.fillStyle = '#1d1e20'; x.fillRect(0, yP, w, panelH);
        x.fillStyle = '#000'; x.fillRect(0, yP, w, 1);
        x.fillStyle = '#34353a'; x.fillRect(0, yP + 1, w, 1);
        x.font = '600 10px ' + kit.SYS; x.textBaseline = 'middle'; x.textAlign = 'center';
        ['Lift', 'Gamma', 'Gain'].forEach((lab, i) => {
          const cx = wheelX[i], cy = row1;
          // Hue ring.
          for (let a = 0; a < 90; a++) {
            x.strokeStyle = 'hsl(' + (a * 4 + 100) + ',78%,52%)'; x.lineWidth = 3.4;
            x.beginPath(); x.arc(cx, cy, wheelR - 2, a / 90 * Math.PI * 2 - 0.01, (a + 1) / 90 * Math.PI * 2 + 0.01); x.stroke();
          }
          const d = x.createLinearGradient(0, cy - wheelR, 0, cy + wheelR);
          d.addColorStop(0, '#34353a'); d.addColorStop(1, '#232428');
          x.fillStyle = d; x.beginPath(); x.arc(cx, cy, wheelR - 5, 0, 7); x.fill();
          x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = 1;
          x.beginPath(); x.moveTo(cx - wheelR + 7, cy); x.lineTo(cx + wheelR - 7, cy); x.moveTo(cx, cy - wheelR + 7); x.lineTo(cx, cy + wheelR - 7); x.stroke();
          x.fillStyle = '#a3a5ab'; x.fillText(lab, cx, yP + 9);
        });
        x.textAlign = 'left';
        // Curves box.
        x.fillStyle = '#121315'; x.fillRect(curve.x, curve.y, curve.w, curve.h);
        x.strokeStyle = '#2d2e33'; x.lineWidth = 1;
        for (let i = 1; i < 4; i++) { const gx = Math.round(curve.x + curve.w * i / 4) + 0.5, gy = Math.round(curve.y + curve.h * i / 4) + 0.5; x.beginPath(); x.moveTo(gx, curve.y); x.lineTo(gx, curve.y + curve.h); x.moveTo(curve.x, gy); x.lineTo(curve.x + curve.w, gy); x.stroke(); }
        x.strokeStyle = '#3a3b41'; x.beginPath(); x.moveTo(curve.x, curve.y + curve.h); x.lineTo(curve.x + curve.w, curve.y); x.stroke();
        // Scope box.
        x.fillStyle = '#0d0e0f'; x.fillRect(scope.x, scope.y, scope.w, scope.h);
        x.strokeStyle = '#26272b';
        for (let i = 1; i < 4; i++) { const gy = Math.round(scope.y + scope.h * i / 4) + 0.5; x.beginPath(); x.moveTo(scope.x, gy); x.lineTo(scope.x + scope.w, gy); x.stroke(); }
        x.restore();
      })();
      const bypassBtn = { x: w - pad - 54, y: yP - 48, w: 54, h: 20 };
      const curvePt = (px, py) => [curve.x + curve.w * px, curve.y + curve.h * (1 - py)];

      // The score. A colourist's hands: go there, yank past it, come back.
      const Y1 = { a: 0.26, b: 0.34, c: 0.44 }, Y2 = { a: 0.58, b: 0.65, c: 0.72 }, Y3 = { a: 0.92, b: 1.01, c: 1.12 }, Y4 = { a: 1.3, b: 1.38, c: 1.46 };
      const BY = [1.64, 1.76, 1.86], WIPE = { on: 2.04, stop: 2.42, settle: 2.5 }, HIT = 2.58;
      const yank = (t, y, over) => k3(t, y.a, y.b, y.c, over);
      function k3(t, a, b, c, over) { if (t <= a) return 0; if (t < b) return (1 + over) * ease.out2((t - a) / (b - a)); if (t < c) return 1 + over * (1 - ease.io2((t - b) / (c - b))); return 1; }
      const hi0 = curvePt(0.75, 0.75), hi1 = curvePt(0.75, 0.93), lo0 = curvePt(0.25, 0.25), lo1 = curvePt(0.25, 0.08);
      const gainC = [wheelX[2], row1], liftC = [wheelX[0], row1];
      // Toward orange and toward teal on the ring, whichever way the ring was drawn.
      const hueAng = (hue) => ((hue - 100) / 360) * Math.PI * 2;
      const gainTo = [Math.cos(hueAng(28)) * wheelR * 0.56, Math.sin(hueAng(28)) * wheelR * 0.56];
      const liftTo = [Math.cos(hueAng(186)) * wheelR * 0.5, Math.sin(hueAng(186)) * wheelR * 0.5];
      const handleY = yP - 44;
      const lineTo = Xu(F.head.x + F.head.w / 2);
      const finger = track([w + 40, row2 + 10], [
        [0.0, 0.24, hi0[0], hi0[1], -0.12],
        [Y1.a, Y1.b, hi1[0] + 3, hi1[1] - curve.h * 0.05, 0],
        [Y1.b, Y1.c, hi1[0], hi1[1], 0],
        [0.46, 0.57, lo0[0], lo0[1], 0.1],
        [Y2.a, Y2.b, lo1[0] - 2, lo1[1] + curve.h * 0.04, 0],
        [Y2.b, Y2.c, lo1[0], lo1[1], 0],
        [0.74, 0.91, gainC[0], gainC[1], 0.14],
        [Y3.a, Y3.b, gainC[0] + gainTo[0] * 1.35, gainC[1] + gainTo[1] * 1.35, 0.05],
        [Y3.b, Y3.c, gainC[0] + gainTo[0], gainC[1] + gainTo[1], 0],
        [1.14, 1.29, liftC[0], liftC[1], -0.1],
        [Y4.a, Y4.b, liftC[0] + liftTo[0] * 1.22, liftC[1] + liftTo[1] * 1.22, -0.05],
        [Y4.b, Y4.c, liftC[0] + liftTo[0], liftC[1] + liftTo[1], 0],
        [1.48, 1.63, bypassBtn.x + 26, bypassBtn.y + 10, 0.08],
        [1.9, 2.03, 10, handleY, -0.08],
        [2.05, 2.2, lineTo * 0.56, handleY - 4, 0.02],
        [2.2, 2.27, lineTo * 0.52, handleY + 2, 0],
        [2.27, 2.42, lineTo + 15, handleY - 3, 0],
        [2.42, 2.5, lineTo, handleY, 0],
        [2.56, 2.76, w * 0.92, h + 60, 0.1],
      ]);
      const touching = (t) => (t > Y1.a - 0.02 && t < Y1.c + 0.01) || (t > Y2.a - 0.02 && t < Y2.c + 0.01) || (t > Y3.a - 0.02 && t < Y3.c + 0.01) || (t > Y4.a - 0.02 && t < Y4.c + 0.01) || (t > BY[0] - 0.02 && t < BY[0] + 0.04) || (t > BY[1] - 0.02 && t < BY[1] + 0.04) || (t > BY[2] - 0.02 && t < BY[2] + 0.04) || (t > WIPE.on - 0.02 && t < WIPE.settle + 0.03);

      const grain = kit.grainTile(180, 0.17, 5);
      function spline(px, py, fn) {
        const P = [[0, 0], [0.25, py[0]], [0.5, 0.5], [0.75, py[1]], [1, 1]];
        let first = true;
        g.beginPath();
        for (let i = 0; i < 4; i++) {
          const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(4, i + 2)];
          for (let n = 0; n <= 8; n++) {
            const q = n / 8, q2 = q * q, q3 = q2 * q;
            const yy = 0.5 * (2 * p1[1] + (p2[1] - p0[1]) * q + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * q2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * q3);
            const xx = lerp(p1[0], p2[0], q);
            const a = curve.x + curve.w * xx, b = curve.y + curve.h * (1 - clamp(yy));
            if (first) { g.moveTo(a, b); first = false; } else g.lineTo(a, b);
          }
        }
        g.strokeStyle = '#e8e9ec'; g.lineWidth = 1.5; g.stroke();
      }

      return function seek(t0) {
        const t = kit.on(t0, 30);
        const panelIn = ease.out3(map(t, 0, 0.1));
        const panelOut = ease.in3(map(t, HIT, HIT + 0.17));
        const py = yP + (1 - panelIn) * panelH + panelOut * (panelH + 4);
        const yHi = yank(t, Y1, 0.34), yLo = yank(t, Y2, 0.3), yG = yank(t, Y3, 0.42), yL = yank(t, Y4, 0.24);
        // How far through the grade the picture is, 0 log to 3 final, following the hands.
        const cProg = clamp(yHi * 0.55 + yLo * 0.45, 0, 1.25);
        let lvl = Math.min(cProg, 1) + clamp(yG) + clamp(yL);
        const bypass = (t >= BY[0] && t < BY[1]) || (t >= BY[2] && t < HIT);
        const lvA = Math.floor(Math.min(lvl, 2.999)), lvB = lvA + 1, lvP = lvl - lvA;
        const done = t >= HIT;
        const drawGraded = () => { g.drawImage(stages[lvA].canvas, 0, 0, w, h); if (lvP > 0) { g.globalAlpha = lvP; g.drawImage(stages[lvB].canvas, 0, 0, w, h); g.globalAlpha = 1; } };
        if (done) g.drawImage(stages[3].canvas, 0, 0, w, h);
        else if (bypass) g.drawImage(stages[0].canvas, 0, 0, w, h);
        else drawGraded();

        // Yanked too far: the picture really does go too far for a moment, and is brought back.
        if (!bypass && !done) {
          if (yHi > 1 && yLo === 0) { g.globalCompositeOperation = 'overlay'; g.globalAlpha = (yHi - 1) * 1.2; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
          if (yLo > 1) { g.globalCompositeOperation = 'multiply'; g.globalAlpha = (yLo - 1) * 1.8; g.fillStyle = '#333'; g.fillRect(0, 0, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
          if (yG > 1) { g.globalCompositeOperation = 'multiply'; g.globalAlpha = (yG - 1) * 1.7; g.fillStyle = '#ff9a2a'; g.fillRect(0, 0, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
          if (yL > 1) { g.globalCompositeOperation = 'screen'; g.globalAlpha = (yL - 1) * 1.6; g.fillStyle = '#0d5a68'; g.fillRect(0, 0, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        }

        // The compare wipe: graded to the left of the line, log to the right.
        let lineX = -10;
        if (t >= WIPE.on && !done) {
          const [fx] = finger(t);
          lineX = Math.max(0, fx);
          g.save(); g.beginPath(); g.rect(0, 0, lineX, h); g.clip();
          g.drawImage(stages[3].canvas, 0, 0, w, h);
          g.restore();
        }

        // The playhead arrives on the line.
        const hd = F.head;
        if (done) {
          const ht = map(t, HIT, HIT + 0.1);
          const q = ease.out4(ht);
          const yA = lerp(-2, Yv(hd.y), q), yB = lerp(yP, Yv(hd.y + hd.h), q);
          const rw = lerp(2, hd.w * s, ease.out2(map(t, HIT, HIT + 0.05))), xL = Xu(hd.x) + (hd.w * s - rw) / 2;
          const tdy = yA - Yv(hd.y);
          const tri = (ox2, oy2) => { g.beginPath(); g.moveTo(Xu(hd.tri[0][0]) + ox2, Yv(hd.tri[0][1]) + oy2 + tdy); g.lineTo(Xu(hd.tri[1][0]) + ox2, Yv(hd.tri[1][1]) + oy2 + tdy); g.lineTo(Xu(hd.tri[2][0]) + ox2, Yv(hd.tri[2][1]) + oy2 + tdy); g.fill(); };
          // Its cast shadow, thrown the same way as the slabs.
          g.fillStyle = 'rgba(6,44,54,.6)';
          const shX = ox * 0.3, shY = oy * 0.3;
          rr(g, xL + shX, yA + shY, rw, yB - yA, hd.r * s); g.fill();
          tri(shX, shY);
          g.fillStyle = F.teal;
          rr(g, xL, yA, rw, yB - yA, hd.r * s); g.fill();
          tri(0, 0);
        }
        // Burnt-in slate of the raw shot, along the bottom of the picture, until the grade is hit.
        if (!done) {
          g.font = "700 " + clamp(w * 0.03, 9.5, 12) + "px 'Courier Prime', monospace"; g.textBaseline = 'alphabetic'; g.fillStyle = 'rgba(255,255,255,.86)';
          const fr = kit.frame(t, 24);
          g.fillText('A001_C007  LOG-C  EI800', 8, py - 10);
          g.textAlign = 'right';
          g.fillText('01:14:22:' + String((fr + 3) % 24).padStart(2, '0'), w - 8, py - 10);
          g.textAlign = 'left';
        }
        // Grain sits on all of it, like it would.
        kit.grain(g, grain, kit.frame(t, 24), done ? 0.3 : 0.52);
        // The hit: two frames of too-much, then it is just there.
        if (t >= HIT && t < HIT + 0.067) { g.globalCompositeOperation = 'overlay'; g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; }

        // Compare line and its handle.
        if (t >= WIPE.on && !done) {
          g.fillStyle = '#fff'; g.fillRect(lineX - 1, 0, 2, yP);
          g.fillStyle = '#fff'; g.beginPath(); g.arc(lineX, handleY, 8, 0, 7); g.fill();
          g.fillStyle = '#222'; g.beginPath(); g.moveTo(lineX - 2, handleY - 3.5); g.lineTo(lineX - 5.5, handleY); g.lineTo(lineX - 2, handleY + 3.5); g.moveTo(lineX + 2, handleY - 3.5); g.lineTo(lineX + 5.5, handleY); g.lineTo(lineX + 2, handleY + 3.5); g.fill();
        }

        // The panel, sliding off when the grade is hit.
        if (py < h) {
          g.save(); g.translate(0, py - yP);
          g.drawImage(panel.canvas, 0, yP, w, panelH);
          // Pucks.
          const pk = (cx, cy, dx, dy) => { if (dx || dy) { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + dx, cy + dy); g.stroke(); } g.fillStyle = '#e9eaec'; g.beginPath(); g.arc(cx + dx, cy + dy, 3.6, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke(); };
          pk(wheelX[0], row1, liftTo[0] * yL, liftTo[1] * yL);
          pk(wheelX[1], row1, 0, 0);
          pk(wheelX[2], row1, gainTo[0] * yG, gainTo[1] * yG);
          // Numbers under each wheel, moving with the hand.
          g.font = "700 " + (w < 350 ? 8 : 9.5) + "px 'Courier Prime', monospace"; g.fillStyle = '#c6c8cc'; g.textAlign = 'center'; g.textBaseline = 'middle';
          const fmt = (v) => (v < 0 ? '\u2212' : '+') + Math.abs(v).toFixed(2);
          g.fillText(fmt(-0.08 * yL) + ' ' + fmt(0.03 * yL) + ' ' + fmt(0.11 * yL), wheelX[0], row1 + wheelR + 8);
          g.fillText('+0.00 +0.00 +0.00', wheelX[1], row1 + wheelR + 8);
          g.fillText(fmt(0.34 * yG) + ' ' + fmt(-0.04 * yG) + ' ' + fmt(-0.29 * yG), wheelX[2], row1 + wheelR + 8);
          g.textAlign = 'left';
          // Curve.
          const a = 0.25 - 0.17 * yLo, b = 0.75 + 0.18 * yHi;
          spline(0, [a, b]);
          [[0.25, a], [0.75, b]].forEach((q) => { const p = curvePt(q[0], clamp(q[1])); g.fillStyle = '#fff'; g.fillRect(p[0] - 2.5, p[1] - 2.5, 5, 5); });
          // Scope: a parade from the real pixels. In bypass and on the wipe it shows the log.
          const useLog = bypass;
          const sA = useLog ? 0 : lvA, sB = useLog ? 0 : lvB, sP = useLog ? 0 : lvP;
          g.imageSmoothingEnabled = true;
          g.drawImage(scopes[sA], scope.x, scope.y, scope.w, scope.h);
          if (sP > 0) { g.globalAlpha = sP; g.drawImage(scopes[sB], scope.x, scope.y, scope.w, scope.h); g.globalAlpha = 1; }
          g.restore();
        }

        // Bypass switch, sitting on the picture.
        if (!done) {
          g.fillStyle = bypass ? '#e8c34a' : 'rgba(20,21,23,.86)'; rr(g, bypassBtn.x, bypassBtn.y + (py - yP), bypassBtn.w, bypassBtn.h, 3); g.fill();
          g.font = '600 10px ' + kit.SYS; g.fillStyle = bypass ? '#1a1a1a' : '#c9cbd0'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText('BYPASS', bypassBtn.x + bypassBtn.w / 2, bypassBtn.y + bypassBtn.h / 2 + 0.5 + (py - yP)); g.textAlign = 'left';
        }

        // A fingertip, as iOS shows it in a screen recording.
        const [fx, fy] = finger(t);
        if (fx < w + 20 && fy < h + 20) {
          const on = touching(t);
          g.fillStyle = on ? 'rgba(235,236,238,.62)' : 'rgba(235,236,238,.34)';
          g.beginPath(); g.arc(fx, fy, on ? 15 : 17, 0, 7); g.fill();
          g.strokeStyle = 'rgba(30,30,32,.5)'; g.lineWidth = 1; g.stroke();
        }
      };
    },
  });
})();