# Keyboard access to numeric inspector values

Starting commit: `ba6fb8354e2a48ec8edf26556a04c2eee5d77beb` on isolated `codex/690-batch2-keyboard-values`.

Verified source: `tools/design/chatgpt-tasks/reports/batch2/VERIFIED.md` §1b item 4 and `REQUESTS.md` #1016. No matching duplicate was found in `audits/*.json`.

Numeric Move & Transform and Volume readouts now take keyboard focus, announce their label and current value as spinbuttons, open exact typing with Enter or Space, and step with Up/Down (Shift steps ten times farther). Enter commits the typed value directly. Numeric effect, fade and keyframe fields receive accessible labels. The focused value has a visible outline.

Changed: `js/inspector.js`, `styles.css`, `index.html` (inspector cache 417→418; stylesheet cache 755→756), and one `{ item: 'TBD' }` regression in `tests/tests.js`.

Checks: the new Chromium regression failed before the fix because Volume was unreachable, then passed after for typed Volume, typed and arrow-stepped Position X, and named numeric effect/fade inputs. Node syntax and `git diff --check` passed. An older Volume scrub-ruler test failed identically on the unchanged starting commit and this branch; its `input[type=range]` assertion appears stale and is outside this keyboard fix. Incomplete browser bootstraps were discarded.

Local only; no shared Claude checkout edit, push, PR or deployment.
