#!/usr/bin/env python3
"""Dev-only. Drives index.html TOP-LEVEL as a real iPhone and raises a real iOS keyboard.

    python3 tests/_kbdevice.py              # the reproducing iPhone-13-class case
    python3 tests/_kbdevice.py --sweep      # the whole (visual height x offsetTop) grid, 12 combos
    python3 tests/_kbdevice.py --desktop    # 1280x900 mouse layout, keyboard down and up
    python3 tests/_kbdevice.py --mutations  # list the source mutations
    python3 tests/_kbdevice.py --mutate padtop-css --sweep     # prove the assertions can go red
    python3 tests/_kbdevice.py --inset-top 0 --font 40 --keep-shot /tmp/x.png

WHY THIS EXISTS (v5.89). tests/_kbprobe.html asked the same question and measured nothing, because it
loaded index.html in an IFRAME at 1280x900 — where the max-width:700px phone rules never apply — and
because it hard-coded visualViewport.offsetTop to 0, the one value at which the bug cannot appear.
(tests.js's 'the selection box follows the canvas when the keyboard opens' fakes offsetTop: 0 too,
which is why a 116-green suite never saw this.) This harness fixes all three: top-level, 390x844 at
dpr 3 with an iPhone UA and touch, REAL Chrome safe-area-inset emulation
(Emulation.setSafeAreaInsetsOverride), and a visualViewport that behaves the way iOS's does — the
LAYOUT viewport (window.innerHeight) stays 844 while the VISUAL viewport shrinks to sit above the
keyboard AND gains a non-zero offsetTop.

WHAT IT CAUGHT (v5.89, all three symptoms of IMG_2466 at once). js/text-edit.js onViewport() re-pinned
.te-bar (top = vv.offsetTop) and .te-dock (bottom = innerHeight - vv.height - vv.offsetTop) to the
visual viewport, and both landed correctly. #stage is not a fixed element — it is a normal-flow box in
the LAYOUT viewport — and only its padding-BOTTOM was recomputed. Its padding-TOP stayed the CSS
constant (styles.css, `body.text-editing #stage { padding: 56px 0 104px }`). Nothing added
vv.offsetTop to it, so the canvas was centred in a box whose top edge sat offsetTop px above the top
of what you can actually see, and the picture — with the text you are typing in the middle of it —
was carried up by exactly offsetTop / 2:

    offsetTop     0   120   260   380
    canvas mid  243   183   113    53      = 243 - offsetTop/2, zero error

At 380 that put 180pt text at screen y 33-69, entirely behind a 96pt toolbar, with the empty bottom
half of the canvas filling the screen as the near-black void. The fix is js/screen.js (FM.screen):
one helper that states where the visible window sits inside the layout viewport, and padTop/padBottom
that put a normal-flow box's content edges against it. Both #stage paddings now come from it.

No third-party packages: the CDP transport below is ~60 lines of stdlib socket code.
"""
import argparse, base64, json, os, random, shutil, socket, struct, subprocess, sys, tempfile, threading, time
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
W, H, DPR = 390, 844, 3
IPHONE_UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 "
             "(KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1")

