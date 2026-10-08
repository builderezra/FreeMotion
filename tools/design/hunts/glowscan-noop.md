# H53: Glow Scan's false "changes nothing" (482 6.7), reproduced alone in H52

Branch `hunt/glowscan-noop`. It is stacked on `hunt/noop-budget-seam` (H55, f8aa78f3), because the fix to this test IS that seam. Read H55 first.

## The brief's premise is wrong, and I measured it (Measured)
The brief says `noopTimes` (NOOP_SPREAD + `FM.fxNoopMoments`) misses a Glow Scan with `{pause:5}` on a 10 s clip. It does not.
`results/probe.py` (a CDP eval on origin/main 842a23de, 1280 wide, project 1080x1920, the test's own layer: 300x160 rect, start 1, 10 s) prints, per setting,
the times `noopTimes` returns, `FM.fxNoopMoments`, and the verdict at each time:

| setting | sweep moment `fxNoopMoments` adds | verdict AT that moment | verdict at the playhead (t=1, a rest frame) |
|---|---|---|---|
| `{pause:5}` | 6.333, 12, 17.667 (the first lands in the clip, 1..11) | **false** (the scan shows) | **null** (first render 56 ms > 45 ms) |
| `{loop:1}` | 1.333 | **false** | true |
| `{loop:1,pause:2,span:1}` | 3.333 | **false** | true |
| `{amount:0,loop:1}` (control) | 1.333 | true | true |

`fxNoopMoments` (js/compositor.js:9113) is right: sweep = `wait + 0.5/sp` on the clip clock, the kernel (compositor.js:7964-7973) sweeps in
`[wait, wait + 1/sp]`, and `shift = -fxLocalTime(layer,0)` converts clip time to project time correctly for a clip starting at 1.
The sweep moment IS probed, and it answers false. So the false "unknown" in H52 cannot come from missing moments.

## What actually fails (Verified by reading, Measured above)
`effectDoesNothing(layer, idx)` with no time walks `noopTimes` and `return v` on the first value that is not true (js/fx-thumbs.js:1402-1406).
The FIRST time is the playhead. `noopAt` times its first render and returns null over `NOOP_BUDGET_MS = 45` (fx-thumbs.js:1380).
On a 1080x1920 frame in this container the cold first probe costs 46-81 ms (the `ms` column in the probe output, 9 probes all around 50 ms), so
it lands on either side of 45 ms at random. A null on probe 1 ends the walk, and the test's `v !== false` throws "measured as unknown".
It is the same cause as H55's four reds, not a separate bug. It is also why the failure reproduced "alone": nothing else is needed, only a machine that
renders that frame in more than 45 ms (this container does at 1x; a throttled laptop would).

## Why this is NOT an app bug (so no app change)
Null means "say nothing" (fx-thumbs.js:1316-1318, by design), so the panel stays quiet on a working Glow Scan. It never claims "changes nothing" falsely
here. The only way it would is if `fxNoopMoments` stopped offering the sweep moment, which is exactly what the test must catch.
I considered making `effectDoesNothing` keep walking past a null to find a later false (a false anywhere is proof). I did NOT: each over-budget
frame still costs its render (about 50 ms each, up to 8), which is the lag the budget exists to prevent, and H55 forbids an app change.
The brief's other option (a time-dependent effect with a pause answers unknown) is also not needed: the moments are right.

## The fix: the test, via the H55 seam
`482 6.7 Glow Scan - a scan that sweeps Once or waits…` lifts the budget with `FM.fxThumbs._noopBudget(1e9)` and restores it in `finally` (commit f8aa78f3).
Strength 0 is still called a no-op (its CONTROL line, first assertion, unchanged).

## Proof it is deterministic AND still has teeth (Measured, results in `glowscan-noop-results/`)
Mutation: `FM.fxNoopMoments` made to emit no moments (`for (let k = 0; k < 0; k++)` instead of `k < (once ? 1 : 3)`, compositor.js:9124), then the test alone:

| tree | 1280, 1x | 380, 1x | 1280, 2x | 380, 2x |
|---|---|---|---|---|
| mutated (fix reverted) | red: "a Glow Scan with {"loop":1} … is measured as doing nothing" | same | same | same |
| clean | green | not run | green (see H55 results) | green (see H55 results) |

So the test fails on the real defect (the sweep not probed) at every width and CPU rate here, and no longer fails for a budget reason.
Note the mutated failure names `{loop:1}` first; `{pause:5}` and the third setting are checked after it in the same loop and also depend on the moments.
Mutation restored with `cp` from a backup before commit (`git diff origin/main -- js/compositor.js` is empty).
