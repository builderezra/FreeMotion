#!/bin/bash
cd /tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad/wt-p19
F=tools/_livegate.sh; cp $F /tmp/_lg.bak; trap 'cp /tmp/_lg.bak $F' EXIT
m(){ name=$1; cp /tmp/_lg.bak $F
  python3 - "$2" "$3" <<'PY'
import sys
s=open('tools/_livegate.sh').read(); o,n=sys.argv[1],sys.argv[2]
assert s.count(o)==1,('not unique',s.count(o)); open('tools/_livegate.sh','w').write(s.replace(o,n))
PY
  [ $? = 0 ] || { echo "$name: MUTATION NOT APPLIED"; return; }
  ./tools/test-livegate.sh >/tmp/_lm.out 2>&1; rc=$?; [ $rc = 1 ] && echo "$name: CAUGHT ($(grep -c '❌ [a-z]' /tmp/_lm.out) failing checks)" || echo "$name: SURVIVED rc=$rc"; }
m L1_no_ancestor_check 'if ! git merge-base --is-ancestor "$remote/$branch" HEAD; then' 'if false; then'
m L2_unreachable_goes_on '    return 1
  fi
  return 0' '    return 0
  fi
  return 0'
m L3_offline_flag_ignored '[ "${FM_SHIP_OFFLINE:-}" = "1" ]' 'false'
m L4_no_fetch 'if git fetch -q "$remote" 2>/dev/null; then' 'if true; then'
m L5_ancestor_reversed 'git merge-base --is-ancestor "$remote/$branch" HEAD; then' 'git merge-base --is-ancestor HEAD "$remote/$branch"; then'
m L6_offline_flag_always 'elif [ "${FM_SHIP_OFFLINE:-}" = "1" ]; then' 'elif true; then'
echo MUTDONE