# ---------------------------------------------------------------- mutations
# Each entry rewrites ONE expression in the shipped source as it is served, so a mutation exercises
# the real line rather than a stub. The substitution must match EXACTLY ONCE or the run aborts —
# a mutation that silently fails to apply turns "the assertions went red" into a lie.
MUTATIONS = {
    "padtop-css": ("js/text-edit.js",
                   "const topPad = Math.min(FM.screen.padTop(r, barH, m), Math.max(0, r.height - MIN_PREVIEW));",
                   "const topPad = parseFloat(getComputedStyle(stage).paddingTop) || 0;",
                   "#stage's padding-top goes back to the v5.89 CSS constant — the shipped bug"),
    "padbottom-gap": ("js/text-edit.js",
                      "stage.style.paddingBottom = Math.min(FM.screen.padBottom(r, dockH + 12, m), room) + 'px';",
                      "stage.style.paddingBottom = Math.min(Math.max(0, m.layoutH - m.visualH - m.offsetTop) + dockH + 12, room) + 'px';",
                      "padding-bottom goes back to innerHeight - vv.height - vv.offsetTop + dock, which\n"
                      "                     assumes #stage reaches the bottom of the layout viewport"),
    "screen-no-offset": ("js/screen.js",
                         "const offsetTop = Math.max(0, Math.min(fin(vv && vv.offsetTop, 0), layoutH - visualH));",
                         "const offsetTop = 0;",
                         "FM.screen stops believing in offsetTop — the whole bug class, at the source"),
    "bar-top-zero": ("js/text-edit.js",
                     "if (bar) bar.style.top = m.fixedTop + 'px';",
                     "if (bar) bar.style.top = '0px';",
                     "the toolbar is pinned to the top of the LAYOUT viewport instead"),
    "dock-bottom-zero": ("js/text-edit.js",
                         "if (dock) dock.style.bottom = m.fixedBottom + 'px';",
                         "if (dock) dock.style.bottom = '0px';",
                         "the docked field is left at the bottom of the LAYOUT viewport, under the\n"
                         "                     keyboard. INERT at the default combo, where the gap is already 0 —\n"
                         "                     run it with --offset-top 0"),
    "padtop-feedback": ("js/text-edit.js",
                        "const topPad = Math.min(FM.screen.padTop(r, barH, m), Math.max(0, r.height - MIN_PREVIEW));",
                        "const topPad = Math.min(FM.screen.padTop(document.getElementById('preview'), barH, m), Math.max(0, r.height - MIN_PREVIEW));",
                        "the padding is measured from the CANVAS it moves instead of from #stage's\n"
                        "                     own border box, so every pass chases the last one"),
    "teardown-keep": ("js/text-edit.js",
                      "if (stage) { stage.style.paddingTop = ''; stage.style.paddingBottom = ''; }",
                      "if (stage) { stage.style.paddingBottom = ''; }",
                      "leaving the editor forgets to drop the inline padding-top"),
    "stage-content-box": ("styles.css",
                          "body.text-editing #stage { padding: 56px 0 104px; box-sizing: border-box; }",
                          "body.text-editing #stage { padding: 56px 0 104px; box-sizing: content-box; }",
                          "NEGATIVE CONTROL — expected to change NOTHING. #stage's height comes from\n"
                          "                     the grid track, so box-sizing is not what stops the padding feeding\n"
                          "                     back (the code comment used to say it was). 0 red here is the\n"
                          "                     correct result, and it is the evidence the matrix is not random"),
}


