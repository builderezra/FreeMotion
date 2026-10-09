# Add a crossfade between two clips in Simple

You'll be able to blend one clip into the next, dip to black or white between them, change how long it lasts, and use the same one on every cut.

Before you start: a project in Simple with at least two clips next to each other (tutorials 01 and 02). This needs the 2.7 release; on an older build there is no ◇ and nothing to tap. <!-- walked 9 Oct at 380 with real touch on hunt/simple-transitions, label v17.24 (the branch has not bumped it); shots/10-01.jpg -->

1. Slide the timeline sideways until you see where two clips meet. Above that join there is a small dashed diamond **◇**. It is on every join between two clips, and only there (not before the first clip, not across a gap). <!-- walked: three 10 s clips, the first ◇ was 330 px off screen at the start, one swipe on the empty strip above the clips brought it to x=265; shots/10-01.jpg; js/simple-timeline.js (the ◇ lane) -->
2. Tap the **◇**. The tools row turns into **Done, None, Crossfade, Dip to black, Dip to white**, with **None** lit. The clip after the join is selected. <!-- walked; shots/10-02.jpg; js/simple-tools.js transitionRow -->
3. Tap **Crossfade**. It lights up, a **Length 0.5 s** with **−** and **+** and an **On every cut** button appear, the diamond fills in, and the line says "Crossfade 0.5 s". Slide the row sideways if the last buttons are off the edge. <!-- walked: clipB trIn crossfade 0.5, live "Crossfade 0.5 s"; shots/10-03.jpg -->
4. To see it, tap the **next** button beside the time counter (▷|) until the counter reads 00:10:00, which is the join. The picture is half one clip and half the other. <!-- walked: FM.time 10; the preview is brown, red blended with green, with both clips' words over each other; shots/10-04.jpg -->
5. Tap **+** twice. The length goes to 0.7 s (each tap is 0.1 s; the shortest is 0.1 s, the longest 3 s). <!-- walked: 0.5 to 0.7, live "Crossfade 0.7 s"; limits from js/transitions.js TR_MIN, TR_MAX; shots/10-05.jpg -->
6. Tap **Dip to black**. Instead of blending, the first clip fades to black and the second comes up from black; the length stays 0.7 s. **Dip to white** does the same through white. <!-- walked: type dipblack, d 0.7, live "Dip to black 0.7 s"; shots/10-06.jpg; the pictures of the dips are checked by tests T3, not by eye here -->
7. Tap **On every cut**. The same transition goes on every join in the project and the line says "Same transition on all 2 cuts" (three clips have two joins). <!-- walked: clipC and clipB both dipblack 0.7; shots/10-07.jpg -->
8. To take one away, tap its **◇**, then **None**. The line says "No transition" and the diamond goes back to dashed. Tap **Done** when you are finished. <!-- walked: tapped None (not the diamond again): clipB lost it, clipC kept it; shots/10-08.jpg -->

Tip: A transition never makes your video shorter: the picture crosses over the join, but every clip keeps its length. The sound still cuts at the join. A transition cannot be longer than half of the shorter of the two clips; ask for 3 s on two 2 s clips and you get 1 s. <!-- the first sentence is DESIGN D13 A and was checked by tests T1/T2 (the video keeps its length), not by eye; the sound is picture-only per DESIGN 12.1, Read; the half-length cap is test T1 (3 s on two 2 s clips is 1 s), not walked -->

Tip: A transition belongs to one join. If you delete a clip, move it, or split the clip after a transition, the transition on that join is removed and the line adds "removed 1 transition". Duplicating a clip does not copy its transition. <!-- NOT WALKED in the browser: tests T6 (delete, split, duplicate) -->

Tip: If you already have a hand-made crossfade (one clip fading in over the other), its ◇ is on the middle of the overlap; select it and tap **Turn into a transition** to turn it into a proper one. <!-- NOT WALKED by hand: test T10 (the two clips meet in the middle of the overlap, the fade keys go, one undo puts it all back) -->

If it doesn't work: no ◇ above a join means the two clips do not touch (there is a gap or an overlap: tap that chip first to close it) or one of them is not a picture or video. <!-- the gap case: test T7 (a clip after a gap has no ◇); the overlap/"close it" advice is Read from js/spine-edit.js S.planSeam, not walked -->

## Verification
| step | what I did (380 px, real touch, hunt/simple-transitions, v17.24) | what happened | file:line |
|---|---|---|---|
| 1 | swiped the strip above the clips | the first ◇ at x=265, dashed | js/simple-timeline.js (the ◇ lane), styles.css `.sm-chip-tr` |
| 2 | tapped the ◇ | row: rowBack, None*, Crossfade, Dip to black, Dip to white | js/simple-tools.js transitionRow |
| 3 | Crossfade | clipB trIn crossfade 0.5 | js/spine-edit.js planTransition |
| 4 | ▷| to 10 s | the preview blends red and green | js/transitions.js transitionAt, js/compositor.js |
| 5 | + twice | 0.7 | js/spine-edit.js planTransition (clamps 0.1 to 3, step 0.1) |
| 6 | Dip to black | dipblack 0.7 | same |
| 7 | On every cut | clipB and clipC | js/spine-edit.js planTransitionAll |
| 8 | None | clipB cleared, clipC kept | same |
| first real tap on the ◇ | found a bug: the tap hit #sm-sections | fixed in the same release, test T8b | styles.css `#sm-sections { pointer-events: none }` |
