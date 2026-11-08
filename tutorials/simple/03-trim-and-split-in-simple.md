# Trim and split in Simple

You'll be able to cut a clip in two, make a piece shorter, delete a piece, and undo.

Before you start: a project in Simple with one clip in it (tutorials 01 and 02). <!-- shots/03-03.jpg -->

1. Tap empty space in the timeline so nothing is selected, then slide the timeline sideways with one finger until the line in the middle (the playhead) is where you want to cut. The counter shows the time. <!-- walked: a 160 px slide moved the playhead 2.23 s; shots/03-04.jpg -->
2. Tap the **scissors** left of the counter. The clip becomes two clips, and the right-hand piece is selected. <!-- index.html:536 #btn-sm-split "Split at the line"; js/editor-mode.js:294-295; js/spine-edit.js:574 planSplit, :919 split; walked 0 to 2.23 s and 2.23 to 6 s; shots/03-05.jpg -->
3. To make the selected piece shorter, drag one of the white handles at its ends (the grips) in towards the middle. The tip above your finger shows the new length; let go when it is right. The piece shortens, and every clip after it slides left to close the gap. <!-- #1243 S25: Length left the tray ("you just grab the end and drag it"); js/simple-timeline.js drawGrips / renderTrim. Read only, not walked yet -->
4. A grip that is flat and grey, with a small arrow pointing into the clip, means the footage ends there: it pulls in, but not out. Pull it out anyway and it springs back, and the tip says "End of the footage". <!-- #1243 S26; js/simple-timeline.js drawGrips (.sm-grip-end), renderTrim. Read only -->
5. A very short piece still has grips: they sit just outside its two ends. You can also pinch the timeline to zoom in first. <!-- #1243 S25: .sm-grip-out. Read only -->
6. On a computer, **A** and **D** trim the selected piece at the line, and **Alt+←** / **Alt+→** move it one place along the row. <!-- js/editor-mode.js. Read only -->
7. To remove a piece, select it and tap the **trash** at the right end. Later clips close up the gap. <!-- js/spine-edit.js:386 planDelete; walked: 2 clips became 1 clip, "1 clip · 0:02"; shots/03-10.jpg -->
8. Changed your mind? Tap the **curved arrow** right of the counter (Undo). The piece comes back where it was. <!-- index.html:562 #btn-undo; walked: both pieces back, 2.23 + 1.5 s; shots/03-11.jpg -->

Tip: to move a piece along the row, hold it for a moment, then drag it where you want it (tutorial 11). <!-- #1243 S24: Move earlier / Move later left the tray -->

If it doesn't work: With nothing selected the scissors cut the clip under the line. If the line is outside the clip, or too close to its edge, nothing is cut. <!-- js/editor-mode.js:295 "…or the main clip under the playhead when nothing is selected"; js/spine-edit.js:581-582 refuses splitOff and splitEdge (Read only, not walked); js/simple-tools.js:249-251 -->

## Verification
| step | what I did | what happened | file:line |
|---|---|---|---|
| 1 | dragged 160 px | FM.time 2.23 | — |
| 2 | scissors | layers: clip 0 to 2.23, clip 2.23 to 6.0 | js/spine-edit.js:574 |
| 3 | (v18.29: Length, typed 1.5, Enter: second piece 3.77 s to 1.5 s; Length is gone since #1243 S25, the grip drag is not walked yet) | — | js/simple-timeline.js renderTrim |
| 7 | Delete | 1 clip left, "1 clip · 0:02" | js/spine-edit.js:386 |
| 8 | Undo | 2 clips back | — |
| 4-6 | not walked | Read only | js/simple-timeline.js drawGrips |
