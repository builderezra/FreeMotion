# Long exposure camera — the plan, before any of it is built

Ezra's request is REQUESTS.md **#212**, with a screenshot of *Slow Shutter Cam* (Cogitap, £4.99,
No.7 in Photo & Video): *"Would it be possible for you to create me a camera tool for my phone that
can do cool long exposure photography? Like this app here, if so make a plan on how ur gonna do this
and lmk if it would be better if I switched this project to my laptop for development (Mac)"*

**Short answer: yes, and most of it is genuinely doable in the browser.** The long answer is below,
because one part of it is NOT doable and the plan is shaped around that.

---

## 1. What a long exposure actually is, and what the browser will and will not give us

A camera taking a 15-second exposure holds the shutter open and lets the sensor **integrate light
over 15 seconds**. Car headlights sweep across the frame and paint a continuous streak; water
smooths into silk; a dark scene gathers enough photons to look lit.

There are two ways to get that picture:

| | how | can we? |
|---|---|---|
| **Real** | tell the camera to expose for 15 seconds | **almost certainly not on iPhone** |
| **Simulated** | take ~30 ordinary frames a second for 15 seconds and combine them | **yes** |

The real one needs `exposureTime` / `iso` on the camera track, or the `ImageCapture` API. Those are
Chrome-side APIs; Safari has historically shipped neither, which would mean **iOS Safari cannot open
the shutter for longer than its own auto-exposure decides**. I have not asserted this — `tests/_camprobe.html`
(in this commit) measures it on his actual phone and prints the answer.

**The simulation is not a cheat.** Integrating light for 15 seconds and summing 450 frames of 1/30s
each is the *same integral*, sampled discretely. It is what every long-exposure phone app does,
including the one in the screenshot. Three real differences, and they shape the modes:

- **Clipping.** A frame arrives already 8-bit and already clipped. A streetlight that blew out at
  1/30s cannot accumulate past white. Optical exposure has the same problem, so this mostly matches
  reality — but it means "brighter" has to come from *gain*, not from *more frames*.
- **Gaps between frames.** Sensor readout means we get 30 samples a second, not continuous light. A
  fast-moving light leaves a dotted streak rather than a solid line. Longer per-frame exposure closes
  the gaps; we can't set that, so a very fast subject will show beading. Acceptable — traffic and
  water, the two things people actually shoot, are slow enough.
- **Auto-exposure fighting back.** As trails build, iOS AE may darken the *incoming* frames, which
  flattens the result. If `exposureMode: 'manual'` is not available (probe will say), the mitigation
  is to lock the frame *weight* ourselves and warn in the UI. **This is the biggest quality risk in
  the whole feature** and it is a device fact, not a code decision.

---

## 2. The three modes, as maths

The reference app offers *Motion Blur / Light Trail / Low Light*. Each is one line over the frames:

| mode | operation | what it's for | precision needed |
|---|---|---|---|
| **Light Trail** | `out = max(out, frame)` | headlights, sparklers, fireworks, light painting | **8-bit is exact** |
| **Motion Blur** | `out = mean(frames)` | waterfalls, crowds, silky motion | needs float |
| **Low Light** | `out = mean(frames) × gain` | night scenes; averaging also *cancels sensor noise* | needs float |

That table is the whole engine. It also explains the build order: **Light Trail is exact in an
ordinary 2D canvas** (`globalCompositeOperation:'lighten'` is per-channel max, and max of 8-bit values
is still 8-bit — no error accumulates however many frames go in), so the most visually striking mode
is also the cheapest to ship first.

The other two are a **running average**, and averaging 450 frames in 8 bits quantises every sample to
1/255 and compounds the error — that is visible banding. They want a **half-float render target**
(WebGL2 + `EXT_color_buffer_half_float`, ping-ponged), which the probe checks for.

