# Ezra's own stated preferences that constrain a simple mode

Research note for step 1 of the simple-mode design (see `../STATUS.md`). Read-only: nothing in the repo was changed
except this file. Read against HEAD `2d06a3f5` (v17.11), 28 Sep 2026.

Sources: `REQUESTS.md` (cited as `R:<line>`), `INBOX.md`, `LOOP.md`, `CLAUDE.md` (the project one), `BEFORE-PUBLISHING.md`
(cited as `BP:<line>`), and his global `~/.claude/CLAUDE.md` (cited as `G:<line>`). Every quote is copied as it stands in the
file, typos included, with its entry number. Where a line is the logger's or the builder's reading and not his words, it
says so. Anything inferred is marked **(inference)**.

---

## 0. The short version

- **What he asked for, in his words:** "a simple version and a complicated version". Today's app is the complicated one
  (the "After Effects / a light motion version"). The new one is the "CapCut version or Premiere Pro version": "very dumbed
  down very simple like someone who doesn't even know how to edit can figure it out", and also fast for someone
  experienced. It covers clips, making them look nice, text and captions. It has no "super advanced 3D effects". CapCut's
  level of complexity is the ceiling, "especially for the mobile side" (INBOX.md:28).
- **Phone and PC must work the same:** "if you are on PC and on mobile, you don't have to learn both" (INBOX.md:28).
- **Build gate:** planning and visualizers only. "don't build it until I say to do it" (INBOX.md:28). #923 has been held
  for his approval since 23 Sep.
