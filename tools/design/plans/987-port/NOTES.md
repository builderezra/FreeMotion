# #987 — the note author's face (option C), ported onto today's code (branch hunt/987-port)

- **From:** `ssh/hunt/987-note-face` 2217cb77. It was built on v17.40 (caef240d) and never merged or run.
- **Onto:** `ssh/hunt/948-review` d61c591e (v17.55 + #948).

CODE ONLY. Nothing was run: no browser, no server, no python, no suite, no prove, no fp.js. A release ship was running on
the laptop. The checks were `node --check` on all six JS files and tests/tests.js (all OK), a CR-byte grep (none), and
reading the code paths below.

**The decision:** #987 — *"✅ UNBLOCKED 11 Oct, ~10:05 AWST — decided by the PM under his standing rule (#1130 …); he
can overrule: the note author is shown by C, the face badge."* (option C = the comments' initial-in-their-colour circle
beside each note).

## How it was ported

- **App source:** `git diff caef240d..2217cb77 -- js styles.css` then `git apply -3`. **All seven files applied
  cleanly, with no conflict hunks:** collab-bridge, collab-comments, collab-host, collab-session, notepad, storage and
  styles.css. notepad.js has not changed since v17.40. In the other six, the code changed since then sits away from these
  hunks. The one close neighbour is collab-host's comment-key change (`ls`/`lo`, 2.4), about 30 lines from
  `stampNotes`, with no overlap. I re-read every hunk in place on the new base:
  - `resolveOp` still stamps on `s`/`ai`.
  - The owner tick in collab-session still applies `r.b.ops` into live (now `commentStamp || noteStamp`).
  - `afterApply` still has `pk` and `sum.release`, and collab-session still emits `release: true`.
  - `midsUsed` still has `see()`.
  - `CM.face`/`CM.author` still point at `avatar`/`me`.
  - `noteAuthorOk` sits at the storage IIFE's top level, after `sanitizeProjectFields`.
- **index.html: the BASE's file, never the branch's.** Each file the port changes is bumped by one from the base's
  number:
  - styles.css 772 → 773
  - notepad.js 10 → 11
  - storage.js 67 → 68
  - collab-host.js 6 → 7
  - collab-session.js 16 → 17
  - collab-bridge.js 12 → 13
  - collab-comments.js 6 → 7

  (The branch's own numbers, 761 / 11 / 62 / 6 / 16 / 12 / 6, were v17.40's and are ignored.) **Re-check against main
  when landing.** If v17.56 bumped any of these, bump once more from main's number.
- **tests/tests.js: rebuilt by block, not merged.** The branch appended one block at the end of the IIFE: the 987
  helpers `pad987`, `face987`, `note987`, `type987` and `sentBy987`, and the three tests. That block was taken whole
  from the branch's diff and inserted before the final `})();`, after the base's last test. None of the five helper
  names existed in the base. Every rig it uses exists under the same name: `need921S7`, `withCollab921`, `layer921`,
  `rawWire921` (still gives every wire `#a78bfa`), `until921S6`, `rgb921`, `withGuestApp921` and `q915aCleanup(made,
  orig, wasHome, tpl, elem, libs)`. The written `test('` lines go 3084 → 3087. The three titles have no double quotes.
- **Name clashes:** each new top-level name is declared once in its file:
  - storage: `noteAuthorOk`
  - collab-host: `goneNotes`, `rememberNote`, `stampNote`, `stampNotes`, `isNotesPath`
  - collab-session: `noteStamp`
  - notepad: `liveAuthor`, `authorOf`, `face`, `onRemote`, `liveRefresh`

  collab-host's own `authorOf` is in a different closure from notepad's.
- **Appended `//` comments:** every one the port adds closes a complete statement. None swallows a continued line.

## Does `by` survive today's sanitiser and whitelists? (whitelist drift has dropped fields here four times)

I traced every place a note passes through on the new base:

1. **storage.js `sanitizeProjectFields`** runs on every load, every import, and the host's project invariant through
   `clampProjectDims`. It keeps each note object whole, extra keys included. The port adds one rule: a `by` that fails
   `noteAuthorOk` is deleted and the note kept. `noteAuthorOk` requires all of:
   - `mid` matching `/^[\w.-]{1,64}$/`
   - `name` a string of at most 200 characters
   - `color` matching `/^#[0-9a-f]{6}$/i`

   Today's real values all pass:
   - mids are `o`, `g` or `m<n>` (collab-session `'m' + (++nextMid)`)
   - names are at most 32 characters (`LIM.NAME`; H.join and H.ownerSelf slice them)
   - colours are 6-digit hex, forced by H.join and H.ownerSelf (`'#888888'` otherwise), and GREY is `#8a8f98`

   So a stamped `by` is never stripped by the host's own invariant.
2. **collab-session `viewOfProject`:** `notes` is not in DENY (only template and element pointers are), and it is a
   syncable key, so notes travel and hash.
