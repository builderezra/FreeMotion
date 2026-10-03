# B36 Everyday Foley — local build report

Starting commit: `05116900d55acfc74f4a96e6228974b7853c9b9a` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/sfx.js` (six synthesized Foley recipes), `index.html` (SFX script cache tag), and `tests/tests.js` (one focused `{ item: 'TBD' }` render regression).

The Sound effects menu now has Door knock, Footsteps, Tick-tock, Phone vibrate, Typing and Ka-ching under Foley. Events vary timing and timbre within each sound; they are synthesized locally, so no third-party recordings or licences are involved. Hear and Add use the same existing rendered-buffer path.

Read: B36 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1249`, #690 at `REQUESTS.md:27376-27403`, and the existing SFX catalogue/render path. Exact request/audit searches found no recorded implementation of these six Foley sounds on the starting snapshot; the existing Ticking build is a different build-up cue.

Ran: JavaScriptCore parsed the changed SFX and test scripts. One focused production-recipe probe scheduled all six sounds and verified every started voice was stopped; `git diff --check` passed. The saved regression renders each sound and checks duration and level, but browser playback and actual listening remain unverified.
