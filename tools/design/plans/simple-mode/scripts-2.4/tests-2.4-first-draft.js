  /* ═══ SIMPLE MODE, RELEASE 2.4: riders, couplings and crossfades (BUILD-PLAN-PHASE2.md §6; DESIGN §3.1, §3.5, §3.10, §4.1, §13 #24) ═══
     Each test fails on the 2.3 tree by what it does: 2.1 to 2.3 refuse these cases with a "comes along in the next update" line. */
  function smCap(name, start, dur, cues, W, H, o) {
    const l = FM.makeLayer('text', { name: name, text: '', x: W / 2, y: H * 0.8, start: start, duration: dur });
    l.captions = cues.map(c => ({ start: c[0], end: c[1], text: c[2] || 'x' }));
    return Object.assign(l, o || {});
  }
  const smCam = (kf, o, ez) => { const c = FM.makeLayer('camera', Object.assign({ name: 'Cam', start: 0, duration: 12 }, o || {})); c.transform.scale = smKf(kf); if (ez) c.transform.scale.kf[ez.i].bez = ez.bez; return c; };
  const smAbs = t => FM.captions.cues(t).map(c => [+((+c.start) + (+t.start || 0)).toFixed(3), +((+c.end) + (+t.start || 0)).toFixed(3)]);
  const smSayBtn = async (v, label) => { await v.sleep(450); const b = Array.from(document.querySelectorAll('#sm-say .sm-say-b')).filter(x => x.textContent.trim() === label)[0]; if (!b) throw new Error('no "' + label + '" button in the line: “' + v.say() + '”'); b.click(); await v.idle(); };
  const smSame = (a, b, tol) => a.length === b.length && a.every((p, i) => Math.abs(p[0] - b[i][0]) <= tol && Math.abs(p[1] - b[i][1]) <= tol);
  const smThree = (W, H, extra) => (extra || []).concat([smV('C', 8, 4, W, H), smV('B', 4, 4, W, H), smV('A', 0, 4, W, H)]);
  const smCues = [[0.5, 3.5], [3.8, 4.6], [5, 7], [7.5, 8.5], [9, 11]];

  test('simple P2.4 · T4 Delete of the middle clip maps both ends of every cue through one map: outside parts join, a cue wholly inside the cut is dropped and COUNTED, the window follows the new end', { item: '980', budgetMs: 60000 }, async function () {
    smNeedP2();
    await smP2((W, H) => smThree(W, H, [smCap('Caps', 0, 12, smCues, W, H)]), async function (v) {
      const Caps = v.L('Caps'), B = v.L('B'), n0 = v.steps();
      FM.spine.cmd.del(B.id); await v.idle();
      if (v.L('B')) throw new Error('B was not deleted: “' + v.say() + '”');
      const got = smAbs(Caps), want = [[0.5, 3.5], [3.8, 4], [4, 4.5], [5, 7]];
      if (!smSame(got, want, 1e-6)) throw new Error('the cues after deleting [4, 8) are ' + JSON.stringify(got) + ', want ' + JSON.stringify(want) + ' (it said “' + v.say() + '”)');
      if (Math.abs(Caps.start) > 1e-9 || Math.abs(Caps.duration - 8) > 1e-6) throw new Error('the track window is [' + Caps.start + ', ' + (Caps.start + Caps.duration) + '], want [0, 8]');
      if (!/1 caption too short to keep/.test(v.say())) throw new Error('the line does not count the dropped cue: “' + v.say() + '”');
      if (v.steps() !== n0 + 1) throw new Error('Delete took ' + (v.steps() - n0) + ' undo steps, not 1');
      FM.history.undo(); await v.sleep(40);
      if (!smSame(smAbs(v.L('Caps')), smCues, 1e-6)) throw new Error('Undo did not bring the cues back: ' + JSON.stringify(smAbs(v.L('Caps'))));
    });
  });
  test('simple P2.4 · T4 Insert splits a cue that straddles the seam (its halves meet the new clips’ edges), Speed scales cues about the clip, and the window follows each', { item: '980', budgetMs: 90000 }, async function () {
    smNeedP2();
    const file = await smPng('#00ff00');
    await smP2((W, H) => smThree(W, H, [smCap('Caps', 0, 12, smCues, W, H)]), async function (v) {
      const Caps = v.L('Caps'), B = v.L('B');
      const R = FM.spine.classify(FM.scene), j = R.main.findIndex(e => e.id === B.id);
      await FM.spine.cmd.insert([file], j); await v.idle();
      const img = FM.scene.layers.find(l => l.type === 'image'); if (!img) throw new Error('nothing was inserted: “' + v.say() + '”');
      const D = img.duration, got = smAbs(Caps);
      const want = [[0.5, 3.5], [3.8, 4], [4 + D, 4.6 + D], [5 + D, 7 + D], [7.5 + D, 8.5 + D], [9 + D, 11 + D]];
      // the cue [7.5, 8.5] straddles the B|C seam, not the insert seam, so it stays whole: only [3.8, 4.6] splits
      if (!smSame(got, want, 1e-6)) throw new Error('after inserting ' + D + ' s at 4 the cues are ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
      if (Math.abs(Caps.duration - (12 + D)) > 1e-6) throw new Error('the window did not grow with the inserted clip: ' + Caps.duration + ' vs ' + (12 + D));
    });
    await smP2((W, H) => smThree(W, H, [smCap('Caps', 0, 12, smCues, W, H)]), async function (v) {
      const Caps = v.L('Caps');
      FM.spine.cmd.speed(v.L('A').id, 2); await v.idle();
      const want = [[0.25, 1.75], [1.9, 2.6], [3, 5], [5.5, 6.5], [7, 9]];
      if (!smSame(smAbs(Caps), want, 1e-6)) throw new Error('after A at 2× the cues are ' + JSON.stringify(smAbs(Caps)) + ', want ' + JSON.stringify(want) + ' (it said “' + v.say() + '”)');
      if (Math.abs(Caps.duration - 10) > 1e-6) throw new Error('the window is ' + Caps.duration + ' s, want 10');
    });
  });
  test('simple P2.4 · T4 Reorder is a piecewise translation: a cue straddling the destination seam splits, nothing overlaps, the window and the loop region move through the same map, and a loop across a boundary is cleared and said', { item: '980', budgetMs: 60000 }, async function () {
    smNeedP2();
    for (const loop of [[1, 3], [3, 5]]) {
      await smP2((W, H) => smThree(W, H, [smCap('Caps', 0, 12, smCues, W, H)]), async function (v) {
        const Caps = v.L('Caps'), A = v.L('A'), P = FM.scene.project;
        P.loopIn = loop[0]; P.loopOut = loop[1];
        FM.spine.cmd.move(A.id, 1); await v.idle();
        if (Math.abs(A.start - 4) > 1e-9) throw new Error('A did not move after B: it starts at ' + A.start + ' (“' + v.say() + '”)');
        const got = smAbs(Caps).slice().sort((a, b) => a[0] - b[0]);
        const want = [[0, 0.6], [1, 3], [3.5, 4], [4.5, 7.5], [7.8, 8], [8, 8.5], [9, 11]];
        if (!smSame(got, want, 1e-6)) throw new Error('after moving A behind B the cues are ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
        for (let i = 1; i < got.length; i++) if (got[i][0] < got[i - 1][1] - 1e-6) throw new Error('two cues overlap after the move: ' + JSON.stringify(got[i - 1]) + ' ' + JSON.stringify(got[i]));
        if (Math.abs(Caps.start) > 1e-9 || Math.abs(Caps.duration - 12) > 1e-6) throw new Error('the window moved to [' + Caps.start + ', ' + (Caps.start + Caps.duration) + ']');
        if (loop[0] === 1) { if (Math.abs(P.loopIn - 5) > 1e-9 || Math.abs(P.loopOut - 7) > 1e-9) throw new Error('a loop inside A did not travel with it: ' + P.loopIn + ', ' + P.loopOut); }
        else if (P.loopIn != null || !/loop cleared/.test(v.say())) throw new Error('a loop across a boundary was not cleared and said (' + P.loopIn + ', “' + v.say() + '”)');
      });
    }
  });
  test('simple P2.4 · T4 a caption track lying on a clip rides that clip’s Speed (it used to refuse), and hidden cues stay hidden through Delete and Insert', { item: '980', budgetMs: 90000 }, async function () {
    smNeedP2();
    await smP2((W, H) => smThree(W, H, [smCap('Mine', 4, 4, [[0.4, 2], [2, 3.6]], W, H)]), async function (v) {
      const T = v.L('Mine');
      FM.spine.cmd.speed(v.L('B').id, 2); await v.idle();
      if (/next update/.test(v.say()) || v.steps() < 1) throw new Error('Speed on a clip carrying a caption track still refuses: “' + v.say() + '”');
      if (Math.abs(T.duration - 2) > 1e-9 || !smSame(FM.captions.cues(T).map(c => [c.start, c.end]), [[0.2, 1], [1, 1.8]], 1e-9)) throw new Error('the track on B did not scale with B: duration ' + T.duration + ', cues ' + JSON.stringify(FM.captions.cues(T).map(c => [c.start, c.end])));
    });
    await smP2((W, H) => smThree(W, H, [smCap('Caps', 0, 6, [[0.5, 3.5], [7, 8, 'hidden']], W, H)]), async function (v) {
      const Caps = v.L('Caps');
      FM.spine.cmd.del(v.L('A').id); await v.idle();
      const c = FM.captions.cues(Caps).filter(x => x.text === 'hidden')[0];
      if (!c || !(c.start >= Caps.duration - 1e-9)) throw new Error('a cue hidden past the window’s end became visible after Delete: window ' + Caps.duration + ' s, cue ' + JSON.stringify(c));
    });
  });
  test('simple P2.4 · T3 a camera push-in keyed over clip C rides Delete of an earlier clip (keys −len, the pose over C unchanged), and a camera set to Stay put keeps its absolute times', { item: '980', budgetMs: 60000 }, async function () {
    smNeedP2();
    for (const pinned of [false, true]) {
      await smP2((W, H) => smThree(W, H, [smCam([[8, 1], [12, 2]], pinned ? { sm: { stay: true } } : {})]), async function (v) {
        const cam = v.L('Cam'), before = FM.evalProp(cam.transform.scale, 10);
        FM.spine.cmd.del(v.L('A').id); await v.idle();
        const ks = cam.transform.scale.kf.map(k => +k.t.toFixed(6));
        if (pinned) { if (ks.join() !== '8,12') throw new Error('CONTROL: a camera set to Stay put moved its keys: ' + ks); return; }
        if (ks.join() !== '4,8') throw new Error('the zoom keys are at ' + ks + ' after Delete of the first clip, want 4,8 (it said “' + v.say() + '”)');
        if (Math.abs(FM.evalProp(cam.transform.scale, 6) - before) > 1e-9) throw new Error('the pose at the middle of C changed: ' + FM.evalProp(cam.transform.scale, 6) + ' vs ' + before);
        if (!/camera moves/.test(v.say())) throw new Error('the line does not say the camera moves: “' + v.say() + '”');
      });
    }
  });
  test('simple P2.4 · T3 rider keys keep the curve: an ease-in-out push cut mid-move keeps the pose over [k0, a) to 1e-6 with a step at a, and an Insert inside a move holds the pose over the new clip', { item: '980', budgetMs: 90000 }, async function () {
    smNeedP2();
    const bez = [0.42, 0, 0.58, 1];
    await smP2((W, H) => smThree(W, H, [smCam([[2, 1], [10, 2]], {}, { i: 1, bez: bez })]), async function (v) {
      const cam = v.L('Cam'), orig = JSON.parse(JSON.stringify(cam.transform.scale));
      FM.spine.cmd.del(v.L('B').id); await v.idle();
      const nw = cam.transform.scale;
      for (const t of [2, 2.5, 3, 3.9]) if (Math.abs(FM.evalProp(nw, t) - FM.evalProp(orig, t)) > 1e-6) throw new Error('the pose at ' + t + ' s changed: ' + FM.evalProp(nw, t) + ' vs ' + FM.evalProp(orig, t));
      if (Math.abs(FM.evalProp(nw, 4.0011) - FM.evalProp(orig, 8)) > 5e-3) throw new Error('after the cut the pose is not where the footage was: ' + FM.evalProp(nw, 4.0011) + ' vs ' + FM.evalProp(orig, 8));
      if (Math.abs(FM.evalProp(nw, 5) - FM.evalProp(orig, 9)) > 5e-3) throw new Error('the curve after the cut is not the tail of the original: ' + FM.evalProp(nw, 5) + ' vs ' + FM.evalProp(orig, 9));
      if (Math.abs(FM.evalProp(nw, 6) - 2) > 1e-9) throw new Error('the move does not end at 2: ' + FM.evalProp(nw, 6));
    });
    const file = await smPng('#0000ff');
    await smP2((W, H) => smThree(W, H, [smCam([[6, 1], [10, 2]])]), async function (v) {
      const cam = v.L('Cam'), R = FM.spine.classify(FM.scene), j = R.main.findIndex(e => e.id === v.L('C').id);
      await FM.spine.cmd.insert([file], j); await v.idle();
      const D = FM.scene.layers.find(l => l.type === 'image').duration, s = cam.transform.scale;
      if (Math.abs(FM.evalProp(s, 7) - 1.25) > 1e-6) throw new Error('the pose before the seam changed: ' + FM.evalProp(s, 7));
      if (Math.abs(FM.evalProp(s, 8 + D / 2) - 1.5) > 1e-6) throw new Error('the camera does not hold still over the inserted clip: ' + FM.evalProp(s, 8 + D / 2));
      if (Math.abs(FM.evalProp(s, 10 + D) - 2) > 1e-6 || Math.abs(FM.evalProp(s, 9 + D) - 1.75) > 1e-6) throw new Error('the move over the old clips lost its timing: ' + FM.evalProp(s, 9 + D) + ', ' + FM.evalProp(s, 10 + D));
    });
  });
  test('simple P2.4 · T3 the + with a zoom keyed over the end card moves the zoom WITH the card (it used to refuse); a camera set to Stay put keeps absolute times (§3.10 rule 3e)', { item: '980', budgetMs: 60000 }, async function () {
    smNeedP2();
    const file = await smPng('#ff0000');
    for (const pinned of [false, true]) {
      await smP2((W, H) => {
        const cam = FM.makeLayer('camera', { name: 'Cam', start: 0, duration: 8 });
        cam.transform.scale = smKf([[6, 1], [8, 1.5]]);
        if (pinned) cam.sm = { stay: true };
        return [cam, smT('End', 6, 2, W, H), smV('B', 3, 3, W, H), smV('A', 0, 3, W, H)];
      }, async function (v) {
        const n0 = v.steps();
        await FM.simpleTimeline.pickFiles([file]); await v.idle();
        const img = FM.scene.layers.find(l => l.type === 'image'); if (!img) throw new Error('the + added nothing: “' + v.say() + '”');
        const ks = v.L('Cam').transform.scale.kf.map(k => +k.t.toFixed(6)).join();
        if (!pinned) {
          if (Math.abs(v.L('End').start - (6 + img.duration)) > 1e-9 || v.steps() !== n0 + 1) throw new Error('the + did not move the end card: End at ' + v.L('End').start + ', ' + (v.steps() - n0) + ' step(s), “' + v.say() + '”');
          if (ks !== (6 + img.duration).toFixed(6).replace(/0+$/, '').replace(/\.$/, '') + ',' + (8 + img.duration).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')) throw new Error('the zoom is at ' + ks + ' while the card is at ' + v.L('End').start + ': it plays over the new clip');
        } else if (ks !== '6,8') throw new Error('CONTROL: a camera set to Stay put moved its keys: ' + ks);
      });
    }
  });
  test('simple P2.4 · T3 Reorder with a trimmed camera whose window crosses a moved boundary ASKS (“1 camera move will slip”); Do it anyway takes the hull of the map, one step, and Undo reverses it', { item: '980', budgetMs: 90000 }, async function () {
    smNeedP2();
    await smP2((W, H) => smThree(W, H, [smCam([[2, 1], [9, 2]], { start: 2, duration: 8 })]), async function (v) {
      const cam = v.L('Cam'), n0 = v.steps(), d0 = v.doc();
      FM.spine.cmd.move(v.L('A').id, 1); await v.idle();
      if (v.steps() !== n0 || v.doc() !== d0) throw new Error('the move went through without asking (' + (v.steps() - n0) + ' step(s))');
      if (!/1 camera move will slip/.test(v.say())) throw new Error('no ask: “' + v.say() + '”');
      await smSayBtn(v, 'Do it anyway');
      if (v.steps() !== n0 + 1) throw new Error('Do it anyway took ' + (v.steps() - n0) + ' steps');
      if (Math.abs(cam.start) > 1e-9 || Math.abs(cam.duration - 10) > 1e-6) throw new Error('the camera window is [' + cam.start + ', ' + (cam.start + cam.duration) + '], want the hull [0, 10]');
      FM.history.undo(); await v.sleep(40);
      if (v.doc() !== d0) throw new Error('Undo did not restore the document');
    });
  });
  test('simple P2.4 · T3 a link whose two ends the plan moves by different amounts is an ASK, not a refusal: “1 parent will slip” + Do it anyway (one step), Why? › says the whole sentence', { item: '980', budgetMs: 90000 }, async function () {
    smNeedP2();
    await smP2((W, H) => smThree(W, H, [smT('Tag', 5, 1, W, H, { sm: { stay: true } })]), async function (v) {
      const Tag = v.L('Tag'), C = v.L('C'), n0 = v.steps(), d0 = v.doc();
      FM.spine.cmd.del(v.L('A').id); await v.idle();
      if (v.L('A') == null) { /* a Tag that is not linked must not ask: this is the control */ }
      FM.history.undo(); await v.sleep(40);
      Tag.parent = C.id; const d1 = v.doc(), n1 = v.steps();
      FM.spine.cmd.del(v.L('A').id); await v.idle();
      if (v.steps() !== n1 || v.doc() !== d1) throw new Error('the delete went through without asking about the link (' + (v.steps() - n1) + ' step(s)): “' + v.say() + '”');
      if (!/1 parent will slip/.test(v.say())) throw new Error('the ask is “' + v.say() + '”, want “1 parent will slip”');
      await smSayBtn(v, 'Why? ›');
      if (!/out of step with its clip/.test(v.say())) throw new Error('Why? › did not say the whole sentence: “' + v.say() + '”');
      FM.spine.cmd.del(v.L('A').id); await v.idle(); await smSayBtn(v, 'Do it anyway');
      if (v.L('A') || v.steps() !== n1 + 1) throw new Error('Do it anyway did not delete in one step (' + (v.steps() - n1) + ')');
    });
  });
  test('simple P2.4 · T9 a crossfade made in Full survives its owner’s trim (the fade keys move with the SEAM), Delete keeps or removes the blend and says so, and Duplicate strips the owned keys', { item: '980', budgetMs: 120000 }, async function () {
    smNeedP2();
    const fade = (a, b) => ({ kf: [{ t: a, v: 1, e: 'linear' }, { t: b, v: 0, e: 'linear' }] });
    await smP2((W, H) => [smV('B', 3, 5, W, H), smV('A', 0, 4, W, H)].map((l, i) => { if (l.name === 'A') l.transform.opacity = fade(3, 4); return l; }).reverse().reverse(), async function (v) {
      // A (above B in the list) fades out over B across [3, 4]: A owns the blend. Trim A's tail by half a second: the seam moves with B, the fade ends at A's new end
      const A = v.L('A'), B = v.L('B');
      const R = FM.spine.classify(FM.scene); if (!R.main[1].seam || R.main[1].seam.kind !== 'blend') throw new Error('CONTROL: A|B is not a blend: ' + JSON.stringify(R.main[1] && R.main[1].seam));
      FM.selectLayer(A.id); FM.time = 3.5; FM.spine.cmd.trimTail(A.id, 3.5); await v.idle();
      if (/fades into/.test(v.say()) && Math.abs(A.duration - 3.5) > 1e-9) throw new Error('the trim refused: “' + v.say() + '”');
      const ks = A.transform.opacity.kf.map(k => +k.t.toFixed(6)).join();
      if (Math.abs(A.duration - 3.5) > 1e-9 || ks !== '2.5,3.5' || Math.abs(B.start - 2.5) > 1e-9) throw new Error('after the trim A is ' + A.duration + ' s, its fade keys at ' + ks + ', B at ' + B.start + ': the fade is stranded');
    });
    for (const keep of [true, false]) {
      await smP2((W, H) => {
        const A = smV('A', 0, 4, W, H); A.transform.opacity = fade(3, 4);
        const list = [smV('C', 8, 4, W, H), smV('B', 3, 5, W, H), A];            // keep: A above C (list order is the stack, 0 on top)
        return keep ? [A, list[0], list[1]] : list;
      }, async function (v) {
        const A = v.L('A'), C = v.L('C');
        FM.spine.cmd.del(v.L('B').id); await v.idle();
        if (v.L('B')) throw new Error('B was not deleted: “' + v.say() + '”');
        if (keep) { if (Math.abs(C.start - 3) > 1e-9 || !A.transform.opacity.kf) throw new Error('with A above C the blend should stay: C at ' + C.start + ', A opacity ' + JSON.stringify(A.transform.opacity)); if (/removed 1 crossfade/.test(v.say())) throw new Error('it said it removed a crossfade it kept'); }
        else {
          if (Math.abs(C.start - 4) > 1e-9) throw new Error('C should land at A’s end (4) when the blend cannot stay: ' + C.start);
          if (A.transform.opacity && A.transform.opacity.kf) throw new Error('A’s fade keys were not stripped: ' + JSON.stringify(A.transform.opacity));
          if (A.transform.opacity !== 1) throw new Error('A should rest at 1 (never `{kf: []}`): ' + JSON.stringify(A.transform.opacity));
          if (!/removed 1 crossfade/.test(v.say())) throw new Error('the line does not say a crossfade was removed: “' + v.say() + '”');
        }
      });
    }
    await smP2((W, H) => { const A = smV('A', 0, 4, W, H); A.transform.opacity = fade(3, 4); return [A, smV('B', 3, 5, W, H)]; }, async function (v) {
      const A = v.L('A');
      FM.spine.cmd.duplicate(A.id); await v.idle();
      if (A.transform.opacity && A.transform.opacity.kf) throw new Error('the original kept the fade-out keys it owned: ' + JSON.stringify(A.transform.opacity));
      if (v.steps() < 1) throw new Error('Duplicate did not run: “' + v.say() + '”');
    });
  });
  test('simple P2.4 · T2 Keep on the music: three back-to-back texts that cross a cut over a stay-put song are said to have moved, and the button puts them back on the song in one step; a lone title over the song is not offered it', { item: '980', budgetMs: 90000 }, async function () {
    smNeedP2();
    await smP2((W, H) => [smT('L3', 7, 1.5, W, H), smT('L2', 6, 1, W, H), smT('L1', 5, 1, W, H), smT('Solo', 4.2, 1, W, H), smSong('Song', 0, 12, W, H, { sm: { stay: true } }), smV('C', 8, 4, W, H), smV('B', 4, 4, W, H), smV('A', 0, 4, W, H)], async function (v) {
      const n0 = v.steps(), s0 = ['L1', 'L2', 'L3'].map(n => v.L(n).start);
      FM.spine.cmd.del(v.L('A').id); await v.idle();
      if (!/Moved 3 texts with their clips/.test(v.say())) throw new Error('the line does not offer Keep on the music: “' + v.say() + '”');
      const moved = ['L1', 'L2', 'L3'].map(n => v.L(n).start);
      if (moved.some((s, i) => Math.abs(s - (s0[i] - 4)) > 1e-9)) throw new Error('the texts did not move with their clips: ' + moved);
      await smSayBtn(v, 'Keep on the music');
      const back = ['L1', 'L2', 'L3'].map(n => v.L(n).start);
      if (back.some((s, i) => Math.abs(s - s0[i]) > 1e-9)) throw new Error('Keep on the music did not put the texts back on the song: ' + back + ' (was ' + s0 + ')');
      if (!['L1', 'L2', 'L3'].every(n => v.L(n).sm && v.L(n).sm.stay)) throw new Error('the texts were not pinned');
      if (v.L('A') || v.steps() !== n0 + 1) throw new Error('the replaced step: A is ' + (v.L('A') ? 'still there' : 'gone') + ', ' + (v.steps() - n0) + ' step(s) since the start, want 1');
      if (Math.abs(v.L('Solo').start - 0.2) > 1e-9 && Math.abs(v.L('Solo').start - 4.2) > 1e-9) throw new Error('Solo went somewhere odd: ' + v.L('Solo').start);
    });
  });
  test('simple P2.4 · T28 a comment pin made while Simple is on screen stays on its footage through a head trim, a split and a speed change (ls / lo, one resolver CM.pinTime), the host keeps ls / lo only with lid, and a pin made in Full stays absolute', { item: '980', budgetMs: 90000 }, async function () {
    smNeedP2();
    const CM = FM.collab && FM.collab.comments;
    if (!CM || !CM._anchorPin || !CM.pinTime) throw new Error('CM._anchorPin / CM.pinTime are not exposed — js/collab-comments.js 2.4 did not load');
    await smP2((W, H) => smThree(W, H), async function (v) {
      const B = v.L('B'), c = { id: 'c_t28', t: 6 };
      CM._anchorPin(c);
      if (c.lid !== B.id || !(typeof c.ls === 'number' && Math.abs(c.ls - 2) < 1e-6)) throw new Error('the pin at 6 s should anchor on B at source 2: ' + JSON.stringify(c));
      const frame = () => { const l = FM.layerById(FM.scene, c.lid), t = CM.pinTime(c); return l ? FM.layerLocalTime(l, Math.min(t, l.start + l.duration - 1e-6)) : null; };
      FM.selectLayer(B.id); FM.spine.cmd.trimHead(B.id, 5); await v.idle();
      if (Math.abs(frame() - 2) > 2e-3) throw new Error('after a head trim the pin is on source ' + frame() + ', want 2');
      FM.spine.cmd.speed(B.id, 2); await v.idle();
      if (Math.abs(frame() - 2) > 2e-3) throw new Error('after 2× the pin is on source ' + frame() + ', want 2');
      if (c.t !== 6) throw new Error('t was rewritten');
    }, { media: [{ name: 'B', rec: { kind: 'video', duration: 30, width: 320, height: 240 } }] });
    await smP2((W, H) => smThree(W, H), async function (v) {
      FM.editor.apply('full', { force: true, quiet: true }); await v.sleep(40);
      const c = { id: 'c_t28b', t: 6 }; CM._anchorPin(c);
      if (c.lid || c.ls != null || c.lo != null) throw new Error('a pin made in Full got an anchor: ' + JSON.stringify(c));
    }, { full: true });
  });
  test('simple P2.4 · B5 Bounce skips the boundary keys Simple’s riders insert (sb: 1) when two unmarked keys remain, so a pair built at a cut nobody made does not mask the ring; a Full-made document is untouched', { item: '980', budgetMs: 30000 }, async function () {
    const mk = sb => { const l = FM.makeLayer('shape', { name: 'bn', shape: 'rect', x: 0, y: 0, start: 0, duration: 6 }); l.transform.x = { kf: [{ t: 0, v: 0, e: 'linear' }, { t: 2, v: 100, e: 'linear' }, Object.assign({ t: 2.2, v: 100, e: 'linear', split: 1 }, sb ? { sb: 1 } : {}), Object.assign({ t: 2.201, v: 100, e: 'linear', split: 1 }, sb ? { sb: 1 } : {})] };
      l.behaviors = [{ type: 'bounce', enabled: true, params: { elastic: 0.5, freq: 3, decay: 4 } }]; return l; };
    const ring = l => Math.abs(FM.behaviorValue(l, 'x', 100, 2.3) - 100);
    const withSb = ring(mk(true)), without = ring(mk(false));
    if (!(withSb > 1)) throw new Error('with sb-marked boundary keys the ring at 2.3 s is ' + withSb + ': Bounce did not skip them');
    if (!(without < 1e-9)) throw new Error('CONTROL: without sb the boundary keys should mask the ring (they are what Full does today): ' + without);
  });
