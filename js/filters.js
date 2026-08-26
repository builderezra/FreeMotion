/* FreeMotion — the FILTER LIBRARY (queue 113, step 6).
 *
 * Ezra: "This will be good because lots of people will not want to spend time making filters
 * themselves." and "You will make a Bunch of filters and section them, so that people can find stuff
 * organised, like how the effects are organised."
 *
 * A filter here is DATA, not code: a name, a section, and the list of real effects it is made of. It
 * becomes an ordinary filter container the moment you add it (js/compositor.js drawFilterContainer),
 * which is the point — a filter from this list is not a special object, it is exactly the thing you
 * could have built yourself with "+ Add Filter". You can open it, change any effect inside it, delete
 * one, add your own, or pull the Strength down. Nothing here is locked.
 *
 * TWO RULES THIS FILE IS AUTHORED AGAINST
 *
 * 1. CSS-FILTER EFFECTS ARE LISTED FIRST. Nine types (FM.CSS_FX — blur, brightness, contrast,
 *    saturate, hue, grayscale, sepia, invert, glow) are folded into one ctx.filter string applied
 *    BEFORE the layer is drawn, whatever order they sit in. Authoring them anywhere else would make
 *    the row order disagree with the render order — a "VHS" filter written grade → grain → scanlines
 *    would silently render grade-first. Listed first, what you read top-to-bottom is what happens.
 *    (The rows say "always first" too, but a list that agrees with itself needs no explaining.)
 *
 * 2. NOTHING IS AUTHORED AT AN EXTREME. Every value here sits where it still reads as the thing it is
 *    named after when Strength is at 1, because Strength fades the WHOLE filter toward the untouched
 *    picture — so the useful range is 0..1 around a sane look, not a rescue from an overcooked one.
 *
 * The definitions are validated against the effect registry on read (saneFilter), the same discipline
 * fx-presets.js applies: a type this build does not have, a param that is not in its schema, or a
 * value outside its range never reaches the compositor. A typo here should cost a dropped control,
 * never a broken render.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const SECTIONS = [
    { key: 'cinematic', label: 'Cinematic' },
    /* ⚠️ TUFF IS SECOND — queue 594, and it is a direct reversal of the reasoning below.
       Ezra: *"Also jump the tuff row to the second down below cinematic."*
       It was placed LAST at queue 349 on the argument that it is "the newest and the most specific" while
       the others are general grades. **That was my ordering logic, not his** — and he has now put it
       where he wants it, which is what a section order is for. **The old note is kept underneath rather
       than deleted**, because it explains what Tuff IS, and only its last sentence was overruled.
       ⚠️ **THIS IS THE ONLY PLACE THE ORDER LIVES.** The filters themselves are declared far below and
       grouped by `section`; moving those declarations around would change nothing here and would fight
       the next edit. */
    { key: 'tuff', label: 'Tuff' },
    { key: 'retro', label: 'Retro / Analogue' },
    { key: 'glow', label: 'Light / Glow' },
    { key: 'stylised', label: 'Stylised' },
    /* Queue 349. His words: "Make a filter section called 'tuff' and use the car images for the filters
       you make… These filters will be good for people who make edits on TikTok that are a tuff style
       where they use rage rap music etc, kinda dark, just reference TikTok styles on what people do".
       ⚠️ It sat LAST until queue 594 on the argument that it is the newest and most specific — see above;
       he moved it to second and that sentence no longer applies. */
    /* MORE CATEGORIES (queue 444, clause 2). Ezra: "make more categories for filters". Two, chosen so
       they are not slices of the four above: MONO is the only family the list had no home for at all
       (Ash is near-monochrome but lives in Tuff because it is a scene, not a black-and-white treatment),
       and VIVID is the punchy social look that Cinematic deliberately is not. A category with nothing in
       it is worse than no category — `sections()` already filters those out — so each arrives with
       three filters rather than as a heading waiting to be filled. */
    /* "Black / White", not "Black & White": queue 287/288 established that a category title uses a
       slash rather than an ampersand, and the suite holds every browser to it. Caught there first. */
    { key: 'mono', label: 'Black / White' },
    { key: 'vivid', label: 'Punchy' },
  ];

  /* e(type, params) — one child effect. Params are only the ones being moved off their default, so a
   * filter's definition reads as "what is different about this look" rather than as a wall of numbers. */
  const e = (type, params) => ({ type: type, params: params || {} });

  const FILTERS = [
    // ---- Cinematic ----------------------------------------------------------------------------
    { id: 'tealorange', name: 'Teal & Orange', section: 'cinematic',
      desc: 'The blockbuster grade — shadows toward teal, skin toward orange, with the edges eased down.',
      effects: [e('contrast', { amount: 1.12 }), e('saturate', { amount: 1.08 }),
                e('tealorange', { amount: 0.65 }), e('vignette', { amount: 0.32, size: 42 })] },
    { id: 'bleach', name: 'Bleach Bypass', section: 'cinematic',
      desc: 'Harsh, silvery and desaturated — the war-film look, with a little grain to stop it going clinical.',
      effects: [e('contrast', { amount: 1.24 }), e('saturate', { amount: 0.55 }),
                e('bleachbypass', { amount: 0.75 }), e('filmgrain', { amount: 22, size: 2 })] },
    { id: 'crossproc', name: 'Cross Process', section: 'cinematic',
      desc: 'Film developed in the wrong chemistry: cyan shadows, blown warm highlights.',
      effects: [e('contrast', { amount: 1.1 }), e('crossprocess', { amount: 0.6 }),
                e('colorbalance', { red: 12, green: -6, blue: 18 })] },
    { id: 'faded', name: 'Faded Film', section: 'cinematic',
      desc: 'Lifted blacks and drained colour, like a print left in the sun.',
      effects: [e('contrast', { amount: 0.92 }), e('faded', { amount: 0.65 }),
                e('filmgrain', { amount: 26, size: 2 }), e('vignette', { amount: 0.24, size: 46 })] },

    // ---- Retro & Analogue ---------------------------------------------------------------------
    { id: 'vhs', name: 'VHS Tape', section: 'retro',
      desc: 'Worn tape: colour bleeding sideways, the picture wobbling, tracking drifting through it.',
      effects: [e('vhstape', { amount: 0.7, chromableed: 30, wobble: 4 }),
                e('scanlines', { amount: 0.32, spacing: 3 })] },
    { id: 'crt', name: 'CRT Monitor', section: 'retro',
      desc: 'An old television: scanlines, a shadow mask, and the soft bloom a phosphor screen gives everything.',
      effects: [e('glow', { radius: 10 }), e('crt', { amount: 0.7, scanline: 0.5, mask: 0.22 })] },
    { id: 'super8', name: 'Super 8', section: 'retro',
      desc: 'Home-movie film — warm, grainy, light spilling in at the edges.',
      effects: [e('saturate', { amount: 1.15 }), e('contrast', { amount: 1.08 }),
                e('lightleak', { amount: 0.5 }), e('filmgrain', { amount: 45, size: 3 }),
                e('vignette', { amount: 0.4, size: 38 })] },
    { id: 'oldfilm', name: 'Old Film', section: 'retro',
      desc: 'Nearly monochrome, heavily grained, with the faint line structure of a worn projector print.',
      effects: [e('grayscale', { amount: 0.85 }), e('contrast', { amount: 1.2 }),
                e('filmgrain', { amount: 55, size: 2 }), e('scanlines', { amount: 0.18, spacing: 6 }),
                e('vignette', { amount: 0.45, size: 34 })] },

    // ---- Light & Glow -------------------------------------------------------------------------
    { id: 'dreamy', name: 'Dreamy Bloom', section: 'glow',
      desc: 'Highlights blooming into a soft haze — the everything-is-lovely look.',
      effects: [e('glow', { radius: 22, passes: 2 }), e('saturate', { amount: 1.1 }),
                e('lightglow', { amount: 0.55, radius: 14, threshold: 55 })] },
    { id: 'goldenhour', name: 'Golden Hour', section: 'glow',
      desc: 'Warm late light, with the highlights just starting to bloom.',
      effects: [e('saturate', { amount: 1.14 }), e('temperature', { amount: 45, tint: 8 }),
                e('lightglow', { amount: 0.4, radius: 10, threshold: 70 }),
                e('vignette', { amount: 0.22, size: 46 })] },
    { id: 'leak', name: 'Light Leak', section: 'glow',
      desc: 'Light spilling onto the film, with the warm red halo it leaves around bright areas.',
      effects: [e('lightleak', { amount: 0.7 }), e('halation', { amount: 1, threshold: 0.6 })] },
    { id: 'neonnight', name: 'Neon Night', section: 'glow',
      desc: 'Cold, saturated and glowing — wet streets and signs after dark.',
      effects: [e('contrast', { amount: 1.2 }), e('saturate', { amount: 1.5 }),
                e('colorbalance', { red: -10, green: -5, blue: 30 }),
                e('lightglow', { amount: 0.6, radius: 18, threshold: 45 }),
                e('halation', { amount: 0.9, threshold: 0.65 })] },

    // ---- Stylised -----------------------------------------------------------------------------
    { id: 'comic', name: 'Comic Ink', section: 'stylised',
      desc: 'Flat blocks of colour with the edges drawn back in, like inked line art.',
      effects: [e('contrast', { amount: 1.15 }), e('posterize', { levels: 5, mix: 0.85 }),
                e('edge', { amount: 1 })] },
    { id: 'poster', name: 'Poster Print', section: 'stylised',
      desc: 'Few colours, printed as dots — a screen-printed poster.',
      effects: [e('contrast', { amount: 1.2 }), e('posterize', { levels: 4 }),
                e('halftone', { size: 6 })] },
    { id: 'thermal', name: 'Thermal Camera', section: 'stylised',
      desc: 'Brightness read as heat — cold darks, white-hot highlights, glowing.',
      effects: [e('glow', { radius: 12 }), e('thermal', { amount: 1 })] },
    { id: 'nightvis', name: 'Night Vision', section: 'stylised',
      desc: 'Green phosphor, sensor noise and a hard vignette — looking through a scope.',
      effects: [e('nightvision', { amount: 0.85 }), e('noise', { amount: 25, speed: 20 }),
                e('scanlines', { amount: 0.22, spacing: 4 }),
                e('vignette', { amount: 0.5, size: 30 })] },

    /* ---- Tuff (queue 349) ---------------------------------------------------------------------
     * His brief, verbatim: "These filters will be good for people who make edits on TikTok that are a
     * tuff style where they use rage rap music etc, kinda dark, just reference TikTok styles on what
     * people do." So: crushed blacks, contrast well up, saturation pulled back but not dead, a hard
     * colour cast, heavy vignette, grain, and bloom so the bright bits smear.
     * EVERY ONE CARRIES `flashdark`, because that was the other half of the same request — "they
     * should also come with flicker or flash, not in a way that makes the effect flicker on and off but
     * so there's like a black layer on top with not full opacity and has flickering". That effect is new
     * in this release and exists for this: it multiplies RGB and leaves alpha alone, so the picture
     * pulses dark without the layer disappearing. Its `Darkest` floor is authored high (0.3–0.45) so the
     * flash is a wash rather than a blackout — see rule 2 at the top of this file.
     * The two file rules hold here as everywhere: CSS-filter effects (contrast / saturate / grayscale /
     * glow) are listed FIRST so the row order matches the render order, and nothing sits at an extreme. */
    { id: 'blackout', name: 'Blackout', section: 'tuff',
      desc: 'Crushed blacks, contrast up hard, colour pulled back — with a dark pulse over the top.',
      /* The brightness pull is not decoration. Authored without it, the tile read as an ordinary
         daylight photo with slightly more contrast — "crushed blacks" cannot show on a picture that
         has barely any, and this filter has to say what it is at a glance. Looked at, at 380px. */
      effects: [e('brightness', { amount: 0.82 }), e('contrast', { amount: 1.3 }), e('saturate', { amount: 0.7 }),
                e('highlightsshadows', { highlights: -25, shadows: -45 }),
                e('vignette', { amount: 0.5, size: 30 }),
                e('flashdark', { amount: 0.35, speed: 9, soft: 0.35, floor: 0.35 })] },
    { id: 'coldsteel', name: 'Cold Steel', section: 'tuff',
      desc: 'The cold night look — blue bias, desaturated, sharpened until it bites.',
      effects: [e('contrast', { amount: 1.22 }), e('saturate', { amount: 0.6 }),
                e('colorbalance', { red: -18, green: -2, blue: 26 }),
                e('unsharpmask', { amount: 1.1, radius: 2 }),
                e('vignette', { amount: 0.4, size: 34 }),
                e('flashdark', { amount: 0.3, speed: 12, soft: 0.2, floor: 0.4 })] },
    { id: 'bloodline', name: 'Bloodline', section: 'tuff',
      desc: 'Deep red-orange driven into crushed shadows, with the highlights bleeding.',
      effects: [e('contrast', { amount: 1.28 }), e('saturate', { amount: 1.1 }),
                e('colorbalance', { red: 30, green: -8, blue: -14 }),
                e('highlightsshadows', { highlights: -15, shadows: -40 }),
                e('lightglow', { amount: 0.5, radius: 14, threshold: 55 }),
                e('vignette', { amount: 0.45, size: 32 }),
                e('flashdark', { amount: 0.32, speed: 8, soft: 0.4, floor: 0.35 })] },
    { id: 'static', name: 'Static', section: 'tuff',
      desc: 'Grain, split colour and hard contrast — dirty rather than nostalgic.',
      /* 3px, not 5. A preview tile renders at tile size, so an aberration authored for a 1080p frame
         is proportionally enormous on it — at 5 the tile came out as rainbow smear rather than as a
         dirty picture, which sells the wrong filter. Measured the only way that counts: looked at. */
      effects: [e('contrast', { amount: 1.24 }), e('saturate', { amount: 0.75 }),
                e('chromaticaberration', { amount: 3, angle: 0 }),
                e('filmgrain', { amount: 48, size: 2 }),
                e('vignette', { amount: 0.42, size: 34 }),
                e('flashdark', { amount: 0.4, speed: 16, soft: 0.1, floor: 0.3 })] },
    { id: 'nightdrive', name: 'Nightdrive', section: 'tuff',
      desc: 'Teal shadows, warm lights, bloom on every bright thing — headlights at 2am.',
      effects: [e('contrast', { amount: 1.18 }), e('saturate', { amount: 1.05 }),
                e('tealorange', { amount: 0.7 }),
                e('lightglow', { amount: 0.55, radius: 16, threshold: 50 }),
                e('vignette', { amount: 0.4, size: 34 }),
                e('flashdark', { amount: 0.26, speed: 7, soft: 0.5, floor: 0.45 })] },
    { id: 'overdrive', name: 'Overdrive', section: 'tuff',
      desc: 'Over-clarified and blooming — the look of an edit that has been pushed on purpose.',
      effects: [e('brightness', { amount: 0.92 }), e('contrast', { amount: 1.26 }), e('saturate', { amount: 1.2 }),
                e('unsharpmask', { amount: 1.8, radius: 2 }),
                e('lightglow', { amount: 0.6, radius: 12, threshold: 60 }),
                e('vignette', { amount: 0.35, size: 38 }),
                e('flashdark', { amount: 0.3, speed: 14, soft: 0.15, floor: 0.35 })] },
    /* THE EXTRA TUFF FILTER (queue 444, clause 1). Deliberately the one thing the other seven do not
       do: they all pull the picture DOWN — crushed, cold, dirty, dark. This one blows it out instead,
       which is the other half of the TikTok look he described. Same `flashdark` pulse as its siblings,
       because that beat is what makes the section a section. */
    { id: 'whiteout', name: 'Whiteout', section: 'tuff',
      desc: 'Blown highlights and a hard white bloom — the overexposed flash-photo edit.',
      effects: [e('brightness', { amount: 1.16 }), e('contrast', { amount: 1.34 }), e('saturate', { amount: 0.68 }),
                e('highlightsshadows', { highlights: 30, shadows: -30 }),
                e('lightglow', { amount: 0.7, radius: 18, threshold: 40 }),
                e('vignette', { amount: 0.3, size: 40 }),
                e('flashdark', { amount: 0.3, speed: 11, soft: 0.25, floor: 0.38 })] },
    // ---- Black & White ------------------------------------------------------------------------
    { id: 'silver', name: 'Silver', section: 'mono',
      desc: 'A gentle black and white — full range, nothing crushed, a little lift in the shadows.',
      effects: [e('grayscale', { amount: 1 }), e('contrast', { amount: 1.08 }),
                e('highlightsshadows', { highlights: -8, shadows: 14 })] },
    { id: 'noir', name: 'Noir', section: 'mono',
      desc: 'Hard black and white — deep shadows, bright highlights and a heavy corner fall-off.',
      effects: [e('grayscale', { amount: 1 }), e('contrast', { amount: 1.42 }),
                e('highlightsshadows', { highlights: 12, shadows: -40 }),
                e('vignette', { amount: 0.5, size: 30 })] },
    /* ---- THREE MORE MONO LOOKS (queue 579 clause 3) ------------------------------------------------
     * Ezra: *"add more black and white filter options"*. There were THREE — Silver, Noir, Newsprint —
     * and measured on a #c05030 test frame they all desaturate correctly (spread 0, 0 and 2.98 against a
     * baseline of 144), so the complaint was the SIZE of the set, not a fault in it.
     * ⚠️ EVERY MONO FILTER MEASURES A COLOUR SPREAD OF ZERO, so "does it do something" cannot tell these
     * apart — the queue-563 trap (the Bell that was the Ding) with the one obvious metric removed. What
     * separates a black-and-white look is TONE: where the midpoint sits and how far the tones spread.
     * So these three are placed deliberately along that axis, away from the three that exist:
     *   Platinum — HIGH-KEY: bright, lifted shadows, low contrast. Nothing else here is airy.
     *   Ink      — near-graphic: contrast far past Noir's 1.42, blacks crushed, whites blown.
     *   Fog      — FLAT: low contrast and lifted blacks, the opposite of Noir. A misty, greyed scan.
     * The test asserts mean brightness AND spread differ from every existing mono filter, not merely
     * that each one desaturates. */
    { id: 'platinum', name: 'Platinum', section: 'mono',
      desc: 'Bright, airy black and white — open shadows and gentle contrast, like a platinum print.',
      effects: [e('grayscale', { amount: 1 }), e('brightness', { amount: 1.22 }), e('contrast', { amount: 0.95 }),
                e('highlightsshadows', { highlights: -6, shadows: 42 })] },
    { id: 'ink', name: 'Ink', section: 'mono',
      desc: 'Almost pure black and white — blacks crushed, highlights blown, barely any grey left.',
      effects: [e('grayscale', { amount: 1 }), e('contrast', { amount: 1.85 }),
                e('highlightsshadows', { highlights: 28, shadows: -52 })] },
    { id: 'fog', name: 'Fog', section: 'mono',
      desc: 'Flat, misty grey — lifted blacks and soft contrast, like an old scan left in the light.',
      /* ⚠️ FOG SITS AT MID-GREY, PLATINUM SITS HIGH — and that separation is measured, not assumed.
         Authored first as "bright and flat", Fog landed at mean 121 against Platinum's 125: FOUR levels
         apart, two near-identical light looks under different names. That is the queue-563 Bell/Ding
         trap with its usual metric removed, because every mono filter measures a colour spread of ZERO
         and so "does it do something" cannot separate them at all.
         Fog's idea is HAZE — everything crushed toward middle grey — not brightness, so contrast drops
         hard and the lift is smaller. Platinum's idea is a high-key PRINT, so it goes brighter. */
      effects: [e('grayscale', { amount: 1 }), e('contrast', { amount: 0.66 }), e('brightness', { amount: 0.99 }),
                e('highlightsshadows', { highlights: -26, shadows: 26 })] },
    { id: 'newsprint', name: 'Newsprint', section: 'mono',
      desc: 'Grey, grainy and slightly soft — a photograph that has been through a printing press.',
      effects: [e('grayscale', { amount: 1 }), e('contrast', { amount: 1.14 }),
                e('brightness', { amount: 0.96 }),
                e('filmgrain', { amount: 42, size: 2 })] },
    // ---- Punchy -------------------------------------------------------------------------------
    { id: 'poppy', name: 'Poppy', section: 'vivid',
      desc: 'Saturation up, contrast up, everything a shade brighter — the straight-to-feed look.',
      effects: [e('saturate', { amount: 1.45 }), e('contrast', { amount: 1.14 }),
                e('brightness', { amount: 1.04 }),
                e('highlightsshadows', { highlights: -10, shadows: 10 })] },
    { id: 'candy', name: 'Candy', section: 'vivid',
      desc: 'Bright and cool-leaning, with the highlights glowing — sweet rather than cinematic.',
      effects: [e('saturate', { amount: 1.35 }), e('brightness', { amount: 1.08 }),
                e('temperature', { amount: -14, tint: 8 }),
                e('lightglow', { amount: 0.35, radius: 12, threshold: 62 })] },
    { id: 'sunbaked', name: 'Sunbaked', section: 'vivid',
      desc: 'Warm, strong and a little hazy — midday sun with the colour pushed.',
      effects: [e('saturate', { amount: 1.3 }), e('contrast', { amount: 1.16 }),
                e('temperature', { amount: 24, tint: -4 }),
                e('lightglow', { amount: 0.4, radius: 14, threshold: 55 }),
                e('vignette', { amount: 0.22, size: 46 })] },
    { id: 'ash', name: 'Ash', section: 'tuff',
      desc: 'Near-monochrome with a faint warm cast and no mercy in the contrast.',
      effects: [e('contrast', { amount: 1.3 }), e('grayscale', { amount: 0.82 }),
                e('temperature', { amount: 18, tint: 2 }),
                e('filmgrain', { amount: 30, size: 2 }),
                e('vignette', { amount: 0.48, size: 32 }),
                e('flashdark', { amount: 0.28, speed: 10, soft: 0.3, floor: 0.4 })] },
  ];

  /* Validate a definition against the LIVE registry and build a real container instance from it.
   * Same discipline as fx-presets' sanePreset, and for the same reason: this list is hand-authored, a
   * param key can be mistyped, and an effect can be renamed or removed by a later build. A typo should
   * cost one dropped control, never a broken render — so an unknown type is dropped, an unknown param
   * key is dropped, and a value outside the schema's range is clamped into it.
   * Returns null when nothing of the filter survives, because an empty filter is not a look. */
  function saneChild(def) {
    if (!def || typeof def.type !== 'string' || !FM.fxRegistry) return null;
    const reg = FM.fxRegistry.get(def.type);
    if (!reg || reg.type !== def.type) return null;
    const inst = FM.fxRegistry.makeInstance(def.type);
    if (!inst) return null;
    const schema = reg.params || [];
    Object.keys(def.params || {}).forEach(k => {
      const pd = schema.filter(p => p && p.key === k)[0];
      if (!pd) return;                                    // not a control this effect has
      let v = def.params[k];
      if (typeof v === 'number' && isFinite(v)) {
        if (isFinite(pd.min)) v = Math.max(pd.min, v);
        if (isFinite(pd.max)) v = Math.min(pd.max, v);
      }
      inst.params[k] = v;
    });
    return inst;
  }

  FM.FILTERS = FILTERS;
  /* ---- FAVOURITES (queue 444, clauses 3-5) -----------------------------------------------------
   * Ezra: "make it so you can fave them and they go to the top when you do, not the categories but each
   * individual. And it doesn't take it away from its group when you do so."
   * Clause 5 is the one that shapes this: a favourite is not a MOVE, it is a second place the same
   * filter appears. So nothing here reorders FILTERS — the browser draws an extra section from this
   * list, and every category still draws its own members, unchanged.
   *
   * localStorage, NOT the project document. A fave is about the person, not the edit: putting it in the
   * project would carry one person's favourites into any project they shared or re-imported and
   * silently make someone else's list wrong. Same reasoning as the other preferences.
   * Ids are filtered against the live FILTERS on read, so a filter removed by a later build cannot
   * leave a dead entry drawing an empty tile forever. */
  const FAVE_KEY = 'fm.filterFaves';
  function readFaves() {
    try {
      const raw = JSON.parse(localStorage.getItem(FAVE_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter(function (id) { return typeof id === 'string' && FILTERS.some(function (f) { return f.id === id; }); });
    } catch (e) { return []; }
  }
  function writeFaves(ids) { try { localStorage.setItem(FAVE_KEY, JSON.stringify(ids)); } catch (e) {} }

  FM.filters = {
    sections: function () {
      // Only sections that actually have something in them — an empty banner is worse than no banner.
      return SECTIONS.filter(s => FILTERS.some(f => f.section === s.key));
    },
    isFave: function (id) { return readFaves().indexOf(id) >= 0; },
    /* Newest fave FIRST, so the thing you just starred is the thing at the top — "they go to the top"
       is the order he asked for, and appending would put it at the bottom of the favourites. */
    toggleFave: function (id) {
      if (!this.get(id)) return false;
      const cur = readFaves(), at = cur.indexOf(id);
      if (at >= 0) cur.splice(at, 1); else cur.unshift(id);
      writeFaves(cur);
      return at < 0;
    },
    // The favourite filters as DEFINITIONS, in fave order. The browser draws these as an extra section
    // above the categories, and every one of them still appears in its own category as well.
    faves: function () { return readFaves().map(id => this.get(id)).filter(Boolean); },
    all: function () { return FILTERS.slice(); },
    bySection: function (key) { return FILTERS.filter(f => f.section === key); },
    get: function (id) { return FILTERS.filter(f => f.id === id)[0] || null; },
    /* The one creation path: a definition in, a real filter container out — the same shape "+ Add
     * Filter" produces, so everything downstream (render, inspector row, save/load, copy, presets)
     * treats it as an ordinary filter, because it is one. */
    makeInstance: function (id) {
      const def = this.get(id);
      if (!def || !FM.fxRegistry) return null;
      const box = FM.fxRegistry.makeInstance(FM.FX_CONTAINER);
      if (!box) return null;
      box.effects = (def.effects || []).map(saneChild).filter(Boolean);
      if (!box.effects.length) return null;
      box.name = def.name;      // so the row reads "Teal & Orange", not "Filter"
      return box;
    },
  };
})(window.FM);
