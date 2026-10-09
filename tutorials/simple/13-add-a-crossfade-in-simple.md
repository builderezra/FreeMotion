# Add a crossfade between two clips in Simple

You'll be able to blend the end of one clip into the start of the next, and change how long the blend lasts.

Before you start: a project in Simple with two clips next to each other (tutorials 01 and 02). This needs the 2.7 release; on an older build there is no ◇ to tap. Tutorial 10 covers the dips and "On every cut" as well; this one is just the crossfade. <!-- walked 9 Oct at 380 with real touch on hunt/simple-tip (2.7 merged onto the S14 tip), two 10 s clips, shots/13-01.jpg to 13-07.jpg -->

1. Look along the timeline for the small dashed diamond **◇** where the two clips meet. There is one per join, and none before the first clip or after the last. Slide the timeline sideways if it is off screen. <!-- walked: chips=1 for two clips, ◇ at x=322 after the first swipe check; shots/13-02.jpg -->
2. Tap the **◇**. The tools row turns into **Done, None, Crossfade, Dip to black, Dip to white**, with **None** lit. <!-- walked: rowBack,tr-none*,tr-crossfade,tr-dipblack,tr-dipwhite; shots/13-03.jpg -->
3. Tap **Crossfade**. It lights up, **Length 0.5 s** with **−** and **+** appears next to **On every cut**, and the line says "Crossfade 0.5 s". <!-- walked: clipB trIn crossfade 0.5, live "Crossfade 0.5 s"; shots/13-04.jpg -->
4. Tap the **next** button beside the time counter until it reads 00:10:00, the join. The picture is half one clip and half the other. <!-- walked: FM.time 10; shots/13-05.jpg; the blend itself is test T3 (pixels), looked at here by eye only -->
5. Tap **+** three times. The length goes to 0.8 s. Each tap is 0.1 s; the shortest is 0.1 s and the longest 3 s. <!-- walked: 0.5 to 0.8; shots/13-06.jpg; TR_MIN, TR_MAX in js/transitions.js -->
6. Tap **Done**. The tools row goes back to the clip's own tools. <!-- walked: Length, Audio, Move earlier ...; shots/13-07.jpg -->

Tip: Your video does not get shorter. The project stayed 20.0 s before and after. The sound still cuts at the join. <!-- walked: dur 20.006 in every step -->

If it doesn't work: no ◇ means the two clips do not touch (a gap or an overlap sits between them) or one of them is not a picture or video. <!-- Read from js/spine-edit.js S.planSeam and test T7, not walked here -->

## Verification
| step | what I did (380 px, real touch, hunt/simple-tip) | what happened | file |
|---|---|---|---|
| 1 | looked for the diamond | one ◇ for two clips | js/simple-timeline.js |
| 2 | tapped it | five buttons, None lit | js/simple-tools.js transitionRow |
| 3 | Crossfade | clipB trIn crossfade 0.5 | js/spine-edit.js planTransition |
| 5 | + three times | 0.8 | same (clamp 0.1 to 3) |
| 6 | Done | clip tools back, length of project unchanged (20.006) | js/simple-tools.js |
