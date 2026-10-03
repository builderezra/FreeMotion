# Warn when embedded media fails to restore

Starting commit: `a4de41833aefd278bcc2fc96f3c6f415d0e2e95e`.

REQUESTS.md #888 added an import warning for footage omitted from a `.fmotion.json`, but a present media entry with a corrupt or non-data payload still produced a blank layer without a warning. Import now records which embedded files actually loaded and names every video or image layer whose footage did not return. Valid restored footage remains excluded from the warning.

Changed: `js/storage.js`, its `index.html` cache tag, and one focused `tests/tests.js` regression tagged `TBD`.

Checks run: JavaScriptCore production import probe with an invalid embedded image payload, confirming its layer is named in the warning; JavaScriptCore syntax parsing; `git diff --check`. Browser/iPhone import behavior remains unverified.
