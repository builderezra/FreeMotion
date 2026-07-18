/* FreeMotion — animated GIF89a encoder, written from scratch (no external libs).
 * Streaming: each addFrame() quantizes (median-cut), builds a per-frame LOCAL color table,
 * LZW-compresses the indices, and appends the encoded bytes immediately — no raw frame is
 * retained, so a long export can't OOM. Per-frame local tables (not one global table) keep
 * colors accurate across shots. Optional 1-bit transparency + Floyd–Steinberg dither.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // ---- little-endian byte sink (grown as a plain array, sealed to a Uint8Array) ----
  function Bytes() { this.a = []; }
  Bytes.prototype.u8 = function (v) { this.a.push(v & 0xff); };
  Bytes.prototype.u16 = function (v) { this.a.push(v & 0xff, (v >> 8) & 0xff); };
  Bytes.prototype.str = function (s) { for (let i = 0; i < s.length; i++) this.a.push(s.charCodeAt(i) & 0xff); };
  Bytes.prototype.done = function () { return Uint8Array.from(this.a); };

  function clamp255(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }

  // Nearest palette entry by squared RGB distance, searching only the first `count` entries
  // (so a reserved transparent slot at the tail is never chosen for an opaque pixel).
  function nearest(pal, count, r, g, b) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < count; i++) {
      const p = pal[i], dr = r - p[0], dg = g - p[1], db = b - p[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) { bestD = d; best = i; if (d === 0) break; }
    }
    return best;
  }

  // Median-cut quantization over a 15-bit (5-bit/channel) histogram of this frame's pixels.
  // Returns up to `maxColors` palette entries [[r,g,b],...]. Skips alpha<128 pixels when
  // `transparent`, so those don't pull the palette toward the background colour.
  function medianCut(rgba, n, maxColors, transparent) {
    const cnt = new Int32Array(32768);
    const sr = new Float64Array(32768), sg = new Float64Array(32768), sb = new Float64Array(32768);
    for (let i = 0; i < n; i++) {
      if (transparent && rgba[i * 4 + 3] < 128) continue;
      const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      cnt[key]++; sr[key] += r; sg[key] += g; sb[key] += b;
    }
    const entries = [];
    for (let k = 0; k < 32768; k++) {
      const c = cnt[k];
      if (c) entries.push({ n: c, rs: sr[k], gs: sg[k], bs: sb[k], r: sr[k] / c, g: sg[k] / c, b: sb[k] / c });
    }
    if (entries.length === 0) return [[0, 0, 0]];   // fully transparent / empty frame

    function makeBox(start, end) {
      let mnR = 255, mxR = 0, mnG = 255, mxG = 0, mnB = 255, mxB = 0, count = 0;
      for (let i = start; i < end; i++) {
        const e = entries[i];
        if (e.r < mnR) mnR = e.r; if (e.r > mxR) mxR = e.r;
        if (e.g < mnG) mnG = e.g; if (e.g > mxG) mxG = e.g;
        if (e.b < mnB) mnB = e.b; if (e.b > mxB) mxB = e.b;
        count += e.n;
      }
      const dr = mxR - mnR, dg = mxG - mnG, db = mxB - mnB;
      let axis = 'r', range = dr;
      if (dg > range) { range = dg; axis = 'g'; }
      if (db > range) { range = db; axis = 'b'; }
      return { start: start, end: end, count: count, axis: axis, range: range };
    }

    const boxes = [makeBox(0, entries.length)];
    while (boxes.length < maxColors) {
      let bi = -1, bestRange = -1;
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        if (box.end - box.start <= 1) continue;
        if (box.range > bestRange) { bestRange = box.range; bi = i; }
      }
      if (bi < 0) break;   // every box is a single colour — nothing left to split
      const box = boxes[bi], ax = box.axis;
      const sub = entries.slice(box.start, box.end);
      sub.sort((A, B) => A[ax] - B[ax]);
      for (let i = 0; i < sub.length; i++) entries[box.start + i] = sub[i];
      let acc = 0, half = box.count / 2, splitAt = box.start + 1;
      for (let i = box.start; i < box.end; i++) { acc += entries[i].n; if (acc >= half) { splitAt = i + 1; break; } }
      if (splitAt <= box.start) splitAt = box.start + 1;
      if (splitAt >= box.end) splitAt = box.end - 1;
      boxes.splice(bi, 1, makeBox(box.start, splitAt), makeBox(splitAt, box.end));
    }

    return boxes.map(b => {
      let c = 0, r = 0, g = 0, bl = 0;
      for (let i = b.start; i < b.end; i++) { const e = entries[i]; c += e.n; r += e.rs; g += e.gs; bl += e.bs; }
      return [Math.round(r / c), Math.round(g / c), Math.round(bl / c)];
    });
  }

  // GIF's variable-width LZW. Code-size bump timing follows the encoder/decoder handshake:
  // widen right before assigning a code that would overflow the current width; clear at 4096.
  function lzwEncode(minCodeSize, indices, len) {
    const clear = 1 << minCodeSize, eoi = clear + 1, mask = clear - 1;
    let codeSize = minCodeSize + 1, next = eoi + 1, dict = new Map();
    const out = [];
    let cur = 0, curShift = 0;
    function emit(code) {
      cur |= code << curShift; curShift += codeSize;
      while (curShift >= 8) { out.push(cur & 0xff); cur >>>= 8; curShift -= 8; }
    }
    emit(clear);
    let ib = indices[0] & mask;
    for (let i = 1; i < len; i++) {
      const k = indices[i] & mask;
      const key = (ib << 8) | k;
      const code = dict.get(key);
      if (code !== undefined) { ib = code; continue; }
      emit(ib);
      if (next === 4096) { emit(clear); dict = new Map(); next = eoi + 1; codeSize = minCodeSize + 1; }
      else { if (next >= (1 << codeSize)) codeSize++; dict.set(key, next++); }
      ib = k;
    }
    emit(ib);
    emit(eoi);
    if (curShift > 0) out.push(cur & 0xff);
    return out;
  }

  FM.gifEncoder = {
    create: function (width, height, opts) {
      opts = opts || {};
      const W = Math.max(1, width | 0), H = Math.max(1, height | 0), N = W * H;
      const transparent = !!opts.transparent, dither = !!opts.dither, loop = opts.loop !== false;
      const chunks = [];
      let finished = false;

      // Header + logical screen descriptor (no global colour table) + optional NETSCAPE loop.
      const head = new Bytes();
      head.str('GIF89a');
      head.u16(W); head.u16(H);
      head.u8(0x70);   // GCT flag 0, colour resolution 8-bit, no sort, GCT size 0
      head.u8(0); head.u8(0);   // background index, pixel aspect ratio
      if (loop) {
        head.u8(0x21); head.u8(0xff); head.u8(0x0b);
        head.str('NETSCAPE2.0');
        head.u8(0x03); head.u8(0x01); head.u16(0);   // loop count 0 = infinite
        head.u8(0x00);
      }
      chunks.push(head.done());

      return {
        addFrame: function (rgba, delayMs) {
          if (finished) return;
          const maxColors = transparent ? 255 : 256;
          const palette = medianCut(rgba, N, maxColors, transparent);
          const opaqueLen = palette.length;
          let transparentIndex = -1;
          if (transparent) { transparentIndex = palette.length; palette.push([0, 0, 0]); }

          const indices = new Uint8Array(N);
          if (dither) {
            // Floyd–Steinberg: diffuse quantization error forward in a mutable RGB copy.
            const rf = new Float32Array(N), gf = new Float32Array(N), bf = new Float32Array(N);
            for (let i = 0; i < N; i++) { rf[i] = rgba[i * 4]; gf[i] = rgba[i * 4 + 1]; bf[i] = rgba[i * 4 + 2]; }
            for (let y = 0; y < H; y++) {
              for (let x = 0; x < W; x++) {
                const i = y * W + x;
                if (transparent && rgba[i * 4 + 3] < 128) { indices[i] = transparentIndex; continue; }
                const r = clamp255(rf[i]), g = clamp255(gf[i]), b = clamp255(bf[i]);
                const idx = opaqueLen ? nearest(palette, opaqueLen, r, g, b) : 0;
                indices[i] = idx;
                const p = palette[idx], er = r - p[0], eg = g - p[1], eb = b - p[2];
                if (x + 1 < W) { rf[i + 1] += er * 7 / 16; gf[i + 1] += eg * 7 / 16; bf[i + 1] += eb * 7 / 16; }
                if (y + 1 < H) {
                  const d = i + W;
                  if (x > 0) { rf[d - 1] += er * 3 / 16; gf[d - 1] += eg * 3 / 16; bf[d - 1] += eb * 3 / 16; }
                  rf[d] += er * 5 / 16; gf[d] += eg * 5 / 16; bf[d] += eb * 5 / 16;
                  if (x + 1 < W) { rf[d + 1] += er / 16; gf[d + 1] += eg / 16; bf[d + 1] += eb / 16; }
                }
              }
            }
          } else {
            // Cache one nearest lookup per populated 15-bit bucket, then index every pixel.
            const cache = new Int16Array(32768).fill(-1);
            for (let i = 0; i < N; i++) {
              if (transparent && rgba[i * 4 + 3] < 128) { indices[i] = transparentIndex; continue; }
              const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
              const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
              let idx = cache[key];
              if (idx < 0) { idx = opaqueLen ? nearest(palette, opaqueLen, r, g, b) : 0; cache[key] = idx; }
              indices[i] = idx;
            }
          }

          let depth = 1;
          while ((1 << depth) < palette.length) depth++;
          if (depth < 2) depth = 2;   // LZW minimum code size is 2, so the table needs >=4 slots
          const minCodeSize = depth, tableSize = 1 << depth;

          const b = new Bytes();
          // Graphic control extension — carries the delay and (if any) the transparent index.
          const cs = Math.max(2, Math.round((delayMs || 0) / 10));   // centiseconds; <2cs floors to 10cs in many viewers
          const disposal = transparent ? 2 : 1;                       // 2 = restore to background (independent transparent frames)
          b.u8(0x21); b.u8(0xf9); b.u8(0x04);
          b.u8((disposal << 2) | (transparentIndex >= 0 ? 1 : 0));
          b.u16(cs);
          b.u8(transparentIndex >= 0 ? transparentIndex : 0);
          b.u8(0x00);
          // Image descriptor (full frame) with a local colour table.
          b.u8(0x2c);
          b.u16(0); b.u16(0); b.u16(W); b.u16(H);
          b.u8(0x80 | (depth - 1));
          for (let i = 0; i < tableSize; i++) { const c = palette[i] || [0, 0, 0]; b.u8(c[0]); b.u8(c[1]); b.u8(c[2]); }
          // Image data: min code size, then LZW bytes packaged into <=255-byte sub-blocks.
          b.u8(minCodeSize);
          const lzw = lzwEncode(minCodeSize, indices, N);
          let off = 0;
          while (off < lzw.length) {
            const take = Math.min(255, lzw.length - off);
            b.u8(take);
            for (let i = 0; i < take; i++) b.u8(lzw[off + i]);
            off += take;
          }
          b.u8(0x00);   // end of this frame's image data
          chunks.push(b.done());
        },

        finish: function () {
          if (!finished) { chunks.push(Uint8Array.from([0x3b])); finished = true; }   // trailer
          let total = 0; for (const c of chunks) total += c.length;
          const out = new Uint8Array(total);
          let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
          return new Blob([out], { type: 'image/gif' });
        },
      };
    },
  };
})(window.FM);
