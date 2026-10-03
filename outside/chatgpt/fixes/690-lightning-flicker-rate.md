# #690 — Lightning Flicker keeps its last bolt when stopped

Starting commit: `c4f51b7f02a34ad188f9331c0931a03b04a114dd`. Local branch: `chatgpt/690-effect-rate-next` in `/private/tmp/freemotion-effect-rate-next-20261004`. Nothing was pushed or deployed.

`REQUESTS.md:27379-27386` gives the standing direction to “find bugs” and “polish and improve the existing effects and filters.” `REQUESTS.md:32459-32461` records the analogous #913 keyframed-rate rewind and says to “Integrate the rate over time.” I checked `audits/*.json`, `REQUESTS.md`, and existing fix reports for a Lightning Flicker keyframe finding; none recorded this case on the starting snapshot. The Lightning-specific requests #320 and #403 concern its look, controls and layer bounds, not a keyed stop.

Lightning's Flicker control is labeled strikes per second, but `js/compositor.js` selected its bolt with the current Flicker value multiplied by all elapsed time. Keyframing Flicker to zero therefore selected the first bolt again. Keyframed Flicker now accumulates its bounded rate before choosing the bolt; plain numeric Flicker retains its old calculation. `tests/tests.js` adds one `{ item: 'TBD' }` regression against the real kernel for both a held stop and a linear slowdown, with constant-rate controls. `index.html` advances the compositor cache tag.

Checks: the new focused browser regression passed, and the existing Lightning controls/defaults regression passed. Two attempts at the latter initially stopped before tests because the app frame missed `renderScene`; a fresh run with a simpler filter URL loaded fully and passed. JavaScript syntax and Git diff checks passed. Physical-device playback remains unverified.
