# Batch-3 corrections (PM check, 7 Oct ~12:20, read-only, against v17.24 = 05d06c53)

All nine reports were judged FIX: useful, with specific corrections. Apply each list to its own report on its own branch,
re-read each corrected claim as a skeptic, push, and add one DONE line `QF4-<ID>`. main is now v17.24 (05d06c53); app code
is identical to v17.23, but tests/tests.js line numbers moved by ~+170..+330 — cite test TITLES, not tests.js lines.

## H16 (branch hunt/chatgpt-chain-review)
- #1013 'Run on the laptop (it has H.264 and AAC)' is wrong. Linux Chrome has no AAC encoder (tests/tests.js:193-205), so this run must be on the Mac.
- #1013: add a finding that the test must start with `await needsAac();` (v17.24 convention). Without it, it is red on Linux instead of NOT RUN HERE.
- #1013 skeptic finding 1: change 'would hang the export after the video has rendered' to 'would hang the export at the audio stage, before the muxer and any video frame, and Cancel is not checked until after it' (branch exporter.js:1401-1437).
- #1013 skeptic finding 1: drop 'only a hang is not'. encodeAudio's own `await enc.flush()` (exporter.js:991) was already uncapped, so the new code adds a second uncapped wait rather than introducing the risk.
- #1013 exact fix: add 'clear the timer once flush settles; 8 s may cut a very long soundtrack's decode on a slow phone, which only prints unavailable'.
- Summary bullet: replace 'release/v17.24' with 'main at v17.24 (05d06c53)'. Add that the #1013 release must ship from the Mac (tools/ship.sh:974-990 feature gate on js/exporter.js).
- Add: none of the 7 commits bump index.html ?v= cache-busters for the 7 changed js files and styles.css, so the builder must bump them.
- 'Why #1015 and #1016 never passed' bullet: change 'it is not the tests and not the fixes' to 'my runs show the tests and fixes behave correctly here'. Note that ChatGPT's 1013 note shows the same port-8894 setup also produced an incomplete bootstrap, so it was intermittent.

## H12 (branch hunt/1085-vmdata)
- Replace '1080x1920 kernel plates (:82443, :82649, :83769)' with the real sizes: :82443 uses 200x260 fixtures; :82649 uses 420x320 plus one 1080x1920 array; :83769 uses a 640x520 comp.
- Add :83717 ('692: every crop-admitted kernel draws the same picture cropped…') as the actual 1080x1920 sweep: 30 or more kernels x mk(450,900,180,150,1080,1920).
- Row 4 'what it allocates': change 'on 1080x1920 plates' to 'on a 640x520 comp, 2 shots x 5 positions x 2 param sets per member, each with a full getImageData'.
- Staircase row +392: the window ':80547 to :83259' does not contain :83769; either widen the window or drop :83769 from that row.
- Headline: change '3411 of the 5210 MB of growth' to '3411 of the 4956 MB growth of the post-GC floor (826 to 5782)'; 5210 is peak minus start and does not compare like for like.
- Move 'the biggest is a threshold a warm process crosses' and 'rows with cold 0 are triggers, not causes' out of the Verified sections and label them Guess; one cold run does not separate a trigger from a heavy churner.
- Scope the WebGL line: 'not a VmData driver under headless software GL with --no-sandbox; untested on a GPU'.
- Add a section on the Mac's #1095 suspect, the queue 333 effects-browser sweep (v17.23 :63595): say whether it passed in pass F, give VmData across it, and note the canvas micro-test dropped canvases rather than keeping them referenced, so it cannot speak to 'detached but retained'.
- Option 1: note that a seam at :47436 moves the queue 333 sweep into the second Chrome, and that its own comment says it runs for minutes on a cold thumbnail cache (budget 420 s).

