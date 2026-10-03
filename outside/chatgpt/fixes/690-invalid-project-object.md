# Refuse malformed project canvas before import

Starting commit: `52843cc22f732670e2bc54a5ae2be7666467d98a`.

`sceneFileProblem` accepted `.fmotion.json` files whose `project` field was a string or array. `importObject` then created a project before `applyScene` tried to use those invalid canvas settings, leaving a junk project. This is a regression in the intent of REQUESTS.md #673. Import validation and direct `applyScene` now reject those shapes before project creation, while preserving the existing missing-settings error.

Changed: `js/storage.js`, its `index.html` cache tag, and one focused `tests/tests.js` regression tagged `TBD`.

Checks run: JavaScriptCore behavioral check for string/array project rejection before `create`, preservation of the missing-settings message, syntax parsing of both changed JavaScript files, and `git diff --check`. A browser file-import check remains unverified.
