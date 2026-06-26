/* FreeMotion — BYOK key store. The ONLY module that holds the user's Anthropic API key.
 *
 * Default: in-memory (closure) for the tab's lifetime only. If the user ticks "remember on this
 * device", it's written to localStorage under 'fm.anthropic.key' — the same local-only model as
 * Buckets / Listing Kit. The key is read ONLY by ai.js (into the x-api-key header of the fetch to
 * api.anthropic.com). It is never put in a message body, never logged, never serialized into the
 * scene/history/autosave/export (those carry only project/layers/selectedId — the key is
 * structurally outside that surface).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  var LS_KEY = 'fm.anthropic.key';
  var mem = null;   // in-memory key (closure-private)

  try { var stored = localStorage.getItem(LS_KEY); if (stored) mem = stored; } catch (e) {}

  function looksValid(k) { return typeof k === 'string' && /^sk-ant-/.test(k.trim()) && k.trim().length > 20; }

  FM.aiKey = {
    get: function () { return mem; },
    has: function () { return !!mem; },
    looksValid: looksValid,
    set: function (key, remember) {
      mem = (typeof key === 'string') ? key.trim() : null;
      try {
        if (mem && remember) localStorage.setItem(LS_KEY, mem);
        else localStorage.removeItem(LS_KEY);
      } catch (e) {}
      return mem;
    },
    remembered: function () { try { return !!localStorage.getItem(LS_KEY); } catch (e) { return false; } },
    forget: function () { mem = null; try { localStorage.removeItem(LS_KEY); } catch (e) {} },
    // "sk-ant-…a1b2" — safe to show in the UI; never the full key.
    masked: function () { if (!mem) return ''; var k = mem.trim(); return k.length <= 12 ? 'sk-ant-…' : (k.slice(0, 7) + '…' + k.slice(-4)); },
  };
})(window.FM);
