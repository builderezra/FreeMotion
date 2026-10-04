# 690 C29 — Card Flip rotation

Starting commit: `b2ce43ae38876b07ab32f703a09dfd194a615e08` (`codex/690-reviewed-local`).

Card Flip now turns from 0–360° about its existing hinge, with perspective and mirror/solid/transparent back options. The saved 180° mirror uses its original drawing path exactly. Other angles use a subdivided quad, so a 90° flip narrows to an edge-on frame.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 343), `tests/tests.js` (one `TBD` regression).

Checks: focused C29 browser regression passed (1/1); adjacent existing Flip Layer hinge/keep regression passed (1/1); JavaScript syntax and `git diff --check` passed.

This is a local implementation checkpoint only. No push, PR, or deployment.
