/* Text to Voice — queue 392.
 *
 * Ezra: *"Where I outlined add a button that says text to voice and make a whole menu and feature for
 * this"*, and later, when told what the browser can and cannot do: *"text to voice should work like how
 * TikTok's or capcuts does and be in the position I told you to put it, if this is too hard then don't do
 * it but atleast a simple option for me to test"*.
 *
 * ═══ WHAT THIS IS, AND WHAT IT IS NOT ═══════════════════════════════════════════════════════════════
 * This reads a text layer out loud, on this device, with any of the voices the system already has. That
 * is the "simple option to test" his third clause asked for.
 *
 * It is NOT the TikTok/CapCut thing yet, and the difference is not effort — it is a wall. The browser's
 * speech engine (`speechSynthesis`) speaks straight to the speakers. It is not a node in the audio graph,
 * it is not a media element, and it produces no stream, so there is **no supported way to capture what it
 * says into a file**. That is not a gap in this code; there is no API for it in any browser. Which means
 * a voice made this way cannot become an audio layer, cannot be trimmed on the timeline, and **will not
 * be in an export**. Anything claiming otherwise here would be a button that lies.
 * The two honest routes to a voice that IS in the export, both his call and neither started:
 *   · a cloud text-to-speech service — real audio back, but it needs a key and the text leaves the
 *     device, which breaks this app's local-only premise;
 *   · record or import a voiceover — fully local, already an audio layer, and no TTS at all.
 *
 * ═══ WHY NOTHING HERE IS CACHED ACROSS A SPEAK ══════════════════════════════════════════════════════
 * `speechSynthesis` is a single global queue shared by the whole page. Two utterances started together
 * do not mix, they QUEUE, so "speak" always cancels first. Everything else in this file exists to keep a
 * hostile or stale value from reaching that queue: a voice name is matched against the list the browser
 * itself reports rather than trusted, and rate/pitch are clamped to the spec's range, because a saved
 * project is a file and a file can say anything.
 */
