# Home closes its project actions menu on editor entry

Starting commit: `5e8337da08e2179a6407566e18b99d5aecf909df` on local `chatgpt/690-continuation`.

When a project’s ⋯ menu was open, activating another card with Enter opened the editor without an outside pointer event. `js/home.js` hid Home, while `js/contextmenu.js` kept the body-level menu visible over the editor. This keyboard route is distinct from the earlier Escape/menu and moving-timeline-menu records in `REQUESTS.md`.

`js/home.js` now hides any context menu at the Home-close seam. `tests/tests.js` has one focused `{ item: 'TBD' }` regression that opens one card’s menu and enters another card by keyboard. `index.html` bumps the Home script tag from 199 to 200.

The focused desktop browser regression passed 1/1. JavaScriptCore syntax and `git diff --check` passed. Screen-reader keyboard behavior on an installed device remains unverified. No push or shared checkout edit.
