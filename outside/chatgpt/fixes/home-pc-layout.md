# Home layout on PC

Starting commit: `6a6db2d50f65498b2ac2dcb5b7e7e66a4211a14e` on isolated branch `chatgpt/690-continuation`.

The phone reference had already moved Settings, the centred wordmark, Search and Profile into the new order. At 1440px on PC, that 135px wordmark, label-only navigation and project text read small against the wide background. The PC layout now uses a 160px wordmark, shows the existing navigation icons beside their labels, and gives the empty message and card text a modest size increase. The four tabs and project cards retain their established 700px shared column, glass top bar and bottom New position. The changes apply above 700px in both light and dark looks; the phone reference layout remains intact.

Changed files: `styles.css` (desktop-scoped presentation), `index.html` (`styles.css` cache tag 751 → 752), and one focused `{ item: 'TBD' }` PC Home regression in `tests/tests.js`.

Read: the existing PC column and glass-header styles, Home markup, and empty-state arrow positioning. Ran: 1440×900 dark empty and light populated browser captures, a focused PC Home check in both looks (1/1 passed), JavaScriptCore syntax parsing, and `git diff --check`. Final captures are saved outside the repository at `../references/home-pc-dark-2026-10-03.png` and `../references/home-pc-light-2026-10-03.png`. Actual installed-app desktop rendering remains UNVERIFIED.
