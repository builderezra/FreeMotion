# H16: independent check of ChatGPT's seven fixes (branch `chatgpt/1059-detect-speech-fallback`)

The chain is seven linear commits on v17.23 (b46b47d3), no app file touched by me. For each commit I read the whole diff, then ran its own focused test in my container (headless Chromium 1194, `--no-sandbox`, software GL) three ways: **with the fix**, **with the commit's source change reverse-applied** (tests left in), at **1280 and at 380 px**. Everything marked Verified below was run; Guess says so.

## Summary

| commit | fix | with fix | fix reverted | verdict |
|---|---|---|---|---|
| `2ea47a00` | #1013 empty AAC track | **not runnable here** (needs real H.264 and AAC); the zero-chunk half passes in a scratch variant | the same half fails in the scratch variant | **land-after-fix** (one line, a timeout) |
| `9cec73a1` | #1014 panorama canvas size | 1/1 at 1280 and 380 | 0/1 at both | **land** |
| `d8fa4fbb` | #1015 guest reconnect clash | 1/1 at 1280 and 380 | 0/1 at both | **land** |
| `8c813c78` | #1016 keyboard numeric | 1/1 at 1280 and 380 | 0/1 at both | **land**, with one phone check |
| `ba154a37` | #1040 missing transform | 1/1 at 1280 and 380 | 0/1 at both (the crash) | **land** |
| `a22dbc46` | #1041 nested styled groups | 1/1 at 1280 and 380 | 0/1 at both | **land** |
| `13e5b1ea` | #1059 detect speech | 1/1 at 1280 and 380 | 0/1 at both | **land** |

- **The chain merges cleanly onto `release/v17.24`** (`git merge-tree` reported no conflicts, so the order in which the laptop lands them does not matter for text conflicts). I did not run the full suite on the merged result.
- Each commit also adds a note under `outside/chatgpt/fixes/` (a markdown file, not code). Whether those belong on main is the builder's call.
- **Why #1015 and #1016 "never passed": it is not the tests and not the fixes.** Both pass and both fail-when-reverted here, at two widths, in isolation, on the unmodified commits. Their notes (`outside/chatgpt/fixes/1015-...md`, `1016-...md`) describe `FM` being missing and `Cannot set properties of undefined (setting 'innerHTML')` on "muted Chromium on port 8894", which is what a half-loaded app frame looks like. `tools/serve.sh` documents exactly that failure when the dev server is plain `python3 -m http.server` (its accept queue is 5, so scripts are refused). **That is a guess about the cause** (I tried four runs against a plain `http.server` and could not make it fail, so I cannot show it); what I can show is that the same tests pass with the project's server, so the gate had a broken instrument, not broken code.

## #1013 empty AAC track (`2ea47a00`)

**Diff read** (`js/exporter.js` +88, `js/app.js` +1, one test). A flush that resolves with zero chunks now drops the audio track before the muxer is built (`FM._audioTrackDropped = 'no-chunks'`, say-line and toast), the report counts frames, bytes, duration and a decoded peak, and a chunk arriving after the drop is counted in the saved report.

**Run here:** the test needs a real AAC encode and a real H.264 encode, and my Chromium has neither: it fails identically with and without the fix at `NO_VIDEO_CODEC` (`js/exporter.js:1021`). So the committed test says nothing here. I ran the half that does not need AAC in a **scratch copy**: the exporter's codec list and the muxer's codec switched to VP9, and the test's positive control (the real AAC encode) cut out. That half asserts that an encoder that resolves `flush()` with no chunks leaves **no** `soun`/`mp4a` track, reports `no-chunks`, shows "NO SOUND" on the ready card and "NO TRACK" in the report, and that a late chunk lands in the report.
- With the fix: 1/1.
- With `js/exporter.js` and `js/app.js` reverted: 0/1, "zero AAC chunks still left a declared audio track in the MP4: soun true, mp4a true". **That is the bug, reproduced.**
- **Not verified:** the healthy half (a real AAC encode counted, about 15 frames for 0.3 s, a decoded peak above 0.1). It must be run on a machine with AAC.

**Skeptic findings**
1. `decodedAACPeak` (`js/exporter.js`, new) decodes the entire soundtrack through `AudioDecoder` after every export that has sound and awaits `dec.flush()` with **no timeout**. A decoder that is present but never settles (a risk on newer WebKit builds, which I cannot test) would hang the export after the video has rendered, on the path where Ezra's real "no sound" bug lives. Every other failure is caught and reported as "decoded peak unavailable"; only a hang is not.
2. Side effect that is by design: `hasAudio` on the ready card is now `audioFramesWritten > 0` instead of `!!mix`.

**Exact fix (precaution, Guess that it is needed):** in `decodedAACPeak`, replace
`await dec.flush();`
with
`await Promise.race([dec.flush(), new Promise(function (_, rej) { setTimeout(function () { rej(new Error('decoded peak timed out')); }, 8000); })]);`
The existing `catch` turns the rejection into `null`, which the report already prints as "decoded peak unavailable".

