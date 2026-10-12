/* NEW FILTER LOOKS — twelve candidates for Ezra to pick eight from (#966, backlog §B B8). DATA ONLY: nothing here is in the app.
 *
 * His steer (#966): "you can add new filters … more choices always better … this is the complex version we want as much choice
 * as possible". His design rule (#545): draw the options, render them, he picks, THEN build. So these are options, not a build.
 *
 * WHAT EACH ENTRY IS. The same shape as a js/filters.js FILTERS entry (id, name, section, desc, effects), plus:
 *   subject — the fx-art photo it is shown on (js/fx-thumbs.js FILTER_SUBJECT rules: cars only in Tuff, no photo repeated inside a
 *             section — the one exception is flagged on Autumn);
 *   from    — 'B8' (the backlog's eight, tools/design/plans/2026-09-29-idle-backlog/backlog.md §B8) or 'new' (four more, so he has
 *             twelve to choose from);
 *   was     — the backlog's name when it was changed.
 * Every effect and every control below exists on branch new-prep (d50f8732: e1-land + polish batches 7 and 8). Nothing from a later
 * polish batch is used (e.g. Halftone's Print / Colour dots from batch 13 is NOT here). measure-filters-node.js checks it: every
 * type is in FM.fxRegistry, every key is in that type's schema, every number is inside its range (nothing gets clamped by
 * filters.js saneChild), every option is one of its options, the CSS-filter effects are listed first (filters.js rule 1), and every
 * Tuff look carries `flashdark` (his queue-349 ask; the suite holds the section to it).
 *
 * NAMES. Checked against the 56 filters, the 211 effect labels, #912's ten waiting on branch fm912-filters (Sepia, Digicam,
 * Portra, Moody, Cyberpunk, Tungsten, Airy, Colour Splash, Cyanotype, HDR) and tools/design/954-effect-names.md (none is an
 * Alight Motion name). Two changed from the backlog:
 *   · "Game Boy" -> "Handheld": Game Boy is Nintendo's trademark, and BEFORE-PUBLISHING.md exists because the app has to be its
 *     own thing before it goes public. His call — the backlog name is kept in `was`.
 *   · "Solarised" is kept, but it sits one letter from the effect it is built on (Solarize). If that reads as a duplicate in the
 *     list, "Darkroom Flip" or "Man Ray" are the fallbacks.
 *
 * THE DISTANCE TABLE is at the bottom of this file (measured, not guessed — see measure-filters-node.js).
 */
