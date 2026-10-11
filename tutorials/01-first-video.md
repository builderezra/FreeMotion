# Make your first video

You'll be able to start a project, add a clip or photo, watch it, and save the finished video to your phone.

1. On the home screen, tap the **Projects** tab, then tap the round **+** at the bottom. <!-- index.html:703, 716; js/home.js:2554-2557 the + is hidden on Tutorials and means New template / New element on the other tabs -->
2. Pick **9:16** for a phone video. <!-- index.html:719-725 -->
3. Tap **Create**. <!-- index.html:770; js/home.js:3193 -->
4. Tap the big round **+** in the middle of the empty timeline ("Tap here to start creating"). The Add menu comes up. <!-- js/timeline.js:3447-3452; js/timeline.js:2795 addRowLabel() -->
5. Tap the **Media** tab. <!-- js/addmenu.js:377 -->
6. Tap **Import media**, then pick a video or photo from your phone. <!-- js/addmenu.js:423 -->
7. Your clip lands selected, with its options open underneath. <!-- js/app.js:3099 -->
8. To watch it, tap the time counter (00:00:00) once. Tap it again to pause. Don't press and hold it: that switches looping on or off (you'll see "Looped playback ON") instead of playing. <!-- index.html:557 #time-readout; js/app.js:6745-6750 hold = loop -->
9. Tap the back arrow at the top left **once**, to close the clip's options. A second tap goes Home. <!-- index.html:338 #m-back; styles.css:4214 body.m-editing hides #m-export -->
10. Tap the up-arrow button at the top right. That is Export. <!-- index.html:395 #m-export -->
11. Tap **Export MP4**. <!-- index.html:958 --> <!-- not walked: Export MP4 freezes the tab in this container (no H.264 encoder); not known on a phone -->
12. When **Export ready** shows, tap **Save**, then choose the option that saves the video to your phone (on iPhone it is called Save Video; on Android, pick your gallery or files app). If you close that share sheet without saving, tap **Save** again. If no share sheet opens at all, the browser downloaded the video instead. <!-- index.html:832, 840; js/exporter.js:55-75 deliver() --> <!-- not walked: follows step 11, which could not run here -->

On a computer: steps 1 to 3 are the same. At step 4 there is no big **+** (phone only). The Add panel is already open at the bottom left. Click its **Media** tab (picture icon; name may be hidden), then **Import media**, or drag a file onto the picture. Your clip's options then replace it. Skip step 9: on a computer the back arrow goes straight to Home. It is at the left end of the button row with the time counter, above the timeline. Export is always showing: the up-arrow third from the right end of that row (on a narrow window, in a strip just below it). At step 12, **Save** downloads the video or opens your computer's share window, depending on the browser. <!-- js/timeline.js:2864 phone only; js/addmenu.js:1072-1074; js/app.js:6909-6913 #btn-back leaves the project; js/app.js:7737; styles.css:6470-6483; js/exporter.js:66-75 --> <!-- not walked: the walk was the 380 px phone layout only -->

Tip: Tap a tile in **Media** to add an earlier import again. <!-- js/addmenu.js:458-461 -->

If it doesn't work: Tapping **Import media** closes the Add menu straight away. If you cancel your phone's picker, nothing is added. Tap "Tap here to start creating" again, then **Media**, then **Import media**. <!-- js/addmenu.js:69; js/timeline.js:2795 -->
