/* FreeMotion — voice recorder (Add ▸ Audio ▸ Record voice…).
 *
 * Ezra: "Add a record voice button in the audio section that allows you to create a voice recording
 * in the app."
 *
 * PRIVACY, stated here and on the panel itself: the audio NEVER LEAVES THE DEVICE. It is captured by
 * MediaRecorder, wrapped in a File, and handed to the SAME importer an imported song goes through —
 * so it lands in the same IndexedDB media store, in the same media library, as an ordinary audio
 * layer. There is no network call in this file and there must never be one.
 *
 * ONE PATH, NOT TWO. commit() does exactly what js/app.js handleFiles() does for an audio file:
 *   FM.loadVideoFile(file)  →  FM.addMediaLayer(rec)
 * An mp3 rides the pictureless-video path (a <video> with a 0×0 picture) and gets the waveform lane,
 * the live mix, keyframed volume and the export mix for free. A recording is not special, so it does
 * not get a second code path that could drift from the imported one.
 *
 * THE MICROPHONE IS RELEASED ON EVERY EXIT. There is exactly one function that can end a capture —
 * releaseMic() — and every exit routes through it: stop, cancel, add, retake, close, Escape, the
 * backdrop, an error, a denial, the tab being hidden, and pagehide. A live mic indicator left burning
 * on a phone is a privacy problem and a battery drain, and it is the easiest thing here to get wrong.
 * The tracks are kept (stopped) on `micTracks` so the suite can assert readyState === 'ended' after
 * each of those paths rather than trusting the code to have done it.
 *
 * NO HARDCODED MIME TYPE. Chrome hands back audio/webm;codecs=opus, iOS Safari hands back audio/mp4;
 * asking for the wrong one throws NotSupportedError. pickMime() walks a candidate list through
 * MediaRecorder.isTypeSupported() and falls back to '' — the browser's own default — if none match.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  /* ---- constants ------------------------------------------------------------------------------ */

  /* Preference order, best-first. Opus in WebM is the smallest good-sounding container Chrome/Android
     offer; audio/mp4 (AAC) is the only one iOS Safari supports at all, so it has to be in the list and
     BELOW webm — otherwise Chrome, which supports both, would write the bigger AAC file. */
  var MIME_CANDIDATES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  /* Extension per container. The name matters twice over: FM.addMediaLayer takes the layer's name
     from it, and js/app.js mediaKind() classifies by extension whenever a File's type is empty. */
  var EXT = [
    [/^audio\/webm/, '.webm'],
    [/^audio\/mp4/, '.m4a'],
    [/^audio\/ogg/, '.ogg'],
    [/^audio\/wav|^audio\/x-wav/, '.wav'],
  ];

  /* THE LENGTH CAP, and why it is ten minutes.
     Decoded PCM — not the file — is what kills a phone tab: rate × channels × 4 bytes/sec, which is
     set by DURATION and nothing else (see js/media.js decodeAudio's measured table; that is the same
     cost that made long video imports fail before v5.59). A mic track is mono, and decodeAudioData
     resamples to the device rate, so 48 kHz × 1 × 4 = 192 KB/s:
        1 min → 11.5 MB      10 min → 115 MB      20 min → 230 MB      60 min → 691 MB
     The exporter holds that buffer alongside the video decode and the muxer's output, against a
     mobile tab ceiling of roughly 1–2 GB. 115 MB leaves that headroom intact; 20 minutes starts
     competing with the picture for it. Ten minutes is also far longer than any voice-over anyone
     records in one unbroken take in a motion-graphics app — and this CAPS rather than discards: at
     the limit the recording STOPS and you keep every second of it. */
  var MAX_SECONDS = 600;
  var WARN_AT = 30;          // seconds left when the readout starts warning
  /* Below this, "you tapped stop straight away" — never make a layer out of it. A quarter second is
     comfortably longer than a double-tap and far shorter than the shortest deliberate word. */
  var MIN_SECONDS = 0.25;
  var SILENT_RMS = 0.006;    // below this the mic is hearing nothing worth calling signal
  var SILENT_AFTER = 3;      // …and after this many seconds of it, say so

  /* ---- module state --------------------------------------------------------------------------- */

  var state = 'closed';      // closed | idle | recording | review | error
  var root = null, ui = {};
  var stream = null, micTracks = [];
  var recorder = null, chunks = [], mime = '';
  var ac = null, analyser = null, srcNode = null, levelBuf = null, rafId = 0;
  var startedAt = 0, seconds = 0, tickId = 0, watchId = 0, silentFor = 0, lastLevelAt = 0;
  var blob = null, blobUrl = null;
  var wasPlaying = false;
  var onVis = null, onKey = null, onHide = null;
  var landsAt = 0, landsFirst = false;

  /* ---- helpers -------------------------------------------------------------------------------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;   // textContent, never innerHTML — see the #r3 rule
    return e;
  }
  function clock(s) {
    s = Math.max(0, s || 0);
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  /* The LANDING time gets a tenth. A playhead at 0.9s printed as "0:00" by the whole-second clock
     is not a rounding nicety — it is the panel telling you the take starts at the beginning when it
     does not, on the exact number the placement rule has already confused Ezra over once. */
  function clockFine(s) {
    s = Math.max(0, s || 0);
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1);
  }
  // "10 minutes" / "45 seconds" — derived, so the cap and the words it is described in cannot drift.
  function capWords() {
    return MAX_SECONDS >= 60 ? (Math.round(MAX_SECONDS / 60 * 10) / 10) + ' minute' + (MAX_SECONDS >= 120 ? 's' : '')
                             : (Math.round(MAX_SECONDS * 10) / 10) + ' seconds';
  }
  function stamp() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds());
  }
  function extFor(type) {
    var t = String(type || '').toLowerCase();
    for (var i = 0; i < EXT.length; i++) if (EXT[i][0].test(t)) return EXT[i][1];
    return '.webm';   // the browser default we could not name; webm is what every default we know is
  }

  /* Pick a container this browser will actually record. Pure and injectable, because it is the one
     piece of this file that behaves differently on Ezra's iPhone than on any machine I can run.
     Returns '' when nothing matches — which is a VALID mimeType option meaning "your default", not a
     failure, and is also what a browser with no isTypeSupported at all should get. */
  function pickMime(isSupported, candidates) {
    var list = candidates || MIME_CANDIDATES;
    if (typeof isSupported !== 'function') return '';
    for (var i = 0; i < list.length; i++) {
      try { if (isSupported(list[i])) return list[i]; } catch (e) {}
    }
    return '';
  }

  function haveRecorder() { return typeof window.MediaRecorder === 'function'; }

  /* ---- the microphone: one acquire, ONE release ------------------------------------------------ */

  // The seam the suite drives. Default: the real thing. A test replaces this with an
  // AudioContext.createMediaStreamDestination() stream — a REAL MediaStream carrying a REAL
  // MediaStreamTrack, so stop() / readyState / MediaRecorder / createMediaStreamSource are all the
  // browser's own, and only the permission prompt is avoided.
  function openMic() {
    var md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) {
      var e = new Error('getUserMedia unavailable');
      e.name = window.isSecureContext === false ? 'SecurityError' : 'NotFoundError';
      return Promise.reject(e);
    }
    return md.getUserMedia({ audio: true });
  }

  /* EVERY exit path calls this. It is deliberately total and idempotent: stopping a stopped track,
     closing a closed context and cancelling a dead rAF are all no-ops, so calling it twice is safe
     and calling it from a path that never acquired anything is safe. */
  function releaseMic() {
    if (rafId) { try { cancelAnimationFrame(rafId); } catch (e) {} rafId = 0; }
    if (srcNode) { try { srcNode.disconnect(); } catch (e) {} srcNode = null; }
    analyser = null; levelBuf = null;
    // iOS caps live AudioContexts at about four; leaking one per recording eventually kills ALL audio
    // in the app (the same trap js/media.js decodeAudio documents).
    if (ac) { try { if (ac.close) ac.close(); } catch (e) {} ac = null; }
    /* ONE pass over the UNION of "the stream we are holding" and "every track we were handed". They
       are the same objects today (arm() sets both together), and an earlier cut stopped each list in
       its own loop — a mutation check proved that redundant: deleting either loop changed nothing,
       which means neither loop was really the thing being tested. Deduped, there is exactly one place
       a track can be stopped, and removing it is immediately visible.
       micTracks is NOT cleared: a stopped track costs nothing to hold, and it is what lets the suite
       assert readyState === 'ended' instead of trusting this function to have run. */
    var tr = (stream && stream.getTracks) ? stream.getTracks().slice() : [];
    stream = null;
    for (var i = 0; i < micTracks.length; i++) if (tr.indexOf(micTracks[i]) < 0) tr.push(micTracks[i]);
    for (var j = 0; j < tr.length; j++) { try { tr[j].stop(); } catch (e) {} }
  }

  /* ---- level meter ---------------------------------------------------------------------------- */

  function startMeter() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !stream) return;
    try {
      ac = new AC();
      if (ac.resume) { try { ac.resume(); } catch (e) {} }   // iOS hands back a suspended context
      srcNode = ac.createMediaStreamSource(stream);
      analyser = ac.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.4;
      srcNode.connect(analyser);
      // NOT connected to ac.destination — monitoring your own mic through the speakers is a feedback
      // loop, and on a phone it is a howl.
      levelBuf = new Uint8Array(analyser.fftSize);
    } catch (e) { analyser = null; return; }
    lastLevelAt = Date.now();
    silentFor = 0;
    drawLevel();
  }

  function drawLevel() {
    rafId = requestAnimationFrame(drawLevel);
    if (!analyser || !levelBuf) return;
    analyser.getByteTimeDomainData(levelBuf);
    var sum = 0;
    for (var i = 0; i < levelBuf.length; i++) { var v = (levelBuf[i] - 128) / 128; sum += v * v; }
    var rms = Math.sqrt(sum / levelBuf.length);
    // A voice sits well below full scale, so show it on a curve rather than linearly — otherwise the
    // bar never leaves the left-hand tenth and reads as "the mic is dead".
    var shown = Math.max(0, Math.min(1, Math.pow(rms * 4.2, 0.62)));
    if (ui.level) ui.level.style.width = (shown * 100).toFixed(1) + '%';
    if (ui.card) ui.card.dataset.level = shown.toFixed(3);   // the probe/suite reads this, not a pixel

    var now = Date.now(), dt = (now - lastLevelAt) / 1000; lastLevelAt = now;
    silentFor = rms < SILENT_RMS ? silentFor + dt : 0;
    if (ui.quiet) ui.quiet.classList.toggle('hidden', !(silentFor > SILENT_AFTER));
  }

  /* ---- the panel ------------------------------------------------------------------------------- */

  function build() {
    /* The geometry comes from the ID, and there is deliberately no `.vr-overlay` class beside it.
       js/elements-browser.js gives its root a class that has no rules anywhere, and that is exactly
       why "#el-browser opens with a 0x247 box" was so hard to see by reading (there is a regression
       test about it). One name, one place it is styled. */
    root = el('div', 'hidden');
    root.id = 'vr-overlay';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Record voice');

    var card = el('div', 'vr-card'); ui.card = card;

    var top = el('div', 'vr-top');
    top.appendChild(el('div', 'vr-title', 'Record voice'));
    var x = el('button', 'vr-close', '✕');
    x.type = 'button'; x.setAttribute('aria-label', 'Close');
    x.addEventListener('click', function () { close(); });
    top.appendChild(x);
    card.appendChild(top);

    // Said on the panel, not only in a changelog: this is the question anyone sensible asks before
    // letting an app hear them.
    card.appendChild(el('div', 'vr-privacy', 'Stays on this device — stored beside your imported files. Nothing is uploaded.'));

    ui.msg = el('div', 'vr-msg hidden');
    card.appendChild(ui.msg);

    var meter = el('div', 'vr-meter');
    meter.setAttribute('aria-hidden', 'true');
    ui.level = el('div', 'vr-meter-fill');
    meter.appendChild(ui.level);
    card.appendChild(meter);
    ui.meter = meter;

    ui.quiet = el('div', 'vr-quiet hidden', 'No sound is reaching the mic — check it isn’t muted or in use by another app.');
    card.appendChild(ui.quiet);

    var timeRow = el('div', 'vr-timerow');
    ui.time = el('div', 'vr-time', '0:00');
    ui.time.setAttribute('role', 'timer');
    timeRow.appendChild(ui.time);
    ui.cap = el('div', 'vr-cap', '/ ' + clock(MAX_SECONDS));
    timeRow.appendChild(ui.cap);
    card.appendChild(timeRow);

    ui.status = el('div', 'vr-status', '');
    card.appendChild(ui.status);

    ui.rec = el('button', 'vr-rec');
    ui.rec.type = 'button';
    ui.rec.appendChild(el('span', 'vr-rec-mark'));
    ui.rec.addEventListener('click', onRecTap);
    ui.recwrap = el('div', 'vr-recwrap');
    ui.recwrap.appendChild(ui.rec);
    card.appendChild(ui.recwrap);

    /* PLAYBACK. The <audio> element is the engine but never the UI: a native `controls` bar paints a
       white pill across the middle of a dark glass card (screenshotted at 390x844 — it is the one
       thing on the panel that does not look like this app), and it renders differently again on iOS.
       So it is hidden and driven by a play button, a progress bar and a readout in the panel's own
       language. The play button also gives iOS the user gesture it needs before a blob URL will
       sound at all. */
    ui.audio = el('audio', 'vr-audio');
    ui.audio.preload = 'metadata';
    ui.audio.setAttribute('hidden', '');
    card.appendChild(ui.audio);

    ui.playrow = el('div', 'vr-playrow hidden');
    ui.playBtn = el('button', 'vr-playbtn');
    ui.playBtn.type = 'button';
    ui.playBtn.setAttribute('aria-label', 'Play the recording');
    ui.playBtn.innerHTML = PLAY_ICON;   // a literal constant, never user text — see el()'s note
    ui.playBtn.addEventListener('click', togglePlayback);
    ui.playrow.appendChild(ui.playBtn);
    ui.playBar = el('div', 'vr-playbar');
    ui.playFill = el('div', 'vr-playfill');
    ui.playBar.appendChild(ui.playFill);
    // Tap or DRAG anywhere along the bar to scrub — a ten-minute take needs it. Pointer capture is
    // what makes the drag survive a finger that wanders off the 8px track it started on.
    var scrub = function (ev) {
      var r = ui.playBar.getBoundingClientRect();
      var d = ui.audio.duration;
      if (!(d > 0) || !isFinite(d)) d = seconds;
      if (!(d > 0) || !r.width) return;
      ui.audio.currentTime = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * d;
      paintPlayback();
    };
    ui.playBar.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      try { ui.playBar.setPointerCapture(ev.pointerId); } catch (e) {}
      scrub(ev);
    });
    ui.playBar.addEventListener('pointermove', function (ev) {
      if (ui.playBar.hasPointerCapture && ui.playBar.hasPointerCapture(ev.pointerId)) scrub(ev);
    });
    ui.playrow.appendChild(ui.playBar);
    ui.playTime = el('div', 'vr-playtime', '0:00');
    ui.playrow.appendChild(ui.playTime);
    card.appendChild(ui.playrow);
    ['timeupdate', 'play', 'pause', 'ended', 'loadedmetadata'].forEach(function (k) {
      ui.audio.addEventListener(k, paintPlayback);
    });

    ui.lands = el('div', 'vr-lands hidden', '');
    card.appendChild(ui.lands);

    /* Two rows, not three-across. "Add to timeline" wrapped to two lines at 390px in a 3-up row
       (measured: 100px columns), and the primary action was the same size as the two it competes
       with. Full width on its own row, with the pair beneath it. */
    ui.add = el('button', 'vr-btn vr-btn--add', 'Add to timeline');
    ui.add.type = 'button';
    ui.add.addEventListener('click', commit);
    ui.addrow = el('div', 'vr-actions vr-actions--primary');
    ui.addrow.appendChild(ui.add);
    card.appendChild(ui.addrow);

    var acts = el('div', 'vr-actions');
    ui.retake = el('button', 'vr-btn', 'Retake');
    ui.retake.type = 'button';
    ui.retake.addEventListener('click', retake);
    ui.cancel = el('button', 'vr-btn', 'Cancel');
    ui.cancel.type = 'button';
    ui.cancel.addEventListener('click', function () { close(); });
    acts.appendChild(ui.cancel); acts.appendChild(ui.retake);
    ui.actions = acts;
    card.appendChild(acts);

    // Tap the backdrop to dismiss, the same as the effect browser. The card's own taps must not
    // count, hence the target check.
    root.addEventListener('pointerdown', function (ev) { if (ev.target === root) close(); });
    root.appendChild(card);
    document.body.appendChild(root);
  }

  var PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6L19 12z"/></svg>';
  var PAUSE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="5" width="3.6" height="14" rx="1"/><rect x="13.4" y="5" width="3.6" height="14" rx="1"/></svg>';
  function togglePlayback() {
    if (!ui.audio || !ui.audio.src) return;
    if (ui.audio.paused) { var pr = ui.audio.play(); if (pr && pr.catch) pr.catch(function () {}); }
    else ui.audio.pause();
  }
  function paintPlayback() {
    if (!ui.audio) return;
    var d = ui.audio.duration, t = ui.audio.currentTime || 0;
    // A MediaRecorder blob can report Infinity here for the same reason it does to the importer;
    // fall back to the length we measured rather than drawing a bar that never moves.
    if (!(d > 0) || !isFinite(d)) d = seconds || 0;
    ui.playFill.style.width = (d > 0 ? Math.max(0, Math.min(1, t / d)) * 100 : 0).toFixed(1) + '%';
    ui.playTime.textContent = clock(t) + ' / ' + clock(d);
    var playing = !ui.audio.paused && !ui.audio.ended;
    ui.playBtn.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
    ui.playBtn.setAttribute('aria-label', playing ? 'Pause the recording' : 'Play the recording');
  }

  function say(text, kind) {
    if (!ui.msg) return;
    ui.msg.textContent = text || '';
    ui.msg.classList.toggle('hidden', !text);
    ui.msg.classList.toggle('vr-msg--bad', kind === 'bad');
  }

  function paint() {
    if (!root) return;
    var rec = state === 'recording', rev = state === 'review', bad = state === 'error';
    var arming = state === 'idle' && !stream;
    root.dataset.state = state;                       // the probe and the suite read this, not pixels
    ui.rec.classList.toggle('rec', rec);
    ui.rec.disabled = bad || rev || arming;           // no "armed" button before the mic is actually up
    ui.rec.setAttribute('aria-label', rec ? 'Stop recording' : 'Start recording');
    ui.rec.title = rec ? 'Stop recording' : 'Start recording';
    ui.meter.classList.toggle('hidden', rev || bad);
    ui.recwrap.classList.toggle('hidden', rev || bad);
    ui.playrow.classList.toggle('hidden', !rev);
    ui.lands.classList.toggle('hidden', !rev);
    ui.addrow.classList.toggle('hidden', !rev);
    // Retake is also the way back from a failure, so it survives the error state (relabelled there).
    ui.retake.classList.toggle('hidden', !(rev || bad));
    // CANCEL STAYS THROUGHOUT, including mid-take: changing your mind halfway through a recording is
    // the commonest thing you do here, and it must not need the ✕ or a tap-out to find.
    ui.cancel.textContent = rec ? 'Discard' : 'Cancel';
    // Re-enabled here, not only in commit(): commit() disables it so one tap cannot fire two adds,
    // and paint() is the one place that owns control state — leaving the reset to commit() left the
    // button dead for every LATER recording in the session.
    ui.add.disabled = !rev;
    ui.time.classList.toggle('warn', rec && (MAX_SECONDS - seconds) <= WARN_AT);
    ui.cap.classList.toggle('hidden', rev || bad);
    ui.time.classList.toggle('hidden', rev || bad);
    if (!rec) ui.quiet.classList.add('hidden');
    ui.status.textContent =
      arming ? 'Asking for the microphone…'
      : state === 'idle' ? 'Mic is live — tap to record'
      : rec ? 'Recording…'
      : rev ? 'Recorded ' + seconds.toFixed(1) + 's — mic released'
      : '';
  }

  /* ---- open / close ---------------------------------------------------------------------------- */

  function open() {
    if (state !== 'closed') return;          // a second tap on Record voice… must not stack panels
    if (!root) build();
    chunks = []; blob = null; seconds = 0; silentFor = 0;
    say('');
    root.classList.remove('hidden');
    state = 'idle';
    ui.time.textContent = '0:00';
    if (ui.level) ui.level.style.width = '0%';

    // Recording over live playback would put the project's own audio into the take and fight for the
    // decoder. Pause rather than refuse: pausing is what you were about to do anyway, and refusing
    // would just be a control that does nothing until you guess why.
    wasPlaying = !!FM.playing;
    if (wasPlaying && FM.pause) {
      try { FM.pause(); } catch (e) {}
      say('Playback paused so the take is clean.');
    }

    /* Hidden → stop the take and let go of the mic. VISIBLE AGAIN → put the mic back, but only if
       the panel is sitting idle without one. That second half is not symmetry for its own sake: the
       too-short branch below re-arms, and if the app was backgrounded at that moment it would open
       the microphone again while the app is not even on screen. So the too-short path refuses to
       re-arm while hidden, and this is what makes the panel usable again when you come back. */
    onVis = function () {
      if (document.hidden) bgStop();
      else if (state === 'idle' && !stream) arm(true);
    };
    document.addEventListener('visibilitychange', onVis);
    onHide = function () { releaseMic(); };   // the page is going away; nothing else will run
    window.addEventListener('pagehide', onHide);
    onKey = function (e) {
      if (!root || root.classList.contains('hidden')) return;
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault(); e.stopPropagation();   // document CAPTURE, so app.js's window handler never sees it
        close();
      }
    };
    document.addEventListener('keydown', onKey, true);

    paint();
    arm();
  }

  /* Acquire the mic and start the meter. Separate from open() because Retake — and the too-short
     path — run it again. `keepMsg` matters: re-arming after "Too short, nothing was recorded" used
     to WIPE that sentence on its way past, so the one state where the panel has something important
     to say was the one state it said nothing. */
  function arm(keepMsg) {
    if (!haveRecorder()) {
      fail('This browser can’t record audio (no MediaRecorder). Import an audio file instead.');
      return;
    }
    if (!keepMsg) say('');
    Promise.resolve().then(FM.voiceRec._openMic).then(function (s) {
      if (state === 'closed') { // closed while the permission prompt was up — never leave it running
        try { s.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        return;
      }
      stream = s;
      micTracks = s.getTracks ? s.getTracks() : [];
      state = 'idle';
      startMeter();
      paint();
    }).catch(function (err) {
      var n = (err && err.name) || '';
      var m = n === 'NotAllowedError' || n === 'PermissionDeniedError' ? 'Microphone blocked. Allow mic access for this site, then tap Retake.'
        : n === 'SecurityError' ? 'Recording needs a secure page (https, or localhost). Import an audio file instead.'
        : n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'OverconstrainedError' ? 'No microphone found. Connect one, then tap Retake.'
        : n === 'NotReadableError' || n === 'TrackStartError' ? 'The microphone is busy — another app is using it. Close it, then tap Retake.'
        : 'Could not open the microphone' + (n ? ' (' + n + ')' : '') + '.';
      fail(m);
    });
  }

  // Never a control that silently does nothing: every failure says what happened, in words, and
  // leaves one way forward.
  function fail(msg) {
    releaseMic();
    state = 'error';
    say(msg, 'bad');
    ui.retake.textContent = 'Try again';
    paint();
  }

  function close() {
    if (state === 'closed') return;
    if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch (e) {} }
    recorder = null;
    stopTick(); stopWatch();
    releaseMic();                        // the exit path that catches every other one
    revoke();
    chunks = []; blob = null;
    state = 'closed';
    if (root) root.classList.add('hidden');
    if (onVis) { document.removeEventListener('visibilitychange', onVis); onVis = null; }
    if (onHide) { window.removeEventListener('pagehide', onHide); onHide = null; }
    if (onKey) { document.removeEventListener('keydown', onKey, true); onKey = null; }
    if (ui.retake) ui.retake.textContent = 'Retake';
  }

  function revoke() {
    if (ui.audio) { try { ui.audio.pause(); } catch (e) {} ui.audio.removeAttribute('src'); try { ui.audio.load(); } catch (e) {} }
    if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch (e) {} blobUrl = null; }
  }

  /* ---- record / stop ---------------------------------------------------------------------------- */

  function onRecTap() {
    if (state === 'recording') { stop(''); return; }
    if (state === 'idle') start();
  }

  /* Backgrounded mid-take: iOS suspends the recorder, so anything after this moment is lost anyway.
     Stop and KEEP what was captured rather than throwing the take away, and let go of the mic — a
     recording indicator burning while the app is not even on screen is the worst case here.
     Module-level rather than a closure inside open(), so the suite can drive this exact path without
     having to redefine document.hidden. */
  function bgStop() {
    if (state === 'recording') stop('The app went to the background, so the take stopped there.');
  }

  function start() {
    if (state !== 'idle' || !stream) return;
    if (FM.playing && FM.pause) { try { FM.pause(); } catch (e) {} }   // belt and braces
    mime = pickMime(window.MediaRecorder && MediaRecorder.isTypeSupported
      ? MediaRecorder.isTypeSupported.bind(MediaRecorder) : null);
    chunks = [];
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (e) {
      try { recorder = new MediaRecorder(stream); mime = ''; }   // the chosen type was refused anyway
      catch (e2) { fail('This browser refused to start a recording (' + (e2.name || 'error') + ').'); return; }
    }
    recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onerror = function () { fail('The recording stopped with an error.'); };
    recorder.onstop = finish;
    try { recorder.start(250); } catch (e) { fail('This browser refused to start a recording.'); return; }
    startedAt = Date.now(); seconds = 0; silentFor = 0;
    state = 'recording';
    say('');
    paint();
    startTick();
  }

  function startTick() {
    stopTick();
    tickId = setInterval(function () {
      seconds = (Date.now() - startedAt) / 1000;
      ui.time.textContent = clock(seconds);
      var left = MAX_SECONDS - seconds;
      ui.time.classList.toggle('warn', left <= WARN_AT);
      if (left <= WARN_AT && left > 0) say(Math.ceil(left) + 's left — ' + capWords() + ' is the limit for one take.');
      if (seconds >= MAX_SECONDS) stop('Stopped at the ' + capWords() + ' limit — everything up to here is kept.');
    }, 200);
  }
  function stopTick() { if (tickId) { clearInterval(tickId); tickId = 0; } }

  // `note` is shown after the take lands in review — used by the cap and by the backgrounding path.
  function stop(note) {
    if (state !== 'recording') return;
    seconds = (Date.now() - startedAt) / 1000;
    stopTick();
    ui._note = note || '';
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
        /* onstop is the FAST path, not the only one. A MediaRecorder stopped in the same tick it
           started has no encoded data to flush, and there is no guarantee across browsers that it
           still fires 'stop' — and if it does not, the panel sits on "Recording…" with a stop button
           that does nothing, forever. That is the worst failure this screen can have, so it gets a
           watchdog: finish() runs either way, and whichever arrives second is a no-op because
           finish() only acts while the state is still 'recording'. */
        watchId = setTimeout(function () { watchId = 0; finish(); }, 900);
        return;
      } catch (e) {}
    }
    finish();
  }
  function stopWatch() { if (watchId) { clearTimeout(watchId); watchId = 0; } }

  function finish() {
    if (state !== 'recording') return;
    stopWatch();
    recorder = null;
    // THE MIC GOES DOWN THE INSTANT THE TAKE ENDS. Review, retake and Add all work off the blob, so
    // there is no reason to keep the indicator lit while you listen back.
    releaseMic();
    blob = chunks.length ? new Blob(chunks, { type: mime || (chunks[0] && chunks[0].type) || '' }) : null;
    chunks = [];

    // Zero-length: tapped stop the instant you tapped record, or a recorder that produced nothing.
    // This must NOT become a layer — an empty audio clip on the timeline is worse than no clip.
    if (!blob || !blob.size || seconds < MIN_SECONDS) {
      blob = null;
      state = 'idle';
      say('Too short — nothing was recorded. Hold the take for at least a moment.', 'bad');
      ui.time.textContent = '0:00';
      paint();
      // Put the mic back so the next tap works — keeping the message. NOT while the page is hidden:
      // this same branch runs when a backgrounded take turns out to be too short, and re-arming there
      // would re-open the microphone with the app off screen. The visibilitychange handler above
      // re-arms instead, the moment you come back.
      if (!document.hidden) arm(true);
      return;
    }

    blobUrl = URL.createObjectURL(blob);
    ui.audio.src = blobUrl;
    paintPlayback();
    landsFirst = !!(FM.scene && FM.scene.layers && FM.scene.layers.length === 0);
    landsAt = FM.time || 0;
    ui.lands.textContent = landsFirst
      ? 'Will start the composition at 0:00.'
      : 'Lands at ' + clockFine(landsAt) + ' — where the playhead is, same as an import.';
    state = 'review';
    say(ui._note || '');
    ui._note = '';
    paint();
  }

  function retake() {
    revoke();
    blob = null; chunks = []; seconds = 0;
    ui.time.textContent = '0:00';
    ui.retake.textContent = 'Retake';
    state = 'idle';
    say('');
    paint();
    arm();
  }

  /* ---- commit: the SAME path an import takes ---------------------------------------------------- */

  function commit() {
    if (state !== 'review' || !blob) return;
    var b = blob, secs = seconds;
    ui.add.disabled = true;
    var name = 'Voice ' + stamp() + extFor(b.type || mime);
    var file;
    try {
      file = new File([b], name, { type: b.type || mime || 'audio/webm', lastModified: Date.now() });
    } catch (e) {   // very old Safari has no File constructor — the Blob still imports, just unnamed
      file = b; try { file.name = name; } catch (e2) {}
    }
    close();          // the panel is done; the mic is already down, and close() proves it
    FM.voiceRec.addFile(file, secs).catch(function (err) {
      if (FM.toast) FM.toast((err && err.message) || 'Could not add the recording');
    });
  }

  /* Exactly js/app.js handleFiles()'s audio branch, plus one correction that only a recording needs:
     a MediaRecorder blob often reports duration 0 or Infinity until the whole file is scanned, and
     FM.addMediaLayer would then give it the 5-second default from Settings instead of its real
     length. We MEASURED the take, so hand that number over when the file will not say. */
  async function addFile(file, measured) {
    var rec = await FM.loadVideoFile(file);
    if (!(rec.duration > 0) && measured > 0) rec.duration = measured;
    FM.addMediaLayer(rec);
    if (FM.toast) FM.toast('Recording added — ' + (rec.duration || measured || 0).toFixed(1) + 's');
    return rec;
  }

  /* ---- public ---------------------------------------------------------------------------------- */

  FM.voiceRec = {
    open: open,
    close: close,
    isOpen: function () { return state !== 'closed'; },
    addFile: addFile,

    /* --- exposed for the suite (and for a future bug report) --- */
    _openMic: openMic,            // replaced by the suite with a real, permission-free MediaStream
    _pickMime: pickMime,
    _mimeCandidates: MIME_CANDIDATES.slice(),
    _extFor: extFor,
    _state: function () { return state; },
    _tracks: function () { return micTracks.slice(); },   // stopped tracks are kept so 'ended' is provable
    _stop: function (note) { stop(note); },
    _hidden: bgStop,                                      // the visibilitychange path, drivable directly
    MAX_SECONDS: MAX_SECONDS,
    MIN_SECONDS: MIN_SECONDS,
    // Shorten the cap so the suite can actually reach it — ten minutes of real time is not a test.
    // Returns the previous value so the caller can put it back.
    _setMax: function (n) {
      var was = MAX_SECONDS;
      MAX_SECONDS = n;
      if (ui.cap) ui.cap.textContent = '/ ' + clock(MAX_SECONDS);
      return was;
    },
  };
})(window.FM);
