# ChatGPT batch 4: verified against the current code

ChatGPT read snapshot 28104a3e (v17.21) and wrote 6 reports. HEAD is still 28104a3e. The working tree has the other
session's uncommitted v17.22 work in `index.html`, `js/compositor.js`, `js/inspector.js`, `js/fx-registry.js`,
`js/fx-thumbs.js` and `js/collab-core.js`. Every other file cited below (`sw.js`, `js/scene.js`, `js/captions.js`,
`js/canvas-edit.js`, `js/ai*.js`, `js/exporter.js`, `js/audio-*.js`, `tools/ship.sh`) has no diff against HEAD, so its
line numbers are exact. The compositor.js and index.html lines below were re-read on 1 Oct and are current, but can
drift while that session works.

Nothing here was run on his iPhone. Browser runs were `tools/shot.py` (headless) for PEP-1, F1, F4 and F6. JXA
(`osascript`) reproductions were used for PEP-13, KI-1 to KI-7, CAP-1 and AMS-3. Everything else is code reading.

Sources: `preview-export-parity.md`, `keyframe-interpolation.md`, `captions-audit.md`, `ai-assistant-ops.md`,
`app-updates.md`, `audio-mix-sync.md`, all in this folder.

## For Ezra, in plain words

- **Detect speech can fail outright when the project has a silent clip.** If the first video in the project has no
  sound (stock footage, a screen recording), Detect speech says "failed" and never tries your talking clip. This
  happens on the default setting. It's the one medium item.
- **FreeMotion and Listing Kit wipe each other's offline copy.** They live on the same website address. Each time
  Listing Kit updates, it deletes FreeMotion's offline copy, so the next launch with no signal shows a browser error
  until you open it once with signal. Tapping FreeMotion's version label also switches off Listing Kit's offline copy.
  Nothing you made is lost.
- **A sudden big speed drop can shift the footage after it, and splitting the clip changes how much.** Only with a
  speed track that jumps (a hold key) from 10x or more down to 1x. Smooth speed ramps are fine.
- **Motion Blur (Footage) on its old Pixel Motion style looks very slightly softer in the preview than in the export.**
  You'd need to compare frames side by side to see it.
- **None of this explains your open bugs** (exports with no sound, audio cutting out on the phone, lag). ChatGPT's audio
  report traced the sound path and found nothing new.

---

## (1) Confirmed new issues, ranked

The builder should log these as hunt items with the tier shown, so they sort behind his own requests. None of these are
in REQUESTS.md, `audits/*.json`, or batch 1-3 VERIFIED.md. Batch 3's 18 items are still waiting in `INBOX.md:87` to be
logged; check this list against them when logging (one batch 4 row, F6, turned out to be batch 3 item 7, see section 2).

### 1. (hunt MEDIUM) Detect speech gives up on the first clip with no sound, so the talking clip is never tried
- **Ids:** CAP-1. ChatGPT's claim, held. The verifier found it is wider than reported: it also hits the DEFAULT scope.
- **Where:**
  - `js/captions.js:522`: the queue is `[src, ...every other source]` for every scope except 'source'. That includes
    the default 'clip' ("Just this caption clip", `:485-486`). `src` is `FM._capSrcId || sources[0]` (`:510-511`),
    the first video layer in scene order.
  - `js/captions.js:174-180`: `C.audioSources()` keeps every video layer with a file and never checks
    `FM.hasAudioTrack`.
  - `js/captions.js:527-533`: the loop has no per-candidate try/catch. `C.detect` throws "no decodable audio in that
    clip" (`:282-283`) when `FM.decodeAudio` returns null (`js/media.js:842-844`).
  - The throw lands in the outer catch, which toasts "Speech detection failed — the details are in Settings → Last
    error → Copy" (`js/captions.js:573`).
- **What he'd see:** with silent B-roll first in the layer list, Detect speech fails with a misleading error and the
  talking clip is skipped. A second form: the chosen clip has sound but no speech, and a later clip is silent. He then
  gets "failed" instead of the "No speech found / reads as music" explanation.
