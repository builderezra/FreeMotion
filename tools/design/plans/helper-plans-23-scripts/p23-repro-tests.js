  /* ═══ P23 #1093: a picture a peer sends has no pixel limit ═══ */
  async function pixelBomb23(w, h, name) {
    // a valid PNG, w x h, all-transparent black: a handful of KB on the wire, w*h*4 bytes once decoded
    const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); crcT[n] = c >>> 0; }
    const crc = u8 => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = crcT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const be = n => new Uint8Array([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
    const chunk = (type, data) => { const t = new TextEncoder().encode(type), body = new Uint8Array(t.length + data.length); body.set(t); body.set(data, t.length); return [be(data.length), body, be(crc(body))]; };
    const ihdr = new Uint8Array(13); ihdr.set(be(w), 0); ihdr.set(be(h), 4); ihdr[8] = 8; ihdr[9] = 6;
    const row = new Uint8Array(1 + w * 4);
    const raw = new ReadableStream({ pull(ctl) { if (this.n === undefined) this.n = 0; if (this.n++ >= h) { ctl.close(); return; } ctl.enqueue(row); } });
    const z = new Uint8Array(await new Response(raw.pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
    const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])].concat(chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', new Uint8Array(0)));
    return new File(parts, name || 'bomb.png', { type: 'image/png', lastModified: 1600000005000 });
  }

  test('P23 #1093 a picture a peer sends over 50 megapixels is skipped and never stored, a normal one still lands', { item: '1093', budgetMs: 240000 }, async function () {
    const C = need921S4('the media transfer');
    await withCollabGuest921([mediaLayer921('Ok', 'image'), mediaLayer921('Bomb', 'image')], async function (c) {
      const ok = await q921png([30, 140, 250], 'ok.png');
      const bomb = await pixelBomb23(7600, 7600, 'bomb.png');                       // 57.8 MP
      if (bomb.size > 400 * 1024) throw new Error('CONTROL: the pixel bomb is ' + bomb.size + ' bytes, it should be tiny so the byte gate cannot be what stops it');
      c.peer.add(ok, 'image', [[c.ids[0], 0]]);
      c.peer.add(bomb, 'image', [[c.ids[1], 0]]);
      c.peer.announce('mf');
      const st = await until921('both files to be dealt with', async function () {
        const s = C.media.state(c.G);
        return (s && (s.done + s.failed) >= 2 && !C.media.pending(c.G).n) ? s : null;
      }, 200000);
      const rOk = await FM.storage.readMedia(c.ids[0]);
      if (!rOk || !rOk.file) throw new Error('CONTROL: the ordinary picture did not land on this device');
      const rBomb = await FM.storage.readMedia(c.ids[1]);
      if (rBomb && rBomb.file) throw new Error('the ' + bomb.size + '-byte, 57.8 MP picture a peer sent was written to this device (' + rBomb.file.size + ' bytes) and is decoded again on every open');
      const m = FM.media.get(c.ids[1]);
      if (m && m.width > 7000) throw new Error('the 57.8 MP picture is held in memory as a ' + m.width + ' x ' + m.height + ' record');
      if (st.failed !== 1) throw new Error('the card should name exactly one skipped file, it says ' + st.failed);
    });
  });

  /* ═══ P23 #1092: the privacy text names the wrong device and leaves out the refused guest ═══ */
  test('P23 #1092 the full privacy list says the OWNER’s internet address is seen by whoever tries to join, even someone he turns away', { item: '1092', budgetMs: 60000 }, async function () {
    const U = FM.collab && FM.collab.ui;
    if (!U || typeof U.privacyBlock !== 'function') throw new Error('FM.collab.ui.privacyBlock is not reachable, the seam this test needs is gone');
    const box = U.privacyBlock(); document.body.appendChild(box);
    try {
      const items = Array.prototype.map.call(box.querySelectorAll('.cs-privfull li'), li => li.textContent);
      if (items.length !== 5) throw new Error('CONTROL: the full list has ' + items.length + ' lines, not 5, so this test is reading the wrong block');
      const line = items.filter(t => /link or short code/.test(t))[0];
      if (!line) throw new Error('CONTROL: no line about the link or short code');
      if (/of each device that joins/.test(line)) throw new Error('the line still says the link holder sees the address "of each device that joins" — all guest traffic goes through the owner, so what is exposed is the OWNER’s address: “' + line + '”');
      if (!/your internet address/.test(line) || !/try to join/.test(line) || !/(do not|don.t) let them in/.test(line)) throw new Error('the line must say your internet address is seen when they TRY to join, even if you do not let them in: “' + line + '”');
    } finally { box.remove(); }
  });

  /* ═══ P23 #1090: the owner's private Notes pad (text and reminders) must not travel to guests ═══ */
  test('P23 #1090 the Notes pad stays on the owner’s device: not in what a guest is sent, and a peer that sends a notes edit is refused', { item: '1090', budgetMs: 60000 }, function () {
    const C = FM.collab;
    if (!C || !C.bridge || typeof C.bridge.view !== 'function' || !C.Host || typeof C.Host.validOp !== 'function') throw new Error('the collab bridge or Host.validOp is not reachable, the seam this test needs is gone');
    const P = FM.scene.project, had = Object.prototype.hasOwnProperty.call(P, 'notes'), old = P.notes;
    try {
      P.notes = [{ id: 'n1', text: 'quote the client 4,200', done: false, remind: true }];
      const v = C.bridge.view().project;
      if (v.name !== P.name && !('name' in v)) throw new Error('CONTROL: the shared view lost the project name too, so this test is not reading the share view');
      if ('notes' in v) throw new Error('the view a guest is built from carries the owner’s Notes pad: ' + JSON.stringify(v.notes));
      // the host: an editor that sends a write to a private key (an older build, or a hostile one) is refused
      const w = C.Host.validOp({ o: 's', p: ['P', 'notes'], v: [] });
      if (w !== 'private') throw new Error('Host.validOp let a write to project.notes through (returned ' + JSON.stringify(w) + ')');
      const ok = C.Host.validOp({ o: 's', p: ['P', 'name'], v: 'x' });
      if (ok !== null) throw new Error('CONTROL: an ordinary project-name write is refused (' + JSON.stringify(ok) + ')');
    } finally { if (had) P.notes = old; else delete P.notes; }
  });

  /* ═══ P23 #1091: "Viewer: can only watch" must be true — no copy on Leave when exporting is off ═══ */
  test('P23 #1091 a Viewer or Commenter whose owner turned exporting off cannot leave with a copy, and every other case still can', { item: '1091', budgetMs: 120000 }, async function () {
    const C = need921S4('the session');
    await withCollabGuest921([mediaLayer921('Pic', 'image')], async function (c) {
      const setCard = function (role, ro) {
        const idx = FM.projects.list(), card = idx.find(function (p) { return p.id === c.pid; });
        if (!card) throw new Error('setup: the guest project has no card');
        card.collab = { v: 1, sid: c.sid, role: role, roExport: ro, hostName: 'Host', hostColor: '#888888', mid: 'g' };
        FM.projects.saveIndex(idx); c.G.role = role;
      };
      const has = function () { const k = FM.projects.list().find(function (p) { return p.id === c.pid; }); return k ? !!k.collab : null; };
      const can = function () { return FM.projects.canKeepLinked ? FM.projects.canKeepLinked(c.pid) : undefined; };
      // CONTROLS first: the same helper says yes for an editor with export off, and for a viewer with export on or never heard
      setCard('editor', false); if (can() === false) throw new Error('CONTROL: an editor with export off is told he cannot keep a copy');
      setCard('viewer', true); if (can() === false) throw new Error('CONTROL: a viewer with export ON is told he cannot keep a copy');
      setCard('viewer', undefined); if (can() === false) throw new Error('CONTROL: a viewer whose card never heard the setting is told he cannot keep a copy');
      // the owner's switch reaches the card: a `settings` message with roExport false is written onto the linked card (that is how
      // Home, which has no session, knows)
      setCard('viewer', true);
      c.loop.a.send('ctl', { t: 'settings', s: { roExport: false, editorsInvite: false } });
      await until921('the card to hear that exporting is off', async function () { const k = FM.projects.list().find(function (p) { return p.id === c.pid; }); return k && k.collab && k.collab.roExport === false ? true : null; }, 8000);
      for (const role of ['viewer', 'commenter']) {
        setCard(role, false);
        const got = await C.leave({ keep: true });
        if (got) { try { await FM.projects.remove(got); } catch (e) {} throw new Error(role + ' with export off left WITH a copy: new project ' + got); }
        if (can() !== false) throw new Error(role + ' with export off: canKeepLinked does not say he may not (' + can() + ')');
        if (has() !== true) throw new Error(role + ' with export off: the linked card was detached or deleted by a refused keep (collab is ' + has() + ')');
        if (c.G.ended || c.G.active === false) throw new Error(role + ': a refused keep still stopped the session, nothing should have been taken from him');
      }
      // CONTROL: the same viewer with export ON keeps a copy of his own (a new, unlinked project)
      setCard('viewer', true);
      const nid = await C.leave({ keep: true });
      try {
        if (!nid) throw new Error('CONTROL: a viewer with export ON could not keep a copy (the keep branch is broken, not refused)');
        const k = FM.projects.list().find(function (p) { return p.id === nid; });
        if (!k || k.collab) throw new Error('CONTROL: the kept copy is missing or still linked');
      } finally { if (nid) { try { await FM.projects.remove(nid); } catch (e) {} } }
    });
  });

