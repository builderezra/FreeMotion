# #1255 redesign: everything open, unfinished, or waiting on Ezra
Kept by the logger, last updated 24 Nov 2026 01:30 AWST. This file is the durable copy; his words are verbatim under #1255 in REQUESTS.md.
**27 Nov 2026, 03:5x (logger): SUPERSEDED.** His picks and the open questions now live in 1255-PICKS.md: his READY came on 24 Nov at about 16:31, and the builder builds from that list. Shipped so far: v18.55 (the intro plays on the compositor, no stutter), v18.56 (Settings › New look (preview): Off by default, then Dark or Light, over today's layouts) and v18.57 (Home in the new look on a phone: his quiet rows and flat dock, under the same switch). Next: the two fonts (his yes came 27 Nov 11:27). The rest of this file is the 24 Nov history.
**His correction, 23 Nov 16:44-16:52 (verbatim):** "this whole project like thing we were doing was supposed to be like rethinking how everything could be laid out, not just recoloring stuff" / "the layout now is fine, but I'm just like open to inspiration and new ideas" / "we literally came up with some new designs. They're not even in here." (about the real-app page). So every surface gets today's layout POLISHED plus new layout ideas (never a recolour alone), and the real-app page must show his picks.
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
0. **MUST-PICK: Home bottom nav** (his ask 23 Nov 16:20: "Make sure that I actually pick one when you send them through").
   - Options N1-N6 for Templates / Elements / Tutorials next to the +, keeping the + and Projects, on H9r/H9a.
   - Being drawn 23 Nov. Chase until he names one.
0b. **MUST-PICK, 23 Nov: one pick for each of his notes from 16:30-16:52.**
   - SENT TO HIM at 18:13 as one pick list, with the N1-N6 picture. Chase each until he names one.
   - Every option is on the canvas, on the pages home-nav, menus, create, inspector and simple-2.
   - It is also on the real-app page (v4) as "Pick one" rows.
   - HIS PICKS SO FAR:
     - L1, not the recommended L2 (21:00)
     - Template icon 1 (21:24)
     - C2, not C3 (21:40)
   - 21:31: "everything I didn't pick, I didn't say anything because I like it". Pictures of the open picks were sent at 21:31 for his double-check.
   - STILL OPEN: N (N1 recommended, minus the line under the active tab), D (D1), O (O2), S (S1), K (K3), P (P2), Q (Q2).
   - ~~QUESTION: with no layer selected there is no •••; which menu did he mean?~~ ANSWERED 21:31. His rule covers EVERY menu that opens from a button: it drops down with an animation, joined to the button, polished. The layer ••• gets the compact S version.
   - ALL DRAWN by 24 Nov 05:45 (runner wf_159660a4-456, 8 batches, 81 surfaces, each with its recommended option). The list is in the logger scratchpad, pick-list-all.md; the boards are in ~/fm-1255/polish/canvas/project/ (simple4, text, home2, editor2, inspector2, simple3, menus2, finish, add2, menu/M6r*).
     - On the canvas so far: BX and B2 (v36). Still to publish: B3-B8. The page needs splitting first (564 pictures, over its 511-file cap).
     - Publishing while he was away was blocked by the auto-mode check (03:40). It waits for his OK.
     - The batches and their codes were:
     - XA/XB/XC (Extras, redone after his "make it easier for me to decide")
     - MO1-3 (panel rises, canvas shrinks)
     - M6r + a live drag-control prototype (no sliders)
     - FXR (the real effect covers vs the design's)
     - AH (A2r PC at every drag height)
     - TFX (text effects)
     - FC (the cog rethought)
     - STR (transitions with animated previews)
     - SEX (Simple export, more options)
     - MAR (Audio react)
     - MXD/MXP (export)
     - LG (the real logo retinted): PICKED 27 Nov 21:05, the orange one only at the medium size (PICKS 3.16; master tools/design/plans/1255-logo-final.svg)
     - E1D (E1 on PC)
     - and the other colours-only screens
   - **D1-D4: how every dropdown connects to its button.** Shown on the Home card •••, the copy/duplicate menu, the editor's top-right ••• and the parent picker. [D1 pointer recommended: his own "an arrow coming off of it"]
   - **O1-O5: the opening animation for every dropdown.** "not just the boring ass unfold animation".
   - **S1-S3: the thinner top-right ••• menu.** The colours become a row you swipe through.
   - **P1-P3: the Paste look dialog.** Today's colours were hidden by thick white outlines, and light mode was poor.
   - **L1-L3: the Simple editor's Look panel.** It had wasted space below.
   - **Q1-Q2: the Simple editor's effects panel with each effect's own picture.** Today every tile shows the same image. The picture fix itself can ship in today's look.
   - **X1-X3: the Simple editor's Extras.** Elements, Shape and Template each get a real home in the A2r pattern.
   - **K1-K3: the Create sheet's Simple/Full editor choice.** 60 fps is the default in all three. The feature itself can ship in today's look.
1. **Identity:** confirm the orange look, "Cutline" [recommended; he said "orange looks really good" but wanted to see it in the editor first].
2. **The Full editor switch:** keep today's behaviour, or colour it by the SELECTED layer as he described?
   - Today it is white at rest and takes a layer's colour only while you hold that layer by its handle (app.js:3437).
3. ~~**Template tab icon:** option 1 "Stacked cards", or another number from the options sheet.~~
   - He picked 1, "Stacked cards" (23 Nov 21:24), then REVERSED it on 24 Nov 11:16: "I want it to be the same as ... the templates icon in the actual editor. I think we should be consistent".
   - So it is the editor's existing Template icon (js/addmenu.js:523), used EVERYWHERE, Home's Templates tab included.
4. ~~**Category button style:** C1-C4.~~ HE PICKED C2 Cut Paper (23 Nov 21:40). C3 "looks repetitive... the same thing over and over again".
5. **"Selected" look across menus** (light review M8): (a) a vermilion fill, or (b) a white chip with a vermilion ring [(b) recommended; it's a taste call, so show both].
   - PARTLY ANSWERED 23 Nov 21:12/21:17: NEVER a line under a selected item ("ugly line"), anywhere.
5b. **Real-app re-skin taste calls** (reskin/NOTES.md):
   - The moving gradient ring on the inspector cards (#339) was removed for minimalism. OK?
   - ~~Tool glyphs are now one ink colour instead of per-tool colours. OK?~~ HE ANSWERED, 23 Nov 16:41: NO. Each category button keeps its old colour on its ICON only, with the outline staying black/white, no glow, subtle ("it shouldn't just be black and white"). Drawn as G1 (inspector/G1-*).
   - Timeline bars are coloured by layer TYPE, so two text layers share a colour. OK, or keep per-clip colours?
6. **M3:** for PC only (with M1 on phone), or both?
7. **Simple editor E1:** he liked it, but it has no computer version yet. Confirm E1, then draw its computer version. (E1D is being drawn overnight on 24 Nov.)
8. **ADD sheet on PC:** A2r (A2 with his fixes) [assumed], or the original A2 he said looked good?
9. ~~**The top "fade over the buttons" bug** (#1255 clause 4): which one?~~ ANSWERED BY EVIDENCE on 21 Nov 02:45, no question for him needed.
   - The builder found it from his screenshots: the ADD sheet's dim leaves the editor's top-edge tab undimmed, so iOS fades the bar colour over the top buttons.
   - SHIPPED in v18.48, live 21 Nov 10:15: the grown Add menu plus 27 more screens (16 editor, 5 dark Home, 6 light Home), and the New project card.
   - HIS CHECK on his iPhone: open a project, tap "Tap to add a layer" and look at the top. If any screen still fades, name it.
   - The light Home is closer but not exact; that remainder is tracked as #1256.
   - **REOPENED 21 Nov 11:06.** He said "Fade still there" (10:58) and "the top bar glitches in and out when loading in ... in and out of project" (11:02).
     - The builder found the real fade: iOS 26's top-edge effect lays a tint AND a BLUR over the top of a Home Screen app, so the title and buttons blur at their top while the clock stays sharp.
     - v18.37 and v18.48 only matched the tint's colour, so v18.48 fixed a neighbouring fault, not his.
     - ASKED HIM at 11:10, with the 3x crop: "is this the fade?"
     - The builder is reading WebKit's source for what stops that blur. The fix will come with an on-phone A/B. The glitch while opening or closing a project is logged as a second fault in the same work.
     - v18.49 (live about 19:00 on 21 Nov) adds Settings > Appearance > "Sharp top buttons".
       - It is OFF by default, per his #920 words "I don't want the buttons lower".
       - Turned on, the top buttons sit about 36 pt below the clock area, out of the blur, which ends 33-34 pt below it on all ten of his screenshots.
       - Also fixed: the open-project glitch (the top changed twice; now once). Added: a test card under Settings > Reports > "Top of the screen test".
       - ASK HIM: turn Sharp top on, or keep the buttons where they are? The comparison picture was sent 21 Nov ~13:40.
       - v18.49 went LIVE 21 Nov 23:58 (b79e297a). His three checks:
         1. Turn on Sharp top. If he keeps it on, the builder flips the default.
         2. Open and close a project: the top should change once.
         3. Only if something's still wrong: one screenshot of Settings > Reports > Top of the screen test.
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
   - RUNNING 23 Nov 17:00:
     - the real-app page rebuilt so every screen shows his pick, or the options, or "colours only so far" (wf_ec0a40bd-964)
     - his 16:30-16:52 notes drawn as options (wf_dc808500-a2a; see A0b)
     - the Home nav N1-N6 (wf_8814ffde-70c)
     - the card ••• menu D1-D4 (wf_0062dd33-d35)
   - Designs for every remaining menu: today's layout polished PLUS new layout ideas, never only a recolour (his correction above).
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
- Category buttons (Colouring & Media, Outline & Shadows, Mixing and the rest): each icon keeps its own colour; the outline is neutral black/white; no glow (23 Nov, his own spec, drawn as G1).
- Simple Look panel: L1 (23 Nov 21:00, over the recommended L2).
- Templates icon: the editor's EXISTING one (js/addmenu.js:523), the same everywhere (24 Nov 11:16, reversing "Stacked cards").
- Effects category buttons: C2 Cut Paper (23 Nov 21:40).
- The effects browser B1r/B4r, re-confirmed 23 Nov 21:30: "I love that new effects menu. That looks so good."
- Effect settings (M6) use the DRAG value control, not sliders (23 Nov 21:50). On PC: hover + scroll wheel and click-drag. To be tried in a prototype first; it goes in the tutorials.

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
- The redesign RETHINKS layouts, never only recolours. Every surface gets today's layout polished plus new ideas (23 Nov).
- Every dropdown opens FROM its button and stays visibly connected to it, with a quick opening animation that is not the plain unfold. This covers the Home card •••, the copy/duplicate menu, the editor's top-right •••, the parent picker and any others (23 Nov). He confirmed it at 21:31 for EVERY menu that comes off a button: "it should just be polished".
- No emojis as icons anywhere: draw our own (23 Nov 20:53, the Detect speech button).
- Caption-cue typing and EVERY text page come up from the BOTTOM, in the add-layer row's place, so the screen doesn't move. "Don't take a shortcut... Do it the proper way." (20:53)
- No explanatory hint pop-ups ("tap a clip to split or change its speed"); tutorials teach. A first-run tutorial is OK (20:53).
- No line under any selected or active item, anywhere (21:12 Speed ×1, 21:17 Sound styles). N1's active-tab cut mark goes too.
- Every slider or value track is clearly visible (at least 3:1), never floating dots (21:24, Audio react).
- PC versions are designed FOR the computer, never phone-sized (21:24, Audio react on PC).
- On PC the effects browser (B4r) opens FULLY as a left panel with no drag, and the canvas and timeline shrink to fit (21:35). Tests to come with it: the pointer mapping, the fit at 1280/1440, playback, and open/close restoring the layout. "As long as that doesn't cause any bugs."
- Opening the effects menu animates: the panel rises and the canvas shrinks in step, never a cut (21:45, like a comments sheet).
- On PC, with effect settings open, Export hides so every toolbar button fits, and the timeline stays usable (21:55).
- Fewer words: no "You'll get" or "What to make" labels, and "More options" is just "More options" (21:26, Export).
- Text layers get a text-made effects menu: text effects and easy colours, no picture adjustments. Simple shows the text set only; Full shows it first, with All effects one tap away (21:19).
- Simple transitions: MANY options, each with a small looping preview (21:14). Simple export: more options while staying simple (21:05).
- No glow anywhere. Outlines are hairlines, never thick white (23 Nov, the Paste look dialog). That includes the Full editor's layer switch: his T1r/T4r boards still draw a coloured glow on it (.sw-track box-shadow), and the build must drop it.
- One connector system for every dropdown (his D pick). The build spec is the D1 pointer in the logger's polish/tmp/logger/w1/notes-A1.md: 12x9 SVG, top -9px, centred on the opener. The menu placement passes the opener's rect.
- Builder items that do NOT wait for the redesign (23 Nov):
  - 60 fps selected by default.
  - A Simple/Full editor choice when creating a project.
  - The Simple editor's effects each show their own picture.
