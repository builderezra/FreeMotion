#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-p22; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m A1_card_ignores_missing js/app.js "if (out.hasAudio && out.audioMissing > 0) return" "if (false) return" "P22 #1086" "P22 #1086"
m A2_run_never_reports_missing js/exporter.js "audioMissing: mix ? (FM._lastAudioDrops || []).length : 0," "audioMissing: 0," "P22 #1086" "P22 #1086"
m B1_release_never_runs js/exporter.js "    } finally { releaseDecodedAudio(scene); }" "    } finally { }" "P22 #1087" "P22 #1087"
m B2_release_drops_reversed_too js/exporter.js "if (m.audioBuffer && !layer.reversed) m.audioBuffer = undefined;" "if (m.audioBuffer) m.audioBuffer = undefined;" "P22 #1087" "P22 #1087"
m B3_release_drops_foreign_buffers js/exporter.js "if (!m || !m._exportDecoded) continue;" "if (!m) continue;" "P22 #1087" "P22 #1087"
m B4_no_ceiling js/exporter.js "if (cap && m.file.size > cap && touchDevice())" "if (false)" "P22 #1087" "P22 #1087"
m B5_ceiling_on_desktop_too js/exporter.js "if (cap && m.file.size > cap && touchDevice())" "if (cap && m.file.size > cap)" "P22 #1087" "P22 #1087"
m C1_old_download_path js/app.js "if (FM._showExportReady && document.getElementById('export-ready') && FM.exporter && FM.exporter.deliver) {" "if (false) {" "P22 #1088" "P22 #1088"
m C2_saved_said_on_cancel js/app.js "if (how && how !== 'cancelled' && FM.toast) FM.toast('Audio saved" "if (FM.toast) FM.toast('Audio saved" "P22 #1088" "P22 #1088"
m C3_wrong_mime js/app.js "mime = ext === 'm4a' ? 'audio/mp4' : 'audio/wav';" "mime = 'video/mp4';" "P22 #1088" "P22 #1088"
m D1_thumb_first_stage_kept js/storage.js "        src.width = src.height = 0;   // P22 #1089: a finished stage is let go at once (see below)
" "" "P22 #1089" "P22 #1089"
m D2_thumb_final_kept js/storage.js "      src.width = src.height = 0; c.width = c.height = 0;
      return url;" "      return url;" "P22 #1089" "P22 #1089"
echo ALLDONE
