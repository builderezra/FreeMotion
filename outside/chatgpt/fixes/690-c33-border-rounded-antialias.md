# C33: smooth Border Frame's rounded corners

Starting commit: clean preferred `12c480e6fd0e50cfff3eae7d0804a8e22e3b7d17`; isolated branch `codex/690-c33-border-aa` in `/private/tmp/freemotion-c33-border-aa-20261004`. The open #690 polish brief is at `REQUESTS.md:27375-27399`; C33 in `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1377` names Border Frame's binary rounded corners. No matching `audits/*.json` record names this C33 finding. The separate 12.5 dashed/dotted/draw-on plan remains open.

Rounded Border Frame corners now use one-pixel coverage at the outer and inner arcs, including on transparent footage, where source-over blending keeps their colour from darkening. A new Smooth corners On/Off control defaults On; Off retains the original binary contour. A square frame retains the old fast path and exact output. The corner remains bounded to its own layer box.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 277→278), `tests/tests.js` (one focused `{ item: 'TBD' }` regression for both arcs, transparent colour, Off and square controls), and this report. The new browser regression and the existing inset/round/opacity Border Frame check each passed 1/1. JavaScriptCore syntax and `git diff --check` passed. Installed-phone appearance remains unverified. No protected-file or shared-Claude edit, push, PR or deployment.