# ---------------------------------------------------------------- websocket (stdlib only)
class WS(object):
    """The 5% of RFC6455 a CDP client needs: text frames, client-masked, no extensions."""

    def __init__(self, url):
        rest = url.split("://", 1)[1]
        hostport, path = rest.split("/", 1)
        host, port = hostport.split(":")
        self.s = socket.create_connection((host, int(port)), timeout=60)
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall(("GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                        "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n"
                        % (path, hostport, key)).encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.s.recv(4096)
        if b" 101 " not in buf.split(b"\r\n")[0]:
            raise RuntimeError("websocket handshake failed: " + buf[:200].decode("latin1"))
        self.buf = buf.split(b"\r\n\r\n", 1)[1]

    def _read(self, n):
        while len(self.buf) < n:
            chunk = self.s.recv(65536)
            if not chunk:
                raise RuntimeError("socket closed")
            self.buf += chunk
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def send(self, text):
        data = text.encode()
        n = len(data)
        hdr = b"\x81"
        if n < 126:
            hdr += struct.pack("!B", n | 0x80)
        elif n < 65536:
            hdr += struct.pack("!BH", 126 | 0x80, n)
        else:
            hdr += struct.pack("!BQ", 127 | 0x80, n)
        mask = os.urandom(4)
        self.s.sendall(hdr + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def recv(self):
        while True:
            b0, b1 = struct.unpack("!BB", self._read(2))
            n = b1 & 0x7F
            if n == 126:
                n = struct.unpack("!H", self._read(2))[0]
            elif n == 127:
                n = struct.unpack("!Q", self._read(8))[0]
            if b1 & 0x80:
                self._read(4)
            payload = self._read(n)
            op = b0 & 0x0F
            if op == 0x8:
                raise RuntimeError("websocket closed by peer")
            if op in (0x1, 0x2):
                return payload.decode("utf-8", "replace")

    def close(self):
        try:
            self.s.close()
        except Exception:
            pass


class CDP(object):
    def __init__(self, url):
        self.ws = WS(url)
        self.i = 0

    def send(self, method, params=None, sid=None):
        self.i += 1
        msg = {"id": self.i, "method": method, "params": params or {}}
        if sid:
            msg["sessionId"] = sid
        self.ws.send(json.dumps(msg))
        while True:
            r = json.loads(self.ws.recv())
            if r.get("id") == self.i:
                if "error" in r:
                    raise RuntimeError(method + " -> " + json.dumps(r["error"]))
                return r.get("result", {})

    def ev(self, expr, sid):
        r = self.send("Runtime.evaluate", {"expression": expr, "returnByValue": True,
                                           "awaitPromise": True, "userGesture": True}, sid)
        if "exceptionDetails" in r:
            raise RuntimeError("JS: " + json.dumps(r["exceptionDetails"])[:600])
        return r.get("result", {}).get("value")


# ---------------------------------------------------------------- server / browser
def serve(root, mutate=None):
    """Own port, own thread, own marker — so a squatted port can never be mistaken for ours.

    `mutate` is (relpath, old, new): that one file is rewritten on the way out. The substitution is
    verified here, before a single measurement is taken."""
    marker = "FMKB-" + "".join(random.choice("0123456789abcdef") for _ in range(12))
    patched = {}
    if mutate:
        rel, old, new = mutate[0], mutate[1], mutate[2]
        src = open(os.path.join(root, rel), "r", encoding="utf-8").read()
        if src.count(old) != 1:
            raise SystemExit("mutation target appears %d times in %s (need exactly 1) — the mutation "
                             "would not have applied:\n  %s" % (src.count(old), rel, old[:90]))
        patched["/" + rel] = src.replace(old, new).encode("utf-8")

    class H(SimpleHTTPRequestHandler):
        def translate_path(self, path):
            p = SimpleHTTPRequestHandler.translate_path(self, path)
            return os.path.join(root, os.path.relpath(p, os.getcwd()))

        def do_GET(self):
            if self.path == "/__marker":
                return self._body(marker.encode(), "text/plain")
            bare = self.path.split("?")[0]
            if bare in patched:
                return self._body(patched[bare], "text/css" if bare.endswith(".css") else "text/javascript")
            return SimpleHTTPRequestHandler.do_GET(self)

        def _body(self, body, ctype):
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *a):
            pass

    srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    port = srv.server_address[1]
    got = urllib.request.urlopen("http://127.0.0.1:%d/__marker" % port, timeout=5).read().decode()
    assert got == marker, "port %d is not ours (got %r)" % (port, got)
    return srv, "http://127.0.0.1:%d" % port, marker


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


SHIM = r"""
/* iOS's visual viewport. The LAYOUT viewport (window.innerHeight) does NOT change when the keyboard
 * opens — only the visual viewport shrinks, and it also slides DOWN inside the layout viewport
 * (offsetTop > 0) when the document cannot scroll, which is exactly our case: body.text-editing
 * sets overflow:hidden, so iOS has no scroll to spend and reveals the focused field this way. */
(function () {
  var st = {width: innerWidth, height: innerHeight, offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, scale: 1};
  var et = new EventTarget(), onresize = null, onscroll = null;
  var vv = {
    get width(){return st.width;}, get height(){return st.height;},
    get offsetTop(){return st.offsetTop;}, get offsetLeft(){return st.offsetLeft;},
    get pageTop(){return st.pageTop;}, get pageLeft(){return st.pageLeft;}, get scale(){return st.scale;},
    addEventListener: function(){ return et.addEventListener.apply(et, arguments); },
    removeEventListener: function(){ return et.removeEventListener.apply(et, arguments); },
    dispatchEvent: function(){ return et.dispatchEvent.apply(et, arguments); },
    get onresize(){return onresize;}, set onresize(f){onresize=f;},
    get onscroll(){return onscroll;}, set onscroll(f){onscroll=f;}
  };
  Object.defineProperty(window, 'visualViewport', {configurable:true, get:function(){return vv;}});
  window.__vvSet = function (h, ot) {
    st.width = innerWidth; st.height = h; st.offsetTop = ot; st.pageTop = ot + (window.scrollY || 0);
    var re = new Event('resize'), sc = new Event('scroll');
    et.dispatchEvent(re); if (onresize) onresize(re);
    et.dispatchEvent(sc); if (onscroll) onscroll(sc);
  };
})();
"""

MEASURE = r"""(function () {
  function R(sel) {
    var e = document.querySelector(sel); if (!e) return null;
    var r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return {top:+r.top.toFixed(1), bottom:+r.bottom.toFixed(1), h:+r.height.toFixed(1),
            padT:parseFloat(cs.paddingTop)||0, padB:parseFloat(cs.paddingBottom)||0, bg:cs.backgroundColor};
  }
  var o = {innerHeight: innerHeight, scrollY: scrollY,
           vv: {h: visualViewport.height, offsetTop: visualViewport.offsetTop}, rects: {}};
  ['.te-bar','.te-dock','#te-input','#stage','#preview'].forEach(function(s){ o.rects[s] = R(s); });
  /* where the text actually is: the bounding box of lit pixels on the preview canvas, in layout px */
  var cv = document.getElementById('preview'); o.ink = null;
  if (cv && cv.width) {
    var d = cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,cv.width,cv.height).data;
    var x0=1e9,y0=1e9,x1=-1,y1=-1,n=0;
    for (var py=0; py<cv.height; py+=2) for (var px=0; px<cv.width; px+=2) {
      var i=(py*cv.width+px)*4;
      if (d[i]+d[i+1]+d[i+2] > 150 && d[i+3] > 40) { n++;
        if(px<x0)x0=px; if(px>x1)x1=px; if(py<y0)y0=py; if(py>y1)y1=py; }
    }
    var cr = cv.getBoundingClientRect();
    if (n) o.ink = {n:n, top:+(cr.top + y0/cv.height*cr.height).toFixed(1),
                          bottom:+(cr.top + y1/cv.height*cr.height).toFixed(1)};
  }
  /* what is painted at a given LAYOUT y down the middle of the screen */
  o.stack = [];
  for (var y = 2; y < innerHeight; y += 4) {
    var t = document.elementsFromPoint(innerWidth/2, y)[0];
    o.stack.push([y, t ? (t.tagName.toLowerCase() + (t.id ? '#'+t.id : '') +
      (typeof t.className==='string' && t.className.trim() ? '.'+t.className.trim().split(/\s+/)[0] : '')) : '-']);
  }
  return o;
})()"""


def band(stack, y0, y1):
    """The distinct elements painted between two LAYOUT y values, in order."""
    out = []
    for y, el in stack:
        if y0 <= y <= y1 and (not out or out[-1][1] != el):
            out.append((y, el))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inset-top", type=int, default=47)     # iPhone 12-14 standalone; 15/16 Pro = 59
    ap.add_argument("--inset-bottom", type=int, default=34)
    ap.add_argument("--font", type=int, default=180)
    ap.add_argument("--vv-height", type=int, default=464)    # 844 - keyboard(336) - suggestion strip(44)
    ap.add_argument("--offset-top", type=int, default=380)   # 844 - 464: what iOS must use, see below
    ap.add_argument("--sweep", action="store_true")
    ap.add_argument("--desktop", action="store_true")
    ap.add_argument("--mutate", default="")
    ap.add_argument("--mutations", action="store_true")
    ap.add_argument("--keep-shot", default="")
    a = ap.parse_args()

    if a.mutations:
        print("\nSource mutations (--mutate NAME). Each rewrites one expression in the file that is\n"
              "actually served, and aborts if the target is not found exactly once.\n")
        for k in sorted(MUTATIONS):
            f, _o, _n, why = MUTATIONS[k]
            print("  %-18s %-16s %s" % (k, f, why))
        print()
        return 0

    mut = None
    if a.mutate:
        if a.mutate not in MUTATIONS:
            print("unknown mutation %r — try --mutations" % a.mutate); return 2
        mut = MUTATIONS[a.mutate]

    w, h, dpr = (1280, 900, 2) if a.desktop else (W, H, DPR)
    inset_top, inset_bottom = (0, 0) if a.desktop else (a.inset_top, a.inset_bottom)

    srv, base, marker = serve(ROOT, mut)
    profile = tempfile.mkdtemp(prefix="fm-kbdevice-")
    dbg = free_port()
    proc = subprocess.Popen(
        [CHROME, "--headless=new", "--remote-debugging-port=%d" % dbg, "--user-data-dir=" + profile,
         "--remote-allow-origins=*", "--no-first-run", "--no-default-browser-check",
         "--window-size=%d,%d" % (w, h), "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ws = None
    for _ in range(160):
        try:
            ws = json.loads(urllib.request.urlopen("http://127.0.0.1:%d/json/version" % dbg,
                                                   timeout=1).read().decode())["webSocketDebuggerUrl"]
            break
        except Exception:
            time.sleep(0.25)
    if not ws:
        print("chrome did not start"); return 2

    fails, total, green_under_mutation = [0], [0], []
    try:
        c = CDP(ws)
        t = c.send("Target.createTarget", {"url": "about:blank"})
        sid = c.send("Target.attachToTarget", {"targetId": t["targetId"], "flatten": True})["sessionId"]
        c.send("Page.enable", {}, sid)
        c.send("Runtime.enable", {}, sid)
        c.send("Emulation.setDeviceMetricsOverride",
               {"width": w, "height": h, "deviceScaleFactor": dpr, "mobile": not a.desktop}, sid)
        c.send("Emulation.setTouchEmulationEnabled",
               {"enabled": not a.desktop, "maxTouchPoints": 5}, sid)
        if not a.desktop:
            c.send("Emulation.setUserAgentOverride", {"userAgent": IPHONE_UA, "platform": "iPhone"}, sid)
        c.send("Emulation.setSafeAreaInsetsOverride",
               {"insets": {"top": inset_top, "bottom": inset_bottom, "left": 0, "right": 0}}, sid)
        c.send("Page.addScriptToEvaluateOnNewDocument", {"source": SHIM}, sid)
        # The marker again, immediately before the only navigation that matters: a port that was
        # free at bind time can still have been taken over by the time we ask for the page.
        got = urllib.request.urlopen(base + "/__marker", timeout=5).read().decode()
        assert got == marker, "the server on this port is not ours any more"
        c.send("Page.navigate", {"url": base + "/index.html"}, sid)

        for _ in range(220):
            try:
                if c.ev("!!(window.FM && FM.scene && FM.textEdit && FM.makeLayer && FM.screen)", sid):
                    break
            except RuntimeError:
                pass
            time.sleep(0.1)
        if not c.ev("!!(window.FM && FM.screen)", sid):
            print("FM.screen never loaded — js/screen.js is missing from index.html"); return 2
        c.ev("(()=>{const s=document.getElementById('splash'); if(s) s.remove();})()", sid)
        for _ in range(80):
            if c.ev("document.querySelectorAll('.hm-card').length", sid):
                break
            time.sleep(0.1)
        c.ev("(()=>{const k=document.querySelector('.hm-card'); if(k) k.click();})()", sid)
        time.sleep(2.0)
        lid = c.ev("""(()=>{const P=FM.scene.project;
          const L=FM.makeLayer('text',{name:'kb',text:'Hello',x:P.width/2,y:P.height/2,
            fontSize:%d,start:0,duration:Math.max(3,P.duration||5)});
          FM.scene.layers.length=0; FM.scene.layers.push(L);
          FM.scene.selectedId=L.id; FM.scene.selectedIds=[L.id];
          if (FM.refreshAll) FM.refreshAll(); return L.id;})()""" % a.font, sid)
        time.sleep(0.4)
        c.ev("FM.textEdit.start(%s)" % json.dumps(lid), sid)
        time.sleep(0.8)

        def look(vvh, ot):
            c.ev("__vvSet(%d,%d)" % (vvh, ot), sid)
            time.sleep(0.35)
            return c.ev(MEASURE, sid)

        def check(name, ok, detail):
            total[0] += 1
            if not ok:
                fails[0] += 1
            elif mut:
                green_under_mutation.append(name)
            print("  %-4s %-56s %s" % ("PASS" if ok else "FAIL", name, detail))

        if a.desktop:
            combos = [(h, 0), (h - 336, 0)]
        elif a.sweep:
            combos = [(v, o) for v in (508, 464, 407) for o in (0, 120, 260, 844 - v)]
        else:
            combos = [(a.vv_height, a.offset_top)]

        print("\n%s %dx%d dpr%d · safe-area top=%d bottom=%d · text %dpt%s"
              % ("desktop" if a.desktop else "iPhone", w, h, dpr, inset_top, inset_bottom, a.font,
                 ("\nMUTATION %s — %s" % (a.mutate, MUTATIONS[a.mutate][3])) if mut else ""))

        if not a.desktop:
            # The offsetTop is not a guess. The docked field is pinned to the bottom of the LAYOUT
            # viewport, so at the moment the keyboard appears it is behind the keyboard, and iOS must
            # offset the visual viewport by at least (field bottom - visual height) to reveal it.
            m0 = look(h, 0)
            fb = m0["rects"]["#te-input"]["bottom"]
            print("  the focused field sits at layout y %.0f-%.0f, so for a %dpt visual viewport iOS must\n"
                  "  use offsetTop between %.0f and %d (it is capped at innerHeight - visual height)."
                  % (m0["rects"]["#te-input"]["top"], fb, a.vv_height, fb - a.vv_height, h - a.vv_height))

        for vvh, ot in combos:
            m = look(vvh, ot)
            m2 = look(vvh, ot)           # same numbers again: the handler must be idempotent
            bar, dock, stg, cv = (m["rects"][k] for k in ('.te-bar', '.te-dock', '#stage', '#preview'))
            ink = m["ink"]
            S = lambda v: v - ot                       # layout y -> what row of the SCREEN it is on
            print("\n--- visual viewport %dpt, offsetTop %d (%d hidden below) ---"
                  % (vvh, ot, max(0, h - vvh - ot)))
            print("    on screen:  toolbar %.0f-%.0f | canvas %.0f-%.0f | dock %.0f-%.0f | keyboard %d-%d"
                  % (S(bar["top"]), S(bar["bottom"]), S(cv["top"]), S(cv["bottom"]),
                     S(dock["top"]), S(dock["bottom"]), vvh, h))
            print("    #stage  layout %.0f-%.0f   padding top %.0f  bottom %.0f"
                  % (stg["top"], stg["bottom"], stg["padT"], stg["padB"]))
            if ink:
                print("    the text you are typing is at screen y %.0f-%.0f" % (S(ink["top"]), S(ink["bottom"])))
            for y, el in band(m["stack"], ot, min(h, ot + vvh)):
                print("      screen y %4.0f  %s" % (y - ot, el))

            check("toolbar is pinned to the top of what you can see",
                  abs(S(bar["top"])) < 1, "screen y %.0f, want 0" % S(bar["top"]))
            check("docked field sits on the keyboard",
                  abs(S(dock["bottom"]) - vvh) < 1, "screen y %.0f, want %d" % (S(dock["bottom"]), vvh))
            # The user-visible one, straight off IMG_2466: some part of the text you are editing has
            # to be on the screen — inside the visual viewport in ABSOLUTE terms, not merely below a
            # toolbar that may itself have been shoved off screen (that is how the first cut of this
            # assertion passed under the screen-no-offset mutation, with the text at screen y -173).
            vis = bool(ink and S(ink["bottom"]) > max(0, S(bar["bottom"]))
                       and S(ink["top"]) < min(vvh, S(dock["top"])))
            check("the text being edited is visible while you type", vis,
                  ("screen y %.0f-%.0f, toolbar ends at %.0f, screen is 0-%d"
                   % (S(ink["top"]), S(ink["bottom"]), S(bar["bottom"]), vvh)) if ink else "no text rendered at all")
            # …and the picture it belongs to is not half off the screen. This is the void: 40% of the
            # canvas hung above the visible top, so its empty lower half filled the phone.
            inside = (S(cv["top"]) >= max(0, S(bar["bottom"])) - 1) and (S(cv["bottom"]) <= min(vvh, S(dock["top"])) + 1)
            check("the whole preview is inside the visible window",
                  inside, "canvas screen %.0f-%.0f, visible band %.0f-%.0f of 0-%d"
                  % (S(cv["top"]), S(cv["bottom"]), S(bar["bottom"]), S(dock["top"]), vvh))
            # Centred in that band, which is what the stage padding is FOR — and offsetTop/2 is
            # exactly what lands here when the padding is wrong. The band is the visible gap between
            # the toolbar and the dock INTERSECTED with #stage's own box: on a desktop window with no
            # keyboard the stage's grid row ends well above the dock, and padding cannot (and should
            # not) stretch the canvas down into the empty #app below it. Tolerance 10 covers the
            # deliberate 12px of breathing room the editor leaves above the dock.
            top_edge, bot_edge = max(bar["bottom"], stg["top"]), min(dock["top"], stg["bottom"])
            cmid, bmid = (cv["top"] + cv["bottom"]) / 2, (top_edge + bot_edge) / 2
            check("the preview is centred in the band the editor leaves it",
                  abs(cmid - bmid) <= 10, "canvas mid %.0f vs band mid %.0f (off by %.0f)"
                  % (S(cmid), S(bmid), cmid - bmid))
            # Nothing may move when the same viewport is reported twice — a padding that feeds back
            # into the height it is measured from drifts a little further on every keystroke.
            d = max(abs(m2["rects"]["#preview"]["top"] - cv["top"]),
                    abs(m2["rects"]["#preview"]["bottom"] - cv["bottom"]),
                    abs(m2["rects"]["#stage"]["padT"] - stg["padT"]),
                    abs(m2["rects"]["#stage"]["padB"] - stg["padB"]))
            check("re-running the handler moves nothing", d < 0.6, "largest drift %.1fpx on the second pass" % d)

        if a.keep_shot:
            # CLIPPED to the visual viewport. A full-page grab is the LAYOUT viewport — 844 rows of
            # which the phone only ever shows `vvh` — and comparing one of those against a photo of
            # the phone is how a layout that is 380px out of place can look fine in a screenshot.
            vvh, ot = combos[-1]
            png = c.send("Page.captureScreenshot",
                         {"format": "png", "captureBeyondViewport": True,
                          "clip": {"x": 0, "y": ot, "width": w, "height": vvh, "scale": 1}}, sid)["data"]
            open(a.keep_shot, "wb").write(base64.b64decode(png))
            print("\n  wrote %s — rows %d-%d of the layout viewport, i.e. exactly what the phone shows"
                  % (a.keep_shot, ot, ot + vvh))

        # Leaving the editor must hand #stage back exactly as it found it. Both paddings are inline
        # styles now, and a forgotten padding-top strands the canvas hundreds of px down the stage
        # for the rest of the session — with no keyboard on screen to explain why.
        left = c.ev("(()=>{FM.textEdit.stop(); const s=document.getElementById('stage');"
                    "return s.style.paddingTop + '|' + s.style.paddingBottom;})()", sid)
        check("leaving the editor clears both stage paddings", left == "|",
              "inline padding after Done: top %r bottom %r" % tuple(left.split("|")))

        print("\n%d assertions ran, %d failed" % (total[0], fails[0]))
        if mut:
            print("MUTATION %s: %d of %d assertions went red." % (a.mutate, fails[0], total[0]))
            if fails[0] == 0:
                print("  NOTHING went red — this mutation is not covered.")
        elif fails[0]:
            print("\nThe canvas centre is carried up by exactly offsetTop/2 when #stage's padding-top\n"
                  "is a CSS constant while its padding-bottom tracks the keyboard. See js/screen.js\n"
                  "(FM.screen.padTop/padBottom) and js/text-edit.js onViewport().")
        return 1 if fails[0] else 0
    finally:
        try:
            proc.terminate()
        except Exception:
            pass
        srv.shutdown()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
