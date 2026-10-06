# Plans for the next 5 oldest open items (P5)

Against `origin/main` b46b47d (v17.23). Plans only: no app, test or tool code changed, nothing run in a browser. Written under the PM's quality rule: every claim traced in code; where I could not, it says **guess**. Shorter on purpose.

## Which five

After #964 (the last item in P4), skipping standing instructions, #921 and #980 (their own big designs), #923, and every `(hunt …)` item: **#967, #982, #985, #987, #1065**. Four of the five wait on Ezra; **#1065 is the only one marked READY**, and one finding (#982) suggests it may already be done.

---

## A. #1065 Remove the ? help button from the phone (READY)

**His words (verbatim).** "quickly log that the question mark help button can be removed from mobile versions". PC keeps its own.

**Traced (verified).**
- The phone's button is `#m-help` (`index.html:366`); PC's is a separate `#btn-help` (`index.html:286`), moved into the PC transport row by `js/app.js:7737`. Removing `#m-help` leaves PC alone.
- `js/app.js:6965` binds `#btn-help, #m-help` with a selector list, so a missing id is safe there. `js/shortcuts.js:149-156` (`helpButton`) loops over `['m-help','btn-help']` on a phone and returns the first with a nonzero box: with `#m-help` gone it finds `#btn-help`, which has no box on a phone, and returns null. That is handled (the code already returns null from Home).
- **The shortcuts sheet keeps a way in on a phone:** Settings has a "Keyboard shortcuts" row (`js/settings.js:748`). So the logger's optional question (add a Settings entry point?) is already answered: it exists.

**What the logger's plan missed (verified):**
1. **Four tests need `#m-help` and will fail:** `tests/tests.js:44679` (test "the phone help button sits to the RIGHT of the version chip", queue 266), `:44712` (a rendered clone of the help icon), `:94042` (`#m-help or #m-del is missing from the phone bar`), `:106913` (`the phone bar has no ? (#m-help)`). 22 lines in `tests.js` mention `#m-help` or `#btn-help`. Each must be rewritten to say the phone bar has no ?, not deleted.
2. **The bar's spacing was tuned around it:** `styles.css:7806-7808` sets `#m-help { margin-right: -2.5px }`, `#m-notes { margin-left: -1.5px; margin-right: -4px }`, `#m-export { margin-left: 3.1px }`, with a long comment about a 2 px ink gap. Removing the button changes the distances between ver, notes, cog and Export; re-measure them at 380 and 440 and show Ezra a before/after (it changes the Full phone bar, which is a visible change, his rule #545).

**Plan.** (1) Delete the button and its three CSS lines; (2) rewrite the four tests; (3) re-measure the bar at 380, 440 and 320; (4) send the before/after picture; (5) ship. **Test that must fail on HEAD:** at phone width `#m-help` is absent and the remaining buttons keep their order; at PC width `#btn-help` is unchanged.
**Risk:** low, but it is a visible change to the existing editor, so the picture goes first.

---

## B. #982 Home's Join button becomes an icon (probably already moot)

**His words (verbatim).** "Change the join button in the home menu to just be a simple icon instead of saying join, because its getting cluttered."

**Traced (verified).** v17.22 re-laid-out Home: the top bar is Settings, wordmark, Search, Profile (`styles.css:6910-6918`), and **`#hm-join-btn` is `display: none` in the top bar** (`styles.css:6918`, comment "Join and idle Select are in menus now"). The word "Join" now only appears in the profile menu as "Join a friend's project…" (`js/home.js` profile menu; `js/collab-ui.js:5214-5232` says the button "remains as an internal click target"). The clutter he complained about was the pill beside Select, which no longer shows.

**Plan.** Do not build the icon. Ask him one question with a picture of today's Home at 390: "Join is now inside your profile menu. Is that what you wanted, or do you still want an icon on the bar?" If he wants the icon, the four drawn options (A arrow into a doorway, recommended) are in `tools/design/982/`, and the build is a button in `.hm-top-actions` (`index.html:683`) with `aria-label="Join a friend's project"`, a 44 px target, and the existing handler `U.joinDoor()` (`js/collab-ui.js:5226-5230`). **Guess:** I did not run the app to confirm the pill is invisible on his phone; the CSS rule is unconditional at the widths I read.
**Needs pictures:** only if he says yes.

---

## C. #985 Export menu settings should make sense at first glance

**His words (verbatim).** "the export menus settings are honestly a bit daunting for someone who doesnt know how it works. I dont want to lose any function but i want it to actually make sense at first glance. Capcut does a really good job of this but dont fully copy"

