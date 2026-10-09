#!/bin/bash
cd /tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/wt-p19
F=tools/_busters.py; cp $F /tmp/_busters.bak; trap 'cp /tmp/_busters.bak $F' EXIT
m(){ name=$1; cp /tmp/_busters.bak $F
  python3 - "$2" "$3" <<'PY'
import sys
s=open('tools/_busters.py').read(); o,n=sys.argv[1],sys.argv[2]
assert s.count(o)==1,('not unique',s.count(o)); open('tools/_busters.py','w').write(s.replace(o,n))
PY
  [ $? = 0 ] || { echo "$name: MUTATION NOT APPLIED"; return; }
  python3 $F --selftest >/tmp/_bm.out 2>&1; rc=$?; [ $rc = 1 ] && echo "$name: CAUGHT ($(grep -c '·' /tmp/_bm.out) failing checks; $(grep -c Traceback /tmp/_bm.out) crash)" || echo "$name: SURVIVED rc=$rc"; }
m M1_empty_equals_empty "if a and a == b:" "if a == b:"
m M2_no_styles_source "STATIC_SOURCES = ('index.html', 'styles.css', 'theme-glass.css')" "STATIC_SOURCES = ('index.html', 'theme-glass.css')"
m M3_no_templated "        for prefix, (src, _) in TEMPLATED.items():" "        for prefix, (src, _) in []:"
m M4_bump_first_only "f + '?v=' + n, new[src])" "f + '?v=' + n, new[src], count=1)"
m M5_equal_ignored "if a and a == b:" "if a and a != b:"
m M6_templated_never_equal "if a is not None and b is not None and a == b:" "if a is not None and b is not None and a != b:"
m M7_settle_once "    for _ in range(6):" "    for _ in range(1):"
m M8_cascade_not_tracked "        changed |= {src for src in nxt if nxt[src] != cur[src]}" "        pass"
echo MUTDONE
