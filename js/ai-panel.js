/* FreeMotion — AI "Director" panel UI.
 *
 * The ✨ Generate entry, the BYOK key form, the prompt box + structured chips, and the LIVE
 * multi-agent progress checklist (you watch Interpreter → Director → parallel Builders → Critic
 * work). Docks right on desktop; a bottom sheet on phones (reusing the inspector-drawer pattern).
 * Every AI-derived string is rendered with textContent — never innerHTML — so nothing the model
 * produces can inject markup. Exports FM.aiPanel.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function isPhone() { return window.matchMedia('(max-width: 700px)').matches; }

  var EXAMPLES = [
    '30s product reel — three fast cuts, punch-in on the name, upbeat captions',
    'Elegant real-estate intro — the address slides in, the price pops, a sold sticker spins on',
    'Bold quote card — big kinetic text on a gradient, slow zoom, energetic',
    'Calm wellness opener — soft palette, gentle float, fade-up title',
    'Retro VHS title — neon colours, glitchy slide-in, scanline vibe',
    'Sale announcement — “50% OFF” pops huge, accent shapes orbit, fast pacing',
  ];

  var panelEl, bodyEl, keyForm, compose, progress, promptInput, ringFill, ringText, rowsWrap, doneBar, fields = {};
  var rows = {};
  var mode = 'compose';

  function init() {
    if (document.getElementById('ai-panel')) return;
    buildEntry();
    buildPanel();
    if (FM.aiBudget) FM.aiBudget.onChange(updateRing);
    window.addEventListener('resize', function () { if (!isPhone()) {} });
  }

  // ✨ Generate button already exists in the topbar markup; wire it. Plus a phone bottom-sheet handle.
  function buildEntry() {
    var btn = document.getElementById('btn-ai');
    if (btn) btn.addEventListener('click', show);
  }

  function buildPanel() {
    panelEl = el('div'); panelEl.id = 'ai-panel';

    var grab = el('button', 'ai-grab'); grab.id = 'ai-grab'; grab.type = 'button'; grab.setAttribute('aria-label', 'Close');
    grab.appendChild(el('span', 'grab-bar'));
    grab.addEventListener('click', hide);
    panelEl.appendChild(grab);

    var head = el('div', 'ai-head');
    var titleWrap = el('div', 'ai-title');
    titleWrap.appendChild(el('span', 'ai-spark', '✨'));
    titleWrap.appendChild(el('span', null, 'Director'));
    head.appendChild(titleWrap);
    // budget ring
    var ring = el('div', 'ai-ring'); ring.title = 'Estimated spend on your key';
    ring.innerHTML = '<svg viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="15.5"/><circle class="ring-fill" cx="18" cy="18" r="15.5"/></svg>';
    ringText = el('span', 'ring-text', '0¢'); ring.appendChild(ringText);
    ringFill = ring.querySelector('.ring-fill');
    head.appendChild(ring);
    var close = el('button', 'ai-close', '✕'); close.title = 'Close'; close.addEventListener('click', hide);
    head.appendChild(close);
    panelEl.appendChild(head);

    bodyEl = el('div', 'ai-body');

    // ---- key form ----
    keyForm = el('div', 'ai-keyform');
    keyForm.appendChild(el('div', 'ai-kf-title', 'Connect your Anthropic key'));
    keyForm.appendChild(el('div', 'ai-kf-sub', 'Used only in this browser, sent only to api.anthropic.com, never logged or uploaded. Spend is on your own account.'));
    var keyInput = el('input', 'ai-input'); keyInput.type = 'password'; keyInput.placeholder = 'sk-ant-…'; keyInput.autocomplete = 'off'; keyInput.spellcheck = false;
    keyForm.appendChild(keyInput);
    var remRow = el('label', 'ai-remember');
    var rem = el('input'); rem.type = 'checkbox';
    remRow.appendChild(rem); remRow.appendChild(el('span', null, 'Remember on this device'));
    keyForm.appendChild(remRow);
    var saveBtn = el('button', 'ai-btn ai-btn-accent', 'Save key & continue');
    saveBtn.addEventListener('click', function () {
      var v = keyInput.value.trim();
      if (!FM.aiKey.looksValid(v)) { keyInput.classList.add('bad'); keyInput.placeholder = 'That doesn\'t look like an sk-ant- key'; return; }
      FM.aiKey.set(v, rem.checked); setMode('compose');
    });
    keyForm.appendChild(saveBtn);
    var orRow = el('div', 'ai-or');
    var demoLink = el('button', 'ai-link', '▶ Watch a demo run (no key, no spend)');
    demoLink.addEventListener('click', function () { runDemo(); });
    var tmplLink = el('button', 'ai-link', 'Build a scene without a key');
    tmplLink.addEventListener('click', function () { buildTemplate(); });
    orRow.appendChild(demoLink); orRow.appendChild(tmplLink);
    keyForm.appendChild(orRow);
    var keyLink = el('a', 'ai-getkey', 'Get a key → console.anthropic.com'); keyLink.href = 'https://console.anthropic.com/settings/keys'; keyLink.target = '_blank'; keyLink.rel = 'noopener';
    keyForm.appendChild(keyLink);
    bodyEl.appendChild(keyForm);

    // ---- compose ----
    compose = el('div', 'ai-compose');
    promptInput = el('textarea', 'ai-prompt'); promptInput.placeholder = 'Describe the video you want…'; promptInput.rows = 3;
    compose.appendChild(promptInput);
    var exWrap = el('div', 'ai-examples');
    EXAMPLES.forEach(function (ex) { var c = el('button', 'ai-chip', ex.split(' — ')[0]); c.title = ex; c.addEventListener('click', function () { promptInput.value = ex; promptInput.focus(); }); exWrap.appendChild(c); });
    compose.appendChild(exWrap);

    var grid = el('div', 'ai-fields');
    fields.style = addField(grid, 'Style', 'text', null, 'punchy, elegant, retro…');
    fields.pacing = addField(grid, 'Pacing', 'select', ['', 'slow', 'medium', 'fast']);
    fields.duration = addField(grid, 'Duration', 'select', ['', '4', '6', '10', '15']);
    fields.aspect = addField(grid, 'Aspect', 'select', ['', '9:16', '16:9', '1:1', '4:5']);
    compose.appendChild(grid);

    var polishRow = el('label', 'ai-polish');
    fields.deep = el('input'); fields.deep.type = 'checkbox';
    polishRow.appendChild(fields.deep); polishRow.appendChild(el('span', null, 'Deep polish (extra critic pass — costs a little more)'));
    compose.appendChild(polishRow);

    var genBtn = el('button', 'ai-btn ai-btn-accent ai-generate', '✨  Generate scene');
    genBtn.addEventListener('click', function () { startRun({}); });
    compose.appendChild(genBtn);
    var keyNote = el('button', 'ai-keynote', '');
    keyNote.addEventListener('click', function () { setMode('key'); });
    compose.appendChild(keyNote);
    compose._keyNote = keyNote;
    bodyEl.appendChild(compose);

    // ---- progress ----
    progress = el('div', 'ai-progress');
    rowsWrap = el('div', 'ai-rows');
    progress.appendChild(rowsWrap);
    var foot = el('div', 'ai-foot', 'Undo removes the whole build in one step · edit any layer by hand.');
    progress.appendChild(foot);
    doneBar = el('div', 'ai-donebar');
    progress.appendChild(doneBar);
    bodyEl.appendChild(progress);

    panelEl.appendChild(bodyEl);
    document.body.appendChild(panelEl);
    setMode(FM.aiKey.has() ? 'compose' : 'key');
  }

  function addField(grid, label, type, options, ph) {
    var wrap = el('div', 'ai-field');
    wrap.appendChild(el('label', null, label));
    var input;
    if (type === 'select') {
      input = el('select');
      options.forEach(function (o) { var op = el('option', null, o === '' ? 'auto' : o); op.value = o; input.appendChild(op); });
    } else { input = el('input'); input.type = 'text'; if (ph) input.placeholder = ph; }
    wrap.appendChild(input); grid.appendChild(wrap);
    return input;
  }

  function setMode(m) {
    mode = m;
    keyForm.classList.toggle('on', m === 'key');
    compose.classList.toggle('on', m === 'compose');
    progress.classList.toggle('on', m === 'running' || m === 'done');
    if (m === 'compose' && compose._keyNote) {
      compose._keyNote.textContent = FM.aiKey.has() ? ('Key: ' + FM.aiKey.masked() + ' · change') : 'No key — using demo/templates · add a key';
    }
  }

  function gatherChips() {
    var c = {};
    if (fields.style.value.trim()) c.style = fields.style.value.trim();
    if (fields.pacing.value) c.pacing = fields.pacing.value;
    if (fields.duration.value) c.duration = fields.duration.value;
    if (fields.aspect.value) c.aspect = fields.aspect.value;
    var p = promptInput.value.trim();
    if (p) c.subject = p.split(/[.,\n]/)[0].slice(0, 60);
    return c;
  }

  function startRun(opts) {
    var prompt = promptInput.value.trim();
    if (!prompt && !fields.style.value.trim()) { promptInput.classList.add('bad'); promptInput.placeholder = 'Tell me what to make first…'; promptInput.focus(); return; }
    setMode('running');
    var chips = gatherChips();
    FM.ai.generateScene(prompt, chips, { deepPolish: fields.deep.checked, dryRun: !!opts.dryRun });
  }

  function runDemo() { promptInput.value = promptInput.value || EXAMPLES[1]; setMode('running'); FM.ai.generateScene(promptInput.value.trim(), gatherChips(), { dryRun: true }); }

  function buildTemplate() {
    setMode('running');
    reset();
    row('tmpl', 'Building a template scene', 'active', null, 'No key');
    setTimeout(function () {
      var r = FM.aiTemplates.build(gatherChips());
      row('tmpl', 'Built a template scene', 'done', r.applied, 'No key');
      done({ layersAdded: r.applied, template: true });
    }, 150);
  }

  // ---- progress API (called by ai.js) ----
  function reset() {
    rows = {}; rowsWrap.textContent = ''; doneBar.textContent = ''; setMode('running'); updateRing();
    var cancel = el('button', 'ai-btn ai-cancel', 'Cancel — keep what\'s built');
    cancel.addEventListener('click', function () { FM.ai.cancel(); cancel.disabled = true; cancel.textContent = 'Finishing…'; });
    doneBar.appendChild(cancel);
  }

  function row(id, label, state, count, tag, rerollable) {
    var r = rows[id];
    if (!r) {
      r = el('div', 'ai-row');
      r._dot = el('span', 'ai-dot');
      r._label = el('span', 'ai-rowlabel');
      r._meta = el('span', 'ai-rowmeta');
      r._reroll = el('button', 'ai-reroll', '↻'); r._reroll.title = 'Re-roll this part'; r._reroll.style.display = 'none';
      r._reroll.addEventListener('click', function (e) { e.stopPropagation(); if (FM.ai && FM.ai.rerollTask) FM.ai.rerollTask(id); });
      r.appendChild(r._dot); r.appendChild(r._label); r.appendChild(r._meta); r.appendChild(r._reroll);
      rows[id] = r; rowsWrap.appendChild(r);
    }
    r.className = 'ai-row ' + (state || 'queued');
    r._label.textContent = label || '';
    var meta = tag || '';
    if (count != null) meta = (count + ' op' + (count === 1 ? '' : 's')) + (tag ? ' · ' + tag : '');
    if (state === 'skipped') meta = tag || 'used scaffold';
    r._meta.textContent = meta;
    if (r._reroll) r._reroll.style.display = (rerollable && state === 'done') ? '' : 'none';
  }

  function note(msg) { var n = el('div', 'ai-note', msg); rowsWrap.appendChild(n); }

  // before/after the vision critic's fix — two tiny renders so you SEE the polish
  function criticThumbs(beforeB64, afterB64) {
    var prev = rowsWrap.querySelector('.ai-thumbs'); if (prev) prev.remove();
    var wrap = el('div', 'ai-thumbs');
    [['Before', beforeB64], ['After', afterB64]].forEach(function (pair) {
      var col = el('div', 'ai-thumb');
      var img = document.createElement('img'); img.alt = pair[0]; img.src = 'data:image/png;base64,' + pair[1];
      col.appendChild(img); col.appendChild(el('span', null, pair[0]));
      wrap.appendChild(col);
    });
    var critic = rows['critic'];
    if (critic && critic.nextSibling) rowsWrap.insertBefore(wrap, critic.nextSibling);
    else rowsWrap.appendChild(wrap);
  }

  function done(info) {
    mode = 'done';
    doneBar.textContent = '';
    var msg = info && info.cancelled ? 'Stopped — kept what was built.' : (info && info.template ? 'Template ready — edit anything.' : 'Done! ' + ((info && info.layersAdded) || 0) + ' layers — all editable.');
    var summary = el('div', 'ai-summary', msg);
    doneBar.appendChild(summary);
    var actions = el('div', 'ai-doneactions');
    var newBtn = el('button', 'ai-btn', '✨ New scene'); newBtn.addEventListener('click', function () { setMode('compose'); });
    var editBtn = el('button', 'ai-btn ai-btn-accent', 'Edit it'); editBtn.addEventListener('click', hide);
    actions.appendChild(newBtn); actions.appendChild(editBtn);
    doneBar.appendChild(actions);
    if (FM.ai && FM.ai.isRunning && !FM.ai.isRunning()) {} // no-op guard
  }

  function error(msg) {
    var e = el('div', 'ai-error', msg);
    rowsWrap.appendChild(e);
    doneBar.textContent = '';
    var retry = el('button', 'ai-btn', 'Back'); retry.addEventListener('click', function () { setMode(FM.aiKey.has() ? 'compose' : 'key'); });
    doneBar.appendChild(retry);
  }

  function updateRing() {
    if (!ringFill) return;
    var frac = FM.aiBudget ? FM.aiBudget.fraction() : 0;
    var circ = 2 * Math.PI * 15.5;
    ringFill.style.strokeDasharray = circ.toFixed(1);
    ringFill.style.strokeDashoffset = (circ * (1 - frac)).toFixed(1);
    ringFill.classList.toggle('over', frac >= 1);
    if (ringText) ringText.textContent = FM.aiBudget ? FM.aiBudget.spentLabel() : '0¢';
  }

  // While the pipeline runs, mirror "streaming" rows: add a live cancel control in the done bar.
  function show() {
    if (FM.mobile && FM.mobile.isPhone && FM.mobile.isPhone() && FM.mobile.close) FM.mobile.close();
    panelEl.classList.add('open');
    document.body.classList.add('ai-open');
    if (mode === 'running') {} else setMode(FM.aiKey.has() ? 'compose' : 'key');
  }
  function hide() { panelEl.classList.remove('open'); document.body.classList.remove('ai-open'); }
  function toggle() { panelEl.classList.contains('open') ? hide() : show(); }

  FM.aiPanel = { show: show, hide: hide, toggle: toggle, reset: reset, row: row, note: note, criticThumbs: criticThumbs, done: done, error: error };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.FM);
