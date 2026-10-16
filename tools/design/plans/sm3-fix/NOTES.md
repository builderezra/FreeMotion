# sm3-fix — the open findings of the Simple Phase 3 chain, fixed as code (queue 980, refers to #545)

Branch `hunt/sm3-fix`, built on `ssh/hunt/sm3-replace` (b388d245: v17.51 + sm3-land + template Replace). One commit per finding,
then this file.

**NOTHING WAS RUN.** A release ship was running on this machine: no browser, no server, no python, no suite, no test. The only
programs run were git, grep, sed, awk and `node --check` (OK on js/spine.js, js/spine-edit.js, js/simple-tools.js,
js/spine-words.js and tests/tests.js after every edit). No CR bytes in any changed file. Every test below is owed its first run.

Not mine: **R6** (sm3-land NOTES: Extras in the 96 px PC band) still waits on Ezra's pick, and nothing here touches it.

| # | Finding | Commit | Status |
|---|---|---|---|
| R8 | a member of a long moves-together anchor fell back to its own start rule | 2d5363b3 | fixed |
| #3 | a template's titles, overlays and caption track went in as one block with its clips | f5c3ae55 | fixed |
| #4 | deleting the last piece of an inserted element from the tray left its empty sm.unit group | 2d265f3f | fixed |
| #5 | an element of one picture plus sounds got no group, so a clip move separated them | fdad5d20 | fixed (one design call, below) |
| #6 | a failed Add template / Add element left its media records and stored files | fefd2031 | fixed |

Busters (index.html, +1 over sm3-replace): `js/spine.js` 9 → **10**, `js/spine-edit.js` 18 → **19**, `js/simple-tools.js` 17 → **18**.
If anything lands on these files first: take the higher number, then one above it.

**Full files touched: none.** (#4 calls Full's own `FM.deleteLayer` / `FM.deleteSelected` unchanged, from inside Simple's runner.)

## R8 · js/spine.js 6c — a long anchor takes its members with it

**What was wrong.** A moves-together member takes its anchor's HOST. When the anchor is itself LONG (it runs past the next clip's
end: no host, "long things stay"), `finalHost(anchor)` is null and the member fell back to its own start rule. A lower third whose
3 s bar ran long after Move earlier was split by a Delete: the bar was kept and trimmed, the words went with the clip they start on.

**The fix.** In `finalHost`, when the anchor has no host because it is long, the member is long too: `rec.long = true`, no host,
and the link rule is skipped. It is recorded exactly as a plain long item: long, no host, removed from its start clip's followers
by the existing loop, not in `R.riders` (a caption track never takes the anchor), and **not** `linked` — so `neverPinned` does not
exclude it and the same arranging step's `pinStrays` pins it with the anchor (both get Stay put, as long items left in place do).
Delete's cut list already takes every long, unpinned, non-group unit over the deleted span, so both go through the one delete map.
A long member shows no "Moves with" tag (that tag is for `linked: 'unit'`); both simply stay put.

**Test** `simple P3 · Fix a lower third whose 3 s bar runs past the next clip after Move earlier stays one piece …` (default width,
commands only). Clips Z 0–2, A 2–5, B 5–8; the element at 4.8 (bar 0–3, words 0.3–3.0); Move earlier of A; Delete of Z. CONTROLs:
before the move both ride A; after it the bar (2.8–5.8) reads long. Then: the words read long with no host, in no followers list,
not linked; after the delete both are kept, the bar 2.8–3.8 and the words 3–3.8 (the delete map over [3, 5)), both Stay put, still
in the group, one step. The Extras test's 2 s bar is unchanged.
**On the base** it fails by its own sentences: *"with the bar long the words read {long:false, host:<Z>…}, want long with no host,
as the bar is"* and *"deleting the clip the words start on took the words with it"*. Only commands the base has are called.

## #3 · js/spine-edit.js planAddTemplate — each piece to its own band

**What was wrong.** The whole template (clips, titles, overlays, sm.unit wrappers, caption track, music) was spliced as ONE block
just above the clip before the cut. §12.2: *"Every other unit is placed by the side-aware bands (§3.6.1)"*. So a template title
sat under a long host title it lies over, and its caption track under every overlay above the clip before the cut.

