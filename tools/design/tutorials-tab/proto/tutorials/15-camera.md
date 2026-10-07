# Add a camera and pan across your scene

You'll be able to move the whole scene as if a camera were filming it.

1. If you see a single timeline row with an edit panel under it, tap the back arrow at the top left **once** to deselect. (With nothing selected it goes Home.) Then tap the row that says "Tap to add a layer".
2. Tap the **Elements** tab, then **Camera**. If you can't see it, swipe the tiles sideways. This is a virtual camera inside your project, not your phone's camera.
3. A **Camera** layer appears and nothing changes yet. A project can only have one. Adding a second says "Scene already has a camera".
4. With the camera selected, open **Position / Scale**. The first of the four icons on the right edge (Move) should be lit. If it isn't, tap it once. (Tapping it while it's lit switches to the anchor point and hides the diamond. Tap it again to come back.)
5. Slide the timeline to the start. Tap the diamond on the left edge. That is your first keyframe.
6. Slide later, tap the diamond again, then tap the **X** number and type a clearly different number. Press Return.
7. Slide back to the start and quick-tap the time counter. The whole scene pans.
8. Open **Camera Options** for more. Its tabs are small icons. On the blur tab, tick **Motion blur** to smear the scene while the camera moves.

On a computer: the same. Click an empty spot in the timeline first so the Add panel shows at the bottom left.

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
