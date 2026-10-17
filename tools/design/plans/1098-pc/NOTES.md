# #1098 clause 2 — PC speed as a result of its own (branch `hunt/1098-pc`, built 17 Oct on v17.58)

His words, 7 Oct: *"yeah i guess slowing it to work like the phone makes sense because you are testing it for phone users. i guess
you can switch between to see its pc potential. and also find issues with windows"*. Clause 1 (the calibrated throttle) shipped in
v17.24. **This branch is clause 2 only** — *"i guess you can switch between to see its pc potential"*. Clause 3 (Windows Chrome) is
not touched.

**Built code-only while a release ship ran on the laptop. Nothing was run except `git`, `grep`, `awk`, `sed`, `node --check
tests/tests.js`, `python3 -m py_compile` (pycache redirected outside the tree) and `bash -n`. No browser, no suite, no self-test.**
Everything below under "what to run" is still owed.

## 1. Inventory — which tests measure speed under the throttle

| Test | Throttled? | What it measures | Now records |
|---|---|---|---|
| `921 S8 a 500-layer project under a 4× CPU throttle: the commit-hook diff stays within 30 ms and the hot tick within 8 ms, measured` | **yes** — the only `cpuRate921(` caller and the only `__fmWantCpu` writer in the suite | at `P.rate` (4 on the Mac, the calibrated rate elsewhere): 40 commit-hook diffs (p90 ≤ 30 ms), 100 hot ticks (p90 ≤ 8 ms), 5 full diffs (reported); before the throttle, 9 unthrottled commits as the throttle's CONTROL | 5 metrics, phone + PC (below) |
| `simple P1 · T1 classifier timing: 500 layers within budget, and 2,000 is not quadratic` | no — PC speed only | classify ≤ 60 ms at 500 layers "in the suite frame", and growth at 2,000 | nothing (unchanged; a phone half would need the throttle — a later item if wanted) |
| `a hostile repeater renders fast and finite — the draw-path clamp is load-bearing` | no | one draw with copies=5000 < 2000 ms — a hang guard, not a speed claim | nothing |
| `690 opening a project after looking into others shows its filmstrips as fast as opening it directly …` | no | time to a filmstrip, relative to a direct open | nothing |
| `921 S8 adversarial peer fuzz…`, the audio-clock playback tests, the 955/979/981/SU1 tap and scroll timing tests | no | behaviour on real or fake clocks, not speed | nothing |

Outside the suite: `tests/_probe.py --cpu` and `tests/_shotlive.py` throttle for ad-hoc probes; not touched.

## 2. Every change

- **tests/tests.js** (two hunks, both in the S8 region in the middle of the file, NOT at its end — v17.59 appends there):
  - after `cpuRate921`: `perfNote(test, metric, { phone, pc, unit, rate, why })` pushes into `window.__fmPerf` (app frame; ≤ 200
    entries; numbers rounded to 0.001 or null), and `pcSpeed921(fn)` runs a PC half and never throws (a still-on throttle or any
    error becomes the `why` of a missing PC number).
  - in the S8 test, AFTER the phone half and its two CONTROLs (`the throttle did not reach this frame`, `the hot ticks never reached
    the guest`) and BEFORE the two budget throws: a PC half with the same counts — GC, 40 commits (`commit(300 + i)`), 100 hot ticks
    on layer 250 (y 300…399, layer re-selected then deselected), 5 full diffs, `g.loop.settle()` — then five `perfNote` calls.
    The budgets read only the phone arrays and `said`, which are computed before the PC half, so **no pass/fail rule, threshold or
    message changed**; `window.__fm921perf` is unchanged. Extra time: a GC plus ~1 s unthrottled; `budgetMs` (240 s) untouched.
    Test count unchanged (3097 → 3097).
- **tests/_cdp.py**: `PERF_JS` + `_perf_records(cdp)` after `_font_parity`; `out["perf"] = _perf_records(cdp)` in main()'s
  verdict JSON. `[]` when none, `null` only when the app frame could not be asked (unknown ≠ none). Strings are neutralised for
  the tools that grep a whole driver output (`FAIL` → `fail`, `STALLED` → `stalled`, `did not finish within` → `did not end
  within`) — ship.sh reads `did not finish within` anywhere in `$OUT` as a timeout. `--quiet` output is unchanged.
