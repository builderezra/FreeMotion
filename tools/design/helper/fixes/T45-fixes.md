# QF1: fixes for tutorials 11-20 (PM spot-check, 7 Oct)

Apply each one exactly, keep the citations, push tutorials-drafts. The LOSE-WORK items come first (12 Detect speech, 18 template overwrite). 19 of 25 checked claims were wrong or need a fix, which is too many. Slow down on future tutorials: trace every state-dependent claim in code before you write it.

## [WRONG] T12 step 8: "Tick Caption background for a box behind the words."
**Problem:** Add > Captions creates the layer with captionBg = true, so the box is already there and the setting is already ticked. A beginner who follows the step turns the box OFF.
**Fix / replacement:** 8. **Caption background** is ticked to start with, which puts a box behind the words. Untick it if you want the words on their own.
**Evidence:** app.js:3485 `layer.captionBg = true;` in FM.addCaptionLayer; inspector.js:5757 checkRow('Caption background', !!layer.captionBg, ...)

## [FIX] T12 Tip: Detect speech "lays down empty captions" (LOSE-WORK RISK)
**Problem:** detect() throws away the whole caption list and its timings and builds a new one. Old words move only onto the single new caption they overlap most, one for one. Any typed caption that doesn't line up with detected speech loses its words. Because the tip comes after steps 3-7, a user who typed captions first and then taps Detect speech loses words and timings without warning. Undo is the only way back. Also, the starting words "First caption" / "Second caption" are carried over, so the new captions are not empty.
**Fix / replacement:** Tip: **🎙 Detect speech**, at the top of that captions list, finds where someone talks and replaces your captions with new ones timed to the speech, all on your device. Use it **before** you type: it doesn't write the words for you, and words that don't line up with speech are dropped. If you lose words, tap undo straight away.
**Evidence:** captions.js:276-317 (old = typed cues; cues rebuilt from detected segments; `capLayer.captions = cues;` best-overlap carry with a `used` set); app.js:3483-3484 placeholder texts

## [FIX] T12 step 4: the cue strip shows "a count like 1/2"
**Problem:** The label actually reads "Cue 1 / 2" (or "Cue —").
**Fix / replacement:** 4. Under the bar at the top is a small strip: **‹**, a count like **Cue 1 / 2**, **›** and **+**. Tap **›** to reach the next caption and type it. Tap **+** to add a new caption after this one.
**Evidence:** text-edit.js:198-202 updateCueNav: 'Cue ' + (active.cueIndex + 1) + ' / ' + cues.length

## [WRONG] T13 Tip: "The bar counts your strokes (\"3 strokes\")"
**Problem:** On any screen narrower than 420px, which includes a ~380px phone, the stroke count is display:none. A phone user never sees it.
**Fix / replacement:** Tip: On a computer, the bar counts your strokes ("3 strokes"). On a phone there isn't room, so the count is hidden.
**Evidence:** styles.css:6079-6080 `@media (max-width: 419px) { #draw-bar .db-hint { display: none; } }` (queue 896 comment: count never readable on a phone)

## [FIX] T13 step 5: the eraser lets you "drag over a stroke to rub it out"
**Problem:** The eraser deletes the WHOLE stroke you touch. It can't rub out part of one, and it only reaches strokes from the current sketch. A beginner expecting to rub out a little bit loses a whole stroke.
**Fix / replacement:** 5. Tap the eraser icon, then touch or drag over a stroke. The whole stroke disappears; it can't rub out just part of one. Tap the eraser again to go back to drawing. If the wrong stroke goes, tap the undo arrow.
**Evidence:** draw-tool.js:572-577 'WHOLE STROKES, not part of one'; strokeIndexAt walks sessionSubs only (draw-tool.js:586-598)

## [FIX] T13 step 3: "A small bar covers the picture."
**Problem:** On a phone the bar is pinned to the bottom of the screen. On a computer it sits UNDER the picture and does not cover it.
**Fix / replacement:** 3. A small bar appears at the bottom of the screen (on a computer, just under the picture). Press and drag on the picture to draw. Lift your finger and the stroke stays.
**Evidence:** styles.css:6012 #draw-bar bottom: safe-area+16px; styles.css:6024-6028 @media (min-width:701px) top: var(--fm-canvas-bottom)+14px