- **The complex side keeps every option:** "this is the complex version we want as much choice as possible" (#966).
  The simple mode must not take choice away from it.
- **How he wants choices shown:** as pictures, with all the options and one marked recommended ("I just want options. Yu
  can just say recommended next to the best option", #395). Recently he has often answered "do reconmended" (#965,
  #945, #973). He does not want to be asked permission for the work itself (#872, #660).
- **Identity:** the app's look is copied from Alight Motion and has to become our own before anything is published. A
  CapCut-shaped screen is the same kind of borrowing. No other company's name goes in the UI (#484, BEFORE-PUBLISHING.md).
- **Words:** "just don't overexplain it" (#294). Use one name for each thing everywhere (#454, #967). Use plain words. He
  has not seen the jargon ("what is a flowing ribbon even? im so confused", #484).
- **Open, never answered:** the #923 brainstorm's four questions from 25 Sep: what the two modes are called; one switch per
  project or also per clip; which kind of person comes first; whether to build a first version. The page they were on (the
  unblock list) has been dead since 21 Sep (CLAUDE.md, "THE LINK BELOW IS DEAD").

---

## 1. The two-editor ask, in his words

### 1a. The 28 Sep brief (INBOX.md:26-43, not yet numbered in REQUESTS.md at HEAD `2d06a3f5`)

All of these are from the single "His words (verbatim)" paragraph at **INBOX.md:28**:

- The shape: *"It's basically like a simple version and a complicated version. And right now we've got the complicated
  version, but there needs to be a way to quickly switch over to the simple version. That is basically like Premiere Pro.
  Right now we're basically building the After Effects version, but there needs to be a Premiere Pro version."*
- The same features underneath: *"So like pretty much all the same features we've got now"*.
- Conversion: *"whether we should allow you to turn a project that's already in the Premiere. I mean, that's already in
  the After Effects version into the Premiere Pro version and so forth. How switching them around is going to work."*
- Collab across the two modes: *"how someone using the CapCut version or Premiere Pro version is going to be able to do a
  collab with someone who is also using the After Effects slash a light motion version. Like how are they both going to
  work on it at the same time and not interfere?"*
- Deliverables and the gate: *"don't build it until I say to do it, but definitely build visualizers and describe how it's
  going to work and how the code is going to implement. So if I do agree on it, then it'll be easy to actually go for it
  and do it."*
- The feel: *"Make it good. Make it actually feel good."*
- Who it is for and what is in it: *"Like what we have now is fairly simple to use once you learn it, but it has a lot in
  it but basically this other version is like gonna be very dumbed down very simple like someone who doesn't even know how
  to edit can figure it out like and it's also gonna be there just to be useful for someone who is experienced but just
  wants to quickly put together something nice and quick kind of like Premiere Pro so take a lot of notes from Premiere Pro
  you know just a quick and easy way to put clips together make them look nice you know maybe add some text and some
  captions But you're not necessarily doing super advanced 3D effects and lots of stuff."*
- It is an option: *"So yeah, I think it would be cool to have that as an option."*
- The ceiling: *"See how much stuff is in CapCut because people think CapCut is pretty good and simple. So whatever level of
  complicatedness CapCut is, we can probably get away with, especially for the mobile side."*
- Parity: *"The PC side, like it's, you know, it's pretty much just going to be like, if you are on PC and on mobile, you
  don't have to learn both. Like they're both, they both essentially function the same kind of like how it already is
  now."*
- Starting a project: *"How are you going to decide when you start a project?"*
- The timeline, which he calls the heart of it: *"basically how CapCut's timeline works is like, it's all just on one
  timeline where like, it's like clip after clip after clip, but with After Effects and like, well, what we're doing free
  motion It's like the timeline is just like, it's all, it can all go anywhere. You can drag any layer anywhere, put
  anything on top of anything. Like it's not just like add a clip and then it gets put on the timeline and you decide which
  order it goes in. And then if you want to look at the overlays, you go to the overlay section, effects, you go to the
  effects section. It's no, it's like, it's all there. It's all sitting in front of you. And you have to know how to use it
  and how to layer it, etc."*
- What the app is already trying to be: *"pretty much what we were building before is a simple way to have a complex
  system with lots of different ways to edit it."*

### 1b. #923: the original idea (23 Sep), R:32753-32766

- *"if you can have something that's easily integrates both of the things you can essentially quickly switch between easy
  editing and complex editing"* (R:32755)
- *"it'll be like simply and easily integrated and very easy to use and basically it'll be like having CapCut and a light
  motion both in one editing software but also both improved and better and combined so people with not much skill can use
  it people with lots of skill can use it but also people with lots of skill who want a quick and easy system can also use
  it and then if they want to switch over to something that's more in depth they can also do that"* (R:32755)
- The aim: *"that would just bring us one step closer to ticking every box that after effects has and adding extra ticks
  to stuff that a light motion has"* (R:32755)
- The gate, which he restated in the same message: *"Just log it and brainstorm it when you get the chance to once you've
  finished everything else. Just brainstorm ideas and then relay those ideas back to me. Don't actually do it."*
  (R:32763)
- The brainstorm that was sent to him on 25 Sep (R:32762, `audits/923-brainstorm.json` → `message`) ended with three
  questions: one switch per project or also per clip; names (**Quick / Full, Cut / Motion, or Easy / Pro**); which of his
  three kinds of people the first version is for. A fourth, "build a first version yet?", sits in
  `tools/unblock/unblock.html:1005-1085` with `"rec": ""`. **None of the four has been answered.** The 28 Sep brief does not
  answer them either. It only reopens the planning.

### 1c. #966 clause 5: "this is the complex version" (26 Sep, restated word for word 28 Sep), R:33743, R:33768

- *"more choices always better I'd say like for this we're definitely trying to keep it as you know like because we're
  gonna have two versions the simple version and then the complex version this is the complex version we want as much
  choice as possible"* (R:33743)
- The logger's note (not his words): clause 5 is context for #923 and "NOT approval to start the easy editor" (R:33755,
  R:33766).

---

## 2. Who it is for: beginners, and experts in a hurry

- **Three kinds of people** (#923 clause 2, R:32760, from R:32755): *"people with not much skill can use it people with
  lots of skill can use it but also people with lots of skill who want a quick and easy system can also use it"*.
- **Someone who has never edited** (brief, INBOX.md:28): *"someone who doesn't even know how to edit can figure it out"*.
- **The empty project has to show a beginner where to start** (#326, R:8630-8632): *"Make the tap to start creating
  button actually take up the whole timeline while the projects empty and have it so the plus button is big and in the
  middle, this should make it very apparent and obvious for beginners on how to start"*.
- **The same empty state, #354** (R:12682-12683): *"Hide the player head while the add button is big and also give the
  plus add button some actual nice colours not just basic blue"*. **#398** (R:15510-15511): *"Make the colours in the new
  add button actually move in a subtle but satisfying way"*.
- **Templates are for "noobs"** (#343, R:9378): *"And also people will eventually be able to create templates and share
  them a round so noobs can use them or whoever and get quick easy edits, and also we can create templates for people to
  use"*.
- **A first-timer must be able to use a feature without help** (#967, R:33772): *"actually makes sense for someone who
  doesn’t know how to use it to use it like how to use actually use it doesn’t make sense. It’s simple like you know all
  that stuff."* He also complained about features being buried: *"I don’t know if you’ve buried it all in a deeper setting
  or something"*.
- **Guided help is for later: before launch** (#855, R:30345-30364): *"let's say someone's new and they just want to be
  quickly guided on how to you know make a shake or whatever you know like a nice shake and shake out transition you can
  then guide them directly."* He holds it until the end: *"Log this request for before launch not right now because if we
  add this right now there will need to be changes made to it before lunch"* and *"that tutorials menu we were all saving
  for the end one we actually have everything flushed out so we can make tutorials that are actually relevant and not have
  to redo them"*.
- **Onboarding, from his research into Alight Motion** (BP:170-171): *"In-app onboarding. An interactive first-project
  walkthrough. Their reviews are full of people who wanted to learn and gave up."* The builder's sequencing note: build it
  near the end, because onboarding freezes the screens it teaches (BP:191-193). He also said *"don't make any tutorials
  yet, but add a tab"* (BP:182).

---

## 3. Simplicity, clutter and words

- **Don't overexplain** (#294, R:4180-4188): *"when you start a new project, the new, like, button slash layer should say
  tap here to start creating. or something along those lines, if anything is something a bit more inspirational. […] Just
  start making it overexplementary. Like, explain itself way too much. Like, a little tutorial for explaining what it does.
  You'd seem to do that a lot where you just, like, put an explanation for everything in every section, and it just looks
  messy. So just don't overexplain it."* (The "Just start making it overexplementary" reads as dictation for "don't start
  making it…". His last sentence settles which he meant.) This is enforced in the code today: the suite fails if the
  add-row label goes past 34 characters (R:4193-4194). The labels are in `js/timeline.js:2795`.
- **One home per control, no duplicates** (#310, R:8191-8192): *"They all have homes and don't need to be repeated
  there"*.
- **No clutter, and he will judge the result afterwards** (#564, R:20946): *"you figure out the best fix for this that
  isn't cluttering the screen and making it hard to find stuff and figure stuff out. I'll just tell you if what you did is
  bad after it is done"*.
- **One word, one meaning** (#454, R:17219-17221): *"I'm putting my foot down, presets are just for effects not anything
  else, if it says preset remove any other function than just saving what effects the layer has"*.
- **Plain names, not our own invented jargon** (#484, R:12806): *"what is a flowing ribbon even? im so confused"*.
  Generic craft words are fine (R:12831): *"simple things like exposure are fine but names where we are obviously copying
  should be changed"*.
- **"That simple": what you expect is what happens** (#916, R:32513): *"Idk if you speed something up it should sound sped
  up. That simple"*.
- **The preview must not lie about the export** (#392, R:15157): *"if it doesnt show up at export delete it"*.
- **Better nothing than a bad version** (#152, R:6860-6862): *"could be soemthing way to hard to do and would be better to
  not add it then add a shit version for now."*
- **Quick, and without being thrown out of what you are doing** (#277, R:4563-4566, R:4575): *"because I find in a light
  motion. Sometimes I want to go through and out a bunch of effects but every time I tap one it takes me out of it and it's
  kind of slow."* and *"I can't just makes it quick and simple and easy"*.
- **Something that already worked for him in Alight Motion** (#534, R:19573): *"you just grab them and change it, real
  simple and effective"*.
- **The builder's #967 rewrite (v17.10)** set a precedent he accepted without objecting: "one name everywhere (Work with
  friends · Share live · Join)", "no relay/session/Labs words", "privacy in one plain sentence" (commit `4da44591`). These
  were built from the recommended picks under rule 16, **not** from an explicit answer of his (POLISH-LOG.md:1524-1525).

---

## 4. The reference apps, in his words

- **CapCut.** It is the simplicity benchmark: *"people think CapCut is pretty good and simple"* (INBOX.md:28). The AI you
  talk to should be *"more like CapCut one where you can just talk to her and say what you want and then it goes and does it
  for you inside the edit"* (#856, R:30379-30381). On hold-to-pick effect presets: *"It's kind of like CapCut a sense cause
  CapCut has like a similar thing."* (#277, R:4593). On text to speech (#392, R:15186-15187): *"text to voice should work like how
  TikTok's or capcuts does"*. That feature was later removed on his rule "if it doesnt show up at export delete it"
  (R:15157).
- **Premiere Pro.** It is the model for the simple side's purpose: *"take a lot of notes from Premiere Pro you know just a
  quick and easy way to put clips together make them look nice"* (INBOX.md:28). The pairing he admires: *"one of the
  reasons why After Effects is so popular is because it also has Premiere Pro"* (#923, R:32755).
- **After Effects.** It is what the complex side is growing towards: *"one step closer to ticking every box that after
  effects has"* (#923).
- **Alight Motion.** It is what the complex side was modelled on and has to beat: *"adding extra ticks to stuff that a light
  motion has"* (#923). He wants the looks to be different: *"I'll make it look at different from a light motion so we won't
  look like we're ripping them off as much."* (#277, R:4565-4566). The names and order must differ *"to avoid getting taken
  down by aligiht motion for copying"* (#484, R:12806; BP:11-12).
- **Google Docs.** It is the model for collaboration: *"just take inspiration from what Google Docs has"* (#921, R:32696).
  BP:67-75 flags the Share panel as borrowed from Docs and says it has to be redrawn.

---

## 5. Templates (the most direct "easy" path already in the app)

- **Swap the media in, the way Alight Motion does it** (#343, R:9376): *"Also the long term goal for templates is to make it
  when you press on them you can quickly swap out the media for ur own clips so you can use them as templates and not just
  the exact same thing as elements, this is how alight motions looks."*
- **He has asked for this repeatedly, and the size of the job does not put him off** (#619, R:22593-22594): *"And templates
  when you press on them just create themselves as a project, not what I wanted and I specified many times to fix this"* /
  *"I know it’s a big thing to do idc"*.
- **Templates are edited in place, not forked** (#505, R:18512): *"I just want them to be editable in their own sections
  like I know this is gonna be a hard thing to hardwire and figure out but just put the effort in like stop doing the lazy
  way out"*.
- **Show each template as a picture** (#268, R:2829-2832): *"I want an actual visual representation of what's in the
  template kind of like how each project and template in the home menu you actually has a picture to it."*
- **Where it stands (builder's notes, not his words):** the "Insert your Media" sheet exists (`js/template-fill.js:1`).
  It fills media, text and shape-colour slots, and it opens from the template's ⋯ → "New project from template"
  (`js/home.js:1996`). #619 is "BUILT OUT UNTIL HE has seen the fill-in sheet" (R:22665). The #923 brainstorm's first step,
  "Quick Edit on any project", is this same sheet opened on any project.

## 6. Captions and text

- The brief names them directly: *"maybe add some text and some captions"* (INBOX.md:28).
- **Easy to reach, with a choice of what to scan** (#150, R:6765-6767): *"make the auto detect captions button way easier to
  access and use. and it should have a choice between only detecting where the captions are added in the project or
  detecting the whole project or detecting a specific audio later then let you select it."*
- **Effects on one cue or on the whole track** (#151, R:6808-6809): *"you should be able to chose somehow between adding
  effects to each section or adding effects that effect the whole layer."*
- **Stacked captions both show** (#574, R:25210): *"make it so you can show both at the same time"*.
- **Auto-detect: he doubted it, then kept it** (#152, R:6860-6862, then R:6897 *"keep it for now"*). The entry records it
  as staying "a voice-recording tool" that is "not to be improved either" (R:6898-6899). **Unverified here:** whether it
  writes words (the way CapCut's auto-captions do) or only finds where speech is. The entry's evidence is a voice-activity
  test (R:6864-6865), which suggests the latter. Check `js/captions.js` before the design promises CapCut-style
  auto-captions.

## 7. The AI you talk to (a natural fit for "easy")

- #856 (R:30379-30386): *"we probably should make that more like CapCut one where you can just talk to her and say what you
  want and then it goes and does it for you inside the edit which would be very handy and cool"* … *"you put your own API
  key for now but later when you pay for the pro version, it'll unlock an API key for you to use like our own inbuilt but
  hidden API keys obviously cause we don't we don't want people stealing them"*.
- The talking and editing half shipped in v16.23 as the Assistant (`js/ai-chat.js`, R:30394-30410), running on his own key.
  Clause 3 (hidden keys for paying users) is still an open question to him (A/B/C, R:30437-30449).
- #855 prefers in-app help without an AI and says why (R:30358-30361): *"preferably you can just figure it out inside the
  app which might be very complicated and I'm also worried if it has an API key then the AI might be more prone to
  hallucinating and making mistakes"*.
- He wants no servers (#921, R:32696): *"Like I really don't want to have to have servers or anything like that."*

---

## 8. Phone and PC: parity, with the phone first

- **Nobody learns two apps** (INBOX.md:28): *"if you are on PC and on mobile, you don't have to learn both. Like they're
  both, they both essentially function the same kind of like how it already is now."*
- **PC gets whatever the phone has** (#978, R:34138): *"on pc there isnt a way to access the friends invite menu like there
  is on mobile. - Settings cog then swap between them in a really clean way."* (#139, R:657-658): *"Make sure that also
  comes to the pc beesoon."* (#373, R:13930): *"do the same stuff for pc"*.
- **Laid out to suit each screen, not copied pixel for pixel** (#852, R:30237-30238): *"design it in a smart way that fits
  on pc and mobile respectively"*.
- **He notices when the PC side falls behind** (#229, R:12037-12040): *"you still havent moved all the buttons on the pc
  version to where they should be […] because pc version is pretty un usable."*
- **Collab joins PC and phone** (#921, R:32696): *"And, you know, PC and mobile can connect to each other"*.
- **The phone comes first.** His global rule is "Mobile is the priority" with a check at ~380px (G:23-28). The project rule
  is "Mobile-first — verify at ~380px" (CLAUDE.md:41; LOOP.md rule 7, LOOP.md:31). He tests on his iPhone ("from what I’ve
  seen on my phone", #967). Some requests are phone-only: *"(all just for mobile btw)"* (#277, R:4556).
- **Mobile lag matters to him** (LOOP.md:1270-1272, 22 Aug): *"working on the lag being fixed for mobile would also be
  good"*.
- **The PC layout is his own design** (BP:101-104). Studio is the only PC layout; the Alight Motion-shaped "Classic" was
  deleted. The phone layout is still the Alight Motion arrangement (BP:111-112).

---

## 9. Look, feel, and the animations he liked

- **"Feel good" and "premium" are in his brief.** *"Make it actually feel good"* (INBOX.md:28). *"just so the app feels
  premium"* (#612, R:22021).
- **Menus that hinge and flip** (#612, R:22016-22021): *"I love what you did with the notes menu how it flipped up,
  something like that for the rest but not the exact same thing"*. His pick was *"also do hinge for the animations"*
  (R:22014).
- **Menus that pop out of their button with a comic-style tail** (#548, R:20207): *"i want it to be like how comics have the
  line around the text box directing it to where its coming from, so like the ui for each menu actually has each button
  attached to it so you see where its coming from"*.
- **Panels with two sizes that grow and fold** (#927, R:32796): *"it only has two states either zoomed in or zoomed out"* …
  *"it kind of like shrinks down onto itself before closing so it's like shrinking and then folding into the button sort
  of thing"*. His size answer (R:32811): *"4 - Just taking up most of the screen in the middle, using the space wisely
  tho."* (#975, R:34050): *"as long as the small version doesn't take up the whole screen and is like a box on the screen and
  big takes up the whole thing"*.
- **Screens that glide** (#508, R:18698): *"the project you press one to open doesn't smoothly glide to the left with like a
  nice animation and then the project comes in smoothly from the right."*
- **Pulse lines in the house style** (#616, R:22349): *"with a really clean a good animation inspired by the lines that we
  have circle around the project you have open or the media audio buttons etc"*.
- **Colours that move** (#398): *"move in a subtle but satisfying way"*. **Not plain blue** (#354): *"some actual nice
  colours not just basic blue"*.
- **A glow that reacts to the cursor on PC**, the first piece of the app's own identity (#286, R:4470-4475; BP:210-213):
  *"it makes it feel like the area around ur curser knows its there and is reacting to it"*.
- **A switch that animates cleanly, with everything aligned** (#373, R:13930): *"Make sure everything aligned perfectly and
  don't make me have to say it's not right, make sure the switch has a clean animation, do the same stuff for pc, and make
  sure everything perfect before you sign off on it"*.
- **Ship every animation option and play them at random** (#974, R:34020): *"Honestly for all of the different button
  animations - make them all happen in the app but it's just random which one so I can decide which is best over use
  time"*.
- **He wants to see progress** (CLAUDE.md:34, 20 Sep): *"I want to feel and see progress"*.

---

## 10. The identity rule: "before publishing"

- **The standing reminder** (CLAUDE.md:442-453): "The UI is modelled on Alight Motion and must be made visually our own
  before publishing." "when adding a NEW screen or panel that's based on an Alight Motion screenshot, add it to the list in
  BEFORE-PUBLISHING.md as you go". The rule is to raise it whenever publishing, a public link, a demo or tutorials come up,
  and not to start the redesign silently (CLAUDE.md:447-449).
- **The principle** (BP:33-36): copying *what* an app does is normal; copying *how it looks* is the trouble. "A user
  should be able to see one screenshot of FreeMotion and know it isn't Alight Motion."
- **His words on it:** *"i want every effect to be named different to what it is in alight motion and also have different
  ordering to avoid getting taken down by aligiht motion for copying"* (BP:11-12, #484). On the layer menu: *"re order the
  buttons in it because it's the same layout and wording as alight motion, if you can come up with different wording as
  well"* (BP:89-91). On the template icon: *"identical to alight motions just with colour"* (BP:226-227, #375). On the
  effects browser: *"so we won't look like we're ripping them off as much"* (#277).
- **Borrowed terms are already on the list:** "Elements", "Object / Element", "Templates" follow Alight Motion's wording
  (BP:54). The Share panel's roles and layout follow Google Docs (BP:67-75).
- **"Done" means a different composition, not a re-skin** (BP:116-128): own home screen, own Add menu arrangement, own
  icons, own colour and type, own words, own motion.
- **The gate includes collaboration invites** (BP:197-206, BP:221-222). An invite link shows the app to people outside his
  own devices. A simple-mode user reached through an invite would see it too.
- **Guarded in code, but only for effects:** `tests/tests.js:68197-68208` fails if any **effect** label, description or
  parameter contains Apple, Alight Motion, After Effects, Adobe, Premiere, Final Cut, CapCut, Instagram or TikTok. It does
  **not** check editor chrome, mode names or Home. So a switch labelled "CapCut mode" would pass the suite today.

---

## 11. Options versus decisions: how he wants to be asked

**His rule is "decide the details, show me the look, ask only real direction calls, and never stop the work to ask."**

- **See it before it ships** (#545, R:20117): *"Can you use claude design for every future design request? and make sure
  this request isnt forgotten?"* CLAUDE.md:419-420 turns this into "DRAW OPTIONS AND SHOW HIM A PICTURE BEFORE ANYTHING
  SHIPS", rendered "big AND at the size they ship at" (CLAUDE.md:423-424).
- **All the options, with one marked recommended** (#395, R:15413-15415): *"i dont see why not having all the options, i
  mean if its a bad idea for any reason then no but I just want options. Yu can just say recommended next to the best
  option"*.
- **A description is not enough. It has to be a picture** (#929, R:32832): *"5 You gotta show me what these look like"*.
  #432 (R:16840-16841, R:16858-16859): the template icon was rejected three times while it was guessed at alone, *"template
  icon looks shit"*.
- **Mostly he answers "do recommended"**: *"do reconmended"* (#965, R:33721); *"For the friends right beside canvas just do
  everything u reconmend"* (#945, R:33177); *"for inspector and add menu do ur recommended one"* (#973, R:33985).
  Sometimes he overrides a single pick in the same breath (#973: *"for eyeball do A. Do B for the outlines thing that's
  blue."*).
- **Sometimes he waives the options step altogether**: *"don't ask me which choice I like best. Just pick the best one."*
  (#951, R:33271); *"you just decide what is best as long as…"* (#975, R:34050). He then judges the result: *"I'll just tell
  you if what you did is bad after it is done"* (#564).
- **No permission-asking for the work** (#872, R:31063): *"stop asking me for permision and just do everything"*. (#660,
  R:26273): *"Dont ask questions like that dont stop to ask questions, log ur question and ask it me when i ask for me, just
  keep going"*. When he is away: *"im off to bed now so dont ask me anything just do, based on all this info and ur own
  smarts"* (LOOP.md:129-133, rule 16, from #524). (#879, R:31095): *"use ur own reasoning and sence to make good choices"*.
- **Direction calls stay his.** His global rule (G:37-42) is "Execution: just do it. Direction: decide together … lay out
  the choice briefly with a recommendation and let him pick. He likes being involved in decisions." The #872 note (R:31065)
  reads "stop asking permission" as not cancelling the things he asked to be involved in, "or raising a genuine either/or
  where guessing wrong wastes a release".
- **Questions in plain words, not builder-speak.** *"idk what you're talking about"* (#277, R:4679). *"#223 idk im confused
  what ur talking about."* (#325, R:8574). He "gets overwhelmed by multi-step instructions" (G:50).
- **Size is not a reason to shrink the plan** (#690, R:27346-27347): *"No effort is too big to not be worth doing, if
  something needs doing and its a big project just do it"*. (#619): *"I know it’s a big thing to do idc"*. (Brief):
  *"This is a big job and I want you to think out every little bit of it"*.
- **But this project has a hard build gate**: *"don't build it until I say to do it"* (INBOX.md:28). *"Don't actually do
  it."* (#923, R:32763). Rule 16 ("decide when he is silent") covers design details in the plan. It does **not** cover
  starting the build.

---

## 12. Design constraints this implies for the simple mode

### Naming
1. **Use his own vocabulary as the starting point: "simple" and "complex"** (#966, INBOX.md:28). He has never chosen
   product names. The #923 names question (Quick / Full, Cut / Motion, Easy / Pro) is still open, so names go to him as a
   drawn pick with one recommended. They are not decided silently, because a name is a direction call (G:37-42).
2. **No other company's name in any label**: not "CapCut mode", "Premiere view" or "After Effects mode" (BP; #484). Since
   the existing guard only covers effects (`tests/tests.js:68197`), his "safeguards must be structural" rule means the
   build plan should widen it to cover the mode switch, the Home chooser and any new simple-mode labels **(inference)**.
3. **Avoid "Pro" for the complex mode (inference).** He already uses "pro version" / "paid version" for a paid tier
   (#856, R:30385; #855, R:30359-30360). "Easy / Pro" would make one word mean two things, which is the #454 problem
   ("one word, one meaning").
4. **Don't label the simple mode for beginners only (inference from #923).** One of his three groups is "people with lots
   of skill who want a quick and easy system". A name that says "beginner" talks down to them. The 25 Sep brainstorm said
   the same, but that was the builder's idea, not his words.
5. **One name for each thing everywhere, in plain words, short.** #454, #967 (v17.10 precedent), #484 "what is a flowing
   ribbon even?", #294 "just don't overexplain it" (labels ≤34 chars is the existing precedent). Generic craft words like
   "clip", "track", "text" and "captions" are fine (#484: "simple things like exposure are fine"). Section names copied
   from CapCut's layout, or "Elements"/"Templates" as tab names, go on the BEFORE-PUBLISHING list (BP:54).

### How choices are shown to him
6. **Visualizers are part of what he asked for** (INBOX.md:28): pictures and interactive prototypes, rendered through the
   app at phone size and at PC size, not written descriptions (#545, #929). Mark one option recommended and offer all of
   them (#395).
7. **Keep the decision list short, plain and batched, with a one-line "do recommended" route** (#965, #945, #973). Each
   question gets a picture and one sentence. There are no technical questions (#277/#325 "idk what you're talking about";
   G:50).
8. **Decide the details yourself and ask only the direction calls.** The direction calls here are: the two names; whether
   a project is simple or complex by default and how that is chosen when a project starts (INBOX.md:28); whether a complex
   project can be converted and what it loses; one switch or also per clip; who comes first; and the go-ahead to build.
   Everything else is decided with the recommended option and shown to him (#872, #660, rule 16, #564).
9. **Where the choice is an animation (the switch, opening a mode),** he has said to ship all the options and play them at
   random (#974). The plan can offer that instead of a pick.
10. **The four #923 questions are still open,** and the page they were on is dead. Put them into the new decision sheet
    rather than assuming answers.

### Look and feel continuity
11. **One app, one identity.** The simple mode reuses the visual language he has already approved: the drawn ✕ (#965),
    hinge and flip openings (#612), comic-tail pop-outs (#548), small/big two-size panels (#927, #975), moving-colour add
    button (#398), pulse lines (#616), the PC cursor glow (#286). It is not a re-skin in someone else's style
    **(inference from his approvals)**.
12. **The switch itself should feel premium:** a clean, deliberate animation (#373, #612, INBOX.md:28 "actually feel
    good"). Continuity through the switch matters. The 25 Sep brainstorm proposed keeping the playhead, selection and undo
    across the switch. That was the builder's idea, not his words.
13. **Take features from CapCut and Premiere, not their look** (BP:33-36; CLAUDE.md:452-453). Any simple-mode screen built
    from a CapCut or Premiere screenshot gets logged in BEFORE-PUBLISHING.md as it lands.
14. **No clutter, one home per control, nothing buried** (#310, #564, #967). The simple editor shows less, not the same
    things squeezed smaller.
15. **What you see is what exports** (#392), and it behaves the way a non-editor expects (#916 "That simple"). The simple
    view must not show something the export will not carry, or hide something it will **(inference: this matters most for
    complex-mode layers seen from simple mode)**.
16. **Better to leave a feature out than ship a bad one** (#152). CapCut features the engine cannot do well (for example,
    auto-captions that write the words, if the current detector only finds speech: unverified) should be left out, not
    faked.

### Phone first, and the same on PC
17. **Design the phone version first and check it at ~380px** (G:23-28, CLAUDE.md:41). CapCut's complexity is the ceiling
    "especially for the mobile side" (INBOX.md:28).
18. **PC and phone work the same way**: same model, same controls, same names, "you don't have to learn both"
    (INBOX.md:28). The layout adapts to each screen ("fits on pc and mobile respectively", #852), and on PC it sits inside
    his Studio arrangement (BP:101-104). PC must not lag behind the phone (#229, #978).
19. **Don't make the phone slower** (LOOP.md:1270-1272, "working on the lag being fixed for mobile").
20. **Collaboration works across modes and across devices** (#921 "PC and mobile can connect"; brief "not interfere"),
    with the owner in control (#921: *"whoever is the owner of the project should have full control"*). And without
    servers (#921).

### Scope and gating
21. **Same features underneath, one app** (INBOX.md:28 "pretty much all the same features"; #923 "one editing software").
    The complex mode keeps every option (#966). The simple mode is a way of working, not a smaller engine.
22. **The simple mode's own list, from him:** put clips together, make them look nice, text, captions, and nothing like
    "super advanced 3D effects" (INBOX.md:28). Natural entry points already exist: template media swap (#343/#619,
    `js/template-fill.js`) and the talk-to-it Assistant (#856, `js/ai-chat.js`).
23. **Beginner help stays light now:** an obvious start (#326), short labels (#294). The guided tutorial (#855) and the
    first-project walkthrough (BP:168-193) are held until near launch, so the plan should leave room for them without
    building them.
24. **Nothing gets built until he says so** (INBOX.md:28; #923 held, R:32757). The plan should still be complete and
    ready to build ("So if I do agree on it, then it'll be easy to actually go for it"), and not scaled down because it is
    big (#690, #619).

---

## 13. What he has NOT said (don't put these in his mouth)

- No names for the modes. No default mode for new projects. No decision on whether a complex project may be converted
  (he asked *"whether we should allow"* it, INBOX.md:28). Nothing on per-clip versus whole-project switching. No word on
  which of the three groups comes first.
- Nothing on magnetic or ripple behaviour, snapping clips together, or closing gaps. The only timeline behaviour he
  described for CapCut is "clip after clip after clip" with overlays, effects and text "in their own sections"
  (INBOX.md:28).
- He never said the simple mode is for beginners only (#923 names three groups).
- The #967 plain-words precedent was built under rule 16 with the recommended picks, not from an explicit answer
  (POLISH-LOG.md:1524-1525). He has not objected, which is not the same as having chosen it.
- **Unverified here:** how the current caption auto-detect behaves (§6); whether any current screen was built from a
  CapCut screenshot (BEFORE-PUBLISHING.md lists none).
