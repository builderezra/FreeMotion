# Switch to Simple and back

You'll be able to change a project between the Simple editor (clips one after another) and the Full editor (layers anywhere), in either direction, without losing anything.

1. Open any project. <!-- shots/01-01.jpg -->
2. Tap the gear at the top right (next to the up-arrow). <!-- index.html:394 #m-settings, aria-label "Canvas settings"; shots/01-02.jpg -->
3. The top block of the panel is the **Editor** row: a switch with **Simple** on the left and **Full** on the right. Tap **Simple**. <!-- js/app.js:8395 edSwitch; js/spine-words.js:13 simple/full; shots/01-03.jpg -->
4. The panel closes by itself and you are in Simple: your clips sit in one row, and the bottom row says **Clips, Text, Sound, Overlay**. The first time on a device a note appears: "Simple editor. Switch back any time from the ⚙ cog." <!-- js/app.js:8410 closes the cog 260 ms later; js/editor-mode.js:182 the note, once per device; js/spine-words.js:20 -->
5. To go back, tap the gear again, then **Full**. <!-- js/app.js:8395; shots/01-06.jpg -->
6. Not sure which one you want? In the same panel tap **What should you use?**. A card explains both in two lines each and says "You're in Simple" or "You're in Full". <!-- js/app.js:8424-8429; js/spine-words.js:16-19; shots/01-05.jpg -->
7. Your choice is remembered for that project on that phone. Leave the project with the back arrow and open it again: it comes back in the editor you last used there. <!-- js/editor-mode.js:32-36 homeFor reads this device's card for the project; :37 remember writes it; walked: shots/01-08.jpg, 01-09.jpg -->

Tip: Nothing is converted. Both editors show the same project, so you can switch in the middle of working. <!-- js/spine-words.js:19 "Same project in both. Nothing is converted…"; js/editor-mode.js:3-4 "A VIEW, NOT A DOCUMENT FACT: … takes no undo step" -->

If it doesn't work: If the panel says "Finish or close the open tool first", close the crop, touch-up or drawing tool you have open (or tap its Done) and try again. "Wait for the export to finish" means an export is running. A pop-up that says your crop or drawing "isn't applied yet" is asking before it throws that work away: choose **Apply … and switch** to keep it, or **Stay**. <!-- js/spine-words.js:21 refuse strings, :24-34 warn strings; js/editor-mode.js:187-209 request() asks first -->

## Verification
| step | what I did (380 px, branch 980-p22-r3, v17.24) | what happened | file:line |
|---|---|---|---|
| 2 to 4 | tapped the gear, then Simple | body got `ed-simple`; the note showed once; bottom row Clips / Text / Sound / Overlay | js/editor-mode.js:182; js/simple-tools.js:186-191 |
| 5 | gear, then Full | `ed-simple` removed, Full timeline back | js/editor-mode.js:125 apply |
| 6 | tapped What should you use? | the card with both descriptions and "You're here" on the current one | js/app.js:8424-8429 |
| 7 | switched to Simple, back arrow, tapped the project card | reopened in Simple | js/editor-mode.js:32-37 |
| warnings | not walked (needs an open crop or pen) | Read only | js/spine-words.js:24-34 |
