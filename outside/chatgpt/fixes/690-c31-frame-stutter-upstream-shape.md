#690 / C31 — Frame Stutter holds a shape's upstream grade after a cold seek

Starting commit: `a08764295ec87f3741d67fddcfb13d1ceb9f2b25` on the clean Codex-only preferred checkpoint. This increment lives on isolated `codex/690-c31-complex`; it has not been released.

The #690 standing brief in `REQUESTS.md:27377-27403` calls for effect fixes; the exact C31 finding in `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1375` says Frame Stutter's held frame depends on playback history. There is no separate C31 cold-seek record in `audits/*.json`. On the starting commit, a moving shape with a keyed Brightness effect before Frame Stutter held the first graded picture during continuous playback, but a cold seek to 0.2 s showed the current picture. The focused regression failed 0/1 on that baseline.

The boundary redraw now accepts one Frame Stutter on a non-media shape when its preceding effects are source-local and history-free. It redraws that upstream prefix at the held quantum boundary, including keyed grades, then uses the existing stateless hold/trail kernel. Unsafe upstream temporal effects and active later effects still present inside this dispatch retain their previous route. Outer post-process effects are peeled first and continue to wrap the held result normally. The existing single-effect shape path is unchanged.

The main MP4 renderer's crash-resume signature now includes `;c31-shape-upstream-1` whenever the scene has an active shape Frame Stutter. Otherwise an interrupted export made before this redraw could append newly rendered frames to its old history-based prefix. The Worker already excludes shape Frame Stutter, so this marker covers the renderer that actually changes.

Changed files: `js/compositor.js`, `js/exporter.js`, `tests/tests.js` (one focused `{ item: 'TBD' }` regression), `index.html` (compositor cache tag 285 → 286; exporter tag 130 → 131), and this report.

Checks: the new browser regression failed 0/1 before the redraw and passed 1/1 after it; one intervening browser attempt loaded an incomplete app frame before assertions and was retried. After the resume review fix, the extended regression passed 1/1, including a real one-frame MP4 export whose signature carried the shape marker. JavaScriptCore parsed all three changed scripts; `git diff --check` passed. The browser check compares sequential and cold-seek pixels with a moving source and keyed upstream Brightness control. Complex parent/mask and temporal stacks, prepared video boundaries beyond the already integrated increment, and Time Warp Scan remain open C31 work. Installed-phone appearance was not checked.

Integrated into the preferred local branch as `7f1e3a5a` plus resume repair `b28993ca`. The same focused browser regression passed 1/1 there, and changed JavaScript syntax and committed diff checks passed. The branch remains local; no release was made.
