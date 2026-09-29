# Handoff from the V3 fixes (29 Sep)

All eight V3 defects are fixed in `v3.js`, and nothing else was changed. Two things are left for whoever owns the other files:

1. **Item trays still differ between pages.** V3 now gives each kind of item the DESIGN §8.5 tray:
   - Text: Edit words · Style · Animate · Effects · Duplicate · Stay put · 🗑
   - Overlay: Into row · Blend · (Volume) · Look · (Speed) · Effects · Remove a colour · Crop · Forward · Back · Stay put · 🗑
   - Captions: Edit lines · Style · Find speech · Follows the clips / Stays with the sound · 🗑
   - Sound: Volume · Fade · Ends with the video · Speed · Voice · Stay put · 🗑
   - Effect: Change effect · Strength · Stay put · 🗑

   V1 and V4 still show `VIS.ITEM_TRAY` (Edit · Stay put · Look · Copy · Delete) for every item. That means tapping a title shows a different row on those pages. The fix belongs in `kit.js` (per-kind item trays), and then in V1 and V4. The clip tray already matches: V3 uses `VIS.CLIP_TRAY` whenever it is the §8.5 order, which it now is.

2. **The kit's toast sits over the timeline.** `VIS.toast` defaults to `bottom: 118px`. On a phone that is over the clip row, and a toast with a button catches taps meant for a clip for up to 4 s. It happened during the V3 check. V3 now passes `bottom` so its toast sits over the lower edge of the picture. V1 and V2 still use the default. The kit's default could move up to the stage too.
