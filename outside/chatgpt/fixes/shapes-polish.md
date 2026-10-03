# Shape quality pass — 4 October 2026

Starting commit: `f771657683ae61e4aff657e4beab8fac248e8dfe` (main snapshot).  Local branch: `chatgpt/shapes-polish`.  No push or PR.

The shape geometry in `js/compositor.js` now gives Heart a curved taper into its tip; Water drop a symmetric bowl and shoulders; Spiral a rounded inner curl; Puzzle a clean tab and socket; Flame a clearer leading tip and back lick; Umbrella a continuous scalloped canopy and handle; and Bomb a genuinely circular body with separate fuse and spark. It also cleans up the small contour defects in the pointing and thumbs-up hands, redraws Envelope with a continuous body and one fold cut, rounds the Map pin head and hole in the portrait box, simplifies the Lock keyhole, rebuilds Crown and Music note, and removes Clock's extra centre disc.

The Add → Shape pictures in `js/addmenu.js` now read Heart from the live shape outline and show Ring as a filled band with a transparent hole. The reported centre dot was in the adjacent **Polygon** picture, not Hexagon; it has been removed. Spiral pictures use rounded line ends. Tick/Check was intentionally left untouched. Both changed scripts have new cache tags in `index.html`.

One focused regression in `tests/tests.js` (`{ item: 'TBD' }`) renders the actual Add → Shape menu, compares the Heart and Ring pictures with their compositor silhouettes, and checks the Hexagon/Polygon centre. It caught a 0.9-unit displacement of the Ring picture's inner hole during development; that was corrected before the final run.

Checks run: new regression 1/1 on a 380×820 browser viewport; existing #962 shape preview/aspect controls 2/2 on a 1280×900 viewport; browser visual inspection of both shape groups and 34px menu pictures; `git diff --check` passed. These are browser checks, not an installed-iPhone test. Existing layers that use these procedural shape kinds will display the new contours; paths already converted to editable points keep their stored geometry.

Related request history: `REQUESTS.md` #929 concerns the Heart picture and shape; #158 records an earlier Spiral outer-end fix. This pass addresses the newly reported Heart contour and Spiral **inner** end. It does not claim to close those records.
