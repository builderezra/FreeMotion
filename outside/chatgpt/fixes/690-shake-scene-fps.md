# #690 — Shake smear uses the rendered scene's frame rate

Starting commit: `fd8ffcbbb4901965ed2e6d4f6287b02c26fd32d1` on isolated `chatgpt/690-continuation`.

`js/compositor.js:15016` read `FM.scene.project.fps` to place Shake's trailing ghosts. The compositor accepts a separate `scene`, and project thumbnails and effect previews render such scenes (`js/storage.js:2216`, `js/fx-thumbs.js:120`). If that scene had a different frame rate from the open editor project, its smear length was sampled using the wrong frame interval. This is a low-severity visual mismatch limited to Shake with Smear enabled in secondary-scene renders; normal active-project rendering already had matching frame rates.

The kernel now reads the frame rate of the `scene` it is drawing. Changed `js/compositor.js`, its cache tag in `index.html`, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report. At the same time `t=0.31`, the production Shake kernel drew one stamp for a 60 fps scene and four stamps for a 24 fps scene, independent of the editor's active project. The regression checks that distinction. JavaScriptCore syntax, this focused kernel probe and `git diff --check` passed. A real thumbnail/browser visual comparison remains UNVERIFIED.
