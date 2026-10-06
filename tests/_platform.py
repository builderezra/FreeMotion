#!/usr/bin/env python3
"""What differs between the Mac's headless Chrome and this machine's — ONE place, so the suite means the same thing on both.

The twin of tools/_platform.sh: the Chrome lookup order and the reap pattern are the same text in both files, and must stay
that way (`python3 tests/_platform.py` prints this side's answers; `. tools/_platform.sh; fm_chrome; fm_chrome_reap_pattern`
prints the other's). STDLIB ONLY: tests/_kbdevice.py promises no third-party packages and imports this.

WHY IT EXISTS (6 Oct, the WSL port). Every tool here was written on the Mac, and the Mac's headless Chrome quietly answers
questions the suite depends on: it reports a MOUSE ((hover: hover) and (pointer: fine) — test 991's PC case throws without
it, the 976 rail tests return early and so pass untested), its scrollbars are 0-width overlays, and --use-gl=swiftshader
works. Linux headless Chrome (154, measured in WSL) answers all three differently. Each answer below says what it fixes.

A LINUX TEST MACHINE NEEDS (Ubuntu 26.04, 6 Oct): google-chrome-stable (dl.google.com .deb), nodejs (the parse gate),
python3-websocket, python3-pil, expect (tools/test-rollback.sh) and fonts-noto-color-emoji — without a colour emoji
font the flag draws as two letters and "690 emoji stay whole" cannot see its bug (green once it was installed).
WHAT NO FLAG FIXES ON LINUX CHROME (measured): no AAC encoder (AudioEncoder mp4a.40.2 unsupported; decode works), so
the four AAC export tests (215 x2, 690 x2) are red; no BarcodeDetector backend (see below); and the byte-exact picture /
sample hashes recorded on the Mac (the 482 "draws the old look byte for byte" tests) do not match another machine's
rasteriser and audio engine. Same 23 reds at 1280 and 380 on the first full WSL passes, all of them these.
"""
import os
import re
import shutil
import sys

IS_LINUX = sys.platform.startswith("linux")
# _FM_MAC_APP is a TEST SEAM only (tools/test-port.sh points it at nothing, to reach the PATH half on a Mac)
MAC_CHROME = os.environ.get("_FM_MAC_APP") or "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# ⚠️ GOOGLE CHROME ONLY, UNLESS FM_CHROME SAYS OTHERWISE (6 Oct, the PM's port review). chromium / chromium-browser were in
# this list, so a machine without google-chrome ran the suite in Chromium without a word — and Chromium builds differ in
# exactly what the app probes (the H.264 encoders, AAC); Ubuntu's is a snap with a private /tmp. Naming one in FM_CHROME
# is a decision; finding one on PATH is not. They are named in the refusal so the choice is one line away.
PATH_NAMES = ("google-chrome", "google-chrome-stable")
CHROMIUM_NAMES = ("chromium", "chromium-browser")
MOUSE_QUERY = "(hover: hover) and (pointer: fine)"


class ChromeNotFound(RuntimeError):
    pass


def chrome_path():
    """The Chrome binary: $FM_CHROME, else the Mac app, else the first of PATH_NAMES on PATH. Raises ChromeNotFound.

    An FM_CHROME that is set but wrong REFUSES rather than falling back: someone set it on purpose, and a run on a
    different browser than the one they named would be a silent substitution."""
    want = os.environ.get("FM_CHROME", "")
    if want:
        if os.path.isfile(want) and os.access(want, os.X_OK):
            return want
        raise ChromeNotFound("FM_CHROME is set to %r, which is not an executable file — fix it or unset it "
                             "(a wrong FM_CHROME is never silently ignored)." % want)
    if os.path.isfile(MAC_CHROME) and os.access(MAC_CHROME, os.X_OK):
        return MAC_CHROME
    for name in PATH_NAMES:
        p = shutil.which(name)
        if p:
            return p
    other = [shutil.which(n) for n in CHROMIUM_NAMES if shutil.which(n)]
    raise ChromeNotFound("no Chrome found — tried $FM_CHROME (unset), %r, and %s on PATH. Install google-chrome "
                         "(Linux: https://www.google.com/chrome/) or set FM_CHROME to its binary.%s"
                         % (MAC_CHROME, ", ".join(PATH_NAMES),
                            (" %s is on PATH but is NOT used unless FM_CHROME names it (a Chromium build may lack what the "
                             "app probes: H.264, AAC)." % other[0]) if other else ""))


def find_chrome():
    """chrome_path(), or None — for module-level defaults that must not crash an import."""
    try:
        return chrome_path()
    except ChromeNotFound:
        return None


