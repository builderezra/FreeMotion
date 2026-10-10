#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-au6; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m A1_video_encoder_not_closed_in_finally js/exporter.js "        if (encoder && encoder.state !== 'closed') { try { encoder.close(); } catch (e) {} }   // AU6-1
" "" "AU6-1" "AU6-1"
m A2_frame_not_closed_on_throw js/exporter.js "        finally { frame.close(); }   // AU6-1: a throwing encode (a closed or failed codec) must not leave the frame alive" "        catch (e) { throw e; }
        frame.close();" "AU6-1" "AU6-1"
m B1_audio_encoder_not_closed js/exporter.js "    } finally { try { if (enc.state !== 'closed') enc.close(); } catch (e) {} }
    if (encErr) throw encErr;" "    } finally { }
    if (encErr) throw encErr;" "AU6-2" "AU6-2"
m B2_audiodata_not_closed js/exporter.js "      try { enc.encode(ad); } finally { ad.close(); }" "      enc.encode(ad); ad.close();" "AU6-2" "AU6-2"
m B3_priming_not_closed js/exporter.js "    finally { [enc, dec].forEach(function (c) { try { if (c && c.state !== 'closed') c.close(); } catch (e) {} }); }" "" "AU6-2" "AU6-2"
m C1_limiter_block_edge js/exporter.js "        if (b0 + i === b1 - 1) rel = r;" "        if (b0 + i === b1 - 2) rel = r;" "AU6-3" "AU6-3"
m C2_sink_patch_order js/exporter.js "if (end <= length) { patches.push({ pos: position, data: u8 }); patchesSeen++; return; }" "if (end <= length) { patches.unshift({ pos: position, data: u8 }); patchesSeen++; return; }" "AU6-3" "AU6-3"
echo ALLDONE
