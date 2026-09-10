# Inbox — Ezra writes, Claude drains

Type requests here from your phone (GitHub app or github.com → this file → pencil → Commit).
**Nothing else writes to this file**, so you can never hit a conflict with work in progress.

Claude reads this at the start of every loop turn, moves anything found into REQUESTS.md
with a number, and empties the list below. If a line is still here, it has not been logged yet.

**No format needed.** One line, a paragraph, a screenshot description — whatever. Don't tidy it.

---

- **(10 Sep — HE ANSWERED the two open questions on #851**, the new pop-up menu for the non-view-option
  buttons. This arrived in the logging chat right after the request itself.) His words, verbatim:

  > just decide for me

  So on **#851**: whether the new button replaces the existing **⧉** or sits beside it, and what its icon
  is, are both **decided by the builder under rule 16**. Strike those asks — **#851 must not be parked
  waiting on him.** Pick, build, and then SHOW HIM THE PICTURE at 380px, at the size it ships at: he has
  waived the "ask me first" half of his design rule for this one, not the "let me see it" half, and one
  word from him still changes it afterwards, as with every rule-16 call.

- **(10 Sep — TWO requests in one message, and he says where each goes: one is FOR BEFORE LAUNCH, one he
  explicitly wants in the CURRENT tasks.)** His words, verbatim and in full, one block, unedited:

  > Log this request for before launch not right now because if we add this right now there will need to be changes made to it before lunch so might as well save it for the finished product. Okay? So here it is in the tutorials menu. There will be one tutorial that is pretty much just a thing that says what do you want to do? Like what do you want to do so you can type in exactly what it is. You’re trying to achieve and it will then open up a project and give you like a guide on how to do it exactly how so it’ll be like it’ll run you through it like what lots of apps do where it all like have pop-ups at that point towards what to press and that sort of thing and it will figure out exactly what you’re asking for like no matter what you ask some people might have complicated requests you know sort of thing like it has to basically be able to translate whatever people are saying and either be like this is how you do it or I don’t understand the request but preferably never has the issue of not understanding the request and make it so that it also has suggestions when you go into that menu like suggested things on what you can do and this would be great because let’s say someone’s new and they just want to be quickly guided on how to you know make a shake or whatever you know like a nice shake and shake out transition you can then guide them directly. how to do that now this might be achievable just inside the app with no API keys or AI but I am completely open to having an API key option where either you’re on the free version and you put in your own API key or you’re on the paid version and it does it for you but preferably you can just figure it out inside the app which might be very complicated and I’m also worried if it has an API key then the AI might be more prone to hallucinating and making mistakes but also it would have a wide scope of things I can do. This also kind of plays into the fact that the AI inside of it because we have a feature where you can get your AI to generate you were seen like we probably should make that more like CapCut one where you can just talk to her and say what you want and then it goes and does it for you inside the edit which would be very handy and cool but I don’t know what that’s gonna take and that might actually be worth bringing up with the current tasks not just before launch like actually put it in the current tasks that it would be good if there was a way for it to just for them to be like an AI that you can talk to and you put your own API key for now but later when you pay for the pro version, it’ll unlock an API key for you to use like our own inbuilt but hidden API keys obviously cause we don’t we don’t want people stealing them but it would just be cool if we had some sort of system like CapCut where you can just get the how to do stuff for you but yeah, that tutorials menu we were all saving for the end one we actually have everything flushed out so we can make tutorials that are actually relevant and not have to redo them because it’ll be a pain in the butt to move something around and then have to go redo all the tutorials

  ⚠️ **SPLIT THIS INTO TWO ENTRIES — he said so himself, and filing it as one would bury the half he
  wants worked on now.**

  **PART A — BEFORE LAUNCH (his words: "Log this request for before launch not right now"). Belongs in
  BEFORE-PUBLISHING.md, or an entry marked HELD until launch — NOT in the working queue.**
  1. In the **Tutorials** menu, one tutorial that is really a box asking **"What do you want to do?"**
     He types what he is trying to achieve.
  2. It then **opens a project** and **runs him through it** — pop-ups pointing at what to press, the
     way lots of apps do.
  3. It must **understand whatever is typed**, however complicated, and either show how, or say it does
     not understand — "but preferably never has the issue of not understanding the request".
  4. That menu also carries **suggestions** — suggested things you can do.
  5. His example of the point of it: someone new who just wants "a nice shake and shake out transition"
     gets guided straight to it.
  6. **How it is powered is open, and he has a preference:** ideally worked out INSIDE the app with no
     API key and no AI. He is "completely open" to an API-key option — free tier brings its own key,
     paid tier is done for them — but prefers in-app, partly because a key means "the AI might be more
     prone to hallucinating and making mistakes", against a wider scope of things it could do.
  7. **WHY it waits:** the tutorials menu was always being saved until everything is fleshed out, so the
     tutorials are relevant and do not have to be redone — "it'll be a pain in the butt to move
     something around and then have to go redo all the tutorials". Building it now means rebuilding it.

  **PART B — HE SAYS PUT THIS IN THE CURRENT TASKS ("actually put it in the current tasks"), NOT before
  launch. This is a new numbered item in REQUESTS.md.**
  1. The AI already in the app generates a scene. He wants it **more like CapCut**: an AI you can
     **talk to**, say what you want, and it **does it for you inside the edit**.
  2. **Keys:** your own API key for now; later, paying for the **pro version unlocks our own inbuilt but
     hidden keys** — hidden "cause we don't want people stealing them".
  3. He is honest that he does not know what it takes: "I don't know what that's gonna take".

  ⚠️ **ONE TECHNICAL FACT THE ENTRY MUST CARRY, so nothing gets promised that cannot be delivered:**
  this app is vanilla JS, local-only, no backend and no build step. **A key shipped inside it cannot be
  hidden** — anyone can read it out of the source or watch the network call, and a leaked key is billed
  to us. "Inbuilt but hidden keys" therefore needs a server between the app and the model, or a vendor
  proxy, which is the first thing in FreeMotion that would stop being local-only. That is a real
  decision for him, not a detail: it is worth drawing the options and the cost before anyone builds.