def gl_flags():
    """The GL choice for every test Chrome (see the note in tests/_cdp.py launch() for why software GL is the default).

    Linux Chrome 154 no longer honours --use-gl=swiftshader: measured in WSL, the GPU process exits 5-9 times at every
    launch ("Requested GL implementation (gl=none,angle=none) not found") before Chrome gives up on it — hidden, and at
    the mercy of its GPU-crash budget. What it falls back TO is the Mac's picture: canvas, compositing and raster
    "Software only", WebGL on SwiftShader (chrome://gpu). --disable-gpu --enable-unsafe-swiftshader asks for exactly that
    state directly, with 0 GPU-process exits — same feature status, same WebGL renderer.
    ⚠️ NOT --use-angle=swiftshader, the obvious fix: Chrome then counts SwiftShader as a GPU and ACCELERATES canvas and
    raster on it, and the pixels move — measured on the export slice, 482 5.1's hashes and 482 2.1's zoom stopped matching
    the values recorded on the Mac (both pass with this set and with the old flags; both fail with ANGLE).
    The Mac keeps the flags its known-good runs were measured with. FM_GL=angle is the real GPU — under WSL that is
    WSL's paravirtualised adapter, not one of Ezra's devices (untested)."""
    if os.environ.get("FM_GL") == "angle":
        return ["--use-angle=default", "--enable-gpu"]
    if IS_LINUX:
        return ["--disable-gpu", "--enable-unsafe-swiftshader"]
    return ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]


def chrome_extra_flags():
    """Flags that make THIS OS's headless Chrome answer like the Mac's. Empty on the Mac.

    Linux (measured, Chrome 154 in WSL):
      * a MOUSE. Headless Linux has no input devices: hover:none, pointer:none, so every (hover: hover) and
        (pointer: fine) branch in the app and the suite takes the finger's path at 1280px. These blink settings make
        the baseline hover + fine, like the Mac, in every frame and across navigations. (A touch-emulation OFF wipes
        them for the rest of the page — which is why tests/_cdp.py sends Linux's real touch WITHOUT emulation.)
      * 0-width scrollbars. The Mac's are overlays (offsetWidth - clientWidth = 0); Linux's classic bars take 15px from
        every scroller. --enable-features=OverlayScrollbar does nothing here; --hide-scrollbars gives 0.
      * NO 8 GB CAP ON THE PAGE'S MEMORY. Linux's renderer sandbox sets RLIMIT_DATA to 8 GiB (measured in
        /proc/<renderer>/limits: 8589934592; macOS has no such limit). The suite runs in ONE page for its whole length,
        and 16 minutes into the first full pass on WSL (6 Oct, around queue 202's quality-ladder test) the renderer's
        data segment reached 8.76 GB: the kernel logged "VmData 8760119296 exceed data ulimit", the renderer died, and the
        run hung. --no-sandbox removes the cap (measured: "unlimited", as on the Mac). These Chromes only ever load the app
        from 127.0.0.1 — the suite has no network by design — so the sandbox guards nothing they visit. Linux only.
        (How big the page gets is itself worth knowing — it was 8.7 GB of RESERVED data, not resident memory.)
    NOT here, on purpose: BarcodeDetector. The Mac's Chrome has a working one; Linux's has none, so the two QR tests
    (921 S6 Share panel, 921 S8 Scan QR) cannot measure here and stay red. --enable-features=BarcodeDetector was tried
    (6 Oct): it EXPOSES the API with qr_code listed, but detect() rejects "Barcode Detection not implemented" — no Linux
    backend — and the app, seeing the API, then skips its jsQR fallback: a third behaviour, neither the Mac's nor a real
    Linux user's. Absent is the honest state."""
    if IS_LINUX:
        return ["--hide-scrollbars",
                "--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2",
                "--no-sandbox"]
    return []


def chrome_env(profile):
    """The environment for a test Chrome: on Linux its temp files go INSIDE the profile, which every caller deletes.

    /tmp is tmpfs (RAM) under WSL, and each launch left 3-4 /tmp/com.google.Chrome.* entries behind even after a clean
    exit (measured 4/3/4/4); with TMPDIR=profile it left none. None = inherit, as the Mac always has."""
    if IS_LINUX:
        return dict(os.environ, TMPDIR=profile)
    return None


