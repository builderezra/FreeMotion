#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
Q='import%0Asanit%0Acamera%0ACamera%0Anote%0ANote%0Aaudio%20fx%0Abehavio%0ATrim%20Path%0Arepeater%0Ashortcut%0Apixel%0APixel%0Aadjust%0AAdjust%0Afog%0Aremind'
$SP/p17red_run.sh sl 1280 "$Q" 2400 > $SP/p17_sl_main.out 2>&1
$SP/p17_run.sh sl 1280 "$Q" 2400 > $SP/p17_sl_patched.out 2>&1
$SP/p17_run.sh sl380 380 "$Q" 2400 > $SP/p17_sl380_patched.out 2>&1
echo done > $SP/p17_slice.done
