# Light Home follows the phone layout

Starting commit: `c7763bfd4bbe416872005940bc2bb4167a0e963e` on isolated branch `chatgpt/690-continuation`.

The dark-reference pass had left the light phone Home with the old rounded white header surface. It formed a distinct band above the project list and empty state. The phone-sized light header now uses the page's continuous gradient, while its wordmark and controls retain their light colours and 44px tap targets. Search now keeps its cyan active disc when expanded; the light default disc had previously overruled it.

Changed files: `styles.css` (phone-scoped light header and active Search), `index.html` (`styles.css` cache tag 750 → 751), and one focused `{ item: 'TBD' }` addition to the Home reference check in `tests/tests.js`. Desktop Home styling remains as it was.

Read: the light header rules in `theme-glass.css`, the phone layout and disc rules in `styles.css`, and Search's `.on` state in `js/home.js`. Ran: a settled 390×844 light Home browser capture with 47px/34px safe areas, computed-style checks for transparent header and active Search, the focused Home regression (1/1 passed), JavaScriptCore syntax parsing, and `git diff --check`. The final light preview is saved outside the repo at `../references/home-light-preview-2026-10-03.png`. Actual installed-iPhone rendering remains UNVERIFIED.
