# AU26: the next unread files after `collab-ui.js`: `js/collab-signal.js` (1,569 lines), then `settings.js`, `sfx.js`, `addmenu.js`

Against `origin/main` 0896fbf4 (v17.35). **Measured** = I ran it here (headless Chromium on Linux, 1280 and 380, and node for the pure parser), **Read** = read the code, **Guess** = not checked.

**Choice.** AU23's list ended "`collab-signal.js`, `addmenu.js`, `settings.js`, `draw-tool.js`, then `sfx.js`, `voice-rec.js`". I took `collab-signal.js` first (the one parser in the app whose input is typed in off another screen, and a hand-written MQTT client), then did targeted reads of `settings.js` (load whitelist), `sfx.js` (favourites store) and `addmenu.js` (memory store). I did **not** read `draw-tool.js` or `voice-rec.js` beyond a grep for `innerHTML`, `JSON.parse`, `localStorage`, `eval`: nothing risky shows.

**What I read, honestly:** in `collab-signal.js` about 900 of 1,569 lines: the base32 codec and `connCodeIn`, the whole SDP codec (`parseDesc`, `packDesc`, `unpackDesc`, `ipv6Bytes`), room codes, invite links, `cleanInner`, `seal` / `openEnvelope`, the replay guard, the MQTT packet builder and reader and both drivers. **Not read:** `handshake` (471-640, the auth exchange), `Rendezvous`, `dial`, `answer` (1283-1556), `relayGate`.

## One finding, red on main, green with the fix at 1280 and 380, mutation-caught

**AU26-1 (Measured): a burst of small valid MQTT packets in ONE frame is called "not MQTT" and drops the socket.** `MQ.reader(maxBytes)` refused when `buffered + incoming > 64 KB` **before it took a single packet out**. So one WebSocket frame holding 700 whole, valid publishes (76,300 bytes) returned `null`, which `MqttDriver.onmessage` turns into `lost('malformed')`: the socket is torn down and reconnects after 3 s. The comment says the cap is for "more buffered than any packet this client could want", which is a leftover unfinished packet, not a pile of finished ones.
- **Proof of the cause (node, `audit-unread-2-scripts/mqtt-reader-probe.js`):** 700 x 100-byte publishes in one chunk: `NULL (malformed)` on main; `ok` with the fix. Random re-cutting of 3000 random streams into 1 to 7 byte pieces always reads the same packets (chunk invariance holds, before and after).
- **Fix:** the cap now bounds what is left waiting after the packets are taken out, and a frame more than 8x the cap is still refused up front. 6 lines in `js/collab-signal.js`, `?v=` 5 to 6.
- **Test `AU26-1`:** RED on main at 1280 and 380, GREEN with the fix at both. Mutation: deleting the "what is still waiting" check goes RED (Measured, 1280).
- **Real-world weight (Guess):** low. A broker normally sends one packet per frame and our clean-session subscribe has no backlog. It matters if a broker or a proxy coalesces frames after a stall, and then the symptom is a reconnect loop with no message. I did not find a public broker that does it.
- Neighbours: `921 S6` is 32/34 at both widths on this tree and on main's source (the same two reds, "a shared copy finds its owner by itself" and "the Share panel hands out a link, a QR"), so nothing moved.

## Refuted or not worth a fix
- **`unpackDesc` on hostile bytes (Read, Measured by chunk probe on the reader only):** every read is bounds-checked, the candidate count is capped at 6, `kind` and `addrKind` are range-checked, a zero port is refused, and ufrag and pwd must match `[A-Za-z0-9+/]`, so no `\r\n` reaches the rebuilt SDP. Candidate text is rebuilt from bytes, never pasted. Extra bytes after the last candidate are accepted on purpose (`connCodeIn` relies on it).
- **`ipv6Bytes` with a crafted address such as `::1]:80@[::2` (Read):** `new URL('http://[' + ip + ']/')` can parse a host out of a hostile string, but `addrBytes` is only called on the LOCAL browser's own SDP in `parseDesc` and on bytes in `unpackDesc`, so the string never comes from a peer. No peer-controlled path.
- **`connCodeIn` on a huge pasted text (Read):** the shrink loop is capped at 512 rounds and each round is linear, so it cannot hang.
- **`settings.js` `load()` whitelist (Measured by reading DEFAULTS against the list):** every key in `DEFAULTS` is either restored or deliberately not (`theme`, `layout`). The #688 class (a new setting that is saved and never read back) is not present today. A test that sets every non-default value and reloads would keep it that way; not written, since nothing is red.
- **`sfx.js` favourites (Read):** a hand-edited array with a duplicate id leaves the id favourited after one un-star. It needs a hand edit of localStorage, so I left it.
- **`addmenu.js` memory (Read):** `memGet` accepts any object; `knownTab` filters the tab. Fine.
- **PeerJS driver sends `HEARTBEAT` and never checks an answer (Read, Guess on impact):** the MQTT driver got a ping-timeout fix in the S6 review so a half-open socket is found; the PeerJS one has no such check, so a path that died without a FIN stays "up" and `kick` skips an "up" driver. MQTT carries the room meanwhile, so the effect is a quieter second door, not a lost room. Not changed: it is a design call, and I could not build the half-open socket here.

Tests: `AU26-1` in `tests/tests.js`.
