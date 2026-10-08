import re
SP='/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/s1/'
def rd(n):
    try: return open(SP+n).read()
    except FileNotFoundError: return '(missing: %s)\n'%n
head=rd('doc_head.md').replace('\\`','`')
sec4_intro='''## 4. Changes to existing files (apply in this order on the tip; each Find is found exactly once)

Generated from the finished tree by script and checked by a round trip (§10): for each file, the tip plus these hunks in this order
is byte-identical to the tree. A hunk may quote text an earlier hunk of the same file wrote. There is **no new file** in 2.3.
Where a Replace is long it is the new code itself: **the 2.3 block** in `js/spine-edit.js` is the whole engine (Speed, Volume, Fade,
Reverse, Take sound out / Put sound back, Mute clip sound, Replace, and the `S.cmd` entries after it).
'''
sec5='''## 5. `?v=` bumps

| File | Tip | After 2.3 |
|---|---|---|
| `js/scene.js` | 119 | 120 |
| `js/inspector.js` | 412 | 413 |
| `js/app.js` | 474 | 475 |
| `js/spine.js` | 2 | 3 |
| `js/spine-edit.js` | 4 | 5 |
| `js/spine-words.js` | 6 | 7 |
| `js/simple-tools.js` | 4 | 5 |
| `js/simple-timeline.js` | 6 | 7 |
| `styles.css` | 759 | 760 |

(They are hunks of `index.html` above, listed here so a builder on a later tree adds one to whatever it has then. `ship.sh` refuses a
changed file whose buster did not move. **No `SCHEMA_REV` bump:** the keys 2.3 writes are `sm.muteByMode` (already allowed), `sm.snd`
(2.2), `sm.twin` (2.1) and `project.sm.muteClips` (kept as a plain unknown key by the sanitiser; `muteClips` is already named in
`js/storage.js`'s project-`sm` comment).)

'''
sec6_intro='''## 6. Tests

### 6.1 Edits to eight earlier tests (Phase 2.2's tray tests)

They assumed a clip has nine tools at most and measured a two-row PC tray; from 2.3 a video clip's tray is thirteen and goes back to
one row (A1). Their purpose is unchanged. The clip they measure is now a **picture** (`smPic`, defined in the first hunk below), the
More test uses an overlay picture (a main clip's More already sits where the pinned More lands, so nothing would move under it), the
wheel test names the last three tools before the pins, and every "nine tools" count moved by Replace. Each of the eight passes on
the finished tree at 1280 and 380 (§10).

'''
sec6b='''
### 6.2 The new tests (append at the end of `tests/tests.js`, before the final `})();`)

Fourteen tests, in this order: the shared `FM.shiftProp` (T23) and `FM.setClipSpeed` (the frozen slider body: Full's FU2 for the
extraction); Speed on a main clip (T25); Take sound out and the twin through every edit, with Put sound back and the mode's guard (T24);
Mute clip sound; the Speed row; Volume and Fade; Reverse; Replace with a shorter and a longer file; `FM.pickReplacement`'s settling
and Full's Replace media unchanged; Replace on a song and an overlay; Speed's refusals and the crossfade; the tray per kind; Mute clip
sound following new clips and Lift off. `smRec` and `smFakeLoad` at the top give a clip a record with a size and a duration without
needing a decoder (A: the gaps note in §13).

'''
parts=[head, rd('doc_design.md'), sec4_intro, rd('doc_hunks.md'), sec5, sec6_intro, rd('doc_testedits.md'), sec6b, rd('doc_newtests.md'), '\n', rd('doc_sec7.md'), '\n', rd('doc_sec8.md'), rd('doc_sec9.md'), rd('doc_sec10.md'), rd('doc_sec11.md'), rd('doc_amb.md'), rd('doc_gaps.md')]
doc='\n'.join(parts)
open(SP+'BUILD-PLAN-PHASE2-2.3.md','w').write(doc)
print(len(doc.split('\n')),'lines',len(doc),'chars')
