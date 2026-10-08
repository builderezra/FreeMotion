# H56: the five order-dependent reds from H52, and what each earlier test leaves behind

Branch `hunt/intermittent-census`. Tree: `origin/main` 842a23de (v17.29 plus notes), headless Chromium 1194 (reports `HeadlessChrome/141.0.0.0`), 1280 and 380. **Measured** = I ran it here. **Read** = I read the line. **Guess** = neither.

## One cause, three leakers (Measured)
Every one of the five reds is the same thing. **A test calls `.pause()` on a running CSS animation (to seek it by `currentTime`, or to hold it at its end), and in this Chromium that animation is then NOT removed when its class goes away.** It stays on the element, paused or finished, and its end frame keeps beating the element's plain CSS for every later test in the page.

`order-deps-scripts/anim-leak.html` (no app, no suite; open it in any Chrome and read the table) isolates it. Result here, `results/anim-leak-lab-output.txt`:

| what the script did to the animation | class removed: animations left | element set to display:none: left |
|---|---|---|
| nothing | 0 | 0 |
| `currentTime =` | 0 | 0 |
| `finish()` | 0 | 0 |
| `updatePlaybackRate()` | 0 | 0 |
| **`pause()`** | **1, still paused** | 0 |
| **`pause()` then `currentTime =`** | **1, still paused** | 0 |
| **`pause()` then `play()`** | **1, still running** | 0 |

The three leakers all do `an.pause()` somewhere (Read): `home push: the editor’s body-level chrome…` (tests.js:21031, `anims.forEach(a => { a.pause(); a.currentTime = 0; })`), `981 the glowing lines run round…` (:110962, `land()` at its first lines: `an.pause(); an.currentTime = …endTime`), and `957 the empty project clapper…` (:103813, `running.forEach(a => { a.pause(); a.currentTime = … })` then `a.play()`).

## The five, one by one

### 1. `home push: the press answers the tap, survives the wait, and hands over without a pop` (tests.js:21251)
**Leaker (Measured by pairs):** `home push: the editor’s body-level chrome travels with the editor, not with itself` (:21031). Pair [`two screens`, `press answers`] green; pair [`body-level chrome`, `press answers`] red; `?only=home push` (the three) red, 2/3.
**Leaked state (Measured, a probe test inserted between them, `results/h56_probe_hp_after2.json`):** after it, `#app` carries `fm-push-in` and `#home-screen` carries `fm-push-out`, both **paused at currentTime 280 ms (their end)**, with the elements' class lists empty and their computed `animation-name` `none`. Alone: no such animations. Their end frame keeps a transform on `#app`; the next test's park (`fm-push-wait`) is a plain declaration and loses ("parked editor sits at x=40… transform matrix(1,0,0,1,39.94,0)").
**Fix (7 lines in the patch, one of three):** keep the animations the test paused in a local, `cancel()` them in its `finally`. After it: the three home-push tests 3/3 at 1280 and at 380 (`results/h56_hp_fixed*.json`).

### 2. `playhead: a rebuild during the return-to-home pop keeps --tl-panel-left honest` (:23937)
**Same leaker, found a different way (Measured):** a prefix bisection, `?after=<test k>&upto=<this test>`, over the whole 425-test prefix (`results/bisect-after-playhead.log`): red from the start (426 tests), red from k=374, **green from k=375**: so test #375, `home push: the editor’s body-level chrome…`, is the leaker. The 38 related-sounding candidates alone with this test were green, so the leak needs more than that pair (see "Not explained" below). With fix 1 applied, `?after=home push: the two screens&upto=playhead…` (51 tests) has this test green at 1280 and 380; on main it is red there (`results/h56_base_G1_*` and `h56_comb_G1_*`).

