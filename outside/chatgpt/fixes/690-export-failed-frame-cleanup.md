# Export: close a frame when encoding fails

Starting commit: `57a745ea7d32bc1e06a75ce3dd3e09f0e5fb5ca0` (`codex/690-mobile-help-removal`).

An MP4 export whose video encoder throws during `encode()` left that frame open. The encode call now closes its `VideoFrame` on both success and failure; the existing outer cleanup closes the encoder. This completes the reopened #671 failure path logged as #1011.

Changed files: `js/exporter.js`, `index.html` (exporter cache 189), `tests/tests.js` (one `TBD` third-frame failure regression).

Checks: focused production-block Node check passed success and throw paths; changed-JS syntax and `git diff --check` passed. Browser export regression remains pending under the Claude ship lock; this branch is not promoted to the preferred checkpoint until it passes.
