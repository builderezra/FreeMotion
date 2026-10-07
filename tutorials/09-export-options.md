# Export your video: MP4, GIF, a still, or just the sound

You'll be able to pick a format, a size and a frame rate, and save the result.

1. If you see a single timeline row with an edit panel under it, tap the back arrow at the top left **once** to deselect. (With nothing selected, that arrow goes Home.)
2. Tap the up-arrow button at the top right. The **Export** box opens.
3. In **Format**, choose one: **MP4 video**, **Animated GIF**, **PNG frames (ZIP)**, **This frame (PNG)**, **Audio only (WAV)** or **Audio only (M4A)**.
4. **Resolution** starts at "Same as project". Pick a smaller size for a smaller file.
5. **Frame rate** starts at "Same as project". Pick a lower number for a smaller file.
6. For MP4 only, **Quality** is High, Medium or Low.
7. **Range** is Whole project or Loop region (if set). **Selected clip only** stays greyed out on a phone, because the Export button only shows when nothing is selected. To export one layer by itself, tap **Export just this layer** and pick it. (On a computer, select the clip first and the option works.)
8. The big button changes with your choice: **Export MP4**, **Export GIF**, **Export frames**, **Save frame** or **Export audio**. Tap it.
9. For MP4 a card says **Export ready**. Tap **Save** and your phone's share sheet opens so you can pick where it goes (if it can't open, the file goes to Downloads). The other formats skip the card and download straight to your Downloads. <!-- not walked: MP4 export freezes the tab in this container (no H.264 encoder) -->

On a computer: Export is the up-arrow third from the right end of the row with the time counter. The back arrow there leaves the project, so don't use it to deselect. Click an empty spot in the timeline instead. <!-- not walked: the walk was the 380 px phone layout only -->

Tip: **This frame (PNG)** saves the picture at the playhead, so slide to the frame you want first.

If it doesn't work: A GIF is capped at 640 pixels on its longest side (a tall phone video comes out 360 × 640), 50 frames per second and 256 colours. The box tells you so when you pick it.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1 back arrow rule | styles.css:4214 | yes |
| 2 phone Export button | index.html:395 | yes |
| 2 dialog title Export | index.html:845 | yes |
| 3 format list | index.html:851 | yes |
| 3 Animated GIF / PNG frames / This frame | index.html:852 | yes |
| 3 Audio only (WAV) | index.html:860 | yes |
| 3 Audio only (M4A) | index.html:870 | yes |
| 4 Resolution: Same as project | js/app.js:5682 | yes |
| 5 Frame rate: Same as project | index.html:891 | yes |
| 6 Quality only for MP4 | js/app.js:5881 | yes |
| 6 High / Medium / Low | index.html:929 | yes |
| 7 Range options | index.html:936 | yes |
| 7 Selected clip only needs a selection | js/app.js:5708 | yes |
| 8 button text per format | js/app.js:5895 | yes |
| 9 Export ready card only for MP4 | js/app.js:6193 | yes |
| Tip: This frame uses the playhead | js/app.js:4246 | yes |
| If: GIF caps | index.html:955 | yes |
| PC: Export third from the right of the row | js/app.js:7737 | yes |
| PC: back arrow leaves the project | js/app.js:6909 | yes |
| 7 Selected clip only greyed on phone | js/app.js:5707-5708, styles.css:4214, 4234, js/mobile.js:365, js/storage.js:2537, js/app.js:5828-5836 | yes |
| 9 only MP4 uses the share sheet | js/exporter.js:66-75, 1730, 1800, js/app.js:6001, 4288, 6199-6200 | yes |
| GIF cap is the longest side | js/exporter.js:1673-1678, index.html:955 | yes |