**State (verified).** Three designs were drawn and sent 29 Sep (`tools/design/985/`: A "What you'll get" recommended, B "Pick a goal", C "Sliders + size"), with `mapping.md` listing every one of today's 34 settings in each (I did not recount the 34). The dialog today is `#export-dialog` built in `index.html:840-960` (`#exp-format`, `#exp-res`, `#exp-fps`, `#exp-quality`, `#exp-range`, `#exp-solo-btn`, `#exp-transparent`, the custom size and fps fields, the GIF note) and driven by `showExportDialog` (`js/app.js:5593`, `:5628`). Waiting on his A, B or C.

**Plan once he picks.**
1. **Keep every control reachable** (his clause 2): build from `mapping.md` and add a test that lists every `#exp-*` id above and asserts each is reachable (visible, or one tap inside "More options") in the new dialog. That fails on HEAD only if an id is dropped, which is the point.
2. The folded-in #917 finding: on a phone the Resolution and Frame rate selects cut their own text ("Same as project …"). Whichever option wins, assert at 380 and 320 that `#exp-res` and `#exp-fps` show the whole value (measure `scrollWidth <= clientWidth`).
3. Keep the audio warnings: `#exp-noaudio-warn` (`index.html:848`) and the pre-export card are the surface `export-no-sound.md` relies on; the new design must not hide them.

**Risks.** This is the biggest visible change to the Full editor on the list; every export test that reads these ids (the suite has many) must be updated, and tutorial 09 (export options) describes today's dialog and will be wrong. **Needs pictures:** sent.

---

## D. #987 A colour indicator of who left each note (collab)

**His words (verbatim).** "If you're doing a collab edit - there should be a colour indicator based on who left the note."

**Traced (verified).** Notes are `{id, text, remind}` only (`js/notepad.js:14-26`, header comment), no author field; they sync between people in a live session (the entry; and `collab-security.md` F1 found they reach every guest). Three indicators were drawn and sent (A dot and name, B colour stripe, C their face, recommended: the same initial-in-a-circle as the people chip).

**Plan once he picks.**
1. **Record the author when a note is created:** add one small field (the member's colour id) in `js/notepad.js` at creation, only while a session is live; nothing changes for a solo user.
2. **The sanitiser must keep it:** `sanitizeProjectFields` keeps notes only if they are objects with a string `text` (`js/storage.js:1065-1070`) and does not strip other keys, so a new key survives, but a **collab schema bump is needed** (a sanitiser change; `C.SCHEMA_REV`, `js/collab-core.js`, and its fingerprint test) or two builds would normalise a note two ways.
3. **Privacy:** the author colour reveals who wrote a private note. `collab-security.md` F1 already says the owner's private notes reach every guest including viewers; this feature should ship **together with** that fix (a per-note "shared" flag), or it makes the leak more visible.
4. Draw the indicator in the Notes panel only, behind a live session.

**Test.** Create a note in a live session with two fake peers; assert the stored note has the author colour and that a note made offline has none. Must fail on HEAD (no field).
**Needs pictures:** sent; wait for the pick.

---

## E. #967 Live collaboration "extremely underbaked" on his phone

**His words (verbatim, short).** "extremely extremely underbaked from what I've seen on my phone … 1 million things that are missing."

**State (verified from the entry).** The 6-agent audit was done 26 Sep and **all five build batches shipped** (v17.06 to v17.10): the switch stays at the foot of the Friends block, "OFF means off", doors he can see, one name ("Work with friends"), plain words, comments on the phone. Clauses 1, 3, 4 and 6 are ticked in the entry; **2 and 5 wait on one check nothing here can make**: he sends himself an invite from his phone to his PC (or a second phone) and joins once.

**Plan.** Build nothing. Make his check easy: tutorial 17 (`tutorials/17-work-with-friends.md` on `tutorials-drafts`, corrected in QF1) is exactly those steps, and Settings has a "Test connection" row (`js/settings.js:486-492`) that says in one sentence per row which relay, address lookup and local connection work, with a copy button. Put both in front of him: "Do the 7 steps in tutorial 17 with your own two devices, and if anything fails, tap Test connection and send me what it says."
**Known limits, not bugs to fix now (from my H4 report):** there is no TURN server, so two phones on strict networks cannot connect; the invite link defaults to Editor role; the 45-bit short code is weak against offline guessing; the owner's private notes reach viewers. These are the next collab work, in that order of user impact, but each changes behaviour and needs his say.

**Risk:** none from this plan (no code). **Needs pictures:** no.

---

## What would help most

One short message to Ezra covering the five: **#1065** "OK to remove the ? from the phone bar? Here is before and after"; **#982** "Join lives in your profile menu now; is that enough?"; **#985** pick A, B or C; **#987** pick A, B or C (and OK to fix the notes privacy at the same time); **#967** "please run tutorial 17 once".

## Verified vs guess

Verified: every `file:line` above, the four tests that break for #1065, the CSS that hides the Join pill, the notes shape. Guess: that the #982 pill is invisible on his phone (not run), the count of 34 export settings (taken from the entry, not recounted), the order of the collab limits by user impact.