## [WRONG] T14 step 5: "After three points the bar says it is ready to finish"
**Problem:** That message is the same .db-hint element, and it is hidden below 420px. On a ~380px phone the bar says nothing.
**Fix / replacement:** 5. Once you have three or more points, tap **Done**, or tap your first point again to close the shape.
**Evidence:** draw-tool.js:766 hint text 'Done / Enter to finish…'; styles.css:6079-6080 .db-hint display:none under 420px

## [FIX] T14 step 7: "drag its handles to shape a curve"
**Problem:** Points placed with Custom shape are plain corner points ([x,y], no curve flag), so selecting one shows no handles. The panel's own hint only promises handles "on a curve point". Since the order is step 7 then step 8, a beginner looks for handles that aren't there.
**Fix / replacement:** 7. Tap a point to select it. Your points start sharp, so there are no handles yet.
8. On the left edge, the three icon buttons under the diamond make the selected point smooth (Curve), sharp (Corner), or delete it (the bin). After **Curve**, drag the point's handles to bend the line. Tap a hollow ring to add a point; double-tap a point to delete it.
**Evidence:** draw-tool.js:684-686 finish() passes t.points (pushed as [x,y] at 254/815); app.js:3376-3377 keeps p[2] only if present; inspector.js:4862 hint 'on a curve point, drag its handles'

## [FIX] T15 step 4: "Make sure the first of the four icons on the right edge (Move) is lit."
**Problem:** Tapping Move while it is already lit switches to anchor-point mode. Move stays lit (alt style), but the ◆ diamond and the easing button are not drawn there, so step 5 ("Tap the diamond") fails. A beginner told to "make sure it's lit" is likely to tap it.
**Fix / replacement:** 4. With the camera selected, open **Position / Scale**. The first of the four icons on the right edge (Move) should be lit. If it isn't, tap it once. (Tapping it while it's lit switches to the anchor point and hides the diamond. Tap it again to come back.)
**Evidence:** inspector.js:5370-5378 (Move pressed on Move → 'anchor'); inspector.js:4970-4977 kfBtn/easeBtn only appended `if (props.length)`, and MT_PROPS.anchor is empty

## [FIX] T16 'If it doesn't work': "tap the small up-down switch ... to move the add row to the top"
**Problem:** The switch sends the add row to whichever end it is FURTHEST from. If the add row is in the upper half, one tap sends it to the BOTTOM, and the re-added adjustment lands under everything again. Deleting the layer also throws away any grading tweaks.
**Fix / replacement:** If it doesn't work: If your video doesn't change, the adjustment is below it. Delete it. Tap the small up-down switch in the row with the time counter until its knob sits at the top (that moves the add row to the top of the timeline), then add the adjustment again. Brightness and Saturation come back on by themselves, but you'll need to redo any changes you made.
**Evidence:** app.js:2926-2927 `moveAddMarker(p < 0.5 ? n : 0); // to the end it is FURTHEST from`; app.js:2843-2865 p = addAt / layers.length

## [WRONG] T17 step 6: "A card asks you to let them in. Tap Allow."
**Problem:** For a friend joining, the card reads "<name> wants to join "<project>" as Editor." and its buttons are **Don't allow** / **Let in**. "Allow" / "Not now" appear only when an existing member asks to edit. The card also turns the friend away by itself after 2 minutes. The draft's verification row ("Allow / Not now") checked the wrong branch.
**Fix / replacement:** 6. A card says your friend wants to join. Tap **Let in**. Answer within 2 minutes, or it turns them away and they have to try again.
**Evidence:** collab-ui.js pumpKnock ~4090-4120: `const asking = k.info.kind === 'ask'`; text `who + ' wants to join …'`; `btn('ck-yes accent', asking ? 'Allow' : 'Let in', …)`; KNOCK_TIMEOUT 120000

## [FIX] T17 step 5: friend opens the link → "Join a friend's project" sheet → Join
**Problem:** For a first-time friend, the pending-join path first shows other cards. On iPhone Safari it shows "Open this in your FreeMotion app". If the feature is off on their device, it asks "Turn on Work with friends to join" (Turn on / Not now). With no profile, it asks "What should others see?". Only then does the Join sheet appear. A friend following the tutorial meets three unexplained cards.
**Fix / replacement:** 5. Your friend opens the link. The first time, FreeMotion asks them to turn on Work with friends (they tap **Turn on**) and to pick a name and colour (they tap **Continue**). On an iPhone it may first offer to open the link in the FreeMotion app instead of Safari; they follow its steps. Then a sheet called **Join a friend's project** appears, and they tap **Join**.
**Evidence:** collab-ui.js U.resumePendingJoin ~4985-5010 (landingCard if iOS browser → labsCard if !labsOn → U.profile() → drawJoin); labsCard title 'Turn on Work with friends to join', buttons 'Not now'/'Turn on'; landingCard 'Open this in your FreeMotion app'

