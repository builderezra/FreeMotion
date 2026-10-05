# #1031 GIF and PNG-frame export sharing

Starting commit: `ca15b0c043020da89dd2b62aed7227659d865869` on isolated `codex/690-batch2-share-image`.

GIF and PNG-frame exports from the Export dialog now stop on the same ready card as MP4. Save opens the OS share sheet where file sharing is supported, with the actual GIF or ZIP MIME type; unsupported sharing falls back to download. The ready card labels these formats as inherently without sound. Direct exporter calls without a ready callback retain their download behavior. Render resources are released before the card waits for Save or Discard.

Changed files: `js/exporter.js`, `js/app.js`, `index.html` (exporter cache 187→188, app 483→484), `tests/tests.js` (one focused `{ item: 'TBD' }` regression for both formats; an existing custom-size dialog test now presses Save on the card), this report.

Checks: focused production `deliver()` Node check passed for GIF and ZIP sharing with their real MIME types; changed JavaScript syntax and `git diff --check` passed. The ready-card muted Chromium regression passed in the 5 Oct ship gap (part of a 2/3 first run; the only red was #1020's rate-limited fixture).
