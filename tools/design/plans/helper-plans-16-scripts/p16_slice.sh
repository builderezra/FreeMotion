#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
TMO=3000 $SP/p16_run.sh m 1280 slicem1280 'wrap%0Aorphan%0Asweep%0AAI%20%0AAssistant%0Amask%0AMask%0Arecent%0Atemplate%0Afont%0Aremove%0Aundo%0AUndo' > $SP/p16_slicem1280.txt 2>&1
TMO=3000 $SP/p16_run.sh p 1280 slicep1280 'wrap%0Aorphan%0Asweep%0AAI%20%0AAssistant%0Amask%0AMask%0Arecent%0Atemplate%0Afont%0Aremove%0Aundo%0AUndo' > $SP/p16_slicep1280.txt 2>&1
echo SLICEDONE
