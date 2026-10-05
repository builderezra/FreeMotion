# The first two from ChatGPT's pile: f25e15d3 (#1013) and 3170a94c (#1014)

Built 5 Oct 2026 from four reviews (correctness and user-outcome, one each per commit). **Nothing here was run in a
browser.** `.ship-in-progress` was present for every review, so all verdicts come from reading the code, from
`git merge-tree` and scratch-clone trial applies, and from a 300k-size Python fuzz of the panorama arithmetic.

**Both verdicts: LAND AFTER FIX.** Neither is "land first" as-is, and neither is "do not land".
Land them **together in one release, after the in-flight ship lands** and with nothing else running beside it.
They come before every batch in LAND-LIST.md, because LAND-LIST §1 says the no-sound fix goes first.

**Both REQUESTS entries already exist, so do NOT log a new one.**
- f25e15d3 closes **#1013**: *(hunt MEDIUM #1013)*, empty AAC track while the card says Sound ✓.
- 3170a94c closes **#1014**: *(hunt HIGH #1014)*, a panorama canvas that changes shape on reopen.

Retag the tests to those numbers. The POLISH-LOG line claims `queue 1013` and `queue 1014`. Write `#215`/`#604`/`#677` in
`#NNN` form only: the release must not claim them, because it does not close them. If the oldest-first gate refuses,
use #1067's `JUMPED:` convention. Do not force it.

---

## Landing mechanics (both commits)

Both commits are in `refs/pile/codex-690`. Their parent is ChatGPT's `78f05bb0`, not main. `exporter.js`, `app.js` and
`tests.js` merge cleanly onto `f7716576`, and **only `index.html` conflicts**: the pile's busters count along ChatGPT's own
history.

```bash
test ! -f .ship-in-progress && test ! -f .mutation-in-progress && echo clear
git show --binary --format= f25e15d3 -- . ':(exclude)outside' ':(exclude)index.html' ':(exclude)tests/tests.js' | git apply -3 --index
git show --binary --format= 3170a94c -- . ':(exclude)outside' ':(exclude)index.html' ':(exclude)tests/tests.js' | git apply -3 --index
```

- **index.html:** bump each touched file once, from live's value at landing time. Never use the pile's 186/476/477.
  On the tree as of this writing, `js/exporter.js?v=126` becomes 127 and `js/app.js?v=468` becomes 469. Both commits touch
  app.js, so it gets ONE bump. If the in-flight ship has moved either number, take its value + 1.
- **tests.js:** paste each commit's added test as one block (`git show --format= <sha> -- tests/tests.js`). Put the
  #1013 test directly after `q215TrackScan`'s helper, where the pile has it, because it calls that helper. Put the #1014 test
  at the end. Never union-merge.
- Version label, POLISH-LOG entry, REQUESTS.md summary stamp and ticks: as usual. `ship.sh` checks all of them.

---

## 1. f25e15d3: "Guard empty AAC output before MP4 muxing" → #1013

**Verdict: LAND AFTER FIX.** The guard is correct, and it is the fix direction in batch2/VERIFIED.md §1a. In `run()`, if
`encodeAudio` resolves with **zero** chunks, it is now treated like an encode that throws: `FM._audioTrackDropped =
'no-chunks'`, `exportSay` and a toast WITHOUT SOUND, and `mix`/`audioChunks` nulled **before** the muxer is built, so no
empty `soun`/`mp4a` track is declared. The report's `audio` line and `onReady`'s `hasAudio` now come from the chunks
actually fed to the muxer. `app.js AUDIO_WHY` gains `'no-chunks'`. This is the only MP4 muxer route: M4A already refuses
`n==0`, GIF and frames have no soundtrack, and the worker has no muxer. The resume path re-encodes audio on every run.

**This is a guard plus a diagnostic. It is not a cure for his no-sound bug.** Nobody knows yet whether Safari 26 on iOS
ever emits zero chunks. A zero-chunk export is still mute in Photos. The difference is that the app now says so. The
release note must read like *"if the phone's encoder makes no sound, the card now says NO SOUND and the report counts the
sound frames"*. It must **never** say "fixed no-audio exports".

