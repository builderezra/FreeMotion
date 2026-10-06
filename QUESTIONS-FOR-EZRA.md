# Questions for Ezra — everything waiting on your answer

Written 7 Oct 2026 on the Mac, at the switch-over to the Windows laptop. Every question here is ALSO logged in its
REQUESTS.md entry (the number). Answer them whenever suits, in any order, e.g. **"Q1 B, Q2 yes, Q5 A"**: the builder
records each answer in its entry and builds from it. Where a question says *recommended*, that is what gets built if
you never answer (his rule 16). Nothing here is urgent unless it says so.

## Tonight's decisions (newest)

**Q1 — Simple editor on a laptop: More panel vs the two rows of tools** (#980)

In the Simple editor on a laptop, when the More panel is open, it and the two rows of clip tools don't both fit. Which way?

- 1: One row while the panel is open (four tools go off the edge), built now
- 2: Keep two rows (the panel's first row of buttons gets cut off)
- 3: One row, with More turned into Done and a › arrow hint
- *Recommended:* 3

_If you say nothing, 3 gets built when release 2.2 ships (rule 16). Picture: tools/design/plans/simple-mode/p22-review-shots/sheet-tray-more-pc.jpg._

**Q2 — 'Full editor never changes' safety check: how far to take it** (#980)

The safety check that stops the Simple editor from changing your original (Full) editor can never be 100% proof. How far should I take it?

- A: Keep hardening it until a review finds nothing (days; every Simple release takes ~77 min longer)
- B: Fix the big holes, ship it as a strong safety net with its known gaps written down, and keep improving it between releases
- C: Drop the check and rely on reviews and tests
- *Recommended:* B

_His rule was 'i dont want the original editor changing in design and function'. B protects that without stalling Simple mode for days, and B is being built in the meantime._

**Q3 — Phone: keyboard-shortcuts list after the ? button goes** (#1065)

With the ? button gone from the phone, should the keyboard-shortcuts list still be reachable on a phone (for example from Settings)?

- A — no, phones just don't have it
- B — yes, put it in Settings
- *Recommended:* A (no)

_Optional. Phones rarely have a keyboard, and the removal gets built either way (ChatGPT already built it as 57a745ea); PC keeps its own ? button._

**Q4 — ChatGPT's fixes: 13 bundled fonts** (#1068)

ChatGPT added 13 fonts to the font picker. Do you want them?

- A — yes, but old projects' titles keep looking exactly as they do now
- B — yes, and switch old titles to the new Inter font too (old text may look slightly different or re-wrap)
- C — no fonts
- *Recommended:* A

_New fonts are a plus, but switching every existing title to the bundled Inter could change how old projects look._

**Q5 — ChatGPT's fixes: its 12 hand-drawn fonts** (#1068)

ChatGPT also drew 12 fonts of its own (Meridian Serif, Lilt Marker, Cloud Pop and others). Want any?

- A — none until I've seen one sheet of them, then only my picks
- B — all 12
- C — none, ever
- *Recommended:* A

_Nobody has looked at them yet, and two of them have no accented letters._

**Q6 — ChatGPT's fixes: redrawn shapes** (#1068)

ChatGPT redrew about 23 shapes, including your heart, thumbs-up and envelope. Use them?

- A — keep today's shapes; I can pick single ones later from an old-vs-new sheet
- B — use ChatGPT's new set
- *Recommended:* A

_ChatGPT's own reviewer said the set "must not be released as final", and some of today's shapes were traced from your own references. The heart pick stays its own question (#929)._

**Q7 — ChatGPT's fixes: background export** (#1068)

Background export lets you keep using the app while it exports. When should it go in?

- A — later, after the no-sound export bug is fixed
- B — now
- C — never
- *Recommended:* A

_It hasn't been tried on your iPhone, and if it fails partway the whole export fails instead of falling back to the old way._

**Q8 — ChatGPT's fixes: colour-grading pack (10 effects)** (#1068)

Which of ChatGPT's 10 colour-grading effects do you want?

- A — the recommended set: yes to Colour Wheels (round pucks on the phone too), Clarity & Dehaze, B&W Mixer and Auto Grade; fold HSL Mixer into the HSL Bands you already have; skip Channel Mixer
- B — all 10
- C — none
- *Recommended:* A

_Channel Mixer duplicates the Channel Remap you already have, and HSL Mixer overlaps HSL Bands; the rest are new._

**Q9 — ChatGPT's fixes: which camera shoots your log footage** (#1068)

For the log-footage converters: which camera do you shoot log on?

- A — iPhone (Apple Log)
- B — DJI
- C — another camera (say which)
- D — I don't shoot log

_The converters only help if they match your camera._

**Q10 — ChatGPT's fixes: name for the log converter** (#1068)

What should the log converter be called?

- A — "Log to Normal"
- B — "Log to Rec.709"

_Rec.709 is the technical name; "Normal" is plainer. The list only asks which is better._

**Q11 — ChatGPT's fixes: audio clean-up tools** (#1068)

Add Reduce Noise and Auto-duck (music gets quieter under speech) to the Volume panel?

- A — Reduce Noise first, Auto-duck after it
- B — both now
- C — neither
- *Recommended:* A

_Reduce Noise is the background-noise removal you were offered before._

**Q12 — ChatGPT's fixes: eight audio effects** (#1068)

Add ChatGPT's 8 audio effects (Graphic EQ, Hum Remover, De-esser, Channel Utility, Stereoizer, Auto-Wah, Noise Gate, Loudness Match)?

- A — yes to all eight, with buttons like the visual effects instead of drop-downs
- B — only some (name them)
- C — none
- *Recommended:* A

_More choice fits FreeMotion; known bugs (like Noise Gate cutting off word endings) get fixed before they land, and Graphic EQ presets will actually move the sliders._

**Q13 — ChatGPT's fixes: "Filter layer" tile** (#1068)

Add a "Filter layer" tile in Add > Elements (one tap puts an empty filter layer over your clip and opens Filters)?

- A — yes, after I pick its icon from 2–3 drawings
- B — no
- *Recommended:* A

_It's a one-tap shortcut for something that takes several taps today._

**Q14 — ChatGPT's fixes: Overdrive filter's sun** (#1068)

The Overdrive filter turns the sun lavender. Fix it so it stays white?

- A — yes (show me a before/after picture first)
- B — no, leave it
- *Recommended:* A

_It looks like a bug, but fixing it changes how existing projects with Overdrive look._

**Q15 — ChatGPT's fixes: smooth edges on diagonal Stripes** (#1068)

Diagonal Stripes (and angled Checker/Grid) have jagged stair-step edges. ChatGPT made them smooth. How should that work?

- A — a "Smooth edges" switch, off by default
- B — always smooth (your old Stripes layers will change)
- C — leave them as they are
- *Recommended:* A

_The switch gets you the smooth version without changing any project you've already made._

**Q16 — ChatGPT's fixes: Poster Print dots** (#1068)

Poster Print only prints black-and-white dots. What should it do?

- A — black dots over posterised colour
- B — coloured dots
- C — leave it
- *Recommended:* A

_It would fold into the planned Halftone mode control._

**Q17 — Rules audit (a): when ChatGPT's checked fixes land** (#1073)

Should ChatGPT's checked fixes go in between Simple-mode releases, or only after Simple mode is finished?

- A — between Simple-mode releases
- B — only after Simple mode is finished
- *Recommended:* A (implied: the land plan in #1068 is written for it; the audit itself names none)

_You said "finish simple mode then the rest in order", which can be read either way. #1068's landing (ChatGPT's 5 proven fixes, batches B1–B8) waits on this._

**Q18 — Rules audit (b): bring back the unblock list page** (#1073)

The unblock-list page's link has been dead since 21 Sep. Put it back up at a new private link?

- A — yes, publish it again at a new link
- B — no, remove it and the rules about it

_It's still the first link at the top of the request log but goes nowhere. #777 also asks whether you deleted it on purpose — one answer covers both._

**Q19 — Rules audit (c): fix your global notes file** (#1073)

Can a session fix your global Claude notes file (~/.claude/CLAUDE.md)?

- A — yes, fix it
- B — no, leave it
- *Recommended:* A (implied: "Say yes and a session will fix it")

_It says "nothing leaves the device", but Work with friends sends data through public relays (so it needs security reviews); it also lists folders that have moved and an old FreeMotion copy that could be edited by mistake. The PC now has a copy of this file too._

**Q20 — Seven spots where beginners get stuck** (#1074–1080)

A helper found seven spots where a beginner gets stuck, and drew 3 fixes for each. Examples: Export hides after your first import on a phone, and a song lands at the playhead instead of at the start. See the pictures first, or just build the recommended fix for each?

- A: Show me the pictures first
- B: Do recommended for all seven
- C: Leave them for now
- *Recommended:* none recommended (your rule is that you see pictures first, unless you say 'do recommended')

_The seven: Export hidden after the first import; the add row hidden while a clip is selected; no sign you've grabbed a clip on iPhone; S stretching a clip instead of splitting it; the 'does nothing here' badge eating the tap; Shadow only turning a full-frame clip black; songs landing at the playhead. You haven't been shown the pictures yet._

**Q21 — Windows: does Save actually save your export?** (#1081)

On your new Windows PC, export a short video and press Save. Does the file save to your computer, or does a Share window open with no way to save it?

- A: It saves fine
- B: A Share window opens and I can't save the file
- *Recommended:* none recommended (this is a check on your PC)

_From reading the code, Windows probably gets a Share window instead of a download. Nobody has tried it on real Windows Chrome yet (the builder's Chrome on the PC runs Linux), and you now export on Windows._

**Q22 — Show the checked tutorials in Home's Tutorials tab** (#1082)

Home's Tutorials tab is empty. Do you want the checked how-to tutorials shown there?

- A — yes, show me some layouts to pick from
- B — no, leave the tab as it is for now

_Three tutorials are checked (first video, trim/split, glow and shadow) and more are being written. A helper has already drawn 3 layouts (on branch design/tutorials-tab; A, cards, marked recommended) that haven't been shown to you yet. If they go public, the before-publishing redesign note applies._

**Q23 — Phone Add menu: which animation is the default** (#1084)

Once you've watched the clips: should the Add menu grow out of where you tap by default, or slide up like now?

- A — new: grows out of where you tapped
- B — old: slides up from the bottom

_Your idea, with a Settings switch so you can go back ("just have a toggle switch to change the two modes"). You pick the default after seeing 2–3 short phone clips of each, which haven't been made yet._

**Q24 — Phone Add menu: speed of the new animation** (#1084)

Once you've watched the clips: how fast should the new grow-from-your-tap animation be?

- A — quick (about a quarter of a second)
- B — a bit slower (about a third of a second)

_You asked for it to be "fairly quick"; the plan's range is 0.26–0.32 seconds, and you choose after seeing the clips, including a slow-motion one._

**Q25 — Push the last Mac-only work to GitHub** (#1085 + 1095 + 1096)

Two pieces of work are still only on the old Mac: the memory fixes and measurements for #1085, #1095 and #1096 (branches suite-mem-fix and suite-mem2). Push them to GitHub from the Mac before it goes idle?

- A: Yes, push them (one line on the Mac: git push ssh suite-mem2 suite-mem-fix)
- B: No, redo that work on the PC
- *Recommended:* A

_suite-mem-fix holds the written fix for the intro film staying in memory (#1096) and the evidence for the 2.2 GB effects-browser leak (#1095). Nothing else is stuck on the Mac: the other branches and the Mac's request list are already on GitHub, so the 'only on the old Mac' warnings on #929, #970 and #980 are out of date._

**Q26 — Work with friends: your private notes reach every guest** (#1090)

When friends join a project, should your Notes-pad notes and reminders stay on your device only?

- A — yes, keep them on my device only (friends who edit won't share notes either)
- B — keep sharing them, and say so on the Share screen
- *Recommended:* A

_Right now every guest, even view-only ones, gets your private notes and reminders, and nothing tells you. Picking A probably makes #987 (note colours) unnecessary._

**Q27 — Work with friends: "Viewer: can only watch" isn't true** (#1091)

Viewers can actually keep a full copy of your project. Which fix?

- A — make it true: with export off, a viewer can't keep a copy when they leave
- B — change the words to "can watch, and keep a copy"
- *Recommended:* A

_Today viewers get all your media, export is on by default, and Leave keeps a full editable copy even with export off. A only changes the buttons: the viewer's device still has the media files._

**Q28 — Laptop can't ship app changes until finger tests run** (#1097)

If the laptop can't run the ~80 real-finger tests, can it ship app changes after the Mac runs just those tests and signs off on the exact same code?

- A — yes, the Mac can sign off on those tests
- B — no, wait until the laptop can run them itself
- *Recommended:* none recommended (the builder tries to get them running on the laptop first; this is the fallback)

_Until those tests run, no app change, including every Simple-mode step, can ship from the laptop, and the Mac can't run a full test pass any more. A means keeping the Mac around as a backup test machine._

## Older questions, still open

**Q29 — Clip lands with no picture** (#129)

Since early September (v15.69), has a screen recording, or any clip, landed on the timeline with no picture?

- A: No, it hasn't happened since
- B: Yes. Then open Settings → A clip with no picture → Copy, and paste it

_The app now records the file's name and what your phone can play. One paste tells which of two fixes it needs, and you don't need to know anything about the file._

**Q30 — Is the app still laggy?** (#Editing lags (unnumbered) + 202 + 692)

Since late September (v16.95), is playing and editing still laggy on your phone, or is it fine now?

- A: Fine now
- B: Still laggy. Then put a few effects on a video layer, go to Settings → What's slow → Measure, press play, let it play for the 10 seconds, then Copy and paste it

_One answer closes three entries: 'Editing lags', #202 and #692. The report has to be taken WHILE PLAYING, or it can't see the slowdown._

**Q31 — Does a saved export have sound?** (#215 + 604 + 677)

Export something short with sound on your phone, save it to the camera roll, then play it from Photos. Does it play with sound?

- A: Yes, it has sound
- B: No, it's silent or locked on mute (then also paste Settings → Your last export)

_The export wrote a real sound track on 10 Sep, so what's left is whether the saved file plays with sound. One answer closes all three entries._

**Q32 — Gradient Overlay starting strength** (#482)

When you add Gradient Overlay, how strong should it start: keep 0.8, or make it gentler at 0.5?

- A: Keep 0.8 (what it is today)
- B: Gentler 0.5
- *Recommended:* B: Gentler 0.5

_0.5 lets more of your photo show through. The picture of both is tools/design/482/gradient-overlay-amount.png, and the default stays 0.8 until you pick._

**Q33 — Filters tab layout (batch 4)** (#482)

For the new Filters tab, which layout do you want: A, B or C?

- A: Two rows, with everything showing
- B: One row, with Clear and 'Add to all clips' tucked into a ▾ menu
- C: A 'This clip / All' switch before Add
- *Recommended:* A

_All three keep Strength, hold-to-compare, search and 'Your filters'. A shows everything with no hidden menu, and A gets built if you say nothing. Pictures: tools/design/482/batch4._

**Q34 — Opening a project: still janky?** (#508)

When you open a project on your phone, is it still janky? (It should be smooth: the card glides out left while the project slides in from the right.)

- A: It's smooth now
- B: Still janky. Then open a project, go to Settings → Reports → Your last project open → Copy, and paste it
- *Recommended:* none recommended (this is a check on your phone)

_You said on 1 Sep that it was still bad. It measures smooth on the Mac, so only a report from your phone can show which frames run long. You can do this in the same go as the scrubbing check (#768)._

**Q35 — Template fill-in screen: is it right?** (#619)

On Home → Templates, tap a template's ⋯ → 'New project from template', then tap each slot (a clip, a caption, a shape) and put in your own. Is that what you asked for?

- Yes, that's it
- No (say what's missing)

_This was wrongly ticked done once before (#343), so it stays open until you've seen it. Tapping the card itself now opens the template for editing, per your 1 Sep answer on #505._

**Q36 — Sound still cutting in and out?** (#663)

Since late September (v16.94), does sound with effects on it still cut in and out on your phone?

- A: No, it's fine now
- B: Yes. Then play it until it glitches, stop, go to Settings → Your last playback → Copy, and paste it

_Two audio faults were fixed in v16.94. One answer closes this and #845._

**Q37 — Add menu opening twice?** (#676 + 706)

Does the Add menu still open twice on your phone?

- A: No, it's fixed
- B: Yes: it slides up, drops, then slides up again
- C: Yes: it opens once, then a second copy lands on top

_Two fixes went in after you reported it (v15.08 and v16.94). If it still happens, whether it looks like B or C decides the next fix._

**Q38 — Animated colour on text and video clips too?** (#679)

When a shape's colour is animated, its bar on the timeline shows the colours changing along it. Do the same for text and video layers?

- Yes
- No
- *Recommended:* Yes

_It was your idea ('when you change the colour of a layer the layer colour on the timeline…'), and right now it only works for shapes._

**Q39 — Scrubbing with a layer selected: still jumpy?** (#768)

On your phone, with a layer selected, is dragging along the timeline still jumpy?

- A: It's smooth now
- B: Still jumpy. Then scrub once with a layer selected, go to Settings → Reports → Your last scrub → Copy, and paste it
- *Recommended:* none recommended (this is a check on your phone)

_Your words: 'Scrubbing when you have a layer selected mobile is jumpy and not smooth'. v16.94 fixed two likely causes that a real finger found. If it's still jumpy, the report shows what is slowing it down, so the next fix isn't a guess._

**Q40 — Narrow PC window: buttons slide under each other** (#775)

On a narrow PC window (under about 1000px wide), the buttons at the ends of the play row slide under the middle ones, so a click can land on the wrong button. Once, it closed your project. Which fix?

- A: Hide the version label and the ? button at narrow widths
- B: Fold help, view options and settings into one ⋯ button
- C: Use the phone's play row below about 1050px
- *Recommended:* A

_A removes the two buttons nobody presses, and nothing else moves. v17.13 (#979) may already have fixed the overlap, so the builder re-checks a 900px window before showing you this, and drops it if nothing overlaps. It matters more now that you work on a Windows laptop._

**Q41 — Bring back the questions page?** (#777)

The page that gathered all your questions in one place stopped working on 21 Sep. Did you delete it on purpose, and do you want it back at a new private link?

- A: Yes, publish it again at a new link
- B: No, leave it gone
- *Recommended:* none recommended (the entry says it's your call)

_Publishing without your say-so could leave you with two pages and no way to tell which one is live. The page's source is kept up to date in the meantime._

**Q42 — Pinch on a corner square: resize or drag?** (#834)

On your phone, select a layer and pinch it with two fingers, with one finger starting right on a little corner square. Does the layer resize, or does it just drag around?

- A: It resizes (works fine)
- B: It drags the layer instead of resizing
- *Recommended:* none recommended (this is a test on your phone)

_The bug report did not match the code. Guessing a fix to the most-used gesture on the phone is risky, and one real try settles it._

**Q43 — Phone: does sound with effects still glitch?** (#845)

Does sound with effects on it still glitch on your phone (two audio faults were fixed in v16.94)? If yes, play it until it glitches, stop, then go to Settings → Your last playback → Copy and paste it to me.

- A: No, it's fine now
- B: Yes, still glitches (and paste the 'Your last playback' report)
- *Recommended:* none recommended (this is a check on your phone)

_In his words: 'They start to glitch out on my phone.' The old report was taken by a broken tool, so one fresh paste tells a sound cut-out apart from a frozen app. Those two need opposite fixes. #663 and #96 close on the same answer._

**Q44 — Cloud backup loop so the builder survives a closed chat?** (#847)

Do you want a cloud 'backup loop' that keeps the builder ticking even when the chat is closed or the app restarts?

- Yes, set up a cloud routine
- No, just re-start the loop in a new chat when needed
- *Recommended:* No

_A cloud agent works from a GitHub copy, can't see your local INBOX.md, and would push at the same time as the local chat. Now that you've moved PCs, the loop has to be started again in the new PC's chat anyway._

**Q45 — Pro version: how does the AI assistant get its key?** (#856)

Your words: 'our own inbuilt but hidden API keys … cause we don't want people stealing them.' A key built into the app can't be hidden. So for Pro, which way?

- A: Keep everything on the device. People use their own AI key, and Pro unlocks features instead of a key
- B: Run a small server of ours for Pro users (costs money per user, needs accounts, and the app stops being local-only)
- C: Leave the whole idea until after launch (with #855)
- *Recommended:* A

_A is the only option that needs no server, no bills and no accounts, and it keeps 'nothing leaves the device'. The Assistant already works today on your own key whichever you pick._

**Q46 — A screenshot of an icon not showing** (#860)

Next time you see an icon not showing properly, can you send one screenshot of it?

- A: Yes, I'll send one when I see it
- B: It doesn't happen any more

_Your words: 'the icons don't display properly'. Three hunts on PC checked all 37 icons and couldn't find it. One picture of it happening is what turns this into a fix._

**Q47 — Send your ChatGPT chat logs?** (#882)

On 20 Sep you offered to send your ChatGPT chat logs from 12–19 Sep. Do you still want to? They might contain requests you made there that never got written down.

- A: Yes, I'll send them
- B: No, skip it
- *Recommended:* A (the entry says they're worth having, for that reason only)

_Your words: 'send you chatgpts chat logs'. The one thing that would really be lost is a request you typed to Codex that never reached the request list._

**Q48 — Flash (darken): fix or remove the 'Darkest' slider** (#904)

On Flash (darken), the 'Darkest' slider does nothing for most of its range. Fix it or remove it?

- A: Make Darkest really set how dark each flash gets (your 10 built-in TikTok-look presets get noticeably lighter)
- B: Remove Darkest and keep the look you have now (Depth already does that job)
- *Recommended:* B

_With B, nothing you've already made changes. The v17.19 polish batch deliberately left Darkest alone while it waits for you._

**Q49 — Blink: its speed number is double the real speed** (#904)

Blink's 'Rate' shows double the real speed ('2 Hz' really blinks once a second). How should I fix it?

- A: Make the number honest but keep every existing Blink looking the same (slider can then reach a real 12 a second)
- B: Make the number honest and let existing Blinks speed up to match what they say
- C: Leave the speed alone, just change the label so it stops saying Hz
- *Recommended:* A

_With A, nothing you've made changes, and the number finally means what it says, so matching a blink to a beat works._

**Q50 — Snow & Rain: bigger flakes by default?** (#911)

Snow & Rain's flakes start at size 5, which looks tiny on a phone. Should new ones start at size 8? (Ones you've already made stay at 5.)

- A: Yes, start new ones at 8
- B: Leave it at 5
- *Recommended:* A

_You picked Snow & Rain yourself. At 5 the flakes barely show on a phone screen._

**Q51 — Ten new filters: which ones?** (#912)

Ten new filters are built and waiting for your pick: Sepia, Digicam, Portrait Film, Moody, Cyberpunk, Tungsten, Airy, Colour Splash, Cyanotype and HDR. Which do you want?

- A: All ten
- B: Only some (name them)
- C: None

_Your words: 'add some more filters'. The ones you don't pick get deleted, and the rest ship. The picture sheets were sent in chat on 22 Sep, but they aren't saved in the repo, so they need redrawing on the PC._

**Q52 — Phone Add menu: see-through glass or solid?** (#917)

On the phone, the Add menu is see-through glass, so the timeline shows faintly through it. Make it more solid, or keep the glass?

- A: More solid
- B: Keep the glass

_This is a look choice, not a bug. Everything on screen still works._

**Q53 — Custom colour box looks like a second Black** (#917)

In New project and Canvas settings, the custom colour box starts black, so it looks like a second Black swatch. On PC it also sticks out past its column. Give it a rainbow ring like the shape-colour swatch in Settings, or leave it?

- A: Rainbow ring
- B: Leave it

_One answer covers both the phone and the PC (#918 finding 11 asks the same question)._

**Q54 — Effect option rows wrap untidily on small phones** (#917)

On small phones, some effect option rows leave one button alone on a second line. Put the labels above the buttons on phones, or leave it?

- A: Labels above the buttons on phones
- B: Leave it
- *Recommended:* A

_With the label on its own line, the buttons get the full width and stop wrapping._

**Q55 — Top of the screen: fade and black bar gone?** (#920)

Since v17.07, look at the top of the screen on your phone: on Home (light and dark), inside a project, and going in and out of projects. Is the fade gone, with no black bar in light mode?

- A: Yes, it's gone
- B: Still there (say where: Home light, Home dark, or in a project)
- *Recommended:* none recommended (this is a check on your phone)

_Your words: 'the fade at the top of the screen is still an issue'. The v17.07 fix was tested in real WebKit on the Mac but never on an iPhone. No screenshot needed: you said not to ask for more._

**Q56 — Work with friends: try one real invite** (#921 + 967)

Try Work with friends once: send yourself an invite link from your phone to your new PC (or to another phone), and join with it. Did it work?

- A: Yes, it worked
- B: No (say what you saw)
- *Recommended:* none recommended (only you can do this test)

_Your words: 'you can't even send it to your friends'. The link has to go through public helper servers that the Mac blocks on purpose, so only a real try can prove it. If it works, the feature stops being experimental and #921 and #967 close._

**Q57 — Which heart shape?** (#929)

Which heart shape do you want?

- A: Today's heart with the bulge near the bottom fixed
- B: Google's heart
- C: Textbook heart
- *Recommended:* A

_In his words: 'the line bulges out near the bottom of the heart and doesn't look good.' A keeps your heart and fixes the bulge. Note that the heart picture sheet (tools/design/929-heart.jpg) is only on branch fm-design-929 (d744d375) on the old Mac and is NOT on GitHub, so it must be pushed or redrawn on the new PC before it can be resent._

**Q58 — Heart's little picture in the Shape menu: outline or filled?** (#929)

In the Shape menu, should the heart's little picture be an outline or filled in? (Either way, it will finally match the heart you actually get.)

- Outline
- Filled
- *Recommended:* Outline

_In his words: 'in its little icon picture … it doesn't look the same as when you actually add it.' The tile will now be drawn from the heart's own shape._

**Q59 — Linking a layer whose animation won't fit** (#937)

When you link a layer to a new parent and its animation can't be kept exactly under that parent, the app still links it and shows a message saying so. Grouping in the same situation leaves that layer out. Keep linking the way it is, or make linking refuse too?

- A: Keep it as it is (link it, with the message)
- B: Make linking refuse, like grouping
- *Recommended:* A (Keep)

_You asked for the link, so the app does it and tells you. Refusing would match grouping, but your link wouldn't happen._

**Q60 — Templates/Elements: what the + button opens** (#948)

In the Templates and Elements tabs, what should the + button open? (Your words: not the 'shitty tiny menu'.)

- A: One card: 'Start from scratch' with shape chips, plus a sideways row of your projects
- B: Two big picture tiles; 'From a project' slides to a full page of your projects
- C: A sheet from the bottom with three rows, including 'Open a file'
- *Recommended:* A

_All three were drawn and sent on 26 Sep (tools/design/948-options.html, on GitHub). Every option also adds a blank template start._

**Q61 — Make elements and templates their own things: 3 fixes** (#948)

Your words: 'I do want elements and templates to be their own things, not just reskinned projects.' Do you want these three fixes? (2) A new element saves itself as an element when you leave, with no hidden 'draft' project. (3) While editing an element or template, a slim 'Editing element: … · Done' bar and no Export button. (4) Elements and templates get their own share files, not project files.

- Yes, all three
- Only some (say which: 2, 3 or 4)
- None
- *Recommended:* Yes, all three

_Each one removes a place where an element or template still acts like a project. Fix 1 comes with any + menu option, and fix 5 is #619._

**Q62 — Rename effects away from Alight Motion: the 40 renames** (#954)

40 effects have names that are clearly Alight Motion's. Are my 40 new names OK, or which ones should I cross out? (Sheet: tools/design/954-options.html)

- All 40 are OK
- Cross some out (say which)
- *Recommended:* none recommended (the sheet proposes all 40)

_In his words: 'i want every effect to be named different to what it is in alight motion … to avoid getting taken down'. Old names stay as search words, and saved projects don't change._

**Q63 — Rename effects: the 70 plain names** (#954)

70 effects have plain, common names that any editing app uses (like Blur). Keep them, or rename those too?

- Keep them
- Rename them too
- *Recommended:* Keep them

_These are ordinary craft words, not Alight Motion's own names._

**Q64 — New order for the effect categories** (#954)

Is the new order of the effect categories on the #954 sheet OK?

- Yes, use the new order
- No (say what to change)
- *Recommended:* none recommended (the sheet proposes one order)

_In his words: 'have different ordering'. Alight Motion's own order isn't published anywhere I could reach, so a new order was proposed anyway._

**Q65 — Your other page of questions** (#956)

You asked me to remind you about a page of questions made by another chat (claude.ai/artifact/4hddzpLiJvQvkUifK2sdw5). Have you gone through it, or does this list replace it?

- A: Done, or this list replaces it, so drop the reminder
- B: Still to do, keep the reminder

_Your words: 'make note that I still need to go through it and answer everything'. Nobody here could open that link, so nothing gets decided from it without you._

**Q66 — Empty-project clapperboard: which timing?** (#957)

In an empty project, the clapperboard animation picks one of three timings at random. Which one do you like?

- A: Claps when the empty project opens, then every 6 seconds
- B: Claps once
- C: Keeps clapping (slowed to every ~3.6 seconds in v17.13)
- *Recommended:* A

_Your words: 'make them all happen in the app but it's just random which one so I can decide'. Once you pick, the other timings are deleted._

**Q67 — Empty-project clapperboard: line colour** (#957)

The little impact lines when the clapperboard claps are randomly cyan or grey. Which do you like?

- A: Cyan
- B: Grey
- *Recommended:* A (cyan)

_Both are live in the app right now. Pick one and the other is deleted._

**Q68 — Tap animation on the empty add area: which colour one?** (#964)

When you tap the big empty add area, three colour animations now play at random. Which one do you like? (The other two get deleted.)

- A: Aurora
- B: Rings and sparks
- C: Key ripple
- *Recommended:* A (Aurora)

_His words: 'make them all happen in the app but it's just random which one'. All three are live in the app now (v17.12/v17.13), so he can just try them on his phone._

**Q69 — Glowing edge lights: where should they start?** (#964)

When you tap the empty add area, where should the glowing edge lights start?

- A: Bottom-middle, racing up both sides to meet at the top
- B: The edge nearest your finger
- *Recommended:* A (bottom-middle)

_Both are live and chosen at random now. Pick one and the other is deleted._

**Q70 — PC: version chip covers the ⋯ button with two layers selected** (#970)

On a PC window about 1160–1380 wide with two layers selected, the version chip covers the ⋯ button so you can't click it. Which fix?

- A: Move those buttons to a band under the row at those widths (built; the video is 40px shorter there, always)
- B: Keep one row, and only add the band while two or more layers are selected (the row jumps when you shift-click a second layer)
- *Recommended:* A

_A was measured to leave nothing covered at any width. Note that the fix lives only on branch fix-970 (bebd4560) on the old Mac, is NOT on GitHub, and needs rebasing, so push it before it's lost._

**Q71 — PC: arrows on the template media row too?** (#976)

On PC, a template's 'Insert your Media' row shows the ugly white scrollbar when it has 8 or more slots. Give it the same ‹ › arrows as the effect rows?

- Yes
- No
- *Recommended:* Yes

_It's the same fix you already got on the effect and filter rows (v17.12), so every sideways row on PC works the same way._

**Q72 — PC: make the other white scrollbars dark?** (#976)

On PC, the inspector's up-down scrollbar and the timeline's sideways scrollbar are also bright white. Make them dark to match the app?

- Yes
- No
- *Recommended:* Yes

_It's a one-line change, and it gets rid of the last white bars you called 'tacky'._

**Q73 — Home: Join button becomes an icon** (#982)

Which icon should replace the word "Join" on Home's top bar?

- A — an arrow going into a doorway
- B — an open door
- C — an arrow going into a person
- D — an arrow through a chain link
- Or just say "do recommended"
- *Recommended:* A

_A is the sharpest at phone size and looks like none of the other buttons; B blurs when small, C looks almost the same as Share, D reads as "copy link". If you don't answer by the time it comes up, A gets built._

**Q74 — Export menu that makes sense at first glance** (#985)

Which new Export menu design do you want?

- A — "What you'll get": a picture of your video and its file size, 5 buttons for what to make, 4 plain rows each marked Recommended, expert stuff one tap away in More options
- B — "Pick a goal": 6 tiles like Best quality, Smaller to send, GIF, Picture, Sound only, Frame by frame; Fine-tune opens the exact controls
- C — "Sliders + size": a Video/GIF/Picture/Sound/Frames switch, the file size in big type, 3 sliders with a star on the recommended spot
- Or just say "do recommended"
- *Recommended:* A

_Your words: "I dont want to lose any function but i want it to actually make sense at first glance." All three keep every one of today's 34 settings; A shows what you'll get before you touch anything._

**Q75 — Collab: colour on each note showing who left it** (#987)

How should a note show who left it when you edit with friends?

- A — a coloured dot plus their name
- B — a coloured stripe down the note
- C — their face (the coloured circle with their initial)
- Or just say "do recommended"
- *Recommended:* C

_C matches the coloured face circle already used for people on the video and in Comments. Note: if you pick "owner-only" for #1090 below, friends stop sharing notes at all, and this one may no longer be needed._

**Q76 — Mosaic Average mode: dark edge around cutouts** (#1056)

Mosaic's Average mode puts a dark edge around cutouts. Fix it, even though old projects that use it will look a bit different?

- A — yes, fix it
- B — no, leave it as it is
- C — show me a before/after picture first

_The fix makes cutout edges stay their real colour instead of darkening, but saved projects would render differently, so it waits for your OK (the write-up says it needs its own before/after picture)._

**Q77 — Three bigger effects: want pictures first?** (#Effects plan (unnumbered))

Three bigger new tools are waiting: Corner Pin (drag a clip's 4 corners to stick it onto a screen or sign), LUT import (load a colour-grade file from another app) and Curves (drag a line to shape brightness and colour). Want pictures of what each does, so you can pick?

- A: Yes, draw them for me
- B: Not now
- *Recommended:* A (the 30 Sep list's pick: 'show me')

_In August you said 'idk what any of those are'. That was the fault of how it was asked, so this time you get pictures, not names. Each one is a day or more of work._

## For the builder: questions found ALREADY ANSWERED or moot (strike their ❓ASK lines; do not ask him again)

- #482 — Raise the effect slider limits: The unstruck 'One word, "raise them"' at L13113-13114 is answered at L13171: HE ANSWERED, 1 Sep: "raise them and just keep going with whatever you can like bug fixing and stuff". Built in v14.81 and v15.79.
- #482 — Open up the speed sliders too: The offer at L13168-13169 ('Say the word if you want the speed controls opened up too') was decided at L13317 and in POLISH-LOG v17.15. It is an optional veto, not a waiting question.
- #692 — Faster blurs, keep the rim?: The unstruck 'Say the word and all three get fast' at L27581 is answered at L27560: HE ANSWERED, 1 Sep: "Do it, but keep the rim as an option." Inner Blur was built in v14.94 with a 'Colour past the edge' option, and Zoom and Spin Blur were bounded in v15.61.
- #215 — Where did the export's sound come from?: The ask at L9723-9726 is answered at L9851-9852 (21 Aug): "I exported a video that was making audio in the project, it would have normal settings and just be an mp4 video to camera role export". #677 (L26985-26987, 30 Aug) adds a case with two of the app's sound effects only.
- #202 — Shrink the big project and retest: The ask at L10168-10170 was superseded by v11.88 (L10185-10194: a 'This project is 12.2 megapixels, tap to fix the lag' toast that opens Canvas settings), and by the current ❓ASK at L10299, which is the 'Is the app still laggy?' item above.
- #834 — Sketching bar: Cancel renamed to Close (already built): L29941: '✅ v17.15 (queue 834 partial): clause 20 built as B — the Sketching bar's button reads Close … Say “A” to make Cancel really discard.' Clause 20 is ticked (L29939).
- #929 — Human shapes: airport-sign style: L32896 '✅ **HE ANSWERED 26 Sep …:** *"Do the airport sign"* (2026-09-26T02:25Z) — the people half, built v17.02 (clause 1). Only the heart is left.'
- #949 — Standing note: logging chat vs builder chat: L33282 'STATUS: 📌 NOTE — nothing to build'. The builder's note at the entry's end says 'Nothing to build here — this is a standing arrangement.'
- #953 — Housekeeping audit (no question of its own): L33382 'STATUS: 📌 NOTE — nothing to build'. Its critic's note says optional vetoes were 'deliberately NOT put to him, because nothing waits on them and he said to stop asking'. Last line: '✅ v17.05 (part): status.sh's LABEL now has …'.
- #964 — How long the add menu waits after the tap: L33764 '✅ HE ANSWERED ASK 2 (how long the menu waits), 29 Sep: no wait — the menu pops up straight away, with the glowing border lines on its edges as it opens.'
- #980 — Six Simple-editor choices made as 'recommended' for you: L34480 'ANSWERED BY EZRA (recommended, via the logging chat) 5 Oct — his words above ("lets use it to finish simple mode then the rest in order"): D3 A, D14b A, D18 A, D22 A, D23 A, D24 B, and the first Delete in an old project leaves a Full-made song whole. He did not type "do recommended"; tell hi
- #980 — Simple editor on PC: clip tools on two rows: L34523 '✅ HE ANSWERED (6 Oct, ~06:25, in chat): *"do reconmended"* → **B, two rows, every tool on show**.'
- #1071 — Laptop move: Windows or Mac?: REQUESTS.md:35426 asked; answered at :35437, his words: "its a windows laptop…"; logged as answered at :35439.
- #1071 — Laptop move: tests one machine can't run: REQUESTS.md:35469 asked; :35472 "✅ HE ANSWERED the OS-specific-tests ❓ASK: 'whatever you think is best' → the recommended answer".
- #1071 — Laptop move: how v17.24 gets shipped: REQUESTS.md:35475 asked (7 Oct ~02:15). SWITCHOVER.md:3-6: the PM "picked the route below on his behalf: the laptop ships v17.24 itself", based on his "look yeah whatever you think is best" (REQUESTS.md:35447); SWITCHOVER.md §2 calls FM_SHIP_ALLOW_NON_MAC "the switch-over decision (Ezra, through the
- #1073 — Rules audit: Spotlight exclusion on the Mac (your hands): REQUESTS.md:35525 ("Also his hands: Spotlight Search Privacy…"); RULES-AUDIT.md:8; SWITCHOVER.md §7 ("Once the laptop has shipped, the Mac is the backup only"); his message this run: "we have moved over to my other pc now".
- #1083 — PC: hidden back button in the top left: REQUESTS.md:35586 asked; :35608 his words (verbatim): "B"; :35613 "✅ HE ANSWERED the ❓ASK (6 Oct ~10:50): 'B'".
- #882 — Old Mac: the Xcode fix line: REQUESTS.md L31203: clause 3 ❓ ASK, unticked. L31210 (30 Sep): the sudo line has not been run. #953 L33423: the critic recommended 'run it'. SWITCHOVER.md §7: 'Once the laptop has shipped, the Mac is the backup only'. His message this run: 'we have moved over to my other pc now'.
- #1071 — Switch off the old Mac's loops: tools/design/pm/PM-STATE.md L147 (07:30): 'the Mac builder was told to CronDelete its loop, ship nothing, park #1085, and stay as backup'. L148 (07:38): 'The Mac PM cron stays on until Ezra says the PC PM is running; then CronDelete 76fc9473.' SWITCHOVER.md §3.3: 'The Mac then stops its loop and sta

## What is queued to build (tools/next.sh, 7 Oct)

His own requests first, oldest first. #980 Simple mode is worked ahead of the rest by his own words; the builds waiting on a
question above are marked in REQUESTS.md as built out — waiting on him.

```
=== UNNUMBERED (pre-date the numbering, so these are the OLDEST) ===
  line 3538: Editing lags, and gets bad fast.
  line 5400: Continue the EFFECTS-PLAN build rounds.
  line 5673: The visual identity pass before any public release.
=== NUMBERED, oldest first ===
47	(line 5055)	Export must not lose the render on a crash, and should get off the mai
129	(line 288)	A 2-second screen recording adds a clip with NO VIDEO. PARTLY ANSWERED
202	(line 10037)	One simple video layer lags badly, and the video does not load properl
206	(line 9598)	Shapes need SENSIBLE edit points, not a million dots. ⚠️ HELD — he is 
215	(line 9624)	⚠️ EXPORTED VIDEO CAME OUT WITH NO AUDIO, though the clip had audio. H
352	(line 10629)	✅ DONE v11.31. Clean up this file: get rid of what is not needed. (17 
482	(line 13085)	🔵 THE BIG ONE, IF I WANT IT: go through EVERY effect and improve it. (
506	(line 18663)	Standing instruction: log everything he says, and work the list in ord
508	(line 18700)	Opening a project is janky: the card should glide out left while the p
532	(line 19562)	Standing instruction, restated: log everything and work oldest-first. 
545	(line 20148)	🔒 STANDING RULE: use Claude Design for every future design request. (2
591	(line 24302)	Standing steer: stop waiting on his answers, there is plenty I can alr
604	(line 21565)	🔴 EXPORTED VIDEO STILL HAS NO AUDIO — on PHONE and PC (his 27 Aug repo
619	(line 22626)	🔴 Pressing a template just forks it into a project. It should offer to
663	(line 26481)	Audio still cuts in and out on mobile (the popping itself seems fixed)
676	(line 26944)	Opening the add menu opens it TWICE. (30 Aug.)
677	(line 26980)	🔴 STILL NO AUDIO IN AN EXPORT — and this time the whole soundtrack was
690	(line 27379)	Standing direction, 31 Aug, RESTATED 1 Sep (verbatim):
692	(line 27450)	🔴 THE LAG HAS A MEASURED CAUSE: every pixel effect walks the WHOLE FRA
694	(line 27786)	Standing instruction, 1 Sep (verbatim):
702	(line 28118)	Standing instruction, 1 Sep (verbatim):
703	(line 28130)	Standing instruction, 1 Sep (verbatim):
706	(line 28189)	PHONE: the Add (layer) menu opens TWICE. Logged 2 Sep, mid-task, verba
708	(line 28341)	Standing instruction, 2 Sep (verbatim):
713	(line 28461)	Standing instruction, 2 Sep (verbatim):
768	(line 29058)	PHONE: scrubbing with a layer selected is jumpy, not smooth (2 Sep)
775	(line 29138)	Go through the menus on PC (and the effects / filters switching on PC 
777	(line 29236)	Keep the unblock list up to date. (5 Sep, as the session handed over.)
778	(line 29308)	New chat, 5 Sep: build a system that never stops, never forgets the ru
845	(line 30122)	PHONE: audio glitches once EFFECTS are added to a sound (hunt HIGH #10
846	(line 30148)	Standing instruction, 10 Sep (verbatim):
847	(line 30167)	Keep the loop running non-stop, ticking every minute. (10 Sep, his wor
855	(line 30403)	⚠️ HELD FOR BEFORE LAUNCH, by his own instruction: the "What do you wa
856	(line 30437)	An AI you can TALK TO that does the edit for you, like CapCut. He expl
860	(line 30723)	Durability / stress testing, especially on PC: try to break it, and th
862	(line 30815)	STANDING INSTRUCTION: keep the loop running, take the time to get it r
870	(line 31108)	Standing instruction: the ChatGPT/Codex takeover brief. (12 Sep, via I
871	(line 31115)	Standing instruction: do not butt heads with the other session. (12 Se
872	(line 31121)	Standing instruction: stop asking permission. (12 Sep, via INBOX. His 
875	(line 31131)	Standing instruction: BUILD more, test proportionately. (12 Sep, via I
876	(line 31140)	Standing instruction: preferences must survive a new chat. (12 Sep, vi
877	(line 31146)	Standing instruction: keep the loop running. (12 Sep, via INBOX. His w
879	(line 31154)	Standing instruction: usage discipline. He burned a week of quota in o
880	(line 31164)	Standing instruction: the 20 Sep restart brief (back on Claude from Ch
882	(line 31190)	❓ QUESTIONS FOR HIM — the loop's cadence and cost, and the Xcode fix. 
912	(line 32381)	"you have nothing to do?" — more filters, a bug hunt, a visual-issue c
920	(line 32688)	THE FADED BAR AT THE TOP IS STILL THERE: a white bar on the light scre
921	(line 32757)	LIVE COLLABORATION: two or more people editing the SAME project at the
923	(line 32816)	🔒 NEEDS HIS APPROVAL BEFORE ANY BUILD: an easy editor and a deep edito
929	(line 32884)	The HUMAN shapes are still bad (use real reference shapes found online
948	(line 33271)	Templates and Elements: + opens a proper, designed menu; and they are 
949	(line 33281)	Standing instruction: a second chat LOGS his requests (with a brainsto
954	(line 33426)	Rename EVERY effect away from Alight Motion and change the category or
956	(line 33443)	Reminder: a page of questions he still has to go through and answer (m
964	(line 33700)	Empty project, phone: tapping the big add area is glitchy — the blue o
966	(line 33817)	Standing instruction: when there is nothing else to do, add new effect
967	(line 33849)	Live collaboration feels extremely underbaked on his phone: pull it al
980	(line 34274)	BUILDING PHASE 1 (his D15 A, 1 Oct — planned first, from the revised p
982	(line 34542)	Home: the Join button becomes a simple ICON instead of the word “Join”
985	(line 34576)	The Export menu's settings should make sense at first glance to someon
987	(line 34626)	In a collab edit, each note shows a colour indicator of WHO left it (2
1065	(line 35290)	Remove the ? (keyboard shortcuts) help button from the MOBILE version 
1068	(line 35323)	Land ChatGPT's verified pile in batches B1–B8, between Simple-mode rel
1070	(line 35393)	The test browsers play sound through his speakers: add --mute-audio (5
1071	(line 35408)	Move the work to his more powerful Windows laptop (another time, not t
1072	(line 35476)	His second (free) Claude account gets a tutorials job, on a lower mode
1073	(line 35487)	Rules audit: no rule should be slowing us down or causing issues (6 Oc
1083	(line 35571)	PC: a second, hidden back button in the top left that shows on hover (
1084	(line 35615)	Phone: the Add menu grows out of where you tapped (a second animation 
1097	(line 35722)	The laptop cannot ship ANY app change until the ~80 real-finger tests 
--- audit findings (mine, not his words) — queued behind everything above ---
834	(line 29888)	Twenty more findings from the same hunt, seen by one reader only (hunt
904	(line 32041)	54 effects are missing a control, or show one that does nothing. The c
917	(line 32604)	#912 audit: Visual issues — PHONE layout (380 / 320) — 17 findings. (h
918	(line 32645)	#912 audit: Visual issues — PC layout (1280 / 900) — 15 findings. (hun
953	(line 33381)	Housekeeping from the logging chat's open-questions audit: answers nev
970	(line 34006)	PC ~1160–1386px wide, two layers selected: the ⋯ layer-options button 
996	(line 34774)	Two render tests fail TOGETHER, only in the full phone pass: the sheet
1000	(line 34835)	A stale second tab writes its old media over a newer replaced file (hu
1001	(line 34840)	An import that throws leaves an empty "Imported project" behind (hunt 
1002	(line 34845)	A collaborator's bad edit can half-apply on the host's copy and crash 
1003	(line 34850)	Duplicate says "done" even when it could not read a clip (hunt LOW #10
1004	(line 34855)	A project file that will not open gets overwritten with a blank one (h
1005	(line 34860)	The boot cleanup deletes media that belongs to an unreadable project (
1006	(line 34865)	Opening a pre-v2.25 install with a full disk deletes the only scene (h
1007	(line 34870)	Opening a huge project file has no size warning (hunt LOW #1007) (1 Oc
1008	(line 34875)	Group rendering rescans the whole scene once per group, every frame (h
1009	(line 34880)	Image fills from a previous project stay in memory all session (hunt L
1010	(line 34885)	The no-GPU blur fallback allocates two big buffers per call (hunt LOW 
1011	(line 34890)	Reopen #671's leftover: an export that fails closes its VideoFrame onl
1013	(line 34925)	The MP4 export can ship an EMPTY audio track while the report says TRA
1014	(line 34959)	A panorama import makes a canvas that changes shape when the project i
1015	(line 34993)	Edits a guest makes while offline go out without the clash check if th
1016	(line 34999)	Volume and Position/Scale/Size/Skew values cannot be reached or change
1017	(line 35005)	In the editor, Tab always cycles layers, even when a button has focus,
1018	(line 35011)	The persistent-storage result is thrown away, so nobody can tell wheth
1019	(line 35017)	Offline Undo/Redo steps skip the outbox op/byte cap, and acks then mak
1020	(line 35023)	The held-message queue is uncapped while frozen or busy. On the owner 
1021	(line 35029)	The New project, Export, Canvas and export-progress dialogs have no ro
1022	(line 35035)	No focus trap and no focus return on those three dialogs (hunt LOW #10
1023	(line 35041)	Ordinary toasts (244 call sites, the app's main error channel) are not
1024	(line 35047)	The keyframe ◆ buttons are named just "◆" and expose no state (hunt LO
1025	(line 35053)	Glass-theme --text-faint is about 4.0:1 (needs 4.5) (hunt LOW #1025) (
1026	(line 35059)	Home tabs don't expose which tab is selected (hunt LOW #1026) (1 Oct —
1027	(line 35065)	Keyframe diamonds are pointer-only. No keyboard way to read a keyframe
1028	(line 35071)	The preview canvas has no accessible name (hunt LOW #1028) (1 Oct — a 
1029	(line 35077)	Long project names are cut off on one line with no tooltip (hunt LOW #
1030	(line 35083)	Comment "x min ago" mixes the host's clock with the viewer's (hunt LOW
1031	(line 35089)	GIF and PNG-frame exports never offer the share sheet (hunt LOW #1031)
1032	(line 35095)	One smooth scroll ignores reduced motion (hunt LOW #1032) (1 Oct — a C
1033	(line 35101)	Test gap: one unreadable file in a multi-file pick is named and the re
1034	(line 35105)	Test gap: a GIF over the memory budget is shrunk but drawn full size, 
1035	(line 35109)	Test gap (needs app code): the mic going away mid-take — voice-rec lis
1036	(line 35113)	Test gap: rotating 390 → 844 crosses into Studio and keeps the selecti
1037	(line 35117)	Test gap: a JPEG with an EXIF rotation tag shows upright everywhere, i
1038	(line 35121)	Test gap: a custom font travels inside a template or project file (hun
1040	(line 35155)	A layer with no transform gets through import, breaks the timeline, an
1041	(line 35160)	Three or more nested styled groups draw the wrong picture, and the wor
1042	(line 35165)	Embedded-font import can lose a font permanently: it ignores a failed 
1043	(line 35170)	Picking or dropping several media files makes one undo step per file (
1044	(line 35175)	Project and template download filenames drop every non-ASCII character
1045	(line 35180)	Saving a preset on a full phone says "saved" when nothing was saved (h
1046	(line 35185)	An AI Director build, re-roll or refine that deletes a layer takes 2+ 
1047	(line 35190)	Effects sheet: picking Mask first, then another effect, makes 2 undo s
1048	(line 35195)	A long unbroken text run wraps in quadratic time and freezes the page 
1049	(line 35200)	The boot sweep and project delete still fail open on unreadable templa
1050	(line 35205)	Recent colours: each window overwrites the other's picks (hunt LOW #10
1051	(line 35210)	A project that is a plain value ("project":"x") passes the import gate
1052	(line 35215)	Two more "false is truthy" reads in the import sanitiser: camera focus
1053	(line 35220)	Numeric text such as "0.5" is kept in effect params but reset to the d
1054	(line 35225)	The ? shortcut sheet: the 1-5 row has no "nothing selected" condition,
1055	(line 35230)	Pixelate's Block aspect and Edges do nothing on an adjustment layer (h
1056	(line 35235)	Mosaic's Average mode gives cutout edges a dark fringe (hunt LOW #1056
1057	(line 35240)	Stills are decoded and kept at full source resolution, with no preview
1059	(line 35260)	Detect speech gives up on the first clip with no sound, so the talking
1060	(line 35265)	FreeMotion and his other apps on builderezra.github.io delete each oth
1061	(line 35270)	A hold speed key that drops sharply leaves a lasting footage offset, a
1062	(line 35275)	Motion Blur (Footage), Pixel Motion style: the smear is built at 480 p
1063	(line 35280)	Dragging the rotate handle across the left of the pivot makes the rota
1064	(line 35285)	ship.sh's cache-buster gate misses every ?v= file that isn't js/*.js o
1066	(line 35306)	ship.sh does not check whether live (ssh/main) has moved on — it runs 
1069	(line 35389)	Land ChatGPT batch B1: saving, importing, offline and small app fixes 
1074	(line 35530)	Phone: after the first import, Export is hidden (hunt LOW #1074) (6 Oc
1075	(line 35534)	Phone: grabbing a clip to move it gives no visual signal on iPhone (hu
1076	(line 35538)	PC: the S key splits only when the playhead is over the selected clip 
1077	(line 35542)	Effects browser: the "does nothing here" badge swallows the tap (hunt 
1078	(line 35546)	Drop Shadow → Shadow only on a full-frame clip turns the whole picture
1079	(line 35550)	Phone: while a clip is selected, the "Tap to add a layer" row and the 
1080	(line 35554)	A song or file is added AT THE PLAYHEAD (hunt LOW #1080) (6 Oct — the 
1081	(line 35558)	PC export: Save may open the OS Share window with no way to save the M
1082	(line 35564)	Show the checked tutorials in Home's Tutorials tab? (hunt LOW #1082) (
1085	(line 35649)	The test page reserves about 8.7 GB over one suite run: find the leak 
1086	(line 35664)	Export: one clip's sound fails to read, the export goes out without it
1087	(line 35670)	Export decodes each source file whole, with no size ceiling — a long 4
1088	(line 35675)	Audio-only export (WAV / M4A) downloads with no fresh tap and revokes 
1089	(line 35679)	Phone memory: the autosave thumbnail canvas, the compositor's scratch 
1090	(line 35686)	Work with friends: the owner's private Notes-pad text and reminders sy
1091	(line 35690)	Work with friends: 'Viewer: can only watch' is untrue — viewers get al
1092	(line 35694)	Work with friends: anyone holding the link or code learns the owner's 
1093	(line 35697)	Work with friends: images a peer sends have no pixel limit (GIFs are c
1094	(line 35700)	macOS's keychain daemon secd burns 60–170% CPU whenever test Chromes r
1095	(line 35716)	Phone and PC: after picking from the effects browser, ~335 full-size (
1096	(line 35719)	The intro film (splash-v2.mp4) stays loaded in memory for the whole se
1098	(line 35726)	Opening a big or malformed file (a shared project, a backup, a templat
open: 3 unnumbered + 163 numbered = 166 total
```
