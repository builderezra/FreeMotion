#!/bin/sh
# The dev server for FreeMotion — used by the preview AND by the test suite (tools/ship.sh).
# Three jobs, and every one of them exists because it cost real time once.
#
# 1) SURVIVE THE UNACCEPTED-XCODE-LICENCE STATE (queue 881). /usr/bin/python3 is an Xcode shim and
#    refuses to run at all until the licence is accepted, which needs sudo. Pointing DEVELOPER_DIR at
#    the Command Line Tools uses the same binaries with no licence gate.
#
# 2) SEND no-store ON EVERYTHING (queue 865). `python3 -m http.server` sends no cache headers, so the
#    browser caches index.html — and a cached index.html keeps requesting the OLD `?v=` for every
#    script, which is then ALSO served from cache at 0 bytes. Bumping the cache-buster does nothing,
#    because the file that carries the buster is itself stale. It presents as "my fix did nothing":
#    measured, a freshly-edited timeline.js sat on disk and in the server's own response while the page
#    ran `timeline.js?v=245 (from cache, 0 bytes)`. LOOP.md rule 5 tells every session to bump the
#    buster; that rule is necessary and was not sufficient.
#
# 3) 🚨 A BACKLOG BIG ENOUGH FOR THE SUITE — and this one was silently corrupting test results.
#    `socketserver.TCPServer.request_queue_size` is **5**. The suite opens far more connections than
#    that at once (the page alone pulls 71 scripts, and test 497 fetches every source file), so the
#    accept queue overflows and the kernel REFUSES the surplus. MEASURED on the server ship.sh used to
#    start: **7 of 40 parallel requests failed**, while the same requests issued serially all
#    succeeded — and with this file's settings, 0 of 40 failed.
#    What that did to the suite is the point. A refused script load is not a loud error: it is
#    `FM.loadingDot is missing`, or `no #loading-dot to check`, or test 497 announcing that seven
#    element ids "exist nowhere in the markup or the code" while all seven sat on disk. Three separate
#    red tests in one run, every one of them blaming the app for the server dropping its connection.
#    **Every green suite run was therefore luck-dependent, and every red one had to be re-read before
#    it could be believed.** That is the most expensive kind of broken instrument.
[ -x /Library/Developer/CommandLineTools/usr/bin/git ] && export DEVELOPER_DIR=/Library/Developer/CommandLineTools
cd "$(dirname "$0")/.."
exec python3 - "${1:-8791}" <<'PY'
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class Server(ThreadingHTTPServer):
    # THE FIX. 5 is the stdlib default and it is far too small for a page that pulls 71 scripts.
    request_queue_size = 256
    daemon_threads = True
    allow_reuse_address = True

class NoStore(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'      # keep-alive: far fewer connections, so far less queue pressure
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a):
        pass                            # a log line per request is pure cost during a suite run

Server(('127.0.0.1', int(sys.argv[1])), NoStore).serve_forever()
PY