### Exact fixes (all required in this release)
1. **Retag:** `{ item: 'TBD' }` → `{ item: '1013' }`. Rename the test from `(batch2 1a)` to `(queue 1013)`.
2. **Add §1a's `decoded peak` line.** It is the part that makes his next paste decisive. Without it, a phone that writes
   more than 0 frames *of silence* still reads `TRACK WRITTEN`, and step 4 of his test cannot be read.
   - Right after the guard, while `audioChunks` is non-empty, decode the chunks back with `AudioDecoder`, the same way
     `aacPriming()` already does on the phone. Use `meta.decoderConfig` from the first chunk. Store the max absolute sample in
     `FM._lastAacDecodedPeak`.
   - Start it as a promise **before** the video render. Await it, with a ~5 s cap, only when writing the report.
   - Wrap all of it in try/catch. It can never fail or delay an export: a timeout or throw records a reason, not an error.
   - New report line under `audio`:
     `decoded    peak 0.398 (15 frames)`, or `decoded    -  (no frames)`, `decoded    FAILED: <msg>`,
     `decoded    timed out`, `decoded    AudioDecoder MISSING`.
   - It is diagnostic only. It does **not** change the card. Whether a 0.000 peak should flip the card to NO SOUND is a
     follow-up question for after his first paste.
3. **Late-chunk visibility.** Change the encode callback to
   `(chunk, meta) => { if (audioChunks) audioChunks.push({ chunk, meta }); else { FM._lateAacChunks = (FM._lateAacChunks || 0) + 1; console.warn('[export] AAC chunk arrived after the track was dropped'); } }`
   and add `late AAC   <n>` to the report when it is non-zero. Today a non-spec late chunk throws inside the callback and
   nobody sees it. This is the one way the guard could turn an export that used to have sound into a silent one, so it must
   be visible.
4. **Add the missing `console.warn`** to the no-chunks branch, to match the encode-failed branch beside it.
5. **Test hygiene.**
   - Replace `new AudioContext()` + `createBuffer` with
     `new AudioBuffer({ numberOfChannels: 2, length: 14400, sampleRate: 48000 })`. The current version leaks one live
     AudioContext per run.
   - Stub `FM.toast = () => {}` inside the test. It currently saves and restores the toast but lets real toasts fire.
6. **Tighten the positive control.** Expect the frame count to be about `ceil(48000*0.3/1024) = 15` (accept 14 to 17)
   instead of any `[1-9]\d*`. Also assert `decoded peak` is above 0.1 (the tone is 0.4) and that the empty run reads
   `decoded    -`.
7. **Do not claim the `hasAudio` change as independently proven.** Once the guard nulls `mix`, `!!mix` is already false,
   so the mutation "revert the card to `!!mix`" SURVIVES. Keep the change, because it is correct and harmless. In the
   POLISH-LOG, prove the guard and the report line. For the hasAudio half, either write that it is covered by the guard, or
   add a case that can tell the two apart.

**Mutations that must turn the test red:**
- delete the `!audioChunks.length` guard;
- revert the report line to `mix ? 'TRACK WRITTEN' : 'NO TRACK'`;
- set the decoded peak to 0.

### What Ezra will see
- **Normal exports:** nothing changes. Sound still plays, and the card still says **Sound ✓**. The report's `audio` line
  is longer: `TRACK WRITTEN · 97 AAC frames · 27.0 KB · 2.07s`. It also gets a new `decoded    peak …` line.
- **If his phone's encoder produces nothing:**
  - The export screen says *"The audio encoder produced no sound frames — exporting WITHOUT SOUND"*.
  - The ready card says **NO SOUND — the audio encoder produced no sound frames**.
  - The saved file has no audio track at all, instead of an empty one. It is still mute in Photos.
  - Before this release, the card said Sound ✓ and the file was mute.
- Wording note, not a blocker: "the phone made no sound for this export" would be plainer. It is kept as is because it
  matches its sibling *"the audio encoder failed"*. Mention it to him as a one-word veto when you report the release.

### How his next no-sound report should read
His test does not change: export a clip with sound → save to Photos → play it there → if it is muted, paste
`fm.lastExportReport` as on 10 Sep. At 48 kHz there are about 47 AAC frames per second of soundtrack, so a 2 s export
should show about 94 to 97 frames. The `audio`/`dropped`/`decoded` block will look like one of three things, and each one
answers the case:

