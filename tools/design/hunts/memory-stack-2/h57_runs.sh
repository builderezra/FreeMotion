#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/h57run
i=0
for pair in "main_r1 8861 9361" "stack_r1 8862 9362" "main_r2 8861 9363" "stack_r2 8862 9364"; do
  set -- $pair
  echo "=== $1 start $(date +%T)"
  timeout 1500 python3 stack_session2.py http://localhost:$2 $1 $3 1 > $SP/h57_$1.out 2>&1
  echo "=== $1 rc=$? end $(date +%T)"
done
echo ALLDONE
