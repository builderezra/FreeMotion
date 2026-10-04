# #690 / C23 — Dark Glow past transparent edges

Starting commit: `cb07f39dda4030763e53daea22b72509f784d42e` (`codex/690-reviewed-local`).

The C23 plan says Light, Soft, and Dark Glow all stop at a shape's alpha edge. Current Light Glow and Soft Glow already spread into transparent pixels, so repeating that work would change saved looks. Dark Glow was the remaining exception: its blurred dark plane only darkened existing opaque pixels. An optional **Glow past edges** switch now lets that plane paint a black alpha halo outside dark shapes. Off is the default and follows the unchanged legacy path.

Changed files: `js/compositor.js` (control and Dark Glow output), `index.html` (compositor cache 307), `tests/tests.js` (one `TBD` regression), and this report.

Checks: the new native Chromium regression confirms a black halo three pixels outside a dark shape, byte-identical missing/Off output, and cropped/full output parity. The existing Dark Glow scratch regression passed alongside it (2/2). JavaScriptCore syntax and `git diff --check` passed. No shared checkout or protected file was edited; this is local and unreleased.

Source checked: `REQUESTS.md` #690 standing brief, `tools/design/plans/2026-09-29-idle-backlog/backlog.md` C23 and §6.2, and `audits/*.json` (no separate C23 finding; the raw `C23` match in `940-hunt.json` is an unrelated ID).
