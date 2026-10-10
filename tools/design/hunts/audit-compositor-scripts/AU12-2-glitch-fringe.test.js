  test('AU12-2 Glitch RGB fringe is the same width in project pixels on a half-scale preview plate as in the export', { item: 'AU12', budgetMs: 30000 }, function () {
    if (!FM._pixelFx || typeof FM._pixelFx.glitch !== 'function') throw new Error('FM._pixelFx.glitch is not reachable, the seam this test needs is gone');
    const W = 100, H = 50;
    /* Amount 0.02 on a 100 px plate moves no slice (round(0.5 × 0.02 × 100 × 0.28) is 0), so the only thing that moves is the fringe:
       red reads cs px to the right, blue cs px to the left, and cs = round(amount × 9 × Fringe × plate scale). */
    const fringe = (ps, dir) => {
      const w = dir ? H : W, h = dir ? W : H, d = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, v = (dir ? (y >= 20 && y < 30) : (x >= 40 && x < 60)) ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      FM._pixelFx.glitch(d, W, H, { amount: 0.02, split: 30, bands: 2, speed: 0, dir: dir ? 1 : 0 }, 0, ps);
      const first = c => { for (let k = 0; k < (dir ? H : W); k++) { const i = dir ? (k * W + 5) * 4 : (5 * W + k) * 4; if (d[i + c] > 128) return k; } return -1; };
      return first(1) - first(2);   // green stays put, blue moves one way: its distance IS the fringe
    };
    for (const dir of [0, 1]) {
      const full = fringe(1, dir), half = fringe(0.5, dir), none = (() => { const d = fringe(undefined, dir); return d; })();
      if (Math.abs(full) !== 5) throw new Error('CONTROL: at full scale the fringe should be 5 px, measured ' + Math.abs(full) + (dir ? ' (vertical)' : ''));
      if (none !== full) throw new Error('CONTROL: a call with no plate scale should draw the full-scale fringe (' + full + '), got ' + none);
      if (Math.abs(half) !== 3) throw new Error('A half-scale plate should draw a 3 px fringe (round(0.02 × 9 × 30 × 0.5 = 2.7)), measured ' + Math.abs(half) + (dir ? ' (vertical)' : '') + ', so the preview shows a fringe twice as wide as the export');
    }
  });

