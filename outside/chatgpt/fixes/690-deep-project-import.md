# Reject deeply nested project files before creating a project

Starting commit: `e808c3c2efd71b49458e9a91d20b95e600145173`.

A `.fmotion.json` with a layer nested thousands of objects deep passed import validation, then layer cloning threw after `importObject` had already created a new project. A bounded iterative check now refuses project and layer data nested beyond 64 object levels before creation. Direct `applyScene` uses the same guard. Ordinary animated layers remain valid. This extends REQUESTS.md #673's no-junk-project behavior and #690's ongoing bug brief.

Changed: `js/storage.js`, its `index.html` cache tag, and one focused `tests/tests.js` regression tagged `TBD`.

Checks run: JavaScriptCore production-code probe of a 10,000-level layer and an ordinary keyframed layer, confirming rejection before `create`; JavaScriptCore syntax parsing; `git diff --check`. Browser file import remains unverified.
