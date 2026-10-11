# Style a title and make it animate

You'll be able to make a title bold, spaced or curved, and have it pop in.

1. Tap your title on the timeline. (No title yet? See tutorial 05.)
2. Open the **Customise Text** card. The text editor opens with a bar across the top.
3. Tap **Aa** in the bar. A sheet of options opens.
4. Next to **Style**, tap **B** for bold or **I** for italic.
5. Try **Spacing**, **Line height** and **Curve**. Drag a ruler left to raise it, or tap the number and type one. **Curve** bends the words along an arc.
6. Next to **Animate**, choose **Pop**. Other choices include **Fade in**, **Typewriter**, **Slide in** and **Spin in**.
7. New rows appear. **By** picks **Character**, **Word** or **Line**. **Duration in (s)** is how long it takes. **Stagger (s)** is the gap between pieces. **Fade out (s)** fades it away at the end.
8. Tap the tick at the far right of the bar. Slide the timeline back to the very start of the title, then quick-tap the time counter to watch.

On a computer: the same. The text controls sit on a card at the bottom of the picture. <!-- not walked: the walk was the 380 px phone layout only -->

Tip: **Wave (keeps moving)** and **Jitter (keeps moving)** never settle. Use the others for an entrance.

If it doesn't work: The animation starts when the title starts. If the playhead is later than that, the words are already in place. Slide back to the start of the title's bar.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 2 card is called Customise Text | js/inspector.js:2726 | yes |
| 2 tapping that card opens the text editor | js/inspector.js:4027 | yes |
| 3 Aa button | js/text-edit.js:521 | yes |
| 4 Style B and I | js/inspector.js:5692 | yes |
| 5 Spacing / Line height / Curve | js/inspector.js:5726 | yes |
| 5 drag LEFT to raise | js/inspector.js:979 | yes |
| 6 Animate list incl. Pop, Fade in, Typewriter, Slide in, Spin in | js/inspector.js:5738 | yes |
| 6 Wave / Jitter keep moving | js/inspector.js:5740 | yes |
| 7 By: Character / Word / Line | js/inspector.js:5746 | yes |
| 7 Duration in (s) | js/inspector.js:5749 | yes |
| 7 Stagger (s) | js/inspector.js:5750 | yes |
| 7 Fade out (s) | js/inspector.js:5751 | yes |
| 8 tick at the far right | js/text-edit.js:878 | yes |
| 8 quick-tap the time counter | index.html:557 | yes |
| If: animation timed from the layer start | js/compositor.js:2917 | yes |
