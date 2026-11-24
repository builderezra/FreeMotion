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


### 24 Nov 2026, 11:53 AWST: his answers: publish yes, split the page yes; aspect chips are LOGOS; Simple's Outline & Shadows gets its OWN Simple-styled version
**His words (verbatim), in order:**
- "1 yes 2 yes" (to the logger: 1 = publish the overnight designs, 2 = split the real-app page into linked section pages)
- "open up the designs for me to see"
- "also open up the picks i still need to make"
- "Logos not text unless its illegal which i doubt"
- "outline and shadows should have one that fits the design theme of the simple editor"

**His clauses:**
1. Publish the overnight designs: YES.
2. Split the real-app page into section pages: YES.
3. Open the designs, and the picks still to make, for him to see.
4. The Settings aspect chips use LOGOS, not text, unless that is illegal (he doubts it). This matches his 9 Nov "just do logos without names".
5. The Simple editor's Outline & Shadows should have its OWN version that fits the Simple editor's design theme, not the Full editor's one-feature pages.

**Logger's notes (not his words):**
- Clause 5 answers the builder's question of 24 Nov 07:42: Simple keeps its own Outline & Shadows, styled like E1. Draw its options in the next design gap.
- Clause 4: showing the TikTok, Instagram, YouTube and Facebook marks to say "sized for" is normal use. Use each brand's official mark unchanged, and don't suggest the brands endorse FreeMotion.

### 24 Nov 2026, 11:55 AWST: #1255 his verdict on the drag-control prototype: PC is fine; a hard swipe or scroll must go much further; and it must be MORE precise than a slider, not the same
**His words (verbatim):** Yeah, the sliders are fine for PC. I think if you swipe or like scroll harder though, it should go further, like because you could swipe really hard and it won't go that far or fast. And also, for like strength, you've got 0% to 100%, which is like fine, I guess. But just keep in mind the whole point of us having this is so that you can be more precise. Not the same amount of precision, just a different way to slide, if that makes sense.

**His clauses:**
1. On PC it's fine.
2. Swiping or scrolling HARDER should go further and faster. Today a really hard swipe doesn't go far or fast.
3. Strength 0% to 100% is fine.
4. The whole point is MORE precision than a slider, not the same precision with a different way to slide.

