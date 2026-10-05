# ChatGPT prompts, batch 2 (1 Oct): read-only reports, none of them clash

Run each as its own ChatGPT task. They can all run at once. Paste the finished file path(s) into the Claude LOGGING chat, which verifies every finding before anything reaches the builder.

## 7. Accessibility check

```
You're helping on FreeMotion, a video and motion editor web app. The repo is public at https://github.com/builderezra/FreeMotion and the live app is at https://builderezra.github.io/FreeMotion/. It is vanilla HTML/CSS/JS: no framework, no build step, a global `FM` object, everything stored locally (localStorage and IndexedDB), working on phones (700px wide or less) and PCs.

RULES. Two other AI sessions change this code every hour, so you must not clash with them:
- Work ONLY in your own separate clone (for example /private/tmp/freemotion-accessibility), exactly as you did for the last batch. Never touch any other copy of the project.
- Do NOT edit, refactor, format or fix ANY existing file. Do NOT push anything. Do NOT open a pull request.
- Your only output is ONE new report file, on a local branch named chatgpt/accessibility, at outside/chatgpt/accessibility.md. Tell me the path when you're done.
- Don't fix anything. Describe each problem so someone else can fix it.
- Every finding must cite the file and line and quote the code. Give the steps to trigger it, a severity (critical/high/medium/low) and your confidence. Mark anything you could not confirm as UNVERIFIED. Do not guess.
- First search audits/*.json and REQUESTS.md for the file or feature, and skip anything already recorded there.

TASK: an accessibility review of the whole app, on phone and PC. Check:
- keyboard use: can every control be reached and used, is the focus order sensible, is focus visible, does Escape close things?
- screen-reader labels: icon-only buttons with no name, custom controls (sliders, switches, the timeline) without roles or values, live updates that are never announced;
- colour contrast of text and icons, in the dark editor, the light Home and the glass theme (compute the ratios);
- touch targets under 44x44 CSS px on the phone layout;
- prefers-reduced-motion: are animations respected?
- text that can't be resized, or that clips at large sizes.
End with the top 15 by how many people they affect.
```

## 8. iPhone and installed-app check

```
You're helping on FreeMotion, a video and motion editor web app. The repo is public at https://github.com/builderezra/FreeMotion and the live app is at https://builderezra.github.io/FreeMotion/. It is vanilla HTML/CSS/JS: no framework, no build step, a global `FM` object, everything stored locally (localStorage and IndexedDB), working on phones (700px wide or less) and PCs.

RULES. Two other AI sessions change this code every hour, so you must not clash with them:
- Work ONLY in your own separate clone (for example /private/tmp/freemotion-iphone-pwa), exactly as you did for the last batch. Never touch any other copy of the project.
- Do NOT edit, refactor, format or fix ANY existing file. Do NOT push anything. Do NOT open a pull request.
- Your only output is ONE new report file, on a local branch named chatgpt/iphone-pwa, at outside/chatgpt/iphone-pwa.md. Tell me the path when you're done.
- Don't fix anything. Describe each problem so someone else can fix it.
- Every finding must cite the file and line and quote the code. Give the steps to trigger it, a severity (critical/high/medium/low) and your confidence. Mark anything you could not confirm as UNVERIFIED. Do not guess.
- First search audits/*.json and REQUESTS.md for the file or feature, and skip anything already recorded there.

TASK: the owner uses it as an installed app on an iPhone. Review the code for known iOS Safari / WebKit and installed-PWA pitfalls, and say where this app is exposed:
- the AudioContext needing a user gesture or a resume after the app is backgrounded;
- audio cutting out;
- video decoding limits and memory: the maximum canvas size on iOS, the number of video elements;
- IndexedDB and localStorage eviction, and whether navigator.storage.persist() is requested;
- what happens when the app is killed mid-save;
- standalone-mode quirks: the status bar, safe areas, back-swipe, links;
- MediaRecorder and WebCodecs support for export on iOS 26;
- the share sheet and file pickers;
- service worker update behaviour (stuck on an old version).
For each: the WebKit or iOS fact with a source link, where the app is exposed (file and line), the risk, and how to confirm it on a real iPhone.
```

