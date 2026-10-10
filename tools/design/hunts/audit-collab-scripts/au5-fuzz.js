  /* ════════ AU5: the REAL collab Session over a fake wire (LoopLink, never a socket). `?only=AU5` runs these. ════════ */
  test('AU5-1 lost edits, stale overwrites and duplicate layers: an owner and two real guests, cuts and heals mid-edit, 6 seeds of 100 rounds', { item: 'AU5', budgetMs: 600000 }, async function () {
    // A semantic check the convergence fuzz (a MODEL of a guest) does not make: every layer somebody added and
    // nobody deleted exists exactly ONCE everywhere, and a value only ONE person writes ends as that person's last write.
    const seeds = [100, 107, 114, 121, 128, 135];
    const problems = [];
    let totalCuts = 0, totalOffline = 0;
    for (const seed of seeds) {
      await withCollab921([layer921('base0'), layer921('base1')], async function (c) {
        const R = rng921(seed);
        const g = [c.addGuest({ name: 'G0' }), c.addGuest({ name: 'G1' })];
        const docs = [null, g[0].doc, g[1].doc];                 // actor 0 = the owner (the real scene)
        const exp = {};                                           // id -> { actor, deleted, name }
        let n = 0, cuts = 0, offlineAdds = 0;
        const layersOf = (a) => a === 0 ? FM.scene.layers : docs[a].layers;
        // the pump must go round until every loop is empty: a batch one loop delivers is queued on ANOTHER loop
        const settle = () => { for (let k = 0; k < 30; k++) { g.forEach(x => x.loop.settle(400)); if (!g.some(x => x.loop.pending())) break; } };
        // the owner's tick matters: it is what serves a catch-up the budget put off (a guest that reconnects often)
        const tickAll = () => { c.S.tick('full'); g.forEach(x => x.G.tick('full')); FM.history.commit(); settle(); };
        const cut = [false, false];
        for (let round = 0; round < 100; round++) {
          const a = Math.floor(R() * 3);
          const mine = Object.keys(exp).filter(id => exp[id].actor === a && !exp[id].deleted);
          const r = R();
          if (r < 0.4 || !mine.length) {
            const id = 'au5_' + a + '_' + (++n);
            layersOf(a).push(layer921('L' + n, { id: id }));
            if (a > 0 && cut[a - 1]) offlineAdds++;
            exp[id] = { actor: a, deleted: false, name: 'L' + n };
          } else if (r < 0.8) {
            const id = mine[Math.floor(R() * mine.length)];
            const L = layersOf(a).filter(x => x.id === id)[0];
            if (L) { L.name = 'v' + (++n); exp[id].name = L.name; }
          } else {
            const id = mine[Math.floor(R() * mine.length)];
            const arr = layersOf(a), i = arr.findIndex(x => x.id === id);
            if (i >= 0) { arr.splice(i, 1); exp[id].deleted = true; }
          }
          if (a === 0) FM.history.commit(); else g[a - 1].G.tick('full');
          if (R() < 0.5) settle();
          if (R() < 0.15) { const k = Math.floor(R() * 2); if (!cut[k]) { g[k].loop.partition('g' + k); cut[k] = true; cuts++; } }
          if (R() < 0.25) { const k = Math.floor(R() * 2); if (cut[k]) { g[k].loop.heal('g' + k); cut[k] = false; } }
        }
        for (let k = 0; k < 2; k++) if (cut[k]) { g[k].loop.heal('g' + k); cut[k] = false; }
        const sig = () => [FM.scene.layers, g[0].doc.layers, g[1].doc.layers].map(arr => arr.map(l => l.id + '|' + l.name).sort().join(','));
        for (let i = 0; i < 60; i++) { tickAll(); const [o, a1, a2] = sig(); if (o === a1 && o === a2 && i > 3) break; await new Promise(r => setTimeout(r, 150)); }
        totalCuts += cuts; totalOffline += offlineAdds;
        const norm = (arr) => arr.map(l => l.id + '|' + l.name).sort().join(',');
        const ref = norm(FM.scene.layers);
        g.forEach((x, k) => { if (norm(x.doc.layers) !== ref) problems.push('seed ' + seed + ': guest ' + k + ' differs from the owner'); });
        Object.keys(exp).forEach(id => {
          const e = exp[id];
          [['owner', FM.scene.layers], ['g0', g[0].doc.layers], ['g1', g[1].doc.layers]].forEach(([who, arr]) => {
            const hits = arr.filter(l => l.id === id);
            if (e.deleted && hits.length) problems.push('seed ' + seed + ': ' + id + ' was deleted by its author and is back on ' + who);
            if (!e.deleted && hits.length !== 1) problems.push('seed ' + seed + ': ' + id + ' (added by actor ' + e.actor + ') is on ' + who + ' ' + hits.length + ' times');
            if (!e.deleted && hits.length === 1 && hits[0].name !== e.name) problems.push('seed ' + seed + ': ' + id + ' on ' + who + ' is named "' + hits[0].name + '", its author last wrote "' + e.name + '"');
          });
        });
      });
    }
    if (totalCuts < 6 || totalOffline < 6) problems.push('CONTROL: the runs cut a link only ' + totalCuts + ' times and added only ' + totalOffline + ' layers while cut, too few to mean anything');
    if (problems.length) throw new Error(problems.length + ' problems; first: ' + problems.slice(0, 4).join(' | '));
  });
