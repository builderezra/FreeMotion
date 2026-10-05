# Test gaps: vetted against the current tree

ChatGPT read snapshot 28104a3e (v17.21). This vetting checked the **current** tree: `tests/tests.js` (119,431 lines, 2,281 static `test(` declarations; ChatGPT counted 2,265). For each gap I searched test names and test bodies by function name, seam (`FM._…`), item number and the error text in the code. I did not run anything in a browser. One claim was reproduced as pure logic in `osascript -l JavaScript`. Nothing was edited except this file.

## Verdict on ChatGPT's report

- **Its citations are accurate.** Every `file:line` it gave lands within one or two lines of the current code. For example, `js/app.js:5516` is now `:5517`, and `js/voice-rec.js:155-163` is now `:154-164`.
- **Its framing makes the list hard to act on.** All 25 entries are written as real-device protocols: an iPhone, the Photos picker, a real phone call. A synthetic Chrome suite can never run those as written. About half of them also contain a smaller piece the suite *can* test, and that piece is what this file ranks.
- **Its search missed tests.** It searched by name only, and called that a weakness itself. Four of its "gaps" are already covered under other names, and seven more are partly covered.
- **It missed a probable live defect.** Gap 8 (very wide images) is a real bug, not just a coverage gap. See rank 1.