**Logger's plan (not his words):**
- Revise the prototype (https://claude.ai/artifact/CTLnV15ToDWwVeNHaSC2r9):
  - a much stronger speed curve, so a hard swipe or scroll covers most of the range, with a short glide after a fast flick;
  - slow drags step finer than a slider can, e.g. 0.1% on Strength and 0.1° on Angle, showing one decimal while dragging slowly.
- Test it in headless Chrome, publish, and ask him to try again. This happens after the v18.51 ship's quiet window (about 14:40).
- The build spec for M6r follows his verdict.

### 24 Nov 2026, 11:57 AWST: #1255 the drag control: he picks RULER over Field and Dial
**His words (verbatim):** Also, I think I prefer ruler over field or dial. Dial is cool, but I think it's a bit of like a waste of space. It's a bit gimmicky as well.

**His clauses:**
1. He prefers the Ruler drag control over Field and Dial.
2. The Dial is cool but wastes space and is a bit gimmicky.

**Logger's note (not his words):** M6r = Ruler, which was the recommended one. The next prototype version improves only the Ruler: harder swipes go further, and slow drags are finer.

### 24 Nov 2026, 12:07 AWST: #1255 Home: keep the Templates icon consistent with the editor's; drop "Saved on this device, nothing is uploaded" on PC
**His words (verbatim), first:** Alright, I don't know if this is where I'm supposed to go through next, but I'm on the redesign home section, and let's have some picks. Alright, so I'm looking at the home tab and the templates icon. I'm not sure if that's the one that I agreed on to go in the editor, so it wouldn't be the same as what you've got here. I don't know, I can't remember which one that I picked to go in the editor. I just want them to be consistent.

**His words (verbatim), second:** I don't think it needs to have text at the bottom that says saved on this device, nothing is uploaded for the PC version.

**His clauses:**
1. He is going through the Home section page now to make picks.
2. The Templates icon on Home must be the same as the editor's. Consistent.
3. On the PC version of Home, drop the bottom text "Saved on this device, nothing is uploaded".

**Logger's notes (not his words):**
- At 12:05 he was sent a picture: the editor's Template icon today (a dashed square plus an orange square, js/addmenu.js:523) beside Home's Templates tab today (four squares). Home's tab changes to the editor's icon (his 11:16 rule).
- Clause 3 is the same "fewer words, no explanations" rule as the export labels and the hints.

### 24 Nov 2026, about 12:09 AWST: #1255 the logo: try a version in the orange look (orange background, black edit lines, white playhead)
**His words (verbatim):** For the logo, let's try a version with the consistent orange look that we go for, like an orange background, but then black edit lines, and then a white playhead.

**His clauses:**
1. Try a logo version in the consistent orange look:
   - an orange background;
   - black edit lines;
   - a white playhead.

**Logger's plan (not his words):** draw it as LG5 from the app's REAL logo artwork, retinted only and never redrawn, as the app icon at 180/64/32 px, the wordmark in the top bar, and the splash. That happens after the v18.51 ship's quiet window (about 14:40); then send him the picture.

### 24 Nov 2026, about 12:11 AWST: #1255 his pick for the Home bottom nav: N1
**His words (verbatim):** Just go with N1.

**His clauses:**
1. The Home bottom nav is N1: today's four tabs polished, with the + in the middle. The active tab is a soft chip, never a line (his rule; the board was fixed on 24 Nov 09:10).

**Logger's note (not his words):** this closes 1255-open-items A0 (MUST-PICK Home nav). Home's Templates tab uses the Template icon option 1, "Stacked cards", the same everywhere (his about-12:13 confirmation).

### 24 Nov 2026, about 12:12 AWST: #1255 the Template icon: he wants to see all the redesigned options again and name the one he picked
**His words (verbatim):** Wait, hold on. I just saw the screenshot you sent. Keep this one everywhere. Changes to match. I don't think that's the template icon I agreed on, because you made a whole bunch of different template redesigns. In the chat, just send all the different template redesigns, and I'll remind you which one I picked, and then just use that one.

**His clauses:**
1. The editor's current Template icon (in the logger's picture) is NOT the one he agreed on.
2. There were a whole bunch of Template icon redesigns. Send them all in chat.
3. He'll say which one he picked, and that one is used everywhere.

**Logger's note (not his words):** the sheet with options 1-10 (add/A2-tplicons) was sent at about 12:12. His 23 Nov 21:24 pick was the recommended option 1, "Stacked cards". The rule "the same icon everywhere" stands, with whichever number he names now. Wait for his number.

### 24 Nov 2026, about 12:13 AWST: #1255 the Template icon is option 1 "Stacked cards" after all, used EVERYWHERE (this replaces his 11:16 note)
**His words (verbatim):** Yeah, I picked the recommended one. Just go with the recommended one.

**His clauses:**
1. The Template icon is the recommended one he picked on 23 Nov: option 1, "Stacked cards" (add/A2-tplicons).

**Logger's notes (not his words):**
- Together with his 11:16 "I just want them to be consistent", option 1 is used EVERYWHERE: the editor's ADD sheet Template tab, Home's Templates tab, and anywhere else a Templates icon appears.
- The 11:16 entry ("the same as the templates icon in the actual editor") is superseded. He thought the editor already had his pick.

### 24 Nov 2026, about 12:14 AWST: #1255 his pick for the Home Templates tab: HT2 (Poster grid, the recommended one)
**His words (verbatim):** Yeah, just go for HT2.

**His clauses:**
1. Home, Templates tab: HT2, Poster grid (home2/HT2-*, HT-REC-*).

### 24 Nov 2026, about 12:15 AWST: #1255 his pick for the Home Elements tab: the recommended HE2 (Tile grid)
**His words (verbatim):** For the Elements tab, just go with the recommended one.

**His clauses:**
1. Home, Elements tab: the recommended one, HE2 Tile grid (home2/HE2-*, HE-REC-*).

### 24 Nov 2026, about 12:16 AWST: #1255 his pick for the Home Tutorials tab: HU3 (Chapter tiles), over the recommended HU2
**His words (verbatim):** Do HU3.

**His clauses:**
1. Home, Tutorials tab: HU3, Chapter tiles (home2/HU3-dark-phone). The recommended HU2 (editor switch and chapters) is not used.

**Logger's note (not his words):** HU3 only has a dark phone board so far. Draw its light and PC versions in the next design gap.

