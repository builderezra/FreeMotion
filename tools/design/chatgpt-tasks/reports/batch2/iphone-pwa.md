# FreeMotion iPhone Safari and installed-PWA review

Reviewed the committed source snapshot on branch `chatgpt/iphone-pwa` (base `28104a3e83e01ac3880db3fac604a7444c7235aa`). I checked `audits/*.json` and searched `REQUESTS.md` before assessing findings. This is a code review; I did not have a physical iPhone/iOS simulator, so runtime claims about a specific device are marked **UNVERIFIED**.

## Finding disposition

I found **no new, code-confirmed iPhone-specific defect** that could be reported without repeating an item already in the audit/queue. Several material risks are already recorded there; I verified their current code paths and list them below so this review still answers each requested area. iPhone-only outcomes remain **UNVERIFIED** unless the app code itself establishes the behavior.

### Canvas and multi-video memory — previously recorded, not repeated

WebKit has no stable published canvas-pixel ceiling or universal concurrent video-decoder count; behavior depends on device and source format. The app makes one `<video>` element per loaded file and sets `preload = 'auto'` (`js/media.js:124-134`). It clamps imported dimensions at 7,680 px per side (`js/storage.js:1000-1008`), and MP4 export creates a project canvas and output canvas (`js/exporter.js:1235-1245`). A 7,680×7,680 RGBA surface is about 225 MiB, before other compositor and decoder buffers. These are plausible memory-pressure inputs, not proof of a device failure.

The broader project-size OOM risk is already covered by `REQUESTS.md` #470 (the 16,000px brick case and clamp fix), and the iPhone multi-decode risk is in `audits/923-brainstorm.json`. I therefore do not count the accepted-size/device-threshold question as a new finding. **UNVERIFIED:** which allowed project dimensions or clip count, if any, exhaust the owner's exact iPhone's memory/decoder budget.

**iPhone check:** Import/open a 4K clip, then a project with several 4K clips; scrub and play across each layer, then run an MP4 export. Record model, iOS version, clip codecs/resolutions, number of retained video layers, dropped frames, whether canvas blanks/reloads, and export outcome. Separately open a 7,680×7,680 project if one can be created. Do not infer a general decoder limit from one clip.

## Reviewed areas and current app status

### AudioContext gesture and returning from background — no new defect confirmed

