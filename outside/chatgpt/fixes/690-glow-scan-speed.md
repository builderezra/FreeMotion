# Glow Scan speed keyframes keep their position

Starting commit: `84799d5000551df9e3643224aa93d6cd81a43cee` (`chatgpt/690-continuation`). Local change only; nothing pushed.

Read: Glow Scan derived its position from current Speed multiplied by elapsed time. Keyframing Speed to zero snapped the scan to its starting edge instead of pausing it. Earlier Glow Scan fixes covered Strength, Direction and preview width, while #913 established the rate-versus-phase correction for weather effects.

Changed: `js/compositor.js` integrates an animated Speed to position the scan; constant-speed instances retain their previous calculation. `tests/tests.js` adds one `{ item: 'TBD' }` regression measuring the production kernel before and after a 1→0 Speed keyframe, with constant-speed controls. `index.html` bumps the compositor cache tag.

Ran: The focused browser regression passed (1/1). JavaScript syntax and `git diff --check` passed. Real iPhone appearance remains unverified.
