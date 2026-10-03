# VHS Tape tracking band pauses instead of jumping

Starting commit: `70797f4c96b2ccbf9c5e045f7f80e8651224c6e5` (`chatgpt/690-continuation`). Local change only; nothing pushed.

Read: `js/compositor.js` positioned VHS Tape's tracking band with current Band speed multiplied by elapsed time. Keyframing the speed changed its accumulated position instantly; reaching zero hid the band. This is the rate-versus-phase problem already fixed for Snow & Rain under #913, but VHS Tape was a separate path.

Changed: For an animated Band speed, `js/compositor.js` integrates the speed over time, so a zero keyframe holds the band where it stopped. Constant speed, including a static zero setting, retains its old behavior. `tests/tests.js` adds one `{ item: 'TBD' }` regression that measures the actual kernel before, at and after a 0.4→0 keyframe, with constant-speed controls. `index.html` bumps the compositor cache tag.

Ran: The focused browser regression passed (1/1). JavaScript syntax and `git diff --check` passed. The exact appearance on a real iPhone remains unverified.