### 3 and 4. The two `981 review:` tests: the double-tap one (:111099) and the less-motion one (:111179)
**Leaker (Measured by pairs):** `981 the glowing lines run round the add menu’s own edges…` (:110962). Pair with the first `981 a real tap…` (:110894) is NOT RUN here (it needs real touch); pair with `981 asked for less motion…` is green for the less-motion test; **pair with `glowing lines` is red for both**.
**Leaked state (Measured, probe between them, `results/h56_probe_p981a.json`):** `#add-sheet` has **`fm-hinge-up: finished, currentTime 360`** on it with its class gone (alone: none). So the second test's "menu arrives on the 220 ms reduced-motion slide (fm-hinge-up)" control reads the old 360 ms animation, and the first one finds the menu's card still covering the empty area at (71, 696) ("covered by svg in span.addmenu-ic…").
**Fix:** after its closing sleep, `cancel()` whatever animations the sheet still has. With it: `glowing lines` + both reviews: the less-motion test green, the double-tap test reaches its touch step and reports NOT RUN here (the container's driver cannot do real touch; on main it dies earlier on the covered point), at both widths.

### 5. `988 the clapper on timing C rests between snaps…` (:111611)
**Leaker (Measured):** a delta bisection over 30 clapper/add-menu candidates (`results/bisect-988-candidates.log`) ends on **`957 the empty project clapper opens, slams shut…`** (:103813); the pair is red.
**Leaked state (Measured, probe, `results/h56_probe_p988a.json`):** after 957, `#drop-hint` still has **five running `dh-*` animations** (`dh-whack` ×3, `dh-jolt`, `dh-clap`, 6000 ms, infinite, currentTime 1933) and class `dh-t-a`; alone it has none. The 988 test then reads clap timings off `d.getAnimations(...)`, so it measures the stale timing-A animations, and C's "seam" reads −0.001° (shut) instead of > 20°.
**Fix:** cancel the `dh-*` animations in 957's `finally`. With it: 988 is green at 1280 and 380; 957 itself stays red.
**⚠️ 957 is red alone in this container as well** (H52's section 3): its own last check, "the clapper keeps animating behind Home (5 animations)", is the same symptom, because its seek (`pause()` … `play()`) is what makes those animations survive `FM.home.open()`. I did not touch that assertion. It is the one real question left for the laptop (below).

## Proof (Measured)
`order-deps-scripts/order-deps-fixes.patch` (7 lines, tests.js only; the three `cancel()`s) applied to main; groups run at 1280 and 380 (`results/h56_base_*` before, `results/h56_comb_*` after):

| group | red on main (both widths) | after the patch (both widths) |
|---|---|---|
| `after=home push: the two screens` … `upto=playhead…` (51 tests) | `home push: the press answers…`, `playhead: a rebuild…`, and `a comp that costs 200 ms a frame…` | only `a comp that costs 200 ms a frame…` |
| `981 glowing lines` + the two reviews | double-tap, less-motion | double-tap is NOT RUN (touch), less-motion green |
| `957` + `988` | both | 957 only (its own red) |

`a comp that costs 200 ms a frame drops frames instead of seeing…` is red in that range with and without the patch, so it is not this cause (it names a 200 ms-a-frame comp; slow here is plausible: Guess; I did not chase it).

## Could the laptop's suite hit it? (Guess, with what I know)
ship.sh refuses a red suite, and all five tests are in it, so **on the laptop these are green at every ship**. So either its Chrome removes script-paused animations when the class goes, or the state is masked there. I cannot run the laptop. What I can give is a 10-second test that does not need the suite: **open `order-deps-scripts/anim-leak.html` there** (`python3 -m http.server`, any port). If the `pause()` rows say 0, the leak is this container's Chromium and the five reds are an artefact of it; if they say 1, the laptop leaks too and the suite is green there only because something else differs, in which case the three `cancel()`s are worth landing anyway. They are harmless on any browser: they run in `finally` and only touch animations the test itself paused.

## Not explained (so it is not hidden)
- The playhead test is green with the leaker alone beside it and red only when the range from the leaker up to it runs (`after=374`). I did not find which of the 50 tests between completes the picture; fix 1 cures it anyway. It probably needs `home push: the press answers…` (which opens Home through the stubbed push) to run in between.
- The five reds are not new: H52 saw them in all six passes. This is a test-side cleanup, not an app bug: no app file is touched, and nothing here says the app leaks (Read: the app's own code never calls `pause()` on these animations; I did not grep every file).
