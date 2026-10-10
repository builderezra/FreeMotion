# Plans for the next five after P29 (P30): #956, #777, #690, #694, #949, with #966

Against `origin/main` 1fa76385 (v17.34). **Measured** / **Read** / **Guess** as before.

**Which five.** These are the five oldest open entries left after P29, and all five are notes or answers waiting on a person, not builds. A plan for a note is its verdict and the one thing that would close it, so each is short. **#966 is added because the queue is now this empty: it is the entry that says what to do when nothing is left, and E1 and E2 were that work.**

| # | what it is | verdict | what closes it |
|---|---|---|---|
| #956 | "make note that I still need to go through [a page of questions] and answer everything; read it but don't make decisions" (26 Sep) | **Note, correctly not built.** The page was an artifact link made by another chat; the builder's job was to log it and decide nothing (Read: the entry says so). | His answers. The unblock list (#777) is the thing that carries the questions to him. |
| #777 | Keep the unblock list up to date (5 Sep) | **Waiting on one yes/no.** The artifact it publishes to is dead (CLAUDE.md says so); the standing ASK is "publish to a NEW link?", and the PM's rules-audit list repeats it as question (b). The source is `tools/unblock/unblock.html`. | His yes or no on a new private link. Until then the source can be kept current and nothing should be published. |
| #690 | Standing direction: "raise them and just keep going with whatever you can like bug fixing and stuff" (31 Aug, 1 Sep) | **This is what the helper batches are doing.** Read: DONE.md lists AU1 to AU22, PF1, PF2, PL1, INT1, FZ1, E1, E2 and 29 plan sets since 6 Oct. The entry says READY because a standing instruction never closes. | Nothing: tick with a note, as `ship.sh`'s oldest-first gate allows (`JUMPED:`). |
| #694 | "Make sure loop doesn't fail" (1 Sep) | **Done as gates, not as a note.** Read: `tools/tick.sh`, the oldest-first gate in `ship.sh`, `ship-bg.sh` (exits 3, never 0), the cron-twice check in CLAUDE.md, the load wait before the phone pass, `STALLED` detection in `tests/_cdp.py`. | Nothing. One measured gap: **see the runner note below.** |
| #949 | A second chat logs his requests; this chat builds (26 Sep) | **Working as designed.** The PM and the logging chat have done it since (INBOX.md, `helper/backlog`). | Nothing. |

## Runner note found while doing P27 to P30 (Measured; it is why #694 is not quite closed)
`tests/_cdp.py`'s 380 pass and a run with a **query seed on the URL** both depended on a detail the suite does not state: the test frame is a hidden app frame, so a test cannot read `run.html`'s own query (`location.search` is the frame's). A test that reads its own page's query silently gets the default and **passes for the wrong reason**. FZ1's first seed sweep read "every seed passes" for exactly this reason until it read `window.top.location.search`. Not a product bug; worth one line in the suite's header (`tests/run.html`) so the next seam does not repeat it.

## #966 When there is nothing else to do: new effects, filters, sound effects, polish (standing)
**Verdict: a standing instruction that is being followed, and the menu it asks for can now be written.** Read: `next.sh` prints an IDLE STEER line when nothing is actionable (the structural half shipped in v17.05). What the idle work produced this week: **E1** six new effects with a picture sheet and no change to any existing look, **E2** two comparison sheets and a bug found in my own effect by drawing the sheet (Keep detail ran backwards), `hunt/audit-fx*` and `hunt/audit-compositor*` (no effect had a broken default, 16 old-save differences all declare a legacy value).
What is left on his menu, with what each needs first (all go through the draw-options-then-pick rule, #545):
1. **The ten #912 filters**: first push `fm912-filters` somewhere safe (see P29); then his picks.
2. **ChatGPT's B6 new effects** (13 more than E1's, none duplicating it except Oil Paint): a landing dry run is in P28; each needs a hand merge in `compositor.js` and `fx-registry.js`.
3. **Sound effects:** B7 ("Drums", "Explosion & Thunder", "Ambience", "Everyday Foley") applies cleanly to main 4 of 4 (P28); its tests need an audio context, which the container has.
4. **Polish with more controls on an existing effect** can ship with a before/after and no picking round; the idea list is `#482` and `#904`.
No build from me in this plan: every item above is either his pick, a landing, or already planned.
