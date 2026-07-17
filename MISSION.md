# MISSION — Pro-parity features (After Effects gaps that are realistic)

Ezra's standing order (2026-07-17): build ALL eight realistic features below, one at a
time, multi-agent where it helps, adversarially bug-checked, each committed (pushable)
before moving on. **Do not stop between features to wait for approval.** He will re-prompt
if usage runs out. This file is the source of truth — after compaction, re-read it and
resume from the first feature not marked DONE.

## The per-feature pipeline (every feature follows this, no shortcuts)
1. **Recon** the exact code touchpoints (grep/read, don't guess).
2. **Build** — a Workflow: design → parallel file-owner agents (strict file ownership, no
   overlap) → the agents build against ONE embedded contract.
3. **Audit** — adversarial multi-lens review inside the same workflow (contract / regression
   / correctness / security / UI-mobile), every finding double-refuted before it counts.
4. **Fix** — apply confirmed findings (I do these directly or via a fix workflow).
5. **Verify** — in the browser at 380px: console clean, functional proof by measurement,
   clean up any test fixtures I inject (check localStorage/IndexedDB didn't keep a stray layer).
6. **Ship** — bump version label (index.html = single source of truth), POLISH-LOG entry,
   `?v=` cache-busters on every touched file, commit. Keep FX/behaviour featured lists newest-first.
7. **Update this file** — mark the feature DONE with its commit hash, then START THE NEXT ONE.

## House rules (never violate)
Vanilla HTML/CSS/JS · no framework/build/bundler/TS/npm/CDN · localStorage/IndexedDB, local-only ·
mobile-first, verify at ~380px · escape untrusted data, treat imported .fmproj as hostile · one
shared live AudioContext (FM.audioCtx). Commit locally only (Ezra pushes via GitHub Desktop); do
NOT add a "you still need to push" reminder.

## Engine facts (load-bearing)
- Prop = plain number/string OR `{kf:[{t,v,e,bez?}]}`; kf times ABSOLUTE. `FM.evalProp`, `FM.isAnimated`,
  `FM.setProp`, `FM.toggleProp`. Never `(x||1)` on a maybe-animated prop (object → NaN).
- `FM.scene.layers` FLAT; `layer.parent` id refs; groups cascade (`FM.groupDescendants`).
- Audio only on `layer.type==='video'`. `FM.media.get(id)` → `{el,file,audioBuffer?,...}`.
- `FM.jsonReplacer` strips leading-underscore props from save/history → runtime-only fields MUST be `_`-prefixed.
- Import hardening lives in `storage.js sanitizeImportedLayers`; own-property whitelists only
  (a bare `TABLE[userStr]` walks the prototype chain — real bug we already hit twice).
- Exporter renders each clip into an OfflineAudioContext; `FM.buildAudioFxChain(ctx,layer,sceneAtCtxZero)`.

## Order of attack (dependency + regression-risk ordered)
1. **Audio-reactive animation** — envelope (overall/bass/mid/treble) → bake keyframes; expose
   `FM.audioEnvelope` for the audio-drive behavior (#4 depends on it). — STATUS: DONE (v3.37, commit 50fea33).
   `js/audio-react.js`: `FM.audioEnvelope(layer,opts)→{times,values0..1}`, `FM.audioReact.bake(layer,opts)`,
   `FM.audioReact.openSheet(layer)`. Entry point = "Audio → keyframes…" in inspector vol-tools. #4 audio-drive
   reads `FM.audioEnvelope`. Band cache = `m._audioBandCache` (underscore, unsaved).
2. **Trim Paths + animated/dashed strokes + Repeater** — stroke draw-on (path length + dashoffset),
   marching dashes, shape repeater with per-copy transform. — STATUS: PENDING
3. **Transparent + GIF + image-sequence export** — self-written GIF encoder (no dep), PNG/frame
   sequence in a zip, transparent frames; true alpha video is browser-flaky, note it. — STATUS: PENDING
4. **Behaviors (expressions, packaged)** — property modifiers: Wiggle / Loop / Bounce-Overshoot /
   Follow (link to another layer/prop) / Audio-drive (reads #1's envelope). Sandbox on import. — STATUS: PENDING
5. **Particles / emitters** — new emitter layer: rate/lifetime/gravity/spread/size+opacity over
   life, sprite = a chosen layer. — STATUS: PENDING
6. **Pen masks** — multiple bezier masks per layer, Add/Subtract/Intersect modes, per-mask feather,
   animatable mask path (path keyframing is the hard part). — STATUS: PENDING
7. **True 2.5D/3D layers + camera parallax** — layer Z + X/Y/Z rotation, shared perspective camera,
   painter-sort by Z, faux DOF. Extends the existing camera rig. — STATUS: PENDING
8. **Editable motion paths on canvas (spatial keyframes)** — LAST, riskiest: position becomes a 2D
   keyframe with in/out spatial tangents; editable bezier trajectory on canvas; spatial interp +
   roving. Data-model change — guard old projects hard. — STATUS: PENDING

## Explicitly OUT (need ML/infra — do NOT attempt)
Roto Brush / AI roto · content-aware video fill · auto-reframe · scene-detect · offline
speech-to-text · ML stem separation · ray-traced 3D / volumetrics.

## Starting point
v3.36, commit 900febb, tree clean.
