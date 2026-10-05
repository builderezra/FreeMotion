# ChatGPT batch 2: verified against the current code

ChatGPT read snapshot 28104a3e (v17.21). Everything below was re-checked against the current working tree (HEAD 28104a3e
plus the uncommitted v17.22 changes). `js/exporter.js`, `js/storage.js`, `js/app.js`, `js/collab-session.js`,
`js/collab-host.js`, `js/timeline.js`, `vendor/` and `styles.css` have no diff against HEAD, so line numbers there are
exact. `index.html` and `js/inspector.js` are modified in the tree. The index.html lines quoted below were re-read on
1 Oct and are current (414, 638, 697-703, 711, 792, 795, 837, 957).

Nothing here was run on his iPhone. The browser runs mentioned are tools/shot.py runs at 380px (A11, A13). Everything
else is code reading, plus small osascript reproductions where noted (CR1, CR2, A10, the panorama arithmetic).

Sources: `accessibility.md`, `iphone-pwa.md`, `export-audio.md`, `collab-robustness.md`, `test-gaps-VETTED.md`,
`templates-pack-VETTED.md` (all in this folder).

## For Ezra, in plain words

- **The no-sound export bug.** There is one path where the app makes a video whose soundtrack is empty, and the app still
  says "Sound ✓". Nobody has proved this happens on your phone. The app currently can't tell either way, which is why your
  10 Sep report looked fine. The fix is for the app to count the sound it actually wrote and say so. Your next export
  report would then tell us where the sound is lost, and you wouldn't need to send the video file back to the Mac.
- **Panorama photos.** Importing a very wide photo makes a project that changes shape the next time you open it, and the
  photo ends up cut off on the right. It hasn't been seen on screen yet, but the arithmetic is clear.
- **Live collaboration.** If you and a guest both change the same thing while their phone is offline, the guest's old
  change can quietly overwrite yours when they reconnect. This only happens if they were mid-edit at that moment.
- Most of the other findings are screen-reader and keyboard issues. They don't affect how you use the app, so they belong
  in the before-publishing pass.

---

## (1) Confirmed new issues, ranked

The builder should log these as hunt items, with the tier shown. They sort behind his own requests.

### 1a. Export audio: the findings that could explain his no-sound bug (#215 / #604 / #677)

**One finding, reported three times:** EA-V1 (the verifier's own), NEW-1 and EA-11a are the same defect. Log it **once**.

**1. (hunt MEDIUM) The MP4 export can ship an empty audio track while saying "TRACK WRITTEN" and "Sound ✓".**
- **Where:**
  - Encode path: `js/exporter.js:1352-1366`. `audioChunks = []` at :1354, and only a throw nulls `mix`, at :1364.
  - Muxer: built with `audio: mix ? {...}` at `:1372-1378`. Chunks are added at `:1536`, where `if (audioChunks)` is true for an empty array.
  - Report line: `'audio      ' + (mix ? 'TRACK WRITTEN' : 'NO TRACK')` at `:1580`.
  - Ready card: `hasAudio: !!mix` at `:1620`, which makes the card show "Sound ✓" (`js/app.js` ~6281).
  - The vendored muxer writes every declared track, even one with 0 samples (`vendor/mp4-muxer.js:1411-1412`, stsz at `:643`).
  - The audio-only M4A path already refuses this case: `if (!n) return { blob: null, reason: 'no-chunks' }` at `js/exporter.js:1114`.
  - The v9.43 comment at `:1534` ("declared an audio track BECAUSE they exist") is true only when the encoder throws.
- **What he would experience:** in Photos the video is "locked on mute" because the audio track is empty. Meanwhile
  every witness inside the app says it has sound: the report, the card and the #844-style paste. This is the only path in
  the current code that matches his #677 words *"locked on mute in my camera role coz audio was entirely absent"* while the
  app claims success.
- **How it relates to the open items:**
  - #215 / #604 / #677 are parked, waiting on one ask: play the camera-roll copy in Photos (REQUESTS.md:10031-10033,
    21733-21734). Their conclusion that "both halves point past the exporter, at the saved file" (:21732), and #844's
    "the export had sound" (:30076-30118), were drawn from `TRACK WRITTEN`, `mix peak 0.931` and `dropped=no`.
  - All three of those are facts from **before** the encode. They print the same whether the track has 97 AAC frames or 0.
  - Every decode-back on record ran on desktop Chrome's AAC encoder (_q215mux, _604sfx, _604boxes, the 6 Sep PC check,
    hunt 940's AVFoundation read). Nobody has ever counted or decoded the output of the iPhone Safari 26 encoder.
  - So the encoder on his phone is an unclosed boundary that comes *before* Photos. ChatGPT's EA-1 premise, that Photos
    is the only unclosed boundary, is wrong.
  - The 10 Sep file (2.05 s, 27 KB) proves nothing either way. 160 kb/s would be about 41 KB for 2 s, but variable-bitrate
    AAC of a mostly silent mix can be much smaller, and Chrome wrote a 2 s tone as 9858 bytes (REQUESTS.md:21730). He also
    never said that particular export was silent.
