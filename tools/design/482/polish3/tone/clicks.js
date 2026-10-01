/* #482 batch 3 tone review, finding 1 — does moving Fine tune while the preview plays click?
 * The live preview never rebuilds the chain for a moved value: audio-fx-live.js calls chain.applyAt(scene) every frame and
 * that is the only way a new value reaches the sound. This reproduces exactly that in an OfflineAudioContext: suspend every
 * 768 frames (16 ms, one screen frame), change the value, call applyAt, resume. The export path (schedule) is rendered too.
 * Clickiness = the largest jump in the waveform's slope (|2nd difference|) in any 2 ms window, divided by the median
 * window of the same render — a steady tone scores about 1 to 1.5; a click is a sudden slope change and scores far higher.
 * Signal: 0.3·sin(180 Hz) + 0.2·sin(470 Hz), 48 kHz, 1.5 s. */
const SR = 48000, N = Math.round(1.5 * SR), FR = 768;
const sig = i => { const t = i / SR; return 0.3 * Math.sin(2 * Math.PI * 180 * t) + 0.2 * Math.sin(2 * Math.PI * 470 * t); };
function score(d, a, b) {
  const W = 96, wins = [];
  for (let s = 0; s + W < d.length - 1; s += W) {
    let m = 0; for (let i = Math.max(1, s); i < s + W; i++) m = Math.max(m, Math.abs(d[i + 1] - 2 * d[i] + d[i - 1]));
    wins.push([s / SR, m]);
  }
  const sorted = wins.map(w => w[1]).sort((x, y) => x - y), med = sorted[sorted.length >> 1] || 1e-9;
  let worst = 0; wins.forEach(w => { if (w[0] >= a && w[0] < b) worst = Math.max(worst, w[1]); });
  return +(worst / med).toFixed(1);
}
// frames: [[sceneTime, paramsPatch], …] applied through applyAt at those times; kf = keyframed params, rendered live AND exported
async function live(params, frames, fr) {
  fr = fr || FR;
  const oac = new OfflineAudioContext(1, N, SR), b = oac.createBuffer(1, N, SR), d = b.getChannelData(0);
  for (let i = 0; i < N; i++) d[i] = sig(i);
  const src = oac.createBufferSource(); src.buffer = b;
  const fx = [{ type: 'pitch', enabled: true, params: Object.assign({ semitones: 0, cents: 0, mix: 1 }, params) }];
  const chain = FM.buildAudioFxChain(oac, { audioFx: fx }, 0);
  chain.applyAt(0);
  // every frame of the render calls applyAt, as the preview does — a patch (a moved slider) lands just before its frame
  for (let k = 1; k * fr < N; k++) {
    const t = k * fr / SR, patch = frames.filter(f => Math.abs(f[0] - t) < 1e-6)[0];
    oac.suspend(t).then(() => { if (patch) Object.assign(fx[0].params, patch[1]); chain.applyAt(t); oac.resume(); });
  }
  src.connect(chain.input); chain.output.connect(oac.destination); src.start(0);
  const r = await oac.startRendering(); try { chain.dispose(); } catch (e) {}
  return r.getChannelData(0);
}
async function exp(params) {
  const oac = new OfflineAudioContext(1, N, SR), b = oac.createBuffer(1, N, SR), d = b.getChannelData(0);
  for (let i = 0; i < N; i++) d[i] = sig(i);
  const src = oac.createBufferSource(); src.buffer = b;
  const fx = [{ type: 'pitch', enabled: true, params: Object.assign({ semitones: 0, cents: 0, mix: 1 }, params) }];
  const chain = FM.buildAudioFxChain(oac, { audioFx: fx }, 0);
  chain.schedule(0, N / SR);
  src.connect(chain.input); chain.output.connect(oac.destination); src.start(0);
  const r = await oac.startRendering(); try { chain.dispose(); } catch (e) {}
  return r.getChannelData(0);
}
const T0 = 0.256, out = {};   // the drag starts on a frame boundary (20 frames of 768 = 0.32 s; 0.256 s = 16 frames)
const drag = []; for (let k = 0; k <= 30; k++) drag.push([T0 + k * FR / SR, { cents: 2 * k }]);
out.steady = score(await live({ cents: 30 }, []), 0.25, 1.4);
out.drag0to60 = score(await live({}, drag), 0.25, 0.9);
out.step30to31 = score(await live({ cents: 30 }, [[T0, { cents: 31 }]]), 0.25, 0.4);
out.leave0to1 = score(await live({}, [[T0, { cents: 1 }]]), 0.25, 0.4);
const semi = await live({}, [[T0, { semitones: 1 }]]);
out.semiStep0to1 = score(semi, 0.25, 0.4);
// 6 ms of the waveform either side of that step, for the picture (tone/sheet.js 'pitch-finetune-drag')
const i0 = Math.round(T0 * SR);
out.snipSemi = Array.from(semi.slice(i0 - 288, i0 + 288)).map(x => +x.toFixed(5));
const fine = await live({}, drag);
out.snipDrag = Array.from(fine.slice(Math.round(0.53 * SR), Math.round(0.53 * SR) + 1440)).map(x => +x.toFixed(5));
// both keys moved in the same frame (a Reset, an undo), and a drag on a 120 Hz screen (8 ms frames, faster than the ramp)
out.bothAtOnce = score(await live({ semitones: 2, cents: 40 }, [[T0, { semitones: -1, cents: -30 }]]), 0.25, 0.4);
const drag120 = []; for (let k = 0; k <= 60; k++) drag120.push([T0 + k * 384 / SR, { cents: k }]);
out.drag120Hz = score(await live({}, drag120, 384), 0.25, 0.9);
const kfC = { cents: { kf: [{ t: 0.25, v: 0 }, { t: 0.75, v: 60 }] } };
out.kfCentsPreview = score(await live(kfC, []), 0.25, 0.8);
out.kfCentsExport = score(await exp(kfC), 0.25, 0.8);
const kfS = { semitones: { kf: [{ t: 0.25, v: 0 }, { t: 0.75, v: 1 }] } };
out.kfSemiPreview = score(await live(kfS, []), 0.25, 0.8);
out.kfSemiExport = score(await exp(kfS), 0.25, 0.8);
return out;
