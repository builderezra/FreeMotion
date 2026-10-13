# #966 §B — the six new-effect branches as ONE release (`hunt/fxnew-all`, refers to #545)

Branch `hunt/fxnew-all` (helper clone, local, NOT pushed), worktree `~/fm-helper-wt/fxnew-all`, on `8004fa16`
(hunt/fx-land-on-fb2 — the commit every §B branch was built on). Built 13 Oct.

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
| 7 | (this file) | — | these notes |

The scripts that did it are in the scratchpad: `merge.sh <branch>` (merge + build tests.js + join insert/insert conflicts),
`union-inserts.awk`, `commit.sh` (refuses on markers, `git diff --check`, CRLF, a mode change), `checks.sh`, `shared.sh`
(the shared tests against a saved canon after every merge — unchanged from merge 2 to 6), `verify.sh`.

## Every conflict and its resolution

- **js/compositor.js** — echo, colour, looks and damage each inserted a self-contained block before `FM._FX_TABLES = …`.
  Kept all four whole, in merge order: Time Echo + Star Shine, the three grading tools, Colour Flash + Shape Wipe, Film
  Damage. No top-level name is shared between them or with the file (checked by grep: `B36_*`/`echo*`/`sg*`,
  `CG_*`/`TC_*`/`HM_*`/`cg*`/`tc*`/`hm*`, `B966_*`/`b966*`, `FD_*`/`fd*`; the one hit, `sgScratch`, is a `var` inside the
  softglow kernel, a different scope). Echo's `matchGradeFrameLayers` line merged on its own.
