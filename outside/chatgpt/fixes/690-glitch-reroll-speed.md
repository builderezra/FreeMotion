# #690 — Glitch Re-roll holds its last tear when Speed stops

Starting commit: `f8c2f757b8b96145a2708456a528c46934a1e349` (`chatgpt/690-all-local`). Local branch: `chatgpt/690-glitch-reroll-speed` in `/private/tmp/freemotion-glitch-reroll-20261004`. Nothing pushed.

**Read:** `REQUESTS.md:27375-27386` keeps #690 open to “go find some bugs, polish the effects”; `REQUESTS.md:13165-13169` includes Glitch speed among the rate controls. In `js/compositor.js:7243-7245`, the tear's hash frame came from `Math.floor(t * speed)`. A linear Re-roll ramp from 8 Hz to 0 therefore rewound the accumulated tear to frame zero at the stop, rather than holding the pattern it had reached. This is a code-path finding; the owner did not report this exact scenario. Search of `audits/*.json` and existing `outside/chatgpt/fixes/*.md` found no earlier Glitch Re-roll stop fix.

**Changed:** `js/compositor.js` integrates keyframed Re-roll rate before selecting the hash frame, while numeric Speed retains its old `t * speed` path and saved look. `tests/tests.js` adds one `{ item: 'TBD' }` regression for a ramp and stop in both tear directions. `index.html` advances the compositor cache tag from 248 to 249.

**Ran:** The focused browser regression passed (`Regression 1/1`). JavaScriptCore parsed both changed JavaScript files, and `git diff --check` passed. Real iPhone playback and appearance remain unverified.
