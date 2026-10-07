/* The tutorials renderer (D7 prototype). The files use five things and this handles exactly those:
 *   # title   1. numbered steps   **bold**   Tip: / Note: / If it doesn't work: / On a computer: lead-ins   plain paragraphs
 * Everything else is shown as plain text. Output is built with createElement + textContent only, so a file can never
 * put markup, script or an attribute on the page. Two things are removed first: the <!-- ... --> citations after each
 * step, and everything from "### Verification" down (a table of file:line checks, for reviewers, not for readers). */
(function (g) {
  'use strict';
  var LEAD = [['Tip', 'tip'], ['Note', 'note'], ["If it doesn't work", 'warn'], ['On a computer', 'desk']];

  function clean(src) {
    var cut = src.search(/^###\s+Verification/m);
    if (cut >= 0) src = src.slice(0, cut);
    return src.split('\n').map(function (l) {
      return l.replace(/<!--[\s\S]*?-->/g, '').replace(/<!--.*$/, '').replace(/\s+$/, '');
    }).join('\n');
  }

  function inline(parent, text) {
    text.split(/\*\*([^*]+)\*\*/).forEach(function (s, i) {
      if (!s) return;
      if (i % 2) { var b = document.createElement('strong'); b.textContent = s; parent.appendChild(b); }
      else parent.appendChild(document.createTextNode(s));
    });
  }

  function el(tag, cls, parent) {
    var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e;
  }

  /* render(src, root): fills root, returns { title, intro, steps, callouts } */
  function render(src, root) {
    var out = { title: '', intro: '', steps: 0, callouts: 0 }, ol = null;
    root.textContent = '';
    clean(src).split('\n').forEach(function (line) {
      if (!line.trim()) { ol = null; return; }
      var m;
      if ((m = /^#\s+(.*)$/.exec(line))) { out.title = m[1]; inline(el('h2', 'tt', root), m[1]); return; }
      if ((m = /^\d+\.\s+(.*)$/.exec(line))) {
        if (!ol) ol = el('ol', 'steps', root);
        out.steps++; inline(el('li', '', ol), m[1]); return;
      }
      ol = null;
      for (var i = 0; i < LEAD.length; i++) {
        var key = LEAD[i][0];
        if (line.indexOf(key + ':') === 0) {
          var box = el('div', 'callout ' + LEAD[i][1], root);
          el('span', 'lab', box).textContent = key;
          inline(el('span', 'body', box), line.slice(key.length + 1).replace(/^\s+/, '')); out.callouts++; return;
        }
      }
      var p = el('p', out.intro ? '' : 'intro', root);
      if (!out.intro) out.intro = line;
      inline(p, line);
    });
    return out;
  }

  g.TutorialMd = { render: render, clean: clean };
})(window);
