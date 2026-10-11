# Speed a clip up or slow it down

You'll be able to make a video clip play faster or slower, and see its new length on the timeline.

1. Tap your video clip to select it.
2. Open the **Speed** card (the half-dial with a needle). If another card is open, tap the ‹ at the top first.
3. Find the ruler called **Speed %**. It starts at 100.
4. Tap the number and type **200**, then press Return or tap away. The clip plays twice as fast, and its bar on the timeline gets half as long. You can also drag the ruler left to raise the speed.
5. Type **50** to go the other way. The clip plays at half speed, and its bar grows to twice its original length (four times what it was at 200).
6. Tap the time counter once to watch it. Don't hold it: that turns looping on.
7. For smoother slow motion, scroll the panel down and tick **Smooth slow-motion (frame blend)**.
8. To play the clip backwards, scroll the panel down and tick **Reverse (video + audio)**.

On a computer: the same steps. Click the clip first. The panel is at the bottom left. Press Space to play. <!-- not walked: the walk was the 380 px phone layout only -->

Tip: For a speed ramp, tap the diamond on the left of the Speed panel, move the playhead, then type a new speed. That adds a second diamond, and the speed changes between the two. While the speed has diamonds, the clip's length stays fixed. Tap a diamond again to remove it.

If it doesn't work: The box is in percent. Typing 2 means 2%, which is almost frozen. Type 200 for twice as fast.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1-2 Speed card | js/inspector.js:2678 | yes |
| 2 back chevron | js/inspector.js:7147 | yes |
| 3 'Speed %' ruler, default 100% | js/inspector.js:6017 | yes |
| 4 tap the number to type, ruler drags left to raise | js/inspector.js:979 | yes |
| 4 clip length changes with speed (non-keyframed) | js/inspector.js:6019 | yes |
| 4 the preview plays at the new rate | js/inspector.js:6049 | yes |
| 4 minimum speed 1% | js/inspector.js:4309 | yes |
| 6 hold on the time counter = loop | js/app.js:6759 | yes |
| 7 frame blend tick box (video only) | js/inspector.js:6061 | yes |
| 8 Reverse tick box (video only) | js/inspector.js:6066 | yes |
| Tip: diamond for a speed ramp | js/inspector.js:5927 | yes |
| If: percent not multiplier | js/inspector.js:4309 | yes |
| 5 bar grows to twice the ORIGINAL length | js/inspector.js:6022-6024, 6030 | yes |
| Tip ramp: length fixed while diamonds exist | js/inspector.js:6018-6020, 5931, 6050 | yes |
