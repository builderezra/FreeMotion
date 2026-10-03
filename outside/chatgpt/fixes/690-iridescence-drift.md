# Iridescence Drift holds its traveled colour

Starting commit: `c4f51b7f02a34ad188f9331c0931a03b04a114dd`. Local branch: `chatgpt/690-iridescence-rate` in `/private/tmp/freemotion-iridescence-rate-20261004`. No push or deployment.

**I read:** `REQUESTS.md:27377-27396` keeps #690 open for finding bugs and improving effects; `REQUESTS.md:32459-32461` records the analogous #913 weather-rate rewind and says to integrate the rate over time. I searched `audits/*.json`, `REQUESTS.md`, and the existing `outside/chatgpt/fixes/*.md` for an Iridescence Drift finding and found no matching record on this snapshot. Before this fix, `js/compositor.js:8174` used `var iri_ph=iri_sp*t`, so changing Drift from 0.6 to 0 at one second made the sheen snap from its traveled hue to the first-frame hue. This affects users who keyframe the Iridescence Drift control; static instances do not trigger it. Severity: medium; installed-phone frequency is **UNVERIFIED**.

**Changed:** `js/compositor.js` now integrates animated Drift and retains the old multiplication for static values. `index.html` advances the compositor cache tag from 254 to 255. `tests/tests.js` adds one `{ item: 'TBD' }` regression that renders the real pixel kernel: Drift 0.6 for one second, then zero, must hold the reached hue and match an equal-distance static control.

**I ran:** the focused browser regression passed 1/1 after two unrelated pre-test app-frame boot failures under concurrent browser work. JavaScriptCore syntax checks for the changed JS files and `git diff --check` passed. Appearance on an installed iPhone remains **UNVERIFIED**.
