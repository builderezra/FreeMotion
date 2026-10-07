# Make a first video in Simple

You'll be able to put clips and photos one after another, watch the result, and get to Export.

Before you start: switch the project to Simple (tutorial 01). <!-- shots/02-02.jpg -->

1. Open or create a project (9:16 suits a phone), and switch it to Simple. The empty clip row shows a dashed **+** button. <!-- js/simple-timeline.js:289-293 the + at the end of the clip row; shots/02-02.jpg -->
2. Tap the **+**. Your phone's picker opens. Pick one or more clips and photos in one go. They are laid end to end, in the order you picked them, starting at the beginning. <!-- js/simple-timeline.js:293 pickFiles; js/spine-edit.js:1058 planAppend; walked: a clip then a photo came out as 0 to 6 s, 6 to 11 s; shots/02-03.jpg -->
3. To watch it, tap the time counter (00:00:00) once. Tap it again to pause. Don't press and hold it: that turns looping on or off instead. <!-- js/app.js:6773-6792 hold = loop; walked: time ran from 0 to 2.6 s, class fm-playing; shots/02-04.jpg, 02-05.jpg -->
4. To change one clip, tap it. Its tools appear in the row above the bottom row: **Length**, **Move earlier**, **Move later**, **Lift off**, **More**, **Delete**. Tap empty space in the timeline to let go of it. <!-- js/simple-tools.js:trayFor ~196-235; walked: shots/02-06.jpg -->
5. To add more later, tap **Clips** in the bottom row (or the **+** at the end). With the playhead inside your video it asks **At the end** or **After** the clip you are on. <!-- js/simple-tools.js:158-175 clipsTool; Read only, not walked -->
6. When you're happy, tap the up-arrow at the top right. That is Export; it opens the same export card as the Full editor. <!-- index.html:395 #m-export; walked: the card opened, shots/02-07.jpg -->
7. Tap **Export MP4**, then **Save** when it says Export ready. <!-- not walked: Export MP4 freezes the tab in this container (no H.264 encoder); not known on a phone. Same steps as tutorial 01 step 11-12 -->

Tip: A photo comes in five seconds long until you change its length (tutorial 03). <!-- walked: the photo came in as 5 s -->

If it doesn't work: Tapping **+** or **Clips** and cancelling the picker adds nothing. If you tap the back arrow while a clip is selected, it takes you to the Projects screen at once (it does not first close the clip's tools as it does in Full); your work is saved, tap the project to come back. <!-- js/mobile.js:354-362; js/app.js:1013-1026; see walk-simple.md finding 1 -->

## Verification
| step | what I did | what happened | file:line |
|---|---|---|---|
| 2 | tapped +, picked clip.webm and photo.png | 2 layers; video 0 to 6 s, photo 6 to 11 s | js/spine-edit.js:1058 |
| 3 | tapped the counter, waited 2 s | FM.time 0 to 2.62, body `fm-playing`; second tap stopped it at 3.17 s | js/app.js:6773-6792 |
| 4 | tapped the clip | tray with six tools | js/simple-tools.js:196-235 |
| 6 | tapped the up-arrow | export card (format, size, frame rate, quality, range, solo, Export MP4) | index.html:395 |
| 7 | not walked | codec missing here | — |
