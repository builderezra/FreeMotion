# H23: the collab schema fingerprint does not hash a segment's options

Against `origin/main` 470ee20e (app code identical to v17.24 05d06c53). Patches in `fp-options-patches/` (`fp-options-core.patch` = `js/collab-core.js`, `fp-options-test.patch` = one test): `git apply --check` clean on this tree, **not applied anywhere**. Everything marked Measured was run in my container (headless Chromium 1194, the app's own registry and sanitiser).

## The finding, confirmed (Read, then Measured)
- `C.schemaFingerprint` (`js/collab-core.js:222-238`) hashes, per effect param, `[key, type, default, legacy, min, max, keyframable]` (`:226-228`). It does **not** hash `options`. The hash string is built at `:238` and ends in `'|r' + C.SCHEMA_REV`.
- The sanitiser drops a segment value that is not in the control's `options` (`js/storage.js:1392-1397`, the `ty === 'segment'` branch: it keeps the value only if some `[value, label]` pair matches).
- `FM.fxRegistry` builds `options` once per control (`js/fx-registry.js:216-266`, `normOptions`) and `all()` returns those live objects (`:647`).
- **Measured, on unchanged main:** I appended one option to an existing segment control in the live registry and recomputed `C.schemaFingerprint()`: **it did not change** (1911166791531509 before and after). So two builds that differ by one appended option hash the same, join one session (compatibility reads only `PROTO` and `SCHEMA_REV`, `js/collab-signal.js:1559-1560`), and the older sanitiser strips the newer's choice from what it receives.
- Audio effects are not affected: `js/audio-fx.js` has no `options`, and `sanitizeAudioFx` (`js/storage.js:1167`) keeps five facts that the audio fingerprint hashes (`js/collab-core.js:236`).

## The exact change (`fp-options-core.patch`)
In the `defs` tuple at `js/collab-core.js:226-228`, add the option **values** for segments only:
```js
const t = [p.key, p.type, p.default, p.legacy, p.min, p.max, p.keyframable !== false ? 1 : 0];
if (p.type === 'segment') t.push((p.options || []).map(function (o) { return Array.isArray(o) ? o[0] : o; }));
return t;
```
- **Values, not labels:** the sanitiser never reads a label, so a renamed label must not move the fingerprint (and the test pins that).
- **Segments only**, so every other tuple keeps its shape.
- **Order matters** (the values are an array): reordering an existing list changes the fingerprint, which is right, because options carry a numeric value that old saved projects hold.

## SCHEMA_REV and the pin
This change moves the fingerprint of **every** build (the tuples gained an element), so it needs a `SCHEMA_REV` bump and a re-pin, which is the gate's own instruction. A rev bump means a build with the change cannot join a session with a build without it (`guest-older` / `host-older`): the same cost as every polish batch's bump, and it is the point.
- In my scratch tree: rev 7 to **8**, and `SCHEMA_FP` becomes **8654069891821355** (it was 1911166791531509). **Do not copy those numbers:** main is at 7 now, the Simple branches take 8, and polish batches keep bumping, so **take the next free number at merge and let `921 S1 the schema fingerprint gate` print the new fingerprint**, as its message says ("bump SCHEMA_REV and set SCHEMA_FP to …").
- Order with the others: land together with whichever release is next to bump anyway (a batch of polish), so a friend updates once. Do not spend a rev on this alone.

## The test that fails first (`fp-options-test.patch`)
`921 S1 the schema fingerprint sees an option appended to an existing segment control, and ignores a renamed label`: find a segment control in `FM.fxRegistry.all()`, push `[987654, 'appended']` onto its `options`, assert the fingerprint changed; pop it, rename option 0's label, assert the fingerprint did **not** change; restore and assert the registry is back to the baseline. Control line: if no segment control exists the test says so instead of passing.
- **Measured, main + this test only: FAIL** ("an option appended to mode left the fingerprint unchanged (1911166791531509)…"); the existing gate test passes.
- **Measured, main + core patch + rev 8 + the printed pin: PASS**, and `?only=921 S0` and `921 S1` give **37/37**. (Between the patch and the pin, the existing gate test is the one that goes red and prints the new number, as designed.)
- Also add one row to the gate's own mutation harness (the `moves('a SCHEMA_REV bump', …)` calls inside `921 S1 the schema fingerprint gate`, `tests/tests.js` near `:30509`) for "an appended segment option", so the gate proves it sees the new term the way it proves it for REV, PROTO, the sanitiser and OP_GRAMMAR. I did not write that row.

## Have any released versions already disagreed? (Measured; the PM asked for this)
Method: every commit on main since SCHEMA_REV 1 (v16.81, `6b99c8e6`) that touched `js/compositor.js`, `js/fx-registry.js`, `js/audio-fx.js` or `js/collab-core.js` (28 commits, each is a release), plus v17.24: 29 snapshots. At each I loaded the app in a browser and dumped every segment param's option values and labels from `FM.fxRegistry.all()` with the build's `SCHEMA_REV` (`scratch h23dump.py`). The dump has **135 segment controls at HEAD**.
Revs: 1 (v16.81), 2 (v16.82 to v17.14), 3 (v17.15, v17.16), 4 (v17.19), 5 (v17.20), 6 (v17.21), 7 (v17.23 and v17.24).
Every change to an option list, by commit:
| commit (release) | rev | what changed |
|---|---|---|
| `768c83d0` v17.15 | 2 to 3 | new controls with options: colorbalance.preserve (2), letterbox.ratio (9), lightleak.blend (3), temperature.method (2), temperature.range (4) |
| `7bbeb5bc` v17.19 | 3 to 4 | new: drift.wrap, flashdark.rhythm (4), glitch.wrap (3), orbit.face, pulse.wave (5), shake.overscan, speedlines.mode |
| `28104a3e` v17.21 | 5 to 6 | new: crossprocess.variant, duotone.blend (4), exposure.space, gradientmap.blend (7), gradientmap.reverse, gradientmap.stops, tealorange.mode, tint.mode |
| `b46b47d3` v17.23 | 6 to 7 | new: 15 controls (darkglow, dropshadow, glowscan, lightglow, linstreaks, softglow, spinstreaks, vignette); **and one append to an existing list: `glowscan.direction` gained option 4** |
**Answer: no two released builds that share a SCHEMA_REV have different option lists.** Every list change shipped in a release that also bumped the rev. Of the 36 list changes only **one** is the dangerous shape (an append to an existing control), `glowscan.direction` in v17.23, and that release bumped 6 to 7. A **new** control with options is already caught today because its key joins the tuple.
So the hole has not bitten, but it is open: the next release that appends an option to an existing control and forgets the bump would be invisible to the gate. Candidates in flight: R3's T8 appends `heart` to `particles.shape` (`plans`/`research/effect-specs`), and polish batches append options often.
**Limits:** `all()` skips effects marked `hidden`, so a hidden effect's list was not covered; the dump reads the live registry, not the git diff, so a list that changed and changed back inside one commit is invisible (none seen); two snapshots (v16.82 to v17.14) share rev 2 across 20 commits and showed no option change in any of them.

## What I did not do
Not the full `921` series (only S0 and S1, 37/37), not at 380, not on the Simple branches (they sit at rev 8 and will need the same bump logic at merge). The patches are not applied.
