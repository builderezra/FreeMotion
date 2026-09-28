#!/usr/bin/env python3
"""tools/shot.py, unchanged, but with Chrome told to draw CLASSIC (always-visible) scrollbars.

Why: headless Chrome on this Mac follows the system's "Show scroll bars: Automatically" setting, and with
no mouse attached that means OVERLAY bars — they take 0px (offsetHeight - clientHeight = 0) and are only
painted mid-scroll, so a plain shot shows no bar at all. His PC draws classic bars, and so does a Mac with a
mouse plugged in (or with Settings → Appearance → Show scroll bars: Always).

How: `-AppleShowScrollBars Always` on Chrome's command line. Cocoa reads `-Key Value` argument pairs into
NSArgumentDomain, which outranks the global preference FOR THIS PROCESS ONLY — no system setting is touched.
(Chrome also reads the stray `Always` as a start URL, so it replaces about:blank — headless allows one.)

    python3 shot_classic.py --width 1280 --height 900 --js-file probe-open.js --out now.png
    FM_CLASSIC_BARS=0 …   # overlay bars (this Mac's default with no mouse), for comparison
    FM_DSF=2 …            # 2x pixels at a desktop width
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tests'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import _cdp  # noqa: E402
import shot  # noqa: E402

_Popen = subprocess.Popen


def _popen(args, *a, **k):
    if args and args[0] == _cdp.CHROME and os.environ.get('FM_CLASSIC_BARS', '1') == '1':
        # headless refuses two start URLs ("Multiple targets are not supported"), so `Always` REPLACES
        # about:blank as the one start page; shot.py navigates that tab to the app straight away.
        args = [args[0], '-AppleShowScrollBars', 'Always'] + [x for x in args[1:] if x != 'about:blank']
    return _Popen(args, *a, **k)


_cdp.subprocess.Popen = _popen

# FM_DSF=2 renders a desktop width at 2x (shot.py uses 1x for >= 768), so a crop of one row is crisp.
_send = _cdp.CDP.send


def _send2(self, method, **params):
    if method == 'Emulation.setDeviceMetricsOverride' and os.environ.get('FM_DSF'):
        params['deviceScaleFactor'] = float(os.environ['FM_DSF'])
    return _send(self, method, **params)


_cdp.CDP.send = _send2

if __name__ == '__main__':
    shot.main()
