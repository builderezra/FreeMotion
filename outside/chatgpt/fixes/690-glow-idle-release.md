# Release cached glow frames after rendering stops

Starting commit: `b1ddcfd963fee5c4ad0110696741642d987ec8fb`.

The newly shared glow planes reduced per-frame allocation but could retain a large export-size frame indefinitely after the export ended. The cache now stays warm while frames render and releases its planes five seconds after the last glow render. This keeps the playback benefit without permanently pinning a 4K-size buffer on a phone.

Changed: `js/compositor.js`, its `index.html` cache tag, and one focused `tests/tests.js` regression tagged `TBD`.

Checks run: JavaScriptCore production-kernel probe with a controlled timer, confirming the idle callback releases the planes; JavaScriptCore syntax parsing; `git diff --check`. Actual iPhone memory behavior remains unverified.
