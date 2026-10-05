# Deletion and cleanup failure-path audit

Snapshot: 28104a3e83e01ac3880db3fac604a7444c7235aa (main snapshot; branch chatgpt/deleters-fail-closed).

Method: I read persistent deletion/cleanup paths in storage, media-library, collaboration, settings and service-worker code and searched REQUESTS.md plus audits/*.json. I did not execute the app or inject failures. Findings are code-path analysis, not observed runtime outcomes. Existing shared-media rollback/sweep issue excluded: REQUESTS.md:32527 says “915 — #912 audit: Projects, storage, Home, templates/elements — 9 findings”; detail is in audits/915-5-review.json.

## Ranked risks

1. **High — corrupt project document may cause startup pruning of its media.** js/storage.js:18: “function readJSON(key, def) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; } catch (e) { return def; }”. js/storage.js:2944–2949: “const d = readJSON(lk, null); if (d && d.layers) d.layers.forEach(l => keep.add(l.id));”. js/storage.js:2993–2999 deletes candidates absent from that keep-set. If an fm.proj document is malformed or unreadable while layer blobs remain in IDB, then the app boots and pruneOrphans runs, it treats the project as having no layer references and can delete those blobs. The document itself may already fail to open; cleanup further impairs recovery. High confidence in code flow; not executed.

2. **High, UNVERIFIED — checkpoint read error can expose referenced media to pruning.** js/storage.js:175 converts IDB get errors into null: “rq.onerror = () => res(null); ... catch (e) { res(null); }”. js/storage.js:2981–2983 uses the result as “ckptLayerIds(await idbGet(db, k)).forEach(id => ckptKeep.add(id))”; js/storage.js:2996–2998 only protects media IDs found in ckptKeep. A transient IDB read failure for an existing checkpoint thus yields an empty keep contribution; media referenced only by that checkpoint may be collected. A subsequent Earlier versions restore could contain layers with missing clips. Source logic confirmed; failure not injected.

3. **High for templates/elements, medium for fonts — malformed catalog indexes are treated as empty.** js/storage.js:3068–3069, :3411–3412, :3674 read template, element and font catalogs with an empty-array default. pruneOrphans derives ID sets from those lists at :2958–2960, then treats unlisted tpl:/elem:/font: records as candidates at :2985–2987. If an index is corrupt/unreadable at startup, packs/fonts can be removed as unreferenced. No explicit unreadable-index abort exists. Code confirmed, not executed.

4. **Medium — project delete removes its doc/index despite IDB cleanup errors.** js/storage.js:2856–2902 reads project and other docs, enumerates media/checkpoints, deletes eligible IDB keys inside a broad try/catch, then removes fm.proj and filters the index after the catch. If IDB open/key/get/delete fails, localStorage removal still proceeds, so media may be orphaned. A corrupt own/other project doc hides its layer IDs. Later prune may reclaim blobs; same-ID references omitted by failed reads may also be exposed to deletion. User intent is to delete the project; this is about incomplete cascade and collateral references.

5. **Medium — draft deletion drops its doc even if IDB cleanup failed.** js/storage.js:2820–2825 and :2838–2850 catch IDB errors but proceed to remove the draft document/index. Normally this strands blobs; malformed doc prevents ID enumeration and later pruning can reclaim them. Risk is highest if the draft was the only recoverable copy.

6. **Low/medium — Clear current project is safer on an IDB error, but malformed doc leaves orphan media.** js/storage.js:924–934 reads the doc, removes its layer records, then removes the doc. Its outer catch stops the sequence if an awaited IDB call rejects. If parsing produces null instead, the clear may remove the document without enumerating its media; those blobs can later be swept.

7. **Low — failed individual IDB deletion generally preserves bytes but clears the in-memory stored marker.** js/storage.js:334–338: idbDel refuses lib: keys and records held by another in-memory copy, deletes the ID from _stored before requesting IDB deletion, and resolves even on transaction error/throw. A failed delete therefore usually leaves bytes but can make this tab forget they are stored until a later save. Likely orphan/storage growth, not immediate loss.

8. **Low — template/element/font remove is index-first.** Template: js/storage.js:3135–3137; element: :3589–3592; font: :3724–3726. Each writes the filtered index, then catches IDB deletion failure. A failed IDB delete leaves an unlisted blob. A malformed index read as [] followed by an ordinary mutation can replace the catalog with an empty/partial list, after which startup pruning may delete its records.

9. **Low — media-library removal/clear changes the index; shared file deletion is guarded in this snapshot.** Index parse/write is js/medialib.js:33–36; removal/clear operations are :150–200. js/storage.js:334–338 refuses shared lib: records, so ordinary tile removal tends to lose the shortcut rather than shared clip bytes. The audited rollback-specific hazard is excluded above.

10. **Low — collab/test/cache/preference cleanup.** Room/pending-join removals swallow localStorage errors (js/collab-ui.js:320, :4940, :5435), leaving stale metadata. Checkpoint retention trims old entries after successful enumeration (js/collab-ui.js:890–920); part-file GC returns on key-list failure (js/collab-media.js:1453–1465). Test-mode URL fmwipe=1 calls localStorage.clear() (js/collab-core.js:453–458); this would clear all origin localStorage if reached, but production reachability was not executed. sw.js:45–48 and :86–89 delete obsolete app caches, not project records. AI-key forget and last-error clear target only their own keys (js/ai-key.js:28–34; js/settings.js:890–893).

## Read-error posture

Safe/mostly safe: js/storage.js:339 resolves failed IDB getAllKeys to []; the startup sweep then has no candidates. js/collab-media.js:1453–1455 returns on failed key enumeration. clear() catches an IDB failure before removing the current doc.

Fail-open: js/storage.js:18 conflates missing, malformed and inaccessible localStorage; pruneOrphans interprets absent layer/catalog references as empty. js/storage.js:175 similarly turns checkpoint get errors into null, without aborting the sweep.

Incomplete cleanup: project/draft/library/font/template delete paths commonly catch IDB deletion errors and still remove localStorage references. That usually leaves orphan data, but a later sweep can make it permanent when the remaining references cannot be read.

No errors were injected and no user data was changed. These are conditional findings from source inspection.
