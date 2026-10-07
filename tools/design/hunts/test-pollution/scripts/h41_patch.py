import sys
p=sys.argv[1]+'/tests/tests.js'; s=open(p).read()
SNAP=r"""
    /* H41 CENSUS (scratch, never pushed): what every test leaves different from what it found. */
    if (!window.__fmCensusSnap) {
      var _cid = new WeakMap(), _cn = 0;
      var vis = function (e) { if (!e) return false; var r = e.getBoundingClientRect(); var cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.classList.contains('hidden'); };
      window.__fmCensusSnap = function () {
        var s = {};
        try { s.time = +(+FM.time).toFixed(3); } catch (e) {}
        try { s.playing = !!FM.playing; } catch (e) {}
        try { s.pps = FM._tlPxPerSec ? +FM._tlPxPerSec().toFixed(2) : null; } catch (e) {}
        try { var sc = FM.scene; if (sc && !_cid.has(sc)) _cid.set(sc, ++_cn); s.scene = sc ? _cid.get(sc) : 0; s.projDur = sc.project.duration; s.proj = sc.project.width + 'x' + sc.project.height; s.fps = sc.project.fps; s.layers = sc.layers.length; s.layerIds = sc.layers.map(function (l) { return l.id; }).join(','); s.sel = [sc.selectedId].concat(sc.selectedIds || []).filter(Boolean).join(','); } catch (e) {}
        try {
          var ti = document.getElementById('tl-inner'), tl = document.getElementById('timeline');
          s.tlInnerW = ti ? ti.style.width : null; s.tlW = tl ? tl.clientWidth : null;
          var w = ti ? parseFloat(ti.style.width) : NaN, pps = FM._tlPxPerSec ? FM._tlPxPerSec() : 0;
          s.tlDur = (isFinite(w) && pps > 0 && tl) ? +((w - tl.clientWidth) / pps).toFixed(2) : null;
        } catch (e) {}
        try {
          var ui = [];
          ['add-sheet', 'fx-browser', 'afx-browser', 'ctx-menu', 'export-overlay', 'export-ready', 'export-dialog', 'settings', 'cv-dialog', 'fm-ask', 'help-overlay', 'share-sheet'].forEach(function (id) { var e = document.getElementById(id); if (vis(e)) ui.push('#' + id); });
          var po = document.querySelector('.panel.open'); if (po && vis(po)) ui.push('.panel.open'); 
          if (FM.home && FM.home.isOpen && FM.home.isOpen()) ui.push('home');
          s.ui = ui.join(' ');
        } catch (e) {}
        try { s.win = window.innerWidth; s.pv = FM._fxPreview ? 1 : 0; s.iso = FM.isolate ? 1 : 0; s.body = document.body.className; s.ls = localStorage.length; } catch (e) {}
        return s;
      };
    }
"""
a="    var undoFakes = applyFakes();   // ?fmfake= (a proof run only) — put back after the last test\n"
assert s.count(a)==1
s=s.replace(a,a+SNAP+"    LIST = LIST.filter(function (t) { return !/^690 (swiping the share sheet away|an export holds the screen)/.test(t.name); });\n")
b="      var _t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());\n"
assert s.count(b)==1
s=s.replace(b,"      var _c0 = null; try { _c0 = window.__fmCensusSnap(); } catch (e) {}\n"+b)
c="      results.push({ name: t.name, item: t.item, pending: t.pending, ok: ok, error: err, notRun: notRun });"
assert s.count(c)==1
s=s.replace(c,"      try { console.log('H41C ' + JSON.stringify([i, t.name.slice(0, 150), ok ? 1 : 0, _c0, window.__fmCensusSnap()])); } catch (e) {}\n"+c)
open(p,'w').write(s); print('ok')
