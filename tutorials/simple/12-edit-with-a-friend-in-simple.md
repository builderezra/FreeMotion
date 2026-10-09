# Edit the same video with a friend in Simple

You'll be able to share a project live, let a friend in, and keep working together without breaking each other's clips.

Before you start: a project in Simple (tutorial 02) and a friend with FreeMotion on their own phone or computer. **Only the first half of this was walked. The second half needs two devices and the free online helpers, which my test browser cannot reach; every step from 7 on is marked NOT WALKED and comes from the code and the suite.** <!-- walked 9 Oct at 380 with real touch on hunt/simple-transitions (2.6 live session), label v17.24, one browser, no network to the relays -->

1. Tap the small person icon at the top left of the picture. A panel opens with **Simple / Full**, the canvas size and a card called **Work with friends**, with three steps: turn it on, send the link, they tap it. It says **Off**. <!-- walked: the icon at (22,72); shots/12-01.jpg -->
2. Tap the **Work with friends** switch at the bottom. The card becomes **Share “Project 1” live, Not sharing**, with you listed (a colour dot, "Pick the name and colour others will see") and a big **Start sharing** button. A line says nothing is shared until you tap it. <!-- walked: switch at (325,659); shots/12-02.jpg -->
3. Tap **Start sharing**. First it asks **What should others see?**: type your name, pick a colour and tap **Continue**. <!-- walked: shots/12-03.jpg; typed Ezra -->
4. The card now says **Live · waiting for someone**, with your name and **You · Owner**, a **Copy link** button, a **QR** button and a short code hidden behind **Tap to show** with its own **Copy**. The short code stops working 30 minutes after you close the panel. <!-- walked; shots/12-04.jpg; "30 minutes" is the card's own sentence -->
5. Tap **Copy link** and send it to your friend. If the card says "Your link can't get through on this network", use the **Swap codes instead** at the bottom of the card: you copy a code to them and they copy one back. <!-- walked up to seeing the red line (this container has no route to the helpers); the swap-code steps were NOT WALKED -->
6. Under **When someone uses the link** pick **Ask me first** or **Let them in**; **New people join as** Editor or Viewer. The short code always asks you first. <!-- walked: both pickers are on the card; the choices were not tried -->
7. NOT WALKED: your friend taps the link, and you are asked to let them in. They appear in the card with their colour. <!-- Read from js/collab-ui.js; the join path is in the suite's 921 tests on a fake network -->
8. NOT WALKED: while your friend can edit, Simple keeps the clips where they are so nothing slides under them. The line says "Sam can edit · clips stay put" (more people: "3 others edit · clips stay put"); on your friend's phone it says "Clips stay put while you both edit". Titles, captions, looks and sound still work for both of you. <!-- js/spine-words.js liveOwner1/liveOwnerN/liveGuest; DESIGN D14 first half -->
9. NOT WALKED: if you try to move or trim a clip your friend is working on, the line says "Sam is editing ‘Clip 2’ · try again soon". <!-- js/spine-words.js busy; tests 921 S6e for the refusal itself -->
10. NOT WALKED: if your friend goes offline the line says "Sam is offline · clips stay put" and gives you **Arrange anyway**. Use it only when you know Sam will not come back with edits: after it, "Clips can move · what they changed offline may land in the wrong place". **Make Sam a Viewer** takes their editing away for good; they can watch. <!-- js/spine-words.js awayOwner1, arrangeAnyway, waivedSaid, makeViewer, madeViewer; tests simple P2.6 S6a, S6b -->
11. NOT WALKED: if you tap undo, it undoes your last change only; if your friend changed the same thing since, the line says "Undid, except what Sam changed". <!-- js/spine-words.js undidExcept; tests simple P2.6 S6d -->
12. To stop, tap the small person icon again and tap **Stop sharing**. <!-- walked: the red Stop sharing button is on the card (shots/12-04.jpg); I did not tap it -->

Tip: Keep FreeMotion open while you share; the card says it pauses when your screen locks. <!-- the card's own sentence; walked (visible in the card text) -->

If it doesn't work: the card's red line tells you what failed. "Your link can't get through on this network" means swap codes instead. If your friend's FreeMotion is older, they are asked to update first. <!-- the first is walked; the second is test 921 S6 the version gate -->

## Verification
| step | what I did (380 px, real touch, hunt/simple-transitions, v17.24) | what happened | file:line |
|---|---|---|---|
| 1 | tapped the person icon | the Simple/Full panel with the Work with friends card, "Off" | js/collab-ui.js |
| 2 | tapped the switch | "Share “Project 1” live, Not sharing", Start sharing | js/collab-ui.js |
| 3 | Start sharing, typed a name, Continue | the card says Live · waiting for someone | js/collab-ui.js |
| 4 | read the card | Copy link, QR, a hidden short code, the 30-minute line | js/collab-ui.js |
| 5 | read the red line | "Your link can’t get through on this network" (no relays reachable here) | js/collab-ui.js |
| 7 to 11 | not walked | Read only | js/spine-words.js, tests 921 and simple P2.6 |