3. **collab-path:** `by`, `mid`, `name` and `color` all match `KEY_RE` (`/^[A-Za-z$][\w$]{0,63}$/`), so the diff, canon and
   clone keep them. `notes` is keyed by `id` (KEYED), so `#i:<id>` paths work.
4. **collab-host:** there is no notes whitelist. COMMENT_KEYS and REPLY_KEYS apply only to `P/comments`, and
   `overLimit` and `validOp` have no notes rule. The invariant fix (`invariantFix` → `inv.project` →
   `clampProjectDims`) can only delete a malformed `by` as an ordinary fix op, which every device then applies.
5. **collab-core.js:** no notes handling at all, and nothing in it filters project sub-keys.
6. **Other copies of notes:** `serializeScene` (`project: scene.project`, whole) and history (layers only). Templates
   and elements delete `notes` entirely (packFromProject's rule, unchanged). No code maps notes to
   `{id, text, remind}`.

Result: a well-formed `by` survives every path. A malformed one is dropped and its note kept, which is what the third
test asserts through `FM.storage._clampProjectDims`.

## Schema: does not move — no SCHEMA_REV bump, no `/* FP TO PIN */`

`C.schemaFingerprint` hashes these, and the port changes none of them:
- `_sanitizeLayers(SCHEMA_FIXTURE)` (layers only)
- the fx and audio-fx param tuples
- `OP_GRAMMAR`
- `derivedFingerprint` (DERIVED_FIXTURE's project has no notes)
- `SCHEMA_REV`
- `_clampProjectDims(SCHEMA_PROJECT_FIXTURE)`, whose fixture has no `notes`, so the notes branch never runs
- `SM_V`

So SCHEMA_FP stays 5707384916977245 by construction. `921 S1 the schema fingerprint gate` should confirm it on the
first run.

Judgement call, stated plainly: the project sanitiser's RULE did change, for one case. A note whose `by` is malformed is
now stripped, where a pre-port build keeps it. The fingerprint cannot see this because its fixture has no notes. I did
not bump, for these reasons:
- Only the HOST runs the project invariant, and it sends the deletion as an ordinary fix op, so every device converges.
- A pre-port host keeps the malformed `by`, and a post-port guest's panel ignores it. `authorOf` needs a string mid, and
  the face matches the colour against the palette.
- A malformed `by` comes only from a hand-edited file or a hostile peer.

If the builder wants the gate to cover notes, the honest way is to add a note with a `by` to SCHEMA_PROJECT_FIXTURE,
bump SCHEMA_REV to 15 with a REV comment, and re-pin the FP by fp.js. That is a separate decision, and not done here.

## Tests (three, `{ item: '987' }`, all added; none dropped or changed)

- `987 a note written in a live session carries who wrote it — the host stamps the author whatever the device claimed — and the open Notes panel on both sides shows that person’s face in their colour`
- `987 the host keeps who wrote a note — a friend’s edit of somebody else’s note leaves it theirs, the Undo of a delete brings it back as theirs and not as whoever pressed Undo, and a note from before sharing stays without one`
  - A pure Host test with no UI. It is the cheapest proof.
- `987 alone, a note carries no author and the Notes panel draws no face — it saves exactly as {id, text, remind} — while a note that has an author wears its face, keeps it through a save and a reopen, and a malformed one is dropped`

Expected on the base, reasoned and not run. Each fails at its own sentence:
- **Test 1:** "the room holds Sam’s note as {"mid":"o","name":"Ezra",…} — not Sam". The pre-port host keeps the
  claimed author.
- **Test 2:** "Sam’s first note is in the room as {"mid":"o",…} — … — not Sam".
- **Test 3:** "a note that HAS an author shows no face — not Sam’s S in rgb(167, 139, 250)".

Run them in a slice at 380 AND 1280 (`?only=987`) before a Full release. They have never run, on v17.40 or here.

## For the release that lands this

- POLISH-LOG can claim `queue 987`. Its clauses 1–3 are the build, and clause 4 (#545) is the picture below.
- **#545, the picture to send:** `tools/design/987/phone-C.png` (option C as he was shown it on the phone: four notes,
  each with its writer's face between the tick and the words; `pc-C.png` is the PC one). Once the slice has run, a real
  screenshot of the built panel at 380 in a live session (two people, two faces) should replace it. That is owed,
  because no browser was available here.
- Browser checks still owed:
  - The open Notes panel redraws when a friend adds, ticks or deletes a note, and NOT while a note is being typed into.
  - ✕ deletes the right note after a friend's delete.
  - A solo project's notes save as plain `{id, text, remind}`.
  - Light and dark, phone and PC.

## Unsure / left alone

- The tests depend on the S7 rigs behaving as they did on v17.40, and collab-session has changed by about 100 lines since
  then (undo 2.6, holds). The names and shapes match, but nothing proves the behaviour until they run.
- The entry's plan also mentioned that the role text says Commenters *"can leave notes"* where it means comments
  (collab-ui.js ROLES and the role banner). The branch did not change it and neither did I. It is not one of his clauses.
