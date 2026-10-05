# Add music to your video

You'll be able to add a song, set how loud it is, fade it in and out, and cut it to fit your video.

1. Tap the add row on the timeline, the one that says "Tap to add a layer". <!-- js/timeline.js:2795 -->
2. Tap the **Audio** tab, then **Import audio**, and pick a song from your phone. <!-- js/addmenu.js:464 key 'audio' label 'Audio'; js/addmenu.js:478 "Import audio"; js/addmenu.js:70 audioImport -->
3. The song shows as its own bar in the audio part of the timeline. Tap it to select it. <!-- js/addmenu.js:473-474 audio lands in the audio section; js/timeline.js:2191 -->
4. Open the **Volume** card. <!-- js/inspector.js:2679 key 'volume' label 'Volume' -->
5. Change the loudness: tap the volume number and type a percent. Or drag the ruler left to raise it. <!-- js/inspector.js:5617-5632 mtVBox('Volume') and tickStrip; js/inspector.js:979 drag LEFT to raise -->
6. Under it, find **Fade in (s)** and **Fade out (s)**. Drag each ruler left, or tap the number and type seconds, for example 2. <!-- js/inspector.js:5648-5649 rangeRow; js/inspector.js:217-239 -->
7. To cut the song to your video, slide the timeline to where the video ends. With the song selected and the playhead inside it, tap the right-hand one of the three icon buttons (a bar on the right). <!-- js/inspector.js:3555-3570, 3613 trim end to playhead -->
8. Tap the time counter to hear it. <!-- index.html:557 -->

On a computer: it is the same. The Add and clip panels are at the bottom left. <!-- js/addmenu.js:464, 478 -->

Tip: You can also tap the speaker icon beside the volume ruler to mute the song. <!-- js/inspector.js:5632-5641 vol-mute -->

If it doesn't work: If the song starts late, press it, keep still for half a second, then drag it to the start. The fade rulers stop at 10 seconds, or the song's length if that is shorter. <!-- js/timeline.js:2196-2203 hold to move; js/inspector.js:5645 fmax = min(10, clip length) -->
