#!/usr/bin/env python3
"""#1097, KEPT, NOT APPLIED (7 Oct): make a one-finger-test page send no compat click after a held or dragged finger, as a phone.

Linux headless Chrome ends EVERY emulated touch in mousedown + mouseup + click (tests/_holdprobe.py), which no phone does after a
long press or a drag. Written for the cloud helper's 4 keyframe-diamond reds (Chromium 141) — but on the laptop (Chrome 154) all
93 finger tests passed at 380 WITHOUT it, so "red without, green with" could not be shown and it was left out (the PM agreed).
Apply it only if a hold test goes red on Linux, or the Mac's tests/_holdprobe.py (branch probe/mac-holdprobe) shows the Mac sends
no click after a 650 ms hold:  python3 tools/design/hunts/1097-phone-cancels-tap.py   (from the repo root; edits tests/_platform.py
and tests/_cdp.py; then prove it: the red tests green with it and red without, and a quick still tap must still click).
"""
import os
W = os.getcwd() + "/"
def sub(path, pairs):
    s = open(W + path, encoding="utf-8").read()
    for o, n in pairs:
        assert s.count(o) == 1, (path, o[:70], s.count(o))
        s = s.replace(o, n)
    open(W + path, "w", encoding="utf-8").write(s)
    print("edited", path)

sub("tests/_platform.py", [(
'''REAL_TOUCH_VIA_EMULATION = (not IS_LINUX or TOUCH_PAGE) and os.environ.get("FM_FAKE_NO_TOUCH_EMULATION") != "1"
''',
'''REAL_TOUCH_VIA_EMULATION = (not IS_LINUX or TOUCH_PAGE) and os.environ.get("FM_FAKE_NO_TOUCH_EMULATION") != "1"

# ⚠️ …AND ON LINUX EVERY TOUCH ENDS IN A CLICK, WHICH NO PHONE DOES (7 Oct, #1097; tests/_holdprobe.py). Measured here with real
# emulation: a finger held 150, 400, 500, 650, 800, 1000, 1200 or 1600 ms ALWAYS ends in mousedown + mouseup + click(touch) at
# the touchend, and contextmenu never fires — headless Linux Chrome never recognises a long press. A phone never clicks after a
# HELD finger (Android Chrome turns a hold past ~500 ms into a long press and cancels the tap; iOS Safari sends no click for a
# long touch) nor after one that MOVED past the touch slop. The click is not harmless: the keyframe diamond's menu opens at the
# hold's pointerup and the compat mousedown moved focus off it 7 ms later (the cloud helper's H17), so the four "690 … keyframe
# diamond" hold tests went red here and green on the Mac. So in a one-finger-test page the driver models the phone: a finger
# that phone_cancels_tap() says was a long press or a drag ends with its compat mousedown / mouseup / click swallowed by a guard
# installed in every frame before the app's own scripts (tests/_cdp.py COMPAT_GUARD). A quick still tap still clicks.
PHONE_LONG_PRESS_S = 0.5    # Android's long-press time; iOS turns a long touch into no click as well
PHONE_TOUCH_SLOP_PX = 10.0  # ~8 dp on Android; a finger that travels further is a drag, not a tap


def phone_cancels_tap(held_s, moved_px):
    """True when a phone would NOT turn this touch into a tap (no compat mouse events, no click): held for a long press, or
    moved past the touch slop. Pure, so tools/test-port.sh checks it without a browser."""
    return held_s >= PHONE_LONG_PRESS_S or moved_px > PHONE_TOUCH_SLOP_PX
''')])

sub("tests/_cdp.py", [
(
'''        cdp.send("Page.navigate", url=url)
''',
'''        if _platform.TOUCH_PAGE:
            # THE PHONE'S "NO CLICK AFTER A HOLD OR A DRAG" (tests/_platform.py phone_cancels_tap), installed in every frame
            # before any of the app's scripts, so its window-capture listeners run FIRST and stop the event for everyone
            cdp.send("Page.addScriptToEvaluateOnNewDocument", source=COMPAT_GUARD)
        cdp.send("Page.navigate", url=url)
'''),
(
'''                            if t.startswith("touch"):
                                if not inp["touch_emu"] and _platform.REAL_TOUCH_VIA_EMULATION:''',
'''                            if t.startswith("touch"):
                                # how long this finger has been down and how far it has gone — a gesture may span requests
                                if t == "touchStart":
                                    inp["t_down"], inp["p_down"], inp["moved"] = time.time(), (x, y), 0.0
                                elif inp.get("p_down") and t in ("touchMove", "touchEnd"):
                                    inp["moved"] = max(inp.get("moved", 0.0), ((x - inp["p_down"][0]) ** 2 + (y - inp["p_down"][1]) ** 2) ** 0.5)
                                if (t == "touchEnd" and _platform.TOUCH_PAGE and inp.get("t_down") is not None
                                        and _platform.phone_cancels_tap(time.time() - inp["t_down"], inp.get("moved", 0.0))):
                                    cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
                                             "if(w){w.__fmSwallowCompat={until:Date.now()+300,mousedown:1,mouseup:1,click:1,n:0};}})()")
                                if not inp["touch_emu"] and _platform.REAL_TOUCH_VIA_EMULATION:'''),
(
'''def _browser():''',
'''# A phone sends no compat mouse events after a held or dragged finger; Linux headless Chrome always does (tests/_platform.py).
# Installed only in a one-finger-test page (FM_TOUCH_PAGE=1). It swallows AT MOST ONE trusted mousedown, mouseup and click —
# the compat triple Chrome sends at the touchEnd — and only while the driver's flag is fresh (set just before a touchEnd that
# phone_cancels_tap() rules out as a tap), so a quick still tap, and a tap on a menu the hold just opened, still click. `n`
# counts what it swallowed, for a reader.
COMPAT_GUARD = ("(function(){['mousedown','mouseup','click'].forEach(function(t){window.addEventListener(t,function(e){"
                "var s=window.__fmSwallowCompat;if(e.isTrusted&&s&&Date.now()<s.until&&s[t]>0){s[t]--;s.n=(s.n||0)+1;"
                "e.stopImmediatePropagation();e.preventDefault();}},true);});})();")


def _browser():'''),
])
