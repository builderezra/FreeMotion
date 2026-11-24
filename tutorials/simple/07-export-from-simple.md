# Export from Simple

You'll be able to turn your project into a video file and save it to your phone.

Before you start: a project in Simple with a clip in it.

1. Tap the **up-arrow** at the top right. The Export panel opens, with a picture of your video and its length. <!-- js/simple-tools.js openExport, exportPanel -->
2. Under **Quality**, pick a size. It starts on your project's own size. <!-- js/simple-tools.js exportRungs, exportInit -->
3. Under **Smoothness**, pick the frames a second. It starts on your project's own rate, the one with a dot under it. <!-- js/simple-tools.js exportRates, exportSeg (.sm-exp-own) -->
4. Read the line above the button: it says about how big the file will be. Then tap **Save video**. <!-- js/simple-tools.js exportSizeText, exportGo -->
5. A bar shows progress. When it finishes, an **Export ready** card shows the first frame and the file name, with **Discard** and **Save**. Tap **Save** and choose where it goes (on an iPhone: Save Video or Save to Files). <!-- js/app.js showExportReady; NOT WALKED: this laptop's browser cannot encode H.264 video -->

Tip: **4K** is always in the list. On a smaller project it makes a bigger file with the same picture enlarged, so pick it only if you need a 4K file. <!-- his words, 24 Nov: "just put the option there"; js/exporter.js draws the frame at its own size and scales it into the file -->

If it doesn't work: If a message says the size is too big for an MP4 on this device, pick a smaller one under **Quality** and tap **Save video** again. <!-- js/app.js offerSmallerMp4, the one-tap branch --> While the bar is moving, do not switch editors; wait for it to finish. <!-- tutorial 01's note -->

## Verification
| step | checked against the code on 24 Nov (land/s13; not walked in a browser: written beside a ship) | where |
|---|---|---|
| 1 | the Export button opens Simple's own panel, not the Full editor's dialog | js/simple-tools.js openExport, exportPanel |
| 2 | Quality: 720p, 1080p, 4K and the project's own size; it opens on the project's own | js/simple-tools.js exportRungs, exportInit |
| 3 | Smoothness: the Full editor's rates and the project's own, marked | js/simple-tools.js exportRates, exportSeg |
| 4 | the size line, Save video | js/simple-tools.js exportSizeText, exportGo |
| 5 | the ready card with Discard and Save | js/app.js showExportReady |