## 9. Why exports lose their sound (research)

```
You're helping on FreeMotion, a video and motion editor web app. The repo is public at https://github.com/builderezra/FreeMotion and the live app is at https://builderezra.github.io/FreeMotion/. It is vanilla HTML/CSS/JS: no framework, no build step, a global `FM` object, everything stored locally (localStorage and IndexedDB), working on phones (700px wide or less) and PCs.

RULES. Two other AI sessions change this code every hour, so you must not clash with them:
- Work ONLY in your own separate clone (for example /private/tmp/freemotion-export-audio), exactly as you did for the last batch. Never touch any other copy of the project.
- Do NOT edit, refactor, format or fix ANY existing file. Do NOT push anything. Do NOT open a pull request.
- Your only output is ONE new report file, on a local branch named chatgpt/export-audio, at outside/chatgpt/export-audio.md. Tell me the path when you're done.
- Don't fix anything. Describe each problem so someone else can fix it.
- Every finding must cite the file and line and quote the code. Give the steps to trigger it, a severity (critical/high/medium/low) and your confidence. Mark anything you could not confirm as UNVERIFIED. Do not guess.
- First search audits/*.json and REQUESTS.md for the file or feature, and skip anything already recorded there.

TASK: research and code reading. The owner has repeatedly found exported videos with NO SOUND on his iPhone and sometimes on PC (search REQUESTS.md for #215, #604, #677; read them first; they record what has been tried and measured). Read the export path (js/exporter.js and anything it calls: MediaRecorder, WebCodecs, the muxer, the audio mixing) end to end. Then:
- list every place the audio track can be lost, muted, made zero-length, or written in a way Photos/QuickTime won't play (codec, sample rate, channel count, timestamps, an edit list, an 'mp4a' vs 'Opus in MP4' mismatch);
- compare against what iOS Photos actually plays, with sources;
- propose a precise test the owner can do and a file-inspection the builder can do (which mp4 boxes to read and what each value should be).
Rank the causes by likelihood.
```

## 10. Working together: what breaks

```
You're helping on FreeMotion, a video and motion editor web app. The repo is public at https://github.com/builderezra/FreeMotion and the live app is at https://builderezra.github.io/FreeMotion/. It is vanilla HTML/CSS/JS: no framework, no build step, a global `FM` object, everything stored locally (localStorage and IndexedDB), working on phones (700px wide or less) and PCs.

RULES. Two other AI sessions change this code every hour, so you must not clash with them:
- Work ONLY in your own separate clone (for example /private/tmp/freemotion-collab-robustness), exactly as you did for the last batch. Never touch any other copy of the project.
- Do NOT edit, refactor, format or fix ANY existing file. Do NOT push anything. Do NOT open a pull request.
- Your only output is ONE new report file, on a local branch named chatgpt/collab-robustness, at outside/chatgpt/collab-robustness.md. Tell me the path when you're done.
- Don't fix anything. Describe each problem so someone else can fix it.
- Every finding must cite the file and line and quote the code. Give the steps to trigger it, a severity (critical/high/medium/low) and your confidence. Mark anything you could not confirm as UNVERIFIED. Do not guess.
- First search audits/*.json and REQUESTS.md for the file or feature, and skip anything already recorded there.

TASK: review live collaboration (js/collab-*.js; read REQUESTS.md #921 and #967 first) for robustness, not security. Look at:
- reconnecting after a phone sleeps or loses signal;
- edits made while offline;
- two tabs of the same person;
- the owner leaving mid-session;
- very large projects (hundreds of layers, big media);
- slow or one-way connections;
- clock differences;
- what happens to undo when a friend's edit lands in between;
- media that hasn't arrived yet.
For each: the scenario, what the user sees, the file and line, and how likely it is. Skip anything already in #921/#967/#971 or audits/*.json.
```

