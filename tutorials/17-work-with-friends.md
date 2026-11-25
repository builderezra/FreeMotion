# Edit a project together with a friend

You'll be able to share a project live, so a friend can edit it with you on their own phone.

1. Open your project. Tap the gear at the top right (next to the up-arrow). Above Canvas settings there is a **Friends** bar: tap it.
2. A card called **Work with friends** opens. Work with friends is on for everyone; if the card says **Off**, someone turned it off on this phone, so turn the **Work with friends** switch at its foot back on.
3. The card now says **Share "your project name" live**. Tap **Start sharing**. The first time, a box asks **What should others see?** Type your name, pick a colour and tap **Continue**.
4. You now have a link and a short code. The short code is blurred until you tap it, and **QR** shows a code your friend can scan. Tap **Copy link** and paste it into a message to your friend. On most phones **Share…** is next to it.
5. Your friend opens the link. The first time, FreeMotion asks them to pick a name and colour (they tap **Continue**); if they had turned Work with friends off, it first asks them to turn it back on (they tap **Turn on**). On an iPhone it may first offer to open the link in the FreeMotion app instead of Safari; they follow its steps. Then a sheet called **Join a friend's project** appears, and they tap **Join**. <!-- not walked: needs a second device on a real network; the container has no network -->
6. A card says your friend wants to join. Tap **Let in**. Answer within 2 minutes, or it turns them away and they have to try again. <!-- not walked: needs a second device on a real network; the container has no network -->
7. You are both editing the same project. When you are done, tap the red **LIVE** at the top left of the video (or your friend's initials beside it) and tap **Stop sharing**. A box asks you to confirm: tap **Stop sharing** again.

No link? Your friend can type the short code instead (it stops working 30 minutes after you close the sharing card). On Home they tap the round profile button at the top (a person, or their initials or photo once they have a profile), then **Join a friend's project…**, type the code and tap **Join**. <!-- #hm-profile-btn in .hm-top-actions (index.html); its menu: js/home.js openHomeProfileMenu. Read from the code 25 Nov, not walked in a browser -->

On a computer: click the cog (Canvas settings) in the row with the time counter, just left of the Export arrow, and open **Friends**: it is a small block there with a ⤢ button, and Canvas settings is the big one beside it. The same buttons are there. <!-- not walked: the walk was the 380 px phone layout only -->

Tip: Nothing is shared until you tap **Start sharing**. To keep Work with friends out of the way altogether, turn it off in Settings.

Note: Everyone who joins sees the whole project, its notes and reminders included, whatever they join as. Up to 12 people can be in a project shared from a computer and 6 from a phone, counting you. <!-- the second sentence was a small line in Sharing settings until #1255: js/collab-ui.js drawSettingsStep -->

Note: A friend who types the short code always has to be let in by you. With the link you choose, under **When someone uses the link**: **Ask me first** or **Let them in**. <!-- was the line under that switch: js/collab-ui.js askRow -->

Note: On a phone, keep FreeMotion open while you share: sharing pauses when your screen locks. <!-- was a standing line of a phone's Share panel until #1255 -->

Note: The gear at the foot of the sharing card opens Sharing settings. Under **You**, **Change…** sets the name and colour the others see. **Editors can invite others** lets an Editor see the link and pass it on: with the link on **Ask me first** you still let each person in, and on **Let them in** whoever they give it to gets straight in. A link they already copied works until you reset it. With **Viewers and commenters can export** off, their FreeMotion won't export the project or keep a copy when they leave; their device needs the clips to play it, so it can't stop a screen recording. <!-- were the descriptions under those two switches: js/collab-ui.js drawSettingsStep -->

Note: **Show others’ pointers** shows their mouse pointer and their taps, in their colour, and **Show others’ selections** an outline in their colour around the layers they have selected. **Swap codes only** uses no online helpers: links and short codes stop working, and you swap codes with each person instead. <!-- were the descriptions under those three switches -->

Note: In a project a friend shared with you, **Watch along** on someone's row makes your screen follow theirs: where they are in the video, and what they play. Tap it again to stop. <!-- was the line under the people of a friend's panel: js/collab-ui.js drawGuestPanel -->

If it doesn't work: If the link won't connect, tap **Link not working? Swap codes instead** and follow the two steps it shows: you copy a swap code to them, and they copy one back. A friend who was sent something taps **Got an invite? Join with what your friend sent** and pastes the link or swap code, or types the short code.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1 the gear (Canvas settings) with the Friends bar above it (the round person-plus on the video was removed by #1243 G9) | index.html #m-settings, #cv-friends | re-written 20 Nov for #1243 G9 |
| 2 card named Work with friends; Off only when the switch is off (on by default since #921 clause 19) | js/collab-ui.js:1375, js/settings.js:560 | yes |
| 2 the switch row at the foot | js/collab-ui.js:1424 | yes |
| 3 Share “name” live | js/collab-ui.js:1316 | yes |
| 3 Start sharing | js/collab-ui.js:1338 | yes |
| 3 What should others see? / Continue | js/collab-ui.js:212 | yes |
| 3 Continue button | js/collab-ui.js:249 | yes |
| 4 link, QR, short code | js/collab-ui.js:1349 | yes |
| 4 Copy link | js/collab-ui.js:2102 | yes |
| 4 Share… beside it | js/collab-ui.js:2108 | yes |
| 5 Join a friend's project sheet | js/collab-ui.js:3349 | yes |
| 5 Join button | js/collab-ui.js:3408 | yes |
| 5 link prefills the sheet and waits for one tap | js/collab-ui.js:3419 | yes |
| 6 a joining friend gets Let in / Don't allow (Allow / Not now is only for a member asking to edit) | js/collab-ui.js:4120 | yes |
| 6 the link asks first by default | js/collab-ui.js:360 | yes |
| 7 Stop sharing | js/collab-ui.js:1597 | yes |
| No link: Home's round profile button at the top (a person, or initials or a photo) | index.html #hm-profile-btn | read 25 Nov, not walked |
| No link: Join a friend's project… in its menu | js/home.js:2957 | yes |
| No link: type the short code | js/collab-ui.js:3357 | yes |
| PC: the cog is in the row with the time counter, left of Export (not at the top) | index.html:325 #btn-settings (index.html:283 #btn-canvas is hidden at 1280) | re-checked 11 Oct at 1280 |
| PC: Friends row in Canvas settings | index.html:1043 | yes |
| Tip: nothing shared until Start sharing | js/collab-ui.js:1349 | yes |
| Tip: the Work with friends switch in Settings | js/settings.js:560 | yes |
| If: Swap codes instead | js/collab-ui.js:1568 | yes |
| 6 the card turns them away after 2 minutes | js/collab-ui.js (KNOCK_TIMEOUT 120000) | yes |
| 5 first-time friend sees What should others see?, then Join (Turn on Work with friends only if they turned it off) | js/collab-ui.js:5128, :5024 | yes |
| 4 QR is a button; the short code is blurred until tapped; code lasts 30 min after close | js/collab-ui.js:2102-2131, js/collab-core.js:126 | yes |
| 7 once live, LIVE is at the top left and the faces chip shows initials; both open Friends (#1243 G9) | js/collab-ui.js syncLive / U.openPeople, js/collab-presence.js drawChip | re-written 20 Nov |
