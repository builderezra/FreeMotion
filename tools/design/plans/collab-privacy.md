# Work with friends: ready-to-build plans for the four privacy fixes from H4

Source findings: `tools/design/hunts/collab-security.md` on branch `hunt/collab-security` (F1, F2, F4, F5). Line numbers are against `origin/main` b46b47d3 (v17.23). Plans only: nothing in the app, tests or tools was changed or run. **Verified** means I read the line; **Guess** says so.

## The two decisions Ezra owes, in one place

| | Option A | Option B | my pick |
|---|---|---|---|
| **F1 notes** | Say it where he writes it: a line in the Notes pad while a session is live, one sentence in the "What gets sent?" list. No wire change. | Make notes private to each device: notes stop syncing. Needs a schema number bump, so every friend must update at once. | **A** |
| **F2 "can only watch"** | Make the menu label true: "Viewer: can watch and play it". Defaults unchanged. | A, plus new rooms start with "Viewers and commenters can export" switched off. | **A**, with B as a one-line follow-up if he wants it |

F4 (address wording) and F5 (pixel cap) need no decision from him, except one number in F5 (below).

One thing I found while planning that the H4 report did not say: **the app already tells the truth about export in two places** (the owner's switch row, `js/collab-ui.js:1819-1821`: "Their device makes the video, so this only asks it not to...", and the Viewer's own panel, `:3121`). Only the role MENU label is untrue (`js/collab-ui.js:50`). So F2 is a one-word fix, not a new screen.

---

## F1. The owner's project notes reach every guest, viewers included

**Verified facts.** Notes live in `scene.project.notes` (`js/notepad.js:14-26`, `list()` even creates `P.notes = []` on first read). The session withholds only five keys, `DENY` at `js/collab-session.js:31`, applied by `viewOfProject` (`:33-43`), which feeds the diff, the hash and the snapshot. `notes` is a synced id-keyed array (`js/collab-path.js:251`).

### Option A: say it where it is written (recommended)

