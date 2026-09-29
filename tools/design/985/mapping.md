# #985 — where every export setting lives in A, B and C

His words (29 Sep): *"the export menus settings are honestly a bit daunting for someone who doesnt know how it works. I dont want to lose any function but i want it to actually make sense at first glance. Capcut does a really good job of this but dont fully copy"*

This file makes "don't lose any function" checkable. Each row is one thing today's export does (the 34-item inventory, with the code location), and says where it ends up in each redesign. **Every row has a home in all three. Nothing is dropped.**

- **Same** means no change: same control, same wording, same behaviour.
- *(not drawn)* means the place is decided but that state is not in the sheets.
- Sheets: `985-compare.jpg`, `985-now.jpg`, `985-A.jpg` (recommended), `985-B.jpg`, `985-C.jpg`. The prototype is `985-proto.js`.

## Getting to the card, and what comes before it

| # | Today | A · What you'll get (recommended) | B · Pick a goal | C · Sliders + size |
|---|---|---|---|---|
| 1 | **Export** button in the PC top bar (index.html:332) | Same. Opens the new card | Same | Same |
| 2 | Green arrow in the phone top bar (index.html:395) | Same | Same | Same |
| 3 | Home ⋯ → "Export video…" (home.js:1485) | Same | Same | Same |
| 4 | The preview pauses when the card opens (app.js:5584) | Same | Same | Same |
| 5 | "Exporting is turned off" for a friend in a shared project (app.js:5588) | Same, shown before the card | Same | Same |
| 6 | "Before you export" reminders card from Notes (notepad.js:203) | Same, shown before the card | Same | Same |
| 7 | "N clips still arriving / not downloaded" (collab-media.js:1290) | Same, shown before the card | Same | Same |
| 8 | Export marks: Mark export start / end / clear, and the `[` `]` keys (app.js:6981, 7864, 8827) | The buttons and keys are the same. What they set is the **Part** row's "**Between your marks** · 0:06". This replaces "Loop region (if set)", which never matched the buttons' name. With no marks it is greyed and says "set with [ and ]" | The buttons and keys are the same. They feed the always-visible **Part** row → "Between your marks" | The buttons and keys are the same. They feed **More › Part → "Your marks 0:06"** |

## The card itself

