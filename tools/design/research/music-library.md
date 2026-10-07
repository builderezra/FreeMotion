# R6: a music library for a local-only app (52 CC0 tracks, each with its source and licence)

Written 7 Oct. **What I did:** fetched each source page (the licence badge and the text on it), downloaded the files, read their real length with `ffprobe`, and re-encoded each as AAC to get the size a phone would download. **What I did not do: listen to any track.** The mood column comes from the collection's title, so treat it as a first sort, not a review. The licence text below was read with a fetch-and-summarise tool, not by eye on the raw page; it quotes what each page says and every page showed the "CC0" badge linked to <http://creativecommons.org/publicdomain/zero/1.0/>. A human should open three at random before anything ships.

## Licence, in one place (quoted, per source)
- **Holizna (44 tracks in the table, rows 1 to 44).** Every collection page on OpenGameArt shows `CC0` linking to the CC0 1.0 dedication, and says: *"This music is public domain Cc0, so use it how you want!"* (Happy Lo-Fi, Chill Beats, Funk, Gamer Beats, Happy Pop Electronic, Lo-Fi and Chill, Retro Wave, Sad Lo-Fi, Chills: the wording differs by a capital letter only). The artist's own Bandcamp (holiznacc0.bandcamp.com) says the same in a search snippet: the archive is dedicated to the creative commons via CC0 and credit is not required. The files inside the zips are named `HoliznaCC0 - <title>`, so the licence travels with the filename. I downloaded and opened 7 of the collections' zips (rows are marked with their zip).
- **cynicmusic, nene, Wolfgang_, Emma_MA, CodeManu, TAD (rows 45 to 52, one track each).** Each page shows the `CC0` badge. Quotes where a page says more: Determined Pursuit: *"This track is in the public domain as of January 2017. No attribution necessary."*; A Legend Will Rise: attribution is *"not required, though the author appreciates it"*; Epic Endgame Cinematic: the author *asks to be contacted* if you use it (a request, not a condition of CC0).
- **Left out because I could not verify or because the licence is not no-attribution:** Pixabay Music (its own licence, which bars distributing the files on their own, and a bundle of music in an app is that), Kevin MacLeod and most of the Free Music Archive (CC-BY: attribution required), anything on a "royalty-free" site with its own terms, and the other 33 tracks on the OpenGameArt "CC0 - Cinematic Music" collection (`https://opengameart.org/content/cc0-cinematic-music`; the collection page says "No attribution is required" but has no per-track licences, and I only opened eight of its tracks). I also did not use a track whose page mixes licences (one lo-fi page in the search results combined CC-BY and CC0 sources, so its result is CC-BY).
- **The honest risk with CC0 on a user-upload site.** The dedication only binds if the uploader is the author. Holizna uploads under their own name and has a matching Bandcamp page; the one-track uploads are by named accounts whose pages say they composed them. I cannot prove authorship. Keep the page URL beside every track in the app's data (the table's last column) so a takedown can be answered.

