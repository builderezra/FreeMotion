# H18: run ship.sh's 1280 and 380 passes at the same time

Line numbers are `tools/ship.sh` and friends on `origin/release/v17.24` ca8eb537 (the tree the laptop ships; main b46b47d3 predates the Linux work).
Container: 4 vCPU, 15 GB, Chromium 141. **Measured here: it works, and it halves the wall clock.** One red appeared only in the parallel run (below), n=1.

## Measurement (Measured; `h18/par.sh`, scratchpad)
Scope: the first half of the suite (slices 1 and 2 of 4, 1144 tests) at both widths, each width on its own dev server and its own Chrome (its own `fm-cdp-*` profile and debug port, which the driver already allocates: `tests/_cdp.py:56` `free_port`, `:412` `mkdtemp`).
| | 1280 slice 1 | 1280 slice 2 | 380 slice 1 | 380 slice 2 | wall clock |
|---|---|---|---|---|---|
| one after the other (H13, idle container) | 287 s | 826 s | 273 s | 829 s | **2215 s** (sum) |
| both widths at once | 276 s | 847 s | 284 s | 850 s | **1134 s** |
Speed-up 1.95x (saved 1081 s). Each pass was slower by 0.9% (1280) and 2.9% (380) than alone, so the two passes barely contend: the suite spends most of its time waiting
(mean load average 1.35, peak 2.3, on 4 cores).
Projection for the whole suite (a calculation, not a run; I did not run slice 4 at 380, so it assumes it equals 1280's 1378 s): sequential about 6514 s (108 min), parallel about the longer pass, 3258 s (54 min).
**Memory (Measured, sampled every 10 s):** peak used 2.9 GB for the whole machine, peak Chrome resident sum 3.8 GB, for two passes. That is RSS. The 7.6 GB per page in the PM's note is VmData (reserved address space); this container
runs `--no-sandbox` so no 8 GiB cap applies and the reserve did not matter. **Not measured:** the memory of slices 3 and 4 (the effects sweep, the 500-layer and 921 collab frames are there), so 3.8 GB is a floor, not the laptop's peak.
On a 7.7 GB WSL, two passes at an RSS of 3.8 GB each-pair-total fits with room; I would not promise it for slice 4 until someone samples it.

## Red in the parallel run only
Every verdict matched the sequential run except one: `699: a swipe that starts on a trim grip drags the timeline` (1280 slice 1) failed with "the CONTROL swipe in the clip body moved nothing (0.000)".
It passed in both sequential in-suite runs I have (H13's and a rerun just now) and **fails when run alone, twice**. So it depends on what ran before it more than on the load; the parallel
run is one observation (n=1) and I cannot say it is a parallel effect. The 921 collab tests (timing sensitive) gave the same verdicts in both: same pass/fail set, same reds (S3, S6, S8 all red in both, container reasons, see H13).
Do not read this as "parallel is safe for 921": two slices is not the whole suite and I did not run `921 S8 ... 4x CPU throttle` as a pass in the parallel run (it is red in both, from this box's speed).

## The plan (ready to build; `tools/ship.sh`)
1. **Where.** Lines 872-929. Today: `ship_phase desktop`, run into `OUT` (:877), gates, then the phone pass into `POUT` (:929) only if shipped source changed (`PHONE_RELEVANT`, :921-ish; keep that condition exactly).
   New: decide `PHONE_RELEVANT` first, then start the desktop run and (if relevant) the phone run as two background subshells, wait for both, then run **the existing gates unchanged, in the existing order**, on their outputs.
2. **Separate resources, all but one already separate.**
   - Ports: desktop on 8777 as now; phone on a second server, 8778 (`tools/serve.sh 8778`). One shared server was **not measured**; serve.sh's own header says the accept queue overflow was the largest source of fake reds,
     so two servers are cheaper than finding out. Free the second at exit with the first.
   - Chrome profiles and debug ports: nothing to do (`mkdtemp`, `free_port`).
   - Result files: `.claude/ship/out-desktop.txt` and `out-phone.txt` (the `_cdp.py` stdout), beside the existing `progress-desktop.json` / `progress-phone.json` (`--progress`, :877 and :929), which are already separate.
3. **How each gate keeps working.** They all read the shell variables `OUT` / `POUT`, not files: `test_floor_check`, `notrun_report`, `font_report`, `_fails`, `suite_seconds_record` (:912). So after `wait`, `OUT="$(cat out-desktop.txt)"; POUT="$(cat out-phone.txt)"` and the code from :878 on is unchanged.
   Keep the order: desktop gates fully (they `exit 1`), then phone gates, so the message a person sees is the same.
4. **What happens when one fails while the other runs.** Recommended: **let the other finish.** A red desktop pass is not a reason to throw away 25 more minutes of phone evidence, and phone-only reds are exactly the information this gate exists for (queue 431).
   Exceptions that should kill the sibling at once: the driver reporting "DID NOT RUN" (no server, no Chrome, renderer crash), because the other pass shares that cause. Implement by having each subshell write its exit status to `.claude/ship/rc-<width>`; the parent `wait`s on both PIDs, never `pkill -f` (CLAUDE.md's `pgrep`-matches-itself warning applies; use the PIDs).
5. **Time cap.** `SUITE_TIMEOUT` comes from `suite_seconds_for` x1.6 (:851 and `tools/_testfloor.sh:43`). Each pass was within 3% of its solo time here, so no change is needed; `suite_seconds_record` must still record the **single-pass** seconds (:912), not the parallel wall, or the cap is set from the wrong number. Time each pass inside its own subshell.
6. **The lock.** `.ship-in-progress` has one `phase=` field (`tools/_shiplock.sh:10`: gates|prove|desktop|phone|push). Add `both` (or write `desktop+phone`) and teach `ship_lock_state` / `tick.sh` to print it; otherwise tick.sh will say "phase desktop" while the phone pass is also running.
7. **Orphan reaper.** The reaper before the runs (:167-200) runs once, before either starts: fine. The driver's own startup reap stands down while another driver is alive, so start the second 3 s after the first to avoid both deciding at the same instant.
8. **An escape hatch:** `FM_PARALLEL_PASSES=0` runs them one after the other as today. Default on only where measured: this is one 4-core Linux box, not the Mac and not the laptop. The Mac with 16 CPUs will probably behave the same, but nobody has measured it.
9. **Keep alone:** `921 S8 ... 4x CPU throttle` says in CLAUDE.md "never beside another heavy job: its numbers are the point". In a parallel pass it runs beside the other width. Either run that one test alone after both passes (`?only=921 S8 a 500-layer`) and exclude it from the parallel run, or accept a risk of a false red. I would run it alone.
10. **Test of the change.** Run the parallel pass twice on a known-green tree (the laptop's), and compare the red set with a sequential pass: they must be identical except for the named timing tests. Write `ship.sh`'s output so a reader can tell which pass produced which line (prefix `[1280]` / `[380]`).

## Not done / limits
- Two slices, one container, one repetition per mode: the 1.95x is solid (the passes are mostly idle), the "no new reds" is n=1 per mode.
- Mac and WSL not measured. Memory of the heavy slices not measured.
- `ship.sh` not edited (rules).
