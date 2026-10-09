# P25 plans: #1100 to #1104

Base: origin/main at v17.33 (SCHEMA_REV 8). Every patch below was checked with `git apply --check` against clean origin/main. Labels: **Measured** = ran it, **Read** = read the code, **Guess** = not verified.

Patches and tests are in `helper-plans-25-scripts/`. Apply order does not matter between the three, except the rebase note under #1101.

## #1100 card thumbnails render the full project size (freeze)

- This is the same defect PF1 fixed on `hunt/perf-freeze` (storage.js `makeThumb` renders at about 2x card size, not 1080x1920). **Read.** Take that branch; nothing new to write.
- PM asked for old-vs-new pictures for Ezra (#545) and a tolerance. **Measured** this session: old path (full render, halve) vs new path (render at 2x card via `__fmRS`, halve), both JPEG round-tripped at 0.8, on a photo + 28px text + glowing/shadowed ellipse + a WebM video frame at 1080x1920.
  - MAD 1.18 of 255 per channel, 0.67 % of pixels differ by more than 16.
  - `card-old-vs-new.png`: old | new | difference (x8). The only visible difference is sub-pixel text edges. Text 28px wide gets a touch softer or crisper by under a pixel. Nothing moves, no colour shift.
  - Probe: `card-compare-probe.js`. Pinned-picture slice (482) had the same 3 reds as main.
- Timing test already exists as PF1's test (ceiling 2500 ms, heavy 100x20 scene).

## #1101 the sync fingerprint ignores a segment's option values

- Problem **Read + Measured**: `schemaFingerprint` hashed key/type/default/legacy/min/max but not a segment's option list, so a build that appended an option (new Particles shape) matched a build without it, and the older sanitiser would drop the newer value inside one session.
- Fix: append option VALUES (not labels) to the tuple, `SCHEMA_REV 8 -> 9`, new pin `SCHEMA_FP = 4786117950381253` (printed by `921 S1 the schema fingerprint gate`), buster `collab-core.js?v=24`.
- Test `P25 #1101`: RED on main, GREEN with patch at 1280 and 380. Mutations CAUGHT (options map off). Rewording a label leaves the fingerprint unchanged (asserted).
- Rebase note: if the builder already took P23 #1090's bump to SCHEMA_REV 9, this must become 10 and the pin re-measured. The pin is one number, re-read it from the gate test.
- Cost: first sync after upgrade sees a fingerprint mismatch with older builds, which is the intended behaviour.

## #1102 an opened font file's css comes from the file

- Problem **Read + Measured**: storage.js pushed the font's own CSS string into the index; the app uses `family + ', sans-serif'`. A file carrying a hostile or odd css string reached the stylesheet and canvas font strings.
- Fix: `css: fd.family + ', sans-serif'`, buster `storage.js?v=60`.
- Test `P25 #1102`: RED on main, GREEN with patch at 1280 and 380. Mutation (css verbatim) CAUGHT.

## #1103 and #1104 the Glow Scan no-op probe

- Branch `hunt/glowscan-noop` (diff for `js/fx-thumbs.js` + tests, buster 54 -> 55) adds a `noopBudget` seam, `FM.fxThumbs._noopBudget(ms)`, so tests can lift the probe time budget.
- **Measured**: with it, H55 and the 482 6.7 / 477 / 794 verdict tests are green at 1280 and 380 at 1x CPU. Without the js change H55 is red ("_noopBudget is not reachable"). The branch's own `h55-results/` holds the 4x-throttle numbers, which I did not rerun.
- Patch: `p25-1103-1104.patch`.
- Risk **Guess**: the shipped budget is unchanged, so on a slow phone Glow Scan still reads "unknown" under load. The seam only fixes tests. Whether to raise the shipped budget is an owner call, held.

## Order for the builder
1. #1100 (take PF1). 2. #1102 (smallest). 3. #1103/#1104. 4. #1101 last, because the pin must be re-measured after any other SCHEMA_REV bump.
