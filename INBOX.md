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


### 23 Nov 2026, 21:24 AWST: #1255 the Audio react sheet needs rethinking; its slider lines are invisible, just floating dots
**His words (verbatim):** Honestly, the audio react sheet is kind of like, I don't know. It's not the best, really. That could probably be rethought as well. I don't like how the lines on the sliders are invisible and it's just floating dots.

**His clauses:**
1. The Audio react sheet is not the best. It could be rethought.
2. The slider lines (tracks) are invisible, so the sliders are just floating dots. He doesn't like that.

**Logger's plan (not his words):**
- Tonight's design run (batch B7, code MAR) redraws it, with two bold new layouts.
- A standing rule now: every slider or value track is clearly visible in dark and light (at least 3:1), never a floating dot. The re-skin's faint track colour is the likely cause in many places.

### 23 Nov 2026, 21:24 AWST: #1255 the Audio react sheet on the computer doesn't look designed for a computer: it's phone-sized
**His words (verbatim):** And also the fact that the version on computer doesn't even look like it was designed for computer. It's like got the phone, size.

**His clauses:**
1. On the computer, the Audio react sheet doesn't look designed for a computer.
2. It is phone-sized.

**Logger's plan (not his words):**
- In tonight's design run (B7, MAR), the PC version uses the width, for example a side panel with the waveform and the reacting values side by side.
- A standing rule for every batch: PC boards are designed for the computer, never a phone-sized sheet on a big screen.

### 23 Nov 2026, 21:26 AWST: #1255 the Full Export dialog: drop the confusing "You'll get" and the "What to make" heading; "More options" just says "More options"
**His words (verbatim):** In the export dialog full, where it says you'll get, why does it say you'll get? Is that the title of the video or what? Like, why does it say you'll get there? I don't know about that. And I don't think it needs to say what to make either. And more options can just be more options. If people want to know what's in it, they'll tap on it to go in.

**His clauses:**
1. The "You'll get" line in the Full Export dialog is confusing (is it the video's title?). He doesn't get why it's there.
2. The dialog doesn't need "What to make" either.
3. "More options" should just say "More options". People tap it to see what's inside.

**Logger's plan (not his words):**
- Tonight's design run (B7, MXD) drops "You'll get" and "What to make". If the result is shown at all, it's shown plainly, e.g. "1080p · 30 fps · MP4 · about 24 MB", with no label.
- The row says just "More options".
- A general lesson for every batch: fewer words, and a label only where it is needed.
- The label changes themselves are text-only and could also ship in today's look.

### 23 Nov 2026, 21:26 AWST: #1255 the Export progress overlay could be cleaner
**His words (verbatim):** Export progress overlay could probably be a bit cleaner looking.

**His clauses:**
1. The Export progress overlay should look cleaner.

**Logger's plan (not his words):** in tonight's design run (B7, MXP), MXP1 is today's overlay made much cleaner: one clear progress element, fewer words, calm. MXP2 and MXP3 are cleaner new takes.

### 23 Nov 2026, 21:27 AWST: #1255 should the whole settings cog menu be rethought? Potentially
**His words (verbatim):** Should we rethink how the whole settings cog menu works? Potentially.

**His clauses:**
1. Consider rethinking how the whole settings cog menu (the editor's cog) works.

**Logger's answer and plan (not his words):**
- Yes, recommended. It has grown into a catch-all.
- Tonight's design run (B4, code FC, its own designer) maps everything the cog opens today, then rethinks how it WORKS:
  - FC1 is regrouped and polished.
  - FC2 is a split: the cog keeps project and canvas settings, sharing gets its own home, and the editor switch sits where you'd look for it.
  - FC3 is bolder.
- It covers phone and PC, with a table of where every item lives in each option.

### 23 Nov 2026, 21:31 AWST: #1255 what he didn't comment on he likes (he is double-checking the open picks); his rule for EVERY button menu; the ••• "no layer selected" question answered
**His words (verbatim):** I'm pretty sure everything I didn't pick, I didn't say anything because I like it, but just quickly open up all the things I haven't picked yet just so I can double check. You're going to have to remind me or send me a screenshot of which message where I said the question with no letter selected, there's no 3 dots. Because I was talking about 3 dots on sections a lot, about a lot of different things. I think my general consensus though was that all the 3 dot menus and like every menu that you open up, that's like comes off of a button that opens up a menu, a drop down menu. It should actually, the menu should actually drop down with like an animation and be connected to the button that you pressed in a like stylish way. And that basically, you know, like it should just be polished. And I think I said for the 3 dot menu, when you have a layer selected, I just wanted it to be more compact. And I think I explained how it should be compact

**His clauses:**
1. Everything he didn't comment on, he likes. He wants to see all the not-yet-picked items once more to double-check.
2. Remind him which message the "no layer selected, no ••• today" question came from, since he talked about ••• menus a lot.
3. His general rule: EVERY menu that opens from a button (all the ••• menus and every dropdown) drops down with an animation and is connected to the button in a stylish way. Polished.
4. For the ••• menu with a layer selected: more compact, as he described (the thinner menu with the colours you swipe).

**Logger's notes (not his words):**
- Sent at 21:31: two pictures of everything still waiting on a pick (N, D, O, S, K, P, Q), recommended ringed. His answer goes in when he replies.
- The no-layer question is ANSWERED by clause 3: it was his 16:38 message ("Same for the three-dot drop-down menu from the top right when you have a layer selected or not, or when you don't have a layer selected…").
  - The rule simply covers every button menu, whatever is selected. There is no separate "no layer" ••• to design.
  - The S*-none boards (the Layer actions menu with the paste strip) stay as an extra, not a pick.

### 23 Nov 2026, 21:33 AWST: measure the testing properly and change to a better way if there is one; the overheating was probably his games
**His words (verbatim):** Yeah, of course, I want you to measure it properly. If there's any better way for us to do it, we should be doing it. And when it was overheating, that probably was because I was playing games at the same time.

**His clauses:**
1. Measure the testing properly: what it catches, what it costs.
2. If there's a better way to do it, we should be doing it.
3. The overheating was probably because he was playing games at the same time.

**Logger's plan (not his words):**
- A read-only measuring job runs as soon as v18.50 is out, beside the design run.
- It covers:
  - every refused ship since 24 Oct, classed as real app bug, test problem, environment (heat, his games), tooling or process;
  - what a release costs in laptop hours, and how much of the phone pass repeats the desktop pass;
  - the bugs that got past green tests to his phone;
  - ranked proposals with hours saved and risk, re-checked by a skeptic.
- He gets a short plain report. The builder gets the proposals for ship.sh and the tests (the builder owns those).
- His games: memory "windows-load-invisible-to-wsl" already notes that ship.sh's load gate cannot see Windows load. A Windows-load gate is one of the proposals.
