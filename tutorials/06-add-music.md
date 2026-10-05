# Add music to your video

You'll be able to add a song, set its volume, fade it, and cut it to fit.

1. Slide the timeline back to the start (00:00:00). The song is added where the playhead is, so if the playhead is at the end, the song will start after your video. Swipe right on the time ruler (the strip of numbers above the clips). You can also swipe on a clip, but start moving straight away: holding still on a clip picks it up. <!-- js/app.js:3055; js/timeline.js:2196-2203, 2322 -->
2. If you see a single timeline row with an edit panel under it, tap the back arrow at the top left **once** to deselect. Then tap the row that says "Tap to add a layer". <!-- js/timeline.js:3966 addRowWanted() && !soloId; styles.css:4205; js/timeline.js:2795 -->
3. Tap the **Audio** tab, then **Import audio**, and pick a song from your phone. <!-- js/addmenu.js:464, 478; js/addmenu.js:70 audioImport -->
4. The song appears as a new layer (a sound-wave bar) below the add row, starting at the playhead. It is selected, its panel opens, and only its row shows. <!-- js/addmenu.js:473-474 audio layers; js/app.js:3099; js/timeline.js:3966 -->
5. Open the **Volume** card. <!-- js/inspector.js:2679, 3813 audio clips get Speed, Volume, Effects -->
6. Type a percent in the volume number, or drag the ruler left to raise it. <!-- js/inspector.js:5617-5632 mtVBox('Volume'), tickStrip; js/inspector.js:979 -->
7. Under it, find **Fade in (s)** and **Fade out (s)**. Drag each ruler left, or tap the number and type seconds. <!-- js/inspector.js:5648-5649 rangeRow; js/inspector.js:217-239 -->
8. To cut the song to your video: tap the back arrow at the top left once so all your layers show. Slide until the playhead line is at the end of your video, then tap the song. With the playhead inside the song, tap the right-hand one of the three buttons at the top of its edit panel (trim end to playhead). <!-- js/timeline.js:3966; index.html:338; js/inspector.js:3555-3570, 3613 -->
9. Quick-tap the time counter to hear it. <!-- index.html:557; js/app.js:6745-6750 -->

On a computer: the Add menu and the clip panel sit at the bottom left. Don't use the back arrow to deselect (on a computer it goes to your projects); click the "New layers go here" line in the timeline instead, and the Add menu shows. Its **Audio** tab may show only a music-note icon. To move the playhead, drag the time ruler; dragging a clip moves the clip. To cut the song, put the playhead at the video's end, select the song and press **D**, or click the D key on the panel's title row. <!-- js/app.js:6909-6913; js/timeline.js:3452; js/addmenu.js:464, 1072-1074; js/timeline.js:5096-5098, 5758-5762; js/app.js:9013 -->

Tip: The speaker button by the volume ruler mutes the song. <!-- js/inspector.js:5632-5641 vol-mute -->

If it doesn't work: If the song starts late, press it, keep still half a second, then drag it to the start. <!-- js/timeline.js:2196-2203; js/inspector.js:5645 fmax -->

Note: On iPhone the picker opens Files, so the song must be a saved audio file, not an Apple Music track. <!-- js/addmenu.js:70 audioImport, file picker -->
