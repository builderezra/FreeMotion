# #690 hard Wipe endpoints

Starting commit: `ffb3742e4c70943b589844ae9bf89907377f33c5` on `chatgpt/690-all-local`.

## I read this

`REQUESTS.md:32169` records the Wipe/Radial Wipe endpoint promise: "progress 0/1 still nothing/everything". In `js/compositor.js:8570,8580`, the hard-edge branches cleared pixels only when projected progress was `>` the chosen Progress. At zero, an exact-zero projection survived: a full first column for default Wipe and a centre-to-right ray for default Radial Wipe. The existing endpoint regression at `tests/tests.js:74132-74150` covered only positive Softness. I found no matching repair in `audits/*.json` or `outside/chatgpt/fixes/*.md` at this starting snapshot.

## Changed

- `js/compositor.js`: clear alpha at Progress 0 and return the untouched frame at Progress 1 before either wipe branch. Intermediate progress keeps the prior mask.
- `tests/tests.js`: one focused `{ item: 'TBD' }` regression for both kernels, with omitted and explicit zero Softness, at both endpoints.
- `index.html`: bump compositor cache tag from `v=256` to `v=257`.

## I ran this

- Focused new browser regression: 1/1 passed before expanding it to cover omitted Softness. The expanded test did not run: two browser retries stopped while booting the app iframe (missing `FM.makeLayer`, `FM.newScene`, and other core globals). This is a harness-load failure, not a regression result; the expanded browser case is UNVERIFIED.
- Existing #904 Wipe/Radial Wipe softness browser regression: 1/1 passed.
- Direct JavaScriptCore run of the real compositor kernels after the expanded test edit: all six endpoint combinations passed (both wipe types, Softness omitted/0/12; zero visible pixels at Progress 0 and all 4,800 pixels visible at Progress 1).
- JavaScriptCore syntax parse of changed JavaScript and `git diff --check`: passed.

The endpoint fix changes saved hard-edge wipes at exactly Progress 0 from a visible sliver to fully hidden, as requested. No export video was rendered; export visual parity is UNVERIFIED.
