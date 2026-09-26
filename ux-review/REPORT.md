# FreeMotion UX review (v16.90, 24-25 Sep 2026)

86 findings: 12 high, 56 medium, 16 low, 17 of them bugs found by accident.
Review bots used the app like a person, mostly on a 390px phone, plus desktop and five other screen sizes. Nobody read the code. Every fix keeps the feature.

## Start here

1. **Tapping a layer on the preview doesn't select it, and a stray drag pans the whole canvas** (high · Checked by Claude + 2 bots (phone touch, desktop mouse))
   Tapping a layer on the preview does nothing and nothing says why, so a new user thinks the app is broken. That's by your design (v2.93: layers are picked from the timeline); what's missing is the hint.
   *Fix:* Keep the rule. The first few times a preview tap does nothing, show "Pick layers from the timeline below" and pulse the rows.

2. **Dragging an animated layer on the preview moves the whole animation, not the keyframe you're on** (high · Found by 2 bots (phone and desktop))
   Dragging an animated layer on the preview moves its whole animation, as you chose in v3.00. Both bots expected it to edit the keyframe at the playhead, and nothing on screen says which one happened.
   *Fix:* Keep the rule. Show the motion path while dragging, and toast "Moved the whole animation (2 keyframes)" with a pointer to Move & Transform.

3. **The big keyframe button (and the small X/Y diamonds) show stale state after the playhead moves** (high · Checked by Claude + 1 bot)
   The big keyframe diamond keeps its old state until the panel redraws. At 1:07, with the only keyframe at 0:00, it showed gold "Remove keyframe", and tapping it added one. The opposite case deletes a keyframe you meant to keep.
   *Fix:* Refresh the diamond's colour, fill and label on every playhead change: scrub, play, typed time and the skip buttons.

4. **There is no play button; play/pause hides behind tapping the time readout** (high · Checked by Claude + 1 bot)
   Play lives in the 00:00:00 time pill, as you asked in queue 364. Nothing on a phone says the pill is tappable, and the project length isn't shown anywhere.
   *Fix:* Your call, with pictures first: a small play/pause glyph inside the pill, plus "current / total".

5. **Moving a clip in time needs a hold nobody tells you about (a quick drag scrubs or trims instead)** (high · Checked by Claude on phone and desktop)
   A quick drag on a clip scrubs the playhead on a phone, and trims the clip's end with a mouse. Holding for about 0.7 s first does move it. Two bots decided clips can't be moved at all, which shows how hidden the hold is.
   *Fix:* Show "Hold, then drag to move" after the first quick drag, and lift the clip visibly when the hold kicks in. On desktop, let a plain drag on the body move the clip.

6. **Importing several photos at once stacks them all at 0:00 instead of one after another** (high · Confirmed by a 2nd bot)
   Picking several photos in one go drops them all at 0:00, stacked on top of each other, so a 3-photo slideshow starts with 14 steps of trimming and moving.
   *Fix:* Lay them end to end in the order picked, and offer "Stack them instead?" in the toast.

7. **A finished export gives you nothing: no toast, no "done", no file name, no way to know it worked** (high · Confirmed by a 2nd bot)
   The "Exporting... NN%" box disappears at 100% with no tick, no file name and no "saved", so a finished export looks exactly like a failed one.
   *Fix:* End on a success state for a couple of seconds ("GIF saved, 2.1 MB") and leave a toast behind, with Share or Open where the phone allows it.

8. **You can't move the playhead past the current end, so the trim tools can't make a project longer** (high · Confirmed by a 2nd bot)
   In a 5 s project, typing 6 into the time readout snaps back to 5 s, and Extend end to playhead then says there's nothing to extend into. The only way to make the project longer is an unreliable drag on the clip.
   *Fix:* Let the playhead run past the end and let Extend grow the project. At minimum, ask "Extend the project to 6 s?" when a typed time is past the end.

9. **First imported photo silently overrides the aspect ratio I just picked** (high · Confirmed by a 2nd bot)
   Pick 9:16 Phone, import a 4:5 or 16:9 photo first, and the canvas quietly becomes 4:5 or 16:9. Nothing says so. Someone making a Reel finds out at export.
   *Fix:* Only auto-match the first media for Custom / Auto projects. Otherwise keep 9:16 and fit the photo, or toast "Canvas changed to 16:9, Keep 9:16".

10. **You can't type an exact number for position, size or rotation (only Opacity takes typing)** (medium · Found by 2 bots (phone and desktop))
   Opacity takes typing, but X, Y, Width, Height and Rotation only change by dragging at about 1 unit per pixel, so centring something at X 540 is guesswork. The same on phone and desktop.
   *Fix:* Reuse the Opacity field everywhere: tap the number to type, Enter commits, and drag-to-scrub stays. On desktop add arrow keys and the wheel.

11. **Long paragraph of text overflows the canvas with no wrap and no warning** (high · Confirmed by a 2nd bot)
   A pasted 300-character caption wraps nicely in the typing box but renders on the canvas as one giant line running far past both edges.
   *Fix:* Give text layers a box width with side handles so text wraps inside it by default. At minimum, warn or auto-shrink when text leaves the frame.

12. **Tapping a template opens the template itself for editing, not a new project from it** (medium · Confirmed by a 2nd bot)
   In every template gallery a tap means "use this". Here it opens the master template for editing, with only a short toast saying so, and every later project made from it inherits the change.
   *Fix:* Tap = new project from this template. Move "Edit template" into its "..." menu, and show a TEMPLATE chip in the editor header while editing one.

## How long everyday jobs take (taps from the home screen)

| Job | Taps | Why |
|---|---|---|
| Title card | 18 | Fast, thanks to text's built-in Animate presets. Fade in defaults to letter-by-letter, which costs 2 taps. |
| Photo slideshow (3 photos, fades) | 43 | The most expensive by far. Photos stack at 0:00, the playhead can't pass the end, and every crossfade is built by hand. |
| Lower third (bar + name sliding in and out) | 36 | The slide animation is built twice by hand, once for the bar and once for the text, because shapes have no Animate presets. |
| Music + cut to the music's end | 13 | No wasted taps. Skip to clip edge, then Extend end to playhead: the app's best editing idiom. |

## Home & projects