- **Fix direction:**
  - After `encodeAudio` in `run()`, treat `!audioChunks.length` like an encode failure: set
    `FM._audioTrackDropped = 'no-chunks'`, call `exportSay` WITHOUT SOUND, add the reason to `AUDIO_WHY`, and set
    `mix = null; audioChunks = null` **before** the muxer is built. This mirrors `:1114`.
  - Drive the report line and `hasAudio` from the chunk count, not from `mix`. Write
    `audio      TRACK WRITTEN · N AAC frames · X KB · Y.YYs`.
  - Cheap and decisive extra: decode the encoded chunks back on the device with `AudioDecoder`. `aacPriming` already does
    this on the phone at `js/exporter.js:888-893`. Record a `decoded peak` line.
- **Severity: medium, not high.** Whether Safari 26 on iOS ever emits zero chunks without an error is unproven. If it
  does, it is likely his bug. If it does not, the count still turns his next paste into a definite answer.
- **Builder's test (suite):**
  - Stub `window.AudioEncoder` so that `isConfigSupported` returns `{supported:true}`, `configure` and `encode` do nothing,
    `flush` resolves, and `output` never fires. (`aacPriming` then returns 0 by itself.)
  - Run `FM.exporter.run` with `onReady` on a scene with an audible WAV clip.
  - Assert all of these:
    - The MP4 bytes contain neither `soun` nor `mp4a`.
    - `FM._audioTrackDropped === 'no-chunks'`.
    - The ready card says NO SOUND, and `hasAudio` is false.
    - The report line does not say TRACK WRITTEN.
  - Positive control: the real encoder gives N > 0 frames, the "N AAC frames" line, a decoded peak above 0, and stsz
    about `ceil(48000·dur/1024)`.
  - Mutation: delete the new length guard, and revert the card to `!!mix`. Both must turn the test red.
  - Note: the existing `q215TrackScan` (`tests/tests.js:65994`) only checks that the bytes `soun`/`mp4a` are present, and
    an empty track passes it.
- **Ezra's test (once the count ships, and only then):**
  1. Export a clip that has sound.
  2. Save it to Photos and play it there.
  3. If it is muted, paste the export report, the same as 10 Sep.
  4. Read the `audio` line:
     - **0 frames:** the phone's encoder is the cause, and that is fixable in the app.
     - **More than 0 frames and a decoded peak above 0:** the sound reached the file, and the Photos import is the cause.
       Only then is the Photos-vs-Files comparison worth asking for.
  - **Do not add a second ask before this.** The existing #215 ask stays, sharpened by the count.

**Other export-audio findings and how they affect the bug:**
- **EA-2 (priming trim fallback):** at worst it causes a 44 ms offset, not silence. It also landed in v17.01, after the
  10 Sep export. The trim runs on WebKit and has never been measured there, but the chunk count above would expose an
  empty result from it too.
- **EA-9 aside:** CoreMedia drops about 2112 samples (about 44 ms) when a file has no edts box. That is not silence.
- **EA-10 (quiet audio or wrong output):** ruled out by his own words and the 0.931 peak (section 3).

### 1b. Everything else, ranked