### 24 Nov 2026, about 12:16 AWST: #1255 Home first run: just "make your first video" (tutorial first) plus "or get straight into it" with an arrow to the +; animated tutorials later; rethink the EMPTY editor too
**His words (verbatim):** I think when you first start, like when you open up and you've got no projects and it's like you haven't, done anything, maybe we should just have the first thing is like it just saying make your first video. Like just like HF3, just only have the tutorial there. And then instead of it saying, let's see what you're made of, it could just be, some text that's like, let's get started, something like that, like with a tutorial. And then you click on that and it takes you to that tutorial. And then once you beat that tutorial, it will take you to the next one. Which, by the way, our tutorials right now just being text is like not good enough. One day, like when we're just finished and we've actually decided how everything looks, you'll make like animations that are tutorials to teach people, but we'll get to that another time. And for now, we'll just keep the simple tutorials. And so it'll just take you to the first tutorial, and then there'll be like text underneath, like the option to the tutorial. Like, so it'll be like in the middle of the screen, like how you've got on HF3, some text saying, want to get started with the tutorial or just something like that. Whatever makes sense, whatever you think is best. And then text underneath saying, or get started straight away, or get straight into it, something like that. And it'll be like it would be like another arrow, but like a different type of arrow pointing towards the plus to create button at the bottom in the middle. But I'm also just thinking now, I haven't looked through it all yet, but what will the redesign do for the when you open up an edit and you haven't, got anything in the edit? Because right now we have that, like, you press on the big area and then it does like an animation, but we could rethink that as well.

**His clauses:**
1. First run (no projects, nothing done yet): show just "make your first video", like HF3, with only the tutorial there.
2. Not "let's see what you're made of". Use something like "Let's get started" with the tutorial.
3. Tapping it opens the first tutorial. Beating that tutorial takes you to the next one.
4. Text tutorials aren't good enough. LATER, once the look is decided, make ANIMATED tutorials. For now keep the simple ones.
5. Layout like HF3:
   - in the middle, text like "Want to get started with a tutorial?" (whatever is best);
   - under it, "or get straight into it";
   - a different kind of arrow pointing at the + create button at the bottom middle.
6. Question: what does the redesign do for an EMPTY editor (a project with nothing in it)? Today you press the big area and it animates. That could be rethought too.

**Logger's plan (not his words):**
- Draw HF4 to his spec (Home first run), phone and PC, dark and light.
- Draw empty-editor options for Full and Simple: today's big area polished, plus 2 new ideas.
- Both after the v18.51 ship's quiet window.
- Animated tutorials are logged as a LATER item, after the redesign.

### 24 Nov 2026, about 12:17 AWST: #1255 his pick for the Home search bar: the recommended HS2 (Search at the bottom)
**His words (verbatim):** Go for the recommended HS2 search bar.

**His clauses:**
1. Home search: HS2, Search at the bottom (home2/HS2-*, HS-REC-*).

### 24 Nov 2026, about 12:18 AWST: #1255 his pick for the Home profile menu: the recommended HP2 (Who you are, then what to do)
**His words (verbatim):** HP2,

**His clauses:**
1. Home profile menu: HP2 (home2/HP2-*, HP-REC-*).

### 24 Nov 2026, about 12:19 AWST: #1255 his pick for how every menu joins its button: D1 (Pointer); he trusts the logger on the opening animation
**His words (verbatim):** D1 is good. Except I can't see the animation along with it, but whatever, I trust you'll do a good job at that.

**His clauses:**
1. Every dropdown joins its button with D1, the pointer.
2. He can't see the opening animation on the page (stills only), but he trusts the logger to do it well.

**Logger's note (not his words):** the recommended opening animation O2 ("pointer first") is taken as his pick on that trust. It plays on the design canvas page "Menus" if he wants to see it.

### 24 Nov 2026, about 12:21 AWST: #1255 his pick for the Create sheet: K3 (Short sheet, the recommended one)
**His words (verbatim):** K3 is good.

**His clauses:**
1. Create a project: K3, Short sheet, with the Simple/Full editor switch beside Create and 60 fps (create/K3-*, K-REC-*).

**Logger's note (not his words):** this settles #1258 clause 2's design. The builder's Simple lane already built the editor choice in today's look; K3's layout comes with the redesign.

