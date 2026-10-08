# Change a clip's speed in Simple

You'll be able to play a clip faster or slower, smooth out slow motion, or play it backwards.

Before you start: a project in Simple with a clip in it (tutorials 01 and 02). <!-- shots/06-01.jpg -->

1. Tap the clip so it is selected, then tap **More**. <!-- shots/06-01.jpg, 06-02.jpg; js/simple-tools.js:202 -->
2. Slide the panel up a little and tap **Speed**. <!-- walked; shots/06-03.jpg, 06-04.jpg -->
3. The top of the card has two buttons that work out the speed for you so the clip begins or ends at the playhead (a grey note there says so); ignore them for now. Slide the panel up again until you see **Speed %** with the number 100. <!-- walked: the card opens on a row of two buttons, a diamond and a curve, and a grey note; Speed % is below; shots/06-04.jpg, 06-05.jpg -->
4. Tap the number, type **200** and press Return. The clip is twice as fast, so its bar on the timeline gets half as long (6 s becomes 3 s). <!-- js/inspector.js:6017-6027 re-times the clip: new length = source span / speed; walked: 6.003 s → 3.0015 s; shots/06-06.jpg -->
5. Type **50**. Now it is half speed and the bar is twice as long (12 s). <!-- walked: 12.006 s; shots/06-07.jpg -->
6. For smoother slow motion, tick **Smooth slow-motion (frame blend)**. A note says "Preparing frames…" with a percentage; wait for it to finish. <!-- js/inspector.js:6061; walked: frameBlend true, toast Preparing frames… 11 %; shots/06-08.jpg -->
7. To play the clip backwards, tick **Reverse (video + audio)**. <!-- js/inspector.js:6066; walked: reversed true; shots/06-09.jpg -->
8. Tap the time counter to watch it, and tap again to stop. <!-- js/app.js:6773-6792 (T9 walked this); the speed itself was checked by length, not by watching -->

Tip: A faster clip is shorter, so the clips after it will move up to fill the gap; a slower one pushes them later. <!-- NOT WALKED: only one clip in the project. The bar length change was walked; what happens to a neighbour was not; the Simple row closes gaps by itself (shots/03 in tutorial 03 shows it for Length) -->

If it doesn't work: The box takes 1 to 1000. **1** makes a 10-minute clip and **1000** makes a clip a tenth of its length, so if a clip suddenly becomes enormous or tiny, you typed an extra 0 or forgot one: type 100 to get back to normal. <!-- js/inspector.js:4309 SPD_MIN 0.01, SPD_MAX 1000; walked: 1000 → speed 10, 0.6 s; 1 → speed 0.01, 600.3 s; shots/06-10.jpg, 06-11.jpg --> Undo (the arrow right of the counter) also puts it back.

## Verification
| step | what I did (380 px, branch 980-p22-r3, v17.24) | what happened | file:line |
|---|---|---|---|
| 1 to 3 | clip, More, Speed, scroll | Speed % 100 | js/inspector.js:6017 |
| 4 | typed 200 | speed 2, duration 3.0015 | js/inspector.js:6017-6027 |
| 5 | typed 50 | speed 0.5, duration 12.006 | js/inspector.js:6017-6027 |
| 6 | tick Smooth slow-motion | frameBlend true | js/inspector.js:6061 |
| 7 | tick Reverse | reversed true | js/inspector.js:6066 |
| limits | typed 1000 and 1 | speed 10 (0.6 s) and 0.01 (600.3 s) | js/inspector.js:4309 |
| neighbours | not walked | Read only | — |
