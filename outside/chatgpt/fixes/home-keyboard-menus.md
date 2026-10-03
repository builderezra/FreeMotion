# Keyboard access to Home menus

Starting commit: `25cba3afabc7c36587234c364196fd64c16487ad` on the isolated `chatgpt/home-ui-release` branch.

Read: `js/contextmenu.js` builds action rows as click-only `<div>` elements. The new Home layout moves Join and Select into these menus, so those actions could not be reached by keyboard or announced as menu items.

Changed: `js/contextmenu.js` gives menus and enabled actions roles and names, moves focus into the menu, supports arrow/Home/End navigation and Enter/Space activation, and returns focus to the opener on Escape or action. Leaving the menu by Tab or pointer dismisses it. `styles.css` shows keyboard focus in dark and light looks. `index.html` advances both changed asset tags. One `{ item: 'TBD' }` regression in `tests/tests.js` covers profile Join and project Select from keyboard focus.

Ran: JavaScriptCore syntax parsing and `git diff --check` passed. The new focused browser regression passed at 390×844 and 1280×900; the existing Home phone-reference and portrait choose/remove/race regressions also passed with the repository's robust local server. The old generic menu-toggle test needs a selected layer for its second trigger; run alone on an empty scene, it fails before reaching that control. A direct browser sequence with a selected rectangle confirmed same-trigger toggle and different-trigger opening. Full desktop and phone suites are enforced by `tools/ship.sh` before publication; installed-iPhone keyboard or screen-reader behavior remains unverified.

Release-gate follow-up: the existing #967 real-touch Join test caught that a touch on a menu item could move focus to the page and hide the menu before the browser sent its click. `js/contextmenu.js` now keeps the menu mounted for that in-menu touch gesture, so the action runs and then closes it. `tests/tests.js` checks the profile-menu route with a real touch rather than the removed header Join button; `index.html` advances the context-menu cache tag. The focused #967 test and the 11 changed-test before/after proof passed. Installed-iPhone touch behavior remains unverified.

The first full desktop release pass exposed stale assertions for the former header Select, 58px New button, previous arrow angle, and “tap Join” copy. Those checks now exercise the card and profile menus and the approved 48px disc and arrow; all seven affected tests pass together at 1280px and 380px. The separate collaboration replay timeout is recorded as intermittent in `audits/937-hunt.json` and passed in isolation here; no collaboration engine code was changed.