- **Reach:** two or more video/audio layers with a no-audio clip first, or after a clip that finds nothing. Silent
  B-roll under a talking clip is a normal edit. The workaround ("One audio clip…", then pick the clip) exists, but
  nothing hints at it. Reproduced in JXA with the same loop shape: the talking clip is never attempted.
- **Fix:**
  - Wrap each `C.detect(cand)` in its own try/catch. Remember the first error and continue.
  - After the loop: if any candidate returned `r.count`, commit as now. If none found speech but at least one returned
    a result, show the existing no-speech toast. Only when every candidate threw, report the first error, in plain
    words ("no sound in 'X'").
  - Cheaply drop sources where `FM.hasAudioTrack(l) === false` from the queue, and put the chosen source first only if
    it is not known-silent.
  - Keep 'source' mode single-clip, but give it a "that clip has no sound" toast instead of the generic failure.
- **Test:** use the pattern at `tests/tests.js:58299`. Two video layers (A first, B second) and a caption track, with
  scope 'project' and again 'clip'. Stub `FM.decodeAudio` to return null for A and a fake buffer for B, and
  `FM.detectSpeech` to return two segments inside the caption clip. Click `.cap-detect-btn`. Expect 2 cues, a toast
  naming B, and no "Speech detection failed" toast. Second case: A has sound and finds nothing, B decodes to null.
  Expect "No speech found in 'A'" and no failure toast. Prove it: removing the per-candidate catch must fail both.
- **Source:** `captions-audit.md`.

### 2. (hunt LOW) FreeMotion and his other apps on builderezra.github.io delete each other's offline cache
- **Ids:** AU-1 (+ AU-5, whose only reachable case is this). ChatGPT left it hypothetical. The verifier confirmed the
  other apps exist on the live origin, and found the version-chip half and the reverse direction, which matters more.
- **Where:**
  - `sw.js:44-50`: activate deletes every cache except `'freemotion-v1'` (`:47`). `caches.keys()` covers the whole
    origin, not the worker's scope.
  - `index.html:1255-1256` (the version chip): unregisters EVERY service worker registration on the origin, then
    deletes EVERY cache on it.
  - Live on the origin: `listing-kit/sw.js` (cache `listing-kit-v92`, 19 precached files) and `Claude-game-2/sw.js`
    ('Spin', cache `pr-v5`). Both run the same delete-all-but-mine on activate.
- **What he'd see:**
  - The frequent direction: Listing Kit renames its cache every release, so each Listing Kit update deletes
    `freemotion-v1`, including `index-fallback`. FreeMotion's next launch with no signal hits `sw.js:165-166` and gets
    `Response.error()` (a browser error page) until he opens it once online.
  - The rare direction: FreeMotion's activate only fires when `sw.js` changes (last at v10.69). The version chip fires
    whenever he taps it, and takes out Listing Kit's worker and its offline field-demo cache.
  - No projects are lost. They live in localStorage and IndexedDB.
- **Reach:** two of these apps in the same browser storage (Safari tabs, desktop or Android Chrome), then an offline
  launch. iOS Home Screen apps probably get separate storage, which would hide it there (not tested). No browser repro
  was run; the code paths and the live sw.js files are confirmed.
- **Fix:**
  - `sw.js` activate: delete only caches whose names start with `freemotion-` and are not `CACHE`.
  - Version chip: unregister only the registration whose scope is `new URL('./', location.href)`, and delete only
    `freemotion-` caches.
  - The reverse direction needs the same prefix filter in the listing-kit and Claude-game-2 repos. That is outside this
    repo and his call. Changing `sw.js` causes one activate and one reload on update, which is expected.