| What the report says | Ready card | Meaning | Next step |
|---|---|---|---|
| `audio      NO TRACK`<br>`dropped    no-chunks`<br>`mix peak   0.931`<br>`decoded    -  (no frames)` | **NO SOUND — the audio encoder produced no sound frames** | The mix had sound, and **the iPhone's AudioEncoder emitted nothing**. The cause is in the app's encode step, and it can be fixed in the app. | Open a fix item, e.g. retry with a different AAC config, an Opus/MP4 fallback, or a re-encode. |
| `audio      TRACK WRITTEN · 97 AAC frames · …`<br>`dropped    no`<br>`decoded    peak 0.000 (97 frames)` | Sound ✓ | The encoder **wrote frames of silence**. It is still the phone's encoder, and still fixable in the app. | Same as above. Also decide whether a 0 peak should flip the card. |
| `audio      TRACK WRITTEN · 97 AAC frames · …`<br>`dropped    no`<br>`decoded    peak 0.9xx (97 frames)` | Sound ✓ | Real sound reached the file. **The loss is in the Photos import or playback.** | Only now ask for the Photos-vs-Files comparison. |

Any other `dropped` value (`encode-failed`, `aac-unavailable`, `mix-silent`, `all-unreadable` and so on) already has its
own card wording, and the existing #215 tests already cover it.

### REQUESTS entries it updates (it does not close any of them)
- **#1013:** tick it with the version. This is the claimed item.
- **#215, #604, #677:** append a dated note to each. Do **not** add a second ask, and do not tick them. The note says:
  - From vX.YY the report counts AAC frames and decodes them back.
  - The parked conclusion "both halves point past the exporter" rested on `TRACK WRITTEN` / `mix peak` / `dropped=no`,
    which were all facts from before the encode. That conclusion is **reopened**: the phone's encoder is an unclosed
    boundary that comes before Photos.
  - The existing ask stands, sharpened: export, save to Photos, play, and if it is muted, paste the report.
  - Include the three-row reading above.
  - Do not write "HE ANSWERED" or strike the ask, or next.sh will treat it as answered.
- **Unblock list source** `tools/unblock/unblock.html`, card n=30 (`"215 · 604 · 677"`): add *"If it is muted, paste the
  export report: it now counts the sound frames."* Edit the source only. Do not publish (#777).

### Tests to run (only when no ship or mutation is running)
```bash
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=queue%201013'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=(queue%20215)'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=export:'
```
- The first is the new test. The second is the existing #215 export-audio family, including the no-AAC-encoder honest
  silent file. The third is the wider export slice: report, card and resume.
- Then run the three mutations above with `tools/mutate.sh`.
- Take one 380px screenshot of the ready card in the NO SOUND state. The new reason is the longest card line so far, so
  check that it wraps rather than clips.

---

## 2. 3170a94c: "Keep panorama canvas within persisted size limits" → #1014

**Verdict: LAND AFTER FIX.** The core fix is right for every new import.
- `fitProjectSize` now uses one factor, `k = min(1, 2160/short, 7680/long)`. So neither side can exceed storage's per-side
  clamp of 7680, and the aspect ratio is kept.
- Worked results: 16000×4000 → 7680×1920 (was 8640×2160, which reopened cut off). 9000×2000 → 7680×1706 (was uncapped).
  7681×1000 → 7680×1000 (was 7682). 4000×16000 → 1920×7680. 3024×4032 is unchanged at 2160×2880.
- Fuzzing 300k sizes up to 60000 px found every output with an aspect ratio up to about 480:1 is a fixed point of
  `clampProjectDims`. The only failures are under-16px sides, which also failed before this change, so it is not a regression.
- `js/app.js` and `tests.js` apply cleanly onto f7716576. **No logic change is needed** to land the core fix.

**What it does NOT do:**
- The new long-side clause in `FM.projectIsOversize` **can never fire**. Every load path runs `clampProjectDims` before
  `warnOversizeProject` (storage.js open ~2644, the boot `_warnOversizeAfterLanding`), and every UI path caps each side at
  7680. So a project wider than 7680 never reaches the check.
