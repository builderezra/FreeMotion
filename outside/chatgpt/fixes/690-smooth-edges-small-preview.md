# Smooth Edges remains visible on small preview plates

Starting commit: `5dcfed170283d4eb83b4f3436e212a7d38f32ca8`.

Smooth Edges declares Softness in project pixels (`js/compositor.js:444`). The renderer scales that value to the preview plate, but the kernel rounded a positive value below half a plate pixel to zero and skipped the effect. For example, Softness 1 at quarter scale disappeared in preview while the full-resolution export still feathered the edge. The kernel now preserves the smallest representable one-pixel blur for any positive Softness; zero remains off. This is #690 effect polish. Existing `REQUESTS.md:5472` describes Smooth Edges controls, but does not record this preview behavior.

Changed: `js/compositor.js`, its cache tag in `index.html`, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report.

Checks run: JavaScriptCore production dispatch probe at quarter scale showed neighboring alpha 85 for Softness 1 and unchanged output for Softness 0; JavaScriptCore syntax parsing and `git diff --check` passed. Actual iPhone preview appearance remains UNVERIFIED. At very low plate resolution, a one-pixel minimum cannot perfectly represent a subpixel feather.