(function (root) {
  'use strict';
  const e = (type, params) => ({ type: type, params: params || {} });

  /* "MOVED" notes below record where a draft landed too close on #675's measure and what moved it (measure-filters-node.js;
     the table at the bottom is the final placement). A move keeps the look's idea and shifts the one thing the measure reads. */
  const CANDIDATES = [
    // ---- the backlog's eight (B8) -----------------------------------------------------------------------------------------
    { id: 'handheld', name: 'Handheld', was: 'Game Boy', from: 'B8', section: 'stylised', subject: 'run',
      desc: 'An old handheld game screen — four shades of green and chunky pixels.',
      /* MOVED: the backlog's grayscale + contrast 1.15 put a mid grey on the DARK green (#306230), 3.2 from Cold Steel. Palette
         Map picks the NEAREST colour, and on grey the bands fall at 61 / 124 / 169 of 255 — so a Levels gamma lift (1.6: 96 -> 138)
         puts mid-tones on the light green, which is what those screens looked like, while the darks keep their two greens.
         (Brightness 1.3 did the same to the measure but flattened the photo to one green — seen in the node preview.) 19 from
         its nearest. */
      effects: [e('grayscale', { amount: 1 }), e('contrast', { amount: 1.2 }),
                e('levels', { inblack: 0, inwhite: 255, gamma: 1.6 }),
                e('pixelate', { size: 6 }),
                e('palettemap', { mode: 1, count: 4, color: '#0f380f', color2: '#306230', color3: '#8bac0f', color4: '#9bbc0f' })] },
    { id: 'xray', name: 'X-Ray', from: 'B8', section: 'stylised', subject: 'bay',
      desc: 'Flipped to a negative and tinted blue-white, glowing like a scan on a light box.',
      effects: [e('invert', { amount: 1 }), e('grayscale', { amount: 1 }), e('contrast', { amount: 1.35 }),
                e('duotone', { amount: 0.85, color: '#020814', color2: '#bfe8ff' }),
                e('softglow', { amount: 0.35, radius: 160, threshold: 45 })] },
    { id: 'cctv', name: 'CCTV', from: 'B8', section: 'tuff', subject: 'huracan',
      desc: 'Security-camera footage — washed-out grey, blocky compression, lines and a dark pulse.',
      /* MOVED: the backlog's numbers (contrast .9, brightness .96, flash .3) sit 10.7 from Copperplate at the #675 frame — and its
         un-flashed look is right on top of Old Film. Washed-out is the idea, so it goes BRIGHTER and flatter (contrast .8,
         brightness 1.25) with a lighter pulse (.2): 14.8 from Fog. */
      effects: [e('grayscale', { amount: 0.85 }), e('contrast', { amount: 0.8 }), e('brightness', { amount: 1.25 }),
                e('compresscrunch', { quality: 0.35, blocksize: 10, chromablock: 20, ringing: 0.4 }),
                e('noise', { amount: 18, speed: 12 }),
                e('scanlines', { amount: 0.14, spacing: 3 }),
                e('vignette', { amount: 0.35, size: 36 }),
                e('flashdark', { amount: 0.2, speed: 6, soft: 0.1, floor: 0.4 })] },
    { id: 'pencil', name: 'Pencil', from: 'B8', section: 'stylised', subject: 'towers',
      desc: 'Drawn in pencil on warm paper.',
      effects: [e('sketch', { amount: 0.9, darkness: 560, threshold: 12, tooth: 35 }),
                e('temperature', { amount: 8 }),
                e('levels', { inwhite: 245, outblack: 22 })] },
    { id: 'autumn', name: 'Autumn', from: 'B8', section: 'cinematic', subject: 'bush',
      // ⚠️ bush is Low Key's photo too (also Cinematic). It is the only fx-art photo with real foliage, which is the whole look.
      desc: 'Greens turned to orange and gold — the same place in autumn.',
      /* MOVED: the Green and Yellow bands cannot touch the #675 frame (an orange-red), so the draft measured as its grade alone —
         3.2 from Desert. An Orange band (deeper, richer: hue −8, sat +20, lum −6) is the third leaf colour and moves it 12.6 away.
         Both leaf bands are widened to 1.5: at 1 the Green band changed the #858 fixture by 0.17 (weak) and Yellow by 0.38. */
      effects: [e('contrast', { amount: 1.12 }), e('saturate', { amount: 1.15 }),
                e('hslbands', { band: 3, hue: -40, sat: 15, lum: -5, range: 1.5 }),
                e('hslbands', { band: 2, hue: -12, sat: 20, lum: 0, range: 1.5 }),
                e('hslbands', { band: 1, hue: -8, sat: 20, lum: -6 }),
                e('temperature', { amount: 20, tint: 6 }),
                e('vignette', { amount: 0.25, size: 44 })] },
    { id: 'greencode', name: 'Green Code', from: 'B8', section: 'cinematic', subject: 'dusk',
      desc: 'Dark, green and drained of colour — the hacker-movie grade.',
      /* MOVED: the draft (contrast 1.22, saturate .7) sat 8.5 from VHS Tape. Darker and more drained (brightness .78, contrast
         1.3, saturate .5, shadows −30) is the film's look anyway, and nothing else in the set is dark-and-quiet: 16.4 from Static. */
      effects: [e('brightness', { amount: 0.78 }), e('contrast', { amount: 1.3 }), e('saturate', { amount: 0.5 }),
                e('colorbalance', { red: -24, green: 22, blue: -16, range: 2 }),
                e('highlightsshadows', { highlights: -10, shadows: -30 }),
                e('vignette', { amount: 0.4, size: 34 })] },
    { id: 'skygrad', name: 'Sky Grad', from: 'B8', section: 'cinematic', subject: 'pair',
      desc: 'A warm brown grad over the sky, the way a screw-on filter darkens the top of the shot.',
      // angle 90 puts `color` at the TOP (gradientoverlay: g = (ry·sin + half) / 2·half, 0 at the top); Multiply by white = no change
      /* MOVED, AND STILL THE CLOSEST OF THE TWELVE (11.2). A grad is a TOP-TO-BOTTOM change and #675 reads one flat colour in the
         centre, so it can only see the tint there; the draft sat 10.4 from Acid Wash. 576 variants were searched (four browns,
         amount, midpoint, saturation, contrast, brightness) and none clears 11.6 — the middle of the map is the most crowded part
         of it. Stronger grad (.75) at an even midpoint (.5) with saturation 1.2 is the best. The probe re-measures it in Chrome. */
      effects: [e('contrast', { amount: 1.05 }), e('saturate', { amount: 1.2 }),
                e('gradientoverlay', { shape: 0, angle: 90, blend: 1, mid: 0.5, amount: 0.75, color: '#a0672e', color2: '#ffffff' })] },
    // city, not cat: the flip needs big bright areas to act on (a sky, a sun) — on the dark cat photo it read as plain black and white
    { id: 'solarised', name: 'Solarised', from: 'B8', section: 'mono', subject: 'city',
      desc: 'Black and white with the bright parts flipped to dark — the darkroom accident photographers turned into a look.',
      /* MOVED: at the backlog's threshold .55 the #675 grey never flips, so the draft measured as plain black and white — 3.5 from
         Newsprint (#579 wants 8 between monos). A lower threshold (.3, softness .1) flips more of the picture, which is the
         stronger, more obviously solarised version, and lands it in the one gap the mono set has: 11.5 from Photocopy, 12 from
         Platinum. */
      effects: [e('grayscale', { amount: 1 }), e('contrast', { amount: 1.15 }),
                e('solarize', { threshold: 0.3, softness: 0.1, mode: 1 }),
                e('vignette', { amount: 0.3, size: 40 })] },

    // ---- four more (new) ----------------------------------------------------------------------------------------------------
    { id: 'stainedglass', name: 'Stained Glass', from: 'new', section: 'stylised', subject: 'sunpath',
      desc: 'Cut into glowing glass tiles with dark lead lines between them.',
      // MOVED: at saturate 1.4 alone it sat 3.8 from Neon Night; lit-from-behind glass is BRIGHT (brightness 1.35): 16.3 from Poppy
      effects: [e('brightness', { amount: 1.35 }), e('saturate', { amount: 1.5 }), e('contrast', { amount: 1.1 }),
                e('hextiles', { size: 24 }),
                e('edge', { amount: 4, polarity: 1, blend: 1, mix: 90, threshold: 8 })] },
    // bay, not towers: a pale aerial came out grey on the screen; a sunset has colour for the lights to carry
    { id: 'ledwall', name: 'LED Wall', from: 'new', section: 'glow', subject: 'bay',
      desc: 'Shown on a giant stadium screen — square lights with dark gaps, glowing.',
      /* MOVED: with the bloom keyed at 45% it filled the gaps on any mid-bright picture (6.4 from Ember). Keyed at 65% only the
         bright lights bloom and the black grid stays black between them: 14.7 from Desert. */
      effects: [e('brightness', { amount: 1.15 }), e('contrast', { amount: 1.12 }), e('saturate', { amount: 1.5 }),
                e('mosaic', { size: 10, sample: 1 }),
                e('grid', { size: 10, thickness: 3, mix: 1, color: '#000000' }),
                e('lightglow', { amount: 0.55, radius: 8, threshold: 65 })] },
    { id: 'watercolour', name: 'Watercolour', from: 'new', section: 'stylised', subject: 'shore',
      desc: 'Soft painted washes, edges bleeding, much paler than life.',
      // MOVED: at brightness 1.08 / saturate .9 it sat 10.2 from Cross Process; paler and quieter (1.35 / .55) is 17.9 from Polaroid
      effects: [e('brightness', { amount: 1.35 }), e('saturate', { amount: 0.55 }),
                e('oilpaint', { radius: 4, detail: 0, punch: 0.4 }),
                e('softglow', { amount: 0.3, radius: 80, threshold: 55 }),
                e('faded', { amount: 0.35, lift: 18, desat: 10 })] },
    { id: 'darkroom', name: 'Darkroom', from: 'new', section: 'tuff', subject: 'mclaren',
      desc: 'Everything in deep red, like a photo developing under the safelight — with the dark pulse.',
      effects: [e('grayscale', { amount: 1 }), e('contrast', { amount: 1.35 }), e('brightness', { amount: 0.9 }),
                e('duotone', { amount: 1, color: '#080000', color2: '#ff3a22' }),
                e('vignette', { amount: 0.5, size: 30 }),
                e('flashdark', { amount: 0.3, speed: 8, soft: 0.3, floor: 0.4 })] },
  ];

  /* RESERVES — measured too, used only if a candidate above fails in Chrome or he wants a swap. (A fifth, "Sodium" — one orange
     street-lamp colour, Tuff — was dropped: every placement it could take was within 9 of Midnight, Static, CRT or Green Code.) */
  const RESERVES = [
    { id: 'underwater', name: 'Underwater', from: 'new', section: 'cinematic', subject: 'dog',
      desc: 'The reds gone and everything blue-green and hazy, like a camera under the sea.',
      effects: [e('saturate', { amount: 0.85 }),
                e('colorbalance', { red: -45, green: 6, blue: 22 }),
                e('temperature', { amount: -30, tint: -18 }),
                e('softglow', { amount: 0.3, radius: 120, threshold: 50 }),
                e('vignette', { amount: 0.35, size: 36 })] },
    { id: 'synthwave', name: 'Synthwave', from: 'new', section: 'vivid', subject: 'city',
      desc: 'Purple shadows, hot pink mids and yellow highlights — an 80s album cover.',
      // MOVED: at an even midpoint it sat 3.1 from Teal & Orange; pushing the midpoint to 70 keeps more of the picture purple
      effects: [e('contrast', { amount: 1.25 }),
                e('gradientmap', { stops: 3, amount: 0.9, midpoint: 70, color: '#2a0060', color3: '#ff1f8f', color2: '#ffe08a' }),
                e('lightglow', { amount: 0.4, radius: 12, threshold: 60 }),
                e('scanlines', { amount: 0.1, spacing: 3 })] },
    { id: 'etching', name: 'Etching', from: 'new', section: 'stylised', subject: 'dusk',
      desc: 'Drawn in fine engraved lines in banknote green on cream paper.',
      // MOVED: as plain black and white it sat 5.2 from Noir; banknote ink on cream paper, brighter, sits where nothing else does
      effects: [e('grayscale', { amount: 1 }), e('brightness', { amount: 1.14 }), e('contrast', { amount: 1.1 }),
                e('halftonelines', { size: 4, angle: 30, weight: 0.9 }),
                e('duotone', { amount: 1, color: '#10301f', color2: '#f2ecd8' })] },
  ];

  /* Names that must not be reused: #912's ten (built on fm912-filters, waiting on his pick, Q12). */
  const TAKEN_912 = ['Sepia', 'Digicam', 'Portra', 'Moody', 'Cyberpunk', 'Tungsten', 'Airy', 'Colour Splash', 'Cyanotype', 'HDR'];

  /* The three existing filters each one sits nearest to ON ITS OWN PHOTO (mean |Δ| per channel, measured in node). The render
     probe shows these beside it. Written by measure-filters-node.js --photos … --write. */
  const COMPARE = /* COMPARE:BEGIN */ {"handheld":["tropic", "desert", "polaroid"], "xray":["fog", "matte", "platinum"], "cctv":["silver", "oldfilm", "newsprint"], "pencil":["dreamy", "platinum", "neonnight"], "autumn":["kodachrome", "goldenhour", "desert"], "greencode":["blackout", "lowkey", "midnight"], "skygrad":["ember", "overdrive", "copperplate"], "solarised":["newsprint", "silver", "moonbeam"], "stainedglass":["crossproc", "poppy", "candy"], "ledwall":["candy", "poppy", "popsicle"], "watercolour":["dreamy", "halo", "neonnight"], "darkroom":["blackout", "midnight", "bloodline"], "underwater":["moonbeam", "silver", "whiteout"], "synthwave":["thermal", "ultraviolet", "popsicle"], "etching":["dreamy", "neonnight", "halo"]} /* COMPARE:END */;

  const out = { CANDIDATES: CANDIDATES, RESERVES: RESERVES, TAKEN_912: TAKEN_912, COMPARE: COMPARE };
  if (typeof module !== 'undefined' && module.exports) module.exports = out;
  else root.FM_NEW_FILTER_CANDIDATES = out;
})(typeof window !== 'undefined' ? window : this);