**Note this would be the first WebGL in the codebase** — every pixel FreeMotion draws today is 2D
canvas. That is a real cost (a second rendering path, context-loss handling) and it is why it is
phase 2, not phase 1, and why it stays sealed inside the capture screen instead of touching the
compositor.

Two more knobs from his screenshot, both trivial once the above exists:

- **Light Sensitivity (1/16 … 1/1)** — the per-frame weight. Low = each frame contributes little, so
  a bright scene can be exposed for 15s without going white. This is the control that makes daytime
  long exposure possible at all.
- **ISO / Brightness / Contrast** — post-multipliers on the finished plate. Free.

---

## 3. Where it plugs into FreeMotion

**It reuses a path that already exists and is proven.** `js/voice-rec.js` acquires the microphone,
records, wraps the result in a `File`, and hands it to *the same importer an imported song goes
through* — `FM.loadVideoFile(file)` → `FM.addMediaLayer(rec)`. Nothing downstream knows it was
recorded rather than imported.

The camera does exactly that with a still:

```
getUserMedia({video})  →  accumulate frames  →  canvas.toBlob('image/jpeg')
                       →  new File(...)  →  FM.loadImageFile(file)  →  FM.addMediaLayer(rec)
```

So the photograph lands **in the media library, in IndexedDB, as an ordinary image layer** — it
trims, keyframes, takes effects and exports like anything else, with no new storage code.

- **New file:** `js/longexp.js` — the sheet, the engine, the seam for tests. Self-contained, in the
  same shape as `voice-rec.js`.
- **One tile:** in the add menu's **Media** tab (`js/addmenu.js`, beside Import / Sample clip / AI
  Scene), calling `FM.longExp.open()`, with the same `else FM.toast(...)` guard voice recording uses.
- **`index.html`:** one `<script>` with a `?v=`, the version label bumped, one POLISH-LOG line.

**Naming, deliberately.** This app already has a "camera" — the 3D scene camera, with parallax and
its own composite-level transform. Calling the new thing "Camera" would collide in the UI, in the
code and in every future conversation. It is **"Long exposure"** everywhere.

---

## 4. What it looks like on the phone

1. Tap **Long exposure** in Media. Full-screen live viewfinder, portrait, safe-area aware.
2. Mode segmented control: **Light Trail · Motion Blur · Low Light**. Duration dial (1s … 60s).
   Light Sensitivity slider. Everything one-handed and thumb-reachable — the bottom third.
3. Big shutter button. Tap to start; **the preview becomes the exposure as it builds**, which is the
   entire magic of this kind of app — you watch the trails draw themselves. Tap again to stop early,
   which is how you actually judge a long exposure.
4. Result screen: the plate, with Brightness / Contrast, **Retake**, and **Add to project**.

Two things the reference app cannot do, which are free for us because this is an editor:

- **The build-up can be saved as a CLIP, not just a still** — each accumulated state is a frame, so
  the trails draw themselves on the timeline as a video layer. One extra `MediaRecorder` on the
  accumulation canvas; the path is already proven by `voice-rec.js` and `tests/_onevideo.html`.
- It lands **straight on the timeline**, with no trip through the Photos app.

---

## 5. Handheld is the honest problem

A long exposure taken hand-held is mush — every frame is offset by a few pixels and the "trail" is
the whole scene smearing. Slow Shutter Cam's answer is a tripod, and that is the right v1 answer:
prop the phone against something, and say so in the UI rather than pretending.

Frame alignment (estimate the inter-frame shift, translate before accumulating) is real and doable,
but it is its own project and it is **not** in this plan. It is listed in §7 as a later phase so it
does not get silently forgotten.

---

## 6. How it gets tested without a camera

The suite runs headless with no camera and must stay that way. The seam is the one `voice-rec.js`
already uses: **one function that returns a `MediaStream`**, replaced in tests by
`canvas.captureStream()` — a real `MediaStream` with a real track, so `getSettings`, `rVFC` and
`drawImage` are all the browser's own and only the permission prompt is avoided.

