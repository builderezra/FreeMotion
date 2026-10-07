# H49: check #1065 (phone "?" removed) at 380 and 1280

**Status: BLOCKED. `origin/main` is still v17.25 (2e3fd7a9); the change is not on it, so there is nothing to check yet.** I did not check any other branch (no branch carries #1065; the only mention in the repo is the backlog commit 35754c61). This file holds the baseline on v17.25 and the checks to run when main moves, so the re-run is a few minutes. The DONE line says BLOCKED; re-add H49 when v17.26 lands.

## Baseline on v17.25 (Measured, headless Chromium 1194, project open, screenshots in `1065-check/`)
| width | "?" button | where | screenshot |
|---|---|---|---|
| 380 | `#m-help` in the phone top bar, 42 px wide at x=201 (between the version label at x=138 and Notes at x=243); `#btn-help` is laid out but 0 px wide | index.html:366 | `bar-380-before.png` |
| 1280 | `#btn-help`, 34 px wide at x=1022 (the PC transport row's far group, moved there by app.js:7737) | index.html:286 | `bar-1280-before.png` |

Phone bar order today (left to right, Measured): back (2), project name (48), version (138), `#m-help` (201), `#m-notes` (243), `#m-settings` (285), `#m-export` (334). Removing `#m-help` leaves a 42 px hole unless the bar re-flows, so this is what to look at: **a gap between the version label and Notes, or the name/version stretching unevenly.**

## What to run when main is v17.26
1. `git fetch origin main`; serve it (`tools/serve.sh`); open a project at 380 x 760 and 1280 x 800.
2. **Phone:** `#m-help` must be gone or hidden; every other top-bar button present; no gap and no overlap (compare the x list above; the six remaining buttons should sit flush right, the project name taking the freed space). Then Settings (cog) > "Keyboard shortcuts" > Show (settings.js:748, `FM.shortcuts.toggle()`): the shortcuts sheet must open, scroll, and close with its own close button and a tap outside.
3. **PC:** `#btn-help` still at about x=1022 and visible; click it: the same sheet opens; press `?`: it opens too.
4. Screenshots of both bars after, next to the two "before" ones.

## Things I read that the check should cover (Read, v17.25; guesses marked)
- **The sheet's fold-back target.** `helpButton()` (shortcuts.js:149-157) returns the visible `#m-help` on a phone, else `#btn-help`, else `null`; with `#m-help` gone on a phone both give no visible box, so it returns `null`. The size-toggle takes it as `button:` (shortcuts.js:144, `FM.panelSize.attach`); I did not read what `panelSize` does with a null button. **Guess:** it falls back to a plain close, which is what Home already gets (the comment at :147-148 says Home passes null on purpose). Check that closing the sheet on a phone after the change has no stray animation or stuck scrim.
- **The pop-out origin.** `popOpen()` (shortcuts.js:172-181) anchors to `#btn-help` only, never to `#m-help`, so on a phone the card already did not pop from the phone button; nothing changes there (Read).
- **Other readers of the phone button:** app.js:6965 wires click on `'#btn-help, #m-help'` with `querySelectorAll`, which tolerates a missing node (Read). One test does: tests.js:28211-28212 requires `ver-m`, `m-help`, `m-notes`, `m-settings` to be painted and throws "the phone bar is missing one of ..." (**Read**, I did not run it against a tree without the button); it will need `m-help` dropped from that list.
