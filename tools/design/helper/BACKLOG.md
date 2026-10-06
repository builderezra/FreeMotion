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
