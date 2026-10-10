# Helper backlog (Ezra's second Claude account, cloud) — maintained by the PM chat

Ezra, 6 Oct: "when it runs out make sure it still has more to do forever".

HOW TO WORK THIS LIST
- When a job is done, run `git fetch origin helper/backlog` and re-read this file; the PM adds items over time. Take the FIRST item whose ID is not yet in your done list.
- Keep your done list in `tools/design/helper/DONE.md` on branch `helper/done`, one line per item: `ID | date | branch | one-line result`. Push that branch after each item.
- Then go straight on to the next item in the same turn. Stop only if the list is empty, and then reply `BACKLOG EMPTY`.
- RULES, always:
  - Never push or touch `main`; never open or merge a PR; no app or test code changes.
  - Reports and tutorials only, each on the branch named in the item.
  - Every claim gets a `file:line` against the current `origin/main`. Say what you verified and what is a guess.
- Reply with ONE line per finished item.

THE LIST (highest value first)
- QF1  DO NEXT, before any new item: apply tools/design/helper/fixes/T45-fixes.md to tutorials 11-20 (two of them can lose a user's work).
- QF2  Then correct plans P1 and P2 from fixes/P12-fixes.md (some steps are already shipped, and some rest on code that doesn't exist).
- QF3  Then add the corrections in fixes/H156-notes.md to the top of hunts H1, H5 and H6.
- QUALITY RULE from now on: before you push anything, re-read each claim as a skeptic and trace it in code. A shorter, correct document beats a long one with wrong steps.
- T3F  URGENT, DO NEXT (before H2): apply tools/design/helper/fixes/T3-fixes.md on this branch to tutorials 07-10 on tutorials-drafts. 10's steps currently delete the ORIGINAL project.
- H1  #1085 suite memory hunt. Already assigned: tools/design/hunts/1085-suite-memory.md on branch hunt/1085-suite-memory.
- T3  Tutorials 07–10 (effects, speed, export options, projects). Already assigned: tutorials-drafts.
- H2  Export "no sound" investigation (his real bug, #215/#604/#677). Read js/exporter.js and the audio mix/encode path end to end (encodeAudio, the AAC priming, the mux, deliver()). Explain every way a phone export can end up silent or with no audio track, and what the export report shows in each case. Rank by likelihood on iPhone Safari and Android Chrome, and give the smallest fix and the test that would catch each one. → tools/design/hunts/export-no-sound.md, branch hunt/export-no-sound.
- H3  App memory leaks that REAL USERS hit (not tests). Long editing sessions on a phone: media elements, bitmaps, thumbnail and compositor caches, undo-history size, autosave blobs, Work-with-friends buffers. What grows without a cap, and by roughly how much per hour of editing? → tools/design/hunts/app-memory.md, branch hunt/app-memory.
- H4  Privacy and security review of Work-with-friends (js/collab-*.js). What leaves the device, through which public relays (peerjs, emqx, hivemq), whether it is encrypted end to end, what a stranger with the short code could do, and how untrusted peer data is handled (textContent vs innerHTML, size limits, schema checks). Severity-ranked findings, each with the smallest fix. → tools/design/hunts/collab-security.md, branch hunt/collab-security.
- T4  Tutorials 11–16, one per Add-menu item: Text styles and animations, Captions, Sketching, Custom shape, Camera, Adjustment layers. Same lessons and verification table as before. → tutorials-drafts.
- H5  Preview vs export mismatch audit. For each effect in js/fx-registry.js and js/compositor.js, can what the preview draws differ from what export draws (time sampling, resolution-dependent radii, caches, worker vs main)? Give a table: effect | risk | why | test idea. → tools/design/hunts/preview-export-parity.md, branch hunt/preview-export-parity.
- P1  Ready-to-build plans for the oldest open REQUESTS.md items in Ezra's own words that have no plan yet. Read the queue the way tools/_classify.py orders it, oldest first, skipping `(hunt …)` items and #980 Simple mode. For each of the 5 oldest: his clauses, where in the code, the exact change, the risks, and the test that proves it. Design items say "needs pictures first". → tools/design/plans/helper-plans-1.md, branch plans/helper-1.
- H6  Phone performance hot paths. Rendering, timeline scroll and scrubbing on a mid-range phone: main-thread work per frame, layout thrash, oversized canvases, and work that could move to a worker or be cached. Top 10 with measured-in-code reasoning and the smallest fix for each. → tools/design/hunts/phone-perf.md, branch hunt/phone-perf.
- T5  Tutorials 17–20: Work with friends (Labs, how to invite and join), Templates, Elements, keyframe easing (the curve editor). → tutorials-drafts.
- P2  Plans for the NEXT 5 oldest open items, as in P1. → tools/design/plans/helper-plans-2.md, branch plans/helper-2.
- H7  Dead code and duplicate logic inventory, report only: functions never called, CSS selectors that match nothing, and duplicated helpers. Rank by risk of removal. → tools/design/hunts/dead-code.md, branch hunt/dead-code.

ADDED 7 Oct 02:50 by the PM (the first list is done; well done). Same rules. Highest value first:
- P3  Ready-to-build plans for the NEXT 5 oldest open REQUESTS items in Ezra's own words after P2's (#482, #508, #619, #663, #676), in the same format. → tools/design/plans/helper-plans-3.md, branch plans/helper-3.
- D1  Beginner-trap design options: one per trap, from INBOX's 02:25 and 05:05 blocks (Export hidden after the first import on a phone; the add row hidden while a clip is selected; no grab feedback on iPhone; the S key stretches when the playhead is off the clip; the "does nothing here" badge swallowing the tap; Shadow only turning a full-frame clip black; songs landing at the playhead). For EACH: 2–3 concrete options as small static HTML mockups at 380 px, using the app's real tokens and colours from styles.css, plus one recommended, why, and the code it would touch. Mockups only, no app code. → tools/design/traps/<trap>.html plus tools/design/traps/README.md, branch design/beginner-traps.
- R1  "As much choice as possible" (Ezra's words, #966): the 25 most useful effects, filters, transitions and sound effects that CapCut and Alight Motion users expect and FreeMotion lacks. Check js/fx-registry.js, js/compositor.js and the sound library first so nothing listed already exists. For each: what it does, how it would fit the compositor's existing effect shape (params, preview/export parity), and its rough size. Rank by value to a beginner. → tools/design/research/missing-effects.md, branch research/missing-effects.
- H8  Robustness review of opening untrusted project files, backups, templates and elements (js/storage.js import paths and sanitisers): fields dropped or passed through unchecked, huge or deep JSON, wrong types, IndexedDB quota failures. Severity-ranked, each with the smallest fix and a test idea. → tools/design/hunts/import-robustness.md, branch hunt/import-robustness.
- D2  A home for the 20 tutorials: Home already has a Tutorials tab with a placeholder (js/home.js ~2601). Propose 2–3 layouts as static HTML mockups at 380 px and 1280 px (cards, step-by-step viewer, search), with how they'd load the Markdown (no build step, vanilla JS), plus one recommended. → tools/design/tutorials-tab/, branch design/tutorials-tab.
- P4  Plans for the 5 oldest items after P3. → tools/design/plans/helper-plans-4.md, branch plans/helper-4.

ADDED 7 Oct 04:00 by the PM. Your QF fixes were right, thank you. QUALITY RULE still applies. Highest value first:
- H12  #1085, measured properly: you can run the suite in your container, so do it while sampling each renderer's /proc/<pid>/status VmData AND VmRSS after every test (per-test deltas, with a forced GC where you can). Name the 20 tests that reserve the most VmData and never give it back, and say what each allocates (file:line). That is the real #1085 question, because Linux Chrome refuses at an 8 GB VmData ulimit, and Ezra's new laptop runs Linux tests. → tools/design/hunts/1085-vmdata.md, branch hunt/1085-vmdata.
- H11  Make the suite faster WITHOUT weakening any proof. From a measured run, list the 30 slowest tests with seconds each, and for each the safe speed-up: shorter fake clocks, smaller fixtures, shared setup, waits that poll instead of sleeping. Never drop an assertion. Estimate the total saving; one pass is ~45-50 min today. → tools/design/hunts/suite-speed.md, branch hunt/suite-speed.
- H9  Read-only second opinion on Simple mode (#980), which is in progress on branches 980-phase2, 980-p22, 980-p22-trayb2 and fu-lock-r5. Look for bugs, phone-width (380 px) layout risks, and anything that could change the ORIGINAL Full editor (Ezra's hard rule: the Full editor must not change in design or function). Severity-ranked, file:line. Do not suggest redesigns. → tools/design/hunts/simple-mode-review.md, branch hunt/simple-mode-review.
- P5  Plans for the next 5 oldest open items in his words after P4's. → tools/design/plans/helper-plans-5.md, branch plans/helper-5.
- R2  How CapCut and Alight Motion handle the same 7 beginner traps D1 covers (web research plus screenshots described in words). Which of D1's options matches what users already know? → tools/design/research/trap-conventions.md, branch research/trap-conventions.
- P6  Plans for the 5 after P5. → plans/helper-6.

ADDED 7 Oct 07:30 by the PM. Same rules and QUALITY RULE. Highest value first:
- H16  Independent check of ChatGPT's 7 finished fixes on branch chatgpt/1059-detect-speech-fallback, a linear chain on v17.23: #1013 empty AAC (2ea47a00), #1014 panorama (9cec73a1), #1015 guest reconnect clash (d8fa4fbb), #1016 keyboard numeric (8c813c78), #1040 missing transform (ba154a37), #1041 nested styled groups (a22dbc46), #1059 detect speech (13e5b1ea).
  - For each: review the diff for correctness and side effects.
  - Run its focused test in your container (tests/run.html?only=<name>): show it FAILS with the fix reverted and PASSES with it.
  - #1015 and #1016 never passed their gate on ChatGPT's machine ("could not bootstrap the app frame"). Find out whether that is the test or the fix.
  - Verdict per commit: land / land-after-fix (exact fix) / drop.
  → tools/design/hunts/chatgpt-chain-review.md, branch hunt/chatgpt-chain-review.
- H13  Independent pre-check of v17.24 before the laptop ships it: in your container, run the full suite at 1280 and at --width 380 on branch release/v17.24. Report the totals, every red with its first error line, and the NOT RUN HERE list. Say which reds are your container's limits (e.g. test 1926's real MP4 export) and which are real. → tools/design/hunts/v1724-precheck.md, branch hunt/v1724-precheck.
- D4  Ezra's request #1084: on a phone, the Add menu should grow out of where you tapped. In the empty project it pulses out in a circle from the finger; mid-edit, the "Tap to add a layer" row stretches up and down into the menu; plus a Settings toggle to switch back to the old slide-up. Build STANDALONE prototypes in plain HTML/CSS/JS (no app code), each at 380 px, using the app's colours, so the PM can screen-record them for him:
  - (a) circle reveal from the tap point, at 260 ms and at 340 ms;
  - (b) the row expanding into the sheet;
  - (c) today's slide-up, for comparison;
  - each with its closing (reverse) animation and a prefers-reduced-motion fallback.
  → tools/design/1084-add-anim/, branch design/1084-add-anim.
- H15  Ready-to-build plans for the Work-with-friends privacy fixes from H4: F1 (notes sync), F2 ("viewer can only watch"), F4 (address wording) and F5 (pixel cap). For F1 and F2, write BOTH options (Ezra hasn't chosen yet) with the code changes and tests for each. → tools/design/plans/collab-privacy.md, branch plans/collab-privacy.
- P7  Plans for the 5 oldest open items after P6. → plans/helper-7.


ADDED 7 Oct 07:55 by the PM (now running on Ezra's Windows laptop). H16, D4 and H15 arrived, thank you; the PM checks them after the v17.24 ship lands. Same rules and QUALITY RULE. If H13 or P7 is still open, finish those first. Highest value first:
- H17  #1097, the laptop's blocker: ~80 real-finger tests report NOT RUN HERE on Linux, so the laptop cannot ship ANY app change. Your container is Linux, so you can actually try it. The cause is written in tests/_platform.py:177-194 (REAL_TOUCH_VIA_EMULATION): on Linux headless Chrome, ANY Emulation.setTouchEmulationEnabled(false) leaves the page with no mouse, so tests/_cdp.py refuses every touch step. Leads, in order: (1) keep touch emulation ON for the whole real-touch test and restore mouse behaviour with Emulation.setEmulatedMedia features (hover, any-hover, pointer, any-pointer) re-applied after each touch batch; (2) a separate CDP target/page per touch test; (3) Input.dispatchTouchEvent without emulation plus an in-page shim for maxTouchPoints/ontouchstart/pointer:coarse during the gesture only. For each lead: run the real-touch tests (tests.js realInput924 and the tests/_rt*.py drivers) in your container at 1280 and 380 and report pass/fail per test, AND show the MOUSE tests that follow them still pass. Deliver a report plus a proposed patch as a .patch file on your branch (never applied to main). → tools/design/hunts/1097-linux-touch.md, branch hunt/1097-linux-touch.
- H18  H11 said the biggest suite lever is running the 1280 and 380 passes in parallel. A ship is ~100 min of two serial passes today. Write a ready-to-build plan for tools/ship.sh: separate ports, Chrome profile dirs and result files; how every existing gate that reads the results or the log keeps working; what happens when one pass fails while the other runs; the memory budget (each test page reserves up to ~7.6 GB VmData but ~1.6 GB RSS; the laptop's WSL has 7.7 GB RAM and 16 CPUs). Then MEASURE it in your container: two passes at once vs one after the other, wall-clock, and whether any test goes red only in the parallel run (name them; the 921 collab tests are timing-sensitive). → tools/design/hunts/parallel-passes.md, branch hunt/parallel-passes.
- H19  #1095, a real phone memory leak: after picking from the effects browser, ~335 full-size 1080x1920 canvases stay alive (~2.2 GB), measured on the Mac after test 'every tile in the browser picks instead of applying'. Find what holds them (fx browser tiles, previews, js/fx-thumbs.js caches, compositor scratch _tiA/_tiB/_thA/_thB/_wpPool), with file:line. Write the smallest fix and a test that FAILS first (count live canvases or their pixel area before and after browsing). Measure in your container with a heap snapshot or performance.measureUserAgentSpecificMemory if you can. → tools/design/hunts/1095-fx-browser-leak.md, branch hunt/1095-fx-browser-leak.
- H20  Ready-to-build plan for your own H8 import-robustness findings (100 layers x 20 glows froze the tab >60 s; 200 fonts accepted; `project` as an array accepted; `project: "x"` gives an empty project). For each entry path (shared project, backup, template, element, Work-with-friends): the exact caps (layers, effects per layer, keyframes, path points, fonts) with numbers chosen from what a real project uses, the plain-words refusal message, the shape checks in the sanitiser (refuse bad shapes, keep plain fields: never drop an unknown plain field), and the test for each that fails first. → tools/design/plans/import-caps.md, branch plans/import-caps.
- R3  From your R1 list (research/missing-effects), take the 10 most valuable for a beginner and write each as a build-ready spec: params with ranges and defaults, where it slots into js/fx-registry.js and js/compositor.js (the existing effect shape), how preview and export stay identical, the byte-identical-default rule for existing projects, and the test. Ezra wants "as much choice as possible". → tools/design/research/effect-specs.md, branch research/effect-specs.
- P8  Plans for the 5 oldest open items after P7's, same format. → plans/helper-8.

ADDED 7 Oct 14:00 by the PM. H13, H17, H18 and H19 arrived, thank you: H17's lead 2 is what the builder is now building (#1097, branch 1097-touch-pages), and your 4 diamond-hold reds turned out to be the harness (Linux headless Chrome always sends a click at touchend, a phone never does after a hold). Same rules and QUALITY RULE. In this order:
- QF4  The PM checked H16, H12, H11, H9, H15, P7, P8, H20 and R3 (read-only, against v17.24). All nine are FIX: useful, with specific errors. Apply tools/design/helper/fixes/batch3-fixes.md (on this branch) to each report on its own branch, then add one DONE line `QF4-<ID>` each. The worst errors, so you see the pattern: H20 put caps in the sanitiser that UNDO runs (history.js:71), which would cut a saved project on the first undo; H15 called F2 "a one-word fix", but Leave and Home "Keep as my own copy" keep a full copy whatever roExport says; P8's backup key fm.proj.<id>.unreadable sits under the fm.proj. prefix that five scanners read as a project; P7's splice(indexOf(L)) deletes the wrong layer after redo; R3's transitions read layer.start/duration, which are fake on a group proxy (compositor.js:18519); H12 named the wrong 1080x1920 tests. QUALITY RULE addition: before saying where a fix goes, trace EVERY caller of that function (open, import, undo, collab), not just the one you came from.
- H19b  Finish H19 (#1095): sweep all 12 effects-browser categories on unpatched main and patched; name what holds the remaining 13 canvases (file:line); prove your trim test by mutation (patch reverted → red, patch on → green, at 1280 and 380). Add the result to hunt/1095-fx-browser-leak.
- D5  Ezra must SEE #1084's animation options, and he reads on his phone. Record your three D4 prototypes (a circle reveal 260 and 340 ms, b row expands, c today's slide-up) at 380x760 as short looping GIFs (open + close, real speed, ≤ 4 MB each; frames from headless Chromium + ffmpeg or PIL), plus one side-by-side GIF of all three. → tools/design/1084-add-anim/gifs/ on design/1084-add-anim.
- D6  #545 needs before/after pictures for the PM's NEW finding (makeThumb renders the whole project at full size on every import and every ~12 s autosave, js/storage.js:2133-2161 / :2210-2229). Render the project-card thumbnail the old way and at card size (a ~360 px canvas; renderScene already scales by canvas.width / P.width, compositor.js:18745-18748) for 4 projects: a big photo, a video frame, small text, and 10 glows. Side-by-side PNGs at the size the card shows, plus timing per render. Pictures and numbers only, no app code. → tools/design/thumb-scale/, branch design/thumb-scale.
- H23  Ready-to-build plan for the PM's NEW collab finding: SCHEMA_FP hashes key, type, default, legacy, min, max and keyframable but NOT a segment's `options` (js/collab-core.js:226-228), while the sanitiser drops values not in options (js/storage.js:1392-1397), so two builds that differ by one appended option join one session and the older strips the newer's choice. Give the exact change, the SCHEMA_REV bump, the test that fails first, and list every segment param whose options list has grown since SCHEMA_REV 1 (git log -S on js/compositor.js) to say whether any released versions already disagree. → tools/design/plans/fp-options.md, branch plans/fp-options.
- H25  Audit of the "built out — waiting on him" bucket: run tools/next.sh in your container on main and, for EVERY entry it lists under that heading, check that the built half really exists in main (file:line or commit), and quote the exact one thing it waits for from Ezra. Five of 35 parked entries had nothing built behind them last time. Table: number | waits for | built half found? (evidence) | verdict (truly waiting / nothing built / already answered). → tools/design/hunts/parked-audit.md, branch hunt/parked-audit.
- P9  Plans for the 5 oldest open items after P8's, same format, and from now on trace every caller as above. → plans/helper-9.

ADDED 7 Oct 15:00 by the PM. QF4, D5, D6, H23, H25 and P9 arrived, fast and with callers traced. Thank you; the PM will spot-check H23 and H25. Same rules and QUALITY RULE. H19b is still open: do it first. Then, highest value first:
- H31  Integrity check of the builder's rebase of Simple mode (#980) onto v17.24. It re-applied each old branch's tip-to-tip diff 3-way onto the previous one, without merging history: fu-lock-r5 → fu-lock-r6 (c6bac13b), 980-s12 → 980-s12-r2 (9b4197ce), 980-phase1 → 980-phase1-r2 (2ef57028), 980-p21 → 980-p21-r2 (9c32adc3), 980-p22 → 980-p22-r2 (4e433adb). For each pair, compare the OLD branch's own diff (against its own parent in that chain) with the NEW branch's diff (against its new parent), hunk by hunk, and list every hunk that was dropped, duplicated or changed, other than the conflicts it reported (the tests.js appends and the _cdp.py `media`/`touch_base` line). A silent dropped hunk is the risk. Read-only; no runs needed. → tools/design/hunts/980-rebase-check.md, branch hunt/980-rebase-check.
- H27  From your P9: ready-to-build PATCHES (as .patch files on your branch, never applied to main) plus a test for each that FAILS first, for the leaks you reproduced: #1009 (decoded 1024 px fills surviving project switches), #1010 (67 MB per call, 2 buffers) and #1011 (a VideoFrame and the encoder leak when encode throws; also encodeAudio and aacPriming). Trace every caller before choosing where the fix goes. Show each test red on main and green with its patch, at 1280 and 380. → hunt/p9-leak-patches.
- R4  Ten MORE effect specs for "as much choice as possible" (#966), using your corrected R3 method: no duplicates of existing effects or presets (search the registry, EFFECT_PRESETS, the text Animate presets); moving effects draw through moverSource; the group/split clock (_clipStart/_clipDuration, splitOf); a visible default (the 482 default-visibility test); SCHEMA_REV + SCHEMA_FP (and options, after H23). Favour what CapCut and Alight Motion beginners reach for. → tools/design/research/effect-specs-2.md, branch research/effect-specs-2.
- D7  For the Tutorials tab (D2, layout A recommended, not yet picked by Ezra): a working static prototype of your proposed 60-line Markdown renderer (textContent only, never innerHTML; strips the <!-- --> citations and the ### Verification tables) rendering all 20 tutorials from tutorials-drafts in the A layout at 380 and 1280, plus a test page that checks every tutorial renders with no leftover markup. Prototype only, in tools/design/tutorials-tab/proto/, branch design/tutorials-tab.
- P10  Plans for the 5 oldest open items after P9's, callers traced. → plans/helper-10.

ADDED 7 Oct 15:30 by the PM. DO THIS FIRST, before H19b (Ezra is waiting on it):
- D4b  Ezra picked #1084: option a (the circle from the finger) when the project is empty, and option b (the "Tap to add a layer" row stretches into the menu) mid-edit. His words: "the preview u sent is buggy and needs work for b". Re-draw b-row-expands.html on design/1084-add-anim and fix what the PM measured frame by frame in your b GIF:
  (1) the menu content flickers: half-visible at 240 ms, gone at 270-300 ms, snaps in at 330 ms; close does the same at 1200 → 1230 ms;
  (2) the timeline behind smears and ghosts during the stretch (the Title clip shows doubled at ~180 ms): never put a blur filter on moving content, use a plain dim scrim;
  (3) the row fades out by ~150 ms, so nothing links it to the menu: the row ITSELF must be the growing shape. Start from the row's own rect and move an OPAQUE panel's top and bottom edges outward (clip-path inset(rowTop 0 rowBottom 0) → inset(0)), with the row's dashed border/glow riding the moving edge;
  (4) the content fades in ONCE over the last ~40% and fades out FIRST on close, on the same curve both ways, with no opacity toggling;
  (5) record it so no frames are merged: a GIF with every frame 30 ms AND an MP4 (or WebM) at 60 fps, at 300 ms and 380 ms, plus a slow-motion copy (4x).
  Then check every frame yourself (make a contact sheet) before pushing, and reply with what changed. a needs no rework.

ADDED 7 Oct 18:50 by the PM. H31, H19b, H27, R4, D7 and P10 arrived, with mutation proofs, thank you. main is now v17.25 (2e3fd7a9). Same rules and QUALITY RULE (trace every caller). Do these in order, without stopping between items:
- H33  Pre-check Simple mode before the laptop ships it step by step (about 2 h a step): in your container, run the full suite at 1280 and at --width 380 on ssh/980-p22-r3 (the tip of the r3 chain: fu-lock-r7 → 980-s12-r3 → 980-phase1-r3 → 980-p21-r3 → 980-p22-r3). Report totals, every red with its first error line, and for each red whether it is also red on main 2e3fd7a9 (your container) or new on the branch. Name your container's own limits (AAC, QR, real MP4 export) and leave them out. Save results per slice as you go, as you did for H13. → tools/design/hunts/980-r3-precheck.md, branch hunt/980-r3-precheck.
- T6  Walk tutorials 01-10 (branch tutorials-drafts) IN THE REAL APP at 380 px on main v17.25: do every step as written, with real taps where the step is a tap (tests/_cdp.py has real touch), and save a screenshot after each step. Table per tutorial: step | did it work as written? | what you saw instead | the exact replacement text. Change nothing in the tutorials yourself; report only. → tools/design/tutorials/walk-01-10.md + shots/, branch tutorials-walk.
- T7  The same for tutorials 11-20. → tools/design/tutorials/walk-11-20.md, branch tutorials-walk.
- H36  Ezra's questions on one phone page: regenerate tools/unblock/unblock.html (on main; read it first, keep its look and its "copy all my answers" button) from `tools/asks.sh` on main, which lists 40 open asks. Plain words, one card per ask, the recommended option pre-selected, the phone checks grouped as "try this on your phone", and a single "accept every recommendation" button at the top. Never use innerHTML for any text taken from REQUESTS.md. → branch unblock/refresh (do not publish it anywhere; the PM shows it to Ezra).
- P11  Plans for the 5 oldest open items after P10's, callers traced. → plans/helper-11.

ADDED 7 Oct 23:10 by the PM. H33, P11, T6 and T7 arrived, thank you. Same rules and QUALITY RULE (trace every caller). Keep your turn alive through long runs (short polls, never one long wait), and go straight through these in order:
- T8  Apply your own T6/T7 walk findings to the tutorials on tutorials-drafts: every step you marked "wrong as written" gets your replacement text (e.g. 13 step 5, the eraser; 17 step 7 and 18 step 1, the missing lines). Re-walk ONLY the changed steps in the real app at 380 and save one screenshot per changed step. Leave the "On a computer" paragraphs and the steps you could not walk (17 steps 5-6 need a second device; MP4 export) untouched, but mark each in the file with an HTML comment `<!-- not walked: why -->`. → tutorials-drafts, plus a short change list in tools/design/tutorials/walk-fixes.md.
- H37  Your H33 found two 690 tests that hung in your container on the Simple r3 tip. Run each of them ALONE on main (2e3fd7a9 or newer) and on 980-p22-r3, at 1280 and 380: does it hang on main too (a container limit), or only on the branch (a real Simple regression the laptop will hit)? Name the step it stops on, using its window.__fmStep marker. → add a section to tools/design/hunts/980-r3-precheck.md on hunt/980-r3-precheck.
- H39  Your R4 found that the "482: every effect does something visible at its own defaults" test never visits CANVAS_FX (the movers), so a new moving effect with a do-nothing default would pass it. Write a ready-to-build plan to extend that test to CANVAS_FX: how to drive a mover's kernel at its defaults (it needs t and a layer), what "visible" means for a mover (pixels differ from the un-moved frame at some t in its cycle), which existing movers would fail today (list them, measured in your container), and a .patch with the test change that is red on any such mover. → tools/design/plans/482-canvasfx-defaults.md, branch plans/482-canvasfx.
- H40  The _cfPool leak (H19b) was a module-level pool that grows and never trims. Audit EVERY module-level cache/pool/array/Map in js/ for the same shape: what it holds, what makes it grow (with file:line), whether anything ever trims or clears it, and a rough size per hour of real phone editing. Rank by risk to a phone. For the top 5, give the smallest trim and a test that fails first. → tools/design/hunts/pool-audit.md, branch hunt/pool-audit.
- P12  Plans for the 5 oldest open items after P11's, callers traced. → plans/helper-12.

ADDED 8 Oct 00:00 by the PM. Do this right after the item you are on now (before H37):
- H41  Test pollution census. Tonight the laptop's ship was refused 5 times, mostly by tests that INHERIT state an earlier test left behind: FM.time left past the clips ("a vertical swipe that starts ON a clip scrolls the timeline"), #tl-inner left sized for an old scene ("the timeline sizes its scroll range from itself, not from the window"), shapes left in the scene (the "queue 277 + 390" sheet preview and the Presets card tests). Each took ~2 h to find. In your container, on main (newest), add a TEMPORARY after-each hook in your scratch copy of tests/run.html or tests.js (never pushed to main) that records after every test: FM.time, the timeline zoom, project duration, selected layer ids, any open sheet/panel/menu, #tl-inner's width vs what a rebuild gives, and the scene's layer count vs before. Run the full suite at 1280 and 380 and list every test that leaves any of these different from what it found, with the value it left. Rank by how many later tests could be affected. Then propose the structural fix as a .patch: either the runner resets these between tests, or it extends the existing sceneLeaks report to them. Show the patch turns tonight's three reds green when run after their polluters, with a slice that reproduces each. → tools/design/hunts/test-pollution.md, branch hunt/test-pollution.

ADDED 8 Oct 03:00 by the PM. T8, H41, H37, H39, H40 and P12 arrived, thank you; the polluter names in H41 are exactly what the builder needed. Same rules and QUALITY RULE. Keep your turn alive with short polls. In order:
- H47  Your H41 found four tests (#254, #373, #276, #487) that leave #tl-inner's scroll width stale. Is that only test hygiene, or can a USER hit it? For each, find the exact app call that changed duration, zoom or layers without the timeline being resized (file:line), then try to reach the same state through the real UI at 380 px (taps only, no FM.* calls). If a user can end up with a timeline that scrolls too far or not far enough, write it as a bug with a red-first test and the smallest app fix (as a .patch). → tools/design/hunts/stale-timeline-width.md, branch hunt/stale-timeline-width.
- H42  Run the whole suite at 1280 and 380 WITH your H41 stateLeaks patch applied (in your scratch copy) and report: no new reds versus main (list any), and the full stateLeaks list, grouped by kind (time, zoom, duration, selection, open panels, Home, #tl-inner) and ranked by how many later tests each polluter touches. → add to tools/design/hunts/test-pollution.md on hunt/test-pollution.
- H43  The 11 scratch pools your H40 patch 2 does not cover: measure each (bytes held after a realistic phone session: 10 minutes of browsing effects, editing, one export), patch the ones over 20 MB with a red-first test, and list the rest with their size. → add to tools/design/hunts/pool-audit.md on hunt/pool-audit.
- H44  `_prevFiles`: measure its RAM cost after importing 20 phone clips and switching projects 5 times, and say whether it needs a cap. → same file.
- P13  Plans for the 5 oldest open items after P12's, callers traced. → plans/helper-13.

ADDED 8 Oct 05:50 by the PM, for when P13 is done. Same rules and QUALITY RULE; keep your turn alive with short polls. If you hit your weekly usage limit, stop cleanly with everything pushed; the PM resumes you after 11:00 AWST. In order:
- H49  When main moves to v17.26 (the phone "?" button removed, #1065), check it in your container at 380 and 1280: on a phone, Help is still reachable (Settings > Keyboard shortcuts opens the same Help sheet) and nothing in the phone top bar overlaps or leaves a gap; on PC the "?" (#btn-help) is still there and opens the shortcuts. Screenshots of both bars. Report only. → tools/design/hunts/1065-check.md, branch hunt/1065-check.
- T9  Simple mode (#980) is coming in five releases from the laptop (branches fu-lock-r7 → 980-s12-r3 → 980-phase1-r3 → 980-p21-r3 → 980-p22-r3). Draft 4 beginner tutorials FOR SIMPLE MODE from the tip branch 980-p22-r3, in the same format as tutorials 01-20 (numbered steps, a Tip, "If it doesn't work", a verification table with file:line), and walk each one in the real app at 380 on that branch with a screenshot per step: (1) switching to Simple and back; (2) making a first video in Simple; (3) trimming and splitting in Simple; (4) adding text and music in Simple. → tutorials-drafts, in tutorials/simple/.
- H50  Android vs iPhone differences the app depends on: list every feature that relies on something that differs between Android Chrome and iOS Safari (vibrate, the share sheet and file save, file pickers and the formats they hand over, long press and context menus, WebCodecs AAC/H.264 encode, BarcodeDetector, fullscreen, wake lock, storage persistence and quota), with file:line, what each platform does, and whether the app has a working fallback. Rank by risk to an Android user. → tools/design/hunts/android-vs-ios.md, branch hunt/android-vs-ios.
- R5  What beginners coming from CapCut look for first in a "simple" editor that Simple mode (980-p22-r3) does not yet have: the 10 most useful gaps, each with how CapCut does it, whether FreeMotion's Full editor already has it (so Simple could just expose it), and a rough size. → tools/design/research/simple-gaps.md, branch research/simple-gaps.
- P14  Plans for the 5 oldest open items after P13's, callers traced. → plans/helper-14.

ADDED 8 Oct 06:40 by the PM. NOTE: QF4, H19b, D5 and D6 are ALREADY DONE (your DONE lines QF4-H16 … QF4-R3, H19b, D5 and D6 are on helper/done); do not redo them. Read DONE.md's first column for the IDs, not a regex over the backlog. Same rules and QUALITY RULE; keep your turn alive with short polls; if your weekly limit comes, push first (it resets 11:00 AWST). In order:
- H51  The memory patch stack. Apply ALL your memory patches together on a scratch branch off main (newest): H19b (_cfPool trim), H27 (#1009, #1010, #1011), H40 (five trims), H43 (_adjFcPool, _fcPool), H44 (_prevFiles held weakly). Resolve conflicts between them (several touch js/compositor.js), run the full suite at 1280 and 380, list every red versus main, and measure the combined saving on one realistic phone session at 380 (10 minutes of effects browsing and editing, 20 imported clips, one export; VmData, RSS and the canvas count before and after). Deliver the stack as one ordered set of .patch files that apply cleanly to main in that order. → tools/design/hunts/memory-stack.md + patches/, branch hunt/memory-stack.
- R6  Your R5 found "there is no music library". For a local-only app with no server: find 30+ genuinely free-to-use music tracks (CC0 or similarly no-attribution licences ONLY; quote each licence and its source URL) across moods a beginner wants (upbeat, chill, cinematic, vlog, lo-fi), with length and file size as compressed audio, and propose how few MB a starter pack could be and how the app could offer more tracks as an optional download. List nothing you can't verify the licence of. → tools/design/research/music-library.md, branch research/music-library.
- T10  Four more Simple-mode tutorials from 980-p22-r3, same format and walk at 380 as T9: (5) adding an effect in Simple; (6) changing speed; (7) exporting from Simple; (8) when to switch to the Full editor. → tutorials-drafts, tutorials/simple/.
- P15  Plans for the 5 oldest open items after P14's, callers traced. → plans/helper-15.

ADDED 8 Oct 07:00 by the PM, at the builder's request. TOP PRIORITY: pause H51 at a clean point (push what you have) and do this first.
- H52  The intermittent census. Overnight the laptop's ship was refused NINE times, each time by ONE new test that is red in a full pass but green alone (timing or inherited-state assumptions that hold on the Mac): "the vertical swipe…", "947 a real press in the middle of the ripple", "the timeline sizes its scroll range…", "921 S6 … live reconnect kept running", "699 a swipe that starts on a trim grip", "981 … double-tap window (300 ms)", "921 S4 splash.mp4 … the frame drawn from it is blank", and the 1065 PC row. All eight are fixed in v17.26. Find the NEXT ones in one go instead of one per 2-hour ship.
  1. Wait until main shows v17.26 (`git ls-remote origin refs/heads/main`, or the live page's version label). Use that main, not an older one, or tonight's eight come back.
  2. At 1280 and at --width 380, run: one normal full pass; one full pass with the whole page CPU-throttled 2x (Emulation.setCPUThrottlingRate 2 for the run; this shakes out tests that assume fast timing); one full pass with a background CPU load (e.g. `stress-ng --cpu N` or busy loops on half your cores). Use your sliced, progress-file method, and skip your known container hangs by name.
  3. Every test that is red in ANY of those passes: run it alone 3 times on the same tree. Red in a pass but green alone = an INTERMITTENT. Record its message, which passes it went red in, and your best one-line guess at the assumption (time read after an await, a fixed settle wait, inherited state, same-instant input events, …).
  4. Mark which ones are probably container-only (software GL, no H.264, Chromium 141) versus timing assumptions any slower or faster machine would hit.
  → tools/design/hunts/intermittents.md (a table: test | width | passes red | alone 3/3 | message | likely assumption | container-only?), branch hunt/intermittents. Push partial results after each pass so the builder can start early.

ADDED 8 Oct 17:45 by the PM. H52 was good work: the builder has its three findings logged. Same rules and QUALITY RULE. Keep your turn alive with short polls; if your weekly limit comes, push first. NEVER push to main. NEVER force-push. Your force-push to hunt/memory-stack was rightly blocked: when a branch needs replacing, push to a NEW name (e.g. hunt/memory-stack-2) and say so in DONE. Order after H51: S1, H53, H54, H55, then T10, P15, then H56.
- S1  Simple mode release 2.3 (speed, sound and replacing), written in full. BUILD-PLAN-PHASE2.md §5 has anchors only. Write its full code hunks and tests in the same format as §3/§4 (releases 2.1/2.2), on a scratch branch off 980-p22-r3, the tip of the Simple chain.
      Rehearse it:
      - every new test fails before and passes after, at 1280 and 380;
      - all existing Simple tests stay green;
      - the Full editor is unchanged in look and behaviour (DESIGN §0.4, his rule).
      List every point where §5 was ambiguous and what you chose.
      This is the biggest lever on his Simple-mode date, because releases 2.3–2.6 are the only Simple code not yet written.
      → tools/design/plans/simple-mode/BUILD-PLAN-PHASE2-2.3.md on branch plans/simple-2.3, plus the code on branch hunt/simple-2.3.
- H53  Glow Scan's false "changes nothing". It reproduced ALONE in your container (H52).
      - Find why `noopTimes` (js/fx-thumbs.js: NOOP_SPREAD plus FM.fxNoopMoments) misses a Glow Scan with {pause:5} on a 10 s clip.
      - Write the fix: either Glow Scan supplies its sweep moments through FM.fxNoopMoments, or a time-dependent effect with a pause answers "unknown" and never gives a no-op verdict.
      - Make the 482 6.7 test deterministic: it must fail with the fix reverted.
      - Strength 0 must still be called a no-op.
      → patch on hunt/glowscan-noop, notes in tools/design/hunts/glowscan-noop.md.
- H54  glide #715. The release velocity is the last pointer sample, so under 2x throttle a flick that stalls just before release does not glide.
      - Fix: take the velocity over the last ~100 ms, ignoring a trailing zero-movement sample.
      - Keep "a parked pointer does not fling" and "fine mode never glides" true.
      - The test must fail with the fix reverted at 1280, at 380 and under 2x throttle.
      → hunt/glide-velocity.
- H55  The four does-nothing CONTROL tests go red under 2x throttle (690 Spin, 482 6.7's Strength 0, 477, 794). `noopAt` gives up over NOOP_BUDGET_MS = 45, which is by design.
      - Add a test seam `FM.fxThumbs._noopBudget(ms)`, restored in `finally`.
      - Use it in those four tests only, while they check the verdict.
      - Prove three things: green under 2x throttle with the seam; red under throttle without it; no change in app behaviour (with no seam call the budget stays 45 ms).
      → hunt/noop-budget-seam.
- H56  The five order-dependent reds from H52: home push, playhead rebuild, 981 x2 and 988. Each is red in every full pass and green alone.
      - For each, find the earlier test that leaves state behind: pair [suspect predecessor, red] runs and bisect with ?after=&upto=.
      - Name the leaked state.
      - Say whether the laptop's suite could hit it too.
      → tools/design/hunts/intermittent-census/order-deps.md on hunt/intermittent-census.

ADDED 9 Oct 02:50 by the PM. Excellent batch: S1 especially. The builder has all of it. Same rules and QUALITY RULE. Keep your turn alive with short polls; push as you go; never push to main; never force-push. In order:
- S4  Fix the four Simple-mode bugs your T10 walk found on 980-p22-r3, before 2.1/2.2 ship:
      (a) typing 1 in Speed makes a 10-minute clip;
      (b) the ✦ badge ignores effects;
      (c) Simple's back arrow leaves the project (say what it should do per DESIGN.md, and quote the line);
      (d) a slow swipe on a panel button raises a "Reset" menu.
      Each gets a red-first test at 1280 and 380 and a mutation that is caught. Full must be unchanged (DESIGN §0.4).
      Say which release (1.3 / 2.1 / 2.2) each fix belongs to.
      → hunt/simple-t10-fixes (one commit per bug, based on 980-p22-r3), notes in tools/design/hunts/simple-t10-fixes.md.
- S5  Your A1 question as pictures for Ezra: a video clip's tray has 13 tools, so on PC it goes back to one scrolling row.
      - Render each option from your S1 doc in the real app at 1280x800 AND 1024x600, on a video clip with the tray open.
      - Mark one "(recommended)".
      - Put each screenshot plus a one-line caption in tools/design/plans/simple-mode/a1-options/ on plans/simple-2.3, and a sheet.jpg (all options side by side, under 3x as tall as wide) for his phone.
- S2  Release 2.4 (riders, couplings and crossfades), written in full on top of hunt/simple-2.3. Same method as S1: BUILD-PLAN-PHASE2.md §6 anchors → full hunks and tests; red before, green after at 1280 and 380; the Simple slice stays green; mutations caught; Full unchanged. List every point where the plan was ambiguous.
      → plans/simple-2.4 + hunt/simple-2.4.
- S3  Release 2.5 (drags), the same way, on top of S2. Drags need real touch, so say plainly which tests only the laptop's finger pass can run, and write them so they report NOT RUN in your container rather than passing.
      → plans/simple-2.5 + hunt/simple-2.5.
- H57  Your H51 memory stack, rebased onto the newest main (v17.29 or later).
      - Re-measure the phone session (renderer RSS, VmData, canvases) twice per tree, not once.
      - Order the 14 patches into 3 landable groups, lowest risk first, each with its own tests.
      → hunt/memory-stack-2 (a NEW branch name).
- P16  Plans for the 5 oldest open items after P15's, callers traced. → plans/helper-16.

ADDED 9 Oct 10:20 by the PM. Superb run: S2, S3, S4, S5, H57 and P16 all landed, and Ezra has your A1 sheet. Same rules and QUALITY RULE. Keep your turn alive with short polls; push as you go; never push to main; never force-push (use new branch names). In order:
- S7  Finish 2.4. Your S2 left 11 sub-rules not built (listed in plans/simple-2.4). Build each on top of hunt/simple-2.4 with a red-first test at 1280 and 380 and a caught mutation, or write down why it must wait (and for whom).
      → hunt/simple-2.4b (new branch), with the plan updated on plans/simple-2.4.
- S8  Close 2.5's gaps:
      (a) grips for non-main clips, if DESIGN.md says they get them (quote the line either way);
      (b) tests for brakes 3 and 4 of the edge-scroll copy;
      (c) the click-swallow-after-drag mutation that survives on a mouse: write the finger-pass version, so the laptop's real-touch pass catches it (it reports NOT RUN in your container).
      → hunt/simple-2.5b.
- S6  Release 2.6, "the live session, finished" (BUILD-PLAN-PHASE2 §8), written in full on top of 2.5 (S8's branch if it is done), the same way as S1–S3. Collab tests must use the fake network (withFakeNet921), never a real one.
      → plans/simple-2.6 + hunt/simple-2.6.
- S9  Option E from your A1 sheet (one "Audio" tool: Speed, Volume, Reverse, Take sound out; two rows on PC), built properly on top of hunt/simple-2.3 as its own commit with tests at 1280x800, 1024x600 and 380, so it can land the moment Ezra picks E.
      - Fix the 2 px cut of "Take sound out" at 1280 in the open Audio row.
      - Do NOT merge it into the other branches.
      → hunt/simple-a1-e.
- R7  A beginner's walk of the WHOLE Simple chain tip (2.5, or 2.6 if done) at 380 and at 1280, like your T10. Try to make a 30-second video from 3 clips, a title, music and a transition, without reading anything. List every place you got stuck or surprised, each with a screenshot and file:line where you can, ranked by how badly it would stop a first-time user.
      → tools/design/research/simple-walk-2.md on branch research/simple-walk-2.
- P17  Plans for the 5 oldest open items after P16's, callers traced. → plans/helper-17.

ADDED 9 Oct 13:10 by the PM. Huge run: S6–S9, R7 and P17. Your R7 walk is exactly what was needed. Same rules and QUALITY RULE. Keep your turn alive with short polls; push as you go; never push to main; never force-push (new branch names only). In order:
- S10  Fix the bugs your R7 walk found on the 2.6 tip, one commit each with a red-first test at 1280 and 380 and a caught mutation. For each, quote the DESIGN.md line that says what it should do.
      (a) The time readout is wrong after adding clips: js/spine-edit.js:1292 never calls FM.updateReadout().
      (b) The PC's first Simple screen overlaps Full's Add grid.
      (c) A long song stretches the film (34.7 s, not 30).
      (d) Music and titles land at the playhead. If DESIGN says that is right, say so and leave it.
      (e) A new project opening in Full: check it against D3 A ("opens in whichever editor this device last used"). Fix it only if it breaks D3.
      → hunt/simple-r7-fixes on top of hunt/simple-2.6.
- S11  Transitions in Simple. Your walk found none anywhere at the 2.6 tip.
      - Find where DESIGN.md and the BUILD-PLANs put clip transitions (D13 "transitions never shorten the video"; judge-buildability's step 7 "Transitions and clip animations"), and quote it.
      - Then write that release in full on top of S10's branch, the same way as S1–S6: plan text, hunks and tests red-before/green-after at 1280 and 380; the preview must equal the export at every seam where measurable; Full unchanged.
      - If DESIGN leaves a choice open, draw 2–3 options as pictures in the real app (one marked recommended) for Ezra instead of guessing.
      → plans/simple-transitions + hunt/simple-transitions.
- S12  The landing check. Rebase your whole Simple stack (2.3 → 2.4b → 2.5b → 2.6 → r7 fixes, plus simple-t10-fixes and simple-a1-e as separate commits) onto the builder's newest chain tip (980-p22-r6 or later; fetch first). Report every conflict and how you resolved it, and run the whole Simple slice at both widths.
      → hunt/simple-stack-landing. This is what the builder will take release by release.
- R8  Your R5 listed 10 gaps vs CapCut. Re-check each against the 2.6 tip plus S10/S11: closed, still open, or partly. Rank what is still open by how often a beginner hits it.
      → tools/design/research/simple-gaps-2.md on research/simple-gaps.
- T11  Four Simple tutorials for the new releases (speed and sound, crossfades, dragging clips, editing with a friend), walked at 380 on your newest Simple tip, same format as T9/T10.
      → tutorials-drafts.
- P18  Plans for the 5 oldest open items after P17's, callers traced. → plans/helper-18.

ADDED 9 Oct 16:20 by the PM. S10–S12, R8, T11 and P18 all landed, and Ezra has your transitions sheet. Your Simple code is now well ahead of what the builder can ship (it waits on the laptop's lock), so this batch is about QUALITY and LANDING COST rather than more features. Same rules and QUALITY RULE; keep your turn alive; push as you go; never push to main; never force-push. In order:
- S13  An adversarial review of your whole hunt/simple-stack-landing, one lens at a time. Write each finding down, then try to REFUTE it before fixing.
      Lenses:
      (1) Full unchanged: any line that changes Full's look or behaviour, against DESIGN §0.4;
      (2) undo/redo across every Simple command, byte for byte;
      (3) save, close, reopen: a project made in Simple reopens identical in Simple AND in Full;
      (4) collab: a Simple user and a Full user on the fake network;
      (5) phone layout at 380 and 320x568, and PC at 1024x600;
      (6) a project with 60 clips and a 10-minute song (speed of every command).
      Fix each confirmed finding with a red-first test.
      → hunt/simple-stack-landing-2 (new branch); findings in tools/design/hunts/simple-review.md.
- H59  A seconds-fast gate for the Full-unchanged lock's plants. Write tools/_fu_plantcheck.py: for every plant in tools/full-unchanged-plants.json with an "old" anchor, the anchor must occur exactly once in its file in the tree, or it exits non-zero naming the plant.
      - Include a self-test (a fake plants file with a missing anchor and a doubled anchor must both be caught).
      - Show the 3-line hook for tools/full-unchanged.sh to run it first.
      The laptop lost a whole 30-minute run to "could not plant sanitiser" today.
      → hunt/fu-plantcheck.
- S14  R8's 7 open CapCut gaps.
      - For each one INSIDE what DESIGN.md already decided (quote the line), write it in full on top of S13's branch, with tests as before.
      - For each one that is a NEW feature DESIGN never decided, do NOT build it. Write a one-page plan with 2–3 options drawn in the real app (one marked recommended), so Ezra can pick.
      → hunt/simple-gaps + plans/simple-gaps.
- T12  Two tutorials for transitions in Simple (adding a crossfade; dip to black at the end), walked at 380 on your newest tip, the same format as T9–T11. → tutorials-drafts.
- P19  Plans for the 5 oldest open items after P18's, callers traced. → plans/helper-19.

ADDED 9 Oct 18:10 by the PM. S13, S14, T12 and P19 all landed. Ezra already has 4 pictures and questions waiting, so your new S14 option sheets and #1074's question are HELD by the PM for now; do not chase them. Simple is far ahead of shipping, so this batch is Ezra's step 3 from 5 Oct: "a first-party deep audit … held to this project's own proof standard". Same rules and QUALITY RULE; keep your turn alive; push as you go; never push to main; never force-push. In order:
- AU1  A deep audit of js/timeline.js on main v17.31 (fetch main first).
      - Read every function.
      - For each suspected bug, write a repro test that is RED on main at 380 or 1280, then try to REFUTE it: is it by design per REQUESTS.md or a comment? is it the test's fault?
      - Log only what survives, each with file:line, the repro test, a one-line fix, and that fix proven (green with it, red without).
      → tools/design/hunts/audit-timeline.md + patches on hunt/audit-timeline.
- AU2  The same for js/inspector.js. → hunt/audit-inspector.
- AU3  The same for js/storage.js, with save/reopen/version-upgrade/quota paths first (his projects live there; a bug here loses work). → hunt/audit-storage.
- P20  Plans for the 5 oldest open items after P19's, callers traced. → plans/helper-20.
- P21  Plans for the next 5 after P20's. → plans/helper-21.

ADDED 9 Oct 20:50 by the PM. AU1–AU3 found real bugs (the storage ones especially), and they go to the builder tonight. The decisions you raised (the rollback/newer-effects choice, #1079, #1082) are HELD by the PM until Ezra clears his current 4 picks; do not chase them. Same rules and QUALITY RULE (repro red on main, refute before logging, each fix proven green-with/red-without at 1280 and 380). Keep your turn alive; push as you go; never push to main; never force-push. In order:
- AU4  Deep audit of js/scene.js + js/history.js (the document model and undo/redo: every command must undo byte-for-byte). → hunt/audit-scene.
- AU5  Deep audit of js/collab-core.js + js/collab-session.js on the fake network only (withFakeNet921), never a real one. Focus on lost edits, a stale copy overwriting a newer one, and a rejoin that duplicates layers. → hunt/audit-collab.
- AU6  Deep audit of js/exporter.js. Your container has no H.264/AAC, so audit by reading plus the paths that DO run (WebM/Opus where the code allows, the frame loop, cancel, the report). Say plainly what you could not run. → hunt/audit-exporter.
- AU7  Deep audit of js/mobile.js (phone gestures). Real touch is NOT RUN in your container, so write each repro as a finger test that reports NOT RUN HERE in your container (the laptop's finger pass runs it) plus a mouse-driven version where the code path allows. → hunt/audit-mobile.
- P22  Plans for the 5 oldest open items after P21's, callers traced. → plans/helper-22.

ADDED 9 Oct 22:30 by the PM. AU4–AU7 and P22 are in the builder's inbox. The decisions (the host-snapshot reload design call, and the rest) stay HELD by the PM. Your session limit is at 100%: start these when it resets, and keep pushing as you go. Same proof rules. Never push to main; never force-push. In order:
- AU8  Deep audit of js/home.js (projects list, open, duplicate, rename, delete, Select mode, import into a new project). Focus first on anything that can lose or misplace a project. → hunt/audit-home.
- AU9  Deep audit of js/app.js, first third by line count (say the line range). → hunt/audit-app-1.
- AU10 Deep audit of js/app.js, second third. → hunt/audit-app-2.
- AU11 Deep audit of js/app.js, last third. → hunt/audit-app-3.
- AU12 js/compositor.js: preview must equal export. For the 20 most-used effects, render one frame through the preview path and the export path and compare. List every effect that differs beyond its measured jitter (follow the project's tolerance-from-measurement rule), and fix what you can prove. → hunt/audit-compositor.
- P23  Plans for the 5 oldest open items after P22's, callers traced. → plans/helper-23.

ADDED 10 Oct 00:10 by the PM. AU8–AU12 and P23 are in the builder's inbox; the Glitch-fringe owner call is held. Same proof rules. Keep your turn alive; push as you go; never push to main; never force-push. In order:
- AU13 The parts of js/app.js your AU9–AU11 said plainly were NOT read:
      - sync/play/pause (2187–2790);
      - creators, delete, paste, replaceMedia, import and the export dialog;
      - init wiring (6720–7630), transport, rate stepping, clip keys.
      Same method. → hunt/audit-app-4.
- AU14 The 27 effects your AU12 left unclassified (past the floor), plus a VIDEO-layer preview-vs-export check for the 20 most-used effects where your container can decode it (WebM/VP9). Say plainly which ones it could not. → hunt/audit-compositor-2.
- AU15 Deep audit of the audio code (js/audio-fx-live.js, js/audio-fx-browser.js and the mixer/soundtrack builder): what you hear in the preview must equal what exports, mutes and solos must be honoured, and nothing may leak after a stop. → hunt/audit-audio.
- AU16 Deep audit of js/fx-registry.js + js/fx-thumbs.js: defaults, ranges, migrations of old saved params, and the no-op probe. → hunt/audit-fx.
- P24  Plans for the 5 oldest open items after P23's, callers traced. → plans/helper-24.

ADDED 10 Oct 01:50 by the PM. AU13–AU16 and P24 landed. The deep audit now covers most of the core, and AU13's undo bug is a good catch. Same proof rules. Keep your turn alive; push as you go; never push to main; never force-push. In order:
- PF1  The "100 layers × 20 effects" freeze your P24 found and did not fix (#1099).
      - Build that project in the real app on main.
      - Profile where the time goes (the render, the effect cache, the timeline thumbnails, the inspector).
      - Find the cause and fix it with a perf test: assert a ceiling with headroom over the measured number, never a guess, and say both numbers.
      - It must not change any picture: run the 482 pinned-picture slice.
      → hunt/perf-freeze.
- AU17 The parts your audits said were NOT covered:
      - the rest of js/fx-thumbs.js (~1,400 lines);
      - presets: save, apply, rename, delete;
      - renamed-parameter migration of old saves.
      → hunt/audit-fx-2.
- AU18 The app.js parts still unread after AU13: import, the export dialog, init wiring and clip keys. Also MEDIA layers (video, image, audio) through duplicate and paste, which your fuzz did not cover. → hunt/audit-app-5.
- AU19 Deep audit of the timeline's media thumbnails and filmstrips (memory, cancel when he leaves a project, stale frames after replace media), using your container's WebM where H.264 is missing. → hunt/audit-filmstrip.
- P25  Plans for the 5 oldest open items after P24's, callers traced. → plans/helper-25.

ADDED 10 Oct 03:20 by the PM. AU17 (the 121st-preset deletion) and AU19 (wrong frames after undoing a replace) are real catches, and both are in the builder's inbox. Same proof rules. Keep your turn alive; push as you go; never push to main; never force-push. In order (if P25 is not done yet, finish it first):
- PF2  Your PF1 cause 2: N glows build a CSS filter chain that costs ~N³.
      - Prototype drawing stacked glows as separate draws, behind no flag.
      - Prove it picture-identical, or within MEASURED jitter: the #482 pinned slice, the effects slice, and 1/4/8/16 glows on text, a shape and an image.
      - Measure the speed at 1, 4, 8 and 16 glows.
      - Where a case is not identical, list it and stop there; do not change a look.
      → hunt/perf-glow.
- PL1  The rename hazard your AU17-2 found: a renamed param key or effect type is DROPPED on load. Design a small alias table (old key → new key, old type → new type) applied in the sanitiser BEFORE unknown keys are dropped. Write it with tests (an old save with a renamed key keeps its value) and wire your AU17-2 guard so that renaming without an alias fails with a message saying "add an alias". → hunt/param-aliases.
- AU20 The rest of js/fx-thumbs.js your AU17 did not read (~800 lines: subject tables, overrides, the layerStep tail), plus the inspector preset tag/rename UI. → hunt/audit-fx-3.
- AU21 Collab media paths (a video, image or song sent between peers on the fake network: chunking, resume after a drop, a big file, a cancelled transfer, the receiver's own records) plus the boot-time touch wiring (by reading; finger repros report NOT RUN in your container). → hunt/audit-collab-media.
- P26  Plans for the 5 oldest open items after P25's, callers traced. → plans/helper-26.

ADDED 10 Oct 05:30 by the PM. PF2, PL1, AU20, AU21 and P26 landed, and integrate.sh is exactly what landing needed. The deep audit is close to complete. Same proof rules. Keep your turn alive; push as you go; never push to main; never force-push. In order:
- INT1 When main moves to v17.34 (`git ls-remote origin refs/heads/main`, or the live label), rebuild the integration of every audit/perf/alias branch with integrate.sh onto it. Run each repro slice at both widths, fix the `?v=` collisions against that main, and push it.
      → hunt/audit-integrated-2, with a one-page landing order (smallest risk first, storage last, each with its tests) in tools/design/hunts/landing-order.md.
- E1  "As much choice as possible" (his standing ask for FreeMotion, #966): 6 NEW effects that beginners and CapCut users look for and FreeMotion lacks. Your R5/R8 gap lists are a start; check fx-registry so none duplicates an existing effect.
      - Each one is built in full, with defaults, ranges, a picture test, preview = export, and no change to any existing look.
      - Render a picture sheet: each effect on a photo, a text and a shape at 3 settings, under 3x as tall as wide.
      - These need Ezra's look before shipping, so the sheet is the deliverable.
      → hunt/new-effects-1, sheet at tools/design/plans/new-effects-1/sheet.jpg.
- P27  Plans for the 5 oldest open items after P26's, callers traced. → plans/helper-27.
- P28  Plans for the next 5 after P27's. → plans/helper-28.

ADDED 10 Oct 07:40 by the PM. E1, P27 and P28 landed, and the E1 sheet has gone to Ezra. Same proof rules. Keep your turn alive; push as you go; never push to main; never force-push. In order (finish INT1 first if it is not done yet):
- FZ1  Your E1 finding: `921 S1 convergence fuzz` fails seeds 23, 28, 30, 32, 38, 39 and 43 ON MAIN.
      - Find the root cause of each failure shape (the guest/host `layers/N/parent` mismatch; 21 owner layers against 20 in the host base).
      - Say plainly whether two real devices could end up with different projects (a product bug) or whether it is the fixture.
      - If it is a product bug, fix it: a test red on main and green with the fix, at 1280 and 380, mutation-caught, with all 43 seeds green.
      → hunt/fuzz-seeds.
- AU22 Audit the Simple editor's engine, which is on main since v17.33: js/spine.js (438 lines), js/spine-words.js, and the storage.js and scene.js additions.
      - Read it against how Simple will use it (#980).
      - Check for: lost edits, a Simple save that Full cannot open (or the reverse), undo crossing modes, collab, very long or empty projects, and phone-sized lists.
      - Repros must be red on main v17.34. Do not touch the files the builder has open for step 1.3 (editor-mode.js, simple-timeline.js are not on main yet).
      → hunt/audit-spine.
- E2   Two looks for Ezra:
      - Oil Paint: render your Kuwahara Oil Paint and ChatGPT B6's `3728d6f5` Oil Paint side by side, on the same photo, text and shape at 3 settings each, so he can pick ONE.
      - Soften Skin: render it on the most face-like image already in the repo (no downloads) at its defaults and at 2 stronger settings, and propose a default Amount.
      - Keep each sheet under 3x as tall as it is wide.
      → hunt/new-effects-1 (new commits), sheets at tools/design/plans/new-effects-1/oil-compare.jpg and softskin.jpg.
- P29  Plans for the 5 oldest open items after P28's, callers traced. → plans/helper-29.
- P30  Plans for the next 5 after P29's. → plans/helper-30.

ADDED 10 Oct 10:45 by the PM. FZ1 found a REAL host stale-ack replay, AU22 found 3 real bugs in the Simple engine, and E2's sheets have gone to Ezra. Good work. One correction: P29 said the `fm912-filters` branch is on no remote. It is backed up at `refs/mac-backup/2026-10-07/heads/fm912-filters` (ls-remote shows refs/mac-backup/*), so it is not at risk. Same proof rules. Keep your turn alive; push as you go; never push to main; never force-push. In order:
- FZ2  Seed 142 (comments whole-list resend), the one seed in 1–150 that still fails. Find its root cause and say plainly whether it is a product bug or the fixture. If it is a product bug, fix it under the FZ1 rules (red on main, green with the fix, 1280+380, mutation-caught). → hunt/fuzz-seeds (new commits).
- INT2 When main moves past v17.34 (v17.35 is shipping now; check `git ls-remote origin refs/heads/main` or the live label), rebuild the integration on it, now including hunt/fuzz-seeds, hunt/audit-spine and hunt/new-effects-1:
      - re-pin `SCHEMA_FP` once, after all of them;
      - give every `?v=` a distinct number against that main;
      - run every new test alone at both widths.
      Update landing-order.md: where the three new branches go, and what main has absorbed since. → hunt/audit-integrated-3.
- AU23 The js/*.js files no AU has read yet. List js/*.js against tools/design/hunts/audit-*.md and audit the LARGEST unread file (the next one if time allows), with repros red on main. → hunt/audit-unread-1.
- AU24 If the builder's step-1.3 Simple code (js/editor-mode.js, js/simple-timeline.js) is on main or a pushed branch by then (ls-remote for 980-phase1*), audit it against #980's spec, the same way as AU22. Otherwise skip it and say so. Never touch the builder's own branches: work on a copy. → hunt/audit-simple-13.
- P31  Plans for the 5 oldest open items after P30's, callers traced. → plans/helper-31.
- P32  Plans for the next 5 after P31's. → plans/helper-32.

ADDED 10 Oct 13:45 by the PM. FZ2, AU23, AU24, INT2, P31 and P32 landed. AU24-1 is real: the PM confirmed `FM.canvasGestureLive` is still undefined in the builder's CURRENT step-1.3 tree (r10, `editor-mode.js:82`), and it went to the builder before its ship. Same proof rules. Keep your turn alive; push as you go; never push to main; never force-push. In order:
- AU25 Your AU24 read `980-phase1-r3` (7 Oct). Find the builder's NEWEST pushed step-1.3 tip on the remote (ls-remote for 980-*; the newest r-number; or main itself once v17.36 is live, ~5pm) and re-audit it the same way, on a copy. Say which AU24 findings still apply. Then read what AU24 left: the cog block's own code, and the live-session switch (DESIGN §6.7). Also add the pinch case and the stuck-gesture recovery (`FM._resetVpPointers`) to your AU24-1 fix. → hunt/audit-simple-13 (new commits).
- AU26 The next-largest js files no AU has read (continue AU23's list), with repros red on main. → hunt/audit-unread-2.
- FZ3  The product gap FZ2 found: duplicate comment ids order differently on the host and the guest. Design the smallest fix (a deterministic tie-break, or refusing a duplicate id) and prove it: red on main, green with the fix, 1280+380, mutation-caught, seeds 1–150 still green. → hunt/fuzz-seeds (new commits).
- P33  Plans for the 5 oldest open items after P32's, callers traced. → plans/helper-33.
- P34  Plans for the next 5 after P33's. → plans/helper-34.
- INT3 When main moves to v17.36 (the live label reads v17.36), rebuild the integration on it, adding audit-simple-13 and audit-unread-2, and update landing-order.md. → hunt/audit-integrated-4.
