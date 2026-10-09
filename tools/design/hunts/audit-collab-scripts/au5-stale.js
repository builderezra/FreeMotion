  test('AU5-2 a guest that reloads with a base persisted BEFORE a layer arrived does not hand that layer back after the owner deleted it, and still sends its own offline layer', { item: 'AU5', budgetMs: 90000 }, async function () {
    await withCollab921([layer921('A')], async function (c) {
      const C = c.C;
      const g = c.addGuest({ name: 'G0' });
      const clone = jclone921;
      // 1. the guest persisted its base here (what bridge.persistBase writes 2 s after a batch)
      const persisted = { epoch: g.G.epoch, seq: g.G.bs, cid: g.G.cid, D: clone({ project: g.G.base.project, layers: g.G.base.layers }) };
      // 2. the owner adds Y and Z; both reach the guest (live and base) before the 2 s persist would have fired
      FM.scene.layers.push(layer921('Y', { id: 'au5_Y' }), layer921('Z', { id: 'au5_Z' }));
      FM.history.commit(); g.loop.settle();
      if (!g.doc.layers.some(l => l.id === 'au5_Y') || !g.doc.layers.some(l => l.id === 'au5_Z')) throw new Error('CONTROL: Y and Z never reached the guest');
      // 3. the guest goes away (a reload), having also made a layer of its own that no base has seen; the owner deletes Y meanwhile
      g.doc.layers.push(layer921('mine', { id: 'au5_mine' }));
      g.G.setOnline(false);
      g.loop.partition('g0');
      FM.scene.layers.splice(FM.scene.layers.findIndex(l => l.id === 'au5_Y'), 1);
      FM.history.commit(); g.loop.settle();
      if (FM.scene.layers.some(l => l.id === 'au5_Y')) throw new Error('CONTROL: the owner still has Y');
      // 4. the guest comes back as a NEW session: live = what it autosaved (has Y, Z, mine), base = the stale persisted one
      const A2 = plainAdapter921(g.doc, C.bridge.invariants());
      const loop2 = C.link.LoopLink({ aTag: 'h', bTag: 'g0b', mode: 'manual' });
      c.S.addPeer(loop2.a, { role: 'editor', name: 'G0', color: '#44aaff', mid: g.mid });
      const G2 = C.Session({ adapter: A2, role: 'editor', mid: g.mid, base: clone(persisted.D), epoch: persisted.epoch });
      G2.bs = persisted.seq; G2.cid = persisted.cid;
      const owed = G2.recoverOutbox(persisted);
      G2.setLink(loop2.b);
      loop2.b.send('ctl', G2._helloMsg({ name: 'G0' }));
      G2.tick('full'); loop2.settle(); G2.tick('full'); loop2.settle();
      const count = (arr, id) => arr.filter(l => l.id === id).length;
      if (!owed) throw new Error('CONTROL: recoverOutbox owed nothing, so the stale-base resend is not what ran');
      if (count(FM.scene.layers, 'au5_mine') !== 1) throw new Error('CONTROL: the guest\'s own offline layer reached the owner ' + count(FM.scene.layers, 'au5_mine') + ' times, not once');
      if (count(FM.scene.layers, 'au5_Z') !== 1) throw new Error('CONTROL: Z (nobody removed it) is on the owner ' + count(FM.scene.layers, 'au5_Z') + ' times');
      if (count(FM.scene.layers, 'au5_Y')) throw new Error('the owner deleted Y and the reloaded guest handed it back: the owner has Y again (the guest owed ' + owed + ' ops)');
      if (count(A2.doc().layers, 'au5_Y')) throw new Error('the reloaded guest still shows Y, which the owner deleted');
    });
  });
