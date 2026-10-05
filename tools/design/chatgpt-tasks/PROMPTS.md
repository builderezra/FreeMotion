# Prompts for ChatGPT (1 Oct): read-only work that can't clash with the two Claude chats

Run each prompt as its own ChatGPT task or chat. They can all run at once. None of them edits code: each one produces a
single report. Paste each finished report (or the branch name it made) into the Claude LOGGING chat. That chat checks
every finding against the real code and hands the real ones to the builder.

---

## 1. Security review

```
You're helping on FreeMotion, a video and motion editor web app. The repo is public at https://github.com/builderezra/FreeMotion and the live app is at https://builderezra.github.io/FreeMotion/. It is vanilla HTML/CSS/JS: no framework, no build step, a global `FM` object, everything stored locally (localStorage and IndexedDB), working on phones (700px wide or less) and PCs.

RULES. Two other AI sessions change this code every hour, so you must not clash with them:
- Do NOT edit, refactor, format or fix ANY existing file. Do NOT push to main. Do NOT open a pull request that changes an existing file.
- Your only output is ONE new report file. If you can write to the repo, put it alone on a new branch named chatgpt/security at outside/chatgpt/security.md. Otherwise, give me the report here in chat.
- Don't fix anything. Describe each problem so someone else can fix it.
- Every finding must cite the file and line and quote the code. Give the steps to trigger it, a severity (critical/high/medium/low) and your confidence. Mark anything you could not confirm as UNVERIFIED. Do not guess.
- Skip anything already listed in audits/*.json or REQUESTS.md (search both for the file or feature first).

TASK: do a security review. Look for:
(1) User-controlled text reaching innerHTML, insertAdjacentHTML or outerHTML without escaping. That includes project names, layer and text-layer content, captions, file names, imported .fmotion.json projects and template packs, collaboration messages from other people, and AI responses.
(2) Importing project and template files: prototype pollution (__proto__, constructor), huge or deeply nested input, unexpected types.
(3) Live collaboration (js/collab-*.js): can a peer send a message that bypasses validation or the role rules (viewer, commenter, editor), crashes the owner, or corrupts their project?
(4) The bring-your-own AI key (js/ai-*.js): where it is stored, whether it can leak into logs, exports, collaboration messages, URLs or other hosts.
(5) The service worker and caching: is anything sensitive cached?
(6) postMessage / message handlers that accept any origin.
End with a ranked list of the top 10.
```

## 2. "Can I lose my work?" hunt

```
You're helping on FreeMotion, a video and motion editor web app. The repo is public at https://github.com/builderezra/FreeMotion and the live app is at https://builderezra.github.io/FreeMotion/. It is vanilla HTML/CSS/JS: no framework, no build step, a global `FM` object, everything stored locally (localStorage and IndexedDB), working on phones (700px wide or less) and PCs.

RULES. Two other AI sessions change this code every hour, so you must not clash with them:
- Do NOT edit, refactor, format or fix ANY existing file. Do NOT push to main. Do NOT open a pull request that changes an existing file.
- Your only output is ONE new report file. If you can write to the repo, put it alone on a new branch named chatgpt/data-safety at outside/chatgpt/data-safety.md. Otherwise, give me the report here in chat.
- Don't fix anything. Describe each problem so someone else can fix it.
- Every finding must cite the file and line and quote the code. Give the steps to trigger it, a severity (critical/high/medium/low) and your confidence. Mark anything you could not confirm as UNVERIFIED. Do not guess.
- Skip anything already listed in audits/*.json or REQUESTS.md (search both for the file or feature first).

TASK: find every way a user could LOSE WORK or end up with a broken project. Read js/storage.js, js/home.js, js/scene.js, and the undo/history and autosave code in js/app.js. Look for:
- autosave timing and races, including two tabs open on the same project;
- storage full (QuotaExceeded) or IndexedDB failures mid-save;
- a save interrupted by closing the app, a reload or a phone lock;
- delete, duplicate, rename and import edge cases;
- undo/redo restoring the wrong thing;
- media files that go missing from a project;
- corrupt or old projects failing to open, and whether there is any recovery;
- the projects list and a project's data disagreeing.
For each one: what the user does, what they lose, the file and line, and your confidence. End with the top 10 ranked by how likely they are times how bad.
```

## 3. Speed and memory hunt

```
You're helping on FreeMotion, a video and motion editor web app. The repo is public at https://github.com/builderezra/FreeMotion and the live app is at https://builderezra.github.io/FreeMotion/. It is vanilla HTML/CSS/JS: no framework, no build step, a global `FM` object, everything stored locally (localStorage and IndexedDB), working on phones (700px wide or less) and PCs.

RULES. Two other AI sessions change this code every hour, so you must not clash with them:
- Do NOT edit, refactor, format or fix ANY existing file. Do NOT push to main. Do NOT open a pull request that changes an existing file.
- Your only output is ONE new report file. If you can write to the repo, put it alone on a new branch named chatgpt/performance at outside/chatgpt/performance.md. Otherwise, give me the report here in chat.
- Don't fix anything. Describe each problem so someone else can fix it.
- Every finding must cite the file and line and quote the code. Give the steps to trigger it, a severity (critical/high/medium/low) and your confidence. Mark anything you could not confirm as UNVERIFIED. Do not guess.
- Skip anything already listed in audits/*.json or REQUESTS.md (search both for the file or feature first).

TASK: find what makes the app slow or makes it grow in memory over time, especially on an iPhone. Read js/compositor.js (the per-frame rendering and the effects), js/timeline.js (how often the timeline rebuilds), js/app.js and js/exporter.js. Look for:
- allocations inside per-frame or per-pixel loops;
- repeated work that could be cached;
- event listeners added again and never removed;
- object URLs never revoked;
- video or audio elements, canvases and ImageBitmaps never released;
- requestAnimationFrame or setInterval loops left running;
- work that grows with project size (try thinking about a 500-layer project).
For each one: the file and line, why it is slow or leaks, a rough cost estimate, how to MEASURE it (exact steps), and your confidence. End with the top 10 by expected speed-up.
```

