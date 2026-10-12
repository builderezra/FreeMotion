/* VOICE CHANGER — named voices for a new "Voice" audio category (#966, backlog §B B1). DATA ONLY: nothing here is in the app.
 *
 * His steer (#966): "you can add new sound effects … more choices always better". The backlog's idea: one-tap tiles that add a
 * named STACK of the audio effects the app already has, each member still editable afterwards (CapCut's most-used audio feature;
 * Final Cut has a whole Voice category). The DSP exists; only the packaging is missing. So each voice below is just a list of
 * { type, params } — exactly what FM.audioFxRegistry.makeInstance(type) + Object.assign(params) produces, and exactly what a tile
 * would push onto layer.audioFx inside one history.commit.
 *
 * WHAT IS CHECKED (check-voices-node.js, no browser): every type is in FM.audioFxRegistry on branch new-prep (d50f8732 —
 * batches 7 and 8 are in: Ring Mod Shape incl. Square, filter Slope, Telephone Styles, Mix/Output on everything, presets), every
 * key is in that effect's schema, every number is inside its range and every choice is one of its options (so storage.js's
 * sanitiser keeps it as written), a stack is never more than AFX_MAX (16), and every stack BUILDS and SCHEDULES through the
 * real FM.buildAudioFxChain against a mock Web Audio graph with no throw, no non-finite value and no delay past its maximum.
 *
 * WHAT THE BACKLOG ASKED FOR THAT DOES NOT EXIST HERE (said, not faked):
 *   · Old record's CRACKLE — the lo-fi crackle / vinyl noise is backlog item 9.5 and is not on this branch. The only noise
 *     source in the audio effects is Telephone's Noise, which is a steady HISS, not crackle. So Old record is Lo-Fi + a record's
 *     narrow band + a slow wow (Vibrato) and NO crackle — the honest version. When 9.5 lands, add it to this stack.
 *   · Radio's "lo-fi hiss" — substituted by Telephone's Noise (the same seeded hiss the Old-radio style uses), see Radio.
 *   · Walkie-talkie's squelch (a burst of noise as a transmission ends) — Telephone's own note says it is a gate on the voice's
 *     level, not one of its four controls; not built. The Walkie-talkie voice is the Telephone style without it.
 *   · "Save this stack as a voice" — UI, not data; it belongs to the build, after he picks.
 * Robot needed batch 7.7's Square ring carrier and Underwater 7.5's filter Slope: both ARE on this branch, so all thirteen of the
 * backlog's voices are buildable now (Radio and Old record with the substitutes above).
 *
 * NAMES: Chipmunk, Helium, Deep and Monster are also the names of Pitch Shift's own presets. That is the same sound family
 * reached two ways, not a clash — but if two "Chipmunk"s in the app reads as confusing, the voice tiles can win the name and
 * the presets be renamed (his call).
 * The three marked `from: 'extra'` are not in the backlog: more choice, built the same way, cut them freely.
 */
