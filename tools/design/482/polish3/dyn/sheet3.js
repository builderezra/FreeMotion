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
    (opts.lines || []).forEach(([v, label]) => {
      g.setLineDash([4, 3]); g.strokeStyle = '#ffce4a'; g.lineWidth = 1.2;
      [mid - v * amp, mid + v * amp].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); });
      g.setLineDash([]); g.fillStyle = '#ffce4a'; g.font = '600 10px -apple-system,system-ui,sans-serif';
      const ly = mid - v * amp; g.fillText(label, W - g.measureText(label).width - 6, ly - 4 < 12 ? ly + 13 : ly - 4);
    });
    return c;
  }
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
      const T = 3, quietSong = t => 0.35 * phrase(t) / 0.75;   // a clip mastered quiet: its loudest bit reaches about a third of full
      const today = await render(inst('limiter'), quietSong, T), push = await render(inst('limiter', { input: 12 }), quietSong, T);
      const ceil = Math.pow(10, -1 / 20);
      return sheet('Limiter · Input gain', 'Pushes the sound INTO the ceiling: everything gets louder, and the peaks are pinned at the line instead of clipping. The way to make a quiet clip loud without it crackling.', [
        { head: 'Today — Input gain fixed at 0 dB', note: 'A quiet clip stays quiet; the limiter never touches it.', canvas: wave(today, T, DIM, { lines: [[ceil, 'Ceiling −1 dB']] }), under: secsUnder(T) },
        { head: 'New — Input gain +12 dB', note: 'Turned up 12 dB (the wave four times as tall), and the loud parts are pinned at the ceiling line: the very tips reach ' + peakDb(push, 0.2, 0.9).toFixed(1).replace('-', '−') + ' dB, still short of full volume (0 dB), so nothing crackles.', canvas: wave(push, T, ACC, { lines: [[ceil, 'Ceiling −1 dB']] }), isNew: true, under: secsUnder(T) },
      ]);
    },
    'limiter-release': async () => {
      const T = 2, burst = t => (t < 0.6 ? 1 : 0.35) * Math.sin(2 * Math.PI * 330 * t);
      const today = await render(inst('limiter', { ceiling: -6 }), burst, T), slow = await render(inst('limiter', { ceiling: -6, release: 1 }), burst, T);
      const ceil = Math.pow(10, -6 / 20);
      return sheet('Limiter · Release', 'How quickly the limiter lets go after something loud. Short: the quiet part comes straight back. Long: it creeps back up over a second — smoother, less “pumping”. A loud note, then a quieter one, under a −6 dB ceiling:', [
        { head: 'Today — always 0.05 s', note: 'The quieter note is back to its own level almost at once.', canvas: wave(today, T, DIM, { lines: [[ceil, 'Ceiling −6 dB']], h: 110 }), under: secsUnder(T) },
        { head: 'New — Release 1 s', note: 'The quieter note starts held down and fades back up over the next second.', canvas: wave(slow, T, ACC, { lines: [[ceil, 'Ceiling −6 dB']], h: 110 }), isNew: true, under: secsUnder(T) },
      ]);
    },
  };
  window.__482c = async function (id) { return SHEETS[id] ? SHEETS[id]() : null; };
  return Object.keys(SHEETS);
})();
