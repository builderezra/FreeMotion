# Add a glow and a shadow

You'll be able to make a clip glow and cast a shadow.

Before you start: shrink your clip so there is empty space around it. With the clip selected, pinch it smaller on the preview (on a computer, drag a corner of its box), or use the **Position / Scale** card. On a clip that fills the screen, the Drop Shadow tile says "does nothing here", the shadow can't be seen, and **Glow past the edges** changes nothing. <!-- js/canvas-edit.js:2, 264 pinch and corner-handle scale; js/inspector.js:2677 "Position / Scale"; js/fx-browser.js:929, 1055 -->

1. Tap the clip and open the **Effects** card. If another card is open, tap the ‹ at the top first. <!-- js/inspector.js:2702; js/inspector.js:7147 'cat-back' "‹  ..." -->
2. Tap **+ Add Effect**. <!-- js/inspector.js:2284 -->
3. Tap the magnifier, type **Light Glow**, and tap its picture. <!-- index.html:781-783; js/compositor.js:410; js/fx-browser.js:547 -->
4. Clear the search box (it still says Light Glow), type **Drop Shadow**, and tap its picture too. If it says "does nothing here", tap the picture, not the badge. <!-- index.html:783; js/compositor.js:637; js/fx-browser.js:1055 -->
5. Tap **Add 2 effects**. <!-- js/fx-browser.js:374 -->
6. Tap **Light Glow** in the list. It opens and the Drop Shadow row closes (one row is open at a time). <!-- js/inspector.js:1752-1754 -->
7. Swipe the panel up until you can see **Threshold softness** (the panel is short and scrolls). Drag its ruler left to raise it, or tap the number and type 60. The glow edges blend in. <!-- js/compositor.js:420; js/inspector.js:979 "drag LEFT to raise the value"; js/inspector.js:223 typeInBox -->
8. Keep scrolling to **Glow past the edges** and tap **On**. Bright parts at the clip's edge now glow out into the empty space around it. Drag **Radius** left for a bigger halo. <!-- js/compositor.js:422, 411, 415-418 Radius 1-80 px -->
9. Tap the **Drop Shadow** row to open it (Light Glow closes). Scroll to the bottom. The shadow starts black, so on a black background you can't see it. Tap the colour next to **Shadow**; your phone's own colour picker opens; pick a light colour. Drag **Softness** left for a bigger, blurrier shadow, and **Spread** left toward 100% for a solid, hard edge. <!-- js/compositor.js:643-650 defColor '#000000' colorLabel 'Shadow', Softness, Spread; js/fx-registry.js:282 colour row added after the sliders; js/inspector.js:979 -->
10. Tap **On** next to **Shadow only** to hide the clip and keep just its shadow. <!-- js/compositor.js:650 -->

On a computer: same steps. <!-- js/inspector.js:2284 --> <!-- not walked: the walk was the 380 px phone layout only -->

Tip: Light Glow only lights areas brighter than its **Threshold**. Drag it right to lower it and glow more. <!-- js/compositor.js:413; js/fx-registry.js:383 -->

If it doesn't work: If you can't see the shadow, check two things. The clip must not fill the screen, and the **Shadow** colour must be different from the background (both start black). <!-- js/fx-browser.js:929; js/compositor.js:650 defColor '#000000' -->
