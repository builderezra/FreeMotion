# Linear Streaks keeps short trails in reduced preview

Starting commit: `e987e4f330444c9a59459a4fab9940ed5b79cc9f`.

Linear Streaks declares Length in project pixels (`js/compositor.js:615`), and the renderer scales it for smaller preview plates. A positive 3 px length became 0.75 plate px at quarter resolution, but the kernel returned for every length below 1, so the preview lost a trail that export rendered. It now returns only for a zero length. Existing `REQUESTS.md:32104` covers its Quality control, not this preview behavior; #690 authorizes effect polish.

Changed: `js/compositor.js`, its cache tag in `index.html`, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report.

Checks run: JavaScriptCore production dispatch probe gave adjacent red 42 for Length 3 at quarter scale and unchanged pixels for Length 0; JavaScriptCore syntax and `git diff --check` passed. Actual iPhone visual appearance remains UNVERIFIED.