**The fix.** `xTemplateParts` splits the template into units (a layer whose parent is not a group of the template, with its group
descendants). **Row** (spliced above the clip before the cut, as before): every unit holding one of its clips, and every visual
unit the template keeps UNDER or BETWEEN its own clips (side behind or mixed against them — a backdrop rect or a light leak under
its photos stays there: §3.6.1 never lifts what sits behind the clips on purpose; this keeps the original builder's reason for the
one block). **Loose** (everything else) goes to its band in `plan.post`, i.e. after the plan's moves, so the anchors are measured
against final spans, bottom unit first so two pieces of one band keep the template's own order: text → the text band (`xSlot`),
overlay → the overlay band, an adjustment layer → directly above the top-most clip it lies over (the template's own clips count),
a caption track → the top of the stack, a sound → the end of the stack. A wrapper goes as one piece at the band of its top visual.
This reverses sm3-extras NOTES departure #7.

**Test** `simple P3 · Fix a template’s pieces each go to their own band …` (default width). Host: Hello 2–6 (a text, top of the
stack), A 0–3, B 3–6. Template: a caption track, a title 0.2–1.7, P2, P1 and a full-frame backdrop shape under its clips; the
playhead 2.6, so it goes in at 3. CONTROLs (pass on both): P1 and P2 above A, the backdrop below both template clips, the title at
3.2 and P1 at 3. Then: the title above Hello, the caption track at index 0, one step, the clip row A P1 P2 B, the title on P1.
**On the base**: *"the template’s title went in under “Hello”, a title it lies over, not by the text band"* and *"the template’s
caption track is not on top of the stack"*.

**Unsure / for the lock run.** The bands are measured after the moves but before the tail fit (an `sm.tail` watermark the fit
stretches over the new clips is not yet seen). The existing `simple P3 · Extras at 1280×800 …` template test now places its
title + subtitle wrapper by the text band (directly above P1) and its song at the end of the stack; its assertions do not read z,
so it should stay green — owed a run.

## #4 · the tray's 🗑 — the last piece takes its empty group with it

**What was wrong.** The tray's 🗑 on anything that is not a clip called Full's `FM.deleteLayer` (and the several-selected tray
`FM.deleteSelected`); Full's delete never removes a parent it empties, and `refitTransparentGroups`' emptied-wrapper hook runs only
in arranging steps. Adding the "Lower third" element and deleting the bar and then the words left an empty group.

**The fix (Simple's command path only).** New `FM.spine.cmd.deleteItems(ids, many)` (js/spine-edit.js, after the Extras
commands); both tray deletes call it (js/simple-tools.js trayFor's `del`, and the several-selected tray). When the delete would
leave an sm.unit wrapper with no layer in it but groups (a sound still counts as a piece), it runs ONE Simple step labelled
*Delete*: Full's own delete, unchanged, inside the runner (history is muted there, so its commit adds nothing; several = Full's
multi-delete over exactly the ids picked at the tap), then the emptied wrapper and any group left empty inside it. One Undo brings
the piece back inside its group. **Any other item delete is exactly today's Full call, outside the runner.** Not arranging, not
adopting (works with a friend in, like Delete effect).
Two differences, only in the emptying case: the step goes through the runner's lock and lease checks (a locked piece says so with
Do it anyway, D7), and its undo meta is Simple's (`label: 'Delete', ed: 's'`). Nothing is said on success (as today's Full delete
in Simple).

