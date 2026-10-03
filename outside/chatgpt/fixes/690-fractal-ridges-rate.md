# Fractal Ridges holds keyframed motion where it stops

Starting commit: `f771657683ae61e4aff657e4beab8fac248e8dfe` on a new isolated `chatgpt/690-fractal-ridges-rate` clone. Nothing was pushed or applied to the shared checkout.

Fractal Ridges treated Speed, Drift X and Drift Y as current rate × elapsed time. Keyframing any of them to zero therefore returned its texture to the first-frame position instead of holding where it had travelled. Animated rates now use the existing `FM.integrateProp` motion clock; plain rates still use the original multiplication, and both paths retain the kernel's non-finite-to-zero fallback. This follows the analogous confirmed #913 rate finding at `REQUESTS.md:32459-32461`, under the standing #690 effect-polish brief at `REQUESTS.md:27375-27403`. Fractal Ridges itself was requested to move at `REQUESTS.md:10750-10751`.

Changed: `js/compositor.js`, its cache tag in `index.html`, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report.

Checks: a focused JavaScriptCore probe ran the production kernel from before and after the change. For linear 2→0 Speed and ±200→0 Drift ramps, the old output differed from the correct constant-average-rate frame by 41.266, 36.354 and 42.867 mean colour levels; the fixed output differed by 0.000, held after stopping, and the three static-rate renders remained byte-identical. JavaScriptCore syntax and `git diff --check` passed. Browser and installed-iPhone appearance remain unverified.
