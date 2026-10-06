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

### 06 Oct 2026, ~23:45 AWST — Verified findings from the cloud helper's audits (export sound, phone memory, Work-with-friends privacy) — PM findings, NOT his words

**Context (not his words).** Ezra's second Claude account (cloud, own branches only) wrote three code audits: `hunt/export-no-sound`, `hunt/app-memory` and `hunt/collab-security`. Each one's 4 most important claims were adversarially checked against v17.23 (b46b47d3). The full verdicts with file:line are in `tools/design/pm/helper-hunts-verified.json`. Log each item as `(hunt …)` so it sorts behind his own requests, except where it says he must decide.

**Export sound (hunt MEDIUM):**
1. CONFIRMED: a project where ONE clip's sound fails to read exports with that sound missing, yet the ready card says "Sound ✓".
   - Cause: `FM._audioTrackDropped` is set only when ALL clips fail (exporter.js:748), and the amber warning lives in the overlay that app.js:6247 hides before the card opens.
   - Fix: add `audioMissing` (the length of FM._lastAudioDrops) to the run result (exporter.js:1620) and show "Sound — N clip(s) missing" on the card (app.js:6281). Test with one good clip plus one undecodable clip.
2. PARTLY: the export decodes each source file whole (exporter.js:562 → media.js:836), with no 300 MB ceiling like the other three decode paths, so a long 4K clip can kill the tab at export start.
   - Fix: on phones, refuse sources over WAVE_MAX_BYTES with a named "too big to read its sound on this device" drop, and release m.audioBuffer after the export.
   - Do NOT decode at 8 kHz (the audit's idea would ruin the sound).
3. WRONG, don't do it: the audit's "missing AAC description means encode-failed" check. The bundled muxer supplies its own AAC config (vendor/mp4-muxer.js:1639-1653), so that check would CREATE silent exports.
4. PARTLY: audio-only export (WAV/M4A) downloads with no fresh tap, revokes the URL after 1 s, and always says "Audio exported" (app.js:6001-6004). On an iPhone the file may never appear.
   - Fix: route it through the ready card's Save button (give deliver() a type parameter), and use a 4 s revoke as a stopgap.

**Phone memory (hunt MEDIUM; all partly confirmed):**
- The autosave thumbnail renders a full project-size canvas (~11 MB at 1080x1920) and never zeroes it. Render at 2x the card size and set width/height to 0 after toDataURL.
- Compositor scratch canvases and pools never shrink (100+ MB with several effects). Add FM.releaseCompositorScratch() and call it after export and on project switch.
- Decoded audio stays on m.audioBuffer after an export. Delete the buffers the export itself decoded, except reversed or audio-reactive clips.
- Reverse and frame-blend caches have per-clip budgets but no global cap (over 1 GB possible). Use a device-aware budget shared across clips in prepareCaches.

**Work-with-friends privacy (hunt HIGH; needs HIS decision on two points):**
- CONFIRMED F1: the owner's private Notes-pad text and reminders (scene.project.notes) sync to EVERY guest, viewers included, and nothing on the Share screens says so.
  - ❓ASK: keep notes on the owner's device only (add 'notes' to DENY in collab-session.js:31, so editors no longer share notes), or keep sharing them and say so on the Share screen? Recommended: owner-only.
- CONFIRMED F2: "Viewer: can only watch" is untrue. Viewers get all the raw media, export is on by default (roExport true), and a viewer can Leave keeping a full copy even with export switched off.
  - ❓ASK: change the words to "can watch, and keep a copy", or make "only watch" true (no copy on Leave when export is off)? Recommended: make it true.
- CONFIRMED F4: anyone holding the link or code learns the owner's internet address by trying to join, even if refused. Recommended: correct the wording at collab-ui.js:1988; changing the behaviour would break one-tap links.
- PARTLY F5: peer-sent images have no pixel limit (GIFs are capped at 64 MP), so a hostile admitted editor could freeze phones. Refuse over ~50 MP in writeRecord (collab-media.js:1191).

### 06 Oct 2026, ~23:50 AWST — (hunt MEDIUM) macOS keychain daemon `secd` burns 60-170% CPU whenever test Chromes run: likely fix `--use-mock-keychain` — PM finding, NOT his words

**Evidence (PM, read-only; nothing changed):**
- `secd` (with `ctkd`) ran at 167% at 17:36 (load 41, the near-crash), at 49% at 23:07 with two test Chromes, and at 166% for 53+ minutes during the v17.24 ship's desktop pass (load 22).
- It tracks test-Chrome activity, not the AIs.
- On macOS every Chrome profile reads its "Chrome Safe Storage" key from the login keychain, and each fresh `--user-data-dir` (the suite makes one per run; the collab tier-3 frames and relaunches add more) goes through secd.

**Likely fix:** add `--use-mock-keychain` to every Mac Chrome launch: tests/_cdp.py's launch flags, tests/_kbdevice.py, tests/_shot.sh and tools/shot.py, via `tests/_platform.py` if it centralises them. It is Chrome's own switch for exactly this test situation and touches nothing the suite measures.

**Before shipping it:** measure secd CPU over one slice run with and without the flag, the same way the mDNS flags were proven. Never during a ship.

**Also seen:** two headless Chromes from about 10 h ago (pids 27887/27888, `--disable-gpu --hide-scrollbars`, profiles `tmp.5Y5UB…`/`tmp.2clbC…`, parents 27132/27133 still alive, ~54 MB, idle). These look like a hung screenshot helper. Clean them up after the ship.

