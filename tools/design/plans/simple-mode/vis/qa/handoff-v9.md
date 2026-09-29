# Handoff from the V9 fix (29 Sep)

V9's five QA defects are fixed inside `v9.js` (it now has 13 edits: the 9 before, plus End card, Delete by a fade,
Trim by a fade and Turn into a transition, and the camera shown in every edit). Four things sit outside `v9.js`.
V9 works today without any of them.

## 1. `kit.js` engine: a trim of the clip that makes a crossfade is refused (DESIGN §3.6 says it should run)

- `C.trimTail` (~line 503): `if (n && n.seam.kind === 'blend' && blendOwner(R, c, n) === c) return refuse('That clip fades into the next one')`
- `C.trimHead` (~line 540): `if (c.seam.kind === 'blend' && p && blendOwner(R, p, c) === c) return refuse('That clip fades in from the one before')`

The design (§3.6 Trim the tail / Trim the head rows) says the trim stops at `newDuration ≥ 2·amt` and the owner's fade keys
move with the cut: a tail trim moves them by the landed `dt`, a head trim leaves them where they were (they are exempt from
the `−L`). `seamFloor` already gives the 2× floor, so the change is small: drop the refusal, and in the write, move the owned
opacity keys (`[b.start − eps, a.end + eps]`) by `dt` (tail) or leave them out of the `shiftKeys(x, −L)` (head).

Until then V9's step 12 ("Trim by a fade", the end of Waves) runs the engine's trim with the fade keys set aside and puts
them back moved by the cut (`ownerTrim` in `v9.js`), and says so on the page in small print. It only runs after the engine
refuses, so once the kit does this, V9 uses the real run with no change. A test for `engine-tests.js`:

```js
{ const d = VIS.sample('beach'), L = new Map(d.layers.map(l => [l.id, l])), w = L.get('c2');
  w.duration += 0.6; w.kf.opacity = [{ t: 7.1, v: 1 }, { t: 7.7, v: 0 }];
  d.layers.splice(d.layers.indexOf(w), 1); d.layers.splice(d.layers.indexOf(L.get('c4')), 0, w);   // Waves on top: it fades out
  const ed = E.editor(d), r = ed.run('trimTail', { id: 'c2', dur: 3.3 });
  const W = ed.doc.layers.find(l => l.id === 'c2'), S = ed.doc.layers.find(l => l.id === 'c3');
  ok(r.ok, 'a tail trim of the clip that fades out runs (§3.6)');
  ok(near(S.start, 6.1) && near(W.kf.opacity[0].t, 6.1) && near(W.kf.opacity[1].t, 6.7), 'the fade moves with the cut, over the same 0.6 s');
  ok(E.classify(ed.doc).entry('c3').seam.kind === 'blend', 'still a crossfade'); }
```

## 2. DESIGN.md gap: deleting the clip a fade-in fades over leaves the next clip fading in from black

Found while building step 11 and checked on the engine. Sandcastle fades IN over Waves (Sandcastle is the upper clip), and
Waves is deleted. §3.6's Delete row covers a blend on `p|c` (the deleted clip's own start); §3.4 says "`c`'s overlap or blend
with `n` goes with `c`". But `n`'s owned fade-in keys stay: Sandcastle lands at 3.4 s, meets Arriving with a plain cut, and
still has opacity 0 → 1 over 3.4–4.0 s, so it fades in from black (engine result: opacity 0.17 at 3.5 s).
Suggested rule, in the same shape as the `p`-owns case: when `n` owns the blend `c|n`, strip `n`'s owned keys with §12.1's
static fallback and add *"· removed 1 crossfade"*. V9 does not show this case (its crossfade copy has Waves fading out, where
the design is complete), so nothing on the page is wrong; the gap is in the rule.

## 3. `kit.js` engine: the camera's window is not moved through the time map

§3.5 says every command's map applies "to the camera and its window". `applyPlan` step 5 maps the camera's keys only
(`riderKeys`), so after deleting Waves the camera still spans 0–14.2 s in a 10.5 s video. Its keys are exactly right, and V9
draws the camera line over the video's own length, so V9 does not show the wrong window. One line in step 5:
`l.start = Math.max(0, mapT(P.map, l.start)); l.duration = mapT(P.map, l.start + l.duration, true) − l.start` (with the
same end snap to `trackEnd` the caption track gets).

## 4. `kit.js` engine, small: `riderKeys` drops a key that sits exactly on a cut's start

In the `cut` branch a key at exactly `c.a` is neither `before` (`< c.a`) nor `after` (`>= c.b`), and the boundary pair is only
added when a key is strictly inside `(a, b)`. So a camera key exactly on a deleted clip's first frame vanishes with no step
put in its place. V9's camera keys sit off the cuts on purpose, so V9 is unaffected. Either keep `k.t <= c.a` in `before`
(its value is the value just before the cut) or count `k.t >= c.a` in `cutAny`.

## Not needed from anyone

- Turn into a transition (Phase 6) is not in the engine; V9 has its own small pure version (`turnInto`, §12.1: meet in the
  middle, `trIn` of the old length, followers on the trimmed-off footage move to the new first frame, the fade keys go and a
  list left empty gets its value back). If another page needs it, it can move into `kit.js` as a command.
- V9 draws the pictures with the scenes V6 uses (the walker, the waves, the flag, the sun, the shell), by swapping
  `VIS.thumb` for the length of one `VIS.stage` call, as V6 does. No kit change.
