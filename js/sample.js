/* FreeMotion — Sample clip generator (dev/test aid).
 * Synthesizes a short test video in-browser (no file needed) so reverse / keyframes /
 * export can be tested instantly. Clear directional motion + a rising audio tone, so
 * "reversed" is unmistakable: the ball travels the other way and the pitch falls.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  /* WHICH CONTAINER TO RECORD IN — and every candidate is actually PROBED.
   *
   * This used to test two webm strings and then fall through to the bare literal 'video/webm' — the one
   * value that was never passed to isTypeSupported. On Safari, which records mp4 and no webm at all,
   * all three are unsupported, so `new MediaRecorder(stream, { mimeType: 'video/webm' })` threw
   * NotSupportedError. The throw happened AFTER the AudioContext and its oscillator were started and
   * with no try/finally anywhere, so every tap of "Sample clip" stranded a live AudioContext with a
   * running oscillator — and iOS caps those at about four, after which every audio feature in the app
   * (playback, waveforms, audio FX, export mixing) stops working until the page is reloaded. The button
   * did nothing at all, silently: addSampleClip is async and both real call sites invoke it bare.
   *
   * THIS ENTRY HAD BEEN CLOSED AS "NOT REPRODUCIBLE". It was re-tested on 17 Aug and re-opened, because
   * that verdict was reached in Chrome headless — the one browser where a Safari-only bug cannot fire —
   * and Ezra's own device report reads "Safari · iOS". A "cannot reproduce" is only worth anything on a
   * platform where the thing could reproduce.
   *
   * Pure and injectable so the suite can ask it what it would choose on a browser this machine is not.
   * Returns null when nothing is supported, which means "let the browser decide", not "give up". */
  const MIME_CANDIDATES = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
  ];
  FM._sampleMimeCandidates = MIME_CANDIDATES.slice();
  FM._sampleMime = function (isSupported) {
    if (typeof isSupported !== 'function') return null;
    for (let i = 0; i < MIME_CANDIDATES.length; i++) {
      if (isSupported(MIME_CANDIDATES[i])) return MIME_CANDIDATES[i];
    }
    return null;
  };

  FM.addSampleClip = async function (seconds) {
    seconds = seconds || 4;
    const W = 720, H = 1280, FPS = 30;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const stream = cv.captureStream(FPS);

    /* EVERYTHING BELOW IS UNWOUND ON THE WAY OUT, however it goes. The old code cleaned up on ONE line
       (`await stopped; try { osc.stop(); ac.close(); }`) which sat after the throw point and behind an
       await that never resolved — so a failure leaked the audio graph, the draw timer and the canvas
       stream's tracks. The tracks were never stopped even on SUCCESS. */
    let ac = null, osc = null, drawTimer = 0;
    const cleanup = () => {
      if (drawTimer) { clearInterval(drawTimer); drawTimer = 0; }
      try { if (osc) osc.stop(); } catch (e) {}
      try { if (ac && ac.state !== 'closed') ac.close(); } catch (e) {}
      try { stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); } catch (e) {}
    };
    try {

    // rising audio tone (220 -> 880 Hz) so reversed audio is audibly different
    const AC = window.AudioContext || window.webkitAudioContext;
    ac = new AC();
    const dest = ac.createMediaStreamDestination();
    osc = ac.createOscillator();
    const gain = ac.createGain();
    gain.gain.value = 0.12;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(880, ac.currentTime + seconds);
    osc.connect(gain).connect(dest);
    osc.start();
    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));

    const mime = FM._sampleMime(function (t) { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } });
    /* No supported type is NOT a failure — hand the stream over with no mimeType and let the browser
       pick its own. Naming a type it just rejected is what made this throw. */
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise(res => { rec.onstop = res; });

    function draw(t) {
      const p = Math.min(1, t / seconds);
      g.fillStyle = '#101522'; g.fillRect(0, 0, W, H);
      const bx = 90 + p * (W - 180), by = H * 0.32;
      g.fillStyle = '#5b8cff'; g.beginPath(); g.arc(bx, by, 64, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.textAlign = 'center';
      g.font = 'bold 60px sans-serif'; g.fillText('→', W / 2, H * 0.52);
      g.font = 'bold 200px sans-serif'; g.fillStyle = '#ffd34d';
      g.fillText(String(Math.floor(t * FPS)).padStart(3, '0'), W / 2, H * 0.74);
      g.font = '30px sans-serif'; g.fillStyle = '#9aa3b2';
      g.fillText('SAMPLE — forward', W / 2, H * 0.84);
    }

    // Timer-driven (not requestAnimationFrame) so it still records when the tab is
    // backgrounded. The canvas captureStream samples whatever is currently drawn.
    const t0 = performance.now();
    draw(0);
    rec.start();
    drawTimer = setInterval(() => draw((performance.now() - t0) / 1000), Math.round(1000 / FPS));
    setTimeout(() => { clearInterval(drawTimer); if (rec.state !== 'inactive') rec.stop(); }, seconds * 1000);

    await stopped;
    cleanup();
    /* Name the file after what the recorder ACTUALLY produced, not after what we hoped for. On Safari
       this is mp4; calling it .webm handed the importer a file whose extension lied about its bytes. */
    const outType = String(rec.mimeType || (mime || 'video/webm')).split(';')[0] || 'video/webm';
    const ext = outType.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: outType });
    const file = new File([blob], 'sample-clip.' + ext, { type: outType });
    const recObj = await FM.loadVideoFile(file);
    if (!isFinite(recObj.duration) || recObj.duration <= 0) recObj.duration = seconds; // known length
    FM.addMediaLayer(recObj);
    return 'sample clip added (' + (recObj.duration || 0).toFixed(2) + 's)';

    } catch (e) {
      /* SAY SO. Both real call sites invoke this bare, so a rejection here was an unhandled promise and
         the button simply did nothing with no error anywhere the user could see. Swallowed on purpose
         rather than rethrown, for the same reason: nothing upstream is catching. */
      cleanup();
      if (FM.toast) FM.toast('Could not make a sample clip on this browser', 3200);
      try { console.warn('addSampleClip failed', e); } catch (_) {}
      return null;
    }
  };
})(window.FM);
