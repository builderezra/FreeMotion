# Add music to your video

You'll be able to add a song, set its volume, fade it, and cut it to fit.

1. Slide the timeline back to the start (00:00:00). A song is added at the playhead, or it would start after your video. Swipe the time ruler, or move at once: holding a clip picks it up. <!-- js/app.js:3055 start = Math.min(FM.time, duration); js/timeline.js:2196-2203, 2322 -->
2. If you see a single timeline row with an edit panel under it, tap the back arrow at the top left **once** to deselect. Then tap the row that says "Tap to add a layer". <!-- js/timeline.js:3966 addRowWanted() && !soloId; styles.css:4205; js/timeline.js:2795 -->
3. Tap the **Audio** tab, then **Import audio**, and pick a song from your phone. <!-- js/addmenu.js:464, 478; js/addmenu.js:70 audioImport -->
4. The song appears as a new layer (a sound-wave bar) below the add row, starting at the playhead. It is selected, its panel opens, and only its row shows. <!-- js/addmenu.js:473-474 audio layers; js/app.js:3099; js/timeline.js:3966 -->
5. Open the **Volume** card. <!-- js/inspector.js:2679, 3813 audio clips get Speed, Volume, Effects -->
6. Type a percent in the volume number, or drag the ruler left to raise it. <!-- js/inspector.js:5617-5632 mtVBox('Volume'), tickStrip; js/inspector.js:979 -->
7. Under it, find **Fade in (s)** and **Fade out (s)**. Drag each ruler left, or tap the number and type seconds. <!-- js/inspector.js:5648-5649 rangeRow; js/inspector.js:217-239 -->
8. To cut the song to your video: go back to the cards, deselect so all layers show, and slide until the playhead is at the end of your video. Tap the song again. With the playhead inside it, tap the right-hand one of the three small buttons above the cards. <!-- js/inspector.js:7167 '‹ Volume' back; js/inspector.js:3555-3570, 3613; js/timeline.js:3966 -->
9. Quick-tap the time counter to hear it. <!-- index.html:557; js/app.js:6745-6750 -->

On a computer: three differences. The Add menu and clip panel are at the bottom left (with nothing selected the Add menu is showing, and the add line reads "New layers go here"). To cut the song, put the playhead at the video's end, select the song and press **D** (or click the D key on the panel's title row). Click the time counter or press Space to play. <!-- js/timeline.js:3452; js/timeline.js:5758-5762, styles.css:2477-2486 key rail; js/app.js:9013; index.html:556 -->

Tip: The speaker button by the volume ruler mutes the song. <!-- js/inspector.js:5632-5641 vol-mute -->

If it doesn't work: If the song starts late, press it, keep still half a second, then drag it to the start. <!-- js/timeline.js:2196-2203; js/inspector.js:5645 fmax -->
