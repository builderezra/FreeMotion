# #690 — Clouds Drift keeps its traveled pattern

Starting commit: `f2702ab662e3eaf76e7ca615a6b889e89bc37370`. Local branch: `chatgpt/690-clouds-drift` in `/private/tmp/freemotion-clouds-drift-20261004`. Nothing was pushed or deployed.

`REQUESTS.md:27379-27386` gives the standing direction to “find bugs” and “polish and improve the existing effects and filters.” `REQUESTS.md:32459-32461` records the analogous #913 Snow/Rain/Boil keyframed-rate rewind and says to “Integrate the rate over time.” I searched `audits/*.json` and existing fix reports for a Clouds-specific Drift finding and found none on this starting snapshot.

Clouds previously used its current Drift value multiplied by all elapsed time. Keyframing Drift to zero snapped its noise field back to the first frame. `js/compositor.js` now integrates animated Drift with the existing motion-clock helper, while numeric Drift retains the old calculation and appearance. `tests/tests.js` adds one `{ item: 'TBD' }` regression using the real Clouds kernel: a 40 px/s hold followed by zero must stay at the traveled position and match a constant-rate control. `index.html` advances the compositor cache tag.

Checks: the new focused browser regression passed; the existing reduced-preview/export Clouds regression passed. JavaScript syntax and Git diff checks passed. Physical-device playback remains unverified.
