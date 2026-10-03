# Missing source media in project and template files

Starting commit: `07baced98a9c0bafc6e093bcc354f8b17542885f` (`chatgpt/690-continuation`). Local change only; nothing pushed.

Read: The project/template serializer in `js/storage.js` silently skipped a video or image layer when its source file was already absent. It then presented a clean save. An imported copy had a blank layer. The existing import warning also described every omission as too large, including a source that was never stored. The existing #888 regression used an invalid 64-byte PNG, which made its import control fail for a reason unrelated to the serializer.

Changed: `js/storage.js` records absent video/image sources in the exported `omitted` list and names them accurately on save and import. `js/home.js` gives the same distinction for a template file. `tests/tests.js` adds one focused `{ item: 'TBD' }` regression for the absent-source export/import path and gives the #888 control a decodable 1-pixel PNG. `index.html` bumps the storage and Home script cache tags.

Ran: Focused browser regressions for the new missing-source path and existing #888 oversized/clean path each passed (1/1). JavaScript syntax and `git diff --check` passed. This does not restore a source file that has already been lost; users must re-import or replace it. Real device storage eviction was not reproduced.
