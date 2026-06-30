/* FreeMotion — AI "Director" orchestrator.
 *
 * Turns a plain-language prompt into a real, editable FM.scene via a visible multi-agent pipeline:
 *   Interpreter (Haiku) → Director/Planner (Opus) → parallel Builders (Haiku) → Vision Critic (Opus)
 * Every model output is a forced tool_use call whose JSON is run through FM.aiOps.applyOps (the only
 * code that mutates the scene). The whole build is ONE undo step. All fetches go ONLY to
 * api.anthropic.com with the user's BYOK key. FM.ai.DRY_RUN routes every call to FM.aiMock — zero
 * network, zero tokens — so the pipeline can be demoed and tested without a key.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  var MODELS = { intent: 'claude-haiku-4-5', plan: 'claude-opus-4-8', build: 'claude-haiku-4-5', esc: 'claude-sonnet-4-6', critic: 'claude-opus-4-8' };
  var ENDPOINT = 'https://api.anthropic.com/v1/messages';

  var state = { running: false, abort: false, dry: false };

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function panel() { return FM.aiPanel || { reset: function () {}, row: function () {}, done: function () {}, error: function () {}, note: function () {} }; }

  // ---- one forced-tool call. Returns { out: <tool input object>, stop }. ----
  async function call(model, system, messages, tool, opts) {
    opts = opts || {};
    if (FM.ai.DRY_RUN || state.dry) { await sleep(opts.dryDelay || 240); return { out: FM.aiMock.respond(tool.name, opts.mock || {}), stop: 'mock' }; }
    var key = FM.aiKey.get();
    if (!key) throw new Error('No API key');
    var attempt = opts.attempt || 0;
    var res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model,
          max_tokens: opts.maxTokens || 2048,
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          tools: [tool],
          tool_choice: { type: 'tool', name: tool.name },
          messages: messages,
        }),
      });
    } catch (e) {
      // network error → retry a few times
      if (attempt < 4 && !state.abort) { await sleep((2 ** attempt) * 800 + Math.random() * 300); return call(model, system, messages, tool, Object.assign({}, opts, { attempt: attempt + 1 })); }
      throw new Error('Network error reaching Claude');
    }
    if (!res.ok) {
      if ((res.status === 429 || res.status >= 500) && attempt < 5 && !state.abort) {
        var ra = Number(res.headers.get('retry-after')) || (2 ** attempt);
        await sleep(ra * 1000 + Math.random() * 400);
        var m = res.status === 529 ? MODELS.build : model;   // overloaded → drop a tier
        return call(m, system, messages, tool, Object.assign({}, opts, { attempt: attempt + 1 }));
      }
      var info = {}; try { info = await res.json(); } catch (e) {}
      var msg = (info && info.error && info.error.message) || res.statusText;
      if (res.status === 401) msg = 'Check your API key — it was rejected (401).';
      else if (res.status === 403) msg = 'Your key lacks access to that model (403).';
      throw new Error(msg);   // 400/401/403 → no retry; never logs the request body or key
    }
    var data = await res.json();
    if (FM.aiBudget) FM.aiBudget.add(data.usage, model);
    var block = (data.content || []).find(function (b) { return b.type === 'tool_use'; });
    if (data.stop_reason === 'max_tokens') throw new Error('Output truncated (max_tokens)');
    return { out: block ? block.input : null, stop: data.stop_reason };
  }

  // ---- render the current scene to a small base64 PNG for the vision critic (token-thrifty) ----
  function renderToBase64(scene, t, maxEdge) {
    maxEdge = maxEdge || 512;
    var P = scene.project;
    var full = document.createElement('canvas'); full.width = P.width; full.height = P.height;
    try { FM.renderScene(full.getContext('2d'), scene, t); } catch (e) {}
    var k = Math.min(1, maxEdge / Math.max(P.width, P.height));
    var small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(P.width * k)); small.height = Math.max(1, Math.round(P.height * k));
    var sctx = small.getContext('2d'); sctx.drawImage(full, 0, 0, small.width, small.height);
    return small.toDataURL('image/png').split(',')[1];
  }

  function deriveIntent(chips) {
    chips = chips || {};
    return {
      subject: chips.subject || 'Your Big Idea', style: chips.style || 'clean promo',
      palette: chips.palette || ['#0e1320', '#29d9bb', '#ffce4a', '#ffffff'],
      pacing: chips.pacing || 'medium', durationSec: parseFloat(chips.duration) || 6,
      aspect: chips.aspect || '9:16', captions: chips.captions !== false, mood: chips.mood || 'confident',
    };
  }

  function summariseMedia(scene) {
    return scene.layers.filter(function (l) { return l.type === 'video' || l.type === 'image'; })
      .map(function (l) { return { id: l.id, type: l.type, name: l.name, duration: l.duration }; });
  }
  function layerSummary(scene) {
    return scene.layers.map(function (l) { return { id: l.id, type: l.type, name: l.name, x: l.transform && Math.round(FM.evalProp(l.transform.x, FM.time)), y: l.transform && Math.round(FM.evalProp(l.transform.y, FM.time)) }; });
  }

  function um(text) { return { role: 'user', content: text }; }

  function taskTail(t, intent) {
    return 'INTENT:\n' + JSON.stringify(intent) + '\n\nYOUR TASK: ' + (t.goal || t.label) +
      '\nYou OWN these refs (create/modify only these): ' + JSON.stringify(t.refs || []) +
      (t.z != null ? '\nBase z-index: ' + t.z : '') +
      (t.existingMediaIds && t.existingMediaIds.length ? '\nExisting media you may retime/grade: ' + JSON.stringify(t.existingMediaIds) : '') +
      (t._errs ? '\nYour previous attempt had these problems, fix them: ' + JSON.stringify(t._errs) : '');
  }

  // ---- the pipeline ----
  async function generateScene(prompt, chips, opts) {
    opts = opts || {};
    if (state.running) return;
    var dry = !!(FM.ai.DRY_RUN || opts.dryRun);
    if (!dry && !FM.aiKey.has()) { return FM.aiTemplates.build(chips); }   // no key → template floor

    state.running = true; state.abort = false; state.dry = dry;
    var P = panel();
    if (FM.aiBudget) FM.aiBudget.reset();
    P.reset();
    var refMap = {};
    var beforeLen = FM.scene.layers.length;
    var mctx = { prompt: prompt, chips: chips };

    function aborted() { return state.abort; }

    try {
      var M = FM.aiManifest;

      // 1) INTERPRET
      P.row('intent', 'Reading your brief', 'active', null, 'Interpreter · Haiku');
      var intent;
      try {
        var ir = await call(MODELS.intent, M.systemPrompts.intent, [um(prompt || (chips && chips.subject) || 'a short title card')], M.tools.intent, { maxTokens: 1024, mock: mctx });
        intent = ir.out || deriveIntent(chips);
      } catch (e) { intent = deriveIntent(chips); }
      if (chips) { ['subject', 'style', 'pacing', 'aspect'].forEach(function (k) { if (chips[k]) intent[k] = chips[k]; }); if (chips.duration) intent.durationSec = parseFloat(chips.duration) || intent.durationSec; }
      FM.scene.project.aiIntent = intent;
      P.row('intent', 'Read your brief', 'done', null, 'Interpreter · Haiku');
      if (aborted()) throw { cancelled: true };

      // 2) PLAN
      P.row('plan', 'Planning the scene', 'active', null, 'Director · Opus');
      var plan = (await call(MODELS.plan, M.systemPrompts.plan,
        [um('INTENT:\n' + JSON.stringify(intent) + '\n\nEXISTING MEDIA (reference only, do not recreate):\n' + JSON.stringify(summariseMedia(FM.scene)))],
        M.tools.plan, { maxTokens: 4096, mock: mctx })).out;
      if (!plan || !Array.isArray(plan.scaffoldOps)) throw new Error('Planner returned nothing usable');
      P.row('plan', 'Planned the scene', 'done', null, 'Director · Opus');

      // 2a) SCAFFOLD — the guaranteed floor, applied immediately
      FM.aiOps.applyOps(plan.scaffoldOps, refMap);
      FM.refreshAll();
      var tasks = Array.isArray(plan.tasks) ? plan.tasks.slice(0, 6) : [];
      tasks.forEach(function (t) { P.row(t.id, t.label || t.goal || 'Build', 'queued', null, 'Builder · Haiku'); });
      if (aborted()) throw { cancelled: true };

      // 3+4) BUILD — warm the cache with builder #0, then fan the rest out in parallel
      async function runBuilder(i, model) {
        if (aborted()) return;
        var t = tasks[i];
        // Gate the EXPENSIVE fan-out (and its Sonnet escalations, which re-enter here) on the budget cap
        // so a low cap actually bounds spend instead of only stopping the critic after the fact. The
        // interpret+plan floor is intentionally NOT gated — skipping it would leave an empty scene. (#12)
        if (FM.aiBudget && FM.aiBudget.spentCents() >= FM.aiBudget.capCents) { P.row(t.id, t.label, 'skipped', null, 'budget cap'); return; }
        P.row(t.id, t.label, 'streaming', null, 'Builder · ' + (model === MODELS.esc ? 'Sonnet' : 'Haiku'));
        try {
          var r = await call(model, M.systemPrompts.build, [um(taskTail(t, intent))], M.tools.ops, { maxTokens: 2048, mock: { taskId: t.id }, dryDelay: 300 + i * 220 });
          var log = FM.aiOps.applyOps((r.out && r.out.ops) || [], refMap);
          FM.refreshAll();
          if (log.dropped.length && model === MODELS.build && !t._retried && (r.out && r.out.ops && r.out.ops.length)) {
            t._retried = true; t._errs = log.dropped.map(function (d) { return d.op + ': ' + d.reason; });
            return runBuilder(i, MODELS.esc);
          }
          P.row(t.id, t.label, 'done', log.appliedCount, 'Builder · ' + (model === MODELS.esc ? 'Sonnet' : 'Haiku'), true);
        } catch (err) {
          if (!t._escalated && model === MODELS.build && !FM.ai.DRY_RUN) { t._escalated = true; try { return await runBuilder(i, MODELS.esc); } catch (e) {} }
          P.row(t.id, t.label, 'skipped', null, 'used scaffold');
        }
      }
      if (tasks.length) { await runBuilder(0, MODELS.build); }
      if (!aborted()) await Promise.all(tasks.slice(1).map(function (_, k) { return runBuilder(k + 1, MODELS.build); }));
      if (aborted()) throw { cancelled: true };

      // 5+6) RENDER → VISION CRITIC → FIX (bounded loop)
      var maxPasses = opts.deepPolish ? 2 : 1;
      var beat = Math.max(0.01, Math.min((FM.scene.project.duration || 6) * 0.45, (FM.scene.project.duration || 6) - 0.01));
      if (!opts.skipCritic) {
        for (var pass = 0; pass < maxPasses; pass++) {
          if (aborted()) break;
          if (FM.aiBudget && FM.aiBudget.spentCents() >= FM.aiBudget.capCents) { P.note && P.note('Budget cap reached — stopping before the critic.'); break; }
          P.row('critic', 'Reviewing the look', 'active', null, 'Critic · Opus');
          var png = renderToBase64(FM.scene, beat);
          var crit;
          try {
            crit = (await call(MODELS.critic, M.systemPrompts.critic, [{
              role: 'user', content: [
                { type: 'image', source: { type: 'base64', media_type: 'image/png', data: png } },
                { type: 'text', text: 'Rendered frame at t=' + beat.toFixed(1) + 's of a ' + (FM.scene.project.duration || 6) + 's scene.\nINTENT: ' + JSON.stringify(intent) + '\nLAYERS: ' + JSON.stringify(layerSummary(FM.scene)) + '\nCritique it and call emit_critique with up to 6 fix ops, or empty ops if good.' },
              ],
            }], M.tools.critique, { maxTokens: 1500, mock: { pass: pass } })).out;
          } catch (e) { P.row('critic', 'Reviewing the look', 'skipped', null, 'scene already stands'); break; }
          var fixOps = (crit && Array.isArray(crit.ops)) ? crit.ops.slice(0, 6) : [];
          if (!fixOps.length) { P.row('critic', 'Looks good', 'done', 0, 'Critic · Opus'); break; }
          var fl = FM.aiOps.applyOps(fixOps, refMap); FM.refreshAll();
          P.row('critic', 'Polished the look', 'done', fl.appliedCount, 'Critic · Opus');
          if (P.criticThumbs) { try { P.criticThumbs(png, renderToBase64(FM.scene, beat)); } catch (e) {} }
        }
      }

      // 7) COMMIT ONCE — the whole build is a single undo step
      if (plan.heroRef && refMap[plan.heroRef]) { FM.scene.selectedId = refMap[plan.heroRef]; FM.scene.selectedIds = [FM.scene.selectedId]; }
      FM.ai._lastBuild = { intent: intent, tasks: tasks, refMap: refMap, dry: dry };   // enables per-task re-roll
      FM.refreshAll();
      if (FM.history) FM.history.commit();
      P.done({ layersAdded: FM.scene.layers.length - beforeLen });
      return { refMap: refMap, intent: intent };
    } catch (err) {
      // commit whatever applied so the user keeps it (cancel = keep)
      if (FM.scene.layers.length !== beforeLen) { FM.refreshAll(); if (FM.history) FM.history.commit(); }
      if (err && err.cancelled) { P.done({ cancelled: true, layersAdded: FM.scene.layers.length - beforeLen }); }
      else { P.error((err && err.message) || 'Something went wrong'); }
      return { error: err };
    } finally {
      state.running = false; state.dry = false;
    }
  }

  var rerollNonce = 1;

  // Re-run ONE builder task: delete the layers it owns, rebuild them fresh, commit (own undo step).
  async function rerollTask(taskId) {
    var lb = FM.ai._lastBuild;
    if (!lb || state.running) return;
    var task = (lb.tasks || []).filter(Boolean).find(function (t) { return t.id === taskId; });
    if (!task) return;
    state.running = true; state.dry = lb.dry;
    var P = panel(), M = FM.aiManifest;
    try {
      // remove the layers this task currently owns, and free their ref handles
      var ids = (task.refs || []).map(function (r) { return lb.refMap[r]; }).filter(Boolean);
      FM.scene.layers = FM.scene.layers.filter(function (l) { return ids.indexOf(l.id) < 0; });
      (task.refs || []).forEach(function (r) { delete lb.refMap[r]; });
      delete task._retried; delete task._escalated; delete task._errs;
      P.row(task.id, task.label, 'streaming', null, 'Re-rolling · Haiku', true);
      var r = await call(MODELS.build, M.systemPrompts.build, [um(taskTail(task, lb.intent))], M.tools.ops,
        { maxTokens: 2048, mock: { taskId: task.id, nonce: rerollNonce++ }, dryDelay: 260 });
      var log = FM.aiOps.applyOps((r.out && r.out.ops) || [], lb.refMap);
      FM.refreshAll();
      if (FM.history) FM.history.commit();
      P.row(task.id, task.label, 'done', log.appliedCount, 'Builder · Haiku', true);
    } catch (e) {
      FM.refreshAll();
      P.row(task.id, task.label, 'done', null, 're-roll failed — kept', true);
    } finally {
      state.running = false; state.dry = false;
    }
  }

  // Refine an EXISTING scene from a plain-language tweak: the vision critic sees the current frame
  // + the user's instruction and returns targeted fix-ops (own undo step). Works on any scene —
  // ops can target AI refs (via _lastBuild.refMap) or existing layers by their real id.
  async function refine(instruction) {
    if (state.running || !instruction || !instruction.trim()) return;
    var lb = FM.ai._lastBuild;
    var dry = !!(FM.ai.DRY_RUN || (lb && lb.dry));
    var P = panel();
    if (!dry && !FM.aiKey.has()) { P.error && P.error('Add an API key to refine a scene.'); return; }
    if (!FM.scene.layers.length) return;
    state.running = true; state.dry = dry;
    var M = FM.aiManifest;
    var refMap = (lb && lb.refMap) || {};
    var intent = (lb && lb.intent) || {};
    try {
      P.row('refine', 'Refining: ' + instruction.trim().slice(0, 36), 'active', null, 'Critic · Opus');
      var beat = Math.max(0.01, Math.min((FM.scene.project.duration || 6) * 0.45, (FM.scene.project.duration || 6) - 0.01));
      var png = renderToBase64(FM.scene, beat);
      var sys = M.systemPrompts.critic + '\n\nThe user has asked for a SPECIFIC change. Prioritise their request over your own taste; return fix-ops that achieve it. You may target existing layers by their id (shown in LAYERS) as the op ref.';
      var crit = (await call(MODELS.critic, sys, [{
        role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: png } },
          { type: 'text', text: 'USER REQUEST: "' + instruction.trim() + '"\nINTENT: ' + JSON.stringify(intent) + '\nLAYERS (id, type, name): ' + JSON.stringify(layerSummary(FM.scene)) + '\nApply the user request via emit_critique fix-ops (target a layer by its id as the ref).' },
        ],
      }], M.tools.critique, { maxTokens: 1500, mock: { refine: true, instruction: instruction.trim() } })).out;
      var ops = (crit && Array.isArray(crit.ops)) ? crit.ops.slice(0, 8) : [];
      var log = FM.aiOps.applyOps(ops, refMap);
      FM.refreshAll(); if (FM.history) FM.history.commit();
      P.row('refine', log.appliedCount ? 'Refined your scene' : 'No change needed', 'done', log.appliedCount, 'Critic · Opus');
    } catch (e) {
      FM.refreshAll();
      P.row('refine', 'Refine failed — scene unchanged', 'done', null, (e && e.message) || 'error');
    } finally {
      state.running = false; state.dry = false;
    }
  }

  FM.ai = {
    DRY_RUN: false,
    MODELS: MODELS,
    generateScene: generateScene,
    rerollTask: rerollTask,
    refine: refine,
    cancel: function () { state.abort = true; },
    isRunning: function () { return state.running; },
    _lastBuild: null,
    _renderToBase64: renderToBase64,   // exposed for tests
  };
})(window.FM);
