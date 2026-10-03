# Orbit keeps its facing when a reverse move stops

Starting commit: `e49009c262f3dd3096321ad52f64a30f59dd0a62` (local `chatgpt/690-orbit-speed` branch). This follow-up is on local branch `chatgpt/690-orbit-face-stop` in `/private/tmp/freemotion-orbit-face-stop-20261004`; nothing was pushed or deployed.

`REQUESTS.md:13324` records Orbit's “face direction” control, and `REQUESTS.md:27383-27388` asks for continuing bug and effect polish. The nearby `audits/912-audit.json:996` Orbit finding concerns trimming at a cut, not the stopped-facing behavior here.

With Face direction of travel on, give Orbit Speed two linear keyframes: `-0.5 rev/s` at 3 s and `0` at 5 s. At 5 s the rider turns 180° because `js/compositor.js:13808` previously treated zero as forward. Its position now stays put because the preceding Orbit-rate fix integrates Speed, making this facing flip visible. A normal user reaches it only when keyframing a reverse orbit to a full stop with Face direction on; a static Speed or Face off does not take this path.

`js/compositor.js:13808-13835` now looks back through the keyframe intervals, including recent loop passes, when an animated Speed is exactly zero. It keeps the last nonzero travel sign while stopped. Static Speed retains its original facing behavior. `index.html:1069` bumps the compositor cache tag from 209 to 210. `tests/tests.js:114603` adds one focused regression tagged `TBD` for reverse and forward stops and the static zero case.

Checks run: the actual Orbit canvas function, loaded with `js/scene.js` and `js/compositor.js` in JavaScriptCore, kept the reverse-facing tangent before, at, and one second after the stop; forward and static-zero controls passed. JavaScriptCore syntax checks passed for both changed JavaScript files, and `git diff --check` passed. The automated browser harness and a real iPhone visual check were not run in this isolated clone.