- **tests/_slow_pass.py**: `run_one(name, a, perf=None)` keeps the newest try's `perf`; `--out` JSON gains `"perf": [...]`. Needed
  because on the laptop S8 is often NOT RUN in the full pass (too slow, before it measures anything) and RUNS here instead.
- **tools/perf_report.py** (new): `python3 tools/perf_report.py <driver output file> ["<which pass>"]`. One line per metric,
  sorted by test then metric; `none` / `unknown` said plainly; exit 0 when it read a result, 1 when the file holds none.
- **tools/test-perf-report.sh** (new): the self-test (see 6).
- **tools/ship.sh** (four places, all reported, never refused):
  1. a self-test block after the test-port block: runs `bash tools/test-perf-report.sh` when `tools/perf_report.py
     tools/test-perf-report.sh tests/_cdp.py tests/_slow_pass.py tools/ship.sh` changed (refuses only if THAT test fails, like its
     neighbours);
  2. `python3 tools/perf_report.py .claude/ship/suite-desktop.out "desktop pass"` right after the desktop `✅ $SUM` line;
  3. inside `slow_pass()`, after a green re-run: `python3 tools/perf_report.py ".claude/ship/slow-$2.json" "$2 pass, run alone"`;
  4. `python3 tools/perf_report.py .claude/ship/suite-phone.out "phone pass"` right after the `✅ phone $PSUM` line.
- No `?v=` bump: index.html loads none of these. No file of Simple's touched, and nothing of Simple named in a shared file.
- File modes: the Windows-side edit dropped the exec bit on `tools/ship.sh` and `tests/_slow_pass.py`; the commit restores 100755
  (`git update-index --chmod=+x`), and the two new files are committed 100755.

## 3. The lock (tools/_fu_gate.py)

`tests/_cdp.py` and `tools/ship.sh` are in `INSTRUMENT_FILES`, so `instrument_changed()` lists them; they fire only through
`instrument_firing()`, which searches every `git diff -U6 HEAD` hunk (its `@@` header included) with `LOCK_PART`:

- `tests/_cdp.py`: `980|__fmWant(?:Setup|Shot)\b|__fm(?:Setup|Shot)(?:Done|Err)\b|\ba\.(?:dump|shots)\b|--(?:dump|shots)\b|_dump_open|touch_base|prefers-reduced-motion|captureScreenshot`
- `tools/ship.sh`: `_fu_gate|full-unchanged|\b980\b`

