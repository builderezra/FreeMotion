# B35 Ambience pack — local build report

Starting commit: `eda6773bc4b16f2fc858e807587ca58dc7bb0279` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/sfx.js` (four generated ambience beds), `index.html` (SFX script cache tag), and `tests/tests.js` (one focused `{ item: 'TBD' }` render regression).

The Sound effects menu now has an Ambience category with eight-second Ocean surf, Crickets at night, Morning birds and Room tone. Each is synthesized locally from seeded noise and oscillators, with no downloaded samples or licensing dependency. Lower target peaks leave space for music and speech. Hear and Add use the existing shared rendered-buffer path.

Read: B35 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1248`, #690 at `REQUESTS.md:27376-27403`, existing Nature sounds and SFX rendering/normalization. Exact request/audit searches found no recorded implementation of these four ambience sounds on the starting snapshot.

Ran: JavaScriptCore parsed the changed SFX and test scripts. One focused production-recipe probe scheduled all four sounds and verified every started voice was stopped; `git diff --check` passed. The saved regression renders each sound and checks duration and level, but browser playback and actual listening remain unverified.
