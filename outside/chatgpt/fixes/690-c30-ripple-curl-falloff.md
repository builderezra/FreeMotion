# 690 C30 — Ripple and Curl falloff

Starting commit: `b986fcc49be700a6c76df371760025cfcf2525f2` (`codex/690-reviewed-local`).

Ripple and Curl now expose Falloff and Radius. Falloff applies the planned exponential attenuation as distance from the centre grows; Radius smoothly tapers displacement to zero at its boundary. Their zero defaults retain saved-project behavior. Wave, Ripple and Curl also gain Wave speed, with keyframed rates integrated over time so an easing speed change does not jump phase. The CPU mappings and shader uniforms use the same controls.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 344), `tests/tests.js` (one `TBD` regression).

Checks: focused C30 Chromium regression passed (1/1), including CPU falloff/radius, keyed speed and the Ripple GPU path; existing Curl reference and Wave byte-identity regressions each passed (1/1). JavaScript syntax and `git diff --check` passed.

This is a local implementation checkpoint only. No push, PR, or deployment.