Checked with `grep -P` on exactly that diff: **no hunk matches**. The hunks:
`@@ -315,12 +315,32 @@ def _font_parity(cdp):` and `@@ -945,12 +965,13 @@ def main():` in _cdp.py (its 980 mentions are at HEAD
lines 165, 351, 594, 642, 666, 725, 775, 801, 867, 881, 974 — the nearest is 25 and 18 lines away); in ship.sh `@@ -675,12 +675,21
@@ if [ -n "$(git status --porcelain -- tools/test-port.sh …`, `@@ -1033,12 +1042,14 @@ fi`, `@@ -1079,12 +1090,13 @@ slow_pass()
{ …`, `@@ -1165,12 +1177,13 @@ if grep -qE '^(styles\.css|index\.html|js/)' …` (its lock lines are 814–834 and 1193–1210).
`selftest_ship_order` still holds: nothing new names `tests/_cdp.py` after the second `_fu_gate.py check`, and nothing is added
between that check and `git add -A`. HOOKS, regions and provenance read only SHARED files (js/*.js, root .css, index.html, sw.js) —
none changed; no SIMPLE_FILES changed. So `check` should print NOT-TRIGGERED, provided the POLISH-LOG line does not say `queue 980`.

⚠️ **One fragile spot, worth knowing:** `980` is unanchored for _cdp.py and the `@@` line numbers are searched too. If HEAD's
_cdp.py gains 15–24 (or 35–44) lines above line 945 before this lands, the second hunk's header reads `98x` and the gate fires as an
instrument change. Run `python3 tools/_fu_gate.py why` on the landing tree; if it names tests/_cdp.py, look at the header first.
(The same unanchored `980` would fire on any ordinary _cdp.py edit near lines 980–989 — a gate finding, not part of this item.)
Also: `tests/_cdp.py` is in `HASH_FILES`, so this changes the hash any cached `.full-unchanged-pass` was taken on.

## 4. What the S8 test records

Test short name `921 S8 500 layers`; five metrics, each `{phone, pc, unit: 'ms', rate: P.rate, why, title}`:
`commit median`, `commit p90` (the 30 ms budget's statistic), `hot tick median`, `hot tick p90` (the 8 ms one), `full diff median`.
Phone = the throttled arrays the test already asserts on; PC = the same measurement, same counts, unthrottled, taken after.

## 5. Expected output (numbers illustrative)

```
✅ Regression 3097/3097 ✓ …
PC speed (desktop pass) · 921 S8 500 layers · commit median: phone 13.7 ms · PC 3.42 ms (×4.0)
PC speed (desktop pass) · 921 S8 500 layers · commit p90: phone 15.2 ms · PC 3.80 ms (×4.0)
PC speed (desktop pass) · 921 S8 500 layers · full diff median: phone 11.2 ms · PC 2.80 ms (×4.0)
PC speed (desktop pass) · 921 S8 500 layers · hot tick median: phone 3.10 ms · PC 0.80 ms (×3.9)
PC speed (desktop pass) · 921 S8 500 layers · hot tick p90: phone 3.70 ms · PC 0.95 ms (×3.9)
```

The ratio should sit near the throttle rate (4 on the Mac; ~2.1 on the laptop). When S8 said NOT RUN in the pass:
`PC speed (desktop pass): none — no test in this run recorded a phone-speed / PC-speed pair (perf: [])`, then, after the slow pass,
`PC speed (desktop pass, run alone) · 921 S8 500 layers · …`. A PC half that could not run prints
`… · commit median: phone 13.7 ms · PC not measured (<why>)`.

## 6. The self-test — `bash tools/test-perf-report.sh` (NOT RUN YET)

Canned fixtures, no browser: two metrics out of order → exactly two sorted lines (exact text); the pass label; `perf: []` → one
plain "none" line; `perf: null` and a missing key → "unknown, not none"; a file with no JSON / a missing file → said, exit 1; a
missing PC half → the phone number and the reason; `_perf_records` against a fake page (app frame asked, non-objects dropped, cap
200, `[]`, `None`, verdict words neutralised); `_slow_pass.py` against a stub driver carries `perf` into `--out`; the wiring (ship.sh
prints after both summaries and inside slow_pass; main() writes `"perf"`; S8's PC half sits between its controls and its budgets);
and ship.sh's trigger line lists every script the test names.

## 7. What to run after the ship (in this order, when nothing heavy is running)

1. `bash tools/test-perf-report.sh` — must end `✅ perf-report: every check passed`.
2. `python3 tools/_fu_gate.py selftest` and `python3 tools/_fu_gate.py why` on the landing tree — want `not triggered`.
3. `./tools/test-port.sh` and `./tools/test-ship-bg.sh` (ship.sh and the driver changed; the ship runs them too).
4. S8 alone at both widths, then the reader:
   `python3 tests/_cdp.py --port 8777 --timeout 600 --url 'http://localhost:8777/tests/run.html?only=921%20S8%20a%20500-layer' > .claude/s8-1280.json; python3 tools/perf_report.py .claude/s8-1280.json "1280"`
   and the same with `--width 380`. Want five lines each with a PC number and a ratio near the rate, and the test still green.
5. One ship's `.claude/ship/ship.log` showing the `PC speed (desktop pass)` lines (and `phone pass` once a release changes shipped
   source — a tools-only release skips the phone pass, so its log shows desktop + slow-pass lines only).

## 8. Landing notes and what I am unsure of

- Land it as its **own tools/tests-only release**: prove.sh then says "no app source changed — nothing to prove". Batched with an
  app change, the edited S8 test joins prove's list; it would read DEAD (a warning) — or, if the laptop calls itself too slow in
  prove's page, NORUN, which refuses. POLISH-LOG: `queue 1098 (partial)` (clause 3 is open) — never `queue 980`.
- The PC hot ticks pump the same guest after the phone half's y CONTROL has been checked, and the session is settled again after;
  withCollab921's teardown checks nothing about convergence. Unverified in a browser.
- `pcSpeed921` reads `window.__fmCpuRate === 1` after `cpuRate921(1)`; if the driver is slow to drop the throttle the PC half is
  skipped with that reason rather than measured throttled.
- If the GC request times out (30 s) the PC half records why; S8's 240 s budget has room for that.
