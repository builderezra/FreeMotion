/* FreeMotion — the AI you can TALK TO (queue 856 clause 1).
 *
 * Ezra, 10 Sep: "we probably should make that more like [another app] one where you can just talk to her and
 * say what you want and then it goes and does it for you inside the edit". The Director (ai.js) builds
 * a WHOLE SCENE from one prompt and then stops. This is the other half — a conversation that edits the
 * project you already have, one sentence at a time, remembering what you said before it.
 *
 * ⚠️ IT DOES NOT GET ITS OWN ROUTE INTO THE SCENE. Every edit goes through FM.aiOps.applyOps — the same
 * closed, validated op vocabulary the Director uses, which ai-ops.js's own header calls "the ONLY code
 * that turns AI output into FM.scene mutations". The tempting shortcut was to let this file call
 * FM.deleteLayer / FM.cloneLayer straight from model output, because the op list has no word for
 * "delete that" and "delete that" is exactly what people say to [another app]. That would put a second,
 * UNVALIDATED path around the safety boundary — raw ids, no clamping, no cascade rules — and "an AI
 * wrecked my project, how do I undo it" is a question he has already had to ask once. So the four verbs
 * a conversation needs and a scene BUILDER never did — delete, duplicate, select, move the playhead —
 * were added to the VOCABULARY (ai-manifest.js OP_NAMES, validated in ai-ops.js) instead.
 *
 * ONE SENTENCE = ONE UNDO STEP. FM.history.mute() wraps the batch and one commit() closes it, so Ctrl+Z
 * takes back what you asked for rather than a third of it. (FM.deleteLayer commits on its own; inside
 * the mute that commit returns early, which is what mute is for.)
 *
 * THE SCENE IT CAN SEE is rebuilt from FM.scene on every turn and sent in the USER message, never in the
 * system prompt — the system block carries the 205-effect capability digest and is marked
 * cache_control: ephemeral, so keeping it byte-identical between turns is what stops every turn re-paying
 * for it. Volatile state in the user turn, stable vocabulary in the system turn.
 *
 * BYOK: the same key as the Director (FM.aiKey), the same endpoint, no backend, no server of ours.
 * Nothing leaves the device except a request to api.anthropic.com, and only when you press send.
 * Every string the model produces is rendered with textContent — never innerHTML.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  /* Sonnet, read from the Director's own table rather than written again here — one place decides what
     model this app talks to. A chat turn is short and has to follow a long instruction list exactly, so
     it wants the middle tier: Haiku drops ops, Opus costs several times the price for a sentence. */
  function model() { return (FM.ai && FM.ai.MODELS && FM.ai.MODELS.esc) || 'claude-sonnet-4-6'; }

  var MAX_TURNS = 24;          // transcript entries kept (12 exchanges) — older ones fall off the front
  var panelEl, listEl, inputEl, sendBtn, statusEl;
  var messages = [];           // the real Anthropic message array, tool_use/tool_result pairs and all
  var pendingResults = [];     // tool_result blocks owed to the model, prepended to the next user turn
  var busy = false;

  var PERSONA =
    'You are the editing assistant inside FreeMotion, a mobile-first motion-graphics editor. The user ' +
    'talks to you about the project they already have open and you make the edit for them.\n\n' +
    'HOW TO ANSWER:\n' +
    '· To CHANGE the project, call emit_ops with the operations that do it. Say in one short sentence ' +
    'what you did, in plain words — "Made the title bigger and gave it a soft glow." Never list op names ' +
    'or ids back at the user; they are looking at the screen, not at JSON.\n' +
    '· To ANSWER A QUESTION, or when you need to know which layer they mean, just reply in words and ' +
    'call nothing. Asking "which one — the title or the subtitle?" is better than guessing on a project ' +
    'you cannot undo for them.\n' +
    '· If something is genuinely outside what the operations can do (importing a video or a song, ' +
    'splitting a clip, grouping, audio effects), SAY SO plainly and name the manual route. Do not ' +
    'pretend with a near-miss edit.\n\n' +
    'WHICH LAYER THEY MEAN: "this", "it", "that" mean the SELECTED layer when there is one — its id is ' +
    'in selectedId. Otherwise match on name or on the text it shows. Pass the layer\'s real id as `ref`.\n\n' +
    'TASTE: keep text inside safe margins and legible against what is behind it. Prefer one confident ' +
    'change over five timid ones. When they ask for a feeling ("make it pop", "calmer") pick concrete ' +
    'values and tell them what you picked, so they can ask for more or less.\n\n' +
    'Times are seconds. Colours are #rrggbb. z is the stacking index and 0 is the FRONT. A layer\'s `animated` lists its ' +
    'keyframed transform channels and what each reads at the playhead.\n\n' +
    /* #1243 F2 — "the AI assistant button should be able to do everything". The one line that hands a whole scene to the builder. */
    'A WHOLE NEW VIDEO OR SCENE ("make me a 6 second product reel", "an intro for my channel") → call build_scene with their brief ' +
    '(and aspect, duration, pacing or style only when they said one). It plans, builds and reviews the whole scene in this project. ' +
    'Use emit_ops for changes to what is already there.';

  /* #1243 F2: the scene builder as a tool of the chat. Its fields are the Director's own chips (Style · Pacing · Duration · Aspect,
     js/ai-panel.js), so a scene asked for here is the same build the Director made. */
  var BUILD_SCENE = {
    name: 'build_scene',
    description: 'Build a whole new animated scene into the open project from a plain-language brief (FreeMotion\'s scene builder: it plans, builds every part and reviews the look). Use only when the user asks for a new video or scene, not for a change to what is there.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'the brief in the user\'s own words, with anything they said about it' },
        aspect: { type: 'string', enum: ['9:16', '16:9', '1:1', '4:5'], description: 'only if they asked for a shape' },
        duration: { type: 'number', description: 'seconds, only if they said a length' },
        pacing: { type: 'string', enum: ['slow', 'medium', 'fast'] },
        style: { type: 'string', description: 'a few words: punchy, elegant, retro…' },
      },
      required: ['prompt'],
    },
  };
  /* the tool's answer as the Director's chips — every field checked, since it comes from the model.
     ⚠️ THE SHAPE IS HIS, NEVER THE MODEL'S (F3 review, queue 690 hunt d). A chosen Aspect switches off generateScene's guard that
     keeps a project holding his own content at its size, and the Director's chip was HIS pick; here the model fills `aspect` and
     could read "reel" as 9:16 and turn his 16:9 project, clip and all, portrait. So the model's aspect is kept only when his own
     sentence names a shape, or the project is still empty (where the engine lets a plan size the canvas anyway). */
  var SHAPE_WORDS = /9\s*:\s*16|16\s*:\s*9|\b1\s*:\s*1\b|4\s*:\s*5|portrait|landscape|vertical|horizontal|square|widescreen/i;
  /* a sentence that asks for a whole NEW video (the no-key offer reads it; js/ai-mock.js chat answers a narrower one on the dry run) */
  var WANTS_SCENE = /\b(make|build|create|generate)\b.*\b(video|scene|reel|intro|outro|promo|advert|animation)\b|^\s*(an?|new)\b.*\b(video|scene|reel|intro|outro|promo|advert|animation|title|card)\b/i;
  function chipsFrom(input, prompt, said) {
    var c = {}, i = input || {};
    if (['9:16', '16:9', '1:1', '4:5'].indexOf(i.aspect) >= 0 && (SHAPE_WORDS.test(String(said || '')) || !FM.scene.layers.length)) c.aspect = i.aspect;
    var d = Number(i.duration);
    if (isFinite(d) && d >= 2 && d <= 60) c.duration = String(Math.round(d));
    if (['slow', 'medium', 'fast'].indexOf(i.pacing) >= 0) c.pacing = i.pacing;
    if (typeof i.style === 'string' && i.style.trim()) c.style = i.style.trim().slice(0, 60);
    var subj = String(prompt || '').split(/[.,\n]/)[0].trim().slice(0, 60);
    if (subj) c.subject = subj;
    return c;
  }

  /* What is on screen RIGHT NOW. layerSummary() in ai.js emits {id,type,name,x,y}, which cannot answer
     "make this bigger" — no selection, no time, no duration, no text, no effect list. This is the block
     that makes a pronoun resolvable. */
  function sceneBlock() {
    var s = FM.scene, P = s.project;
    var layers = s.layers.map(function (l, i) {
      var o = { id: l.id, z: i, type: l.type, name: l.name, start: r2(l.start), duration: r2(l.duration) };
      if (l.type === 'text' && l.text) o.text = String(l.text).slice(0, 120);
      if (l.parent) o.parent = l.parent;
      var fx = (l.effects || []).map(function (e) { return e.type; });
      if (fx.length) o.effects = fx;
      /* queue 690 (hunt d): WHICH CHANNELS MOVE, and what each reads at the playhead. Without this the model had no way
         to know a Director title's size was keyframed, so "make it bigger" flattened its pop-in. A setProp on one of
         these now moves the whole animation to read that value here (js/ai-ops.js setNumericPath), so the number it
         is measured against is the one worth sending. Only animated channels, so a still project costs nothing. */
      var tr = l.transform || {}, anim = null;
      Object.keys(tr).forEach(function (k) { if (FM.isAnimated && FM.isAnimated(tr[k])) { anim = anim || {}; anim[k] = r2(FM.evalProp(tr[k], FM.time)); } });
      if (anim) o.animated = anim;
      if (l.visible === false) o.hidden = true;
      if (l.locked) o.locked = true;
      if (l.id === s.selectedId) o.selected = true;
      return o;
    });
    return 'CURRENT PROJECT — live, this is what is on their screen this second:\n' +
      JSON.stringify({
        project: { width: P.width, height: P.height, fps: P.fps, duration: r2(P.duration), background: P.background },
        playhead: r2(FM.time),
        selectedId: s.selectedId || null,
        layers: layers,
      });
  }

  // ---------- transcript UI ----------
  function bubble(who, text) {
    var b = el('div', 'aic-msg aic-' + who);
    b.appendChild(el('div', 'aic-bubble', text));   // textContent — nothing the model says can inject markup
    listEl.appendChild(b);
    listEl.scrollTop = listEl.scrollHeight;
    return b;
  }
  function note(text, cls) {
    var n = el('div', 'aic-note' + (cls ? ' ' + cls : ''), text);
    listEl.appendChild(n);
    listEl.scrollTop = listEl.scrollHeight;
    return n;
  }

  /* #1243 F2: THE BUILD, REPORTED IN THE CHAT. js/ai.js generateScene reports through a sink (reset/row/note/done/error, the
     Director panel's shape); this one draws each agent row as an .aic-note that updates in place — Interpreter, Director, the
     builders, the critic — then says how it went in a bubble. Every word is textContent: labels come from the plan the MODEL wrote. */
  var MARK = { queued: '·', active: '…', streaming: '…', done: '✓', skipped: '–' };
  /* F3 review: the rows are lines in HIS chat, so they say what happened in his words. The engine's tags (Interpreter · Haiku,
     Director · Opus, "4 ops", "used scaffold") were small chips on the Director panel; here they would be jargon, and they
     brought back the word Director right after its door went. */
  function rowMeta(state, count, tag) {
    if (state === 'skipped') return tag === 'budget cap' ? 'stopped at your spending cap' : 'skipped';
    return state === 'done' && count ? count + (count === 1 ? ' change' : ' changes') : '';
  }
  function chatSink() {
    var rows = {}, stop = null;
    var sink = {
      outcome: '',
      reset: function () {
        rows = {};
        if (stop) stop.remove();
        stop = el('button', 'aic-linkbtn aic-stop', 'Stop and keep what’s built');
        stop.type = 'button';
        stop.addEventListener('click', function () { if (FM.ai && FM.ai.cancel) FM.ai.cancel(); stop.disabled = true; stop.textContent = 'Finishing…'; });
        listEl.appendChild(stop);
        listEl.scrollTop = listEl.scrollHeight;
      },
      row: function (id, label, state, count, tag) {
        var r = rows[id];
        if (!r) { r = el('div', 'aic-note aic-row'); rows[id] = r; listEl.insertBefore(r, stop && stop.isConnected ? stop : null); }
        r.className = 'aic-note aic-row aic-row-' + (state || 'queued');
        var meta = rowMeta(state, count, tag);
        r.textContent = (MARK[state] || '·') + ' ' + (label || '') + (meta ? ' · ' + meta : '');
        listEl.scrollTop = listEl.scrollHeight;
      },
      note: function (msg) { note(msg); },
      done: function (info) {
        if (stop) { stop.remove(); stop = null; }
        info = info || {};
        var n = info.layersAdded || 0;
        var msg = info.left ? 'Stopped: you opened another project. What was built is kept in “' + info.left + '”.'
          : info.cancelled ? 'Stopped. I kept what was built.'
          : 'Built it: ' + n + (n === 1 ? ' layer' : ' layers') + ', all editable. One Undo takes the whole build back.';
        sink.outcome = info.left ? 'stopped: the user opened another project' : info.cancelled ? 'stopped by the user, kept what was built' : 'built the scene: ' + n + ' layers added';
        bubble('ai', msg);
      },
      error: function (msg) {
        if (stop) { stop.remove(); stop = null; }
        sink.outcome = 'the build failed: ' + (msg || 'error');
        note(msg || 'The scene build went wrong.', 'aic-err');
      },
    };
    return sink;
  }
  /* run one build_scene call (or the no-key demo) with the chat as its sink; resolves to the line the model is told */
  async function runBuild(prompt, chips, extra) {
    prompt = String(prompt || '').trim().slice(0, 600);
    if (!prompt) return 'not run: no brief was given';
    if (FM.ai.isRunning && FM.ai.isRunning()) { note('A scene is already being built. Ask again when it finishes.', 'aic-warn'); return 'not run: another build is still running'; }
    var sink = chatSink();
    var res = await FM.ai.generateScene(prompt, chips || {}, Object.assign({ sink: sink }, extra || {}));
    return sink.outcome || (res && res.error ? 'the build failed' : 'built');
  }

  function setBusy(on) {
    busy = on;
    if (sendBtn) sendBtn.disabled = on;
    if (inputEl) inputEl.disabled = on;
    if (statusEl) statusEl.textContent = on ? 'Thinking…' : '';
  }

  /* A turn's edits, applied as ONE undo step through the one validated door. Returns a plain-English
     line about what landed, or null when the model only talked. */
  function applyTurn(ops) {
    if (!ops || !ops.length) return null;
    var res;
    FM.history.mute();
    /* queue 921 S0: …and bracketed as a JOB (spec §8.9). A turn is a batch of edits with the document
       part-changed between them, exactly like a paste — collab stands down while jobDepth is up, so a
       diff cannot send half a turn. Costs a counter when no session is running. */
    var job = FM.jobBegin ? FM.jobBegin('ai applyTurn') : null;
    try {
      res = FM.aiOps.applyOps(ops, {});
    } finally {
      if (FM.jobEnd) FM.jobEnd(job);
      FM.history.unmute();
    }
    FM.refreshAll();
    FM.history.commit();
    var n = res.appliedCount, d = res.dropped.length;
    if (!n && !d) return null;
    var line = n + (n === 1 ? ' change' : ' changes') + ' applied';
    if (d) {
      /* Say WHAT was skipped and why. A silent drop is how "I asked for it and nothing happened"
         happens, and applyOps already knows the reason — it just had nowhere to say it. */
      var why = res.dropped.slice(0, 3).map(function (x) { return (x.op || 'op') + ': ' + x.reason; }).join('; ');
      line += ' · ' + d + ' skipped (' + why + (d > 3 ? '; …' : '') + ')';
    }
    return line;
  }

  async function send() {
    var text = (inputEl.value || '').trim();
    if (!text || busy) return;
    if (KEYLIKE.test(text)) {
      inputEl.value = ''; autosize();
      note('That looks like your API key. It goes in Settings → AI key, never in the chat. Nothing was sent.', 'aic-warn');
      var kb = el('button', 'aic-linkbtn', 'Open Settings → AI key');
      kb.type = 'button'; kb.addEventListener('click', openKeySettings);
      listEl.appendChild(kb); listEl.scrollTop = listEl.scrollHeight;
      return;
    }

    if (!FM.ai.DRY_RUN && !FM.aiKey.has()) {
      /* F3 review: the two key-less builds are offered only for a sentence that asks for a NEW video — under "make the title
         bigger" a starter scene titled "make the title bigger" is not what he asked for — and each builds once per tap row. */
      var scene = WANTS_SCENE.test(text);
      note(scene ? 'Connect your Anthropic key first. It goes in Settings → AI key. Without one I can still build a starter scene from what you wrote, or show you a demo.'
        : 'Connect your Anthropic key first. It goes in Settings → AI key. Changes need it; without one I can only build a starter scene, if you ask for a whole new video.', 'aic-warn');
      var row = el('div', 'aic-btnrow');
      var b = el('button', 'aic-linkbtn', 'Add your key in Settings');
      b.type = 'button';
      b.addEventListener('click', openKeySettings);   // queue 930: Settings, not the Director
      row.appendChild(b);
      if (scene) {
        /* #1243 F2: the Director's two key-less doors, now here — "the AI assistant button should be able to do everything" */
        var tb = el('button', 'aic-linkbtn aic-tmpl', 'Build a scene without a key');
        var db = el('button', 'aic-linkbtn aic-demo', 'Watch a demo');
        tb.type = 'button'; db.type = 'button';
        tb.addEventListener('click', function () {
          if (tb.disabled || (FM.ai.isRunning && FM.ai.isRunning())) return;
          tb.disabled = true; db.disabled = true;   // one build per offer; ask again for another
          var r = FM.aiTemplates.build(chipsFrom({}, text));   // one undo step (ai-templates.js commits once)
          note('Built a starter scene: ' + r.applied + ' changes, all editable. One Undo takes it back.', 'aic-applied');
        });
        db.addEventListener('click', async function () {
          if (busy || db.disabled || (FM.ai.isRunning && FM.ai.isRunning())) return;
          tb.disabled = true; db.disabled = true;
          setBusy(true);
          try { await runBuild((FM.aiPanel && FM.aiPanel.demoPrompt) || text, {}, { dryRun: true }); }   // the mock: no key, no spend
          finally { setBusy(false); }
        });
        row.appendChild(tb); row.appendChild(db);
      }
      listEl.appendChild(row);
      listEl.scrollTop = listEl.scrollHeight;
      return;
    }

    inputEl.value = '';
    autosize();
    bubble('me', text);
    setBusy(true);

    // the user turn: any tool_result we still owe, then the live scene, then what they said
    var owed = pendingResults;   // kept until this turn has an answer — see the catch below (queue 690, hunt d)
    var content = owed.slice();
    pendingResults = [];
    content.push({ type: 'text', text: sceneBlock() + '\n\nTHEY SAID: ' + text });
    var turn = { role: 'user', content: content };
    messages.push(turn);

    /* queue 690 (hunt f): the project this sentence was about. The reply takes seconds, the Assistant can be
       closed while it thinks, and Home → another project in that time used to get this project's edits applied
       to IT (anything that adds a layer lands; ops naming this project's layers are dropped). */
    var home = FM.storage && FM.storage.openProjectId ? FM.storage.openProjectId() : null;
    try {
      var r;
      if (FM.ai.DRY_RUN) {
        r = FM.aiMock.chat(text, FM.scene);
      } else {
        r = await FM.ai.call(model(), FM.aiManifest.digest + '\n\n' + PERSONA, messages,
          [FM.aiManifest.tools.ops, BUILD_SCENE], { toolChoice: { type: 'auto' }, maxTokens: 1600 });   // #1243 F2: and the scene builder
      }

      var blocks = r.content || [];
      var said = blocks.filter(function (b) { return b.type === 'text'; })
                       .map(function (b) { return b.text; }).join('\n').trim();
      var uses = blocks.filter(function (b) { return b.type === 'tool_use'; });

      messages.push({ role: 'assistant', content: blocks });

      var ops = [], builds = [];
      uses.forEach(function (u) {
        if (u.name === 'build_scene') builds.push(u);   // #1243 F2: a whole scene goes to the builder, never through applyTurn
        else if (u.input && Array.isArray(u.input.ops)) ops = ops.concat(u.input.ops);
      });
      var moved = home != null && FM.storage.openProjectId() !== home;   // queue 690: he opened another project meanwhile
      var summary = moved ? null : applyTurn(ops);

      if (said) bubble('ai', said);
      else if (!summary && !moved && !builds.length) bubble('ai', 'Done.');
      if (moved && (ops.length || builds.length)) note('Not applied: you opened another project while I was answering. Ask again here if you want it in this one.', 'aic-warn');
      if (summary) note(summary, 'aic-applied');

      /* #1243 F2: ONE build per sentence, its rows drawn here (chatSink), its own one undo step (generateScene commits once — it is
         never inside applyTurn's mute). A second build_scene in the same reply is answered, not run. */
      var built = {};
      if (!moved && builds.length) {
        built[builds[0].id] = await runBuild(builds[0].input && builds[0].input.prompt, chipsFrom(builds[0].input, builds[0].input && builds[0].input.prompt, text));
        builds.slice(1).forEach(function (u) { built[u.id] = 'not run: one scene at a time'; });
      }

      // every tool_use must be answered, or the NEXT request is rejected by the API
      uses.forEach(function (u) {
        pendingResults.push({ type: 'tool_result', tool_use_id: u.id, content: moved ? 'not applied: the user opened a different project before this arrived' : (built[u.id] || summary || 'applied') });
      });

      trim();
    } catch (e) {
      /* The turn failed, so the transcript must not keep a user message the model never answered —
         the next send would post two user turns in a row and the API would reject the lot.
         ⚠️ AND THE ANSWERS IT WAS CARRYING GO BACK WHERE THEY CAME FROM (queue 690, hunt d). That user turn was the
         ONLY copy of the tool_result owed for the edit Claude made one turn earlier (pendingResults was emptied into
         it above). Popping it threw that away, and the history was left ending in an edit nothing answered — which
         the API refuses with a 400 on EVERY later request ("tool_use ids were found without tool_result blocks").
         So one dropped connection, one overloaded reply or one cut-off answer broke the Assistant until the app was
         restarted: nothing in the app calls reset(). Cut back to exactly where this turn began (by identity, so it
         also takes a reply that landed before something later threw) and owe the same answers again; a result for a
         reply that is now cut away is dropped with it, since answering an edit the history no longer holds is also
         a 400. */
      var at = messages.indexOf(turn);
      if (at >= 0) messages.length = at;
      pendingResults = owed;
      note((e && e.message) || 'Something went wrong reaching Claude.', 'aic-err');
    } finally {
      setBusy(false);
      /* ⚠️ ONLY WHEN IT IS OPEN (queue 930 security review, high). A reply that lands while the Assistant is hidden — he
         tapped "API key" while it was thinking — used to focus this hidden box, so the key he then pasted for Settings
         went HERE, and Enter sent his key to the model as a chat message. */
      if (canTakeFocus()) inputEl.focus({ preventScroll: true });   // #1243 F3: no pan of the page up to the field
    }
  }

  /* Keep the transcript bounded, and never cut between an assistant tool_use and its tool_result —
     a dangling pair is rejected by the API, which would break the chat for the rest of the session. */
  function trim() {
    while (messages.length > MAX_TURNS) {
      messages.shift();
      while (messages.length && messages[0].role !== 'user') messages.shift();
      var first = messages[0];
      if (first && Array.isArray(first.content) && first.content.length && first.content[0].type === 'tool_result') {
        first.content = first.content.filter(function (b) { return b.type !== 'tool_result'; });
        if (!first.content.length) messages.shift();
      }
    }
  }

  // ---------- panel ----------
  function autosize() {
    if (!inputEl) return;
    inputEl.style.height = 'auto';
    /* #1243 F3: three lines (72 px) while the keyboard is up — the box grows into the transcript, never past the line, and never
       taller than the room the panel has between its slim header and the keyboard (about 104 px on an 800 px phone) */
    var cap = 120;
    if (panelEl && panelEl.classList.contains('aic-typing')) {
      var head = panelEl.querySelector('.aic-head'), comp = inputEl.parentNode, cs = getComputedStyle(comp);
      var room = panelEl.clientHeight - (head ? head.offsetHeight : 0) - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0) - 10;
      cap = Math.max(38, Math.min(72, room));
    }
    inputEl.style.height = Math.min(cap, inputEl.scrollHeight) + 'px';
  }

  /* ═══ #1243 F3 — THE PANEL STOPS AT THE ADD MENU'S LINE, ALSO WHILE TYPING ════════════════════════════════════════════════════
     His words, 8 Nov: "when you open up the AI assistant menu, it like takes up the whole screen. And then when you start actually
     typing into it, then that goes up even more as well. I think you could probably condense it so it only covers up like the same
     amount of area that the add menu comes up to."
     It was a 74svh sheet from the bottom, so it rose far above the Add menu's top, and while typing the compose row padded itself
     by the keyboard and iOS panned the page up to the field. On a phone now: its top is THE SHEET LINE, FM.mobile.sheetLine() —
     the stage's bottom edge, the same line the Add sheet's top is (js/mobile.js syncAddSheetTop) — and its BOTTOM is lifted
     above the keyboard (FM.kbInset), so the top never moves and the transcript shrinks instead. The field is focused without a
     scroll, and if iOS pans the visual viewport anyway (offsetTop > 0) the top is moved down by the same amount, so on the screen
     it stays put. While the keyboard is up the header folds to a slim row and the box keeps to three lines (1243-D F3's
     RECOMMENDED pick A: the transcript keeps the newest reply in view and scrolls). PC keeps its right-hand column, unchanged. */
  var unwatch = null, stageRO = null;
  function phone() { return !!(FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone()); }
  function place() {
    if (!panelEl) return;
    var kb = FM.kbInset ? FM.kbInset() : 0;
    var kbWas = panelEl.style.getPropertyValue('--aic-kb');
    panelEl.style.setProperty('--aic-kb', kb + 'px');
    var vv = window.visualViewport, off = vv && vv.offsetTop > 0 ? Math.round(vv.offsetTop) : 0;
    /* F3 review: iOS may PAN the page up to the field instead of shrinking it, which leaves kbInset at about 0 and the panel's room
       just as small (its top moves down by the pan, below) — so a pan while he is in the box is the keyboard too */
    var typing = phone() && (kb > 0 || (off > 0 && !!inputEl && document.activeElement === inputEl));
    var typingWas = panelEl.classList.contains('aic-typing');
    panelEl.classList.toggle('aic-typing', typing);
    if (!phone()) { panelEl.style.removeProperty('--aic-top'); return; }
    var line = FM.mobile.sheetLine ? FM.mobile.sheetLine() : 0;
    if (line > 0) panelEl.style.setProperty('--aic-top', (line + off) + 'px');
    else panelEl.style.removeProperty('--aic-top');
    if (kbWas !== kb + 'px' || typingWas !== typing) { autosize(); if (listEl) listEl.scrollTop = listEl.scrollHeight; }   // the newest reply stays in view
  }
  function watchPlace() {
    unwatchPlace();
    if (FM.screen && FM.screen.watch) unwatch = FM.screen.watch(place);
    var st = document.getElementById('stage');
    if (st && window.ResizeObserver) { stageRO = new ResizeObserver(function () { place(); }); stageRO.observe(st); }
  }
  function unwatchPlace() {
    if (unwatch) { try { unwatch(); } catch (e) {} unwatch = null; }
    if (stageRO) { try { stageRO.disconnect(); } catch (e) {} stageRO = null; }
  }

  function build() {
    panelEl = el('div'); panelEl.id = 'ai-chat';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-label', 'Ask & edit');   // #1243 F2: the new name, everywhere he can meet it

    var grab = el('button', 'aic-grab'); grab.type = 'button'; grab.setAttribute('aria-label', 'Close Ask & edit');
    grab.appendChild(el('span', 'grab-bar'));
    grab.addEventListener('click', hide);
    panelEl.appendChild(grab);

    var head = el('div', 'aic-head');
    var title = el('div', 'aic-title');
    title.appendChild(el('span', 'aic-spark', '✦'));
    title.appendChild(el('span', null, 'Ask & edit'));
    head.appendChild(title);
    statusEl = el('span', 'aic-status', '');
    head.appendChild(statusEl);
    /* #1243 F2: what the builds and replies have cost on his key so far (an estimate, FM.aiBudget), beside API key — the Director's
       budget ring, which went with AI Scene.
       ⚠️ A RUNNING TOTAL (F3 review). FM.aiBudget is the BUILD's meter — generateScene resets it as each build starts, because its
       spending cap is per build — so reading it here dropped every reply's cost back to 0 the moment a build began. This sums the
       meter's rises since the app opened: a reset is read as starting again from 0, never as money given back. */
    var spentHere = 0, meterWas = FM.aiBudget ? FM.aiBudget.spentCents() : 0;
    var spendLabel = function (c) { return c < 1 ? c.toFixed(2) + '¢' : c.toFixed(1) + '¢'; };
    var spend = el('span', 'aic-spend', spendLabel(0));
    spend.title = 'Estimated spend on your key since the app opened'; spend.setAttribute('aria-label', 'Estimated spend on your key since the app opened');
    if (FM.aiBudget && FM.aiBudget.onChange) FM.aiBudget.onChange(function () {
      var now = FM.aiBudget.spentCents();
      if (now < meterWas) meterWas = 0;   // the meter was reset (a build started)
      spentHere += now - meterWas; meterWas = now;
      spend.textContent = spendLabel(spentHere);
    });
    head.appendChild(spend);
    /* The key's door, always in the header (queue 930: "a button in both pages that takes you to app settings"). */
    var keyBtn = el('button', 'aic-keybtn', 'API key');
    keyBtn.type = 'button'; keyBtn.title = 'Your Anthropic key, in Settings'; keyBtn.setAttribute('aria-label', 'API key settings');
    keyBtn.addEventListener('click', openKeySettings);
    head.appendChild(keyBtn);
    var close = el('button', 'aic-close', '✕');
    close.type = 'button'; close.title = 'Close'; close.setAttribute('aria-label', 'Close Ask & edit');
    if (FM.drawnX) FM.drawnX(close, 22);   // queue 965: one drawn ✕ for the app
    close.addEventListener('click', hide);
    head.appendChild(close);
    panelEl.appendChild(head);

    listEl = el('div', 'aic-list');
    panelEl.appendChild(listEl);

    var comp = el('div', 'aic-compose');
    inputEl = document.createElement('textarea');
    inputEl.className = 'aic-input';
    inputEl.rows = 1;
    /* #1243 F2: it does both now. Short enough for ONE line in the PC column and on a 380 px phone (24 Nov: the longer hint wrapped
       in the 376 px column and its second line was cut by the one-row box) */
    inputEl.placeholder = 'Ask for a change or a new video…';
    inputEl.setAttribute('aria-label', 'Tell Ask & edit what to change or make');
    inputEl.addEventListener('input', autosize);
    inputEl.addEventListener('focus', function () { if (isOpen()) place(); });   // F3 review: a pan while in the box is typing (place)
    inputEl.addEventListener('blur', function () { if (isOpen()) place(); });
    inputEl.addEventListener('keydown', function (e) {
      // Enter sends, Shift+Enter is a new line. Never send mid-IME composition.
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    });
    comp.appendChild(inputEl);
    sendBtn = el('button', 'aic-send');
    sendBtn.type = 'button'; sendBtn.title = 'Send'; sendBtn.setAttribute('aria-label', 'Send');
    sendBtn.textContent = '↑';
    sendBtn.addEventListener('click', send);
    comp.appendChild(sendBtn);
    panelEl.appendChild(comp);

    document.body.appendChild(panelEl);
    panelEl.inert = true;   // built closed, so unreachable from the start — not only after the first hide (queue 930 review)

    /* The on-screen keyboard does not change window.innerHeight, only the visual viewport — so a bottom
       sheet whose text field is at the bottom sits UNDER the keyboard without this. FM.kbInset is the
       app's existing answer (queue 814) and is exported precisely so a headless suite can drive it.
       #1243 F3: place() reads it, with the sheet line, on every visual-viewport, window and stage change while the panel is open
       (watchPlace in show, taken down in hide). */

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !panelEl.classList.contains('open')) return;
      e.stopPropagation();
      hide();
    });

    greet();
  }

  function greet() {
    /* #1243 F2: it builds scenes too. Three plain sentences and no long dash (his words of 24 Nov on a line with one: "it just
       looks written by AI") */
    note('Tell me what to change and I will do it: "make the title bigger", "give it a soft glow", ' +
         '"start it half a second later". Or ask for a whole new video: "make a 6 second product reel".');
  }

  /* THE CHAT BOX TAKES THE FOCUS ONLY WHEN NOTHING ELSE HAS IT (queue 930 review, round 2). "Only when open" was not enough:
     opened through the cog → App settings, Settings covers an OPEN Assistant, and a reply landing then pulled the focus out of
     the Settings key field — a pasted key and Enter would go to the chat. So: open, Settings not up, and the focus is on
     nothing or already in this panel. */
  function canTakeFocus() {
    if (!inputEl || !isOpen()) return false;
    if (FM.settings && FM.settings.isOpen && FM.settings.isOpen()) return false;
    var a = document.activeElement;
    return !a || a === document.body || a === document.documentElement || panelEl.contains(a);
  }
  /* A KEY IS NEVER A CHAT MESSAGE (queue 930 review, round 2). js/ai-key.js promises the key is never put in a message body;
     a key pasted here by mistake — the note above the box says "connect your key" — would have been sent to the model, shown
     as a bubble and re-sent with every later turn. */
  var KEYLIKE = /\bsk-ant-[A-Za-z0-9_\-]{16,}/;
  function openKeySettings() {
    hide();
    if (FM.settings && FM.settings.openAt) FM.settings.openAt('aikey', { onClose: show });   // and it comes back when Settings closes
  }
  function show() {
    if (!panelEl) build();
    // ONE AI PANEL AT A TIME (queue 930) — see js/ai-panel.js show()
    if (FM.aiPanel && FM.aiPanel.isOpen && FM.aiPanel.isOpen()) FM.aiPanel.hide();
    if (FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone() && FM.mobile.close) FM.mobile.close();
    place();   // #1243 F3: on the sheet line before it slides, so it rises straight to it
    panelEl.classList.add('open');
    panelEl.inert = false;
    document.body.classList.add('aic-open');
    watchPlace();
    requestAnimationFrame(place);   // the layer sheet closing (FM.mobile.close above) can move the stage a frame later
    setTimeout(function () { if (canTakeFocus()) inputEl.focus({ preventScroll: true }); }, 120);   // #1243 F3: no pan up to the field
  }
  function hide() {
    if (!panelEl) return;
    panelEl.classList.remove('open');
    panelEl.inert = true;   // closed = unreachable: nothing can focus or type into it off screen (queue 930 review)
    document.body.classList.remove('aic-open');
    if (inputEl) inputEl.blur();
    unwatchPlace();   // #1243 F3
  }
  function toggle() { (panelEl && panelEl.classList.contains('open')) ? hide() : show(); }
  function isOpen() { return !!(panelEl && panelEl.classList.contains('open')); }

  /* Ask about a specific layer: select it first so "this" resolves, then open with the composer primed. */
  function askAbout(id) {
    if (id && FM.selectLayer) FM.selectLayer(id);
    show();
  }

  function reset() {
    messages = []; pendingResults = [];
    if (listEl) { listEl.textContent = ''; greet(); }
  }

  FM.aiChat = {
    show: show, hide: hide, toggle: toggle, isOpen: isOpen, askAbout: askAbout, reset: reset,
    send: send, _messages: function () { return messages; }, _scene: sceneBlock, _apply: applyTurn,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})(window.FM);