| # | ChatGPT gap | Verdict | Existing test(s) (current line) |
|---|---|---|---|
| 1 | EXIF portrait photo | **REAL GAP** (synthetic half) | none: `grep -ci exif tests/tests.js` = 0 |
| 2 | HEIC/HEIF from iOS Photos | PARTLY COVERED | classification only: `import: a file with no MIME type is classified by extension` (:424, `pic.heic`). Decoding is device-only. The undecodable-file half is merged into rank 2 |
| 3 | HDR HEVC preview vs export | REAL GAP, **device-only** | none possible in the Chrome suite |
| 4 | VFR clip A/V sync | PARTLY COVERED | sync controller: `drift resync: the correction is a rate nudge…` (:22587), `audio: real drift is still corrected once the element has warmed up` (:65883), `a drift seek re-warms the sync controller…` (:73440), `690 after a 200 ms stall a 1x song keeps its pitch…` (:89243). Real VFR footage is device-only |
| 5 | Many 4K clips exhaust decoders | PARTLY COVERED | `frame cache: the memory budget follows the device` (:268), `a track can never budget more frames than the device allows` (:55166), `every media teardown path hands back BOTH decoded caches` (:15000). Real capacity is device-only |
| 6 | Animated GIF import/seek/reopen | **PARTLY COVERED**, real residual | `690 an animated GIF he adds moves on the canvas… still moves when he reopens` (:92308), `690 the GIF frames match the browser decoder pixel for pixel…` (:92400). **Untested: the memory-budget downscale and freeing the frames on release.** See rank 3 |
| 7 | Transparent PNG alpha parity | PARTLY COVERED, low value | `preview: a blur covers the same picture at any render scale` (:237), `#661: the GPU colour path reproduces ctx.filter` (:67415, semi-transparent column), `690 an MP4 of a project with a transparent background…` (:96056). PNG decoding is the browser's job |
| 8 | Very wide/tall stills | **REAL GAP, probable live defect** | `the first import cannot create a project bigger than the biggest preset` (:60013) and `importing a phone photo into an empty project goes through the cap` (:60041) test the short-side cap only. **Nothing checks the 7680 long-side ceiling.** See rank 1 |
| 9 | MIME/UTI from Files providers | PARTLY COVERED | :424 (empty type → extension), and the GIF sniff by first bytes (`js/media.js:647-650`) runs inside :92400. Real provider metadata is device-only |
| 10 | Audio-only extraction from a real video | PARTLY COVERED | `448: Import Audio takes the SOUND out of a video, and says so when it cannot` (:8983), plus the size-ceiling test at :53485 (queue 834). A real MOV is device-only |
| 11 | Mic denied, then granted | PARTLY COVERED | `voice: the microphone is handed back on EVERY exit path` (:24155, step 5 is a denial with a message and no live track). **Untested: Try again after a denial.** See rank 9 |
| 12 | Recording interrupted by a call or Siri | PARTLY COVERED | :24155 step 4 (hidden mid-take keeps the take, mic released) and `916.6 voice: coming back to the app while the mic prompt is up…` (:24274). **Untested: an interruption that ends or mutes the track without hiding the page.** Merged into rank 4 |
| 13 | Mic route change mid-take | **REAL GAP** | none. `js/voice-rec.js` has no `ended`/`mute` listener on the track (only `recorder.onerror/onstop` at :626-627). See rank 4 |
| 14 | 44.1 kHz / mono files after reload | PARTLY COVERED, device remainder | `#96: an mp3 whose header lies about its length…` (:66947), `690 Replace media on a song…` (:92475, mono 44.1 kHz WAVs). A real-decoder round trip is device-only |
| 15 | A broken file in a multi-file import | **REAL GAP** | `FM._handleFiles` is called in one test only (:8983), with an empty list. No batch has a bad file in it. See rank 2 |
| 16 | iOS storage eviction / `persist()` | REAL GAP, device-only (synthetic half is trivial) | none: `grep storage.persist tests/tests.js` = 0. See rank 11 |
| 17 | Cold launch on a stale cached shell | **COVERED** | `the service worker retries a dropped navigation before serving an old build (queue 306)` (:61866), `690 opened with no signal, the app says it is offline…` (:99761) |
| 18 | Suspension during playback | **COVERED** | `690 leaving the app mid-play stops playback where he left…` (:96498), `an AudioContext that stops advancing must not freeze playback` (:22707) |
| 19 | Rotation while editing | **PARTLY COVERED**, real residual | `955 resizing the window keeps the playhead…` (:107306) goes 380→700→380, which **never crosses the 700px phone/Studio line**. A rotated phone (844×390) does cross it. See rank 5 |
| 20 | 200% text zoom | REAL GAP, low | none. Safari's aA zoom narrows the CSS viewport; rank 12 gives a proxy test |
| 21 | Template replace with a shorter clip | PARTLY COVERED | `690 Replace media on a song…` (:92475) asserts that a 3 s file replacing a 6 s song clamps the duration. **Untested: a non-zero trim past the new end, and an animated speed.** See rank 8 |
| 22 | Template file across devices (media + fonts) | PARTLY COVERED | `a template saves as a shareable file the importer can actually read (queue 343)` (:69743) only checks that a `fonts` map *exists*. `921 S4 a font crosses with the document…` (:34253) covers `applyEmbedded` on the collab route. **The file route's embed→import round trip is untested.** See rank 7 |
| 23 | Template aspect fit | **COVERED** | `690 Replace media fits a file of another size or shape into the box the old one drew…` (:92282), `690 Replace media puts the new clip where the old one was…` (:92230), `690 after Replace Media on Insert your Media…` (:93638) |
| 24 | Long Home library | PARTLY COVERED, device remainder | `992 on the PC the New project + stays on top of the project cards…` (:114255), `690 Duplicate or Rename on a project down his long list…` (:98922). Memory with hundreds of real thumbnails is device-only |
| 25 | Uncommon fps save/reopen | **REAL GAP**, low | no test saves and reopens a non-30 fps project. The clamp is only exercised inside `921 S0 sanitizers…` (:28915) and :41144 |

---

## Real gaps, ranked by risk (candidate hunt items)

These are written for the builder. Tier tags follow the `(hunt HIGH/MEDIUM/LOW #n)` convention so `next.sh` and `ship.sh` sort them behind his own requests. Test names follow the suite's habit of stating the behaviour in his terms. The item number is the builder's to assign.

### 1. (hunt HIGH) A panorama import makes a project over the 7680 ceiling, and reopening it silently reshapes the canvas