| # | Today | A · What you'll get (recommended) | B · Pick a goal | C · Sliders + size |
|---|---|---|---|---|
| 9 | Title "Export" | Replaced by the summary: a picture of the current frame, **"You'll get · Video · 0:24"** and "1080×1920 · 30 fps · about 34 MB" | "**What are you making?**" plus the project name and length | The big "**about 34 MB**" readout, with the length, size and fps under it |
| 10 | Amber "This export will have no sound…" warning when this browser cannot make AAC (app.js:5717) | An amber strip just above the Export button *(not drawn: it only shows on a browser without AAC)* | On the Best quality and Smaller to send tiles, and above Export *(not drawn)* | An amber line under the size readout *(not drawn)* |
| 11 | **Format** dropdown: MP4 / GIF / PNG frames (ZIP) / This frame (PNG) / WAV / M4A. Remembered | **"What to make"** buttons: **Video** (MP4) · **GIF** · **Picture** (this frame) · **Sound** · **Frames** (PNG ZIP). WAV or M4A: the "Sound file" row that appears when Sound is picked, and More options › Sound file type. Still remembered | Tiles: **Best quality** and **Smaller to send** (both MP4) · **GIF** · **Picture** · **Sound only** · **Frame by frame**. WAV or M4A: Fine-tune › Sound file. Remembers the last tile | The **Video / GIF / Picture / Sound / Frames** switch. WAV or M4A: a two-way switch that replaces the sliders when Sound is picked *(not drawn)* |
| 12 | **Resolution**: Same as project, then the smaller rungs only, each with its pixels | The **Size** row. It opens in place as a list: every rung with its pixels, a plain hint ("sharp on any phone") and **its own file size**, with **Recommended** on "Same as project" | Set by the tile: Best = project size, Smaller to send = one rung down. The exact choice is Fine-tune › Size | The **Sharpness** slider. Its stops are this project's own rungs, with ★ on "Project" |
| 13 | Custom size W×H boxes (16–7680, fitted in, never cropped) | The last item in the Size list, "**Exact size…** any width × height, fitted in, never cropped". Also in More options › Exact size | The last item in Fine-tune › Size, "Exact size…" | **Exact numbers › Size** W×H |
| 14 | **Frame rate**: Same as project / 15 / 25 / 30 / 50 / 60 / 120 / Custom | The **Smoothness** row ("30 fps · same as project"), which opens the same way as Size | Set by the tile (the project's rate). The exact choice is Fine-tune › Smoothness | The **Smoothness** slider, with ★ on the project's rate. It also adds a **24** stop (today 24 is only reachable through Custom) |
| 15 | Custom fps box (1–120) | The last item in the Smoothness list, "Exact fps…". Also in More options › Exact fps | The last item in Fine-tune › Smoothness, "Exact fps…" | **Exact numbers › Frame rate** |
| 16 | **Quality** High / Medium / Low (MP4 only). Remembered | The **Quality** row, e.g. "Best · about 34 MB". Its list shows each choice with its size. MP4 only; still remembered | Built into the tile: Best = High, Smaller to send = Medium. The exact choice is Fine-tune › Quality, each with its size | The **Quality ↔ file size** slider: Smallest / Balanced / ★ Best |
| 17 | **Range**: Whole project / Loop region (if set) / Selected clip only. Kept for the session | The **Part** row: "Whole video 0:24" / "Between your marks 0:06" / "Selected clip 0:03". Each shows its length, and Selected clip is greyed when nothing is selected | The **Part** row, always visible, with the same three choices | **More › Part**: three buttons, each with its length |
| 18 | **Export just this layer** (All layers, or one layer; a group includes its children) | **More options › Only one layer**. When it is set, More options says "**1 on**", the picker turns amber, and "**Only the 'Title' layer**" shows in amber under the summary, so it is never silent | **Fine-tune › Only one layer**. Fine-tune then says "N changed" and the tile says "Custom" | **More › Only one layer**. More says "**1 on**" and an amber "Only the 'Title' layer" sits under the size |
| 19 | **Transparent background** (GIF and PNG frames only) | Its own row, "**See-through background**", when GIF or Frames is picked. Also in More options with the reason ("a video can't hold it") | **Fine-tune › See-through background**. The research also puts a tick on the GIF and Frame by frame tiles *(not drawn)* | **More › See-through background**. The research also puts a switch under the switch bar for GIF / Frames *(not drawn)* |
| 20 | GIF note: capped at 640 px, 50 fps, 256 colours | One line under the buttons when GIF is picked: "…so this one comes out 360×640". The Size row says "Biggest a GIF allows · 360×640" | The GIF tile's own lines: "360×640 · loops · size shown when done" | Slider stops above 640 px and 50 fps are greyed, with the note under them *(not drawn)* |
| 21 | Audio formats hide Resolution, Frame rate, both Custom rows and Transparent | Picking **Sound** hides Size, Smoothness and Quality. The preview picture becomes a sound icon | Picking **Sound only** hides the picture controls in Fine-tune | Picking **Sound** hides the three sliders |
| 22 | **Cancel**, Esc, or pressing Export again | A **✕** in the corner, Esc, a tap outside, or pressing Export again | Same as A | Same as A |
| 23 | Export button whose label follows the format ("Export MP4", "Save frame"…) | One big button that also carries the result: "**Export video · about 34 MB**", "Export GIF", "Export sound · about 4.6 MB" | "**Export — Best quality · about 34 MB**", or "Export — Custom · about 68 MB" | "**Export video**". The size is in the pinned readout above |
| 24 | What it remembers: format and quality persist; size, fps and layer reset each open; range lasts the session | Same rules. The research suggests saying Part's session memory out loud, or resetting it like the others | Same rules. The last tile stands in for format + quality | Same rules |
| 25 | The card pops out of the Export button; Cancel/Export stay on screen on a small phone | Same pop. The Export button stays pinned at the bottom while the card scrolls | Same as A | Same as A, and the switch and the size readout stay pinned at the **top** as well |

## After you press Export: unchanged in all three

| # | Today | A | B | C |
|---|---|---|---|---|
| 26 | "Exporting" progress screen with status, a % bar and Cancel | Same | Same | Same |
| 27 | The amber progress note (why there is no sound, "picked up where it stopped") | Same | Same | Same |
| 28 | "Done — saved to your Downloads." (GIF / frames); the "Audio exported" toast | Same | Same | Same |
| 29 | The Export ready card for MP4: picture, size · length · W×H · fps · Sound ✓, then Save / Discard | Same. The new card's summary now matches it *before* the render as well as after | Same | Same |
| 30 | The screen is kept awake while rendering | Same | Same | Same |
| 31 | "Leaving loses the render" warning | Same | Same | Same |
| 32 | Crash-resume (picks up an interrupted render) | Same | Same | Same |

## Things that have no control today

| # | Today | A | B | C |
|---|---|---|---|---|
| 33 | Fixed choices with no control: H.264, AAC 160 kb/s 48 kHz, a key frame every 2 s, the 80 Mb/s cap, even sizes, the file named after the project, 16-bit WAV | **More options › Technical details**, read-only: "H.264 video, AAC sound at 160 kb/s 48 kHz, a key frame every 2 s, file named 'Beach trip'" | **Fine-tune › Technical details**, read-only | **More › Technical details**, read-only |
| 34 | Refusals and errors ("Add some media first", "Select a clip first", no WebCodecs, PNG sequence too big, audio toasts…) | Same wording. "No region marked — press [ and ]" is mostly headed off earlier, because "Between your marks" is greyed with that hint before you can pick it. The toast stays as a fallback | Same | Same |

## How the file sizes are worked out (so they are not guesses)

Every "about N MB" in the sheets uses the exporter's own sum (app.js:6116): **width × height × fps × quality factor** (High 0.18 / Medium 0.1 / Low 0.05), capped at 80 Mb/s, plus 160 kb/s of sound, times the length.

- 1080×1920 at 30 fps, High, 24 s: 11.2 Mb/s works out at **about 34 MB**.
- 720p at High: **about 15 MB**.
- 720p at Medium (B's "Smaller to send"): **about 8.8 MB**.
- WAV is 192 KB a second: 24 s is **about 4.6 MB**.
- GIF and PNG frames cannot be predicted honestly, so they say "size shown when done".

## Small fixes to fold in with whichever is picked

1. Rename "Loop region (if set)" to match the export-marks buttons. All three concepts use "Between your marks" or "Your marks".
2. Either say out loud that Part is remembered for the session, or reset it on open like Size and fps.
3. Optionally add a 24 fps stop. Only C draws one, but A's Smoothness list could take it too.
4. Only MP4 gets the Export ready card. GIF, frames and audio download straight away. That could be unified later; nothing here changes it.
