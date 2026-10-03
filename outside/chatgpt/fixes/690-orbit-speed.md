# #690 — Orbit keyframed Speed keeps its angle

Starting commit: `f771657683ae61e4aff657e4beab8fac248e8dfe` (`main`). Local branch: `chatgpt/690-orbit-speed` in `/private/tmp/freemotion-orbit-speed-20261004`.

Orbit previously placed each frame at `speed(now) × clip-local time`. A ramp or stop therefore changed the whole path already travelled, snapping the layer to another angle. A keyframed Speed now integrates revolutions from this clip's effect-clock start. Plain numeric Speed keeps the old calculation, including zero and reverse values. The Start angle and other Orbit controls retain their behavior.

Changed files: `js/compositor.js` (Orbit phase), `tests/tests.js` (one focused `{ item: 'TBD' }` regression with a shifted clip clock, a stop, and a static-speed control), and `index.html` (compositor cache tag 208 → 209).

Checks: JavaScriptCore parsed the changed JavaScript files; the focused regression passed against the loaded scene and compositor code in JavaScriptCore; `git diff --check` passed. Browser and installed-iPhone rendering were not run in this job.

Face direction of travel still uses the instantaneous Speed sign. At exactly zero it chooses the forward tangent, as before, so an Orbit that was moving in reverse may visibly turn when it stops even though its position now holds. That orientation choice is separate from the path-phase fix.

Local only; no push, PR, deployment, or shared-checkout edit.
