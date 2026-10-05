# Add a glow and a shadow

You'll be able to make bright parts of a clip glow, and add a soft shadow behind it.

Before you start: make your clip smaller, for example from the **Position / Scale** card. On a clip that fills the screen, Drop Shadow shows "does nothing here" the shadow can't be seen, and **Glow past the edges** changes nothing. <!-- js/inspector.js:2677 "Position / Scale"; js/fx-browser.js:929 "This layer fills the whole frame..."; js/fx-browser.js:1055 'does nothing here' -->

1. Tap the clip and open the **Effects** card. <!-- js/inspector.js:2702 card 'Effects' -->
2. Tap **+ Add Effect**. <!-- js/inspector.js:2284 -->
3. Tap the magnifier, type **Light Glow**, and tap its picture. A number appears on it. <!-- index.html:781-783 "Search effects"; js/compositor.js:410 'Light Glow'; js/fx-browser.js:547 togglePick -->
4. Clear the search box (it still says Light Glow), type **Drop Shadow**, and tap its picture too. If it says "does nothing here", tap the picture, not the badge. <!-- index.html:783 search input; js/compositor.js:637 'Drop Shadow'; js/fx-browser.js:1055 -->
5. Tap **Add 2 effects**. <!-- js/fx-browser.js:374 -->
6. Tap **Light Glow** in the list to open its controls. <!-- js/inspector.js:1752-1754 -->
7. Find **Threshold softness**. Drag its ruler left to raise it, or tap the number and type 60. The glow edges blend in instead of cutting off hard. <!-- js/compositor.js:420 "Threshold softness" 0-100% -->
8. Next to **Glow past the edges**, tap **On**. The halo shows only where there is empty space around the clip. <!-- js/compositor.js:422, 415-418 -->
9. Open **Drop Shadow**. **Softness** already starts at 6 px. Drag **Spread** left to raise it for a thicker, harder-edged shadow. Raise **Softness** too for a thicker shadow. **Spread** is greyed out only while Softness is 0. <!-- js/compositor.js:643-645 softness def 6, spread overriddenBy softness liveAbove 0; js/inspector.js:1246 -->
10. Tap **On** next to **Shadow only** to hide the clip and keep just its shadow. On a full-screen clip this turns the picture black. <!-- js/compositor.js:650 "Shadow only"; js/compositor.js:7477-7480; js/fx-browser.js:929 -->

On a computer: same steps. <!-- js/inspector.js:2284 -->

Tip: Light Glow only lights areas brighter than its **Threshold**. Lower it to glow more. <!-- js/compositor.js:413; js/fx-registry.js:383 -->

If it doesn't work: If you can't see the shadow, the clip still fills the screen. Make it smaller first. <!-- js/fx-browser.js:929 -->
