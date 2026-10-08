#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
while ! grep -q GROUPSDONE $SP/h57_groups.log; do sleep 10; done
cd $SP/h57run
for pair in "groupA_r1 8865 9371" "groupAB_r1 8866 9372"; do
  set -- $pair
  echo "=== $1 start $(date +%T)"
  timeout 1500 python3 stack_session2.py http://localhost:$2 $1 $3 1 > $SP/h57_$1.out 2>&1
  echo "=== $1 rc=$? end $(date +%T)"
done
echo ALLDONE2
