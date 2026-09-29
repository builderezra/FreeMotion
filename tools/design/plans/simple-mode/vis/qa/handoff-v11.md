# Handoff from the V11 fix (29 Sep)

All five V11 defects are fixed inside `v11.js` and `v11.css`. One line elsewhere still says the old word.

## Change in another file

1. **`kit.js` line ~1516, the `PLAN.v11` blurb** still reads *"What you can hold after each step, drawn as the
   screen you would see. Step 1 first."* The hub's blurb wins over the page's own, so the list and the page header
   still say "step". V11 now says "Phase" everywhere, like V1, V6, V10 and DESIGN. Suggested:
   `blurb: 'What you can hold after each phase, drawn as the screen you would see. Phase 1 first.'`
