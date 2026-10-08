# When to switch to the Full editor

You'll know what Simple can do, what it can't, and how to hop to Full and back without losing anything.

Before you start: a project in Simple with a clip in it (tutorial 01 shows how to switch). <!-- shots/08-01.jpg -->

1. Tap the gear at the top right, then **What should you use?**. A card says what each editor is for and which one you're in. <!-- walked: Simple: "Clips one after another, with text, captions and music. Gaps close up by themselves. Best for a quick video, or if you've never edited." Full: "Everything FreeMotion does: layers anywhere, keyframes, masks, 3D and every effect. For animation, and anything Simple can't do."; js/spine-words.js:17-18; shots/08-01.jpg -->
2. Stay in Simple for: cutting a clip, making it shorter, putting clips in order, text, music, an overlay on top, an effect, a speed change, exporting. Everything in tutorials 02 to 07. <!-- tutorials 02 to 07 were each walked in Simple; the claim is only about those -->
3. Look for the small **✦** at the end of a clip. It means that clip has moves (keyframes) on it. You can still edit them: select the clip, tap **More**, **Position / Scale**. <!-- js/simple-timeline.js:179 the badge, title "Has moves and effects"; js/spine.js:414-416 sets it for keyframes and behaviours; walked: after two X keyframes in Position / Scale the clip showed ✦; Position / Scale worked in Simple's More panel; shots/08-02.jpg -->
4. Switch to Full when you want things Simple does not draw: pieces on different layers at the same time with their own timing, a camera, a group you want to open, masks, 3D. <!-- js/spine-words.js:18 (the card's own words); js/simple-tools.js:227 a camera or a group shows only "Open in Full" and Delete; js/spine-words.js:68 "Open in Full to split this"; NOT WALKED: I could not get a camera or a group to show in Simple here, so those two lines are read from the code, not seen -->
5. To switch: tap the gear, then **Full** in the top block. The project is the same; nothing is converted. <!-- walked: ed-simple removed; shots/08-03.jpg --> To come back: gear, **Simple**. <!-- tutorial 01; js/editor-mode.js:125 -->
6. When Simple says "Open in Full" in a line or on a button, that is a **hop**: it opens Full for this one thing and does not change the editor your project opens in next time. <!-- js/editor-mode.js:205-208 hop writes no editor memory; NOT WALKED, no such line could be raised here -->

Tip: If you can't find a tool in Simple, look in **More** on the selected item before you switch: Position / Scale, Speed, Volume, Customise Shape, Presets and Effects are all there. <!-- walked: tutorials 05 and 06 -->

If it doesn't work: If the switch says "Finish or close the open tool first", close the crop, touch-up or drawing tool first (tutorial 01). <!-- js/app.js:8395-8440 -->

## Verification
| step | what I did (380 px, branch 980-p22-r3, v17.24) | what happened | file:line |
|---|---|---|---|
| 1 | gear, What should you use? | the card, "You're here" on Simple | js/app.js:8424-8429 |
| 3 | two X keyframes in Position / Scale | ✦ on the clip's right end | js/simple-timeline.js:179 |
| 5 | gear, Full | Full editor | js/editor-mode.js:125 |
| camera / group lines | not seen | Read only | js/simple-tools.js:227; js/spine-words.js:68 |
| hop | not seen | Read only | js/editor-mode.js:205 |
