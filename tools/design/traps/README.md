# Beginner traps: design options (D1)

Seven places where a first-time user gets stuck or surprised. Each page is a static HTML file with four phone frames at 380 px (**today** plus three options), built from the app's real tokens in `styles.css :root` (`--bg #0e1320`, `--panel #161c28`, `--accent #29d9bb`, `--am-green #1ed760`, `--kf #ffce4a`, radii 10 and 7). Open the files in any browser. **Mockups only: no app code was changed.**

**Read this first.** The task names two INBOX blocks (02:25 and 05:05) as the source, but those blocks are **not in the repo I was given** (`INBOX.md` on `origin/main` and `helper/backlog` ends at the 22:50 block). I worked from the one-line trap names in the backlog item and verified each against the code. If Ezra's own words differ from my reading of a trap, the page for that trap is the one to redo. Please paste the two blocks and I will check each page against them.

**Verified** = I read the line. **Guess** = needs a device. No mockup was compared with a rendered screenshot of the real app; they are drawn to the app's tokens, not captured from it.

| # | Trap | Page | Today (code) | Recommended | Why | Code it would touch |
|---|---|---|---|---|---|---|
| 1 | Export hidden after the first import on a phone | [export-hidden.html](export-hidden.html) | `styles.css:4214` hides `#m-export` while editing a clip; `:4234` for selection mode | **A** keep the green Export in the clip header, fold Parent into ⋯ | One tap from anywhere, in the slot Export always had | `styles.css:4214`, `index.html` bar (`#m-dup`, `#m-more`), `js/mobile.js:365` |
| 2 | Add row hidden while a clip is selected | [add-row-hidden.html](add-row-hidden.html) | solo view `js/timeline.js:2838`; no `+` while editing, `styles.css:4206` | **A** a slim "+ Add layer" strip under the solo row | Same dashed row he knows, where the eye already is | `buildTracks` solo branch in `js/timeline.js`, `js/mobile.js:398` (`openAdd`) |
| 3 | No grab feedback on iPhone | [grab-feedback.html](grab-feedback.html) | hold timer `js/timeline.js:2207`; vibrate used in `js/app.js:1640` (iOS Safari has no vibrate: **guess**) | **A** lift the clip (up 4 px, 4% bigger, shadow, accent outline) | Pure CSS, works on iPhone, reads at a glance | the hold callback `js/timeline.js:2207-2230` (add a class) and `styles.css` |
| 4 | S stretches when the playhead is off the clip | [s-key-stretches.html](s-key-stretches.html) | `syncKeyRail` `js/timeline.js:5761-5809`, `clipKeyAction` `:201`, KeyS `js/app.js:9013` | **A** amber key and a full verb, "Stretch to here" | The colour says "different action" before the word is read | `syncKeyRail` strings and a CSS state (`data-state` already exists) |
| 5 | "Does nothing here" badge swallows the tap | [does-nothing-badge.html](does-nothing-badge.html) | `deadHereHint` `js/fx-browser.js:1064` stops the click; `.fxb-needs` `styles.css:9669` | **A** the badge becomes decoration; the whole tile always adds | A tile that sometimes does not add reads as broken | `js/fx-browser.js:1060-1068`, `styles.css:9669-9679` |
| 6 | Shadow only turns a full-frame clip black | [shadow-only-black.html](shadow-only-black.html) | param `js/compositor.js:650`, kernel `:7457` (**reasoned, not rendered here**) | **A** disable the switch with the reason beside it | Uses the app's existing "dead control, says why" pattern; no behaviour change | the param's `overriddenBy` / `FM.fxDeadOnLayer` path in `js/compositor.js` and `js/inspector.js` |
| 7 | Songs land at the playhead | [song-at-playhead.html](song-at-playhead.html) | `js/app.js:3055` (first clip at 0, later ones at the playhead) | **A** songs start at 0:00, toast offers "At playhead" | It matches how people use music | `js/app.js:3055` (branch on `rec.kind === 'audio'`) |

## Notes per trap

1. **Export.** Option A needs the bar's width worked out at 320 px (the entry on `styles.css:4200-4230` says the bar is already tight); fold Parent into the ⋯ menu to pay for it.
2. **Add row.** The solo view exists on purpose (a layer selected shows only its row). A is a strip, not the full row, so the solo view stays calm.
3. **Grab.** If a haptic is wanted on Android, keep the existing `navigator.vibrate` call as well; A does not replace it.
4. **S key.** Same fix applies to the A and D keys' captions. The keyboard path (`js/app.js:9013`) cannot show amber; its toast should say "Stretched" with Undo (option B) as a second layer.
5. **Badge.** This trades a warning that blocks for one that informs. The reason text stays (`deadHereWhy`), just never in the way of the tap.
6. **Shadow only.** Full-frame detection should use the layer's alpha box (the compositor already scans it, `fxBoundsScan` `js/compositor.js:4199`), not the layer type.
7. **Songs.** Only audio changes; photos and videos keep going to the playhead. Check #655/#678-style tests that assert placement.

## What I did not do

No app code, no tests, no screenshots of the real app (only mockups). Each recommendation needs Ezra's pick, per his rule (#545): nothing visual ships before he has seen it.
