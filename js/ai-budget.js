/* FreeMotion — AI spend meter. Converts Claude usage tokens to an estimated cost so the user
 * sees what a "heaps of agents" run costs on THEIR key, and can cap it. Estimate only — the
 * authoritative bill is on the user's Anthropic account. */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // USD per million tokens [input, output]. Cached reads ~0.1x input; cache writes ~1.25x input.
  var PRICE = {
    'claude-opus-4-8': [5, 25],
    'claude-sonnet-4-6': [3, 15],
    'claude-haiku-4-5': [1, 5],
  };
  function price(model) { return PRICE[model] || PRICE['claude-opus-4-8']; }

  var spentUsd = 0;
  var listeners = [];

  FM.aiBudget = {
    capCents: 25,                 // default cap; the panel lets the user change it
    reset: function () { spentUsd = 0; this._emit(); },
    onChange: function (fn) { listeners.push(fn); },
    _emit: function () { listeners.forEach(function (f) { try { f(); } catch (e) {} }); },
    add: function (usage, model) {
      if (!usage) return;
      var p = price(model);
      var inTok = (usage.input_tokens || 0);
      var cacheRead = (usage.cache_read_input_tokens || 0);
      var cacheWrite = (usage.cache_creation_input_tokens || 0);
      var outTok = (usage.output_tokens || 0);
      spentUsd += (inTok * p[0] + cacheRead * p[0] * 0.1 + cacheWrite * p[0] * 1.25 + outTok * p[1]) / 1e6;
      this._emit();
    },
    spentCents: function () { return spentUsd * 100; },
    spentLabel: function () { var c = spentUsd * 100; return c < 1 ? c.toFixed(2) + '¢' : c.toFixed(1) + '¢'; },
    fraction: function () { return this.capCents > 0 ? Math.min(1, (spentUsd * 100) / this.capCents) : 0; },
  };
})(window.FM);
