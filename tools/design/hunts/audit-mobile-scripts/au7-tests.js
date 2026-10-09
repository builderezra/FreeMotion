  /* ════════ AU7: audit of js/mobile.js (the phone sheets' swipe-down). Append before `async function run()` in tests/tests.js; `?only=AU7` runs them. ════════
     A REAL FINGER CANNOT BE SENT FROM THIS CONTAINER (the driver has no touch emulation on Linux), so each repro comes in two halves:
       · `AU7-n …` drives the SAME handler with pointer events from script, once as a touch-type pointer and once as a mouse (the mouse
         half is a real input path on a narrow desktop window, and the handler treats it the same). These run here.
       · `AU7-nf …` is the real-finger version, through the driver's trusted touch (realInput924). It reports NOT RUN HERE where the
         driver cannot emulate touch, and runs on the laptop's finger pass.
     Neither half is a substitute for the other: a scripted touch-type event skips the browser's own scroll takeover. */
  const au7Open = async function (sleep) {
    const sheet = document.getElementById('add-sheet'), fab = document.getElementById('add-fab');
    if (!sheet || !fab) throw new Error('#add-sheet / #add-fab missing');
    if (sheet.classList.contains('open')) { FM._addSheetClose && FM._addSheetClose(); await sleep(500); }
    fab.click(); await sleep(700);
    if (!sheet.classList.contains('open')) throw new Error('setup: the Add sheet did not open');
    const grab = sheet.querySelector('.sheet-grab'); if (!grab) throw new Error('setup: no .sheet-grab');
    return { sheet: sheet, grab: grab, h: sheet.getBoundingClientRect().height, r: grab.getBoundingClientRect() };
  };
  const au7Ptr = function (grab, kind, id, x, y, b) {
    const o = { bubbles: true, cancelable: true, pointerId: id, pointerType: kind, isPrimary: true, clientX: x, clientY: y, buttons: b, button: 0 };
    return function (t, yy, bb) { (t === 'pointerup' || t === 'pointercancel' ? window : grab).dispatchEvent(new PointerEvent(t, Object.assign({}, o, { clientY: yy, buttons: bb }))); };
  };
  for (const kind of ['touch', 'mouse']) {
    test('AU7-1 ' + kind + ': a quick drag that then rests before the lift does not close the sheet (the flick speed goes stale)', { item: 'AU7', budgetMs: 30000 }, async function () {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
      let o = null;
      try {
        if (hadHome) FM.home.close();
        await atPhoneWidth(async function () {
          // CONTROL 1: a real flick (fast, lifted at once) of a short distance DOES close it
          o = await au7Open(sleep);
          let x = o.r.left + o.r.width / 2, y0 = o.r.top + o.r.height / 2, short = Math.round(o.h * 0.12);
          let pe = au7Ptr(o.grab, kind, 41, x, y0, 1);
          pe('pointerdown', y0, 1); pe('pointermove', y0 + short * 0.4, 1); await sleep(8); pe('pointermove', y0 + short, 1); await sleep(8); pe('pointerup', y0 + short, 0);
          await sleep(700);
          if (o.sheet.classList.contains('open')) throw new Error('CONTROL: a fast flick of ' + short + 'px (' + Math.round(short / 16) + ' px/ms) did not close the sheet, so the rule this test guards is gone');
          // CONTROL 2: the same distance dragged slowly and released still does NOT close it
          o = await au7Open(sleep);
          x = o.r.left + o.r.width / 2; y0 = o.r.top + o.r.height / 2;
          pe = au7Ptr(o.grab, kind, 42, x, y0, 1);
          pe('pointerdown', y0, 1); for (let i = 1; i <= 4; i++) { pe('pointermove', y0 + short * i / 4, 1); await sleep(120); } await sleep(40); pe('pointerup', y0 + short, 0);
          await sleep(600);
          if (!o.sheet.classList.contains('open')) throw new Error('CONTROL: a slow ' + short + 'px drag closed the sheet');
          // THE CASE: fast, then 600 ms with the finger resting, then the lift — nothing is moving as it leaves
          pe = au7Ptr(o.grab, kind, 43, x, y0, 1);
          pe('pointerdown', y0, 1); pe('pointermove', y0 + short * 0.4, 1); await sleep(8); pe('pointermove', y0 + short, 1); await sleep(600); pe('pointerup', y0 + short, 0);
          await sleep(700);
          if (!o.sheet.classList.contains('open')) throw new Error('a ' + short + 'px drag, 600 ms at rest, then the lift closed the sheet: the speed of the last move (' + Math.round(short * 0.6 / 8) + ' px/ms) was read as a flick');
        });
      } finally {
        try { if (o && o.sheet.classList.contains('open') && FM._addSheetClose) FM._addSheetClose(); } catch (e) {}
        if (hadHome && FM.home && FM.home.open) FM.home.open();
        await sleep(80);
      }
    });
    test('AU7-2 ' + kind + ': a press that never gets its lift (a taken finger) does not freeze every later swipe', { item: 'AU7', budgetMs: 30000 }, async function () {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
      let o = null;
      const swipe = async function (id) {
        const x = o.r.left + o.r.width / 2, y0 = o.r.top + o.r.height / 2, drag = Math.round(o.h * 0.55), pe = au7Ptr(o.grab, kind, id, x, y0, 1);
        pe('pointerdown', y0, 1); for (let i = 1; i <= 6; i++) { pe('pointermove', y0 + drag * i / 6, 1); await sleep(30); } pe('pointerup', y0 + drag, 0);
        await sleep(700);
      };
      try {
        if (hadHome) FM.home.close();
        await atPhoneWidth(async function () {
          // CONTROL: an ordinary swipe closes the sheet
          o = await au7Open(sleep); await swipe(51);
          if (o.sheet.classList.contains('open')) throw new Error('CONTROL: an ordinary swipe past a third did not close the sheet');
          // CONTROL: a second finger while the first is still down (recent) is ignored, as designed
          o = await au7Open(sleep);
          const x = o.r.left + o.r.width / 2, y0 = o.r.top + o.r.height / 2;
          au7Ptr(o.grab, kind, 52, x, y0, 1)('pointerdown', y0, 1);   // never lifted
          await swipe(53);
          if (!o.sheet.classList.contains('open')) throw new Error('CONTROL: a second finger put down moments after the first closed the sheet (the guard against a 2nd finger is gone)');
          // THE CASE: that first press is now old and was never lifted; a fresh swipe must work
          await sleep(2300);
          await swipe(54);
          if (o.sheet.classList.contains('open')) throw new Error('2.3 s after a press that never ended, a fresh swipe past a third did not close the sheet: the dead press still owns the handler');
        });
      } finally {
        try { window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 52, pointerType: kind })); } catch (e) {}
        try { if (o && o.sheet.classList.contains('open') && FM._addSheetClose) FM._addSheetClose(); } catch (e) {}
        if (hadHome && FM.home && FM.home.open) FM.home.open();
        await sleep(80);
      }
    });
  }
  test('AU7-1f a REAL finger: a quick drag that rests before the lift does not close the Add sheet', { item: 'AU7', budgetMs: 60000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    needsTouch924();
    const hadHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    let o = null;
    try {
      if (hadHome) FM.home.close();
      await atPhoneWidth(async function () {
        await onScreen924(async function () {
          o = await au7Open(sleep);
          const x = o.r.left + o.r.width / 2, y0 = o.r.top + o.r.height / 2, short = Math.round(o.h * 0.12);
          await realInput924([{ t: 'touchStart', x: x, y: y0, ms: 60 }, { t: 'touchMove', x: x, y: y0 + short * 0.4, ms: 8 }, { t: 'touchMove', x: x, y: y0 + short, ms: 600 }, { t: 'touchEnd', x: x, y: y0 + short, ms: 0 }], 'the quick drag then rest');
          await sleep(700);
          if (!o.sheet.classList.contains('open')) throw new Error('a quick ' + short + 'px drag, 600 ms at rest, then the lift closed the sheet under a real finger');
        });
      });
    } finally {
      try { if (o && o.sheet.classList.contains('open') && FM._addSheetClose) FM._addSheetClose(); } catch (e) {}
      if (hadHome && FM.home && FM.home.open) FM.home.open();
      await sleep(80);
    }
  });