WebKit has documented that iOS can suspend an `AudioContext` when its page is backgrounded ([WebKit bug 237878](https://bugs.webkit.org/show_bug.cgi?id=237878)). FreeMotion pauses playback when the page becomes hidden or receives `pagehide` (`js/app.js:2699-2700`, “if ... `FM.playing` ... `FM.pause()`”). Starting playback again is a direct user action (`js/app.js:2533-2534`); it calls `FM.audioFxLive.resume()`, and `js/audio-fx.js:14-18` resumes a suspended shared context. That is the expected mitigation, so I found no separate confirmed audio-resume bug in this pass.

**iPhone check:** Start playback with an audio effect, switch to another app for 30 seconds, return, and tap Play. Confirm playback restarts at the saved position with audio; repeat once with the phone locked. **UNVERIFIED:** WebKit's exact interruption/reattachment behavior and audio-session routing on the owner's iOS build.

### Video decode and MediaRecorder/WebCodecs — runtime probes exist; load ceiling remains device-specific

Each loaded video file gets an HTML `<video>` element with `preload = 'auto'` (`js/media.js:124-134`). A project with many video layers can therefore retain many media elements; WebKit does not publish a stable device-independent simultaneous-decoder count, and the app does not impose an iPhone-specific layer/decode cap. This overlaps the already-recorded iPhone multi-decode risk in `audits/923-brainstorm.json`, so it is not repeated as a new finding here. **UNVERIFIED:** what number of 4K/HDR clips actually causes dropped frames or memory pressure on the owner's device. See the device procedure above.

For export, FreeMotion uses **WebCodecs**, not `MediaRecorder`: `js/exporter.js:1165-1169` requires `VideoEncoder` and the MP4 muxer; `js/exporter.js:973-991` probes H.264 configurations. WebKit says Safari 16.4 added WebCodecs video support ([Safari 16.4 notes](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)); Safari 26.0 added WebCodecs `AudioEncoder`/`AudioDecoder` ([Safari 26.0 notes](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)). The app probes AAC support before declaring an MP4 audio track (`js/app.js:5746-5753`, `js/exporter.js:1286-1313`) and announces when it must drop audio. The pre-iOS-26 AAC gap and its silent-export behavior are already covered by `REQUESTS.md` #215/#604/#677, so I did not duplicate them. `MediaRecorder` is present for voice recording (`js/voice-rec.js:135`, `js/voice-rec.js:616-622`), not as an export fallback.

**iPhone check:** On the installed app, inspect `typeof VideoEncoder`, `typeof AudioEncoder`, and `AudioEncoder.isConfigSupported({codec:'mp4a.40.2', sampleRate:48000, numberOfChannels:2, bitrate:160000})`; then export a short clip with a known 1 kHz audio tone and listen in Photos. Repeat in Safari and the installed app after force-quitting/reopening. **UNVERIFIED:** actual support and encode success on the owner's specific iOS 26 device/build.

### Storage persistence and eviction — persistence is requested; grant is deliberately silent

WebKit states that best-effort origin storage can be evicted under storage pressure and that persistent storage avoids automatic eviction; its current policy applies to IndexedDB, Cache API, and related origin storage ([WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/)). FreeMotion does request persistence (`js/storage.js:326-333`): it checks `persisted()` and calls `persist()` if needed. It neither awaits nor records the result, and catches rejection silently. Thus the code makes the request but cannot tell the user whether persistent mode was granted. The broader eviction/cache-growth risk is already recorded in `audits/923-brainstorm.json` and `REQUESTS.md` #430, so this is status/context rather than a new finding.

**iPhone check:** With Safari Web Inspector connected, evaluate `await navigator.storage.persisted()` and `await navigator.storage.estimate()` after launch; compare before and after importing several large clips. Then repeat after clearing space / on a low-storage test device if available. There is no safe deterministic browser-only procedure to force iOS origin eviction. **UNVERIFIED:** whether persistence is granted on this installation and what OS storage-pressure policy the phone applies.

### Closing, reloading, and a phone being locked mid-save/export

The app's export code warns before unload while a render is active (`js/exporter.js:40-45`). The visibility/pagehide handlers pause playback, but cannot keep an iOS process alive (`js/app.js:2699-2700`). Export output is delivered only after rendering completes; crash-resume state is an app feature, but it cannot make iOS guarantee uninterrupted background execution. This limitation is already explicitly recorded in `REQUESTS.md` #47 and #942/#943, including the installed-app auto-lock risk and the shipped wake-lock mitigation. I found no new distinct finding to add.

**iPhone check:** Start an export long enough to exceed the auto-lock interval, leave the screen untouched, and observe whether the screen remains awake and whether the export completes. Separately, force-quit during a normal save, relaunch, and verify the last edit. **UNVERIFIED:** OS kill timing and wake-lock behavior on the owner's iOS version.

### Standalone mode, safe areas, back-swipe, and links

The app opts into standalone display in `manifest.json:5-8` and iOS Home Screen mode in `index.html:51-60`; `index.html:24` sets `viewport-fit=cover`. CSS consumes safe-area insets in the main bars and phone layouts (for example `styles.css:820-828`, `styles.css:5017`). `apple-mobile-web-app-status-bar-style` is `default` (`index.html:59`), and its comments record the iOS 26 status-bar behavior and reinstall requirement. Apple's archived configuration guide confirms that the standalone meta tag launches without Safari's URL and bottom bars ([Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)). These are intentional accommodations; no safe-area defect is confirmed by source inspection alone.

The application does not install a `popstate` handler or add route states to browser history (search of `index.html` and `js/*.js`); I cannot confirm from desktop whether an iPhone edge-swipe leaves the standalone app, navigates to Safari, or is consumed as a system gesture. **UNVERIFIED; not reported as a confirmed defect.**

**iPhone check:** Open the installed app from its Home Screen on a notched iPhone. Check the top status bar, bottom home-indicator clearance, both orientations if supported, then try a short edge-swipe from each side while editing and while a modal is open. Tap each external link and verify it opens the expected destination and that returning restores the same project.

### Share sheet and file selection

The MP4 is shared from the explicit Save-button flow (`js/exporter.js:55-75`); the code uses `navigator.canShare({files})`, calls `navigator.share()` and falls back to a download if sharing is unavailable or disallowed. The share call is deliberately made from a fresh user tap, consistent with WebKit's transient-user-activation requirement ([WebKit User Activation API](https://webkit.org/blog/13862/the-user-activation-api/)). Safari supports file sharing via Web Share Level 2 ([WebKit Safari 15 notes](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/)). The app's user-facing export-ready flow and dismissal handling are already recorded in `REQUESTS.md` #17.00; no new issue is reported.

**iPhone check:** Export a short MP4, tap Save, choose Save to Photos/Files, and verify the resulting filename, duration, and playback. Repeat and dismiss the share sheet, then confirm the export-ready card still allows another save. Import a video from Photos and from Files to exercise both iOS pickers. **UNVERIFIED:** sheet destinations and cancellation outcomes can vary by iOS version and installed apps.

### Service-worker update lifecycle — prior issue is covered; current flow actively checks

`index.html:1169-1184` registers the worker at load, calls `reg.update()`, and reloads once on `controllerchange` except on first install or during active collaboration. `sw.js:38-49` calls `skipWaiting()` and `clients.claim()`; navigation fetch is network-first with a cached offline fallback (`sw.js:130-175`). Stale-shell reporting and the earlier stale-version / cache-growth concerns are already in `REQUESTS.md` #306 and #430. This pass found no distinct new stuck-update finding.

**iPhone check:** Install from Safari, launch once online, deploy a version with a bumped asset `?v=`, then relaunch online and confirm the version changes without a manual cache clear. Repeat offline to confirm the app opens from its cached shell and indicates that it is stale. **UNVERIFIED:** update timing and background worker lifecycle on the physical phone.

## Sources

- [WebKit: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
- [WebKit: Safari 26.0 features](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- [WebKit: Safari 16.4 features](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)
- [WebKit: Safari 15 features (Web Share files)](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/)
- [WebKit: User Activation API](https://webkit.org/blog/13862/the-user-activation-api/)
- [WebKit bug 237878: iOS AudioContext background suspension](https://bugs.webkit.org/show_bug.cgi?id=237878)
- [Apple: Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
