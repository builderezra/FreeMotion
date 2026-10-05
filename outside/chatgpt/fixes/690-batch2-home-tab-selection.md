# #1026 Home tab selected state

Starting commit: `9307f3e3c1db2f37957c0059f6ccd33e4508a182` on isolated `codex/690-batch2-home-tabs`.

The four Home destination buttons now expose `aria-pressed`. The initial Projects button is true in markup, and each Home render keeps the selected button true and the other three false as the user switches tabs. The visual tab behavior is unchanged.

Changed files: `index.html` (initial attributes and home script cache 203→204), `js/home.js`, `tests/tests.js` (one focused `{ item: 'TBD' }` regression), this report.

Checks: the focused Chromium regression passed after clicking Templates and Projects and checking all four states; Node syntax and diff checks passed. This was one isolated non-collaboration browser run under the ship-time load allowance. The commit remains staged behind #1019/#1020 collaboration checks, outside the preferred reviewed branch.