- **Test:** with the existing sw.js mock-event harness (the queue 306 tests), create caches `other-app` and
  `freemotion-old`, run activate, and expect `other-app` kept and `freemotion-old` gone. For the chip, stub
  `getRegistrations` with one FreeMotion-scoped and one `/listing-kit/` registration; expect only the first
  unregistered and `other-app` kept. Prove both by reverting to delete-all.
- **Source:** `app-updates.md`.

### 3. (hunt LOW) A hold speed key that drops sharply leaves a lasting footage offset, and a split changes it
- **Ids:** KI-7. ChatGPT named the 120 Hz table and gave no severity or numbers. The verifier measured it.
- **Where:** `js/scene.js:946-972`. `const SR = 120` at `:956`, trapezoid `acc += (prev + v) / (2 * SR)` at `:961`,
  linear lookup at `:968-971`. Preview, export and audio all share it (`js/audio-play.js:63-69`,
  `js/audio-fx-live.js:169-173`, split at `js/app.js:4924-4925`, `maxDurForSource` at `js/scene.js:1008-1015`), so
  preview and export always agree with each other.
- **What he'd see:** the sample interval that holds a hold step books the average of the two speeds, so the source
  position stays off for the rest of the clip. Worst case: 4x→1x 12.5 ms; 10x→1x 37.5 ms (1.1 frames at 30 fps);
  100x→1x 0.41 s (12 frames); 1000x→1x 4.2 s. Speed goes up to 1000x (`js/inspector.js:902`). The grid is anchored to
  `layer.start`, so splitting or head-trimming before the step changes the offset: footage after it can shift by up to
  (v1-v2)/240 s against the unsplit clip. A split is meant to be invisible. Steps UP and smooth or linear ramps are
  negligible (O(h²), well under 1 ms).
