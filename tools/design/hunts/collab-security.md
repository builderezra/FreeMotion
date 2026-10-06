# Work with friends: privacy and security review

Against `origin/main` b46b47d (v17.23), files `js/collab-*.js`, the app code that renders peer data, and `COLLAB-DESIGN.md` (§14, §16). Report only; nothing in the app or tests was changed or run for this section.
**Verified** = I read the line and quote it. **Guess** = needs a real browser, a real relay or a real attacker to settle. Arithmetic marked *(computed)* was run in a script, not done in my head.

**Bottom line.** The transport is well built: end-to-end authenticated encryption, no TURN, validated and size-capped peer input, and no `innerHTML` in any collab file. The weaknesses I found are about **what is shared and what the screens promise**, not broken crypto. Two are worth acting on before this is shown to the public: the owner's private project notes travel to every guest, and the words "can only watch" do not describe what a Viewer can do.

## 1. What leaves the device, and where it goes

| Data | Goes to | Seen in the clear by | Verified at |
|---|---|---|---|
| The project: every edit, every clip, fonts, comments, presence (name, colour, cursor, tool) | Straight to the other devices over a WebRTC data channel (DTLS-encrypted, plus the app-level handshake below) | Only the devices in the room | `COLLAB-DESIGN.md:954-1018`; the handshake is `S.handshake` `js/collab-signal.js:471` |
| The first hello (an encrypted offer/answer, 2 STUN candidates) | `wss://0.peerjs.com/peerjs`, `wss://broker.emqx.io:8084/mqtt`, `wss://broker.hivemq.com:8884/mqtt` | The three relays see: your internet address, the topic name (128 bits derived from the secret), message sizes and times. They cannot read the offer: AES-GCM with a key derived from the secret | `js/collab-signal.js:1274-1275`; envelope and skew check `:868-880` |
| Your public internet address | `stun:stun.l.google.com:19302` and `stun:stun.cloudflare.com:3478`, and then **the other devices** (that is how a direct connection works) | Google, Cloudflare, and every device that finishes a connection | `js/collab-signal.js:921` |
| Nothing through a media relay | There is **no TURN server** (the hand-written clients never use PeerJS's default TURN, `COLLAB-DESIGN.md:883`). On a very strict network the connection simply fails; it never falls back to a third party carrying your project | n/a | `js/collab-signal.js:921` lists only STUN |
| "Swap codes only" mode | No relay, no STUN: ICE list is `[]` | Nobody outside the two devices | `COLLAB-DESIGN.md` §14.4 "as built"; `js/collab-ui.js:1983-1992` (`PRIVACY_FULL` says so) |

The screens already tell the truth about the relays by name (`js/collab-ui.js:1983-1992`: "PeerJS, EMQX and HiveMQ… Google and Cloudflare… see your internet address and when a project is being shared"). I did not find a place where the app claims more privacy than it has, except in the two findings below.

**Is it encrypted end to end?** Yes for everything that matters. Room keys are 16 random bytes each (`js/collab-signal.js:51`, `getRandomValues`); the invite link carries 128 bits and never reaches a server (it sits after `#`). The connection's DTLS fingerprints are bound into an HMAC handshake (`COLLAB-DESIGN.md:954-1018`), and the review in that file already found and fixed the one real weakness (a man in the middle on the copy-and-paste code path) by adding a short comparison string. A relay operator cannot forge it (`COLLAB-DESIGN.md` §14.6 "who can sit in the middle").

## 2. Findings, ranked

### F1. MEDIUM: the owner's private project notes travel to every guest, viewers included
- **What:** `scene.project.notes` holds the notes and reminders in the Notes pad (`js/notepad.js:14-26`: "Notes live on the PROJECT"). What is withheld from a session is only five workspace pointers (`DENY`, `js/collab-session.js:31-40`: `ofTemplate`, `ofTemplateRev`, `ofElement`, `returnTo`, `fromTemplate`). `notes` is explicitly a synced, keyed array (`js/collab-path.js:251`), and the roles table gives Commenters and Viewers read access (`COLLAB-DESIGN.md:1207`).
- **Why it matters:** a person writing "client says budget is 400, don't mention" in the Notes pad of the project they are about to share with a friend as a Viewer is sharing it. The Share screens do not say so (`PRIVACY_FULL`, `js/collab-ui.js:1983-1992`, is only about the network). The same app already treats notes as private elsewhere: exporting a template deletes them (`js/storage.js:3037`).
- **Smallest fix:** one plain sentence in the Share sheet: "Your project notes are shared too." The stronger fix is a decision for Ezra, not a code change: keep notes private to the owner (add `notes` to `DENY`), which means editors can no longer see or write notes, and the design's own note on why comments are separate (`COLLAB-DESIGN.md:63`, D9) would need re-reading.
- **Test:** a snapshot of a project with a note whose text is a canary: if notes stay shared, the Share sheet text must contain the sentence; if made private, the canary must not appear in `viewOfProject` output (`js/collab-session.js:33`).

### F2. MEDIUM: "Viewer: can only watch" is not true, and cannot be made true
- **What:** the role label reads "Viewer: can only watch" (`js/collab-ui.js:50`). The default setting `roExport: true` (`js/collab-ui.js:360`, `:1017`) lets Viewers and Commenters **export a video and save a copy of the project** (`COLLAB-DESIGN.md:1209`; the screen says so only after you ask, `js/collab-ui.js:3121`). Separately, every guest, whatever the role, **receives all the media files** so the project can play on their device (`js/collab-media.js`, whole file; the 100 MB ask threshold is `ASK_ABOVE`, `:47`). So even with `roExport` off a Viewer holds the raw clips.
- **Why it matters:** a friend who is invited to look at a cut can walk away with the footage. That is how every peer-to-peer tool works, but "can only watch" reads as a confidentiality promise.
- **Smallest fix:** change the words: "Viewer: can watch, and keep a copy". Default `roExport` to `false` for Viewers if Ezra wants the label to be closer to true. Be plain that this stops only the buttons.
- **Test:** the role card text for Viewer matches the settings default (a string test in the style of `39411`).

### F3. LOW-MEDIUM: the short code is 45 bits; fine online, thin offline
- **Facts:** 9 Crockford characters ≈ 45 bits, stretched with PBKDF2-SHA256 at 200 000 rounds (`js/collab-signal.js:676-691`, `COLLAB-DESIGN.md:837-842`). Online guessing is not possible: to even find the right rendezvous topic an attacker must already derive it from a guess. The code is only listened on for `CODE_TTL` after it was last on screen, 30 minutes by default (`js/collab-ui.js:370-375`), and every code join must be approved by the owner (`const knock = !member && (room.kind === 'code' || …)`, `js/collab-ui.js:2479`).
- **The open question:** the three relays are public. If an attacker simply records every encrypted offer on them (a wildcard subscription is normal on public brokers: **guess**, I did not test the two brokers), then each guess costs one PBKDF2 run. *(computed)* 2^45 = 3.5×10^13 guesses. At 28 ms per guess on one CPU thread (`COLLAB-DESIGN.md` §14 "as built") that is about 31 000 CPU-years; with an assumed 8.5×10^9 SHA-256 operations per second per GPU (**assumption**, a high-end card) it is about 21 000 guesses per second, so **about 52 GPU-years, or about 19 days on 1 000 GPUs**. A casual attacker cannot; a funded one could, against a code that was recorded.
- **Smallest fix:** none needed for a free tool; if wanted, a 10-character code (50 bits) multiplies that by 32. The invite link (128 bits) has no such limit.

### F4. LOW: the host's internet address reaches a code or link holder before they are admitted
- **Why:** the owner's approval ("knock") happens after the connection and the handshake, because the handshake runs over the data channel (`COLLAB-DESIGN.md:954` "ctl, before any document data"; `S.handshake` takes an established endpoint, `js/collab-signal.js:471`). A refused person has therefore already completed ICE with the host.
- The screen says "Anyone with your link or short code can see the internet address of each device that joins" (`js/collab-ui.js:1988`). It does not say that this includes **the owner's own address, even for someone he turns away**.
- **Smallest fix:** one clause in that line. A real fix (answer only after approval) would break the one-tap link promise; I would not do it.

### F5. LOW: peer media is decoded with no pixel limit (a local crash, not a data leak)
- Files from an admitted peer must be image/video/audio and pass `FM.loadImageFile` / `FM.loadVideoFile` (`COLLAB-DESIGN.md:1061`). `loadImageFile` checks nothing about size (`js/media.js:802-806`). The one limit is GIFs: 64 million pixels (`js/media.js:725`), which is still a 256 MB working array plus a 256 MB canvas on a phone. The file is also stored on the guest's device (IndexedDB), so reopening the project decodes it again.
- **Not collab-specific** (his own files take the same path), but a peer is untrusted and can send one deliberately. A peer already has to be admitted, so this is a nuisance, not a break-in.
- **Smallest fix:** refuse above a pixel budget (for example 50 MP for stills, 16 MP for GIF) in the loader, with a plain message. **Test:** a 1×1-megabyte PNG header declaring 20 000 × 20 000 is refused without allocating.

### F6. LOW: the Assistant reads text that guests write (indirect prompt injection)
- The AI digest sent to Anthropic when the owner uses the Assistant includes every layer name (`js/ai.js:114`, `:117`). A guest can name a layer "Ignore previous instructions…". The Assistant can only emit editing operations that `ai-ops` clamps; **I did not audit `ai-ops` end to end**, so I cannot rule out an operation that matters. I found no tool in the Assistant that sends data anywhere except to Anthropic itself.
- Also worth stating on the privacy screen: the AI features send the project to Anthropic, which is outside the "straight between devices" sentence (`js/collab-ui.js:1983`) by design.
- **Smallest fix:** wrap peer-authored strings in the digest as quoted data and tell the model so; no behaviour change for honest use.

### F7. LOW: room secrets are stored unencrypted on the owner's device
- The owner's room (including the link) is saved with `localStorage.setItem` (`js/collab-ui.js:318-320`). That is how a reload keeps the room alive. Anyone with access to the unlocked browser profile, or any script running on this origin, reads it. The app has no XSS found in this review (see §3), so this is about shared computers. **Smallest fix:** none beyond the existing "reset link" button; mention it in the help text.

### F8. INFO: defaults
- New rooms default to `ask: true` (the owner approves every knock) but the link grants **Editor** (`js/collab-ui.js:360`; `js/collab-session.js:856`). With "ask" turned off the sheet says plainly "Whoever you give the link to gets straight in, as an Editor" (`js/collab-ui.js:3173`). The wording is honest; the default role is a product decision. A default of Viewer would be the cautious choice.

## 3. Checked and fine (so nobody re-checks)

| Question | Answer | Where |
|---|---|---|
| Is peer text ever put into HTML? | **No `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `eval` / `new Function` exists in any `js/collab-*.js`** (a search finds only comments saying so). Elsewhere every dynamic `innerHTML` I found sets static icons or labels; the shared `el(tag, cls, text)` helpers use `textContent` (`js/inspector.js:11-16`, `js/home.js:921-926`), as do the toast (`js/app.js:1395`) and `ask.js:30`. | `grep` over `js/` |
| Size limits | Per op value 2 MB, per transaction 4 MB and 5 000 ops, 200 000 characters per text leaf, names 32, comments 2 000, 500 comments, 200 replies, 2 000 layers, a rate limit of 30 tx/s with a burst of 60 per person | `js/collab-core.js:50-66`, `js/collab-host.js:174-241` |
| Schema checks | Every op is validated for kind, fields, path shape, id format, no `__proto__`, depth ≤ 32, finite numbers; ops that would rename an id or delete a key field are refused | `js/collab-host.js:163-241` |
| Hostile project size | Width and height clamped to 16-7680, fps 1-120, duration ≤ 3 600 s on the live path | `js/collab-bridge.js:147` → `js/storage.js:1004-1016` |
| A guest turning the project into a tracker | `fillImage` accepted only as `data:image/…`; colours, gradient angle and type coerced | `js/storage.js:1531-1546`, reached by `js/collab-bridge.js:144` |
| Fonts from peers | Family must match `^FMF[A-Za-z0-9]{1,60}$`, ≤ 4 MB | `js/collab-media.js:415`, `:50` |
| Pre-admission flooding | Before a joiner is admitted its link is `quiet`: at most 32 messages / 256 KB are read, then it is closed | `js/collab-ui.js:2465`, `:3010` |
| Replay / flood of offers | 120 s clock skew, nonce cache (10 min), 10 offers per minute per peer tag and 30 for the room; nonce recorded only after it decrypts | `js/collab-signal.js:868-890` |
| Download abuse | Above 100 MB the guest is asked; the guest checks free space and offers "get what fits"; parts of 4 MiB go to IndexedDB, never one big array | `js/collab-media.js:47`, `:747-775`, `:43` |
| Kicked person coming back | "Remove" changes the link and the code; a device hint (`p:` key) is only a hint | `js/collab-ui.js:2470-2476` (comment says so) |

## 4. A claim in the design I could not verify
`COLLAB-DESIGN.md:1062` says a test seeds `fm.anthropic.key` with a canary and asserts it appears in no outgoing frame. I searched `tests/tests.js` for `fm.anthropic.key`, `sk-ant` and `canary` near collab tests and found no such test (the only `sk-ant` string is an unrelated fake key at `tests/tests.js:93190`). The key is not part of the synced document (`viewOfProject` copies the project, `js/collab-session.js:33-43`; the key lives in `localStorage` only, `js/ai-key.js:14`), so I believe the claim is true, but the test that proves it was either never written or has a name I did not search for. **Suggested guard:** add that test.

## 5. What I could not verify
- Behaviour of the two public MQTT brokers (wildcard subscriptions, retention): needs a real connection (F3).
- Whether `ai-ops` can be steered to anything harmful (F6).
- Real WebRTC leak behaviour (for instance an mDNS candidate being unresolvable and exposing a LAN address): the suite uses only in-page pairs with `iceServers: []` by design (`CLAUDE.md`, "No network, ever").
