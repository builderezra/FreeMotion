# Add text and music in Simple

You'll be able to put words on your video and a song under it.

Before you start: a project in Simple with a clip in it (tutorials 01 and 02). <!-- shots/04-03.jpg -->

1. Tap empty space in the timeline, then slide it until the line in the middle is where the words should appear. <!-- walked: playhead at 1.47 s; shots/04-04.jpg -->
2. Tap **Text** in the bottom row. The text editor opens with the word "Text" selected. <!-- js/simple-tools.js:188 → FM.spine.cmd.addText; js/spine-edit.js:1355 planAddText starts FM.textEdit; shots/04-05.jpg -->
3. Type your words. <!-- shots/04-06.jpg -->
4. Tap the **tick** at the top right. The words appear in the picture, and a purple bar with your words sits above the clips, starting at the line and lasting until the end of your clips. <!-- js/spine-edit.js:1356-1360 start at the playhead, clamped to the clip row (clampToTrack :953); walked: 1.47 s to 6.0 s; shots/04-07.jpg -->
5. Tap empty space once and the bar's label shows your words. <!-- walked: it said “Text” until the next redraw, then “Hello”; walk-simple.md finding 2; shots/04-08.jpg -->
6. For the song, first tap the **skip-to-start** button (the bar and arrow left of the counter) so the song starts at the beginning. <!-- shots/04-09.jpg; the song starts at the playhead: js/spine-edit.js:1401 addRecs(…, FM.time, …) -->
7. Tap **Sound** in the bottom row. Three choices: **Music from your files**, **Sound effects**, **Record voice**. <!-- js/simple-tools.js:177-184; js/spine-words.js:103; shots/04-10.jpg -->
8. Tap **Music from your files** and pick a song. A green bar appears under the clips from the line, and the song keeps its own length. <!-- js/spine-edit.js:1395-1407 planAddMusic: starts at the playhead, "Stay put"; walked: song 0 to 8 s under a 6 s clip; shots/04-11.jpg -->
9. Tap the time counter to hear it. Tap again to stop. <!-- js/app.js:6773-6792; shots/04-12.jpg, 04-13.jpg -->

Tip: If the song is longer than the clips, the video runs on in black until the song ends. To see what runs past, tap the black band. <!-- js/simple-timeline.js:296-306 the band, tap → explainBand (his D17 B); walked: the project grew from 6 s to 8 s with an 8 s song; the band itself and its card were not walked -->

If it doesn't work: The music bar is named "the sound" (or "the song" for a long one), not after the file; that is how Simple names it, not an error. <!-- js/spine.js:84 --> If **Music from your files** adds nothing, check the file is audio (mp3, m4a, wav) or a video with sound. <!-- js/spine-edit.js:1396 picks sounds and video files; walked: song.wav -->

## Verification
| step | what I did | what happened | file:line |
|---|---|---|---|
| 2 to 4 | Text, typed Hello, tick | text layer at 1.47 s, 4.54 s long | js/spine-edit.js:1355-1360 |
| 5 | tapped empty space | label “Hello” | — |
| 8 | Sound, Music, picked song.wav | video layer "song" at 0, 8 s, Stay put | js/spine-edit.js:1395-1407 |
| 9 | tapped the counter twice | played and stopped | js/app.js:6773-6792 |
| black band | not walked | Read only | js/simple-timeline.js:296-303 |
