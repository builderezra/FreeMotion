# Template files name clips they cannot carry

Starting commit: `faa53a1c9319bbc79bf92062a895036b190630bc`.

Home → Templates → ⋯ → Save template file could silently omit media over 6 MiB while saying the template was saved and ready to send. The recipient then opened a project with blank media layers. `REQUESTS.md:9374` records the template-file feature, while the later project-file omission fix at `REQUESTS.md:31445` covered the separate project exporter. The template exporter now uses the same `serializeWith` path as a project file, so omitted clip names travel in the JSON and return to Home. Home states clearly when a saved template is incomplete, naming up to two missing files.

Changed: `js/storage.js`, `js/home.js`, their `index.html` cache tags, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report.

Checks run: JavaScriptCore executed the production template exporter with a 6 MiB+1 clip and confirmed the filename in both the returned omissions and saved JSON, with no media blob claimed; JavaScriptCore syntax parsing and `git diff --check` passed. Browser download and recipient import remain UNVERIFIED.
