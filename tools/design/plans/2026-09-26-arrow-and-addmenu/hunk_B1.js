      const amClamp = (h) => {
        const vh = window.innerHeight;
        /* queue 958 — UP TO THE TOP OF THE WINDOW, WHEREVER THE TIMELINE IS. Ezra, 26 Sep: *"You should be able to drag it
           like up to like the top of the screen, honestly. So it covers up the whole side of the screen. But you know, it, no
           matter where the timeline is."*
           The ceiling this replaces was max(0.62·vh, the TIMELINE's own ceiling): queue 512 tied the two together so the
           menu could never stop lower alone than it could with the timeline, and that tie is his "still bound to how high the
           timeline is" — measured with the real drag, the menu stopped at 576 of an 800px window (top at y=224) at 900 and
           1280 wide, and at 778 of 1080 (y=302) at 1920, identically with the timeline at its min, its default and its max.
           Nothing above it needs protecting on PC: #topbar is display:none there, and Back / ? / notes / settings / Export
           live in the transport row, inside the band the menu rises out of. So it may rise until its HANDLE — which hangs
           above the panel's top edge — reaches the window's top; any higher and the handle is off screen and the menu could
           never be pulled back down. --am-bottom is the gap the band leaves under it (0 in every PC layout measured; read so
           a band that ever sits higher still stops right). Queue 512's rule holds by construction: this is never below the
           timeline's own ceiling (0.72·vh at most). */
        const below = parseInt(root.style.getPropertyValue('--am-bottom'), 10) || 0;
        const ceil = Math.max(200, vh - below - (amRez.offsetHeight || 9));
        return Math.max(amFloor(), Math.min(ceil, h));
      };
