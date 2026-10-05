# Audio mix and sync review

**Main snapshot:** `28104a3e83e01ac3880db3fac604a7444c7235aa`

## Source review

This maps the requested audio paths in the code. These are source observations, not runtime measurements or a claim that the user-facing result was heard.

| Area | Source and exact code excerpt | What was traced |
|---|---|---|
| Volume, mute and fades | `js/scene.js:216` — `FM.layerVolume = function (layer, t) { return layer.muted ? 0 : (layer.volume == null ? 1 : evalProp(layer.volume, t)); };` `js/scene.js:1110-1112` — `if (fi > 0 && into < fi) g = Math.max(0, into / fi);` and `if (fo > 0 && clipDur && into > clipDur - fo) g = Math.min(g, Math.max(0, (clipDur - into) / fo));` | Shared mute/keyframed-level helper and timeline-local fade multiplier; export schedules keyframed volume × fade at `js/exporter.js:619-627` — `const g = Math.max(0, FM.layerVolume(layer, sceneT) * FM.fadeMul(layer, sceneT - layer.start, clipDur));` |
| Sample rates | `js/exporter.js:479-485` — `const sampleRate = 48000, channels = 2; ... const oac = new OAC(channels, length, sampleRate);` `js/exporter.js:316` — `const out = oac.createBuffer(ab.numberOfChannels, a1 - a0, sr);` | Export mix context is 48 kHz stereo; each resampled clip buffer is created at that source buffer's `sr` before entering the mix graph. No device/browser resampling behavior was executed. |
| Long-project clock and timestamps | `js/exporter.js:1475` — `for (let f = resumeFrom; f < totalFrames; f++) {` and `js/exporter.js:1477` — `const t = start + f / fps;` `js/exporter.js:1494` — `const frame = new VideoFrame(outCanvas, { timestamp: Math.round(f * frameDurUs), duration: Math.round(frameDurUs) });` `js/exporter.js:882` — `timestamp: Math.round(off / sampleRate * 1e6)` | Video frames use frame-index/fps timing; encoded audio chunks use sample-offset/sample-rate timing. A five-minute or longer export was not run, so this does not establish absence or presence of accumulated sync error. |
| Speed and reverse mapping | `js/exporter.js:283-286` — `if (FM.isAnimated && FM.isAnimated(layer.speed)) {
      return { sr: sr, startSample: startSample, availSec: availSec, ramped: true,
               totalAdv: FM.layerSourceAdvance(layer, layer.duration),
               lenSamples: Math.max(1, Math.floor(layer.duration * sr)) };
    }` `js/exporter.js:325-326` — `const adv = FM.layerSourceAdvance(layer, i / sr);
          const posSec = layer.reversed ? (totalAdv - adv) : adv;` and `js/exporter.js:331` — `dst[i - a0] = a + (b - a) * frac;` | Export uses the source-advance integral for speed ramps and mirrors source position for reverse. Forward preview updates the media element's rate at `js/app.js:2365-2367` — `m.el.playbackRate = plan.rate;`; reverse preview builds a buffer then applies preview rate at `js/audio-play.js:175` — `const buf = reversedBuffer(audioCtx, m.audioBuffer, layer);` and `js/audio-play.js:179` — `node.playbackRate.value = pr;` |
| Muted, hidden and soloed layers | `js/exporter.js:512` — `const hiddenOrSolo = layer.visible === false || (FM.groupHidden && FM.groupHidden(layer)) || (soloActive && !layer.solo);` `js/app.js:2380-2381` — `const lvl = FM.layerVolume(layer, FM.time) * FM.fadeMul(layer, FM.time - layer.start, layer.duration);
          const vol = lvl * declickGain(layer, FM.time, m, now);` `js/app.js:2561` — `m.el.muted = FM.soloSilenced(layer) || !(FM.layerVolume(layer, FM.time) > 0);` | Traced preview mute/level gates and export visibility/solo gate. Reverse preview separately checks visibility, hidden groups and solo at `js/audio-play.js:21-26`. |
| Overlapping clips and level peaks | `js/exporter.js:824-832` — `if (peak > 1) { const lim = limitMix(rendered, 0.995); ... }` | The export performs a post-mix peak scan and applies its whole-mix limiter only when peak exceeds 1. No overlapping-tone playback or export was run to measure the audible result. |
| Audio effects and preview/export wiring | `js/exporter.js:683` — `try { chain = FM.buildAudioFxChain ? FM.buildAudioFxChain(oac, layer, from) : null; }` and `js/exporter.js:690-693` — `chain.schedule(from, to);
          gain.connect(chain.input);
          chain.output.connect(oac.destination);
          chains.push(chain);` `js/audio-fx-live.js:288` — `if (boost) { mes.connect(boost.gain); boost.gain.connect(chain.input); }` and `js/audio-fx-live.js:290-294` — `chain.output.connect(out);
      m._afxChain = chain;
      m._afxSig = sig;
      m._afxInsts = ((layer.audioFx) || []).slice();
      chain.applyAt(FM.time || 0);` `js/audio-fx.js:1578` — `FM.buildAudioFxChain = function (ctx, layer, sceneAtCtxZero) {` `js/audio-fx.js:1589-1593` — `prev.connect(u.input);
      prev = u.output;
      built.push({ u: u, inst: inst, def: def });
    });
    prev.connect(output);` | Traced effect-chain construction, live application and export scheduling for comparison. These excerpts alone do not prove the output sounds identical. |

## Execution and result

I reviewed the cited source paths only. I did not run browser playback, an audio fixture, or a short/long export on PC or iPhone. No additional specific defect is reported from this source-only pass; runtime sync, loudness and preview/export parity remain unverified.
