# Empty AAC export track (batch2 VERIFIED §1a)

- **Starting commit:** `78f05bb021fd60a5b51ccedfc9bc092f60867540` on clean `codex/690-reviewed-local`; implemented in isolated `codex/690-batch2-audio-empty`.
- **Source checked:** `tools/design/chatgpt-tasks/reports/batch2/VERIFIED.md` §1a and the exact #215, #604, #677 records in `REQUESTS.md`. The searched `audits/*.json` audio records concern different silent-track findings; no matching zero-chunk encoder finding was found there.
- **Change:** `js/exporter.js` treats a successful AAC flush with zero chunks as `no-chunks` before muxer construction, tells the user the export has no sound, and only reports `Sound ✓` when chunks were fed to the muxer. The export report now gives the actual AAC frame count, encoded bytes and duration. `js/app.js` names the new ready-card reason. `index.html` bumps both script cache tags. `tests/tests.js` adds one `TBD` regression that runs a real audible control, then a supported encoder that emits no chunks and checks MP4 tracks, report and actual ready card.
- **Checks:** The new browser regression failed before the fix because the zero-chunk MP4 still contained `soun` and `mp4a`; it passed after the fix. The existing no-AAC browser path passed as an adjacent check. Node syntax checks for the three changed scripts and `git diff --check` passed.
- **Limit:** A desktop pass proves the guard and the new report, not whether Safari 26 emits zero chunks on Ezra's phone. The report's AAC count will make the next phone export diagnostic.

No shared Claude checkout, protected queue/log file, `tools/` file, push, PR, deployment or release was changed.
