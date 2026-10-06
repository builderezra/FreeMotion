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

