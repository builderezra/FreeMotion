# Handoff from the V5 fix (29 Sep)

All six V5 defects are fixed in `v5.js` / `v5.css`. Two of them have a root in the kit. V5 now works around them
locally, but other pages still show them. Nothing here blocks V5.

1. **`kit.css` `.fm-seam` (gap / overlap chips) still touches the length pills.** Measured in the V5 phones at
   380 and 1280: a tile's length pill spans 7 to 20.9 px from the lane top, and its name spans 39.9 to 53 px. The
   chip is `top: 18px; height: 21px` (18 to 39 px), so it covers the bottom ~3 px of the pill on either side. That
   is the "5.8s reads .8s" / "3.9s under −0.2s" look. V5 overrides it as
   `.v5 .fm-cliprow .fm-seam { top: 22px; height: 17px; border-radius: 9px; line-height: 1; }` (22 to 39 px, clear of
   both). The kit's `::before` still gives a ~41 px tap area. Moving that rule into `kit.css` fixes every page, and
   then the V5 override can go.
2. **Narrow clip tiles show "C…", "L…", "P…"** at a page's `'fit'` zoom (Studio tips' 3-second cutaways are about
   22 px wide on a phone). V5 now lets a clip's name run on over the empty space after it (a gap block, or the end of
   the row) with `spillNames()` in `v5.js` plus the `.v5-spill` rules in `v5.css`. If room is under three letters,
   the name is hidden, the same rule the kit uses for captions, and the name is still in the tile's tooltip. If other
   pages want this, it belongs in `VIS.drawQuick` next to the section chips' spill.
