# #1180 — the timeline-F logo (Ezra's "Edit Grid" pick), saved so it can't be lost

His request (22 Oct): an F built from timeline pieces, from the "04 EDIT GRID" image he circled, then a loading-screen animation where the layers build the logo. **He picks; nothing is built into the app until he does** ("wait for me to decide").

- **Live canvas, where he looks and comments:** https://claude.ai/artifact/4ot9bNBsNL6HCv6Nei8QN7 (private to his account).
- **`icons/`:** all 44 options as 1024×1024 app-icon PNGs (sent to him in chat on 22 Oct for his home screen). `make_icons.py` re-renders them with PIL and numpy: `python3 make_icons.py` (all) or `python3 make_icons.py B2 D5` (some).
- **`canvas/`:** the canvas's artboard sources as last published by the PM (`.dc.html`), so the designs survive even without the artifact.

The options:
- **01–12** — first takes: Edit Grid, Spine (recommended for icon size), Tracks, Split, Keyframes, Clip colours, Trim, Waveform, Outline, Knockout, Motion trail, App icon.
- **A1–A8** — his exact shape in greys and metals.
- **B1–B8** — teal (#29d9bb, the app's --accent). B2 (teal glowing playhead) is the PM's pick.
- **C1–C8** — colour grades.
- **D1–D8** — one gradient across the whole F. D5 ("played" in teal) is the wildcard.

**His first animation ask:** D2 (Light from above). Four loop drafts are on the canvas: 1 Snap in, 2 Record, 3 Light falls, 4 Stack. They are SVG/SMIL, so no video and no memory cost: the shipped splash should be CSS/SVG, not an mp4 (see #1096).