## H11 (branch hunt/suite-speed)
- 921 S3 row: replace 'Run the 40 pairings in 5 batches of 8 with Promise.all; :32491-32500 unchanged' with 'Only if each pairing checks its channels and sends on bulk in its own continuation the moment its opened resolves; checking after Promise.all lets late pairs finish opening and hides the race. Prove with a mutation that makes opened resolve on ctl alone.'
- Row 1 and the savings table: replace 'about 49 s on a Mac' with 'over 240 s in the Mac phone pass (tests.js:63928-63931: failed every phone pass at a 240 s budget on 21 Sep; 261-279 s alone at 380px)', and recompute the Mac column, which comes out above 8%.
- Row 1: note that js/fx-thumbs.js already has a suite seam (`_sliceMs`, :1174/:1818) and that a new seam is an app-code change that needs a ?v= bump.
- Parallel-pass section: add tools/ship.sh:161-164 (two headless suites at once flaked test 699 and cost a ship; spotcheck and ship refuse to overlap) as the main risk, ahead of the CPU-throttle test.
- Parallel-pass section: list the ship.sh work it needs: one ship_phase value holding both passes, cancelling the other pass on red or timeout (today the phone pass never starts after a red desktop pass), not recording a contended pass via suite_seconds_record (ship.sh:921), and staggered starts because of the _cdp.py start-up reaper (:371-407).
- Parallel-pass section: replace 'a Mac with less memory' with 'the 7.7 GB WSL laptop, which now ships (tools/.suite-seconds DESKTOP-HC64AE0); temp profiles there are on tmpfs, i.e. RAM (_cdp.py:401-402); VmData is reserved address space, so measure peak RSS and swap in a trial run before trusting two at once'.
- Refresh tests.js line numbers against v17.24 (about +300 drift): 'every tile' :63922, 921 S3 :32657, 967 1 :101723 with the sleep at :101748, slowest list :59908/:59951; fx-thumbs software-GL comment is at :1070-1072.

## H9 (branch hunt/simple-mode-review)
- Baseline line: main is now v17.24 (05d06c53). The app code is the same as v17.23 b46b47d3 apart from the version label. Say the review was done against v17.23.
- Branch table, 980-phase2 row: replace '88 more lines in spine-edit.js' with '88 changed lines in spine-edit.js (+64/-24)'.
- Finding 1: add that the 921 S1 gate (tests/tests.js:30288-30291) only compares SCHEMA_FP. Re-pasting the fingerprint while leaving SCHEMA_REV at 8 passes, and join compatibility (collab-signal.js:1559-1560) reads only PROTO and SCHEMA_REV. Merge day must bump the rev past main's, not just re-pin the fingerprint.
- Finding 1: note the stale '(SCHEMA_REV 7)' comments at branch js/collab-core.js:172 and :176.
- Finding 2: add that the phone/PC media 'change' listener (simple-tools.js:83) also calls place() in Full after the first Simple visit.
- 380 px section: change 'no tap target under 44 px' to 'no tray or project tool under 44 px in the resting state'. Add: not measured with the Length row open (.sm-len-v is 72x36, styles.css:11804) or with a black band showing (.sm-band can be 40 px wide, simple-timeline.js:301).
- fu-lock-r5 section: replace 'safe to merge on its own' with: touches no app file, but its +39-line ship.sh hunk is against v17.23. v17.24 changed tools/ship.sh by +300/-76, so it needs a manual merge.

