# #912 clause 1: the ten new filters, ported onto v17.52

Branch `hunt/912-filters`, cut from `ssh/hunt/v52` (8c2de546, the code of v17.52). Source: `fm912-filters` (ce77895a, 22 Sep, Mac,
about v16.7x), fetched from `refs/mac-backup/2026-10-07/heads/fm912-filters`.

**Code only. Nothing was run**: no browser, no server, no suite, no fp.js (a release ship was running on the laptop). The only
programs used were `node --check`, git, grep, sed and awk. `node --check` passes on js/filters.js, js/fx-thumbs.js and
tests/tests.js.

## The ten

His words (#912 clause 1): "add some more filters". Decision 11 Oct (#1130, PM under his standing rule; he can overrule):
keep all ten, so the "#912 candidates — he picks" marking is gone.

| id | name | section | tile photo |
|---|---|---|---|
| sepia | Sepia | Retro / Analogue | shore |
| digicam | Digicam | Retro / Analogue | run |
| portra | Portrait Film | Retro / Analogue | clouds |
| moody | Moody | Cinematic | towers (was dusk) |
| cyberpunk | Cyberpunk | Cinematic | dog (was towers) |
| tungsten | Tungsten | Light / Glow | run |
| airy | Airy | Light / Glow | dog |
| splash | Colour Splash | **Punchy** (was Stylised) | clouds (was bay) |
| cyanotype | Cyanotype | **Retro / Analogue** (was Stylised) | ramp (was shore) |
| hdr | HDR | Punchy | sunpath |

## Twins: none found

Checked against all 68 filters in today's `FM.FILTERS` (the 56 plus #966 B8's twelve), the effect labels, fx-presets.js,
POLISH-LOG.md, REQUESTS.md, `tools/design/chatgpt-tasks/pile/LAND-LIST.md` (the ChatGPT pile's port list) and every
`tools/design/plans/*`. None of the ten names or ids exists as a filter. In the pile, the ten are only mentioned as
"already built on fm912-filters" (`reports/effects-pack-VETTED.md`), and the idle backlog says "no names clash" with B8.
B8's own header (js/filters.js) says its names were checked against these ten.

Closest relations, none of them the same look:
- **Moody vs Green Code** (B8, Cinematic). Both dark, muted and green. Green Code puts a green cast over the whole picture (Mids
  Colour Balance). Moody leaves every colour alone except the greens, which it sinks to olive-teal with HSL Bands, then splits
  the tones cool and warm. This is the pair to watch on the first run.
- **Cyanotype vs X-Ray** (B8) and **Blueprint**. X-Ray is an inverted negative in blue-white. Blueprint is line work. Cyanotype is
  a continuous-tone positive in Prussian blue.
- **Sepia vs the Sepia effect**. Same id and name, but this is a filter built on the effect (sepia + contrast + fade + vignette
  + grain). The same is already true of Faded Film and Teal & Orange, which share id and label with their effects. B8 chose
  to avoid effect labels; this one could not without renaming it.
- **HDR vs Clarity & Dehaze** (#966 B26). That is an effect, not a filter. HDR still sharpens with Unsharp Mask, as on the
  sheet he saw. Swapping in Clarity is a possible later upgrade, not done here.
- The **Split Toning** effect (#966) has a "Sepia shadows" one-tap look. That is a preset inside an effect, not a filter.

## What was ported

- **js/filters.js**: the ten recipes, value for value, in a block after Etching, written in today's style. The comments now
  give the decision, the section moves, and Moody's and Cyanotype's relation to the B8 looks.
- **js/fx-thumbs.js `FILTER_SUBJECT`**: ten lines, plus a comment saying which photographs were kept and which moved, and why.
- **index.html**: busters `filters.js?v=22 → 23` and `fx-thumbs.js?v=58 → 59`.
- **No kernel work.** Every effect and control the recipes use exists today. Every control those effects gained since 22 Sep
  (#482 polish) defaults to the old picture, so each look should draw what the sheets showed. No existing filter, default or
  effect was touched.
- **Why two looks changed section.** Test 778 (and B8's first test) allow no photograph twice in a section, and B8 left
  Stylised using all fourteen. Cyanotype moved to Retro, beside Copperplate, the other two-tone print. Colour Splash moved to
  Punchy. Neither fits Black / White: the mono tests cap colour spread at 4. A fifteenth fx-art photograph would let both go
  back to Stylised.
- **Why four tile photos changed.**
  - Moody's `dusk` is Green Code's now. Cinematic had only `towers` and `dog` free. Towers has the trees and the teal-green water
    for Moody to sink, so Cyberpunk takes dog: its orange sky and sand are the colours Cyberpunk turns pink.
  - Cyanotype takes `ramp` in Retro, for its full tonal range.
  - Splash takes `clouds` in Punchy (salmon-red cloud). Candy holds shore and Poppy holds bay.
  - These were picked by reading the photographs, not by rendering the tiles.

## Collab schema: no change

Filters are not in the schema fingerprint. `C.schemaFingerprint` (js/collab-core.js) hashes:
- `FM.fxRegistry.all()`, which is FM.EFFECTS;
- the audio registry;
- a literal fixture through the sanitiser;
- OP_GRAMMAR, the derived fixture, the rev, the project fixture and SM_V.

It never reads `FM.FILTERS`. The sanitiser keeps a filter's `fid` by pattern, without looking it up in the library. A #912
filter is an ordinary container of existing effect types and params, so an older build sanitises it identically. v17.49's
twelve looks moved no rev either: its rev 11 was for new effect types.

**So `C.SCHEMA_REV` stays 14 and `C.SCHEMA_FP` stays as it is. No FP to pin.**

## Tests (tests/tests.js)

New, appended before the final `})();`, both `{ item: '912' }`:

1. **`912 ten new filter looks are in the library — …`**
   - Checks each look's section, name and description.
   - Checks the effect list in order, and that every authored control survives `makeInstance` unclamped.
   - Checks CSS-filter effects come first, `name` and `fid` on the built box, and the tile photo (preloaded, no car outside Tuff).
   - Checks test 778's no-photograph-twice rule over the whole library.
   - CONTROL: the repeat check must flag a planted repeat.
   - **Fails on v52** with `the look sepia is not in the library · …` for all ten, because js/filters.js has none of them.
     With only fx-thumbs.js reverted, it fails with `sepia previews on null, not shore`.
2. **`912 each of the ten moves real photographs, is no existing filter under a new name (B8’s twelve included), and no two of the ten are one look — …`**
   - Ported from the branch's test, but it now compares against all 68 filters, B8 included.
   - Renders through `FM.renderScene` on bay and dusk at 96px.
   - Thresholds: MOVE ≥ 8, NEAR ≥ 5 from any existing filter, APART ≥ 8 between two of the ten.
   - CONTROLS: a filterless render equals itself (0), and Faded Film with its Contrast nudged 0.92 → 0.96 must read under 5
     from Faded Film, which shows the yardstick can see a near-duplicate.
   - It prints every reading to the console on every run, and into the error when it fails.
   - **Fails on v52** with `only 0 of the ten #912 looks are in the library (… missing)`.

Changed (maintenance, so the existing suite stays green with 78 filters):

- **`b966PreB8`** (the helper beside `b966B8Ids`) now also leaves out `b912Ids()`. Every pin that calls it captured its hashes
  on the 56 of v17.21. Four demand exactly 56 filters, and the rest pin the set by name (5.2) or by count and one folded hash
  (6.3). Without this change, 482 polish 1, 5.2, 5.3–5.5, 6.0 (twice) and 6.3 go red. The hunk is outside any `test(...)`, so `_spottests.py` names no test for it.
- **`966 B8 on queue 675’s measure …`** now compares each B8 look only with the filters that came before it (the 56, via
  `b966PreB8`), as its title says. Before, it compared with "every filter not in its own list", which would have counted
  #912's ten. Test `#675: every added filter…` fixed the same bug in itself at v15.80 ("a later addition could make an earlier
  one a near-duplicate retroactively. It cannot").
  - **prove.sh will list this as a changed test that passes on HEAD's source (DEAD).** That is expected and tolerated. The
    912 tests are the ones that catch.

## Unsure / for the builder

1. **No thresholds were measured on this tree.** MOVE 8, NEAR 5 and APART 8 are the branch's 22 Sep values, and the nudge
   control's "under 5" is an estimate. All are marked `TODO(first run): measure`. Take the console line `912 readings: …`
   and write the numbers into the comment.
2. **Moody vs Green Code** may come in under NEAR. If it does, it is a real near-duplicate, and moving a recipe is a look
   change he has to see first.
3. **Test 858** (`every filter ingredient changes the q858 fixture`) adds the ten's ~60 ingredients. Band-limited ones may land
   in its "weak" list, which allows at most 6 across the library:
   - Cyberpunk's Yellow band at range 1.2;
   - Moody's Green band;
   - the Darks-only and Lights-only Colour Balance passes in Portrait Film, Moody, Cyberpunk and Tungsten.

   Autumn (B8) had to widen its bands to 1.5 for that test. The branch's commit does not say it ran the full suite.
4. **`filters tab: each tile previews its own look`** waits at most 6 s for every tile to paint. There are now 78 tiles, up from 68.
5. **The four moved tile photos and the two section moves have not been seen by him.** His #545 rule is to show visuals
   before they ship. The looks themselves are the ones on his 22 Sep sheets.
6. **The name "Portrait Film"** (not "Portra", a Kodak product name) is still his call. So is Sepia sharing its name with the
   Sepia effect.
7. **The POLISH-LOG line** should say `queue 912` for clause 1 only. REQUESTS.md #912 clause 1 still needs ticking at ship;
   that file was not touched here.
