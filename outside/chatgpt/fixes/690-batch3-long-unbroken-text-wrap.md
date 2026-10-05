# Batch 3: long unbroken text stays responsive

Starting commit: `2edb050f43ea6354172ca31a2c8eb643fbe4e7c2` (`codex/690-batch3-mask-undo`).

The text compositor measured the entire unplaced suffix and then walked one character at a time for every wrapped line. A 30,000-character word could stall editing or import. Wrapping now grows a candidate prefix and binary-searches the exact old cut point without repeatedly measuring the remaining word.

Changed files: `js/compositor.js`, `index.html` (compositor cache 378), `tests/tests.js` (one `TBD` regression comparing old/new output and a measured-character budget).

Checks: focused production-function comparison matched the prior algorithm for ASCII, CJK, mixed, spaces, and overlong words across four widths. A 30,000-character run measured 286,316 characters, below the 1,200,000-character regression budget. Changed-JS syntax and `git diff --check` passed. Browser regression remains pending while the Claude ship lock exists; this branch is not promoted to the preferred checkpoint until it passes.
