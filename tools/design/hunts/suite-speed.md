# H11: where the suite's time goes, and what can safely be cut

Against `origin/main` b46b47d3 (v17.23). Nothing in the app, the tests or the tools was changed. Every number below was measured by me in my own container (4 vCPU, headless Chromium 1194 with `--no-sandbox`, **software GL, no GPU**) and is labelled Verified, Guess or Unread.

## How it was measured (so it can be repeated)

The runner only keeps the eight slowest tests (`tests/tests.js:59598`), so I gave the driver a copy of itself (scratch, not committed) that installs a setter on `window.__fmLastTest` before the page loads. `tests/tests.js:59576` writes that name at the start of every test, so each write is a timestamped test start, sent out through `console.debug`. The per-test time is the gap to the next start. **That gives exact seconds for all 2285 tests, not a sample.**

- Pass A: tests 1 to 1926 (to `690 the easing curve…`). Pass C: tests 1928 to 2287, started in a fresh Chrome.
- Two tests are NOT covered: `:97997` (`690 swiping the share sheet…`) and `:98071` (`690 an export holds the screen awake…`) hang the page in my container. They run a real MP4 export through WebCodecs, and the page stops answering for 10 minutes. A third export test (`:98167`) was skipped by the same slicing. That is a limit of my container, not a finding about the suite.
- **87 tests failed in my container** (57 in A, 30 in C), mostly things that need real codecs, a real display or real touch. I did not triage them. They still ran, so their time is counted.

## Headline numbers (Verified, from the timestamps)

| | |
|---|---|
| Tests timed | 2285 |
| Total | **3409 s (57 min)**: A 2383 s, C 1026 s |
| Median test | 0.27 s |
| Tests over 5 s | 151, which are **2024 s (59%)** of the total |
| Slowest 10 / slowest 30 | 734 s (22%) / 1097 s (32%) |
| By family | 921 collab 253 tests, 662 s. 690 hunt tests 168 tests, 655 s. Home, guest and window-width tests (955 to 992) 137 tests, 555 s. 482 polish panels 114 tests, 124 s |

**Caveat that matters for every number here: software GL.** `js/fx-thumbs.js:1064-1070` itself says a stock thumbnail strip is "30 seconds in headless software GL" and "3ms of main thread" on a GPU. So render-bound tests are slower here than on Ezra's Mac and the saving there will be smaller. The #1 test below is 324 s here against about 49 s on a Mac (its own comment, `:63596-63604`).

## The finding that changes what to try: sleeping is not where the time is

I counted every literal `sleep(N)` style call in each test body (once per call site; a loop multiplies it, so this is a floor).

- In the 151 tests over 5 s the literal sleeps add up to **237 s of their 2024 s**.
- In the 206 tests of 2 to 5 s: **196 s of 642 s**.
- So even if every sleep cost nothing, "poll instead of sleep" is worth at most about **7 minutes of 57**, and many of those sleeps ARE the assertion ("nothing moves for 700 ms").

## The 30 slowest tests