(function (root) {
  'use strict';
  const fx = (type, params) => ({ type: type, params: params || {} });

  const VOICES = [
    { id: 'chipmunk', name: 'Chipmunk', from: 'B1', desc: 'High and quick-sounding, like a cartoon chipmunk.',
      stack: [fx('pitch', { semitones: 7 }), fx('eq3', { high: 3 })] },
    { id: 'helium', name: 'Helium', from: 'B1', desc: 'A whole octave up — the balloon voice.',
      stack: [fx('pitch', { semitones: 12 })] },
    { id: 'deep', name: 'Deep', from: 'B1', desc: 'Lower and heavier, with more chest.',
      stack: [fx('pitch', { semitones: -5 }), fx('bassTreble', { bass: 4 })] },
    { id: 'monster', name: 'Monster', from: 'B1', desc: 'Way down, growling, in a big room.',
      // Auto level on, so the growl does not also make it louder
      stack: [fx('pitch', { semitones: -10 }), fx('distortion', { drive: 20, curve: 2, autogain: 1 }), fx('reverb', { mix: 0.3 })] },
    { id: 'robot', name: 'Robot', from: 'B1', desc: 'Buzzing and metallic, like a machine talking.',
      // ring mod on a 60 Hz SQUARE carrier (batch 7.7) at 60% wet, then a short, slow, resonant flange for the metal ring
      stack: [fx('ringmod', { freq: 60, shape: 1, mix: 0.6 }), fx('flanger', { rate: 0.05, depth: 0.15, feedback: 0.7, mix: 0.5 })] },
    { id: 'alien', name: 'Alien', from: 'B1', desc: 'Up a little, ringing and swirling — not from here.',
      stack: [fx('pitch', { semitones: 4 }), fx('ringmod', { freq: 400, mix: 0.35 }), fx('phaser', { rate: 0.8, depth: 0.7, feedback: 0.6, mix: 0.5 })] },
    { id: 'megaphone', name: 'Megaphone', from: 'B1', desc: 'Shouted through a loudhailer.',
      // Telephone's Megaphone style writes these four (audio-fx.js `sets`); the kernel reads the four, never `style` itself
      stack: [fx('telephone', { style: 2, lowcut: 500, highcut: 2800, grit: 70, noise: 0 })] },
    { id: 'walkie', name: 'Walkie-talkie', from: 'B1', desc: 'Over a handheld radio, a bit of hiss behind it.',
      stack: [fx('telephone', { style: 3, lowcut: 400, highcut: 2600, grit: 55, noise: 0.1 })] },
    { id: 'radio', name: 'Radio', from: 'B1', desc: 'An old AM radio — thin, a little dirty, hissing.',
      /* backlog: band-pass 1800 Hz Q 0.7, distortion 15, lo-fi hiss. The hiss is Telephone's Noise (the only noise source the
         audio effects have), on its Radio style so its own band is wide (150–5000 Hz) and the band-pass does the shaping. */
      stack: [fx('bandpass', { freq: 1800, q: 0.7 }), fx('distortion', { drive: 15, curve: 2, autogain: 1 }),
              fx('telephone', { style: 1, lowcut: 150, highcut: 5000, grit: 20, noise: 0.3 })] },
    { id: 'underwater', name: 'Underwater', from: 'B1', desc: 'Muffled and wobbling, like talking under the water.',
      // the 24 dB slope is batch 7.5's — a 12 dB low-pass at 450 Hz lets too much top through to sound submerged
      stack: [fx('lowpass', { freq: 450, q: 2, slope: 24 }), fx('vibrato', { rate: 1.2, depth: 0.2 }), fx('reverb', { size: 0.7, mix: 0.4 })] },
    { id: 'cave', name: 'Cave', from: 'B1', desc: 'A long rocky echo that hangs around.',
      stack: [fx('reverb', { size: 0.9, decay: 5, mix: 0.35 }), fx('delay', { time: 0.25, feedback: 0.3, mix: 0.3 })] },
    { id: 'stadium', name: 'Stadium', from: 'B1', desc: 'Over the PA in a huge open stadium.',
      stack: [fx('reverb', { size: 1, decay: 3.5, mix: 0.45 }), fx('delay', { time: 0.12, feedback: 0.15, mix: 0.25 })] },
    { id: 'oldrecord', name: 'Old record', from: 'B1', desc: 'A worn old record — narrow, crunchy and slightly warbling. (No crackle yet: see the note above.)',
      // Lo-Fi .7 (its band closes to ~360–8800 Hz) + a record's top end gone (24 dB at 4.5 kHz) + a slow 0.55 Hz wow
      stack: [fx('lofi', { amount: 0.7 }), fx('lowpass', { freq: 4500, slope: 24 }), fx('vibrato', { rate: 0.55, depth: 0.25 })] },

    // ---- extra (not in the backlog) ----------------------------------------------------------------------------------------
    { id: 'phone', name: 'Phone call', from: 'extra', desc: 'On the other end of a phone call.',
      stack: [fx('telephone', { style: 0, lowcut: 300, highcut: 3400, grit: 30, noise: 0 })] },
    { id: 'ghost', name: 'Ghost', from: 'extra', desc: 'Breathy and far away, trailing off into a huge empty space.',
      stack: [fx('highpass', { freq: 300 }), fx('pitch', { semitones: -2 }), fx('chorus', { rate: 0.3, depth: 0.7, voices: 4, mix: 0.5 }),
              fx('reverb', { size: 1, decay: 6.5, predelay: 0.06, mix: 0.55 })] },
    { id: 'choir', name: 'Choir', from: 'extra', desc: 'One voice turned into a small crowd singing together.',
      stack: [fx('chorus', { rate: 0.6, depth: 0.6, voices: 6, spread: 1, mix: 0.6 }), fx('reverb', { size: 0.75, decay: 2.8, mix: 0.3 })] },
  ];

  const out = { VOICES: VOICES, AFX_MAX: 16 };
  if (typeof module !== 'undefined' && module.exports) module.exports = out;
  else root.FM_NEW_VOICES = out;
})(typeof window !== 'undefined' ? window : this);
