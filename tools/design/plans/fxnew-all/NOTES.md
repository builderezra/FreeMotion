# #966 §B — the eight new-effect branches as ONE release (`hunt/fxnew-all`, refers to #545)

Branch `hunt/fxnew-all` (helper clone, local, NOT pushed), worktree `~/fm-helper-wt/fxnew-all`, on `8004fa16`
(hunt/fx-land-on-fb2 — the commit every §B branch was built on). Built 13 Oct: the first six branches by one agent, then
hunt/fxnew-spectrum and hunt/fxnew-karaoke (merges 9 and 10) by a second, the same way.

**NOTHING HAS RUN.** The API builder was shipping, so no node, no python, no browser — not even `node --check`. Every
claim below is from reading the code and git. The proof is written and waiting: `prove.sh` in the helper's scratchpad
(`agents/fxnew-all/prove.sh`, results to `prove-result.txt` beside it), described below.

## Merge order and commits

Each branch merged with `git merge --no-ff` (diff3 conflicts), so each stays an ancestor and its own red-first proof still
applies. tests/tests.js was BUILT by blocks every time, never merged by hunks: the branch's appended block (the `+` lines of
its last hunk against 8004fa16, checked to be one pure run of additions) went in WHOLE before the final `})();`, and the
rest of the branch's tests.js was merged with `git merge-file --ours` (a conflict keeps the combined shared tests).

| # | commit | branch | what |
|---|---|---|---|
| 1 | 841af3e6 | hunt/fxnew-voice 6330c71b | B1 the Voice category (audio) |
| 2 | 90052619 | hunt/fxnew-echo ad253e48 | B3 Time Echo, B6 Star Shine — and the shared NEW-row tests rewritten once (below) |
| 3 | 8944999d | hunt/fxnew-colour 44e7038c | B18 Colour Wheels, B19 Tone Curve, B20 HSL Mixer |
| 4 | e4e4e1d0 | hunt/fxnew-looks dcb3cbd0 | B8 twelve filter looks, B2 Colour Flash, B15 Shape Wipe |
| 5 | cc28deb4 | hunt/fxnew-damage fd222679 | B7 Film Damage, B16 Trance Gate / Stutter |
| 6 | ef26251b | hunt/fxnew-sfx 27a31891 | B4 / B5 / B12 / B13 the four sound packs |
| 7 | aac7b365 | — | these notes |
| 8 | d1d19f80 | — | the three new tests that assumed their effect was the newest (below), and these notes updated |
| 9 | 56a3880e | hunt/fxnew-spectrum 1b50c4ad | B11 the Music Visualiser (`audiospectrum`) — leads the NEW row |
| 10 | b00af818 | hunt/fxnew-karaoke 3bc89f31 | B9 Word Highlight (`wordhighlight`, karaoke captions, text-only) — and E1's check for it |
| 11 | (next) | — | these notes, for merges 9 and 10 |

The scripts that did it are in the scratchpad: `merge.sh <branch>` (merge + build tests.js + join insert/insert conflicts),
`union-inserts.awk`, `commit.sh` (refuses on markers, `git diff --check`, CRLF, a mode change), `checks.sh`, `shared.sh`
(the shared tests against a saved canon after every merge), `verify.sh` (all eight branches), `names.sh` (a block's top-level
names against the rest of a file), `bal.sh` (bracket balance per block), `c9.sh` / `v10.sh` (the checks of merges 9 and 10).

## Every conflict and its resolution