**Behaviour.** The first import sizes the project with `FM.fitProjectSize` (`js/app.js:3020-3026`). It caps only the **short side** at `MAX_AUTO_SHORT = 2160` (`js/app.js:2961`). Every project open then runs `clampProjectDims` (`js/storage.js:1004-1010`, called on open at `:890` and `:1777`), which caps **each side at 7680**. The two limits disagree.

Reproduced in osascript with the same arithmetic:

| Source | First import gives | Reopen gives |
|---|---|---|
| 16000×4000 phone panorama | **8640×2160** (capped) | **7680×2160** |
| 9000×2000 | **9000×2000** (not capped) | **7680×2000** |
| 4000×16000 (tall) | **2160×8640** | **2160×7680** |

In practice this means:
- After a reopen, the photo layer still has its 8640-wide scale and centre, but the canvas is 960px narrower. The picture sits off-centre and its right edge is cut.
- `FM.projectIsOversize` (`js/app.js:2982-2986`) also tests only the short side, so the oversize toast never fires.
- Canvas settings' own clamp (`cvClampDim`, `js/app.js:8246`) would shrink it too on Apply.

Not run in a browser. Inference from code: nothing in the open path rescales layers when the clamp bites, because the clamp touches only the four numbers.

**Test outline** (unit half plus the real round trip):
```js
test('a panorama sets a project the app can reopen at the same shape - the long side never passes 7680', { item: 'NNN' }, async function () {
  // UNIT: every fitted size must survive the load clamp unchanged, or a reopen reshapes it
  const cases = [[16000, 4000], [9000, 2000], [4000, 16000], [3024, 4032] /* CONTROL: his photo case, already right */];
  cases.forEach(function (c) {
    const r = FM.fitProjectSize(c[0], c[1]);
    const p = { width: r.w, height: r.h, fps: 30, duration: 5 };
    FM.storage._clampProjectDims(p);
    if (p.width !== r.w || p.height !== r.h) throw new Error(c.join('x') + ' imported as ' + r.w + 'x' + r.h + ' but reopens as ' + p.width + 'x' + p.height + ' - the canvas changes shape on reopen');
    if (Math.abs(r.w / r.h - c[0] / c[1]) > 0.01) throw new Error(c.join('x') + ' lost its aspect: ' + r.w + 'x' + r.h);
  });
  // REAL ROUND TRIP: addMediaLayer with { kind:'image', width:16000, height:4000 } into an empty project,
  // read the layer's on-canvas box (FM.layerSize / the renderer's bounds), save, open another project (hcCleanup
  // pattern from :92308), reopen, and assert project.width/height and the layer's box relative to the canvas are
  // unchanged (left and right edges both within 1px of the canvas edges).
});
```
Mutation proof: reverting a fix to `fitProjectSize` makes the unit half fail at 16000×4000.

### 2. (hunt MEDIUM) One unreadable file in a picked batch is named, and the files around it still import

**Behaviour.** `handleFiles` (`js/app.js:5489-5531`) wraps each file in its own `try/catch` and sends a failure to `FM.reportError` (`:5524`). Failures look like this:
- An image the browser can't decode rejects with `Could not load image` (`js/media.js:806`). That includes a HEIC on a PC Chrome, and any corrupt JPEG.
- A corrupt audio or video file rejects via the element's `error` (`js/media.js:204`), or via the 20 s `metaTimer` (`js/media.js:141-146`).

No test feeds `FM._handleFiles` a batch with a bad file in it. The only call (:8983) passes `[]`. A regression in either of these would leave the suite green:
- moving the `try` outside the loop, so one bad file aborts the batch;
- swallowing the error, which brings back the silent drop #215 was about.

