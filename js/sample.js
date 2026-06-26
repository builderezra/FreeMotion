/* FreeMotion — Sample clip generator (dev/test aid).
 * Synthesizes a short test video in-browser (no file needed) so reverse / keyframes /
 * export can be tested instantly. Clear directional motion + a rising audio tone, so
 * "reversed" is unmistakable: the ball travels the other way and the pitch falls.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  FM.addSampleClip = async function (seconds) {
    seconds = seconds || 4;
    const W = 720, H = 1280, FPS = 30;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const stream = cv.captureStream(FPS);

    // rising audio tone (220 -> 880 Hz) so reversed audio is audibly different
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    const dest = ac.createMediaStreamDestination();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    gain.gain.value = 0.12;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(880, ac.currentTime + seconds);
    osc.connect(gain).connect(dest);
    osc.start();
    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));

    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime });
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
    const drawTimer = setInterval(() => draw((performance.now() - t0) / 1000), Math.round(1000 / FPS));
    setTimeout(() => { clearInterval(drawTimer); if (rec.state !== 'inactive') rec.stop(); }, seconds * 1000);

    await stopped;
    try { osc.stop(); ac.close(); } catch (e) {}
    const blob = new Blob(chunks, { type: 'video/webm' });
    const file = new File([blob], 'sample-clip.webm', { type: 'video/webm' });
    const recObj = await FM.loadVideoFile(file);
    if (!isFinite(recObj.duration) || recObj.duration <= 0) recObj.duration = seconds; // known length
    FM.addMediaLayer(recObj);
    return 'sample clip added (' + (recObj.duration || 0).toFixed(2) + 's)';
  };
})(window.FM);
