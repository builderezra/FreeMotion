# Export your video: MP4, GIF, a still, or just the sound

You'll be able to pick what to make, see how big the file will be, and save the result.

1. If you see a single timeline row with an edit panel under it, tap the back arrow at the top left **once** to deselect. (With nothing selected, that arrow goes Home.)
2. Tap the up-arrow button at the top right. The Export card opens on what you'll get: a picture of your video, its length, and about how big the file will be.
3. Under What to make, pick one: **Video** (an MP4), **GIF**, **Picture** (the frame under the playhead), **Sound** (just the soundtrack) or **Frames** (every frame as a PNG, in a ZIP).
4. **Size** starts on "Same as project", marked **Recommended**. Tap it to see every smaller size with its own file size, or **Exact size…** to type a width and height.
5. **Smoothness** is the frame rate. It starts on "Same as project". Tap it for 15 to 120 fps, or **Exact fps…** for any rate from 1 to 120.
6. For a video only, **Quality** is **Best**, **Balanced** or **Smallest**, each with its file size.
7. **Part** is the **Whole video**, **Between your marks** (set with the export start and end marks) or the **Selected clip**. A choice that is not set yet is greyed and says how to set it. On a phone **Selected clip** stays greyed, because the Export button only shows when nothing is selected. (On a computer, select the clip first and it works.)
8. Tap **More options** to export **Only one layer**, to turn on **See-through background** (GIF and Frames only), or to read the technical details. It says "1 on" when something in it is set.
9. For Sound, the **Sound file** row picks **WAV** (always works) or **M4A** (about ten times smaller).
10. The big button says what you'll get: **Export video**, **Export GIF**, **Save picture**, **Export sound** or **Export frames**. Tap it.
11. For a video a card says **Export ready**. Tap **Save** and your phone's share sheet opens so you can pick where it goes (if it can't open, the file goes to Downloads). The other kinds skip the card and download straight to your Downloads. <!-- not walked: MP4 export freezes the tab in this container (no H.264 encoder) -->

On a computer: Export is the up-arrow third from the right end of the row with the time counter. The picture and the summary sit on the left of the card, the choices on the right. The back arrow there leaves the project, so don't use it to deselect. Click an empty spot in the timeline instead. <!-- not walked -->

Tip: **Picture** saves the frame at the playhead, so slide to the frame you want first.

If it doesn't work: A GIF is capped at 640 pixels on its longest side (a tall phone video comes out 360 × 640), 50 frames per second and 256 colours. The card tells you so when you pick GIF.

### Verification (rewritten for the #985 Export card, option A, from the code of hunt/985-export — NOT WALKED: no browser was run while it was written)

| Step | File:line | Confirmed |
|---|---|---|
| 1 back arrow rule | styles.css (body.m-editing hides #m-export) | from v17.23's walk |
| 2 phone Export button | index.html #m-export | from v17.23's walk |
| 2 the card opens on the summary | index.html #export-dialog .xa-head, js/export-card.js summary() | code only |
| 3 the five kinds | index.html .xa-kind, js/export-card.js FMT | code only |
| 4 Size list, Recommended, Exact size… | js/export-card.js sizeItems() | code only |
| 5 Smoothness list, Exact fps… | js/export-card.js fpsItems() | code only |
| 6 Quality only for a video | js/export-card.js ROWS, qualityItems() | code only |
| 7 Part, greyed until set | js/export-card.js partItems() | code only |
| 7 Selected clip greyed on a phone | js/app.js showExportDialogNow (clip option disabled with no selection), styles.css body.m-editing hides #m-export | from v17.23's walk (kept by the 16 Oct review; the rewrite had dropped it) |
| 8 More options and "1 on" | index.html #xa-morebody, js/export-card.js more() | code only |
| 9 Sound file WAV / M4A | js/export-card.js soundItems() | code only |
| 10 button text per kind | js/export-card.js goLabel() | code only |
| 11 Export ready card only for MP4 | js/app.js runExport | from v17.23's walk |
| Tip: Picture uses the playhead | js/app.js snapshotPNG | from v17.23's walk |
| If: GIF caps | js/exporter.js runGif, js/export-card.js note() | code only |
