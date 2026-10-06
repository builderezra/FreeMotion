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

### 06 Oct 2026, ~00:10 AWST — Give his second (free) Claude account a tutorials job, on a lower model, monitored

**His words (verbatim):** "On my google that i have open (take control of my pc to see) i have another claude account open and i want you to delagate it a task. This task cannot interfere with other stuff. an idea for it could be creating tutorails. it isnt a pro sub so it has less usage, make sure its running a lower model. Monitor its output and make sure the tutorials are actually good and good for the app"

**Logger's plan (not his words).** The PM (logging chat) drives the second account in his Chrome on claude.ai, on the lowest model offered. It writes step-by-step FreeMotion tutorials from PM-written fact sheets taken from the code, so it never guesses at buttons. It has no access to the Mac or the repo, so it cannot interfere with the builder or ChatGPT. The PM checks every tutorial against the code and the live app before keeping it. Kept tutorials go in `tools/design/tutorials/`, and only Simple-mode-independent features are covered while #980 is being built. BUILDER: log it, nothing to build. If these become a public tutorial series, BEFORE-PUBLISHING.md (Alight Motion look) applies first.

### 06 Oct 2026, ~02:00 AWST — Rules audit done: changes for the BUILDER (his request, verbatim below)

**His words (verbatim):** "Make sure none of the rules chatgpt or you have set up are slowing us down or causing issues, i may of set a rule ages ago that doesnt fit well for right now." Later the same night: "look, time to achieve stuff doesnt bother me, as long as it is well spent time and not wasted. if tests are proved to be genuinely helpful then keep testing and take your time getting it right"

