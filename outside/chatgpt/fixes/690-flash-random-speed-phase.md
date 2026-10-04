# Flash Random keeps its pattern sequence through keyed Speed changes

Starting commit: `ecba735dd15b744c034af715d8ae669b83f0a614` on the clean reviewed checkpoint. Isolated branch: `codex/690-flash-random-speed-phase` in `/private/tmp/freemotion-flash-random-phase-20261004`.

`REQUESTS.md:27375-27399` keeps #690's effect bug hunt and polish open. Flash (darken) has a Speed control (`REQUESTS.md:10536-10540`) and later gained rhythm choices (`REQUESTS.md:13323-13324`). `audits/912-audit.json:843-851` and #913 finding 4 record the analogous keyframed-rate rewind. The existing Flash test in `tests/tests.js:115967-115991` covers keyed Speed for Steady, Double hit, and Build-up, but not Random. The open #904 Darkest choice in `REQUESTS.md:32205-32207` is separate and remains untouched.

Random used `current Speed × project time` to choose its hashed flash and interpolation fraction. A Speed keyframe could therefore skip or revisit flashes already elapsed. Random now integrates keyed Speed to a flash clock. A numeric Speed still uses the original project-time multiplication. Steady, Double hit, Build-up, Depth, Softness and Darkest calculations are unchanged.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 271 → 272), `tests/tests.js` (one `{ item: 'TBD' }` regression), and this report. The regression compares phase-equivalent hard and smooth renders after Speed steps from 8 to 16 at 1 s. At 1.5 s the keyed effect has passed 16 flashes, matching numeric Speed 8 at 2 s; a second sample checks the fractional interpolation. It failed on the starting code with “193 instead of 16” and passed after the fix. JavaScriptCore loaded and executed the changed scripts; `git diff --check` passed. Browser and installed-device rendering remain unverified. No push, PR, deployment, protected-file edit, or shared Claude checkout edit.

Integrated on the reviewed local branch as `702a8952`. Its focused regression passed there in JavaScriptCore; changed-script syntax and diff checks passed. This is a local checkpoint, not a release.
