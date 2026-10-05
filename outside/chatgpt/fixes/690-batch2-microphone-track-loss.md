# #1035 Voice recorder microphone loss

Starting commit: `2b8084427ea00ff897a6a664eb7f7824c6c8d658` on isolated `codex/690-batch2-mic-loss`.

The voice recorder now watches its microphone track for `mute` and `ended`. A loss during a take stops capture, releases the mic and explains why the take ended; audio already captured stays available for review. If there is too little or no audio, the panel offers Try again without silently reopening a missing mic. A loss while idle also reports the problem. Watchers detach before intentional stops, and recorder `onstop` handles an automatic stop that arrives before the track event.

Changed files: `js/voice-rec.js`, `index.html` (voice-rec cache 9→10), `tests/tests.js` (one focused `{ item: 'TBD' }` regression for muted/ended takes and an empty interruption), this report.

Checks: focused execution of the production track watchers passed mute, listener-detach and idle-ended cases; changed JavaScript syntax and `git diff --check` passed. The real MediaRecorder browser regression is pending until the shared Claude ship lock is absent; no Chromium ran under the lock.