- **Reach:** needs a speed track with a HOLD key that drops by about 10x or more. Rare: ordinary ramps use smooth keys.
- **Fix:** make the integral exact at key boundaries instead of raising SR. When a key time falls inside a sample
  interval, split that trapezoid at the key: left limit on the left part (the segment's start value for a hold), the
  value at the key on the right. Exact for holds; removes the kink error for linear. Smooth ramps change by a hair but
  are not byte-identical, so say so in the release. Static-speed clips never reach this path.
- **Test:** a 2 s clip with speed keys 100 at start and 1 (hold) at start+0.5+0.4/120. Expect
  `FM.layerSourceAdvance(layer, 1.5)` within 1 ms of `100*ts + 1*(1.5-ts)` (about 0.33 s off today). Then split at
  start+0.25 and expect B's `FM.layerLocalTime` at start+1.2 to match the unsplit clip within 1 ms. Prove both by
  reverting the boundary split.
- **Source:** `keyframe-interpolation.md`.

### 4. (hunt LOW) Motion Blur (Footage), Pixel Motion style: the smear is built at 480 px in preview, 720 px in export
- **Ids:** PEP-1. ChatGPT's claim held, but its mechanism ("flow detail differs") was wrong. The verifier measured it.
- **Where:** `js/compositor.js:13354` `const WW = Math.min(FM._exporting ? 720 : 480, W)`. Called from
  `drawContentMotionBlur` (`js/compositor.js:16442/16469`) with the PROJECT width, so every project wider than 480 takes
  the 480 path in preview whatever the preview size. The flow field itself (`_mfField`, `:12285`) is 160 px wide in
  both modes, so the motion vectors match. What differs is the smear layer's resolution (stretched 2.25x vs 1.5x), and
  `len` is in working pixels, so the 0.8 static cutoff and the `(len-0.8)/1.2` ramp (`:13371/:13387`) sit at different
  real speeds.
- **What he'd see:** the preview smear is slightly softer than the export. Measured at 1080x1080, Drift 600 px/s,
  Amount 1: mean 0.26/255, 1.4% of pixels more than 8 levels apart, 65 px more than 32 apart. At Amount 0.5 and 0.25,
  4-5k px more than 8 apart. Control (export vs export) was 0/0. v2.49's POLISH-LOG line said "identical in export".
- **Reach:** style 0 only. Smear has been the default since v12.94, so this hits Pixel Motion picked by hand, and
  motionflow layers saved before v12.94 with no style key.
- **Fix:** one working width for both. Either 720 in preview while paused (keep 480 only while playing, the same trade
  the playback tier already makes), or always `min(720, W)` if a phone can afford about 2.25x the pixel loop. Measure
  ms/frame on a 1080 clip first, because #202 (lag) is open. At minimum, express the cutoff and the ramp in flow units
  (`len * F.FW / WW`) so which pixels count as moving matches.
- **Test:** the probe scene (text, Drift 600 px/s, motionflow style 0, Amount 0.5), three frames into a 1080x1080
  canvas with `FM._exporting` false then true. Max channel difference 2 or less. Control: style 1 must already be
  identical. Prove by mutating the export side back to 480.
- **Source:** `preview-export-parity.md`.

### 5. (hunt LOW) Dragging the rotate handle across the left of the pivot makes the rotation box jump by 360
- **Ids:** KI-1 (adjacent). Verifier-found. ChatGPT's own KI-1 claim (keys interpolate as raw degrees) was wrong.
- **Where:** `js/canvas-edit.js:682`
  `drag.startRot + (Math.atan2(p.y - drag.cy, p.x - drag.cx) - drag.startAngle) * 180 / Math.PI`, with no unwrap.
- **What he'd see:** the layer looks right, and every key shifts together so motion is unchanged. But the Move &
  Transform rotation box jumps mid-drag, for example 260 instead of -100. It matters only if he then keys a new
  rotation against it, which would spin the long way. JXA: grabbing at 170° and dragging to 190° gives -340, not +20.
- **Reach:** any rotate drag that crosses the point straight left of the pivot. Common gesture, rare consequence.
- **Fix:** wrap each pointermove's angle step into (-180, 180] and accumulate it, the way the pinch path does at
  `js/canvas-edit.js:573`.
- **Test:** pivot at canvas centre, press the rotate handle at 170°, move to 190° in 2° steps. Expect rotation to
  change by about +20 and never jump by more than one step between moves. Control: 10° to 30° also gives +20.
- **Source:** verifier, from `keyframe-interpolation.md`.

### 6. (hunt LOW) ship.sh's cache-buster gate misses every `?v=` file that isn't js/*.js or the two stylesheets
- **Ids:** AU-7 residual. The cache-first contract is by design (#112); only the gap in its enforcement is new.
  Tooling, not app code. It has never fired.
- **Where:** `sw.js:92-96` and `:185` serve any same-origin `?v=` URL from cache with no revalidation. The ship.sh gate
  (`tools/ship.sh:402/453`, auto-bump at `:435-447`) only matches `^(js/.*\.js|styles\.css|theme-glass\.css)$`. Not
  covered: `vendor/mp4-muxer.js?v=`, `manifest.json?v=2` (`index.html:44`), `apple-touch-icon.png?v=2` and
  `icon-192.png?v=2` (`index.html:61-62`), `brand-wordmark-m.png?v=1` (`index.html:682`, `styles.css:6802-6876`) and
  `fx-art/<key>.jpg?v=1` (`js/fx-thumbs.js:56`).
- **What he'd see:** if a future release edits one of those files without bumping its `?v=`, an installed copy keeps
  the old muxer, effect thumbnail, wordmark or icon until the cache is cleared. Git history shows none has changed
  since it got its buster, so no one has hit it.
- **Fix:** drive the gate from the references: collect every path that appears with `?v=` in index.html, the two
  stylesheets and js/*.js (including the shared fx-art constant); if one is changed and its `?v=` is unchanged from
  HEAD, auto-bump or refuse. Batch 1's sound-bundling note (`../VERIFIED.md:276-277`) needs this too.
- **Test:** a gate self-test in a temp worktree: change `vendor/mp4-muxer.js`, an `fx-art/*.jpg` and the wordmark
  without touching their references; the gate must name each one. Control: a changed `js/app.js` is still caught.
  Prove by reverting the widened regex.
- **Source:** verifier, from `app-updates.md`.

### Do any of these explain one of his open bugs?

No. Checked one by one:
- **Exports with no sound (#215, #604, #677):** nothing in batch 4 touches the encoder or muxer path where those live.
  `audio-mix-sync.md` traced the export mix (AMS-1, 5, 6, 7) and every gate agrees with preview. AU-1 cannot affect an
  export.
- **Audio cutting out on the phone (#663, #845):** AMS-4 and AMS-7 confirm the forward preview runs the media element
  under the sync controller and the live effect chain matches the export by test. PEP-12's 45 ms dead band is jitter,
  not a cutout. No new cause.
- **Lag (#202):** no new cause. Item 4's simplest fix (720 in preview) would add cost, so it must be measured against
  #202 before shipping.
- **Captions drifting:** CAP-1 is about detection, not timing. The only timing item is item 3, and only for footage
  after a sharp hold speed drop that has been split. It could put speech out of step with its captions there, but that
  is not the drift he has reported.

---

## (2) Already known

| Id | Title | Known as |
|---|---|---|
| F6 | Director, Refine and critic deleteLayer adds its own undo step | **Batch 3 item 7 (U22)**, waiting in `INBOX.md:87` to be logged. ChatGPT called the Director paths clean; the verifier re-proved the split. Don't log twice. F7's cancel-path edge is batch 3 item 7's second fix |
| PEP-2 | A previewed, un-added effect is left out of the export | queue 729 / hunt HIGH #12, v15.23. By design |
| PEP-3 | A video still seeking shows its last frame in preview; export drops the layer | #13, #22, #15, queue 47, queue 690. Optional: the queue 47 toast says frames "repeat", but at readyState 1 the layer is absent. Reword the toast (unverified on a real element) |
| PEP-4 | Reduced-scale preview draws px effects at a different scale | plateScale trade-off, largely superseded by #691 `pxToPlate`. Also happens while paused on a dpr-1 PC, not only during playback |
| PEP-5 | Typing cue, onion skin, guides, handles are preview-only | queue 690. By design |
| PEP-6 | Isolate is preview-only | queue 690 HUNT-d. By design |
| PEP-7 | Crop being edited shows full frame in preview | queue 690, test at `tests/tests.js:88867` |
| PEP-8 | Playhead on a clip's end steps back 1e-4 s in preview only | queue 549, tests at `tests/tests.js:7511` and `:47327` |
| PEP-9 | Blend modes have no preview/export branch | No defect |
| PEP-11 | Animated effects sampled at preview frame times | Inherent to real-time preview |
| PEP-12 | Forward clip audio: element in preview, offline mix in export | queue 916 tests; by design |
| KI-5 | Keys exactly on a split | audits/938-hunt.json, queue 690 and 818 |
| F5 | Per-op validation is sound | #2, #10, #11, 690, 695, 733, 856 |
| F7 | Garbage or partial model output is handled | queue 690, test at `tests/tests.js:93184` |
| F8 | API key only goes in the x-api-key header | `js/ai-key.js:1-8`, the one-host test at `tests/tests.js:~72009`, queue 930 |
| AU-2 | Update on launch, reload once, deferred during live collab | queue 112/306, 921 S0/S2 |
| AU-3 | Network-first navigations, offline wording | queue 690 HUNT-d (audits/941-hunt.json), queue 306 |
| AU-4 | Versioned assets cache-first | queue 112 |
| AU-5 | A never-cached asset fails offline | Deliberate (`sw.js:21-24`, `:191-193`); the reachable case is item 2 |
| AU-6 | Pruning only touches paths the page names | queue 430. Tiny orphan leak, nothing superseded yet |
| AU-7 | Changed file with unchanged `?v=` served stale | queue 112 contract + the ship.sh gate. The residual gap is item 6 |
| AMS-1 | Volume, mute and fades share one helper | #6/#14 |
| AMS-4 | Speed and reverse audio | Reversed parity already fixed (`js/audio-play.js:59-62`); queue 916 clause 4 |
| AMS-5 | Muted, hidden, soloed gates | #14, queue 215, queue 690 |
| AMS-6 | Export limiter on overlap | queue 690 / 604, audits/934-hunt.json |
| AMS-7 | Audio-effect chain preview = export | queue 690, #986, #482 batch 3 |

---

## (3) Wrong, or not a defect

| Id | Claim | Why it doesn't hold |
|---|---|---|
| KI-1 | Rotation keys should interpolate the short way | Raw degrees is deliberate (AE and Alight Motion do the same) and makes 0→720 two turns. Drags shift every key together, so the app doesn't make a 350/10 pair by accident. Its neighbour, the drag seam, is item 5 |
| KI-2 | Colour keys blend in sRGB and look muddy | Industry default. Changing it alters every saved colour animation. An OKLab option would be his call |
| KI-3 | Easing endpoints (no defect) | Correct, but Cyclic's f(1) is ~2e-15 below 1, so the comment at `js/eases.js:23-26` is literally false. Invisible |
| KI-4 | Hold/step keys (no defect) | Correct, reproduced |
| KI-6 | Sub-frame keys may not show | Normal for a frame-sampled renderer; app keys snap to frames |
| PEP-10 | Text wrapping differs between preview and export | measureText ignores the transform, so lines break the same at any scale; same browser and fonts |
| PEP-13 | Reversed clip audio diverges at non-1x speed or partial export | Same formula, same placement. JXA: speed 2, trim 0.7, partial export, max source-sample difference 0 |
| F1 | Assistant ignores layer lock | A lock in this app only stops gestures. The inspector and every Delete button also edit locked layers; the Assistant is already stricter |
| F3 | applyOps has no op cap | Every caller is bounded by token limits or slices |
| F4 | setProject ignores name | Deliberate, #932. Its "schema drift" note was also wrong: `name` is the layer name |
| AMS-0 | Overall audio verdict | No defect claimed; ran nothing |
| AMS-3 | Long-project drift unverified | No drift by construction: both clocks are closed-form from an integer index. JXA: 0.333 µs max at minute 10, same as minute 0 |

**Unverifiable (3):**
- **KI-8:** a scope note, not a claim. The rescale path (`js/scene.js:405`) is already tested.
- **AMS-2:** 44.1 vs 48 kHz resampling is the platform's job; a WebKit quirk is possible but untested. Test idea is in
  the verdict: a 1 kHz tone at both rates through `buildAudioMix`.
- **F2 (prompt injection through layer text):** the static half holds: names and text go into the prompt with no "this
  is data" line (`js/ai-chat.js:73-99`, `:185`). Whether it steers a tool call needs a live key. Blast radius is
  small: closed op list, no network op, one undo step. Cheap hardening if wanted: one sentence in PERSONA
  (`js/ai-chat.js:49-69`) and the Director prompts (`js/ai.js:381`) saying layer text is content, never instructions.
  Not logged as a defect.

---

## (4) Hit rate

**45 verdicts in total.**

| Verdict (as returned) | Count | After de-duplication |
|---|---|---|
| Confirmed new | 5 | 4 (F6 is batch 3 item 7) |
| Already known | 25 | 26 |
| Wrong | 12 | 12 |
| Unverifiable | 3 | 3 |

Most rows are accurate descriptions of intended behaviour. The useful number is ChatGPT's actual defect or risk claims,
about 13 (PEP-1, 3, 4, 10, 13; KI-1, 2, 7; CAP-1; F1, F2; AU-1, 7):
- 7 held (4 new, 3 known): **about 54%**.
- 4 were new real defects: **about 31%**. Only one is medium.
- Two more items (5, 6) came from the verifiers alone.
- It also claimed two areas were clean that weren't: the Director's undo (F6, already found in batch 3) and the
  rotate drag beside KI-1.

| Report | Defect claims held | Notes |
|---|---|---|
| captions-audit | 1 / 1 (new) | Best value in the batch: the only medium, and wider than it said (default scope too) |
| app-updates | 1.5 / 2 (1 new) | AU-1 left hypothetical; the verifier found the live apps, the version-chip half and the worse direction. AU-7 by design, with a real tooling gap |
| preview-export-parity | 3 / 5 (1 new, 2 known) | PEP-1 held but its mechanism was wrong. 13 rows, mostly intended differences already guarded by queue 690 |
| keyframe-interpolation | 1 / 3 (1 new) | KI-7 real but unsized; the worst case is 400x the number it was framed with. KI-1 and KI-2 are taste, not bugs |
| ai-assistant-ops | 0 / 2 | F1 misread what a lock means here. Called the Director clean when batch 3 had already proved it isn't |
| audio-mix-sync | 0 claimed | Traced well and ran nothing. Contributes nothing actionable, and nothing on his audio bugs |

**Compared with batches 1-3:**

| Batch | Claims held | New real defects | Medium or above |
|---|---|---|---|
| 1 | 11 / 11 (100%) | 11 | 1 |
| 2 | 18 of its own held; 4 wrong (47 rows) | 19 distinct (15 of its 18 low) | 1 (from the verifiers) |
| 3 | about 26 / 55 (47%) | 18 (33%) | 2 |
| **4** | **about 7 / 13 (54%)** | **4 (31%)** | **1** |

The rate per claim is steady, but the yield is falling: 4 new defects from 45 rows, against 18 from 99 and 19 from 47.
The patterns are the same as before: citations reliable, severity unreliable (KI-7 given none, AU-1 left hypothetical,
CAP-1 under-scoped), reach weak, and it never runs code. The areas left are ones where earlier queue 690 hunts already
went, so most rows land as "already known".

---

## (5) More batches?

**Recommendation: narrow, then stop if the next batch yields under 3 new defects.**

Why:
- His open bugs (no-sound exports, audio cutting out, lag) depend on a real device and a real file. ChatGPT can't run
  code, and two batches of audio tracing have found nothing on them. Don't send it more audio or export work.
- Each batch costs a full verify pass, roughly as much Claude work as the hunt itself, and batch 4 returned 4 low or
  medium items for 45 verdicts.
- What still pays is a narrow question with a shape a code reader can answer: "find every loop where one throw stops
  the rest" (CAP-1's shape) or "find every value with no guard between input and render". Each job should say: list
  only defect claims, give the input that triggers it, and check `REQUESTS.md` and the four VERIFIED.md files first.

Five narrow job lines (all read-only, report-only):

1. **One throw stops the rest:** every `for … of` / `forEach` over user items with an `await` inside in `js/` (multi-file
   import, relink, thumbnails, backup restore, template fill, batch export). For each: does one failing item abort the
   others, and what toast does he see? CAP-1's shape.
2. **Re-entry while a job awaits:** every busy flag or `jobWrapped` in app.js, exporter.js, audio-tools.js, captions.js
   and ai.js. A double tap, and a project switch mid-await: which project does each late write land in?
3. **Geometry degeneracies:** `js/motion-path.js`, `js/masks.js`, `js/point-edit.js`, `js/tracker.js` with
   zero-length paths, coincident points, a zero vector normalised, a one-point mask. Name any NaN that reaches render
   or save, with the input.
4. **Text editor input edges:** `js/text-edit.js` with IME composition, emoji and surrogate pairs at the cursor,
   backspace over a selection, multi-line paste, and undo during composition. Say what lands in `layer.text`.
5. **Old build, new data:** what `js/storage.js` load and the sanitisers do with fields, effect ids and audio-fx/sfx
   ids written by a NEWER build, and what a read-modify-write then drops (batch 3's STW-5 wrinkle).
