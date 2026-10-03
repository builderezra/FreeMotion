# B25 Auto-duck music — local build report

Starting commit: `d59b8cfd3f10be4739454ea5a4b70ac2f1583e66` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/auto-duck.js` (new offline speech-to-keyframes tool), `js/inspector.js` (Volume tool controls), `index.html` (new script and inspector cache tag), `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

A music clip can now use a chosen voice clip or any overlapping audible clip as its key. The tool detects speech locally from a low-rate decode, maps findings through trim, reverse and speed ramps to project time, and creates ordinary volume keyframes with 0–30 dB reduction, attack, release and padding. Generate/Update replaces only its own previously generated automation, using the stored original volume as the base. Restore original volume removes that automation. Each generate or restore is a single history commit. The same `FM.layerVolume` keyframes feed preview and export. A keyframe count guard refuses an unusually dense result before changing the project.

Read: B25 recipe at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1217-1225`, existing speech detection and caption source-time mapping, `FM.layerVolume` and the preview/export volume paths. A search of `REQUESTS.md` and `audits/*.json` found no exact B25 implementation or duplicate request on this snapshot.

Ran: JavaScriptCore compiled the changed scripts and `tests/tests.js`; a focused timing/envelope probe mapped trimmed 2× voice at project 4.5–5 s and measured music 0.800 → 0.201 → 0.800; a focused generate/restore probe verified six keyframes and one undo commit per operation. `git diff --check` passed. Browser interaction and audible results on a real project remain unverified. Existing complex volume easing is retained only on unaffected original-key pairs; portions crossed by generated ducking are approximated with linear keys.
