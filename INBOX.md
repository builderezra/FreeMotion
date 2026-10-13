# INBOX

Append requests below the divider. The building chat drains it: each entry moves into REQUESTS.md with a
number, then `tools/inbox.sh --done` removes only the lines it was shown, so anything added mid-drain stays.
The divider is the line of three dashes below. Keep that exact line out of this header prose: on 20 Sep
the old drain cut the file at the first three dashes in the header, and the inbox was blind for six days.

WHO WRITES HERE: Ezra from his phone, and the LOGGING CHAT (his arrangement, 26 Sep). The logging chat
writes one block per message he sends it:

    ### <date, time AWST> — <short title>
    **His words (verbatim):** …exactly what he typed, typos and all…
    **Logger's plan (not his words):** a READY-TO-BUILD plan: where in the code, the exact change,
    options already drawn/rendered (and his pick, when he has made it in the logging chat),
    measurements already taken, the test that proves it, and any question left (as a `❓ASK:` line).
    Big plans live in tools/design/plans/ and the block links them.

BUILDER: move the WHOLE block into the REQUESTS.md entry. His words go in as the verbatim quote and get
split into his numbered clauses as usual. The plan goes under them, labelled as the logger's plan.
Follow it; if the tree has moved and a step no longer fits, say so in the entry rather than improvising silently. Design requests still get drawn options before anything ships
(#545), and the queue order is unchanged: log it at the bottom and it waits its turn.

---


### 12 Oct 2026, ~21:40 AWST — PM → API builder: build during the lock run, because "still running" turns spend his API money (hunt MEDIUM #23)
**What the PM measured (~/.fm-api-builder/progress.log):** since the v17.39 Full-unchanged lock started at 21:21, three turns in a row only reported "the lock is still running, finishes ~23:15":
- 21:34, 377 s, ≈ $2.58;
- 21:35, 50 s, ≈ $0.37;
- 21:35, 22 s, ≈ $0.16.
They came 30 s apart because the wrapper's idle back-off never started. Its fingerprint counts EVERY worktree and branch in this repo, and the builder chat (helper lane) was editing its own worktrees at the same time, so each idle turn looked busy. At that rate the ~2 h lock costs ~$20 for nothing.
**Do:**
1. While a lock run or a ship runs, do NOT end a turn with only "still running". Build the next release in a worktree, code only, as LOOP.md's "Build during ships" says. For example:
   - fold hunt/su1-fixes and hunt/simple-firstuser-fixes into the 2.3 and 2.4 trees;
   - prepare v17.40 from hunt/land-b1 + hunt/labs-on-fixes + hunt/fix-land-b3 + hunt/answers-1130;
   - run the four AAC tests through the Windows-Chrome win pass once the lock is done.
   If there is truly nothing to code, end the turn with exactly "IDLE until <time>" and nothing else.
2. The PM is moving the builder chat into a SEPARATE clone (~/fm-helper), so its edits stop resetting your idle back-off.

### 12 Oct 2026, ~22:05 AWST — Helper-lane branches ready for the API builder (builder chat's queue (a)–(g), DONE on helper/done 882e703f)
**Take in queue order, in place of the cloud hand-off's versions where they overlap:**
- `hunt/su1-fixes` 8099a5e6 — **PROVEN at 380 and 1280.**
  - SU1 #9: the label half. The tray half was already fixed by 28825016; now Simple's ✓ redraws the timeline.
  - SU1 #12: a project opens in Simple with nothing selected; Full unchanged.
  - simple 93/93 and 980 23/23 at both widths.
- `hunt/su1-split` 788b98b4 — proven at 380 (red on old, green on new); the wider slices are still to run.
  - ✂ splits the clip under the playhead (the S rule).
  - The first title shrinks to fit the frame with a 6% margin (Simple only).
- `hunt/su1-more` b2b1269a — built, browser proof pending. More pressed again closes it (toggle only, no docking; the layout options come as a picture for Ezra later).
- `hunt/cdp-dialogs` ae4070d4, on main.
  - tests/_cdp.py presses OK on dialogs and reports them; a command silent for 600 s ends the run as STALLED.
  - Offline self-test: tools/test-cdp.py, red on the old file.
  - Wiring it into ship.sh is your call. It would have caught yesterday's p22 lock stall at the 380 probe.
- `hunt/fix-radialwipe0` 3b42d50d — test-only, so landing it needs UNPROVABLE.
  - **PM decision, reversing ez14 item 2:** Radial Wipe at Progress 0 stays HIDDEN.
  - Progress means how much is revealed, like hard Wipe. Two existing tests pin "0 shows nothing", and the old pass came from a 1-px leak that ce7768ac closed.
  - The branch adds radialwipe:progress=min to queue 264's sweep beside wipe's. No behaviour change.
**Lanes:** the builder chat stays off the browser while your lock run or a ship runs. It will do the remaining browser proofs and More's layout options after the v17.39 lock finishes.

### 12 Oct 2026, ~22:35 AWST — Helper lane: your v17.40-port → v17.44-port chain pre-flighted (code), and the SU1 fixes rebased onto it
**From the builder chat (helper lane, ~/fm-helper):**
- **The chain is clean.** wip/v17.40-port → v17.44-port: every step carries exactly its original's change: same files, same line counts, same new tests. That covers land-b1 76f4a1b9..c3205c8d, 2.3 c8afdb2d..5d69f4f0, BX2d 78215e84, 2.4, 2.5 and 2.6. The one extra is 2.4's intended BX1d test.
  - Tree checks pass at every step and against main: no stale or backwards busters, no dead tags, and tests.js parses.
  - Only the expected tests are dropped, as in the original chain: #920's four replaced tests at v17.40, 2.4's "refuses until 2.4" test, and the ramp-delete rename at 2.5.
- **`hunt/su1-on-v17.44` 83e39d18** = all five SU1 commits rebased onto v17.44-port: SU1 #9 label, #12 nothing selected on open, ✂ under the playhead, title fit, and More toggles. No code conflicts: tests.js appends were rebuilt by blocks, busters renumbered, the tree check passes, nothing dropped. Its 380/1280 slices run after your lock finishes. Take it instead of the separate su1-* branches when the chain reaches 2.6.

### 12 Oct 2026, ~23:18 AWST — His credit rule + who owns what (so no work is done twice)
**His words (verbatim):** "The API can fully run out i don't care - it needs to be used up anyways" … "Auto reload is off" … "You're job is to make sure my credits aren't wasted - they can be wasted in two ways - it doing stuff so slowly I don't use my weekly limit - it wasting it on pointless stuff or errors"
**What it means for you (the API builder):**
- **Spend on work, not waiting.**
  - Your cap is now $300 counted (the Console's real $200 balance stops you). It applies when Ezra restarts you after the v17.39 lock.
  - During every lock run and ship, BUILD in a worktree (INBOX pm8). Never end a turn with only "still running".
  - Every ship that goes red for a flaky reason costs ~2 h and real money, so pair or slice a red before re-shipping (LOOP.md).
- **Lanes, so nothing is built twice.** The builder chat (subscription, ~/fm-helper) OWNS these, so do not start them:
  1. SU1's remaining Simple problems (its hunt/simple-firstuser report), on top of hunt/su1-on-v17.44;
  2. #1132, the cog redesign (app code + tests; release L's lock pricing stays with whoever ships it);
  3. #966, new effects/filters/sfx and effect polish.
  It reports finished branches on helper/done; you land them in queue order. Everything else in next.sh order is yours: the v17.39 → v17.44 Simple chain, v17.40 Full batch, AX2 export audio after the Windows-Chrome AAC pass, #1082 Tutorials tab, labs-on-fixes, fix-land-b3.

### 12 Oct 2026, ~23:58 AWST — Helper lane: hunt/su1-c and hunt/cog-1132 (#1132) built (DONE on helper/done db149574)
**Built by reading only: code plus red-first tests. The browser proofs run in the builder chat after the v17.39 lock clears.**
- `hunt/su1-c` a148db39, on hunt/su1-on-v17.44:
  - **SU1 #6:** in Simple, More's Trim start/end to playhead on a clip-row clip now goes through Simple's ripple trim, so there's no gap.
  - **SU1 #15:** the tray's tools scroll in a strip that ends where More/Delete begin, with fade edges. That's a visual, so Ezra sees it at 380 with More's options before it ships.
  - **SU1 #21:** Simple's music is called "the song".
  - **PM decision:** More's Move/Extend to playhead in Simple go through Simple's own commands, so no gap ("Gaps close up by themselves" is Simple's promise). Hide them in Simple only if routing them cleanly is not possible.
- `hunt/cog-1132` a0a0985c — **#1132, his six cog clauses**, carried onto the current chain and finished:
  - every clause plus the PM decisions (INBOX pm5);
  - 13 new tests; 9 old tests rewritten to "all closed on every open";
  - fixes the render missed: focus, a 76 px landing jump in the flight, the PC column spreading, the Editor cap.
  - **Needs five DROPS TEST lines** (listed in its DONE line) and **release L** (lock pricing) before it ships.
  - **One deviation from the picture he saw, accepted by the PM:** on a PC with Friends or the Editor open, App settings sits at the far end of the small column, not under Canvas. The render's placement lifted Canvas off the cog's line, which breaks #978's "Canvas always right by the button".
**Still being built in the helper lane:** SU1 #5 and #17; #966 batches 7, 10 and 13.

### 13 Oct 2026, ~00:08 AWST — Helper lane: Simple Move/Extend gap fix + #966 batch 13 (Stylize depth) (DONE on helper/done 2ffc0666)
- **`hunt/su1-c` 445ca218.** In Simple, More's **Move to playhead** moves the clip to the cut nearest the playhead (the rule Clips › After Clip N uses). **Extend to playhead** goes through Simple's grip commands. So there are no gaps and nothing is hidden. Two red-first tests, with Full as the control. PM: nearest cut is approved, because it matches After Clip N.
- **`hunt/fx-b13` 4538bd39 (on e1-land): #966 batch 13, Stylize depth.** New controls for:
  - Halftone (Mono / Colour dots / CMYK, ink, paper…);
  - CRT, VHS, Scanlines, Pixel Sort;
  - Dither (Floyd–Steinberg / Atkinson / Blue noise);
  - HSL Bands.

  Saved looks are pinned byte-for-byte. Proven in node against the real kernels: 14 new tests are red on the base and green here, and 229 existing effect tests are unchanged. **The 921 S1 schema gate needs a re-pin when it lands** (see the SCHEMA_REV warning in the cloud hand-off).
  - **PM decisions:** the new labels ('Print', 'Mask type', 'Sort by', 'Ignore greys below', 'Lightness from/to', 'Show selection') are fine. That's an obvious yes.
  - **Poster Print** keeps its current look. Switching it to Colour dots changes a library look, so Ezra sees a before/after first, and only then does it change.
**Still being built in the helper lane:** SU1 #5 and #17; #966 batches 7 (audio), 10 (warps), 11 (generators) and 14 (blurs/3D). Proofs run in node where possible; the browser queue waits for the lock.

### 13 Oct 2026, ~00:12 AWST — Helper lane: hunt/su1-bc 9dd09f31 = su1-c + SU1 #17 + SU1 #5 (helper/done 061550cc)
- **SU1 #17:** selecting a sound no longer draws a transform box.
  - ⚠️ The bug was in SHARED code, so **Full changes too**: it also stops drawing a full-frame box round Extract Audio's invisible twin.
  - The Full-unchanged lock will see this. Treat it as a deliberate Full fix (price it, or ship it in a Full batch), not as an accident.
- **SU1 #5 (More's panel won't scroll with a finger) is UNPROVEN.** The agent could not find a cause in the code: nothing on the path blocks scrolling, and the sheet does overflow. So it restructured instead: the docked sheet's body now scrolls under the grab bar, the shape the PC band uses. Its tests send real wheel and touch input against a plain scrolling box.
  - A red check is queued with the #5 change taken back. If that check passes, the bug doesn't reproduce in the suite's Chrome, and #5 lands only with an honest UNPROVABLE line, or waits for Ezra's phone.

### 13 Oct 2026, ~00:15 AWST — Helper lane: #966 batches 7 (audio) and 10 (warps), both on e1-land (helper/done e79f7452, aff12339)
- **`hunt/fx-b7` 69f57acc, audio choices, 8 items.**
  - Audio controls can now be choices and on/off switches.
  - New controls:
    - shapes on six modulation effects;
    - Distortion types, tone and auto level;
    - Telephone styles;
    - filter slopes;
    - Phaser stages;
    - Ring Mod sweep;
    - Chorus voices and spread.
  - Today's sound is the default. A mock Web Audio harness ran 914 builds with 0 throws.
  - ⚠️ One line in collab-core.js: the audio fingerprint now includes `legacy`, so the 921 gate needs a re-pin.
  - Ezra HEARS the Distortion types and Telephone styles before this ships.
- **`hunt/fx-b10` a38397a0, warps, 7 items.**
  - Every warp gets Edges and Smooth sampling, on CPU and GPU.
  - New controls:
    - Wave speed;
    - Ripple/Curl falloff and radius;
    - Kaleidoscope zoom, source and flow;
    - Turbulent flow and stretch;
    - Displacement Map channels, blur and fit;
    - Mirror angle and fold;
    - Hexagon grout.
  - The CPU side is proven in node: red on the parent, green here.
  - ⚠️ **The GLSL has never been compiled.** Its three GPU tests must run in a browser before this goes in any release.
- His questions (names, sounds, feel calls such as Kaleidoscope Flow's direction) are in each DONE line. The PM collects them into one picture/sound sheet for him.
**Landing note:** all the fx batches (b7, b10, b13, and 8/11/12/14 coming) sit on e1-land. Land them as one Full batch after one browser pass, with ONE SCHEMA_REV bump and ONE 921 re-pin, not one per batch.

### 13 Oct 2026, ~02:00 AWST — Helper lane: #966 batches 8 and 11 (fx-b11 incl. the Lightning Core swatch fix) — see helper/done for each DONE line
- **`hunt/fx-b11` 5159b1a9** (generators, on e1-land), including a follow-up: with Lightning's Core unset, the Core row's swatch now shows the colour the kernel actually draws (the bolt colour 80% toward white).
  - Kernel unchanged. Both "real" fixes were tried and rejected: each moved the pinned saved-bolt frames (21 or 2 of them).
  - New `FM.fxRegistry.followedColour`; inspector fallback swap (`?v=413`).
  - Red-first test with a control; all 16 `482 11.` tests, the 11.6 pins, 793, 784 and the sanitise sweep pass in node.
  - The inspector row itself is not yet seen in a browser.
- **Batch 8:** see its DONE line. Its full audio sweep re-runs once the browser is free.
- **Still running:** batch 14 (blurs/3D). Batch 15 is next.
**Landing:** as pm15 says, land all the fx batches on e1-land together after one browser pass, with ONE SCHEMA_REV bump and ONE 921 re-pin.

### 13 Oct 2026, ~02:10 AWST — PM → API builder: you are UNDER-spending (his rule: slow = waste)
**Measured:** about $10 spent in 5 h (≈ $2/h). One single turn (since 21:36) has mostly waited on the v17.39 lock and ship. At this pace the $200 credit is NOT used by your stop time (15 Oct 15:45, ~60 h), and his words are "it needs to be used up anyways".
**Do, from your next turn:**
1. While a lock run or ship holds the browser, run 2–3 **code-only subagents** in parallel, each in its own worktree (no browsers, no suites). Examples:
   - fold the helper lane's branches into the next trees (su1-on-v17.44, su1-bc, cog-1132 with its DROPS TEST lines, the fx batches on e1-land);
   - draft release L's lock pricing for #1132;
   - prepare v17.40's land list.
   Then run proofs and slices in the gaps between ships.
2. Don't spend a whole turn waiting. Check the ship and lock in a short tool call, then go back to coding.
3. The builder chat (subscription) owns SU1, #1132's app code and #966. Don't duplicate them (INBOX pm11).
4. **A shared browser window, set by the PM.** When v17.39 has landed, the helper lane gets the browser for **40 minutes**, counted from the landing.
   - It runs the proofs of branches about to land: fx-b10's GLSL compile and GPU tests, su1-split, su1-more, su1-bc, cog-1132. Then it renders Ezra's picture/sound sheet.
   - Code during those 40 minutes, and start no lock run, ship or suite.
   - When the helper posts "BROWSER FREE" on helper/done, or the 40 minutes are up, the browser is yours again.
   Without this window its proofs never get a gap, and its branches can't land.

### 13 Oct 2026, ~03:12 AWST — PM → API builder: the browser-sharing rule, replacing pm17 item 4 (a collision happened at 03:00)
**What happened:**
- v17.39 landed at 02:57. The PM gave the helper lane a 40-minute browser window, which you never saw: you have been in ONE turn since 21:36, so INBOX notes don't reach you.
- You launched v17.40 at ~03:00. Its proof collided with the helper's slices, and you re-launched at 03:03.
- No harm done, but two lanes guessing at gaps does not work.
**The rule from now on:**
1. **The helper lane runs NO browser while you run.** Its proofs ride YOUR release trees: when you fold a helper branch in, your ship's prove step and suites are its proof. Run a branch's own named slice first if you want an early read.
2. **When YOU decide a gap suits you**, for example right after a ship lands and before your next lock or ship, write `~/.fm-browser-slot` containing an end time (e.g. `date -d '+30 min' +%s`), and start no browser work until that time. The helper lane polls for that file and uses the slot for:
   - its GPU/GLSL checks (fx-b10's shaders have never been compiled);
   - Ezra's picture and sound sheet.
   It deletes the file when done. Please grant one slot of about 30 minutes after v17.40 lands. Ezra's decisions on More's layout, the tray fade, Poster Print and the fx-b7 sounds are waiting on that sheet.
3. **End your turn** when you are only waiting on a ship or a suite (your wrapper rules already say so). The wrapper calls you back, and each new turn reads INBOX. Waiting inside one turn for hours means you miss notes like this one.
