/* FreeMotion — FM.spine, the Simple editor's engine: READ SIDE ONLY (Simple mode Phase 1, DESIGN.md §2, §5.2, §14.1).
 *
 * WHAT THIS IS. The Simple editor is a second VIEW over the same {project, layers} document. This file answers one
 * question, purely: "drawn the way CapCut shows a project, what is this document?" — which clips make the main track,
 * in what order, with what seams between them, what every other item is (text, captions, overlay, sound, effect, a
 * block), which clip it follows, and which lane it sits in. It never writes the document, never reads FM.scene inside
 * classify (it is handed a scene), and has no DOM, so the suite drives it headless.
 *
 * WHAT IS NOT HERE YET (Phase 2+, BUILD-PLAN.md "Phase 1 scope"): the edit runner and every command, adoption, the
 * link rule through the split lineage (parents / mattes / Follow as links), moves-together anchors, main BLOCKS, the
 * mask extent inside fillsFrame, the group-opacity product inside drawsPicture, caption blocks, the docRev cache.
 * `read()` classifies on every call: it is only called from the Simple timeline's rebuild, never per frame, and T1's
 * timing test holds it to its budget. A cache keyed on a hand-picked field hash is exactly what §2.5 forbids.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  /* The version of the `sm` rules this build writes. Changes ONLY with a collab SCHEMA_REV bump — collab-core.js hashes it
     into the schema fingerprint, so a build that moved one without the other cannot join a room (§2.3). */
  FM.SM_V = 1;
  const S = FM.spine = FM.spine || {};
  S.SM_V = FM.SM_V;
  const words = () => FM.spineWords || {};

  /* MIN_LEN = max(1 frame, 0.1 s), compared with 1e-6 slack everywhere (§3.1). */
  S.minLen = function (fps) { return Math.max(1 / (fps || 30), 0.1); };

  /* ═══ THE ONE `sm` WRITER (§2.3). Merges into layer.sm, deletes the sub-key when off, deletes `sm` once empty. No code
     assigns `sm` whole (that would wipe a newer build's sub-keys). Refuses what the sanitiser would strip, so a write can
     never be undone by the next load. Returns whether the layer now carries the flag as asked. */
  /* Phase 2 adds `cut` (the de-click mark, §12.1) and `snd` (Simple's own sound-only fact, §0.4 B8). The sanitiser keeps both
     as plain unknown keys (`true` is plain), so its output does not change and no SCHEMA_REV bump is needed for them. */
  const FLAGS = ['main', 'stay', 'tail', 'twin', 'muteByMode', 'unit', 'cut', 'snd'];
  S.setFlag = function (layer, key, on) {
    if (!layer || FLAGS.indexOf(key) < 0) return false;
    /* D17 B (his pick): a sound never ends with the video — music, a voice-over, a recording run on in black as in Full */
    if (on && key === 'tail' && (layer.audioOnly === true || (layer.sm && layer.sm.snd === true))) return false;
    if (on && key === 'main' && (layer.audioOnly === true || layer.type === 'group' || (layer.type === 'text' && Array.isArray(layer.captions)))) return false;
    if (on && key === 'unit' && layer.type !== 'group') return false;
    if (on) {
      if (!layer.sm || typeof layer.sm !== 'object') layer.sm = {};
      layer.sm[key] = true;
      if (key === 'main') { delete layer.sm.stay; delete layer.sm.tail; delete layer.sm.tailEnd; }
      if (key === 'tail') { if (layer.sm.main) { delete layer.sm.tail; return false; } layer.sm.stay = true; }
      if (key === 'stay' && layer.sm.main) { delete layer.sm.stay; return false; }
    } else if (layer.sm) {
      delete layer.sm[key];
      if (key === 'stay') { delete layer.sm.tail; delete layer.sm.tailEnd; }   // tail implies stay
      if (!Object.keys(layer.sm).length) delete layer.sm;
    }
    return !!(layer.sm && layer.sm[key]) === !!on;
  };

  /* ═══ THE ONE THING THAT TOUCHES `sm` ON A COPY (§12.2 route table, T6). Keep-routes (import, use-as-new, project
     duplicate, detach, Save my version, checkpoint restore, split) keep every byte, so they never call this. Strip-routes
     (duplicate, paste, extract audio, AI clone) make a copy that is NOT a second main clip and NOT a second track-end
     item: `sm.main` and `sm.tail` go (a copied watermark keeps `sm.stay`), and `pick` goes (a copy was not in the pick).
     (A song never carries `sm.tail`: D17 B, music runs on in black as in Full.)
     Returns the copies, for chaining. */
  S.STRIP_ROUTES = ['duplicate', 'paste', 'extract', 'aiClone'];
  S.onCopy = function (copies, route) {
    if (S.STRIP_ROUTES.indexOf(route) < 0) return copies;
    (Array.isArray(copies) ? copies : [copies]).forEach(c => {
      if (!c) return;
      delete c.pick; delete c.trIn;
      if (c.sm && typeof c.sm === 'object') {
        delete c.sm.main; delete c.sm.tail; delete c.sm.tailEnd;
        if (!Object.keys(c.sm).length) delete c.sm;
      }
    });
    return copies;
  };

  /* ═══ HOW A LINE NAMES AN ITEM (§8.9): "Clip N", a text's first words, else its kind — never layer.name. */
  S.itemWord = function (layer, R) {
    const w = words().items || {};
    if (!layer) return '';
    if (R && R.index && R.index.has(layer.id)) return (w.clip || 'Clip') + ' ' + (R.index.get(layer.id) + 1);
    if (layer.type === 'text' && Array.isArray(layer.captions)) return w.captions || 'the captions';
    if (layer.type === 'text') { const t = String(layer.text || '').trim().replace(/\s+/g, ' '); return t ? '“' + (t.length > 16 ? t.slice(0, 16) + '…' : t) + '”' : (w.text || 'the text'); }
    const u = R && R.units && R.units[layer.id];
    const k = u ? u.kind : '';
    if (k === 'audio') return u.long ? (w.song || 'the song') : (w.sound || 'the sound');
    if (k === 'effect') return w.effect || 'the effect';
    if (k === 'block') return w.block || 'the group';
    if (layer.type === 'shape') return w.shape || 'the shape';
    if (layer.type === 'image') return w.image || 'the image';
    return w.videoTop || 'the video on top';
  };

  /* ═══ WHERE SIMPLE SPEAKS (§3.12): one sink, set by the Simple timeline. FM.toast is banned for Simple's lines. */
  let sink = null;
  S._setSink = function (fn) { sink = typeof fn === 'function' ? fn : null; };
  S.say = function (key, opts) {
    const L = words().lines || {};
    const text = (typeof key === 'string' && L[key]) ? L[key] : String(key || '');
    if (sink) { try { sink(text, opts || {}); } catch (e) {} }
    return text;
  };

  /* ───────────────────────────────── the classifier (§5.2) ───────────────────────────────── */

  const AUDIO_EXT = /\.(mp3|m4a|aac|wav|webm|weba|ogg|opus|flac|aif|aiff|caf)( copy( \d+)?)?$/i;   // .webm: voice recordings (§5.2)
  const PIC_EXT = /\.(mp4|mov|m4v|jpg|jpeg|png|gif|heic|webp)( copy( \d+)?)?$/i;
  const KEYING = /^(chromakey|lumakey|removecolor|colorkey)$/i;

  function isAnim(p) { return !!(p && typeof p === 'object' && Array.isArray(p.kf) && p.kf.length); }
  function evalP(p, t) { return FM.evalProp ? FM.evalProp(p, t) : (typeof p === 'number' ? p : 0); }

  S.classify = function (scene) {
    const L = (scene && Array.isArray(scene.layers)) ? scene.layers : [];
    const P = (scene && scene.project) || {};
    const W = P.width || 1080, H = P.height || 1920, fps = P.fps || 30, eps = 0.5 / fps;
    const adopted = !!(P.sm && P.sm.adopted === true);
    const byId = new Map(), z = new Map();
    L.forEach((l, i) => { if (l && l.id != null) { byId.set(l.id, l); z.set(l.id, i); } });
    const hydrating = !!(FM.storage && FM.storage.hydrating && FM.storage.hydrating());
    const media = id => (FM.media && FM.media.get) ? FM.media.get(id) : null;

    // ── 1. UNITS (§2.5): walk each layer to its group ancestors once, memoised, cycle-capped at 64 hops ──
    const isBlockGroup = g => !!g && g.type === 'group' && (
      !!(FM.groupNeedsUnit && FM.groupNeedsUnit(g, g.start || 0)) || !!g.maskGroup ||
      (!(g.sm && g.sm.unit) && !!g.transform && Object.keys(g.transform).some(k => isAnim(g.transform[k]))));
    const anc = new Map();   // id -> { block: outermost block-group ancestor id | null, hidden: bool }
    function ancestry(l) {
      if (anc.has(l.id)) return anc.get(l.id);
      let block = null, hidden = false, pid = l.parent, hops = 0;
      while (pid && hops++ < 64) {
        const p = byId.get(pid);
        if (!p || p.type !== 'group') break;   // a non-group parent is TRANSFORM parenting: not membership (§2.5)
        if (p.visible === false) hidden = true;
        if (isBlockGroup(p)) block = p.id;     // keep walking: the OUTERMOST block wins
        pid = p.parent;
      }
      const r = { block: block, hidden: hidden };
      anc.set(l.id, r);
      return r;
    }
    const units = [];                        // { id, l, start, end, z, visible, members }
    const membersOf = new Map();
    L.forEach(l => {
      if (!l || l.id == null) return;
      const a = ancestry(l);
      if (a.block) { if (!membersOf.has(a.block)) membersOf.set(a.block, []); membersOf.get(a.block).push(l); return; }
      if (l.type === 'group' && !isBlockGroup(l)) return;   // a transparent group's own layer is bookkeeping, not a unit
      units.push({ id: l.id, l: l, start: +l.start || 0, end: (+l.start || 0) + Math.max(0, +l.duration || 0), z: z.get(l.id),
                   visible: l.visible !== false && !a.hidden, members: null });
    });
    units.forEach(u => { if (membersOf.has(u.id)) u.members = membersOf.get(u.id); });

    // ── 2. MEDIA STATE and 3. KIND ──
    const isMedia = l => l.type === 'video' || l.type === 'image';
    function mediaState(l) {
      if (!isMedia(l)) return 'here';
      if (media(l.id)) return 'here';
      return hydrating ? 'arriving' : 'missing';
    }
    function nativeSize(l, st) {
      const rec = media(l.id), rev = l.mediaRev || 0;
      if (rec && rec.width > 0 && rec.height > 0 && ((rec.rev != null ? rec.rev : rev) === rev)) return { w: rec.width, h: rec.height };
      if (l.srcW > 0 && l.srcH > 0 && (l.srcRev || 0) === rev) return { w: l.srcW, h: l.srcH };
      return null;   // never a stale srcW/srcH (§5.2)
    }
    function audioOnlyOf(l, st) {
      if (l.audioOnly === true) return true;
      if (l.type !== 'video') return false;
      const rec = media(l.id);
      if (rec) return !(rec.width > 0 && rec.height > 0);
      if (l.srcW > 0 && l.srcH > 0) return false;
      if (st === 'missing') {
        const nm = String(l.name || '');
        if (AUDIO_EXT.test(nm)) return true;
        if (PIC_EXT.test(nm)) return false;
      }
      return 'unknown';
    }
    function opacityAt(l, t) { return FM.layerOpacity ? FM.layerOpacity(l, t) : evalP(l.transform && l.transform.opacity, t); }
    function drawsPicture(l) {
      const s = +l.start || 0, d = Math.max(0, +l.duration || 0);
      const ts = [s, s + d / 2, s + Math.max(0, d - 1e-3)];
      const op = l.transform && l.transform.opacity;
      if (isAnim(op)) op.kf.forEach(k => { if (k.t >= s && k.t <= s + d) ts.push(k.t); });
      return ts.some(t => opacityAt(l, t) > 0.02);
    }
    const kinds = new Map(), states = new Map(), aoMap = new Map();
    const referenced = new Set();   // ids something is transform-parented to
    L.forEach(l => { if (l && l.parent && byId.has(l.parent) && byId.get(l.parent).type !== 'group') referenced.add(l.parent); });
    units.forEach(u => {
      const l = u.l, st = mediaState(l); states.set(u.id, st);
      let k;
      if (l.type === 'camera') k = 'fullOnly';
      else if (l.type === 'null' && !referenced.has(l.id)) k = 'fullOnly';
      else if (l.type === 'group' || l.type === 'null' || /^mask-/.test(l.blendMode || '')) k = 'block';
      else if (l.type === 'adjustment') k = 'effect';
      else if (l.type === 'text' && Array.isArray(l.captions)) k = 'captions';
      else if (l.type === 'text') k = 'text';
      else if (l.type === 'shape') k = 'overlay';
      else {
        const ao = audioOnlyOf(l, st); aoMap.set(u.id, ao);
        if (ao === true) k = 'audio';
        else if (!drawsPicture(l)) k = (l.type === 'video' && !l.muted) ? 'audio' : 'overlay';
        else if (ao === 'unknown') k = 'undecided';
        else k = 'overlay';
      }
      kinds.set(u.id, k);
    });

    // ── fillsFrame (§5.2 (a), (b) and (c): the UNCROPPED native box through the parent chain; masks are Phase 2) ──
    function fillsFrame(u) {
      const l = u.l, size = nativeSize(l);
      const cx0 = W / 2, cy0 = H / 2;
      if (!size) {   // unknown size (missing media): full-frame when its position is centred within 10% (§5.2)
        const x = evalP(l.transform && l.transform.x, u.start), y = evalP(l.transform && l.transform.y, u.start);
        return Math.abs(x - cx0) <= 0.1 * W && Math.abs(y - cy0) <= 0.1 * H;
      }
      if (!FM.worldBox) return false;
      const d = u.end - u.start, samples = [u.start, u.start + d / 2, u.start + Math.max(0, d - 1e-3)];
      for (let i = 0; i < samples.length; i++) {
        let b = null;
        try { b = FM.worldBox(l, samples[i], scene, size); } catch (e) { b = null; }
        if (!b) continue;
        const bw = b.x1 - b.x0, bh = b.y1 - b.y0, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
        const a = (bw >= 0.9 * W || bh >= 0.9 * H) && Math.abs(cx - cx0) <= 0.1 * W && Math.abs(cy - cy0) <= 0.1 * H;
        const iw = Math.max(0, Math.min(W, b.x1) - Math.max(0, b.x0)), ih = Math.max(0, Math.min(H, b.y1) - Math.max(0, b.y0));
        if (a || iw * ih >= 0.9 * W * H) return true;
      }
      return false;
    }
    // "anything that makes the upper clip see-through or cut out" (§5.2 stacked take): the lower one stays main
    function seeThrough(l) {
      if (l.blendMode && l.blendMode !== 'normal') return true;
      const op = l.transform && l.transform.opacity;
      if (isAnim(op) || (typeof op === 'number' && op < 1)) return true;
      if ((l.effects || []).some(f => f && f.enabled !== false && (KEYING.test(f.type || '') || f.type === 'penmask'))) return true;
      if (l.mask && l.mask.enabled !== false && l.mask.enabled) return true;
      if ((l.masks || []).some(m => m && m.enabled !== false)) return true;
      return false;
    }
    const hasOpacityKeyIn = (l, a, b) => { const op = l.transform && l.transform.opacity; return isAnim(op) && op.kf.some(k => k.t >= a - eps && k.t <= b + eps); };
    // a hand-made crossfade: the upper of the two has opacity keys inside the overlap (§3.1)
    function isBlend(a, b) {   // a starts first
      const up = a.z < b.z ? a : b;
      return hasOpacityKeyIn(up.l, b.start, a.end);
    }
    const blendMax = (a, b) => 0.5 * Math.min(a.end - a.start, b.end - b.start);
    const overlap = (a, b) => Math.min(a.end, b.end) - Math.max(a.start, b.start);
    const hasSound = l => l.type === 'video' && !l.muted && !(media(l.id) && media(l.id).hasAudio === false);

    // ── 4. THE MAIN TRACK ──
    const byUid = new Map(units.map(u => [u.id, u]));
    const anomalies = [];
    let mainUnits = [];
    const background = new Set();
    if (adopted) {
      units.forEach(u => {
        const members = u.members || [u.l];
        const flagged = members.some(m => m.sm && m.sm.main === true);
        if (!flagged) return;
        const k = kinds.get(u.id);
        if (k === 'audio') { anomalies.push({ kind: 'mainNoPicture', ids: [u.id] }); return; }
        if (k === 'overlay' || k === 'text' || k === 'undecided' || k === 'block') mainUnits.push(u);
      });
    } else {
      const cand = units.filter(u => kinds.get(u.id) === 'overlay' && isMedia(u.l) && u.end - u.start > 0 && fillsFrame(u));
      let vis = cand.filter(u => u.visible);
      const hid = cand.filter(u => !u.visible);
      // (i) BACKGROUND: a still under a tiled run of clips above it, carrying no sound
      vis.forEach(s => {
        const spanned = vis.filter(o => o !== s && o.start >= s.start - eps && o.end <= s.end + eps).sort((a, b) => a.start - b.start);
        if (spanned.length < 2) return;
        if (!spanned.every(o => o.z < s.z)) return;                      // (a) every spanned clip is above it
        for (let i = 1; i < spanned.length; i++) if (spanned[i].start - spanned[i - 1].end > eps) return;   // (b) they tile
        if (hasSound(s.l)) return;                                       // (c) no sound
        background.add(s.id);
      });
      vis = vis.filter(u => !background.has(u.id));
      // (ii) IMPORT STACKS: 2+ with one pick, or 3+ unstamped, starting together, full-frame, normal, opaque, unkeyed
      const stackMember = new Set();
      const plain = vis.filter(u => !seeThrough(u.l) && !FM.animatedProps(u.l).length);
      const groups = [];
      plain.slice().sort((a, b) => a.start - b.start).forEach(u => {
        const g = groups.length ? groups[groups.length - 1] : null;
        if (g && Math.abs(u.start - g[0].start) <= eps) g.push(u); else groups.push([u]);
      });
      groups.forEach(g => {
        if (g.length < 2) return;
        const picks = new Set(g.map(u => u.l.pick && u.l.pick.b).filter(Boolean));
        const onePick = picks.size === 1 && g.every(u => u.l.pick && u.l.pick.b);
        if (onePick || g.length >= 3) g.forEach(u => stackMember.add(u.id));
      });
      // (iii) STACKED TAKE: a candidate fully covered by a HIGHER full-frame one — top wins, unless the top is see-through
      const drop = new Set();
      vis.forEach(lo => {
        if (stackMember.has(lo.id)) return;
        vis.forEach(up => {
          if (up === lo || stackMember.has(up.id) || up.z >= lo.z) return;
          if (!(up.start <= lo.start + eps && up.end >= lo.end - eps)) return;
          if (seeThrough(up.l)) drop.add(up.id); else drop.add(lo.id);
        });
      });
      // (iv) GREEDY, bottom of the stack first; hand crossfades up to half the shorter clip
      const taken = [];
      vis.filter(u => stackMember.has(u.id)).forEach(u => taken.push(u));
      vis.filter(u => !drop.has(u.id) && !stackMember.has(u.id)).sort((a, b) => b.z - a.z).forEach(u => {
        const hits = taken.filter(t => overlap(t, u) > eps);
        if (hits.length > 1) return;
        if (hits.length === 1) {
          const t = hits[0], a = t.start <= u.start ? t : u, b = a === t ? u : t;
          const lim = isBlend(a, b) ? blendMax(a, b) : Math.min(1, 0.5 * Math.min(t.end - t.start, u.end - u.start));
          if (overlap(t, u) > lim) return;
        }
        taken.push(u);
      });
      // (v) PASS B: a hidden clip in a seam is still on the track; a hidden take under a visible clip is not
      hid.forEach(u => { if (!taken.some(t => overlap(t, u) > eps)) taken.push(u); });
      mainUnits = taken;
      const stackIds = Array.from(stackMember);
      if (stackIds.length) anomalies.push({ kind: 'importStack', ids: stackIds });
    }
    const pickI = u => (u.l.pick && Number.isInteger(u.l.pick.i)) ? u.l.pick.i : null;
    mainUnits.sort((a, b) => (a.start - b.start) || ((pickI(a) != null && pickI(b) != null) ? pickI(a) - pickI(b) : 0) || (b.z - a.z) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const mainSet = new Set(mainUnits.map(u => u.id));

    // ── 5. SEAMS and SLOTS (§3.1) ──
    const slotCand = units.filter(u => !mainSet.has(u.id) && kinds.get(u.id) !== 'audio' && kinds.get(u.id) !== 'fullOnly' &&
                                       kinds.get(u.id) !== 'captions' && kinds.get(u.id) !== 'background' && !background.has(u.id) &&
                                       !(u.l.sm && u.l.sm.stay));
    const stretchMembers = (a, b) => slotCand.filter(u => u.start >= a - eps && u.start < b - eps);
    const coveredBy = (a, b) => units.some(u => background.has(u.id) && u.start <= a + eps && u.end >= b - eps);
    const main = [];
    let prev = null;
    mainUnits.forEach((u, i) => {
      let seam;
      if (!prev) {
        if (u.start > eps) {
          const mem = stretchMembers(0, u.start);
          if (mem.length) { main.push({ id: 'slot:' + mem[0].id, slot: true, start: 0, end: u.start, members: mem.map(m => m.id), seam: { kind: 'join', amt: 0 } }); seam = { kind: 'join', amt: 0 }; }
          else seam = { kind: 'gap', amt: u.start, covered: coveredBy(0, u.start) };
        } else if (u.start < -eps) { seam = { kind: 'join', amt: 0 }; anomalies.push({ kind: 'negativeStart', ids: [u.id], amt: -u.start }); }
        else seam = { kind: 'join', amt: 0 };
      } else {
        const diff = prev.end - u.start;
        if (diff >= -1e-9 && diff <= eps) seam = { kind: 'join', amt: 0 };
        else if (diff < -1e-9 && diff >= -eps) { seam = { kind: 'hairline', amt: -diff }; anomalies.push({ kind: 'hairline', ids: [prev.id, u.id], amt: -diff }); }
        else if (diff < -eps) {
          const mem = stretchMembers(prev.end, u.start);
          if (mem.length) { main.push({ id: 'slot:' + mem[0].id, slot: true, start: prev.end, end: u.start, members: mem.map(m => m.id), seam: { kind: 'join', amt: 0 } }); seam = { kind: 'join', amt: 0 }; }
          else { seam = { kind: 'gap', amt: -diff, covered: coveredBy(prev.end, u.start) }; if (!seam.covered) anomalies.push({ kind: 'gap', ids: [prev.id, u.id], amt: -diff }); }
        } else if (diff <= blendMax(prev, u) && isBlend(prev, u)) seam = { kind: 'blend', amt: diff };
        else { seam = { kind: 'overlap', amt: diff }; anomalies.push({ kind: 'overlap', ids: [prev.id, u.id], amt: diff }); }
      }
      main.push({ id: u.id, start: u.start, end: u.end, seam: seam });
      prev = u;
    });
    const clipsOnly = main.filter(e => !e.slot);
    const trackEnd = clipsOnly.length ? clipsOnly[clipsOnly.length - 1].end : 0;
    const index = new Map(clipsOnly.map((e, i) => [e.id, i]));

    // ── 6. HOSTS: the start rule, the sound rule and "long things stay" (§4.1). The LINK rule is Phase 2. ──
    const starts = main.map(e => e.start);
    function mainAt(t) {   // start − eps ≤ t < end − eps, over clips AND slot entries; exactly on a cut → the clip after
      let lo = 0, hi = main.length - 1, hit = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (starts[m] - eps <= t) { hit = m; lo = m + 1; } else hi = m - 1; }
      for (let i = hit; i >= 0 && i >= hit - 2; i--) { const e = main[i]; if (e.start - eps <= t && t < e.end - eps) return { e: e, i: i }; }
      return null;
    }
    function isLong(u, i) {
      if (!clipsOnly.length) return false;
      const whole = u.start <= clipsOnly[0].start + eps && u.end >= trackEnd - eps;
      const pastNext = i + 1 < main.length && u.end > main[i + 1].end + eps;
      return whole || pastNext;
    }
    const slotOf = new Map();
    main.forEach(e => { if (e.slot) e.members.forEach(id => slotOf.set(id, e.id)); });
    const R = {
      rev: 0, adopted: adopted, eps: eps, main: main, trackEnd: trackEnd, index: index, units: {}, followers: {},
      tail: [], riders: [], fullOnly: [], anomalies: anomalies,
      lanes: { captions: [], text: [], overlay: [], behind: [], audio: [] },
      isMain: id => mainSet.has(id)
    };
    main.forEach(e => { R.followers[e.id] = []; });
    units.forEach(u => {
      const k = mainSet.has(u.id) ? 'main' : (background.has(u.id) ? 'background' : kinds.get(u.id));
      const rec = { kind: k, media: states.get(u.id), host: null, side: 'none', pro: 'none', long: false, section: null, hidden: !u.visible };
      if (k === 'main') rec.section = 'main';
      else if (k === 'fullOnly') R.fullOnly.push(u.id);
      else {
        const stay = !!(u.l.sm && (u.l.sm.stay || u.l.sm.main));
        if (slotOf.has(u.id)) rec.host = slotOf.get(u.id);
        else if (!stay && k !== 'undecided' && k !== 'background') {
          const hit = mainAt(u.start);
          if (k === 'captions') {
            // a track inside one clip follows it; a spanning track RIDES the time map (§3.5)
            if (hit && !hit.e.slot && u.end <= hit.e.end + eps) rec.host = hit.e.id; else R.riders.push(u.id);
          } else if (hit) {
            const soundRuns = k === 'audio' && !(u.l.sm && u.l.sm.twin) && u.end > hit.e.end + 1.0;   // the one sound rule
            rec.long = soundRuns || (!hit.e.slot && isLong(u, hit.i));
            if (!rec.long) rec.host = hit.e.id;
          } else if (u.start >= trackEnd - eps && clipsOnly.length) R.tail.push(u.id);
        }
        if (rec.host && R.followers[rec.host]) R.followers[rec.host].push(u.id);
        // side: z against the main clips it overlaps (index 0 = the TOP of the stack)
        const over = clipsOnly.filter(e => Math.min(e.end, u.end) - Math.max(e.start, u.start) > eps);
        if (over.length) {
          const zs = over.map(e => byUid.get(e.id).z);
          rec.side = zs.every(zz => u.z > zz) ? 'behind' : (zs.every(zz => u.z < zz) ? 'front' : 'mixed');
        }
        rec.section = k === 'captions' ? 'captions' : k === 'text' ? 'text' : k === 'audio' ? 'audio'
          : k === 'background' ? 'behind' : k === 'undecided' ? 'main'
          : (rec.side === 'behind' ? 'behind' : 'overlay');   // overlay, effect and block: Behind when under every clip it meets
      }
      // what Simple cannot edit renders as it is, with a ✦ (§9.1)
      if (k === 'block') rec.pro = 'block';
      else if (FM.animatedProps && FM.animatedProps(u.l).length) rec.pro = 'look';
      else if ((u.l.behaviors || []).some(b => b && b.enabled !== false)) rec.pro = 'look';
      if (states.get(u.id) === 'missing' && isMedia(u.l)) anomalies.push({ kind: 'missing', ids: [u.id] });
      if (k === 'undecided') anomalies.push({ kind: 'undecided', ids: [u.id] });
      R.units[u.id] = rec;
    });

    // ── 11. LANES (§8.6): packed at read time, never stored; sound puts the longest first so a whole-video song wins ──
    /* 2.3 (§4.6): a clip's sound twin draws as a band inside its clip (js/simple-timeline.js), so it leaves the Sound row. isTwinOf lives in
       js/spine-edit.js (loaded after this file) and is read lazily; before it exists no layer is a twin. */
    const twinOfMain = u => !!(S.isTwinOf && u.l.type === 'video' && main.some(e => !e.slot && byUid.get(e.id) && S.isTwinOf(u.l, byUid.get(e.id).l, eps)));
    Object.keys(R.lanes).forEach(sec => {
      const items = units.filter(u => R.units[u.id].section === sec && sec !== 'main' && !(sec === 'audio' && twinOfMain(u)));
      items.sort(sec === 'audio' ? ((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start) : ((a, b) => a.start - b.start || a.z - b.z));
      const lanes = [];
      items.forEach(u => {
        let placed = false;
        for (let i = 0; i < lanes.length && !placed; i++) {
          if (lanes[i].every(o => o.end <= u.start + eps || o.start >= u.end - eps)) { lanes[i].push(u); placed = true; }
        }
        if (!placed) lanes.push([u]);
      });
      R.lanes[sec] = lanes.map(ls => ls.map(u => u.id));
    });
    R.undecidedIds = units.filter(u => kinds.get(u.id) === 'undecided').map(u => u.id);
    return R;
  };

  /* Phase 1 has no cache (header): the timeline calls this once per rebuild. */
  S.read = function (scene) { return S.classify(scene || FM.scene); };
})(window.FM);
