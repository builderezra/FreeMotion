  test('a still photo gets the "this layer never moves" badge that a shape already got (queue 863)', { item: '863', budgetMs: 30000 }, async function () {
    /* Found while answering his question "how confident are you that every effect is actually good?" — by
       asking the RUNNING app, effect by effect, whether it warns when one cannot work. On a shape that is
       never animated, Motion Blur (Object) is badged "This layer never moves, so there is no movement to
       smear". On a PHOTOGRAPH in the identical situation it said nothing, because the rule read "shape or
       text, otherwise it moves by itself" — true of video, whose picture changes frame to frame, and false
       of a still image, which is as still as a rectangle. A photo is the commonest layer in the app, so
       this is the exact shape of every "I added it and nothing happened". */
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    if (!FM._fxDeadHereWhy) throw new Error('the effect browser’s dead-here badge cannot be observed');
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (hadHome) FM.home.close();
    const savedLayers = FM.scene.layers.slice(), sel0 = FM.scene.selectedId;
    const mid = '_q863';
    try {
      const S = 64, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
      const g = cv.getContext('2d'); g.fillStyle = '#7ab'; g.fillRect(0, 0, S, S);
      FM.media.set(mid, { kind: 'image', el: cv, width: S, height: S, duration: 0 });
      if (FM.media.pin) FM.media.pin(mid);
      const img = FM.makeLayer('image', { x: 300, y: 300, start: 0, duration: 4 });
      img.id = mid;
      FM.scene.layers.push(img);
      FM.timeline.rebuild(); FM.selectLayer(img.id); FM.refreshAll(); await sleep(140);

      for (const id of ['motionflow', 'objectblur']) {
        const why = FM._fxDeadHereWhy(id);
        if (!why) throw new Error('#' + id + ' on a still photograph gives no warning at all — you add it, nothing happens, and the app says nothing. The same effect on a never-animated SHAPE is badged.');
        if (!/move/i.test(why)) throw new Error('the badge on ' + id + ' says "' + why + '", which does not name the reason');
      }

      /* CONTROL 1 — ANIMATE IT AND THE BADGE MUST GO. A badge that always fires tells him nothing, which
         is the fault the queue-603 control was written for. */
      img.transform.x = { kf: [{ t: 0, v: 300, e: 'linear' }, { t: 2, v: 800, e: 'linear' }] };
      FM.refreshAll(); await sleep(120);
      for (const id of ['motionflow', 'objectblur']) {
        if (FM._fxDeadHereWhy(id)) throw new Error('#' + id + ' is still badged "never moves" on a photograph that IS animated — the badge now lies in the other direction');
      }

      /* CONTROL 2 — A VIDEO IS NOT STILL. Its picture changes frame to frame whether or not the layer is
         animated, which is the whole reason that line excluded it. */
      const fake = FM.makeLayer('shape', { shape: 'rect', x: 100, y: 100, shapeW: 40, shapeH: 40, fill: '#fff', start: 0, duration: 4 });
      fake.type = 'video';
      FM.scene.layers.push(fake); FM.timeline.rebuild(); FM.selectLayer(fake.id); FM.refreshAll(); await sleep(120);
      if (FM._fxDeadHereWhy('motionflow')) throw new Error('control: a VIDEO layer is badged "nothing moves inside this layer" — its picture changes frame to frame, which is exactly why the rule excluded it');
    } finally {
      try { if (FM.media.remove) FM.media.remove(mid); } catch (e) {}
      FM.scene.layers.length = 0; savedLayers.forEach(l => FM.scene.layers.push(l));
      FM.selectLayer(sel0 || null); FM.timeline.rebuild(); FM.refreshAll(); await sleep(80);
      if (hadHome && FM.home && FM.home.open) FM.home.open();
    }
  });
