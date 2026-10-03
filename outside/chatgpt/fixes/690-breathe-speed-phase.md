# Breathe Speed keyframes retain phase

Starting commit: `374f744c` on local `chatgpt/690-continuation`. Nothing pushed.

Read: Breathe's Speed is shown in Hz and can be keyframed, but its opacity cycle multiplied the current rate by all elapsed time. A 1→2 Hz ramp from 1–2 seconds therefore jumped to four cycles at 2 seconds; the actual accumulated rate is 2.5 cycles. `REQUESTS.md` #690 authorizes effect polish. #904 added Breathe's Phase control; #913's recorded rate fix named weather effects, not Breathe.

Changed: `js/compositor.js` integrates animated Breathe Speed to advance its cycle continuously, while constant-speed instances keep their previous calculation. `tests/tests.js` adds one focused `{ item: 'TBD' }` regression checking the production pixel kernel against the 2.5-cycle result and constant-speed controls. `index.html` advances the compositor cache tag.

Ran: The new browser regression and existing #904 phase-control regression passed (1/1 each). JavaScriptCore syntax and `git diff --check` passed. Appearance on an installed iPhone remains unverified.
