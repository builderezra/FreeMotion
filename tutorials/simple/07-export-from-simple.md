# Export from Simple

You'll be able to turn your project into a video file (or a single picture) and save it to your phone.

Before you start: a project in Simple with a clip in it. <!-- shots/07-01.jpg -->

1. Tap the **up-arrow** at the top right (it is the same button in Simple and in Full). The Export box opens. <!-- walked: exp=true; the button is the same one in both editors; shots/07-01.jpg -->
2. Read the box from the top. **Format** is **MP4 video** (a normal video), **Animated GIF**, **PNG frames (ZIP)**, **This frame (PNG)** (one still picture), or **Audio only** (WAV or M4A). <!-- index.html:870-878; walked: the six options listed from the dropdown; shots/07-01.jpg -->
3. **Resolution** and **Frame rate** both start as "Same as project". **Quality** is High, Medium or Low. **Range** is the Whole project, or the Loop region if you set one, or the Selected clip only. <!-- index.html:897, 911, 949, 956-959; walked: the options of each list were read; whether High / Medium / Low changes the picture was not measured --> Leave them as they are for a normal export.
4. Tap **Export MP4**. A bar shows progress. When it finishes an **Export ready** card shows the first frame and the file name, with **Discard** and **Save**. Tap **Save** and choose where it goes (on an iPhone: Save Video or Save to Files). <!-- index.html:850-860; js/app.js:6258 showExportReady; NOT WALKED: this browser cannot encode H.264 video, so the MP4 never started (T9 saw the page stop answering here) -->
5. For one picture instead: pick **This frame (PNG)** first. The button now says **Save frame**. Tap it and the picture goes to your phone's save sheet. <!-- js/app.js:5929 the label; walked: with the dropdown set by a script, because a headless browser cannot open a phone's list; the box closed and the project was untouched; what the phone then shows was not seen; shots/07-02.jpg, 07-03.jpg -->

Tip: Slide the timeline first if you want a particular frame. **This frame** takes the one under the line. <!-- js/app.js:6221-6225 the PNG branch; not measured which time it takes -->

If it doesn't work: A yellow note at the top that says "This export will have no sound" means this browser cannot make the sound track; the picture will be fine. Open FreeMotion in Safari and export there if you need the sound. <!-- js/app.js:5815-5827; walked: the note showed here for a clip with sound --> If the bar stops for a long time, do not switch editors; wait for it to finish (the Simple/Full switch says "Wait for the export to finish"). <!-- tutorial 01's note, js/app.js:8395-8440 -->

## Verification
| step | what I did (380 px, branch 980-p22-r3, v17.24) | what happened | file:line |
|---|---|---|---|
| 1 | tapped the up-arrow in Simple | Export box open | index.html:866-978 |
| 2 to 3 | read each list | Format, Resolution, Frame rate, Quality, Range options | index.html:870-959 |
| 4 | Export MP4 | not walked (no H.264 here) | js/app.js:6258 |
| 5 | chose This frame (PNG) by script, tapped Save frame | box closed | js/app.js:5929 |
| no-sound note | seen | yellow note | js/app.js:5815-5827 |
