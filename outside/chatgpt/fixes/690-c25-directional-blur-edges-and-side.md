# #690 / C25 — Directional Blur frame edges and smear side

Starting commit: `57c45e049ab7e83b929671f54d6d773abeb5b255` on the clean local `codex/690-reviewed-local` checkpoint. Isolated branch: `codex/690-c25-directional-edges`.

The 29 September #690 effect plan (§14.3/C25) says Directional Blur's current taps fade a full-frame clip at its boundary and asks for repeat-edge pixels and Both/Behind/Ahead controls. `REQUESTS.md` #690 is the standing polish brief. No matching C25 finding appears in `audits/*.json`; the raw C25 hit is an unrelated agent identifier. Existing #986 C22/C24 bugs were already marked shipped and were skipped.

Changed files: `js/compositor.js` (two optional controls and a clamped boundary plate for Repeat), `index.html` (compositor cache 308), `tests/tests.js` (one `TBD` focused regression), and this report. The saved Both/Fade path stays byte-identical. Repeat copies each real boundary pixel, including transparent ones, before averaging the existing taps; Behind/Ahead use the same tap count on one side of the original.

Checks: the new regression passed in native Chromium, comparing full-frame edge opacity against the centre, checking one-sided smear, and checking saved/default byte identity. The prior #904 Directional Blur quality regression passed alongside it (2/2). JavaScriptCore syntax and `git diff --check` passed. This covers the Directional Blur half of C25; Gaussian Blur edge parity remains open. The 15 reviewed shapes remain local and unreleased; the original-font design gate remains open.