### 24 Nov 2026, about 12:24 AWST: #1255 his pick for Home select mode: the recommended HM2 (Header and dock switch roles)
**His words (verbatim):** Go for HM2.

**His clauses:**
1. Home select mode: HM2 (home2/HM2-*, HM-REC-*).

### 24 Nov 2026, about 12:26 AWST: #1255 his pick for the Rename project dialog: the recommended HR3 (Keyboard sheet)
**His words (verbatim):** HR3 is good.

**His clauses:**
1. Rename project: HR3, Keyboard sheet (home2/HR3-*, HR-REC-*).

### 24 Nov 2026, about 12:27 AWST: #1255 his pick for the Delete project confirm: the recommended HX2 (Sheet with the project)
**His words (verbatim):** hx2,

**His clauses:**
1. Delete project confirm: HX2, Sheet with the project (home2/HX2-*, HX-REC-*).

### 24 Nov 2026, about 12:29 AWST: #1255 his pick for Share live: HL2, but its "they tap it — you're both editing" line becomes "Start editing together" (no AI-sounding dashes)
**His words (verbatim):** HL2 is good, but I don't like the text saying they tap it, you're both editing, because it's got like the M dash in it and it just looks written by AI. Just maybe let's go with start editing together.

**His clauses:**
1. Share live (from Home): HL2, Steps are the layout (home2/HL2-*, HL-REC-*).
2. The line "they tap it — you're both editing" looks AI-written because of its em dash. Replace it with "Start editing together".

**Logger's note (not his words):** a standing copy rule: no em dashes in the app's own text, and plain short words. Check every new screen's copy for dashes at integration.

### 24 Nov 2026, about 12:30 AWST: #1255 his pick for Join a friend's project: the recommended HJ3 (One sheet)
**His words (verbatim):** go with HJ3.

**His clauses:**
1. Join a friend's project: HJ3, One sheet (home2/HJ3-*, HJ-REC-*).

### 24 Nov 2026, about 12:33 AWST: #1255 his pick for the Tutorial reader: the recommended HB3 (Sheet from the bottom), "for now"
**His words (verbatim):** Just go with HB3 for now.

**His clauses:**
1. Tutorial reader: HB3, Sheet from the bottom (home2/HB3-*, HB-REC-*), for now. Animated tutorials come later, after the redesign (his about-12:16 note).

### 24 Nov 2026, about 12:36 AWST: #1255 the Full editor on PC: T4r was picked ONLY for its detached add menu; he dislikes the rest (the add-layer row isn't like mobile, the floating playhead); re-pick
**His words (verbatim):** Also with T4, I think the problem with it is that I selected that thinking it was only for how the add menu is like disconnected from the actual thing. I don't like anything else about the rest of it. Like I don't like how the add layer looks because it's like not consistent with the mobile version, and I just don't like where the playhead is, how it's like floating. And yeah, I preferred the other options. If you remember which ones I preferred, change it or just let me pick again. / t4r*

**His clauses:**
1. He picked T4r ONLY for how the add menu is detached from the rest.
2. He doesn't like anything else about T4r.
3. Its add-layer row isn't consistent with the mobile version (T1r).
4. He doesn't like the floating playhead.
5. He preferred the other PC options. Change to those, or let him pick again.

**Logger's plan (not his words):**
- After the v18.51 ship, send one picture of the PC Full-editor options side by side (T2r, T7, T8, T4r) and let him re-pick.
- Keep T4r's detached add menu as a part to carry over.
- Make the add-layer row match T1r on mobile, with no floating playhead.
- His earlier words (20 Nov) were "I like all of the like the first options like the PC version".

### 24 Nov 2026, about 12:40 AWST: #1255 Timeline options FT3, but opening UPWARDS; View options in the same style; rethink the playhead's flag (the marker button)
**His words (verbatim):** See, I do like the looks of FT3. The only problem is it kind of like goes over the timeline, so you might want to keep it open and do stuff while editing. So maybe just make it FT3, but it opens upwards instead of downwards. And then you could do like the same style for the view menu options, because I haven't gotten to that part yet, but like on the other side, the far right of that same bar, you've got the view options. And also I'm noticing as well with the playhead, how it's got it looks like a little flag. My only problem with that is you can't really tell it's a button to press, and it also does look kind of bad. So maybe just like keep everything else the same, just rethink the playhead's little spot that you would tap to add, you know, a benchmark.

