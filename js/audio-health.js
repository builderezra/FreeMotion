/* ═══ WHY THE SOUND CUTS OUT — measured on the device it happens on ══════════════════════════════
 *
 * Ezra, 28 Aug 2026, on his phone, after the scratchy-popping fix landed:
 *     "Seems fixed for the scratchy popping but audio still doesn't play consistently on mobile,
 *      it cuts in and out"
 * And earlier, the same complaint from two other directions:
 *     "Timeline on my phone is still really laggy and the audios don't play smoothly, I just
 *      tested adding a voice memo."   (#95)
 *     "Adding a SONG is really buggy and sometimes will not play at all."   (#96)
 *
 * ⚠️ ALL THREE ENTRIES END ON THE SAME SENTENCE — "what this half needs is a number from HIS phone,
 * not another pass here" — and have done for weeks. Everything measurable has been measured on this
 * Mac, at 4x and 6x CPU throttle, and none of it reproduces the thing he describes. A throttled
 * desktop rules out algorithmic blow-up; it cannot rule out iOS Safari unloading a media element.
 *
 * THE APP ALREADY KNEW MOST OF THIS AND HAD NO WAY TO SAY IT. `FM.playbackStats` has counted syncs,
 * seeks, trims, rate-writes and dropped frames for months, with no reader outside the suite. That is
 * the same shape as the export bug (#215/#662), where five separate "no audio" warnings all fired
 * behind a dimmed overlay, and the same shape as the lag reports, which only ever moved once
 * `fm.lastPerfReport` gave him something to paste. So this does not invent a new diagnosis — it
 * records what happens and writes it somewhere he can reach.
 *
 * WHAT IT ADDS THAT NOTHING ELSE MEASURED: whether an element that is SUPPOSED to be making sound
 * actually advanced. A stall is invisible to every counter here — no seek, no trim, no dropped
 * frame, no hole in the waveform — and "cuts in and out" is exactly what a stall sounds like.
 *
 * Two rules this file obeys, both learned the hard way in this project:
 *   · IT MUST NOT COST ANYTHING. It runs inside the playback tick, once per sounding element. It is
 *     a handful of number comparisons and no allocation on the common path.
 *   · IT MUST NEVER BE ABLE TO BREAK PLAYBACK. Every entry point is wrapped, and a throw here is
 *     swallowed rather than allowed to take the transport down. An instrument that can break the
 *     thing it measures is worse than no instrument.
 */
