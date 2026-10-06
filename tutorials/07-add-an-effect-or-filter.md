# Add an effect or a filter, and adjust it

You'll be able to find an effect, set how strong it is, change the order, remove it, and add a ready-made filter.

1. Tap your clip, then open the **Effects** card. If another card is open, tap the ‹ at the top of the panel first.
2. At the top you will see three small switches. **Visual** is the one for effects.
3. Tap **+ Add Effect**.
4. Tap the magnifier at the top right and type **blur**. Tap the picture for **Gaussian Blur**. A number appears on it, and your video behind shows a preview.
5. Tap **Add 1 effect**.
6. The **Gaussian Blur** row is already open, with its ruler showing. Drag the ruler left to raise the blur, or tap the number and type one. (Tapping the row's name closes it. Tap again to reopen.)
7. Add a second effect the same way. Now each row has a small grip of dots at its left. Press it for a moment, then drag the row up or down to change the order.
8. To switch an effect off without losing it, tap the eye at the right of its row. To remove it, open the row and tap the bin at the right, or swipe the row left.
9. For a ready-made look, tap **Filters** at the top. Tap one or more pictures, then **Add 1 filter**. You are taken back to **Visual** with the filter already open. **Strength** starts at 1. Drag its ruler right to fade the look toward 0.

On a computer: the same. Click the clip first. The panel is at the bottom left. Drag the grip to reorder, and click the bin to delete.

Tip: A filter is just a group of ordinary effects. Open it to retune any of them, or tap **+ Add effect to this filter**.

If it doesn't work: If a row says "does nothing here", that effect has nothing to work on in this clip. Pick another one.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1 Effects card | js/inspector.js:2702 | yes |
| 1 the back chevron on a card panel | js/inspector.js:7147 | yes |
| 2 Visual / Filters / Audio switches | js/inspector.js:3874 | yes |
| 3 + Add Effect | js/inspector.js:2284 | yes |
| 4 magnifier button, top right of the browser | index.html:781 | yes |
| 4 search box | index.html:783 | yes |
| 4 tapping a tile picks it (number badge) | js/fx-browser.js:547 | yes |
| 4 Gaussian Blur exists | js/compositor.js:51 | yes |
| 5 Add 1 effect | js/fx-browser.js:374 | yes |
| 6 tap the row to open it | js/inspector.js:1754 | yes |
| 6 the slider is named after the effect | js/fx-registry.js:267 | yes |
| 6 ruler: drag LEFT to raise | js/inspector.js:979 | yes |
| 7 grip of dots (only with 2+ effects) | js/inspector.js:1755 | yes |
| 7 press-hold 280 ms then drag reorders | js/inspector.js:1658 | yes |
| 8 eye button on a closed row | js/inspector.js:1797 | yes |
| 8 bin on an open row | js/inspector.js:1786 | yes |
| 8 swipe left deletes | js/inspector.js:1614 | yes |
| 9 Filters tile picks, Add 1 filter | js/inspector.js:2076 | yes |
| 9 Strength 0..1, default 1 | js/compositor.js:1646 | yes |
| Tip: + Add effect to this filter | js/inspector.js:1900 | yes |
| If: 'does nothing here' tag | js/inspector.js:1776 | yes |
| 6 row already open on add | js/fx-browser.js:256-257, js/inspector.js:1748, 1754 | yes |
| 9 filter already open, back on Visual | js/inspector.js:2124-2125, 2230 | yes |
