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


### 21 Nov 2026, ~01:50 AWST: #1255 effects browser: B1 (phone) with Faves and New up front; B4 on PC
**His words (verbatim):** for effects menu dont forget faves menu and new menu, i think b1 for that is good. as long as it has all the same features and principles as the current one. faves and recents being tucked away in a seperate movie instead of being upfront first is a bad idea.

b4 for pc is good

**His clauses:**
1. The effects menu must keep the Faves menu and the New menu.
2. B1 is good for the phone effects browser, AS LONG AS it has every feature and principle of the current one.
3. Faves and Recents must be UP FRONT, first. Tucking them into a separate menu is a bad idea ("movie" is speech-to-text for "menu").
4. B4 is good for PC.

**Logger's plan (not his words):**
- B1r (phone, dark and light) is drawn tonight: B1 checked against today's browser so every feature is kept, with Faves, New and Recents up front, first.
- B4 on PC is checked for the same, and redrawn as B4r if it needs it.
- Build rule for #1255: Faves, New and Recents stay first in the effects browser.

### 21 Nov 2026, ~01:55 AWST: #1255 lock the effects-browser LAYOUT first, then show each category-button design ON it
**His words (verbatim):** its hard for me to decide on the designs for the effects menus because u have the actual catagory designs and the layout designs seperate, lock down the layout first then show me the diff designs on it

**His clauses:**
1. The category-button designs (C1-C4) and the layout designs (B1-B6) are shown separately, which makes it hard to choose.
2. Lock the layout first: B1 on phone and B4 on PC, his picks at 01:50.
3. Then show each category design applied ON that layout.

**Logger's plan (not his words):**
- Once B1r is done, draw it four times, once in each category style C1, C2, C3 and C4, phone dark and light.
- Do the same on B4 (or B4r) for PC.
- One page, side by side, so he picks the category style in context.

### 21 Nov 2026, ~02:00 AWST: #1255 inside a category: M1, keep today's effect pictures; M5 on press-and-hold; M6 with today's sliders; every effect must still work
**His words (verbatim):** inside a catagory m1 is good but make sure we keep the effect designs the same ones we have now and m5 is good but that should be when u hold on an effect and m6 is cool but the sliders should be like how they are now and u will need to make sure every effect still functions perfectly and has the new design looks and stuff which will be a methodical process.

**His clauses:**
1. M1 is good for the effect list inside a category.
2. Keep the effect pictures exactly as they are now: the 238 drawn animations in fx-pics/. Never replace them.
3. M5 is good, but as what appears when you press and HOLD an effect (a preview), not as the normal view.
4. M6 (the settings panel) is cool, but the SLIDERS stay as they are now.
5. Every effect must still work perfectly AND get the new look. That's a methodical process.

**Logger's plan (not his words):**
- These are build rules for #1255. The effect list uses M1's layout with the real fx-pics pictures. Press-and-hold opens M5's preview. The settings panel uses M6's look with today's slider component and behaviour.
- The switch-over includes a METHODICAL pass over every effect (all 238, plus filters and audio): open it, check it works, and check its panel in the new look. Track it as a checklist; the real-app crawler and its shots are the tool for that.

### 21 Nov 2026, ~02:05 AWST: #1255 inside a category: M3 is good
**His words (verbatim):** m3 is good

**Logger's note (not his words):** He had M3's computer boards in view (dark and light). So the reading is: M3 for PC inside a category, alongside M1 for phone. The same rules apply: today's effect pictures, M5 on press-and-hold, today's sliders. Confirm in the decisions chat whether M3 means PC only.

### 21 Nov 2026, ~02:10 AWST: #1255 audio menus match the visual effects menus; wrap up tonight; do EVERYTHING properly after Monday 4pm
**His words (verbatim):** audio menus should be the same as visual effects just with the new icons u designed

also u still have a lot of menus u havent done designs which is fine for now as usage has to last for a while so maybe just finish this up and we can properly do EVERYTHING when monday 4pm hits

**His clauses:**
1. The audio menus use the SAME layouts as the visual effects menus (B1/B4 for the browser, M1/M3 inside a category), with the new animated audio pictures. The separate U1-U8 audio designs are not needed.
2. Many menus still have no designs. That's fine for now, because usage has to last.
3. Finish what's in progress and stop there.
4. After Monday 4pm (the weekly reset), do EVERYTHING properly.

**Logger's plan (not his words):**
- Tonight, finish only what's in flight:
  - B1r and B4r (Faves, New and Recents first)
  - the category styles C1-C4 drawn on the locked B1/B4 layout (his 01:55 ask)
  - the real-app new-look page
  Then design work STOPS.
- From Monday 23 Nov 16:00:
  - designs for every remaining menu (on the real-app re-skin)
  - the motion spec
  - the logo fix
  - THE decisions chat (his process rule)
  - then integration, starting only when he says he's ready