### Custom background swatch looks like a second black swatch
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** + New project dialog, Background row, 5th swatch
- **What happened:** Opened New project. The Background row shows Black, White, Green, Transparent (checkerboard), then a 5th square that is a solid black rectangle in a grey frame. Its accessible label is "Custom background colour" but nothing visible says so: no label, no "+", no rainbow. It looks like a duplicate of the Black swatch next to it, with square corners where the others are rounded. It also mirrors whatever preset you pick: after tapping White, the 5th swatch turns white too, so it always looks like a copy of the selected swatch.
- **Why it matters:** A first-time user either ignores it (thinks it's a duplicate) or taps it expecting black. The custom-colour feature is effectively hidden.
- **Suggested fix:** Draw the 5th swatch as a colour-wheel / rainbow ring with a small "+" or pipette until a custom colour is picked, then show the chosen colour inside the ring (recommended). Alternatively add a tiny "Custom" caption under it. Match the corner radius of the other swatches.
- **Screenshots:** [A-home-11-new-dialog.webp](shots/A-home-11-new-dialog.webp), [A-home-12-swatches-zoom.webp](shots/A-home-12-swatches-zoom.webp)

### Picking a White background gives invisible white text
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** New project dialog (Background = White) followed by the first thing a user does in the editor (add Text)
- **What happened:** New project, 16:9, 60 fps, Background = White, Create. Tapped "Tap here to start creating", Text, typed "Summer 2026", Done. The canvas shows only an empty selection box. Colouring confirms the text is #FFFFFF on a #FFFFFF canvas. Switching the text to black made it appear.
- **Why it matters:** The very first text a new user types on a light background seems to vanish, which reads as "typing didn't work". The dialog offered White as a first-class choice, so this path is common.
- **Suggested fix:** When the project background is light (white, or a custom colour with high luminance), default new text and shapes to black / a dark colour (recommended). Alternative: keep white but add a thin contrasting outline on new text until the user picks a colour.
- **Screenshots:** [A-home-28-holiday-settings.webp](shots/A-home-28-holiday-settings.webp), [A-home-33-text-zoom.webp](shots/A-home-33-text-zoom.webp)

### New project name is not selected, so typing appends ("Project 3Holiday")
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** New project dialog, Name field
- **What happened:** Opened New project. Name is pre-filled "Project 3". Tapped the field and typed "Holiday": result "Project 3Holiday". The caret lands at the end and the default text is not selected, and there is no clear (x) button. Clearing it on a phone keyboard is 9 backspaces. By contrast the "Save as template" dialog DOES pre-select its default name, so typing replaces it.
- **Why it matters:** Naming a project is the one thing almost everyone does in this dialog, and it costs extra taps or produces a mangled name.
- **Suggested fix:** Select-all on first focus, same as the Save-as-template dialog (recommended). Or show the default as a placeholder and use it only if the field is left empty. Add a small clear (x) inside the field.
- **Screenshots:** [A-home-26-name-focus.webp](shots/A-home-26-name-focus.webp), [A-home-27-name-typed.webp](shots/A-home-27-name-typed.webp)

### Just opening an element and coming back blanks its thumbnail (and it edits on black)
- **Impact:** MEDIUM (BUG) · Found by 1 bot
- **Where:** Home > Elements tab, tap an element card, then Back
- **What happened:** Saved a project whose only layer is black "Summer 2026" text on white as an element. Elements tab thumbnail correctly shows the text on white. Tapped the element: it opens in the editor on a solid black square canvas, so the black text is invisible (only the Text clip on the timeline proves it is there). Pressed Back without touching anything: the element's thumbnail is now a plain black square. Reproduced twice ("Summer title" and "Title two").
- **Why it matters:** A library of saved pieces is only useful if you can recognise them. After one look, every dark-content element becomes an identical black tile, and editing it is done blind.
- **Suggested fix:** Show elements on a transparency checkerboard (or the colour of the project they came from) both in the element editor and in the thumbnail (recommended). Do not re-render the thumbnail when nothing changed. If a thumbnail would be a single flat colour, fall back to the checkerboard version.
- **Screenshots:** [A-home-71-elements-tab.webp](shots/A-home-71-elements-tab.webp), [A-home-75-element-editor-canvas.webp](shots/A-home-75-element-editor-canvas.webp)

### Elements tab has no + button when empty, and doesn't say how to make one
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Home > Elements tab (empty state)
- **What happened:** On a profile with no elements the Elements tab shows "No elements yet. An element is a saved piece, a watermark, a logo, a lower-third, that you drop into any edit." There is no + button (the tappable list has no "New element"). After I saved one element via a project's "..." > "Save as element...", a + appears on this tab and offers "Build a new one..." and "From an existing project...". So the two creation paths only become reachable once you already have an element. Templates' empty state, by contrast, keeps its + and says "Tap + to save a project as one, or use a project's ... menu."
- **Why it matters:** A curious new user on this tab hits a dead end: they learn what an element is but not how to make one, and the "Build a new one" path is invisible until they discover the other route.
- **Suggested fix:** Always show the + on Elements (recommended), and add a line to the empty state like the Templates one: "Tap + to build one, or use Save as element in a project's ... menu." Optionally put a "Build an element" button inside the empty state itself.
- **Screenshots:** [A-home-03-elements.webp](shots/A-home-03-elements.webp), [A-home-71-elements-tab.webp](shots/A-home-71-elements-tab.webp)

### Project "..." menu: 30 px rows, 10 items, no title; when it flips up it sits next to a different card
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Home > project card > "..." (Project actions)
- **What happened:** The menu has 10 text-only items (Open, Pin to top, Rename..., Duplicate, Save as template..., Save as element..., Select..., Export video..., Save project file..., Delete...). Rows are 30 px apart (measured 221, 251, 281...), well under a 44 px finger target; the template and element menus use the same 30 px rows. For cards low in the list the menu opens upward: for the 5th card (y=661) the menu's first item "Open" lands at y=340, right beside the 2nd card's "..." button, and for the 4th card the menu starts beside the 1st card. The menu never names the project it is for.
- **Why it matters:** Mis-taps between adjacent rows (Save as template vs Save as element, Export vs Save project file) are easy with a thumb, and a flipped menu reads as belonging to the wrong project, which matters for Delete.
- **Suggested fix:** On phones present this as a bottom sheet (recommended): project name + small thumbnail as the header, 48 px rows with icons, grouped (Open / Rename / Duplicate / Pin; Save as template / Save as element; Export video / Save project file; Delete). Keep the popover on desktop. At minimum, highlight the owning card while the menu is open and raise row height to 44 px.
- **Screenshots:** [A-home-39-project-menu.webp](shots/A-home-39-project-menu.webp), [A-home-43-menu-bottom-card.webp](shots/A-home-43-menu-bottom-card.webp)

### First open: an empty "Untitled" project marked OPEN is the only thing on screen, and names don't match
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Home > Projects on a fresh profile; also after deleting every project
- **What happened:** Fresh profile: the list already holds one card, "Untitled / 9:16 1080p 30fps 0 layers / edited just now", black thumbnail, "0:00", with an "OPEN" badge. There is no welcome line or hint; Templates is empty and Tutorials says "Tutorials are coming". Tapping + then proposes "Project 2" (and later "Project 3", "Project 6": the number is just the count, so names jump). Selecting all projects and deleting them instantly produces a new "Untitled" OPEN card, this time with a play-triangle placeholder and no "0 layers" text, so even the two empty cards differ. The auto-made project also ignores the dialog's remembered choices (it is 9:16 / 30 fps while the dialog had remembered 16:9 / 60 fps).
- **Why it matters:** The first screen a new user sees is a project they didn't make, with a status word ("OPEN") that reads like a button label. The "Untitled" vs "Project 2" mismatch looks unfinished. Deleting everything and getting a new project back feels like the delete failed.
- **Suggested fix:** (a, recommended) Keep the auto project behind the scenes but don't show it as a card until it has at least one layer; while the list is empty, show a first-run panel: "Make your first video" with the 9:16 / 16:9 / 1:1 tiles as big buttons plus "More options" (opens the full dialog). (b) If the card stays, name it "Project 1" so numbering is consistent, and change the badge from "OPEN" to "Last opened" or "Editing". (c) Name new projects by the next free number, not the count.
- **Screenshots:** [A-home-01-first-open.webp](shots/A-home-01-first-open.webp), [A-home-02-templates.webp](shots/A-home-02-templates.webp)

### Tapping a template opens the template itself for editing, not a new project from it
- **Impact:** MEDIUM · Confirmed by a 2nd bot
- **Where:** Home > Templates tab, tap a template card
- **What happened:** Tapped the "Blank vertical" template card. It opened the template in the editor; a toast says "Editing 'Blank vertical', your changes save back to it when you go Home". The toast covers the editor's main "Tap here to start creating" + button, and after ~3 s it is gone. From then on the header just says "Blank v..." and nothing shows you are editing a template rather than a project. Starting a project from the template needs the "..." > "New project from template" route instead. The same happens for elements (tap = edit the element, toast only).
- **Why it matters:** In every template gallery a tap means "use this". Here a user who meant to start a video edits the master template, and every later project made from it inherits the change.
- **Suggested fix:** Make a tap on a template card do "New project from template" (recommended) and move "Edit template" into its "..." menu. Alternatively, a tap opens a small sheet: "Use template" (primary) / "Edit template". In either case, while editing a template or element show a persistent chip in the editor header ("TEMPLATE" / "ELEMENT") instead of only a toast, and place that toast away from the + button.
- **Screenshots:** [A-home-103-tap-template.webp](shots/A-home-103-tap-template.webp), [A-home-104-template-editing-no-toast.webp](shots/A-home-104-template-editing-no-toast.webp)

### Duplicates are indistinguishable from the original
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Home > project "..." > Duplicate; Select mode > Duplicate
- **What happened:** Duplicated "Italy trip holiday reel with the family 2026". The copy is named "... 2026 copy", but titles are one line and truncate at about 26 characters, so both cards read "Italy trip holiday reel with..." with the same thumbnail, same meta and same "edited just now". No toast for a single duplicate and the new card is not highlighted. Searching "italy" returns the two identical-looking cards. Even in Select mode (where the "..." is hidden and the title gets more room) the suffix is still cut off. The editor header also truncates to "Italy trip..." so you can't tell which one you opened.
- **Why it matters:** Duplicate is typically used to make a variant; if you can't tell which is which you edit the wrong one.
- **Suggested fix:** Put the marker at the start: "Copy of Italy trip..." or add a small "Copy" chip next to the meta (recommended). Allow the title to wrap to two lines. After duplicating, scroll to and briefly highlight the new card and show a toast "Duplicated. Rename?" with a Rename button.
- **Screenshots:** [A-home-42-duplicated.webp](shots/A-home-42-duplicated.webp), [A-home-57-search-italy.webp](shots/A-home-57-search-italy.webp)

### Custom size field keeps showing a value the app silently clamped
- **Impact:** LOW (BUG) · Found by 1 bot
- **Where:** New project dialog, Aspect ratio = Custom, Width x Height fields
- **What happened:** Chose Custom, typed 99999 in Height. The Canvas summary line changed to "1200 x 7680" but the field itself still says 99999, also after leaving the field. No message says there is a maximum.
- **Why it matters:** Two numbers on the same dialog disagree. The user can't tell which one will be used or why.
- **Suggested fix:** On blur, write the clamped value back into the field and flash a one-line hint under it ("Max 7680 px"). Optionally show the limits as placeholder text or min/max hints.
- **Screenshots:** [A-home-16-custom-huge.webp](shots/A-home-16-custom-huge.webp), [A-home-17-custom-blur.webp](shots/A-home-17-custom-blur.webp)

### Custom aspect ratio always starts at 1080 x 1920, ignoring the preset you had picked
- **Impact:** LOW · Found by 1 bot
- **Where:** New project dialog, Aspect ratio = Custom
- **What happened:** Picked 16:9 (summary "1920 x 1080"), then Custom: fields show 1080 x 1920. Same after picking 1:1 (1080 x 1080) then Custom: 1080 x 1920. The tile's subtitle "Auto adjusts" does not explain what adjusts or when.
- **Why it matters:** The natural way to get "16:9 but 2560 wide" is to pick 16:9 then Custom and tweak one number; instead you have to retype both. "Auto adjusts" is unclear jargon on a primary choice.
- **Suggested fix:** Seed the Custom fields from whatever size was selected just before (recommended). Add a small lock-ratio toggle between the fields. Replace "Auto adjusts" with a plain subtitle such as "Any size" (or whatever it really does, e.g. "Fits first clip").
- **Screenshots:** [A-home-13-dialog-169.webp](shots/A-home-13-dialog-169.webp), [A-home-19-169-then-custom.webp](shots/A-home-19-169-then-custom.webp)

### Select mode: pinned card looks already selected, checkboxes inconsistent, two exits
- **Impact:** LOW · Found by 1 bot
- **Where:** Home > Select (or long-press a card)
- **What happened:** In Select mode the pinned "Untitled" card keeps its blue tint and blue edge, which is almost the same look as a selected card, so before tapping anything it looks selected. The unselected checkbox is a white ring on dark thumbnails but a solid grey disc on light thumbnails, which reads as "disabled" or "already chosen". The action bar wraps: "0 selected / Select all / Duplicate / Delete" on one line and "Cancel" alone on a second line, while a "Done" pill also appears in the header, so there are two exits that do the same thing. Bar buttons are 33 px tall. "Select all" stays "Select all" when everything is selected. The bulk-delete confirm says "Delete 1 project?" without naming it (the single delete from "..." does name it). Long-press to enter Select mode works well.
- **Why it matters:** Multi-select is where people delete things; the state of each card should be unambiguous.
- **Suggested fix:** In Select mode, drop the pinned tint (keep only the pin icon) (recommended). Use one checkbox style everywhere: white ring with a dark shadow/backing on any thumbnail. Keep one exit: the header "Done", and let the bar be a single row (count on the left, Duplicate + Delete on the right, 44 px tall); turn "Select all" into "Select none" when all are selected. Name the projects in the bulk delete confirm when there are 3 or fewer.
- **Screenshots:** [A-home-45-select-mode.webp](shots/A-home-45-select-mode.webp), [A-home-55-select-checkbox-zoom.webp](shots/A-home-55-select-checkbox-zoom.webp)

### Search never says "no results": a nonsense query shows every project
- **Impact:** LOW · Found by 1 bot
- **Where:** Home > search (magnifier)
- **What happened:** Search opens focused with a nice hint ("Vague is fine, yesterday, last week, 2 aug..."). "italy" correctly shows 2 matches. But "zzz" shows "Nothing matched 'zzz' exactly. Closest projects:" followed by all 5 projects; "yesterday" (nothing edited yesterday) also shows all 5. The same happens on Templates. The hint line disappears once you type, so the tabs and list jump up about 38 px.
- **Why it matters:** With a longer list, a user who mistypes sees a full list and assumes the filter is broken, or scrolls through unrelated projects.
- **Suggested fix:** Keep the "closest" fallback but only include items above a similarity threshold, capped at 3, and when none qualify show a clear "No projects match 'zzz'" empty state (recommended). Keep the hint line's space reserved (or show it under the field only while it is empty without collapsing) so the layout doesn't jump.
- **Screenshots:** [A-home-56-search.webp](shots/A-home-56-search.webp), [A-home-57-search-italy.webp](shots/A-home-57-search-italy.webp)

### Settings sheet: sorting is buried here, and six diagnostic report cards outweigh the real settings
- **Impact:** LOW · Found by 1 bot
- **Where:** Home > settings cog
- **What happened:** The sheet opens from the LEFT although the cog is at top-right. Order: Project sorting (Date/Name), New light look, Demo mode, Show touches, Show system fonts, Default layer duration, Default shape colour, Songs, Photos & videos, Playback quality, Import / Back up / Restore, Keyboard shortcuts, then six developer report cards ("Your last export", "Your last playback", "Your last project open" with a full device/frame log, "Your last scrub", "Your last Back from an effects category", "A clip with no picture"), each with a Copy button and "send me this" copy, then Live collaboration. The report cards take more than half the scroll length. "New light look" is described in changelog terms ("the new intro, and the new logo. Turn this off to go back to the dark look"). Project sorting, which changes the home list, only lives here; there is no sort control on the list itself.
- **Why it matters:** A normal user opening Settings has to scroll past debugging tools to find Backup/Restore, and the light/dark choice is phrased as a migration rather than a preference.
- **Suggested fix:** Add section headers (Appearance, Editing defaults, Library & storage, Backup, Help & diagnostics) and collapse all six report cards into one "Diagnostics" row that expands (recommended). Rename "New light look" to "Home theme: Light / Dark" as a segmented control. Add a small "Sort: Recent / Name" chip above the project list (keep the setting too). Slide the sheet in from the right, next to the cog.
- **Screenshots:** [A-home-62-settings.webp](shots/A-home-62-settings.webp), [A-home-63-settings-2.webp](shots/A-home-63-settings-2.webp)

### New project dialog: small action buttons and tiny number fields
- **Impact:** LOW · Found by 1 bot
- **Where:** New project dialog
- **What happened:** Cancel / Create are 78x35 and 76x35, right-aligned, while every other home dialog (Rename, Save as template, Save as element, Delete) uses full-width 151x44 buttons. Custom Width / Height fields are 66x26 and the Custom fps field is 66x26. Choosing "Custom..." fps adds a row and the whole dialog re-centres, shifting everything by ~19 px; choosing Custom aspect also shifts it by 5 px. Tapping the backdrop does not dismiss the dialog, which is good (settings aren't lost). The dialog nicely remembers last fps / background / aspect.
- **Why it matters:** Create is the most-tapped button in the app's entry flow and it is the smallest one; the number fields are hard to hit with a thumb.
- **Suggested fix:** Use the same two full-width 44 px buttons as the other dialogs (recommended). Make the number inputs at least 40 px tall with numeric keyboard. Anchor the dialog to the top (or bottom sheet) so rows appearing below don't move what's above.
- **Screenshots:** [A-home-11-new-dialog.webp](shots/A-home-11-new-dialog.webp), [A-home-14-dialog-custom.webp](shots/A-home-14-dialog-custom.webp)

### Square thumbnails hide the project's shape and crop its content; OPEN badge low contrast
- **Impact:** LOW · Found by 1 bot
- **Where:** Home project cards
- **What happened:** Projects in 9:16, 16:9, 1:1 and 4:5 all get the same 86x86 square thumbnail. The 16:9 "Summer 2026" title fills the square edge to edge (in the canvas it covers about half the width), so the sides are cropped; anything near a 16:9 edge or the top/bottom of a 9:16 would be lost. The "OPEN" badge is pale blue on a pale pill, hard to read on white thumbnails.
- **Why it matters:** The shape of a video is one of the quickest ways to recognise it (story vs YouTube vs post), and cropped thumbnails can hide what's in it.
- **Suggested fix:** Letterbox the thumbnail inside the square at its true ratio (recommended), on the checkerboard or card background. Give the badge a solid dark fill with white text on every thumbnail.
- **Screenshots:** [A-home-101-four-projects.webp](shots/A-home-101-four-projects.webp), [A-home-38-open-badge-zoom.webp](shots/A-home-38-open-badge-zoom.webp)

### Deletes have no undo, and menu actions from Home leave you somewhere else
- **Impact:** LOW · Found by 1 bot
- **Where:** Home project "..." > Delete / Export video...; Select mode > Delete
- **What happened:** Delete asks "This cannot be undone." and after confirming there is no undo toast (list just updates). Given the 30 px menu rows, "Delete..." sits one mis-tap below "Save project file...". "Export video..." from Home opens the project behind a dark Export dialog; pressing Cancel leaves you in the editor rather than back on Home where you started. "Save project file..." shows "Project file saved" without saying where.
- **Why it matters:** A permanent action with no safety net, next to a harmless one, on a phone. Being dropped into the editor after cancelling a Home action is disorienting.
- **Suggested fix:** Keep the confirm but add an "Undo" button to a 6-8 s toast after deleting (or a "Recently deleted" section kept for 7 days) (recommended). When Export is started from Home, Cancel/finish returns to Home. Say where the file went ("Saved to Downloads").
- **Screenshots:** [A-home-50-delete-confirm.webp](shots/A-home-50-delete-confirm.webp), [A-home-51-after-delete.webp](shots/A-home-51-after-delete.webp)

## Building

### First imported photo silently overrides the aspect ratio I just picked
- **Impact:** HIGH · Confirmed by a 2nd bot
- **Where:** New project dialog -> editor -> + -> Media -> Import (first media in an empty project)
- **What happened:** Made a new project with 9:16 Phone selected (the dialog even shows "1080 x 1920"). Imported a 4:5 photo as the first layer: Canvas settings now says 4:5, 1080 x 1350. Repeated in a second fresh 9:16 project with a 16:9 photo: the canvas became 16:9 landscape. No toast, no prompt, nothing in the top bar says the canvas changed; I only noticed because the preview frame got wider and the black 9:16 frame vanished. Fixing it costs 4 taps (cog-like Canvas settings icon, 9:16, Apply, and it reflows the layers). Undo does revert it, but only together with the import.
- **Why it matters:** I chose 9:16 on purpose one screen earlier (the dialog calls it "Phone"). The app throws that choice away without asking, and someone building a Reel/TikTok will only find out at export time.
- **Suggested fix:** Only auto-match the canvas to the first media when the project was created with Custom / Auto adjusts (the dialog already has that tile). For an explicit ratio, keep it and fit/fill the photo. (recommended) If auto-match stays for all, show a toast right after import: "Canvas changed to 16:9 to match your photo - Keep 9:16" with a one-tap revert.
- **Screenshots:** [B-build-02-new.webp](shots/B-build-02-new.webp), [B-build-06-photo-added.webp](shots/B-build-06-photo-added.webp)

### Tapping a layer on the preview doesn't select it, and a stray drag pans the whole canvas
- **Impact:** HIGH · Checked by Claude + 2 bots (phone touch, desktop mouse)
- **Where:** Editor preview (canvas), phone layout
- **What happened:** Phone (390px, touch): tapped the photo, video, text and star on the preview with a tap, a double-tap and a long-press. Nothing selects. If a layer is already selected, tapping a different one only deselects it. With nothing selected, a one-finger drag slides the canvas about 75 px down behind the toolbar, and double-tap doesn't bring it back. Desktop (mouse): the same. Clicking never selects, and dragging an unselected layer pans the view. Claude reproduced it on a fresh circle: tapping empty canvas deselects fine, tapping the circle itself does nothing.
- **Why it matters:** On a phone the preview is where your eyes and thumb are. Every other editor people know (Alight Motion, CapCut, Canva) selects what you tap. Here, moving the star you can see means: close panel, find the star row, tap it, then drag. And the "wrong" gesture silently moves the canvas, which reads as "the app broke".
- **Suggested fix:** Keep your rule that the preview never selects. What's missing is the explanation: the first few times a tap on the preview does nothing, show a one-line hint ("Pick layers from the timeline below") and briefly pulse the timeline rows (recommended). If you ever want to revisit the rule itself, the other option is a Settings switch, "Tap the preview to select", off by default. Separately, a stray one-finger drag panning the canvas out of frame could get a double-tap-to-fit.
- **Screenshots:** [main-13-tap-circle.webp](shots/main-13-tap-circle.webp), [B-build-73-drag-star-nosel.webp](shots/B-build-73-drag-star-nosel.webp), [F-desk-51-drag-unselected.webp](shots/F-desk-51-drag-unselected.webp)

### There is no play button; play/pause hides behind tapping the time readout
- **Impact:** HIGH · Checked by Claude + 1 bot
- **Where:** Bar under the preview, centre readout "00:00:00"
- **What happened:** Looked for a play button for my 10 s video. The bar has 9 controls (sliders, copy, a pill, ||, two circular arrows, a "fullscreen" frame) and none is a play triangle. Playing only works by tapping the "00:00:00" pill; the only hint is its tooltip ("Tap: play / pause - double-click: type"), which a phone never shows. While playing, the only state change is the pill's outline turning cyan (compare B-build-87 vs B-build-95-pb). Double-tapping it turns it into a text box showing "10.97" (seconds) while the pill itself showed "00:10:29" (seconds:frames), so the same time is written two different ways. The project length is nowhere on screen: "total 0:10" only exists in the tooltip.
- **Why it matters:** Play is the most-used control in any editor. A new user will hunt for it, and even Ezra's own muscle memory would not transfer to another device. "00:10:29" reads as ten and a bit seconds, not 10.97 s.
- **Suggested fix:** Keep the time pill as the play button, as you asked. The open question is only whether the pill should also show a small play/pause glyph so a first-time user knows it's tappable, plus the project length ("0:03 / 0:10"). That's a visual change, so per your rule it needs pictures of options first, not a build.
- **Screenshots:** [B-build-03-editor-empty.webp](shots/B-build-03-editor-empty.webp), [B-build-87-playing.webp](shots/B-build-87-playing.webp)

### Moving a clip in time needs a hold nobody tells you about (a quick drag scrubs or trims instead)
- **Impact:** HIGH · Checked by Claude on phone and desktop
- **Where:** Timeline, any clip, both the full multi-layer view and the isolated single-clip view (after selecting it)
- **What happened:** Phone: a quick drag on a clip's body scrubs the playhead instead of moving the clip. Desktop: a quick mouse drag on the clip body trims its right edge instead (desktop bot, 4 repros on 2 clips). Holding for about 0.7 s first and then dragging does move the clip on both. Claude checked: the circle clip moved from 0:00 to about 2 s on the phone, and the Star clip moved about 150 px later on desktop.
- **Why it matters:** Moving a clip in time is one of the most common edits there is. Two separate bots concluded it was impossible, which shows how invisible the hold is. On desktop the quick drag does something destructive instead.
- **Suggested fix:** The first time someone quick-drags a clip, show a one-line hint ("Hold, then drag to move") (recommended). Give the clip a visible lift (shadow, slight scale, haptic on phones) the moment the hold kicks in, so people learn it. On desktop, let a plain drag on the clip body move it and keep trimming for the edge handles only, with a move cursor on the body and a resize cursor on the edges.
- **Screenshots:** [main-14-holddrag-clip.webp](shots/main-14-holddrag-clip.webp), [main-32-desk-holddrag.webp](shots/main-32-desk-holddrag.webp), [F-desk-1b-33-drag-clip.webp](shots/F-desk-1b-33-drag-clip.webp)

### The bar under the preview is 9 unlabeled icons, several of which look like something else
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Transport bar under the preview (y=411), phone layout
- **What happened:** Tapped each icon to learn what it does: - sliders icon = "Timeline options", opens an unlabeled 8-icon strip over the preview (speed -/1x/+, loop, magnet, export in/out marks, clear). None of them has a text label. - two squares (reads as "copy") = "Layer actions" menu (Select all, Copy, Duplicate, Paste...). OK-ish. - a pill with a white dot (reads as a toggle switch or volume knob) = moves the "Tap to add a layer" row to the top/bottom of the timeline. A set-once preference sitting in the most valuable strip of the screen. - || = skip to clip edge, but with nothing selected they jump straight to 0:00 / end (from 9:02 one tap went to 0:00, skipping the 4.5 s and 5.0 s edges). Tooltip says "benchmark" (probably meant "bookmark"). - two circular arrows = Undo / Redo, but circular arrows usually mean refresh / rotate / reset. - a four-corner frame (universal "fullscreen" icon) = View options, which holds fit-to-screen, layers, camera, preview zoom, guides, and the TIMELINE zoom as two bare up/down arrows.
- **Why it matters:** Every icon needs a trial tap to learn, and three (pill, circular arrows, fullscreen frame) actively suggest the wrong thing. Timeline zoom, which a phone user needs constantly, is 2 taps deep behind a fullscreen icon and drawn as up/down arrows.
- **Suggested fix:** (1) Use hooked undo/redo arrows. (2) Replace the fullscreen frame with an "eye" or "view" glyph, or split it: keep "fit canvas" as a direct button. (3) Move the add-row pill into Timeline options and use the freed slot for play (see previous finding). (4) Give the pop-out strips tiny text labels under each icon (they have the vertical room). (5) Label timeline zoom as "-  zoom  +" (magnifier) in Timeline options rather than up/down arrows in View options. (6) Fix "benchmark" -> "bookmark".
- **Screenshots:** [B-build-03-editor-empty.webp](shots/B-build-03-editor-empty.webp), [B-build-24-timeline-options.webp](shots/B-build-24-timeline-options.webp)

### The + add menu remembers the wrong tab, and Text/Shape overlap in confusing ways
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** + add-layer panel, top-level tabs (Elements / Shape / Media / Audio / Template)
- **What happened:** Tap counts from a fresh project state: a Shape (e.g. a rectangle or circle) is 2 taps once the panel is open (tab, then the shape icon) - it drops onto the canvas already selected with handles, no confirm step. Text is 3 taps (+, Elements tab, "Text") and opens straight into an inline edit toolbar. A photo/video already on the phone is + -> Media tab -> Import -> pick the file in the OS picker (2 explicit taps plus the picker); a photo/video already imported earlier is 2 taps (Media tab, then its thumbnail in the recents grid). Music already imported is the same, 2 taps under the Audio tab. None of this is badly slow. What's confusing: the panel opens on whichever top-level tab you used last (it opened straight to "Audio" for me because the previous session's last add was music), so newcomers can easily miss that Elements/Shape/Media/Audio/Template even exist. And "Shape" (a top-level tab, a grid of 15 preset icons) and "Custom shape" (one tile buried inside the separate "Elements" tab, for drawing your own) are two different things with almost the same name in two different places - I only found "Custom shape" by accident while looking for Text.
- **Why it matters:** A new user who wants to draw a custom shape will look in the "Shape" tab (where every other shape lives) and not find it, because it's filed under "Elements" instead, a generic-sounding label that doesn't say "shapes and other layer types."
- **Suggested fix:** Move "Custom shape" into the Shape tab (as a tile at the start of the grid, e.g. "Draw your own") so everything shape-related is in one place (recommended). Keep Elements for Text/Captions/Sketching/Camera/Adjustment/Group. Consider always opening the add panel on "Media" (the most common first add) rather than whatever tab was used last, or show a small dot/label reminding which tab you're on.
- **Screenshots:** [B-build-1b-02-addmenu.webp](shots/B-build-1b-02-addmenu.webp), [B-build-1b-03-media-tab.webp](shots/B-build-1b-03-media-tab.webp)

### The "+ add a layer" row scrolls out of reach once a project has more than ~7 layers
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Timeline, the dashed "Tap to add a layer" row at the top of the layer list
- **What happened:** With 8-9 layers the list no longer fits the screen, which is normal and expected. But the add-layer row is not pinned - it's just the first item in the same scrolling list as the layers. After one ordinary scroll-down to see lower layers, the row scrolled fully out of view, ending up behind the fixed transport bar (confirmed with see: its box reported at y=435, "(covered)", right under the "Undo/Redo/View options" row at y=411). With it hidden, tapping where it used to be just selects whatever layer scrolled into that slot instead of opening the add panel. Scrolling back to the top of the list brings it back and it works again.
- **Why it matters:** Adding another layer is one of the most frequent actions in an editing session, and on any project past ~7 layers (easy to reach: photo + video + text + music + a couple of shapes) the button for it disappears until you scroll back up - there's no hint that it's still there, just off-screen. The app already has a "move add-row to top/bottom" toggle (documented in the first findings file) but it's a manual setting, not a fix for the underlying scroll-away problem.
- **Suggested fix:** Pin the add-row so it never scrolls with the layer list - either fixed at the very top of the scrollable area (sticky), or as a small persistent "+" button in the transport bar itself next to Undo/Redo (recommended, since that row is already fixed and always visible). Keep the existing top/bottom toggle for people who want the full row visible.
- **Screenshots:** [B-build-1b-30-addmenu-retry2.webp](shots/B-build-1b-30-addmenu-retry2.webp), [B-build-1b-31-scrolled-back.webp](shots/B-build-1b-31-scrolled-back.webp)

### An audio clip gets the same menu as a photo (Flip, Sharpen, Clipping mask...), has no fade in/out, and its waveform is faint
- **Impact:** MEDIUM · Found by 2 bots (corrected by Claude)
- **Where:** Selected audio clip ("..." More clip options menu; also the clip's own property tiles)
- **What happened:** Correction: there IS a waveform, but it's very faint on the full timeline and gone once the clip is selected (compare the two screenshots). Editor bot's report: Selected the music-6s clip and opened "More clip options": the menu is identical to a video/photo layer's - Replace media, Sharpen for upscaling, Lock, Onion skin, Reset transform, Reverse, Save whole look as preset, Ask the Assistant, Flip Horizontally/Vertically, Fit/Fill/Stretch to Composition Area, Create Clipping Mask, Extract Audio (on a clip that already IS audio), Media Info, colour tag. None of these apply to sound. Missing: Fade in/out and Loop/repeat to fill duration, which are the two things people actually want to do with a music track, and which I could not find anywhere (not in this menu, not in the clip's own tile panel: Speed / Volume / Effects only). Separately, the audio clip on the timeline is a flat solid-colour pill with just a text label - no waveform, at any zoom level (checked at 1x and after pinch-zooming the timeline in).
- **Why it matters:** Every item in that menu costs a moment of "wait, does that even do anything to a song?" and a few (Extract Audio from audio, Sharpen for upscaling on a .wav) read as broken. Meanwhile the two things people actually do with a music track when they add it - fade it out before it cuts off, or loop a 6s clip to cover a 15s video - have no visible home. And with no waveform, lining up a beat or a lyric with the video content is guesswork: you only find out where the loud part of the track is by scrubbing and listening.
- **Suggested fix:** Give audio-type clips their own context menu variant: keep Replace media / Lock / Reverse / Save as preset / Ask the Assistant / Media info / colour tag, drop the ones that only apply to visuals, and add Fade in, Fade out and Loop to fill (recommended). Draw a simple waveform inside the clip's timeline pill (most editors generate this once on import and cache it) so cuts and syncing don't require scrubbing blind.
- **Screenshots:** [G-speed-96-audioadded.webp](shots/G-speed-96-audioadded.webp), [B-build-1b-13-music-selected.webp](shots/B-build-1b-13-music-selected.webp)

### Undo doesn't say what it undid (and once reverted two edits at once)
- **Impact:** MEDIUM · 1 bot. A 2nd bot couldn't reproduce the double undo
- **Where:** Transport bar, Undo (Cmd+Z) / Redo, after any edit
- **What happened:** Re-test: a second bot duplicated a layer, moved the original and pressed Undo once. Only the move was undone and it stayed on the same panel, so the double undo below has an unknown trigger. The missing feedback is the part that holds everywhere. Original report: No toast, no highlight, no "Undid: moved clip" text anywhere - the only feedback is the timeline/canvas silently changing. Sequence, reproduced with screenshots at every step: selected clip-4s, used "Move clip left to the playhead" to reposition it, closed the clip panel (back arrow, confirmed I was back on the plain timeline with the move visibly intact), then tapped Undo once. Result: the app didn't return to the plain timeline or reopen clip-4s - it opened a full-screen property panel for the Text layer, which I had not touched in several steps, with no message saying why. Closing that panel and checking the layer list showed two earlier edits had been reverted by that single Undo press (a duplicated music clip was gone, and clip-4s was back at its old position) - not just the most recent one. In a second, separate run in this session, one Undo similarly opened the duplicated music-6s clip's panel instead of anything related to what I'd just done.
- **Why it matters:** Undo is the safety net people reach for right after something goes wrong, and its whole job is to be predictable. Here it can silently revert more than the last action, and the screen you land on (a random layer's full panel, hiding the whole timeline) actively obscures what happened rather than showing it - so you can't tell, without manually re-checking every layer, whether Undo did what you wanted or took something else with it.
- **Suggested fix:** Show a small toast on every Undo/Redo naming the action reverted ("Undid: Move clip-4s", "Undid: Duplicate music-6s") (recommended). Make one Undo press revert exactly one history entry - if the duplicate and the move are being coalesced into one step, split them. After an Undo, return to the general timeline (not a layer's full property panel) and briefly highlight the affected clip so its position is visible in context.
- **Screenshots:** [B-build-1b-24-undo-feedback.webp](shots/B-build-1b-24-undo-feedback.webp), [B-build-1b-25-step1-closed.webp](shots/B-build-1b-25-step1-closed.webp)

### Pinching to scale a layer can zoom the whole browser page instead, and it doesn't clear on reload
- **Impact:** MEDIUM (BUG) (needs a real-device check) · 1 bot. Probably a side effect of how the test simulates a pinch
- **Where:** Editor preview/canvas, pinch gesture on a selected layer
- **What happened:** With clip-4s selected, a two-finger pinch-out on the canvas did scale the layer (good - see "things that work great" below), but the page's header ("Project 2" / version / help icons) disappeared off the top of the screen in the same screenshot, which only happens when the whole page, not just the in-app canvas, has zoomed. A plain reload afterwards did not fix it - the header was still cut off and the canvas still oversized after reloading, and pinching again compounded it further (next screenshot was almost entirely one flat colour, fully over-zoomed). Only a fresh goto to the same URL (a full navigation, not a reload) brought it back to a normal, correctly framed view. Pinching on the timeline earlier in the same session, by contrast, behaved correctly (zoomed only the timeline, header stayed put) - so this is specific to pinching on the canvas/preview area.
- **Why it matters:** If this reproduces with a real finger (worth Ezra checking on his phone, since I can't rule out an automation-only quirk here), a user who pinches to scale a shape could end up with the whole app zoomed and mis-framed, with no in-app "reset view" that fixes it (the View-options "Fit canvas to screen" button only fits the in-app canvas zoom, which is a different thing from this) and reloading the page - the obvious first thing to try - wouldn't help either.
- **Suggested fix:** Set touch-action: none (or equivalent) on the canvas/preview element specifically, so a pinch there is always captured by the app's own scale handling and never reaches the browser's native pinch-zoom (recommended). Confirm the page's viewport meta already disables user-scaling (user-scalable=no/maximum-scale=1) globally, since if it's set, this shouldn't be reachable at all, and the fact that it is reachable via the canvas suggests something on that element overrides it.
- **Screenshots:** [B-build-1b-49-pinch-canvas.webp](shots/B-build-1b-49-pinch-canvas.webp), [B-build-1b-54-reload.webp](shots/B-build-1b-54-reload.webp)

### Deleting a layer has no confirmation and no undo toast, unlike deleting a project
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Selected layer's top bar, trash icon ("Delete layer")
- **What happened:** Selected clip-4s and tapped the trash icon in its top bar once: the layer was gone instantly, no "Delete this layer?" prompt, no snackbar/toast offering Undo - straight back to the timeline one layer shorter. (A-home's findings note that deleting a whole project from Home does show "This cannot be undone" before acting.)
- **Why it matters:** A layer can represent real effort (position/scale tweaks, keyframes, effects) and the trash icon sits in a row of same-sized icons at the top of the screen, one mis-tap away from Parent/More. Losing it instantly with the only recourse being the general Undo button - whose feedback is already unclear (see the Undo finding above) - is a rough combination.
- **Suggested fix:** Add a brief "Layer deleted - Undo" toast (3-4s) after a layer delete (recommended, matches the fix already suggested for Home's project delete in the first findings file, so the pattern is consistent app-wide). A confirmation dialog also works but is heavier-handed for something Undo can already fix, given a clearer Undo exists.
- **Screenshots:** [B-build-1b-60-blanklayer.webp](shots/B-build-1b-60-blanklayer.webp), [B-build-1b-61-delete.webp](shots/B-build-1b-61-delete.webp)

### Opening any layer's panel hides the entire timeline, not just that layer's row
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Whole editor, whenever a layer is selected or the + add menu is open
- **What happened:** The preview keeps the same size whether or not a layer is selected, but the timeline below it does not: as soon as you tap a layer (or add a new one), the entire multi-layer track list is replaced by a single strip showing only that one clip, with the property tiles (Colouring, Position/Scale, Speed, Effects, etc.) filling the rest of the screen underneath. The + add-layer panel does the same thing, replacing the whole timeline with the category grid. There is no way to see any other layer, or the overall shape of the timeline, while a panel is open - you have to close it (back arrow) to see the timeline again, then reselect if you want to compare against another layer.
- **Why it matters:** A lot of real editing is relative to something else - "make this text land after the video clip ends," "nudge the star so it doesn't overlap the caption." That kind of work needs the panel and the timeline visible together, and right now phone width forces a choice between "see my settings" and "see my timeline," never both.
- **Suggested fix:** Keep the mini single-clip strip (it's a reasonable focused view) but add a slim always-visible strip above or below it showing the other layers' bars in outline/greyed form so their extent is still visible for lining things up (recommended). At minimum, add a quick "show timeline" toggle inside the property panel that temporarily collapses the tiles without fully closing the panel.
- **Screenshots:** [B-build-1b-06-import-photo2.webp](shots/B-build-1b-06-import-photo2.webp), [B-build-1b-16-music-clipopts.webp](shots/B-build-1b-16-music-clipopts.webp)

### Duplicating a clip gives it an unrelated colour, so you can't tell it's a copy
- **Impact:** LOW · Found by 1 bot
- **Where:** Layer actions -> Duplicate selected (also available from Timeline options / Layer actions icon)
- **What happened:** Selected the blue music-6s clip, used Layer actions -> Duplicate selected. The new copy appeared directly above the original, but coloured orange instead of blue, with no toast or highlight marking it as new (only the layer count and a new row give it away).
- **Why it matters:** Clip colour is otherwise a meaningful signal in this app (there's a whole colour-tag feature in the "..." menu) - two identically-sourced clips having different colours by default undercuts that, and briefly made me think I'd duplicated the wrong thing.
- **Suggested fix:** Give a duplicate the same colour as its source by default (recommended); let the user re-tag it manually afterward via the existing colour-tag menu if they want to tell copies apart.
- **Screenshots:** [B-build-1b-18-after-duplicate.webp](shots/B-build-1b-18-after-duplicate.webp)

### On-canvas move/scale/rotate is precise, but gives no live numbers while you drag
- **Impact:** LOW · Found by 1 bot
- **Where:** Editor preview, a selected layer's corner handles, rotation handle, and body drag
- **What happened:** Tested all three with a real touch-drag on clip-4s: dragging the body moved it exactly with the finger (45px left / 40px up drag -> matching on-screen move), dragging a corner handle scaled it smoothly and symmetrically, and dragging the rotation handle rotated it smoothly. All three felt accurate and responsive - no lag, no jumping. But at no point during any of the three gestures does a number appear near the handle (no "134%", no "18°", no "X 420 Y 610") - the only place to see the exact resulting value is to finish the drag and open the Position/Scale panel afterward, or type a value there directly instead of dragging.
- **Why it matters:** For anything that needs to land on a specific number (rotate exactly 90 degrees, scale to exactly 50%), the on-canvas gesture alone can't get you there - you have to eyeball it, then go check/correct the number in a separate panel, which defeats the point of a quick finger gesture for precise work.
- **Suggested fix:** Show a small floating badge next to the handle while dragging (e.g. "132%" while scaling, "37°" while rotating, "X 420 · Y 610" while moving), the way the app already shows the timecode readout while scrubbing (recommended). Keep snapping (already present, per the Position/Scale panel's own "snaps to centre, edges & earlier keyframes" copy) as the assist for landing on round numbers without typing.
- **Screenshots:** [B-build-1b-45-move-oncanvas.webp](shots/B-build-1b-45-move-oncanvas.webp), [B-build-1b-46-scale-handle.webp](shots/B-build-1b-46-scale-handle.webp)

## Animating

### Dragging an animated layer on the preview moves the whole animation, not the keyframe you're on
- **Impact:** HIGH (BUG) · Found by 2 bots (phone and desktop)
- **Where:** Editor, layer selected, Position / Scale panel open, layer has position keyframes; dragging the shape on the preview
- **What happened:** Square with X keyframes at 0s (X=144) and 1s (X=515). Playhead ON the 0s keyframe (panel says "Remove keyframe at playhead"). Dragged the square 80px left on the canvas. Result: X at 0s = -335 AND X at 1s = 36, i.e. both keyframes shifted by -479. Did the same with the swipe pad instead: only the keyframe at the playhead changed (0s = 144, 1s stayed 515). Also with a single keyframe at 0s, dragging on the canvas at 1s silently rewrote the 0s value instead of creating a 1s keyframe. When all keyframes hold the same value (the normal state right after you tap the diamond at a second time), dragging the shape at the new keyframe moves both, so "slide in from off-screen" never animates: I got X=515 at 0s and 1s and a square that just sits there. Nothing on screen says "moved the whole path". The desktop bot got the same result 3 times with the mouse, including when dragging exactly on the crosshair handle and with the Position panel closed.
- **Why it matters:** Dragging the object is THE phone gesture for setting a position, and every motion app (Alight Motion, After Effects, CapCut) treats it as "set the value at this keyframe". Here the most natural move quietly does something else, so the first keyframe animation a user tries fails and they don't know why.
- **Suggested fix:** Keep your rule that a preview drag moves the whole animation. Make it visible instead: when the dragged layer has keyframes, show the motion path while dragging and a one-line toast after ("Moved the whole animation, 2 keyframes. To change one keyframe, use Move & Transform") (recommended). The two bots that hit this both expected a drag to edit the keyframe at the playhead, so the hint is what stops the surprise.
- **Screenshots:** [C-anim-68-canvas0.webp](shots/C-anim-68-canvas0.webp), [C-anim-69-canvas-then1.webp](shots/C-anim-69-canvas-then1.webp), [F-desk-84-at0-after.webp](shots/F-desk-84-at0-after.webp)

### The big keyframe button (and the small X/Y diamonds) show stale state after the playhead moves
- **Impact:** HIGH (BUG) · Checked by Claude + 1 bot
- **Where:** Position / Scale panel, left column diamond button and the 18px diamonds on the X / Y / Z fields
- **What happened:** Added a keyframe at 0s (button turns gold, label "Remove keyframe at playhead"). Scrubbed the timeline to 00:02:04 where there is no keyframe: the button stayed gold and still said "Remove keyframe at playhead"; X diamond still said "Remove the X keyframe". Tapping it then ADDED a keyframe. Opposite case: after an edit at 1:12, pressed Skip to previous to land exactly on the 0s keyframe: button showed blue "Add a keyframe", and tapping it REMOVED the X keyframe that was there. The state only refreshes when the panel re-renders (after an edit, or leaving and re-entering the panel). Same with typed time jumps and Skip next/previous.
- **Why it matters:** This diamond is the one control that tells you "am I on a keyframe?". When it lies, the user deletes keyframes they meant to keep, or stacks duplicates, and the only way to recover is Undo if they notice.
- **Suggested fix:** Recompute the diamond's state (colour, filled/hollow, label) on every playhead change (scrub, play/pause, typed time, skip buttons, tapping a keyframe on the timeline), not only on panel render. Use the Alight Motion convention: hollow = animated but no key here, filled = key here.
- **Screenshots:** [main-19-at-later.webp](shots/main-19-at-later.webp), [main-20-kf-at-1s.webp](shots/main-20-kf-at-1s.webp), [C-anim-37-scrub1s.webp](shots/C-anim-37-scrub1s.webp)

### Keyframe diamonds on the timeline ignore taps and drags; everything is behind an unmarked long-press
- **Impact:** MEDIUM (BUG) · 2 bots, partly confirmed
- **Where:** Timeline, the little diamond markers drawn on a selected layer's clip
- **What happened:** Re-test: a tap on a diamond does nothing and a drag does nothing either (the second bot did NOT see the whole clip move), while a 700 ms long-press opens the full keyframe menu. Original report: With a Text layer selected and 3 Width/Height keyframes visible as diamonds on its clip, a single tap directly on a diamond does nothing at all (no selection highlight, no panel change), verified on the gold ("keyframe here") diamond and a hollow one. Dragging a diamond sideways (tried starting exactly on the gold diamond, and again a few px off it) does not move that keyframe in time: it silently retimes the whole clip instead, the clip's start slid ~50 px right and the layer's content emptied out at the old playhead position. Reproduced twice, confirmed undoable (Undo correctly restores the clip position). The only thing that treats a diamond as its own object is a 700 ms long-press, which opens a genuinely good context menu: Linear / Ease In / Ease Out / Ease In-Out / Overshoot / Anticipate / Hold (step), Loop: off/cycle/ping-pong, Copy keyframe, Delete keyframe (and cross-layer "Paste keyframe at playhead" appears once something is copied, this works well, verified by copying a Position keyframe from the Square and pasting it onto the Text layer, which took the exact X/Y values across). Nothing on screen hints that long-press is the way in; there is no chevron, no "hold" affordance, no different cursor.
- **Why it matters:** A diamond drawn on a track is the universal "this is a handle, drag me" shape in every timeline-based tool (After Effects, Premiere, CapCut, Alight Motion). Here it looks exactly like one but isn't: a tap is a dead end and a drag does something destructive and unrelated (moves the clip), with no toast or undo hint telling you what just happened. The one real interaction (long-press) is invisible, so the good menu underneath it, full ease presets, loop modes, copy/delete, cross-layer paste, is easy to never find. There is also no multi-select of keyframes (nothing in the long-press menu offers it, and a tap doesn't "arm" a diamond for a second tap to extend selection).
- **Suggested fix:** Make a plain tap on a diamond select it (highlight + show its time/value in a small readout) and let a drag on a selected diamond retime just that keyframe, snapping to other keyframes and the playhead (recommended), this also matches how dragging the value pad already behaves for a single keyframe, so the mental model becomes consistent across the app. Keep "drag the clip" as the behavior for dragging the clip body away from any diamond. Regardless of drag support, surface the long-press menu's contents through a visible affordance too, e.g. a tap opens a small popover with the same options, since a 700 ms hold has no visual cue on a touchscreen.
- **Screenshots:** [C-anim-1b-02-tapdiamond.webp](shots/C-anim-1b-02-tapdiamond.webp), [C-anim-1b-08-dragdiamond.webp](shots/C-anim-1b-08-dragdiamond.webp)

### Easing and loop set from the timeline's long-press menu don't show up in the Easing-curve panel, or vice versa
- **Impact:** MEDIUM (BUG) · Found by 1 bot
- **Where:** Position/Scale panel > Easing curve, vs. the same keyframe's long-press menu on the timeline
- **What happened:** Opened the Easing curve editor for a keyframe that was already set to "Overshoot", it correctly showed the label "Overshoot" and highlighted the matching preset thumbnail. Then, via the timeline's long-press menu, changed that same keyframe to "Linear". Reopening the Easing curve panel (even after fully closing and re-entering it) shows the correct S-curve-free straight line, but the label reads the generic "Cubic Bezier Easing" instead of "Linear", and none of the 6 preset thumbnails is highlighted, so you can't tell which named preset (if any) is active just by looking at the row you'd normally check. Separately, the Easing panel has its own "Loop: none/cycle" toggle that is meant to be the same setting as "Loop: off/cycle/ping-pong" in the long-press menu (same wording, same 3 states), but switching it to "Loop: cycle" in the Easing panel left the long-press menu still showing "✓ Loop: off" for the identical keyframe. By contrast, picking a preset directly from the Easing panel's own row (e.g. Ease In-Out) updates that panel correctly.
- **Why it matters:** There are now two different, equally reasonable-looking places to read and set a keyframe's ease and loop, and they silently disagree with each other. A user who sets "Linear" from the quick timeline menu (the faster, more discoverable path once found) and later opens the fuller Easing panel to fine-tune the curve will see a curve that doesn't match any preset name and a Loop toggle that looks off when it might actually be on, they can no longer trust either display.
- **Suggested fix:** Route both UIs through the same state: when the long-press menu sets a named preset or loop mode, have the Easing panel recompute which preset (if any) the resulting curve matches and highlight it (or explicitly show "Custom" only when the curve truly isn't one of the named presets), and make the two Loop controls read/write the same value (recommended). Short term, at least make the Easing panel's Loop control re-read state on open rather than trusting a possibly-stale local value.
- **Screenshots:** [C-anim-1b-12-easingbtn.webp](shots/C-anim-1b-12-easingbtn.webp), [C-anim-1b-16-afterlinear.webp](shots/C-anim-1b-16-afterlinear.webp)

### A size keyframe once shrank a layer to 1/100 (360 to 3.6), trigger unknown
- **Impact:** MEDIUM (BUG) · 1 bot, 2 repros on one layer. Claude could not reproduce it
- **Where:** Position/Scale > Width/Height (Scale) panel, "Add a keyframe at the playhead"
- **What happened:** Claude could not reproduce this on a fresh circle (3 tries, including a keyframe at 1 s). The bot hit it twice on one square that already had keyframes from an earlier session, so something in that layer's history triggers it. Bot's report: Square shape, Width/Height = 360.0 / 360.0, no keyframes yet. Tapped "Add a keyframe at the playhead" once (nothing else touched). Both fields instantly became 3.6 / 3.6, exactly 1/100th, and the shape shrank to an invisible dot on the canvas. Reproduced it (same layer, after Reset transform put Width back to a normal value, repeated the single tap, same 100x drop). Deleting that keyframe afterwards does not restore 360, the value stays frozen at 3.6, so the shrink is permanent once it happens. The same single-tap "add keyframe" action on Position (X/Y) and on Opacity does not exhibit this, both keep their exact value, so it's specific to the linked Width/Height pair. Recovery is hard on a phone: double-tapping or long-pressing the Width number does not turn it into a text field (confirmed no keyboard entry exists for Width/Height, matching what F-desk found for Position on desktop), so the only way back is either an imprecise drag (a 290 px drag only moved the value from 3.6 to 192.9, nowhere near a clean 360) or the "Reset transform" item buried in the layer's "..." menu, which also wipes rotation, skew and any other keyframes on that layer, not just Width/Height.
- **Why it matters:** This turns "give this shape a size keyframe", a completely ordinary first step in any scale animation, into a silent 100x shrink with no error, no confirmation and, on a phone, no precise way to undo it short of a global reset that throws away unrelated work.
- **Suggested fix:** Fix the unit mismatch so the first keyframe always captures the field's current on-screen value (recommended), this is the real bug and fixing it removes the need for a workaround. Independently, add a way to type an exact number into Width/Height (and Position/Rotation/Skew) on a phone, e.g. tap-and-hold to reveal a text field the way Opacity already supports, since drag-to-scrub alone cannot reliably reach a specific value.
- **Screenshots:** [C-anim-1b-35-sqposcale.webp](shots/C-anim-1b-35-sqposcale.webp), [C-anim-1b-36-kfadded0.webp](shots/C-anim-1b-36-kfadded0.webp)

### No touch-friendly way to step the playhead one frame at a time
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Transport bar under the preview; Shortcuts/tips sheet
- **What happened:** The Shortcuts sheet (behind the "?" icon) lists "," / "." = Step one frame back / forward under KEYBOARD, there is no on-screen equivalent anywhere. The two large buttons flanking the time readout that look like the obvious candidates (||) jump to the previous/next clip edge or timeline marker, not one frame (confirmed: from 0:01:00 with no nearby marker, one tap jumped straight to 0:04:29, near the end of the clip). So on a phone, which has no keyboard, there is no way to nudge the playhead by exactly one frame; you're limited to whatever the timeline's zoom level lets you land on with a scrub. On the positive side, typing an exact time IS precise: double-tapping the time readout and typing a decimal value (e.g. "2.500") lands exactly on that frame (confirmed: jumped to 00:02:15 = 2 s + 15 frames at the project's frame rate), so fine positioning is possible, just not fine nudging.
- **Why it matters:** Frame-accurate placement of a keyframe (matching a beat, a cut, a bounce apex) is a routine task, and "type the exact time" only works if you already know the exact time, nudging by feel is how most people actually find that frame, and that path doesn't exist on the device this app is mainly built for.
- **Suggested fix:** Add two small "step 1 frame" buttons (e.g. thin single-headed arrows, distinct from the existing clip/marker-skip icons) next to the time readout, or make a short tap on || step one frame while a long-press/hold continues to jump clip edges as it does now (recommended, keeps the existing behavior as the "hold" case since the tooltip already documents holding those buttons for playback speed).
- **Screenshots:** [C-anim-1b-25-help.webp](shots/C-anim-1b-25-help.webp), [C-anim-1b-13-skipnext.webp](shots/C-anim-1b-13-skipnext.webp)

### Nothing shows which properties are animated until you select the layer, and then every property shares one unlabeled row
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Panel-list tiles (Colouring / Position-Scale / Mixing / etc.) and the keyframe diamonds on a selected layer's clip
- **What happened:** The "Position / Scale" tile in the panel list looks pixel-identical whether or not that layer has any keyframes on it, no dot, no diamond glyph, no colour change. The only place keyframes show at all is as diamonds on the layer's own clip in the timeline, and that row only appears once the layer is selected, an unselected layer's clip shows no hint that it's animated at all (verified: Text and Square clips show plain solid bars with no marks until tapped). Once selected, every animated property's keyframes are drawn on the same single row with no label, so a layer with keyframes on both Width/Height and Position shows one merged set of diamonds and there's no way to tell, from the timeline, which diamond belongs to which property, you have to open each property panel in turn and check its own mini add-keyframe indicator.
- **Why it matters:** On a project with several layers, "which of these is actually animated, and in what?" is a question you can only answer by selecting each layer and clicking through every one of its 9 property panels, there's no at-a-glance summary anywhere, which makes it easy to forget you left a keyframe on something, or to duplicate a layer and not realise it inherited motion.
- **Suggested fix:** Put a small keyframe glyph on any panel-list tile that has keyframes (recommended), and colour or label the diamonds on the timeline row per property (or split animated properties onto their own sub-rows when the layer is selected and more than one property is keyframed), similar to how After Effects shows a keyframe track per property under an expanded layer.
- **Screenshots:** [crop-panellist-poscale.webp](shots/crop-panellist-poscale.webp), [crop-timeline-diamonds.webp](shots/crop-timeline-diamonds.webp)

### Built-in animation presets exist only for text: photos, shapes and video get none, and the Presets tile starts empty
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Layer panel list > Presets
- **What happened:** Correction from the tap-count bot: text layers DO have one-tap presets under Aa > Animate (Fade in, Slide in, Pop, Spin in, with a duration and by character / word / line), and they made a whole title card take 18 taps. What's missing is the same for everything else, plus a findable place for them. Animation bot's report on the Presets tile: Opened Presets on a Text layer from the profile that ships with this build: a search box, then "Look + animations > Save look + animations..." and a greyed-out "Save effects only as preset". Searching for anything, including a single generic letter, returns zero results, there is nothing pre-populated to browse or apply. The "Effects" panel's "+ Add Effect" gallery (Squish, Match Grade, etc.) is a separate visual-filter library, not motion presets. So a fade-in, a pop-with-bounce, or a slide-in only exist in this app once a user has hand-built the keyframes once and explicitly saved them, there is no seeded "In / Out / Loop" starter set to apply and then tweak.
- **Why it matters:** Quick, named entrance/exit/loop animations are one of the main reasons casual users reach for a motion app like this instead of a plain editor (CapCut, Canva and Alight Motion all ship one). Here, every single project starts from zero: the first fade-in anyone ever makes has to be built keyframe-by-keyframe with no example to start from or learn the easing conventions from.
- **Suggested fix:** Give photo, video, shape and group layers the same Animate dropdown text already has (Fade, Slide, Pop in and out, with a duration) (recommended). The tap-count bot estimates this alone roughly halves a slideshow or lower-third job. Also list those presets in the Presets tile under a "Built-in" heading so the tile isn't empty on day one.
- **Screenshots:** [C-anim-1b-27-presets.webp](shots/C-anim-1b-27-presets.webp), [C-anim-1b-29-searcha.webp](shots/C-anim-1b-29-searcha.webp)

### You can't type an exact number for position, size or rotation (only Opacity takes typing)
- **Impact:** MEDIUM · Found by 2 bots (phone and desktop)
- **Where:** Mixing > Opacity vs. Position/Scale (Width/Height, X/Y/Z, Rotation, Skew)
- **What happened:** Tapping the Opacity value in Mixing focuses a genuine text input (blue focus ring) and typing a new number and pressing Enter commits it exactly and adds a keyframe at the playhead if the property is animated, confirmed setting it to exactly "1". None of Width, Height, X, Y, Z, Rotation or Skew behave this way: a tap, double-tap or 700 ms long-press on any of them does nothing (no focus, no field), and the only way to change them is a drag whose sensitivity varies (roughly 0.65–1 unit per screen pixel in what I measured), so landing on a clean round number takes several tries. This matches what F-desk already found for Position on desktop, but it's broader than that: it's true on phone too, and Opacity shows the app already has a working typable-field pattern, it's just not used everywhere. On desktop the same: clicking, double-clicking or long-pressing the X value opens no field and typing does nothing, and moving X from 1446 to 400 would need a drag of about 1000 px.
- **Why it matters:** The same screen trains the user two different ways to enter a number a few taps apart, and the one place typing works (Opacity, a 0–1 range where precision barely matters) is the least important place to need it, while the fields where exact numbers matter most (centering an X position, hitting a round Width) are the ones you can't type into.
- **Suggested fix:** Reuse Opacity's existing text-input pattern for every numeric property field (recommended): keep drag-to-scrub for quick changes, but tapping the number itself (or a small pencil icon) opens the same kind of committed text entry Opacity already has. On desktop also support Up/Down arrows and the mouse wheel on a focused or hovered value (Shift = x10), and simple maths like "+100".
- **Screenshots:** [C-anim-1b-62-opacityfield.webp](shots/C-anim-1b-62-opacityfield.webp), [C-anim-1b-44-dbltapwidth.webp](shots/C-anim-1b-44-dbltapwidth.webp), [F-desk-75-xdrag.webp](shots/F-desk-75-xdrag.webp)

## Styling & effects

### Escape closes the thing underneath instead of the menu on top, and the hidden menu can still fire
- **Impact:** HIGH (BUG) · Found by 2 bots (desktop keyboard)
- **Where:** Layer > Effects > any effect row > "..." (More) menu (Reset / Duplicate / Copy effect / Favourite / Save as preset / Delete)
- **What happened:** Effects: with an effect's "..." menu open, Escape closed the Effects panel underneath but left the menu's now-invisible buttons live. The next ordinary tap fired "Favourite", and another time "Duplicate", which duplicated the whole layer (layer count 3 to 4, Undo removed it). Timeline: with a clip's right-click menu open, Escape deselected the layer underneath and left the menu floating. Clicking "Flip Horizontally" in that orphaned menu still flipped the layer.
- **Why it matters:** Escape-to-dismiss is muscle memory on a PC. Here it does the opposite, and a menu you can't see can act on your project.
- **Suggested fix:** Escape (and the back gesture) closes the top-most thing first: the menu, then the panel, then the selection (recommended). A menu that is no longer visible must never receive a tap.
- **Screenshots:** [D-look-1b-07-more-open.webp](shots/D-look-1b-07-more-open.webp), [D-look-1b-08-after-escape.webp](shots/D-look-1b-08-after-escape.webp), [F-desk-59-esc-menu-repro.webp](shots/F-desk-59-esc-menu-repro.webp)

### Text toolbar colour chip goes stale after using the eyedropper
- **Impact:** MEDIUM (BUG) · Found by 1 bot
- **Where:** Text editor (after adding Text) > Colour button (top-left chip) > "Pick a colour from the video" eyedropper
- **What happened:** Set text to yellow (#ffd400), opened the eyedropper, tapped the purple corner of the photo. The text turned purple (#5952d8) and the hex field updated, but the Colour chip in the top toolbar stayed yellow. Closing and reopening the colour row did not fix it. Reproduced a second time (picked cyan #62d8e3, chip stayed purple). Tapping a recent-colour swatch DOES update the chip, so only the eyedropper path misses the refresh.
- **Why it matters:** The chip is the only at-a-glance "what colour is my text" indicator in the editor; after an eyedrop it lies, which makes people think the pick did not stick.
- **Suggested fix:** Run the same "colour changed" refresh after an eyedropper pick that the swatch tap already runs (update toolbar chip + add to recents immediately, not on reopen).
- **Screenshots:** [D-look-23-eyedrop-picked.webp](shots/D-look-23-eyedrop-picked.webp), [D-look-24-colour-closed.webp](shots/D-look-24-colour-closed.webp)

### Two different colour pickers for the same text colour
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Text editor "Colour" chip vs. layer panel "Colouring"
- **What happened:** In the text editor, Colour opens a bare row: a grey native  box and a white, monospace, browser-default hex field (looks unstyled against the dark UI), plus eyedropper. No preset swatches. After pressing Done, the layer's "Colouring" panel edits the same fill but gives a 16-swatch grid, Solid/Gradient, "#FFD400 100%" readout, opacity, recents. Outline and Shadow colour rows are a third variant (native box + hex + recents, no grid). The native box opens the OS/browser picker (on desktop Chrome a small popup covering the canvas).
- **Why it matters:** The first place a new user picks a text colour is the weakest one, and it looks like a leftover form field. Learning one picker would carry to every panel if they matched.
- **Suggested fix:** Build one shared colour component (swatch grid + hex + eyedropper + recents + optional gradient tab) and use it in the text editor, Colouring, Outline, Shadow and effect colour options. Style the hex field like the other dark inputs (the Colouring panel's hex field already is). Keep the native picker as a "More..." / spectrum button inside it.
- **Screenshots:** [D-look-19-colour.webp](shots/D-look-19-colour.webp), [D-look-21-nativepicker.webp](shots/D-look-21-nativepicker.webp)

### Recent-colour swatches are 16x16 px
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Every colour row (text Colour, Colouring > Custom, Gradient Colour 1/2, Outline, Shadow)
- **What happened:** The "recent colours" chips under each hex field measure 16x16 px with 4 px gaps (see list: #5952d8 @ 16x16). The preset grid next to them uses 41x41 px swatches.
- **Why it matters:** Recents are the main way to reuse a brand colour across layers, and at 16 px they are well under a thumb-sized target (44 px guideline); a slightly-off tap hits the neighbour.
- **Suggested fix:** Render recents at the same 36-41 px as the preset grid (one scrollable row), or merge them as the first row of the grid with a small "Recent" label. Add a long-press "Pin to My colours" so a user can keep a saved palette instead of only an automatic recent list.
- **Screenshots:** [D-look-25-colour-reopen.webp](shots/D-look-25-colour-reopen.webp), [D-look-34-colouring-bottom.webp](shots/D-look-34-colouring-bottom.webp)

### Changing text alignment moves the whole text block across the canvas
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Text editor > Alignment button (2nd in the toolbar)
- **What happened:** With a centred one-line title in the middle of the frame, one tap on Alignment switched to right-aligned and the text jumped left so its right edge sat at the old centre (the first letters ran off the left of the frame). Next tap = left-aligned, the text jumped right and ran off the right edge. Third tap = centred again. The button cycles silently; you only learn the order by tapping.
- **Why it matters:** People expect alignment to change how lines line up inside the text box, not to throw the title off-screen; they then have to drag it back and re-centre it.
- **Suggested fix:** Keep the text box's visual position fixed when alignment changes (re-anchor so the box does not move; only the lines inside move). Show the three options as a small segmented control (left / centre / right, plus justify if supported) when the button is tapped instead of a blind cycle.
- **Screenshots:** [D-look-15-spacing-drag.webp](shots/D-look-15-spacing-drag.webp), [D-look-16-align.webp](shots/D-look-16-align.webp)

### Opacity is shown three different ways
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Mixing panel, Colouring panel, Outline & Shadows > Shadow
- **What happened:** Mixing > Opacity is a 0-1 decimal ("1") with a plain thin range slider. Colouring > Opacity is "100" on a tick-mark ruler. Shadow calls it "Alpha" and shows "100%". Text size in the editor is yet another control: a thin range slider whose value (255) is not editable. Verified: typing 50 in Mixing > Opacity and pressing Enter leaves the box showing "50" while the slider and the layer stay at full opacity (1) with no message; only "0.5" works.
- **Why it matters:** Same concept, three scales and two slider styles; typing "50" into Mixing opacity is the natural thing to do and it silently does nothing while displaying 50. "Alpha" is jargon.
- **Suggested fix:** Use percent (0-100%) everywhere with the same ruler + editable number box, and call it "Opacity" everywhere (Shadow included). Give the text-size slider the same editable number box as the Aa panel's Spacing / Line height.
- **Screenshots:** [D-look-52-mixing.webp](shots/D-look-52-mixing.webp), [D-look-55-mixing-50.webp](shots/D-look-55-mixing-50.webp)

### "always first" effects can be dragged above others in the list, but the render order doesn't actually change
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Layer > Effects list, effect rows with the grey "always first" tag (e.g. Hue Shift, Glow on a photo layer)
- **What happened:** A photo layer had Hue Shift and Glow (both tagged "always first") then Vignette, then I added Iridescence at the bottom (list order: Hue Shift, Glow, Vignette, Iridescence), canvas showed rainbow diagonal stripes over the photo. Using the drag handle, I dragged Iridescence to the very top of the list, above both "always first" effects (now: Iridescence, Hue Shift, Glow, Vignette). The drag succeeded and the list visually reordered with no warning. The canvas looked pixel-identical before and after the drag (same rainbow stripe pattern), i.e. the actual render order did not change, only the row positions did. The tag itself has no tooltip and is never explained anywhere in the panel.
- **Why it matters:** Drag handles exist specifically so a user can control effect stacking order, and effect order genuinely changes results (that's the entire point of stacking effects). Here, dragging an item above an "always first" effect looks like it worked (the row moves, and stays there) but silently does nothing to the output, so a user trying to fix a look by reordering will get a result that doesn't match what the list shows and won't know why.
- **Suggested fix:** Either stop the drag from crossing an "always first" effect (snap it back, with a one-line reason: "Hue Shift always runs first"), or drop the fixed-order rule and let list order always equal render order (recommended if nothing structurally requires certain effects to run first). If the pinned behaviour must stay, group pinned effects visually above a divider so their position can't be mistaken for something you can rearrange.
- **Screenshots:** [D-look-1b-34-back-to-effects-list.webp](shots/D-look-1b-34-back-to-effects-list.webp), [D-look-1b-35-reorder-attempt.webp](shots/D-look-1b-35-reorder-attempt.webp)

### Font picker only offers 7 generic system fonts, no search, and the way to get more is buried in Settings
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Text layer > Customise Text > font dropdown (top toolbar, "Impact ▾")
- **What happened:** Tapping the font name opens a horizontally-scrolling strip of "Abc" preview tiles. Swiped it end to end: the full list is exactly 7 fonts, Times New Roman, Courier New, Impact, Verdana, Trebuchet MS, Palatino, Comic Sans MS, all generic OS web-safe fonts, no search box, no categories (serif/script/display), no numeric count. Settings has a relevant toggle, "Show system fonts" ("Off = the text font picker lists only fonts you imported"), which is ON by default, that setting is what's producing this exact list. Reaching it takes: editor gear icon > Canvas settings > "App settings…" > scroll past 7 rows.
- **Why it matters:** For a motion-graphics app whose main comparison points (CapCut, Alight Motion, Canva) all ship large curated font libraries with search, 7 dated system fonts (including Comic Sans MS) is what a user sees the very first time they add text, before they have any idea "importing" your own fonts is even possible, since the font picker itself never mentions it. Turning "Show system fonts" off to get a cleaner list would actually leave an empty picker until fonts are imported, which the toggle's own wording doesn't warn about.
- **Suggested fix:** Add a "+ Import font…" tile at the end of the font strip (or a link inside the empty state) so the two related features connect to each other, instead of the connection only existing as a Settings toggle several taps away with no pointer from the font picker itself (recommended). If a larger bundled font set exists or is planned, surface it here with search now, ahead of the system-font fallback.
- **Screenshots:** [D-look-1b-46-font-list.webp](shots/D-look-1b-46-font-list.webp), [D-look-1b-49-settings.webp](shots/D-look-1b-49-settings.webp)

## Export & settings

### A finished export gives you nothing: no toast, no "done", no file name, no way to know it worked
- **Impact:** HIGH · Confirmed by a 2nd bot
- **Where:** Export dialog, any format, once the progress bar reaches 100%
- **What happened:** Exported a 2-layer, 5 s project as an Animated GIF twice, live. Each time the "Exporting… Encoding gif… NN%" progress modal (with a Cancel button) counted up, and the instant it hit 100% the modal simply disappeared, dropping you back on the plain editor screen you started from, no toast, no checkmark, no "Saved" or "Downloaded" message, no filename, no way to open/share/locate the result, nothing in the header or the layer list changes. I polled with screenshots taken immediately after completion (no sleep) three separate times and never caught any feedback because there is none to catch. The same is true for "This frame (PNG)" and was true for GIF in the prior round's screenshots (shots/E-out-23-gifend-1.png through -4.png, shots/E-out-22-gif-b10.png all look identical to the idle editor).
- **Why it matters:** Exporting is the entire point of the "getting a video out" flow, and it ends in total silence. A user has no way to tell "it worked" from "it silently failed", both look exactly like tapping Cancel. On a phone, where the download also isn't visibly obvious the way a browser's download tray is on desktop, this is the one moment that most needs a clear "done" signal and gets none.
- **Suggested fix:** Replace the vanishing modal with a short success state before it closes: a checkmark + "GIF saved, 2.1 MB" for 2-3 seconds, or better, a persistent toast/snackbar (like the "Project file saved" toast this app already uses elsewhere) that says what was made and, where the platform allows it, offers "Open" / "Share" (recommended). At minimum, keep the modal open with a "Done" button the user taps to dismiss, instead of it disappearing on its own.
- **Screenshots:** [E-out-1b-14-gif-progress.webp](shots/E-out-1b-14-gif-progress.webp), [E-out-1b-17-poll-1.webp](shots/E-out-1b-17-poll-1.webp)

### Errors pop up as page-freezing browser alerts, and the MP4 one wipes your export settings
- **Impact:** MEDIUM (BUG) · Found by 2 bots
- **Where:** Export dialog, Format = MP4 video, on a browser/device that can't encode H.264
- **What happened:** Two expected errors show as native browser alerts that freeze the whole page until dismissed. One says this browser can't make MP4, and after you dismiss it the export dialog's settings are gone, even though the message tells you to try GIF. The other says "Can't use 'BRIEF.md', FreeMotion takes video, images and audio" when you import a non-media file. The wording of both is good. MP4 works in Chrome and Safari, so on Ezra's own devices it's mainly the import case that shows up.
- **Why it matters:** A frozen page with a system-style box looks like a crash, and losing the export settings means redoing them to follow the message's own advice.
- **Suggested fix:** Show both in the app's own dialog or toast style with the same wording (recommended). For MP4, add a "Try GIF instead" button that reopens Export with Format set to GIF and everything else kept.
- **Screenshots:** [E-out-1b-10-mp4.webp](shots/E-out-1b-10-mp4.webp), [J-edge-59-after-dialog-dismiss.webp](shots/J-edge-59-after-dialog-dismiss.webp)

### "This frame (PNG)" export still shows Frame rate and a video Range picker, neither of which apply to a single frame
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Export dialog, Format = "This frame (PNG)"
- **What happened:** Switching Format to "This frame (PNG)" correctly hides the Quality field (there's no quality trade-off for one PNG), but it keeps showing "Frame rate: Same as project…" and "Range: Whole project / Loop region (if set) / Selected clip only". A single still frame has no frame rate and no time range, "Whole project" and "Loop region" are meaningless choices for it. Compare this to the Animated GIF format, which correctly adds its own explanatory copy ("GIF caps size (max 640px) and colours (256 per frame)") and a Transparent-background toggle, and to Audio-only, which correctly drops Resolution/Frame rate/Quality entirely. Only "This frame" was left with the wrong fields.
- **Why it matters:** A user exporting a single frame sees two controls that look like they should matter and has no way to know they're inert, which reads as either confusing or broken ("what does 'Whole project' mean for one picture?").
- **Suggested fix:** Hide Frame rate and Range for "This frame (PNG)" the same way Quality is already hidden for it, and instead show a simple "Frame: current playhead position (0:00:00)" readout so it's clear which frame will be saved (recommended).
- **Screenshots:** [E-out-1b-03-export-open.webp](shots/E-out-1b-03-export-open.webp), [E-out-32-range-loop.webp](shots/E-out-32-range-loop.webp)

### The "before you export" note reminder only ever fires once, not while the note stays unticked
- **Impact:** MEDIUM (BUG) · Found by 1 bot
- **Where:** Editor, yellow Notes button, and the Export flow
- **What happened:** The project has one unticked note, "Swap the logo for the final one" (Notes panel: "Tick a note to be reminded of it when you export"). Earlier in this project's history (shots/E-out-60/61/62/63) tapping Export first showed a "Before you export" gate listing the unticked note, requiring Back or "Export anyway"; ticking it there showed "All clear" and let the export through, but reopening the plain Notes panel afterwards showed the note still unticked (ticking it in the export gate doesn't tick it for real). Now, live, with that same note still sitting unticked, I tapped Export three separate times (for MP4, then twice for GIF) and the gate never appeared again at all, Export went straight to the format dialog every time, as if there were no pending notes.
- **Why it matters:** The one thing this feature exists for, "don't let me forget to swap the logo before the final export", only works the first time. After that it silently stops warning you, so the export you actually ship (the "final" one) is exactly the one it fails to catch you on. And ticking it inside the export gate looking like it clears the note, when it doesn't, could make someone think they've handled it when the standalone Notes list still shows it open.
- **Suggested fix:** Show the "Before you export" gate on every export while any note is unticked, not just the first one per session (recommended). Make ticking a note inside that gate the same action as ticking it in the Notes panel (one shared state, not two).
- **Screenshots:** [E-out-1b-27-notes.webp](shots/E-out-1b-27-notes.webp), [E-out-1b-28-export-nogate.webp](shots/E-out-1b-28-export-nogate.webp)

### Renaming a project from inside the editor: the name field is too narrow to see what you're typing
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Editor header, project-name field (top-left, next to the back arrow)
- **What happened:** The field is only 96 px wide (measured via see) on a 390 px phone. Tapping it to rename "Summer Holiday Reel 2026" shows just "Summer H", the very start of the name, with no fade/ellipsis hinting there's more. Pressing End to reach the end of the text scrolls the field to show only "Reel 2026" (the last ~9 characters), again with no ellipsis on either side. At no point while editing can you see the whole name, or even tell that what you're seeing is a fragment rather than the whole thing.
- **Why it matters:** Fixing a typo in the middle of a longer name, or checking you didn't just duplicate part of it, is guesswork, you can only ever see a small window of the string you're actively editing. This is a different, in-editor instance of the same field-width problem A-home found in the New Project dialog's Name field.
- **Suggested fix:** Make the name field expand to take the available header width while focused (it can shrink back to a fixed width once blurred), or overlay a full-width rename sheet/field above the keyboard when the project name is tapped (recommended). At minimum, add a fading edge or ellipsis so a truncated, scrolled field visibly reads as truncated.
- **Screenshots:** [E-out-1b-22-rename-focus.webp](shots/E-out-1b-22-rename-focus.webp), [E-out-1b-23-rename-end.webp](shots/E-out-1b-23-rename-end.webp)

### Export runs modally with no way to keep working while it encodes
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Export dialog, once you tap Export (any format)
- **What happened:** While "Exporting… Encoding gif… NN%" is on screen, tapping the header's back arrow (returning to Home) does nothing, the modal stays up and the progress keeps counting (shots/E-out-27). Tapping the dimmed backdrop also does nothing (shots/E-out-26). The only way out is the explicit Cancel button, which aborts the export entirely. There's no "run in background" or "minimize" option, exporting fully occupies the screen and gives up no partial result if you back out.
- **Why it matters:** For this tiny test project export took only a couple of seconds, but a longer project's GIF/PNG-sequence export could take much longer, during which the editor is completely unusable for anything else, you can't keep trimming the next clip or adding a caption while it runs. The safety (you can't accidentally navigate away and lose it) is good; the lack of any way to let it run in the background while you keep working is not.
- **Suggested fix:** Keep the modal as the default, but add a small "Run in background" affordance that shrinks the export to a progress chip (e.g. in the header, near the notes/export icons) so the editor stays usable underneath, with the chip expandable back to the full progress view or Cancel (recommended).
- **Screenshots:** [E-out-24-before-cancel.webp](shots/E-out-24-before-cancel.webp), [E-out-26-tap-backdrop.webp](shots/E-out-26-tap-backdrop.webp)

### The editor's gear icon looks like a Settings button but opens Canvas settings; real app Settings (and Backup/Restore) is a buried detour from there
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Editor header, gear icon (next to Export); Canvas settings dialog's "App settings…" button
- **What happened:** The editor header's rightmost-but-one icon is a plain gear/cog, visually identical in style to Home's own Settings cog. Tapping it, however, opens "Canvas settings" (aspect ratio, resolution, frame rate, background colour, "scale layers to fit"), not app preferences. Inside that dialog, a small "App settings…" button in the bottom-left corner opens the real Settings sheet. From there, reaching backup/restore means scrolling past 9 unrelated rows (Project sorting, New light look, Demo mode, Show touches, Show system fonts, Default layer duration, Default shape colour, Songs, Photos & videos, Playback quality) to finally reach "Import a project file" and "Back up every project" near the bottom. There is no direct "Backup" or "Restore" entry point anywhere in the editor's own toolbar or its project "…" menu.
- **Why it matters:** Backup/restore is exactly the kind of feature people go looking for right when something has gone wrong, a lost project, a device switch, "did that actually save?", and it takes a gear icon that doesn't say Settings, a secondary button inside a dialog about something else entirely, and a long scroll to reach it. A user who taps the gear expecting preferences, sees canvas/aspect controls, and doesn't spot the small "App settings…" button could reasonably conclude there's no way to back up from inside the editor at all.
- **Suggested fix:** Give the editor a direct Settings entry point distinct from Canvas settings, e.g. move "App settings…" into the editor's existing project "…"-style menu, or add a small overflow (⋯) next to the gear for it (recommended). Also pull "Import a project file" / "Back up every project" to the top of the Settings sheet (or their own "Backup" section) rather than after nine unrelated preference rows, since they are the two highest-consequence actions in that whole list.
- **Screenshots:** [E-out-1b-19-canvas-open.webp](shots/E-out-1b-19-canvas-open.webp), [E-out-1b-30-appsettings.webp](shots/E-out-1b-30-appsettings.webp)

### The phone's only Help panel is entirely keyboard-shortcut and mouse/desktop content
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Editor header, "?" help button ("Shortcuts / tips")
- **What happened:** On this 390×844 touch build, the "?" button opens a panel titled "Shortcuts / tips" with exactly two sections: "KEYBOARD" (Space, 1-5, Home/End, Cmd+Z, Tab, Esc, etc.) and "MOUSE / STAGE" (Right-click timeline, Select camera + scroll, Drag layer/handles, "Click off the panel (PC)", Double-click clip). None of a phone user's actual interactions, tap, long-press, pinch, swipe-to-delete, drag-to-reorder, are documented anywhere in it. The panel's own "Tutorials" button leads to Home's Tutorials tab, which says "Tutorials are coming. Short walkthroughs of the editor will live here", a second dead end.
- **Why it matters:** FreeMotion is used mostly on the phone (per the project's own notes), so the one built-in help affordance on the device that matters most teaches shortcuts that don't exist on that device, while the touch gestures a phone user actually needs (how do I select a layer, how do I trim a clip, how do I delete one) go unexplained anywhere.
- **Suggested fix:** Add a "TOUCH" section at the top of this same panel, tap to select, long-press for X, drag handles to resize, swipe left on an effect to delete, etc., ahead of Keyboard/Mouse, and show only that section by default on a touch device (recommended, keeps the existing content for anyone on a hybrid device). Keeping "Tutorials" as a future promise is fine, but it shouldn't be the only other button on a help sheet that has nothing else to offer a touch user today.
- **Screenshots:** [E-out-1b-24-help.webp](shots/E-out-1b-24-help.webp), [E-out-43-help-scrolled.webp](shots/E-out-43-help-scrolled.webp)

### A full reload resets the playhead to 0:00; returning via Home keeps it, but neither restores selection or the open panel
- **Impact:** MEDIUM · Found by 2 bots
- **Where:** Leaving and reopening a project (Home > back into the project, vs. a full page reload)
- **What happened:** With the playhead scrubbed to 00:03:03 and the "Diamond" layer selected (its effects panel open), going back to Home and reopening the same project restored the playhead to exactly 00:03:03, but the layer selection and its open panel were gone (back to nothing selected, timeline-only view). Separately, after a full browser reload with the playhead at 00:02:21, the project reopened with the playhead reset to 00:00:00, the position wasn't kept at all this time, on top of the same lost selection/panel. A second bot found the same on reload, and that reload also closes one panel level (an open Effects sub-panel falls back to the layer's tiles). The edit itself is always kept.
- **Why it matters:** These two paths back into "the same project" behave differently in a way a user has no way to predict, a phone getting backgrounded and reclaimed by the OS (which reloads the page) loses your scrub position, while just tapping Home and back doesn't. Either way, the layer you were working on and the panel you had open are always gone, so resuming exactly where you left off never fully works.
- **Suggested fix:** Persist playhead position, selected layer id, and which panel/tab was open as part of the project's saved state (not just in-memory route state), so both paths restore identically (recommended). This also fixes the reload case, since it would now read the same saved value instead of defaulting to 0:00.
- **Screenshots:** [E-out-48-scrubbed.webp](shots/E-out-48-scrubbed.webp), [E-out-50-selected-before-leave.webp](shots/E-out-50-selected-before-leave.webp)

### Version badge looks tappable but does nothing
- **Impact:** LOW · Found by 1 bot
- **Where:** Editor header, "↻ v16.90" pill
- **What happened:** The badge is styled as a rounded pill with a ↻ (refresh-like) icon, matching the visual language of the app's actual buttons. It does not appear in the accessibility tree as a button at all, and tapping it does nothing, no tooltip, no changelog, no "up to date" confirmation, no long-press action.
- **Why it matters:** The ↻ glyph specifically invites "tap to check for updates" or "tap to refresh," and a pill shape reads as a button everywhere else in this UI. Tapping it and getting nothing is a small but real "is this broken?" moment, and it wastes a slot where a genuinely useful action (what's new in this version, or a manual refresh for a PWA that's serving a stale cached build) could live.
- **Suggested fix:** Either make it inert-looking (flat text, no pill, no icon) so it stops inviting a tap, or make the tap do something small and real, a one-line "What's new in v16.90" popover, or trigger a service-worker update check (recommended, since Ezra specifically cares whether a shipped build has reached his phone).
- **Screenshots:** [E-out-1b-26-version-tap.webp](shots/E-out-1b-26-version-tap.webp), [E-out-12-export-dialog.webp](shots/E-out-12-export-dialog.webp)

## Desktop

### Empty canvas says "or click Import media" but nothing there is clickable
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Editor, empty project, centre of the preview
- **What happened:** New 16:9 project. The preview shows a clapper icon and "Drag a video or image here / or click Import media". I clicked the bold words, the icon, the line above, and double-clicked the icon: no file picker opened (verified with a file-chooser listener, 6 s timeout, 3 spots). There is also no control anywhere on screen labelled "Import media"; the nearest is the "Media" tile in the inspector bottom-left.
- **Why it matters:** The very first instruction a new desktop user reads points at a button that does not exist, so their first click on the app does nothing.
- **Suggested fix:** Make the whole empty-state block (icon + text) a real button that opens the same picker as Inspector > Media, with a pointer cursor and hover highlight (recommended). Alternatively reword to "or click Media below" and pulse the Media tile once.
- **Screenshots:** [F-desk-04-editor-empty.webp](shots/F-desk-04-editor-empty.webp), [F-desk-05-import-click.webp](shots/F-desk-05-import-click.webp)

### Canvas-view tools (Fit, zoom, guides, camera) are hidden in a rail behind an icon that looks like "fullscreen"
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Editor top bar, far-right icon (corner brackets), and the vertical rail it opens on the right edge
- **What happened:** After the accidental pan above, I looked for a "fit / reset view" control. None is visible. The far-right top-bar icon is four corner brackets (reads as "enter fullscreen"); its label is "View options (grid, camera, zoom), hold to review-play". Clicking it slides in a 38 px unlabeled icon rail at the right edge: Fit canvas to screen (same corner-bracket icon), Layers, Add a camera, Zoom in/out with "Full", Guides, Zoom timeline in/out. None of these have visible text, and "Layers" only shows a toast "Select a clip first". There is also no keyboard shortcut for Fit in the shortcut list.
- **Why it matters:** On a 1440 px screen there is 260 px of empty dark space either side of the preview, yet the view tools are two clicks away behind an icon that suggests something else, so users who pan or zoom by accident can't find the way back.
- **Suggested fix:** On wide layouts keep the rail permanently visible in the empty space beside the preview, with text labels or hover tooltips (recommended). Give the top-bar toggle a distinct icon (e.g. a sliders/eye icon) so it no longer duplicates "Fit". Add shortcuts: Shift+1 or 0 = Fit, Ctrl+= / Ctrl+- = canvas zoom, and list them in the ? panel. Double-clicking empty canvas could also Fit.
- **Screenshots:** [F-desk-53-view-options.webp](shots/F-desk-53-view-options.webp), [F-desk-54-layers.webp](shots/F-desk-54-layers.webp)

### Right-click menu has no Cut / Copy / Paste / Duplicate / Delete / Split, and shows no shortcut hints
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Timeline clip context menu
- **What happened:** The menu lists Lock, Onion skin, Reset transform, Save whole look as preset, Save selection as element, Ask the Assistant, Flip H/V, Fit/Fill/Stretch to Composition Area, Create Clipping Mask, "Flatten to One Outline, coming soon", Media Info, colour tags. The everyday actions (Copy, Paste, Duplicate, Delete, Split at playhead) are not there, even though the app supports them (Ctrl+C/V/D, Delete, S all work from the keyboard, which I verified). No item shows its shortcut.
- **Why it matters:** Desktop users reach for right-click first for copy/delete/split; not finding them there makes them hunt the toolbar. A menu is also the classic place where people learn shortcuts.
- **Suggested fix:** Add a first group: Cut, Copy, Paste, Duplicate (Ctrl+D), Split at playhead (S), Delete (Del), with the shortcut right-aligned in grey on every item that has one (recommended). Move the "coming soon" entry to the bottom or grey it out so it doesn't look clickable.
- **Screenshots:** [F-desk-55-rclick-clip.webp](shots/F-desk-55-rclick-clip.webp)

### Shift-click and Ctrl-click on timeline clips don't multi-select, only Ctrl+A reaches the (well-built) multi-select panel
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Timeline clips, 1440x900 mouse
- **What happened:** Clicked the Star clip to select it, then Shift-clicked the Text clip: the result was Text alone selected (Star silently dropped), not both. Repeated with Ctrl-click instead of Shift-click: identical result, single selection only. Tried a marquee/rubber-band drag from empty timeline space across the clips: no selection rectangle appeared and nothing got selected. Pressing Ctrl+A ("Select all layers", also reachable from the right-click menu) DOES select all three clips at once and opens a proper multi-select inspector panel ("ALIGN ON TIMELINE": Start together, Chain up, Chain down, End together, plus group delete/duplicate in the toolbar), so multi-select is fully built, just not reachable for an arbitrary subset via the mouse.
- **Why it matters:** Shift-click and Ctrl-click to build up a selection is standard on every desktop app (Finder, Photoshop, Premiere, etc.), so a PC user will try it first. Since it silently does nothing (just re-selects one clip) instead of failing loudly, it reads as "multi-select doesn't exist here" and the person never discovers the working Ctrl+A path or the nice alignment panel behind it.
- **Suggested fix:** Make Shift-click and Ctrl-click add/remove the clicked clip from the current selection (Shift-click also selects the range between the last-clicked and this clip, matching most timeline conventions) (recommended). A marquee-drag on empty timeline space to lasso-select the clips it crosses would also help, especially for grabbing 2 of 3 clips quickly.
- **Screenshots:** [F-desk-1b-40-multiselect.webp](shots/F-desk-1b-40-multiselect.webp), [F-desk-1b-42-ctrla.webp](shots/F-desk-1b-42-ctrla.webp)

### Very wide screens leave big empty margins beside the preview and a half-empty timeline at 0:00
- **Impact:** LOW · Corrected by Claude
- **Where:** Whole editor, tested at 1024x768, 1440x900 and 1920x1080
- **What happened:** The desktop bot reported there is no desktop layout. That's wrong: at 1440 and 1920 wide there is one (inspector on the left, big preview, full-width timeline, view rail on the right). What's left: at 1920x1080 about 400 px on each side of a 16:9 preview is empty, and because the playhead sits in the middle of the timeline, the left half of the timeline is blank at 0:00.
- **Why it matters:** On a big monitor the most useful tools stay hidden in menus while a third of the screen shows nothing.
- **Suggested fix:** On wide screens, put something persistent in the side space, such as the view rail with text labels or the layer list (recommended). Consider pinning 0:00 to the left edge of the timeline when the playhead is at the start.
- **Screenshots:** [main-31-desk-1920.webp](shots/main-31-desk-1920.webp)

### Shortcut panel calls it a "marker", the app calls the same thing a "Benchmark" everywhere else
- **Impact:** LOW · Found by 1 bot
- **Where:** "?" Shortcuts/tips panel vs. the timeline's own UI
- **What happened:** The shortcuts panel lists "M, Add a timeline marker at the playhead" and "⇧+Home/End, Send the add marker to the top/bottom". Pressing M actually shows a toast reading "Benchmark added", and the two skip buttons either side of the timecode are labelled "Skip to previous/next benchmark / clip edge". So the help text says "marker" throughout, but the one place in the live UI that names the feature calls it "Benchmark".
- **Why it matters:** Small, but it's exactly the kind of mismatch that makes a person doubt they pressed the right key, someone who reads "marker" in the shortcuts panel and then looks for that word on the timeline won't find it.
- **Suggested fix:** Pick one term (Benchmark, since that's what the live toast and buttons already say) and use it in the shortcuts panel too (recommended).
- **Screenshots:** [F-desk-1b-02-shortcuts-vtop.webp](shots/F-desk-1b-02-shortcuts-vtop.webp), [F-desk-1b-55-marker-m.webp](shots/F-desk-1b-55-marker-m.webp)

## Other screen sizes

### Resizing while a layer is selected leaves duplicate, overlapping toolbar icons stuck mid-screen
- **Impact:** MEDIUM (BUG) · Found by 1 bot
- **Where:** Editor, timeline area, right after a viewport resize/orientation change
- **What happened:** With the Square layer selected (handles showing on canvas, no specific panel like Colouring open yet) at 1180x820 (tablet landscape), I resized the viewport straight to 600x900 (simulating a fold/unfold or a window resize). The result: the normal phone-style header (back arrow, "Cafe promo", v16.90, ?, notes, gear, export) rendered correctly at the top, AND a second, leftover copy of the wide layout's toolbar (parent-link icon, delete/trash icon, "..." icon stacked on the right edge at x=560, plus a "?", notes and gear icon row at y=482) rendered on top of the timeline, directly over the "Square" clip's label and the panel-collapse arrow. Reproduced twice, deterministically, going 1180x820 → 600x900 with a layer selected. Deselecting the layer (tap empty canvas) immediately cleared it and the layout redrew correctly.
- **Why it matters:** It looks like the app broke, icons floating over other icons with no visible logic, right on top of the layer name you're trying to read. A user unfolding a foldable phone or resizing a window mid-edit (exactly when they'd have a layer selected) lands on this.
- **Suggested fix:** When the layout mode crosses its width breakpoint, force a full re-render of the timeline/inspector chrome rather than only relaying out the parts that changed (recommended). At minimum, clear the "layer selected, no panel open" toolbar and rebuild it from scratch on any resize.
- **Screenshots:** [I-sizes-38-setup.webp](shots/I-sizes-38-setup.webp), [I-sizes-40-foldable-overlap-repro.webp](shots/I-sizes-40-foldable-overlap-repro.webp)

### In the wide layout on shorter screens, the last row of layer-panel tiles is cut off with no scroll hint
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Editor, LAYER panel (Colouring/Outline & Shadows/Mixing/Position/Scale/Speed/Customise Shape/Presets/Effects) and the Add > Shape grid, whenever the wide layout is active
- **What happened:** Wide layout only: in portrait on a 390px phone all 8 tiles fit, and at 1440x900 they fit too (Claude checked). Selected the Square layer's panel-button list in three different wide-layout sizes: 844x390 (phone landscape), 820x1180 (tablet portrait) and 1180x820 (tablet landscape). In ALL THREE, the 3rd row of the 8-button grid ("Presets" / "Effects") sits with its top edge exactly at the viewport's bottom edge (e.g. at 820 height: y=820, height 40 → fully below the fold; at 390 height: same; at 1180 height: same). Two of eight panel options are unreachable at a glance, with only a ~10px sliver visible as a hint, and no scrollbar. It IS scrollable with a mouse wheel (confirmed), but nothing on screen says so, and there's no touch-scroll affordance shown either. The same clipping happens to the Add > Shape icon grid (rows 3+ of shapes cut off, only reachable via the "Next page" arrows, which is a separate, working affordance the panel list doesn't have).
- **Why it matters:** Because the same 2 rows get cut off at 390px AND 1180px of height, the panel's visible height clearly isn't sizing itself to the viewport at all, it looks tied to something else (probably the number of timeline layer rows). On a tablet, where there's plainly enough room to show all 8 options at once, two full features (Presets, Effects) are effectively hidden.
- **Suggested fix:** Size the panel-button list's max-height to the actual available viewport height minus chrome, so it grows on tablets and only needs to scroll on truly short screens (recommended). Failing that, add a visible scrollbar or a bottom fade + chevron so people know to keep scrolling, matching the pattern the Add-panel already uses with its page-dot/arrow pager.
- **Screenshots:** [I-sizes-16-landscape-sel.webp](shots/I-sizes-16-landscape-sel.webp), [I-sizes-26-tabletport-editor.webp](shots/I-sizes-26-tabletport-editor.webp)

### New Project and Export dialogs hide real settings below an already-visible action row, with no hint to scroll
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Home > New Project dialog, and Editor > Export dialog, in short viewports (tested at 844x390)
- **What happened:** Opened both dialogs at 844x390. New Project showed Name, Aspect Ratio (partial) and a fully-visible Cancel/Create row, but Resolution, Frame rate, Background swatches and the Canvas summary were completely hidden below that, only reachable by scrolling inside the dialog (confirmed with mouse wheel; nothing visually indicates it's scrollable, and the last visible field right above the buttons is cut off mid-row with no divider, which reads as a rendering glitch rather than "more below"). Export did the same: Format/Resolution/Frame rate visible, then Cancel/Export MP4 already visible right below  - Quality, Range and "Export just this layer" were hidden past that same point.
- **Why it matters:** Because a full-looking action-button row is already on screen, there is no visual cue that anything is missing, a person picks Create/Export MP4 straight away and never discovers the hidden settings, or discovers by accident weeks later that "Export just this layer" existed the whole time. This is worse than a dialog that's simply too tall (which at least LOOKS incomplete); here it looks complete and isn't.
- **Suggested fix:** Add a persistent, sticky footer (Cancel/Create or Cancel/Export) that visually separates from a genuinely scrollable body with a shadow/divider, plus a small "more options" affordance (chevron or fade) on the body when it overflows (recommended). At minimum, don't let the body's last visible row get cut mid-height with no divider, round it off to a full field so the cut reads as intentional.
- **Screenshots:** [I-sizes-13-export-360.webp](shots/I-sizes-13-export-360.webp), [I-sizes-20-landscape-export.webp](shots/I-sizes-20-landscape-export.webp)

### Phone landscape squeezes the live preview down to a small box in the corner, with dead space around it
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Editor canvas area, 844x390 (phone landscape)
- **What happened:** At 844x390, the 1:1 "Cafe promo" canvas renders at roughly 190x190px, about 22% of the viewport's width and 49% of its height, floating in a mostly-empty dark band that runs the full 844px width. The left "INSPECTOR"/"LAYER" rail and the right timeline both sit below it, so nothing else is using that top band either; it's just unused space next to a small preview.
- **Why it matters:** Rotating to landscape is exactly what someone does to get a BIGGER view of their work (more precision for positioning, more detail on text/colour), and here it gets smaller instead, while the screen real-estate it gave up goes largely unused.
- **Suggested fix:** Let the canvas grow to fill the available height in the top band (up to the timeline), which for a square or portrait project would make it 2x+ larger than it currently renders (recommended). Alternatively, move the canvas to the left half of the screen at full height with the inspector+timeline stacked on the right, so width is spent on the preview instead of padding.
- **Screenshots:** [I-sizes-14-landscape-editor.webp](shots/I-sizes-14-landscape-editor.webp), [I-sizes-15-landscape-full.webp](shots/I-sizes-15-landscape-full.webp)

### "Outline & Shadows" truncates to "Outline &" in the wide layout, and the panel column never widens even on a 1180px-wide tablet
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Editor LAYER panel, wide layout, all three wide sizes tested
- **What happened:** In the 3-column button grid (Colouring / Outline & Shadows / Mixing / ...), the middle button's label visibly clips to "Outline &" at 844, 820 AND 1180px of width, the accessible label is the full "Outline & Shadows" but the rendered text is cut with no ellipsis. The whole "INSPECTOR" rail stays a fixed ~300px wide at every width I tested, including the 1180px-wide tablet landscape where there is 880px left over for the timeline, the rail never claims any of that extra room.
- **Why it matters:** A user has to guess what "Outline &" means (Outline & something? Outline and... Angle? Alignment?) until they tap it, small friction, but avoidable, and it doesn't improve even on the widest screen tested.
- **Suggested fix:** Let the button wrap the label onto a second line instead of clipping it (recommended for the current 300px rail), or widen the rail (e.g. to 340-380px, or make it a 4-column grid) once the viewport is comfortably wider than phone-landscape, so tablets get to use their extra width for this too.
- **Screenshots:** [I-sizes-16-landscape-sel.webp](shots/I-sizes-16-landscape-sel.webp), [I-sizes-30-tabletland-layersel.webp](shots/I-sizes-30-tabletland-layersel.webp)

### Home screen stays a single narrow column on every larger size, leaving most of the screen empty
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Home > Projects list (also Templates/Elements use the same list)
- **What happened:** At 820x1180 (tablet portrait), 1180x820 (tablet landscape) and 600x900 (foldable), the project cards render as one column, each stretched edge-to-edge with the thumbnail and text bunched on the left and a large empty gap before the "..." menu on the right. With only 4 projects, tablet portrait in particular leaves roughly 500-600px of totally empty vertical space between the last card and the "+" button. It reads exactly like a stretched phone screen rather than a layout designed for the space, which is one of the specific things this review was asked to watch for.
- **Why it matters:** More of the owner's projects (or Templates/Elements) could be visible at once without scrolling, and thumbnails could be bigger and show more of the actual project (a separate bot flagged that today's square thumbnails already crop non-square projects, a wider card makes that worse, not better, until it's fixed).
- **Suggested fix:** Switch the project/template/element lists to a responsive grid (2 columns around 700-900px wide, 3 around 1100px+) instead of a single stretched column (recommended). Keep the current single-column card design as the <700px fallback.
- **Screenshots:** [I-sizes-25-tabletport-home.webp](shots/I-sizes-25-tabletport-home.webp), [I-sizes-22-landscape-home.webp](shots/I-sizes-22-landscape-home.webp)

### Editor's bottom timeline/inspector strip keeps a fixed short height on tablets, wasting the tall space above the canvas
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Editor, wide layout, tall viewports (tested at 820x1180 tablet portrait)
- **What happened:** At 820x1180, the canvas floats with roughly 124px of totally empty background above it, and the bottom inspector+timeline strip is the same fixed ~260px tall block seen at 390px and 820px of height (see the panel-clipping finding above, same evidence). With 2 layers the timeline only needs 2 rows, so on a much taller screen there's no reason the strip couldn't grow to show more layer rows without scrolling, or to give the inspector panel enough room to show all 8 buttons without clipping.
- **Why it matters:** A tablet's extra vertical space isn't going anywhere useful, not to a bigger canvas (which is fine, it's already width-limited by the square aspect), not to more visible timeline rows, and not to fixing the clipped panel two findings up. It just sits empty above the canvas.
- **Suggested fix:** Let the bottom strip's height respond to available viewport height on wide layouts, growing to show more timeline rows and the full panel-button grid before it ever needs to scroll (recommended); this also happens to fix the "Presets"/"Effects" clipping above for free on tall screens.
- **Screenshots:** [I-sizes-26-tabletport-editor.webp](shots/I-sizes-26-tabletport-editor.webp)

### The panel/menu that's open survives a resize, but tapping is unforgiving mid-transition
- **Impact:** LOW · Found by 1 bot
- **Where:** Editor, general (observed while testing all five sizes)
- **What happened:** Every resize I did (aside from the duplicate-icon bug above) correctly kept the selected layer, the open panel/menu and the playhead position exactly where they were, genuinely good. The only friction: because panels reposition on resize, a tap queued right after a viewport change can land on whatever is now under those old coordinates (I hit this myself a few times, e.g. landing on a "Delete selected layer" button that moved into place after a resize). This is partly a side-effect of scripted testing rather than a real per-frame interaction, but the moved hit-targets are real.
- **Why it matters:** A person rotating their phone with a finger still resting near a button (e.g. right after a rotation animation) has a small window where a tap could hit a relocated control instead of the one they were looking at.
- **Suggested fix:** Briefly ignore/debounce taps for ~150-200ms right after an orientation/resize event finishes, so a queued tap doesn't land on a just-relocated control (recommended).
- **Screenshots:** [I-sizes-18-landscape-back.webp](shots/I-sizes-18-landscape-back.webp), [I-sizes-19-undo.webp](shots/I-sizes-19-undo.webp)

## Edge cases

### Long paragraph of text overflows the canvas with no wrap and no warning
- **Impact:** HIGH · Confirmed by a 2nd bot
- **Where:** Editor, Text layer, on-canvas render (also visible in the main timeline preview after committing)
- **What happened:** Added a Text layer, typed a ~300-character paragraph (with emoji) at the default 160pt size. The text-entry field at the top of the screen nicely wraps the text into 3 readable lines while typing. But the moment you look at the canvas (both live while editing and after committing with the checkmark), the same text renders as ONE giant single line that overflows both left and right edges of the frame, showing only a small illegible slice like "w it just keeps g". This is not a temporary artifact, it's what actually renders, and it's how the layer looks back in the main timeline view after exiting the text editor. There's no auto-shrink-to-fit, no wrap toggle, no width handle visible in "Customise Text", and no warning that the text no longer fits.
- **Why it matters:** The editing chrome (the input field) actively lies to the user about what their text looks like, it wraps there but not on the actual layer, so a user has no reason to suspect a problem until they scrub the preview and find giant unreadable text sticking off both sides of the frame. Long captions, quotes, or pasted paragraphs are a completely normal use case, not a stress test.
- **Suggested fix:** A few options, could combine: (1) recommended, give text layers a bounding-box width (draggable side handles, like most editors) so text wraps inside it by default instead of running on forever; (2) at minimum, auto-shrink font size to keep the text within canvas bounds unless the user has explicitly overridden it, with a small "text doesn't fit" indicator/toast if it still overflows; (3) make the on-canvas preview match what the top text-entry field already shows (wrapped), since the wrapping logic clearly already exists somewhere in the app.
- **Screenshots:** [J-edge-07-long-text.webp](shots/J-edge-07-long-text.webp), [J-edge-08-long-text-done.webp](shots/J-edge-08-long-text-done.webp)

### Pressing Backspace right after committing a number field deletes the whole selected layer, no confirmation
- **Impact:** HIGH (BUG) · Found by 2 bots (desktop keyboard)
- **Where:** Editor, any layer's numeric field (reproduced on Speed %, in the per-clip "Speed" panel), right after pressing Enter/Return to submit it
- **What happened:** Selected the photo-landscape clip, opened its Speed panel, tapped the "Speed %" number field (it visibly gets a focus ring), typed a new value, and pressed Enter to commit it. Enter submits the value AND closes the field's focus (the panel drops back to the main editor/layer-list view, though the layer stays selected). At that point I pressed Backspace once, expecting nothing since I had nothing left to delete in a text field. Instead the entire "photo-landscape" layer vanished immediately: no confirmation dialog, no undo toast, the layer count and layer list just silently update. Undo does bring it back. I reproduced this twice in a row with the same steps (commit a numeric field with Enter, then press Backspace once). The tap-count bot hit the same thing independently in Position/Scale: it clicked into the X value (which isn't a real text field), pressed Backspace to fix a digit, and the whole layer was deleted. This is a hardware-keyboard problem (PC, or a phone with a keyboard attached).
- **Why it matters:** Typing a number then hitting Enter, then hitting Backspace again (out of habit, to clear a residual character, or because a phone's software keyboard leaves a lingering backspace touch) is completely normal behavior, not an edge case. There is nothing on screen after Enter to suggest that keyboard focus has left the field and that Backspace is now a global "delete this layer" shortcut. A user could lose a layer (and not notice for several actions) with a single stray keystroke.
- **Suggested fix:** A few options, could combine: (1) recommended - don't bind Backspace/Delete to "delete layer" at all when nothing besides the layer itself is targeted right after a text-field commit; require the layer's row/thumbnail (not just "selected in the inspector") to have explicit focus, or require the delete shortcut to be Fn+Delete / a modifier, matching how most editors avoid single-key destructive shortcuts. (2) At minimum, show the same confirmation-less-but-visible toast that other destructive actions could use ("Layer deleted - Undo"), so it's at least noticeable immediately rather than silent. (3) Keep focus inside the numeric field after Enter (many form patterns do) so a stray keypress lands harmlessly back in the field instead of falling through to a global shortcut.
- **Screenshots:** [J-edge-41-after-enter.webp](shots/J-edge-41-after-enter.webp), [J-edge-42-after-stray-backspace.webp](shots/J-edge-42-after-stray-backspace.webp)

### Duplicated layers all get the same name, and it gets worse with each duplicate
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Editor, layer panel, "Layer actions -> Duplicate selected"
- **What happened:** Added a Square shape layer, then used Layer actions -> Duplicate selected repeatedly to build a 42-layer project (stress-testing "many layers"). Each duplicate is named by appending the literal word "copy" again: "Square" -> "Square copy" -> "Square copy copy" -> "Square copy copy copy" -> ... After a handful of duplicates the layer list shows 25+ rows that all read "Square copy copy copy c..." (truncated), with identical icons and identical pink color swatches. There is no way to tell any of them apart in the list without opening each one.
- **Why it matters:** The very reason someone duplicates a layer 20+ times (building a grid of repeated shapes, stamping out multiple copies of an element) is exactly the scenario where distinguishing them by name matters most, e.g. to select "the 5th one" to nudge it. Right now every row is visually and textually identical.
- **Suggested fix:** Number duplicates instead of chaining "copy": "Square", "Square copy", "Square copy 2", "Square copy 3"... (recommended, matches what most editors/OS file managers do and stays short). Alternatively, give each layer a distinct swatch tint variation, or show an index badge in the layer row.
- **Screenshots:** [J-edge-19-many-dups-panel.webp](shots/J-edge-19-many-dups-panel.webp), [J-edge-20-many-layers-list.webp](shots/J-edge-20-many-layers-list.webp)

### The top-left back arrow is blocked by the Export dialog but not by the Canvas settings dialog, one tap silently exits the whole project
- **Impact:** MEDIUM (BUG) · Found by 1 bot
- **Where:** Editor, top-left back arrow, with a full-screen dialog open over the editor
- **What happened:** Opened Export (the up-arrow icon, top right). With it open, tapping the top-left back arrow (still visible, dimmed, behind the backdrop) did nothing, the modal correctly absorbed the tap, exactly as expected. Then opened Canvas settings (the gear icon) instead, on the same project, and tapped the exact same back-arrow location. This time the tap went straight through: the Canvas settings dialog closed AND the editor closed with it, landing on the Home screen in one tap, with no confirmation. Reproduced twice in a row, both times identical.
- **Why it matters:** The two dialogs look and behave the same in every other way (same backdrop dim, same card style, same Cancel/Apply pattern), so there is no way for a person to predict that "back" is safe to tap over one but not the other. If Canvas settings changes had been made first (a new aspect ratio, a background color) before that stray tap, they would be silently discarded along with the exit, the person only asked to go back one step and got two.
- **Suggested fix:** Give every modal dialog the same tap-blocking backdrop Export already has (recommended), it is clearly the correct behavior since Export already implements it; Canvas settings is the outlier. At minimum, make the back arrow's hit target inert (not just visually dimmed) whenever any dialog is open, app-wide, rather than per-dialog.
- **Screenshots:** [J-edge-2-04-canvas-settings.webp](shots/J-edge-2-04-canvas-settings.webp), [J-edge-2-05-after-back-canvas.webp](shots/J-edge-2-05-after-back-canvas.webp)

### Undo survives leaving and reopening a project via Home, but a full reload silently empties the undo stack
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Undo (Ctrl+Z), compared across "Home and back into the project" vs. a full page reload
- **What happened:** Moved a Text layer, then left via the back arrow all the way to Home, then reopened the same project: the moved position was still showing (as expected), but pressing Ctrl+Z correctly undid that exact move, snapping the layer back to where it was before I left and re-selecting it, the undo history survived the round trip through Home. Then moved the layer again and, instead of going through Home, did a full page reload: the moved position was kept (as in the finding above), but Ctrl+Z this time did nothing at all, no visual change, no console message, no error. The undo stack had been silently reset by the reload.
- **Why it matters:** Both paths look identical to a person, you left the project, you're back in it, your last change is showing, but only one of them lets you undo that change. There is no indicator anywhere (button state, tooltip, toast) saying "there is nothing to undo" vs "there is" so a reload-then-undo reads as broken rather than as an empty history.
- **Suggested fix:** Either persist enough undo history across a reload to match the Home-and-back path (recommended, since the data needed, a small stack of recent operations, is the same either way), or, if that's not practical, grey out / disable the Undo button and its shortcut immediately after a fresh load until at least one new change is made, so a no-op reads as "there's genuinely nothing to undo" instead of "I pressed undo and nothing happened."
- **Screenshots:** [J-edge-2-37-after-undo.webp](shots/J-edge-2-37-after-undo.webp), [J-edge-2-39-reload-then-undo.webp](shots/J-edge-2-39-reload-then-undo.webp)

### Rapid double-tap on a shape doesn't duplicate the layer, but the second tap falls through onto the next screen and opens an unrelated panel
- **Impact:** MEDIUM (BUG) · Found by 1 bot
- **Where:** Add panel (+ → Shape), tapping a shape twice quickly (two separate real taps, not a single double-click event)
- **What happened:** Tapped the Heart shape button twice quickly (two separate taps, ~150ms apart, at the same on-screen coordinates). Only one Heart layer was created (good, no duplicate). But the result screen was not the usual "shape added, plain timeline" view, it landed directly inside the new layer's Position/Scale panel. Tracing it: the first tap creates the layer and switches to its clip-options grid; the second tap, landing at the same x/y a beat later, hits whichever grid button now occupies that spot, in this case Position/Scale. Repeated with Pentagon (a shape in a different grid column): the second tap instead opened Customise Shape, matching whatever button sits at that same coordinate for that shape. A true single native double-click event (tested earlier on Star) did not show this, only two discrete real taps do, which is what an actual finger double-tap produces.
- **Why it matters:** A person double-tapping "because the first tap didn't seem to register" (a very normal reflex, especially on a phone) doesn't just get one shape, they get dropped into a random sub-panel of it they never asked to open, and have to back out again to get to what they expected (the plain timeline with their new shape on it).
- **Suggested fix:** Add a short tap-guard (150-250ms) after a create action so a fast-following tap in roughly the same spot is swallowed instead of hitting whatever renders next (recommended). Alternatively, always land a freshly-created shape on the plain timeline (deselect the auto-opened grid) rather than leaving a panel-of-buttons sitting right under the finger that just tapped "create."
- **Screenshots:** [J-edge-2-42-after-two-rapid-taps.webp](shots/J-edge-2-42-after-two-rapid-taps.webp), [J-edge-2-46-pentagon-dbltap.webp](shots/J-edge-2-46-pentagon-dbltap.webp)

### Rapid layer-duplicate taps throw an uncaught NotFoundError in the console
- **Impact:** LOW (BUG) · Found by 1 bot
- **Where:** Editor, layer panel, "Layer actions -> Duplicate selected", tapped repeatedly in quick succession
- **What happened:** While building the 25+ layer stress-test project, I duplicated the selected layer many times in a fast loop (tap "Layer actions", tap "Duplicate selected", repeat, ~0.1-0.3s between taps). During one such burst, logs showed repeated uncaught errors: NotFoundError: Failed to execute 'remove' on 'Element': The node to be removed is no longer a child of this node. Perhaps it was moved in a 'blur' event handler? at app.js:5985. I re-ran the same fast-tap sequence twice more afterward (15+ iterations each) and could not get it to recur, so it looks timing-dependent rather than 100% reproducible - flagging per the brief's instruction to report real bugs even if not rock-solid reproducible.
- **Why it matters:** The message names a blur handler tearing down a DOM node (most likely the "Layer name" text input in the per-layer panel) while something else is also removing it, which is a classic race between a rename-input teardown and a rapid panel re-render. It happened during completely ordinary, if fast, real-world usage (a person double-tapping a button they like).
- **Suggested fix:** Guard the node-removal in that blur/done handler with a try/catch or an isConnected/parentNode check before calling .remove(), so a stale reference from a fast re-render can't throw. Since I could not pin an exact repro, worth adding a regression test that fires "duplicate selected" N times back-to-back with minimal delay and asserts no uncaught console error.
- **Screenshots:** 

### The phone back gesture does nothing at all in the editor, open panel or not
- **Impact:** LOW (needs a real-device check) · 1 bot. Headless test browsers may ignore the back shortcut, so check with a real swipe
- **Where:** Editor, Alt+ArrowLeft (the browser/phone back gesture), with a layer's clip-options panel open and with nothing open
- **What happened:** With a layer selected and its clip-options panel open, pressed the back gesture: no change at all, panel stayed open, nothing logged. Deselected everything (plain timeline, no panel), pressed it again: same, no change, still in the editor. Also tried it mid-text-edit with an uncommitted change typed in: no change, text stayed in the field, nothing was lost.
- **Why it matters:** Nothing bad happens, which is the good news, but nothing good happens either, most phone web apps treat this gesture as "close the thing that's open," one level at a time, the same job the in-app back arrow does. Here it is simply inert everywhere in the editor, so a person's instinctive swipe-back to close a panel does nothing and they have to hunt for the tiny on-screen arrow instead.
- **Suggested fix:** Push a history entry when a panel/dialog opens and pop it on the gesture, closing one level at a time, the same behavior the in-app back arrow already has, just wired to the gesture too (recommended). At minimum, if that's not desired, no change needed since it's at least safe.
- **Screenshots:** [J-edge-2-23-gesture-panel-open.webp](shots/J-edge-2-23-gesture-panel-open.webp), [J-edge-2-24-gesture-no-panel.webp](shots/J-edge-2-24-gesture-no-panel.webp)

## Speed (tap counts)

### You can't move the playhead past the current end, so the trim tools can't make a project longer
- **Impact:** HIGH · Confirmed by a 2nd bot
- **Where:** Timeline, time readout, and a clip's Trim / Extend to playhead buttons
- **What happened:** Slideshow job: 3 photos at 2 s each needs 6 s, but the project was 5 s long. Typing 6 into the time readout silently snapped to 00:05:00, the current end. So there's no way to park the playhead at 6 s and tap "Extend end to playhead". The only way out was dragging the clip itself, which sometimes scrubbed the playhead and sometimes moved the clip, for the same gesture. The total only reached 0:06 after the drag worked. The second bot saw the same, and "Extend end to playhead" then said "No more source to extend into".
- **Why it matters:** "Make this last clip end at 6 s" is an everyday edit. The app's best editing tool (Skip to edge + Trim/Extend to playhead) stops working exactly when a project needs to grow, and nothing says why.
- **Suggested fix:** Let the playhead go past the end (show the empty area after it as a darker zone), and let Extend-to-playhead grow the project (recommended). At minimum, when a typed time is past the end, say so: "Project is 5 s long. Extend it to 6 s?" with a one-tap Extend.
- **Screenshots:** [G-speed-38-dragextend.webp](shots/G-speed-38-dragextend.webp), [G-speed-42-total6.webp](shots/G-speed-42-total6.webp)

### Importing several photos at once stacks them all at 0:00 instead of one after another
- **Impact:** HIGH · Confirmed by a 2nd bot
- **Where:** + > Media > Import, picking several files in one go
- **What happened:** Picked 3 photos in one file-picker action (a nice shortcut that works). All 3 landed as separate layers starting at 0:00 and fully overlapping, so only the top one is visible. Turning that into a slideshow took 14 steps of trimming and moving. The second bot saw the same with 2 photos and a video.
- **Why it matters:** When someone picks several photos in order, they almost always want them in order. The multi-pick shortcut currently creates the most work instead of saving it.
- **Suggested fix:** When several photos or videos come in from one pick, lay them end to end in the order picked (recommended). Offer the other option in a toast: "Added 3 in a row. Stack them instead?"
- **Screenshots:** [G-speed-24-bulkimport2.webp](shots/G-speed-24-bulkimport2.webp), [G-speed-34-trimmed1.webp](shots/G-speed-34-trimmed1.webp)

### A crossfade between two photos takes about 11 steps, because there are no transitions and opacity hides under "Mixing"
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Layer panel > Mixing; Effects categories; + Add behavior
- **What happened:** There's no Transitions category in Effects and no Fade behavior, so a crossfade has to be built by hand: two opacity keyframes on each clip at each join, about 11 actions per join and 22 for a 3-photo slideshow. Opacity itself lives under a tile called "Mixing" next to blend modes. The bot only found it after opening Position/Scale and Colouring first.
- **Why it matters:** Fading between photos is the most common thing anyone wants in a slideshow, and it currently costs more taps than everything else in the job put together.
- **Suggested fix:** Add a one-tap transition at the seam between two clips on the same row (tap the seam: Cross-fade, Fade to black, Slide, with a duration) (recommended). Rename the tile to "Opacity & blend", or show the opacity value on the tile itself so people can see where it lives.
- **Screenshots:** [G-speed-57-mixing2.webp](shots/G-speed-57-mixing2.webp), [G-speed-59-kf2.webp](shots/G-speed-59-kf2.webp)

### There's no way to type a clip's length
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Clip panel for photos, video and shapes
- **What happened:** No field shows or sets how long a clip is. The only way to make a photo exactly 2 s is to type 2 into the time readout, then tap Trim end to playhead. That's 3-4 actions per clip, repeated 7 times in the slideshow job.
- **Why it matters:** "Each photo 2 seconds" is how people think about a slideshow, and the app makes them translate it into playhead positions.
- **Suggested fix:** Show the clip's duration in its panel as an editable number ("2.0 s"), and when several clips are selected, let one value set them all (recommended). Keep Trim to playhead as it is.
- **Screenshots:** [G-speed-34-trimmed1.webp](shots/G-speed-34-trimmed1.webp)

### The Timeline options strip sits over the left edge of the preview, right where slide-in drags start
- **Impact:** MEDIUM · Found by 1 bot
- **Where:** Editor, phone layout, with Timeline options open
- **What happened:** With the Timeline options strip open (speed, loop, magnet, in/out marks), it covers about 38 px of the preview's left edge. Twice, a drag meant to pull a layer in from off-screen left grabbed a strip button instead and did nothing to the layer.
- **Why it matters:** Sliding something in from the left is one of the most common animations, and the one place it needs a clean drag is covered.
- **Suggested fix:** Close the strip automatically when a layer drag starts on the preview, or dock it above the preview instead of over it (recommended). While a layer is being dragged, the drag should win over any toolbar underneath.
- **Screenshots:** [G-speed-96-audioadded.webp](shots/G-speed-96-audioadded.webp)

### Text Fade in defaults to letter-by-letter
- **Impact:** LOW · Found by 1 bot
- **Where:** Text > Aa > Animate > Fade in > By
- **What happened:** Picking Fade in on a title fades it in one character at a time by default. Getting the whole line to fade takes 2 more taps (By > Line).
- **Why it matters:** For a short title, "fade in" almost always means the whole thing, so every title card pays 2 extra taps.
- **Suggested fix:** Default By to Line for Fade in, or to Line whenever the text is a single line (recommended). Keep Character and Word one tap away.
- **Screenshots:** [G-speed-06-fadein-selected.webp](shots/G-speed-06-fadein-selected.webp)

## What Claude double-checked

- **Confirmed:** Tapping a layer on the preview doesn't select it. Reproduced on a fresh circle with a real touch tap; tapping empty canvas deselects fine.
- **Confirmed:** The keyframe diamond shows a stale state after the playhead moves. At 1:07 it said "Remove keyframe" with no keyframe there, and tapping it added one.
- **Confirmed:** The effects library's first screen doesn't scroll on a 390px phone. Two real touch swipes, including one on the little handle bar, and the Categories row stayed below the screen.
- **Corrected:** "You can't move clips in time" (from two bots) is wrong. Hold for about 0.7 s, then drag, and the clip moves on both phone and desktop. Rewritten as "the hold is invisible".
- **Corrected:** "There's no desktop layout" is wrong. At 1440 and 1920 wide there is a proper desktop layout. Rewritten as an empty-margins issue and downgraded to low.
- **Softened:** "The first size keyframe divides the value by 100" didn't happen on a fresh shape in 3 tries. Kept as a real bug with an unknown trigger, downgraded to medium.
- **Narrowed:** "The layer panel's last row is cut off at every height" only happens in the wide layout on shorter screens. Portrait phones and 1440x900 desktops show all 8 tiles.
- **Corrected:** "There are no built-in animation presets" is wrong for text. Text has Fade, Slide, Pop and Spin under Aa > Animate. Rewritten as "presets exist for text only".
- **Corrected:** "Audio clips have no waveform anywhere" is half wrong. A faint waveform shows on the full timeline, and it disappears when the clip is selected. Downgraded to medium.
- **Left out:** The tap-count bot said shapes have no Width/Height fields. They do, behind the Scale toggle in Position / Scale, so that claim isn't in the report.
- **Re-tested:** A second bot re-did the 9 high-impact claims that only one bot had made, each from a fresh project. 6 confirmed. Keyframe diamonds and the blend-mode list were partly confirmed. The Undo double-revert wasn't reproduced, so it dropped to medium and out of the top 12.
- **Retracted:** "The effects library won't scroll" (top pick #6) and "the blend-mode list won't scroll" were false. The review's test browser had a bug: its real window was 720px tall under a 844px phone screen, so swipes starting in the bottom 124px went nowhere while taps still worked. With that fixed, both lists scroll from anywhere. Removed from the report.
- **Your decisions:** Three top picks turned out to be things you asked for: preview taps never select (v2.93), a preview drag moves the whole animation (v3.00), and the time pill is the play button (queue 364). They're labelled on the page, and their fixes now keep your rule and only add the missing explanation.

## Not covered yet

- A real MP4 export from start to finish. This headless test browser can't encode H.264, so export was judged on GIF and PNG plus the app's own messages.
- Anything that needs a real finger, such as pinch feel, scroll momentum and haptics. The bots used simulated touch.

## Already great, don't break

**Home & projects**
- Long-press on a project card to enter Select mode works well.
- The new-project dialog remembers your last aspect, fps and background, and tapping outside it doesn't throw your choices away.
- Search takes vague dates ("yesterday", "2 aug").

**Building**
- Shapes and text go in fast: 2-3 taps, and they land already selected with handles.
- Once a layer is selected, moving, scaling and rotating it on the preview is precise and lag-free.
- Pinch-zoom on the timeline and the drag handle for reordering layers both work smoothly.

**Animating**
- The long-press keyframe menu (named eases, three loop modes, copy and delete) is well designed once found.
- The curve editor (Bezier, Bounce, Steps, draggable curve) is a real one, not a dropdown.
- Copying a keyframe to a different layer works exactly.
- The circular rotation dial lands cleanly on round numbers.
- Typing an exact playhead time is frame-accurate.

**Styling & effects**
- Browsing effects previews them live on your actual layer, and tapping again removes it.
- Recents and saved presets show real thumbnails of your own footage.
- Clipping masks and grouping give clear, plain-English toasts.
- The Outline & Shadow panel scrolls and fits perfectly at 390px.

**Export & settings**
- Changing aspect ratio explains itself: "2 layers scaled to match. Undo puts it back."
- A running export can't be lost to a stray tap or the back button.
- The pre-export notes checklist is a genuinely good idea.
- Cancel mid-export is clean.

**Desktop**
- The keyboard shortcuts work and match the shortcuts list exactly: Space, nudge with arrows (Shift = 10 px), frame step, Home/End, undo/redo, Tab through layers.
- Text editing with a real keyboard is smooth.
- Mouse-wheel zoom on the preview is smooth with a live percentage.
- Icon buttons carry specific tooltips that also say what a hold does.

**Other screen sizes**
- Selection, the open panel and the playhead survive a resize.
- Tablet landscape (1180x820) is the best-looking size tested.

**Edge cases**
- A layer moved on the canvas keeps its exact position through a full reload, every time.
- The back arrow closes one panel level at a time, and Export's backdrop correctly blocks it.
- Escape while typing in a text layer keeps the text instead of throwing it away.
- Double-tapping a shape never creates a duplicate layer.
- Undo survives going Home and reopening a project.

**Speed (tap counts)**
- Skip to clip edge + Trim / Extend / Move to playhead is fast and exact once found. It's the reason Music + cut took 13 taps.
- Text's Animate presets (Fade, Slide, Pop, Spin with duration and by character / word / line) turned a title card into an 18-tap job.
- Imported media shows up as one-tap picks next time.
- New text and shapes land centred.
