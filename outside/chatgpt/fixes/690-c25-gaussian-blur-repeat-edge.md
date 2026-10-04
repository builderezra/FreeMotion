# #690 / C25 — Gaussian Blur repeat-edge control

Starting commit: `1db725a622ab318c0208607ebad2c227be1ac911` on the clean preferred `codex/690-reviewed-local` checkpoint. Isolated branch: `codex/690-c25-gaussian-repeat`.

The exact #690 standing brief and C25/§15.7 plan were checked. C25 says desktop Gaussian Blur fades a full-frame clip at its edge while the phone GPU fallback clamps. No `audits/*.json` record reports this finding; the raw C25 match is an unrelated agent ID. The Directional Blur half was already fixed at the starting commit.

Changed files: `js/compositor.js`, `index.html` (compositor cache 309), `tests/tests.js` (one focused `TBD` regression), and this report. Gaussian Blur now offers Frame edges → Repeat edge pixels. Only that non-default instance moves to an ordered plate pass. It extends the source's actual boundary pixels before blurring, using the native canvas filter when available, the GPU fallback when that filter is unavailable, and a CPU fallback if both are unavailable. Saved or explicit Fade stays on the previous CSS path and is byte-identical. The plate pass respects position among post effects; the other CSS effects retain their existing behavior.

Checks: the new native Chromium regression passed, including full-frame opaque edge preservation, forced no-canvas-filter fallback, actual layer rendering, and saved/default Fade byte identity. The prior C25 Directional Blur regression passed alongside it (2/2). JavaScriptCore syntax and `git diff --check` passed. C25's edge parity is now covered in both blur effects; Gaussian Horizontal/Vertical, Mix and blend options from §15.7 remain open. Fonts remain held for design quality; reviewed shapes are still local and unreleased.