- **js/compositor.js** — echo, colour, looks, damage and spectrum each inserted a self-contained block before
  `FM._FX_TABLES = …`. Kept all five whole, in merge order: Time Echo + Star Shine, the three grading tools, Colour Flash +
  Shape Wipe, Film Damage, the Music Visualiser (LAST, so it is the newest registered effect). No top-level name is shared
  between them or with the file (checked by grep: `B36_*`/`echo*`/`sg*`, `CG_*`/`TC_*`/`HM_*`/`cg*`/`tc*`/`hm*`,
  `B966_*`/`b966*`, `FD_*`/`fd*`, `B11_ROWS`/`SPEC_*`/`_spec*`/`spec*`; the one hit, `sgScratch`, is a `var` inside the
  softglow kernel, a different scope). Echo's `matchGradeFrameLayers` line and spectrum's drawCanvasEffect exact-bbox line
  (`|| fx.type === 'audiospectrum'`) merged on their own. **Karaoke's compositor.js merged on its own** — TEXT_FX.wordhighlight,
  drawAnimatedText's 9th argument (`hl`, null for every layer without a lit Word Highlight), the highlight block (`hl*`,
  `HL_BIG`, `drawHighlightLines`, seams `FM.captionWordTimes` / `captionWordStarts` / `_hlUnits` / `_hlWeight`) and the render
  site touch lines nobody else touched, and none of its names is declared anywhere else (names.sh).
