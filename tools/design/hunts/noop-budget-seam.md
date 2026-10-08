# H55: a test seam for the no-op probe budget

Branch `hunt/noop-budget-seam` (off origin/main 842a23de). Two files: `js/fx-thumbs.js` (+7/-1), `tests/tests.js`.

## What changed
- `js/fx-thumbs.js`: `let noopBudget = NOOP_BUDGET_MS` (still 45). `noopAt` compares against `noopBudget` instead of the constant.
  New seam `FM.fxThumbs._noopBudget(ms)`: sets the budget, returns the one that was in force; no argument (or a non-number) restores 45.
  Nothing in the app calls it, so app behaviour with no seam call is the old behaviour (Read: the only edit to the render path is the one comparison).
- Tests: `482 6.7 Glow Scan`, `477 an effect that changes nothing`, `794`, `690 a Spin added at the start` each lift the budget to 1e9
  before their `try` and put it back first thing in `finally`.
- One new test, `H55 the no-op probe budget seam`: budget 0 makes a real no-op read null, a lifted budget reads true, the return value
  and the restore-to-45 path are checked. It fails on main (no seam).

## Proof (Measured here, 2x CPU throttle via Emulation.setCPUThrottlingRate for the whole run, results in `h55-results/`)
| run | 1280 | 380 |
|---|---|---|
| main (no seam), the 4 control tests | 0/4, all four red on their `CONTROL:` line | 0/4, same |
| this branch, 2x throttle | 482 6.7, 477, 794 green, seam test green | same |
| this branch, 1x | same | not run |

## One thing I could not verify here
`690 a Spin added at the start of its clip…` needs real touch emulation, which this headless driver cannot switch on, so it reports
NOT RUN once it gets past its CONTROL. Under 2x on main it dies on that CONTROL (`a Spin at speed 0, which truly changes nothing…`);
on this branch it gets past the CONTROL and stops at the touch step. So the seam fixes the part that was red; the rest of the test needs
the laptop (Guess that it is green there, nothing I can run says otherwise).

## Notes
- The `?v=` buster for fx-thumbs.js in index.html is NOT bumped here (scratch branch). The builder's ship.sh will refuse until it is.
- The seam is global, so a test that throws before its `finally` would leave the budget lifted. The new test's first assertion reads the
  budget back and says so ("a test left the seam lifted") if it is not 45.