**Test outline:**
```js
test('a picked batch with one unreadable file in the middle adds the good ones in order and names the bad one', { item: 'NNN', budgetMs: 60000 }, async function () {
  // good song (huntEWav / the :92060 WAV helper), then a junk 'IMG_0007.heic' (64 zero bytes, type 'image/heic'),
  // then a junk 'song2.m4a' (zero bytes, type ''), then a second good WAV.
  // Stub FM.reportError to record (where, human) and FM.toast to record its message. Restore both in finally.
  // CONTROL: FM.mediaKind classifies all four as expected (image / audio / audio / audio), so a failure is the loader, not the classifier.
  // await FM._handleFiles([good1, badHeic, badM4a, good2]);
  // assert: exactly two new layers, in pick order (good1 before good2); reportError called twice, and each message
  // contains its own file name; no layer was added for either bad file; FM.media has no record for a bad file (no leaked blob URL).
});
```
Run it under `?only=` first. The zero-byte `.m4a` might reach the 20 s timer instead of `error`. If it does, record which path fired and keep the budget honest.

### 3. (hunt MEDIUM) A GIF too big for the phone's budget is kept smaller but drawn full size, and removing it frees its frames

**Behaviour.** `decodeGifAnimation` (`js/media.js:720-780`) scales every frame by `k = sqrt(gifBudget() / (W·H·4·n))` (`:727`) when the decoded frames would exceed half the frame-cache budget (`gifBudget`, `:639-642`, minimum 32 MB). The compositor must still draw the smaller frames at the record's full width and height.

`release()` (`js/media.js:45-61`) calls `closeAnim` (`:59`, `:793-797`) to close every bitmap. That is the largest thing an image record holds on a phone.

The two GIF tests (:92308, :92400) use 4×4 to small fixtures, so `k` is always 1. No test asserts `rec.anim` is closed and nulled after `FM.media.remove` or a replace (`grep -n "closeAnim\|rec.anim" tests/tests.js` finds nothing).

**Test outline:**
```js
test('a GIF past the phone memory budget animates at its full size on the canvas, and deleting it gives the frames back', { item: 'NNN', budgetMs: 90000 }, async function () {
  // Fixture: FM.gifEncoder.create(1200, 1200) with 8 solid frames (red/blue/... ) at 250ms -> 1200*1200*4*8 = 46 MB > 32 MB floor.
  // Stub FM.frameCacheLimits to { maxBytes: 64 MB } so gifBudget() = 32 MB deterministically; restore in finally.
  // const L = await h3aImport(gif);  const m = FM.media.get(L.id);
  // CONTROL: m.anim exists and m.anim.width < 1200 (the budget really bit - otherwise this proves nothing).
  // assert: m.width === 1200 (the record keeps the true size), and the layer's rendered box equals that of a still
  //   1200x1200 PNG imported the same way (compare FM.layerSize or a pixel probe at the box's right edge: frame colour, not background).
  // assert: the colour sequence at 0.1/0.35/0.6 s still changes (h3aPixel as in :92308).
  // RELEASE: keep a reference to m.anim.frames, FM.media.remove(L.id); assert m.anim === null and every frame is closed
  //   (ImageBitmap.width === 0 after close() in Chrome), and the same after FM.replaceMediaWith on a second GIF layer.
});
```

### 4. (hunt MEDIUM) A microphone that goes away mid-take or while armed is said out loud, and the next tap still records

**Behaviour.** The recorder handles three cases:
- a hidden page: `bgStop`, `js/voice-rec.js:609-611`;
- a recorder error: `:626`;
- a recorder stop: `:627`.

Nothing listens to the **track**. Siri, a route change (headset unplugged, Bluetooth handover) or another app taking the mic can end or mute the track **without** hiding the page, and then:
- **Mid-take:** if the track ends, MediaRecorder stops itself per the spec and `finish` (`:672`) puts the partial take in review with no note. If the track is only muted (the usual iOS interruption), it keeps recording silence with nothing on screen.
- **While armed:** `stream` is still set but dead. `ui.rec` stays enabled (`paint`, `:418-426`), and the next tap goes into `start()` (`:613`). Inference, not run: the likely result is a misleading "This browser refused to start a recording." or a "Too short".