(function () {
  'use strict';
  const FM = window.FM = window.FM || {};

  /* A sounding element must advance at roughly its playback rate. Below a QUARTER of that, over a
     window long enough not to be jitter, it is not playing — it is stalled. Both numbers are
     deliberately forgiving: the point is to catch a sound that STOPPED, not to grade its timing,
     which `FM.playbackStats.errs` already does far more precisely. */
  const STALL_WINDOW_MS = 150;   // shorter than this and ordinary frame jitter reads as a stall
  const STALL_FRACTION = 0.25;   // advanced less than a quarter of what the rate promised

  /* The events a media element fires when it is unambiguously in trouble.
     ⚠️ `pause` AND `ended` ARE DELIBERATELY NOT IN THIS LIST, and the reason is the whole design of
     this file. The first version had them, on the reasoning that on iOS an element can be paused by
     the SYSTEM — a route change, memory pressure, another app taking the audio session — which really
     is the most likely shape of "it cuts in and out" on a phone. Telling THAT pause from an ordinary
     one was done with a flag the transport set before pausing deliberately… and the transport pauses
     elements in FOUR places, not one. Three of them are inside the playback tick (the frame-cache
     guard, the reversed-clip silencer, and the ordinary clip-exit at js/app.js:1673) and none of them
     set the flag. So every clip ending and every loop lap would have been recorded as a pause nobody
     asked for — the exact signature of the iOS bug this file was written to find. The instrument
     would have manufactured evidence of its own subject, and this file's own rule says why that is
     the worst possible outcome: a report full of false alarms is a report he stops reading.
     A flag that four call sites must remember to set is a safeguard held shut by remembering. So the
     flag is gone, and what remains is judged from state the watcher can see for itself — see
     `noteRestart`, which is one call site and decides for itself whether a restart was ordinary. */
  const TROUBLE = ['waiting', 'stalled', 'suspend', 'emptied', 'abort', 'error'];

  const S = {
    playMs: 0, soundingMs: 0,
    stalls: 0, stalledMs: 0, worstStallMs: 0, restarts: 0,
    events: Object.create(null),
    firstAt: null, lastAt: null,
    clips: Object.create(null),
  };
  FM._audioHealth = S;                      // suite hook — see tests

  function reset() {
    S.playMs = 0; S.soundingMs = 0; S.stalls = 0; S.stalledMs = 0; S.worstStallMs = 0; S.restarts = 0;
    S.events = Object.create(null); S.firstAt = null; S.lastAt = null;
    S.clips = Object.create(null);
  }

  function bump(name, id) {
    S.events[name] = (S.events[name] || 0) + 1;
    if (id) {
      const c = S.clips[id] || (S.clips[id] = { stalls: 0, stalledMs: 0, ev: Object.create(null) });
      c.ev[name] = (c.ev[name] || 0) + 1;
    }
  }

  /* Attached ONCE per element, lazily, the first time the tick reports on it. Doing it here rather
     than at element-creation time means nothing else in the app has to know this file exists — and a
     media element that never plays never pays for a listener it does not need. */
  function wire(m) {
    if (!m || !m.el || m._ahWired) return;
    m._ahWired = true;
    const id = m.layerId || m.id || 'clip';
    TROUBLE.forEach(function (name) {
      try {
        m.el.addEventListener(name, function () { if (FM.playing) bump(name, id); }, false);
      } catch (e) {}
    });
  }

  FM.audioHealth = {
    /* Called from the playback tick for every element that is inside its clip window. `sounding` is
       the app's own view of whether this element ought to be audible right now. */
    note: function (m, now, sounding) {
      try {
        if (!m || !m.el) return;
        wire(m);
        const el = m.el;
        if (S.firstAt == null) S.firstAt = now;
        S.lastAt = now;
        const ct = el.currentTime || 0;
        const was = m._ahCt, at = m._ahAt;
        m._ahCt = ct; m._ahAt = now;
        // when this element was last BOTH tracked and meant to be audible — noteRestart reads it
        if (sounding && !el.muted && el.volume > 0 && !el.paused) m._ahSoundAt = now;
        if (was == null || at == null) return;
        const dt = now - at;
        if (dt < STALL_WINDOW_MS || dt > 2000) return;   // too soon to judge, or the tab was away
        S.playMs += dt;
        if (!sounding || el.muted || !(el.volume > 0) || el.paused) return;
        S.soundingMs += dt;
        const rate = (el.playbackRate > 0 ? el.playbackRate : 1);
        const expected = (dt / 1000) * rate;
        const moved = ct - was;
        if (expected > 0 && moved < expected * STALL_FRACTION) {
          S.stalls++;
          S.stalledMs += dt;
          if (dt > S.worstStallMs) S.worstStallMs = dt;
          const id = m.layerId || m.id || 'clip';
          const c = S.clips[id] || (S.clips[id] = { stalls: 0, stalledMs: 0, ev: Object.create(null) });
          c.stalls++; c.stalledMs += dt;
        }
      } catch (e) {}
    },

    /* THE SOUND STOPPED AND THE APP HAD TO START IT AGAIN — the honest version of the signal the
       first draft got wrong. Called from the one place the transport resumes a paused element
       mid-playback (js/app.js), and it decides FOR ITSELF whether that restart was ordinary, so no
       other call site has to remember anything.
       Two conditions must BOTH hold for it to count, and each rules out a different innocent case:
         · the element was being tracked as audible moments ago — so first entry into a clip, which
           always resumes a never-played element, is not a fault;
         · the element was already sitting within a quarter-second of where it was supposed to be — so
           entering a clip, a loop wrap and any real seek, which all move it somewhere new, are not
           faults either.
       What survives both is an element that was playing, was in the right place, and had stopped on
       its own. On a phone that is precisely "it cuts in and out". */
    noteRestart: function (m, now, local) {
      try {
        if (!m || !m.el) return;
        const seen = m._ahSoundAt;
        if (seen == null || now - seen > 400) return;                       // was not audible just now
        if (!(Math.abs((m.el.currentTime || 0) - local) < 0.25)) return;     // moved — a seek, not a stop
        S.restarts++;
        const id = m.layerId || m.id || 'clip';
        const c = S.clips[id] || (S.clips[id] = { stalls: 0, stalledMs: 0, ev: Object.create(null) });
        c.ev['restart'] = (c.ev['restart'] || 0) + 1;
      } catch (e) {}
    },

    reset: reset,

    /* Plain text, because the whole point is that he can paste it to me from the phone. Same shape
       as the export report in Settings, for the same reason. */
    report: function () {
      const p = FM.playbackStats || {};
      const errs = (p.errs || []).slice().sort(function (a, b) { return a - b; });
      const med = errs.length ? errs[errs.length >> 1] : null;
      const worstErr = errs.length ? errs[errs.length - 1] : null;
      const secs = function (ms) { return (ms / 1000).toFixed(1) + 's'; };
      const lines = [
        'FreeMotion audio report',
        'when       ' + new Date().toISOString(),
        'played     ' + secs(S.playMs) + '   with sound: ' + secs(S.soundingMs),
        'CUT OUT    ' + S.stalls + ' time(s), ' + secs(S.stalledMs) + ' total, worst ' + Math.round(S.worstStallMs) + 'ms',
        'RESTARTED  ' + S.restarts + ' time(s)   (the sound stopped on its own and the app started it again)',
      ];
      const ev = Object.keys(S.events);
      lines.push('events     ' + (ev.length ? ev.map(function (k) { return k + ' x' + S.events[k]; }).join(', ') : 'none'));
      const ids = Object.keys(S.clips);
      if (ids.length > 1) {
        lines.push('per clip   ' + ids.map(function (id) {
          const c = S.clips[id];
          return String(id).slice(-6) + ': ' + c.stalls + ' cut(s)';
        }).join(', '));
      }
      lines.push('sync       seeks ' + (p.seeks | 0) + ', trims ' + (p.trims | 0) + ', rate writes ' + (p.rateWrites | 0));
      lines.push('timing     median |err| ' + (med == null ? '-' : Math.round(med * 1000) + 'ms') +
                 ', worst ' + (worstErr == null ? '-' : Math.round(worstErr * 1000) + 'ms'));
      lines.push('frames     drawn ' + (p.renders | 0) + ', dropped ' + (p.drops | 0));
      lines.push('clock      ' + (FM.clockSource ? FM.clockSource() : '?'));
      lines.push('drawing    ' + (FM.glWarp && FM.glWarp.available && FM.glWarp.available() ? 'GPU' : 'CPU (no WebGL)') +
                 ', ' + (FM.fxHealth ? FM.fxHealth().line : 'canvas fx ?'));   // v14.33 — one writer, see FM.fxHealth
      lines.push('device     ' + (navigator.userAgent || '').slice(0, 120));
      return lines.join('\n');
    },

    /* Written when playback STOPS rather than continuously: a localStorage write per frame would be
       the very main-thread stall this file exists to detect. */
    save: function () {
      try {
        if (!S.playMs) return;                       // nothing played, nothing to say
        localStorage.setItem('fm.lastAudioReport', FM.audioHealth.report());
      } catch (e) {}
    }
  };

  /* ⚠️ …AND ALSO WHEN HE LEAVES WITHOUT PRESSING STOP, which on a phone is the LIKELY case.
   * The report is written by FM.pause. Picture what he actually does: he plays it, hears the sound
   * break up, and switches away to tell me — home button, app switcher, another tab. Playback is torn
   * down without the stop button ever being pressed, and the one recording of the fault he was trying
   * to report goes with it. An instrument that only survives the tidy path is an instrument that
   * misses the case it was built for.
   * `pagehide` and a hidden `visibilitychange` are the two events iOS Safari actually delivers on the
   * way out; `beforeunload` is unreliable there. Both go through the same guarded save, which is a
   * no-op when nothing played. */
  try {
    const bail = function () { try { FM.audioHealth.save(); } catch (e) {} };
    window.addEventListener('pagehide', bail, false);
    document.addEventListener('visibilitychange', function () { if (document.hidden) bail(); }, false);
  } catch (e) {}
})();
