# Make your first video

You'll be able to start a project, add a clip or photo, watch it, and save the finished video to your phone.

1. On the home screen, tap the round **+** button. <!-- index.html:716 #hm-new aria-label="New project" -->
2. Pick a shape, like **9:16** for a phone video. <!-- index.html:719-725 "New project", "Name", "9:16" -->
3. Tap **Create**. Your project opens. <!-- index.html:770 "Create"; js/home.js:3193 -->
4. Tap the big round **+** in the middle of the empty timeline. "Tap here to start creating" is written under it. The Add menu comes up. <!-- js/timeline.js:3447-3452 plus icon and label; js/timeline.js:2795 addRowLabel() "Tap here to start creating" -->
5. Tap the **Media** tab. <!-- js/addmenu.js:377 key 'media' label 'Media' -->
6. Tap **Import media**, then pick a video or photo from your phone. <!-- js/addmenu.js:423 "Import media" -->
7. Your clip lands on the timeline already selected, with its options open underneath. <!-- js/app.js:3099 scene.selectedId = layer.id -->
8. To watch it, tap the time counter (it reads 00:00:00 at the start). Tap it again to pause. <!-- index.html:557 #time-readout title "Tap: play / pause" -->
9. Tap the back arrow at the top left **once**. That closes the clip's options. A second tap would take you to Home. <!-- index.html:338 #m-back (a back chevron); styles.css:4214 body.m-editing hides #m-export while a clip is selected -->
10. Tap the up-arrow button at the top right. This is Export. <!-- index.html:395 #m-export aria-label="Export" -->
11. Tap **Export MP4** and wait. <!-- index.html:958 "Export MP4" -->
12. When **Export ready** shows, tap **Save**, then choose the option in your phone's sheet that saves the video. If no sheet appears, the video went to your Downloads. If you close the sheet by mistake, tap **Save** again. <!-- index.html:832, 840 "Export ready", "Save"; js/exporter.js:55-60 share sheet, falls back to a download -->

On a computer: the Add panel is already open while nothing is selected, so there is no big **+** to click. That is phone only. Click its **Media** tab, then **Import media**, or drag a video or photo onto the picture. Skip step 9: on a computer the back arrow goes straight to Home, and Export is always showing. Export is the up-arrow near the right end of the row under the picture, the third button from the end. <!-- js/timeline.js:2864 isEmptyStart() is isPhoneNow() && no layers; js/addmenu.js:377, 423; index.html:423 "Drag a video or image here"; index.html:267 #btn-back "Back to projects"; index.html:332 #btn-export; js/app.js:7737 order btn-export, btn-opts, btn-amfit; styles.css:4214 hides #m-export only under body.m-editing -->

Tip: Past imports show as tiles in the **Media** tab. Tap one to add it again. <!-- js/addmenu.js:458-461 libEntries -->

If it doesn't work: Tapping **Import media** closes the Add menu. If you back out of your phone's picker, tap "Tap here to start creating" again, then **Media**, then **Import media**. <!-- js/addmenu.js:69 fileImport opens the picker; js/timeline.js:2795 -->