- **(10 Sep — BUG: editing text closes the moment you touch the canvas, so you cannot move the text
  while you are editing it.)** His words, verbatim and in full:

  > Log that doesn’t issue when editing text that as soon as you tap on the actual canvas to try and move the text and stuff. It just closes it. You should be able to tap on the canvas and move the text around while editing text.

  ("Log that doesn't issue" = "log that there's an issue" — dictation.)
  **What he is reporting:** text edit mode is open; he taps the canvas to drag the text into place; the
  edit closes instead. **What he wants:** tapping the canvas while editing text should MOVE the text,
  not end the edit.
  ⚠️ Which device is not stated — he has been on the phone (iPhone, v16.09) all morning, so read it as
  the phone unless it turns out to be both. Check the PC too before closing it; that is the layout half
  that has been missed before.

- **(10 Sep — SWEEP EVERY FILTER. The effects have been changed a lot lately and the filters are BUILT
  out of effects, so changing an effect changes the filters that use it. He has already found one
  broken.)** His words, verbatim and in full:

  > Check all of the filters because you might’ve changed the effects a bunch and when you change an effect that would have a change on the filter filters because the filters are built with effects. I noticed that the dreamy below effect is completely fucked and there might be a couple of others like that, so just do a large sleep through all the filters and make sure you know one by one carefully that they’re all up there proper potential on that all looking good like they should design how they are meant to be designed no cheap cutting corners.

  ("dreamy below" and "large sleep" are dictation — read as **Dreamy Bloom** and **a large SWEEP**.)
  **The named fault:** `Dreamy Bloom` — it is a real filter, `name: 'Dreamy Bloom'` in `js/filters.js` —
  is "completely fucked". He thinks there are probably a couple of others in the same state.
  **The job, in his terms:** a large sweep through **all** the filters, **one by one, carefully** — there
  are **56** of them in `js/filters.js`. Each one has to be at its proper potential and look how it was
  meant to be designed. His last words on it: **"no cheap cutting corners"**, so a numeric pass that
  proves "not zero" is not what he is asking for; he means judged by eye, like the #482 effect sweeps.
  ⚠️ **The cause he is pointing at is the important half:** a filter is a recipe of effects, so an
  effect fix can silently break every filter built on it, and nothing in the suite currently notices.
  Worth fixing the class as well as the instances — the sweep finds today's breakages, a check that
  compares each filter's recipe against the effects it names would stop the next one.
