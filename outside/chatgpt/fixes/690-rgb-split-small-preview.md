# RGB Split retains small and green-only shifts

Starting commit: `2e5e0cf0da7f6c8b0af0872df1006c7f0d61add2` (`chatgpt/690-continuation`). Local change only; nothing pushed.

Read: In `js/compositor.js`, the per-layer RGB Split returned early whenever Amount rounded to zero, even when Green shift was nonzero. The adjustment-layer path likewise skipped all work at Amount zero. On a quarter-size preview, a positive 1-project-pixel Amount also rounded to zero while the full-size export drew it. This is independent of the already closed #691 scale and #934 zoom findings; #690 authorizes effect bug polish.

Changed: `js/compositor.js` now lets Green shift operate independently, includes its sampled alpha in the per-layer fringe, and preserves a positive Amount as at least one preview-plate pixel. Zero Amount plus zero Green shift remains a no-op. `tests/tests.js` adds one focused `{ item: 'TBD' }` regression covering adjustment and per-layer paths. `index.html` bumps the compositor cache tag.

Ran: The new reduced-preview regression and existing #691 adjustment scaling regression each passed (1/1). JavaScript syntax and `git diff --check` passed. The minimum one-plate-pixel approximation can look stronger than a 1-project-pixel shift at very low preview resolution; actual iPhone appearance is unverified.
