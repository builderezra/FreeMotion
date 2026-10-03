# Keep project import usable when an embedded font is corrupt

Starting commit: `b48cb48fb3c0df42fc1c552af5c379e385d5e50e`.

An unreadable font entry in a `.fmotion.json` could reject `dataURLToFile` after the new project and scene were already installed. Import then reported a generic failure even though the project had changed. Embedded-font restoration now skips bad entries, counts font failures, and lets the project import finish with a clear fallback-font warning. It avoids rewriting the font index when no new font was added. This extends REQUESTS.md #673's clear-import-result behavior under the ongoing #690 bug brief.

Changed: `js/storage.js`, its `index.html` cache tag, and one focused `tests/tests.js` regression tagged `TBD`.

Checks run: JavaScriptCore production import probe with an invalid embedded font and a font-index write trap, confirming successful scene import and a fallback warning; JavaScriptCore syntax parsing; `git diff --check`. Browser/iPhone font rendering remains unverified.
