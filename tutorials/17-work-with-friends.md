# Edit a project together with a friend

You'll be able to share a project live, so a friend can edit it with you on their own phone.

1. Open your project. On the video, tap the small round button with a person and a plus.
2. A card called **Work with friends** says **Off**. At its foot, turn on the **Work with friends** switch.
3. The card now says **Share "your project name" live**. Tap **Start sharing**. The first time, a box asks **What should others see?** Type your name, pick a colour and tap **Continue**.
4. You now have a link and a short code. The short code is blurred until you tap it, and **QR** shows a code your friend can scan. Tap **Copy link** and paste it into a message to your friend. On most phones **Share…** is next to it.
5. Your friend opens the link. The first time, FreeMotion asks them to turn on Work with friends (they tap **Turn on**) and to pick a name and colour (they tap **Continue**). On an iPhone it may first offer to open the link in the FreeMotion app instead of Safari; they follow its steps. Then a sheet called **Join a friend's project** appears, and they tap **Join**.
6. A card says your friend wants to join. Tap **Let in**. Answer within 2 minutes, or it turns them away and they have to try again.
7. You are both editing the same project. When you are done, tap the round button again (it now shows your friend's initials) and tap **Stop sharing**.

No link? Your friend can type the short code instead (it stops working 30 minutes after you close the sharing card). On Home they tap the person icon at the top, then **Join a friend's project…**, type the code and tap **Join**.

On a computer: the round button is hidden on wide screens. Click the cog (Canvas settings) at the top and open **Friends**. The same buttons are there.

Tip: Nothing is shared until you tap **Start sharing**. The switch is labelled "still being tested" in Settings, so keep a copy of anything important.

If it doesn't work: If the link won't connect, tap **Link not working? Swap codes instead** and follow the two steps it shows.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1 round person-plus button on the video | js/collab-ui.js:5178 | yes |
| 1 it opens the Friends block (phone only) | js/collab-ui.js:5192 | yes |
| 2 card named Work with friends, Off | js/collab-ui.js:1367 | yes |
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
| No link: Home person icon | index.html:687 | yes |
| No link: Join a friend's project… in its menu | js/home.js:2957 | yes |
| No link: type the short code | js/collab-ui.js:3357 | yes |
| PC: cog opens Canvas settings | index.html:283 | yes |
| PC: Friends row in Canvas settings | index.html:1043 | yes |
| PC: the round button is hidden on wide screens | styles.css:11073 | yes |
| Tip: nothing shared until Start sharing | js/collab-ui.js:1349 | yes |
| Tip: still being tested | js/settings.js:551 | yes |
| If: Swap codes instead | js/collab-ui.js:1568 | yes |
| 6 the card turns them away after 2 minutes | js/collab-ui.js (KNOCK_TIMEOUT 120000) | yes |
| 5 first-time friend sees Turn on Work with friends, then What should others see?, then Join | js/collab-ui.js:5094, :5024 | yes |
| 4 QR is a button; the short code is blurred until tapped; code lasts 30 min after close | js/collab-ui.js:2102-2131, js/collab-core.js:126 | yes |
| 7 once live the round button shows initials | styles.css:11073, js/collab-presence.js:1150-1190 | yes |
