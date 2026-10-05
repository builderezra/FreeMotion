# Follow-up for the panorama import fix

Starting commit: `f3109105d0789db2ddb4ac62f612005fe6a5f572` on isolated `codex/690-fixfor-panorama`. This follows verified fix `3170a94c` for batch2 §1b.2 / #1014.

The focused `{ item: 'TBD' }` regression now imports both reported panorama sizes into a temporary project, waits for the autosave, calls the real `FM.storage.load()`, and checks that the reopened canvas dimensions and complete layer transform match the saved version. It removes the earlier simulation through `_clampProjectDims` and the claim that every oversized long-side project is a legacy import. The app comment now describes both older auto-sized projects and deliberate custom sizes accurately.

Changed: `tests/tests.js`, `js/app.js` (comment), `index.html` (app cache 477→478).

Node syntax and diff checks passed. Browser verification remains pending: two focused muted Chromium attempts with the ship lock absent could not bootstrap the app frame (`FM.makeLayer`, `FM.renderScene`, `FM.scene` and other core APIs missing). The regression never reached its assertions, so this is not a product verdict. No further browser retry was started; temporary mute-driver edit was restored.

Local only; no shared Claude checkout edit, push, PR or deployment.
