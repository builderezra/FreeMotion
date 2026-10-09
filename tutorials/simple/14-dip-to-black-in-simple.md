# Dip to black in Simple (and why there is no "fade out at the very end")

You'll be able to dip to black between two clips, and you will know what to do when you want the whole video to fade to black at the end.

Before you start: a project in Simple with at least two clips next to each other. Needs the 2.7 release. <!-- walked 9 Oct at 380 with real touch on hunt/simple-tip, three 10 s clips, shots/14-01.jpg to 14-07.jpg -->

1. Slide the timeline to the join you want a dip on. With three clips there are two ◇, and the last one is the join before the final clip. <!-- walked: chips=2 for three clips, last ◇ at x=274; shots/14-02.jpg -->
2. Tap that **◇**, then **Dip to black**. The first clip fades down to black and the next comes up from black. The line says "Dip to black 0.5 s". <!-- walked: clipC trIn dipblack 0.5; shots/14-03.jpg, 14-04.jpg; the look of the dip is test T3, not judged by eye here -->
3. Tap **+** three times to make it 0.8 s, and use the **next** button to jump to 00:20:00 to look at the join. <!-- walked: 0.5 to 0.8, FM.time 20; shots/14-05.jpg, 14-06.jpg -->
4. Tap **Done**. <!-- walked: shots/14-07.jpg -->

**What Simple cannot do (honest bit):** there is no ◇ after the last clip, and the last clip's tools (Length, Audio, Move earlier, Move later, Lift off, Duplicate, Crop, Replace, More, Delete) have no Fade. So Simple cannot fade the picture to black at the very end of the video; a transition only exists on a join between two clips. <!-- walked: with the playhead at 29.9 s the last clip is selected and the tray lists exactly those ten tools; no chip after the last clip (chips stayed 2). Read: js/simple-tools.js trayFor, a Fade tool exists only for kind 'audio' (that is the music fade); DESIGN has no end-of-video dip for Simple -->

What to do instead: the sound can still fade out (select the music, then **Fade**). For a picture fade to black, open the project in Full (tutorial 08) and fade the last clip's opacity there. <!-- the music Fade is walked in tutorial 09; the Full route is Read, not walked here -->

If it doesn't work: if you want a black gap between two clips you do not need a dip: **Dip to black** on the join is that. <!-- Read -->

## Verification
| step | what I did (380 px, real touch, hunt/simple-tip) | what happened | file |
|---|---|---|---|
| 1 | swiped to the last join | 2 chips for 3 clips | js/simple-timeline.js |
| 2 | ◇ then Dip to black | clipC trIn dipblack 0.5 | js/spine-edit.js planTransition |
| 3 | + three times, next to 20 s | 0.8, FM.time 20 | same |
| end | playhead at 29.9 s, last clip | ten tools, no Fade, no chip | js/simple-tools.js trayFor |
