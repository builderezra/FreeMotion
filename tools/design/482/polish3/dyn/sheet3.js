/* #482 polish batch 3 (dynamics) — the before/after pictures for Ezra. Sound cannot be shown, so each picture shows what the
   control DOES to a sound wave: the app's OWN audio chain (FM.buildAudioFxChain in an OfflineAudioContext, exactly what the
   export and the tests render) on a made-up clip, drawn as the waveform he knows from the timeline. Nothing is mocked: every
   wave below is the output of the real Compressor / Limiter at the settings its label names.
   Injected by render3.py; defines window.__482c(id) → { contentBottom }. */
return (async function () {
  const SR = 24000, ACC = '#29d9bb', DIM = '#8b96a8', TXT = '#e9ecf3', BG = '#0f1117', CARD = '#161c28', GRID = 'rgba(255,255,255,.07)';
  async function render(fx, sig, secs) {
    const n = Math.round(SR * secs), oac = new OfflineAudioContext(1, n, SR);
    const b = oac.createBuffer(1, n, SR), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = sig(i / SR);
    if (!fx) return d;   // the untouched clip
    const src = oac.createBufferSource(); src.buffer = b;
    const chain = FM.buildAudioFxChain(oac, { audioFx: [fx] }, 0);
    chain.schedule(0, secs);
    src.connect(chain.input); chain.output.connect(oac.destination); src.start(0);
    const out = (await oac.startRendering()).getChannelData(0);
    chain.dispose();
    return out;
  }
  const inst = (type, p) => { const f = FM.audioFxRegistry.makeInstance(type); Object.assign(f.params, p || {}); return f; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // One waveform, drawn like the timeline's: min/max per column, mirrored about the middle, on a fixed 0..1 scale so two
  // waves side by side are comparable. `lines` = horizontal marks (a ceiling) as [value, label].
  function wave(data, secs, colour, opts) {
    opts = opts || {};
    const W = 358, H = opts.h || 92, dpr = 2;
    const c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr;
    c.style.cssText = 'width:' + W + 'px;height:' + H + 'px;display:block;border-radius:10px;background:' + CARD;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const mid = H / 2, amp = (H / 2 - 6);
    g.strokeStyle = GRID; g.lineWidth = 1;
    for (let s = 1; s < secs; s++) { const x = Math.round(W * s / secs) + 0.5; g.beginPath(); g.moveTo(x, 4); g.lineTo(x, H - 4); g.stroke(); }
    g.beginPath(); g.moveTo(0, mid + 0.5); g.lineTo(W, mid + 0.5); g.stroke();
    const per = data.length / (W * dpr);
    g.fillStyle = colour;
    for (let px = 0; px < W * dpr; px++) {
      let lo = 0, hi = 0;
      const a = Math.floor(px * per), b = Math.floor((px + 1) * per);
      for (let i = a; i < b; i++) { const v = data[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      const y0 = mid - Math.min(1.05, hi) * amp, y1 = mid - Math.max(-1.05, lo) * amp;
      g.fillRect(px / dpr, y0, 1 / dpr, Math.max(0.5, y1 - y0));
    }
    // [value, label, colour, 'left' | 'right' (default), dashed (default true)] — two lines close together put their labels
    // at opposite ends so they cannot overlap.
    (opts.lines || []).forEach(([v, label, colour, side, dashed]) => {
      const col = colour || '#ffce4a';
      g.setLineDash(dashed === false ? [] : [4, 3]); g.strokeStyle = col; g.lineWidth = 1.2;
      [mid - v * amp, mid + v * amp].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); });
      g.setLineDash([]); g.fillStyle = col; g.font = '600 10px -apple-system,system-ui,sans-serif';
      if (!label) return;   // unlabelled: the sheet gives a legend instead
      const ly = mid - v * amp, lx = side === 'left' ? 6 : W - g.measureText(label).width - 6;
      g.fillText(label, lx, ly - 4 < 12 ? ly + 13 : ly - 4);
    });
    return c;
  }
  function rmsOf(d, a, b) { let s = 0, n = 0; for (let i = Math.floor(a * SR); i < Math.floor(b * SR); i++) { s += d[i] * d[i]; n++; } return Math.sqrt(s / Math.max(1, n)); }
  function peakDb(d, a, b) { let p = 0; for (let i = Math.floor(a * SR); i < Math.floor(b * SR); i++) p = Math.max(p, Math.abs(d[i])); return 20 * Math.log10(Math.max(1e-9, p)); }

  function sheet(title, sub, blocks, foot) {
    document.querySelectorAll('#fm482c').forEach(n => n.remove());
    const ov = document.createElement('div'); ov.id = 'fm482c';
    ov.style.cssText = 'position:fixed;left:0;top:0;width:390px;z-index:2147483647;background:' + BG + ';color:' + TXT + ';font:14px -apple-system,system-ui,sans-serif;padding:18px 16px 16px;box-sizing:border-box';
    ov.innerHTML = '<div style="font-weight:700;font-size:21px;letter-spacing:-.2px">' + esc(title) + '</div>' +
      '<div style="color:#a8afbf;font-size:13px;line-height:1.4;margin:6px 0 12px">' + sub + '</div>';
    blocks.forEach(b => {
      const h = document.createElement('div');
      h.style.cssText = 'font-weight:700;font-size:14.5px;margin:12px 0 6px;color:' + (b.isNew ? ACC : TXT);
      h.innerHTML = b.head; ov.appendChild(h);
      if (b.note) { const n = document.createElement('div'); n.style.cssText = 'color:' + DIM + ';font-size:12px;line-height:1.35;margin:-2px 0 6px'; n.innerHTML = b.note; ov.appendChild(n); }
      const wrap = document.createElement('div');
      wrap.style.cssText = 'border-radius:12px;' + (b.isNew ? 'box-shadow:0 0 0 2px ' + ACC + ';' : '');
      wrap.appendChild(b.canvas); ov.appendChild(wrap);
      if (b.under) { const u = document.createElement('div'); u.style.cssText = 'color:' + DIM + ';font-size:11.5px;margin-top:4px;display:flex;justify-content:space-between'; u.innerHTML = b.under; ov.appendChild(u); }
    });
    const f = document.createElement('div');
    f.style.cssText = 'color:' + DIM + ';font-size:12px;line-height:1.4;margin-top:14px';
    f.innerHTML = foot || 'Drawn by the app’s own sound engine (the same one that exports). The default is today’s sound exactly — a saved project sounds the same until you move the new control.';
    ov.appendChild(f);
    document.body.appendChild(ov);
    return { contentBottom: Math.floor(ov.getBoundingClientRect().bottom) - 1 };
  }
  const secsUnder = n => { let s = ''; for (let i = 0; i <= n; i++) s += '<span>' + i + ' s</span>'; return s; };

  // A made-up clip with loud and quiet parts: a sung-ish phrase (loud), a spoken-ish phrase (quiet), a loud burst again.
  const phrase = t => {
    const env = t < 1 ? 0.75 : (t < 2 ? 0.12 : 0.6);
    const wob = 0.75 + 0.25 * Math.sin(2 * Math.PI * 3 * t);
    return env * wob * (0.7 * Math.sin(2 * Math.PI * 220 * t) + 0.3 * Math.sin(2 * Math.PI * 330 * t));
  };
  // Drum-ish: four hits, each a sharp attack decaying, over a quiet held note (the "detail").
  const drums = t => {
    const beat = t % 0.75, hit = Math.exp(-beat * 14) * 0.95;
    return hit * Math.sin(2 * Math.PI * 90 * t) + 0.06 * Math.sin(2 * Math.PI * 440 * t);
  };

  const SHEETS = {
    'compressor-output': async () => {
      const T = 3, clip = t => 0.5 * phrase(t);
      const today = await render(inst('compressor'), clip, T), down = await render(inst('compressor', { output: -6 }), clip, T), up = await render(inst('compressor', { output: 6 }), clip, T);
      return sheet('Compressor · Output', 'Turns the whole result up or down, after the squeeze. −6 dB makes the wave half as tall (clearly quieter), +6 dB twice as tall. Useful because squeezing a sound can leave it quieter or louder than you wanted.', [
        { head: 'Today — no Output control', canvas: wave(today, T, DIM), under: secsUnder(T) },
        { head: 'New — Output −6 dB (quieter)', canvas: wave(down, T, ACC), isNew: true, under: secsUnder(T) },
        { head: 'New — Output +6 dB (louder)', canvas: wave(up, T, ACC), isNew: true, under: secsUnder(T) },
      ]);
    },
    'compressor-mix': async () => {
      const T = 3, P = { threshold: -30, ratio: 10, attack: 0.003, release: 0.15, knee: 0 };
      const dry = await render(null, drums, T), full = await render(inst('compressor', P), drums, T), half = await render(inst('compressor', Object.assign({ mix: 0.5 }, P)), drums, T);
      return sheet('Compressor · Mix', 'Blends the untouched sound back in under the squeezed one (people call it “parallel compression”). The hits keep their punch, and the quiet parts between them still come up. A drum loop, squeezed hard (Threshold −30 dB, Ratio 10:1):', [
        { head: 'The drum loop, untouched', canvas: wave(dry, T, '#59647a'), under: secsUnder(T) },
        { head: 'Today — always fully squeezed (Mix 1)', note: 'The hits are flattened: every one the same height as the gaps.', canvas: wave(full, T, DIM), under: secsUnder(T) },
        { head: 'New — Mix 0.5: half squeezed, half untouched', note: 'Hits stand out again, and the quiet note between them is still lifted.', canvas: wave(half, T, ACC), isNew: true, under: secsUnder(T) },
      ], 'Drawn by the app’s own sound engine (the same one that exports). The untouched half is delayed by the few thousandths of a second the Compressor takes to look ahead, so the two line up — otherwise a blend sounds hollow. Mix starts at 1: a saved project sounds exactly as it did.');
    },
    'limiter-inputgain': async () => {
      /* #482 batch 3 review: the first version of this sheet said "the peaks are pinned at the line", and the Limiter did the
         opposite — Input gain lifted the ceiling (a kick at +24 came out at +1.6 dB, over full scale). Redrawn from the fixed
         chain, on a quiet clip WITH drum hits, because hits are what used to get through; every number printed is measured
         from the wave drawn beside it. */
      const T = 3;
      const quietClip = t => {   // mastered quiet: a sung-ish phrase with a drum hit every half second, loudest bit about -8 dB
        const beat = t % 0.5;
        return 0.16 * phrase(t) / 0.75 + 0.22 * Math.exp(-beat * 18) * Math.sin(2 * Math.PI * 80 * beat);
      };
      const today = await render(inst('limiter'), quietClip, T), p12 = await render(inst('limiter', { input: 12 }), quietClip, T), p24 = await render(inst('limiter', { input: 24 }), quietClip, T);
      const ceil = Math.pow(10, -1 / 20), dB = x => (Math.round(x * 10) / 10).toFixed(1).replace('-', '−');
      const over = d => { let n = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > 1) n++; return n; };
      const quietRise = (d) => 20 * Math.log10(rmsOf(d, 1.2, 1.8) / rmsOf(today, 1.2, 1.8));
      const k0 = peakDb(today, 0, T), k12 = peakDb(p12, 0, T), k24 = peakDb(p24, 0, T);
      if (over(p12) || over(p24)) throw new Error('the Limiter went over full scale - this sheet would lie');
      // The two lines sit 1 dB apart, too close to label inside the wave: a legend under the caption names them instead.
      const lines = [[ceil, '', '#ffce4a'], [1, '', '#ff6b6b', null, false]];
      const legend = '<div style="margin-top:8px;display:flex;flex-direction:column;gap:3px;font-size:12px">' +
        '<span><span style="display:inline-block;width:22px;border-top:2px dashed #ffce4a;vertical-align:middle;margin-right:7px"></span><b style="color:#ffce4a">Ceiling −1 dB</b> — the Limiter’s setting</span>' +
        '<span><span style="display:inline-block;width:22px;border-top:2px solid #ff6b6b;vertical-align:middle;margin-right:7px"></span><b style="color:#ff6b6b">Full volume (0 dB)</b> — past it, a phone crackles</span></div>';
      return sheet('Limiter · Input gain', 'Turns the sound up on its way into the limiter. Everything under the ceiling gets louder by the full amount; the loud parts stop at the ceiling instead of going over. The very tips can land just past the ceiling line, but never past full volume — so it never crackles.' + legend, [
        { head: 'Today — Input gain fixed at 0 dB', note: 'A quiet clip stays quiet (loudest tip ' + dB(k0) + ' dB); the limiter never touches it.', canvas: wave(today, T, DIM, { lines: lines, h: 116 }), under: secsUnder(T) },
        { head: 'New — Input gain +12 dB', note: 'The quiet middle comes up ' + dB(quietRise(p12)) + ' dB; the loud parts and the drum hits stop at the ceiling. Loudest tip: ' + dB(k12) + ' dB.', canvas: wave(p12, T, ACC, { lines: lines, h: 116 }), isNew: true, under: secsUnder(T) },
        { head: 'New — Input gain +24 dB', note: 'The quiet middle comes up ' + dB(quietRise(p24)) + ' dB, and everything else is held at the line. Loudest tip: ' + dB(k24) + ' dB — never past full volume.', canvas: wave(p24, T, ACC, { lines: lines, h: 116 }), isNew: true, under: secsUnder(T) },
      ]);
    },
    'limiter-release': async () => {
      /* #482 batch 3 review: the first version started the loud note at the very first sample, so its "Release 1 s" wave began
         far under the ceiling and swelled up — a start-up effect of the limiter, not what Release does to a loud note. Now
         there is half a second of silence first, so the only thing that differs between the two waves is Release. */
      const T = 3, burst = t => (t < 0.5 ? 0 : (t < 1.1 ? 1 : 0.35)) * Math.sin(2 * Math.PI * 330 * t);
      const today = await render(inst('limiter', { ceiling: -6 }), burst, T), slow = await render(inst('limiter', { ceiling: -6, release: 1 }), burst, T);
      const ceil = Math.pow(10, -6 / 20), own = 20 * Math.log10(0.35);
      const heldBy = d => own - peakDb(d, 1.13, 1.17), backBy = d => { for (let t = 1.13; t < T - 0.05; t += 0.05) if (own - peakDb(d, t, t + 0.04) < 0.5) return t - 1.1; return null; };
      const hs = heldBy(slow), bs = backBy(slow), ht = heldBy(today);
      return sheet('Limiter · Release', 'How quickly the limiter lets go after something loud. Short: the quieter sound after it comes straight back. Long: it comes back up gradually — smoother, less “pumping”. Half a second of silence, a loud note, then a quieter one, under a −6 dB ceiling:', [
        { head: 'Today — always 0.05 s', note: 'The loud note is held at the ceiling, and the quieter note is back at its own level at once (' + (ht < 0.5 ? 'within half a dB' : ht.toFixed(1) + ' dB down') + ').', canvas: wave(today, T, DIM, { lines: [[ceil, 'Ceiling −6 dB']], h: 110 }), under: secsUnder(T) },
        { head: 'New — Release 1 s', note: 'The loud note is held just the same. The quieter note starts ' + hs.toFixed(0) + ' dB held down and comes back up to its own level over ' + (bs == null ? 'more than a second' : 'about ' + bs.toFixed(1) + ' s') + '.', canvas: wave(slow, T, ACC, { lines: [[ceil, 'Ceiling −6 dB']], h: 110 }), isNew: true, under: secsUnder(T) },
      ], 'Drawn by the app’s own sound engine (the same one that exports). The default is today’s sound exactly. Worth knowing: the limiter starts out holding the sound down, and a long Release also slows how fast it lets go of that. So a clip that is already loud at the very moment the sound starts — the start of an export, or pressing play right after adding the Limiter — comes in quieter and swells up: at Release 1 s about 12 dB down at first and settled in under a second; at the 0.05 s default you cannot hear it. Anything quieter first, as here, and it does not happen.');
    },
  };
  window.__482c = async function (id) { return SHEETS[id] ? SHEETS[id]() : null; };
  return Object.keys(SHEETS);
})();
