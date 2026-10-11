# Add a crossfade between two clips in Simple

You'll be able to blend the end of one clip into the start of the next, change how long the blend lasts, dip to black or white instead, and use the same one on every cut.

Before you start: a project in Simple with at least two clips next to each other (tutorials 01 and 02). <!-- merged 11 Oct from drafts 10 and 13 (his pick through the PM: "merge Simple 10 and 13"). Both were walked 9 Oct at 380 with real touch: 10 on hunt/simple-transitions with three 10 s clips, 13 on hunt/simple-tip with two; shots/10-*.jpg and shots/13-*.jpg on tutorials-drafts -->

1. Look along the timeline for the small dashed diamond **◇** where two clips meet. There is one on every join between two clips, and none before the first clip, after the last, or across a gap. Slide the timeline sideways if it is off screen. <!-- walked (13): one ◇ for two clips; (10): the first ◇ was off screen until one swipe on the empty strip above the clips; js/simple-timeline.js (the ◇ lane) -->
2. Tap the **◇**. The tools row turns into **Done, None, Crossfade, Dip to black, Dip to white**, with **None** lit. The clip after the join is selected. <!-- walked (10, 13): rowBack, tr-none*, tr-crossfade, tr-dipblack, tr-dipwhite; js/simple-tools.js transitionRow -->
3. Tap **Crossfade**. It lights up, **Length 0.5 s** with **−** and **+** appears next to **On every cut**, the diamond fills in, and the line says "Crossfade 0.5 s". Slide the row sideways if the last buttons are off the edge. <!-- walked (10, 13): clipB trIn crossfade 0.5; js/spine-edit.js planTransition -->
4. To see it, tap the **next** button beside the time counter until the counter reaches the join (00:10:00 when the first clip is 10 seconds long). The picture is half one clip and half the other. <!-- walked (10, 13): FM.time 10; the blend itself is test T3 (pixels), looked at by eye only -->
5. Tap **+** three times. The length goes to 0.8 s. Each tap is 0.1 s; the shortest is 0.1 s and the longest 3 s. <!-- walked (13): 0.5 to 0.8; TR_MIN, TR_MAX in js/transitions.js -->
6. Want a dip instead? Tap **Dip to black**: the first clip fades to black and the next comes up from black, and the length stays the same. **Dip to white** does the same through white. <!-- walked (10): type dipblack, the length kept; the look of the dips is test T3 -->
7. Tap **On every cut** to put the same transition on every join in the project. With three clips the line says "Same transition on all 2 cuts". <!-- walked (10): clipB and clipC both dipblack; js/spine-edit.js planTransitionAll -->
8. To take one away, tap its **◇**, then **None**. The line says "No transition" and the diamond goes back to dashed. <!-- walked (10): None cleared clipB, clipC kept its own -->
9. Tap **Done**. The tools row goes back to the clip's own tools. <!-- walked (13): Length, Audio, Move earlier … -->

Tip: Your video does not get shorter: the picture crosses over the join, but every clip keeps its length. The sound still cuts at the join. A transition cannot be longer than half of the shorter of the two clips; ask for 3 s on two 2 s clips and you get 1 s. <!-- walked (13): 20.0 s before and after; the half-length cap is test T1, not walked -->

Tip: A transition belongs to one join. If you delete a clip, move it, or split the clip after a transition, the transition on that join is removed and the line adds "removed 1 transition". Duplicating a clip does not copy its transition. <!-- not walked in the browser: tests T6 (delete, split, duplicate) -->

Tip: If you already have a hand-made crossfade (one clip fading in over the other), its ◇ is on the middle of the overlap; select it and tap **Turn into a transition** to make it a proper one. <!-- not walked by hand: test T10 -->

If it doesn't work: no ◇ above a join means the two clips do not touch (a gap or an overlap sits between them: tap that chip first to close it) or one of them is not a picture or video. <!-- the gap case is test T7; the overlap advice is Read from js/spine-edit.js S.planSeam -->
