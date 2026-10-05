# Panorama import keeps its canvas on reopen (batch2 VERIFIED §1b.2)

- **Starting commit:** clean `codex/690-reviewed-local` at `f25e15d3ad8bbd455955fac2637c453e0400f9ce`; implemented in isolated `codex/690-batch2-panorama`.
- **Source checked:** batch2 `VERIFIED.md` §1b item 2, exact #1014 in `REQUESTS.md`, and `audits/*.json` panorama matches. The existing #937 audit concerns chosen canvas sizes, a separate first-import issue already handled in the preferred branch.
- **Change:** `js/app.js` now fits an auto-sized first import within both the 2160 short-side limit and storage's 7680 per-side limit, preserving aspect ratio; the oversized-project warning also recognizes legacy panoramas over 7680 on the long side. `index.html` bumps the app script cache tag to 477. One `TBD` regression in `tests/tests.js` imports 16000×4000 and 9000×2000 panoramas, applies the storage reopen bound, and checks stable dimensions, centring and fit.
- **Checks:** New Chromium regression failed before on 8640×2160 and passed after. The adjacent normal first-import cap test passed. Node syntax and `git diff --check` passed. A first adjacent run did not initialize the browser renderer; the retry passed.
- **Limit:** The test applies the real storage dimension clamp to the imported canvas rather than writing a large fake image blob to IndexedDB. It directly covers the reshape and centring boundary identified in the finding.

No shared Claude checkout, protected queue/log file, `tools/` file, push, PR, deployment or release was changed.
