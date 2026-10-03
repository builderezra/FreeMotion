# #690 — Recover malformed project dimensions

Starting commit: `dd2220fea82367db61b63d176e4f7388447c6780` on isolated `chatgpt/690-continuation`.

The project load/import clamp treated a malformed width or height as zero and then clamped it to 16px. An imported file with otherwise usable layers could therefore open as an almost invisible canvas. An object with unusable conversion methods could throw before the project was repaired. Invalid dimensions now fall back to 1080×1920, while valid numeric dimensions and the existing bounds remain intact. FPS and duration use the same type-safe numeric read so malformed objects cannot throw during this clamp.

Changed `js/storage.js`, its cache tag in `index.html`, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report. JavaScriptCore ran the production clamp with malformed text and objects, yielding 1080×1920 at 30 fps, and retained valid 1279→1280×720 at 48 fps. Script syntax and `git diff --check` passed. Browser import/open and visual recovery remain UNVERIFIED.
