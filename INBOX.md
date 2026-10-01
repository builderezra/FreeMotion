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


### 01 Oct 2026, ~13:45 AWST — #980 simple mode: the ORIGINAL editor must not change at all; the editor switch lives in the settings cog as a THIRD section; warn before any swap that can't be undone

**His words (verbatim):** "okay so with this new editing layout i just want to make clear that i dont want the original editor changing in design and function. some of the tests you showed me mean changing stuff i dont want changed with the original editor. dont do that. the option to switch between the two editors should be in the settings cog, making a third section in there. it can be a small button that just switches between editors and should have a button that you press that says \"What should you use?\" pressing makes that pannel open up like how the other two pannels currently function, the canvas settings and the friends one. so this will just be a 3rd section but it stays small unless you want the explanation. allowing quick swapping in editors. also if swapping the editors changes anything that cant be un done make sure theres a warning."

His clauses:
1. The ORIGINAL (Full) editor must not change in design OR function. Some of what he was shown would change it. Don't do that.
2. The switch between the two editors lives in the settings cog, as a THIRD section beside Canvas settings and Friends.
3. That section is a small button that just switches editors…
4. …plus a button labelled "What should you use?" that opens the panel up, the same way the Canvas settings and Friends panels open now.
5. It stays small unless you want the explanation, so swapping editors is quick.
6. If swapping editors changes anything that can't be undone, show a warning first.

**Logger's plan (not his words):**
- This settles D2: the switch is in the cog, NOT on Full's play bar, NOT in Full's ⋯, and NOT on the video.
- It drops every D2 option, and V12's "Buttons on the video" placements, which put things into Full.
- The logging chat is revising DESIGN.md, BUILD-PLAN.md and the visualizers now:
  - an audit of every change the plan makes to Full, with each removed or contained so Full's look and behaviour are byte-for-byte what they are today;
  - the cog's third block, designed on the #945 phone pair and the #978 PC side-by-side mechanism;
  - a structural warning on any swap that would write something un-undoable.
- **Still planning only. Nothing gets built until his D15.** The revised plan lands in `tools/design/plans/simple-mode/`.

### 01 Oct 2026, ~13:56 AWST — HE ANSWERED the simple-editor decisions (#980). D15 A = BUILD Phase 1, but ONLY from the REVISED plan (the Full-untouched revision is still running)

**His words (verbatim; pasted from the decisions page's "Copy my answers"):**
"My picks for the simple editor: D1 A, D2 ?, D3 A, D4 A, D5 A, D6 A, D7 A, D8 A, D9 A, D10 A, D11 B, D12 A, D13 A, D14 A, D15 A, D16 A, D17 B, D18 ?, D19 A, D20 A, D21 A
Not the recommended one: D11 B, D17 B, D20 A.
Not picked yet: D2, D18.
Names: Simple / Full."

**Logger's note (not his words):**
- **Recorded:**
  - D1 A: the names are **Simple / Full**.
  - D3 A: two cards that remember the last pick.
  - D4 A: things follow their clip; music stays.
  - D5 A: deleting a clip deletes its titles too, with Undo.
  - D6 A: a title slides back onto its clip.
  - D7 A: a locked clip stops the edit, with "Do it anyway".
  - D8 A: Simple never makes gaps; Full's gaps show as tap-to-close.
  - D9 A: old projects open as they are.
  - D10 A: clip tools sit in a row above the toolbar.
  - D12 A: the Ask button is in Simple.
  - D13 A: transitions never shorten the video.
  - D14 A: friends can do looks, text, captions and sound first; moving clips comes later.
  - **D15 A: BUILD PHASE 1.**
  - D16 A: the recommended icon set.
  - D19 A: beat marks stay on the music.
  - D21 A: shapes, elements and templates are in Simple under Extras.
- **His three non-recommended picks** change the design, and the logging chat folds them in:
  - **D11 B:** pick ONE switch animation now. Which one is being asked.
  - **D17 B:** music longer than the clips means the video runs on in black, like Full does today.
  - **D20 A:** on PC, a tool's panel opens inside the left band.
- **D2 is settled by his 1 Oct rule:** the switch is the cog's third block, never on Full. **D18** is being rewritten, because Simple's play bar no longer carries the switch.
- ⛔ **BUILDER: do NOT start from the current BUILD-PLAN.md.** Its step 1.1 makes "Full fixes", which his 1 Oct rule forbids ("i dont want the original editor changing in design and function"). The logging chat is revising the plan now: the Full-untouched audit, the cog switch, the un-undoable-swap warning, and then these picks. **A "PLAN READY — BUILD Phase 1" block will land when it is safe to start.** Until then, log this entry as approved-to-build-after-the-revised-plan.

### 01 Oct 2026, ~14:04 AWST — HE ANSWERED D11 (#980): the switch animation is MORPH

**His words (verbatim):** "Just do the one clip on the far left, morph i think it was"

**Logger's note (not his words):** D11 B, one animation, and it is **Morph**: the far-left of V1's three side by side, where clips slide straight up or down into their new places. Fold and Slide are not built. The logging chat folds this into the revised plan (step 7b), with Morph playing as the cog panel closes into the other editor. Still wait for the "PLAN READY — BUILD Phase 1" block.
