# Export "no sound" investigation (#215 / #604 / #677)

Written against `origin/main` b46b47d (v17.23). Report only: nothing in the app or the tests was changed or run for this.
**Verified** = I read the line and quote it. **Guess** = depends on how a real browser behaves, which cannot be learned from the code.

## 1. What the code already does (so the list below is only the leftovers)

The silent-export problem has had four rounds of work. Every path below already speaks somewhere:

| Surface | Where | What it says |
|---|---|---|
| Pre-render warning in the Export box | `js/app.js:5777-5797` (`checkExportAudioSupport`), probe at `js/app.js:5746-5754` | "This export will have no sound… This browser cannot encode AAC." Only when the project has sound AND the browser refuses AAC. |
| Line on the progress overlay (`#export-note`) | `exportSay`, `js/exporter.js:390-401`; node at `index.html:814` | One amber line per loss. Gone when the overlay closes. |
| Toast | e.g. `js/exporter.js:750`, `:770`, `:838`, `:1281`, `:1312`, `:1363` | Drawn **behind** the export overlay (the code says so itself, in the comment at `js/exporter.js:762-764` and at `js/app.js:6263-6270`), so on a phone it is effectively unseen. |
| "Export ready" card | `js/app.js:6270-6282` (`AUDIO_WHY`, then `Sound ✓` / `NO SOUND — <why>` / `no soundtrack`) | The one surface nobody can miss. It only reads `out.audioDropped` and `out.hasAudio` (`js/exporter.js:1620`). |
| Saved report (Settings → last export report) | `js/exporter.js:1575-1615`, stored in `localStorage['fm.lastExportReport']` | `audio TRACK WRITTEN / NO TRACK`, `dropped <flag>`, `drops [...]`, `suppressed [...]`, `AAC encode present / MISSING`. |

The flag that drives the card is `FM._audioTrackDropped`. Its possible values are set at: `all-unreadable` `:748`, `all-suppressed` `:767`, `mix-silent` `:836`, `mix-failed` `:1279`, `aac-unavailable` `:1310`, `encode-failed` `:1359`.

## 2. Every way a phone export can end up without audible sound, ranked

Likelihood is for iPhone Safari first, then Android Chrome. Where I rank by guess, the guess is named.

| # | Cause | Where (verified) | What the user sees today | Likelihood (guess flagged) |
|---|---|---|---|---|
| 1 | **The browser has no AAC encoder** (`AudioEncoder` missing, or `isConfigSupported` false for `mp4a.40.2`). The whole mix is thrown away and the MP4 is video-only. | `js/exporter.js:1289-1320` | Pre-warning in the box; amber line; card says `NO SOUND — this browser cannot encode AAC`; report `NO TRACK / dropped aac-unavailable`. Fully visible. | **Guess:** the most common cause on iPhones that are not on a recent iOS (WebCodecs audio arrived later than WebCodecs video in Safari), and on Android devices whose phone codecs do not expose an AAC encoder. The app's own advice, "open FreeMotion in Safari and export there" (`js/app.js:5794`), shows the authors saw this on a non-Safari browser; an Android user has no Safari to go to. |
| 2 | **One of several clips fails to decode, the rest are fine.** | `js/exporter.js:736-751`. `FM._audioTrackDropped` is set only `if (!any)` (`:748`). | Amber line on the overlay + a toast (both gone or unseen by the time the card appears). Card says **`Sound ✓`** because `audioDropped` is null (`js/app.js:6279-6282`). Report `drops [...]` lists it, but only if he opens the report. | Medium-high on any project with 2+ clips, and the one most likely to read as "my sound is missing but the app said Sound ✓". Verified gap, not a guess. |
| 3 | **The source file is too big to decode on the phone.** `FM.decodeAudio` reads the whole file (`file.arrayBuffer()`) then `decodeAudioData`; any failure returns `null` (`js/media.js:832-848`). The mixer then files the clip under "its audio would not decode" (`js/exporter.js:565-578`). | `js/media.js:832-848`, `js/exporter.js:561-579` | If it is the only clip: `NO SOUND — none of the audio clips could be read` on the card (v14.35 fix). If there are others: cause 2. | **Guess:** high for long 4K iPhone clips; the memory limit is the browser's, not visible in code. A tab kill during this step is not reported at all (nothing is left running to report it). |
| 4 | **An audio track is written but is unplayable** because the encoder's first chunk carries no `decoderConfig.description`. `mp4-muxer` builds the `esds` box from that description (`vendor/mp4-muxer.js:537`) and the exporter never checks it is there (the only uses of `decoderConfig` are at `js/exporter.js:877`, `:909`, `:920`, and none looks at `.description`). | `js/exporter.js:877-920`, `vendor/mp4-muxer.js:537` | Report says `audio TRACK WRITTEN`, card says `Sound ✓`, the file is silent. | **Guess:** depends entirely on whether a given browser's AAC encoder supplies the description. The code cannot tell. This is the one cause that would make the export report lie. Worth a one-line sanity check (see fixes). |
| 5 | **Everything hidden, soloed or at 0 volume.** | `js/exporter.js:512-535`, `:765-771`, `:834-839` | Visible: `all-suppressed` / `mix-silent` on the card. Only when ALL clips are silent; a partly muted project is silent by choice. | Common user error, already well covered. |
| 6 | **A clip with no sound track at all** (time-lapse, screen recording). | `js/exporter.js:577` (`soundTrackInFile(...) === false` → `continue`), `js/media.js:865-912` | Card says `no soundtrack` (honest). `soundTrackInFile` returns `null` whenever it is unsure (`js/media.js:867, 877, 880, 884, 900, 905`), so it can only say "none" when the container's track list proves it. | Correct by design. A false "none" looks very unlikely from the code. |
| 7 | **The mix cannot be built** (`OfflineAudioContext` refuses the length, or throws). | `js/exporter.js:485` (`new OAC(2, length, 48000)` for the whole export), `:1276-1283` | `NO SOUND — the soundtrack could not be built`. | **Guess:** long projects (tens of minutes) on iPhone Safari. The `Float32` mix is `length × 2 channels × 4 bytes` (~23 MB per minute). |
| 8 | **Audio-only export (WAV or M4A) saved by an anchor click after async work.** `runAudioOnlyExport` mixes (awaits), then does `a.click()` (`js/app.js:6000-6003`). It does not use `deliver()`, so it has none of the share-sheet / activation handling that the MP4 path has (`js/exporter.js:66-75`). | `js/app.js:5950-6005` | Toast "Audio exported — 12.3s" while nothing was saved. | **Guess:** iOS Safari can drop a programmatic download that is not inside a tap. Needs a real iPhone to confirm. This is a "no audio file" report, not a silent video, but it is exactly what "export audio gave me nothing" would look like. |
| 9 | **Audio effect chain fails for one clip.** The clip plays dry instead of silent. | `js/exporter.js:682-700` (`console.warn` only, chain set to null, `gain.connect(sink)` at `:725`) | Nothing (the sound is there, just without the effect). | Not a silence cause; listed so it is not mistaken for one. |
| 10 | **Crash-resume mixes audio from a different run.** Audio is re-encoded every run, video parts are replayed, and `audio: !!mix` is part of the resume signature (`js/exporter.js:1331-1333`), so a run that lost its audio cannot resume into one that has it. | `js/exporter.js:1329-1336`, `:1352-1367` | n/a | No path found that causes silence. Recorded as checked. |