**Run on the laptop (it has H.264 and AAC):** `python3 tests/_cdp.py --port 8791 --url 'http://localhost:8791/tests/run.html?only=a%20zero-chunk%20AAC%20encode'` against the chain, then again with `git apply -R` of the commit's `js/` part; expect pass and fail.

## #1014 panorama canvas (`9cec73a1`)

`fitProjectSize` now caps the long side at 7680 as well as the short side at 2160 (`js/app.js`, `MAX_AUTO_LONG`), and `projectIsOversize` also trips on a long side over 7680.
- **Checked:** storage really clamps each side to [16, 7680] on load (`js/storage.js:1006`), so a 16000x4000 import used to become 8640x2160 and be reshaped to 7680 on reopen. That is the bug; the test reproduces it (reverted: "16000x4000 made a canvas 8640x2160 that storage will reshape on reopen").
- **Side effects:** the only callers of `projectIsOversize` are the lag toast and the Canvas dialog's warning, so a project whose long side is over 7680 can now get "tap to fix the lag". Storage clamps to 7680 on load, so that can only be an in-session state. No other caller of `fitProjectSize`.
- **Verdict: land.**

## #1015 guest reconnect clash (`d8fa4fbb`)

Adds a `catchingUp` window (set in `markOffline`, cleared when the host's `tail` or `snap` has arrived and every outstanding transaction is acknowledged) in which new local transactions go out as `q:1` (CAS) and an unchanged rejected offline value is not re-sent as a fresh edit.
- **The fix does what it says:** reverted, the test fails with "the reconnect-time transaction went as q:0, bypassing the host clash check".
- **Where it could stick:** if the window never closes, every later edit goes as `q:1` and a re-set to an earlier offline value is dropped until it does. The host answers a reconnect with a `tail` even when it has missed nothing (`js/collab-host.js:948` returns `{t:'tail', batches: []}`), and a resync sets the flag in `onSnap`, so I could not find a path where it stays open. I did not test a host that never answers.
- **Owner side:** `markOffline` is shared code, but the diff filter is `!isOwner && catchingUp`, so the owner only gets the `queued` flag on entries.
- **Verdict: land.** A follow-up test for "reconnect with no missed batches still ends catch-up" would pin the one path I reasoned about instead of ran.

## #1016 keyboard numeric values (`8c813c78`)

The Move pad's X/Y/Z boxes become focusable spinbuttons (Tab, Enter or Space to type, arrows to step, Shift for x10), effect value inputs get `aria-label`s, and Enter in the type-in box now calls `finish(true)` directly instead of `blur()`.
- Reverted, the test fails: "Volume cannot be reached and identified from the keyboard".
- **This changes the Full editor** (a new tab stop, a focus ring only on keyboard focus, Enter handled differently). Small and invisible to a mouse or finger.
- **One thing I could not check:** Enter used to blur the box, which on a phone closes the keyboard. `finish()` rebuilds the inspector (`FM.inspector.refresh()`, `js/inspector.js:4552`), which removes the element and so should drop focus anyway. **That is reasoning, not a test.** Check on an iPhone: type a Position value, press Return, confirm the keyboard goes away.
- **Verdict: land,** after that one phone check.

## #1040 missing transform (`ba154a37`)

`js/storage.js` (the cheap sanitiser every import, load, undo and collab clone goes through) rebuilds a missing, null or array `layer.transform` from `FM.makeLayer(type)`. Reverted: "Cannot read properties of undefined (reading 'opacity')", which is the crash. I probed `makeLayer` with `zzz`, `constructor`, `group`, `camera`, `audio`, `text`, `video`, `image`, `shape`, `adjustment` and a space: all return a transform. Only the empty string throws, and the diff guards it (`l.type ? l.type : 'shape'`). The sanitiser on `{type:'zzz'}` with no transform rebuilds it. **Verdict: land.**

## #1041 nested styled groups (`a22dbc46`)

`js/compositor.js` replaces `innerOf` (the deepest unit holding an id) with `childOwner` (the nearest nested unit), so each level draws only its immediate child unit. `innerOf` had one reader (`:18479`), which the diff changes, so nothing else loses a field (I grepped). Reverted: "3 styled groups (outer first) render 80, expected 32", the double composite. **Verdict: land.**

## #1059 detect speech (`13e5b1ea`)

`js/captions.js` skips clips that are KNOWN silent and lets a failed decode fall through to the next clip. I checked the one way it could skip a talking clip: `FM.hasAudioTrack` returns `false` for any non-video layer (`js/media.js:937-938`), but `C.audioSources()` only returns `type === 'video'` layers with a media file (`js/captions.js:174-179`), so the filter only skips clips that have been measured silent. Reverted: "default scope did not use the talking clip after silent B-roll".
- Minor: if the first clip fails to decode and a later one decodes but finds no speech, the first error is dropped and he sees the ordinary "no speech" message.
- **Verdict: land.**

## What I did not do

No full suite on the chain (it would have run beside the H13 pre-check and spoiled its timings). No device. No test of #1013's AAC half. Each test was run alone, so an interaction with the rest of the suite is untested.
