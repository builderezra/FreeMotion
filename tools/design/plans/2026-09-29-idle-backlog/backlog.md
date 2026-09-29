# #966 idle backlog — polish, new candidates, bugs

Written 29 Sep 2026 against `ea1ff320` (v17.12). This is the menu the loop works from when `next.sh` prints IDLE STEER. His words (#966): *"you can add new effects. You can add new filters. You can add new sound effects you can polish other effects just giving them more features … more choices always better … this is the complex version we want as much choice as possible"*.

Sources: four read-only inventories (colour/blur/stylize 82 effects, filters 106, distort/drawing/procedural/matte 126, audio 57 incl. 30 sound effects). They were merged and de-duplicated. The doubtful "today" claims were checked against the code (see §0.2). Nothing was run, so every behaviour below comes from reading the code unless it says "measured".

The page for Ezra's phone is [for-ezra.md](for-ezra.md).

---

## 0. Rules for the builder (read once)

### 0.1 How to work this list

1. **Log a batch only when you are idle and about to build it.** Do not log all 15 up front. Oldest-first means a batch logged today as #990 would be worked before anything he types tomorrow (#995). Only the `(hunt …)` tier sorts behind his words (`tools/_classify.py:287`), and these batches are not hunt findings. So log one batch, ship it, log the next.
2. **Log the §C bugs as hunt items first**, each with `(hunt HIGH|MEDIUM|LOW #n)`, because they sort behind his words anyway. When an A item also fixes a C item, the release closes both. Name both as `queue NNN` in the POLISH-LOG line, and give each its own test that fails today (prove.sh wants one per item).
3. **Polish = new controls on an existing effect.** It ships with a before/after picture. **New effects, new filter looks, new sound packs, and any new button or layout in a panel** go through an options sheet first (#545: draw, render at the shipped size, he picks, "recommended" beside the best).
4. **New names:** check every new effect or control name against `tools/design/954-effect-names.md` (#954, move away from Alight Motion names).

### 0.2 What the spot-check found (so nobody re-checks it)

- **Confirmed by reading HEAD:**
  - Film Grain `size` has no `unit:'px'` (compositor.js:421).
  - Chroma Key Pro despill is green-only (4545-4547).
  - Only the first Chroma Key and the first Luma Key run (15214-15215).
  - The two vignette renderers disagree (15251-15269 vs 7191).
  - Drop Shadow skips pixels with `dsa>0` (6133).
  - Card Flip is `scale(-1)` (11327-11345).
  - Wiggle is unseeded (11784). Shake, Swing, Spin and Pulse take no `expand` (11797, 11849, 11864, 11880).
  - Mirror's plate is project-sized (12456-12462).
  - Night Vision runs `y%3` per plate row, with no ps (7353-7363).
  - Sharpen skips an r-pixel border (4919-4921).
  - Light Leak's `ph=t*0.15` (6910).
  - Only the nine CSS effects consult `ctxFilterOK()` (1615, 1695, 1722, 14827). Halation (10615/10618), Compound Blur (8577), Backfill (14390/14394), Liquid Glass (11405) and the Footage-blur mask (11151) set `ctx.filter='blur(…)'` with no fallback.
- **The filter-on-adjustment-layer claim holds (HIGH, §C1):**
  - The Filters tab is offered on an adjustment layer (`visualSideOk` inspector.js:3712; `okFilters` 3727).
  - `fitToLayer` keeps the container with its ADJ_OK children (fx-registry.js:645-651).
  - `effectFilter` reads top-level entries only and has no `'filter'` case (compositor.js:1835-1893).
  - `applyAdjustment` reads top-level PIXEL_ADJ only (15428-15430).
  - The container is only dispatched per-layer (3356), and adjustment layers return before that (14680).
- **Audio:**
  - There are 27 effects: 23 named plus 4 `filterDef` plain filters. 11 have Mix, and Vocal Remove uses `amount` as its wet/dry.
  - `signature()` is type + enabled only (audio-fx-live.js:86-95).
  - **`sanitizeAudioFx` fills a missing key with `def` (storage.js:1179-1181). Audio has no `legacy`**, so every new audio default must reproduce today's sound exactly (or add `legacy`, see 7.1).
  - The Limiter's hidden makeup is spec maths. With knee 0 and ratio 20, makeup = −0.6 × (0.95·T) = −0.57·T dB.
  - Flanger and Phaser each put a DelayNode inside a cycle, and the spec clamps a cycled delay to at least one render quantum (~2.7 ms at 48 kHz).
  - Ring Mod's >1024 Hz clamp is engine behaviour (Chromium's max playback rate), so **measure it before fixing**.
- **De-duplications:**
  - Filter blend/apply (two inventories) is one item: 4.6.
  - Vignette, Film Grain, Light/Soft Glow, Temperature, Highlights & Shadows, Colour Balance, Light Leak, CRT, Halftone and Frame Stutter each became one merged item.
  - Tritone lives on Gradient Map only (5.6). Duotone keeps just a blend.
  - Echo (two inventories), Oil Paint (three), Colour Wheels, Tone Curve, B&W Mixer, LUT, Clarity and Film Damage are one new-candidate each.
  - Where two inventories disagreed on a default, the one that reproduces today wins: Vignette roundness 100 = today's circle, and H&S tonal width 100 = today's weights.
- **Already asked, do not re-ask:**
  - **Corner Pin, LUT import and Curves** have been waiting for "a name, or none" since the EFFECTS-PLAN entry (REQUESTS.md:5405-5410). B19, B55 and B56 fold into that question.
  - **#912's ten filters** (Sepia, Digicam, Portra, Moody, Cyberpunk, Tungsten, Airy, Colour Splash, Cyanotype, HDR) are built on branch `fm912-filters` and waiting on his pick (Q12). B8's eight looks go on the same sheet or after it, and no names clash.
  - **#904's two open items** (Blink rate is half its label; Flash (darken) Darkest is inert) wait on his A/B. **Do not touch Darkest.** Item 2.3 adds a rhythm and leaves Darkest alone.

### 0.3 Build rules that apply to every item

- **A new key's `def` is what every filter recipe gets.** `filters.makeInstance` fills missing keys from the registry defaults. If `def` changes the look, all 56 filters change and queue 675's distance test fires. So a new visual key's `def` must be today's look. Use `legacy` only where a NEW instance should differ from a saved one (the Film Grain Round pattern). And check that no recipe sets the key.
- **Visual:** declare every new key in the catalogue entry (compositor.js `EFFECTS`) so the sanitiser keeps it (the whitelist-drift lesson). Give px-sized keys `unit:'px'` so `pxToPlate` scales them. An `options` key needs `legacy` when "absent" must read as the old behaviour.
- **Audio "bypass pair":** do not insert a filter only when a value leaves its default, because that forces a live rebuild mid-drag. Always build the node, and route `in → [node → gOn] + [gOff] → out`. At the default gOn = 0 and gOff = 1, which is float-exact (x·1 + y·0 = x), so saved projects render byte-identical and a slider move is one pair of `setValueAtTime`.
- **Stateless in t.** Every seed, flicker and boil is a hash of (t, seed), never `Math.random`, so preview = export = scrub.
- **Tests:** the seams are `FM._FX_TABLES.PIXEL_FX`, `FM._pxToPlate`, `FM.fxRegistry.makeInstance`, `FM.renderScene` + `offscreen()`, `FM.effectFilter`, `FM.buildAudioFxChain(new OfflineAudioContext(…), {audioFx:[…]}, 0)`, `FM.sfx.list()`. Name tests `'966 …'`. Each test below fails on HEAD.

---

## A. POLISH — ranked by value to Ezra (visible, commonly used, cheap first), one batch per release

| # | Batch | Items | Size | Needs a picture first? |
|---|---|---|---|---|
| 1 | Film looks you already use | 7 | all S | before/after only |
| 2 | Shake, wiggle and loops | 7 | S (Glitch M) | before/after only |
| 3 | Sound polish | 8 | all S | before/after (the ■ stop glyph shown in it) |
| 4 | Filters tab | 6 | S | **yes** (new buttons in the commit bar) |
| 5 | Grading depth | 8 | S, H&S M | before/after |
| 6 | Glow, shadow, vignette, flares | 7 | M | before/after |
| 7 | Audio choices (enabler first) | 8 | S, enabler M | before/after |
| 8 | Audio: mix, presets, space | 8 | S–M | **yes** for 8.2 preset chips |
| 9 | Sound-effect library | 8 | S–M | **yes** for 9.1/9.2 (search, chips, options drawer) |
| 10 | Warps | 7 | S–M | before/after |
| 11 | Generators & particles | 7 | M | before/after |
| 12 | Keying, wipes, text, drawing | 7 | S–M | before/after |
| 13 | Stylize depth | 7 | S–M | before/after |
| 14 | Blurs, repetition, 3D | 7 | M | before/after |
| 15 | Heavier filter & grade tools | 7 | M–L | **yes** for 15.4 |

### Batch 1 — Film looks you already use (all S)
Each of these sits in many of the 56 filters (grain 13, vignette 22, temperature 14, light glow 14), so one change shows up across the library. Nothing needs a new control kind.

**1.1 Film Grain (`filmgrain`), fixes C5**
- Today:
  - Amount 0–100 % (40).
  - Grain size 1–24 (2, **no unit**).
  - Shape Square/Round (def Round, legacy Square).
  - Colour 0–100 % (15), In shadows (35), In highlights (35, legacy 0).
  - Re-rolls at a fixed 24/s (`Math.floor(t*24)`, compositor.js:4797).
- Add:
  - `size` gets `unit:'px'` (the Noise fix of v16.52, compositor.js:133).
  - `speed` "Grain speed" 0–60 fps, step 1, def 24. 0 = frozen, for a paper texture. frame = floor(t·speed).
  - `soft` "Softness" 0–100 %, def 0. Box-blurs the grain field by up to 0.5 × size.
  - `seed` "Pattern" 0–999, def 0. Mixed into the hash only when it is not 0.
  - Optional: `stock` "Film stock" Custom (def) / 8mm / 16mm / 35mm / 65mm, which writes size·amount·soft (suggested 6·70·40, 4·55·25, 2·35·10, 1.5·20·0) in one history step. If no "segment that sets other sliders" pattern exists yet, leave stock for later.
- Risk: the unit fix only changes the reduced preview plate, so the export (ps 1) is byte-identical. speed 24, seed 0 and soft 0 must be the old loop.
- Test: `FM._pxToPlate(makeInstance('filmgrain'), {amount:40,size:8}, 0, 0.28, PIXEL_FX.filmgrain).size === 2.24` (today 8). With `speed:0`, t=0 and t=0.5 render identical bytes (today they differ).

**1.2 Light Leak (`lightleak`)**
- Today: colour (#ff7a3c), Amount 0–1 (0.6), Source X 0–100 % (85), Source Y (12), Spread 10–400 % (100). The drift is welded: `ph=t*0.15`, a ±12 %/±10 % wander, screen blend (compositor.js:6910-6918). A leak can never hold still.
- Add:
  - `speed` "Drift speed" 0–400 %, def 100. 0 = still. ph = t·0.15·speed/100, integrated when keyframed.
  - `wander` 0–300 %, def 100. Scales the ±12/±10 %.
  - `color2` "Leak edge" colour. Absent = the same as colour, so it is identical today.
  - `flicker` 0–1, def 0. A hashed 12 Hz exposure pulse.
  - `blend` Screen (def) / Add / Soft light.
- Test: `speed:0` renders t=0 and t=3 identically (today they differ).

**1.3 Glow (`glow`)**
- Today: Radius 0–60 px (16, legacy 12), Bloom 1–4 passes (1), colour. It is stacked CSS `drop-shadow()` (compositor.js:1869-1878), with the GPU fallback on phones without ctx.filter.
- Add: `strength` "Strength" 0–100 %, def 100. It becomes the drop-shadow colour's alpha in `effectFilter`, and the colour alpha in `drawCssFxOnGPU`. At 100, emit the original colour string so the filter string is character-identical.
- Test: `FM.effectFilter(layerWith({strength:50}),0)` contains `rgba(` with alpha 0.5 (today it does not). At 100 the string equals HEAD's.

**1.4 Letterbox (`letterbox`)**
- Today: Size 0–45 % (14), Bars sized to Layer/Frame (def Layer, legacy Frame), Bars at Top & bottom / Left & right, bar colour.
- Add:
  - `ratio` "Shape" Custom % (def) / 2.39:1 / 2.35:1 / 2:1 / 1.85:1 / 16:9 / 4:3 / 1:1 / 4:5. It computes the bar thickness from the target's shape and picks top/bottom or sides itself. Size and Bars at grey out via `overriddenBy`.
  - `opacity` "Strength" 0–100 %, def 100.
  - `feather` 0–60 px (unit px), def 0.
  - `offset` "Picture position" −50..50 %, def 0 (slides the window).
- Risk: the kernel forces alpha to 255 in the bars, so opacity and feather must blend alpha rather than set it.
- Test: on 1080×1920 with ratio 2.39:1, each bar is round((1920 − 1080/2.39)/2) ±1 px (today 14 % of the height).

**1.5 Faded Film (`faded`)**
- Today: Amount 0–1 (0.6), Milky blacks 0–100 (26), Colour loss 0–100 % (15), Warm/cool −200..200 % (100). The crush is welded at 0.25 × amount and the cast is fixed at +8/+2/−6 (compositor.js:7340-7351).
- Add:
  - `fadecol` "Fade colour" colour row. Absent = today's cast. It tints the lifted blacks.
  - `crush` "Contrast loss" 0–200 %, def 100.
  - `rolloff` "Fade whites" 0–100, def 0.
- Test: a black pixel with `fadecol:'#3050ff'` ends with B > R (today R > B from the fixed cast).

**1.6 Colour Temperature (`temperature`)**
- Today: Temperature −100..100 (40) is an additive ±50 on R and B (compositor.js:4719-4729). Tint (0). Keep brightness 0–100 % (0). At the default, black becomes rgb(20,0,0).
- Add:
  - `method` Shift (def 0 = today) / White balance (1). White balance multiplies: R×(1+k), B×(1−k), tint on G.
  - `range` "Affects" All (def) / Darks / Mids / Lights. Uses Colour Balance's weights: (1−L)², 1−(2L−1)², L².
  - Later: `neutral` "Make this white" via the eyedropper.
- Test: `method:1, amount:40` leaves rgb(0,0,0) at (0,0,0) (today (20,0,0)).

**1.7 Colour Balance (`colorbalance`)**
- Today: Red/Green/Blue −100..100 (25/0/−25) as additive ±80, plus Affects All/Darks/Mids/Lights (compositor.js:6018-6023).
- Add:
  - `preserve` "Keep brightness" Off (def) / On. Rescales to the original luma, the same maths as Temperature's preserve.
  - `soft` "Range width" 10–200 %, def 100 (an exponent on the range weights).
- Test: `red:100, preserve:1` keeps a grey ramp's mean luma within 1 level (today about +17).

### Batch 2 — Shake, wiggle and loops (his Tuff edits live here)

**2.1 Wiggle & Shake (`wiggle`, `shake`), fixes C28 and Shake's half of C27**
- Today:
  - Wiggle: Amount 0–2400 px (40), Speed 0.1–20 Hz (2). `wnoise(tl*spd)` with no seed (compositor.js:11784).
  - Shake: Amount (120, legacy 20), Speed (14), Twist, Zoom punch, Hardness, Smear, Smear length, Direction. Unseeded (11812-11814), and no `expand` plate (11797).
  - So two layers that start together move in lockstep.
- Add:
  - Both: `seed` "Pattern" 0–999, def 0. Added to the noise argument only when it is not 0.
  - Wiggle:
    - `amounty` "Vertical amount" 0–2400 px (unit px; absent = Amount).
    - `rotate` "Rotation wiggle" 0–180°, def 0.
    - `scale` "Scale wiggle" 0–100 %, def 0.
    - `octaves` "Roughness" 1–4, def 1.
  - Shake:
    - `overscan` "Hide edges" Off (def) / On. Scales by 1 + 2·amount/min(W,H).
    - Takes wiggle's `expand` plate (queue 228 pattern).
- Test: two identical layers, one with `seed:7`, have different offsets at tl=1.3 (today identical). Shake on a 110 %-scaled full-frame clip with `expand` leaves no transparent corner pixel (today it does).

**2.2 Pulse, Swing, Orbit, Drift, finishes C27 for Swing/Spin/Pulse**
- Today:
  - Pulse: amount, speed, phase, about the bbox centre, sine only.
  - Swing: angle, speed, pivot, phase, undamped.
  - Orbit: radius, speed, start angle, circle only.
  - Drift: constant velocity that runs off-frame.
- Add:
  - Pulse:
    - `pivotx`/`pivoty` 0–100 %, def 50/50.
    - `wave` Sine (def) / Heartbeat / Bounce / Square / Triangle.
    - `stretch` "Squash & stretch" −1..1, def 0.
  - Swing: `damping` 0–5 /s, def 0 (amplitude·e^(−d·tl)).
  - Orbit:
    - `ry` "Ellipse" 0–200 %, def 100.
    - `face` "Face direction of travel" Off/On.
    - `depth` 0–100 %, def 0 (smaller on the far side).
  - Drift: `wrap` "Wrap around frame" Off/On (a ticker).
  - Pass `expand` to Swing, Spin and Pulse.
- Test: Swing `damping:2` rotates less than 5 % of its tl=0.25 amplitude at tl=3 (today equal). Drift `wrap:1` shows the box at x < 20 after it leaves the right edge (today nothing).

**2.3 Flash (darken) (`flashdark`)**
- Today: Depth 0–1 (0.45), Speed 1–30 Hz (10), Softness (0.3), Darkest (inert, ASK open in #904), Pattern. The rhythm is random value-noise (compositor.js:6183-6207).
- Add:
  - `rhythm` Random (def) / Steady strobe / Double hit / Build-up.
    - Steady = one hit per 1/Speed.
    - Double = two hits 80 ms apart per period.
    - Build-up = the period shrinks from 1/Speed to 1/(4·Speed) over the layer.
  - `hold` "Hold dark" 0–1, def 0 (the fraction of the period the hit stays dark).
- **Do not touch Darkest.**
- Test: Steady at 4 Hz puts the darkest frames of a 2 s render at t=0, 0.25, 0.5… within one frame (today they wander).

**2.4 Frame Stutter (`framestutter`)**
- Today: Rate 1–30 fps (8), Mode Hold/Strobe/Hold+Trail, Blend, Duty. The trail alpha is welded at 0.45 (compositor.js:11038-11040).
- Add:
  - `trail` "Trail strength" 0–1, def 0.45, live in Hold+Trail.
  - `offset` "Phase" 0–1, def 0.
  - `random` "Irregular holds" 0–100 %, def 0 (hashed hold lengths for a stop-motion feel).
- Test: `trail:0.9` and `trail:0.45` render different ghosts (today identical). The stateless hold is §C31, which is M, so keep it out of this batch.

**2.5 Speed Lines (`speedlines`)**
- Today: count, inner, length, width, jitter, spin, x/y, blend, colour. Hashed on the line index only (10882-10883), so frozen apart from spin.
- Add:
  - `boil` 0–30 Hz, def 0 (re-seed every 1/boil s).
  - `mode` Radial (def) / Parallel, plus `angle` −180..180° (live in Parallel).
  - `aspect` "Clear zone shape" 25–400 %, def 100.
- Test: `boil:12, spin:0` renders t=0 and t=0.1 differently (today identical).

**2.6 Motion Blur (object) (`objectblur`)**
- Today: Shutter 0–12 frames (0.5), Samples 2–48 (8). The window is centred on t (compositor.js:3060-3080).
- Add: `phase` "Shutter phase" −100..100 %, def 0. −100 = trails behind only. The `layerMotionBetween` early-out must use the shifted window.
- Test: a box moving right with `phase:-100` has no smear ahead of its leading edge (today half the smear is ahead).

**2.7 Glitch (`glitch`), M**
- Today: amount, bands 2–240 (14), speed 0–30 Hz (10), split 0–20× (1), Tears Sideways/Up-down. The slices are equal-height and wrap (5193-5201).
- Add:
  - `jitter` "Uneven slices" 0–100 %, def 0.
  - `blocks` "Block damage" 0–1, def 0 (hashed rectangles, shifted and channel-swapped).
  - `seed` 0–999, def 0.
  - `wrap` "Edges" Wrap around (def) / Stretch edge.
  - The Up-down path transposes, so these come along with it.
- Test: `seed:5` and `seed:0` differ at the same t (today identical).

### Batch 3 — Sound polish (no new control kind needed)

**3.1 Sound effects: ▶ plays what Add gives you, and it can stop; fixes C10 and C12**
- Today:
  - ▶ plays the raw recipe × 0.82 (sfx.js:644-672).
  - Add normalises to 0.89 × level ÷ peak (569-587). Raw peaks span 11× (0.08–0.90), so Reverse whoosh previews much quieter than the clip that lands.
  - The row highlight clears only on its own timer (757), and nothing stops a sound.
- Add:
  - Preview = `renderBuffer(def)`, cached in a Map by id and played through an AudioBufferSource. Call `ctx.resume()` synchronously inside the tap before awaiting (the iOS unlock rule, audio-fx-browser.js:101-103).
  - Add reuses the cached buffer.
  - While a row plays, its ▶ becomes ■ (tap = `stopPreview`). Starting another row clears the old row's `.playing` at once.
- Test: previewing `reverse-whoosh` plays a buffer with peak 0.89·level ±1 % (spy on `AudioBufferSourceNode.prototype.start`; today no buffer source plays). After row A then row B, row A has no `.playing` (today it keeps it until its timer).

**3.2 Audio-effect search by what people call it; fixes C13**
- Today: search matches label, type and category only (audio-fx-browser.js:269-283).
- Add: a `tags:[…]` array on each def, read by `buildSearchResults`:

| Effect | Tags |
|---|---|
| vocalremove | karaoke, instrumental, acapella |
| pitch | chipmunk, deep voice, helium |
| ringmod | robot, dalek |
| lowpass | muffled, underwater, next room |
| highpass | thin, rumble |
| telephone | phone, radio, walkie, megaphone |
| lofi | vintage, cassette |
| autopan | 8d, spatial |
| bassTreble | bass boost, treble |
| compressor | podcast, level |
| reverb | room, hall, church |
| delay | repeat |
| distortion | fuzz, overdrive, crunch |
| bitcrush | 8-bit, retro, game |
| gain | louder, volume |
| limiter | loud, loudness |

- Test: `buildSearchResults('karaoke')` contains the Vocal Remove tile (today it says "No audio effects match").

**3.3 Echo / Delay (`delay`)**
- Today: Time 0.01–2 s (0.35), Feedback 0–0.9 (0.35), Mix (0.35). The loop is a plain gain (audio-fx.js:542-555), so every repeat is a perfect copy and long feedback turns into a metallic smear.
- Add (all keyframable):
  - `tone` "Tone" 500–20000 Hz, def 20000. A lowpass inside the d→fb loop, in a bypass pair.
  - `lowcut` "Low cut" 20–1000 Hz, def 20. A highpass in the loop, in a bypass pair.
  - `wobble` "Tape wobble" 0–1, def 0. A 0.7 Hz LFO of ±wobble·2 ms on delayTime, using `s.lfo`, scene-pinned.
- Test: an impulse with feedback 0.6 and `tone:2000` gives a 3rd repeat whose energy above 5 kHz is at least 12 dB below the 1st repeat's (today equal).

**3.4 Reverb (`reverb`), the AudioParam half**
- Today: Size 0–1 (0.5), Decay 0.1–8 s (2), Mix (0.3). The IR is seeded sparse noise with a power envelope (audio-fx.js:95-115). No pre-delay and no wet filtering.
- Add (all keyframable):
  - `predelay` "Pre-delay" 0–0.25 s, def 0. A DelayNode before the convolver; 0 is sample-exact.
  - `highcut` "Tone" 1000–20000 Hz, def 20000, as a bypass-pair biquad on the wet.
  - `lowcut` 20–1000 Hz, def 20, as a bypass-pair biquad on the wet.
  - `width` 0–1, def 1 (M/S on the wet).
- Risk: the animated-room bank (~435-505) must feed the same wet chain.
- Test: `predelay:0.1` puts the first non-zero wet sample at ≥ 0.1·sr (today ≈ 0).

**3.5 Pitch Shift (`pitch`)**
- Today: Semitones −12..12, step 1 (0), and Mix (1). A granular shifter with a fixed 100 ms grain (audio-fx.js:914-998).
- Add:
  - `cents` "Fine tune" −100..100, def 0. Added to v in `dOf`, and glides like semitones.
  - Semitones range → −24..24 (delay max 0.2 → 0.5 s).
  - Hint line: "Shifted sound lands a few ms late. Keep Mix at 100 % for a clean result" (C20).
- Grain size is structural, so it waits for batch 7.
- Test: a 440 Hz sine with `cents:100` comes out at 466 ±2 Hz (today 440).

**3.6 Bass & Treble / 3-Band EQ corners**
- Today: `bassTreble` shelves are fixed at 200/3000 Hz. `eq3` has its low shelf at 250 and high shelf at 4000, with mid Q 1; only Mid Freq moves (audio-fx.js:340-366).
- Add:
  - bassTreble: `bassFreq` "Bass at" 40–500 Hz, def 200. `trebleFreq` "Treble at" 1000–16000, def 3000.
  - eq3: `lowFreq` 40–1000, def 250. `highFreq` 1000–16000, def 4000. `midQ` "Mid width" 0.1–10, def 1.
  - All are direct biquad AudioParams.
- Test: `bass:12, bassFreq:60` makes 200 Hz at least 6 dB quieter than 50 Hz (today the key is ignored).

**3.7 Compressor (`compressor`), part of C14**
- Today: Threshold −60..0 (−24), Ratio 1–20 (4), Attack 0–0.5 (0.01), Release 0.01–1 (0.25) (audio-fx.js:634-645). Knee is never set (the node default is 30 dB), and the automatic makeup is hidden.
- Add:
  - `knee` 0–40 dB, def 30.
  - `output` −24..+24 dB, def 0 (a trailing gain, dB→linear via `xf`).
  - `mix` 0–1, def 1 (`wetDry`, for parallel compression).
  - A gain-reduction bar in the expanded row while previewing, from `.reduction` (live only).
  - The Auto-makeup toggle waits for 7.1.
- Test: `output:-6` lowers a 0.05-amplitude sine's RMS by 6 ±0.2 dB (today the key is ignored).

**3.8 Limiter (`limiter`), fixes C2**
- Today: Ceiling −24..0 (−1) as a compressor threshold (ratio 20, knee 0, 1 ms, 50 ms; audio-fx.js:647-655). The hidden makeup of −0.57·T dB means a 0 dBFS sine comes out at 0.38·T: −0.38 dBFS at the default, and −2.3 dBFS at a −6 ceiling. Quiet material under a −24 ceiling is lifted about +13.7 dB.
- Add:
  - A post-gain of 10^(0.57·T/20), scheduled together with the ceiling (a custom `multi` pair so a keyframed ceiling stays compensated).
  - `input` "Input gain" 0–24 dB, def 0.
  - `release` 0.01–1 s, def 0.05.
  - The Clip toggle waits for 7.1.
- Risk: this **intentionally** changes saved Limiters (about −0.57 dB at the default, and more at low ceilings, where today's output is wrong). Say so in POLISH-LOG. The boost limiter (audio-fx-live.js:106-116, T −1.5 → +0.86 dB) takes the same one-line fix with its own test.
- Test: a 0 dBFS sine through `ceiling:-6` peaks at ≤ −5.6 dBFS (today ≈ −2.3).

### Batch 4 — Filters tab (UI: draw the commit bar and the row first, #545)

**4.1 Strength before you tap Add.**
- Today: picks preview at full strength through `FM._fxPreview` (a flattened list, inspector.js:2017-2030). Strength only exists after adding.
- Add: a Strength slider in the commit bar, 0–100 %, def 100. It drives the preview through a real container built by `filters.makeInstance` + `fitToLayer`, which also fixes C52, and it is written into each added container's `strength`.
- Test: pick Teal & Orange, bar at 40, Add, and the container's `strength` is 0.4 (today 1).

**4.2 Hold to compare.**
- Add: a ◐ in the commit bar and on an open filter row, plus press-and-hold on the preview. While held, the preview drops every filter container (a preview-only override). It never reaches export, history or autosave, and it is cleared on tab leave.
- Test: while held, the preview render equals a render with no filters, and history length is unchanged.

**4.3 Search + "Your filters" row; fixes C9**
- Add:
  - A search field above Favourites, matching name, desc and ingredient labels.
  - A "Your filters" row built from `FM.effectPresets.custom()` entries with fx `'filter'` (`filters.get` already resolves them, filters.js:598-605).
  - fx-presets `makeInstance` sets `name` and `fid` for a filter preset.
  - The save toast says "Saved: it's under Your filters".
- Test: saving a filter container as a preset makes it appear in the Filters tab (today it is unreachable).

**4.4 "Reset to original look" in the filter row ⋯.** For a container whose `fid` is a library filter, rebuild its children from `FM.filters.makeInstance(fid)`. Keep strength (keyframes too), enabled, name and position, in one history step.
- Test: delete a child of Teal & Orange, then Reset, and the children equal a fresh instance's with the strength keyframes intact.

**4.5 Add to all clips.** A second commit action that adds the filter to every video/image layer (or the multi-selection) in one history step. The toast says how many landed and how many didn't suit.
- Test: three video layers get the container from one commit, and one undo removes all three.

**4.6 Filter "Apply as" (`filter` container)**
- Today: Strength 0–1 only, as a cross-fade of plate A (without) and B (with) (compositor.js:4004-4063).
- Add: `blend` "Apply as" Normal (def) / Colour only / Brightness only / Soft light / Overlay / Screen / Multiply. B is drawn over A with gCO `color` / `luminosity` / `soft-light` / `overlay` / `screen` / `multiply` at alpha = Strength. The s ≥ 1 shortcut applies only to Normal. Declare the key on the hidden `'filter'` registry entry so `saneFilter` keeps it.
- Test: with Brightness only, every pixel's hue equals the unfiltered hue ±2° (today the key is ignored and the hue shifts).

### Batch 5 — Grading depth

**5.1 Colour effects on adjustment layers.** Pair it with the C1 fix and ship both together.
- Today: ADJ_OK has 16 types (fx-registry.js:163-166). PIXEL_ADJ applies only posterize, tint, threshold, duotone, rgbsplit and levels, plus pixelate (compositor.js:15282).
- Add to both: exposure, gamma, temperature, vibrance, colorbalance, highlightsshadows, hslbands, channelremap, bleachbypass, tealorange, crossprocess, faded, gradientmap, colorize, thermal, spectralmap, palettemap, replacecolor, spotcolor, solarize. These are point ops already in PIXEL_FX.
- Leave vignette, gradientoverlay, lightleak, filmgrain, nightvision, dither and fourcolor for later: they need `frameGeo` when zoomed (queue 690).
- Test: an adjustment layer carrying Teal & Orange over a grey shape changes the shape's pixels (today the effect is refused).

**5.2 Highlights & Shadows (`highlightsshadows`), M; answers C47**
- Today: Highlights −100..100 (−40), Shadows (50), as a global (1−L)²/L² add (compositor.js:6024). +Shadows makes the blacks milky. 17 filters use it.
- Add:
  - `radius` "Local radius" 0–200 px (unit px), def 0. Above 0, the weights come from quarter-res box-blurred luma.
  - `width` "Tonal width" 10–100, def 100.
  - `whites` −100..100, def 0. `blacks` −100..100, def 0.
  - `sat` "Colour correction" −100..100, def 0.
- Test: `shadows:50, radius:40` keeps pure black ≤ 5 (today it lifts).

**5.3 Teal & Orange (`tealorange`), answers C48**
- Today: Amount (0.6), Pivot 5–95 (50), Spread 10–200 % (100). It applies +42 R / +8 G / −42 B by luma only (6880-6888).
- Add:
  - `mode` By brightness (def) / By hue (warm hues → orange, others → teal).
  - `skin` "Protect skin" 0–100, def 0.
  - `balance` −100..100, def 0.
  - `keep` "Keep brightness" 0–100, def 0.
- Test: By hue makes a shadowed skin pixel (#6b4a3a) warmer, not bluer (today B rises).

**5.4 Tint (`tint`)**
- Today: it replaces the pixel with luma × colour (tintPixels, 12333-12357).
- Add:
  - `mode` Colourise (def) / Tint over (soft-light the colour in, keeping saturation).
  - `soft` "Range width" 10–200 %, def 100.
- Test: Tint over at amount 1 keeps a saturated red above 50 % saturation (today 0).

**5.5 Duotone (`duotone`).** Add `blend` Replace (def) / Soft light / Overlay / Colour. Tritone goes on Gradient Map (5.6), not here.
- Test: `blend:3` (Colour) keeps a ramp's luma within 1 level (today Replace).

**5.6 Gradient Map (`gradientmap`)**
- Today: Shadows/Highlights colours, amount, midpoint 5–95 %, dither.
- Add:
  - `stops` 2 (def) / 3, with `color3` "Midtones" def #b0507a. Midpoint becomes its position.
  - `reverse` Off/On.
  - `blend` Normal (def) / Multiply / Screen / Overlay / Soft light / Colour / Luminosity, through `fxBlendPx`. Add Colour and Luminosity to it as modes 8/9; they do not exist at compositor.js:4161.
- Test: `reverse:1` maps black to the Highlights colour (today the Shadows colour).

**5.7 Cross Process (`crossprocess`).** Add `variant` Slide-in-negative (def, today) / Negative-in-slide (flat, pastel, blue-green).
- Test: `variant:1` lowers a ramp's standard deviation by ≥ 15 % against `variant:0` (today the key is ignored).

**5.8 Exposure (`exposure`)**
- Today: Stops −5..5 (0.8), Black point −150..150, Roll-off 0–100 %. It multiplies sRGB directly.
- Add:
  - `gamma` 0.1–4, def 1.
  - `space` "Work in" sRGB (def) / Linear light (decode, ×2^stops, encode; three 256-entry LUTs).
- Test: Linear light at +1 stop sends 128 to 175 ±3 (today 255).

### Batch 6 — Glow, shadow, vignette, flares (M)

**6.1 Vignette (`vignette`), fixes C8 and C50**
- Today: Amount 0–1 (0.6), Size 0–95 % (35). There are two renderers:
  - Media layers draw an inline black radial gradient over the whole clip rect. Only the first vignette counts, it is always under the other effects, and its fallback size is 45 (15251-15269).
  - Every other layer gets a pow-1.6 multiply that skips alpha 0 (7191).
  - On 9:16 the circle darkens the top and bottom ~8× more than the sides.
- Add:
  - `round` "Roundness" 0–100, def 100 (today's circle; 0 = an ellipse fitted to the frame).
  - `feather` 10–300 %, def 100 (scales the 1.6 exponent).
  - `x`/`y` "Centre" 0–100 %, def 50.
  - `mode` Darken (def) / Lighten / Colour, with `color` def #000000.
  - `hilite` "Protect highlights" 0–100, def 0.
  - When any key leaves its default, route media layers through the pixel path, which is in stack order and honours every vignette. The defaults keep each path byte-for-byte.
- Test: `round:0` on 1080×1920 darkens mid-left and top-centre within 10 % of each other (today about 4 % against 35 %).

**6.2 Light / Soft / Dark Glow, fixes C23 and C49**
- Today:
  - Light Glow: colour, Amount (0.6), Radius 1–80 px (6), Threshold (60).
  - Soft Glow: radius 10–400 %.
  - Dark Glow: threshold 40.
  - All three: a hard step threshold, one box pass, and writes only where alpha > 0 (5491-5492, 5596, 6994).
- Add (all three):
  - `knee` "Threshold softness" 0–100, def 0.
  - `passes` "Smoothness" 1–3, def 1.
  - `outside` "Glow past the edges" Off (def) / On. Writes alpha into empty pixels; fxBounds/BOUNDED_FX pad by radius × passes.
  - `blend` Screen (def) / Add / Soft light.
  - Light and Soft only: `from` Chosen colour (def) / Source colour.
- Test: white text with `outside:1` has alpha > 0 at 3 px outside the glyph (today 0).

**6.3 Drop Shadow (`dropshadow`), fixes C22**
- Today: Distance 0–60 (18), Angle (135), Softness 0–20 (6, one box pass), Opacity (100), colour. It skips pixels with `dsa>0` (6133).
- Add:
  - `spread` 0–100 %, def 0.
  - `smooth` "Smoothness" 1–3 passes, def 1.
  - `shadowonly` "Shadow only" Off/On.
  - Distance max → 300 and Softness max → 80, defaults unchanged.
  - `edgefix` def 1, legacy 0: draw the shadow under partially transparent pixels.
  - The bbox pad grows with spread × passes.
- Test: an anti-aliased text edge (alpha 128) is darker over the shadow with `edgefix:1` than with 0 (today it leaves a light seam).

**6.4 Stroke offset (`stroke`).** Add `gap` "Offset" 0–60 px (unit px), def 0, live when Position = Outside. This gives the sticker double-outline.
- Test: with `gap:10, width:4`, 5 px out is transparent and 12 px out is stroke-coloured (today the reverse).

**6.5 Lens Flare (`lensflare`)**
- Today: x/y as 0–1 fractions, intensity, two colours. Core σ is welded at W×0.18, with six rays (6415).
- Add:
  - `size` "Core size" 20–400 %, def 100.
  - `rays` 0–16, def 6.
  - `rotation` −180..180°, def 0.
  - `ghosts` 0–8, def 0.
  - `halo` "Ring" 0–1, def 0.
  - `streak` "Anamorphic streak" 0–1, def 0.
  - Keep queue 474's exact path at rays 6 / rotation 0.
- Test: `rays:8` gives 8 luminance peaks on a ring around the source (today 6).

**6.6 Linear / Spin Streaks.**
- `linstreaks`:
  - `both` One way (def) / Both ways.
  - `threshold` "Only above" 0–100 %, def 0.
  - `color` tint, def #ffffff.
- `spinstreaks`:
  - `threshold` "Only above" 0–100 %, def 0.
  - `dir` Clockwise (def) / Anticlockwise.
- Test: Both ways smears a bright dot on both sides (today one).

**6.7 Glow Scan (`glowscan`)**
- Today: the band sits at phase × FRAME height (6440) and loops on project t.
- Add:
  - Direction option "Angle", with `angle` −180..180°.
  - `span` "Sweeps across" Frame (def) / Layer.
  - `pause` "Wait between sweeps" 0–5 s, def 0.
  - `loop` Loop (def) / Once.
- Test: `span:1` on a 100 px title puts the band on the title within the first half of the cycle (today only a sliver).

### Batch 7 — Audio choices (7.1 first; the rest need it)

**7.1 Enabler: choice and toggle params for audio effects (M).**
- Today:
  - `afxParam` makes every audio param a range (inspector.js:2315-2317).
  - The sanitiser takes numbers.
  - `signature()` rebuilds on type/enabled only.
- Add:
  - `options:[[0,'Sine'],…]` renders through `fxSegment`, and `toggle:true` through `fxToggle`. Both are stored as integers, so the sanitiser is unchanged.
  - `rebuild:true` adds that value to `signature()`.
  - Optional `legacy`: an absent key reads `legacy`, not `def`.
  - Then two small follow-ons: Compressor `automakeup` toggle, def On = today (Off multiplies by the inverse of the spec makeup from threshold/knee/ratio); Limiter `clip` toggle, def Off (legacy Off), a 4× oversampled hard clip at the ceiling.
- Test: a def with `options` renders a segmented control (today a slider), and changing a `rebuild` param changes `signature()`.

**7.2 LFO shape on the six modulation effects**
- Today: `LFO_WAVE` = sine/ramp/win (audio-fx.js:123-127). Tremolo, Auto-Pan, Vibrato, Chorus, Flanger and Phaser are sine-only.
- Add:
  - `shape` Sine (def) / Triangle / Square (tanh(6·sin)/tanh 6) / Saw up / Saw down / Random (seeded, 8 steps a cycle), as a rebuild param.
  - Tremolo: `stereo` "Stereo phase" 0–180°, def 0.
- Test: Tremolo Square at 4 Hz keeps ≥ 80 % of samples within 5 % of the envelope's two extremes (today a sine).

**7.3 Distortion (`distortion`), fixes C19**
- Today: Drive 0–100 (30), Mix. One `tanh(kx)/tanh k` with k = 0.35·drive (audio-fx.js:62-67). At the default that is about +20 dB small-signal gain, with no trim.
- Add:
  - `type` Soft (def) / Hard clip / Tube / Fuzz / Wavefold / Rectify. A rebuild; `curveBank` per type.
  - `tone` 500–20000 Hz, def 20000 (bypass pair).
  - `output` −24..+6 dB, def 0.
  - `autogain` toggle, def Off (÷ k/tanh k).
- Test: `autogain:1` at drive 30 keeps a −30 dBFS sine within ±2 dB (today about −10).

**7.4 Telephone (`telephone`)**
- Today: Mix only. Fixed 300 Hz highpass, 3400 Hz lowpass, bite tanh 1.8 (audio-fx.js:372-385).
- Add:
  - `style` Phone (def) / Radio 150–5000 / Megaphone 500–2800 with heavier bite / Walkie-talkie 400–2600 with squelch / Old radio 200–4000 with hiss. The style writes the four params below.
  - `lowcut` 100–1000, def 300.
  - `highcut` 1500–8000, def 3400.
  - `grit` 0–100, def 30 (k = 0.06·grit).
  - `noise` 0–1, def 0 (seeded hiss).
- Test: `highcut:1500` puts a 2.5 kHz sine ≥ 6 dB below HEAD's output.

**7.5 Filter slope (Low-/High-/Band-Pass, Notch)**
- Today: one biquad each, 12 dB/oct (audio-fx.js:328-338).
- Add: `slope` 12 (def) / 24 / 36 / 48. A rebuild of 1–4 cascaded biquads, with Butterworth Qs inside and the user's resonance on the last.
- Test: a 1 kHz Low-Pass at 48 dB/oct has 4 kHz ≥ 80 dB down (today about 24).

**7.6 Phaser (`phaser`), touches C17**
- Today: Rate, Depth, Feedback. Four allpasses at 200–1600 Hz, dry/wet welded at 0.5/0.5 (835-860).
- Add:
  - `stages` 2 / 4 (def) / 6 / 8, a rebuild.
  - `centre` 0.25–4×, def 1.
  - `mix` 0–1, def 0.5 (today's pair exactly).
  - `stereo` 0–180°, def 0.
- Test: `stages:8` gives 4 notches in a static response (today 2).

**7.7 Ring Mod (`ringmod`), fixes C15 (measure first)**
- Today: Frequency 10–2000 (220), from a 1 s sine buffer at playbackRate = Hz (873-885).
- Add:
  - The carrier becomes `s.lfo(220,{key:'freq',secs:0.125})` with custom `multi([[lfo.playbackRate,0.125]])`, so the rate stays ≤ 250.
  - `shape` Sine (def) / Square / Triangle.
  - `sweep` "Sweep rate" 0–5 Hz, def 0. `sweepdepth` 0–1, def 0.
- Test: `freq:2000` on a 100 Hz sine gives peaks at 1900/2100 Hz. Measure HEAD first; if HEAD already passes, drop the fix half and keep the controls.

**7.8 Chorus (`chorus`)**
- Today: Rate (0.8), Depth (0.5), Mix (0.5). Three mono voices at 15/21/27 ms (790-812).
- Add:
  - `spread` 0–1, def 0 (panners at −s, 0, +s).
  - `voices` 1–6, def 3 (a rebuild).
  - `feedback` 0–0.6, def 0.
- Test: `spread:1` on a mono input gives L ≠ R (today L = R).

### Batch 8 — Audio: mix, presets, space

**8.1 Mix and Output on every audio effect (M).**
- Today: 11 of 27 have Mix; none has Output.
- Add: `mix` 0–1, def 1 (`wetDry`) where it is missing, and `output` −24..+12 dB, def 0, on all 27. Both are keyframable.
- Risk: wet×1 + dry×0 and a ×1 gain are float-exact. About 3 nodes per effect.
- Test: EQ3 `mix:0` outputs the input exactly (today the key is ignored).

**8.2 Presets inside each audio effect (draw the chips first).** Chips at the top of the expanded row. Applying one is a single `history.commit`.

| Effect | Presets |
|---|---|
| Reverb | Small room · Bathroom · Hall · Cathedral · Plate |
| Echo | Slapback 90 ms/0.1 · Tape 350 ms/0.45 · Canyon 1.2 s/0.6 |
| Compressor | Voice −20/3:1 · Glue −12/2:1 · Squash −35/10:1 |
| 3-Band EQ | Voice clarity · Bass boost · De-mud |
| Distortion | Warm · Crunch · Fuzz |
| Pitch | Chipmunk +7 · Helium +12 · Deep −5 · Monster −12 |

Plus "Save as my preset" (localStorage, like fx-presets.js).
- Test: Echo → Slapback sets time 0.09 and feedback 0.1 in one history step.

**8.3 Ping-Pong (`pingpong`).**
- `tone` 500–20000, def 20000 (bypass pair in each cross-feed).
- `offset` "Right-side timing" 0.5–2×, def 1.
- `width` 0–1, def 1.
- Test: `offset:1.5` puts the first right echo at 1.5 × time (today at time).

**8.4 Stereo Width (`width`).**
- `monobass` "Keep bass centred" 0 = off, or 40–300 Hz, def 0 (a highpass on S).
- `trim` "Auto trim" Off/On.
- Test: `monobass:150, width:2` gives near-zero side content at 60 Hz (today it is widened).

**8.5 Vocal Remove (`vocalremove`).**
- `bassFreq` "Keep bass below" 60–400 Hz, def 180.
- `highKeep` "Keep highs" 0–1, def 0 (mono content above 8 kHz).
- `mode` Remove vocals (def) / Centre only (labelled "approximate").
- Test: `bassFreq:400` keeps a centred 300 Hz tone within 6 dB (today it is cancelled).

**8.6 Auto-Pan 8D (`autopan`), M.**
- `centre` −1..1, def 0.
- `realism` 0–1, def 0. A lowpass dipping to 4 kHz on the "behind" half, driven by a second scene-pinned LFO at phase 0.25, plus a reverb send of realism × 0.15.
- Test: `realism:1` makes the >5 kHz energy of the front and back half-cycles differ by ≥ 6 dB (today equal).

**8.7 Tempo sync (needs 7.1).**
- On Echo, Ping-Pong, Tremolo and Auto-Pan: `bpm` 0 = off, or 40–240, def 0.
- `note` 1/1, 1/2, 1/4 (def), 1/8, 1/8·, 1/8T, 1/16.
- time = (60/bpm) × 4 × note; rate = 1/time. Show the resolved ms/Hz beside the control. Static only.
- Test: Echo `bpm:120, note:1/8` → delayTime 0.25 s (today 0.35).

**8.8 Pitch grain size.** `grain` 20–200 ms, def 100, a rebuild (the LFO buffer secs change).
- Test: `grain:30` changes the output against 100 on a drum loop (today the key is ignored).

### Batch 9 — Sound-effect library (draw 9.1/9.2 first)

**9.1 Search + category chips.**
- Today: one list of 30 rows with ★ on top (sfx.js:726-817).
- Add: a search field matching name, category and tags (boom, bleep, censor, transition), and horizontal category chips that scroll to a heading.
- Test: "boom" lists Impact and Sub drop only.

**9.2 Options before adding (⋯ drawer per row); fixes C11**
- Today: fixed dur, pitch and seed (sfx.js:579-587). The noise seed depends on length/colour/rate only (37-41).
- Add:
  - **Length** 0.5–3×, def 1. Only for recipes marked `stretch:true`: whoosh, riser, wind, sub-drop, reverse-cymbal, rain, fire, vinyl.
  - **Pitch** −12..+12 st, def 0 (a tape-style resample in a second OfflineAudioContext).
  - **Variation** 1–8, def 1. A seed argument into `noiseBuffer`; 1 = today's formula exactly. It also rotates the offset tables in sparkle, vinyl, fire and glass-break.
  - **Direction** Centre / L→R / R→L (a stereo render with a panner ramp; Movement sounds only).
  - **Reverse** Off/On.
  - ▶ previews with the options, and the file name records them.
- Test: Fire Variation 2 differs from Variation 1, and Variation 1 is byte-identical to HEAD's render.

**9.3 Nature beds at usable lengths; fixes the second half of C21**
- Today: Wind 2.6, Rain 2.6, Fire 2.4 and Vinyl 2.2 s, each ramping to 0 at both ends (501-541).
- Add:
  - `length` 2.5 (def) / 10 / 30 / 60 s, with fixed 0.3 s edge fades.
  - Wind's breath repeats with seeded variation.
  - A **Loop-ready** toggle: no edge fades, and the last 0.5 s crossfaded into the start.
  - Preview capped at about 8 s.
- Test: a Loop-ready 10 s Rain has first/last 0.3 s RMS within 1 dB of the middle (today it fades to 0).

**9.4 Rain with drops.**
- `intensity` Light / Medium (def) / Heavy.
- A droplet layer: 20–120/s of 3–8 ms clicks band-passed at 2–6 kHz (seeded).
- A "Rain on a roof" variant.
- Test: new Rain shows ≥ 20 transients/s above the bed (today flat).

**9.5 Lo-Fi (`lofi`), M**
- Today: Amount, Mix (742-788).
- Add:
  - `wow` 0–1, def 0 (0.5 Hz ±2.5 ms).
  - `flutter` 0–1, def 0 (8 Hz ±0.25 ms).
  - `hiss` 0–1, def 0 (seeded pink noise loop, highpassed at 2 kHz).
  - `crackle` 0–1, def 0 (a seeded 3 s sparse-impulse loop).
  - The loops ride `s.lfo` so they are scene-pinned.
- Test: `crackle:1` on silence is not silent (today it is).

**9.6 Flanger (`flanger`), M; fixes C16**
- Add:
  - `manual` 0.5–10 ms, def 4.
  - Feedback range −0.9..+0.9 (def +0.5).
  - `stereo` 0–180°, def 0.
  - Restructure: the swept delay goes outside the cycle, and feedback runs through its own loop.
- Risk: the sweep now reaches below 2.7 ms, as designed. Flag it as a fix in POLISH-LOG.
- Test: at depth 1, the highest first-notch frequency across a sweep is ≥ 400 Hz (today ≤ ~190).

**9.7 Bit Crush (`bitcrush`); fixes C18**
- Add:
  - A 65536-point curve for bits ≥ 12 (or cap the slider at 12).
  - `tone` 1000–20000, def 20000.
  - `output` −12..+6 dB, def 0.
- `rate` "Sample-rate crush" 1–32× needs an AudioWorklet, which the file header forbids (audio-fx.js:3). That is a policy question for him; worklets do run offline, so export parity can hold.
- Test: bits 14 and bits 16 differ on a −40 dBFS sine (today identical).

**9.8 Reverb damping.** `damping` 0–1, def 0. A time-varying one-pole lowpass baked into the IR, added to the `_irCache` key and the animated-room key. Static only.
- Test: `damping:1` puts the IR's last 20 % ≥ 12 dB darker (>5 kHz vs <1 kHz) than damping 0.

### Batch 10 — Warps

**10.1 Every warp: edges + smooth sampling (M); answers C26**
- Today: the CPU path truncates and clamps (compositor.js:7531-7533), and the GL path uses NEAREST + clamp (gl-warp.js:83-84, 172).
- Add, in the driver, once for CPU and once for GL:
  - `edges` Stretch (def) / Transparent / Wrap / Mirror.
  - `smooth` "Smooth sampling" Off (def) / On. Bilinear; on GL, 4 hand taps so the texture stays NEAREST.
  - Extend the CPU/GPU parity tests.
- Test: Twirl `smooth:1` gives intermediate values on a hard diagonal (today only the two source values).

**10.2 Wave, Ripple, Curl; fixes C30**
- `speed` "Wave speed" −720..720 °/s, def 0 (`FM.integrateProp` when keyframed).
- Ripple and Curl:
  - `decay` "Falloff" 0–100 %, def 0: amp·exp(−decay/25 · r/maxR).
  - `reach` "Radius" 0–200 %, def 0 = unlimited.
- GLSL uniforms at 9325, 9338 and 9547.
- Test: Ripple `decay:100` displaces the corner less than 10 % as much as near the centre (today equal).

**10.3 Kaleidoscope.**
- `zoom` "Source zoom" 25–400 %, def 100.
- `srcx`/`srcy` −100..100 %, def 0.
- `flow` −200..200 px/s, def 0.
- `mirror` "Mirror wedges" On (def, legacy On) / Off.
- Segments max → 32.
- GLSL at 9349.
- Test: `flow:100` changes a static picture between t=0 and t=1 (today identical).

**10.4 Turbulent Displace.**
- `flowx`/`flowy` −300..300 px/s, def 0 (a domain offset of flow·tl·ps).
- `stretch` 25–400 %, def 100.
- Test: `flowy:-100` moves the displacement field by ~100 px between t=0 and t=1 (today it boils in place).

**10.5 Displacement Map (M).**
- `amounty` "Vertical amount" −200..200 px (absent = amount).
- New channel options: 2 Luma→X only, 3 Luma→Y only, 4 Alpha→both.
- `smooth` "Map blur" 0–40 px, def 0.
- `fit` As placed (def) / Stretch to this layer.
- Test: channel 2 moves pixels only horizontally.

**10.6 Mirror (M); fixes C39**
- `angle` "Reflection angle" −180..180°, def 0.
- `repeat` "Repeat folds" On (def, legacy On) / Off.
- Size the plate from `nestedPlate`, as Pixelate does.
- Test: `angle:45` gives an image symmetric about the diagonal through the seam.

**10.7 Hexagon Tiles.**
- `gap` "Grout" 0–40 %, def 0.
- A grout colour row, def #000000.
- `edge` "Edge shade" 0–1, def 0.
- Test: `gap:20` paints cell borders in the grout colour.

### Batch 11 — Generators & particles

**11.1 Particles (M).**
- `emitter` "Emit from" Point (def) / Line / Box / Circle / Whole frame, with `ew`/`eh` 0–200 %, def 50.
- `burst` "All at once" Off/On.
- `seed` 0–999.
- `drag` 0–5 /s.
- `turb` "Turbulence" 0–500 px.
- `sizevar`/`colorvar` 0–100 %, def 0.
- `lifevar` 0–100 %, def 30 (the old ±30 %).
- `behind` "Behind layer" Off/On.
- Everything is a closed-form f(i, age), so scrubbing works.
- Test: `burst:1` has `rate` particles alive at the layer start.

**11.2 Snow & Rain (`weather`).**
- New kinds: Confetti, Embers, Dust/Ash, Petals, Bubbles.
- `seed` 0–999.
- `sway` 0–3, def 1.
- Test: Confetti shows ≥ 3 distinct hues.

**11.3 Starfield (M); fixes C7b**
- `speed` "Fly-through" 0–5, def 0, with focus `x`/`y`.
- `driftx`/`drifty` −300..300 px/s.
- `glint` 0–1.
- `seed` 0–999.
- Hash in project space (x/ps).
- Test: the 20 brightest stars sit at the same project positions ±2 px at ps 0.28 and 1.

**11.4 Clouds (M); fixes C7a**
- `evolve` "Boil" 0–5, def 0.
- `detail` "Octaves" 1–6, def 3.
- `contrast` 0–300 %, def 100.
- `drifty` −200..200 px/s.
- Cell sizes and drift × ps.
- Test: the feature size in project px is within 10 % at ps 0.28 and 1.

**11.5 Voronoi.**
- `seed` 0–999.
- `fill` Seed colour (def) / Cell average / Random colour / Original (walls only).
- Wall colour, def #000000.
- `jitter` "Randomness" 0–1, def 1.
- Test: seed 3 and seed 0 differ.

**11.6 Lightning (M); fixes C34**
- `mode` Down the layer (def) / Point to point, with x1,y1,x2,y2.
- `glow` 0–400 %, def 100.
- Core colour (absent = today's 80 % white).
- `segments` 8–60, def 20.
- `drawon` Layer pixels (def) / Everywhere (also raises alpha).
- Test: Everywhere draws on a transparent layer.

**11.7 Roughen Edges.**
- `evolve` 0–5×, def 0.
- `seed` 0–999.
- `complexity` 1–4, def 1.
- `border` "Erode" 0–20 px, def 0.
- Test: `evolve:1` changes the edge between t=0 and t=0.5.

### Batch 12 — Keying, wipes, text, drawing

**12.1 Chroma Key Pro (M); fixes C3**
- `spillfrom` Green (legacy 0) / Match key colour (def 1).
- `clipblack` 0–100 %, def 0. `clipwhite` 0–100 %, def 100.
- `shrink` "Shrink/Grow" −10..10 px (mattechoker min/max).
- A View option "Composite on grey".
- Test: a blue key with despill 1 leaves a skin pixel's G unchanged and pulls a blue-spill pixel's B down (today it pulls G).

**12.2 Luma Key.**
- Mode options Similar / Dissimilar, with `tolerance` 0–0.5, def 0.1. Tolerance must be in the `_lkLast` key.
- Test: Similar at 0.5 removes mid-grey and keeps black and white.

**12.3 Wipes (Wipe, Radial Wipe); fixes C36**
- Both:
  - `fit` Frame (def) / Layer (pass `bb`).
  - `invert`.
- Radial:
  - `dir` Clockwise (def) / Counter / Both.
  - `blades` 1–12, def 1.
- Test: `fit:1` on a 100 px title hides about half of it at progress 0.5.

**12.4 Text.**
- Type-On:
  - `blink` 0–6 Hz, def 0.
  - `hidecaret` Off/On.
- Scramble: `order` L→R (def) / R→L / Random / Centre-out.
- Timecode:
  - New modes HH:MM:SS:FF, Frames and MM:SS.
  - `decimals` 0–3, def 1.
- Test: HH:MM:SS:FF at 3725.5 s and 30 fps reads `01:02:05:15`.

**12.5 Border Frame (M).**
- `style` Solid (def) / Dashed / Dotted, with `dash` 2–200 px (20) and `gap` 2–200 px (10).
- `progress` "Draw on" 0–100 %, def 100.
- `smooth` "Smooth corners" Off/On.
- Test: `progress:50` leaves half the perimeter empty.

**12.6 Find Edges; fixes C60**
- `width` "Line width" 1–8 px (unit px), def 1.
- Line/background colours, def #ffffff/#000000.
- `colour` "Colour edges" Off/On.
- Test: line thickness in project px is equal at ps 0.28 and 1.

**12.7 Emboss.** `relief` "Height" 1–10 px (unit px), def 1.
- Test: relief 4 widens the lit band against relief 1.

### Batch 13 — Stylize depth

**13.1 Halftone (M); fixes C32**
- `mode` Mono (def) / Colour dots / CMYK.
- Ink/paper colours.
- `aa` "Smooth dots" 0–2 px.
- `sample` Centre (def) / Cell average.
- `mix` 0–1, def 1.
- Test: Colour dots on a red picture gives red dots (today grey).

**13.2 CRT (M).**
- `curve` "Tube curvature" 0–100, def 0.
- `masktype` Stripes (def) / Slot / Dots.
- `bloom` 0–1. `flicker` 0–1.
- Test: `curve:60` blacks out the corners.

**13.3 VHS Tape.**
- `snow` 0–1.
- `fade` "Colour fade" 0–100 %.
- `jitter` "Vertical hold" 0–20 px.
- All default to 0.
- Test: `fade:100` cuts mean saturation by ≥ 30 %.

**13.4 Scanlines.**
- `softness` 0–100 %, def 0 (a cosine profile).
- `color`, def #000000.
- `dir` Horizontal (def) / Vertical.
- Test: Vertical darkens columns, not rows.

**13.5 Pixel Sort (M).**
- `by` Brightness (def) / Hue / Saturation / R / G / B.
- `seed`.
- `reroll` 0–30 Hz.
- Direction options ↘ and ↗.
- Test: `by:Hue` makes a sorted row monotonic in hue.

**13.6 Dither (M).**
- `method` Ordered (def) / Floyd–Steinberg / Atkinson / Blue noise.
- Ink/paper colours in Mono.
- Add a note under the control: "error diffusion shimmers on video".
- Test: Floyd–Steinberg on 50 % grey has no 2×2 period.

**13.7 HSL Bands.**
- `satgate` "Ignore greys below" 0–100 %, def 33 (today's S×3).
- `lumlow`/`lumhigh` 0–100 %, def 0/100.
- `view` "Show selection" Off/On (it also renders in export, so label it).
- Test: `lumhigh:50` leaves a bright blue untouched.

### Batch 14 — Blurs, repetition, 3D

**14.1 Tilt Shift (M); fixes C45**
- `band` "Sharp band" 0–50 %, def 0.
- `shape` Linear (def) / Radial, with `cx`.
- `passes` 1–3, def 1.
- `pop` "Miniature pop" 0–100 %, def 0.
- Test: `band:20` leaves rows within ±10 % of the focus identical to the source.

**14.2 Lens Blur.**
- `rotation` 0–360° (when not Circle).
- `threshold` "Bloom threshold" 0–100 %, def 60 (today's constant).
- `ratio` "Anamorphic" 50–200 %, def 100.
- Test: `ratio:50` makes a dot's bokeh twice as tall as it is wide.

**14.3 Directional Blur; fixes half of C25**
- `side` Both (def) / Behind / Ahead.
- `edges` Fade (def) / Repeat edge pixels (the Backfill padded-plate trick).
- Test: Repeat on a full-frame clip keeps the edge column at alpha 255.

**14.4 Backfill (M); fixes Backfill's part of C24**
- `style` Blurred copy (def) / Mirrored edges / Solid colour, with a colour.
- `saturation` 0–200 %, def 100.
- `vignette` 0–1.
- Route its blur through the GPU fallback when `!ctxFilterOK()`.
- Test: Solid #ff0000 paints the bars red.

**14.5 Repetition (M); fixes Trail's and Scatter's part of C27**
- Trail:
  - `scale` 50–150 %, def 100.
  - `rotate` −45..45°, def 0.
  - `order` In front (def) / Behind.
  - `delay` "Time offset per copy" −1..1 s, def 0 (copies render at t + k·delay; capped).
- Tile Grid:
  - `scrollx`/`scrolly` −200..200 %/s, def 0 (GLSL uniform).
  - `gap` 0–40 %, def 0.
- Scatter:
  - `drift` 0–200 px/s, def 0.
  - `spin` −360..360 °/s, def 0.
- `expand` for Trail and Scatter.
- Test: Trail `scale:80` makes the 3rd copy 0.8³ of the size.

**14.6 3D solids (M).**
- `persp` 0–100, def 50 (≡ F 3.2 exactly; a missing key reads 3.2).
- `offx`/`offy` −100..100 %.
- `spinx`/`spiny`/`spinz` "Auto-spin" −360..360 °/s.
- The starpoly3d cap assumes F 3.2, so re-derive it.
- Test: `spiny:90` at tl=1 equals roty 90 with no spin.

**14.7 Card Flip (M); fixes C29**
- `angle` "Flip" 0–360°, def 180 (legacy 180; exactly 180 keeps the mirror path; otherwise a renderMesh quad subdivided 8×8).
- `persp` 0–100, def 50.
- `back` Mirror (def) / Solid colour / Transparent.
- Test: `angle:90` gives an edge-on sliver under 10 % of the width (today a mirror).

### Batch 15 — Heavier filter & grade tools (M–L)

**15.1 Filter: tonal range + protect skin.**
- `range` All (def) / Shadows / Midtones / Highlights.
- `rangesoft` 10–200 %, def 100.
- `skin` "Protect skin" 0–100, def 0.
- Only the non-default case pays 2 getImageData + 1 putImageData.
- Test: `range:Highlights` leaves a black pixel unfiltered.

**15.2 Filter: finish sliders.**
- `warmth` −100..100, `fade` 0–100, `grain` 0–100, `vignette` 0–1, `sharpen` 0–3, all def 0.
- They become synthetic children appended at render time and are never saved into `fx.effects`.
- Test: `warmth:50` warms the frame and leaves `fx.effects.length` unchanged.

**15.3 Filter: strength past 100 %.** `boost` "Over-drive" 0–100 %, def 0: out = A + (B−A)(1+boost), clamped.
- Test: `boost:100` gives |out−A| ≈ 2|B−A| on mid-tones.

**15.4 Filters tab: tiles on my clip (draw first).** An "On my clip" toggle that renders tiles from the selected layer at the playhead.
- Cached by id + time bucket, run through the rAF job queue, with the stock photo as fallback for shape/text.
- Test: with the toggle on, the tile pixels differ from the stock tile.

**15.5 Levels: all four channels in one.**
- Per-channel stored sets (`inblack_r`, `gamma_b` …). `channel` becomes the editing selector, via `liveWhen`.
- Legacy: a saved channel 1–3 instance maps into that channel's set.
- Test: R `inwhite:200` and B `inblack:50` in one instance both apply.

**15.6 Match Grade.**
- `sample` Every frame (def) / Hold at time, with `at` 0–600 s.
- `smooth` 0–2 s, def 0.
- `skin` 0–100, def 0.
- Invalidate the cache when either layer is edited.
- Test: Hold at time applies identical gains at t=1 and t=2.

**15.7 Gaussian Blur (L).**
- `edges` Repeat Off/On.
- `dims` Both (def) / Horizontal / Vertical.
- `mix` 0–100 %, def 100, with `blend` Normal / Screen / Soft light (Orton).
- A non-default value moves this instance to a plate pass. Say in the row that it then follows stack order.
- Test: `dims:Horizontal` keeps a horizontal line sharp vertically.

---

## B. NEW — needs an options sheet first (#545), ranked by value to Ezra

Ranking: things his edits use (beats, voices, trails, captions, overlays) and cheap wins first. Every name gets checked against the #954 list. "Controls" are the proposed first version.

**B1. Voice changer (new "Voice" audio category). Audio, M.**
- Controls: one-tap tiles that add a named stack of existing effects. Each member stays editable.

| Voice | Stack |
|---|---|
| Chipmunk | pitch +7, eq3 high +3 |
| Helium | pitch +12 |
| Deep | pitch −5, bass +4 |
| Monster | pitch −10, distortion 20, reverb 0.3 |
| Robot | ringmod 60 Hz square mix 0.6, short flanger |
| Alien | ringmod 400 mix 0.35, pitch +4, phaser |
| Megaphone / Walkie-talkie | telephone styles |
| Radio | bandpass 1800 Q 0.7, distortion 15, lo-fi hiss |
| Underwater | lowpass 450 Q 2 @ 24 dB, vibrato 1.2 Hz 0.2, reverb 0.7/0.4 |
| Cave | reverb 0.9/5 s, echo 0.25/0.3 |
| Stadium | reverb 1/3.5 s/0.45, echo 0.12 |
| Old record | lofi 0.7 + crackle |

  Plus "Save this stack as a voice".
- Why: CapCut's most-used audio feature, and FCP has a whole Voice category. The DSP exists already; only the packaging is missing.
- How: a `voice` entry in `FM.AFX_CATEGORIES` + `AUDIO_CAT_ICON`. A tile calls `makeInstance` per member inside one `history.commit`.
- Risk: none for render. The stack counts against `AFX_MAX` 16. Robot needs the 7.7 square shape, Underwater needs the 7.5 slope, and Radio/Old record need 9.5, so ship B1 after batches 7 and 9, or ship v1 without those three.

**B2. Colour Flash. Opacity, S.**
- Controls:
  - Colour, def #ffffff.
  - `mode` Pulse / Single.
  - `rate` 0.5–30 Hz. `duty` 1–99 %. `progress` 0–1 (Single).
  - `curve` Sharp / Smooth / Decay.
  - `amount` 0–1.
  - `blend` Normal / Add / Screen / Multiply.
  - `seed` (random-interval mode).
- Why: the dip-to-white on the beat or cut is basic edit vocabulary. Flash (darken) only darkens.
- How: a PIXEL_FX colour mix with a time envelope (the flicker/flashdark idiom). Audio React can drive it through `fx:<i>:<key>`.

**B3. Echo (time trails). Repetition/temporal, M.**
- Controls:
  - `count` 1–12 (4).
  - `time` "Echo time" −2..2 s (−0.1).
  - `decay` 0–1 (0.6).
  - `start` 0–1 (1).
  - `order` Behind / In front.
  - `blend` Normal / Add / Screen / Lighten / Maximum.
- Why: AE Echo, CapCut Ghost/Afterimage. Dance edits and light-painting. Nothing here renders a layer at past times.
- How: a CANVAS_FX that calls `drawLayer` at t + k·time on the pooled plate (`_cfPool`), with the `FM._mfGhost` recursion guard. Stateless.
- Risk: count × one layer render, so cap it and use the plate scale.

**B4. Meme & cartoon sounds (new "Cartoon" category). SFX, M.**
- Sounds:
  - Boing (sine 400→150 Hz with a decaying 12 Hz vibrato).
  - Slide whistle up and down (600↔1800 Hz, 6 Hz vibrato).
  - Sad trombone (saw through a 1.2 kHz lowpass, Bb3-A3-Ab3-G3).
  - Airhorn (3 detuned saws around Bb4, da-da-daaa, light drive, level 0.8).
  - Wobble.
- Controls: Pitch, Length and Variation via 9.2.

**B5. Beeps pack. SFX, S.**
- Sounds:
  - **Censor bleep**: length 0.1–5 s (0.6), tone 400–2000 Hz (1000), 5 ms fades.
  - **Countdown** 3-2-1-Go: 880 Hz 0.12 s ×3, then 1760 Hz 0.4 s, with a 1 s or 0.5 s gap.
  - **Message ping**: 1318 Hz + 4× partial, twice.
  - **Heart monitor**: 1 kHz 0.1 s every 0.8 s, with a flatline option.
- The bleep's length needs 9.2.

**B6. Star Glow. Colour/light, M.**
- Controls:
  - `threshold` 0–100 % (70).
  - `arms` 4/6/8 (4).
  - `length` 5–400 px (60).
  - `angle` 0–360° (45).
  - `amount` 0–2 (1).
  - Colour (#ffffff).
  - `falloff` 0.2–4 (1.2).
  - `rainbow` 0–1 (0).
- Why: Trapcode Starglow and CapCut Starlight, for sparkle on lights, jewellery and titles.
- How: highlight extract (the Light Glow pattern), then N/2 two-sided streak passes (the Linear Streaks tap walk), then screen. It may spread past alpha, and it skips dark pixels.

**B7. Film Damage. Stylize, M.**
- Controls:
  - `dust` 0–1 (0.3). `scratches` 0–1 (0.2). `hair` 0–1 (0.1).
  - `flicker` 0–1 (0.2).
  - `weave` "Gate weave" 0–10 px (1.5).
  - `burn` "Splice frames" 0–1 (0).
  - `rate` 6–30 fps (18).
  - `seed`.
  - `speck` Dark / Light / Both.
- Why: Old Film and Super 8 fake projector wear with TV scanlines today.
- How: a hash-seeded PIXEL_FX on floor(t·rate)+seed. Gate weave is a sub-pixel whole-frame offset with an edge fill.

**B8. Eight new filter looks (data only, `js/filters.js`). Filters, S each.**

| Look | Section | Recipe |
|---|---|---|
| **Game Boy** | Stylised | grayscale 1 · contrast 1.15 · pixelate 4 · palettemap mode 1, 4 greens #0f380f #306230 #8bac0f #9bbc0f |
| **X-Ray** | Stylised | invert 1 · grayscale 1 · contrast 1.35 · duotone .85 #020814→#bfe8ff · softglow .35/160/45 |
| **CCTV** | Tuff | grayscale .85 · contrast .9 · brightness .96 · compresscrunch q .35 block 10 chroma 20 ringing .4 · noise 18/12 · scanlines .14/3 · vignette .35/36 · flashdark .3/6/.1/.4 |
| **Pencil** | Stylised | sketch .9 darkness 560 threshold 12 tooth 35 · temperature 8 · levels inwhite 245 outblack 22 |
| **Autumn** | Cinematic | contrast 1.08 · saturate 1.1 · hslbands Green hue −40 sat 15 lum −5 · hslbands Yellow hue −12 sat 20 · temperature 20 tint 6 · vignette .25/44 |
| **Green Code** | Cinematic | contrast 1.22 · saturate .7 · colorbalance −22/18/−16 Mids · highlightsshadows −10/−24 · vignette .4/34 |
| **Sky Grad** | Cinematic | contrast 1.05 · saturate 1.08 · gradientoverlay Linear, colour at the top, Multiply, mid .4, amount .55, #a0672e→#ffffff |
| **Solarised** | Black/White | grayscale 1 · contrast 1.15 · solarize .55/.25 Brightness · vignette .3/40 |

- Must pass queue 675 (distance), 858 (every ingredient alive), CSS-first order, 565 dots. Mono filters must separate on luma.
- Show them beside #912's ten, which are still unpicked.

**B9. Karaoke captions (Word Highlight). Text, L.**
- Controls:
  - `progress` 0–1, or `follow` "Timing from captions".
  - `unit` Word / Letter / Line.
  - `style` Colour / Box behind / Underline / Scale up.
  - Active colour; box colour.
  - `padding` px; `radius` px.
  - `past` Keep highlight / Return.
- Why: the single most-requested caption look on TikTok and CapCut. `captions.js` exists already.
- How: the text renderer must accept styled runs (the `drawAnimatedText` per-unit path). Word times from captions-vad have to be stored.
- Risk: touches the text renderer, so static text must stay byte-identical.

**B10. Bokeh Lights. Generative overlay, S.**
- Controls:
  - `count` 5–300.
  - `sizemin`/`sizemax` px.
  - `blur` 0–1.
  - `shape` Circle / Hexagon / Heart.
  - `drift` px/s + `angle`.
  - `twinkle` 0–1.
  - Two colours.
  - `opacity`. `seed`.
  - `blend` Screen / Add.
- How: a CANVAS_FX with hashed, wrap-around discs (the weather idiom) and cached gradient sprites.

**B11. Audio Spectrum (music visualiser). Generative, L.**
- Controls:
  - `source` audio/video layer.
  - `style` Bars / Line / Dots / Circle / Mirrored bars.
  - `bands` 8–128.
  - `height`.
  - `minfreq`/`maxfreq`.
  - `smoothing` 0–1.
  - x, y, width / radius.
  - `thickness`.
  - Gradient colours.
  - `peakhold`.
- How: an offline per-frame × per-band magnitude cache (the audio-react bake path), stored with the project. It is never a live AnalyserNode. Invalidate the cache on trim or move.

**B12. Transitions & glitch sounds. SFX, S.** Record scratch, tape stop (saw 220→20 Hz over 0.8 s, lowpass closing), radio tuning (a seeded random-walk bandpass + whistles), digital glitch (seeded square bursts + 20–60 ms gated slices).

**B13. 8-bit game sounds (new "Game" category). SFX, S.**
- Sounds:
  - Coin: B5→E6 at 0.08 s.
  - Jump: square 300→700 Hz over 0.15 s.
  - Power-up: C-E-G-C arpeggio at 60 ms.
  - Laser: 1800→200 Hz + 30 Hz vibrato.
  - Game over.
  - 1-up.
- A 4-bit shaper on the output. Keep the raw sum ≤ 1.2 until 3.1 lands.

**B14. Skin Smooth (Surface Blur). Blur, M.**
- Controls:
  - `radius` 1–30 px (6).
  - `threshold` 1–100 (25).
  - `amount` 0–1 (0.8).
  - `detail` "Keep texture" 0–100 % (30).
  - `skin` "Only skin tones" toggle.
- How: a guided filter (O(N) box sums) bounded by fxBounds, with a high-pass added back.

**B15. Shape Wipe (iris). Matte/transition, S.**
- Controls:
  - `progress` 0–1.
  - `shape` Circle / Ellipse / Rectangle / Diamond / Star / Heart.
  - `centerx`/`centery`.
  - `rotation`.
  - `aspect` 25–400 %.
  - `softness` 0–200 px.
  - `invert`.
  - `fit` Frame / Layer.
- How: analytic SDFs (the radialwipe structure). Keep it out of CROP_FX.

**B16. Trance Gate / Stutter. Audio, S.**
- Controls:
  - `pattern` — 8 presets:
    - x-x-x-x-
    - xx-xx-x-
    - x--x--x-
    - xxx-xxx-
    - triplet
    - half-time
    - 16ths
    - random
  - `rate` 0.5–16 Hz or tempo sync (8.7).
  - `depth` 0–1 (1).
  - `smoothing` 1–20 ms (3).
  - `mix`.
- How: a 16-step LFO buffer on the existing `s.lfo`, driving a VCA. Pattern and smoothing are rebuild params (7.1).

**B17. Datamosh. Stylize, L.**
- Controls:
  - `amount` 0–1 (0.7).
  - `hold` "Freeze reference" (keyframe it to start the bloom).
  - `block` 4–64 px (16).
  - `decay` "Heal" 0–1 (0.1).
  - `chroma` 0–1 (0.5).
- How: push the previous output with Motion Blur (Footage)'s `_mfField`.
- Risk: history-dependent, so a scrub differs from an in-order export. Label it like Temporal Denoise.

**B18. Colour Wheels (Lift / Gamma / Gain). Colour, M.**
- Controls: Shadows, Midtones and Highlights each get a hue 0–360, an amount 0–100 (0) and a brightness −100..100 (0). Plus Balance −100..100, Blending 0–100 (50), Keep brightness 0–100 (100).
- How: 256-entry per-channel tables on luma. `js/color-wheel.js` pucks on PC, sliders on the phone. ADJ_OK + PIXEL_ADJ.

**B19. Tone Curve (5-point sliders). Colour, M.**
- Controls:
  - Channel RGB / R / G / B selector.
  - Output at 0/25/50/75/100 % per channel (identity defaults, 20 keys).
  - Amount 0–1.
- How: a Fritsch–Carlson monotone cubic → a 256-entry LUT, memoised like `levelsLUT`.
- **Fold into the pending "Curves" question** (REQUESTS.md:5405). This is the cheap route that needs no new control kind.

**B20. HSL Mixer (all 8 colours). Colour, M.**
- Controls: a View selector (Hue / Saturation / Luminance) over 8 sliders (Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta), each −100..100. 24 keys.
- How: 360-entry hue→Δ tables built from the 24 sliders.

**B21. Filter layer (an adjustment layer that carries a filter). Workflow, M.**
- Add → "Filter layer" opens the Filters tab, and the pick lands on a new adjustment layer over the clip under the playhead.
- **Needs C1 fixed first.**

**B22. Drum hits (new "Drums" category). SFX, M.** Kick, snare, clap, hi-hat, rimshot "ba-dum-tss" and drumroll, with the recipes from the audio inventory.

**B23. Explosion & thunder. SFX, S.** Size small/big, Length, Variation.

**B24. Reduce Noise. Audio clip tool, L.**
- Controls:
  - amount 0–1 (0.6).
  - reduction 0–30 dB (12).
  - sensitivity 0–1 (0.5).
  - keep-voice toggle.
  - "Listen to removed noise".
- How: an offline STFT spectral gate, with the profile taken from `FM.detectSpeech` non-speech frames. Output is a switchable WAV twin clip, like Remove vocals (audio-tools.js:97-201).

**B25. Auto-duck music under voice. Audio tool, M.**
- Controls:
  - A key layer or "any speech".
  - amount 0–30 dB (12).
  - attack 0.05–1 s (0.2).
  - release 0.1–2 s (0.6).
  - padding 0–0.5 s (0.15).
  - A Generate / Update keyframes button.
- How: `FM.detectSpeech` writes volume keyframes, confirmed first and undoable.

**B26. Clarity & Dehaze. Colour, M.**
- Controls: Clarity, Texture and Dehaze −100..100 (0), plus Radius 10–200 px (60, unit px).
- How: a quarter-res midtone-weighted unsharp and a dark-channel dehaze.

**B27–B34 (S–M): the smaller effects.**

| # | Effect | Controls |
|---|---|---|
| B27 | Venetian Blinds | progress, count 2–60 (10), angle, softness, stagger, fit |
| B28 | Radio Waves | x, y, rate, speed, lifetime, width, fade, shape Circle/Square/Polygon + sides, spin, colour, blend |
| B29 | Lens Magnifier | x, y, size, zoom 1–8×, shape, feather, border + colour, shadow |
| B30 | Circle Array | count 2–36, radius, start, face centre, scale step, spin, spiral, fade |
| B31 | Cartoon | smoothing, shading steps 2–12, edge width, edge threshold, edge colour, saturation, mix |
| B32 | Oil Paint | brush 2–16 px, sharpness, detail 4/8 sectors, levels 0–32, mix. Summed-area Kuwahara. |
| B33 | Black & White Mixer | Reds/Yellows/Greens/Cyans/Blues/Magentas −200..300 (Photoshop 40/60/40/60/20/80), filter preset Neutral/Red/Orange/Yellow/Green/Blue/Infrared, tint + amount, contrast |
| B34 | Graphic EQ (10-band) | 31 Hz–16 kHz at ±12 dB, output, presets |

**B35–B56: the rest, in order.**

| # | Candidate | Kind | Size |
|---|---|---|---|
| B35 | Ambience pack: ocean, crickets, birds, room tone | SFX | M |
| B36 | Everyday foley: knock, footsteps, tick-tock, vibrate, typing, ka-ching | SFX | M |
| B37 | Laser Beam | Generative | S |
| B38 | Fractal Noise (Basic / Turbulent / Smooth / Ridged, contrast, octaves, evolution) | Generative | M |
| B39 | Gradient Wipe (map layer, progress, softness, channel, invert) | Matte | M |
| B40 | Title Warp (Arc / Arch / Bulge / Flag / Wave / Fish / Rise / Inflate / Squeeze / Twist); needs `bb` in the warp driver | Distort | M |
| B41 | Odometer Roll | Text | M |
| B42 | Noise Gate (threshold, floor, release, lookahead, hysteresis) | Audio | M |
| B43 | Loudness Match (−23 / −16 / −14 / −9 LUFS, peak guard) | Audio | M |
| B44 | Hum Remover (50 Hz def for Australia / 60, harmonics 1–8, width, amount) | Audio | S |
| B45 | De-esser (3–10 kHz, threshold, reduction, listen, mix) | Audio | M |
| B46 | Channel Utility (Stereo / Mono / Left→both / Right→both / Swap, invert L/R, balance) | Audio | S |
| B47 | Stereoizer (amount, delay, mono-safe, low cut) | Audio | S |
| B48 | Auto-Wah (LFO / Envelope, base, range, resonance, rate, sensitivity) | Audio | M |
| B49 | Split Toning | Colour | S |
| B50 | Channel Mixer (3×4, with an `out` selector) | Colour | S |
| B51 | Auto Levels / Contrast / Colour with temporal smoothing | Colour | M |
| B52 | Log to Normal (Apple Log, S-Log3, V-Log, C-Log3, D-Log M) | Colour | M |
| B53 | Deflicker | Blur | M |
| B54 | Spill Suppressor | Matte | S |
| B55 | Corner Pin — already asked (REQUESTS.md:5405) | Distort | L |
| B56 | LUT (.cube) — already asked (REQUESTS.md:5405) | Colour | L |

---

## C. BROKEN / WEAK — log as hunt items (severity is a suggestion)

Status key:
- **R** = confirmed by reading HEAD in this pass.
- **I** = the inventory's reading, not re-read.
- **M** = needs a measurement before it is called a bug.

### Likely real bugs

**C1. HIGH (R). A filter on an ADJUSTMENT layer renders nothing.** He sees "Added 1 filter" and the picture does not change.
- The Filters tab is offered there (inspector.js:3712, 3727).
- `fitToLayer` keeps the container with its ADJ_OK kids (fx-registry.js:645-651).
- `effectFilter` has no `'filter'` case and reads only top-level entries (compositor.js:1835-1893).
- `applyAdjustment` reads only top-level PIXEL_ADJ (15428-15430).
- The container is dispatched only in the per-layer post-fx (3356), which adjustment layers never reach (14680).
- Fix: `applyAdjustment` walks containers (kids through `effectFilter` + `applyPixelFx`, cross-faded by strength), or hide the Filters tab on adjustment layers until then.

**C2. MEDIUM (R, spec maths). The Limiter's Ceiling is not a ceiling** (audio-fx.js:647-655).
- The DynamicsCompressor's automatic makeup of −0.57·T dB is never cancelled.
- At a −1 ceiling a 0 dBFS sine exits at about −0.4 dBFS. At −24, quiet material is lifted about +13.7 dB and loud peaks sit near −9 dBFS.
- The boost limiter (audio-fx-live.js:106-116) carries +0.86 dB.
- Fix: 3.8.

**C3. MEDIUM (R). Chroma Key Pro despill always suppresses GREEN** (compositor.js:4545-4547). A blue screen pulls green out of skin and foliage and leaves the blue spill. The basic Chroma Key uses the key's dominant channel. Fix: 12.1.

**C4. MEDIUM (R). Only the first enabled Chroma Key and the first Luma Key on a layer run** (compositor.js:15214-15215, `.find`). A second key (two shades of a screen) is a silent no-op that still shows live sliders.

**C5. MEDIUM (R). Film Grain "Grain size" has no `unit:'px'`** (compositor.js:421). On the 0.28 phone plate the grain is about 3.5× coarser than in the export, the Noise bug fixed in v16.52. It also re-rolls at a fixed 24/s (4797). Fix: 1.1.

**C6. MEDIUM (R). Night Vision's scanlines (`y%3`) and sensor noise are per PLATE pixel, and the kernel takes no ps** (compositor.js:7353-7363). The phone preview is about 3.5× coarser than the export. Noise also re-rolls at a fixed 30/s.

**C7. MEDIUM (I, M).**
- (a) Clouds' octave cells are fixed at 64/32/16 PLATE px, with no ps (compositor.js:5581).
- (b) Starfield hashes per PLATE pixel, with no ps (5660-5693).
- In both, the preview shows different sizes or stars than the export. Fix: 11.3/11.4.

**C8. MEDIUM (R). Vignette has two renderers that disagree.**
- On media layers it is an inline gradient over the whole clip rect (compositor.js:15251-15269). It honours only the first vignette, ignores stack order and darkens a PNG's transparent areas.
- Everywhere else it is a pow-1.6 multiply (7191).
- The fallback sizes are 45 and 35.
- Fix: 6.1.

**C9. MEDIUM (R). A filter saved with "Save this effect as preset…" cannot be found again.**
- The toast says "hold Filter in the Effects browser" (inspector.js:1476), but `'filter'` is hidden (compositor.js:1397; fx-registry.js:614).
- The tab lists library sections only (filters.js:564-566).
- fx-presets `makeInstance` sets no `name`/`fid` (fx-presets.js:282-313).
- Fix: 4.3.

**C10. MEDIUM (R). The sound-effect ▶ is not what Add produces.** The raw ×0.82 preview (sfx.js:644-672) is set against a ×(0.89·level/peak) add (569-587), and raw peaks span 11×. Fix: 3.1.

**C11. LOW (R). Every noise buffer of the same length and colour is identical** (sfx.js:37-41). All 10 Fire crackles (532) and every Ticking-build tick (177) replay the same noise. Fix: 9.2.

**C12. LOW (R). The sound row's "playing" highlight clears only on its own timer** (sfx.js:757). Previewing another row leaves the first one lit, and nothing can stop a preview. Fix: 3.1.

**C13. LOW (R). Audio-effect search misses the words people use** (audio-fx-browser.js:269-283). 'karaoke' finds nothing, although the file itself calls Vocal Remove that. Fix: 3.2.

**C14. LOW (R). The Compressor's knee is never set** (the node default is 30 dB), and the spec's makeup silently lifts material below threshold (audio-fx.js:634-645). Fix: 3.7 + 7.1.

**C15. MEDIUM if confirmed (R + M). Ring Mod drives `playbackRate` = Hz on a 1 s buffer** (audio-fx.js:873-885). Chromium caps the buffer-source rate at 1024, so ~1024–2000 Hz probably all sounds like ~1024. Measure it in the suite's Chrome, and on his iPhone if possible. Fix: 7.7.

**C16. LOW-MEDIUM (R, spec). The Flanger's swept DelayNode sits in its own feedback cycle** (audio-fx.js:821-828). Spec-clamped to ≥ 128 frames (~2.7 ms), so the designed 1–7 ms sweep is flat at the bottom even at Feedback 0. Fix: 9.6.

**C17. LOW (R, spec). The Phaser's 1 ms feedback delay is in a cycle** (audio-fx.js:856-858). It is clamped to ~2.7 ms, so feedback adds a fixed ~375 Hz comb instead of sharpening the moving notches.

**C18. LOW (R). Bit Crush bits 13–16 ≈ dry.** The curve has 8192 linearly interpolated points (audio-fx.js:68-71), and the animated bank builds four identical top shapers. Fix: 9.7.

**C22. MEDIUM (R). Drop Shadow never draws beneath partially transparent pixels** (`if(dsa>0) continue;`, compositor.js:6133). Anti-aliased text edges show a light seam between the glyph and its shadow, and a semi-transparent layer casts no shadow behind itself. Softness is a single ≤ 20 px box (6120). Fix: 6.3.

**C24. MEDIUM-HIGH on his phone (R + M). On a device where `ctx.filter` does not work (the reason the GPU colour fallback exists, #661), these effects silently lose their blur.** Only the nine CSS effects consult `ctxFilterOK()`:
- Halation (compositor.js:10615, 10618) draws an un-bloomed red copy.
- Compound Blur (8577) stays sharp.
- Backfill (14390, 14394) draws a sharp zoomed copy behind the clip.
- Liquid Glass frost (11405).
- Motion Blur (Footage) mask feather (11151).

Confirm each with `FM._forceNoCtxFilter = true` plus a pixel test, then route them through `FM.glColor`.

**C27. MEDIUM (R). Shake, Swing, Spin and Pulse, plus Trail and Scatter Array, never get the `expand` plate** (compositor.js:11797, 11849, 11864, 11880, 11615, 11648). Queue 228 fixed this for Wiggle, Drift and Orbit (comment at 11889-11903). A clip scaled to 110 % to hide shake edges still shows empty edges. Fix: 2.1, 2.2, 14.5.

**C39. MEDIUM (R). Mirror sizes its plate from the PROJECT** (`W = P.width`, compositor.js:12456-12462), not from `nestedPlate`. It makes a full-resolution copy every frame even on the 0.28 playback plate (a phone cost), and it ignores `__fmOX/__fmOY` inside a camera or Squish plate. Fix: 10.6.

**C40. LOW (I, M). Chroma Key Pro "View: Matte" writes alpha 255 for every pixel, including transparent ones** (compositor.js:4541). A light-grey opaque band shows around the clip inside the crop margin.

**C41. LOW (R). Sharpen leaves an r-pixel border unsharpened** (loops run r..W−r, compositor.js:4919-4921). A soft 8 px frame edge on full-frame footage at radius 8.

**C52. LOW (I). The filter tile-pick preview uses raw recipe params via `Object.assign`** (inspector.js:2017-2030). It skips `saneChild` and `fitToLayer`, so the canvas can show ingredients that Add will drop (e.g. on an adjustment layer). Fix: 4.1.

**C60. LOW-MEDIUM (I). Find Edges' 3×3 Sobel (compositor.js:5068-5105) and Emboss's ±1 px kernel (5123-5149) work in plate pixels.** Lines are about 3.5× thicker relative to the frame in the phone preview than in the export. Fix: 12.6, 12.7.

### Weak by design (log as LOW, or leave to the polish item named)

| # | Finding | Where | Answered by |
|---|---|---|---|
| C19 | Distortion has no output compensation: about +20 dB small-signal at drive 30, +31 dB at 100 | audio-fx.js:62-67 | 7.3 |
| C20 | Pitch Shift lags by about D/2 (~25–50 ms), and at Mix < 1 it reads as a slap-echo | audio-fx.js:925-937 | hint line in 3.5 |
| C21 | Rain is flat static, and the nature beds are 2.4–2.6 s with fades at both ends, so tiled copies dip | sfx.js:512-522, 501-541 | 9.3, 9.4 |
| C23 | Light, Soft and Dark Glow skip alpha 0, so the bloom stays inside the silhouette | compositor.js:5491, 5596, 6994 | 6.2 |
| C25 | Gaussian and Directional Blur fade a full-frame clip's edges on PC, but the GPU fallback clamps (gl-color.js:291-292), so phone and PC differ | compositor.js:11572-11590 | 14.3, 15.7 |
| C26 | Every warp is point-sampled with clamped edges | compositor.js:7531-7533; gl-warp.js:83-84, 172 | 10.1 |
| C28 | Wiggle and Shake are unseeded, so two layers move in lockstep | compositor.js:11784, 11812-11814 | 2.1 |
| C29 | "Card Flip" is an instant mirror, `scale(-1)` | compositor.js:11327-11345 | 14.7 |
| C30 | Ripple and Curl have no falloff, although EFFECTS-PLAN.md:546-547 lists it as shipped | compositor.js:9247-9271 | 10.2 |
| C31 | Frame Stutter's held frame depends on playback history, and Time Warp Scan fills with the current frame after a jump | compositor.js:11019-11034; 10802-10806 | needs a stateless `drawLayer(q/rate)` hold (M) |
| C32 | Halftone is binary with no anti-aliasing and samples one pixel per cell, so it shimmers. "Poster Print" promises colour it cannot show | compositor.js:5057-5062; filters.js:155-158 | 13.1 |
| C33 | Checker, Grid and Stripes are aliased, and Border Frame's rounded corners are binary | compositor.js:5362-5366, 5382-5385, 5593-5594, 6977-6983 | 12.5 |
| C34 | Lightning skips alpha 0 and always strikes top to bottom | compositor.js:7278, 7312-7318 | 11.6 |
| C35 | Glow Scan is frame-relative and phase-locked | compositor.js:6440 | 6.7 |
| C36 | Wipe is measured across the frame from the frame centre, and Radial Wipe is clockwise only | compositor.js:6250 | 12.3 |
| C37 | Roughen Edges is static with no seed, Voronoi has no seed, and Speed Lines never re-randomise | compositor.js:6416, 7095, 10882-10883 | 11.7, 11.5, 2.5 |
| C38 | Lens Flare's core and six rays are welded, and its X/Y are 0–1 while siblings use 0–100 % | compositor.js:6415 | 6.5 |
| C42 | Radial Shadow has fixed 10 taps and an alpha cap of 200 | compositor.js:7072 | — |
| C43 | Long Shadow is capped at 80 px, and its non-45° path is aliased | compositor.js:5493 | — |
| C44 | Match Grade re-measures both clips every frame, so the grade pumps | compositor.js:8649 | 15.6 |
| C45 | Tilt Shift is one box pass with no sharp band | compositor.js:6037-6100 | 14.1 |
| C46 | Colour Temperature is additive, so blacks get tinted | compositor.js:4719-4729 | 1.6 |
| C47 | Highlights & Shadows is a global curve that lifts blacks to milky | compositor.js:6024 | 5.2 |
| C48 | Teal & Orange works on luma only, so the whole frame goes blue (#858) | compositor.js:6880-6888 | 5.3 |
| C49 | Light Glow uses a hard threshold step, which leaves contours in gradients | compositor.js:5491-5492 | 6.2 |
| C50 | Vignette is a circle, which on 9:16 gives dark bands top and bottom | compositor.js:7191 | 6.1 |

### Already logged, do not re-log
- #904: Blink's Rate is half its label (compositor.js:6152), and Flash (darken)'s Darkest is inert in all 10 Tuff filters (6183-6207). Both are waiting on his A/B.

### Structural notes (not bugs)
- The nine CSS effects always render before everything else, whatever their row order (FILTERS-DESIGN.md §6).
- Grayscale is CSS-only with fixed weights, so all 7 mono filters share one channel mix. B33 is the answer.
- Audio params can only be numeric sliders today. 7.1 is the answer.