- **js/fx-registry.js** — CATEGORY_OF: after E1's line, in merge order: echo 42, colour 43, looks 44, damage 45, then karaoke's
  `wordhighlight: 'text'` line, then spectrum's (batch 46) LAST. Looks', damage's and spectrum's comments said "batch 42"
  (echo's number) and now say 44, 45 and 46; damage's no longer claims to lead the row. Karaoke's line was moved ABOVE
  spectrum's (the merge joined it after) and has no batch number: it is TEXT_ONLY, so FX_FEATURED skips it wherever it sits,
  and this way the object's last line is still the newest registered effect that leads the NEW row. SEARCH_ALIASES after
  popart: echo, colour, looks, damage, spectrum, karaoke. ADJ_OK (colour), the group gate (echo), spectrum's two opt-in
  `paramsOf` fields (`layerAudio` → the picker's `audio: true`, `color2Gate`) and karaoke's TEXT_ONLY entry merged on their own.
- **js/inspector.js** — NOOP_WHY after matchgrade: echo's two, then colour's one; spectrum's layer-picker line (a sound picker
  lists only 'video' layers) merged on its own.
- **js/fx-thumbs.js** — merged on its own every time (echo's dusk line and Time Echo hook, colour's clouds / cat / ramp lines,
  looks' FILTER_SUBJECT block, Low Key → cat, the shapewipe / colorflash hooks, spectrum's `thumbSong()` + its OVERRIDE +
  `SUBJECT_OF.audiospectrum = 'card'`, karaoke's letter-by-letter OVERRIDE touch different lines).
- **js/audio-fx.js** — merged on its own: voice (the `voice` category, `VOICES`, `FM.audioVoices`) and damage (trancegate,
  `shop.lfo`'s `buffer`, `TEMPO()`'s Note default) touch different lines and neither names the other's.
- **js/exporter.js** (spectrum only — `prepareCaches` step (c) awaits `FM.audioSpectrum.prewarm(scene)`), **js/storage.js** and
  **js/captions.js** (karaoke only — `sanitizeEffects` keeps a valid `cue.words` and drops any other shape;
  `FM.captions.wordTimes` / `bakeWords`) are byte-identical to that branch's copy.
- **index.html** — every buster conflict resolved above every branch's (table below). Two traps in the first six merges: at
  merge 3 fx-thumbs (56) and inspector (419), and at merge 5 audio-fx (19), merged SILENTLY because both branches wrote the same
  number — the file is neither branch's copy any more, so each was bumped by hand. Merges 9 and 10 had none: every buster line
  both sides changed conflicted, and exporter / storage / captions are changed by one branch only.
- **tests/tests.js** — the shared NEW-row tests (below); every block appended whole: voice, echo, colour, looks, damage, sfx,
  spectrum, karaoke. Looks' other edits merged as written: queue 264 ALLOWED `shapewipe:progress=min` / `shapewipe:invert=max`
  (kept), and the six library pins filtered through `b966PreB8` (kept — 482 polish 1, 5.2, 5.3–5.5, 6.0 ×2, 6.3). Spectrum's
  own edits of E1 / 745 / 913.8 gave way to the combined versions (shared.sh: unchanged by the build), which now carry it.

**Found and fixed while merging (each said in its merge commit):**
- **hunt/fxnew-looks' tests.js did not parse.** Its 482 5.2 pin edit put a `//` comment in the middle of a line, so the
  comment swallowed `return (b.effects || []).some(…); }).map(f => f.id).sort();`. The comment now follows the statement; the
  code is what the branch meant. (Its own prove.sh would have stopped at stage 1.)
- **747 would go red on the combined tree** (no branch touched it): from the colour merge on, Match Grade leaves the twelve and
  no newer effect needs a setting, so its setup line fails. It now plants Match Grade through queue 787's seam
  (`FM._fxFeaturedPlant`) when the row has none, and removes the plant after.
- hunt/fxnew-damage's NOTES.md had a blank line holding two spaces (`git diff --check`); emptied.
- **Three of the branches' OWN new tests assumed their effect was the newest** and would be red on the combined tree (commit 8):
  '966 B2 Colour Flash is in the registry …' wanted Colour Flash at New-row index 0 or 1, '966 B15 Shape Wipe is in the
  registry …' wanted Shape Wipe to be the LAST registered effect and to lead the row, and '966 B7 Film Damage …' wanted it at
  index 0. Each now asks the same thing in a form that survives later batches: in the New row, behind ONLY effects registered
  after it (and Shape Wipe: the newest of its own batch, after E1's six). With the Music Visualiser in, the row reads
  audiospectrum, filmdamage, shapewipe, colorflash, … — each still behind only newer effects. Spectrum's and karaoke's own tests
  make no such assumption (no FX_FEATURED or last-registered check in spectrum's; karaoke's asks only that Word Highlight is NOT
  in the row and sits at index ≥ 205).
- **E1 would go red with karaoke in (merge 10)**, though karaoke edits none of the shared tests: the combined E1 read the six at
  `types.slice(205, 211)`, and Word Highlight is pushed straight after the main EFFECTS table — before E1's six, on purpose, so
  kitchen921's first 205 stay put — which makes it index 205 and moves the six to 206..211. E1 now finds the six where they are
  and allows only `BETWEEN = ['wordhighlight']` between the first 205 and them; on a tree without Word Highlight that is the old
  check exactly.

## The combined registration order

FM.EFFECTS (compositor order): the main table (the first 205 browsable — kitchen921's frozen slice), **wordhighlight** (index
205, pushed straight after the main table by karaoke), then E1's six (206..211), then timeecho, starglow, colorwheels,
tonecurve, hslmixer, colorflash, shapewipe, filmdamage, **audiospectrum** — the newest registered effect.

CATEGORY_OF read backwards = the NEW row, newest first (text-only, media-only, one-layer-type and filter-named ids skipped):
**audiospectrum, filmdamage, shapewipe, colorflash, hslmixer, tonecurve, colorwheels, starglow, timeecho, popart, censor,
glitter** — the twelve. Out of the row now: oilpaint, softskin, huecycle, weather (Snow & Rain), squish, matchgrade,
compoundblur, lumamatte, pixelsort. Word Highlight is never in it (TEXT_ONLY). The newest registered effect (FM.EFFECTS'
last), the newest by batch (CATEGORY_OF's last line) and the row's leader are the same, audiospectrum — 913.8 checks that.

## The shared tests, rewritten once (merge 2) and extended at merges 9 and 10 — true for any subset of the branches and for 8004fa16

Every list is filtered by what the tree has, so each test holds on the base, after each merge, and on the whole.
- **E1 'the six new effects are in the registry …'** — the six are one run, in order, right after the first 205 with only
  `BETWEEN` (wordhighlight) allowed between (what kitchen921's frozen slice relies on), and nothing after them but `LATER` =
  timeecho, starglow, colorwheels, tonecurve, hslmixer, colorflash, shapewipe, filmdamage, audiospectrum.
- **745 'the featured carousel is derived from batch order …'** — the row's first twelve are the first twelve of
  `NEWEST_FIRST` that exist (audiospectrum, filmdamage … timeecho, E1's six newest first, weather, squish, matchgrade,
  compoundblur, lumamatte, pixelsort, lensdistort) — colour's form; squish's batch-38 check only while squish is in the row;
  ≤ 12; not led by tunnel; every id real and not hidden.
- **913.8 'Snow & Rain, the newest effect, leads …'** (title kept, so drops.py stays at 0) — the row's leader is BOTH the
  newest registered effect (`fxRegistry.all()`'s last) and `NEWER[0]` (by batch, now audiospectrum), and opening Add Effect
  draws its card; while fewer than twelve effects are newer than Snow & Rain it sits right behind all of them (and its card is
  drawn); with twelve or more (FIFTEEN here — re-checked with the visualiser: still the "twelve newest, Snow & Rain out"
  branch) the row is exactly the twelve newest; squish's control only while it has room (fewer than 11 newer). That is queue
  913's own bug — the newest effect missing from the row — still held.
- **747 'a featured effect that needs a setting shows exactly one badge'** — as above (the plant). The visualiser does not
  need a setting (with no clip picked it listens to the whole soundtrack), so nothing changed.

## Busters (index.html) — strictly above every branch's, or the one branch's own where only it changes the file

| file | 8004fa16 | branches | here |
|---|---|---|---|
| js/compositor.js | 219 | 220 (echo, colour, looks, damage, spectrum, karaoke) | **222** |
| js/fx-registry.js | 27.32 | 28.33 echo, 27.33 colour / damage / spectrum / karaoke, 28 looks | **28.35** |
| js/fx-thumbs.js | 55 | 56 (echo, colour, looks, spectrum, karaoke) | **58** |
| js/inspector.js | 418 | 419 (echo, colour, spectrum) | **421** |
| js/audio-fx.js | 18 | 19 (voice, damage) | **20** |
| js/exporter.js | 128 | 129 (spectrum) | 129 |
| js/storage.js | 62 | 63 (karaoke) | 63 |
| js/captions.js | 62 | 63 (karaoke) | 63 |
| js/filters.js | 20 | 21 (looks) | 21 |
| js/sfx.js | 19 | 21 (sfx; 20 is batch 9's) | 21 |
| js/audio-fx-browser.js | 14 | 15 (voice) | 15 |
| styles.css | 762 | 763 (voice) | 763 |

Before merges 9 and 10 this branch had compositor 221, fx-registry 28.34, fx-thumbs 57, inspector 420; ONE bump covers both
merges (nothing shipped in between). The files changed by one branch only are byte-identical to that branch's copy
(verify.sh: filters, sfx, audio-fx-browser, styles.css, exporter, storage, captions). No other tag changed.

**C.SCHEMA_FP / SCHEMA_REV are untouched** — no branch changed them. The new registry params (the video effects, Trance Gate,
the Music Visualiser and Word Highlight) move the fingerprint, so `921 S1 the schema fingerprint gate`, `482 3.6 Collab …` and
`simple P1 · the collab fingerprint …` are red here until it is pinned; prove.sh stage 7 prints the number. **Pin it ONCE, for
all eight, now that both late branches are in.**

## What prove.sh checks (scratchpad `agents/fxnew-all/prove.sh` — WRITTEN, NOT RUN)

It exits at once while `/home/ezra/FreeMotion/.ship-in-progress` exists and checks again before every stage; node at nice 19.
1. `node --check` on every js changed since 8004fa16; tests.js as one script; the seven sheet probes as async bodies (karaoke's
   own prove.sh ran `node --check` on its probe, which would call its top-level `return` illegal — it is an async body like the
   rest); CRLF, `git diff --check`, mode changes.
2. Every '966 B' test (81) on the combined tree, through each branch's own harness: runc.js for B3 / B6 / B18–B20 / B7 (38),
   looks' runb.js for B8 / B2 / B15 (8; B8's photo half may fail with "no photo" in node), hv.js for B1 / B16 (9 + the B1
   phone sheet failing on the missing DOM only), hs.js for B4 / B5 / B12 / B13 (4; the tip loads 51 sounds), **spectrum's
   runs.js for B11 (10 PASS — a marked runc.js copy that also loads js/exporter.js, for the export test's `prepareCaches`)**,
   **runc.js for B9 (9 PASS; '966 B9 Colour' and '966 B9 Scale up' must say NOT RUN HERE — the soft canvas draws no glyphs, so
   those two are browser-only)**. All the rest must pass.
3. The same 81 on 8004fa16's js: every one must FAIL by name, none like a TypeError (B11's naming `FM.audioSpectrum` or the
   missing registry entry, B9's naming the missing Word Highlight — its two browser-only ones fail on `_b9need()` first)
   (`SKIPRED=1` skips).
4. The shared tests on both trees: the same verdicts (E1 and 745 PASS on both; 913.8 and 747 need the DOM); and 8004fa16's
   own bodies on the tip (E1 and 745 FAIL — why they were rewritten).
5. The video neighbours each branch's prove.sh named, union (spectrum's added: '482 11.' and '1116'; its '784' and
   '(queue 264)' sweeps were already in), on both trees with the tip's tests file (runc.js and runb.js): the same verdicts,
   the three fingerprint gates excepted (`SKIPNEIGH=1` skips 5, 5c and 6).
5c. Karaoke's own check: the existing text / caption / Type-On / 784 / 482 12.4 / typewriter / Animate tests from 8004fa16's
   OWN tests.js on both trees' js (runc.js) — identical verdicts (the text renderer must not change for text without a lit
   Word Highlight).
6. The audio neighbours: queue 585 PASS on both; 482 7.2 Tremolo / 482 8. (hv), 482 3. / 7. / 8. (h.js), the older sound
   tests (hs: verdict AND message) the same on both; 709, 986 C10 and C11 PASS on the tip.
7. The fingerprint: the fx-land control (want 1856346714373782, match true), 8004fa16 (match true), the tip (match FALSE)
   — and THE NUMBER TO PIN.
8. `treecheck.py 8004fa16 HEAD` and `drops.py 8004fa16 HEAD` (want 0 dropped).

Still owed after it: C.SCHEMA_FP pinned; Chrome at 900 and 380 (`?only=966%20B`, `?only=913.8`, `?only=747`, `?only=745`,
`?only=E1%20the%20six`) — including '966 B9 Colour' and '966 B9 Scale up', which only a browser can run (FAIL on 8004fa16,
PASS here); the B11 plate test's 1.5 px tolerance and B9's 1.5–3 px tolerances measured, not reasoned; karaoke's render-probe
pins identical on 8004fa16 and here (static text byte-identical against the OLD renderer); the sheets; **/security-review**
(below); ship.sh's own prove of the release.

## /security-review is owed at landing

His rule for anything that stores user data or writes it back out. Two branches here do:
- **Word Highlight stores `cue.words`** on captions (a list of word start times, saved in the project, carried by Split, trim,
  undo and collaboration). What to look at: storage.js keeps it only as an array of ≤ 5000 finite seconds 0–3600 and drops any
  other shape whole; the renderer checks it again (count matches the words, never goes backwards) before use; its colours from a
  file reach the canvas only when they look like `#hex` / `rgb()` / `hsl()`; no `innerHTML` anywhere in it (all canvas drawing).
- **Voice stores user-named voices** ("Save this stack as a voice") — the name he types is shown in the Voice category, so
  check every place it is drawn escapes it (no unescaped `innerHTML`) and what a malformed saved voice does on load.

## Questions for Ezra — one list, all eight branches, deduplicated (the sheet that answers each)

The sheets, all for the next browser slot: **voices** = the 16 voice WAVs (`run-probes.sh voices` on hunt/new-prep) plus the
Voice screens at 380 and PC (voice NOTES lists six); **echo** = `echo-strips.jpg`, `starshine-dusk.jpg`, `starshine-clouds.jpg`;
**colour** = `colourwheels-clouds/-pair.jpg`, `tonecurve-clouds.jpg`, `hslmixer-clouds/-shore.jpg`, `layouts.jpg`; **looks** =
`b8-looks-p1..p3.jpg`, `b8-lowkey-subject.jpg`, `b2-flash.jpg`, `b15-shapes-hard/-soft.jpg`, `b15-variants.jpg`; **damage** =
`fd-sheet-1/-2.jpg` (+ strips) and the Trance Gate WAVs; **sounds** = the listen page from `listen.json` and its WAVs;
**spectrum** = `spectrum-styles.jpg` (a row per Style, four moments of music each) and `spectrum-options.jpg` (colour modes,
band counts, widths, ends, sensitivity, treble lift, pitch ranges, circle sizes, resting height, fall time) from
`tools/design/plans/fxnew-spectrum/render-probe.js`, which also returns what a frame cost; **karaoke** = the twelve
`wh-<style>-<unit>.jpg` sheets (Colour / Box behind / Underline / Scale up × Word / Letter / Line; Return left, Keep right, at
0.9 / 2.0 / 3.2 s), `wh-options.jpg` and `wh-animated.jpg` from `tools/design/plans/fxnew-karaoke/render-probe.js` — run it on
this tree AND on 8004fa16: its static-text pins must be identical.

1–26 are the first six branches'; 27–41 (B11 the Music Visualiser, B9 Word Highlight) are added under their sections, so the
earlier numbers do not move.

What ships
1. Which voices stay — all 16 built; Phone call, Ghost and Choir are extras. Any that sound wrong? (voices)
2. Which eight of the twelve filter looks — recommended Handheld, X-Ray, Pencil, Autumn, Stained Glass, LED Wall, Darkroom,
   Watercolour; Etching is new to him. The four not picked are deleted before the release ships. (looks p1–p3)
3. Which of the 21 new sounds to keep — Bonk is an extra. (sounds)

Starting points
4. Time Echo and Star Shine defaults (the "recommended" tiles); and should Star Shine's Threshold start at 85 % — 70 % blooms on
   a bright sky? (echo; the clouds sheet for the Threshold)
5. Colour Wheels, Tone Curve, HSL Mixer starting looks (recommended tile, or "starts doing nothing"). (colour)
6. Colour Flash defaults: Pulse 2 Hz, 25 %, Decay, 0.8, white — or another row. (b2-flash)
7. Shape Wipe: Circle by default? Ellipse and Rectangle following the frame's shape (built), or fixed shapes? (b15 sheets)
8. Film Damage: too clean or too dirty? Which of the five starting points ship (as Presets)? Pink / Sepia / Grey the right three,
   and "Pink" the right word? Dirt starting at Both? (damage sheets)
9. Trance Gate: Trance the right first pattern, Attack 2 ms / Release 10 ms right? (Trance Gate WAVs)
10. Stutter: only the last beat of each bar is built — also every beat / every 2 bars / bar start; a next-slice, reversed or
    random stutter (needs a worklet the file does not allow today); Stutter as its own tile? (Trance Gate WAVs, the ×2/×4/×8 rows)
11. Loudness by ear: Air horn 0.8, the Game pack 0.7, the bleep 0.75, the rest 0.8–1. (sounds)
27. Music Visualiser: which Style a new one opens on — Bars (recommended), Mirror bars, Line, Filled wave, Circle or Dots?
    (spectrum-styles)
28. Music Visualiser colour: From the layer (recommended — the bars take the rectangle's own colour or gradient, so the fill
    tools style them), Gradient teal → pink, or Rainbow? (spectrum-options)
29. Word Highlight's default look: Colour (a yellow word) or Box behind (a violet box, white word) — and Word, Return? Recommended
    Colour, Word, Return (the TikTok / CapCut default). (the twelve wh- sheets)
30. Word Highlight's colours: active #ffd23f yellow, box #7c3aed violet — or one from wh-options, or his own. (wh-options)
31. Word Highlight's Timing: Spoken by default (recommended — it plays with nothing keyframed, on captions and on plain text), or
    Progress? (the wh- sheets)

Layout
12. The grading panels — layout A (built) / B / C for each; and is Tone Curve enough for "Curves", or does he want the
    drag-the-curve editor (layout B — a new control, a day or more)? (layouts.jpg)
13. The Voice category: last (built) or first; the tile (green tint + its first effect's glyph, or a drawing per voice); after a
    tap the first effect open (built) or all closed; a second voice added on top (built) or replacing; voices in Recents /
    Faves (not built); Save this stack as a voice also on the audio effects card; delete by two taps on ✕ (built) or
    press-and-hold. (voice screens)
14. Sound headings: Beeps under Interface and Transitions & glitch under Texture (built), or headings of their own; Slide whistle
    as two rows (built) or one with a Direction option. (sounds)
15. Low Key's filter tile moved to the cat photo (Autumn took bush) — keep, or another photo? (b8-lowkey-subject)
32. Music Visualiser: should the layer stay visible behind the bars (a card with bars on it)? Today the bars replace it.
    (spectrum-options — the From the layer tiles)
33. Word Highlight's Box behind is flat, like the caption plate (built) — or should the box take the text's shadow / glow too?
    (wh-boxbehind sheets)

Names
16. Time Echo or Afterimage; Star Shine, Star Filter or Cross Star. (echo)
17. Handheld (not "Game Boy"); Solarised (one letter from the Solarize effect); Etching (built on Halftone Lines, whose #954
    name is Engraving); and should Colour Cycle's search word "colour flash" go now a real Colour Flash exists? (looks)
18. Trance Gate, or plainer — "Beat Chop"? (Trance Gate WAVs)
19. "Extra life" or "1-up" (1-up is a search word either way). (sounds)
20. Four voices share names with Pitch Shift presets (Chipmunk, Helium, Deep, Monster) and four with Telephone styles (Phone,
    Radio, Megaphone, Walkie-talkie): keep both (built), or rename the presets / styles? (voice screens)
34. "Music Visualiser" (recommended), "Sound Bars" or "Audio Spectrum"? Audio Spectrum is After Effects' name, so it is a search
    word here either way. (spectrum-styles)
35. "Word Highlight" — "karaoke" already names Vocal Remove in the sound tools, so here it is only a search word. OK?
    (wh-options)

Icons (#545: options drawn at 24 px, he picks)
21. The Voice category (placeholder speech bubble), Trance Gate (borrows Gain's glyph), the Cartoon and Game sound categories
    (placeholders, shown nowhere yet). Nothing drawn yet.

Behaviour (no sheet — a yes / no)
22. Time Echo on a video in an export draws its echoes from the preview-size frame cache (≤ 640 px, slightly soft at 1080p) —
    fine, or decode them full size (memory on his phone)?
23. Time Echo is offered on a group's clips, not on the group — OK?
24. Colour Flash on an adjustment layer (flash the whole frame on a cut) — not offered yet (it needs the layer passed down the
    adjustment path): build it?
25. Old Film and Super 8: swap their scanlines for Film Damage? (changes two library filters; moves queue 675's distances)
26. Old record without crackle now (built), or wait for batch 9.5's crackle?
36. Music Visualiser: a one-tap "Add visualiser" on a song's own card (a rectangle with the effect, listening to that song)?
    Not built.
37. Peak caps on the bars (a marker holding each bar's recent top, falling slowly — the backlog's peakhold)? Not built.
38. Should a clip's audio effects (EQ, reverb …) change the bars? Today they show the clip as recorded.
39. "Whole soundtrack" decodes every clip with sound, camera clips included (a long clip is a lot of memory on a phone) — keep,
    or make it music and sound clips only?
40. A word-timing editor for captions — drag each word's start in the caption list (the storage, `cue.words`, is already
    there) — or have the AI set the times (its cue schema does not allow `words` today: a one-line change)? Today a caption's
    words share its length by syllables.
41. Curved text (Text Curve / Curve) ignores the highlight — worth building?

Not his — the builder's, listed so nothing is lost: Colour Flash into CROP_FX once `tests/_692crop.html` admits it in a browser;
the whole-catalogue sweeps beyond 784 / 264 that now include the visualiser and Word Highlight have not been read one by one.

## Unsure, said

- Nothing ran. The merges are textual; the semantics were READ: names, the NEW-row order, the busters, every block's load-time
  code (only closures and literals), and that the audio harnesses lift helpers by name (`…966b1`, `…Sfx966`) so the other
  blocks cannot disturb them.
- Bracket balance (bal.sh, strings and comments counted): spectrum's compositor block is balanced; karaoke's is ()-3 []-1, all
  of it explained by its two sentence-end regexes (`/[.!?…]["'’”)\]]*$/`, `/[,;:–—]["'’”)\]]*$/`) and a `[i0, i1)` comment — the
  same numbers as on its own branch; the two test blocks' imbalances are `[a, b)` ranges in comments, also unchanged.
- Search words overlap across branches and with older effects ("star", "sparkle", "shine", "bling" — Star Shine and Glitter;
  "flash", "strobe" — Colour Flash and the flash effects; "transition" — Colour Flash and Shape Wipe; "beat" — the visualiser
  and Colour Flash's "beat flash"; Trance Gate's "on off", "gate", "beat" in the audio list; "karaoke" — Word Highlight here,
  Vocal Remove in the sound tools). Each branch's own search test checks only its own words; #484 checks every alias reaches
  the index, and 986 C13's audio queries (robot voice exactly one effect, the mid-word strays) do not meet Trance Gate's words
  as far as I read — but the search results with all of them in are unmeasured.
- Every test that taps the FIRST card of the New row now taps the Music Visualiser (on a shape with no sound it draws resting
  bars — a visible change, but not the one Film Damage made); none was found that depends on WHICH effect is first (grep for
  FX_FEATURED[0] / a first featured card found nothing outside the shared tests).
- Word Highlight at index 205 of `fxRegistry.all()` moves E1's six one place on; the 921 kitchen fixture reads only the first
  205 and B2's "the first 211 must keep their places" only compares Colour Flash with Pop Art, so nothing else reads those
  indexes (grep) — E1 was the one test that did, and it is fixed.
- hunt/fxnew-voice's own prove.sh expects the fingerprint NOT to move; on the combined tree it does (Trance Gate and the video
  effects) — prove.sh here expects that.

## Security review owed by the HANDOVER — done 13 Oct ~19:20 by the API builder, code only, on c41-fxnew2
- **Voice (user-named voices):** stored only in this device's localStorage (`fm.afx.uservoices`), never on a layer and never sent
  to a friend (a voice adds ordinary effect instances; no name travels). Read back through `cleanVoice`: id must match
  `^my-[a-z0-9]{1,24}$`, name a non-empty string cut to 40, stack ≤ 16 entries of registry types with `cleanValues` params.
  Drawn only through `textContent` (`el()` in audio-fx-browser.js), `title` and `FM.toast` (textContent). No finding.
- **Word Highlight (`cue.words`):** the load sanitiser (storage.js) keeps it only as ≤ 5000 finite numbers in 0..3600 and
  deletes any other shape; the renderer ignores one that does not fit the words. No finding.
- The whole §B diff adds no innerHTML / insertAdjacentHTML / eval / new Function except `scroller.innerHTML = ''` (a clear).
