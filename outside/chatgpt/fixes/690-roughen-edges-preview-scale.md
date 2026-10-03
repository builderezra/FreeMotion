# Roughen Edges uses the same pattern scale in preview and export

Starting commit: `1e36d1d96e7dbaae440e8132ddf49e768ac638bd`.

Roughen Edges exposes Amount and Scale in project pixels (`js/compositor.js:861`). The generic dispatcher scaled both for a smaller preview, then its kernel clamped Scale back to a two-*plate*-pixel minimum. At 25% preview, a 2 project-pixel pattern became 0.5 plate px and was forced to 2, making the preview pattern four times too large. The kernel now clamps project-pixel controls first and scales the bounded values by the plate scale, as Stroke Colour does. Existing `REQUESTS.md:32469` describes the analogous Honeycomb issue, but Roughen Edges was not included there.

Changed: `js/compositor.js`, its cache tag in `index.html`, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report.

Checks run: JavaScriptCore production dispatch and direct-kernel paths matched all 4,096 fixture bytes at 25% scale; the same fixture differed at 448 bytes before the fix, so the regression detects the bug. JavaScriptCore syntax and `git diff --check` passed. Real iPhone preview appearance remains UNVERIFIED.
