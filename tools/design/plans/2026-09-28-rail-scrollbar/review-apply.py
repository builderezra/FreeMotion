import re,sys
P='/Users/ezrasmith/Claude/FreeMotion/tools/design/plans/2026-09-28-rail-scrollbar/'
def sub(path, old, new, count=1):
    s=open(path).read()
    n=s.count(old)
    assert n==count, (path, old[:60], n)
    s=s.replace(old,new); open(path,'w').write(s)
# index.html
sub('index.html','  <script src="js/tilefit.js?v=1"></script>\n','  <script src="js/tilefit.js?v=1"></script>\n  <script src="js/rail-arrows.js?v=1"></script>\n')
for a,b in [('styles.css?v=734','styles.css?v=735'),('js/inspector.js?v=393','js/inspector.js?v=394'),('js/fx-browser.js?v=96','js/fx-browser.js?v=97'),('js/audio-fx-browser.js?v=12','js/audio-fx-browser.js?v=13')]:
    sub('index.html',a,b)
# styles.css: replace the desktop .flt-grid block (anchored on TEXT, not line numbers) with rail.css
OLD_CSS = """/* A desktop pointer has no swipe, so the rail keeps a visible bar there — a scroller that cannot be
   scrolled with the device you are holding is worse than a grid. Touch keeps the clean edge. */
@media (hover: hover) and (pointer: fine) {
  .flt-grid { scrollbar-width: thin; }
  .flt-grid::-webkit-scrollbar { display: block; height: 6px; }
  .flt-grid::-webkit-scrollbar-thumb { background: var(--line); border-radius: 3px; }
}
"""
sub('styles.css', OLD_CSS, open(P+'code/rail.css').read().rstrip('\n')+'\n')
# the new file itself (the first review's script left it out, so the build it tried had no FM.railArrows)
import shutil; shutil.copy(P+'code/rail-arrows.js', 'js/rail-arrows.js')
# inspector.js
fr='''
    /* ⚠️ A MOUSE PAGES A FILTER ROW WITH ‹ ›, NOT A SCROLLBAR (queue 976). */
    function filterRail(grid) {
      const rail = el('div', 'flt-rail');
      rail.appendChild(grid);
      rail.appendChild(rowDots(grid));
      if (FM.railArrows) FM.railArrows(rail, grid, { item: '.flt-tile' });
      return rail;
    }
'''
sub('js/inspector.js','''      return host;
    }

    const paintFilterPicks''','''      return host;
    }
'''+fr+'''
    const paintFilterPicks''')
sub('js/inspector.js','''      s.appendChild(fwrap);
      s.appendChild(rowDots(fwrap));''','''      s.appendChild(filterRail(fwrap));''')
sub('js/inspector.js','''      s.appendChild(wrap);
      s.appendChild(rowDots(wrap));''','''      s.appendChild(filterRail(wrap));''')
sub('js/inspector.js','''      const mark = () => {
        if (!count) return;
        const max = Math.max(1, grid.scrollWidth - grid.clientWidth);
        const i = Math.round((grid.scrollLeft / max) * (count - 1));
        [].forEach.call(host.children, (d, k) => d.classList.toggle('on', k === i));
      };''','''      const mark = () => {
        if (!count) return;
        const max = grid.scrollWidth - grid.clientWidth;
        const pageW = Math.max(1, grid.clientWidth + (parseFloat(getComputedStyle(grid).columnGap) || 0));
        const i = grid.scrollLeft >= max - 2 ? count - 1 : Math.min(count - 2, Math.round(grid.scrollLeft / pageW));
        [].forEach.call(host.children, (d, k) => d.classList.toggle('on', k === i));
      };''')
# fx-browser
sub('js/fx-browser.js','''    FM.carouselPause(row, () => autoPauseUntil, (t) => { autoPauseUntil = t; });
    sec.appendChild(row);
    return { sec: sec, row: row };''','''    FM.carouselPause(row, () => autoPauseUntil, (t) => { autoPauseUntil = t; });
    sec.appendChild(row);
    if (FM.railArrows) FM.railArrows(sec, row, { item: '.fxb-card', onPage: () => { autoPauseUntil = Math.max(autoPauseUntil, perfNow() + CAROUSEL_PAUSE_MS); } });
    return { sec: sec, row: row };''')
sub('js/audio-fx-browser.js','''    sec.appendChild(row);
    return { sec: sec, row: row };''','''    sec.appendChild(row);
    if (FM.railArrows) FM.railArrows(sec, row, { item: '.fxb-card', onPage: () => { autoPauseUntil = Math.max(autoPauseUntil, perfNow() + (FM._carouselPauseMs || 8000)); } });
    return { sec: sec, row: row };''')
# tests
t=open(P+'code/tests-rail.js').read()   # numbers already 976/977 (review re-run)
s=open('tests/tests.js').read()
# insert after queue 565's test
m=re.search(r"\n  test\('565[^\n]*\n", s)
start=m.start()+1
end=s.index('\n  });\n', start)+len('\n  });\n')
s=s[:end]+'\n'+t.rstrip('\n')+'\n'+s[end:]
open('tests/tests.js','w').write(s)
print('ok', s[m.start()+1:m.start()+120])
