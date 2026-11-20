# #1255 redesign: everything open, unfinished, or waiting on Ezra
Kept by the logger, last updated 21 Nov 2026 02:20 AWST. This file is the durable copy; his words are verbatim under #1255 in REQUESTS.md.
His plan (21 Nov 02:10): "finish this up and we can properly do EVERYTHING when monday 4pm hits", i.e. after the weekly reset on **Mon 23 Nov 16:00 AWST**.
His process rule: before ANY switch-over, ONE simple decisions chat covering every decision, his earlier likes ("still like them?"), and each change shown before/after, ending with "ready to switch over?". The builder builds nothing from these designs until he says he is ready.

## Where everything is
- Design canvas (all options): https://claude.ai/artifact/VdLq7tSBTCtn7uDBx9GRQz ("Start here" page lists every code).
- Audio effect pictures (52, animated): https://claude.ai/artifact/E9ci4qJvehUnZU95uLVHTW
- The new look on the real app (now vs new dark vs new light, 109 of 111 screens and menus, phone and computer): https://claude.ai/artifact/TApzwhMRZXULYXEcSzz4tg
  - Built on the design copy ~/fm-design with ?ui=cutline and ?ui=light.
  - The theme sources and generators are in ~/fm-1255/polish/reskin/gen and light/gen.
  - The work for the real build is in reskin/NOTES.md: tokenise styles.css, stop JS writing colours inline, one Appearance setting, self-hosted fonts precached in sw.js, edge and contrast tests.
- Durable copies of the work:
  - Every source file is in WSL ~/fm-1255/: canvas artboards, audio tiles, IDENTITY.md, CONTEXT.md, DECISIONS.md, the light-mode review.
  - The real-app theme prototypes are in ~/fm-design/: theme-light.css and theme-cutline.css (the design copy of the app).

## A. Waiting on Ezra's answer (logger's recommendation in brackets)
1. **Identity:** confirm the orange look, "Cutline" [recommended; he said "orange looks really good" but wanted to see it in the editor first].
2. **The Full editor switch:** keep today's behaviour, or colour it by the SELECTED layer as he described?
   - Today it is white at rest and takes a layer's colour only while you hold that layer by its handle (app.js:3437).