## 4. New effects and filters design pack

```
You're helping on FreeMotion, a video and motion editor web app. The repo is public at https://github.com/builderezra/FreeMotion and the live app is at https://builderezra.github.io/FreeMotion/. It is vanilla HTML/CSS/JS: no framework, no build step, a global `FM` object, everything stored locally (localStorage and IndexedDB), working on phones (700px wide or less) and PCs.

RULES. Two other AI sessions change this code every hour, so you must not clash with them:
- Do NOT edit, refactor, format or fix ANY existing file. Do NOT push to main. Do NOT open a pull request that changes an existing file.
- Your only output is ONE new report file. If you can write to the repo, put it alone on a new branch named chatgpt/effects-pack at outside/chatgpt/effects-pack.md. Otherwise, give me the report here in chat.
- Don't fix anything. Describe each problem so someone else can fix it.
- Every finding must cite the file and line and quote the code. Give the steps to trigger it, a severity (critical/high/medium/low) and your confidence. Mark anything you could not confirm as UNVERIFIED. Do not guess.
- Skip anything already listed in audits/*.json or REQUESTS.md (search both for the file or feature first).

TASK: the owner wants "as much choice as possible", so design NEW effects and filters for the app. Design only, no code changes.
First read the existing effect list in js/compositor.js (entries look like { type, label, params: [{ key, label, min, max, def }] }), the filters, and tools/design/plans/2026-09-29-idle-backlog/backlog.md, so you don't repeat anything that exists or is already planned.
Then propose:
(a) 20 new effects;
(b) 15 new filters (looks);
(c) 10 upgrades to existing effects that give them more useful controls.
For each:
- an ORIGINAL name (do not copy names from Alight Motion or CapCut);
- what it looks like, in one or two plain sentences;
- its controls (key, label, min, max, default, unit);
- an implementation sketch in the same style as the existing effects in compositor.js (pseudo-code);
- whether it animates;
- a rough cost per frame (cheap, medium or heavy).
Rank them by how much a video creator would want them.
```

## 5. Free sound effects library

```
You're helping on FreeMotion, a video and motion editor web app. The repo is public at https://github.com/builderezra/FreeMotion and the live app is at https://builderezra.github.io/FreeMotion/. It is vanilla HTML/CSS/JS: no framework, no build step, a global `FM` object, everything stored locally (localStorage and IndexedDB), working on phones (700px wide or less) and PCs.

RULES. Two other AI sessions change this code every hour, so you must not clash with them:
- Do NOT edit, refactor, format or fix ANY existing file. Do NOT push to main. Do NOT open a pull request that changes an existing file.
- Your only output is ONE new report file. If you can write to the repo, put it alone on a new branch named chatgpt/sound-effects at outside/chatgpt/sound-effects.md. Otherwise, give me the report here in chat.
- Don't fix anything. Describe each problem so someone else can fix it.
- Every finding must cite the file and line and quote the code. Give the steps to trigger it, a severity (critical/high/medium/low) and your confidence. Mark anything you could not confirm as UNVERIFIED. Do not guess.
- Skip anything already listed in audits/*.json or REQUESTS.md (search both for the file or feature first).

TASK: research only, and do not download anything into the repo. Find sound effects the app could ship that are free to use in a commercial app WITHOUT attribution: CC0 or public domain.
First look at how the app groups sounds today (the Audio tab in js/addmenu.js, and any sound-effect list in the repo).
Then list 80–120 specific sounds grouped into those categories, plus any new categories worth adding (whooshes, risers, hits, UI clicks, transitions, ambience, foley, cartoon, glitch). For each sound:
- the exact source page URL;
- the licence, with a link to its text;
- the format;
- the length;
- one line on what it sounds like.
Flag anything that needs attribution or has unclear licensing, and leave those out of the main list.
```

## 6. Make the look our own (Alight Motion check)

```
You're helping on FreeMotion, a video and motion editor web app. The repo is public at https://github.com/builderezra/FreeMotion and the live app is at https://builderezra.github.io/FreeMotion/. It is vanilla HTML/CSS/JS: no framework, no build step, a global `FM` object, everything stored locally (localStorage and IndexedDB), working on phones (700px wide or less) and PCs.

RULES. Two other AI sessions change this code every hour, so you must not clash with them:
- Do NOT edit, refactor, format or fix ANY existing file. Do NOT push to main. Do NOT open a pull request that changes an existing file.
- Your only output is ONE new report file. If you can write to the repo, put it alone on a new branch named chatgpt/identity at outside/chatgpt/identity.md. Otherwise, give me the report here in chat.
- Don't fix anything. Describe each problem so someone else can fix it.
- Every finding must cite the file and line and quote the code. Give the steps to trigger it, a severity (critical/high/medium/low) and your confidence. Mark anything you could not confirm as UNVERIFIED. Do not guess.
- Skip anything already listed in audits/*.json or REQUESTS.md (search both for the file or feature first).

TASK: the app's interface was modelled on Alight Motion, and before it goes public it must look and read as its own. Read BEFORE-PUBLISHING.md first, then the UI (index.html, styles.css, theme-glass.css, and the js files that build menus).
List every remaining thing a user would recognise as copied from Alight Motion: layout, names, icons, menu structure, effect names, colours, wording.
For each one: where it is (file and line), why it reads as Alight Motion, and 2 original alternatives (describe them; don't change anything).
Rank them by how recognisable they are.
```