(function (FM) {
  'use strict';

  const SYN = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const UTT = typeof window !== 'undefined' ? window.SpeechSynthesisUtterance : null;

  // The spec's own bounds. Outside them a browser may throw or silently ignore the whole utterance.
  const RATE = { min: 0.5, max: 2, def: 1 };
  const PITCH = { min: 0, max: 2, def: 1 };

  let _voices = [];
  let _speakingId = null;   // the layer currently being read, so the button can say "Stop"
  let _pending = false;     // claimed, but the voice list is still loading — still "speaking" to the UI
  let _token = 0;           // cancels a speak that was still waiting on voices when Stop was pressed

  function available() { return !!(SYN && UTT); }

  /* Voices arrive ASYNCHRONOUSLY on some platforms — getVoices() answers [] on a cold page and fills in
     later via onvoiceschanged. Anything that renders a picker has to await this, or it draws an empty
     list once and never redraws. */
  function load() {
    return new Promise(function (resolve) {
      if (!available()) return resolve([]);
      const now = SYN.getVoices();
      if (now && now.length) { _voices = now.slice(); return resolve(_voices); }
      let done = false;
      const finish = function () {
        if (done) return; done = true;
        _voices = (SYN.getVoices() || []).slice();
        resolve(_voices);
      };
      try { SYN.addEventListener('voiceschanged', finish, { once: true }); } catch (e) { SYN.onvoiceschanged = finish; }
      setTimeout(finish, 2000);   // …and never hang the panel on a browser that fires nothing
    });
  }

  function voices() { return _voices.slice(); }

  /* Ordered for a human opening the list: the device's default first, then everything sharing the
     page's language, then the rest alphabetically. On a Mac that list is 180 long and mostly novelty
     voices, so ordering is the difference between a picker and a haystack. */
  function sorted() {
    const lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return _voices.slice().sort(function (a, b) {
      if (!!a.default !== !!b.default) return a.default ? -1 : 1;
      const al = (a.lang || '').slice(0, 2).toLowerCase() === lang, bl = (b.lang || '').slice(0, 2).toLowerCase() === lang;
      if (al !== bl) return al ? -1 : 1;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  function clamp(v, lo, hi, dflt) {
    v = +v;
    if (typeof v !== 'number' || !isFinite(v)) return dflt;
    return Math.max(lo, Math.min(hi, v));
  }

  /* Read the layer's saved settings, VALIDATED rather than trusted — a .fmproj is a file like any other
     and an imported one can carry whatever it likes here.
     THE VOICE IS RETURNED AS THE NAME HE CHOSE, NOT AS A RESOLVED VOICE (queue 466). The first version
     matched it against the installed list here and returned '' when it did not match, which quietly
     conflated two different questions: *what did he pick* and *is that voice installed right now*. They
     come apart at the worst moment — `getVoices()` is EMPTY for the first moments of a page — so
     reopening the project and nudging the speed slider before the list arrived ran his choice through
     `update()`, found no match, and **erased the voice he had saved**. Reproduced, then fixed.
     Resolution now happens only where it is actually needed, at `resolve()` below, so an unknown name
     still never reaches the engine — it just no longer destroys his setting on the way past. */
  function settingsOf(layer) {
    const raw = (layer && layer.tts && typeof layer.tts === 'object') ? layer.tts : {};
    return {
      voice: typeof raw.voice === 'string' ? raw.voice : '',   // '' = whatever the device would pick
      rate: clamp(raw.rate, RATE.min, RATE.max, RATE.def),
      pitch: clamp(raw.pitch, PITCH.min, PITCH.max, PITCH.def),
    };
  }

  /* Name → an installed voice, or null. THE one place a saved string is trusted enough to hand to the
     speech engine, and it is a lookup in the browser's own list, so an unknown or hostile name simply
     finds nothing and the device default is used. */
  function resolve(name) {
    if (typeof name !== 'string' || !name) return null;
    return _voices.filter(function (v) { return v.name === name; })[0] || null;
  }

  function update(layer, patch) {
    if (!layer) return;
    const cur = settingsOf(layer);
    layer.tts = {
      voice: patch.voice != null ? String(patch.voice) : cur.voice,
      rate: patch.rate != null ? clamp(patch.rate, RATE.min, RATE.max, RATE.def) : cur.rate,
      pitch: patch.pitch != null ? clamp(patch.pitch, PITCH.min, PITCH.max, PITCH.def) : cur.pitch,
    };
  }

  /* What would be read aloud. A caption track moves the words out of layer.text and into segments, so
     reading layer.text alone would speak nothing on exactly the layers most likely to want a voice. */
  function textOf(layer) {
    if (!layer) return '';
    if (Array.isArray(layer.captions) && layer.captions.length) {
      return layer.captions.map(function (c) { return c && typeof c.text === 'string' ? c.text : ''; })
        .filter(Boolean).join(' ').trim();
    }
    return typeof layer.text === 'string' ? layer.text.trim() : '';
  }

  function speaking() { return !!(_speakingId && (_pending || (SYN && (SYN.speaking || SYN.pending)))); }
  function speakingId() { return speaking() ? _speakingId : null; }

  function stop() {
    _speakingId = null; _pending = false;
    _token++;   // …so a speak still waiting on the voice list does not start after Stop was pressed
    if (!available()) return;
    try { SYN.cancel(); } catch (e) {}
  }

  /* Speak the layer's text. `onChange` fires on start and on finish so a button can redraw itself —
     there is no way to poll this cheaply and .speaking lies briefly right after cancel().
     WAITS FOR THE VOICE LIST IF IT HAS NOT ARRIVED (queue 466). `getVoices()` is empty for the first
     moments of a page, so pressing Play quickly used to fall back to the device default and say the
     line in the wrong voice — silently, which is the worst way for it to be wrong. */
  function speak(layer, onChange) {
    if (!available()) return false;
    const words = textOf(layer);
    if (!words) return false;
    stop();   // one global queue: without this a second press QUEUES behind the first instead of replacing it
    const mine = ++_token;
    _speakingId = layer.id; _pending = true;
    if (onChange) onChange();   // the button flips to Stop immediately, even while voices load
    const go = function () {
      // Stopped, or a newer press superseded this one, while we were waiting for the list.
      if (mine !== _token) return;
      _pending = false;
      const s = settingsOf(layer);
      let u;
      try { u = new UTT(words); } catch (e) { _speakingId = null; if (onChange) onChange(); return; }
      const v = resolve(s.voice);
      if (v) { u.voice = v; u.lang = v.lang || u.lang; }
      u.rate = s.rate; u.pitch = s.pitch;
      const done = function () { if (_speakingId === layer.id) { _speakingId = null; if (onChange) onChange(); } };
      u.onend = done; u.onerror = done;
      try { SYN.speak(u); } catch (e) { _speakingId = null; }
      if (onChange) onChange();
    };
    if (_voices.length) go(); else load().then(go);
    return true;
  }

  FM.tts = {
    available: available,
    load: load,
    voices: voices,
    sorted: sorted,
    settingsOf: settingsOf,
    resolve: resolve,
    update: update,
    textOf: textOf,
    speak: speak,
    stop: stop,
    speaking: speaking,
    speakingId: speakingId,
    RATE: RATE,
    PITCH: PITCH,
    /* Said in one place so the panel and any future caller cannot drift into a softer version of it.
       Plain language, because Ezra is who reads it. */
    EXPORT_NOTE: 'This plays on your device only — it will NOT be in an exported video. The browser can speak text but gives no way to record what it says, so there is nothing to put on the timeline. To get a voice into an export you’d need either a cloud voice service (a key, and your text leaves the device) or to record a voiceover yourself.',
  };
})(window.FM);