## 11. Where the tests don't look

```
You're helping on FreeMotion, a video and motion editor web app. The repo is public at https://github.com/builderezra/FreeMotion and the live app is at https://builderezra.github.io/FreeMotion/. It is vanilla HTML/CSS/JS: no framework, no build step, a global `FM` object, everything stored locally (localStorage and IndexedDB), working on phones (700px wide or less) and PCs.

RULES. Two other AI sessions change this code every hour, so you must not clash with them:
- Work ONLY in your own separate clone (for example /private/tmp/freemotion-test-gaps), exactly as you did for the last batch. Never touch any other copy of the project.
- Do NOT edit, refactor, format or fix ANY existing file. Do NOT push anything. Do NOT open a pull request.
- Your only output is ONE new report file, on a local branch named chatgpt/test-gaps, at outside/chatgpt/test-gaps.md. Tell me the path when you're done.
- Don't fix anything. Describe each problem so someone else can fix it.
- Every finding must cite the file and line and quote the code. Give the steps to trigger it, a severity (critical/high/medium/low) and your confidence. Mark anything you could not confirm as UNVERIFIED. Do not guess.
- First search audits/*.json and REQUESTS.md for the file or feature, and skip anything already recorded there.

TASK: map what is tested and what isn't. tests/tests.js is very large: tests are named and tagged with { item: 'NNN' } request numbers. Build a table of the app's main features: timeline editing, effects, text, captions, audio, export, saving and loading, Home, templates, collab, the phone layout and the PC layout. For each, give roughly how many tests touch it, and list the IMPORTANT behaviours with no test at all (things a user would notice if they broke). For the top 25 gaps: the behaviour, why it matters, the code it lives in (file and line), and a one-paragraph outline of a test (no code changes).
```

## 12. 20 ready-made templates (design)

```
You're helping on FreeMotion, a video and motion editor web app. The repo is public at https://github.com/builderezra/FreeMotion and the live app is at https://builderezra.github.io/FreeMotion/. It is vanilla HTML/CSS/JS: no framework, no build step, a global `FM` object, everything stored locally (localStorage and IndexedDB), working on phones (700px wide or less) and PCs.

RULES. Two other AI sessions change this code every hour, so you must not clash with them:
- Work ONLY in your own separate clone (for example /private/tmp/freemotion-templates-pack), exactly as you did for the last batch. Never touch any other copy of the project.
- Do NOT edit, refactor, format or fix ANY existing file. Do NOT push anything. Do NOT open a pull request.
- Your only output is ONE new report file, on a local branch named chatgpt/templates-pack, at outside/chatgpt/templates-pack.md. Tell me the path when you're done.
- Don't fix anything. Describe each problem so someone else can fix it.
- Every finding must cite the file and line and quote the code. Give the steps to trigger it, a severity (critical/high/medium/low) and your confidence. Mark anything you could not confirm as UNVERIFIED. Do not guess.
- First search audits/*.json and REQUESTS.md for the file or feature, and skip anything already recorded there.

TASK: design 20 ready-made TEMPLATES people would actually use. Design only, no code. Examples: a TikTok/Reels intro, a lyric video, a photo slideshow with captions, a product promo, a countdown, a quote card, a vlog title, a sports highlight, a meme format, a birthday card, a before/after, a podcast clip with a waveform, a travel montage.
First read how templates work today (Home → Templates; js/home.js, js/storage.js template packs; any existing templates) and what layer types and effects exist (js/compositor.js), so every template uses ONLY what the app already has.
For each template:
- name and purpose;
- aspect ratio and length;
- a layer-by-layer recipe (type, timing, position, effects with parameter values, keyframes, text styles);
- which parts the user swaps in (their clips, words, colours);
- why it looks good.
Rank them by how many people would use them.
```
