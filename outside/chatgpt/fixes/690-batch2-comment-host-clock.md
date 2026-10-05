# #1030 Host-relative comment times

Starting commit: `3787068ec14053f8994612b5e264994a32570fae` on isolated `codex/690-batch2-comment-clock`.

Guest sessions now estimate the host/local wall-clock difference from a matching ping/pong midpoint. Comment bylines use that estimate for relative time, and a guest's provisional comment/reply timestamp uses the same host clock until the host replaces it. A guest whose device clock is three hours behind should therefore see a newly host-stamped comment as “just now.”

Changed files: `js/collab-session.js`, `js/collab-comments.js`, `index.html` (session cache 15→16, comments 5→6), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), this report.

Checks: focused Node VM check of guest comment age with a three-hour offset passed; changed JavaScript syntax and `git diff --check` passed. The session/visible-byline browser regression is pending until the shared Claude ship lock is absent; no browser or Chromium test ran under the lock.
