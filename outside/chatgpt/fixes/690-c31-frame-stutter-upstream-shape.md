#690 / C31 — Frame Stutter holds a shape's upstream grade after a cold seek

Starting commit: `a08764295ec87f3741d67fddcfb13d1ceb9f2b25` on the clean Codex-only preferred checkpoint. This increment lives on isolated `codex/690-c31-complex`; it has not been released.

The #690 standing brief in `REQUESTS.md:27377-27403` calls for effect fixes; the exact C31 finding in `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1375` says Frame Stutter's held frame depends on playback history. There is no separate C31 cold-seek record in `audits/*.json`. On the starting commit, a moving shape with a keyed Brightness effect before Frame Stutter held the first graded picture during continuous playback, but a cold seek to 0.2 s showed the current picture. The focused regression failed 0/1 on that baseline.

The boundary redraw now accepts one Frame Stutter on a non-media shape when its preceding effects are source-local and history-free. It redraws that upstream prefix at the held quantum boundary, including keyed grades, then uses the existing stateless hold/trail kernel. Unsafe upstream temporal effects and active later effects retain their previous route. The existing single-effect shape path is unchanged.

Changed files: `js/compositor.js`, `tests/tests.js` (one focused `{ item: 'TBD' }` regression), `index.html` (compositor cache tag 285 → 286), and this report.

Checks: the new browser regression failed 0/1 before the fix and passed 1/1 after it; one intervening browser attempt loaded an incomplete app frame before assertions and was retried. JavaScriptCore parsed both changed scripts; `git diff --check` passed. The browser check compares sequential and cold-seek pixels with a moving source and keyed upstream Brightness control. Complex parent/mask and temporal stacks, prepared video boundaries beyond the already integrated increment, and Time Warp Scan remain open C31 work. Installed-phone appearance was not checked.
