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