3. **Template tab icon:** option 1 "Stacked cards" [recommended by the designer and the judge], or another number from the options sheet.
4. **Category button style:** C1-C4, shown on the locked B1/B4 layout (the board is being made 21 Nov).
5. **"Selected" look across menus** (light review M8): (a) a vermilion fill, or (b) a white chip with a vermilion ring [(b) recommended; it's a taste call, so show both].
5b. **Real-app re-skin taste calls** (reskin/NOTES.md):
   - The moving gradient ring on the inspector cards (#339) was removed for minimalism. OK?
   - Tool glyphs are now one ink colour instead of per-tool colours. OK?
   - Timeline bars are coloured by layer TYPE, so two text layers share a colour. OK, or keep per-clip colours?
6. **M3:** for PC only (with M1 on phone), or both?
7. **Simple editor E1:** he liked it, but it has no computer version yet. Confirm E1, then draw its computer version.
8. **ADD sheet on PC:** A2r (A2 with his fixes) [assumed], or the original A2 he said looked good?
9. ~~**The top "fade over the buttons" bug** (#1255 clause 4): which one?~~ ANSWERED BY EVIDENCE on 21 Nov 02:45, no question for him needed.
   - The builder found it from his screenshots: the ADD sheet's dim leaves the editor's top-edge tab undimmed, so iOS fades the bar colour over the top buttons.
   - It's fixed on land/b1255, along with the same fade under every other dim. It ships as v18.48.
   - He should still confirm on his iPhone after v18.48.
10. **Light mode on his iPhone** (light review M13): check that the clock and battery stay readable in light mode before it ships. He has to look on his phone.
11. Earlier release questions still open:
    - v18.43: on PC, the two-row grid became one scrolling row. Does he want the grid back?
    - v18.44: try Clear voice on someone talking. Too much or too little?
    - v18.45: Slide on a short clip from a long video. A faster drag, or a whole-video bar [the builder recommends the bar]?
    - v18.46: do one real export. Was the promised size close?
    - v18.47: six Full-editor fixes, each the recommended pick. Do any look wrong?
12. Older open questions:
    - #352: move finished requests to a second file? [recommended: leave it whole]
    - The three photos tesla.jpg, bay.jpg and dusk.jpg: keep or swap?
    - #1246 clause 7: Dispersion default, with Sweep starting Off.
13. Housekeeping only he can do:
    - Delete the OLD public site: github.com/builderezra/Claude-game-2/tree/main/FreeMotion (••• → Delete directory → Commit changes).
    - Start the fresh builder chat. The paste is in the logger's scratchpad, fresh-builder-paste.txt, and is worth doing before Monday's big integration.

## B. Unfinished work
1. Running on 21 Nov (logger):
   - DONE 02:30: B1r (phone: main, inside a category, the Faves screen, presets) and B4r (PC), with New, Recents and Faves first, from a feature audit of today's browser. They're at the top of the canvas's Effects browser page.
   - DONE 02:50: category styles C1 Ink Line, C2 Cut Paper, C3 Split Frame and C4 Glyph Field drawn on the locked B1r (phone) and B4r (PC) layouts, dark and light. They're on the canvas page "Effects: pick a category style". He picks one (item A4).
   - DONE 02:40: the real-app page (link above).
   TONIGHT'S DESIGN WORK IS FINISHED. Nothing more until Mon 23 Nov 16:00.
   - The real-app "new look" page: crawl, review, fix, publish.
   Then design work STOPS until Monday 16:00.
2. From Mon 23 Nov 16:00 (logger):
   - Designs for every remaining menu, on the real-app re-skin.
   - A motion spec (sheets, menus, tabs, selection, press feedback, the theme switch).
   - The logo fix: use the app's REAL logo and wordmark assets, never a redraw; retint only if he approves.
   - E1's computer version.
   - Then THE decisions chat.
3. After his "ready" (builder): integration, including a methodical check of every effect (238 visual, plus filters and audio) that it still works and has the new look.
4. Builder now: HOLDING until the logger says go, which happens when weekly usage is within 3 points of the pace line. #1255 clause 4, the top-fade bug, is in its queue.

## C. His picks so far (re-confirm in the decisions chat)
- Home: H9r on phone; H9a on PC.
- Simple editor: E1.
- Full editor:
  - T1r on phone: no layer lines, view options down, the switch in the toolbar, a small ruler with no numbers.
  - T2r / T4r on PC: he likes T4. T4r has the thin hover add-bar, hover states and the detailed switch.
- ADD sheet: A2r, all tabs. Template icon still to pick.
- Effects browser: B1 (phone), B4 (PC), with Faves, New and Recents FIRST.
- Inside a category: M1 (phone), M3 (PC); M5 = the press-and-hold preview; M6 = the settings look with TODAY's sliders.
- Audio menus: the same layouts as the visual effects, with the 52 new audio pictures (U1-U8 dropped).
- Look: Cutline (orange). Minimal ("less is more").

## D. Build rules he set
- Minimal; no hero card for the open project.
- No decorative lines on layer rows.
- On PC every button gets a subtle hover state, and the add-layer row is a thin bar that expands on hover.
- The switch keeps its place in the toolbar, and its colour behaviour is per A2 above.
- The view-options and Timeline-options buttons stay where today's app has them.
- Faves, New and Recents stay first in the effects browser.
- Today's effect pictures and today's sliders stay.
- Clean animations ship WITH the redesign.
- The real logo is used, never redrawn.
- Dark is the default; light mode is a setting and must be tasteful.
- Phone AND computer both matter.