That makes the maths directly assertable against a synthetic scene:

- a white dot moving left→right across a black canvas, accumulated in **Light Trail**, must produce a
  **continuous bright line** — and the dot's start pixel must be as bright at the end as it was at the
  start (that is what proves `max` and not `average`);
- the same input in **Motion Blur** must produce a **dim, even smear**, with the mean of the plate
  equal to the mean of the inputs within a tolerance (that proves the average is unbiased — the
  8-bit-banding failure shows up here as drift);
- a static grey scene with synthetic noise, in **Low Light**, must come out with **lower variance**
  than any single input frame (that is the noise cancellation being real, not asserted);
- stopping early must keep the frames already accumulated, and backgrounding the app mid-exposure
  must not produce a half-black plate.

---

## 7. Phases

| phase | what ships | risk |
|---|---|---|
| **0 — probe** ✅ *this commit* | `tests/_camprobe.html`: what his phone allows, how many frames/sec it really delivers, whether it keeps up, and a real 4-second exposure he can look at | none — no app code touched |
| **1 — Light Trail** | viewfinder, live build-up, duration, shutter, result screen, lands as an image layer. 2D canvas only, no WebGL | AE fighting the exposure (§1) |
| **2 — Motion Blur + Low Light** | WebGL2 half-float accumulator, Light Sensitivity, ISO | first WebGL in the codebase; context loss |
| **3 — the editor's advantage** | save the build-up as a video clip; freeze-composite (a sharp subject over the blurred plate); save to Photos | small |
| **4 — later, if wanted** | hand-held frame alignment | its own project |

Phase 1 is the one that answers "is this cool". If it is not, phases 2–4 should not be built.

---

## 8. Should the project move to the Mac?

**No — but get the Mac out for two specific things, and the second one matters a lot for this
feature in particular.**

Nothing about FreeMotion needs a laptop. It is vanilla HTML/CSS/JS with no build step, no framework
and no install; the phone is a perfectly good place to keep working, and I push, he pulls, as now.

What the Mac genuinely gives:

1. **Safari Web Inspector over the USB cable.** Plug the iPhone into the Mac and you get a real
   console, debugger and network panel *for the page running on the phone*. This feature is going to
   fail in exactly the ways that are invisible without one: a permission refused with a specific
   error name, a WebGL context lost on backgrounding, frames arriving at 24/sec instead of 30. On the
   phone alone, the only instrument is a screenshot. **This is the strongest argument for the Mac and
   it is specific to camera work** — most of the queue does not need it.
2. **Running the 85-file test suite locally** before pulling a build. `tests/_cdp.py` already
   hardcodes `/Applications/Google Chrome.app/...`, so the driver was written for that Mac; it just
   needs a server and one command.

What the Mac does **not** give: a useful stand-in for the camera. A webcam has fixed auto-exposure,
no rear lens, and never sees a night street. **Every real judgement about this feature has to be made
on the phone, outdoors, after dark.** The laptop is the instrument; the phone is the camera.

So: **carry on as we are, and use the Mac + cable as the debugging rig once phase 1 is on screen.**
Worth knowing the engine itself (frames in, plate out) is a pure function — it can be built and
tested against a canned video on either machine, with the camera as the last mile.

---

## 9. What this plan does NOT cover

- **Where it sits in the queue.** #212 is the newest item; the rule is oldest-first, so it waits
  behind ~20 open items unless he says otherwise. This document exists so the decision is his.
- **RAW / true manual shutter.** Not available to a web page. If long exposure turns out to be the
  thing he actually wants to build, that is an argument for a native app, and it belongs in
  LAUNCH-PLAN.md rather than here.
- **The publishing note.** A camera screen is a new screen; if any of it is modelled on Slow Shutter
  Cam's layout, it goes in BEFORE-PUBLISHING.md as it is built, per the standing rule.