**Test** `simple P3 · Fix deleting the last piece of an inserted element from the tray …` (at 380, through the tray's own 🗑).
CONTROLs: the element lands as one sm.unit group; after the bar's delete the group stays with the words in it; two Undos bring the
whole element back. Then: after the words' delete no group and no empty group is left, two steps in all; one Undo brings the words
back inside the group (the bar still gone); both selected and one 🗑: both gone, no empty group, one step.
**On the base**: *"deleting the last piece of the element from the tray left an empty group in the project: ["Lower third"]"* and
*"deleting both pieces at once left an empty group in the project"*. The test only clicks the tray, so no missing name is called.

**For the lock run:** every Simple test that presses the tray's 🗑 on a text, overlay, sound or caption track, or on several
selected (P2.2's tray tests, e.g. the two-selected row at ~128840): their path is unchanged unless a wrapper empties, but owed a run.

## #5 · an element of one picture and its sounds is tied (one design call)

**What was wrong.** §12.2: *"an element with one visual layer plus sounds makes no group, and its sounds link to that layer as the
anchor through the same rule"*. No group was made and nothing linked the sounds (6c reads only sm.unit groups), so a whoosh past
a cut rode the next clip and a Move of either clip pulled them apart.

**The fix.** (1) `xLoose` wraps such an element too (`xTies`: two or more visual layers, OR one visual layer and at least one
sound), in the same sm.unit wrapper a two-picture element gets; one picture alone still goes in on its own (the existing *"is not
put in a group alone"* check is unchanged). (2) js/spine.js 6c's anchor choice gains one clause, after the clip-row member: a
group with exactly ONE member that draws (not a sound, a caption track or a Full-only piece) and no Stay put is led by that member
— so a sound that starts BEFORE its picture follows the picture, as §12.2 says. Groups with two or more pictures choose exactly as
before (earliest start, ties higher in the stack).

**The design call, his to overrule.** §12.2 says "makes no group"; the task allowed "as the sm.unit rules allow". Nothing derived
can tell later which sounds came with which picture, so some stored tie is needed:
- **(a) as built — the sm.unit wrapper, the one picture leads (recommended):** one rule already in the file (§2.5, §4.1), Full sees
  an ordinary closed group named after the element, Ungroup drops the tie.
- (b) no group, each sound transform-parented to the picture: the link rule ties them, but it is a stored link §4.2 argues
  against, and Full would show a sound with a Parent.
- (c) the wrapper with §4.1's anchor rule untouched: a whoosh that starts first leads, and a sound that runs on more than 1 s past
  its clip then makes the whole element stay put (R8).

**Test** `simple P3 · Fix an element of one picture and a sound is tied together …` (default width). The classifier half (pure):
a group of a sound at 3.2 and one shape at 3.5 on the cut — CONTROL: as a plain group they ride A and B; as an sm.unit group both
ride B (the picture's clip). The insert half: A 0–3.5, B 3.5–7; an element of a 64×48 picture (0–2, a real PNG) and a whoosh
(1.2–2.0) at 2.5. CONTROLs: 2.5 / 3.7, the picture on A, and the same document with the whoosh untied puts it on B. Then: one
sm.unit group holds both, the whoosh rides A, and after Move later of A the whoosh is still 1.2 s after the picture.
**On the base**: *"in a moves-together group of one picture and a sound that starts first, the picture rides Clip 1 and the sound
Clip 1: the sound leads, not the picture"*, *"the picture and its sound were not tied in one moves-together group"*, *"the whoosh,
which starts after the cut, rides Clip 2, not the picture’s clip"* and *"after Move later … the whoosh is -5.800 s from the
picture"*.

## #6 · a failed pack insert takes its files back out

**What was wrong.** `xMount` sets FM.media records for the new ids, `pk.used = true`, and `FM.storage.writeMedia` for a file this
device cannot decode; when the step then failed (fitTails, markCuts, a band placement), `restorePreEdit` put back the document
only. FM.media kept records for ids not in the project, IndexedDB their files until the boot sweep, and the pack was never let go.

**The fix.** `xMount(pk, layers, plan)` registers `plan.unmount` first (so a throw half-way is covered). The runner calls it
(`undoOutside`) right after `restorePreEdit` on both paths that put the document back: **'failed'** — the records are removed
(`FM.media.remove`, only while the record is still the pack's and the id is not in the document), each stored file is removed once
its own write has settled (so the delete can never land before the write), and the pack's files are let go at once; **'ask'**
(the tail fit asks first; Do it anyway re-runs the step and mounts again) — the same after the 30 s retry window, unless the
re-run landed. `xRelease` skips a record already released. Add element and Add template both mount through xMount. Every other
plan has no `plan.unmount`.

**Test** `simple P3 · Fix an Add template that fails after its files went in takes them back out …` (default width). A template
of P1 (a real PNG, a clip) and Logo (a 40×30 picture whose file has no picture in it, so this device cannot open it). The test
records `FM.storage.writeMedia` / `removeMedia` (it never reaches IndexedDB) and makes `FM.spine.fitTails` throw, so the step
fails after it mounted. CONTROLs: the tail fit ran and the broken picture was stored once; the line says nothing changed; the
document and the undo count are as before. Then: no media record is left for a layer the step put back, and the stored file was
removed. **On the base**: *"the failed step left 1 media record(s) for layers it put back"* and *"the file it stored for the
picture this device cannot open is still there"*.

**Unsure.** The 'ask' path has no test (it needs a tail unit tied by a coupling whose keys the fit would move).

## What the lock run must cover

First run, at both widths (the tests that name 380 run there themselves; the others read the default runner frame):
```bash
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P3%20%C2%B7%20Fix'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=simple%20P3%20%C2%B7%20Fix'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P3%20%C2%B7%20Extras'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=simple%20P3%20%C2%B7%20Extras'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P3'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P2'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=simple%20P2'
```
Then prove: each new test must FAIL with its source reverted (the sentences above), then the full suite at both widths and the FU
group (no Full file changed; Full's delete, the Add menu and the template/element inserts in Full are untouched). Things to look
at first if one goes red: R8 — the Move earlier step's own `pinStrays` (it runs on the pre-edit read, where the bar is not long
yet); #3 — `xSlot`'s overlay fallback and `xSnap` against a host group run; #4 — the tray redraw between the two clicks
(`FM.selectLayer` then `smTool('delete')`), and FM.deleteLayer's own `refreshAll` inside the runner; #6 — the microtask order of
the stored-file removal (the test waits on `v.idle()` before it restores the stubs).
