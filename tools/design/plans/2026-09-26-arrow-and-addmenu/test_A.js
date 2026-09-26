  /* ═══ QUEUE 957 — THE ARROW'S TIP LANDS INSIDE THE + ══════════════════════════════════════════════════════════════
     Ezra, 26 Sep, on his phone at v17.02 (dictated): *"The hour [arrow] is inside of the plus button"*.
     home-arrow.js aims the tip at the +'s centre + (radius + 12) px, reading the + from getBoundingClientRect() at the
     moment it draws — and on the first open that moment falls inside the +'s OWN ENTRANCE (hm-rise-fab: held at
     translateY(18px) scale(.86) through its animation-delay, then rising). So the arrow is aimed at a + that is 18px low
     and 14% small, and the + then rises up into the tip. Reproduced here the way both launch roads reach it: the + is
     stamped with the exact classes stampIntro() gives it, and Home re-renders its EMPTY Projects tab, which calls
     arrowSoon() -> FM.homeArrow.draw() two frames later, inside the +'s delay. Measured on HEAD (tools/shot.py, a real
     first launch in a 440x956 phone frame): see plan — the tip ends ~25px from the centre of a 29px-radius +.
     CONTROL first: the same arrow drawn with the + at rest must land exactly where the code aims it — proves the tip is
     read correctly, so a red below is the timing, not the measuring. */
  test('the arrow to the + ends outside the + even when Home opens with the + still rising in (queue 957)', { item: '957', budgetMs: 60000 }, async function () {
    if (!FM.homeArrow || !FM.home || !FM.projects) throw new Error('need FM.homeArrow, FM.home and FM.projects');
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const U = [Math.cos(-52 * Math.PI / 180), Math.sin(-52 * Math.PI / 180)];
    const tip = () => {            // the main stroke's centre-line is the FIRST mask path; its last point is the tip E
      const mp = document.querySelector('#hm-arrow936 mask path');
      if (!mp) return null;
      const n = mp.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      return [n[n.length - 2], n[n.length - 1]];
    };
    const plus = () => { const p = document.getElementById('hm-new').getBoundingClientRect(); return { cx: p.left + p.width / 2, cy: p.top + p.height / 2, r: p.width / 2 }; };
    const finiteAnims = el => el.getAnimations().filter(a => { const t = a.effect.getComputedTiming(); return isFinite(t.endTime) && a.playState !== 'finished' && a.playState !== 'idle'; });
    const home = document.getElementById('home-screen'), fab = document.getElementById('hm-new');
    if (!home || !fab) throw new Error('need #home-screen and #hm-new');
    const hadHome = FM.home.isOpen(), list0 = FM.projects.list, look0 = document.documentElement.getAttribute('data-home');
    const rows = [];
    const oneCase = async (label) => {
      FM.home.refresh(); await wait(700);             // the empty Projects tab, settled: no entrance on the +
      if (!document.querySelector('#home-screen .hm-grid .hm-empty-title')) throw new Error(label + ': the Projects tab is not showing its empty state');
      if (finiteAnims(fab).length) throw new Error(label + ': the + is still animating before the case starts');
      // CONTROL — drawn with the + at rest, the tip is exactly radius + 12 from the centre, up and to the right
      FM.homeArrow.draw({ still: true });
      const P0 = plus(), E0 = tip();
      if (!E0) throw new Error(label + ': control: no arrow was drawn at rest (is the frame tall enough for the swoop?)');
      const d0 = Math.hypot(E0[0] - P0.cx, E0[1] - P0.cy);
      if (Math.abs(d0 - (P0.r + 12)) > 1) throw new Error(label + ': control: at rest the tip is ' + d0.toFixed(1) + 'px from the +\'s centre, the code aims at ' + (P0.r + 12).toFixed(1) + ' — the tip is not being read right');
      // HIS CONDITION — the + stamped exactly as stampIntro() stamps it on a first open, then Home renders the empty tab
      home.classList.add('hm-intro');
      fab.classList.add('hm-in-fab');
      fab.style.animationDelay = '0.545s';           // 0.05 + 9 x 0.055: brand, search, Select, cog, 4 tabs, the empty state
      FM.home.refresh();
      if (!finiteAnims(fab).length) throw new Error(label + ': control: the +\'s entrance did not start, so this case is not his');
      for (let i = 0; i < 60 && (finiteAnims(fab).length || !tip()); i++) await wait(100);   // the + lands; the arrow is there
      await wait(1500);                              // …and the draw-on (1.27s) has finished
      const P = plus(), E = tip();
      if (!E) throw new Error(label + ': no arrow at all once the + had landed — the empty Projects tab must still point at the +');
      const d = Math.hypot(E[0] - P.cx, E[1] - P.cy);
      const want = [P.cx + U[0] * (P.r + 12), P.cy + U[1] * (P.r + 12)], off = Math.hypot(E[0] - want[0], E[1] - want[1]);
      rows.push(label + ' ' + d.toFixed(1) + '/' + (P.r + 12).toFixed(1));
      if (d < P.r + 4) throw new Error(label + ': the arrow\'s tip is ' + d.toFixed(1) + 'px from the centre of a ' + P.r.toFixed(1) + 'px-radius + — INSIDE it (his "the arrow is inside of the plus button"). It was aimed while the + was still rising in.');
      if (off > 2) throw new Error(label + ': the tip is ' + off.toFixed(1) + 'px from where it is aimed (radius + 12 at -52°) — ' + d.toFixed(1) + 'px from the centre, wanted ' + (P.r + 12).toFixed(1));
      home.classList.remove('hm-intro'); fab.classList.remove('hm-in-fab'); fab.style.animationDelay = '';
    };
    try {
      FM.projects.list = () => [];                   // an EMPTY Projects tab without touching the suite's own project
      if (!hadHome) FM.home.open();
      await wait(2200);                              // past stripIntro's 2 s timer, in case this open ran the first-open entrance itself
      const pt = home.querySelector('.hm-tab[data-tab="projects"]');
      if (pt && !pt.classList.contains('active')) { pt.click(); await wait(700); }
      for (const w of [440, 380]) {
        await atPhoneWidth(async () => {
          for (const look of ['light', 'dark']) {
            document.documentElement.setAttribute('data-home', look);
            await oneCase(w + ' ' + look);
          }
        }, w);
      }
    } finally {
      home.classList.remove('hm-intro'); fab.classList.remove('hm-in-fab'); fab.style.animationDelay = '';
      FM.projects.list = list0;
      if (look0 == null) document.documentElement.removeAttribute('data-home'); else document.documentElement.setAttribute('data-home', look0);
      FM.homeArrow.clear();
      FM.home.refresh();
      if (!hadHome) FM.home.close();
      await wait(100);
    }
  });
