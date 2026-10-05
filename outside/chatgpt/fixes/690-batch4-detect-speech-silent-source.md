# Batch 4: Detect speech continues past silent clips

Starting commit: `2b5a443188324fb8ae9eb2fb76fe89578169745a` (`codex/690-batch3-recent-colors`).

Detect speech previously stopped with a generic failure when the first video had no sound, even if a later clip had speech. It now skips known-silent clips, continues after a failed decode, keeps a valid no-speech result if a later candidate fails, and names a chosen silent clip in the feedback.

Changed files: `js/captions.js`, `index.html` (captions cache 62), `tests/tests.js` (one `TBD` regression covering default, project and chosen-clip scopes).

Checks: focused production-handler Node check passed silent-first fallback, a later failed decode after a valid no-speech result, and an explicitly chosen silent source. Changed-JS syntax and `git diff --check` passed. The focused muted Chromium regression subsequently passed (1/1) after its fixture called the editor control on `FM.captionsEditor`.
