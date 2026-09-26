  /* QUEUE 920 (26 Sep) — HIS BLACK BAR ON THE LIGHT HOME, AND THE FADE THAT COMES AND GOES.
     *"sometimes the top bar instead of it being like when you're on the white mode it going white all the way to the top
     it's got a black bar at the top and like when you go in and out of projects it's like changing constantly"*
     iOS 26's WebKit colours the status-bar strip from the first plain background-color on the FIXED/STICKY element under
     the top centre of the viewport, 4px down (LocalFrameView::fixedContainerEdges) — re-read only when a fixed element is
     added or removed, and never REPLACED by a container the size of the whole viewport (WebKit 8b209a7). Every screen here
     is one of those (#splash, #home-screen, #app mid-push/pop), so the editor's #161a21 stuck on the light Home, and a
     project with nothing fixed at the top got iOS's blur instead. Measured in a real WKWebView (macOS 27) before the fix:
     #161a21 on the light Home after one round trip. #fm-sb-tab is the one ordinary container WebKit now finds on every
     screen. This holds it to the rules WebKit classifies by, at the moments that went wrong — the first frame of a push, the
     middle of it, after it; the same for the pop; a light/dark switch — and holds that every colour change RE-INSERTS it,
     because that removal is the only thing that makes WebKit look again.
     The probe does what WebKit's own hit-test does and Chrome's does not: it ignores pointer-events
     (IgnoreCSSPointerEventsProperty). It does NOT look through clipping — measured in a WKWebView, a clipped tab is never
     read — and, like WebKit, it is not stopped by the tab's mask. Its control hides the tab and must then see #home-screen
     as a full-screen layer — the exact thing that inherits a stale colour — so a pass cannot be vacuous. */
  test('920 the top-edge tab: every screen offers iOS the same short fixed tab at the top centre, in that screen top colour, re-inserted on every switch', { item: '920', budgetMs: 40000 }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const html = document.documentElement, home = document.getElementById('home-screen');
    const C = FM.statusBar && FM.statusBar.colours;
    if (!C) throw new Error('setup: FM.statusBar.colours is missing');
    const rgbOf = h => { const n = parseInt(String(h).slice(1), 16); return 'rgb(' + (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')'; };
    const homeOn = () => !!home && !home.classList.contains('hidden');
    const wasHome = homeOn(), dh = html.getAttribute('data-home');

    /* WebKit's pick for the TOP side, ported from Source/WebCore/page/LocalFrameView.cpp (fixedContainerEdges):
       hit-test (width/2, 4), walk up to the first fixed/sticky box, classify it against the viewport (<90% narrow,
       90–105% same, >105% larger), and take the first visible plain background-color on a box >10px tall and ≥90% wide. */
    function topEdge() {
      const W = innerWidth, H = innerHeight, vpW = W - 8, vpH = H - 8;
      const cmp = (len, vp) => len < vp * 0.9 ? 'S' : len < vp * 1.05 ? 'M' : 'L';
      const st = document.createElement('style');
      st.textContent = '*,*::before,*::after{pointer-events:auto!important}';
      document.head.appendChild(st);
      try {
        const hit = document.elementFromPoint(W / 2, 4);
        let colour = null;
        for (let el = hit; el && el.nodeType === 1; el = el.parentElement) {
          const cs = getComputedStyle(el), r = el.getBoundingClientRect(), bg = cs.backgroundColor;
          const visibleBg = bg && bg !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(bg);
          if (!colour && visibleBg && r.width >= vpW * 0.9 && r.height > 10 && cs.visibility === 'visible' && +cs.opacity >= 0.1) colour = bg;
          if (cs.position === 'fixed' || cs.position === 'sticky') {
            const side = cmp(r.width, vpW), adj = cmp(r.height, vpH);
            const kind = side === 'S' ? 'too narrow' : (side === 'M' && adj === 'M') ? 'full-screen' : adj === 'L' ? 'too tall' : 'bar';
            return { id: el.id || String(el.className || el.tagName), kind: kind, colour: colour, hit: hit.id || String(hit.className || hit.tagName) };
          }
        }
        return { id: null, kind: 'none', colour: colour, hit: hit ? (hit.id || String(hit.className || hit.tagName)) : null };
      } finally { st.remove(); }
    }
    function mustBeTab(want, where) {
      const e = topEdge();
      if (e.id !== 'fm-sb-tab') {
        throw new Error(where + ': iOS\'s top-centre sample lands on ' + (e.id ? '#' + e.id + ' (' + e.kind + ')' : 'nothing fixed') + ', hit ' + e.hit + ' — '
          + (e.kind === 'full-screen' ? 'a full-screen layer never replaces the colour it inherited: the black bar on the light Home' : 'with nothing fixed at the top iOS draws its blur: the fade'));
      }
      if (e.kind !== 'bar') throw new Error(where + ': WebKit would read the tab as ' + e.kind + ' — only a short full-width bar has its colour re-read every time');
      if (e.colour !== rgbOf(want)) throw new Error(where + ': the tab offers ' + e.colour + ', not this screen\'s top colour ' + rgbOf(want));
    }
    async function settle(what) {   // until the push/pop is over: Home shown/hidden as asked, no push or pop classes left
      for (let i = 0; i < 60; i++) {
        const b = document.body.classList;
        if (!b.contains('fm-pushing') && !b.contains('fm-popping') && homeOn() === (what === 'home')) return;
        await sleep(50);
      }
      throw new Error('setup: the ' + (what === 'home' ? 'pop back to Home' : 'push into the project') + ' never finished');
    }

    await atPhoneWidth(async function () {
      const tab = document.getElementById('fm-sb-tab');
      let kicks = [];
      const mo = new MutationObserver(recs => recs.forEach(r => {
        if (r.type === 'attributes' && /display:\s*none/.test(r.oldValue || '')) kicks.push(((r.oldValue.match(/--sb:\s*([^;]+)/) || [])[1] || '').trim());
        if (r.type === 'childList') [].forEach.call(r.removedNodes, n => { if (n.id === 'fm-sb-tab') kicks.push((n.style.getPropertyValue('--sb') || '').trim()); });
      }));
      const kickedWith = (want, where) => {
        if (!kicks.some(k => k.toLowerCase() === want.toLowerCase())) throw new Error(where + ': the tab took ' + want + ' but was never re-inserted with it (re-inserts seen: [' + kicks.join(', ') + ']) — WebKit re-reads the top only when a fixed element comes or goes, so the colour would stay stale');
        kicks = [];
      };
      try {
        for (let i = 0; i < 100 && document.getElementById('splash'); i++) await sleep(100);   // the intro (z 10000) is above everything until boot removes it
        if (document.getElementById('splash')) throw new Error('setup: the intro never left, and it covers the top centre');
        html.classList.remove('splash-on', 'splash-on-light');
        html.setAttribute('data-home', 'light');
        if (!homeOn()) { FM.home.open(); }
        await settle('home'); await sleep(150);

        // CONTROL — without the tab, the probe must see what WebKit saw before the fix: Home as a full-screen layer.
        if (tab) tab.style.setProperty('display', 'none', 'important');
        const bare = topEdge();
        if (tab) tab.style.removeProperty('display');
        if (bare.id !== 'home-screen' || bare.kind !== 'full-screen') throw new Error('control: with the tab gone the probe finds ' + bare.id + ' (' + bare.kind + '), not #home-screen as a full-screen layer — it cannot tell the fix from the bug');
        if (!tab) throw new Error('there is no #fm-sb-tab — iOS samples #home-screen, a full-screen layer, which keeps whatever colour came before it (the editor\'s #161a21 after a project, the intro\'s #111 after launch): the black bar on the light Home');
        mo.observe(tab, { attributes: true, attributeFilter: ['style'], attributeOldValue: true });
        mo.observe(document.body, { childList: true });

        // It paints nothing (masked to transparent — a mask is the kind of invisible WebKit still reads), and it takes no taps.
        const tcs = getComputedStyle(tab), mask = tcs.maskImage || tcs.webkitMaskImage || '';
        const maskCols = mask.match(/rgba?\([^)]*\)/g) || [];
        if (!/gradient/.test(mask) || !maskCols.length || maskCols.some(c => !/,\s*0\)$/.test(c))) throw new Error('the tab is not masked to nothing (mask-image: ' + mask + ') — it would paint a 12px band of colour across the top of every screen');
        if (tcs.pointerEvents !== 'none') throw new Error('the tab takes taps (pointer-events ' + tcs.pointerEvents + ') — the top 12px of every screen would go dead');
        const under = document.elementFromPoint(innerWidth / 2, 4);
        if (!under || tab.contains(under)) throw new Error('a tap at the top centre lands on the tab, not on the screen');
        // …and the kick detector sees a kick (positive control for the re-insert checks below).
        kicks = []; FM.statusBar.kick(); await sleep(0);
        if (!kicks.length) throw new Error('control: FM.statusBar.kick() re-inserted nothing the observer could see');
        kicks = [];

        mustBeTab(C.homeLight, 'light Home');

        FM.home.close({ push: true }); await sleep(0);
        mustBeTab(C.editor, 'first frame of the push into a project');
        kickedWith(C.editor, 'into a project');   // checked at the FIRST frame: the 700ms late kick cannot have fired yet, so only the immediate re-insert can pass this
        await sleep(160);
        mustBeTab(C.editor, 'middle of the push (the editor is a full-screen fixed layer now)');
        await settle('project'); await sleep(100);
        mustBeTab(C.editor, 'in the project after the push');

        FM.home.open(); await sleep(0);
        mustBeTab(C.homeLight, 'first frame of the pop back to the light Home (the editor is still on top of it)');
        kickedWith(C.homeLight, 'back to the light Home');
        await sleep(160);
        mustBeTab(C.homeLight, 'middle of the pop');
        await settle('home'); await sleep(100);
        mustBeTab(C.homeLight, 'back on the light Home');

        html.setAttribute('data-home', 'dark'); await sleep(60);
        mustBeTab(C.homeDark, 'dark Home');
        kickedWith(C.homeDark, 'light → dark');
        FM.home.close({ push: true }); await settle('project'); await sleep(100);
        mustBeTab(C.editor, 'project, entered from the dark Home');
        FM.home.open(); await settle('home'); await sleep(100);
        mustBeTab(C.homeDark, 'back on the dark Home');
        html.setAttribute('data-home', 'light'); await sleep(60);
        mustBeTab(C.homeLight, 'dark → light, on Home');
        kickedWith(C.homeLight, 'dark → light');
      } finally {
        mo.disconnect();
        html.setAttribute('data-home', dh || 'light');
        if (wasHome && !homeOn()) FM.home.open();
        if (!wasHome && homeOn()) FM.home.close();
        await sleep(200);
      }
    }, 440);
  });