**His clauses:**
1. Timeline options: FT3's look, but it opens UPWARDS, not down over the timeline, so it can stay open while editing.
2. View options (the far right of the same bar) use the same style, also opening upwards.
3. The playhead's little flag (tap it to add a marker) doesn't read as a button and looks bad. Rethink just that spot and keep everything else the same.

**Logger's plan (not his words):** after the v18.51 ship, redraw FT3-up and FV in the same style (phone and PC), plus 3 options for the playhead's marker button, and send them to him.

### 24 Nov 2026, about 12:46 AWST: #1255 the PC Full editor: no pick from flawed options; combine what he likes into ONE design
**His words (verbatim):** That screenshot you just sent is not the full picture. That's only like 3 options. I remember seeing others. Like there was one with like a big play button, which I like the look of that. It was like a big white play button. And then also these ones don't have like one of them doesn't have the colorful switch, but obviously I would want the like big switch that's actually got color. And like none of them also have the like add menu actually looking like how the add menu should look. And I don't know, it's just like I don't want to pick between one because they've all got issues.

**His clauses:**
1. There were more options than the 3 sent. One had a big WHITE PLAY BUTTON, and he likes that look.
2. He wants the big switch that actually has colour.
3. None of them has the add menu looking how it should (his A2r).
4. He doesn't want to pick between options that all have issues.

**Logger's plan (not his words):**
- Draw ONE combined PC Full editor:
  - the big white play button (find the round-1 option that had it);
  - the big colourful switch;
  - the A2r add menu, detached as in T4r;
  - an add-layer row like mobile T1r;
  - a docked playhead;
  - FT3 opening up, and FV in the same style;
  - the new marker button.
- Dark and light. Send it as ONE picture to confirm, after the v18.51 ship.

### 24 Nov 2026, about 12:48 AWST: #1255 his pick for View options: FV2, kept as drawn (not opening up over the canvas)
**His words (verbatim):** FV2 is good. I just think it should go up on the canvas. Although, the thing with view options is that you kind of don't want them on the canvas because the view options are meant to go on the canvas. So actually, I think just do FV2, but leave it how it is for now.

**His clauses:**
1. View options: FV2, "Card under the button".
2. Keep it as drawn for now. It does not open up over the canvas, because view options change the canvas and must not cover it. This replaces "FV in FT3's upward style".

### 24 Nov 2026, about 12:43 AWST: #1255 his pick for the cog menu rethink: FC3 (Live canvas)
**His words (verbatim):** I like FC3. I see how you've got it. So it's like you tap on it and then it's like it opens up, the options. It's like, do you want to go to app settings? Do you want to invite friends, editor, or canvas? I like how it looks like that. And then once you tap on it, I like how it opens up. So do that one.

**His clauses:**
1. The cog menu is FC3. Tapping the cog opens a choice of App settings, Invite friends, Editor and Canvas.
2. He likes how it looks, and how each one opens once tapped.

**Logger's note (not his words):** this answers the builder's Settings question (24 Nov 11:25). Hold ST6, ST9 and the rest of ST1 (option A) and build them into FC3.

### 24 Nov 2026, about 12:44 AWST: #1255 FC3 on PC: the settings open as a LEFT panel; first the list of settings, then each one its own page
**His words (verbatim):** Yeah, like on PC, the recommended option where like the canvas settings go onto the left side. As long as you still have an option to get to the other settings as well first. Like maybe you click the settings button and then on the left panel, it shows you the options of what settings you can go to. And then once you click canvas settings, it takes you to that page. And then the others will have their own pages as well, just like it.

**His clauses:**
1. On PC, FC3's recommended layout: the settings go in a panel on the LEFT side.
2. Clicking the settings button first shows, in that left panel, the list of settings you can go to.
3. Clicking Canvas settings opens its page in the panel.
4. The other settings (App settings, Invite friends, Editor) each get their own page the same way.

### 24 Nov 2026, about 12:45 AWST: #1255 Project notes: FN1's notepad look (ticks, not bullets), opening from the bottom like FN2
**His words (verbatim):** I like the idea of the notepad opening up at the bottom, but I still want it to have the same design as the one that opens up in the middle of the screen, kind of. So it's like still looks like a notepad. So because like the original one looks like a notepad, right? Like you've got FN1 that looks good. I like how it's got ticks instead of bells. And I want it to, but I want it to open up how like FN2 opens up at the bottom. So basically just a polished version of FN1. Like you can polish it in other ways as well, if you see fit.