## [FIX] T17 step 4: "You now have a link, a QR picture and a short code" + 'No link?' paragraph
**Problem:** The QR picture is behind a **QR** button and is not shown by default. The link and short code are frosted until tapped (#972). Share… appears only where the browser supports it. The short code stops working 30 minutes after the card is closed, which matters for the 'No link?' route.
**Fix / replacement:** 4. You now have a link and a short code. The short code is blurred until you tap it, and **QR** shows a code your friend can scan. Tap **Copy link** and paste it into a message to your friend. On most phones **Share…** is next to it.

No link? Your friend can type the short code instead (it stops working 30 minutes after you close the sharing card). On Home they tap the person icon at the top, then **Join a friend's project…**, type the code and tap **Join**.
**Evidence:** collab-ui.js:2102-2115 (Copy link; Share… only `if (navigator.share)`; 'QR' toggle button); 2117-2124 + 2131 short code, veil until tapped, 'stops working … minutes after you close this'; CODE_TTL 30*60000 (collab-core.js:126)

## [FIX] T17 step 7: "open the round button again and tap Stop sharing"
**Problem:** Once a session is live, the person-plus button is hidden and replaced by the people chip, which shows your friend's initials in a coloured circle. It opens the same panel, but it no longer looks like the button step 1 described.
**Fix / replacement:** 7. You are both editing the same project. When you are done, tap the round button again (it now shows your friend's initials) and tap **Stop sharing**.
**Evidence:** styles.css:11073 `#stage:has(> #collab-people) > #btn-share.cs-stagebtn { display: none; }`; collab-presence.js:1150-1190 drawChip/fillChip (initials, click → openPeople)

## [FIX] T18 'If it doesn't work': go Home "which saves it" after tapping a template card by mistake (LOSE-WORK RISK)
**Problem:** Tapping the card opens the template itself, and going Home writes every change back INTO the template. A beginner who has already swapped media or typed words, thinking it was a new project, overwrites their template with no prompt. On a computer, the back button goes straight Home, so the 'first tap only deselects' remark applies only to phones.
**Fix / replacement:** If it doesn't work: If you tapped the card itself, a message says **Editing "name"**. That is the template, not a new project, and anything you change is saved into the template when you go Home. If you changed something, tap undo until it's back how it was. Then go Home with the back arrow at the top left (on a phone the first tap only deselects a clip), and use the three dots and **New project from template**.
**Evidence:** home.js:2030-2037 edit() → templates.openForEdit, toast 'your changes save back to it when you go Home'; home.js:3385-3391 Home open → FM.templates.commitDraft(); app.js:6909-6912 PC #btn-back → home.open() (no deselect step)

## [FIX] T19 step 4: "Tap the card called Custom elements"
**Problem:** Custom elements is the 9th and last tile on the Elements tab, and the Add menu is paged, so on a phone it is usually on a later page. Tutorials 12-16 tell the user to swipe; this one doesn't.
**Fix / replacement:** 4. Tap the card called **Custom elements** (four small squares). If you can't see it, swipe the tiles sideways. A browser opens with a search box. Tap your element. A message says **Inserted** and its name.
**Evidence:** addmenu.js:174-330 (INSTANT 4 tiles + Camera, Controller, Adjustment, New group, then Custom elements pushed last); addmenu.js:1325 pageCount = ceil(opts.length / perPage)

## [FIX] T19 steps 5-6: "Your element arrives as new layers" / change the saved element
**Problem:** The element is inserted on top of all layers, STARTING AT THE PLAYHEAD, so with the playhead partway in it won't show at the start. Editing the saved element later doesn't change copies already added to projects, because insert makes fresh copies.
**Fix / replacement:** 5. Your element arrives as new layers on top, starting where the playhead is (slide the timeline to the right spot before step 3). Move, resize or restyle them like any layer.
6. To change the saved element itself, go Home and open the **Elements** tab. Tap its card. A message says **Editing** and its name. Your changes save back when you go Home. Projects you already added it to keep their own copy.
**Evidence:** storage.js:3620-3625 elements.insert: reIdLayers copy, `l.start += FM.time - t0`, `FM.scene.layers = re.layers.concat(...)` (prepended = top)

## [FIX] T20 step 4: "Under the graph is a row of small curve pictures. From the left they are Linear…"
**Problem:** Under the graph are TWO rows: first the kinds row (Bezier / Bounce / Steps, each with its own little curve picture and label), then the six preset pictures. A beginner reading "from the left" on the first row they see is looking at the kinds.
**Fix / replacement:** 4. A new move is **Linear**: the same speed all the way. Under the graph are two rows. The top row is the kind of curve (**Bezier**, **Bounce**, **Steps**). The row below it has six small curve pictures. From the left they are Linear, Ease In, Ease Out, Ease In-Out, Overshoot and Anticipate. Tap one.
**Evidence:** graph-editor.js:582 `wrap.append(main, famWrap, presetWrap)`; graph-editor.js:471-479 famWrap buttons each draw a glyph + label

## [FIX] T20 step 8: "(The back arrow at the top left would close the clip's whole options panel instead.)" with "On a computer: the same"
**Problem:** On a phone the top-left back arrow deselects the clip. On a computer it leaves the project and goes Home.
**Fix / replacement:** 8. To close the graph, tap **‹ Position / Scale** at the top of the panel. (Not the back arrow at the top left: on a phone that deselects the clip, and on a computer it goes Home.)
**Evidence:** mobile.js:347 m-editing → selectLayer(null); app.js:6909-6912 PC #btn-back → exitGroup or FM.home.open(); inspector.js:7146-7147 '‹  Position / Scale'

## Reviewer summary
I checked tutorials 11-20 on refs/remotes/h/tutorials-drafts (38934196) against the app code at b46b47d3, about 3 claims per file. The code was extracted read-only to the scratchpad. Tutorial 11 is clean.

**Could make a user lose work:**
- **12 (Tip):** Detect speech throws away the caption list and its timings and builds a new one. Typed words survive only on the one new caption they overlap most; the rest are dropped (captions.js:276-317). The tip comes after the typing steps, so it needs to say "use it before you type, undo if words go".
- **18 ('If it doesn't work'):** tapping a template card edits the template itself, and going Home saves every change into it (home.js:3385 commitDraft). The draft tells the user to go Home "which saves it" without warning that this overwrites the template.
- **16 ('If it doesn't work'), minor:** delete-and-re-add throws away any grading tweaks, and the up-down switch sends the add row to whichever end is furthest away. One tap can send it to the bottom (app.js:2926-2927).

**Wrong outright:**
- **17 step 6:** the button says **Let in**, not Allow. "Allow / Not now" only appears when a member asks to edit. The draft's own verification table cites the wrong branch.
- **12 step 8:** Caption background is already ticked on a new caption track (app.js:3485), so following the step turns the box off.
- **13 Tip and 14 step 5:** the bar's stroke count and "ready to finish" message are hidden on phones narrower than 420px (styles.css:6079-6080), so a ~380px phone never shows them.

**Smaller fixes (exact replacement text is in each item):**
- **12:** the strip label reads "Cue 1 / 2", not "1/2".
- **13:** the eraser removes whole strokes, not part of one. The bar sits at the bottom of the screen, or under the picture on a computer.
- **14:** new points are sharp corners, so there are no handles until you tap Curve.
- **15:** tapping Move while it is already lit switches to the anchor point and hides the diamond that step 5 needs.
- **17:**
  - A first-time friend sees extra cards before the Join sheet: turn on Work with friends, pick a name, and on an iPhone in Safari an "open in the app" card.
  - QR is a button, and the short code is blurred until tapped and lasts 30 minutes after the card is closed.
  - Once a friend joins, the round button shows their initials.
- **19:** Custom elements is usually on a later tile page, and an element lands at the playhead.
- **20:** there are two rows under the graph (kinds first, then presets). On a computer the top-left back arrow goes Home.

Not checked: tutorial 18's "Insert your Media" sheet also offers "Your colour" for shapes, which the draft leaves out (an omission, not an error). On the PC captions dock the caption list also shows under the field, which the draft doesn't mention.