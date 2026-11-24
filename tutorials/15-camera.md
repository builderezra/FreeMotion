# Add a camera and pan across your scene

You'll be able to move the whole scene as if a camera were filming it.

1. If you see a single timeline row with an edit panel under it, tap the back arrow at the top left **once** to deselect. (With nothing selected it goes Home.) Then tap the row that says "Tap to add a layer".
2. Tap the **Elements** tab, then **Camera**. If you can't see it, swipe the tiles sideways. This is a virtual camera inside your project, not your phone's camera.
3. A **Camera** layer appears and nothing changes yet. A project can only have one. Adding a second says "Scene already has a camera".
4. With the camera selected, open **Position / Scale**. The first of the four icons on the right edge (Move) should be lit. If it isn't, tap it once. (Tapping it while it's lit switches to the anchor point and hides the diamond. Tap it again to come back.)
5. Slide the timeline to the start. Tap the diamond on the left edge. That is your first keyframe.
6. Slide later, tap the diamond again, then tap the **X** number and type a clearly different number. Press Return.
7. Slide back to the start and quick-tap the time counter. The whole scene pans.
8. Open **Camera Options** for more. Its tabs are small icons. On the blur tab, tick **Motion blur** to smear the scene while the camera moves. The **?** beside the tab's name shows this page.

**Camera View**: Field of view is the lens. Wide (90° and up) pushes layers at different depths apart and gives a pan real parallax. Narrow (20°) flattens the scene almost to 2D. Distance moves the camera in and out; it is the same number as the camera's own Z, so a keyframe on either animates the move. <!-- was the paragraph under the tab's controls, js/inspector.js camPanel, until #1255 -->

**Focus Blur**: tick **Focus blur** to soften layers by their depth. Focus distance is the Z that stays sharp. Depth of field is how far either side of it also stays sharp; past that the blur grows. <!-- was two paragraphs in the panel, on and off -->

**Fog**: tick **Fog** to wash far layers towards a colour, for haze, dusk or underwater. A layer at the Near distance is untouched, at the Far distance it is the fog colour, and in between it fades across. <!-- was two paragraphs in the panel, on and off -->

**Motion Blur**: Shutter is how long the shutter stays open (0.5 is what film uses). Samples is how many slices are averaged: more is smoother and slower. It costs nothing while the camera is still. It only smears the camera's own moves: a layer's own movement is Motion Blur (Object), and movement made by an effect is Motion Blur (Footage). <!-- was the paragraph on the blur tab -->

On a computer: the same. Click an empty spot in the timeline first so the Add panel shows at the bottom left. <!-- not walked: the walk was the 380 px phone layout only -->

Tip: Field of view and Distance only matter when layers sit at different depths. Give a layer a Z value in Position / Scale first.

If it doesn't work: If nothing moves, check the camera is the selected layer when you set the keyframes, not one of your clips.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1 add row | js/timeline.js:2795 | yes |
| 2 Camera tile in Elements | js/addmenu.js:249 | yes |
| 2 a 2D camera the whole scene is viewed through | js/app.js:3453 | yes |
| 3 neutral by default | js/app.js:3454 | yes |
| 3 only one | js/app.js:3457 | yes |
| 4 camera cards: Position / Scale and Camera Options | js/inspector.js:3797 | yes |
| 4 Camera Options label | js/inspector.js:2704 | yes |
| 5 diamond adds a keyframe | js/inspector.js:4926 | yes |
| 6 X number box | js/inspector.js:5009 | yes |
| 6 typing at a later time adds a keyframe | js/scene.js:334 | yes |
| 8 camera tabs are icons with titles | js/inspector.js:5807 | yes |
| 8 Motion blur tick | js/inspector.js:5816 | yes |
| 8 smears when the CAMERA moves | js/inspector.js:5823 | yes |
| Tip: FOV and Distance need depth | js/inspector.js:5837 | yes |
| Tip: Field of view / Distance rows | js/inspector.js:5842 | yes |
| 4 Move pressed while lit switches to anchor and hides the diamond | js/inspector.js:5370-5378, :4970-4977 | yes |
| 8 the ? beside the tab's name shows this lesson in the panel | js/inspector.js camHelp, camPanel | added 24 Nov for #1255 |
| Camera View / Focus Blur / Fog / Motion Blur paragraphs: what the panel's own six paragraphs said until #1255 | js/inspector.js camPanel (CAM_TABS' labels; the Focus blur, Fog and Motion blur ticks; Shutter, Samples) | moved here 24 Nov |
