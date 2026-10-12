#!/usr/bin/env python3
"""recv.py <port> <out_dir> — a tiny local receiver for the render probes (127.0.0.1 only).

Why it exists: tools/shot.py prints a probe's return value cut to 4000 characters (`json.dumps({'js': val})[:4000]`), so a probe
cannot hand back twelve 720 px JPEGs or sixteen WAVs through it. The probes POST their one JSON object here instead
(`fetch('http://127.0.0.1:<port>/filters.json', {method: 'POST', body})`) and return only a short summary to shot.py.

POST /<name>  -> writes <out_dir>/<name>. A body that is a data URL (data:...;base64,...) is decoded; anything else is written as
                 sent. Names are a single path segment of [A-Za-z0-9._-] — nothing can be written outside out_dir.
GET  /ping    -> "ok" (the runner waits on it).
Sends CORS headers so the app's page (http://localhost:<serve port>) may post to it.
"""
import base64, os, re, sys
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT, OUT = int(sys.argv[1]), sys.argv[2]
os.makedirs(OUT, exist_ok=True)
NAME = re.compile(r'^[A-Za-z0-9._-]{1,80}$')
MAX = 200 * 1024 * 1024


class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')

    def _reply(self, code, text):
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(text.encode())

    def do_OPTIONS(self):
        self._reply(204, '')

    def do_GET(self):
        self._reply(200 if self.path == '/ping' else 404, 'ok' if self.path == '/ping' else 'no')

    def do_POST(self):
        name = self.path.lstrip('/').split('?')[0]
        n = int(self.headers.get('Content-Length') or 0)
        if not NAME.match(name) or name in ('.', '..') or n <= 0 or n > MAX:
            return self._reply(400, 'refused')
        body = self.rfile.read(n)
        if body[:5] == b'data:' and b',' in body[:200]:
            body = base64.b64decode(body.split(b',', 1)[1])
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(body)
        sys.stderr.write('recv: %s %d bytes\n' % (name, len(body)))
        self._reply(200, 'saved %d' % len(body))

    def log_message(self, *a):
        pass


HTTPServer(('127.0.0.1', PORT), H).serve_forever()