| s | where | test | what makes it slow | safe speed-up (no assertion dropped) | est. saving | status |
|---|---|---|---|---|---|---|
| 323.6 | `tests/tests.js:63595` | every tile in the browser picks instead of applying, and Done adds what you pi | `_openCategory` renders every tile's thumbnail; the test's own comment (:63596-63617) says the cost is thumbnail rendering and `js/fx-thumbs.js:1064-1070` says a stock strip is "30 seconds in headless software GL". Assertions are taps, picks and the preview list, not pixels of a thumbnail. | One-line suite seam so `FM.fxThumbs` hands back the plain sample for THIS test (thumbnails keep their own tests). Prove with a mutation that the pick assertions still turn red. | ~300 s here; about 40 s on a Mac with a GPU | Verified driver, Guess saving |
| 120.9 | `tests/tests.js:32485` | 921 S3 when a link says it is open, every channel is open — a bulk send straig | 40 sequential `rtcPair921()` pairings (:32487), each a real loopback WebRTC handshake, nothing else (no sleeps). | Run the 40 pairings in 5 batches of 8 with `Promise.all`; every pairing still asserts its three channels and its own byte (`:32491-32500` unchanged). Needs a check that the pairs share nothing. | ~90 s | Verified driver, Guess saving |
| 63.6 | `tests/tests.js:39910` | 921 S8 adversarial peer fuzz: a minute of malformed, oversized, out-of-order a | A minute of hostile traffic by design (CLAUDE.md: "takes just over a minute on purpose"; loop of 5001 at :39910+). | None proposed. The minute is the claim. | 0 | Unread past the loop count |
| 41.1 | `tests/tests.js:101307` | 967 1 a guest who joins with a code waits for the owner to paste it — no 20-se | Real `sleep(ICE_CONNECT + 3000)` = 23 s (`tests.js:101326`) to prove the guest has not given up past the 20 s clock, plus a second leg. | None safe: the wait is the measurement. A shorter `LIMITS.ICE_CONNECT` would test a different number, and Chrome's own ICE timer cannot be faked. | 0 | Verified |
| 39.4 | `tests/tests.js:110287` | 979 on a PC window from 701px every control on the transport row takes its own | Steps through widths (`setW`: resize event, 3 frames, panel-settle wait, then `elementFromPoint` on every control at three x positions each). | None without dropping a width. Cost is relayout per width in software rendering, not sleeping (1.2 s of literal sleeps in 39 s). | 0 | Verified shape, Guess cause |
| 33.1 | `tests/tests.js:107293` | 955 resizing the window keeps the playhead where it was — 900→1280, 1280→1600, | Four window-width changes (900 to 1280 to 1600 and back), 2.1 s literal sleeps in 33 s. | None without dropping a width. | 0 | Unread |
| 29.1 | `tests/tests.js:106745` | 968 Notes and the Help menu: made big in one project they stay big there, a ne | Zero literal sleeps in 29 s, so it is waiting on real timers or rebuilds. | Needs a profile before any change. | unknown | Unread |
| 28.6 | `tests/tests.js:37099` | 921 S6 the knock lets in, turns away, and declines by itself; a member’s token | Fake relay network (`withFakeNet921`) but 28 s: not sleeps. PBKDF2 is only about 95 ms per code (measured here: 107, 92, 89, 96 ms for 200 000 rounds, `js/collab-signal.js:690-691`), so it is not that either. | Profile first: wrap `until921S6` (`:36419`, 40 ms polls) and the relay helpers with `performance.now` to see where 28 s goes. Do not guess. | unknown | Measured two causes OUT, cause not found |
| 28.3 | `tests/tests.js:102471` | 967 1c the guest waiting for its code to be pasted is told softly when it lose | 967 1c: guest waits for a code to be pasted; real timers (same family as 967 1). | Same as 967 1: the wait is the proof. | 0 | Unread |
| 26.4 | `tests/tests.js:87774` | 931 swiping the New effects strip pauses its auto-scroll well past the old 3 s | 7.2 s literal sleeps and 2 real-input swipes (`realInput924`) in 26 s; asserts an auto-scroll PAUSE, so some of the sleeping is the claim (nothing moves for N ms). | Keep the "nothing moves" waits; convert only readiness waits to polls. | ~2 s | Verified shape |
| 24.3 | `tests/tests.js:111246` | 989 after a real reload the Home arrow draws once - one front from its start t | Window-width or Home-arrow test: resize, frames, settle per step. | None without dropping a width or an animation frame. | 0 | Unread |
| 22.9 | `tests/tests.js:37824` | 921 S6 review: Remove changes the link and the code — the old link reaches nob | Fake relay network family. Not sleeps (0 literal), not PBKDF2 (about 95 ms a code). Cause not found. | Profile first (see 37099). No change proposed until the 28 s is located. | unknown | Measured two causes out |
| 22.7 | `tests/tests.js:103101` | 963 — a chip never cuts a name: at the narrowest PC panels every word of every | Window-width or Home-arrow test: resize, frames, settle per step. | None without dropping a width or an animation frame. | 0 | Unread |
| 21.6 | `tests/tests.js:37059` | 921 S6 with any one relay dead a real join still works, and an offer the three | Fake relay network family. Not sleeps (0 literal), not PBKDF2 (about 95 ms a code). Cause not found. | Profile first (see 37099). No change proposed until the 28 s is located. | unknown | Measured two causes out |
| 21.6 | `tests/tests.js:88457` | 690 Escape closes the Export dialog, Canvas settings, Notes, its Before-you-ex | 1.9 s of literal sleeps in the body. | Convert readiness sleeps to a poll with a ceiling; keep any sleep that asserts "nothing happens in N ms". | ~1 s | Verified count, Guess saving |
| 20.6 | `tests/tests.js:94418` | 690 trimming a speed-ramped clip with its handle keeps every kept frame still  | 0.8 s of literal sleeps in the body. | Convert readiness sleeps to a poll with a ceiling; keep any sleep that asserts "nothing happens in N ms". | ~0 s | Verified count, Guess saving |
| 20.1 | `tests/tests.js:102337` | 967 6c …and with the real ticker: a guest who joined with a code stays online  | Real timers by design (guest waits, seven-second stall, FAILED peer). | None safe: the wait is the measurement. | 0 | Verified for 967 1, unread for this row |
| 19.1 | `tests/tests.js:37898` | 921 S6 review: only a refusal the owner SIGNED ends a shared copy — a link hol | Fake relay network family. Not sleeps (0 literal), not PBKDF2 (about 95 ms a code). Cause not found. | Profile first (see 37099). No change proposed until the 28 s is located. | unknown | Measured two causes out |
| 18.8 | `tests/tests.js:37956` | 921 S6 review: four knocks waiting on the short code do not stop a member comi | Fake relay network family. Not sleeps (0 literal), not PBKDF2 (about 95 ms a code). Cause not found. | Profile first (see 37099). No change proposed until the 28 s is located. | unknown | Measured two causes out |
| 17.8 | `tests/tests.js:25574` | effects: Squish is continuous — a layer swept across a wall one pixel at a tim | No literal sleeps; CPU or render bound (software GL here). | Needs a profile. | unknown | Unread |
| 16.7 | `tests/tests.js:38627` | 921 S7 Remove sends “removed”, revokes the token and rotates the link and code | Fake relay network family. Not sleeps (0 literal), not PBKDF2 (about 95 ms a code). Cause not found. | Profile first (see 37099). No change proposed until the 28 s is located. | unknown | Measured two causes out |
| 16.4 | `tests/tests.js:40477` | 921 S8 an accelerated one-hour soak: the ring, lastBy, pending, the ack cache  | Fake relay network family. Not sleeps (0 literal), not PBKDF2 (about 95 ms a code). Cause not found. | Profile first (see 37099). No change proposed until the 28 s is located. | unknown | Measured two causes out |
| 16.2 | `tests/tests.js:87644` | 930 the Assistant and the Director never stack, and the API key is entered in  | 7.9 s of literal sleeps in the body. | Convert readiness sleeps to a poll with a ceiling; keep any sleep that asserts "nothing happens in N ms". | ~2 s | Verified count, Guess saving |
| 16.0 | `tests/tests.js:103322` | 957 the Home arrow to the + ends outside the + even when Home opens with the + | Window-width or Home-arrow test: resize, frames, settle per step. | None without dropping a width or an animation frame. | 0 | Unread |
| 15.8 | `tests/tests.js:37382` | 921 S6 the version gate speaks on both screens: a newer joiner is told the own | Fake relay network family. Not sleeps (0 literal), not PBKDF2 (about 95 ms a code). Cause not found. | Profile first (see 37099). No change proposed until the 28 s is located. | unknown | Measured two causes out |
| 15.4 | `tests/tests.js:102563` | 967 7c a peer connection that has FAILED is held, not closed — the owner is to | Real timers by design (guest waits, seven-second stall, FAILED peer). | None safe: the wait is the measurement. | 0 | Verified for 967 1, unread for this row |
| 15.2 | `tests/tests.js:111352` | 991 on the phone the New project name clears itself when he goes to type - a r | Window-width or Home-arrow test: resize, frames, settle per step. | None without dropping a width or an animation frame. | 0 | Unread |
| 14.9 | `tests/tests.js:111465` | 989 a Home arrow that has finished drawing stays whole through a tap on Projec | Window-width or Home-arrow test: resize, frames, settle per step. | None without dropping a width or an animation frame. | 0 | Unread |
| 13.5 | `tests/tests.js:38232` | 921 S6 review: the Share panel says when every relay has dropped, and an MQTT  | Fake relay network family. Not sleeps (0 literal), not PBKDF2 (about 95 ms a code). Cause not found. | Profile first (see 37099). No change proposed until the 28 s is located. | unknown | Measured two causes out |
| 13.3 | `tests/tests.js:117044` | 482 3.6 Bass & Treble and 3-Band EQ - Bass at, Treble at, Low at, High at, Mid | No literal sleeps; CPU or render bound (software GL here). | Needs a profile. | unknown | Unread |

