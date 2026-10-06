# Add captions and time them to speech

You'll be able to add timed words to your video, one caption at a time.

1. If you see a single timeline row with an edit panel under it, tap the back arrow at the top left **once** to deselect. (With nothing selected it goes Home.) Then tap the row that says "Tap to add a layer".
2. Tap the **Elements** tab, then **Captions**. If you can't see it, swipe the tiles sideways.
3. A caption layer spans the whole project. The text editor opens on the first caption with its words selected. Type yours.
4. Under the bar at the top is a small strip: **‹**, a count like 1/2, **›** and **+**. Tap **›** to reach the next caption and type it. Tap **+** to add a new caption after this one.
5. Tap the tick at the far right of the bar.
6. To retime, select the caption layer, open **Customise Text**, tap **Aa**, and scroll to the **Captions** list. Each caption shows its words, a **Start (s)** and **End (s)** number you can type, a **↔** grip, and **✕** to remove it. Drag **↔** to make the caption longer or shorter.
7. **+ Add cue at playhead** adds a caption where the playhead is.
8. Tick **Caption background** for a box behind the words.

On a computer: click an empty spot in the timeline so nothing is selected. The Add panel is at the bottom left.

Tip: **🎙 Detect speech**, at the top of that captions list, finds where someone talks and lays down empty captions at those times, on your device. You still type the words: it does not write them for you.

If it doesn't work: Detect speech is greyed out until the project has a video or audio clip to listen to.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1 add row says Tap to add a layer | js/timeline.js:2795 | yes |
| 1 solo row hides the add row | js/timeline.js:3966 | yes |
| 2 Captions tile in Elements | js/addmenu.js:176 | yes |
| 2 tiles are paged (swipe) | js/addmenu.js:1335 | yes |
| 3 caption layer spans the project and opens the editor | js/app.js:3480 | yes |
| 3 editor opens with the words selected | js/app.js:3503 | yes |
| 4 cue strip: previous / next / new cue | js/text-edit.js:911 | yes |
| 4 count label | js/text-edit.js:201 | yes |
| 6 Aa lists the captions | js/inspector.js:5756 | yes |
| 6 Start (s) / End (s) boxes | js/captions.js:367 | yes |
| 6 drag to lengthen or shorten (moves the end) | js/captions.js:400 | yes |
| 6 remove | js/captions.js:450 | yes |
| 7 + Add cue at playhead | js/captions.js:463 | yes |
| 8 Caption background | js/inspector.js:5757 | yes |
| Tip: Detect speech lays down EMPTY cues | js/captions.js:506 | yes |
| If: disabled without a clip | js/captions.js:507 | yes |
| PC: back arrow leaves the project | js/app.js:6904 | yes |
