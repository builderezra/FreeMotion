# #690 — Backdrop Clone follows the rendered scene's Timecode

Starting commit: `5bb0638fd6c0eed26d912a4bbc6340a32a0fd06c` on isolated `chatgpt/690-continuation`.

`js/compositor.js:17457` measured Backdrop Clone's text-shaped footprint with `FM.scene` even though `drawCopyBg` receives a `scene` argument. When a template, thumbnail, or effect preview renders a secondary scene at a different FPS, a text layer with Timecode can draw one frame count while its backdrop-shaped footprint uses another. The existing #686 fix ensured it used the transformed string, but the secondary-scene FPS mismatch remained. Severity low: it requires Backdrop Clone on Timecode text in a secondary scene whose FPS differs from the open editor project.

The footprint now passes its rendered `scene` to `FM.applyTextEffects`. Changed `js/compositor.js`, its cache tag in `index.html`, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report. The production Timecode helper returned `00:00:07` at 24 fps and `00:00:18` at 60 fps for the same scene time, showing why the scene choice affects the mask. JavaScriptCore syntax and `git diff --check` passed. The browser regression renders Backdrop Clone over a shape and checks its measured text; executing that browser check and visually comparing a template remain UNVERIFIED.
