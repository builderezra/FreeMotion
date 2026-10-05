# Sound effects you can ship inside FreeMotion — vetted

Checked 1 Oct 2026 against the live source pages, not ChatGPT's word. Source report: `sound-effects.md` (ChatGPT, snapshot 28104a3e / v17.21; HEAD is still 28104a3e, so the code citations below hold).

**Bottom line:** 79 of ChatGPT's 80 sounds are shippable. Every one of the 65 Freesound pages loaded (HTTP 200) and links to CC0 1.0 (`creativecommons.org/publicdomain/zero/1.0/`). All 15 Kenney files exist in CC0 packs. Format and length matched the live page for all 65 Freesound sounds. **One is out:** Anomaex, *Sci-Fi Explosion 2*. Its page says the source was "a bomb explosion … found in free access on the Internet without any rights", so nobody knows who owns the original recording. Of the other sources, **Pixabay and Sonniss do not fit** a sound library bundled in an app. **OpenGameArt is usable only for items marked CC0.**

## How each source was judged

| Source | Licence (checked on the source) | Ship inside the app, no credit? |
|---|---|---|
| **Freesound** | Each sound has its own licence, picked by the uploader. The options are CC0, CC BY, CC BY-NC and the retired Sampling+ ([FAQ](https://freesound.org/help/faq/)). | **OK only where that sound's own page says CC0.** All 65 below were re-checked one by one. CC BY needs credit and CC BY-NC bans commercial use, so neither goes in. |
| **Kenney** | [Impact Sounds](https://kenney.nl/assets/impact-sounds) (130 files) and [Interface Sounds](https://kenney.nl/assets/interface-sounds) (100 files) both say "Creative Commons CC0". [kenney.nl/support](https://kenney.nl/support): "Attribution is not required". The pack's LICENSE.txt: "free to use in personal, educational and commercial projects … (this is not mandatory)". | **OK.** Only condition: don't use Kenney's logo. |
| **OpenGameArt** | Licence is per item: CC0, CC-BY 3/4, CC-BY-SA 3/4, OGA-BY 3/4, GPL 2/3 ([FAQ](https://opengameart.org/content/faq)). | **Item by item.** CC0 items are OK. CC-BY and OGA-BY need credit. CC-BY-SA and GPL bring share-alike terms that don't belong in a bundled library. ChatGPT listed nothing from OpenGameArt. |
| **Pixabay** | Not CC0. The [Content License](https://pixabay.com/service/terms/) (updated 18 Nov 2024) says "You cannot sell or distribute the Content … on a Standalone basis", meaning content "in substantially the same form as it exists on the Service". Only items published before 9 Jan 2019 are CC0. | **NOT OK.** A sound-effects menu hands users the files unchanged, which is standalone distribution. Pixabay's music and sounds also have a public history of Content ID claims. |
| **Sonniss GDC bundles** | Royalty-free with no credit needed, but not CC0. The [licence](https://sonniss.com/gdc-bundle-license/) bans supplying the sounds "as sound effects to any other person". It also bans putting them in "a sound effects library, sample pack, asset pack, project template, software development kit or anything similar", and bans AI training. | **NOT OK.** A built-in effects menu in an editor is exactly the "sound effects library" case the licence forbids. Using them inside a film or game you make is fine. Shipping them as tools for other people is not. |

**Individual sounds checked:** all 80 ChatGPT entries. That is the 65 Freesound pages (licence, type, length, size, channels and description, scripted with curl) and the 15 Kenney filenames. The 7 Interface files are listed in the CC0 mirror [Calinou/kenney-interface-sounds](https://github.com/Calinou/kenney-interface-sounds). The 8 Impact files are in a directory listing of the pack. No audio was downloaded. Results: **79 OK**, **1 NOT OK** (Anomaex, unknown source recording), **0 dead links**, **0 CONDITIONS**.

### Notes on some OK items (no legal condition, but worth knowing)
- **qubodup**, *Collision* and *Seamless City Loop*. Both are CC0, and I checked that the sounds they were built from are CC0 too: timsc #332036 and jmbphilmes #129679. His profile asks for strict credit when "the sound itself is the product", but that clause is about his **CC BY** uploads. These two are CC0, so legally nothing is owed. ChatGPT left out his *Noisy Whooshes* for this reason but kept these two, which is inconsistent. Add a courtesy "Sounds: qubodup" line if you want to stay on good terms.
- **feastingfrog**, *Sci-fi riser*. Built from a CC0 paper-tear sound by Jan Schupke, according to its description. Fine.
- **o_ciz** asks for PayPal donations, and **Sadiquecat**, **Breviceps** and **SamuelGremaud** ask for credit or comments. All say it's optional. None of it is a licence term.
- **Lossy originals:** Entershift (MP3, 6 KB), INNORECORDS (MP3), reasanka (MP3), Rvgerxini (MP3), RyanKingArt (M4A), grcekh (M4A). Re-encoding a lossy file costs quality, so keep these in their original format or cut them to WAV.
- Most Kenney lengths were measured by ChatGPT and not re-measured here. The WAV sizes in the mirror fit "very short" (click_002 is 1.1 KB, glitch_001 is 4.4 KB).

## Where they go in the app

The Audio tab offers Import audio, Sound effects and Record voice (`js/addmenu.js:478`, `:491`, `:506`). Sound effects opens `FM.sfx` (`js/sfx.js`). It has 30 synthesised effects in six categories: **Movement, Impact, Build, Interface, Texture, Nature** (`js/sfx.js:94–542`). The category list is built from the data, in the order it appears (`js/sfx.js:917`). So **Cartoon** and **Foley** become new headings just by adding entries with `cat: 'Cartoon'` / `cat: 'Foley'`, with no change to the menu code. ChatGPT's "Transitions" fits into Movement, where *Pass by* and *Slide up* already live. "Glitch" fits into Texture, next to *Zap* and *Vinyl crackle*. The two city ambiences are not really Nature. Either put them under a renamed **Ambience** heading or skip them.

Two things to know before building. First, ChatGPT says REQUESTS.md "separately requests cartoon sounds, beeps, transitions/glitches, ambience, foley". **That's not true.** Those words appear nowhere in REQUESTS.md. They came from ChatGPT's own prompt in `PROMPTS.md`. The only related requests are #196 (v7.29) and #290 (v8.89), and both are done. Adding sampled sounds is therefore new work and Ezra's call. #196 recorded him wanting "some royalty free ones we find online". Second, choosing which sounds to use is a taste decision, so Ezra should listen and pick (the standing design rule).

★ = suggested first wave: short, cheap, and fills a gap the synthesised set doesn't cover. "Cut" means the file holds several sounds or a long take, so trim it to the best 1–3 s (CC0 allows editing).

### Movement (existing)
| Sound | Source | Licence | Original | Ship as |
|---|---|---|---|---|
| ★ Whoosh (mouth, slowed) | https://freesound.org/people/SimoSC/sounds/682473/ | CC0 | WAV 0.71 s stereo | whole |
| ★ Swing woosh (bullwhip) | https://freesound.org/people/Jofae/sounds/389590/ | CC0 | WAV 0.32 s | whole |
| ★ Whoosh, string + wood click | https://freesound.org/people/Sadiquecat/sounds/855723/ | CC0 | WAV 0.73 s mono | whole |
| Whoosh past mic | https://freesound.org/people/TimBahrij/sounds/234915/ | CC0 | WAV 6.7 s | cut ~1.5 s |
| Creepy whoosh (subtle) | https://freesound.org/people/SoundEffectsForAll/sounds/840812/ | CC0 | WAV 8.0 s | cut ~3 s |
| ★ Swoosh (transition) | https://freesound.org/people/Halgrimm/sounds/169867/ | CC0 | WAV 2.3 s | whole |
| Swooshes, short/deep set | https://freesound.org/people/susssounds/sounds/752068/ | CC0 | WAV 54.8 s set | cut 2–3 singles |
| Transition (breath, delayed) | https://freesound.org/people/DeVern/sounds/427533/ | CC0 | WAV 6.5 s | cut ~3 s |
| ★ Transition (hit + whoosh) | https://freesound.org/people/xkeril/sounds/736852/ | CC0 | WAV 4.0 s | whole |

### Build (existing)
| Sound | Source | Licence | Original | Ship as |
|---|---|---|---|---|
| ★ Simple riser | https://freesound.org/people/SoundEffectsForAll/sounds/840719/ | CC0 | WAV 3.6 s | whole |
| Metallic riser (reversed) | https://freesound.org/people/HenryRichard/sounds/451653/ | CC0 | WAV 7.8 s mono | whole or cut ~4 s |
| ★ Sci-fi riser synth whoosh | https://freesound.org/people/feastingfrog/sounds/760190/ | CC0 | WAV 3.3 s | whole |
| Painful But Cool Riser 2 | https://freesound.org/people/deadrobotmusic/sounds/745938/ | CC0 | WAV 33.9 s | cut ~4 s |
| Bass riser fx E | https://freesound.org/people/deadrobotmusic/sounds/571112/ | CC0 | WAV 14.3 s | cut ~4 s |

### Impact (existing)
| Sound | Source | Licence | Original | Ship as |
|---|---|---|---|---|
| Collision | https://freesound.org/people/qubodup/sounds/332058/ | CC0 (source also CC0) | FLAC 0.9 s mono | whole |
| Tile smash ×6 | https://freesound.org/people/Nox_Sound/sounds/554367/ | CC0 | WAV 9.7 s | cut 1–2 hits |
| ★ Explosion (Audition) | https://freesound.org/people/IdkMrGarcia/sounds/446625/ | CC0 | WAV 2.7 s | whole |
| ★ Large explosion | https://freesound.org/people/cejordi84/sounds/232398/ | CC0 | WAV 5.2 s | cut ~3 s |
| Explosion (breath) | https://freesound.org/people/FlashTrauma/sounds/398283/ | CC0 | WAV 3.1 s | whole |
| Short explosion (firework) | https://freesound.org/people/animationIsaac/sounds/207322/ | CC0 | WAV 1.4 s | whole |
| Light ping hits | https://freesound.org/people/xkeril/sounds/715597/ | CC0 | WAV 6.6 s set | cut 1–2 pings |
| Deep cinematic impact 5 | https://freesound.org/people/zazz.sound.design/sounds/754424/ | CC0 | WAV 6.8 s | cut ~3 s tail |
| ★ Metal tap — `impactMetal_medium_000.ogg` | https://kenney.nl/assets/impact-sounds | CC0 | OGG 0.27 s | whole |
| Wood knock — `impactWood_light_000.ogg` | https://kenney.nl/assets/impact-sounds | CC0 | OGG 0.27 s | whole |
| ★ Wood thump — `impactWood_medium_000.ogg` | https://kenney.nl/assets/impact-sounds | CC0 | OGG 0.33 s | whole |
| ★ Heavy punch — `impactPunch_heavy_000.ogg` | https://kenney.nl/assets/impact-sounds | CC0 | OGG 0.65 s | whole |
| Medium punch — `impactPunch_medium_000.ogg` | https://kenney.nl/assets/impact-sounds | CC0 | OGG 0.43 s | whole |
| ★ Glass tap — `impactGlass_light_001.ogg` | https://kenney.nl/assets/impact-sounds | CC0 | OGG 0.21 s | whole |
| Glass knock — `impactGlass_medium_000.ogg` | https://kenney.nl/assets/impact-sounds | CC0 | OGG 0.54 s | whole |
| Plate slam — `impactPlate_heavy_000.ogg` | https://kenney.nl/assets/impact-sounds | CC0 | OGG 0.49 s | whole |

### Interface (existing)
| Sound | Source | Licence | Original | Ship as |
|---|---|---|---|---|
| Menu sounds set | https://freesound.org/people/oussamaben/sounds/514833/ | CC0 | WAV 8.0 s set | cut 2–3 singles |
| Glassy UI with reverb | https://freesound.org/people/steaq/sounds/577468/ | CC0 | WAV 2.7 s | whole |
| Minimal UI pack (pops/clicks/ticks) | https://freesound.org/people/DesignDean/sounds/538236/ | CC0 | WAV 32.4 s set | cut 3–4 singles |
| Beep | https://freesound.org/people/MeTwo99/sounds/148694/ | CC0 | WAV 0.10 s | whole |
| ★ Beep select | https://freesound.org/people/IndigoRay/sounds/339129/ | CC0 | WAV 0.39 s | whole |
| Beep on/off | https://freesound.org/people/Entershift/sounds/704134/ | CC0 | MP3 0.34 s (lossy) | whole |
| ★ UI button click | https://freesound.org/people/el_boss/sounds/677861/ | CC0 | WAV 0.05 s | whole |
| UI click (mouth) | https://freesound.org/people/benzix2/sounds/467951/ | CC0 | OGG 0.12 s | whole |
| ★ Click — `click_001.ogg` | https://kenney.nl/assets/interface-sounds | CC0 | OGG 0.10 s | whole |
| Click — `click_002.ogg` | https://kenney.nl/assets/interface-sounds | CC0 | OGG ~0.01 s | whole |
| Tick — `tick_001.ogg` | https://kenney.nl/assets/interface-sounds | CC0 | OGG ~0.02 s | whole |
| ★ Confirmation — `confirmation_001.ogg` | https://kenney.nl/assets/interface-sounds | CC0 | OGG 0.29 s | whole |
| Drop — `drop_002.ogg` | https://kenney.nl/assets/interface-sounds | CC0 | OGG 0.19 s | whole |
| ★ Pluck — `pluck_001.ogg` | https://kenney.nl/assets/interface-sounds | CC0 | OGG 0.10 s | whole |

### Texture (existing — glitch / static)
| Sound | Source | Licence | Original | Ship as |
|---|---|---|---|---|
| Corrupted static (loopable) | https://freesound.org/people/dotY21/sounds/371183/ | CC0 | WAV 6.5 s mono (53 KB) | whole |
| ★ Malfunction static | https://freesound.org/people/dotY21/sounds/384132/ | CC0 | WAV 2.8 s mono | whole |
| CRT TV static | https://freesound.org/people/grcekh/sounds/546047/ | CC0 | M4A 53.7 s (lossy) | cut ~5 s loop |
| ★ Quick static glitches | https://freesound.org/people/Rvgerxini/sounds/507528/ | CC0 | MP3 5.7 s (lossy) | cut 1–2 s |
| Glitch / static noise | https://freesound.org/people/scenes/sounds/414918/ | CC0 | WAV 43.0 s | cut ~3 s |
| Pixel radio | https://freesound.org/people/MursilProduction/sounds/846734/ | CC0 | WAV 8.4 s | cut ~3 s |
| Radio static | https://freesound.org/people/wwstudioswastaken/sounds/625095/ | CC0 | FLAC 1:24.7 mono | cut ~5 s |
| Soft static noise | https://freesound.org/people/deadrobotmusic/sounds/555462/ | CC0 | WAV 2:24 | cut ~5 s loop |
| ★ Glitch blip — `glitch_001.ogg` | https://kenney.nl/assets/interface-sounds | CC0 | OGG ~0.02–0.05 s | whole |

### Nature (existing; the two city beds would read better under "Ambience")
| Sound | Source | Licence | Original | Ship as |
|---|---|---|---|---|
| Rain in the city | https://freesound.org/people/RyanKingArt/sounds/607228/ | CC0 | M4A 1:38.6 (lossy) | cut 10–15 s loop |
| Night ambience | https://freesound.org/people/parret/sounds/481883/ | CC0 | WAV 5:37 (85 MB) | cut 10–15 s loop |
| ★ Small stream | https://freesound.org/people/deadrobotmusic/sounds/687058/ | CC0 | WAV 46.6 s | cut 10–15 s loop |
| City loop (seamless) | https://freesound.org/people/qubodup/sounds/223093/ | CC0 (source also CC0) | FLAC 30.0 s | cut or whole loop |
| Forest ambience 2 | https://freesound.org/people/deadrobotmusic/sounds/687054/ | CC0 | WAV 35.8 s | cut 10–15 s loop |
| Forest rainstorm | https://freesound.org/people/rifualk/sounds/648474/ | CC0 | WAV 11:37 (128 MB) | cut 10–15 s loop |
| Rain + rainforest drips | https://freesound.org/people/INNORECORDS/sounds/457447/ | CC0 | MP3 4:00 (lossy) | cut 10–15 s loop |
| Forest, light rain | https://freesound.org/people/o_ciz/sounds/475636/ | CC0 (donation ask, optional) | WAV 2:16 | cut 10–15 s loop |
| ★ Forest birds (morning) | https://freesound.org/people/sama66/sounds/462137/ | CC0 | WAV 34.6 s | cut 10–15 s loop |

### Foley (new category)
| Sound | Source | Licence | Original | Ship as |
|---|---|---|---|---|
| ★ Boot footsteps (wood stage) | https://freesound.org/people/gpag1/sounds/392483/ | CC0 | WAV 3.6 s mono | whole |
| Footsteps, street (walk/run) | https://freesound.org/people/Rudmer_Rotteveel/sounds/316919/ | CC0 | WAV 7:37 | cut walk + run ~3 s each |
| Footsteps on wood (sneakers) | https://freesound.org/people/sillygrizzlies/sounds/635058/ | CC0 | WAV 29.6 s | cut ~3 s |
| Footsteps, wet pavement | https://freesound.org/people/Yuval/sounds/205817/ | CC0 | WAV 53.4 s | cut ~3 s |
| ★ Door open + close | https://freesound.org/people/Breviceps/sounds/457042/ | CC0 | WAV 2.2 s | whole |
| Office door open/close | https://freesound.org/people/MWsfx/sounds/573704/ | CC0 | WAV 6.0 s | cut ~3 s |
| Squeaky door takes | https://freesound.org/people/kobemano/sounds/745550/ | CC0 | WAV 30.2 s mono | cut 1 take |
| Home door (processed) | https://freesound.org/people/Sadiquecat/sounds/868519/ | CC0 | WAV 1.8 s mono | whole |

### Cartoon (new category)
| Sound | Source | Licence | Original | Ship as |
|---|---|---|---|---|
| Cartoon boing (jaw harp) | https://freesound.org/people/reelworldstudio/sounds/161122/ | CC0 | WAV 2.3 s (3.3 MB, high-rate) | whole |
| Boing ×2 (jaw harp) | https://freesound.org/people/suzenako/sounds/537060/ | CC0 | WAV 2.0 s | cut 1 |
| ★ Funny boing (mouth) | https://freesound.org/people/se2001/sounds/543641/ | CC0 | WAV 0.93 s | whole |
| ★ Cute bounce jump | https://freesound.org/people/Hemplock/sounds/618961/ | CC0 | WAV 0.34 s mono | whole |
| Sproing!! | https://freesound.org/people/se2001/sounds/514429/ | CC0 | WAV 2.2 s | whole |
| ★ Dizzy slide whistle | https://freesound.org/people/martian/sounds/403002/ | CC0 | WAV 1.1 s | whole |
| ★ Cartoon fall (slide whistle) | https://freesound.org/people/plasterbrain/sounds/395443/ | CC0 | FLAC 2.0 s | whole |
| Slide whistle up/down | https://freesound.org/people/SamuelGremaud/sounds/517632/ | CC0 | WAV 14.6 s set | cut 1–2 |
| Bamboo slide whistle set | https://freesound.org/people/reasanka/sounds/433567/ | CC0 | MP3 16.0 s (lossy) | cut 1–2 |

**Not shippable:** Sci-Fi Explosion 2, https://freesound.org/people/Anomaex/sounds/490266/. The page says CC0, but the source recording's owner is unknown. Plenty of other explosions above cover the same need.

## How to bundle (what the current code means for this)

- **Fetching and caching.** `sw.js` has no precache list (`sw.js:21–25`). Same-origin URLs **with a `?v=`** are cache-first (`sw.js:92–96`, `:180–190`). Anything **without** `?v=` always goes to the network (`sw.js:180`), so a sound fetched as plain `sfx/x.m4a` never works offline. Load each sound lazily from `js/sfx.js` (first ▶ or Add) as `sfx/<id>.<ext>?v=1`. It then works offline once heard while online. If "every sound offline from the first launch" matters, that needs a deliberate warm-up fetch, which is a decision for Ezra because it costs storage up front.
- **Never edit a sound file in place. Give a changed sound a new filename.** The old-copy pruner only knows paths that appear in `src=`/`href=` in index.html (`sw.js:71`). A sound URL built inside `js/sfx.js` is never pruned, so re-versioning one leaves the old copy cached for good, in the same storage quota as his IndexedDB media. Also, ship.sh's stale-`?v=` gate only watches `js/*.js`, `styles.css` and `theme-glass.css` (`tools/ship.sh:402`), so a sound edited in place would not be caught.
- **Format.** Sounds under ~0.5 s: 16-bit mono WAV (88 KB/s, so ≤ 44 KB each). That gives a sample-exact start and is the format the menu already uses (`js/sfx.js:617`). Longer sounds: AAC in `.m4a` at 96–128 kbps (12–16 KB/s). It decodes in Safari, Chrome and Firefox, and macOS's built-in `afconvert` writes it (`afconvert -f m4af -d aac -b 112000 in.wav out.m4a`). ffmpeg isn't installed. **Avoid Ogg:** Safari only fully decodes Ogg Vorbis from iOS 18.4, so the Kenney `.ogg` files need converting. The interface pack is already available as WAV in the CC0 mirror above. Check for a few ms of encoder silence at the start of each AAC file after decoding, and trim it in the catalogue entry, because a late hit is the one thing a sound effect can't get away with.
- **Stereo is lost today.** `renderBuffer` renders into a **1-channel** OfflineAudioContext (`js/sfx.js:575`, `:597`) and peak-normalises it (`:585`). Sampled entries need their own path (decode, then `encodeWav`, which handles any channel count, then the same `add` at `:773`). Otherwise stereo whooshes and pass-bys collapse to mono. Give new entries **distinct ids**: favourites are stored by id, and synthesised `whoosh` / `punch` / `rain` already exist.
- **Size budget.** The app's JS, CSS and HTML already total ~7.9 MB. Suggested budget: **≤ 1 MB for the first wave** (the ★ items: about 24 one-shots averaging ~20 KB plus one or two 12 s ambience loops at ~170 KB each comes to roughly 0.7–0.9 MB). One-shots ≤ 60 KB each, ambience loops ≤ 200 KB each, **≤ 3 MB if all 79 are cut and shipped**. Because loading is lazy, only sounds someone actually plays cost a download.
- **Getting the originals.** Freesound only gives full-quality downloads to logged-in users (the page player is a low-quality preview). **Ezra has to log in and download them himself.** Claude shouldn't create or use the account. Kenney packs download from the pack pages with no account.
- **Keep the paper trail anyway.** CC0 needs no credit. Still, add a small `sfx/SOURCES.md` with each file's URL, uploader, licence and date checked (copy the tables above), so the provenance can be shown if anyone ever asks. An optional "Sounds: Freesound contributors, Kenney" line in About is goodwill, not an obligation.