Not on the list on purpose: GIF, PNG-frames and "This frame" exports carry no sound by design (the GIF and frames branches, `js/app.js:6188-6193`). `NO_WEBCODECS` (`js/exporter.js:1167-1169`) stops the export outright, it does not produce a mute file.

## 3. Smallest fix for each, and the test that would catch it

| # | Smallest fix | Test (the suite already has the pattern: `66013`, `66109`, `66139`, `67262`, `65509`) |
|---|---|---|
| 1 | When AAC is unavailable, add a "Save the sound as WAV" button to the Export-ready card. `runAudioOnlyExport` already writes a WAV with no AAC (`js/app.js:5987-5991`). Stronger option, **guess on compatibility**: fall back to Opus in the same MP4; the bundled muxer already supports `opus` (`vendor/mp4-muxer.js:844-851`), Chrome encodes Opus everywhere, but Apple players' Opus-in-MP4 support has to be checked on a device first. | Extend `66013`: with a stand-in encoder reporting unsupported, the ready card offers the WAV and the WAV is non-silent. |
| 2 | In `buildAudioMix`, when `dropped.length && any`, set a second flag (for example `FM._audioPartial = dropped.length`) and have `js/app.js:6279` print `Sound ✓ (N clips had no audio)` in the amber style. | New test beside `65509`: one decodable clip + one that fails → card text contains the count and the class `xr-nosound` is set. |
| 3 | Decode in a smaller form when the file is large: the code already has the 8 kHz probe path (`opts.rate`, `js/media.js:835`). For the export, decode only the audio track once and keep `m.audioBuffer` for reuse; or refuse early with a plain message above a size. Needs a real phone to tune the limit. | Existing seam: a 7 MB fixture (`bigFile`, test file around line 85363) can be used to assert the message path; the memory limit itself cannot be unit tested. |
| 4 | After `encodeAudio`, check the first chunk's `meta.decoderConfig.description.byteLength >= 2`; otherwise treat it as `encode-failed` (`js/exporter.js:1357-1365` already handles that flag and writes a video-only file with a message). | Test with a stand-in `AudioEncoder` whose first chunk has no description: card says `NO SOUND — the audio encoder failed`, report says `NO TRACK`. |
| 5 | None needed. | Covered by `66109`, `66139`, `71118`. |
| 6 | None needed. | Covered by test `98167` ("a clip with no sound track at all… exports as no soundtrack"). |
| 7 | Render the mix in segments (the limiter already works in blocks, `js/exporter.js:442-475`) or catch the failure and retry at 24 kHz. | A stand-in `OfflineAudioContext` that throws for lengths above N → `mix-failed` on the card (pattern of `65574`). |
| 8 | Route the audio-only file through `deliver()` (`js/exporter.js:66-75`) and show a "Save" card like the MP4 path (`js/app.js:6225-6260`). | Stub `navigator.share`/click and assert the file was handed over after a delay with no user activation. |

## 4. What I could not verify

- Which browsers expose `AudioEncoder` with AAC today. The code only probes at run time (`js/app.js:5746-5754`, `js/exporter.js:1292-1295`). A short probe page run on a real iPhone and a real Android phone (`AudioEncoder.isConfigSupported({codec:'mp4a.40.2', sampleRate:48000, numberOfChannels:2, bitrate:160000})`, then encode 1 s and print `meta.decoderConfig.description`) would settle causes 1 and 4 in one minute. That is the single most valuable next step.
- Whether iOS drops the audio-only download (cause 8).
- The real memory ceiling of `decodeAudioData` on his iPhone (cause 3).