- **js/fx-registry.js** — CATEGORY_OF: four new lines after E1's, in merge order; looks' and damage's comments said "batch 42"
  (echo's number) and now say **44** and **45** (comments only — the ORDER is what the NEW row reads). SEARCH_ALIASES after
  popart: echo, colour, looks, damage. ADJ_OK (colour) and the group gate (echo) merged on their own.
- **js/inspector.js** — NOOP_WHY after matchgrade: echo's two, then colour's one.
- **js/fx-thumbs.js** — merged on its own (echo's dusk line and Time Echo hook, colour's clouds / cat / ramp lines, looks'
  FILTER_SUBJECT block, Low Key → cat, and the shapewipe / colorflash hooks touch different lines).
- **js/audio-fx.js** — merged on its own: voice (the `voice` category, `VOICES`, `FM.audioVoices`) and damage (trancegate,
  `shop.lfo`'s `buffer`, `TEMPO()`'s Note default) touch different lines and neither names the other's.
- **index.html** — every buster conflict resolved above every branch's (table below). Two traps: at merge 3 fx-thumbs (56)
  and inspector (419), and at merge 5 audio-fx (19), merged SILENTLY because both branches wrote the same number — the file
  is neither branch's copy any more, so each was bumped by hand.
- **tests/tests.js** — the shared NEW-row tests (below); every block appended whole: voice, echo, colour, looks, damage, sfx.
  Looks' other edits merged as written: queue 264 ALLOWED `shapewipe:progress=min` / `shapewipe:invert=max` (kept), and the
  six library pins filtered through `b966PreB8` (kept — 482 polish 1, 5.2, 5.3–5.5, 6.0 ×2, 6.3).

**Found and fixed while merging (each said in its merge commit):**
- **hunt/fxnew-looks' tests.js did not parse.** Its 482 5.2 pin edit put a `//` comment in the middle of a line, so the
  comment swallowed `return (b.effects || []).some(…); }).map(f => f.id).sort();`. The comment now follows the statement; the
  code is what the branch meant. (Its own prove.sh would have stopped at stage 1.)
- **747 would go red on the combined tree** (no branch touched it): from the colour merge on, Match Grade leaves the twelve and
  no newer effect needs a setting, so its setup line fails. It now plants Match Grade through queue 787's seam
  (`FM._fxFeaturedPlant`) when the row has none, and removes the plant after.
- hunt/fxnew-damage's NOTES.md had a blank line holding two spaces (`git diff --check`); emptied.

## The combined registration order

FM.EFFECTS (compositor order) after E1's six: timeecho, starglow, colorwheels, tonecurve, hslmixer, colorflash, shapewipe,
filmdamage — so the six still sit at 205..210 (kitchen921's frozen 205 are untouched) and Film Damage is the newest
registered effect.

CATEGORY_OF read backwards = the NEW row, newest first: **filmdamage, shapewipe, colorflash, hslmixer, tonecurve,
colorwheels, starglow, timeecho, popart, censor, glitter, oilpaint** — the twelve. Out of the row now: softskin, huecycle,
weather (Snow & Rain), squish, matchgrade, compoundblur, lumamatte, pixelsort. The newest registered effect (FM.EFFECTS'
last) and the newest by batch (CATEGORY_OF's last) are the same, filmdamage — 913.8 checks exactly that.

## The shared tests, rewritten once (merge 2), true for any subset of the four effect branches and for 8004fa16

Every list is filtered by what the tree has, so each test holds on the base, after each merge, and on the whole.
- **E1 'the six new effects are in the registry …'** — the six are `types.slice(205, 211)` in order (looks' form: what
  kitchen921's frozen slice relies on), and nothing after them but `LATER` = timeecho, starglow, colorwheels, tonecurve,
  hslmixer, colorflash, shapewipe, filmdamage.
- **745 'the featured carousel is derived from batch order …'** — the row's first twelve are the first twelve of
  `NEWEST_FIRST` that exist (filmdamage … timeecho, E1's six newest first, weather, squish, matchgrade, compoundblur,
  lumamatte, pixelsort, lensdistort) — colour's form; squish's batch-38 check only while squish is in the row; ≤ 12; not led
  by tunnel; every id real and not hidden.
- **913.8 'Snow & Rain, the newest effect, leads …'** (title kept, so drops.py stays at 0) — the row's leader is BOTH the
  newest registered effect (`fxRegistry.all()`'s last) and `NEWER[0]` (by batch), and opening Add Effect draws its card;
  while fewer than twelve effects are newer than Snow & Rain it sits right behind all of them (and its card is drawn); with
  twelve or more (fourteen here) the row is exactly the twelve newest and Snow & Rain is out of it; squish's control only
  while it has room (fewer than 11 newer). That is queue 913's own bug — the newest effect missing from the row — still held.
- **747 'a featured effect that needs a setting shows exactly one badge'** — as above (the plant).

## Busters (index.html) — strictly above every branch's, or the one branch's own where only it changes the file

| file | 8004fa16 | branches | here |
|---|---|---|---|
| js/compositor.js | 219 | 220 (echo, colour, looks, damage) | **221** |
| js/fx-registry.js | 27.32 | 28.33 echo, 27.33 colour/damage, 28 looks | **28.34** |
| js/fx-thumbs.js | 55 | 56 (echo, colour, looks) | **57** |
| js/inspector.js | 418 | 419 (echo, colour) | **420** |
| js/audio-fx.js | 18 | 19 (voice, damage) | **20** |
| js/filters.js | 20 | 21 (looks) | 21 |
| js/sfx.js | 19 | 21 (sfx; 20 is batch 9's) | 21 |
| js/audio-fx-browser.js | 14 | 15 (voice) | 15 |
| styles.css | 762 | 763 (voice) | 763 |

The four files changed by one branch only are byte-identical to that branch's copy (verify.sh). No other tag changed.

**C.SCHEMA_FP / SCHEMA_REV are untouched** — no branch changed them. The new registry params (video and Trance Gate) move the
fingerprint, so `921 S1 the schema fingerprint gate`, `482 3.6 Collab …` and `simple P1 · the collab fingerprint …` are red
here until it is pinned; prove.sh stage 7 prints the number. Pin it ONCE, after hunt/fxnew-spectrum (below) is in too.

## What prove.sh checks (scratchpad `agents/fxnew-all/prove.sh` — WRITTEN, NOT RUN)

It exits at once while `/home/ezra/FreeMotion/.ship-in-progress` exists and checks again before every stage; node at nice 19.
1. `node --check` on every js changed since 8004fa16; tests.js as one script; the five sheet probes as async bodies; CRLF,
   `git diff --check`, mode changes.
2. Every '966 B' test (60) on the combined tree, through each branch's own harness: runc.js for B3 / B6 / B18–B20 / B7 (38),
   looks' runb.js for B8 / B2 / B15 (8; B8's photo half may fail with "no photo" in node), hv.js for B1 / B16 (9 + the B1
   phone sheet failing on the missing DOM only), hs.js for B4 / B5 / B12 / B13 (4; the tip loads 51 sounds). All must pass.
3. The same 60 on 8004fa16's js: every one must FAIL by name, none like a TypeError (`SKIPRED=1` skips).
4. The shared tests on both trees: the same verdicts (E1 and 745 PASS on both; 913.8 and 747 need the DOM); and 8004fa16's
   own bodies on the tip (E1 and 745 FAIL — why they were rewritten).
5. The video neighbours each branch's prove.sh named, union, on both trees with the tip's tests file (runc.js and runb.js):
   the same verdicts, the three fingerprint gates excepted (`SKIPNEIGH=1` skips 5 and 6).
6. The audio neighbours: queue 585 PASS on both; 482 7.2 Tremolo / 482 8. (hv), 482 3. / 7. / 8. (h.js), the older sound
   tests (hs: verdict AND message) the same on both; 709, 986 C10 and C11 PASS on the tip.
7. The fingerprint: the fx-land control (want 1856346714373782, match true), 8004fa16 (match true), the tip (match FALSE)
   — and THE NUMBER TO PIN.
8. `treecheck.py 8004fa16 HEAD` and `drops.py 8004fa16 HEAD` (want 0 dropped).

Still owed after it: C.SCHEMA_FP pinned; Chrome at 900 and 380 (`?only=966%20B`, `?only=913.8`, `?only=747`, `?only=745`);
the sheets; ship.sh's own prove of the release.

## Merging hunt/fxnew-spectrum later (B11 Music Visualiser, `audiospectrum`)

On 13 Oct it had three commits (2f96c3f7 … 1b50c4ad) and was still being built. When it is finished:
1. `bash …/agents/fxnew-all/merge.sh hunt/fxnew-spectrum` in `~/fm-helper-wt/fxnew-all` (tree clean). It merges with diff3,
   joins insert/insert conflicts ours-then-theirs, and builds tests.js by blocks keeping the combined shared tests.
2. compositor.js: its block after Film Damage's, before `FM._FX_TABLES` — so `audiospectrum` is the last pushed, matching its
   CATEGORY_OF line — and its drawCanvasEffect exact-bbox line (`|| fx.type === 'audiospectrum'`). fx-registry.js: its
   CATEGORY_OF line LAST (after damage's; call it batch 46), its search words after damage's, and its two opt-in `paramsOf`
   fields (`layerAudio`, `color2Gate`). inspector.js: its layer-picker line. exporter.js and fx-thumbs.js: its own lines.
3. The shared tests: put `'audiospectrum'` at the FRONT of 745's `NEWEST_FIRST` and 913.8's `NEWER`, and into E1's `LATER`.
   747 needs nothing (the visualiser is not in `NEEDS_INPUT`).
4. Busters above both: compositor 222, fx-registry 28.35, fx-thumbs 58, inspector 421; exporter.js its own 129.
5. prove.sh: add `'966 B11 '` to `VID_C` (or the harness its own prove.sh uses) and raise the expected counts (38 → 38 + its
   tests; 60 → 60 + its tests on the base).
6. Then pin C.SCHEMA_FP once for all seven.

## Questions for Ezra — one list, all six branches, deduplicated (the sheet that answers each)

The sheets, all for the next browser slot: **voices** = the 16 voice WAVs (`run-probes.sh voices` on hunt/new-prep) plus the
Voice screens at 380 and PC (voice NOTES lists six); **echo** = `echo-strips.jpg`, `starshine-dusk.jpg`, `starshine-clouds.jpg`;
**colour** = `colourwheels-clouds/-pair.jpg`, `tonecurve-clouds.jpg`, `hslmixer-clouds/-shore.jpg`, `layouts.jpg`; **looks** =
`b8-looks-p1..p3.jpg`, `b8-lowkey-subject.jpg`, `b2-flash.jpg`, `b15-shapes-hard/-soft.jpg`, `b15-variants.jpg`; **damage** =
`fd-sheet-1/-2.jpg` (+ strips) and the Trance Gate WAVs; **sounds** = the listen page from `listen.json` and its WAVs.

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

Names
16. Time Echo or Afterimage; Star Shine, Star Filter or Cross Star. (echo)
17. Handheld (not "Game Boy"); Solarised (one letter from the Solarize effect); Etching (built on Halftone Lines, whose #954
    name is Engraving); and should Colour Cycle's search word "colour flash" go now a real Colour Flash exists? (looks)
18. Trance Gate, or plainer — "Beat Chop"? (Trance Gate WAVs)
19. "Extra life" or "1-up" (1-up is a search word either way). (sounds)
20. Four voices share names with Pitch Shift presets (Chipmunk, Helium, Deep, Monster) and four with Telephone styles (Phone,
    Radio, Megaphone, Walkie-talkie): keep both (built), or rename the presets / styles? (voice screens)

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

Not his — the builder's, listed so nothing is lost: Colour Flash into CROP_FX once `tests/_692crop.html` admits it in a browser.

## Unsure, said

- Nothing ran. The merges are textual; the semantics were READ: names, the NEW-row order, the busters, every block's load-time
  code (only closures and literals), and that the audio harnesses lift helpers by name (`…966b1`, `…Sfx966`) so the other
  blocks cannot disturb them.
- Search words overlap across branches and with older effects ("star", "sparkle", "shine", "bling" — Star Shine and Glitter;
  "flash", "strobe" — Colour Flash and the flash effects; "transition" — Colour Flash and Shape Wipe; Trance Gate's "on off",
  "gate", "beat" in the audio list). Each branch's own search test checks only its own words; #484 checks every alias reaches
  the index, and 986 C13's audio queries (robot voice exactly one effect, the mid-word strays) do not meet Trance Gate's words
  as far as I read — but the search results with all of them in are unmeasured.
- Every test that taps the FIRST card of the New row now taps Film Damage — what it was on hunt/fxnew-damage alone, so that
  branch's reasoning holds; the second and third cards are now Shape Wipe and Colour Flash.
- hunt/fxnew-voice's own prove.sh expects the fingerprint NOT to move; on the combined tree it does (Trance Gate and the video
  effects) — prove.sh here expects that.
