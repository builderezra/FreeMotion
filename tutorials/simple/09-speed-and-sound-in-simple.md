# Change speed and sound in Simple

You'll be able to play a clip faster or slower, turn its sound down, play it backwards, take its sound out as its own bar, and fade music in and out.

Before you start: a project in Simple with two clips (tutorials 01 and 02). <!-- walked 9 Oct at 380 with real touch on hunt/simple-transitions (2.3 to 2.7 on 980-p22-r3), label v17.24; shots/09-01.jpg -->

1. Tap the first clip so it is selected. The row of tools above Clips, Text, Sound and Overlay shows **Length, Audio, Move earlier, Move later, Lift off, Duplicate, Crop, Replace, More, Delete**. Slide the row sideways to reach the ones off the edge. (A picture has no **Audio**.)
2. Tap **Audio**. The row turns into **Done, Speed, Volume, Reverse, Take sound out**.
3. Tap **Speed**. The row turns into **Done, 0.5×, 1×, 1.5×, 2×, 3×**, a slider and the speed (1×).
4. Tap **2×**. The line says "Clip 1 now plays at 2×", the clip's bar gets half as long (10 s becomes 5 s) and the clip after it slides up to meet it (the video goes from 0:20 to 0:15).
5. For a speed in between, drag the slider's dot. It stops at 0.25× on the left and 4× on the right; I dragged it to 1.9× and the line said "Clip 1 now plays at 1.9×".
6. Tap **1×** to go back to normal, then **Done**. That takes you back to the Audio row (**Done, Speed, Volume, Reverse, Take sound out**), not to the clip's tools.
7. Tap **Volume**. The row has **Done**, a slider and a percentage (100%). Drag the slider down. I dragged it to 36% and the line said "Volume 36%". Tap **Done** to come back to the Audio row.
8. Tap **Reverse**. The line says "Playing backwards". Tap it again to play forwards. You stay in the Audio row.
9. Tap **Take sound out**. The line says "Sound taken out · it sits on the clip as its own track", and the tool becomes **Put sound back**. Tap that to merge it again ("Sound back in the clip").
10. Tap **Done** once more to leave the Audio row and get the clip's own tools back.
11. For music, tap **Sound**, then **Music from your files** and pick a song. A bar for it appears under the video and the line says "Music added · it stays where it is". Its tools are **Volume, Fade, Speed, Stay put, More, Delete**.
12. Tap **Fade**. The row has **In** and **Out**, each with a **−** and a **+**. Tap **+** twice beside In (1.0 s) and three times beside Out (1.5 s). Each tap is half a second. (An earlier build showed **In 0.0 s** and **Out 0.0 s** side by side; the half seconds are the same.)
13. Tap **Done**.

Tip: The small speaker at the left end of the clip row (**Mute clip sound**) switches the sound off for all your clips at once. Tap it again to turn it on.

Tip: Speed changes the length of the clip, so the clips after it slide to fill the gap or move later. Volume and Fade need a clip with sound; a picture has neither. <!-- Speed moving the neighbours was walked (step 3). "A picture has neither" is Read from js/simple-tools.js trayFor (a picture gets only Replace), not walked -->

If it doesn't work: a tool you cannot find is probably off the right edge of the row; slide the row sideways. Tools that slide under **More** and **Delete** are hidden by them, not pressable. <!-- CORRECTED 9 Oct (S13): an earlier version of this paragraph said a tap near Delete could press Delete. That came from my script tapping the computed centre of a tool that was hidden behind the pinned buttons; a person cannot tap what is not drawn. The pins paint a solid panel (styles.css .sm-pins). -->


## Verification
| step | what I did (380 px, real touch, hunt/simple-transitions, v17.24) | what happened | file:line |
|---|---|---|---|
| 1 | tapped clip A | 13 tools | js/simple-tools.js trayFor |
| 3 | Speed, 2× | clipA 0+5 at 2×, clipB 5+10, project 15.005 | js/spine-edit.js planSpeed |
| 4 | dragged the slider | 1.9×, project 15.268 | js/simple-tools.js speedRow |
| 6 | Volume, dragged the slider | volume 0.36, line "Volume 36%" | js/simple-tools.js volumeRow |
| 7 | Reverse | reversed true | js/spine-edit.js planReverse |
| 8 | Take sound out, Put sound back | twin layer made, then merged | js/spine-edit.js planTakeSound |
| 9, 10 | Sound, music, Fade + | fadeIn 1, fadeOut 1.5 | js/simple-tools.js fadeRow |
| undo after Delete | not walked | Read only | none |
