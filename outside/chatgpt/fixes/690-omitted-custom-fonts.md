# Shared files warn when custom fonts are missing

Starting commit: `0f8ec39b8243405debcbeed06b1880ae79c5b2c4` (`chatgpt/690-continuation`). Local change only; nothing pushed.

Read: A custom font can be imported with no size ceiling, but `embedFonts` silently omitted any used font over 4 MiB. Project and template files then rendered text with a fallback on another device while claiming a clean save. The same 4 MiB limit also applied to whole-library backups, whose purpose is to carry all referenced data. #343 explicitly says shared template files carry their custom fonts.

Changed: `js/storage.js` records omitted fonts by name and reason in shared files, warns on export and import, and embeds fonts without the sharing limit in whole-library backups. Backups record a font that is genuinely missing or unreadable in `notIncluded.fonts`. `js/home.js` and `js/settings.js` display these omissions for template and backup downloads. `tests/tests.js` adds one `{ item: 'TBD' }` regression covering an over-limit font, a small-font control, project save/import warnings and uncapped whole backup. `index.html` bumps all three changed script tags.

Ran: The new focused browser regression and existing #888 clean/oversized project-file regression passed (1/1 each). JavaScript syntax and `git diff --check` passed. The test uses controlled font-file records to exercise export; an actual large font on an iPhone remains unverified.
