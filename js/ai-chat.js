/* FreeMotion — the AI you can TALK TO (queue 856 clause 1).
 *
 * Ezra, 10 Sep: "we probably should make that more like CapCut one where you can just talk to her and
 * say what you want and then it goes and does it for you inside the edit". The Director (ai.js) builds
 * a WHOLE SCENE from one prompt and then stops. This is the other half — a conversation that edits the
 * project you already have, one sentence at a time, remembering what you said before it.
 *
 * ⚠️ IT DOES NOT GET ITS OWN ROUTE INTO THE SCENE. Every edit goes through FM.aiOps.applyOps — the same
 * closed, validated op vocabulary the Director uses, which ai-ops.js's own header calls "the ONLY code
 * that turns AI output into FM.scene mutations". The tempting shortcut was to let this file call
 * FM.deleteLayer / FM.cloneLayer straight from model output, because the op list has no word for
 * "delete that" and "delete that" is exactly what people say to CapCut. That would put a second,
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
    'Times are seconds. Colours are #rrggbb. z is the stacking index and 0 is the FRONT.';

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

    if (!FM.ai.DRY_RUN && !FM.aiKey.has()) {
      note('Connect your Anthropic key first — it is the same key the Director uses.', 'aic-warn');
      var b = el('button', 'aic-linkbtn', 'Connect a key');
      b.type = 'button';
      b.addEventListener('click', function () { if (FM.aiPanel) FM.aiPanel.show(); });
      listEl.appendChild(b);
      listEl.scrollTop = listEl.scrollHeight;
      return;
    }

    inputEl.value = '';
    autosize();
    bubble('me', text);
    setBusy(true);

    // the user turn: any tool_result we still owe, then the live scene, then what they said
    var content = pendingResults.slice();
    pendingResults = [];
    content.push({ type: 'text', text: sceneBlock() + '\n\nTHEY SAID: ' + text });
    messages.push({ role: 'user', content: content });

    try {
      var r;
      if (FM.ai.DRY_RUN) {
        r = FM.aiMock.chat(text, FM.scene);
      } else {
        r = await FM.ai.call(model(), FM.aiManifest.digest + '\n\n' + PERSONA, messages,
          FM.aiManifest.tools.ops, { toolChoice: { type: 'auto' }, maxTokens: 1600 });
      }

      var blocks = r.content || [];
      var said = blocks.filter(function (b) { return b.type === 'text'; })
                       .map(function (b) { return b.text; }).join('\n').trim();
      var uses = blocks.filter(function (b) { return b.type === 'tool_use'; });

      messages.push({ role: 'assistant', content: blocks });

      var ops = [];
      uses.forEach(function (u) { if (u.input && Array.isArray(u.input.ops)) ops = ops.concat(u.input.ops); });
      var summary = applyTurn(ops);

      // every tool_use must be answered, or the NEXT request is rejected by the API
      uses.forEach(function (u) {
        pendingResults.push({ type: 'tool_result', tool_use_id: u.id, content: summary || 'applied' });
      });

      if (said) bubble('ai', said);
      else if (!summary) bubble('ai', 'Done.');
      if (summary) note(summary, 'aic-applied');

      trim();
    } catch (e) {
      /* The turn failed, so the transcript must not keep a user message the model never answered —
         the next send would post two user turns in a row and the API would reject the lot. */
      messages.pop();
      note((e && e.message) || 'Something went wrong reaching Claude.', 'aic-err');
    } finally {
      setBusy(false);
      if (inputEl) inputEl.focus();
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
    inputEl.style.height = Math.min(120, inputEl.scrollHeight) + 'px';
  }

  function build() {
    panelEl = el('div'); panelEl.id = 'ai-chat';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-label', 'AI assistant');

    var grab = el('button', 'aic-grab'); grab.type = 'button'; grab.setAttribute('aria-label', 'Close assistant');
    grab.appendChild(el('span', 'grab-bar'));
    grab.addEventListener('click', hide);
    panelEl.appendChild(grab);

    var head = el('div', 'aic-head');
    var title = el('div', 'aic-title');
    title.appendChild(el('span', 'aic-spark', '✦'));
    title.appendChild(el('span', null, 'Assistant'));
    head.appendChild(title);
    statusEl = el('span', 'aic-status', '');
    head.appendChild(statusEl);
    var close = el('button', 'aic-close', '✕');
    close.type = 'button'; close.title = 'Close'; close.setAttribute('aria-label', 'Close assistant');
    close.addEventListener('click', hide);
    head.appendChild(close);
    panelEl.appendChild(head);

    listEl = el('div', 'aic-list');
    panelEl.appendChild(listEl);

    var comp = el('div', 'aic-compose');
    inputEl = document.createElement('textarea');
    inputEl.className = 'aic-input';
    inputEl.rows = 1;
    inputEl.placeholder = 'Tell me what to change…';
    inputEl.setAttribute('aria-label', 'Tell the assistant what to change');
    inputEl.addEventListener('input', autosize);
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

    /* The on-screen keyboard does not change window.innerHeight, only the visual viewport — so a bottom
       sheet whose text field is at the bottom sits UNDER the keyboard without this. FM.kbInset is the
       app's existing answer (queue 814) and is exported precisely so a headless suite can drive it. */
    if (window.visualViewport) {
      var kb = function () { panelEl.style.setProperty('--aic-kb', (FM.kbInset ? FM.kbInset() : 0) + 'px'); };
      window.visualViewport.addEventListener('resize', kb);
      window.visualViewport.addEventListener('scroll', kb);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !panelEl.classList.contains('open')) return;
      e.stopPropagation();
      hide();
    });

    greet();
  }

  function greet() {
    note('Tell me what to change and I will do it — "make the title bigger", "give it a soft glow", ' +
         '"start it half a second later". Tap a layer first and "this" means that one.');
  }

  function show() {
    if (!panelEl) build();
    if (FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone() && FM.mobile.close) FM.mobile.close();
    panelEl.classList.add('open');
    document.body.classList.add('aic-open');
    setTimeout(function () { if (inputEl) inputEl.focus(); }, 120);
  }
  function hide() {
    if (!panelEl) return;
    panelEl.classList.remove('open');
    document.body.classList.remove('aic-open');
    if (inputEl) inputEl.blur();
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