def reap_pattern():
    """The `pgrep -f` pattern for a test Chrome on an fm-cdp- profile — anchored to the CHROME BINARY, never the bare prefix.

    A bare 'fm-cdp-' also matches any shell whose command line carries that string (a commit message, a wrapper script),
    and the reaper SIGKILLs what it matches (tools/ship.sh says why that matters). The Mac's processes all live under
    'Google Chrome…'. Linux's all carry argv[0] /opt/google/chrome/chrome, even when started through the google-chrome
    wrapper (measured: 14 of 14 matched, and 0 decoy shells — one with '/opt/google/chrome/chrome --user-data-dir=/tmp/fm-cdp-'
    in its arguments). Same text as fm_chrome_reap_pattern in tools/_platform.sh. None = no pattern for this OS.
    ⚠️ …and the Chrome FM_CHROME names (6 Oct, the PM's port review): the list was fixed, while FM_CHROME may name any
    binary (chrome-headless-shell, Chromium.app) whose orphans then matched nothing — never reaped, silently."""
    extra = ""
    if os.environ.get("FM_CHROME"):
        extra = re.sub(r'([][\\.*^$+?(){}|/])', r'\\\1', os.path.basename(os.environ["FM_CHROME"]))
    if sys.platform == "darwin":
        return "(Google Chrome|%s).*fm-cdp-" % extra if extra and extra != "Google Chrome" else "Google Chrome.*fm-cdp-"
    if sys.platform.startswith("linux"):
        names = ["chrome", "chromium", "chromium-browser"] + ([extra] if extra and extra not in ("chrome", "chromium", "chromium-browser") else [])
        return "^([^ ]*/)?(%s)( |$).*fm-cdp-" % "|".join(names)
    return None


def driver_pattern():
    """The `pgrep -f` pattern for a RUNNING test driver — a PYTHON process whose arguments name _cdp.py (6 Oct, the review).

    `pgrep -f _cdp.py` also matched a shell running or waiting on one, and a ship.sh whose message names it, so the
    reaper stood down silently on the runs most likely to leave orphans. Same text as fm_driver_pattern in
    tools/_platform.sh."""
    return "^[^ ]*[Pp]ython[0-9.]* .*_cdp\\.py( |$)"


# REAL TOUCH (tests/_cdp.py, queue 924): the Mac switches DevTools touch emulation on for a run of touch steps and off
# after, and OFF hands the page back its mouse. On Linux there is no mouse to hand back: ANY setTouchEmulationEnabled
# (enabled=False) — even one with no ON before it — leaves the page pointer:none / hover:none until a cross-document
# navigation, which run.html never does (measured; nothing else restores it: setEmulatedMedia ignores hover/pointer,
# and the protocol has no pointer override). So after the first finger test, every later mouse-gated test would run
# without a mouse. Input.dispatchTouchEvent WITHOUT emulation still delivers trusted touchstart/touchend and
# pointerType 'touch' pointer events and click (measured), and the mouse survives. The one residual difference: during
# a gesture Linux shows maxTouchPoints 0, no ontouchstart and pointer fine, where the Mac shows 5 and coarse.
# ⚠️ THAT "ONE RESIDUAL DIFFERENCE" WAS NOT SMALL (6 Oct, the PM's port review, MAJOR). It is the phone's media state, and
# the app reads it well beyond the collab files: styles.css's @media (hover: none) / (pointer: coarse) blocks (the 44px .vr-*
# targets, the 48px .pb-grip, and others), js/app.js (the frame-cache budget), js/elements-browser.js and js/home.js
# (autofocus only with a keyboard), js/settings.js (pointer: fine). Touch sent without emulation runs a finger against the
# MOUSE layout: a phone regression green here and red on his phone. So it is no longer sent: where touch cannot be
# emulated, the driver refuses every touch step and the test reports NOT RUN HERE (tests.js realInput924), by name.
# FM_FAKE_NO_TOUCH_EMULATION=1 makes the Mac answer the same way — only to prove that path; a NOT RUN refuses a Mac ship.
REAL_TOUCH_VIA_EMULATION = not IS_LINUX and os.environ.get("FM_FAKE_NO_TOUCH_EMULATION") != "1"
REAL_TOUCH_WHY = ("FM_FAKE_NO_TOUCH_EMULATION=1 (a proof run)" if os.environ.get("FM_FAKE_NO_TOUCH_EMULATION") == "1"
                  else "Linux headless Chrome: turning touch emulation off leaves the page with no mouse" if IS_LINUX else "")


if __name__ == "__main__":
    print("chrome:", find_chrome() or "(none)")
    print("reap pattern:", reap_pattern())
    print("gl flags:", " ".join(gl_flags()))
    print("extra flags:", " ".join(chrome_extra_flags()) or "(none)")
    print("real touch via emulation:", REAL_TOUCH_VIA_EMULATION)
