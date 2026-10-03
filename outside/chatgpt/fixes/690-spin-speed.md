# Spin Speed keyframes retain accumulated rotation

- Starting main commit: `f771657683ae61e4aff657e4beab8fac248e8dfe`.
- Local branch: `chatgpt/690-spin-speed` in `/private/tmp/freemotion-spin-20261004`.
- Scope: `REQUESTS.md:27375-27387` records #690's standing effect bug/polish brief. `REQUESTS.md:32459-32461` records the same rate-times-time failure for Weather and Turbulent Displace under #913, but not Spin. The `audits/*.json` Spin hits describe other behavior.

## Change

`js/compositor.js:13689,13698`: Spin read keyframed Speed at the current time and multiplied it by all elapsed clip time. A Speed ramp from 90°/s at 0 seconds to 0°/s at 1 second therefore turned only 22.5° at the midpoint and rewound to 0° at the end. The animated path now integrates Speed over Spin's effect-clock interval `[t - tl, t]`, ending at 45° and holding there. The static path keeps its original Speed × elapsed-time arithmetic.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 208 → 209), `tests/tests.js` (one `{ item: 'TBD' }` visual regression), and this report.

## Checks

- Focused JavaScriptCore call of the actual Spin kernel with Speed 90→0: measured 33.75° at 0.5 s, 45° at 1 s, and 45° at 2 s; unkeyframed 90°/s remained 90° at 1 s.
- JavaScriptCore syntax passed for changed JavaScript files; `git diff --check` passed.
- The canvas regression was added but not run in a browser while another isolated browser check was active. Device behavior remains unverified.

No push, PR, deployment, or shared-checkout edit.