## The 52 tracks
Length is mm:ss measured on the file. "Source MB" is the file as downloaded (the Holizna `.ogg`, which the zips ship beside a 320 kbps `.mp3` of the same piece; the others as named). **AAC 64 and AAC 96 are what I measured re-encoding to stereo AAC-LC `.m4a`** (ffmpeg's native encoder; a better encoder will be a little smaller at the same quality).

| # | Title | Artist | Mood (from collection title) | Length | Source MB | AAC 64 kbps MB | AAC 96 kbps MB | Licence page |
|---|---|---|---|---|---|---|---|---|
| 1 | City In The Rearview | Holizna | chill | 2:55 | 6.34 | 1.46 | 2.17 | [Chill Beats (Collection)](https://opengameart.org/content/chill-beats-collection) |
| 2 | Families | Holizna | chill | 2:23 | 4.82 | 1.2 | 1.79 | [Chill Beats (Collection)](https://opengameart.org/content/chill-beats-collection) |
| 3 | Opinions | Holizna | chill | 2:47 | 5.33 | 1.39 | 2.1 | [Chill Beats (Collection)](https://opengameart.org/content/chill-beats-collection) |
| 4 | Old Age | Holizna | chill | 3:33 | 7.38 | 1.8 | 2.73 | [Chill Beats (Collection)](https://opengameart.org/content/chill-beats-collection) |
| 5 | Dream Pop | Holizna | chill | 4:01 | 7.75 | 2.01 | 3.0 | [Chill Beats (Collection)](https://opengameart.org/content/chill-beats-collection) |
| 6 | Autumn | Holizna | chill | 2:49 | 5.51 | 1.42 | 2.15 | [Chill Beats (Collection)](https://opengameart.org/content/chill-beats-collection) |
| 7 | Eat | Holizna | upbeat / vlog | 2:59 | 6.33 | 1.49 | 2.29 | [Funk (Collection)](https://opengameart.org/content/funk-collection) |
| 8 | Sleep | Holizna | upbeat / vlog | 3:18 | 6.88 | 1.65 | 2.49 | [Funk (Collection)](https://opengameart.org/content/funk-collection) |
| 9 | Breath | Holizna | upbeat / vlog | 2:31 | 5.55 | 1.27 | 1.92 | [Funk (Collection)](https://opengameart.org/content/funk-collection) |
| 10 | Make Money | Holizna | upbeat / vlog | 3:43 | 8.36 | 1.87 | 2.84 | [Funk (Collection)](https://opengameart.org/content/funk-collection) |
| 11 | Make Love | Holizna | upbeat / vlog | 3:46 | 8.14 | 1.89 | 2.89 | [Funk (Collection)](https://opengameart.org/content/funk-collection) |
| 12 | Make Funk | Holizna | upbeat / vlog | 2:43 | 5.95 | 1.37 | 2.05 | [Funk (Collection)](https://opengameart.org/content/funk-collection) |
| 13 | Final Level | Holizna | upbeat | 3:59 | 8.5 | 2.02 | 3.01 | [Gamer Beats (Collection)](https://opengameart.org/content/gamer-beats-collection) |
| 14 | Coins | Holizna | upbeat | 4:14 | 9.86 | 2.15 | 3.24 | [Gamer Beats (Collection)](https://opengameart.org/content/gamer-beats-collection) |
| 15 | Legends | Holizna | upbeat | 3:30 | 6.79 | 1.76 | 2.66 | [Gamer Beats (Collection)](https://opengameart.org/content/gamer-beats-collection) |
| 16 | Hard Mode | Holizna | upbeat | 2:59 | 5.84 | 1.48 | 2.3 | [Gamer Beats (Collection)](https://opengameart.org/content/gamer-beats-collection) |
| 17 | Back In The 80s | Holizna | upbeat / vlog | 3:59 | 9.12 | 2.02 | 3.1 | [Happy Pop Electronic (Collection)](https://opengameart.org/content/happy-pop-electronic-collection) |
| 18 | Earth | Holizna | upbeat / vlog | 3:19 | 7.46 | 1.66 | 2.51 | [Happy Pop Electronic (Collection)](https://opengameart.org/content/happy-pop-electronic-collection) |
| 19 | A Small Town On Pluto | Holizna | upbeat / vlog | 3:52 | 8.21 | 1.94 | 2.9 | [Happy Pop Electronic (Collection)](https://opengameart.org/content/happy-pop-electronic-collection) |
| 20 | Happy Dance | Holizna | upbeat / vlog | 2:35 | 5.92 | 1.3 | 1.98 | [Happy Pop Electronic (Collection)](https://opengameart.org/content/happy-pop-electronic-collection) |
| 21 | transcendental earth people | Holizna | upbeat / vlog | 2:33 | 5.89 | 1.28 | 1.9 | [Happy Pop Electronic (Collection)](https://opengameart.org/content/happy-pop-electronic-collection) |
| 22 | Bouncing | Holizna | upbeat / vlog | 1:27 | 3.65 | 0.73 | 1.1 | [Happy Pop Electronic (Collection)](https://opengameart.org/content/happy-pop-electronic-collection) |
| 23 | Love Love Love | Holizna | upbeat / vlog | 2:55 | 6.73 | 1.46 | 2.19 | [Happy Pop Electronic (Collection)](https://opengameart.org/content/happy-pop-electronic-collection) |
| 24 | Poor, But Happy | Holizna | lo-fi | 2:07 | 4.02 | 1.07 | 1.6 | [Happy Lo-Fi (Lofi Collection)](https://opengameart.org/content/happy-lo-fi-lofi-collection) |
| 25 | Blue Skies | Holizna | lo-fi | 2:55 | 5.09 | 1.46 | 2.19 | [Happy Lo-Fi (Lofi Collection)](https://opengameart.org/content/happy-lo-fi-lofi-collection) |
| 26 | Letting Go Of The Past | Holizna | lo-fi | 2:59 | 6.28 | 1.5 | 2.23 | [Happy Lo-Fi (Lofi Collection)](https://opengameart.org/content/happy-lo-fi-lofi-collection) |
| 27 | Puppy Love | Holizna | lo-fi | 2:29 | 5.14 | 1.25 | 1.87 | [Happy Lo-Fi (Lofi Collection)](https://opengameart.org/content/happy-lo-fi-lofi-collection) |
| 28 | Clouds | Holizna | lo-fi | 3:49 | 8.39 | 1.92 | 2.89 | [Happy Lo-Fi (Lofi Collection)](https://opengameart.org/content/happy-lo-fi-lofi-collection) |
| 29 | Happy, but a little off | Holizna | lo-fi | 1:57 | 4.02 | 0.98 | 1.46 | [Happy Lo-Fi (Lofi Collection)](https://opengameart.org/content/happy-lo-fi-lofi-collection) |
| 30 | New Shoes | Holizna | lo-fi | 2:35 | 4.42 | 1.29 | 1.94 | [Happy Lo-Fi (Lofi Collection)](https://opengameart.org/content/happy-lo-fi-lofi-collection) |
| 31 | First Snow | Holizna | lo-fi | 2:54 | 5.31 | 1.46 | 2.15 | [Lo-Fi and Chill (Collection), zip 1 of 3](https://opengameart.org/content/lo-fi-and-chill-collection) |
| 32 | Laundry On The Wire | Holizna | lo-fi | 2:59 | 5.1 | 1.49 | 2.27 | [Lo-Fi and Chill (Collection), zip 1 of 3](https://opengameart.org/content/lo-fi-and-chill-collection) |
| 33 | Everything You Ever Dreamed | Holizna | lo-fi | 3:40 | 8.97 | 1.85 | 2.77 | [Lo-Fi and Chill (Collection), zip 1 of 3](https://opengameart.org/content/lo-fi-and-chill-collection) |
| 34 | Keeping Cool | Holizna | lo-fi | 2:33 | 4.56 | 1.28 | 1.92 | [Lo-Fi and Chill (Collection), zip 1 of 3](https://opengameart.org/content/lo-fi-and-chill-collection) |
| 35 | Snow Drift | Holizna | lo-fi | 2:53 | 5.04 | 1.45 | 2.15 | [Lo-Fi and Chill (Collection), zip 1 of 3](https://opengameart.org/content/lo-fi-and-chill-collection) |
| 36 | Windows Down | Holizna | lo-fi | 2:45 | 6.09 | 1.39 | 2.1 | [Lo-Fi and Chill (Collection), zip 1 of 3](https://opengameart.org/content/lo-fi-and-chill-collection) |
| 37 | 2 Hour Delay | Holizna | lo-fi | 2:11 | 4.68 | 1.11 | 1.63 | [Lo-Fi and Chill (Collection), zip 1 of 3](https://opengameart.org/content/lo-fi-and-chill-collection) |
| 38 | Drama | Holizna | upbeat / cinematic synth | 3:30 | 8.31 | 1.76 | 2.69 | [Retro Wave (Collection), zip 1 of 2](https://opengameart.org/content/retro-wave-collection) |
| 39 | Retro Soundtrack | Holizna | upbeat / cinematic synth | 2:37 | 5.48 | 1.31 | 2.0 | [Retro Wave (Collection), zip 1 of 2](https://opengameart.org/content/retro-wave-collection) |
| 40 | Cyber Anxiety | Holizna | upbeat / cinematic synth | 2:49 | 6.37 | 1.41 | 2.1 | [Retro Wave (Collection), zip 1 of 2](https://opengameart.org/content/retro-wave-collection) |
| 41 | Lost In The Jungle | Holizna | upbeat / cinematic synth | 2:42 | 5.95 | 1.36 | 2.04 | [Retro Wave (Collection), zip 1 of 2](https://opengameart.org/content/retro-wave-collection) |
| 42 | Night Life | Holizna | upbeat / cinematic synth | 3:43 | 7.62 | 1.86 | 2.76 | [Retro Wave (Collection), zip 1 of 2](https://opengameart.org/content/retro-wave-collection) |
| 43 | Day Dreams | Holizna | upbeat / cinematic synth | 3:17 | 6.65 | 1.64 | 2.5 | [Retro Wave (Collection), zip 1 of 2](https://opengameart.org/content/retro-wave-collection) |
| 44 | Fires Uptown | Holizna | upbeat / cinematic synth | 3:10 | 7.02 | 1.59 | 2.35 | [Retro Wave (Collection), zip 1 of 2](https://opengameart.org/content/retro-wave-collection) |
| 45 | A Legend Will Rise (Orchestral) | CodeManu | cinematic | 1:09 | 2.79 (mp3) | 0.57 | 0.86 | [a-legend-will-rise-orchestral](https://opengameart.org/content/a-legend-will-rise-orchestral) |
| 46 | Epic Endgame Cinematic | cynicmusic | cinematic | 1:31 | 32.18 (wav) | 0.75 | 1.11 | [epic-endgame-cinematic](https://opengameart.org/content/epic-endgame-cinematic) |
| 47 | New Sunrise | nene | cinematic | 2:16 | 39.38 (wav) | 1.07 | 1.58 | [new-sunrise](https://opengameart.org/content/new-sunrise) |
| 48 | At Home - Orchestral (file cinematic-calm.wav) | Wolfgang_ | cinematic / calm | 1:14 | 13.11 (wav) | 0.61 | 0.91 | [at-home-orchestral](https://opengameart.org/content/at-home-orchestral) |
| 49 | Determined Pursuit (epic orchestra loop) | Emma_MA | cinematic / upbeat | 1:48 | 19.05 (wav) | 0.89 | 1.32 | [determined-pursuit-epic-orchestra-loop](https://opengameart.org/content/determined-pursuit-epic-orchestra-loop) |
| 50 | The Hope | TAD | cinematic | 3:39 | 5.26 (mp3) | 1.8 | 2.68 | [the-hope](https://opengameart.org/content/the-hope) |
| 51 | Once Upon a Time (loop) | TAD | cinematic / light | 0:57 | 1.85 (mp3) | 0.47 | 0.7 | [once-upon-a-time-loop](https://opengameart.org/content/once-upon-a-time-loop) |
| 52 | Outlive (Short version) | TAD | cinematic | 0:26 | 0.64 (mp3) | 0.22 | 0.32 | [outlive-short-version](https://opengameart.org/content/outlive-short-version) |
**Totals (Measured):** the 44 Holizna tracks are 133.8 minutes, 280.8 MB as ogg, **67.0 MB** at AAC 64 and **100.9 MB** at AAC 96 (0.50 and 0.75 MB per minute). By collection title: lo-fi 14 tracks (Happy Lo-Fi 7, Lo-Fi and Chill 7), chill 6, upbeat 11 (Gamer Beats 4, Happy Pop Electronic 7), funk 6, retro wave 7 (those last two read as upbeat or cinematic synth), cinematic 8 singles. There are more Holizna collections than I downloaded (Lo-Fi and Chill has 2 more zips, Retro Wave 1 more, Sad Lo-Fi 2, and others), so 30+ is not the limit.

## Why `.m4a` (AAC) and not Ogg or Opus
The app decodes music with `decodeAudioData` and plays it through an `<audio>`/`<video>` element (media.js, `FM.loadVideoFile`), on both iPhone and Android. AAC in an `.m4a` is the one format both decode everywhere (**Read** the app's own picker list, addmenu.js:51, which names `.m4a` first for iOS; **Guess** that older iPhones do not decode Ogg Vorbis, which is why I did not keep the `.ogg`). An MP3 would also work but is about 30 percent bigger at the same quality (**Guess**, not measured).

## How small could a starter pack be?
Measured sizes: 0.50 MB per minute at 64 kbps stereo, 0.75 at 96 (a joint-stereo or mono encode would cut a quarter or half again; I did not test it). A starter pack should hold excerpts, not whole songs: a beginner's video is 15 to 60 seconds, and a loop point beats a long fade.

| Pack | Tracks | Length each | AAC 64 | AAC 96 |
|---|---|---|---|---|
| Tiny | 10 | 60 s | **4.8 MB** | 7.2 MB |
| Starter (my pick) | 12 | 90 s | **8.6 MB** | 13.0 MB |
| Bigger | 15 | 90 s | 10.8 MB | 16.2 MB |
| Everything above, full length | 52 | 2:49 average | about 75 MB | about 115 MB |

(The pack arithmetic was done in code from the measured 0.50 and 0.75 MB per minute.) **My pick: 12 tracks of 90 seconds at 64 kbps, 8.6 MB: three each of upbeat, chill, lo-fi, cinematic**, cut at a bar line with a short fade. Because the app is local-first, the pack should not be in the first load: fetch it the first time someone taps Music.

## How the app could offer more, without a server of ours
1. **Where the files live:** a `music/` folder of `.m4a` files plus one `index.json` (id, title, artist, mood, seconds, bytes, sha256, source page URL, licence URL) served as static files from the same GitHub Pages site the app is on. No server code; Pages is a static host (**Guess**: the repo has size limits, 1 GB recommended, so 115 MB of music is fine but a separate repo or a release is cleaner than the app repo's history).
2. **Fetch on demand:** the Sound menu (Simple: `Music from your files`, `Sound effects`, `Record voice` in simple-tools.js:177-184 on `980-p22-r3`; Full: Add, Audio) gets a fourth entry, "Music library". It lists `index.json` (a few KB), plays a 20-second preview streamed straight from the file, and **"Add" downloads that one track**, stores it in IndexedDB and adds it through the same path as a picked file (`FM.loadVideoFile`, then the add-music command), so undo, export and project save need nothing new. A project that uses a library track embeds it like any other file (the 6 MB per-clip cap on project files, storage.js:944, would skip a long track: another reason for 90-second excerpts).
3. **Optional packs:** "Download all chill (12 tracks, 9 MB)" for people on Wi-Fi; the service worker can cache the pack so it works offline afterwards.
4. **Credit screen even though none is required:** one line per track (title, artist, "CC0") reachable from the library; it costs nothing and answers "who made this".
5. **The cost in app code is small and the cost in content curation is not:** someone has to listen to 50 tracks, pick the 12, and cut loops. That is the real job and it is not mine here.

## What I would not do
Ship all 280 MB of `.ogg` (nobody needs 3 minutes of lo-fi at 288 kbps on a phone), or bundle the files into the app repository's main branch history (every re-encode adds megabytes to the clone).
