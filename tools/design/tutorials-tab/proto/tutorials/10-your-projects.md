# Your projects: find, rename, copy, delete, undo

You'll be able to manage your projects on Home, and undo or redo while you edit.

1. Your projects are saved on this device automatically as you work. On Home, tap the **Projects** tab. Each project is a card. Tap a card to open it.
2. On a card, tap the small three-dots button at the right. A menu opens.
3. Tap **Rename…**, type the new name, and tap **Rename**.
4. Open the menu again and tap **Duplicate** to make a copy. It appears at the top of the list, with "copy" added to its name.
5. To practise deleting, open the menu on the **copy** and tap **Delete…**. A box asks you to confirm and says "This cannot be undone." Tap **Delete** to remove it for good.
6. To act on several at once, tap **Select…** in the menu and tick the cards.
7. To get back to Home from a project, tap the back arrow at the top left. If a clip is selected, the first tap only closes its options, so tap again.
8. While editing, look at the right half of the row with the time counter. There are two curved arrows side by side. The left one undoes your last change. The right one redoes it.

On a computer: the back arrow, at the left end of the row with the time counter, goes straight to Home. Undo is **Ctrl+Z** (**Cmd+Z** on a Mac). Redo is **Ctrl+Shift+Z** (**Cmd+Shift+Z**).

Tip: Duplicate a project before you try something risky. Delete cannot be undone, but undo does work inside a project.

If it doesn't work: Undo remembers about the last 120 changes. A project you have deleted from Home cannot be brought back.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1 autosave | js/storage.js:1 | yes |
| 1 Projects tab | index.html:703 | yes |
| 2 card menu button 'Project actions' | js/home.js:1385 | yes |
| 3 Rename… / Rename project dialog / Rename | js/home.js:1396 | yes |
| 4 Duplicate | js/home.js:1420 | yes |
| 4 name + ' copy' | js/storage.js:2617 | yes |
| 5 Delete… confirm 'This cannot be undone.' | js/home.js:1523 | yes |
| 5 Delete button | js/home.js:1523 | yes |
| 6 Select… | js/home.js:1484 | yes |
| 7 phone back arrow ladder | js/mobile.js:342 | yes |
| 7 desktop back goes Home | js/app.js:6909 | yes |
| 8 undo button, left of redo | index.html:560 | yes |
| 8 redo button | index.html:561 | yes |
| 8 undo click | js/app.js:7162 | yes |
| PC keys: Ctrl/Cmd+Z, +Shift redo | js/app.js:8853 | yes |
| If: 120 snapshots | js/history.js:298 | yes |
| 4-5 menu closes after each action; copy listed first; delete is permanent | js/contextmenu.js:142, js/storage.js:2617, 2655, js/home.js:1427, 1518-1527 | yes |
