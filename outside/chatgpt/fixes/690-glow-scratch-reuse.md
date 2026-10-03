# Reuse Light Glow and Soft Glow frame buffers

Starting commit: `f1ac5fa87e82db74fac005458729bba4edb5dfca`.

Both glow effects allocated two full-frame `Float32Array` luminance planes on every render. At 1080×1920 that is 16,588,800 temporary bytes per effect invocation. They now share two grow-only planes because effect kernels execute sequentially and fully rewrite the pixels they read. This reduces per-frame allocation and garbage collection pressure under REQUESTS.md #690's effect-polish brief and the later performance request.

Changed: `js/compositor.js`, its `index.html` cache tag, and one focused `tests/tests.js` regression tagged `TBD`.

Checks run: JavaScriptCore production-kernel probe rendered Light Glow, Soft Glow, then Light Glow again, verifying scratch reuse and identical repeat output; JavaScriptCore syntax parsing; `git diff --check`. Actual iPhone frame time and memory improvement remain unverified.
