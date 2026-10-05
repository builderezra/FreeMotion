# Add a glow and a shadow

You'll be able to make bright parts of a clip glow, and add a soft shadow behind it.

1. Tap the clip, then open the **Effects** card in the panel. <!-- js/inspector.js:2702 card key 'effects' label 'Effects'; js/inspector.js:2246 section 'Effects' -->
2. Tap **+ Add Effect**. <!-- js/inspector.js:2284 "+ Add Effect" -->
3. Tap the search button, type **Light Glow**, and tap its tile. A number appears on it. <!-- index.html:781-783 "Search effects"; js/compositor.js:410 label 'Light Glow'; js/fx-browser.js:547 togglePick -->
4. Search **Drop Shadow** and tap that tile too. <!-- js/compositor.js:637 label 'Drop Shadow' -->
5. Tap **Add 2 effects**. <!-- js/fx-browser.js:374 'Add ' + n + ' effects' -->
6. Tap **Light Glow** in the list to open its controls. <!-- js/inspector.js:1752-1754 tap the row header opens the editor -->
7. Drag **Threshold softness** up. The glow fades in gently instead of switching on hard. <!-- js/compositor.js:420 "Threshold softness"; comment 415 -->
8. Next to **Glow past the edges**, tap **On**. The glow can now spill into empty space around the clip, like a halo round a title. <!-- js/compositor.js:422 "Glow past the edges", options Off/On; js/inspector.js:1324 segmented buttons -->
9. Open **Drop Shadow**. Raise **Softness** a little first, then raise **Spread** to make the shadow thicker and harder. <!-- js/compositor.js:643-645 Softness, Spread (overriddenBy softness) -->
10. Tap **On** next to **Shadow only** to hide the clip and keep just its shadow. <!-- js/compositor.js:650 "Shadow only" -->

On a computer: it's the same. Click **+ Add Effect** in the clip's panel. <!-- js/inspector.js:2284 -->

Tip: Light Glow only lights up areas that are brighter than its **Threshold**. Lower the threshold to glow more of the picture. <!-- js/compositor.js:413 "Threshold"; js/fx-registry.js:383 "areas brighter than the threshold" -->

If it doesn't work: If you can't see the shadow, your clip probably fills the whole screen, so the shadow falls off the edges. Make the clip smaller first, for example from the **Position / Scale** card. <!-- js/fx-browser.js:929 "This layer fills the whole frame... Shrink the layer first."; js/inspector.js:2677 "Position / Scale" -->
