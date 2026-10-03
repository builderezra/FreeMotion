# Reuse Dark Glow frame buffers

Starting commit: `a5d76ea7e069bb377e548944ddbdd198fd1532c9`.

Dark Glow still allocated two full-frame `Float32Array` planes per render, another 16,588,800 temporary bytes at 1080×1920. It now uses the shared glow scratch planes. Its sparse dark-pass plane is explicitly cleared before each frame, so an earlier Light/Soft Glow cannot leave a stale pattern. This extends the #690 effect-render allocation improvement.

Changed: `js/compositor.js`, its `index.html` cache tag, and one focused `tests/tests.js` regression tagged `TBD`.

Checks run: JavaScriptCore production-kernel probe alternated Dark Glow, Light Glow, then Dark Glow, confirming plane reuse, actual darkening and identical repeat output; JavaScriptCore syntax parsing; `git diff --check`. Actual iPhone frame-time and memory gains remain unverified.
