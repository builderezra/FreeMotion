# Make your first video

You'll be able to start a project, add a clip or photo, watch it, and save the finished video to your phone.

1. On the home screen, tap the round **+** button (New project). <!-- index.html:716 aria-label="New project" -->
2. Type a name, or leave the suggested one. Pick a shape, like **9:16** for a phone video. <!-- index.html:719-725 "New project", "Name", "9:16" -->
3. Tap **Create**. Your project opens. <!-- index.html:770 "Create"; js/home.js:3193 opens the project -->
4. Tap the bar that says **Tap here to start creating**. The Add sheet slides up. <!-- js/timeline.js:2795 addRowLabel(); index.html:653 "Add" -->
5. Tap the **Media** tab. <!-- js/addmenu.js:377 key 'media' label 'Media' -->
6. Tap **Import media**, then choose a video or photo from your phone. <!-- js/addmenu.js:423 "Import media" -->
7. To watch it, tap the time counter (it reads 00:00:00 at the start). Tap it again to pause. <!-- index.html:557 #time-readout title "Tap: play / pause" -->
8. Tap the **Export** button (the up-arrow button in the top bar). <!-- index.html:395 aria-label="Export" -->
9. Leave the settings as they are and tap **Export MP4**. Wait for the bar to finish. <!-- index.html:958 "Export MP4" -->
10. When **Export ready** appears, tap **Save**. <!-- index.html:832, 840 "Export ready", "Save" -->
11. In the sheet your phone shows, choose the option that saves the video. <!-- js/exporter.js:55 hands the MP4 to the OS share sheet; the wording there is your phone's, not ours -->

On a computer: drag a video or photo onto the picture, or click **Import media** at the top. Click the time counter or press Space to play, and click **Export** at the top. <!-- index.html:423 "Drag a video or image here or click Import media"; index.html:332 "Export"; index.html:556 "Play / Pause (space)" -->

Tip: Once you've imported something, it shows up as a small tile in the **Media** tab. Tap that tile to add it again without opening your photos. <!-- js/addmenu.js:458-461 libEntries, "One tap re-adds it" -->

If it doesn't work: If you tap **Import media** and nothing seems to happen, you may have backed out of your phone's picker. Tap it again and pick a file. <!-- js/addmenu.js:69 fileImport opens the picker -->
