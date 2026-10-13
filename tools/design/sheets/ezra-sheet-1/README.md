# Ezra's see / hear sheet 1 (14 Oct, laptop helper)

Rendered through the app in the suite's Chrome (headless, 380 px phone width unless noted), in a quiet gap with no ship and no
API builder running. One sheet to look at first: **more-options-sheet.jpg** (1316 × 2628, a 2:1 page).

## 1. More's panel in Simple, 380 px: pick one
- **A — today, and More pressed again closes it** (`optA.png`, hunt/su1-c's build)
- **B — docked under the tools (Recommended)** (`optB.png`, hunt/simple-more-dock): Clips · Text · Sound · Overlay stay
  reachable while the panel is open; the panel gets less room. Its tray row is from that branch's older build (it says
  "Lift off" where A says "Audio") — the tray is not what this option is about.
- **C — full-height while open** (`optC.png`, drawn on hunt/su1-c): the panel takes the tools row, with Done at its top.

## 2. SU1 #15: the tray's scrolling strip (hunt/su1-c)
`tray-before.png` (hunt/su1-on-v17.44) vs `tray-after.png` (hunt/su1-c), both scrolled 120 px. After, the strip ends where
More and Delete begin and fades at both edges (`sm-more-s` / `sm-more-e` are on). **Honest note: at phone size the fade is
barely visible in a still picture** — a few seconds of scrolling it on the phone is the real check.

## 3. Poster Print as it ships vs Colour dots (hunt/fx-b13, his "clouds" photo, 1080 → 720)
`poster-photo.jpg`, `poster-now.jpg`, `poster-colour.jpg`. (The 13 Oct "colour" picture was all black: the PROBE reused an
image element the app had already released — not a Colour-dots bug. Re-rendered with a fresh image per render.)
Question: switch Poster Print's recipe to Colour dots?

## 4. fx-b7 sounds (hunt/fx-b7): `sounds/*.wav`
Telephone's five styles on a voice (`telephone-phone`, `-radio`, `-walkie-talkie`, `-megaphone`, `-old-radio`), Distortion's six
types on music at Drive 50 with Auto level (`distortion-soft`, `-hard-clip`, `-tube`, `-fuzz`, `-rectify`, `-wavefold`), and the
two originals (`voice-original`, `music-original`) to compare against.

## 5. Name / feel calls (one line each)
- **Kaleidoscope Flow (10.3)**: + streams the picture OUT of the centre, − pulls it IN — is + = out the right way round?
- **Find Edges (12.6)**: its colour rows are "Light colour / Dark colour" (not "Line / background", because the Lines switch flips which is the line) — OK?
- **Poster Print (13.1)**: switch its recipe to Colour dots (picture above)?
- **Telephone (7.4)**: the Walkie-talkie squelch (a level gate) isn't built — wanted?
- **Trail Time offset (14.5)**: on a video every copy shows the current frame (a past frame needs a frame cache) — worth building?
- **Audio presets (8.2)**: the preset chips and "Save as my preset" need drawing first (#545); the preset values are not yet heard.
- **Filters tab "On my clip" (15.4)**: how the switch looks, where it sits, and whether a portrait clip's tile stays square.
- **Reset to original look (4.4)**: should it also put back Warmth, Fade, Grain, Vignette, Sharpen, Tonal range, Protect skin and Over-drive (and, for his own saved filter, what he saved)?
- **A saved filter and the bar's Strength**: lands at saved × bar (60 % saved, bar 50 % → 30 %) — or should the bar start at the saved Strength?

## 6. Cog #1132 on a PC: one deviation (no pick needed)
With Friends or the Editor open (the pair hanging upward), App settings sits at the FAR end of the small column and Canvas stays
the tile on the cog's line; the R-COG1 drawing put App at that column's foot under Canvas, which moved Canvas off the cog's line
mid-swap and hung its tail into the App row.

## Also on the sheet
Two quick questions: Undo after a drag returning the playhead too (recommended yes), and what Simple gets next (recommended:
finish the four small rows — a visible Play button, the space under the tools, a simple Export, clip numbers after a split).