/* DISTANCES:BEGIN (written by measure-filters-node.js --write; do not edit by hand)
 * Measured by measure-filters-node.js on 2026-10-12 against 56 library filters, photos at 200 px.
 * #675 flat swatch (#c05030, t=1, centre box): the untouched frame is mean 109.8 / colour 144.0. Pass = nearest existing > 10, nearest other candidate > 10, from the untouched frame >= 8.
 * 
 * id            mean  colour  plain | nearest existing (675)                         | nearest candidate | 858 weakest ingredient | photo: nearest existing (mean |delta|)
 * handheld      144.2  157.0   35.3 | Polaroid 19.0, Light Leak 26.5, Cross Process 29.5 | watercolour 20.4  | pixelate 5.03          | run: Tropic 44.6, Desert 45.0, Polaroid 46.3 (vs as-shot 51.0)  PASS
 * xray          155.1   37.0   78.6 | Photocopy 22.6, Platinum 29.3, Whiteout 33.0    | etching 18.1      | softglow 4.61          | bay: Fog 65.8, Matte 66.3, Platinum 67.5 (vs as-shot 88.3)  PASS
 * cctv          115.4   24.6   71.9 | Fog 14.8, Poster Print 17.3, Silver 18.6        | underwater 14.8   | scanlines 5.81         | huracan: Silver 17.0, Old Film 17.3, Newsprint 18.9 (vs as-shot 26.3)  PASS
 * pencil        235.3   21.5  145.4 | Photocopy 76.8, Platinum 100.1, Whiteout 105.6  | xray 80.7         | temperature 2.62       | towers: Dreamy Bloom 54.9, Platinum 56.8, Neon Night 68.8 (vs as-shot 85.2)  PASS
 * autumn         92.6  224.0   51.0 | Ultraviolet 12.6, Bloodline 12.7, Neon Night 15.7 | ledwall 17.2      | hslbands 1.11          | bush: Kodachrome 14.1, Golden Hour 15.0, Desert 15.9 (vs as-shot 19.7)  PASS
 * greencode      51.8   68.0   73.8 | Static 16.4, Blackout 19.5, Blueprint 21.1      | darkroom 15.8     | colorbalance 13.51     | dusk: Blackout 9.4, Low Key 11.8, Midnight 12.3 (vs as-shot 57.7)  PASS
 * skygrad        90.8  161.2   21.6 | Acid Wash 11.2, Nightdrive 11.6, Overdrive 12.2 | synthwave 18.5    | contrast 2.66          | pair: Ember 19.7, Overdrive 20.0, Copperplate 23.8 (vs as-shot 28.4)  PASS
 * solarised     148.0    0.0   94.5 | Photocopy 11.5, Platinum 12.0, Fog 34.0         | etching 20.2      | contrast 7.77          | city: Newsprint 35.8, Silver 36.9, Moonbeam 38.1 (vs as-shot 41.1)  [579: spread 0.0, nearest mono xerox 11.5]  PASS
 * stainedglass  131.8  236.0   59.4 | Poppy 16.3, Tropic 16.8, Sunbaked 19.0          | autumn 39.9       | contrast 5.29          | sunpath: Cross Process 49.9, Poppy 50.0, Candy 50.2 (vs as-shot 52.8)  PASS
 * ledwall        98.1  196.8   33.8 | Desert 14.7, Ember 16.0, Bloodline 16.2         | autumn 17.2       | mosaic 6.03            | bay: Candy 34.2, Poppy 35.1, Popsicle 36.8 (vs as-shot 39.3)  PASS
 * watercolour   145.4  123.0   37.7 | Polaroid 17.9, Faded Film 25.1, Whiteout 26.3   | handheld 20.4     | softglow 1.80          | shore: Dreamy Bloom 15.3, Halo 21.7, Neon Night 22.1 (vs as-shot 35.0)  PASS
 * darkroom       36.2   72.0   85.4 | Midnight 15.1, Blueprint 15.4, Blackout 16.4    | greencode 15.8    | brightness 12.45       | mclaren: Blackout 18.0, Midnight 19.8, Bloodline 26.5 (vs as-shot 69.2)  PASS
 * (underwater)  103.0   38.0   64.0 | Old Film 10.9, Ash 11.8, Bleach Bypass 18.0     | cctv 14.8         | softglow 2.75          | dog: Moonbeam 23.3, Silver 28.8, Whiteout 29.6 (vs as-shot 32.9)  PASS
 * (synthwave)    75.4  144.0   34.4 | Overdrive 12.5, Thermal Camera 12.7, Nightdrive 13.5 | skygrad 18.5      | scanlines 4.13         | city: Thermal Camera 29.8, Ultraviolet 34.8, Popsicle 38.6 (vs as-shot 47.1)  PASS
 * (etching)     137.7   28.9   74.4 | Platinum 17.4, Photocopy 27.9, Fog 29.4         | xray 18.1         | contrast 5.29          | dusk: Dreamy Bloom 74.6, Neon Night 77.2, Halo 77.3 (vs as-shot 79.3)  PASS
 * 
 * CONTROL (browser-measured in the codebase -> this model): Cross Process/Super 8 1.5 -> 0.7, Poppy/Sunbaked 3.3 -> 3.7, Poster Print/Silver 2.3 -> 2.3, Low Key/Thermal Camera 18 -> 17.4; the five #675 additions vs the 33 then (all must be > 10): Midnight 31.1, Ultraviolet 12.3, Matte 12.3, Ember 11.8, Copperplate 12.3
 * DISTANCES:END */