## H15 (branch plans/collab-privacy)
- Line 14: replace 'So F2 is a one-word fix, not a new screen' with: the two strings are honest about export only; a Viewer still receives every clip and keeps a full copy on Leave (collab-ui.js:3189-3224) or Home 'Keep as my own copy' (home.js:1401-1407), whatever roExport says (#1091).
- Line 14: note that :3121 is in the guest's own panel, which the owner choosing the role never sees.
- F2 Option A: 'can watch and play it' is not true while roExport defaults on; use wording that names export and the kept copy, and note that collab-ui.js:1043 already says 'you can watch and play it'.
- F2 Option B: add that roExport is enforced only by exportGate (collab-media.js:1295-1299), which returns early when there is no active session (:1291-1292), and that Leave and Keep-as-my-own-copy ignore it, so B does not make 'only watch' true.
- Add an F2 Option C (the PM's pick): for a Viewer or Commenter with roExport false, Leave and Home 'Keep as my own copy' offer delete only (no detachLinked); list collab-ui.js:3211-3224, home.js:1401-1407 and collab-session.js:1984 as the places to change, plus a test that a Viewer leaving with export off keeps no project card.
- Update the decision table and 'my pick' for F2 to match #1091 and the PM's recommendation (notes owner-only; make 'only watch' true).
- F5 step 2: replace 'set ctl.refused[e.fid] = 1, make planWants skip refused files' with 'set ctl.bad[e.fid] = 1 (planWants already skips bad, collab-media.js:627; same pattern as the font cap at :630)'.
- F5: change 'refused before anything is stored' to 'before it is saved as media or decoded'; the received parts already sit in collab: records until dropParts.
- F5: the GIF 64e6 check is at js/media.js:726, not :725; writeRecord spans :1191-1211.

## P7 (branch plans/helper-7)
- #996 step 1: replace 'FM.scene.layers.splice(FM.scene.layers.indexOf(L), 1)' with 'FM.scene.layers = FM.scene.layers.filter(x => x && x.id !== L.id)'. history.restore swaps in a parsed snapshot (js/history.js:80), so indexOf(L) is -1 after redo and splice(-1,1) deletes the last layer.
- #996: tests.js line numbers changed in v17.24. The undo/redo test is now :13662, the notes test :42709, the home + test :42739, the 869 backup test :85362, q915aCleanup :1152-1163, and the sceneLeaks note is near :59888. Cite test titles, not lines.
- #1000 step 2: replace 'compute _stale before it' with: move notePending(jobs) to just after writeScene() (same synchronous tick) and skip it when _writeFail === 'stale'. _stale is only set inside writeScene, so it is still false on the first stale save.
- #1001 step 1: always reopen the previous project, using FM.projects.open(prev || null, { confirmed: true }) as restoreBackup does at storage.js:1958, rather than only 'when prev exists'. Also note that restoreBackup (:1951) currently leaves one empty card per failed entry, and the fix covers that too.
- #1002 Reproduced paragraph: '_sanitizeLayers ... which is the every-open load path' is wrong. _sanitizeLayers is sanitizeImportedLayers (storage.js:1655: import, history restore, collab-bridge). The every-open load is storage.js:903, which calls sanitizeUnsafeValues directly.
- #1002 Where: the host applies the op at collab-host.js:666 (not :661, which is a comment). invariantFix is :685-693, with inv.layer at :691.

## P8 (branch plans/helper-8)
- #1004 Build step 1 and its Test: rename the kept copy from fm.proj.<id>.unreadable to a key outside the fm.proj. prefix (e.g. fm.unreadable.<id>). Add: projects.remove(id) deletes it, and the #1005 unsafe check ignores it. State that the fm.proj. name came from VERIFIED.md §1.5 and is wrong for this reason (storage.js:2937, :2876, medialib.js:393, collab-media.js:145/245).
- #1004 Build step 2: move the refusal to the start of open(), before any teardown (after the vanished-card check at storage.js:2494-2497): parse fm.proj.<id>, and if non-empty text has no .project, toast and return false. Say why: home.js:2311/2457 and storage.js:3228/3468 treat false as 'nothing was torn down', and after :2524-2535 that is no longer true.
- #1004 Where: add that the boot path is exposed too (app.js:6847-6861: load() returns false, Home opens, the tab is still bound and a pagehide flush overwrites it), and that the unbind in load() is the half that covers it.
- #1004 Risk: change 'low; it only changes a case that is already broken' to note the open() return-value contract above.
- #1005 Build step 1: loosen the test to 'non-empty text that does not parse, or has no .project'. load() accepts a doc with .project and no layers (storage.js:881, :892), so requiring a layers array could stall the sweep on a valid doc.
- #1007 Build: add settings.js:734 (Restore from a backup), which does the same JSON.parse(await file.text()) and handles the biggest files (backups embed up to 96 MB each, storage.js:1835). Put the size question in one shared helper used by both pickers.
- #1007 Where: note that VERIFIED.md's :2041 is stale; the read is at storage.js:2022.
- #1008 Where: say the scan runs once per group that passes groupNeedsUnit (compositor.js:18358) and again per nested group through the recursive walk (:18369). Mark the #1041 childOwner/innerOf conflict as unverified on this tree: there is no childOwner here, and innerOf is at :18402.
- Which five: add that all five entries say 'land it, don't rebuild it' (REQUESTS.md:34858 etc.), so the plans are review checklists for ChatGPT's commits, and the corrections above are what to check those commits against.

## H20 (branch plans/import-caps)
- Section 1, 'Put each cap in the sanitiser once ... every open': wrong. An ordinary open runs only sanitizeMasks/sanitizeEffects/sanitizeUnsafeValues (js/storage.js:903, :1779). sanitizeImportedLayers runs on import, templates/elements, collab and every undo (js/history.js:71). Rewrite it to say caps go at the import door, not in the shared sanitiser.
- Section 2 keyframes/points rows: add that a cap placed in sanitizeImportedLayers would cut existing projects on the first undo (queue 680 shape, js/storage.js:1576-1580). Move the caps to applyScene/importObject, the template/element insert and the collab host.
- Section 2 keyframes row: 'well above what audioReact.bake writes' is a guess. Bake keeps keys with RDP at 2% over an envelope sampled at project fps (js/audio-react.js:100, :372-378) and nothing bounds the count. Mark it Guess and add a measurement on a long track.
- Section 3 item 4: delete 'The sanitisers whitelist known keys'. Layers have no key whitelist and unknown layer fields already survive. smKeepUnknown on 980-p22-trayb2 is used only for `sm` sub-keys (storage.js:1576-1622). Using its 200-character/2 KB limits on layers would DROP fields that survive today. Point to sanitizeProjectFields' marker handling (js/storage.js:1037-1049) as the existing model.
- Section 5 'shape unknown field' test: it passes on v17.23 (it cannot fail first), and the part that drops a 3 KB value drops a plain field. Replace it with a test that unknown layer fields survive import, a reopen and an undo.
- Fix 0 snippet: `c.__fmRS = s; c.__fmOX = 0; c.__fmOY = 0;` does nothing, because renderScene overwrites these from canvas.width / P.width when __fmCrop is not set (js/compositor.js:18745-18748). Say so or remove it.
- Fix 0 parity table: the scenes had no photo, video or text. Add a case with a 4K photo, a video frame and small text before claiming 'visually the same'. The halving loop exists for exactly that ('mushy cards', js/storage.js:2130-2132).
- Section 1: SCHEMA_REV is at js/collab-core.js:44, not :48.
- Section 2 backup row: onProgress is called at js/storage.js:1947. :1941 is the confirmLeave refusal message.

## R3 (branch research/effect-specs)
- Touch point 6: SCHEMA_REV is at js/collab-core.js:44, not :48.
- Touch-point table: add moverSource (js/compositor.js:12381-12392) as required for any kernel that moves, rotates or scales the layer.
- Touch-point table: add search words through a def.tags array or SEARCH_ALIASES (js/fx-registry.js:545, :576), for example 'transition', 'intro', 'outro'.
- Touch-point table: add the default-visibility gate tests/tests.js:75286 ('482: every effect does something visible at its own defaults').
- Shared transition helper: replace layer.start/layer.duration with (layer._clipStart ?? layer.start) and (layer._clipDuration ?? layer.duration), citing compositor.js:18519-18521 and :7633, and say what a split half does (splitOf lineage, :7635).
- T1/T2/T5 kernels: draw from moverSource(A, W, H, ps, expand, layer, t, scene, [matrix]) instead of A, as spin (:14190) and swing (:14172) do.
- T3: flashdark is a repeating strobe (Speed in Hz, compositor.js:681), not a one-shot darken; do not call Flash (white) its twin.
- T4: note the existing Glitch (compositor.js:304-318, same Slices default of 14, an RGB tear, Re-roll) and propose Glitch cut as an EFFECT_PRESETS entry on 'glitch' unless an in/out mode is truly needed.
- T4: pHash is a closure inside the particles kernel (:14343), not a shared helper; say it must be hoisted.
- T5: the label 'Spin' collides with the existing Spin effect (compositor.js:1127); use 'Spin in/out'.
- T1/T2/T5: mention that text layers already have Fade in, Slide in, Spin in and Zoom in from big as Animate presets (js/inspector.js:5738-5739), so the gap is non-text layers.
- T6: radialwipe is an angular clock wipe with no maxR; use hypot(cx, cy) or wR (js/compositor.js:9162).
- T7: a no-op default fails tests/tests.js:75286; give it a visible default look. Also compare it with layer.colorGrade (the colour wheel plus lift/gamma/gain, js/inspector.js:6483-6492) and colorbalance's Affects ranges (compositor.js:613).
- T8: pHash(i*4+3) already sets the rotation phase (compositor.js:14423); use a separate hash stream for colour.
- T8: appending heart as option 5 also requires widening Math.round(rd('shape', 0, 0, 4)) at compositor.js:14359 to 5.
- T8: add 'bump SCHEMA_REV and re-pin SCHEMA_FP' to its tests, and note that the fingerprint does not hash the options list (collab-core.js:226-228).
- Test line references have drifted: warp scale test is tests.js:25845, the SCHEMA_FP gate is near :30460, and the category-icon test is :48104.
