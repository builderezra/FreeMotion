(function(){ function fparam(p,k,d,t){ var v=p&&p[k]; return (typeof v==="number")?v:d; }
let _oilPaintScratch = null;
  function oilPaintScratch(n, satN) {
    if (!_oilPaintScratch || _oilPaintScratch.n < n || _oilPaintScratch.satN < satN) {
      _oilPaintScratch = { n: n, satN: satN, source: new Uint8ClampedArray(n * 4), styled: new Uint8ClampedArray(n * 4), sat: [] };
      for (var i = 0; i < 6; i++) _oilPaintScratch.sat.push(new Float32Array(satN));
    }
    return _oilPaintScratch;
  }
  
 var K = {
    oilpaint: function (d, W, H, p, t, ps) {
      var mix = Math.max(0, Math.min(1, fparam(p, 'mix', 100, t) / 100));
      if (mix <= 0 || W < 1 || H < 1) return;
      var sample = W * H > 50000 ? 2 : 1, SW = Math.ceil(W / sample), SH = Math.ceil(H / sample);
      var n = SW * SH, stride = SW + 1, satN = stride * (SH + 1);
      var S = oilPaintScratch(n, satN), source = S.source, styled = S.styled;
      var R = S.sat[0], G = S.sat[1], B = S.sat[2], L = S.sat[3], L2 = S.sat[4], A = S.sat[5];
      if (sample === 1) source.set(d);
      else for (var sy = 0; sy < SH; sy++) for (var sx = 0; sx < SW; sx++) {
        var red = 0, green = 0, blue = 0, weight = 0, cells = 0;
        for (var yy = sy * sample; yy < Math.min(H, (sy + 1) * sample); yy++)
          for (var xx = sx * sample; xx < Math.min(W, (sx + 1) * sample); xx++) {
            var i = (yy * W + xx) * 4, a = d[i + 3] / 255;
            red += d[i] * a; green += d[i + 1] * a; blue += d[i + 2] * a; weight += a; cells++;
          }
        var k = (sy * SW + sx) * 4;
        source[k] = weight ? red / weight : 0;
        source[k + 1] = weight ? green / weight : 0;
        source[k + 2] = weight ? blue / weight : 0;
        source[k + 3] = weight / cells * 255;
      }
      // Six summed-area tables make every directional region a fixed number of reads, independent of Brush size.
      R.fill(0, 0, satN); G.fill(0, 0, satN); B.fill(0, 0, satN);
      L.fill(0, 0, satN); L2.fill(0, 0, satN); A.fill(0, 0, satN);
      for (var y = 1; y <= SH; y++) {
        var rr = 0, gg = 0, bb = 0, ll = 0, ll2 = 0, aa = 0;
        for (var x = 1; x <= SW; x++) {
          var si = ((y - 1) * SW + x - 1) * 4, a = source[si + 3] / 255;
          var lum = source[si] * 0.299 + source[si + 1] * 0.587 + source[si + 2] * 0.114;
          rr += source[si] * a; gg += source[si + 1] * a; bb += source[si + 2] * a;
          ll += lum * a; ll2 += lum * lum * a; aa += a;
          var idx = y * stride + x, up = idx - stride;
          R[idx] = R[up] + rr; G[idx] = G[up] + gg; B[idx] = B[up] + bb;
          L[idx] = L[up] + ll; L2[idx] = L2[up] + ll2; A[idx] = A[up] + aa;
        }
      }
      var brush = Math.max(2, Math.min(16, fparam(p, 'brush', 6, t)));
      var rad = Math.max(1, Math.round(brush * (ps > 0 ? ps : 1) / sample));
      var half = Math.max(1, Math.ceil(rad / 2));
      var sharp = Math.max(0, Math.min(1, fparam(p, 'sharpness', 80, t) / 100));
      var detail = Math.round(fparam(p, 'detail', 4, t)) === 8 ? 8 : 4;
      var levels = Math.max(0, Math.min(32, Math.round(fparam(p, 'levels', 0, t))));
      var sum = function (table, ia, ib, ic, id) { return table[id] - table[ib] - table[ic] + table[ia]; };
      for (var y = 0; y < SH; y++) for (var x = 0; x < SW; x++) {
        var pi = (y * SW + x) * 4;
        if (!source[pi + 3]) { styled[pi] = styled[pi + 1] = styled[pi + 2] = 0; continue; }
        var best = Infinity, bestR = 0, bestG = 0, bestB = 0;
        var avgR = 0, avgG = 0, avgB = 0, valid = 0;
        for (var sector = 0; sector < detail; sector++) {
          var x0, x1, y0, y1;
          if (sector === 0) { x0 = x - rad; x1 = x; y0 = y - rad; y1 = y; }
          else if (sector === 1) { x0 = x; x1 = x + rad; y0 = y - rad; y1 = y; }
          else if (sector === 2) { x0 = x - rad; x1 = x; y0 = y; y1 = y + rad; }
          else if (sector === 3) { x0 = x; x1 = x + rad; y0 = y; y1 = y + rad; }
          else if (sector === 4) { x0 = x - half; x1 = x + half; y0 = y - rad; y1 = y; }
          else if (sector === 5) { x0 = x - half; x1 = x + half; y0 = y; y1 = y + rad; }
          else if (sector === 6) { x0 = x - rad; x1 = x; y0 = y - half; y1 = y + half; }
          else { x0 = x; x1 = x + rad; y0 = y - half; y1 = y + half; }
          x0 = Math.max(0, x0); x1 = Math.min(SW - 1, x1);
          y0 = Math.max(0, y0); y1 = Math.min(SH - 1, y1);
          var ia = y0 * stride + x0, ib = y0 * stride + x1 + 1;
          var ic = (y1 + 1) * stride + x0, id = (y1 + 1) * stride + x1 + 1;
          var weight = sum(A, ia, ib, ic, id);
          if (weight <= 1e-5) continue;
          var mr = sum(R, ia, ib, ic, id) / weight;
          var mg = sum(G, ia, ib, ic, id) / weight;
          var mb = sum(B, ia, ib, ic, id) / weight;
          var meanL = sum(L, ia, ib, ic, id) / weight;
          var variance = Math.max(0, sum(L2, ia, ib, ic, id) / weight - meanL * meanL);
          avgR += mr; avgG += mg; avgB += mb; valid++;
          if (variance < best) { best = variance; bestR = mr; bestG = mg; bestB = mb; }
        }
        if (!valid) { bestR = source[pi]; bestG = source[pi + 1]; bestB = source[pi + 2]; valid = 1; avgR = bestR; avgG = bestG; avgB = bestB; }
        var r = avgR / valid * (1 - sharp) + bestR * sharp;
        var g = avgG / valid * (1 - sharp) + bestG * sharp;
        var b = avgB / valid * (1 - sharp) + bestB * sharp;
        if (levels >= 2) {
          r = Math.round(r * (levels - 1) / 255) * 255 / (levels - 1);
          g = Math.round(g * (levels - 1) / 255) * 255 / (levels - 1);
          b = Math.round(b * (levels - 1) / 255) * 255 / (levels - 1);
        }
        styled[pi] = r; styled[pi + 1] = g; styled[pi + 2] = b;
      }
      for (var y = 0; y < H; y++) {
        var smallRow = Math.floor(y / sample) * SW;
        for (var x = 0; x < W; x++) {
          var i = (y * W + x) * 4;
          if (!d[i + 3]) continue;
          var si = (smallRow + Math.floor(x / sample)) * 4;
          if (mix === 1) { d[i] = styled[si]; d[i + 1] = styled[si + 1]; d[i + 2] = styled[si + 2]; }
          else {
            d[i] += (styled[si] - d[i]) * mix;
            d[i + 1] += (styled[si + 1] - d[i + 1]) * mix;
            d[i + 2] += (styled[si + 2] - d[i + 2]) * mix;
          }
        }
      }
    }
 };
 window.__b6oil = K.oilpaint; })();
