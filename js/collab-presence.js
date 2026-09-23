/* FreeMotion — live collaboration (queue 921), STAGE S5: presence. Spec §18 (presence), §17.2 (leases),
 * §18.7 (follow), §21 (rates), §23 (solo unchanged).
 *
 * His words for this stage: "you can see what they do and what they change live and what they are
 * clicking on", "if a friend is selecting a layer or has multiple layers selected, it would like show
 * that they have it selected for you somehow" and "it's going to need the ability to see who's inside of
 * it". So: a coloured outline on every layer somebody else has selected (solid on the one they are
 * editing, dashed on the rest of a multi-select), the same colour as a ring on their clips in the
 * timeline, their playhead as a thin line, their mouse pointer and their taps on the canvas, a row of
 * faces for who is in, a lock on a layer while somebody is typing into it, and Follow.
 *
 * ⚠️ NOTHING HERE EXISTS WITHOUT A SESSION. `attach()` is called by `FM.collab.attach` and only for a
 * session on the real app (a PlainAdapter session in the suite has no DOM to draw on); it is the one
 * thing that builds DOM, binds a listener or starts a timer, and `detach()` takes every one of them
 * away again. With Labs off there is never a session, so there is never any of it — §23's promise is
 * measured by `921 S5 with no session there is no presence DOM, listener or timer…`.
 *
 * ⚠️ PRESENCE NEVER RENDERS THE SCENE. It never calls `FM.requestRender`, `FM.setTime` (outside Follow,
 * which moves HIS playhead on purpose), `FM.timeline.rebuild` or `FM.inspector.refresh`. Somebody
 * else's pointer moving is a DOM element moving, on its own requestAnimationFrame, and nothing more —
 * the judge's finding J2 #6 and §18.3. The suite spies on requestRender AND renderScene for two seconds
 * of remote pointer movement and asserts zero; the second spy is the one that matters, because
 * `FM.setTime` renders synchronously without going through requestRender at all.
 *
 * 📐 DECISIONS TAKEN AGAINST THE SPEC'S LETTER, each measured, each also written into COLLAB-DESIGN.md §18:
 *   · EVERY `pr` CARRIES THE WHOLE STATE, not a delta. §18.2 says "only when something changed … a full
 *     message every 5 s", which reads as deltas plus a periodic full. But `pres` is UNORDERED and
 *     `maxRetransmits: 0` (§20): a lost delta leaves a stale selection on somebody's screen until the next
 *     full, and an out-of-order one can put back a selection that was already cleared. A complete state
 *     is at most a few hundred bytes (`sel` is capped at 64 ids and the message at 1 KB), so a lost one
 *     costs nothing but its own frame, and `n` drops a late arrival outright. It is still sent ONLY when
 *     something changed, plus the heartbeat below.
 *   · THE HEARTBEAT IS 2 s, NOT 5. §22 greys an avatar after 6 s of silence, and that number came from
 *     the 2 s `ping` on the reliable channel — which S6 builds and nothing sends yet. With presence as the
 *     only liveness signal, a 5 s heartbeat on a LOSSY channel turns ONE dropped frame into a grey
 *     avatar; 2 s means three have to go missing in a row. The cost is one ~200-byte frame every 2 s.
 *   · THE PEOPLE CHIP EXISTS ONLY WHILE A SESSION IS LIVE. §18.5 has it as a "person+" Share button
 *     whenever Labs is on, but the Share button already exists in both top bars (S3), and §23/this
 *     stage's brief promise no presence DOM without a session. So: live and alone shows "person+",
 *     live with people shows their faces, and no session shows nothing at all.
 *   · THE INSPECTOR CHIP IS A SLIM LINE ABOVE THE INSPECTOR, not inside `.panel-title`. Measured at
 *     1280: that strip is 306 px and the A/S/D key rail already sits at 158–294 inside it, so a chip
 *     "to the right of #proj-name-s" lands on the keys. On a phone `.panel-title` is display:none.
 *   · `md` (a joining guest's media percentage) rides in `pr`, because §18.5's progress ring needs a
 *     number the host does not have: only the guest knows how much of its media has arrived.
 *   · The send rate halves under backpressure only on `bufferedAmount`; the RTT half needs the `ping`
 *     S6 builds, and a halving keyed to a number nobody measures would be decoration.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const C = FM.collab = FM.collab || {};
  const PZ = {};
  const LIM = C.LIMITS || {};
  const P_ = C.path;

  /* ═══ CONSTANTS ═══════════════════════════════════════════════════════════════════════════════ */
  const RATE_PC = 15, RATE_PHONE = 10;          // §18.2: the send cap, per device
  const HOST_HZ = 15;                           // §18.2: the host's fan-out cap
  const HEARTBEAT = 2000;                       // see the note above: 2 s, not 5
  const OFFLINE_AFTER = LIM.OFFLINE_AFTER || 6000;
  const FADE_AFTER = 10000;                     // §22: overlays fade at 10 s
  const PURGE_AFTER = LIM.PRESENCE_PURGE || 60000;
  const LEASE_EXPIRY = LIM.LEASE_EXPIRY || 30000;
  const PTR_IDLE = 5000;                        // §18.3: a pointer is hidden after 5 s idle
  const TAP_MS = 600;                           // §18.3: the tap ring's life
  const TAP_KEEP = 1200;                        // a tap rides in the state this long, so ONE lost frame cannot lose it
  const MAX_SEL = 64, MAX_MSG = 1024;
  const ACCEPT_PER_SEC = LIM.PRESENCE_PER_SEC || 30;
  const FOLLOW_SLACK = 0.4;                     // §18.7 / D19: re-seek only past 0.4 s
  /* Follow obeys only a CURRENT state (S5 review). A state that has not been refreshed for a heartbeat
     and a second is not current; nor is a "playing" one whose playhead has not moved for a second, which
     is what the host's full frame keeps re-sending for somebody who went quiet mid-play. */
  const FOLLOW_STALE = HEARTBEAT + 1000, FOLLOW_FROZEN = 1000;
  const ROSTER_GAP = 500;                       // the roster, to any one peer, at most twice a second
  const BUSY_BYTES = 64 * 1024;
  const PR_WRAP = 40;                           // `{"t":"PR","n":…,"full":1,"m":{…}}` around the people in a PR frame

  const TOOLS = ['text', 'mask', 'points', 'crop', 'fill', 'draw', 'motion', 'touchup', 'track', 'graph'];
  const ACTS = ['drag', 'trim', 'type', 'scrub', 'export'];
  const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
  const MID_RE = /^[a-z0-9]{1,12}$/;
  const PALETTE = ['#ff6b6b', '#ff9f43', '#a3e635', '#a78bfa', '#f472b6', '#6366f1', '#d4a373', '#e879f9'];
  const GREY = '#8a8f98';

  /* The label an `af` path's last segment reads as, in the words the inspector itself uses.
     ⚠️ A PEER CHOOSES THESE KEYS (S5 review). Both maps are looked up with a string somebody else sent,
     so they are prototype-free and read through `own()`: as plain literals, `constructor` resolved to
     Object's own function and the Share panel printed "function Object() { [native code] }" under a
     name. And a key that is not in the map is NOT shown raw any more — a `pn` of "removed you" printed
     exactly that, as app status, under the person's name. An unknown `af` key reads "a setting", and
     an unknown panel is not mentioned at all. */
  function table(o) { const t = Object.create(null); Object.keys(o).forEach(function (k) { t[k] = o[k]; }); return t; }
  function own(t, k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(t, k) ? t[k] : null; }
  const AF_LABELS = table({
    opacity: 'Opacity', x: 'Position', y: 'Position', scale: 'Scale', scaleX: 'Width', scaleY: 'Height',
    rotation: 'Rotation', skewX: 'Skew', skewY: 'Skew', anchorX: 'Anchor', anchorY: 'Anchor',
    text: 'the text', fill: 'Colour', color: 'Colour', stroke: 'Outline', strokeWidth: 'Outline',
    fontSize: 'Text size', font: 'Font', volume: 'Volume', speed: 'Speed', blend: 'Blending',
    start: 'Timing', duration: 'Timing', trimIn: 'Trim', trimOut: 'Trim', params: 'an effect',
    effects: 'Effects', masks: 'a mask', captions: 'Captions', name: 'the name'
  });
  /* `pn` is FM.inspector.currentView(): the inspector's own view keys (js/inspector.js CATEGORIES plus
     'effects'), labelled as its cards are. 'home' is the card grid, i.e. no panel open. */
  const PN_LABELS = table({
    color: 'Colouring', border: 'Outline & Shadows', blend: 'Mixing', transform: 'Position / Scale',
    speed: 'Speed', volume: 'Volume', element: 'Element Properties', editgroup: 'Edit Group',
    captions: 'Captions', presets: 'Presets', effects: 'Effects', cameraopts: 'Camera Options', tts: 'Text to Voice'
  });

  /* ═══ STATE — all of it null / empty until attach() ═════════════════════════════════════════════ */
  let S = null;                 // the session this is attached to
  let autoTick = true;
  let timer = null;
  let now = function () { return Date.now(); };
  const people = Object.create(null);   // mid -> person (everyone but me)
  let myMid = null;

  /* my own outgoing state */
  let mySeq = 0, lastSent = '', lastSentAt = 0, lastTry = 0;
  let ptr = null, ptrAt = 0;            // my mouse pointer, latest
  let myTap = null, tapK = 0;           // my latest tap and its counter
  let lastOnline = true;
  let localSig = '';                    // what the local "is a tool up / what is selected" looked like at the last draw

  /* host bookkeeping */
  const hp = Object.create(null);       // mid -> { n, at, tokens, tokenAt, joined, ls, rs, rosterAt }
  let hostDirty = Object.create(null);  // mids whose pr changed since the last fan-out
  let lastFan = 0, lastFull = 0, forceFull = false, rosterSig = '';
  let ownerPr = null;                   // the owner's own pr, as the host fans it out
  let mySeqHost = 0;                    // the PR counter; split frames of one fan-out share it

  /* guest bookkeeping */
  let prN = -1;                         // the last host PR n applied
  let roster = [];                      // the last roster, sanitised
  let hostAt = 0;                       // when the host last said anything to presence (a PR or a roster)

  /* follow */
  let following = null, followPri = null, followBound = null, followName = '';
  let peopleSig = '';                   // what the people panels were last told

  /* DOM, all built lazily by draw and removed by detach */
  let layerEl = null, chipEl = null, inspEl = null, layerHidden = null;
  const boxPool = [], ptrPool = [], headPool = [], edgePool = [];
  let painted = [];                     // clips this module has written classes onto
  let drawRaf = 0, edgeRaf = 0;
  let unRebuilt = null;
  const bound = [];                     // [target, type, fn, opts] — every listener, so detach can take each one away

  /* ═══ SMALL HELPERS ═══════════════════════════════════════════════════════════════════════════ */
  function el(tag, cls, text) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }
  function on(target, type, fn, opts) { if (!target) return; target.addEventListener(type, fn, opts); bound.push([target, type, fn, opts]); }
  function isId(v) { return typeof v === 'string' && ID_RE.test(v); }
  function fin(v) { return typeof v === 'number' && isFinite(v); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function cleanName(s) {
    if (C.ui && C.ui.cleanName) return C.ui.cleanName(s);
    return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, 32);
  }
  /* A colour that is not one of the eight is not a colour (§14.9): it is painted into a style attribute. */
  function cleanColor(c) { const s = String(c == null ? '' : c).toLowerCase(); return PALETTE.indexOf(s) >= 0 ? s : null; }
  function initials(name) {
    const w = cleanName(name).split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    const a = Array.from(w[0])[0] || '';
    const b = w.length > 1 ? (Array.from(w[w.length - 1])[0] || '') : (Array.from(w[0])[1] || '');
    return (a + (w.length > 1 ? b : '')).toUpperCase() || '?';
  }
  function isPhone() { try { return window.matchMedia('(max-width: 700px)').matches; } catch (e) { return false; } }
  function coarse() { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } }
  function setting(k) { try { const v = FM.settings && FM.settings.get ? FM.settings.get(k) : undefined; return v === undefined ? true : !!v; } catch (e) { return true; } }
  function toast(m) { if (FM.toast) try { FM.toast(m, 2800); } catch (e) {} }

  /* ═══ WHAT IS UP LOCALLY: the exclusive tools (§17.2) ════════════════════════════════════════
   * The same ten tools, asked the same three different questions, that `FM.cancelGesturesOn` and
   * `bridge.interacting()` ask — a loop over `isActive` alone reads as thorough and covers a third of
   * them (S2's note on the bridge). */
  /* ⚠️ ONLY WHAT HE ENTERED IS LEASED (S5 review). Two of these used to be in the leased list and are
     not tools anybody opens: the fill drag starts itself whenever the Colour view DRAWS a gradient or
     image fill (inspector.js re-runs `fillDrag.start` on every refresh), and Edit Points starts itself
     for any drawn path in the Element view (`isEmbedded`). Leasing them turned LOOKING at a panel into
     a lock on the layer for everybody else, renewed by the 2 s heartbeat for as long as the panel stayed
     open — so a PC left on the Colour view of a gradient title locked a guest out of it indefinitely,
     with no way to release it from the guest's side. They still own the canvas (their handles are drawn
     there), so the overlays still stand aside for them; they are simply not locks.
     The tables are built once: they are asked on every tick and on every rendered frame. */
  const LEASED = [
    ['text', 'textEdit', function (t) { return t.isActive(); }],
    ['mask', 'maskTool', function (t) { return t.isActive(); }],
    ['points', 'pointEdit', function (t) { return t.isActive() && !(t.isEmbedded && t.isEmbedded()); }],
    ['crop', 'cropTool', function (t) { return t.isActive(); }],
    ['motion', 'motionPath', function (t) { return t.isActive(); }],
    ['touchup', 'touchupTool', function (t) { return t.isOpen(); }],
    ['track', 'tracker', function (t) { return t.isPicking(); }],
    ['draw', 'drawTools', function () { return !!(FM.drawTool && FM.drawTool.active); }],
    ['graph', 'graphEditor', function (t) { return t.isActive(); }]
  ];
  const PASSIVE = [
    ['fill', 'fillDrag', function (t) { return t.isActive(); }],
    ['points', 'pointEdit', function (t) { return t.isActive(); }]
  ];
  function probe(list) {
    for (let i = 0; i < list.length; i++) {
      const p = list[i], tool = FM[p[1]];
      if (!tool) continue;
      let live = false;
      try { live = !!p[2](tool); } catch (e) { live = false; }
      if (!live) continue;
      let lid = null;
      try { lid = tool.layerId ? tool.layerId() : null; } catch (e) { lid = null; }
      if (!isId(lid)) lid = (FM.scene && isId(FM.scene.selectedId)) ? FM.scene.selectedId : null;
      return { tool: p[0], lid: lid };
    }
    return null;
  }
  function activeTool() { return probe(LEASED); }
  /* The canvas belongs to something else: a tool overlay, or an inspector section that draws its own
     handles (§18.3). Everything presence puts on the canvas stands aside for it. */
  function canvasTaken() {
    if (activeTool() || probe(PASSIVE)) return true;
    try { return !!(FM.inspector && FM.inspector.ownsCanvas && FM.inspector.ownsCanvas()); } catch (e) { return false; }
  }
  /* Only an editor's tool asks for a lease (§17.2). A guest demoted to Viewer with the text editor still
     open would otherwise go on claiming the layer every heartbeat. */
  function mayLease() { return !!S && (S.isOwner || S.role === 'editor'); }
  /* The session is over, or its wire is: nothing presence knows about anybody else is current. */
  function live() { return !!S && S.active !== false && !S.ended && !(!S.isOwner && S.online === false); }

  /* ═══ MY OWN STATE (§18.2) ════════════════════════════════════════════════════════════════════ */
  function sample() {
    const sc = FM.scene || {};
    const sel = (FM.selectionIds ? FM.selectionIds() : (sc.selectedIds || [])).filter(isId).slice(0, MAX_SEL);
    const t = now();
    const tool = activeTool();
    let pn = null;
    try { pn = FM.inspector && FM.inspector.currentView ? FM.inspector.currentView() : null; } catch (e) { pn = null; }
    let act = null;
    if (FM._exporting) act = 'export';
    else if (tool && tool.tool === 'text') act = 'type';
    else if (C.bridge && C.bridge.interacting && C.bridge.interacting()) act = 'drag';
    let af = null;
    if (act === 'drag' && S && S._held) { const h = S._held(); if (h.length) af = String(h[0]).slice(0, 200); }
    let md = null;
    if (S && !S.isOwner && C.media && C.media.pending) {
      try { const m = C.media.pending(S); if (m && m.n > 0) md = clamp(Math.round(m.pct), 0, 99); } catch (e) { md = null; }
    }
    if (myTap && t - myTap.at > TAP_KEEP) myTap = null;
    return {
      st: (typeof document !== 'undefined' && document.visibilityState === 'hidden') ? 'away' : 'here',
      sel: sel,
      pri: isId(sc.selectedId) ? sc.selectedId : null,
      ph: Math.round((+FM.time || 0) * 1000) / 1000,
      pl: FM.playing ? 1 : 0,
      pn: own(PN_LABELS, pn) ? pn : null,
      tool: tool ? tool.tool : null,
      ls: tool && mayLease() ? tool.lid : null,
      act: act,
      af: af,
      c: (ptr && t - ptrAt < PTR_IDLE) ? ptr : null,
      tap: myTap ? myTap.p : null,
      md: md
    };
  }

  /* ═══ SANITISING WHAT ARRIVES (§14.9: every peer is untrusted) ═════════════════════════════════ */
  function cleanPt(p, withK) {
    if (!p || typeof p !== 'object') return null;
    let out = null;
    if (p.s === 'cv' && fin(p.x) && fin(p.y)) out = { s: 'cv', x: clamp(p.x, -1e5, 1e5), y: clamp(p.y, -1e5, 1e5) };
    else if (p.s === 'tl' && fin(p.t)) out = { s: 'tl', t: clamp(p.t, 0, 86400), l: isId(p.l) ? p.l : null };
    if (out && withK) out.k = (typeof p.k === 'number' && isFinite(p.k)) ? Math.floor(p.k) : 0;
    return out;
  }
  function cleanPr(m) {
    if (!m || typeof m !== 'object') return null;
    const sel = Array.isArray(m.sel) ? m.sel.filter(isId).slice(0, MAX_SEL) : [];
    return {
      st: m.st === 'away' ? 'away' : 'here',
      sel: sel,
      pri: isId(m.pri) ? m.pri : null,
      ph: fin(m.ph) ? clamp(Math.round(m.ph * 1000) / 1000, 0, 86400) : 0,
      pl: m.pl ? 1 : 0,
      pn: own(PN_LABELS, m.pn) ? m.pn : null,
      tool: TOOLS.indexOf(m.tool) >= 0 ? m.tool : null,
      ls: isId(m.ls) ? m.ls : null,
      act: ACTS.indexOf(m.act) >= 0 ? m.act : null,
      af: typeof m.af === 'string' ? m.af.slice(0, 200) : null,
      c: cleanPt(m.c, false),
      tap: cleanPt(m.tap, true),
      md: (fin(m.md) && m.md >= 0 && m.md < 100) ? Math.round(m.md) : null
    };
  }
  function sig(o) { try { return JSON.stringify(o); } catch (e) { return String(Math.random()); } }
  /* §20: a pres frame stays within 1 KB, and only `sel` can make one bigger, so `sel` is what gives —
     from the end, and never the layer they are editing (`pri`), whose outline is the solid one.
     ⚠️ ONE FUNCTION FOR EVERY SENDER (S5 review). Only the guest's own send was capped: the owner's
     pr went out whole, so selecting all of a 40-layer project put ~1.5 KB PR frames on the lossy
     channel, where losing any one fragment loses the whole update — every one of them, 15 a second.
     And a guest pr capped at 1 KB became a little more than 1 KB once the host wrapped it. */
  function fitPr(pr, budget) {
    if (!pr || !Array.isArray(pr.sel) || !pr.sel.length || sig(pr).length <= budget) return pr;
    const head = (pr.pri && pr.sel.indexOf(pr.pri) >= 0) ? [pr.pri] : [];
    const rest = pr.sel.filter(function (id) { return id !== pr.pri; });
    const out = Object.assign({}, pr, { sel: head.slice() });
    let size = sig(out).length;
    for (let i = 0; i < rest.length; i++) {
      const add = rest[i].length + 3;                  // "id" and its comma
      if (size + add > budget) break;
      out.sel.push(rest[i]); size += add;
    }
    return out;
  }

  /* ═══ PEOPLE ══════════════════════════════════════════════════════════════════════════════════ */
  function person(mid) {
    if (!people[mid]) people[mid] = { mid: mid, name: '', color: GREY, dup: 0, role: 'editor', st: 'here', ls: null, pr: null, at: 0, ptrAt: 0, tapK: null, order: 0 };
    return people[mid];
  }
  /* A pr landing for a person, from either direction. The tap is the one field with a memory: it is a
     ring for 600 ms, once, however many frames carry it. */
  function takePr(p, pr) {
    const prev = p.pr;
    p.pr = pr;
    p.at = now();
    if (pr.c && (!prev || !prev.c || prev.c.x !== pr.c.x || prev.c.y !== pr.c.y || prev.c.t !== pr.c.t || prev.c.s !== pr.c.s)) p.ptrAt = p.at;
    if (!prev || prev.ph !== pr.ph || prev.pl !== pr.pl) p.phAt = p.at;       // Follow's "is this playhead still moving"
    /* One ring per person per 600 ms, as the comment on spawnTap has always said (S5 review): every
       accepted frame with a new `k` was a ring, so one member at the 30/s accept cap kept twenty on his
       stage at once. The counter is still taken, so a ring held back is not replayed later. */
    if (pr.tap && pr.tap.k !== p.tapK) {
      p.tapK = pr.tap.k;
      if (!(p.tapAt && p.at - p.tapAt < TAP_MS)) { p.tapAt = p.at; spawnTap(p, pr.tap); }
    }
  }
  let remoteCache = null;               // one sorted list per draw, not one per painter
  function remote() {
    if (remoteCache) return remoteCache;
    return Object.keys(people).map(function (k) { return people[k]; })
      .sort(function (a, b) { return (a.order - b.order) || (a.mid < b.mid ? -1 : a.mid > b.mid ? 1 : 0); });
  }
  /* ⚠️ ON A GUEST, THE HOST'S SILENCE IS EVERYBODY'S (S5 review). Everything a guest knows about anyone
     arrives through the host, whose full frame comes every 2 s — so a host that has said nothing for
     §22's six seconds (a locked phone, a dead Wi-Fi the ICE layer has not yet called "failed") is
     offline as far as this screen can tell, and so is everything it was relaying. Without this the
     owner's face stayed in full colour while his outlines had already faded, because only `faded()`
     looked at the clock and the roster that says "off" can only come from the host that went quiet. */
  function hostSilent() { return !!S && !S.isOwner && now() - hostAt > OFFLINE_AFTER; }
  /* Grey (§22): away, offline, or silent past the fade. A guest whose own link is down greys everybody,
     because nothing it shows about them is current any more. */
  function stateOf(p) {
    if (S && !S.isOwner && (S.online === false || hostSilent())) return 'off';
    if (p.st === 'off' || p.st === 'away') return p.st;
    return 'here';
  }
  function faded(p) {
    if (!p.pr) return true;
    if (S && !S.isOwner && S.online === false) return true;
    return now() - p.at > FADE_AFTER;
  }
  function holderOf(lid) {
    if (!lid || !S) return null;
    if (S.isOwner) return (S.host && S.host.leases[lid]) || null;
    for (let i = 0; i < roster.length; i++) if (roster[i].ls === lid) return roster[i].mid;
    return null;
  }
  function knownName(mid) {
    if (people[mid] && people[mid].name) return people[mid].name;
    for (let i = 0; i < roster.length; i++) if (roster[i].mid === mid && roster[i].name) return roster[i].name;
    return null;
  }
  function nameOf(mid) { return knownName(mid) || 'Someone'; }

  /* ═══ SENDING (§18.2) ═════════════════════════════════════════════════════════════════════════ */
  function rate() { return coarse() ? RATE_PHONE : RATE_PC; }

  /* ⚠️ A LEASE IS ASKED FOR BEFORE IT IS TAKEN. The tick below sees a tool come up and knows at once
     whether somebody else holds that layer — the owner from his own lease table, a guest from the last
     roster — so a refusal is instant rather than one round trip later. The host is still the authority:
     two people opening the same layer in the same frame are separated by `lease-no`. */
  function checkLease(me) {
    /* ⚠️ NOT FROM A FROZEN ROSTER (S5 review). A guest whose link dropped — or whose session the owner
       ended — kept its last roster, and with it every lease somebody held at that moment: opening the
       text editor on that layer in its OWN copy was closed on every tick, "Sam is editing this", by a
       Sam who was no longer connected to anything. Only a live session's roster is anybody's word. */
    if (!me.ls || !live()) return me;
    const h = holderOf(me.ls);
    if (h && h !== myMid) {
      refuse(me.ls, h);
      me.ls = null; me.tool = null;
      if (me.act === 'type') me.act = null;
    }
    return me;
  }
  let lastRefuse = { lid: null, at: 0 };
  function refuse(lid, by) {
    try { if (FM.cancelGesturesOn) FM.cancelGesturesOn(lid); } catch (e) {}
    /* Once per layer per few seconds: a tool that will not close on request would otherwise have this
       toast fired at the send rate, fifteen times a second. */
    const t = now();
    if (lastRefuse.lid === lid && t - lastRefuse.at < 3000) return;
    lastRefuse = { lid: lid, at: t };
    toast(nameOf(by) + ' is editing this — try again when they’re done');
  }

  function sendMine(force) {
    if (!S) return false;
    const t = now();
    const me = checkLease(sample());
    const s = sig(me);
    const changed = s !== lastSent;
    if (!changed && !force && t - lastSentAt < HEARTBEAT) return false;
    if (!force && t - lastTry < 1000 / rate() - 2) return false;      // the cap, whatever calls this
    lastTry = t;
    mySeq++;
    if (S.isOwner) {
      ownerPr = me;
      hostDirty[myMid] = 1;
      leaseFor(myMid, me.ls);
    } else {
      /* §20: pres frames stay under 1 KB (fitPr). The owner's own pr is fitted where every PR frame is
         built, in hostTick, so HIS screen still draws all 64 of his outlines for nobody but himself. */
      const body = fitPr(Object.assign({ t: 'pr', n: mySeq }, me), MAX_MSG);
      const ep = S.endpoint ? S.endpoint() : null;
      if (!ep || !ep.open) { lastSent = ''; return false; }
      try { ep.send('pres', body); } catch (e) { return false; }
    }
    lastSent = s;
    lastSentAt = t;
    return true;
  }

  /* ═══ THE HOST'S HALF (§18.2, §17.2) ══════════════════════════════════════════════════════════ */
  function takeToken(h) {
    const t = now();
    h.tokens = Math.min(ACCEPT_PER_SEC, h.tokens + (t - h.tokenAt) / 1000 * ACCEPT_PER_SEC);
    h.tokenAt = t;
    if (h.tokens < 1) return false;
    h.tokens -= 1;
    return true;
  }
  function hpOf(mid) {
    if (!hp[mid]) hp[mid] = { n: -1, at: now(), tokens: ACCEPT_PER_SEC, tokenAt: now(), joined: now(), ls: null, rs: null, rosterAt: 0 };
    return hp[mid];
  }

  /* First come, first served (§17.2), with the release of whatever this member held before. The owner's
     own refusal is local; a guest's goes back as `lease-no` so its device can let go and say why. */
  /* ⚠️ ONLY SOMEBODY WHO CAN EDIT MAY HOLD A LAYER, AND ONLY ONE THAT EXISTS (§14.9). A lease blocks
     the owner's own edits on that layer (collab-host.js `H.local`), so a viewer — or a hand-made `pr`
     — that could take one could lock him out of his own project, one layer at a time, for as long as
     it kept talking. A viewer's tools cannot write anyway; the host simply does not record it. */
  function editorOf(mid) {
    if (mid === myMid) return true;
    const m = S.host.members[mid];
    return !!m && m.role === 'editor';
  }
  function leaseFor(mid, lid) {
    const H = S.host;
    const h = hpOf(mid);
    const old = h.ls;
    /* …and the role is asked on EVERY frame, not only when the lease is taken (S5 review). An editor
       demoted to Viewer with the text editor still open kept sending the same `ls` every heartbeat, and
       `old === lid` returned before the check: the viewer held the layer, and the owner was locked out
       of it, for as long as that editor stayed open. */
    if (old === lid && (!lid || editorOf(mid))) return;
    if (old && H.leases[old] === mid) H.releaseLease(old);
    h.ls = null;
    if (!lid) return;
    if (!editorOf(mid)) return;
    if (mid !== myMid && P_ && P_.indexOfKey && P_.indexOfKey(H.base.layers || [], 'id', lid) < 0) return;
    if (H.grantLease(lid, mid)) { h.ls = lid; return; }
    const by = H.leases[lid];
    if (mid === myMid) { refuse(lid, by); return; }
    const ep = S.endpoint(mid);
    if (ep && ep.open) { try { ep.send('ctl', { t: 'lease-no', lid: lid, by: by }); } catch (e) {} }
  }

  function hostPres(mid, msg) {
    if (!msg || msg.t !== 'pr' || !S.host.members[mid]) return;
    const h = hpOf(mid);
    if (!takeToken(h)) return;                                   // §21: ≤ 30/s accepted
    if (typeof msg.n === 'number' && msg.n <= h.n) return;       // unordered channel: a late frame is old news
    const pr = cleanPr(msg);
    if (!pr) return;
    h.n = typeof msg.n === 'number' ? msg.n : h.n;
    h.at = now();
    const p = person(mid);
    takePr(p, pr);
    leaseFor(mid, pr.ls);
    hostDirty[mid] = 1;
    schedule();
  }

  function paletteFor(list) {
    const used = Object.create(null);
    list.forEach(function (r) {
      if (!used[r.color]) { used[r.color] = 1; return; }
      const free = PALETTE.filter(function (c) { return !used[c]; })[0];
      /* §18.1: people 9 to 12 reuse a colour, and wear a dashed ring so two of them are never one. */
      if (free) { r.color = free; used[free] = 1; } else r.dup = 1;
    });
  }
  function hostRoster() {
    const H = S.host;
    const t = now();
    const list = [{ mid: H.ownerMid, name: cleanName(H.ownerSelf.name) || 'Owner', color: cleanColor(H.ownerSelf.color) || PALETTE[0], role: 'owner', st: (document.visibilityState === 'hidden' ? 'away' : 'here'), ls: null, dup: 0 }];
    Object.keys(H.members).sort(function (a, b) { return (hpOf(a).joined - hpOf(b).joined) || (a < b ? -1 : 1); }).forEach(function (mid) {
      const m = H.members[mid];
      const h = hpOf(mid);
      const p = people[mid];
      const silent = t - h.at;
      let st = (p && p.pr && p.pr.st === 'away') ? 'away' : 'here';
      if (silent > OFFLINE_AFTER) st = 'off';
      const ep = S.endpoint(mid);
      if (!ep || ep.open === false) st = 'off';
      list.push({ mid: mid, name: cleanName(m.name) || 'Someone', color: cleanColor(m.color) || GREY, role: m.role, st: st, ls: null, dup: 0 });
    });
    paletteFor(list);
    list.forEach(function (r) { r.ls = null; });
    Object.keys(H.leases).forEach(function (lid) {
      const holder = H.leases[lid];
      for (let i = 0; i < list.length; i++) if (list[i].mid === holder) { if (!list[i].ls) list[i].ls = lid; }
    });
    return list;
  }

  function busyOn(ep) {
    const b = ep && typeof ep.bufferedAmount === 'function' ? ep.bufferedAmount('ctl') : (ep && typeof ep.bufferedAmount === 'number' ? ep.bufferedAmount : 0);
    return b > BUSY_BYTES;
  }
  /* `urgent`: say it now, whatever the rate — his own page is being hidden, and a phone that locks may
     never run the interval again (S5 review: his "away" waited for a tick that did not come). */
  function hostTick(urgent) {
    const H = S.host;
    const t = now();
    /* Forget people who have left the table, and expire what the silent ones hold (§17.2, §21). */
    Object.keys(people).forEach(function (mid) { if (!H.members[mid]) { delete people[mid]; delete hp[mid]; } });
    Object.keys(H.members).forEach(function (mid) {
      const h = hpOf(mid);
      const silent = t - h.at;
      if (silent > LEASE_EXPIRY && h.ls) { if (H.leases[h.ls] === mid) H.releaseLease(h.ls); h.ls = null; }
      Object.keys(H.leases).forEach(function (lid) { if (H.leases[lid] === mid && silent > LEASE_EXPIRY) H.releaseLease(lid); });
      if (silent > PURGE_AFTER && people[mid] && people[mid].pr) { people[mid].pr = null; schedule(); }
    });
    /* The roster: who is here, in which colour, holding what. On `ctl`, because it is identity — a
       person must not flicker out of the list because one frame got lost. */
    const list = hostRoster();
    const rs = sig(list);
    list.forEach(function (r, i) {
      if (r.mid === myMid) return;
      const p = person(r.mid);
      p.name = r.name; p.color = r.color; p.dup = r.dup; p.role = r.role; p.st = r.st; p.ls = r.ls; p.order = i;
    });
    if (rs !== rosterSig) { rosterSig = rs; schedule(); }
    /* ⚠️ THE ROSTER IS RATE-LIMITED, PER PEER, AND WAITS FOR A BUSY ONE (S5 review). It goes on `ctl`,
       the ordered reliable channel the document batches share, and it used to go to everybody on every
       tick its signature changed — which any member, a viewer included, could make happen fifteen times
       a second by flipping `st` in a hand-made `pr`, queuing the whole roster behind real edits on a
       congested phone host. Now: to any one peer at most every ROSTER_GAP, never while that peer's
       channel is backed up, and always the LATEST list — a change that arrives inside the gap is not
       lost, it simply goes when the gap is up, because the peer's last-sent signature still differs.
       A peer that said hello has its `rs` cleared (onJoin), so a join still hears at once. */
    const rmsg = { t: 'roster', people: list };
    S.peerIds().forEach(function (mid) {
      const h = hpOf(mid);
      if (h.rs === rs) return;
      if (!urgent && h.rs != null && t - h.rosterAt < ROSTER_GAP) return;
      const ep = S.endpoint(mid);
      if (!ep || !ep.open) return;
      if (!urgent && h.rs != null && busyOn(ep)) return;
      try { ep.send('ctl', rmsg); h.rs = rs; h.rosterAt = t; } catch (e) {}
    });
    /* The fan-out, at most HOST_HZ, halved under backpressure. */
    let gap = 1000 / HOST_HZ;
    const ids = S.peerIds();
    for (let i = 0; i < ids.length; i++) { if (busyOn(S.endpoint(ids[i]))) { gap *= 2; break; } }
    if (!urgent && t - lastFan < gap - 2) return;
    const full = forceFull || t - lastFull >= HEARTBEAT;
    const dirty = Object.keys(hostDirty);
    if (!full && !dirty.length) return;
    lastFan = t;
    if (full) { lastFull = t; forceFull = false; }
    const all = Object.create(null);
    if (ownerPr) all[myMid] = ownerPr;
    Object.keys(people).forEach(function (mid) { if (people[mid].pr) all[mid] = people[mid].pr; });
    const want = full ? Object.keys(all) : dirty.filter(function (m) { return all[m]; });
    hostDirty = Object.create(null);
    mySeqHost++;
    /* Every PR frame is built here, so this is where a person too big for one frame is cut down to fit
       one — the owner's own included (fitPr). Once per fan-out, not once per recipient. */
    const fitted = Object.create(null);
    ids.forEach(function (to) {
      const ep = S.endpoint(to);
      if (!ep || !ep.open) return;
      /* Split rather than exceed 1 KB (§20): a PR frame that has to be cut into fragments on an
         unreliable channel loses the whole of itself when any one fragment goes. */
      let batch = Object.create(null), size = PR_WRAP;
      const flush = function () {
        if (!Object.keys(batch).length) return;
        try { ep.send('pres', { t: 'PR', n: mySeqHost, full: full ? 1 : 0, m: batch }); } catch (e) {}
        batch = Object.create(null); size = PR_WRAP;
      };
      want.forEach(function (mid) {
        if (mid === to) return;                               // nobody needs to be told where they are
        const pr = fitted[mid] || (fitted[mid] = fitPr(all[mid], MAX_MSG - PR_WRAP - mid.length - 4));
        const one = sig(pr).length + mid.length + 4;
        if (size + one > MAX_MSG) flush();
        batch[mid] = pr; size += one;
      });
      flush();
    });
  }
  /* ═══ THE GUEST'S HALF ════════════════════════════════════════════════════════════════════════ */
  function guestPR(msg) {
    if (!msg || msg.t !== 'PR' || typeof msg.m !== 'object' || !msg.m) return;
    /* Split frames share an `n`, so equal is fine; older is not. */
    /* …except a FULL frame, which is always taken: a host that reloaded counts from zero again, and
       without this every frame after its restart would read as older than the last one before it. */
    if (!msg.full && typeof msg.n === 'number' && msg.n < prN) return;
    if (typeof msg.n === 'number') prN = msg.n;
    hostAt = now();
    Object.keys(msg.m).slice(0, 64).forEach(function (mid) {
      if (!MID_RE.test(mid) || mid === myMid) return;
      const pr = cleanPr(msg.m[mid]);
      if (pr) takePr(person(mid), pr);
    });
    schedule();
  }
  function guestRoster(msg) {
    if (!Array.isArray(msg.people)) return;
    const list = [];
    msg.people.slice(0, 64).forEach(function (r) {
      if (!r || !MID_RE.test(r.mid || '')) return;
      list.push({
        mid: r.mid, name: cleanName(r.name) || 'Someone', color: cleanColor(r.color) || GREY,
        role: ['owner', 'editor', 'commenter', 'viewer'].indexOf(r.role) >= 0 ? r.role : 'editor',
        st: ['here', 'away', 'off', 'joining'].indexOf(r.st) >= 0 ? r.st : 'here',
        ls: isId(r.ls) ? r.ls : null, dup: r.dup ? 1 : 0
      });
    });
    roster = list;
    hostAt = now();
    const seen = Object.create(null);
    list.forEach(function (r, i) {
      seen[r.mid] = 1;
      if (r.mid === myMid) return;
      const p = person(r.mid);
      p.name = r.name; p.color = r.color; p.dup = r.dup; p.role = r.role; p.st = r.st; p.ls = r.ls; p.order = i;
    });
    Object.keys(people).forEach(function (mid) { if (!seen[mid]) delete people[mid]; });
    schedule();
  }

  /* ═══ ENTRY POINTS THE SESSION CALLS ═════════════════════════════════════════════════════════ */
  PZ.onPres = function (session, fromMid, msg) {
    if (!S || session !== S) return;
    if (S.isOwner) return hostPres(fromMid, msg);
    return guestPR(msg);
  };
  /* ctl traffic that is presence's: `roster` and `lease-no`, on a guest. Returns true when it took it. */
  PZ.onCtl = function (session, fromMid, msg) {
    if (!msg || typeof msg !== 'object') return false;
    if (msg.t !== 'roster' && msg.t !== 'lease-no') return false;
    if (!S || session !== S || S.isOwner) return true;          // presence's type either way; nobody else wants it
    if (msg.t === 'roster') { guestRoster(msg); return true; }
    if (isId(msg.lid)) {
      refuse(msg.lid, MID_RE.test(msg.by || '') ? msg.by : null);
      lastSent = '';                                              // say at once that the tool is down
    }
    return true;
  };
  /* A member said hello (joined or came back): it needs the roster and everybody's state now, not at the
     next change — somebody who has been standing still for a minute would otherwise be invisible to it. */
  PZ.onJoin = function (session, mid) {
    if (!S || session !== S || !S.isOwner) return;
    const h = hpOf(mid);
    h.at = now();
    h.n = -1;                               // a guest that reloaded counts its frames from zero again
    h.rs = null;                            // …and the roster at once, whatever it was last sent
    forceFull = true;
  };

  /* One call does a whole cycle, so the app has one timer and the suite has one entry. */
  PZ.tick = function () {
    if (!S) return;
    /* ⚠️ A SESSION ENDED FROM THE OTHER SIDE IS STILL ENDED (S5 review). `C.detach` — the only thing
       that took presence down — runs on HIS end, on Leave and on a project switch, and none of those
       happens when the owner stops sharing or removes a guest: that guest's `bye` sets `S.ended` and
       shows a banner, and presence went on ticking at 10–15 Hz behind it, the chip still on the canvas,
       Follow still driving the playhead, the stale roster still refusing his text editor. The bridge's
       `onEnd` detaches at once; this is the backstop for any path that does not come through it. */
    if (S.ended || S.active === false) { PZ.detach(); return; }
    if (S.online !== lastOnline) {
      lastOnline = S.online;
      if (S.online) lastSent = '';
      else if (!S.isOwner) {
        /* Offline: the last roster's leases are nobody's word any more (checkLease), so they are not
           painted either — a lock with nobody behind it invites nothing but confusion. */
        roster.forEach(function (r) { r.ls = null; });
        Object.keys(people).forEach(function (k) { people[k].ls = null; });
        tlSig = '';
      }
      schedule();
    }
    sendMine(false);
    if (S.isOwner) hostTick();
    if (following) followTick();
    /* The local picture changes without anybody saying so — a tool opens, the selection changes — and
       the chip and the canvas layer stand aside for the first while the inspector line follows the
       second. Cheap to compare, so compare. */
    /* …and time alone changes it too: a host going silent greys everybody on a guest, and somebody
       silent past the fade loses their outlines. Nothing arrives to say so, so the tick has to notice. */
    let nFaded = 0;
    for (const k in people) if (faded(people[k])) nFaded++;
    const ls = (canvasTaken() ? 1 : 0) + '|' + (document.body.className || '') + '|' + ((FM.scene && FM.scene.selectedId) || '') + '|' + hostSilent() + '|' + nFaded;
    if (ls !== localSig) { localSig = ls; schedule(); }
    /* The pointers idle out on their own clock. */
    const t = now();
    for (const k in people) { const p = people[k]; if (p.pr && p.pr.c && p.ptrAt && t - p.ptrAt > PTR_IDLE && !p._idled) { p._idled = true; schedule(); } else if (p.pr && p.pr.c && t - p.ptrAt <= PTR_IDLE) p._idled = false; }
  };

  /* ═══ LOCAL LISTENERS (installed only while attached) ═════════════════════════════════════════ */
  function tlTime(clientX) {
    const inner = document.getElementById('tl-inner');
    if (!inner || !FM.timeline || !FM.timeline.timeToX) return null;
    const r = inner.getBoundingClientRect();
    const x0 = FM.timeline.timeToX(0), x1 = FM.timeline.timeToX(1);
    if (!(x1 > x0)) return null;
    return Math.max(0, (clientX - r.left - x0) / (x1 - x0));
  }
  function pointOf(e) {
    const tgt = e.target;
    if (!tgt || !tgt.closest) return null;
    if (tgt.closest('#canvas-wrap') && FM.eventToProject) {
      const p = FM.eventToProject(e);
      if (fin(p.x) && fin(p.y)) return { s: 'cv', x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
    }
    if (tgt.closest('#timeline')) {
      const t = tlTime(e.clientX);
      if (t == null) return null;
      const row = tgt.closest('[data-id]');
      const l = row && isId(row.getAttribute('data-id')) ? row.getAttribute('data-id') : null;
      return { s: 'tl', t: Math.round(t * 1000) / 1000, l: l };
    }
    return null;
  }
  function onMove(e) {
    if (e.pointerType !== 'mouse') return;                   // §18.2: `c` is for mouse pointers only
    const p = pointOf(e);
    ptr = p; ptrAt = now();
  }
  function onLeave(e) { if (e.pointerType === 'mouse') { ptr = null; } }
  function onDown(e) {
    if (e.pointerType === 'mouse') return;                   // §18.2: `tap` is for touch
    const p = pointOf(e);
    if (!p) return;
    tapK++;
    p.k = tapK;
    myTap = { p: p, at: now() };
  }
  function onVis() {
    lastSent = '';
    if (!S) return;
    sendMine(true);
    /* On the owner, sendMine only STORES his pr for the next fan-out, and the next fan-out is the
       interval's — which a phone whose screen has just locked may never run again. So his "away" (in
       his pr and in the roster) goes out now, in the handler, the way a guest's own pr already did. */
    if (S.isOwner && S.host) { forceFull = true; try { hostTick(true); } catch (e) { C.lastError = e; } }
  }

  function install() {
    const stage = document.getElementById('stage');
    const tlp = document.getElementById('timeline-panel');
    [stage, tlp].forEach(function (n) {
      on(n, 'pointermove', onMove, { passive: true });
      on(n, 'pointerleave', onLeave, { passive: true });
      on(n, 'pointerdown', onDown, { passive: true, capture: true });
    });
    on(document, 'visibilitychange', onVis);
    on(document.getElementById('timeline'), 'scroll', function () { if (!edgeRaf) edgeRaf = requestAnimationFrame(function () { edgeRaf = 0; paintHeads(); }); }, { passive: true });
    on(window, 'resize', schedule);
    if (FM.timeline && FM.timeline.onRebuilt) unRebuilt = FM.timeline.onRebuilt(function () { paintTimeline(true); paintHeads(); });
  }

  /* ═══ DRAWING ═════════════════════════════════════════════════════════════════════════════════
   * All of it is DOM that moves. Elements are pooled — nothing is created per frame — and hidden rather
   * than removed when they are not needed. */
  function schedule() {
    if (!S || drawRaf) return;
    drawRaf = requestAnimationFrame(function () { drawRaf = 0; draw(); });
  }
  function draw() {
    if (!S) return;
    remoteCache = remote();
    try {
      drawCanvas();
      paintTimeline();
      paintHeads();
      drawChip();
      drawInspector();
      tellPanels();
    } finally { remoteCache = null; }
  }
  PZ._draw = draw;
  /* The hook `render()` calls after the frame and the selection box (§4.2, S0): the boxes follow the
     layers as the playhead moves. Synchronous, because the frame under it just moved. */
  PZ.onRender = function () { if (S) drawCanvas(); };

  /* ⚠️ THE PEOPLE PANELS WERE SNAPSHOTS (S5 review). The Share panel and the guest's people panel read
     presence once, when they were drawn, and nothing told them again: a person who went away, moved to
     another layer or LEFT still read as they were, and Follow on somebody who had left closed the panel
     and did nothing. Now the panel hears whenever what it shows would change. */
  function tellPanels() {
    if (!C.ui || !C.ui.onPeople) return;
    const s = sig(PZ.people());
    if (s === peopleSig) return;
    peopleSig = s;
    try { C.ui.onPeople(); } catch (e) { C.lastError = e; }
  }

  function ensureLayer() {
    if (layerEl && layerEl.isConnected) return layerEl;
    const wrap = document.getElementById('canvas-wrap');
    if (!wrap) return null;
    layerEl = el('div');
    layerEl.id = 'collab-layer';
    layerHidden = null;
    layerEl.setAttribute('aria-hidden', 'true');
    wrap.appendChild(layerEl);
    return layerEl;
  }
  function wrapScale() {
    const wrap = document.getElementById('canvas-wrap');
    const pw = (FM.scene && FM.scene.project && FM.scene.project.width) || 1;
    return wrap ? (wrap.offsetWidth / pw) || 1 : 1;
  }
  /* Writes that remember what they last wrote, so a value that has not changed is not written again.
     Only presence writes onto its own pooled elements, so the memo cannot go stale behind its back. */
  function setSt(e, k, v) {
    const m = e._st || (e._st = Object.create(null));
    if (m[k] === v) return;
    m[k] = v;
    if (k.charAt(0) === '-') e.style.setProperty(k, v); else e.style[k] = v;
  }
  function setText(e, v) { if (e.textContent !== v) e.textContent = v; }
  function setAttr(e, k, v) { if (e.getAttribute(k) !== v) e.setAttribute(k, v); }
  function tagFor(host, p, lock) {
    let tag = host.firstChild;
    if (!tag) {
      tag = el('div', 'cb-tag');
      tag.appendChild(el('span', 'cb-ini'));
      tag.appendChild(el('span', 'cb-name'));
      host.appendChild(tag);
    }
    setText(tag.children[0], initials(p.name));
    setText(tag.children[1], cleanName(p.name) || 'Someone');
    tag.classList.toggle('cb-locked', !!lock);
    return tag;
  }
  function placeBox(b, g) {
    setSt(b, 'width', g.w + 'px');
    setSt(b, 'height', g.h + 'px');
    setSt(b, 'left', (g.cx - g.w * g.ax) + 'px');
    setSt(b, 'top', (g.cy - g.h * g.ay) + 'px');
    setSt(b, 'transformOrigin', (g.w * g.ax) + 'px ' + (g.h * g.ay) + 'px');
    /* The SAME transform chain canvas-edit.js writes onto #select-box — rotate, the shear, then the
       text-alignment translate last — so an outline around somebody else's layer sits exactly where
       his own would. boxFor is the shared geometry; this is the shared CSS. */
    let tf = 'rotate(' + g.rot + 'deg)';
    if (g.skewX || g.skewY) {
      const tanX = Math.tan(g.skewX * Math.PI / 180), tanY = Math.tan(g.skewY * Math.PI / 180);
      const sX = g.scaleX || 1e-6, sY = g.scaleY || 1e-6;
      tf += ' matrix(1,' + (sY * tanY / sX) + ',' + (sX * tanX / sY) + ',1,0,0)';
    }
    if (g.shift) tf += ' translate(' + g.shift + 'px,0)';
    setSt(b, 'transform', tf);
  }
  /* ⚠️ READ EVERYTHING, THEN WRITE EVERYTHING (S5 review). This runs on EVERY rendered frame — it is
     the render hook — so during playback it runs once per frame. It used to read layout (boxFor asks for
     the canvas's bounding rect) for each outline straight after writing the previous outline's styles,
     which forces a synchronous style-and-layout pass per outline per frame, and the pointer read the
     wrap's width after writes too: people × selections forced layouts on top of the canvas render —
     all of it also while hidden under a tool, because the hiding was only a visibility class. Now:
     under a tool, with both switches off, or with nobody current, it hides what it drew and stops; else
     every geometry is read first, then everything is written, and an unchanged value is not written at
     all — so a still frame writes nothing. */
  function drawCanvas() {
    const L = ensureLayer();
    if (!L) return;
    const taken = canvasTaken();
    if (layerHidden !== taken) { layerHidden = taken; L.classList.toggle('cl-hidden', taken); }
    const showSel = setting('collabSelections'), showPtr = setting('collabCursors');
    const list = (taken || (!showSel && !showPtr)) ? [] : remote().filter(function (p) { return !faded(p); });
    const boxes = [], ptrs = [];
    /* ── read ── */
    if (list.length) {
      const t = FM.time || 0;
      const tNow = now();
      const byId = Object.create(null);
      if (showSel) (FM.scene && FM.scene.layers || []).forEach(function (l) { if (l && l.id) byId[l.id] = l; });
      const boxFor = FM.canvasEdit && FM.canvasEdit.boxFor;
      const onLid = Object.create(null);
      let ws = 0;
      for (let i = 0; i < list.length; i++) {
        const p = list[i], pr = p.pr;
        if (showSel && boxFor) {
          for (let j = 0; j < pr.sel.length; j++) {
            const lid = pr.sel[j];
            const layer = byId[lid];
            if (!layer) continue;
            let g = null;
            try { g = boxFor(layer, t); } catch (e) { g = null; }
            if (!g) continue;
            /* Two people on one layer: the second outline sits 3 px further out, so both are seen. */
            const k = onLid[lid] = (onLid[lid] || 0) + 1;
            const primary = lid === pr.pri || (!pr.pri && j === 0);
            boxes.push({ p: p, lid: lid, g: g, k: k - 1, primary: primary, lock: primary && (p.ls === lid || holderOf(lid) === p.mid) });
          }
        }
        if (showPtr && pr.c && pr.c.s === 'cv' && tNow - p.ptrAt <= PTR_IDLE) {
          if (!ws) ws = wrapScale();
          ptrs.push({ p: p, x: pr.c.x * ws, y: pr.c.y * ws });
        }
      }
    }
    /* ── write ── */
    for (let i = 0; i < boxes.length; i++) {
      const d = boxes[i];
      let b = boxPool[i];
      if (!b) { b = boxPool[i] = el('div', 'cb-box'); L.appendChild(b); }
      setSt(b, 'display', '');
      setAttr(b, 'data-mid', d.p.mid);
      setAttr(b, 'data-id', d.lid);
      setSt(b, '--peer', d.p.color);
      setSt(b, '--k', String(d.k));
      b.classList.toggle('cb-alt', !d.primary);
      b.classList.toggle('cb-dup', !!d.p.dup);
      placeBox(b, d.g);
      if (d.primary) setSt(tagFor(b, d.p, d.lock), 'display', '');
      else if (b.firstChild) setSt(b.firstChild, 'display', 'none');
    }
    for (let i = 0; i < ptrs.length; i++) {
      const d = ptrs[i];
      let e = ptrPool[i];
      if (!e) {
        /* The arrow, and beside it the SAME tag the box wears — initials on a phone, initials and
           name on a PC — so a pointer and an outline in one colour read as one person. */
        e = ptrPool[i] = el('div', 'cb-ptr');
        e.appendChild(ptrSvg());
        e.appendChild(el('div', 'cb-plabel'));
        L.appendChild(e);
      }
      setSt(e, 'display', '');
      setAttr(e, 'data-mid', d.p.mid);
      setSt(e, '--peer', d.p.color);
      /* ⚠️ A TRANSFORM, NOT left/top (S5 review): the 90 ms glide between updates is a transition, and
         one on left/top lays the page out on every frame of every moving pointer. A transform is moved
         by the compositor. */
      setSt(e, 'transform', 'translate(' + d.x + 'px,' + d.y + 'px)');
      tagFor(e.children[1], d.p, false);
    }
    for (let i = boxes.length; i < boxPool.length; i++) setSt(boxPool[i], 'display', 'none');
    for (let i = ptrs.length; i < ptrPool.length; i++) setSt(ptrPool[i], 'display', 'none');
  }
  function ptrSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 12 12');
    svg.setAttribute('class', 'cb-arrow');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M1 1 L11 5.2 L6.4 6.4 L5.2 11 Z');
    svg.appendChild(path);
    return svg;
  }
  /* A tap is a ring that grows and fades in 600 ms, once. Not pooled: it is one element per tap and it
     removes itself, and takePr lets through at most one per person per 600 ms — so there is never more
     than one per person on screen. Where it lands is clamped to the project (the canvas rectangle, the
     timeline's length): §14.9's ±1e5 px and 86400 s bound what a peer may SAY, not where a ring may go,
     and a timeline ring at a day in widened the timeline's scroll range for as long as it lived. */
  function spawnTap(p, tap) {
    if (!setting('collabCursors')) return;
    requestAnimationFrame(function () {
      if (!S) return;
      const pj = (FM.scene && FM.scene.project) || {};
      let host = null, x = 0, y = 0;
      if (tap.s === 'cv') {
        host = ensureLayer();
        const ds = wrapScale();
        x = clamp(tap.x, 0, pj.width || 0) * ds; y = clamp(tap.y, 0, pj.height || 0) * ds;
      } else {
        host = document.getElementById('tl-inner');
        if (!host || !FM.timeline) return;
        x = FM.timeline.timeToX(clamp(tap.t, 0, fin(pj.duration) ? pj.duration : 0));
        y = rowY(tap.l, host);
      }
      if (!host) return;
      const r = el('div', 'cb-tap');
      r.setAttribute('data-mid', p.mid);
      r.style.setProperty('--peer', p.color);
      r.style.left = x + 'px'; r.style.top = y + 'px';
      r.appendChild(el('i'));
      host.appendChild(r);
      setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, TAP_MS + 60);
    });
  }
  function rowY(lid, inner) {
    const c = lid && document.querySelector('#tl-tracks .clip[data-id="' + lid + '"]');
    const ir = inner.getBoundingClientRect();
    if (c) { const r = c.getBoundingClientRect(); return r.top - ir.top + r.height / 2; }
    const ruler = document.getElementById('tl-rulerrow');
    return ruler ? ruler.offsetHeight + 12 : 30;
  }

  /* ── the timeline (§18.4) ── painted, never rebuilt ── */
  function clipEl(lid) { return isId(lid) ? document.querySelector('#tl-tracks .clip[data-id="' + lid + '"]') : null; }
  function clearPainted() {
    for (let i = 0; i < painted.length; i++) {
      const c = painted[i];
      c.classList.remove('peer-sel');
      c.style.removeProperty('--peer');
      const d = c.querySelector(':scope > .peer-dots'); if (d) d.remove();
      const l = c.querySelector(':scope > .peer-lock'); if (l) l.remove();
    }
    painted = [];
  }
  let tlSig = '';
  function paintTimeline(force) {
    if (!S) return;
    const showSel = setting('collabSelections');
    /* Only when what it shows changed, or the clips under it were rebuilt: repainting at the presence
       rate would rewrite classes on every clip fifteen times a second for a pointer moving on the canvas. */
    /* `ls` for EVERYBODY, faded or not: a lease outlives a quiet minute, and a signature that dropped it
       for somebody whose frames had gone quiet left the lock unpainted — found by the guest-side lock
       check, on an owner who had not sent a single frame yet. */
    const want = sig([showSel, remote().map(function (p) { return faded(p) ? [p.mid, p.color, p.ls] : [p.mid, p.color, p.pr.sel, p.ls]; }),
      S.isOwner && S.host ? S.host.leases : null]);
    if (!force && want === tlSig && painted.every(function (c) { return c.isConnected; })) return;
    tlSig = want;
    clearPainted();
    const bySel = Object.create(null), locks = Object.create(null);
    remote().forEach(function (p) {
      if (faded(p)) return;
      if (showSel) p.pr.sel.forEach(function (lid) { (bySel[lid] = bySel[lid] || []).push(p); });
    });
    /* The lock is the lease, whoever it is, whether or not their frames are current — a lease outlives a
       quiet minute (§17.2 expires it at 30 s), and a lock that vanished while it still held would invite
       exactly the edit it exists to stop. */
    remote().forEach(function (p) { if (p.ls) locks[p.ls] = p; });
    if (S.isOwner && S.host) Object.keys(S.host.leases).forEach(function (lid) { const m = S.host.leases[lid]; if (m !== myMid && people[m]) locks[lid] = people[m]; });
    Object.keys(bySel).forEach(function (lid) {
      const c = clipEl(lid);
      if (!c) return;
      const ps = bySel[lid];
      c.classList.add('peer-sel');
      c.style.setProperty('--peer', ps[0].color);
      const dots = el('span', 'peer-dots');
      ps.slice(0, 2).forEach(function (p) { const i = el('i'); i.style.setProperty('--peer', p.color); i.title = cleanName(p.name); dots.appendChild(i); });
      if (ps.length > 2) dots.appendChild(el('b', null, '+'));
      c.appendChild(dots);
      if (painted.indexOf(c) < 0) painted.push(c);
    });
    Object.keys(locks).forEach(function (lid) {
      const c = clipEl(lid);
      if (!c) return;
      const lk = el('span', 'peer-lock');
      lk.style.setProperty('--peer', locks[lid].color);
      lk.title = (cleanName(locks[lid].name) || 'Someone') + ' is editing this';
      lk.appendChild(lockSvg());
      c.appendChild(lk);
      if (painted.indexOf(c) < 0) painted.push(c);
    });
  }
  function lockSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 10 10');
    const a = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    a.setAttribute('d', 'M3 4.5V3.2a2 2 0 0 1 4 0v1.3');
    a.setAttribute('class', 'pl-shackle');
    const b = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    b.setAttribute('x', '1.8'); b.setAttribute('y', '4.4'); b.setAttribute('width', '6.4'); b.setAttribute('height', '4.6'); b.setAttribute('rx', '1');
    svg.appendChild(a); svg.appendChild(b);
    return svg;
  }

  /* ── remote playheads, and the edge chips when one is off screen ── */
  function paintHeads() {
    if (!S) return;
    const inner = document.getElementById('tl-inner'), tl = document.getElementById('timeline'), panel = document.getElementById('timeline-panel');
    if (!inner || !tl || !panel || !FM.timeline || !FM.timeline.timeToX) return;
    const hs = inner.querySelector('.tl-headspace');
    const headW = hs ? hs.offsetWidth : 0;
    const vl = tl.scrollLeft + headW, vr = tl.scrollLeft + tl.clientWidth;
    let hi = 0, ei = 0, nl = 0, nr = 0;
    remote().forEach(function (p) {
      if (faded(p)) return;
      const x = FM.timeline.timeToX(p.pr.ph);
      let h = headPool[hi];
      if (!h || !h.isConnected) { h = headPool[hi] = el('div', 'tl-peerhead'); inner.appendChild(h); }
      hi++;
      h.style.display = '';
      h.setAttribute('data-mid', p.mid);
      h.style.setProperty('--peer', p.color);
      h.style.left = x + 'px';
      /* The initial rides on the ruler (the "flag" option, picked over a bare line and over a ruler-only
         marker): with three or more people a line's colour alone does not say whose it is. An attribute
         read by `content: attr()`, so the name is text and never markup. */
      h.setAttribute('data-ini', initials(p.name));
      const side = x < vl - 1 ? 'left' : x > vr + 1 ? 'right' : null;
      h.classList.toggle('off', !!side);
      if (!side) return;
      let e = edgePool[ei];
      if (!e || !e.isConnected) {
        e = edgePool[ei] = el('button', 'tl-peerchip');
        e.type = 'button';
        e.addEventListener('click', function () {
          const q = people[e.getAttribute('data-mid')];
          if (!q || !q.pr) return;
          if (FM.playing && FM.pause) FM.pause();
          if (FM.setTime) FM.setTime(q.pr.ph);
        });
        panel.appendChild(e);
      }
      ei++;
      e.style.display = '';
      e.setAttribute('data-mid', p.mid);
      e.setAttribute('aria-label', 'Go to where ' + (cleanName(p.name) || 'they') + ' are');
      e.title = 'Go to where ' + (cleanName(p.name) || 'they') + ' are';
      e.style.setProperty('--peer', p.color);
      e.textContent = initials(p.name);
      e.classList.toggle('left', side === 'left');
      e.classList.toggle('right', side === 'right');
      const top = tl.offsetTop + 3;
      const n = side === 'left' ? nl++ : nr++;
      e.style.top = top + 'px';
      if (side === 'left') { e.style.left = (tl.offsetLeft + headW + 3 + n * 18) + 'px'; e.style.right = ''; }
      else { e.style.right = (panel.clientWidth - tl.offsetLeft - tl.clientWidth + 3 + n * 18) + 'px'; e.style.left = ''; }
    });
    for (let i = hi; i < headPool.length; i++) if (headPool[i]) headPool[i].style.display = 'none';
    for (let i = ei; i < edgePool.length; i++) if (edgePool[i]) edgePool[i].style.display = 'none';
  }

  /* ── who is here (§18.5) ── */
  function openPanel() { if (C.ui && C.ui.share) C.ui.share(); }
  function drawChip() {
    const stage = document.getElementById('stage');
    if (!stage) return;
    if (!chipEl || !chipEl.isConnected) {
      chipEl = el('button', 'collab-people');
      chipEl.id = 'collab-people';
      chipEl.type = 'button';
      chipEl.addEventListener('click', function (e) { e.stopPropagation(); openPanel(); });
      chipEl._sig = '';
      stage.appendChild(chipEl);
    }
    const hidden = canvasTaken();
    chipEl.classList.toggle('cp-hidden', hidden);
    const list = remote();
    const s = sig(list.map(function (p) { return [p.mid, p.name, p.color, p.dup, stateOf(p), p.pr ? p.pr.md : null]; }));
    if (s !== chipEl._sig) { chipEl._sig = s; fillChip(list); }
    /* The session banner shares this corner of the stage and has to clear the chip, whose width is
       whatever the faces make it (S5 review: at 380 px four people put "+1" over the banner's first
       letters). Told only when something that moves the chip changed — this runs on every draw. */
    const key = s + '|' + hidden + '|' + document.body.className + '|' + window.innerWidth;
    if (key !== chipPlaced) { chipPlaced = key; if (C.ui && C.ui.placeBanner) { try { C.ui.placeBanner(); } catch (e) {} } }
  }
  let chipPlaced = '';
  function fillChip(list) {
    chipEl.textContent = '';
    if (!list.length) {
      chipEl.classList.add('cp-invite');
      chipEl.setAttribute('aria-label', S && S.isOwner ? 'Nobody else is here yet — share this project' : 'Who is here');
      chipEl.title = chipEl.getAttribute('aria-label');
      chipEl.appendChild(inviteSvg());
      return;
    }
    chipEl.classList.remove('cp-invite');
    const names = list.map(function (p) { return cleanName(p.name) || 'Someone'; });
    chipEl.setAttribute('aria-label', 'Here: ' + names.join(', '));
    chipEl.title = names.join(', ');
    list.slice(0, 3).forEach(function (p) {
      const a = el('span', 'cp-av', initials(p.name));
      a.setAttribute('data-mid', p.mid);
      a.style.setProperty('--peer', p.color);
      const st = stateOf(p);
      a.classList.toggle('away', st !== 'here');
      a.classList.toggle('cp-dup', !!p.dup);
      if (p.pr && p.pr.md != null) { a.classList.add('joining'); a.style.setProperty('--pct', String(p.pr.md)); a.setAttribute('data-pct', p.pr.md + '%'); }
      chipEl.appendChild(a);
    });
    if (list.length > 3) chipEl.appendChild(el('span', 'cp-more', '+' + (list.length - 3)));
  }
  function inviteSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'cp-plus');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('stroke-linecap', 'round');
    const a = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    a.setAttribute('d', 'M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M19 8v6M16 11h6');
    svg.appendChild(a);
    return svg;
  }

  /* ── the inspector line (§18.6) ── */
  function afLabel(af) {
    const segs = String(af || '').split('/');
    for (let i = segs.length - 1; i >= 2; i--) {
      const k = segs[i];
      if (/^[A-Za-z$][A-Za-z0-9_$]*$/.test(k)) return own(AF_LABELS, k) || 'a setting';
    }
    return null;
  }
  function afLayer(af) { const segs = String(af || '').split('/'); return segs[0] === 'L' ? segs[1] : null; }
  function drawInspector() {
    const panel = document.getElementById('inspector-panel'), insp = document.getElementById('inspector');
    const mine = FM.scene && FM.scene.selectedId;
    let text = null, col = null;
    if (panel && insp && isId(mine)) {
      const here = remote().filter(function (p) { return !faded(p) && p.pr.sel.indexOf(mine) >= 0; });
      if (here.length) {
        const adj = here.filter(function (p) { return p.pr.af && afLayer(p.pr.af) === mine; })[0];
        const first = adj || here[0];
        col = first.color;
        const nm = cleanName(first.name) || 'Someone';
        if (adj) text = nm + ' is adjusting ' + (afLabel(adj.pr.af) || 'this');
        else if (first.ls === mine || holderOf(mine) === first.mid) text = nm + ' is editing this';
        else text = here.length === 1 ? nm + ' is here too' : nm + ' and ' + (here.length - 1) + ' more are here too';
      }
    }
    if (!text) { if (inspEl && inspEl.parentNode) inspEl.parentNode.removeChild(inspEl); return; }
    if (!inspEl) {
      inspEl = el('div', 'collab-insp');
      inspEl.id = 'collab-insp';
      inspEl.setAttribute('role', 'status');
      inspEl.appendChild(el('span', 'ci-dot'));
      inspEl.appendChild(el('span', 'ci-text'));
    }
    if (inspEl.parentNode !== panel || inspEl.nextSibling !== insp) panel.insertBefore(inspEl, insp);
    inspEl.style.setProperty('--peer', col);
    inspEl.children[1].textContent = text;
  }

  /* ═══ FOLLOW (§18.7, D19) ═════════════════════════════════════════════════════════════════════
   * Their playhead and their play state, and on a desktop their row scrolled into view. NOT their
   * selection and NOT their viewport: framing from a PC is wrong on a phone, and mirroring a selection is
   * how an edit lands on the wrong layer (the queue-629 reasoning). It ends the moment he does anything
   * himself — a tap on the canvas, the timeline or the inspector, or any key. */
  /* Why somebody cannot be followed right now, or null. ⚠️ FOLLOW OBEYED A FROZEN STATE (S5 review):
     it checked only that the person and their last `pr` existed, so when the person it followed locked
     their phone, lost their Wi-Fi or went quiet mid-play — or this device's own link dropped — it went on
     obeying their LAST frame: "playing at 12.3", so every 0.4 s of drift was a synchronous seek back to
     12.3, playback looping the same fraction of a second for as long as the stale state lived (for ever,
     on a guest: nothing clears a relayed `pr`), and restarting play if he stopped it. The banner that
     said so was outranked by the Offline one, so nothing on screen explained it. */
  function whyNot(p) {
    if (!p) return 'left';
    if (!live()) return 'gone';
    const st = stateOf(p);
    if (st === 'off' || (p.pr && faded(p))) return 'off';
    if (st === 'away') return 'away';
    return null;
  }
  function saidWhy(why, name) {
    return why === 'left' ? name + ' left' : why === 'away' ? name + ' is away'
      : why === 'gone' ? 'the live link dropped' : name + ' went offline';
  }
  PZ.canFollow = function (mid) { return S ? whyNot(people[mid]) : 'gone'; };
  PZ.follow = function (mid) {
    if (!S || !people[mid] || whyNot(people[mid])) return false;
    following = mid;
    followPri = null;
    followName = cleanName(people[mid].name) || 'them';
    if (!followBound) {
      followBound = function (e) {
        if (e.type === 'keydown') return PZ.unfollow();
        const t = e.target;
        if (t && t.closest && t.closest('#stage, #timeline-panel, #inspector-panel') && !t.closest('#collab-people')) PZ.unfollow();
      };
      window.addEventListener('pointerdown', followBound, true);
      window.addEventListener('keydown', followBound, true);
    }
    followTick();
    if (C.ui && C.ui.syncBanner) C.ui.syncBanner();
    return true;
  };
  PZ.unfollow = function () {
    if (followBound) {
      window.removeEventListener('pointerdown', followBound, true);
      window.removeEventListener('keydown', followBound, true);
      followBound = null;
    }
    const was = following;
    following = null; followPri = null;
    if (was && C.ui && C.ui.syncBanner) C.ui.syncBanner();
    return !!was;
  };
  PZ.following = function () { return following; };
  PZ.followLabel = function () { return following ? 'Following ' + (knownName(following) ? cleanName(knownName(following)) : followName || 'them') : null; };
  /* Who holds a layer, by name, for the refusal toasts in collab-session.js — null when nobody else does
     or the name is unknown, so the caller can fall back to "Someone else" (S5 review). */
  PZ.holderName = function (lid) {
    if (!S || !isId(lid)) return null;
    const h = holderOf(lid);
    if (!h || h === myMid) return null;
    const n = knownName(h);
    return n ? cleanName(n) || null : null;
  };
  function followTick() {
    const p = people[following];
    const why = whyNot(p);
    if (why) {
      /* Said, not just done: the banner simply vanishing is how a Follow that ended by itself reads as
         a Follow that broke. */
      const name = (p && cleanName(p.name)) || followName || 'they';
      PZ.unfollow();
      toast('Stopped following — ' + saidWhy(why, name));
      return;
    }
    const pr = p.pr;
    if (!pr) return;
    /* A state that is not current is not obeyed: hold still rather than replay it. Past §22's six
       seconds (or the fade) the person reads as offline and Follow ends above. */
    const t = now();
    if (t - p.at > FOLLOW_STALE || (pr.pl && t - (p.phAt || 0) > FOLLOW_FROZEN)) return;
    if (pr.pl && !FM.playing) { if (FM.play) FM.play(); }
    else if (!pr.pl && FM.playing) { if (FM.pause) FM.pause(); }
    /* Playing: only past 0.4 s of drift, or every tick would fight the local clock. Paused: they are
       placing the playhead on purpose, so land on their frame — compared on the FRAME, because setTime
       snaps and an off-grid `ph` would otherwise re-seek (and re-render) on every tick for ever. */
    const target = (!pr.pl && FM.snapFrame) ? FM.snapFrame(pr.ph) : pr.ph;
    const d = Math.abs((+FM.time || 0) - target);
    const fps = (FM.scene && FM.scene.project && FM.scene.project.fps) || 30;
    if ((pr.pl && d > FOLLOW_SLACK) || (!pr.pl && d > 0.5 / fps)) { if (FM.setTime) FM.setTime(pr.ph, !!pr.pl); }
    if (pr.pri && pr.pri !== followPri && !isPhone()) {
      followPri = pr.pri;
      const c = clipEl(pr.pri), tl = document.getElementById('timeline');
      if (c && tl) {
        const cr = c.getBoundingClientRect(), tr = tl.getBoundingClientRect();
        const ruler = document.getElementById('tl-rulerrow');
        const top = tr.top + (ruler ? ruler.offsetHeight : 0);
        if (cr.top < top) tl.scrollTop -= (top - cr.top) + 6;
        else if (cr.bottom > tr.bottom) tl.scrollTop += (cr.bottom - tr.bottom) + 6;
      }
    }
  }

  /* ═══ WHAT THE PANELS READ ════════════════════════════════════════════════════════════════════ */
  /* One line per person for the Share panel and the guest's people panel: where they are and what they
     are doing — which is also how the phone's one-row solo view names what somebody else has open. */
  PZ.people = function () {
    return remote().map(function (p) {
      let where = null;
      const pr = p.pr;
      if (pr && !faded(p)) {
        const L = pr.pri && FM.layerById ? FM.layerById(FM.scene, pr.pri) : null;
        const bits = [];
        if (L) bits.push('on ‘' + (cleanName(L.name) || 'a layer') + '’');
        if (p.ls || pr.tool) bits.push(pr.tool === 'text' ? 'typing' : 'editing');
        else if (own(PN_LABELS, pr.pn)) bits.push(own(PN_LABELS, pr.pn));
        where = bits.join(' · ') || null;
      }
      return { mid: p.mid, name: cleanName(p.name) || 'Someone', color: p.color, role: p.role, st: stateOf(p), where: where, following: following === p.mid };
    });
  };
  PZ.stateOf = function (mid) { return people[mid] ? stateOf(people[mid]) : null; };
  PZ.PALETTE = PALETTE;

  /* ═══ ATTACH / DETACH ═════════════════════════════════════════════════════════════════════════ */
  PZ.attach = function (session, opts) {
    const o = opts || {};
    if (S) PZ.detach();
    if (!session || session.adapter !== C.bridge) return false;   // a PlainAdapter session has no screen
    S = session;
    myMid = S.mid;
    autoTick = o.autoTick !== false;
    mySeq = 0; lastSent = ''; lastSentAt = 0; lastTry = 0; prN = -1; roster = []; tlSig = ''; localSig = '';
    ptr = null; myTap = null; lastOnline = S.online !== false; hostAt = now(); peopleSig = ''; layerHidden = null; chipPlaced = '';
    lastFan = 0; lastFull = 0; forceFull = true; rosterSig = ''; ownerPr = null; hostDirty = Object.create(null);
    install();
    if (autoTick) timer = setInterval(function () { try { PZ.tick(); } catch (e) { C.lastError = e; } }, Math.round(1000 / rate()));
    schedule();
    return true;
  };
  PZ.detach = function () {
    const was = !!S;
    if (timer) { clearInterval(timer); timer = null; }
    if (drawRaf) { cancelAnimationFrame(drawRaf); drawRaf = 0; }
    if (edgeRaf) { cancelAnimationFrame(edgeRaf); edgeRaf = 0; }
    PZ.unfollow();
    while (bound.length) { const b = bound.pop(); try { b[0].removeEventListener(b[1], b[2], b[3]); } catch (e) {} }
    if (unRebuilt) { try { unRebuilt(); } catch (e) {} unRebuilt = null; }
    clearPainted();
    [layerEl, chipEl, inspEl].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
    headPool.concat(edgePool).forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
    document.querySelectorAll('.cb-tap').forEach(function (n) { n.remove(); });
    layerEl = chipEl = inspEl = null;
    boxPool.length = 0; ptrPool.length = 0; headPool.length = 0; edgePool.length = 0;
    Object.keys(people).forEach(function (k) { delete people[k]; });
    Object.keys(hp).forEach(function (k) { delete hp[k]; });
    S = null; myMid = null; roster = []; layerHidden = null; followName = ''; chipPlaced = '';
    if (C.ui && C.ui.placeBanner) { try { C.ui.placeBanner(); } catch (e) {} }
    /* A suite clock never outlives the session it was set for: a test that failed half-way would
       otherwise leave the next session's rate limiter running on a frozen clock. */
    now = function () { return Date.now(); };
    /* An open people panel stops listing anybody (an ended guest's panel used to go on offering Follow
       on people it would never hear from again). */
    if (was && peopleSig !== '[]') { peopleSig = '[]'; if (C.ui && C.ui.onPeople) { try { C.ui.onPeople(); } catch (e) {} } }
    return was;
  };
  PZ.attached = function () { return !!S; };
  /* A setting moved (collab-ui's syncLabs is the one call every settings change makes). */
  PZ.refresh = function () { if (!S) return; tlSig = ''; schedule(); };

  /* ═══ SUITE SEAMS ═════════════════════════════════════════════════════════════════════════════ */
  PZ._state = function () {
    return { attached: !!S, timer: !!timer, listeners: bound.length + (followBound ? 2 : 0) + (unRebuilt ? 1 : 0), people: Object.keys(people).length, raf: !!drawRaf };
  };
  PZ._clock = function (fn) { now = typeof fn === 'function' ? fn : function () { return Date.now(); }; };
  PZ._person = function (mid) { return people[mid] || null; };
  PZ._sample = function () { return sample(); };

  C.presence = PZ;

})(window.FM);
