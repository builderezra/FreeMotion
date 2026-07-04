/* FreeMotion — Motion / Head tracker.
 * The user taps the head (or any feature) on the canvas; we template-match that patch across every
 * frame of the clip (no ML, works offline on iOS), then write x/y keyframes so the layer FOLLOWS it
 * — keeping the tapped point pinned where it started. The keyframes are ordinary keyframes, so you
 * can drag/adjust them afterwards for touch-ups. It won't always be perfect, hence the seed tap +
 * editable result. Runs on a downscaled frame cache; block-match is coarse→fine with a template
 * that adapts slowly and a velocity fallback when the match gets weak (occlusion / motion blur).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  let overlay = null, bar = null, seedBox = null, picking = null;

  const preview = () => document.getElementById('preview');

  // ---- geometry: canvas/project ↔ layer-content(media px) (ignores skew/Z — fine for a point seed) ----
  function geom(layer, t) {
    const tr = layer.transform, sc = FM.evalProp(tr.scale, t) || 1e-6;
    const sz = FM.layerSize(layer);
    return {
      x: FM.evalProp(tr.x, t), y: FM.evalProp(tr.y, t),
      scX: (sc * (tr.scaleX != null ? FM.evalProp(tr.scaleX, t) : 1)) || 1e-6,
      scY: (sc * (tr.scaleY != null ? FM.evalProp(tr.scaleY, t) : 1)) || 1e-6,
      rot: (FM.evalProp(tr.rotation, t) || 0) * Math.PI / 180,
      ax: (typeof tr.anchorX === 'number') ? tr.anchorX : 0.5,
      ay: (typeof tr.anchorY === 'number') ? tr.anchorY : 0.5,
      w: sz.w, h: sz.h,
    };
  }
  function projToContent(layer, t, px, py) {   // project px → content(media) px
    const g = geom(layer, t), dx = px - g.x, dy = py - g.y, c = Math.cos(-g.rot), s = Math.sin(-g.rot);
    const rx = (dx * c - dy * s) / g.scX, ry = (dx * s + dy * c) / g.scY;
    return { x: rx + g.w * g.ax, y: ry + g.h * g.ay };
  }
  function contentToProj(layer, t, cx, cy) {   // content px → project px
    const g = geom(layer, t), lx = g.scX * (cx - g.w * g.ax), ly = g.scY * (cy - g.h * g.ay);
    const c = Math.cos(g.rot), s = Math.sin(g.rot);
    return { x: g.x + lx * c - ly * s, y: g.y + lx * s + ly * c };
  }
  function evtToProject(e) {
    const cv = preview(), r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
  }

  // ---- grayscale frame extraction (cached per source-frame index) ----
  function grayFrom(bmp, gw, gh, scratch) {
    const c = scratch.getContext('2d', { willReadFrequently: true });
    c.clearRect(0, 0, gw, gh);
    try { c.drawImage(bmp, 0, 0, gw, gh); } catch (e) { return null; }
    let d; try { d = c.getImageData(0, 0, gw, gh).data; } catch (e) { return null; }
    const g = new Float32Array(gw * gh);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return g;
  }

  // SAD of a template (Float32 tw×th) against gray (gw×gh) placed with top-left (ox,oy).
  function sad(tpl, tw, th, gray, gw, gh, ox, oy, best) {
    let s = 0;
    for (let y = 0; y < th; y++) {
      const gy = oy + y; if (gy < 0 || gy >= gh) { s += tw * 60; if (s >= best) return s; continue; }
      const gRow = gy * gw, tRow = y * tw;
      for (let x = 0; x < tw; x++) {
        const gx = ox + x;
        s += (gx < 0 || gx >= gw) ? 60 : Math.abs(tpl[tRow + x] - gray[gRow + gx]);
      }
      if (s >= best) return s;   // early out
    }
    return s;
  }

  // Find the template's best (sub-pixel) position near (cx,cy) in the gray frame. Returns {x,y,conf}.
  function matchAt(tpl, tw, th, gray, gw, gh, cx, cy) {
    const half = tw / 2, halfV = th / 2;
    let bx = Math.round(cx - half), by = Math.round(cy - halfV);
    // coarse ±24 step 3, then fine ±2 step 1
    let best = Infinity, second = Infinity, bestX = bx, bestY = by;
    const scan = (x0, y0, R, step) => {
      for (let dy = -R; dy <= R; dy += step) for (let dx = -R; dx <= R; dx += step) {
        const s = sad(tpl, tw, th, gray, gw, gh, x0 + dx, y0 + dy, best === Infinity ? Infinity : best * 1.4);
        if (s < best) { second = best; best = s; bestX = x0 + dx; bestY = y0 + dy; }
        else if (s < second) second = s;
      }
    };
    scan(bx, by, 24, 3);
    scan(bestX, bestY, 2, 1);
    // sub-pixel: parabola in x and y around the best using neighbour SADs
    const sC = sad(tpl, tw, th, gray, gw, gh, bestX, bestY, Infinity);
    const sL = sad(tpl, tw, th, gray, gw, gh, bestX - 1, bestY, Infinity);
    const sR = sad(tpl, tw, th, gray, gw, gh, bestX + 1, bestY, Infinity);
    const sU = sad(tpl, tw, th, gray, gw, gh, bestX, bestY - 1, Infinity);
    const sD = sad(tpl, tw, th, gray, gw, gh, bestX, bestY + 1, Infinity);
    const denomX = (sL - 2 * sC + sR), denomY = (sU - 2 * sC + sD);
    const ddx = denomX > 1e-3 ? 0.5 * (sL - sR) / denomX : 0;
    const ddy = denomY > 1e-3 ? 0.5 * (sU - sD) / denomY : 0;
    const conf = second > 0 ? Math.max(0, (second - best) / second) : 0;
    return { x: bestX + half + Math.max(-1, Math.min(1, ddx)), y: bestY + halfV + Math.max(-1, Math.min(1, ddy)), sad: best, conf: conf, area: tw * th };
  }

  // ---- Ramer–Douglas–Peucker on one channel: which indices to KEEP as keyframes ----
  function rdpKeep(times, vals, keep, lo, hi, tol) {
    if (hi <= lo + 1) return;
    const t0 = times[lo], v0 = vals[lo], t1 = times[hi], v1 = vals[hi], dt = (t1 - t0) || 1e-6;
    let worst = -1, wd = tol;
    for (let i = lo + 1; i < hi; i++) {
      const pred = v0 + (v1 - v0) * (times[i] - t0) / dt;
      const d = Math.abs(vals[i] - pred);
      if (d > wd) { wd = d; worst = i; }
    }
    if (worst >= 0) { keep[worst] = 1; rdpKeep(times, vals, keep, lo, worst, tol); rdpKeep(times, vals, keep, worst, hi, tol); }
  }

  // ================= run the track =================
  FM.tracker = {
    isPicking() { return !!picking; },

    // Enter pick mode: overlay captures ONE tap → seed point + adjustable box, then Track/Cancel.
    pick(layer) {
      if (!layer || layer.type !== 'video') { if (FM.toast) FM.toast('Motion tracking works on a video/clip layer'); return; }
      const m = FM.media.get(layer.id);
      if (!m || !m.el || !m.width) { if (FM.toast) FM.toast('This layer has no trackable footage'); return; }
      this.cancel();
      picking = { layer: layer, seed: null };
      const wrap = document.getElementById('canvas-wrap');
      overlay = document.createElement('canvas'); overlay.id = 'trk-overlay';
      wrap.appendChild(overlay);
      const paint = () => {
        const cv = preview(), r = cv.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
        overlay.style.left = (r.left - wr.left) + 'px'; overlay.style.top = (r.top - wr.top) + 'px';
        overlay.style.width = r.width + 'px'; overlay.style.height = r.height + 'px';
        const dpr = window.devicePixelRatio || 1;
        overlay.width = Math.round(r.width * dpr); overlay.height = Math.round(r.height * dpr);
        const g = overlay.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
        if (picking && picking.seed) {
          const k = r.width / cv.width;
          const sp = contentToProj(layer, FM.time, picking.seed.x, picking.seed.y);
          const bx = sp.x * k, by = sp.y * k, hw = (picking.boxPx || 60) * k / 2;
          g.strokeStyle = '#29d9bb'; g.lineWidth = 2; g.strokeRect(bx - hw, by - hw, hw * 2, hw * 2);
          g.fillStyle = '#29d9bb'; g.beginPath(); g.arc(bx, by, 3, 0, 6.2832); g.fill();
        }
      };
      picking._paint = paint; paint();
      overlay.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const pj = evtToProject(e);
        picking.seed = projToContent(layer, FM.time, pj.x, pj.y);
        picking.seedT = FM.time;
        picking.boxPx = Math.round(Math.max(40, Math.min(m.width, m.height) * 0.16));
        paint(); showBar();
      });
      showBar();
      window.addEventListener('resize', paint);
      picking._onResize = paint;
    },

    cancel() {
      if (overlay) { overlay.remove(); overlay = null; }
      if (bar) { bar.remove(); bar = null; }
      if (picking && picking._onResize) window.removeEventListener('resize', picking._onResize);
      picking = null;
    },

    // Track the seeded point across the clip and write x/y keyframes.
    async track(layer, seed, seedT, boxContentPx, onProgress) {
      const m = FM.media.get(layer.id);
      if (!m || !m.el) return false;
      const P = FM.scene.project, fps = P.fps || 30;
      // downscaled frame cache to run the matcher on (fast, offline)
      await FM.buildFrameCache(m, Math.min(fps, 30), null, { maxDim: 480, maxBytes: 96 * 1024 * 1024 });
      const fc = m.frameCache; if (!fc || !fc.count) return false;
      // cache frames are stored at (fc.w × fc.h); content(media) px → cache px by this ratio
      const cw = fc.w || (m.width), ch = fc.h || (m.height);
      const rx = cw / m.width, ry = ch / m.height;
      const scratch = document.createElement('canvas'); scratch.width = cw; scratch.height = ch;
      const grayCache = {};
      const grayAt = (idx) => {
        if (grayCache[idx]) return grayCache[idx];
        const bmp = fc.frames[idx]; if (!bmp) return null;
        const g = grayFrom(bmp, cw, ch, scratch);
        grayCache[idx] = g; return g;
      };
      const idxForTime = (t) => {
        const local = FM.layerLocalTime(layer, t); if (local == null) return -1;
        let i = Math.round(local * (fc.effFps || fc.fps)); return i < 0 ? 0 : i >= fc.count ? fc.count - 1 : i;
      };

      // build the timeline-frame list across the clip
      const t0 = layer.start, t1 = layer.start + layer.duration - 1e-6, frames = [];
      for (let t = t0; t <= t1; t += 1 / fps) frames.push(FM.snapFrame(t));
      const seedIdxInList = Math.max(0, Math.min(frames.length - 1, Math.round((FM.snapFrame(seedT) - t0) * fps)));

      // seed template (cache px)
      const tw = Math.max(16, Math.round(boxContentPx * rx) | 1), th = tw;
      const seedGray = grayAt(idxForTime(frames[seedIdxInList]));
      if (!seedGray) return false;
      let template = new Float32Array(tw * th);
      const scx = seed.x * rx, scy = seed.y * ry;
      (function seedTpl() {
        const ox = Math.round(scx - tw / 2), oy = Math.round(scy - th / 2);
        for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
          const gx = ox + x, gy = oy + y;
          template[y * tw + x] = (gx >= 0 && gx < cw && gy >= 0 && gy < ch) ? seedGray[gy * cw + gx] : 0;
        }
      })();
      const seedTemplate = template.slice();

      // walk outward from the seed in both directions
      const pos = new Array(frames.length);   // {cx,cy} content px per frame
      pos[seedIdxInList] = { cx: seed.x, cy: seed.y };
      const walk = (dir) => {
        let last = { x: scx, y: scy }, vel = { x: 0, y: 0 }, tpl = seedTemplate.slice();
        for (let k = seedIdxInList + dir; k >= 0 && k < frames.length; k += dir) {
          const gray = grayAt(idxForTime(frames[k]));
          if (!gray) { pos[k] = pos[k - dir] || pos[seedIdxInList]; continue; }
          const guess = { x: last.x + vel.x, y: last.y + vel.y };
          const r = matchAt(tpl, tw, th, gray, cw, ch, guess.x, guess.y);
          const good = r.conf > 0.06 && r.sad / r.area < 46;
          const nx = good ? r.x : guess.x, ny = good ? r.y : guess.y;
          vel = { x: (nx - last.x) * 0.6 + vel.x * 0.4, y: (ny - last.y) * 0.6 + vel.y * 0.4 };
          last = { x: nx, y: ny };
          pos[k] = { cx: nx / rx, cy: ny / ry };
          if (good) {   // adapt the template slowly toward the current patch (appearance drift)
            const ox = Math.round(nx - tw / 2), oy = Math.round(ny - th / 2), a = 0.12;
            for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
              const gx = ox + x, gy = oy + y;
              if (gx >= 0 && gx < cw && gy >= 0 && gy < ch) { const i = y * tw + x; tpl[i] = tpl[i] * (1 - a) + gray[gy * cw + gx] * a; }
            }
          }
          if (onProgress) onProgress();
        }
      };
      walk(1); walk(-1);
      for (let k = 0; k < frames.length; k++) if (!pos[k]) pos[k] = pos[seedIdxInList];

      // convert tracked content points → layer x/y so the seed point stays pinned where it started
      const target = contentToProj(layer, seedT, seed.x, seed.y);
      const times = [], xs = [], ys = [];
      for (let k = 0; k < frames.length; k++) {
        const t = frames[k], g = geom(layer, t), p = pos[k];
        const lx = g.scX * (p.cx - g.w * g.ax), ly = g.scY * (p.cy - g.h * g.ay);
        const c = Math.cos(g.rot), s = Math.sin(g.rot);
        times.push(t); xs.push(Math.round(target.x - (lx * c - ly * s))); ys.push(Math.round(target.y - (lx * s + ly * c)));
      }
      // simplify jointly (union of x & y RDP keeps) → sparse, EDITABLE keyframes
      const keep = new Array(frames.length).fill(0);
      keep[0] = keep[frames.length - 1] = 1;
      rdpKeep(times, xs, keep, 0, frames.length - 1, 1.6);
      rdpKeep(times, ys, keep, 0, frames.length - 1, 1.6);
      const kfX = [], kfY = [];
      for (let k = 0; k < frames.length; k++) if (keep[k]) {
        kfX.push({ t: times[k], v: xs[k], e: 'easeInOut' });
        kfY.push({ t: times[k], v: ys[k], e: 'easeInOut' });
      }
      if (kfX.length < 2) return false;
      layer.transform.x = { kf: kfX };
      layer.transform.y = { kf: kfY };
      if (FM.history) FM.history.commit();
      FM.requestRender(); if (FM.canvasEdit) FM.canvasEdit.update(); if (FM.timeline) FM.timeline.rebuild(); if (FM.inspector) FM.inspector.refresh();
      return kfX.length;
    },
  };

  function showBar() {
    if (bar) bar.remove();
    bar = document.createElement('div'); bar.id = 'trk-bar';
    const msg = document.createElement('span');
    msg.textContent = picking && picking.seed ? 'Tracking point set — Track to follow it, or tap again to move it' : 'Tap the head (or any feature) to track';
    bar.appendChild(msg);
    if (picking && picking.seed) {
      const go = document.createElement('button'); go.className = 'btn btn-accent'; go.textContent = 'Track';
      go.addEventListener('click', async () => {
        const L = picking.layer, seed = picking.seed, seedT = picking.seedT, box = picking.boxPx;
        FM.tracker.cancel();
        if (FM.toast) FM.toast('Tracking…', 0);
        let done = 0; const total = Math.max(1, Math.round((L.duration) * (FM.scene.project.fps || 30)));
        try {
          const n = await FM.tracker.track(L, seed, seedT, box, () => { done++; if (done % 8 === 0 && FM.toast) FM.toast('Tracking… ' + Math.min(99, Math.round(done / total * 100)) + '%', 0); });
          if (FM.hideToast) FM.hideToast();
          if (FM.toast) FM.toast(n ? ('Tracked — ' + n + ' keyframes added, drag them to touch up') : 'Could not track — try a more distinct point', 3500);
        } catch (e) { if (FM.hideToast) FM.hideToast(); if (FM.toast) FM.toast('Tracking failed', 2500); }
      });
      bar.appendChild(go);
    }
    const cancel = document.createElement('button'); cancel.className = 'btn'; cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => FM.tracker.cancel());
    bar.appendChild(cancel);
    document.body.appendChild(bar);
  }
})(window.FM);
