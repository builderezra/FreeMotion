# Plans for the next five after P28 (P29): #706, #912, #921, #923, #778

Against `origin/main` 1fa76385 (v17.34). **Measured** = I ran it here (headless Chromium on Linux, 1280 and 380), **Read** = read the code or the entry, **Guess** = not checked.

**Which five.** After P28 almost every open item is answered, held on a decision or a standing note. These are the five oldest that still say something specific; P30 takes the five pure notes. Honest summary: **one of the five has a real, measurable question (#706); #912 has a real risk nobody had written down; the other three need nothing built.**

## #706 PHONE: the Add menu opens twice

**Verdict: the candidate cause in P2's plan is refuted at normal speed; still unexplained, still waiting on his recording or flight-recorder paste.** (#676 is the same report, planned in P2 section E.)
- **What P2 suspected:** `js/addmenu.js:1424-1430` restores a tab's remembered page one frame after the sheet is built, so a tab with several pages would flash page 1 and jump, which would read as "opens twice".
- **Measured (`scripts/add-reopen-probe.js`, 380 x 760, every frame for 900 ms after `FM.mobile.openAdd()`):** the Shape tab has 5 pages. Open it, go to the last page, close, reopen: the pager's `scrollLeft` goes `1416 > 0 > 1416`, so the page really does flash to page 1 for one frame (t = 13 ms). **But the sheet is at y = 1011 px at that frame (the viewport is 760 tall; it first drops 250 px below its closed position, a side effect of the hinge keyframe), and at y = 807 on the next. The first visible frame (y = 658) is after the restore.** So the jump happens off screen; it is not what he sees. The sheet's own path is `760, 1011, 807, 658, 558, 493, ... 356` with two direction reversals (the drop and the overshoot to 355.6), one smooth rise.
- **What this does not rule out (Guess):** a phone is several times slower than 60 fps in this container. If a frame takes 50 ms, the `requestAnimationFrame` restore can land after the first visible frame. I did not run the probe under a CPU throttle (the 380 probe driver has no throttle switch; `FM_BASE_CPU=N` throttles a whole runner run, not a one-off probe).
- **Plan, unchanged from P2:** the flight recorder (record the sheet's top and the pager offset for 700 ms after each open into `fm.lastAddOpenReport`, show it in Settings with Copy) is still the right next step; this probe is its desktop version. One cheap change worth making regardless: build the pager at its remembered offset when it is created (`scroll-snap` off for that one write, or set `scrollLeft` synchronously after insertion) so there is no frame at all with the wrong page. Test for it: assert `pager.scrollLeft` is never 0 on a frame after reopen when the remembered page is 5 (red on main: one frame).
- Nothing built, no patch: I would rather have his recording first (his question, 2 Sep, "still has the glitch that opens up twice").

## #912 More filters, bug hunt, visual check, menu animations, light/dark

**Verdict: clauses 2 to 5 are done and recorded; clause 1 (ten new filters) is waiting on his picks, and the ten built filters are at risk because they exist on no remote.**
- **Read:** the entry says "all 10 are built on branch `fm912-filters`, marked '#912 candidates — he picks'; delete the unpicked, merge, ship". **Measured: `git ls-remote origin` has no `fm912-filters` or anything like it, and none of Sepia, Digicam, Portra, Moody, Cyberpunk, Tungsten, Airy, Colour Splash, Cyanotype or HDR is in `fx-presets.js` or `filters.js` on main.** The branch was on the Mac. The move to the Windows laptop included "a clean reset" (#1071), so **if that branch was never pushed it is gone, or about to be.**
- **Do now:** on the Mac, `git branch -a | grep 912` and push it to a new name (`git push ssh fm912-filters:refs/heads/hunt/fm912-filters`); if it is gone, the ten specs are in the entry (look, tone, grain, halation) and the sheets sent on 22 Sep are `tests/_filters-sheet.html` and `tests/_newfilters.html`, so they can be rebuilt as `E1`-style kernels.
- **After his picks:** each pick is a filter row (the same table as the 56 library filters), with a catching test that its default draws the intended colour move, and the byte-for-byte pin of the existing 56 stays green (`482 polish 1 every new control is in the catalogue…`).

## #921 Live collaboration

**Verdict: built through stage S8 (240-odd tests); the entry waits on his answers; two problems were found this session and are fixed or filed.**
- **Found and fixed this session (`hunt/fuzz-seeds`, FZ1):** a stale-ack replay in the host that could leave two devices with different projects after a dropped line, with a regression test and 12 seeds pinned.
- **Filed, not fixed:** FZ1 seed 142, a guest resending a whole comment list every 2 s without converging.
- **Landing order:** `plans/helper-26` and `hunt/audit-integrated-2`'s landing order put `audit-collab` and `audit-collab-media` mid-list; FZ1's `collab-host.js` change (`?v=5` to `6`) is independent of both.

## #923 An easy editor and a deep editor in one app (HELD for his approval)

**Verdict: nothing to plan; this is the Simple mode that is being built under #980, and the builder's step 1.3 is its next release.** Read: `js/spine.js`, `spine-words.js` and the `sm` sanitiser are on main (v17.33); `editor-mode.js` and `simple-timeline.js` are not. AU22 (`hunt/audit-spine`) is my audit of what is there. His hold ("needs his approval before any build") was followed by #980, "BUILDING PHASE 1 (his D15 A, 1 Oct)", which is the build he approved (Read; I did not re-open the question).

## #778 A system that never stops (JUMPED standing instruction)

**Verdict: done structurally, as the entry's own gates show.** Read: `tools/tick.sh`, `next.sh`'s oldest-first gate, `ship.sh`'s refusals, `ship-bg.sh` (exit 3, never 0) and the RULES-AUDIT changes (#1073) are the "never forgets the rules" half; "audit the autonomous work for delusion" is what the helper batches (AU1 to AU22, INT1) are. It stays open only because the entry says "READY". Tick it with a note rather than reading it again each tick.
