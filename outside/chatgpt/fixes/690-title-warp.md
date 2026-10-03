# B40 Title Warp — local build report

Starting commit: `3e591a412519df24fea75c067050cf5e970a3a8f` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (ten warp shapes and visible-bounds support in the warp driver), `js/fx-registry.js` (Distortion listing), `index.html` (script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Title Warp bends the rendered title or other layer around its own alpha bounds rather than the whole project frame. Shape choices are Arc, Arch, Bulge, Flag, Wave, Fish, Rise, Inflate, Squeeze and Twist, with Bend and Wave phase controls. Only this effect requests an exact alpha-bounds scan; its source pixels are reused for the warp, so the driver does not read the plate twice. Zero Bend maps every pixel to itself.

Read: B40 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1253`, #690 at `REQUESTS.md:27376-27403`, and the current warp driver and text-effect paths in `js/compositor.js`.

Ran: JavaScriptCore parsed the changed scripts and test source. One focused production-kernel probe confirmed all ten shapes produce distinct, finite geometry and Zero Bend is an identity; `git diff --check` passed. The saved browser regression also checks that the driver passes a small layer's actual bounds to the kernel, but browser rendering, text-edge quality and phone performance remain unverified.
