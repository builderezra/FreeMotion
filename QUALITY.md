# FreeMotion — Quality System

How FreeMotion gets built to Alight-Motion parity and **stays correct without Ezra babysitting it.**
Read this first in any fresh session. The chat is disposable; **this repo is the brain.**

---

## 0. The core principle: the conversation is not the brain

Long chat sessions degrade output — relevant facts get diluted by hundreds of old tool results ("context rot"), summaries lose fidelity, and the model anchors on its own past claims. (Proof: an 8-hour session added a 19th effect while missing that the app was unusable on mobile — the #1 requirement.)

**The fix is structural, not willpower:** all durable state lives in four on-disk artifacts. Every work session and every agent starts from a *clean* context loaded only with these — does one scoped job — writes findings back — exits. No context ever accumulates rot.

| Artifact | Role |
|---|---|
| `PARITY.md` | The matrix: every AM feature × our status. "What is this and is it done?" |
| `BACKLOG.md` | Prioritized gaps + bugs. Top of the list = build next. |
| `QUALITY.md` (this) | The process + the test plan. How a cycle runs. |
| `tests/` + `CHANGELOG.md` + memory | What "working" means; what changed when. |

**For Ezra:** `/clear` and start fresh whenever a chat feels long or off. You lose nothing — these files hold the state.

---

## 1. The quality council (the bots that keep each other honest)

Every build cycle runs a panel of fresh-context agents. No single bot's word is trusted — they cross-check, ideally across different model tiers (Sonnet builders/researchers, Opus verifiers).

| Role | Job |
|---|---|
| **Builder** | Implements the top backlog item + writes its test. |
| **AM-Parity Auditor** (unbiased) | Researches the *real* Alight Motion and diffs feature-by-feature. Never told what the builder intended, so it can't be charitable. |
| **Bug Hunter** | Adversarial — tries to break it, hunts edge cases. |
| **UX / Mobile Reviewer** | The 380px phone pass + interaction feel (the gap that started all this). |
| **Verifiers ×2–3** | Independently try to *refute* every "done" claim and every reported bug. |
| **Synthesizer** | Updates `PARITY.md` / `BACKLOG.md` / `tests/`, commits. |

### Accountability rules (non-negotiable)
- A feature is **done** only when: builder says done **AND** the auditor confirms it against AM **AND** verifiers can't refute it **AND** its test passes.
- A bug is **real** only when **≥2 independent verifiers** reproduce it. (Kills false alarms.)
- Nothing merges with a red test suite.

---

## 2. The build cycle (one loop, repeatable)

```
pick top BACKLOG item
  → write/locate its test (red)
  → Builder implements
  → test goes green + whole suite stays green
  → Council: AM-Parity Auditor + Bug Hunter + UX reviewer
  → Verifiers adversarially confirm (majority vote)
  → Synthesizer: update PARITY.md (✅), remove from BACKLOG, append CHANGELOG, git commit
  → append one line to the daily digest
```

`/security-review` on anything touching API keys, files, or user data. Git history = full reversibility.

---

## 3. How you test a canvas video editor with no human

The backbone is **headless render assertions** (the pattern already proven across 30+ changes): build a synthetic scene → `FM.renderScene` into an offscreen canvas → assert on exact pixel values or DOM. Deterministic, fast, no media, no clicks. Plus:
- **DOM / computed-style assertions** (e.g. `touch-action`, responsive overflow at 380px).
- **Screenshot baselines** for visual regression (flag deltas for review).
- A self-test page (`tests/run.html`) that runs every assertion and reports pass/fail — runnable in the preview and headlessly by agents.

Tests must depend on **synthetic fixtures only** — never on personal media (the Invincible clip gets wiped; tests build their own shapes/text).

### Founding test plan (from the audit — build these alongside the features)

| Area | Method | Example assertion |
|---|---|---|
| Responsive layout at 380px (UI mobile mandate) | Built-in preview: load FreeMotion/index.html, preview_resize to 380px wide, preview_screenshot, and assert via preview_eval that no key panel overflows: document.querySelector('#inspector-panel').getBoundingClientRect().right <= window.innerWidth+1 and document.documentElement.scrollWidth <= window.innerWidth+1. | document.documentElement.scrollWidth <= 381 && inspector.getBoundingClientRect().right <= 381 (no horizontal overflow at 380px) |
| Touch-action suppression on edit surfaces | DOM/computed-style assertion in preview_eval: for each of #preview, .sb-handle, the timeline ruler and a .clip, read getComputedStyle(el).touchAction and assert it is 'none'. | getComputedStyle(document.querySelector('#preview')).touchAction === 'none' (and same for .sb-handle, .tl-ruler, .clip) |
| Audio import creates a playable audio layer | Headless state assertion: simulate the import path by calling the loader (e.g. FM.handleFiles with a synthetic File/Blob, or directly FM.makeLayer('audio',{...}) once the type exists) on FM.scene, then assert an audio-type layer exists with a duration and that exporter.buildAudioMix includes it. Verify file-input accept now contains 'audio/*'. | FM.scene.layers.some(l=>l.type==='audio') === true && document.querySelector('#file-input').accept.includes('audio') |
| Headless render of core layer types (smoke + pixel) | Build a synthetic scene: const s=FM.newScene(); s.layers=[FM.makeLayer('shape',{shape:'rect',x:100,y:100,shapeW:80,shapeH:80,fill:'#ff0000'})]; render to offscreen: const cv=new OffscreenCanvas(s.project.width,s.project.height); FM.renderScene(cv.getContext('2d'),s,0); read pixel at the shape centre. | const p=ctx.getImageData(100,100,1,1).data; p[0]>200 && p[1]<60 && p[2]<60 (red shape drew where expected) |
| Animated mask follows a moving, keyframed mask shape | After implementing keyframeable masks: build a layer with a mask whose x is keyframed (mask.x toggled via toggleProp). FM.renderScene at t=0 and t=1 into two offscreen canvases; assert the revealed (non-transparent) region's centroid x differs between the two times. | alphaCentroidX(render@t1) - alphaCentroidX(render@t0) > 50 (mask moved with its keyframes) |
| Keyframe easing curves (graph editor / bezier eval) | Headless eval: make a layer with transform.x keyframed 0→100 over t∈[0,1] with an ease-in bezier; call FM.scene-level evalProp (or render and sample the layer centre) at t=0.5 and assert the value is below the linear midpoint (50), proving the curve, not linear, is applied — and crucially with kf.bez deleted to catch the EASES-fallback bug. | valueAt(0.5) < 45 for easeIn; AND with bez removed, overshoot kf still != linear value (regression for the EASES-fallback bug) |
| Solo isolates audio (preview + export) | State/DSP assertion: build a 2-video-layer scene, set layer A solo=true, call exporter.buildAudioMix offline and inspect the contributing layers (or assert that non-soloed layers are skipped). Assert buildAudioMix only sums soloed layers when any solo is active. | contributingLayerIds(buildAudioMix(scene)) === ['A'] when A.solo===true (B excluded) |
| Volume keyframe automation | Headless: keyframe layer.volume 1→0 across the clip via toggleProp; assert animatedProps() now includes the volume container and that evalProp(volume, tEnd) ≈ 0 while at tStart ≈ 1; confirm exporter reads the evaluated (not static) gain. | evalProp(layer, 'volume', clip.start) > 0.95 && evalProp(layer,'volume',clip.end) < 0.05 |
| Project save/load round-trip | Headless: build a scene with a text + shape + keyframes, FM.storage.exportFile to get the JSON blob, parse it, FM.storage.applyScene(importedObj) into a fresh FM.scene, then deep-compare layer count, ids, and a sampled keyframe array against the original. | JSON.stringify(loaded.layers.map(l=>l.id)) === JSON.stringify(orig.layers.map(l=>l.id)) && keyframe arrays equal |
| MP4 export produces a valid file | Headless: run FM.exporter.run() on a tiny 0.5s scene at low res in the preview's JS context (it uses WebCodecs+mp4-muxer, both browser-native), capture the produced Blob, and assert it is non-empty and begins with an MP4 ftyp box signature. | blob.size > 1000 && new Uint8Array(await blob.slice(4,8).arrayBuffer()).join(',') === '102,116,121,112' (ftyp) |
| Per-pixel effects correctness (chroma key / invert / vignette-on-text bug) | Headless render-assert: (a) chroma key — green-fill shape with chromakey on green → assert centre pixel alpha≈0; (b) invert — white layer with invert → centre reads near-black; (c) vignette-on-text regression — text layer + vignette effect, assert a corner pixel darkens vs no-vignette (currently fails, guards the media-only bug). | chroma: getImageData(cx,cy).data[3] < 10; invert: r<30; vignette-text: corner luma(withVig) < luma(noVig)-10 |
| Blend mode coverage (newly added separable modes) | DOM/state: assert FM.BLEND_MODES (or the BLEND map keys) now includes 'hue','saturation','color','luminosity'; then render a red-over-blue composite with mode='luminosity' into an offscreen and assert the result hue matches blue's hue (luminosity takes luma from top, color from bottom). | FM.BLEND_MODES.includes('luminosity') && hueOf(render) ≈ hueOf(blue) within tolerance |

---

## 4. Automation (the "stop needing me" part)

A scheduled runner executes the build cycle on its own, commits each increment, and emits a short **daily digest** (what shipped, new parity %, open bugs, what's next). Ezra reviews by exception, not by watching. *Exact cadence/autonomy level is Ezra's call — see the open decision in the latest session.*

**Guardrails that make it fool-proof:**
- Tests gate every commit; red suite = no merge.
- Every increment is its own git commit (revert anything).
- The council's adversarial verification stops both false "done" and false bugs.
- The four artifacts mean any session — human or agent — can resume cold with zero context loss.

---

## 5. Scope honesty

~62% core+common parity today. Some of the 189 "missing" audited features (full 3D engine, particle systems, .obj import, ProRes) are **out of scope** for a no-build 2D-canvas PWA and should be marked **non-goals** in `PARITY.md`, not chased. Parity that matters = the core/common tiers a real creator uses.