- The commit note's claim that it *"recognizes legacy panoramas over 7680"* is **false**. An 8640×2160 project saved
  before this fix still reopens as 7680×2160, off-centre and cut on the right, with no warning.

### Exact fixes
1. **Retag:** `{ item: 'TBD' }` → `{ item: '1014' }`. Rename `(batch2 1b.2)` to `(queue 1014)`.
2. **Remove the dead claim.**
   - Delete the long-side clause from `projectIsOversize`, which leaves `return Math.min(P.width, P.height) > MAX_AUTO_SHORT;`.
   - Restore its comment's meaning.
   - Delete the test's `projectIsOversize({8000,1000})` assertion. Keep the `7680×1920 is not oversize` assertion: it is
     a real guard against over-warning.
   - The POLISH-LOG line says **new** imports only: *"projects already saved at the old size stay as they were"*.
   - (The alternative, making `clampProjectDims` report a reshape and warning on that open, is real work that would help
     legacy projects. It is optional and should be logged as its own hunt item if wanted. It is not part of this landing.)
3. **Make the round trip real, or drop the tautology.**
   - The centring check (`transform.x === opened.width/2`) cannot fail on its own once the sizes match.
   - Better: after the import, round-trip the scene through JSON and run it through the same clamp `FM.storage.load()` uses
     (or a real autosave + load if a helper exists). Then assert that width, height and `layer.transform.x/y` are unchanged.
   - If that is too heavy, delete the centring line and keep the size assertions. Those are what catch the bug: on HEAD,
     16000×4000 → 8640 fails `fit.w > 7680`, and 9000×2000 fails `!fit.capped`.
4. **Optional:** also assert that `fitProjectSize` output is a fixed point of `_clampProjectDims` over a handful of sizes
   (wide, tall, square, 7681×1000). That way the "cannot reshape on reopen" rule covers more than two inputs.

**Mutation that must turn the test red:** in `fitProjectSize`, change `Math.min(1, MAX_AUTO_SHORT / short, MAX_AUTO_LONG / long)` to
`Math.min(1, MAX_AUTO_SHORT / short)`.

### What Ezra will see
- **Importing a very wide photo** (an iPhone panorama is about 16000×4000) into an empty project now makes a **7680×1920**
  canvas, with the photo whole and centred. He gets the existing toast: *"Project set to 7680×1920 — 16000×4000 is bigger
  than any preset. Change it in Canvas settings."*
- **On close and reopen** it looks exactly the same. Before, the photo came back off-centre with its right edge cut and no
  explanation.
- **A 9000×2000-style photo** used to import at full size silently. It now scales to 7680×1706 and shows that toast.
- **Unchanged:** normal photos and videos, picked sizes, exports and the iPhone export path. No export is refused.
- **Not fixed:** panorama projects he already saved and that were already reshaped stay as they are, with no message.
- This is a ChatGPT finding, not something he reported. It is a likely case for him, but nobody has seen it on a device.

### Tests to run
```bash
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=queue%201014'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=bigger%20than%20the%20biggest%20preset'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=oversize'
```
- The first is the new test. The second is `proj-cap`: ordinary imports are still 2160-capped. The third covers queue 202,
  487, 490 and perf-verdict, and checks that the warning thresholds did not move.
- Then run the mutation above with `tools/mutate.sh`.
- This release changes no UI, only a canvas size, so no 380px screenshot is needed for it. The f25e15d3 card shot covers the
  release.

---

## One release, in order
1. Wait for `.ship-in-progress` to clear.
2. Apply both commits.
3. Bump the busters by hand: exporter +1, app +1.
4. Paste the two test blocks.
5. Make fixes 1 to 7 above for #1013, and fixes 1 to 3 for #1014.
6. Run the targeted tests and the mutations.
7. Do the 380px card check.
8. Update the version label, the POLISH-LOG line (`queue 1013`, `queue 1014`, and #215/#604/#677 in `#` form only), and
   the REQUESTS stamp.
9. Tick #1013 and #1014. Add the notes to #215, #604 and #677. Edit the unblock source.
10. Run `tools/ship.sh` with `timeout: 600000` or detached. Check `HEAD` against `ssh/main`, then curl the live version label.
