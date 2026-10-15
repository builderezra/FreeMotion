# #904 [C] last two + #911 clause 3 — build notes (hunt/904-last, on v17.51 d5c423cc)

Code only. **Nothing here was run in a browser**: no suite, no slice, no server. Checked with `node --check` on every
changed file and `fp.js` for the collab schema. The four new tests have never run. Their tolerances are marked
`TODO(first run): measure`.

## The decisions, quoted from REQUESTS.md

The PM decided this on 11 Oct, under his #1130 rule:
"Flash (darken) gets option B (remove "Darkest"); Blink gets option A (show the true number); the tiny default size goes to 8 px for new ones".

- **Flash (darken), option B:** "B — remove Darkest and keep the look you have (recommended: nothing you've made changes,
  and Depth already does the job)". The other option, A, would have made Darkest the real bottom of every flash, and the
  ten built-in TikTok presets would get lighter.
- **Blink, option A:** "A — keep every existing Blink looking exactly as it does, and make the number honest from now on
  (a Blink showing "2 Hz" would show "1 Hz", same speed; the slider can then reach a real 12 a second)". The other options:
  B would make the numbers right and let existing Blinks speed up. C would leave the speed and only change the label.
- **Snow & Rain (#911 clause 3), option A:** "A — default 8px for NEW ones (saved ones keep 5 via `legacy: 5`)".

## What was built

### 1. Flash (darken): Darkest is retired
- **Catalogue (`js/compositor.js`):** `floor` stays in the catalogue, with `def: 0, legacy: 0.15, retired: 1`. Before, it was `def: 0.15`.
- **New field `retired` (`js/fx-registry.js` paramsOf):** it is copied onto the range control.
  - `rowShown` returns false for a retired control, so the inspector draws no row.
  - `paramWords` skips it, so "darkest" no longer finds the effect in search.
  - `ai-manifest.js` effectVocab skips it, so the AI is not told about it.
  - `audio-react.js` leaves it out of its drive-target list.
- **New instance:** gets `floor: 0`. That can never bite, because a hit never goes below 1 − Depth, which is at least 0.
  Depth alone now takes the flash all the way to black.
- **Kernel:** `var fdF = p.floor == null ? 0.15 : FM.evalProp(...)`. The rest is unchanged.
- **Library filters (`js/filters.js`):** I took `floor:` out of the 11 Tuff/dark recipes (Blackout, Cold Steel,
  Bloodline, Static, Nightdrive, Overdrive, Whiteout, Ash, Midnight, Datamosh, Darkroom). Every one had Depth ≤ 0.4
  and floor ≤ 0.45, so 1 − Depth ≥ 0.6 > floor and the floor never bit. Each look therefore draws exactly as before.
  Without this, a look applied from now on would carry a hidden clamp on Depth with no row to explain it.

### 2. Blink: the true Rate (`hz`)
- **New control:** `{ key: 'hz', label: 'Rate', min: 0.25, max: 12, step: 0.05, def: 1, unit: 'Hz', follows: 'rate', followScale: 0.5 }`.
  This is the row he sees, in blinks per second, up to a real 12.
- **Old `rate`:** stays exactly as it was (0.5–12, def 2), with `retired: 1` added.
- **New field `followScale` (paramsOf, and inspector `fxScrubber.followed`):** while `hz` is absent, the row shows the
  followed `rate` × 0.5. So a saved "4 Hz" now opens reading 2.00Hz, which is how fast it actually blinks.
  Every other following slider has no followScale and reads ×1, as before.
- **New instance:** `makeInstance` skips a following key. A new Blink is therefore still `{rate: 2, duty, min, phase}`
  and draws what a new Blink always drew, one blink a second, shown as 1.00Hz.
- **Moving the Rate:** writes `hz`. The kernel then takes a new branch: cycles = hz·t, or ∫hz when keyframed (queue 913's
  rule), and on while `(cycles + Offset) % 1 < On for`. Without `hz`, the two original `rate` lines run, character for
  character, as `else if` / `else`.

### 3. Snow & Rain: Size 8 for new ones
- `size` is now `def: 8, legacy: 5`. The kernel already draws an absent Size at 5 (`ev('size', 5)`), so it is unchanged.
- **The 482 11.2 test's pins:** `b11Base` builds its "saved instance" from makeInstance, which now writes 8. So I added
  `size: 5` to the five `B11WX_CFG` configs that set no Size. They are saved ones from fc8866f1, which carried 5. The pins
  themselves are untouched. prove.sh will list this test as DEAD (it passes both ways), which is expected for a fixture
  that only changed.

## Why old projects look exactly as before

- **Flash:**
  - A saved flash stores `floor`, and the load sanitiser still keeps it, because the key is still declared.
    I did not delete the param on purpose: the sanitiser keeps only declared keys, so deleting it would strip every saved
    Darkest. Where a saved one bit (Depth > 1 − Darkest), that flash would then get darker.
  - The kernel reads a stored floor through the same expression as before.
  - A saved flash with **no** floor key: before, the render-time fill wrote 0.15 into it (`fxFillValue` fell back to the
    def, 0.15). Now the key declares `legacy: 0.15`, so the fill skips it and the kernel's own fallback is 0.15.
    Same number. This matters because `evalProp(undefined)` is 0; without the `p.floor == null ? 0.15` guard, a saved deep
    flash with no key would have darkened.
  - Filters he already applied keep their stored floors. The library change only affects looks applied from now on, and
    their picture does not move.
- **Blink:**
  - Every saved Blink has `rate` and no `hz`. The sanitiser keeps `rate`, still declared and with the same range.
  - The fill never adds `hz`, because it skips following keys.
  - The kernel runs its two original lines on `rate`, with the same clamp (0.5–12) and the same comp clock. Same frames,
    byte for byte, including keyframed and overshooting-ease rates.
  - I did not migrate `rate` → `hz/2` on load. That would have needed the ≤12 clamp kept per instance, because `hz` 12
    is internally 24, and an `elastic` ease overshooting 12 would no longer clamp. It would also have meant rescaling
    keyframe tangents.
- **Snow & Rain:** a stored Size is kept as is. An absent Size stays absent (fill skips the legacy key, sanitiser leaves
  absent keys absent) and draws at 5, as it did when the fill wrote 5 into it.

## Collab schema
The fingerprint moved:
- Darkest: default and legacy changed.
- Blink: new `hz` control.
- Snow & Rain Size: default and legacy changed.

Changes made:
- `C.SCHEMA_REV` 13 → **14**, with a "Rev 14" comment line.
- `C.SCHEMA_FP` → **5707384916977245**. That is `fp.js . all 14` on this tree; the same tree at rev 13 gives 2279044618114559.
- Re-run: `rev 14, pinned 5707384916977245, fp 5707384916977245, match: true`.

## Busters (index.html)
compositor 218→219, fx-registry 26.34→26.35 (it carried a dotted buster), filters 21→22, inspector 424→425,
audio-react 12→13, ai-manifest 11→12, collab-core 33→34.

## The tests (appended at the end of tests/tests.js), and why each fails on v17.51

1. **`904 Flash (darken) - Darkest is no longer a row, …`**
   - **Fails on main:** `rowShown` returns true for `floor` → "Darkest is still a row in the Flash (darken) panel".
   - **Also holds:**
     - Search tag and AI vocabulary, each with a control.
     - A new flash at Depth 1 goes to 0, with Depth 0.5 = 100 as the control.
     - A saved Darkest 0.4 still holds a 200 grey at 80.
     - With no key, via the fill, it is 30.
     - The sanitiser keeps 0.4.
     - The same three readings through FM.renderScene (TOL904).
     - All 11 library flashes carry floor 0 and draw the same at 40 moments with a 0.45 floor put back, with a 0.95-floor
       control.
2. **`904 Blink - Rate reads true blinks a second …`**
   - **Fails on main:** there is no `hz` control → "Blink has no true Rate (hz)".
   - **Also holds:**
     - The panel shows hz and not rate; On for is the control.
     - The AI is told hz and not rate.
     - A new Blink is still rate 2 with no hz.
     - The sanitiser keeps rate 4.3 and hz 7.5; the fill adds no hz.
     - Kernel counts in 2 s:
       - hz 2 → 4 blinks
       - hz 12 → 24
       - saved rate 2 → 2 (control)
       - saved rate 4 → 4
     - On for/Offset match between hz 1.5 and rate 3 frame for frame.
     - A keyframed hz is integrated: 1→3 Hz gives 4 blinks, where rate(now)×t would give 6.
     - Through FM.renderScene: a saved rate 3 is on and off exactly where the old formula says, and hz 1.5 draws the same
       frames (TOL904 / TOL904B), with an on/off control.
3. **`904 the open Flash (darken) has no Darkest row …`** (async, in the real inspector at 390 and 1280 px)
   - **Fails on main:** "the open Flash (darken) still shows a Darkest row".
   - **Also holds:** a saved `{rate: 4}` Blink shows exactly one Rate row reading `2.00Hz`. The control is On for reading `30%`.
4. **`911 a new Snow & Rain falls in 8 px flakes …`**
   - **Fails on main:** makeInstance gives size 5 → "a new Snow & Rain gets Size 5 px, not 8".
   - **Also holds:**
     - legacy 5 and the fill value 5.
     - The fill and the sanitiser leave an absent Size absent; the sanitiser keeps a stored 5.
     - Through FM.renderScene at 0.6 and 1.9 s: no-Size = Size 5 and new = Size 8, with a 5≠8 control (TOL911).

## Unsure / for the loop session
- **Nothing was run.** Tolerances TOL904 = 2, TOL904B = 0 and TOL911 = 0 are provisional. The renderScene reads assume
  that a layer starting at 0 is drawn at t = 0 and that PIXEL_FX gets the comp time; both are true for start 0 in the
  existing 482 2.3 test.
- **A saved Blink whose old `rate` is keyframed:** the Rate row shows the evaluated rate/2 at the playhead, but its ◆ is
  not lit. The keyframes live on the hidden `rate`. Moving the slider writes a static `hz`, which then wins, so that old
  animation stops applying. It is rare, but it is a user-visible edge.
  - The same applies to a keyframed saved Darkest: it still draws, but it has no row to edit it.
- **The AI can still set `rate`:** ai-ops was not changed. It applies any declared key it is sent, so an AI that sends `rate`
  still sets the old half-rate key. It is no longer told about it.
- **tools/full-unchanged.sh** records "every effect default". It will see Flash's Darkest default (0.15→0), the new
  Blink row and Snow & Rain's 8 px. All of these are intended.
- The 482 11.2 test title still says "saved and new Snow & Rain draw call for call as on fc8866f1". The pins now stand
  for saved ones only. I left the title alone rather than rename a test.