## Estimated total saving (computed by code, not by hand)

| lever | here | on a Mac with a GPU |
|---|---|---|
| Readiness sleeps to polls: 433 s of sleeps, assume 40% are readiness waits and a poll costs 25% of the sleep | 130 s | 130 s |
| `every tile…` stops rendering thumbnails | 299 s | 40 s |
| 921 S3 forty pairings in 5 batches of 8 | 91 s | 91 s |
| **Total** | **520 s of 3409 (15%)** | **261 s of about 3134 (8%)** |

The 40% and the batch size are guesses. The rest are measured. **So the honest answer is: about 8 to 15% from safe test edits, not the halving the pass would need.**

## The lever that is bigger, and is not a test change

`tools/ship.sh` runs the whole suite twice (desktop, then 380 px). They are independent passes, so two Chromes on separate profiles and ports could run side by side. On paper that takes the ship from about two passes to about one (114 to about 62 minutes on my numbers). Two cautions, both from CLAUDE.md: a CPU-throttle test (`921 S8 a 500-layer project under a 4× CPU throttle`) says never to run beside another heavy job, and a Mac with less memory may not take two renderers that each reach several GB (see `1085-vmdata.md`). This is a tool change, so it is the builder's call. I did not try it.

## Two small things that would make the next version of this report free

1. `tests/tests.js:59598` could keep every test's `_ms` in `results` (it already measures it at :59597) instead of the eight slowest, so `_cdp.py` can print the top 30 on every run.
2. The two export tests above could ask `VideoEncoder.isConfigSupported` first and skip with a named reason when H.264 is missing. At the moment a missing encoder shows as a 10-minute silent stall, which is exactly the "read as a hang" trap the CLAUDE.md note about the suite time describes.

## What I did not do

I did not change any test, so no saving above was run against the suite. Every "safe" claim still needs the usual proof: the changed test must go red under a mutation of the thing it guards.
