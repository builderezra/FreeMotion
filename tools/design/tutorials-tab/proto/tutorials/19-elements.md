# Save a reusable element and drop it into any project

You'll be able to save a title or logo once and add it to any project.

1. Make a project that holds only the thing you want to reuse, such as your title. Go Home with the back arrow at the top left (the first tap only deselects a clip).
2. On the **Projects** tab, tap the three dots on that project's card and choose **Save as element…**. Name it and tap **Save**.
3. Open the project you want to add it to. Tap the add row, then the **Elements** tab.
4. Tap the card called **Custom elements** (four small squares). If you can't see it, swipe the tiles sideways. A browser opens with a search box. Tap your element. A message says **Inserted** and its name.
5. Your element arrives as new layers on top, starting where the playhead is (slide the timeline to the right spot before step 3). Move, resize or restyle them like any layer.
6. To change the saved element itself, go Home and open the **Elements** tab. Tap its card. A message says **Editing** and its name. Your changes save back when you go Home. Projects you already added it to keep their own copy.
7. To delete one, press and hold it in the browser from step 4, or open the three dots on its card on Home and choose **Delete element…**.

On a computer: the same. Right-click an element in the browser to delete it.

Tip: On the **Elements** tab on Home, the three dots also offer **Add to the open project**.

If it doesn't work: If the browser says **No elements yet**, you haven't saved one. Do steps 1 and 2 first.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 2 Save as element… on a project card | js/home.js:1478 | yes |
| 2 name box and Save | js/home.js:1479 | yes |
| 3 Elements tab in the Add menu | js/addmenu.js:238 | yes |
| 4 Custom elements card | js/addmenu.js:303 | yes |
| 4 it opens the elements browser | js/addmenu.js:320 | yes |
| 4 search box | js/elements-browser.js:146 | yes |
| 4 tapping a tile inserts it; Inserted message | js/elements-browser.js:35 | yes |
| 6 Elements tab tap = edit; Editing message | js/home.js:2139 | yes |
| 7 press and hold deletes | js/elements-browser.js:65 | yes |
| 7 right-click deletes | js/elements-browser.js:64 | yes |
| 7 Delete element… | js/home.js:2109 | yes |
| Tip: Add to the open project | js/home.js:2104 | yes |
| If: No elements yet | js/elements-browser.js:89 | yes |
| 4 Custom elements is the last tile, usually on a later page | js/addmenu.js:174-330, :1325 | yes |
| 5 inserted on top at the playhead; copies are independent | js/storage.js:3620-3625 | yes |
