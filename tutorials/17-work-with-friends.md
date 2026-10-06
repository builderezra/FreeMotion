# Edit a project together with a friend

You'll be able to share a project live, so a friend can edit it with you on their own phone.

1. Open your project. On the video, tap the small round button with a person and a plus.
2. A card called **Work with friends** says **Off**. At its foot, turn on the **Work with friends** switch.
3. The card now says **Share "your project name" live**. Tap **Start sharing**. The first time, a box asks **What should others see?** Type your name, pick a colour and tap **Continue**.
4. You now have a link, a QR picture and a short code. Tap **Copy link** and paste it into a message to your friend. **Share…** is next to it.
5. Your friend opens the link. FreeMotion opens a sheet called **Join a friend's project**. They tap **Join**.
6. A card asks you to let them in. Tap **Allow**.
7. You are both editing the same project. When you are done, open the round button again and tap **Stop sharing**.

No link? Your friend can type the short code instead. On Home they tap the person icon at the top, then **Join a friend's project…**, type the code and tap **Join**.

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
| 6 owner is asked: Allow / Not now | js/collab-ui.js:4119 | yes |
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