1. **In the Notes pad, while a session is live.** `js/notepad.js` builds the head at `:79-81` (`np-title`, then `np-hint`). Add, only when `FM.collab && FM.collab.active` is true:
   ```js
   if (FM.collab && FM.collab.active) head.appendChild(el('div', 'np-hint np-shared', 'Everyone in this project can read these notes.'));
   ```
   No new CSS: it reuses `np-hint`. Check at 380 and 1280 that the head does not grow past the pad (the pad's own layout tests will say).
2. **In the "What gets sent?" list.** Add one string to `PRIVACY_FULL` (`js/collab-ui.js:1984-1990`): `'Your project notes (the Notes pad) are part of the project, so everyone you invite can read them, viewers too.'`
3. **While there, fix a word clash.** `ROLES[1][2]` is "can leave notes only" (`js/collab-ui.js:50`) but a Commenter writes **comments**, not Notes pad notes. Change it to "can leave comments only", and the Commenter's own line at `:1043` ("you can leave notes, not change the edit") to "comments". `roleMeans` (`:1161`) feeds the Commenter panel line from the same array, so one edit covers the menu and the panel.

**Tests (each must fail on v17.23):**
- `collab F1 the Notes pad says it is shared while a session is live, and not otherwise`: open the pad with no session (assert no `.np-shared`), then inside `withCollab921` (`tests/tests.js`, the helper S6/S7 tests use) open it and assert the line.
- `collab F1 the full privacy list names the Notes pad`: tap "What gets sent?" in the Share panel (the pattern at `tests/tests.js:105558-105572`) and assert `/project notes/` in `.cs-privacy`. Run it at 380 as well; the existing fit test is `tests/tests.js:32712`.
- Update `tests/tests.js:105716-105719` (the role-words test): the regex `/^Commenter — can leave notes only/` becomes `comments only`.
**Risk:** none for the wire. The words are the only change. **Effort:** half an hour plus the test run.

### Option B: notes stay on the device that wrote them

This is a protocol change, so it is bigger than it looks. Everything below is required; leaving any step out leaves a hole.

1. **Stop sending them:** `const DENY = [..., 'notes'];` at `js/collab-session.js:31`. That removes `notes` from the diff, the hash and the snapshot.
2. **Refuse them coming in.** `viewOfProject` only controls what is SENT. A remote op is applied straight onto the live project (`D.apply(doc(), op, liveOpts())`, `js/collab-session.js:441`, `:540`, where `doc()` is the live scene, `:144`), and the host's `validOp` (`js/collab-host.js:188-226`) has no key rule for the `P` root. So an older build, or a hostile peer, could still write `['P','notes',...]` into the owner's real notes. Add to `validOp`, in the `else` branch after the `P.valid` check:
   ```js
   if (op.p[0] === 'P' && C.DENY && C.DENY.indexOf(op.p[1]) >= 0) return 'private';
   ```
   (`C.DENY` is set at `js/collab-session.js:1703`; read it at call time, since the host file loads first, `index.html:1140` against `:1147`.) **Side effect to know about:** this also starts refusing writes to the five existing keys, which today are only withheld, not refused. Nothing the app sends writes them (they are excluded from the diff), so I expect no change, but run the S-series.
3. **Make the schema fingerprint notice.** `SCHEMA_FP` hashes the sanitiser's output, not `DENY` (`js/collab-core.js:223-243` (the hash is built at `:238`)), so a change to `DENY` would not fail the fingerprint gate (`tests/tests.js:30289`). Add `'|deny' + P.canon(C.DENY)` to the string that is hashed, then bump `C.SCHEMA_REV` and paste the new `SCHEMA_FP` as the failing test instructs. **Coordination:** main is at 7, the Simple branches take 8 (`js/collab-core.js:48` there), and #482 polish batches also bump it. Take the next free number at merge time; do not hard-code 8.
4. **Say so.** Replace Option A's Notes pad line with "These notes stay on this device." (shown while a session is live) and drop the `PRIVACY_FULL` sentence.
5. **Existing copies keep what they already received.** A guest who joined before this ships keeps the owner's notes in their saved copy; they cannot be recalled. Say so in the release note.

**Tests:**
- `collab F1b a note's text never appears in anything the owner sends`: a project whose `notes` hold the canary `NOTE-CANARY-7`; `C._viewOfProject(project)` must lack `notes`; then with a fake-net room (`withFakeNet921`), join a guest and assert the canary is in no frame the guest received (scan every `snap`, `tail` and batch).
- `collab F1b the host refuses a write to notes`: send a `tx` containing `{o:'s', p:['P','notes'], v:[...]}` from a guest; the ack must refuse it and the owner's `project.notes` must be unchanged (use the harness in the S1/S2 host tests).
- `collab F1b a guest's own notes do not travel and do not erase the owner's`: the guest writes a note (it calls `list()`, which creates the array locally); the diff must produce no op for it.
- The schema gate itself: `tests/tests.js:30313-30367` mutates `SCHEMA_REV`; add one more mutation row for `C.DENY` so the gate proves it sees the new term.
**Risk:** every friend must update together (the version gate refuses an older build, by design). Editors lose shared reminders; comments remain. **Effort:** about a day with the tests.

---

## F2. "Viewer: can only watch" is not true

**Verified facts.** The menu label is `ROLES[2][2] = 'can only watch'` (`js/collab-ui.js:50`), shown wherever a role is picked (`roleItem`, `:51`). `roExport` defaults to true (`:360`, and `:1017` keeps `!== false`), so a Viewer can export and keep a copy. Every guest also receives the media files (`js/collab-media.js`). The honest words already exist elsewhere: the owner's switch row (`:1819-1821`) and the Viewer's panel (`:3121`).

### Option A: fix the label only (recommended)

1. `ROLES[2][2]`: `'can only watch'` becomes `'can watch and play it'`. (The Viewer's own line, `:3109-3110`, already reads "you can watch, not change the edit".)
2. Tests: `tests/tests.js:105716-105719` pins `/^Viewer — can only watch/`; change it to `can watch and play it`. `tests/tests.js:106380-106392` pins the panel line and already says "you can export a video"; leave it.
**Tests that must fail on v17.23:** the changed regex in the role-words test. Add no other test.
**Effort:** ten minutes. **Risk:** none.

### Option B: also start new rooms with export off

1. Do A.
2. `js/collab-ui.js:360`: `roExport: true` becomes `roExport: false` in the new-room settings. **Only new rooms:** `pushSettings` (`:1017`) reads the saved room's own value, and a saved room already has `roExport` written, so existing rooms keep theirs (Guess: I read the creation path, not a migration of rooms saved before the field existed; `st.roExport !== false` treats a missing field as ON, so those stay ON).
3. Tests: `collab F2b a new room starts with export off for viewers and commenters` (create a room through the Share flow, read `hostRoom.settings.roExport` through the settings row's checked state, assert off) and one that a saved room with `roExport: true` stays on after reload.
**Honest limit, to say in the release note:** this only asks the guest's app to hold back; their device still holds the clips and a screen recording works. The switch row already says exactly that.
**Effort:** an hour. **Risk:** a first-time owner who wants a friend to export now has to find the switch.

---

## F4. The host's internet address reaches a code or link holder before they are admitted

**Verified fact.** The line is `PRIVACY_FULL[3]`, `js/collab-ui.js:1988`: "Anyone with your link or short code can see the internet address of each device that joins." It is the only copy in `js/` and `COLLAB-DESIGN.md` (searched). The owner's own address reaches even someone he turns away, because the approval ("knock") happens after the connection (`COLLAB-DESIGN.md:954`).

**Change:** one line:
```js
'Anyone with your link or short code can see the internet address of each device that joins, and yours too, even if you then say no.',
```
**Tests:** no existing test pins that sentence (searched `tests/tests.js` for the old text: none). Add `collab F4 the privacy list says the owner's address reaches a refused joiner`: tap "What gets sent?" in the Share panel and assert `/even if you then say no/`. Run at 380 (the list is behind a tap, so the sheet's fit test `:32712` is not affected).
**Effort:** ten minutes. **Risk:** none. This could ship with F1 Option A in one release; both touch `PRIVACY_FULL`.

---

## F5. A peer's picture is decoded with no pixel limit

**Verified facts.** `FM.loadImageFile` (`js/media.js:801`) resolves once the image loads and checks nothing about size; its only cap is GIF frames at 64 million pixels (`:725`). The peer path is `writeRecord` (`js/collab-media.js:1191-1210`): it **stores the file first** (`FM.storage.writeMedia`, `:1198`) and only then loads it, and the caller treats a `false` as "out of room" (`:1162-1163`: `if (!ok) { outOfRoom(ctl, e.fid); return false; }`).

**Two traps to avoid, both found by reading the call site:**
- **Do not put the cap in `loadImageFile`.** That is also the path for his OWN photos. A phone camera at 48 MP (8064 x 6048 = 48.8 MP) is legitimate and a 200 MP sensor exists, so a global 50 MP cap would refuse his own pictures. Cap the peer path only.
- **Do not return `false` from `writeRecord` for a too-big picture.** That reads as "out of room" and shows the wrong message, and it may retry.

**Build:**
1. A header reader `FM.imageHeaderSize(file)` in `js/media.js` that reads the first 64 KB (JPEG: scan for an SOFn marker, which can sit after EXIF) and returns `{w, h}` or `null` for PNG (IHDR, bytes 16 to 23), GIF (bytes 6 to 9), WebP (`VP8 `, `VP8L`, `VP8X`) and JPEG. It decodes nothing, so a 20000 x 20000 PNG header costs nothing.
2. In `js/collab-media.js`, before the `writeRecord` loop at `:1150-1165` (once per file), if `kind === 'image'` and `w * h > FM.PEER_IMAGE_MAX_PIXELS` (**64e6**, the same number the GIF check already uses at `js/media.js:725`): drop the transfer's parts (`dropParts`), set `ctl.refused[e.fid] = 1`, make `planWants` skip refused files (so it is not asked for again), show one toast, "A picture from NAME is too big to open on this device (W x H), so it was not added", and do **not** send `have`.
3. `null` from the header reader (an unknown format) falls through to today's behaviour.

**One number for Ezra (or the builder):** 64 million pixels means 8000 x 8000. It refuses a 100 MP or 200 MP phone photo a friend sends, which is the safe side for a phone (a 108 MP picture is about 430 MB decoded). Say so in the toast so a friend knows to send a smaller one.

**Tests:**
- `collab F5 a peer's 20000 x 20000 picture is refused before anything is stored or decoded`: build a minimal PNG whose IHDR says 20000 x 20000 (about 70 bytes), run it through the peer receive path with `FM.storage.writeMedia` and `FM.loadImageFile` spied; assert neither is called, the transfer is marked refused, and the toast text names the size. Must fail on v17.23 (it calls both).
- `collab F5 the header reader`: PNG, GIF, WebP (all three kinds) and a JPEG with EXIF before the SOF marker return the right size; a truncated file returns `null`.
- `collab F5 his own big photo is untouched`: `FM.loadImageFile` of a 70 MP header-only image does not hit the cap (the cap lives only on the peer path).
**Effort:** about half a day. **Risk:** a legit large picture from a friend is refused, with a message.

---

## Order, and what depends on what

1. **F2 A, F4, F1 A** in one release: words and one Notes pad line, no wire change, no schema bump. About an hour of building plus the tests.
2. **F5** next: independent, no schema change.
3. **F1 B and F2 B** only if Ezra chooses them. F1 B waits for a schema number and for the Simple branches' 8 to land or be renumbered.

## What I did not do

I did not run anything: no test, no browser, no relay. The test names and harness helpers (`withCollab921`, `withFakeNet921`, `need921S6`) are the ones the existing collab tests use, but I have not written or run these tests, so each still needs the "fails on v17.23" proof the repo requires.
