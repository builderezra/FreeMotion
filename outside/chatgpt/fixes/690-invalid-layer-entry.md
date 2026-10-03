# Refuse invalid layer entries before creating an imported project

Starting commit: `9cd5923cfb083345a8b3768d37ebb8d3c600d231`.

A `.fmotion.json` with `layers: [null]` passed file validation. Import then created a new project before layer re-identification threw while reading `l.id`. Null, primitive and array entries now receive a clear invalid-layer error before project creation; direct `applyScene` refuses them too. This follows the no-junk-project intent of REQUESTS.md #673.

Changed: `js/storage.js`, its `index.html` cache tag, and one focused `tests/tests.js` regression tagged `TBD`.

Checks run: JavaScriptCore production-code probe for null, number and array entries, checking validation and both import routes before `create`; JavaScriptCore syntax parsing; `git diff --check`. Browser file import remains unverified.
