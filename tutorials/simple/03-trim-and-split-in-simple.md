# Trim and split in Simple

You'll be able to cut a clip in two, make a piece shorter, delete a piece, and undo.

Before you start: a project in Simple with one clip in it (tutorials 01 and 02). <!-- shots/03-03.jpg -->

1. Tap empty space in the timeline so nothing is selected, then slide the timeline sideways with one finger until the line in the middle (the playhead) is where you want to cut. The counter shows the time. <!-- walked: a 160 px slide moved the playhead 2.23 s; shots/03-04.jpg -->
2. Tap the **scissors** left of the counter. The clip becomes two clips, and the right-hand piece is selected. <!-- index.html:536 #btn-sm-split "Split at the line"; js/editor-mode.js:294-295; js/spine-edit.js:574 planSplit, :919 split; walked 0 to 2.23 s and 2.23 to 6 s; shots/03-05.jpg -->
3. To make the selected piece shorter, tap **Length**. A row appears: **Done**, **End**, **−1 frame**, a number, **+1 frame**. The number is the piece's length in seconds. <!-- js/simple-tools.js:239-263 lengthRow; shots/03-06.jpg -->
4. Tap the number, type a new length (say 1.5), then press Enter on the keyboard (on an iPhone's number pad, tap Done or tap elsewhere). The piece shortens, and every clip after it slides left to close the gap. <!-- js/simple-tools.js:249-258 commit on Enter or blur; walked 3.77 s to 1.5 s; shots/03-07.jpg, 03-08.jpg -->
5. **−1 frame** and **+1 frame** nudge the length one frame at a time. **End** switches to **Start**: then the same buttons and number trim the front of the piece instead. <!-- js/simple-tools.js:243-244 lenEdge toggle, :245 step -->
6. Tap **Done** to get the normal tools back. <!-- js/simple-tools.js:242 back; shots/03-09.jpg -->
7. To remove a piece, select it and tap the **trash** at the right end. Later clips close up the gap. <!-- js/spine-edit.js:386 planDelete; walked: 2 clips became 1 clip, "1 clip · 0:02"; shots/03-10.jpg -->
8. Changed your mind? Tap the **curved arrow** right of the counter (Undo). The piece comes back where it was. <!-- index.html:562 #btn-undo; walked: both pieces back, 2.23 + 1.5 s; shots/03-11.jpg -->

Tip: **Move earlier** and **Move later** move the selected piece one place along the row. <!-- js/simple-tools.js:208-209 S.cmd.move(id, ±1); Read only, not walked -->

If it doesn't work: With nothing selected the scissors cut the clip under the line. If the line is outside the clip, or too close to its edge, nothing is cut. If the number does nothing, press Enter (or tap away) after typing. <!-- js/editor-mode.js:295 "…or the main clip under the playhead when nothing is selected"; js/spine-edit.js:581-582 refuses splitOff and splitEdge (Read only, not walked); js/simple-tools.js:249-251 -->

## Verification
| step | what I did | what happened | file:line |
|---|---|---|---|
| 1 | dragged 160 px | FM.time 2.23 | — |
| 2 | scissors | layers: clip 0 to 2.23, clip 2.23 to 6.0 | js/spine-edit.js:574 |
| 4 | Length, typed 1.5, Enter | second piece 3.77 s to 1.5 s | js/simple-tools.js:249-258 |
| 7 | Delete | 1 clip left, "1 clip · 0:02" | js/spine-edit.js:386 |
| 8 | Undo | 2 clips back | — |
| 5, "Start" | not walked | Read only | js/simple-tools.js:243 |
