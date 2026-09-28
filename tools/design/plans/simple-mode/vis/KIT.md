# The visualizer kit (for whoever builds V1–V12)

Everything lives in this folder. No build step, no libraries. Your page is one file, `vN.js`, loaded after
`kit.js` by `index.html`. It calls `VIS.register` once. The hub draws the navigation, mounts your page the first
time Ezra opens it, and remembers which page was open.

- **Audience:** Ezra, on his phone (380–440 px), not a programmer. Plain words, short sentences. On screen the
  editors are **Quick** (the new one) and **Full** (today's). Field names like `sm.main` may appear only in
  V7 "How it is built" and V8 "The data", explained in plain words.
- **Every page must work by touch at 380 px and with a mouse at 1280 px.** Use `click` for taps (it fires for
  both). Anything wider than the screen goes inside its own `overflow-x: auto` box (`.h-scroll-x`); the page
  itself never scrolls sideways.
- **Local check:** `./make-preview.sh`, serve the repo with `tools/serve.sh 879N`, open
  `/tools/design/plans/simple-mode/vis/preview.html#v3`.

## Registering

```js
VIS.register('v3', {
  title: 'Quick on a phone',          // optional: the hub already has a working title for v1..v12
  blurb: 'One sentence for Ezra.',    // optional
  mount(host) { /* draw into host (an empty div); called once, lazily */ }
});
```

`mount` may return a promise. If it throws, the hub shows the error in place of your page and the others keep
working. A missing `vN.js` shows "Being built".

## The two page layers

- **Hub chrome** (`h-` classes, follows light and dark): `.h-card`, `.h-row`, `.h-note`, `.h-btn`, `.h-btn.primary`,
  `.h-seg` (a segmented control: buttons with `aria-pressed`), `.h-scroll-x`. Tokens: `--h-bg`, `--h-surface`,
  `--h-ink`, `--h-muted`, `--h-rule`, `--h-accent`.
- **The mock** (`fm-` classes, always FreeMotion's dark glass editor). Its tokens live on `.fm`: `--accent`
  `#5ac7ed`, `--panel`, `--line`, section colours `--sec-captions`, `--sec-text`, `--sec-overlay`,
  `--sec-effect`, `--sec-audio`, `--sec-behind`.

## Samples (plain data, the design's model, DESIGN §2.2)

`VIS.sample(key)` returns a fresh deep copy. Layers are top of the stack first; keyframes are absolute times.

| key | what it is |
|---|---|
| `beach` | **Beach day**, made in Quick (adopted). Clips `c1` Arriving, `c2` Waves, `c3` Sandcastle, `c4` Sunset; `title` on Waves; `sticker` on Sandcastle; `cap` captions (7 cues); `song` music (Stay put, ends with the video). 14.2 s, 1080×1920. |
| `messy` | **Cooking with Mia**, made in Full, never opened in Quick. `m1`–`m4` clips with a 1.5 s gap and an overlap, `pip` face cam, `grp` lower-third group (a block), `cam` camera, `mask`, `mtitle` whole-video title, `beats` music. 1920×1080. |
| `aroll` | **Studio tips**: `a1` talking head (30 s) with cutaways `b1`–`b3` above it, `acap` captions, `end` end card. |

Layer fields: `id, type ('video'|'image'|'text'|'shape'|'group'|'camera'), name, start, duration, trimStart,
srcDur, speed, audioOnly, visible, locked, parent, transform {scale,x,y}, blendMode, captions [{start,end,text}]
(layer-local), kf {prop: [{t, v}]}, sm {main, stay, tail, tailEnd}`, and mock-only `look: [colourA, colourB]`.

## The engine: `VIS.engine` (DESIGN §3, §4, §5.2)

```js
const E = VIS.engine;
const R = E.classify(doc);            // the read model, never writes (0 bytes written on open)
const ed = E.editor(VIS.sample('beach'));
const res = ed.run('deleteClip', { id: 'c2' });   // one undo step per command
// res = { ok, say, label, time, newId, adopted, arranges }   or   { ok:false, say:'why', locked? }
ed.undo(); ed.redo(); ed.canUndo(); ed.doc;       // ed.doc is the live document
ed.onChange(res => redraw());
```

Commands and their arguments:

| command | args | what it does |
|---|---|---|
| `deleteClip` | `{id}` | removes the clip and what follows it; later clips close up; long items are cut |
| `trimTail` | `{id, dur}` | new length (landed; followers cut away slide back, D6) |
| `trimHead` | `{id, by}` | `by` > 0 trims in, < 0 extends back; the clip keeps its start |
| `split` | `{id, t}` | at time t (snapped to a frame); `res.newId` is the second half |
| `reorder` | `{id, to}` | `to` = the cut before main clip number `to` (0 = front, length = end) |
| `speed` | `{id, sp}` | flat speed; followers keep their length |
| `closeGap` | `{id}` | the gap or overlap before main entry `id` |
| `makeOverlay` | `{id}` | lift a clip off the clip row; the rest closes up |
| `makeMain` | `{id}` | drop an overlay into the clip row at the nearest cut |
| `insert` | `{clips:[{name,duration,srcDur,look}], at}` | `at` omitted = append |
| `duplicate` | `{id}` | the copy lands at the clip's end |
| `stayPut` | `{id, on}` | the Stay put switch |

Run with `ed.run(name, args, {force: true})` for the "Do it anyway" answer to a locked refusal.
`E.commands[name](R, doc, args)` returns the plan without applying it (for step-through pages like V9).

The read model `R`: `R.main` (entries in order, each `{id, start, end, seam:{kind:'join'|'hairline'|'gap'|'overlap'|'blend', amt}}`,
or a slot `{slot:true, members}`), `R.units[id]` (`kind`, `host`, `section`, `side`, `start`, `end`),
`R.followers[mainId]`, `R.tail`, `R.riders`, `R.lanes[section]`, `R.wouldStay`, `R.notices`, `R.trackEnd`,
`R.isMain(id)`, `R.mainAt(t)`. Also `E.snap(t, fps)`, `E.minLen(fps)`, `E.valueAt(keys, t)`, `E.clone`.

The engine is tested: `osascript -l JavaScript engine-tests.js "$PWD"` (output in `engine-tests.out.txt`).

## Drawing the mock

| call | returns |
|---|---|
| `VIS.phoneFrame(host, {name, editor:'quick'|'full', stageH, tlH, tools, onTool})` | `{root, stage, playbar, time, timeline, tray, say, tools, toolbar, switchBtn, setTime(t,fps), setSay(html), on(act, fn)}` |
| `VIS.pcFrame(host, {name, editor, width:1100, height:680, band:250, inspW:360, minScale:.5})` | the same plus `panel`, `transport`, `scale`, `fit()`; scales itself to fit its container |
| `VIS.stage(el, doc, t, {selected})` | draws the picture at time t |
| `VIS.drawQuick(el, doc, opts)` | Quick's timeline: sections, clip row, sound row |
| `VIS.drawFull(el, doc, opts)` | Full's timeline: one row per layer |
| `VIS.toolbar(el, tools, {iconsOnly, onClick})` | `{buttons, set(id, {on, hl, disabled})}` |
| `VIS.toast(root, text, {label, run}, {ms, bottom})` | the Undo line, e.g. `VIS.toast(f.root, 'Deleted clip and 1 thing on it', {label:'Undo', run: undo})` |
| `VIS.chip(text, kind, icon)` | kinds: `accent`, `live`, `warn`, `full` |
| `VIS.lockBadge()`, `VIS.fullBadge()`, `VIS.playhead(el, x)`, `VIS.linkLine(el, x, y1, y2, colour)` | small pieces |
| `VIS.icon(name)` | an SVG string: play, pause, split, delete, undo, redo, add, duplicate, toStart, toEnd, fit, more, export, text, clips, captions, music, sound, mute, overlay, behind, look, effects, speed, lift, drop, crop, lock, eye, pin, ask, gear, back, help, notes, personAdd, editor, link, check, close, share |

Timeline options (both): `pxPerSec` (a number, or `'fit'` to fit the width), `time` (draws the playhead),
`selected` (an id), `onTap(id, info)`, `onScrub(t)` (drag on the ruler). Quick only: `open` (`'all'` for PC, a
section key, or null for automatic), `maxLanes`, `onOpen(section)`, `onSeam(id, kind)`, `onAdd()`,
`addButton:false`, `showLink:false`. Both return `{R (Quick), pps, xOf(t), tOf(clientX), items: Map(id → element),
inner, scroller, clipRow, soundRow, setTime(t)}`.

Lists: `VIS.QUICK_TOOLS` (Clips · Text · Captions · Sound · Overlay · Look · Effects · Ask), `VIS.CLIP_TRAY`,
`VIS.ITEM_TRAY`, `VIS.SECTION_COLOR`, `VIS.SECTION_NAME`. Helpers: `VIS.el(tag, cls, html)`, `VIS.esc(s)` (use it for
any text you put in innerHTML), `VIS.fmt(t)` ("3.4s"), `VIS.tc(t, fps)` ("00:03:12"), `VIS.thumb(layer)`.

## A 20-line example

```js
VIS.register('v3', {
  mount(host) {
    const ed = VIS.engine.editor(VIS.sample('beach'));
    let sel = null, t = 4;
    const f = VIS.phoneFrame(host, { name: 'Beach day', editor: 'quick' });
    function draw() {
      VIS.stage(f.stage, ed.doc, t, { selected: sel });
      VIS.drawQuick(f.timeline, ed.doc, { time: t, selected: sel,
        onTap: id => { sel = id; draw(); }, onScrub: x => { t = x; draw(); } });
      f.setTime(t, 30);
      if (sel && ed.read().isMain(sel)) VIS.toolbar(f.tray, VIS.CLIP_TRAY, { onClick: act });
      else f.tray.innerHTML = '<div class="fm-say">Tap a clip</div>';
    }
    function act(tool) {
      if (tool !== 'delete') return;
      const r = ed.run('deleteClip', { id: sel }); sel = null; draw();
      VIS.toast(f.root, r.say, { label: 'Undo', run: () => { ed.undo(); draw(); } });
    }
    draw();
  }
});
```
