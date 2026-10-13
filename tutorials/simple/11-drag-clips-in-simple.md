# Drag clips and titles in Simple

You'll be able to put clips in a different order by holding and dragging, trim a clip by dragging its ends, and move a title to a different time.

Before you start: a project in Simple with three clips (tutorials 01 to 03). On a phone this uses your finger; with a mouse it works the same, with the button held down. <!-- walked 9 Oct at 380 with real touch events on hunt/simple-transitions (2.5 drags), label v17.24 -->

1. Pinch two fingers together on the timeline until you can see all three clips. <!-- walked: pxPerSec 62.8 to 6.4 after one pinch; shots/11-01.jpg -->
2. Tap the first clip. Two white bars appear, one at each end of it. <!-- walked: sm-grip-head and sm-grip-tail, 24 px wide; shots/11-02.jpg -->
3. Press and hold the first clip for about half a second without moving. It lifts, then drag your finger to the right, over the middle of the second clip. A small label says "Clip 1 moved to 2 of 3". <!-- walked: hold 550 ms then 12 moves; tip "Clip 1 moved to 2 of 3" while the finger was down; shots/11-03.jpg -->
4. Lift your finger. The clips are in the new order and still end to end. <!-- walked: clipB 0+10, clipA 10+10, clipC 20+10; live "Clip 1 moved to 2 of 3"; shots/11-04.jpg -->
5. To trim, tap the middle clip, then press the white bar at its right end and drag it left. A label shows the clip's new length as you drag (6.2 s). <!-- walked: tail grip dragged 24 px left at 6.4 px per second; tip "6.2 s"; shots/11-05.jpg -->
6. Lift your finger. The clip is that long and the clip after it slides up to meet it (the video went from 0:30 to 0:26). The line says "Trimmed Clip 2". <!-- walked: clipB 10+6.2, clipC 16.2+10, project 26.236; shots/11-06.jpg -->
7. To move a title, tap **Text**, type a word, and tap the **tick** at the top right. <!-- walked: Hello typed, tick at (347,28); shots/11-07.jpg -->
8. The title is a small lilac square in the strip above the clips. Press and hold it for half a second, then drag it right. A label shows the time it will start at (7.9 s). <!-- walked: text layer 0+5, hold 550 ms then 10 moves of 5 px; tip "7.9 s"; shots/11-08.jpg -->
9. Lift your finger. The line says "“Hello” now starts at 7.9 s". <!-- walked: live text; shots/11-09.jpg -->

Tip: If a drag was a mistake, tap the undo arrow (↺) by the time counter; one tap undoes the whole drag. <!-- NOT WALKED in this pass: undo of one drag is one step, proven by the suite (simple P2.5 tests), not by hand -->

Tip: A quick swipe along the timeline scrolls it; only a press that stays still for about half a second lifts a clip. <!-- the swipe scrolling was walked (the first swipe on the clip row at 63 px per second trimmed a clip when it began on a grip: start swipes on the empty strip above the clips); the 350 ms threshold is the S3 FINGER test (js/simple-timeline.js), not measured on a phone -->

If it doesn't work: if the clip does not lift, you let go or moved before half a second; press and wait. If you grab the white bar instead of the clip, you are trimming, not reordering: press in the middle of the clip. <!-- the first sentence is Read from the S3 FINGER test; the second was walked by accident (the swipe that trimmed a clip) -->

## Verification
| step | what I did (380 px, real touch, hunt/simple-transitions, v17.24) | what happened | file:line |
|---|---|---|---|
| 1 | pinched | 62.8 to 6.4 px per second | js/simple-timeline.js |
| 2 | tapped clip A | head and tail grip, 24 px | js/simple-timeline.js |
| 3, 4 | hold 550 ms, drag, release | clipA moved to 2 of 3; the clips stay end to end | js/spine-edit.js planReorder |
| 5, 6 | dragged the tail grip 24 px | clipB 6.2 s, clipC slid up | js/spine-edit.js planTrimTail |
| 7 | Text, Hello, tick | a text layer 0+5 | js/spine-edit.js planAddText |
| 8, 9 | hold, drag 50 px | text starts at 7.9 s | js/spine-edit.js planMoveItem |
| undo | not walked | Read only | none |