| # | Tier | Issue (source id) | Current file:line | What the user experiences | Fix direction | Test idea |
|---|---|---|---|---|---|---|
| 2 | hunt HIGH (from test-gaps vetting #1) | A panorama import makes a canvas that changes shape when the project is reopened | `js/app.js:3020-3026` (`fitProjectSize` caps only the short side, at 2160) vs `js/storage.js:1004-1010` (`clampProjectDims` caps each side at 7680, called at `:890`, `:1777`). The oversize warning at `js/app.js:2982` checks only the short side | 16000×4000 → 8640×2160 project → reopens as 7680×2160. 9000×2000 is not capped at import and reopens as 7680×2000. The photo is then off-centre with its right edge cut, and nothing tells him. Arithmetic reproduced; the on-screen effect is inferred, not seen | Cap the long side at 7680 in `fitProjectSize` too, keeping the aspect ratio. Make the warning check both sides | Unit: `fitProjectSize(16000,4000)` has both sides ≤ 7680. Round trip: import a 16000×4000 still, save, reopen, and assert the dims are unchanged and the layer is still centred. Mutation: drop the long-side cap |
| 3 | hunt MEDIUM (CR1) | Edits a guest makes while offline go out without the clash check if they edit again before the host's catch-up reply, and silently overwrite the owner's newer change | `js/collab-session.js:287` (pushLocal entry has no `queued`), `:1219` (runStep, the same), `:1367-1371` (markOffline flags only entries that exist), `:350` (q=0), `js/collab-host.js:873` (CAS only when q===1), `:861` (dup drop) | Owner and guest change the same thing during an outage. The guest reconnects mid-drag, and the guest's stale value wins with no clash. Reproduced in JSC with the real modules. Not specific to Undo/Redo, as ChatGPT said | Keep `catchingUp` from markOffline until replayOutstanding/onSnap. Mark entries created while offline or catching up as `queued:true`, or defer flushOutstanding until the replay | Extend "921 S2 … wire is cut": guest offline, rename A, owner renames A, guest `setOnline(true)` and edits again *before* the tail. Assert the offline cid went out q:1, the owner's name survives and the ack carries a clash. Add an Undo variant. Prove with mutate.sh |
| 4 | hunt MEDIUM (A9) | Volume and Position/Scale/Size/Skew values cannot be reached or changed from a keyboard | `js/inspector.js:4384-4387` (`mt-vbox-val` is a plain div), `:4540` (startEdit runs only from a pointer tap), Volume `:5616/:5629`, transforms `:4732-4736`, `:5232-5244`, `:5363`. Effect scrubbers `:898-1076` do have number inputs, but those have no accessible name | On PC with a keyboard, there is no way to type a volume or position. Effect values can be typed | `.mt-vbox-val`: tabIndex 0, role=spinbutton, aria-label, Enter calls startEdit, arrow keys step. Give each `.fx-scrub-val` `aria-label=p.label`. Optionally make `.fx-scrub` a role=slider | Tab to the Volume box, press Enter, type 50, press Enter: volume is 0.5. Every `.fx-scrub-val` has a name |
| 5 | hunt LOW (A1) | In the editor, Tab always cycles layers, even when a button has focus, so Tab never moves through the controls | `js/app.js:8956` (preventDefault unless inEdit at `:8796` or an overlay owns the screen at `:8771-8785`). Layer head is a plain div at `js/timeline.js:1345`, eye/lock spans at `:1349/:1369` | A keyboard user cannot Tab around the editor. Layer rows are not exposed to a screen reader. A/S/D, the arrows and ,/. do still move and trim clips (ChatGPT and the orchestrator both missed this) | Cycle layers only when activeElement is body or the timeline. Roving tabindex plus role/aria-label/aria-selected on `.tl-head` | Focus `#btn-export` and press Tab: defaultPrevented is false and the selection is unchanged. Control: with focus on body, Tab still cycles |
| 6 | hunt LOW (IP-4) | The persistent-storage result is thrown away, so nobody can tell whether his install is protected from eviction | `js/storage.js:326-333` (only call site). The quota toast `warnStore` is at `:313-324` | Nothing visible. A diagnosis gap if projects ever vanish | Store `FM.storagePersisted`, then show it in the quota toast and the Labs report. Otherwise stay silent | Stub persisted/persist to resolve false and assert `FM.storagePersisted === false`. Force a quota error: the toast mentions protection |
| 7 | hunt LOW (CR2) | Offline Undo/Redo steps skip the outbox op/byte cap, and acks then make the counters undercount | `js/collab-session.js:1219` (no accounting), `:296-304` (accounting only in pushLocal), `:913-914` (onAck subtracts every entry), limits `js/collab-core.js:77` | Long outage plus repeated Undo of big steps: memory grows past the cap (reproduced at 25,200 ops against the 5000 cap). The cost is a slow resend, not data loss. ChatGPT's "medium" is too high | One `enqueue(entry)` helper for pushLocal, runStep and recoverOutbox. runStep honours `outboxFull` | 1200-layer guest offline: big edit, then alternate undo/redo until past the cap. `outboxFull` becomes true and `onOutboxFull` fires. After the acks, an edit just over the cap still trips it |
| 8 | hunt LOW (CR3) | The held-message queue is uncapped while frozen or busy. On the owner it fills at the peers' rate | `js/collab-session.js:117`, `:625` (owner), `:817` (guest), `:1282-1291` (drain) | Honest use: negligible. A buggy or hostile Editor during a long export could grow the owner's memory without limit | Cap by count and bytes. Past the cap, drop and resync from `host.base` | Owner with `FM._exporting=true`, feed Editor txs past the cap: `S._queued()` stays at or below the cap. After unfreeze the live doc hashes equal to base |
| 9 | hunt LOW (A4 + A6) | The New project, Export, Canvas and export-progress dialogs have no role=dialog, aria-modal or name, and export progress and completion are silent | `index.html:711, 792, 795, 837, 957`; `js/app.js` ~6142/6170/6200 (status text), ~6244 (ready card, no focus) | Screen reader only: the dialogs are not announced, and export progress and "Done" are never spoken | Markup: role, aria-modal, aria-labelledby (give the titles ids). `#export-status` role=status with throttled milestones. `#export-bar` role=progressbar. Focus the ready card | A static DOM test for the four ids. An export test: the live text says Done when `#export-ready` unhides, and focus is inside it |
| 10 | hunt LOW (A4b) | No focus trap and no focus return on those three dialogs | `js/app.js:5720-5727`, `:5861-5864`, `:7100-7140`, `:8240-8300`; `js/home.js:3035`, `:3259` | Keyboard: Tab walks the editor behind the Export scrim, and closing the dialog drops focus | One `FM.modalFocus(dialog, opener)` helper: inert the siblings, focus the first control, restore the opener | Open Export from `#btn-export`: focus is inside, the editor is inert. On close, focus is back on `#btn-export`. Mutate the restore line |
| 11 | hunt LOW (A8) | Ordinary toasts (244 call sites, the app's main error channel) are not announced | `index.html:638`; `js/app.js:1393-1396` (strips role) | Screen reader: "storage full" and similar messages are silent | A permanent visually hidden `#toast-sr` role=status, written on the next frame. Not on `#toast` itself, because the tappable branch swaps its role | `FM.toast('hello')` puts the text in `#toast-sr`. The tappable path keeps role=status |
| 12 | hunt LOW (A14) | The keyframe ◆ buttons are named just "◆" and expose no state | `js/inspector.js:1137-1138`, `1346-1347`, `1378-1379`, `1408-1409` (these lines may shift: inspector.js is modified in the tree) | Screen reader hears "◆" with no parameter and no state. There are three states, so plain aria-pressed is not enough | A single helper that sets an aria-label from the state and the parameter ("Add Blur keyframe at playhead") | The label contains "Animate" before the click and "Remove"/"keyframe" after it (re-acquire the button). One control from each builder |
| 13 | hunt LOW (A10) | Glass-theme `--text-faint` is about 4.0:1 (needs 4.5) | Tokens in `theme-glass.css`; light-Home override `theme-glass.css:1125` (#7d8798 on #f7f9fc = 3.44); `.cat-num` opacity `styles.css` (hidden on touch at `:1129`) | Small secondary labels are a bit faint. ChatGPT's 2.58 is for the dark theme, which no longer exists (`js/settings.js:16`, `:123`). "High" was wrong | Lighten to about #7593a0 and darken the light override to about #66707f. Design rule: show him before and after (about 66 uses) | Computed colour composited over the nearest opaque background gives a ratio of at least 4.5 |
| 14 | hunt LOW (A5) | Home tabs don't expose which tab is selected | `index.html:697-703`; `js/home.js:2540` (class only), `:3061` | Screen reader can't hear which tab is on. `home.js:2849-2852` already does aria-pressed for the aspect buttons | Set `aria-pressed` (or `aria-selected` plus role=tab) next to the class toggle | Click Templates: it is true and the other three are false |
| 15 | hunt LOW (A2) | Keyframe diamonds are pointer-only. No keyboard way to read a keyframe's time or retime it | `js/timeline.js:2663-2671`; partial path via the inspector ◆ (`js/inspector.js:1137-1139`) and frame stepping | Keyboard users can add and delete keyframes at the playhead but not move one | Previous/next keyframe shortcuts plus a modifier nudge that reuses the drag's retime code | Next-key goes to 0.5 s. The nudge moves the key by 1/fps with its value unchanged |
| 16 | hunt LOW (A15) | The preview canvas has no accessible name | `index.html:414` | Screen reader announces nothing for the main surface | `role="img" aria-label="Video preview"` | The aria-label is non-empty and the role is img |
| 17 | hunt LOW (A13) | Long project names are cut off on one line with no tooltip | `styles.css:5504`; `js/home.js:1371, 1989, 2088, 2196` (aria-label has the full name at `:1360`) | A long name shows "…". A visual change, so draw options first | Two-line clamp and/or a `title` | A 60-character name shows two lines or the title equals the full name |
| 18 | taste call, do not queue unasked (A11) | Home search opener is 38×38 and the clear button 34×34 (under 44) | `styles.css:5021`, `:5032`; measured live at 380px | Fine for him: both clear the app's own 24px floor (`styles.css:6045`). He has never asked for 44px, and he declined larger keyframe targets in #469 | Only if he wants it: an invisible 44px `::after`, checked against the neighbouring Select button | elementFromPoint at ±21px hits the button, with a control on Select |
| 19 | hunt LOW (CR4) | Comment "x min ago" mixes the host's clock with the viewer's | `js/collab-host.js:532-533`; `js/collab-comments.js:79-85`; the pong's `hc` (`js/collab-session.js:617`) is never read | Only with a device clock that is manually wrong. Cosmetic | Estimate `hostOffset` from pongs and use it in `ago()` | Guest clock 3 h behind: a fresh comment reads "just now" |
| 20 | hunt LOW (aside in IP-8) | GIF and PNG-frame exports never offer the share sheet | `js/exporter.js:1730`, `:1800` (plain `download()`) | On iPhone a GIF lands in Files, not Photos | Route GIF through the ready card and `deliver()` | Stub canShare/share: runGif offers share |
| 21 | hunt LOW (aside in A16) | One smooth scroll ignores reduced motion | `js/settings.js:463` | A single short scroll in Settings | Use `behavior: reduce ? 'auto' : 'smooth'` | Stubbed matchMedia: scrollIntoView gets 'auto' |

---

## (2) Already known

| Id | Claim | Known as |
|---|---|---|
| A12 | Keyframe ◆ hit area is 40, not 44 | #897 (hunt MEDIUM, fixed v16.22). 40 was chosen on purpose so it clears `.fx-ease`, and 44 would bring the mis-tap back. #469: he declined bigger targets |
| A17 | Non-findings list | #809 is **closed** (v15.90), not an open bug as the report said. #98 and #575 are closed |
| IP-0 | No new iPhone defect | Matches #470, #215/#604/#677, #430, audits/923-brainstorm.json:143 |
| IP-3 | Export is WebCodecs-only, AAC probed first | #215 / #604 / #677. MediaRecorder is also used in `js/sample.js:79-82`, never for export |
| IP-5 | OS can kill a mid-export lock | #47 (open), #940 v17.00 wake lock (REQUESTS.md:33146). The report's "#942/#943" citation is wrong |
| IP-7 | No popstate, so Back does not close panels | #654 note (REQUESTS.md:26088), waiting on his "back closes it". `collab-core.js:494` replaceState is only fragment cleanup |
| IP-8 | Share-sheet Save flow | #940 v17.00 (REQUESTS.md:33145). "#17.00" in the report is a version, not an item |
| IP-9 | SW updates every launch | #306, #430 (`index.html:1171-1189`, `sw.js:41/48/130`) |
| EA-1 | Photos playback is the open boundary | The #215 ask (REQUESTS.md:10031-10033). Its "only boundary" premise is wrong (see 1a) |
| EA-2 | Priming-trim fallback | v17.01 (REQUESTS.md:33180-33184), audits 940/941. Offset only, never silence |
| EA-4 | AAC encoded before the muxer | #215 v7.91/v7.92/v14.35. True for throws only, and the zero-output case is 1a |
| EA-5 | Box walk covered an old file only | #604 (REQUESTS.md:21640-21660). Chrome-encoded only, so 1a's on-device count is the cheaper close |
| EA-7 | Photos file is not the same bytes | #604 deliver() reasoning; hunt 940 / 5d0184fd |
| EA-8 | Photos treats the MP4 differently | #604's own question; hunt 940 AVAssetReader on a Chrome file. A Safari-made file has never been checked |
| EA-9 | Sample-table defect | `tests/_q215mux.html`, `tests/_604boxes.html` (Chrome files). The zero-sample case is 1a |
| EA-11 | MP4 inspection checklist | The #604/#215 procedure. Its step 5 (stsz > 0) is the one that matters, see 1a |

## (3) Wrong, or fixed since

- **A3 (no keyboard scrub): wrong.** `,`/`.` step a frame (`js/app.js:8938-8939`), the arrows step when nothing is
  selected (`:8935-8936`), Home/End jump (`:8950-8951`) and Space plays. The only residue is a screen-reader slider, which
  is folded into A1.
- **A7 (PC selection count not announced): wrong.** `#t-sel` never holds a count. `#m-selcount` is aria-live but is hidden
  on desktop (`styles.css:4003`). PC shows no count to anyone, which would be a feature question.
- **EA-3 (mixer null without OfflineAudioContext): wrong as a cause.** `mix peak 0.931` and TRACK WRITTEN need a non-null
  mix. An optional `no-offline-audio` flag would be cosmetic only.
- **EA-10 (quiet or misrouted audio): wrong.** "Locked on mute… entirely absent" means no usable track, not a quiet one,
  and the peak was 0.931.
- **Unverifiable, no defect claimed:**
  - A16: reduced-motion sweep. Spot-check clean apart from #21 above.
  - IP-1: 7680² memory on the phone. Needs a device run; don't act without one.
  - IP-2: AudioContext after backgrounding. The mitigation is present.
  - IP-6: safe areas. Configured; needs hardware to judge.
  - EA-6: "silent in the delivered file". Can't be ruled out, and 1a makes it decidable.
  - EA-12: Apple platform claims. His report shows AudioEncoder present.
- **Fixed since v17.21:** none. No file these findings touch changed between 28104a3e and the current tree, except
  `index.html`/`js/inspector.js`, and their findings (A4-A6, A9, A14, A15) still hold.

## (4) Test gaps worth adding (from `test-gaps-VETTED.md`)

ChatGPT searched test names only. Four of its 25 are already covered:
- #17 SW stale build: `tests/tests.js:61866`, `:99761`.
- #18 suspend mid-play: `:96498`, `:22707`.
- #23 template aspect fit: `:92282`, `:92230`, `:93638`.
- Most of #6, GIF reopen: `:92308`, `:92400`.

Thirteen more are partly covered. The ones worth adding, ranked:

1. **HIGH:** panorama reshape on reopen. This is a defect, not just a missing test; it is item 2 in section 1.
2. **MEDIUM:** one unreadable file in a multi-file pick is named and the rest still import (`js/app.js:5489-5531`; the
   suite only calls it with an empty list, `:8983`).
3. **MEDIUM:** a GIF over the memory budget is shrunk but drawn full size, and freed on removal (`js/media.js:727`, `:59`,
   `:793`; the fixtures are 4×4, so the shrink never runs).
4. **MEDIUM:** the mic goes away mid-take. This needs app code too: `js/voice-rec.js` listens for no track `ended` or `mute`.
5. **MEDIUM:** rotating 390 → 844 crosses into Studio and keeps the selection, panel and playhead (the existing test at
   `:107306` never crosses 700).
6. **MEDIUM:** a JPEG with an EXIF rotation tag shows upright everywhere, including export ("exif" appears 0 times in the suite).
7. **MEDIUM:** a custom font travels inside a template or project file (`:69743` passes with an empty fonts list).
8. **LOW (8-12):**
   - 8: replace media with a shorter clip, with trim or speed ramp.
   - 9: Try again after a refused mic.
   - 10: projects at 24/25/48/50/60/120 fps reopen intact.
   - 11: the boot persist request (pairs with IP-4).
   - 12: 200% zoom, tested as a ~196px width.

**Device-only (a manual checklist, not hunt items):** #3, #4, #5, #9, #10, #14, #16, #18, #24, and the HEIC half of #2.

## (5) Templates (`templates-pack-VETTED.md`)

- **Result:** 20 recipes. 9 are ready and 11 need the corrections in the file. None is impossible, but none can be built
  exactly as ChatGPT wrote it. Four systematic errors, corrected in every recipe:
  - **Positions:** x/y are absolute pixels from the top-left (`js/app.js:3058`, `js/compositor.js:15222`), not offsets
    from the centre.
  - **Media scale:** media placeholders must be stills exactly the size of their box (`js/app.js:4698`).
  - **Stacking:** `layers[0]` is the top layer (`js/compositor.js:17776`).
  - **Text size:** the field is `fontSize`.
- **Slots:** about 6 slots or fewer each, because every visible layer becomes a slot (`js/template-fill.js:46`). No
  caption tracks (`:225`). Use `wrapWidth`, not typed line breaks.
- **Top 6 to render first for his pick (#545)** — between them they cover all four frame shapes and all three slot kinds:
  - #1 Hook Intro
  - #2 Photo Story
  - #5 Quote Card
  - #10 Before/After
  - #13 Countdown
  - #11 Podcast Clip (with the Audio Drive disc, `js/behaviors.js:65`)
- **Decisions for him:**
  - **How a pack ships.** A template file currently imports as a project. The choices are a one-time seed, a "Get starter
    templates" button, or files he imports himself.
  - **Four names clash with our own:** Split Timeline, The Play, Daily Cut and Keep This.
  - **The #619 fill-in sheet** is still waiting for him to look at it.

## (6) ChatGPT's hit rate this batch

47 verdicts in total.

| Verdict | Count | Items |
|---|---|---|
| Confirmed new | 21 | 19 distinct issues. EA-V1, NEW-1 and EA-11a are one defect, and A4/A6 overlap on `#export-status` |
| Already known | 16 | Several are no-defect headlines or procedures |
| Wrong | 4 | A3, A7, EA-3, EA-10 |
| Unverifiable | 6 | |

- **ChatGPT's own claims:** of the 21 confirmed-new verdicts, 18 are ChatGPT's own claims, and 15 of those are low.
  - 13 accessibility items, IP-4 and CR1-4.
- **The most important finding was not ChatGPT's.** The empty-audio-track path (1a) came from the verifiers. ChatGPT's
  export report argued the opposite: that Photos was the only open boundary.
- **Citations:** reliable again. Nearly every file:line was within 1-2 lines.
  - A few item numbers were wrong: #942/#943, "#17.00", and #809 described as open.
- **Severity: over-rated as in batch 1.**
  - Over-rated: A10 high → low, CR2 medium → low, A5 and A8 medium → low.
  - Under-rated: A9 (volume and transforms are entirely keyboard-unreachable).
  - Wrong scope: CR1. It is not just Undo/Redo.
- **Reach: still weak.** It missed existing keyboard paths (A1-A3) and tests under other names (4 test gaps already
  covered). All of its test gaps were written as iPhone-only checks.
- **New weak spot:** it treated tags such as 44px targets and "requested" as if he had asked for them. He has not
  (A11, #469).
- **Templates:** structurally wrong in the same four ways across all 20, though the ideas are usable.
