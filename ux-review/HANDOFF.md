# FreeMotion UX review: handoff for another AI

Paste this into a new chat, or give the chat this link:
https://raw.githubusercontent.com/builderezra/FreeMotion/claude/freemotion-ux-improvements-fu5r8p/ux-review/HANDOFF.md

## What this is
A usability review of FreeMotion (Ezra's motion-graphics web app, https://builderezra.github.io/FreeMotion/),
done on v16.90 on 24-26 Sep 2026. Review bots used the app like a person, mostly on a 390px phone, plus desktop
and other screen sizes, without reading the code. It found 86 things that could be better, each with a
suggested fix that keeps the feature. The 12 most important were then built or answered.

## Read these first (plain text, public)
- The full report, every finding with its fix: https://raw.githubusercontent.com/builderezra/FreeMotion/claude/freemotion-ux-improvements-fu5r8p/ux-review/REPORT.md
- What was built, and the proof for each fix: https://raw.githubusercontent.com/builderezra/FreeMotion/claude/freemotion-ux-improvements-fu5r8p/ux-review/BUILD-LOG.md
- The code lives on the branch `claude/freemotion-ux-improvements-fu5r8p` of https://github.com/builderezra/FreeMotion (not merged into main yet).
- A viewable copy of the report page with screenshots: `ux-review/report.html` on that branch (download it and open it in a browser, or upload it to the chat).

## Status of the top 12
- Built on the branch, each with a test that fails on the old code and passes on the new: #1 and #2 (tips that explain two of his own rules), #3, #5, #6, #7, #8, #9, #11.
- Already fixed on main in v16.94: #10.
- Waiting on Ezra: #4 and #12, plus the motion path in #2. These are visual changes, and his rule is that he sees pictures of options before a visual change is built.

## What Ezra still has to do (remind him of these)
1. **Merge the branch.** His loop session should merge it and ship it with tools/ship.sh, which bumps the version, the ?v= cache-busters and POLISH-LOG. Nothing is live on his phone until then.
2. **Pick three visuals:** a play/pause glyph inside the time pill (#4), a TEMPLATE / ELEMENT chip in the editor header while editing one (#12), and showing the motion path while dragging an animated layer (#2). Ask for pictures of options first.
3. **Check two things on a real phone:** whether pinching a layer zooms the whole page, and whether the back swipe closes panels. The review's test browser could not settle either.
4. **Go through the other 74 findings** in REPORT.md and pick which ones to build. On the report page each has a Pick button, and "Copy as a message" turns the picks into one message.
5. **Run the full test suite on his Mac.** Some tests cannot run on the Linux test browser (MP4 export, a few timing and order-dependent ones); BUILD-LOG.md lists them.

## How to help him
- Remind him to go through this, one step at a time, starting with step 1. Keep it short and do not repeat the whole list every time.
- When he picks findings to build, write his picks down in his own words, and treat his earlier decisions as settled: four of the top 12 were things he had asked for on purpose (the preview never selects, a preview drag moves the whole animation, the time pill is the play button, tapping a template edits it). The fixes keep those rules and only add explanations.
- His preferences: plain talk, no em dashes, be honest when something is wrong, and end each message with a confidence rating out of 10.
