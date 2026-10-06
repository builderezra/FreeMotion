# T3F: fixes for tutorials 07-10 (fce481bd), PM spot-check against v17.23 code

Apply exactly, keep each citation, push tutorials-drafts. Item 10 is URGENT: as written, its steps permanently delete the user's ORIGINAL project.

## tutorials/07-add-an-effect-or-filter.md (fix)
- **Claim:** Line 10, step 6: "Tap the **Gaussian Blur** row to open it."
  **Problem:** A newly added effect is already open when you land back on the stack. Tapping its row header toggles it, so following this step closes the ruler the beginner is about to use.
  **Replace with:** 6. The **Gaussian Blur** row is already open, with its ruler showing. Drag the ruler left to raise the blur, or tap the number and type one. (Tapping the row's name closes it. Tap again to reopen.)
  **Evidence:** js/fx-browser.js:256-257 (`dest.forEach(e => { e._expanded = false; }); inst._expanded = true;` on every add, including the batch commit); js/inspector.js:1748 `fx._expanded = !expanded;` and 1754: a click on the head calls toggle()
- **Claim:** Line 13, step 9: "Tap one or more pictures, then **Add 1 filter**. Open the filter. **Strength** starts at 1."
  **Problem:** Add puts you back on the Visual tab with the new filter already open. "Open the filter" makes the user tap it, which closes it (the same toggle as step 6).
  **Replace with:** 9. For a ready-made look, tap **Filters** at the top. Tap one or more pictures, then **Add 1 filter**. You are taken back to **Visual** with the filter already open. **Strength** starts at 1. Drag its ruler right to fade the look toward 0.
  **Evidence:** js/inspector.js:2124-2125 (applyFilter: other rows closed, `fitted._expanded = true`); js/inspector.js:2230 `fxTab = 'visual'` after the commit; js/compositor.js:1646 Strength 0..1 def 1; js/inspector.js:979-990 the ruler is reversed (drag right lowers)

## tutorials/08-speed-up-or-slow-down.md (fix)
- **Claim:** Line 9, step 5: "Type **50** to go the other way. The clip plays at half speed and its bar gets twice as long."
  **Problem:** Step 5 starts from the 200% state of step 4. Going from 200 to 50 makes the bar FOUR times as long as it was on screen (twice its ORIGINAL length), so the user sees something different from what the step says.
  **Replace with:** 5. Type **50** to go the other way. The clip plays at half speed, and its bar grows to twice its original length (four times what it was at 200).
  **Evidence:** js/inspector.js:6022-6024: `span = layer.duration * FM.speedAt(...)`; `layer.duration = span / sp`. At 200%, duration D/2 gives span D; at 0.5 that is 2D. The clamp at 6030 is (srcDur - trimStart)/sp, which is also 2D for a full-length clip.
- **Claim:** Line 16, Tip: "The diamond on the left of the Speed panel adds a keyframe, so the speed can change during the clip (a speed ramp)."
  **Problem:** This strands a beginner. One diamond changes nothing you can see. Also, once the speed has a keyframe, typing a speed no longer changes the bar length. A user who tries the tip and then repeats step 4 sees the bar stay put and thinks the app is broken.
  **Replace with:** Tip: For a speed ramp, tap the diamond on the left of the Speed panel, move the playhead, then type a new speed. That adds a second diamond, and the speed changes between the two. While the speed has diamonds, the clip's length stays fixed. Tap a diamond again to remove it.
  **Evidence:** js/inspector.js:6018-6020 (`if (FM.isAnimated(layer.speed)) FM.setProp(...)   // ramp: writes/updates a keyframe at the playhead; clip window stays fixed`); js/inspector.js:5931 (the diamond removes the keyframe when one is at the playhead); js/inspector.js:6050 (the on-screen hint about the ramp keeping the length fixed)

## tutorials/09-export-options.md (fix)
- **Claim:** Line 11, step 7: "**Range** is Whole project, Loop region (if set), or Selected clip only. **Selected clip only** needs a clip selected first."
  **Problem:** This is a dead end on a phone. Export is hidden while anything is selected (step 1 even tells the user to deselect), and opening a project from Home clears the selection. So on a phone 'Selected clip only' is always greyed out, and a beginner who goes back to select a clip finds the Export button gone.
  **Replace with:** 7. **Range** is Whole project or Loop region (if set). **Selected clip only** stays greyed out on a phone, because the Export button only shows when nothing is selected. To export one layer by itself, tap **Export just this layer** and pick it. (On a computer, select the clip first and the option works.)
  **Evidence:** js/app.js:5707-5708 (`clipOpt.disabled = !selLayer`); styles.css:4214 (`body.m-editing … #m-export … display:none`) and styles.css:4234 (sel-mode hides #m-export); js/mobile.js:365 (m-export is the phone's only in-editor route); js/storage.js:2537 (opening a project from Home's 'Export video…' clears selectedId); js/app.js:5828-5836 (the 'Export just this layer' picker lists the layers)
- **Claim:** Line 13, step 9: "The other formats go straight to your phone's share sheet or to Downloads."
  **Problem:** Only MP4 ever uses the share sheet (through Save on the Export ready card). GIF, PNG frames, This frame and both audio formats are plain link downloads and never open the share sheet. The app's own status text says 'saved to your Downloads'.
  **Replace with:** 9. For MP4 a card says **Export ready**. Tap **Save** and your phone's share sheet opens so you can pick where it goes (if it can't open, the file goes to Downloads). The other formats skip the card and download straight to your Downloads.
  **Evidence:** js/exporter.js:66-75 (deliver(): navigator.share, falling back to download, used only by the MP4 path at 1623/1626); js/exporter.js:1730 (GIF download()); js/exporter.js:1800 (frames ZIP download()); js/app.js:6001 (audio `a.download`); js/app.js:4288 (This frame `a.download`); js/app.js:6199-6200 ('Done — saved to your Downloads.' for every non-MP4 format)
- **Claim:** Line 19: "A GIF is capped at 640 pixels wide, 50 frames per second and 256 colours."
  **Problem:** The cap is on the LONGEST side, not the width. A tall 9:16 phone project comes out 360×640, not 640 wide.
  **Replace with:** If it doesn't work: A GIF is capped at 640 pixels on its longest side (a tall phone video comes out 360 × 640), 50 frames per second and 256 colours. The box tells you so when you pick it.
  **Evidence:** js/exporter.js:1673-1678 (`const cap = opts.maxWidth || 640; // longest-side ceiling`; `const longest = Math.max(outW, outH)`, then both sides are scaled by cap/longest); index.html:955 (the note itself says 'max 640px', not 'wide')

## tutorials/10-your-projects.md (fix)
- **Claim:** Lines 7-9, steps 3-5 on the same card: "Tap **Rename…** … Tap **Duplicate** to make a copy … Tap **Delete…** … Tap **Delete** to remove it for good."
  **Problem:** This is destructive for a beginner who follows the steps in order. The ⋯ menu closes after each action, so the user reopens it on the card they started with, and step 5 then permanently deletes their ORIGINAL project, not the copy. The steps also never say the menu has to be reopened.
  **Replace with:** 4. Open the menu again and tap **Duplicate** to make a copy. It appears at the top of the list, with "copy" added to its name.
5. To practise deleting, open the menu on the **copy** and tap **Delete…**. A box asks you to confirm and says "This cannot be undone." Tap **Delete** to remove it for good.
  **Evidence:** js/contextmenu.js:142 (every menu item calls `FM.contextMenu.hide(true)` before its action); js/storage.js:2617 (name + ' copy') and js/storage.js:2655 (`idx.unshift(card)`: the copy is listed first); js/home.js:1427 (revealCard(made.id)); js/home.js:1518-1527 (Delete…: 'Delete "<name>"? This cannot be undone.', ok 'Delete', then FM.projects.remove; there is no trash or undelete anywhere in storage.js or home.js)