**PM's plan (not his words).** A read-only, adversarially verified audit of every standing rule (CLAUDE.md, LOOP.md, tools/ gates, memory, ChatGPT's prompt, the PM's rules) is in **`tools/design/pm/RULES-AUDIT.md`**. Its "Changes for the builder" section B1–B13 has the exact files, lines and wording, and none of it weakens a proof gate. In short:
- **Before your next ship:**
  - **B4** mutate.sh: its cap is 1800 s but a pass is 2697 s, so it cannot finish. FIRST-TWO.md tells the land-1013 release to run three mutations.
  - **B1** a `tools/ship-bg.sh` launcher that exits 3 ("launched, NOT shipped"), live-pid checks in ship.sh, and the same two-line ship rule in CLAUDE.md, LOOP.md rule 6, tick.sh:104, REQUESTS.md:53-62 and the suite-timeout memory.
  - **B3** the oldest-first refusal text must say: never JUMP an item in his own words (e.g. #980) just to get a land release through.
- **Soon:**
  - **B2** build during ships: create the next worktree BEFORE a ship and reuse it mid-ship.
  - **B5** first-message step 3 reads tick.sh's `UNSHIPPED RELEASE:` line, not "is the tree dirty".
  - **B6** ship.sh guards: a source-hash re-check before `git add -A`, wait up to 20 min for load before the phone pass but never refuse after a green desktop pass, STALLED detection, PASSES-ALONE / FAILS-ALONE diagnosis on a red pass, and its own server port.
  - **B7** a docs-only fast path: 163 lines of his words are on this Mac only.
  - **B8** a cheaper one-minute tick: move the LOOP.md narrative to LOOP-HISTORY.md; the tick.sh trims.
  - **B9** inbox wording. **B10** the unblock-list line at the top of REQUESTS.md. **B11** memory merges.
- **Before the Windows laptop:** **B12** port checks must refuse, never silently skip.
- **Only after his yes:** **B13** his global ~/.claude/CLAUDE.md.

**Three practical notes:**
1. **#1065** is JUMPED: ChatGPT already built it as 57a745ea. Land it after its browser check and the 380px check; do not rebuild it.
2. **#1068**'s fetch line points at /private/tmp, which the reboot emptied. The branches are already in this repo under refs/heads/codex/*; LAND-LIST.md is updated to match.
3. Before each land ship, run ChatGPT's still-pending focused tests as one `?only=` slice.

**Already done by the PM:**
- PM-STATE lanes and tick rules.
- LAND-LIST fetch line, and ChatGPT's rule A is now "focused tests only, never a full suite; your landing ship is the full-suite gate".
- ChatGPT's heartbeat prompt REPLACED with the audited rules: one worktree, never stash, start new fixes from v17.23, real REQUESTS numbers on tests, never take his-words items. A backup is at ~/FreeMotion-backups/automation.toml.before-audit-2026-10-06.
- Its two /tmp bundles moved to ~/FreeMotion-backups/.
- Two memory fixes: chatgpt-prompts-one-block and chatgpt-codex-interlude.

❓ASK (his, when he is back; the PM asks him):
- (a) ChatGPT's checked fixes land BETWEEN Simple releases, or only AFTER Simple mode is finished?
- (b) Republish the unblock list at a new private link: yes or no?
- (c) Yes to correcting his global CLAUDE.md (the "nothing leaves the device" exception for collab relays; moved folders; the old Slot game/FreeMotion copy)?
- Also his hands: Spotlight Search Privacy for ~/Claude/FreeMotion, ~/.codex and ~/Library/Application Support/Claude.

### 06 Oct 2026, ~02:25 AWST — (hunt LOW) Five beginner traps the tutorial review found in the app — PM findings, NOT his words

**Context (not his words).** Ezra asked that the tutorials be "actually good and good for the app". Writing beginner tutorials and checking them step by step against v17.23 (b46b47d3) showed five places where a new user gets stuck. These are audit findings: log each as `(hunt LOW #n)` so they sort behind his own requests. Evidence is in `tools/design/tutorials/REVIEW.md` and `check-2026-10-06.json`.
1. **Phone: after the first import, Export is hidden.** The new clip is auto-selected (app.js:3099-3100), which sets body.m-editing (app.js:1007), and `body.m-editing #m-export { display:none }` (styles.css:4214) removes the Export button until the user finds the back arrow. Tapping back a second time goes to Home. A beginner who just added their first clip cannot see how to export. Options to draw: keep Export visible in the clip header, or do not auto-select after the first import.
2. **Phone: grabbing a clip to move it gives no visual signal on iPhone.** It only calls navigator.vibrate(10), which Safari does not support. The edge grips turn teal, but the clip body shows nothing. A lift or shadow on grab would fix it.
3. **PC: the S key splits only when the playhead is over the selected clip.** Otherwise it STRETCHES the clip's near edge out to the playhead (app.js KeyA/KeyS/KeyD), a surprising, different edit from a "split" key.
4. **Effects browser: the "does nothing here" badge swallows the tap.** On a full-frame clip, tapping the badge on the Drop Shadow tile shows a toast and does NOT pick the tile (fx-browser.js ~929). The user has to know to tap the picture instead.
5. **Drop Shadow → Shadow only on a full-frame clip turns the whole picture black**, which reads as broken. A hint in the control, such as "make the clip smaller first", would help.

### 06 Oct 2026, ~03:55 AWST — (hunt MEDIUM) PC export "Save" may give Windows users no way to save the MP4; and a home for the tutorials — PM findings, NOT his words

**Context (not his words).** These come from round 3 of the tutorial review against v17.23 (`tools/design/tutorials/REVIEW.md`, `check3-2026-10-06.json`).
1. **(hunt MEDIUM) PC Save → share sheet. PLAUSIBLE, not yet run.** `deliver()` (exporter.js:66-75) calls `navigator.share` whenever `canShare({files})` is true, and nothing checks whether the device is a phone. The ready card has only Save and Discard (app.js:6305-6320). Desktop Chrome/Edge on Windows and Safari on Mac support sharing files, so a PC user likely gets the OS Share window instead of a download, and on Windows that window has no "save to disk". It matters more now that he is moving to a Windows laptop.
   - **Test:** on Windows Chrome, export, then Save. Is there any way to get the file onto disk?
   - **Likely fix:** on a non-touch, wide screen, download the file, or offer Download beside Share.
2. **(note) The app already has a home for tutorials.** Home's **Tutorials** tab is a placeholder reading "Short walkthroughs of the editor will live here." (home.js:2601-2605). The second Claude account is writing checked how-to tutorials on branch `tutorials-drafts`: 01 first video, 02 trim/split, 03 glow and shadow. 02 and 03 pass a three-round step-by-step code check, and 01 is on its last two fixes. 04 keyframes, 05 titles and 06 music are being written.
   - Showing them in that tab is a design decision for him. Draw options first (#545).
   - Also check BEFORE-PUBLISHING.md if they go public.

### 06 Oct 2026, ~04:10 AWST — ChatGPT is out of usage until 11 Oct; its finished chain of 7 fixes on v17.23 is ready to land — PM note, NOT his words

**PM's note (not his words).**
- **ChatGPT is stopped.** It hit its usage limit at 03:05 AWST: "You've hit your usage limit … try again at Oct 11th, 2026 2:24 PM". Its heartbeat still fires every minute and fails at once, which costs nothing. It stays ACTIVE so the work resumes by itself if Ezra adds credits. That is his call and is not asked of him.
- **What it left is clean.** One linear chain on v17.23 (b46b47d3), branch **`chatgpt/1059-detect-speech-fallback`** (tip 13e5b1ea; worktree clean; the refs are already in this repo). Its land-ready table is at the end of its STATE.md (~/.codex/visualizations/…/freemotion-takeover/STATE.md).
- **Proven** (focused test, red with the fix reverted, green with it; muted Chromium on its own port):
  - `2ea47a00` #1013 empty AAC track: supersedes the pile's f25e15d3 plus fix-for in FIRST-TWO.md.
  - `9cec73a1` #1014 panorama reopen: supersedes 3170a94c plus fix-for.
  - `ba154a37` #1040 missing transform on import.
  - `a22dbc46` #1041 nested styled groups.
  - `13e5b1ea` #1059 Detect speech fallback.
- **NOT proven:** `d8fa4fbb` #1015 guest reconnect clash and `8c813c78` #1016 keyboard numeric values. GATE BLOCKER: their focused tests on port 8894 "could not bootstrap the app frame", and one reverted #1015 run failed setup with undefined innerHTML. Run them yourself, once on the tree and once on HEAD, before landing them.
- **Landing order waits on his answer** to the RULES-AUDIT question: between Simple releases, or after Simple mode. Until then, do not land. When it is time, apply per commit, uncommitted, with the usual `git show … | git apply -3 --index` route (excluding index.html/tests.js/outside), then bump `?v=` from live once.

### 06 Oct 2026, ~05:05 AWST — (hunt LOW) Two more beginner traps from the tutorial review — PM findings, NOT his words

Adds to the 02:25 block, with the same source (`tools/design/tutorials/check4-2026-10-06.json`):
6. **Phone: while a clip is selected, the "Tap to add a layer" row and the + are not drawn at all** (timeline.js:3966 `addRowWanted() && !soloId`; styles.css:4205). Import auto-selects the new clip, so straight after importing a video a beginner cannot find how to add a title or a song. This is the same family as trap 1 (Export hidden), and one fix could cover both. Draw options: keep "add" reachable in the solo view, or do not auto-select after import.
7. **A song or file is added AT THE PLAYHEAD** (app.js:3055), clamped to the project end. Someone who has just watched their video to the end gets the song starting after the video. Options: start audio at 0 when the playhead is at the project end, or show where it landed.

### 06 Oct 2026, ~10:40 AWST — PC: a second, hidden back button in the top left that shows on hover

**His words (verbatim):** "on pc i often find myself looking for the back button to get out of projects in the top left but it isnt there, its in a functionally better spot but i think it might be a good idea to make a second hidden back button to exit a project hidden in the top left and when you hover over that area its shows. make sure it looks good"

**Logger's plan (not his words):** in progress. The logging chat is mapping the PC top-left and drawing options over a real screenshot of the editor. A follow-up block will carry the options, his pick, the exact CSS/JS and the test. Design request, so pictures first (#545). It must not move or change the existing back button ("its in a functionally better spot").

### 06 Oct 2026, ~10:55 AWST — PLAN for the 10:40 block (PC hidden back button in the top-left) — options drawn, waiting on his pick

**Logger's plan (not his words).**
- **Options were rendered INTO the live editor** at PC 1280x800, crisp at 2x, and sent to him: `tools/design/pc-back-hover/options.jpg` (crops: `{idle,a,b,c}-corner.png`).
  - **A:** the existing back chevron on a 34px glass tile.
  - **B (recommended):** a glass pill reading "‹ Projects".
  - **C:** a quarter-circle glass corner that grows out of the top-left.
  - ❓ASK: his pick, A, B or C. The plan below is written for B; A and C differ only in the CSS block.
- **Where it goes.** On PC (≥701px) `#topbar` is hidden and `#main` (the stage) spans the whole top row (styles.css:6476-6480, measured `#main` = 0,0,1280x560), so the top-left of the screen is the stage's top-left. It is empty in the editor's resting state.
  - The real back button `#btn-back` stays where it is (`#t-home`, left of the transport row, app.js:7666-7667; styles.css:8212). This is a SECOND door, not a move. He said "its in a functionally better spot".
- **The change:**
  - **HTML:** `<button id="btn-back-corner" class="corner-back" aria-label="Back to projects" tabindex="-1">` holding the same chevron SVG as `#btn-back`, plus `<span>Projects</span>`. Put it inside `#main` so it scrolls and layers with the stage; `position:absolute; left:14px; top:14px; z-index` above the canvas overlays but below dialogs and sheets.
  - **Click:** delegate to `document.getElementById('btn-back').click()`, so behaviour stays identical: leave a group first, then Home (app.js:6909-6913).
  - **CSS, idle:** `opacity:0; transform:translateX(-6px); pointer-events:none`.
  - **CSS, revealed:** opacity 1, transform none, pointer-events auto, over 160ms ease-out.
  - **The hot zone** is a transparent `::before` or a sibling 180x120px at the top-left that reveals on `:hover`. The pill keeps itself shown while hovered (`#main .corner-zone:hover .corner-back, .corner-back:hover, .corner-back:focus-visible`).
  - **B's look:** height 34, radius 17, padding 0 14px 0 10px, gap 6, 13px/600, `background: rgba(233,244,247,.09)`, `border:1px solid rgba(233,244,247,.18)`, `backdrop-filter: blur(12px)`, `box-shadow: 0 6px 18px rgba(0,0,0,.35)`, text `rgb(233,244,247)`. These are the exact values the picture was drawn with, in the app's own tokens.
  - **Light-chrome Home theme (body.white-chrome):** check the editor is dark there too. If not, use a light glass variant.
- **Gates:**
  - Only `@media (min-width:701px) and (hover:hover) and (pointer:fine)`. A touch screen never gets an invisible button, and phones are untouched.
  - Hidden while any dialog or sheet is open, during text editing (body.text-editing) and drawing (body.drawing), and in fullscreen/preview mode. Check what else lives at the stage's top-left: canvas zoom/fit chips, selection toolbars, the Simple-mode cog (#980). Measure each state at 1280x800 and 1024x700 and move the zone if anything collides.
  - `prefers-reduced-motion`: opacity only, no slide.
- **Tests (tests/tests.js):**
  1. At 1280 wide the corner button exists, has opacity 0 and pointer-events none at rest; hovering the zone gives opacity 1 (wait for the transition), and its rect does not overlap any visible control (elementFromPoint over its box).
  2. Clicking it calls the same path as #btn-back: inside a group it exits the group; at top level it opens Home.
  3. At 380 wide (`--width 380` pass) it is `display:none`, and on `(hover:none)` it never shows.
  4. Prove: each test fails with the CSS/JS removed.
- **#980 overlap check:** Simple mode on PC adds its own chrome. The builder must confirm the corner is still free in Simple mode, or hide the corner button there if Simple has its own exit.

### 06 Oct 2026, ~10:50 AWST — HIS PICK for the PC hidden back button: B

**His words (verbatim):** "B"

**Logger's note (not his words).** ✅ He answered the ❓ASK in the ~10:55 PLAN block (written just before; the timestamps there are approximate): **B**, the glass pill reading "‹ Projects". It appears when the mouse is over the stage's top-left corner. Build it exactly as that plan says (its CSS values are the ones the picture was drawn with: `tools/design/pc-back-hover/b-corner.png`). It joins the queue in order, behind #980 Simple mode.

