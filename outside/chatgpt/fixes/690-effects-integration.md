# #690 — Integrated local effect fixes

Starting commit: `f771657683ae61e4aff657e4beab8fac248e8dfe` (`main`). Local branch: `chatgpt/690-effects-integrated` in `/private/tmp/freemotion-effects-integrated-20261004`.

This branch combines seven independently reviewed effect fixes: Chunk Noise, Electric Edges, Fractal Ridges, Spin and Orbit now accumulate keyframed rates; an Orbit travelling backwards keeps its facing when it stops; and Smooth Bevel keeps shallow Depth settings distinct on reduced previews. Each fix has its own report and one `{ item: 'TBD' }` regression in this branch. No other app feature was added.

Changed app files: `js/compositor.js` and its `index.html` cache tag, advanced from 208 to 213 while combining branches. `tests/tests.js` includes all seven focused regressions. The two tests appended at the file end were retained when their individual commits conflicted; the compositor cache tag was advanced as later commits landed. The individual fix reports are also included under `outside/chatgpt/fixes/`.

Checks run: all seven focused regressions passed together in headless Chrome (`Regression 7/7`); JavaScriptCore parsed the combined compositor and test files; `git diff f7716576..HEAD --check` passed. Installed-iPhone appearance and a full app suite were not checked.

Local only; nothing was pushed, deployed or written to Claude's shared checkout.
