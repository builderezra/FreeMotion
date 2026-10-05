# Cross-tab writes outside the project document

Snapshot: 28104a3e83e01ac3880db3fac604a7444c7235aa (main snapshot; branch chatgpt/stale-tab-writes).

Method: I read non-project persistent-store write paths for two same-origin tabs or browser plus installed app and searched REQUESTS.md/audits/*.json. I did not run concurrent instances; findings below are code-path analysis, not reproduced. “No revision check” means the cited write path does not compare a store revision before writing; the project-document guard is separate.

## Exclusions already recorded

Project-document stale writes are #306: REQUESTS.md:7986 says “306 — 🚨 AN OLDER VERSION OF HIS PROJECT COMES BACK ON REFRESH”; #939 details are in audits/939-hunt.json and its request entry at REQUESTS.md:33100–33101 says “16 findings, all 16 confirmed by a skeptic and fixed.” I exclude the project document itself. The known Replace-media/undo issue is at REQUESTS.md:32964: “Replacing a clip twice, then undoing twice, does not bring the original back; it is deleted, and redo shows the wrong clip.” I exclude that case.

## Store-by-store results

| Store | Write path and newer-version check | Stale-tab outcome |
|---|---|---|
| Projects index / Home cards | js/storage.js:2365 reads the full fm.projects array; :2403 saveIndex replaces that whole localStorage value. Callers read/modify/write for metadata (touchCurrent :2452–2469, rename :2776) without an index revision/CAS. | **Medium, high confidence, not executed.** Two tabs read the same array; one creates/deletes/renames a card while the other later writes its old array after touching a different card. The later writer erases the earlier card's metadata, rename, ordering, thumbnail pin, or collab badge. Underlying project documents are separate and may survive, leaving Home inconsistent. |
| Media Library index | js/medialib.js:25 names fm.medialib; :33–36 parses and replaces the entire array. Rekey is one read-modify-write path at :47–52. No version check. | **Medium, high confidence, not executed.** Concurrent add/remove/rekey from two tabs can drop the other tab's tile/list change. Usually the library shortcut is lost, not the original project media. The known replacement case is excluded above. |
| Custom-font catalog and files | js/storage.js:3712–3718 imports by appending to localStorage font index after IDB file put; :3724–3726 removes index entry and font:<id>. Embedded-font import appends/writes index at :3742–3758. No catalog revision check. | **Medium, high confidence, not executed.** A stale tab writing its full font array can omit a newer import or restore a removed entry. Explicit stale removal can delete the font blob another tab expects. A face already loaded in memory may continue until reload; afterward text may fall back. |
| Effect/layer presets and tags | js/inspector.js:367–388 uses whole-array fm.fxpresets for save/rename/remove; :561–598 does the same for fm.layerpresets. Tags use whole-object reads/writes at :336–356. No revision check. | **Medium, high confidence, not executed.** Simultaneous save/rename/delete in two tabs is last-whole-array-writer-wins; distinct changes can disappear. Tags may also revert or vanish. Effects already applied in projects are separate project data. |
| Audio-effect and sound-effect favourites | js/audio-fx-browser.js:13 writes a full list; its favourite UI reads/toggles that list around :145–180. js/sfx.js:808–820 reads, modifies and replaces a JSON array; source quote at :817–819: “const a = readFavs(), i = a.indexOf(id); ... writeFavs(a);”. No revision check. | **Low, high confidence, not executed.** Concurrent favourite toggles on different items can erase one another. User loses preference only. |
| Settings and recent lists | Preference writers use individual localStorage keys, e.g. js/app.js:5572 (export preferences), :6496 (timeline height), :8393 (Canvas/settings pair). Recent colors is an array write at js/inspector.js:250; recent audio effects use the whole-list writer above. No revision check on these values. | **Low/medium, high confidence for same key.** Different keys do not overwrite one another; if both tabs change the same key, last setItem wins. Concurrent whole-list changes can drop the other tab's recent item. Not a global settings wipe. |
| Collaboration checkpoints | js/collab-ui.js:890–909 writes collab:ckpt:<pid>:<timestamp>; :898 timestamp is monotonic only in this module instance (“Math.max(Math.round(ckNow()), lastCkTs + 1)”). It independently enumerates/trims old entries at :911–917. No shared revision/CAS. | **Low/medium, UNVERIFIED.** Two tabs checkpointing one project in the same millisecond may generate the same key because lastCkTs is per-tab; one checkpoint could replace the other. Independent trim snapshots may also remove a checkpoint created concurrently. User could lose an “Earlier versions” restore point. Not reproduced. |
| Collaboration transfer scratch records | js/collab-media.js:1453–1465 lists old part-transfer keys then deletes expired ones through collabDel; no record revision comparison. | **UNVERIFIED / low.** A concurrent transfer and garbage collection might race on the same session/fingerprint chunk. I found no confirmed user-project loss from this scratch store and do not rank it as a confirmed finding. |
| Canvas presets | js/storage.js:3762 onward stores canvas presets in localStorage; no per-preset revision protocol was found in the code path. | **Low, plausible.** Concurrent writes to the same preset key are last-writer-wins; unrelated keys remain isolated. No broader overwrite was confirmed. |

For IDB deletion from one tab, idbDel checks only this tab's in-memory holders and shared-lib rule (js/storage.js:334–338); there is no cross-tab lease/version in that helper. I found no additional, confirmed non-replacement user-media deletion scenario to report.

## Summary by data at risk

- Project index: may lose another tab's card/rename/order/collab metadata while the document remains.
- Media library: may lose tile shortcuts or tile pointers; the source media may remain in its project record.
- Fonts: may lose the font catalog entry; its IDB file may become orphaned or be deleted by explicit stale removal.
- Presets, favourites and recent lists: concurrent whole-array/object updates can erase the other tab's change; applied project content remains separate.
- Checkpoints: same-key write or stale trim can remove a recovery point; narrower and unexecuted.
- Other per-key settings: only simultaneous edits to the same key collide.

I found no general storage-event/BroadcastChannel revision protocol on these non-project store write paths; collaboration transport/locks do not add compare-and-swap to these localStorage arrays. This is a repository search/read conclusion, not a browser event test. No source files were changed and no app execution was performed.
