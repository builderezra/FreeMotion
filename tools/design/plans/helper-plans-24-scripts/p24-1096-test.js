
  /* ═══ #1085: THE INTRO FILM LETS GO WHEN THE SPLASH HAS GONE. Measured on the suite's own page (memory-infra, after two forced
     collections): a detached <video id=splash-vid> held media/frame_buffers 163 MB + webmediaplayer 13.4 MB for the WHOLE
     session — on every first load of a session, his phone included. dismiss() removed #splash and never cleared the film's
     source, and the document keydown listener's closure kept the element (and so its decoded 4K frames) alive forever.
     The boot script runs once per session, so this runs THE SHIPPED SCRIPT — read out of index.html — in a srcdoc frame with
     the session flag cleared, lets the film load (the control: there was something to let go of), skips it the way he can
     (Escape), and asks the element itself once #splash is gone: no source, nothing loaded. */
  test('1085 the intro film is unloaded once the splash has gone, so its decoded frames are not held for the rest of the session', { item: '1085', budgetMs: 30000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const src = await fetch(location.href.split('#')[0], { cache: 'no-store' }).then(r => r.text());
    const a = src.indexOf('<div id="splash"'), b = src.indexOf('<div id="app">');
    if (a < 0 || b < a) throw new Error('setup: the splash markup and its boot script were not found in index.html');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) throw new Error('setup: this browser asks for reduced motion, so the boot script skips the film and there is nothing to release');
    let splashed0 = null, film = null;
    try { splashed0 = sessionStorage.getItem('fm.splashed'); } catch (e) {}
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:-9999px;top:0;width:390px;height:760px;border:0';
    try {
      try { sessionStorage.removeItem('fm.splashed'); } catch (e) {}
      /* P24: this container cannot decode the shipped MP4 (no H.264), so the film is swapped for a short WebM made here; the boot script,
         the dismiss path and the check are the shipped ones. On a browser that CAN decode the MP4 nothing needs swapping, and a
         failed swap leaves the shipped film in place. */
      try {
        if (!document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"') && window.MediaRecorder && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          const cv = document.createElement('canvas'); cv.width = 320; cv.height = 240; const g = cv.getContext('2d');
          const rec = new MediaRecorder(cv.captureStream(15), { mimeType: 'video/webm;codecs=vp9' }), chunks = []; rec.ondataavailable = e => chunks.push(e.data);
          const done = new Promise(r => rec.onstop = r); rec.start(100);
          for (let i = 0; i < 25; i++) { g.fillStyle = 'hsl(' + (i * 14) + ',70%,50%)'; g.fillRect(0, 0, 320, 240); g.fillStyle = '#fff'; g.fillRect(i * 10, 90, 60, 60); await sleep(66); }
          rec.stop(); await done; film = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
        }
      } catch (e) { film = null; }
      const markup = film ? src.slice(a, b).replace(/splash-v2\.mp4[^"']*/g, film) : src.slice(a, b);
      f.srcdoc = '<!doctype html><html><head><base href="' + location.href.split('#')[0].replace(/"/g, '&quot;') + '"></head><body>' + markup + '</body></html>';
      document.body.appendChild(f);
      let v = null, loaded = false;
      for (let i = 0; i < 80 && !loaded; i++) {
        await sleep(50);
        const d = f.contentDocument;
        v = v || (d && d.getElementById('splash-vid'));
        if (v && v.readyState >= 2 && v.currentSrc) loaded = true;
      }
      if (!v) throw new Error('setup: the boot script made no #splash-vid in the frame');
      if (!loaded) throw new Error('setup: the intro film never loaded (readyState ' + v.readyState + ', src "' + (v.getAttribute('src') || '') + '") — nothing to release, so this run cannot judge it');
      const was = v.currentSrc;
      const d = f.contentDocument;
      d.dispatchEvent(new f.contentWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));   // his skip: Escape cuts the film
      for (let i = 0; i < 40 && d.getElementById('splash'); i++) await sleep(50);
      if (d.getElementById('splash')) throw new Error('setup: Escape did not take the splash down within 2 s');
      await sleep(50);
      if (v.getAttribute('src') || v.readyState !== 0 || v.networkState !== v.NETWORK_EMPTY) {
        throw new Error('the splash is gone and the intro film still holds ' + was.split('/').pop() + ' (src "' + (v.getAttribute('src') || '') + '", readyState ' + v.readyState +
          ', networkState ' + v.networkState + ') — its decoded frames (163 MB for this film, measured) stay in memory for the whole session');
      }
    } finally {
      f.remove(); try { if (film) URL.revokeObjectURL(film); } catch (e) {}
      try { if (splashed0 === null) sessionStorage.removeItem('fm.splashed'); else sessionStorage.setItem('fm.splashed', splashed0); } catch (e) {}
    }
  });