**Test outline** (drives the suite's fake mic, `vrFakeMic` at :24091, and `withFakeMic` at :24127):
```js
test('voice: a microphone that ends mid-take keeps the take and says why, and one that ends while armed is re-armed before the next tap', { item: 'NNN', budgetMs: 30000 }, async function () {
  await withFakeMic(async function () {
    // A: open, record 600ms, then end the track the way a route change does: tr.stop(); tr.dispatchEvent(new Event('ended')).
    //    assert within 3s: state 'review' (not stuck on 'recording'), .vr-msg names the mic going away, vrLive().length === 0.
    // B: open, wait for 'live', end the track while idle (same two lines). assert: the panel re-arms (vrStates() becomes 'live'
    //    on a NEW track) or shows a message with Try again - and a following record tap yields a take of >0 bytes.
    // C (CONTROL, must stay green before the fix): a take with no track event ends in 'review' with no message - proves A's
    //    assertion is about the event, not about stopping.
    // D: mute mid-take (dispatch 'mute' on the track): a visible "microphone paused" note while muted, cleared on 'unmute'.
  });
});
```
This needs app code before it can go green. Today it is a missing behaviour, not just a missing test. Run it at 380 as well, because the message row is phone-layout sensitive.

### 5. (hunt MEDIUM) Turning the phone sideways mid-edit (390 → 844 wide crosses into Studio) keeps the selection, the open panel and the playhead

**Behaviour.**
- `FM.mobile.isPhone()` is `matchMedia('(max-width: 700px)')` (`js/mobile.js:7`).
- A landscape phone at 844×390 therefore takes the **desktop Studio layout** (the note at `tests/tests.js:25232`).
- Rotating flips the whole layout family: `body.m-editing`, the docked inspector sheet (`js/mobile.js:178`, `:198`), and the effects browser, which re-lays itself out via `FM.screen.watch` (`js/fx-browser.js:104`).

The only resize test that keeps state (:107306) goes 380→700→380 and stays inside the phone family. The height also changes (760 → 390), which `layout: a short viewport caps the timeline band` (:25247) checks only statically.

**Test outline:**
```js
test('a phone turned sideways and back mid-edit keeps the selected layer, its open panel and the playhead - 390x844 to 844x390 to 390x844', { item: 'NNN', budgetMs: 60000 }, async function () {
  // const fe = window.frameElement; save fe.style.width/height; restore in finally (pattern from :107306, setW with a 450ms settle).
  // At 390x844: select a shape layer, open the inspector on the Effects view (FM.inspector.currentView() === 'effects'), park at 1.2 s.
  // Rotate: fe.style.width='844px'; fe.style.height='390px'; dispatch resize; settle.
  //   assert: matchMedia('(max-width: 700px)').matches === false (CONTROL: the family really flipped);
  //   FM.scene.selectedId unchanged; inspector still on that layer and view; FM.time within one frame of 1.2;
  //   body has no phone-only class left behind (m-editing); no element of the inspector/effects browser past window.innerWidth/innerHeight.
  // Rotate back to 390x844 and repeat the same assertions, plus: the sheet is docked (not floating mid-screen).
  // Repeat once WHILE PLAYING: FM.play(), rotate, assert FM.playing and the playhead kept moving forward (no jump back).
});
```

### 6. (hunt MEDIUM) A JPEG with an EXIF rotation shows upright on the canvas, the clip strip and the Home thumbnail, and in the export

**Behaviour.** iPhone JPEGs often store landscape pixels plus an Orientation tag (6 = rotate 90° CW). The app relies on the browser in each place:
- `FM.loadImageFile` (`js/media.js:801-808`) reads `naturalWidth/Height` from an `<img>`, which applies EXIF by default in current engines;
- `FM.fitProjectSize` uses those numbers;
- the strip uses `createImageBitmap(el …)` (`js/frames.js:198-199`, `:270`, `:282`).

No test feeds an oriented JPEG (`exif` appears 0 times in the suite), so a change to `createImageBitmap` options, or a switch to decoding from the Blob, would pass the suite and rotate his photos.

**Test outline:**
```js
test('a phone photo stored sideways with an EXIF rotation lands upright - canvas, clip strip, and the export frame agree', { item: 'NNN', budgetMs: 60000 }, async function () {
  // Fixture: draw 80x40 on a canvas, left half red, right half blue; toBlob('image/jpeg', 0.95); splice an APP1 'Exif\0\0'
  // segment (II*, one IFD entry 0x0112 SHORT = 6) right after SOI. File 'IMG_0420.JPG', type 'image/jpeg'.
  // CONTROL: new Image() of the file reports naturalWidth 40, naturalHeight 80 (the browser honours the tag - otherwise skip
  //   with a named reason, never pass).
  // const L = await h3aImport(file); assert FM.media.get(L.id).width === 40 && height === 80.
  // Canvas: sample the top and bottom of the layer's box -> red on top, blue below (rotated 90 CW).
  // Strip: await the strip build, draw stripFrames[0] to a 2x2 canvas -> same top/bottom colours.
  // Export frame: FM.renderScene at the layer's time into an offscreen canvas -> same.
});
```

### 7. (hunt MEDIUM) A template or project file with a custom font opens in that font on a device that never had it

**Behaviour.**
- `embedFonts` (`js/storage.js:982-998`) copies each custom font that the text layers use, up to `FONT_EMBED_LIMIT` (4 MB, `:3643`), into the file's `fonts` map. It is used by `exportProjectFile` (`:1876`) and the template pack export (`:3126`).
- `importFile` registers them via `FM.fonts.applyEmbedded` (`:1713`).

`a template saves as a shareable file…` (:69743) asserts only that `obj.fonts` is an object, and an empty `{}` passes. The collab font test (:34253) covers `applyEmbedded` but not the file route's embed half. So "the file silently stops embedding fonts" is the exact regression nothing catches; the code comment at `:986` names it.

**Test outline:**
```js
test('a template whose text uses an imported font carries the font in its file, and the file opens in that font after the font is gone', { item: 'NNN', budgetMs: 90000 }, async function () {
  // Import a small real font via FM.fonts.import (a test font file already used by the suite, or a tiny generated one), set a text
  // layer's fontFamily to it, save as a template, and capture the file FM.templates.exportFile writes (stub the download sink).
  // assert: obj.fonts has exactly that font's id, with a data: URL > 0 bytes; an UNUSED imported font is NOT in the map (control).
  // Remove the font (FM.fonts.remove) and the template; import the captured file through FM.storage.importFile.
  // assert: FM.fonts.list() has the family again; document.fonts.check('16px "<family>"') is true after FM.fonts.faceLoaded();
  //   the text layer's ink width matches the width measured before removal within 2px (a fallback face differs by far more).
  // Media half: the template carries one small PNG; after import FM.media has a record for that layer with width > 0.
});
```

### 8. (hunt LOW) Replace media with a shorter clip clamps the trim and the duration even with a speed ramp, and keeps masks and effects

**Behaviour.** `FM.replaceMediaWith` (`js/app.js:4660-4680`) re-clamps `trimStart` to `nrec.duration - 0.05` and the duration via `FM.maxDurForSource`, and keeps effects and masks. Only the plain case is tested (:92475: 6 s → 3 s song, speed 1, trim 0). That leaves untested:
- a trim past the new end;
- an animated speed (the object case `maxDurForSource` exists for);
- a picture clip, where a wrong clamp shows as a frozen tail.

**Test outline:**
```js
test('Replace media with a shorter clip keeps no frozen tail - trim past the new end, a speed ramp, a mask and an effect all survive', { item: 'NNN', budgetMs: 60000 }, async function () {
  // Layer: video from a 6 s fixture, trimStart 4, speed { kf:[{t:0,v:0.5},{t:1,v:2}] }, one effect, one mask marker.
  // FM.replaceMediaWith(L.id, await FM.loadVideoFile(twoSecondFixture)).
  // assert: 0 <= trimStart <= 1.95; isFinite(duration) && duration > 0; FM.layerLocalTime(L, L.start + L.duration - 1e-3) <= 2.0
  //   (no source time past the new file's end); the effect and the mask marker are still on the layer (same ids);
  // CONTROL: a 10 s replacement leaves trimStart 4 and the duration untouched.
});
```

### 9. (hunt LOW) After a refused microphone, Try again works without a reload

**Behaviour.** `fail()` (`js/voice-rec.js:568-574`) releases the mic and relabels Retake as "Try again". `retake()` → `arm()` (`:508`) asks again. Test :24155 step 5 asserts only the refusal message.

**Test outline:** inside `withFakeMic`, refuse once by swapping `FM.voiceRec._openMic` (the pattern at :24254), then restore the real fake mic and click `.vr-retake`. Assert three things:
- `vrStates()` becomes `'live'`;
- a 500 ms take reaches `'review'`;
- the "Try again" label has gone back to "Retake".

### 10. (hunt LOW) A 24/25/48/50/60/120 fps project reopens at the same frame rate, length and playhead

**Behaviour.** `clampProjectDims` rounds fps into 1–120 (`js/storage.js:1015`). The note there records the old whitelist that "silently reset every other value to 30". Nothing saves and reopens a non-30 project.

**Test outline:** for each fps, plant a project:
- through `FM.projects.create({ fps })`;
- with one 2 s shape layer;
- with the playhead parked on frame 37 (`FM.snapFrame`).

Save, open another project, reopen, and assert three things:
- `project.fps` is unchanged;
- the layer duration is unchanged;
- `FM.snapFrame(FM.time)` is still frame 37 at that fps.

Include 120 and 1 as the edges, and `29.97` as a CONTROL that **does** become 30, so the rounding is a stated rule rather than an accident.

### 11. (hunt LOW) The app asks once for persistent storage, and never asks again once granted

**Behaviour.** `js/storage.js:331` calls `navigator.storage.persisted()` and then `persist()`. It is untested. Whether WebKit honours it is device-only, so this protects only the request itself.

**Test outline:**
- Stub `navigator.storage.persisted` and `navigator.storage.persist` with counters.
- Re-run the boot path through its seam. If there is none, the first step is to expose one, like `FM._handleFiles`.
- Assert one `persist()` when `persisted()` answers false, and none when it answers true.
- Assert that a rejecting `persisted()` neither throws nor blocks the boot.

### 12. (hunt LOW) Safari's 200% page zoom (a ~195px layout viewport) leaves every Home card action and the export button reachable

**Behaviour.** Text zoom on iOS Safari (aA) shrinks the CSS viewport. The narrowest width the suite reaches is 320 (:74693, :75590). It is a proxy for gap 20; real Dynamic Type is device-only.

**Test outline:** `atPhoneWidth(fn, 196)` and then:
- on Home, each card's ⋯ and the New project + have a bounding box inside `innerWidth`, and `document.elementFromPoint` at their centres returns the control itself (the cover check from :114255);
- in the editor, the Export button and the inspector close button pass the same check.

Treat a failure as a design question for him, not an automatic fix.

---

## Device-only: worth a manual protocol, not a suite test

These cannot be produced in the Chrome suite, so do not file them as hunt items. If he wants them, they belong in one short on-device checklist:

- **2:** HEIC decoding in the iOS picker.
- **3:** HDR HEVC colour.
- **4:** real VFR drift.
- **5:** decoder capacity with 4K clips.
- **9:** real Files-provider metadata.
- **10:** a real MOV's audio.
- **14:** the platform resampler round trip.
- **16:** WebKit eviction.
- **18:** a real lock/unlock.
- **24:** memory with hundreds of real thumbnails.

The synthetic halves of 2, 9, 12, 13, 16 and 20 are folded into ranks 2, 4, 11 and 12 above.