**His clauses:**
1. Notes open from the BOTTOM, as FN2 does.
2. They keep FN1's notepad design: it still looks like a notepad, with ticks instead of bullets ("bells").
3. Basically a polished FN1. Polish it in other ways too, as the designer sees fit.

**His follow-up (verbatim, about 12:45):** And also it opening up on the panel on the left on PC looks good.
4. On PC, notes open in the LEFT panel (as drawn), and that looks good.

**Logger's plan (not his words):** draw FN4 = FN1's notepad as a bottom sheet in the FN2 style, phone and PC, after the v18.51 ship.

### 24 Nov 2026, about 12:46 AWST: #1255 D1 is confirmed for the Layer actions menu only; he is checking the other menus one by one
**His words (verbatim):** D1 pointer looks great. / Oh wait, I just realized D1 pointer is for every menu. I was saying D1 pointer looks good just for the layer actions menu. Let me go through the rest.

**His clauses:**
1. D1, the pointer, looks great on the Layer actions (copy/duplicate) menu.
2. That was for that menu only. He'll go through the other menus (the ••• menu, the parent picker, the Home card •••) one by one.

**Logger's note (not his words):** D1 stays the system default (his 12:19 pick). Record any menu where he wants something else.

### 24 Nov 2026, about 12:47 AWST: #1255 the thin ••• menu's colour row: S3 (Scrub row), over the recommended S1, with haptic ticks in the app
**His words (verbatim):** I actually do like the idea of the scrub row for changing the colors of a layer, because it's like you can just very quickly do it, and then it could also add vibrations when it's an app, and it will be very satisfying.

**His clauses:**
1. The layer colour row in the ••• menu is S3, the Scrub row: quick to change colours.
2. When it's an app, add vibrations (haptic ticks) as you scrub through the colours. Very satisfying.

**Logger's note (not his words):** the haptics need a native wrapper or the web Vibration API, which iOS Safari does not support. Note it for when FreeMotion ships as an app.

### 24 Nov 2026, about 12:49 AWST: #1255 on PC the ••• menu pops up weirdly in the middle; it must open from its own button
**His words (verbatim):** But the way you've got it set out on PC, so you press the 3-dot menu and it opens up on PC, is just so weird. Obviously, it's because you've got it on the version of the PC editor I don't even want. But it's just such a weird, it just looks so weird how it's just popping up in the middle.

**His clauses:**
1. On PC the ••• menu (S-REC desk boards) pops up in the middle of the screen, and that looks weird.
2. Part of it is that it sits on the PC editor (T4r) he doesn't want.

**Logger's plan (not his words):** in the ONE combined PC Full editor (his 12:46 ask), the ••• menu drops down FROM its button at the top right, joined by the D1 pointer, with the S3 scrub row. Draw it in that design after the laptop is free.

### 24 Nov 2026, about 12:52 AWST: #1255 his pick for "Several layers selected": FS1 (today's, polished), over the recommended FS2
**His words (verbatim):** I honestly prefer FS1 today polished.

**His clauses:**
1. Several layers selected: FS1, today's layout polished (editor2/FS1-dark-phone). The recommended FS2 is not used.

**Logger's note (not his words):** FS1 only has a dark phone board. Draw its light and PC versions in the next design gap.

### 24 Nov 2026, about 12:57 AWST: #1255 several layers selected: FS1 on phone, FS2 is fine on PC
**His words (verbatim):** But FS2 on PC is fun. / fine*

**His clauses:**
1. On PC, several layers selected can use FS2 ("Slim dock", editor2/FS-REC-*-desk). He corrected "fun" to "fine". FS1 stays the phone pick.

### 24 Nov 2026, about 12:59 AWST: #1255 his pick for the new group: the recommended FG2 (Group first)
**His words (verbatim):** FG2 is good.

**His clauses:**
1. Group button / the new group: FG2, Group first (editor2/FG2-*, FG-REC-*).

### 24 Nov 2026, about 12:58 AWST: #1255 the parent picker joins its button with D1 (Pointer)
**His words (verbatim):** D1 parent pika is good.

**His clauses:**
1. Parent picker: D1, the pointer (menus/CMP-parent, REC-parent-*). ("pika" = picker.)
